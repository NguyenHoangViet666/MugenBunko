import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { startFixture } from "../server/dist/tests/fixture.js";

const mobile = process.argv.includes("--mobile");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (work, message, timeout = 45000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const result = await work();
    if (result) return result;
    await sleep(120);
  }
  throw Error(message);
};
const fixture = await startFixture(
  mobile ? { webRoot: path.resolve("mobile/dist") } : {},
);
const profile = await fs.mkdtemp(
  path.join(os.tmpdir(), "mugenbunko-election-browser-"),
);
const channels = new Map(),
  contexts = new Map(),
  pending = new Map(),
  exceptions = [];
let browser,
  socket,
  nextId = 0;
const send = (method, params = {}, sid) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(Error("CDP timeout: " + method));
    }, 15000);
    pending.set(id, { resolve, reject, timer });
    (channels.get(sid) || socket).send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (sid, expression) => {
  const result = await send(
    "Runtime.evaluate",
    { expression, awaitPromise: true, returnByValue: true },
    sid,
  );
  if (result.exceptionDetails)
    throw Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text,
    );
  return result.result.value;
};
const text = (sid, value) =>
  until(
    () =>
      evaluate(
        sid,
        `(document.body?.innerText||'').includes(${JSON.stringify(value)})`,
      ),
    "Missing text: " + value,
  );
const click = (sid, value) =>
  until(
    () =>
      evaluate(
        sid,
        `(()=>{const matches=e=>e.getClientRects().length&&e.textContent.trim()===${JSON.stringify(value)};const b=[...document.querySelectorAll('.elections button')].find(matches)||[...document.querySelectorAll('button,[role=button]')].find(matches);if(!b||b.disabled||b.getAttribute('aria-disabled')==='true')return false;b.click();return true;})()`,
      ),
    "Missing enabled button: " + value,
  );
const fill = (sid, label, value) =>
  evaluate(
    sid,
    `(()=>{const label=[...document.querySelectorAll('label')].find(e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim()===${JSON.stringify(label)});const e=label?.querySelector('input,textarea,select')||document.querySelector('[aria-label='+CSS.escape(${JSON.stringify(label)})+']');if(!e)throw Error('Missing field: '+${JSON.stringify(label)});Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));return true;})()`,
  );
async function shot(sid, name) {
  const folder = path.resolve("artifacts/elections");
  await fs.mkdir(folder, { recursive: true });
  const r = await send("Page.captureScreenshot", { format: "png" }, sid);
  await fs.writeFile(
    path.join(folder, name + ".png"),
    Buffer.from(r.data, "base64"),
  );
}
async function closePage(sid) {
  await send("Target.disposeBrowserContext", {
    browserContextId: contexts.get(sid),
  });
  channels.get(sid)?.close();
  channels.delete(sid);
  contexts.delete(sid);
}
async function newPage(userId, route) {
  const { browserContextId } = await send("Target.createBrowserContext");
  const { targetId } = await send("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  });
  const info = await until(async () => {
    const targets = await (
      await fetch(`http://127.0.0.1:${port}/json/list`)
    ).json();
    return targets.find((t) => t.id === targetId && t.webSocketDebuggerUrl);
  }, "Page target");
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  ws.addEventListener("message", onMessage);
  channels.set(targetId, ws);
  contexts.set(targetId, browserContextId);
  await send("Page.enable", {}, targetId);
  await send("Runtime.enable", {}, targetId);
  await send("Network.enable", {}, targetId);
  await send(
    "Emulation.setDeviceMetricsOverride",
    { width: mobile ? 390 : 1440, height: 1000, deviceScaleFactor: 1, mobile },
    targetId,
  );
  const user =
    userId === 1
      ? {
          ...fixture.user,
          id: 1,
          username: "MugenBunko",
          roles: ["reader", "admin"],
        }
      : userId === 12
        ? {
            ...fixture.user,
            id: 12,
            username: "election_mod",
            displayname: "Hội đồng mod",
            roles: ["reader", "moderator"],
          }
        : {
            ...fixture.user,
            id: userId,
            username: userId === 10 ? "election_candidate" : "election_voter",
            displayname:
              userId === 10 ? "Ứng viên cộng đồng" : "Cử tri cộng đồng",
            roles: ["reader"],
          };
  await send(
    "Page.addScriptToEvaluateOnNewDocument",
    {
      source: `if(window.top===window){sessionStorage.setItem('mugen_mobile_bypass','true');window.confirm=()=>true;localStorage.setItem('mugen_session',${JSON.stringify(JSON.stringify(user))});localStorage.setItem(${JSON.stringify(mobile ? "mugen_mobile_token" : "mugen_token")},${JSON.stringify(fixture.token(userId))});}`,
    },
    targetId,
  );
  await send(
    "Page.navigate",
    { url: fixture.url + (mobile ? route : "/?context=" + targetId + route) },
    targetId,
  );
  return targetId;
}
const onMessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === "Runtime.exceptionThrown")
    exceptions.push(
      data.params.exceptionDetails.exception?.description ||
        data.params.exceptionDetails.text,
    );
  const task = pending.get(data.id);
  if (!task) return;
  clearTimeout(task.timer);
  pending.delete(data.id);
  if (data.error) task.reject(Error(data.error.message));
  else task.resolve(data.result);
};
let port;
try {
  for (const [id, username, name, role] of [
    [10, "election_candidate", "Ứng viên cộng đồng", "reader"],
    [11, "election_voter", "Cử tri cộng đồng", "reader"],
    [12, "election_mod", "Hội đồng mod", "moderator"],
  ]) {
    await fixture.db.query(
      "INSERT INTO users (id,username,password,displayname,email,date_joined) VALUES (?,?,'test-only',?,?,CURRENT_TIMESTAMP-INTERVAL 60 DAY)",
      [id, username, name, username + "@example.test"],
    );
    await fixture.db.query(
      "INSERT INTO user_roles (user_id,role) VALUES (?,?)",
      [id, role],
    );
  }
  if (mobile) {
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "node_modules/expo/bin/cli",
          "export",
          "--platform",
          "web",
          "--max-workers",
          "1",
          "--clear",
        ],
        {
          cwd: path.resolve("mobile"),
          env: { ...process.env, EXPO_PUBLIC_API_URL: fixture.url },
          stdio: "inherit",
          windowsHide: true,
        },
      );
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(Error("Expo export: " + code)),
      );
    });
    const bundleDir = path.resolve("mobile/dist/_expo/static/js/web");
    const files = await fs.readdir(bundleDir);
    assert.ok(
      (
        await Promise.all(
          files
            .filter((f) => f.endsWith(".js"))
            .map((f) => fs.readFile(path.join(bundleDir, f), "utf8")),
        )
      ).some((source) => source.includes(fixture.url)),
      "Mobile bundle must embed the current fixture URL",
    );
  }
  browser = spawn(
    process.env.UPGRADE_BROWSER_PATH ||
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-sandbox",
      "--disable-extensions",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
    ],
    { windowsHide: true, stdio: "ignore" },
  );
  let spawnError;
  browser.on("error", (e) => {
    spawnError = e;
  });
  port = await until(async () => {
    if (spawnError) throw spawnError;
    try {
      return (
        await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")
      ).split("\n")[0];
    } catch {
      return null;
    }
  }, "Browser startup");
  const version = await (
    await fetch(`http://127.0.0.1:${port}/json/version`)
  ).json();
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", onMessage);
  if (mobile) {
    // Seed one frozen-policy election; all member actions below use the mobile UI.
    const headers = {
      Authorization: "Bearer " + fixture.token(1),
      "Content-Type": "application/json",
    };
    const r = await fetch(fixture.url + "/api/elections", {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Bầu chọn mobile mùa xuân",
        description:
          "Cộng đồng bỏ phiếu; hội đồng đánh giá; admin quyết định bổ nhiệm.",
        nominationClosesAt: Date.now() + 600000,
        votingClosesAt: Date.now() + 1200000,
        rules: {
          seats: 1,
          maxChoices: 1,
          voterAgeDays: 0,
          candidateAgeDays: 0,
          minReviewers: 1,
          minCommunityVotes: 1,
        },
      }),
    });
    assert.equal(r.status, 201);
    const { id } = await r.json();
    await fetch(`${fixture.url}/api/elections/${id}/transition`, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "open" }),
    });
    const candidate = await newPage(10, "/elections");
    await text(candidate, "Tự ứng cử");
    await click(candidate, "Tự ứng cử");
    for (const [label, value] of [
      [
        "Lý do ứng cử (30–3000 ký tự)",
        "Tôi muốn giúp thư viện có môi trường thảo luận công bằng và thân thiện.",
      ],
      [
        "Kinh nghiệm cộng đồng (10–2000 ký tự)",
        "Có kinh nghiệm điều phối cộng đồng và hỗ trợ độc giả.",
      ],
      ["Thời gian có thể tham gia", "Mỗi tối hai giờ"],
      [
        "Trả lời tình huống (30–4000 ký tự)",
        "Tôi đối chiếu bằng chứng của hai bên, lưu hồ sơ và xử lý theo quy định.",
      ],
    ])
      await fill(candidate, label, value);
    await click(candidate, "Đồng ý và nộp hồ sơ");
    await text(candidate, "Chờ kiểm tra hồ sơ");
    const [c] = await fixture.db.query(
      "SELECT id FROM election_candidates WHERE election_id=?",
      [id],
    );
    await closePage(candidate);
    const admin = await newPage(1, "/elections");
    await text(admin, "Xác nhận đủ điều kiện");
    await click(admin, "Xác nhận đủ điều kiện");
    await fill(
      admin,
      "Lý do / nhận xét",
      "Đã xem hồ sơ và xác minh điều kiện tham gia.",
    );
    await click(admin, "Xác nhận lưu");
    await text(admin, "Đủ điều kiện");
    await fixture.db.query(
      "UPDATE elections SET nomination_closes_at=? WHERE id=?",
      [Date.now() - 1, id],
    );
    await send("Page.reload", {}, admin);
    await text(admin, "Mở hai vòng bỏ phiếu");
    await click(admin, "Mở hai vòng bỏ phiếu");
    await text(admin, "Phiếu cộng đồng");
    const voter = await newPage(11, "/elections");
    await text(voter, "Phiếu cộng đồng");
    await click(voter, "Ứng viên cộng đồng (@election_candidate)");
    await click(voter, "Lưu phiếu tín nhiệm");
    await until(
      async () =>
        !!(
          await fixture.db.query(
            "SELECT candidate_id FROM election_ballots WHERE election_id=?",
            [id],
          )
        ).length,
      "Mobile ballot persisted",
    );
    await closePage(voter);
    const mod = await newPage(12, "/elections");
    await text(mod, "Đánh giá hội đồng");
    await click(mod, "Đánh giá hội đồng");
    await fill(
      mod,
      "Nhận xét hội đồng (10–3000 ký tự)",
      "Ứng viên đáp ứng tiêu chí và có cách xử lý công bằng.",
    );
    await click(mod, "Đạt");
    await click(mod, "Xác nhận lưu");
    await until(
      async () =>
        !!(
          await fixture.db.query(
            "SELECT candidate_id FROM election_reviews WHERE election_id=?",
            [id],
          )
        ).length,
      "Mobile review persisted",
    );
    await closePage(mod);
    await fixture.db.query(
      "UPDATE elections SET voting_closes_at=? WHERE id=?",
      [Date.now() - 1, id],
    );
    await send("Page.reload", {}, admin);
    await text(admin, "Chốt và đối soát");
    await click(admin, "Chốt và đối soát");
    await text(admin, "Kết quả đã chốt");
    await click(admin, "Bổ nhiệm");
    await fill(
      admin,
      "Lý do / nhận xét",
      "Admin đã kiểm tra kết quả và xác nhận bổ nhiệm ứng viên.",
    );
    await click(admin, "Xác nhận lưu");
    await text(admin, "Đã bổ nhiệm");
    await click(admin, "Công bố kết quả");
    await text(admin, "Đã công bố");
    assert.equal(
      (
        await fixture.db.query(
          "SELECT decision FROM election_candidates WHERE id=?",
          [c.id],
        )
      )[0].decision,
      "appointed",
    );
    await shot(admin, "mobile-admin-results");
    console.log(
      "PASS: mobile application, admin verification, community ballot, mod review, appointment and publication",
    );
  } else {
    const admin = await newPage(1, "#/admin-dashboard");
    await text(admin, "Bầu chọn mod");
    await click(admin, "Bầu chọn mod");
    await text(admin, "Tạo kỳ bầu chọn");
    await click(admin, "Tạo kỳ bầu chọn");
    await fill(admin, "Tên kỳ", "Bầu chọn mod mùa xuân");
    await fill(admin, "Số ghế", "1");
    await fill(admin, "Số lựa chọn tối đa", "1");
    await fill(admin, "Tuổi tài khoản cử tri (ngày)", "0");
    await fill(admin, "Tuổi tài khoản ứng viên (ngày)", "0");
    await fill(admin, "Phiếu cộng đồng tối thiểu", "1");
    await fill(admin, "Số mod đánh giá tối thiểu", "1");
    await click(admin, "Lưu bản nháp");
    await text(admin, "Mở ứng cử");
    await click(admin, "Mở ứng cử");
    const e = await until(async () => {
      const rows = await fixture.db.query(
        "SELECT id,status FROM elections ORDER BY id DESC",
      );
      return rows[0]?.status === "nominations" ? rows[0] : null;
    }, "Election opened");
    const candidate = await newPage(10, "#/elections/" + e.id);
    await text(candidate, "Tự ứng cử");
    await click(candidate, "Tự ứng cử");
    for (const [label, value] of [
      [
        "Lý do ứng cử",
        "Tôi muốn giúp thư viện có môi trường thảo luận công bằng và thân thiện.",
      ],
      [
        "Kinh nghiệm cộng đồng",
        "Có kinh nghiệm điều phối cộng đồng và hỗ trợ độc giả.",
      ],
      ["Thời gian có thể tham gia", "Mỗi tối hai giờ"],
      [
        "Trả lời tình huống",
        "Tôi đối chiếu bằng chứng của hai bên, lưu hồ sơ và xử lý theo quy định.",
      ],
    ])
      await fill(candidate, label, value);
    await evaluate(
      candidate,
      "document.querySelector('.election-form .election-check input').click();true",
    );
    await click(candidate, "Nộp hồ sơ ứng cử");
    await text(candidate, "Chờ kiểm tra hồ sơ");
    await closePage(candidate);
    await click(admin, "Làm mới");
    await text(admin, "Nhận xét kiểm tra @election_candidate");
    await fill(
      admin,
      "Nhận xét kiểm tra @election_candidate",
      "Đã đối chiếu hồ sơ và xác nhận đủ điều kiện tham gia.",
    );
    await click(admin, "Xác nhận đủ điều kiện");
    await until(
      async () =>
        !!(
          await fixture.db.query(
            "SELECT id FROM election_candidates WHERE election_id=? AND status='eligible'",
            [e.id],
          )
        ).length,
      "Verified",
    );
    await fixture.db.query(
      "UPDATE elections SET nomination_closes_at=? WHERE id=?",
      [Date.now() - 1, e.id],
    );
    await click(admin, "Làm mới");
    await click(admin, "Mở hai vòng bỏ phiếu");
    let voter = await newPage(11, "#/elections/" + e.id);
    await text(voter, "Phiếu tín nhiệm cộng đồng");
    await evaluate(
      voter,
      "document.querySelector('.elections fieldset input').click();true",
    );
    await click(voter, "Lưu phiếu tín nhiệm");
    await text(voter, "Đã lưu: 1 lựa chọn");
    await closePage(voter);
    const mod = await newPage(12, "#/mod-dashboard");
    await text(mod, "Hội đồng bầu chọn");
    await click(mod, "Hội đồng bầu chọn");
    await text(mod, "Đánh giá với tư cách hội đồng mod");
    await evaluate(
      mod,
      "[...document.querySelectorAll('summary')].find(e=>e.textContent==='Đánh giá với tư cách hội đồng mod').click();true",
    );
    await fill(mod, "Kết luận của hội đồng", "pass");
    await fill(
      mod,
      "Nhận xét đánh giá",
      "Ứng viên hiểu quy định và có phương án xử lý dựa vào bằng chứng.",
    );
    await click(mod, "Lưu đánh giá hội đồng");
    await until(
      async () =>
        !!(
          await fixture.db.query(
            "SELECT candidate_id FROM election_reviews WHERE election_id=?",
            [e.id],
          )
        ).length,
      "Mod review",
    );
    await closePage(mod);
    await fixture.db.query(
      "UPDATE elections SET voting_closes_at=? WHERE id=?",
      [Date.now() - 1, e.id],
    );
    await click(admin, "Làm mới");
    await click(admin, "Chốt và đối soát kết quả");
    await text(admin, "Kết quả đã chốt");
    await fill(
      admin,
      "Lý do công khai cho @election_candidate",
      "Admin đã xác minh hồ sơ và đồng ý bổ nhiệm theo kết quả bầu chọn.",
    );
    await click(admin, "Bổ nhiệm @election_candidate");
    await text(admin, "Đã bổ nhiệm");
    await click(admin, "Công bố kết quả");
    await text(admin, "Đã công bố");
    await shot(admin, "admin-results");
    await closePage(admin);
    voter = await newPage(11, "#/elections/" + e.id);
    await text(voter, "Kết quả đã chốt");
    await shot(voter, "community-results");
    for (const theme of ["washi", "sepia", "charcoal"])
      for (const width of [1440, 768, 390, 320]) {
        await evaluate(voter, `document.body.className='theme-${theme}';true`);
        await send(
          "Emulation.setDeviceMetricsOverride",
          { width, height: 1000, deviceScaleFactor: 1, mobile: width < 800 },
          voter,
        );
        await sleep(120);
        const overflow = await evaluate(
          voter,
          `document.documentElement.scrollWidth>${width}+2`,
        );
        assert.equal(
          overflow,
          false,
          `Elections ${theme} ${width}px overflows`,
        );
        if (width === 390) await shot(voter, `community-${theme}-390`);
      }
    await send(
      "Network.setBlockedURLs",
      {
        urls: [
          fixture.url + "/api/elections/*",
          fixture.url + "/api/elections",
        ],
      },
      voter,
    );
    await click(voter, "Làm mới");
    await text(voter, "Thử lại");
    await send("Network.setBlockedURLs", { urls: [] }, voter);
    await click(voter, "Thử lại");
    await text(voter, "Kết quả đã chốt");
    console.log(
      "PASS: admin creation, application, verification, two ballots, appointment, public results, three themes, 320–1440px, error/retry and direct links",
    );
  }
  assert.deepEqual(exceptions, [], "Browser runtime exceptions");
} catch (error) {
  for (const sid of channels.keys())
    console.error(
      "PAGE:",
      await evaluate(sid, "document.body.innerText.slice(0,5000)").catch(
        () => "",
      ),
    );
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN)
    await send("Browser.close").catch(() => {});
  socket?.close();
  for (const channel of channels.values()) channel.close();
  for (const task of pending.values()) {
    clearTimeout(task.timer);
    task.reject(Error("Browser closed"));
  }
  if (browser && browser.exitCode === null) {
    browser.kill();
    await sleep(300);
  }
  const resolved = path.resolve(profile);
  if (
    path.dirname(resolved) === path.resolve(os.tmpdir()) &&
    path.basename(resolved).startsWith("mugenbunko-election-browser-")
  )
    await fs
      .rm(resolved, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      })
      .catch(() => {});
  await fixture.close();
}

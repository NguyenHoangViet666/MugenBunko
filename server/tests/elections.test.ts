import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { startFixture } from "./fixture.js";
import { expireElectionTerms } from "../routes/elections.js";

describe("Moderator elections: policy, ballots, decisions and tenure", () => {
  let f: Awaited<ReturnType<typeof startFixture>>;
  const req = async (
    path: string,
    method = "GET",
    body?: unknown,
    user: number | null = 1,
  ) => {
    const response = await fetch(f.url + "/api/elections" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(user ? { Authorization: "Bearer " + f.token(user) } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  };
  const application = {
    motivation: "Tôi muốn giúp cộng đồng đọc truyện có môi trường công bằng.",
    experience: "Có kinh nghiệm tham gia và hỗ trợ cộng đồng.",
    availability: "Buổi tối, mỗi ngày hai giờ.",
    scenarioAnswer:
      "Tôi lưu bằng chứng, nghe giải trình của hai bên và đối chiếu nội dung trước khi kết luận.",
  };
  const cfg = () => ({
    title: "Tuyển kiểm duyệt viên mùa xuân",
    description:
      "Cộng đồng bầu chọn; hội đồng mod đánh giá; admin quyết định cuối cùng.",
    nominationClosesAt: Date.now() + 60000,
    votingClosesAt: Date.now() + 120000,
    rules: {
      seats: 1,
      maxChoices: 1,
      voterAgeDays: 0,
      candidateAgeDays: 0,
      requireVerifiedEmail: true,
      minCommunityVotes: 1,
      minReviewers: 1,
      reviewApprovalPercent: 60,
      probationDays: 1,
      termDays: 30,
    },
  });
  const create = async () => {
    const r = await req("/", "POST", cfg());
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data.id as number;
  };
  const open = async (e: number) => {
    assert.equal(
      (await req(`/${e}/transition`, "POST", { action: "open" })).status,
      200,
    );
  };
  const apply = async (e: number, user = 10) => {
    const r = await req(`/${e}/candidates`, "POST", application, user);
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data.id as number;
  };
  const verify = async (e: number, c: number) => {
    assert.equal(
      (
        await req(`/${e}/candidates/${c}/verify`, "POST", {
          eligible: true,
          reason: "Đã kiểm tra tài khoản và hồ sơ đầy đủ.",
        })
      ).status,
      200,
    );
  };
  const startVotes = async (e: number) => {
    await f.db.query("UPDATE elections SET nomination_closes_at=? WHERE id=?", [
      Date.now() - 100,
      e,
    ]);
    assert.equal(
      (await req(`/${e}/transition`, "POST", { action: "vote" })).status,
      200,
    );
  };
  const close = async (e: number) => {
    await f.db.query("UPDATE elections SET voting_closes_at=? WHERE id=?", [
      Date.now() - 1,
      e,
    ]);
    assert.equal(
      (await req(`/${e}/transition`, "POST", { action: "close" })).status,
      200,
    );
  };
  const ready = async () => {
    const e = await create();
    await open(e);
    const c = await apply(e);
    await verify(e, c);
    await startVotes(e);
    return { e, c };
  };
  const review = {
    verdict: "pass",
    criteria: { rules: true, fairness: true, evidence: true },
    comment: "Ứng viên hiểu quy định, đánh giá bằng chứng và xử lý công bằng.",
  };
  before(async () => {
    f = await startFixture();
    for (const [uid, name] of [
      [10, "election_candidate"],
      [11, "election_voter"],
      [12, "election_moderator"],
      [13, "election_other"],
      [14, "election_noemail"],
    ] as const) {
      await f.db.query(
        "INSERT INTO users (id,username,password,displayname,email,date_joined) VALUES (?,?,'test-only',?,?,CURRENT_TIMESTAMP - INTERVAL 60 DAY)",
        [uid, name, name, uid === 14 ? null : name + "@example.test"],
      );
      await f.db.query("INSERT INTO user_roles (user_id,role) VALUES (?,?)", [
        uid,
        uid === 12 ? "moderator" : "reader",
      ]);
    }
  });
  after(async () => {
    if (f) await f.close();
  });

  it("restricts staff mutations, hides drafts, validates policy and locks published rules", async () => {
    assert.equal((await req("/", "POST", cfg(), 11)).status, 403);
    assert.equal((await req("/", "POST", cfg(), null)).status, 401);
    assert.equal(
      (await req("/", "POST", { ...cfg(), rules: { seats: 0 } })).status,
      400,
    );
    const e = await create();
    assert.equal((await req(`/${e}`, "GET", undefined, null)).status, 404);
    await open(e);
    assert.equal((await req(`/${e}`, "PUT", cfg())).status, 409);
    assert.equal(
      (await req(`/${e}/transition`, "POST", { action: "publish" })).status,
      409,
    );
  });
  it("requires nomination consent, protects ownership and rechecks modified profiles", async () => {
    const e = await create();
    await open(e);
    const invite = await req(
      `/${e}/candidates`,
      "POST",
      { nomineeUsername: "election_candidate" },
      11,
    );
    assert.equal(invite.status, 201);
    assert.equal(
      (await req(`/${e}`, "GET", undefined, null)).data.candidates.length,
      0,
    );
    assert.equal(
      (
        await req(`/${e}/candidates/${invite.data.id}/verify`, "POST", {
          eligible: true,
          reason: "Đã kiểm tra hồ sơ đầy đủ.",
        })
      ).status,
      409,
    );
    assert.equal(
      (await req(`/${e}/candidates/${invite.data.id}`, "PUT", application, 11))
        .status,
      403,
    );
    assert.equal(
      (await req(`/${e}/candidates/${invite.data.id}`, "PUT", application, 10))
        .status,
      200,
    );
    await verify(e, invite.data.id);
    assert.equal(
      (await req(`/${e}/candidates/${invite.data.id}`, "PUT", application, 10))
        .status,
      200,
    );
    assert.equal((await req(`/${e}`)).data.candidates[0].status, "submitted");
    assert.equal(
      (await req(`/${e}/candidates`, "POST", application, 14)).status,
      400,
    );
  });
  it("prevents early voting, unreviewed applicants and applicants after the deadline", async () => {
    const e = await create();
    await open(e);
    await apply(e);
    assert.equal(
      (await req(`/${e}/transition`, "POST", { action: "vote" })).status,
      409,
    );
    await f.db.query("UPDATE elections SET nomination_closes_at=? WHERE id=?", [
      Date.now() - 1,
      e,
    ]);
    assert.equal(
      (await req(`/${e}/transition`, "POST", { action: "vote" })).status,
      409,
    );
    assert.equal(
      (await req(`/${e}/candidates`, "POST", application, 13)).status,
      409,
    );
  });
  it("stores one atomic replaceable ballot and rejects duplicates, self votes and forged identities", async () => {
    const { e, c } = await ready();
    assert.equal(
      (await req(`/${e}/ballot`, "PUT", { candidateIds: [c, c] }, 11)).status,
      400,
    );
    assert.equal(
      (await req(`/${e}/ballot`, "PUT", { candidateIds: [c] }, 10)).status,
      400,
    );
    assert.equal(
      (await req(`/${e}/ballot`, "PUT", { candidateIds: [c], voterId: 13 }, 14))
        .status,
      403,
    );
    const writes = await Promise.all(
      Array.from({ length: 4 }, () =>
        req(`/${e}/ballot`, "PUT", { candidateIds: [c], voterId: 13 }, 11),
      ),
    );
    assert.ok(writes.every((r) => r.status === 200));
    const actual = await f.db.query<any[]>(
      "SELECT * FROM election_ballots WHERE election_id=?",
      [e],
    );
    assert.equal(actual.length, 1);
    assert.equal(actual[0].voter_id, 11);
    assert.equal(
      (await req(`/${e}/ballot`, "PUT", { candidateIds: [] }, 11)).status,
      200,
    );
    assert.equal(
      (await req(`/${e}`, "GET", undefined, 11)).data.myBallot.length,
      0,
    );
  });
  it("freezes the electorate and panel; later promotions cannot enter the moderator ballot", async () => {
    const { e, c } = await ready();
    await f.db.query(
      "INSERT INTO user_roles (user_id,role) VALUES (13,'moderator')",
    );
    assert.equal(
      (await req(`/${e}/candidates/${c}/review`, "PUT", review, 13)).status,
      403,
    );
    assert.equal(
      (await req(`/${e}/candidates/${c}/review`, "PUT", review, 1)).status,
      403,
    );
    assert.equal(
      (await req(`/${e}/candidates/${c}/review`, "PUT", review, 12)).status,
      200,
    );
    await f.db.query(
      "DELETE FROM user_roles WHERE user_id=13 AND role='moderator'",
    );
  });
  it("hides interim results, internal notes, other moderator ballots and voter identities", async () => {
    const { e, c } = await ready();
    await req(`/${e}/ballot`, "PUT", { candidateIds: [c] }, 11);
    await req(`/${e}/candidates/${c}/review`, "PUT", review, 12);
    const publicView = await req(`/${e}`, "GET", undefined, null);
    assert.equal(publicView.data.snapshot, null);
    assert.equal(publicView.data.candidates[0].result, null);
    assert.deepEqual(publicView.data.audit, []);
    assert.deepEqual(publicView.data.reviewDetail, []);
    const modView = await req(`/${e}`, "GET", undefined, 12);
    assert.equal(modView.data.myReviews.length, 1);
    assert.deepEqual(modView.data.reviewDetail, []);
    await close(e);
    assert.equal(
      (await req(`/${e}`, "GET", undefined, null)).data.snapshot,
      null,
    );
    const adminView = await req(`/${e}`);
    assert.equal(adminView.data.snapshot.candidates[0].votes, 1);
    assert.equal(adminView.data.reviewDetail.length, 1);
  });
  it("invalidates ballots from suspended voters and withdrawn candidates when closing", async () => {
    const { e, c } = await ready();
    await req(`/${e}/ballot`, "PUT", { candidateIds: [c] }, 11);
    await req(`/${e}/candidates/${c}/review`, "PUT", review, 12);
    await f.db.query("UPDATE users SET status='suspended' WHERE id=11");
    await close(e);
    const r = (await req(`/${e}`)).data.snapshot.candidates[0];
    assert.equal(r.votes, 0);
    assert.equal(r.invalidVotes, 1);
    await f.db.query("UPDATE users SET status='active' WHERE id=11");
    assert.equal(
      (await req(`/${e}`)).data.snapshot.candidates[0].votes,
      0,
      "closed snapshot must not change after reactivation",
    );
    const other = await ready();
    await req(`/${other.e}/ballot`, "PUT", { candidateIds: [other.c] }, 11);
    assert.equal(
      (
        await req(
          `/${other.e}/candidates/${other.c}`,
          "PUT",
          { action: "withdraw" },
          10,
        )
      ).status,
      200,
    );
    await close(other.e);
    assert.equal((await req(`/${other.e}`)).data.snapshot.candidates.length, 0);
  });
  it("abstention does not meet quorum; closing and voting use server deadlines", async () => {
    const { e, c } = await ready();
    await req(
      `/${e}/candidates/${c}/review`,
      "PUT",
      { ...review, verdict: "abstain" },
      12,
    );
    assert.equal(
      (await req(`/${e}/transition`, "POST", { action: "close" })).status,
      409,
    );
    await close(e);
    assert.equal(
      (await req(`/${e}/ballot`, "PUT", { candidateIds: [c] }, 11)).status,
      409,
    );
    const r = (await req(`/${e}`)).data.snapshot.candidates[0];
    assert.equal(r.modAbstain, 1);
    assert.equal(r.quorumMet, false);
    assert.equal(r.recommended, false);
  });
  it("requires explanation for appointment below thresholds and blocks unresolved complaints", async () => {
    const { e, c } = await ready();
    await close(e);
    const decision = {
      action: "appoint",
      reason: "Admin đã xem hồ sơ và đánh giá đầy đủ bằng chứng.",
    };
    assert.equal(
      (await req(`/${e}/candidates/${c}/decision`, "POST", decision)).status,
      400,
    );
    assert.equal(
      (
        await req(
          `/${e}/complaints`,
          "POST",
          {
            message:
              "Tôi đề nghị kiểm tra lại điều kiện và tính hợp lệ của hồ sơ.",
          },
          11,
        )
      ).status,
      201,
    );
    assert.equal(
      (
        await req(`/${e}/candidates/${c}/decision`, "POST", {
          ...decision,
          overrideReason:
            "Kỳ khởi tạo có ít thành viên, đã phỏng vấn và xác minh trực tiếp.",
        })
      ).status,
      409,
    );
    const complaint = (await req(`/${e}`)).data.complaints[0];
    assert.equal(
      (
        await req(`/${e}/complaints/${complaint.id}/resolve`, "POST", {
          resolution: "Đã đối chiếu hồ sơ và kiểm tra lại điều kiện tham gia.",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await req(`/${e}/candidates/${c}/decision`, "POST", {
          ...decision,
          overrideReason:
            "Kỳ khởi tạo có ít thành viên, đã phỏng vấn và xác minh trực tiếp.",
        })
      ).status,
      200,
    );
    assert.equal(
      (await req(`/${e}/candidates/${c}/decision`, "POST", decision)).status,
      409,
    );
    const roles = await f.db.query<any[]>(
      "SELECT role FROM user_roles WHERE user_id=10 AND role='moderator'",
    );
    assert.equal(roles.length, 1);
    assert.equal(
      (await req(`/${e}/transition`, "POST", { action: "publish" })).status,
      200,
    );
    const publicView = (await req(`/${e}`, "GET", undefined, null)).data;
    assert.equal(publicView.candidates[0].decision, "appointed");
    assert.equal(publicView.candidates[0].internalNote, null);
    assert.equal(publicView.candidates[0].overrideReason, null);
    // End the term to keep subsequent cases independent.
    assert.equal(
      (
        await req(`/${e}/candidates/${c}/tenure`, "POST", {
          action: "revoke",
          reason: "Kết thúc nhiệm kỳ thử nghiệm để kiểm tra ca kế tiếp.",
        })
      ).status,
      200,
    );
  });
  it("keeps supplemental explanations separate from the frozen candidate profile", async () => {
    const { e, c } = await ready();
    await close(e);
    const reason = "Cần bổ sung thời gian trực và cách giải quyết tranh chấp.";
    assert.equal(
      (
        await req(`/${e}/candidates/${c}/decision`, "POST", {
          action: "request_info",
          reason,
          internalNote: "Ghi chú chỉ dành cho admin, không được lộ ra ngoài.",
        })
      ).status,
      200,
    );
    const own = (await req(`/${e}`, "GET", undefined, 10)).data.candidates[0];
    assert.equal(own.internalNote, null);
    assert.equal(own.publicReason, reason);
    assert.equal(
      (
        await req(
          `/${e}/candidates/${c}`,
          "PUT",
          {
            action: "supplement",
            supplement:
              "Tôi có thể trực mỗi tối và sẽ lưu đầy đủ bằng chứng trước khi xử lý.",
          },
          10,
        )
      ).status,
      200,
    );
    const candidate = (await req(`/${e}`)).data.candidates[0];
    assert.equal(candidate.motivation, application.motivation);
    assert.equal(candidate.decision, "pending");
    assert.equal(
      (await req(`/${e}/transition`, "POST", { action: "publish" })).status,
      409,
    );
    assert.equal(
      (
        await req(`/${e}/candidates/${c}/decision`, "POST", {
          action: "reject",
          reason: "Chưa đáp ứng đầy đủ yêu cầu thời gian của kỳ tuyển này.",
        })
      ).status,
      200,
    );
    assert.equal(
      (await req(`/${e}/transition`, "POST", { action: "publish" })).status,
      200,
    );
  });
  it("enforces seat limits and serializes final admin decisions", async () => {
    const e = await create();
    await open(e);
    const c = await apply(e),
      other = await apply(e, 13);
    await verify(e, c);
    await verify(e, other);
    await startVotes(e);
    await close(e);
    const body = {
      action: "appoint",
      reason: "Ứng viên đáp ứng hồ sơ và được xem xét bổ nhiệm.",
      overrideReason:
        "Đã phỏng vấn trực tiếp, các ngưỡng bầu chọn chưa đạt vì quy mô kỳ thử nghiệm.",
    };
    const results = await Promise.all([
      req(`/${e}/candidates/${c}/decision`, "POST", body),
      req(`/${e}/candidates/${other}/decision`, "POST", body),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    const candidates = (await req(`/${e}`)).data.candidates;
    const pending = candidates.find((x: any) => x.decision === "pending");
    await req(`/${e}/candidates/${pending.id}/decision`, "POST", {
      action: "reject",
      reason: "Số ghế của kỳ đã đủ, hẹn bạn tham gia kỳ tiếp theo.",
    });
    await req(`/${e}/transition`, "POST", { action: "publish" });
    const appointed = candidates.find((x: any) => x.decision === "appointed");
    assert.equal(
      (
        await req(`/${e}/candidates/${appointed.id}/tenure`, "POST", {
          action: "confirm",
          reason: "Đã đánh giá đủ tiêu chí trong giai đoạn thử việc.",
        })
      ).status,
      409,
    );
    await f.db.query(
      "UPDATE election_candidates SET term_ends_at=? WHERE id=?",
      [Date.now() - 100, appointed.id],
    );
    // Auth must deny the expired moderator role even before periodic cleanup runs.
    const beforeCleanup = await fetch(f.url + "/api/mod/dashboard", {
      headers: { Authorization: "Bearer " + f.token(appointed.userId) },
    });
    assert.equal(beforeCleanup.status, 403);
    await expireElectionTerms();
    await expireElectionTerms();
    const ended = (await req(`/${e}`)).data.candidates.find(
      (x: any) => x.id === appointed.id,
    );
    assert.ok(ended.endedAt);
    const events = await f.db.query<any[]>(
      "SELECT id FROM election_audit WHERE election_id=? AND action='term_expired'",
      [e],
    );
    assert.equal(events.length, 1);
  });
  it("ends an elected tenure on manual role removal without revoking a later manual appointment", async () => {
    const { e, c } = await ready();
    await close(e);
    const appointment = {
      action: "appoint",
      reason: "Đã xác minh hồ sơ và phỏng vấn ứng viên đủ điều kiện.",
      overrideReason:
        "Đã phỏng vấn trực tiếp và xem xét bổ nhiệm trong kỳ có ít cử tri tham gia.",
    };
    assert.equal(
      (await req(`/${e}/candidates/${c}/decision`, "POST", appointment)).status,
      200,
    );
    await req(`/${e}/transition`, "POST", { action: "publish" });
    const roles = async (value: string[]) =>
      fetch(f.url + "/api/auth/update-roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + f.token(1),
        },
        body: JSON.stringify({ userId: 10, roles: value }),
      });
    assert.equal((await roles(["reader"])).status, 200);
    const ended = (await req(`/${e}`)).data.candidates[0];
    assert.ok(ended.endedAt);
    assert.equal(ended.endReason, "Admin thay đổi quyền thủ công");
    assert.equal((await roles(["reader", "moderator"])).status, 200);
    await f.db.query(
      "UPDATE election_candidates SET term_ends_at=? WHERE id=?",
      [Date.now() - 1, c],
    );
    await expireElectionTerms();
    assert.equal(
      (
        await f.db.query<any[]>(
          "SELECT role FROM user_roles WHERE user_id=10 AND role='moderator'",
        )
      ).length,
      1,
    );
    await roles(["reader"]);
  });
  it("rejects an expired panel member before cleanup and excludes their previous review from the tally", async () => {
    const { e, c } = await ready();
    assert.equal(
      (await req(`/${e}/candidates/${c}/review`, "PUT", review, 12)).status,
      200,
    );
    const expired = await create();
    await f.db.query(
      `INSERT INTO election_candidates (election_id,user_id,nominated_by,status,motivation,experience,availability,scenario_answer,decision,term_ends_at)
   VALUES (?,12,1,'eligible','Test expired panel member','Test','Test','Test','appointed',?)`,
      [expired, Date.now() - 1],
    );
    assert.equal(
      (await req(`/${e}/candidates/${c}/review`, "PUT", review, 12)).status,
      403,
    );
    await close(e);
    const result = (await req(`/${e}`)).data.snapshot.candidates[0];
    assert.equal(result.modPass, 0);
    assert.equal(result.invalidReviews, 1);
    await f.db.query(
      "UPDATE election_candidates SET ended_at=? WHERE election_id=?",
      [Date.now(), expired],
    );
  });
});

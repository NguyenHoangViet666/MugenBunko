import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "../types";
import type {
  ElectionCandidate,
  ElectionDetail,
  ElectionReview,
  ElectionRules,
  ElectionSummary,
} from "../../shared/elections";
import {
  candidateStatus,
  decisionStatus,
  electionStatus,
  ruleLabels,
} from "../../shared/elections";
import { Icons } from "../components/Icons";
import "../styles/elections.css";

type Request = (url: string, options?: RequestInit) => Promise<Response>;
type Mutate = (path: string, method: string, body: unknown) => Promise<boolean>;
type Props = {
  currentUser: User | null;
  API_BASE: string;
  fetchWithAuth: Request;
  embedded?: boolean;
  onLogin?: () => void;
};
const date = (value: number | null) =>
  value ? new Date(Number(value)).toLocaleString("vi-VN") : "—";
const localDate = (value: number) => {
  const d = new Date(value);
  return new Date(value - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const fromHash = () =>
  Number(window.location.hash.match(/^#\/elections\/([1-9]\d*)$/)?.[1]) || null;
const verdictLabel = {
  pass: "Đạt",
  fail: "Chưa đạt",
  abstain: "Không tham gia đánh giá",
};

export default function Elections({
  currentUser,
  API_BASE,
  fetchWithAuth,
  embedded = false,
  onLogin,
}: Props) {
  const admin = !!currentUser?.roles.includes("admin"),
    mod = !!currentUser?.roles.includes("moderator");
  const requestRef = useRef(fetchWithAuth);
  useEffect(() => {
    requestRef.current = fetchWithAuth;
  }, [fetchWithAuth]);
  const [list, setList] = useState<ElectionSummary[]>([]),
    [selected, setSelected] = useState<number | null>(() =>
      embedded ? null : fromHash(),
    );
  const [detail, setDetail] = useState<ElectionDetail | null>(null),
    [defaults, setDefaults] = useState<ElectionRules | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [actionError, setActionError] = useState(""),
    [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false),
    [create, setCreate] = useState(false),
    [edit, setEdit] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null),
    [now, setNow] = useState(Date.now());
  const lock = useRef(false),
    generation = useRef(0);
  const json = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      const res = await requestRef.current(API_BASE + "/elections" + path, {
        method,
        headers:
          body !== undefined
            ? { "Content-Type": "application/json" }
            : undefined,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không thể tải bầu chọn.");
      return data as T;
    },
    [API_BASE],
  );
  const load = useCallback(async () => {
    const turn = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const [index, rules] = await Promise.all([
        json<{ elections: ElectionSummary[]; nextPage: number | null }>("/"),
        json<ElectionRules>("/defaults"),
      ]);
      if (turn !== generation.current) return;
      setList(index.elections);
      setDefaults(rules);
      setNextPage(index.nextPage);
      const eid = selected || index.elections[0]?.id;
      if (eid) {
        const data = await json<ElectionDetail>("/" + eid);
        if (turn !== generation.current) return;
        setDetail(data);
        if (!selected) setSelected(eid);
      } else setDetail(null);
    } catch (e) {
      if (turn === generation.current) setError((e as Error).message);
    } finally {
      if (turn === generation.current) setLoading(false);
    }
  }, [json, selected, currentUser?.id, currentUser?.roles.join(",")]);
  useEffect(() => {
    setDetail(null);
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (embedded) return;
    const change = () => {
      setSelected(fromHash());
      setEdit(false);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, [embedded]);
  const select = (eid: number) => {
    setSelected(eid);
    setEdit(false);
    setActionError("");
    setNotice("");
    if (!embedded) window.location.hash = "#/elections/" + eid;
  };
  const mutate: Mutate = async (path, method, body) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await json(path, method, body);
      setNotice("Đã lưu thành công.");
      await load();
      return true;
    } catch (e) {
      setActionError((e as Error).message);
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const createElection = async (body: unknown) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    try {
      const result = await json<{ id: number }>("/", "POST", body);
      setCreate(false);
      select(result.id);
      setNotice("Đã tạo bản nháp. Kiểm tra thể lệ trước khi mở ứng cử.");
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const disabled = busy || loading || !!error;
  return (
    <section
      className={`elections ${embedded ? "elections-embedded" : ""}`}
      aria-labelledby={
        embedded ? "election-embedded-title" : "election-page-title"
      }
    >
      <header className="election-heading">
        <div>
          <span className="election-eyebrow">
            Cộng đồng cùng xây dựng thư viện
          </span>
          <h1 id={embedded ? "election-embedded-title" : "election-page-title"}>
            {admin
              ? "Bầu chọn & bổ nhiệm mod"
              : mod
                ? "Hội đồng bầu chọn mod"
                : "Bầu chọn kiểm duyệt viên"}
          </h1>
          <p>
            Cộng đồng bày tỏ tín nhiệm, hội đồng mod đánh giá hồ sơ. Admin đưa
            ra quyết định bổ nhiệm cuối cùng và công khai lý do.
          </p>
        </div>
        <div className="election-actions">
          <button
            className="outline-btn"
            disabled={busy || loading}
            onClick={() => void load()}
            aria-label="Làm mới bầu chọn"
          >
            <Icons.RefreshCw size={16} /> Làm mới
          </button>
          {admin && (
            <button
              className="primary-btn"
              disabled={busy || !defaults}
              onClick={() => {
                setCreate(!create);
                setActionError("");
              }}
            >
              Tạo kỳ bầu chọn
            </button>
          )}
        </div>
      </header>
      <div className="election-process" aria-label="Quy trình">
        <span>01 · Ứng cử</span>
        <span>02 · Kiểm tra hồ sơ</span>
        <span>03 · Cộng đồng & hội đồng bỏ phiếu</span>
        <span>04 · Admin quyết định</span>
        <span>05 · Công bố & thử việc</span>
      </div>
      {error && (
        <div className="election-feedback" role="alert">
          {error}{" "}
          <button
            className="outline-btn small"
            disabled={busy}
            onClick={() => void load()}
          >
            Thử lại
          </button>
        </div>
      )}
      {actionError && (
        <div className="election-feedback" role="alert">
          {actionError}
        </div>
      )}
      {notice && (
        <p className="election-notice" role="status">
          {notice}
        </p>
      )}
      {loading && <p role="status">Đang tải bầu chọn…</p>}
      {create && defaults && (
        <ElectionForm
          rules={defaults}
          busy={busy}
          onSave={createElection}
          onClose={() => setCreate(false)}
        />
      )}
      {!loading && !error && !list.length && (
        <div className="election-empty">
          <Icons.Users size={32} />
          <h2>Chưa có kỳ bầu chọn</h2>
          <p>
            {admin
              ? "Tạo bản nháp, chọn thời hạn và thể lệ để bắt đầu."
              : "Các kỳ tuyển kiểm duyệt viên sẽ xuất hiện tại đây khi mở ứng cử."}
          </p>
        </div>
      )}
      {!!list.length && (
        <div className="election-layout">
          <aside className="election-index" aria-label="Các kỳ bầu chọn">
            {list.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selected === item.id ? "is-selected" : ""}
                aria-pressed={selected === item.id}
                onClick={() => select(item.id)}
              >
                <span className="election-badge">
                  {electionStatus[item.status]}
                </span>
                <strong>{item.title}</strong>
                <small>
                  {item.rules.seats} ghế · Hạn phiếu {date(item.votingClosesAt)}
                </small>
              </button>
            ))}
            {nextPage && (
              <button
                className="outline-btn"
                disabled={disabled}
                onClick={() =>
                  void json<{
                    elections: ElectionSummary[];
                    nextPage: number | null;
                  }>("/?page=" + nextPage)
                    .then((r) => {
                      setList((old) => [
                        ...old,
                        ...r.elections.filter(
                          (e) => !old.some((o) => o.id === e.id),
                        ),
                      ]);
                      setNextPage(r.nextPage);
                    })
                    .catch((e) => setError(e.message))
                }
              >
                Xem kỳ trước
              </button>
            )}
          </aside>
          <div className="election-main" aria-busy={busy || loading}>
            {detail && (
              <>
                <section className="election-panel">
                  <div className="election-title-row">
                    <h2>{detail.title}</h2>
                    <span className="election-badge">
                      {electionStatus[detail.status]}
                    </span>
                  </div>
                  <p className="election-preserve">{detail.description}</p>
                  <div className="election-metrics">
                    <div>
                      <strong>{detail.rules.seats}</strong>
                      <span>Ghế bổ nhiệm</span>
                    </div>
                    <div>
                      <strong>{detail.rules.maxChoices}</strong>
                      <span>Lựa chọn / cử tri</span>
                    </div>
                    <div>
                      <strong>{detail.rules.minReviewers}</strong>
                      <span>Mod đánh giá tối thiểu</span>
                    </div>
                    <div>
                      <strong>{detail.rules.reviewApprovalPercent}%</strong>
                      <span>Mod đồng ý để đề xuất</span>
                    </div>
                  </div>
                  <p>
                    Hạn ứng cử:{" "}
                    <strong>{date(detail.nominationClosesAt)}</strong>
                    <br />
                    Hạn bỏ phiếu: <strong>{date(detail.votingClosesAt)}</strong>
                  </p>
                  <details>
                    <summary>Thể lệ và điều kiện tham gia</summary>
                    <dl className="election-rules">
                      {Object.entries(ruleLabels).map(([key, label]) => (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>
                            {detail.rules[key as keyof typeof ruleLabels]}
                          </dd>
                        </div>
                      ))}
                      <div>
                        <dt>Email đã xác thực</dt>
                        <dd>
                          {detail.rules.requireVerifiedEmail
                            ? "Bắt buộc"
                            : "Không bắt buộc"}
                        </dd>
                      </div>
                    </dl>
                    <p>
                      Danh sách cử tri và hội đồng được chốt khi mở phiếu. Có
                      thể thay đổi lựa chọn trước hạn; mỗi cử tri không được tự
                      bầu. Phiếu không còn hợp lệ được loại khi chốt. Phiếu
                      không tham gia đánh giá của mod không tính vào tỷ lệ hoặc
                      số người tối thiểu. Các trường hợp hòa phiếu do admin xem
                      xét và giải trình.
                    </p>
                    <p>Ứng viên cần trả lời: {detail.rules.scenario}</p>
                  </details>
                  {detail.status === "voting" &&
                    now >= Number(detail.votingClosesAt) && (
                      <p role="status">
                        Đã hết thời gian bỏ phiếu. Đang chờ admin chốt và đối
                        soát kết quả.
                      </p>
                    )}
                  {admin && (
                    <AdminTransitions
                      detail={detail}
                      disabled={disabled}
                      now={now}
                      mutate={mutate}
                      onEdit={() => setEdit(!edit)}
                    />
                  )}
                </section>
                {edit && detail.status === "draft" && (
                  <ElectionForm
                    key={detail.id}
                    initial={detail}
                    rules={detail.rules}
                    busy={busy}
                    onClose={() => setEdit(false)}
                    onSave={async (body) => {
                      if (await mutate("/" + detail.id, "PUT", body))
                        setEdit(false);
                    }}
                  />
                )}
                {!currentUser && (
                  <div className="election-panel">
                    <p>Đăng nhập để kiểm tra điều kiện ứng cử và bỏ phiếu.</p>
                    <button className="primary-btn" onClick={onLogin}>
                      Đăng nhập
                    </button>
                  </div>
                )}
                {currentUser &&
                  detail.status === "nominations" &&
                  now < Number(detail.nominationClosesAt) && (
                    <ApplicationArea
                      key={"application-" + detail.id}
                      detail={detail}
                      uid={currentUser.id}
                      disabled={disabled}
                      mutate={mutate}
                    />
                  )}
                {currentUser && detail.status === "voting" && (
                  <Ballot
                    key={
                      "ballot-" + detail.id + "-" + detail.myBallot.join(",")
                    }
                    detail={detail}
                    uid={currentUser.id}
                    disabled={disabled || now >= Number(detail.votingClosesAt)}
                    mutate={mutate}
                  />
                )}
                {detail.snapshot && (
                  <section className="election-panel">
                    <h2>Kết quả đã chốt</h2>
                    <p>
                      {detail.snapshot.turnout}/{detail.snapshot.electorate} cử
                      tri hợp lệ tham gia · {detail.snapshot.panel} mod trong
                      danh sách hội đồng · Chốt lúc{" "}
                      {date(detail.snapshot.closedAt)}
                    </p>
                    <p>
                      Hai luồng phiếu được thống kê riêng. Mức “Đạt ngưỡng đề
                      xuất” hỗ trợ admin đánh giá; quyết định bổ nhiệm được ghi
                      trên từng hồ sơ.
                    </p>
                    <div className="election-table-wrap">
                      <table className="election-table">
                        <thead>
                          <tr>
                            <th>Ứng viên</th>
                            <th>Cộng đồng</th>
                            <th>Hội đồng</th>
                            <th>Đề xuất</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.snapshot.candidates.map((r) => (
                            <tr key={r.id}>
                              <th scope="row">
                                {r.displayname}
                                <small>
                                  @{r.username} · Hạng {r.rank}
                                </small>
                              </th>
                              <td>
                                {r.votes} phiếu
                                <small>
                                  {r.invalidVotes} phiếu không hợp lệ
                                </small>
                              </td>
                              <td>
                                {r.modPass} đạt / {r.modFail} chưa đạt
                                <small>
                                  {r.modAbstain} không tham gia ·{" "}
                                  {r.approvalPercent}% đồng ý
                                </small>
                                <small>
                                  {r.quorumMet ? "Đủ" : "Thiếu"} số mod tối
                                  thiểu · {r.invalidReviews} phiếu không hợp lệ
                                </small>
                              </td>
                              <td>
                                {r.recommended
                                  ? "Đạt ngưỡng đề xuất"
                                  : "Chưa đạt ngưỡng"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
                <section className="election-candidates">
                  <h2>Hồ sơ ứng viên ({detail.candidates.length})</h2>
                  {!detail.candidates.length && (
                    <div className="election-empty">
                      <p>
                        Chưa có hồ sơ công khai. Người được đề cử cần đồng ý và
                        hoàn thiện hồ sơ.
                      </p>
                    </div>
                  )}
                  {detail.candidates.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      detail={detail}
                      currentUser={currentUser}
                      disabled={disabled}
                      now={now}
                      mutate={mutate}
                    />
                  ))}
                </section>
                {currentUser && (
                  <Complaints
                    key={"complaints-" + detail.id}
                    detail={detail}
                    admin={admin}
                    disabled={disabled}
                    mutate={mutate}
                  />
                )}
                {admin && detail.reviewDetail.length > 0 && (
                  <section className="election-panel">
                    <h2>Nhận xét hội đồng · Nội bộ</h2>
                    {detail.reviewDetail.map((r) => (
                      <details key={r.candidateId + "-" + r.username}>
                        <summary>
                          @{r.username} →{" "}
                          {
                            detail.candidates.find(
                              (c) => c.id === r.candidateId,
                            )?.displayname
                          }{" "}
                          · {verdictLabel[r.verdict]}
                        </summary>
                        <p className="election-preserve">{r.comment}</p>
                        <p>
                          Hiểu quy định: {r.criteria.rules ? "Có" : "Chưa"} ·
                          Công bằng: {r.criteria.fairness ? "Có" : "Chưa"} ·
                          Bằng chứng: {r.criteria.evidence ? "Có" : "Chưa"}
                        </p>
                      </details>
                    ))}
                  </section>
                )}
                {admin && (
                  <section className="election-panel">
                    <h2>Nhật ký quyết định · Nội bộ</h2>
                    <p>
                      150 thao tác gần nhất; có ghi nhận người thực hiện và dữ
                      liệu của từng thay đổi.
                    </p>
                    {detail.audit.map((a) => (
                      <details key={a.id}>
                        <summary>
                          {a.username ? "@" + a.username : "Hệ thống"} ·{" "}
                          {a.action} ·{" "}
                          {new Date(a.createdAt).toLocaleString("vi-VN")}
                        </summary>
                        <pre>{JSON.stringify(a.details, null, 2)}</pre>
                      </details>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ElectionForm({
  rules,
  initial,
  busy,
  onSave,
  onClose,
}: {
  rules: ElectionRules;
  initial?: ElectionSummary;
  busy: boolean;
  onSave: (body: unknown) => Promise<unknown>;
  onClose: () => void;
}) {
  const [policy, setPolicy] = useState({ ...rules }),
    [title, setTitle] = useState(initial?.title || ""),
    [description, setDescription] = useState(
      initial?.description ||
        "Cộng đồng bầu chọn và hội đồng mod thẩm định độc lập. Admin quyết định bổ nhiệm cuối cùng, kèm lý do công khai.",
    );
  const [nomination, setNomination] = useState(
      localDate(initial?.nominationClosesAt || Date.now() + 7 * 86400000),
    ),
    [voting, setVoting] = useState(
      localDate(initial?.votingClosesAt || Date.now() + 14 * 86400000),
    );
  return (
    <form
      className="election-panel election-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({
          title,
          description,
          rules: policy,
          nominationClosesAt: new Date(nomination).getTime(),
          votingClosesAt: new Date(voting).getTime(),
        });
      }}
    >
      <h2>{initial ? "Sửa thể lệ bản nháp" : "Kỳ bầu chọn mới"}</h2>
      <p>
        Thể lệ và lịch sẽ khóa khi mở ứng cử. Thời gian nhập theo múi giờ thiết
        bị ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
      </p>
      <label>
        Tên kỳ
        <input
          required
          minLength={5}
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Thể lệ công khai
        <textarea
          required
          minLength={20}
          maxLength={10000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="election-fields">
        <label>
          Hạn ứng cử
          <input
            type="datetime-local"
            required
            value={nomination}
            onChange={(e) => setNomination(e.target.value)}
          />
        </label>
        <label>
          Hạn bỏ phiếu
          <input
            type="datetime-local"
            required
            value={voting}
            onChange={(e) => setVoting(e.target.value)}
          />
        </label>
        {Object.entries(ruleLabels).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min={
                [
                  "voterAgeDays",
                  "candidateAgeDays",
                  "minCommunityVotes",
                ].includes(key)
                  ? 0
                  : 1
              }
              max={key === "reviewApprovalPercent" ? 100 : undefined}
              required
              value={policy[key as keyof typeof ruleLabels]}
              onChange={(e) =>
                setPolicy({ ...policy, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      <label className="election-check">
        <input
          type="checkbox"
          checked={policy.requireVerifiedEmail}
          onChange={(e) =>
            setPolicy({ ...policy, requireVerifiedEmail: e.target.checked })
          }
        />{" "}
        Yêu cầu email đã xác thực
      </label>
      <label>
        Tình huống xét tuyển
        <textarea
          required
          minLength={20}
          maxLength={2000}
          value={policy.scenario}
          onChange={(e) => setPolicy({ ...policy, scenario: e.target.value })}
        />
      </label>
      <div className="election-actions">
        <button className="primary-btn" disabled={busy}>
          Lưu bản nháp
        </button>
        <button
          type="button"
          className="outline-btn"
          disabled={busy}
          onClick={onClose}
        >
          Hủy chỉnh sửa
        </button>
      </div>
    </form>
  );
}
function AdminTransitions({
  detail,
  disabled,
  now,
  mutate,
  onEdit,
}: {
  detail: ElectionDetail;
  disabled: boolean;
  now: number;
  mutate: Mutate;
  onEdit: () => void;
}) {
  const [reason, setReason] = useState("");
  const buttons: Record<
    string,
    { action: string; label: string; blocked?: boolean }[]
  > = {
    draft: [{ action: "open", label: "Mở ứng cử" }],
    nominations: [
      {
        action: "vote",
        label: "Mở hai vòng bỏ phiếu",
        blocked: now < Number(detail.nominationClosesAt),
      },
    ],
    voting: [
      {
        action: "close",
        label: "Chốt và đối soát kết quả",
        blocked: now < Number(detail.votingClosesAt),
      },
    ],
    review: [{ action: "publish", label: "Công bố kết quả" }],
  };
  return (
    <div className="election-admin-controls">
      <div className="election-actions">
        {detail.status === "draft" && (
          <button className="outline-btn" disabled={disabled} onClick={onEdit}>
            Sửa thể lệ
          </button>
        )}
        {buttons[detail.status]?.map((b) => (
          <button
            key={b.action}
            className="primary-btn"
            disabled={disabled || b.blocked}
            onClick={() => {
              if (
                window.confirm(
                  `${b.label}? Thao tác này thay đổi giai đoạn của kỳ bầu chọn.`,
                )
              )
                void mutate(`/${detail.id}/transition`, "POST", {
                  action: b.action,
                });
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
      {!["completed", "cancelled"].includes(detail.status) && (
        <details>
          <summary>Hủy kỳ bầu chọn</summary>
          <label>
            Lý do hủy
            <textarea
              minLength={10}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="outline-btn"
            disabled={disabled || reason.trim().length < 10}
            onClick={() => {
              if (window.confirm("Hủy kỳ bầu chọn? Lý do sẽ được công khai."))
                void mutate(`/${detail.id}/transition`, "POST", {
                  action: "cancel",
                  reason,
                });
            }}
          >
            Xác nhận hủy kỳ
          </button>
        </details>
      )}
    </div>
  );
}
function ApplicationArea({
  detail,
  uid,
  disabled,
  mutate,
}: {
  detail: ElectionDetail;
  uid: number;
  disabled: boolean;
  mutate: Mutate;
}) {
  const own = detail.candidates.find((c) => c.userId === uid),
    [show, setShow] = useState(false),
    [nominee, setNominee] = useState("");
  const canApply =
    !detail.applicationIssues.length &&
    (!own || ["invited", "submitted", "eligible"].includes(own.status));
  return (
    <section className="election-panel">
      <h2>Tham gia xây dựng đội ngũ</h2>
      {detail.applicationIssues.length > 0 && (
        <p>{detail.applicationIssues.join(". ")}.</p>
      )}
      {own && (
        <p>
          Hồ sơ của bạn: <strong>{candidateStatus[own.status]}</strong>.{" "}
          {own.status === "invited"
            ? "Bạn cần đồng ý đề cử bằng cách nộp đầy đủ hồ sơ."
            : ""}
        </p>
      )}
      {canApply && (
        <button
          className="primary-btn"
          disabled={disabled}
          onClick={() => setShow(!show)}
        >
          {own?.status === "invited"
            ? "Đồng ý đề cử & viết hồ sơ"
            : own
              ? "Chỉnh sửa hồ sơ"
              : "Tự ứng cử"}
        </button>
      )}
      {show && canApply && (
        <ApplicationForm
          key={own?.id || "new"}
          candidate={own}
          scenario={detail.rules.scenario}
          disabled={disabled}
          onSubmit={async (body) => {
            if (
              await mutate(
                `/${detail.id}/candidates${own ? "/" + own.id : ""}`,
                own ? "PUT" : "POST",
                body,
              )
            )
              setShow(false);
          }}
        />
      )}
      <details>
        <summary>Đề cử một thành viên khác</summary>
        <p>
          Thành viên được đề cử phải đồng ý trước hạn. Lời mời chưa được đồng ý
          không xuất hiện trong danh sách công khai.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(`/${detail.id}/candidates`, "POST", {
              nomineeUsername: nominee,
            }).then((ok) => {
              if (ok) setNominee("");
            });
          }}
        >
          <label>
            Tên tài khoản được đề cử
            <input
              required
              maxLength={50}
              value={nominee}
              onChange={(e) => setNominee(e.target.value)}
            />
          </label>
          <button
            className="outline-btn"
            disabled={disabled || !nominee.trim()}
          >
            Gửi đề cử
          </button>
        </form>
      </details>
    </section>
  );
}
function ApplicationForm({
  candidate,
  scenario,
  disabled,
  onSubmit,
}: {
  candidate?: ElectionCandidate;
  scenario: string;
  disabled: boolean;
  onSubmit: (body: unknown) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState({
    motivation: candidate?.motivation || "",
    experience: candidate?.experience || "",
    availability: candidate?.availability || "",
    scenarioAnswer: candidate?.scenarioAnswer || "",
  });
  return (
    <form
      className="election-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(draft);
      }}
    >
      <p>
        Hồ sơ dưới đây được công khai sau khi bạn đồng ý nộp. Chỉnh sửa sẽ đưa
        hồ sơ về trạng thái chờ kiểm tra.
      </p>
      {(
        [
          ["motivation", "Lý do ứng cử", 30, 3000],
          ["experience", "Kinh nghiệm cộng đồng", 10, 2000],
          ["availability", "Thời gian có thể tham gia", 5, 280],
          ["scenarioAnswer", "Trả lời tình huống", 30, 4000],
        ] as const
      ).map(([key, label, min, max]) => (
        <label key={key}>
          {label}
          {key === "scenarioAnswer" && <small>{scenario}</small>}
          <textarea
            required
            minLength={min}
            maxLength={max}
            value={draft[key]}
            onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
          />
        </label>
      ))}
      <label className="election-check">
        <input required type="checkbox" /> Tôi đồng ý ứng cử và công khai hồ sơ
        trên.
      </label>
      <button className="primary-btn" disabled={disabled}>
        Nộp hồ sơ ứng cử
      </button>
    </form>
  );
}
function Ballot({
  detail,
  uid,
  disabled,
  mutate,
}: {
  detail: ElectionDetail;
  uid: number;
  disabled: boolean;
  mutate: Mutate;
}) {
  const [ids, setIds] = useState(detail.myBallot);
  return (
    <section className="election-panel">
      <h2>Phiếu tín nhiệm cộng đồng</h2>
      {detail.canVote ? (
        <>
          <p>
            Chọn tối đa {detail.rules.maxChoices} ứng viên. Có thể lưu lại để
            thay đổi hoặc bỏ tất cả lựa chọn trước hạn. Kết quả tổng hợp được
            công bố sau khi admin hoàn tất xét tuyển.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(`/${detail.id}/ballot`, "PUT", { candidateIds: ids });
            }}
          >
            <fieldset disabled={disabled}>
              <legend>Ứng viên bạn tín nhiệm</legend>
              {detail.candidates
                .filter((c) => c.status === "eligible")
                .map((c) => (
                  <label className="election-check" key={c.id}>
                    <input
                      type="checkbox"
                      checked={ids.includes(c.id)}
                      disabled={
                        c.userId === uid ||
                        (!ids.includes(c.id) &&
                          ids.length >= detail.rules.maxChoices)
                      }
                      onChange={(e) =>
                        setIds(
                          e.target.checked
                            ? [...ids, c.id]
                            : ids.filter((i) => i !== c.id),
                        )
                      }
                    />
                    {c.displayname} (@{c.username})
                    {c.userId === uid ? " · Không tự bầu" : ""}
                  </label>
                ))}
            </fieldset>
            <p>
              {ids.length}/{detail.rules.maxChoices} lựa chọn · Đã lưu:{" "}
              {detail.myBallot.length} lựa chọn
            </p>
            <button className="primary-btn" disabled={disabled}>
              Lưu phiếu tín nhiệm
            </button>
          </form>
        </>
      ) : (
        <p>
          Bạn chưa thuộc danh sách cử tri đủ điều kiện đã chốt khi mở phiếu.
          Kiểm tra yêu cầu tuổi tài khoản và email trong thể lệ.
        </p>
      )}
    </section>
  );
}
function CandidateCard({
  candidate: c,
  detail,
  currentUser,
  disabled,
  now,
  mutate,
}: {
  candidate: ElectionCandidate;
  detail: ElectionDetail;
  currentUser: User | null;
  disabled: boolean;
  now: number;
  mutate: Mutate;
}) {
  const own = currentUser?.id === c.userId,
    admin = !!currentUser?.roles.includes("admin");
  const [reason, setReason] = useState(""),
    [note, setNote] = useState(""),
    [override, setOverride] = useState(""),
    [supplement, setSupplement] = useState("");
  const endpoint = `/${detail.id}/candidates/${c.id}`;
  const decide = (action: string) => {
    if (
      window.confirm(
        action === "appoint"
          ? `Bổ nhiệm @${c.username} và cấp quyền mod ngay?`
          : "Lưu quyết định hồ sơ này?",
      )
    )
      void mutate(endpoint + "/decision", "POST", {
        action,
        reason,
        internalNote: note,
        overrideReason: override,
      });
  };
  return (
    <article
      className="election-panel election-candidate"
      id={"election-candidate-" + c.id}
    >
      <div className="election-title-row">
        <div>
          <h3>{c.displayname}</h3>
          <a href={"#/profile/" + encodeURIComponent(c.username)}>
            @{c.username}
          </a>
        </div>
        <span className="election-badge">{candidateStatus[c.status]}</span>
      </div>
      {c.motivation && (
        <>
          <h4>Lý do ứng cử</h4>
          <p className="election-preserve">{c.motivation}</p>
          <p>
            <strong>Thời gian:</strong> {c.availability}
          </p>
          <details>
            <summary>Kinh nghiệm và xử lý tình huống</summary>
            <p className="election-preserve">{c.experience}</p>
            <p>
              <strong>Tình huống:</strong> {detail.rules.scenario}
            </p>
            <p className="election-preserve">{c.scenarioAnswer}</p>
          </details>
        </>
      )}
      {c.verificationReason && <p>Nhận xét kiểm tra: {c.verificationReason}</p>}
      {c.decision !== "pending" && (
        <div className="election-decision">
          <strong>{decisionStatus[c.decision]}</strong>
          <p>{c.publicReason}</p>
          {c.decision === "appointed" && (
            <p>
              Thử việc đến {date(c.probationEndsAt)} · Nhiệm kỳ đến{" "}
              {date(c.termEndsAt)}
              {c.confirmedAt ? " · Đã xác nhận hoàn thành thử việc" : ""}
              {c.endedAt ? " · Đã kết thúc: " + c.endReason : ""}
            </p>
          )}
        </div>
      )}
      {own &&
        ["nominations", "voting"].includes(detail.status) &&
        !["withdrawn", "ineligible"].includes(c.status) && (
          <button
            className="outline-btn"
            disabled={disabled}
            onClick={() => {
              if (
                window.confirm(
                  "Rút hồ sơ? Phiếu cho bạn sẽ không tính khi chốt.",
                )
              )
                void mutate(endpoint, "PUT", { action: "withdraw" });
            }}
          >
            Rút hồ sơ của tôi
          </button>
        )}
      {own && c.decision === "needs_info" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void mutate(endpoint, "PUT", {
              action: "supplement",
              supplement,
            }).then((ok) => {
              if (ok) setSupplement("");
            });
          }}
        >
          <label>
            Giải trình bổ sung
            <textarea
              required
              minLength={20}
              maxLength={4000}
              value={supplement}
              onChange={(e) => setSupplement(e.target.value)}
            />
          </label>
          <button className="primary-btn" disabled={disabled}>
            Gửi bổ sung hồ sơ
          </button>
        </form>
      )}
      {c.supplement && (
        <details>
          <summary>Giải trình bổ sung</summary>
          <p className="election-preserve">{c.supplement}</p>
        </details>
      )}
      {detail.canReview &&
        detail.status === "voting" &&
        c.status === "eligible" &&
        !own && (
          <ReviewForm
            key={
              c.id +
              "-" +
              (detail.myReviews.find((r) => r.candidateId === c.id)?.comment ||
                "")
            }
            review={detail.myReviews.find((r) => r.candidateId === c.id)}
            disabled={disabled || now >= Number(detail.votingClosesAt)}
            onSave={(body) => mutate(endpoint + "/review", "PUT", body)}
          />
        )}
      {admin &&
        detail.status === "nominations" &&
        ["submitted", "eligible", "ineligible"].includes(c.status) && (
          <div className="election-admin-controls">
            <label>
              Nhận xét kiểm tra @{c.username}
              <textarea
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <div className="election-actions">
              <button
                className="primary-btn"
                disabled={disabled || reason.trim().length < 10}
                onClick={() =>
                  void mutate(endpoint + "/verify", "POST", {
                    eligible: true,
                    reason,
                  })
                }
              >
                Xác nhận đủ điều kiện
              </button>
              <button
                className="outline-btn"
                disabled={disabled || reason.trim().length < 10}
                onClick={() =>
                  void mutate(endpoint + "/verify", "POST", {
                    eligible: false,
                    reason,
                  })
                }
              >
                Chưa đủ điều kiện
              </button>
            </div>
          </div>
        )}
      {admin &&
        detail.status === "review" &&
        ["eligible", "ineligible"].includes(c.status) &&
        ["pending", "needs_info"].includes(c.decision) && (
          <div className="election-admin-controls">
            <h4>Quyết định của admin</h4>
            <label>
              Lý do công khai cho @{c.username}
              <textarea
                maxLength={3000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label>
              Ghi chú nội bộ cho @{c.username}
              <textarea
                maxLength={3000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <label>
              Giải trình nếu bổ nhiệm khác đề xuất cho @{c.username}
              <textarea
                maxLength={3000}
                value={override}
                onChange={(e) => setOverride(e.target.value)}
              />
            </label>
            <p>
              Giải trình tối thiểu 30 ký tự nếu chưa đạt ngưỡng hoặc xếp sau số
              ghế tuyển. Quyền mod được cấp ngay khi xác nhận bổ nhiệm.
            </p>
            <div className="election-actions">
              <button
                className="primary-btn"
                disabled={
                  disabled ||
                  reason.trim().length < 20 ||
                  c.status !== "eligible"
                }
                onClick={() => decide("appoint")}
              >
                Bổ nhiệm @{c.username}
              </button>
              <button
                className="outline-btn"
                disabled={disabled || reason.trim().length < 20}
                onClick={() => decide("request_info")}
              >
                Yêu cầu bổ sung
              </button>
              <button
                className="outline-btn"
                disabled={disabled || reason.trim().length < 20}
                onClick={() => decide("reject")}
              >
                Không bổ nhiệm
              </button>
            </div>
          </div>
        )}
      {admin && c.internalNote && <p>Ghi chú nội bộ: {c.internalNote}</p>}
      {admin && c.overrideReason && (
        <p>Giải trình khác đề xuất: {c.overrideReason}</p>
      )}
      {admin &&
        detail.status === "completed" &&
        c.decision === "appointed" &&
        !c.endedAt && (
          <div className="election-admin-controls">
            <label>
              Lý do đánh giá nhiệm kỳ @{c.username}
              <textarea
                maxLength={3000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <div className="election-actions">
              <button
                className="outline-btn"
                disabled={
                  disabled ||
                  reason.trim().length < 20 ||
                  !!c.confirmedAt ||
                  now < Number(c.probationEndsAt) ||
                  now >= Number(c.termEndsAt)
                }
                onClick={() =>
                  void mutate(endpoint + "/tenure", "POST", {
                    action: "confirm",
                    reason,
                  })
                }
              >
                Xác nhận hết thử việc
              </button>
              <button
                className="outline-btn"
                disabled={
                  disabled ||
                  reason.trim().length < 20 ||
                  now >= Number(c.termEndsAt)
                }
                onClick={() => {
                  if (window.confirm("Kết thúc nhiệm kỳ và thu hồi quyền mod?"))
                    void mutate(endpoint + "/tenure", "POST", {
                      action: "revoke",
                      reason,
                    });
                }}
              >
                Kết thúc nhiệm kỳ
              </button>
            </div>
          </div>
        )}
    </article>
  );
}
function ReviewForm({
  review,
  disabled,
  onSave,
}: {
  review?: ElectionReview;
  disabled: boolean;
  onSave: (body: unknown) => Promise<unknown>;
}) {
  const [verdict, setVerdict] = useState(review?.verdict || "abstain"),
    [comment, setComment] = useState(review?.comment || ""),
    [criteria, setCriteria] = useState(
      review?.criteria || { rules: false, fairness: false, evidence: false },
    );
  return (
    <details className="election-admin-controls">
      <summary>
        {review
          ? "Sửa đánh giá hội đồng của tôi"
          : "Đánh giá với tư cách hội đồng mod"}
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave({ verdict, criteria, comment });
        }}
      >
        <p>
          Nhận xét của bạn dành cho admin. Khi có xung đột lợi ích, chọn không
          tham gia đánh giá và nêu lý do.
        </p>
        {(
          [
            ["rules", "Hiểu quy định"],
            ["fairness", "Giữ công bằng"],
            ["evidence", "Xử lý dựa trên bằng chứng"],
          ] as const
        ).map(([key, label]) => (
          <label className="election-check" key={key}>
            <input
              type="checkbox"
              checked={criteria[key]}
              disabled={disabled}
              onChange={(e) =>
                setCriteria({ ...criteria, [key]: e.target.checked })
              }
            />
            {label}
          </label>
        ))}
        <label>
          Kết luận của hội đồng
          <select
            value={verdict}
            onChange={(e) =>
              setVerdict(e.target.value as ElectionReview["verdict"])
            }
          >
            {Object.entries(verdictLabel).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nhận xét đánh giá
          <textarea
            required
            minLength={10}
            maxLength={3000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
        <button className="primary-btn" disabled={disabled}>
          Lưu đánh giá hội đồng
        </button>
      </form>
    </details>
  );
}
function Complaints({
  detail,
  admin,
  disabled,
  mutate,
}: {
  detail: ElectionDetail;
  admin: boolean;
  disabled: boolean;
  mutate: Mutate;
}) {
  const [message, setMessage] = useState(""),
    [resolution, setResolution] = useState<Record<number, string>>({});
  return (
    <section className="election-panel">
      <h2>{admin ? "Khiếu nại cần đối soát" : "Khiếu nại của tôi"}</h2>
      <p>
        Nội dung khiếu nại chỉ hiển thị với người gửi và admin. Cần giải quyết
        các khiếu nại đang mở trước khi bổ nhiệm và công bố.
      </p>
      {detail.complaints.map((c) => (
        <article className="election-complaint" key={c.id}>
          <strong>
            #{c.id} · {c.status === "open" ? "Chờ xử lý" : "Đã xử lý"}
          </strong>
          <p className="election-preserve">{c.message}</p>
          {c.resolution && <p>Kết quả: {c.resolution}</p>}
          {admin && c.status === "open" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void mutate(
                  `/${detail.id}/complaints/${c.id}/resolve`,
                  "POST",
                  { resolution: resolution[c.id] || "" },
                );
              }}
            >
              <label>
                Kết quả xử lý khiếu nại #{c.id}
                <textarea
                  required
                  minLength={20}
                  maxLength={3000}
                  value={resolution[c.id] || ""}
                  onChange={(e) =>
                    setResolution({ ...resolution, [c.id]: e.target.value })
                  }
                />
              </label>
              <button className="outline-btn" disabled={disabled}>
                Lưu kết quả xử lý
              </button>
            </form>
          )}
        </article>
      ))}
      {["nominations", "voting", "review"].includes(detail.status) && (
        <details>
          <summary>Gửi khiếu nại về kỳ bầu chọn</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void mutate(`/${detail.id}/complaints`, "POST", { message }).then(
                (ok) => {
                  if (ok) setMessage("");
                },
              );
            }}
          >
            <label>
              Nội dung khiếu nại
              <textarea
                required
                minLength={20}
                maxLength={3000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <button
              className="outline-btn"
              disabled={
                disabled ||
                detail.complaints.some((c) => c.status === "open" && !admin)
              }
            >
              Gửi khiếu nại
            </button>
          </form>
        </details>
      )}
    </section>
  );
}

import { Router, Response, NextFunction } from "express";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import db from "../db.js";
import {
  authenticateToken,
  optionalAuthentication,
  AuthenticatedRequest,
} from "../middleware/auth.js";

const router = Router();
const DAY = 86400000;
type Row = RowDataPacket & Record<string, any>;
type Rules = {
  seats: number;
  maxChoices: number;
  voterAgeDays: number;
  candidateAgeDays: number;
  requireVerifiedEmail: boolean;
  minCommunityVotes: number;
  minReviewers: number;
  reviewApprovalPercent: number;
  probationDays: number;
  termDays: number;
  scenario: string;
};
const defaults: Rules = {
  seats: 2,
  maxChoices: 2,
  voterAgeDays: 7,
  candidateAgeDays: 30,
  requireVerifiedEmail: true,
  minCommunityVotes: 3,
  minReviewers: 2,
  reviewApprovalPercent: 60,
  probationDays: 14,
  termDays: 180,
  scenario:
    "Hai tác giả tranh chấp nội dung một chương. Bạn sẽ thu thập bằng chứng và xử lý thế nào?",
};
class ElectionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, message: string): never => {
  throw new ElectionError(status, message);
};
const parse = <T>(value: T | string): T =>
  typeof value === "string" ? JSON.parse(value) : value;
const str = (value: unknown, min: number, max: number, label: string) => {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    fail(400, `${label}: từ ${min} đến ${max} ký tự.`);
  return (value as string).trim();
};
const id = (value: unknown) => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) fail(400, "ID không hợp lệ.");
  return n;
};
const isAdmin = (req: AuthenticatedRequest) =>
  !!req.user?.roles.includes("admin");
const isStaff = (req: AuthenticatedRequest) =>
  isAdmin(req) || !!req.user?.roles.includes("moderator");
const admin = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) =>
  isAdmin(req)
    ? next()
    : next(new ElectionError(403, "Chỉ quản trị viên được thực hiện."));
const run =
  (work: (req: AuthenticatedRequest, res: Response) => Promise<unknown>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    void work(req, res).catch(next);
  };
async function rows(
  c: PoolConnection,
  sql: string,
  args: any[] = [],
): Promise<Row[]> {
  const [result] = await c.execute<Row[]>(sql, args);
  return result;
}
async function lockElection(c: PoolConnection, electionId: number) {
  const [e] = await rows(c, "SELECT * FROM elections WHERE id = ? FOR UPDATE", [
    electionId,
  ]);
  if (!e) fail(404, "Không tìm thấy kỳ bầu chọn.");
  e.rules = parse<Rules>(e.rules);
  return e;
}
async function audit(
  c: PoolConnection,
  electionId: number,
  actorId: number | null,
  action: string,
  details: unknown,
) {
  await c.execute(
    "INSERT INTO election_audit (election_id, actor_id, action, details) VALUES (?, ?, ?, ?)",
    [electionId, actorId, action, JSON.stringify(details)],
  );
}
async function notify(c: PoolConnection, userId: number, message: string) {
  await c.execute("INSERT INTO notifications (user_id, text) VALUES (?, ?)", [
    userId,
    message,
  ]);
}
async function member(c: PoolConnection, userId: number) {
  const [u] = await rows(
    c,
    `SELECT u.*, EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN ('moderator','admin')) AS staff,
 EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role='moderator' AND NOT EXISTS
  (SELECT 1 FROM election_candidates ec WHERE ec.user_id=u.id AND ec.decision='appointed' AND ec.ended_at IS NULL AND ec.term_ends_at<=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000)) AS moderator FROM users u WHERE u.id=?`,
    [userId],
  );
  if (!u) fail(404, "Không tìm thấy thành viên.");
  return u;
}
function eligibility(
  u: Row,
  rules: Rules,
  candidate: boolean,
  at = Date.now(),
): string[] {
  const reasons: string[] = [];
  if (u.status !== "active") reasons.push("Tài khoản đang bị khóa");
  if (rules.requireVerifiedEmail && !u.email)
    reasons.push("Cần email đã xác thực");
  const days = candidate ? rules.candidateAgeDays : rules.voterAgeDays;
  if (new Date(u.date_joined).getTime() > at - days * DAY)
    reasons.push(`Tài khoản cần đủ ${days} ngày`);
  if (candidate && Number(u.staff))
    reasons.push("Ứng viên phải chưa giữ quyền mod hoặc admin");
  return reasons;
}
function config(body: any) {
  const rules: Rules = { ...defaults, ...body.rules };
  for (const [key, min, max] of [
    ["seats", 1, 20],
    ["maxChoices", 1, 20],
    ["voterAgeDays", 0, 3650],
    ["candidateAgeDays", 0, 3650],
    ["minCommunityVotes", 0, 1000000],
    ["minReviewers", 1, 100],
    ["reviewApprovalPercent", 1, 100],
    ["probationDays", 1, 365],
    ["termDays", 1, 3650],
  ] as const) {
    if (
      !Number.isSafeInteger(rules[key]) ||
      rules[key] < min ||
      rules[key] > max
    )
      fail(400, `Thể lệ ${key} không hợp lệ.`);
  }
  if (
    rules.maxChoices > rules.seats ||
    rules.probationDays > rules.termDays ||
    typeof rules.requireVerifiedEmail !== "boolean"
  )
    fail(400, "Số lựa chọn không vượt số ghế; thử việc không vượt nhiệm kỳ.");
  rules.scenario = str(rules.scenario, 20, 2000, "Tình huống");
  // Reject arbitrary rule fields so the frozen policy has a single well-defined schema.
  for (const key of Object.keys(rules))
    if (!Object.hasOwn(defaults, key))
      fail(400, "Thể lệ có trường không được hỗ trợ.");
  const nomination = Number(body.nominationClosesAt),
    voting = Number(body.votingClosesAt);
  if (
    !Number.isSafeInteger(nomination) ||
    !Number.isSafeInteger(voting) ||
    nomination <= Date.now() ||
    voting <= nomination ||
    voting > Date.now() + 366 * DAY
  )
    fail(
      400,
      "Hạn ứng cử phải ở tương lai; hạn bỏ phiếu phải sau hạn ứng cử và trong một năm.",
    );
  return {
    title: str(body.title, 5, 160, "Tên kỳ"),
    description: str(body.description, 20, 10000, "Thể lệ công khai"),
    rules,
    nomination,
    voting,
  };
}

// All writes serialize on the election row: a ballot cannot race its closing snapshot or an appointment.
async function write(
  req: AuthenticatedRequest,
  work: (c: PoolConnection, e: Row) => Promise<unknown>,
) {
  return db.transaction(async (c) => {
    const e = await lockElection(c, id(req.params.id));
    // Authenticate again under the same transaction; a stale staff claim never authorizes a write.
    const u = await member(c, req.user!.id);
    if (u.status !== "active") fail(403, "Tài khoản không còn hoạt động.");
    const roles = await rows(c, "SELECT role FROM user_roles WHERE user_id=?", [
      u.id,
    ]);
    req.user!.roles = roles
      .map((r) => r.role)
      .filter((role) => role !== "moderator" || Number(u.moderator));
    return work(c, e);
  });
}
function votingOpen(e: Row) {
  if (e.status !== "voting" || Date.now() >= Number(e.voting_closes_at))
    fail(409, "Đã hết thời gian bỏ phiếu hoặc kỳ chưa mở bỏ phiếu.");
}

// Counts are recomputed from authoritative membership, not client supplied totals.
async function tally(c: PoolConnection, e: Row) {
  const rules = e.rules as Rules;
  const candidates = await rows(
    c,
    `SELECT c.id, c.user_id AS userId, c.status, u.username, u.displayname,
  u.status AS accountStatus, u.email, EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role IN ('moderator','admin')) AS staff
  FROM election_candidates c JOIN users u ON u.id=c.user_id WHERE c.election_id=? AND c.status NOT IN ('invited','withdrawn') ORDER BY c.id`,
    [e.id],
  );
  const votes = await rows(
    c,
    `SELECT b.candidate_id, b.voter_id, v.can_vote, u.status, u.email FROM election_ballots b
  JOIN election_voters v ON v.election_id=b.election_id AND v.user_id=b.voter_id JOIN users u ON u.id=b.voter_id WHERE b.election_id=?`,
    [e.id],
  );
  const reviews = await rows(
    c,
    `SELECT r.candidate_id, r.reviewer_id, r.verdict, v.can_review, u.status,
  EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role='moderator' AND NOT EXISTS
   (SELECT 1 FROM election_candidates ec WHERE ec.user_id=u.id AND ec.decision='appointed' AND ec.ended_at IS NULL AND ec.term_ends_at<=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000)) AS moderator
  FROM election_reviews r JOIN election_voters v ON v.election_id=r.election_id AND v.user_id=r.reviewer_id
  JOIN users u ON u.id=r.reviewer_id WHERE r.election_id=?`,
    [e.id],
  );
  const validPublic = (b: Row) =>
    !!Number(b.can_vote) &&
    b.status === "active" &&
    (!rules.requireVerifiedEmail || !!b.email);
  const validMod = (r: Row) =>
    !!Number(r.can_review) && r.status === "active" && !!Number(r.moderator);
  const result = candidates
    .map((candidate) => {
      const usable =
        candidate.status === "eligible" &&
        candidate.accountStatus === "active" &&
        !Number(candidate.staff) &&
        (!rules.requireVerifiedEmail || !!candidate.email);
      const publicBallots = votes.filter(
        (v) => v.candidate_id === candidate.id,
      );
      const validVotes = publicBallots.filter(
        (v) => usable && v.voter_id !== candidate.userId && validPublic(v),
      );
      const rs = reviews.filter((r) => r.candidate_id === candidate.id);
      const valid = rs.filter(
        (r) => usable && r.reviewer_id !== candidate.userId && validMod(r),
      );
      const pass = valid.filter((r) => r.verdict === "pass").length,
        reject = valid.filter((r) => r.verdict === "fail").length;
      const abstain = valid.filter((r) => r.verdict === "abstain").length;
      const participation = pass + reject;
      const approvalPercent = participation
        ? Math.round((pass * 10000) / participation) / 100
        : 0;
      const quorumMet = participation >= rules.minReviewers;
      return {
        id: candidate.id,
        userId: candidate.userId,
        username: candidate.username,
        displayname: candidate.displayname,
        eligible: usable,
        votes: validVotes.length,
        invalidVotes: publicBallots.length - validVotes.length,
        modPass: pass,
        modFail: reject,
        modAbstain: abstain,
        invalidReviews: rs.length - valid.length,
        participation,
        approvalPercent,
        quorumMet,
        recommended:
          usable &&
          quorumMet &&
          validVotes.length >= rules.minCommunityVotes &&
          pass * 100 >= participation * rules.reviewApprovalPercent,
      };
    })
    .sort(
      (a, b) =>
        b.votes - a.votes ||
        b.approvalPercent - a.approvalPercent ||
        a.id - b.id,
    );
  let previous = -1,
    rank = 0;
  result.forEach((r, index) => {
    if (r.votes !== previous) rank = index + 1;
    Object.assign(r, { rank });
    previous = r.votes;
  });
  const [voters] = await rows(
    c,
    "SELECT SUM(can_vote) AS electorate, SUM(can_review) AS panel FROM election_voters WHERE election_id=?",
    [e.id],
  );
  return {
    closedAt: Date.now(),
    electorate: Number(voters?.electorate || 0),
    panel: Number(voters?.panel || 0),
    turnout: new Set(
      votes
        .filter(
          (v) =>
            validPublic(v) &&
            result.some(
              (r) =>
                r.id === v.candidate_id &&
                r.eligible &&
                r.userId !== v.voter_id,
            ),
        )
        .map((v) => v.voter_id),
    ).size,
    candidates: result,
  };
}

router.get("/defaults", (_req, res) => res.json(defaults));
router.get(
  "/",
  optionalAuthentication,
  run(async (req, res) => {
    const limit = 20,
      page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
    const list = await db.query<
      Row[]
    >(`SELECT id, title, description, rules, status, nomination_closes_at AS nominationClosesAt,
 voting_closes_at AS votingClosesAt FROM elections ${isAdmin(req) ? "" : "WHERE status <> 'draft'"} ORDER BY id DESC LIMIT ${limit} OFFSET ${Math.floor(page - 1) * limit}`);
    res.json({
      elections: list.map((e) => ({ ...e, rules: parse(e.rules) })),
      nextPage: list.length === limit ? page + 1 : null,
    });
  }),
);
router.get(
  "/:id",
  optionalAuthentication,
  run(async (req, res) => {
    // A consistent read prevents mixing live ballots with a just-published result.
    const result = await db.transaction(async (c) => {
      const [e] = await rows(c, "SELECT * FROM elections WHERE id=?", [
        id(req.params.id),
      ]);
      if (!e || (e.status === "draft" && !isAdmin(req)))
        fail(404, "Không tìm thấy kỳ bầu chọn.");
      const rules = parse<Rules>(e.rules),
        staff = isStaff(req),
        uid = req.user?.id || 0;
      const list = await rows(
        c,
        `SELECT c.*, u.username, u.displayname, u.avatar_seed FROM election_candidates c JOIN users u ON u.id=c.user_id
   WHERE c.election_id=? AND (c.status <> 'invited' OR c.user_id=? OR ?=1) ORDER BY c.id`,
        [e.id, uid, staff],
      );
      let snapshot = e.result_snapshot ? parse<any>(e.result_snapshot) : null;
      const showResult =
        e.status === "completed" ||
        ((e.status === "review" || e.status === "cancelled") && staff);
      if (!showResult) snapshot = null;
      const myBallot = uid
        ? await rows(
            c,
            "SELECT candidate_id FROM election_ballots WHERE election_id=? AND voter_id=?",
            [e.id, uid],
          )
        : [];
      const myReviews = uid
        ? await rows(
            c,
            "SELECT candidate_id AS candidateId, verdict, criteria, comment FROM election_reviews WHERE election_id=? AND reviewer_id=?",
            [e.id, uid],
          )
        : [];
      const [voter] = uid
        ? await rows(
            c,
            "SELECT can_vote, can_review FROM election_voters WHERE election_id=? AND user_id=?",
            [e.id, uid],
          )
        : [];
      const current = uid ? await member(c, uid) : null;
      const complaints = uid
        ? await rows(
            c,
            `SELECT id, user_id AS userId, message, status, resolution FROM election_complaints WHERE election_id=? ${isAdmin(req) ? "" : "AND user_id=?"} ORDER BY id DESC LIMIT 100`,
            isAdmin(req) ? [e.id] : [e.id, uid],
          )
        : [];
      const candidates = list.map((candidate) => {
        const internal = isAdmin(req),
          own = candidate.user_id === uid;
        const publicDecision = e.status === "completed" || internal || own;
        return {
          id: candidate.id,
          userId: candidate.user_id,
          username: candidate.username,
          displayname: candidate.displayname,
          status: candidate.status,
          motivation: candidate.motivation,
          experience: candidate.experience,
          availability: candidate.availability,
          scenarioAnswer: candidate.scenario_answer,
          decision: publicDecision ? candidate.decision : "pending",
          publicReason: publicDecision ? candidate.public_reason : null,
          supplement: own || staff ? candidate.supplement : null,
          verificationReason:
            own || staff ? candidate.verification_reason : null,
          internalNote: internal ? candidate.internal_note : null,
          overrideReason: internal ? candidate.override_reason : null,
          probationEndsAt: publicDecision ? candidate.probation_ends_at : null,
          termEndsAt: publicDecision ? candidate.term_ends_at : null,
          confirmedAt: publicDecision ? candidate.confirmed_at : null,
          endedAt: publicDecision ? candidate.ended_at : null,
          endReason: publicDecision ? candidate.end_reason : null,
          result:
            snapshot?.candidates.find((r: any) => r.id === candidate.id) ||
            null,
        };
      });
      const reviewDetail = isAdmin(req)
        ? await rows(
            c,
            `SELECT r.candidate_id AS candidateId, u.username, r.verdict, r.criteria, r.comment
   FROM election_reviews r JOIN users u ON u.id=r.reviewer_id WHERE r.election_id=?`,
            [e.id],
          )
        : [];
      const auditLog = isAdmin(req)
        ? await rows(
            c,
            `SELECT a.id, a.actor_id AS actorId, a.action, a.details, a.created_at AS createdAt,
   u.username FROM election_audit a LEFT JOIN users u ON u.id=a.actor_id WHERE a.election_id=? ORDER BY a.id DESC LIMIT 150`,
            [e.id],
          )
        : [];
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        rules,
        status: e.status,
        nominationClosesAt: e.nomination_closes_at,
        votingClosesAt: e.voting_closes_at,
        candidates,
        snapshot,
        myBallot: myBallot.map((b) => b.candidate_id),
        myReviews: myReviews.map((r) => ({
          ...r,
          criteria: parse(r.criteria),
        })),
        canVote:
          !!Number(voter?.can_vote) &&
          !!current &&
          !eligibility(current, rules, false).length,
        canReview: !!Number(voter?.can_review) && !!current?.moderator,
        applicationIssues: current
          ? eligibility(current, rules, true)
          : ["Cần đăng nhập để ứng cử"],
        complaints,
        reviewDetail: reviewDetail.map((r) => ({
          ...r,
          criteria: parse(r.criteria),
        })),
        audit: auditLog.map((a) => ({ ...a, details: parse(a.details) })),
      };
    });
    res.set("Cache-Control", "private, no-store").json(result);
  }),
);
router.use(authenticateToken);

router.post(
  "/",
  admin,
  run(async (req, res) => {
    const cfg = config(req.body);
    const electionId = await db.transaction(async (c) => {
      const [r]: any = await c.execute(
        "INSERT INTO elections (title,description,rules,nomination_closes_at,voting_closes_at,created_by) VALUES (?,?,?,?,?,?)",
        [
          cfg.title,
          cfg.description,
          JSON.stringify(cfg.rules),
          cfg.nomination,
          cfg.voting,
          req.user!.id,
        ],
      );
      await audit(c, r.insertId, req.user!.id, "created", cfg);
      return r.insertId;
    });
    res.status(201).json({ id: electionId });
  }),
);
router.put(
  "/:id",
  admin,
  run(async (req, res) => {
    const cfg = config(req.body);
    await write(req, async (c, e) => {
      if (!isAdmin(req)) fail(403, "Cần quyền admin hiện hành.");
      if (e.status !== "draft")
        fail(409, "Thể lệ đã khóa; chỉ sửa được bản nháp.");
      await c.execute(
        "UPDATE elections SET title=?,description=?,rules=?,nomination_closes_at=?,voting_closes_at=? WHERE id=?",
        [
          cfg.title,
          cfg.description,
          JSON.stringify(cfg.rules),
          cfg.nomination,
          cfg.voting,
          e.id,
        ],
      );
      await audit(c, e.id, req.user!.id, "draft_updated", cfg);
    });
    res.json({ success: true });
  }),
);

router.post(
  "/:id/transition",
  admin,
  run(async (req, res) => {
    await write(req, async (c, e) => {
      if (!isAdmin(req)) fail(403, "Cần quyền admin hiện hành.");
      const action = req.body.action,
        now = Date.now();
      if (action === "open" && e.status === "draft") {
        if (now >= Number(e.nomination_closes_at))
          fail(409, "Hạn ứng cử đã qua; sửa lịch của bản nháp.");
        await c.execute(
          "UPDATE elections SET status='nominations' WHERE id=?",
          [e.id],
        );
      } else if (action === "vote" && e.status === "nominations") {
        if (
          now < Number(e.nomination_closes_at) ||
          now >= Number(e.voting_closes_at)
        )
          fail(409, "Chỉ mở bỏ phiếu sau hạn ứng cử và trước hạn bỏ phiếu.");
        const pending = await rows(
          c,
          "SELECT id FROM election_candidates WHERE election_id=? AND status='submitted'",
          [e.id],
        );
        if (pending.length)
          fail(409, "Cần kiểm tra tất cả hồ sơ đã nộp trước khi mở bỏ phiếu.");
        // Freeze eligible electorate and moderator panel. Later registrations cannot enter this election.
        const r = e.rules as Rules;
        await c.execute(
          `INSERT INTO election_voters (election_id,user_id,can_vote,can_review)
    SELECT ?,u.id, (u.date_joined <= FROM_UNIXTIME(?/1000) AND (?=0 OR u.email IS NOT NULL AND u.email<>'')),
    EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role='moderator' AND NOT EXISTS
     (SELECT 1 FROM election_candidates ec WHERE ec.user_id=u.id AND ec.decision='appointed' AND ec.ended_at IS NULL AND ec.term_ends_at<=UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000))
    FROM users u WHERE u.status='active'`,
          [e.id, now - r.voterAgeDays * DAY, r.requireVerifiedEmail],
        );
        await c.execute("UPDATE elections SET status='voting' WHERE id=?", [
          e.id,
        ]);
      } else if (action === "close" && e.status === "voting") {
        if (now < Number(e.voting_closes_at))
          fail(409, "Chưa đến hạn đóng phiếu.");
        const snapshot = await tally(c, e);
        await c.execute(
          "UPDATE elections SET status='review',result_snapshot=? WHERE id=?",
          [JSON.stringify(snapshot), e.id],
        );
        await audit(c, e.id, req.user!.id, "tallied", snapshot);
      } else if (action === "publish" && e.status === "review") {
        const open = await rows(
          c,
          "SELECT id FROM election_complaints WHERE election_id=? AND status='open'",
          [e.id],
        );
        const undecided = await rows(
          c,
          "SELECT id FROM election_candidates WHERE election_id=? AND status IN ('submitted','eligible','ineligible') AND decision IN ('pending','needs_info')",
          [e.id],
        );
        if (open.length || undecided.length)
          fail(
            409,
            "Cần giải quyết khiếu nại và quyết định toàn bộ hồ sơ trước khi công bố.",
          );
        await c.execute(
          "UPDATE elections SET status='completed',published_at=CURRENT_TIMESTAMP WHERE id=?",
          [e.id],
        );
      } else if (
        action === "cancel" &&
        ["draft", "nominations", "voting", "review"].includes(e.status)
      ) {
        const decided = await rows(
          c,
          "SELECT id FROM election_candidates WHERE election_id=? AND decision='appointed'",
          [e.id],
        );
        if (decided.length)
          fail(
            409,
            "Kỳ đã có bổ nhiệm; cần hoàn tất công bố và quản lý nhiệm kỳ.",
          );
        const reason = str(req.body.reason, 10, 2000, "Lý do hủy");
        await c.execute(
          "UPDATE elections SET status='cancelled',description=CONCAT(description,'\n\nLý do hủy: ',?) WHERE id=?",
          [reason, e.id],
        );
      } else fail(409, "Chuyển trạng thái không hợp lệ.");
      await audit(c, e.id, req.user!.id, "transition", {
        from: e.status,
        action,
        reason: req.body.reason || null,
      });
    });
    res.json({ success: true });
  }),
);

router.post(
  "/:id/candidates",
  run(async (req, res) => {
    const result = await write(req, async (c, e) => {
      if (
        e.status !== "nominations" ||
        Date.now() >= Number(e.nomination_closes_at)
      )
        fail(409, "Đã đóng nhận hồ sơ.");
      const username = req.body.nomineeUsername;
      const [nominee] = username
        ? await rows(c, "SELECT id FROM users WHERE username=?", [
            str(username, 1, 50, "Tên tài khoản"),
          ])
        : [{ id: req.user!.id }];
      if (!nominee) fail(404, "Không tìm thấy người được đề cử.");
      const user = await member(c, nominee.id),
        issues = eligibility(user, e.rules, true);
      if (issues.length) fail(400, issues.join(". "));
      const existing = await rows(
        c,
        "SELECT id FROM election_candidates WHERE election_id=? AND user_id=?",
        [e.id, user.id],
      );
      if (existing.length)
        fail(409, "Thành viên đã có hồ sơ hoặc lời mời trong kỳ này.");
      const own = user.id === req.user!.id;
      const motivation = own
        ? str(req.body.motivation, 30, 3000, "Lý do ứng cử")
        : "";
      const experience = own
        ? str(req.body.experience, 10, 2000, "Kinh nghiệm")
        : "";
      const availability = own
        ? str(req.body.availability, 5, 280, "Thời gian tham gia")
        : "";
      const answer = own
        ? str(req.body.scenarioAnswer, 30, 4000, "Xử lý tình huống")
        : "";
      const [r]: any = await c.execute(
        `INSERT INTO election_candidates (election_id,user_id,nominated_by,status,motivation,experience,availability,scenario_answer) VALUES (?,?,?,?,?,?,?,?)`,
        [
          e.id,
          user.id,
          req.user!.id,
          own ? "submitted" : "invited",
          motivation,
          experience,
          availability,
          answer,
        ],
      );
      await audit(c, e.id, req.user!.id, own ? "applied" : "nominated", {
        candidateId: r.insertId,
        userId: user.id,
      });
      if (!own)
        await notify(
          c,
          user.id,
          `Bạn được đề cử làm mod trong kỳ “${e.title}”. Mở Bầu chọn mod để đồng ý và hoàn thiện hồ sơ trước hạn.`,
        );
      return { id: r.insertId };
    });
    res.status(201).json(result);
  }),
);
router.put(
  "/:id/candidates/:candidateId",
  run(async (req, res) => {
    await write(req, async (c, e) => {
      const [candidate] = await rows(
        c,
        "SELECT * FROM election_candidates WHERE id=? AND election_id=?",
        [id(req.params.candidateId), e.id],
      );
      if (!candidate || candidate.user_id !== req.user!.id)
        fail(403, "Chỉ chủ hồ sơ được cập nhật.");
      if (req.body.action === "withdraw") {
        if (
          !["nominations", "voting"].includes(e.status) ||
          ["withdrawn", "ineligible"].includes(candidate.status)
        )
          fail(409, "Không thể rút hồ sơ ở giai đoạn này.");
        await c.execute(
          "UPDATE election_candidates SET status='withdrawn' WHERE id=?",
          [candidate.id],
        );
      } else if (req.body.action === "supplement") {
        if (e.status !== "review" || candidate.decision !== "needs_info")
          fail(409, "Hồ sơ không có yêu cầu bổ sung.");
        const supplement = str(
          req.body.supplement,
          20,
          4000,
          "Giải trình bổ sung",
        );
        await c.execute(
          "UPDATE election_candidates SET supplement=?,decision='pending' WHERE id=?",
          [supplement, candidate.id],
        );
      } else {
        if (
          e.status !== "nominations" ||
          Date.now() >= Number(e.nomination_closes_at) ||
          !["invited", "submitted", "eligible"].includes(candidate.status)
        )
          fail(409, "Đã khóa hồ sơ ứng cử.");
        const issues = eligibility(
          await member(c, req.user!.id),
          e.rules,
          true,
        );
        if (issues.length) fail(400, issues.join(". "));
        await c.execute(
          "UPDATE election_candidates SET motivation=?,experience=?,availability=?,scenario_answer=?,status='submitted',verification_reason=NULL WHERE id=?",
          [
            str(req.body.motivation, 30, 3000, "Lý do ứng cử"),
            str(req.body.experience, 10, 2000, "Kinh nghiệm"),
            str(req.body.availability, 5, 280, "Thời gian tham gia"),
            str(req.body.scenarioAnswer, 30, 4000, "Xử lý tình huống"),
            candidate.id,
          ],
        );
      }
      await audit(c, e.id, req.user!.id, "candidate_updated", {
        candidateId: candidate.id,
        action: req.body.action || "submit",
      });
    });
    res.json({ success: true });
  }),
);
router.post(
  "/:id/candidates/:candidateId/verify",
  admin,
  run(async (req, res) => {
    await write(req, async (c, e) => {
      if (!isAdmin(req)) fail(403, "Cần quyền admin hiện hành.");
      if (e.status !== "nominations")
        fail(409, "Chỉ kiểm tra hồ sơ trước vòng bỏ phiếu.");
      const [candidate] = await rows(
        c,
        "SELECT * FROM election_candidates WHERE election_id=? AND id=?",
        [e.id, id(req.params.candidateId)],
      );
      if (
        !candidate ||
        !["submitted", "eligible", "ineligible"].includes(candidate.status)
      )
        fail(409, "Hồ sơ chưa được ứng viên đồng ý hoặc đã rút.");
      if (typeof req.body.eligible !== "boolean")
        fail(400, "Cần chọn kết quả kiểm tra hồ sơ.");
      const reason = str(req.body.reason, 10, 2000, "Nhận xét kiểm tra");
      if (req.body.eligible) {
        const issues = eligibility(
          await member(c, candidate.user_id),
          e.rules,
          true,
        );
        if (issues.length) fail(400, issues.join(". "));
      }
      await c.execute(
        "UPDATE election_candidates SET status=?,verification_reason=? WHERE id=?",
        [req.body.eligible ? "eligible" : "ineligible", reason, candidate.id],
      );
      await audit(c, e.id, req.user!.id, "candidate_verified", {
        candidateId: candidate.id,
        eligible: req.body.eligible,
        reason,
      });
      await notify(
        c,
        candidate.user_id,
        `Hồ sơ bầu mod “${e.title}”: ${req.body.eligible ? "đủ" : "chưa đủ"} điều kiện. ${reason}`,
      );
    });
    res.json({ success: true });
  }),
);

router.put(
  "/:id/ballot",
  run(async (req, res) => {
    const ids = req.body.candidateIds;
    if (
      !Array.isArray(ids) ||
      ids.some((x) => !Number.isSafeInteger(x) || x < 1) ||
      new Set(ids).size !== ids.length
    )
      fail(400, "Danh sách lựa chọn không hợp lệ.");
    await write(req, async (c, e) => {
      votingOpen(e);
      const [v] = await rows(
        c,
        "SELECT can_vote FROM election_voters WHERE election_id=? AND user_id=?",
        [e.id, req.user!.id],
      );
      const issues = eligibility(await member(c, req.user!.id), e.rules, false);
      if (!Number(v?.can_vote) || issues.length)
        fail(
          403,
          "Bạn không thuộc danh sách cử tri hợp lệ đã chốt khi mở phiếu.",
        );
      if (ids.length > e.rules.maxChoices)
        fail(400, `Chỉ được chọn tối đa ${e.rules.maxChoices} ứng viên.`);
      for (const candidateId of ids) {
        const [candidate] = await rows(
          c,
          "SELECT user_id FROM election_candidates WHERE election_id=? AND id=? AND status='eligible'",
          [e.id, candidateId],
        );
        if (!candidate || candidate.user_id === req.user!.id)
          fail(400, "Ứng viên không hợp lệ hoặc là chính bạn.");
        if (
          eligibility(await member(c, candidate.user_id), e.rules, true).length
        )
          fail(400, "Ứng viên không còn đủ điều kiện.");
      }
      await c.execute(
        "DELETE FROM election_ballots WHERE election_id=? AND voter_id=?",
        [e.id, req.user!.id],
      );
      for (const candidateId of ids)
        await c.execute(
          "INSERT INTO election_ballots (election_id,voter_id,candidate_id) VALUES (?,?,?)",
          [e.id, req.user!.id, candidateId],
        );
      await audit(c, e.id, req.user!.id, "ballot_saved", { candidateIds: ids });
    });
    res.json({ success: true });
  }),
);
router.put(
  "/:id/candidates/:candidateId/review",
  run(async (req, res) => {
    if (!["pass", "fail", "abstain"].includes(req.body.verdict))
      fail(400, "Kết quả đánh giá không hợp lệ.");
    const comment = str(req.body.comment, 10, 3000, "Nhận xét hội đồng");
    const criteria = req.body.criteria;
    if (
      !criteria ||
      ["rules", "fairness", "evidence"].some(
        (key) => typeof criteria[key] !== "boolean",
      )
    )
      fail(400, "Cần đánh giá đủ ba tiêu chí.");
    await write(req, async (c, e) => {
      votingOpen(e);
      if (!req.user!.roles.includes("moderator"))
        fail(403, "Chỉ mod hiện hành thuộc hội đồng được đánh giá.");
      const [v] = await rows(
        c,
        "SELECT can_review FROM election_voters WHERE election_id=? AND user_id=?",
        [e.id, req.user!.id],
      );
      const [candidate] = await rows(
        c,
        "SELECT user_id FROM election_candidates WHERE election_id=? AND id=? AND status='eligible'",
        [e.id, id(req.params.candidateId)],
      );
      if (
        !Number(v?.can_review) ||
        !candidate ||
        candidate.user_id === req.user!.id
      )
        fail(403, "Không thuộc hội đồng hoặc có xung đột tự đánh giá.");
      await c.execute(
        `INSERT INTO election_reviews (election_id,candidate_id,reviewer_id,verdict,criteria,comment) VALUES (?,?,?,?,?,?)
   ON DUPLICATE KEY UPDATE verdict=VALUES(verdict),criteria=VALUES(criteria),comment=VALUES(comment)`,
        [
          e.id,
          id(req.params.candidateId),
          req.user!.id,
          req.body.verdict,
          JSON.stringify({
            rules: criteria.rules,
            fairness: criteria.fairness,
            evidence: criteria.evidence,
          }),
          comment,
        ],
      );
      await audit(c, e.id, req.user!.id, "review_saved", {
        candidateId: id(req.params.candidateId),
        verdict: req.body.verdict,
      });
    });
    res.json({ success: true });
  }),
);

router.post(
  "/:id/candidates/:candidateId/decision",
  admin,
  run(async (req, res) => {
    const action = req.body.action;
    if (!["appoint", "reject", "request_info"].includes(action))
      fail(400, "Quyết định không hợp lệ.");
    const reason = str(req.body.reason, 20, 3000, "Lý do công khai");
    const note = req.body.internalNote
      ? str(req.body.internalNote, 1, 3000, "Ghi chú nội bộ")
      : "";
    await write(req, async (c, e) => {
      if (!isAdmin(req)) fail(403, "Cần quyền admin hiện hành.");
      if (e.status !== "review")
        fail(409, "Cần chốt kết quả bỏ phiếu trước khi ra quyết định.");
      const [candidate] = await rows(
        c,
        "SELECT * FROM election_candidates WHERE election_id=? AND id=?",
        [e.id, id(req.params.candidateId)],
      );
      if (!candidate || !["eligible", "ineligible"].includes(candidate.status))
        fail(409, "Hồ sơ không thuộc diện ra quyết định.");
      if (["appointed", "rejected"].includes(candidate.decision))
        fail(409, "Hồ sơ đã có quyết định cuối cùng.");
      if (action === "appoint") {
        if (candidate.user_id === req.user!.id)
          fail(403, "Không được tự bổ nhiệm.");
        const open = await rows(
          c,
          "SELECT id FROM election_complaints WHERE election_id=? AND status='open'",
          [e.id],
        );
        if (open.length)
          fail(409, "Cần giải quyết khiếu nại trước khi bổ nhiệm.");
        const u = await member(c, candidate.user_id),
          issues = eligibility(u, e.rules, true);
        if (issues.length || candidate.status !== "eligible")
          fail(409, "Ứng viên không còn đủ điều kiện: " + issues.join(". "));
        const appointed = await rows(
          c,
          "SELECT id FROM election_candidates WHERE election_id=? AND decision='appointed'",
          [e.id],
        );
        if (appointed.length >= e.rules.seats)
          fail(409, "Đã đủ số ghế được phép bổ nhiệm.");
        const snapshot = parse<any>(e.result_snapshot),
          result = snapshot.candidates.find((r: any) => r.id === candidate.id);
        const above = snapshot.candidates.filter(
          (r: any) => r.eligible && r.votes > result.votes,
        ).length;
        const exception = !result?.recommended || above >= e.rules.seats;
        const override = exception
          ? str(
              req.body.overrideReason,
              30,
              3000,
              "Giải trình quyết định khác đề xuất/kết quả cộng đồng",
            )
          : "";
        // Lock the user to serialize appointments across different elections and manual role changes.
        const [lockedUser] = await rows(
          c,
          "SELECT status FROM users WHERE id=? FOR UPDATE",
          [candidate.user_id],
        );
        if (lockedUser.status !== "active")
          fail(409, "Ứng viên vừa bị khóa tài khoản.");
        const active = await rows(
          c,
          "SELECT role FROM user_roles WHERE user_id=? AND role IN ('admin','moderator') FOR UPDATE",
          [candidate.user_id],
        );
        if (active.length)
          fail(409, "Ứng viên đã được cấp quyền ở thao tác khác.");
        await c.execute(
          "INSERT INTO user_roles (user_id,role) VALUES (?,'moderator')",
          [candidate.user_id],
        );
        await c.execute(
          `UPDATE election_candidates SET decision='appointed',public_reason=?,internal_note=?,override_reason=?,decided_by=?,probation_ends_at=?,term_ends_at=? WHERE id=?`,
          [
            reason,
            note,
            override,
            req.user!.id,
            Date.now() + e.rules.probationDays * DAY,
            Date.now() + e.rules.termDays * DAY,
            candidate.id,
          ],
        );
      } else {
        await c.execute(
          "UPDATE election_candidates SET decision=?,public_reason=?,internal_note=?,decided_by=? WHERE id=?",
          [
            action === "reject" ? "rejected" : "needs_info",
            reason,
            note,
            req.user!.id,
            candidate.id,
          ],
        );
      }
      await audit(c, e.id, req.user!.id, "decision", {
        candidateId: candidate.id,
        action,
        reason,
        internalNote: note,
        overrideReason: req.body.overrideReason || null,
      });
      await notify(
        c,
        candidate.user_id,
        `Kết quả hồ sơ mod “${e.title}”: ${action === "appoint" ? "được bổ nhiệm" : action === "reject" ? "không bổ nhiệm" : "cần bổ sung"}. ${reason}`,
      );
    });
    res.json({ success: true });
  }),
);

router.post(
  "/:id/complaints",
  run(async (req, res) => {
    const message = str(req.body.message, 20, 3000, "Nội dung khiếu nại");
    await write(req, async (c, e) => {
      if (!["nominations", "voting", "review"].includes(e.status))
        fail(409, "Kỳ không còn nhận khiếu nại.");
      const recent = await rows(
        c,
        "SELECT id FROM election_complaints WHERE election_id=? AND user_id=? AND status='open'",
        [e.id, req.user!.id],
      );
      if (recent.length)
        fail(409, "Bạn có khiếu nại đang chờ xử lý trong kỳ này.");
      const [r]: any = await c.execute(
        "INSERT INTO election_complaints (election_id,user_id,message) VALUES (?,?,?)",
        [e.id, req.user!.id, message],
      );
      await audit(c, e.id, req.user!.id, "complaint_opened", {
        complaintId: r.insertId,
      });
    });
    res.status(201).json({ success: true });
  }),
);
router.post(
  "/:id/complaints/:complaintId/resolve",
  admin,
  run(async (req, res) => {
    const resolution = str(req.body.resolution, 20, 3000, "Kết quả xử lý");
    await write(req, async (c, e) => {
      if (!isAdmin(req)) fail(403, "Cần quyền admin hiện hành.");
      const [r]: any = await c.execute(
        "UPDATE election_complaints SET status='resolved',resolution=?,resolved_by=? WHERE id=? AND election_id=? AND status='open'",
        [resolution, req.user!.id, id(req.params.complaintId), e.id],
      );
      if (!r.affectedRows) fail(409, "Khiếu nại đã xử lý hoặc không tồn tại.");
      await audit(c, e.id, req.user!.id, "complaint_resolved", {
        complaintId: id(req.params.complaintId),
        resolution,
      });
    });
    res.json({ success: true });
  }),
);
router.post(
  "/:id/candidates/:candidateId/tenure",
  admin,
  run(async (req, res) => {
    const reason = str(req.body.reason, 20, 3000, "Lý do đánh giá nhiệm kỳ");
    if (!["confirm", "revoke"].includes(req.body.action))
      fail(400, "Thao tác nhiệm kỳ không hợp lệ.");
    await write(req, async (c, e) => {
      if (!isAdmin(req)) fail(403, "Cần quyền admin hiện hành.");
      if (e.status !== "completed")
        fail(409, "Cần công bố kỳ bầu chọn trước khi đánh giá nhiệm kỳ.");
      let [candidate] = await rows(
        c,
        "SELECT * FROM election_candidates WHERE election_id=? AND id=? AND decision='appointed'",
        [e.id, id(req.params.candidateId)],
      );
      if (!candidate) fail(409, "Không có nhiệm kỳ còn hiệu lực.");
      await rows(c, "SELECT id FROM users WHERE id=? FOR UPDATE", [
        candidate.user_id,
      ]);
      [candidate] = await rows(
        c,
        "SELECT * FROM election_candidates WHERE id=? AND decision='appointed' FOR UPDATE",
        [candidate.id],
      );
      if (
        !candidate ||
        candidate.ended_at ||
        Number(candidate.term_ends_at) <= Date.now()
      )
        fail(409, "Không có nhiệm kỳ còn hiệu lực.");
      if (req.body.action === "confirm") {
        if (
          candidate.confirmed_at ||
          Date.now() < Number(candidate.probation_ends_at)
        )
          fail(409, "Chưa hết thử việc hoặc đã xác nhận.");
        await c.execute(
          "UPDATE election_candidates SET confirmed_at=? WHERE id=?",
          [Date.now(), candidate.id],
        );
      } else {
        await c.execute(
          "DELETE FROM user_roles WHERE user_id=? AND role='moderator'",
          [candidate.user_id],
        );
        await c.execute(
          "UPDATE election_candidates SET ended_at=?,end_reason=? WHERE id=?",
          [Date.now(), reason, candidate.id],
        );
      }
      await audit(c, e.id, req.user!.id, "tenure_" + req.body.action, {
        candidateId: candidate.id,
        reason,
      });
      await notify(c, candidate.user_id, `Nhiệm kỳ mod: ${reason}`);
    });
    res.json({ success: true });
  }),
);

// Run at startup and periodically. Expiration is also enforced during authentication.
export async function expireElectionTerms() {
  const due = await db.query<Row[]>(
    "SELECT DISTINCT election_id FROM election_candidates WHERE decision='appointed' AND term_ends_at<=? AND ended_at IS NULL",
    [Date.now()],
  );
  for (const item of due)
    await db.transaction(async (c) => {
      const e = await lockElection(c, item.election_id);
      const candidates = await rows(
        c,
        "SELECT id,user_id,term_ends_at FROM election_candidates WHERE election_id=? AND decision='appointed' AND term_ends_at<=? AND ended_at IS NULL",
        [e.id, Date.now()],
      );
      for (const candidate of candidates) {
        await rows(c, "SELECT id FROM users WHERE id=? FOR UPDATE", [
          candidate.user_id,
        ]);
        const [current] = await rows(
          c,
          "SELECT ended_at,term_ends_at FROM election_candidates WHERE id=? FOR UPDATE",
          [candidate.id],
        );
        if (
          !current ||
          current.ended_at ||
          Number(current.term_ends_at) > Date.now()
        )
          continue;
        await c.execute(
          "DELETE FROM user_roles WHERE user_id=? AND role='moderator'",
          [candidate.user_id],
        );
        await c.execute(
          "UPDATE election_candidates SET ended_at=?,end_reason='Đã hết nhiệm kỳ' WHERE id=?",
          [Date.now(), candidate.id],
        );
        await audit(c, e.id, null, "term_expired", {
          candidateId: candidate.id,
          termEndsAt: candidate.term_ends_at,
        });
        await notify(
          c,
          candidate.user_id,
          `Nhiệm kỳ mod của bạn trong “${e.title}” đã kết thúc.`,
        );
      }
    });
}
router.use(
  (
    error: unknown,
    _req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ) => {
    if (error instanceof ElectionError)
      return res.status(error.status).json({ error: error.message });
    console.error("Election operation failed", error);
    res
      .status(500)
      .json({ error: "Không thể xử lý bầu chọn. Vui lòng thử lại." });
  },
);
export default router;

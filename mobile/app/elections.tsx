import React, { useEffect, useState } from "react";
import { View } from "react-native";
import api from "@/services/api/client";
import { useAuth } from "@/context/AuthContext";
import {
  Button,
  Card,
  ErrorNotice,
  Field,
  Label,
  Row,
  Screen,
  Sheet,
  confirmAction,
  useResource,
  useTask,
} from "@/components/common/Screen";
import type {
  ElectionCandidate,
  ElectionDetail,
  ElectionRules,
  ElectionSummary,
} from "../../shared/elections";
import {
  candidateStatus,
  decisionStatus,
  electionStatus,
  ruleLabels,
} from "../../shared/elections";

type Editor = {
  kind: string;
  title: string;
  path: string;
  method: "post" | "put";
  fields: Record<string, string>;
  extra?: Record<string, unknown>;
};
const date = (value: number | null) =>
  value ? new Date(Number(value)).toLocaleString("vi-VN") : "—";
const local = (value: number) => {
  const d = new Date(value);
  return new Date(value - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
};
const labels: Record<string, string> = {
  title: "Tên kỳ",
  description: "Thể lệ công khai",
  nomination: "Hạn ứng cử (YYYY-MM-DD HH:mm, giờ máy)",
  voting: "Hạn bỏ phiếu (YYYY-MM-DD HH:mm, giờ máy)",
  motivation: "Lý do ứng cử (30–3000 ký tự)",
  experience: "Kinh nghiệm cộng đồng (10–2000 ký tự)",
  availability: "Thời gian có thể tham gia",
  scenarioAnswer: "Trả lời tình huống (30–4000 ký tự)",
  nomineeUsername: "Tên tài khoản được đề cử",
  comment: "Nhận xét hội đồng (10–3000 ký tự)",
  reason: "Lý do / nhận xét",
  internalNote: "Ghi chú nội bộ",
  overrideReason: "Giải trình khác đề xuất (tối thiểu 30 ký tự)",
  message: "Nội dung khiếu nại",
  resolution: "Kết quả xử lý",
  supplement: "Giải trình bổ sung",
  ...ruleLabels,
};

export default function ElectionsScreen() {
  const { user } = useAuth(),
    task = useTask(),
    admin = !!user?.roles.includes("admin");
  const [selected, setSelected] = useState<number | null>(null),
    [page, setPage] = useState(1),
    [editor, setEditor] = useState<Editor | null>(null);
  const [policy, setPolicy] = useState<ElectionRules | null>(null),
    [choices, setChoices] = useState<number[]>([]),
    [ballotTouched, setBallotTouched] = useState(false);
  const [verdict, setVerdict] = useState("abstain"),
    [criteria, setCriteria] = useState({
      rules: false,
      fairness: false,
      evidence: false,
    });
  const [, setClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setClock((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const resource = useResource(async () => {
    const [list, defaults] = await Promise.all([
      api.get<{ elections: ElectionSummary[]; nextPage: number | null }>(
        "/elections?page=" + page,
      ),
      api.get<ElectionRules>("/elections/defaults"),
    ]);
    const eid = selected || list.data.elections[0]?.id;
    return {
      list: list.data,
      defaults: defaults.data,
      detail: eid
        ? (await api.get<ElectionDetail>("/elections/" + eid)).data
        : null,
    };
  }, [selected, page, user?.id, user?.roles.join(",")]);
  const d = resource.data?.detail,
    disabled = task.busy || resource.loading || !!resource.error;
  const post = (path: string, body: unknown, method: "post" | "put" = "post") =>
    task.run(async () => {
      await api[method](path, body);
      setBallotTouched(false);
      await resource.reload();
    });
  const transition = (action: string) => {
    if (d)
      confirmAction(
        "Chuyển giai đoạn kỳ bầu chọn?",
        () => void post(`/elections/${d.id}/transition`, { action }),
      );
  };
  const electionForm = (initial?: ElectionSummary) => {
    const rules = initial?.rules || resource.data?.defaults;
    if (!rules) return;
    setPolicy({ ...rules });
    setEditor({
      kind: "election",
      title: initial ? "Sửa bản nháp" : "Tạo kỳ bầu chọn",
      path: initial ? `/elections/${initial.id}` : "/elections",
      method: initial ? "put" : "post",
      fields: {
        title: initial?.title || "",
        description:
          initial?.description ||
          "Cộng đồng tín nhiệm, hội đồng mod đánh giá độc lập; admin bổ nhiệm cuối cùng và công khai lý do.",
        nomination: local(
          initial?.nominationClosesAt || Date.now() + 7 * 86400000,
        ),
        voting: local(initial?.votingClosesAt || Date.now() + 14 * 86400000),
      },
    });
  };
  const candidateForm = (c?: ElectionCandidate) => {
    if (d)
      setEditor({
        kind: "application",
        title:
          c?.status === "invited"
            ? "Đồng ý đề cử và nộp hồ sơ"
            : "Hồ sơ ứng cử",
        path: `/elections/${d.id}/candidates${c ? "/" + c.id : ""}`,
        method: c ? "put" : "post",
        fields: {
          motivation: c?.motivation || "",
          experience: c?.experience || "",
          availability: c?.availability || "",
          scenarioAnswer: c?.scenarioAnswer || "",
        },
      });
  };
  const actionForm = (c: ElectionCandidate, kind: string, action?: string) => {
    if (!d) return;
    const base = `/elections/${d.id}/candidates/${c.id}`;
    if (kind === "review") {
      const old = d.myReviews.find((r) => r.candidateId === c.id);
      setVerdict(old?.verdict || "abstain");
      setCriteria(
        old?.criteria || { rules: false, fairness: false, evidence: false },
      );
      setEditor({
        kind,
        title: "Đánh giá @" + c.username,
        path: base + "/review",
        method: "put",
        fields: { comment: old?.comment || "" },
      });
    } else if (kind === "verify")
      setEditor({
        kind,
        title: "Kiểm tra hồ sơ @" + c.username,
        path: base + "/verify",
        method: "post",
        fields: { reason: "" },
        extra: { eligible: action === "eligible" },
      });
    else if (kind === "decision")
      setEditor({
        kind,
        title: "Quyết định @" + c.username,
        path: base + "/decision",
        method: "post",
        fields: { reason: "", internalNote: "", overrideReason: "" },
        extra: { action },
      });
    else if (kind === "tenure")
      setEditor({
        kind,
        title: "Đánh giá nhiệm kỳ @" + c.username,
        path: base + "/tenure",
        method: "post",
        fields: { reason: "" },
        extra: { action },
      });
    else
      setEditor({
        kind,
        title: "Bổ sung hồ sơ",
        path: base,
        method: "put",
        fields: { supplement: "" },
        extra: { action: "supplement" },
      });
  };
  const submit = () =>
    void task.run(async () => {
      if (!editor) return;
      let body: Record<string, unknown> = { ...editor.fields, ...editor.extra };
      if (editor.kind === "election")
        body = {
          title: editor.fields.title,
          description: editor.fields.description,
          rules: policy,
          nominationClosesAt: new Date(
            editor.fields.nomination.replace(" ", "T"),
          ).getTime(),
          votingClosesAt: new Date(
            editor.fields.voting.replace(" ", "T"),
          ).getTime(),
        };
      if (editor.kind === "review") body = { ...body, verdict, criteria };
      const response = await api[editor.method](editor.path, body);
      if (editor.kind === "election" && editor.method === "post")
        setSelected(response.data.id);
      setEditor(null);
      await resource.reload();
    });
  const own = d?.candidates.find((c) => c.userId === user?.id);
  return (
    <Screen
      title="Bầu chọn kiểm duyệt viên"
      loading={resource.loading}
      error={resource.error}
      onRefresh={resource.reload}
    >
      <Label>
        Cộng đồng tín nhiệm · Hội đồng mod đánh giá · Admin quyết định bổ nhiệm
        cuối cùng và công khai lý do.
      </Label>
      <ErrorNotice message={task.error} />
      {admin && (
        <Button
          title="Tạo kỳ bầu chọn"
          disabled={disabled}
          onPress={() => electionForm()}
        />
      )}
      {resource.data?.list.elections.map((e) => (
        <Button
          key={e.id}
          title={`${d?.id === e.id ? "✓ " : ""}${e.title} · ${electionStatus[e.status]}`}
          onPress={() => {
            setSelected(e.id);
            setBallotTouched(false);
          }}
        />
      ))}
      <Row>
        {page > 1 && (
          <Button
            title="Kỳ mới hơn"
            disabled={disabled}
            onPress={() => {
              setPage(page - 1);
              setSelected(null);
            }}
          />
        )}
        {resource.data?.list.nextPage && (
          <Button
            title="Kỳ trước"
            disabled={disabled}
            onPress={() => {
              setPage(page + 1);
              setSelected(null);
            }}
          />
        )}
      </Row>
      {!resource.loading && !resource.error && !d && (
        <Card>
          <Label large>Chưa có kỳ bầu chọn</Label>
          <Label>Các kỳ tuyển sẽ xuất hiện khi admin mở ứng cử.</Label>
        </Card>
      )}
      {d && (
        <>
          <Card>
            <Label large>{d.title}</Label>
            <Label muted>{electionStatus[d.status]}</Label>
            <Label>{d.description}</Label>
            <Label>
              Hạn ứng cử: {date(d.nominationClosesAt)}
              {"\n"}Hạn bỏ phiếu: {date(d.votingClosesAt)}
            </Label>
            {Object.entries(ruleLabels).map(([key, label]) => (
              <Label key={key} muted>
                {label}: {d.rules[key as keyof typeof ruleLabels]}
              </Label>
            ))}
            <Label muted>
              Email đã xác thực:{" "}
              {d.rules.requireVerifiedEmail ? "Bắt buộc" : "Không bắt buộc"}
            </Label>
            <Label>Tình huống: {d.rules.scenario}</Label>
            <Label muted>
              Danh sách cử tri/hội đồng chốt khi mở phiếu. Được đổi phiếu trước
              hạn. Phiếu không tham gia đánh giá không tính vào số mod tối
              thiểu. Kết quả công khai khi hoàn tất xét tuyển.
            </Label>
            {admin && (
              <Row>
                {d.status === "draft" && (
                  <>
                    <Button
                      title="Sửa thể lệ"
                      disabled={disabled}
                      onPress={() => electionForm(d)}
                    />
                    <Button
                      title="Mở ứng cử"
                      disabled={disabled}
                      onPress={() => transition("open")}
                    />
                  </>
                )}
                {d.status === "nominations" && (
                  <Button
                    title="Mở hai vòng bỏ phiếu"
                    disabled={
                      disabled || Date.now() < Number(d.nominationClosesAt)
                    }
                    onPress={() => transition("vote")}
                  />
                )}{" "}
                {d.status === "voting" && (
                  <Button
                    title="Chốt và đối soát"
                    disabled={disabled || Date.now() < Number(d.votingClosesAt)}
                    onPress={() => transition("close")}
                  />
                )}{" "}
                {d.status === "review" && (
                  <Button
                    title="Công bố kết quả"
                    disabled={disabled}
                    onPress={() => transition("publish")}
                  />
                )}{" "}
                {!["completed", "cancelled"].includes(d.status) && (
                  <Button
                    title="Hủy kỳ"
                    disabled={disabled}
                    onPress={() =>
                      setEditor({
                        kind: "cancel",
                        title: "Hủy kỳ bầu chọn",
                        path: `/elections/${d.id}/transition`,
                        method: "post",
                        fields: { reason: "" },
                        extra: { action: "cancel" },
                      })
                    }
                  />
                )}
              </Row>
            )}
          </Card>
          {d.status === "nominations" &&
            Date.now() < Number(d.nominationClosesAt) && (
              <Card>
                <Label large>Ứng cử và đề cử</Label>
                {d.applicationIssues.map((issue) => (
                  <Label key={issue}>{issue}</Label>
                ))}
                {!d.applicationIssues.length &&
                  (!own ||
                    ["invited", "submitted", "eligible"].includes(
                      own.status,
                    )) && (
                    <Button
                      title={
                        own?.status === "invited"
                          ? "Đồng ý đề cử"
                          : own
                            ? "Chỉnh sửa hồ sơ"
                            : "Tự ứng cử"
                      }
                      disabled={disabled}
                      onPress={() => candidateForm(own)}
                    />
                  )}
                <Button
                  title="Đề cử thành viên khác"
                  disabled={disabled}
                  onPress={() =>
                    setEditor({
                      kind: "invite",
                      title: "Đề cử thành viên",
                      path: `/elections/${d.id}/candidates`,
                      method: "post",
                      fields: { nomineeUsername: "" },
                    })
                  }
                />
              </Card>
            )}
          {d.status === "voting" && (
            <Card>
              <Label large>Phiếu cộng đồng</Label>
              {d.canVote ? (
                <>
                  <Label>
                    Chọn tối đa {d.rules.maxChoices} ứng viên; không tự bầu.
                  </Label>
                  {d.candidates
                    .filter((c) => c.status === "eligible")
                    .map((c) => {
                      const ballot = ballotTouched ? choices : d.myBallot;
                      return (
                        <Button
                          key={c.id}
                          title={`${ballot.includes(c.id) ? "✓ " : ""}${c.displayname} (@${c.username})`}
                          disabled={
                            disabled ||
                            Date.now() >= Number(d.votingClosesAt) ||
                            c.userId === user?.id ||
                            (!ballot.includes(c.id) &&
                              ballot.length >= d.rules.maxChoices)
                          }
                          onPress={() => {
                            setChoices(
                              ballot.includes(c.id)
                                ? ballot.filter((i) => i !== c.id)
                                : [...ballot, c.id],
                            );
                            setBallotTouched(true);
                          }}
                        />
                      );
                    })}
                  <Button
                    title="Lưu phiếu tín nhiệm"
                    disabled={
                      disabled || Date.now() >= Number(d.votingClosesAt)
                    }
                    onPress={() =>
                      void post(
                        `/elections/${d.id}/ballot`,
                        { candidateIds: ballotTouched ? choices : d.myBallot },
                        "put",
                      )
                    }
                  />
                </>
              ) : (
                <Label>Bạn chưa thuộc danh sách cử tri hợp lệ đã chốt.</Label>
              )}
            </Card>
          )}
          {d.snapshot && (
            <Card>
              <Label large>Kết quả đã chốt</Label>
              <Label>
                {d.snapshot.turnout}/{d.snapshot.electorate} cử tri tham gia ·{" "}
                {d.snapshot.panel} mod trong hội đồng
              </Label>
              {d.snapshot.candidates.map((r) => (
                <View key={r.id} style={{ gap: 4, paddingVertical: 8 }}>
                  <Label large>
                    {r.displayname} · Hạng {r.rank}
                  </Label>
                  <Label>
                    {r.votes} phiếu cộng đồng · {r.invalidVotes} không hợp lệ
                  </Label>
                  <Label>
                    Mod: {r.modPass} đạt / {r.modFail} chưa đạt / {r.modAbstain}{" "}
                    không tham gia
                  </Label>
                  <Label>
                    {r.approvalPercent}% đồng ý · {r.quorumMet ? "Đủ" : "Thiếu"}{" "}
                    số mod tối thiểu · {r.recommended ? "Đạt" : "Chưa đạt"}{" "}
                    ngưỡng đề xuất
                  </Label>
                </View>
              ))}
            </Card>
          )}
          <Label large>Hồ sơ ứng viên ({d.candidates.length})</Label>
          {d.candidates.map((c) => (
            <Card key={c.id}>
              <Label large>
                {c.displayname} (@{c.username})
              </Label>
              <Label muted>{candidateStatus[c.status]}</Label>
              {!!c.motivation && (
                <>
                  <Label>{c.motivation}</Label>
                  <Label>Kinh nghiệm: {c.experience}</Label>
                  <Label>Thời gian: {c.availability}</Label>
                  <Label>Tình huống: {c.scenarioAnswer}</Label>
                </>
              )}
              {c.verificationReason && (
                <Label>Kiểm tra hồ sơ: {c.verificationReason}</Label>
              )}
              {c.decision !== "pending" && (
                <>
                  <Label large>{decisionStatus[c.decision]}</Label>
                  <Label>{c.publicReason}</Label>
                </>
              )}
              {c.decision === "appointed" && (
                <Label>
                  Thử việc đến {date(c.probationEndsAt)} · Nhiệm kỳ đến{" "}
                  {date(c.termEndsAt)}
                  {c.endedAt
                    ? " · Đã kết thúc: " + c.endReason
                    : c.confirmedAt
                      ? " · Đã hoàn tất thử việc"
                      : ""}
                </Label>
              )}
              {c.supplement && <Label>Bổ sung: {c.supplement}</Label>}
              <Row>
                {c.userId === user?.id &&
                  ["nominations", "voting"].includes(d.status) &&
                  !["withdrawn", "ineligible"].includes(c.status) && (
                    <Button
                      title="Rút hồ sơ"
                      disabled={disabled}
                      onPress={() =>
                        confirmAction(
                          "Rút hồ sơ ứng cử?",
                          () =>
                            void post(
                              `/elections/${d.id}/candidates/${c.id}`,
                              { action: "withdraw" },
                              "put",
                            ),
                        )
                      }
                    />
                  )}{" "}
                {c.userId === user?.id && c.decision === "needs_info" && (
                  <Button
                    title="Gửi giải trình bổ sung"
                    disabled={disabled}
                    onPress={() => actionForm(c, "supplement")}
                  />
                )}{" "}
                {d.canReview &&
                  d.status === "voting" &&
                  c.status === "eligible" &&
                  c.userId !== user?.id && (
                    <Button
                      title="Đánh giá hội đồng"
                      disabled={
                        disabled || Date.now() >= Number(d.votingClosesAt)
                      }
                      onPress={() => actionForm(c, "review")}
                    />
                  )}{" "}
                {admin &&
                  d.status === "nominations" &&
                  ["submitted", "eligible", "ineligible"].includes(
                    c.status,
                  ) && (
                    <>
                      <Button
                        title="Xác nhận đủ điều kiện"
                        disabled={disabled}
                        onPress={() => actionForm(c, "verify", "eligible")}
                      />
                      <Button
                        title="Chưa đủ điều kiện"
                        disabled={disabled}
                        onPress={() => actionForm(c, "verify", "ineligible")}
                      />
                    </>
                  )}
                {admin &&
                  d.status === "review" &&
                  ["eligible", "ineligible"].includes(c.status) &&
                  ["pending", "needs_info"].includes(c.decision) && (
                    <>
                      <Button
                        title="Bổ nhiệm"
                        disabled={disabled || c.status !== "eligible"}
                        onPress={() => actionForm(c, "decision", "appoint")}
                      />
                      <Button
                        title="Yêu cầu bổ sung"
                        disabled={disabled}
                        onPress={() =>
                          actionForm(c, "decision", "request_info")
                        }
                      />
                      <Button
                        title="Không bổ nhiệm"
                        disabled={disabled}
                        onPress={() => actionForm(c, "decision", "reject")}
                      />
                    </>
                  )}
                {admin &&
                  d.status === "completed" &&
                  c.decision === "appointed" &&
                  !c.endedAt && (
                    <>
                      <Button
                        title="Xác nhận hết thử việc"
                        disabled={
                          disabled ||
                          !!c.confirmedAt ||
                          Date.now() < Number(c.probationEndsAt) ||
                          Date.now() >= Number(c.termEndsAt)
                        }
                        onPress={() => actionForm(c, "tenure", "confirm")}
                      />
                      <Button
                        title="Kết thúc nhiệm kỳ"
                        disabled={
                          disabled || Date.now() >= Number(c.termEndsAt)
                        }
                        onPress={() => actionForm(c, "tenure", "revoke")}
                      />
                    </>
                  )}
              </Row>
              {admin && c.internalNote && (
                <Label>Nội bộ: {c.internalNote}</Label>
              )}
              {admin && c.overrideReason && (
                <Label>Giải trình khác đề xuất: {c.overrideReason}</Label>
              )}
            </Card>
          ))}
          <Card>
            <Label large>
              {admin ? "Khiếu nại cần đối soát" : "Khiếu nại của tôi"}
            </Label>
            <Label muted>
              Chỉ người gửi và admin xem được nội dung khiếu nại.
            </Label>
            {d.complaints.map((c) => (
              <View key={c.id} style={{ gap: 10 }}>
                <Label>
                  #{c.id} · {c.status === "open" ? "Chờ xử lý" : "Đã xử lý"} ·{" "}
                  {c.message}
                </Label>
                {c.resolution && <Label>Kết quả: {c.resolution}</Label>}
                {admin && c.status === "open" && (
                  <Button
                    title={`Xử lý khiếu nại #${c.id}`}
                    disabled={disabled}
                    onPress={() =>
                      setEditor({
                        kind: "resolve",
                        title: "Xử lý khiếu nại",
                        path: `/elections/${d.id}/complaints/${c.id}/resolve`,
                        method: "post",
                        fields: { resolution: "" },
                      })
                    }
                  />
                )}
              </View>
            ))}
            {["nominations", "voting", "review"].includes(d.status) && (
              <Button
                title="Gửi khiếu nại"
                disabled={disabled}
                onPress={() =>
                  setEditor({
                    kind: "complaint",
                    title: "Gửi khiếu nại",
                    path: `/elections/${d.id}/complaints`,
                    method: "post",
                    fields: { message: "" },
                  })
                }
              />
            )}
          </Card>
          {admin && d.reviewDetail.length > 0 && (
            <Card>
              <Label large>Đánh giá hội đồng · Nội bộ</Label>
              {d.reviewDetail.map((r) => (
                <Label key={r.candidateId + "-" + r.username}>
                  @{r.username} →{" "}
                  {
                    d.candidates.find((c) => c.id === r.candidateId)
                      ?.displayname
                  }
                  :{" "}
                  {r.verdict === "pass"
                    ? "Đạt"
                    : r.verdict === "fail"
                      ? "Chưa đạt"
                      : "Không tham gia"}{" "}
                  · {r.comment}
                </Label>
              ))}
            </Card>
          )}
          {admin && (
            <Card>
              <Label large>Nhật ký · 150 thao tác gần nhất</Label>
              {d.audit.map((a) => (
                <Label key={a.id} muted>
                  {a.username || "Hệ thống"} · {a.action} ·{" "}
                  {new Date(a.createdAt).toLocaleString("vi-VN")}
                  {"\n"}
                  {JSON.stringify(a.details)}
                </Label>
              ))}
            </Card>
          )}
        </>
      )}
      <Sheet
        title={editor?.title || "Bầu chọn"}
        visible={!!editor}
        onClose={() => {
          if (!task.busy) setEditor(null);
        }}
      >
        <ErrorNotice message={task.error} />
        {editor && (
          <>
            {editor.kind === "application" && (
              <Label>
                Đồng ý nộp sẽ công khai hồ sơ ứng cử. Tình huống:{" "}
                {d?.rules.scenario}
              </Label>
            )}
            {Object.entries(editor.fields).map(([key, value]) => (
              <Field
                key={key}
                label={labels[key] || key}
                value={value}
                editable={!task.busy}
                multiline={
                  ![
                    "title",
                    "nomination",
                    "voting",
                    "nomineeUsername",
                    "availability",
                  ].includes(key)
                }
                onChangeText={(v) =>
                  setEditor({
                    ...editor,
                    fields: { ...editor.fields, [key]: v },
                  })
                }
              />
            ))}
            {editor.kind === "election" && policy && (
              <>
                <Label>
                  Thể lệ khóa khi mở ứng cử; thời gian theo múi giờ thiết bị.
                </Label>
                {Object.entries(ruleLabels).map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    keyboardType="numeric"
                    value={String(policy[key as keyof typeof ruleLabels])}
                    onChangeText={(v) =>
                      setPolicy({ ...policy, [key]: Number(v) })
                    }
                  />
                ))}
                <Button
                  title={`Email đã xác thực: ${policy.requireVerifiedEmail ? "Bắt buộc" : "Không bắt buộc"}`}
                  onPress={() =>
                    setPolicy({
                      ...policy,
                      requireVerifiedEmail: !policy.requireVerifiedEmail,
                    })
                  }
                />
                <Field
                  label="Tình huống xét tuyển"
                  multiline
                  value={policy.scenario}
                  onChangeText={(v) => setPolicy({ ...policy, scenario: v })}
                />
              </>
            )}
            {editor.kind === "review" && (
              <>
                <Label>
                  Chọn không tham gia khi có xung đột lợi ích. Nhận xét dành cho
                  admin.
                </Label>
                {(
                  [
                    ["rules", "Hiểu quy định"],
                    ["fairness", "Giữ công bằng"],
                    ["evidence", "Dựa trên bằng chứng"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    title={`${criteria[key] ? "✓ " : ""}${label}`}
                    onPress={() =>
                      setCriteria({ ...criteria, [key]: !criteria[key] })
                    }
                  />
                ))}
                <Row>
                  {[
                    ["pass", "Đạt"],
                    ["fail", "Chưa đạt"],
                    ["abstain", "Không tham gia"],
                  ].map(([key, label]) => (
                    <Button
                      key={key}
                      title={`${verdict === key ? "✓ " : ""}${label}`}
                      onPress={() => setVerdict(key)}
                    />
                  ))}
                </Row>
              </>
            )}
            <Button
              title={
                editor.kind === "application"
                  ? "Đồng ý và nộp hồ sơ"
                  : "Xác nhận lưu"
              }
              disabled={task.busy}
              onPress={() =>
                ["decision", "tenure", "cancel"].includes(editor.kind)
                  ? confirmAction(
                      "Xác nhận quyết định?",
                      submit,
                      "Quyết định được ghi nhật ký. Bổ nhiệm sẽ cấp quyền mod ngay.",
                    )
                  : submit()
              }
            />
          </>
        )}
      </Sheet>
    </Screen>
  );
}

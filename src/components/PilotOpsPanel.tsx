"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  PilotAlarm,
  PilotBom,
  PilotChecklistKey,
  PilotDailyConfirmation,
  PilotInspectionRun,
  PilotItemResult,
  PilotOpsSummary,
} from "@/features/pilot/types";
import { PILOT_CHECKLIST_KEYS } from "@/features/pilot/types";
import type { SessionUser } from "@/features/facilities/types";

type ChecklistTemplateItem = { key: PilotChecklistKey; label: string };

type MappingPayload = {
  gateway: { id: string; rtu: string; lte: boolean; source: string };
  points: Array<{
    id: string;
    tag: string;
    meter: string;
    gatewayId: string;
    enabled?: boolean;
    source: string;
  }>;
};

type ApiFailure = Error & {
  status?: number;
  code?: string;
  requestId?: string;
};

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const body = (await response.json()) as {
    ok: boolean;
    data?: T;
    requestId?: string;
    error?: { code?: string; message?: string };
  };
  if (!response.ok || !body.ok || !body.data) {
    const error = new Error(
      body.error?.message ?? "요청을 처리하지 못했습니다.",
    ) as ApiFailure;
    error.status = response.status;
    error.code = body.error?.code;
    error.requestId = body.requestId;
    throw error;
  }
  return body.data;
}

export function PilotOpsPanel() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [alarms, setAlarms] = useState<PilotAlarm[]>([]);
  const [summary, setSummary] = useState<PilotOpsSummary | null>(null);
  const [inspections, setInspections] = useState<PilotInspectionRun[]>([]);
  const [confirmations, setConfirmations] = useState<PilotDailyConfirmation[]>(
    [],
  );
  const [bom, setBom] = useState<PilotBom | null>(null);
  const [mapping, setMapping] = useState<MappingPayload | null>(null);
  const [template, setTemplate] = useState<ChecklistTemplateItem[]>([]);
  const [itemResults, setItemResults] = useState<
    Record<PilotChecklistKey, PilotItemResult>
  >(() =>
    Object.fromEntries(
      PILOT_CHECKLIST_KEYS.map((key) => [key, "PASS"]),
    ) as Record<PilotChecklistKey, PilotItemResult>,
  );
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [receptionOk, setReceptionOk] = useState(true);
  const [alarmReviewed, setAlarmReviewed] = useState(true);
  const [dailyNote, setDailyNote] = useState("");
  const [busy, setBusy] = useState(false);

  const canAck = user?.role === "ADMIN" || user?.role === "OPERATOR";

  const load = useCallback(async () => {
    setError(null);
    const [alarmData, inspectionData, dailyData, bomData] = await Promise.all([
      apiFetch<{
        alarms: PilotAlarm[];
        summary: PilotOpsSummary;
        checklistTemplate: ChecklistTemplateItem[];
      }>("/api/pilot/alarms"),
      apiFetch<{
        inspections: PilotInspectionRun[];
        checklistTemplate: ChecklistTemplateItem[];
      }>("/api/pilot/inspections"),
      apiFetch<{ confirmations: PilotDailyConfirmation[] }>(
        "/api/pilot/daily-confirmations",
      ),
      apiFetch<{
        bom: PilotBom;
        mapping: MappingPayload;
        checklistTemplate: ChecklistTemplateItem[];
        summary: PilotOpsSummary;
      }>("/api/pilot/bom"),
    ]);
    setAlarms(alarmData.alarms);
    setSummary(alarmData.summary);
    setTemplate(alarmData.checklistTemplate);
    setInspections(inspectionData.inspections);
    setConfirmations(dailyData.confirmations);
    setBom(bomData.bom);
    setMapping(bomData.mapping);
    if (bomData.summary.todayConfirmation) {
      setReceptionOk(bomData.summary.todayConfirmation.receptionOk);
      setAlarmReviewed(bomData.summary.todayConfirmation.alarmReviewed);
      setDailyNote(bomData.summary.todayConfirmation.note);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiFetch<SessionUser>("/api/auth/session"),
      apiFetch<{
        alarms: PilotAlarm[];
        summary: PilotOpsSummary;
        checklistTemplate: ChecklistTemplateItem[];
      }>("/api/pilot/alarms"),
      apiFetch<{
        inspections: PilotInspectionRun[];
        checklistTemplate: ChecklistTemplateItem[];
      }>("/api/pilot/inspections"),
      apiFetch<{ confirmations: PilotDailyConfirmation[] }>(
        "/api/pilot/daily-confirmations",
      ),
      apiFetch<{
        bom: PilotBom;
        mapping: MappingPayload;
        checklistTemplate: ChecklistTemplateItem[];
        summary: PilotOpsSummary;
      }>("/api/pilot/bom"),
    ])
      .then(([me, alarmData, inspectionData, dailyData, bomData]) => {
        if (!active) return;
        setUser(me);
        setAlarms(alarmData.alarms);
        setSummary(alarmData.summary);
        setTemplate(alarmData.checklistTemplate);
        setInspections(inspectionData.inspections);
        setConfirmations(dailyData.confirmations);
        setBom(bomData.bom);
        setMapping(bomData.mapping);
        if (bomData.summary.todayConfirmation) {
          setReceptionOk(bomData.summary.todayConfirmation.receptionOk);
          setAlarmReviewed(bomData.summary.todayConfirmation.alarmReviewed);
          setDailyNote(bomData.summary.todayConfirmation.note);
        }
      })
      .catch((err: ApiFailure) => {
        if (!active) return;
        if (err.status === 401) {
          router.replace("/");
          return;
        }
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const unacked = useMemo(
    () => alarms.filter((alarm) => !alarm.acknowledgedAt),
    [alarms],
  );

  async function ackAlarm(alarmId: string) {
    if (!canAck) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/api/pilot/alarms/${alarmId}/ack`, { method: "POST" });
      setMessage("알람을 확인 처리했습니다.");
      await load();
    } catch (err) {
      setError((err as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitInspection(event: FormEvent) {
    event.preventDefault();
    if (!canAck) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch("/api/pilot/inspections", {
        method: "POST",
        body: JSON.stringify({
          gatewayId: "gw-pilot-01",
          notes: inspectionNotes,
          items: PILOT_CHECKLIST_KEYS.map((key) => ({
            itemKey: key,
            result: itemResults[key],
            note: "",
          })),
        }),
      });
      setMessage("검수 기록을 저장했습니다.");
      setInspectionNotes("");
      await load();
    } catch (err) {
      setError((err as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitDaily(event: FormEvent) {
    event.preventDefault();
    if (!canAck) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch("/api/pilot/daily-confirmations", {
        method: "PUT",
        body: JSON.stringify({
          gatewayId: "gw-pilot-01",
          receptionOk,
          alarmReviewed,
          note: dailyNote,
        }),
      });
      setMessage("오늘 일일 수신·알람 확인을 저장했습니다.");
      await load();
    } catch (err) {
      setError((err as ApiFailure).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-white/70">
        파일럿 운영 데이터를 불러오는 중…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 text-white">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-200/70 uppercase">
            패키지 A · 파일럿 운영
          </p>
          <h1 className="mt-1 text-2xl font-semibold">관제 · 알람 · 검수</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            끊김·알람 수신, 통신·설치 검수 5항, 일일 수신 확인, 매핑·BOM 납품
            뷰. 포털 API·요금·절감 필드는 포함하지 않습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/hub"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-white/80 hover:bg-white/5"
          >
            허브
          </Link>
          <Link
            href="/admin/facilities"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-white/80 hover:bg-white/5"
          >
            설비 CRUD
          </Link>
        </div>
      </header>

      {user ? (
        <p className="text-xs text-white/45">
          {user.name} ({user.username} · {user.role})
          {!canAck ? " · 조회 전용" : " · 확인·검수 가능"}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="미확인 알람"
          value={String(summary?.unackedAlarmCount ?? unacked.length)}
        />
        <SummaryTile
          label="매핑 일치"
          value={summary?.mappingOk ? "OK" : "점검"}
        />
        <SummaryTile
          label="최근 수신"
          value={formatTime(summary?.latestReadingAt)}
        />
        <SummaryTile
          label="오늘 일일확인"
          value={
            summary?.todayConfirmation
              ? summary.todayConfirmation.receptionOk &&
                summary.todayConfirmation.alarmReviewed
                ? "완료"
                : "부분"
              : "미완료"
          }
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">끊김·알람 수신</h2>
        <p className="mt-1 text-xs text-white/45">
          operator/admin이 확인(ack)합니다. viewer는 조회만 가능합니다.
        </p>
        <ul className="mt-4 space-y-3">
          {alarms.length === 0 ? (
            <li className="text-sm text-white/50">알람 없음</li>
          ) : (
            alarms.map((alarm) => (
              <li
                key={alarm.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{alarm.title}</span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">
                      {alarm.type}
                    </span>
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-100">
                      {alarm.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/60">{alarm.message}</p>
                  <p className="mt-1 text-[11px] text-white/35">
                    {formatTime(alarm.observedAt)}
                    {alarm.acknowledgedAt
                      ? ` · 확인 ${formatTime(alarm.acknowledgedAt)}`
                      : " · 미확인"}
                  </p>
                </div>
                {!alarm.acknowledgedAt && canAck ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void ackAlarm(alarm.id)}
                    className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-3 py-1.5 text-sm text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-50"
                  >
                    확인
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">일일 수신·알람 확인</h2>
        <form className="mt-4 space-y-3" onSubmit={(event) => void submitDaily(event)}>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={receptionOk}
              disabled={!canAck || busy}
              onChange={(event) => setReceptionOk(event.target.checked)}
            />
            일일 계측 데이터 수신 확인
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alarmReviewed}
              disabled={!canAck || busy}
              onChange={(event) => setAlarmReviewed(event.target.checked)}
            />
            operator 알람·끊김 수신 확인
          </label>
          <input
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            placeholder="메모 (선택)"
            value={dailyNote}
            disabled={!canAck || busy}
            onChange={(event) => setDailyNote(event.target.value)}
          />
          {canAck ? (
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-50"
            >
              오늘 확인 저장
            </button>
          ) : null}
        </form>
        {confirmations.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            {confirmations.slice(0, 5).map((row) => (
              <li key={row.id}>
                {row.confirmDate} · 수신 {row.receptionOk ? "OK" : "NG"} · 알람{" "}
                {row.alarmReviewed ? "OK" : "NG"}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">통신·설치 검수 5항</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => void submitInspection(event)}
        >
          {(template.length ? template : PILOT_CHECKLIST_KEYS.map((key) => ({
            key,
            label: key,
          }))).map((item) => (
            <div
              key={item.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2"
            >
              <span className="text-sm text-white/80">{item.label}</span>
              <select
                className="rounded border border-white/20 bg-black/40 px-2 py-1 text-sm"
                value={itemResults[item.key]}
                disabled={!canAck || busy}
                onChange={(event) =>
                  setItemResults((prev) => ({
                    ...prev,
                    [item.key]: event.target.value as PilotItemResult,
                  }))
                }
              >
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="NA">NA</option>
              </select>
            </div>
          ))}
          <textarea
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            rows={2}
            placeholder="검수 비고"
            value={inspectionNotes}
            disabled={!canAck || busy}
            onChange={(event) => setInspectionNotes(event.target.value)}
          />
          {canAck ? (
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-50"
            >
              검수 기록 저장
            </button>
          ) : null}
        </form>
        {inspections[0] ? (
          <p className="mt-4 text-sm text-white/55">
            최근 검수 {formatTime(inspections[0].inspectedAt)} ·{" "}
            {inspections[0].status} · 항목 {inspections[0].items.length}개
          </p>
        ) : (
          <p className="mt-4 text-sm text-white/45">저장된 검수 기록 없음</p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">관제점·게이트웨이 매핑</h2>
        {mapping ? (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-white/45">
                <tr>
                  <th className="py-2 pr-4">구분</th>
                  <th className="py-2 pr-4">ID / tag</th>
                  <th className="py-2">상태</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/10">
                  <td className="py-2 pr-4">게이트웨이</td>
                  <td className="py-2 pr-4">{mapping.gateway.id}</td>
                  <td className="py-2">
                    source={mapping.gateway.source} · RTU {mapping.gateway.rtu} ·
                    LTE {mapping.gateway.lte ? "Y" : "N"}
                  </td>
                </tr>
                {mapping.points.map((point) => (
                  <tr key={point.id} className="border-t border-white/10">
                    <td className="py-2 pr-4">계측점</td>
                    <td className="py-2 pr-4">
                      {point.id} / {point.tag}
                    </td>
                    <td className="py-2">
                      {point.enabled === false ? "비활성(후보)" : "활성"} ·{" "}
                      {point.meter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold">표준 BOM · 옵션</h2>
        {bom ? (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-white/70">표준</h3>
              <ul className="mt-2 space-y-1 text-sm text-white/60">
                {bom.standardBom.map((row) => (
                  <li key={row.item}>
                    {row.item}
                    <span className="text-white/35"> — {row.note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white/70">옵션</h3>
              <ul className="mt-2 space-y-1 text-sm text-white/60">
                {bom.optionalBom.map((row) => (
                  <li key={row.item}>
                    {row.item}
                    <span className="text-white/35"> — {row.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-[11px] text-white/45">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

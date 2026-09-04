import type { SerializedPilotSnapshot } from "@/features/pilot/mains";
import type { PilotSnapshot } from "@/features/pilot/types";

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface Props {
  snapshot: PilotSnapshot | SerializedPilotSnapshot;
  compact?: boolean;
}

export function PilotSnapshotCard({ snapshot, compact = false }: Props) {
  const latest = snapshot.latestReading;
  const enabledPoints = snapshot.points.filter((point) => point.enabled);
  const candidatePoints = snapshot.points.filter((point) => !point.enabled);

  return (
    <section
      className={`rounded-2xl border border-cyan-400/25 bg-cyan-950/30 ${
        compact ? "p-4" : "p-5"
      }`}
      aria-labelledby="pilot-snapshot-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-cyan-200/70 uppercase">
            파일럿 MockDB
          </p>
          <h2
            id="pilot-snapshot-title"
            className="mt-1 text-lg font-semibold text-white"
          >
            {snapshot.gateway?.id ?? "파일럿 게이트웨이 없음"}
          </h2>
          <p className="mt-1 text-xs text-white/50">
            {snapshot.points.map((point) => point.tag).join(" · ") || "계측점 없음"}
            {" · "}
            source={snapshot.source}
          </p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-cyan-100">
          {snapshot.source === "mock" ? "MockDB 시계열" : "RTU"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-black/20 px-3 py-2">
          <dt className="text-[11px] text-white/45">kW</dt>
          <dd className="text-lg font-semibold tabular-nums text-white">
            {formatNumber(latest?.kW)}
          </dd>
        </div>
        <div className="rounded-xl bg-black/20 px-3 py-2">
          <dt className="text-[11px] text-white/45">kWh / 1h</dt>
          <dd className="text-lg font-semibold tabular-nums text-white">
            {formatNumber(latest?.kWh)}
          </dd>
        </div>
        <div className="rounded-xl bg-black/20 px-3 py-2">
          <dt className="text-[11px] text-white/45">V</dt>
          <dd className="text-lg font-semibold tabular-nums text-white">
            {formatNumber(latest?.V)}
          </dd>
        </div>
        <div className="rounded-xl bg-black/20 px-3 py-2">
          <dt className="text-[11px] text-white/45">A</dt>
          <dd className="text-lg font-semibold tabular-nums text-white">
            {formatNumber(latest?.A)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-white/40">
        최근 시각 {formatTime(latest?.observedAt)} · 활성 계측점 {enabledPoints.length}개
        · 후보 {candidatePoints.length}개 · 시간열 {snapshot.readings.length}건
      </p>

      <ul className="mt-4 space-y-2">
        {snapshot.points.map((point) => (
          <li
            key={point.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm"
          >
            <div>
              <span className="font-medium text-white/85">{point.tag}</span>
              <span className="ml-2 text-white/50">{point.meter}</span>
              <span className="ml-2 text-[11px] text-white/35">{point.id}</span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[11px] ${
                point.enabled
                  ? "bg-emerald-500/15 text-emerald-200"
                  : "bg-white/10 text-white/45"
              }`}
            >
              {point.enabled ? "활성" : "후보 · 비활성"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

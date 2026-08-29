"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * ABC EMS — 한전 파워플래너 연동.
 *
 * 데이터베이스의 고객(업체) 정보(FIRM_ROWS)를 `/api/kepco/status` 로 가져와
 * 업체를 고르고, 한전 파워플래너(pp.kepco.co.kr)에서 수집한 요약·월별·시간별
 * 전력 데이터를 `/api/kepco/firm/{fid}` 로 조회해 화면에 반영한다.
 * 수동 수집은 `/api/kepco/collect` 로 트리거한다.
 *
 * 에그핏(/fit/research)과 같은 백엔드(API·SQLite·수집기)를 공유하되,
 * ABC 관리자 테마(deskLib/research.css)에 맞춰 표시한다.
 */

interface KepcoFirmStatus {
  fid: number;
  firmName: string;
  kepcoNo: string;
  hasPasswd: boolean;
  lastStatus: "success" | "no_credentials" | "login_failed" | "error" | null;
  lastMessage: string | null;
  lastCollectedAt: string | null;
}

interface KepcoFirmData {
  summary: {
    collected_at: string;
    start_dt: string;
    end_dt: string;
    cntr_knd_nm: string;
    f_ap_qt: string;
    total_charge: string;
    predict_total_charge: string;
    joj_kw: string;
    max_pwr: string;
  } | null;
  hourly: { ymd: string; hhmi: string; f_ap_qt: string; max_pwr: string }[];
  monthly: { yyyymm: string; f_ap_qt: string; kwh_bill: string }[];
}

const STATUS_LABEL: Record<NonNullable<KepcoFirmStatus["lastStatus"]>, string> = {
  success: "수집 완료",
  no_credentials: "비밀번호 미등록",
  login_failed: "로그인 실패",
  error: "수집 오류",
};

function formatCollectedAt(iso: string | null) {
  if (!iso) return "미수집";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())} 업데이트`;
}

function withCommas(value: string) {
  const num = Number(value.replaceAll(",", ""));
  return Number.isFinite(num) && value !== "" ? num.toLocaleString("ko-KR") : value || "-";
}

export function AbcResearchPanel() {
  const [tab, setTab] = useState<"charges" | "quarter">("charges");
  const [firms, setFirms] = useState<KepcoFirmStatus[]>([]);
  const [selectedFid, setSelectedFid] = useState<number | null>(null);
  const [firmData, setFirmData] = useState<KepcoFirmData | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [collectMessage, setCollectMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/kepco/status", { cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = (await res.json()) as { data: KepcoFirmStatus[] };
    setFirms(body.data);
    return body.data;
  }, []);

  const loadFirmData = useCallback(async (fid: number) => {
    const res = await fetch(`/api/kepco/firm/${fid}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`firm ${res.status}`);
    const body = (await res.json()) as { data: KepcoFirmData };
    setFirmData(body.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await loadStatus();
        if (cancelled || list.length === 0) return;
        // 상단 바에서 고른 업체(localStorage.fid)를 우선 선택한다.
        const stored = Number(globalThis.localStorage?.getItem("fid"));
        const preferred = list.find((row) => row.fid === stored) ?? list[0];
        setSelectedFid(preferred.fid);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "불러오기 실패");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

  useEffect(() => {
    if (selectedFid == null) return;
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) await loadFirmData(selectedFid);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "불러오기 실패");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFid, loadFirmData]);

  const selected = useMemo(
    () => firms.find((row) => row.fid === selectedFid) ?? null,
    [firms, selectedFid],
  );

  const requestCollect = async () => {
    if (selectedFid == null || collecting) return;
    setCollecting(true);
    setCollectMessage(null);
    try {
      const res = await fetch("/api/kepco/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fid: selectedFid }),
      });
      const body = (await res.json()) as { data?: { status: string; message: string }[] };
      const result = body.data?.[0];
      setCollectMessage(
        result
          ? `${STATUS_LABEL[result.status as keyof typeof STATUS_LABEL] ?? result.status}: ${result.message}`
          : null,
      );
      await loadStatus();
      await loadFirmData(selectedFid);
    } catch (error) {
      setCollectMessage(error instanceof Error ? error.message : "수집 실패");
    } finally {
      setCollecting(false);
    }
  };

  const summary = firmData?.summary ?? null;
  const monthlyRows = firmData?.monthly ?? [];
  const hourlyRows = firmData?.hourly ?? [];

  return (
    <main className="contents" id="contentsArea">
      <h1 className="deskTitle">한전 파워플래너 연동</h1>
      <div className="researchHead" id="researchInfo">
        <span className="researchLabel">업체</span>
        <select
          className="researchInfoText"
          data-name="firmSelect"
          aria-label="업체 선택"
          value={selectedFid ?? ""}
          onChange={(event) => setSelectedFid(Number(event.target.value))}
        >
          {firms.length === 0 ? <option value="">불러오는 중…</option> : null}
          {firms.map((row) => (
            <option key={row.fid} value={row.fid}>
              {row.firmName} ({row.kepcoNo})
            </option>
          ))}
        </select>
        <span className="researchLabel">전력타입</span>
        <span className="researchInfoText" data-name="contract">{summary?.cntr_knd_nm || "-"}</span>
        <span className="researchLabel">고객번호</span>
        <span className="researchInfoText" data-name="kepcoCyber">{selected?.kepcoNo || "-"}</span>
        <span className="researchLabel">한전비번</span>
        <span className="researchInfoText" data-name="kepcoPasswd">{selected?.hasPasswd ? "••••••••" : "미등록"}</span>
        <span className="researchLabel">수집 상태</span>
        <span className="researchInfoText" data-name="kepcoStatus">
          {collecting ? "수집 중…" : selected?.lastStatus ? STATUS_LABEL[selected.lastStatus] : "미수집"}
        </span>
        <span className="researchInfoText" data-name="kepcoTime">{formatCollectedAt(selected?.lastCollectedAt ?? null)}</span>
        <button
          className={collecting ? "researchAct progress" : "researchAct"}
          id="researchRequest"
          type="button"
          disabled={collecting || !selected?.hasPasswd}
          onClick={() => void requestCollect()}
        >
          {collecting ? "수집 중…" : "수집 요청"}
        </button>
      </div>
      {loadError && (
        <div className="researchHead" style={{ padding: "4px 10px", fontSize: 12 }}>
          <span className="researchInfoText">불러오기 오류: {loadError}</span>
        </div>
      )}
      {collectMessage && (
        <div className="researchHead" style={{ padding: "4px 10px", fontSize: 12 }}>
          <span className="researchInfoText">{collectMessage}</span>
        </div>
      )}
      {summary && (
        <div className="researchHead" style={{ padding: "4px 10px", fontSize: 12 }}>
          <span className="researchLabel">검침기간</span>
          <span className="researchInfoText">{summary.start_dt}~{summary.end_dt}</span>
          <span className="researchLabel">실시간 사용량</span>
          <span className="researchInfoText">{withCommas(summary.f_ap_qt)} kWh</span>
          <span className="researchLabel">실시간 요금</span>
          <span className="researchInfoText">{withCommas(summary.total_charge)} 원</span>
          <span className="researchLabel">예상 요금</span>
          <span className="researchInfoText">{withCommas(summary.predict_total_charge)} 원</span>
          <span className="researchLabel">요금적용전력</span>
          <span className="researchInfoText">{withCommas(summary.joj_kw)} kW</span>
          <span className="researchLabel">최대수요</span>
          <span className="researchInfoText">{withCommas(summary.max_pwr)} kW</span>
        </div>
      )}
      <div className="researchNav">
        <button
          className={tab === "charges" ? "toggleAct active" : "toggleAct"}
          id="researchCharges"
          type="button"
          onClick={() => setTab("charges")}
        >
          월별 요금정보
        </button>
        <button
          className={tab === "quarter" ? "toggleAct active" : "toggleAct"}
          id="researchQuarter"
          type="button"
          onClick={() => setTab("quarter")}
        >
          시간별 전력사용량 kW
        </button>
      </div>
      <div className="researchData" id="researchData" style={{ gridTemplateColumns: "repeat(3,minmax(150px,1fr))" }}>
        {(tab === "charges"
          ? ["월", "사용량(kWh)", "요금(원)"]
          : ["일자", "시간", "사용전력(kW)"]
        ).map((label) => (
          <span className="researchDataLabel" key={label}>
            {label}
          </span>
        ))}
        {tab === "charges" &&
          monthlyRows.flatMap((row) => [
            <span key={`${row.yyyymm}-m`}>{row.yyyymm}</span>,
            <span key={`${row.yyyymm}-q`}>{withCommas(row.f_ap_qt)}</span>,
            <span key={`${row.yyyymm}-b`}>{withCommas(row.kwh_bill)}</span>,
          ])}
        {tab === "quarter" &&
          hourlyRows.flatMap((row) => [
            <span key={`${row.ymd}-${row.hhmi}-d`}>{row.ymd}</span>,
            <span key={`${row.ymd}-${row.hhmi}-t`}>{row.hhmi}:00</span>,
            <span key={`${row.ymd}-${row.hhmi}-v`}>{withCommas(row.f_ap_qt)}</span>,
          ])}
        {((tab === "charges" && monthlyRows.length === 0) ||
          (tab === "quarter" && hourlyRows.length === 0)) && (
          <span style={{ gridColumn: "1 / -1", textAlign: "center", padding: 24, color: "#888" }}>
            수집된 데이터가 없습니다. 수집 요청을 눌러 한전 파워플래너에서 가져오세요.
          </span>
        )}
      </div>
    </main>
  );
}

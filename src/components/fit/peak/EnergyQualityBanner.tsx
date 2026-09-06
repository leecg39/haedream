"use client";

import { useEffect, useState } from "react";
import type { EnergyQuality } from "@/features/energy/types";

const QUALITY_LABEL: Record<EnergyQuality, string> = {
  DEMO: "데모 데이터",
  MEASURED: "실측",
  ESTIMATED: "추정",
  STALE: "지연",
  NO_DATA: "데이터 없음",
};

interface EnergyQualityBannerProps {
  readonly fid: number;
}

/**
 * 피크 화면 상단에 계측 품질을 명시한다.
 * DEMO/NO_DATA 를 실측처럼 보이게 하지 않는다.
 */
export function EnergyQualityBanner({ fid }: EnergyQualityBannerProps) {
  const [quality, setQuality] = useState<EnergyQuality>("NO_DATA");
  const [disclaimer, setDisclaimer] = useState("계측 품질을 확인하는 중…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/energy/${fid}?unit=kW`, {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) {
            setQuality("NO_DATA");
            setDisclaimer("계측 API를 사용할 수 없습니다.");
          }
          return;
        }
        const body = (await response.json()) as {
          data?: { quality?: EnergyQuality; disclaimer?: string };
        };
        if (cancelled) return;
        setQuality(body.data?.quality ?? "NO_DATA");
        setDisclaimer(
          body.data?.disclaimer ?? "품질·출처 필드를 함께 확인하세요.",
        );
      } catch {
        if (!cancelled) {
          setQuality("NO_DATA");
          setDisclaimer("계측 품질을 확인하지 못했습니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fid]);

  return (
    <p
      className="energyQualityBanner"
      role="status"
      data-quality={quality}
      style={{
        margin: "0 0 0.75rem",
        padding: "0.55rem 0.8rem",
        border: "1px solid rgba(255,200,80,.35)",
        borderRadius: "0.35rem",
        background: "rgba(255,200,80,.08)",
        color: "#ffd27a",
        fontSize: "0.95rem",
      }}
    >
      <strong>계측 품질: {QUALITY_LABEL[quality]}</strong>
      {" — "}
      {disclaimer}
    </p>
  );
}

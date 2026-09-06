import { PageStyles } from "@/components/fit/shared/PageStyles";
import { LIB_STYLES } from "@/lib/fit-styles";
import { LiveUseArea } from "@/components/fit/peak/LiveUseArea";
import { PeakArea } from "@/components/fit/peak/PeakArea";
import { PeakResults } from "@/components/fit/peak/PeakResults";
import { PeakTopInfo } from "@/components/fit/peak/PeakTopInfo";
import { EnergyQualityBanner } from "@/components/fit/peak/EnergyQualityBanner";
import {
  PEAK_GOALS,
  PEAK_HEADER,
  PEAK_POINTS,
  PEAK_REALTIME,
  PEAK_ROI,
  PEAK_SORT,
} from "@/lib/fit-mocks/peak";

export const metadata = { title: "피크상태" };

/** 승인된 실업체 연결 전: 합성 데모 fid 기준 품질 배지만 연결한다. */
const QUALITY_DEMO_FID = 2_000_000_001;

export default function FitPeakPage() {
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/peak.css"]} />
      <main className="peakGrid contents" id="contentsArea">
        <EnergyQualityBanner fid={QUALITY_DEMO_FID} />
        <PeakTopInfo header={PEAK_HEADER} />
        <PeakArea realtime={PEAK_REALTIME} points={PEAK_POINTS} />
        <LiveUseArea sort={PEAK_SORT} />
        <PeakResults goals={PEAK_GOALS} roi={PEAK_ROI} />
      </main>
    </>
  );
}

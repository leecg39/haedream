import { LiveUseArea } from "@/components/fit/peak/LiveUseArea";
import { PeakArea } from "@/components/fit/peak/PeakArea";
import { PeakResults } from "@/components/fit/peak/PeakResults";
import { PeakTopInfo } from "@/components/fit/peak/PeakTopInfo";
import {
  PEAK_GOALS,
  PEAK_HEADER,
  PEAK_POINTS,
  PEAK_REALTIME,
  PEAK_ROI,
  PEAK_SORT,
} from "@/lib/fit-mocks/peak";

export const metadata = { title: "피크상태" };

export default function FitPeakPage() {
  return (
    <>
      <link rel="stylesheet" href="/fit/assets/css/lib/tom-select.css" precedence="default" />
      <link rel="stylesheet" href="/fit/assets/css/lib/tui-date-picker.css" precedence="default" />
      <link rel="stylesheet" href="/fit/assets/css/peak.css" precedence="default" />
      <main className="peakGrid contents" id="contentsArea">
        <PeakTopInfo header={PEAK_HEADER} />
        <PeakArea realtime={PEAK_REALTIME} points={PEAK_POINTS} />
        <LiveUseArea sort={PEAK_SORT} />
        <PeakResults goals={PEAK_GOALS} roi={PEAK_ROI} />
      </main>
    </>
  );
}

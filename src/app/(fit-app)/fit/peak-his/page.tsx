import { PeakHisPanel } from "@/components/fit/peak-his/PeakHisPanel";

export const metadata = { title: "피크 그래프" };

/**
 * 원본: https://fit.rfenms.com/peakHis.html
 *
 * 원본 CSS 는 /fit/assets/css/ 에서 무변환으로 서빙되므로 클래스명·id 를 그대로 쓴다.
 * 상호작용(기록일·시간 선택, 조회, 차트)은 클라이언트 컴포넌트 PeakHisPanel 이 담당한다.
 */
export default function FitPeakHisPage() {
  return (
    <>
      <link rel="stylesheet" href="/fit/assets/css/lib/tom-select.css" precedence="default" />
      <link rel="stylesheet" href="/fit/assets/css/lib/tui-date-picker.css" precedence="default" />
      <link rel="stylesheet" href="/fit/assets/css/peakHis.css" precedence="default" />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">피크 그래프</h1>
        <PeakHisPanel />
      </main>
    </>
  );
}

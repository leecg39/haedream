import { describe, expect, it } from "vitest";
import {
  extractKepcoElementText,
  normalizeKepcoNumber,
  parseKepcoBillDetail,
} from "@/lib/kepco/parse";

const BILL_HTML = `
  <input type="hidden" name="JOJ_YM" value="2026.08" id="JOJ_YM" />
  <td class="right" id="td_BSCHR">1,234,500</td>
  <td id='td_USKI_CHRG'><strong>2,345,600</strong></td>
  <td id="td_REQ_AMT">3,456,700</td>
  <td id="tot_whm_ngt">100</td>
  <td id="tot_whm_alw">200</td>
  <td id="tot_whm_pk">300</td>
`;

describe("PowerPlanner bill HTML parser", () => {
  it("id 위치와 따옴표 종류에 관계없이 텍스트를 안전하게 추출한다", () => {
    expect(extractKepcoElementText(BILL_HTML, "td_BSCHR")).toBe("1,234,500");
    expect(extractKepcoElementText(BILL_HTML, "td_USKI_CHRG")).toBe("2,345,600");
    expect(extractKepcoElementText(BILL_HTML, "missing")).toBe("");
  });

  it("원본 research 화면에 필요한 상세 청구 필드를 정규화한다", () => {
    expect(parseKepcoBillDetail(BILL_HTML)).toEqual({
      billYm: "202608",
      baseBill: "1234500",
      kwhBill: "2345600",
      reqBill: "3456700",
      lloadUsekwh: "100",
      mloadUsekwh: "200",
      maxloadUsekwh: "300",
    });
  });

  it("미제공 값과 괄호 표기 값을 안전하게 처리한다", () => {
    expect(normalizeKepcoNumber(undefined)).toBe("");
    expect(normalizeKepcoNumber("(1,234)")).toBe("1234");
    expect(parseKepcoBillDetail("<html></html>").billYm).toBe("");
  });
});

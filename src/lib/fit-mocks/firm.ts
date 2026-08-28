/**
 * 업체관리(`/fit/firm`) 데모 목 데이터.
 *
 * 원본은 `https://watt.rfenms.com/api/firm` 에서 fetch 하지만
 * 클론은 네트워크 호출 없이 아래 정적 데이터를 사용한다.
 * 모든 값은 읽기 전용이며 소비하는 쪽에서 절대 변형하지 않는다.
 */

/** 전력타입 코드 → 한글 설명 (원본 firm.js `vio._contract`). */
export const FIRM_CONTRACT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  IEHAS1: "산업용(을)고압A 선택I",
  IEHAS2: "산업용(을)고압A 선택II",
  IEHAS3: "산업용(을)고압A 선택III",
  IEHBS1: "산업용(을)고압B 선택I",
  IEHBS2: "산업용(을)고압B 선택II",
  IEHBS3: "산업용(을)고압B 선택III",
  IEHCS1: "산업용(을)고압C 선택I",
  IEHCS2: "산업용(을)고압C 선택II",
  IEHCS3: "산업용(을)고압C 선택III",
  IGHAS1: "산업용(갑)II고압A 선택I",
  IGHAS2: "산업용(갑)II고압A 선택II",
  IGHBS1: "산업용(갑)II고압B 선택I",
  IGHBS2: "산업용(갑)II고압B 선택II",
  IGL1: "산업용(갑)I 저압",
  NEHAS1: "일반용(을)고압A 선택I",
  NEHAS2: "일반용(을)고압A 선택II",
  NEHAS3: "일반용(을)고압A 선택III",
  NEHBS1: "일반용(을)고압B 선택I",
  NEHBS2: "일반용(을)고압B 선택II",
  NEHBS3: "일반용(을)고압B 선택III",
  NGHAS1: "일반용(갑)II고압A 선택I",
  NGHAS2: "일반용(갑)II고압A 선택II",
  NGHBS1: "일반용(갑)II고압B 선택I",
  NGHBS2: "일반용(갑)II고압B 선택II",
  NGL1: "일반용(갑)I 저압",
});

/** 서비스상태 코드 → 표 노출 라벨 (원본 firm.js `vio._serviceType`). */
export const FIRM_SERVICE_TYPE_LABELS: Readonly<Record<number, string>> = Object.freeze({
  0: "",
  1: "EMS",
  2: "피크",
  3: "저압",
  11: "EMS 준비",
  12: "피크 준비",
  13: "저압 준비",
  21: "EMS 제안",
  22: "피크 제안",
  23: "저압 제안",
});

/** 한 페이지에 노출하는 행 수. 원본 `dbListLimit` 대응. */
export const FIRM_PAGE_LIMIT = 5;

/** 정렬 가능한 컬럼 키 (원본 `th[data-sort]`). */
export type FirmSortKey = "fid" | "firmName" | "contract" | "kepcoNo" | "registTime" | "frugal";

export interface FirmRow {
  /** 업체 ID */
  readonly fid: number;
  readonly firmName: string;
  /** 업체등록일 `YYYY-MM-DD HH:mm:ss` */
  readonly registTime: string;
  /** 전력타입 코드 */
  readonly contract: string;
  /** 한전고객번호 (0 이면 미등록) */
  readonly kepcoNo: number;
  /** EOI 주기(초). 0 이면 미사용 */
  readonly eoiTime: number;
  readonly pct_ratio: number;
  /** 최근전력 kW */
  readonly peakLast: number;
  /** 목표전력 kW */
  readonly powerLimit: number;
  /** 0 수동 / 1 자동 */
  readonly peakRunMode: 0 | 1;
  /** 0 우선순위 / 1 순차 */
  readonly peakControlMode: 0 | 1;
  /** 0 활성 / 1 비활성 */
  readonly isDisable: 0 | 1;
  readonly serviceType: number;
  readonly memo: string;
  /** 연간절감금액(원) */
  readonly frugal: number;
  /** 계약전력 kW */
  readonly contractLimit: number;
  /** 저압 적용전력 kW (0 이면 계약전력 사용) */
  readonly ableLowPower: number;
  /** 최근 5개년 피크 kW */
  readonly maxAbleWatt: number;
  /** 최근 5개년 피크 발생연월 `YYYYMM` */
  readonly maxAbleDate: number;
  /** 제안서 구분 표기 */
  readonly pass: string;
  /** 기상청 지점코드 */
  readonly degreeCity: number;
  readonly bone: string;
  readonly kepcoCyber: string;
  readonly manager: string;
  readonly phone: string;
  readonly addressText: string;
  /** 검침일 1~31 */
  readonly checkDay: number;
  /** 요금적용전력 kW */
  readonly ableLimit: number;
  /** 요금적용날짜 `YYYY-MM-DD` */
  readonly ableLimitTime: string;
  readonly pulse_num: number;
  /** 절감계산시작일 `YYYY-MM-DD` */
  readonly frugalTime: string;
  /** 투자금액(천원) */
  readonly investGold: number;
  /** 이전 전력타입 코드 */
  readonly kepcoContract: string;
  readonly boss: string;
  /** `경도, 위도` */
  readonly mapGeo: string;
}

export const FIRM_ROWS: readonly FirmRow[] = Object.freeze([
  {
    fid: 1001, firmName: "대성정밀공업", registTime: "2023-03-14 09:12:41",
    contract: "IEHAS2", kepcoNo: 1284730915, eoiTime: 15, pct_ratio: 240,
    peakLast: 812, powerLimit: 900, peakRunMode: 1, peakControlMode: 0,
    isDisable: 0, serviceType: 1, memo: "본관 3개동 통합계량",
    frugal: 18420000, contractLimit: 1000, ableLowPower: 0,
    maxAbleWatt: 968, maxAbleDate: 202208, pass: "2차",
    degreeCity: 119, bone: "daesung01", kepcoCyber: "daesung_kepco",
    manager: "김도현", phone: "031-452-7781",
    addressText: "경기도 화성시 향남읍 발안공단로 45", checkDay: 15,
    ableLimit: 980, ableLimitTime: "2025-01-01", pulse_num: 1200,
    frugalTime: "2023-04-01", investGold: 62000, kepcoContract: "IGHAS1",
    boss: "admin", mapGeo: "126.918420, 37.130551",
  },
  {
    fid: 1002, firmName: "한빛식품", registTime: "2023-05-02 14:35:08",
    contract: "NEHBS1", kepcoNo: 3391028477, eoiTime: 0, pct_ratio: 120,
    peakLast: 341, powerLimit: 380, peakRunMode: 0, peakControlMode: 1,
    isDisable: 0, serviceType: 2, memo: "냉동창고 우선 제어",
    frugal: 7350000, contractLimit: 450, ableLowPower: 0,
    maxAbleWatt: 402, maxAbleDate: 202307, pass: "1차",
    degreeCity: 133, bone: "hanbit-food", kepcoCyber: "",
    manager: "이수정", phone: "042-931-2204",
    addressText: "대전광역시 대덕구 문평동 산업로 118", checkDay: 20,
    ableLimit: 420, ableLimitTime: "2025-01-01", pulse_num: 600,
    frugalTime: "2023-06-01", investGold: 21500, kepcoContract: "",
    boss: "admin", mapGeo: "127.412330, 36.412870",
  },
  {
    fid: 1003, firmName: "우진섬유", registTime: "2022-11-21 11:02:55",
    contract: "IEHBS3", kepcoNo: 5573109284, eoiTime: 15, pct_ratio: 300,
    peakLast: 1240, powerLimit: 1300, peakRunMode: 1, peakControlMode: 1,
    isDisable: 0, serviceType: 1, memo: "염색라인 야간 가동",
    frugal: 26780000, contractLimit: 1500, ableLowPower: 0,
    maxAbleWatt: 1462, maxAbleDate: 202108, pass: "2차",
    degreeCity: 143, bone: "woojin-tex", kepcoCyber: "woojin2022",
    manager: "박상혁", phone: "053-585-1190",
    addressText: "대구광역시 달서구 성서공단로 231", checkDay: 10,
    ableLimit: 1480, ableLimitTime: "2025-01-01", pulse_num: 1800,
    frugalTime: "2022-12-01", investGold: 94000, kepcoContract: "IEHBS2",
    boss: "admin", mapGeo: "128.494210, 35.836940",
  },
  {
    fid: 1004, firmName: "청우물류센터", registTime: "2024-01-09 16:48:12",
    contract: "NGHAS1", kepcoNo: 7712045538, eoiTime: 0, pct_ratio: 80,
    peakLast: 265, powerLimit: 300, peakRunMode: 0, peakControlMode: 0,
    isDisable: 1, serviceType: 12, memo: "계량기 교체 대기",
    frugal: 0, contractLimit: 350, ableLowPower: 0,
    maxAbleWatt: 0, maxAbleDate: 0, pass: "",
    degreeCity: 112, bone: "chungwoo", kepcoCyber: "",
    manager: "정미라", phone: "032-877-4412",
    addressText: "인천광역시 서구 가좌동 서곶로 77", checkDay: 25,
    ableLimit: 330, ableLimitTime: "2025-01-01", pulse_num: 400,
    frugalTime: "", investGold: 0, kepcoContract: "",
    boss: "admin", mapGeo: "126.673410, 37.489210",
  },
  {
    fid: 1005, firmName: "남해제강", registTime: "2021-08-30 08:20:37",
    contract: "IEHCS1", kepcoNo: 2204873390, eoiTime: 15, pct_ratio: 600,
    peakLast: 4820, powerLimit: 5000, peakRunMode: 1, peakControlMode: 0,
    isDisable: 0, serviceType: 1, memo: "전기로 2호기 증설 예정",
    frugal: 112400000, contractLimit: 6000, ableLowPower: 0,
    maxAbleWatt: 5730, maxAbleDate: 202007, pass: "2차",
    degreeCity: 155, bone: "namhae-steel", kepcoCyber: "namhae_ind",
    manager: "최영준", phone: "055-264-8801",
    addressText: "경상남도 창원시 성산구 공단로 512", checkDay: 5,
    ableLimit: 5800, ableLimitTime: "2025-01-01", pulse_num: 3600,
    frugalTime: "2021-09-01", investGold: 340000, kepcoContract: "IEHCS2",
    boss: "admin", mapGeo: "128.681240, 35.204410",
  },
  {
    fid: 1006, firmName: "동방화학", registTime: "2023-09-18 10:05:29",
    contract: "IGHBS2", kepcoNo: 6640118273, eoiTime: 15, pct_ratio: 200,
    peakLast: 705, powerLimit: 760, peakRunMode: 1, peakControlMode: 1,
    isDisable: 0, serviceType: 2, memo: "반응기 3기 순차제어",
    frugal: 15980000, contractLimit: 850, ableLowPower: 0,
    maxAbleWatt: 818, maxAbleDate: 202208, pass: "1차",
    degreeCity: 129, bone: "dongbang-chem", kepcoCyber: "",
    manager: "윤태경", phone: "041-668-3320",
    addressText: "충청남도 서산시 대산읍 대산공단로 96", checkDay: 15,
    ableLimit: 830, ableLimitTime: "2025-01-01", pulse_num: 1000,
    frugalTime: "2023-10-01", investGold: 58000, kepcoContract: "",
    boss: "admin", mapGeo: "126.402180, 37.001730",
  },
  {
    fid: 1007, firmName: "그린팜영농조합", registTime: "2024-04-02 13:41:56",
    contract: "NGL1", kepcoNo: 8830271145, eoiTime: 0, pct_ratio: 40,
    peakLast: 78, powerLimit: 90, peakRunMode: 0, peakControlMode: 0,
    isDisable: 0, serviceType: 3, memo: "저압 스마트팜 3동",
    frugal: 3120000, contractLimit: 100, ableLowPower: 85,
    maxAbleWatt: 94, maxAbleDate: 202308, pass: "1차",
    degreeCity: 146, bone: "greenfarm", kepcoCyber: "",
    manager: "한지원", phone: "063-542-7710",
    addressText: "전라북도 김제시 백산면 하십리길 22", checkDay: 20,
    ableLimit: 95, ableLimitTime: "2025-01-01", pulse_num: 200,
    frugalTime: "2024-05-01", investGold: 8400, kepcoContract: "",
    boss: "admin", mapGeo: "126.928710, 35.836210",
  },
  {
    fid: 1008, firmName: "세종메디컬센터", registTime: "2022-06-11 09:58:14",
    contract: "NEHAS3", kepcoNo: 4419907732, eoiTime: 15, pct_ratio: 160,
    peakLast: 1035, powerLimit: 1100, peakRunMode: 1, peakControlMode: 0,
    isDisable: 0, serviceType: 1, memo: "비상발전 연동 필요",
    frugal: 21050000, contractLimit: 1250, ableLowPower: 0,
    maxAbleWatt: 1188, maxAbleDate: 202108, pass: "2차",
    degreeCity: 239, bone: "sejong-med", kepcoCyber: "sejongmed",
    manager: "오하늘", phone: "044-865-1234",
    addressText: "세종특별자치시 도움4로 13", checkDay: 10,
    ableLimit: 1220, ableLimitTime: "2025-01-01", pulse_num: 1500,
    frugalTime: "2022-07-01", investGold: 76000, kepcoContract: "NEHAS2",
    boss: "admin", mapGeo: "127.259140, 36.504120",
  },
  {
    fid: 1009, firmName: "태백리조트", registTime: "2023-12-05 15:22:03",
    contract: "NGHAS2", kepcoNo: 9903442218, eoiTime: 0, pct_ratio: 100,
    peakLast: 528, powerLimit: 580, peakRunMode: 0, peakControlMode: 1,
    isDisable: 0, serviceType: 22, memo: "동절기 피크 집중",
    frugal: 9640000, contractLimit: 650, ableLowPower: 0,
    maxAbleWatt: 612, maxAbleDate: 202301, pass: "1차",
    degreeCity: 216, bone: "taebaek-resort", kepcoCyber: "",
    manager: "강民우", phone: "033-552-6600",
    addressText: "강원도 태백시 소도동 천제단길 88", checkDay: 25,
    ableLimit: 630, ableLimitTime: "2025-01-01", pulse_num: 800,
    frugalTime: "2024-01-01", investGold: 31000, kepcoContract: "",
    boss: "admin", mapGeo: "128.987330, 37.164210",
  },
  {
    fid: 1010, firmName: "제주해양물산", registTime: "2024-07-23 11:47:39",
    contract: "IGL1", kepcoNo: 0, eoiTime: 0, pct_ratio: 40,
    peakLast: 62, powerLimit: 75, peakRunMode: 0, peakControlMode: 0,
    isDisable: 1, serviceType: 13, memo: "한전고객번호 확인중",
    frugal: 0, contractLimit: 80, ableLowPower: 70,
    maxAbleWatt: 0, maxAbleDate: 0, pass: "",
    degreeCity: 184, bone: "jeju-marine", kepcoCyber: "",
    manager: "부성호", phone: "064-712-9080",
    addressText: "제주특별자치도 제주시 한림읍 한림해안로 210", checkDay: 15,
    ableLimit: 78, ableLimitTime: "2025-01-01", pulse_num: 200,
    frugalTime: "", investGold: 0, kepcoContract: "",
    boss: "admin", mapGeo: "126.263180, 33.412870",
  },
  {
    fid: 1011, firmName: "광양전자부품", registTime: "2022-02-17 17:09:44",
    contract: "IEHAS1", kepcoNo: 1108552903, eoiTime: 15, pct_ratio: 180,
    peakLast: 690, powerLimit: 720, peakRunMode: 1, peakControlMode: 1,
    isDisable: 0, serviceType: 1, memo: "클린룸 항온항습 상시",
    frugal: 14230000, contractLimit: 800, ableLowPower: 0,
    maxAbleWatt: 764, maxAbleDate: 202208, pass: "2차",
    degreeCity: 266, bone: "gy-elec", kepcoCyber: "gwangyang_e",
    manager: "서지훈", phone: "061-793-4455",
    addressText: "전라남도 광양시 광양읍 공단1로 37", checkDay: 5,
    ableLimit: 790, ableLimitTime: "2025-01-01", pulse_num: 1000,
    frugalTime: "2022-03-01", investGold: 47000, kepcoContract: "IEHAS2",
    boss: "admin", mapGeo: "127.596210, 34.972140",
  },
  {
    fid: 1012, firmName: "울산정밀화학", registTime: "2021-10-08 08:31:20",
    contract: "IEHBS1", kepcoNo: 2287340016, eoiTime: 15, pct_ratio: 400,
    peakLast: 2410, powerLimit: 2500, peakRunMode: 1, peakControlMode: 0,
    isDisable: 0, serviceType: 21, memo: "2공장 증설 검토",
    frugal: 58900000, contractLimit: 2800, ableLowPower: 0,
    maxAbleWatt: 2712, maxAbleDate: 202008, pass: "1차",
    degreeCity: 152, bone: "ulsan-chem", kepcoCyber: "",
    manager: "임채원", phone: "052-277-8812",
    addressText: "울산광역시 남구 여천동 산업로 1204", checkDay: 20,
    ableLimit: 2760, ableLimitTime: "2025-01-01", pulse_num: 2400,
    frugalTime: "2021-11-01", investGold: 185000, kepcoContract: "",
    boss: "admin", mapGeo: "129.334120, 35.512430",
  },
]);

/** 원본 vio.kakaoMap 의 기본 좌표(청주 인근). 데모 지도 모달 표시용. */
export const FIRM_DEFAULT_GEO = "127.4888, 36.6426";

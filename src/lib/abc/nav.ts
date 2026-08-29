/**
 * AUTO-DERIVED from docs/research/abc.watt/pages/include/leftnav.html
 * ABC EMS(watt.rfenms.com) 좌측 내비게이션 메뉴.
 * disabled=권한 placeholder, items=하위그룹, href=직접링크.
 */

export interface AbcNavItem {
  readonly href: string;
  readonly label: string;
}

export interface AbcNavGroup {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly href?: string;
  readonly items?: readonly AbcNavItem[];
}

export const ABC_NAV: readonly AbcNavGroup[] = [
  {
    "id": "stat",
    "icon": "bi bi-globe2",
    "label": "통합관제",
    "disabled": true,
    "href": "/stat.html"
  },
  {
    "id": "firm",
    "icon": "bi bi-people-fill",
    "label": "업체관리",
    "disabled": true,
    "href": "/firm.html"
  },
  {
    "id": "main",
    "icon": "bi bi-house-door",
    "label": "대시보드",
    "items": [
      {
        "href": "/main.html",
        "label": "대시보드 위젯"
      },
      {
        "href": "/wattMain.html",
        "label": "대시보드 전력메인"
      },
      {
        "href": "/solar.html",
        "label": "태양광 대시보드"
      }
    ]
  },
  {
    "id": "consulting",
    "icon": "bi bi-person-rolodex",
    "label": "컨설팅",
    "disabled": true,
    "href": "/consulting.html"
  },
  {
    "id": "peak",
    "icon": "bi bi-speedometer2",
    "label": "피크관리",
    "items": [
      {
        "href": "/peak.html",
        "label": "피크상태"
      },
      {
        "href": "/peakPanel.html",
        "label": "부하상황판"
      },
      {
        "href": "/peakSet.html",
        "label": "피크 제어설정"
      },
      {
        "href": "/peakHis.html",
        "label": "피크 그래프"
      },
      {
        "href": "/powerUsage.html",
        "label": "전력 사용 보고서"
      },
      {
        "href": "/peakUsage.html",
        "label": "피크 15분 전력보고서"
      },
      {
        "href": "/controlHis.html",
        "label": "피크제어이력"
      },
      {
        "href": "/acp.html",
        "label": "시스템에어컨"
      }
    ]
  },
  {
    "id": "watt",
    "icon": "bi bi-bar-chart",
    "label": "전력사용량",
    "items": [
      {
        "href": "/powerPage.html",
        "label": "전력사용량 보기"
      },
      {
        "href": "/wattPrediction.html",
        "label": "소비량 예측"
      }
    ]
  },
  {
    "id": "enpi",
    "icon": "bi bi-graph-down",
    "label": "절감효과",
    "href": "/enpi.html"
  },
  {
    "id": "monit",
    "icon": "bi bi-diagram-3",
    "label": "계통감시",
    "items": [
      {
        "href": "/monit.html",
        "label": "계통감시"
      },
      {
        "href": "/energyMonit.html",
        "label": "공정별 에너지 계통"
      }
    ]
  },
  {
    "id": "tech",
    "icon": "bi bi-sliders",
    "label": "설비관리",
    "items": [
      {
        "href": "/techSettings.html",
        "label": "제어설비목록"
      },
      {
        "href": "/techUsage.html",
        "label": "주요설비 이용률"
      },
      {
        "href": "/techOver.html",
        "label": "주요설비 부하율"
      },
      {
        "href": "/techTree.html",
        "label": "설비 제어"
      },
      {
        "href": "/techPlan.html",
        "label": "최적화 제어"
      },
      {
        "href": "/techHis.html",
        "label": "최적화 제어이력"
      },
      {
        "href": "/compressor.html",
        "label": "콤프레셔"
      },
      {
        "href": "/thermos.html",
        "label": "온도"
      },
      {
        "href": "/gasReports.html",
        "label": "가스 사용량"
      },
      {
        "href": "/techFrozen.html",
        "label": "냉난방 제어"
      },
      {
        "href": "/plc.html",
        "label": "PLC 제어 관리"
      }
    ]
  },
  {
    "id": "analysis",
    "icon": "bi bi-input-cursor",
    "label": "비교분석",
    "items": [
      {
        "href": "/kpi.html",
        "label": "목표대비 비교분석"
      },
      {
        "href": "/sensor.html",
        "label": "개별계측기관리"
      },
      {
        "href": "/reportFine.html",
        "label": "전력사용현황"
      },
      {
        "href": "/loads.html",
        "label": "가상부하분산"
      }
    ]
  },
  {
    "id": "report",
    "icon": "bi bi-file-earmark-bar-graph",
    "label": "보고서",
    "items": [
      {
        "href": "/report.html",
        "label": "종합보고서"
      },
      {
        "href": "/reportPower.html",
        "label": "전력요금보고서"
      },
      {
        "href": "/reportIK.html",
        "label": "전력사용량분석보고서"
      },
      {
        "href": "/reportToe.html",
        "label": "온실가스배출보고서"
      },
      {
        "href": "/reportUnit.html",
        "label": "기간별 전력사용량"
      },
      {
        "href": "/reportFacilities.html",
        "label": "설비별 전력상세정보"
      },
      {
        "href": "/reportTotal.html",
        "label": "공정별 보고서"
      }
    ]
  }
];

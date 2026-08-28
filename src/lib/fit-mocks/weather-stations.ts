/**
 * 원본 firm.html `#edit-degreeCity` 의 기상청 지점 목록.
 * 냉방도일/난방도일 측정 위치 기준이며, 원본 마크업에서 기계적으로 추출했다.
 */

export interface WeatherStationGroup {
  readonly label: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
}

export const WEATHER_STATION_GROUPS: readonly WeatherStationGroup[] = [
  {
    "label": "서울특별시",
    "options": [
      {
        "value": "108",
        "label": "서울"
      }
    ]
  },
  {
    "label": "부산광역시",
    "options": [
      {
        "value": "159",
        "label": "부산"
      }
    ]
  },
  {
    "label": "대구광역시",
    "options": [
      {
        "value": "143",
        "label": "대구"
      }
    ]
  },
  {
    "label": "인천광역시",
    "options": [
      {
        "value": "201",
        "label": "강화"
      },
      {
        "value": "102",
        "label": "백령도"
      },
      {
        "value": "112",
        "label": "인천"
      }
    ]
  },
  {
    "label": "광주광역시",
    "options": [
      {
        "value": "156",
        "label": "광주"
      }
    ]
  },
  {
    "label": "대전광역시",
    "options": [
      {
        "value": "133",
        "label": "대전"
      }
    ]
  },
  {
    "label": "울산광역시",
    "options": [
      {
        "value": "152",
        "label": "울산"
      }
    ]
  },
  {
    "label": "경기도",
    "options": [
      {
        "value": "98",
        "label": "동두천"
      },
      {
        "value": "119",
        "label": "수원"
      },
      {
        "value": "202",
        "label": "양평"
      },
      {
        "value": "203",
        "label": "이천"
      },
      {
        "value": "99",
        "label": "파주"
      }
    ]
  },
  {
    "label": "강원도",
    "options": [
      {
        "value": "105",
        "label": "강릉"
      },
      {
        "value": "100",
        "label": "대관령"
      },
      {
        "value": "106",
        "label": "동해"
      },
      {
        "value": "104",
        "label": "북강릉"
      },
      {
        "value": "93",
        "label": "북춘천"
      },
      {
        "value": "90",
        "label": "속초"
      },
      {
        "value": "121",
        "label": "영월"
      },
      {
        "value": "114",
        "label": "원주"
      },
      {
        "value": "211",
        "label": "인제"
      },
      {
        "value": "217",
        "label": "정선군"
      },
      {
        "value": "95",
        "label": "철원"
      },
      {
        "value": "101",
        "label": "춘천"
      },
      {
        "value": "216",
        "label": "태백"
      },
      {
        "value": "212",
        "label": "홍천"
      }
    ]
  },
  {
    "label": "충청북도",
    "options": [
      {
        "value": "226",
        "label": "보은"
      },
      {
        "value": "221",
        "label": "제천"
      },
      {
        "value": "131",
        "label": "청주"
      },
      {
        "value": "135",
        "label": "추풍령"
      },
      {
        "value": "127",
        "label": "충주"
      }
    ]
  },
  {
    "label": "충청남도",
    "options": [
      {
        "value": "238",
        "label": "금산"
      },
      {
        "value": "235",
        "label": "보령"
      },
      {
        "value": "236",
        "label": "부여"
      },
      {
        "value": "129",
        "label": "서산"
      },
      {
        "value": "232",
        "label": "천안"
      },
      {
        "value": "177",
        "label": "홍성"
      }
    ]
  },
  {
    "label": "전라북도",
    "options": [
      {
        "value": "172",
        "label": "고창"
      },
      {
        "value": "251",
        "label": "고창군"
      },
      {
        "value": "140",
        "label": "군산"
      },
      {
        "value": "247",
        "label": "남원"
      },
      {
        "value": "243",
        "label": "부안"
      },
      {
        "value": "254",
        "label": "순창군"
      },
      {
        "value": "244",
        "label": "임실"
      },
      {
        "value": "248",
        "label": "장수"
      },
      {
        "value": "146",
        "label": "전주"
      },
      {
        "value": "245",
        "label": "정읍"
      }
    ]
  },
  {
    "label": "전라남도",
    "options": [
      {
        "value": "259",
        "label": "강진군"
      },
      {
        "value": "262",
        "label": "고흥"
      },
      {
        "value": "266",
        "label": "광양시"
      },
      {
        "value": "165",
        "label": "목포"
      },
      {
        "value": "258",
        "label": "보성군"
      },
      {
        "value": "174",
        "label": "순천"
      },
      {
        "value": "168",
        "label": "여수"
      },
      {
        "value": "252",
        "label": "영광군"
      },
      {
        "value": "170",
        "label": "완도"
      },
      {
        "value": "260",
        "label": "장흥"
      },
      {
        "value": "268",
        "label": "진도군"
      },
      {
        "value": "261",
        "label": "해남"
      },
      {
        "value": "169",
        "label": "흑산도"
      }
    ]
  },
  {
    "label": "경상북도",
    "options": [
      {
        "value": "283",
        "label": "경주시"
      },
      {
        "value": "279",
        "label": "구미"
      },
      {
        "value": "273",
        "label": "문경"
      },
      {
        "value": "271",
        "label": "봉화"
      },
      {
        "value": "137",
        "label": "상주"
      },
      {
        "value": "136",
        "label": "안동"
      },
      {
        "value": "277",
        "label": "영덕"
      },
      {
        "value": "272",
        "label": "영주"
      },
      {
        "value": "281",
        "label": "영천"
      },
      {
        "value": "115",
        "label": "울릉도"
      },
      {
        "value": "130",
        "label": "울진"
      },
      {
        "value": "278",
        "label": "의성"
      },
      {
        "value": "276",
        "label": "청송군"
      },
      {
        "value": "138",
        "label": "포항"
      }
    ]
  },
  {
    "label": "경상남도",
    "options": [
      {
        "value": "294",
        "label": "거제"
      },
      {
        "value": "284",
        "label": "거창"
      },
      {
        "value": "253",
        "label": "김해시"
      },
      {
        "value": "295",
        "label": "남해"
      },
      {
        "value": "288",
        "label": "밀양"
      },
      {
        "value": "255",
        "label": "북창원"
      },
      {
        "value": "289",
        "label": "산청"
      },
      {
        "value": "257",
        "label": "양산시"
      },
      {
        "value": "263",
        "label": "의령군"
      },
      {
        "value": "192",
        "label": "진주"
      },
      {
        "value": "155",
        "label": "창원"
      },
      {
        "value": "162",
        "label": "통영"
      },
      {
        "value": "264",
        "label": "함양군"
      },
      {
        "value": "285",
        "label": "합천"
      }
    ]
  },
  {
    "label": "제주도",
    "options": [
      {
        "value": "185",
        "label": "고산"
      },
      {
        "value": "189",
        "label": "서귀포"
      },
      {
        "value": "188",
        "label": "성산"
      },
      {
        "value": "184",
        "label": "제주"
      }
    ]
  },
  {
    "label": "세종특별자치시",
    "options": [
      {
        "value": "239",
        "label": "세종"
      }
    ]
  }
];

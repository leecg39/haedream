'use strict';
vio._contract = {
    'IEHAS1': '산업용(을)고압A 선택I',
    'IEHAS2': '산업용(을)고압A 선택II',
    'IEHAS3': '산업용(을)고압A 선택III',
    'IEHBS1': '산업용(을)고압B 선택I',
    'IEHBS2': '산업용(을)고압B 선택II',
    'IEHBS3': '산업용(을)고압B 선택III',
    'IEHCS1': '산업용(을)고압C 선택I',
    'IEHCS2': '산업용(을)고압C 선택II',
    'IEHCS3': '산업용(을)고압C 선택III',
    'IGHAS1': '산업용(갑)II고압A 선택I',
    'IGHAS2': '산업용(갑)II고압A 선택II',
    'IGHBS1': '산업용(갑)II고압B 선택I',
    'IGHBS2': '산업용(갑)II고압B 선택II',
    'IGL1': '산업용(갑)I 저압',
    'NEHAS1': '일반용(을)고압A 선택I',
    'NEHAS2': '일반용(을)고압A 선택II',
    'NEHAS3': '일반용(을)고압A 선택III',
    'NEHBS1': '일반용(을)고압B 선택I',
    'NEHBS2': '일반용(을)고압B 선택II',
    'NEHBS3': '일반용(을)고압B 선택III',
    'NGHAS1': '일반용(갑)II고압A 선택I',
    'NGHAS2': '일반용(갑)II고압A 선택II',
    'NGHBS1': '일반용(갑)II고압B 선택I',
    'NGHBS2': '일반용(갑)II고압B 선택II',
    'NGL1': '일반용(갑)I 저압',
};
vio._serviceType = {
    0: '',
    1: 'EMS',
    2: '피크',
    3: '저압',
    11: 'EMS 준비',
    12: '피크 준비',
    13: '저압 준비',
    21: 'EMS 제안',
    22: '피크 제안',
    23: '저압 제안',
};
vio._degreeCity = [
    { code: 108, lat: 37.5714, lng: 126.9658, region: '서울' }, // 서울
    { code: 159, lat: 35.1047, lng: 129.0326, region: '부산' }, // 부산
    { code: 143, lat: 35.8776, lng: 128.6529, region: '대구' }, // 대구
    { code: 112, lat: 37.4772, lng: 126.6246, region: '인천' }, // 인천
    { code: 201, lat: 37.7079, lng: 126.4459, region: '인천' }, // 인천 강화
    { code: 102, lat: 37.9667, lng: 124.6333, region: '인천' }, // 인천 백령도
    { code: 156, lat: 35.1595, lng: 126.8526, region: '광주' }, // 광주
    { code: 133, lat: 36.3504, lng: 127.3845, region: '대전' }, // 대전
    { code: 152, lat: 35.5384, lng: 129.3114, region: '울산' }, // 울산
    { code: 98,  lat: 37.9019, lng: 127.0607, region: '경기' }, // 동두천
    { code: 119, lat: 37.2636, lng: 127.0286, region: '경기' }, // 수원
    { code: 202, lat: 37.4871, lng: 127.4871, region: '경기' }, // 양평
    { code: 203, lat: 37.2713, lng: 127.4348, region: '경기' }, // 이천
    { code: 99,  lat: 37.8859, lng: 126.7665, region: '경기' }, // 파주
    { code: 105, lat: 37.7515, lng: 128.8766, region: '강원특별자치도' }, // 강릉
    { code: 100, lat: 37.6771, lng: 128.7180, region: '강원특별자치도' }, // 대관령
    { code: 106, lat: 37.5248, lng: 129.1186, region: '강원특별자치도' }, // 동해
    { code: 104, lat: 37.8046, lng: 128.8960, region: '강원특별자치도' }, // 북강릉
    { code: 93,  lat: 37.9474, lng: 127.7540, region: '강원특별자치도' }, // 북춘천
    { code: 90,  lat: 38.2509, lng: 128.5650, region: '강원특별자치도' }, // 속초
    { code: 121, lat: 37.1815, lng: 128.4815, region: '강원특별자치도' }, // 영월
    { code: 114, lat: 37.3420, lng: 127.9200, region: '강원특별자치도' }, // 원주
    { code: 211, lat: 38.0565, lng: 128.2160, region: '강원특별자치도' }, // 인제
    { code: 217, lat: 37.3622, lng: 128.6586, region: '강원특별자치도' }, // 정선군
    { code: 95,  lat: 38.1479, lng: 127.3042, region: '강원특별자치도' }, // 철원
    { code: 101, lat: 37.9026, lng: 127.7360, region: '강원특별자치도' }, // 춘천
    { code: 216, lat: 37.1732, lng: 128.9851, region: '강원특별자치도' }, // 태백
    { code: 212, lat: 37.7014, lng: 127.9201, region: '강원특별자치도' }, // 홍천
    { code: 226, lat: 36.4870, lng: 127.7220, region: '충북' }, // 보은
    { code: 221, lat: 37.1306, lng: 128.2082, region: '충북' }, // 제천
    { code: 131, lat: 36.6425, lng: 127.4890, region: '충북' }, // 청주
    { code: 135, lat: 36.2283, lng: 127.9195, region: '충북' }, // 추풍령
    { code: 127, lat: 36.9832, lng: 127.9265, region: '충북' }, // 충주
    { code: 238, lat: 36.1111, lng: 127.4890, region: '충남' }, // 금산
    { code: 235, lat: 36.3345, lng: 126.5937, region: '충남' }, // 보령
    { code: 236, lat: 36.2785, lng: 126.9021, region: '충남' }, // 부여
    { code: 129, lat: 36.7830, lng: 126.4506, region: '충남' }, // 서산
    { code: 232, lat: 36.8155, lng: 127.1135, region: '충남' }, // 천안
    { code: 177, lat: 36.5986, lng: 126.6600, region: '충남' }, // 홍성
    { code: 172, lat: 35.4327, lng: 126.6953, region: '전북특별자치도' }, // 고창
    { code: 251, lat: 35.4310, lng: 126.6870, region: '전북특별자치도' }, // 고창군
    { code: 140, lat: 35.9670, lng: 126.7365, region: '전북특별자치도' }, // 군산
    { code: 247, lat: 35.4161, lng: 127.3910, region: '전북특별자치도' }, // 남원
    { code: 243, lat: 35.7293, lng: 126.7243, region: '전북특별자치도' }, // 부안
    { code: 254, lat: 35.3300, lng: 127.0975, region: '전북특별자치도' }, // 순창군
    { code: 244, lat: 35.5973, lng: 127.2201, region: '전북특별자치도' }, // 임실
    { code: 248, lat: 35.6215, lng: 127.4462, region: '전북특별자치도' }, // 장수
    { code: 146, lat: 35.8213, lng: 127.1480, region: '전북특별자치도' }, // 전주
    { code: 245, lat: 35.5680, lng: 126.8575, region: '전북특별자치도' }, // 정읍
    { code: 259, lat: 34.6343, lng: 126.7640, region: '전남' }, // 강진군
    { code: 262, lat: 34.6156, lng: 127.2933, region: '전남' }, // 고흥
    { code: 266, lat: 34.9400, lng: 127.7197, region: '전남' }, // 광양시
    { code: 165, lat: 34.8086, lng: 126.3923, region: '전남' }, // 목포
    { code: 258, lat: 34.7441, lng: 127.0802, region: '전남' }, // 보성군
    { code: 174, lat: 34.9491, lng: 127.4871, region: '전남' }, // 순천
    { code: 168, lat: 34.7604, lng: 127.6622, region: '전남' }, // 여수
    { code: 252, lat: 35.2691, lng: 126.5073, region: '전남' }, // 영광군
    { code: 170, lat: 34.3067, lng: 126.7576, region: '전남' }, // 완도
    { code: 260, lat: 34.6986, lng: 126.9043, region: '전남' }, // 장흥
    { code: 268, lat: 34.4796, lng: 126.2783, region: '전남' }, // 진도군
    { code: 261, lat: 34.5742, lng: 126.6025, region: '전남' }, // 해남
    { code: 169, lat: 34.7217, lng: 125.8862, region: '전남' }, // 흑산도
    { code: 283, lat: 35.8562, lng: 129.2247, region: '경북' }, // 경주시
    { code: 279, lat: 36.1216, lng: 128.3443, region: '경북' }, // 구미
    { code: 273, lat: 36.5808, lng: 128.1811, region: '경북' }, // 문경
    { code: 271, lat: 36.8867, lng: 128.7360, region: '경북' }, // 봉화
    { code: 137, lat: 36.4120, lng: 128.1603, region: '경북' }, // 상주
    { code: 136, lat: 36.5682, lng: 128.7269, region: '경북' }, // 안동
    { code: 277, lat: 36.3810, lng: 129.3640, region: '경북' }, // 영덕
    { code: 272, lat: 36.8208, lng: 128.6271, region: '경북' }, // 영주
    { code: 281, lat: 35.9668, lng: 128.9222, region: '경북' }, // 영천
    { code: 115, lat: 37.4869, lng: 130.8905, region: '경북' }, // 울릉도
    { code: 130, lat: 36.9915, lng: 129.4022, region: '경북' }, // 울진
    { code: 278, lat: 36.3456, lng: 128.6997, region: '경북' }, // 의성
    { code: 276, lat: 36.4305, lng: 129.0567, region: '경북' }, // 청송군
    { code: 138, lat: 36.0203, lng: 129.3426, region: '경북' }, // 포항
    { code: 294, lat: 34.8747, lng: 128.6153, region: '경남' }, // 거제
    { code: 284, lat: 35.6876, lng: 127.9053, region: '경남' }, // 거창
    { code: 253, lat: 35.2296, lng: 128.8876, region: '경남' }, // 김해시
    { code: 295, lat: 34.8421, lng: 127.9052, region: '경남' }, // 남해
    { code: 288, lat: 35.3140, lng: 128.7483, region: '경남' }, // 밀양
    { code: 255, lat: 35.2502, lng: 128.6736, region: '경남' }, // 북창원
    { code: 289, lat: 35.3557, lng: 127.8888, region: '경남' }, // 산청
    { code: 257, lat: 35.3391, lng: 129.0370, region: '경남' }, // 양산시
    { code: 263, lat: 35.3365, lng: 128.2776, region: '경남' }, // 의령군
    { code: 192, lat: 35.1797, lng: 128.1193, region: '경남' }, // 진주
    { code: 155, lat: 35.2281, lng: 128.6811, region: '경남' }, // 창원
    { code: 162, lat: 34.8556, lng: 128.4350, region: '경남' }, // 통영
    { code: 264, lat: 35.5265, lng: 127.7303, region: '경남' }, // 함양군
    { code: 285, lat: 35.5372, lng: 128.1075, region: '경남' }, // 합천
    { code: 185, lat: 33.2797, lng: 126.1610, region: '제주특별자치도' }, // 고산
    { code: 189, lat: 33.2500, lng: 126.5650, region: '제주특별자치도' }, // 서귀포
    { code: 188, lat: 33.4604, lng: 126.9000, region: '제주특별자치도' }, // 성산
    { code: 184, lat: 33.4890, lng: 126.4983, region: '제주특별자치도' }, // 제주
    { code: 239, lat: 36.4800, lng: 127.2890, region: '세종특별자치시' }, // 세종
];
vio._geocoder = window.kakao && kakao.maps && kakao.maps.services ? new kakao.maps.services.Geocoder() : null;

vio.deskEditFixed = async function() {
    const dom = document,
        method = this._sheet.idn ? 'PATCH' : 'PUT',
        params = {
            idn: this._sheet.idn,
            firmName: dom.getElementById('edit-firmName').value,
            contract: dom.getElementById('edit-contract').value,
            kepcoNo: dom.getElementById('edit-kepcoNo').value,
            pct_ratio: dom.getElementById('edit-pct_ratio').value,
            pulse_num: dom.getElementById('edit-pulse_num').value,
            powerLimit: dom.getElementById('edit-powerLimit').value,
            peakRunMode: dom.getElementById('edit-peakRunMode').value,
            peakControlMode: dom.getElementById('edit-peakControlMode').value,
            isDisable: dom.getElementById('edit-isDisable').value,
            memo: dom.getElementById('edit-memo').value,
            contractLimit: dom.getElementById('edit-contractLimit').value,
            ableLimit: dom.getElementById('edit-ableLimit').value,
            ableLimitTime: dom.getElementById('edit-ableLimitTime').value,
            bone: dom.getElementById('edit-bone').value,
            checkDay: dom.getElementById('edit-checkDay').value,
            passwd: dom.getElementById('edit-passwd').value,
            kepcoPasswd: dom.getElementById('edit-kepcoPasswd').value,
            manager: dom.getElementById('edit-manager').value,
            phone: dom.getElementById('edit-phone').value,
            addressText: dom.getElementById('edit-addressText').value,
            mapGeo: dom.getElementById('edit-mapGeo').value,
            serviceType: dom.getElementById('edit-serviceType').value,
            degreeCity: dom.getElementById('edit-degreeCity').value,
            frugalTime: dom.getElementById('edit-frugalTime').value,
            investGold: dom.getElementById('edit-investGold').value,
            kepcoContract: dom.getElementById('edit-kepcoContract').value,
            kepcoCyber: dom.getElementById('edit-kepcoCyber').value,
            boss: dom.getElementById('edit-boss').value
        };

    const result = await this.kakaoAddress();
    if (result) {
        const { lat, lng, code } = result;

        params.mapGeo = `${lng}, ${lat}`;
        if (code) {
            params.degreeCity = code;
            dom.getElementById('edit-degreeCity').value = code;
        }
    }

    if (!params.firmName) {
        this.toast({memo: '업체이름을 입력하세요.'});
    } else if (/[#&+\-%@=\/\\:;,.'"^`~|!?*$#<>()\[\]{}]/i.test(params.bone)) {
        this.toast({memo: '아이디에 특수문자를 사용할 수 없습니다.'});
    } else if (params.passwd.length > 0 && !this.checkPasswordText(params.passwd)) {
        this.toast({memo: '숫자, 영문, 특수문자 포함 8자리를 입력하세요.'});
    } else if (params.serviceType == '0') {
        this.toast({memo: '서비스상태를 선택해주세요.'});
    } else if (params.addressText == '') {
        this.toast({memo: '업체주소를 입력해주세요.'});
    } else if (params.degreeCity == '0') {
        this.toast({memo: '기상청지점을 선택해주세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`${this._apiUrl}/api/firm/${this._fid}`, {
            method: method,
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(params)
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this.toast({memo: '확인 되었습니다.'});
                this.getData(this._sheet.page);
                dom.getElementById('modal').classList.add('disable');
                
                // 업체 목록 업데이트
                await vio.updateMembers(jsonData.data);
            }
        }
    }

};

/**
 * 주소 위도 경도 업데이트 및 가까운 기상청 지점 선택
 * @returns {Promise<{code: number, lat: number, lng: number}|null>}
 */
vio.kakaoAddress = async function() {
    return new Promise((resolve, reject) => {
        const addressText = document.getElementById('edit-addressText').value;
        if (!addressText) return resolve({ lat: 0, lng: 0, code: 0 });

        // 주소로 좌표 검색
        if (vio._geocoder !== null) {
            vio._geocoder.addressSearch(addressText, (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    const lat = parseFloat(result[0].y);
                    const lng = parseFloat(result[0].x);

                    // region_1depth_name 확인하려면 result[0].address_name 또는 별도 처리 필요
                    const region = result[0].address_name.split(' ')[0]; // 예: "부산"

                    // 같은 region 안에서 가장 가까운 기상청 지점 찾기
                    const getDistance = (lat1, lng1, lat2, lng2) => {
                        const R = 6371;
                        const dLat = (lat2 - lat1) * Math.PI / 180;
                        const dLng = (lng2 - lng1) * Math.PI / 180;
                        const a = Math.sin(dLat/2)**2 +
                            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
                            Math.sin(dLng/2)**2;
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                        return R * c;
                    };

                    const stationsInRegion = vio._degreeCity.filter(s => s.region === region);
                    if (stationsInRegion.length === 0) stationsInRegion.push(...vio._degreeCity);

                    let nearestStation = null;
                    let minDistance = Infinity;
                    stationsInRegion.forEach(s => {
                        const d = getDistance(lat, lng, s.lat, s.lng);
                        if (d < minDistance) {
                            minDistance = d;
                            nearestStation = s;
                        }
                    });

                    // select 박스 자동 선택
                    if (nearestStation) {
                        const select = document.getElementById('edit-degreeCity');
                        if (select) select.value = nearestStation.code;
                    }

                    resolve({ lat, lng, code: nearestStation ? nearestStation.code : 0 });
                } else {
                    console.warn('주소 검색 실패', status);
                    resolve({ lat: 0, lng: 0, code: 0 });
                }
            });
        }
    });
};

/**
 * 업체 목록 업데이트
 * @param newItem
 * @returns {Promise<void>}
 */
vio.updateMembers = async function(newItem) {
    if (!newItem) return;

    const existingItem = this._members.find(item => item.fid === newItem.fid);

    if (existingItem) {
        // 수정
        existingItem.name = newItem.name;
    } else {
        // 추가
        const index = this._members.findIndex(item => item.name > newItem.name);
        if (index === -1) {
            this._members.push(newItem);
        } else {
            this._members.splice(index, 0, newItem);
        }
    }

    sessionStorage.setItem('members', JSON.stringify(this._members));

    vio.rebuildSelect2();
};

/**
 * select2 재설정
 */
vio.rebuildSelect2 = function() {
    const $select = $('#firmSelect'); // 🔹 select 요소 확인

    // 기존 선택된 값 저장
    const selectedValue = $select.val();
    $select.select2('destroy'); // 기존 select2 제거

    // 기존 옵션 삭제 후 새로운 데이터 추가
    $select.empty();
    vio._members.forEach(member => {
        $select.append(new Option(member.name, member.fid, false, false));
    });

    // select2 초기화
    $select.select2({matcher: customMatcher});

    // 기존 선택 값 복원 (값이 존재하면 다시 선택)
    if (selectedValue) {
        $select.val(selectedValue).trigger('change');
    }

    function customMatcher(params, data) {
        if ($.trim(params.term) === '') {
            return data;
        }

        // 검색어와 데이터의 초기화 (소문자로 변환)
        const term = params.term.toLowerCase();
        const dataText = data.text.toLowerCase();

        // 검색어와 데이터의 초성을 추출
        const termInitials = convertDoubleConsonants(extractInitials(term));
        const dataInitials = extractInitials(dataText);

        // 검색어가 초성인 경우 초성 매칭
        if (termInitials === term && dataInitials.indexOf(termInitials) > -1) {
            return data;
        }

        // 검색어가 단어인 경우 단어 매칭
        if (dataText.indexOf(term) > -1) {
            return data;
        }

        return null;
    }
    function extractInitials(text) {
        const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
        const CHO_DOUBLE = {
            'ㄳ': 'ㄱㅅ',
            'ㄵ': 'ㄴㅈ',
            'ㄶ': 'ㄴㅎ',
            'ㄺ': 'ㄹㄱ',
            'ㄻ': 'ㄹㅁ',
            'ㄼ': 'ㄹㅂ',
            'ㄽ': 'ㄹㅅ',
            'ㄾ': 'ㄹㅌ',
            'ㄿ': 'ㄹㅍ',
            'ㅀ': 'ㄹㅎ',
            'ㅄ': 'ㅂㅅ'
        };
        let result = '';

        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            const code = text.charCodeAt(i) - 44032;

            if (CHO_DOUBLE[char]) {
                result += CHO_DOUBLE[char];
            } else if (code > -1 && code < 11172) {
                result += CHO[Math.floor(code / 588)];
            } else {
                result += char;
            }
        }

        return result;
    }
    // 복합 자음을 단일 자음으로 변환하는 함수
    function convertDoubleConsonants(text) {
        const DOUBLE_TO_SINGLE = {
            'ㄵ': 'ㄴㅈ',
            'ㄶ': 'ㄴㅎ',
            'ㄺ': 'ㄹㄱ',
            'ㄻ': 'ㄹㅁ',
            'ㄼ': 'ㄹㅂ',
            'ㄽ': 'ㄹㅅ',
            'ㄾ': 'ㄹㅌ',
            'ㄿ': 'ㄹㅍ',
            'ㅀ': 'ㄹㅎ',
            'ㄳ': 'ㄱㅅ',
            'ㅄ': 'ㅂㅅ'
        };

        let converted = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            converted += DOUBLE_TO_SINGLE[char] || char;
        }

        return converted;
    }
};

vio.deskEditPop = function(j) {
    const dom = document;

    this._sheet.idn = j.fid || 0;
    dom.getElementById('edit-firmName').value = j.firmName || '';
    dom.getElementById('edit-contract').value = j.contract || '';
    dom.getElementById('edit-kepcoNo').value = j.kepcoNo ? j.kepcoNo.toString().padStart(10, '0') : '';
    dom.getElementById('edit-pct_ratio').value = j.pct_ratio || 0;
    dom.getElementById('edit-pulse_num').value = j.pulse_num || 0;
    dom.getElementById('edit-powerLimit').value = j.powerLimit || 0;
    dom.getElementById('edit-peakRunMode').value = j.peakRunMode || 0;
    dom.getElementById('edit-peakControlMode').value = j.peakControlMode || 0;
    dom.getElementById('edit-isDisable').value = j.isDisable || 0;
    dom.getElementById('edit-memo').value = j.memo || '';
    dom.getElementById('edit-contractLimit').value = j.contractLimit || '';
    dom.getElementById('edit-ableLimit').value = j.ableLimit || '';
    dom.getElementById('edit-ableLimitTime').value = j.ableLimitTime > 0 ? this.echoDate('y-m-d', j.ableLimitTime) : '2025-01-01';
    dom.getElementById('edit-bone').value = j.bone || '';
    dom.getElementById('edit-checkDay').value = j.checkDay || '';
    dom.getElementById('edit-passwd').value = '';
    dom.getElementById('edit-kepcoPasswd').value = j.kepcoPasswd || '';
    dom.getElementById('edit-manager').value = j.manager || '';
    dom.getElementById('edit-phone').value = j.phone || '';
    dom.getElementById('edit-addressText').value = j.addressText || '';
    dom.getElementById('edit-serviceType').value = j.serviceType || 0;
    dom.getElementById('edit-degreeCity').value = j.degreeCity || 0;
    dom.getElementById('edit-frugalTime').value = j.frugalTime > 0 ? this.echoDate('y-m-d', j.frugalTime) : '';
    dom.getElementById('edit-investGold').value = j.investGold || 0;
    dom.getElementById('edit-kepcoContract').value = j.kepcoContract || '';
    dom.getElementById('edit-kepcoCyber').value = j.kepcoCyber || '';
    dom.getElementById('edit-boss').value = j.boss || '';

    dom.getElementById('modal').classList.remove('disable');
    dom.getElementById('edit-mapGeo').value = dom.getElementById('edit-mapGeo').value.replace(/[^0-9\.\s]/g, '').replace(' ', ', ');
};

vio.deskItem = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        this._sheet.idn = j.parentElement.getAttribute('data-idn');

        const res = await fetch(`${this._apiUrl}/api/firm/${this._fid}/${this._sheet.idn}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                if (jsonData.data) {
                    this.deskEditPop(jsonData.data);
                } else {
                    this.toast({memo: '데이터가 없습니다.'});
                }
            }
        }
    }
};

vio.deskDropFixed = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`${this._apiUrl}/api/firm/${this._fid}/${this._sheet.dropItem.getAttribute('data-idn')}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this._sheet.dropItem.classList.add('disable');
                this._sheet.dropItem = null;
                this.toast({memo: '삭제 되었습니다.'});
            }
        }
    }
};

vio.deskDrop = function(j) {
    this._sheet.dropItem = j.parentElement.parentElement;
    this.dialog({act: 'open', tag: 'deskDropFixed', memo: '정말 삭제하시겠습니까?<br/>되돌릴 수 없습니다.'});
};

vio.deskPaging = function(j) {
    this._sheet.page = j.page;

    let out = '',
        pageNo = 0,
        pageInfo = '';

    if (j.page > 4) {
        out += `<span class="deskPage act" onclick="vio.getData(${j.page - 9 < 1 ? 1 : j.page - 9})">prev</span>`;
    } else {
        out += '<span class="deskPage act">prev</span>';
    }
    for (let ia = j.page > 4 ? j.page - 4 : 1; ia < j.page; ++ia) {
        pageNo += 1;
        out += `<span class="deskPage act" onclick="vio.getData(${ia})">${ia}</span>`;
    }
    out += `<span class="deskPage act active">${j.page}</span>`;
    for (let ia = j.page + 1; ia < j.page + (9 - pageNo) && ia <= j.dbPageNo; ++ia) {
        out += `<span class="deskPage act" onclick="vio.getData(${ia})">${ia}</span>`;
    }
    if (j.dbPageNo > 9) {
        out += `<span class="deskPage act" onclick="vio.getData(${j.page + 9 > j.dbPageNo ? j.dbPageNo : j.page + 9})">next</span>`;
    } else {
        out += '<span class="deskPage act">next</span>';
    }

    document.getElementById('deskPages').innerHTML = out;
    pageInfo = `${(j.page - 1) * j.dbListLimit + 1} - ${j.page * j.dbListLimit < j.dbNo ? j.page * j.dbListLimit : j.dbNo} / ${j.dbNo}`;
    document.getElementById('deskLimit').textContent = pageInfo;
    document.getElementById('deskStat').textContent = pageInfo;
};

vio.dataTrans = function(j) {
    let out = '';

    if (this._fileName === 'Firm') {
        for (let ia = 0, th = j.length; ia < th; ++ia) {
            const ta = j[ia];
            let pass = ''; // 제안서 구분
            if (ta.ablePower > 0 && ta.ableLowPower > 0) {
                if (ta.ableBuildPrice > 0 && ta.ableRepayMonth1) {
                    pass = `2차`;
                } else {
                    pass = '1차';
                }
            }

            const maxAbleWatt = ta.maxAbleWatt
                ? `${this.echoNumber(ta.maxAbleWatt)}<i class="em">kW</i>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp${String(ta.maxAbleDate).substring(0,4)}<i class="em">년</i>`
                : '';

            out += `
            <tr data-idn="${ta.fid}" ${ta.isDisable == 1 ? 'class="off"' : ''}>
                <td class="editAct">${ta.fid}<i class="icon iconEdit" onclick="vio.deskItem(this.parentElement)"></i></td>
                <td class="textAct" onclick="vio.deskItem(this)">${this.catToXLSX(ta.firmName)}</td>
                <td>${this.echoDate('y-m-d h:i:s', ta.registTime)}</td>
                <td title="${this._contract[ta.contract] || ''}">${ta.contract}</td>
                <td>${ta.kepcoNo != 0 ? ta.kepcoNo.toString().padStart(10, '0') : ''}</td>
                <td>${this.echoNumber(ta.frugal)}<i class="em">원</i></td>
                <td>${ta.ableLowPower ? ta.ableLowPower : ta.contractLimit}<i class="em">kW</i></td>
                <td>${maxAbleWatt}</td>
                <td>${pass}</td>
                <td>${this._serviceType[ta.serviceType]}</td>
                <td class="editAct">${this.catToXLSX(ta.memo)}<i class="icon iconDrop" onclick="vio.deskDrop(this)"></i></td>
            </tr>`;
        }

        document.getElementById('lowDeskList').innerHTML = out;
    } else {
        for (let ia = 0, th = j.length; ia < th; ++ia) {
            const ta = j[ia];
            out += `
            <tr data-idn="${ta.fid}" ${ta.isDisable == 1 ? 'class="off"' : ''}>
                <td class="editAct">${ta.fid}<i class="icon iconEdit" onclick="vio.deskItem(this.parentElement)"></i></td>
                <td class="textAct" onclick="vio.deskItem(this)">${this.catToXLSX(ta.firmName)}</td>
                <td title="${this._contract[ta.contract] || ''}">${ta.contract}</td>
                <td>${ta.kepcoNo != 0 ? ta.kepcoNo.toString().padStart(10, '0') : ''}</td>
                <td>${ta.eoiTime}${ta.eoiTime != 0 ? '<i class="em">초</i>' : ''}</td>
                <td>${ta.pct_ratio}</td>
                <td>${ta.peakLast}<i class="em">kW</i></td>
                <td>${ta.powerLimit}<i class="em">kW</i></td>
                <td>${ta.peakRunMode == 1 ? '자동' : '수동'}</td>
                <td>${ta.peakControlMode == 1 ? '순차' : '우선순위'}</td>
                <td>${ta.isDisable == 1 ? '비활성' : ''}</td>
                <td>${this._serviceType[ta.serviceType]}</td>
                <td class="editAct">${this.catToXLSX(ta.memo)}<i class="icon iconDrop" onclick="vio.deskDrop(this)"></i></td>
            </tr>`;
        }

        document.getElementById('deskList').innerHTML = out;
    }
};

vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'get',
            qs: document.getElementById('deskInput').value,
            page: j,
            qt: this._sheet.sortTag,
            qa: this._sheet.sortAsc,
            isLow: this._fileName === 'Firm' ? 1 : 0,
            serviceType: document.getElementById('serviceType').value
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`${this._apiUrl}/api/firm/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);

            if (jsonData.code) {
                if (jsonData.code === 401) {
                    // 유효하지 않은 엑세스 토큰
                    location.href = 'peak.html';
                } else {
                    this.toast({memo: jsonData.msg});
                }
            } else {
                this.dataTrans(jsonData.data);
                this.deskPaging(jsonData.paging);
            }
        }
    }
};

vio.kakaoMap = function(thisInput) {
    let lat = 36.6426,
        lng = 127.4888;

    if (thisInput.value.length > 8 && thisInput.value.search(/[^0-9\.\,\s]/g) === -1) {
        const ta = thisInput.value.split(',');
        lng = Number(ta[0]);
        lat = Number(ta[1]);
    }

    if (!this.hasOwnProperty('_kakaoMap')) {
        // kakao-map 주소 검색
        document.getElementById('kakaoMapSearch').addEventListener('keyup', function(event) {
            if (event.code == 'Enter' || event.code == 'NumpadEnter') {
                const searchText = this.value.trim();
                const geocoder = new kakao.maps.services.Geocoder();
                // 주소로 좌표를 검색합니다
                geocoder.addressSearch(searchText, function(result, status) {

                    // 정상적으로 검색이 완료됐으면 
                    if (status === kakao.maps.services.Status.OK) {
                        const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
                        // 지도의 중심을 결과값으로 받은 위치로 이동시킵니다
                        vio._kakaoMap.setCenter(coords);
                    } else {
                        vio.toast({memo: '주소 검색이 실패하였습니다.'});
                    }
                });
            }
        });
        document.getElementById('kakaoMapSearch').addEventListener('change', function(){
            const searchText = this.value.trim();
            const geocoder = new kakao.maps.services.Geocoder();
            // 주소로 좌표를 검색합니다
            geocoder.addressSearch(searchText, function(result, status) {

                // 정상적으로 검색이 완료됐으면
                if (status === kakao.maps.services.Status.OK) {
                    const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
                    // 지도의 중심을 결과값으로 받은 위치로 이동시킵니다
                    vio._kakaoMap.setCenter(coords);
                } else {
                    vio.toast({memo: '주소 검색이 실패하였습니다.'});
                }
            });
        });

        // 지도를 표시할 div와 지도 옵션으로 지도를 생성합니다
        this._kakaoMap = new kakao.maps.Map(
            document.getElementById('kakaoMapArea'),
            {
                center: new kakao.maps.LatLng(lat, lng), // 지도의 중심좌표
                level: 3 // 지도의 확대 레벨
            }
        );

        this._kakaoMapMarker = new kakao.maps.Marker({
            position: this._kakaoMap.getCenter()
        });
        this._kakaoMapMarker.setMap(this._kakaoMap);

        kakao.maps.event.addListener(this._kakaoMap, 'click', function(mouseEvent) {
            const latlng = mouseEvent.latLng;

            // 마커 위치를 클릭한 위치로 옮깁니다
            vio._kakaoMapMarker.setPosition(latlng);

            document.getElementById('kakaoMapGeo').textContent = `${latlng.getLng().toFixed(6)}, ${latlng.getLat().toFixed(6)}`;

            // 지도 좌표의 주소
            /*const geocoder = new kakao.maps.services.Geocoder();
             geocoder.coord2Address(latlng.getLng(), latlng.getLat(), function(result, status){
             if (status === kakao.maps.services.Status.OK) {
             document.getElementById('formMapAddress').value =!!result[0].road_address ?result[0].road_address.address_name:'';
             }
             });*/
        });
    } else {
        document.getElementById('kakaoMapSearch').value = '';

        // 이동할 위도 경도 위치를 생성합니다 
        const moveLatLon = new kakao.maps.LatLng(lat, lng);

        // 지도 중심을 이동 시킵니다
        this._kakaoMap.setCenter(moveLatLon);

        this._kakaoMapMarker.setMap(null);
        this._kakaoMapMarker = new kakao.maps.Marker({
            position: this._kakaoMap.getCenter()
        });
        this._kakaoMapMarker.setMap(this._kakaoMap);
    }
};

vio.deskReady = function() {
    const dom = document;

    vio.activeTable();

    let dt,
        out;

    // 에디터용
    out = '';
    const _contract = this._contract;
    for (let k in _contract) {
        out += `<option value="${k}">${_contract[k]}</option>`;
    }
    dom.getElementById('edit-contract').insertAdjacentHTML('beforeend', out);
    dom.getElementById('edit-kepcoContract').insertAdjacentHTML('beforeend', out);

    // 데스크 기능
    this._sheet.sortTag = 'registTime';
    this._sheet.sortAsc = 0;

    dt = dom.getElementById('deskSort').children;
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        const ta = dt[ia];
        if (ta.getAttribute('data-sort')) {
            ta.addEventListener('click', function() {
                const _sheet = vio._sheet;
                if (_sheet.sortTag != this.getAttribute('data-sort')) {
                    this.parentElement.querySelector(`[data-sort="${_sheet.sortTag}"]`).classList.remove(vio._sheet.sortAsc ? 'asc' : 'desc');
                } else {
                    _sheet.sortAsc = _sheet.sortAsc ? 0 : 1;
                }
                _sheet.sortTag = this.getAttribute('data-sort');
                this.classList.toggle('asc', _sheet.sortAsc);
                this.classList.toggle('desc', !_sheet.sortAsc);
                vio.getData(1);
            });
        }
    }
    dt = dom.getElementById('lowDeskSort').children;
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        const ta = dt[ia];
        if (ta.getAttribute('data-sort')) {
            ta.addEventListener('click', function() {
                const _sheet = vio._sheet;
                if (_sheet.sortTag != this.getAttribute('data-sort')) {
                    this.parentElement.querySelector(`[data-sort="${_sheet.sortTag}"]`).classList.remove(vio._sheet.sortAsc ? 'asc' : 'desc');
                } else {
                    _sheet.sortAsc = _sheet.sortAsc ? 0 : 1;
                }
                _sheet.sortTag = this.getAttribute('data-sort');
                this.classList.toggle('asc', _sheet.sortAsc);
                this.classList.toggle('desc', !_sheet.sortAsc);
                vio.getData(1);
            });
        }
    }

    dt = dom.getElementById('deskInput');
    dt.addEventListener('keyup', function() {
        if (event.keyCode == 13 && this.value.trim().length >= 2) {
            vio.getData(1);
        }
    });
    dt.nextElementSibling.addEventListener('click', function() {
        if (this.previousElementSibling.value.trim().length >= 2) {
            vio.getData(1);
        } else {
            vio.toast({memo: '검색어는 두글자 이상 입력해주세요.'});
        }
    });

    dt = dom.getElementById('deskTool').children;
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        const ta = dt[ia];
        switch (ta.getAttribute('data-act')) {
            case 'refresh':
                ta.addEventListener('click', function() {
                    location.reload();
                });
                break;
            case 'add':
                ta.addEventListener('click', function() {
                    vio._sheet.idn = 0;
                    vio.deskEditPop({});
                });
                break;
            case 'excel':
                ta.addEventListener('click', function() {
                    let workbook = XLSX.utils.table_to_book(document.getElementById('deskTable')),
                        ws = workbook.Sheets['Sheet1'];
                    XLSX.writeFile(workbook, '업체관리.xlsx');
                });
                break;
            case 'print':
                let deskTable = 'deskTable';
                if (this._fileName === 'Firm') {
                    deskTable = 'lowDeskTable';
                }

                ta.addEventListener('click', function() {
                    const nWindow = window.open('', 'print');
                    nWindow.document.body.innerHTML = document.getElementById(deskTable).outerHTML;
                    nWindow.print();
                    nWindow.close();
                });
                break;
        }
    }

    dom.getElementById('modalActClose').addEventListener('click', function() {
        document.getElementById('modal').classList.add('disable');
    });
    dom.getElementById('modalActCancel').addEventListener('click', function() {
        document.getElementById('modal').classList.add('disable');
    });
    dom.getElementById('modalActDone').addEventListener('click', async function() {
        vio.deskEditFixed();
    });

    this.getData(1);

    const params = new URLSearchParams();
    if (this._accessToken) {
        params.set('accessToken', this._accessToken);
    }
    if (this._fid) {
        params.set('fid', this._fid);
    }
    const queryString = params.toString();

    const researchLink = dom.getElementById('researchLink');
    if (researchLink) {
        researchLink.href = queryString ? `research.html?${queryString}` : 'research.html';
    }

    const chargeLink = dom.getElementById('chargeLink');
    if(chargeLink){
        chargeLink.href = queryString ? `power.html?${queryString}` : 'power.html';
    }
};

/**
 * 고압/저압 테이블 컬럼 다르게 표시
 */
vio.activeTable = function() {
    const dom = document;

    if (this._fileName === 'Firm') {
        dom.getElementById('lowDeskTable').classList.remove('disable');
    } else {
        dom.getElementById('deskTable').classList.remove('disable');
    }
};

vio.checkPasswordText = function(s){
    if (location.protocol === 'https:') {
        return true;
    }
    return s.search(/^(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^*+=?,.]).{8,16}$/g) === -1 ? false : true;
};

/**
 * 한전고객번호 중복체크
 * @param kepcoNo
 * @returns {Promise<void>}
 */
vio.checkKepcoNo = async function(kepcoNo) {
    const res = await fetch(`${this._apiUrl}/api/firm/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({fid:this._sheet.idn,kepcoNo:kepcoNo})
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();
        if (jsonData.firmName) {
            vio.toast({memo: `중복된 고객번호가 존재합니다.\n${jsonData.firmName}`, timer: 10000});
        } else {
            document.getElementById('toastArea').classList.add('disable');
        }
    }
};

/**
 * 이벤트 리스너 등록
 */
vio.eventListenerFirm = function() {
    const dom = document,
        kepcoNoInput = dom.getElementById('edit-kepcoNo');
    let checkTimeout = null;

    const handleInput = async () => {
        const kepcoNo = kepcoNoInput.value.replace(/[^0-9]/g, '');

        // 입력 길이 검증
        if (kepcoNo.length !== 10) {
            if (kepcoNo.length > 10) {
                kepcoNoInput.value = kepcoNo.slice(0, 10);
                vio.toast({memo: '한전고객번호는 10자리 숫자로 입력해주세요.'});
            }
            return;
        }

        // 디바운싱 적용 (300ms)
        clearTimeout(checkTimeout);
        checkTimeout = setTimeout(() => {
            vio.checkKepcoNo(kepcoNo);
        }, 300);
    };

    kepcoNoInput.addEventListener('input', handleInput);

    dom.getElementById('serviceType').addEventListener('change', async function() {
        await vio.getData(1);
    });

    const serviceTypeEl = dom.getElementById('edit-serviceType'),
        contractEl = dom.getElementById('edit-contract');

    let prevContractValue = contractEl.value;

    // 변경 전 값 기억
    contractEl.addEventListener('focus', () => {
        prevContractValue = contractEl.value;
    });

    // 변경 시 제어
    contractEl.addEventListener('change', () => {
        if (['1', '2', '3'].includes(serviceTypeEl.value)) {
            vio.toast({memo: '서비스 상태일 때는 전력 타입을 변경할 수 없습니다.'});
            contractEl.value = prevContractValue; // 원복
        }
    });
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.deskReady();
    await vio.eventListenerFirm();
});

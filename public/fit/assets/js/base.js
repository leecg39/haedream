'use strict';

window.document.querySelector("link[rel*='icon']").href = window.location.hostname === 'watt.eggbz.com' ? '/assets/img/eggOnIcon.png' : '/assets/img/favicon.ico';

function readStoredMembers() {
    try {
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        return Array.isArray(members) ? members : [];
    } catch (error) {
        console.warn('저장된 업체 목록을 읽지 못했습니다.', error);
        return [];
    }
}

const vio = {
    _fid: localStorage.getItem('fid') ?? '',
    _firmName: localStorage.getItem('firmName') ?? '',
    _accessToken: sessionStorage.getItem('accessToken'),
    _language: localStorage.getItem('language') ?? 'ko',
    _members: readStoredMembers(),
    _zoneOffset: -9, // UTC 시간차 -9
    _toastTimer: '',
    _setToCO2: 0.4594, // kgCO2eq
    _sheet: {
        content: '',
        data: {}
    },
    _md: {
        0: {name: '기타', part: 0},
        1: {name: 'GIMAC-1000', part: 0},
        2: {name: 'GIMAC-I', part: 0},
        3: {name: 'UNIGAS-500', part: 3},
        4: {name: '남전사 3상4선식', part: 0},
        5: {name: '온도조절기', part: 5},
        6: {name: '남전사 3상3선식', part: 0},
        7: {name: 'KDX-A', part: 0},
        8: {name: 'GIPAM-2000', part: 0},
        9: {name: '남전사 G-Type', part: 0},
        10: {name: '도담 가스계측기', part: 3},
        11: {name: 'GIPAM-2200', part: 0},
        12: {name: 'GIMAC-II+', part: 0},
        13: {name: 'GIPAM-115F1', part: 0},
        14: {name: 'SI-RCU747', part: 0},
        15: {name: '스팀', part: 1},
        16: {name: '용수', part: 2},
        17: {name: '온도(오리온)', part: 5},
        18: {name: '공기압축', part: 4},
        19: {name: 'MPM-330', part: 0},
        20: {name: 'KDX-300', part: 0},
        21: {name: 'imPRO', part: 0},
        22: {name: '외부전력데이터', part: 0},
        23: {name: 'Omni', part: 0},
        24: {name: 'ViMAC-IV', part: 0},
        25: {name: 'VIDER-M5', part: 0},
        26: {name: 'DMVC-1000', part: 3},
        27: { name: 'Micos3', part: 6 },
        28: { name: 'Wizit저압', part: 0 },
        29: { name: 'DEVC-1400', part: 3 },
        30: { name: 'KDX-201', part: 0 },
        31: { name: 'MAM-6090', part: 6 },
        32: { name: 'SF-2200', part: 3 },
        33: { name: 'DX-330', part: 6 },
        34: { name: 'KOS-200', part: 6 },
        35: { name: 'KDY-A', part: 0 },
        36: { name: 'KDU-300', part: 0 },
        37: { name: 'S-MICOM', part: 6 },
        38: { name: 'FOX-2001F', part: 5 },
        39: { name: 'GR-200', part: 5 },
        40: { name: 'MP5Y', part: 3 },
        41: { name: 'Carbon', part: 5 },
        42: { name: '한영넉스-NX', part: 5 },
        43: { name: 'Accura2500D', part: 0 },
    },
    _contract: {
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
    },
    _fileName: window.location.href.match(/\/([^\/#]+)\.html/)[1],
    logout: async function() { // 로그아웃
        const cp = localStorage.getItem('cp');

        const res = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: '{}'
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            localStorage.clear();
            if (cp) {
                localStorage.setItem('cp', cp);
            }

            //vio.setCookie('accessToken', '');
            sessionStorage.setItem('accessToken', '');
            document.getElementById('appLogout').removeEventListener('click', vio.logout);
            $('.topArea').off('click', '.mobileIcon');
            location.href = 'login.html';
        }
    },
    documentReady: async function() {
        const dom = document;
        try {
            await this.setToken();
            await this.includeFiles();
            try { await this.setFirmInfo(); } catch (e) { console.warn('setFirmInfo', e); }
            try { await this.setPeakInfo(); } catch (e) { console.warn('setPeakInfo', e); }
            try { await vio.activeMenu(); } catch (e) { console.warn('activeMenu', e); }
            try { await vio.syncDate(); } catch (e) { console.warn('syncDate', e); }
            try { vio.dialogAct(); } catch (e) { console.warn('dialogAct', e); }
            try { this.navDisable(); } catch (e) { console.warn('navDisable', e); }
        } catch (e) {
            console.warn('documentReady', e);
        } finally {
            const contentsArea = dom.getElementById('contentsArea');
            if (contentsArea) {
                contentsArea.classList.remove('disable');
            }
            const appLogout = dom.getElementById('appLogout');
            if (appLogout) {
                appLogout.addEventListener('click', vio.logout);
            }
        }
    },
    setToken: async function() {
        // url 에 accessToken 값을 넘겨 받으면 저장
        const url = new URL(window.location.href),
            accessToken = url.searchParams.get('accessToken'),
            urlFid = url.searchParams.get('fid');
        if (accessToken) {
            const requestBody = {cf: 'platform'};
            if (urlFid) {
                requestBody.fid = urlFid;
            }

            const res = await fetch('/api/tokens', {
                method: 'POST',
                headers: {
                    'Authorization': `x-auth ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            let jsonData = await res.json(),
                {
                    authIdn = '',
                    authName = '',
                    fid = '',
                    firmName = '',
                    language = '',
                    members = [],
                    menu = {},
                    peakInfo,
                    permit = '',
                } = jsonData;

            if (accessToken) {
                sessionStorage.setItem('accessToken', accessToken);
                localStorage.setItem('authIdn', authIdn);
                localStorage.setItem('authName', authName);
                localStorage.setItem('fid', fid);
                localStorage.setItem('firmName', firmName);
                localStorage.setItem('language', language);
                localStorage.setItem('members', JSON.stringify(members));
                localStorage.setItem('peakInfo', peakInfo);
                localStorage.setItem('permit', permit);

                // 메뉴 활성/비활성 설정 값
                for(let key in menu){
                    localStorage.setItem(key, menu[key]);
                }

                this._fid = fid;
                this._firmName = firmName;
                this._accessToken = accessToken;
                this._members = members;

                // URL에서 accessToken 제거
                url.searchParams.delete('accessToken');
                url.searchParams.delete('fid');
                url.searchParams.delete('firmName');
                history.replaceState(null, '', url);
            } else if (jsonData.msg) {
                this.toast({message: jsonData.msg});
            }
        }

        // sessionStorage에 accessToken 값이 없으면 로그인 화면으로
        if(!this._accessToken && this._fileName !== 'login'){
            window.location.href = 'login.html';
        }
    },
    setFirmInfo: function() {
        const dom = document,
            firmSelect = dom.getElementById('firmSelect'),
            firmName = localStorage.getItem('firmName');

        let out = '';
        if (localStorage.getItem('authId') === '123123') {
            let members = readStoredMembers();

            localStorage.setItem('fid', '98');
            members = members.filter(row => row.low === 0);
            if (members.length && !members.some(row => row.fid == this._fid)) {
                this._fid = members[members.length - 1].fid;
            }

            for (let i = 0; i < members.length; i++) {
                const item = members[i];
                const isSelected = this._fid == item.fid && firmName === item.name;
                out += `<option value="${item.fid}" ${isSelected ? 'selected' : ''}>${item.name}</option>`;
            }

            this._members = members;
        } else {
            for (let i = 0; i < this._members.length; i++) {
                const item = this._members[i];
                const isSelected = this._fid == item.fid;
                out += `<option value="${item.fid}" ${isSelected ? 'selected' : ''}>${item.name}</option>`;
            }
        }
        if (firmSelect) {
            firmSelect.innerHTML = out;
        }

        // 상단바 업체 검색 기능
        try {
            if (window.jQuery && $('#firmSelect').length) {
                $('#firmSelect').select2({matcher: customMatcher});
            }
        } catch (e) {
            console.warn('select2 init skipped', e);
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
    },
    setPeakInfo: function() {
        const currentStatus = localStorage.getItem('peakInfo'),
            currentStatusElement = document.getElementById('currentStatus'),
            currentStatusChildren = currentStatusElement ? currentStatusElement.children : [];

        if (!currentStatusElement) {
            return;
        }

        switch (currentStatus) {
            case '3':
                currentStatusChildren[1].classList.remove('disable');
                break;
            case '2':
                currentStatusChildren[0].classList.remove('disable');
                break;
            case '1':
                currentStatusChildren[2].classList.remove('disable');
                break;
            default:
                currentStatusChildren[3].classList.remove('disable');
                break;
        }
    },
    activeMenu: function() {
        const dom = document;

        let fileName = this._fileName;
        const subMenu = dom.getElementById(`${fileName}Menu`);

        if (subMenu) {
            subMenu.classList.add('active');
        }

        switch (fileName) {
            case 'energyMonit':
                fileName = 'monit';
                break;
            case 'wattMain':
            case 'solar':
                fileName = 'main';
                break;
            case 'peakPanel':
            case 'peakSet':
            case 'peakHis':
            case 'powerUsage':
            case 'peakUsage':
            case 'controlHis':
            case 'acp':
                fileName = 'peak';
                break;
            case 'powerPage':
            case 'wattPrediction':
                fileName = 'watt';
                break;
            case 'techSettings':
            case 'techUsage':
            case 'techOver':
            case 'techTree':
            case 'techPlan':
            case 'techHis':
            case 'techFrozen':
            case 'compressor':
            case 'thermos':
            case 'gasReports':
                fileName = 'tech';
                break;
            case 'kpi':
            case 'sensor':
            case 'reportFine':
            case 'loads':
                fileName = 'analysis';
                break;
            case 'report':
            case 'reportPower':
            case 'reportToe':
            case 'reportUnit':
            case 'reportFacilities':
            case 'reportTotal':
                fileName = 'report';
                break;
        }

        if (dom.getElementById(fileName)) {
            dom.getElementById(fileName).classList.add('active');
        }

        const navigation = dom.getElementById('navigation');
        if (navigation) {
            navigation.classList.remove('disable');
        }

        if (['80', '81', '82', '83', '84', '85', '87', '88', '89'].includes(this._fid)) {
            const reportIKMenu = dom.getElementById('reportIKMenu');
            if (reportIKMenu) {
                dom.getElementById('reportIKMenu').classList.remove('disable');

                if (dom.getElementById('reportIKMenu').classList.contains('active')) {
                    dom.getElementById('report').classList.add('active');
                }
            }
        }
    },
    syncDate: function() {
        const dom = document,
            currentDate = new Date();

        let year = vio.padZero(currentDate.getFullYear()),
            month = vio.padZero(currentDate.getMonth() + 1),
            day = vio.padZero(currentDate.getDate()),
            hours = vio.padZero(currentDate.getHours()),
            minutes = vio.padZero(currentDate.getMinutes());

        let ampm = hours < 12 ? '오전' : '오후';

        hours = hours % 12;
        hours = hours ? hours : 12;

        let ymd = `${year}-${month}-${day}`;
        let his = `${ampm} ${hours}:${minutes}`;

        const ymdElement = dom.getElementById('ymd');
        if (!ymdElement) {
            return;
        }
        ymdElement.textContent = ymd;
        dom.getElementById('dtime').textContent = his;

        setTimeout(vio.syncDate, 1000);
    },
    dialogAct: function() {
        const dialogAct = document.getElementById('dialogAct');
        if (dialogAct) {
            dialogAct.addEventListener('click', function() {
                vio.dialog({act: 'no'});
            });
            dialogAct.nextElementSibling.addEventListener('click', function() {
                vio.dialog({act: 'yes'});
            });
        }
    },
    padZero: function(number) {
        return (number < 10 ? '0' : '') + number;
    },
    setCookie: function(name, value, days) {
        if (!days) {
            days = 7;
        }

        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        let expires = "; expires=" + date.toUTCString();

        document.cookie = name + "=" + value + expires + "; path=/";
    },
    getCookie: function(name) {
        let nameEQ = name + "=";
        let cookies = document.cookie.split(';');

        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i];
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1, cookie.length);
            }
            if (cookie.indexOf(nameEQ) === 0) {
                return cookie.substring(nameEQ.length, cookie.length);
            }
        }
        return null;
    },
    toast: function(data) {
        clearTimeout(vio._toastTimer);

        const dom = document,
            toastArea = dom.getElementById('toastArea'),
            toastText = dom.getElementById('toastText');

        let message = data.message ?? '';
        if (!message) {
            message = data.memo ?? '';
        }

        toastText.textContent = message;
        toastArea.classList.remove('disable');

        vio._toastTimer = setTimeout(function() {
            dom.getElementById('toastArea').classList.add('disable');
        }, data.timer || 3200);
    },
    dialog: function(j) {
        const dom = document;

        if (j.act === 'open') {
            this._sheet.dialogAct = j.tag;
            dom.getElementById('dialogMemo').innerHTML = j.memo;
            dom.getElementById('dialog').classList.remove('disable');
        } else {
            if (j.act === 'yes' && typeof (this[this._sheet.dialogAct]) == 'function') {
                this[this._sheet.dialogAct]();
            }
            dom.getElementById('dialog').classList.add('disable');
        }
    },
    timeForm: function(sec, n1, n2) {
        let rs = (Math.floor(sec / n1) % n2) + '';
        if (rs.length < 2) {
            rs = '0' + rs;
        }
        return rs;
    },
    echoNumber: function(n) {
        return (n + '').replace(/(\d)(?=(?:\d{3})+(?!\d))/g, '$1,');
    },
    echoDate: function(echo, sec) {
        const tDate = new Date(sec * 1000),
            d = tDate.toLocaleDateString('sv-SE').split('-'),
            t = tDate.toLocaleTimeString('sv-SE').split(':'),
            w = ['일', '월', '화', '수', '목', '금', '토'][tDate.getDay()];

        return echo.replace('y', d[0]).replace('m', d[1]).replace('d', d[2]).replace('h', t[0]).replace('i', t[1]).replace('s', t[2]).replace('w', w);
    },
    getProf: async function() {
        if (!this._useNetworks) {
            this.netAble(true);

            const res = await fetch(`api/amount/${this._fid}`, {
                method: 'POST',
                headers: {
                    'Authorization': `x-auth ${vio._accessToken}`,
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: `{"cf":"base","month":"${document.getElementById('profSearch').value}"}`
            });

            if (!res.ok) {
                console.error(res.status);
            } else {
                const jsonData = await res.json();

                this.netAble(false);
                switch (jsonData.cat) {
                    case 9:
                        this.toast({memo: '권한이 없습니다.'});
                        break;
                    case 2:
                        //this.toast({memo:'청구정보 데이터가 존재하지 않습니다.'});
                        break;
                    case 1:
                        const tb = document.getElementById('profTable').children;
                        let ia = 0;

                        tb[ia++].children[1].textContent = localStorage.getItem('firmName');
                        tb[ia++].children[1].textContent = jsonData['custNo'];
                        tb[ia++].children[1].textContent = `${jsonData['bill_ym'].substr(0, 4)}년 ${jsonData['bill_ym'].substr(4, 2)}월`;
                        tb[ia++].children[1].textContent = jsonData['mr_ymd'] + '일';
                        tb[ia++].children[1].textContent = jsonData['bill_aply_pwr'] + ' ㎾';
                        tb[ia++].children[1].textContent = this.echoNumber(jsonData['kwh_bill']) + ' 원';
                        tb[ia++].children[1].textContent = this.echoNumber(jsonData['base_bill']) + ' 원';
                        tb[ia++].children[1].textContent = this.echoNumber(jsonData['req_bill']) + ' 원';
                        tb[ia++].children[1].textContent = this.echoNumber(jsonData['req_amt']) + ' 원';
                        tb[ia++].children[1].textContent = this.echoNumber(jsonData['lload_usekwh']) + ' ㎾h';
                        tb[ia++].children[1].textContent = this.echoNumber(jsonData['mload_usekwh']) + ' ㎾h';
                        tb[ia++].children[1].textContent = this.echoNumber(jsonData['maxload_usekwh']) + ' ㎾h';
                        tb[ia++].children[1].textContent = jsonData['jn_pwrfact'] + ' %';
                        tb[ia++].children[1].textContent = jsonData['ji_pwrfact'] + ' %';
                        document.getElementById('profModal').classList.remove('disable');
                        document.getElementById('profSearch').value = `${jsonData['bill_ym'].substr(0, 4)}-${jsonData['bill_ym'].substr(4, 2)}`;
                        break;
                    default:
                        this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
                }
            }
        }
    },
    netAble: function(j) {
        this._useNetworks = j;
        const appLoading = document.getElementById('appLoading');
        if (!appLoading) {
            return;
        }
        if (!j) {
            appLoading.classList.add('disable');
        } else {
            appLoading.classList.remove('disable');
        }
    },
    includeFiles: async function() { // 파일 Include
        const dom = document,
            fid = Number(localStorage.getItem('authIdn'));

        // 사이드 메뉴 include
        let leftNavFile = '';
        let topBarFile = '';
        const tempMenu = dom.createElement('div');
        topBarFile = 'include/top.html';
        leftNavFile = 'include/leftnav.html';

        const menu = await fetch(leftNavFile);
        tempMenu.innerHTML = await menu.text();

        const isEggOn = this.isEggOn(),
            platformConfig = isEggOn
            ? {
                host: 'watt.eggbz.com',
                lowLogo: '/assets/img/logo_eggfit_white.png',
                highLogo: '/assets/img/eggon_w.png'
            }
            : {
                host: 'watt.rfenms.com',
                lowLogo: '/assets/img/egfit_top_logo.svg',
                highLogo: '/assets/img/logo_abc.png'
            };

        // 현재 페이지 플랫폼 로고
        const platformLogo = tempMenu.querySelector('#platformLogo');
        if (platformLogo) {
            platformLogo.src = platformConfig.highLogo;
        }

        // 푸터에는 반대 서비스의 로고와 링크 표시
        const footerLogo = tempMenu.querySelector('#footerLogo'),
            footerLink = tempMenu.querySelector('#footerLink');
        if (footerLogo) {
            footerLogo.src = platformConfig.lowLogo;
        }
        if (footerLink) {
            const targetPage = isEggOn ? 'https://fit.eggbz.com/peak.html' : 'https://fit.rfenms.com/peak.html',
                targetUrl = new URL(targetPage);
            targetUrl.searchParams.set('accessToken', this._accessToken ?? '');
            targetUrl.searchParams.set('fid', this._fid ?? '');

            footerLink.href = targetUrl.toString();
        }

        if (this.isService()) {
            const stat = tempMenu.querySelector('#stat'),
                firm = tempMenu.querySelector('#firm'),
                research = tempMenu.querySelector('#research');
            if (stat && vio.isGroup(fid)) {
                tempMenu.querySelector('#stat').classList.remove('disable');
            }
            if (localStorage.getItem('permit') > '0') {
                if (firm && fid === 1) {
                    tempMenu.querySelector('#firm').classList.remove('disable');
                }
                if (research) {
                    tempMenu.querySelector('#research').classList.remove('disable');
                }
            }
        }
        const leftnav = dom.getElementById('leftnav');
        if (leftnav) {
            dom.getElementById('leftnav').innerHTML = tempMenu.innerHTML;
        }

        // 상단 Bar
        const topBar = await fetch(topBarFile),
            topBarElement = dom.getElementById('topBar');
        if (topBarElement) {
            topBarElement.innerHTML = await topBar.text();
        }

        // update tool
        if (!this.isService() && fid === 1) {
            const appUpdate = dom.getElementById('appUpdate');
            if (appUpdate) {
                appUpdate.classList.remove('disable');
            }
        }

        // includeFiles include
        const includeFiles = [...dom.getElementsByClassName('includeFile')];
        for (let i = 0; i < includeFiles.length; i++) {
            const fileName = includeFiles[i].getAttribute('data-include');
            if (!fileName) {
                continue;
            }

            try {
                const res = await fetch(`include/${fileName}.html`);
                includeFiles[i].innerHTML = await res.text();
            } catch (e) {
                console.warn('include', fileName, e);
            }
        }

        try {
            this.eventListener();
        } catch (e) {
            console.warn('eventListener', e);
        }
    },
    isService: function () {
        return window.location.hostname === 'watt.rfenms.com' || window.location.hostname === 'watt.eggbz.com';
    },
    isEggOn: function () {
        return window.location.hostname === 'watt.eggbz.com';
    },
    isGroup: function(fid) {
        return [
            1,
            80,81,82,83,84,85,87,88,89,
            326,
            558,559,560,561,562,563,564,565,963
        ].includes(fid);
    },
    eventListener: function() { // 이벤트 리스너 등록
        const dom = document,
            mobileMenuLink = $('.topArea .mobileIcon'),
            mobileOverLay = $('.mobileOverlay'),
            mobileNavBg = $('.mobileNavbg'),
            leftNav = $('.leftNav'),
            topBtn = $('.topRightArea'),
            bdRight = $('.bdRight');

        $('.topArea').on('click', '.mobileIcon', function() {
            mobileMenuLink.toggleClass('active');
            mobileOverLay.add(mobileNavBg).toggleClass('active');
            leftNav.add(topBtn).toggleClass('mobileActive');
            bdRight.toggleClass('active');
        });

        dom.querySelectorAll('.leftNav .navLi').forEach(function(navLi) {
            navLi.addEventListener('click', function() {
                const currentMenu = dom.querySelector('.leftNav .navLi.active');

                if (currentMenu && currentMenu.getAttribute('id') !== this.getAttribute('id')) {
                    currentMenu.classList.remove('active');
                }

                this.classList.toggle('active');
            });
        });

        const tbSetNav = $('.tbSetNav');
        $('.tb-set, .tbSetNav').mouseenter(function() {
            tbSetNav.show();
        })
        $('.tb-set').click(function() {
            tbSetNav.show();
        })
        $('.tb-set').mouseleave(function() {
            tbSetNav.hide();
        });

        // 업체 상세정보 팝업
        const nowDate = new Date();
        nowDate.setMonth(nowDate.getMonth() - 1);
        const datepicker = new tui.DatePicker('#profSearchWrapper', {
            date: nowDate,
            type: 'month',
            input: {
                element: '#profSearch',
                format: 'yyyy-MM'
            },
            selectableRanges: [
                [new Date('2021-12-01'), nowDate] // 최소 날짜와 최대 날짜를 설정합니다.
            ],
            language: 'ko'
        });
        datepicker.on('change', function() {
            vio.getProf();
        });
    },
    // xlsx 이용할때 사용문자 변환 \ / ? * [ ]
    catToXLSX: function(s) {
        return typeof s == 'string' ? s.replace(/\//g, '|').replace(/\\/g, '|').replace(/\?/g, '‽').replace(/\*/g, '※').replace(/\[/g, '〔').replace(/\]/g, '〕') : s;
    },
    changePeakInfo: async function(fid) {
        const res = await fetch(`api/peak-info/${fid}`, {
            method: 'GET',
            headers: {'Authorization': `x-auth ${vio._accessToken}`}
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                localStorage.setItem('peakInfo', jsonData.peakInfo);
            }
        }
    },
    changeLogo: async function(fid, firmName) {
        const logoFidMapping = {
            '41': '42',
            '46': '45',
            '51': '50',
            '52': '50',
            '54': '45',
            '56': '58',
            '57': '58',
            '59': '58',
            '80': '89',
            '81': '89',
            '82': '89',
            '83': '89',
            '84': '89',
            '85': '89',
            '87': '89',
            '88': '89',
            '102': '101',
            '105': '97',
            '107': '106',
            '108': '106',
            '114': '115',
            '139': '140',
            '141': '97',
            '147': '154',
            '143': '153',
            '144': '153',
            '152': '153',
        };

        localStorage.setItem('fid', fid);
        localStorage.setItem('firmName', firmName);

        if (localStorage.getItem('cp')) {
            window.location.reload();
        } else {
            const authName = localStorage.getItem('authName');
            const logoFid = logoFidMapping[fid] || fid;

            let img = new Image();
            img.src = `assets/img/logo/${logoFid}.png`;
            img.onload = function() {
                localStorage.setItem('logoPath', img.src);
                window.location.reload();
            };
            img.onerror = function() {
                localStorage.setItem('logoPath', 'assets/img/logo/default.png');
                window.location.reload();
            };
        }
    },
    setFirm: async function() {
        const target = document.getElementById('firmSelect');
        const fid = target.value;
        const firmName = target.options[target.selectedIndex].text;

        // 메뉴 활성/비활성 설정 값
        const res = await fetch(`api/navigations/${fid}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${this._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });
        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();
            for(let key in jsonData.data){
                localStorage.setItem(key, jsonData.data[key]);
            }
        }

        await vio.changePeakInfo(fid);
        await vio.changeLogo(fid, firmName);
    },
    countNumber: function() {
        if (document.visibilityState === 'visible') {
            let countNumber = document.querySelectorAll('.countNumber');
            for (let i = 0; i < countNumber.length; i++) {
                let element = countNumber[i];

                if (!parseFloat(element.dataset.to)) {
                    continue;
                }

                vio.countTo(element, {
                    from: element.dataset.from || 0,
                    to: element.dataset.to || 0,
                    speed: element.dataset.speed || 300,
                    refreshInterval: element.dataset.refreshInterval || 5,
                    decimals: element.dataset.decimals || 0
                });
            }
        }
    },
    countTo: function(element, options) {
        options = Object.assign({}, vio.countTo.defaults, options || {});

        let loops = Math.ceil(options.speed / options.refreshInterval),
            increment = (options.to - options.from) / loops;

        let loopCount = 0,
            value = options.from;

        function updateTimer() {
            value += increment;
            loopCount++;
            element.innerHTML = value.toLocaleString('ko-KR', {maximumFractionDigits: options.decimals});

            if (typeof options.onUpdate === 'function') {
                options.onUpdate.call(element, value);
            }

            if (loopCount >= loops) {
                clearInterval(interval);
                value = options.to;
                element.innerHTML = value.replace(/\B(?=(?:\d{3})+(?!\d))/g, ',');
            }
        }

        let interval = setInterval(updateTimer, options.refreshInterval);
    },
    // 비활성 메뉴 처리
    navDisable: function(){
        const navigation = document.getElementById('navigation');

        if (!navigation) {
            return;
        }

        const elements = navigation.querySelectorAll('[data-nav]');
        for(const element of elements){
            if(localStorage.getItem(element.getAttribute('data-nav')) === '0'){
                element.classList.add('disable');
            }
        }

        // SaaS 제공이 아닐때
        if(!this.isService()){
            const eggFit = document.getElementById('eggFitLogo');
            if(eggFit){
                eggFit.classList.add('disable');
            }
        }
    },
    isNumber: function(value) {
        return !isNaN(parseFloat(value))
    },
};

(() => {
    'use strict';

    const PAGE_SIZE = 10;
    const UPDATE_INTERVAL = 5000;
    const numberFormat = new Intl.NumberFormat('ko-KR');
    const state = {
        firms: [],
        filtered: [],
        page: 1,
        selectedId: null,
        map: null,
        markersByFirm: new Map(),
        refreshTick: 0,
        clockTimer: null,
        updateTimer: null
    };

    const firmNames = [
        '오리온농협(주)', '롯데제과 안산공장', '에스엠테크', '금강화학', '알렌클로비스',
        '해태제과 천안공장', '동원F&B 진천공장', '서울우유 양주공장', 'CJ제일제당 인천공장', '삼양식품 원주공장',
        '남서울농협 하나로마트', '북대구농협 물류센터', '부산축산농협', '광주원예농협', '전주김제완주축협',
        '대상 청정원 이천공장', '오뚜기 대풍공장', '풀무원 음성공장', '매일유업 평택공장', '빙그레 남양주공장',
        '현대그린푸드 스마트푸드센터', '한화솔루션 울산공장', 'LG화학 오창공장', 'SKC 수원공장', '포스코퓨처엠 세종공장',
        '한국콜마 세종사업장', '아모레퍼시픽 오산공장', '농심 구미공장', '하림 익산공장', '선진 이천공장',
        '청주농협 농산물유통센터', '제주감귤농협 제2공장', '강원양돈농협', '순천농협 미곡처리장', '충남세종농협 물류센터',
        '태광산업 반여공장', '코오롱인더스트리 김천공장', '동국제강 인천공장', '세아베스틸 군산공장', '한솔제지 장항공장',
        '대웅제약 오송공장', '유한양행 오창공장', '종근당 천안공장', '녹십자 오창공장', '한국야쿠르트 논산공장',
        '기아 광명공장', '현대모비스 진천공장', '두산에너빌리티 창원공장', '효성중공업 창원공장', '한전KDN 나주센터'
    ];

    const locations = [
        [37.5665, 126.9780, '서울 중구'], [37.4563, 126.7052, '인천 남동구'], [37.2636, 127.0286, '경기 수원시'],
        [37.3943, 126.9568, '경기 안양시'], [37.7381, 127.0337, '경기 의정부시'], [37.1995, 126.8312, '경기 화성시'],
        [37.3219, 126.8309, '경기 안산시'], [37.5393, 127.2149, '경기 하남시'], [37.8949, 127.2003, '경기 포천시'],
        [38.1086, 127.9849, '강원 양구군'], [37.7519, 128.8761, '강원 강릉시'], [37.3422, 127.9202, '강원 원주시'],
        [36.6424, 127.4890, '충북 청주시'], [36.9846, 127.9259, '충북 충주시'], [36.8151, 127.1139, '충남 천안시'],
        [36.3504, 127.3845, '대전 서구'], [36.4800, 127.2890, '세종시'], [36.7845, 126.4503, '충남 서산시'],
        [36.1195, 128.3446, '경북 구미시'], [35.8714, 128.6014, '대구 중구'], [36.0190, 129.3435, '경북 포항시'],
        [35.5384, 129.3114, '울산 남구'], [35.1796, 129.0756, '부산 부산진구'], [35.2280, 128.6811, '경남 창원시'],
        [35.1595, 126.8526, '광주 서구'], [35.8242, 127.1480, '전북 전주시'], [35.9677, 126.7366, '전북 군산시'],
        [35.0159, 126.7108, '전남 나주시'], [34.9506, 127.4872, '전남 순천시'], [34.8118, 126.3922, '전남 목포시'],
        [33.4996, 126.5312, '제주 제주시'], [33.2541, 126.5601, '제주 서귀포시'], [36.5684, 128.7294, '경북 안동시'],
        [35.0038, 128.0642, '경남 사천시'], [35.4164, 127.8735, '경남 산청군'], [36.9910, 129.4004, '경북 울진군'],
        [37.8813, 127.7298, '강원 춘천시'], [36.7926, 127.0025, '충남 아산시'], [36.1516, 128.6473, '대구 군위군'],
        [35.1260, 126.8310, '광주 광산구'], [35.9483, 128.3210, '경북 성주군'], [37.4917, 127.4870, '경기 양평군'],
        [37.9034, 127.0605, '경기 동두천시'], [36.4467, 127.1190, '충남 공주시'], [35.8030, 126.8808, '전북 김제시'],
        [34.7604, 127.6622, '전남 여수시'], [35.5667, 126.8560, '전북 정읍시'], [37.8228, 128.1555, '강원 홍천군'],
        [36.3019, 127.5713, '충북 옥천군'], [35.6474, 127.5212, '전북 장수군']
    ];

    function buildFirms() {
        return firmNames.map((name, index) => {
            const contract = 720 + ((index * 137) % 1480);
            const target = Math.round(contract * (0.69 + (index % 5) * 0.035));
            const ratioSeed = [0.72, 0.84, 0.94, 1.03, 1.13, 0.78, 0.88][index % 7];
            const current = Math.round(target * ratioSeed);
            const location = locations[index % locations.length];
            return {
                id: index + 1,
                name,
                lat: location[0],
                lng: location[1],
                address: location[2],
                contract,
                target,
                current,
                baseCurrent: current,
                prediction: Math.round(current * (1.02 + (index % 4) * 0.018)),
                accuracy: 93 + (index * 5) % 7,
                control: index % 6 === 0 ? '전체' : index % 3 === 0 ? '일부' : '안함',
                mode: index % 4 === 0 ? '수동' : '자동',
                emergency: index % 13 === 0,
                review: index % 9 === 0,
                demandSeconds: 65 + (index * 47) % 810,
                createdThisMonth: index < 4,
                saving: 238000 + ((index * 183700) % 4900000)
            };
        });
    }

    function getStatus(firm) {
        const ratio = firm.current / firm.target;
        if (ratio >= 1) return { key: 'danger', text: '초과', color: 'red' };
        if (ratio >= 0.9) return { key: 'warning', text: '근접', color: 'orange' };
        return { key: 'good', text: '안정', color: 'green' };
    }

    async function injectShell() {
        const [leftResponse, topResponse] = await Promise.all([
            fetch('/include/leftnav.html'),
            fetch('/include/top.html')
        ]);
        if (!leftResponse.ok || !topResponse.ok) throw new Error('공통 화면을 불러오지 못했습니다.');
        const [leftHtml, topHtml] = await Promise.all([leftResponse.text(), topResponse.text()]);
        const left = document.getElementById('leftnav');
        const top = document.getElementById('topBar');
        if (left) left.innerHTML = leftHtml;
        if (top) top.innerHTML = topHtml;
        configureShell();
    }

    function configureShell() {
        const platformLogo = document.getElementById('platformLogo');
        const footerLogo = document.getElementById('footerLogo');
        if (platformLogo) platformLogo.src = '/assets/img/logo_abc.png';
        if (footerLogo) footerLogo.src = '/assets/img/logo_abc.png';
        const statNav = document.getElementById('stat');
        if (statNav) statNav.classList.add('active');

        const select = document.getElementById('firmSelect');
        if (select) {
            select.innerHTML = '<option value="all">ABC EMS 통합관제센터</option><option value="head">한국미래에너지 본사</option>';
            select.value = 'all';
        }
        const currentStatus = document.getElementById('currentStatus');
        if (currentStatus) {
            const statusItems = currentStatus.querySelectorAll('li');
            statusItems.forEach((item) => item.classList.add('disable'));
            statusItems[2]?.classList.remove('disable');
        }

        document.querySelectorAll('#navigation .navLi > a[href="#"]').forEach((anchor) => {
            anchor.addEventListener('click', (event) => {
                event.preventDefault();
                anchor.closest('.navLi')?.classList.toggle('on');
            });
        });
        const settings = document.querySelector('.tb-set > a');
        const widgetSettingsLink = document.querySelector('.tbSetNav a[href="../widgetSet.html"], .tbSetNav a[href="/fit/widget-set"], .tbSetNav a[href="/widget-set"]');
        if (widgetSettingsLink) widgetSettingsLink.setAttribute('href', '/widget-set');
        settings?.addEventListener('click', (event) => {
            event.preventDefault();
            settings.parentElement?.classList.toggle('on');
        });
        document.getElementById('appLogout')?.addEventListener('click', (event) => {
            event.preventDefault();
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('statDemoSession');
            window.location.href = '/login.html';
        });
        updateClock();
        state.clockTimer = window.setInterval(updateClock, 1000);
    }

    function updateClock() {
        const now = new Date();
        const ymd = document.getElementById('ymd');
        const dtime = document.getElementById('dtime');
        if (ymd) ymd.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
        if (dtime) dtime.textContent = now.toLocaleTimeString('ko-KR', { hour12: false });
    }

    function bindControls() {
        const input = document.getElementById('inputFirmName');
        input?.addEventListener('input', () => applyFilters(true));
        input?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') applyFilters(true);
        });
        ['inputPeakExcess', 'inputPeakClose', 'inputOnControl', 'inputEmergency', 'inputReviewRequired'].forEach((id) => {
            document.getElementById(id)?.addEventListener('change', () => applyFilters(true));
        });
        document.getElementById('selectOrderBy')?.addEventListener('change', () => applyFilters(true));
    }

    function applyFilters(resetPage = false) {
        if (resetPage) state.page = 1;
        const query = (document.getElementById('inputFirmName')?.value || '').trim().toLocaleLowerCase('ko-KR');
        const peakExcess = document.getElementById('inputPeakExcess')?.checked;
        const peakClose = document.getElementById('inputPeakClose')?.checked;
        const onControl = document.getElementById('inputOnControl')?.checked;
        const emergency = document.getElementById('inputEmergency')?.checked;
        const review = document.getElementById('inputReviewRequired')?.checked;
        const selectedPeakFilters = Boolean(peakExcess || peakClose);

        state.filtered = state.firms.filter((firm) => {
            const status = getStatus(firm);
            if (query && !`${firm.name} ${firm.address}`.toLocaleLowerCase('ko-KR').includes(query)) return false;
            if (selectedPeakFilters && !((peakExcess && status.key === 'danger') || (peakClose && status.key === 'warning'))) return false;
            if (onControl && firm.control === '안함') return false;
            if (emergency && !firm.emergency) return false;
            if (review && !firm.review) return false;
            return true;
        });

        const order = document.getElementById('selectOrderBy')?.value || 'peakRatio-0';
        const descending = order.endsWith('-0');
        const key = order.split('-')[0];
        const readers = {
            firmName: (firm) => firm.name,
            peakRatio: (firm) => firm.current / firm.target,
            peakPower: (firm) => firm.current - firm.target,
            prediction: (firm) => firm.prediction,
            accuracy: (firm) => firm.accuracy,
            eoiTime: (firm) => firm.demandSeconds,
            conLen: (firm) => firm.control === '전체' ? 9 : firm.control === '일부' ? 4 : 0,
            kepcoRatio: (firm) => firm.accuracy
        };
        const reader = readers[key] || readers.peakRatio;
        state.filtered.sort((a, b) => {
            const av = reader(a);
            const bv = reader(b);
            const comparison = typeof av === 'string' ? av.localeCompare(bv, 'ko-KR') : av - bv;
            return descending ? -comparison : comparison;
        });
        const maxPage = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
        state.page = Math.min(state.page, maxPage);
        renderFirmRows();
        const changePage = (page) => {
            state.page = page;
            renderFirmRows();
            renderPagination('deskPages', state.page, maxPage, changePage);
        };
        renderPagination('deskPages', state.page, maxPage, changePage);
    }

    function renderFirmRows() {
        const rows = document.querySelectorAll('#dataList .firmListDataRow');
        const pageRows = state.filtered.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
        rows.forEach((row, index) => {
            const firm = pageRows[index];
            row.className = 'firmListDataRow';
            row.removeAttribute('id');
            row.removeAttribute('data-firm-id');
            if (!firm) return;
            const status = getStatus(firm);
            const ratio = Math.round(firm.current / firm.target * 100);
            const timePercent = Math.min(100, Math.round(firm.demandSeconds / 900 * 100));
            const secondsLeft = 900 - firm.demandSeconds;
            const demandTime = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
            const cells = row.children;
            row.classList.add('active');
            if (state.selectedId === firm.id) row.classList.add('selected');
            if (state.refreshTick) row.classList.add('demoRefreshing');
            row.id = `fid-${firm.id}`;
            row.dataset.firmId = String(firm.id);

            cells[0].className = firm.emergency && firm.review ? 'exclamationCheck' : firm.emergency ? 'exclamation' : firm.review ? 'check' : 'firmListDataValue mobile';
            cells[0].innerHTML = firm.emergency || firm.review ? '' : `<span class="demoStatusDot ${status.key}"></span>`;
            cells[1].children[0].textContent = firm.name;
            cells[1].children[1].textContent = firm.address;
            cells[1].children[1].classList.remove('disable');
            cells[2].children[0].textContent = status.text;
            cells[2].children[0].className = `demoPeakText ${status.key}`;
            cells[2].children[1].children[0].textContent = numberFormat.format(firm.current - firm.target);
            cells[3].children[0].textContent = firm.control;
            cells[3].children[0].className = firm.control === '전체' ? 'red' : firm.control === '일부' ? 'yellow' : '';
            cells[3].children[1].textContent = firm.control === '안함' ? '대기' : `${(firm.id % 5) + 1}/${(firm.id % 8) + 5}`;
            cells[4].children[0].textContent = firm.mode;
            cells[4].children[1].textContent = firm.mode === '자동' ? '스케줄' : '운영자';
            cells[5].children[0].children[0].textContent = numberFormat.format(firm.contract);
            cells[5].children[1].textContent = '계약전력';
            cells[6].children[0].textContent = Math.round(firm.target / firm.contract * 100);
            cells[7].children[0].children[0].textContent = numberFormat.format(firm.prediction);
            cells[7].children[1].children[0].textContent = numberFormat.format(firm.target);
            const ratioLine = cells[8].querySelector('.firmListPeakRatioOn');
            const ratioPoint = cells[8].querySelector('.firmListPeakRatioPoint');
            const ratioValue = cells[8].querySelector('.firmListProgressText div');
            const meter = cells[8].querySelector('.firmListPeakMeterOn');
            const meterText = cells[8].querySelectorAll('.firmListProgressText')[1];
            if (ratioLine) {
                ratioLine.style.width = `${Math.min(100, ratio)}%`;
                ratioLine.className = `firmListPeakRatioOn ${status.color}`;
            }
            if (ratioPoint) ratioPoint.style.left = `${Math.min(98, ratio)}%`;
            if (ratioValue) ratioValue.textContent = ratio;
            if (meter) meter.style.width = `${timePercent}%`;
            if (meterText) meterText.textContent = demandTime;
            cells[9].children[0].textContent = firm.accuracy;
            cells[9].children[0].className = firm.accuracy >= 98 ? 'green' : firm.accuracy < 95 ? 'red' : 'yellow';
        });
    }

    function renderPagination(id, current, total, onChange) {
        const container = document.getElementById(id);
        if (!container) return;
        const pages = [];
        pages.push(`<button type="button" class="demoPageBtn" data-page="${Math.max(1, current - 1)}" ${current === 1 ? 'disabled' : ''} aria-label="이전 페이지">‹</button>`);
        const start = Math.max(1, Math.min(current - 2, total - 4));
        const end = Math.min(total, Math.max(5, current + 2));
        for (let page = start; page <= end; page += 1) {
            pages.push(`<button type="button" class="demoPageBtn ${page === current ? 'active' : ''}" data-page="${page}">${page}</button>`);
        }
        pages.push(`<button type="button" class="demoPageBtn" data-page="${Math.min(total, current + 1)}" ${current === total ? 'disabled' : ''} aria-label="다음 페이지">›</button>`);
        container.innerHTML = pages.join('');
        container.querySelectorAll('button:not([disabled])').forEach((button) => {
            button.addEventListener('click', () => onChange(Number(button.dataset.page)));
        });
    }

    function updateCounters() {
        const counts = { danger: 0, warning: 0, good: 0, full: 0, partial: 0, none: 0, emergency: 0, review: 0 };
        state.firms.forEach((firm) => {
            counts[getStatus(firm).key] += 1;
            if (firm.control === '전체') counts.full += 1;
            else if (firm.control === '일부') counts.partial += 1;
            else counts.none += 1;
            if (firm.emergency) counts.emergency += 1;
            if (firm.review) counts.review += 1;
        });
        const values = [counts.danger, counts.warning, counts.good, counts.full, counts.partial, counts.none, counts.emergency, counts.review];
        document.querySelectorAll('#realTimeCountWrap .countValue').forEach((element, index) => {
            element.textContent = numberFormat.format(values[index] ?? 0);
        });
        const title = document.querySelector('.peakRealTime .headTitle');
        if (title && !title.querySelector('.demoLive')) title.insertAdjacentHTML('beforeend', '<span class="demoLive">LIVE 5s</span>');
    }

    function renderHistory() {
        const rows = document.querySelectorAll('#peakHistory .dataRow');
        const candidates = [...state.firms].sort((a, b) => b.current / b.target - a.current / a.target).slice(0, rows.length);
        rows.forEach((row, index) => {
            const firm = candidates[index];
            if (!firm) return;
            const status = getStatus(firm);
            row.className = `dataRow ${status.color}`;
            row.children[0].textContent = status.key === 'danger' ? '피크초과' : status.key === 'warning' ? '피크근접' : '제어완료';
            row.children[1].textContent = firm.name;
            row.children[2].textContent = `${firm.id % 5 + 1}/${firm.id % 8 + 5}`;
            const date = new Date(Date.now() - index * 420000);
            row.children[3].textContent = date.toLocaleTimeString('ko-KR', { hour12: false });
        });
        renderPagination('historyPages', 1, 6, (page) => renderPagination('historyPages', page, 6, () => {}));
    }

    function renderSavingsAndRanks() {
        const values = document.querySelectorAll('#reductionAmount .rowValue');
        const savingToday = state.firms.reduce((sum, firm) => sum + firm.saving, 0);
        const savings = [savingToday / 10000, savingToday * 17.8 / 10000, savingToday * 138.5 / 10000];
        values.forEach((element, index) => { element.textContent = numberFormat.format(Math.round(savings[index] || 0)); });

        const rows = document.querySelectorAll('#peakRank > *');
        const ranked = [...state.firms].sort((a, b) => b.saving - a.saving).slice(0, rows.length);
        rows.forEach((row, index) => {
            const firm = ranked[index];
            if (!firm) return;
            row.classList.remove('disable');
            const rank = row.children[0];
            rank.className = 'chargeReductionRankNumber';
            if (index === 0) rank.classList.add('gold');
            else if (index === 1) rank.classList.add('silver');
            else if (index === 2) rank.classList.add('bronze');
            else rank.textContent = `${index + 1}위`;
            row.children[1].textContent = firm.name;
            row.children[2].textContent = numberFormat.format(Math.round(firm.saving / 10000));
        });
        renderPagination('RankingPages', 1, 10, (page) => renderPagination('RankingPages', page, 10, () => {}));
    }

    function renderFirmAndNetworkStatus() {
        const thisMonth = document.getElementById('clientsCountThisMonth');
        const total = document.getElementById('clientsCountTotal');
        if (thisMonth) thisMonth.textContent = String(state.firms.filter((firm) => firm.createdThisMonth).length);
        if (total) total.textContent = numberFormat.format(state.firms.length);

        const good = 438;
        const bad = 7;
        const percent = Math.round(good / (good + bad) * 100);
        const circleText = document.getElementById('networkStatusCircleText');
        if (circleText) circleText.textContent = `${percent}%`;
        const circle = document.getElementById('circle-front');
        if (circle) {
            const dash = Number(circle.getAttribute('stroke-dasharray')) || 283;
            circle.setAttribute('stroke-dashoffset', String(dash - dash * percent / 100));
        }
        const networkValues = document.querySelectorAll('#statusText .networkStatusValue');
        if (networkValues[0]) networkValues[0].textContent = String(bad);
        if (networkValues[1]) networkValues[1].textContent = String(good + bad);
    }

    function markerHtml(status, control) {
        const markerState = control !== '안함' && status.key === 'good' ? 'control' : status.key;
        return `<div class="wattMapPin ${markerState}" aria-hidden="true"></div>`;
    }

    function initMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        if (!window.L) {
            mapElement.innerHTML = '<div id="demoMapFallback">지도를 초기화할 수 없습니다.</div>';
            mapElement.dataset.mapReady = 'false';
            return;
        }
        state.map = window.L.map(mapElement, {
            center: [36.15, 127.78],
            zoom: 7,
            minZoom: 6,
            maxZoom: 13,
            zoomControl: false,
            preferCanvas: true
        });
        window.L.control.zoom({ position: 'bottomright' }).addTo(state.map);
        const imagery = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 18,
            attribution: 'Tiles © Esri'
        }).addTo(state.map);
        window.L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 18,
            opacity: .84
        }).addTo(state.map);
        imagery.on('load', () => { mapElement.dataset.tilesLoaded = 'true'; });
        mapElement.dataset.mapReady = 'true';
        mapElement.dataset.mapZoom = String(state.map.getZoom());
        state.map.on('zoomend', () => { mapElement.dataset.mapZoom = String(state.map.getZoom()); });
        state.map.on('moveend', () => { mapElement.dataset.mapMoved = String(Number(mapElement.dataset.mapMoved ?? 0) + 1); });

        const markerCount = 480;
        for (let index = 0; index < markerCount; index += 1) {
            const firm = state.firms[index % state.firms.length];
            const base = locations[index % locations.length];
            const layer = Math.floor(index / locations.length);
            const angle = (index * 137.508) * Math.PI / 180;
            const radius = layer === 0 ? 0 : 0.035 + layer * 0.026;
            const lat = base[0] + Math.cos(angle) * radius;
            const lng = base[1] + Math.sin(angle) * radius * 1.25;
            const status = getStatus(firm);
            const icon = window.L.divIcon({
                className: 'wattDemoMarkerHost',
                html: markerHtml(status, firm.control),
                iconSize: [19, 24],
                iconAnchor: [9, 23],
                popupAnchor: [0, -20]
            });
            const marker = window.L.marker([lat, lng], { icon, keyboard: true, riseOnHover: true, title: firm.name });
            marker.on('click', () => selectFirm(firm.id, marker, false));
            marker.addTo(state.map);
            if (!state.markersByFirm.has(firm.id)) state.markersByFirm.set(firm.id, marker);
        }
        mapElement.dataset.markerCount = String(markerCount);
        window.setTimeout(() => state.map?.invalidateSize(), 150);
    }

    function popupContent(firm) {
        const status = getStatus(firm);
        const ratio = Math.round(firm.current / firm.target * 100);
        return `<div class="mapFirmCard" data-popup-firm-id="${firm.id}">
            <div class="title">${firm.name}<span class="state ${status.key}">${status.text}</span></div>
            <div class="mapFirmGrid">
                <div><small>현재전력</small><strong>${numberFormat.format(firm.current)} kW</strong></div>
                <div><small>목표전력</small><strong>${numberFormat.format(firm.target)} kW</strong></div>
                <div><small>피크비율</small><strong>${ratio}%</strong></div>
                <div><small>제어상태</small><strong>${firm.control} · ${firm.mode}</strong></div>
            </div>
            <div class="foot"><span>${firm.address}</span><span>예측 정확도 ${firm.accuracy}%</span></div>
        </div>`;
    }

    function selectFirm(id, marker, moveMap = true) {
        const firm = state.firms.find((item) => item.id === Number(id));
        if (!firm || !state.map) return;
        state.selectedId = firm.id;
        renderFirmRows();
        const targetMarker = marker || state.markersByFirm.get(firm.id);
        if (!targetMarker) return;
        if (moveMap) state.map.flyTo(targetMarker.getLatLng(), Math.max(9, state.map.getZoom()), { duration: .65 });
        window.L.popup({ className: 'wattCompanyPopup', closeButton: true, offset: [0, -4], maxWidth: 460 })
            .setLatLng(targetMarker.getLatLng())
            .setContent(popupContent(firm))
            .openOn(state.map);
    }

    function resetSearch() {
        const input = document.getElementById('inputFirmName');
        if (input) input.value = '';
        ['inputPeakExcess', 'inputPeakClose', 'inputOnControl', 'inputEmergency', 'inputReviewRequired'].forEach((id) => {
            const checkbox = document.getElementById(id);
            if (checkbox) checkbox.checked = false;
        });
        applyFilters(true);
    }

    function simulateLiveUpdate() {
        state.refreshTick += 1;
        document.body.dataset.liveTick = String(state.refreshTick);
        state.firms.forEach((firm, index) => {
            const swing = Math.sin((state.refreshTick + index * .7) * .82) * .027;
            firm.current = Math.max(1, Math.round(firm.baseCurrent * (1 + swing)));
            firm.prediction = Math.round(firm.current * (1.025 + (index % 4) * .015));
            firm.demandSeconds = (firm.demandSeconds + 5) % 900;
        });
        updateCounters();
        applyFilters(false);
        renderHistory();
        window.setTimeout(() => document.querySelectorAll('.demoRefreshing').forEach((row) => row.classList.remove('demoRefreshing')), 650);
    }

    async function init() {
        if (!sessionStorage.getItem('accessToken')) {
            sessionStorage.setItem('accessToken', 'stat-demo-local');
            sessionStorage.setItem('statDemoSession', 'true');
        }
        if (!localStorage.getItem('fid')) localStorage.setItem('fid', '1');
        if (!localStorage.getItem('firmName')) localStorage.setItem('firmName', 'ABC EMS 통합관제센터');
        state.firms = buildFirms();
        state.filtered = [...state.firms];
        window.vio = {
            setFirm: () => {},
            getProf: () => {},
            searchClientList: () => applyFilters(true),
            searchButtonReset: resetSearch,
            peakDetail: (row) => selectFirm(Number(row?.dataset.firmId)),
            deskPage: (page) => { state.page = Number(page) || 1; applyFilters(false); },
            historyPage: () => {},
            rankPage: () => {}
        };
        try {
            await injectShell();
        } catch (error) {
            console.error(error);
        }
        bindControls();
        updateCounters();
        applyFilters(true);
        renderHistory();
        renderSavingsAndRanks();
        renderFirmAndNetworkStatus();
        initMap();
        const contents = document.getElementById('contentsArea');
        contents?.classList.remove('disable');
        contents?.classList.add('statDemoReady');
        document.body.dataset.statDemoReady = 'true';
        state.updateTimer = window.setInterval(simulateLiveUpdate, UPDATE_INTERVAL);
    }

    // 플랫폼 전환 드롭다운 — leftnav include가 동적 삽입되므로 document 위임으로 처리
    (function bindPlatformSwitch() {
        function closeMenu(menu, button) {
            menu.hidden = true;
            button?.setAttribute('aria-expanded', 'false');
            const chevron = button?.querySelector('.bi');
            if (chevron) {
                chevron.classList.add('bi-chevron-down');
                chevron.classList.remove('bi-chevron-up');
            }
        }

        document.addEventListener('click', (event) => {
            const button = event.target.closest('#platformSwitchButton');
            const menu = document.getElementById('platformSwitchMenu');
            if (!menu) return;
            if (button) {
                const open = !menu.hidden;
                if (open) {
                    closeMenu(menu, button);
                } else {
                    menu.hidden = false;
                    button.setAttribute('aria-expanded', 'true');
                    const chevron = button.querySelector('.bi');
                    if (chevron) {
                        chevron.classList.remove('bi-chevron-down');
                        chevron.classList.add('bi-chevron-up');
                    }
                }
                return;
            }
            if (!menu.hidden && !event.target.closest('.platformSwitch')) {
                closeMenu(menu, document.getElementById('platformSwitchButton'));
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') return;
            const menu = document.getElementById('platformSwitchMenu');
            if (menu && !menu.hidden) {
                closeMenu(menu, document.getElementById('platformSwitchButton'));
            }
        });
    })();

    window.addEventListener('DOMContentLoaded', init, { once: true });
    window.addEventListener('beforeunload', () => {
        window.clearInterval(state.clockTimer);
        window.clearInterval(state.updateTimer);
        state.map?.remove();
    }, { once: true });
})();

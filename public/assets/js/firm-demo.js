(() => {
    'use strict';

    const PAGE_SIZE = 50;
    const numberFormat = new Intl.NumberFormat('ko-KR');
    const SERVICE_TYPES = {
        0: '', 1: 'EMS', 2: '피크', 3: '저압',
        11: 'EMS 준비', 12: '피크 준비', 13: '저압 준비',
        21: 'EMS 제안', 22: '피크 제안', 23: '저압 제안'
    };
    const CONTRACTS = ['IGL1', 'IGL2', 'IGL3', 'IGL4', '산업용(갑)Ⅰ', '산업용(을)'];
    const state = {
        firms: [],
        filtered: [],
        page: 1,
        sortKey: null,
        descending: false,
        selectedId: null,
        editingId: null,
        clockTimer: null
    };

    function normalizeFirm(seed, index) {
        return {
            fid: seed.fid,
            firmName: seed.firmName,
            contract: seed.contract || '',
            kepcoNo: seed.kepcoNo || '',
            eoiTime: seed.eoiTime ?? 0,
            pct_ratio: seed.pct_ratio ?? 0,
            peakLast: seed.peakLast ?? 0,
            powerLimit: seed.powerLimit ?? 0,
            peakRunMode: seed.peakRunMode ?? 0,
            peakControlMode: seed.peakControlMode ?? 0,
            isDisable: seed.isDisable ?? 0,
            serviceType: seed.serviceType ?? 0,
            memo: seed.memo || '',
            degreeCity: seed.degreeCity || '108',
            bone: seed.bone || '',
            kepcoCyber: seed.kepcoCyber || '',
            passwd: '',
            kepcoPasswd: seed.kepcoPasswd || '',
            manager: seed.manager || '',
            phone: seed.phone || '',
            addressText: seed.addressText || '',
            checkDay: seed.checkDay || 0,
            contractLimit: seed.contractLimit || 0,
            ableLimit: seed.ableLimit || 0,
            ableLimitTime: seed.ableLimitTime || '',
            pulse_num: seed.pulse_num ?? 0,
            frugalTime: seed.frugalTime || '',
            investGold: seed.investGold || 0,
            kepcoContract: seed.kepcoContract || '',
            boss: seed.boss || '',
            mapGeo: seed.mapGeo || '',
            registTime: seed.registTime || '',
            sourceOrder: index
        };
    }

    // 업체 목록은 실제 운영 DB 덤프(firm-details.csv)를 변환한 /api/firm 응답을 쓴다.
    async function loadFirms() {
        const response = await fetch('/api/firm');
        if (!response.ok) throw new Error(`/api/firm ${response.status}`);
        const body = await response.json();
        return (body.data ?? []).map((row, index) => normalizeFirm(row, index));
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
        const footerLink = document.getElementById('footerLink');
        if (platformLogo) platformLogo.src = '/assets/img/logo_abc.png';
        if (footerLogo) footerLogo.src = '/assets/img/egfit_top_logo.svg';
        if (footerLink) footerLink.href = '/fit/peak';
        document.getElementById('firm')?.classList.add('active');

        const select = document.getElementById('firmSelect');
        if (select) {
            // 상단 업체 드롭다운을 데이터베이스 업체 목록(state.firms = /api/firm)과 연동한다.
            // 하드코딩된 3개 대신 실제 DB 업체 전체를 옵션으로 채운다.
            const firms = state.firms ?? [];
            if (firms.length > 0) {
                select.innerHTML = firms
                    .map((firm) => `<option value="${firm.fid}">${escapeHtml(firm.firmName)}</option>`)
                    .join('');
                // localStorage.fid 로 마지막 선택 업체를 복원(없으면 첫 업체).
                const storedFid = Number(window.localStorage.getItem('fid'));
                const initial = firms.some((firm) => firm.fid === storedFid) ? storedFid : firms[0].fid;
                select.value = String(initial);
            } else {
                select.innerHTML = '<option value="">업체 없음</option>';
            }
            // 업체 변경 시 선택을 저장한다(다른 화면이 fid 기준으로 동작).
            select.addEventListener('change', () => {
                try {
                    window.localStorage.setItem('fid', select.value);
                    window.localStorage.setItem('authIdn', select.value);
                } catch (error) {
                    console.error('업체 선택 저장 실패', error);
                }
            });
        }
        const statusItems = document.querySelectorAll('#currentStatus li');
        statusItems.forEach((item) => item.classList.add('disable'));
        statusItems[3]?.classList.remove('disable');

        document.querySelectorAll('#navigation .navLi > a[href="#"]').forEach((anchor) => {
            anchor.addEventListener('click', (event) => {
                event.preventDefault();
                anchor.closest('.navLi')?.classList.toggle('on');
            });
        });
        const settings = document.querySelector('.tb-set > a');
        settings?.addEventListener('click', (event) => {
            event.preventDefault();
            settings.parentElement?.classList.toggle('on');
        });
        document.getElementById('appLogout')?.addEventListener('click', (event) => {
            event.preventDefault();
            sessionStorage.removeItem('accessToken');
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

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        })[character]);
    }

    function applyFilters(resetPage = false) {
        if (resetPage) state.page = 1;
        const query = (document.getElementById('deskInput')?.value || '').trim().toLocaleLowerCase('ko-KR');
        const service = Number(document.getElementById('serviceType')?.value || 0);
        state.filtered = state.firms.filter((firm) => {
            if (service && firm.serviceType !== service) return false;
            if (!query) return true;
            return `${firm.fid} ${firm.firmName} ${firm.kepcoNo}`.toLocaleLowerCase('ko-KR').includes(query);
        });
        if (state.sortKey) {
            state.filtered.sort((left, right) => {
                const a = left[state.sortKey];
                const b = right[state.sortKey];
                const comparison = typeof a === 'number' && typeof b === 'number'
                    ? a - b
                    : String(a).localeCompare(String(b), 'ko-KR', { numeric: true });
                return state.descending ? -comparison : comparison;
            });
        }
        const pages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
        state.page = Math.min(state.page, pages);
        renderRows();
        renderPaging();
    }

    function renderRows() {
        const list = document.getElementById('deskList');
        if (!list) return;
        const firstIndex = (state.page - 1) * PAGE_SIZE;
        const rows = state.filtered.slice(firstIndex, firstIndex + PAGE_SIZE);
        list.innerHTML = rows.length ? rows.map((firm) => `
            <tr data-fid="${firm.fid}" class="${state.selectedId === firm.fid ? 'selected' : ''}">
                <td>${firm.fid}</td>
                <td>${escapeHtml(firm.firmName)}</td>
                <td>${escapeHtml(firm.contract)}</td>
                <td>${escapeHtml(firm.kepcoNo || '-')}</td>
                <td>${escapeHtml(firm.eoiTime)}</td>
                <td>${escapeHtml(firm.pct_ratio)}</td>
                <td class="${firm.peakLast === 0 ? 'zeroPower' : ''}">${numberFormat.format(firm.peakLast)}</td>
                <td class="${firm.powerLimit === 0 ? 'zeroPower' : ''}">${numberFormat.format(firm.powerLimit)}</td>
                <td>${firm.peakRunMode ? '자동' : '수동'}</td>
                <td>${firm.peakControlMode ? '순차제어' : '우선순위'}</td>
                <td>${firm.isDisable ? '비활성' : '활성'}</td>
                <td>${escapeHtml(SERVICE_TYPES[firm.serviceType] || '-')}</td>
                <td title="${escapeHtml(firm.memo)}">${escapeHtml(firm.memo || '')}</td>
            </tr>`).join('') : '<tr><td colspan="13">검색 결과가 없습니다.</td></tr>';
        list.querySelectorAll('tr[data-fid]').forEach((row) => {
            row.addEventListener('click', () => openModal(Number(row.dataset.fid)));
        });

        const first = state.filtered.length ? firstIndex + 1 : 0;
        const last = Math.min(firstIndex + PAGE_SIZE, state.filtered.length);
        const label = `${numberFormat.format(first)} - ${numberFormat.format(last)} / ${numberFormat.format(state.filtered.length)}`;
        const topLimit = document.getElementById('deskLimit');
        const bottomLimit = document.getElementById('deskStat');
        if (topLimit) topLimit.textContent = label;
        if (bottomLimit) bottomLimit.textContent = label;
    }

    function renderPaging() {
        const container = document.getElementById('deskPages');
        if (!container) return;
        const pages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
        const start = Math.max(1, Math.min(state.page - 4, pages - 9));
        const end = Math.min(pages, start + 9);
        const output = [`<span class="deskPage act ${state.page === 1 ? 'disabled' : ''}" data-page="${Math.max(1, state.page - 1)}">prev</span>`];
        for (let page = start; page <= end; page += 1) {
            output.push(`<span class="deskPage act ${page === state.page ? 'active' : ''}" data-page="${page}">${page}</span>`);
        }
        output.push(`<span class="deskPage act ${state.page === pages ? 'disabled' : ''}" data-page="${Math.min(pages, state.page + 1)}">next</span>`);
        container.innerHTML = output.join('');
        container.querySelectorAll('.deskPage:not(.active):not(.disabled)').forEach((pageButton) => {
            pageButton.addEventListener('click', () => {
                state.page = Number(pageButton.dataset.page);
                renderRows();
                renderPaging();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    function populateContractSelects() {
        ['edit-contract', 'edit-kepcoContract'].forEach((id) => {
            const select = document.getElementById(id);
            if (!select) return;
            const firstLabel = id === 'edit-contract' ? '전력타입 선택' : '전력타입 선택';
            select.innerHTML = `<option value="">${firstLabel}</option>${CONTRACTS.map((contract) => `<option value="${escapeHtml(contract)}">${escapeHtml(contract)}</option>`).join('')}`;
        });
    }

    const formFieldMap = {
        'edit-firmName': 'firmName', 'edit-contract': 'contract', 'edit-kepcoNo': 'kepcoNo',
        'edit-pct_ratio': 'pct_ratio', 'edit-pulse_num': 'pulse_num', 'edit-powerLimit': 'powerLimit',
        'edit-peakRunMode': 'peakRunMode', 'edit-peakControlMode': 'peakControlMode', 'edit-isDisable': 'isDisable',
        'edit-memo': 'memo', 'edit-contractLimit': 'contractLimit', 'edit-ableLimit': 'ableLimit',
        'edit-ableLimitTime': 'ableLimitTime', 'edit-bone': 'bone', 'edit-checkDay': 'checkDay',
        'edit-passwd': 'passwd', 'edit-kepcoPasswd': 'kepcoPasswd', 'edit-manager': 'manager',
        'edit-phone': 'phone', 'edit-addressText': 'addressText', 'edit-serviceType': 'serviceType',
        'edit-degreeCity': 'degreeCity', 'edit-frugalTime': 'frugalTime', 'edit-investGold': 'investGold',
        'edit-kepcoContract': 'kepcoContract', 'edit-kepcoCyber': 'kepcoCyber', 'edit-boss': 'boss',
        'edit-mapGeo': 'mapGeo'
    };
    const numericFields = new Set(['pct_ratio', 'pulse_num', 'powerLimit', 'peakRunMode', 'peakControlMode', 'isDisable', 'contractLimit', 'ableLimit', 'checkDay', 'serviceType', 'degreeCity', 'investGold']);

    function setFormValues(firm) {
        Object.entries(formFieldMap).forEach(([id, key]) => {
            const element = document.getElementById(id);
            if (!element) return;
            let value = firm ? firm[key] : '';
            if (!firm && ['pct_ratio', 'pulse_num', 'powerLimit', 'peakRunMode', 'peakControlMode', 'isDisable', 'serviceType', 'investGold'].includes(key)) value = '0';
            if (!firm && key === 'ableLimitTime') value = '2025-01-01';
            if (!firm && key === 'degreeCity') value = '0';
            element.value = value ?? '';
        });
    }

    function openModal(fid = null) {
        const firm = fid === null ? null : state.firms.find((item) => item.fid === fid);
        state.editingId = firm?.fid ?? null;
        state.selectedId = firm?.fid ?? null;
        setFormValues(firm);
        document.getElementById('modal')?.classList.remove('disable');
        document.body.dataset.modalOpen = 'true';
        renderRows();
        window.setTimeout(() => document.getElementById('edit-firmName')?.focus(), 50);
    }

    function closeModal() {
        document.getElementById('modal')?.classList.add('disable');
        document.body.dataset.modalOpen = 'false';
        state.editingId = null;
        state.selectedId = null;
        renderRows();
    }

    function readForm() {
        const result = {};
        Object.entries(formFieldMap).forEach(([id, key]) => {
            const value = document.getElementById(id)?.value ?? '';
            result[key] = numericFields.has(key) ? Number(value || 0) : value;
        });
        return result;
    }

    function saveFirm() {
        const values = readForm();
        if (!String(values.firmName).trim()) {
            showToast('업체이름을 입력하세요.', true);
            document.getElementById('edit-firmName')?.focus();
            return;
        }
        if (state.editingId === null) {
            const nextId = Math.max(...state.firms.map((firm) => firm.fid)) + 1;
            state.firms.unshift(normalizeFirm({ ...values, fid: nextId, registTime: new Date().toISOString().slice(0, 10) }, 0));
        } else {
            const firm = state.firms.find((item) => item.fid === state.editingId);
            if (firm) Object.assign(firm, values);
        }
        closeModal();
        applyFilters(true);
        showToast('확인 되었습니다.');
    }

    function showToast(message, isError = false) {
        let area = document.querySelector('.firmDemoToastArea');
        if (!area) {
            area = document.createElement('div');
            area.className = 'firmDemoToastArea';
            document.body.append(area);
        }
        const toast = document.createElement('div');
        toast.className = `firmDemoToast ${isError ? 'error' : ''}`;
        toast.innerHTML = `<span>${escapeHtml(message)}</span><span class="close" aria-label="닫기">×</span>`;
        area.append(toast);
        const remove = () => toast.remove();
        toast.querySelector('.close')?.addEventListener('click', remove);
        window.setTimeout(remove, 3200);
    }

    function exportExcel() {
        const data = state.filtered.map((firm) => ({
            ID: firm.fid,
            이름: firm.firmName,
            전력타입: firm.contract,
            한전고객번호: firm.kepcoNo,
            EOI: firm.eoiTime,
            PCT: firm.pct_ratio,
            최근전력: firm.peakLast,
            목표전력: firm.powerLimit,
            운전모드: firm.peakRunMode ? '자동' : '수동',
            제어방식: firm.peakControlMode ? '순차제어' : '우선순위',
            활성: firm.isDisable ? '비활성' : '활성',
            서비스: SERVICE_TYPES[firm.serviceType] || '',
            메모: firm.memo
        }));
        if (window.XLSX) {
            const sheet = window.XLSX.utils.json_to_sheet(data);
            const book = window.XLSX.utils.book_new();
            window.XLSX.utils.book_append_sheet(book, sheet, '업체관리');
            window.XLSX.writeFile(book, '업체관리.xlsx');
            return;
        }
        const csv = '\ufeff' + Object.keys(data[0]).join(',') + '\n' + data.map((row) => Object.values(row).map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
        const anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        anchor.download = '업체관리.csv';
        anchor.click();
        URL.revokeObjectURL(anchor.href);
    }

    function bindControls() {
        const tool = document.getElementById('deskTool');
        tool?.querySelector('[data-act="add"]')?.addEventListener('click', () => openModal());
        tool?.querySelector('[data-act="excel"]')?.addEventListener('click', exportExcel);
        tool?.querySelector('[data-act="print"]')?.addEventListener('click', () => {
            document.body.dataset.printRequested = 'true';
            window.print();
        });
        const chargeLink = document.getElementById('chargeLink');
        const researchLink = document.getElementById('researchLink');
        if (chargeLink) chargeLink.href = '/fit/rate-plan';
        if (researchLink) researchLink.href = '/fit/research';

        const searchInput = document.getElementById('deskInput');
        searchInput?.setAttribute('placeholder', '');
        searchInput?.addEventListener('input', () => applyFilters(true));
        searchInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') applyFilters(true);
        });
        document.querySelector('.deskSearch .iconSearch')?.addEventListener('click', () => applyFilters(true));
        document.getElementById('serviceType')?.addEventListener('change', () => applyFilters(true));
        document.querySelectorAll('#deskSort th[data-sort]').forEach((header) => {
            header.addEventListener('click', () => {
                const key = header.dataset.sort;
                if (state.sortKey === key) state.descending = !state.descending;
                else {
                    state.sortKey = key;
                    state.descending = false;
                }
                document.querySelectorAll('#deskSort th').forEach((item) => item.classList.remove('asc', 'desc'));
                header.classList.add(state.descending ? 'desc' : 'asc');
                applyFilters(true);
            });
        });
        document.getElementById('modalActClose')?.addEventListener('click', closeModal);
        document.getElementById('modalActCancel')?.addEventListener('click', closeModal);
        document.getElementById('modalActDone')?.addEventListener('click', saveFirm);
        document.getElementById('modal')?.addEventListener('click', (event) => {
            if (event.target?.classList?.contains('modal')) closeModal();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && document.body.dataset.modalOpen === 'true') closeModal();
        });
    }

    async function init() {
        if (!sessionStorage.getItem('accessToken')) sessionStorage.setItem('accessToken', 'firm-demo-local');
        try {
            state.firms = await loadFirms();
        } catch (error) {
            console.error('업체 목록 로드 실패', error);
            state.firms = [];
        }
        state.filtered = [...state.firms];
        window.vio = {
            setFirm: () => {},
            getProf: () => {},
            getData: (page) => { state.page = Number(page) || 1; renderRows(); renderPaging(); },
            deskEditFixed: saveFirm,
            deskEditPop: (firm) => openModal(firm?.fid),
            toast: ({ memo, message }) => showToast(memo || message || '')
        };
        try {
            await injectShell();
        } catch (error) {
            console.error(error);
        }
        populateContractSelects();
        bindControls();
        applyFilters(true);
        const contents = document.getElementById('contentsArea');
        contents?.classList.remove('disable');
        contents?.classList.add('firmDemoReady');
        document.body.dataset.firmDemoReady = 'true';
        document.body.dataset.modalOpen = 'false';
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
    window.addEventListener('beforeunload', () => window.clearInterval(state.clockTimer), { once: true });
})();

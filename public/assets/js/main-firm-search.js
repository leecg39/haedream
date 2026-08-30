(() => {
    'use strict';

    /**
     * 대시보드(main.html) 업체 DB 검색 + 드래그드롭 패널.
     *
     * 원본 main.js 위젯 로직은 건드리지 않고, 상단에 독립 패널을 하나 얹는다.
     *   - 검색창: 업체 데이터베이스(/api/firm = FIRM_ROWS)를 이름/한전고객번호로 검색
     *   - 검색 결과: 각 항목을 드래그 가능하게 렌더
     *   - 드롭 영역: 끌어다 놓은 업체를 "관심업체" 칩으로 담고, 칩 클릭 시 해당
     *     업체를 대시보드 기준 업체(localStorage.fid)로 설정 후 새로고침
     */

    const state = { firms: [], tray: new Map() };

    async function loadFirms() {
        const res = await fetch('/api/firm', { cache: 'no-store' });
        if (!res.ok) throw new Error('/api/firm ' + res.status);
        const body = await res.json();
        return (body.data ?? []).map((row) => ({
            fid: Number(row.fid),
            name: row.firmName,
            kepcoNo: row.kepcoNo || '',
            address: row.addressText || '',
        }));
    }

    function buildPanel() {
        const contents = document.getElementById('contentsArea');
        if (!contents || document.getElementById('firmSearchPanel')) return null;
        const panel = document.createElement('section');
        panel.id = 'firmSearchPanel';
        panel.className = 'firmSearchPanel';
        panel.innerHTML =
            '<div class="firmSearchBar">' +
            '  <i class="bi bi-search"></i>' +
            '  <input type="search" id="dashFirmSearch" placeholder="업체 DB 검색 (이름·한전고객번호)" aria-label="업체 검색" autocomplete="off">' +
            '  <span class="firmSearchCount" id="dashFirmCount"></span>' +
            '</div>' +
            '<div class="firmSearchGrid">' +
            '  <ul class="firmSearchResults" id="dashFirmResults" aria-label="검색 결과"></ul>' +
            '  <div class="firmDropZone" id="dashDropZone" data-count="0">' +
            '    <div class="firmDropHint"><i class="bi bi-hand-index"></i> 업체를 여기로 끌어다 놓으면 관심업체로 담깁니다</div>' +
            '    <div class="firmDropChips" id="dashDropChips"></div>' +
            '  </div>' +
            '</div>';
        // main.js 가 #contentsArea 내부를 위젯으로 다시 그리므로, 패널은 그 형제로
        // (#contentsArea 앞에) 삽입해 위젯 렌더링에 지워지지 않게 한다.
        contents.parentElement.insertBefore(panel, contents);
        return panel;
    }

    function renderResults(query) {
        const list = document.getElementById('dashFirmResults');
        const count = document.getElementById('dashFirmCount');
        if (!list) return;
        const q = (query || '').trim().toLocaleLowerCase('ko-KR');
        const matched = q.length === 0
            ? state.firms.slice(0, 30)
            : state.firms.filter((f) =>
                f.name.toLocaleLowerCase('ko-KR').includes(q) ||
                String(f.kepcoNo).includes(q)
            ).slice(0, 100);
        list.innerHTML = '';
        matched.forEach((firm) => {
            const li = document.createElement('li');
            li.className = 'firmSearchItem';
            li.setAttribute('draggable', 'true');
            li.dataset.fid = String(firm.fid);
            const nameEl = document.createElement('span');
            nameEl.className = 'firmSearchName';
            nameEl.textContent = firm.name;
            const metaEl = document.createElement('span');
            metaEl.className = 'firmSearchMeta';
            metaEl.textContent = firm.kepcoNo ? '한전 ' + firm.kepcoNo : (firm.address || '');
            li.appendChild(nameEl);
            li.appendChild(metaEl);
            li.addEventListener('dragstart', (event) => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('text/plain', JSON.stringify({ id: firm.fid, name: firm.name }));
                li.classList.add('dragging');
            });
            li.addEventListener('dragend', () => li.classList.remove('dragging'));
            list.appendChild(li);
        });
        if (count) {
            count.textContent = q.length === 0
                ? '전체 ' + state.firms.length + '개'
                : matched.length + '개 검색됨';
        }
    }

    function addToTray(id, name) {
        const chips = document.getElementById('dashDropChips');
        const zone = document.getElementById('dashDropZone');
        if (!chips) return;
        const key = String(id);
        if (state.tray.has(key)) return;
        state.tray.set(key, name);
        const chip = document.createElement('span');
        chip.className = 'firmDropChip';
        chip.dataset.fid = key;
        const nameBtn = document.createElement('span');
        nameBtn.className = 'firmDropChipName';
        nameBtn.textContent = name;
        nameBtn.title = '이 업체를 대시보드 기준으로 보기';
        nameBtn.addEventListener('click', () => {
            try {
                localStorage.setItem('fid', key);
                localStorage.setItem('authIdn', key);
                localStorage.setItem('firmName', name);
            } catch (error) { /* noop */ }
            window.location.reload();
        });
        const x = document.createElement('button');
        x.type = 'button';
        x.className = 'firmDropChipX';
        x.setAttribute('aria-label', '삭제');
        x.textContent = '×';
        x.addEventListener('click', () => {
            state.tray.delete(key);
            chip.remove();
            if (zone) zone.dataset.count = String(state.tray.size);
        });
        chip.appendChild(nameBtn);
        chip.appendChild(x);
        chips.appendChild(chip);
        if (zone) zone.dataset.count = String(state.tray.size);
    }

    function bindDropZone() {
        const zone = document.getElementById('dashDropZone');
        if (!zone) return;
        zone.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            zone.classList.add('dragover');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
        zone.addEventListener('drop', (event) => {
            event.preventDefault();
            zone.classList.remove('dragover');
            let payload;
            try { payload = JSON.parse(event.dataTransfer.getData('text/plain')); } catch (e) { return; }
            if (!payload || payload.id == null) return;
            addToTray(payload.id, payload.name);
        });
    }

    async function init() {
        // topBar/leftnav 를 채우는 main.js 초기화와 경쟁하지 않도록 contentsArea 를 기다린다.
        let tries = 0;
        while (!document.getElementById('contentsArea') && tries < 50) {
            await new Promise((r) => setTimeout(r, 100));
            tries += 1;
        }
        const panel = buildPanel();
        if (!panel) return;
        try {
            state.firms = await loadFirms();
        } catch (error) {
            console.error('업체 DB 로드 실패', error);
            state.firms = [];
        }
        const input = document.getElementById('dashFirmSearch');
        input?.addEventListener('input', () => renderResults(input.value));
        bindDropZone();
        renderResults('');
        document.body.dataset.dashFirmSearchReady = 'true';
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();

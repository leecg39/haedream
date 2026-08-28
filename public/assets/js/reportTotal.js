'use strict';

vio._type = ['days', 'months', 'years'];
vio._periodType = 'days'; // 일별, 월별, 연별
vio._sDate = ''; // 기간 시작일
vio._eDate = ''; // 기간 종료일
vio._treeType = ''; // 분류(공정전체, 공정, 대분류, 중분류, 소분류)

vio._energy = []; // 선택된 항목
vio._energyType = { // 항목 데이터
    '전력사용량': {key: 'watt', unit: 'kWh'},
    '전력사용비율': {key: 'ratioWatt', unit: '%'},
    '경부하': {key: 'wattLow', unit: 'kWh'},
    '중부하': {key: 'wattMiddle', unit: 'kWh'},
    '최대부하': {key: 'wattHigh', unit: 'kWh'},
    '경부하율': {key: 'ratioWattLow', unit: '%'},
    '중부하율': {key: 'ratioWattMiddle', unit: '%'},
    '최대부하율': {key: 'ratioWattHigh', unit: '%'},
    '역률': {key: 'factor', unit: '%'},
    '도시가스사용량': {key: 'gas', unit: 'Nm³'},
    '용수사용량': {key: 'aqueduct', unit: 'ton'},
    '전력요금': {key: 'gold', unit: '원'},
    '경부하요금': {key: 'goldLow', unit: '원'},
    '중부하요금': {key: 'goldMiddle', unit: '원'},
    '최대부하요금': {key: 'goldHigh', unit: '원'},
    '도시가스 사용요금': {key: 'gasRate', unit: '원'},
    '용수 사용요금': {key: 'aqueductRate', unit: '원'},
    '생산량': {key: 'amount', unit: 'ton'},
    '원단위': {key: 'intensity', unit: '원/ton'},
    'TOE': {key: 'TOE', unit: ''},
    'TCO2': {key: 'TCO2', unit: '', title: 'tCO<sub>2</sub>'},
    'TCO2eq': {key: 'TCO2eq', unit: '', title: 'tCO<sub>2</sub>eq'},
};
vio._energyAvg = ['ratioWatt', 'ratioWattLow', 'ratioWattMiddle', 'ratioWattHigh', 'factor'];

vio._bookmark = []; // 즐겨찾기 목록
vio._bookmarkId = ''; // 선택된 즐겨찾기 ID
vio._targetId = ''; // 선택된 즐겨찾기 ID(수정/삭제 시)

vio._trees = []; // 공정분류
vio._dateSum = {}; // 날짜별 항목별 합계

vio._facList = []; // 설비 목록
vio._yieldUnit = 'ton'; // 생산량 단위

/**
 * 종합보고서 초기화
 */
vio.reportTotal = async function() {
    await this.energyReport(); // 즐겨찾기 목록 요청
    this.dataTransBookmark(); // 즐겨찾기 데이터 매핑

    await vio.base();
};

/**
 * 즐겨찾기 데이터 매핑
 */
vio.dataTransBookmark = function() {
    const dom = document;

    let out = '';
    for (let i = 0; i < this._bookmark.length; i++) {
        // 즐겨찾기
        const item = this._bookmark[i];

        out += `
        <li class="bookmark${this._bookmarkId === item.idn ? ' active' : ''}" id="bookmark${item.idn}">
            <a href="javascript:void(0)" onclick="vio.getData(${item.idn})" title="${item.label}">
                <i class="bi bi-star-fill"></i>${item.label}
            </a>
            <div class="dot" onclick="vio.toggleMoreGp(this, ${item.idn})">
                <i class="bi bi-three-dots-vertical"></i>
            </div>
            <div class="moreGp disable">
                <a href="javascript:void(0)" onclick="vio.modifyBookmark()">수정</a>
                <a href="javascript:void(0)" onclick="vio.removeBookmark()">삭제</a>
            </div>
        </li>`;
    }
    document.getElementById('bookmark').innerHTML = out;

    const firstBookmark = this._bookmark[0];
    if (!this._bookmarkId) {
        if (firstBookmark && firstBookmark.idn) {
            this.getBookmarkData(firstBookmark.idn);
        } else {
            // 즐겨찾기가 등록되어 있지 않으면 전력사용량, 전력사용비율 기본 체크
            dom.getElementById('rowFilter').classList.remove('disable');
            dom.querySelectorAll('.energy .defaultValue').forEach(element => element.checked = true);
        }
    }
};

/**
 * 공정목록 데이터 요청
 * @returns {Promise<void>}
 */
vio.tree = async function() {
    vio.netAble(true);

    const res = await fetch(`/api/pipes/${this._fid}/trees`, {
        method: 'GET',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
    });

    vio.netAble(false);

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();
        this._yieldUnit = jsonData.amountUnit || 'ton';
        vio._energyType['원단위']['unit'] = `원/${this._yieldUnit}`;
        vio._energyType['생산량']['unit'] = this._yieldUnit;

        this._trees = jsonData.data;
        this._dateSum = {};
    }
};

/**
 * 기간 시작일 반환
 * @param sDate
 * @returns {*}
 */
vio.getSDate = function(sDate) {
    if (/^\d{4}-\d{2}$/.test(sDate)) { // yyyy-mm
        sDate += '-01';
    } else if (/^\d{4}$/.test(sDate)) { // yyyy
        sDate += '-01-01';
    }

    return sDate;
};

/**
 * 기간 종료일 반환
 * @param eDate
 * @returns {*}
 */
vio.getEDate = function(eDate) {
    if (/^\d{4}-\d{2}$/.test(eDate)) { // yyyy-mm
        const [year, month] = eDate.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate(); // 해당 월의 마지막 날 계산
        eDate += `-${lastDay}`;
    } else if (/^\d{4}$/.test(eDate)) { // yyyy
        eDate += '-12-31';
    }

    return eDate;
};

/**
 * 공정별 날짜별 데이터 요청
 * @returns {Promise<void>}
 */
vio.base = async function() {
    const dom = document,
        sDate = dom.getElementById('sDate').value,
        eDate = dom.getElementById('eDate').value,
        energy = [],
        energyRate = [],
        energyUnit = [];

    if (!sDate || !eDate || sDate > eDate) {
        this.toast({memo: '입력기간을 확인해 주세요.'});
        return;
    }

    vio.netAble(true);

    this._sDate = this.getSDate(sDate);
    this._eDate = this.getEDate(eDate);
    this._periodType = dom.querySelector('.tabUi .active').getAttribute('data-type');
    this._treeType = dom.getElementById('treeType').value;

    dom.querySelectorAll('td.energy input[type="checkbox"]:checked').forEach(element => {
        energy.push(element.value);
    });
    dom.querySelectorAll('td.energyRate input[type="checkbox"]:checked').forEach(element => {
        energyRate.push(element.value);
    });
    dom.querySelectorAll('td.energyUnit input[type="checkbox"]:checked').forEach(element => {
        energyUnit.push(element.value);
    });

    vio._energy = energy.concat(energyRate).concat(energyUnit);

    let params = {
        period: {
            type: this._periodType,
            start: this._sDate,
            end: this._eDate
        },
        energy: energy,
        energyRate: energyRate,
        energyUnit: energyUnit
    }
    if (this._treeType === '5') {
        params.period.isEquipment = 1;
    }

    const res = await fetch(`/api/tunnels/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(params)
    });

    vio.netAble(false);

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();
        let newData = {};

        if (this._treeType === '5') {
            Object.keys(jsonData.data).forEach(key => {
                Object.keys(jsonData.data[key]).forEach(pid => {
                    Object.keys(jsonData.data[key][pid]).forEach(index => {
                        const item = jsonData.data[key][pid][index];

                        if (!newData[key]) {
                            newData[key] = {};
                        }
                        if (!newData[key][pid]) {
                            newData[key][pid] = {};
                        }

                        switch (this._periodType) {
                            case 'months':
                                newData[key][pid][this.echoDate('y-m', item.ctime)] = item;
                                break;
                            case 'years':
                                newData[key][pid][this.echoDate('y', item.ctime)] = item;
                                break;
                            default:
                                newData[key][pid][this.echoDate('y-m-d', item.ctime)] = item;
                        }
                    });
                });
            });
        } else {
            Object.keys(jsonData.data).forEach(key => {
                Object.keys(jsonData.data[key]).forEach(cTime => {
                    if (!newData[key]) {
                        newData[key] = {};
                    }

                    switch (this._periodType) {
                        case 'months':
                            newData[key][this.echoDate('y-m', cTime)] = jsonData.data[key][cTime];
                            break;
                        case 'years':
                            newData[key][this.echoDate('y', cTime)] = jsonData.data[key][cTime];
                            break;
                        default:
                            newData[key][this.echoDate('y-m-d', cTime)] = jsonData.data[key][cTime];
                    }
                });
            });
        }

        await vio.reportSheet(newData);
    }
};

/**
 * 즐겨찾기 목록 요청
 * @returns {Promise<void>}
 */
vio.energyReport = async function() {
    vio.netAble(true);

    const res = await fetch(`/api/tunnels/${this._fid}`, {
        method: 'GET',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
    });

    vio.netAble(false);

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        this._bookmark = jsonData.data;
    }
};

/**
 * 설비 목록 요청
 * @returns {Promise<void>}
 */
vio.facility = async function() {
    const res = await fetch(`/api/pipes/${this._fid}`, {
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

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            this._facList = jsonData.data;
        }
    }
};

/**
 * 시작일 ~ 종료일 날짜 목록 반환
 * @returns {*[]}
 */
vio.period = function() {
    const dom = document;

    const start = new Date(this._sDate);
    const end = new Date(this._eDate);

    // 날짜 배열 초기화
    const dateArray = [];
    // 현재 날짜를 시작 날짜로 초기화
    let currentDate = new Date(start);

    // endDate까지 반복
    while (currentDate <= end) {
        let formattedDate;

        // 현재 날짜를 type에 맞게 변환
        switch (this._periodType) {
            case 'months':
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                formattedDate = `${currentDate.getFullYear()}-${month}`;
                break;
            case 'years':
                formattedDate = `${currentDate.getFullYear()}`;
                break;
            default:
                formattedDate = currentDate.toISOString().split('T')[0];
        }

        // 배열에 추가
        if (!dateArray.includes(formattedDate)) {
            dateArray.push(formattedDate);
        }

        // 현재 날짜에 하루를 더함
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dateArray;
};

/**
 * 분류별 데이터 초기화
 * @param data
 * @returns {Promise<void>}
 */
vio.initData = async function(data) {
    await vio.tree();

    const period = vio.period(),
        colspan = this._energy.length,
        periodLength = period.length,
        treesLength = this._trees.length;

    for (let i = 0; i < treesLength; i++) {
        // 대분류
        const tree1Item = this._trees[i],
            tree1ChildLength = tree1Item.child.length;

        tree1Item.tree2Length = tree1ChildLength;
        tree1Item.tree3Length = 0;
        tree1Item.tree4Length = 0;
        tree1Item.tree5Length = 0;

        for (let j = 0; j < tree1ChildLength; j++) {
            // 중분류
            const tree2Item = tree1Item.child[j],
                tree2ChildLength = tree2Item.child.length;

            tree2Item.tree3Length = tree2ChildLength;
            tree2Item.tree4Length = 0;
            tree2Item.tree5Length = 0;
            tree1Item.tree3Length += tree2ChildLength;

            for (let k = 0; k < tree2ChildLength; k++) {
                // 소분류
                const tree3Item = tree2Item.child[k],
                    tree3ChildLength = tree3Item.trees.length;

                tree3Item.tree4Length = tree3ChildLength;
                tree3Item.tree5Length = 0;
                tree2Item.tree4Length += tree3ChildLength;
                tree1Item.tree4Length += tree3ChildLength;

                for (let l = 0; l < tree3ChildLength; l++) {
                    // 공정
                    const tree4Item = tree3Item.trees[l],
                        tree4Child = tree4Item.equipments,
                        tree4ChildLength = tree4Child.length,
                        item = data[tree4Item.idn];

                    tree4Item.facList = {};
                    tree4Item.tree5Length = tree4ChildLength;
                    tree3Item.tree5Length += tree4ChildLength;
                    tree2Item.tree5Length += tree4ChildLength;
                    tree1Item.tree5Length += tree4ChildLength;

                    for (let m = 0; m < tree4ChildLength; m++) {
                        // 설비
                        const pid = tree4Child[m];

                        if (!tree4Item.facList[tree4Item.idn]) {
                            tree4Item.facList[tree4Item.idn] = {};
                        }
                        if (!tree4Item.facList[tree4Item.idn][pid]) {
                            tree4Item.facList[tree4Item.idn][pid] = {};
                        }

                        if (item) {
                            const facItem = item[pid];
                            tree4Item.facList[tree4Item.idn][pid] = facItem;

                            for (let n = 0; n < periodLength; n++) {
                                const date = period[n];

                                if (!this._dateSum[date]) {
                                    this._dateSum[date] = {};
                                    this._dateSum[date]['count'] = 0;
                                }
                                this._dateSum[date]['count']++;

                                for (let o = 0; o < colspan; o++) {
                                    // 항목
                                    const energy = this._energy[o],
                                        dataType = this._energyType[energy]['key'],
                                        data = facItem && facItem[date] && facItem[date][dataType] ? (Math.round(facItem[date][dataType] * 100) / 100) : 0;

                                    if (dataType === 'intensity') {
                                        if (!this._energy.includes('전력요금')) {
                                            if (!this._dateSum[date]['gold']) {
                                                this._dateSum[date]['gold'] = 0;
                                            }
                                            this._dateSum[date]['gold'] += facItem && facItem[date] && facItem[date]['gold'] ? facItem[date]['gold'] : 0;
                                        }
                                        if (!this._energy.includes('생산량')) {
                                            if (!this._dateSum[date]['amount']) {
                                                this._dateSum[date]['amount'] = 0;
                                            }
                                            this._dateSum[date]['amount'] += facItem && facItem[date] && facItem[date]['amount'] ? facItem[date]['amount'] : 0;
                                        }
                                    }

                                    // 날짜별 항목별 합계
                                    if (!this._dateSum[date][dataType]) {
                                        this._dateSum[date][dataType] = 0;
                                    }

                                    this._dateSum[date][dataType] += data;
                                }
                            }
                        }
                    }

                    if (this._treeType !== '5') {
                        for (let m = 0; m < periodLength; m++) {
                            // 기간
                            const date = period[m],
                                itemDate = item ? item[date] : null;

                            if (!this._dateSum[date]) {
                                this._dateSum[date] = {};
                                this._dateSum[date]['count'] = 0;
                            }
                            this._dateSum[date]['count']++;

                            for (let n = 0; n < colspan; n++) {
                                // 항목
                                const energy = this._energy[n],
                                    dataType = this._energyType[energy]['key'];

                                let data = itemDate && itemDate[dataType] ? (Math.round(itemDate[dataType] * 100) / 100) : 0;

                                // 대분류 합계
                                if (!tree1Item[date]) {
                                    tree1Item[date] = {};
                                }
                                if (!tree1Item[date][dataType]) {
                                    tree1Item[date][dataType] = 0;
                                }
                                tree1Item[date][dataType] += data;
                                if (dataType === 'intensity') {
                                    if (!this._energy.includes('전력요금')) {
                                        if (!tree1Item[date]['gold']) {
                                            tree1Item[date]['gold'] = 0;
                                        }
                                        tree1Item[date]['gold'] += itemDate && itemDate['gold'] ? (Math.round(itemDate['gold'] * 100) / 100) : 0;
                                    }
                                    if (!this._energy.includes('생산량')) {
                                        if (!tree1Item[date]['amount']) {
                                            tree1Item[date]['amount'] = 0;
                                        }
                                        tree1Item[date]['amount'] += itemDate && itemDate['amount'] ? (Math.round(itemDate['amount'] * 100) / 100) : 0;
                                    }
                                }

                                // 중분류 합계
                                if (!tree2Item[date]) {
                                    tree2Item[date] = {};
                                }
                                if (!tree2Item[date][dataType]) {
                                    tree2Item[date][dataType] = 0;
                                }
                                if (['91', '92', '98'].includes(this._fid) && this._treeType === '2' && ['외륜연마', '축연마'].includes(tree3Item['menu'])) {
                                    // 중분류 연마는 내륜연마 값으로만 적용한다.
                                    tree2Item[date]['amount'] = tree2Item['child'][0][date]['amount'];
                                    data = 0;
                                }
                                tree2Item[date][dataType] += data;
                                if (dataType === 'intensity') {
                                    if (!this._energy.includes('전력요금')) {
                                        if (!tree2Item[date]['gold']) {
                                            tree2Item[date]['gold'] = 0;
                                        }
                                        tree2Item[date]['gold'] += itemDate && itemDate['gold'] ? (Math.round(itemDate['gold'] * 100) / 100) : 0;
                                    }
                                    if (!this._energy.includes('생산량')) {
                                        if (!tree2Item[date]['amount']) {
                                            tree2Item[date]['amount'] = 0;
                                        }
                                        tree2Item[date]['amount'] += itemDate && itemDate['amount'] ? (Math.round(itemDate['amount'] * 100) / 100) : 0;
                                    }
                                }

                                // 소분류 합계
                                if (!tree3Item[date]) {
                                    tree3Item[date] = {};
                                }
                                if (!tree3Item[date][dataType]) {
                                    tree3Item[date][dataType] = 0;
                                }
                                tree3Item[date][dataType] += data;
                                if (dataType === 'intensity') {
                                    if (!this._energy.includes('전력요금')) {
                                        if (!tree3Item[date]['gold']) {
                                            tree3Item[date]['gold'] = 0;
                                        }
                                        tree3Item[date]['gold'] += itemDate && itemDate['gold'] ? (Math.round(itemDate['gold'] * 100) / 100) : 0;
                                    }
                                    if (!this._energy.includes('생산량')) {
                                        if (!tree3Item[date]['amount']) {
                                            tree3Item[date]['amount'] = 0;
                                        }
                                        tree3Item[date]['amount'] += itemDate && itemDate['amount'] ? (Math.round(itemDate['amount'] * 100) / 100) : 0;
                                    }
                                }

                                // 공정 합계
                                if (!tree4Item[date]) {
                                    tree4Item[date] = {};
                                }
                                if (!tree4Item[date][dataType]) {
                                    tree4Item[date][dataType] = 0;
                                }
                                tree4Item[date][dataType] += data;
                                if (dataType === 'intensity') {
                                    if (!this._energy.includes('전력요금')) {
                                        if (!tree4Item[date]['gold']) {
                                            tree4Item[date]['gold'] = 0;
                                        }
                                        tree4Item[date]['gold'] += itemDate && itemDate['gold'] ? (Math.round(itemDate['gold'] * 100) / 100) : 0;
                                    }
                                    if (!this._energy.includes('생산량')) {
                                        if (!tree4Item[date]['amount']) {
                                            tree4Item[date]['amount'] = 0;
                                        }
                                        tree4Item[date]['amount'] += itemDate && itemDate['amount'] ? (Math.round(itemDate['amount'] * 100) / 100) : 0;
                                    }
                                }

                                // 날짜별 항목별 합계
                                if (!this._dateSum[date][dataType]) {
                                    this._dateSum[date][dataType] = 0;
                                }

                                this._dateSum[date][dataType] += data;

                                if (dataType === 'intensity') {
                                    if (!this._energy.includes('전력요금')) {
                                        if (!this._dateSum[date]['gold']) {
                                            this._dateSum[date]['gold'] = 0;
                                        }
                                        this._dateSum[date]['gold'] += itemDate && itemDate['gold'] ? (Math.round(itemDate['gold'] * 100) / 100) : 0;
                                    }
                                    if (!this._energy.includes('생산량')) {
                                        if (!this._dateSum[date]['amount']) {
                                            this._dateSum[date]['amount'] = 0;
                                        }
                                        this._dateSum[date]['amount'] += itemDate && itemDate['amount'] ? (Math.round(itemDate['amount'] * 100) / 100) : 0;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

/**
 * 종합보고서 테이블 공정분류 매칭
 */
vio.reportSheet = async function(data) {
    const dom = document;

    await this.initData(data);

    let theadOut = this.getTheadHTML();
    let tbodyOut = this.getTbodyHTML();

    dom.getElementById('totalTable').classList.toggle('disable', !tbodyOut);
    dom.getElementById('notFoundData').classList.toggle('disable', !!tbodyOut);

    dom.getElementById('thead').innerHTML = theadOut;
    dom.getElementById('tbody').innerHTML = tbodyOut;
};

/**
 * 테이블 헤더 HTML 코드 반환
 * @returns {string}
 */
vio.getTheadHTML = function() {
    const colspan = this._energy.length,
        period = vio.period(),
        periodLength = period.length;

    let headOut = `<tr><th class="type sticky" colspan="${this._treeType}" rowspan="2">공정</th>`;

    let subHeadOut = '<tr>'; // 날짜별 항목
    let totalOut = `<tr class="trSum"><th class="totalSum" colspan="${this._treeType}">총합계</th>`; // 상단 총합계(날짜별 항목별 합계)
    for (let i = 0; i < periodLength; i++) {
        const periodItem = period[i];

        headOut += `<th class="sticky" colspan="${colspan}">${periodItem}</th>`;
        for (let j = 0; j < colspan; j++) {
            // 항목
            const energy = this._energy[j],
                key = this._energyType[energy]['key'] ? this._energyType[energy]['key'] : '',
                unit = this._energyType[energy]['unit'] ? `(${this._energyType[energy]['unit']})` : '',
                title = this._energyType[energy]['title'] ? this._energyType[energy]['title'] : energy,
                count = this._dateSum[periodItem] && this._dateSum[periodItem]['count'] ? this._dateSum[periodItem]['count'] : '';
            let total = this._dateSum[periodItem] && this._dateSum[periodItem][key] ? (Math.round(this._dateSum[periodItem][key] * 100) / 100) : 0;

            if (key === 'intensity') {
                const gold = this._dateSum[periodItem] && this._dateSum[periodItem]['gold'] ? this._dateSum[periodItem]['gold'] : 0,
                    amount = this._dateSum[periodItem] && this._dateSum[periodItem]['amount'] ? this._dateSum[periodItem]['amount'] : 0;

                total = amount ? Math.round(gold / amount * 100) / 100 : 0;
            } else if (this.isAvg(key) && total && count) {
                total = (Math.round(total / count * 100) / 100);
            }

            subHeadOut += `<th class="secondSticky">${title}<div>${unit}</div></th>`;
            totalOut += `<td>${this.echoNumber(total)}</td>`;
        }
    }

    // 오른쪽 총합계 계산
    const rightTotal = {};
    for (const date in this._dateSum) {
        for (const key in this._dateSum[date]) {
            if (!rightTotal[key]) {
                rightTotal[key] = 0;
            }
            rightTotal[key] += this._dateSum[date][key];
        }
    }

    // thead 오른쪽 총합계
    headOut += `<th class="stickyRight start rightSum" colspan="${colspan}">총합계</th>`;
    for (let j = 0; j < colspan; j++) {
        const energy = this._energy[j],
            key = this._energyType[energy]['key'] ? this._energyType[energy]['key'] : '',
            unit = this._energyType[energy]['unit'] ? `(${this._energyType[energy]['unit']})` : '',
            right = (colspan - j - 1) * 90;

        let total = rightTotal[key] ? (Math.round(rightTotal[key] * 100) / 100) : 0;
        if (key === 'intensity') {
            const gold = rightTotal['gold'] ? rightTotal['gold'] : 0,
                amount = rightTotal['amount'] ? rightTotal['amount'] : 0;

            total = gold && amount ? Math.round(gold / amount * 100) / 100 : 0;
        } else if (this.isAvg(key) && total) {
            // 오른쪽 총합계 단위가 퍼센트(%)라면 평균치로 계산
            total = Math.round(total / rightTotal['count'] * 100) / 100;
        }

        subHeadOut += `<th class="secondStickyRight start rightSum" style="right:${right}px">${energy}<div>${unit}</div></th>`;
        totalOut += `<td class="start rightSum" style="right:${right}px">${this.echoNumber(total)}</td>`;
    }
    subHeadOut += '</tr></tr>';
    totalOut += '</tr>';

    headOut += subHeadOut; // 오른쪽 총합계
    headOut += totalOut; // 상단 총합계(날짜별 항목별)

    return headOut;
};

/**
 * 테이블 바디 HTML 코드 반환
 * @returns {string}
 */
vio.getTbodyHTML = function() {
    let out;

    switch (this._treeType) {
        case '1': // 대분류
            out = vio.tree1TableHTML();
            break;
        case '2': // 중분류
            out = vio.tree2TableHTML();
            break;
        case '3': // 소분류
            out = vio.tree3TableHTML();
            break;
        case '4': // 공정(설비 미포함)
            out = vio.tree4TableHTML();
            break;
        default: // 공정전체(설비 포함)
            out = vio.tree5TableHTML();
    }

    return out;
};

/**
 * 대분류 HTML 코드 반환
 * @returns {string}
 */
vio.tree1TableHTML = function() {
    const tree1Length = this._trees.length,
        colspan = this._energy.length,
        period = vio.period(),
        periodLength = period.length;

    let out = '';
    let tree1Out = '';
    for (let i = 0; i < tree1Length; i++) {
        // 대분류
        const tree1Item = this._trees[i];

        let dataOut = '';
        let dataSum = {};

        tree1Out = `<th class="tree1Name">${tree1Item.menu}</th>`;

        for (let i = 0; i < periodLength; i++) {
            // 기간
            const periodItem = period[i];

            for (let j = 0; j < colspan; j++) {
                // 항목
                const energy = this._energy[j],
                    key = this._energyType[energy]['key'] ? this._energyType[energy]['key'] : '';

                let tree1Data = tree1Item[periodItem] && tree1Item[periodItem][key] ? (Math.round(tree1Item[periodItem][key] * 100) / 100) : 0;

                if (this.isAvg(key) && tree1Data && tree1Item.tree4Length) {
                    tree1Data = Math.round(tree1Data / tree1Item.tree4Length * 100) / 100;
                }

                if (energy === '원단위') {
                    // 원단위는 분류 합산으로 계산한다.
                    const gold = tree1Item[periodItem] && tree1Item[periodItem]['gold'] ? (Math.round(tree1Item[periodItem]['gold'] * 100) / 100) : 0,
                        amount = tree1Item[periodItem] && tree1Item[periodItem]['amount'] ? (Math.round(tree1Item[periodItem]['amount'] * 100) / 100) : 0;

                    tree1Data = gold && amount ? Math.round(gold / amount * 100) / 100 : 0;
                }

                tree1Out += `<td>${this.echoNumber(tree1Data)}</td>`;

                if (!dataSum[key]) {
                    dataSum[key] = 0;
                }

                dataSum[key] += tree1Data;
            }
        }

        Object.keys(dataSum).forEach((key, index) => {
            let data = Math.round(dataSum[key] * 100) / 100 ?? 0;
            const right = (colspan - index - 1) * 90;

            if (key === 'intensity') {
                const gold = dataSum['gold'],
                    amount = dataSum['amount'];

                data = gold && amount ? Math.round(gold / amount * 100) / 100 : 0;
            } else if (this.isAvg(key) && data) {
                data = Math.round(data / periodLength * 100) / 100;
            }

            dataOut += `<td class="start rightSum" style="right:${right}px">${this.echoNumber(data)}</td>`;
        });

        out += `<tr>${tree1Out}${dataOut}</tr>`;
    }

    return out;
};

/**
 * 중분류 HTML 코드 반환
 * @returns {string}
 */
vio.tree2TableHTML = function() {
    const tree1Length = this._trees.length,
        colspan = this._energy.length,
        period = vio.period(),
        periodLength = period.length;

    let out = '';
    for (let i = 0; i < tree1Length; i++) {
        // 대분류
        const tree1Item = this._trees[i],
            tree1Child = tree1Item.child,
            tree1ChildLength = tree1Child.length;

        let tree1Out = `<th class="tree1Name" rowspan="${tree1ChildLength}">${tree1Item.menu}</th>`;
        for (let j = 0; j < tree1ChildLength; j++) {
            // 중분류
            const tree2Item = tree1Child[j];

            let dataOut = '';
            let dataSum = {};

            let tree2Out = `<th class="tree2Name">${tree2Item.menu}</th>`;

            for (let k = 0; k < periodLength; k++) {
                // 기간
                const periodItem = period[k];

                for (let l = 0; l < colspan; l++) {
                    // 항목
                    const energy = this._energy[l],
                        key = this._energyType[energy]['key'] ? this._energyType[energy]['key'] : '';

                    let tree2Data = tree2Item[periodItem] && tree2Item[periodItem][key] ? (Math.round(tree2Item[periodItem][key] * 100) / 100) : 0;

                    if (this.isAvg(key) && tree2Data && tree2Item.tree4Length) {
                        tree2Data = Math.round(tree2Data / tree2Item.tree4Length * 100) / 100;
                    }

                    if (energy === '원단위') {
                        // 원단위는 분류 합산으로 계산한다.
                        const gold = tree2Item[periodItem] && tree2Item[periodItem]['gold'] ? (Math.round(tree2Item[periodItem]['gold'] * 100) / 100) : 0,
                            amount = tree2Item[periodItem] && tree2Item[periodItem]['amount'] ? (Math.round(tree2Item[periodItem]['amount'] * 100) / 100) : 0;

                        tree2Data = gold && amount ? Math.round(gold / amount * 100) / 100 : 0;
                    }

                    tree2Out += `<td>${this.echoNumber(tree2Data)}</td>`;

                    if (!dataSum[key]) {
                        dataSum[key] = 0;
                    }

                    dataSum[key] += tree2Data;
                }
            }

            Object.keys(dataSum).forEach((key, index) => {
                let data = Math.round(dataSum[key] * 100) / 100 ?? 0;
                const right = (colspan - index - 1) * 90;

                if (key === 'intensity') {
                    const gold = dataSum['gold'],
                        amount = dataSum['amount'];

                    data = gold && amount ? Math.round(gold / amount * 100) / 100 : 0;
                } else if (this.isAvg(key) && data) {
                    data = Math.round(data / periodLength * 100) / 100;
                }

                dataOut += `<td class="start rightSum" style="right:${right}px">${this.echoNumber(data)}</td>`;
            });

            out += `<tr>${tree1Out}${tree2Out}${dataOut}</tr>`;
            tree1Out = '';
        }
    }

    return out;
};

/**
 * 소분류 HTML 코드 반환
 * @returns {string}
 */
vio.tree3TableHTML = function() {
    const tree1Length = this._trees.length,
        colspan = this._energy.length,
        period = vio.period(),
        periodLength = period.length;

    let out = '';
    for (let i = 0; i < tree1Length; i++) {
        // 대분류
        const tree1Item = this._trees[i],
            tree1Child = tree1Item.child,
            tree1ChildLength = tree1Child.length;

        let tree1Out = `<th class="tree1Name" rowspan="${tree1Item.tree3Length}">${tree1Item.menu}</th>`;
        for (let j = 0; j < tree1ChildLength; j++) {
            // 중분류
            const tree2Item = tree1Child[j],
                tree2Child = tree2Item.child,
                tree2ChildLength = tree2Child.length;

            let tree2Out = `<th class="tree2Name" rowspan="${tree2ChildLength}">${tree2Item.menu}</th>`;
            for (let k = 0; k < tree2ChildLength; k++) {
                // 소분류
                const tree3Item = tree2Child[k];

                let dataOut = '';
                let dataSum = {};

                let tree3Out = `<th class="tree3Name">${tree3Item.menu}</th>`;
                for (let l = 0; l < periodLength; l++) {
                    // 기간
                    const periodItem = period[l];

                    for (let m = 0; m < colspan; m++) {
                        // 항목
                        const energy = this._energy[m],
                            key = this._energyType[energy]['key'] ? this._energyType[energy]['key'] : '';

                        let tree3Data = tree3Item[periodItem] && tree3Item[periodItem][key] ? (Math.round(tree3Item[periodItem][key] * 100) / 100) : 0;

                        if (this.isAvg(key) && tree3Data && tree3Item.tree4Length) {
                            tree3Data = Math.round(tree3Data / tree3Item.tree4Length * 100) / 100;
                        }

                        if (energy === '원단위') {
                            // 원단위는 분류 합산으로 계산한다.
                            const gold = tree3Item[periodItem] && tree3Item[periodItem]['gold'] ? (Math.round(tree3Item[periodItem]['gold'] * 100) / 100) : 0,
                                amount = tree3Item[periodItem] && tree3Item[periodItem]['amount'] ? (Math.round(tree3Item[periodItem]['amount'] * 100) / 100) : 0;

                            tree3Data = gold && amount ? Math.round(gold / amount * 100) / 100 : 0;
                        }

                        tree3Out += `<td>${this.echoNumber(tree3Data)}</td>`;

                        if (!dataSum[key]) {
                            dataSum[key] = 0;
                        }

                        dataSum[key] += tree3Data;
                    }
                }

                Object.keys(dataSum).forEach((key, index) => {
                    let data = Math.round(dataSum[key] * 100) / 100 ?? 0;
                    const right = (colspan - index - 1) * 90;

                    if (key === 'intensity') {
                        const gold = dataSum['gold'],
                            amount = dataSum['amount'];

                        data = gold && amount ? Math.round(gold / amount * 100) / 100 : 0;
                    } else if (this.isAvg(key) && data) {
                        data = Math.round(data / periodLength * 100) / 100;
                    }

                    dataOut += `<td class="start rightSum" style="right:${right}px">${this.echoNumber(data)}</td>`;
                });

                out += `<tr>${tree1Out}${tree2Out}${tree3Out}${dataOut}</tr>`;
                tree1Out = '';
                tree2Out = '';
            }
        }
    }

    return out;
};

/**
 * 공정 HTML 코드 반환
 * @returns {string}
 */
vio.tree4TableHTML = function() {
    const tree1Length = this._trees.length,
        colspan = this._energy.length,
        period = vio.period(),
        periodLength = period.length;

    let out = '';
    for (let i = 0; i < tree1Length; i++) {
        // 대분류
        const tree1Item = this._trees[i],
            tree1Child = tree1Item.child,
            tree1ChildLength = tree1Child.length;

        let tree1Out = `<th class="tree1Name" rowspan="${tree1Item.tree4Length}">${tree1Item.menu}</th>`;
        for (let j = 0; j < tree1ChildLength; j++) {
            // 중분류
            const tree2Item = tree1Child[j],
                tree2Child = tree2Item.child,
                tree2ChildLength = tree2Child.length;

            let tree2Out = `<th class="tree2Name" rowspan="${tree2Item.tree4Length}">${tree2Item.menu}</th>`;
            for (let k = 0; k < tree2ChildLength; k++) {
                // 소분류
                const tree3Item = tree2Child[k],
                    tree3Child = tree3Item.trees,
                    tree3ChildLength = tree3Child.length;

                let tree3Out = `<th class="tree3Name" rowspan="${tree3ChildLength}">${tree3Item.menu}</th>`;
                for (let l = 0; l < tree3ChildLength; l++) {
                    // 공정
                    const tree4Item = tree3Child[l];

                    let dataOut = '';
                    let dataSum = {};

                    let tree4Out = `<th class="tree4Name">${tree4Item.nickname}</th>`;
                    for (let m = 0; m < periodLength; m++) {
                        // 기간
                        const periodItem = period[m];

                        for (let n = 0; n < colspan; n++) {
                            // 항목
                            const energy = this._energy[n],
                                key = this._energyType[energy]['key'] ? this._energyType[energy]['key'] : '',
                                data = tree4Item[periodItem] && tree4Item[periodItem][key] ? (Math.round(tree4Item[periodItem][key] * 100) / 100) : 0;

                            tree4Out += `<td>${this.echoNumber(data)}</td>`;

                            if (!dataSum[key]) {
                                dataSum[key] = 0;
                            }

                            dataSum[key] += data;
                        }
                    }

                    Object.keys(dataSum).forEach((key, index) => {
                        let data = Math.round(dataSum[key] * 100) / 100 ?? 0;
                        const right = (colspan - index - 1) * 90;

                        if (key === 'intensity') {
                            const gold = dataSum['gold'],
                                amount = dataSum['amount'];

                            data = gold && amount ? Math.round(gold / amount * 100) / 100 : 0;
                        } else if (this.isAvg(key) && data) {
                            data = Math.round(data / periodLength * 100) / 100;
                        }

                        dataOut += `<td class="start rightSum" style="right:${right}px">${this.echoNumber(data)}</td>`;
                    });

                    out += `<tr>${tree1Out}${tree2Out}${tree3Out}${tree4Out}${dataOut}</tr>`;
                    tree1Out = '';
                    tree2Out = '';
                    tree3Out = '';
                }
            }
        }
    }

    return out;
};

/**
 * 공정전체 HTML 코드 반환
 * @returns {string}
 */
vio.tree5TableHTML = function() {
    const tree1Length = this._trees.length,
        colspan = this._energy.length,
        period = vio.period(),
        periodLength = period.length;

    let out = '';
    for (let i = 0; i < tree1Length; i++) {
        // 대분류
        const tree1Item = this._trees[i],
            tree1Child = tree1Item.child,
            tree1ChildLength = tree1Child.length;

        let tree1Out = `<th class="tree1Name" rowspan="${tree1Item.tree5Length}">${tree1Item.menu}</th>`;
        for (let j = 0; j < tree1ChildLength; j++) {
            // 중분류
            const tree2Item = tree1Child[j],
                tree2Child = tree2Item.child,
                tree2ChildLength = tree2Child.length;

            let tree2Out = `<th class="tree2Name" rowspan="${tree2Item.tree5Length}">${tree2Item.menu}</th>`;
            for (let k = 0; k < tree2ChildLength; k++) {
                // 소분류
                const tree3Item = tree2Child[k],
                    tree3Child = tree3Item.trees,
                    tree3ChildLength = tree3Child.length;

                let tree3Out = `<th class="tree3Name" rowspan="${tree3Item.tree5Length}">${tree3Item.menu}</th>`;
                for (let l = 0; l < tree3ChildLength; l++) {
                    // 공정
                    const tree4Item = tree3Child[l],
                        tree4Child = tree4Item.equipments,
                        tree4ChildLength = tree4Child.length,
                        facList = tree4Item.facList;

                    let tree4Out = `<th class="tree4Name" rowspan="${tree4ChildLength}">${tree4Item.nickname}</th>`;
                    for (let m = 0; m < tree4ChildLength; m++) {
                        // 설비
                        const pid = tree4Child[m],
                            fac = vio._facList.find(row => row.pid === pid),
                            facName = fac ? fac.name : '',
                            facItem = facList[tree4Item.idn][pid];

                        let dataOut = '';
                        let dataSum = {};

                        let tree5Out = `<th class="tree5Name">${facName}</th>`;
                        for (let n = 0; n < periodLength; n++) {
                            // 기간
                            const periodItem = period[n];

                            for (let o = 0; o < colspan; o++) {
                                // 항목
                                const energy = this._energy[o],
                                    key = this._energyType[energy]['key'] ? this._energyType[energy]['key'] : '';

                                let data = facItem?.[periodItem]?.[key];
                                data = data ? Math.round(parseFloat(data) * 100) / 100 : 0;

                                tree5Out += `<td>${this.echoNumber(data)}</td>`;

                                if (!dataSum[key]) {
                                    dataSum[key] = 0;
                                }

                                dataSum[key] += data;
                            }
                        }

                        Object.keys(dataSum).forEach((key, index) => {
                            let data = Math.round(dataSum[key] * 100) / 100 ?? 0;
                            const right = (colspan - index - 1) * 90;

                            if (key === 'intensity') {
                                const gold = dataSum['gold'],
                                    amount = dataSum['amount'];

                                data = gold && amount ? Math.round(gold / amount * 100) / 100 : 0;
                            } else if (this.isAvg(key) && data) {
                                data = Math.round(data / periodLength * 100) / 100;
                            }

                            dataOut += `<td class="start rightSum" style="right:${right}px">${this.echoNumber(data)}</td>`;
                        });

                        out += `<tr>${tree1Out}${tree2Out}${tree3Out}${tree4Out}${tree5Out}${dataOut}</tr>`;
                        tree1Out = '';
                        tree2Out = '';
                        tree3Out = '';
                        tree4Out = '';
                    }
                }
            }
        }
    }

    return out;
};

/**
 * 일별/월별/연별
 * @returns {number}
 */
vio.getType = function() {
    const dataType = document.querySelector('.tabUi .active').getAttribute('data-type');

    switch (dataType) {
        case 'months':
            return 1;
        case 'years':
            return 2;
        default:
            return 0;
    }
}

/**
 * 즐겨찾기 데이터 요청
 * @param id
 */
vio.getData = async function(id) {
    if (id === this._bookmarkId) {
        return;
    }

    await vio.getBookmarkData(id);
    await vio.base();
};

/**
 * 즐겨찾기 활성화
 * @returns {Promise<void>}
 */
vio.getBookmarkData = function(id) {
    const dom = document;

    this._bookmarkId = id;

    dom.querySelectorAll('.bmarkArea .bookmark').forEach(element => element.classList.remove('active'));
    dom.getElementById(`bookmark${this._bookmarkId}`).classList.add('active');

    vio.activeItems();
};

/**
 * 즐겨찾기 항목 활성화
 */
vio.activeItems = function() {
    const dom = document,
        bookmark = this._bookmark.find(row => row.idn === this._bookmarkId);

    if (!bookmark && !bookmark.items.length) {
        return;
    }

    // 일별/월별/연별 체크
    const types = dom.querySelectorAll('.tabUi a');
    const unit = vio._type[bookmark.unit];
    types.forEach(type => type.classList.remove('active'));
    dom.querySelector(`.tabUi [data-type="${unit}"]`).classList.add('active');
    this.changeDatePicker(unit);
    
    // 분류 선택
    dom.getElementById('treeType').value = bookmark.category || 5;

    // 배열에 담긴 id와 체크박스의 value를 비교하여 체크박스 체크
    const checkboxes = dom.querySelectorAll('.rowFilter input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = bookmark.tags.includes(checkbox.value);
    });
};

/**
 * 수정/삭제 버튼 토글
 * @param element
 * @param id
 */
vio.toggleMoreGp = function(element, id) {
    document.querySelectorAll('.moreGp').forEach(dot => dot.classList.add('disable'));
    this._targetId = id;

    setTimeout(function() {
        element.nextElementSibling.classList.remove('disable');
    }, 0);
};

/**
 * 즐겨찾기 수정
 */
vio.modifyBookmark = function() {
    this.dialog({act: 'open', tag: 'modifyBookmarkFixed', memo: '현재 선택된 항목으로 저장하시겠습니까?'});
};

/**
 * 즐겨찾기 수정 요청
 */
vio.modifyBookmarkFixed = function() {
    const bookmark = this._bookmark.find(row => row.idn === this._targetId);

    this.showBookmarkPopup();

    document.getElementById('bookmarkName').value = bookmark.label;
};

/**
 * 즐겨찾기 삭제
 */
vio.removeBookmark = function() {
    this.dialog({act: 'open', tag: 'removeBookmarkFixed', memo: '정말 삭제하시겠습니까?<br/>되돌릴 수 없습니다.'});
}

/**
 * 즐겨찾기 삭제 요청
 * @returns {Promise<void>}
 */
vio.removeBookmarkFixed = async function() {
    const bookmark = this._bookmark.find(row => row.idn === this._targetId);

    if (!this._targetId || !bookmark) {
        this.toast({memo: '올바르지 않은 요청입니다.'});
        return;
    }

    const res = await fetch(`/api/tunnels/${this._fid}/ids/${this._targetId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    vio.netAble(false);

    if (!res.ok) {
        console.error(res.status);
    } else {
        await vio.energyReport();
        await this.reportTotal();
    }
};

/**
 * 즐겨찾기 팝업 숨기기
 */
vio.hideBookmarkPopup = function() {
    const dom = document,
        modalBox = dom.getElementById('modalBox');

    dom.getElementById('modal').classList.add('disable');
    modalBox.style.top = '0px';
    modalBox.style.left = '0px';
};

/**
 * 즐겨찾기 팝업 표시
 */
vio.showBookmarkPopup = function(blank) {
    const dom = document,
        checkBoxes = document.querySelectorAll('.fillterScroll input[type="checkbox"]:checked')

    if (!checkBoxes.length) {
        this.toast({memo: '항목을 선택해 주세요.'});
        return;
    }

    if (blank) {
        this._bookmarkId = '';
        this._targetId = '';
        dom.getElementById('bookmarkName').value = '';
    }

    dom.getElementById('modal').classList.remove('disable');
    dom.getElementById('bookmarkName').focus();
};

/**
 * 즐겨찾기 저장 요청
 * @returns {Promise<void>}
 */
vio.saveBookmark = async function() {
    const dom = document,
        bookmarkName = dom.getElementById('bookmarkName');

    if (!bookmarkName.value) {
        this.toast({memo: '즐겨찾기 이름을 입력해 주세요.'});
        bookmarkName.focus();
        return;
    }

    if (this._targetId) {
        // 수정
        await vio.updateBookmark();
    } else {
        // 등록
        await vio.addBookmark();
    }

    dom.getElementById('bookmarkName').value = '';
    dom.getElementById('modal').classList.add('disable');
};

/**
 * 즐겨찾기 등록
 * @returns {Promise<void>}
 */
vio.addBookmark = async function() {
    const dom = document,
        bookmarkName = dom.getElementById('bookmarkName').value,
        checkBoxes = dom.querySelectorAll('.fillterScroll input[type="checkbox"]:checked');

    let tags = [];
    for (let i = 0; i < checkBoxes.length; i++) {
        const item = checkBoxes[i];
        tags.push(item.value);
    }

    const params = {
        label: bookmarkName,
        tags: tags,
        unit: this.getType(),
        category: dom.getElementById('treeType').value
    }

    vio.netAble(true);

    const res = await fetch(`/api/tunnels/${this._fid}`, {
        method: 'PUT',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(params)
    });

    vio.netAble(false);

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();
        this._bookmarkId = jsonData.idn;

        this.toast({memo: '추가되었습니다.'});
        await vio.reportTotal();
    }
};

/**
 * 즐겨찾기 수정
 * @returns {Promise<void>}
 */
vio.updateBookmark = async function() {
    const dom = document,
        bookmarkName = dom.getElementById('bookmarkName').value,
        checkBoxes = dom.querySelectorAll('.fillterScroll input[type="checkbox"]:checked');

    let tags = [];
    for (let i = 0; i < checkBoxes.length; i++) {
        const item = checkBoxes[i];
        tags.push(item.value);
    }

    const params = {
        label: bookmarkName,
        tags: tags,
        unit: this.getType(),
        category: dom.getElementById('treeType').value
    }

    vio.netAble(true);

    const res = await fetch(`/api/tunnels/${this._fid}/keys/${this._targetId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(params)
    });

    vio.netAble(false);

    if (!res.ok) {
        console.error(res.status);
    } else {
        this._bookmarkId = this._targetId;

        this.toast({memo: '수정되었습니다.'});
        await vio.reportTotal();
    }
};

/**
 * 단위가 퍼센트(%)인지 체크
 * @param key
 * @returns {boolean}
 */
vio.isAvg = function(key) {
    return this._energyAvg.includes(key);
};

/**
 * datePicker 타입, 포맷 변경
 * @param type
 */
vio.changeDatePicker = function(type) {
    // 날짜 포맷 변경
    let dateType = 'date';
    let dateFormat = 'YYYY-MM-dd';
    switch (type) {
        case 'months':
            dateType = 'month';
            dateFormat = 'YYYY-MM';
            break;
        case 'years':
            dateType = 'year';
            dateFormat = 'YYYY';
            break;
    }

    vio._datePicker._startpicker.setType(dateType);
    vio._datePicker._startpicker.setDateFormat(dateFormat);
    vio._datePicker._endpicker.setType(dateType);
    vio._datePicker._endpicker.setDateFormat(dateFormat);
};

/**
 * 이벤트 리스너 등록
 */
vio.eventListenerReport = function() {
    const dom = document;

    // 기간 타입 버튼
    dom.getElementById('tabUi').addEventListener('click', function(event) {
        const target = event.target,
            type = target.getAttribute('data-type');

        if (type) {
            // 모두 비활성화
            dom.querySelectorAll('.tabUi a').forEach(element => element.classList.remove('active'));
            // 선택한 element만 활성화
            target.classList.add('active');

            vio.changeDatePicker(type);
        }
    });
    // 상세조건 버튼
    dom.getElementById('btnFilter').addEventListener('click', function() {
        dom.getElementById('rowFilter').classList.toggle('disable');
    });
    // 상세조건 닫기 버튼
    dom.getElementById('btnClose').addEventListener('click', function() {
        dom.getElementById('rowFilter').classList.add('disable');
    });
    // 상세조건 항목 전체해제 버튼
    dom.getElementById('uncheckAllCheckbox').addEventListener('click', function() {
        dom.querySelectorAll('.filterTb input[type="checkbox"]').forEach(element => {
            element.checked = false;
        });
    });
    // 문서의 다른 영역을 클릭 시 수정/삭제 숨기기
    dom.addEventListener('click', function() {
        const moreContents = dom.querySelectorAll('.moreGp');
        moreContents.forEach(content => content.classList.add('disable'));
    });
    // 버튼 클릭 시 이벤트 전파 중지
    dom.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });
    // 더보기 컨텐츠 클릭 시 이벤트 전파 중지
    dom.querySelectorAll('.moreGp').forEach(content => {
        content.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });
    // 행합계 체크박스
    dom.getElementById('ckTrSum').addEventListener('change', function() {
        dom.querySelectorAll('.totalTable .rightSum').forEach(element => {
            element.classList.toggle('disable', !this.checked);
        });
    });
    // 팝업 Draggable
    $("#modalBox").draggable({containment: 'body'});

    // 엑셀 다운로드
    this.excelDownload();
};

/**
 * 엑셀 다운로드
 */
vio.excelDownload = function() {
    const dom = document;

    dom.getElementById('actExcelSave').addEventListener('click', function() {
        let type;
        switch (vio._periodType) {
            case 'months':
                type = '월별';
                break;
            case 'years':
                type = '연별';
                break;
            default:
                type = '일별';
                break;
        }

        const saveName = `[${dom.title}]${type} ${vio._sDate} ~ ${vio._eDate}.xlsx`;

        let workbook = XLSX.utils.table_to_book(dom.getElementById('totalTable')),
            ws = workbook.Sheets['Sheet1'];
        XLSX.writeFile(workbook, saveName);
    });
};

/**
 * Toast UI DatePicker 초기화
 */
vio.initCalendar = function() {
    const today = new Date(),
        nowData = new Date();

    nowData.setDate(nowData.getDate() - 7);

    this._datePicker = tui.DatePicker.createRangePicker({
        startpicker: {
            date: nowData,
            input: '#sDate',
            container: '#sDateWrapper'
        },
        endpicker: {
            date: today,
            input: '#eDate',
            container: '#eDateWrapper'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today]
        ],
        format: 'YYYY-MM-dd',
        language: 'ko'
    });
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.initCalendar();
    await vio.facility();
    await vio.reportTotal();

    await vio.eventListenerReport();
});
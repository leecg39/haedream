'use strict';

vio._depth1 = new Set(); // 공정분류 대분류 (다중선택)
vio._depth2 = new Set(); // 공정분류 중분류 (다중선택)
vio._depth3 = new Set(); // 공정분류 소분류 (다중선택)
vio._depth4 = new Set(); // 공정 (다중선택)

vio._trees = []; // 메뉴 리스트

vio._energyDepth = []; // 공정 목록 리스트
vio._facList = []; // 설비 목록
vio._facData = []; // 설비 목록 (에너지 사용량 포함)
vio._energyFac = []; // 에너지 설비 목록

vio._monitData = [];

vio._wattTotal = {}; // 전력 사용량 총합
vio._gasTotal = {}; // 도시가스 사용량 총합
vio._waterTotal = {}; // 용수 사용량 총합

vio._isWatt = {}; // 전력 사용 여부
vio._isGas = {}; // 도시가스 사용 여부
vio._isWater = {}; // 용수 사용 여부

vio._historyType = { // 변경이력 항목
    1: '공정분류',
    2: '공정',
    3: '에너지원'
};
vio._yieldUnit = 'ton'; // 생산량 단위
vio._intensityUnit = 'kWh/ton'; // 원단위 단위

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
 * 공정분류 API 요청
 * @returns {Promise<void>}
 */
vio.tree = async function() {
    const res = await fetch(`/api/pipes/${this._fid}/trees`, {
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
            this._yieldUnit = jsonData.amountUnit || 'ton';
            this._intensityUnit = `kWh/${this._yieldUnit}`;
            this._trees = jsonData.data;
            this.buildTree();
            this.buildItemList();
        }
    }
};

/**
 * 분류 계층형 구조 생성
 */
vio.buildTree = function() {
    const dom = document,
        hierarchy = this._trees;

    let out = '',
        firstTree1Idn = null,
        firstTree2Idn = null,
        firstTree3Idn = null;
    for (let i = 0; i < hierarchy.length; i++) {
        // 대분류
        const tree1Item = hierarchy[i],
            tree1 = tree1Item.menu;

        if (i === 0) {
            firstTree1Idn = tree1Item.idn;
        }

        out += `
        <li>
            <a href="javascript:void(0)" class="depth1 tree" data-tree1="${tree1Item.idn}" onclick="vio.activeTree(this)">
                ${tree1}
            </a>
            <ul class="dep2">`;

        for (let j = 0; j < tree1Item.child.length; j++) {
            // 중분류
            const tree2Item = tree1Item.child[j],
                tree2 = tree2Item.menu;

            if (i === 0 && j === 0) {
                firstTree2Idn = tree2Item.idn;
            }

            out += `
            <li>
                <a href="javascript:void(0)" class="depth2 tree" data-tree1="${tree1Item.idn}" data-tree2="${tree2Item.idn}" onclick="vio.activeTree(this)">
                    ${tree2}
                </a>
                <ul class="dep3">`;

            for (let k = 0; k < tree2Item.child.length; k++) {
                // 소분류
                const tree3Item = tree2Item.child[k],
                    tree3 = tree3Item.menu;

                if (i === 0 && j === 0 && k === 0) {
                    firstTree3Idn = tree3Item.idn;
                }

                out += `
                <li>
                    <a href="javascript:void(0)"
                        class="depth3 tree"
                        data-tree1="${tree1Item.idn}"
                        data-tree2="${tree2Item.idn}"
                        data-tree3="${tree3Item.idn}"
                        onclick="vio.activeTree(this)">
                        ${tree3}
                    </a>
                </li>`;
            }
            out += '</ul></li>';
        }
        out += '</ul></li>';
    }

    if (out) {
        dom.getElementById('tree').innerHTML = out;
        dom.getElementById('notFoundData').classList.add('disable');

        if (firstTree3Idn !== null) {
            const depth3 = dom.querySelector(`[data-tree1="${firstTree1Idn}"][data-tree2="${firstTree2Idn}"][data-tree3="${firstTree3Idn}"]`);
            if (depth3) {
                setTimeout(function() {
                    depth3.click();
                });
            }
        }
    } else {
        dom.getElementById('notFoundData').classList.remove('disable');
    }
};

/**
 * 컨텐츠 영역 분류 및 설비 계층 구조 생성
 */
vio.buildItemList = function() {
    const dom = document,
        hierarchy = this._trees;

    let out = '';
    for (let i = 0; i < hierarchy.length; i++) {
        // 대분류
        const tree1Item = hierarchy[i];

        out += `<ul class="depth1${!this._depth1.has(tree1Item.idn) ? ' disable' : ''}" data-tree1="${tree1Item.idn}">`;
        let tree1Watt = false;
        let tree1Gas = false;
        let tree1Water = false;
        let wattSum = 0;
        let gasSum = 0;
        let waterSum = 0;
        let outputSum = 0;
        for (let j = 0; j < tree1Item.child.length; j++) {
            // 중분류
            const tree2Item = tree1Item.child[j],
                tree2 = tree2Item.menu;

            let subOut = '';
            let tree2Watt = false;
            let tree2Gas = false;
            let tree2Water = false;
            let subWattSum = 0;
            let subGasSum = 0;
            let subWaterSum = 0;
            let subOutputSum = 0;
            for (let k = 0; k < tree2Item.child.length; k++) {
                // 소분류
                const tree3Item = tree2Item.child[k],
                    tree3 = tree3Item.menu;

                let tree3Watt = false;
                let tree3Gas = false;
                let tree3Water = false;
                let energyOut = '';
                let energyWattSum = 0;
                let energyGasSum = 0;
                let energyWaterSum = 0;
                let energyOutputSum = 0;
                const energyFac = this._energyFac.filter(row => row.menu === tree3Item.idn);
                for (let l = 0; l < energyFac.length; l++) {
                    // 공정 목록
                    const facItem = energyFac[l];

                    let tree4Watt = false;
                    let tree4Gas = false;
                    let tree4Water = false;


                    if (facItem.unit1) {
                        tree1Watt = true;
                        tree2Watt = true;
                        tree3Watt = true;
                        tree4Watt = true;
                    }
                    if (facItem.unit2) {
                        tree1Gas = true;
                        tree2Gas = true;
                        tree3Gas = true;
                        tree4Gas = true;
                    }
                    if (facItem.unit3) {
                        tree1Water = true;
                        tree2Water = true;
                        tree3Water = true;
                        tree4Water = true;
                    }

                    let facOut = '';
                    let facWattSum = 0;
                    let facGasSum = 0;
                    let facWaterSum = 0;
                    let facOutputSum = 0;

                    const maxLength = Math.max(facItem.energy1.length, facItem.energy2.length, facItem.energy3.length);
                    for (let m = 0; m < maxLength; m++) {
                        // 설비 목록
                        const energy1Item = facItem.energy1[m],
                            energy2Item = facItem.energy2[m],
                            energy3Item = facItem.energy3[m],
                            energy1Usage = this._facData.find(row => energy1Item && row.pid === energy1Item.pid),
                            energy2Usage = this._facData.find(row => energy2Item && row.pid === energy2Item.pid),
                            energy3Usage = this._facData.find(row => energy3Item && row.pid === energy3Item.pid);

                        let watt = 0,
                            gas = 0,
                            water = 0,
                            output = 0,
                            facName = '';
                        if (energy1Usage) {
                            facName = energy1Usage.name;
                            output = energy1Usage.output;
                            watt = energy1Item.ratio && energy1Usage.watt ? energy1Item.ratio / 100 * energy1Usage.watt : 0;
                        } else if (energy2Usage) {
                            facName = energy2Usage.name;
                            output = energy2Usage.output;
                            gas = energy2Item.ratio && energy2Usage.gas ? energy2Item.ratio / 100 * energy2Usage.gas : 0;
                        } else if (energy3Usage) {
                            facName = energy2Usage.name;
                            output = energy3Usage.output;
                            water = energy3Item.ratio && energy3Usage.water ? energy3Item.ratio / 100 * energy3Usage.water : 0;
                        } else {
                            if (energy1Item) {
                                const facItem = this._facList.find(row => row.pid === energy1Item.pid);
                                facName = facItem ? facItem.name : '';
                            } else if (energy2Item) {
                                const facItem = this._facList.find(row => row.pid === energy2Item.pid);
                                facName = facItem ? facItem.name : '';
                            } else if (energy3Item) {
                                const facItem = this._facList.find(row => row.pid === energy3Item.pid);
                                facName = facItem ? facItem.name : '';
                            }
                        }

                        facWattSum += watt;
                        facGasSum += gas;
                        facWaterSum += water;
                        facOutputSum += output;

                        // 설비 목록 HTML
                        facOut += `
                        <li>
                            <div class="name" title="${facName}">${facName}</div>
                            <div class="infoText2">
                                <div class="light${!tree4Watt ? ' disable' : ''}">
                                    <span>전력량</span>
                                    <span class="num wattColor">${this.echoNumber(watt)}</span>
                                </div>
                                <div class="gas${!tree4Gas ? ' disable' : ''}">
                                    <span>도시가스</span>
                                    <span class="num gasColor">${this.echoNumber(gas)}</span>
                                </div>
                                <div class="water${!tree4Water ? ' disable' : ''}">
                                    <span>용수</span>
                                    <span class="num waterColor">${this.echoNumber(water)}</span>
                                </div>
                            </div>
                        </li>`
                    }

                    // 공정 목록 HTML
                    const facIntensity = facWattSum && facOutputSum ? Math.round(facWattSum / facOutputSum * 100) / 100 : 0;
                    energyOut += `
                    <li>
                        <div class="dPro tree depth4" data-tree1="${tree1Item.idn}" data-tree2="${tree2Item.idn}" data-tree3="${tree3Item.idn}" data-tree4="${facItem.idn}" onclick="vio.activeContentTree(this)">
                            <span class="pipeLine selectWatt light${!tree4Watt ? ' disable noData' : ''}"></span>
                            <span class="pipeLine selectGas gas${!tree4Gas ? ' disable noData' : ''}"></span>
                            <span class="pipeLine selectWater water${!tree4Water ? ' disable noData' : ''}"></span>
                            <div class="name" title="${facItem.nickname ?? ''}">
                                ${facItem.nickname ?? ''}
                            </div>
                            <div class="infoText">
                                <div class="infoTextAlgin">
                                    <div class="light selectWatt${!tree4Watt ? ' disable noData' : ''}">
                                        <span>전력량</span>
                                        <span class="num">${this.echoNumber(Math.round(facWattSum * 100) / 100)} kWh</span>
                                    </div>
                                    <div class="gas selectGas${!tree4Gas ? ' disable noData' : ''}">
                                        <span>도시가스</span>
                                        <span class="num">${this.echoNumber(facGasSum)} Nm³</span>
                                    </div>
                                    <div class="water selectWater${!tree4Water ? ' disable noData' : ''}">
                                        <span>용수</span>
                                        <span class="num">${this.echoNumber(facWaterSum)} ton</span>
                                    </div>
                                    <div class="vol">
                                        <span>생산량</span>
                                        <span class="num">${this.echoNumber(facOutputSum)} ${vio._yieldUnit}</span>
                                    </div>
                                    <div class="wonUnit">
                                        <span>원단위</span>
                                        <span class="num">${this.echoNumber(facIntensity)} ${vio._intensityUnit}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <ul class="facBox">${facOut}</ul>
                    </li>`;

                    energyWattSum += facWattSum;
                    energyGasSum += facGasSum;
                    energyWaterSum += facWaterSum;
                    energyOutputSum += facOutputSum;
                }
                energyWattSum = Math.floor(energyWattSum);

                // 소분류 목록 HTML
                const energyIntensity = energyWattSum && energyOutputSum ? Math.round(energyWattSum / energyOutputSum * 100) / 100 : 0;
                subOut += `
                <li>
                    <div class="dPro tree depth3" data-tree1="${tree1Item.idn}" data-tree2="${tree2Item.idn}" data-tree3="${tree3Item.idn}" onclick="vio.activeTree(this)">
                        <span class="pipeLine selectWatt light${!tree3Watt ? ' disable noData' : ''}"></span>
                        <span class="pipeLine selectGas gas${!tree3Gas ? ' disable noData' : ''}"></span>
                        <span class="pipeLine selectWater water${!tree3Water ? ' disable noData' : ''}"></span>
                        <div class="name" title="${tree3}">
                            ${tree3}
                        </div>
                        <div class="infoText">
                            <div class="infoTextAlgin">
                                <div class="light selectWatt${!tree3Watt ? ' disable noData' : ''}">
                                    <span>전력량</span>
                                    <span class="num">${this.echoNumber(energyWattSum)} kWh</span>
                                </div>
                                <div class="gas selectGas${!tree3Gas ? ' disable noData' : ''}">
                                    <span>도시가스</span>
                                    <span class="num">${this.echoNumber(energyGasSum)} Nm³</span>
                                </div>
                                <div class="water selectWater${!tree3Water ? ' disable noData' : ''}">
                                    <span>용수</span>
                                    <span class="num">${this.echoNumber(energyWaterSum)} ton</span>
                                </div>
                                <div class="vol">
                                    <span>생산량</span>
                                    <span class="num">${this.echoNumber(energyOutputSum)} ${vio._yieldUnit}</span>
                                </div>
                                <div class="wonUnit">
                                    <span>원단위</span>
                                    <span class="num">${this.echoNumber(energyIntensity)} ${vio._intensityUnit}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <ul class="monitCont">${energyOut}</ul>
                </li>`;

                subWattSum += energyWattSum;
                subGasSum += energyGasSum;
                subWaterSum += energyWaterSum;
                subOutputSum += energyOutputSum;
            }
            subWattSum = Math.floor(subWattSum);

            // 중분류 목록 HTML
            const subIntensity = subWattSum && subOutputSum ? Math.round(subWattSum / subOutputSum * 100) / 100 : 0;
            out += `
            <li>
                <div class="dPro tree depth2" data-tree1="${tree1Item.idn}" data-tree2="${tree2Item.idn}" onclick="vio.activeTree(this)">
                    <span class="pipeLine selectWatt light${!tree2Watt ? ' disable noData' : ''}"></span>
                    <span class="pipeLine selectGas gas${!tree2Gas ? ' disable noData' : ''}"></span>
                    <span class="pipeLine selectWater water${!tree2Water ? ' disable noData' : ''}"></span>
                    <div class="name" title="${tree2}">${tree2}</div>
                    <div class="infoText">
                        <div class="infoTextAlgin">
                            <div class="light selectWatt${!tree2Watt ? ' disable noData' : ''}">
                                <span>전력량</span>
                                <span class="num">${this.echoNumber(subWattSum)} kWh</span>
                            </div>
                            <div class="gas selectGas${!tree2Gas ? ' disable noData' : ''}">
                                <span>도시가스</span>
                                <span class="num">${this.echoNumber(subGasSum)} Nm³</span>
                            </div>
                            <div class="water selectWater${!tree2Water ? ' disable noData' : ''}">
                                <span>용수</span>
                                <span class="num">${this.echoNumber(subWaterSum)} ton</span>
                            </div>
                            <div class="vol">
                                <span>생산량</span>
                                <span class="num">${this.echoNumber(subOutputSum)} ${vio._yieldUnit}</span>
                            </div>
                            <div class="wonUnit">
                                <span>원단위</span>
                                <span class="num">${this.echoNumber(subIntensity)} ${vio._intensityUnit}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <ul class="monitCont">${subOut}</ul>
            </li>`;

            wattSum += subWattSum;
            gasSum += subGasSum;
            waterSum += subWaterSum;
            outputSum += subOutputSum;
        }
        out += '</ul>';

        this._wattTotal[tree1Item.idn] = wattSum;
        this._gasTotal[tree1Item.idn] = gasSum;
        this._waterTotal[tree1Item.idn] = waterSum;

        this._isWatt[tree1Item.idn] = tree1Watt;
        this._isGas[tree1Item.idn] = tree1Gas;
        this._isWater[tree1Item.idn] = tree1Water;
    }

    dom.getElementById('monitCont').innerHTML = out;
}

/**
 * 선택한 분류 활성화 (다중선택 지원)
 * @param element
 */
vio.activeTree = async function(element) {
    const dom = document,
        d1 = parseInt(element.getAttribute('data-tree1') ?? 0),
        d2 = parseInt(element.getAttribute('data-tree2') ?? 0),
        d3 = parseInt(element.getAttribute('data-tree3') ?? 0),
        d4 = parseInt(element.getAttribute('data-tree4') ?? 0);

    const depthClass = element.classList.contains('depth1') ? 1
        : element.classList.contains('depth2') ? 2
        : element.classList.contains('depth3') ? 3
        : element.classList.contains('depth4') ? 4 : 0;

    const isActive = element.classList.contains('active');

    // toggle: 이미 활성화된 항목은 제거, 아니면 추가
    if (depthClass === 1) {
        if (isActive) {
            this._depth1.delete(d1);
            // 해당 대분류에 속한 하위 depth도 모두 제거
            this._depth2.forEach(v => {
                const el = dom.querySelector(`.depth2[data-tree1="${d1}"][data-tree2="${v}"]`);
                if (el) this._depth2.delete(v);
            });
            this._depth3.forEach(v => {
                const el = dom.querySelector(`.depth3[data-tree1="${d1}"][data-tree3="${v}"]`);
                if (el) this._depth3.delete(v);
            });
            this._depth4.forEach(v => {
                const el = dom.querySelector(`.depth4[data-tree1="${d1}"][data-tree4="${v}"]`);
                if (el) this._depth4.delete(v);
            });
        } else {
            this._depth1.add(d1);
        }
    } else if (depthClass === 2) {
        if (isActive) {
            this._depth2.delete(d2);
            this._depth3.forEach(v => {
                const el = dom.querySelector(`.depth3[data-tree1="${d1}"][data-tree2="${d2}"][data-tree3="${v}"]`);
                if (el) this._depth3.delete(v);
            });
            this._depth4.forEach(v => {
                const el = dom.querySelector(`.depth4[data-tree1="${d1}"][data-tree2="${d2}"][data-tree4="${v}"]`);
                if (el) this._depth4.delete(v);
            });
        } else {
            this._depth1.add(d1);
            this._depth2.add(d2);
        }
    } else if (depthClass === 3) {
        if (isActive) {
            this._depth3.delete(d3);
            this._depth4.forEach(v => {
                const el = dom.querySelector(`.depth4[data-tree1="${d1}"][data-tree2="${d2}"][data-tree3="${d3}"][data-tree4="${v}"]`);
                if (el) this._depth4.delete(v);
            });
        } else {
            this._depth1.add(d1);
            this._depth2.add(d2);
            this._depth3.add(d3);
        }
    } else if (depthClass === 4) {
        if (isActive) {
            this._depth4.delete(d4);
        } else {
            this._depth1.add(d1);
            this._depth2.add(d2);
            this._depth3.add(d3);
            this._depth4.add(d4);
        }
    }

    vio.activeContent();
}

vio.activeContentTree = function(element) {
    const d1 = parseInt(element.getAttribute('data-tree1') ?? 0),
        d2 = parseInt(element.getAttribute('data-tree2') ?? 0),
        d3 = parseInt(element.getAttribute('data-tree3') ?? 0),
        d4 = parseInt(element.getAttribute('data-tree4') ?? 0),
        isActive = element.classList.contains('active');

    if (isActive) {
        this._depth4.delete(d4);
    } else {
        this._depth1.add(d1);
        this._depth2.add(d2);
        this._depth3.add(d3);
        this._depth4.add(d4);
    }
    element.classList.toggle('active');
};

vio.activeContent = function() {
    const dom = document;

    // 에너지원 사용 여부 및 사용량 총합 (선택된 모든 depth1 기준으로 합산)
    if (this._depth1.size > 0) {
        let anyWatt = false, anyGas = false, anyWater = false;
        let totalWatt = 0, totalGas = 0, totalWater = 0;
        this._depth1.forEach(d1 => {
            if (this._isWatt[d1]) anyWatt = true;
            if (this._isGas[d1]) anyGas = true;
            if (this._isWater[d1]) anyWater = true;
            totalWatt += (this._wattTotal[d1] || 0);
            totalGas += (this._gasTotal[d1] || 0);
            totalWater += (this._waterTotal[d1] || 0);
        });
        dom.getElementById('pipeLineWatt').classList.toggle('disable', !anyWatt);
        dom.getElementById('pipeLineGas').classList.toggle('disable', !anyGas);
        dom.getElementById('pipeLineWater').classList.toggle('disable', !anyWater);
        dom.getElementById('wattTotal').textContent = this.echoNumber(totalWatt);
        dom.getElementById('gasTotal').textContent = this.echoNumber(totalGas);
        dom.getElementById('waterTotal').textContent = this.echoNumber(totalWater);
    }

    // 사이드바 active 초기화
    dom.querySelectorAll('.tree').forEach(el => el.classList.remove('active'));

    // 컨텐츠 영역 리스트 초기화
    dom.querySelectorAll('.monitCont .depth1').forEach(row => {
        row.classList.add('disable');
    });

    // 선택된 depth1 활성화
    this._depth1.forEach(d1 => {
        // 사이드바 depth1 active
        dom.querySelectorAll(`.depth1[data-tree1="${d1}"]`).forEach(el => el.classList.add('active'));
        // 컨텐츠 depth1 활성화
        dom.querySelectorAll(`.monitCont .depth1[data-tree1="${d1}"]`).forEach(element => {
            element.classList.remove('disable');
        });
    });

    // 선택된 depth2 활성화
    this._depth2.forEach(d2 => {
        dom.querySelectorAll(`.depth2[data-tree2="${d2}"]`).forEach(el => {
            const elD1 = parseInt(el.getAttribute('data-tree1'));
            if (this._depth1.has(elD1)) {
                el.classList.add('active');
            }
        });
    });

    // 선택된 depth3 활성화
    this._depth3.forEach(d3 => {
        dom.querySelectorAll(`.depth3[data-tree3="${d3}"]`).forEach(el => {
            const elD1 = parseInt(el.getAttribute('data-tree1'));
            const elD2 = parseInt(el.getAttribute('data-tree2'));
            if (this._depth1.has(elD1) && this._depth2.has(elD2)) {
                el.classList.add('active');
            }
        });
    });

    // 선택된 depth4 활성화
    this._depth4.forEach(d4 => {
        dom.querySelectorAll(`.depth4[data-tree4="${d4}"]`).forEach(el => {
            const elD1 = parseInt(el.getAttribute('data-tree1'));
            const elD2 = parseInt(el.getAttribute('data-tree2'));
            const elD3 = parseInt(el.getAttribute('data-tree3'));
            if (this._depth1.has(elD1) && this._depth2.has(elD2) && this._depth3.has(elD3)) {
                el.classList.add('active');
            }
        });
    });
};

/**
 * 공정별 에너지 사용량 요청
 * @returns {Promise<void>}
 */
vio.energyFacility = async function() {
    const dom = document,
        sDate = dom.getElementById('sDate').value,
        eDate = dom.getElementById('eDate').value,
        energySelect = dom.getElementById('energySelect').value;

    vio.netAble(true);

    let apiUrl = `/api/pipes/${this._fid}/results/${sDate}/${eDate}`;
    if (energySelect) {
        apiUrl += `/sources/${energySelect}`;
    }

    const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    vio.netAble(false);

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            this._energyFac = jsonData.data; // 공정별 설비 데이터

            const usageEnergy1 = jsonData.energy1; // 설비별 전력 사용량
            const usageEnergy2 = jsonData.energy2; // 설비별 가스 사용량
            const usageEnergy3 = jsonData.energy3; // 설비별 용수 수용량

            this._facData = [];
            for (let i = 0; i < usageEnergy1.length; i++) {
                const item = usageEnergy1[i],
                    fac = this._facList.find(row => row.pid === item.pid);
                if (fac) {
                    this._facData.push({pid: item.pid, name: fac.name, watt: item.amount, gas: 0, water: 0, output: item.output});
                }
            }
            for (let i = 0; i < usageEnergy2.length; i++) {
                const item = usageEnergy2[i],
                    usage = this._facData.find(row => row.pid === item.pid);
                if (usage) {
                    usage.gas = item.amount;
                    usage.output = item.output;
                } else {
                    const fac = this._facList.find(row => row.pid === item.pid);
                    this._facData.push({pid: item.pid, name: fac.name, gas: item.amount, output: item.output});
                }
            }
            for (let i = 0; i < usageEnergy3.length; i++) {
                const item = usageEnergy3[i],
                    usage = this._facData.find(row => row.pid === item.pid);
                if (usage) {
                    usage.water = item.amount;
                    usage.output = item.output;
                } else {
                    const fac = this._facList.find(row => row.pid === item.pid);
                    this._facData.push({pid: item.pid, name: fac.name, water: item.amount, output: item.output});
                }
            }
        }
    }
};

/**
 * 데이터 조회
 * @returns {Promise<void>}
 */
vio.getData = async function() {
    await this.energyFacility();
    await this.buildItemList();
    await this.activeContent();
    await this.energySelect();
};

/**
 * 에너지원 선택
 */
vio.energySelect = function() {
    const dom = document,
        energySelect = document.getElementById('energySelect').value;

    switch (energySelect) {
        case '1':
            dom.querySelectorAll('.selectWatt:not(.noData)').forEach(element => {
                element.classList.remove('disable');
            });
            dom.querySelectorAll('.selectGas').forEach(element => {
                element.classList.add('disable');
            });
            dom.querySelectorAll('.selectWater').forEach(element => {
                element.classList.add('disable');
            });
            break;
        case '2':
            dom.getElementById('pipeLineGas').style.width = '7px';

            dom.querySelectorAll('.selectWatt').forEach(element => {
                element.classList.add('disable');
            });
            dom.querySelectorAll('.selectGas:not(.noData)').forEach(element => {
                element.classList.remove('disable');
            });
            dom.querySelectorAll('.selectWater').forEach(element => {
                element.classList.add('disable');
            });
            break;
        case '3':
            dom.getElementById('pipeLineWater').style.width = '12px';

            dom.querySelectorAll('.selectWatt').forEach(element => {
                element.classList.add('disable');
            });
            dom.querySelectorAll('.selectGas').forEach(element => {
                element.classList.add('disable');
            });
            dom.querySelectorAll('.selectWater:not(.noData)').forEach(element => {
                element.classList.remove('disable');
            });
            break;
        default:
            dom.getElementById('pipeLineGas').style.width = '51px';
            dom.getElementById('pipeLineWater').style.width = '102px';

            dom.querySelectorAll('.selectWatt:not(.noData)').forEach(element => {
                element.classList.remove('disable');
            });
            dom.querySelectorAll('.selectGas:not(.noData)').forEach(element => {
                element.classList.remove('disable');
            });
            dom.querySelectorAll('.selectWater:not(.noData)').forEach(element => {
                element.classList.remove('disable');
            });
            break;
    }
};

/**
 * 변경이력 조회 팝업 표시
 */
vio.showPopup = async function() {
    await vio.getHistorys();

    document.getElementById('modal').classList.remove('disable');
};

/**
 * 변경이력 목록 요청
 * @param page
 * @returns {Promise<void>}
 */
vio.getHistorys = async function(page = 1) {
    const dom = document,
        sDate = dom.getElementById('historySDate').value,
        eDate = dom.getElementById('historyEDate').value;

    let apiUrl = `/api/pipes/${this._fid}/historys/${page}`;
    if (sDate && eDate) { // 기간조회
        apiUrl += `/period/${sDate}/${eDate}`;
    }

    const res = await fetch(apiUrl, {
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
            vio.dataTransHistorys(jsonData.data);
            vio.deskPaging(jsonData.paging);

            dom.getElementById('sheetWrap').scrollTo(0,0);
        }
    }
};

/**
 * 변경이력 목록 데이터 매핑
 * @param data
 */
vio.dataTransHistorys = function(data) {
    const dom = document,
        excludeWords = ["등록", "순서변경", "이름변경", "변경"];

    let out = '';
    for (let i = 0;  i < data.length; i++) {
        const item = data[i];

        const steps = item.his.split(' ▶ ');
        let his = [];
        for (let j = 0; j < steps.length; j++) {
            const step = steps[j],
                excludeRegex = new RegExp(`(${excludeWords.join('|')})`, 'g');

            // 텍스트를 제외 단어와 그렇지 않은 부분으로 나눔
            const name = step.replace(/([^ ]+)(?=\s|$)/g, (match) => {
                return excludeRegex.test(match) ? match : `<span class="highlight">${match}</span>`;
            });

            his.push(name);
        }

        out += `
        <tr>
            <th>${item&&item.ctime ? this.echoDate('y-m-d', item.ctime) : ''}</th>
            <td>${item&&item.ctime ? this.echoDate('h:i', item.ctime) : ''}</td>
            <td>${item.writer ?? ''}</td>
            <td>${vio._historyType[item.part]}</td>
            <td>${his.join('<i class="bi bi-caret-right-fill"></i>')}</td>
        </tr>`;
    }

    dom.getElementById('historys').innerHTML = out;

    dom.getElementById('notFoundHistorys').classList.toggle('disable', !!data.length);
};

/**
 * 변경이력 목록 페이지네이션
 * @param j
 */
vio.deskPaging = function(j) {
    this._sheet.page = j.page;

    let out = '',
        pageInfo,
        pageNo = 0;

    if (j.page > 4) {
        out += `<span class="deskPage act" onclick="vio.getHistorys(${j.page - 9 < 1 ? 1 : j.page - 9})">prev</span>`;
    } else {
        out += '<span class="deskPage act">prev</span>';
    }
    for (let ia = j.page > 4 ? j.page - 4 : 1; ia < j.page; ++ia) {
        pageNo += 1;
        out += `<span class="deskPage act" onclick="vio.getHistorys(${ia})">${ia}</span>`;
    }
    out += `<span class="deskPage act active">${j.page}</span>`;
    for (let ia = j.page + 1; ia < j.page + (9 - pageNo) && ia <= j.dbPageNo; ++ia) {
        out += `<span class="deskPage act" onclick="vio.getHistorys(${ia})">${ia}</span>`;
    }
    if (j.dbPageNo > 9) {
        out += `<span class="deskPage act" onclick="vio.getHistorys(${j.page + 9 > j.dbPageNo ? j.dbPageNo : j.page + 9})">next</span>`;
    } else {
        out += '<span class="deskPage act">next</span>';
    }
    document.getElementById('deskPages').innerHTML = out;
    pageInfo = `${(j.page - 1) * j.dbListLimit + 1} - ${j.page * j.dbListLimit < j.dbNo ? j.page * j.dbListLimit : j.dbNo} / ${j.dbNo}`;
    document.getElementById('deskStat').textContent = pageInfo;
};

/**
 * 변경이력 조회 팝업 숨기기
 */
vio.hidePopup = function() {
    document.getElementById('modal').classList.add('disable');
};

/**
 * 이벤트 등록
 */
vio.energyMonitEvent = function() {
    // 엑셀 다운로드
    vio.excelDownload();

    // 변경이력 조회
    document.getElementById('historysAct').addEventListener('click', async function() {
        await vio.getHistorys(1);
    });
};

/**
 * 엑셀 다운로드
 */
vio.excelDownload = function() {
    document.getElementById('actExcelSave').addEventListener('click', function() {
        const data = vio.getExcelData();

        // step1. 워크북 생성
        const workbook = XLSX.utils.book_new();

        // step2. 시트 생성
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // step3. 워크북에 워크시트 추가
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

        // step4. 엑셀 파일 생성
        XLSX.write(workbook, {bookType:'xlsx',  type:'binary'});

        // step5. 엑셀 파일 다운로드
        const saveName = `[${document.title}] ${document.getElementById('sDate').value}~${document.getElementById('eDate').value}.xlsx`;
        XLSX.writeFile(workbook, saveName);
    });
};

/**
 * 엑셀 데이터 반환
 * @returns {*[]}
 */
vio.getExcelData = function() {
    let data = [];

    for (let i = 0; i < this._trees.length; i++) {
        // 대분류
        const tree1Item = this._trees[i],
            tree1 = tree1Item.menu;

        for (let j = 0; j < tree1Item.child.length; j++) {
            // 중분류
            const tree2Item = tree1Item.child[j],
                tree2 = tree2Item.menu;

            for (let k = 0; k < tree2Item.child.length; k++) {
                // 소분류
                const tree3Item = tree2Item.child[k],
                    tree3 = tree3Item.menu;

                const energyFac = this._energyFac.filter(row => row.menu === tree3Item.idn);
                for (let l = 0; l < energyFac.length; l++) {
                    // 공정 목록
                    const facItem = energyFac[l];

                    let facWattSum = 0;
                    let facGasSum = 0;
                    let facWaterSum = 0;
                    let facOutputSum = 0;

                    data.push([`${tree1} ▶ ${tree2} ▶ ${tree3} ▶ ${facItem.nickname}`]);
                    data.push(['고유번호', '설비명', '전력량kWh', '도시가스Nm³', '용수ton', '생산량ton']);

                    const maxLength = Math.max(facItem.energy1.length, facItem.energy2.length, facItem.energy3.length);
                    for (let m = 0; m < maxLength; m++) {
                        // 전력 설비 목록
                        const energy1Item = facItem.energy1[m],
                            energy2Item = facItem.energy2[m],
                            energy3Item = facItem.energy3[m],
                            energy1Usage = this._facData.find(row => energy1Item && row.pid === energy1Item.pid),
                            energy2Usage = this._facData.find(row => energy2Item && row.pid === energy2Item.pid),
                            energy3Usage = this._facData.find(row => energy3Item && row.pid === energy3Item.pid);

                        let watt = 0,
                            gas = 0,
                            water = 0,
                            output = 0,
                            pid = '',
                            facName = '';
                        if (energy1Usage) {
                            pid = energy1Usage.pid;
                            facName = energy1Usage.name;
                            output = energy1Usage.output;
                            watt = energy1Item.ratio && energy1Usage.watt ? energy1Item.ratio / 100 * energy1Usage.watt : 0;
                        } else if (energy2Usage) {
                            pid = energy2Usage.pid;
                            facName = energy2Usage.name;
                            output = energy2Usage.output;
                            gas = energy2Item.ratio && energy2Usage.gas ? energy2Item.ratio / 100 * energy2Usage.gas : 0;
                        } else if (energy3Usage) {
                            pid = energy3Usage.pid;
                            facName = energy2Usage.name;
                            output = energy3Usage.output;
                            water = energy3Item.ratio && energy3Usage.water ? energy3Item.ratio / 100 * energy3Usage.water : 0;
                        }

                        facWattSum += watt;
                        facGasSum += gas;
                        facWaterSum += water;
                        facOutputSum += output;

                        data.push([pid, facName, watt, gas, water, output]);
                    }

                    data.push(['', '', facWattSum, facGasSum, facWaterSum, facOutputSum]);
                    data.push([]);
                }
            }
        }
    }

    return data;
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const today = new Date(),
        nowData = new Date();

    nowData.setDate(today.getDate() - 7);

    new tui.DatePicker('#sDateWrapper', {
        date: nowData,
        input: {
            element: '#sDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });
    new tui.DatePicker('#eDateWrapper', {
        date: today,
        input: {
            element: '#eDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });
    // 변경이력 조회 기간 설정
    new tui.DatePicker('#historySDateWrapper', {
        date: today,
        input: {
            element: '#historySDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });
    new tui.DatePicker('#historyEDateWrapper', {
        date: today,
        input: {
            element: '#historyEDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    vio.netAble(true);

    await vio.facility();
    await vio.energyFacility();
    await vio.tree();
    await vio.energyMonitEvent();

    vio.netAble(false);
});
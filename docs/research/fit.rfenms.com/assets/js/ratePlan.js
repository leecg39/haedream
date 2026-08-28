'use strict';

vio._cost = [];
vio._kepcoContract = '';
vio._contract = '';

/**
 * API 데이터 요청
 */
vio.getData = async function() {
    this.netAble(true);

    const res = await fetch(`/api/plans/${this._fid}`, {
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

        if (!jsonData.kepcoContract || !jsonData.contract) {
            // 기본값 설정
            jsonData.kepcoContract = 'IEHAS2';
            jsonData.contract = 'IGL1';
        }

        vio._cost = jsonData.cost || [];

        // // 일반용전력(을)-고압A-선택Ⅱ
        // vio._cost.push({
        //     costCode: 'EHAS2', basicCost: 8320,
        //     costLS: 87.3, costMS: 140.2, costHS: 222.3,
        //     costLW: 94.3, costMW: 140.4, costHW: 197.9,
        //     costLF: 87.3, costMF: 109.8, costHF: 140.5,
        // });
        //
        // // 일반용전력(갑I)-저압
        // vio._cost.push({
        //     costCode: 'GL1', basicCost: 6160,
        //     costLS: 132.4, costMS: 132.4, costHS: 132.4,
        //     costLW: 119.0, costMW: 119.0, costHW: 119.0,
        //     costLF: 91.9, costMF: 91.9, costHF: 91.9,
        // });

        vio._kepcoContract = jsonData.kepcoContract;
        vio._contract = jsonData.contract;

        this.dataTrans();
        this.netAble(false);
    }
};

/**
 * 데이터 매핑
 */
vio.dataTrans = function () {
    const dom = document,
        ratePlan1 = dom.getElementById('ratePlan1'),
        ratePlan2 = dom.getElementById('ratePlan2'),
        planTable = dom.getElementById('planTable');

    if (!ratePlan1.value) {
        ratePlan1.value = this._kepcoContract;
    }
    if (!ratePlan2.value) {
        ratePlan2.value = this._contract;
    }

    dom.getElementById('ratePlan1Name').textContent = ratePlan1.options[ratePlan1.selectedIndex].text;
    dom.getElementById('ratePlan2Name').textContent = ratePlan2.options[ratePlan2.selectedIndex].text;

    const plan1Cost = vio._cost.find(r => r['costCode'] === ratePlan1.value) ?? {},
        plan2Cost = vio._cost.find(r => r['costCode'] === ratePlan2.value) ?? {};

    const types = ['LS', 'MS', 'HS', 'LF', 'MF', 'HF', 'LW', 'MW', 'HW'];

    let plan1Sum = 0,
        plan2Sum = 0,
        planFrugal = 0,
        planFrugalRate = 0;
    types.forEach(type => {
        const costKey = `cost${type}`;

        // 요금 표시
        planTable.querySelector(`[data-cost="plan1Cost${type}"]`).textContent = plan1Cost[costKey] ?? 0;
        planTable.querySelector(`[data-cost="plan2Cost${type}"]`).textContent = plan2Cost[costKey] ?? 0;

        // 차이(Gap)
        planTable.querySelector(`[data-cost="${costKey}Gap"]`).textContent =
            Math.round(((plan1Cost[costKey] ?? 0) - (plan2Cost[costKey] ?? 0)) * 100) / 100;

        // 비율(Rate)
        const p1 = plan1Cost[costKey] ?? 0,
            p2 = plan2Cost[costKey] ?? 0,
            rate = p1 !== 0 ? `${Math.round(((p1 - p2) / p1) * 10000) / 100}%` : '0%';
        planTable.querySelector(`[data-cost="${costKey}Rate"]`).textContent = rate;

        plan1Sum += p1;
        plan2Sum += p2;
    });
    plan1Sum = plan1Sum ? Math.round(plan1Sum / 9 * 10) / 10 : 0;
    plan2Sum = plan2Sum ? Math.round(plan2Sum / 9 * 10) / 10 : 0;
    planFrugal = Math.round((plan1Sum - plan2Sum) * 10) / 10
    planFrugalRate = plan1Sum !== 0 ? Math.round(((plan1Sum - plan2Sum) / plan1Sum) * 10000) / 100 : 0;

    planTable.querySelector('[data-cost="plan1Sum"]').textContent = this.echoNumber(plan1Sum);
    planTable.querySelector(`[data-cost="plan2Sum"]`).textContent = this.echoNumber(plan2Sum);
    planTable.querySelector(`[data-cost="planFrugal"]`).textContent = this.echoNumber(planFrugal);
    planTable.querySelector(`[data-cost="planFrugalRate"]`).textContent = `${planFrugalRate}%`;
};


/**
 * 이벤트 리스너 등록
 */
vio.addEventListenerRatePlan = function() {
    const dom = document;
    dom.getElementById('ratePlan1').addEventListener('change', async function() {
        await vio.dataTrans();
    })
    dom.getElementById('ratePlan2').addEventListener('change', async function() {
        await vio.dataTrans();
    })
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.getData();
    await vio.addEventListenerRatePlan();
});
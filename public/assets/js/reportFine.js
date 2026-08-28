'use strict';

vio._lpList = [];
vio._yieldUnit = 'ton'; // 생산량 단위

vio.dataTrans = function(jsonData) {
    const sDate = document.getElementById('sDate').value,
        thisDate = new Date(`${sDate.substr(5, 2)}/01/${sDate.substr(0, 4)}`),
        thisMonthTime = thisDate.getTime(),
        lastMonthTime = thisDate.setMonth(thisDate.getMonth() - 1),
        thisYear = new Date(`01/01/${sDate.substr(0, 4)}`),
        thisYearTime = thisYear.getTime(),
        lastYearTime = thisYear.setFullYear(thisYear.getFullYear() - 1);

    let out = `
    <tr>
        <td colspan="8">※ 설비별 전력사용현황</td>
    </tr>
    <tr>
        <th colspan="2" rowspan="2">구분</th>
        <th colspan="3">현황</th>
        <th colspan="3">누적현황</th>
    </tr>
    <tr>
        <th>당월</th>
        <th>전월</th>
        <th>증감</th>
        <th>금년</th>
        <th>전년</th>
        <th>증감</th>
    </tr>`;

    let totalYield = [0, 0, 0, 0],     // 전체 생산량 [당월,전월,금년,작년]
        totalDefective = [0, 0, 0, 0]; // 전체 불량생산량 [당월,전월,금년,작년]

    const isAbleDefective = [97, 105, 141].includes(vio._thisFid); // 불량생산량정보 표시 여부


    jsonData.device.forEach(function(nub) {
        // 전력량, 전력요금
        if (!jsonData.thisMonth.hasOwnProperty(nub.pid)) {
            jsonData.thisMonth[nub.pid] = {wattLow: 0, wattMiddle: 0, wattHigh: 0, watt: 0, gold: 0};
        }
        if (!jsonData.lastMonth.hasOwnProperty(nub.pid)) {
            jsonData.lastMonth[nub.pid] = {wattLow: 0, wattMiddle: 0, wattHigh: 0, watt: 0, gold: 0};
        }
        if (!jsonData.thisYear.hasOwnProperty(nub.pid)) {
            jsonData.thisYear[nub.pid] = {wattLow: 0, wattMiddle: 0, wattHigh: 0, watt: 0, gold: 0};
        }
        if (!jsonData.lastYear.hasOwnProperty(nub.pid)) {
            jsonData.lastYear[nub.pid] = {wattLow: 0, wattMiddle: 0, wattHigh: 0, watt: 0, gold: 0};
        }
        // 생산량
        if (!jsonData.thisMonthYield.hasOwnProperty(nub.pid)) {
            jsonData.thisMonthYield[nub.pid] = {amount: 0, defective: 0};
        }
        if (!jsonData.lastMonthYield.hasOwnProperty(nub.pid)) {
            jsonData.lastMonthYield[nub.pid] = {amount: 0, defective: 0};
        }
        if (!jsonData.thisYearYield.hasOwnProperty(nub.pid)) {
            jsonData.thisYearYield[nub.pid] = {amount: 0, defective: 0};
        }
        if (!jsonData.lastYearYield.hasOwnProperty(nub.pid)) {
            jsonData.lastYearYield[nub.pid] = {amount: 0, defective: 0};
        }

        const aWatt = [jsonData.thisMonth[nub.pid].watt, jsonData.lastMonth[nub.pid].watt, jsonData.thisYear[nub.pid].watt, jsonData.lastYear[nub.pid].watt],
            aGold = [jsonData.thisMonth[nub.pid].gold, jsonData.lastMonth[nub.pid].gold, jsonData.thisYear[nub.pid].gold, jsonData.lastYear[nub.pid].gold],
            aYield = [ // 생산량
                jsonData.thisMonthYield[nub.pid].amount,
                jsonData.lastMonthYield[nub.pid].amount,
                jsonData.thisYearYield[nub.pid].amount,
                jsonData.lastYearYield[nub.pid].amount
            ],
            aDefective = [ // 불량
                jsonData.thisMonthYield[nub.pid].defective,
                jsonData.lastMonthYield[nub.pid].defective,
                jsonData.thisYearYield[nub.pid].defective,
                jsonData.lastYearYield[nub.pid].defective
            ];

        const thisMonthFee = aWatt[0] != 0 ? (aGold[0] / aWatt[0]).toFixed(2) : 0,
            lastMonthFee = aWatt[1] != 0 ? (aGold[1] / aWatt[1]).toFixed(2) : 0,
            thisYearFee = aWatt[2] != 0 ? (aGold[2] / aWatt[2]).toFixed(2) : 0,
            lastYearFee = aWatt[3] != 0 ? (aGold[3] / aWatt[3]).toFixed(2) : 0,
            thisMonthProduct = aYield[0] != 0 ? (aGold[0] / aYield[0]).toFixed(2) : 0,
            lastMonthProduct = aYield[1] != 0 ? (aGold[1] / aYield[1]).toFixed(2) : 0,
            thisYearProduct = aYield[2] != 0 ? (aGold[2] / aYield[2]).toFixed(2) : 0,
            lastYearProduct = aYield[3] != 0 ? (aGold[3] / aYield[3]).toFixed(2) : 0,
            thisMonthProductDefective = aDefective[0] != 0 ? (aGold[0] / aDefective[0]).toFixed(2) : 0, // 제품당 전력비 (불량포함)
            lastMonthProductDefective = aDefective[1] != 0 ? (aGold[1] / aDefective[1]).toFixed(2) : 0,
            thisYearProductDefective = aDefective[2] != 0 ? (aGold[2] / aDefective[2]).toFixed(2) : 0,
            lastYearProductDefective = aDefective[3] != 0 ? (aGold[3] / aDefective[3]).toFixed(2) : 0;

        if(vio._thisFid == 103){
            // 프레스 1호기 ~ 12호기 생산량만 합산처리
            if ([12837, 12588, 12587, 12633, 12632, 12840, 12841, 12631, 12630, 12838, 12839, 12836].includes(nub.pid)) {
                totalYield[0] += aYield[0];
                totalYield[1] += aYield[1];
                totalYield[2] += aYield[2];
                totalYield[3] += aYield[3];
            }
        }else{
            totalYield[0] += aYield[0];
            totalYield[1] += aYield[1];
            totalYield[2] += aYield[2];
            totalYield[3] += aYield[3];

            totalDefective[0] += aDefective[0];
            totalDefective[1] += aDefective[1];
            totalDefective[2] += aDefective[2];
            totalDefective[3] += aDefective[3];
        }

        out = `${out}
        <tr>
            <th rowspan="${isAbleDefective ? 6 : 5}">${nub.pName}</th>
            <th>사용량(kWh)</th>
            <td>${aWatt[0].toLocaleString('ko-KR')}</td>
            <td>${aWatt[1].toLocaleString('ko-KR')}</td>
            <td>${(aWatt[0] - aWatt[1]).toLocaleString('ko-KR')}</td>
            <td>${aWatt[2].toLocaleString('ko-KR')}</td>
            <td>${aWatt[3].toLocaleString('ko-KR')}</td>
            <td>${(aWatt[2] - aWatt[3]).toLocaleString('ko-KR')}</td>
        </tr>
        <tr>
            <th>전력요금(원)</th>
            <td>${aGold[0].toLocaleString('ko-KR')}</td>
            <td>${aGold[1].toLocaleString('ko-KR')}</td>
            <td>${(aGold[0] - aGold[1]).toLocaleString('ko-KR')}</td>
            <td>${aGold[2].toLocaleString('ko-KR')}</td>
            <td>${aGold[3].toLocaleString('ko-KR')}</td>
            <td>${(aGold[2] - aGold[3]).toLocaleString('ko-KR')}</td>
        </tr>
        <tr>
            <th>평균전력단가(원/kWh)</th>
            <td>${thisMonthFee}</td>
            <td>${lastMonthFee}</td>
            <td>${(thisMonthFee - lastMonthFee).toFixed(2)}</td>
            <td>${thisYearFee}</td>
            <td>${lastYearFee}</td>
            <td>${(thisYearFee - lastYearFee).toFixed(2)}</td>
        </tr>
        <tr>
            <th>생산량(${vio._yieldUnit})</th>
            <td>${aYield[0].toLocaleString('ko-KR')}</td>
            <td>${aYield[1].toLocaleString('ko-KR')}</td>
            <td>${(aYield[0] - aYield[1]).toLocaleString('ko-KR')}</td>
            <td>${aYield[2].toLocaleString('ko-KR')}</td>
            <td>${aYield[3].toLocaleString('ko-KR')}</td>
            <td>${(aYield[2] - aYield[3]).toLocaleString('ko-KR')}</td>
        </tr>
        ${
            isAbleDefective ?
            `<tr>
            <th>불량포함생산량(${vio._yieldUnit})</th>
            <td>${aDefective[0].toLocaleString('ko-KR')}</td>
            <td>${aDefective[1].toLocaleString('ko-KR')}</td>
            <td>${(aDefective[0] - aDefective[1]).toLocaleString('ko-KR')}</td>
            <td>${aDefective[2].toLocaleString('ko-KR')}</td>
            <td>${aDefective[3].toLocaleString('ko-KR')}</td>
            <td>${(aDefective[2] - aDefective[3]).toLocaleString('ko-KR')}</td>
            </tr>`
            : ''
        }
        <tr>
            <th>제품당전력비(원/${vio._yieldUnit})</th>
            <td>${thisMonthProduct}</td>
            <td>${lastMonthProduct}</td>
            <td>${(thisMonthProduct - lastMonthProduct).toFixed(2)}</td>
            <td>${thisYearProduct}</td>
            <td>${lastYearProduct}</td>
            <td>${(thisYearProduct - lastYearProduct).toFixed(2)}</td>
        </tr>
        `;
    });

    // 한전요금/한전사용량
    jsonData.thisMonthNub[2] = jsonData.thisMonthNub[1] != 0 ? jsonData.thisMonthNub[0] / jsonData.thisMonthNub[1] : 0;
    jsonData.lastMonthNub[2] = jsonData.lastMonthNub[1] != 0 ? jsonData.lastMonthNub[0] / jsonData.lastMonthNub[1] : 0;
    jsonData.thisYearNub[2] = jsonData.thisYearNub[1] != 0 ? jsonData.thisYearNub[0] / jsonData.thisYearNub[1] : 0;
    jsonData.lastYearNub[2] = jsonData.lastYearNub[1] != 0 ? jsonData.lastYearNub[0] / jsonData.lastYearNub[1] : 0;

    // 한전요금/프레스생산량
    jsonData.thisMonthNub[3] = totalYield[0] != 0 ? jsonData.thisMonthNub[0] / totalYield[0] : 0;
    jsonData.lastMonthNub[3] = totalYield[1] != 0 ? jsonData.lastMonthNub[0] / totalYield[1] : 0;
    jsonData.thisYearNub[3] = totalYield[2] != 0 ? jsonData.thisYearNub[0] / totalYield[2] : 0;
    jsonData.lastYearNub[3] = totalYield[3] != 0 ? jsonData.lastYearNub[0] / totalYield[3] : 0;

    // 한전요금/불량생산량
    jsonData.thisMonthNub[4] = totalDefective[0] != 0 ? jsonData.thisMonthNub[0] / totalDefective[0] : 0;
    jsonData.lastMonthNub[4] = totalDefective[1] != 0 ? jsonData.lastMonthNub[0] / totalDefective[1] : 0;
    jsonData.thisYearNub[4] = totalDefective[2] != 0 ? jsonData.thisYearNub[0] / totalDefective[2] : 0;
    jsonData.lastYearNub[4] = totalDefective[3] != 0 ? jsonData.lastYearNub[0] / totalDefective[3] : 0;


    document.getElementById('itemTable').innerHTML = `
    <tr>
        <td colspan="8">※ 전력사용현황 (전체)</td>
    </tr>
    <tr>
        <th colspan="2" rowspan="2">구분</th>
        <th colspan="3">현황</th>
        <th colspan="3">누적현황</th>
    </tr>
    <tr>
        <th>당월</th>
        <th>전월</th>
        <th>증감</th>
        <th>금년</th>
        <th>전년</th>
        <th>증감</th>
    </tr>
    <tr>
        <th colspan="2">사용량(kWh)</th>
        <td>${jsonData.thisMonthNub[1].toLocaleString('ko-KR')}</td>
        <td>${jsonData.lastMonthNub[1].toLocaleString('ko-KR')}</td>
        <td>${(jsonData.thisMonthNub[1] - jsonData.lastMonthNub[1]).toLocaleString('ko-KR')}</td>
        <td>${jsonData.thisYearNub[1].toLocaleString('ko-KR')}</td>
        <td>${jsonData.lastYearNub[1].toLocaleString('ko-KR')}</td>
        <td>${(jsonData.thisYearNub[1] - jsonData.lastYearNub[1]).toLocaleString('ko-KR')}</td>
    </tr>
    <tr>
        <th colspan="2">전력요금(원)</th>
        <td>${jsonData.thisMonthNub[0].toLocaleString('ko-KR')}</td>
        <td>${jsonData.lastMonthNub[0].toLocaleString('ko-KR')}</td>
        <td>${(jsonData.thisMonthNub[0] - jsonData.lastMonthNub[0]).toLocaleString('ko-KR')}</td>
        <td>${jsonData.thisYearNub[0].toLocaleString('ko-KR')}</td>
        <td>${jsonData.lastYearNub[0].toLocaleString('ko-KR')}</td>
        <td>${(jsonData.thisYearNub[0] - jsonData.lastYearNub[0]).toLocaleString('ko-KR')}</td>
    </tr>
    <tr>
        <th colspan="2">평균전력단가(원/kWh)</th>
        <td>${jsonData.thisMonthNub[2].toFixed(2)}</td>
        <td>${jsonData.lastMonthNub[2].toFixed(2)}</td>
        <td>${(jsonData.thisMonthNub[2] - jsonData.lastMonthNub[2]).toFixed(2)}</td>
        <td>${jsonData.thisYearNub[2].toFixed(2)}</td>
        <td>${jsonData.lastYearNub[2].toFixed(2)}</td>
        <td>${(jsonData.thisYearNub[2] - jsonData.lastYearNub[2]).toFixed(2)}</td>
    </tr>
    <tr>
        <th colspan="2">생산량(${vio._yieldUnit})</th>
        <td>${totalYield[0].toLocaleString('ko-KR')}</td>
        <td>${totalYield[1].toLocaleString('ko-KR')}</td>
        <td>${(totalYield[0] - totalYield[1]).toLocaleString('ko-KR')}</td>
        <td>${totalYield[2].toLocaleString('ko-KR')}</td>
        <td>${totalYield[3].toLocaleString('ko-KR')}</td>
        <td>${(totalYield[2] - totalYield[3]).toLocaleString('ko-KR')}</td>
    </tr>
    <tr>
        <th colspan="2">제품당전력비(원/${vio._yieldUnit})</th>
        <td>${jsonData.thisMonthNub[3].toFixed(2)}</td>
        <td>${jsonData.lastMonthNub[3].toFixed(2)}</td>
        <td>${(jsonData.thisMonthNub[3] - jsonData.lastMonthNub[3]).toFixed(2)}</td>
        <td>${jsonData.thisYearNub[3].toFixed(2)}</td>
        <td>${jsonData.lastYearNub[3].toFixed(2)}</td>
        <td>${(jsonData.thisYearNub[3] - jsonData.lastYearNub[3]).toFixed(2)}</td>
    </tr>
    ${
        isAbleDefective ?
        `<tr>
        <th colspan="2">불량포함생산량(${vio._yieldUnit})</th>
        <td>${totalDefective[0].toLocaleString('ko-KR')}</td>
        <td>${totalDefective[1].toLocaleString('ko-KR')}</td>
        <td>${(totalDefective[0] - totalDefective[1]).toLocaleString('ko-KR')}</td>
        <td>${totalDefective[2].toLocaleString('ko-KR')}</td>
        <td>${totalDefective[3].toLocaleString('ko-KR')}</td>
        <td>${(totalDefective[2] - totalDefective[3]).toLocaleString('ko-KR')}</td>
        </tr>
        <tr>
        <th colspan="2">불량포함제품당전력비(원/${vio._yieldUnit})</th>
        <td>${jsonData.thisMonthNub[4].toFixed(2)}</td>
        <td>${jsonData.lastMonthNub[4].toFixed(2)}</td>
        <td>${(jsonData.thisMonthNub[4] - jsonData.lastMonthNub[4]).toFixed(2)}</td>
        <td>${jsonData.thisYearNub[4].toFixed(2)}</td>
        <td>${jsonData.lastYearNub[4].toFixed(2)}</td>
        <td>${(jsonData.thisYearNub[4] - jsonData.lastYearNub[4]).toFixed(2)}</td>
        </tr>`
        : ''
    }
    <tr>
        <th colspan="2">최대 PEAK(kW)</th>
        <td>${jsonData.thisMonthPeak.toLocaleString('ko-KR')}</td>
        <td>${jsonData.lastMonthPeak.toLocaleString('ko-KR')}</td>
        <td>${jsonData.thisMonthPeak - jsonData.lastMonthPeak}</td>
        <td>${jsonData.thisYearPeak.toLocaleString('ko-KR')}</td>
        <td>${jsonData.lastYearPeak.toLocaleString('ko-KR')}</td>
        <td>${jsonData.thisYearPeak - jsonData.lastYearPeak}</td>
    </tr>
    ${out}`;
};

vio.getData = async function() {
    const pd = {
        sDate: document.getElementById('sDate').value
    };

    if (pd.sDate == '') {
        this.toast({memo: '조회할 날짜를 선택해주세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/reportFine/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"get","sDate":"${pd.sDate}"}`
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
                case 1:
                    this._yieldUnit = jsonData.amountUnit || 'ton';
                    this.dataTrans(jsonData);
                    break;
                default:
                    this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    const dom = document;

    await vio.documentReady();

    const nowDate = new Date();
    nowDate.setMonth(nowDate.getMonth() - 1);

    new tui.DatePicker('#sDateWrapper', {
        date: nowDate,
        type: 'month',
        input: {
            element: '#sDate',
            format: 'yyyy-MM'
        },
        selectableRanges: [
            [new Date('2021-12-01'), nowDate] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    dom.getElementById('act').addEventListener('click', function() {
        vio.getData();
    });

    vio._thisFid = Number(vio._fid);

    dom.getElementById('actExcelSave').addEventListener('click', function() {
        let saveName = `[전력사용현황]${document.getElementById('sDate').value}.xlsx`;

        let workbook = XLSX.utils.table_to_book(document.getElementById('itemTable')),
            ws = workbook.Sheets['Sheet1'];
        XLSX.writeFile(workbook, saveName);
    });

    await vio.getData();
});
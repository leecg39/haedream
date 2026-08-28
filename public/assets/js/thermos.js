'use strict';

vio._dataType = '15m'; // 시간단위

/**
 * API 데이터 요청
 * @returns {Promise<void>}
 */
vio.getData = async function() {
    const date = document.getElementById('inputDate').value;

    const res = await fetch(`/api/temperatures/${vio._fid}?date=${date}`, {
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
            vio.toast({memo: jsonData.msg});
        } else {
            vio.dataTrans(jsonData);
        }
    }
};

/**
 * 데이터 매핑
 * @param jsonData
 */
vio.dataTrans = function (jsonData) {
    const dom = document,
        { data, thermos } = jsonData,
        rows = [],
        inputDate = dom.getElementById('inputDate').value;

    vio._dataType = dom.getElementById('dataType').value;
    if (vio._dataType === '15m') {
        for (let h = 0; h < 86400; h += 900) {
            const hour = String(Math.floor(h / 3600)).padStart(2, '0'),
                minute = String((h % 3600) / 60).padStart(2, '0');
            rows.push(`${hour}:${minute}`);
        }
        vio._dateFormat = 'h:i';
    } else {
        const y = inputDate.slice(0, 4),
            m = inputDate.slice(5, 7),
            last = new Date(y, m, 0).getDate();
        for (let d = 1; d <= last; d++) {
            rows.push(`${String(d).padStart(2, '0')}일`);
        }
        vio._dateFormat = 'd일';
    }

    const tsToKey = function(ts) {
        const d = new Date(ts * 1000);

        if (vio._dataType === '15m') {
            return (
                String(d.getHours()).padStart(2, '0') +
                ':' +
                String(d.getMinutes()).padStart(2, '0')
            );
        } else {
            return String(d.getDate()).padStart(2, '0') + '일';
        }
    }

    // 데이터 재구조화
    const deviceMap = new Map();
    thermos.forEach(r => {
        deviceMap.set(r.pid, {});
    });

    Object.entries(data).forEach(([ts, list]) => {
        const time = tsToKey(Number(ts));

        list.forEach(([deviceId, value]) => {
            if (!deviceMap.has(deviceId)) {
                deviceMap.set(deviceId, {});
            }
            deviceMap.get(deviceId)[time] = value;
        });
    });

    // thead 생성
    let theadOut = '<tr><th class="time">설비명 / 시간</th>';
    rows.forEach(time => {
        theadOut += `<th>${time}</th>`;
    });
    theadOut += '<th>평균</th></tr>';

    // tbody 생성
    const colTotals = Array(rows.length).fill(0);
    const colCounts = Array(rows.length).fill(0); // 데이터 있는 셀 개수 세기
    let tbodyOut = '';

    for (const [deviceId, timeMap] of deviceMap) {
        const device = thermos.find(r => r.pid === deviceId);

        let rowTotal = 0,
            rowCount = 0, // 해당 row에서 데이터 있는 셀 수
            row = `<tr><th class="time">${device?.name || ''}</th>`;

        rows.forEach((time, idx) => {
            const val = timeMap[time];
            if (val === undefined) {
                row += `<td>-</td>`;
            } else {
                rowTotal += val;
                rowCount++;
                colTotals[idx] += val;
                colCounts[idx]++; // 해당 column에서 데이터 있는 셀 수 증가
                row += `<td>${val.toLocaleString('ko-KR')}</td>`;
            }
        });

        const rowAvg = rowCount ? (rowTotal / rowCount).toFixed(1) : '-';
        row += `<td class="sum">${rowAvg}</td></tr>`;
        tbodyOut += row;
    }


    // 평균(하단) 행
    let totalRow = '<tr class="total"><th class="time">평균</th>',
        grandTotal = 0,
        grandCount = 0;

    colTotals.forEach((v, idx) => {
        const count = colCounts[idx];
        grandTotal += v;
        grandCount += count;

        const avg = count ? (v / count).toFixed(2) : '-';
        totalRow += `<th class="sum">${avg}</th>`;
    });

    const overallAvg = grandCount ? (grandTotal / grandCount).toFixed(2) : '-';
    totalRow += `<th class="sum">${overallAvg}</th></tr>`;
    tbodyOut += totalRow;

    dom.getElementById('itemHead').innerHTML = theadOut;
    dom.getElementById('itemList').innerHTML = tbodyOut;

    this.renderChart(rows, thermos, deviceMap);
};

/**
 * 차트 그리기
 * @param rows
 * @param thermos
 * @param deviceMap
 */
vio.renderChart = function (rows, thermos, deviceMap) {
    const chart = echarts.init(document.getElementById('chart'), 'dark');

    const seriesNames = thermos.map(t => t.name),
        hasData = [...deviceMap.values()].some(timeMap =>
        Object.values(timeMap).some(v => Number.isFinite(v))
    );

    const series = [{
        name: '전체 선택/해제',
        type: 'line',
        data: [],
        symbol: 'none',
        color: 'white'
    }];
    thermos.map(t => {
        const timeMap = deviceMap.get(t.pid) || {};

        series.push({
            name: t.name,
            type: 'line',
            smooth: true,
            symbol: 'none',
            connectNulls: false,
            data: rows.map(x => timeMap[x] ?? null)
        });
    });

    const option = {
        backgroundColor: false,
        tooltip: {
            trigger: 'axis',
            valueFormatter: v => Number.isFinite(v) ? `${v} ℃` : ''
        },
        legend: {
            top: 'top',
            type: 'plain',
            textStyle: { color: '#ffffffa6' },
        },
        grid: {
            top: '15%',
            left: '2%',
            right: '2%',
            bottom: '2%',
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            data: rows,
            splitLine: { show: false },
            axisTick: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLabel: { formatter: '{value} ℃' },
        },
        series,
        graphic: !hasData ? [{
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
                text: '온도 데이터가 없습니다.',
                fill: '#a3a3a3',
                fontSize: 16,
            }
        }] : [],
    };

    chart.setOption(option, { notMerge: true });

    let allSelected = true; // 초기 상태: 모든 시리즈 선택됨
    chart.on('legendselectchanged', function (params) {
        if (params.name === '전체 선택/해제') {
            if (allSelected) {
                // 전체 해제
                seriesNames.forEach(name => {
                    chart.dispatchAction({ type: 'legendUnSelect', name });
                });
            } else {
                // 전체 선택
                seriesNames.forEach(name => {
                    chart.dispatchAction({ type: 'legendSelect', name });
                });
            }

            // fake 항목 상태도 동기화
            chart.dispatchAction({
                type: allSelected ? 'legendUnSelect' : 'legendSelect',
                name: '전체 선택/해제'
            });

            allSelected = !allSelected; // 상태 반전
        } else {
            // 일반 legend 클릭 시 전체 선택 상태 업데이트
            const selectedMap = params.selected;
            allSelected = seriesNames.every(name => selectedMap[name]);
            chart.dispatchAction({
                type: allSelected ? 'legendSelect' : 'legendUnSelect',
                name: '전체 선택/해제'
            });
        }
    });

    window.addEventListener('resize', () => chart.resize());
};

/**
 * 시간단위 변경 이벤트
 */
vio.changeDataType = function() {
    vio._dataType = this.value;
    switch (vio._dataType) {
        case 'daily':
            vio._inputDate.setType('month');
            vio._inputDate.setDateFormat('yyyy-MM');
            break;
        case 'monthly':
            vio._inputDate.setType('year');
            vio._inputDate.setDateFormat('yyyy');
            break;
        default:
            vio._inputDate.setType('date');
            vio._inputDate.setDateFormat('yyyy-MM-dd');
            break;
    }
};

/**
 * 엑셀 다운로드
 */
vio.excelDownload = function () {
    const date = document.getElementById('inputDate').value,
        saveName = `[${document.title}]${date}.xlsx`,
        table = document.getElementById('itemTable').cloneNode(true);

    // 날짜 문자열 처리
    table.querySelectorAll('th').forEach(cell => {
        const value = cell.textContent.trim();

        if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
            cell.setAttribute('data-t', 's');
            cell.setAttribute('data-v', value);
        }
    });

    const workbook = XLSX.utils.table_to_book(table);
    XLSX.writeFile(workbook, saveName);
};

/**
 * 이벤트 리스너 등록
 */
vio.eventListenerThermos = function() {
    const dom = document;

    // 조회
    dom.getElementById('act').addEventListener('click', vio.getData);

    // 시간단위 변경
    dom.getElementById('dataType').addEventListener('change', vio.changeDataType);

    // 엑셀로 다운
    dom.getElementById('actExcelSave').addEventListener('click', vio.excelDownload);

    const nowDate = new Date();
    vio._inputDate = new tui.DatePicker('#wrapper', {
        date: nowDate,
        input: {
            element: '#inputDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), nowDate] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.eventListenerThermos();
    await vio.getData();
});
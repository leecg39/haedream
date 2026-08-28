'use strict';

vio._isInit = true;
vio._inputDate = null;
vio._dataType = 'hourly';
vio._dateFormat = 'm:d';

/**
 * 대시보드 API 데이터 요청
 * @returns {Promise<void>}
 */
vio.getDashData = async function() {
    try {
        await vio.netAble(true);

        const res = await fetch(`/api/stars/${this._fid}`, {
            method: 'POST',
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
                await vio.dataTransDash(jsonData);
            }
        }
    } catch (e) {
        console.log(e);
    } finally {
        vio.netAble(false);
    }
};

/**
 * 대시보드 데이터 매핑
 * @param data
 */
vio.dataTransDash = function(data) {
    const dom = document;

    dom.getElementById('todayOutput').textContent = this.echoNumber(data.todayOutput || 0);         // 오늘 발전량
    dom.getElementById('todayHours').textContent = this.echoNumber(data.todayHours || 0);           // 오늘 발전시간
    dom.getElementById('yesterdayOutput').textContent = this.echoNumber(data.yesterdayOutput || 0); // 어제 발전량
    dom.getElementById('yesterdayHours').textContent = this.echoNumber(data.yesterdayHours || 0);   // 어제 발전시간
    dom.getElementById('monthOutput').textContent = this.echoNumber(data.monthOutput || 0);         // 당월 발전량
    dom.getElementById('monthHours').textContent = this.echoNumber(data.monthHours || 0);           // 당월 발전시간
    dom.getElementById('yearOutput').textContent = this.echoNumber(data.yearOutput || 0);           // 올해 발전량
    dom.getElementById('yearHours').textContent = this.echoNumber(data.yearHours || 0);             // 올해 발전시간
};

/**
 * API 데이터 요청
 * @returns {Promise<void>}
 */
vio.getData = async function() {
    const dom = document,
        dataGroup = dom.getElementById('dataGroup').value,
        inputDate = document.getElementById('inputDate').value;

    try {
        vio.netAble(true);

        if (!inputDate) {
            vio.toast({memo: '날짜가 올바르지 않습니다.'});
            return;
        }

        let apiUrl = `/api/stars/${vio._fid}?date=${inputDate}`;
        if (dataGroup) {
            apiUrl += `&group=${dataGroup}`;
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
                vio.toast({memo: jsonData.msg});
            } else {
                await vio.dateTrans(jsonData.data || [], jsonData.group || []);
            }
        }
    } catch (e) {

    } finally {
        vio.netAble(false);
    }
};

/**
 * 데이터 매핑
 * @param data
 * @param groupList
 */
vio.dateTrans = function(data, groupList) {
    const dom = document,
        dataGroup = dom.getElementById('dataGroup').value,
        date = dom.getElementById('inputDate').value,
        rows = [];

    if (vio._isInit) {
        // 그룹 선택 목록
        let addItem = '';

        for (let item of groupList) {
            addItem += `<option value="${item.group}">${item.name}</option>`;
        }

        dom.getElementById('dataGroup').insertAdjacentHTML('beforeend', addItem);
    }

    if (vio._dataType === 'hourly') {
        for (let h = 5; h < 22; h++) {
            rows.push(`${String(h).padStart(2, '0')}:00`);
        }
        vio._dateFormat = 'h:i';
    } else if (vio._dataType === 'daily') {
        const y = date.slice(0, 4),
            m = date.slice(5, 7),
            last = new Date(y, m, 0).getDate();
        for (let d = 1; d <= last; d++) {
            rows.push(`${String(d).padStart(2, '0')}일`);
        }
        vio._dateFormat = 'd일';
    } else if (vio._dataType === 'monthly') {
        for (let i = 1; i <= 12; i++) {
            rows.push(`${String(i).padStart(2, '0')}월`);
        }
        vio._dateFormat = 'm월';
    }

    const colTotals = Array(rows.length).fill(0);

    let theadOut = '<tr><th class="time">설비명 / 시간</th>',
        tbodyOut = '';

    // 시간
    for (let time of rows) {
        theadOut += `<th>${time}</th>`;
    }
    theadOut += '<th>합계</th></tr>';

    // 설비
    // util: 날짜 -> 값 Map 생성
    const toDateMap = function(list = []) {
        const map = new Map();

        for (const item of list) {
            const time = vio.echoDate(vio._dateFormat, item[0]);
            map.set(time, Number(item[1]) || 0);
        }

        return map;
    }

    // util: 한 행 렌더링
    const renderRow = function(label, dateMap, rows, colTotals) {
        let rowSum = 0;
        let tds = '';

        rows.forEach((time, idx) => {
            const val = dateMap.get(time) || 0;

            rowSum += val;
            colTotals[idx] += val;

            tds += `<td>${(Math.floor(val * 10) / 10).toLocaleString('ko-KR')}</td>`;
        });

        return `
        <tr>
            <td class="time">${label}</td>
            ${tds}
            <th class="sum">${(Math.floor(rowSum * 10) / 10).toLocaleString('ko-KR')}</th>
        </tr>
    `;
    }

    if (dataGroup) {
        // 인버터별 발전량
        const group = groupList.find(g => Number(g.group) === Number(dataGroup)),
            crewList = group?.crew || [];

        for (const crew of crewList) {
            const list = data[crew.inverter] ?? [],
                dateMap = toDateMap(list);

            tbodyOut += renderRow(
                crew.name,
                dateMap,
                rows,
                colTotals
            );
        }

    } else {
        // 그룹별 발전량
        for (const group of groupList) {
            const list = data[group.group] ?? [],
                dateMap = toDateMap(list);

            tbodyOut += renderRow(
                group.name,
                dateMap,
                rows,
                colTotals
            );
        }
    }

    let totalRow = '<tr class="total"><th class="time">합계</th>',
        grandTotal = 0;

    colTotals.forEach(v => {
        grandTotal += v;
        totalRow += `<th class="sum">${(Math.floor(v * 10) / 10).toLocaleString('ko-KR')}</th>`;
    });

    totalRow += `<th class="sum">${(Math.floor(grandTotal * 10) / 10).toLocaleString('ko-KR')}</th></tr>`;

    tbodyOut += totalRow;

    dom.getElementById('itemHead').innerHTML = theadOut;
    dom.getElementById('itemList').innerHTML = tbodyOut;

    vio.renderChart(rows, data, groupList);
};


/**
 * 차트 렌더링
 * @param timeRows
 * @param data
 * @param groupList
 */
vio.renderChart = function(timeRows, data, groupList) {
    const chartDom = document.getElementById('chart'),
        chart = echarts.init(chartDom, 'dark'),
        groupMap = new Map(),
        crewMap = new Map();

    // 그룹별, 인버터별
    for (const group of groupList) {
        groupMap.set(String(group.group), group);

        (group.crew || []).forEach(crew => {
            crewMap.set(String(crew.inverter), crew);
        });
    }

    const series = Object.entries(data).flatMap(([key, values], index) => {
        let label;

        if (crewMap.has(key)) {
            // crew 기준
            label = crewMap.get(key).name;
        } else if (groupMap.has(key)) {
            // group 기준
            label = groupMap.get(key).name;
        } else {
            label = key; // fallback
        }

        const dates = values.map(v =>
            vio.echoDate(vio._dateFormat, v[0])
        );

        // 발전량 최대값 opacity 기준값
        const maxValue = Math.max(
            ...values.map(v => Number(v[1]) || 0)
        );

        return [
            {
                name: `${label} 발전량`,
                type: 'bar',
                yAxisIndex: 0,
                itemStyle: {
                    color: function (params) {
                        const val = params.value[1],
                            opacity = maxValue ? Math.max(val / maxValue, 0.3) : 0.3;

                        return echarts.color.modifyAlpha(params.color, opacity);
                    }
                },
                data: values.map((v, i) => [dates[i], v[1]])
            },
            {
                name: `${label} 발전시간`,
                type: 'line',
                yAxisIndex: 1,
                symbolSize: 7,
                lineStyle: { width: 1, opacity: 0.6 },
                itemStyle: { opacity: 0.6 },
                z: 1000 - index,
                data: values.map((v, i) => [dates[i], v[2]])
            }
        ];
    });

    const hasData = Object.keys(data).length > 0,
        safeSeries = hasData ? series : [
            {
                name: '__dummy_bar__',
                type: 'bar',
                yAxisIndex: 0,
                data: [[vio.echoDate(vio._dateFormat, Date.now()), 0]],
                silent: true,
                itemStyle: { opacity: 0 }
            },
            {
                name: '__dummy_line__',
                type: 'line',
                yAxisIndex: 1,
                data: [[vio.echoDate(vio._dateFormat, Date.now()), 0]],
                silent: true,
                showSymbol: false,
                lineStyle: { opacity: 0 }
            }
        ];

    const option = {
        backgroundColor: false,
        tooltip: {
            trigger: 'axis',
            formatter: params => {
                // params = 같은 x축에 걸린 series들
                let inverter = params[0]?.seriesName?.split(' ')[0] ?? '';
                let out = `${inverter}<br/>`;

                params.forEach(p => {
                    if (p.seriesType === 'bar') {
                        out += `${p.marker}${p.seriesName} <b>${p.value[1]}</b>kWh `;
                    } else if (p.seriesType === 'line') {
                        out += `${p.marker}발전시간 <b>${p.value[1]}</b>h<br/>`;
                    }
                });

                return out;
            }
        },
        grid: {
            left: '1%',
            bottom: '5%',
            right: '1%',
            top: '15%',
            containLabel: true
        },
        graphic: Object.keys(data).length
            ? null
            : [{
                type: 'text',
                left: 'center',
                top: 'middle',
                style: {
                    text: '데이터가 없습니다',
                    fill: '#888',
                    fontSize: 14
                }
            }],
        xAxis: {
            type: 'category',
            data: timeRows,
            axisLabel: {
                interval: 'auto'
            }
        },
        yAxis: [
            {
                type: 'value',
                name: '발전량 kWh',
                position: 'left'
            },
            {
                type: 'value',
                name: '발전시간 h',
                position: 'right',
                splitLine: {
                    show: false
                }
            }
        ],
        series: safeSeries
    };

    chart.setOption(option, true);

    window.addEventListener('resize', function() {
        chart.resize();
    });
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
vio.eventListenerSolar = function() {
    const dom = document;

    // 조회
    dom.getElementById('act').addEventListener('click', vio.getData);
    
    // 시간단위 변경
    dom.getElementById('dataType').addEventListener('change', vio.changeDataType);

    // 엑셀로 다운
    dom.getElementById('actExcelSave').addEventListener('click', vio.excelDownload);

    // 날짜 설정
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
    await vio.eventListenerSolar();

    await vio.getDashData();
    await vio.getData();

    vio._isInit = false;
});
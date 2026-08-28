'use strict';

vio._type = 'hours';
vio._sDate = '';
vio._datePicker = null;
vio._data = [];
vio._chartTimer = null;
vio._checkDay = 30;
vio._calcMode = new URLSearchParams(location.search).get('calc') || '';

/**
 * API 데이터 요청
 * @returns {Promise<void>}
 */
vio.getData = async function() {
    this._sDate = document.getElementById('sDate').value;

    const params = {
        content: this._type,
        sDate: this._sDate,
        baseCost: document.getElementById('isBaseCost').checked ? 1 : 0,
        checkDay: document.getElementById('isCheckDay').checked ? 1 : 0
    }

    this.netAble(true);

    const res = await fetch(`api/reduces/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(params)
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            this._checkDay = jsonData.checkDay || 30;

            this.initData();
            this.dataTrans(jsonData.data, jsonData.last, jsonData.kepcoBill);
            this.dataTransWidget('low', jsonData.low);
            this.dataTransWidget('frugal', jsonData.frugal);
            this.dataTransCompare(jsonData.compare);
        }

        this.netAble(false);
    }
};

/**
 * 데이터 초기화
 */
vio.initData = function() {
    const dateArr = [];

    this._data = [];

    let dateFormat;
    if (this._type === 'hours') {
        // 시간별
        const date = new Date(this._sDate),
            startDate = new Date(date.setHours(0, 0, 0, 0)),
            endDate = new Date(date.setHours(23, 59, 59, 999));

        while (startDate <= endDate) {
            dateArr.push(Math.floor(startDate.getTime() / 1000));
            startDate.setHours(startDate.getHours() + 1); // 1시간씩 증가
        }
    } else if (this._type === 'days') {
        // 일자별
        const date = new Date(`${this._sDate}-01`),
            year = date.getFullYear(),
            month = date.getMonth(),
            isCheckDay = document.getElementById('isCheckDay').checked,
            checkDay = this._checkDay;

        let startDate = new Date(year, month, 1, 0, 0, 0),
            endDate = new Date(year, month + 1, 0, 23, 59, 59);
        if (isCheckDay) {
            if (checkDay === 1) {
                // 1일 검침: 전월 1일 ~ 전월 말일
                startDate = new Date(year, month - 1, 1, 0, 0, 0);
                endDate = new Date(year, month, 0, 23, 59, 59);
            } else if (checkDay >= 2 && checkDay <= 29) {
                // 2~29일 검침: 전월 n일 ~ 이번 달 (n-1)일
                startDate = new Date(year, month - 1, checkDay, 0, 0, 0);
                endDate = new Date(year, month, checkDay - 1, 23, 59, 59);
            }
        }

        while (startDate <= endDate) {
            dateArr.push(Math.floor(startDate.getTime() / 1000));
            startDate.setDate(startDate.getDate() + 1);
        }
    } else {
        // 월별
        const date = new Date(`${this._sDate}-01-01`),
            startDate = new Date(date.getFullYear(), 0, 1, 0, 0, 0),
            endDate = new Date(date.getFullYear(), 11, 1, 0, 0, 0);

        while (startDate <= endDate) {
            dateArr.push(Math.floor(startDate.getTime() / 1000));
            startDate.setMonth(startDate.getMonth() + 1);
        }
    }

    for (let i = 0; i < dateArr.length; i++) {
        const date = dateArr[i];

        const row = {
            seq: date,
            watt: 0,
            high: 0,
            low: 0,
            frugal: 0,
            frugalRate: 0
        }
        this._data.push(row);
    }
};

/**
 * 데이터 매핑
 */
vio.dataTrans = function(data, lastData, kepcoBill) {
    const dom = document,
        isCheckDay = dom.getElementById('isCheckDay');

    let out = '',
        maxWatt = 0;

    if (data.length) {
        maxWatt = Math.max(...data.map(row => row[1]));
    }

    let dateFormat;
    switch (this._type) {
        case 'days':
            dateFormat = 'd';
            isCheckDay.disabled = false;
            break;
        case 'months':
            dateFormat = 'm';
            isCheckDay.disabled = false;
            break;
        default:
            dateFormat = 'h';
            isCheckDay.disabled = true;
            break;
    }

    for (let i = 0; i < this._data.length; i++) {
        const item = this._data[i];
        item.seq = this.echoDate(dateFormat, item.seq);

        const row = data.find(r => this.echoDate(dateFormat, r[0]) === item.seq);

        // 당월 데이터
        if (row) {
            item.ctime = row[0] ?? 0;
            item.watt = row[1] ?? 0;
            item.high = row[2] ?? 0;
            item.low = row[3] ?? 0;
            item.frugal = row[4] ?? 0;
            item.frugalRate = row[5] ?? 0;
        }

        // 직전 동일일자 조회
        if (lastData.length > 0) {
            let last = lastData.find(r => this.echoDate(dateFormat, r[0]) === item.seq);

            // 없으면 lastData의 마지막 날짜 적용(31일이 없는 달 대응)
            if (!last) {
                const lastDates = lastData.map(r => this.echoDate(dateFormat, r[0])),
                    maxLastDate = lastDates.reduce((a, b) => (a > b ? a : b));


                // 해당 날짜의 row 반환
                last = lastData.find(r => this.echoDate(dateFormat, r[0]) === maxLastDate);
            }

            // 직전 데이터
            if (last) {
                item.last = last[1] ?? 0;
            }
        }

        let maxClass = '';
        if (maxWatt && maxWatt === item.watt) {
            maxClass = 'high';
        }

        out += `
        <tr class="${maxClass}">
            <td>${item.seq}</td>
            <td>${this.echoNumber(item.watt)}</td>
            <td>${this.echoNumber(item.high)}</td>
            <td>${this.echoNumber(item.low)}</td>
            <td>${this.echoNumber(item.frugal)}</td>
            <td>${item.frugalRate}%</td>
        </tr>`;
    }

    dom.getElementById('itemList').innerHTML = out;

    this.renderChart();

    if (vio._calcMode && kepcoBill) {
        console.clear();
        for (let item of data) {
            const bill_ym = this.echoDate('ym', item[0]),
                row = kepcoBill.find(r => r.bill_ym === parseInt(bill_ym));

            if (row) {
                console.log(`▶ ${bill_ym}`);
                calcSimilarity('사용전력량', row.usekwh, item[1]);
                calcSimilarity('저압 전력요금', row.kwh_bill, item[7]);
                calcSimilarity('기본요금', row.base_bill, item[9]);
            }
        }

        function calcSimilarity(type, a, b) {
            const diff = Math.abs(a - b),
                max = Math.max(a, b);

            console.log(`[${type}] 한전: ${a} 계측기: ${b} 일치율: ${((1 - diff / max) * 100).toFixed(2)}`);
        }
    }
}

/**
 * 저압 전력 요금/저압 절감금액 데이터 매핑
 * @param elementId
 * @param data
 */
vio.dataTransWidget = function(elementId, data) {
    const dom = document,
        low = dom.getElementById(elementId);

    for (let key in data) {
        const element = low.querySelector(`.${key}`);
        if (element) {
            element.textContent = this.echoNumber(data[key]);
        }
    }

    if (data.hasOwnProperty('goalRatio')) {
        const goalRatio = dom.getElementById('goalRatio').children;
        goalRatio[0].style.bottom = `${data['goalRatio'] || 0}%`;
        goalRatio[1].textContent = `${data['goalRatio'] || 0}%`;
    }
};

/**
 * 직전 동일 기간 대비 데이터 매핑
 */
vio.dataTransCompare = function(data) {
    const dom = document;

    const billTotal = dom.getElementById('billTotal'),
        wattTotal = dom.getElementById('wattTotal'),
        billMax = dom.getElementById('billMax'),
        avgWatt = dom.getElementById('avgWatt'),
        avgLow = dom.getElementById('avgLow');

    // 저압 전력 요금
    billTotal.classList.remove('bad');
    billTotal.children[0].className = 'bi';
    if (data['billTotal'] > 0) {
        billTotal.classList.add('bad');
        billTotal.children[0].className = 'bi bi-caret-up-fill';
    } else if (data['billTotal'] < 0) {
        billTotal.children[0].className = 'bi bi-caret-down-fill';
    }
    billTotal.children[1].textContent = this.echoNumber(Math.abs(data['billTotal']));

    // 사용 전력량
    wattTotal.classList.remove('bad');
    wattTotal.children[0].className = 'bi';
    if (data['wattTotal'] > 0) {
        wattTotal.classList.add('bad');
        wattTotal.children[0].className = 'bi bi-caret-up-fill';
    } else if (data['wattTotal'] < 0) {
        wattTotal.children[0].className = 'bi bi-caret-down-fill';
    }
    wattTotal.children[1].textContent = this.echoNumber(Math.abs(data['wattTotal']));

    // 최고 전력 요금
    billMax.classList.remove('bad');
    billMax.children[0].className = 'bi';
    if (data['billMax'] > 0) {
        billMax.classList.add('bad');
        billMax.children[0].className = 'bi bi-caret-up-fill';
    } else if (data['billMax'] < 0) {
        billMax.children[0].className = 'bi bi-caret-down-fill';
    }
    billMax.children[1].textContent = this.echoNumber(Math.abs(data['billMax']));

    // 평균 절감 금액
    avgWatt.classList.remove('bad');
    avgWatt.children[0].className = 'bi';
    if (data['avgWatt'] > 0) {
        avgWatt.children[0].className = 'bi bi-caret-up-fill';
    } else if (data['avgWatt'] < 0) {
        avgWatt.classList.add('bad');
        avgWatt.children[0].className = 'bi bi-caret-down-fill';
    }
    avgWatt.children[1].textContent = this.echoNumber(Math.abs(data['avgWatt']));

    // 평균 절감률
    avgLow.classList.remove('bad');
    avgLow.children[0].className = 'bi';
    if (data['avgLow'] > 0) {
        avgLow.children[0].className = 'bi bi-caret-up-fill';
    } else if (data['avgLow'] < 0) {
        avgLow.classList.add('bad');
        avgLow.children[0].className = 'bi bi-caret-down-fill';
    }
    avgLow.children[1].textContent = this.echoNumber(Math.abs(data['avgLow']));
};

vio.renderChart = function() {
    if (this._chart) {
        this._chart.dispose();
    }
    const isMobile = window.innerWidth <= 768,
        chart = echarts.init(document.getElementById('chart'), 'dark');

    const option = {
        backgroundColor: false,
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow' // 막대 그래프에서 영역 강조
            },
            confine: true,
        },
        grid: {
            top: '2%',
            left: '2%',
            right: '2%',
            bottom: isMobile ? '15%' : '10%',
            containLabel: true,
            backgroundColor: '#ffffff'
        },
        legend: {
            data: ['저압 전력 요금', '저압 절감 금액', '직전 동일 기간 저압 전력 요금'],
            orient: 'horizontal',
            bottom: 0,
            left: 'center'
        },
        xAxis: {
            type: 'category',
            data: this._data.map(item => item.seq),
        },
        yAxis: {
            type: 'value',
            min: 0,
            axisLabel: {
                formatter: function(value) {
                    return vio.echoNumber(value) + '원'; // \u25CB는 원(○)의 유니코드
                }
            }
        },
        series: [
            {
                name: '저압 전력 요금',
                type: 'bar',
                stack: 'total', // 🔥 스택 그룹 설정
                data: this._data.map(item => item.low),
                barWidth: '50%',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#0041ff' },  // 상단 색상 (최대 부하)
                        { offset: 1, color: 'rgba(3, 3, 5, 0.8)' } // 하단 색상 (점점 어두워짐)
                    ])
                }
            },
            {
                name: '저압 절감 금액',
                type: 'bar',
                stack: 'total', // 🔥 스택 그룹 설정
                data: this._data.map(item => item.frugal),
                barWidth: '50%',
                itemStyle: {
                    color: '#00ffff'
                }
            },
            {
                name: '직전 동일 기간 저압 전력 요금',
                type: 'line',
                data: this._data.map(item => item.last),
                lineStyle: {
                    color: '#ad44ff',
                    width: 2
                },
                itemStyle: {
                    color: '#ad44ff'
                },
                symbol: 'circle',
                symbolSize: 6
            }
        ]
    };

    // 옵션 적용
    chart.setOption(option);
    this._chart = chart;
};

/**
 * 차트 리사이즈 실행
 */
vio.resizeCharts = function() {
    if (vio._chart) {
        const isMobile = window.innerWidth <= 768;

        vio._chart.resize();
        vio._chart.setOption({
            grid: {
                bottom: isMobile ? '15%' : '10%'
            }
        });
    }
};

/**
 * 이벤트 리스너 등록
 */
vio.eventListenerLowReduce = function() {
    const dom = document,
        nowDate = new Date(),
        nextMonthLastDate = new Date(nowDate.getFullYear(), nowDate.getMonth() + 2, 0);

    const datePicker = new tui.DatePicker('#wrapper', {
        date: nowDate,
        type: 'date',
        input: {
            element: '#sDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), nextMonthLastDate] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    dom.getElementById('dataType').addEventListener('change', function() {
        // 시간별, 일별, 월별
        vio._type = this.value;
        switch (this.value) {
            case 'hours':
                datePicker.setDateFormat('yyyy-MM-dd');
                datePicker.setType('date');
                break;
            case 'days':
                datePicker.setDateFormat('yyyy-MM');
                datePicker.setType('month');
                break;
            case 'months':
                datePicker.setDateFormat('yyyy');
                datePicker.setType('year');
                break;
        }
    });

    dom.getElementById('search').addEventListener('click', async function() {
        // 조회
        await vio.getData();
    });
    dom.getElementById('isBaseCost').addEventListener('click', async function() {
        // 기본요금 포함 토글
        await vio.getData();
    });
    dom.getElementById('isCheckDay').addEventListener('click', async function() {
        // 검침일 적용 포함 토글
        await vio.getData();
    });
};

window.addEventListener('resize', function() {
    clearTimeout(vio._chartTimer);
    vio._chartTimer = setTimeout(vio.resizeCharts, 300);
});

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.eventListenerLowReduce();
    await vio.getData();
});
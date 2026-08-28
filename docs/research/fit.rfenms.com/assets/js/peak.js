'use strict';

vio._firm = {};
vio._peak = {};
vio._chartPeak = null; // 최대전력 차트
vio._cachePeakDom = null; // 전력 데이터 dom
vio._audioPeakReady = false; // 피크알람 준비
vio._wattChart = null; // 실시간 전력 차트
vio._peakStartTime = 0; // 피크 그래프 초기화 기준
vio._wattHour = []; // 60분 데이터
vio._watt24h = []; // 24시간 데이터
vio._watt1w = []; // 1주일 데이터
vio._watt12m = []; // 12개월 데이터
vio._type = 'hour';
vio._timer = 0;
vio._holidays = []; // 공휴일

/**
 * 초기화
 */
vio.lowPeakReady = function() {
    vio.peakBase(1);
    vio.period();
    vio.goalEffect();
};

/**
 * 실시간 전력 사용 추이 API 데이터 요청
 * @returns {Promise<void>}
 */
vio.period = async function() {
    const dom = document;

    if (!['hour', 'day', 'week', 'month', 'year'].includes(this._type)) {
        this._type = 'hour';
    }

    const params = {
        type: this._type
    };

    const res = await fetch(`api/peak/${this._fid}/period`, {
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
        this._holidays = jsonData.holidays;
        vio.initData(jsonData.data);

        dom.getElementById('peakContract').textContent = jsonData.contractLimit ? this.echoNumber(jsonData.contractLimit) : 0;
        dom.getElementById('peakOver').textContent = jsonData.peakOver ? this.echoNumber(jsonData.peakOver) : 0;
        dom.getElementById('peakNine').textContent = jsonData.peakNine ? this.echoNumber(jsonData.peakNine) : 0;
        dom.getElementById('peakEight').textContent = jsonData.peakEight ? this.echoNumber(jsonData.peakEight) : 0;
    }
};

/**
 * 피크 차트
 */
vio.chartPeak = function() {
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chartPeak', am4charts.XYChart);
    chart.colors.list = [am4core.color('#ffff00'), am4core.color('#ffbd00'), am4core.color('#00ffff'), am4core.color('#ad44ff'), am4core.color('#ff00ff')];
    chart.dateFormatter.inputDateFormat = 'yyyy-MM-dd';
    chart.cursor = new am4charts.XYCursor();
    chart.exporting.menu = new am4core.ExportMenu();

    let xAxis = chart.xAxes.push(new am4charts.DateAxis());
    xAxis.dateFormats.setKey('minute', 'm분');
    xAxis.periodChangeDateFormats.setKey('minute', 'm분');
    xAxis.renderer.labels.template.location = -0.1;
    xAxis.paddingBottom = -20;

    let yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.min = 0;
    yAxis.tooltip.disabled = true;
    yAxis.renderer.minLabelPosition = 0.01;
    yAxis.renderer.labels.template.adapter.add('text', function(text) {
        return text + ' [#a0a0a0 font-size:.86rem]kW[/]';
    });

    let series1 = chart.series.push(new am4charts.LineSeries());
    series1.dataFields.valueY = 'pr';
    series1.dataFields.dateX = 'date';
    series1.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]kW[/]';
    series1.strokeWidth = 2;
    series1.zIndex = 2;
    series1.name = '예측전력';

    let series2 = chart.series.push(new am4charts.LineSeries());
    series2.dataFields.valueY = 'pl';
    series2.dataFields.dateX = 'date';
    series2.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]kW[/]';
    series2.strokeWidth = 2;
    series2.strokeDasharray = '3,3';
    series2.zIndex = 2;
    series2.name = '목표전력';

    let series3 = chart.series.push(new am4charts.LineSeries());
    series3.dataFields.valueY = 'np';
    series3.dataFields.dateX = 'date';
    series3.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]kW[/]';
    series3.strokeWidth = 2;
    series3.zIndex = 2;
    series3.name = '현재전력';

    let series4 = chart.series.push(new am4charts.LineSeries());
    series4.dataFields.valueY = 'op';
    series4.dataFields.dateX = 'date';
    series4.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]kW[/]';
    series4.strokeWidth = 2;
    series4.strokeDasharray = '2,3';
    series4.zIndex = 2;
    series4.name = '기준전력';

    // animateBullet
    let bullet1 = series1.bullets.push(new am4charts.CircleBullet());
    bullet1.disabled = true;
    bullet1.propertyFields.disabled = 'disabled';
    bullet1.fill = am4core.color('#ffff00');

    let secondCircle = bullet1.createChild(am4core.Circle);
    secondCircle.radius = 4;
    secondCircle.fill = am4core.color('#ffff00');
    secondCircle.stroke = am4core.color('#ffff00');

    let bullet2 = series3.bullets.push(new am4charts.CircleBullet());
    bullet2.disabled = true;
    bullet2.propertyFields.disabled = 'disabled';
    bullet2.fill = am4core.color('#00ffff');

    secondCircle = bullet2.createChild(am4core.Circle);
    secondCircle.radius = 4;
    secondCircle.fill = am4core.color('#00ffff');
    secondCircle.stroke = am4core.color('#00ffff');

    bullet1.events.on('inited', function(event) {
        event.target.circle.animate(
            [
                {property: 'scale', from: .8, to: 3.2},
                {property: 'opacity', from: .8, to: 0}
            ],
            1000,
            am4core.ease.circleOut
        );
    });

    bullet2.events.on('inited', function(event) {
        event.target.circle.animate(
            [
                {property: 'scale', from: .8, to: 3.2},
                {property: 'opacity', from: .8, to: 0}
            ],
            1000,
            am4core.ease.circleOut
        );
    });

    this._chartPeak = chart;

    vio.peakChartResize(); // 화면해상도에 맞춰 피크 차트 변경
};



/**
 * 피크 그래프 초기화 후 목표전력과 기준전력 표시
 * @param powerLimit : 목표전력
 */
vio.peakChartReset = function (powerLimit) {
    // 그래프 초기화
    if (this._chartPeak) {
        this._chartPeak.dispose();
        this._chartPeak = null;
    }
    this.chartPeak();

    const nowTime = Date.parse(new Date().toLocaleDateString('sv-SE'));

    // 기준전력 계산, 목표전력 표시
    let chartData = [];
    for(let quarterIndex = 0; quarterIndex < 900; quarterIndex++){
        chartData[quarterIndex] = {
            seq: quarterIndex,
            pl: powerLimit,
            op: Math.round(powerLimit * quarterIndex / 900),
            date : new Date(nowTime + quarterIndex * 1000),
        };
    }
    this._chartPeak.data = chartData;
};

/**
 * 피크 그래프 초기화 요청
 * 피크 그래프 데이터에 현재전력과 예측전력을 업데이트
 * @param peakdata : [ 피크 데이터
 *     powerLimit : 목표전력
 *     currentPower : [ 현재전력
 *        0 ~ 899 초 : kW
 *     ]
 *     data : [ 예측전력
 *         0 ~ 899 초 : kW
 *     ]
 * ]
 */
vio.dataTrans = function (peakdata) {
    if(this._peakStartTime < peakdata.startTime){
        this._peakStartTime = peakdata.startTime;
        this.peakChartReset(peakdata.powerLimit);
    }

    for(let quarterIndex = 0, dataLen = peakdata.data.length; quarterIndex < dataLen; quarterIndex++){
        const currentPower = peakdata.currentPower[quarterIndex];
        this._chartPeak.data[quarterIndex].pr = peakdata.data[quarterIndex];
        this._chartPeak.data[quarterIndex].np = peakdata.currentPower[quarterIndex];

        if(dataLen == quarterIndex + 1){
            // 피크대시보드
            this.peakNodeInfo(quarterIndex, currentPower, peakdata.data[quarterIndex], 0);
            this._chartPeak.data[quarterIndex].disabled = false;
        }else{
            // 챠트써클효과끔
            this._chartPeak.data[quarterIndex].disabled = true;
        }
    }
    this._chartPeak.invalidateRawData();
};

/**
 * 피크대시보드 출력
 * @param seq
 * @param power
 * @param predict
 * @param moment
 */
vio.peakNodeInfo = function(seq, power, predict, moment) {
    const dom = document,
        peakBase = document.getElementById('peakBase');

    // 피크서클
    const powerRate = predict / this._firm.powerLimit,
        transformedValue = (((powerRate > 1 ? 1 : powerRate)) * 180) - 90; // 피크율 게이지 바늘 각도

    dom.getElementById('realTimePeakRatio').textContent = powerRate ? Math.round(powerRate * 100) : 0;

    if (!isNaN(transformedValue)) {
        dom.getElementById('realTimePeakGauge').style.transform = `translateX(-50%) rotate(${transformedValue}deg)`;
    }

    // 피크상태
    const dt = dom.getElementById('peakStatusArea').children;

    if (powerRate > 1) { // 초과
        dt[0].firstElementChild.classList.remove('blue');
        dt[2].firstElementChild.classList.remove('orange');
        dt[4].firstElementChild.classList.add('red');
        peakBase.classList.remove('blue');
        peakBase.classList.remove('orange');
        peakBase.classList.add('red');
        if (this._audioPeakReady) {
            this._audioPeak.play();
        }
    } else if (powerRate > 0.8) { // 근접
        dt[0].firstElementChild.classList.remove('blue');
        dt[2].firstElementChild.classList.add('orange');
        dt[4].firstElementChild.classList.remove('red');
        peakBase.classList.remove('blue');
        peakBase.classList.add('orange');
        peakBase.classList.remove('red');
        if (this._audioPeakReady) {
            this._audioPeak.pause();
        }
    } else {
        dt[0].firstElementChild.classList.add('blue');
        dt[2].firstElementChild.classList.remove('orange');
        dt[4].firstElementChild.classList.remove('red');
        peakBase.classList.add('blue');
        peakBase.classList.remove('orange');
        peakBase.classList.remove('red');
        if (this._audioPeakReady) {
            this._audioPeak.pause();
        }
    }

    // 계기시간
    document.getElementById('peakAbleTime').textContent = this.echoDate('h:i:s', Math.floor(Date.now() / 1000) - this._firm.timeDiff);
    // 15분타임
    document.getElementById('peakTimeDigit').textContent = `${Math.floor(seq / 60).toString().padStart(2, '0')}:${(seq % 60).toString().padStart(2, '0')} /`;
    // 15분타임바
    document.getElementById('peakMeterOn').style.width = `${Math.round(seq / 900 * 100)}%`;

    // 예측전력,목표전력,현재전력,기준전력
    if (this._cachePeakDom) {
        this._cachePeakDom[0].textContent = predict ? this.echoNumber(predict) : 0;
        this._cachePeakDom[1].textContent = this.echoNumber(this._firm.powerLimit);
        this._cachePeakDom[2].textContent = power ? this.echoNumber(power) : 0;
        this._cachePeakDom[3].textContent = this.echoNumber(Math.ceil(this._firm.powerLimit * seq / 900));
    }
};

/**
 * 기본정보 처리
  * @param isInit
 * @returns {Promise<void>}
 */
vio.peakBase = async function(isInit) {
    if (isInit) {
        this.netAble(true);
    }

    const params = {
        pk: isInit,
        isMeterDate: document.getElementById('isMeterDate').checked ? 1 : 0
    }

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`${this._apiUrl}/api/peak-stats/${this._fid}?${queryString}`, {
        method: 'GET',
        headers: {'Authorization': `x-auth ${vio._accessToken}`}
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            let chartData = [];

            this._firm = {
                powerLimit: jsonData.firm[4], // 목표전력
                pctRatio: jsonData.firm[2],  // 고압 PCT비
                pulseNum: jsonData.firm[3],  // 고압 펄스
                timeDiff: jsonData.firm[1] // 피크시간차
            };

            // 피크시간차
            if (jsonData.firm[1] != 0) {
                document.getElementById('peakTimeDiff').textContent = `-${jsonData.firm[1]}`;
            }

            // 피크차트
            this.dataTrans(jsonData.peakPower);

            // 최대수요 정보 차트
            for (let ia = 0; ia < jsonData.maxMonth.length; ++ia) {
                const ta = jsonData.maxMonth[ia];

                chartData[ia] = {
                    month: new Date(ta[0] * 1000),
                    watt: ta[1]
                };
            }

            // 피크제어 정보 차트
            chartData = [];
            for (let ia = 0; ia < 4; ++ia) {
                chartData[ia] = {
                    task: ['목표전력초과', '요금전력초과', '순간목표전력초과', '피크제어횟수'][ia],
                    year: jsonData.peakTask.year[ia],
                    today: jsonData.peakTask.today[ia],
                    total: jsonData.peakTask.total[ia],
                    month: jsonData.peakTask.month[ia]
                };
            }

            // 피크 절감정보 차트
            chartData = [];
            for (let ia = 0; ia < 4; ++ia) {
                const task = ['today', 'month', 'year', 'total'][ia],
                    taskName = ['오늘', '이번달', '지난1년', '총 누적'][ia],
                    ta = jsonData.peakTask[task];

                chartData[ia] = {
                    task: taskName,
                    watt: ta[4],
                    charge: ta[5] * 0.1
                };
            }

            this.dataTransExtend(jsonData.extend);

            setTimeout(function() {
                vio.peakBase(0);

                vio._timer++;
                if (vio._timer % 240 === 0) {
                    vio._timer = 0;
                    vio.goalEffect();
                }
            }, 1024);
        }
    }

    if (isInit) {
        this.netAble(false);
    }
};

/**
 * 검침일 기준 적용 토글
 * @param data
 */
vio.dataTransExtend = function(data) {
    // 검침일
    document.getElementById('meterDate').textContent = `${data.meterDate}일` ?? '-일';
};

/**
 * 화면해상도에 맞춰 글자크기 변경
 */
vio.syncResize = function() {
    let ia = Math.floor(window.innerWidth * 28 / 3840 * 100) / 100;

    if (ia < 12) {
        ia = 12;
    } else if (ia > 14) {
        ia = 14;
    }
    document.documentElement.style.fontSize = `${ia}px`;
};

/**
 * 화면해상도에 맞춰 피크 차트 변경
 */
vio.peakChartResize = function() {
    const chart = this._chartPeak,
        contentWidth = document.getElementById('chartPeak').offsetWidth;

    if (!chart || !contentWidth) {
        return;
    }

    const xAxis = chart._xAxes.values[0];

    if (contentWidth > 600) {
        xAxis.gridIntervals.setAll([
            { timeUnit: 'second', count: 1 },
            { timeUnit: 'minute', count: 1 }
        ]);
    } else if (contentWidth > 350) {
        xAxis.gridIntervals.setAll([
            { timeUnit: 'second', count: 1 },
            { timeUnit: 'minute', count: 2 }
        ]);
    } else if (contentWidth > 200) {
        xAxis.gridIntervals.setAll([
            { timeUnit: 'second', count: 1 },
            { timeUnit: 'minute', count: 5 }
        ]);
    } else {
        xAxis.gridIntervals.setAll([
            { timeUnit: 'second', count: 1 },
            { timeUnit: 'minute', count: 10 }
        ]);
    }
};

/**
 * 목표 절감액 달성 현황
  * @returns {Promise<void>}
 */
vio.goalEffect = async function() {
    const res = await fetch(`/api/peak/${this._fid}/frugal`, {
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
            this.dataTransGoalEffect(jsonData);
        }
    }
};

/**
 * 목표 절감액 달성 현황 및 투자회수기간 데이터 매핑
 * @param data
 */
vio.dataTransGoalEffect = function(data) {
    const dom = document,
        goalEffect = dom.getElementById('goalEffect'),
        goalEffectChild = goalEffect.children,
        disMoney = dom.getElementById('disMoney'),
        dashArray = 188.495;

    // 목표 절감액 달성 현황
    for (let key in data) {
        const element = goalEffect.querySelector(`.${key}`);
        if (element) {
            element.textContent = this.echoNumber(data[key]);
        }
    }

    // 투자회수기간
    data['investRatio'] = data.investRatio ? Math.round(data.investRatio * 100 * 100) / 100 : 0;
    for (let key in data) {
        const element = disMoney.querySelector(`.${key}`);
        if (element) {
            element.textContent = this.echoNumber(data[key]);
        }
    }

    const goals = [
        { element:goalEffectChild[0], effectAmount:data.hourFrugal, goalAmount:data.hourFrugalGoal, frugalRatio:data.hourFrugalRatio }, // 1시간
        { element:goalEffectChild[1], effectAmount:data.todayFrugal, goalAmount:data.todayFrugalGoal, frugalRatio:data.todayFrugalRatio }, // 오늘
        { element:goalEffectChild[2], effectAmount:data.weekFrugal, goalAmount:data.weekFrugalGoal, frugalRatio:data.weekFrugalRatio }, // 이번 주
        { element:goalEffectChild[3], effectAmount:data.monthFrugal, goalAmount:data.monthFrugalGoal, frugalRatio:data.monthFrugalRatio }, // 이번 달
        { element:goalEffectChild[4], effectAmount:data.yearFrugal, goalAmount:data.yearFrugalGoal, frugalRatio:data.yearFrugalRatio }  // 올해
    ];

    goals.forEach(goal => {
        const { element, effectAmount, goalAmount, frugalRatio } = goal,
            goalRate = frugalRatio ? Math.round(frugalRatio / 100 * 100) / 100 : 0,
            goalCircle = element.querySelector('.goalCircle').children;

        if (frugalRatio >= 100) {
            // 100% 달성 시 클래스 추가
            element.classList.add('gold');
        } else {
            // 100% 미달성 시 클래스 제거
            element.classList.remove('gold');
        }

        // 도넛 차트 업데이트
        goalCircle[1].setAttribute('stroke-dashoffset', goalRate <= 1 ? dashArray - dashArray * goalRate : 0);
        goalCircle[2].textContent = `${this.echoNumber(Math.round(frugalRatio))}%`;

        // 진행 바 업데이트
        element.querySelector('.goalMeterOn').style.width = `${Math.round(frugalRatio)}%`;
    });

    dom.getElementById('roiGoalOn').style.width = `${data.investRatio}%`;
};

/**
 * 데이터 초기화
 * @param data
 */
vio.initData = function(data) {
    let dataLength = data.length - 1,
        chartData = [],
        now = Math.floor(new Date().getTime() / 1000),
        gap = 0;

    switch (this._type) {
        case 'hour': // 1시간
            // 15분 간격 12시간 표시: 막대 48개
            if (dataLength >= 0) {
                // 가장 최근 데이터가 20분 안 지났으면 제거
                const latestTime = data[dataLength][0];
                if (now - latestTime < 20 * 60) {
                    data.pop();
                    dataLength = data.length - 1;
                }
            }

            gap = 900;
            now = dataLength >= 0 ? data[dataLength][0] : now - now % gap;
            for (let i = 0; i < 48; i++) {
                const item = data.find(r => r[0] === now);
                if (item) {
                    chartData.push(item);
                } else {
                    chartData.push([now, 0, 0, 0]);
                }
                now -= gap;
            }
            break;
        case 'day': // 오늘
            // 1시간 간격 2일 표시: 막대 24개
            gap = 3600;
            now = dataLength >= 0 ? data[dataLength][0] : now - now % gap;
            for (let i = 0; i < 24; i++) {
                const item = data.find(r => r[0] === now);
                if (item) {
                    chartData.push(item);
                } else {
                    chartData.push([now, 0, 0, 0]);
                }
                now -= gap;
            }
            break;
        case 'week': // 이번 주
            // 1일 간격 3주 표시: 막대 21개
            gap = 86400;
            now = dataLength >= 0 ? data[dataLength][0] : now - now % gap;
            for (let i = 0; i < 21; i++) {
                const item = data.find(r => r[0] === now);
                if (item) {
                    chartData.push(item);
                } else {
                    chartData.push([now, 0, 0, 0]);
                }
                now -= gap;
            }
            break;
        case 'month': // 이번 달
            // 1일 간격 한달 표시: 막대 30개
            gap = 86400;
            now = dataLength >= 0 ? data[dataLength][0] : now - now % gap;
            for (let i = 0; i < 30; i++) {
                const item = data.find(r => r[0] === now);
                if (item) {
                    chartData.push(item);
                } else {
                    chartData.push([now, 0, 0, 0]);
                }
                now -= gap;
            }
            break;
        case 'year': // 올해
            // 1개월 간격 2년 표시: 막대 24개
            now = dataLength >= 0 ? new Date(data[dataLength][0] * 1000) : new Date();
            for (let i = 0; i < 24; i++) {
                const timestamp = Math.floor(now.getTime() / 1000),
                    item = data.find(r => r[0] === timestamp);

                if (item) {
                    chartData.push(item);
                } else {
                    chartData.push([timestamp, 0, 0, 0]);
                }
                now.setMonth(now.getMonth() - 1)
            }
            break;
    }

    vio.wattChart(chartData);
};

/**
 * 실시간 전력 사용 추이 차트
 * @param data
 */
vio.wattChart = function(data) {
    const dom = document.getElementById('wattChart');

    if (this._wattChart) {
        this._wattChart.dispose();
    }

    const chart = echarts.init(dom, 'dark');

    // 색상 설정
    const colors = ['#4a90e2', '#fdf800', '#00ffff'];

    let lastDate = null; // 이전 날짜 임시 저장
    
    // 차트 옵션
    const option = {
        backgroundColor: false,
        color: colors,
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        grid: {
            left: '1%',
            bottom: '5%',
            right: '1%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'time',
            axisTick: {
                alignWithLabel: true  // 레이블과 축선을 일치시킴
            },
            axisLabel: {
                fontSize: 11,
                hideOverlap: true,
                formatter: function (value, index) {
                    const date = new Date(value),
                        month = String(date.getMonth() + 1).padStart(2, '0'),
                        day = String(date.getDate()).padStart(2, '0'),
                        hours = String(date.getHours()).padStart(2, '0'),
                        minutes = String(date.getMinutes()).padStart(2, '0');

                    // 날짜 변경되는 지점이면 날짜까지 표시
                    if (index === 0 || hours === '00') {
                        return `${month}/${day}`;
                    }

                    // 기본적으로 시간:분 형식 (예: 14:30)
                    return `${hours}:${minutes}`;
                }
            }
        },
        yAxis: [
            {
                type: 'value',
                name: '전력 사용량 (kWh)',
                axisLabel: {
                    formatter: '{value} kWh'
                },
            },
            {
                type: 'value',
                name: '전력 요금 (원)',
                axisLabel: {
                    formatter: '{value} 원'
                },
                position: 'right',
                splitLine: { show: false },
                axisLine: {
                    show: false  // Y축 선을 숨길 수 있습니다
                },
                min: 1000,
            },
        ],
        series: [
            {
                name: '전력 사용량',
                type: 'bar',
                yAxisIndex: 0,
                data: data.map(item => ({
                    name: '전력 사용량',
                    value: [item[0] * 1000, Math.floor(item[1] / 1000)]  // Date, Watt (kW로 변환)
                })),
                itemStyle: {
                    color: function (params) {
                        const loadType = vio.dateTimesLoad(params.data.value[0]);
                        let gradient;

                        switch (loadType) {
                            case 0:
                                gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#0041ff' },  // 경부하 (파란색)
                                    { offset: 1, color: 'rgba(3, 3, 5, 0.8)' }  // 어두운 색
                                ]);
                                break;
                            case 1:
                                gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#ff8600' },  // 중부하 (주황색)
                                    { offset: 1, color: 'rgba(3, 3, 5, 0.8)' }
                                ]);
                                break;
                            case 2:
                                gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#ff005b' },  // 최대부하 (빨간색)
                                    { offset: 1, color: 'rgba(3, 3, 5, 0.8)' }
                                ]);
                                break;
                            default:
                                gradient = new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                    { offset: 0, color: '#0041ff' },  // 기본 색상
                                    { offset: 1, color: 'rgba(3, 3, 5, 0.8)' }
                                ]);
                        }

                        return gradient;
                    }
                }
            },
            {
                name: '저압 전력 요금',
                type: 'line',
                showSymbol: false,
                yAxisIndex: 1,
                data: data.map(item => ({
                    name: '저압 전력 요금',
                    value: [item[0] * 1000, item[2]]
                }))
            },
            {
                name: '고압 전력 요금',
                type: 'line',
                showSymbol: false,
                yAxisIndex: 1,
                data: data.map(item => ({
                    name: '고압 전력 요금',
                    value: [item[0] * 1000, item[3]]
                }))
            }
        ],
        dataZoom: [
            {
                type: 'inside',  // 마우스 드래그로 확대 가능
                xAxisIndex: [0]  // x축 기준 확대
            },
        ],
    };

    chart.setOption(option);

    this._wattChart = chart;
};

/**
 * 경부하, 중부하, 최대부하
 * @param sTime
 * @returns {number}
 */
vio.dateTimesLoad = function(sTime) {
    const date = new Date(sTime),
        sMonth = date.getMonth() + 1,
        sHour = date.getHours(),
        dayOfWeek = date.getDay();

    let dayType = 0;

    if (dayOfWeek === 0) {
        dayType = 2;
    } else {
        // 일요일이 아닐때 공휴일 체크
        const isHoliday = vio._holidays.some(h => {
            const holidayDate = new Date(h * 1000);
            return holidayDate.getUTCFullYear() === date.getUTCFullYear() &&
                holidayDate.getUTCMonth() === date.getUTCMonth() &&
                holidayDate.getUTCDate() === date.getUTCDate();
        });

        if (isHoliday) {
            dayType = 2;
        } else if (dayOfWeek === 6) {
            dayType = 1;
        }
    }

    let lowHours = [0, 1, 2, 3, 4, 5, 6, 7, 22, 23],
        middleHours = [8, 9, 10, 11, 12, 13, 14, 15, 21],
        highHours = [15, 16, 17, 18, 19, 20],
        lowHoursWinter = [0, 1, 2, 3, 4, 5, 6, 7, 22, 23],
        middleHoursWinter = [8, 12, 13, 14, 15, 19, 20, 21],
        highHoursWinter = [9, 10, 11, 16, 17, 18];

    let loadType = 0; // 0 경부하, 1 중부하, 2 최대부하
    if ([1, 2, 11, 12].includes(sMonth)) { // 겨울
        if (dayType === 2) { // 휴일
            loadType = 0;
        } else if (dayType === 1) { // 토요일
            loadType = lowHoursWinter.includes(sHour) ? 0 : 1;
        } else {
            loadType = highHoursWinter.includes(sHour) ? 2 : middleHoursWinter.includes(sHour) ? 1 : 0;
        }
    } else {
        if (dayType === 2) { // 휴일
            loadType = 0;
        } else if (dayType === 1) { // 토요일
            loadType = lowHours.includes(sHour) ? 0 : 1;
        } else {
            loadType = highHours.includes(sHour) ? 2 : middleHours.includes(sHour) ? 1 : 0;
        }
    }

    return loadType;
}

/**
 * 이벤트 리스너 등록
 */
vio.eventListenerPeak = function() {
    const dom = document;

    let timer = null;
    vio.syncResize(); // 화면해상도에 맞춰 글자크기 변경
    window.addEventListener('resize', function() {
        clearTimeout(timer);
        timer = setTimeout(function () {
            vio.syncResize();
            vio.peakChartResize(); // 화면해상도에 맞춰 피크 차트 변경
            vio._wattChart.resize();
        }, 500);
    });

    // 피크알람사운드 준비
    vio._audioPeak = new Audio();
    vio._audioPeak.src = '../attach/soundPeak.mp3';

    dom.getElementById('peakMediaAlarm').addEventListener('change', function() {
        vio._audioPeakReady = this.checked;
        if (!vio._audioPeakReady) {
            vio._audioPeak.pause();
        }
    });

    // [예측전력,목표전력,현재전력,기준전력]
    vio._cachePeakDom = dom.getElementById('peakPointArea').querySelectorAll('.peakPoint');

    // 목표 절감액 달성 현황 탭 클릭 시 실시간 전력 사용 추이 변경
    dom.getElementById('goalEffect').addEventListener('click', async function(event) {
        const target = event.target,
            type = target.closest('li.item').getAttribute('data-type');
        if (target && type && type !== vio._type) {
            vio._type = target.closest('li.item').getAttribute('data-type');
            await vio.period();
        }
    });
};

// 목표절감액 아코디언박스 토글
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mainItemBox').forEach((item) => {
        item.addEventListener('click', () => {
            const target = item.nextElementSibling;

            document.querySelectorAll('.subTextBox').forEach((box) => {
                if (box === target && box.classList.contains('subTextBox')) {
                    box.style.display = 'block';
                } else {
                    box.style.display = 'none';
                }
            });
        });
    });
});

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.lowPeakReady();
    await vio.eventListenerPeak();
});
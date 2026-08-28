'use strict';

vio._firm = {};
vio._peak = {};
vio._chartPeak = null; // 최대전력 차트
vio._cachePeakDom = null; // 전력 데이터 dom
vio._baseRateChart = null; // 이번달 기본요금 차트
vio._audioPeakReady = false; // 피크알람 준비

vio._peakStartTime = 0;  // 피크 그래프 초기화 기준

vio.chartPeak = function() {
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chartPeak', am4charts.XYChart);
    chart.colors.list = [am4core.color('#ffff00'), am4core.color('#ffbd00'), am4core.color('#00ffff'), am4core.color('#00c9ff'), am4core.color('#ff00ff')];
    chart.dateFormatter.inputDateFormat = 'yyyy-MM-dd';
    chart.cursor = new am4charts.XYCursor();
    chart.exporting.menu = new am4core.ExportMenu();

    let xAxis = chart.xAxes.push(new am4charts.DateAxis());
    xAxis.dateFormats.setKey('minute', 'm분');
    xAxis.periodChangeDateFormats.setKey('minute', 'm분');
    xAxis.tooltipDateFormat = 'm분s초';
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

    if (vio.isPointE()) {
        let series5 = chart.series.push(new am4charts.LineSeries());
        series5.dataFields.valueY = 'moment';
        series5.dataFields.dateX = 'date';
        series5.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]kW[/]';
        series5.strokeWidth = 2;
        series5.strokeOpacity = 0.3;
        series5.zIndex = 1;
        series5.name = '순간전력';

        let bullet3 = series5.bullets.push(new am4charts.CircleBullet());
        bullet3.disabled = true;
        bullet3.propertyFields.disabled = 'disabled';
        bullet3.fill = am4core.color('#ff00ff');
        bullet3.fillOpacity = 0.3;
        bullet3.strokeOpacity = 0.3;

        secondCircle = bullet3.createChild(am4core.Circle);
        secondCircle.radius = 4;
        secondCircle.fill = am4core.color('#ff00ff');
        secondCircle.stroke = am4core.color('#ff00ff');

        bullet3.events.on('inited', function(event) {
            event.target.circle.animate(
                [
                    {property: 'scale', from: .8, to: 3.2},
                    {property: 'opacity', from: .8, to: 0}
                ],
                1000,
                am4core.ease.circleOut
            );
        });
    }

    this._chartPeak = chart;

    vio.peakChartResize(); // 화면해상도에 맞춰 피크 차트 변경
};


/*
피크 그래프 초기화 후 목표전력과 기준전력 표시
powerLimit : 목표전력
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
            //m15: `${Math.floor(quarterIndex / 60).toString().padStart(2, '0')}:${(quarterIndex % 60).toString().padStart(2, '0')}`,
            date : new Date(nowTime + quarterIndex * 1000),
        };
    }
    this._chartPeak.data = chartData;
};

/*
피크 그래프 초기화 요청
피크 그래프 데이터에 현재전력과 예측전력을 업데이트
peakdata : [ 피크 데이터
    powerLimit : 목표전력
    currentPower : [ 현재전력
        0 ~ 899 초 : kW
    ]
    data : [ 예측전력
        0 ~ 899 초 : kW
    ]
]
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

        let momentPeak = 0; // 순간전력
        if(quarterIndex > 0){
            momentPeak = (currentPower - peakdata.currentPower[quarterIndex - 1]) * 900;
            if(momentPeak > 0 && this.isPointE()){
                this._chartPeak.data[quarterIndex].moment = momentPeak;
            }
        }

        if(dataLen == quarterIndex + 1){
            // 피크대시보드
            this.peakNodeInfo(quarterIndex, currentPower, peakdata.data[quarterIndex], momentPeak);
            this._chartPeak.data[quarterIndex].disabled = false;
        }else{
            // 챠트써클효과끔
            this._chartPeak.data[quarterIndex].disabled = true;
        }
    }
    this._chartPeak.invalidateRawData();
};


// 피크대시보드 출력
vio.peakNodeInfo = function(seq, power, predict, moment) {
    // 피크서클
    const circleItem = document.getElementById('circle-front'),
        powerRate = predict / this._firm.powerLimit,
        strokeDasharray = circleItem.getAttribute('stroke-dasharray'),
        strokeDashOffset = powerRate >= 1 ? 0 : strokeDasharray - strokeDasharray * powerRate;

    circleItem.setAttribute('stroke-dashoffset', strokeDashOffset);
    document.getElementById('circle-value').textContent = `${powerRate ? Math.round(powerRate * 100) : 0}%`;

    // 피크상태
    const dt = document.getElementById('peakStatusArea').children;

    if (powerRate > 1) { // 초과
        dt[0].firstElementChild.classList.remove('blue');
        dt[1].firstElementChild.classList.remove('orange');
        dt[2].firstElementChild.classList.add('red');
        circleItem.classList.remove('blue');
        circleItem.classList.remove('orange');
        circleItem.classList.add('red');
        document.getElementById('peakBase').classList.add('peakOverMark');
        if (this._audioPeakReady) {
            this._audioPeak.play();
        }
    } else if (powerRate > 0.8) { // 근접
        dt[0].firstElementChild.classList.remove('blue');
        dt[1].firstElementChild.classList.add('orange');
        dt[2].firstElementChild.classList.remove('red');
        circleItem.classList.remove('blue');
        circleItem.classList.add('orange');
        circleItem.classList.remove('red');
        document.getElementById('peakBase').classList.remove('peakOverMark');
        if (this._audioPeakReady) {
            this._audioPeak.pause();
        }
    } else {
        dt[0].firstElementChild.classList.add('blue');
        dt[1].firstElementChild.classList.remove('orange');
        dt[2].firstElementChild.classList.remove('red');
        circleItem.classList.add('blue');
        circleItem.classList.remove('orange');
        circleItem.classList.remove('red');

        document.getElementById('peakBase').classList.remove('peakOverMark');
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
    this._cachePeakDom[0].textContent = predict ? this.echoNumber(predict) : 0;
    this._cachePeakDom[1].textContent = this.echoNumber(this._firm.powerLimit);
    this._cachePeakDom[2].textContent = power ? this.echoNumber(power) : 0;
    this._cachePeakDom[3].textContent = this.echoNumber(Math.ceil(this._firm.powerLimit * seq / 900));
    if (vio.isPointE()) {
        const element = this._cachePeakDom[4];
        element.textContent = moment ? this.echoNumber(moment) : 0;
        element.classList.remove('disable')
        element.previousElementSibling.classList.remove('disable');
        element.nextElementSibling.classList.remove('disable');
    }
};

// 순간전력 표시 체크
vio.isPointE = function() {
    return ['97', '105', '141'].includes(this._fid);
};

// 설비제어 상태
vio.controlStatus = function(controlLen, controlNo) {
    const dt = document.getElementById('controlStatusArea').children;

    if (controlLen == controlNo) {
        dt[0].firstElementChild.classList.remove('green');
        dt[1].firstElementChild.classList.remove('blue');
        dt[2].firstElementChild.classList.add('red');
    } else if (controlNo != 0) {
        dt[0].firstElementChild.classList.remove('green');
        dt[1].firstElementChild.classList.add('blue');
        dt[1].firstElementChild.setAttribute('data-alt', `일부제어 ${controlNo}`);
        dt[2].firstElementChild.classList.remove('red');
    } else {
        dt[0].firstElementChild.classList.add('green');
        dt[1].firstElementChild.classList.remove('blue');
        dt[2].firstElementChild.classList.remove('red');
    }
};

// 설비제어 요청
vio.controlRequest = async function(j) {
    if(!this._useNetworks){
        // this.netAble(true);

        const res = await fetch(`api/controls/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body:`{"cf":"${j.controlType==1?'seq':'control'}","${j.controlType==1?'sid':'cid'}":${j.idn},"authName":"${localStorage.getItem('authName')}"}`
        });

        if(!res.ok){
            console.error(res.status);
        }else{
            const jsonData =await res.json();

            this.netAble(false);
            switch(jsonData.cat){
                case 9:
                    this.toast({memo:'권한이 없습니다.'});
                    break;
                case 4:
                    this.toast({memo:'소유권한이 없습니다.'});
                    break;
                case 3:
                    this.toast({memo:'제어가능 상태가 아닙니다.'});
                    break;
                case 1:
                    this.toast({memo:'제어 요청되었습니다.'});
                    break;
                default:
                    this.toast({memo:'데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 기본정보 처리
vio.peakBase = async function(isInit) {
    if (isInit) {
        this.netAble(true);
    }

    const params = {
        pk: isInit,
        isMeterDate: document.getElementById('isMeterDate').checked ? 1 : 0
    }

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/peak-stats/${this._fid}?${queryString}`, {
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
            const thisTime = Date.now() / 1000;
            let chartData = [],
                dt;

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

            // 설비제어 모드
            document.getElementById('controlModeValue').textContent = `${jsonData.firm[8] ? '자동' : '수동'}/${jsonData.firm[9] ? '순차순위' : '우선순위'}`;

            // 설비제어 목록
            let out = '',
                dataLen = jsonData.control.length,
                controlNo = 0; // 제어중인 개수
            dt = document.getElementById('boardFacList');

            if (isInit) {
                for (let ia = 0; ia < dataLen; ++ia) {
                    const ta = jsonData.control[ia];

                    out += `
                    <div class="boardFacItem">
                        <div class="boardFacControll ${ta[2] < thisTime - 4 ? 'disable' : ''}">
                            <span class="boardFacWait rotate"></span>
                            <span class="boardFacWaitText">제어를 요청하였습니다.</span>
                        </div>
                        <span class="boardFacSwitch ${ta[1] == 1 ? 'active' : ''}" data-idn="${ta[0]}" data-type="${ta[5]}" onclick="vio.controlRequest({controlType:${ta[5]},idn:${ta[0]}})">
                            <span class="switchOff">OFF</span>
                            <span class="switchOn">제어</span>
                        </span>
                        <span class="boardFacName">${ta[3]}</span>
                        <span class="boardFacRate">${ta[4] != 0 ? `${ta[4]}%` : ''}</span>
                    </div>`;

                    if (ta[1] == 1) {
                        controlNo += 1;
                    }
                }
                dt.innerHTML = out;
            } else {
                for (let ia = 0; ia < dataLen; ++ia) {
                    const ta = jsonData.control[ia],
                        item = dt.querySelector(`[data-idn="${ta[0]}"]`);

                    item.classList.toggle('active', ta[1]); // 제어ON
                    item.previousElementSibling.classList.toggle('disable', ta[2] < thisTime - 4); // 제어요청시간

                    if (ta[1] == 1) {
                        controlNo += 1;
                    }
                }
            }
            if (dataLen != 0) {
                document.getElementById('controlStatusArea').children[2].firstElementChild.setAttribute('data-alt', `전체제어 ${dataLen}`);
                this.controlStatus(dataLen, controlNo);
            }

            this.dataTransExtend(jsonData.extend);

            // 데이터정확도
            document.getElementById('dataVerifyRate').textContent = `${jsonData.firm[5]}%`;

            setTimeout(function() {
                vio.peakBase(0);
            }, 1024);
        }
    }

    if (isInit) {
        this.netAble(false);
    }
};

vio.dataTransExtend = function(data) {
    const dom = document;

    // 검침일
    dom.getElementById('meterDate').textContent = `${data.meterDate}일` ?? '-일';

    // 이번달 요금적용전력
    const thisWattTime = data.thisWattTime;
    dom.getElementById('thisWatt').textContent = this.echoNumber(data.thisWatt);
    dom.getElementById('thisWattYmd').textContent = thisWattTime ? this.echoDate('y-m-d', thisWattTime) : '0000-00-00';
    dom.getElementById('thisWattHi').textContent = thisWattTime ? this.echoDate('h:i', thisWattTime) : '00:00';

    // 오늘최대수요
    const wattMaxTime = data.wattMaxTime;
    dom.getElementById('wattMax').textContent = this.echoNumber(data.wattMax);
    dom.getElementById('wattMaxYmd').textContent = wattMaxTime ? this.echoDate('y-m-d', wattMaxTime) : '0000-00-00';
    dom.getElementById('wattMaxHi').textContent = wattMaxTime ? this.echoDate('h:i', wattMaxTime) : '00:00';

    // 이번달 최대수요
    const monthWattMaxTime = data.monthWattMaxTime;
    dom.getElementById('monthWattMax').textContent = this.echoNumber(data.monthWattMax);
    dom.getElementById('monthWattMaxYmd').textContent = monthWattMaxTime ? this.echoDate('y-m-d', monthWattMaxTime) : '0000-00-00';
    dom.getElementById('monthWattMaxHi').textContent = monthWattMaxTime ? this.echoDate('h:i', monthWattMaxTime) : '00:00';

    // 오늘 피크제어 횟수
    dom.getElementById('peakTimes').textContent = this.echoNumber(data.peakTimes);

    // 금년 피크제어 횟수
    dom.getElementById('peakTimesYear').textContent = this.echoNumber(data.peakTimesYear);

    // 오늘 제어 절감액
    dom.getElementById('peakMoney').textContent = this.echoNumber(data.peakMoney);
    // 금년 제어 절감액
    dom.getElementById('peakMoneyYear').textContent = this.echoNumber(data.peakMoneyYear);

    // 이번달 기본요금
    const baseRate = data.baseRate ?? 0;
    const lastRate = data.lastRate ?? 0;
    const rateMoM = baseRate - lastRate;
    dom.getElementById('baseRate').textContent = this.echoNumber(baseRate);

    const baseRateMoM = dom.getElementById('baseRateMoM');
    if (rateMoM > 0) {
        baseRateMoM.classList.add('red');
        baseRateMoM.textContent = `+${this.echoNumber(rateMoM)}원 전월 동일`;
    } else if (rateMoM < 0) {
        baseRateMoM.classList.add('blue');
        baseRateMoM.textContent = `${this.echoNumber(rateMoM)}원 전월 동일`;
    }

    // 가격요금 변동 추이
    let chartData = [];
    const today = new Date();
    const currentYear = today.getFullYear(); // 현재 연도
    const currentMonth = today.getMonth() + 1; // 현재 월
    const currentDate = currentYear.toString() + (currentMonth < 10 ? '0' : '') + currentMonth.toString();
    for (let i = 11; i >= 0; i--) { // 오늘 월부터 과거 1년치 데이터 초기화
        let month = (currentMonth - i + 12) % 12 || 12;
        let year = currentYear;

        if (month > currentMonth) { // 현재 월보다 큰 경우는 이전 해
            year -= 1;
        }

        // yyyymm 형식으로 변환
        let date = year.toString() + (month < 10 ? '0' : '') + month.toString();

        chartData.push({date: date, won: ''});
    }
    for (let ia = 0; ia < data.baseRateYears.length; ++ia) {
        const ta = data.baseRateYears[ia],
            item = chartData.find(row => row.date == ta[0]);

        if (item || currentDate == ta[0]) {
            item.won = ta[2];
        }
    }
    const latestData = chartData.find(item => item.date == currentDate);
    if (latestData && !latestData.won) {
        latestData.won = baseRate;
    }

    this.renderBaseRateChart(chartData);
};

vio.renderBaseRateChart = function(chartData) {
    if (this._baseRateChart) {
        return;
    }

    am4core.useTheme(am4themes_dark);
    am4core.useTheme(am4themes_animated);

    const chart = am4core.create('baseRateChart', am4charts.XYChart);
    chart.colors.list = [am4core.color('#90cdf4')];
    chart.cursor = new am4charts.XYCursor();
    chart.paddingRight = 0;
    chart.paddingBottom = 0;

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    xAxis.tooltip.disabled = true;
    xAxis.dataFields.category = 'date';
    xAxis.renderer.grid.template.location = 0;
    xAxis.renderer.minGridDistance = 1;
    xAxis.renderer.labels.template.fontSize = 10;
    // 라벨 포맷을 yyyymm에서 mm으로 변경하는 함수 설정
    xAxis.renderer.labels.template.adapter.add('textOutput', function(text, target) {
        if (text) {
            return text.slice(4); // 'yyyymm' 형식에서 마지막 두 자리(mm)만 반환
        }
        return text;
    });

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.renderer.minGridDistance = 30;
    yAxis.renderer.labels.template.fontSize = 10;

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = 'won';
    series.dataFields.categoryX = 'date';
    series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]원[/]';
    series.columns.template.width = am4core.percent(50);

    // 최대값 표시
    const seriesMax = Math.max(...chartData.map(a => a.won));
    const seriesMaxSe = Math.max(...chartData.map(a => a.won == seriesMax ? 0 : a.won));
    series.columns.template.adapter.add('fill', function(fill, target) {
        if (seriesMax == target.dataItem.valueY) {
            return am4core.color('#f56565');
        } else if (seriesMaxSe == target.dataItem.valueY) {
            return am4core.color('#f6e05e');
        } else {
            return fill;
        }
    });
    series.columns.template.adapter.add('stroke', function(stroke, target) {
        if (seriesMax == target.dataItem.valueY) {
            return am4core.color('#e53e3e');
        } else if (seriesMaxSe == target.dataItem.valueY) {
            return am4core.color('#ecc94b');
        } else {
            return stroke;
        }
    });

    chart.data = chartData;
    this._baseRateChart = chart;
};

// 화면해상도에 맞춰 글자크기 변경
vio.syncResize = function() {
    let ia = Math.floor(window.innerWidth * 28 / 3840 * 100) / 100;

    if (ia < 12) {
        ia = 12;
    } else if (ia > 30) {
        ia = 30;
    }
    document.documentElement.style.fontSize = `${ia}px`;
};

// 화면해상도에 맞춰 피크 차트 변경
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

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    let timer = null;
    vio.syncResize(); // 화면해상도에 맞춰 글자크기 변경
    window.addEventListener('resize', function() {
        clearTimeout(timer);
        timer = setTimeout(function () {
            vio.syncResize();
            vio.peakChartResize(); // 화면해상도에 맞춰 피크 차트 변경
        }, 500);
    });

    // 피크알람사운드 준비
    vio._audioPeak = new Audio();
    vio._audioPeak.src = '../attach/soundPeak.mp3';

    document.getElementById('peakMediaAlarm').addEventListener('change', function() {
        vio._audioPeakReady = this.checked;
        if (!vio._audioPeakReady) {
            vio._audioPeak.pause();
        }
        localStorage.setItem('peakAudioMute', this.checked ? 'off' : 'on');
    });
    // 브라우저 소리권한 설정을 적용한 업체는 사용가능
    if(localStorage.getItem('peakAudioMute') == 'off'){
        vio._audioPeakReady == true;
        document.getElementById('peakMediaAlarm').checked = true;
    }

    // [예측전력,목표전력,현재전력,기준전력]
    vio._cachePeakDom = document.getElementById('peakPointArea').querySelectorAll('.peakPoint');

    vio.peakBase(1);
});
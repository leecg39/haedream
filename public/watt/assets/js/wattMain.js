'use strict';

vio._powerLimit = 0;
vio._eoiTime = 0;
vio._checkedNub = 0;
vio._facList = {};
vio._todayUsageTime = 0;
vio._todayTime = 0;

// 실시간 피크 전력게이지
vio.peakGuageChart = function(j) {
    // Themes begin
    am4core.options.autoSetClassName = true;
    am4core.useTheme(am4themes_animated);
    am4core.useTheme(am4themes_dark);
    // Themes end

    // create chart
    const chart = am4core.create('realPeakChart', am4charts.GaugeChart);
    chart.innerRadius = -16;

    // const colorSet = new am4core.ColorSet();
    const gradient = new am4core.LinearGradient();
    gradient.stops.push({color: am4core.color('#77d123')});
    gradient.stops.push({color: am4core.color('#fed734')});
    gradient.stops.push({color: am4core.color('#fe1d17')});

    const axis = chart.xAxes.push(new am4charts.ValueAxis());
    axis.min = 0;
    axis.max = j.powerLimit; // 목표전력
    axis.strictMinMax = true;
    axis.renderer.line.stroke = gradient;
    axis.renderer.line.strokeWidth = 22;
    axis.renderer.line.strokeLinecap = 'square';
    axis.renderer.line.strokeOpacity = 1;
    axis.renderer.labels.template.disabled = true;

    // Axis labels
    let label = chart.radarContainer.createChild(am4core.Label);
    label.isMeasured = false;
    label.y = 8;
    label.horizontalCenter = 'middle';
    label.verticalCenter = 'top';
    label.fontSize = '1rem';
    label.text = `${j.powerLimit}kw`; // 목표전력
    label.adapter.add('x', function(x, target) {
        return (axis.renderer.pixelInnerRadius + (axis.renderer.pixelRadius - axis.renderer.pixelInnerRadius) / 2);
    });

    const labelList = new am4core.ListTemplate(new am4core.Label());
    labelList.template.isMeasured = false;
    labelList.template.horizontalCenter = 'middle';

    const handValue = j.power; // 예측전력

    this._handShadow = chart.hands.push(new am4charts.ClockHand());
    this._handShadow.pin.radius = 22;
    this._handShadow.showValue(handValue);
    this._handShadow.fill = am4core.color('#0e1843');
    this._handShadow.stroke = am4core.color("#0e1843");
    this._handShadow.innerRadius = am4core.percent(16);

    this._hand = chart.hands.push(new am4charts.ClockHand());
    this._hand.pin.radius = 22; //18
    this._hand.showValue(handValue);
    this._hand.innerRadius = am4core.percent(18); //16
    this._hand.startWidth = 14; //8
    this._hand.endWidth = 2;
    this._hand.fill = am4core.color('#ff0000');
    this._hand.stroke = am4core.color("#000000");
    this._hand.parent.zIndex = 10;

    label = labelList.create();
    label.parent = chart.chartContainer;
    label.x = am4core.percent(51);
    label.y = am4core.percent(91);
    label.text = `[bold font-size:1rem]${axis.max != 0 ? (this._hand.value / axis.max * 100).toFixed(0) : 0}[/][font-size:.6rem]%[/]`;
    label.verticalCenter = 'middle';

    const label2 = labelList.create();
    label2.parent = chart.chartContainer;
    label2.fontSize = '1rem';
    label2.x = am4core.percent(4);
    label2.y = am4core.percent(4);
    label2.text = `[font-size:.92rem]${this._hand.value}kw[/]`;
    label2.horizontalCenter = 'start';

    this._hand.events.on("positionchanged", function() {
        const value = axis.positionToValue(vio._hand.currentPosition),
            percent = axis.max != 0 ? Math.floor(value / axis.max * 100) : 0;
        label.text = `[bold font-size:1rem ${percent < 60 ? '#000000' : ''}]${percent}[/][font-size:.6rem ${percent < 60 ? '#000000' : ''}]%[/]`;
        label2.text = `[font-size:.92rem]${value.toFixed(0)}kw[/]`;

        let matchingColor = 0;
        if (percent > 99) {
            matchingColor = 9;
        } else {
            matchingColor = Math.floor(percent / 10);
        }

        vio._hand.fill = ['#82d225', '#87d225', '#9dd328', '#c1d42c', '#fed734', '#ffb800', '#fe7826', '#fe401c', '#fe2117', '#fe1d17'][matchingColor];
    });

    chart.responsive.enabled = true;
};

// 오늘의 피크 전력
vio.peakWattChart = function(j) {
    if (this._peakWattChart) {
        this._peakWattChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('peakWattChart', am4charts.XYChart);
    chart.colors.list = [am4core.color('#57c5f6'), am4core.color('#e040fb'), am4core.color('#8bc34a'), am4core.color('#f44336')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'top';
    chart.legend.paddingBottom = 20;

    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
    xAxis.dataFields.category = 'seq';
    xAxis.renderer.minGridDistance = 60;
    xAxis.renderer.labels.template.fontSize = '.82rem';
    xAxis.tooltip.disabled = true;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = 'kW';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -40;
    yAxis.renderer.labels.template.fontSize = '.82rem';

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = 'today';
    series.dataFields.categoryX = 'seq';
    series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
    series.name = this._language != 'ko' ? 'TODAY' : '금일';
    series.fillOpacity = 0.8;
    series.tooltip.pointerOrientation = 'vertical';
    series.columns.template.width = am4core.percent(60);

    function createSeries(name, valueY) {
        const series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.categoryX = 'seq';
        series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
        series.name = name;
        series.tooltip.pointerOrientation = 'vertical';

        if (valueY == 'goal') {
            series.strokeDasharray = '3,3';
            series.tooltip.disabled = true;
        } else {
            const bullet = series.bullets.push(new am4charts.CircleBullet());
            bullet.circle.strokeWidth = 1;
            bullet.circle.radius = 2;
            bullet.circle.fill = am4core.color('#ffffff');

            const bullethover = bullet.states.create('hover');
            bullethover.properties.scale = 1;
        }
    }

    createSeries(this._language != 'ko' ? 'YESTERDAY' : '전일', 'last');
    createSeries(this._language != 'ko' ? 'LAST WEEK' : '전주', 'week');
    createSeries(this._language != 'ko' ? 'TARGET USAGE' : '목표사용량', 'goal');

    //chart.data =[{seq:'01:00',lWeek:352,lDay:651,today:723},{seq:'01:15',lWeek:352,lDay:646,today:877},{seq:'01:30',lWeek:352,lDay:645,today:923}}];
    chart.data = j;

    this._peakWattChart = chart;
};

// 오늘의 전력 사용량
vio.dayWattChart = function(j) {
    if (this._dayWattChart) {
        this._dayWattChart.dispose();
    }
    am4core.useTheme(am4themes_dark);
    am4core.useTheme(am4themes_animated);

    const chart = am4core.create('dayWattChart', am4charts.XYChart);
    chart.colors.list = [am4core.color('#57c5f6'), am4core.color('#e040fb'), am4core.color('#8bc34a'), am4core.color('#f44336')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'top';
    chart.legend.paddingBottom = 20;

    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
    xAxis.dataFields.category = 'seq';
    xAxis.renderer.minGridDistance = 60;
    xAxis.renderer.labels.template.fontSize = '.82rem';
    xAxis.tooltip.disabled = true;

    /*
     const range = xAxis.axisRanges.create();
     range.category = '04:00';
     range.endCategory = '08:00';
     range.axisFill.fill = '#ff0000';
     range.axisFill.fillOpacity = 0.2;
     */

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = 'kWh';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -40;
    yAxis.renderer.labels.template.fontSize = '.82rem';

    function animateBullet(bullet) {
        const animation = bullet.animate(
            [
                {property: 'scale', from: 0, to: 2.6},
                {property: 'opacity', from: 0.8, to: 0}
            ],
            1000,
            am4core.ease.circleOut
        );
        animation.events.on("animationended", function(event) {
            animateBullet(event.target.object);
        });
    }

    function createSeries(name, valueY) {
        const series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.categoryX = 'seq';
        series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kWh[/]';
        series.name = name;
        series.tooltip.pointerOrientation = 'vertical';

        if (name == '오늘사용량' || name == 'TODAY') {
            series.strokeWidth = 2;
            let bullet = series.bullets.push(new am4charts.CircleBullet());
            bullet.disabled = true;
            bullet.propertyFields.disabled = 'disabled';

            var secondCircle = bullet.createChild(am4core.Circle);
            secondCircle.radius = 3;
            secondCircle.fill = am4core.color('#57c5f6');

            bullet.events.on('inited', function(event) {
                animateBullet(event.target.circle);
            });
        }
    }

    createSeries(this._language != 'ko' ? 'TODAY' : '오늘사용량', 'today');
    createSeries(this._language != 'ko' ? 'YESTERDAY' : '어제사용량', 'last');
    createSeries(this._language != 'ko' ? 'LAST WEEK' : '전주사용량', 'week');
    chart.data = j;

    this._dayWattChart = chart;
};

// 주간 사용량
vio.rankWeekChart = function(j) {
    if (this._rankWeekChart) {
        this._rankWeekChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('rankWeekChart', am4charts.XYChart);
    chart.colors.list = [am4core.color('#57c5f6'), am4core.color('#e040fb')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'bottom';
    chart.paddingTop = 50;
    // chart.legend.paddingBottom = 20;

    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
    xAxis.dataFields.category = 'seq';
    xAxis.renderer.minGridDistance = 20;
    xAxis.renderer.labels.template.fontSize = '.82rem';
    xAxis.tooltip.disabled = true;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = 'kWh';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -40;
    yAxis.renderer.labels.template.fontSize = '.82rem';

    const verticalGradient = new am4core.LinearGradient();
    verticalGradient.stops.push({color: am4core.color('#00bcd4')});
    verticalGradient.stops.push({color: am4core.color('rgba(13,71,161,.1)')});
    verticalGradient.rotation = 90;

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = 'week';
    series.dataFields.categoryX = 'seq';
    series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
    series.name = this._language != 'ko' ? 'THIS WEEK' : '이번주 사용량';
    series.fill = verticalGradient;
    series.tooltip.pointerOrientation = 'vertical';
    series.columns.template.width = am4core.percent(60);

    const series2 = chart.series.push(new am4charts.LineSeries());
    series2.dataFields.valueY = 'last';
    series2.dataFields.categoryX = 'seq';
    series2.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kWh[/]';
    series2.name = this._language != 'ko' ? 'LAST WEEK' : '지난주 사용량';
    series2.tooltip.pointerOrientation = 'vertical';

    const bullet = series2.bullets.push(new am4charts.CircleBullet());
    bullet.circle.strokeWidth = 1;
    bullet.circle.radius = 3;
    bullet.circle.fill = am4core.color('#fff');

    const bullethover = bullet.states.create('hover');
    bullethover.properties.scale = 1.6;

    chart.data = j;

    this._rankWeekChart = chart;
};

// 설비제어 상태
vio.controllStat = function(j) {
    // 설비목록
    let on = 0,
        off = 0,
        dt = document.getElementById('boardFacList').querySelectorAll('[data-idn]');

    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        const idn = dt[ia].getAttribute('data-idn');
        // console.log(idn);
        if (j.hasOwnProperty(idn)) {
            if (j[idn] == 1) {
                dt[ia].classList.remove('toggleOff');
                dt[ia].classList.add('toggleOn');
                on += 1;
            } else {
                dt[ia].classList.remove('toggleOn');
                dt[ia].classList.add('toggleOff');
                off += 1;
            }
        } else {
            dt[ia].classList.remove('toggleOn');
            dt[ia].classList.add('toggleOff');
            off += 1;
        }
    }

    // 전체제어 상태
    dt = document.getElementById('boardFacStat').children;
    dt[0].classList.toggle('active', on == 0); // 전체OFF
    dt[1].classList.toggle('active', on > off); // 일부제어
    dt[2].classList.toggle('active', on == off && on > 0); // 전체제어
};

// 통신상태
vio.connectStatus = function(j) {
    const goodNo = j[0],
        badNo = j[1],
        ratio = goodNo + badNo == 0 ? 1 : goodNo / (goodNo + badNo),
        circleItem = document.getElementById('circle-front'),
        strokeDasharray = circleItem.getAttribute('stroke-dasharray'),
        statusNo = Math.round(ratio * 100);

    circleItem.setAttribute('stroke-dashoffset', strokeDasharray - strokeDasharray * ratio);
    document.getElementById('circle-value').textContent = statusNo;
    document.getElementById('circle-value').setAttribute('x', statusNo < 100 ? '52%' : '46%');
    const dt = document.getElementById('realChartText').querySelectorAll('[data-value]');
    dt[0].textContent = goodNo;
    dt[1].textContent = badNo;
};

// 예측전력 게이지
vio.powerGauge = function(j) {
    if (this._powerLimit == 0) {
        return;
    }
    this._hand.showValue(j[0], 512, am4core.ease.cubicOut);
    this._handShadow.showValue(j[0], 512, am4core.ease.cubicOut);

    const ratio = j[0] / this._powerLimit;
    const dt = document.getElementById('realTimeStat').children;
    if (ratio > 1) { // 초과
        if (!dt[2].classList.contains('active')) {
            dt[2].classList.add('active');
            dt[0].classList.remove('active');
            dt[1].classList.remove('active');
        }
    } else if (ratio > 0.8) { // 근접
        if (!dt[1].classList.contains('active')) {
            dt[1].classList.add('active');
            dt[0].classList.remove('active');
            dt[2].classList.remove('active');
        }
    } else { // 안정
        if (!dt[0].classList.contains('active')) {
            dt[0].classList.add('active');
            dt[1].classList.remove('active');
            dt[2].classList.remove('active');
        }
    }
};

// 피크전력 15분 타임바
vio.realMeterOn = function() {
    const time15m = (Math.floor(Date.now() * 0.001) - this._eoiTime) % 900,
        persent = Math.round(time15m / 900 * 100),
        dt = document.getElementById('realMeterOn');
    dt.style.width = `${persent}%`;
    dt.parentElement.nextElementSibling.textContent = `${Math.floor(time15m / 60).toString().padStart(2, '0')}:${(time15m % 60).toString().padStart(2, '0')} / 15:00`;
};

// 전력사용량 60분 타임바
vio.realHourMeterOn = function() {
    const time60m = this._todayUsageTime % 3600 + (Math.floor(Date.now() * 0.001) - this._eoiTime) % 900,
        persent = Math.round(time60m / 3600 * 100),
        dt = document.getElementById('realHourMeterOn');
    dt.style.width = `${persent}%`;
    dt.parentElement.nextElementSibling.textContent = `${Math.floor(time60m / 60).toString().padStart(2, '0')}:${(time60m % 60).toString().padStart(2, '0')} / 60:00`;
};

// 오늘 PEAK 전력
vio.realPeakBoard = function(j) {
    const dt = document.getElementById('realPeakBoard').querySelectorAll('[data-id]');
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        switch (dt[ia].getAttribute('data-id')) {
            case 'watt':
                dt[ia].textContent = this.echoNumber(j[1].toFixed(0));
                break;
            case 'time':
                dt[ia].textContent = this.echoDate('h:i', j[0]);
                break;
            case 'ratio':
                let out = '';
                if (j[1] == 0 || j[2] == 0 || j[1] == j[2]) {
                    out = '-';
                } else if (j[1] > j[2]) {
                    out = `▲ ${((j[1] - j[2]) / j[2] * 100).toFixed(1)}% (+${(j[1] - j[2]).toFixed(0)}㎾)`;
                    dt[ia].classList.remove('minus');
                } else {
                    out = `▼ ${((j[2] - j[1]) / j[2] * 100).toFixed(1)}% (-${(j[2] - j[1]).toFixed(0)}㎾)`;
                    dt[ia].classList.add('minus');
                }
                dt[ia].textContent = out;
                break;
        }
    }
};

// 실시간 전력 사용량
vio.realWattBoard = function(j) {
    let dt = document.getElementById('realWattBoard').querySelectorAll('[data-id]');
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        switch (dt[ia].getAttribute('data-id')) {
            case 'watt':
                dt[ia].textContent = this.echoNumber(j[1].toFixed(0));
                break;
            case 'time':
                dt[ia].textContent = this.echoDate('~h:i', j[0]);
                break;
            case 'ratio':
                let out = '';
                if (j[1] == 0 || j[2] == 0 || j[1] == j[2]) {
                    out = '-';
                } else if (j[1] > j[2]) {
                    out = `▲ ${((j[1] - j[2]) / j[2] * 100).toFixed(1)}% (+${(j[1] - j[2]).toFixed(0)}㎾h)`;
                    dt[ia].classList.remove('minus');
                } else {
                    out = `▼ ${((j[2] - j[1]) / j[2] * 100).toFixed(1)}% (-${(j[2] - j[1]).toFixed(0)}㎾h)`;
                    dt[ia].classList.add('minus');
                }
                dt[ia].textContent = out;
                break;
        }
    }
    // 오늘 사용량 기준시간
    //this._todayUsageTime =j[0] +900;
    this._todayUsageTime = j[0];

    // 부하시간 정보
    let loadType = 'low';
    const thisHour = new Date().getHours();
    dt = document.getElementById('realTimeArea').children;
    for (let ia = 0; ia < 24; ++ia) {
        if (ia == thisHour) {
            dt[ia].classList.add('active');
            if (dt[ia].classList.contains('realTimeHigh')) {
                loadType = 'high';
            } else if (dt[ia].classList.contains('realTimeMiddle')) {
                loadType = 'middle';
            }
        } else {
            dt[ia].classList.remove('active');
        }
    }
    dt = document.getElementById('realTimeHourStat').children;
    dt[0].classList.toggle('active', 'low' == loadType);
    dt[1].classList.toggle('active', 'middle' == loadType);
    dt[2].classList.toggle('active', 'high' == loadType);

};

// 실시간 전력 사용량 > 1시간당 사용량
vio.realWattGauge = function(j) {
    const gauge = document.getElementById('realWattGauge'),
        ratio = document.getElementById('realInfoRatio');

    let percent = 0;
    if (j[0] == 0) {
        percent = 30;
    } else if (j[0] > this._powerLimit) {
        percent = 100;
    } else {
        percent = Math.floor(j[0] / this._powerLimit * 100);
        if (percent < 30) {
            percent = 30; // 화면표시 최소공간
        }
    }
    gauge.textContent = j[0].toFixed(0);
    gauge.parentElement.style.width = `${percent}%`;

    let out = '';
    if (j[0] == 0 || j[1] == 0 || j[0] == j[1]) {
        out = '-';
    } else if (j[0] > j[1]) {
        out = `▲ ${((j[0] - j[1]) / j[1] * 100).toFixed(1)}% (+${(j[0] - j[1]).toFixed(0)}㎾h)`;
        ratio.classList.remove('minus');
    } else {
        out = `▼ ${((j[1] - j[0]) / j[1] * 100).toFixed(1)}% (-${(j[1] - j[0]).toFixed(0)}㎾h)`;
        ratio.classList.add('minus');
    }
    ratio.textContent = out;
};

// 오늘 사용량 요금
vio.dayWattLine = function(j) {
    const dt = document.getElementById('dayWattLine').children;
    dt[3].textContent = this.echoNumber(Math.floor(j[0]));
    dt[5].textContent = this.echoNumber(Math.floor(j[1]));
    dt[7].textContent = this.echoNumber(Math.floor(j[2]));
    dt[9].textContent = this.echoNumber(Math.floor(j[0] + j[1] + j[2]));
    document.getElementById('dayWattTime').textContent = `~ ${this.echoDate('h:i', j[3])}`;
};

// 당월 최대피크 정보
vio.boardEffortInfo = function(j) {
    const dt = document.getElementById('boardEffortInfo').querySelectorAll('[data-id]');
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        switch (dt[ia].getAttribute('data-id')) {
            case 'watt':
                dt[ia].textContent = this.echoNumber(j[1].toFixed(0));
                break;
            case 'time':
                dt[ia].textContent = this.echoDate('y.m.d h:i', j[0]);
                break;
            case 'ratio':
                let out1 = '',
                    out2 = '';
                if (j[1] == 0 || j[2] == 0 || j[1] == j[2]) {
                    out1 = '-';
                    out2 = '';
                } else if (j[1] > j[2]) {
                    out1 = `▲ ${((j[1] - j[2]) / j[2] * 100).toFixed(1)}%`;
                    out2 = `(+${(j[1] - j[2]).toFixed(0)}㎾)`;
                    dt[ia].classList.remove('minus');
                    dt[ia].nextElementSibling.classList.remove('minus');
                } else {
                    out1 = `▼ ${((j[2] - j[1]) / j[2] * 100).toFixed(1)}%`;
                    out2 = `(-${(j[2] - j[1]).toFixed(0)}㎾)`;
                    dt[ia].classList.add('minus');
                    dt[ia].nextElementSibling.classList.add('minus');
                }
                dt[ia].textContent = out1;
                dt[ia].nextElementSibling.textContent = out2;
                break;
            case 'exact':
                dt[ia].textContent = j[3];
                break;
        }
    }
};

// 피크제어 절감액
vio.boardEffortPeak = function(j) {
    const dt = document.getElementById('boardEffortPeak').querySelectorAll('[data-id]');
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        switch (dt[ia].getAttribute('data-id')) {
            case 'money':
                dt[ia].textContent = this.echoNumber(j[2]);
                break;
            case 'over':
                dt[ia].textContent = j[0];
                break;
            case 'safe':
                dt[ia].textContent = j[1];
                break;
        }
    }
};

// 설비사용량 Top5 오늘/지난주/이번달/이번년도
vio.top5 = function(j) {
    const dt = document.getElementById('top5Area').children;
    for (let index = 0; index < 4; ++index) {
        for (let ia = 0; ia < 5; ++ia) {
            const item = dt[index].children[ia + 1],
                itemName = item.querySelector('[data-id="name"]');
            if (j[index].length > ia) {
                const name = this._facList[j[index][ia][0]],
                    ratio = j[index][ia][1];
                itemName.textContent = name;
                itemName.setAttribute('title', name);
                item.querySelector('[data-id="ratio"]').textContent = `${ratio}%`;
                item.querySelector('[data-id="gauge"]').style.width = `${ratio}%`;
            } else {
                itemName.textContent = '';
                itemName.setAttribute('title', '');
                item.querySelector('[data-id="ratio"]').textContent = '';
                item.querySelector('[data-id="gauge"]').style.width = 0;
            }
        }
    }
};

vio.getBase = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'init',
            last: 0
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/watt-mains/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
        });
        // 전체 기본정보와 15분데이터, 매초 필요한 데이터 모두 포함
        // 5분마다 15분데이터 업데이트

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);
            switch (jsonData.cat) {
                case 9:
                    this.toast({memo: '권한이 없습니다.'});
                    break;
                case 8:
                    document.getElementById('contentsArea').style.visibility = 'hidden';
                    this.toast({memo: '접근 권한이 없습니다.'});
                    break;
                case 1:
                    /*
                     설비제어 목록
                     설비제어 모드
                     설비목록
                     중하시간정보
                     한전요금정보
                     목표전력

                     실시간 피크전력
                     실시간 전력사용량
                     피크전력
                     오늘의 전력사용량
                     당월 최대피크
                     절감율
                     주간사용량
                     설비별 사용량 TOP5

                     설비제어 상태
                     통신상태
                     실시간 peak 전력 피크게이지
                     */

                    const nowTime = Date.now() * 0.001;
                    this._checkedNub = nowTime + 300;

                    // 날짜
                    const dateTime = this.echoDate('ymdh:iw', nowTime);
                    let dt = document.getElementById('realConnText').children;
                    dt[0].textContent = dateTime.substr(0, 4);
                    dt[2].textContent = dateTime.substr(4, 2);
                    dt[4].textContent = dateTime.substr(6, 2);
                    dt = document.getElementById('realDateTime');
                    dt.textContent = dateTime.substr(8, 5);
                    dt.previousElementSibling.textContent = `${dateTime.substr(13)}요일`;

                    // 설비제어 목록
                    let out = '';
                    for (let ia = 0; ia < jsonData.controlList.length; ++ia) {
                        const ta = jsonData.controlList[ia];
                        out += `<div class="boardFacItem">
                        <span class="boardFacSwitch" data-idn="${ta[0]}">
                            <span class="switchOn">제어</span>
                            <span class="switchOff">OFF</span>
                        </span>
                        <span>${ta[1]}</span>
                    </div>`;
                    }
                    document.getElementById('boardFacList').innerHTML = out;

                    // 설비제어 모드
                    document.getElementById('boardFacMode').textContent = jsonData.controlMode;

                    // 설비제어 상태
                    this.controllStat(jsonData.controlStat);

                    // 통신상태
                    this.connectStatus(jsonData.net);

                    // 예측전력 게이지
                    this.peakGuageChart({power: jsonData.power[0], powerLimit: jsonData.powerLimit});
                    this._powerLimit = jsonData.powerLimit;

                    // 중부하 시간정보
                    dt = document.getElementById('realTimeArea').children;
                    for (let ia = 0; ia < 24; ++ia) {
                        if (jsonData.dateTimesLoad[ia] == 2) { // 최대부하
                            dt[ia].classList.add('realTimeHigh');
                        } else if (jsonData.dateTimesLoad[ia] == 1) { // 중간부하
                            dt[ia].classList.add('realTimeMiddle');
                        }
                    }

                    // 피크전력 15분 타임바
                    this._eoiTime = jsonData.eoiTime;
                    this.realMeterOn();

                    // 실시간 피크전력
                    this.realPeakBoard(jsonData.todayPeak);

                    // 실시간 전력 사용량
                    this.realWattBoard(jsonData.wattToday);

                    // 1시간당 사용량
                    this.realWattGauge(jsonData.wattLastHour);

                    // 당월 최대피크 정보
                    this.boardEffortInfo(jsonData.monthPeak);

                    // 당월 최대피크 정보 - 요금적용전력
                    dt = document.getElementById('boardEffortCostWatt');
                    dt.textContent = `${jsonData.kepco[0]}㎾`;
                    dt.nextElementSibling.textContent = this.echoDate('y.m.d', jsonData.kepco[1]);

                    // 피크제어 절감액
                    this.boardEffortPeak(jsonData.peakTask);

                    // 설비사용량 Top5 날짜 라벨
                    dt = document.getElementById('top5Area').children;
                    dt[0].querySelector('[data-id="date"]').textContent = `(${this.echoDate('y.m.d', nowTime)})`;
                    const tmpTime = new Date();
                    this._todayTime = Math.floor(new Date(tmpTime.toLocaleDateString('ja-JP')).getTime() * 0.001);
                    dt[1].querySelector('[data-id="date"]').textContent = `(${this.echoDate('m.d', tmpTime.setDate(tmpTime.getDate() - 8) * 0.001)} ~ ${this.echoDate('d', tmpTime.setDate(tmpTime.getDate() + 7) * 0.001)})`;
                    dt[2].querySelector('[data-id="date"]').textContent = `(${this.echoDate('m.01', nowTime)} ~ ${this._language != 'ko' ? 'TODAY' : '오늘'})`;

                    // 설비사용량 Top5
                    this._facList = jsonData.facList;
                    this.top5([jsonData.topToday, jsonData.topWeek, jsonData.topMonth, jsonData.topYear]);

                    // 오늘의 PEAK 전력
                    let tmpData = {},
                        chartData = [],
                        bulletEnableIndex = 0;
                    for (let ia = 1; ia <= 96; ++ia) {
                        tmpData[this._todayTime + ia * 900] = {goal: jsonData.powerLimit, last: 0, week: 0} // 목표전력, 금일, 전일, 전주
                    }
                    for (let ia = 0, th = jsonData.wattTodayList.length; ia < th; ++ia) {
                        const ta = jsonData.wattTodayList[ia];
                        tmpData[ta[0] + 900].today = Math.floor(ta[1]);
                        bulletEnableIndex = ia;
                    }
                    for (let ia = 0, th = jsonData.wattLastList.length; ia < th; ++ia) {
                        const ta = jsonData.wattLastList[ia];
                        tmpData[ta[0] + 86400 + 900].last = Math.floor(ta[1]);
                    }
                    for (let ia = 0, th = jsonData.wattWeekList.length; ia < th; ++ia) {
                        const ta = jsonData.wattWeekList[ia];
                        tmpData[ta[0] + 86400 * 7 + 900].week = Math.floor(ta[1]);
                    }
                    for (let key in tmpData) {
                        tmpData[key].seq = this.echoDate('h:i', key);
                        if (tmpData[key].seq == '00:00') {
                            tmpData[key].seq = '24:00';
                        }
                        chartData.push(tmpData[key]);
                    }
                    this.peakWattChart(chartData);

                    // 사용량 합계
                    let usageToday = 0,
                        usageLast = 0,
                        usageWeek = 0;

                    //오늘 전력사용량
                    const chartDataDay = JSON.parse(JSON.stringify(chartData));
                    for (let ia = 0; ia < 96; ++ia) {
                        chartDataDay[ia].last = Math.floor(chartDataDay[ia].last / 4);
                        chartDataDay[ia].week = Math.floor(chartDataDay[ia].week / 4);
                        if (chartDataDay[ia].hasOwnProperty('today')) {
                            chartDataDay[ia].today = Math.floor(chartDataDay[ia].today / 4);
                            if (bulletEnableIndex == ia) {
                                chartDataDay[ia].disabled = false;
                            }
                            usageToday += chartDataDay[ia].today;
                        }

                        usageLast += chartDataDay[ia].last;
                        usageWeek += chartDataDay[ia].week;
                    }
                    this.dayWattChart(chartDataDay);

                    // 사용량
                    if (this._language != 'ko') {
                        dt = document.getElementById('usagePower').querySelectorAll('.usageValue');
                        dt[0].textContent = this.echoNumber(usageToday);
                        dt[1].textContent = this.echoNumber(usageLast);
                        dt[2].textContent = this.echoNumber(usageWeek);
                    }

                    // 전력사용량 60분 타임바
                    this.realHourMeterOn();

                    // 오늘 사용량 요금
                    this.dayWattLine(jsonData.price);

                    // 주간사용량
                    tmpData = {};
                    for (let ia = 0; ia < 7; ++ia) {
                        tmpData[this._todayTime - 86400 * ia] = {week: 0, last: 0}
                    }
                    for (let ia = 0, th = jsonData.weekList.length; ia < th; ++ia) {
                        const ta = jsonData.weekList[ia];
                        tmpData[ta[0]].week = Math.floor(ta[1]);
                    }
                    for (let ia = 0, th = jsonData.lastWeekList.length; ia < th; ++ia) {
                        const ta = jsonData.lastWeekList[ia];
                        tmpData[ta[0] + 86400 * 7].last = Math.floor(ta[1]);
                    }
                    const chartDataWeek = [];
                    for (let key in tmpData) {
                        tmpData[key].seq = this._todayTime == key ? '오늘' : this.echoDate('w', key);
                        if (this._language != 'ko') {
                            tmpData[key].seq = {
                                '오늘': 'TODAY',
                                '월': 'MON',
                                '화': 'TUE',
                                '수': 'WED',
                                '목': 'THU',
                                '금': 'FRI',
                                '토': 'SAT',
                                '일': 'SUN'
                            }[tmpData[key].seq];
                        }
                        chartDataWeek.push(tmpData[key]);
                    }
                    this.rankWeekChart(chartDataWeek);

                    if (this._language != 'ko') {
                        // 오늘, 주간, 월간 피크 탑3
                        ['peakTodayTop', 'peakWeekTop', 'peakMonthTop'].forEach(function(item) {
                            const itemDom = document.getElementById(item).querySelectorAll('.maxPeakTime,.maxPeakWatt');
                            for (let ia = 0; ia < 3; ++ia) {
                                let peakTime = '',
                                    tmpNo = 0;
                                if (jsonData[item][ia] != null) {
                                    peakTime = vio.echoDate('dh:i', jsonData[item][ia][0]);
                                    if (item != 'peakTodayTop') {
                                        tmpNo = Number(peakTime.substr(0, 2));
                                        peakTime = `${tmpNo}${(31 == tmpNo || 21 == tmpNo || 1 == tmpNo ? 'st' : 22 == tmpNo || 2 == tmpNo ? 'nd' : 23 == tmpNo || 3 == tmpNo ? 'rd' : 'th')} ${peakTime.substr(2)}`;
                                    } else {
                                        peakTime = peakTime.substr(2);
                                    }

                                    itemDom[ia * 2].textContent = peakTime;
                                    itemDom[ia * 2 + 1].textContent = vio.echoNumber(jsonData[item][ia][1]);
                                } else {
                                    itemDom[ia * 2].textContent = '--:--';
                                    itemDom[ia * 2 + 1].textContent = '-';
                                }
                            }
                        });
                    }

                    setTimeout(function() {
                        vio.task();
                    }, 1000);
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.task = async function() {
    const nowTime = Date.now() * 0.001;

    const params = {
        cf: 'stat',
        last: this._todayUsageTime
    }
    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/watt-mains/${this._fid}?${queryString}`, {
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

        // 시간
        const dateTime = this.echoDate('h:i', nowTime);
        document.getElementById('realDateTime').textContent = dateTime;

        // 설비제어 상태
        this.controllStat(jsonData.controlStat);

        // 통신상태
        this.connectStatus(jsonData.net);

        // 예측전력 게이지
        this.powerGauge(jsonData.power);

        // 피크전력 15분 타임바
        this.realMeterOn();

        // 전력사용량 60분 타임바
        this.realHourMeterOn();

        if (jsonData.hasOwnProperty('todayPeak')) {
            // 실시간 피크전력
            this.realPeakBoard(jsonData.todayPeak);

            // 실시간 전력 사용량
            this.realWattBoard(jsonData.wattToday);

            // 1시간당 사용량
            this.realWattGauge(jsonData.wattLastHour);

            // 당월 최대피크 정보
            this.boardEffortInfo(jsonData.monthPeak);

            // 피크제어 절감액
            this.boardEffortPeak(jsonData.peakTask);

            // 설비사용량 Top5
            this.top5([jsonData.topToday, jsonData.topWeek, jsonData.topMonth, jsonData.topYear]);

            // 오늘 사용량 요금
            this.dayWattLine(jsonData.price);

            let lastIndex = jsonData.wattTodayList.length;
            if (lastIndex > 0) {
                lastIndex -= 1;
                // 오늘의 PEAK 전력 마지막 15분 사용량 업뎃
                if (!this._peakWattChart.data[lastIndex].hasOwnProperty('today')) {
                    this._peakWattChart.data[lastIndex].today = jsonData.wattTodayList[lastIndex][1];
                    this._peakWattChart.invalidateRawData();
                }
                // 오늘의 전력 마지막 15분 사용량 업뎃
                if (!this._dayWattChart.data[lastIndex].hasOwnProperty('today')) {
                    if (lastIndex > 0) {
                        this._dayWattChart.data[lastIndex - 1].disabled = true;
                    }
                    this._dayWattChart.data[lastIndex].disabled = false;
                    this._dayWattChart.data[lastIndex].today = Math.floor(jsonData.wattTodayList[lastIndex][1] / 4);
                    this._dayWattChart.invalidateRawData();
                }
            }

            // 오늘 사용량 요금
            this.dayWattLine(jsonData.price);

            // 주간 사용량 - 오늘 데이터 업뎃
            if (this._rankWeekChart.data.length) {
                this._rankWeekChart.data[this._rankWeekChart.data.length - 1].week = Math.floor(jsonData.weekList[jsonData.weekList.length - 1][1]);
                this._rankWeekChart.invalidateRawData();
            }
        }

        if (this._checkedNub < nowTime) {
            this._checkedNub = nowTime + 300;
        }
    }

    setTimeout(function() {
        vio.task();
    }, 1000);
};

window.addEventListener('DOMContentLoaded', async function() {
    const dom = document;

    await vio.documentReady();

    vio.getBase();

    setTimeout(function() {
        if (vio._language != 'ko') {
            let dt = dom.getElementById('dayWattChart').nextElementSibling;
            dt.classList.add('disable');
            dt.nextElementSibling.classList.remove('disable');

            dt = dom.getElementById('boardArea').children;
            dt[0].classList.add('disable');
            dt[1].classList.add('disable');
            dt[2].classList.add('disable');
            dt[3].classList.remove('disable');
            dt[4].classList.remove('disable');
            dt[5].classList.remove('disable');
        }
    }, 32);
}());
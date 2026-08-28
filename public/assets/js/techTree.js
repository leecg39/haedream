'use strict';

let gSetTimeout = null;

vio._chartInit = false; // 전류온도 팝업 데이터의 정보를 가져오기 위함
vio._chartIdn = 0;      // 설비고유번호
vio._chartDateTime = 0;     // 한시간단위 챠트데이터 시작시간 unixtime
vio._chartTempNub = []; // 온도조건 정보

vio._chartTech = null;   // 챠트전류
vio._chartTemp = null;   // 차트온도
vio._chartTechData = {}; // amchart 챠트전류데이터
vio._chartTempData = {}; // amchart 차트온도데이터

vio.chartTemp = function() {
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create(`chartTemp`, am4charts.XYChart);
    chart.colors.list = [am4core.color('#ffff00'), am4core.color('#ffbd00')];
    chart.cursor = new am4charts.XYCursor();
    chart.legend = new am4charts.Legend();

    const title = chart.titles.create();
    title.text = '시간별 설비온도';
    title.fontSize = 20;
    title.marginBottom = 16;

    const xAxis = chart.xAxes.push(new am4charts.DateAxis());
    xAxis.tooltip.disabled = true;
    xAxis.renderer.grid.template.location = 0;
    xAxis.renderer.minGridDistance = 70;
    xAxis.dateFormats.setKey('minute', 'HH:mm');
    xAxis.periodChangeDateFormats.setKey('minute', 'HH:mm');

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.renderer.minLabelPosition = 0.01;
    yAxis.renderer.labels.template.adapter.add('text', function(text) {
        return text + ' [#a0a0a0 font-size:.86rem]°C[/]';
    });

    const series1 = chart.series.push(new am4charts.LineSeries());
    series1.dataFields.valueY = 'cTemp';
    series1.dataFields.dateX = 'm60';
    //series1.tooltipText ='[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]°C[/]';
    series1.strokeWidth = 2;
    series1.name = '설비온도';

    // 온도설정 조건
    let outTemps = '';
    for (let ia = 0; ia < this._chartTempNub.length; ++ia) {
        const ta = this._chartTempNub[ia];
        outTemps += `
            <span class="chartLegendText">[ ${ta.sTemp} ~ ${ta.eTemp} ]</span>
            <span class="chartLegendEm">°C</span>
            <span class="chartLegendText">${ta.gain}</span>
            <span class="chartLegendEm">%</span>
        `;
    }
    if (outTemps != '') {
        outTemps = `<div class="chartLegendLabel">- 온도조건 -</div><div class="chartLegendNub">${outTemps}</div>`;
    }

    series1.tooltip.getFillFromObject = false;
    series1.tooltip.background.fill = am4core.color('#f0f0f0');
    series1.tooltipHTML = `
    <div>
        <div class="chartLegendDate">{dateX.formatDate('HH:mm:ss')}</div>
        <div class="chartLegend">
            <span class="chartLegend1">설정온도</span>
            <span class="chartLegendText">{sTemp}</span>
            <span class="chartLegendEm">°C</span>
            <span class="chartLegend2">현재온도</span>
            <span class="chartLegendText">{cTemp}</span>
            <span class="chartLegendEm">°C</span>
        </div>
        ${outTemps}
    </div>`;

    const series2 = chart.series.push(new am4charts.LineSeries());
    series2.dataFields.valueY = 'sTemp';
    series2.dataFields.dateX = 'm60';
    //series2.tooltipText ='[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]°C[/]';
    series2.strokeWidth = 2;
    series2.strokeDasharray = '3,3';
    series2.name = '설정온도';

    // animateBullet
    const bullet1 = series1.bullets.push(new am4charts.CircleBullet());
    bullet1.disabled = true;
    bullet1.propertyFields.disabled = 'disabled';
    bullet1.fill = am4core.color('#ffff00');

    const secondCircle = bullet1.createChild(am4core.Circle);
    secondCircle.radius = 4;
    secondCircle.fill = am4core.color('#ffff00');
    secondCircle.stroke = am4core.color('#ffff00');

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

    this._chartTemp = chart;
};

// 온도기록 차트 초기화
vio.chartTempReset = function() {
    if (this._chartTemp) {
        this._chartTemp.dispose();
        this._chartTemp = null;
    }
    this.chartTemp();

    // 시간 표시
    let data = [];

    // 4초 주기로 1시간을 기본차트 만들기
    for (let ia = 0; ia < 900; ++ia) {
        data[ia] = {
            m60: new Date((this._chartDateTime + ia * 4) * 1000)
        };
    }
    this._chartTemp.data = data;

    this._chartTempData.lastIndex = 0;
    this._chartTempData.ctime = 0;
    this._chartTempData.startTime = 0;
};

// 온도기록 차트
vio.chartTempData = function(j) { // [ctime(UNIX_TIMESTAMP), 현재온도, 설정온도]
    let timeIndex = 0;

    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia];

        if (this._chartTempData.startTime == 0) {
            this._chartTempData.startTime = ta[0];
        }
        if (ta[0] <= this._chartTempData.ctime || ta[0] > this._chartTempData.startTime + 3600) {
            continue;
        }else if(!this._chartTemp.data.hasOwnProperty(this._chartTempData.lastIndex)){
            continue;
        }

        timeIndex = ta[0] - this._chartTempData.startTime;
        this._chartTempData.ctime = ta[0];

        const tb = this._chartTemp.data[this._chartTempData.lastIndex];
        tb.cTemp = ta[1];
        tb.sTemp = ta[2];
        tb.disabled = true;
        this._chartTempData.lastIndex += 1;
    }

    if (timeIndex != 0) {
        if (this._chartTempData.lastIndex > 1) {
            this._chartTemp.data[this._chartTempData.lastIndex - 2].disabled = true; // 버블끔
        }
        this._chartTemp.data[this._chartTempData.lastIndex - 1].disabled = false; // 버블효과
        this._chartTemp.invalidateRawData();
    }
};

vio.chartTech = function() {
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create(`chartTech`, am4charts.XYChart);
    chart.colors.list = [am4core.color('#00ffff'), am4core.color('#00c9ff')];
    chart.cursor = new am4charts.XYCursor();
    chart.legend = new am4charts.Legend();

    const title = chart.titles.create();
    title.text = '시간별 제어전류';
    title.fontSize = 20;
    title.marginBottom = 16;

    const xAxis = chart.xAxes.push(new am4charts.DateAxis());
    xAxis.renderer.grid.template.location = 0;
    xAxis.renderer.minGridDistance = 70;
    xAxis.dateFormats.setKey('minute', 'HH:mm');
    xAxis.periodChangeDateFormats.setKey('minute', 'HH:mm');

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.renderer.minLabelPosition = 0.01;
    yAxis.renderer.labels.template.adapter.add('text', function(text) {
        return text + ' [#a0a0a0 font-size:.86rem]mA[/]';
    });

    const series1 = chart.series.push(new am4charts.LineSeries());
    series1.dataFields.valueY = 'aOut';
    series1.dataFields.dateX = 'm60';
    series1.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]mA[/]';
    series1.strokeWidth = 2;
    series1.name = '출력전류';

    const series2 = chart.series.push(new am4charts.LineSeries());
    series2.dataFields.valueY = 'aIn';
    series2.dataFields.dateX = 'm60';
    series2.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]mA[/]';
    series2.strokeWidth = 2;
    series2.strokeDasharray = '3,3';
    series2.name = '입력전류';

    // animateBullet
    const bullet1 = series1.bullets.push(new am4charts.CircleBullet());
    bullet1.disabled = true;
    bullet1.propertyFields.disabled = 'disabled';
    bullet1.fill = am4core.color('#00ffff');

    const secondCircle = bullet1.createChild(am4core.Circle);
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

    this._chartTech = chart;
};

// 전류기록 차트 초기화
vio.chartTechReset = function() {
    if (this._chartTech) {
        this._chartTech.dispose();
        this._chartTech = null;
    }
    this.chartTech();

    // 시간 표시
    let data = [];

    // 4초 주기로 1시간을 기본차트 만들기
    for (let ia = 0; ia < 900; ++ia) {
        data[ia] = {
            m60: new Date((this._chartDateTime + ia * 4) * 1000)
        };
    }
    this._chartTech.data = data;

    this._chartTechData.lastIndex = 0;
    this._chartTechData.ctime = 0;
    this._chartTechData.startTime = 0;
};

// 전류기록 차트
vio.chartTechData = function(j) { // [ctime(UNIX_TIMESTAMP), 입력전류, 출력전류]
    let timeIndex = 0;

    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia];

        if (this._chartTechData.startTime == 0) {
            this._chartTechData.startTime = ta[0];
        }
        if (ta[0] <= this._chartTechData.ctime || ta[0] > this._chartTechData.startTime + 3600) {
            continue;
        }else if(!this._chartTech.data.hasOwnProperty(this._chartTechData.lastIndex)){
            continue;
        }

        timeIndex = ta[0] - this._chartTechData.startTime;
        this._chartTechData.ctime = ta[0];

        const tb = this._chartTech.data[this._chartTechData.lastIndex];
        tb.aIn = ta[1];
        tb.aOut = ta[2];
        tb.disabled = true;
        this._chartTechData.lastIndex += 1;
    }

    if (timeIndex != 0) {
        if (this._chartTechData.lastIndex > 1) {
            this._chartTech.data[this._chartTechData.lastIndex - 2].disabled = true; // 버블끔
        }
        this._chartTech.data[this._chartTechData.lastIndex - 1].disabled = false; // 버블효과
        this._chartTech.invalidateRawData();
    }
};

// 전류/온도 차트 팝업
vio.popChart = async function(idn) {
    this._chartInit = true; // true 일때 전류/온도 데이터를 시간단위로 한번 요청한다
    this._chartIdn = idn;

    // 선택된 날짜정보가 없으면 현재시간대를 기본값
    const oDate = document.getElementById('eInputDate'),
        oTime = document.getElementById('eInputTime');

    if (!oDate.value || !oTime.value) {
        this._chartDateTime = Math.floor(Date.now() / 1000);
        this._chartDateTime -= this._chartDateTime % 3600;
    } else {
        this._chartDateTime = Math.floor(Date.parse(`${oDate.value} ${oTime.value.substr(0, 2)}:00:00`) / 1000);
    }
    oDate.value = this.echoDate('y-m-d', this._chartDateTime);
    oTime.value = this.echoDate('h:i', this._chartDateTime);

    this.getDataChart();
};

// 주조/주물/용광로 svg
vio.getForgeTag = function(isTemp, idn, setTemp, nowTemp, output) {
    let forgeHegith = 0;
    if (nowTemp != 0 && setTemp != 0) {
        forgeHegith = isTemp ? Math.round(nowTemp / setTemp * 60) : Math.round(output * 60 / 100);
        if (forgeHegith > 60) {
            forgeHegith = 60;
        }
    }
    const durTime = Math.round(Math.random() * 6 * 10) / 10 + 4;

    return `
    <svg viewBox="0 0 112 110" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,5.91v65.77v8.25v5.3C0,98.91,11.12,110,24.85,110h62.31C100.88,110,112,98.91,112,85.24v-5.3v-8.25V5.91H0z" fill="#7dacd3"></path>
        <path d="M112 0H0V5.94H112V0Z" fill="#2c4177"></path>
        <path d="M3.71002 5V71.92V79.66V84.63C3.71002 97.45 14.1 107.84 26.91 107.84H85.09C97.9 107.84 108.29 97.45 108.29 84.63V79.66V71.92V5H3.71002Z" fill="#2c4177"></path>
        <g>
            <path fill="url(#forge1Line${idn})">
                <animate repeatCount="indefinite" fill="freeze" attributeName="d" dur="${durTime}s" values="${this.getForgeWaveTag('back', forgeHegith)}" data-item="forgeWaveBack"></animate>
            </path>
            <path fill="url(#forge2Line${idn})">
                <animate repeatCount="indefinite" fill="freeze" attributeName="d" dur="${durTime + 2}s" values="${this.getForgeWaveTag('front', forgeHegith)}" data-item="forgeWaveFront"></animate>
            </path>
        </g>
        <g fill="#fff">
            <path d="M8 18H11.18V18.56H8V18Z"></path>
            <path d="M8 28.56H11.18V29.12H8V28.56Z"></path>
            <path d="M8 39.12H11.18V39.68H8V39.12Z"></path>
            <path d="M8 49.68H11.18V50.24H8V49.68Z"></path>
            <path d="M8 60.24H11.18V60.8H8V60.24Z"></path>
            <path d="M8 70.8H11.18V71.36H8V70.8Z"></path>
            <path d="M8 81.36H11.18V81.92H8V81.36Z"></path>
        </g>
        <g text-anchor="middle">
            ${
        isTemp == true
            ? `<text fill="#FFFFFF" font-size="10">
                    <tspan x="36" y="87">설정온도</tspan>
                </text>
                <text fill="#ffffb9" font-size="14">
                    <tspan x="72" y="87" data-item="setTemp">${setTemp}</tspan>
                </text>
                <text fill="#FFFFFF" font-size="10">
                    <tspan x="92" y="87">°C</tspan>
                </text>
                <text fill="white" font-size="26" font-weight="bold">
                    <tspan x="57" y="53" data-item="nowTemp">${nowTemp}</tspan>
                </text>
                <text fill="white" font-size="9">
                    <tspan x="57" y="67">현재온도 °C</tspan>
                </text>` // 주조,주물
            : `<text fill="white" font-size="32">
                    <tspan x="57" y="64" data-item="output">${output}</tspan>
                </text>
                <text fill="white" font-size="10">
                    <tspan x="57" y="80">출력량 %</tspan>
                </text>` // 가열,용해
    }
        </g>
        <defs>
            <linearGradient id="forge1Line${idn}" x1="56" y1="110" x2="56" y2="20" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#FEC100"></stop>
                <stop offset="0.9" stop-color="#F73300"></stop>
            </linearGradient>
            <linearGradient id="forge2Line${idn}" x1="56" y1="110" x2="56" y2="20" gradientUnits="userSpaceOnUse">    
                <stop offset="0.0" stop-color="#FDA400"></stop>  
                <stop offset="0.8" stop-color="#EC0404"></stop>
            </linearGradient>
        </defs>
    </svg>`;
};

// 용광로의 출렁이는 용암 svg
vio.getForgeWaveTag = function(wave, height) {
    if (wave == 'back') {
        return `
        M 8 ${78 - height} V 77.5 C 8 97, 17.5 104, 29.3 104 H 82.7 C 94.5 104, 104 97, 104 77.5 V ${78 - height} C 104 ${78 - height} 78 ${74 - height} 52 ${74 - height} C 25 ${74 - height} 8 ${78 - height} 8 ${78 - height}Z;
        M 8 ${77 - height} V 77.5 C 8 97, 17.5 104, 29.3 104 H 82.7 C 94.5 104, 104 97, 104 77.5 V ${79 - height} C 104 ${79 - height} 64 ${87 - height} 37 ${78 - height} C 10 ${67 - height} 8 ${77 - height} 8 ${77 - height}Z;
        M 8 ${78 - height} V 77.5 C 8 97, 17.5 104, 29.3 104 H 82.7 C 94.5 104, 104 97, 104 77.5 V ${78 - height} C 104 ${78 - height} 78 ${74 - height} 52 ${74 - height} C 25 ${74 - height} 8 ${78 - height} 8 ${78 - height}Z;
        M 8 ${79 - height} V 77.5 C 8 97, 17.5 104, 29.3 104 H 82.7 C 94.5 104, 104 97, 104 77.5 V ${77 - height} C 104 ${77 - height} 98 ${70 - height} 75 ${78 - height} C 52 ${85 - height} 8 ${79 - height} 8 ${79 - height}Z;
        M 8 ${78 - height} V 77.5 C 8 97, 17.5 104, 29.3 104 H 82.7 C 94.5 104, 104 97, 104 77.5 V ${78 - height} C 104 ${78 - height} 78 ${74 - height} 52 ${74 - height} C 25 ${74 - height} 8 ${78 - height} 8 ${78 - height}Z;`;
    } else {
        return `
        M 8 ${79 - height} V 77.5 C 8 97, 17.5 104, 29.3 104 H 82.7 C 94.5 104, 104 97, 104 77.5 V ${77 - height} C 104 ${77 - height} 98 ${70 - height} 75 ${78 - height} C 52 ${85 - height} 8 ${79 - height} 8 ${79 - height}Z;
        M 8 ${78 - height} V 77.5 C 8 97, 17.5 104, 29.3 104 H 82.7 C 94.5 104, 104 97, 104 77.5 V ${78 - height} C 104 ${78 - height} 78 ${74 - height} 52 ${74 - height} C 25 ${74 - height} 8 ${78 - height} 8 ${78 - height}Z;
        M 8 ${77 - height} V 77.5 C 8 97, 17.5 104, 29.3 104 H 82.7 C 94.5 104, 104 97, 104 77.5 V ${79 - height} C 104 ${79 - height} 64 ${87 - height} 37 ${78 - height} C 10 ${67 - height} 8 ${77 - height} 8 ${77 - height}Z;
        M 8 ${78 - height} V 77.5 C 8 97, 17.5 104, 29.3 104 H 82.7 C 94.5 104, 104 97, 104 77.5 V ${78 - height} C 104 ${78 - height} 78 ${74 - height} 52 ${74 - height} C 25 ${74 - height} 8 ${78 - height} 8 ${78 - height}Z;
        M 8 ${79 - height} V 77.5 C 8 97, 17.5 104, 29.3 104 H 82.7 C 94.5 104, 104 97, 104 77.5 V ${77 - height} C 104 ${77 - height} 98 ${70 - height} 75 ${78 - height} C 52 ${85 - height} 8 ${79 - height} 8 ${79 - height}Z;`;
    }
};

// 출력게이지 svg
vio.getBarGauge = function(idn, output) {
    return `
    <svg preserveAspectRatio="none" viewBox="2 0 216 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="208" height="24" stroke="#00D6FF"></rect>
        <rect x="8" y="8" width="${output * 2}" height="16" fill="url(#outLineFill${idn})" data-item="barGaugeRect"></rect>
        <circle cx="${output * 2 + 4}" cy="16" r="20" fill="url(#outRadialFill${idn})" data-item="barGaugeCircle"></circle>
        <defs>
            <linearGradient id="outLineFill${idn}" x1="8" y1="16" x2="${output * 2 + 4}" y2="16" gradientUnits="userSpaceOnUse" data-item="barGaugeOutLineFill">
                <stop stop-color="#1f87ff" stop-opacity="1"></stop>
                <stop offset="0.01" stop-color="#1f87ff" stop-opacity="1"></stop>
                <stop offset="0.5" stop-color="#42ccff" stop-opacity="1"></stop>
                <stop offset="0.9" stop-color="#FFFFFF" stop-opacity="1"></stop>
                <stop offset="1" stop-color="#FFFFFF"></stop>
            </linearGradient>
            <radialGradient id="outRadialFill${idn}" cx="${output * 2 + 4}" cy="16" r="20" gradientUnits="userSpaceOnUse" data-item="barGaugeOutRadialFill">
                <animate attributeType="XML" attributeName="r" values="18; 12; 18" dur="2s" repeatCount="indefinite"></animate>
                <stop stop-color="#FFFFFF"></stop>
                <stop offset="0.1" stop-color="#FFFFFF" stop-opacity="0.9"></stop>
                <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.4"></stop>
                <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"></stop>
            </radialGradient>
        </defs>
    </svg>`;
};

// 열처리 svg
vio.getMoldTag = function(idn, setTemp, nowTemp) {
    const beginTime = Math.round(Math.random() * 3 * 10) / 10; // 0~3 초 사이 부터 애니메이션 진행
    return `
    <svg viewBox="0 0 154 137" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clip-path="url(#clip0-${idn})">
        <path d="M148.82 136.06H4.25C1.9 136.06 0 134.16 0 131.81V4.25C0 1.9 1.9 0 4.25 0H148.82C151.17 0 153.07 1.9 153.07 4.25V131.81C153.07 134.16 151.17 136.06 148.82 136.06Z" fill="#001447"></path>
        <g>
            <path d="M133.23 122.72H19.84C16.71 122.72 14.17 120.18 14.17 117.05V43.3499C14.17 40.2199 16.71 37.6799 19.84 37.6799H133.23C136.36 37.6799 138.9 40.2199 138.9 43.3499V117.05C138.9 120.18 136.36 122.72 133.23 122.72Z" fill="url(#forgeRadial0-${idn})"></path>
            <g>
                <path d="M144.57 41.04L138.54 41.39C138.77 42 138.9 42.66 138.9 43.35V117.05C138.9 117.53 138.83 117.99 138.72 118.44L144.57 118.75V41.04Z" fill="url(#forgeLinear3-${idn})"></path>
                <path d="M135.77 122.11C135.01 122.49 134.15 122.71 133.23 122.71H19.8401C19.2401 122.71 18.6701 122.62 18.1301 122.45L17.4301 128.38H136.51L135.77 122.11Z" fill="url(#forgeLinear6-${idn})"></path>
                <path d="M14.17 117.05V43.3501C14.17 42.7001 14.29 42.0701 14.49 41.4801L8.5 41.1301V118.64L14.32 118.33C14.23 117.92 14.17 117.49 14.17 117.05Z" fill="url(#forgeLinear9-${idn})"></path>
                <path d="M17.63 32.01L18.85 37.77C19.17 37.71 19.5 37.68 19.84 37.68H133.23C133.68 37.68 134.11 37.74 134.52 37.83L135.75 32.01H17.63V32.01Z" fill="url(#forgeLinear12-${idn})"></path>
                <path d="M138.26 32.01H135.75L134.52 37.83C136.38 38.27 137.89 39.62 138.54 41.38L144.57 41.03V38.3C144.57 34.83 141.74 32.01 138.26 32.01Z" fill="url(#forgeRadial1-${idn})"></path>
                <path d="M138.26 128.39C141.74 128.39 144.56 125.57 144.56 122.09V118.75L138.71 118.44C138.3 120.05 137.21 121.39 135.76 122.12L136.5 128.39H138.26Z" fill="url(#forgeRadial5-${idn})"></path>
                <path d="M14.32 118.33L8.5 118.64V122.08C8.5 125.56 11.32 128.38 14.8 128.38H17.42L18.12 122.45C16.24 121.85 14.78 120.29 14.32 118.33Z" fill="url(#forgeRadial7-${idn})"></path>
                <path d="M18.85 37.77L17.63 32.01H14.81C11.33 32.01 8.51001 34.83 8.51001 38.31V41.13L14.5 41.48C15.16 39.57 16.82 38.13 18.85 37.77Z" fill="url(#forgeRadial11-${idn})"></path>
            </g>
        </g>
        ${
        this._fid == 125 ?
        `<g text-anchor="middle" fill="#FFFFFF">
            <text font-size="12">
                <tspan x="74" y="21.4">보온로</tspan>
            </text>
        </g>`
        :
        `<g text-anchor="middle" fill="#FFFFFF">
            <text font-size="12">
                <tspan x="47" y="21.4">설정온도</tspan>
            </text>
            <text font-size="17" fill="#ffffb9">
                <tspan x="95" y="23" data-item="setTemp">${setTemp}</tspan>
            </text>
            <text font-size="12">
                <tspan x="119" y="21.4">°C</tspan>
            </text>
        </g>`
        }
        <g text-anchor="middle" fill="#fff">
            <text font-size="11">
                <tspan x="76" y="101">현재온도 °C</tspan>
            </text>
            <text font-size="32" font-weight="bold">
                <tspan x="76" y="82" data-item="nowTemp">${nowTemp}</tspan>
            </text>
        </g>
        <defs>
            <radialGradient id="forgeRadial0-${idn}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(76.5355 80.1977) scale(55.1209 50.1099)">
                <stop stop-color="#ba0b03"></stop>
                <stop offset="0.01" stop-color="#ba0b03"></stop>
                <stop offset="0.4" stop-color="#ba0b03"></stop>
                <stop offset="1">
                    <animate attributeName="stop-color" values="#ba0b03; #d62a07; #ba0b03" dur="2s" repeatCount="indefinite"></animate>
                </stop>
            </radialGradient>
            <linearGradient id="forgeLinear3-${idn}" x1="137" y1="68.5" x2="145" y2="68.5" gradientUnits="userSpaceOnUse">
                <stop offset="0.01" stop-color="#ffd743"></stop>
                <stop offset="0.5" stop-color="#ffd743"></stop>
                <stop stop-color="#7dacd3">
                    <animate attributeName="offset" values=".2; .9; .2" dur="2s" begin="${beginTime}" repeatCount="indefinite"></animate>
                </stop>
                <stop offset="1" stop-color="#7dacd3"></stop>
            </linearGradient>
            <linearGradient id="forgeLinear6-${idn}" x1="77" y1="120.5" x2="77" y2="128.5" gradientUnits="userSpaceOnUse">
                <stop offset="0.01" stop-color="#ffd743"></stop>
                <stop offset="0.5" stop-color="#ffd743"></stop>
                <stop stop-color="#7dacd3">
                    <animate attributeName="offset" values=".2; .9; .2" dur="2s" begin="${beginTime}" repeatCount="indefinite"></animate>
                </stop>
                <stop offset="1" stop-color="#7dacd3"></stop>
            </linearGradient>
            <linearGradient id="forgeLinear9-${idn}" x1="16.5" y1="68.5" x2="8.5" y2="68.5" gradientUnits="userSpaceOnUse">
                <stop offset="0.01" stop-color="#ffd743"></stop>
                <stop offset="0.5" stop-color="#ffd743"></stop>
                <stop stop-color="#7dacd3">
                    <animate attributeName="offset" values=".2; .9; .2" dur="2s" begin="${beginTime}" repeatCount="indefinite"></animate>
                </stop>
                <stop offset="1" stop-color="#7dacd3"></stop>
            </linearGradient>
            <linearGradient id="forgeLinear12-${idn}" x1="77" y1="40" x2="77" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0.01" stop-color="#ffd743"></stop>
                <stop offset="0.5" stop-color="#ffd743"></stop>
                <stop stop-color="#7dacd3">
                    <animate attributeName="offset" values=".2; .9; .2" dur="2s" begin="${beginTime}" repeatCount="indefinite"></animate>
                </stop>
                <stop offset="1" stop-color="#7dacd3"></stop>
            </linearGradient>
            <radialGradient id="forgeRadial1-${idn}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(135.5 41) rotate(-45) scale(9.8995 10.4506)">
                <stop offset="0.01" stop-color="#ffd743"></stop>
                <stop offset="0.5" stop-color="#ffd743"></stop>
                <stop stop-color="#7dacd3">
                    <animate attributeName="offset" values=".2; .9; .2" dur="2s" begin="${beginTime}" repeatCount="indefinite"></animate>
                </stop>
                <stop offset="1" stop-color="#7dacd3"></stop>
            </radialGradient>
            <radialGradient id="forgeRadial5-${idn}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(137 120) rotate(45) scale(8.48528)">
                <stop offset="0.01" stop-color="#ffd743"></stop>
                <stop offset="0.5" stop-color="#ffd743"></stop>
                <stop stop-color="#7dacd3">
                    <animate attributeName="offset" values=".2; .9; .2" dur="2s" begin="${beginTime}" repeatCount="indefinite"></animate>
                </stop>
                <stop offset="1" stop-color="#7dacd3"></stop>
            </radialGradient>
            <radialGradient id="forgeRadial7-${idn}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17 120) rotate(139.399) scale(9.21955 10.0389)">
                <stop offset="0.01" stop-color="#ffd743"></stop>
                <stop offset="0.5" stop-color="#ffd743"></stop>
                <stop stop-color="#7dacd3">
                    <animate attributeName="offset" values=".2; .9; .2" dur="2s" begin="${beginTime}" repeatCount="indefinite"></animate>
                </stop>
                <stop offset="1" stop-color="#7dacd3"></stop>
            </radialGradient>
            <radialGradient id="forgeRadial11-${idn}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(17 41) rotate(-132.879) scale(9.55249)">
                <stop offset="0.01" stop-color="#ffd743"></stop>
                <stop offset="0.5" stop-color="#ffd743"></stop>
                <stop stop-color="#7dacd3">
                    <animate attributeName="offset" values=".2; .9; .2" dur="2s" begin="${beginTime}" repeatCount="indefinite"></animate>
                </stop>
                <stop offset="1" stop-color="#7dacd3"></stop>
            </radialGradient>
            <clipPath id="clip0-${idn}">
                <rect width="153.07" height="136.06" fill="white"></rect>
            </clipPath>
        </defs>
    </g>
    </svg>`;
}

// 챠트 생성, 실시간 업데이트는 getData에서
vio.getDataChart = async function() {
    this.netAble(true);

    const params = {
        cf: 'getChart',
        cid: this._chartIdn,
        sTime: this._chartDateTime,
    }

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/tech-trees/${this._fid}?${queryString}`, {
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

        switch (jsonData.cat) {
            case 9:
                this.toast({memo: '권한이 없습니다.'});
                break;
            case 1:
                document.getElementById('modalChart').classList.remove('disable');
                document.getElementById('chartTechName').textContent = jsonData.controlName;

                // 온도설정 정보
                this._chartTempNub = jsonData.rule;

                // 차트 초기화
                this.chartTechReset();
                this.chartTempReset();
                this._chartInit = false;

                const chartTempData = [],
                    chartTechData = [];

                // [unixtime, 현재온도, 설정온도, 입력전류, 출력전류]
                for (let ia = 0, th = jsonData.chartData.length; ia < th; ++ia) {
                    const ta = jsonData.chartData[ia];

                    chartTempData[ia] = [ta[0], ta[1], ta[2]];
                    chartTechData[ia] = [ta[0], ta[3], ta[4]];
                }

                this.chartTempData(chartTempData);
                this.chartTechData(chartTechData);
                break;
        }
        this.netAble(false);
    }
};

vio.getData = async function(isInit) {
    if (isInit) {
        this.netAble(true);
    }

    let cf = 'get';
    if (!this._chartInit && this._chartIdn) {
        // 챠트 데이터 요청
        cf = 'statChart';
    }

    const params = {
        cf: cf,
        pk: isInit,
        cid: this._chartIdn
    }

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/tech-trees/${this._fid}?${queryString}`, {
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

        if (isInit) {
            this.netAble(false);
        }
        switch (jsonData.cat) {
            case 9:
                this.toast({memo: '권한이 없습니다.'});
                break;
            case 1:
                let out = '';

                // 연속로는 제어시간과 절감금액의 합계로 보여준다
                const designData = {};
                for (let ia = 0, th = jsonData.data.length; ia < th; ++ia) {
                    const ta = jsonData.data[ia];
                    if (ta[9] != 4 || ta[8] == '') {
                        continue;
                    }
                    if (!designData.hasOwnProperty(ta[8])) {
                        designData[ta[8]] = {inIdn: ta[0], safeTime: ta[4], safeGold: ta[5]}
                    } else {
                        designData[ta[8]].safeTime += ta[4];
                        designData[ta[8]].safeGold += ta[5];
                    }
                }


                if (isInit) {
                    // 설비목록 생성
                    let nextTree = 0, // 그룹이름이 같을때 2개 묶음처리 (열처리,주조,주물), 연속로는 여러개 가능
                        lastDesign = 0,
                        lastTabName = null;

                    for (let ia = 0, th = jsonData.data.length; ia < th; ++ia) {
                        const ta = jsonData.data[ia];

                        if (lastTabName != ta[8] || ta[8] == '') {

                            if (ia != 0) {
                                out += '</div>';
                                if (lastDesign == 4) { // 연속로 종료
                                    out += '</div></div>';
                                }
                            }
                            //out +='<div class="techArea">';
                            out += `<div class="techArea ${ta[9] == 4 ? 'designRelay' : ''}">`;

                            nextTree = 0;
                            lastTabName = ta[8];
                            lastDesign = ta[9];
                        }

                        switch (ta[9]) {
                            case 4: // 연속로
                                if (nextTree == 0) {
                                    out += `
                            <div class="tech">
                                <div class="techHead">
                                    <div class="techName">${lastTabName}</div>
                                    <div class="techRelayEnergy fSmT">
                                        <i class="bi bi-clock"></i>
                                        <span class="techSafeText">제어시간</span>
                                        <span class="techSafeMark" id="groupSafeTime${ta[0]}">${this.echoNumber(Math.round(designData[ta[8]].safeTime / 3600))}</span>
                                        <span class="techSafeText">시간</span>
                                    </div>
                                    <div class="techRelayEnergy fSmT">
                                        <i class="bi bi-cash-stack"></i>
                                        <span class="techSafeText">절감금액</span>
                                        <span class="techSafeMark" id="groupsafeGold${ta[0]}">${this.echoNumber(Math.round(designData[ta[8]].safeGold * 0.0001))}</span>
                                        <span class="techSafeText">만원</span>
                                    </div>
                                </div>
                                <div class="techBody">`;
                                }
                                out += `
                        <div class="techRelay" id="tech${ta[0]}">
                            <div class="techPipe"></div>
                            <div class="techRelayName">${ta[6]}</div>
                            <div class="techTools">
                                <i class="icons icons16 bi bi-bar-chart-fill" onclick="vio.popChart(${ta[0]})"></i>
                                <i class="icons icons16 bi bi-gear-fill" onclick="vio.getSetting(${ta[0]})"></i>
                            </div>
                            <div class="techForge">${this.getMoldTag(ta[0], ta[7], ta[2])}</div>
                            <div class="techStatus statusBlue" data-item="techStatus">
                                <span class="techChip techBlue">운전</span>
                                <span class="techChip techRed">제어</span>
                                <span class="techChip techGreen">최적화</span>
                            </div>
                            <div class="techOut">
                                <span class="techOutText">출력</span>
                                <span class="techOutGauge">
                                    ${this.getBarGauge(ta[0], ta[3])}
                                </span>
                                <span class="techOutText">${ta[3]}%</span>
                            </div>
                        </div>`;
                                break;
                            case 5: // 팬
                                out += `
                        <div class="tech designHeat" id="tech${ta[0]}">
                            <div class="techHead">
                                <span class="techName">${ta[6]}</span>
                            </div>
                            <div class="techBody">
                                <div class="techForge">
                                    <svg viewBox="0 0 430 430" xmlns="http://www.w3.org/2000/svg">
                                        <g>
                                            <g transform="matrix(1,0,0,1,215,215)">
                                                <path fill="rgb(16,71,145)" d=" M-160,0 C-160,88 -88,160 0,160 C88,160 160,88 160,0 C160,-88 88,-160 0,-160 C-88,-160 -160,-88 -160,0z"></path>
                                            </g>
                                            <g transform="matrix(1,0,0,1,217,140)">
                                                <path fill="rgb(47,128,232)" d=" M-30,59 C-46,43 -57,15 -57,-4 C-57,-35 -32,-59 -2,-59 C29,-59 43,-45 49,-38 C54,-32 57,-25 57,-17 C57,-12 55,-5 53,-2 C43,14 33,9 15,47"></path>
                                            </g>
                                            <g transform="matrix(1,0,0,1,285,252)">
                                                <path fill="rgb(47,128,232)" d=" M-45,-56 C-23,-62 6,-60 24,-51 C51,-37 62,-4 48,22 C34,50 15,56 7,58 C-0,60 -7,60 -14,56 C-19,54 -24,49 -26,46 C-37,30 -28,23 -54,-9"></path>
                                            </g>
                                            <g transform="matrix(1,0,0,1,154,264)">
                                                <path fill="rgb(47,128,232)" d=" M28,-51 C-14,-39 -17,-50 -36,-47 C-40,-47 -46,-44 -51,-40 C-57,-35 -61,-28 -62,-21 C-63,-12 -65,7 -45,31 C-26,54 8,57 31,38 C45,26 59,3 63,-17"></path>
                                            </g>
                                            <g transform="matrix(1,0,0,1,215,215)">
                                                <path fill="rgb(156,194,244)" d=" M-31,0 C-31,17 -17,31 0,31 C17,31 31,17 31,0 C31,-17 17,-31 0,-31 C-17,-31 -31,-17 -31,0z"></path>
                                            </g>
                                            <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="360 215 215" to="0 215 215" dur="2s" begin="${Math.round(Math.random() * 1 * 10) / 10}" repeatCount="indefinite" data-item="animate"/>
                                        </g>
                                    </svg>
                                </div>
                                <div class="techInfo">
                                    <div class="techStatus statusBlue" data-item="techStatus">
                                        <span class="techChip techBlue">운전</span>
                                        <span class="techChip techRed">제어</span>
                                        <span class="techChip techGreen">최적화</span>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                                break;
                            case 2: // 가열,용해
                                out += `
                        <div class="tech designHeat" id="tech${ta[0]}">
                            <div class="techHead">
                                <span class="techName">${ta[6]}</span>
                                <span class="techTools">
                                    <i class="icons icons16 bi bi-bar-chart-fill" onclick="vio.popChart(${ta[0]})"></i>
                                    <i class="icons icons16 bi bi-gear-fill" onclick="vio.getSetting(${ta[0]})"></i>
                                </span>
                            </div>
                            <div class="techBody">
                                <div class="techForge">
                                    ${this.getForgeTag(false, ta[0], ta[7], ta[2], ta[3])}
                                </div>
                                <div class="techInfo">
                                    <div class="techStatus statusBlue" data-item="techStatus">
                                        <span class="techChip techBlue">운전</span>
                                        <span class="techChip techRed">제어</span>
                                        <span class="techChip techGreen">최적화</span>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                                break;
                            default: // 주조,주물/열처리
                                out += `
                        <div class="tech" id="tech${ta[0]}">
                            <div class="techHead">
                                <span class="techName">${ta[6]}</span>
                                <span class="techTools">
                                    <i class="icons icons16 bi bi-bar-chart-fill" onclick="vio.popChart(${ta[0]})"></i>
                                    <i class="icons icons16 bi bi-gear-fill" onclick="vio.getSetting(${ta[0]})"></i>
                                </span>
                            </div>
                            <div class="techBody">
                                <div class="techForge">
                                    ${
                                    ta[9] == 1
                                        ? this.getForgeTag(true, ta[0], ta[7], ta[2], ta[3]) // 주조,주물
                                        : this.getMoldTag(ta[0], ta[7], ta[2]) // 열처리
                                }
                                </div>
                                <div class="techInfo">
                                    <div class="techStatus statusBlue" data-item="techStatus">
                                        <span class="techChip techBlue">운전</span>
                                        <span class="techChip techRed ${{'97':'itemHidden'}[this._fid] ?? ''}">제어</span>
                                        <span class="techChip techGreen ${{'97':'itemHidden'}[this._fid] ?? ''}">최적화</span>
                                    </div>
                                    <div class="techOut">
                                        <span class="techOutText">출력</span>
                                        <span class="techOutGauge">
                                            ${this.getBarGauge(ta[0], ta[3])}
                                        </span>
                                        <span class="techOutText" data-item="output">${ta[3]}%</span>
                                    </div>
                                    <div class="techSafe">
                                        <div>
                                            <div class="fSmT">
                                                <i class="bi bi-clock"></i>
                                                <span class="techSafeText">제어시간</span>
                                            </div>
                                            <div class="techSafeItem">
                                                <span class="techSafeMark" data-item="energyTime">${this.echoNumber(Math.round(ta[4] / 3600))}</span>
                                                <span class="techSafeText">시간</span>
                                            </div>
                                        </div>
                                        <div>
                                        <div class="fSmT">
                                                <i class="bi bi-cash-stack"></i>
                                                <span class="techSafeText">절감금액</span>
                                            </div>
                                            <div class="techSafeItem">
                                                <span class="techSafeMark" data-item="energyGold">${this.echoNumber(Math.round(ta[5] * 0.0001))}</span>
                                                <span class="techSafeText">만원</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                                break;
                        }
                        nextTree += 1;
                    }
                    if (out != '') {
                        out += '</div>';
                    }
                    document.getElementById('techTree').innerHTML = out || '설정 대상 설비가 없습니다.';
                } else if (!this._chartInit && this._chartIdn) {
                    // 설비팝업 챠트
                    // [unixtime, 현재온도, 설정온도, 입력전류, 출력전류]
                    if (jsonData.chartData && jsonData.chartData.length != 0) {
                        this.chartTempData([[jsonData.chartData[0], jsonData.chartData[1], jsonData.chartData[2]]]);
                        this.chartTechData([[jsonData.chartData[0], jsonData.chartData[3], jsonData.chartData[4]]]);
                    }
                } else {
                    // 실시간 데이터 갱신
                    /*
                     jsonData.data
                     0 고유아이디(int),
                     1 상태(int), 0:운전/ 1:제어/ 2:최적화
                     2 현재온도(int),
                     3 출력량(int 100%),
                     4 제어시간(int sec),
                     5 절감금액(int 원)
                     6 이름
                     7 설정온도
                     8 그룹이름
                     9 설비종류
                     10 전류값

                     설비종류
                     1 주조/주물
                     2 용해
                     3 열처리
                     4 연속로
                     5 팬/펌프/벤츄레이터
                     6 압축공기
                     7 공조
                     */
                    for (let controlInfo of jsonData.data) {
                        const controlElements = document.getElementById(`tech${controlInfo[0]}`).querySelectorAll('[data-item]');

                        switch (controlInfo[9]) {
                            case 1:
                            case 3:
                                for (let element of controlElements) {
                                    switch (element.getAttribute('data-item')) {
                                        case 'output':
                                            element.textContent = `${controlInfo[3]}%`;
                                            break;
                                        case 'energyTime':
                                            element.textContent = this.echoNumber(Math.round(controlInfo[4] / 3600));
                                            break;
                                        case 'energyGold':
                                            element.textContent = this.echoNumber(Math.round(controlInfo[5] * 0.0001));
                                            break;
                                        case 'techStatus':
                                            if (controlInfo[1] == 0 && !element.classList.contains('statusBlue')) {
                                                element.classList.remove('statusGreen', 'statusRed');
                                                element.classList.add('statusBlue');
                                            } else if (controlInfo[1] == 1 && !element.classList.contains('statusRed')) {
                                                element.classList.remove('statusGreen', 'statusBlue');
                                                element.classList.add('statusRed');
                                            } else if (controlInfo[1] == 2 && !element.classList.contains('statusGreen')) {
                                                element.classList.remove('statusBlue', 'statusRed');
                                                element.classList.add('statusGreen');
                                            }

                                            const cid = controlInfo[0];
                                            if(cid >= 1835 && cid <= 1842){
                                                const nowTemp = controlInfo[2],
                                                    nowAmpere = controlInfo[10];

                                                let statusText = '';
                                                if(cid == 1837 || cid == 1838){
                                                    statusText = nowAmpere > 300 && nowTemp > 400 ? '운전' : '정지';
                                                }else if(cid == 1835 || cid == 1836){
                                                    statusText = nowAmpere > 100 && nowTemp > 400 ? '운전' : '정지';
                                                }else if(cid == 1839 || cid == 1840){
                                                    statusText = nowAmpere > 100 && nowTemp > 400 ? '운전' : '정지';
                                                }else if(cid == 1841 || cid == 1842){
                                                    statusText = nowAmpere > 200 && nowTemp > 400 ? '운전' : '정지';
                                                }

                                                if(statusText == '운전'){
                                                    element.classList.remove('statusRed');
                                                    element.classList.add('statusBlue');
                                                    element.firstElementChild.textContent = statusText;
                                                    element.firstElementChild.classList.remove('techRed');
                                                    element.firstElementChild.classList.add('techBlue');
                                                }else if(statusText == '정지'){
                                                    element.classList.remove('statusBlue');
                                                    element.classList.add('statusRed');
                                                    element.firstElementChild.textContent = statusText;
                                                    element.firstElementChild.classList.remove('techBlue');
                                                    element.firstElementChild.classList.add('techRed');
                                                }
                                            }
                                            break;
                                        case 'nowTemp':
                                            element.textContent = controlInfo[2];
                                            break;
                                        case 'setTemp':
                                            element.textContent = controlInfo[7];
                                            break;
                                        case 'barGaugeRect':
                                            element.setAttribute('width', controlInfo[3] * 2);
                                            break;
                                        case 'barGaugeCircle':
                                            element.setAttribute('cx', controlInfo[3] * 2 + 4);
                                            break;
                                        case 'barGaugeOutLineFill':
                                            element.setAttribute('x2', controlInfo[3] * 2 + 4);
                                            break;
                                        case 'barGaugeOutRadialFill':
                                            element.setAttribute('cx', controlInfo[3] * 2 + 4);
                                            break;
                                    }
                                }
                                break;
                            case 2:
                                for (let ia = 0; ia < dt.length; ++ia) {
                                    switch (element.getAttribute('data-item')) {
                                        case 'output':
                                            element.textContent = controlInfo[3];
                                            break;
                                        case 'techStatus':
                                            if (controlInfo[1] == 0 && !element.classList.contains('statusBlue')) {
                                                element.classList.remove('statusGreen', 'statusRed');
                                                element.classList.add('statusBlue');
                                            } else if (controlInfo[1] == 1 && !element.classList.contains('statusRed')) {
                                                element.classList.remove('statusGreen', 'statusBlue');
                                                element.classList.add('statusRed');
                                            } else if (controlInfo[1] == 2 && !element.classList.contains('statusGreen')) {
                                                element.classList.remove('statusBlue', 'statusRed');
                                                element.classList.add('statusGreen');
                                            }
                                            break;
                                    }
                                }
                                break;
                            case 4:
                                if (designData[controlInfo[8]].inIdn == controlInfo[0] && document.getElementById(`groupSafeTime${controlInfo[0]}`)) {
                                    document.getElementById(`groupSafeTime${controlInfo[0]}`).textContent = this.echoNumber(Math.round(designData[controlInfo[8]].safeTime / 3600));
                                    document.getElementById(`groupsafeGold${controlInfo[0]}`).textContent = this.echoNumber(Math.round(designData[controlInfo[8]].safeGold * 0.0001));
                                }
                                break;
                            case 5: // FAN
                                for (let ia = 0; ia < dt.length; ++ia) {
                                    switch (element.getAttribute('data-item')) {
                                        case 'animate':
                                            element.setAttribute('repeatCount', controlInfo[1] == 1 ? 1 : 'indefinite');
                                            break;
                                        case 'techStatus':
                                            if (controlInfo[1] == 0 && element.classList.contains('statusRed')) {
                                                element.classList.replace('statusRed', 'statusBlue');
                                            } else if (controlInfo[1] == 1 && element.classList.contains('statusBlue')) {
                                                element.classList.replace('statusBlue', 'statusRed');
                                            }
                                            break;
                                    }
                                }
                                break;
                        }
                    }
                }

                clearTimeout(gSetTimeout);
                gSetTimeout = setTimeout(function() {
                    vio.getData(0);
                }, 1536);

                break;
            default:
                this.toast({memo: '데이터가 존재하지 않습니다.'});
        }
    }
};

// 설비제어 설정창 팝업
vio.getSetting = async function(idn) {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'tech',
            cid: idn
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/tech-trees/${this._fid}?${queryString}`, {
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

            this.netAble(false);
            switch (jsonData.cat) {
                case 9:
                    this.toast({memo: '권한이 없습니다.'});
                    break;
                case 1:
                    this._sheet.idn = idn;
                    const ta = jsonData.data;
                    document.getElementById('edit-gid').value = ta.gid;
                    document.getElementById('edit-nodeIndex').value = ta.nodeIndex;
                    document.getElementById('edit-setTemp').value = ta.setTemp;
                    document.getElementById('edit-peakGain').value = ta.peakGain;
                    document.getElementById('edit-controlNo').value = ta.controlNo;
                    document.getElementById('edit-chNo').value = ta.chNo;
                    document.getElementById('edit-controlName').value = ta.controlName;
                    document.getElementById('edit-tabName').value = ta.tabName;
                    document.getElementById('modal').classList.remove('disable');
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.deskReady = function() {
    this.getData(1);

    // 설비설정 팝업
    document.getElementById('modalActClose').addEventListener('click', function() {
        document.getElementById('modal').classList.add('disable');
    });
    document.getElementById('modalActCancel').addEventListener('click', function() {
        document.getElementById('modal').classList.add('disable');
    });
    document.getElementById('modalActDone').addEventListener('click', async function() {
        //vio.deskEditFixed();
    });

    // 설비제어현황차트 팝업 닫기
    document.getElementById('modalChartActClose').addEventListener('click', function() {
        document.getElementById('modalChart').classList.add('disable');
        // 더 이상 차트 데이터를 가져오지 않게
        vio._chartIdn = 0;
    });
    // 설비제어현황차트 조회
    document.getElementById('chartAct').addEventListener('click', async function() {
        vio.popChart(vio._chartIdn);
    });
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    vio.deskReady();
});

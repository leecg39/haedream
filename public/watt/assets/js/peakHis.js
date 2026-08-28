'use strict';
vio._firm = {};
vio._chartPeak = null;
vio._peak = {};

vio.chartPeak = function () {
    am4core.useTheme(am4themes_dark);

    this._chartPeak = am4core.create('chart1', am4charts.XYChart);
    this._chartPeak.colors.list = [am4core.color('#ffff00'), am4core.color('#ffbd00'), am4core.color('#00ffff'), am4core.color('#00c9ff'), am4core.color('#ff00ff')];
    this._chartPeak.dateFormatter.inputDateFormat = 'yyyy-MM-dd';
    this._chartPeak.legend = new am4charts.Legend();
    this._chartPeak.cursor = new am4charts.XYCursor();
    this._chartPeak.exporting.menu = new am4core.ExportMenu();
    /*
    this._chartPeak.events.on('beforedatavalidated', function(ev) {
        vio._chartPeak.data.sort(function(a, b) {
            return (new Date(a.seq)) -(new Date(b.seq));
        });
    });*/

    let xAxis = this._chartPeak.xAxes.push(new am4charts.CategoryAxis());
    xAxis.dataFields.category = 'm15';
    xAxis.renderer.minGridDistance = this._inMof ? 64 : 56;
    xAxis.renderer.minLabelPosition = 0.01;

    let yAxis = this._chartPeak.yAxes.push(new am4charts.ValueAxis());
    yAxis.min = 0;
    yAxis.tooltip.disabled = true;
    //yAxis.title.text ='전력 사용량(kW)';
    yAxis.renderer.labels.template.adapter.add('text', function (text) {
        return text + ' [#a0a0a0 font-size:.86rem]kW[/]';
    });

    let series1 = this._chartPeak.series.push(new am4charts.LineSeries());
    series1.dataFields.valueY = 'pr';
    series1.dataFields.categoryX = 'm15';
    series1.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]kW[/]';
    series1.legendSettings.itemValueText = '[bold]{valueY.value}[/][#a0a0a0]kW[/]';
    series1.strokeWidth = 2;
    series1.name = '예측전력';

    let series2 = this._chartPeak.series.push(new am4charts.LineSeries());
    series2.dataFields.valueY = 'pl';
    series2.dataFields.categoryX = 'm15';
    series2.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]kW[/]';
    series2.legendSettings.itemValueText = '[bold]{valueY.value}[/][#a0a0a0]kW[/]';
    series2.strokeWidth = 2;
    series2.strokeDasharray = '3,3';
    series2.name = '목표전력';

    let series3 = this._chartPeak.series.push(new am4charts.LineSeries());
    series3.dataFields.valueY = 'np';
    series3.dataFields.categoryX = 'm15';
    series3.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]kW[/]';
    series3.legendSettings.itemValueText = '[bold]{valueY.value}[/][#a0a0a0]kW[/]';
    series3.strokeWidth = 2;
    series3.name = '현재전력';

    let series4 = this._chartPeak.series.push(new am4charts.LineSeries());
    series4.dataFields.valueY = 'op';
    series4.dataFields.categoryX = 'm15';
    series4.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]kW[/]';
    series4.legendSettings.itemValueText = '[bold]{valueY.value}[/][#a0a0a0]kW[/]';
    series4.strokeWidth = 2;
    series4.strokeDasharray = '2,3';
    series4.name = '기준전력';

    if (vio.isPointE()) {
        let series5 = this._chartPeak.series.push(new am4charts.LineSeries());
        series5.dataFields.valueY = 'moment';
        series5.dataFields.categoryX = 'm15';
        series5.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/][#444]kW[/]';
        series5.legendSettings.itemValueText = '[bold]{valueY.value}[/][#a0a0a0]kW[/]';
        series5.strokeWidth = 2;
        series5.strokeOpacity = 0.3;
        series5.zIndex = 1;
        series5.name = '순간전력';
    }

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

    bullet1.events.on('inited', function (event) {
        event.target.circle.animate(
            [
                { property: 'scale', from: .8, to: 3.2 },
                { property: 'opacity', from: .8, to: 0 }
            ],
            1000,
            am4core.ease.circleOut
        );
    });

    bullet2.events.on('inited', function (event) {
        event.target.circle.animate(
            [
                { property: 'scale', from: .8, to: 3.2 },
                { property: 'opacity', from: .8, to: 0 }
            ],
            1000,
            am4core.ease.circleOut
        );
    });
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

    // 기준전력 계산, 목표전력 표시
    let chartData = [];
    for(let quarterIndex = 0; quarterIndex < 900; quarterIndex++){
        chartData[quarterIndex] = {
            seq: quarterIndex,
            pl: powerLimit,
            op: Math.round(powerLimit * quarterIndex / 900),
            m15: `${Math.floor(quarterIndex / 60).toString().padStart(2, '0')}:${(quarterIndex % 60).toString().padStart(2, '0')}`
        };
    }
    chartData[900] = { seq: 900, m15: '15분' };
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
    this.peakChartReset(peakdata.powerLimit);

    for(let quarterIndex = 0, dataLen = peakdata.data.length; quarterIndex < dataLen; quarterIndex++){
        const currentPower = peakdata.currentPower[quarterIndex];
        this._chartPeak.data[quarterIndex].pr = peakdata.data[quarterIndex];
        this._chartPeak.data[quarterIndex].np = peakdata.currentPower[quarterIndex];

        // 순간전력 표시
        if(!this.isPointE() || quarterIndex == 0){
            continue;
        }
        const power = currentPower - peakdata.currentPower[quarterIndex - 1];
        if(power <= 0){
            continue;
        }
        this._chartPeak.data[quarterIndex].moment = power * 900;
    }
    this._chartPeak.invalidateRawData();
};

vio.getData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {  // 필요한 query params를 {} 형태에 담아준다.
            sDate: document.getElementById('sDate').value,
            sTime: document.getElementById('sTime').value
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/peak-his/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            this.netAble(false);

            const jsonData = await res.json();

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this.dataTrans(jsonData.peakPower);
            }
        }
    }
};

// 순간전력 표시 체크
vio.isPointE = function() {
    return ['97', '105', '141'].includes(this._fid);
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const today = new Date();

    new tui.DatePicker('#wrapper', {
        date: today,
        input: {
            element: '#sDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    await vio.getData();

    document.getElementById('act').addEventListener('click', function() {
        vio.getData();
    });
});
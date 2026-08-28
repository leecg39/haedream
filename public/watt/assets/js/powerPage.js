'use strict';
// 이산화 탄소 배출계수 0.0004594 tCO2eq
vio._setToCO2 = 0.4594; // kgCO2eq

vio._chart15m = [];
vio._chart60m = [];

vio._dataDaily = [];
vio._dataMonthly = [];
vio._dataYearly = [];
vio._dataWeekly = [];

vio._chartYearly = [];

vio._powerChart = null;
vio._powerChartDaily = null;
vio._powerChartMonthly = null;
vio._powerChartWeekly = null;
vio._powerChartYearly = null;

vio._chartPowerGuide = null;

vio._lpValue = '';
vio._inputDate = '';

vio.chartPowerGuide = function(dateTimesLoad) {
    am4core.useTheme(am4themes_dark);

    if (this._chartPowerGuide != null) {
        this._chartPowerGuide.dispose();
        this._chartPowerGuide = null;
    }

    this._chartPowerGuide = am4core.create('chart1', am4charts.GaugeChart);
    this._chartPowerGuide.hiddenState.properties.opacity = 0;
    this._chartPowerGuide.innerRadius = -40;

    let axis = this._chartPowerGuide.xAxes.push(new am4charts.ValueAxis());
    axis.min = 0;
    axis.max = 24;
    axis.strictMinMax = true;
    axis.renderer.labels.template.fill = am4core.color('#ffffff');

    let rangeMin = axis.axisRanges.create();
    rangeMin.value = axis.min;
    rangeMin.label.text = '' + axis.min;

    let rangeMax = axis.axisRanges.create();
    rangeMax.value = axis.max;
    rangeMax.label.text = '' + axis.max;

    const nowDate = new Date(document.getElementById('inputDate').value),
        thisMonth = nowDate.getMonth() + 1;

    let hand = this._chartPowerGuide.hands.push(new am4charts.ClockHand());
    hand.radius = am4core.percent(85);
    hand.showValue(new Date().getHours(), 24, am4core.ease.cubicOut);
    hand.fill = am4core.color('#eeeeee');
    hand.stroke = am4core.color('#eeeeee');

    //let colorSet =new am4core.ColorSet();

    const createRange = function(start, end, color) {
        let range = axis.axisRanges.create();
        range.value = start;
        range.endValue = end;
        range.axisFill.fillOpacity = 1;
        range.axisFill.fill = am4core.color(color);
        range.axisFill.zIndex = -1;
    };

    // 경부하 9cc952 중간부하 e4ce66 최대부하 d84420
    dateTimesLoad.forEach((loadType, times) => {
        createRange(times, times + 1, ['#9cc952','#e4ce66','#d84420'][loadType]);
    });
};

vio.chartPowerTime = function (j) {
    if (this._powerChart) {
        this._powerChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart2', am4charts.XYChart);
    chart.colors.list = [am4core.color('#57c5f6'), am4core.color('#f44336'), am4core.color('#a857f6'), am4core.color('#8bc34a')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'top';
    chart.legend.paddingBottom = 20;

    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
    xAxis.dataFields.category = 'seq';
    xAxis.dataFields.date = 'time';
    xAxis.dateFormatter.dateFormat = 'HH:mm';
    xAxis.renderer.minGridDistance = 50;
    xAxis.renderer.grid.template.location = 0;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = this._language == 'ko' ? '최대수요(kW)' : 'MAXIMUM\nDEMAND';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -50;

    const yAxis2 = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis2.tooltip.disabled = true;
    yAxis2.min = 0;
    yAxis2.title.text = this._language == 'ko' ? '온도(℃)' : 'TEMPERATURE';
    yAxis2.title.dy = -40;
    yAxis2.renderer.opposite = true;

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = 'today';
    series.dataFields.categoryX = 'seq';
    series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
    series.name = this._language == 'ko' ? '금일' : 'TODAY';
    series.fillOpacity = 0.8;
    series.tooltip.pointerOrientation = 'vertical';

    const series2 = chart.series.push(new am4charts.LineSeries());
    series2.dataFields.valueY = 'temp';
    series2.dataFields.categoryX = 'seq';
    series2.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]℃[/]';
    series2.name = this._language == 'ko' ? '온도' : 'TEMPERATURE';
    series2.tooltip.pointerOrientation = 'vertical';
    series2.yAxis = yAxis2;

    const bullet = series2.bullets.push(new am4charts.CircleBullet());
    bullet.circle.strokeWidth = 2;
    bullet.circle.radius = 3;
    bullet.circle.fill = am4core.color('#fff');

    const bullethover = bullet.states.create('hover');
    bullethover.properties.scale = 1.6;

    function createSeries(name, valueY) {
        const series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.categoryX = 'seq';
        series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
        series.name = name;
        series.tooltip.pointerOrientation = 'vertical';

        const bullet = series.bullets.push(new am4charts.CircleBullet());
        bullet.circle.strokeWidth = 2;
        bullet.circle.radius = 3;
        bullet.circle.fill = am4core.color('#fff');

        const bullethover = bullet.states.create('hover');
        bullethover.properties.scale = 1.6;
    }
    createSeries(this._language == 'ko' ? '전일' : 'YESTERDAY', 'lDay');
    createSeries(this._language == 'ko' ? '전주' : 'LAST WEEK', 'lWeek');

    //chart.data =[{seq:'01:00',lWeek:352,lDay:651,today:723},{seq:'01:15',lWeek:352,lDay:646,today:877},{seq:'01:30',lWeek:352,lDay:645,today:923}}];
    chart.data = j;

    this._powerChart = chart;
};

vio.chartPowerDaily = function (data) {
    if (this._powerChartDaily) {
        this._powerChartDaily.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart3', am4charts.XYChart);
    chart.colors.list = [am4core.color('#57c5f6'), am4core.color('#a857f6'), am4core.color('#8bc34a')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'top';
    chart.legend.paddingBottom = 20;

    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
    xAxis.dataFields.category = 'seq';
    xAxis.renderer.minGridDistance = 1;
    xAxis.renderer.grid.template.location = 0;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = this._language == 'ko' ? '최대수요(kW)' : 'MAXIMUM\nDEMAND';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -40;

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = 'wattMax';
    series.dataFields.categoryX = 'seq';
    series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
    series.name = '당월';
    series.fillOpacity = 0.8;
    series.tooltip.pointerOrientation = 'vertical';

    function createSeries(name, valueY) {
        const series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.categoryX = 'seq';
        series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
        series.name = name;
        series.tooltip.pointerOrientation = 'vertical';

        const bullet = series.bullets.push(new am4charts.CircleBullet());
        bullet.circle.strokeWidth = 2;
        bullet.circle.radius = 3;
        bullet.circle.fill = am4core.color('#fff');

        const bullethover = bullet.states.create('hover');
        bullethover.properties.scale = 1.6;
    }
    createSeries('전월', 'lMonth');
    createSeries('전년', 'lYear');

    chart.data = data;

    this._powerChartDaily = chart;
};

vio.chartPowerMonthly = function (data) {
    if (this._powerChartMonthly) {
        this._powerChartMonthly.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart4', am4charts.XYChart);
    chart.colors.list = [am4core.color('#57c5f6'), am4core.color('#8bc34a')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'top';
    chart.legend.paddingBottom = 20;

    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
    xAxis.dataFields.category = 'seq';
    xAxis.renderer.minGridDistance = 50;
    xAxis.renderer.grid.template.location = 0;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = this._language == 'ko' ? '최대수요(kW)' : 'MAXIMUM\nDEMAND';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -40;

    const yAxis2 = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis2.tooltip.disabled = true;
    yAxis2.min = 0;
    yAxis2.title.dy = -40;
    yAxis2.renderer.opposite = true;

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = 'wattMax';
    series.dataFields.categoryX = 'seq';
    series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
    series.name = '올해';
    series.fillOpacity = 0.8;
    series.tooltip.pointerOrientation = 'vertical';

    function createSeries(name, valueY) {
        const series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.categoryX = 'seq';
        series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
        series.name = name;
        series.tooltip.pointerOrientation = 'vertical';

        const bullet = series.bullets.push(new am4charts.CircleBullet());
        bullet.circle.strokeWidth = 2;
        bullet.circle.radius = 3;
        bullet.circle.fill = am4core.color('#fff');

        const bullethover = bullet.states.create('hover');
        bullethover.properties.scale = 1.6;
    }
    createSeries('전년', 'lYear');

    chart.data = data;

    this._powerChartMonthly = chart;
};

vio.chartPowerYearly = function (j) {
    if (this._powerChartYearly) {
        this._powerChartYearly.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart5', am4charts.XYChart);
    chart.colors.list = [am4core.color('#57c5f6')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'top';
    chart.legend.paddingBottom = 20;

    chart.cursor = new am4charts.XYCursor();

    const yAxis = chart.yAxes.push(new am4charts.CategoryAxis());
    yAxis.renderer.inversed = true;
    yAxis.tooltip.disabled = true;
    yAxis.dataFields.category = "seq";
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = '연도';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -40;

    const xAxis = chart.xAxes.push(new am4charts.ValueAxis());
    xAxis.tooltip.disabled = true;
    xAxis.min = 0;
    // xAxis.renderer.minGridDistance =50;
    xAxis.renderer.minLabelPosition = 0;
    xAxis.renderer.maxLabelPosition = 0.99;

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.categoryY = "seq";
    series.dataFields.valueX = "watt";
    series.name = "사용량(kWh)";
    series.tooltipText = '[#fff]{valueX.value}[/][#d0d0d0]kWh[/]';
    series.tooltip.pointerOrientation = 'vertical';

    chart.data = j;

    this._powerChartYearly = chart;
};

vio.chartPowerWeekly = function (j) {
    if (this._powerChartWeekly) {
        this._powerChartWeekly.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart6', am4charts.XYChart);
    chart.colors.list = [am4core.color('#7CB5EC'), am4core.color('#c5c5c5'), am4core.color('#90ED7D'), am4core.color('#F7A35C'), am4core.color('#9DA5EE'), am4core.color('#F15C80'), am4core.color('#E4D354')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'top';
    chart.legend.paddingBottom = 20;

    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
    xAxis.dataFields.category = 'seq';
    xAxis.renderer.minGridDistance = 1;
    xAxis.renderer.grid.template.location = 0;
    xAxis.tooltip.disabled = true;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = this._language == 'ko' ? '최대수요(kW)' : 'MAXIMUM\nDEMAND';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -40;

    function createSeries(name, valueY) {
        const series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.categoryX = 'seq';
        series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
        series.name = name;
        series.tooltip.pointerOrientation = 'vertical';

        const bullet = series.bullets.push(new am4charts.CircleBullet());
        bullet.circle.strokeWidth = 2;
        bullet.circle.radius = 3;
        bullet.circle.fill = am4core.color('#fff');

        const bullethover = bullet.states.create('hover');
        bullethover.properties.scale = 1.6;
    }
    createSeries('일요일', 'sun');
    createSeries('월요일', 'mon');
    createSeries('화요일', 'tue');
    createSeries('수요일', 'wed');
    createSeries('목요일', 'thu');
    createSeries('금요일', 'fri');
    createSeries('토요일', 'sat');

    chart.data = j;

    this._powerChartWeekly = chart;
};

// 시간대별 그래프용 최대수요 데이터
vio.dataTransChart = function (jsonData) {
    const thisTime = Date.parse(`${document.getElementById('inputDate').value} 00:00:00`) / 1000;
    
    for (let ia = 0; ia < 96; ++ia) {
        const timeUnit = `${Math.floor(ia / 4).toString().padStart(2, '0')}:${(ia % 4 * 15).toString().padStart(2, '0')}`, // 00:00 ~ 23:45
            time15m = thisTime + 900 * ia;

        // 15분 그래프 데이터
        this._chart15m[ia] = {
            seq: timeUnit,
            lWeek: jsonData.dataLastWeek.hasOwnProperty(time15m - 86400 * 7) ? jsonData.dataLastWeek[time15m - 86400 * 7].wattMax : 0, // 지난주 최대수요
            lDay: jsonData.dataLastDay.hasOwnProperty(time15m - 86400) ? jsonData.dataLastDay[time15m - 86400].wattMax : 0,  // 전일 최대수요
            today: jsonData.data.hasOwnProperty(time15m) ? jsonData.data[time15m].wattMax : 0, // 금일 최대수요
            temp: jsonData.dataTemp[time15m] ?? 0   // 금일 온도
        };
    }

    // 60분 그래프 최대수요
    for (let ia = 0; ia < 24; ++ia) {
        const timeUnit = `${ia.toString().padStart(2, '0')}:00`; // 00:00 ~ 23:00

        let today = 0,
            lDay = 0,
            lWeek = 0,
            temp = 0;

        for (let ib = 0; ib < 4; ++ib) {
            const kw15m = this._chart15m[ia * 4 + ib];

            if (kw15m.today > today) {
                today = kw15m.today;
            }
            if (kw15m.lDay > lDay) {
                lDay = kw15m.lDay;
            }
            if (kw15m.lWeek > lWeek) {
                lWeek = kw15m.lWeek;
            }
            if (kw15m.temp > temp) {
                temp = kw15m.temp;
            }
        }

        this._chart60m[ia] = { seq: timeUnit, lWeek: lWeek, lDay: lDay, today: today, temp: temp };
    }
};


vio.dataTransChartYearly = function(data) {
    const lpListYearly = document.getElementById('lpListYearly').value;

    let calc = 1;
    if (lpListYearly === 'All') {
        calc = 0.001;
    }

    this._chartYearly = [];

    for (let i = 0; i < data.length; ++i) {
        const item = data[i];

        let watt = item ? Math.round(item.watt * calc * 100) / 100 : '';

        this._chartYearly.push({seq: this.echoDate('y', item.ctime), watt: watt});
    }
};

vio.changeChart = function(j) {
    if (vio._inputDate === document.getElementById('inputDate').value) {
        if (j == 15) {
            this.chartPowerTime(this._chart15m);
        } else {
            this.chartPowerTime(this._chart60m);
        }
    } else {
        this.getData();
    }
}

// 부하별 정보
vio.dataCharges = function (j) {
    let dom = document,
        dt = dom.getElementById('itemCharges').children;

    dt[0].children[2].textContent = this.echoNumber(j.priceL) + ' 원';
    dt[1].children[2].textContent = this.echoNumber(j.priceM) + ' 원';
    dt[2].children[2].textContent = this.echoNumber(j.priceH) + ' 원';
    dt[3].children[2].textContent = this.echoNumber(j.priceL + j.priceM + j.priceH) + ' 원';

    dom.getElementById('tPowerHigh').textContent = this.echoNumber(j.powerH.toFixed(1));
    dom.getElementById('tPowerMiddle').textContent = this.echoNumber(j.powerM.toFixed(1));
    dom.getElementById('tPowerLow').textContent = this.echoNumber(j.powerL.toFixed(1));

    // 총 사용량
    dom.getElementById('tPower').textContent = this.echoNumber(j.power);
    dom.getElementById('tCO2').textContent = this.echoNumber((j.power * this._setToCO2).toFixed(2));
    dom.getElementById('tTOE').textContent = (j.power * 0.000229).toFixed(3);
}


/*
전력량
15분 데이터 정보
1시간 데이터 정보

dataQuarter : 15분 데이터 목록
dataHours : 1시간 데이터 목록
dataTemp : 15분 온도 목록
*/
vio.dataHoursTrans = function(dataQuarter, dataHours, dataTemp){
    const dom = document,
        tableItem = [
            dom.getElementById('itemList1').children, // 00 ~ 11 시 정보
            dom.getElementById('itemList2').children, // 12 ~ 23 시 정보
            dom.getElementById('itemList3').children, // 00 ~ 11 시 정보
            dom.getElementById('itemList4').children  // 00 ~ 11 시 정보
        ],
        thisTime = Date.parse(`${dom.getElementById('inputDate').value} 00:00:00`) / 1000;

    let wattMax = 0, // 하루 최대수요
        reactive = 0; // 하루 무효전력량

    // 15분 데이터
    for(let ia = 0; ia < 96; ++ia){
        const time15m = thisTime + 900 * ia,
            dt = tableItem[ia < 48 ? 2 : 3][ia % 48].children; // table > tr > td 목록

        if(dataQuarter.hasOwnProperty(time15m)){
            dt[1].textContent = dataQuarter[time15m].watt;
            dt[2].textContent = dataQuarter[time15m].wattMax;
            dt[3].textContent = dataTemp[time15m] ?? 0;
            dt[4].textContent = dataQuarter[time15m].reactive;
            dt[5].textContent = 0;
            dt[6].textContent = (dataQuarter[time15m].watt * this._setToCO2).toLocaleString('ko-KR', {maximumFractionDigits:2});
            dt[7].textContent = dataQuarter[time15m].factor;
            dt[8].textContent = 100;

            // 시간단위때 사용할 온도
            const time60m = thisTime + Math.floor(ia / 4) * 3600;
            if(dataHours.hasOwnProperty(time60m)){
                dataHours[time60m].temp += dataTemp[time15m] ?? 0;
            }
        }else{
            dt[1].textContent = '-';
            dt[2].textContent = '-';
            dt[3].textContent = '-';
            dt[4].textContent = '-';
            dt[5].textContent = '-';
            dt[6].textContent = '-';
            dt[7].textContent = '-';
            dt[8].textContent = '-';
        }
    }

    // 시간별 데이터
    for(let ia = 0; ia < 24; ++ia){
        const time60m = thisTime + 3600 * ia,
            dt = tableItem[ia < 12 ? 0 : 1][ia % 12].children; // table > tr > td 목록

        if(dataHours.hasOwnProperty(time60m)){
            dt[1].textContent = (dataHours[time60m].watt * 0.001).toLocaleString('ko-KR', {maximumFractionDigits:2});
            dt[2].textContent = (dataHours[time60m].wattMax * 0.004).toLocaleString('ko-KR', {maximumFractionDigits:2});
            dt[3].textContent = (dataHours[time60m].temp / 4).toFixed(1);
            dt[4].textContent = (dataHours[time60m].reactive * 0.001).toLocaleString('ko-KR', {maximumFractionDigits:2});
            dt[5].textContent = 0;
            dt[6].textContent = (dataHours[time60m].watt * 0.001 * this._setToCO2).toLocaleString('ko-KR', {maximumFractionDigits:2});
            dt[7].textContent = (dataHours[time60m].factor * 0.01).toFixed(2);
            dt[8].textContent = 100;

            if(dataHours[time60m].wattMax > wattMax){
                wattMax = dataHours[time60m].wattMax;
            }
            reactive += Number(dataHours[time60m].reactive);
        }else{
            dt[1].textContent = '-';
            dt[2].textContent = '-';
            dt[3].textContent = '-';
            dt[4].textContent = '-';
            dt[5].textContent = '-';
            dt[6].textContent = '-';
            dt[7].textContent = '-';
            dt[8].textContent = '-';
        }
    }

    dom.getElementById('maxPower').textContent = (wattMax * 0.004).toLocaleString('ko-KR', {maximumFractionDigits:2});
    dom.getElementById('tNot').textContent = (reactive * 0.001).toLocaleString('ko-KR', {maximumFractionDigits:2});
};

vio.dataTransDaily = function (data, dataLastMonth, dataLastYear) {
    const dom = document,
        tableItem = [
            dom.getElementById('itemList5').children,
            dom.getElementById('itemList6').children];

    let [year, month] = document.getElementById('inputDailyDate').value.split('-'),
        lastDayOfMonth = new Date(year, month, 0),
        length = lastDayOfMonth.getDate();

    let maxPower = 0,
        minPower = 0,
        avgPower = 0,
        sumPower = 0,
        sumWattMax = 0;

    this._dataDaily = Array.from({ length: length }, (_, seq) => ({ seq: seq + 1, today: '', lMonth: '', lYear: '', temp: '' }));

    // 데이터 생성(당월)
    for (let i = 0; i < data.length; ++i) {
        const item = data[i];

        let watt = item ? Math.round(item.watt / 1000 * 100) / 100 : '';
        let wattMax = item ? Math.round(item.wattMax / 1000 * 4  * 100) / 100 : '';
        let index = item ? Number(this.echoDate('d', item.ctime)) - 1 : i;

        this._dataDaily[index]['today'] = watt;
        this._dataDaily[index]['wattMax'] = wattMax;
    }
    // 데이터 생성(전월)
    for (let i = 0; i < dataLastMonth.length; ++i) {
        const lastMonthItem = dataLastMonth[i];

        let lastMonthWattMax = lastMonthItem ? Math.round(lastMonthItem.wattMax / 1000 * 4 * 100) / 100 : '';
        let index = lastMonthWattMax ? Number(this.echoDate('d', lastMonthItem.ctime)) - 1 : i;

        if (this._dataDaily[index]) {
            this._dataDaily[index]['lMonth'] = lastMonthWattMax;
        }
    }
    // 데이터 생성(전년)
    for (let i = 0; i < dataLastYear.length; ++i) {
        const lastYearItem = dataLastYear[i];

        let lastYearWattMax = lastYearItem ? Math.round(lastYearItem.wattMax / 1000 * 4 * 100) / 100 : '';
        let index = lastYearWattMax ? Number(this.echoDate('d', lastYearItem.ctime)) - 1 : i;

        if (this._dataDaily[index]) {
            this._dataDaily[index]['lYear'] = lastYearWattMax;
        }
    }

    // 데이터 출력
    for (let i = 0; i < 32; ++i) {
        const item = this._dataDaily[i];

        let tableIndex = i < 16 ? 0 : 1;
        let dt = tableItem[tableIndex][i % 16].children;

        if (this._dataDaily[i]) {
            let day = i + 1;
            let dayWatt = item.today ? item.today : '';
            let wattMax = item.wattMax ? item.wattMax : '';
            let lastMonthWatt = item.lMonth ? item.lMonth : '';
            let lastYearWatt = item.lYear ? item.lYear : '';

            dt[0].textContent = `${month}월 ${day < 10 ? '0' + day : day.toString()}일`;
            dt[1].textContent = dayWatt ? this.echoNumber(dayWatt) : '-';
            dt[2].textContent = wattMax ? this.echoNumber(wattMax) : '-';
            dt[3].textContent = lastMonthWatt ? this.echoNumber(lastMonthWatt) : '-';
            dt[4].textContent = lastYearWatt ? this.echoNumber(lastYearWatt) : '-';

            if (item.today) {
                sumPower += Number(item.today);
                if (wattMax > maxPower) {
                    maxPower = wattMax;
                }
                if (minPower === 0) {
                    minPower = wattMax;
                } else if (wattMax < minPower) {
                    minPower = wattMax;
                }
                sumWattMax += Number(wattMax);
            }
        } else {
            dt[0].textContent = '-';
            dt[1].textContent = '-';
            dt[2].textContent = '-';
            dt[3].textContent = '-';
            dt[4].textContent = '-';
        }
    }

    if (sumPower && data.length) {
        sumPower = Math.round(sumPower * 100) / 100;
        avgPower = Math.round(sumWattMax / data.length * 100) / 100;
    }

    dom.getElementById('dailyMax').textContent = this.echoNumber(maxPower);
    dom.getElementById('dailyMin').textContent = this.echoNumber(minPower);
    dom.getElementById('dailyAvg').textContent = this.echoNumber(avgPower);
    dom.getElementById('dailySum').textContent = this.echoNumber(sumPower);

};

vio.dataTransMonthly = function (data, dataLastYear) {
    const dom = document,
        lpListMonthly = dom.getElementById('lpListMonthly').value,
        tableItem = [
            dom.getElementById('itemList7').children,
            dom.getElementById('itemList8').children];

    let maxPower = 0,
        minPower = 0,
        avgPower = 0,
        sumPower = 0,
        sumWattMax = 0;

    let calc = 1;
    if (lpListMonthly === 'All') {
        calc = 0.001;
    }

    this._dataMonthly = Array.from({ length: 12 }, (_, seq) => ({ seq: seq + 1, today: '', lYear: '', temp: '' }));

    // 데이터 생성(당해)
    for (let i = 0; i < data.length; ++i) {
        const item = data[i];

        let watt = item ? Math.round(item.watt * calc * 100) / 100 : '';
        let wattMax = item ? Math.round(item.wattMax / 1000 * 4 * 100) / 100 : '';
        let index = item ? Number(this.echoDate('m', item.ctime)) - 1 : i;

        this._dataMonthly[index]['today'] = watt;
        this._dataMonthly[index]['wattMax'] = wattMax;
    }
    // 데이터 생성(전년동월)
    for (let i = 0; i < dataLastYear.length; ++i) {
        const lastYearItem = dataLastYear[i];

        let lastYearWattMax = lastYearItem ? Math.round(lastYearItem.wattMax / 1000 * 4 * 100) / 100 : '';
        let index = lastYearItem ? Number(this.echoDate('m', lastYearItem.ctime)) - 1 : i;

        this._dataMonthly[index]['lYear'] = lastYearWattMax;
    }

    // 데이터 출력
    for (let i = 0; i < this._dataMonthly.length; ++i) {
        const item = this._dataMonthly[i];

        let watt = item.today;

        let tableIndex = i < 6 ? 0 : 1;
        const dt = tableItem[tableIndex][i % 6].children;

        dt[1].textContent = item.today ? this.echoNumber(item.today) : '-';
        dt[2].textContent = item.wattMax ? this.echoNumber(item.wattMax) : '-';
        dt[3].textContent = item.lYear ? this.echoNumber(item.lYear) : '-';

        if (watt) {
            sumPower += Number(watt);
            if (item.wattMax > maxPower) {
                maxPower = item.wattMax;
            }
            if (minPower === 0) {
                minPower = item.wattMax;
            } else if (item.wattMax < minPower) {
                minPower = item.wattMax;
            }

            sumWattMax += Number(item.wattMax);
        }
    }

    if (sumPower && data.length) {
        sumPower = Math.round(sumPower * 100) / 100;
        avgPower = Math.round(sumWattMax / data.length * 100) / 100;
    }

    dom.getElementById('monthlyMax').textContent = this.echoNumber(maxPower);
    dom.getElementById('monthlyMin').textContent = this.echoNumber(minPower);
    dom.getElementById('monthlyAvg').textContent = this.echoNumber(avgPower);
    dom.getElementById('monthlySum').textContent = this.echoNumber(sumPower);

};

vio.dataTransYearly = function (data) {
    const dom = document,
        lpListYearly = dom.getElementById('lpListYearly').value,
        tableItem = dom.getElementById('itemList9').children;

    let maxPower = 0,
        minPower = 0,
        avgPower = 0,
        sumPower = 0;

    let calc = 1;
    if (lpListYearly === 'All') {
        calc = 0.001;
    }

    for (let i = 0; i < data.length; ++i) {
        const item = data[i];

        let dt = tableItem[i].children;

        let watt = Math.round(item.watt * calc * 100) / 100;
        let wattMax = Math.round(item.wattMax / 1000 * 4 * 100) / 100; // wh -> kw
        let reactive = Math.round(item.reactive * calc * 100) / 100;
        let factor = item.factor;

        dt[0].textContent = this.echoDate('y', item.ctime);
        dt[1].textContent = this.echoNumber(watt);
        dt[2].textContent = this.echoNumber(wattMax);
        dt[3].textContent = this.echoNumber(reactive);
        dt[4].textContent = this.echoNumber(factor);
        dt[5].textContent = this.echoNumber((watt * 0.001 * this._setToCO2).toFixed(2));

        sumPower += Number(watt);
        if (watt > maxPower) {
            maxPower = watt;
        }
        if (Number.isInteger(watt)) {
            if (minPower === 0) {
                minPower = watt;
            } else if (watt < minPower) {
                minPower = watt;
            }
        }
    }

    if (sumPower && data.length) {
        sumPower = Math.round(sumPower * 100) / 100;
        avgPower = Math.round(sumPower / data.length * 100) / 100;
    }

    dom.getElementById('yearlyMax').textContent = this.echoNumber(maxPower);
    dom.getElementById('yearlyMin').textContent = this.echoNumber(minPower);
    dom.getElementById('yearlyAvg').textContent = this.echoNumber(avgPower.toFixed(2));
    dom.getElementById('yearlySum').textContent = this.echoNumber(sumPower);

};

vio.dataTransWeekly = function (data) {
    const dom = document,
        tableItem = dom.getElementById('itemList10').children,
        weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    this._dataWeekly = Array.from({ length: 24 }, (_, seq) => ({ seq, sun: '', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '' }));

    for (let i = 0; i < 168; ++i) {
        const item = data[i];
        if (item) {
            const wattMax = Math.round(item.wattMax / 1000 * 4 * 100) / 100;
            const date = new Date(item.ctime * 1000);
            const day = date.getDay();
            const hours = date.getHours();

            this._dataWeekly[hours][weekday[day]] = wattMax;
        }
    }

    for (let i = 0; i < this._dataWeekly.length; ++i) {
        const item = this._dataWeekly[i];
        const dt = tableItem[i].children;

        dt[1].textContent = item['sun'] ? item['sun'] : '-';
        dt[2].textContent = item['mon'] ? item['mon'] : '-';
        dt[3].textContent = item['tue'] ? item['tue'] : '-';
        dt[4].textContent = item['wed'] ? item['wed'] : '-';
        dt[5].textContent = item['thu'] ? item['thu'] : '-';
        dt[6].textContent = item['fri'] ? item['fri'] : '-';
        dt[7].textContent = item['sat'] ? item['sat'] : '-';
    }
};

vio.getData = async function() {
    vio._inputDate = document.getElementById('inputDate').value;

    if (!this._useNetworks) {
        this.netAble(true);

        const lpList = document.getElementById('lpList');
        const lpListDaily = document.getElementById('lpListDaily');
        const lpListMonthly = document.getElementById('lpListMonthly');
        const lpListYearly = document.getElementById('lpListYearly');
        const lpListWeekly = document.getElementById('lpListWeekly');

        const params = {
            cf: 'get',
            pid: lpList.value,
            date: vio._inputDate
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/watt-usages/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                if (lpList.value == 0) {
                    let out = '';
                    for (let ia = 0, th = jsonData.lpList.length; ia < th; ++ia) {
                        const ta = jsonData.lpList[ia];
                        out += `<option value="${ta.pid}">${this.catToXLSX(ta.lp_name)}</option>`;
                    }
                    lpList.innerHTML = out;
                    lpListDaily.innerHTML = out;
                    lpListMonthly.innerHTML = out;
                    lpListYearly.innerHTML = out;
                    lpListWeekly.innerHTML = out;
                }
                this._lpValue = lpList.value;
                // 데이터 출력
                this.dataHoursTrans(jsonData.data, jsonData.dataHours, jsonData.dataTemp);
                // 사용량 그래프 데이터 생성
                this.dataTransChart(jsonData);
                // 사용량 그래프
                this.changeChart(document.getElementById('timeType1').checked ? 15 : 60);
                // 일일 설비별 사용요금
                this.dataCharges(jsonData.charges);
                // 부하 그래프
                this.chartPowerGuide(jsonData.dateTimesLoad);
            }
        }
    }
};

vio.getDailyData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const lpListDaily = document.getElementById('lpListDaily');

        const params = {
            cf: 'daily',
            pid: lpListDaily.value,
            date: document.getElementById('inputDailyDate').value
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/watt-usages/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this._lpValue = lpListDaily.value;
                // 데이터 출력
                this.dataTransDaily(jsonData.data, jsonData.dataLastMonth, jsonData.dataLastYear);
                // 사용량 그래프
                this.chartPowerDaily(this._dataDaily);
            }
        }
    }
};

vio.getMonthlyData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const lpListMonthly = document.getElementById('lpListMonthly');

        const params = {
            cf: 'monthly',
            pid: lpListMonthly.value,
            date: document.getElementById('selectMonthlyDate').value
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/watt-usages/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this._lpValue = lpListMonthly.value;
                // 데이터 출력
                this.dataTransMonthly(jsonData.data, jsonData.dataLastYear);
                // 사용량 그래프
                this.chartPowerMonthly(this._dataMonthly);
            }
        }
    }
};

vio.getYearlyData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const lpListYearly = document.getElementById('lpListYearly');

        const params = {
            cf: 'yearly',
            pid: lpListYearly.value,
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/watt-usages/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            jsonData.data.sort(function(a, b) {
                return a.ctime - b.ctime;
            });

            this.netAble(false);

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this._lpValue = lpListYearly.value;
                // 데이터 출력
                this.dataTransYearly(jsonData.data);
                // 사용량 그래프 데이터 생성
                this.dataTransChartYearly(jsonData.data);
                // 사용량 그래프
                this.chartPowerYearly(this._chartYearly);
            }
        }
    }
};

vio.getWeeklyData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const lpListWeekly = document.getElementById('lpListWeekly');

        const params = {
            cf: 'weekly',
            pid: lpListWeekly.value,
            date: document.getElementById('inputWeeklyDate').value
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/watt-usages/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this._lpValue = lpListWeekly.value;
                // 데이터 출력
                this.dataTransWeekly(jsonData.data);
                // 사용량 그래프
                this.chartPowerWeekly(this._dataWeekly);
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    
    const nowDate = new Date(),
        dom = document,
        selectMonthlyDate = dom.getElementById('selectMonthlyDate'),
        seasonTime = dom.getElementById('seasonTime');

    // 날짜 설정
    new tui.DatePicker('#wrapper', {
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
    new tui.DatePicker('#dailyWrapper', {
        date: nowDate,
        type: 'month',
        input: {
            element: '#inputDailyDate',
            format: 'yyyy-MM'
        },
        selectableRanges: [
            [new Date('2021-12-01'), nowDate] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });
    new tui.DatePicker('#weeklyWrapper', {
        date: nowDate,
        type: 'month',
        input: {
            element: '#inputWeeklyDate',
            format: 'yyyy-MM'
        },
        selectableRanges: [
            [new Date('2021-12-01'), nowDate] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });


    let out = `<option value="${nowDate.getFullYear()}">${nowDate.getFullYear()}</option>
    <option value="${nowDate.getFullYear() - 1}">${nowDate.getFullYear() - 1}</option>
    <option value="${nowDate.getFullYear() - 2}">${nowDate.getFullYear() - 2}</option>`;
    selectMonthlyDate.innerHTML = out;

    seasonTime.textContent = nowDate.toLocaleTimeString('sv-SE');
    seasonTime.nextElementSibling.textContent = `${nowDate.toLocaleDateString('ko-KR')} (${['일', '월', '화', '수', '목', '금', '토'][nowDate.getDay()]})`;
    setInterval(function() {
        document.getElementById('seasonTime').textContent = new Date().toLocaleTimeString('sv-SE');
    }, 1000);

    dom.getElementById('dataType').addEventListener('change', function() {
        const dataCharges = dom.getElementById('dataCharges');
        // 모든 'deskContent' 클래스를 가진 요소를 선택
        let elementsWithDataClass = document.getElementsByClassName('deskContent');
        // 선택된 요소들(deskContent)에서 'active' 클래스를 제거
        for (let i = 0; i < elementsWithDataClass.length; i++) {
            const elementId = elementsWithDataClass[i].getAttribute('id');

            elementsWithDataClass[i].classList.add('disable');
            dom.getElementById(`${elementId}DeskTool`).classList.add('disable');
        }
        dom.getElementById(this.value).classList.remove('disable');
        dom.getElementById(`${this.value}DeskTool`).classList.remove('disable');
        dataCharges.classList.add('disable');

        switch (this.value) {
            case 'hourly':
                dataCharges.classList.remove('disable');
                syncLpValue(dom.getElementById('lpList'));

                vio.getData();
                break;
            case 'daily':
                dataCharges.classList.add('disable');
                syncLpValue(dom.getElementById('lpListDaily'));

                vio.getDailyData();
                break;
            case 'monthly':
                dataCharges.classList.add('disable');
                syncLpValue(dom.getElementById('lpListMonthly'));

                vio.getMonthlyData();
                break;
            case 'yearly':
                dataCharges.classList.add('disable');
                syncLpValue(dom.getElementById('lpListYearly'));

                vio.getYearlyData();
                break;
            case 'weekly':
                dataCharges.classList.add('disable');
                syncLpValue(dom.getElementById('lpListWeekly'));

                vio.getWeeklyData();
                break;
        }

        function syncLpValue(select) {
            for (let i = 0; i < select.options.length; ++i) {
                let option = select.options[i];

                if (option.value === vio._lpValue) {
                    option.selected = true;
                    break;
                }
            }
        }
    });

    dom.getElementById('inputDailyDate').addEventListener('change', function() {
        dom.getElementById('inputWeeklyDate').value = this.value;
    });

    dom.getElementById('inputWeeklyDate').addEventListener('change', function() {
        dom.getElementById('inputDailyDate').value = this.value;
    });

    dom.getElementById('act').addEventListener('click', function() {
        vio.getData();
    });

    dom.getElementById('actDaily').addEventListener('click', function() {
        vio.getDailyData();
    });

    dom.getElementById('actMonthly').addEventListener('click', function() {
        vio.getMonthlyData();
    });

    dom.getElementById('actYearly').addEventListener('click', function() {
        vio.getYearlyData();
    });

    dom.getElementById('actWeekly').addEventListener('click', function() {
        vio.getWeeklyData();
    });

    dom.getElementById('timeType1').addEventListener('click', function() {
        vio.changeChart(this.value);
    });
    dom.getElementById('timeType2').addEventListener('click', function() {
        vio.changeChart(this.value);
    });

    dom.getElementById('actExcelSave').addEventListener('click', function() {
        const lpList = document.getElementById('lpList'),
            saveName = `[${document.title}]${lpList.options[lpList.selectedIndex].text}_${document.getElementById('inputDate').value}.xlsx`;

        const workbook = XLSX.utils.book_new();
        const language = vio._language;

        let ws = XLSX.utils.table_to_sheet(document.getElementById('itemTable4'));
        XLSX.utils.sheet_add_dom(ws, document.getElementById('itemTable5'), {origin: -1});
        XLSX.utils.book_append_sheet(workbook, ws, language == 'ko' ? '전력량-15분' : '15 MINUTES');

        ws = XLSX.utils.table_to_sheet(document.getElementById('itemTable2'));
        XLSX.utils.sheet_add_dom(ws, document.getElementById('itemTable3'), {origin: -1});
        XLSX.utils.book_append_sheet(workbook, ws, language == 'ko' ? '전력량-시간' : 'HOURLY');

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.table_to_sheet(document.getElementById('itemTable1')), language == 'ko' ? '전력량-전체' : 'POWER AMMOUNT');

        XLSX.writeFile(workbook, saveName);
    });

    dom.getElementById('actDailyExcelSave').addEventListener('click', function() {
        const lpListDaily = document.getElementById('lpListDaily'),
            saveName = `[전력량관리]일별_${lpListDaily.options[lpListDaily.selectedIndex].text}_${document.getElementById('inputDailyDate').value}.xlsx`;

        const workbook = XLSX.utils.book_new();

        let ws = XLSX.utils.table_to_sheet(document.getElementById('itemTable7'));
        XLSX.utils.sheet_add_dom(ws, document.getElementById('itemTable8'), {origin: -1});
        XLSX.utils.book_append_sheet(workbook, ws, '전력량-일별');

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.table_to_sheet(document.getElementById('itemTable6')), '전력량-전체');

        XLSX.writeFile(workbook, saveName);
    });

    dom.getElementById('actMonthlyExcelSave').addEventListener('click', function() {
        const lpListMonthly = document.getElementById('lpListMonthly'),
            saveName = `[전력량관리]월별_${lpListMonthly.options[lpListMonthly.selectedIndex].text}_${document.getElementById('selectMonthlyDate').value}.xlsx`;

        const workbook = XLSX.utils.book_new();

        let ws = XLSX.utils.table_to_sheet(document.getElementById('itemTable10'));
        XLSX.utils.sheet_add_dom(ws, document.getElementById('itemTable11'), {origin: -1});
        XLSX.utils.book_append_sheet(workbook, ws, '전력량-월별');

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.table_to_sheet(document.getElementById('itemTable6')), '전력량-전체');

        XLSX.writeFile(workbook, saveName);
    });

    dom.getElementById('actYearlyExcelSave').addEventListener('click', function() {
        const lpListYearly = document.getElementById('lpListYearly'),
            saveName = `[전력량관리]연도별_${lpListYearly.options[lpListYearly.selectedIndex].text}_연도별.xlsx`;

        const workbook = XLSX.utils.book_new();

        let ws = XLSX.utils.table_to_sheet(document.getElementById('itemTable13'));
        XLSX.utils.book_append_sheet(workbook, ws, '전력량-연도별');

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.table_to_sheet(document.getElementById('itemTable12')), '전력량-전체');

        XLSX.writeFile(workbook, saveName);
    });

    dom.getElementById('actWeeklyExcelSave').addEventListener('click', function() {
        const lpListYearly = document.getElementById('lpListYearly'),
            saveName = `[전력량관리]요일별_${lpListYearly.options[lpListYearly.selectedIndex].text}_${document.getElementById('inputWeeklyDate').value}.xlsx`;

        const workbook = XLSX.utils.book_new();

        let ws = XLSX.utils.table_to_sheet(document.getElementById('itemTable14'));
        XLSX.utils.book_append_sheet(workbook, ws, '전력량-요일별');

        XLSX.writeFile(workbook, saveName);
    });

    // 1분단위 엑셀데이터
    const fid = dom.getElementById('firmSelect').value;
    if ([37, 38].indexOf(Number(fid)) !== -1) {
        dom.getElementById('actMinuteExcelSave').addEventListener('click', function() {
            const lpList = document.getElementById('lpList');
            window.open(`/api/excel-reports/${vio._fid}?pid=${lpList.value}&date=${document.getElementById('inputDate').value}&pidName=${encodeURIComponent(lpList.options[lpList.selectedIndex].text)}&token=${vio._accessToken}`);
        });
    } else {
        dom.getElementById('actMinuteExcelSave').classList.add('disable');
    }

    // 컨텐츠 번역관련 추가처리
    setTimeout(function(nowDate) {
        if (vio._language != 'ko') {
            const dt = document.getElementById('chart1');
            dt.nextElementSibling.classList.add('disable');
            dt.classList.add('disable');
            document.getElementById('dataCharges').classList.add('disable');
            document.getElementById('dataType').classList.add('disable');

            document.getElementById('seasonTime').nextElementSibling.textContent = `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][nowDate.getDay()]} ${nowDate.toLocaleDateString('uz-UZ')}`;
        }
    }, 32, nowDate);

    await vio.getData();

    $('#lpList').select2();
});
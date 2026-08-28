'use strict';
vio._amChart = null;
vio._dataType = sessionStorage.getItem('dataType') || 'hourly';

/* Chart2 data */

/* 설비 차트 */
vio.chartPowerTime = function (chartData, legend) {
    if (this._amChart) {
        this._amChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chartdiv', am4charts.XYChart);
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'top';
    chart.legend.paddingBottom = 20;
    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    xAxis.dataFields.category = 'seq';
    xAxis.dataFields.date = 'time';
    xAxis.dateFormatter.dateFormat = legend.dateFormat;
    xAxis.renderer.minGridDistance = 50;
    xAxis.renderer.grid.template.location = 0;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = '가스량 Nm³';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -40;

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = 'gas';
    series.dataFields.categoryX = 'seq';
    series.tooltipText = '[#fff]{name}[/][#fff]{valueY.value}[/][#d0d0d0]Nm³[/]';
    series.name = legend.gas;
    series.fillOpacity = 0.8;
    series.tooltip.pointerOrientation = 'vertical';

    const columnTemplate = series.columns.template;
    columnTemplate.fill = am4core.color('#46A1CC');
    columnTemplate.stroke = am4core.color('#030E22');

    let maxData = Math.max(...chartData.map(data => data.gas));
    // Max data columns fill option.
    columnTemplate.adapter.add('fill', function (fill, target) {
        if (target.dataItem.valueY == maxData) {
            return am4core.color('#F5142B');
        } else {
            return fill;
        }
    });

    function createSeries(name, valueY, color) {
        const series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.categoryX = 'seq';
        series.tooltipText = '[#fff]{name}[/][#fff]{valueY.value}[/][#d0d0d0]Nm³[/]';
        series.name = name;
        series.tooltip.pointerOrientation = 'vertical';
        series.fill = am4core.color(color);
        series.stroke = am4core.color(color);

        const bullet = series.bullets.push(new am4charts.CircleBullet());
        bullet.circle.strokeWidth = 2;
        bullet.circle.radius = 3;
        bullet.circle.fill = am4core.color('#fff');
        const bullethover = bullet.states.create('hover');
        bullethover.properties.scale = 1.6;
    }
    createSeries(legend.last, 'last', '#a857f6');

    chart.data = chartData;
    this._amChart = chart;
};

vio.dataTransChart = function (jsonData) {
    const items = {},
        dataType = document.getElementById("dataType").value;

    let unitPart;

    // 데이터 초기화
    if(dataType == 'monthly'){
        for(let index = 1; index <= 12; index++){
            items[index] = {
                gas: 0,
                last: 0,
            };
        }
        unitPart = 'm';
    }else if(dataType == 'daily'){
        const date = new Date(`${document.getElementById("inputDate").value} 00:00:00`);
        date.setMonth(date.getMonth() + 1);
        date.setDate(0) / 1000;
        const dateLen = date.getDate();

        for(let index = 1; index <= dateLen; index++){
            items[index] = {
                gas: 0,
                last: 0,
            };
        }
        unitPart = 'd';
    }else{
        for(let index = 0; index < 24; index++){
            items[index] = {
                gas: 0,
                last: 0,
            };
        }
        unitPart = 'h';
    }


    for(let item of jsonData.data){
        const unit = Number(this.echoDate(unitPart, item.ctime));

        if(!items.hasOwnProperty(unit)){
            continue;
        }
        items[unit].gas = item.amount;
    }

    for(let item of jsonData.dataLast){
        const unit = Number(this.echoDate(unitPart, item.ctime));

        if(!items.hasOwnProperty(unit)){
            continue;
        }
        items[unit].last = item.amount;
    }



    let sheetHead = '',
        sheetBody = '',
        gasTotal = 0;

    const chartData = [];

    if(dataType == 'monthly'){
        for(let unit in items){
            const gas = items[unit].gas;

            chartData.push({
                seq: unit.toString().padStart(2, '0'),
                gas: gas,
                last: items[unit].last,
            });

            sheetHead = `${sheetHead}<th>${unit}월</th>`;
            sheetBody = `${sheetBody}<td>${gas.toLocaleString('ko-KR')}</td>`;
            gasTotal += gas;
        }
        this.chartPowerTime(chartData, {gas:'당해',last:'전년',dateFormat:'MM'});
    }else if(dataType == 'daily'){
        for(let unit in items){
            const gas = items[unit].gas;

            chartData.push({
                seq: unit.toString().padStart(2, '0'),
                gas: gas,
                last: items[unit].last,
            });

            sheetHead = `${sheetHead}<th>${unit}일</th>`;
            sheetBody = `${sheetBody}<td>${gas.toLocaleString('ko-KR')}</td>`;
            gasTotal += gas;
        }
        this.chartPowerTime(chartData, {gas:'당월',last:'전월',dateFormat:'DD'});
    }else{
        for(let unit in items){
            const gas = items[unit].gas;

            chartData.push({
                seq: `${unit.toString().padStart(2, '0')}:00`,
                gas: gas,
                last: items[unit].last,
            });

            sheetHead = `${sheetHead}<th>${unit}H</th>`;
            sheetBody = `${sheetBody}<td>${gas}</td>`;
            gasTotal += gas;
        }

        this.chartPowerTime(chartData, {gas:'당일',last:'전일',dateFormat:'HH:mm'});
    }

    document.getElementById('itemTable1').querySelector('thead').innerHTML = `<tr><th></th>${sheetHead}<th>합계</th></tr>`;
    document.getElementById('itemTable1').querySelector('tbody').innerHTML = `<tr><th>사용량 Nm³</th>${sheetBody}<td>${gasTotal.toLocaleString('ko-KR')}</td></tr>`;
};


vio.getData = async function () {
    if (!this._useNetworks) {
        this.netAble(true);

        const lpList = document.getElementById('lpList');

        const res = await fetch(`api/gasReports/${this._fid}`, {
            method: "POST",
            headers: {
                'Authorization': `x-auth ${this._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"get","pid":"${lpList.value}","type":"${document.getElementById("dataType").value}","date":"${document.getElementById("inputDate").value}"}`,
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();
            this.netAble(false);

            this._dataType = document.getElementById('dataType').value;
            sessionStorage.setItem('dataType', this._dataType);

            switch (jsonData.cat) {
                case 9:
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    if (lpList.value == 0) {
                        let out = '';
                        for (let i = 0; i < jsonData.lpList.length; i++) {
                            const ta = jsonData.lpList[i];
                            out += `<option value='${ta.pid}' class='facilityOption'>
                                    ${this.catToXLSX(ta.lp_name)}
                                    </option>`;
                        }
                        lpList.innerHTML = out;
                    }
                    this.dataTransChart(jsonData);
                    break;
                default:
                    this.toast({ memo: '데이터가 존재하지 않습니다.' });
            }
        }
    }
};

vio.gasReady = function(){
    const nowDate = new Date(),
        thisDate = nowDate.toLocaleDateString('sv-SE'),
        inputDate = document.getElementById('inputDate');

    inputDate.max = thisDate;
    inputDate.value = thisDate;

    document.getElementById('dataType').value = vio._dataType;

    // 조회 버튼 event 추가.
    document.getElementById('act').addEventListener('click', function () {
        vio.getData();
    });

    document.getElementById('actExcelSave').addEventListener('click', function () {
        const lpList = document.getElementById('lpList'),
            saveName = `[가스사용량]${lpList.options[lpList.selectedIndex].text}_${document.getElementById('inputDate').value}.xlsx`;
        const workbook = XLSX.utils.book_new();
        const ws = XLSX.utils.table_to_sheet(document.getElementById('itemTable1'));
        XLSX.utils.book_append_sheet(workbook, ws, '가스사용량');
        XLSX.writeFile(workbook, saveName);
    });
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.gasReady();
    await vio.getData();
});

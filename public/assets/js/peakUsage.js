'use strict';

vio._powerChart = null;

vio.chartPowerTime = function(j, seriesName) {
    if (this._powerChart) {
        this._powerChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart1', am4charts.XYChart);
    chart.paddingTop = 60;
    chart.paddingLeft = 40;
    chart.paddingRight = 40;
    chart.paddingBottom = 40;
    chart.colors.list = [am4core.color('#57c5f6'), am4core.color('#a857f6'), am4core.color('#8bc34a')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'bottom';
    chart.legend.paddingBottom = -20;

    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    xAxis.tooltip.disabled = true;
    xAxis.dataFields.category = 'seq'
    xAxis.dataFields.date = 'time';
    xAxis.dateFormatter.dateFormat = 'HH:mm';
    xAxis.renderer.minGridDistance = 60;
    xAxis.renderer.grid.template.location = 0;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = this._language == 'ko' ? '최대수요(kW)' : 'MAXIMUM\nDEMAND';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -30;

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = 'day';
    series.dataFields.categoryX = 'seq';
    series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
    series.name = seriesName;
    series.fillOpacity = 0.6;

    const seriesMax = Math.max(...j.map(a => Number(a.day.replace(/\,/g, ''))));
    series.columns.template.adapter.add('fill', function(fill, target) {
        return seriesMax == target.dataItem.valueY ? am4core.color('#f56565') : fill;
    });
    series.columns.template.adapter.add('stroke', function(stroke, target) {
        return seriesMax == target.dataItem.valueY ? am4core.color('#e53e3e') : stroke;
    });

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
        bullet.circle.fill = am4core.color('#ffffff');

        const bullethover = bullet.states.create('hover');
        bullethover.properties.scale = 1.6;
    }

    createSeries(this._language == 'ko' ? '전일' : 'YESTERDAY', 'lDay');

    chart.data = j;

    this._powerChart = chart;
};

vio.sheetTrans = function(j) {
    let seriesName = this._language == 'ko' ? '피크 15분전력' : 'PEAK 15 MINUTE POWER',
        sheet = j.parentElement,
        index = 0,
        data = [];

    while (index < 4) {
        let ia = 1,
            th = 25,
            dt = sheet.children,
            minutes = index * 15,
            hours = 0;

        if (index == 0) {
            ia = 2;
            th = 26;
        }
        while (ia < th) {
            data[hours * 4 + index] = {
                seq: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
                day: dt[ia].textContent,
                lDay: 0
            };
            ia += 1;
            hours += 1;
        }
        sheet = sheet.nextElementSibling;
        index += 1;
    }

    // 전날 15분전력 추가
    const thisDay = Number(j.textContent.replace(/[^\d]/g, ''));
    if (thisDay > 1) {
        const readyAutoEl = document.getElementById(`readyAuto${thisDay - 1}`);
        if (readyAutoEl) {
            sheet = readyAutoEl.parentElement;
            index = 0;

            while (index < 4) {
                let ia = 1,
                    th = 25,
                    dt = sheet.children,
                    minutes = index * 15,
                    hours = 0;

                if (index == 0) {
                    ia = 2;
                    th = 26;
                }
                while (ia < th) {
                    data[hours * 4 + index].lDay = dt[ia].textContent;
                    ia += 1;
                    hours += 1;
                }
                sheet = sheet.nextElementSibling;
                index += 1;
            }
        }
    }

    this.chartPowerTime(data, seriesName);
}

// dataWattHours [[시간, 전력, 한전데이터 사용유무],...]
vio.dataTrans = function (dataWattHours) {
    let out = '',
        data = [],
        useKepco = {},
        endDay = 1;

    for (const dataWattHour of dataWattHours) {
        const thisDate = new Date((dataWattHour[0] - 1) * 1000), // 24시는 다음날이여서 -1
            thisDay = thisDate.getDate(),
            thisHour = thisDate.getHours(),
            thisTime = thisDate.getMinutes() + 1; // 59:59 > 60:00 초와 상관없이

        if (!data.hasOwnProperty(thisDay)) {
            data[thisDay] = {
                15: [], // 15분
                30: [],
                45: [],
                60: []
            };

            for (let hour = 0; hour < 24; ++hour) {
                data[thisDay][15][hour] = 0;
                data[thisDay][30][hour] = 0;
                data[thisDay][45][hour] = 0;
                data[thisDay][60][hour] = 0;
            }
        }
        if (thisDay > endDay) {
            endDay = thisDay;
        }

        data[thisDay][thisTime][thisHour] = (dataWattHour[1] * 4 / 1000).toFixed(0);

        if(dataWattHour[2] === 1){ // 데이터가 계측이 안되어서 한전데이터 사용 유무
            useKepco[`${thisDay}${thisTime}${thisHour}`] = true;
        }
    }

    for (let thisDay in data) {
        out = `${out}<tr><th class="sheetAct" rowspan="4" onclick="vio.sheetTrans(this)" ${endDay == thisDay ? 'id="readyAuto"' : `id="readyAuto${thisDay}"`}>${thisDay}</th>`;
        const wattMax = Math.max(...data[thisDay][15], ...data[thisDay][30], ...data[thisDay][45], ...data[thisDay][60]);
        for (let quarter in data[thisDay]) {
            if (quarter != 15) {
                out = `${out}<tr>`;
            }
            out = `${out}<th class="tLabel" data-t="s">${quarter}:00</th>`;
            for (let hour = 0; hour < 24; ++hour) {
                let classAdd = '';
                if(wattMax == data[thisDay][quarter][hour]){
                    classAdd = 'wattMax';
                }
                if(useKepco.hasOwnProperty(`${thisDay}${quarter}${hour}`)){
                    classAdd = `${classAdd} underline`;
                }
                out = `${out}<td ${classAdd != '' ? `class="${classAdd}"` : ''}>${this.echoNumber(data[thisDay][quarter][hour])}</td>`;
            }
            out = `${out}</tr>`;
        }
    }
    document.getElementById('itemList').innerHTML = out;
    if (out != '') {
        document.getElementById('readyAuto').click();
    }
};

vio.getData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            date: document.getElementById('inputMonth').value
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/peak-usages/${this._fid}?${queryString}`, {
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
                this.dataTrans(jsonData.data);
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const today = new Date();

    new tui.DatePicker('#wrapper', {
        date: today,
        type: 'month',
        input: {
            element: '#inputMonth',
            format: 'yyyy-MM'
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

    document.getElementById('actExcelSave').addEventListener('click', function() {
        let workbook = XLSX.utils.table_to_book(document.getElementById('itemTable'));
        XLSX.writeFile(workbook, `[피크 15분 전력 보고서 ${localStorage.getItem('firmName')}].xlsx`);
    });
});
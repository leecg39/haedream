'use strict';

vio._pageChart = null;

vio.chartPage = function(j) {
    if (this._pageChart) {
        this._pageChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart1', am4charts.XYChart);
    chart.paddingTop = 30;
    chart.colors.list = [am4core.color('#57c5f6'), am4core.color('#a857f6'), am4core.color('#8bc34a')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'bottom';
    chart.legend.paddingBottom = -20;
    chart.cursor = new am4charts.XYCursor();
    chart.dateFormatter.inputDateFormat = 'yyyy-MM-dd';

    const xAxis = chart.xAxes.push(new am4charts.DateAxis());
    xAxis.renderer.grid.template.location = 0;
    xAxis.startLocation = 0.5;
    xAxis.endLocation = 0.5;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.layout = 'absolute';
    yAxis.title.text = this._language == 'ko' ? '전력 사용량(kW)' : 'POWER USAGE';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -30;
    yAxis.renderer.labels.template.adapter.add('text', function(text) {
        return text + ' [#a0a0a0 font-size:.86rem]kW[/]';
    });

    function createSeries(name, valueY) {
        const series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.dateX = 'date';
        series.tooltipText = '[#fff]{name} :[/] [bold #fff]{valueY.value}[/] [#e0e0e0 font-size:.86rem]kW[/]';
        series.name = name;
        series.tooltip.pointerOrientation = 'vertical';
        series.strokeWidth = 1;
        series.fillOpacity = 0.08;

        var bullet = series.bullets.push(new am4charts.CircleBullet());
        bullet.circle.strokeWidth = 2;
        bullet.circle.radius = 4;
        bullet.circle.fill = am4core.color('#ffffff');

        var bullethover = bullet.states.create('hover');
        bullethover.properties.scale = 1.6;
    }

    createSeries(this._language == 'ko' ? '예측전력' : 'PREDICTED POWER', 'predict');
    createSeries(this._language == 'ko' ? '전력량' : 'POWER Q’TY', 'power');
    chart.data = j;

    this._pageChart = chart;
};

vio.dataTrans = function(excelData, data) {
    let sum = {no: 0, power: 0, input: 0, output: 0, avgOut: 0, avgPower: 0},
        out = '',
        chartData = [];

    if (this._language == 'ko') {
        out = ['<th>구분</th>', '<th>생산량</th>', '<th>원자재</th>', '<th>예측전력</th>', '<th>전력량</th>', '<th rowspan="2">비교분석</th>', ''];
    } else {
        out = ['<th>CONTENTS</th>', '<th>OUTPUT</th>', '<th>RAW MATERIALS</th>', '<th>PREDICTED POWER</th>', '<th>POWER Q’TY</th>', '<th rowspan="2">COMPARISON ANALYSIS</th>', ''];
    }

    for (let ia = 0, th = excelData.length; ia < th; ++ia) {
        const ta = excelData[ia];

        let datekey = null;
        switch (ta.DATE.length) {
            case 16:
                datekey = Math.floor(new Date(ta.DATE + ':00').getTime() / 1000) - 9 * 3600; // y-m-d : korean time
                break;
            case 10:
                datekey = Math.floor(new Date(ta.DATE).getTime() / 1000) - 9 * 3600;
                break;
            case 7:
                datekey = Math.floor(new Date(ta.DATE + '-01').getTime() / 1000) - 9 * 3600;
                break;
        }
        if (!datekey) {
            continue;
        }

        ta.INPUT = Number(ta.INPUT);
        ta.OUTPUT = Number(ta.OUTPUT);

        if (data.hasOwnProperty(datekey)) {
            ta.power = Math.round(Number(data[datekey]) * 4 / 1000);

            sum.no += 1;
            sum.power += ta.power;
            sum.input += ta.INPUT;
            sum.output += ta.OUTPUT;
        } else {
            ta.power = 0;
        }
    }

    if (sum.no != 0) {
        sum.avgOut = Math.round((sum.input + sum.output) / sum.no);
        sum.avgPower = Math.round(sum.power / sum.no);
    }

    for (let ia = 0, th = excelData.length; ia < th; ++ia) {
        const ta = excelData[ia];
        let oDate = null;
        switch (ta.DATE.length) {
            case 16:
                oDate = new Date(ta.DATE + ':00');
                break;
            case 10:
                oDate = new Date(ta.DATE);
                break;
            case 7:
                oDate = new Date(ta.DATE + '-01');
                break;
        }
        if (!oDate) {
            continue;
        }

        ta.predict = sum.avgOut == 0 ? 0 : Math.round(sum.avgPower * (ta.INPUT + ta.OUTPUT) / sum.avgOut);
        ta.compare = ta.power - ta.predict;
        ta.percent = ta.predict == 0 ? 0 : Math.round(ta.power / ta.predict * 100);

        chartData.push({date: oDate, power: ta.power, predict: ta.predict});

        let icon = '';
        if (ta.compare > 0) {
            icon = '<span class="cRed">▲</span>';
        } else if (ta.compare < 0) {
            icon = '<span class="cBlue">▼</span>';
        }

        out[0] += '<th>' + ta.DATE + '</th>';
        out[1] += '<td>' + ta.OUTPUT + '</td>';
        out[2] += '<td>' + ta.INPUT + '</td>';
        out[3] += '<td>' + ta.predict + ' ㎾</td>';
        out[4] += '<td>' + ta.power + ' ㎾</td>';
        out[5] += '<td>' + icon + Math.abs(ta.compare) + ' ㎾</td>';
        out[6] += '<td>' + ta.percent + ' %</td>';
    }

    this.chartPage(chartData);
    document.getElementById('itemList').innerHTML = `<tr>${out[0]}</tr><tr>${out[1]}</tr><tr>${out[2]}</tr><tr>${out[3]}</tr><tr>${out[4]}</tr><tr>${out[5]}</tr><tr>${out[6]}</tr>`;
};

vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const lpList = document.getElementById('lpList');

        const params = {
            cf: 'get',
            pid: lpList.value,
            excel: JSON.stringify(j)
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/watt-predictions/${this._fid}?${queryString}`, {
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

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this.dataTrans(j, jsonData.data);
            }
        }
    }
};

vio.getList = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'fac'
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/watt-predictions/${this._fid}?${queryString}`, {
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

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                let out = '';
                for (let ia = 0, th = jsonData.lpList.length; ia < th; ++ia) {
                    const ta = jsonData.lpList[ia];
                    out += `<option value="${ta.pid}">${this.catToXLSX(ta.lp_name)}</option>`;
                }
                document.getElementById('lpList').innerHTML = out;
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const dom = document;

    dom.getElementById('act').addEventListener('click', function() {
        const input = this.previousElementSibling;
        const reader = new FileReader();
        reader.onload = function() {
            const fileData = reader.result;
            const wb = XLSX.read(fileData, {type: 'binary'});
            wb.SheetNames.forEach(function(sheetName) {
                vio.getData(XLSX.utils.sheet_to_json(wb.Sheets[sheetName]));
            });
        };

        if (input.files.length == 0) {
            vio.toast({memo: '생산량 데이터 엑셀파일을 먼저 등록해주세요.'});
        } else {
            reader.readAsBinaryString(input.files[0]);
        }
    });

    dom.getElementById('actExcelImport').addEventListener('click', function() {
        this.nextElementSibling.click();
    });

    dom.getElementById('actExcelExam').addEventListener('click', function() {
        location.href = '/attach/TEMPS_sampleCP_v1.xlsx';
    });

    // sample
    setTimeout(function() {
        vio.chartPage([{"date": "2023-10-09T00:00:00.000Z", "power": 3400, "predict": 2992},
            {"date": "2023-10-10T00:00:00.000Z", "power": 2384, "predict": 3205},
            {"date": "2023-10-11T00:00:00.000Z", "power": 2582, "predict": 2911},
            {"date": "2023-10-12T00:00:00.000Z", "power": 2892, "predict": 1782},
            {"date": "2023-10-13T00:00:00.000Z", "power": 3384, "predict": 1855},
            {"date": "2023-10-14T00:00:00.000Z", "power": 3383, "predict": 4722},
            {"date": "2023-10-15T00:00:00.000Z", "power": 2780, "predict": 3205},
            {"date": "2023-10-16T00:00:00.000Z", "power": 2224, "predict": 2911},
            {"date": "2023-10-17T00:00:00.000Z", "power": 2873, "predict": 4086},
            {"date": "2023-10-18T00:00:00.000Z", "power": 3401, "predict": 4262},
            {"date": "2023-10-19T00:00:00.000Z", "power": 2511, "predict": 1667},
            {"date": "2023-10-20T00:00:00.000Z", "power": 3479, "predict": 1749},
            {"date": "2023-10-21T00:00:00.000Z", "power": 3377, "predict": 4093},
            {"date": "2023-10-22T00:00:00.000Z", "power": 3393, "predict": 3839},
            {"date": "2023-10-23T00:00:00.000Z", "power": 3385, "predict": 4018},
            {"date": "2023-10-24T00:00:00.000Z", "power": 3358, "predict": 4383}
        ]);
    }, 32);

    vio.getList();
});
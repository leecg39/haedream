'use strict';

vio._device = {};
vio._chart = null;

vio.chartRatio = function (j) {
    if (this._chart) {
        this._chart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart1', am4charts.XYChart);
    chart.colors.list = [am4core.color('#9cc952'), am4core.color('#e4ce66'), am4core.color('#d84420')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'top';
    chart.legend.paddingBottom = 20;

    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
    xAxis.dataFields.category = 'fac'; // watt : percent
    xAxis.renderer.minGridDistance = 30;
    xAxis.renderer.labels.template.horizontalCenter = "right";
    xAxis.renderer.labels.template.verticalCenter = "middle";
    xAxis.renderer.labels.template.rotation = 270;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.renderer.inside = true;
    yAxis.renderer.labels.template.disabled = true;

    const series1 = chart.series.push(new am4charts.ColumnSeries());
    series1.dataFields.valueY = 'usageL';
    series1.dataFields.categoryX = 'fac';
    series1.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
    series1.name = '경부하';
    series1.stacked = true;

    const series2 = chart.series.push(new am4charts.ColumnSeries());
    series2.dataFields.valueY = 'usageM';
    series2.dataFields.categoryX = 'fac';
    series2.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
    series2.name = '중간부하';
    series2.stacked = true;

    const series3 = chart.series.push(new am4charts.ColumnSeries());
    series3.dataFields.valueY = 'usageH';
    series3.dataFields.categoryX = 'fac';
    series3.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]kW[/]';
    series3.name = '최대부하';
    series3.stacked = true;

    chart.data = j;

    this._chart = chart;
};

vio.editRatio = function (inputRange, pid) {
    const dom = document,
        ta = this._device[pid];

    let ratioL,
        ratioM,
        ratioH,
        priceM,
        priceH,
        usageM,
        usageH,
        changeRatioM,
        changeRatioH,
        dt,
        tmpRange = inputRange.value;

    if (ta.sumUsage == 0) {
        return;
    }

    ratioH = ta.usageH == 0 ? 0 : Math.floor(ta.usageH / ta.sumUsage * 100);
    ratioM = ta.usageM == 0 ? 0 : Math.floor(ta.usageM / ta.sumUsage * 100);

    if (tmpRange > ratioH + ratioM) {
        tmpRange = ratioH + ratioM;
    }

    changeRatioH = tmpRange;
    changeRatioM = (ratioH + ratioM) - tmpRange;

    ta._priceH = Math.floor(ta.priceH * changeRatioH / ratioH);
    ta._priceM = Math.floor(ta.priceM * changeRatioM / ratioM);
    ta._usageH = Math.floor(ta.usageH * changeRatioH / ratioH);
    ta._usageM = Math.floor(ta.usageM * changeRatioM / ratioM);

    inputRange.value = tmpRange;
    dt = dom.getElementById(`pItem${pid}`);
    dt.textContent = `${ta._priceM.toLocaleString()}원`;
    dt = dt.parentElement.nextElementSibling.lastElementChild;
    dt.textContent = `${ta._priceH.toLocaleString()}원`;
    dt = dt.parentElement.nextElementSibling.children;
    dt[0].style.width = `${changeRatioH}%`;
    dt[1].style.width = `${changeRatioM}%`;
    inputRange.nextElementSibling.nextElementSibling.textContent = `최대부하 전력 ${changeRatioH}%`;

    // total
    let total = {
        priceL: 0,
        priceM: 0,
        priceH: 0,
        usageL: 0,
        usageM: 0,
        usageH: 0
    };

    for (let k in this._device) {
        if(!this._device[k].hasOwnProperty('sumUsage')){
            continue
        }
        const ta = this._device[k];

        total.usageL += ta.usageL;
        total.usageM += ta._usageM;
        total.usageH += ta._usageH;
        total.priceL += ta.priceL;
        total.priceM += ta._priceM;
        total.priceH += ta._priceH;
    }

    total.sumUsage = total.usageL + total.usageM + total.usageH;
    total.ratioH = total.usageH == 0 ? 0 : Math.floor(total.usageH / total.sumUsage * 100);
    total.ratioM = total.usageM == 0 ? 0 : Math.floor(total.usageM / total.sumUsage * 100);
    total.ratioL = 100 - total.ratioH - total.ratioM;

    dom.getElementById('tMiddleGold').textContent = `${total.priceM.toLocaleString()}원`;
    dom.getElementById('tHighGold').textContent = `${total.priceH.toLocaleString()}원`;
    dom.getElementById('tMiddleRatio').style.width = `${total.ratioM}%`;
    dom.getElementById('tMiddleRatio').previousElementSibling.style.width = `${total.ratioH}%`;
    dom.getElementById('tHighPower').textContent = `최대부하 전력 ${total.ratioH}%`;
};

vio.dataTrans = function (j) {
    let out = '',
        total = {
            priceL: 0,
            priceM: 0,
            priceH: 0,
            usageL: 0,
            usageM: 0,
            usageH: 0
        },
        chart = [];

    for (const ta of j) {
        if(!this._device.hasOwnProperty(ta.pid)){
            continue;
        }

        let ratioL,
            ratioM,
            ratioH;

        total.usageL += ta.usageL;
        total.usageM += ta.usageM;
        total.usageH += ta.usageH;
        total.priceL += ta.priceL;
        total.priceM += ta.priceM;
        total.priceH += ta.priceH;

        ta._usageM = ta.usageM;
        ta._usageH = ta.usageH;
        ta._priceM = ta.priceM;
        ta._priceH = ta.priceH;

        ta.sumUsage = ta.usageL + ta.usageM + ta.usageH;
        ratioH = ta.usageH == 0 ? 0 : Math.floor(ta.usageH / ta.sumUsage * 100);
        ratioM = ta.usageM == 0 ? 0 : Math.floor(ta.usageM / ta.sumUsage * 100);
        ratioL = 100 - ratioH - ratioM;

        ta.name = this._device[ta.pid].name;
        this._device[ta.pid] = ta;

        chart.push({ fac: ta.name, usageL: ta.usageL, usageM: ta.usageM, usageH: ta.usageH });

        out = `${out}
        <div class="item">
            <div>
                <span class="itemIcon"></span>
                <span class="itemName">${ta.name}</span>
            </div>
            <div>
                <span class="itemIcon powerLow"></span>
                <span class="itemLabel">경부하</span>
                <span class="itemEm">${ta.priceL.toLocaleString()}원</span>
            </div>
            <div>
                <span class="itemIcon powerMiddle"></span>
                <span class="itemLabel">중부하</span>
                <span class="itemEm" id="pItem${ta.pid}">${ta.priceM.toLocaleString()}원</span>
            </div>
            <div>
                <span class="itemIcon powerHigh"></span>
                <span class="itemLabel">최대부하</span>
                <span class="itemEm">${ta.priceH.toLocaleString()}원</span>
            </div>
            <div class="barBox">
                <span class="bar powerHigh" style="width:${ratioH}%"></span>
                <span class="bar powerMiddle" style="width:${ratioM}%"></span>
                <span class="bar powerLow" style="width:${ratioL}%"></span>
            </div>
            <div>
                <input type="range" class="range" value="${ratioH}" list="tickmarks${ta.pid}" onchange="vio.editRatio(this,${ta.pid})">
                <datalist id="tickmarks${ta.pid}">
                    <option value="0"></option>
                    <option value="10"></option>
                    <option value="20"></option>
                    <option value="30"></option>
                    <option value="40"></option>
                    <option value="50"></option>
                    <option value="60"></option>
                    <option value="70"></option>
                    <option value="80"></option>
                    <option value="90"></option>
                    <option value="100"></option>
                </datalist>
                <span class="rangeText">최대부하 전력 ${ratioH}%</span>
            </div>
        </div>`;
    }

    total.sumUsage = total.usageL + total.usageM + total.usageH;
    total.ratioH = total.usageH == 0 ? 0 : Math.floor(total.usageH / total.sumUsage * 100);
    total.ratioM = total.usageM == 0 ? 0 : Math.floor(total.usageM / total.sumUsage * 100);
    total.ratioL = 100 - total.ratioH - total.ratioM;

    out = `
    <div class="item">
        <div>
            <span class="itemIcon"></span>
            <span class="itemName">전체</span>
        </div>
        <div>
            <span class="itemIcon powerLow"></span>
            <span class="itemLabel">경부하</span>
            <span class="itemEm">${total.priceL.toLocaleString()}원</span>
        </div>
        <div>
            <span class="itemIcon powerMiddle"></span>
            <span class="itemLabel">중부하</span>
            <span class="itemEm" id="tMiddleGold">${total.priceM.toLocaleString()}원</span>
        </div>
        <div>
            <span class="itemIcon powerHigh"></span>
            <span class="itemLabel">최대부하</span>
            <span class="itemEm" id="tHighGold">${total.priceH.toLocaleString()}원</span>
        </div>
        <div class="barBox">
            <span class="bar powerHigh" style="width:${total.ratioH}%"></span>
            <span class="bar powerMiddle" id="tMiddleRatio" style="width:${total.ratioM}%"></span>
            <span class="bar powerLow" style="width:${total.ratioL}%"></span>
        </div>
        <div>
            <!-- <input type="range" class="range" value="${total.ratioH}" list="tickmarks">
            <datalist id="tickmarks">
                <option value="0"></option>
                <option value="10"></option>
                <option value="20"></option>
                <option value="30"></option>
                <option value="40"></option>
                <option value="50"></option>
                <option value="60"></option>
                <option value="70"></option>
                <option value="80"></option>
                <option value="90"></option>
                <option value="100"></option>
            </datalist> --><br/>
            <span class="rangeText" id="tHighPower">최대부하 전력 ${total.ratioH}%</span>
        </div>
    </div>${out}`;
    document.getElementById('itemList').innerHTML = out;
    this.chartRatio(chart);
};

vio.getData = async function () {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/loads/${this._fid}?date=${document.getElementById('inputMonth').value}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${this._accessToken}`,
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
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    this.dataTrans(jsonData.data);
                    break;
                default:
                    this.toast({ memo: '실행할 수 있는 데이터가 없습니다.' });
            }
        }
    }
};

vio.getBase = async function () {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/loads/${this._fid}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${this._accessToken}`,
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
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    for (let item of jsonData.device) {
                        this._device[item.pid] = { name: item.name };
                    }

                    this.getData();
                    break;
                default:
                    this.toast({ memo: '데이터가 존재하지 않습니다.' });
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const nowDate = new Date();
    nowDate.setMonth(nowDate.getMonth() - 1); // 지난월 데이터가 기본값
    const thisYearMonth = `${nowDate.getFullYear()}-${(nowDate.getMonth() + 1).toString().padStart(2, '0')}`,
        dt = document.getElementById('inputMonth');

    dt.value = thisYearMonth;
    dt.max = thisYearMonth;
    dt.addEventListener('change', function () {
        vio.getData();
    });

    vio.getBase();
});
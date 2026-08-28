'use strict';

vio._controlName = {};
vio._basicCost = 0;
vio._hisChart = null;

vio.chart = function(j) {
    if (this._hisChart) {
        this._hisChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    let chart = am4core.create("chart1", am4charts.XYChart);
    chart.maskBullets = false;

    let xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    let yAxis = chart.yAxes.push(new am4charts.CategoryAxis());

    xAxis.dataFields.category = "days";
    yAxis.dataFields.category = "hour";

    xAxis.renderer.grid.template.disabled = true;
    xAxis.renderer.minGridDistance = 40;

    yAxis.renderer.grid.template.disabled = true;
    yAxis.renderer.inversed = false;
    yAxis.renderer.minGridDistance = 30;
    yAxis.renderer.labels.template.adapter.add('text', function(text) {
        return text + ' [#a0a0a0 font-size:.86rem]시[/]';
    });

    let setAxis = [];
    for (let ia = 0; ia < 24; ++ia) {
        setAxis[ia] = {hour: ia};
    }
    yAxis.data = setAxis;

    setAxis = [];
    const mDateVal = document.getElementById('mDate').value,
        mMonth = mDateVal.substr(5, 2),
        isSame = new Date().toLocaleDateString('sv-SE').substr(0, 7) == mDateVal,
        endDate = isSame ? new Date().getDate() : new Date(mDateVal.substr(0, 4), mMonth, 0).getDate();

    for (let ia = 1; ia <= endDate; ++ia) {
        setAxis[ia - 1] = {days: `${mMonth}-${ia < 10 ? '0' + ia : ia}`};
    }
    xAxis.data = setAxis;


    let series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.categoryX = "days";
    series.dataFields.categoryY = "hour";
    series.dataFields.value = "value";
    series.sequencedInterpolation = true;
    series.defaultState.transitionDuration = 3000;

    let columnTemplate = series.columns.template;
    columnTemplate.strokeWidth = 1;
    columnTemplate.strokeOpacity = 0.2;
    columnTemplate.stroke = '#90caf9';
    columnTemplate.tooltipText = "{days} {hour}시 {value}회";
    columnTemplate.width = am4core.percent(100);
    columnTemplate.height = am4core.percent(100);

    series.heatRules.push({
        target: columnTemplate,
        property: "fill",
        min: am4core.color('#0d47a1'),
        max: am4core.color('#bbdefb')
    });

    // heat legend
    let heatLegend = chart.bottomAxesContainer.createChild(am4charts.HeatLegend);
    heatLegend.width = am4core.percent(100);
    heatLegend.series = series;
    heatLegend.valueAxis.renderer.labels.template.fontSize = 9;
    heatLegend.valueAxis.renderer.minGridDistance = 30;

    // heat legend behavior
    series.columns.template.events.on("over", function(event) {
        if (!isNaN(event.target.dataItem.value)) {
            heatLegend.valueAxis.showTooltipAt(event.target.dataItem.value)
        } else {
            heatLegend.valueAxis.hideTooltip();
        }
    });

    series.columns.template.events.on("hit", function(event) {
        if (!isNaN(event.target.dataItem.value)) {
            document.getElementById('sDate').value = vio.echoDate('y-m-d', event.target.dataItem._dataContext.sTime);
            vio.getData(1);
        }
        //handleHover(event.target);
    });

    series.columns.template.events.on("out", function(event) {
        heatLegend.valueAxis.hideTooltip();
    });

    chart.data = j;
    this._hisChart = chart;
};

vio.deskPaging = function(j) {
    this._sheet.page = j.page;

    let out = '',
        pageNo = 0,
        pageInfo = '';

    if (j.page > 4) {
        out += `<span class="deskPage act" onclick="vio.getData(${j.page - 9 < 1 ? 1 : j.page - 9})">prev</span>`;
    } else {
        out += '<span class="deskPage act">prev</span>';
    }
    for (let ia = j.page > 4 ? j.page - 4 : 1; ia < j.page; ++ia) {
        pageNo += 1;
        out += `<span class="deskPage act" onclick="vio.getData(${ia})">${ia}</span>`;
    }
    out += `<span class="deskPage act active">${j.page}</span>`;
    for (let ia = j.page + 1; ia < j.page + (9 - pageNo) && ia <= j.dbPageNo; ++ia) {
        out += `<span class="deskPage act" onclick="vio.getData(${ia})">${ia}</span>`;
    }
    if (j.dbPageNo > 9) {
        out += `<span class="deskPage act" onclick="vio.getData(${j.page + 9 > j.dbPageNo ? j.dbPageNo : j.page + 9})">next</span>`;
    } else {
        out += '<span class="deskPage act">next</span>';
    }
    document.getElementById('deskPages').innerHTML = out;
    pageInfo = `${(j.page - 1) * j.dbListLimit + 1} - ${j.page * j.dbListLimit < j.dbNo ? j.page * j.dbListLimit : j.dbNo} / ${j.dbNo}`;
    document.getElementById('deskStat').textContent = pageInfo;
};

vio.dataTrans = function(j) {
    let out = '';

    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia],
            hasTime = ta.eTime - ta.sTime;

        let hasTimeText = '';
        if (hasTime < 60) {
            hasTimeText = hasTime + '초';
        } else if (hasTime < 3600) {
            hasTimeText = `${Math.floor(hasTime / 60)}분 ${hasTime % 60}초`;
        } else if (hasTime < 86400) {
            hasTimeText = `${Math.floor(hasTime / 3600)}시간 ${Math.floor(hasTime % 3600 / 60)}분 ${hasTime % 60}초`;
        } else {
            hasTimeText = Math.ceil(hasTime / 86400) + '일';
        }

        out += `
            <tr>
                <td>${ta.cid}</td>
                <td>${this.catToXLSX(this._controlName[ta.cid])}</td>
                <td>${this.echoDate('m.d h:i:s', ta.sTime)}</td>
                <td>${this.echoDate('m.d h:i:s', ta.eTime)}</td>
                <td>${this.echoNumber(ta.sPredict)}<i class="em">㎾</i></td>
                <td>${this.echoNumber(ta.sLimit)}<i class="em">㎾</i></td>
                <td>${hasTimeText}</td>
                <td>${ta.gold / 10}</td>
            </tr>`;
    }
    document.getElementById('deskList').innerHTML = out;
};

vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'get',
            cid: document.getElementById('facList').value,
            sDate: document.getElementById('sDate').value || this.echoDate('y-m-d', Math.floor(Date.now() / 1000)),
            qs: '',
            page: j,
            qt: this._sheet.sortTag,
            qa: this._sheet.sortAsc,
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`${this._apiUrl}/api/control-historys/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        this.netAble(false);

        if (!res.ok) {
            console.error(res.status);
        }  else {
            const jsonData = await res.json();

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this._basicCost = jsonData.basicCost;
                this.dataTrans(jsonData.data);
                this.deskPaging(jsonData.paging);
            }
        }
    }
};

vio.getBase = async function() {
    const params = {
        cf: 'base'
    };

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`${this._apiUrl}/api/control-historys/${this._fid}?${queryString}`, {
        method: 'GET',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    this.netAble(false);

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            let out = '';
            for (let ia = 0, th = jsonData.control.length; ia < th; ++ia) {
                const ta = jsonData.control[ia];
                out += `<option value="${ta.cid}">${ta.controlName}</option>`;

                this._controlName[ta.cid] = ta.controlName;
            }
            if (out) {
                document.getElementById('facList').insertAdjacentHTML('beforeend', out);
            }
        }
    }
};

vio.getChartData = async function() {
    const params = {
        cf: 'chart',
        mDate: document.getElementById('mDate').value
    };

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`${this._apiUrl}/api/control-historys/${this._fid}?${queryString}`, {
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

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            if (jsonData.data.length) {
                document.getElementById('sDate').value = this.echoDate('y-m-d', jsonData.data[jsonData.data.length - 1].sTime);
                this.getData(1);
            }
            this.chart(jsonData.data);

            // 총 절감시간
            let energy = '';
            if (jsonData.energyTime > 3600) {
                energy = `${Math.floor(jsonData.energyTime / 3600)}시간 `;
            }
            if (jsonData.energyTime > 60) {
                energy += `${Math.floor(jsonData.energyTime % 3600 / 60)}분 `;
            }
            energy += `${Math.floor(jsonData.energyTime % 60)}초`;
            document.getElementById('energyTime').textContent = energy;

            // 총 절감액
            const energyGold = jsonData.energyGold;
            if (energyGold > 1000) {
                energy = `${Math.floor(energyGold / 100) / 10}백만원`;
            } else if (energyGold > 10) {
                energy = `${Math.floor(energyGold / 10)}만원`;
            } else {
                energy = `${energyGold}천원`;
            }
            document.getElementById('energyGold').textContent = energy;

            // 최대 절감액
            const energyGoldMax = jsonData.energyGoldMax;
            if (energyGoldMax > 1000) {
                energy = `${Math.floor(energyGoldMax / 100) / 10}백만원`;
            } else if (energyGoldMax > 10) {
                energy = `${Math.floor(energyGoldMax / 10)}만원`;
            } else {
                energy = `${energyGoldMax}천원`;
            }
            document.getElementById('energyGoldMax').textContent = energy;
            //document.getElementById('energyDate').textContent = `${document.getElementById('mDate').value}월`;
        }
    }
};

vio.deskReady = function() {
    const dom = document,
        nowDate = new Date(),
        mDate = nowDate.toLocaleDateString('sv-SE'),
        mDateInput = dom.getElementById('mDate');

    mDateInput.max = mDate.substr(0, 7);
    mDateInput.value = mDate.substr(0, 7);

    dom.getElementById('facList').addEventListener('change', function() {
        vio.getData(1);
    });

    // 데스크 기능
    this._sheet.sortTag = 'eTime';
    this._sheet.sortAsc = 0;

    let dt = dom.getElementById('deskSort').children;
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        const ta = dt[ia];
        if (ta.getAttribute('data-sort')) {
            ta.addEventListener('click', function() {
                const _sheet = vio._sheet;
                if (_sheet.sortTag != this.getAttribute('data-sort')) {
                    this.parentElement.querySelector(`[data-sort="${_sheet.sortTag}"]`).classList.remove(vio._sheet.sortAsc ? 'asc' : 'desc');
                } else {
                    _sheet.sortAsc = _sheet.sortAsc ? 0 : 1;
                }
                _sheet.sortTag = this.getAttribute('data-sort');
                this.classList.toggle('asc', _sheet.sortAsc);
                this.classList.toggle('desc', !_sheet.sortAsc);
                vio.getData(1);
            });
        }
    }

    dt = dom.getElementById('deskTool').children;
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        const ta = dt[ia];
        switch (ta.getAttribute('data-act')) {
            case 'refresh':
                ta.addEventListener('click', function() {
                    location.reload();
                });
                break;
            case 'excel':
                ta.addEventListener('click', function() {
                    let facList = document.getElementById('facList'),
                        saveName = `[제어이력]${facList.options[facList.selectedIndex].text}.xlsx`;

                    let workbook = XLSX.utils.table_to_book(document.getElementById('deskTable')),
                        ws = workbook.Sheets['Sheet1'];
                    XLSX.writeFile(workbook, saveName);
                });
                break;
            case 'print':
                ta.addEventListener('click', function() {
                    const nWindow = window.open('', 'print');
                    nWindow.document.body.innerHTML = document.getElementById('deskTable').outerHTML;
                    nWindow.print();
                    nWindow.close();
                });
                break;
        }
    }

    this.getBase();
    this.getChartData();
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const today = new Date();

    const datepicker = new tui.DatePicker('#wrapper', {
        date: today,
        type: 'month',
        input: {
            element: '#mDate',
            format: 'yyyy-MM'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });
    datepicker.on('change', function() {
        vio.getChartData();
    });

    await vio.deskReady();

    if(sessionStorage.getItem('authIdn') === '1'){
        const element = document.getElementById('totalFrugal');
        element.classList.remove('disable');
        element.previousElementSibling.classList.remove('disable');
    }
});
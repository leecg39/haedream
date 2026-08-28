'use strict';

this._overChart = null;  // 차트관리용
vio._putEquipments = []; // 현재 선택된 설비 고유번호를 캐시
vio._equipMents = null; // 설비정보 캐시

vio.chart1 = function (legend, data) {
    if (this._overChart) {
        this._overChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart1', am4charts.XYChart);
    chart.colors.step = 2;
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'top';
    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    xAxis.dataFields.category = 'seq';
    xAxis.renderer.grid.template.location = 0;
    xAxis.renderer.minGridDistance = 40;
    xAxis.startLocation = 0.2;
    xAxis.endLocation = 0.8;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.renderer.labels.template.adapter.add('text', function (text) {
        return text + '[#a0a0a0]%[/]';
    });

    function createSeries(name, valueY) {
        const series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.categoryX = 'seq';
        series.tooltipText = '[#fff]{name} :[/] [#fff bold]{valueY.value}[/][#e0e0e0]%[/]';
        series.name = name;
        series.fillOpacity = 0.08;

        var bullet = series.bullets.push(new am4charts.CircleBullet());
        bullet.circle.strokeWidth = 2;
        bullet.circle.radius = 3;
        bullet.circle.fill = am4core.color('#fff');

        var bullethover = bullet.states.create('hover');
        bullethover.properties.scale = 1.6;
    }

    for (let k in legend) {
        createSeries(legend[k], k);
    }

    // createSeries('용해로','123');
    //chart.data =[{seq:'12.31',345:352,678:651,12345:723}];
    chart.data = data;

    this._overChart = chart;
};



vio.dataTrans = function (device, data, dayTotal) {
    const sDate = Math.floor(new Date(document.getElementById('sDate').value).getTime() / 1000) + this._zoneOffset * 3600,
        eDate = Math.floor(new Date(document.getElementById('eDate').value).getTime() / 1000) + this._zoneOffset * 3600 + 86400 - 1;

    if (sDate > eDate) {
        return false;
    }

    const timeData = {},
        sortList = [],
        top10 = [],
        chartData = [];

    for (let uTime = sDate; uTime < eDate; uTime += 86400) {
        const deviceData = [];
        if (data.hasOwnProperty(uTime)) {
            for (let pid in device) {
                if (data[uTime].hasOwnProperty(pid)) {
                    const uNo = data[uTime][pid];
                    deviceData.push([pid, uNo]);
                    device[pid].t += uNo; // 설비 전력량 합
                }
            }
        } else {
            for (let pid in device) {
                deviceData.push([pid, 0]);
            }
        }
        timeData[uTime] = deviceData;
    }

    // top 10 를 위한 목록
    for (let pid in device) {
        sortList.push({ pid: pid, un: device[pid].t });
    }
    sortList.sort(function (a, b) { return a.un == b.un ? 0 : a.un > b.un ? -1 : 1; });

    // top 10
    let out = '',
        topIndex = 0;
    for (const sortItem of sortList) {
        const dName = device[sortItem.pid].n;
        // 그래프용
        top10[sortItem.pid] = dName;
        // 부하율 정보
        out += `<div class="chartItem">
            <span class="chartItemLabel">${dName}</span>
            <span>${(sortItem.un / dayTotal.total * 100).toFixed(2)}%</span>
        </div>`;

        topIndex += 1;
        if(topIndex >= 10){
            break;
        }
    }
    document.getElementById('chart1Extend').innerHTML = out;

    // 날짜에 맞춰 데이터 변환
    for (let uTime in timeData) {
        const ta = { seq: this.echoDate('m.d', uTime) };
        for (let pid in top10) {
            for (let ia = 0; ia < timeData[uTime].length; ++ia) {
                const tb = timeData[uTime][ia];
                if (tb[0] == pid) {
                    ta[pid] = Math.floor(tb[1] / dayTotal[uTime] * 10000) / 100;
                }
            }
        }
        chartData.push(ta);
    }

    this.chart1(top10, chartData);
};


/*
설비부하율 비교요청
isInit 설비목록 초기화
*/
vio.getData = async function (isInit) {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'get',
            sDate: document.getElementById('sDate').value,
            eDate: document.getElementById('eDate').value,
            compare: this._putEquipments.toString()
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/tech-overs/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${this._accessToken}`,
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
                this.dataTrans(jsonData.device, jsonData.data, jsonData.dayTotal);
                if(isInit){
                    this.initEquipmentsRender(jsonData.device, jsonData.ableDevices.split(','));
                }
            }
        }
    }
};

/*
비교할 설비를 선택하거나 해제
pid 설비 고유번호
*/
vio.toggleEquipment = function (pid) {
    const index = this._putEquipments.indexOf(pid);

    if (index !== -1) {
        this._putEquipments.splice(index, 1);
        document.getElementById(`pid${pid}`).classList.remove('active');
    } else if (this._putEquipments.length < 10) { // 최대 10개 설비선택 제한
        this._putEquipments.push(pid);
        document.getElementById(`pid${pid}`).classList.add('active');
    }
};


/*
한번만 호출되어 설비목록을 선택할 수 있는 DOM 트리를 만들다
devices     설비정보 목록
ableEquipments 현재선택된 설비 고유번호 목록
*/
vio.initEquipmentsRender = function (devices, ableEquipments) {
    let out = '';

    // 오름차순 정렬
    const deviceEntries = Object.entries(devices);
    deviceEntries.sort((a, b) => {
        if (a[1].n < b[1].n) return -1;
        if (a[1].n > b[1].n) return 1;
        return 0;
    });

    for (const [pid, item] of deviceEntries) {
        out = `${out}
        <div class="itemLine">
            <span class="item ${ableEquipments.includes(pid) ? 'active' : ''}" id="pid${pid}" onclick="vio.toggleEquipment('${pid}')">${item.n}</span>
        </div>`;
    }

    // 현재 선택된 설비 고유번호를 캐시
    this._putEquipments = ableEquipments;

    document.getElementById('itemList').insertAdjacentHTML('beforeend', out);
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    // 기본값 정의를 위한 날짜 처리는 지난 16일 ~ 어제
    const eDate = new Date(),
        nowDate = new Date();

    nowDate.setDate(nowDate.getDate() - 1);
    eDate.setDate(eDate.getDate() - 1);
    new tui.DatePicker('#eDateWrapper', {
        date: nowDate,
        input: {
            element: '#eDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), eDate] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    nowDate.setDate(nowDate.getDate() - 15);
    new tui.DatePicker('#sDateWrapper', {
        date: nowDate,
        input: {
            element: '#sDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), eDate] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    // 검색버튼 처리
    document.getElementById('act').addEventListener('click', function () {
        vio.getData(false);
    });

    // 기본데이터 요청
    await vio.getData(true);
});
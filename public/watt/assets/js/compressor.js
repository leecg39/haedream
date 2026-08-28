'use strict';

vio._compressorChart = null;

vio.chartQuarterTime = function (data) {
    if (this._compressorChart) {
        this._compressorChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart2', am4charts.XYChart);
    chart.colors.list = [am4core.color('#8bc34a'), am4core.color('#f44336')];
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
    yAxis.layout = 'absolute';
    yAxis.title.text = '압력(bar)';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -50;

    const yAxis2 = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis2.tooltip.disabled = true;
    yAxis2.title.text = this._language == 'ko' ? '온도(℃)' : 'TEMPERATURE';
    yAxis2.title.dy = -40;
    yAxis2.renderer.opposite = true;

    const series = chart.series.push(new am4charts.LineSeries());
    series.dataFields.valueY = 'pressure';
    series.dataFields.categoryX = 'seq';
    series.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]bar[/]';
    series.name = '압력';
    series.tooltip.pointerOrientation = 'vertical';

    const series2 = chart.series.push(new am4charts.LineSeries());
    series2.dataFields.valueY = 'temperature';
    series2.dataFields.categoryX = 'seq';
    series2.tooltipText = '[#fff]{valueY.value}[/][#d0d0d0]℃[/]';
    series2.name = '온도';
    series2.tooltip.pointerOrientation = 'vertical';
    series2.yAxis = yAxis2;

    chart.data = data;

    this._compressorChart = chart;
};

// 주간, 월간 그래프
vio.randerSheet = function(dataTimes){
    const dateType = document.getElementById('dateType').value;

    let out = '';
    for(let unit in dataTimes){
        out = `${out}
        <tr>
            <th class="tLabel" data-t="s">${unit}</th>
            <td>${dataTimes[unit].watt}</td>
            <td>${dataTimes[unit].peak}</td>
            <td>${dataTimes[unit].pressure}</td>
            <td>${dataTimes[unit].temperature}</td>
            <td>${dataTimes[unit].rpm}</td>
        </tr>`;
    }
    document.getElementById('sheet').innerHTML = out;
    document.getElementById('sheetArea').classList.add('disable');
    document.getElementById('sheetUnitArea').classList.remove('disable');
};

// 일간 그래프
vio.randerSheetQuarter = function(dataTimes){
    let thisTime = Date.parse(`${document.getElementById('inputDate').value} 00:00`) / 1000;

    let sheetAM = document.getElementById('sheetAM').children,
        sheetPM = document.getElementById('sheetPM').children;

    for(let index = 0; index < 96; ++index){
        let elements;
        if(index < 48){
            elements = sheetAM[index].children;
        }else{
            elements = sheetPM[index % 48].children;
        }

        const Quarter = this.echoDate('h:i', thisTime);

        if(dataTimes.hasOwnProperty(Quarter)){
            elements[1].textContent = dataTimes[Quarter].watt;
            elements[2].textContent = dataTimes[Quarter].peak;
            elements[3].textContent = dataTimes[Quarter].pressure;
            elements[4].textContent = dataTimes[Quarter].temperature;
            elements[5].textContent = dataTimes[Quarter].rpm;

        }else{
            elements[1].textContent = '-';
            elements[1].textContent = '-';
            elements[1].textContent = '-';
            elements[1].textContent = '-';
            elements[1].textContent = '-';
        }
        thisTime += 900;
    }

    document.getElementById('sheetArea').classList.remove('disable');
    document.getElementById('sheetUnitArea').classList.add('disable');
};




vio.dataTrans = function(dateType, jsonData){
    const dataTimes = {}; // 시트용
    const transData = []; // 차트용

    // 컴프데이터
    for(const {pressure, temperature, rpm, unit} of jsonData.data){
        dataTimes[unit] = {
            pressure : pressure,
            temperature : temperature,
            rpm : rpm,
            watt : 0,
            peak : 0
        };
    }

    // 전력 데이터 합치기
    for(const {watt, peak, unit} of jsonData.power){
        if(dataTimes.hasOwnProperty(unit)){
            dataTimes[unit].watt = watt;
            dataTimes[unit].peak = peak;
        }else{
            dataTimes[unit] = {
                pressure : 0,
                temperature : 0,
                rpm : 0,
                watt : watt,
                peak : peak
            };
        }
    }

    // 없는 데이터가 있기 때문에 빈값 처리
    let thisTime = Date.parse(`${document.getElementById('inputDate').value} 00:00`) / 1000;
    if(dateType === 'monthly'){
        let monthDate = new Date(`${document.getElementById('inputDate').value.substr(0,7)}-01 00:00`),
            sTime = monthDate.getTime() / 1000,
            eTime = monthDate.setMonth(monthDate.getMonth() + 1) / 1000 - 86400;

        if(eTime > Date.now() / 1000){
            eTime = Date.now() / 1000;
        }

        for(let indexTime = sTime; indexTime <= eTime; indexTime += 86400){
            const unit = this.echoDate('m/d', indexTime);
            if(!dataTimes.hasOwnProperty(unit)){
                dataTimes[unit] = {
                    pressure : 0,
                    temperature : 0,
                    rpm : 0,
                    watt : 0,
                    peak : 0
                };
            }
        }
    }else if(dateType === 'weekly'){ // 일 ~ 토요일
        const weekIndex = new Date(`${document.getElementById('inputDate').value} 00:00`).getDay();
        let indexTime = thisTime - 86400 * weekIndex;

        for(let index = 0; index < 7; ++index){
            const unit = this.echoDate('m/d', indexTime);
            if(!dataTimes.hasOwnProperty(unit)){
                dataTimes[unit] = {
                    pressure : 0,
                    temperature : 0,
                    rpm : 0,
                    watt : 0,
                    peak : 0
                };
            }

            indexTime += 86400;
        }
    }else{
        for(let index = 0; index < 96; ++index){
            const unit = this.echoDate('h:i', thisTime);
            if(!dataTimes.hasOwnProperty(unit)){
                dataTimes[unit] = {
                    pressure : 0,
                    temperature : 0,
                    rpm : 0,
                    watt : 0,
                    peak : 0
                };
            }

            thisTime += 900;
        }
    }


    Object.keys(dataTimes).sort().forEach(function(unit){
        transData.push(
            {seq : unit, pressure : dataTimes[unit].pressure, temperature : dataTimes[unit].temperature}
        );
    });

    this.chartQuarterTime(transData);
    if(dateType === 'daily'){
        this.randerSheetQuarter(dataTimes);
    }else{
        this.randerSheet(dataTimes);
    }
};


vio.getData = async function () {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'chart',
            pid: document.getElementById('lpList').value,
            date: document.getElementById('inputDate').value,
            dateType: document.getElementById('dateType').value
        },
        queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/compressor/${this._fid}?${queryString}`, {
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
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    this.dataTrans(params.dateType, jsonData);
                    break;
                default:
                    this.toast({ memo: '실행할 수 있는 데이터가 없습니다.' });
            }
        }
    }
};


vio.getBase = async function () {
    const params = {
        cf: 'base',
    },
    queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/compressor/${this._fid}?${queryString}`, {
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
                this.toast({ memo: '권한이 없습니다.' });
                break;
            case 1:
                let out = '';
                for (const {pid, pName} of jsonData.data) {
                    out = `${out}<option value="${pid}">${pName}</option>`;
                }
                if(out !== ''){
                    document.getElementById('lpList').innerHTML = out;
                    this.getData();
                }else{
                    // 샘플
                    this.chartQuarterTime([{"seq":"00:00","pressure":6.97,"temperature":75.9},{"seq":"00:15","pressure":6.99,"temperature":75.4},{"seq":"00:30","pressure":6.98,"temperature":75.67},{"seq":"00:45","pressure":6.98,"temperature":75.54},{"seq":"01:00","pressure":6.99,"temperature":75.68},{"seq":"01:15","pressure":6.98,"temperature":75.78},{"seq":"01:30","pressure":6.98,"temperature":75.63},{"seq":"01:45","pressure":6.98,"temperature":75.88},{"seq":"02:00","pressure":6.97,"temperature":76.45},{"seq":"02:15","pressure":6.91,"temperature":76.94},{"seq":"02:30","pressure":6.87,"temperature":77},{"seq":"02:45","pressure":6.91,"temperature":76.95},{"seq":"03:00","pressure":6.88,"temperature":76.87},{"seq":"03:15","pressure":6.87,"temperature":76.89},{"seq":"03:30","pressure":6.89,"temperature":76.94},{"seq":"03:45","pressure":6.88,"temperature":76.96},{"seq":"04:00","pressure":6.9,"temperature":76.97},{"seq":"04:15","pressure":6.89,"temperature":76.82},{"seq":"04:30","pressure":6.9,"temperature":76.9},{"seq":"04:45","pressure":6.87,"temperature":76.83},{"seq":"05:00","pressure":6.88,"temperature":76.29},{"seq":"05:15","pressure":6.88,"temperature":76.92},{"seq":"05:30","pressure":6.89,"temperature":76.93},{"seq":"05:45","pressure":6.89,"temperature":76.85},{"seq":"06:00","pressure":6.89,"temperature":76.92},{"seq":"06:15","pressure":6.88,"temperature":76.96},{"seq":"06:30","pressure":6.88,"temperature":76.94},{"seq":"06:45","pressure":6.89,"temperature":76.9},{"seq":"07:00","pressure":6.87,"temperature":76.61},{"seq":"07:15","pressure":6.88,"temperature":76.78},{"seq":"07:30","pressure":6.92,"temperature":76.12},{"seq":"07:45","pressure":6.98,"temperature":75.78},{"seq":"08:00","pressure":6.99,"temperature":75.56},{"seq":"08:15","pressure":6.98,"temperature":75.42},{"seq":"08:30","pressure":6.98,"temperature":76.11},{"seq":"08:45","pressure":6.93,"temperature":76.61},{"seq":"09:00","pressure":6.85,"temperature":77},{"seq":"09:15","pressure":6.86,"temperature":77},{"seq":"09:30","pressure":6.86,"temperature":77},{"seq":"09:45","pressure":6.88,"temperature":77},{"seq":"10:00","pressure":6.88,"temperature":76.99},{"seq":"10:15","pressure":6.87,"temperature":77},{"seq":"10:30","pressure":6.9,"temperature":76.97},{"seq":"10:45","pressure":6.87,"temperature":77},{"seq":"11:00","pressure":6.87,"temperature":76.99},{"seq":"11:15","pressure":6.86,"temperature":77},{"seq":"11:30","pressure":6.88,"temperature":77.14},{"seq":"11:45","pressure":6.85,"temperature":77.34},{"seq":"12:00","pressure":6.87,"temperature":77.31},{"seq":"12:15","pressure":6.87,"temperature":77},{"seq":"12:30","pressure":6.95,"temperature":77.3},{"seq":"12:45","pressure":6.98,"temperature":76.47},{"seq":"13:00","pressure":6.98,"temperature":75.97},{"seq":"13:15","pressure":6.98,"temperature":76.02},{"seq":"13:30","pressure":6.93,"temperature":77.56},{"seq":"13:45","pressure":6.85,"temperature":78},{"seq":"14:00","pressure":6.85,"temperature":78},{"seq":"14:15","pressure":6.85,"temperature":77.94},{"seq":"14:30","pressure":6.86,"temperature":77.28},{"seq":"14:45","pressure":6.86,"temperature":77.53},{"seq":"15:00","pressure":6.83,"temperature":77},{"seq":"15:15","pressure":6.86,"temperature":77.04},{"seq":"15:30","pressure":6.9,"temperature":77.14}]);
                }
                break;
            default:
                this.toast({ memo: '실행할 수 있는 데이터가 없습니다.' });
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const today = new Date();

    new tui.DatePicker('#sDateWrapper', {
        date: today,
        input: {
            element: '#inputDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    document.getElementById('act').addEventListener('click', function () {
        vio.getData();
    });

    document.getElementById('actExcelSave').addEventListener('click', function () {
        const dateType = document.getElementById('dateType').value,
            saveName = `${document.title}.xlsx`;

        const workbook = XLSX.utils.book_new();

        let ws;
        if(dateType === 'daily'){
            ws = XLSX.utils.table_to_sheet(document.getElementById('sheetAM').parentElement);
            XLSX.utils.sheet_add_dom(ws, document.getElementById('sheetPM').parentElement, { origin: -1 });
        }else{
            ws = XLSX.utils.table_to_sheet(document.getElementById('sheet').parentElement);
        }
        XLSX.utils.book_append_sheet(workbook, ws, 'Sheet1');

        XLSX.writeFile(workbook, saveName);
    });

    vio.getBase();
});
'use strict';

vio._pid = [];
vio._device = [];
vio._deviceIndex = [];
vio._overChart = null;

//chart({123:'다이케스팅'},[{seq:'12.20',345:352,678:651,12345:723});
vio.chart1 = function(legend, data, emLabel) {
    if (this._overChart) {
        this._overChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart1', am4charts.XYChart);
    chart.colors.step = 2;
    chart.legend = new am4charts.Legend();
    chart.legend.paddingBottom = -20;
    chart.cursor = new am4charts.XYCursor();

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis());
    xAxis.dataFields.category = 'seq';
    xAxis.renderer.grid.template.location = 0;
    xAxis.renderer.minGridDistance = 40;

    if (this._sChartType) {
        xAxis.startLocation = 0.4;
        xAxis.endLocation = 0.8;
    }

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.min = 0;
    yAxis.renderer.labels.template.adapter.add('text', function(text) {
        return text + ` [#a0a0a0 font-size:.86rem]${emLabel}[/]`;
    });

    function createSeries(name, valueY) {
        const series = chart.series.push(vio._sChartType ? new am4charts.LineSeries() : new am4charts.ColumnSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.categoryX = 'seq';
        series.tooltipText = `[#fff]{name} :[/] [#fff bold]{valueY.value}[/] [#e0e0e0 font-size:.86rem]${emLabel}[/]`;
        series.tooltip.background.pointerLength = 50;
        series.tooltip.background.fillOpacity = 0.5;
        series.name = name;

        if (vio._sChartType) {
            series.fillOpacity = 0.08;

            var bullet = series.bullets.push(new am4charts.CircleBullet());
            bullet.circle.strokeWidth = 2;
            bullet.circle.radius = 3;
            bullet.circle.fill = am4core.color('#ffffff');

            var bullethover = bullet.states.create('hover');
            bullethover.properties.scale = 1.6;
        }
    }

    for (let k in legend) {
        createSeries(legend[k], k);
    }
    chart.data = data;

    this._overChart = chart;
};

vio.kpiTrans = function(j) {
    let pidChart = {},
        chart = [],
        legend = {},
        timeLabel = '',
        emLabel = '',
        out = '',
        ic = 0,
        sDate;

    switch (this._sDataType) {
        case 1:
            emLabel = 'kWh';
            break;
        case 2:
            emLabel = 'A';
            break;
        case 3:
            if (this._sTimeType == 0) {
                emLabel = 'kgCO₂';
            } else {
                emLabel = 'tCO₂';
            }
            break;
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
            emLabel = '';
            break;
        default:
            emLabel = 'kW';
    }

    // init
    switch (this._sTimeType) {
        case 1: // day
            timeLabel = '날짜';
            ic = this._sDateTime;
            while (ic <= this._eDateTime) {
                pidChart[ic] = {seq: this.echoDate('m.d', ic)};
                for (let ia = 0, th = this._pid.length; ia < th; ++ia) {
                    pidChart[ic][this._pid[ia]] = 0;
                }
                ic += 86400;
            }
            break;
        case 2: // month
            timeLabel = '날짜(월)';
            sDate = new Date(this._sDateTime * 1000);
            sDate.setDate(1);
            ic = this._eDateTime * 1000;
            while (sDate.getTime() <= ic) {
                const ctime = sDate.getTime() / 1000;
                pidChart[ctime] = {seq: sDate.toLocaleDateString('sv-SE').substr(0, 7).replace('-', '.')};
                for (let ia = 0, th = this._pid.length; ia < th; ++ia) {
                    pidChart[ctime][this._pid[ia]] = 0;
                }
                sDate.setMonth(sDate.getMonth() + 1);
            }
            break;
        case 3: // year
            timeLabel = '날짜(년)';
            sDate = new Date(this._sDateTime * 1000);
            sDate.setMonth(0);
            sDate.setDate(1);
            ic = this._eDateTime * 1000;
            while (sDate.getTime() <= ic) {
                pidChart[sDate.getFullYear()] = {seq: sDate.getFullYear()};
                for (let ia = 0, th = this._pid.length; ia < th; ++ia) {
                    pidChart[sDate.getFullYear()][this._pid[ia]] = 0;
                }
                sDate.setFullYear(sDate.getFullYear() + 1);
            }
            break;
        default: // hour
            timeLabel = '시간';
            this._eDateTime += 86400;
            ic = this._sDateTime;
            while (ic < this._eDateTime) {
                pidChart[ic] = {seq: new Date(ic * 1000).getHours() + 1};
                for (let ia = 0, th = this._pid.length; ia < th; ++ia) {
                    pidChart[ic][this._pid[ia]] = 0;
                }
                ic += 3600;
            }
    }

    for (let ia = 0; ia < this._pid.length; ++ia) {
        const pid = this._pid[ia];
        legend[pid] = this._device[pid];
    }

    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia];

        if (pidChart.hasOwnProperty(ta.cDate)) {
            switch (this._sDataType) {
                case 0: // 최대수요
                    pidChart[ta.cDate][ta.pid] = (ta.cVal * 0.004).toFixed(2); // wh -> kw
                    break;
                case 1: // 유효전력
                    if (this._sTimeType == 2 || this._sTimeType == 3) { // 월별데이터는 kwh
                        pidChart[ta.cDate][ta.pid] = ta.cVal;
                    } else {
                        pidChart[ta.cDate][ta.pid] = (ta.cVal * 0.001).toFixed(2); // wh ->kwh
                    }
                    break;
                case 2: // 전류
                    pidChart[ta.cDate][ta.pid] = (ta.cVal * 0.01).toFixed(2);
                    break;
                case 3: // 온실가실배출량
                    if (this._sTimeType == 2 || this._sTimeType == 3) { // 월별데이터는 kwh
                        pidChart[ta.cDate][ta.pid] = (ta.cVal * 0.001 * this._setToCO2).toFixed(2); // kWh -> tCO2
                    } else if (this._sTimeType == 1) {
                        pidChart[ta.cDate][ta.pid] = (ta.cVal * 0.000001 * this._setToCO2).toFixed(2); // wh ->kwh -> tCO2
                    } else {
                        pidChart[ta.cDate][ta.pid] = (ta.cVal * 0.001 * this._setToCO2).toFixed(2); // wh ->kwh -> kgCO2
                    }
                    break;
                default:
                    if (this._sTimeType == 2 || this._sTimeType == 3) {
                        pidChart[ta.cDate][ta.pid] = ta.cVal;
                    } else {
                        pidChart[ta.cDate][ta.pid] = (ta.cVal * 0.001).toFixed(2);
                    }
            }
        }
    }

    // 시트 라벨
    out = `<thead><tr><th>${timeLabel}</th>`;
    for (let ia = 0, th = this._pid.length; ia < th; ++ia) {
        out += `<th>${this._device[this._pid[ia]]}</th>`;
    }
    out += '<th>합계</th></tr></thead><tbody>';

    ic = 0;
    for (let time in pidChart) {
        // 그래프 데이터
        chart[ic++] = pidChart[time];

        // 시트 데이터
        switch (this._sTimeType) {
            case 1:
                out += `<tr><th>${this.echoDate('m.d', time)}</th>`;
                break;
            case 2:
            case 3:
                out += `<tr><th>${pidChart[time].seq}</th>`;
                break;
            default:
                out += `<tr><th>${this.echoDate('m.d', time)} ${pidChart[time].seq.toString().padStart(2, '0')}:00</th>`;
        }

        let sumData = 0;
        for (let pid in pidChart[time]) {
            if (pid == 'seq') {
                continue;
            }
            out += `<td>${this.echoNumber(pidChart[time][pid])}</td>`;
            sumData += Number(pidChart[time][pid]);
        }
        out += `<td>${this.echoNumber(sumData.toFixed(2))}</td></tr>`;
    }
    out += '</tbody>';
    document.getElementById('sheetData').innerHTML = out;
    this.chart1(legend, chart, emLabel);
};

vio.getKpi = async function() {
    this._sTimeType = Number(document.getElementById('sTimeType').value);
    this._sDataType = Number(document.getElementById('sDataType').value);
    this._sDate = document.getElementById('sDate').value;
    this._eDate = document.getElementById('eDate').value;
    this._sChartType = document.getElementById('sChartType').value == 1 ? true : false;
    this._sDateTime = new Date(this._sDate).getTime() * 0.001 + this._zoneOffset * 3600;
    this._eDateTime = new Date(this._eDate).getTime() * 0.001 + this._zoneOffset * 3600;

    if ([4, 5, 6, 7, 8].indexOf(this._sDataType) !== -1) {
        document.getElementById('sTimeType').value = 1;
        this._sTimeType = 1;
    }

    // 시간별 최대하루, 일별 최대한달, 월별 최대일년, 연별 최대5년
    if (this._sTimeType == 0 && this._sDate != this._eDate) {
        this.toast({memo: '시간별 조회기간은 같은 기간(하루) 조회 가능합니다.'});
    } else if (this._sTimeType == 1 && this._sDateTime + 86400 * 31 <= this._eDateTime) {
        this.toast({memo: '일별 조회기간은 최대 한달까지 조회 가능합니다.'});
    } else if (this._sTimeType == 2 && this._sDateTime + 86400 * 365 <= this._eDateTime) {
        this.toast({memo: '월별 조회기간은 최대 1년까지 조회 가능합니다.'});
    } else if (this._sTimeType == 3 && this._sDateTime + 86400 * 365 * 3 <= this._eDateTime) {
        this.toast({memo: '연별 조회기간은 최대 3년까지 조회 가능합니다.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        // 선택한 기기 정렬
        const pidArea = [];
        for (let ia = 0, th = this._deviceIndex.length; ia < th; ++ia) {
            const pid = this._deviceIndex[ia].pid;
            if (this._pid.indexOf(pid) !== -1) {
                pidArea.push(pid);
            }
        }
        pidArea.sort(function(a, b) {
            return a - b
        });
        this._pid = pidArea;

        const res = await fetch(`api/kpis/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"kpi","pid":"${this._pid.toString()}","sDateTime":"${this._sDateTime}","eDateTime":"${this._eDateTime}","sTimeType":"${this._sTimeType}","sDataType":"${this._sDataType}"}`
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
                    this.kpiTrans(jsonData.data);
                    break;
                default:
                    this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
            }
        }
    }
};

vio.setDevice = function(pid) {
    const index = this._pid.indexOf(pid);
    if (index !== -1) {
        this._pid.splice(index, 1);
        document.getElementById('pid' + pid).classList.remove('active');
        localStorage.setItem('hisEquipments', this._pid.toString());
    } else if (this._pid.length < 12) { // 최대 12개 설비선택 제한
        this._pid.push(pid);
        document.getElementById('pid' + pid).classList.add('active');
        localStorage.setItem('hisEquipments', this._pid.toString());
    }
};

vio.dataTrans = function(j) {
    let out = '',
        device = {},
        deviceIndex = [];

    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia];
        ta.lp_name = this.catToXLSX(ta.lp_name);
        out += `<div class="itemLine">
                    <span class="item" id="pid${ta.pid}" onclick="vio.setDevice('${ta.pid}')">${ta.lp_name}</span>
                </div>`;
        device[ta.pid] = ta.lp_name;
        deviceIndex[ia] = {pid: `${ta.pid}`, name: ta.lp_name};
    }
    this._device = device;
    this._deviceIndex = deviceIndex;

    document.getElementById('itemList').insertAdjacentHTML('beforeend', out);


    if (j.length != 0) {
        // 이전 선택값 확인
        let localHisEquipments = localStorage.getItem('hisEquipments') ?? '';
        if(localHisEquipments !== ''){
            localHisEquipments = localHisEquipments.split(',');
            for(const pid of localHisEquipments){
                this.setDevice(pid);
            }
        }else{
            // 샘플 랜덤선택
            j.sort(function() {
                return Math.random() - 0.5
            });
            for (let ia = 0; ia < 8 && ia < j.length; ++ia) {
                this.setDevice(`${j[ia].pid}`);
            }
        }
        this.getKpi();
    }
};

vio.getData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/kpis/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: '{"cf":"get"}'
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
                    this.dataTrans(jsonData.data);
                    break;
                default:
                    this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
            }
        }
    }
};

vio.popSave = async function(j) {
    let emLabel = '',
        reg;

    switch (this._popLabel) {
        case 'amount':
            //emLabel ='생산\\(수량\\)';
            break;
        case 'wTime':
            //emLabel ='조업시간';
            break;
        case 'cost':
            //emLabel ='원가\\(원\\)';
            break;
        case 'take':
            //emLabel ='매출\\(원\\)';
            break;
        default:
        //emLabel ='목표\\(kWh\\)';
    }

    reg = new RegExp('일' + emLabel, 'ig');

    for (let ia = 0, th = j.length; ia < th; ++ia) {
        delete j[ia]['설비'];
    }

    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/kpis/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"set","dataMonth":"${document.getElementById('etcDate').value}","dataType":"${this._popLabel}","excel":${JSON.stringify(j).replace(reg, '')}}`
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
                case 3:
                    this.toast({memo: '올바른 데이터 엑셀파일을 등록해주세요.'});
                    break;
                case 1:
                    this.toast({memo: '저장 되었습니다.'});
                    break;
                default:
                    this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
            }
        }
    }
};

vio.popTrans = function(j) {
    const popDate = new Date(this._popTime * 1000),
        month = popDate.getMonth() + 1,
        eDay = new Date(popDate.getFullYear(), month, 0).getDate(),
        data = {};

    let out = '',
        popLabel = '',
        emLabel = '';
    out = `<thead><tr><th class="fixId">ID</th><th class="fixName">설비</th>`;

    switch (this._popLabel) {
        case 'amount':
            popLabel = '생산량';
            //emLabel ='생산(수량)';
            break;
        case 'defective':
            popLabel = '전체생산량';
            //emLabel ='생산(수량)';
            break;
        case 'wTime':
            popLabel = 'Effec. Hrs';
            //emLabel ='조업시간';
            break;
        case 'cost':
            popLabel = '생산원가';
            //emLabel ='원가(원)';
            break;
        case 'take':
            popLabel = 'PS Del.';
            //emLabel ='매출(원)';
            break;
        default:
            popLabel = '목표량';
        //emLabel ='목표(kWh)';
    }
    document.getElementById('modalTitle').textContent = popLabel + ' 정보입력';

    // init
    for (let ia = 1; ia <= eDay; ++ia) {
        const cTime = this._popTime + (ia - 1) * 86400;
        data[cTime] = {seq: `${month}.${ia}`};
        for (let k in this._device) {
            data[cTime][k] = 0;
        }
        out += `<th class="fixDay">${ia}일${emLabel}</th>`;
    }
    out += '</tr></thead><tbody>';

    // 데이터 적용
    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia];
        data[ta.ctime][ta.pid] = ta.cVal;
    }

    // 시트작성
    for (let ia = 0, th = this._deviceIndex.length; ia < th; ++ia) {
        const ta = this._deviceIndex[ia];
        out += `<tr><th class="fixId">${ta.pid}</th><th class="fixName">${ta.name}</th>`;
        for (let ib = 1; ib <= eDay; ++ib) {
            const cTime = this._popTime + (ib - 1) * 86400;
            out += `<td>${data[cTime][ta.pid]}</td>`;
        }
        out += '</tr>';
    }
    out += '</tbody>';

    document.getElementById('etcData').innerHTML = out;
    document.getElementById('modal').classList.remove('disable');
};

vio.setPop = async function(j) {
    this._popLabel = j;
    this._popTime = new Date(document.getElementById('etcDate').value + '-01').getTime() * 0.001 + this._zoneOffset * 3600;

    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/kpis/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"data","dataType":"${j}","dateTime":"${this._popTime}"}`
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
                    this.popTrans(jsonData.data);
                    break;
                default:
                    this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
            }
        }
    }
};

vio.popExcelToSheet = function(j) {
    let out = '',
        outHead = '';

    for (let ia = 0, th = j.length; ia < th; ++ia) {
        if (ia == 0) {
            for (let k in j[ia]) {
                if (k == 'ID') {
                    outHead += `<th class="fixId">${k}</th>`;
                } else if (k == '설비') {
                    outHead += `<th class="fixName">${k}</th>`;
                } else {
                    outHead += `<th class="fixDay">${k}</th>`;
                }
            }
        }
        out += '<tr>';
        for (let k in j[ia]) {
            if (k == 'ID') {
                out += `<th class="fixId">${j[ia][k]}</th>`;
            } else if (k == '설비') {
                out += `<th class="fixName">${j[ia][k]}</th>`;
            } else {
                out += `<td>${j[ia][k]}</td>`;
            }
        }
        out += '</tr>';
    }
    document.getElementById('etcData').innerHTML = `<thead><tr>${outHead}</tr></thead><tbody>${out}</tbody>`;
};

vio.deskReady = function() {
    const dom = document;

    dom.getElementById('actExcelSave').addEventListener('click', function() {
        let workbook = XLSX.utils.table_to_book(document.getElementById('sheetData')),
            ws = workbook.Sheets['Sheet1'];
        XLSX.writeFile(workbook, 'KPI비교분석.xlsx');
    });

    dom.getElementById('act').addEventListener('click', function() {
        vio.getKpi();
    });

    // 정보입력 팝업
    for (let ia = 1; ia <= 6; ++ia) {
        dom.getElementById('actAir' + ia).addEventListener('click', function() {
            vio.setPop(this.getAttribute('data-type'));
        });
    }
    // 팝업 시트저장
    dom.getElementById('actExcelSaveEtc').addEventListener('click', function() {
        let workbook = XLSX.utils.table_to_book(document.getElementById('etcData')),
            ws = workbook.Sheets['Sheet1'];
        XLSX.writeFile(workbook, `${document.getElementById('modalTitle').textContent}${document.getElementById('etcDate').value}.xlsx`);
    });
    // 팝업 기간조회
    dom.getElementById('etcAct').addEventListener('click', function() {
        vio.setPop(vio._popLabel);
    });
    dom.getElementById('actExcelImportEtc').addEventListener('click', function() {
        this.nextElementSibling.click();
    });
    dom.getElementById('etcFile').addEventListener('change', function() {
        const reader = new FileReader();
        reader.onload = function() {
            const fileData = reader.result;
            const wb = XLSX.read(fileData, {type: 'binary'});
            wb.SheetNames.forEach(function(sheetName) {
                vio.popExcelToSheet(XLSX.utils.sheet_to_json(wb.Sheets[sheetName]));
            });
        };

        if (this.files.length != 0) {
            reader.readAsBinaryString(this.files[0]);
        }
    });
    // 팝업 엑셀데이터를 서버에 저장
    dom.getElementById('etcActSave').addEventListener('click', function() {
        const input = this.previousElementSibling;
        const reader = new FileReader();
        reader.onload = function() {
            const fileData = reader.result;
            const wb = XLSX.read(fileData, {type: 'binary'});
            wb.SheetNames.forEach(function(sheetName) {
                vio.popSave(XLSX.utils.sheet_to_json(wb.Sheets[sheetName]));
            });
        };

        if (input.files.length == 0) {
            vio.toast({memo: document.getElementById('modalTitle').textContent + ' 데이터 엑셀파일을 먼저 등록해주세요.'});
        } else {
            reader.readAsBinaryString(input.files[0]);
        }
    });

    dom.getElementById('modalActClose').addEventListener('click', function() {
        document.getElementById('modal').classList.add('disable');
    });


    //dom.getElementById('actAir2').textContent = 'Effec. Hrs';
    //dom.getElementById('actAir4').textContent = 'PS Del.';

    this.getData();
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const today = new Date();
    today.setDate(today.getDate() - 1);

    new tui.DatePicker('#sDateWrapper', {
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
    new tui.DatePicker('#eDateWrapper', {
        date: today,
        input: {
            element: '#eDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    await vio.deskReady();
});

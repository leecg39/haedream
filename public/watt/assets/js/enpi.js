'use strict'

vio._enpiEm = [
    // a1: toe 석유환산톤, a2, a3:tCO₂ 이산화탄소 배출계수
    {name: '전력(소비기준)', a1: 0.00023, a2: 100, a3: 0.00047, em: 'kWh'},
    {name: 'LNG', a1: 0.00102, a2: 100, a3: 0.00215, em: 'Nm³'},
    {name: 'LPG', a1: 0.00152, a2: 100, a3: 0.00373, em: 'Nm³'},
    {name: '경유', a1: 0.00090, a2: 100, a3: 0.00260, em: 'ℓ'},
    {name: '부생연료 2호', a1: 0.00095, a2: 100, a3: 0.00302, em: 'ℓ'}
];
vio._enpiChart = null;
vio._energyType = 0;

vio.chartEnPI = function(j) {
    if (this._enpiChart) {
        this._enpiChart.dispose();
    }
    am4core.useTheme(am4themes_dark);

    const chart = am4core.create('chart1', am4charts.XYChart);
    chart.paddingTop = 30;
    chart.colors.list = [am4core.color('#57c5f6'), am4core.color('#a857f6'), am4core.color('#8bc34a')];
    chart.legend = new am4charts.Legend();
    chart.legend.position = 'bottom';
    chart.legend.paddingBottom = -20;

    chart.cursor = new am4charts.XYCursor();

    if([97,105,141].includes(Number(vio._fid))){
        const label = chart.createChild(am4core.Label);
        label.text = "예상사용량 = 지난 120일간 요일별 (최대사용량 + 평균사용량) / 2";
        label.fontSize = 12;
        label.align = "center";
        label.isMeasured = false;
        label.horizontalCenter = "right";
        label.x = am4core.percent(100);
        label.y = -24;
        label.fill = am4core.color('#8bc34a');
    }

    const xAxis = chart.xAxes.push(new am4charts.CategoryAxis())
    xAxis.dataFields.category = 'seq'
    xAxis.dataFields.date = 'day';
    xAxis.dateFormatter.dateFormat = 'MM.dd';
    xAxis.renderer.minGridDistance = 50;
    xAxis.renderer.grid.template.location = 0;

    const yAxis = chart.yAxes.push(new am4charts.ValueAxis());
    yAxis.tooltip.disabled = true;
    yAxis.layout = 'absolute';
    yAxis.title.text = '에너지원(toe)';
    yAxis.title.rotation = 0;
    yAxis.title.align = 'center';
    yAxis.title.valign = 'top';
    yAxis.title.dy = -30;

    const series = chart.series.push(new am4charts.ColumnSeries());
    series.dataFields.valueY = 'out';
    series.dataFields.categoryX = 'seq';
    series.tooltipText = '[#fff]{name}: {valueY.value}[/][#d0d0d0]toe[/]';
    series.name = '에너지 절감량';
    series.tooltip.pointerOrientation = 'vertical';

    function createSeries(name, valueY) {
        const series = chart.series.push(new am4charts.LineSeries());
        series.dataFields.valueY = valueY;
        series.dataFields.categoryX = 'seq';
        series.tooltipText = '[#fff]{name}: {valueY.value}[/][#d0d0d0]toe[/]';
        series.name = name;
        series.tooltip.pointerOrientation = 'vertical';

        var bullet = series.bullets.push(new am4charts.CircleBullet());
        bullet.circle.strokeWidth = 1;
        bullet.circle.radius = 2;
        bullet.circle.fill = am4core.color('#ffffff');

        var bullethover = bullet.states.create('hover');
        bullethover.properties.scale = 2;
    }

    createSeries('실제 사용량', 'real');
    createSeries('예상 사용량', 'predict');

    //chart.data =[{seq:'02.01',real:352,predict:651,out:23},{seq:'02.02',real:352,predict:646,out:28},{seq:'02.03',real:352,predict:645,out:49},{seq:'02.04',real:372,predict:683,out:32}];
    chart.data = j;

    this._enpiChart = chart;
};

vio.dataExamTrans = function(j) {
    const dom = document,
        tMonth = new Date(`${document.getElementById('inputMonth').value}-01 00:00`),
        sDate = tMonth.getTime() / 1000,
        eDate = tMonth.setMonth(tMonth.getMonth() + 1) / 1000 - 1,
        enpiValue = this._enpiEm[0].a1,
        chartData = [];

    let out = '',
        pwLast = 0,
        pwThis = 0;

    for (let uTime = sDate; uTime < eDate; uTime += 86400) {
        const date = this.echoDate('y-m.d', uTime),
            weekMax = j.weekMax[new Date(uTime * 1000).getDay()] * enpiValue / 1000;
        let kWh = 0,
            toe = 0,
            tco = 0,
            HDD = 0,
            CDD = 0,
            outPoint = 0;

        if (j.data.hasOwnProperty(uTime)) {
            kWh = Math.round(j.data[uTime].energy);
            toe = kWh * enpiValue;
            outPoint = j.data[uTime].amount;
            chartData.push({
                seq: date.substr(5),
                real: toe.toFixed(4),
                predict: weekMax.toFixed(4),
                out: (weekMax - toe).toFixed(4)
            });
        } else {
            chartData.push({seq: date.substr(5), real: 0, predict: weekMax.toFixed(4), out: 0});
        }

        // 냉난방도일
        if (j.degree.hasOwnProperty(uTime)) {
            HDD = j.degree[uTime].HDD;
            CDD = j.degree[uTime].CDD;
        }

        out += `
            <tr>
                <th class="tLabel">${date.replace('.', '-')}</th>
                <td>${this.echoNumber(kWh)}</td>
                <td>kWh</td>
                <td>${toe.toFixed(2)}</td>
                <td>toe</td>
                <td>${tco.toFixed(2)}</td>
                <td>tCO₂</td>
                <td>${outPoint}</td>
                <td>${HDD}</td>
                <td>${CDD}</td>
            </tr>`;
    }
    this.chartEnPI(chartData);
    dom.getElementById('itemList').innerHTML = out;

    // 이번달 에너지 사용량
    dom.getElementById('enpiThis').textContent = j.energySafe.toeMonth.toFixed(2);

    out = '-';
    let dt = dom.getElementById('enpiLastWeek');
    if (j.energySafe.weekRate < 0) {
        out = `▼${Math.abs(j.energySafe.weekRate).toFixed(2)}%`;
    } else {
        out = `▲${Math.abs(j.energySafe.weekRate).toFixed(2)}%`;
        dt.classList.add('enpiUp');
    }
    dt.textContent = out;

    out = '-';
    dt = dom.getElementById('enpiLastMonth');
    if (j.energySafe.lastRate < 0) {
        out = `▼${Math.abs(j.energySafe.lastRate).toFixed(2)}%`;
    } else {
        out = `▲${Math.abs(j.energySafe.lastRate).toFixed(2)}%`;
        dt.classList.add('enpiUp');
    }
    dt.textContent = out;

    out = '-';
    dt = dom.getElementById('enpiLastYear');
    if (j.energySafe.lastYearRate < 0) {
        out = `▼${Math.abs(j.energySafe.lastYearRate).toFixed(2)}%`;
    } else {
        out = `▲${Math.abs(j.energySafe.lastYearRate).toFixed(2)}%`;
        dt.classList.add('enpiUp');
    }
    dt.textContent = out;

    // 이번달 에너지 절감량
    dom.getElementById('enpiEffect').textContent = j.energySafe.toeSafe.toFixed(2);
    // 온실가스 절감량
    dom.getElementById('enpiEffectGas').textContent = j.energySafe.co2Safe.toFixed(2);
    // 절감비용 백만원
    dom.getElementById('enpiEffectMoney').textContent = j.energySafe.goldSafe.toFixed(2);
    // 누적 개선율
    dom.getElementById('enpiEffectAccu').textContent = j.energySafe.safeRate.toFixed(2);
};

vio.getDataExam = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'get'
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/enpis/${this._fid}?${queryString}`, {
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
                this.dataExamTrans(jsonData);
            }
        }
    }
};

// 에너지 단위변환 테이블
vio.enpiTrans = function(j) {
    const tMonth = new Date(`${document.getElementById('inputMonth').value}-01 00:00`),
        sDate = tMonth.getTime() / 1000,
        eDate = tMonth.setMonth(tMonth.getMonth() + 1) / 1000 - 1,
        enpiEm = this._enpiEm[this._energyType],
        chartData = [];

    let out = '',
        pwLast = 0,
        pwThis = 0;

    for (let uTime = sDate; uTime < eDate; uTime += 86400) {
        const date = this.echoDate('y-m.d', uTime),
            weekMax = j.weekMax[new Date(uTime * 1000).getDay()] * enpiEm.a1 / 1000;
        let kWh = 0,
            toe = 0,
            tco = 0,
            HDD = 0,
            CDD = 0,
            outPoint = 0;

        if (j.data.hasOwnProperty(uTime)) {
            kWh = Math.round(j.data[uTime].energy);
            toe = kWh * enpiEm.a1;
            tco = kWh * enpiEm.a3;
            outPoint = j.data[uTime].amount;
            chartData.push({
                seq: date.substr(5),
                real: toe.toFixed(4),
                predict: weekMax.toFixed(4),
                out: weekMax - toe > 0 ? (weekMax - toe).toFixed(4) : 0
            });
        } else {
            chartData.push({seq: date.substr(5), real: 0, predict: weekMax.toFixed(4), out: 0});
        }

        // 냉난방도일
        if (j.degree.hasOwnProperty(uTime)) {
            HDD = j.degree[uTime].HDD;
            CDD = j.degree[uTime].CDD;
        }

        out += `
            <tr>
                <th class="tLabel">${date.replace('.', '-')}</th>
                <td>${this.echoNumber(kWh)}</td>
                <td>${enpiEm.em}</td>
                <td>${toe.toFixed(2)}</td>
                <td>toe</td>
                <td>${tco.toFixed(2)}</td>
                <td>tCO₂</td>
                <td>${outPoint}</td>
                <td>${HDD}</td>
                <td>${CDD}</td>
            </tr>`;
    }
    this.chartEnPI(chartData);
    document.getElementById('itemList').innerHTML = out;

    const labels = document.getElementById('enpiEmLabel').children;

    labels[0].textContent = enpiEm.name;
    labels[2].textContent = enpiEm.name;
    labels[4].textContent = enpiEm.name;
};

vio.getData = async function(energyType) {
    if (this._energyType != energyType) {
        const child = document.getElementById('legendList').children;
        child[this._energyType].classList.remove('active');
        child[energyType].classList.add('active');
    }
    this._energyType = energyType;

    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'enpi',
            energyType: this._energyType,
            date: document.getElementById('inputMonth').value
        };

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/enpis/${this._fid}?${queryString}`, {
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
                    this.toast({memo: '권한이 없습니다.'});
                    break;
                case 1:
                    this.enpiTrans(jsonData);
                    break;
                default:
                    this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
            }
        }
    }
};

vio.putData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            energyType: this._energyType,
            excel: JSON.stringify(j),
        };

        const res = await fetch(`api/enpis/${this._fid}`, {
            method: 'PUT',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(params)
        });

        if (!res.ok) {
            console.error(res.status);
        }  else {
            const jsonData = await res.json();

            this.netAble(false);
            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this.toast({memo: '데이터가 적용 되었습니다.'});
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const dom = document,
        today = new Date();

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

    dom.getElementById('act').addEventListener('click', function() {
        vio.getData(vio._energyType);
    });

    dom.getElementById('fileExcelImport').addEventListener('change', function() {
        const reader = new FileReader();
        reader.onload = function() {
            const fileData = reader.result;
            const wb = XLSX.read(fileData, {type: 'binary'});
            wb.SheetNames.forEach(function(sheetName) {
                vio.putData(XLSX.utils.sheet_to_json(wb.Sheets[sheetName]));
            });
        };

        if (this.files.length == 0) {
            vio.toast({memo: '에너지원 데이터 엑셀파일을 등록할 수 있습니다.'});
        } else {
            reader.readAsBinaryString(this.files[0]);
        }
    });

    dom.getElementById('actExcelImport').addEventListener('click', function() {
        this.nextElementSibling.click();
    });

    dom.getElementById('actExcelExam').addEventListener('click', function() {
        location.href = 'attach/TEMPS_sampleEnPI_v2.xlsx';
    });

    // 에너지원 리스트출력
    const legendList = dom.getElementById('legendList').children;
    for (let ia = 0, th = vio._enpiEm.length; ia < th; ++ia) {
        const child = legendList[ia].children,
            ta = vio._enpiEm[ia];

        if (ia == 0) {
            legendList[ia].classList.add('active');
        }

        child[1].textContent = ta.name;
        child[2].textContent = ta.a1;
        child[3].textContent = `toe/${ta.em}`;
        child[4].textContent = `${ta.a2}%`;
        child[5].textContent = ta.a3;
        child[6].textContent = `tCO₂/${ta.em}`;
        child[7].innerHTML = `<input type="radio" name="enpiEmType" onclick="vio.getData(${ia})" ${ia ? '' : 'checked'}/>`;
    }

    // sample
    await vio.getDataExam();

//    vio.getList();
});
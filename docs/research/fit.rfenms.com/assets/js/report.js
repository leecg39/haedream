'use strict';

vio._firm = {};
vio._chart = null;
vio._chartData = [];
vio._peak = {};
vio._startDate = '';
vio._endDate = '';
vio._able = {};
vio._frugalRatio = sessionStorage.getItem(`frugalRatio${vio._fid}`);
vio._permit = localStorage.getItem('permit');

/**
 * 초기화
 */
vio.reportReady = async function() {
    const dom = document,
        firmName = dom.getElementById('firmName'),
        startElement = dom.getElementById('lowDateStart'),
        endElement = dom.getElementById('lowDateEnd'),
        print = document.getElementById('print'),
        print2 = document.getElementById('print2'),
        print3 = document.getElementById('print3'),
        truth = document.getElementById('truth'),
        truth2 = document.getElementById('truth2');

    if (['1', '2'].includes(this._permit)) {
        // 제안서 다운로드 버튼 관리자에게만 표시
        if (print) {
            print.classList.remove('disable');
        }
        if (print2) {
            print2.classList.remove('disable');
            if (this._permit === '1') {
                print2.querySelector('.factoring').classList.remove('disable');
            }
        }
        if (print3) {
            print3.classList.remove('disable');
            if (this._permit === '1') {
                print3.querySelector('.factoring').classList.remove('disable');
            }
        }
    }
    if (this._permit === '1') {
        if (truth) {
            truth.classList.remove('disable');
        }
        if (truth2) {
            truth2.classList.remove('disable');
        }
    }

    if (firmName) {
        firmName.textContent = this._firmName;
    }

    if (startElement && endElement) {
        this._startDate = startElement.value;
        this._endDate = endElement.value;
    } else {
        const urlParams = new URLSearchParams(window.location.search);

        this._startDate = urlParams.get('startDate');
        this._endDate = urlParams.get('endDate');
    }

    await vio.getData();
    this.updateDocumentPageNumbers();

    if (vio.isPrint()) {
        // 제안서 다운로드
        setTimeout(function() {
            window.print();
        }, 300);
    }
};

/**
 * 활성화된 제안서 페이지 번호 입력
 */
vio.updateDocumentPageNumbers = function() {
    const pageNumbers = document.querySelectorAll('section.proposalPage > .documentPageNumber'),
        visiblePageNumbers = document.querySelectorAll('section.proposalPage:not(.disable) > .documentPageNumber');

    pageNumbers.forEach(element => element.textContent = '');
    visiblePageNumbers.forEach((element, index) => element.textContent = index + 2);
};

/**
 * 제안서 출력 화면인지 체크
 * @returns {boolean}
 */
vio.isPrint = function() {
    return ['print', 'printB', 'printC', 'eggPrint', 'eggPrintB', 'eggPrintC'].includes(this._fileName);
};

/**
 * API 데이터 요청
 * @returns {Promise<void>}
 */
vio.getData = async function() {
    const startDate = `${this._startDate.substring(0, 4)}${this._startDate.substring(5, 7)}`,
        endDate = `${this._endDate.substring(0, 4)}${this._endDate.substring(5, 7)}`;

    this.netAble(true);

    const res = await fetch(`/api/reports/${this._fid}/${startDate}/${endDate}`, {
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

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            const checkList = jsonData.checkList || {};
            console.log(`검침일: ${jsonData.checkDay}`);
            console.log(checkList);

            for (let bill_ym of Object.keys(checkList)) {
                const item = checkList[bill_ym];
                console.log(`▶ ${bill_ym}`);
                calcSimilarity('청구요금', item['9_1_한전청구요금'], item['9_2_고압청구요금'], item['9_3_저압청구요금']);
            }

            function calcSimilarity(type, a, b, c) {
                const diff1 = Math.abs(a - b),
                    max1 = Math.max(a, b),
                    diff2 = Math.abs(a - c),
                    max2 = Math.max(a, c);

                console.log(`[${type}] 고압 일치율: ${((1 - diff1 / max1) * 100).toFixed(2)} | 저압 일치율: ${((1 - diff2 / max2) * 100).toFixed(2)}`);
                console.log(`한전: ${vio.echoNumber(a)} | 고압: ${vio.echoNumber(b)} | 저압: ${vio.echoNumber(c)}`);
            }

            this._able = jsonData.able;

            this._chartData = [];
            this.buildData(jsonData, checkList);
            this.dataTransChart(jsonData);
            this.dataTransTable(jsonData);

            if (vio.isPrint()) {
                this.dataTransCost(jsonData.costHigh, jsonData.costLow);
                this.dataTransMoeny(jsonData.lowProposal);
            }
        }

        this.netAble(false);
    }
};

/**
 * 전력공급 단가 차이 데이터 매핑
 */
vio.dataTransCost = function(costHigh, costLow) {
    const dom = document,
        highEl = dom.getElementById('costHigh'),
        lowEl = dom.getElementById('costLow'),
        changeDate = dom.getElementById('changeDate');

    const highChange = costHigh?.['ableDate'],
        lowChange = costLow?.['ableDate'];

    if (changeDate && highChange && lowChange) {
        if (highChange === lowChange) {
            changeDate.textContent = `(${this.echoDate('y.m.d', highChange)} 변경)`;
        } else {
            changeDate.textContent = `(고압 ${this.echoDate('y.m.d', highChange)} 변경, 저압 ${this.echoDate('y.m.d', lowChange)} 변경)`;
        }
    }

    dom.getElementById('costNameHigh').textContent = this.costName(costHigh['costName']);
    highEl.querySelector('.costNameDetail').textContent = this.costNameDetail(costHigh['costName']);
    highEl.querySelector('.basicCost').textContent = this.echoNumber(costHigh['basicCost']);
    highEl.querySelector('.costLS').textContent = `${costHigh['costLS']}`;
    highEl.querySelector('.costMS').textContent = `${costHigh['costMS']}`;
    highEl.querySelector('.costHS').textContent = `${costHigh['costHS']}`;
    highEl.querySelector('.costLF').textContent = `${costHigh['costLF']}`;
    highEl.querySelector('.costMF').textContent = `${costHigh['costMF']}`;
    highEl.querySelector('.costHF').textContent = `${costHigh['costHF']}`;
    highEl.querySelector('.costLW').textContent = `${costHigh['costLW']}`;
    highEl.querySelector('.costMW').textContent = `${costHigh['costMW']}`;
    highEl.querySelector('.costHW').textContent = `${costHigh['costHW']}`;

    dom.getElementById('costNameLow').textContent = this.costName(costLow['costName']);
    lowEl.querySelector('.costNameDetail').textContent = this.costNameDetail(costLow['costName']);
    lowEl.querySelector('.basicCost').textContent = this.echoNumber(costLow['basicCost']);
    if (lowEl.querySelector('.costS')) {
        lowEl.querySelector('.costS').innerHTML = `${costLow['costLS']}<br>${costLow['costMS']}<br>${costLow['costHS']}`;
    } else {
        lowEl.querySelector('.costLS').textContent = costLow['costLS'];
    }
    if (lowEl.querySelector('.costF')) {
        lowEl.querySelector('.costF').innerHTML = `${costLow['costLF']}<br>${costLow['costMF']}<br>${costLow['costHF']}`;
    } else {
        lowEl.querySelector('.costLF').textContent = costLow['costLF'];
    }
    if (lowEl.querySelector('.costW')) {
        lowEl.querySelector('.costW').innerHTML = `${costLow['costLW']}<br>${costLow['costMW']}<br>${costLow['costHW']}`;
    } else {
        lowEl.querySelector('.costLW').textContent = costLow['costLW'];
    }
}

vio.costName = function(costName) {
    const match = costName.match(/산업용\(([^)]+)\)-(고압|저압)/);
    if (!match) return costName; // 매칭 실패 시 원문 반환

    const type = match[1]; // 을, 갑I, 갑II 등
    const voltage = match[2]; // 고압 또는 저압

    return `산업용 전력(${type}) ${voltage}`;
}

vio.costNameDetail = function(costName) {
    const parts = costName.split('-');
    if (parts.length === 3) {
        return `${parts[1]} ${parts[2]}`;
    } else if (parts.length === 2) {
        return parts[1];
    }
    return costName; // 형식이 이상하면 원문 그대로
}

/**
 * 차트 데이터 가공
 * @param j
 * @param checkList
 */
vio.buildData = function(j, checkList) {
    const data = j.data,
        period = this.period();

    if(localStorage.getItem('authIdn') === '1' && [1570,1569,1568,1567,1566,1565,1564,1563,1562,1561,1558,1560,1559,1557,1555,1554,1553].includes(parseInt(this._fid))) {
        // 고압, 저압 부가가치세 제외 및 저압 기본요금 사업 타당성 검토 용량으로 계산
        const ablePower = this._able['ableLowPower'] + this._able['ableLowPowerSecond'];
        for (let item of data) {
            const row = checkList[item.yyyymm];

            if (row) {
                item.lowBill = ablePower * j.contractCost;
            }
        }
    }


    let goalRatio = 1;
    if (vio._frugalRatio) {
        const high = data.reduce((sum, item) => sum + item.highBill + item.highUseBill, 0),
            low = data.reduce((sum, item) => sum + item.lowBill + item.lowUseBill, 0),
            lowUseBill = data.reduce((sum, item) => sum + item.lowUseBill, 0),
            goalLowTotal = vio._frugalRatio && high ? Math.round(high * (1 - vio._frugalRatio / 100)) : 0,
            goalTotal = low - goalLowTotal;

        goalRatio = goalTotal && lowUseBill ? 1 - (Math.round(goalTotal / lowUseBill * 10000) / 10000) : 0;
    }

    let accFrugal = 0;
    for (let i = 0; i < period.length; i++) {
        const yyyymm = period[i],
            row = data.find(r => r.yyyymm == yyyymm);

        const item = {
            yyyymm: yyyymm,
            powerAble: 0,
            usePower: 0,
            low: 0,
            lowBill: 0,
            lowUseBill: 0,
            high: 0,
            highBill: 0,
            highUseBill: 0,
            frugal: 0,
            accFrugal: 0,
            lload_usekwh: 0,
            mload_usekwh: 0,
            maxload_usekwh: 0,
            alpha: 0,
        }

        if (row) {
            item.yyyymm = row.yyyymm.toString();
            item.powerAble = row.powerAble;
            item.usePower = row.usePower;
            item.lowBill = row.lowBill;
            item.lowUseBill = Math.floor(row.lowUseBill * goalRatio);
            item.highBill = row.highBill;
            item.highUseBill = row.highUseBill;
            item.accFrugal = row.accFrugal;

            item.high = row.highBill + row.highUseBill;
            item.low = row.lowBill + row.lowUseBill;

            item.frugal = this._frugalRatio ? row.high - row.low : row.frugal;

            item.lload_usekwh = row.lload_usekwh;
            item.mload_usekwh = row.mload_usekwh;
            item.maxload_usekwh = row.maxload_usekwh;

            item.alpha = row.alpha;
            item.ableLowPower = row.ableLowPower;

            accFrugal = row.accFrugal;
        } else {
            item.accFrugal = accFrugal;
        }

        this._chartData.push(item);
    }
};

/**
 * 차트 데이터 매핑
 * @param j
 */
vio.dataTransChart = function(j) {
    const dom = document,
        lastContract = dom.getElementById('lastContract'),
        lastContractCost = dom.getElementById('lastContractCost');

    if (lastContract) {
        lastContract.textContent = j.lastContract;
    }

    if (lastContractCost) {
        lastContractCost.textContent = `${this.echoNumber(j.lastContractCost)}원`;
    }

    if (vio.isNumber(j.maxAbleWatt)) {
        dom.getElementById('maxAbleWatt').textContent = this.echoNumber(j.maxAbleWatt);
        dom.getElementById('maxAbleDate').textContent = String(j.maxAbleDate).substring(0, 4);
    }

    am4core.useTheme(am4themes_dark);

    if (this._chart) {
        this._chart.dispose();
    }

    let color1, color2, color3, color4, color5, color6, color7, color8;

    if (this._fileName === 'report') {
        color1 = '#ad44ff';
        color2 = '#ffec7d';
        color3 = '#b8faff';
        color4 = '#ffec7d';
        color5 = '#ad44ff';
        color6 = '#002cff';
        color7 = '#ad44ff';
        color8 = '#ffffff';
    } else {
        color1 = '#58cdff';
        color2 = '#406be6';
        color3 = '#ad44ff';
        color4 = '#ad44ff';
        color5 = '#059dfb';
        color6 = '#94e3ff';
        color7 = '#7dc5ff';
        color8 = '#000000';
    }

    const chart = am4core.create('chart1', am4charts.XYChart);
    chart.colors.list = [am4core.color(color1), am4core.color(color2), am4core.color(color3)];
    chart.dateFormatter.inputDateFormat = 'yyyyMM';
    chart.cursor = new am4charts.XYCursor();

    let xAxis = chart.xAxes.push(new am4charts.DateAxis());
    xAxis.dataFields.category = 'date';
    xAxis.dateFormats.setKey('month', 'MM월');
    xAxis.periodChangeDateFormats.setKey('month', 'yyyy');
    xAxis.startLocation = 0.5;
    xAxis.endLocation = 0.5;
    if (this._chartData.length > 1) {
        xAxis.renderer.minGridDistance = this._chartData.length;
    }
    xAxis.paddingBottom = -20;
    xAxis.renderer.labels.template.fill = am4core.color(color8); // 라벨 글자 색상

    // 왼쪽 yAxis (저압 전력 요금, 고압 전력 요금)
    let yAxisLeft = chart.yAxes.push(new am4charts.ValueAxis());
    yAxisLeft.min = 0;
    yAxisLeft.tooltip.disabled = true;
    yAxisLeft.renderer.opposite = false; // 기본적으로 왼쪽에 배치
    yAxisLeft.renderer.minLabelPosition = 0.01;
    yAxisLeft.renderer.labels.template.adapter.add('text', function(text) {
        let value = text ? Number(text.replace(/,/g, '')) : '',
            absValue = Math.abs(value);

        let unit = '[#a0a0a0 font-size:.86rem]원[/]';
        if (absValue >= 100000000) {
            value = value / 100000000;
            unit = '[#a0a0a0 font-size:.86rem]억원[/]';
        } else if (absValue >= 10000000) {
            value = value / 10000;
            unit = '[#a0a0a0 font-size:.86rem]만원[/]';
        } else if (absValue >= 1000) {
            value = value / 1000;
            unit = '[#a0a0a0 font-size:.86rem]천원[/]';
        } else {
            return text;
        }

        return `[${color4} font-size:.86rem]${value}[/] ${unit}`;
    });

    // 오른쪽 yAxis (누적 절감 요금)
    let yAxisRight = chart.yAxes.push(new am4charts.ValueAxis());
    yAxisRight.min = 0;
    yAxisRight.tooltip.disabled = true;
    yAxisRight.renderer.opposite = true;  // 오른쪽에 배치
    yAxisRight.renderer.minLabelPosition = 0.01;
    yAxisRight.renderer.labels.template.adapter.add('text', function(text) {
        let value = text ? Number(text.replace(/,/g, '')) : '',
            absValue = Math.abs(value);

        let unit = '[#a0a0a0 font-size:.86rem]원[/]';
        if (absValue >= 100000000) {
            value = value / 100000000;
            unit = '[#a0a0a0 font-size:.86rem]억원[/]';
        } else if (absValue >= 10000) {
            value = value / 10000;
            unit = '[#a0a0a0 font-size:.86rem]만원[/]';
        } else if (absValue >= 1000) {
            value = value / 1000;
            unit = '[#a0a0a0 font-size:.86rem]천원[/]';
        } else {
            return text;
        }

        return `[${color5} font-size:.86rem]${value}[/] ${unit}`;
    });

    // 누적 절감 요금 (오른쪽 yAxis 사용)
    let series1 = chart.series.push(new am4charts.LineSeries()); // LineSeries로 시작
    series1.dataFields.valueY = 'accFrugal';
    series1.dataFields.dateX = 'yyyymm';
    series1.tooltipText = '[#fff]{name} :[/] [bold #fff]{valueY.value}[/][#bbb]원';
    series1.strokeWidth = 2;
    series1.zIndex = 2;
    series1.name = '누적 절감 요금';
    series1.yAxis = yAxisRight; // 오른쪽 yAxis 사용

    // Area 그라데이션 효과 적용
    let gradient = new am4core.LinearGradient();
    gradient.addColor(color6, 0);  // 첫 번째 색상 (0% 위치)
    gradient.addColor(color7, 1);  // 두 번째 색상 (100% 위치)
    gradient.rotation = 270; // 그라데이션 방향을 수직으로 설정 (위에서 아래로)
    series1.fill = gradient;  // 그라데이션 색상 적용
    series1.fillOpacity = 0.7;  // 영역 채우기 투명도
    series1.stroke = false;
    series1.defaultState.properties.visible = true;

    // 저압 전력 요금 (왼쪽 yAxis 사용)
    let series2 = chart.series.push(new am4charts.LineSeries());
    series2.dataFields.valueY = 'low';
    series2.dataFields.dateX = 'yyyymm';
    series2.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/]원';
    series2.strokeWidth = 2;
    series2.zIndex = 2;
    series2.name = '저압 전력 요금';
    series2.yAxis = yAxisLeft; // 왼쪽 yAxis 사용

    // 고압 전력 요금 (왼쪽 yAxis 사용)
    let series3 = chart.series.push(new am4charts.LineSeries());
    series3.dataFields.valueY = 'high';
    series3.dataFields.dateX = 'yyyymm';
    series3.tooltipText = '[#000]{name} :[/] [bold #000]{valueY.value}[/]원';
    series3.strokeWidth = 2;
    series3.zIndex = 2;
    series3.name = '고압 전력 요금';
    series3.yAxis = yAxisLeft; // 왼쪽 yAxis 사용

    if (j.frugalYm > 0) {
        // 저압 시작 표시
        const bullet = series2.bullets.push(new am4charts.Bullet()),
            container = bullet.createChild(am4core.Container);
        container.layout = 'vertical';
        container.horizontalCenter = 'middle';
        container.verticalCenter = 'top';
        container.adapter.add('visible', function (visible, target) {
            const dataItem = target.dataItem;
            if (!dataItem || !dataItem.dataContext) {
                return false;
            }

            return dataItem.dataContext.yyyymm === String(j.frugalYm);
        });

        const iconLabel = container.createChild(am4core.Label);
        iconLabel.text = '\u21BB';
        iconLabel.fill = '#ffec7d';
        iconLabel.fontSize = 20;
        iconLabel.horizontalCenter = 'middle';
        iconLabel.align = 'center';

        const textLabel = container.createChild(am4core.Label);
        textLabel.text = '저압 시작';
        textLabel.fill = am4core.color('#ffec7d');
        textLabel.strokeWidth = 0;
        textLabel.fontSize = 14;
        textLabel.horizontalCenter = 'middle';
        textLabel.align = 'center';
    }

    this._chart = chart;
    this._chart.data = this._chartData;
};

/**
 * 테이블 데이터 매핑
 * @param j
 */
vio.dataTransTable = function(j) {
    const dom = document,
        data = j.data;

    let out = '',
        footerOut = '';

    let totalPowerAble = 0,
        totalUsePower = 0,
        totalHighBill = 0,
        totalHighUseBill = 0,
        totalHighSum = 0,
        totalLowBill = 0,
        totalLowUseBill = 0,
        totalLowSum = 0,
        totalFrugal = 0,
        totalLow = 0,
        totalMiddle = 0,
        totalMax = 0;

    const reversed = [...this._chartData].reverse();
    for (let i = 0; i < reversed.length; i++) {
        const item = reversed[i];

        item.yyyymm = item.yyyymm;
        item.low = item.lowUseBill + item.lowBill;
        item.frugal = item.high - item.low;

        totalLow += item.lload_usekwh;
        totalMiddle += item.mload_usekwh;
        totalMax += item.maxload_usekwh;

        const lowRatio = item.lload_usekwh ? Math.round(item.lload_usekwh / item.usePower * 10000) / 100 : 0,
            middleRatio = item.mload_usekwh ? Math.round(item.mload_usekwh / item.usePower * 10000) / 100 : 0,
            maxRatio = item.maxload_usekwh ? Math.round(item.maxload_usekwh / item.usePower * 10000) / 100 : 0;

        const useText = `
경부하: ${this.echoNumber(item.lload_usekwh)} (${lowRatio}%)
중부하: ${this.echoNumber(item.mload_usekwh)} (${middleRatio}%)
최대부하: ${this.echoNumber(item.maxload_usekwh)} (${maxRatio}%)`;

        let dtClass = '';
        if (j.frugalYm > 0) {
            if (j.frugalYm === parseInt(item.yyyymm)) {
                dtClass = 'change';
            } else if (j.frugalYm < parseInt(item.yyyymm)) {
                dtClass = 'low';
            }
        }

        out += `
        <tr>
            <td class="yyyymm ${dtClass}">
                ${item.yyyymm.substring(0, 4)}-${item.yyyymm.substring(4, 6)}
            </td>
            <td>${this.echoNumber(item.powerAble)}</td>
            <td title="${useText}">${this.echoNumber(item.usePower)}</td>
            <td>${this.echoNumber(item.highBill)}</td>
            <td>${this.echoNumber(item.highUseBill)}</td>
            <td>${this.echoNumber(item.high)}</td>
            <td>${this.echoNumber(item.lowBill)}</td>
            <td>${this.echoNumber(item.lowUseBill)}</td>
            <td>${this.echoNumber(item.low)}</td>
            <td>${this.echoNumber(item.frugal)}</td>
        </tr>`;

        totalPowerAble += item.powerAble;
        totalUsePower += item.usePower;
        totalHighBill += item.highBill;
        totalHighUseBill += item.highUseBill;
        totalHighSum += item.highBill + item.highUseBill;
        totalLowBill += item.lowBill;
        totalLowUseBill += item.lowUseBill;
        totalLowSum += item.lowBill + item.lowUseBill;
        totalFrugal += item.frugal;
    }

    const totalRate = totalHighSum && totalLowSum ? Math.round(((totalHighSum - totalLowSum) / totalHighSum) * 100 * 100) / 100 : 0,
        useTotal = totalLow + totalMiddle + totalMax,
        lowRatio = totalLow ? Math.round(totalLow / useTotal * 10000) / 100 : 0,
        middleRatio = totalMiddle ? Math.round(totalMiddle / useTotal * 10000) / 100 : 0,
        maxRatio = totalMax ? Math.round(totalMax / useTotal * 10000) / 100 : 0,
        useText = `경부하: ${this.echoNumber(totalLow)} (${lowRatio}%)
중부하: ${this.echoNumber(totalMiddle)} (${middleRatio}%)
최대부하: ${this.echoNumber(totalMax)} (${maxRatio}%)`;

    footerOut = `
    <tr class="totalSum">
        <td>총계</td>
        <td>${this.echoNumber(totalPowerAble)}</td>
        <td title="${this.echoNumber(useText)}">${this.echoNumber(totalUsePower)}</td>
        <td>${this.echoNumber(totalHighBill)}</td>
        <td>${this.echoNumber(totalHighUseBill)}</td>
        <td>${this.echoNumber(totalHighSum)}</td>
        <td>${this.echoNumber(totalLowBill)}</td>
        <td>${this.echoNumber(totalLowUseBill)}</td>
        <td>${this.echoNumber(totalLowSum)}</td>
        <td>${this.echoNumber(totalFrugal)}</td>
    </tr>
    <tr class="totalYear">
        <th colspan="3">연간 절감 금액</th>
        <td colspan="7">
            <span>${this.echoNumber(totalFrugal)}</span>
            (절감률: <span>${totalRate}%</span>)
        </td>
    </tr>
    <tr class="totalMonth">
        <th colspan="3">월간 절감 금액</th>
        <td colspan="7">
            <span>${totalFrugal && data.length ? this.echoNumber(Math.round(totalFrugal / data.length)) : 0}</span>원
        </td>
    </tr>`;

    const avgFrugal = totalFrugal && data.length ? Math.round(totalFrugal / data.length) : 0;
    dom.getElementById('avgFrugalDaily').textContent = this.echoNumber(this._frugalRatio ? Math.round(avgFrugal / 30) : j.avgFrugalDaily);
    dom.getElementById('frugalRatio').textContent = this._frugalRatio ? this._frugalRatio : totalRate;
    dom.getElementById('avgFrugal').textContent = this.echoNumber(avgFrugal);
    dom.getElementById('avgFrugalYear').textContent = this.echoNumber(totalFrugal);
    dom.getElementById('itemList').innerHTML = out;
    dom.getElementById('itemFooter').innerHTML = footerOut;
};

/**
 * 사업 타당성 검토 데이터 매핑
 * @param lowProposal
 */
vio.dataTransMoeny = function(lowProposal) {
    if (this._able.ableCost === 0) {
        this._able.ableCost = 24000;
    }

    const dom = document,
        {
            contractLimit = 0, // 계약전력
            ableCost = 0,
            ablePower = 0, // 고압 용량
            ableLowPower = 0, // 저압 용량
            ableLowPowerSecond = 0, // 저압 용량 2구좌
            ableBaseBill = 0, // 기본금
            ableBaseSecond = 0, // 기본금 2구좌
            ableExtendBill = 0,
            ableBuildPrice = 0, // 수변전설비 변경 공사비용 외
        } = this._able;

    const etcReqBill = ableLowPower ? (ableBaseBill + ((parseInt(ableLowPower) - 5) * ableExtendBill)) : 0,
        etcReqSecond = ableLowPowerSecond ? (ableBaseSecond + ((parseInt(ableLowPowerSecond) - 5) * ableExtendBill)) : 0,
        etcReqTotal = etcReqBill + etcReqSecond;

    const originReqBill = ablePower ? ablePower * ableCost : 0,
        etcAddReqBill = etcReqTotal - originReqBill > 0 ? etcReqTotal - originReqBill : 0, // 추가 납부 금액(한전시설부담금) = 납부금액 - 기존 납부금액
        ableKFE = Math.floor((ableBuildPrice + etcAddReqBill) / 10000) * 10000, // 사업비 = 수변전설비 변경 공사비용 외 + 한전시설부담금
        avgFrugal = parseInt(dom.getElementById('avgFrugal').textContent.replace(/,/g, '')),
        roiMonth = ableKFE && avgFrugal ? Math.round(ableKFE / avgFrugal * 10) / 10 : 0;

    dom.getElementById('ableBuildPrice').textContent = this.echoNumber(ableBuildPrice); // 수변전설비 변경 공사비용 외
    dom.getElementById('etcAddReqBill').textContent = this.echoNumber(etcAddReqBill); // 한전시설부담금
    dom.getElementById('ableKFE').textContent = this.echoNumber(ableKFE); // 합계
    dom.getElementById('ablePower').textContent = this.echoNumber(ablePower || contractLimit); // 고압 용량
    dom.getElementById('ableLowPower').textContent = this.echoNumber(ableLowPower + ableLowPowerSecond); // 저압 용량
    dom.getElementById('roiMonth').textContent = ableBuildPrice > 0 ? roiMonth : '-'; // ROI 개월
    dom.getElementById('businessBill').textContent = ableBuildPrice > 0 ? this.echoNumber(ableKFE) : '-'; // 사업비
    dom.getElementById('businessAvgFrugal').textContent = this.echoNumber(avgFrugal);  // 예상 월 절감 금액

    if (ableBaseBill) {
        if (ableBaseBill === 588000) {
            dom.getElementById('supplyText').textContent = ' (지중공급)';
        } else {
            dom.getElementById('supplyText').textContent = '(공중공급)';
        }
        dom.getElementById('supplyText').classList.remove('disable');
    }

    // 금융지원
    // 월상환액: 예상 월 절감금액 - 월 상환금액
    if (['printC', 'eggPrintC'].includes(this._fileName)) {
        // 제안서 C
        lowProposal = lowProposal.filter(r => r.ableType === 2);
        for (let i = 0; i < 5; i++) {
            const item = lowProposal[i];
            if (item && item.ableRepayMonth) {
                let { ableBank, ableDeposit, ableInterest } = item;

                ableInterest = ableInterest / 10000;

                // 사업비 + 금융지원 수수료
                let amount = ableKFE + ableBank + ableDeposit; // 계약금액
                amount = amount ? Math.floor(amount / 100000) * 100000 : 0;
                const element = dom.getElementById(`ableRepayMonth${i + 1}`);
                if (element) {
                    element.textContent = this.echoNumber(item.ableRepayMonth);

                    dom.getElementById(`ableTotal${i + 1}`).textContent = this.echoNumber(amount);
                    dom.querySelectorAll(`.calc${i + 1}`).forEach(element => element.classList.remove('disable'));
                }

                const repay = dom.getElementById(`repay${i + 1}`),
                    repayListLeft = repay?.querySelector(`.repayListLeft`), // 상환일정표 왼쪽 영역
                    repayListRight = repay?.querySelector(`.repayListRight`); // 상환일정표 오른쪽 영역
                amount = amount + amount * 0.1;
                const rate = ableInterest, // 팩토링
                    months = item.ableRepayMonth, // 기간
                    monthlyRate = rate / 12, // 월별 팩토링
                    monthlyPayment = monthlyRate
                        ? (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
                        : amount / months; // 월상환금

                let balance = amount,
                    leftOut = '',
                    rightOut = '',
                    factoring = 0; // 팩토링금액
                for (let j = 1; j <= months; j++) {
                    const interestRaw = balance * monthlyRate; // 대출이자
                    let principalRaw = monthlyPayment - interestRaw; // 납입원금

                    factoring += interestRaw;

                    if (j === months) {
                        // 마지막 회차 보정
                        principalRaw = balance;
                    }

                    balance = balance - principalRaw; // 대출잔금

                    const out = `
                        <tr>
                            <td>${j}</td>
                            <td>${this.echoNumber(Math.round(principalRaw))}</td>
                            <td>${this.echoNumber(Math.round(interestRaw))}</td>
                            <td>${this.echoNumber(Math.round(monthlyPayment))}</td>
                            <td>${this.echoNumber(Math.round(balance))}</td>
                        </tr>`;
                    if (j <= months / 2) {
                        // 왼쪽
                        leftOut += out;
                    } else {
                        // 오른쪽
                        rightOut += out;
                    }
                }
                const total = amount + Math.round(factoring),
                    monthRepay = Math.round(Math.round(total / months) / 1.1),
                    roi = avgFrugal ? Math.round(monthRepay / avgFrugal * 100 * 10) / 10 : 0,
                    progress = dom.getElementById(`progress${i + 1}`),
                    progressRatio = dom.getElementById(`progress${i + 1}Ratio`);
                progress.style.width = `${Math.abs(roi > 100 ? 100 : roi)}%`;
                if (progressRatio) {
                    progressRatio.textContent = `${roi}%`;
                } else {
                    progress.textContent = `${roi}%`;
                }
                dom.getElementById(`monthRepay${i + 1}`).textContent = this.echoNumber(monthRepay);
                dom.getElementById(`billGap${i + 1}`).textContent = this.echoNumber(avgFrugal - monthRepay);

                if (repay && repayListLeft && repayListRight) {
                    repay.classList.remove('disable');
                    // 상환일정표
                    repay.querySelector('.repayYear').textContent = Math.floor(months / 12 * 10) / 10;
                    repay.querySelector('.repayAmount').textContent = this.echoNumber(amount); // 금액
                    repay.querySelector('.repayPrincipal').textContent = this.echoNumber(amount); // 원금
                    repay.querySelector('.repayRate').textContent = `${this.echoNumber(Math.floor(rate * 100 * 10) / 10)}%`; // 팩토링
                    repay.querySelector('.repayInterestTotal').textContent = this.echoNumber(Math.round(factoring)); // 팩토링금액
                    repay.querySelector('.repayMonths').textContent = months; // 기간(개월)
                    repay.querySelector('.repayTotal').textContent = this.echoNumber(total); // 총상환금액
                    repay.querySelector(`.repayListLeft`).innerHTML = leftOut;
                    repay.querySelector(`.repayListRight`).innerHTML = rightOut;
                }
            }
        }
    } else {
        lowProposal = lowProposal.filter(r => r.ableType === 1);
        for (let i = 0; i < 5; i++) {
            const item = lowProposal[i];
            if (item && item.ableRepayMonth) {
                const total = Math.floor((item.ableBank + item.ableDeposit + item.ableInterest + ableKFE) / 100000) * 100000,
                    monthRepay = Math.round(total / item.ableRepayMonth),
                    roi = avgFrugal ? Math.round(monthRepay / avgFrugal * 100 * 10) / 10 : 0;

                const element = dom.getElementById(`ableRepayMonth${i + 1}`);
                if (element) {
                    element.textContent = this.echoNumber(item.ableRepayMonth);

                    dom.getElementById(`progress${i + 1}`).style.width = `${Math.abs(roi > 100 ? 100 : roi)}%`;
                    dom.getElementById(`progress${i + 1}`).textContent = `${roi}%`;
                    dom.getElementById(`ableTotal${i + 1}`).textContent = this.echoNumber(total);
                    dom.getElementById(`monthRepay${i + 1}`).textContent = this.echoNumber(monthRepay);
                    dom.getElementById(`billGap${i + 1}`).textContent = this.echoNumber(avgFrugal - monthRepay);
                    dom.querySelectorAll(`.calc${i + 1}`).forEach(element => element.classList.remove('disable'));
                }
            }
        }
    }

    const constructionInfo = dom.getElementById('constructionInfo');
    if (constructionInfo && ablePower > 0 && ableLowPower > 0 && ableBuildPrice > 0) {
        // 2차 제안서에 공사비 안내 문구 비활성화
        constructionInfo.classList.add('disable');
    }

    // 플랜 A
    const support = ableKFE * 1.05,
        interest = Math.floor(support * 0.05),
        interestMonth = interest ? Math.floor(interest / 12) : 0,
        interestElement = dom.getElementById('interest'),
        interestMonthElement = dom.getElementById('interestMonth'),
        supportElement = dom.getElementById('support'),
        yearAvgFrugal = dom.getElementById('yearAvgFrugal'),
        tenYearAvgFrugal = dom.getElementById('tenYearAvgFrugal');
    if (interestElement) {
        // 금융상품 및 이자 [예상 시나리오]
        interestElement.textContent = this.echoNumber(interest);
        interestMonthElement.textContent = interestMonth ? `월 예상 이자 ${this.echoNumber(interestMonth)}원` : '';
        supportElement.textContent = this.echoNumber(support);

        yearAvgFrugal.textContent = this.echoNumber(avgFrugal * 12);
        tenYearAvgFrugal.textContent = this.echoNumber(avgFrugal * 120);

        // 거치 상품 > 절감금액대비 상환액 비율
        const oneRepay = support ? Math.round(support / 108 + interestMonth / 2) : 0,
            oneRepayRate = oneRepay ? Math.round(oneRepay / avgFrugal * 100 * 10) / 10 : 0;
        dom.getElementById('progress1').style.width = `${oneRepayRate}%`;
        if (dom.getElementById('progress1Ratio')) {
            dom.getElementById('progress1Ratio').textContent = `${oneRepayRate}%`;
        } else {
            dom.getElementById('progress1').textContent = `${oneRepayRate}%`;
        }

        // 거치 상품 > 거치기간 예상 순이익
        const oneFrugal = avgFrugal * 12 - interest;
        dom.getElementById('oneInterest').textContent = this.echoNumber(oneFrugal);

        // 거치 상품 > 월 예상 상환금액
        dom.getElementById('oneRepay').textContent = this.echoNumber(oneRepay);

        // 거치 상품 > 예상 월 절감 금액 - 월 예상 상환 금액
        dom.getElementById('oneFrugal').textContent = this.echoNumber(avgFrugal - oneRepay);

        // 거치 상품 > 예상 10년 운영 순이익
        dom.getElementById('oneTenYearFrugal').textContent = this.echoNumber((avgFrugal - oneRepay) * 120);

        // 원금분할 상품 > 절감금액대비 상환액 비율
        const fourRepay = support ? Math.round(support / 36 + interestMonth) : 0,
            fiveRepay = support ? Math.round(support / 48 + interestMonth) : 0,
            sixRepay = support ? Math.round(support / 60 + interestMonth) : 0,
            fourRepayRate = fourRepay ? Math.round(fourRepay / avgFrugal * 100 * 10) / 10 : 0,
            fiveRepayRate = fiveRepay ? Math.round(fiveRepay / avgFrugal * 100 * 10) / 10 : 0,
            sixRepayRate = sixRepay ? Math.round(sixRepay / avgFrugal * 100 * 10) / 10 : 0;
        dom.getElementById('progress4').style.width = `${fourRepayRate}%`;
        if (dom.getElementById('progress4Ratio')) {
            dom.getElementById('progress4Ratio').textContent = `${fourRepayRate}%`;
        } else {
            dom.getElementById('progress4').textContent = `${fourRepayRate}%`;
        }
        dom.getElementById('progress5').style.width = `${fiveRepayRate}%`;
        if (dom.getElementById('progress5Ratio')) {
            dom.getElementById('progress5Ratio').textContent = `${fiveRepayRate}%`;
        } else {
            dom.getElementById('progress5').textContent = `${fiveRepayRate}%`;
        }
        dom.getElementById('progress6').style.width = `${sixRepayRate}%`;
        if (dom.getElementById('progress6Ratio')) {
            dom.getElementById('progress6Ratio').textContent = `${sixRepayRate}%`;
        } else {
            dom.getElementById('progress6').textContent = `${sixRepayRate}%`;
        }

        // 원금분할 상품 > 총 이자
        const fourInterest = interest ? interest * 3 : 0, // 36개월 총 이자
            fiveInterest = interest ? interest * 4 : 0, // 48개월 총 이자
            sixInterest = interest ? interest * 5 : 0; // 60개월 총 이자
        dom.getElementById('fourInterest').textContent = this.echoNumber(fourInterest);
        dom.getElementById('fiveInterest').textContent = this.echoNumber(fiveInterest);
        dom.getElementById('sixInterest').textContent = this.echoNumber(sixInterest);

        // 원금분할 상품 > 월 예상 상환 금액
        dom.getElementById('fourRepay').textContent = this.echoNumber(fourRepay);
        dom.getElementById('fiveRepay').textContent = this.echoNumber(fiveRepay);
        dom.getElementById('sixRepay').textContent = this.echoNumber(sixRepay);

        // 원금분할 상품 > 예상 월 절감 금액 - 월 예상 상환 금액
        dom.getElementById('fourFrugal').textContent = this.echoNumber(avgFrugal - fourRepay);
        dom.getElementById('fiveFrugal').textContent = this.echoNumber(avgFrugal - fiveRepay);
        dom.getElementById('sixFrugal').textContent = this.echoNumber(avgFrugal - sixRepay);

        // 원금분할 상품 > 예상 10년 운영 순이익
        dom.getElementById('fourTenYearFrugal').textContent = this.echoNumber(avgFrugal * 120 - fourRepay * 36);
        dom.getElementById('fiveTenYearFrugal').textContent = this.echoNumber(avgFrugal * 120 - fiveRepay * 48);
        dom.getElementById('sixTenYearFrugal').textContent = this.echoNumber(avgFrugal * 120 - sixRepay * 60);
    }
};

/**
 * 시작일 ~ 종료일 날짜 목록 반환
 * @returns {*[]}
 */
vio.period = function() {
    const start = new Date(this._startDate),
        end = new Date(this._endDate);

    // 날짜 배열 초기화
    const dateArray = [];
    // 현재 날짜를 시작 날짜로 초기화
    let currentDate = new Date(start);

    // endDate까지 반복
    while (currentDate <= end) {
        let formattedDate;

        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        formattedDate = `${currentDate.getFullYear()}${month}`;

        // 배열에 추가
        if (!dateArray.includes(formattedDate)) {
            dateArray.push(formattedDate);
        }

        // 현재 날짜에 하루를 더함
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dateArray;
};

/**
 * 엑셀 다운로드
 */
vio.excelDownload = function() {
    const dom = document,
        startDate = dom.getElementById('lowDateStart').value,
        endDate = dom.getElementById('lowDateEnd').value;

    let workbook = XLSX.utils.table_to_book(document.getElementById('deskTable')),
        ws = workbook.Sheets['Sheet1'];
    XLSX.writeFile(workbook, `저압_절감_보고서_${startDate}~${endDate}.xlsx`);
};

/**
 * 제안서 A 다운로드
 */
vio.printPage = function() {
    const dom = document,
        startDate = dom.getElementById('lowDateStart').value,
        endDate = dom.getElementById('lowDateEnd').value;

    const fileName = this.isEgg() ? 'eggPrint' : 'print';

    const print = window.open(`${fileName}.html?startDate=${startDate}&endDate=${endDate}`, '_blank');
    print.focus();
};

/**
 * 제안서 B 다운로드
 */
vio.printPageB = function() {
    const dom = document,
        startDate = dom.getElementById('lowDateStart').value,
        endDate = dom.getElementById('lowDateEnd').value;

    const fileName = this.isEgg() ? 'eggPrintB' : 'printB';

    const print = window.open(`${fileName}.html?startDate=${startDate}&endDate=${endDate}`, '_blank');
    print.focus();
};

/**
 * 제안서 C 다운로드
 */
vio.printPageC = function() {
    const dom = document,
        startDate = dom.getElementById('lowDateStart').value,
        endDate = dom.getElementById('lowDateEnd').value;

    const fileName = this.isEgg() ? 'eggPrintC' : 'printC';

    const print = window.open(`${fileName}.html?startDate=${startDate}&endDate=${endDate}`, '_blank');
    print.focus();
};

/**
 * 제안서 다운로드
 */
vio.reportPrint = async function(type) {
    const today = new Date(),
        yyyy = today.getFullYear(),
        mm = String(today.getMonth() + 1).padStart(2, '0'),
        dd = String(today.getDate()).padStart(2, '0');

    const tempInput = document.createElement('input');
    tempInput.style.position = 'absolute';
    tempInput.style.left = '-1000px'; // 화면 밖으로
    tempInput.value = `${vio._firmName} 한전수전합리화 - 저압 절감 보고서 ${yyyy}${mm}${dd}`;
    document.body.appendChild(tempInput);
    tempInput.select();

    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('복사 실패:', err);
    }

    document.body.removeChild(tempInput);

    if (type === 'A') {
        await vio.printPage();
    } else if (type === 'B') {
        await vio.printPageB();
    } else {
        await vio.printPageC();
    }
};

/**
 * 이벤트 리스너 등록
 */
vio.eventListenerReport = function() {
    const dom = document,
        lowDateStart = dom.getElementById('lowDateStart'),
        lowDateEnd = dom.getElementById('lowDateEnd'),
        today = new Date();

    if (!lowDateStart) {
        return;
    }

    today.setMonth(today.getMonth() - 2);
    lowDateEnd.value = this.echoDate('y-m', today.getTime() / 1000);
    today.setMonth(today.getMonth() - 11);
    lowDateStart.value = this.echoDate('y-m', today.getTime() / 1000);

    lowDateStart.addEventListener('change', function() {
        let [year, month] = this.value.split('-').map(Number),
            date = new Date(year, month - 1);
        date.setMonth(date.getMonth() + 11);

        let newYear = date.getFullYear(),
            newMonth = String(date.getMonth() + 1).padStart(2, '0'); // 월을 01 형식으로 변환
        lowDateEnd.value = `${newYear}-${newMonth}`;
    });
    lowDateEnd.addEventListener('change', function() {
        let [year, month] = this.value.split('-').map(Number),
            date = new Date(year, month - 1);
        date.setMonth(date.getMonth() - 11);

        let newYear = date.getFullYear(),
            newMonth = String(date.getMonth() + 1).padStart(2, '0'); // 월을 01 형식으로 변환
        lowDateStart.value = `${newYear}-${newMonth}`;
    });

    dom.getElementById('lowDateStart').addEventListener('change', function() {
        vio._startDate = this.value;
        vio._endDate = dom.getElementById('lowDateEnd').value;
    });
    dom.getElementById('lowDateEnd').addEventListener('change', function() {
        vio._startDate = dom.getElementById('lowDateStart').value;
        vio._endDate = this.value;
    });

    dom.getElementById('search').addEventListener('click', async function() {
        await vio.getData();
    });

    dom.getElementById('excel').addEventListener('click', async function() {
        await vio.excelDownload();
    });

    dom.getElementById('print').addEventListener('click', async function() {
        if (vio._able['kepcoStatus'] === 12) {
            vio.dialog({act: 'open', tag: 'reportPrint', memo: '월별 청구서 데이터 수집 중입니다.<br>제안서를 다운로드하시겠습니까?'});
        } else {
            await vio.reportPrint('A');
        }
    });
    dom.getElementById('print2').addEventListener('click', async function() {
        if (vio._able['kepcoStatus'] === 12) {
            vio.dialog({act: 'open', tag: 'reportPrint', memo: '월별 청구서 데이터 수집 중입니다.<br>제안서를 다운로드하시겠습니까?'});
        } else {
            await vio.reportPrint('B');
        }
    });
    dom.getElementById('print3').addEventListener('click', async function() {
        if (vio._able['kepcoStatus'] === 12) {
            vio.dialog({act: 'open', tag: 'reportPrint', memo: '월별 청구서 데이터 수집 중입니다.<br>제안서를 다운로드하시겠습니까?'});
        } else {
            await vio.reportPrint('C');
        }
    });

    dom.getElementById('truth').addEventListener('click', async function() {
        if (vio._able['isOver']) {
            vio.dialog({act: 'open', tag: 'editFixed', memo: '최근 5개년 피크 기준으로 저압 용량이 초과되었습니다.<br/>사업 타당성 검토 페이지로 이동하시겠습니까?'});
        } else {
            window.location.href = '/money.html';
        }
    });

    dom.getElementById('truth2').addEventListener('click', async function() {
        window.location.href = '/money.html?type=c';
    });

    if (['1', '2'].includes(this._permit)) {
        dom.getElementById('frugalAvg').addEventListener('click', function() {
            if (!this.classList.contains('editMode')) {
                vio.toast({memo: '목표 절감률 입력 후 Enter를 입력해 주세요.'});
            }

            this.classList.add('editMode');
            dom.getElementById('edit-frugalRatio').focus();
        });

        dom.getElementById('edit-frugalRatio').addEventListener('keyup', function(event) {
            const key = event.key;
            let value = this.value;
            if (key === 'Enter' || key === 'NumpadEnter') {
                event.preventDefault();
                this.blur();
            }

            const parts = value.split('.');
            if (parts.length > 2) {
                value = parts.shift() + '.' + parts.join('');
            }

            // 숫자와 점 이외의 문자 제거
            value = value.replace(/[^0-9.]/g, '');

            // 맨 앞에 0이 여러 개 있을 경우 0은 하나만 허용
            value = value.replace(/^0+([1-9])/, '$1');

            this.value = value;
        });

        dom.getElementById('edit-frugalRatio').addEventListener('blur', async function() {
            await vio.fixFrugalRatio(this.value);
        });
    }
};

/**
 * 저압 용량 초과 시에도 사업 타당성 검토 페이지 이동
 */
vio.editFixed = function() {
    window.location.href = '/money.html';
};

/**
 * 평균 절감률 업데이트
 */
vio.fixFrugalRatio = async function(value) {
    if (value) {
        vio._frugalRatio = value;
        sessionStorage.setItem(`frugalRatio${vio._fid}`, value);

        vio.toast({memo: "처리되었습니다.\n브라우저 종료 시 초기화됩니다."});

    } else {
        vio._frugalRatio = null;
        sessionStorage.removeItem(`frugalRatio${vio._fid}`);
    }

    await vio.getData();

    document.getElementById('frugalAvg').classList.remove('editMode');
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.eventListenerReport();
    await vio.reportReady();
});

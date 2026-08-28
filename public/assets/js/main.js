'use strict';

vio._timer = 0;
vio._chartTimer = null;
vio._todayWattChart = {}; // 오늘의 전력 사용량 차트
vio._todayGasChart = {}; // 오늘의 가스 사용량 차트
vio._ricePartChart = {}; // 생산량 대비 전력 사용량 차트
vio._wattWeekChart = {}; // 주간 전력 사용량 차트
vio._todayPeakChart = {}; // 오늘의 피크전력 차트
vio._peakMaxChart = {}; // 월별 최대수요 차트
vio._outputChartPie = {}; // 이달의 생산현황 차트 Pie
vio._outputChartBar = {}; // 이달의 생산현황 차트 Bar
vio._solarChart = {}; // 태양광 발전량 차트
vio._productionAttainmentChart = {}; // 이달의 생산목표 달성률 차트
vio._powerAmountRelativeChart = {}; // 월별 생산량대비 전력 사용량 차트
vio._processPartMainChart = {}; // 분야별 에너지 사용량 차트
vio._processPartSubChart = {}; // 분야별 세부 에너지 사용량 차트
vio._peakTime = {}; // 실시간 피크 전력 시간
vio._peakLoadTime = 0; // 실시간 전력 사용량 시간
vio._modbusTop = []; // 설비별 사용량 TOP
vio._modbusTopToday = []; // 설비별 사용량 TOP(오늘)
vio._modbusTopWeek = []; // 설비별 사용량 TOP(지난주)
vio._modbusTopMonth = []; // 설비별 사용량 TOP(이번달)
vio._modbus = {}; // 설비 정보
vio._apiFields = [];
vio._requestFields = '';
vio._repeatFields = '';
vio._widgets = {
    '1': 'peakTimes',
    '2': 'peakLoad',
    '3': 'wattUse',
    '4': 'ricePart',
    '5': 'wattWeek',
    '6': 'peakDaily',
    '7': 'energySafe',
    '8': 'peakMax',
    '9': 'nodeControl',
    '10': 'wattStatus',
    '11': 'wattToday',
    '12': 'todayPrice',
    '13': 'wattZip',
    '14': 'modbusTop',
    '15': 'wattCost',
    '16': 'amountMonth',
    '17': 'productionAttainment',
    '18': 'powerAmountRelative',
    '20': 'processUnit',
    '22': 'solar',
    '31': 'processUsage',
    '32': 'processPart',
    '33': 'gasUse',
    '34': 'process',
    '35': 'currentPlan',
};
vio._amountMonthData = []; // 이달의 생산현황 데이터
vio._audioPeakReady = false; // 피크알람 준비
vio._audioMute = true; // 브라우저 기본정책 소리끔
vio._dateType = '';
vio._processDateType = '';
vio._apiTimer = null;
vio._menu = {};
vio._menu1 = '';
vio._menu2 = '';
vio._menu3 = '';
vio._processUsageMenu = {};
vio._processPartEnergy = '';
vio._processPartMenu = '';

/**
 * 메인 대시보드 데이터 API 요청
 * @returns {Promise<void>}
 */
vio.getData = async function(fields, isInit) {
    try {
        if (!this._useNetworks && isInit) {
            this.netAble(true);
        }

        let queryString = '';
        if (this._dateType) {
            queryString += `&dateType=${this._dateType}`;
        }
        if (this._processDateType) {
            queryString += `&processDateType=${this._processDateType}`;
        }
        if (this._menu1) {
            queryString += `&menu1=${this._menu1}`
        }
        if (this._menu2) {
            queryString += `&menu2=${this._menu2}`
        }
        if (this._menu3) {
            queryString += `&menu3=${this._menu3}`
        }
        if (this._processPartEnergy) {
            queryString += `&energy=${this._processPartEnergy}`;
        }
        if (this._processPartMenu) {
            queryString += `&menu=${this._processPartMenu}`;
        }

        const res = await fetch(`api/mains/${this._fid}?fields=${fields}${queryString}`, {
            method: 'GET',
            headers: {'Authorization': `x-auth ${vio._accessToken}`}
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const dom = document,
                jsonData = await res.json(),
                {
                    peakTimes = [],
                    peakLoad = {},
                    wattUse = {},
                    gasUse = {},
                    ricePart = {},
                    wattWeek = {},
                    peakDaily = [],
                    energySafe = [],
                    peakMax = {},
                    nodeControl = [],
                    wattStatus = [],
                    wattToday = {},
                    todayPrice = {},
                    wattZip = {},
                    modbusTop = {},
                    wattCost = [],
                    amountMonth = {},
                    productionAttainment = {},
                    powerAmountRelative = [],
                    processUnit = {},
                    solar = {},
                    processUsage = {},
                    processPart = {},
                    process = {},
                    currentPlan = {},
                } = jsonData;

            // 1. 실시간 피크 전력
            if (dom.getElementById('widget1') && peakTimes.hasOwnProperty(this._fid)) {
                const widget1 = dom.getElementById('widget1'),
                    cloneNode = widget1.cloneNode(true);

                widget1.classList.add(`fid_${this._fid}`); // 원본 요소에 클래스 추가

                // 데이터 전송 호출
                this.dataTransPeakTime(peakTimes, isInit);
            }
            // 2. 실시간 전력 사용량 전력
            if (dom.getElementById('widget2') && Object.keys(peakLoad).length) {
                this.dataTransPeakLoad(peakLoad);
            }
            // 3. 오늘의 전력 사용량
            if (dom.getElementById('widget3') && Object.keys(wattUse).length) {
                this.dataTransWattUse(wattUse);
            }
            // 4. 생산량 대비 전력 사용량
            if (dom.getElementById('widget4') && Object.keys(ricePart).length) {
                this.dataTransRicePart(ricePart);
            }
            // 5. 주간 전력 사용량
            if (dom.getElementById('widget5') && Object.keys(wattWeek).length) {
                this.dataTransWattWeek(wattWeek);
            }
            // 6. 오늘의 피크전력
            if (dom.getElementById('widget6') && peakDaily.length) {
                this.dataTransPeakDaily(peakDaily);
            }
            // 7. 에너지 절감효과
            if (dom.getElementById('widget7') && Object.keys(energySafe).length) {
                this.dataTransEnergySafe(energySafe);
            }
            // 8. 월별 최대수요
            if (dom.getElementById('widget8') && Object.keys(peakMax).length) {
                this.dataTransPeakMax(peakMax);
            }
            // 9. 설비제어
            if (dom.getElementById('widget9') && nodeControl.length) {
                this.dataTransNodeControl(nodeControl);
            }
            // 10. 현재 상태
            if (dom.getElementById('widget10') && wattStatus.length) {
                this.dataTransWattStatus(wattStatus, peakTimes);
            }
            // 11. 오늘의 누적 전력 사용량
            if (dom.getElementById('widget11') && Object.keys(wattToday).length) {
                this.dataTransWattToday(wattToday);
            }
            // 12. 오늘의 누적 전력 사용요금
            if (dom.getElementById('widget12') && Object.keys(todayPrice).length) {
                this.dataTransTodayPrice(todayPrice);
            }
            // 13. 누적 전력 사용량
            if (dom.getElementById('widget13') && Object.keys(wattZip).length) {
                this.dataTransWattZip(wattZip);
            }
            // 14. 설비별 사용량 TOP
            if (dom.getElementById('widget14') && Object.keys(modbusTop).length) {
                this.dataTransModbusTop(modbusTop);
            }
            // 15. 요금제정보 및 통신상태
            if (dom.getElementById('widget15') && wattCost.length) {
                this.dataTransWattCost(wattCost);
            }
            // 16. 이달의 생산현황
            if (dom.getElementById('widget16') && Object.keys(amountMonth).length) {
                this._amountMonthData = amountMonth;
                this.dataTransAmountMonth(amountMonth, isInit);
            }
            // 17. 이달의 생산현황
            if (dom.getElementById('widget17') && Object.keys(productionAttainment).length) {
                this.dataTransProductionAttainment(productionAttainment);
            }
            // 18. 월별 생산량대비 전력 사용량
            if (dom.getElementById('widget18') && Object.keys(jsonData).includes('powerAmountRelative')) {
                this.dataTransPowerAmountRelative(powerAmountRelative);
            }
            // 20. 공정별 에너지 원단위
            if (dom.getElementById('widget20') && Object.keys(processUnit).length) {
                this.dataTransProcessUnit(processUnit);
            }
            // 22. 태양광 발전량
            if (dom.getElementById('widget22') && Object.keys(solar).length) {
                this.dataTransSolar(solar);
            }
            // 31. 공정별 에너지 사용량
            if (dom.getElementById('widget31') && Object.keys(processUsage).length) {
                this.dataTransProcessUsage(processUsage);
            }
            // 32. 분야별 에너지 사용량
            if (dom.getElementById('widget32') && Object.keys(processPart).length) {
                this.dataTransProcessPart(processPart);
            }
            // 33. 오늘의 가스 사용량
            if (dom.getElementById('widget33') && Object.keys(gasUse).length) {
                this.dataTransGasUse(gasUse);
            }
            // 34. 공정별 에너지
            if (dom.getElementById('widget34') && Object.keys(process).length) {
                this.dataTransProcess(process);
            }
            // 35. 현재 요금제
            if (dom.getElementById('widget35') && Object.keys(currentPlan).length) {
                this.dataTransCurrentPlan(currentPlan);
            }

            this.netAble(false);

            vio._apiTimer = setTimeout(async function() {
                vio._timer++;

                let fields;

                if (vio._timer % 240 === 0) {
                    vio._timer = 0;
                    fields = vio._requestFields;
                } else {
                    fields = vio._repeatFields;
                }

                await vio.getData(fields);

                if (vio._timer % 60 === 0) { // 숫자 카운트 애니메이션
                    vio.countNumber();
                }
            }, 1000);
        }
    } catch (e) {
        console.error(e);
        // 에러 발생 시 10초 뒤 재요청
        setTimeout(async () => {
            await vio.getData(fields);
        }, 10000);
    }
}

/**
 * 1. 실시간 피크 전력 데이터 매핑
 * @param peakTimes
 * @param isInit
 */
vio.dataTransPeakTime = function(peakTimes, isInit) {
    const dom = document,
        keys = Object.keys(peakTimes);

    keys.forEach(fid => {
        const widget1 = dom.getElementById('widget1'),
            cloneNode = widget1.cloneNode(true);

        if (isInit && fid != this._fid) {
            // 복제 및 설정
            const clone = cloneNode.cloneNode(true);
            clone.setAttribute('id', `widget1_${fid}`);
            clone.classList.add(`fid_${fid}`);
            widget1.parentNode.insertBefore(clone, widget1.nextSibling);
        }

        const element = dom.querySelector(`.fid_${fid}`),
            data = peakTimes[fid],
            peakPower = data[1] ?? '', // 예측전력
            peakGoal = data[2] ?? '', // 목표전력
            peakRatio = peakPower / peakGoal, // 피크율
            transformedValue = (((peakRatio > 1 ? 1 : peakRatio)) * 180) - 90, // 피크율 게이지 바늘 각도
            peakStatus = element.querySelectorAll('.peakStatus'), // 피크율 게이지
            isExceed = peakRatio > 1, // 초과
            isApproaching = peakRatio > 0.8 && !isExceed; // 근접

        if (keys.length > 1) {
            const firm = this._members.find(row => row.fid == fid);
            element.querySelector('.firmName').textContent = firm && firm.name ? firm.name : '';
        }

        this._peakTime[fid] = data[3];

        if (element.querySelector('.realTimePeakTimeBar')) {
            // 실시간 피크 전력 Time Bar
            element.querySelector('.realTimePeakTimeBar').style.width = `${Math.round(this._peakTime[fid] / 900 * 100)}%`;
            element.querySelector('.realTimeMinSec').textContent = this.convertSecToMin(this._peakTime[fid]);
        }

        if (!isNaN(peakRatio)) {
            element.querySelector('.realTimePeakRatio').textContent = this.echoNumber(Math.floor(peakRatio * 100));
            element.querySelector('.realTimePeakGauge').style.fill = this.getColorAtPercentage(peakRatio);
        }
        if (!isNaN(transformedValue)) {
            element.querySelector('.realTimePeakGauge').style.transform = `translateX(-50%) rotate(${transformedValue}deg)`;
        }
        peakStatus[0].classList.toggle('on', !isExceed && !isApproaching); // 안정
        peakStatus[1].classList.toggle('on', isApproaching); // 근접
        peakStatus[2].classList.toggle('on', isExceed); // 초과

        // 오늘의 피크
        const todayPeakElement = element.querySelector('.todayPeak').children,
            todayPeakCompare = todayPeakElement[2].children,
            peakCompare = data[5] - data[6],
            peakCompareRatio = data[5] && data[6] ? (data[5] - data[6]) / data[6] * 100 : '';

        dom.getElementById('peakTime').textContent = this.echoDate('h:i', data[4]);
        if (vio._timer) {
            element.querySelector('.realTimePeakGoal').textContent = this.echoNumber(peakGoal);
            element.querySelector('.realTimePeakPower').textContent = this.echoNumber(peakPower);
            todayPeakElement[0].textContent = this.echoNumber(data[5]);
        } else {
            element.querySelector('.realTimePeakGoal').dataset.to = peakGoal;
            element.querySelector('.realTimePeakPower').dataset.to = peakPower;
            todayPeakElement[0].dataset.to = data[5];
        }
        todayPeakElement[2].classList.toggle('up', peakCompare > 0);
        todayPeakElement[2].classList.toggle('down', peakCompare < 0);
        todayPeakCompare[0].classList.toggle('bi-caret-up-fill', peakCompare > 0);
        todayPeakCompare[0].classList.toggle('bi-caret-down-fill', peakCompare < 0);
        todayPeakCompare[1].textContent = peakCompareRatio ? `${this.echoNumber(Math.abs(parseFloat(peakCompareRatio.toFixed(1))))}%` : '';
        todayPeakCompare[2].textContent = peakCompare > 0 ? `+${this.echoNumber(peakCompare.toFixed(0))}` : this.echoNumber(peakCompare.toFixed(0));
    });

    vio.peakLoadTimeBar();
}

/**
 * 2. 실시간 전력 사용량 데이터 매핑
 * @param data
 */
vio.dataTransPeakLoad = function(data) {
    const dom = document,
        {
            latestTime = '',
            latestUse = 0,
            lastUse = 0,
            todayTime = '',
            todayUse = '',
            weekUse = '',
            loadTimes = []
        } = data;

    this._peakLoadTime = latestTime;
    this.peakLoadTimeBar();

    const latestUseGap = (latestUse - lastUse) / 1000,
        latestUseGapRatio = (latestUse > 0 && lastUse > 0) ? (latestUse - lastUse) / lastUse * 100 : 0,
        todayUseGap = (todayUse - weekUse) / 1000,
        todayUseGapRatio = (todayUse > 0 && weekUse > 0) ? (todayUse - weekUse) / weekUse * 100 : 0;

    const realTime = dom.getElementById('realTimeAreaWidget2').children,
        latestUseElement = dom.getElementById('latestUse').children,
        latestUseCompare = latestUseElement[2].children,
        todayUseElement = dom.getElementById('todayUse').children,
        todayUseCompare = todayUseElement[2].children;
    // 시간별 부하(경부하, 중부하, 최대부하)
    for (let i = 0; i < realTime.length; i++) {
        realTime[i].classList.toggle('realTimeMiddle', loadTimes[i] === 1);
        realTime[i].classList.toggle('realTimeHigh', loadTimes[i] === 2);

        realTime[i].classList.remove('active');
    }

    const currentHours = new Date().getHours();
    realTime[currentHours].classList.add('active');

    // 최근 1시간당 사용량
    if (this._timer) {
        latestUseElement[0].textContent = this.echoNumber(Math.round(latestUse / 1000));
    } else {
        latestUseElement[0].dataset.to = Math.round(latestUse / 1000);
    }
    latestUseElement[2].classList.toggle('up', latestUseGap > 0);
    latestUseElement[2].classList.toggle('down', latestUseGap < 0);
    latestUseCompare[0].classList.toggle('bi-caret-up-fill', latestUseGap > 0);
    latestUseCompare[0].classList.toggle('bi-caret-down-fill', latestUseGap < 0);
    latestUseCompare[1].textContent = latestUseGapRatio ? `${Math.abs(parseFloat(latestUseGapRatio.toFixed(1)))}%` : '';
    latestUseCompare[2].textContent = latestUseGap.toFixed(0) > 0 ? `+${this.echoNumber(latestUseGap.toFixed(0))}` : this.echoNumber(latestUseGap.toFixed(0));

    dom.getElementById('latestTime').textContent = `~${this.echoDate('h:i', latestTime)}`;

    // 오늘 누적 사용량
    if (this._timer) {
        todayUseElement[0].textContent = this.echoNumber(Math.round(todayUse / 1000));
    } else {
        todayUseElement[0].dataset.to = Math.round(todayUse / 1000);
    }
    todayUseElement[2].classList.toggle('up', todayUseGap > 0);
    todayUseElement[2].classList.toggle('down', todayUseGap < 0);
    todayUseCompare[0].classList.toggle('bi-caret-up-fill', todayUseGap > 0);
    todayUseCompare[0].classList.toggle('bi-caret-down-fill', todayUseGap < 0);
    todayUseCompare[1].textContent = todayUseGapRatio ? `${Math.abs(parseFloat(todayUseGapRatio.toFixed(1)))}%` : '';
    todayUseCompare[2].textContent = todayUseGap > 0 ? `+${this.echoNumber(todayUseGap.toFixed(0))}` : this.echoNumber(todayUseGap.toFixed(0));
    dom.getElementById('todayTime').textContent = `~${this.echoDate('h:i', todayTime)}`;
}

/**
 * 3. 오늘의 전력 사용량 데이터 매핑
 * @param data
 */
vio.dataTransWattUse = function(data) {
    const dom = document,
        {
            today = [],
            yesterday = [],
            lastWeek = [],
            todayWatt = 0,
            yesterdayWatt = 0,
            lastWeekWatt = 0,
            toCO2 = 0
        } = data;

    if (toCO2) {
        this._setToCO2 = toCO2;
    }

    if (this._timer) {
        dom.getElementById('wattUseToday').textContent = this.echoNumber(Math.floor(todayWatt / 1000));
        dom.getElementById('wattUseYesterday').textContent = this.echoNumber(Math.floor(yesterdayWatt / 1000));
        dom.getElementById('wattUseLastWeek').textContent = this.echoNumber(Math.floor(lastWeekWatt / 1000));
    } else {
        dom.getElementById('wattUseToday').dataset.to = Math.floor(todayWatt / 1000);
        dom.getElementById('wattUseYesterday').dataset.to = Math.floor(yesterdayWatt / 1000);
        dom.getElementById('wattUseLastWeek').dataset.to = Math.floor(lastWeekWatt / 1000);
    }

    // 오늘의 전력 사용량 그래프 초기화
    let renderData = [];
    for (let i = 0; i < 24; i++) {
        renderData.push({
            seq: `${i.toString().padStart(2, '0')}:00`,
            today: '',
            yesterday: 0,
            lastWeek: 0,
            power: '',
            co2: ''
        });
    }

    // 오늘 데이터 Set
    for (let i = 0; i < today.length; i++) {
        const item = today[i];

        let todayValue = item[1];
        let todayPower = item[2];
        todayValue = todayValue ? (todayValue / 1000).toFixed(2) : todayValue;
        todayPower = todayPower ? (todayPower / 1000 * 4).toFixed(2) : todayPower;

        const element = renderData.find(function(row) {
            return row.seq === vio.echoDate('h:00', item[0]);
        });

        if (element) {
            element.today = todayValue;
            element.power = todayPower;
            element.co2 = (todayValue * this._setToCO2).toFixed(2);
        }
    }
    // 어제 데이터 Set
    for (let i = 0; i < yesterday.length; i++) {
        const item = yesterday[i];

        let yesterdayValue = item ? item[1] : '';
        yesterdayValue = yesterdayValue ? (yesterdayValue / 1000).toFixed(2) : 0;

        const element = renderData.find(function(row) {
            return row.seq === vio.echoDate('h:00', item[0]);
        });

        if (element) {
            element.yesterday = yesterdayValue;
        }
    }
    // 지난주 데이터 Set
    for (let i = 0; i < lastWeek.length; i++) {
        const item = lastWeek[i];

        let lastWeekValue = item ? item[1] : '';
        lastWeekValue = lastWeekValue ? (lastWeekValue / 1000).toFixed(2) : 0;

        const element = renderData.find(function(row) {
            return row.seq === vio.echoDate('h:00', item[0]);
        });

        if (element) {
            element.lastWeek = lastWeekValue;
        }
    }

    // 데이블 데이터 매핑
    const todayWattTable = dom.getElementById('todayWattTable').children;
    for (let i = 0; i < renderData.length; i++) {
        const dt = todayWattTable[i].children;

        dt[1].textContent = this.echoNumber(renderData[i].today);
        dt[2].textContent = this.echoNumber(renderData[i].power);
        dt[3].textContent = this.echoNumber(renderData[i].co2);
    }

    vio.renderTodayWattChart(renderData);
}

/**
 * 3. 오늘의 전력 사용량 차트
 * @param data
 */
vio.renderTodayWattChart = function(data) {
    const seqData = data.map(item => item.seq),
        todayData = data.map(item => item.today),
        yesterdayData = data.map(item => item.yesterday),
        lastweekData = data.map(item => item.lastWeek);

    const now = new Date();
    const oneHourBefore = new Date(now);
    oneHourBefore.setHours(now.getHours() - 2);
    const formattedHours = String(oneHourBefore.getHours()).padStart(2, '0');
    const currentHours = `${formattedHours}:00`;

    let lastIndex = todayData.length - 1;
    let lastValue = '';
    for (let i = seqData.length - 1; i >= 0; i--) {
        if (currentHours === seqData[i] || todayData[i]) {
            lastIndex = i;
            lastValue = todayData[i];

            if (!todayData[i]) {
                todayData[i] = 0;
            }

            break;
        } else if (currentHours > seqData[i] && !todayData[i]) {
            todayData[i] = 0;
        }
    }

    // ECharts 차트 생성
    this._todayWattChart = echarts.init(document.getElementById('todayWattChart'));

    // 차트 옵션 설정
    let option = {};
    option.legend = {
        x: 'center',
        y: 'bottom',
        textStyle: {
            color: '#ffffffa6'
        }
    };
    option.grid = {
        left: '1%',
        bottom: '20%',
        right: '1%',
        top: '5%',
        containLabel: true
    };
    option.xAxis = {
        type: 'category',
        boundaryGap: false,
        show: true,
        data: seqData
    };
    option.yAxis = {
        type: 'value',
        show: true,
        splitLine: {
            lineStyle: {
                color: '#5f627a'
            }
        }
    };
    option.tooltip = {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    };
    option.series = [{
        name: '오늘',
        type: 'line',
        itemStyle: {
            color: '#77d4ff'
        },
        lineStyle: {
            width: 2
        },
        emphasis: {
            lineStyle: {
                width: 2
            },
        },
        symbol: 'line',
        showSymbol: false,
        data: todayData,
        z: 3
    }, {
        name: '어제',
        type: 'line',
        itemStyle: {
            color: '#c580e2'
        },
        lineStyle: {
            width: 2
        },
        emphasis: {
            lineStyle: {
                width: 2
            },
        },
        symbol: 'line',
        showSymbol: false,
        data: yesterdayData,
        z: 2
    }, {
        name: '지난주',
        type: 'line',
        itemStyle: {
            color: '#72c98b'
        },
        lineStyle: {
            width: 2
        },
        emphasis: {
            lineStyle: {
                width: 2
            },
        },
        symbol: 'line',
        showSymbol: false,
        data: lastweekData,
        z: 1
    }, {
        type: 'effectScatter',
        showEffectOn: 'render',
        rippleEffect: {
            brushType: 'stroke',
            scale: '3'
        },
        itemStyle: {
            color: '#77d4ff'
        },
        data: [
            {
                value: [lastIndex, lastValue],
                symbolSize: 7, // 동그라미 크기 조절
                label: {
                    show: false,
                }
            }
        ],
        tooltip: {
            show: false // 툴팁 숨기기
        }
    }];

    // 차트에 옵션 적용
    this._todayWattChart.setOption(option);
}

/**
 * 33. 오늘의 가스 사용량 데이터 매핑
 * @param data
 */
vio.dataTransGasUse = function(data) {
    const dom = document,
        {
            today = [],
            yesterday = [],
            lastWeek = [],
            todayGas = 0,
            yesterdayGas = 0,
            lastWeekGas = 0,
        } = data;

    if (this._timer) {
        dom.getElementById('gasUseToday').textContent = this.echoNumber(todayGas);
        dom.getElementById('gasUseYesterday').textContent = this.echoNumber(yesterdayGas);
        dom.getElementById('gasUseLastWeek').textContent = this.echoNumber(lastWeekGas);
    } else {
        dom.getElementById('gasUseToday').dataset.to = todayGas;
        dom.getElementById('gasUseYesterday').dataset.to = yesterdayGas;
        dom.getElementById('gasUseLastWeek').dataset.to = lastWeekGas;
    }

    // 오늘의 전력 사용량 그래프 초기화
    let renderData = [];
    for (let i = 0; i < 24; i++) {
        renderData.push({
            seq: `${i.toString().padStart(2, '0')}:00`,
            today: '',
            yesterday: 0,
            lastWeek: 0,
            gas: '',
        });
    }

    // 오늘 데이터 Set
    for (let i = 0; i < today.length; i++) {
        const item = today[i];

        let todayValue = item[1];
        const element = renderData.find(function(row) {
            return row.seq === vio.echoDate('h:00', item[0]);
        });

        if (element) {
            element.today = todayValue;
        }
    }
    // 어제 데이터 Set
    for (let i = 0; i < yesterday.length; i++) {
        const item = yesterday[i];

        let yesterdayValue = item ? item[1] : '';
        const element = renderData.find(function(row) {
            return row.seq === vio.echoDate('h:00', item[0]);
        });

        if (element) {
            element.yesterday = yesterdayValue;
        }
    }
    // 지난주 데이터 Set
    for (let i = 0; i < lastWeek.length; i++) {
        const item = lastWeek[i];

        let lastWeekValue = item ? item[1] : '';
        const element = renderData.find(function(row) {
            return row.seq === vio.echoDate('h:00', item[0]);
        });

        if (element) {
            element.lastWeek = lastWeekValue;
        }
    }

    // 데이블 데이터 매핑
    const todayGasTable = dom.getElementById('todayGasTable').children;
    for (let i = 0; i < renderData.length; i++) {
        const dt = todayGasTable[i].children;

        dt[1].textContent = this.echoNumber(renderData[i].today);
    }

    vio.renderTodayGasChart(renderData);
};

/**
 * 33. 오늘의 가스 사용량 차트
 * @param data
 */
vio.renderTodayGasChart = function(data) {
    const seqData = data.map(item => item.seq),
        todayData = data.map(item => item.today),
        yesterdayData = data.map(item => item.yesterday),
        lastweekData = data.map(item => item.lastWeek);

    const now = new Date();
    const oneHourBefore = new Date(now);
    oneHourBefore.setHours(now.getHours() - 2);
    const formattedHours = String(oneHourBefore.getHours()).padStart(2, '0');
    const currentHours = `${formattedHours}:00`;

    let lastIndex = todayData.length - 1;
    let lastValue = '';
    for (let i = seqData.length - 1; i >= 0; i--) {
        if (currentHours === seqData[i] || todayData[i]) {
            lastIndex = i;
            lastValue = todayData[i];

            if (!todayData[i]) {
                todayData[i] = 0;
            }

            break;
        } else if (currentHours > seqData[i] && !todayData[i]) {
            todayData[i] = 0;
        }
    }

    // ECharts 차트 생성
    this._todayGasChart = echarts.init(document.getElementById('todayGasChart'));

    // 차트 옵션 설정
    let option = {};
    option.legend = {
        x: 'center',
        y: 'bottom',
        textStyle: {
            color: '#ffffffa6'
        }
    };
    option.grid = {
        left: '1%',
        bottom: '20%',
        right: '1%',
        top: '5%',
        containLabel: true
    };
    option.xAxis = {
        type: 'category',
        boundaryGap: false,
        show: true,
        data: seqData
    };
    option.yAxis = {
        type: 'value',
        show: true,
        splitLine: {
            lineStyle: {
                color: '#5f627a'
            }
        }
    };
    option.tooltip = {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    };
    option.series = [{
        name: '오늘',
        type: 'line',
        itemStyle: {
            color: '#77d4ff'
        },
        lineStyle: {
            width: 2
        },
        emphasis: {
            lineStyle: {
                width: 2
            },
        },
        symbol: 'line',
        showSymbol: false,
        data: todayData,
        z: 3
    }, {
        name: '어제',
        type: 'line',
        itemStyle: {
            color: '#c580e2'
        },
        lineStyle: {
            width: 2
        },
        emphasis: {
            lineStyle: {
                width: 2
            },
        },
        symbol: 'line',
        showSymbol: false,
        data: yesterdayData,
        z: 2
    }, {
        name: '지난주',
        type: 'line',
        itemStyle: {
            color: '#72c98b'
        },
        lineStyle: {
            width: 2
        },
        emphasis: {
            lineStyle: {
                width: 2
            },
        },
        symbol: 'line',
        showSymbol: false,
        data: lastweekData,
        z: 1
    }, {
        type: 'effectScatter',
        showEffectOn: 'render',
        rippleEffect: {
            brushType: 'stroke',
            scale: '3'
        },
        itemStyle: {
            color: '#77d4ff'
        },
        data: [
            {
                value: [lastIndex, lastValue],
                symbolSize: 7, // 동그라미 크기 조절
                label: {
                    show: false,
                }
            }
        ],
        tooltip: {
            show: false // 툴팁 숨기기
        }
    }];

    // 차트에 옵션 적용
    this._todayGasChart.setOption(option);
};

/**
 * 4. 생산량 대비 전력 사용량 데이터 매핑
 * @param data
 */
vio.dataTransRicePart = function(data) {
    const {
        week = [],
        lastWeek = [],
        daysOfWeek = this.daysOfWeek()
    } = data;

    const chartData = [];
    // 차트 데이터 초기화
    for (let i = 0; i < daysOfWeek.length; i++) {
        chartData.push({seq: daysOfWeek[i], week: '', lastWeek: ''});
    }

    // 이번주 데이터 Set
    for (let i = 0; i < week.length; i++) {
        const item = week[i];

        const element = chartData.find(function(row) {
            return row.seq === vio.echoDate('w', item[0]);
        });

        if (element) {
            element.week = item[1].toFixed(2);
        }
    }

    // 지난주 데이터 Set
    for (let i = 0; i < lastWeek.length; i++) {
        const item = lastWeek[i];

        const element = chartData.find(function(row) {
            return row.seq === vio.echoDate('w', item[0]);
        });

        if (element) {
            element.lastWeek = item[1].toFixed(2);
        }
    }

    chartData[chartData.length - 1].seq = '오늘';

    this.renderRicePartChart(chartData);
}

/**
 * 4. 생산량 대비 전력 사용량 차트
 * @param data
 */
vio.renderRicePartChart = function(data) {
    const dom = document,

        seqData = data.map(item => item.seq),
        weekData = data.map(item => item.week),
        lastWeekData = data.map(item => item.lastWeek),
        hasData = weekData.reduce((a, b) => parseInt(a) + parseInt(b), 0)
            || lastWeekData.reduce((a, b) => parseInt(a) + parseInt(b), 0);

    dom.getElementById('noData').classList.toggle('disable', hasData);

    // ECharts 차트 생성
    this._ricePartChart = echarts.init(dom.getElementById('ricePartChart'));

    // 차트 옵션 설정
    let option = {};
    option.legend = {
        x: 'center',
        y: 'bottom',
        textStyle: {
            color: '#ffffffa6'
        }
    };
    option.grid = {
        left: '1%',
        bottom: '20%',
        right: '1%',
        top: '5%',
        containLabel: true
    };
    option.xAxis = {
        type: 'category',
        show: true,
        data: seqData
    };
    option.yAxis = {
        type: 'value',
        show: true,
        splitLine: {
            lineStyle: {
                color: '#5f627a'
            }
        }
    };
    option.tooltip = {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    };
    option.series = [{
        name: '이번주',
        type: 'bar',
        barWidth: '50%',
        itemStyle: {
            color: '#8b6dff'
        },
        data: weekData
    }, {
        name: '지난주',
        type: 'line',
        lineStyle: {
            width: 2
        },
        emphasis: {
            lineStyle: {
                width: 2
            },
        },
        itemStyle: {
            color: '#c580e2'
        },
        symbolSize: 6,
        data: lastWeekData
    }];

    // 차트에 옵션 적용
    this._ricePartChart.setOption(option);
}

/**
 * 5. 주간 전력 사용량 데이터 매핑
 * @param data
 */
vio.dataTransWattWeek = function(data) {
    const dom = document,
        rows = dom.getElementById('wattWeekTable').children,
        {
            week = [], // 이번주
            lastWeek = [], // 지난주
            power = []
        } = data;

    const chartData = [],
        daysOfWeek = this.daysOfWeek();

    // 차트 데이터 초기화
    for (let i = 0; i < daysOfWeek.length; i++) {
        chartData.push({seq: daysOfWeek[i], week: '', lastWeek: ''});
    }

    let weekSum = 0; // 이번주 합계
    // 이번주 데이터 Set
    for (let i = 0; i < week.length; i++) {
        const item = week[i];

        const element = chartData.find(function(row) {
            return row.seq === vio.echoDate('w', item[0]);
        });

        if (element) {
            const watt = item[1];

            element.week = Math.floor(watt / 1000);
            element.power = (item[2] / 1000).toFixed(2);
            weekSum += watt;
        }
    }

    let lastWeekSum = 0; // 지난주 합계
    // 지난주 데이터 Set
    for (let i = 0; i < lastWeek.length; i++) {
        const item = lastWeek[i];

        const element = chartData.find(function(row) {
            return row.seq === vio.echoDate('w', item[0]);
        });

        if (element) {
            const watt = item[1];

            element.lastWeek = Math.floor(watt / 1000);
            lastWeekSum += watt;
        }
    }

    chartData[chartData.length - 1].seq = '오늘';

    // 테이블 탭 데이터 매핑
    for (let i = 0; i < chartData.length; i++) {
        const item = chartData[i],
            dt = rows[i].children;

        dt[0].textContent = item.seq;
        dt[1].textContent = this.echoNumber(item.week);
        dt[2].textContent = item.power ? this.echoNumber(item.power * 4) : '';
        dt[3].textContent = item.week ? this.echoNumber((item.week * this._setToCO2).toFixed(2)) : '-';
    }

    if (this._timer) {
        dom.getElementById('wattWeekSum').textContent = this.echoNumber(Math.floor(weekSum / 1000));
        dom.getElementById('lastWeekSum').textContent = this.echoNumber(Math.floor(lastWeekSum / 1000));
    } else {
        dom.getElementById('wattWeekSum').dataset.to = Math.floor(weekSum / 1000);
        dom.getElementById('lastWeekSum').dataset.to = Math.floor(lastWeekSum / 1000);
    }

    this.renderWattWeekChart(chartData);
}

/**
 * 5. 주간 전력 사용량 차트
 * @param data
 */
vio.renderWattWeekChart = function(data) {
    const seqData = data.map(item => item.seq),
        weekData = data.map(item => item.week),
        lastWeekData = data.map(item => item.lastWeek);

    // ECharts 차트 생성
    this._wattWeekChart = echarts.init(document.getElementById('wattWeekChart'));

    // 차트 옵션 설정
    let option = {};
    option.legend = {
        x: 'center',
        y: 'bottom',
        textStyle: {
            color: '#ffffffa6'
        }
    };
    option.grid = {
        left: '1%',
        bottom: '20%',
        right: '1%',
        top: '5%',
        containLabel: true
    };
    option.xAxis = {
        type: 'category',
        show: true,
        data: seqData
    };
    option.yAxis = {
        type: 'value',
        show: true,
        splitLine: {
            lineStyle: {
                color: '#5f627a'
            }
        }
    };
    option.tooltip = {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    };
    option.series = [{
        name: '이번주',
        type: 'bar',
        barWidth: '50%',
        itemStyle: {
            color: '#90cdf4'
        },
        symbol: 'none',
        data: weekData
    }, {
        name: '지난주',
        type: 'line',
        lineStyle: {
            width: 2
        },
        emphasis: {
            lineStyle: {
                width: 2
            },
        },
        itemStyle: {
            color: '#c580e2'
        },
        symbolSize: 6,
        data: lastWeekData
    }];

    // 차트에 옵션 적용
    this._wattWeekChart.setOption(option);
}

/**
 * 6. 오늘의 피크전력 데이터 매핑
 * @param data
 */
vio.dataTransPeakDaily = function(data) {
    const today = data[1],
        yesterday = data[2],
        lastWeek = data[3];

    // 오늘의 피크전력 그래프 초기화
    let chartData = [];
    for (let i = 0; i <= 95; ++i) {
        const seqTime = `${Math.floor(i / 4).toString().padStart(2, '0')}:${(i % 4 * 15).toString().padStart(2, '0')}`;
        chartData.push({seq: seqTime, today: 0, yesterday: 0, lastweek: 0, goal: data[0]});
    }

    // 오늘 데이터 Set
    for (let i = 0; i < today.length; i++) {
        const todayItem = today[i];
        const element = chartData.find(function(item) {
            return item.seq === vio.echoDate('h:i', todayItem[0]);
        });

        if (element) {
            element.today = todayItem[1];
        }
    }
    // 어제 데이터 Set
    for (let i = 0; i < yesterday.length; i++) {
        const yesterdayItem = yesterday[i];
        const element = chartData.find(function(item) {
            return item.seq === vio.echoDate('h:i', yesterdayItem[0]);
        });

        if (element) {
            element.yesterday = yesterdayItem[1];
        }
    }
    // 지난주 데이터 Set
    for (let i = 0; i < lastWeek.length; i++) {
        const lastWeekItem = lastWeek[i];
        const element = chartData.find(function(item) {
            return item.seq === vio.echoDate('h:i', lastWeekItem[0]);
        });

        if (element) {
            element.lastweek = lastWeekItem[1];
        }
    }

    vio.renderTodayPeakChart(chartData);
}

/**
 * 6. 오늘의 피크전력 차트
 * @param data
 */
vio.renderTodayPeakChart = function(data) {
    // ECharts 차트 생성
    this._todayPeakChart = echarts.init(document.getElementById('todayPeakChart'));

    // 차트 옵션 설정
    let option = {};
    option.legend = {
        x: 'center',
        y: 'bottom',
        textStyle: {
            color: '#ffffffa6'
        }
    };
    option.grid = {
        left: '1%',
        bottom: '20%',
        right: '1%',
        top: '5%',
        containLabel: true
    };
    option.xAxis = {
        type: 'category',
        boundaryGap: false,
        show: true,
        data: data.map(item => item.seq)
    };
    option.yAxis = {
        type: 'value',
        show: true,
        splitLine: {
            lineStyle: {
                color: '#5f627a'
            }
        }
    };
    option.tooltip = {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    };
    option.series = [{
        name: '오늘',
        type: 'bar',
        itemStyle: {
            color: '#77d4ff',
            opacity: 0.8
        },
        symbol: 'none',
        data: data.map(item => item.today),
        z: 1
    }, {
        name: '어제',
        type: 'line',
        lineStyle: {
            width: 2
        },
        emphasis: {
            lineStyle: {
                width: 2
            },
        },
        itemStyle: {
            color: '#c580e2'
        },
        symbol: 'line',
        showSymbol: false,
        data: data.map(item => item.yesterday),
        z: 3
    }, {
        name: '지난주',
        type: 'line',
        lineStyle: {
            width: 2
        },
        emphasis: {
            lineStyle: {
                width: 2
            },
        },
        itemStyle: {
            color: '#72c98b'
        },
        symbol: 'line',
        showSymbol: false,
        data: data.map(item => item.lastweek),
        z: 2
    }, {
        name: '목표',
        type: 'line',
        lineStyle: {
            type: 'dotted',
            width: 4
        },
        emphasis: {
            lineStyle: {
                width: 4
            },
        },
        itemStyle: {
            color: '#f44336'
        },
        symbol: 'line',
        showSymbol: false,
        data: data.map(item => item.goal)
    }];

    // 차트에 옵션 적용
    this._todayPeakChart.setOption(option);
}

/**
 * 7. 에너지 절감효과 데이터 매핑
 * @param data
 */
vio.dataTransEnergySafe = function(data) {
    const dom = document,
        upDown = dom.getElementById('energySafeUpDown'),
        upCompare = upDown.children,
        {
            toeTime = '',
            toeSafe = '',
            toeMonth = '',
            lastRate = '',
            safeRate = '',
            goldSafe = '',
            co2Safe = ''
        } = data;

    dom.getElementById('toeSafeDate').textContent = toeTime ? `(${this.echoDate('y.m', toeTime)})` : '';
    dom.getElementById('toeMonthDate').textContent = toeTime ? `(${this.echoDate('y.m', toeTime)})` : '';
    dom.getElementById('lastRate').textContent = lastRate ? `${Math.abs(lastRate.toFixed(2))}%` : '';

    if (this._timer) {
        dom.getElementById('toeSafe').textContent = toeSafe ? this.echoNumber(toeSafe.toFixed(2)) : 0;
        dom.getElementById('toeMonth').textContent = toeMonth ? this.echoNumber(toeMonth.toFixed(2)) : 0;
        dom.getElementById('safeRate').textContent = safeRate ? this.echoNumber(safeRate.toFixed(2)) : 0;
        dom.getElementById('goldSafe').textContent = goldSafe ? this.echoNumber(goldSafe.toFixed(2)) : 0;
        dom.getElementById('co2Safe').textContent = co2Safe ? this.echoNumber(co2Safe.toFixed(2)) : 0;
    } else {
        dom.getElementById('toeSafe').dataset.to = toeSafe ? toeSafe.toFixed(2) : 0;
        dom.getElementById('toeMonth').dataset.to = toeMonth ? toeMonth.toFixed(2) : 0;
        dom.getElementById('safeRate').dataset.to = safeRate ? safeRate.toFixed(2) : 0;
        dom.getElementById('goldSafe').dataset.to = goldSafe ? goldSafe.toFixed(2) : 0;
        dom.getElementById('co2Safe').dataset.to = co2Safe ? co2Safe.toFixed(2) : 0;
    }

    upDown.classList.toggle('up', lastRate > 0);
    upDown.classList.toggle('down', lastRate < 0);
    upCompare[0].classList.toggle('bi-caret-up-fill', lastRate > 0);
    upCompare[0].classList.toggle('bi-caret-down-fill', lastRate < 0);
}

/**
 * 8. 월별 최대수요 데이터 매핑
 * @param peakMax
 */
vio.dataTransPeakMax = function(peakMax) {
    const dom = document,
        {
            data = [],
            baseWatt = '',
            peakDay = '',
            peakMonth = '',
            peakLastYear = ''
        } = peakMax;

    if (this._timer) {
        dom.getElementById('baseWatt').textContent = this.echoNumber(baseWatt);
        dom.getElementById('peakDay').textContent = this.echoNumber(peakDay);
        dom.getElementById('peakMonth').textContent = this.echoNumber(peakMonth);
        dom.getElementById('peakLastYear').textContent = this.echoNumber(peakLastYear);
    } else {
        dom.getElementById('baseWatt').dataset.to = baseWatt;
        dom.getElementById('peakDay').dataset.to = peakDay;
        dom.getElementById('peakMonth').dataset.to = peakMonth;
        dom.getElementById('peakLastYear').dataset.to = peakLastYear;
    }

    let chartData = [];
    let today = new Date();
    let currentMonth = today.getMonth() + 1; // 현재 월
    // 오늘 월부터 과거 1년치 데이터 초기화
    for (let i = 11; i >= 0; i--) {
        let month = (currentMonth - i + 12) % 12 || 12;
        chartData.push({seq: month, watt: ''});
    }

    for (let i = 0; i < data.length; i++) {
        const item = data[i] ?? '',
            time = item[0] ?? '',
            month = parseInt(this.echoDate('m', time));

        const element = chartData.find(function(item) {
            return item.seq === month;
        });

        if (element) {
            element.watt = item[1] ?? '';
        }
    }

    vio.renderPeakMaxChart(chartData);
}

/**
 * 8. 월별 최대수요 차트
 */
vio.renderPeakMaxChart = function(data) {
    const seqData = data.map(item => item.seq),
        wattData = data.map(item => item.watt);

    // 최대수요 내림차순 정렬
    const sortedWattData = [...new Set(wattData)].sort((a, b) => b - a);
    const max1 = sortedWattData[0];
    const max2 = sortedWattData[1];

    // ECharts 차트 생성
    this._peakMaxChart = echarts.init(document.getElementById('peakMaxChart'));

    // 차트 옵션 설정
    let option = {};
    option.grid = {
        left: '1%',
        bottom: '1%',
        right: '1%',
        top: '5%',
        containLabel: true
    };
    option.xAxis = {
        type: 'category',
        show: true,
        data: seqData
    };
    option.yAxis = {
        type: 'value',
        show: true,
        splitLine: {
            lineStyle: {
                color: '#5f627a'
            }
        }
    };
    option.tooltip = {
        axisPointer: {
            type: 'shadow'
        }
    };
    option.series = [{
        type: 'bar',
        barWidth: '50%',
        itemStyle: {
            color: function(params) {
                let color;
                switch (params.value) {
                    case max1:
                        color = '#f56565';
                        break;
                    case max2:
                        color = '#f6e05e';
                        break;
                    default:
                        color = '#90cdf4';
                        break;
                }
                return color;
            }
        },
        symbol: 'none',
        data: wattData
    }];

    // 차트에 옵션 적용
    this._peakMaxChart.setOption(option);
}

/**
 * 9. 설비제어 데이터 매핑
 * @param data
 */
vio.dataTransNodeControl = function(data) {
    const dom = document,
        nodeControlRows = dom.getElementById('nodeControlRows'),
        nodeControlTotal = dom.getElementById('nodeControlTotal');

    // 제어상태 ON이 상위에 노출
    data.sort(function(a, b) {
        return b[2] - a[2];
    });

    // 총설비 수
    if (parseInt(nodeControlTotal.innerText) !== data.length) {
        nodeControlTotal.textContent = this.echoNumber(data.length);

        let out = '';
        for (let i = 0; i < data.length; i++) {
            out += `
            <tr>
                <td>
                    <span></span>
                </td>        
                <td></td>        
            </tr>`;
        }
        nodeControlRows.innerHTML = out;
    }

    let on = 0,
        off = 0;
    const rows = nodeControlRows.children;
    for (let i = 0; i < rows.length; i++) {
        const dt = rows[i].children,
            item = data[i];

        if (item[2] === 1) {
            on++;
            dt[0].children[0].className = 'on';
            dt[0].children[0].textContent = 'ON';
        } else {
            off++;
            dt[0].children[0].className = 'off';
            dt[0].children[0].textContent = 'OFF';
        }

        dt[1].textContent = item[1] ?? '';
    }

    // 제어상태
    let statusText;
    if (on === 0) {
        statusText = '전체 OFF';
    } else if (off === 0) {
        statusText = '전체제어중';
    } else {
        statusText = '일부제어중';
    }
    dom.getElementById('nodeControlStatus').textContent = statusText;
}

/**
 * 10. 현재 상태 데이터 매핑
 * @param data
 * @param peakTime
 */
vio.dataTransWattStatus = function(data, peakTime) {
    const dom = document,
        netBad = data[0],
        netGood = data[1],
        netTotal = netBad + netGood,
        peakPower = peakTime[1] ?? '', // 예측전력
        peakGoal = peakTime[2] ?? '', // 목표전력
        peakRatio = peakPower / peakGoal, // 피크율
        isExceed = peakRatio > 1; // 초과;

    // 날씨 아이콘 매핑
    const weatherIconMap = {
        1: 'rain', // 비
        2: 'rainSnow', // 비/눈
        3: 'snow', // 눈
        5: 'rainCloud', // 빗방울
        6: 'dropSnowFlow', // 빗방울눈날림
        7: 'snowFlow' // 눈날림
    };
    const weatherIcon = weatherIconMap[data[7]] || 'sun';
    dom.getElementById('weatherIcon').setAttribute('xlink:href', `assets/img/weather-icons.svg#${weatherIcon}`);
    dom.getElementById('temperature').textContent = data[6];

    if (this._timer) {
        dom.getElementById('netRatio').textContent = netGood && netTotal ? this.echoNumber(Math.round(netGood / netTotal * 100)) : 0;
        dom.getElementById('netCountGood').textContent = this.echoNumber(netGood);
        dom.getElementById('netCountBad').textContent = this.echoNumber(netBad);
        dom.getElementById('todayMaxPeak').textContent = this.echoNumber(data[2]);
        dom.getElementById('monthMaxPeak').textContent = this.echoNumber(data[3]);
        dom.getElementById('todayFee').textContent = this.echoNumber(data[4]);
    } else {
        dom.getElementById('netRatio').dataset.to = netGood && netTotal ? Math.round(netGood / netTotal * 100) : 0;
        dom.getElementById('netCountGood').dataset.to = netGood;
        dom.getElementById('netCountBad').dataset.to = netBad;
        dom.getElementById('todayMaxPeak').dataset.to = data[2];
        dom.getElementById('monthMaxPeak').dataset.to = data[3];
        dom.getElementById('todayFee').dataset.to = data[4];
    }

    dom.getElementById('todayFeeTime').textContent = `~${this.echoDate('h:i', data[5])}`;

    if (vio._audioPeakReady) {
        if (!vio._audioMute && isExceed) {
            vio._audioPeak.play();
        } else {
            vio._audioPeak.pause();
        }
    }
}

/**
 * 11. 오늘의 누적 전력 사용량 데이터 매핑
 * @param data
 */
vio.dataTransWattToday = function(data) {
    const dom = document,
        {
            todayTime = '',
            todayUse = '',
            weekUse = '',
            loadTimes = []
        } = data,
        todayUseGap = (todayUse - weekUse) / 1000,
        todayUseGapRatio = (todayUse > 0 && weekUse > 0) ? (todayUse - weekUse) / weekUse * 100 : '';

    // 오늘 전력 사용량
    if (this._timer) {
        dom.getElementById('todayUse11').textContent = this.echoNumber(Math.round(todayUse / 1000));
    } else {
        dom.getElementById('todayUse11').dataset.to = Math.round(todayUse / 1000);
    }
    dom.getElementById('todayTime11').textContent = this.echoDate('h:i', todayTime);

    // 전주 동일 시간 대비
    const todayUseElement = dom.getElementById('todayUseCompare'),
        todayUseCompare = todayUseElement.children;
    todayUseElement.classList.toggle('up', todayUseGap > 0);
    todayUseElement.classList.toggle('down', todayUseGap < 0);
    todayUseCompare[0].classList.toggle('bi-caret-up-fill', todayUseGap > 0);
    todayUseCompare[0].classList.toggle('bi-caret-down-fill', todayUseGap < 0);
    todayUseCompare[1].textContent = todayUseGapRatio ? `${Math.abs(parseFloat(todayUseGapRatio.toFixed(1)))}%` : '';
    todayUseCompare[2].textContent = todayUseGap.toFixed(0) > 0 ? `+${this.echoNumber(todayUseGap.toFixed(0))}` : this.echoNumber(todayUseGap.toFixed(0));

    // 시간별 부하(경부하, 중부하, 최대부하)
    const realTime = dom.getElementById('realTimeAreaWidget11').children;
    for (let i = 0; i < realTime.length; i++) {
        realTime[i].classList.toggle('realTimeMiddle', loadTimes[i] === 1);
        realTime[i].classList.toggle('realTimeHigh', loadTimes[i] === 2);

        realTime[i].classList.remove('active');
    }

    const currentHours = new Date().getHours();
    realTime[currentHours].classList.add('active');
}

/**
 * 12. 오늘의 누적 전력 사용요금 데이터 매핑
 * @param data
 */
vio.dataTransTodayPrice = function(data) {
    const dom = document,
        {
            usePrice = 0,
            usePriceTime = '',
            lastYearPrice = 0,
            useLow = 0,
            useMiddle = 0,
            useHigh = 0,
        } = data,
        todayPriceGap = (usePrice - lastYearPrice),
        todayPriceGapRatio = (usePrice > 0 && lastYearPrice > 0) ? (usePrice - lastYearPrice) / lastYearPrice * 100 : '';

    if (this._timer) {
        // 오늘의 전력 사용요금
        dom.getElementById('todayPriceValue').textContent = this.echoNumber(usePrice);

        // 부하별 요금
        dom.getElementById('useLow').textContent = this.echoNumber(useLow);
        dom.getElementById('useMiddle').textContent = this.echoNumber(useMiddle);
        dom.getElementById('useHigh').textContent = this.echoNumber(useHigh);
    } else {
        dom.getElementById('todayPriceValue').dataset.to = usePrice;

        dom.getElementById('useLow').dataset.to = useLow;
        dom.getElementById('useMiddle').dataset.to = useMiddle;
        dom.getElementById('useHigh').dataset.to = useHigh;
    }
    dom.getElementById('usePriceTime').textContent = this.echoDate('h:i', usePriceTime);

    // 전년 동일 시간 대비
    const todayPriceElement = dom.getElementById('todayPriceCompare'),
        todayPriceCompare = todayPriceElement.children;
    todayPriceElement.classList.toggle('up', todayPriceGap > 0);
    todayPriceElement.classList.toggle('down', todayPriceGap < 0);
    todayPriceCompare[0].classList.toggle('bi-caret-up-fill', todayPriceGap > 0);
    todayPriceCompare[0].classList.toggle('bi-caret-down-fill', todayPriceGap < 0);
    todayPriceCompare[1].textContent = todayPriceGapRatio ? `${Math.abs(parseFloat(todayPriceGapRatio.toFixed(1)))}%` : '';
    todayPriceCompare[2].textContent = todayPriceGap.toFixed(0) > 0 ? `+${this.echoNumber(todayPriceGap.toFixed(0))}` : this.echoNumber(todayPriceGap.toFixed(0));
}

/**
 * 13. 누적 전력 사용량 데이터 매핑
 * @param data
 */
vio.dataTransWattZip = function(data) {
    const dom = document,
        wattZipLatest = dom.getElementById('wattZipLatest').children, // 최근 1시간 사용량
        wattZipThisMonth = dom.getElementById('wattZipThisMonth').children, // 이번달 누적 사용량
        wattZipThisYear = dom.getElementById('wattZipThisYear').children, // 올해 누적 사용량
        {
            latestTime = 0, // 최근1시간 기록 시간
            latestUse = 0, // 최근1시간 사용량 Wh
            lastUse = 0, // 전주 동일 시간 사용량 Wh
            thisMonth = 0, // 이번달 사용량 Wh
            lastYearMonth = 0, // 전년 한달 사용량 Wh
            thisYear = 0, // 올해 사용량 Wh
            lastYear = 0 // 전년 사용량 Wh
        } = data,
        beforeTime = latestTime ? latestTime - 3600 : 0,
        latestUseGap = (latestUse - lastUse) / 1000,
        latestUseGapRatio = (latestUse > 0 && lastUse > 0) ? (latestUse - lastUse) / lastUse * 100 : 0,
        thisMonthUseGap = (thisMonth - lastYearMonth) / 1000,
        thisMonthUseGapRatio = (thisMonth > 0 && lastYearMonth > 0) ? (thisMonth - lastYearMonth) / lastYearMonth * 100 : 0,
        thisYearUseGap = (thisYear - lastYear) / 1000,
        thisYearUseGapRatio = (thisYear > 0 && lastYear > 0) ? (thisYear - lastYear) / lastYear * 100 : 0;

    // 누적 전력 사용량 시간
    dom.getElementById('wattZipTime').textContent = `${this.echoDate('h:i', beforeTime)} ~ ${this.echoDate('h:i', latestTime)}`;

    if (this._timer) {
        wattZipLatest[0].textContent = this.echoNumber(Math.round(latestUse / 1000));
        wattZipThisMonth[0].textContent = this.echoNumber(Math.round(thisMonth / 1000));
        wattZipThisYear[0].textContent = this.echoNumber(Math.round(thisYear / 1000));
    } else {
        wattZipLatest[0].dataset.to = Math.round(latestUse / 1000);
        wattZipThisMonth[0].dataset.to = Math.round(thisMonth / 1000);
        wattZipThisYear[0].dataset.to = Math.round(thisYear / 1000);
    }

    // 전주 동일 시간 대비
    const latestCompare = wattZipLatest[2].children;
    wattZipLatest[2].classList.toggle('up', latestUseGap > 0);
    wattZipLatest[2].classList.toggle('down', latestUseGap < 0);
    latestCompare[0].classList.toggle('bi-caret-up-fill', latestUseGap > 0);
    latestCompare[0].classList.toggle('bi-caret-down-fill', latestUseGap < 0);
    latestCompare[1].textContent = latestUseGapRatio ? `${this.echoNumber(Math.abs(parseFloat(latestUseGapRatio.toFixed(1))))}%` : '';
    latestCompare[2].textContent = latestUseGap > 0 ? `+${this.echoNumber(latestUseGap.toFixed(0))}` : this.echoNumber(latestUseGap.toFixed(0));

    // 이번달 누적 사용량 전년 대비
    const thisMonthCompare = wattZipThisMonth[2].children;
    wattZipThisMonth[2].classList.toggle('up', thisMonthUseGap > 0);
    wattZipThisMonth[2].classList.toggle('down', thisMonthUseGap < 0);
    thisMonthCompare[0].classList.toggle('bi-caret-up-fill', thisMonthUseGap > 0);
    thisMonthCompare[0].classList.toggle('bi-caret-down-fill', thisMonthUseGap < 0);
    thisMonthCompare[1].textContent = thisMonthUseGapRatio ? `${this.echoNumber(Math.abs(parseFloat(thisMonthUseGapRatio.toFixed(1))))}%` : '';
    thisMonthCompare[2].textContent = thisMonthUseGap > 0 ? `+${this.echoNumber(thisMonthUseGap.toFixed(0))}` : this.echoNumber(thisMonthUseGap.toFixed(0));

    // 올해 누적 사용량 전년 대비
    const thisYearCompare = wattZipThisYear[2].children;
    wattZipThisYear[2].classList.toggle('up', thisYearUseGap > 0);
    wattZipThisYear[2].classList.toggle('down', thisYearUseGap < 0);
    thisYearCompare[0].classList.toggle('bi-caret-up-fill', thisYearUseGap > 0);
    thisYearCompare[0].classList.toggle('bi-caret-down-fill', thisYearUseGap < 0);
    thisYearCompare[1].textContent = thisYearUseGapRatio ? `${this.echoNumber(Math.abs(parseFloat(thisYearUseGapRatio.toFixed(1))))}%` : '';
    thisYearCompare[2].textContent = thisYearUseGap > 0 ? `+${this.echoNumber(thisYearUseGap.toFixed(0))}` : this.echoNumber(thisYearUseGap.toFixed(0));

}

/**
 * 14. 설비별 사용량 TOP 데이터 Set
 * @param data
 */
vio.dataTransModbusTop = function(data) {
    const {
        topToday = [],
        topWeek = [],
        topMonth = [],
        modbus = {}
    } = data;

    if (!this._modbusTop.length) {
        this._modbusTop = topToday;
    }

    this._modbusTopToday = topToday;
    this._modbusTopWeek = topWeek;
    this._modbusTopMonth = topMonth;

    this._modbus = modbus;

    this.mappingModbusTop();
}

/**
 * 14. 설비별 사용량 TOP 데이터 매핑
 */
vio.mappingModbusTop = function() {
    const facPer = document.getElementById('facPer');

    if (facPer.children.length !== this._modbusTop.length) {
        let out = '';
        for (let i = 0; i < this._modbusTop.length; i++) {
            out += `
            <li>
                <div class="left"></div>
                <div class="right">
                    <span class="num countNumber"></span><span class="unit">%</span>
                </div>
                <div class="bar">
                    <span class="barPer"></span>
                </div>
            </li>`;
        }

        facPer.innerHTML = out;
    }

    for (let i = 0; i < this._modbusTop.length; i++) {
        const item = this._modbusTop[i];
        if (!item) {
            continue;
        }

        const dt = facPer.children[i].children;
        dt[0].textContent = this._modbus[item[0]];
        dt[0].title = this._modbus[item[0]];
        if (this._timer) {
            dt[1].children[0].textContent = item[1];
        } else {
            dt[1].children[0].dataset.to = item[1];
        }
        dt[2].children[0].style.width = `${item[1]}%`;
    }
}

/**
 * 14. 설비별 사용량 TOP 오늘, 지난주, 이번달 Tab
 */
vio.facPerTab = function() {
    const dom = document,
        elementId = event.target.getAttribute('id'),
        buttons = ['todayBtn', 'lastWeekBtn', 'thisMonthBtn'],
        buttonData = {
            'todayBtn': vio._modbusTopToday,
            'lastWeekBtn': vio._modbusTopWeek,
            'thisMonthBtn': vio._modbusTopMonth
        };

    if (buttons.includes(elementId)) {
        vio._modbusTop = buttonData[elementId];

        buttons.forEach(btnId => {
            const btnElement = dom.getElementById(btnId);
            btnElement.classList.toggle('active', btnId === elementId);
        });

        vio.mappingModbusTop();
    }
}

/**
 * 15. 요금제정보 및 통신상태 데이터 매핑
 * @param data
 */
vio.dataTransWattCost = function(data) {
    const dom = document,
        netGood = data[1],
        netBad = data[0],
        netRatio = netGood ? netGood / (netGood + netBad) : 0;

    dom.getElementById('wattCostName').textContent = data[2]; // 계약종별

    if (this._timer) {
        dom.getElementById('wattCostPower').textContent = data[3] ? this.echoNumber(data[3]) : ''; // 계약전력
        dom.getElementById('wattCostDay').textContent = data[4] ? data[4] : ''; // 검침일
        dom.getElementById('wattCostNetGood').textContent = netGood; // 통신상태 양호
        dom.getElementById('wattCostNetBad').textContent = netBad; // 통신상태 나쁨
    } else {
        dom.getElementById('wattCostPower').dataset.to = data[3] ?? '';
        dom.getElementById('wattCostDay').dataset.to = data[4];
        dom.getElementById('wattCostNetGood').dataset.to = netGood;
        dom.getElementById('wattCostNetBad').dataset.to = netBad;
    }

    // 통신상태 %
    const circleItem = document.getElementById('netStatusCircle'),
        strokeDasharray = parseInt(circleItem.getAttribute('stroke-dasharray'));
    dom.getElementById('netPercentage').textContent = netRatio ? Math.round(netRatio * 100).toString() : 0;
    circleItem.setAttribute('stroke-dashoffset', strokeDasharray - strokeDasharray * netRatio);
}

/**
 * 16. 이달의 생산현황 데이터 매핑
 * @param data
 * @param isInit
 */
vio.dataTransAmountMonth = function(data, isInit) {
    const dom = document,
        amountMonth = dom.getElementById('amountMonth'),
        dataLength = data.length;

    if (isInit) {
        // 설비 여러 개일 경우 Select Box 표시 및 이벤트 추가
        const name = data.map(r => r.name);
        let out = '<option value="">전체</option>';
        out += name.map(r => `<option value="${r}">${r}</option>`).join('');
        amountMonth.innerHTML = out;

        if (name.length > 1) {
            amountMonth.classList.remove('disable');
            amountMonth.addEventListener('change', () => {
                const value = amountMonth.value,
                    filterData = value ? this._amountMonthData.filter(r => r.name === value) : this._amountMonthData;

                this.dataTransAmountMonth(filterData, false);
            });
        }
    }

    // 설비 여러 개일 경우 합산
    data = data.reduce((acc, cur) => {
        acc.thisMonth += Number(cur.thisMonth) || 0;
        acc.avgMonth += Number(cur.avgMonth) || 0;
        acc.lastMonth += Number(cur.lastMonth) || 0;
        acc.lastMonthYear += Number(cur.lastMonthYear) || 0;
        acc.thisYear += Number(cur.thisYear) || 0;
        acc.lastYear += Number(cur.lastYear) || 0;
        return acc;
    }, {
        thisMonth: 0,
        avgMonth: 0,
        lastMonth: 0,
        lastMonthYear: 0,
        thisYear: 0,
        lastYear: 0
    });

    if (dataLength > 1 && data.avgMonth > 0) {
        // 월평균 생산량 평균 계산
        data.avgMonth = Math.floor(data.avgMonth / dataLength);
    }

    const thisYear = data.thisYear ?? 0,
        lastYear = data.lastYear ?? 0,
        outputList = dom.getElementById('outputList').children;

    let thisYearRate = thisYear && lastYear ? Math.round(thisYear / lastYear * 100 * 10) / 10 : 0;
    if (thisYearRate > 100) {
        thisYearRate = 100;
    }

    // 생산량 단위
    const unit = [97,105,141].includes(Number(this._fid)) ? '㎏' : '';

    // 작년 대비 올해 생산량 차트
    this._outputChartPie = echarts.init(document.getElementById('outputPie'), 'dark');
    const option = {
        backgroundColor: false,
        title: {
            text: '작년 대비 올해 생산량',
            left: 'center',
            bottom: 0,
            textStyle: {
                fontSize: 14,
                fontWeight: 'normal',
                color: 'white'
            }
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            textStyle: {
                color: '#ffffff'
            },
            axisPointer: {
                type: 'shadow'
            },
            confine: true,
            formatter: function (params) {
                // 심볼 직접 생성
                let lastYearMarker = '<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:red;"></span>',
                    thisYearMarker = '<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:#6ddf8e;"></span>';

                return `
                    ${lastYearMarker} 작년 생산량: ${vio.echoNumber(lastYear)}<br/>
                    ${thisYearMarker} 올해 생산량: ${vio.echoNumber(thisYear)}
                `;
            }
        },
        series: [
            {
                name: '생산량',
                type: 'pie',
                radius: ['60%', '90%'],  // 도넛 형태, 외부 반지름을 크게 설정
                avoidLabelOverlap: false,
                center: ['50%', '42%'],  // 차트를 div 중앙에 맞춤
                data: [
                    {
                        value: thisYearRate,
                        name: '올해 생산량',
                        itemStyle: {
                            color: '#6ddf8e'  // 생산량 색상
                        },
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)',
                                scale: true  // 마우스 오버 시 볼록하게 튀어나옴
                            }
                        }
                    },
                    {
                        value: 100 - thisYearRate,
                        name: '작년 생산량',
                        itemStyle: {
                            color: '#ffffff'
                        },
                        emphasis: {
                            scale: false,
                            itemStyle: {
                                shadowBlur: 0
                            }
                        }
                    }
                ],
                label: {
                    position: 'center',  // 라벨 위치 설정 (inside, outside 등)
                    formatter: `${thisYearRate}%`,
                    color: '#ffffff',  // 라벨 색상
                    fontSize: 14  // 라벨 폰트 크기
                },
                labelLine: {
                    show: false  // 레이블 라인 숨김
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };
    this._outputChartPie.setOption(option);

    // 이번달, 지난달, 월평균 차트(Bar)
    this._outputChartBar = echarts.init(document.getElementById('outputBar'));
    const barOption = {
        backgroundColor: false,
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            textStyle: {
                color: '#ffffff'
            },
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            top: '0%',
            left: '2%',
            right: '2%',
            bottom: '0%',
            containLabel: true,
            backgroundColor: '#ffffff'
        },
        xAxis: [
            {
                type: 'category',
                data: ['이번달', '지난달', '월평균'],
                color: 'rgba(255, 255, 255, 0.3)',
                axisLine: {
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.3)'
                    }
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: '#ffffff',
                    interval: 0
                },
                splitLine: {
                    show: true,
                    lineStyle: {
                        color: 'rgba(255, 255, 255, 0.3)',
                        type: 'line'
                    }
                }
            }
        ],
        yAxis: {
            axisLabel: {
                show: false // y축 레이블 숨기기
            },
            splitLine: {
                show: true,
                lineStyle: {
                    color: 'rgba(255, 255, 255, 0.3)',
                    type: 'line'
                }
            }
        },
        series: [
            {
                name: [1, 2, 3],
                type: 'bar',
                data: [
                    { // 이번달
                        value: data.thisMonth ?? 0,
                        itemStyle: {
                            color: '#ffffff'
                        }
                    },
                    { // 지난달
                        value: data.lastMonth ?? 0,
                        itemStyle: {
                            color: '#d0f565'
                        }
                    },
                    { // 월평균
                        value: data.avgMonth ?? 0,
                        itemStyle: {
                            color: '#32d0fe'
                        }
                    }
                ],
                barWidth: 15,
            }
        ]
    };
    this._outputChartBar.setOption(barOption);

    // 이달의 생산량
    outputList[0].querySelector('.num').textContent = data.thisMonth ? this.echoNumber(data.thisMonth) + unit : 0;
    // 월평균 생산량
    outputList[1].querySelector('.num').textContent = data.avgMonth ? this.echoNumber(data.avgMonth) + unit : 0;
    // 작년 동일월 생산량
    outputList[2].querySelector('.num').textContent = data.lastMonthYear ? this.echoNumber(data.lastMonthYear) + unit : 0;
};

/**
 * 17. 이달의 생산목표 달성률 데이터 매핑
 * @param j
 */
vio.dataTransProductionAttainment = function(j) {
    const dom = document,
        el = dom.getElementById('widget17'),
        { unit, thisGoal, amount, rate, data } = j;

    // 데이터 매핑
    el.querySelector('.thisGoal').textContent = thisGoal.toLocaleString();
    el.querySelector('.amount').textContent = amount.toLocaleString();
    el.querySelector('.rate').textContent = rate;
    el.querySelectorAll('.amountUnit').forEach(e => e.textContent = unit || 'ton');

    // 차트 그리기
    vio._productionAttainmentChart = echarts.init(dom.getElementById('productionAttainmentChart'), 'dark');
    const today = new Date(),
        firstDay = Math.floor(new Date(today.getFullYear(), today.getMonth(), 1).getTime() / 1000),
        lastDay = Math.floor(new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime() / 1000);

    let buildData = [];
    for (let i = firstDay; i <= lastDay ; i += 86400) {
        const ymd = vio.echoDate('ymd', i),
            item = data.find(r => vio.echoDate('ymd', r.dateTime) === ymd );

        buildData.push({
            ymd:    ymd,
            amount: item?.['amount'] ?? 0,
            goal:   item?.['goal'] ?? 0,
        });
    }

    const xData = buildData.map(v => `${v.ymd.slice(4, 6)}.${v.ymd.slice(6, 8)}`),
        amountData = buildData.map(v => v.amount),
        goalData = buildData.map(v => v.goal);

    const option = {
        backgroundColor: false,
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            x: 'center',
            y: 'bottom',
            icon: 'rect'
        },
        grid: {
            left: '1%',
            bottom: '15%',
            right: '10%',
            top: '5%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: xData,
            axisLabel: {
                color: '#5f627a'
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#5f627a',
                formatter(value) {
                    if (value >= 100000000) {
                        return (value / 100000000).toFixed(1) + '억';
                    }
                    if (value >= 10000) {
                        return (value / 10000).toFixed(0) + '만';
                    }
                    if (value >= 1000) {
                        return (value / 1000).toFixed(0) + '천';
                    }
                    return value;
                }
            },
        },
        series: [
            {
                name: '생산량',
                type: 'line',
                data: amountData,
                itemStyle: {
                    color: '#6ddf8e'
                },
                lineStyle: {
                    width: 1,
                    color: '#6ddf8e'
                },
                areaStyle: {
                    color: '#6ddf8e'
                },
                symbol: 'none',
                z: 2,
            },
            {
                name: '목표량',
                type: 'line',
                data: goalData,
                itemStyle: {
                    color: '#b8b8b871'
                },
                lineStyle: {
                    width: 1,
                    color: '#b8b8b871'
                },
                areaStyle: {
                    color: '#b8b8b871'
                },
                symbol: 'none',
                z: 1,
            }
        ]
    };

    vio._productionAttainmentChart.setOption(option);
};

/**
 * 18. 월별 생산량대비 전력 사용량 데이터 매핑
 * @param j
 */
vio.dataTransPowerAmountRelative = function(j) {
    const today = new Date(),
        buildData = [];

    for (let i = 12; i >= 1; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1),
            ym = date.getFullYear().toString() + String(date.getMonth() + 1).padStart(2, '0') + '01',
            item = j.find(r => r.date === parseInt(ym));

        buildData.push({
            ym:     ym,
            watt:   item?.['watt'] ?? '',
            amount: item?.['amount'] ?? '',
        });
    }

    const maxIndex = buildData.reduce((maxIdx, item, idx, arr) => item.amount > arr[maxIdx].amount ? idx : maxIdx, 0);

    vio._powerAmountRelativeChart = echarts.init(document.getElementById('powerAmountRelativeChart'));
    const xData = buildData.map(item => Number(item.ym.substr(4, 2)));
    const option = {
        backgroundColor: false,
        grid: {
            left: '1%',
            bottom: '15%',
            right: '1%',
            top: '5%',
            containLabel: true
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            confine: true,
        },
        legend: {
            bottom: 10,
            itemWidth: 22,
            itemHeight: 10,
            textStyle: {
                color: '#ffffffa6'
            },
            data: ['생산량', '전력사용량']
        },
        xAxis: {
            type: 'category',
            data: xData,
            axisLine: {
                lineStyle: {
                    color: '#5f627a'
                }
            },
            axisTick: {
                show: false
            },
            axisLabel: {
                color: '#5f627a'
            }
        },
        yAxis: [
            {
                type: 'value',
                name: '생산량',
                position: 'left',
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: '#5f627a',
                    formatter(value) {
                        if (value >= 100000000) {
                            return (value / 100000000).toFixed(1) + '억';
                        }
                        if (value >= 10000) {
                            return (value / 10000).toFixed(0) + '만';
                        }
                        if (value >= 1000) {
                            return (value / 1000).toFixed(0) + '천';
                        }
                        return value;
                    }
                },
                splitLine: {
                    show: false
                }
            },
            {
                type: 'value',
                name: '전력사용량',
                position: 'right',
                axisLine: {
                    show: false
                },
                axisTick: {
                    show: false
                },
                axisLabel: {
                    color: '#5f627a',
                    formatter(value) {
                        if (value >= 100000000) {
                            return (value / 100000000).toFixed(1) + '억';
                        }
                        if (value >= 10000) {
                            return (value / 10000).toFixed(0) + '만';
                        }
                        if (value >= 1000) {
                            return (value / 1000).toFixed(0) + '천';
                        }
                        return value;
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: '#5f627a'
                    }
                }
            },
        ],
        series: [
            {
                name: '생산량',
                type: 'bar',
                yAxisIndex: 1,
                data: buildData.map(v => v.amount),
                barWidth: 12,
                color: '#69e07a',
                itemStyle: {
                    color(params) {
                        return params.dataIndex === maxIndex ? '#d7ff4a' : '#69e07a';
                    },
                    borderRadius: [2, 2, 0, 0]
                }
            },
            {
                name: '전력사용량',
                type: 'line',
                lineStyle: {
                    width: 2
                },
                emphasis: {
                    lineStyle: {
                        width: 2
                    },
                },
                itemStyle: {
                    color: '#5280ed'
                },
                symbolSize: 6,
                data: buildData.map(v => v.watt),
            },
        ]
    };

    vio._powerAmountRelativeChart.setOption(option);
};

/**
 * 20. 공정별 에너지 원단위 데이터 매핑
 * @param data
 */
vio.dataTransProcessUnit = function(data) {
    const list = data['data'] || [],
        unit = data['unit'] || 'ton',
        total = list.reduce((sum, item) => {
            return sum + (item[1] || 0);
        }, 0);

    let out = '';
    for (let item of list) {
        const value = item[1] || 0,
            percent = total > 0 ? (value / total) * 100 : 0;

        out += `
        <li>
            <div class="left">${item[0] || '-'}</div>
            <div class="right">
                <span class="num">${value.toLocaleString()}</span>
                <span class="unit">원/${unit}</span>
            </div>
            <div class="bar">
                <span class="barPer" style="width:${percent.toFixed(1)}%"></span>
            </div>
        </li>`;
    }

    document.getElementById('processUnit').innerHTML = out;
};

vio.dateTypeTab = async function() {
    const topEl = event.target.closest('#dateType'),
        dateType = event.target.getAttribute('data-datetype'),
        buttons = ['week', 'month'];

    if (buttons.includes(dateType)) {
        buttons.forEach(btnId => {
            topEl.querySelector(`[data-datetype="${btnId}"]`).classList.toggle('active', btnId === dateType);
        });
    }

    if (dateType === 'month') {
        vio._dateType = dateType;
    } else {
        vio._dateType = '';
    }

    await vio.getData('processUnit');
    clearTimeout(vio._apiTimer);
};

/**
 * 태양광 발전량 데이터 매핑
 * @param data
 */
vio.dataTransSolar = function(data) {
    const dom = document;

    dom.getElementById('solarToday').textContent = this.echoNumber(data.today);
    dom.getElementById('solarYesterday').textContent = this.echoNumber(data.yesterday);
    dom.getElementById('solarMonth').textContent = this.echoNumber(data.month);

    vio.dataTransSolarChart(data);
};

vio.dataTransSolarChart = function(data) {
    let xAxisData = Array.from({ length: 24 }, (_, i) => i),
        hisHour = data.hisHour,
        yesterdayHisHour = data.yesterdayHisHour,
        chartData = [];
    for (let i = 0; i < 24; i++) {
        const today = hisHour.find(row => this.echoDate('h', row[0]) === this.padZero(i)),
            yesterday = yesterdayHisHour.find(row => this.echoDate('h', row[0]) === this.padZero(i));

        let todayWatt = today ? today[1] : 0,
            yesterdayWatt = yesterday ? yesterday[1] : 0;

        chartData.push({seq: this.padZero(i), today: todayWatt, yesterday: yesterdayWatt});
    }

    const chartDom = document.getElementById('solarChart');
    vio._solarChart = echarts.init(chartDom);

    const option = {
        grid: {
            top: '5%',
            left: '2%',
            right: '2%',
            bottom: '20%',
            containLabel: true,
        },
        backgroundColor: false,
        tooltip: {
            trigger: 'axis'
        },
        legend: {
            x: 'center',
            y: 'bottom',
            textStyle: {
                color: '#ffffffa6'
            },
            data: ['오늘', '어제']
        },
        xAxis: {
            type: 'category',
            data: xAxisData,
            boundaryGap: false,
        },
        yAxis: {
            type: 'value',
            name: 'kWh',
            splitLine: {
                show: true,
                lineStyle: {
                    color: 'rgba(255, 255, 255, 0.3)',
                    type: 'line'
                }
            }
        },
        series: [
            {
                name: '오늘',
                type: 'bar',
                data: chartData.map(r => r.today),
                itemStyle: {
                    color: '#774ee4'
                }
            },
            {
                name: '어제',
                type: 'line',
                data: chartData.map(r => r.yesterday),
                itemStyle: {
                    color: '#bf5fdc'
                },
                smooth: true,
                symbol: 'line',
                showSymbol: false
            }
        ]
    };

    vio._solarChart.setOption(option);
};

/**
 * 34. 공정별 에너지 데이터 매핑
 * @param process
 */
vio.dataTransProcess = function(process) {
    const dom = document,
        element = dom.getElementById('widget34'),
        unit = process['unit'];

    vio._menu = process['menu'];

    if (vio._menu1 === '') {
        // 대분류 데이터 매핑
        let out = '<option value="">대분류</option>';
        Object.keys(vio._menu).forEach(index => {
            const menu1 = vio._menu[index];
            out += `<option value="${index}">${menu1['name']}</option>`;
        });
        element.querySelector('#menu1').innerHTML = out;
    }

    // 평균 데이터 매핑
    element.querySelector('.monthAVG').textContent = (process['monthAVG'] || 0).toLocaleString();
    element.querySelector('.quarterAVG').textContent = (process['quarterAVG'] || 0).toLocaleString();
    element.querySelector('.yearAVG').textContent = (process['yearAVG'] || 0).toLocaleString();

    element.querySelectorAll('.unit').forEach(unitEl => {
        unitEl.textContent = `원/${unit}`;
    });

    vio.renderProcessChart(process['data'] || []);
};

/**
 * 공정별 에너지 차트 그리기
 * @param data
 */
vio.renderProcessChart = function(data) {
    const isTime = data.length && data[0][0] > 1000000000;

    const option = {
        legend: {
            x: 'center',
            y: 'bottom',
            textStyle: {
                color: '#ffffffa6'
            }
        },
        grid: {
            left: '1%',
            bottom: '5%',
            right: '1%',
            top: '5%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: true,
            data: isTime ? data.map(d => vio.echoDate('m.d', d[0])) : data.map(d => d[0] + '주차'),
            axisLine: { lineStyle: { color: '#5f627a' } }
        },
        yAxis: {
            type: 'value',
            splitLine: {
                lineStyle: {
                    color: '#5f627a'
                }
            },
            axisLabel: {
                formatter: v => v.toLocaleString() + '원'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'line'
            },
        },
        series: [
            {
                type: 'line',
                itemStyle: {
                    color: '#c580e2'
                },
                lineStyle: {
                    width: 2,
                    color: '#c580e2'
                },
                emphasis: {
                    lineStyle: {
                        width: 2
                    }
                },
                symbol: 'none',
                showSymbol: false,
                smooth: true,
                data: data.map(r => r[1]),
                z: 2
            },
        ]
    };

    const chart = echarts.init(document.getElementById('processChart'));
    chart.setOption(option);

    window.addEventListener('resize', () => chart.resize());
};

/**
 * 31. 공정별 에너지 사용량 데이터 매핑
 * @param processUsage
 */
vio.dataTransProcessUsage = function(processUsage) {
    const element = document.getElementById('widget31'),
        list = [...(processUsage['data'] || [])].sort((a, b) => (b['watt'] || 0) - (a['watt'] || 0)),
        wattTotal = processUsage['wattTotal'] || 0,
        maxWatt = Math.max(...list.map(item => item['watt'] || 0), 0);

    vio._processUsageMenu = processUsage['menu'] || {};

    if (vio._menu1 === '') {
        // 대분류 데이터 매핑
        let out = '<option value="">대분류</option>';
        Object.keys(vio._processUsageMenu).forEach(index => {
            const menu1 = vio._processUsageMenu[index];
            out += `<option value="${index}">${menu1['name']}</option>`;
        });
        element.querySelector('#processUsageMenu1').innerHTML = out;
    }

    element.querySelector('.wattTotal').textContent = wattTotal.toLocaleString();

    let out = '';
    list.forEach(item => {
        const watt = item['watt'] || 0,
            percent = wattTotal > 0 ? watt / wattTotal * 100 : 0,
            maxClass = maxWatt > 0 && watt === maxWatt ? ' class="max"' : '';

        out += `
        <li${maxClass}>
            <div class="left">${item['name'] || '-'}</div>
            <div class="right">
                <span class="num">${watt.toLocaleString()}</span>
                <span class="unit">kWh</span>
            </div>
            <div class="bar">
                <span class="barPer" style="width:${percent.toFixed(1)}%"></span>
            </div>
        </li>`;
    });

    element.querySelector('.facPer').innerHTML = out;
};

/**
 * 32. 분야별 에너지 사용량 데이터 매핑
 * @param {Object} processPart
 */
vio.dataTransProcessPart = function(processPart) {
    const element = document.getElementById('widget32'),
        menuElement = element.querySelector('#processPartMenu'),
        menuList = processPart.menu || [],
        mainList = (processPart.mainData || []).sort((a, b) => (b.watt || 0) - (a.watt || 0)),
        subList = (processPart.subData || []).sort((a, b) => (b.watt || 0) - (a.watt || 0)),
        unit = 'kWh',
        selectedMenu = String(vio._processPartMenu || menuList[0]?.idn || '');

    vio._processPartMenu = selectedMenu;

    menuElement.replaceChildren();
    menuList.forEach(item => {
        const option = document.createElement('option');
        option.value = item.idn;
        option.textContent = item.menu;
        option.selected = String(item.idn) === selectedMenu;
        menuElement.appendChild(option);
    });
    if (!menuElement.options.length) {
        menuElement.add(new Option('분류 없음', ''));
    }

    element.querySelector('.processPartMainTotal').textContent = Number(processPart.mainTotal || 0).toLocaleString();
    element.querySelector('.processPartSubTotal').textContent = Number(processPart.subTotal || 0).toLocaleString();
    element.querySelectorAll('.processPartUnit').forEach(item => item.textContent = unit);
    element.querySelector('.processPartSubTitle').textContent = menuList.find(item => String(item.idn) === selectedMenu)?.menu || '세부 사용량';

    const mainColors = ['#2d8cf7', '#8743ed', '#d868f0', '#01bb9a', '#008fe8', '#7d47eb'],
        subColors = ['#01bb9a', '#008fe8', '#7d47eb', '#2d8cf7', '#8743ed', '#d868f0'];

    // 차트 그리기
    this._processPartMainChart = this.renderProcessPartChart('processPartMainChart', mainList, mainColors, unit);
    this._processPartSubChart = this.renderProcessPartChart('processPartSubChart', subList, subColors, unit);

    // TOP 3
    this.renderProcessPartList(element.querySelector('.processPartMainList'), mainList, mainColors);
    this.renderProcessPartList(element.querySelector('.processPartSubList'), subList, subColors);
};

/**
 * 32. 분야별 에너지 사용량 중분류 차트 그리기
 * @param element
 * @param data
 * @param colors
 */
vio.renderProcessPartList = function(element, data, colors) {
    element.replaceChildren();
    const topData = [...data].sort((a, b) => Number(b.watt || 0) - Number(a.watt || 0)).slice(0, 3);

    if (!topData.length) {
        const empty = document.createElement('li');
        empty.textContent = '데이터가 없습니다.';
        element.appendChild(empty);
        return;
    }

    topData.forEach((item, index) => {
        const li = document.createElement('li'),
            nameWrap = document.createElement('div'),
            name = document.createElement('span'),
            chip = document.createElement('span'),
            value = document.createElement('div');

        nameWrap.className = 'nameWrap';
        chip.className = 'color';
        name.className = 'name';
        name.textContent = item.name || '-';
        name.title = name.textContent;
        chip.style.backgroundColor = colors[index % colors.length];
        nameWrap.append(chip, name);
        value.className = 'num';
        value.textContent = Number(item.watt || 0).toLocaleString();
        li.append(nameWrap, value);
        element.appendChild(li);
    });
};

/**
 * 32. 분야별 에너지 사용량 소분류 차트 그리기
 * @param elementId
 * @param data
 * @param colors
 * @param unit
 * @returns {*}
 */
vio.renderProcessPartChart = function(elementId, data, colors, unit) {
    const chartElement = document.getElementById(elementId),
        chart = echarts.getInstanceByDom(chartElement) || echarts.init(chartElement),
        topNames = data.slice(0, 3).map(item => item.name),
        hasData = data.some(item => Number(item.watt) > 0),
        chartData = hasData
            ? data.map(item => ({name: item.name || '-', value: Number(item.watt || 0)}))
            : [{name: '데이터 없음', value: 1, itemStyle: {color: '#343958'}}];

    chart.setOption({
        color: colors,
        tooltip: {
            trigger: 'item',
            confine: true,
            formatter: params => hasData
                ? `${params.marker}${params.name}<br>${Number(params.value).toLocaleString()} ${unit} (${params.percent}%)`
                : '데이터가 없습니다.'
        },
        series: [{
            type: 'pie',
            radius: '100%',
            center: ['50%', '50%'],
            avoidLabelOverlap: false,
            minAngle: 2,
            label: {
                show: hasData,
                position: 'inside',
                color: '#fff',
                fontSize: 11,
                fontWeight: 400,
                lineHeight: 15,
                textBorderWidth: 0,
                formatter: params => topNames.includes(params.name)
                    ? `${params.name}\n${params.percent}%`
                    : ''
            },
            labelLine: {show: false},
            emphasis: {scale: false},
            data: chartData
        }]
    }, true);

    return chart;
};

/**
 * 분야별 에너지 사용량 에너지원 변경
 * @returns {Promise<void>}
 */
vio.processPartEnergyChange = async function() {
    vio._processPartEnergy = this.value;
    await vio.getData('processPart');
    clearTimeout(vio._apiTimer);
};

/**
 * 분야별 에너지 사용량 중분류 변경
 * @returns {Promise<void>}
 */
vio.processPartMenuChange = async function() {
    vio._processPartMenu = this.value;
    await vio.getData('processPart');
    clearTimeout(vio._apiTimer);
};

/**
 * 공정별 에너지 날짜 타입 변경
 * @returns {Promise<void>}
 */
vio.processDateTypeChange = async function() {
    const processDateType = document.getElementById('processDateType').value;

    switch (processDateType) {
        case 'week':
        case 'year':
            vio._processDateType = processDateType;
            break;
        default:
            vio._processDateType = '';
            break;
    }

    await vio.getData('process');
    clearTimeout(vio._apiTimer);
};

/**
 * 공정별 에너지 대분류 변경
 * @returns {Promise<void>}
 */
vio.menu1Change = async function() {
    vio._menu1 = this.value;
    vio._menu2 = '';
    vio._menu3 = '';

    const menu1 = document.getElementById('menu1'),
        menu2 = document.getElementById('menu2'),
        menu3 = document.getElementById('menu3'),
        processUsageMenu1 = document.getElementById('processUsageMenu1'),
        processUsageMenu2 = document.getElementById('processUsageMenu2');

    if (menu1) {
        menu1.value = vio._menu1;
    }
    if (menu2) {
        menu2.innerHTML = '<option value="">중분류</option>';
    }
    if (menu3) {
        menu3.innerHTML = '<option value="">소분류</option>';
    }
    if (processUsageMenu1) {
        processUsageMenu1.value = vio._menu1;
    }
    if (processUsageMenu2) {
        processUsageMenu2.innerHTML = '<option value="">중분류</option>';
    }

    const fields = vio.getProcessRequestFields();
    if (fields) {
        await vio.getData(fields);
    }
    clearTimeout(vio._apiTimer);

    if (!vio._menu1) {
        return;
    }

    // 중분류 데이터 매핑
    const children = vio._menu?.[vio._menu1]?.child || vio._processUsageMenu?.[vio._menu1]?.child || {};
    let out = '<option value="">중분류</option>';
    Object.keys(children).forEach(index => {
        const menu = children[index];
        out += `<option value="${index}">${menu['name']}</option>`;
    });
    if (menu2) {
        menu2.innerHTML = out;
    }
    if (processUsageMenu2) {
        processUsageMenu2.innerHTML = out;
    }
};

/**
 * 공정별 에너지 중분류 변경
 * @returns {Promise<void>}
 */
vio.menu2Change = async function() {
    vio._menu2 = this.value;
    vio._menu3 = '';

    const menu2 = document.getElementById('menu2'),
        menu3 = document.getElementById('menu3'),
        processUsageMenu2 = document.getElementById('processUsageMenu2');

    if (menu2) {
        menu2.value = vio._menu2;
    }
    if (menu3) {
        menu3.innerHTML = '<option value="">소분류</option>';
    }
    if (processUsageMenu2) {
        processUsageMenu2.value = vio._menu2;
    }

    const fields = vio.getProcessRequestFields();
    if (fields) {
        await vio.getData(fields);
    }
    clearTimeout(vio._apiTimer);

    if (!vio._menu2) {
        return;
    }

    // 소분류 데이터 매핑
    const children = vio._menu?.[vio._menu1]?.['child']?.[vio._menu2]?.['child'] || {};
    let out = '<option value="">소분류</option>';
    Object.keys(children).forEach(index => {
        const menu = children[index];
        out += `<option value="${index}">${menu}</option>`;
    });
    if (menu3) {
        menu3.innerHTML = out;
    }
};

/**
 * 공정별 에너지 소분류 변경
 * @returns {Promise<void>}
 */
vio.menu3Change = async function() {
    vio._menu3 = this.value;

    await vio.getData('process');
    clearTimeout(vio._apiTimer);
};

/**
 * 현재 대시보드에 포함된 공정별 에너지 API 필드 반환
 * @returns {string}
 */
vio.getProcessRequestFields = function() {
    const requestFields = this._requestFields.split(',');

    return ['process', 'processUsage'].filter(field => requestFields.includes(field)).join(',');
};

/**
 * 현재 요금제 데이터 매핑
 * @param currentPlan
 */
vio.dataTransCurrentPlan = function(currentPlan) {
    const element = document.getElementById('widget35'),
        { cost, loadTimes, season } = currentPlan;

    element.querySelector('.costName').textContent = cost?.costName ?? '';
    element.querySelector('.season').textContent = season ? `${season} 적용 중` : '';

    element.querySelector('.lowCost').textContent = cost?.costL ?? '';
    element.querySelector('.midCost').textContent = cost?.costM ?? '';
    element.querySelector('.highCost').textContent = cost?.costH ?? '';

    const ranges = [];
    let start = 0;
    for (let hour = 1; hour <= loadTimes.length; hour++) {
        if (hour === loadTimes.length || loadTimes[hour] !== loadTimes[start]) {
            ranges.push({ type: loadTimes[start], start, end: hour });

            start = hour;
        }
    }

    // 자정을 넘어가는 동일 부하 구간 병합
    if (ranges.length > 1 && ranges[0].type === ranges[ranges.length - 1].type) {
        ranges[0].start = ranges[ranges.length - 1].start;
        ranges.pop();
    }
    const loadRange = ranges.reduce((result, { type, start, end }) => {
        const time = `${start}~${end === 24 ? 0 : end}시`;
        result[type] = result[type] ? `${result[type]}<br>${time}` : time;
        return result;
    }, {
        0: '',
        1: '',
        2: ''
    });

    element.querySelector('.lowTimes').innerHTML = loadRange[0];
    element.querySelector('.midTimes').innerHTML = loadRange[1];
    element.querySelector('.highTimes').innerHTML = loadRange[2];
};

/**
 * 초 단위에서 분:초 단위로 변환
 * @param seconds
 * @returns {`${string}${number}:${string}${number}`}
 */
vio.convertSecToMin = function(seconds) {
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

/**
 * 게이지 바늘이 가리키는 색상 반환
 * @param percentage
 * @returns {*|null}
 */
vio.getColorAtPercentage = function(percentage) {
    percentage = percentage > 1 ? 1 : percentage;
    const startOffset = percentage <= 0.49 ? 0 : 0.49,
        endOffset = percentage <= 0.49 ? 0.49 : 1,
        startColor = percentage <= 0.49 ? '#65d123' : '#f7cd23',
        endColor = percentage <= 0.49 ? '#f7cd23' : '#ff1017';
    return this.interpolateColor(startColor, endColor, (percentage - startOffset) / (endOffset - startOffset));
}

/**
 * 선형 보간법으로 색상 계산
 * @param startColor
 * @param endColor
 * @param factor
 * @returns {string}
 */
vio.interpolateColor = function(startColor, endColor, factor) {
    const startRGB = parseInt(startColor.slice(1), 16),
        endRGB = parseInt(endColor.slice(1), 16);

    const startR = (startRGB >> 16) & 0xFF,
        startG = (startRGB >> 8) & 0xFF,
        startB = startRGB & 0xFF;

    const endR = (endRGB >> 16) & 0xFF,
        endG = (endRGB >> 8) & 0xFF,
        endB = endRGB & 0xFF;

    const interpolatedR = Math.round(startR + factor * (endR - startR)),
        interpolatedG = Math.round(startG + factor * (endG - startG)),
        interpolatedB = Math.round(startB + factor * (endB - startB));

    return `#${(interpolatedR << 16 | interpolatedG << 8 | interpolatedB).toString(16).padStart(6, '0')}`;
}

/**
 * 대시보드 페이지 이벤트 리스너 등록
 */
vio.eventListenerMain = function() {
    const dom = document,
        widget3 = dom.getElementById('widget3'),
        widget33 = dom.getElementById('widget33'),
        widget5 = dom.getElementById('widget5'),
        peakToggle = dom.getElementById('peakToggle'),
        facPerBtn = dom.getElementById('facPerBtn'),
        dateType = dom.getElementById('dateType'),
        processDateType = dom.getElementById('processDateType'),
        processUsageMenu1 = dom.getElementById('processUsageMenu1'),
        processUsageMenu2 = dom.getElementById('processUsageMenu2'),
        processPartEnergy = dom.getElementById('processPartEnergy'),
        processPartMenu = dom.getElementById('processPartMenu'),
        menu1 = dom.getElementById('menu1'),
        menu2 = dom.getElementById('menu2'),
        menu3 = dom.getElementById('menu3');

    if (widget3 || widget33) {
        initializeTabClick('.wBox3');
    }
    if (widget5) {
        initializeTabClick('.wBox5');
    }

    if (peakToggle) {
        peakToggle.addEventListener('click', vio.peakAlarm);
    }
    if (facPerBtn) {
        facPerBtn.addEventListener('click', vio.facPerTab);
    }
    if (dateType) {
        dateType.addEventListener('click', vio.dateTypeTab);
    }
    if (processDateType) {
        processDateType.addEventListener('change', vio.processDateTypeChange);
    }
    if (processUsageMenu1) {
        processUsageMenu1.addEventListener('change', vio.menu1Change);
    }
    if (processUsageMenu2) {
        processUsageMenu2.addEventListener('change', vio.menu2Change);
    }
    if (processPartEnergy) {
        processPartEnergy.addEventListener('change', vio.processPartEnergyChange);
    }
    if (processPartMenu) {
        processPartMenu.addEventListener('change', vio.processPartMenuChange);
    }
    if (menu1) {
        menu1.addEventListener('change', vio.menu1Change);
    }
    if (menu2) {
        menu2.addEventListener('change', vio.menu2Change);
    }
    if (menu3) {
        menu3.addEventListener('change', vio.menu3Change);
    }

    // 이벤트 위임을 사용하는 함수 최적화
    function initializeTabClick(containerSelector) {
        const $container = $(containerSelector);

        $container.on('click', '.wTab span', function() {
            const $this = $(this);
            const index = $this.index();
            const parents = $(this.closest(containerSelector));

            $this.siblings().removeClass('active').end().addClass('active');
            parents.find('.tabc').removeClass('active').eq(index).addClass('active');
        });
    }
};

/**
 * 현재 상태 피크알람 On 이벤트
 */
vio.peakAlarm = function() {
    vio._audioMute = !this.checked;
    localStorage.setItem('peakAudioMute', this.checked ? 'off' : 'on');
};

/**
 * 오늘 날짜 기준 요일 배열 반환
 * @returns {string[]}
 */
vio.daysOfWeek = function() {
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'],
        today = new Date(),
        dayIndex = today.getDay();

    return daysOfWeek.slice(dayIndex + 1).concat(daysOfWeek.slice(0, dayIndex + 1));
}

/**
 * 대시보드 위젯 API 요청
 */
vio.getWidgets = async function() {
    let widgets = [];

    const res = await fetch(`api/widgets/${this._fid}`, {
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
            if (jsonData.data.length) {
                widgets = jsonData.data.filter(item => item.isNot === '0');
                // wid가 0인 경우(1줄에 보여질 위젯 갯수)를 먼저 정렬하고, 그 외에는 seq(순서)와 wid에 따라 정렬
                widgets.sort((a, b) => {
                    if (parseInt(a.wid) === 0) {
                        return -1;
                    } else if (parseInt(b.wid) === 0) {
                        return 1;
                    } else if (parseInt(a.seq) - parseInt(b.seq) !== 0) {
                        return parseInt(a.seq) - parseInt(b.seq);
                    } else {
                        return parseInt(a.wid) - parseInt(b.wid);
                    }
                });
            }
            return widgets;
        }
    }
};

/**
 * 대시보드 위젯 표시
 * 저장된 데이터가 있으면 해당 위젯만 표시
 * 저장된 데이터가 없으면 전체 위젯 표시
 */
vio.includeWidgets = async function() {
    const dom = document,
        tempDiv = dom.createElement('div'),
        widgetDiv = dom.createElement('div'),
        fragment = dom.createDocumentFragment(),
        widgets = await vio.getWidgets(),
        time = Math.floor(new Date().getTime() / 600000);

    const res = await fetch(`include/widget.html?v=${time}`);
    tempDiv.innerHTML = await res.text();

    if (widgets.length) {
        if (widgets[0].seq) {
            dom.getElementById('contentsArea').classList.add(`widget${widgets[0].seq}`);
        }

        for (let i = 1; i < widgets.length; i++) {
            const item = widgets[i];
            const clonedNode = tempDiv.querySelector(`#widget${item.wid}`).cloneNode(true);

            fragment.appendChild(clonedNode);

            if (this._widgets[item.wid]) {
                this._apiFields.push(this._widgets[item.wid]);
            }
        }

        widgetDiv.appendChild(fragment);
    } else {
        const dashWidgetLength = tempDiv.querySelectorAll('.dashWidget').length;
        for (let i = 1; i <= dashWidgetLength; i++) {
            const clonedNode = tempDiv.querySelector(`#widget${i}`).cloneNode(true);
            fragment.appendChild(clonedNode);
        }

        widgetDiv.appendChild(fragment);
    }

    const contentsArea = dom.getElementById('contentsArea');
    contentsArea.innerHTML = widgetDiv.innerHTML;
};

/**
 * 실시간 전력 사용량 Time Bar
 */
vio.peakLoadTimeBar = function() {
    const dom = document;

    if (dom.getElementById('peakLoadMinSec')) {
        // 실시간 전력 사용량 Time Bar
        const time60m = this._peakLoadTime % 3600 + this._peakTime[this._fid];
        dom.getElementById('peakLoadMinSec').textContent = `${Math.floor(time60m / 60).toString().padStart(2, '0')}:${(time60m % 60).toString().padStart(2, '0')}`;
        dom.getElementById('peakLoadTimeBar').style.width = `${Math.round(time60m / 3600 * 100)}%`;
    }
};

/**
 * 피크알람사운드 준비
 */
vio.audioReady = async function() {
    vio._audioPeak = new Audio();
    vio._audioPeak.oncanplaythrough = function() {
        vio._audioPeakReady = true;
    };
    vio._audioPeak.src = '/attach/soundPeak.mp3';
}

/**
 * 차트 다시 그리기
 */
vio.resizeCharts = function() {
    if (Object.keys(vio._todayWattChart).length) {
        vio._todayWattChart.resize();
    }
    if (Object.keys(vio._todayGasChart).length) {
        vio._todayGasChart.resize();
    }
    if (Object.keys(vio._ricePartChart).length) {
        vio._ricePartChart.resize();
    }
    if (Object.keys(vio._wattWeekChart).length) {
        vio._wattWeekChart.resize();
    }
    if (Object.keys(vio._todayPeakChart).length) {
        vio._todayPeakChart.resize();
    }
    if (Object.keys(vio._peakMaxChart).length) {
        vio._peakMaxChart.resize();
    }
    if (Object.keys(vio._outputChartPie).length) {
        vio._outputChartPie.resize();
    }
    if (Object.keys(vio._outputChartBar).length) {
        vio._outputChartBar.resize();
    }
    if (Object.keys(vio._productionAttainmentChart).length) {
        vio._productionAttainmentChart.resize();
    }
    if (Object.keys(vio._powerAmountRelativeChart).length) {
        vio._powerAmountRelativeChart.resize();
    }
    if (Object.keys(vio._processPartMainChart).length) {
        vio._processPartMainChart.resize();
    }
    if (Object.keys(vio._processPartSubChart).length) {
        vio._processPartSubChart.resize();
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.includeWidgets();
    await vio.audioReady();

    if (vio._apiFields.includes('wattStatus') && !vio._apiFields.includes('peakTimes')) {
        vio._apiFields.push('peakTimes');
    }

    vio._requestFields = vio._apiFields.length ? vio._apiFields.join(',') : Object.values(vio._widgets).join(',');
    const difference = vio._apiFields.filter(item => ['peakTimes', 'nodeControl', 'wattStatus', 'wattCost'].includes(item));
    vio._repeatFields = difference.length ? difference.join(',') : 'peakTimes,nodeControl,wattStatus,wattCost';

    await vio.getData(vio._requestFields, true);
    vio.countNumber();
    await vio.eventListenerMain();


    // 브라우저 소리권한 설정을 적용한 업체는 사용가능
    if(localStorage.getItem('peakAudioMute') == 'off'){
        vio._audioMute == false;
        document.getElementById('peakToggle').checked = true;
    }
});

window.addEventListener('resize', function() {
    clearTimeout(vio._chartTimer);
    vio._chartTimer = setTimeout(vio.resizeCharts, 300);
});

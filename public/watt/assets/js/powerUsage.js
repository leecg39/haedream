'use strict';

// [[ctime, watt, yyyymm],...] 월단위
vio.monthsDataTrans = function(sheetData) {
    const setData = {
        total: {}, // 연도별 전체 전력량
        addNo: {}, // 월데이터 수
        max: {}    // 연도별 최대 전력량
    };

    // 첫번째와 마지막 데이터를 확인하면 연도별 데이터를 확인가능
    const sheetDataLen = sheetData.length;
    if (sheetDataLen == 0) {
        return;
    }
    const startYear = Number(sheetData[0][2].toString().substr(0, 4)),
        endYear = Number(sheetData[sheetDataLen - 1][2].toString().substr(0, 4));

    // 데이터 초기화
    startYear
    for (let ia = startYear; ia <= endYear; ++ia) {
        const year = ia.toString();
        setData.total[year] = 0;
        setData.addNo[year] = 0;
        setData.max[year] = 0;

        for (let ib = 1; ib <= 12; ++ib) {
            const yMonth = `${year}${ib.toString().padStart(2, '0')}`;
            setData[yMonth] = 0;
        }
    }

    for (const monthData of sheetData) {
        let yMonth = monthData[2].toString(),
            year = yMonth.substr(0, 4);

        setData.total[year] += monthData[1];
        if (monthData[1] > 1) {
            setData.addNo[year] += 1;
        }
        if (monthData[1] > setData.max[year]) {
            setData.max[year] = monthData[1];
        }
        setData[yMonth] = monthData[1];
    }

    let out = '';
    for (let ia = startYear; ia <= endYear; ++ia) {
        const year = ia.toString();
        out = `${out}<tr>
            <th>${year}년</th>
            <td data-z="#,##0">${Math.floor(setData.total[year] / 1000).toLocaleString('ko-KR')}</td>
            <td data-z="#,##0">${setData.addNo[year] > 0 ? Math.floor(setData.total[year] / setData.addNo[year] / 1000).toLocaleString('ko-KR') : 0}</td>
            <td data-z="#,##0">${Math.floor(setData.max[year] / 1000).toLocaleString('ko-KR')}</td>`;

        for (let ib = 1; ib <= 12; ++ib) {
            const yMonth = `${year}${ib.toString().padStart(2, '0')}`;
            out = `${out}<td data-z="#,##0">${setData[yMonth] == 0 ? '' : Math.floor(setData[yMonth] / 1000).toLocaleString('ko-KR')}</td>`;
        }
        out = `${out}</tr>`;
    }

    document.getElementById('monthsList').innerHTML = out;
};

// [[ctime, watt],...] 일단위
vio.daysDataTrans = function(sheetData) {
    const setData = {
        total: {}, // 월별 전체 전력량
        addNo: {}, // 일데이터 수
        max: {},    // 월별 최대 전력량
        maxDay : {}, // 월별 최대 전력량 시간
        peakWatt : {}, // 월별 피크
        peakTime : {} // 월별 피크시간
    };

    // 데이터 초기화
    for (let ia = 1; ia <= 12; ++ia) {
        const month = ia.toString().padStart(2, '0');
        setData.total[month] = 0;
        setData.addNo[month] = 0;
        setData.max[month] = 0;
        setData.maxDay[month] = '';
        setData.peakWatt[month] = 0;
        setData.peakTime[month] = 0;

        for (let ib = 1; ib <= 31; ++ib) {
            const mday = `${month}${ib.toString().padStart(2, '0')}`;
            setData[mday] = 0;
        }
    }

    for (const dayData of sheetData) {
        let mday = this.echoDate('md', dayData[0]),
            month = mday.substr(0, 2);

        setData.total[month] += dayData[1];
        if (dayData[1] > 1) {
            setData.addNo[month] += 1;
        }
        if (dayData[1] > setData.max[month]) {
            setData.max[month] = dayData[1];
            setData.maxDay[month] = `${mday.substr(0,2)}.${mday.substr(2,4)}`;
        }
        setData[mday] = dayData[1];

        if(dayData[2] > setData.peakWatt[month]){
            setData.peakWatt[month] = dayData[2];
            setData.peakTime[month] = dayData[3];
        }
    }

    let boardInfoPowerDate = '',
        boardInfoPeakTime = 0,
        boardInfoPower = 0,
        boardInfoPeak = 0;

    let out = '<tr><th>전체 전력량 (<span class="sheetEm">kWh</span>)</th>';
    for (let ia = 1; ia <= 12; ++ia) {
        const month = ia.toString().padStart(2, '0');
        out = `${out}<td data-z="#,##0">${Math.floor(setData.total[month] / 1000).toLocaleString('ko-KR')}</td>`;
    }
    out = `${out}</tr>`;

    out = `${out}<tr><th>평균 전력량 (<span class="sheetEm">kWh</span>)</th>`;
    for (let ia = 1; ia <= 12; ++ia) {
        const month = ia.toString().padStart(2, '0');
        out = `${out}<td data-z="#,##0">${setData.addNo[month] > 0 ? Math.floor(setData.total[month] / setData.addNo[month] / 1000).toLocaleString('ko-KR') : 0}</td>`;
    }
    out = `${out}</tr>`;

    out = `${out}<tr><th>최대 전력량 (<span class="sheetEm">kWh</span>)</th>`;
    for (let ia = 1; ia <= 12; ++ia) {
        const month = ia.toString().padStart(2, '0');
        out = `${out}<td data-z="#,##0">${Math.floor(setData.max[month] / 1000).toLocaleString('ko-KR')}</td>`;

        if(setData.max[month] > boardInfoPower){
            boardInfoPower = setData.max[month];
            boardInfoPowerDate = setData.maxDay[month];
        }
    }
    out = `${out}</tr>`;

    out = `${out}<tr><th>피크 전력 (<span class="sheetEm">kW</span>)</th>`;
    for(let ia = 1; ia <= 12; ++ia){
        const month = ia.toString().padStart(2, '0');
        out = `${out}<td data-z="#,##0">${Math.floor(setData.peakWatt[month] / 1000).toLocaleString('ko-KR')}</td>`;
    }
    out = `${out}</tr>`;

    out = `${out}<tr><th>피크 시간</th>`;
    for(let ia = 1; ia <= 12; ++ia){
        const month = ia.toString().padStart(2, '0');
        out = `${out}<td data-t="s">${setData.peakTime[month] !== 0 ? this.echoDate('m.d h:i', setData.peakTime[month]) : ''}</td>`;

        if(setData.peakWatt[month] > boardInfoPeak){
            boardInfoPeak = setData.peakWatt[month];
            boardInfoPeakTime = setData.peakTime[month];
        }
    }
    out = `${out}</tr>`;

    for (let ib = 1; ib <= 31; ++ib) {
        out = `${out}<tr><th>${ib}일</th>`;
        for (let ia = 1; ia <= 12; ++ia) {
            const mday = `${ia.toString().padStart(2, '0')}${ib.toString().padStart(2, '0')}`;
            out = `${out}<td data-z="#,##0">${setData[mday] == 0 ? '' : Math.floor(setData[mday] / 1000).toLocaleString('ko-KR')}</td>`;
        }
        out = `${out}</tr>`;
    }

    if(boardInfoPower != 0){
        document.getElementById('boardInfoPower').textContent = Math.floor(boardInfoPower / 1000).toLocaleString('ko-KR');
        document.getElementById('boardInfoPowerDate').textContent = boardInfoPowerDate;
        document.getElementById('boardInfoPeak').textContent = Math.floor(boardInfoPeak / 1000).toLocaleString('ko-KR');
        document.getElementById('boardInfoPeakDate').textContent = this.echoDate('m.d h:i', boardInfoPeakTime);
        document.getElementById('boardInfoPanel').classList.remove('disable');
    }else{
        document.getElementById('boardInfoPanel').classList.add('disable');
    }

    document.getElementById('daysList').innerHTML = out;
};

// [[ctime, watt],...] 시간단위
vio.dataTrans = function(sheetData) {
    let out = '',
        data = [],
        sum = [0, 0, 0, '00:00', 0, '00:00']; // 전체합계

    let boardInfoPowerDate = '', // 최대 전력사용 시간
        boardInfoPeakTime = 0; // 최대 피크시간

    // 전체합계 초기화
    for (let ib = 0; ib < 26; ++ib) {
        sum[ib + 6] = 0;
    }

    const thisMonth = new Date(document.getElementById('inputMonth').value).getMonth() + 1;

    for (const hourData of sheetData) {
        const tDate = new Date(hourData[0] * 1000),
            tMonth = tDate.getMonth() + 1,
            tDay = tDate.getDate(),
            tHour = tDate.getHours() + 1;

        if (!data.hasOwnProperty(tDay)) {
            data[tDay] = [
                0,      // 하루전체 전력량
                0,      // 하루평균
                0,      // 최대전력
                '00:00', // 최대전력 시간
                0,      // 피크전력
                '00:00' // 피크전력 시간
            ];
            for (let ib = 0; ib < 24; ++ib) {
                data[tDay][ib + 6] = 0;
            }
            data[tDay][30] = 0; // max값 체크용
        }

        data[tDay][tHour + 5] = hourData[1];
        // max값
        if (data[tDay][tHour + 5] > data[tDay][30]) {
            data[tDay][30] = data[tDay][tHour + 5];
        }

        // 최대전력
        if (hourData[1] > data[tDay][2]) {
            data[tDay][2] = hourData[1];
            data[tDay][3] = `${tHour}:00`.padStart(5, '0');
        }
        data[tDay][0] += hourData[1];
        data[tDay][1] += 1; // 사용시간 적용횟수

        // 피크
        if (hourData[2] > data[tDay][4]) {
            data[tDay][4] = hourData[2];
            data[tDay][5] = this.echoDate('h:i', hourData[3]);

            if(hourData[2] > sum[4]){
                sum[4] = hourData[2];
                sum[5] = data[tDay][5];
                boardInfoPeakTime = hourData[3];
            }
        }

        // 전체 합계
        sum[tHour + 5] += hourData[1] / 1000;
        if (hourData[1] > sum[2]) {
            sum[2] = hourData[1];
            sum[3] = `${tHour}:00`.padStart(5, '0');
            boardInfoPowerDate = `${tMonth.toString().padStart(2, '0')}.${tDay} ${sum[3]}`;
        }
        sum[0] += hourData[1];
        sum[1] += 1;
    }

    for (let tDay in data) {
        out = `${out}<tr><th data-t="s">${thisMonth}/${tDay}</th>`;
        for (let ia = 0; ia < 30; ++ia) {
            switch (ia) {
                case 1:
                    out = `${out}<td data-z="#,##0">${data[tDay][ia] != 0 ? Math.floor(data[tDay][0] / data[tDay][ia] / 1000).toLocaleString('ko-KR') : 0}</td>`;
                    break;
                case 2:
                case 0:
                case 4:
                    out = `${out}<td data-z="#,##0">${Math.floor(data[tDay][ia] / 1000).toLocaleString('ko-KR')}</td>`;
                    break;
                case 3: // 시간
                case 5:
                    out = `${out}<td data-t="s">${data[tDay][ia]}</td>`;
                    break;
                default:
                    out = `${out}<td data-z="#,##0" ${data[tDay][ia] == 0 ? 'class="none"' : data[tDay][30] == data[tDay][ia] ? 'class="wattMax"' : ''}>${Math.floor(data[tDay][ia] / 1000).toLocaleString('ko-KR')}</td>`;
            }
        }
        out = `${out}</tr>`;
    }

    // 합계
    out = `${out}<tr><th>${this._language == 'ko' ? '계' : 'TOTAL'}</th>`;
    for (let ia = 0; ia < 30; ++ia) {
        switch (ia) {
            case 1:
                out = `${out}<td data-z="#,##0">${sum[ia] != 0 ? this.echoNumber(Math.round(sum[0] / sum[ia] / 1000)) : 0}</td>`;
                break;
            case 2:
            case 0:
            case 4:
                out = `${out}<td data-z="#,##0">${this.echoNumber(Math.round(sum[ia] / 1000))}</td>`;
                break;
            case 3:
            case 5:
                out = `${out}<td data-t="s">${sum[ia]}</td>`;
                break;
            default:
                out = `${out}<td data-z="#,##0">${this.echoNumber(Math.round(sum[ia]))}</td>`;
        }
    }
    out = `${out}</tr>`;

    if(sum[2] != 0){
        document.getElementById('boardInfoPower').textContent = Math.floor(sum[2] / 1000).toLocaleString('ko-KR');
        document.getElementById('boardInfoPowerDate').textContent = boardInfoPowerDate;
        document.getElementById('boardInfoPeak').textContent = Math.floor(sum[4] / 1000).toLocaleString('ko-KR');
        document.getElementById('boardInfoPeakDate').textContent = this.echoDate('m.d h:i', boardInfoPeakTime);
        document.getElementById('boardInfoPanel').classList.remove('disable');
    }else{
        document.getElementById('boardInfoPanel').classList.add('disable');
    }

    document.getElementById('hoursList').innerHTML = out;
};

vio.getData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const dataType = document.getElementById('dataType').value;
        const res = await fetch(`/api/power-usages/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"get","dataType":"${document.getElementById('dataType').value}","date":"${document.getElementById('inputMonth').value}"}`
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
                    if (dataType == 'months') {
                        this.monthsDataTrans(jsonData.data);
                    } else if (dataType == 'days') {
                        this.daysDataTrans(jsonData.data);
                    } else {
                        this.dataTrans(jsonData.data);
                    }
                    break;
                default:
                    this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const nowDate = new Date();

    const datePicker = new tui.DatePicker('#wrapper', {
        date: nowDate,
        type: 'month',
        input: {
            element: '#inputMonth',
            format: 'yyyy-MM'
        },
        selectableRanges: [
            [new Date('2021-12-01'), nowDate] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    document.getElementById('dataType').addEventListener('change', function() {
        const element = document.getElementById('datePickerWrap');

        if (this.value === 'months') {
            element.classList.add('disable');
            document.getElementById('boardInfoPanel').classList.add('disable');
        } else {
            element.classList.remove('disable');
        }

        for (const elementId of ['hoursTable', 'daysTable', 'monthsTable']) {
            document.getElementById(elementId).classList.toggle('disable', !elementId.includes(this.value));
        }

        vio.getData();
    });

    document.getElementById('act').addEventListener('click', function() {
        vio.getData();
    });

    document.getElementById('actExcelSave').addEventListener('click', function() {
        let workbook = XLSX.utils.table_to_book(document.getElementById(`${document.getElementById('dataType').value}Table`)),
            ws = workbook.Sheets['Sheet1'];
        XLSX.writeFile(workbook, `[${document.title}]${document.getElementById('inputMonth').value}.xlsx`);
    });

    vio.getData();
});
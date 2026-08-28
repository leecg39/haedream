'use strict';

vio._sDateTime = 0;
vio._eDateTime = 0;

vio.dataTrans = function(data, facilities) {
    let outHead = '',
        out = '';

    let setTableField = '';

    // 전력정보 포함할 항목
    const fieldName = {
        'volt': '전압(V)',
        'ampere': '전류(A)',
        'wattMax': '전력(kW)',
        'watt': '전력량(kWh)',
        'reactive': '무효전력량(kVarh)',
        'factor': '역률(%)',
        'gold': '전력요금(원)',
        'totalGold': '누적요금(원)',
        'powerMax': '순간전력(kW)'
    };
    const fields = [];
    ['volt', 'ampere', 'wattMax', 'watt', 'reactive', 'factor', 'gold', 'totalGold', 'powerMax'].forEach(function(item) {
        if (document.getElementById(`reportField-${item}`).checked) {
            fields.push(item);
            setTableField += `<th>${fieldName[item]}</th>`;
        }
    });
    const fieldLen = fields.length;

    if (document.getElementById('dataLocation').value == 'Horizontal') { // 가로방향 설비출력
        let addHeadField = '';
        outHead = '<tr><th>구분</th>';
        facilities.forEach(function(item) {
            outHead += `<th colspan="${fieldLen}">${item.pName}</th>`;
            addHeadField += setTableField;
        });
        outHead += `</tr><tr><th>항목</th>${addHeadField}</tr>`;

        // 가로 ctime : pid : data
        const transItems = {};
        data.forEach(function(item) {
            if (!transItems.hasOwnProperty(item.ctime)) {
                transItems[item.ctime] = [];
            }
            transItems[item.ctime][item.pid] = item;
        });

        let sTime = this._sDateTime;
        const dateType = document.getElementById('dateType').value;

        while (sTime <= this._eDateTime) {
            out += `
            <tr>
                <th data-t="s">${this.echoDate(dateType == 'hourly' ? 'm/d h:i' : 'm/d', sTime)}</th>`;
            if (transItems.hasOwnProperty(sTime)) {
                facilities.forEach(function(facility) {
                    if (transItems[sTime].hasOwnProperty(facility.pid)) {
                        const pidData = transItems[sTime][facility.pid];
                        fields.forEach(function(item) {
                            out += `<td>${pidData[item].toLocaleString('ko-KR')}</td>`;
                        });
                    } else {
                        fields.forEach(function(item) {
                            out += `<td>0</td>`;
                        });
                    }
                });
            } else {
                facilities.forEach(function(facility) {
                    fields.forEach(function(item) {
                        out += `<td>0</td>`;
                    });
                });
            }
            out += '</tr>';

            if (dateType == 'monthly') {
                const thisDate = new Date(sTime * 1000);
                sTime = thisDate.setMonth(thisDate.getMonth() + 1) / 1000;
            } else if (dateType == 'daily') {
                sTime += 86400;
            } else {
                sTime += 3600;
            }
        }
        // 마지막 합계
        // 평균 구한 항목 표시
        ['역률', '전압'].forEach(function(item) {
            const re = new RegExp(`>${item}<`, 'g');
            addHeadField = addHeadField.replace(re, ' data-calc="avg">0<');
        });
        ['전류', '전력', '순간전력'].forEach(function(item) {
            const re = new RegExp(`>${item}<`, 'g');
            addHeadField = addHeadField.replace(re, ' data-calc="max">0<');
        });
        out += `<tr><th>계</th>${addHeadField.replace(/>([^<]+)</g, '>0<')}</tr>`;
    } else { // 세로방향 설비출력

        // 세로 pid : ctime: data
        const transItems = {};
        data.forEach(function(item) {
            if (!transItems.hasOwnProperty(item.pid)) {
                transItems[item.pid] = [];
            }
            transItems[item.pid][item.ctime] = item;
        });

        const dateType = document.getElementById('dateType').value;

        let headFirst = true;
        outHead = '<tr><th>구분</th><th>항목</th>';

        const formats = {
            hourly: 'm/d h:i',
            daily: 'y-m-d',
            monthly: 'y-m'
        };
        const format = formats[dateType] ?? formats.hourly;

        facilities.forEach(function(facility) {
            const pidData = transItems[facility.pid],
                sDateTime = vio._sDateTime,
                eDateTime = vio._eDateTime;
            out += `<tr><th rowspan="${fieldLen}">${facility.pName}</th>`;
            let firstField = true;
            fields.forEach(function(item) {
                if (firstField) {
                    out += `<th>${fieldName[item]}</th>`;
                } else {
                    out += `<tr><th>${fieldName[item]}</th>`;
                }

                let sTime = sDateTime;
                while (sTime <= eDateTime) {
                    if (pidData && pidData.hasOwnProperty(sTime)) {
                        out += `<td>${pidData[sTime][item].toLocaleString('ko-KR')}</td>`;
                    } else {
                        out += `<td>0</td>`;
                    }

                    if (headFirst) {
                        outHead += `<th data-t="s">${vio.echoDate(format, sTime)}</th>`;
                    }

                    if (dateType == 'monthly') {
                        const thisDate = new Date(sTime * 1000);
                        sTime = thisDate.setMonth(thisDate.getMonth() + 1) / 1000;
                    } else if (dateType == 'daily') {
                        sTime += 86400;
                    } else {
                        sTime += 3600;
                    }
                }
                if (headFirst) {
                    outHead += '<th>계</th>'; // 합계
                }

                // 합계 데이터 공간
                if (['factor', 'volt'].includes(item)) {
                    out += '<th data-calc="avg">0</th>'; // 평균 처리
                } else if (['ampere', 'wattMax', 'totalGold', 'powerMax'].includes(item)) {
                    out += '<th data-calc="max">0</th>'; // 최대값 처리
                } else {
                    out += '<th>0</th>'; // 합계 처리
                }

                headFirst = false;
                firstField = false;
                out += '</tr>';
            });
        });
    }

    document.getElementById('itemTable').innerHTML = `<thead>${outHead}</thead><tbody>${out}</tbody>`;
    this.summaryNote();
};

// 출력된 시트의 항목별 합계or평균을 계산하여 추가한다
vio.summaryNote = function() {
    if (document.getElementById('dataLocation').value == 'Horizontal') { // 가로방향 설비출력
        const dataY = document.getElementById('itemTable').querySelector('tbody').children,
            dataLen = dataY.length - 1, // 합계 시트 제외
            summaryData = dataY[dataLen].children; // 합계 시트
        for (let ia = 0; ia < dataLen; ++ia) {
            const dataX = dataY[ia].children;
            for (let ib = 1, th = dataX.length; ib < th; ++ib) { // ib =1 : DATE 값 패스
                const value = Number(dataX[ib].textContent.replace(/,/g, ''));
                if (summaryData[ib].getAttribute('data-calc') == 'max') {
                    // 최대값
                    if (value > Number(summaryData[ib].textContent)) {
                        summaryData[ib].textContent = value;
                    }
                } else {
                    summaryData[ib].textContent = Number(summaryData[ib].textContent) + value;
                }
            }
        }

        // 평균이 필요한 항목 적용
        for (let ib = 1, th = summaryData.length; ib < th; ++ib) {
            const ta = summaryData[ib];
            if (ta.getAttribute('data-calc') == 'avg') {
                ta.textContent = (Number(ta.textContent) / dataLen).toFixed(1);
            } else {
                ta.textContent = Number(ta.textContent).toLocaleString('ko-KR');
            }
        }
    } else {
        let dataLen = 0; // DATE 항목 수
        const dataY = document.getElementById('itemTable').querySelector('tbody').children;
        for (let ia = 0, th = dataY.length; ia < th; ++ia) {
            const dataX = dataY[ia].children;
            for (let ib = 1, tk = dataX.length - 1; ib < tk; ++ib) { // -1 합계부분 제외, ib =1 : 항목제외
                if (dataX[ib].tagName == 'TH') { // rowspan 영향
                    dataLen = tk - 1;
                    continue;
                }

                const value = Number(dataX[ib].textContent.replace(/,/g, ''));

                if (dataX[tk].getAttribute('data-calc') == 'max') {
                    // 최대값
                    if (value > Number(dataX[tk].textContent)) {
                        dataX[tk].textContent = value;
                    }
                } else {
                    dataX[tk].textContent = Number(dataX[tk].textContent) + value;
                }
            }
        }

        // 평균이 필요한 항목 적용
        for (let ia = 0, th = dataY.length; ia < th; ++ia) {
            const ta = dataY[ia].lastElementChild;
            if (ta.getAttribute('data-calc') == 'avg') {
                ta.textContent = (Number(ta.textContent) / dataLen).toFixed(1);
            } else {
                ta.textContent = Number(ta.textContent).toLocaleString('ko-KR');
            }
        }
    }
};

vio.getData = async function() {
    // 전력정보 포함할 항목
    const fields = [];
    ['volt', 'ampere', 'wattMax', 'watt', 'reactive', 'factor', 'gold', 'totalGold', 'powerMax'].forEach(function(item) {
        if (document.getElementById(`reportField-${item}`).checked) {
            fields.push(item);
        }
    });

    // 기간
    let sDateTime = 0,
        eDateTime = 0,
        sDate = document.getElementById('sDate').value,
        eDate = document.getElementById('eDate').value;

    if (sDate.length == 16) {
        sDateTime = Date.parse(sDate) / 1000;
    } else if (sDate.length == 10) {
        sDateTime = Date.parse(`${sDate}T00:00`) / 1000;
    } else if (sDate.length == 7) {
        sDateTime = Date.parse(`${sDate}-01T00:00`) / 1000;
    }

    if (eDate.length == 16) {
        eDateTime = Date.parse(eDate) / 1000;
    } else if (eDate.length == 10) {
        eDateTime = Date.parse(`${eDate}T00:00`) / 1000;
    } else if (eDate.length == 7) {
        eDateTime = Math.floor(new Date(Number(eDate.slice(0, 4)), Number(eDate.slice(5, 7)), 0, 23, 59, 59).getTime() / 1000);
    }

    if (sDateTime == 0 || eDateTime == 0) {
        this.toast({memo: '날짜를 선택해야합니다.'});
    } else if (fields.length == 0) {
        this.toast({memo: '출력할 항목을 하나 이상 선택해야합니다.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        this._sDateTime = sDateTime;
        this._eDateTime = eDateTime;

        const params = {
            cf: 'get',
            sDate: sDateTime,
            eDate: eDateTime,
            dateType: document.getElementById('dateType').value,
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/facilities-reports/${this._fid}?${queryString}`, {
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

            this.netAble(false);
            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this.dataTrans(jsonData.data, jsonData.facilities);
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    const dom = document;

    await vio.documentReady();

    dom.getElementById('act').addEventListener('click', function() {
        vio.getData();
    });

    dom.getElementById('dateType').addEventListener('change', function() {
        const nowDate = new Date(),
            today = new Date();

        if (this.value == 'monthly') {
            new tui.DatePicker('#eDateWrapper', {
                date: nowDate,
                type: 'month',
                input: {
                    element: '#eDate',
                    format: 'yyyy-MM'
                },
                selectableRanges: [
                    [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
                ],
                language: 'ko'
            });
            nowDate.setMonth(nowDate.getMonth() - 12);
            new tui.DatePicker('#sDateWrapper', {
                date: nowDate,
                type: 'month',
                input: {
                    element: '#sDate',
                    format: 'yyyy-MM'
                },
                selectableRanges: [
                    [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
                ],
                language: 'ko'
            });
        } else if (this.value == 'daily') {
            new tui.DatePicker('#eDateWrapper', {
                date: nowDate,
                input: {
                    element: '#eDate',
                    format: 'yyyy-MM-dd'
                },
                selectableRanges: [
                    [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
                ],
                language: 'ko'
            });

            nowDate.setMonth(nowDate.getMonth() - 1);
            new tui.DatePicker('#sDateWrapper', {
                date: nowDate,
                input: {
                    element: '#sDate',
                    format: 'yyyy-MM-dd'
                },
                selectableRanges: [
                    [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
                ],
                language: 'ko'
            });
        } else { // 시간단위
            nowDate.setMinutes(0);
            nowDate.setHours(7);
            new tui.DatePicker('#eDateWrapper', {
                date: nowDate,
                input: {
                    element: '#eDate',
                    format: 'yyyy-MM-dd HH:00'
                },
                selectableRanges: [
                    [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
                ],
                timePicker: {
                    showMeridiem: false
                },
                language: 'ko'
            });
            nowDate.setDate(nowDate.getDate() - 1);
            nowDate.setHours(8);
            new tui.DatePicker('#sDateWrapper', {
                date: nowDate,
                input: {
                    element: '#sDate',
                    format: 'yyyy-MM-dd HH:00'
                },
                selectableRanges: [
                    [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
                ],
                timePicker: {
                    showMeridiem: false
                },
                language: 'ko'
            });
        }
    });

    const today = new Date();
    today.setMinutes(0);
    today.setHours(7);
    new tui.DatePicker('#eDateWrapper', {
        date: today,
        input: {
            element: '#eDate',
            format: 'yyyy-MM-dd HH:00'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        timePicker: {
            showMeridiem: false
        },
        language: 'ko'
    });
    today.setDate(today.getDate() - 1);
    today.setHours(8);
    new tui.DatePicker('#sDateWrapper', {
        date: today,
        input: {
            element: '#sDate',
            format: 'yyyy-MM-dd HH:00'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        timePicker: {
            showMeridiem: false
        },
        language: 'ko'
    });

    await vio.getData();

    dom.getElementById('actExcelSave').addEventListener('click', function() {
        let saveName = `[${dom.title}]${dom.getElementById('sDate').value}~${dom.getElementById('eDate').value}.xlsx`;

        let workbook = XLSX.utils.table_to_book(dom.getElementById('itemTable')),
            ws = workbook.Sheets['Sheet1'];
        XLSX.writeFile(workbook, saveName);
    });
});
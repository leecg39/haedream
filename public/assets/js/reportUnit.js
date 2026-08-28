'use strict';

vio._lpList = [];

vio.dataTrans = function(j) {
    const unitType = document.getElementById('unitType').value.replace(/\-/g, '/');

    let sTime = 0,
        eTime = 0,
        keyTime = 0,
        outHead = `<th>${this._language == 'ko' ? '전력사용량' : 'POWER USAGE'} ( kWh )</th>`,
        out = '';

    const lpListLen = this._lpList.length;

    switch (unitType) {
        case 'daily':
            sTime = new Date(document.getElementById('sDate').value.replace(/\-/g, '/')).getTime() / 1000;
            eTime = new Date(document.getElementById('eDate').value.replace(/\-/g, '/')).getTime() / 1000;

            for (let ib = 0; ib < lpListLen; ++ib) {
                const ta = this._lpList[ib];

                out += `<tr><th>${ta.lp_name}</th>`;
                keyTime = sTime;
                while (keyTime <= eTime) {
                    if (ib == 0) {
                        outHead += `<th>${this.echoDate(this._language == 'ko' ? 'y-m-d' : 'd/m', keyTime)}</th>`;
                    }
                    let watt = 0;
                    if (isNaN(ta.pid)) {
                        // 그룹일때 그룹목에 해당하는 설비의 전력을 합산
                        const nubArea = `${ta.nub}`.split(',');
                        for (let ia = 0, th = nubArea.length; ia < th; ++ia) {
                            if (j.hasOwnProperty(keyTime) && j[keyTime].hasOwnProperty(nubArea[ia])) {
                                watt += j[keyTime][nubArea[ia]];
                            }
                        }
                    } else if (j.hasOwnProperty(keyTime) && j[keyTime].hasOwnProperty(ta.pid)) {
                        watt = j[keyTime][ta.pid];
                    }
                    out += `<td>${this.echoNumber(Math.round((watt * 0.001) * 100) / 100)}</td>`;
                    keyTime += 86400;
                }
                out += '</tr>';
            }
            break;
        case 'monthly':
            sTime = new Date(`${document.getElementById('sDate').value}-01 00:00`).getTime() / 1000;
            eTime = new Date(`${document.getElementById('eDate').value}-01 00:00`).getTime() / 1000;

            for (let ib = 0; ib < lpListLen; ++ib) {
                const ta = this._lpList[ib];

                out += `<tr><th>${ta.lp_name}</th>`;
                keyTime = sTime;
                while (keyTime <= eTime) {
                    if (ib == 0) {
                        outHead += `<th>${this.echoDate('y-m', keyTime)}</th>`;
                    }
                    let watt = 0;
                    if (isNaN(ta.pid)) {
                        // 그룹일때 그룹목에 해당하는 설비의 전력을 합산
                        const nubArea = `${ta.nub}`.split(',');
                        for (let ia = 0, th = nubArea.length; ia < th; ++ia) {
                            if (j.hasOwnProperty(keyTime) && j[keyTime].hasOwnProperty(nubArea[ia])) {
                                watt += j[keyTime][nubArea[ia]];
                            }
                        }
                    } else if (j.hasOwnProperty(keyTime) && j[keyTime].hasOwnProperty(ta.pid)) {
                        watt = j[keyTime][ta.pid];
                    }
                    out += `<td>${this.echoNumber(watt)}</td>`;

                    const tmpDate = new Date(keyTime * 1000);
                    keyTime = tmpDate.setMonth(tmpDate.getMonth() + 1) / 1000;
                }
                out += '</tr>';
            }
            break;
        default:
            sTime = new Date(document.getElementById('sDate').value.replace(/\-/g, '/')).getTime() / 1000;
            eTime = sTime + 86400 - 3600;

            for (let ib = 0; ib < lpListLen; ++ib) {
                const ta = this._lpList[ib];

                out += `<tr><th>${ta.lp_name}</th>`;

                keyTime = sTime;
                for (let ih = 1; ih <= 24; ++ih) {
                    if (ib == 0) {
                        outHead += `<th>${ih}H</th>`;
                    }
                    let watt = 0;
                    if (isNaN(ta.pid)) {
                        // 그룹일때 그룹목에 해당하는 설비의 전력을 합산
                        const nubArea = `${ta.nub}`.split(',');
                        for (let ia = 0, th = nubArea.length; ia < th; ++ia) {
                            if (j.hasOwnProperty(keyTime) && j[keyTime].hasOwnProperty(nubArea[ia])) {
                                watt += j[keyTime][nubArea[ia]];
                            }
                        }
                    } else if (j.hasOwnProperty(keyTime) && j[keyTime].hasOwnProperty(ta.pid)) {
                        watt = j[keyTime][ta.pid];
                    }
                    out += `<td>${Math.round((watt * 0.001) * 100) / 100}</td>`;
                    keyTime += 3600;
                }
                out += '</tr>';
            }
            break;
    }

    document.getElementById('itemList').innerHTML = `<tr class="sheetSticky">${outHead}</tr>${out}`;
};

vio.getData = async function() {
    const pd = {
        unitType: document.getElementById('unitType').value,
        sDate: document.getElementById('sDate').value,
        eDate: document.getElementById('eDate').value
    };

    if (pd.sDate == '') {
        this.toast({memo: '조회할 날짜를 선택해주세요.'});
    } else if (pd.unitType != 'hourly' && pd.eDate == '') {
        this.toast({memo: '조회할 날짜를 선택해주세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'get',
            type: pd.unitType,
            sDate: pd.sDate,
            eDate: pd.eDate
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/unit-reports/${this._fid}?${queryString}`, {
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
                this.dataTrans(jsonData.data);

                // 검색어 있으면 관련없는 시트를 삭제한다 (그룹처리 때문에 백앤드에서 하는게 번거롭다)
                setTimeout(function(){
                    const keyword = document.getElementById('keyword').value.trim();
                    if(keyword.length != 0){
                        const elements = document.getElementById('itemList').children;
                        let elementIndex = elements.length - 1;
                        // 뒤에서부터 제거
                        while(elementIndex){
                            if(elements[elementIndex].firstElementChild.textContent.indexOf(keyword) === -1){
                                elements[elementIndex].remove();
                            }
                            elementIndex -= 1;
                        }
                    }
                }, 128);
            }
        }
    }
};

vio.getBase = async function() {
    const params = {
        cf: 'base',
    }

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/unit-reports/${this._fid}?${queryString}`, {
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
            this._lpList = jsonData.lpList;
            this.getData();
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const dom = document,
        today = new Date();

    today.setDate(today.getDate() - 1);

    const sDateDatePicker = new tui.DatePicker('#sDateWrapper', {
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
    const eDateDatePicker = new tui.DatePicker('#eDateWrapper', {
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

    vio.getBase();

    dom.getElementById('unitType').addEventListener('change', function() {
        const dt = document.getElementById('deskDash'),
            nowDate = new Date();

        if (this.value == 'hourly') {
            // 기본 어제날짜
            nowDate.setDate(nowDate.getDate() - 1);

            dt.classList.add('disable');
            dt.nextElementSibling.classList.add('disable');

            // 달력 포맷 YYYYMMDD
            sDateDatePicker.setDate(nowDate);
            sDateDatePicker.setDateFormat('yyyy-MM-dd');
            sDateDatePicker.setType('date');
        } else if (this.value == 'monthly') {
            dt.classList.remove('disable');
            dt.nextElementSibling.classList.remove('disable');

            // 기본 지난 6개월
            nowDate.setDate(1);

            // 달력 포맷 YYYYMM
            nowDate.setMonth(nowDate.getMonth() - 1);
            eDateDatePicker.setDate(nowDate);
            eDateDatePicker.setDateFormat('yyyy-MM');
            eDateDatePicker.setType('month');

            nowDate.setMonth(nowDate.getMonth() - 6);
            sDateDatePicker.setDate(nowDate);
            sDateDatePicker.setDateFormat('yyyy-MM');
            sDateDatePicker.setType('month');
        } else {
            // 기본 보름
            dt.classList.remove('disable');
            dt.nextElementSibling.classList.remove('disable');

            // 달력 포맷 YYYYMMDD
            nowDate.setDate(nowDate.getDate() - 1);
            eDateDatePicker.setDate(nowDate);
            eDateDatePicker.setDateFormat('yyyy-MM-dd');
            eDateDatePicker.setType('date');

            nowDate.setDate(nowDate.getDate() - 16);
            sDateDatePicker.setDate(nowDate);
            sDateDatePicker.setDateFormat('yyyy-MM-dd');
            sDateDatePicker.setType('date');
        }
    });

    dom.getElementById('act').addEventListener('click', function() {
        vio.getData();
    });

    dom.getElementById('actExcelSave').addEventListener('click', function() {
        let unitType = document.getElementById('unitType'),
            saveName = `[${document.title}]${unitType.options[unitType.selectedIndex].text}.xlsx`;

        let workbook = XLSX.utils.table_to_book(document.getElementById('itemTable')),
            ws = workbook.Sheets['Sheet1'];
        XLSX.writeFile(workbook, saveName);
    });
});

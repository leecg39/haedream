'use strict';
// 이산화 탄소 배출계수 0.0004594 tCO2eq
vio._setToCO2 = 0.4594; // kgCO2eq

// 연별 온실가스 배출량
vio.dataTransYear = function(j) {
    const dt = document.getElementById('itemListYear').children;
    if (j.hasOwnProperty('wattLow')) {
        dt[0].children[1].textContent = this.echoNumber(j.wattMiddle);
        dt[0].children[2].textContent = this.echoNumber(Math.round(j.wattMiddle * this._setToCO2));
        dt[1].children[1].textContent = this.echoNumber(j.wattHigh);
        dt[1].children[2].textContent = this.echoNumber(Math.round(j.wattHigh * this._setToCO2));
        dt[2].children[1].textContent = this.echoNumber(j.wattLow);
        dt[2].children[2].textContent = this.echoNumber(Math.round(j.wattLow * this._setToCO2));
        dt[3].children[1].textContent = this.echoNumber(j.wattLow + j.wattMiddle + j.wattHigh);
        dt[3].children[2].textContent = this.echoNumber(Math.round((j.wattLow + j.wattMiddle + j.wattHigh) * this._setToCO2));
    }
};

vio.dataTrans = function(days, hours) {
    let out = '',
        monthPower = [0, 0, 0]; // 월전력량 [경,중,최대]

    for (let ia = 0, th = days.length; ia < th; ++ia) {
        const ta = days[ia];

        let hourList = '';
        for (let ih = 0; ih < 24; ++ih) {
            const ctime = ta.ctime + ih * 3600;
            let tco = 0;

            if (hours.hasOwnProperty(ctime)) {
                tco = Math.round(hours[ctime].watt * 0.001 * this._setToCO2);
            }
            hourList += `<td>${tco}</td>`;
        }

        out += `
        <tr>
            <th class="tLabel">${new Date(ta.ctime * 1000).getDate()}</th>
            <td>${Math.round(ta.wattMax * 0.001 * this._setToCO2)}</td>
            <td>${this.echoDate('h:i', ta.maxTime)}</td>
            ${hourList}
            <td>${this.echoNumber(Math.round(ta.wattMiddle * this._setToCO2))}</td>
            <td>${this.echoNumber(Math.round(ta.wattHigh * this._setToCO2))}</td>
            <td>${this.echoNumber(Math.round(ta.wattLow * this._setToCO2))}</td>
            <td>${this.echoNumber(Math.round((ta.wattLow + ta.wattMiddle + ta.wattHigh) * this._setToCO2))}</td>
        </tr>`;

        monthPower[0] += ta.wattLow;
        monthPower[1] += ta.wattMiddle;
        monthPower[2] += ta.wattHigh;
    }
    document.getElementById('itemList').innerHTML = out;

    // 월별 온실가스 배출량
    const dt = document.getElementById('itemListMonth').children;
    dt[0].children[1].textContent = this.echoNumber(monthPower[1]);
    dt[0].children[2].textContent = this.echoNumber(Math.round(monthPower[1] * this._setToCO2));
    dt[1].children[1].textContent = this.echoNumber(monthPower[2]);
    dt[1].children[2].textContent = this.echoNumber(Math.round(monthPower[2] * this._setToCO2));
    dt[2].children[1].textContent = this.echoNumber(monthPower[0]);
    dt[2].children[2].textContent = this.echoNumber(Math.round(monthPower[0] * this._setToCO2));
    dt[3].children[1].textContent = this.echoNumber(monthPower[0] + monthPower[1] + monthPower[2]);
    dt[3].children[2].textContent = this.echoNumber(Math.round((monthPower[0] + monthPower[1] + monthPower[2]) * this._setToCO2));
};

vio.getData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const lpList = document.getElementById('lpList');

        const params = {
            cf: 'get',
            pid: lpList.value,
            date: document.getElementById('inputMonth').value
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/toe-reports/${this._fid}?${queryString}`, {
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
                if (lpList.value == 0) {
                    let out = '';
                    for (let ia = 0, th = jsonData.lpList.length; ia < th; ++ia) {
                        const ta = jsonData.lpList[ia];
                        out += `<option value="${ta.pid}">${this.catToXLSX(ta.lp_name)}</option>`;
                    }
                    lpList.innerHTML = out;
                }
                document.getElementById('contract').textContent = this._language == 'ko' ? `요금제: ${jsonData.contract}` : '';
                this.dataTransYear(jsonData.powerYear);
                this.dataTrans(jsonData.powerDay, jsonData.powerHour);
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

    await vio.getData();

    dom.getElementById('act').addEventListener('click', function() {
        vio.getData();
    });

    dom.getElementById('actExcelSave').addEventListener('click', function() {
        let lpList = dom.getElementById('lpList'),
            saveName = `[${dom.title}]${lpList.options[lpList.selectedIndex].text}.xlsx`;

        let workbook = XLSX.utils.table_to_book(dom.getElementById('itemTable')),
            ws = workbook.Sheets['Sheet1'];
        XLSX.writeFile(workbook, saveName);
    });
});
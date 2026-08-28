'use strict';
// 연별 전력사용량
vio.dataTransYear = function(j) {
    const dt = document.getElementById('itemListYear').children;
    if (j.hasOwnProperty('priceL')) {
        dt[0].children[1].textContent = this.echoNumber(j.wattMiddle);
        dt[0].children[2].textContent = this.echoNumber(j.priceM);
        dt[1].children[1].textContent = this.echoNumber(j.wattHigh);
        dt[1].children[2].textContent = this.echoNumber(j.priceH);
        dt[2].children[1].textContent = this.echoNumber(j.wattLow);
        dt[2].children[2].textContent = this.echoNumber(j.priceL);
        dt[3].children[1].textContent = this.echoNumber(j.wattLow + j.wattMiddle + j.wattHigh);
        dt[3].children[2].textContent = this.echoNumber(j.priceL + j.priceM + j.priceH);
    }
};

vio.dataTrans = function(days, hours) {
    let out = '',
        sumFactor = 0,
        monthPower = [0, 0, 0], // 월전력량 [경,중,최대]
        monthPrice = [0, 0, 0]; // 월요금 [경,중,최대]

    for (let ia = 0, th = days.length; ia < th; ++ia) {
        const ta = days[ia];
        let hourList = '';

        sumFactor += ta.factor;
        for (let ih = 0; ih < 24; ++ih) {
            const ctime = ta.ctime + ih * 3600;
            /*
             let watt =0;

             if(hours.hasOwnProperty(ctime)){
             watt =Math.round(hours[ctime].watt *0.001);
             }
             hourList +=`<td>${watt}</td>`;
             */
            let price = 0;

            if (hours.hasOwnProperty(ctime)) {
                price = this.echoNumber(Math.round((hours[ctime].price * 0.0001) * 100) / 100);
            }
            hourList += `<td>${price}</td>`;
        }

        out += `
        <tr>
            <th class="tLabel">${new Date(ta.ctime * 1000).getDate()}</th>
            ${hourList}
            <td>${this.currency(ta.priceM)}</td>
            <td>${this.currency(ta.priceH)}</td>
            <td>${this.currency(ta.priceL)}</td>
            <td>${this.currency(ta.priceL + ta.priceM + ta.priceH)}</td>
            <td>${(ta.factor * 0.01).toFixed(1)}</td>
        </tr>`;

        monthPower[0] += ta.wattLow;
        monthPower[1] += ta.wattMiddle;
        monthPower[2] += ta.wattHigh;
        monthPrice[0] += ta.priceL;
        monthPrice[1] += ta.priceM;
        monthPrice[2] += ta.priceH;
    }
    document.getElementById('itemList').innerHTML = out;

    // 역률평균
    document.getElementById('totalAVGFactor').textContent = `${days.length ? (sumFactor / days.length * 0.01).toFixed(2) : '0.00'}%`;

    // 월별 전력사용량
    const dt = document.getElementById('itemListMonth').children;
    dt[0].children[1].textContent = this.echoNumber(monthPower[1]);
    dt[0].children[2].textContent = this.echoNumber(monthPrice[1]);
    dt[1].children[1].textContent = this.echoNumber(monthPower[2]);
    dt[1].children[2].textContent = this.echoNumber(monthPrice[2]);
    dt[2].children[1].textContent = this.echoNumber(monthPower[0]);
    dt[2].children[2].textContent = this.echoNumber(monthPrice[0]);
    dt[3].children[1].textContent = this.echoNumber(monthPower[0] + monthPower[1] + monthPower[2]);
    dt[3].children[2].textContent = this.echoNumber(monthPrice[0] + monthPrice[1] + monthPrice[2]);
};

vio.currency = function(n) {
    return this.echoNumber((n * 0.0001).toFixed(1));
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

        const res = await fetch(`api/power-reports/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
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

    const today = new Date();

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

    document.getElementById('act').addEventListener('click', function() {
        vio.getData();
    });

    document.getElementById('actExcelSave').addEventListener('click', function() {
        let lpList = document.getElementById('lpList'),
            saveName = `[${document.title}]${lpList.options[lpList.selectedIndex].text}.xlsx`;

        let workbook = XLSX.utils.table_to_book(document.getElementById('itemTable')),
            ws = workbook.Sheets['Sheet1'];
        XLSX.writeFile(workbook, saveName);
    });

    // 특정업체 요금표 팝업활성화
    if(document.getElementById('chargeLink')){
        if([97,105,141].includes(Number(vio._fid))){
            document.getElementById('chargeLink').href = `power.html?accessToken=${vio._accessToken}`;
        }else{
            document.getElementById('chargeLink').classList.add('disable');
        }
    }
});
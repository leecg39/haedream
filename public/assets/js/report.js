'use strict';
vio.dataTrans = function(data, product) {
    let out = '',
        sum = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const dataLen = data.length;

    for (let ia = 0; ia < dataLen; ++ia) {
        const ta = data[ia];

        out += `
        <tr>
            <th class="tLabel">${this.echoDate('y-m-d', ta.ctime)}</th>
            <td>${(ta.wattMax * 0.004).toFixed(2)}</td>
            <td>${this.echoNumber((ta.watt * 0.001).toFixed(2))}</td>
            <td>${product[ta.ctime] ? ((ta.priceL + ta.priceM + ta.priceH) / product[ta.ctime]).toFixed(2) : 0}</td>
            <td>${this.echoNumber(ta.priceL + ta.priceM + ta.priceH)}</td>
            <td>${(ta.watt * 0.001 * 0.000229).toFixed(2)}</td>
            <td>${(ta.watt * 0.001 * 0.0004594).toFixed(2)}</td>
            <td>${(ta.factor * 0.01).toFixed(2)}</td>
            <td>${ta.dayPower != 0 ? (ta.watt * 0.001 / ta.dayPower * 100).toFixed(2) : 0}</td>
        </tr>`;

        sum[0] = ta.wattMax > sum[0] ? ta.wattMax : sum[0];
        sum[1] += ta.watt;
        sum[2] += ta.priceL + ta.priceM + ta.priceH;
        sum[3] += ta.watt;
        sum[4] += ta.watt;
        sum[5] += ta.factor;
        sum[6] += ta.dayPower != 0 ? ta.watt * 0.001 / ta.dayPower * 100 : 0;
        sum[7] += product[ta.ctime] ?? 0;
    }

    if (dataLen != 0) {
        sum[5] = sum[5] / dataLen;
        sum[6] = sum[6] / dataLen;
    }
    out += `
    <tr>
        <th class="tLabel"></th>
        <th class="tLabel tip" data-tip="MAXIMUM">${(sum[0] * 0.004).toFixed(2)}</th>
        <th class="tLabel">${this.echoNumber((sum[1] * 0.001).toFixed(2))}</th>
        <th class="tLabel">${sum[7] != 0 ? (sum[2] / sum[7]).toFixed(2) : 0}</th>
        <th class="tLabel">${this.echoNumber(sum[2])}</th>
        <th class="tLabel">${(sum[3] * 0.001 * 0.000229).toFixed(2)}</th>
        <th class="tLabel">${(sum[4] * 0.001 * 0.0004594).toFixed(2)}</th>
        <th class="tLabel tip" data-tip="AVERAGE">${(sum[5] * 0.01).toFixed(2)}</th>
        <th class="tLabel tip" data-tip="AVERAGE">${(sum[6]).toFixed(2)}</th>
    </tr>`;

    document.getElementById('itemList').innerHTML = out;
};

vio.getData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const lpList = document.getElementById('lpList');

        const params = {
            cf: 'get',
            pid: lpList.value,
            sDate: document.getElementById('sDate').value,
            eDate: document.getElementById('eDate').value,
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/reports/${this._fid}?${queryString}`, {
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
                    if (lpList.value == 0) {
                        let out = '';
                        for (let ia = 0, th = jsonData.lpList.length; ia < th; ++ia) {
                            const ta = jsonData.lpList[ia];
                            out += `<option value="${ta.pid}">${this.catToXLSX(ta.lp_name)}</option>`;
                        }
                        lpList.innerHTML = out;
                    }
                    this.dataTrans(jsonData.data, jsonData.dataProduct);
                    break;
                default:
                    this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const dom = document,
        today = new Date(),
        maxDate = new Date();

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
    today.setDate(1);
    new tui.DatePicker('#sDateWrapper', {
        date: today,
        input: {
            element: '#sDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), maxDate] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    dom.getElementById('act').addEventListener('click', function() {
        vio.getData();
    });

    dom.getElementById('actExcelSave').addEventListener('click', function() {
        let lpList = document.getElementById('lpList'),
            saveName = `[${document.title}]${lpList.options[lpList.selectedIndex].text}.xlsx`;

        let workbook = XLSX.utils.table_to_book(document.getElementById('itemTable')),
            ws = workbook.Sheets['Sheet1'];
        XLSX.writeFile(workbook, saveName);
    });

    await vio.getData();
});

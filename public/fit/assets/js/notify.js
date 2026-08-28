'use strict';
vio._isItemInit = false;

vio.dataTrans = function(j) {
    const dom = document;
    const ableTime = Math.floor(Date.now() / 1000) - 128;

    if (!this._isItemInit) {
        let out = '';
        for (let ia = 0, th = j.length; ia < th; ++ia) {
            const ta = j[ia];

            let deviceStat = '';
            if (ta.lp_last < ableTime) {
                deviceStat = 'class="off"';
            }

            out += `
            <tr id="p${ta.pid}" ${deviceStat}>
                <th class="tLabel">${ta.lp_name}</th>
                <td>${ta.lp_volt} V</td>
                <td>${ta.lp_apm} A</td>
                <td>${(ta.lp_watt / 1000).toFixed(2)} kW</td>
                <td>
                    <input type="time" class="inputTime" value="${ta.startTime ? ta.startTime : '09:00'}"/>
                    <span class="textWave">~</span>
                    <input type="time" class="inputTime" value="${ta.endTime ? ta.endTime : '18:00'}"/>
                </td>
                <td>
                    <input type="number" class="input" value="${ta.v ? ta.v : ''}" max="9999" min="0" placeholder="0.0"/>
                </td>
                <td>
                    <input type="number" class="input" value="${ta.vMax ? ta.vMax : ''}" max="9999" min="0" placeholder="0.0"/>
                </td>
                <td>
                    <input type="number" class="input" value="${ta.a ? ta.a : ''}" max="9999" min="0" placeholder="0.0"/>
                </td>
                <td>
                    <input type="number" class="input" value="${ta.aMax ? ta.aMax : ''}" max="9999" min="0" placeholder="0.0"/>
                </td>
                <td>
                    <input type="number" class="input" value="${ta.p ? ta.p : ''}" max="9999" min="0" placeholder="0"/>
                </td>
                <td>
                    <input type="number" class="input" value="${ta.pMax ? ta.pMax : ''}" max="9999" min="0" placeholder="0"/>
                </td>
                <td>
                    <input type="checkbox" ${ta.isEnable == 1 ? 'checked="checked"' : ''}/>
                </td>
                <td>
                    <span class="act" onclick="vio.setData({pid:${ta.pid},dt:this})">저장</span>
                </td>
            </tr>`;
        }
        dom.getElementById('itemList').innerHTML = out;
        this._isItemInit = true;
    } else {
        for (let ia = 0, th = j.length; ia < th; ++ia) {
            const ta = j[ia],
                dt = dom.getElementById('p' + ta[0]).children;

            dt[1].textContent = ta[1] + ' V';
            dt[2].textContent = ta[2] + ' A';
            dt[3].textContent = (ta[3] / 1000).toFixed(2) + ' kW';
        }
    }

    setTimeout(async function() {
        await vio.getData('sync');
    }, 1024);
};

vio.setData = async function(j) {
    const dt = document.getElementById('p' + j.pid).querySelectorAll('input');

    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            pid: j.pid,
            sTime: dt[0].value,
            eTime: dt[1].value,
            v: dt[2].value,
            vMax: dt[3].value,
            a: dt[4].value,
            aMax: dt[5].value,
            p: dt[6].value,
            pMax: dt[7].value,
            isEnable: dt[8].checked ? 1 : 0
        }

        const res = await fetch(`api/notify/${this._fid}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(params)
        });

        this.netAble(false);

        if (!res.ok) {
            console.error(res.status);
        }  else {
            const jsonData = await res.json();

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                j.dt.classList.toggle('checked', true);
                setTimeout(function(j) {
                    j.classList.toggle('checked', false);
                    j = null;
                }, 3600, j.dt);
            }
        }
    }
};

vio.getData = async function(j) {
    const params = {
        cf: j
    };

    if (j === 'get') {
        this.netAble(true);
    }

    const queryString = new URLSearchParams(params).toString();
    const res = await fetch(`api/notify/${this._fid}?${queryString}`, {
        method: 'GET',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        if (j == 'get') {
            this.netAble(false);
        }

        if (!res.ok) {
            console.error(res.status);
        }  else {
            const jsonData = await res.json();
            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this.dataTrans(jsonData.data);
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.getData('get');
});
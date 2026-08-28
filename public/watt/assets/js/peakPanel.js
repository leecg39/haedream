'use strict';
vio._peakControl = [];

vio.peakPanel = function(j) {
    const dom = document,
        controlLen = this._peakControl.length,
        itemLen = j.control.length;

    if (controlLen === 0) {
        let out = '';
        for (let ia = 0; ia < itemLen; ++ia) {
            const ta = j.control[ia];
            this._peakControl[ia] = {cid: ta[0], stat: ta[1], time: 0, rTime: ta[7]};

            out += `
                <tr>
                    <td>${ia + 1}</td>
                    <td>${ta[2]}</td>
                    <td>
                        <span id="cid${ta[0]}" class="panelStat ${ta[1] == 1 ? 'active' : ''}">
                            <span class="panelOff">OFF</span>
                            <span class="panelBar" onclick="vio.controlRequest({index:${ia},dt:this})"></span>
                            <span class="panelOn">ON</span>
                        </span>
                    </td>
                    <td>${ta[4]}</td>
                    <td>${ta[6] != 0 ? ta[6] : '-'}</td>
                    <td>-</td>
                    <td>${ta[8] != 0 ? ta[8] : '-'}</td>
                    <td>${ta[8] != 0 ? ta[8] : '-'}</td>
                    <td>${ta[5]}</td>
                    <td>${ta[5]}</td>
                </tr>`;
        }
        dom.getElementById('itemList').innerHTML = out;
    } else {
        const nowTime = Math.floor(Date.now() / 1000);
        for (let ia = 0; ia < controlLen && ia < itemLen; ++ia) {
            const ta = j.control[ia],
                isControl = ta[1],
                dt = dom.getElementById('cid' + ta[0]),
                tb = dt.parentElement.parentElement.children;

            this._peakControl[ia].rTime = ta[7];
            if (this._peakControl[ia].stat != isControl) {
                if (this._peakControl[ia].time < nowTime) {
                    dt.classList.toggle('active', isControl ? true : false);
                    this._peakControl[ia].stat = isControl;
                    dt.classList.remove('waiting');
                } else {
                    dt.classList.add('waiting');
                }
            } else {
                dt.classList.remove('waiting');
            }

            tb[4].textContent = ta[6] != 0 ? ta[6] : '-';
            tb[6].textContent = ta[8] != 0 ? ta[8] : '-';
            tb[7].textContent = ta[8] != 0 ? ta[8] : '-';
            tb[8].textContent = ta[5];
            tb[9].textContent = ta[5];
        }
    }

    setTimeout(function() {
        vio.peakLoad();
    }, 1024)
};

vio.peakLoad = async function() {
    const res = await fetch(`api/peak-panels/${this._fid}`, {
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
            this.peakPanel(jsonData);
        }
    }
};

// 10초 후에 다시 제어 요청 가능
vio.controlRequest = async function(j) {
    const ta = this._peakControl[j.index],
        nowTime = Math.floor(Date.now() / 1000);

    if (ta.rTime + 30 < nowTime) {
        let ts = '';
        if (nowTime - ta.rTime < 60) {
            ts = ` 마지막수신: ${nowTime - ta.rTime}초전`;
        } else if (nowTime - ta.rTime < 3600) {
            ts = ` 마지막수신: ${Math.ceil((nowTime - ta.rTime) / 60)}분전`;
        } else if (nowTime - ta.rTime < 86400) {
            ts = ` 마지막수신: ${Math.ceil((nowTime - ta.rTime) / 3600)}시간전`;
        }
        this.toast({memo: '제어가능 상태가 아닙니다.' + ts});
    } else if (ta.time >= nowTime) {
        this.toast({memo: `제어요청 응답 대기중 입니다. 남은시간: ${ta.time - nowTime}초`});
    } else if (!this._useNetworks) {
        ta.time = nowTime + 10;

        const res = await fetch(`api/controls/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"control","cid":${ta.cid},"authName":"${localStorage.getItem('authName')}"}`
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            switch (jsonData.cat) {
                case 9:
                    this.toast({memo: '권한이 없습니다.'});
                    break;
                case 3:
                    this.toast({memo: '제어요청 응답 대기중 입니다.'});
                    break;
                case 1:
                    ta.stat = ta.stat ? 0 : 1;
                    document.getElementById('cid' + ta.cid).classList.toggle('active', ta.stat ? true : false);
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.peakReady = function() {
    this.peakLoad();
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    vio.peakReady();
});
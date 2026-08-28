'use strict';

vio._firmName = localStorage.getItem('firmName');

vio.dataTrans = function(j) {
    let out = '';

    if (j.hasOwnProperty('device')) {
        out += '<div class="device"><p>DEVICE</p><p>업체</p><p>타입</p><p>이름</p><p>갱신일</p>';
        for (let ia = 0, th = j.device.length; ia < th; ++ia) {
            const ta = j.device[ia];
            out += `<p>${ta.pid}</p><p>${this._firmName}</p><p>${this._md[ta.md_id].name}</p><p>${ta.lp_name}</p><p>${ta.lp_last ? this.echoDate('y.m.d h:i:s', ta.lp_last) : ''}</p>`;
        }
        out += '</div>';
    }

    if (j.hasOwnProperty('power')) {
        out += '<div class="relay"><p>NODEPOWER</p><p>업체</p><p></p><p>갱신일</p>';
        for (let ia = 0, th = j.power.length; ia < th; ++ia) {
            const ta = j.power[ia];
            out += `<p>${ta.gid}</p><p>${this._firmName}</p><p></p><p>${ta.ctime ? this.echoDate('y.m.d h:i:s', ta.ctime) : ''}</p>`;
        }
        out += '</div>';
    }

    if (j.hasOwnProperty('gtype')) {
        out += '<div class="relay"><p>G-TYPE</p><p>업체</p><p></p><p>갱신일</p>';
        for (let ia = 0, th = j.gtype.length; ia < th; ++ia) {
            const ta = j.gtype[ia];
            out += `<p>${ta.gid}</p><p>${this._firmName}</p><p></p><p>${ta.ctime ? this.echoDate('y.m.d h:i:s', ta.ctime) : ''}</p>`;
        }
        out += '</div>';
    }

    if (j.hasOwnProperty('relay')) {
        out += '<div class="relay"><p>RELAY</p><p>업체</p><p>nodeIndex</p><p>갱신일</p>';
        for (let ia = 0, th = j.relay.length; ia < th; ++ia) {
            const ta = j.relay[ia];
            out += `<p>${ta.gid}</p><p>${this._firmName}</p><p>${ta.nodeIndex}</p><p>${ta.utime ? this.echoDate('y.m.d h:i:s', ta.utime) : ''}</p>`;
        }
        out += '</div>';
    }

    if (j.hasOwnProperty('air2')) {
        out += '<div class="relay"><p>AIR2</p><p>업체</p><p>nodeIndex</p><p>갱신일</p>';
        for (let ia = 0, th = j.air2.length; ia < th; ++ia) {
            const ta = j.air2[ia];
            out += `<p>${ta.gid}</p><p>${this._firmName}</p><p>${ta.nodeIndex}</p><p>${ta.utime ? this.echoDate('y.m.d h:i:s', ta.utime) : ''}</p>`;
        }
        out += '</div>';
    }

    document.getElementById('sheetArea').innerHTML = out;
};

vio.getData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/bad/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"get","dataType":"${document.getElementById('dataType').value}"}`
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
                    this.dataTrans(jsonData);
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.deskReady = async function() {
    document.getElementById('act').addEventListener('click', function() {
        vio.getData();
    });

    await this.getData();
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.deskReady();
});
'use strict';

vio._pause = false;
vio._dataLenN = 1;   // 데이터 개수, 라벨라인이 있어서 1
vio._dataLenR = 1;
vio._mainProcess = null;

vio.dataTrans = function(j) {
    let outN = '',
        outR = '';

    const filterGate = document.getElementById('filterGate').value;

    for (const ta of j.data) {
        ta[2] = ta[2].toString();
        const action = ta[2].substring(1, 9);

        if (ta[2].length > 12) {
            const gid = !isNaN(ta[2].substring(1, 5)) ? Number(ta[2].substring(1, 5)) : 0,
                fcode = ta[2].substring(5, 7),
                address = Number(ta[2].substring(7, 11));

            if (ta[2].substr(0, 9) != '>00790075' && ta[2].substr(0, 1) == '>' && gid > 0) {
                switch (fcode) {
                    case '03':
                        if (ta[2].length != 202) {
                            /*
                             const recode =[];
                             for(let ib =0, ti =Number(ta[2].substring(11,15)); ib <ti; ++ib){
                             const ic =ta[2].substring(15 +ib *4, 15 +ib *4 +4);
                             if(!isNaN(ic)){
                             recode[recode.length] =Number(ic);
                             }
                             }*/

                            if (address >= 255) {
                                // gateway gid:node로 node(장치종류)값 확인하여 power,com,relay,air,air2 의 recode정보를 기록, ip:port 정보 갱신
                                //console.log('a'+gid);
                                // node1 ~node10 중 하나를 찾기

                                let node = 0,
                                    nodeType = '';
                                for (let ib = 1; ib <= 10; ++ib) {
                                    if (ib * 256 <= address && address < (ib + 1) * 256) {
                                        node = ib;
                                        break;
                                    }
                                }

                                if (node != 0) {
                                    if (!this._gate.hasOwnProperty(gid)) {
                                        continue;
                                    }

                                    let trancPowerLen = null;
                                    switch (this._gate[gid][node]) {
                                        case 1:
                                            nodeType = 'power';
                                            if(ta[2].length == 57){
                                                trancPowerLen = 57;
                                                const ws = parseInt(ta[2].substr(23, 4)) + parseInt(ta[2].substr(27, 4)) * 256;
                                                const eoi = parseInt(ta[2].substr(39, 4)) + parseInt(ta[2].substr(43, 4)) * 256;
                                                ta[2] = `[${eoi},${ws}]${ta[2]}`;
                                            }
                                            break;
                                        case 2:
                                            nodeType = 'com';
                                            break;
                                        case 3:
                                            nodeType = 'relay';
                                            break;
                                        case 4:
                                            nodeType = 'air';
                                            break;
                                        case 5:
                                            nodeType = 'air2';
                                            break;
                                        default:
                                            nodeType = '';
                                    }

                                    if (filterGate.length == 0 || filterGate == gid) {
                                        this._dataLenN += 1;
                                        outN += `
                                    <span class="noteText">${nodeType}</span>
                                    <span class="noteText name">${this._gate[gid][11]}</span>
                                    <span class="noteText">${gid}</span>
                                    <span class="noteText">${node}</span>
                                    <span class="noteText">${trancPowerLen || ta[2].length}</span>
                                    <span class="noteText ellipsis">${ta[2]}</span>`;
                                    }
                                }
                            }
                        } else {
                            // gateway ip:port 정보 갱신, node(장치종류)값 갱신
                        }
                        break;
                    case '06':  // 제어응답 기록
                        if (ta[2].length != 202) {
                            let node = 0,
                                nodeType = '';
                            for (let ib = 1; ib <= 10; ++ib) {
                                if (ib * 256 <= address && address < (ib + 1) * 256) {
                                    node = ib;
                                    break;
                                }
                            }

                            if (node != 0) {
                                if (!this._gate.hasOwnProperty(gid)) {
                                    continue;
                                }

                                switch (this._gate[gid][node]) {
                                    case 1:
                                        nodeType = 'power';
                                        break;
                                    case 2:
                                        nodeType = 'com';
                                        break;
                                    case 3:
                                        nodeType = 'relay';
                                        break;
                                    case 4:
                                        nodeType = 'air';
                                        break;
                                    case 5:
                                        nodeType = 'air2';
                                        break;
                                    default:
                                        nodeType = '';
                                }

                                if (filterGate.length == 0 || filterGate == gid) {
                                    this._dataLenN += 1;
                                    outN += `
                                <span class="noteText">${nodeType}</span>
                                <span class="noteText name">${this._gate[gid][11]}</span>
                                <span class="noteText">${gid}</span>
                                <span class="noteText">${node}</span>
                                <span class="noteText">${ta[2].length}</span>
                                <span class="noteText ellipsis">${ta[2]}</span>`;
                                }
                            }
                            // console.log('control '+gid);
                        }
                        break;
                    case '13': // gateway_rtu ip:port 정보 갱신
                    case '16':
                        break;
                }
                continue;
            }

            switch (ta[2].length) {
                case 42: // TK
                case 58: // Dodam
                case 82: // KDX-A
                case 130: // imPRO
                case 186: // Gimac1000, G-type
                case 194: // Omni
                case 178: // Gipam115
                case 202: // Nanjun
                case 226: // Gipam 2200
                case 234: // GimacPlus, KDX-300
                case 410: // MPM330
                case 426: // RCU747
                    // gateway_rtu 에서 ip:port 조회하여 gateway_id를 회득하여 load_postion_rtu gateway_id:lpNo 로 lp_id 를 획득
                    const lpNo = parseInt(ta[2].substring(0, 2), 16);

                    let k = `${ta[0]}:${ta[1]}`,
                        kb = '';
                    if (!this._gateR.hasOwnProperty(k)) {
                        continue;
                    }
                    kb = `${this._gateR[k]}#${lpNo}`;
                    if (!this._device.hasOwnProperty(kb)) {
                        //console.log(kb);
                        continue;
                    }

                    if (filterGate.length == 0 || filterGate == this._gateR[k]) {
                        this._dataLenR += 1;
                        outR += `
                    <span class="noteText">${this._device[kb][0]}</span>
                    <span class="noteText name">${this._device[kb][1]}</span>
                    <span class="noteText">${this._gateR[k]}</span>
                    <span class="noteText">${lpNo}</span>
                    <span class="noteText">${ta[2].length}</span>
                    <span class="noteText ellipsis">${ta[2]}</span>`;
                    }
                    break;
                default:
                    let ipport = `${ta[0]}:${ta[1]}`;
                    if (!this._gateR.hasOwnProperty(ipport)) {
                        continue;
                    }

                    if (filterGate.length == 0 || filterGate == this._gateR[ipport]) {
                        this._dataLenR += 1;
                        outR += `
                    <span class="noteText"></span>
                    <span class="noteText name"></span>
                    <span class="noteText">${this._gateR[ipport]}</span>
                    <span class="noteText"></span>
                    <span class="noteText">${ta[2].length}</span>
                    <span class="noteText ellipsis">${ta[2]}</span>`;
                    }
            }
        }
    }

    if (outN != '') {
        let dt = document.getElementById('itemListNODE');
        dt.insertAdjacentHTML('beforeend', outN);
        outN = null;

        if (this._dataLenN > 128) {
            let items = dt.querySelectorAll(`span:nth-child(n+7):nth-child(-n+${(this._dataLenN + 1 - 128) * 6})`)
            dt = null;
            this._dataLenN = 128;

            for (let element of items) {
                element.remove();
                element = null;
            }
            items = null;
        }
        dt = null;
    }
    if (outR != '') {
        let dt = document.getElementById('itemListRTU');
        dt.insertAdjacentHTML('beforeend', outR);
        outR = null;

        if (this._dataLenR > 128) {
            let items = dt.querySelectorAll(`span:nth-child(n+7):nth-child(-n+${(this._dataLenR + 1 - 128) * 6})`)
            dt = null;
            this._dataLenR = 128;

            for (let element of items) {
                element.remove();
                element = null;
            }
            items = null;
        }
        dt = null;
    }
};

vio.getBase = async function() {
    if (!this._pause) {
        const res = await fetch(`api/net/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"base","cp":"${this._fid}"}`
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            switch (jsonData.cat) {
                case 9:
                    this.toast({memo: '권한이 없습니다.'});
                    break;
                case 1:
                    this._gate = jsonData.gate;
                    this._gateR = jsonData.gateR;
                    this._device = jsonData.device;
                    // 소스서버
                    this._sourceGate = jsonData.sourceGate;
                    this._sourceIP = jsonData.sourceIP;
                    if (this._sourceGate != '') {
                        this.getData();
                    } else {
                        this.toast({memo: '등록된 게이트정보가 없습니다.'});
                    }
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.getData = async function() {
    if (!this._pause) {
        const res = await fetch(`api/net/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"get","cp":"${this._fid}","gate":"${this._sourceGate}","ip":"${this._sourceIP}"}`
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            switch (jsonData.cat) {
                case 9:
                    this.toast({memo: '권한이 없습니다.'});
                    break;
                case 1:
                    this.dataTrans(jsonData);
                    clearTimeout(this._mainProcess);
                    this._mainProcess = setTimeout(function() {
                        vio.getData();
                    }, 1024);
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.deskReady = function() {
    let dt = null,
        thisVip = null,
        out = '';

    document.getElementById('togglePause').addEventListener('click', function() {
        if (vio._pause) {
            vio._pause = false;
            this.textContent = '업데이트 중지';
            clearTimeout(vio._mainProcess);
            vio._mainProcess = setTimeout(function() {
                vio.getData();
            }, 1024);
        } else {
            vio._pause = true;
            this.textContent = '업데이트 시작';

        }
    });

    // gate 필터 입력시 로그전체 삭제
    document.getElementById('filterGate').addEventListener('change', function() {
        let dt = document.getElementById('itemListNODE').querySelectorAll('span:nth-child(n+7)');
        vio._dataLenN = 1;
        dt.forEach(function(element) {
            element.remove();
        });

        dt = document.getElementById('itemListRTU').querySelectorAll('span:nth-child(n+7)');
        vio._dataLenR = 1;
        dt.forEach(function(element) {
            element.remove();
        });
    });
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.deskReady();
    await vio.getBase();
});
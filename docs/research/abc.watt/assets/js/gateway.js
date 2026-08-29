'use strict';

vio._firmName = localStorage.getItem('firmName') ?? '';
vio._firm = {};

vio._measureType = {
    0: '선택',
    1: 'R: Relay1',
    2: 'R: Relay2',
    3: 'R: ch1state',
    4: 'R: ch2state',
    5: 'R: ch1in',
    7: 'R: ch2in',
    18: 'A2: relay2',
    19: 'A2: relay3',
    20: 'A2: relay4',
    21: 'A2: relay5',
    30: 'A1: relay1',
    31: 'A1: relay2'
};
vio._controlType = {
    0: '선택',
    5: 'R: 1ch Signal Out Gain(0~100)%',
    6: 'R: 2ch Signal Out Gain(0~100)%'
};
vio._controlAddress = {
    0: '선택',
    1: 'R: Relay1(0~1)',
    2: 'R: Relay2(0~1)',
    3: 'R: 1ch State(0:Bypass 1:Control)',
    4: 'R: 2ch State(0:Bypass 1:Control)',
    14: 'A2: Relay2(0:Off 1:On)',
    15: 'A2: Relay3(0:Off 1:On)',
    16: 'A2: Relay4(0:Off 1:On)',
    17: 'A2: Relay5(0:Off 1:On)',
    24: 'A1: Relay1(0:Off 1:On)',
    25: 'A1: Relay2(0:Off 1:On)'
};

vio._node = ['-', 'power', 'com', 'relay', 'air', 'air2'];
vio._control = {};
vio._controlStatus = {0: '미제어', 1: '제어중', 61: '중지', 62: '대기', 63: '충전중', 64: '방전중'};

vio._groupType = '';
vio._groupIdn = 0;
vio._groupTmp = null;

vio.deskEditFixed = async function() {
    const dom = document,
        dt = dom.getElementById('edit-pidpw'),
        pd = {
            cf: this._sheet.idn ? 'edit' : 'add',
            idn: this._sheet.idn,
            fid: dom.getElementById('edit-fid').value,
            controlName: dom.getElementById('edit-controlName').value,
            controlMode: dom.getElementById('edit-controlMode').value,
            controlPriority: dom.getElementById('edit-controlPriority').value,
            gid: dom.getElementById('edit-gid').value,
            pid: dom.getElementById('edit-pid').value,
            pidpw: dt.value,
            device: dt.children[dt.selectedIndex].getAttribute('data-device'),
            nodeIndex: dom.getElementById('edit-nodeIndex').value,
            measureType: dom.getElementById('edit-measureType').value,
            controlType: dom.getElementById('edit-controlType').value,
            controlAddress: dom.getElementById('edit-controlAddress').value,
            limitTime: dom.getElementById('edit-limitTime').value,
            restTime: dom.getElementById('edit-restTime').value,
            setTemp: dom.getElementById('edit-setTemp').value,
            baseWatt: dom.getElementById('edit-baseWatt').value,
            partIdn: dom.getElementById('edit-partIdn').value,
            stayIdn: dom.getElementById('edit-stayIdn').value,
            tabName: dom.getElementById('edit-tabName').value,
            techDesign: dom.getElementById('edit-techDesign').value,
            memo: dom.getElementById('edit-memo').value,
            firmName: vio._firmName
        };
    if (pd.fid == false) {
        this.toast({memo: '업체를 선택하세요.'});
    } else if (!pd.controlName) {
        this.toast({memo: '이름을 입력하세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/gateway/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(pd)
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
                    this.toast({memo: '확인 되었습니다.'});
                    this.getData(this._sheet.page);
                    document.getElementById('modal').classList.add('disable');
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }

};

vio.deskEditPop = function(j) {
    const dom = document;

    this._sheet.idn = j.cid || 0;
    dom.getElementById('edit-fid').value = j.fid || 0;
    dom.getElementById('edit-controlName').value = j.controlName || '';
    dom.getElementById('edit-controlMode').value = j.controlMode || 0;
    dom.getElementById('edit-controlPriority').value = j.controlPriority || 0;
    dom.getElementById('edit-gid').value = j.gid || 0;
    dom.getElementById('edit-pid').value = j.pid || 0;
    dom.getElementById('edit-pidpw').value = j.pidpw || 0;
    dom.getElementById('edit-nodeIndex').value = j.nodeIndex || 0;
    dom.getElementById('edit-measureType').value = j.measureType || 0;
    dom.getElementById('edit-controlType').value = j.controlType || 0;
    dom.getElementById('edit-controlGain').value = j.peakGain || 0;
    dom.getElementById('edit-controlAddress').value = j.controlAddress || 0;
    dom.getElementById('edit-limitTime').value = j.limitTime || 0;
    dom.getElementById('edit-restTime').value = j.restTime || 0;
    dom.getElementById('edit-setTemp').value = j.setTemp || 0;
    dom.getElementById('edit-baseWatt').value = j.baseWatt || 0;
    dom.getElementById('edit-partIdn').value = j.partIdn || 0;
    dom.getElementById('edit-stayIdn').value = j.stayIdn || 0;
    dom.getElementById('edit-techDesign').value = j.techDesign || 0;
    dom.getElementById('edit-tabName').value = j.tabName || '';
    dom.getElementById('edit-memo').value = j.memo || '';

    dom.getElementById('modal').classList.remove('disable');
    if (dom.getElementById('edit-fid').value == 0) {
        // 선택된 계정이 없으면 현재 계정으로
        const fid = this._fid;
        dom.getElementById('edit-fid').value = fid;
        this.getNode({fid: fid, pid: 0, pidpw: 0});
        this.getGroup({fid: fid, partIdn: 0, stayIdn: 0});
    }
};

vio.deskItem = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        this._sheet.idn = j.parentElement.getAttribute('data-idn');
        const res = await fetch(`api/gateway/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"item","idn":"${this._sheet.idn}"}`
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
                    this.deskEditPop(jsonData.data);
                    this.getNode({
                        fid: jsonData.data.fid,
                        pid: jsonData.data.pid || 0,
                        pidpw: jsonData.data.pidpw || 0
                    });
                    this.getGroup({
                        fid: jsonData.data.fid,
                        partIdn: jsonData.data.partIdn || 0,
                        stayIdn: jsonData.data.stayIdn || 0
                    });
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.deskDropFixed = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/gateway/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"drop","idn":"${this._sheet.dropItem.getAttribute('data-idn')}","firmName":"${this._firmName}"}`
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
                    this._sheet.dropItem.classList.add('disable');
                    this._sheet.dropItem = null;
                    this.toast({memo: '삭제 되었습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.deskDrop = function(j) {
    this._sheet.dropItem = j.parentElement.parentElement;
    this.dialog({act: 'open', tag: 'deskDropFixed', memo: '정말 삭제하시겠습니까?<br/>되돌릴 수 없습니다.'});
};

vio.deskPaging = function(j) {
    this._sheet.page = j.page;

    let out = '',
        pageNo = 0;

    if (j.page > 4) {
        out += `<span class="deskPage act" onclick="vio.getData(${j.page - 9 < 1 ? 1 : j.page - 9})">prev</span>`;
    } else {
        out += '<span class="deskPage act">prev</span>';
    }
    for (let ia = j.page > 4 ? j.page - 4 : 1; ia < j.page; ++ia) {
        pageNo += 1;
        out += `<span class="deskPage act" onclick="vio.getData(${ia})">${ia}</span>`;
    }
    out += `<span class="deskPage act active">${j.page}</span>`;
    for (let ia = j.page + 1; ia < j.page + (9 - pageNo) && ia <= j.dbPageNo; ++ia) {
        out += `<span class="deskPage act" onclick="vio.getData(${ia})">${ia}</span>`;
    }
    if (j.dbPageNo > 9) {
        out += `<span class="deskPage act" onclick="vio.getData(${j.page + 9 > j.dbPageNo ? j.dbPageNo : j.page + 9})">next</span>`;
    } else {
        out += '<span class="deskPage act">next</span>';
    }
    document.getElementById('deskPages').innerHTML = out;
    document.getElementById('deskStat').textContent = `${(j.page - 1) * j.dbListLimit + 1} - ${j.page * j.dbListLimit < j.dbNo ? j.page * j.dbListLimit : j.dbNo} / ${j.dbNo}`;
};

vio.dataTrans = function(j) {
    let out = '';

    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia],
            vipName = this._firm[ta.fid] ? this._firm[ta.fid] : '',
            isChannel = ta.measureType == 5 || ta.measureType == 7 ? true : false; // 전류제어

        out += `
        <tr data-idn="${ta.cid}">
            <td class="editAct">${ta.gid}<i class="icon iconEdit" onclick="vio.deskItem(this.parentElement)"></i></td>
            <td class="textAct" onclick="vio.deskItem(this)">${this.catToXLSX(ta.controlName)}</td>
            <td class="tAct ${ta.controlMode == 1 ? 'safeText' : ''}" onclick="vio.setMode(${ta.cid})" title="제어모드 자동/수동 전환">${ta.controlMode == 1 ? '자동' : '수동'}</td>
            <td>${ta.controlPriority}</td>
            <td>${ta.nodeIndex}</td>
            <td>${this._measureType[ta.measureType]}</td>
            <td>${ta.voltage.toFixed(1)}</td>
            <td>${ta.ampere.toFixed(1)}</td>
            <td>${ta.temp}</td>
            <td><span id="cid${ta.cid}" class="tCon ${ta.controlStat == 1 ? 'tMark' : ''}">${ta.controlStat == 1 ? '제어중' : '미제어'}</span></td>
            <td><span class="tAct" onclick="vio.controlRequest(${ta.cid})" title="설비제어 요청">제어</span></td>
            <td>${isChannel ? ta.relayIn : ''}</td>
            <td>${isChannel ? ta.controlGain : ''}</td>
            <td>${isChannel ? ta.peakGain : ''}</td>
            <td>${ta.rTime != 0 ? this.echoDate('m.d h:i', ta.rTime) : ''}</td>
            <td>${ta.cid}</td>
            <td class="editAct">${this.catToXLSX(ta.memo)}<i class="icon iconDrop" onclick="vio.deskDrop(this)"></i></td>
        </tr>`;
        if (!this._control.hasOwnProperty(ta.cid)) {
            this._control[ta.cid] = {stat: ta.controlStat, time: 0, rTime: 0};
        }
        this._control[ta.cid].stat = ta.controlStat;
    }
    document.getElementById('deskList').innerHTML = out;
};

vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/gateway/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"get","cp":"${this._fid}","qs":"${document.getElementById('deskInput').value}","page":"${j}","qt":"${this._sheet.sortTag}","qa":"${this._sheet.sortAsc}"}`
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
                    this.dataTrans(jsonData.data);
                    this.deskPaging(jsonData.paging);
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 업체에 해당하는 게이트노드정보를 출력하고
// 업체의 온도계측기, 전력계측기 목록을 선택할 수 있도록 해준다
vio.getNode = async function(j) {
    const res = await fetch(`api/gateway/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: `{"cf":"gate","cp":"${j.fid}"}`
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
                let out = `<span class="th">gateway</span>
                <span class="th">name</span>
                <span class="th">ip</span>
                <span class="th">port</span>
                <span class="th">memo</span>`;
                for (let ia = 0, th = jsonData.data.length; ia < th; ++ia) {
                    const ta = jsonData.data[ia];
                    out += `<span>${ta.gid}</span>
                    <span>${ta.gateName}</span>
                    <span>${ta.ip}</span>
                    <span>${ta.portNo}</span>
                    <span>${ta.memo}</span>
                    <span></span>
                    <span class="editExtendSub">1:${this._node[ta.node1]}, 2:${this._node[ta.node2]}, 3:${this._node[ta.node3]}, 4:${this._node[ta.node4]}, 5:${this._node[ta.node5]}, 6:${this._node[ta.node6]}, 7:${this._node[ta.node7]}, 8:${this._node[ta.node8]}, 9:${this._node[ta.node9]}, 10:${this._node[ta.node10]}</span>`;
                }
                document.getElementById('editExtend').innerHTML = out;

                // 온도 계측기, 전력계측기
                out = '<option value="0" data-device="0">계측 선택</option>';
                let outTemp = '<option value="0">계측 선택</option>';
                for (let ia = 0, th = jsonData.device.length; ia < th; ++ia) {
                    const ta = jsonData.device[ia];
                    if (this._md[ta.md_id]['part'] == 5) {
                        outTemp += `<option value="${ta.pid}" ${ta.pid == j.pid ? 'selected' : ''}>${ta.lp_name}</option>`;
                    } else {
                        out += `<option value="${ta.pid}" ${ta.pid == j.pidpw ? 'selected' : ''} data-device="${ta.md_id}">${ta.lp_name}</option>`;
                    }
                }
                document.getElementById('edit-pid').innerHTML = outTemp;
                document.getElementById('edit-pidpw').innerHTML = out;
                break;
            default:
                this.toast({memo: '데이터가 존재하지 않습니다.'});
        }
    }
};

// 매초마다 제어상태 정보를 갱신해준다
vio.syncRelay = async function() {
    const dt = document.getElementById('deskList').children;
    let ts = '0';
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        ts += ',' + dt[ia].getAttribute('data-idn');
    }

    const res = await fetch(`api/gateway/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: `{"cf":"relay","cid":"${ts}"}`
    });
    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json(),
            nowTime = Math.floor(Date.now() / 1000),
            dom = document;

        switch (jsonData.cat) {
            case 9:
                this.toast({memo: '권한이 없습니다.'});
                break;
            case 1:
                for (let ia = 0, th = dt.length; ia < th; ++ia) {
                    const cid = dt[ia].getAttribute('data-idn');
                    if (jsonData.data.hasOwnProperty(cid)) {
                        const cList = dt[ia].children,
                            cItem = jsonData.data[cid],
                            isChannel = cItem[8] == 5 || cItem[8] == 7 ? true : false;
                        // 0 controlStat,1 relayIn,2 controlGain,3 rTime,4 temp,5 voltage,6 ampere,7 controlMode,8 measureType

                        cList[2].textContent = cItem[7] == 1 ? '자동' : '수동'; // 제어모드
                        cList[2].classList.toggle('safeText', cItem[7] == 1);
                        cList[6].textContent = cItem[5].toFixed(1); // 전압
                        cList[7].textContent = cItem[6].toFixed(1); // 전류
                        cList[8].textContent = cItem[4]; // 온도
                        if (isChannel) {
                            cList[11].textContent = cItem[1]; // relayIn
                            cList[12].textContent = cItem[2]; // gain
                        }
                        cList[14].textContent = cItem[3] != 0 ? this.echoDate('m.d h:i', cItem[3]) : '';
                        cList[14].classList.toggle('off', cItem[3] != 0 && cItem[3] < nowTime - 30);
                        this._control[cid].rTime = cItem[3];

                        const isControl = cItem[0];
                        if (this._control[cid].stat != isControl) {
                            if (dom.getElementById('cid' + cid)) {
                                const dtCon = dom.getElementById('cid' + cid);
                                if (this._control[cid].time < nowTime) {
                                    dtCon.textContent = isControl ? '제어중' : '미제어';
                                    dtCon.classList.toggle('tMark', isControl);
                                    dtCon.classList.remove('rotate');
                                    this._control[cid].stat = isControl;
                                } else {
                                    dtCon.textContent = '';
                                    dtCon.classList.add('rotate');
                                }
                            }
                        } else {
                            const dtCon = dom.getElementById('cid' + cid);
                            dtCon.textContent = isControl ? '제어중' : '미제어';
                            dtCon.classList.toggle('tMark', isControl);
                            dtCon.classList.remove('rotate');
                        }
                    }
                }
                break;
            default:
                this.toast({memo: '데이터가 존재하지 않습니다.'});
        }
    }
};

// 10초 후에 다시 제어 요청 가능
vio.controlRequest = async function(j) {
    const ta = this._control[j],
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
        this.netAble(true);
        ta.time = nowTime + 10;

        const res = await fetch(`api/controls/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"control","cid":${j},"authName":"${this._firmName}"}`
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
                    ta.stat = ta.stat ? 0 : 1;
                    const dt = document.getElementById('cid' + j);
                    dt.textContent = '';
                    dt.classList.add('rotate');
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 제어모드 자동/수동 토글처리
vio.setMode = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        let res = await fetch(`api/gateway/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"setMode","idn":${j},"firmName":"${this._firmName}"}`
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
                    //this.toast({memo:'변경 되었습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 설비 설정값을 저장하기위해 전송한다
// 피크출력값 조정하면 저장도 한다
vio.controlSet = async function() {
    const type = document.getElementById('edit-controlType').value,
        gain = document.getElementById('edit-controlGain').value;

    if (!this._sheet.idn) {
        this.toast({memo: '수정상태일때 사용이 가능합니다.'});
    } else if (type == '0') {
        this.toast({memo: '설정타입 선택이 필요합니다.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        let res = await fetch(`api/controls/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"set","cid":${this._sheet.idn},"type":${type},"gain":${gain},"firmName":"${this._firmName}"}`
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
                case 5:
                    this.toast({memo: '요청응답 대기중 입니다.'});
                    break;
                case 1:
                    if (type == 5 || type == 6) {
                        // 출력값 설정이면 목록 수정
                        document.getElementById('cid' + this._sheet.idn).parentElement.parentElement.children[12].textContent = gain;
                    }
                    this.toast({memo: '설정값 적용 요청을 하였습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }

        res = await fetch(`api/gateway/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"set","cid":${this._sheet.idn},"gain":${gain}}`
        });
        await res.json();
    }
};


// 제어그룹과 관리그룹 정보
vio.getGroup = async function(j) {
    const res = await fetch(`api/sect/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: `{"cf":"group","cp":"${j.fid}"}`
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
                // 관리그룹
                let out = '<option value="0">선택</option>';
                for (let ia = 0, th = jsonData.dataPart.length; ia < th; ++ia) {
                    const ta = jsonData.dataPart[ia];
                    out += `<option value="${ta.partIdn}" ${ta.partIdn == j.partIdn ? 'selected' : ''}>${ta.partName}</option>`;
                }
                document.getElementById('edit-partIdn').innerHTML = out;

                // 제어그룹
                out = '<option value="0">선택</option>';
                for (let ia = 0, th = jsonData.dataStay.length; ia < th; ++ia) {
                    const ta = jsonData.dataStay[ia];
                    out += `<option value="${ta.stayIdn}" ${ta.stayIdn == j.stayIdn ? 'selected' : ''}>${ta.stayName}</option>`;
                }
                document.getElementById('edit-stayIdn').innerHTML = out;
                break;
            default:
                this.toast({memo: '데이터가 존재하지 않습니다.'});
        }
    }
};

// 그룹설정 창을 준비
vio.groupEditPop = function(j) {
    if (document.getElementById('edit-fid').value != 0) {
        this._groupType = j;

        let out = '',
            dt = document.getElementById(`edit-${j}Idn`).options;
        for (let ia = 0; ia < dt.length; ++ia) {
            if (dt[ia].value == 0) {
                continue;
            }
            out += `
            <div class="group" onclick="vio.groupSet({idn:${dt[ia].value},dt:this})">
                <span>${dt[ia].label}</span>
                <i class="icon iconDrop" onclick="vio.groupDrop({idn:${dt[ia].value},dt:this})"></i>
            </div>`;
        }
        document.getElementById('editExtendItem').innerHTML = out;
        document.getElementById('modalItem').classList.remove('disable');
    } else {
        this.toast({memo: '업체를 먼저 선택하세요.'});
    }
};

// 그룹설정
vio.groupSet = function(j) {
    if (this._groupIdn == j.idn) {
        this._groupIdn = 0;
        this._groupTmp = null;
        document.getElementById('edit-whatever').value = '';
        document.getElementById('modalItemAct').textContent = '등록';
    } else {
        this._groupIdn = j.idn;
        this._groupTmp = j.dt;
        document.getElementById('edit-whatever').value = j.dt.firstElementChild.textContent;
        document.getElementById('modalItemAct').textContent = '수정';
    }
};

// 그룹설정 저장
vio.groupEditFixed = async function() {
    const pd = {
        cf: this._groupType + (this._groupIdn ? 'Edit' : 'Add'),
        idn: this._groupIdn,
        groupName: document.getElementById('edit-whatever').value,
        fid: document.getElementById('edit-fid').value
    };

    if (!pd.groupName) {
        this.toast({memo: '그룹 이름을 입력하세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/sect/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(pd)
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
                    this.toast({memo: '확인 되었습니다.'});
                    document.getElementById('edit-whatever').value = '';
                    const dt = document.getElementById(`edit-${this._groupType}Idn`);
                    if (this._groupIdn == 0) {
                        dt.insertAdjacentHTML('beforeend',
                            `<option value="${jsonData.idn}">${pd.groupName}</option>`);
                        document.getElementById(`editExtendItem`).insertAdjacentHTML('beforeend',
                            `<div class="group" onclick="vio.groupSet({idn:${jsonData.idn},dt:this})">
                            <span>${pd.groupName}</span>
                            <i class="icon iconDrop" onclick="vio.groupDrop({idn:${jsonData.idn},dt:this})"></i>
                        </div>`);
                    } else {
                        this._groupTmp.firstElementChild.textContent = pd.groupName;
                        for (let ia = 0; ia < dt.length; ++ia) {
                            if (dt[ia].value == pd.idn) {
                                dt[ia].label = pd.groupName;
                                break;
                            }
                        }
                        this._groupIdn = 0;
                        document.getElementById('modalItemAct').textContent = '등록';
                    }
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};


// 그룹삭제
vio.groupDropFixed = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const idn = this._sheet.dropItem.idn,
            res = await fetch(`api/sect/${this._fid}`, {
                method: 'POST',
                headers: {
                    'Authorization': `x-auth ${vio._accessToken}`,
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: `{"cf":"${this._groupType}Drop","idn":${idn},"fid":${document.getElementById('edit-fid').value}}`
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
                    if (this._groupIdn == idn) {
                        this._groupIdn = 0;
                        document.getElementById('edit-whatever').value = '';
                    }
                    const dt = document.getElementById(`edit-${this._groupType}Idn`);
                    for (let ia = 0; ia < dt.length; ++ia) {
                        if (dt[ia].value == idn) {
                            dt[ia].remove();
                            break;
                        }
                    }
                    this._sheet.dropItem.dt.parentElement.remove();
                    this._sheet.dropItem = null;
                    this.toast({memo: '삭제 되었습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.groupDrop = function(j) {
    this._sheet.dropItem = j;
    this.dialog({
        act: 'open',
        tag: 'groupDropFixed',
        memo: `그룹 "${j.dt.previousElementSibling.textContent}"을 삭제하시겠습니까?<br/>되돌릴 수 없습니다.`
    });
};


// 전체제어모드 변경
vio.changeModeSwitch = async function () {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/gateway/${this._fid}`, {
                method: 'POST',
                headers: {
                    'Authorization': `x-auth ${vio._accessToken}`,
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: `{"cf":"changeModeSwitch","fid":${document.getElementById('edit-fid').value}}`
            });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);
            switch (jsonData.cat) {
                case 9:
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    break;
                default:
                    this.toast({ memo: '실행할 수 있는 데이터가 없습니다.' });
            }
        }
    }
};

vio.deskReady = function() {
    const dom = document;

    let dt = null,
        thisVip = null,
        out = '',
        _firm = {};

    for (let i = 0; i < this._members.length; i++) {
        const item = this._members[i];
        const isSelected = this._fid == item.fid;
        out += `<option value="${item.fid}" ${isSelected ? 'selected' : ''}>${item.name}</option>`;
    }

    // 에디터용
    dt = dom.getElementById('edit-fid');
    dt.insertAdjacentHTML('beforeend', out);
    dt.addEventListener('change', async function() {
        vio.getNode({fid: this.value, pid: 0, pidpw: 0});
        vio.getGroup({fid: this.value, partIdn: 0, stayIdn: 0});
    });

    out = '';
    for (let key in this._measureType) {
        out += `<option value="${key}">${this._measureType[key]}</option>`;
    }
    dom.getElementById('edit-measureType').innerHTML = out;

    out = '';
    for (let key in this._controlType) {
        out += `<option value="${key}">${this._controlType[key]}</option>`;
    }
    dom.getElementById('edit-controlType').innerHTML = out;

    out = '';
    for (let key in this._controlAddress) {
        out += `<option value="${key}">${this._controlAddress[key]}</option>`;
    }
    dom.getElementById('edit-controlAddress').innerHTML = out;

    // 데스크 기능
    this._sheet.sortTag = 'controlName';
    this._sheet.sortAsc = 1;

    dt = dom.getElementById('deskSort').children;
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        const ta = dt[ia];
        if (ta.getAttribute('data-sort')) {
            ta.addEventListener('click', function() {
                const _sheet = vio._sheet;
                if (_sheet.sortTag != this.getAttribute('data-sort')) {
                    this.parentElement.querySelector(`[data-sort="${_sheet.sortTag}"]`).classList.remove(vio._sheet.sortAsc ? 'asc' : 'desc');
                } else {
                    _sheet.sortAsc = _sheet.sortAsc ? 0 : 1;
                }
                _sheet.sortTag = this.getAttribute('data-sort');
                this.classList.toggle('asc', _sheet.sortAsc);
                this.classList.toggle('desc', !_sheet.sortAsc);
                vio.getData(1);
            });
        }
    }

    dom.getElementById('actGear').addEventListener('click', function() {
        vio.controlSet();
    });

    dt = dom.getElementById('deskInput');
    dt.addEventListener('keyup', function() {
        if (event.keyCode == 13 && this.value.trim().length >= 2) {
            vio.getData(1);
        }
    });
    dt.nextElementSibling.addEventListener('click', function() {
        if (this.previousElementSibling.value.trim().length >= 2) {
            vio.getData(1);
        } else {
            vio.toast({memo: '검색어는 두글자 이상 입력해주세요.'});
        }
    });

    dt = dom.getElementById('deskTool').children;
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        const ta = dt[ia];
        switch (ta.getAttribute('data-act')) {
            case 'refresh':
                ta.addEventListener('click', function() {
                    location.reload();
                });
                break;
            case 'add':
                ta.addEventListener('click', function() {
                    vio._sheet.idn = 0;
                    vio.deskEditPop({});
                });
                break;
            case 'excel':
                ta.addEventListener('click', function() {
                    let workbook = XLSX.utils.table_to_book(document.getElementById('deskTable')),
                        ws = workbook.Sheets['Sheet1'];
                    XLSX.writeFile(workbook, '게이트웨이제어.xlsx');
                });
                break;
            case 'print':
                ta.addEventListener('click', function() {
                    const nWindow = window.open('', 'print');
                    nWindow.document.body.innerHTML = document.getElementById('deskTable').outerHTML;
                    nWindow.print();
                    nWindow.close();
                });
                break;
            case 'switch':
                ta.addEventListener('click', function () {
                    vio.changeModeSwitch();
                });
                break;
        }
    }

    dom.getElementById('modalActClose').addEventListener('click', function() {
        document.getElementById('modal').classList.add('disable');
    });
    dom.getElementById('modalActCancel').addEventListener('click', function() {
        document.getElementById('modal').classList.add('disable');
    });
    dom.getElementById('modalActDone').addEventListener('click', async function() {
        vio.deskEditFixed();
    });

    // 그룹설정
    dom.getElementById('actGroupPart').addEventListener('click', function() {
        vio.groupEditPop('part');
    });
    dom.getElementById('actGroupStay').addEventListener('click', function() {
        vio.groupEditPop('stay');
    });
    dom.getElementById('modalItemAct').addEventListener('click', function() {
        vio.groupEditFixed();
    });
    dom.getElementById('modalItemActClose').addEventListener('click', function() {
        document.getElementById('modalItem').classList.add('disable');
    });

    this.getGroup({fid: this._fid, partIdn: 0, stayIdn: 0});
    this.getData(1);
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.deskReady();

    // 컨트롤 현재수치
    setInterval(function() {
        vio.syncRelay();
    }, 2000);
});
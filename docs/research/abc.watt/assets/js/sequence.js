'use strict';

vio._firmName = localStorage.getItem('firmName') ?? '';
vio._firm = {};
vio._control = {};
vio._controlStatText = ['미제어', '제어중', '시퀀스ON 진행중', '시퀀스OFF 진행중'];

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
            limitTime: dom.getElementById('edit-limitTime').value,
            restTime: dom.getElementById('edit-restTime').value,
            pid: dom.getElementById('edit-pid').value,
            stayIdn: dom.getElementById('edit-stayIdn').value,
            mapIdn: dom.getElementById('edit-mapIdn').value,
            itemType: dom.getElementById('edit-itemType').value,
            mapXY: dom.getElementById('edit-mapXY').value,
            memo: dom.getElementById('edit-memo').value,
            sequence: [],
            authName: this._firmName
        };

    // 시퀀스제어기기
    let dtc = dom.getElementById('edit-controllList').children,
        dtcLen = dtc.length,
        ia = 0;
    while (ia < dtcLen) {
        pd.sequence.push({
            cid: dtc[ia].getAttribute('data-addCid'),
            seqOn: dtc[ia + 1].value,
            waitOn: dtc[ia + 2].value,
            seqOff: dtc[ia + 3].value,
            waitOff: dtc[ia + 4].value,
            isFix: dtc[ia + 5].value
        });
        ia += 7;
    }

    if (pd.fid == false) {
        this.toast({memo: '업체를 선택하세요.'});
    } else if (!pd.controlName) {
        this.toast({memo: '제어이름을 입력하세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/sequence/${this._fid}`, {
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
    this._sheet.idn = j.sid || 0;
    dom.getElementById('edit-fid').value = j.fid || 0;
    dom.getElementById('edit-controlName').value = j.controlName || '';
    dom.getElementById('edit-controlMode').value = j.controlMode || 0;
    dom.getElementById('edit-controlPriority').value = j.controlPriority || 0;
    dom.getElementById('edit-limitTime').value = j.limitTime || 0;
    dom.getElementById('edit-restTime').value = j.restTime || 0;
    dom.getElementById('edit-pid').value = j.pid || 0;
    dom.getElementById('edit-stayIdn').value = j.stayIdn || 0;
    dom.getElementById('edit-mapIdn').value = j.mapIdn || 0;
    dom.getElementById('edit-itemType').value = j.itemType || 0;
    dom.getElementById('edit-mapXY').value = j.mapXY || '0,0';
    dom.getElementById('edit-memo').value = j.memo || '';

    // 시퀀스제어기기
    let out = '';
    if (j.hasOwnProperty('sequence')) {
        for (let ia = 0; ia < j.sequence.length; ++ia) {
            const ta = j.sequence[ia];
            out += `
                <span data-addCid="${ta.cid}">${ta.controlName}</span>
                <input type="number" class="eInput eInputTiny" step="1" min="0" max="100" value="${ta.seqOn}"/>
                <input type="number" class="eInput eInputTiny" step="1" min="0" max="250" value="${ta.waitOn}"/>
                <input type="number" class="eInput eInputTiny" step="1" min="0" max="100" value="${ta.seqOff}"/>
                <input type="number" class="eInput eInputTiny" step="1" min="0" max="250" value="${ta.waitOff}"/>
                <select class="eSelect">
                    <option value="0">선택</option>
                    <option value="1" ${ta.isFix == 1 ? 'selected' : ''}>On</option>
                    <option value="2" ${ta.isFix == 2 ? 'selected' : ''}>Off</option>
                </select>
                <i class="icon iconReset" onclick="vio.dropControl(this)"></i>`;

        }
    } else {
        console.log(0);
    }
    dom.getElementById('edit-controllList').innerHTML = out;

    dom.getElementById('modal').classList.remove('disable');
    if (dom.getElementById('edit-fid').value == 0) {
        // 선택된 계정이 없으면 현재 계정으로
        dom.getElementById('edit-fid').value = this._fid;
    }

    // 도면정보
    this.structureSelected(j.mapIdn || 0);
};

vio.deskItem = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        this._sheet.idn = j.parentElement.getAttribute('data-idn');
        const res = await fetch(`api/sequence/${this._fid}`, {
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
                    this.getControl({fid: jsonData.data.fid});
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

        const res = await fetch(`api/sequence/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"drop","idn":"${this._sheet.dropItem.getAttribute('data-idn')}","authName":"${this._firmName}"}`
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
        const ta = j[ia];
        out += `
        <tr data-idn="${ta.sid}">
            <td class="editAct">${this.catToXLSX(this._firmName)}<i class="icon iconEdit" onclick="vio.deskItem(this.parentElement)"></i></td>
            <td class="textAct" onclick="vio.deskItem(this)">${this.catToXLSX(ta.controlName)}</td>
            <td class="tAct ${ta.controlMode == 1 ? 'safeText' : ''}" onclick="vio.setMode(${ta.sid})" title="제어모드 자동/수동 전환">${ta.controlMode == 1 ? '자동' : '수동'}</td>
            <td>${ta.controlPriority}</td>
            <td><span class="tAct" onclick="vio.controlSeqRequest(${ta.sid})" title="시퀀스제어 요청">제어</span></td>
            <td>${this._controlStatText[ta.controlStat]}</td>
            <td>${ta.isConn == 1 ? '제어가능' : '제어불가능'}</td>
            <td>0.0</td>
            <td>0.0</td>
            <td class="editAct">${this.catToXLSX(ta.memo)}<i class="icon iconDrop" onclick="vio.deskDrop(this)"></i></td>
        </tr>`;
        if (!this._control.hasOwnProperty(ta.sid)) {
            this._control[ta.sid] = {isConn: ta.isConn, stat: ta.controlStat};
        }
        this._control[ta.sid].isConn = ta.isConn;
        this._control[ta.sid].stat = ta.controlStat;

    }
    document.getElementById('deskList').innerHTML = out;
};

// 시퀀스 제어목록
vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/sequence/${this._fid}`, {
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

// 시퀀스 제어 설정에서 사용할 제어설비목록을 가져온다
vio.getControl = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/sequence/${this._fid}`, {
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

            this.netAble(false);
            switch (jsonData.cat) {
                case 9:
                    this.toast({memo: '권한이 없습니다.'});
                    break;
                case 1:
                    let out = '<option value="0">제어기선택 추가</option>';
                    for (let ia = 0, th = jsonData.data.length; ia < th; ++ia) {
                        const ta = jsonData.data[ia];
                        out += `<option value="${ta.cid}">${ta.controlName}</option>`;
                    }
                    document.getElementById('edit-cidAdd').innerHTML = out;
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 제어설비 제거
vio.dropControl = function(j) {
    for (let ia = 0; ia < 6; ++ia) {
        j.previousElementSibling.remove();
    }
    j.remove();
};

// 시퀀스 제어목록의 상태정보를 실시간으로 변경
vio.syncRelay = async function() {
    const dt = document.getElementById('deskList').children;
    let ts = '0';
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        ts += ',' + dt[ia].getAttribute('data-idn');
    }

    const res = await fetch(`api/sequence/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: `{"cf":"relay","sid":"${ts}"}`
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
                    const sid = dt[ia].getAttribute('data-idn');
                    if (jsonData.data.hasOwnProperty(sid)) {
                        const cList = dt[ia].children,
                            cItem = jsonData.data[sid];

                        cList[2].textContent = cItem[2] == 1 ? '자동' : '수동'; // 제어모드
                        cList[2].classList.toggle('safeText', cItem[2] == 1);
                        cList[5].textContent = this._controlStatText[cItem[1]];
                        cList[5].classList.toggle('mark', cItem[1] == 1);

                        if (cItem[0] == 1) {
                            cList[6].textContent = '제어가능';
                            cList[6].classList.remove('off');
                        } else {
                            cList[6].textContent = '제어불가능';
                            cList[6].classList.add('off');
                        }
                        cList[7].textContent = cItem[3].toFixed(1); // 전압
                        cList[8].textContent = cItem[4].toFixed(1); // 전류
                    }
                }
                break;
            default:
                this.toast({memo: '데이터가 존재하지 않습니다.'});
        }
    }
};


// 시퀀스제어 설비의 제어모드를 수동/자동 으로 변경
vio.setMode = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        let res = await fetch(`api/sequence/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"setMode","idn":${j},"authName":"${this._firmName}"}`
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

// 시퀀스제어 요청
vio.controlSeqRequest = async function(j) {
    const ta = this._control[j],
        nowTime = Math.floor(Date.now() / 1000);

    if (ta.isConn == 0) {
        this.toast({memo: '제어가능 상태가 아닙니다.'});
    } else if (ta.stat >= 2) {
        this.toast({memo: '현재 시퀀스진행중입니다.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/controls/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"seq","sid":${j}}`
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
                case 4:
                    this.toast({memo: '소유권한이 없습니다.'});
                    break;
                case 3:
                    this.toast({memo: '제어가능 상태가 아닙니다.'});
                    break;
                case 1:
                    this.toast({memo: '시퀀스제어 요청되었습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 시퀀스 설비의 전체를 제어모드 수동/자동으로 변경
vio.controlModeFixed = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        let res = await fetch(`api/sequence/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"setModeAll","authName":"${this._firmName}"}`
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
                    this.toast({memo: '적용 되었습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 시퀀스 설비 전체를 OFF 요청
vio.controlOffFixed = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        let res = await fetch(`api/sequence/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"setOffAll","authName":"${this._firmName}"}`
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
                    this.toast({memo: '적용 되었습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 시퀀스 설비 전체를 ON 요청
vio.controlOnFixed = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        let res = await fetch(`api/sequence/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"setOnAll","authName":"${this._firmName}"}`
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
                    this.toast({memo: '적용 되었습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 업체의 온도계측기, 전력계측기 목록을 선택할 수 있도록 해준다
vio.getModbus = async function(j) {
    const res = await fetch(`api/sequence/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: `{"cf":"device","cp":"${j.fid}"}`
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
                // 온도 계측기, 전력계측기
                let out = '<option value="0" data-device="0">계측 선택</option>';
                let outTemp = '<option value="0">계측 선택</option>';
                for (let ia = 0, th = jsonData.device.length; ia < th; ++ia) {
                    const ta = jsonData.device[ia];
                    if (ta.md_id == 5) {
                        outTemp += `<option value="${ta.pid}" ${ta.pid == j.pid ? 'selected' : ''}>${ta.lp_name}</option>`;
                    } else {
                        out += `<option value="${ta.pid}" ${ta.pid == j.pidTemp ? 'selected' : ''} data-device="${ta.md_id}">${ta.lp_name}</option>`;
                    }
                }
                //document.getElementById('edit-pidTemp').innerHTML =outTemp;
                document.getElementById('edit-pid').innerHTML = out;
                break;
            default:
                this.toast({memo: '데이터가 존재하지 않습니다.'});
        }
    }
};

// 시퀀스 설비의 그룹을 지정할 수 있도록 그룹정보를 가져온다
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
                // 제어그룹
                let out = '<option value="0">선택</option>';
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


vio.groupEditPop = function(j) {
    if (this._fid != 0) {
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

vio.groupEditFixed = async function() {
    const pd = {
        cf: this._groupType + (this._groupIdn ? 'Edit' : 'Add'),
        idn: this._groupIdn,
        groupName: document.getElementById('edit-whatever').value,
        fid: this._fid
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
                body: `{"cf":"${this._groupType}Drop","idn":${idn},"fid":${this._fid}}`
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


// 업체에 해당하는 도면을 구성
vio.getStructure = async function(mapIdn) {
    const res = await fetch(`api/sequence/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: `{"cf":"mapGet","fid":"${this._fid}"}`
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
                // 도면 파일정보
                this._structureFile = {};
                // 도면관리그룹
                let out = '<option value="0">선택</option>';
                for (let ia = 0, th = jsonData.data.length; ia < th; ++ia) {
                    const ta = jsonData.data[ia];
                    out += `<option value="${ta.idn}" ${ta.idn == mapIdn ? 'selected' : ''}>${ta.floorName}</option>`;
                    this._structureFile[ta.idn] = {
                        floorName: ta.floorName,
                        floorFile: ta.floorFile ? `floor/${ta.floorFile}${ta.fid}.png` : ''
                    };
                }
                document.getElementById('edit-mapIdn').innerHTML = out;
                document.getElementById('edit-mapIdn').value = mapIdn;
                this.structureSelected(mapIdn);
                break;
            default:
                this.toast({memo: '데이터가 존재하지 않습니다.'});
        }
    }
};

vio.structureEditPop = function() {
    let out = '',
        dt = document.getElementById(`edit-mapIdn`).options;
    for (let ia = 0; ia < dt.length; ++ia) {
        if (dt[ia].value == 0) {
            continue;
        }
        out += `
        <div class="group" onclick="vio.structureSet({idn:${dt[ia].value},dt:this})">
            <span>${dt[ia].label}</span>
            <i class="icon iconDrop" onclick="vio.structureDrop({idn:${dt[ia].value},dt:this})"></i>
        </div>`;
    }
    document.getElementById('editExtendItem').innerHTML = out;
    document.getElementById('modalMap').classList.remove('disable');
    this._readyFileReader = false;
    this._structureIdn = 0;
};

// 도면을 수정하거나 등록할 수 있도록 설정
vio.structureSet = function(j) {
    if (this._structureIdn == j.idn) {
        this._structureIdn = 0;
        this._structureTmp = null;
        document.getElementById('edit-floorName').value = '';
        document.getElementById('modalMapAct').textContent = '등록';
        document.getElementById('edit-mapLink').textContent = '';
    } else {
        this._structureIdn = j.idn;
        this._structureTmp = j.dt;
        document.getElementById('edit-floorName').value = j.dt.firstElementChild.textContent;
        document.getElementById('modalMapAct').textContent = '수정';

        let floorFile = '';
        if (this._structureFile.hasOwnProperty(j.idn) && this._structureFile[j.idn].floorFile) {
            floorFile = this._structureFile[j.idn].floorFile;
        }
        document.getElementById('edit-mapLink').textContent = '';
        document.getElementById('edit-mapLink').setAttribute('href', floorFile);
    }
};

// 도면을 저장
vio.structureEditFixed = async function() {
    const pd = {
        cf: this._structureIdn ? 'mapEdit' : 'mapAdd',
        idn: this._structureIdn,
        floorName: document.getElementById('edit-floorName').value,
        fid: this._fid,
        png: ''
    };

    if (!pd.floorName) {
        this.toast({memo: '도면 이름을 입력하세요.'});
    } else if (pd.idn == 0 && !this._readyFileReader) {
        this.toast({memo: '도면파일을 등록하세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        if (this._readyFileReader) {
            pd.png = this._fileReader.result
        }

        const res = await fetch(`api/sequence/${this._fid}`, {
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
                    this.toast({memo: '처리완료 되었습니다.'});
                    document.getElementById('edit-floorName').value = '';
                    const dt = document.getElementById(`edit-mapIdn`);
                    if (this._structureIdn == 0) {
                        dt.insertAdjacentHTML('beforeend',
                            `<option value="${jsonData.idn}">${pd.floorName}</option>`);
                        document.getElementById(`editExtendItem`).insertAdjacentHTML('beforeend',
                            `<div class="group" onclick="vio.structureSet({idn:${jsonData.idn},dt:this})">
                            <span>${pd.floorName}</span>
                            <i class="icon iconDrop" onclick="vio.structureDrop({idn:${jsonData.idn},dt:this})"></i>
                        </div>`);
                    } else {
                        this._structureTmp.firstElementChild.textContent = pd.floorName;
                        for (let ia = 0; ia < dt.length; ++ia) {
                            if (dt[ia].value == pd.idn) {
                                dt[ia].label = pd.floorName;
                                break;
                            }
                        }
                        this._structureIdn = 0;
                        document.getElementById('modalMapAct').textContent = '등록';
                    }

                    if (jsonData.floorFile) {
                        if (this._structureFile.hasOwnProperty(jsonData.idn)) {
                            this._structureFile[jsonData.idn].floorFile = `floor/${jsonData.floorFile}${this._fid}.png`;
                        } else {
                            this._structureFile[jsonData.idn] = {
                                floorName: jsonData.floorName,
                                floorFile: `floor/${jsonData.floorFile}${this._fid}.png`
                            };
                        }
                    }
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 도면을 삭제
vio.structureDropFixed = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const idn = this._sheet.dropItem.idn,
            res = await fetch(`api/sequence/${this._fid}`, {
                method: 'POST',
                headers: {
                    'Authorization': `x-auth ${vio._accessToken}`,
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: `{"cf":"mapDrop","idn":${idn},"fid":${this._fid}}`
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
                    if (this._structureIdn == idn) {
                        this._structureIdn = 0;
                        document.getElementById('edit-floorName').value = '';
                    }
                    const dt = document.getElementById(`edit-mapIdn`);
                    for (let ia = 0; ia < dt.length; ++ia) {
                        if (dt[ia].value == idn) {
                            dt[ia].remove();
                            break;
                        }
                    }
                    delete this._structureFile[jsonData.idn];
                    this._sheet.dropItem.dt.parentElement.remove();
                    this._sheet.dropItem = null;
                    document.getElementById('edit-mapLink').textContent = '';
                    this.toast({memo: '삭제 되었습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 도면선택하면 도면이미지 출력
vio.structureSelected = function(val) {
    if (val != 0 && vio._structureFile[val]) {
        document.getElementById('edit-mapAreaImage').src = vio._structureFile[val].floorFile;
        document.getElementById('edit-mapArea').classList.remove('disable');
    } else {
        document.getElementById('edit-mapArea').classList.add('disable');
        document.getElementById('edit-mapXY').value = '0,0';
    }
};

vio.structureDrop = function(j) {
    this._sheet.dropItem = j;
    this.dialog({
        act: 'open',
        tag: 'structureDropFixed',
        memo: `그룹 "${j.dt.previousElementSibling.textContent}"을 삭제하시겠습니까?<br/>되돌릴 수 없습니다.`
    });
};
vio.deskReady = function() {
    const dom = document;

    let dt = null,
        thisVip = null,
        out = '',
        _firm = {};

    // 에디터용
    out = `<option value="${this._fid}">${this._firmName}</option>`;
    dt = dom.getElementById('edit-fid');
    dt.insertAdjacentHTML('beforeend', out);
    dt.addEventListener('change', async function() {
        vio.getControl({fid: this.value});
        // 도면목록
        vio.getStructure(0);
        // 계측기목록
        vio.getModbus({fid: this.value, pid: 0, pidTemp: 0});
    });

    dom.getElementById('edit-cidAdd').addEventListener('change', function() {
        if (this.value == 0) {
            return;
        }

        let dt = dom.getElementById('edit-controllList'),
            item = `
                <span data-addCid="${this.value}">${this.children[this.selectedIndex].textContent}</span>
                <input type="number" class="eInput eInputTiny" step="1" min="0" max="100"/>
                <input type="number" class="eInput eInputTiny" step="1" min="0" max="250"/>
                <input type="number" class="eInput eInputTiny" step="1" min="0" max="100"/>
                <input type="number" class="eInput eInputTiny" step="1" min="0" max="250"/>
                <select class="eSelect">
                    <option value="0">선택</option>
                    <option value="1">On</option>
                    <option value="2">Off</option>
                </select>
                <span></span>`;
        dt.insertAdjacentHTML('beforeend', item);
    });

    // 데스크 기능
    this._sheet.sortTag = 'controlName';
    this._sheet.sortAsc = 0;

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
                    vio.getControl({fid:vio._fid});
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
            case 'mode':
                ta.addEventListener('click', function() {
                    vio.dialog({act: 'open', tag: 'controlModeFixed', memo: '제어모드를 변경 하시겠습니까?'});
                });
                break;
            case 'off':
                ta.addEventListener('click', function() {
                    vio.dialog({act: 'open', tag: 'controlOffFixed', memo: '시퀀스 제어를 전체OFF 하시겠습니까?'});
                });
                break;
            case 'on':
                ta.addEventListener('click', function() {
                    vio.dialog({act: 'open', tag: 'controlOnFixed', memo: '시퀀스 제어를 전체ON 하시겠습니까?'});
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
    dom.getElementById('actGroupStay').addEventListener('click', function() {
        vio.groupEditPop('stay');
    });
    dom.getElementById('modalItemAct').addEventListener('click', function() {
        vio.groupEditFixed();
    });
    dom.getElementById('modalItemActClose').addEventListener('click', function() {
        document.getElementById('modalItem').classList.add('disable');
    });

    // 도면그룹설정
    dom.getElementById('actStructure').addEventListener('click', function() {
        vio.structureEditPop();
    });
    dom.getElementById('edit-mapIdn').addEventListener('change', function() {
        // 도면선택하면 도면이미지 출력
        vio.structureSelected(this.value);
    });
    dom.getElementById('edit-mapAreaImage').addEventListener('load', function() {
        // 도면이미지 비율
        vio._mapRatioToNatural = this.naturalWidth / this.offsetWidth;
        vio._mapRatioToOffset = this.offsetWidth / this.naturalWidth;

        const xy = document.getElementById('edit-mapXY').value.split(',');

        const x = Math.floor(vio._mapRatioToOffset * xy[0] - vio._mapRatioToOffset * 4),
            y = Math.floor(vio._mapRatioToOffset * xy[1] - vio._mapRatioToOffset * 4);

        const dt = document.getElementById('edit-mapAreaPoint');
        dt.setAttribute('style', `left:${x}px;top:${y}px`);
        dt.setAttribute('data-point', `좌표 ${xy[0]},${xy[1]}`);
    });
    dom.getElementById('edit-mapAreaImage').addEventListener('click', function(event) {
        // 도면위에 클릭하면 포인트 표시
        const x = Math.floor(vio._mapRatioToNatural * event.offsetX),
            y = Math.floor(vio._mapRatioToNatural * event.offsetY);
        document.getElementById('edit-mapXY').value = `${x},${y}`;

        const dt = document.getElementById('edit-mapAreaPoint');
        dt.setAttribute('style', `left:${event.offsetX - vio._mapRatioToOffset * 4}px;top:${event.offsetY - vio._mapRatioToOffset * 4}px`);
        dt.setAttribute('data-point', `좌표 ${x},${y}`);
        //console.log(`${event.offsetX}, ${event.offsetY}`);
    });
    dom.getElementById('edit-mapFile').addEventListener('change', function() {
        // 도면이미지 등록
        vio._readyFileReader = false;
        vio._fileReader = new FileReader();

        vio._fileReader.addEventListener('load', function() {
            const fileType = vio._fileReader.result.substr(0, 22);
            if (fileType != 'data:image/png;base64,') {
                vio.toast({memo: 'png 이미지 파일만 지원합니다.'});
            } else {
                vio._readyFileReader = true;
            }
        }, false);

        if (this.files[0]) {
            vio._fileReader.readAsDataURL(this.files[0]);
        }
    });
    dom.getElementById('modalMapAct').addEventListener('click', function() {
        vio.structureEditFixed();
    });
    dom.getElementById('modalMapActClose').addEventListener('click', function() {
        document.getElementById('modalMap').classList.add('disable');
    });

    // 도면목록
    this.getStructure(0);
    this.getModbus({fid: this._fid, pid: 0, pidTemp: 0});
    this.getGroup({fid: this._fid, stayIdn: 0});
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
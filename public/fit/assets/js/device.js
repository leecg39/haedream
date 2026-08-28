'use strict';

vio._firmName = localStorage.getItem('firmName') ?? '';

vio._supportType = {0: '', 31: 'ch1in', 32: 'ch2in', 102: '태양광'};
vio._thisItems = '';
vio._relayInfo = {};

vio.deskEditFixed = async function() {
    const dom = document,
        pd = {
            cf: this._sheet.idn ? 'edit' : 'add',
            idn: this._sheet.idn,
            pid: dom.getElementById('edit-pid').value,
            fid: dom.getElementById('edit-fid').value,
            lpName: dom.getElementById('edit-lpName').value,
            gid: dom.getElementById('edit-gid').value,
            vid: dom.getElementById('edit-vid').value,
            lpNumber: dom.getElementById('edit-lpNumber').value,
            md: dom.getElementById('edit-md').value,
            power: dom.getElementById('edit-power').value,
            voltage: dom.getElementById('edit-voltage').value,
            ampere: dom.getElementById('edit-ampere').value,
            lp_able: dom.getElementById('edit-lp_able').value,
            supportType: dom.getElementById('edit-supportType').value,
            supportDevice: dom.getElementById('edit-supportDevice').value,
            supportMin: dom.getElementById('edit-supportMin').value,
            supportMax: dom.getElementById('edit-supportMax').value,
            isOnlyAmpere: dom.getElementById('edit-isOnlyAmpere').value,
            isTransformer: dom.getElementById('edit-isTransformer').value,
            mapIdn: dom.getElementById('edit-mapIdn').value,
            mapXY: dom.getElementById('edit-mapXY').value,
            ptrans: dom.getElementById('edit-ptrans').value,
            ctrans: dom.getElementById('edit-ctrans').value,
            wattRated: dom.getElementById('edit-wattRated').value,
            memo: dom.getElementById('edit-memo').value
        };
    if (pd.fid == false) {
        this.toast({memo: '업체를 선택하세요.'});
    } else if (!pd.lpName) {
        this.toast({memo: '이름을 입력하세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/device/${this._fid}`, {
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
                case 3:
                    this.toast({memo: '중복된 lpID가 존재합니다.'});
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

    this._sheet.idn = j.pid || 0;
    dom.getElementById('edit-fid').value = j.fid || 0;
    dom.getElementById('edit-lpName').value = j.lp_name || '';
    dom.getElementById('edit-gid').value = j.gid || 0;
    dom.getElementById('edit-vid').value = j.vid || 0;
    dom.getElementById('edit-pid').value = j.pid || 0;
    dom.getElementById('edit-lpNumber').value = j.lp_number || 0;
    dom.getElementById('edit-md').value = j.md_id || 0;
    dom.getElementById('edit-power').value = j.power_correction || 1;
    dom.getElementById('edit-voltage').value = j.voltage_correction || 1;
    dom.getElementById('edit-ampere').value = j.ampere_correction || 1;
    dom.getElementById('edit-lp_able').value = j.lp_able || 0;
    dom.getElementById('edit-supportType').value = j.supportType || 0;
    dom.getElementById('edit-supportDevice').value = j.supportDevice || 0;
    dom.getElementById('edit-supportMin').value = j.supportMin || 0;
    dom.getElementById('edit-supportMax').value = j.supportMax || 0;
    dom.getElementById('edit-isOnlyAmpere').value = j.isOnlyAmpere || 0;
    dom.getElementById('edit-isTransformer').value = j.isTransformer || 0;
    dom.getElementById('edit-mapIdn').value = j.mapIdn || 0;
    dom.getElementById('edit-mapXY').value = j.mapXY || '0,0';
    dom.getElementById('edit-memo').value = j.memo || '';
    dom.getElementById('edit-ptrans').value = j.ptrans || 0;
    dom.getElementById('edit-ctrans').value = j.ctrans || 0;
    dom.getElementById('edit-wattRated').value = j.wattRated || 0;

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
        const res = await fetch(`api/device/${this._fid}`, {
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
                    this.getSollae({fid: jsonData.data.fid, vid: jsonData.data.vid});
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

        const res = await fetch(`api/device/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"drop","idn":"${this._sheet.dropItem.getAttribute('data-idn')}"}`
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
    const ableTime = Math.floor(Date.now() / 1000) - 128;

    this._thisItems = '';
    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia];

        let deviceStat = '',
            deviceType = '',
            deviceVerify = '',
            verifyNum = 0;

        if (ta.lp_able == 0) {
            deviceStat = 'class="unable"';
        } else if (ta.lp_last < ableTime) {
            deviceStat = 'class="off"';
        }

        let memo = this.catToXLSX(ta.memo);
        if (ta.supportDevice && this._relayInfo.hasOwnProperty(ta.supportDevice)) {
            memo = `[${this._relayInfo[ta.supportDevice][ta.supportType]}] ${memo}`;
        }


        if (this._md[ta.md_id].part == 0) {
            deviceType = 'power';
            deviceVerify = ta.wattCalc;
            if (ta.lp_watt == deviceVerify) {
                verifyNum = 99.9;
            } else if (ta.lp_watt == 0 || deviceVerify == 0) {
                verifyNum = 0.0;
            } else if (ta.lp_watt > deviceVerify) {
                verifyNum = 100 - (ta.lp_watt - deviceVerify) / ta.lp_watt * 100;
            } else {
                verifyNum = 100 - (deviceVerify - ta.lp_watt) / deviceVerify * 100;
            }
            if (verifyNum >= 99.9) {
                verifyNum = 99.9;
            }
            deviceVerify = `${(deviceVerify * 0.001).toFixed(2)} (${(verifyNum).toFixed(1)}%)`;
        }

        // 남전사 meterId 값으로 3/4선식 구분
        let namjunBadMeter = '';
        if(ta.meterId != 0 && (ta.md_id == 4 || ta.md_id == 6)){
            namjunBadMeter = `title="Meter ID : ${ta.meterId}"`;
            if(ta.md_id == 4 && ta.meterId < 3400000000){ // 3상4선식
                namjunBadMeter = `${namjunBadMeter} class="mask"`;
            }else if(ta.md_id == 6 && ta.meterId > 3400000000){ // 3상3선식
                namjunBadMeter = `${namjunBadMeter} class="mask"`;
            }
        }

        out += `
        <tr data-idn="${ta.pid}" ${deviceStat} data-device="${deviceType}">
            <td class="editAct">${ta.pid}<i class="icon iconEdit" onclick="vio.deskItem(this.parentElement)"></i></td>
            <td>${vio._firmName}</td>
            <td>${ta.gid}</td>
            <td>${ta.vid}</td>
            <td class="textAct" onclick="vio.deskItem(this)">${this.catToXLSX(ta.lp_name)}</td>
            <td>${ta.lp_number}</td>
            <td ${namjunBadMeter}>${this._md[ta.md_id].name}</td>
            <td ${ta.voltage_correction != 1 ? `class="mask" title="보정 x ${ta.voltage_correction}"` : ''}>${ta.lp_volt.toFixed(1)}</td>
            <td ${ta.ampere_correction != 1 ? `class="mask" title="보정 x ${ta.ampere_correction}"` : ''}>${ta.lp_apm.toFixed(1)}</td>
            <td ${ta.power_correction != 1 ? `class="mask" title="보정 x ${ta.power_correction}"` : ''}>${(ta.lp_watt * 0.001).toFixed(2)}</td>
            <td>${deviceVerify}</td>
            <td>${ta.lp_value1.toFixed(1)}</td>
            <td title="${this.echoDate('y.m.d', ta.lp_last)}">${ta.lp_last != 0 ? this.echoDate('m.d h:i:s', ta.lp_last) : ''}</td>
            <td>${this._supportType[ta.supportType]}</td>
            <td>${ta.supportDevice}</td>
            <td>${ta.supportMax != 0 ? `${ta.supportMin}~${ta.supportMax}` : ''}</td>
            <td class="editAct">${memo}<i class="icon iconDrop" onclick="vio.deskDrop(this)"></i></td>
        </tr>`;
        this._thisItems += `,${ta.pid}`;
    }
    document.getElementById('deskList').innerHTML = out;
};

vio.getData = async function(j) {
    const dom = document,
        deskInput = document.getElementById('deskInput'),
        isAll = dom.getElementById('isAll').checked ? 1 : 0,
        authIdn = localStorage.getItem('authIdn');

    if (!this._useNetworks) {
        this.netAble(true);

        let params = {
            cf: 'get',
            cp: this._fid,
            qs: deskInput.value,
            page: j,
            qt: this._sheet.sortTag,
            qa: this._sheet.sortAsc
        }

        if ((authIdn === '1' || authIdn === '486') && isAll) {
            params.isAll = 1;
        }

        const res = await fetch(`api/device/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(params)
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

                    //window.scrollTo(0, 0); // 스크롤 최상단 이동
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.getBase = async function() {
    const res = await fetch(`api/device/${this._fid}`, {
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
                // 릴레이용 정보
                const gate = {};

                for (let ia = 0, th = jsonData.control.length; ia < th; ++ia) {
                    const ta = jsonData.control[ia];
                    if (!gate.hasOwnProperty(ta.gid)) {
                        gate[ta.gid] = {};
                    }
                    if (!gate[ta.gid].hasOwnProperty(ta.nodeIndex)) {
                        gate[ta.gid][ta.nodeIndex] = {};
                    }
                    //gate[ta.gid][ta.nodeIndex][ta.measureType] =`${ta.cid}:${this.catToXLSX(ta.controlName)}`;
                    gate[ta.gid][ta.nodeIndex][ta.measureType] = this.catToXLSX(ta.controlName);
                }

                for (let ia = 0, th = jsonData.relay.length; ia < th; ++ia) {
                    const ta = jsonData.relay[ia];
                    if (!this._relayInfo.hasOwnProperty(ta.yid)) {
                        this._relayInfo[ta.yid] = {0: '', 31: '', 32: ''};
                    }

                    if (gate.hasOwnProperty(ta.gid) && gate[ta.gid].hasOwnProperty(ta.nodeIndex)) {
                        if (gate[ta.gid][ta.nodeIndex].hasOwnProperty(5)) {
                            this._relayInfo[ta.yid][31] = gate[ta.gid][ta.nodeIndex][5];
                        }
                        if (gate[ta.gid][ta.nodeIndex].hasOwnProperty(7)) {
                            this._relayInfo[ta.yid][32] = gate[ta.gid][ta.nodeIndex][7];
                        }
                    }
                }

                // 모드버스 리스트
                this.getData(1);
                break;
            default:
                this.toast({memo: '데이터가 존재하지 않습니다.'});
        }
    }
};

// 솔내시스템
vio.getSollae = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/device/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"sollae","cp":"${j.fid}"}`
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
                    let out = '<option value="0">선택</option>';
                    for (let ia = 0, th = jsonData.device.length; ia < th; ++ia) {
                        const ta = jsonData.device[ia];
                        out += `<option value="${ta.vid}" ${ta.vid == j.vid ? 'selected' : ''}>${ta.vpnName}:${ta.portNo}</option>`;
                    }
                    document.getElementById('edit-vid').innerHTML = out;
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 실시간 정보
vio.syncDevice = async function() {
    if (this._thisItems != '') {
        const res = await fetch(`api/device/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"stat","ids":"${this._thisItems.substr(1)}"}`
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
                    const ableTime = Math.floor(Date.now() / 1000) - 128;
                    const dt = document.getElementById('deskList').querySelectorAll('[data-idn]');

                    for (let ia = 0, th = dt.length; ia < th; ++ia) {
                        const idn = dt[ia].getAttribute('data-idn');
                        if (jsonData.data.hasOwnProperty(idn)) {
                            const child = dt[ia].children;
                            const ta = jsonData.data[idn];   // 전압,전류,전력,정보,날짜,채널,채널아이디

                            // 전력이 아닌 릴레이값을 측정정보 일때는 4 ~20mA 값을 전류에 출력해준다.
                            let maNo = '0.00';
                            if (ta[6]) {
                                maNo = jsonData.dataRelay[ta[6]][ta[5] == 32 ? 1 : 0].toFixed(1);
                            } else {
                                maNo = ta[1].toFixed(1);
                            }

                            let deviceVerify = '',
                                verifyNum = 0;
                            if (dt[ia].getAttribute('data-device') == 'power') {
                                // 계측기의 유효전력과 비교정보 전류 x 전압 x 역률(%) x √3
                                deviceVerify = ta[7];
                                if (ta[2] == deviceVerify) {
                                    verifyNum = 99.9;
                                } else if (ta[2] == 0 || deviceVerify == 0) {
                                    verifyNum = 0.0;
                                } else if (ta[2] > deviceVerify) {
                                    verifyNum = 100 - (ta[2] - deviceVerify) / ta[2] * 100;
                                } else {
                                    verifyNum = 100 - (deviceVerify - ta[2]) / deviceVerify * 100;
                                }
                                if (verifyNum >= 99.9) {
                                    verifyNum = 99.9;
                                }
                                deviceVerify = `${(deviceVerify * 0.001).toFixed(2)} (${(verifyNum).toFixed(1)}%)`;
                            }

                            if (dt[ia].getAttribute('class') != 'unable') {
                                dt[ia].classList.toggle('off', ta[4] < ableTime);
                            }
                            child[7].textContent = ta[0].toFixed(1);
                            child[8].textContent = maNo;
                            child[9].textContent = (ta[2] / 1000).toFixed(2);
                            child[10].textContent = deviceVerify;
                            child[11].textContent = ta[3].toFixed(1);
                            child[12].textContent = ta[4] ? this.echoDate('m.d h:i:s', ta[4]) : '';
                        }
                    }
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 업체에 해당하는 도면을 구성
vio.getStructure = async function(mapIdn) {
    const res = await fetch(`api/sequence/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: `{"cf":"mapGet","fid":"${document.getElementById('edit-fid').value}"}`
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
    const dom = document,
        authIdn = localStorage.getItem('authIdn');

    let dt = null;

    // 에디터용
    dom.getElementById('edit-fid').innerHTML = `<option value="${this._fid}">${this._firmName}</option>`;

    let out = '';
    for (let key in this._md) {
        out += `<option value="${key}">${this._md[key].name}</option>`;
    }
    dom.getElementById('edit-md').insertAdjacentHTML('beforeend', out);

    // 데스크 기능
    this._sheet.sortTag = 'lp_name';
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

    dt = dom.getElementById('isAll');
    dt.addEventListener('change', function() {
        vio.getData(1);
    });
    if (authIdn === '1' || authIdn === '486') {
        dom.getElementById('dayCk').classList.remove('disable');
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
                });
                break;
            case 'excel':
                ta.addEventListener('click', function() {
                    let workbook = XLSX.utils.table_to_book(document.getElementById('deskTable')),
                        ws = workbook.Sheets['Sheet1'];
                    XLSX.writeFile(workbook, '모드버스.xlsx');
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

    this.getBase(1);

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
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.deskReady();

    // 실시간 현재수치
    setInterval(function() {
        vio.syncDevice();
    }, 2000);
});

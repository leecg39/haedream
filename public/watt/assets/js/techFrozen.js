'use strict';

let gSetTimeout = null;

vio._airList = {},
vio._floorMapIdn = 0;
vio._floorMap = {};
vio._mapRatioToOffset = 1; // 도면위치 비율
vio._markIdn = 0; // 선택된 설비
vio._overIdn = 0; // 마우스 오버 설비
vio._openIdn = 0; // 팝업된 설비

vio.dataTrans = function(j) {
    let out = '',
        outPoint = '',
        markDefault = 0;

    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia];

        let statStyle = '',
            mapStyle = '',
            statText = '';

        if (ta.isConn == 0) {
            statText = '통신';
        } else if (ta.controlStat == 0) {
            statText = 'ON';
            statStyle = 'chipStart';
            mapStyle = 'mapStart';
        } else if (ta.controlStat == 2 || ta.controlStat == 3) {
            statText = '제어';
            statStyle = 'chipRequest';
            mapStyle = 'mapRequest';
        } else {
            statText = 'OFF';
            statStyle = 'chipStop';
            mapStyle = 'mapStop';
        }

        out += `
        <tr id="deskPoint${ta.sid}" data-idn="${ta.sid}" onclick="vio.markPointFixed(this.getAttribute('data-idn'))" onmouseover="vio.markPointOver(this.getAttribute('data-idn'))" onmouseout="vio.markPointOut(this.getAttribute('data-idn'))">
            <td><i class="icon iconGear" onclick="vio.controlPop(${ta.sid})"></i></td>
            <td>${ta.itemType == 2 ? '냉방' : '난방'}</td>
            <td class="mark">${ta.controlName}</td>
            <td><span class="chips ${statStyle}">${statText}</span></td>
            <td>0.0</td>
            <td>0.0</td>
            <td>${ta.controlMode == 1 ? '자동' : '수동'}</td>
            <td>${ta.controlPriority}</td>
        </tr>`;

        // 도면 위에 설비 포인트
        outPoint += `<span class="mapPoint ${mapStyle}" id="mapPoint${ta.sid}" data-idn="${ta.sid}" onclick="vio.markPointFixed(this.getAttribute('data-idn'))" onmouseover="vio.markPointOver(this.getAttribute('data-idn'))" onmouseout="vio.markPointOut(this.getAttribute('data-idn'))">
                <i class="mapIcon"></i>
            </span>`;

        this._airList[ta.sid] = {
            sid: ta.sid,
            x: ta.mapX,
            y: ta.mapY,
            isConn: ta.isConn,
            actTime: ta.actTime,
            controlStat: ta.controlStat,
            name: ta.controlName,
            controlPriority: ta.controlPriority // 제어순위 수정여부 확인용
        };

        // 기본 선택
        if (markDefault == 0) {
            markDefault = ta.sid;
        }
    }
    document.getElementById('deskList').innerHTML = out;
    document.getElementById('floorMapPoints').innerHTML = outPoint;
    this.setFloorImage();

    if (markDefault != 0) {
        this.markPointOver(markDefault);
    }

    if (out != '') {
        this.getStat();
    }
};

vio.getData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/tech-frozen/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"get","qt":"${this._sheet.sortTag}","qa":"${this._sheet.sortAsc}","map":${this._floorMapIdn},"isHot":${document.getElementById('deskType').classList.contains('active') ? 1 : 0}}`
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
                case 8:
                    document.getElementById('contentsArea').style.visibility = 'hidden';
                    this.toast({memo: '접근 권한이 없습니다.'});
                    break;
                case 1:
                    this._airList = {};
                    this._overIdn = 0;
                    this._markIdn = 0;
                    this.dataTrans(jsonData.data);
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.getStat = async function() {
    const res = await fetch(`api/tech-frozen/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: `{"cf":"stat","map":${this._floorMapIdn},"isHot":${document.getElementById('deskType').classList.contains('active') ? 1 : 0}}`
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        switch (jsonData.cat) {
            case 9:
                this.toast({memo: '권한이 없습니다.'});
                break;
            case 8:
                document.getElementById('contentsArea').style.visibility = 'hidden';
                this.toast({memo: '접근 권한이 없습니다.'});
                break;
            case 1:
                const dt = document.getElementById('deskList').children;
                for (let ia = 0, th = dt.length; ia < th; ++ia) {
                    const sid = dt[ia].getAttribute('data-idn'),
                        cList = dt[ia].children,
                        mapChip = document.getElementById(`mapPoint${sid}`),
                        cItem = jsonData.data[sid]; //controlStat, isConn, actTime

                    if (cItem[1] == 0) {
                        cList[3].firstElementChild.textContent = '통신';
                        cList[3].firstElementChild.setAttribute('class', 'chips');
                        mapChip.setAttribute('class', 'mapPoint');
                    } else if (cItem[0] == 0) {
                        cList[3].firstElementChild.textContent = 'ON';
                        cList[3].firstElementChild.setAttribute('class', 'chips chipStart');
                        mapChip.setAttribute('class', 'mapPoint mapStart');
                    } else if (cItem[0] == 2 || cItem[0] == 3) {
                        cList[3].firstElementChild.textContent = '제어';
                        cList[3].firstElementChild.setAttribute('class', 'chips chipRequest');
                        mapChip.setAttribute('class', 'mapPoint mapRequest');
                    } else {
                        cList[3].firstElementChild.textContent = 'OFF';
                        cList[3].firstElementChild.setAttribute('class', 'chips chipStop');
                        mapChip.setAttribute('class', 'mapPoint mapStop');
                    }
                    cList[6].textContent = cItem[3] == 1 ? '자동' : '수동'
                    cList[4].textContent = cItem[4].toFixed(1); // 전압
                    cList[5].textContent = cItem[5].toFixed(1); // 전류

                    this._airList[sid].actTime = cItem[2];
                    this._airList[sid].isConn = cItem[1];
                    this._airList[sid].controlStat = cItem[0];

                    // 팝업 정보변경
                    if (this._openIdn == sid) {
                        // 제어상태
                        if (cItem[1] == 0) {
                            document.getElementById('onControlAct').classList.remove('active');
                            document.getElementById('offControlAct').classList.remove('active');
                        } else if (cItem[0] == 0) {
                            document.getElementById('onControlAct').classList.add('active');
                            document.getElementById('offControlAct').classList.remove('active');
                        } else if (cItem[0] == 2) { // 제어요청중일때는 깜빡이게
                            document.getElementById('onControlAct').classList.toggle('active');
                        } else if (cItem[0] == 3) { // 제어요청중일때는 깜빡이게
                            document.getElementById('offControlAct').classList.toggle('active');
                        } else {
                            document.getElementById('onControlAct').classList.remove('active');
                            document.getElementById('offControlAct').classList.add('active');
                        }
                        // 제어모드
                        if (cItem[3] == 1) {
                            document.getElementById('manualControlAct').classList.remove('active');
                            document.getElementById('autoControlAct').classList.add('active');
                        } else {
                            document.getElementById('manualControlAct').classList.add('active');
                            document.getElementById('autoControlAct').classList.remove('active');
                        }
                    }
                }

                clearTimeout(gSetTimeout);
                gSetTimeout = setTimeout(function() {
                    vio.getStat();
                }, 1536);
                break;
            default:
                this.toast({memo: '데이터가 존재하지 않습니다.'});
        }
    }
};

// 제어설정창 오픈
vio.controlPop = async function(sid) {
    document.getElementById('modal').classList.remove('disable');
    this._openIdn = sid;
    // 제어순위
    document.getElementById('edit-controlPriority').value = this._airList[sid].controlPriority;
};

// 도면 표시된곳 오버처리
vio.markPointOver = function(sid) {
    if (this._overIdn != 0) {
        document.getElementById(`mapPoint${this._overIdn}`).classList.remove('active');
        document.getElementById(`deskPoint${this._overIdn}`).classList.remove('active');
    }
    document.getElementById(`mapPoint${sid}`).classList.add('active');
    document.getElementById(`deskPoint${sid}`).classList.add('active');
    document.getElementById('floorPlanName').textContent = this._airList[sid].name;
    this._overIdn = sid;
};
vio.markPointOut = function(sid) {
    if (this._overIdn != 0) {
        document.getElementById(`mapPoint${this._overIdn}`).classList.remove('active');
        document.getElementById(`deskPoint${this._overIdn}`).classList.remove('active');
    }
    if (this._markIdn != 0) {
        // 기존에 선택된 설비표시
        document.getElementById(`mapPoint${this._markIdn}`).classList.add('active');
        document.getElementById(`deskPoint${this._markIdn}`).classList.add('active');
        document.getElementById('floorPlanName').textContent = this._airList[this._markIdn].name;
    }
};

// 설비목록 선택위치 표시하고 제어창 오픈
vio.markPointFixed = function(sid) {
    if (this._markIdn != 0) {
        document.getElementById(`mapPoint${this._markIdn}`).classList.remove('active');
        document.getElementById(`deskPoint${this._markIdn}`).classList.remove('active');
    }
    document.getElementById(`mapPoint${sid}`).classList.add('active');
    document.getElementById(`deskPoint${sid}`).classList.add('active');
    document.getElementById('floorPlanName').textContent = this._airList[sid].name;
    this._markIdn = sid;

    // 제어창
    this.controlPop(sid);
};

// 설비목록 선택위치 표시
vio.markPoint = function(sid) {
    const dtMap = document.getElementById('floorMapPoints').children;
    const dtDesk = document.getElementById('deskList').children;

    for (let ia = 0; ia < this._airList.length; ++ia) {
        if (dtDesk[ia].getAttribute('data-idn') == sid) {
            dtMap[ia].classList.add('active');
            dtDesk[ia].classList.add('active');
            document.getElementById('floorPlanName').textContent = this._airList[ia].name;
        } else {
            dtMap[ia].classList.remove('active');
            dtDesk[ia].classList.remove('active');
        }
    }
};

// 도면 설비위치 초기화
vio.setFloorPoint = function() {
    for (let key in this._airList) {
        const ta = this._airList[key];
        const dt = document.getElementById(`mapPoint${key}`);
        dt.style.left = (ta.x * this._mapRatioToOffset - this._mapRatioToOffset * 4).toFixed(2) + 'px';
        dt.style.top = (ta.y * this._mapRatioToOffset - this._mapRatioToOffset * 4).toFixed(2) + 'px';
    }
};

// 도면 설계도 출력
vio.setFloorImage = function() {
    const png = this._floorMap[this._floorMapIdn].floorFile;
    document.getElementById('floorMapName').textContent = this._floorMap[this._floorMapIdn].floorName;
    if (png) {
        document.getElementById('floorMapImage').src = `//temps.rfenms.com/floor/${png}`;
    }
};

// 도면그룹 목록
vio.getFloorMap = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/tech-frozen/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"floor"}`
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
                case 8:
                    document.getElementById('contentsArea').style.visibility = 'hidden';
                    this.toast({memo: '접근 권한이 없습니다.'});
                    break;
                case 1:
                    let out = '';
                    for (let ia = 0; ia < jsonData.data.length; ++ia) {
                        const ta = jsonData.data[ia];
                        this._floorMap[ta.idn] = ta;
                        if (ia == 0) {
                            this._floorMapIdn = ta.idn;
                            // 도면은 리스트 출력 후 호출
                        }
                        out += `<option value="${ta.idn}">${ta.floorName}</option>`;
                    }
                    if (out != '') {
                        document.getElementById('deskGroup').innerHTML = out;
                        this.getData(1);
                    }
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 시퀀스제어 설비의 제어모드를 수동/자동 으로 변경
vio.setMode = async function(mode) {
    if (!this._useNetworks) {
        this.netAble(true);

        let res = await fetch(`api/tech-frozen/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"setMode","idn":${this._openIdn},"mode":${mode}}`
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
                    this.toast({memo: '변경 되었습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.deskReady = function() {
    // 데스크 기능
    this._sheet.sortTag = 'controlName';
    this._sheet.sortAsc = 0;

    let dt = document.getElementById('deskSort').children;
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

    document.getElementById('modalActClose').addEventListener('click', function() {
        vio._openIdn = 0;
        document.getElementById('modal').classList.add('disable');
    });
    document.getElementById('modalActDone').addEventListener('click', async function() {
        // 제어순위가 변경되면 수정처리
        const controlPriority = document.getElementById('edit-controlPriority').value,
            openIdn = vio._openIdn;
        if (controlPriority != vio._airList[vio._openIdn].controlPriority) {
            if (!vio._useNetworks) {
                vio.netAble(true);

                let res = await fetch(`api/tech-frozen/${this._fid}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `x-auth ${vio._accessToken}`,
                        'Content-Type': 'application/json;charset=utf-8'
                    },
                    body: `{"cf":"setPriority","idn":${openIdn},"priority":"${controlPriority}"}`
                });
                if (!res.ok) {
                    console.error(res.status);
                } else {
                    const jsonData = await res.json();

                    vio.netAble(false);
                    switch (jsonData.cat) {
                        case 9:
                            vio.toast({memo: '권한이 없습니다.'});
                            break;
                        case 1:
                            vio._airList[openIdn].controlPriority = controlPriority;
                            document.getElementById(`deskPoint${openIdn}`).lastElementChild.textContent = controlPriority;
                            vio.toast({memo: '변경 되었습니다.'});
                            break;
                        default:
                            vio.toast({memo: '데이터가 존재하지 않습니다.'});
                    }
                }
            }
        }
        // 팝업 닫기
        vio._openIdn = 0;
        document.getElementById('modal').classList.add('disable');
    });

    document.getElementById('floorMapImage').addEventListener('load', function() {
        // 도면이미지 비율
        vio._mapRatioToOffset = this.offsetWidth / this.naturalWidth;
        vio.setFloorPoint();
        //console.log('load',this.offsetWidth,this.naturalWidth,vio._mapRatioToOffset);
    });

    window.addEventListener('resize', function() {
        vio._mapRatioToOffset = document.getElementById('floorMapImage').offsetWidth / document.getElementById('floorMapImage').naturalWidth;
        vio.setFloorPoint();
    });

    // 도면그룹 목록
    this.getFloorMap();
    document.getElementById('deskGroup').addEventListener('change', function() {
        vio._floorMapIdn = this.value;
        vio.getData(1);
    });

    // 냉난방 선택
    document.getElementById('deskType').addEventListener('click', function() {
        this.classList.toggle('active');
        vio.getData(1);
    });


    // 제어요청 처리상태 카운트 표시
    setInterval(function() {
        const sid = vio._openIdn;
        if (sid != 0) {
            const device = vio._airList[sid],
                nowTime = Math.floor(new Date().getTime() / 1000),
                waitTime = device.actTime + 4 - nowTime;

            const waitControlBox = document.getElementById('waitControlBox');
            waitControlBox.classList.toggle('disable', waitTime <= 0 && device.controlStat < 2);
            //waitControlBox.querySelector('.waitCircleText').textContent =waitTime >0?waitTime:0;
        }
    }, 1000);

    // 제어요청 버튼처리
    document.getElementById('onControlAct').addEventListener('click', function() {
        this.classList.add('active');
        vio.controlSeqRequest();
    });
    document.getElementById('offControlAct').addEventListener('click', function() {
        this.classList.add('active');
        vio.controlSeqRequest();
    });
    // 제어모드 버튼처리
    document.getElementById('manualControlAct').addEventListener('click', function() {
        this.classList.add('active');
        vio.setMode(0);
    });
    document.getElementById('autoControlAct').addEventListener('click', function() {
        this.classList.add('active');
        vio.setMode(1);
    });
};

// 4초 후에 다시 제어 요청 가능
vio.controlSeqRequest = async function() {
    if (this._airList[this._openIdn].isConn == 0) {
        this.toast({memo: '제어가능 상태가 아닙니다.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/controls/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"seq","sid":${this._openIdn}}`
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
                    this._airList[this._openIdn].actTime = Math.floor(new Date().getTime() / 1000);
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    vio.deskReady();
});

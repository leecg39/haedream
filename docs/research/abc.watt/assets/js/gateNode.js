'use strict';

vio._node = ['-', 'POWER', 'COM', 'RELAY', 'AIR', 'AIR2'];
vio._firmName = localStorage.getItem('firmName') ?? '';

vio.deskEditFixed = async function() {
    const dom = document,
        pd = {
            cf: this._sheet.idn ? 'edit' : 'add',
            idn: this._sheet.idn,
            fid: dom.getElementById('edit-fid').value,
            gateName: dom.getElementById('edit-gateName').value,
            ip: dom.getElementById('edit-ip').value,
            portNo: dom.getElementById('edit-portNo').value,
            gid: dom.getElementById('edit-gid').value,
            isEnable: dom.getElementById('edit-isEnable').value,
            node1: dom.getElementById('edit-node1').value,
            node2: dom.getElementById('edit-node2').value,
            node3: dom.getElementById('edit-node3').value,
            node4: dom.getElementById('edit-node4').value,
            node5: dom.getElementById('edit-node5').value,
            node6: dom.getElementById('edit-node6').value,
            node7: dom.getElementById('edit-node7').value,
            node8: dom.getElementById('edit-node8').value,
            node9: dom.getElementById('edit-node9').value,
            node10: dom.getElementById('edit-node10').value,
            memo: dom.getElementById('edit-memo').value,
            authName: vio._firmName
        };
    if (pd.fid == false) {
        this.toast({memo: '업체를 선택하세요.'});
    } else if (!pd.gid) {
        this.toast({memo: '게이트웨이를 입력하세요.'});
    } else if (!pd.gateName) {
        this.toast({memo: '이름을 입력하세요.'});
    } else if (pd.ip.search(/(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}/) === -1) {
        this.toast({memo: '올바른 IP 주소를 입력하세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/gateNode/${this._fid}`, {
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
                case 6:
                    this.toast({memo: '업체 전력타입 설정이 필요합니다.'});
                    break;
                case 3:
                    this.toast({memo: '중복된 게이트웨이가 존재합니다.'});
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

    this._sheet.idn = j.gid || 0;
    dom.getElementById('edit-fid').value = j.fid || 0;
    dom.getElementById('edit-gateName').value = j.gateName || '';
    dom.getElementById('edit-ip').value = j.ip || '0.0.0.0';
    dom.getElementById('edit-portNo').value = j.portNo || 0;
    dom.getElementById('edit-gid').value = j.gid || 0;
    dom.getElementById('edit-isEnable').value = j.isEnable || 0;
    dom.getElementById('edit-node1').value = j.node1 || 0;
    dom.getElementById('edit-node2').value = j.node2 || 0;
    dom.getElementById('edit-node3').value = j.node3 || 0;
    dom.getElementById('edit-node4').value = j.node4 || 0;
    dom.getElementById('edit-node5').value = j.node5 || 0;
    dom.getElementById('edit-node6').value = j.node6 || 0;
    dom.getElementById('edit-node7').value = j.node7 || 0;
    dom.getElementById('edit-node8').value = j.node8 || 0;
    dom.getElementById('edit-node9').value = j.node9 || 0;
    dom.getElementById('edit-node10').value = j.node10 || 0;
    dom.getElementById('edit-memo').value = j.memo || '';

    dom.getElementById('modal').classList.remove('disable');
    if (dom.getElementById('edit-fid').value == 0) {
        // 선택된 계정이 없으면 현재 계정으로
        dom.getElementById('edit-fid').value = this._fid;
    }
};

vio.deskItem = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        this._sheet.idn = j.parentElement.getAttribute('data-idn');
        const res = await fetch(`api/gateNode/${this._fid}`, {
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
                    this.getNode(jsonData.data.gid);
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

        const res = await fetch(`api/gateNode/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"drop", "idn":"${this._sheet.dropItem.getAttribute('data-idn')}", "authName":"${vio._firmName}"}`
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
        <tr data-idn="${ta.gid}">
            <td class="editAct">${ta.gid}<i class="icon iconEdit" onclick="vio.deskItem(this.parentElement)"></i></td>
            <td>${this.catToXLSX(vio._firmName)}</td>
            <td class="textAct" onclick="vio.deskItem(this)">${this.catToXLSX(ta.gateName)}</td>
            <td>${ta.ipAddress}</td>
            <td>${ta.portNo}</td>
            <td>${ta.ip}</td>
            <td>${this._node[ta.node1]}</td>
            <td>${this._node[ta.node2]}</td>
            <td>${this._node[ta.node3]}</td>
            <td>${this._node[ta.node4]}</td>
            <td>${this._node[ta.node5]}</td>
            <td>${this._node[ta.node6]}</td>
            <td>${this._node[ta.node7]}</td>
            <td>${this._node[ta.node8]}</td>
            <td>${this._node[ta.node9]}</td>
            <td>${this._node[ta.node10]}</td>
            <td class="editAct">${this.catToXLSX(ta.memo)}<i class="icon iconDrop" onclick="vio.deskDrop(this)"></i></td>
        </tr>`;
    }
    document.getElementById('deskList').innerHTML = out;
};

vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/gateNode/${this._fid}`, {
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

vio.getNode = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/gateNode/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"gate","cp":"${j}"}`
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
                    let out = '';
                    if (jsonData.relay.length) {
                        out += `<span class="th">node</span>
                        <span class="th">name</span>
                        <span class="th">time</span>
                        <span class="th">relay1</span>
                        <span class="th">ch1state</span>
                        <span class="th">ch1in</span>
                        <span class="th">ch1outgain</span>
                        <span class="th">channel</span>`;
                        for (let ia = 0, th = jsonData.relay.length; ia < th; ++ia) {
                            const ta = jsonData.relay[ia];
                            out += `<span>${ta.nodeIndex}</span>
                            <span>${ta.relayName}</span>
                            <span>${ta.utime != 0 ? this.echoDate('m.d h:i', ta.utime) : ''}</span>
                            <span>${ta.relay1}</span>
                            <span>${ta.ch1state}</span>
                            <span>${ta.ch1in}</span>
                            <span>${ta.ch1outgain}</span>
                            <span class="mark">1</span>
                            <span></span>
                            <span></span>
                            <span></span>
                            <span>${ta.relay2}</span>
                            <span>${ta.ch2state}</span>
                            <span>${ta.ch2in}</span>
                            <span>${ta.ch2outgain}</span>
                            <span class="mark">2</span>`;
                        }
                    }
                    if (jsonData.air2.length) {
                        out += `<span class="th">node</span>
                        <span class="th">name</span>
                        <span class="th">time</span>
                        <span class="th">temp</span>
                        <span class="th">humi</span>
                        <span class="th">target</span>
                        <span class="th">stop_volt</span>
                        <span class="th">start_volt</span>`;
                        for (let ia = 0, th = jsonData.air2.length; ia < th; ++ia) {
                            const ta = jsonData.air2[ia];
                            out += `<span>${ta.nodeIndex}</span>
                            <span>${ta.airName}</span>
                            <span>${ta.utime != 0 ? this.echoDate('m.d h:i', ta.utime) : ''}</span>
                            <span>${ta.temp_now}</span>
                            <span>${ta.humi_now}</span>
                            <span>${ta.temp_target}</span>
                            <span>${ta.stop_volt}</span>
                            <span>${ta.start_volt}</span>`;
                        }
                    }
                    document.getElementById('editExtend').innerHTML = out;
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

vio.deskReady = function() {
    const dom = document;

    let out = `<option value="${this._fid}">${this._firmName}</option>`;
    dom.getElementById('edit-fid').insertAdjacentHTML('beforeend',out);

    // 데스크 기능
    this._sheet.sortTag = 'gid';
    this._sheet.sortAsc = 0;

    for (let ib = 1; ib <= 10; ++ib) {
        out = '';
        const _node = vio._node;
        for (let ia = 1, th = _node.length; ia < th; ++ia) {
            out += `<option value="${ia}">${_node[ia]}</option>`;
        }
        dom.getElementById('edit-node' + ib).insertAdjacentHTML('beforeend', out);
    }

    let dt = dom.getElementById('deskSort').children;
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
                });
                break;
            case 'excel':
                ta.addEventListener('click', function() {
                    let workbook = XLSX.utils.table_to_book(document.getElementById('deskTable')),
                        ws = workbook.Sheets['Sheet1'];
                    XLSX.writeFile(workbook, '노드게이트웨이.xlsx');
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

    this.getData(1);
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.deskReady();
});
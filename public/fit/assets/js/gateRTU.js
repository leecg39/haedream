'use strict';

vio._firmName = localStorage.getItem('firmName') ?? '';

vio.deskEditFixed = async function() {
    const dom = document,
        pd = {
            cf: this._sheet.idn ? 'edit' : 'add',
            idn: this._sheet.idn,
            fid: dom.getElementById('edit-fid').value,
            gateName: dom.getElementById('edit-gateName').value,
            gid: dom.getElementById('edit-gid').value,
            memo: dom.getElementById('edit-memo').value,
            authName: this._firmName
        };

    if (pd.fid == false) {
        this.toast({memo: '업체를 선택하세요.'});
    } else if (!pd.gateName) {
        this.toast({memo: '이름을 입력하세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/gateRTU/${this._fid}`, {
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
    dom.getElementById('edit-ip').value = j.ip || 0;
    dom.getElementById('edit-portNo').value = j.portNo || 0;
    dom.getElementById('edit-gid').value = j.gid || 0;
    dom.getElementById('edit-gateIndex').value = ['', 'power', 'y2022', 'y2023', 'POWER', 'Y2022', 'Y2023'][j.gateIndex || 0];
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
        const res = await fetch(`api/gateRTU/${this._fid}`, {
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
                    this.getDevice(jsonData.data.gid);
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

        const res = await fetch(`api/gateRTU/${this._fid}`, {
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
        <tr data-idn="${ta.gid}">
            <td class="editAct">${ta.gid}<i class="icon iconEdit" onclick="vio.deskItem(this.parentElement)"></i></td>
            <td>${this.catToXLSX(vio._firmName)}</td>
            <td class="textAct" onclick="vio.deskItem(this)">${this.catToXLSX(ta.gateName)}</td>
            <td>${ta.ipAddress}</td>
            <td>${ta.portNo}</td>
            <td>${ta.ip}</td>
            <td>${ta.rTime != 0 ? this.echoDate('y.m.d h:i:s', ta.rTime) : ''}</td>
            <td class="editAct">${this.catToXLSX(ta.memo)}<i class="icon iconDrop" onclick="vio.deskDrop(this)"></i></td>
        </tr>`;
    }
    document.getElementById('deskList').innerHTML = out;
};

vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/gateRTU/${this._fid}`, {
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

vio.getDevice = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/gateRTU/${this._fid}`, {
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
                    let out = `<span class="th">PID</span>
                    <span class="th">Name</span>
                    <span class="th">LoadID</span>
                    <span class="th">device</span>
                    <span class="th">last</span>`;
                    for (let ia = 0, th = jsonData.data.length; ia < th; ++ia) {
                        const ta = jsonData.data[ia];
                        out += `<span>${ta.pid}</span>
                        <span>${ta.lp_name}</span>
                        <span>${ta.lp_number}</span>
                        <span>${this._md[ta.md_id].name}</span>
                        <span>${ta.lp_last != 0 ? this.echoDate('y.m.d h:i', ta.lp_last) : ''}</span>`;
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

    // 에디터용
    dom.getElementById('edit-fid').innerHTML = `<option value="${this._fid}">${this._firmName}</option>`;

    dom.getElementById('edit-gid').addEventListener('change', function() {
        vio.getDevice(this.value);
    });

    // 데스크 기능
    this._sheet.sortTag = 'gid';
    this._sheet.sortAsc = 0;

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
                    XLSX.writeFile(workbook, '게이트웨이계측.xlsx');
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

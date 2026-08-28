'use strict';

vio.deskEditFixed = async function() {
    const dom = document,
        pd = {
            cf: this._sheet.idn ? 'edit' : 'add',
            idn: this._sheet.idn,
            bone: dom.getElementById('edit-bone').value,
            passwd: dom.getElementById('edit-passwd').value,
            part: dom.getElementById('edit-part').value,
            manager: dom.getElementById('edit-manager').value,
            phone: dom.getElementById('edit-phone').value,
            userType: dom.getElementById('edit-userType').value
        };
    if (!pd.manager) {
        this.toast({memo: '사용자 이름을 입력하세요.'});
    } else if (pd.bone.length < 2) {
        this.toast({memo: '아이디를 입력하세요.'});
    } else if (/[#&+\-%@=\/\\:;,.'"^`~|!?*$#<>()\[\]{}]/i.test(pd.bone)) {
        this.toast({memo: '아이디에 특수문자를 사용할 수 없습니다.'});
    } else if (pd.cf == 'add' && !this.checkPasswordText(pd.passwd)) {
        this.toast({memo: '숫자, 영문, 특수문자 포함 8자리를 입력하세요.'});
    } else if (pd.cf == 'edit' && pd.passwd.length > 0 && !this.checkPasswordText(pd.passwd)) {
        this.toast({memo: '숫자, 영문, 특수문자 포함 8자리를 입력하세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/users/${this._fid}`, {
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
                case 8:
                    this.toast({memo: '아이디에 특수문자를 사용할 수 없습니다.'});
                    break;
                case 3:
                    this.toast({memo: '사용할 수 없는 아이디입니다.'});
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


// 일반사용자 비번수정용
vio.deskEditSafeFixed = async function() {
    const dom = document,
        pd = {
            cf: 'editSafe',
            passwd: dom.getElementById('edit-passwdSafe').value,
            part: dom.getElementById('edit-partSafe').value,
            phone: dom.getElementById('edit-phoneSafe').value,
        };
    if (pd.passwd.length > 0 && !this.checkPasswordText(pd.passwd)) {
        this.toast({memo: '숫자, 영문, 특수문자 포함 8자리를 입력하세요.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/users/${this._fid}`, {
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
                    this.toast({memo: '변경 되었습니다.'});
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }

};

vio.deskEditPop = function(j) {
    const dom = document;

    this._sheet.idn = j.bone || '';
    dom.getElementById('edit-userType').value = j.userType || 0;
    dom.getElementById('edit-bone').value = j.bone || '';
    dom.getElementById('edit-passwd').value = '';
    dom.getElementById('edit-part').value = j.part || '';
    dom.getElementById('edit-manager').value = j.manager || '';
    dom.getElementById('edit-phone').value = j.phone || '';

    dom.getElementById('modal').classList.remove('disable');
};

vio.deskItem = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        this._sheet.idn = j.parentElement.getAttribute('data-idn');
        const res = await fetch(`api/users/${this._fid}`, {
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

        const res = await fetch(`api/users/${this._fid}`, {
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
        pageNo = 0,
        pageInfo = '';

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
    pageInfo = `${(j.page - 1) * j.dbListLimit + 1} - ${j.page * j.dbListLimit < j.dbNo ? j.page * j.dbListLimit : j.dbNo} / ${j.dbNo}`;
    //document.getElementById('deskLimit').textContent = pageInfo;
    document.getElementById('deskStat').textContent = pageInfo;
};

vio.dataTrans = function(j) {
    let out = '';
    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia];
        out += `
        <tr data-idn="${ta.bone}">
            <td class="editAct">${this.catToXLSX(ta.manager)}<i class="icon iconEdit" onclick="vio.deskItem(this.parentElement)"></i></td>
            <td class="textAct" onclick="vio.deskItem(this)">${ta.bone}</td>
            <td>${['일반사용자', '관리자', '저압관리자'][ta.userType]}</td>
            <td>${ta.part}</td>
            <td>${ta.phone}</td>
            <td class="editAct">${this.echoDate('m.d h:i', ta.rTime)}<i class="icon iconDrop" onclick="vio.deskDrop(this)"></i></td>
        </tr>`;
    }
    document.getElementById('deskList').innerHTML = out;
};

vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/users/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"get","qs":"${document.getElementById('deskInput').value}","page":"${j}","qt":"${this._sheet.sortTag}","qa":"${this._sheet.sortAsc}"}`
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
                case 5: // 일반 사용자 정보수정
                    document.getElementById('contentsArea').style.visibility = 'hidden';
                    document.getElementById('edit-managerSafe').value = jsonData.manager;
                    document.getElementById('edit-phoneSafe').value = jsonData.phone;
                    document.getElementById('edit-partSafe').value = jsonData.part;
                    document.getElementById('modalSafe').classList.remove('disable');
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

vio.deskReady = function() {
    const dom = document;

    let dt,
        out;

    let dialogAct = dom.getElementById('dialogAct');
    if (dialogAct) {
        dialogAct.addEventListener('click', function() {
            vio.dialog({act: 'no'});
        });
        dialogAct.nextElementSibling.addEventListener('click', function() {
            vio.dialog({act: 'yes'});
        });
    }

    // 데스크 기능
    this._sheet.sortTag = 'bone';
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
                });
                break;
            case 'excel':
                ta.addEventListener('click', function() {
                    let workbook = XLSX.utils.table_to_book(document.getElementById('deskTable')),
                        ws = workbook.Sheets['Sheet1'];
                    XLSX.writeFile(workbook, '사용자관리.xlsx');
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

    // 일반 사용자 정보변경
    dom.getElementById('modalSafeActClose').addEventListener('click', function () {
        document.getElementById('modalSafe').classList.add('disable');
    });
    dom.getElementById('modalSafeActCancel').addEventListener('click', function () {
        document.getElementById('modalSafe').classList.add('disable');
    });
    dom.getElementById('modalSafeActDone').addEventListener('click', async function () {
        vio.deskEditSafeFixed();
    });

    this.getData(1);
};


vio.checkPasswordText = function(s){
    return s.search(/^(?=.*[0-9])(?=.*[a-zA-Z])(?=.*[!@#$%^*+=?,.]).{8,16}$/g) === -1 ? false : true;
};


window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.deskReady();
});
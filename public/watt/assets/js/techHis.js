'use strict';

vio._rule = {};
vio._controlName = {};

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
    document.getElementById('deskStat').textContent = pageInfo;
};

vio.dataTrans = function(j) {
    let out = '';

    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia],
            hasTime = ta.eTime - ta.sTime;

        let hasTimeText = '';
        if (hasTime < 60) {
            hasTimeText = hasTime + '초';
        } else if (hasTime < 3600) {
            hasTimeText = `${Math.floor(hasTime / 60)}분 ${hasTime % 60}초`;
        } else if (hasTime < 86400) {
            hasTimeText = `${Math.floor(hasTime / 3600)}시간 ${Math.floor(hasTime % 3600 / 60)}분 ${hasTime % 60}초`;
        } else {
            hasTimeText = Math.ceil(hasTime / 86400) + '일';
        }

        out += `
                    <tr>
                        <td>${ta.cid}</td>
                        <td>${this.catToXLSX(this._controlName[ta.cid])}</td>
                        <td>${this._rule[ta.rid]}</td>
                        <td>${this.echoDate('m.d h:i:s', ta.sTime)}</td>
                        <td>${this.echoDate('m.d h:i:s', ta.eTime)}</td>
                        <td>${ta.sTemp}<i class="em">℃</i></td>
                        <td>${ta.eTemp}<i class="em">℃</i></td>
                        <td>${ta.sRelayIn / 100}<i class="em">㎃</i></td>
                        <td>${ta.eRelayIn / 100}<i class="em">㎃</i></td>
                        <td>${ta.gain}<i class="em">%</i></td>
                        <td>${hasTimeText}</td>
                        <td>${this.echoNumber(ta.watt)}<i class="em">wh</i></td>
                    </tr>`;
    }
    document.getElementById('deskList').innerHTML = out;
};

vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'get',
            cid: document.getElementById('facList').value,
            sDate: document.getElementById('sDate').value,
            qs: '',
            page: j,
            qt: this._sheet.sortTag,
            qa: this._sheet.sortAsc
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/tech-historys/${this._fid}?${queryString}`, {
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

            this.netAble(false);

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this.dataTrans(jsonData.data);
                this.deskPaging(jsonData.paging);
            }
        }
    }
};

vio.getBase = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'base'
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/tech-historys/${this._fid}?${queryString}`, {
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

            this.netAble(false);

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                let out = '';
                for (let ia = 0, th = jsonData.control.length; ia < th; ++ia) {
                    const ta = jsonData.control[ia];
                    out += `<option value="${ta.cid}">${this.catToXLSX(ta.controlName)}</option>`;

                    this._controlName[ta.cid] = ta.controlName;
                }
                if (out !== '') {
                    document.getElementById('facList').insertAdjacentHTML('beforeend', out);
                }
                this._rule = jsonData.ruleNames;
                this.getData(1);
            }
        }
    }
};

vio.deskReady = function() {
    const dom = document,
        nowDate = new Date(),
        sDate = nowDate.toLocaleDateString('sv-SE'),
        sDateInput = dom.getElementById('sDate');

    sDateInput.max = sDate;
    sDateInput.value = sDate;

    dom.getElementById('facList').addEventListener('change', function() {
        vio.getData(1);
    });
    dom.getElementById('act').addEventListener('click', function() {
        vio.getData(1);
    });

    // 데스크 기능
    vio._sheet.sortTag = 'eTime';
    vio._sheet.sortAsc = 0;

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

    dt = dom.getElementById('deskTool').children;
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        const ta = dt[ia];
        switch (ta.getAttribute('data-act')) {
            case 'refresh':
                ta.addEventListener('click', function() {
                    location.reload();
                });
                break;
            case 'excel':
                ta.addEventListener('click', function() {
                    let facList = document.getElementById('facList'),
                        saveName = `[제어이력]${facList.options[facList.selectedIndex].text}.xlsx`;

                    let workbook = XLSX.utils.table_to_book(document.getElementById('deskTable')),
                        ws = workbook.Sheets['Sheet1'];
                    XLSX.writeFile(workbook, saveName);
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

    this.getBase();
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    const today = new Date();

    new tui.DatePicker('#wrapper', {
        date: today,
        input: {
            element: '#sDate',
            format: 'yyyy-MM-dd'
        },
        selectableRanges: [
            [new Date('2021-12-01'), today] // 최소 날짜와 최대 날짜를 설정합니다.
        ],
        language: 'ko'
    });

    await vio.deskReady();
});
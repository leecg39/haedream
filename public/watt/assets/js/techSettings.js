'use strict';

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
    document.getElementById('deskLimit').textContent = pageInfo;
    document.getElementById('deskStat').textContent = pageInfo;
};

vio.dataTrans = function(j, ruleFac, ruleNames) {
    let out = '',
        nowTime = Date.now() / 1000;

    for (const ta of j) {
        let rule = '',
            status = '';

        for (let k in ruleFac) {
            if (ruleFac[k].indexOf(ta.cid) !== -1) {
                rule += ', ' + this.catToXLSX(ruleNames[k]);
            }
        }

        if(ta.rTime < nowTime - 180){
            status = '<span class="gray">정지</span>';
        }else if(ta.controlStat == 0){
            status = '운전';
        }else{
            status = '<span class="red">제어</span>';
        }

        out += `
        <tr data-idn="${ta.cid}">
            <td>${ta.cid}</td>
            <td>${this.catToXLSX(ta.controlName)}</td>
            <td>${status}</td>
            <td>${ta.voltage.toFixed(1)}<i class="em">V</i></td>
            <td>${ta.ampere.toFixed(1)}<i class="em">A</i></td>
            <td>${ta.temp}<i class="em">℃</i></td>
            <td>${ta.relayIn}</td>
            <td>${rule.substr(2)}</td>
            <td>${Math.round(ta.hasTime / 3600)}</td>
            <td>${Math.ceil(ta.gold * 0.0001)}</td>
        </tr>`;
    }
    document.getElementById('deskList').innerHTML = out || '<tr><td colspan="10">설정 대상 설비가 없습니다.</td></tr>';
};

vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'get',
            qs: document.getElementById('deskInput').value,
            page: j,
            qt: this._sheet.sortTag,
            qa: this._sheet.sortAsc
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/tech-settings/${this._fid}?${queryString}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        if (!res.ok) {
            console.error(res.status);
        }  else {
            const jsonData = await res.json();

            this.netAble(false);
            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this.dataTrans(jsonData.data, jsonData.ruleFac, jsonData.ruleNames);
                this.deskPaging(jsonData.paging);
            }
        }
    }
};

vio.syncRelay = async function() {
    const dt = document.getElementById('deskList').children;
    let ts = '0';
    for (let ia = 0, th = dt.length; ia < th; ++ia) {
        ts += ',' + dt[ia].getAttribute('data-idn');
    }

    const params = {
        cf: 'relay',
        cid: ts
    }

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/tech-settings/${this._fid}?${queryString}`, {
        method: 'GET',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        }
    });

    if (!res.ok) {
        console.error(res.status);
    }  else {
        const jsonData = await res.json();

        this.netAble(false);
        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            for (let ia = 0, th = dt.length; ia < th; ++ia) {
                const cid = dt[ia].getAttribute('data-idn');
                if (jsonData.data.hasOwnProperty(cid)) {
                    const cList = dt[ia].children,
                        cItem = jsonData.data[cid];

                    /*
                    로컬서버 특정설비 적용
                    1837,1838-12260 300
                    1835,1836-12259 100
                    1839,1840-12258 100
                    1841,1842-12257 200
                    */
                    if(cid >= 1835 && cid <= 1842){
                        if(cid == 1837 || cid == 1838){
                            cList[2].innerHTML = cItem[3] > 300 && cItem[1] > 400 ? '운전' : '<span class="gray">정지</span>';
                        }else if(cid == 1835 || cid == 1836){
                            cList[2].innerHTML = cItem[3] > 100 && cItem[1] > 400 ? '운전' : '<span class="gray">정지</span>';
                        }else if(cid == 1839 || cid == 1840){
                            cList[2].innerHTML = cItem[3] > 100 && cItem[1] > 400 ? '운전' : '<span class="gray">정지</span>';
                        }else if(cid == 1841 || cid == 1842){
                            cList[2].innerHTML = cItem[3] > 200 && cItem[1] > 400 ? '운전' : '<span class="gray">정지</span>';
                        }
                    }

                    cList[3].innerHTML = cItem[2].toFixed(1) + '<i class="em">V</i>'; // 전압
                    cList[4].innerHTML = cItem[3].toFixed(1) + '<i class="em">A</i>'; // 전류
                    cList[5].innerHTML = cItem[1] + '<i class="em">℃</i>'; // 온도
                    cList[6].innerHTML = cItem[0]; // relayIn
                }
            }
        }
    }
};

vio.deskReady = function() {
    const dom = document;

    // 데스크 기능
    vio._sheet.sortTag = 'controlName';
    vio._sheet.sortAsc = 1;

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
            case 'excel':
                ta.addEventListener('click', function() {
                    let workbook = XLSX.utils.table_to_book(document.getElementById('deskTable')),
                        ws = workbook.Sheets['Sheet1'];
                    XLSX.writeFile(workbook, '주요설비설정.xlsx');
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

    this.getData(1);
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    vio.deskReady();

    setInterval(function() {
        vio.syncRelay();
    }, 2048);
});
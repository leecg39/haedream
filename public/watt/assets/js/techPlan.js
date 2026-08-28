'use strict';

vio._facList = null;

vio._deskEditFormTimeNot = `
    <span class="block">
        <input type="datetime-local" class="eInputDate" data-sTime="" />
        <span>~</span>
        <input type="datetime-local" class="eInputDate" data-eTime="" />
        <i class="icon iconReset" onclick="vio.deskEditReset(this)"></i>
    </span>`;

vio._deskEditFormTime = `
    <span class="block">
        <input type="time" class="eInput eInputMini" data-sTime="" placeholder="00:00" />
        <span>~</span>
        <input type="time" class="eInput eInputMini" data-eTime="" placeholder="00:00" />
        <select class="eSelect eInputMini">
            <option value="0">요일</option>
            <option value="2">월요일</option>
            <option value="3">화요일</option>
            <option value="4">수요일</option>
            <option value="5">목요일</option>
            <option value="6">금요일</option>
            <option value="7">토요일</option>
            <option value="1">일요일</option>
        </select>
        <i class="bi bi-arrow-clockwise iconReset" onclick="vio.deskEditReset(this)"></i>
    </span>`;
vio._deskEditFormTemp =
    `<span class="block">
        <input type="number" class="eInput eInputMini" step="1" min="0" max="65535" data-sTemp="" placeholder="0"/>
        <span>~</span>
        <input type="number" class="eInput eInputMini" step="1" min="0" max="65535" data-eTemp="" placeholder="0"/>
        <span class="marginLeft">출력설정</span>
        <input type="number" class="eInput eInputMini" step="1" min="0" max="100" data-gain="" placeholder="0"/>
        <span>%</span>
        <i class="bi bi-arrow-clockwise iconReset" onclick="vio.deskEditReset(this)"></i>
    </span>`;

vio._deskEditFormDate = `
    <span class="block">
        <input type="time" class="eInput eInputMini" data-sTime="" placeholder="00:00" />
        <select class="eSelect eInputMini">
            <option value="0" data-week="start">요일</option>
            <option value="2" data-week="start">월요일</option>
            <option value="3" data-week="start">화요일</option>
            <option value="4" data-week="start">수요일</option>
            <option value="5" data-week="start">목요일</option>
            <option value="6" data-week="start">금요일</option>
            <option value="7" data-week="start">토요일</option>
            <option value="1" data-week="start">일요일</option>
        </select>
        <span>~</span>
        <input type="time" class="eInput eInputMini" data-eTime="" placeholder="00:00" />
        <select class="eSelect eInputMini">
            <option value="0" data-week="end">요일</option>
            <option value="2" data-week="end">월요일</option>
            <option value="3" data-week="end">화요일</option>
            <option value="4" data-week="end">수요일</option>
            <option value="5" data-week="end">목요일</option>
            <option value="6" data-week="end">금요일</option>
            <option value="7" data-week="end">토요일</option>
            <option value="1" data-week="end">일요일</option>
        </select>
        <i class="icon iconReset" onclick="vio.deskEditReset(this)"></i>
    </span>`;

vio.deskEditReset = function(j) {
    const elements = j.parentElement.querySelectorAll('input, select');
    for (const element of elements) {
        if(element.getAttribute('type') == 'time' || element.getAttribute('type') == 'datetime-local'){
            element.value = '';
        }else{
            element.value = '0';
        }
    }
};

vio.deskEditFixed = async function() {
    const dom = document,
        pd = {
            cf: this._sheet.idn ? 'edit' : 'add',
            idn: this._sheet.idn,
            ruleName: dom.getElementById('edit-ruleName').value,
            sTime: dom.getElementById('edit-sTime').value,
            eTime: dom.getElementById('edit-eTime').value,
            isDisable: dom.getElementById('edit-isDisable1').checked ? 1 : 0,
            justMark: dom.getElementById('edit-justMark').checked ? 1 : 0,
            spring: dom.getElementById('edit-spring').checked ? 1 : 0,
            summer: dom.getElementById('edit-summer').checked ? 1 : 0,
            autumn: dom.getElementById('edit-autumn').checked ? 1 : 0,
            winter: dom.getElementById('edit-winter').checked ? 1 : 0,
            sun: dom.getElementById('edit-sun').checked ? 1 : 0,
            mon: dom.getElementById('edit-mon').checked ? 1 : 0,
            tue: dom.getElementById('edit-tue').checked ? 1 : 0,
            wed: dom.getElementById('edit-wed').checked ? 1 : 0,
            thu: dom.getElementById('edit-thu').checked ? 1 : 0,
            fri: dom.getElementById('edit-fri').checked ? 1 : 0,
            sat: dom.getElementById('edit-sat').checked ? 1 : 0,
            unitTime: dom.getElementById('edit-unitTime').value,
            potTime: dom.getElementById('edit-potTime').value,
            predictRatio: dom.getElementById('edit-predictRatio').value,
            ruleTime: [],
            ruleDate: [],
            ruleTimeNot: [],
            ruleTemp: [],
            ruleFac: []
        };

    // 시간제어
    let dt = dom.getElementById('edit-timeList').children;
    for (let ia = 0; ia < dt.length; ++ia) {
        const ta = dt[ia].children;
        if (ta[0].value && ta[2].value) {
            pd.ruleTime.push({
                sTime: ta[0].value.substr(0, 2) * 60 + Number(ta[0].value.substr(3, 2)),
                eTime: ta[2].value.substr(0, 2) * 60 + Number(ta[2].value.substr(3, 2)),
                isNew: ta[0].getAttribute('data-sTime') !== null ? 1 : 0,
                inWeek: ta[3].value
            });
        }
    }

    // 기간제어
    dt = dom.getElementById('edit-dateList').children;
    for (let ia = 0; ia < dt.length; ++ia) {
        const ta = dt[ia].children;
        if (ta[0].value && ta[1].value && ta[3].value && ta[4].value) {
            pd.ruleDate.push({
                sTime: ta[0].value.substr(0, 2) * 60 + Number(ta[0].value.substr(3, 2)),
                sWeek: ta[1].value,
                eTime: ta[3].value.substr(0, 2) * 60 + Number(ta[3].value.substr(3, 2)),
                eWeek: ta[4].value,
                isNew: ta[0].getAttribute('data-sTime') !== null ? 1 : 0,
            });
        }
    }

    // 제어중지 기간
    dt = dom.getElementById('edit-timeNotList').children;
    for (let ia = 0; ia < dt.length; ++ia) {
        const ta = dt[ia].children;
        if (ta[0].value && ta[2].value) {
            pd.ruleTimeNot.push({
                sTime: ta[0].value,
                eTime: ta[2].value,
                isNew: ta[0].getAttribute('data-sTime') !== null ? 1 : 0
            });
        }
    }

    // 온도조건
    dt = dom.getElementById('edit-tempList').children;
    for (let ia = 0; ia < dt.length; ++ia) {
        const ta = dt[ia].children;
        if (ta[0].value && ta[2].value && ta[4].value) {
            pd.ruleTemp.push({
                sTemp: ta[0].value,
                eTemp: ta[2].value,
                gain: ta[4].value,
                isNew: ta[0].getAttribute('data-sTemp') !== null ? 1 : 0
            });
        }
    }

    // 적용설비
    dt = dom.getElementById('facList').children;
    for (let ia = 0; ia < dt.length; ++ia) {
        if (dt[ia].classList.contains('active')) {
            pd.ruleFac.push(dt[ia].getAttribute('data-item'));
        }
    }

    if (!pd.ruleName) {
        this.toast({memo: '이름을 입력하세요.'});
    } else if (pd.ruleFac.length == 0) {
        this.toast({memo: '설비를 한 개 이상 선택해야 합니다.'});
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/tech-plans/${this._fid}`, {
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

    this._sheet.idn = j.rid || 0;
    dom.getElementById('edit-ruleName').value = j.ruleName || '';
    dom.getElementById('edit-sTime').value = j.sTime ? this.echoDate('y-m-dTh:i', j.sTime) : '';
    dom.getElementById('edit-eTime').value = j.eTime ? this.echoDate('y-m-dTh:i', j.eTime) : '';
    if (j.hasOwnProperty('isDisable')) {
        dom.getElementById('edit-isDisable' + j.isDisable).checked = true;
    }
    dom.getElementById('edit-justMark').checked = j.justMark || false;
    dom.getElementById('edit-spring').checked = j.spring || false;
    dom.getElementById('edit-summer').checked = j.summer || false;
    dom.getElementById('edit-autumn').checked = j.autumn || false;
    dom.getElementById('edit-winter').checked = j.winter || false;
    dom.getElementById('edit-sun').checked = j.sun || false;
    dom.getElementById('edit-mon').checked = j.mon || false;
    dom.getElementById('edit-tue').checked = j.tue || false;
    dom.getElementById('edit-wed').checked = j.wed || false;
    dom.getElementById('edit-thu').checked = j.thu || false;
    dom.getElementById('edit-fri').checked = j.fri || false;
    dom.getElementById('edit-sat').checked = j.sat || false;
    dom.getElementById('edit-unitTime').value = j.unitTime || 0;
    dom.getElementById('edit-potTime').value = j.potTime || 0;
    dom.getElementById('edit-predictRatio').value = j.predictRatio || 0;

    // 시간제어
    let out = '';
    if (j.ruleTime) {
        for (let ia = 0; ia < j.ruleTime.length; ++ia) {
            const ta = j.ruleTime[ia];
            if (ta.eTime != 0) {
                const sTime = `value="${Math.floor(ta.sTime / 60).toString().padStart(2, '0')}:${(ta.sTime % 60).toString().padStart(2, '0')}"`,
                    eTime = `value="${Math.floor(ta.eTime / 60).toString().padStart(2, '0')}:${(ta.eTime % 60).toString().padStart(2, '0')}"`;
                out += this._deskEditFormTime.replace('data-sTime=""', sTime).replace('data-eTime=""', eTime).replace(`value="${ta.inWeek}"`, `value="${ta.inWeek}" selected`);
            }
        }
    }
    if (out == '') {
        out = this._deskEditFormTime;
    }
    dom.getElementById('edit-timeList').innerHTML = out;

    // 기간제어
    out = '';
    if (j.ruleDate) {
        for (let ia = 0; ia < j.ruleDate.length; ++ia) {
            const ta = j.ruleDate[ia];
            if (ta.eTime != 0) {
                const sTime = `value="${Math.floor(ta.sTime / 60).toString().padStart(2, '0')}:${(ta.sTime % 60).toString().padStart(2, '0')}"`,
                    eTime = `value="${Math.floor(ta.eTime / 60).toString().padStart(2, '0')}:${(ta.eTime % 60).toString().padStart(2, '0')}"`;
                out += this._deskEditFormDate.replace('data-sTime=""', sTime).replace('data-eTime=""', eTime).replace(`value="${ta.sWeek}" data-week="start"`, `value="${ta.sWeek}" data-week="start" selected`).replace(`value="${ta.eWeek}" data-week="end"`, `value="${ta.eWeek}" data-week="end" selected`);
            }
        }
    }
    if (out == '') {
        out = this._deskEditFormDate;
    }
    dom.getElementById('edit-dateList').innerHTML = out;

    // 제어중지 일자
    out = '';
    if (j.ruleTimeNot) {
        for (let ia = 0; ia < j.ruleTimeNot.length; ++ia) {
            const ta = j.ruleTimeNot[ia];
            if (ta.eTime != 0) {
                const sTime = `value="${ta.sTime != 0 ? this.echoDate('y-m-dTh:i', ta.sTime) : ''}"`,
                    eTime = `value="${ta.eTime != 0 ? this.echoDate('y-m-dTh:i', ta.eTime) : ''}"`;
                out += this._deskEditFormTimeNot.replace('data-sTime=""', sTime).replace('data-eTime=""', eTime);
            }
        }
    }
    if (out == '') {
        out = this._deskEditFormTimeNot;
    }
    dom.getElementById('edit-timeNotList').innerHTML = out;

    // 온도조건
    out = '';
    if (j.ruleTemp) {
        for (let ia = 0; ia < j.ruleTemp.length; ++ia) {
            const ta = j.ruleTemp[ia];
            if (ta.sTemp <= ta.eTemp && ta.gain) {
                const sTemp = `value="${ta.sTemp}"`,
                    eTemp = `value="${ta.eTemp}"`,
                    gain = `value="${ta.gain}"`;
                out += this._deskEditFormTemp.replace('data-sTemp=""', sTemp).replace('data-eTemp=""', eTemp).replace('data-gain=""', gain);
            }
        }
    }
    if (out == '') {
        out = this._deskEditFormTemp;
    }
    dom.getElementById('edit-tempList').innerHTML = out;

    // 적용설비선택
    if (!j.ruleFac) {
        j.ruleFac = [];
    }
    const dt = dom.getElementById('facList').children;
    for (let ia = 0; ia < dt.length; ++ia) {
        dt[ia].classList.toggle('active', j.ruleFac.indexOf(Number(dt[ia].getAttribute('data-item'))) !== -1 ? true : false);
    }

    dom.getElementById('modal').classList.remove('disable');
};

vio.deskItem = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        this._sheet.idn = j.parentElement.getAttribute('data-idn');
        const res = await fetch(`api/tech-plans/${this._fid}`, {
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

vio.ableFixed = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/tech-plans/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"able","idn":"${j.idn}","isDisable":${j.dt.classList.contains('active') ? 1 : 0}}`
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
                    j.dt.classList.toggle('active');
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
    j.e.stopPropagation();
};

vio.deskDropFixed = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/tech-plans/${this._fid}`, {
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
                    this._sheet.dropItem.remove();
                    this._sheet.dropItem = null;
                    this.toast({memo: '삭제 되었습니다.'});
                    document.getElementById('modal').classList.add('disable');
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
    document.getElementById('deskStat').textContent = pageInfo;
};

vio.dataTrans = function(data, dataRuleDate, dataRuleTime, dataRuleTemp, dataRuleFac) {
    let out = '';
    for (let ia = 0, th = data.length; ia < th; ++ia) {
        const ta = data[ia];
        let pack = [],
            season = '',
            week = '',
            ruleDate = '',
            ruleTime = '',
            ruleMinute = '',
            ruleTemp = '',
            ruleFac = '';

        season = ta.spring ? ', 봄' : '';
        season += ta.summer ? ', 여름' : '';
        season += ta.autumn ? ', 가을' : '';
        season += ta.winter ? ', 겨울' : '';

        week = ta.sun ? ', 일' : '';
        week += ta.mon ? ', 월' : '';
        week += ta.tue ? ', 화' : '';
        week += ta.wed ? ', 수' : '';
        week += ta.thu ? ', 목' : '';
        week += ta.fri ? ', 금' : '';
        week += ta.sat ? ', 토' : '';

        // 기간제어
        pack = dataRuleDate[ta.rid] ?? [];
        for (let ib = 0; ib < pack.length; ++ib) {
            const tb = pack[ib];
            if (tb.eTime != 0) {
                if (ruleDate != '') {
                    ruleDate += '<br/>';
                }
                ruleDate += `${this.timeForm(tb.sTime, 60, 24)}:${this.timeForm(tb.sTime, 1, 60)} ${['', '일','월','화','수','목','금','토'][tb.sWeek]} ~ ${this.timeForm(tb.eTime, 60, 24)}:${this.timeForm(tb.eTime, 1, 60)} ${['', '일','월','화','수','목','금','토'][tb.eWeek]}`;
            }
        }

        // 시간제어
        pack = dataRuleTime[ta.rid] || [];
        for (let ib = 0; ib < pack.length; ++ib) {
            const tb = pack[ib];
            if (tb.eTime != 0) {
                if (tb.sTime == tb.eTime) {
                    if (ruleTime != '') {
                        ruleTime += '<br/>';
                    }
                    ruleTime += `${this.timeForm(tb.sTime, 60, 24)}:${this.timeForm(tb.sTime, 1, 60)}`;
                } else {
                    if (ruleTime != '') {
                        ruleTime += '<br/>';
                    }
                    ruleTime += `${this.timeForm(tb.sTime, 60, 24)}:${this.timeForm(tb.sTime, 1, 60)} ~ ${this.timeForm(tb.eTime, 60, 24)}:${this.timeForm(tb.eTime, 1, 60)}`;
                }

                if(tb.inWeek != 0){
                    ruleTime += ` ${['일','월','화','수','목','금','토'][tb.inWeek - 1]}`;
                }
            }
        }

        // 분단위 제어
        if (ta.unitTime && ta.potTime) {
            ruleMinute = `${ta.unitTime}분 마다 ${ta.potTime}분 제어`;
        }

        // 온도 조건
        pack = dataRuleTemp[ta.rid] || [];
        for (let ib = 0; ib < pack.length; ++ib) {
            const tb = pack[ib];
            if (tb.sTemp <= tb.eTemp && tb.gain != 0) {
                if (tb.sTemp == tb.eTemp) {
                    if (ruleTemp != '') {
                        ruleTemp += '<br/>';
                    }
                    ruleTemp += `${tb.sTemp}<i class="em">℃</i> [${tb.gain}<i class="em">%</i>]`;
                } else {
                    if (ruleTemp != '') {
                        ruleTemp += '<br/>';
                    }
                    ruleTemp += `${tb.sTemp}<i class="em">℃</i> ~ ${tb.eTemp}<i class="em">℃</i> [${tb.gain}<i class="em">%</i>]`;
                }
            }
        }

        // 해당 설비
        pack = dataRuleFac[ta.rid] || [];
        for (let ib = 0; ib < pack.length; ++ib) {
            if (this._facList && this._facList.hasOwnProperty(pack[ib])) {
                ruleFac += ', ' + this._facList[pack[ib]];
            }
        }

        out += `
                    <tr data-idn="${ta.rid}">
                        <td>${ta.rid}</td>
                        <td class="textAct" onclick="vio.deskItem(this)">${ta.ruleName}</td>
                        <td><span class="toggle ${ta.isDisable ? '' : 'active'}" onclick="vio.ableFixed({dt:this,idn:${ta.rid},e:event})"></span></td>
                        <td>${ta.sTime && ta.eTime ? this.echoDate('y.m.d h:i', ta.sTime) + '<br/>~ ' + this.echoDate('y.m.d h:i', ta.eTime) : '-'}</td>
                        <td>${season.substr(2)}</td>
                        <td>${week.substr(2)}</td>
                        <td>${ruleDate}</td>
                        <td>${ruleTime}</td>
                        <td>${ruleMinute}</td>
                        <td>${ruleTemp}</td>
                        <td class="nameList editAct">${ruleFac.substr(2)}<i class="icon iconDrop" onclick="vio.deskDrop(this)"></i></td>
                    </tr>`;
    }
    document.getElementById('deskList').innerHTML = out;
};

vio.getData = async function(j) {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/tech-plans/${this._fid}`, {
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
            const jsonData = await res.json(),
                _facList = {};

            this.netAble(false);
            switch (jsonData.cat) {
                case 9:
                    this.toast({memo: '권한이 없습니다.'});
                    break;
                case 1:
                    if (this._facList == null) {
                        // 에디터용
                        let out = '';
                        for (let ia = 0; ia < jsonData.facList.length; ++ia) {
                            const ta = jsonData.facList[ia];
                            out += `<span class="item" data-item="${ta.cid}" onclick="this.classList.toggle('active')">${ta.controlName}</span>`;
                            _facList[ta.cid] = ta.controlName;
                        }
                        document.getElementById('facList').innerHTML = out;
                        this._facList = _facList;
                    }
                    this.dataTrans(jsonData.data, jsonData.ruleDate, jsonData.ruleTime, jsonData.ruleTemp, jsonData.ruleFac);
                    this.deskPaging(jsonData.paging);
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

        const res = await fetch(`api/tech-plans/${this._fid}`, {
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

vio.deskReady = function() {
    const dom = document;

    // 에디터용
    dom.getElementById('actAddDate').addEventListener('click', function () {
        document.getElementById('edit-dateList').insertAdjacentHTML('beforeend', vio._deskEditFormDate);
    });
    dom.getElementById('actAddTime').addEventListener('click', function() {
        document.getElementById('edit-timeList').insertAdjacentHTML('beforeend', vio._deskEditFormTime);
    });
    dom.getElementById('actAddTemp').addEventListener('click', function() {
        document.getElementById('edit-tempList').insertAdjacentHTML('beforeend', vio._deskEditFormTemp);
    });
    dom.getElementById('actAddTimeNot').addEventListener('click', function () {
        document.getElementById('edit-timeNotList').insertAdjacentHTML('beforeend', vio._deskEditFormTimeNot);
    });


    // 데스크 기능
    this._sheet.sortTag = 'rid';
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
                    vio.deskEditPop({});
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
    vio.deskReady();
});

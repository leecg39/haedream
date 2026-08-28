'use strict';

vio._idn = 0;
vio._page = 1;


vio._deskEditFormRule =
    `<span class="block">
        <input type="number" class="eInput eInputMini" step="1" min="0" max="65535" name="rateMin" value="0" />
        <span>~</span>
        <input type="number" class="eInput eInputMini" step="1" min="0" max="65535" name="rateMax" value="0" />
        <span class="marginLeft">제어값</span>
        <input type="number" class="eInput eInputMini" step="1" min="0" max="65535" name="control" value="0" />
        <span>Hz</span>
        <i class="bi bi-arrow-clockwise iconDrop" onclick="this.parentElement.remove()"></i>
        <input type="hidden" name="idn" value="0" />
    </span>`;

/**
 * 목록 API 요청
 * @returns {Promise<void>}
 */
vio.getData = async function(page) {
    try {
        this.netAble(true);

        if (page) {
            this._page = page;
        }

        const res = await fetch(`api/plc-panels/${this._fid}?page=${this._page}`, {
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
            this.dataTrans(jsonData?.sheet?.data || []);
            this.deskPaging(jsonData?.sheet?.paging || [])
        }
    } catch (e) {
        this.toast({memo: e.message});
    } finally {
        this.netAble(false);
    }
};

/**
 * 목록 데이터 매핑
 * @param data
 */
vio.dataTrans = function(data) {
    let out = '';
    for (let item of data) {
        out += `<tr data-idn="${item.idn}">
        <td class="textAct">${item.nickname || '-'}</td>
        <td>${item.addressRead || '-'}</td>
        <td>${item.addressWrite || '-'}</td>
        <td>${item.rate.replace(/(?<=\n.*)\n/g, '<br>')}</td>
        <td>${item.control.replace(/(?<=\n.*)\n/g, '<br>')}</td>
        <td>${item.delayTime}</td>
        <td>${item.isEnable != 0 ? '활성' : '비활성'}</td>
        </tr>`;
    }

    if (out === '') {
        out += `<tr><td colspan="6">데이터가 없습니다.</td></tr>`;
    }

    document.getElementById('deskList').innerHTML = out;
};

/**
 * 페이지네이션
 * @param paging
 */
vio.deskPaging = function(paging) {
    const j = {
        page:       paging[0],
        dbPageNo:   paging[1],
        dbNo:       paging[2],
        dbListLimit:paging[3],
    }

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

/**
 * 상세 API 요청
 * @param idn
 * @returns {Promise<void>}
 */
vio.deskItem = async function(idn) {
    this._idn = parseInt(idn);

    try {
        this.netAble(true);

        const res = await fetch(`api/plc-panels/${this._fid}?idn=${this._idn}`, {
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
            this.dataTransItem(jsonData?.data || {});
        }
    } catch (e) {
        this.toast({memo: e.message});
    } finally {
        this.netAble(false);
    }
};

/**
 * 상세 데이터 매핑
 * @param item
 */
vio.dataTransItem = function(item) {
    vio.deskEditPop(item);
};

/**
 * 팝업 표시
 * @param j
 */
vio.deskEditPop = function(j) {
    const dom = document;

    dom.getElementById('edit-nickname').value = j.nickname || '';
    dom.getElementById('edit-addressRead').value = j.addressRead || '';
    dom.getElementById('edit-addressWrite').value = j.addressWrite || '';
    dom.getElementById('edit-addressRule').value = j.addressRule || '';
    dom.getElementById('edit-delayTime').value = j.delayTime || '0';
    dom.getElementById('edit-isEnable').value = j.isEnable || '0';
    dom.getElementById('edit-unit').value = j.unit || '0';
    dom.getElementById('edit-ruleUnit').value = j.ruleUnit || '0';

    dom.getElementById('modalActRemove').classList.toggle('disable', !this._idn > 0);
    dom.getElementById('modal').classList.remove('disable');

    // 제어조건
    let out = '';
    if(j.rules){
        for(const item of j.rules){
            out += this._deskEditFormRule.
                replace('name="idn" value="0"', `name="idn" value="${item.idn}"`).
                replace('name="rateMin" value="0"', `name="rateMin" value="${item.rateMin}"`).
                replace('name="rateMax" value="0"', `name="rateMax" value="${item.rateMax}"`).
                replace('name="control" value="0"', `name="control" value="${item.control}"`);
        }
    }

    if (out == '') {
        out = this._deskEditFormRule;
    }
    dom.getElementById('edit-rules').innerHTML = out;
};

/**
 * 등록/수정 API 요청
 * @returns {Promise<void>}
 */
vio.deskEditFixed = async function() {
    const dom = document,
        method = this._idn === 0 ? 'PUT' : 'PATCH';

    try {
        this.netAble(true);

        const params = {
            idn:       this._idn,
            nickname:  dom.getElementById('edit-nickname').value.trim(),
            addressRead:  dom.getElementById('edit-addressRead').value.trim(),
            addressWrite:  dom.getElementById('edit-addressWrite').value.trim(),
            addressRule:  dom.getElementById('edit-addressRule').value.trim(),
            delayTime: parseInt(dom.getElementById('edit-delayTime').value),
            isEnable: parseInt(dom.getElementById('edit-isEnable').value),
            unit: parseInt(dom.getElementById('edit-unit').value),
            ruleUnit: parseInt(dom.getElementById('edit-ruleUnit').value),
            rules: [],
        }

        // 제어조건
        let rule = {};
        for(const item of dom.getElementById('edit-rules').querySelectorAll('input')){
            rule[item.name] = item.value;
            if(item.name == 'idn'){
                if(rule.rateMin != 0 || rule.rateMax != 0 || rule.control != 0){
                    params.rules.push(rule);
                }
                rule = {}
            }
        }

        if (params['nickname'] === '') {
            dom.getElementById('edit-nickname').focus();
            throw new Error('이름을 입력해 주세요.');
        }
        if (params.delayTime < 0 || params.delayTime > 240) {
            dom.getElementById('edit-delayTime').focus();
            throw new Error('제어 딜레이는 0 ~ 240 까지 입력 가능합니다.');
        }

        const res = await fetch(`api/plc-panels/${this._fid}`, {
            method: method,
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

            switch (jsonData.cat) {
                case 1:
                    this.hidePop();
                    this.getData(this._page);
                    break;
                case 3:
                    throw new Error('중복된 [제어주소]입니다.');
                default:
                    throw new Error('처리중 문제가 발생했습니다.');
            }
        }
    } catch (e) {
        this.toast({memo: e.message});
    } finally {
        this.netAble(false);
    }
};

/**
 * 삭제 API 요청
 * @returns {Promise<void>}
 */
vio.deskDropFixed = async function() {
    try {
        this.netAble(true);

        const res = await fetch(`api/plc-panels/${this._fid}?idn=${this._idn}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            switch (jsonData.cat) {
                case 1:
                    this.hidePop();
                    this.getData(this._page);
                    break;
                default:
                    throw new Error('처리중 문제가 발생했습니다.');
            }
        }
    } catch (e) {
        this.toast({memo: e.message});
    } finally {
        this.netAble(false);
    }
};

/**
 * 팝업 숨기기
 */
vio.hidePop = function() {
    vio._idn = 0;
    document.getElementById('modal').classList.add('disable');
};

/**
 * 이벤트 리스너 등록
 */
vio.addEventListenerPlc = function() {
    const dom = document;
    
    // 버튼 이벤트
    for (let element of dom.getElementById('deskTool').children) {
        switch (element.getAttribute('data-act')) {
            case 'add':
                element.addEventListener('click', function() {
                    vio._idn = 0;
                    vio.deskEditPop({});
                });
                break;
        }
    }
    dom.getElementById('modalActCancel').addEventListener('click', function() {
        vio.hidePop();
    });
    dom.getElementById('modalActClose').addEventListener('click', function() {
        vio.hidePop();
    });
    dom.getElementById('modalActDone').addEventListener('click', async function() {
        await vio.deskEditFixed();
    });

    // 상세 팝업
    dom.getElementById('deskList').addEventListener('click', async function(e) {
        const target = e.target.closest('tr');
        if (target) {
            const idn = target.getAttribute('data-idn');
            await vio.deskItem(idn);
        }
    });

    // 삭제
    dom.getElementById('modalActRemove').addEventListener('click', function() {
        vio.dialog({act: 'open', tag: 'deskDropFixed', memo: '정말 삭제하시겠습니까?<br/>되돌릴 수 없습니다.'});
    });

    // 제어범위
    dom.getElementById('actAddRule').addEventListener('click', function() {
        document.getElementById('edit-rules').insertAdjacentHTML('beforeend', vio._deskEditFormRule);
    });
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.getData();
    await vio.addEventListenerPlc();
});
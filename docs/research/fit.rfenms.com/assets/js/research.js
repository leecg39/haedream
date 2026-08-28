'use strict';

vio._quarterMonth = new Date().toLocaleString('sv-SE').substr(0,7);
vio._requestNo = 0; // 요청횟수 제어용
vio._researchDom = null;
vio._researchView = '';
vio._chargeSignature = '';
vio._quarterSignature = '';
vio._researchStatusText = Object.freeze({
    0: '스케줄 없음',
    8: '계정정보 없음',
    9: '로그인 실패',
    11: '수집요청',
    12: '월별 청구서 진행중',
    13: '월별 청구서 완료',
    14: '월별 청구서 에러',
    21: '전력데이터 수집요청',
    22: '15분 전력 진행중',
    23: '15분 전력 완료',
    24: '15분 전력 에러',
    32: '시간대별 전력 진행중',
    33: '시간대별 전력 완료',
    34: '시간대별 전력 에러',
});

vio.setResearchText = function(element, value){
    if(!element){
        return;
    }

    const nextValue = String(value);
    if(element.textContent !== nextValue){
        element.textContent = nextValue;
    }
};

vio.setResearchClass = function(element, className, enabled){
    if(element && element.classList.contains(className) !== enabled){
        element.classList.toggle(className, enabled);
    }
};

vio.cacheResearchDom = function(){
    const researchInfo = document.getElementById('researchInfo'),
        info = Object.create(null);

    for(const element of researchInfo.querySelectorAll('[data-name]')){
        info[element.getAttribute('data-name')] = element;
    }

    this._researchDom = {
        info,
        data: document.getElementById('researchData'),
        charges: document.getElementById('researchCharges'),
        quarter: document.getElementById('researchQuarter'),
        request: document.getElementById('researchRequest'),
    };
};


vio.randerQuarter = function(data){
    let out = `
    <span class="researchDataLabel">
        <input class="researchDate" type="month" value="${this._quarterMonth}" onchange="vio.getQuarter(this.value)" />
    </span>`;

    // 해당월의 마지막 날짜
    const thisDate = new Date(`${this._quarterMonth}-01 00:00:00`),
        thisTime = thisDate.getTime() / 1000;
    thisDate.setMonth(thisDate.getMonth() + 1);
    thisDate.setDate(0);
    const thisEndDate = thisDate.getDate();

    for(let day = 1; day <= thisEndDate; day++){
        out = `${out}<span class="researchDataLabel">${day}일</span>`;
    }

    // 15분별 데이터 한달 00:15 ~ 24:00
    for(let quarterIndex = 1; quarterIndex <= 96; quarterIndex++){
        out = `${out}<span>${Math.floor(quarterIndex / 4).toString().padStart(2, '0')}:${['00','15','30','45'][quarterIndex % 4]}</span>`;
        for(let day = 1; day <= thisEndDate; day++){
            const quarterTime = thisTime + day * 86400 - 86400 + quarterIndex * 900; // 00:15 ~
            if(data.hasOwnProperty(quarterTime)){
                out = `${out}<span>${Math.round(data[quarterTime] * 0.004).toLocaleString('ko-KR')}</span>`; // Wh -> kW
            }else{
                out = `${out}<span>0</span>`;
            }
        }
    }

    this._researchDom.data.style.setProperty('grid-template-columns',`repeat(${thisEndDate + 1}, 1fr)`);
    this._researchDom.data.innerHTML = out;
    this._researchView = 'quarter';
};


vio.getQuarter = async function(quarterMonth){
    this._quarterMonth = quarterMonth || new Date().toLocaleString('sv-SE').substr(0,7);

    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`${this._apiUrl}/api/research/${this._fid}/quarter/${this._quarterMonth}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${this._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);
            switch (jsonData.cat) {
                case 9:
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    const quarterSignature = `${this._quarterMonth}:${JSON.stringify(jsonData.data)}`;
                    if(this._researchView !== 'quarter' || this._quarterSignature !== quarterSignature){
                        this._quarterSignature = quarterSignature;
                        this.randerQuarter(jsonData.data);
                    }
                    break;
                default:
                    this.toast({ memo: '데이터가 존재하지 않습니다.' });
            }
        }
    }
};


vio.randerCharge = function(data){
    let out = `
    <span class="researchDataLabel">일자</span>
    <span class="researchDataLabel">검침일</span>
    <span class="researchDataLabel">요금적용전력</span>
    <span class="researchDataLabel">기본요금</span>
    <span class="researchDataLabel">전력량요금</span>
    <span class="researchDataLabel">청구요금</span>
    <span class="researchDataLabel">경부하전력량</span>
    <span class="researchDataLabel">중부하전력량</span>
    <span class="researchDataLabel">최대부하전력량</span>
    <span class="researchDataLabel">지상역률</span>
    <span class="researchDataLabel">진상역률</span>`;

    for(const charge of data){
        out = `${out}
        <span>${charge.bill_ym}</span>
        <span>${charge.mr_ymd}</span>
        <span>${charge.bill_aply_pwr.toLocaleString('ko-KR')}</span>
        <span>${charge.base_bill.toLocaleString('ko-KR')}</span>
        <span>${charge.kwh_bill.toLocaleString('ko-KR')}</span>
        <span>${charge.req_bill.toLocaleString('ko-KR')}</span>
        <span>${charge.lload_usekwh.toLocaleString('ko-KR')}</span>
        <span>${charge.mload_usekwh.toLocaleString('ko-KR')}</span>
        <span>${charge.maxload_usekwh.toLocaleString('ko-KR')}</span>
        <span>${charge.ji_pwrfact}</span>
        <span>${charge.jn_pwrfact}</span>`;
    }

    this._researchDom.data.style.setProperty('grid-template-columns',`repeat(11, auto)`);
    this._researchDom.data.innerHTML = out;
    this._researchView = 'charge';
};


vio.getCharge = async function(){
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`${this._apiUrl}/api/research/${this._fid}/charge`, {
            method: 'GET', headers: {'Authorization': `x-auth ${this._accessToken}`, 'Content-Type': 'application/json;charset=utf-8'}
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            this.netAble(false);
            switch (jsonData.cat) {
                case 9:
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    const chargeSignature = JSON.stringify(jsonData.data);
                    if(this._researchView !== 'charge' || this._chargeSignature !== chargeSignature){
                        this._chargeSignature = chargeSignature;
                        this.randerCharge(jsonData.data);
                    }
                    break;
                default:
                    this.toast({ memo: '데이터가 존재하지 않습니다.' });
            }
        }
    }
};


vio.setResearch = async function(){
    const res = await fetch(`${this._apiUrl}/api/research/${this._fid}/request`, {
        method: 'GET', headers: {'Authorization': `x-auth ${this._accessToken}`, 'Content-Type': 'application/json;charset=utf-8'}
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();
        switch (jsonData.cat) {
            case 9:
                this.toast({ memo: '권한이 없습니다.' });
                break;
            case 1:
                this.setResearchText(this._researchDom.info.kepcoStatus, '수집요청');
                this.toast({ memo: '데이터 수집 스케줄이 등록되었습니다.' });
                break;
            default:
                this.toast({ memo: '실행할 수 있는 데이터가 없습니다.' });
        }
    }
};


vio.randerBaseInfo = function(data){
    const info = this._researchDom.info,
        hasCyber = Object.prototype.hasOwnProperty.call(data, 'kepcoCyber'),
        inProgress = [11,12,22,32].includes(data.kepcoStatus);

    this.setResearchText(info.contract, data.contract || '없음');
    this.setResearchText(info.kepcoCyber, hasCyber ? data.kepcoCyber.toString().padStart(10, '0') : '설정필요');
    this.setResearchText(info.kepcoPasswd, data.kepcoPasswd || '설정필요');
    this.setResearchText(info.kepcoStatus, this._researchStatusText[data.kepcoStatus] || '없음');
    this.setResearchText(info.kepcoTime, data.kepcoTime == 0 ? '업데이트정보 없음' : this.echoDate('y.m.d h:i:s', data.kepcoTime));
    this.setResearchText(info.kepcoProgress, inProgress ? (data.kepcoStatus == 11 ? '수집 대기중' : '수집중') : '수집 요청');
    this.setResearchClass(info.kepcoProgress, 'progress', inProgress);

    // 수집중일때 월별 요금정보 데이터 갱신
    if(data.kepcoStatus == 12 && this._researchDom.charges.classList.contains('active')){
        this._requestNo += 1;
        if(this._requestNo % 4 == 0){
            this.getCharge();
        }
    }
};


vio.getBase = async function(){
    const res = await fetch(`${this._apiUrl}/api/research/${this._fid}/base`, {
        method: 'GET', headers: {'Authorization': `x-auth ${this._accessToken}`, 'Content-Type': 'application/json;charset=utf-8'}
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();
        switch (jsonData.cat) {
            case 9:
                this.toast({ memo: '권한이 없습니다.' });
                break;
            case 1:
                this.randerBaseInfo(jsonData.data);
                break;
            default:
                this.toast({ memo: '실행할 수 있는 데이터가 없습니다.' });
        }
    }

    setTimeout(function(){
        vio.getBase();
    }, 2048);
};


window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    vio.cacheResearchDom();

    // 월별 청구정보
    vio._researchDom.charges.addEventListener('click', function () {
        this.classList.add('active');
        this.nextElementSibling.classList.remove('active');
        vio.getCharge();
    });

    // 시간별 전력사용량
    vio._researchDom.quarter.addEventListener('click', async function () {
        this.classList.add('active');
        this.previousElementSibling.classList.remove('active');
        vio.getQuarter();
    });

    // 수집 요청
    vio._researchDom.request.addEventListener('click', function () {
        vio.setResearch();
    });

    vio.getBase();
    vio.getCharge();
});

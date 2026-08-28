'use strict';
// 그룹에 표시는 전압(220/389/440)은 빈도수가 높은 전압을 평균으로 출력한다. v500 이상은 하나로
vio._monit = {};
vio._monitGroup = [];
vio._monitFid = 0;

vio._enablePopGroup = false;
vio._thisPopGroup = '';

// f488 - TI300 정보를 계산하기 위한 주요 설비 현재정보 보관
vio._tempData = {
    10648: {MAIN: 10736, TI300: 10649, watt: 0, ampere: 0},
    10650: {MAIN: 10737, TI300: 10651, watt: 0, ampere: 0},
    10653: {MAIN: 10738, TI300: 10652, watt: 0, ampere: 0},
    10654: {MAIN: 10739, TI300: 10655, watt: 0, ampere: 0},
    10657: {MAIN: 10735, TI300: 10661, watt: 0, ampere: 0},
    10662: {MAIN: 10734, TI300: 10663, watt: 0, ampere: 0},
    10664: {MAIN: 10733, TI300: 10665, watt: 0, ampere: 0},
    10666: {MAIN: 10732, TI300: 10667, watt: 0, ampere: 0},
    10732: {watt: 0, ampere: 0},
    10733: {watt: 0, ampere: 0},
    10734: {watt: 0, ampere: 0},
    10735: {watt: 0, ampere: 0},
    10736: {watt: 0, ampere: 0},
    10737: {watt: 0, ampere: 0},
    10738: {watt: 0, ampere: 0},
    10739: {watt: 0, ampere: 0},
    // 사무동 3층 메인
    11735: {watt: 0, ampere: 0},
    11736: {watt: 0, ampere: 0},
    11737: {watt: 0, ampere: 0},
};

vio.dataPowerTrans = function (power) { // [업체순서][ 현재전력,예측전력,목표전력,EOI,seq ]
    let dom = document;

    // 그룹업체별 현재전력/예측전력 표시
    let groupKepco = null,
        groupKepcoCurrent = 0,
        groupKepcoPredict = 0;
    if(dom.getElementById('groupKepco')){
        groupKepco = dom.getElementById('groupKepco').querySelectorAll('[data-kepco]');
    }

    // 피크정보
    const powerLen = power.length;
    for(let index = 0; index < powerLen; ++index){
        if(dom.getElementById(`pwBest${index}`)){
            dom.getElementById(`pwBest${index}`).textContent = power[index][2];
            dom.getElementById(`pwPredict${index}`).textContent = power[index][1];
            dom.getElementById(`pwDic${index}`).textContent = Math.round(power[index][2] * power[index][3] / 900);
            dom.getElementById(`pwThis${index}`).textContent = power[index][0];
        }

        if(groupKepco !== null){
            groupKepcoCurrent += power[index][0];
            groupKepcoPredict += power[index][1];
            groupKepco[index * 2].textContent = power[index][0];
            groupKepco[index * 2 + 1].textContent = power[index][1];
        }
    }

    if(groupKepco !== null){
        groupKepco[powerLen * 2].textContent = groupKepcoCurrent;
        groupKepco[powerLen * 2 + 1].textContent = groupKepcoPredict;
    }
};


// 특정데이터 출력
vio.dataPowerExtend = function(data){
    if(document.getElementById('groupExtend')){
        for(const item of document.getElementById('groupExtend').querySelectorAll('[data-kepco]')){
            const tabName = item.getAttribute('data-kepco');
            if(data.hasOwnProperty(tabName)){
                item.textContent = data[tabName];
            }
        }
    }
}


vio.dataTrans = function(j) { // [ 고유아이디, 유효전력, 평균전압, 평균전류, 계측기타입, 추가정보, 연결상태 ]
    const dom = document;

    // 팝업그룹 전체전력/전압/전류
    const popGroup = {watt: 0, volt: 0, ampere: 0, count: 0};

    // 제외할 푸드센터값 실시간처리
    let subTask = 0;
    if (this._monitFid == 151) {
        for (let ia = 0; ia < j.length; ++ia) {
            if (j[ia][0] == 11101) {
                subTask = j[ia][1];
            }
        }
    }

    for (let ia = 0; ia < j.length; ++ia) {
        const ta = j[ia];
        let gName = this._monit[ta[0]];
        if (!gName) {
            //console.log(ta[0]);
            continue;
        }

        // 그룹데이터 합산
        let mGroup = this._monitGroup[gName];
        mGroup.p += ta[1];
        if (ta[2] > 500) {
            mGroup.v500ea += 1;
            mGroup.v500 += ta[2];
        } else if (ta[2] > 400) {
            mGroup.v440ea += 1;
            mGroup.v440 += ta[2];
        } else if (ta[2] > 340) {
            mGroup.v380ea += 1;
            mGroup.v380 += ta[2];
            if (ta[0] == 12780) {
                // 연속로1호기 본로에 해당하는 전압이 기준으로 될 수 있도록 한성
                mGroup.v380ea += 4;
                mGroup.v380 += ta[2] * 4;
            }
        } else if (ta[2] > 200) {
            mGroup.v220ea += 1;
            mGroup.v220 += ta[2];
        }
        mGroup.a += ta[3];
        mGroup.aLen += ta[3] ? 1 : 0;

        if (ta[0] == 11102) {
            // 헬스 = 헬스 - 푸드
            mGroup.p -= subTask;
        }

        // 특정 그룹
        if (this._monit.hasOwnProperty(gName)) {
            gName = this._monit[gName];
            mGroup = this._monitGroup[gName];
            mGroup.p += ta[1];

            mGroup.a += ta[3];
            mGroup.aLen += ta[3] ? 1 : 0;

            if (ta[2] > 500) {
                mGroup.v500ea += 1;
                mGroup.v500 += ta[2];
            } else if (ta[2] > 400) {
                mGroup.v440ea += 1;
                mGroup.v440 += ta[2];
            } else if (ta[2] > 340) {
                mGroup.v380ea += 1;
                mGroup.v380 += ta[2];
            } else if (ta[2] > 200) {
                mGroup.v220ea += 1;
                mGroup.v220 += ta[2];
            }
        }

        if (!dom.getElementById('pid' + ta[0])) {
            continue;
        }
        const dt = dom.getElementById('pid' + ta[0]).children;
        if ([3, 10, 15, 16, 18, 26, 29, 32].includes(ta[4])) {
            // 3:가스 10:가스 15:스팀 16:용수 18:공기압축, 26:가스
            dt[4].textContent = ta[5].toFixed(1);
            // 스팀만 사용하므로 스팀합계
            mGroup.flux += ta[5];
            // 3:가스 적산값 표시
            if ([3, 26, 29, 32].includes(ta[4])) {
                dt[2].textContent = ta[7].toLocaleString('ko-KR');
                mGroup.fluxTo += ta[7];
            }

            dt[0].parentElement.previousElementSibling.classList.toggle('noConn', ta[6] == 0);
        } else {
            dt[0].textContent = (ta[1] / 1000).toFixed(1);
            if(ta[0] == 10729){
                // ID 488 업체 전압단위 변경
                dt[2].textContent = (ta[2] / 1000).toFixed(1);
            }else{
                dt[2].textContent = ta[2].toFixed(1);
            }
            dt[4].textContent = ta[3].toFixed(1);

            let mItemName = dt[0].parentElement.previousElementSibling;
            if (this._monitFid == 146) {
                mItemName.classList.toggle('redLine', ta[3] > 5);
            } else {
                mItemName.classList.toggle('noConn', ta[6] == 0);
            }

            /*
            f488 - TI300 정보표시
            TI300 데이터 계산
            MAIN - TI100 = TI300
            10732 10666 10667
            10733 10664 10665
            10734 10662 10663
            10735 10657 10661
            10739 10654 10655
            10738 10653 10652
            10737 10650 10651
            10736 10648 10649
            */
            if(this._fid == 488){
                if(
                    (ta[0] >= 10732 && ta[0] <= 10739) ||
                    [10648, 10650, 10653, 10654, 10657, 10662, 10664, 10666].includes(ta[0])
                ){
                    this._tempData[ta[0]].watt = ta[1];
                    this._tempData[ta[0]].ampere = ta[3];

                    switch(ta[0]){
                    case 10648:
                    case 10650:
                    case 10653:
                    case 10654:
                    case 10657:
                    case 10662:
                    case 10664:
                    case 10666:
                        const mainModbus = this._tempData[this._tempData[ta[0]].MAIN];
                        const elements = dom.getElementById(`pid${this._tempData[ta[0]].TI300}`).children;
                        if(ta[1] > 0 && mainModbus.watt > 0){
                            elements[0].textContent = ((mainModbus.watt - ta[1]) / 1000).toFixed(1);
                        }else{
                            elements[0].textContent = '0.0';
                        }
                        if(ta[3] > 0 && mainModbus.ampere > 0){
                            elements[4].textContent = (mainModbus.ampere - ta[3]).toFixed(1);
                        }else{
                            elements[4].textContent = '0.0';
                        }
                        elements[2].textContent = ta[2].toFixed(1);
                        break;
                    }
                }else if([11735, 11736, 11737].includes(ta[0])){
                    this._tempData[ta[0]].watt = ta[1] / 1000;
                    this._tempData[ta[0]].ampere = ta[3];

                    if(ta[0] == 11737){
                        const elements = dom.getElementById(`pid11733`).children;
                        elements[0].textContent = (this._tempData[11737].watt - (this._tempData[11735].watt + this._tempData[11736].watt)).toFixed(1);
                        elements[4].textContent = (this._tempData[11737].ampere - (this._tempData[11735].ampere + this._tempData[11736].ampere)).toFixed(1);
                        elements[2].textContent = ta[2].toFixed(1);
                        elements[0].parentElement.previousElementSibling.classList.remove('noConn');
                    }
                }
            }

            // 역률표시
            if(mItemName.previousElementSibling.style.visibility == 'visible'){
                mItemName.previousElementSibling.textContent = `PF ${ta[5].toFixed(1)}`;
            }

            // 팝업그룹 출력부분
            if (this._thisPopGroup) {
                const pop = dom.getElementById(this._thisPopGroup).querySelector(`[data-id="${ta[0]}"]`);
                if (pop) {
                    const popItems = pop.children;
                    popItems[0].textContent = (ta[1] / 1000).toFixed(1);
                    popItems[2].textContent = ta[2].toFixed(1);
                    popItems[4].textContent = ta[3].toFixed(1);

                    popGroup.watt += ta[1];
                    popGroup.volt += ta[2];
                    popGroup.ampere += ta[3];
                    popGroup.count += 1;
                }
            }
        }
    }

    // 팝업그룹 전체전력/전압/전류
    if (this._thisPopGroup && dom.getElementById(`${this._thisPopGroup}Pannel`)) {
        const pannel = dom.getElementById(`${this._thisPopGroup}Pannel`).children;
        pannel[0].textContent = (popGroup.watt / 1000).toFixed(0);
        pannel[2].textContent = (popGroup.volt / popGroup.count).toFixed(1);
        pannel[4].textContent = (popGroup.ampere).toFixed(1);
    }

    for (let gName in this._monitGroup) {
        const dt = dom.getElementById(gName).children,
            mGroup = this._monitGroup[gName];

        if (this._monitFid == 147) {
            if (gName == 'group1') {
                // TR-A 보정
                mGroup.p *= 1.12;
            } else if (gName == 'group2') {
                // TR-B 보정
                mGroup.p *= 1.72;
            }
        }

        if (dt.length == 0) {
            continue;
        } else if (dt[0].classList.contains('mItemAmount')) {
            if (mGroup.v500ea >= mGroup.v440ea && mGroup.v500ea >= mGroup.v380ea && mGroup.v500ea >= mGroup.v220ea) {
                mGroup.v = mGroup.v500;
                mGroup.vLen = mGroup.v500ea;
            } else if (mGroup.v440ea >= mGroup.v500ea && mGroup.v440ea >= mGroup.v380ea && mGroup.v440ea >= mGroup.v220ea) {
                mGroup.v = mGroup.v440;
                mGroup.vLen = mGroup.v440ea;
            } else if (mGroup.v380ea >= mGroup.v500ea && mGroup.v380ea >= mGroup.v440ea && mGroup.v380ea >= mGroup.v220ea) {
                mGroup.v = mGroup.v380;
                mGroup.vLen = mGroup.v380ea;
            } else {
                mGroup.v = mGroup.v220;
                mGroup.vLen = mGroup.v220ea;
            }
            dt[0].textContent = mGroup.p ? (mGroup.p / 1000).toFixed(1) : '0.0';
            dt[2].textContent = mGroup.v ? (mGroup.v / mGroup.vLen).toFixed(1) : '0.0';
            dt[4].textContent = (mGroup.a).toFixed(1);
        } else if (dt[0].getAttribute('data-type') == 'steam') {
            // 스팀그룹
            dt[3].textContent = mGroup.flux ? (mGroup.flux).toFixed(1) : '0.0';
        } else if (dt[0].getAttribute('data-type') == 'solar') {
            // 태양광그룹
            dt[3].textContent = mGroup.p ? (mGroup.p / 1000).toFixed(1) : '0.0';
        } else if (dt[0].getAttribute('data-type') == 'gas') {
            // 가스그룹
            dt[3].textContent = mGroup.fluxTo ? mGroup.fluxTo.toLocaleString('ko-KR', {maximumFractionDigits: 1}) : '0.0';
            dt[5].textContent = mGroup.flux ? (mGroup.flux).toFixed(1) : '0.0';
        } else if (dt[0].getAttribute('data-type') == 'power') {
            if (mGroup.v500ea >= mGroup.v440ea && mGroup.v500ea >= mGroup.v380ea && mGroup.v500ea >= mGroup.v220ea) {
                mGroup.v = mGroup.v500;
                mGroup.vLen = mGroup.v500ea;
            } else if (mGroup.v440ea >= mGroup.v500ea && mGroup.v440ea >= mGroup.v380ea && mGroup.v440ea >= mGroup.v220ea) {
                mGroup.v = mGroup.v440;
                mGroup.vLen = mGroup.v440ea;
            } else if (mGroup.v380ea >= mGroup.v500ea && mGroup.v380ea >= mGroup.v440ea && mGroup.v380ea >= mGroup.v220ea) {
                mGroup.v = mGroup.v380;
                mGroup.vLen = mGroup.v380ea;
            } else {
                mGroup.v = mGroup.v220;
                mGroup.vLen = mGroup.v220ea;
            }
            dt[3].textContent = mGroup.p ? (mGroup.p / 1000).toFixed(1) : '0.0';
            dt[5].textContent = mGroup.v ? (mGroup.v / mGroup.vLen).toFixed(1) : '0.0';
            dt[7].textContent = (mGroup.a).toFixed(1);
        } else if (!dt[0].classList.contains('mItemGhost')) {
            if (mGroup.v500ea >= mGroup.v440ea && mGroup.v500ea >= mGroup.v380ea && mGroup.v500ea >= mGroup.v220ea) {
                mGroup.v = mGroup.v500;
                mGroup.vLen = mGroup.v500ea;
            } else if (mGroup.v440ea >= mGroup.v500ea && mGroup.v440ea >= mGroup.v380ea && mGroup.v440ea >= mGroup.v220ea) {
                mGroup.v = mGroup.v440;
                mGroup.vLen = mGroup.v440ea;
            } else if (mGroup.v380ea >= mGroup.v500ea && mGroup.v380ea >= mGroup.v440ea && mGroup.v380ea >= mGroup.v220ea) {
                mGroup.v = mGroup.v380;
                mGroup.vLen = mGroup.v380ea;
            } else {
                mGroup.v = mGroup.v220;
                mGroup.vLen = mGroup.v220ea;
            }
            dt[2].textContent = mGroup.p ? (mGroup.p / 1000).toFixed(1) : '0.0';
            dt[5].textContent = mGroup.v ? (mGroup.v / mGroup.vLen).toFixed(1) : '0.0';
            dt[8].textContent = (mGroup.a).toFixed(1);
        }
        mGroup.p = 0; // 전력량
        mGroup.v = 0; // 전압
        mGroup.v500 = 0;
        mGroup.v440 = 0;
        mGroup.v380 = 0;
        mGroup.v220 = 0;
        mGroup.v500ea = 0;
        mGroup.v440ea = 0;
        mGroup.v380ea = 0;
        mGroup.v220ea = 0;
        mGroup.a = 0; // 전류
        mGroup.vLen = 0;
        mGroup.aLen = 0;
        mGroup.flux = 0;
        mGroup.fluxTo = 0;
    }

    setTimeout(function() {
        vio.getData();
    }, 1024);
};

vio.getData = async function() {
    if (!this._useNetworks) {
        const res = await fetch(`api/monits/${this._fid}`, {
            method: 'POST',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: `{"cf":"get"}`
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
                    this.dataPowerTrans(jsonData.power);
                    this.dataTrans(jsonData.data);
                    this.dataPowerExtend(jsonData.powerExtend);
                    break;
                default:
                    this.toast({memo: '데이터가 존재하지 않습니다.'});
            }
        }
    }
};

// 설비이름을 디비에 있는 것으로 적용한다
vio.setModbusName = function(modbusList) {
    const dom = document;
    this._monitFid = dom.getElementById('firmSelect').value;

    for (let {pid, gid, md_id, lp_number, lp_name} of modbusList) {
        const dt = dom.getElementById(`pid${pid}`);
        lp_name = lp_name.toString().replace(/－/g, '-');

        if (dt && dt.previousElementSibling.classList.contains('mItemName')) {
            dt.previousElementSibling.textContent = lp_name;
            dt.parentElement.setAttribute('title', `${this._md[md_id].name}${gid != 0 ? `\nRTU ${gid} : ${lp_number}`:''}\n${lp_name}`);

            // 전력 역률표시 활성
            if(![0, 3, 10, 15, 16, 18, 26].includes(md_id)){
                const element = dt.previousElementSibling.previousElementSibling;
                element.style.visibility = 'visible';
                element.textContent = 'PF';
            }
        }

        // 팝업용
        if (this._enablePopGroup) {
            let pop = dom.getElementById('popGroupMember').querySelectorAll(`[data-id="${pid}"]`);
            for (let ib = 0; ib < pop.length; ++ib) {
                pop[ib].previousElementSibling.textContent = lp_name;
                pop[ib].parentElement.setAttribute('title', lp_name);
            }
        }
    }
};

vio.getModbusName = async function() {
    const res = await fetch(`api/monits/${this._fid}`, {
        method: 'POST',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: `{"cf":"name"}`
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
                this.setModbusName(jsonData.data);
                break;
            default:
                this.toast({memo: '데이터가 존재하지 않습니다.'});
        }
    }
};


// 해상도에 맞추기
vio.syncResize = function() {
    let ia = Math.floor(window.innerWidth * 28 / 3840 * 100) / 100;

    if (ia < 8) {
        ia = 8;
    } else if (ia > 30) {
        ia = 30;
    }
    document.documentElement.style.fontSize = `${ia}px`;
};

vio.monitReady = async function() {
    const dom = document;

    try {
        const res = await fetch(`monit/f${this._fid}.html`);
        const fileName = res.url.match(/\/([^\/#]+)\.html/)[1];

        if (fileName !== `f${this._fid}`) {
            throw new Error('유효하지 않은 경로');
        }

        dom.getElementById('monitArea').innerHTML = await res.text();
    } catch (error) {
        const res = await fetch('monit/exam.html');
        dom.getElementById('monitArea').innerHTML = await res.text();
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.monitReady();
    await vio.documentReady();
    const dom = document;

    for (let ia = 1; ia < 32; ++ia) {
        if (!dom.getElementById('group' + ia)) {
            break;
        }
        const gName = 'group' + ia,
            tb = dom.getElementById(gName).getAttribute('data-group').split(',');

        for (let ib = 0; ib < tb.length; ++ib) {
            vio._monit[tb[ib]] = gName;
        }
        vio._monitGroup[gName] = {
            v: 0,
            v220: 0,
            v380: 0,
            v440: 0,
            v500: 0,
            v220ea: 0,
            v380ea: 0,
            v440ea: 0,
            v500ea: 0,
            a: 0,
            p: 0,
            vLen: 0,
            aLen: 0,
            flux: 0,
            fluxTo: 0
        };
    }

    // 그룹별 팝업
    if (dom.getElementById('mGroup')) {
        vio._enablePopGroup = true;
        dom.getElementById('mGroup').addEventListener('change', function() {
            if (vio._thisPopGroup != this.value) {
                if (this.value != '') {
                    document.getElementById(this.value).classList.remove('disable');
                }
                if (vio._thisPopGroup != '') {
                    document.getElementById(vio._thisPopGroup).classList.add('disable');
                }
                vio._thisPopGroup = this.value;
            }
        });

        let dt = dom.getElementById('popGroupMember').querySelectorAll('[data-act="popClose"]');
        dt.forEach(function(item) {
            item.addEventListener('click', function() {
                this.parentElement.parentElement.classList.add('disable');
                vio._thisPopGroup = '';
            });
        });
    }

    // 계통감시도 설비이름 갱신
    vio.getModbusName();
    // 실시간 계통감시 데이터
    vio.getData();

    // 화면해상도에 맞춰 글자크기 변경
    vio.syncResize();
    window.addEventListener('resize', function() {
        vio.syncResize();
    });

    // 시간표시
    if(dom.getElementById('mInfoClock')){
        setInterval(function(){
            const mInfoClock = document.getElementById("mInfoClock");
            mInfoClock.textContent = getClockEmoji();
            mInfoClock.nextElementSibling.textContent = new Date().toLocaleString('sv-SE');
        }, 1000);
    }
});


/*
30분 단위 이모지 텍스트
params
    없음
return
    string 이모지
*/
function getClockEmoji() {
    const now = new Date(),
        minutes = now.getMinutes();
    let hours = now.getHours();

    // 12시간제로 변환
    hours = hours % 12;
    hours = hours ? hours : 12;

    // 30분이 넘었는지 여부
    const isHalfHour = minutes >= 30;

    // 12시간제 시계 이모지 매핑
    const clockMap = {
    1:  { exact: "🕐", half: "🕜" },
    2:  { exact: "🕑", half: "🕝" },
    3:  { exact: "🕒", half: "🕞" },
    4:  { exact: "🕓", half: "🕟" },
    5:  { exact: "🕔", half: "🕠" },
    6:  { exact: "🕕", half: "🕡" },
    7:  { exact: "🕖", half: "🕢" },
    8:  { exact: "🕗", half: "🕣" },
    9:  { exact: "🕘", half: "🕤" },
    10: { exact: "🕙", half: "🕥" },
    11: { exact: "🕚", half: "🕦" },
    12: { exact: "🕛", half: "🕧" }
    };

    const currentClock = clockMap[hours];
    return isHalfHour ? currentClock.half : currentClock.exact;
}
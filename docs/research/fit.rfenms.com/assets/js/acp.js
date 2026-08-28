'use strict';

vio._acpIdn = 0;
vio._floorMap = {};
vio._acpExtendIdn = 0;

vio.editFixedAir = async function () {
    const params = {
        cf: 'edit',
        idn: this._acpIdn,
        acpType: document.getElementById('acpType').value,
        ip: document.getElementById('acpIp').value,
        portNo: document.getElementById('acpPort').value,
        id: document.getElementById('acpId').value,
        passwd: document.getElementById('acpPasswd').value,
        isLocal: document.getElementById('acpIsLocal').checked ? 1 : 0,
        ratePeak: document.getElementById('acpRatePeak').nextElementSibling.value,
        controlMode: document.getElementById('acpControlMode').value,
        statPeak: document.getElementById('acpStatPeak').classList.contains('active') ? 1 : 0,
        isAlarmPeak: 0,
        isAlarmBad: 0
    };
    if (!params.ip) {
        this.toast({ memo: 'IP 정보를 입력해주세요.' });
    } else if (!params.portNo) {
        this.toast({ memo: 'PORT 정보를 입력해주세요.' });
    } else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`${this._apiUrl}/api/acp/${this._fid}`, {
            method: 'PATCH',
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

            this.netAble(false);
            switch (jsonData.cat) {
                case 9:
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    this.toast({ memo: '저장 되었습니다.' });
                    document.getElementById('modal').classList.add('disable');
                    break;
                default:
                    this.toast({ memo: '데이터가 존재하지 않습니다.' });
            }
        }
    }

};


vio.randerMap = function(mapCode){
    if(this._floorMap.hasOwnProperty(mapCode)){
        document.getElementById('floorMapImage').src = `//temps.rfenms.com/floor/${this._floorMap[mapCode].floorFile}`;
        document.getElementById('floorPlanName').textContent = this._floorMap[mapCode].floorName;
    }
};


vio.randerAirStat = function (acpItem) {
    const connColors = ['#d32f2f', '#cc3d32', '#c84533', '#c54c34', '#c15436', '#bd5b37', '#ba6238', '#b66a3a', '#b3713b', '#af793d', '#ac803e', '#a8883f', '#a48f40', '#a19742', '#9d9e43', '#9aa544', '#96ad46', '#92b447', '#8fbc49', '#8bc34a'];

    // 운전방식
    document.getElementById('acpPeakType').textContent = acpItem.peakType;

    // 통신상태
    let dt = document.getElementById('connStatGauge').children;
    for (let ia = 0; ia < 20; ++ia) {
        if (ia < acpItem.statConn) {
            dt[ia].style.backgroundColor = connColors[ia];
        } else {
            dt[ia].style.backgroundColor = 'rgba(80,80,80,.6)';
        }
    }

    // 희망운전률
    dt = document.getElementById('acpRateHope');
    dt.nextElementSibling.textContent = `${acpItem.rateHope}%`;
    dt = dt.children;
    for (let ia = 0, th = Math.floor(acpItem.rateHope / 5); ia < 20; ++ia) {
        if (ia < th) {
            dt[ia].classList.add('on');
        } else {
            dt[ia].classList.remove('on');
        }
    }

    // 현재운전률
    dt = document.getElementById('acpRateCurrent');
    dt.nextElementSibling.textContent = `${acpItem.rateCurrent}%`;
    dt = dt.children;
    for (let ia = 0, th = Math.floor(acpItem.rateCurrent / 5); ia < 20; ++ia) {
        if (ia < th) {
            dt[ia].classList.add('use');
        } else {
            dt[ia].classList.remove('use');
        }
    }

    dt = document.getElementById('acpOperation');
    if (acpItem.isOperation) {
        dt.classList.add('disable');
        dt.nextElementSibling.classList.remove('disable');
    } else {
        dt.classList.remove('disable');
        dt.nextElementSibling.classList.add('disable');
    }

    // 에어컨 장치목록
    let addItem = '';
    const deskList = document.getElementById('deskList');
    for(const {idn, airName, driveMode, status, temperature, setTemperature, fanspeed, mid} of acpItem.facilities){
        const element = deskList.querySelector(`[data-fanIdn="${idn}"]`);
        if(element){
            element.children[0].textContent = ['자동','냉방','난방','송풍','제습'][driveMode];
            element.children[2].textContent = status == 1 ? '정지' : '운전';
            element.children[3].textContent = `${temperature}°C`;
            element.children[4].textContent = `${setTemperature}°C`;
            element.children[5].textContent = ['자동','약풍','중풍','강풍'][fanspeed];
        }else{
            addItem = `${addItem}<tr data-fanIdn="${idn}" onclick="vio.openFanConfig(${idn})">
            <td>${['자동','냉방','난방','송풍','제습'][driveMode]}</td>
            <td>${airName}</td>
            <td>${status == 1 ? '정지' : '운전'}</td>
            <td>${temperature}°C</td>
            <td>${setTemperature}°C</td>
            <td>${['자동','약풍','중풍','강풍'][fanspeed]}</td>
            </tr>`;

            if(this._acpExtendIdn === 0 && mid !== 0){
                this._acpExtendIdn = mid; // 임시처리 다음에 기능확장할때 수정
                this.randerMap(mid);
            }
        }
    }
    if(addItem != ''){
        deskList.insertAdjacentHTML('afterbegin', addItem);
    }
};


// 시스템에어컨 현재 상태정보
vio.getAirStat = async function () {
    const params = {
        cf: 'stat',
        idn: this._acpIdn
    },
    queryString = new URLSearchParams(params).toString();

    const res = await fetch(`${this._apiUrl}/api/acp/${this._fid}?${queryString}`, {
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
        switch (jsonData.cat) {
            case 9:
                this.toast({ memo: '권한이 없습니다.' });
                break;
            case 1:
                this.randerAirStat(jsonData.data);
                break;
            default:
                this.toast({ memo: '데이터가 존재하지 않습니다.' });
        }
    }
};

// 시스템에어컨 설정값 요청하여 팝업열기
vio.openAirConfig = async function () {
    document.getElementById('modal').classList.remove('disable');

    if (this._acpIdn !== 0 && !this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'getConfig',
            idn: this._acpIdn
        },
        queryString = new URLSearchParams(params).toString();

        const res = await fetch(`${this._apiUrl}/api/acp/${this._fid}?${queryString}`, {
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
            switch (jsonData.cat) {
                case 9:
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    this.randerAirConfig(jsonData.data);
                    break;
                default:
                    this.toast({ memo: '데이터가 존재하지 않습니다.' });
            }
        }
    }
};


// 시스템에어컨 설정값
vio.randerAirConfig = function(acpItem){
    document.getElementById('acpType').value = acpItem.acpType;
    document.getElementById('acpIp').value = acpItem.ip;
    document.getElementById('acpPort').value = acpItem.portNo;
    document.getElementById('acpId').value = acpItem.id;
    document.getElementById('acpPasswd').value = acpItem.passwd;
    document.getElementById('acpIsLocal').checked = acpItem.isLocal == 1;
    document.getElementById('acpControlMode').value = acpItem.controlMode;
    document.getElementById('acpStatPeak').classList.toggle('active', acpItem.statPeak);

    // 제어시 희망운전율 0% 포함해서 21칸
    let dt = document.getElementById('acpRatePeak');
    dt.nextElementSibling.value = acpItem.ratePeak;
    dt = dt.children;
    for (let ia = 0, th = Math.floor(acpItem.ratePeak / 5) + 1; ia < 21; ++ia) {
        dt[ia].addEventListener('click', function () {
            this.parentElement.nextElementSibling.value = this.getAttribute('data-rate');
            const dt = this.parentElement.children;
            for (let ia = 0, th = Math.floor(this.getAttribute('data-rate') / 5) + 1; ia < 21; ++ia) {
                if (ia < th) {
                    dt[ia].classList.add('on');
                } else {
                    dt[ia].classList.remove('on');
                }
            }
        });
        if (ia < th) {
            dt[ia].classList.add('on');
        } else {
            dt[ia].classList.remove('on');
        }
    }
};


// 시스템에어컨 선택 리스트 설정 후 기본선택값 정보 요청
vio.baseRanderAir = function(acpItems){
    let out = '';
    for(const item of acpItems){
        out = `${out}<option value="${item.idn}">${item.nickname}</option>`;
    }

    if(out !== ''){
        document.getElementById('acpIdn').innerHTML = out;
        this._acpIdn = Number(document.getElementById('acpIdn').value);
        this.getAirStat();

        setInterval(function(){
            if(document.visibilityState === 'visible'){
                vio.getAirStat();
            }
        }, 1536);
    }
};


vio.editFixedFan = async function () {
    const params = {
        cf: 'editFan',
        aid: this._acpIdn,
        idn: this._acpIdnFan,
        setTemperature: document.getElementById('fanSetTemperature').value
    };
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`${this._apiUrl}/api/acp/${this._fid}`, {
            method: 'PATCH',
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

            this.netAble(false);
            switch (jsonData.cat) {
                case 9:
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    this.toast({ memo: '저장 되었습니다.' });
                    document.getElementById('modalFan').classList.add('disable');
                    break;
                default:
                    this.toast({ memo: '데이터가 존재하지 않습니다.' });
            }
        }
    }

};


// 설비 설정값 요청하여 팝업열기
vio.openFanConfig = async function (idn) {
    document.getElementById('modalFan').classList.remove('disable');

    this._acpIdnFan = idn;

    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'getFanConfig',
            idn: this._acpIdnFan,
            aid: this._acpIdn
        },
        queryString = new URLSearchParams(params).toString();

        const res = await fetch(`${this._apiUrl}/api/acp/${this._fid}?${queryString}`, {
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
            switch (jsonData.cat) {
                case 9:
                    this.toast({ memo: '권한이 없습니다.' });
                    break;
                case 1:
                    this.randerFanConfig(jsonData.data);
                    break;
                default:
                    this.toast({ memo: '데이터가 존재하지 않습니다.' });
            }
        }
    }
};


// 설비 설정값
vio.randerFanConfig = function(fanItem){
    document.getElementById('fanDriveMode').value = ['자동','냉방','난방','송풍','제습'][fanItem.driveMode];
    document.getElementById('fanAirName').value = fanItem.airName;
    document.getElementById('fanStatus').value = fanItem.status == 1 ? '정지' : '운전';
    document.getElementById('fanTemperature').value = fanItem.temperature;
    document.getElementById('fanSetTemperature').value = fanItem.setTemperature;
    document.getElementById('fanFanspeed').value = ['자동','약풍','중풍','강풍'][fanItem.fanspeed];
};

// 시스템에어컨 리스트 요청
vio.baseAir = async function () {
    const params = {
        cf: 'base',
    },
    queryString = new URLSearchParams(params).toString();

    const res = await fetch(`${this._apiUrl}/api/acp/${this._fid}?${queryString}`, {
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

        switch (jsonData.cat) {
            case 9:
                this.toast({ memo: '권한이 없습니다.' });
                break;
            case 1:
                this.baseRanderAir(jsonData.data);

                // 도면정보
                for(const {idn, floorName, floorFile} of jsonData.map){
                    this._floorMap[idn] = {floorName: floorName, floorFile: floorFile};
                }
                break;
            default:
                this.toast({ memo: '데이터가 존재하지 않습니다.' });
        }
    }
};


window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    // 에어컨 시스템 설정팝업
    document.getElementById('modalActClose').addEventListener('click', function () {
        document.getElementById('modal').classList.add('disable');
    });

    document.getElementById('modalActDone').addEventListener('click', async function () {
        if(vio._acpIdn !== 0){
            vio.editFixedAir();
        }
    });


    // 에어컨 개별설비 설정팝업
    document.getElementById('modalFanActClose').addEventListener('click', function () {
        document.getElementById('modalFan').classList.add('disable');
    });

    document.getElementById('modalFanActDone').addEventListener('click', async function () {
        if(vio._acpIdnFan !== 0){
            vio.editFixedFan();
        }
    });

    document.getElementById('actConfig').addEventListener('click', function () {
        vio.openAirConfig();
    });

    document.getElementById('acpStatPeak').addEventListener('click', function () {
        this.classList.toggle('active');
    });

    document.getElementById('acpIdn').addEventListener('change', function () {
        vio._acpIdn = Number(this.value);
        vio.getAirStat();
    });

    vio.baseAir();
});
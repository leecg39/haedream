'use strict';
vio._pid = 0;
vio._device = 0;
vio._gateIndex = 0;

vio._interval = null;

vio.select = function(pName, pid, device, gateIndex, wattCorrect, voltCorrect, ampereCorrect) {
    if (this._pid == pid) {
        return;
    }

    if (this._pid != 0) {
        document.getElementById('pid' + this._pid).classList.remove('active');
    }
    document.getElementById('pid' + pid).classList.add('active');
    document.getElementById('itemName').textContent = `[${pid}] ${pName} (${this._md[device].name})`;

    this._pid = pid;
    this._device = device;
    this._gateIndex = gateIndex;
    this._wattCorrect = wattCorrect;
    this._voltCorrect = voltCorrect;
    this._ampereCorrect = ampereCorrect;

    let label = [],
        total = [];
    switch (device) {

        case 1:
        case 2:
            label = [{ name: '전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '부하율', unit: '%' }];
            total = [{ name: 'Total 유효전력', unit: 'kW', correct: wattCorrect },
                { name: 'Total 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: 'Total 피상전력', unit: 'kVa', correct: wattCorrect },
                { name: '평균전압', unit: 'V', correct: voltCorrect },
                { name: '평균전류', unit: 'A', correct: ampereCorrect },
                { name: '주파수', unit: 'Hz' },
                { name: '역률', unit: '%' },
                { name: '순방향 유효전력량', unit: 'kWh', correct: wattCorrect },
                { name: '순방향 무효전력량', unit: 'kVarh', correct: wattCorrect },
                { name: '순방향 피상전력량', unit: 'kVah', correct: wattCorrect }];
            break;
        case 4:
        case 6:
            label = [{ name: '전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '위상각', unit: '˚' },
                { name: '역률', unit: '%' },
                { name: '유효전력', unit: 'kW', correct: wattCorrect },
                { name: '무효전력', unit: 'kVar' , correct: wattCorrect},
                { name: '에러정보', unit: '' },
                { name: '역전류', unit: '' },
                { name: '전압결상', unit: '' },
                { name: '전류결상', unit: '' }];
            total = [{ name: 'Total 유효전력', unit: 'kW', correct: wattCorrect },
                { name: 'Total 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '누적 유효전력량', unit: 'kWh', correct: wattCorrect },
                { name: '누적 무효전력량', unit: 'kVarh', correct: wattCorrect },
                { name: 'Meter ID', unit: '' },
                { name: '비교전력', unit: 'kW' }];
            break;
        case 7:
        case 35:
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect }];
            total = [{ name: 'Total 유효전력', unit: 'kW', correct: wattCorrect },
                { name: 'Total 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '역률', unit: '%' },
                { name: '주파수', unit: 'Hz' },
                { name: '적산전력량', unit: 'kWh', correct: wattCorrect },
                { name: '무효전력량', unit: 'kVarh', correct: wattCorrect }];
            break;
        case 11:
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '총 역방향 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 역방향 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '역률', unit: '%' },
                { name: '주파수', unit: 'Hz' },
                { name: '전체 유효전력량', unit: 'MWh', correct: wattCorrect },
                { name: '전체 무효전력량', unit: 'MVarh', correct: wattCorrect }];
            break;
        case 12:
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '총 피상전력', unit: 'kVa', correct: wattCorrect },
                { name: '역률', unit: '%' },
                { name: '주파수', unit: 'Hz' },
                { name: '전체 유효전력량', unit: 'MWh', correct: wattCorrect },
                { name: '전체 무효전력량', unit: 'MVarh', correct: wattCorrect }];
            break;
        case 13:
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '역률', unit: '%' },
                { name: '주파수', unit: 'Hz' },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect },
                { name: '전체 무효전력량', unit: 'kVarh', correct: wattCorrect }];
            break;
        case 14:
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '총 피상전력', unit: 'kVa', correct: wattCorrect },
                { name: '역률', unit: '%' },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect },
                { name: '전체 무효전력량', unit: 'kVarh', correct: wattCorrect }];
            break;
        case 19:
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '총 피상전력', unit: 'kVa', correct: wattCorrect },
                { name: '주파수', unit: 'Hz' },
                { name: '역률', unit: '%' },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect },
                { name: '전체 무효전력량', unit: 'kVarh', correct: wattCorrect }];
            break;
        case 20: // KDX300
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '유효전력', unit: 'kW', correct: wattCorrect },
                { name: '무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '역률', unit: '%' }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '역률', unit: '%' },
                { name: '주파수', unit: 'Hz' },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect },
                { name: '전체 무효전력량', unit: 'kVarh', correct: wattCorrect }];
            break;
        case 21:
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '주파수', unit: 'Hz' },
                { name: '역률', unit: '%' },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect }];
            break;
        case 23:
            label = [{ name: '상전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '역률', unit: '%' }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '주파수', unit: 'Hz' },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect }];
            break;
        case 24:
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect }];
            total = [{ name: '역률', unit: '%' },
                { name: '주파수', unit: 'Hz' },
                { name: '유효전력', unit: 'kW', correct: wattCorrect },
                { name: '무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '피상전력', unit: 'kVA', correct: wattCorrect },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect },
                { name: '전체 무효전력량', unit: 'kVarh', correct: wattCorrect }];
            break;
        case 25:
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '역률', unit: '%' }];
            total = [{ name: '주파수', unit: 'Hz' },
                { name: '유효전력', unit: 'kW', correct: wattCorrect },
                { name: '무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '피상전력', unit: 'kVA', correct: wattCorrect },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect }];
            break;
        case 30: // KDX201
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '유효전력', unit: 'kW', correct: wattCorrect },
                { name: '무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '역률', unit: '%' }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '역률', unit: '%' },
                { name: '주파수', unit: 'Hz' },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect }];
            break;
        case 36: // KDU300
            label = [{ name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '상전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '유효전력', unit: 'kW', correct: wattCorrect },
                { name: '무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '피상전력', unit: 'kVa', correct: wattCorrect },
                { name: '역률', unit: '%' },
                { name: '위상', unit: '°' }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '총 피상전력', unit: 'kVa', correct: wattCorrect },
                { name: '역률', unit: '%' },
                { name: '주파수', unit: 'Hz' },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect },
                { name: '전체 무효전력량', unit: 'kVarh', correct: wattCorrect }];
            break;
        case 43: // Accura2500D
            label = [{ name: '상전압', unit: 'V', correct: voltCorrect },
                { name: '선간전압', unit: 'V', correct: voltCorrect },
                { name: '전류', unit: 'A', correct: ampereCorrect },
                { name: '역률', unit: '%' },
                { name: '유효전력', unit: 'kW', correct: wattCorrect },
                { name: '무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '피상전력', unit: 'kVa', correct: wattCorrect }];
            total = [{ name: '총 유효전력', unit: 'kW', correct: wattCorrect },
                { name: '총 무효전력', unit: 'kVar', correct: wattCorrect },
                { name: '총 피상전력', unit: 'kVa', correct: wattCorrect },
                { name: '주파수', unit: 'Hz' },
                { name: '전체 유효전력량', unit: 'kWh', correct: wattCorrect },
                { name: '전체 무효전력량', unit: 'kVarh', correct: wattCorrect },
                { name: '전체 피상전력량', unit: 'kVah', correct: wattCorrect }];
            break;
    }

    if (label.length == 0) {
        return;
    }

    if (this._interval) {
        clearInterval(this._interval);
    }

    const itemA = document.getElementById('itemListA').children,
        itemB = document.getElementById('itemListB').children;
    for (let ia = 0; ia < 10; ++ia) {
        let dt = itemA[ia].children,
            ta = label[ia] || {name: '-', unit: ''};

        dt[0].textContent = `${ta.name}${ta.hasOwnProperty('correct') && ta.correct !== 1 ? ` x${ta.correct}` :''}`;
        dt[1].textContent = '';
        dt[2].textContent = '';
        dt[3].textContent = '';
        dt[4].textContent = ta.unit;

        dt = itemB[ia].children;
        ta = total[ia] || { name: '-', unit: '' };

        dt[0].textContent = `${ta.name}${ta.hasOwnProperty('correct') && ta.correct !== 1 ? ` x${ta.correct}` :''}`;
        dt[1].textContent = '';
        dt[2].textContent = ta.unit;
    }

    this.syncSensor();
    this._interval = setInterval(function() {
        vio.syncSensor();
    }, 3072);
};


vio.dataTransSenser = function(j) {
    const itemA = document.getElementById('itemListA').children,
        itemB = document.getElementById('itemListB').children;

    let dt,
        ia;

    switch (this._device) {
        case 1:
        case 2:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a5.toFixed(2);
            dt[2].textContent = j.a6.toFixed(2);
            dt[3].textContent = j.a7.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a2.toFixed(2);
            dt[2].textContent = j.a3.toFixed(2);
            dt[3].textContent = j.a4.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a8.toFixed(2);
            dt[2].textContent = j.a9.toFixed(2);
            dt[3].textContent = j.a10.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a19.toFixed(2);
            dt[2].textContent = j.a20.toFixed(2);
            dt[3].textContent = j.a21.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a12 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a13 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a14 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = j.a0.toFixed(2);
            itemB[ia++].children[1].textContent = j.a1.toFixed(2);
            itemB[ia++].children[1].textContent = j.a15.toFixed(2);
            itemB[ia++].children[1].textContent = j.a11.toFixed(2);
            itemB[ia++].children[1].textContent = this.echoNumber(Math.floor(j.a16 / 1000));
            itemB[ia++].children[1].textContent = this.echoNumber(Math.floor(j.a17 / 1000));
            itemB[ia++].children[1].textContent = this.echoNumber(Math.floor(j.a18 / 1000));
            break;
        case 4:
        case 6:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a2.toFixed(2);
            dt[2].textContent = j.a3.toFixed(2);
            dt[3].textContent = j.a4.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a5.toFixed(2);
            dt[2].textContent = j.a6.toFixed(2);
            dt[3].textContent = j.a7.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a8.toFixed(2);
            dt[2].textContent = j.a9.toFixed(2);
            dt[3].textContent = j.a10.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a11.toFixed(2);
            dt[2].textContent = j.a12.toFixed(2);
            dt[3].textContent = j.a13.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a16 / 1000).toFixed(2);
            dt[2].textContent = (j.a17 / 1000).toFixed(2);
            dt[3].textContent = (j.a18 / 1000).toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a19 / 1000).toFixed(2);
            dt[2].textContent = (j.a20 / 1000).toFixed(2);
            dt[3].textContent = (j.a21 / 1000).toFixed(2);

            // 에러정보
            let bitErrorText = j.a22.toString(2).padStart(16, '0');
            dt = itemA[ia++].children;
            dt[1].textContent = bitErrorText.substr(-1,1) === '1' ? '오결선' : '';
            dt[2].textContent = bitErrorText.substr(-6,1) === '1' ? '미조정계기' : '';
            dt[3].textContent = bitErrorText.substr(-5,1) === '1' ? '무부하' : '';
            dt = itemA[ia++].children;
            dt[1].textContent = bitErrorText.substr(-2,1) === '1' ? 'A상 CT 오결선' : '';
            dt[2].textContent = bitErrorText.substr(-3,1) === '1' ? 'B상 CT 오결선' : '';
            dt[3].textContent = bitErrorText.substr(-4,1) === '1' ? 'C상 CT 오결선' : '';
            dt = itemA[ia++].children;
            dt[1].textContent = bitErrorText.substr(-7,1) === '1' ? 'A상 전압 결상' : '';
            dt[2].textContent = bitErrorText.substr(-8,1) === '1' ? 'B상 전압 결상' : '';
            dt[3].textContent = bitErrorText.substr(-9,1) === '1' ? 'C상 전압 결상' : '';
            dt = itemA[ia++].children;
            dt[1].textContent = bitErrorText.substr(-10,1) === '1' ? 'A상 전류 결상' : '';
            dt[2].textContent = bitErrorText.substr(-11,1) === '1' ? 'B상 전류 결상' : '';
            dt[3].textContent = bitErrorText.substr(-12,1) === '1' ? 'C상 전류 결상' : '';

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a14 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a15 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = this.echoNumber(Math.floor(j.a0 / 1000));
            itemB[ia++].children[1].textContent = this.echoNumber(Math.floor(j.a1 / 1000));
            if(j.a23){
                itemB[ia].children[2].textContent = j.a23 > 3400000000 ? '3상4선식' : '3상3선식';
            }
            itemB[ia++].children[1].textContent = j.a23;

            // 현재 전력값 비교 전력 계산
            let wattCalc = Math.abs(j.a2 * j.a5 * j.a11 / 100) + Math.abs(j.a3 * j.a6 * j.a12 / 100) + Math.abs(j.a4 * j.a7 * j.a13 / 100);
            wattCalc = Math.round(wattCalc / this._voltCorrect / this._ampereCorrect * this._wattCorrect / 10) / 100; // w -> kw

            j.a14 /= 1000; // 유효전력 w -> kw
            // 일치 확률
            let verifyWattRatio = 0;
            if (j.a14 > 0 && j.a14 > wattCalc) {
                verifyWattRatio = 100 - (j.a14 - wattCalc) / j.a14 * 100;
            } else if(wattCalc > 0) {
                verifyWattRatio = 100 - (wattCalc - j.a14) / wattCalc * 100;
            }
            if(verifyWattRatio >= 99.9){
                verifyWattRatio = 99.9;
            }else{
                verifyWattRatio = Math.floor(verifyWattRatio * 10) / 10;
            }

            itemB[ia++].children[1].textContent = `${wattCalc} (${verifyWattRatio}%)`;

            break;
        case 7:
        case 35:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a12.toFixed(2);
            dt[2].textContent = j.a13.toFixed(2);
            dt[3].textContent = j.a14.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a6 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a8 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = j.a7;
            itemB[ia++].children[1].textContent = j.a9;
            itemB[ia++].children[1].textContent = (j.a10 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a11 / 1000).toFixed(2);
            break;
        case 11:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a7.toFixed(2);
            dt[2].textContent = j.a8.toFixed(2);
            dt[3].textContent = j.a9.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a16 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a17 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a18 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a19 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a20).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a14).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a21 / 1000000).toFixed(2); // wh ->mWh
            itemB[ia++].children[1].textContent = (j.a22 / 1000000).toFixed(2);
            break;
        case 12:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a6.toFixed(2);
            dt[2].textContent = j.a7.toFixed(2);
            dt[3].textContent = j.a8.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a10 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a11 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a12 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a9).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a13).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a14 / 1000000).toFixed(2); // wh ->mWh
            itemB[ia++].children[1].textContent = (j.a15 / 1000000).toFixed(2);
            break;
        case 13:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a7.toFixed(2);
            dt[2].textContent = j.a8.toFixed(2);
            dt[3].textContent = j.a9.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a12 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a13 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a14 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a10).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a15 / 1000).toFixed(2); // wh ->kWh
            itemB[ia++].children[1].textContent = (j.a16 / 1000).toFixed(2);
            break;
        case 14:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a4.toFixed(2);
            dt[2].textContent = j.a5.toFixed(2);
            dt[3].textContent = j.a6.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a8.toFixed(2);
            dt[2].textContent = j.a9.toFixed(2);
            dt[3].textContent = j.a10.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a1.toFixed(2);
            dt[2].textContent = j.a2.toFixed(2);
            dt[3].textContent = j.a3.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a23 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a27 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a19 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a11).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a31 / 1000).toFixed(2); // wh ->kWh
            itemB[ia++].children[1].textContent = (j.a32 / 1000).toFixed(2);
            break;
        case 19:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a6.toFixed(2);
            dt[2].textContent = j.a7.toFixed(2);
            dt[3].textContent = j.a8.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a9 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a10 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a11 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a12).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a13).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a14 / 1000).toFixed(2); // wh ->kWh
            itemB[ia++].children[1].textContent = (j.a15 / 1000).toFixed(2);
            break;
        case 20: // KDX300
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a6.toFixed(2);
            dt[2].textContent = j.a7.toFixed(2);
            dt[3].textContent = j.a8.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a9 / 1000).toFixed(2);
            dt[2].textContent = (j.a10 / 1000).toFixed(2);
            dt[3].textContent = (j.a11 / 1000).toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a13 / 1000).toFixed(2);
            dt[2].textContent = (j.a14 / 1000).toFixed(2);
            dt[3].textContent = (j.a15 / 1000).toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a21.toFixed(2);
            dt[2].textContent = j.a22.toFixed(2);
            dt[3].textContent = j.a23.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a12 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a16 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = j.a17.toFixed(2);
            itemB[ia++].children[1].textContent = j.a18.toFixed(2);
            itemB[ia++].children[1].textContent = (j.a19 / 1000).toFixed(2); // wh ->kWh
            itemB[ia++].children[1].textContent = (j.a20 / 1000).toFixed(2);
            break;
        case 21:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a6.toFixed(2);
            dt[2].textContent = j.a7.toFixed(2);
            dt[3].textContent = j.a8.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a11 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a12 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a9).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a10).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a13 / 1000).toFixed(2); // wh ->kWh
            break;
        case 23:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a2.toFixed(2);
            dt[2].textContent = j.a3.toFixed(2);
            dt[3].textContent = j.a4.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a5.toFixed(2);
            dt[2].textContent = j.a6.toFixed(2);
            dt[3].textContent = j.a7.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a8.toFixed(2);
            dt[2].textContent = j.a9.toFixed(2);
            dt[3].textContent = j.a10.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a1 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a11).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a0 / 1000).toFixed(2); // wh ->kWh
            break;
        case 24:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a6.toFixed(2);
            dt[2].textContent = j.a7.toFixed(2);
            dt[3].textContent = j.a8.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a14).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a15).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a9 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a10 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a11 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a12 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a13 / 1000).toFixed(2);
            break;
        case 25:
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a7.toFixed(2);
            dt[2].textContent = j.a8.toFixed(2);
            dt[3].textContent = j.a9.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a14).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a15 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a16 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a17 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a18 / 1000).toFixed(2);
            break;
        case 30: // KDX201
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a6.toFixed(2);
            dt[2].textContent = j.a7.toFixed(2);
            dt[3].textContent = j.a8.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a9 / 1000).toFixed(2);
            dt[2].textContent = (j.a10 / 1000).toFixed(2);
            dt[3].textContent = (j.a11 / 1000).toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a13 / 1000).toFixed(2);
            dt[2].textContent = (j.a14 / 1000).toFixed(2);
            dt[3].textContent = (j.a15 / 1000).toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a17.toFixed(2);
            dt[2].textContent = j.a18.toFixed(2);
            dt[3].textContent = j.a19.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a12 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a16 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = j.a20.toFixed(2);
            itemB[ia++].children[1].textContent = (j.a21).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a22 / 1000).toFixed(2); // wh ->kWh
            break;
        case 36: // KDU300
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a6.toFixed(2);
            dt[2].textContent = j.a7.toFixed(2);
            dt[3].textContent = j.a8.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a9 / 1000).toFixed(2);
            dt[2].textContent = (j.a10 / 1000).toFixed(2);
            dt[3].textContent = (j.a11 / 1000).toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a13 / 1000).toFixed(2);
            dt[2].textContent = (j.a14 / 1000).toFixed(2);
            dt[3].textContent = (j.a15 / 1000).toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a17 / 1000).toFixed(2);
            dt[2].textContent = (j.a18 / 1000).toFixed(2);
            dt[3].textContent = (j.a19 / 1000).toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a21.toFixed(2);
            dt[2].textContent = j.a22.toFixed(2);
            dt[3].textContent = j.a23.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a28.toFixed(2);
            dt[2].textContent = j.a29.toFixed(2);
            dt[3].textContent = j.a30.toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a12 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a16 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a20 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = j.a24.toFixed(2);
            itemB[ia++].children[1].textContent = j.a25.toFixed(2);
            itemB[ia++].children[1].textContent = (j.a26 / 1000).toFixed(2); // wh ->kWh
            itemB[ia++].children[1].textContent = (j.a27 / 1000).toFixed(2);
            break;
        case 43: // Accura2500D
            ia = 0;
            dt = itemA[ia++].children;
            dt[1].textContent = j.a0.toFixed(2);
            dt[2].textContent = j.a1.toFixed(2);
            dt[3].textContent = j.a2.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a3.toFixed(2);
            dt[2].textContent = j.a4.toFixed(2);
            dt[3].textContent = j.a5.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a6.toFixed(2);
            dt[2].textContent = j.a7.toFixed(2);
            dt[3].textContent = j.a8.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = j.a9.toFixed(2);
            dt[2].textContent = j.a10.toFixed(2);
            dt[3].textContent = j.a11.toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a12 / 1000).toFixed(2);
            dt[2].textContent = (j.a13 / 1000).toFixed(2);
            dt[3].textContent = (j.a14 / 1000).toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a16 / 1000).toFixed(2);
            dt[2].textContent = (j.a17 / 1000).toFixed(2);
            dt[3].textContent = (j.a18 / 1000).toFixed(2);
            dt = itemA[ia++].children;
            dt[1].textContent = (j.a20 / 1000).toFixed(2);
            dt[2].textContent = (j.a21 / 1000).toFixed(2);
            dt[3].textContent = (j.a22 / 1000).toFixed(2);

            ia = 0;
            itemB[ia++].children[1].textContent = (j.a15 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a19 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a23 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = j.a24.toFixed(2);
            itemB[ia++].children[1].textContent = (j.a25 / 1000).toFixed(2); // wh ->kWh
            itemB[ia++].children[1].textContent = (j.a26 / 1000).toFixed(2);
            itemB[ia++].children[1].textContent = (j.a27 / 1000).toFixed(2);
            break;
    }
};

vio.syncSensor = async function() {
    if (!this._useNetworks) {
        const params = {
            cf: 'sync',
            pid: this._pid,
            md_id: this._device,
            gateIndex: this._gateIndex
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/sensors/${this._fid}?${queryString}`, {
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
                    this.toast({memo: '권한이 없습니다.'});
                    clearInterval(this._interval);
                    break;
                case 3:
                case 2:
                    clearInterval(this._interval);
                    break;
                case 1:
                    this.dataTransSenser(jsonData.data);
                    break;
                default:
                    this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
                    clearInterval(this._interval);
            }
        }
    }
};

vio.dataTrans = function(j) {
    let out = '';
    for (let ia = 0, th = j.length; ia < th; ++ia) {
        const ta = j[ia];
        out += `<div class="itemLine" title="${ta.lp_name}">
                    <span class="item" id="pid${ta.pid}" title="${ta.gid}:${ta.lp_number}" onclick="vio.select('${ta.lp_name}',${ta.pid},${ta.md_id},${ta.gateIndex},${ta.power_correction},${ta.voltage_correction},${ta.ampere_correction})">${ta.lp_name}</span>
                </div>`;
    }

    document.getElementById('itemList').insertAdjacentHTML('beforeend', out);
    if (j.length != 0) {
        this.select(j[0].lp_name, j[0].pid, j[0].md_id, j[0].gateIndex, j[0].power_correction, j[0].voltage_correction, j[0].ampere_correction);
    }
};

vio.getData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const params = {
            cf: 'get'
        }

        const queryString = new URLSearchParams(params).toString();

        const res = await fetch(`api/sensors/${this._fid}?${queryString}`, {
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
                    this.toast({memo: '권한이 없습니다.'});
                    break;
                case 1:
                    this.dataTrans(jsonData.data);
                    break;
                default:
                    this.toast({memo: '실행할 수 있는 데이터가 없습니다.'});
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    vio.getData();
});
vio._firmIdn = [80,81,82,83,84,85,87,88,89];

/*
전월대비 전력사용 증감량
billData    요금고지서 정보
thisYear    조회연도
thisMonth   조회월
lastYear    지난달 년도
lastMonth   지난달
*/
vio.randerMonthPower = function(billData, thisYear, thisMonth, lastYear, lastMonth){
    const firmIndex = { // 보고서 순서 : 업체고유번호
        11:80, 10:81, 7:82, 6:83, 3:84, 2:85, 5:87, 4:88, 9:89
    };

    const elements = document.getElementById('meterWithMonth').children,
        thisDateText = `${thisYear}${thisMonth}`,
        lastDateText = `${lastYear}${lastMonth}`;

    let elementIndex = 0;
    for(const element of elements){
        if(elementIndex % 3 == 0){
            element.querySelector('[data-tag="year"]').textContent = thisYear;
            element.querySelector('[data-tag="month"]').textContent = `${thisMonth}월`;
        }else if(elementIndex % 3 == 1){
            element.querySelector('[data-tag="year"]').textContent = lastYear;
            element.querySelector('[data-tag="month"]').textContent = `${lastMonth}월`;
        }

        let unit;
        if(elementIndex < 3){ // 사용량
            unit = 'mWh';
        }else if(elementIndex < 6){ // 사용요금
            unit = 'kGold';
        }else if(elementIndex < 9){ // 공급가 + 전력기금
            unit = 'kTax';
        }else if(elementIndex < 12){ // kW당 요금
            unit = 'kWTax';
        }else{
            unit = 'work'; // 평균 근무일수
        }

        const items = element.querySelectorAll('[data-tag="no"]');
        if(elementIndex % 3 == 0){ // 해당월
            for(let itemIndex = 0; itemIndex < 12; itemIndex++){
                if(itemIndex == 0){ // 합계
                    items[itemIndex].textContent = billData[thisDateText][unit].toLocaleString('ko-KR');
                }else if(itemIndex == 1){ // 유한회사 소계
                    items[itemIndex].textContent = billData[thisDateText][`${unit}Factory1`].toLocaleString('ko-KR');
                }else if(itemIndex == 8){ // 2공장 소계
                    items[itemIndex].textContent = billData[thisDateText][`${unit}Factory2`].toLocaleString('ko-KR');
                }else{
                    items[itemIndex].textContent = billData[thisDateText][firmIndex[itemIndex]][unit].toLocaleString('ko-KR');
                }
            }
        }else if(elementIndex % 3 == 1){ // 지난달
            for(let itemIndex = 0; itemIndex < 12; itemIndex++){
                if(itemIndex == 0){ // 합계
                    items[itemIndex].textContent = billData[lastDateText][unit].toLocaleString('ko-KR');
                }else if(itemIndex == 1){ // 유한회사 소계
                    items[itemIndex].textContent = billData[lastDateText][`${unit}Factory1`].toLocaleString('ko-KR');
                }else if(itemIndex == 8){ // 2공장 소계
                    items[itemIndex].textContent = billData[lastDateText][`${unit}Factory2`].toLocaleString('ko-KR');
                }else{
                    items[itemIndex].textContent = billData[lastDateText][firmIndex[itemIndex]][unit].toLocaleString('ko-KR');
                }
            }
        }else{ // 해당월과 지난달 차이
            for(let itemIndex = 0; itemIndex < 12; itemIndex++){
                if(itemIndex == 0){ // 합계
                    items[itemIndex].textContent = (billData[thisDateText][unit] - billData[lastDateText][unit]).toLocaleString('ko-KR');

                    if(unit == 'mWh'){
                        // 분석테이블 사용량 증감량
                        let analysisElements = document.getElementById('analysisTable').querySelectorAll('[data-tag="power"]'),
                            analysisClass = '';
                        analysisElements[0].textContent = items[itemIndex].textContent;
                        if(analysisElements[0].textContent.includes('-')){
                            analysisElements[0].setAttribute('class','blue');
                            analysisClass = 'blue';
                        }else if(analysisElements[0].textContent != '0'){
                            analysisElements[0].setAttribute('class','red');
                            analysisClass = 'red';
                        }
                        // 분석테이블 증감률
                        analysisElements[1].setAttribute('class', analysisClass);
                        analysisElements[1].textContent = `${Math.round((billData[thisDateText][unit] - billData[lastDateText][unit]) / billData[lastDateText][unit] * 100)}% ${{'':'','blue':'↓','red':'↑'}[analysisClass]}`;
                    }else if(unit == 'kGold'){
                        // 분석테이블 사용요금 증감량
                        let analysisElements = document.getElementById('analysisTable').querySelectorAll('[data-tag="bill"]'),
                            analysisClass = '';
                        analysisElements[0].textContent = items[itemIndex].textContent;
                        if(analysisElements[0].textContent.includes('-')){
                            analysisElements[0].setAttribute('class','blue');
                            analysisClass = 'blue';
                        }else if(analysisElements[0].textContent != '0'){
                            analysisElements[0].setAttribute('class','red');
                            analysisClass = 'red';
                        }
                        // 분석테이블 증감률
                        analysisElements[1].setAttribute('class', analysisClass);
                        analysisElements[1].textContent = `${Math.round((billData[thisDateText][unit] - billData[lastDateText][unit]) / billData[lastDateText][unit] * 100)}% ${{'':'','blue':'↓','red':'↑'}[analysisClass]}`;
                    }
                }else if(itemIndex == 1){ // 유한회사 소계
                    items[itemIndex].textContent = (billData[thisDateText][`${unit}Factory1`] - billData[lastDateText][`${unit}Factory1`]).toLocaleString('ko-KR');
                }else if(itemIndex == 8){ // 2공장 소계
                    items[itemIndex].textContent = (billData[thisDateText][`${unit}Factory2`] - billData[lastDateText][`${unit}Factory2`]).toLocaleString('ko-KR');
                }else{
                    items[itemIndex].textContent = (billData[thisDateText][firmIndex[itemIndex]][unit] - billData[lastDateText][firmIndex[itemIndex]][unit]).toLocaleString('ko-KR');
                }

                if(items[itemIndex].textContent.includes('-')){
                    items[itemIndex].setAttribute('class','blue');
                }else if(items[itemIndex].textContent != '0'){
                    items[itemIndex].setAttribute('class','red');
                }
            }
        }
        elementIndex += 1;
    }
};


/*
전년 동월대비 전력사용 증감량
billData    요금고지서 정보
thisYear    조회연도
thisMonth   조회월
yearAgo     전년도
*/
vio.randerYearPower = function(billData, thisYear, thisMonth, yearAgo){
    const firmIndex = { // 보고서 순서 : 업체고유번호
        11:80, 10:81, 7:82, 6:83, 3:84, 2:85, 5:87, 4:88, 9:89
    };

    const elements = document.getElementById('meterWithYear').children;

    const thisDateText = `${thisYear}${thisMonth}`;
    const lastDateText = `${yearAgo}${thisMonth}`;

    let elementIndex = 0;
    for(const element of elements){
        if(elementIndex % 3 == 0){
            element.querySelector('[data-tag="year"]').textContent = thisYear;
            element.querySelector('[data-tag="month"]').textContent = `${thisMonth}월`;
        }else if(elementIndex % 3 == 1){
            element.querySelector('[data-tag="year"]').textContent = yearAgo;
            element.querySelector('[data-tag="month"]').textContent = `${thisMonth}월`;
        }

        let unit;
        if(elementIndex < 3){ // 사용량
            unit = 'mWh';
        }else if(elementIndex < 6){ // 사용요금
            unit = 'kGold';
        }else if(elementIndex < 9){ // 공급가 + 전력기금
            unit = 'kTax';
        }else if(elementIndex < 12){ // kW당 요금
            unit = 'kWTax';
        }else{
            unit = 'work'; // 평균 근무일수
        }

        const items = element.querySelectorAll('[data-tag="no"]');
        if(elementIndex % 3 == 0){ // 해당월
            for(let itemIndex = 0; itemIndex < 12; itemIndex++){
                if(itemIndex == 0){ // 합계
                    items[itemIndex].textContent = billData[thisDateText][unit].toLocaleString('ko-KR');
                }else if(itemIndex == 1){ // 유한회사 소계
                    items[itemIndex].textContent = billData[thisDateText][`${unit}Factory1`].toLocaleString('ko-KR');
                }else if(itemIndex == 8){ // 2공장 소계
                    items[itemIndex].textContent = billData[thisDateText][`${unit}Factory2`].toLocaleString('ko-KR');
                }else{
                    items[itemIndex].textContent = billData[thisDateText][firmIndex[itemIndex]][unit].toLocaleString('ko-KR');
                }
            }
        }else if(elementIndex % 3 == 1){ // 지난해
            for(let itemIndex = 0; itemIndex < 12; itemIndex++){
                if(itemIndex == 0){ // 합계
                    items[itemIndex].textContent = billData[lastDateText][unit].toLocaleString('ko-KR');
                }else if(itemIndex == 1){ // 유한회사 소계
                    items[itemIndex].textContent = billData[lastDateText][`${unit}Factory1`].toLocaleString('ko-KR');
                }else if(itemIndex == 8){ // 2공장 소계
                    items[itemIndex].textContent = billData[lastDateText][`${unit}Factory2`].toLocaleString('ko-KR');
                }else{
                    items[itemIndex].textContent = billData[lastDateText][firmIndex[itemIndex]][unit].toLocaleString('ko-KR');
                }
            }
        }else{ // 해당월과 지난해 차이
            for(let itemIndex = 0; itemIndex < 12; itemIndex++){
                if(itemIndex == 0){ // 합계
                    items[itemIndex].textContent = (billData[thisDateText][unit] - billData[lastDateText][unit]).toLocaleString('ko-KR');
                }else if(itemIndex == 1){ // 유한회사 소계
                    items[itemIndex].textContent = (billData[thisDateText][`${unit}Factory1`] - billData[lastDateText][`${unit}Factory1`]).toLocaleString('ko-KR');
                }else if(itemIndex == 8){ // 2공장 소계
                    items[itemIndex].textContent = (billData[thisDateText][`${unit}Factory2`] - billData[lastDateText][`${unit}Factory2`]).toLocaleString('ko-KR');
                }else{
                    items[itemIndex].textContent = (billData[thisDateText][firmIndex[itemIndex]][unit] - billData[lastDateText][firmIndex[itemIndex]][unit]).toLocaleString('ko-KR');
                }

                if(items[itemIndex].textContent.includes('-')){
                    items[itemIndex].setAttribute('class','blue');
                }else if(items[itemIndex].textContent != '0'){
                    items[itemIndex].setAttribute('class','red');
                }
            }
        }
        elementIndex += 1;
    }
};


/*
당월 전력사용 현황
billData    요금고지서 정보
*/
vio.randerThisMonthPower = function(billData){
    let elements = document.getElementById('reportForMonth').querySelectorAll('[data-tag="no"]');

    let index = 0;
    const firmIndex = [88,87,85,84,83,82,89,81,80]; // 가공D, 가공E, 단조A, 단조C, 천안, 천안2, ABC동, 사봉, 정공
    while(index < 54){
        const idn = firmIndex[Math.floor(index / 6)];
        elements[index++].textContent = billData[idn].kWAble;
        elements[index++].textContent = billData[idn].kWMax;
        elements[index++].textContent = billData[idn].kWh.toLocaleString('ko-KR');
        elements[index++].textContent = billData[idn].base.toLocaleString('ko-KR');
        elements[index++].textContent = 0;
        elements[index++].textContent = billData[idn].gold.toLocaleString('ko-KR');
    }

    // 계
    elements = document.getElementById('reportForMonth').querySelectorAll('[data-tag="sum"]');
    elements[0].textContent = billData.goldFactory1.toLocaleString('ko-KR');
    elements[1].textContent = billData.goldFactory2.toLocaleString('ko-KR');
    elements[2].textContent = billData[80].gold.toLocaleString('ko-KR');
    elements[3].textContent = billData.gold.toLocaleString('ko-KR');
};


/*
지출일 기준 지출액
billData    요금고지서 정보
*/
vio.randerForBill = function(billData){
    let elements = document.getElementById('reportForBill').querySelectorAll('[data-tag="no"]');
    let index = 0;
    elements[index++].textContent = billData[80].gold.toLocaleString('ko-KR');
    elements[index++].textContent = (billData[83].gold + billData[82].gold).toLocaleString('ko-KR');
    elements[index++].textContent = billData[83].gold.toLocaleString('ko-KR');
    elements[index++].textContent = billData[82].gold.toLocaleString('ko-KR');
    elements[index++].textContent = (billData[88].gold + billData[87].gold + billData[85].gold + billData[84].gold).toLocaleString('ko-KR');
    elements[index++].textContent = billData[88].gold.toLocaleString('ko-KR');
    elements[index++].textContent = billData[87].gold.toLocaleString('ko-KR');
    elements[index++].textContent = billData[85].gold.toLocaleString('ko-KR');
    elements[index++].textContent = billData[84].gold.toLocaleString('ko-KR');
    elements[index++].textContent = (billData[89].gold + billData[81].gold).toLocaleString('ko-KR');
    elements[index++].textContent = billData[89].gold.toLocaleString('ko-KR');
    elements[index++].textContent = billData[81].gold.toLocaleString('ko-KR');
    elements[index++].textContent = billData.gold.toLocaleString('ko-KR');
};


/*
당월 전력사용 현황
billData    요금고지서 정보
thisYear    조회연도
thisMonth   조회월
lastYear    지난달 년도
lastMonth   지난달
*/
vio.randerContrast = function(billData, thisYear, thisMonth, lastYear, lastMonth){
    const thisDateText = `${thisYear}${thisMonth}`,
        lastDateText = `${lastYear}${lastMonth}`;

    let elements = document.getElementById('meterContrast').querySelectorAll('[data-tag="no"]');

    let index = 0;
    for(const fid of [88,87,85,84,83,82,89,81,80,80]){ // 일광정공 소계값은 그대로 처리
        if(index >= 120){
            break;
        }
        for(const unit of ['kWMax', 'kWh', 'gold']){
            if(index >= 108 && unit == 'kWMax'){
                continue;
            }
            elements[index++].textContent = billData[lastDateText][fid][unit].toLocaleString('ko-KR');
            elements[index++].textContent = billData[thisDateText][fid][unit].toLocaleString('ko-KR');

            const diffNo = billData[thisDateText][fid][unit] - billData[lastDateText][fid][unit];
            // 증감량
            elements[index].classList.toggle('red', diffNo > 0);
            elements[index++].textContent = diffNo.toLocaleString('ko-KR');
            // 증감률
            elements[index].classList.toggle('red', diffNo > 0);
            elements[index++].textContent = `${Math.round(diffNo / billData[lastDateText][fid][unit] * 100).toLocaleString('ko-KR')}%`;
        }
    }

    // 합계
    elements = document.getElementById('meterContrast').querySelectorAll('[data-tag="sum"]');
    index = 0;
    for(const factory of ['Factory1', 'Factory2', '']){
        if(index >= 24){
            break;
        }
        for(const unit of ['kWh', 'gold']){
            elements[index++].textContent = billData[lastDateText][`${unit}${factory}`].toLocaleString('ko-KR');
            elements[index++].textContent = billData[thisDateText][`${unit}${factory}`].toLocaleString('ko-KR');

            const diffNo = billData[thisDateText][`${unit}${factory}`] - billData[lastDateText][`${unit}${factory}`];
            // 증감량
            elements[index].classList.toggle('red', diffNo > 0);
            elements[index++].textContent = diffNo.toLocaleString('ko-KR');
            // 증감률
            elements[index].classList.toggle('red', diffNo > 0);
            elements[index++].textContent = `${Math.round(diffNo / billData[lastDateText][`${unit}${factory}`] * 100).toLocaleString('ko-KR')}%`;
        }
    }
};


/*
세부내역 - 피크치
billData    요금고지서 정보
thisYear    조회연도
thisMonth   조회월
*/
vio.randerDetailPeak = function(billData, thisYear, thisMonth){
    const yearElements = document.getElementById('detailPeakHead').querySelectorAll('[data-tag="year"]'),
        monthElements = document.getElementById('detailPeakHead').querySelectorAll('[data-tag="month"]');
    let elements = document.getElementById('detailPeak').querySelectorAll('[data-tag="no"]');

    const firmMax = [0,0,0,0,0,0,0,0,0,0,0,0],
        monthMax = [0,0,0,0,0,0,0,0,0,0,0,0,0];

    let kWMaxTotal = 0;

    const setDate = new Date(`${thisMonth}/1/${thisYear}`);
    setDate.setMonth(setDate.getMonth() - 11);
    for(let index = 0; index < 12; index++){
        const year = setDate.getFullYear(),
            month = (setDate.getMonth() + 1).toString().padStart(2, '0'),
            setDateText = `${year}${month}`;
        setDate.setMonth(setDate.getMonth() + 1);

        // 연도 표시
        if(index == 0){
            yearElements[0].textContent = `${year}년`;
            if(month == '01'){
                yearElements[0].setAttribute('colSpan', 12);
                yearElements[1].classList.add('disable');
            }else{
                const colSpan = 13 - Number(month)
                yearElements[0].setAttribute('colSpan', colSpan);
                yearElements[1].classList.remove('disable');
                yearElements[1].textContent = `${year + 1}년`;
                yearElements[1].setAttribute('colSpan', 12 - colSpan);
            }
        }
        monthElements[index].textContent = month;

        let fidIndex = 0;
        for(const fid of [88,87,85,84,83,82,89,81,80]){
            const kWMax = billData[setDateText][fid].kWMax;
            elements[fidIndex * 12 + index].textContent = kWMax;

            if(kWMax > monthMax[index]){
                monthMax[index] = kWMax;
                if(kWMax > kWMaxTotal){
                    kWMaxTotal = kWMax;
                }
            }
            if(kWMax > firmMax[fidIndex]){
                firmMax[fidIndex] = kWMax;
                if(kWMax > kWMaxTotal){
                    kWMaxTotal = kWMax;
                }
            }

            fidIndex += 1;
        }
    }

    // 최대값
    elements = document.getElementById('detailPeak').querySelectorAll('[data-tag="avg"]');
    for(let index = 0; index < 9; index++){
        elements[index].textContent = firmMax[index];
        elements[index].classList.toggle('red', kWMaxTotal == firmMax[index]);
    }
    for(let index = 0; index < 12; index++){
        elements[9 + index].textContent = monthMax[index];
    }
    elements[21].textContent = kWMaxTotal;
};


/*
세부내역 - 근무일수
billData    요금고지서 정보
thisYear    조회연도
thisMonth   조회월
*/
vio.randerDetailWork = function(billData, thisYear, thisMonth){
    const yearElements = document.getElementById('detailWorkHead').querySelectorAll('[data-tag="year"]'),
        monthElements = document.getElementById('detailWorkHead').querySelectorAll('[data-tag="month"]');
    let elements = document.getElementById('detailWork').querySelectorAll('[data-fid]');

    const firmSum = [0,0,0,0,0,0,0,0,0,0,0,0],
        monthSum = [0,0,0,0,0,0,0,0,0,0,0,0,0];

    let workTotal = 0;

    const setDate = new Date(`${thisMonth}/1/${thisYear}`);
    setDate.setMonth(setDate.getMonth() - 11);
    for(let index = 0; index < 12; index++){
        const year = setDate.getFullYear(),
            month = (setDate.getMonth() + 1).toString().padStart(2, '0'),
            setDateText = `${year}${month}`;
        setDate.setMonth(setDate.getMonth() + 1);

        // 연도 표시
        if(index == 0){
            yearElements[0].textContent = `${year}년`;
            if(month == '01'){
                yearElements[0].setAttribute('colSpan', 12);
                yearElements[1].classList.add('disable');
            }else{
                const colSpan = 13 - Number(month)
                yearElements[0].setAttribute('colSpan', colSpan);
                yearElements[1].classList.remove('disable');
                yearElements[1].textContent = `${year + 1}년`;
                yearElements[1].setAttribute('colSpan', 12 - colSpan);
            }
        }
        monthElements[index].textContent = month;

        let fidIndex = 0;
        for(const fid of [88,87,85,84,83,82,89,81,80]){
            const work = billData[setDateText][fid].work,
                elementIndex = fidIndex * 12 + index;
            elements[elementIndex].value = work;
            elements[elementIndex].setAttribute('data-year', year);
            elements[elementIndex].setAttribute('data-month', Number(month));

            monthSum[index] += work;
            firmSum[fidIndex] += work;
            workTotal += work;

            fidIndex += 1;
        }
    }

    // 평균 근무일수
    elements = document.getElementById('detailWork').querySelectorAll('[data-tag="avg"]');
    for(let index = 0; index < 9; index++){
        const avg = Math.round(firmSum[index] / 12 * 10) / 10;
        elements[index].textContent = avg;
        elements[index].classList.toggle('red', avg > 25);
    }
    for(let index = 0; index < 12; index++){
        const avg = Math.round(monthSum[index] / 9 * 10) / 10;
        elements[9 + index].textContent = avg;
        elements[9 + index].classList.toggle('red', avg > 25);
    }
    elements[21].textContent = Math.round(workTotal / 108 * 10) / 10;
};


/*
세부내역 - 사용전력
billData    요금고지서 정보
thisYear    조회연도
thisMonth   조회월
*/
vio.randerDetailWatt = function(billData, thisYear, thisMonth){
    const yearElements = document.getElementById('detailWattHead').querySelectorAll('[data-tag="year"]'),
        monthElements = document.getElementById('detailWattHead').querySelectorAll('[data-tag="month"]');
    let elements = document.getElementById('detailWatt').querySelectorAll('[data-tag="no"]');

    const groupSum = [0,0,0,0,0,0,0,0,0,0,0,0,0],
        monthSum = [0,0,0,0,0,0,0,0,0,0,0,0,0];

    let kWhTotal = 0;

    const setDate = new Date(`${thisMonth}/1/${thisYear}`);
    setDate.setMonth(setDate.getMonth() - 11);
    for(let index = 0; index < 12; index++){
        const year = setDate.getFullYear(),
            month = (setDate.getMonth() + 1).toString().padStart(2, '0'),
            setDateText = `${year}${month}`;
        setDate.setMonth(setDate.getMonth() + 1);

        // 연도 표시
        if(index == 0){
            yearElements[0].textContent = `${year}년`;
            if(month == '01'){
                yearElements[0].setAttribute('colSpan', 12);
                yearElements[1].classList.add('disable');
            }else{
                const colSpan = 13 - Number(month)
                yearElements[0].setAttribute('colSpan', colSpan);
                yearElements[1].classList.remove('disable');
                yearElements[1].textContent = `${year + 1}년`;
                yearElements[1].setAttribute('colSpan', 12 - colSpan);
            }
        }
        monthElements[index].textContent = month;

        let groupIndex = 0;
        for(const gid of [88,87,85,84,83,82,'kWhFactory1',89,81,'kWhFactory2',80,80]){
            let kWh = 0;
            if(isNaN(gid)){
                kWh = billData[setDateText][gid];
            }else{
                kWh = billData[setDateText][gid].kWh;

                if(groupIndex <= 10){ // 일광정공 소계부분은 제외
                    monthSum[index] += kWh;
                    kWhTotal += kWh;
                }
            }
            groupSum[groupIndex] += kWh;
            elements[groupIndex * 12 + index].textContent = kWh.toLocaleString('ko-KR');
            groupIndex += 1;
        }
    }

    // 합계
    elements = document.getElementById('detailWatt').querySelectorAll('[data-tag="sum"]');
    for(let index = 0; index < 12; index++){
        elements[index].textContent = groupSum[index].toLocaleString('ko-KR');
    }
    for(let index = 0; index < 12; index++){
        elements[12 + index].textContent = monthSum[index].toLocaleString('ko-KR');
    }
    elements[24].textContent = kWhTotal.toLocaleString('ko-KR');
};


/*
세부내역 - 납입금액
billData    요금고지서 정보
thisYear    조회연도
thisMonth   조회월
*/
vio.randerDetailGold = function(billData, thisYear, thisMonth){
    const yearElements = document.getElementById('detailGoldHead').querySelectorAll('[data-tag="year"]'),
        monthElements = document.getElementById('detailGoldHead').querySelectorAll('[data-tag="month"]');
    let elements = document.getElementById('detailGold').querySelectorAll('[data-tag="no"]');

    const groupSum = [0,0,0,0,0,0,0,0,0,0,0,0,0],
        monthSum = [0,0,0,0,0,0,0,0,0,0,0,0,0];

    let goldTotal = 0;

    const setDate = new Date(`${thisMonth}/1/${thisYear}`);
    setDate.setMonth(setDate.getMonth() - 11);
    for(let index = 0; index < 12; index++){
        const year = setDate.getFullYear(),
            month = (setDate.getMonth() + 1).toString().padStart(2, '0'),
            setDateText = `${year}${month}`;
        setDate.setMonth(setDate.getMonth() + 1);

        // 연도 표시
        if(index == 0){
            yearElements[0].textContent = `${year}년`;
            if(month == '01'){
                yearElements[0].setAttribute('colSpan', 12);
                yearElements[1].classList.add('disable');
            }else{
                const colSpan = 13 - Number(month)
                yearElements[0].setAttribute('colSpan', colSpan);
                yearElements[1].classList.remove('disable');
                yearElements[1].textContent = `${year + 1}년`;
                yearElements[1].setAttribute('colSpan', 12 - colSpan);
            }
        }
        monthElements[index].textContent = month;

        let groupIndex = 0;
        for(const gid of [88,87,85,84,83,82,'goldFactory1',89,81,'goldFactory2',80,80]){
            let gold = 0;
            if(isNaN(gid)){
                gold = billData[setDateText][gid];
            }else{
                gold = billData[setDateText][gid].gold;

                if(groupIndex <= 10){ // 일광정공 소계부분은 제외
                    monthSum[index] += gold;
                    goldTotal += gold;
                }
            }
            groupSum[groupIndex] += gold;
            elements[groupIndex * 12 + index].textContent = gold.toLocaleString('ko-KR');
            groupIndex += 1;
        }
    }

    // 합계
    elements = document.getElementById('detailGold').querySelectorAll('[data-tag="sum"]');
    for(let index = 0; index < 12; index++){
        elements[index].textContent = groupSum[index].toLocaleString('ko-KR');
    }
    for(let index = 0; index < 12; index++){
        elements[12 + index].textContent = monthSum[index].toLocaleString('ko-KR');
    }
    elements[24].textContent = goldTotal.toLocaleString('ko-KR');
};


/*
근무일수 데이터 저장
*/
vio.setWorks = async function(){
    const elements = document.getElementById('detailWork').querySelectorAll('[data-fid]'),
        params = {
            cf: 'setWorks',
            setWorks : {},
        };
    /*
    setWorks : {
        yyyy : {
            fid : {
                mm : 0,
                ...
            },
            ...
        },
        ...
    }
    */
    for(const element of elements){
        const year = element.getAttribute('data-year'),
            fid = element.getAttribute('data-fid');

        if(!params.setWorks.hasOwnProperty(year)){
            params.setWorks[year] = {};
        }

        if(!params.setWorks[year].hasOwnProperty(fid)){
            params.setWorks[year][fid] = {};
        }

        params.setWorks[year][fid][element.getAttribute('data-month')] = element.value;
    }

    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/reportIK/${this._fid}`, {
            method: 'POST', headers: {'Authorization': `x-auth ${this._accessToken}`, 'Content-Type': 'application/json;charset=utf-8' },
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
                    this.toast({ memo: '근무일수가 저장 되었습니다.' });
                    this.getReport();
                    break;
                default:
                    this.toast({ memo: '데이터가 존재하지 않습니다.' });
            }
        }
    }
};


/*
차트용 옵션
title       차트제목
xAxisData   월
series      데이터
*/
vio.initChartOption = function(title, xAxisData, series){
    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                // Use axis to trigger tooltip
                type: 'shadow' // 'shadow' as default; can also be 'line' or 'shadow'
            }
        },
        title: {
            text: title,
            textStyle: {
                color: '#c0c0c0',
            },
            textAlign: 'center',
            left: '50%',
            top: '4%',
        },
        legend: {
            textStyle:{
                color: '#c0c0c0',
            },
            bottom: '0',
        },
        grid: {
            left: '4%',
            right: '4%',
            bottom: '10%',
            containLabel: true,
        },
        xAxis: {
            type: 'category',
            data: xAxisData,
            axisLabel:{
                color: '#c0c0c0',
            },
            splitLine: {
                show: true,
                showMinLine: true,
                interval: 8,
                lineStyle: {
                    color: '#606060',
                },
            },
        },
        yAxis: [
            {
                type: 'value',
                name: '사용량\n천kW',
                nameTextStyle : {
                    align: 'right',
                    color: '#c0c0c0',
                },
                axisLabel:{
                    color: '#c0c0c0',
                },
                splitLine: {
                    show: false,
                },
                boundaryGap: [0, '20%'],
            },
            {
                type: 'value',
                name: '근무일수',
                nameTextStyle : {
                    color: '#c0c0c0',
                },
                axisLabel:{
                    color: '#c0c0c0',
                },
                splitLine: {
                    show: false,
                },
            },
        ],
        series : series,
    };
};


vio.getReport = async function () {
    const params = {
        cf : 'report',
        inputDate: document.getElementById('inputDate').value
    };

    if(params.inputDate == ''){
        this.toast({ memo: '조회할 날짜를 선택해주세요.' });
    }else if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/reportIK/${this._fid}`, {
            method: 'POST', headers: {'Authorization': `x-auth ${this._accessToken}`, 'Content-Type': 'application/json;charset=utf-8' },
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
                    // 데이터 체크를 위한 날짜정의
                    const nowDate = new Date(`${params.inputDate}-01`),
                        thisYear = nowDate.getFullYear(),
                        thisMonth = (nowDate.getMonth() + 1).toString().padStart(2,'0');

                    nowDate.setMonth(nowDate.getMonth() - 1);
                    const lastYear = nowDate.getFullYear(),
                        lastMonth = (nowDate.getMonth() + 1).toString().padStart(2,'0');

                    nowDate.setMonth(nowDate.getMonth() - 11);
                    const yearAgo = nowDate.getFullYear();

                    // 차트에 사용할 최근 6개월
                    const xAxisData = [];
                    // 차트데이터
                    let series0 = {}, // 단조공장
                        series1 = {};

                    // 데이터 체크
                    for(let monthIndex = 0; monthIndex < 13; monthIndex++){
                        const yyyymm = `${nowDate.getFullYear()}${(nowDate.getMonth() + 1).toString().padStart(2,'0')}`;
                        if(!jsonData.bill.hasOwnProperty(yyyymm)){
                            jsonData.bill[yyyymm] = {
                                'mWh': 0,           // 전체합
                                'mWhFactory1': 0,   // 1공장
                                'mWhFactory2': 0,   // 2공장
                                'kWh': 0,
                                'kWhFactory1': 0,
                                'kWhFactory2': 0,
                                'gold': 0,          // 사용요금
                                'goldFactory1': 0,
                                'goldFactory2': 0,
                                'kGold': 0,         // 사용요금
                                'kGoldFactory1': 0,
                                'kGoldFactory2': 0,
                                'kTax': 0,          // 공급가 + 전력기금
                                'kTaxFactory1': 0,
                                'kTaxFactory2': 0,
                                'kWTax': 0,         // kW당 요금
                                'kWTaxFactory1': 0,
                                'kWTaxFactory2': 0,
                                'work': 0,         // 평균 근무일수
                                'workFactory1': 0,
                                'workFactory2': 0,
                            };
                            for(const fid of this._firmIdn){
                                jsonData.bill[yyyymm][fid] = {
                                    gold: 0,    // 요금 원.
                                    kGold: 0,   // 요금 천원.
                                    work: 0,    // 근무일수
                                    kWh: 0,     // 전력 kWh
                                    mWh: 0,     // 전력 mWh
                                    kTax: 0,    // 공급가 + 전력기금
                                    base: 0,    // 기본요금
                                    kWTax: 0,   // kW당 요금
                                    kWMax: 0,   // 최대수요전력
                                    kWAble: 0.  // 요금적용전력
                                }
                            }
                        }else{
                            for(const fid of this._firmIdn){
                                if(!jsonData.bill[yyyymm].hasOwnProperty(fid)){
                                        jsonData.bill[yyyymm][fid] = {
                                        gold: 0,
                                        kGold: 0,
                                        work: 0,
                                        kWh: 0,
                                        mWh: 0,
                                        kTax: 0,
                                        base: 0,
                                        kWTax: 0,
                                        kWMax: 0,
                                        kWAble: 0.
                                    }
                                }else{
                                    jsonData.bill[yyyymm][fid].kGold = Math.round(jsonData.bill[yyyymm][fid].gold / 1000);
                                    jsonData.bill[yyyymm][fid].mWh = Math.round(jsonData.bill[yyyymm][fid].kWh / 1000);

                                    const work = jsonData.bill[yyyymm][fid].work;
                                    const kWTax = Math.round(jsonData.bill[yyyymm][fid].kTax / jsonData.bill[yyyymm][fid].mWh);
                                    jsonData.bill[yyyymm][fid].kWTax = kWTax;
                                    jsonData.bill[yyyymm].kWTax += kWTax;
                                    jsonData.bill[yyyymm].work += work;
                                    if(fid == 81 || fid == 89){
                                        jsonData.bill[yyyymm].kWTaxFactory2 += kWTax;
                                        jsonData.bill[yyyymm].workFactory2 += work;
                                    }else if(fid != 90){
                                        jsonData.bill[yyyymm].kWTaxFactory1 += kWTax;
                                        jsonData.bill[yyyymm].workFactory1 += work;
                                    }
                                }
                            }
                            // kW당 요금계는 평균
                            jsonData.bill[yyyymm].kWTax = Math.round(jsonData.bill[yyyymm].kWTax / 9);
                            jsonData.bill[yyyymm].kWTaxFactory1 = Math.round(jsonData.bill[yyyymm].kWTaxFactory1 / 6);
                            jsonData.bill[yyyymm].kWTaxFactory2 = Math.round(jsonData.bill[yyyymm].kWTaxFactory2 / 2);

                            // kWh -> mWh
                            jsonData.bill[yyyymm].mWh = Math.round(jsonData.bill[yyyymm].kWh / 1000);
                            jsonData.bill[yyyymm].mWhFactory1 = Math.round(jsonData.bill[yyyymm].kWhFactory1 / 1000);
                            jsonData.bill[yyyymm].mWhFactory2 = Math.round(jsonData.bill[yyyymm].kWhFactory2 / 1000);

                            // 원 -> 천원
                            jsonData.bill[yyyymm].kGold = Math.round(jsonData.bill[yyyymm].gold / 1000);
                            jsonData.bill[yyyymm].kGoldFactory1 = Math.round(jsonData.bill[yyyymm].goldFactory1 / 1000);
                            jsonData.bill[yyyymm].kGoldFactory2 = Math.round(jsonData.bill[yyyymm].goldFactory2 / 1000);

                            // 근무일수 평균
                            jsonData.bill[yyyymm].work = Math.round(jsonData.bill[yyyymm].work / 9);
                            jsonData.bill[yyyymm].workFactory1 = Math.round(jsonData.bill[yyyymm].workFactory1 / 6);
                            jsonData.bill[yyyymm].workFactory2 = Math.round(jsonData.bill[yyyymm].workFactory2 / 2);
                        }
                        // 차트데이터
                        if(monthIndex > 6){
                            xAxisData.push(`${(nowDate.getMonth() + 1).toString().padStart(2, '0')}월`);

                            if(monthIndex == 7){ // 차트데이터 설정
                                series0 = [
                                    {
                                        name: '단조A',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#ffc000',
                                        },
                                        data: [jsonData.bill[yyyymm][85].mWh]
                                    },
                                    {
                                        name: '단조C',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#002060',
                                        },
                                        data: [jsonData.bill[yyyymm][84].mWh]
                                    },
                                    {
                                        name: '근무일수',
                                        type: 'line',
                                        label: {
                                            show: true,
                                            position: 'top',
                                            color: '#ff0000',
                                        },
                                        itemStyle: {
                                            color: '#ff0000',
                                        },
                                        yAxisIndex: 1,
                                        data: [jsonData.bill[yyyymm][84].work]
                                    }
                                ];

                                series1 = [
                                    {
                                        name: '가공D',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#92d050',
                                        },
                                        data: [jsonData.bill[yyyymm][88].mWh]
                                    },
                                    {
                                        name: '가공E',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#00b050',
                                        },
                                        data: [jsonData.bill[yyyymm][87].mWh]
                                    },
                                    {
                                        name: '제2공장',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#00b0f0',
                                        },
                                        data: [jsonData.bill[yyyymm][89].mWh]
                                    },
                                    {
                                        name: '근무일수',
                                        type: 'line',
                                        label: {
                                            show: true,
                                            position: 'top',
                                            color: '#ff0000',
                                        },
                                        itemStyle: {
                                            color: '#ff0000',
                                        },
                                        yAxisIndex: 1,
                                        data: [jsonData.bill[yyyymm][89].work]
                                    }
                                ];

                                series2 = [
                                    {
                                        name: '천안',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#7030a0',
                                        },
                                        data: [jsonData.bill[yyyymm][83].mWh]
                                    },
                                    {
                                        name: '천안2',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#ff0000',
                                        },
                                        data: [jsonData.bill[yyyymm][82].mWh]
                                    },
                                    {
                                        name: '근무일수',
                                        type: 'line',
                                        label: {
                                            show: true,
                                            position: 'top',
                                            color: '#ff0000',
                                        },
                                        itemStyle: {
                                            color: '#ff0000',
                                        },
                                        yAxisIndex: 1,
                                        data: [jsonData.bill[yyyymm][82].work]
                                    }
                                ];

                                series3 = [
                                    {
                                        name: '사봉',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#7f7f7f',
                                        },
                                        data: [jsonData.bill[yyyymm][81].mWh]
                                    },
                                    {
                                        name: '근무일수',
                                        type: 'line',
                                        label: {
                                            show: true,
                                            position: 'top',
                                            color: '#ff0000',
                                        },
                                        itemStyle: {
                                            color: '#ff0000',
                                        },
                                        yAxisIndex: 1,
                                        data: [jsonData.bill[yyyymm][81].work]
                                    }
                                ];

                                series4 = [
                                    {
                                        name: '일광정공',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#10253f',
                                        },
                                        data: [jsonData.bill[yyyymm][80].mWh]
                                    },
                                    {
                                        name: '근무일수',
                                        type: 'line',
                                        label: {
                                            show: true,
                                            position: 'top',
                                            color: '#ff0000',
                                        },
                                        itemStyle: {
                                            color: '#ff0000',
                                        },
                                        yAxisIndex: 1,
                                        data: [jsonData.bill[yyyymm][80].work]
                                    }
                                ];

                                series5 = [
                                    {
                                        name: '단조A',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#ffc000',
                                        },
                                        data: [jsonData.bill[yyyymm][85].mWh]
                                    },
                                    {
                                        name: '단조C',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#002060',
                                        },
                                        data: [jsonData.bill[yyyymm][84].mWh]
                                    },
                                    {
                                        name: '가공D',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#92d050',
                                        },
                                        data: [jsonData.bill[yyyymm][88].mWh]
                                    },
                                    {
                                        name: '가공E',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#00b050',
                                        },
                                        data: [jsonData.bill[yyyymm][87].mWh]
                                    },
                                    {
                                        name: '제2공장',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#00b0f0',
                                        },
                                        data: [jsonData.bill[yyyymm][89].mWh]
                                    },
                                    {
                                        name: '천안',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#7030a0',
                                        },
                                        data: [jsonData.bill[yyyymm][83].mWh]
                                    },
                                    {
                                        name: '천안2',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#ff0000',
                                        },
                                        data: [jsonData.bill[yyyymm][82].mWh]
                                    },
                                    {
                                        name: '사봉',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#7f7f7f',
                                        },
                                        data: [jsonData.bill[yyyymm][81].mWh]
                                    },
                                    {
                                        name: '일광정공',
                                        type: 'bar',
                                        stack: 'total',
                                        label: {
                                            show: true,
                                        },
                                        emphasis: {
                                            focus: 'series',
                                        },
                                        itemStyle: {
                                            color: '#10253f',
                                        },
                                        data: [jsonData.bill[yyyymm][80].mWh]
                                    },
                                    {
                                        name: '근무일수',
                                        type: 'line',
                                        label: {
                                            show: true,
                                            position: 'top',
                                            color: '#ff0000',
                                        },
                                        itemStyle: {
                                            color: '#ff0000',
                                        },
                                        yAxisIndex: 1,
                                        data: [
                                            Math.round(( jsonData.bill[yyyymm][89].work + jsonData.bill[yyyymm][88].work + jsonData.bill[yyyymm][87].work + jsonData.bill[yyyymm][85].work + jsonData.bill[yyyymm][84].work + jsonData.bill[yyyymm][83].work +jsonData.bill[yyyymm][82].work + jsonData.bill[yyyymm][81].work + jsonData.bill[yyyymm][80].work) / 9 * 10) / 10
                                        ]
                                    }
                                ];
                            }else{ // 차트데이터 추가
                                series0[0].data.push(jsonData.bill[yyyymm][85].mWh);
                                series0[1].data.push(jsonData.bill[yyyymm][84].mWh);
                                series0[2].data.push(jsonData.bill[yyyymm][84].work);
                                series1[0].data.push(jsonData.bill[yyyymm][88].mWh);
                                series1[1].data.push(jsonData.bill[yyyymm][87].mWh);
                                series1[2].data.push(jsonData.bill[yyyymm][89].mWh);
                                series1[3].data.push(jsonData.bill[yyyymm][89].work);
                                series2[0].data.push(jsonData.bill[yyyymm][83].mWh);
                                series2[1].data.push(jsonData.bill[yyyymm][82].mWh);
                                series2[2].data.push(jsonData.bill[yyyymm][82].work);
                                series3[0].data.push(jsonData.bill[yyyymm][81].mWh);
                                series3[1].data.push(jsonData.bill[yyyymm][81].work);
                                series4[0].data.push(jsonData.bill[yyyymm][80].mWh);
                                series4[1].data.push(jsonData.bill[yyyymm][80].work);

                                series5[0].data.push(jsonData.bill[yyyymm][85].mWh);
                                series5[1].data.push(jsonData.bill[yyyymm][84].mWh);
                                series5[2].data.push(jsonData.bill[yyyymm][88].mWh);
                                series5[3].data.push(jsonData.bill[yyyymm][87].mWh);
                                series5[4].data.push(jsonData.bill[yyyymm][89].mWh);
                                series5[5].data.push(jsonData.bill[yyyymm][83].mWh);
                                series5[6].data.push(jsonData.bill[yyyymm][82].mWh);
                                series5[7].data.push(jsonData.bill[yyyymm][81].mWh);
                                series5[8].data.push(jsonData.bill[yyyymm][80].mWh);
                                series5[9].data.push(Math.round(( jsonData.bill[yyyymm][89].work + jsonData.bill[yyyymm][88].work + jsonData.bill[yyyymm][87].work + jsonData.bill[yyyymm][85].work + jsonData.bill[yyyymm][84].work + jsonData.bill[yyyymm][83].work +jsonData.bill[yyyymm][82].work + jsonData.bill[yyyymm][81].work + jsonData.bill[yyyymm][80].work) / 9 * 10) / 10);
                            }
                        }
                        nowDate.setMonth(nowDate.getMonth() + 1);
                    }

                    this.randerMonthPower(jsonData.bill, thisYear, thisMonth, lastYear, lastMonth);
                    this.randerYearPower(jsonData.bill, thisYear, thisMonth, yearAgo);
                    this.randerThisMonthPower(jsonData.bill[`${thisYear}${thisMonth}`]);
                    this.randerForBill(jsonData.bill[`${thisYear}${thisMonth}`]);
                    this.randerContrast(jsonData.bill, thisYear, thisMonth, lastYear, lastMonth);
                    this.randerDetailPeak(jsonData.bill, thisYear, thisMonth);
                    this.randerDetailWork(jsonData.bill, thisYear, thisMonth);
                    this.randerDetailWatt(jsonData.bill, thisYear, thisMonth);
                    this.randerDetailGold(jsonData.bill, thisYear, thisMonth);

                    this._echart0.setOption(this.initChartOption('단조공장', xAxisData, series0));
                    this._echart1.setOption(this.initChartOption('가공공장', xAxisData, series1));
                    this._echart2.setOption(this.initChartOption('천안공장', xAxisData, series2));
                    this._echart3.setOption(this.initChartOption('사봉공장', xAxisData, series3));
                    this._echart4.setOption(this.initChartOption('익산공장', xAxisData, series4));
                    this._echart5.setOption(this.initChartOption('공장전체', xAxisData, series5));
                    break;
                default:
                    this.toast({ memo: '데이터가 존재하지 않습니다.' });
            }
        }
    }

};


window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();

    // 전력 사용량 분석 보고서
    vio._echart0 = echarts.init(document.getElementById('chart-container0'), null, {renderer: 'canvas', useDirtyRect: false});
    vio._echart1 = echarts.init(document.getElementById('chart-container1'), null, {renderer: 'canvas', useDirtyRect: false});
    vio._echart2 = echarts.init(document.getElementById('chart-container2'), null, {renderer: 'canvas', useDirtyRect: false});
    vio._echart3 = echarts.init(document.getElementById('chart-container3'), null, {renderer: 'canvas', useDirtyRect: false});
    vio._echart4 = echarts.init(document.getElementById('chart-container4'), null, {renderer: 'canvas', useDirtyRect: false});
    vio._echart5 = echarts.init(document.getElementById('chart-container5'), null, {renderer: 'canvas', useDirtyRect: false});

    const nowDate = new Date();
    nowDate.setMonth(nowDate.getMonth() - 1);
    document.getElementById('inputDate').value = nowDate.toLocaleDateString('sv-SE').substr(0,7);

    document.getElementById('act').addEventListener('click', function () {
        vio.getReport();
    });

    document.getElementById('actSave').addEventListener('click', function () {
        vio.setWorks();
    });

    vio.getReport();
    setTimeout(function(){
        vio._echart0.resize();
        vio._echart1.resize();
        vio._echart2.resize();
        vio._echart3.resize();
        vio._echart4.resize();
        vio._echart5.resize();
    }, 1024);

    window.addEventListener('resize', function(){
        vio._echart0.resize();
        vio._echart1.resize();
        vio._echart2.resize();
        vio._echart3.resize();
        vio._echart4.resize();
        vio._echart5.resize();
    });
});
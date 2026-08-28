'use strict';

vio._isInit = true;
vio._count = 0;
vio._firms = [];
vio._peakFirm = [];
vio._timer = null;
vio._page = 0;
vio._map = null; // 전체 지도
vio._lat = 36.267749;
vio._lng = 127.345789;
vio._rankingChart = null;
vio._chartTimer = null;
vio._currentFid = null;
vio._markerSvg = '';
vio._markerInfo = {
    0: '#ffff81', // 정상
    1: '#ffa403', // 피크발생
    2: '#ff0000', // 통신불량
    3: '#76ff03' // 제안업체
};
vio._startDate = 1737644400; // 저압 계측기 1시간 데이터 최초 시간
vio._mapData = [];
vio._isError = false;
vio._orderBy = '';
vio._orderByList = ['firmNameDESC', 'thisPowerDESC', 'frugalRatioDESC', 'frugalMonthDESC'];
vio._selectIndex = 0;
vio._orderByElement = null;
vio._markers = [];
vio._currentOverlay = null;
vio._firmList = null;
vio._peakDetail = null;

/**
 * 초기화
 */
vio.lowStatReady = async function() {
    this._markerSvg = await this.getMarkerSvg();
    this._firmList = document.getElementById('firmList');
    this._peakDetail = document.getElementById('peakDetailWrap');

    await vio.firm();
    await vio.stat(1);
    await vio.frugal();
    await vio.ranking();
    await vio.equipment();

    await vio.repeatStat();

    vio._orderByElement = document.getElementById('orderBy');
};

/**
 * 업체 기본 정보 API 데이터 요청
 * @returns {Promise<void>}
 */
vio.firm = async function() {
    const params = {
        content: 'firm'
    };

    const res = await fetch(`/api/stat/${this._fid}`, {
        method: 'POST',
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
        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            this._firms = jsonData.data;
        }
    }
};

/**
 * 지도에 업체 마커 표시
 */
vio.dataTransFirmMap = function() {
    const svgElement = this._markerSvg;

    for (let i = 0; i < this._peakFirm.length; i++) {
        const item = this._peakFirm[i],
            firm = this._firms.find(row => row.fid === item[0]),
            peakRatio = this.getRatio(item[1], item[2]);

        if (!firm) {
            continue;
        }

        const mapGeo = firm.mapGeo ? firm.mapGeo.replace('POINT(', '').replace(')', '').split(' ') : [],
            lat = mapGeo.length && mapGeo[1] ? parseFloat(mapGeo[1]) : 0,
            lng = mapGeo.length && mapGeo[0] ? parseFloat(mapGeo[0]) : 0;

        if (this._isInit && lat && lng) {
            firm.lat = lat;
            firm.lng = lng;

            let color = this._markerInfo[0],
                index = 2;

            if (firm.serviceType == 23) { // 제안업체
                color = this._markerInfo[3];
                index = 1;
            } else if (peakRatio > 1) {
                color = this._markerInfo[1];
                index = 2;
            } else if (firm.netError === 0) {
                color = this._markerInfo[2];
                index = 3;
            }
            svgElement.setAttribute('fill', color);
            const serialized = new XMLSerializer().serializeToString(svgElement);
            const encoded = encodeURIComponent(serialized).replace(/'/g, '%27').replace(/"/g, '%22');

            const dataUrl = `data:image/svg+xml;charset=UTF-8,${encoded}`;
            const markerImage = new kakao.maps.MarkerImage(dataUrl, new kakao.maps.Size(30, 30)),
                markerPosition = new kakao.maps.LatLng(lat, lng); // 마커가 표시될 위치입니다

            // 마커를 생성
            const marker = new kakao.maps.Marker({
                map: this._map,
                position: markerPosition,
                image: markerImage,
                zIndex: index,
                clickable: true
            });
            marker.fid = firm.fid;
            marker.defaultIndex = index;
            marker.imageUrl = dataUrl;
            vio._markers.push(marker);

            kakao.maps.event.addListener(marker, 'click', async function () {
                await vio.firmDetail(firm.fid);
            });
        }
    }
    this._isInit = false;
};

/**
 * 업체상세정보 팝업 활성화
 * @param marker
 */
vio.renderOverlay = function(marker) {
    vio.closeOverlay();

    vio._currentFid = marker.fid;

    // 기존 마커 사이즈 축소
    if (vio._marker) {
        const newImage = new kakao.maps.MarkerImage(vio._marker.imageUrl, new kakao.maps.Size(30, 30));
        vio._marker.setImage(newImage);
        vio._marker.setZIndex(vio._marker.defaultIndex);
    }

    // 새로운 오버레이 생성
    const content = this._peakDetail.cloneNode(true);
    content.removeAttribute('id');
    content.classList.remove('disable');

    vio._marker = marker;
    vio._currentOverlay = new kakao.maps.CustomOverlay({
        position: marker.getPosition(),
        content: content,
        zIndex: 4
    });
    vio._currentOverlay.setContent(content);
    vio._currentOverlay.setPosition(marker.getPosition());
    vio._currentOverlay.setMap(vio._map);

    // 지도 중앙 이동
    vio._map.setCenter(marker.getPosition());

    // 현재 마커 사이즈 확대
    const newImage = new kakao.maps.MarkerImage(marker.imageUrl, new kakao.maps.Size(48, 48));
    marker.setImage(newImage);
    marker.setZIndex(4);
};

/**
 * 업체상세정보 팝업 비활성화
 */
vio.closeOverlay = function() {
    if (vio._currentOverlay) {
        vio._currentOverlay.setMap(null);
    }
}

/**
 * 업체 상세정보 데이터 API 요청
 * @returns {Promise<void>}
 */
vio.firmDetail = async function(fid) {
    if (!fid) {
        return;
    }

    const params = {
        content: 'info',
        fid: fid
    };

    const res = await fetch(`api/stat/${this._fid}`, {
        method: 'POST',
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
        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            vio._currentFid = parseInt(fid);
            vio.dataTransPeakDetail(jsonData.info);
        }
    }
};

/**
 * 업체 상세정보 데이터 매핑
 * @param data
 */
vio.dataTransPeakDetail = function(data) {
    const dom = document,
        billWattToday = data.billWattToday,
        billWattWeek = data.billWattWeek * 1000,
        billWattMonth = data.billWattMonth * 1000,
        billWattYear = data.billWattYear * 1000,
        frugalToday = data.frugalToday,
        frugalWeek = data.frugalWeek,
        frugalMonth = data.frugalMonth,
        frugalYear = data.frugalYear,
        fid = this._currentFid,
        baseFirm = this._firms.find(row => row.fid == fid),
        peakDetailWrap = this._peakDetail,
        peakDetailRowValue = peakDetailWrap.querySelectorAll('.peakDetailRowValue'),
        peakDetailItemValue = peakDetailWrap.querySelectorAll('.peakDetailItemValue'),
        contractLimit = baseFirm && baseFirm.contractLimit ? `${this.echoNumber(baseFirm.contractLimit)}` : 0;

    peakDetailWrap.querySelector('.peakDetailFirmName').textContent = baseFirm.firmName;

    peakDetailRowValue[0].textContent = this.echoNumber(data.usedWattToday);
    peakDetailRowValue[1].textContent = this.echoNumber(data.usedWattWeek);
    peakDetailRowValue[2].textContent = this.echoNumber(data.usedWattMonth);
    peakDetailRowValue[3].textContent = this.echoNumber(data.usedWattYear);

    peakDetailRowValue[4].textContent = billWattToday && frugalToday ? Math.round(frugalToday / (billWattToday + frugalToday) * 100 * 10) / 10 : 0;
    peakDetailRowValue[5].textContent = billWattWeek && frugalWeek ? Math.round(frugalWeek / (billWattWeek + frugalWeek) * 100 * 10) / 10 : 0;
    peakDetailRowValue[6].textContent = billWattMonth && frugalMonth ? Math.round(frugalMonth / (billWattMonth + frugalMonth) * 100 * 10) / 10 : 0;
    peakDetailRowValue[7].textContent = billWattYear && frugalYear ? Math.round(frugalYear / (billWattYear + frugalYear) * 100 * 10) / 10 : 0;
    ``
    peakDetailRowValue[8].textContent = this.echoNumber(Math.round(frugalToday / 10000));
    peakDetailRowValue[9].textContent = this.echoNumber(Math.round(frugalWeek / 10000));
    peakDetailRowValue[10].textContent = this.echoNumber(Math.round(frugalMonth / 10000));
    peakDetailRowValue[11].textContent = this.echoNumber(Math.round(frugalYear / 10000));

    peakDetailItemValue[0].textContent = data.frugalTotal ? `${this.echoNumber(data.frugalTotal)}원` : '0원';
    peakDetailItemValue[1].textContent = contractLimit + 'kW';
    peakDetailItemValue[2].textContent = baseFirm.checkDay + '일';

    peakDetailItemValue[3].textContent = baseFirm.manager;
    peakDetailItemValue[4].textContent = baseFirm.phone;
    peakDetailItemValue[5].textContent = baseFirm.addressText;

    const marker = vio._markers.find(marker => marker.fid === fid);
    if (marker) {
        vio.renderOverlay(vio._markers.find(marker => marker.fid === fid));
    }

    const rows = this._firmList.querySelectorAll('.dataRow'),
        row = this._firmList.querySelector(`[data-fid="${this._currentFid}"]`);

    rows.forEach(element => element.classList.remove('active'));

    if (row) {
        row.classList.add('active');
    }
};

/**
 * 업체 정보 활성화/비활성화
 */
vio.expandFirmInfo = function(obj) {
    const wrap = obj.closest('.firmInfo');
    wrap.classList.toggle('expanded');

    if (wrap.classList.contains('expanded')) {
        // 활성화
        obj.className = 'bi bi-arrows-angle-contract';
    } else {
        // 비활성화
        obj.className = 'bi bi-arrows-angle-expand';
    }
};

vio.getMarkerSvg = async function() {
    const svgPath = '/assets/img/marker.svg'; // SVG 파일 경로

    // SVG 파일 읽기
    const response = await fetch(svgPath);
    if (!response.ok) throw new Error(`Failed to fetch SVG: ${response.statusText}`);

    const svgContent = await response.text(); // SVG 파일 내용을 텍스트로 변환

    // SVG 문자열을 DOM 요소로 변환
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

    return svgDoc.documentElement; // SVG 루트 요소
};

/**
 * 업체 정보 API 데이터 요청
 * @returns {Promise<void>}
 */
vio.stat = async function(page) {
    let apiUrl = `api/stat/${this._fid}`;
    if (page) {
        this._page = page;
    }
    if (this._page) {
        apiUrl += `/pages/${this._page}`;
    }

    const params = {
        content: 'stat',
        orderBy: this._orderBy,
    };

    if (this._page) {
        params['page'] = this._page;
    }

    const res = await fetch(apiUrl, {
        method: 'POST',
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
        if (jsonData.code) {
            vio._isError = true;
            this.toast({memo: jsonData.msg});
        } else {
            await this.dataTransStat(jsonData);
            if (this._isInit) {
                await this.dataTransFirmMap();
                await this.firmDetail(this._currentFid);
            } else {
                await this.updateMarkerColor();
            }
        }
    }
};

/**
 * 업체 정보 반복 실행
 */
vio.repeatStat = async function() {
    await vio.stat();
    vio._timer = setTimeout(async function() {
        if (!vio._isError) {
            await vio.repeatStat();

            vio._count++;
            if (vio._count % 60 === 0) {
                vio._count = 0;
                await vio.frugal();
                await vio.ranking();
                await vio.equipment();
                vio.countNumber();
            }

            // 5초마다 select 박스 변경
            if (!vio._orderByElement.value && vio._count % 5 === 0) {
                vio._selectIndex = (vio._selectIndex || 0) + 1;
                vio._selectIndex = (vio._selectIndex) % (vio._orderByList.length - 1) + 1;
                vio._orderBy = vio._orderByList[vio._selectIndex];
            }
        }
    }, 1000);
};

/**
 * 업체 정보 데이터 매핑
 */
vio.dataTransStat = function(j) {
    const dom = document,
        firmList = dom.getElementById('firmList').children,
        data = j.data;

    this._peakFirm = j.peakFirm;

    for (let i = 0; i < firmList.length; i++) {
        const item = data[i],
            firm = this._firms.find(row => item && row.fid === item[0]);

        const rowData = firmList[i],
            rowDataChildren = rowData.children;

        if (firm && item) {
            firm['peak'] = item[1];
            firm['netError'] = item[8];

            rowData.dataset.fid = firm.fid;

            let status = '';
            if (item[9] === 3) {
                // 저압 완료일 때 표시
                if (item[1]) {
                    status += '<span class="statusIcon warning"></span>';
                }
                if (item[8] === 0) {
                    status += '<span class="statusIcon emergency"></span>';
                }
            }

            rowDataChildren[0].innerHTML = status;
            rowDataChildren[1].textContent = firm.firmName;
            rowDataChildren[2].textContent = this.echoNumber(firm.contractLimit);
            rowDataChildren[3].textContent = this.echoNumber(item[2]);
            rowDataChildren[4].textContent = this.echoNumber(item[7]);
            rowDataChildren[5].textContent = this.echoNumber(item[6]);
        } else {
            rowDataChildren[0].innerHTML = '';
            rowDataChildren[1].textContent = '';
            rowDataChildren[2].textContent = '';
            rowDataChildren[3].textContent = '';
            rowDataChildren[4].textContent = '';
            rowDataChildren[5].textContent = '';
        }
    }

    if (data.length < 10) {
        for (let i = 0; i < 10 - data.length; i++) {
            const rowData = firmList[10 - (i + 1)],
                rowDataChildren = rowData.children;

            rowData.dataset.fid = '';
            rowData.classList.remove('active');
            rowDataChildren[0].innerHTML = '';
            rowDataChildren[1].textContent = '';
            rowDataChildren[2].textContent = '';
            rowDataChildren[3].textContent = '';
            rowDataChildren[4].textContent = '';
            rowDataChildren[5].textContent = '';
        }
    }

    if (!vio._currentFid && data.length) {
        vio._currentFid = data[0][0];
    }

    vio.deskPaging(j.paging);
};

/**
 * 마커 색상 업데이트
 */
vio.updateMarkerColor = function() {
    const dom = document;

    for (const marker of this._markers) {
        const item = this._peakFirm.find(row => row[0] === marker.fid);

        if (item) {
            const peakRatio = this.getRatio(item[1], item[2]);

            let color = this._markerInfo[0];
            if (item[6] === 23) {
                color = this._markerInfo[3];
            } else if (peakRatio > 1) {
                color = this._markerInfo[1];
            } else if (item[3]) {
                color = this._markerInfo[2];
            }

            let size = 30;
            if (this._currentFid === item[0]) {
                size = 48;
            }

            if (marker.imageUrl) {
                const decoded = decodeURIComponent(marker.imageUrl.split(',')[1]),
                    fill = decoded.match(/fill="([^"]+)"/);

                if (color !== fill?.[1]) {
                    const updated = decoded.replace(/fill="[^"]+"/, `fill="${color}"`),
                        newDataUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(updated);

                    const newImage = new kakao.maps.MarkerImage(newDataUrl, new kakao.maps.Size(size, size));
                    marker.setImage(newImage);
                    marker.imageUrl = newDataUrl;
                }
            }
        }
    }

    const dataRow = dom.getElementById('firmList').querySelector(`[data-fid="${this._currentFid}"]`),
        rows = dom.getElementById('firmList').querySelectorAll('.dataRow');
    rows.forEach(element => element.classList.remove('active'));

    if (!dataRow) {
    } else {
        dataRow.classList.add('active');
    }
};

/**
 * 절감금액 API 데이터 요청
 * @returns {Promise<void>}
 */
vio.frugal = async function() {
    const params = {
        content: 'frugal',
    };

    const res = await fetch(`api/stat/${this._fid}`, {
        method: 'POST',
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
        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            this.dataTransFrugal(jsonData);
        }
    }
};

/**
 * 절감금액 데이터 매핑
 * @param data
 */
vio.dataTransFrugal = function(data) {
    const dom = document,
        preCount = dom.getElementById('preCount'),
        frugalCount = dom.getElementById('frugalCount'),
        preTotal = dom.getElementById('preTotal'),
        frugalTotal = dom.getElementById('frugalTotal');

    preCount.dataset.to = data.preCount;
    frugalCount.dataset.to = data.frugalCount;
    preTotal.dataset.to = data.preTotal;
    frugalTotal.dataset.to = data.frugalTotal;
    this.countNumber();

    dom.getElementById('updateTime').textContent = this.timeAgo(data.updateTime);
    dom.getElementById('elapsedTime').textContent = this.elapsedTime(this._startDate);
    dom.getElementById('startDate').textContent = this.echoDate('y.m.d', this._startDate);
};

vio.deskPaging = function(j) {
    const current = j[0] < 1 ? 1 : j[0],
        max = j[1];

    let items = [1];

    if (current > 4) {
        items.push('…');
    }

    let r = 2,
        r1 = current - r,
        r2 = current + r;

    for (let i = r1 > 2 ? r1 : 2; i <= Math.min(max, r2); ++i) {
        items.push(i);
    }

    if (r2 + 1 < max) {
        items.push('…');
    }
    if (r2 < max) {
        items.push(max);
    }

    let out = '';
    for (let i = 0; i < items.length; ++i) {
        let item = items[i];
        let isActive = current === item ? 'active' : '';

        if (Number.isInteger(item)) {
            out += `<div class="deskPage ${isActive}" onclick="vio.stat(${item})">${item}</div>`;
        } else {
            out += `<div class="deskPage">${item}</div>`;
        }
    }

    document.getElementById('deskPages').innerHTML = out;
};

/**
 * 절감금액 랭킹 TOP 5 API 데이터 요청
 * @returns {Promise<void>}
 */
vio.ranking = async function() {
    const params = {
        content: 'top',
        type: document.getElementById('rankingFilter').value
    };

    const res = await fetch(`api/stat/${this._fid}`, {
        method: 'POST',
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
        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            this.renderRankingChart(jsonData.data);
        }
    }
};

/**
 * 절감금액 랭킹 차트 데이터 매핑
 */
vio.renderRankingChart = function(data) {
    const names = data.map(item => {
        const firm = this._firms.find(row => row.fid === item.fid);

        return firm.firmName ?? firm.fid;
    });
    const frugals = data.map(item => item.frugal ? item.frugal : 0);

    // ECharts 인스턴스 생성
    this._rankingChart = echarts.init(document.getElementById('rankingChart'), 'dark');

    // 차트 옵션 설정
    const option = {
        grid: {
            left: '1%',
            bottom: '5%',
            right: '1%',
            top: '5%',
            containLabel: true
        },
        title: {},
        backgroundColor: false,
        tooltip: {
            trigger: 'axis',
            axisPointer: {type: 'shadow'}
        },
        xAxis: {
            type: 'category',
            data: names, // 업체명 리스트
            axisLabel: {
                interval: 0, // 모든 레이블 표시
                fontSize: 11,
                overflow: 'truncate', // 글자가 길면 자름
                width: 50 // 최대 너비 설정
            },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: function(value) {
                    if (value >= 100000000) {
                        value = `${value / 100000000}억원`;
                    } else if (value >= 10000) {
                        value = `${value / 10000}만원`;
                    } else if (value >= 1000) {
                        value = `${value / 1000}천원`;
                    } else {
                        value = `${value}원`;
                    }

                    return value;
                }
            }
        },
        series: [
            {
                name: '절감금액',
                type: 'bar',
                data: frugals, // 절감금액 데이터 (단위: 만원)
                markPoint: {
                    symbol: 'circle',
                    symbolSize: 1,
                    symbolOffset: [0, 17],
                    data: [
                        {xAxis: 0, yAxis: frugals[0], label: {show: true, formatter: frugals[0] > 0 ? '🥇' : '', fontSize: 30}}, // 금메달
                        {xAxis: 1, yAxis: frugals[1], label: {show: true, formatter: frugals[1] > 0 ? '🥈' : '', fontSize: 30}}, // 은메달
                        {xAxis: 2, yAxis: frugals[2], label: {show: true, formatter: frugals[2] > 0 ? '🥉' : '', fontSize: 30}}, // 동메달
                        {xAxis: 3, yAxis: frugals[3], label: {show: true, formatter: frugals[3] > 0 ? '🏅' : '', fontSize: 30}}, // 4등
                        {xAxis: 4, yAxis: frugals[4], label: {show: true, formatter: frugals[4] > 0 ? '🏅' : '', fontSize: 30}}  // 5등
                    ]
                },
                itemStyle: {
                    color: function(params) {
                        switch (params.dataIndex) {
                            case 0:
                                return '#ffd700';
                            case 1:
                                return '#c0c0c0';
                            case 2:
                                return '#cd7f32';
                            default:
                                return '#4aacc5';
                        }
                    }
                },
            }
        ]
    };

    // 옵션을 차트에 설정
    this._rankingChart.setOption(option);
};

/**
 * 통신상태 API 데이터 요청
 * @returns {Promise<void>}
 */
vio.equipment = async function() {
    const params = {
        content: 'equipment',
    };

    const res = await fetch(`api/stat/${this._fid}`, {
        method: 'POST',
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
        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            this.dataTransEquipment(jsonData.data);
        }
    }
};

/**
 * 통신상태 데이터 매핑
 * @param data
 */
vio.dataTransEquipment = function(data) {
    let out = '';

    for (let i = 0; i < data.length; i++) {
        const item = data[i],
            firm = this._firms.find(row => row.fid === item.fid);
        if (firm) {
            out += `
            <div class="alarmItem">
                <div class="alarmCategory">
                    <span>
                        [ <span class="catName">통신상태 오류</span> ]
                    </span>
                    <span class="date">${this.echoDate('y-m-d h:i:s', item.remoteTime)}</span>
                </div>
                <div class="alarmTitle">
                    <span class="title">${firm.firmName} ${item.name} 통신끊김(${this.timeAgo(item.remoteTime)})</span>
                    <i class="bi bi-three-dots"></i>
                </div>
            </div>`;
        }
    }

    document.getElementById('cs').innerHTML = out;
};

/**
 * 지도
 */
vio.kakaoMap = function() {
    const map = document.getElementById('map') // 전체 지도

    if (typeof kakao === 'undefined') {
        return;
    }

    const mapOption = {
        center: new kakao.maps.LatLng(this._lat, this._lng), // 지도의 중심좌표
        mapTypeId: kakao.maps.MapTypeId.HYBRID,
        level: 12,
        maxLevel: 13,
    };

    this._map = new kakao.maps.Map(map, mapOption); // 지도를 생성합니다
};

/**
 * 업체 변경
 */
vio.changeFirm = async function() {
    document.getElementById('firmSelect').value = this._currentFid;
    await vio.setFirm();
};

/**
 * 초 단위의 시간을 경과된 시간 문자열로 변환
 */
vio.timeAgo = function(timestamp) {
    const now = Math.floor(Date.now() / 1000); // 현재 UNIX 타임스탬프(초)
    const diff = now - timestamp; // 현재 시간과 비교

    if (diff < 0) return '방금 전'; // 미래 시간을 방지

    const units = [
        {label: '년', value: 60 * 60 * 24 * 365},
        {label: '개월', value: 60 * 60 * 24 * 30},
        {label: '일', value: 60 * 60 * 24},
        {label: '시간', value: 60 * 60},
        {label: '분', value: 60},
        {label: '초', value: 1},
    ];

    for (const unit of units) {
        const count = Math.floor(diff / unit.value);
        if (count > 0) {
            return `${count}${unit.label} 전`;
        }
    }
    return '1초 전';
};

/**
 * D+day 계산
 */
vio.elapsedTime = function(timestamp) {
    const now = new Date(); // 현재 날짜
    const past = new Date(timestamp * 1000); // 입력받은 타임스탬프

    if (isNaN(past.getTime())) {
        return "유효하지 않은 타임스탬프입니다.";
    }

    let years = now.getFullYear() - past.getFullYear();
    let months = now.getMonth() - past.getMonth();
    let days = now.getDate() - past.getDate();

    // 일 차이 조정
    if (days < 0) {
        months -= 1;
        const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += previousMonth.getDate();
    }

    // 월 차이 조정
    if (months < 0) {
        years -= 1;
        months += 12;
    }

    // 결과 문자열 생성
    const result = [];
    if (years > 0) result.push(`${years}년`);
    if (months > 0) result.push(`${months}개월`);
    if (days > 0) result.push(`${days}일`);

    return result.length > 0 ? result.join(' ') : '0일';
},

    /**
     * 비율 반환
     * @param a
     * @param b
     * @returns {number|string}
     */
    vio.getRatio = function(a, b) {
        if (!a || !b || b === 0) return '-';

        const ratio = a / b;

        if (isNaN(ratio)) return '-';
        return ratio;
    };

/**
 * 차트 리사이즈 실행
 */
vio.resizeCharts = function() {
    if (vio._rankingChart) {
        vio._rankingChart.resize();
    }
};

/**
 * 이벤트 리스너 등록
 */
vio.eventListenerStat = function() {
    const dom = document;

    // 업체 정렬 Select Box
    dom.getElementById('orderBy').addEventListener('change', async function() {
        vio._orderBy = this.value;
        clearTimeout(vio._timer);
        await vio.repeatStat();
    });
    dom.getElementById('orderBy').addEventListener('keydown', function(event) {
        event.preventDefault();
    });

    // 업체 활성화
    dom.getElementById('firmList').addEventListener('click', async function(event) {
        const target = event.target.closest('.dataRow');

        if (target && target.dataset.fid) {
            await vio.firmDetail(target.dataset.fid);
        }
    });

    // 절감금액 랭킹 Select Box
    dom.getElementById('rankingFilter').addEventListener('change', async function() {
        await vio.ranking();
    });
    dom.getElementById('rankingFilter').addEventListener('keydown', function(event) {
        event.preventDefault();
    });
};

/**
 * 차트 리사이즈
 */
window.addEventListener('resize', function() {
    clearTimeout(vio._chartTimer);
    vio._chartTimer = setTimeout(vio.resizeCharts, 300);
});

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.netAble(true);
    await vio.kakaoMap();
    await vio.lowStatReady();
    await vio.eventListenerStat();
    await vio.netAble(false);
});

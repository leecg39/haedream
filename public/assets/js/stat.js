vio._firmName = localStorage.getItem('firmName') ?? '';
vio._map = null; // 지도 객체
vio._mapData = []; // 지도 정보
vio._markers = []; // 마커 리스트
vio._selectedMarker = null; // 클릭한 마커
vio._seledtedOverlay = null; // 클릭한 마커의 오버레이
vio._currentFid = vio._fid; // 선택한 업체의 fid
vio._searchFirmName = ''; // 업체 검색명

vio._baseFirm = []; // 업체 기본 정보
vio._baseCharge = []; // 전력요금표 정보
vio._peakFirm = []; // 업체 피크 정보

vio._firmListPage = 1; // 업체 리스트 페이지 번호

// 업체 선택
vio.selectFirm = function(marker) {
    if (!marker) {
        marker = this._markers.find(row => row.fid == vio._currentFid);
    }

    vio.firm();

    vio.moveMapCenter(marker);
    vio.markerZoomOut(marker);
    vio.markerZoomIn();
};

// 기본 데이터 API
vio.base = async function() {
    const params = {
        cf: 'base',
        firmName: vio._firmName
    };

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/stat/${this._fid}?${queryString}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            this._baseFirm = jsonData['firm'] ?? [];
            this._baseCharge = jsonData['charge'] ?? [];

            await vio.dataTransNubClientCount();
        }
    }
};

// 업체상태정보 목록 갱신
vio.repeatNub = async function() {
    await vio.nub();
    setTimeout(await vio.repeatNub, 1000);
}

// 업체상태정보 목록 API
vio.nub = async function(page, isLoaded) {
    if (page) {
        vio._firmListPage = page;
    }

    const queryString = vio.getFilteringData(vio._firmListPage);

    const res = await fetch(`api/stat/${this._fid}?${queryString}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            vio._peakFirm = jsonData.peakFirm;

            await vio.dataTransNubData(jsonData.data);
            await vio.dataTransNubPeak(jsonData.peak);

            if (isLoaded) {
                await vio.dataTransNubSaving(jsonData.saving);
                await vio.dataTransNubNet(jsonData.net);
            }

            vio.deskPaging(jsonData.paging, 'deskPages');
            vio.addMarkers();
        }
    }
};

// 업체상세 정보 API
vio.firm = async function() {
    const fid = this._currentFid;

    if (!fid) {
        return;
    }

    const params = {
        cf: 'firm',
        fid: fid,
        firmName: vio._firmName
    };

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/stat/${this._fid}?${queryString}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            vio.peakRowSelected();
            vio.dataTransPeakDetail(jsonData.peakTask);
        }
    }
};

// 최근 피크 기록 API
vio.his = async function(page) {
    const params = {
        cf: 'his',
        page: page,
        firmName: vio._firmName
    };

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/stat/${this._fid}?${queryString}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            await vio.dataTransPeakHistory(jsonData.data);

            this.deskPaging(jsonData.paging, 'historyPages');
        }
    }
};

// 요금절감성과 API
vio.rank = async function(page) {
    const params = {
        cf: 'rank',
        page: page,
        firmName: vio._firmName
    };

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`api/stat/${this._fid}?${queryString}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
    });

    if (!res.ok) {
        console.error(res.status);
    } else {
        const jsonData = await res.json();

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            await vio.dataTransPeakRank(jsonData.data, page);

            this.deskPaging(jsonData.paging, 'RankingPages');
        }
    }
};

// 업체리스트 데이터 매핑
vio.dataTransNubData = function(data) {
    const dt = document.getElementById('dataList').children;

    for (let i = 0; i < 10; ++i) {
        dt[i].id = '';
        dt[i].className = 'firmListDataRow';

        const item = data[i];
        if (!item) continue;

        const [val0, val1, val2, val3, val4, val5, val6, val7, val8, val9] = item,
            info = this._baseFirm.find(row => row.fid === val0);
        if (!info) continue;

        dt[i].classList.add('active');

        let peakRatio = this.getRatio(val1, val9);

        const peakRatioText = peakRatio > 1 ? '초과' : peakRatio > 0.8 ? '근접' : '안정',
            peakRatioColor = this.getStatusColor(peakRatio),
            icon = this.getIcon(val7),
            peakPower = val1 - val9,
            facilitiesText = val2 === 0 ? '안함' : val2 === val3 ? '전체' : '일부',
            facilitiesColor = facilitiesText === '전체' ? 'red' : facilitiesText === '일부' ? 'yellow' : '',
            ableLimitRatio = this.getRatio(info.ableLimit, val9),
            ableLimitColor = ableLimitRatio >= 1 ? 'red' : '',
            demandTime = this.getDemandTime(val5),
            demandTimeRatio = this.minSecToSec(demandTime) / 900,
            accuracyColor = val6 < 95 ? 'red' : val6 >= 98 ? 'green' : 'yellow',
            rowElements = dt[i].children;

        peakRatio = !isNaN(peakRatio) ? Math.round(peakRatio * 100) : '-';

        let demandTimeMeter = Math.round(demandTimeRatio * 100);
        demandTimeMeter = isNaN(demandTimeMeter) ? 0 : demandTimeMeter > 100 ? 100 : demandTimeMeter;

        dt[i].id = `fid-${info.fid}`;

        const firmElement = rowElements[1],
            peakStatusElement = rowElements[2],
            peakStatusTextElement = peakStatusElement.children[0],
            facilitiesElement = rowElements[3],
            facilitiesTextElement = facilitiesElement.children[0],
            controlModeElement = rowElements[4],
            controlModeOrderElement = controlModeElement.children[1],
            ableLimitElement = rowElements[5],
            ableLimitRatioElement = rowElements[6].children[0],
            powerValueElement = rowElements[7],
            peakRatioElement = rowElements[8],
            peakRatioBarElement = peakRatioElement.children[0].children[0].children[0],
            peakRatioNoneElement = peakRatioElement.children[0].children[0].children[1],
            peakRatioValueElement = peakRatioElement.children[0].children[1].children[0],
            demandTimeElement = peakRatioElement.children[1],
            accuracyElement = rowElements[9].children[0];

        rowElements[0].className = icon;
        firmElement.children[0].textContent = info.firmName;

        if (info.addressText) {
            firmElement.children[1].textContent = this.getLocalName(info.addressText);
            firmElement.children[1].classList.remove('disable');
        } else {
            firmElement.children[1].classList.add('disable');
        }

        peakStatusTextElement.className = peakRatioColor;
        peakStatusTextElement.textContent = peakRatioText;
        peakStatusElement.children[1].children[0].textContent = this.echoNumber(peakPower > 0 ? `+${peakPower}` : peakPower);

        facilitiesTextElement.className = facilitiesColor;
        facilitiesTextElement.textContent = facilitiesText;
        facilitiesElement.children[1].textContent = `${val2} / ${val3}`;

        controlModeElement.children[0].textContent = val4 ? '자동' : '수동';

        if (val4) {
            controlModeOrderElement.textContent = val8 ? '순차순위' : '우선순위';
            controlModeOrderElement.classList.remove('disable');
        } else {
            controlModeOrderElement.classList.add('disable');
        }

        ableLimitElement.children[0].children[0].textContent = this.echoNumber(info.ableLimit);
        ableLimitElement.children[1].textContent = this.echoDate('y-m-d', info.ableLimitTime);

        ableLimitRatioElement.className = ableLimitColor;
        ableLimitRatioElement.textContent = info.ableLimit && val9 ? Math.round(info.ableLimit / val9 * 100 * 10) / 10 : '-';

        powerValueElement.children[0].children[0].textContent = this.echoNumber(val1);
        powerValueElement.children[1].children[0].textContent = this.echoNumber(val9);

        if (isNaN(peakRatio) || !peakRatio) {
            peakRatioBarElement.classList.add('disable');
            peakRatioNoneElement.classList.remove('disable');
        } else {
            peakRatioBarElement.classList.remove('disable');
            peakRatioBarElement.children[0].style.width = `${isNaN(peakRatio) ? 0 : peakRatio}%`;
            peakRatioNoneElement.classList.add('disable');
        }

        peakRatioValueElement.className = peakRatioColor;
        peakRatioValueElement.textContent = peakRatio;

        demandTimeElement.children[0].children[0].children[1].style.width = `${demandTimeMeter}%`;
        demandTimeElement.children[1].textContent = demandTime;

        accuracyElement.className = accuracyColor;
        accuracyElement.textContent = val6;
    }

    this.peakRowSelected();
};

// 업체 상세정보 데이터 매핑
vio.dataTransPeakDetail = function(data) {
    const dom = document,
        fid = this._currentFid,
        baseFirm = this._baseFirm.find(row => row.fid == fid),
        baseCharge = this._baseCharge.find(row => row.costCode === baseFirm.contract),
        item = this._mapData.find(row => row.fid == fid),
        peakDetailWrap = dom.getElementById('peakDetailWrap'),
        peakDetailRowValue = peakDetailWrap.querySelectorAll('.peakDetailRowValue'),
        peakDetailItemValue = peakDetailWrap.querySelectorAll('.peakDetailItemValue'),
        checkDay = baseFirm && baseFirm.checkDay ? this.echoNumber(baseFirm.checkDay) : 0,
        contractLimit = baseFirm && baseFirm.contractLimit ? `${this.echoNumber(baseFirm.contractLimit)}` : 0;

    peakDetailWrap.querySelector('.peakDetailFirmName').textContent = baseFirm.firmName;

    peakDetailRowValue[0].textContent = data.today[1].toLocaleString();
    peakDetailRowValue[1].textContent = data.month[1].toLocaleString();
    peakDetailRowValue[2].textContent = data.year[1].toLocaleString();
    peakDetailRowValue[3].textContent = data.total[1].toLocaleString();

    peakDetailRowValue[4].textContent = data.today[2].toLocaleString();
    peakDetailRowValue[5].textContent = data.month[2].toLocaleString();
    peakDetailRowValue[6].textContent = data.year[2].toLocaleString();
    peakDetailRowValue[7].textContent = data.total[2].toLocaleString();

    peakDetailRowValue[8].textContent = data.today[0].toLocaleString();
    peakDetailRowValue[9].textContent = data.month[0].toLocaleString();
    peakDetailRowValue[10].textContent = data.year[0].toLocaleString();
    peakDetailRowValue[11].textContent = data.total[0].toLocaleString();

    peakDetailRowValue[12].textContent = data.today[3].toLocaleString();
    peakDetailRowValue[13].textContent = data.month[3].toLocaleString();
    peakDetailRowValue[14].textContent = data.year[3].toLocaleString();
    peakDetailRowValue[15].textContent = data.total[3].toLocaleString();

    peakDetailRowValue[16].textContent = data.today[4].toLocaleString();
    peakDetailRowValue[17].textContent = data.month[4].toLocaleString();
    peakDetailRowValue[18].textContent = data.year[4].toLocaleString();
    peakDetailRowValue[19].textContent = data.total[4].toLocaleString();

    peakDetailRowValue[20].textContent = Math.round(data.today[5] / 10).toLocaleString();
    peakDetailRowValue[21].textContent = Math.round(data.month[5] / 10).toLocaleString();
    peakDetailRowValue[22].textContent = Math.round(data.year[5] / 10).toLocaleString();
    peakDetailRowValue[23].textContent = Math.round(data.total[5] / 10).toLocaleString();

    peakDetailItemValue[0].textContent = baseCharge && baseCharge.costName ? baseCharge.costName : '';
    peakDetailItemValue[1].textContent = contractLimit + 'kW';
    peakDetailItemValue[2].textContent = checkDay + '일';

    peakDetailItemValue[3].textContent = baseFirm.manager;
    peakDetailItemValue[4].textContent = baseFirm.phone;
    peakDetailItemValue[5].textContent = baseFirm.addressText;

    if (this._seledtedOverlay) {
        this._seledtedOverlay.setMap(null);
    }

    if (item && item.latlng) {
        // 커스텀 오버레이 생성
        const overlay = new kakao.maps.CustomOverlay({
            position: item.latlng,
            content: peakDetailWrap.innerHTML,
            xAnchor: 0.5,
            yAnchor: 1.18
        });
        overlay.setMap(this._map);

        this._seledtedOverlay = overlay;
    }
};

// 업체 변경
vio.changeFirm = function() {
    document.getElementById('firmSelect').value = this._currentFid;
    vio.setFirm();
};

// 실시간 PEAK 현황 데이터 매핑
vio.dataTransNubPeak = function(data) {
    const dt = document.getElementById('realTimeCountWrap').querySelectorAll('.countValue');

    for (let i = 0; i < 8; ++i) {
        dt[i].textContent = data[i];
    }
};

// 최근 피크 기록 데이터 매핑
vio.dataTransPeakHistory = function(data) {
    const dt = document.getElementById('peakHistory').children;

    for (let i = 0; i < 5; ++i) {
        const item = data[i],
            historyType = dt[i].children[0],
            firmName = dt[i].children[1],
            facilities = dt[i].children[2],
            date = dt[i].children[3];

        dt[i].className = 'dataRow';
        historyType.textContent = '';
        firmName.textContent = '';
        facilities.textContent = '';
        date.textContent = '';

        if (item) {
            const baseFirm = this._baseFirm.find(row => row.fid == item[0]),
                type = this.getHistoryType(item[1]);

            dt[i].classList.add(type.color);
            historyType.textContent = type.text;
            firmName.textContent = baseFirm.firmName;
            facilities.textContent = `${item[3]}/${item[4]}`;
            date.textContent = this.echoDate('h:i:s', item[5]);
        }
    }
};

// 요금절감성과 데이터 매핑
vio.dataTransNubSaving = function(data) {
    const dt = document.getElementById('reductionAmount').getElementsByClassName('rowValue');

    for (let i = 0; i < data.length; ++i) {
        const savingToday = data[0] ? Math.round(data[0] / 10000) : 0;
        const savingThisMonth = data[1] ? Math.round(data[1] / 10000) : 0;
        const savingThisYear = data[2] ? Math.round(data[2] / 10000) : 0;

        dt[0].textContent = this.echoNumber(savingToday);
        dt[1].textContent = this.echoNumber(savingThisMonth);
        dt[2].textContent = this.echoNumber(savingThisYear);
    }
};

// 요금절감 업체 순위 데이터 매핑
vio.dataTransPeakRank = function(data, page) {
    const dt = document.getElementById('peakRank').children;

    for (let i = 0; i < 5; ++i) {
        const rank = i + 1 + ((page - 1) * 5);
        const item = data[i];

        const rankElement = dt[i].children[0],
            firmNameElement = dt[i].children[1],
            amountElement = dt[i].children[2];

        rankElement.textContent = '';
        firmNameElement.textContent = '-';
        amountElement.textContent = '-';

        if (item) {
            dt[i].classList.remove('disable');

            const baseFirm = this._baseFirm.find(row => row.fid == item[0]);
            const rankFront = genRanking(rank);

            rankElement.className = 'chargeReductionRankNumber';

            if (rankFront.class) {
                rankElement.classList.add(rankFront.class);
            } else {
                rankElement.textContent = `${rankFront.text}`;
            }
            firmNameElement.textContent = baseFirm.firmName;
            amountElement.textContent = item[1] ? this.echoNumber(Math.round(item[1] / 10000)) : '-';
        } else {
            dt[i].classList.add('disable');
        }
    }

    function genRanking(number) {
        let rank = {
            'class': '',
            'text': ''
        };

        switch (number) {
            case 1:
                rank.class = 'gold';
                break;
            case 2:
                rank.class = 'silver';
                break;
            case 3:
                rank.class = 'bronze';
                break;
            default:
                rank.text = `${number}위`;
                break;
        }

        return rank;
    }
};

// 관리업체현황 데이터 매핑
vio.dataTransNubClientCount = function() {
    const dom = document,
        now = new Date();

    now.setHours(0, 0, 0, 1);

    const thisMonth = now.setDate(1) / 1000;
    const thisMonthBaseFirm = this._baseFirm.filter(row => row.ctime >= thisMonth);

    dom.getElementById('clientsCountThisMonth').textContent = thisMonthBaseFirm.length;
    dom.getElementById('clientsCountTotal').textContent = this._baseFirm.length;
}

// 통신상태 데이터 매핑
vio.dataTransNubNet = function(data) {
    const dom = document,
        dt = dom.getElementById('statusText').getElementsByClassName('networkStatusValue'),
        circleItem = dom.getElementById('circle-front'),
        strokeDasharray = circleItem.getAttribute('stroke-dasharray'),
        good = data[0],
        bad = data[1],
        total = good + bad;

    circleItem.setAttribute('stroke-dashoffset', strokeDasharray - strokeDasharray * good / total);
    dom.getElementById('networkStatusCircleText').textContent = `${Math.round(good / total * 100)}%`;

    dt[0].textContent = this.echoNumber(bad);
    dt[1].textContent = this.echoNumber(total);
};

// 업체리스트에서 업체 선택
vio.peakRowSelected = function() {
    const dom = document,
        fid = this._currentFid,
        dataRows = dom.getElementById('dataList').getElementsByClassName('firmListDataRow'),
        element = dom.getElementById(`fid-${fid}`);

    for (let i = 0; i < dataRows.length; ++i) {
        dataRows[i].classList.remove('selected');
    }

    if (element) {
        element.classList.add('selected');
    } else if (!fid && this._seledtedOverlay) {
        this._seledtedOverlay.setMap(null);
    }
};

// 업체 선택
vio.peakDetail = function(element) {
    const fid = element.id.split('-')[1] ?? '';

    if (fid) {
        this._currentFid = fid;
        this.selectFirm();
    }
};

// 피크 기록 상태 및 색상 반환
vio.getHistoryType = function(type) {
    let item = {
        text: '',
        color: ''
    }

    switch (type) {
        case 0:
            item.text = '제어 On';
            item.color = 'aqua';
            break;
        case 1:
            item.text = '제어 Off';
            item.color = 'green';
            break;
        case 2:
            item.text = '목표전력 초과';
            item.color = 'orange';
            break;
        case 3:
            item.text = '요금전력 초과';
            item.color = 'violet';
            break;
    }

    return item;
};

// 지도 생성
vio.renderKoreaMap = function() {
    let lat,
        lng,
        level;

    if (window.innerWidth > 1280) {
        lat = 36.3085;
        lng = 126.4509;
        level = 12;
    } else {
        lat = 36.3041;
        lng = 127.8931;
        level = 13;
    }

    let container = document.getElementById('map');
    let options = {
        center: new kakao.maps.LatLng(lat, lng),
        mapTypeId: kakao.maps.MapTypeId.HYBRID,
        maxLevel: 13,
        level: level
    };

    this._map = new kakao.maps.Map(container, options);

    let positions = vio._mapData; // 마커를 표시할 위치와 title 객체 배열

    const imageSrc = '/assets/img/markers.png';
    for (const position of positions) {
        const imageSize = this.getMarkerImageSize(position.fid);
        const imageOptions = this.getMarkerSpriteOrigin(position);
        const markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize, imageOptions);

        const marker = new kakao.maps.Marker({
            map: this._map,
            position: position.latlng,
            title: position.title,
            image: markerImage,
        });

        marker.fid = position.fid;
        marker.imageSrc = imageSrc;
        marker.color = position.color;

        if (this._currentFid == position.fid) {
            this._selectedMarker = marker;
        }

        this._markers.push(marker);

        // 마커 클릭 이벤트
        kakao.maps.event.addListener(marker, 'click', function() {
            vio._currentFid = marker.fid;
            vio.selectFirm(marker);
        });
    }
};

// 지도에 마커 표시
vio.addMarkers = function() {
    this._mapData = [];
    for (let i = 0; i < this._peakFirm.length; ++i) {
        const item = this._peakFirm[i],
            fid = item[0],
            peakRatio = this.getRatio(item[1], item[2]),
            baseFirm = this._baseFirm.find(row => row.fid == fid),
            mapGeo = baseFirm && baseFirm.mapGeo ? baseFirm.mapGeo : '',
            coordinates = mapGeo.replace('POINT(', '').replace(')', '').split(' ');

        let latitude = parseFloat(coordinates[1]);
        let longitude = parseFloat(coordinates[0]);

        if (!latitude && !longitude) {
            latitude = 35.093459;
            longitude = 128.908153;
        }

        let data = {};
        data.latlng = new kakao.maps.LatLng(latitude, longitude);
        data.title = baseFirm ? baseFirm.firmName : '';
        data.fid = baseFirm ? baseFirm.fid : '';
        data.color = this.getStatusColor(peakRatio);

        this._mapData.push(data);
    }

    const imageSrc = '/assets/img/markers.png';

    if (this._markers.length) {
        for (let i = 0; i < this._markers.length; ++i) {
            let marker = this._markers[i];
            let item = this._mapData.find(row => row.fid == marker.fid);

            const imageSize = vio.getMarkerImageSize(marker.fid);
            const imageOptions = this.getMarkerSpriteOrigin(item);

            marker.setImage(new kakao.maps.MarkerImage(imageSrc, imageSize, imageOptions));
        }
    }
}

// 마커 이미지 조정
vio.getMarkerSpriteOrigin = function(item) {
    let imageOptions = {
        spriteOrigin: {},
        spriteSize: new kakao.maps.Size(120, 96)
    };

    if (this._currentFid == item.fid) {
        switch (item.color) {
            case 'red':
                imageOptions.spriteOrigin = new kakao.maps.Point(0, 0);
                break;
            case 'yellow':
                imageOptions.spriteOrigin = new kakao.maps.Point(48, 0);
                break;
            case 'orange':
                imageOptions.spriteOrigin = new kakao.maps.Point(0, 48);
                break;
            default:
                imageOptions.spriteOrigin = new kakao.maps.Point(48, 48);
                break;
        }
    } else {
        switch (item.color) {
            case 'red':
                imageOptions.spriteOrigin = new kakao.maps.Point(96, 0);
                break;
            case 'yellow':
                imageOptions.spriteOrigin = new kakao.maps.Point(96, 24);
                break;
            case 'orange':
                imageOptions.spriteOrigin = new kakao.maps.Point(96, 48);
                break;
            default:
                imageOptions.spriteOrigin = new kakao.maps.Point(96, 72);
                break;
        }
    }

    return imageOptions;
}

// 지도 마커 사이즈 반환
vio.getMarkerImageSize = function(markerFid) {
    if (markerFid == this._currentFid) {
        return new kakao.maps.Size(48, 48); // 마커의 이미지 크기
    } else {
        return new kakao.maps.Size(24, 24); // 클릭한 마커의 이미지 크기
    }
};

// 지도 마커 크기 확대
vio.markerZoomIn = function() {
    const marker = this._markers.find(row => row.fid == vio._currentFid);
    const mapItem = this._mapData.find(row => row.fid == vio._currentFid);

    marker.color = mapItem.color;

    if (marker) {
        const imageSrc = '/assets/img/markers.png';
        const imageSize = new kakao.maps.Size(48, 48);
        const imageOptions = this.getMarkerSpriteOrigin(marker);

        marker.setImage(new kakao.maps.MarkerImage(imageSrc, imageSize, imageOptions));
        vio._selectedMarker = marker;
    }
}

// 지도 중심 위치 마커 위치로 이동
vio.moveMapCenter = function(marker) {
    const mapProjection = this._map.getProjection();
    const cfc = mapProjection.containerPointFromCoords(marker.getPosition());
    if (window.innerWidth > 1280) {
        cfc.x -= 230;
    } else {
        cfc.y -= 100;
    }
    const coords = mapProjection.coordsFromContainerPoint(cfc);
    this._map.setCenter(coords);
};

// 지도 마커 크기 축소
vio.markerZoomOut = function(clickMarker) {
    const marker = this._selectedMarker || clickMarker;
    const mapItem = this._mapData.find(row => row.fid == marker.fid);

    marker.color = mapItem.color;

    if (marker) {
        const imageSrc = '/assets/img/markers.png';
        const imageSize = new kakao.maps.Size(24, 24);
        const imageOptions = this.getMarkerSpriteOrigin(marker);

        marker.setImage(new kakao.maps.MarkerImage(imageSrc, imageSize, imageOptions));
    }
}

// 지도 마커 색상 반환
vio.getMarkerColor = function(rate) {
    switch (true) {
        case rate >= 1:
            return '#dd2c00';
        case rate >= 0.9:
            return '#ffa900';
        case rate >= 0.8:
            return '#fff100';
        default:
            return '#76ff03';
    }
};

// 지도 오버레이 닫기
vio.closeOverlay = function() {
    this._seledtedOverlay.setMap(null);
}

// 업체 목록 검색 데이터 반환
vio.getFilteringData = function(page) {
    const dom = document,
        inputFirmName = this._searchFirmName,
        inputPeakExcess = dom.getElementById('inputPeakExcess').checked,
        inputPeakClose = dom.getElementById('inputPeakClose').checked,
        inputOnControl = dom.getElementById('inputOnControl').checked,
        inputEmergency = dom.getElementById('inputEmergency').checked,
        inputReviewRequired = dom.getElementById('inputReviewRequired').checked,
        selectOrderBy = dom.getElementById('selectOrderBy').value;

    let searchPeak;
    if (inputPeakExcess && inputPeakClose) {
        searchPeak = 3;
    } else if (inputPeakClose) {
        searchPeak = 2;
    } else if (inputPeakExcess) {
        searchPeak = 1;
    } else {
        searchPeak = 0;
    }

    let searchOnControl;
    if (inputOnControl) {
        searchOnControl = 1;
    } else {
        searchOnControl = 0;
    }

    let searchNote;
    if (inputEmergency && inputReviewRequired) {
        searchNote = 3;
    } else if (inputReviewRequired) {
        searchNote = 2;
    } else if (inputEmergency) {
        searchNote = 1;
    } else {
        searchNote = 0;
    }

    const orderBy = selectOrderBy.split('-');

    let data = {
        cf: 'nub',
        qs: inputFirmName,
        page: page ?? 1,
        qt: orderBy[0],
        qa: orderBy[1],
        firmName: vio._firmName
    }

    if (searchPeak) {
        data.tPeak = searchPeak;
    }
    if (searchOnControl) {
        data.tCon = searchOnControl;
    }
    if (searchNote) {
        data.tNote = searchNote;
    }

    return new URLSearchParams(data).toString();
};

// 업체 목록 검색
vio.searchClientList = function() {
    this._firmListPage = 1;
    this._searchFirmName = document.getElementById('inputFirmName').value;

    this.nub();
};

// 업체 목록 검색 초기화
vio.searchButtonReset = function() {
    const dom = document;

    dom.getElementById('inputFirmName').value = '';
    dom.getElementById('inputPeakExcess').checked = false;
    dom.getElementById('inputPeakClose').checked = false;
    dom.getElementById('inputOnControl').checked = false;
    dom.getElementById('inputEmergency').checked = false;
    dom.getElementById('inputReviewRequired').checked = false;

    this.searchClientList();
};

// 업체 상태(긴급,검토) 아이콘 클래스명 반환
vio.getIcon = function(value) {
    let icon = '';

    switch (value) {
        case 1:
            icon = 'exclamation';
            break;
        case 2:
            icon = 'check';
            break;
        case 3:
            icon = 'exclamationCheck';
            break;
    }

    return icon;
};

// 비율 반환
vio.getRatio = function(a, b) {
    if (!a || !b || b === 0) return '-';

    const ratio = a / b;

    if (isNaN(ratio)) return '-';
    return ratio;
};

// 비율 색상 반환
vio.getStatusColor = function(rate) {
    switch (true) {
        case rate >= 1:
            return 'red';
        case rate >= 0.9:
            return 'orange';
        case rate >= 0.8:
            return 'yellow';
        default:
            return 'green';
    }
};

// 업체 목록 주소 반환
vio.getLocalName = function(address) {
    const arrAddress = address.split(' ');
    return `${arrAddress[0]} ${arrAddress[1]}`;
};

// 수요시간 반환
vio.getDemandTime = function(gap) {
    const now = new Date();

    now.setSeconds(now.getSeconds() - gap);
    const min = now.getMinutes() % 15;
    const sec = now.getSeconds();

    function format2digit(num) {
        return `0${num}`.slice(-2);
    }

    return `${format2digit(min)}:${format2digit(sec)}`;
};

// 분 단위를 초 단위로 변환
vio.minSecToSec = function(minSec) {
    return +minSec.slice(0, 2) * 60 + +minSec.slice(-2);
};

// 페이지네이션
vio.deskPaging = function(j, elementId) {
    let out = '',
        clickEvent;

    switch (elementId) {
        case 'historyPages':
            clickEvent = 'vio.his';
            break;
        case 'RankingPages':
            clickEvent = 'vio.rank';
            break;
        default:
            clickEvent = 'vio.nub';
            break;
    }

    const current = j[0] < 1 ? 1 : j[0];
    const max = j[1];

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

    for (let i = 0; i < items.length; ++i) {
        let item = items[i];
        let isActive = current === item ? 'active' : '';

        if (Number.isInteger(item)) {
            out += `<div class="deskPage act ${isActive}" onclick="${clickEvent}(${item})">${item}</div>`;
        } else {
            out += `<div class="deskPage">${item}</div>`;
        }
    }

    document.getElementById(elementId).innerHTML = out;
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.base();
    await vio.nub(1, true);
    vio.renderKoreaMap();
    vio.his();
    vio.rank(1);

    setTimeout(vio.repeatNub, 1000);

    // 업체명 검색
    document.getElementById('inputFirmName').addEventListener('keyup', function(e) {
        if (e.key === 'Enter' || e.keyCode === 13) {
            history.pushState('', document.title, window.location.pathname);

            vio.searchClientList();
        }
    });
});
'use strict';

vio.getWidgets = async function() {
    const res = await fetch(`api/widgets/${this._fid}`, {
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

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            this.dataTrans(jsonData.data);
        }
    }
};

/**
 * 대시보드 위젯 설정 리스트 표시
 * @param data
 */
vio.dataTrans = function(data) {
    const dom = document,
        displayNumber = data[0] ?? '';

    dom.getElementById('displayNumber').value = displayNumber.seq ?? 5;

    const rowLength = dom.querySelectorAll('.widgetRow').length;
    for (let i = 1; i <= rowLength; i++) {
        const item = data[i] ?? '',
            dt = dom.getElementById(`widget${i}`).children;

        dt[0].children[0].checked = !(item && item.isNot === '1');
        dt[1].children[0].value = item && item.seq ? item.seq : i;
    }
};

vio.setData = async function() {
    const dom = document,
        data = [];

    data.push({
        wid: '0',
        seq: dom.getElementById('displayNumber').value,
        isNot: '0'
    });

    const rowLength = dom.querySelectorAll('.widgetRow').length;
    for (let i = 1; i <= rowLength; i++) {
        const dt = dom.getElementById(`widget${i}`).children;
        data.push({
            wid: i.toString(),
            seq: dt[1].children[0].value,
            isNot: dt[0].children[0].checked ? '0' : '1'
        })
    }

    const res = await fetch(`api/widgets/${this._fid}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `x-auth ${vio._accessToken}`,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(data)
    });

    if (!res.ok) {
        console.error(res.status);
    }  else {
        const jsonData = await res.json();

        if (jsonData.code) {
            this.toast({memo: jsonData.msg});
        } else {
            vio.toast({memo: '저장되었습니다.'});
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    await vio.getWidgets();

    document.getElementById('actSave').addEventListener('click', function() {
        vio.setData();
    });
});
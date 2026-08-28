'use strict';

vio.getData = async function() {
    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/peak-set/${this._fid}`, {
            method: 'GET',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            }
        });

        this.netAble(false);

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});

                if (jsonData.code === 403) {
                    document.getElementById('contentsArea').style.visibility = 'hidden';
                }
            } else {
                const dom = document;
                dom.getElementById('pct_ratio').value = jsonData.pct_ratio;
                dom.getElementById('pulse_num').value = jsonData.pulse_num;
                dom.getElementById('powerLimit').value = jsonData.powerLimit;
                dom.getElementById('peakRunMode').value = jsonData.peakRunMode;
                dom.getElementById('peakControlMode').value = jsonData.peakControlMode;
                dom.getElementById('peakOnDelay').value = jsonData.peakOnDelay;
                dom.getElementById('peakOffDelay').value = jsonData.peakOffDelay;
                dom.getElementById('peakFirstDelay').value = jsonData.peakFirstDelay;
                dom.getElementById('peakAlarmTime').value = jsonData.peakAlarmTime;
                dom.getElementById('peakSafe').value = jsonData.peakSafe;
            }
        }
    }
};

vio.setData = async function() {
    const dom = document,
        pd = {
            pct_ratio: dom.getElementById('pct_ratio').value,
            pulse_num: dom.getElementById('pulse_num').value,
            powerLimit: dom.getElementById('powerLimit').value,
            peakRunMode: dom.getElementById('peakRunMode').value,
            peakControlMode: dom.getElementById('peakControlMode').value,
            peakOnDelay: dom.getElementById('peakOnDelay').value,
            peakOffDelay: dom.getElementById('peakOffDelay').value,
            peakFirstDelay: dom.getElementById('peakFirstDelay').value,
            peakAlarmTime: dom.getElementById('peakAlarmTime').value,
            peakSafe: dom.getElementById('peakSafe').value,
            firmName: localStorage.getItem('firmName')
        };

    if (!this._useNetworks) {
        this.netAble(true);

        const res = await fetch(`api/peak-set/${this._fid}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `x-auth ${vio._accessToken}`,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(pd)
        });

        this.netAble(false);

        if (!res.ok) {
            console.error(res.status);
        } else {
            const jsonData = await res.json();

            if (jsonData.code) {
                this.toast({memo: jsonData.msg});
            } else {
                this.toast({memo: '저장 되었습니다.'});
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    await vio.documentReady();
    vio.getData();

    document.getElementById('actSave').addEventListener('click', function() {
        vio.setData();
    });
});
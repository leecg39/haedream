'use strict';

window.document.querySelector("link[rel*='icon']").href = window.location.hostname === 'watt.eggbz.com' ? '/assets/img/eggOnIcon.png' : '/assets/img/favicon.ico';
window.document.querySelector('title').textContent = window.location.hostname === 'watt.eggbz.com' ? '에그온' : '한국미래에너지';

/**
 * 로고 설정
 */
vio.setLogo = function() {
    const dom = document,
        loginLogo = dom.getElementById('loginLogo'),
        loginBox = dom.getElementById('loginBox'),
        titleBox = dom.getElementById('titleBox');

    if (vio.isEggOn()) {
        loginBox.classList.add('eggOn');
        loginLogo.src = './assets/img/eggon_h.png';
    } else {
        titleBox.classList.remove('disable');
        loginLogo.src = './assets/img/login_logo.svg';
    }
};

/**
 * 로그인
 * @returns {Promise<void>}
 */
vio.login = async function() {
    const dom = document,
        id = dom.getElementById('authId').value,
        pw = dom.getElementById('authPasswd').value;

    let referrer = document.referrer || 'main.html';

    if (!id) {
        this.toast({message: '아이디를 입력해주세요.'});
    } else if (!pw) {
        this.toast({message: '비밀번호를 입력해주세요.'});
    } else {
        const res = await fetch('api/tokens', {
            method: 'POST', headers: {'Content-Type': 'application/json;charset=utf-8'},
            body: `{"cf":"login","id":"${id}","pw":"${pw}"}`
        });

        if (!res.ok) {
            console.error(res.status);
        } else {
            let jsonData = await res.json(),
                {
                    authIdn = '',
                    authName = '',
                    fid = '',
                    firmName = '',
                    language = '',
                    members = [],
                    menu = {},
                    peakInfo,
                    permit = '',
                    token = '',
                } = jsonData;

            if (token) {
                //vio.setCookie('accessToken', token);
                sessionStorage.setItem('accessToken', token);
                if (dom.getElementById('authIdSave').checked) {
                    localStorage.setItem('authId', id);
                } else {
                    localStorage.setItem('authId', '');
                }

                localStorage.setItem('authId', id);
                localStorage.setItem('authIdn', authIdn);
                localStorage.setItem('authName', authName);
                localStorage.setItem('fid', fid);
                localStorage.setItem('firmName', firmName);
                localStorage.setItem('language', language);
                localStorage.setItem('members', JSON.stringify(members));
                localStorage.setItem('peakInfo', peakInfo);
                localStorage.setItem('permit', permit);

                let logoPathName = authIdn;
                if(authName === 'DEMO2'){
                    logoPathName = 'logo_enerzenic';
                }

                // 메뉴 활성/비활성 설정 값
                for(let key in menu){
                    localStorage.setItem(key, menu[key]);
                }

                const now = new Date(),
                    pad = n => n.toString().padStart(2, '0'),
                    version = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate()), pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join(''),
                    url = new URL(referrer, location.origin);
                url.searchParams.set('v', version);
                referrer = url.pathname + url.search;

                let img = new Image();
                img.src = `assets/img/logo/${logoPathName}.png`;
                img.onload = function() {
                    localStorage.setItem('logoPath', img.src);
                    location.href = referrer;
                };
                img.onerror = function() {
                    localStorage.setItem('logoPath', 'assets/img/logo/default.png');
                    location.href = referrer;
                };
            } else if (jsonData.msg) {
                this.toast({message: jsonData.msg});
            }
        }
    }
};

/**
 * 이벤트 리스너 등록
 */
vio.eventListenerLogin = function() {
    const dom = document;
    const actLoginButton = dom.getElementById('actLogin');
    const authPasswdInput = dom.getElementById('authPasswd');

    const loginHandler = async function() {
        await vio.login();
    };

    actLoginButton.addEventListener('click', loginHandler);

    authPasswdInput.addEventListener('keyup', async function(event) {
        if (event.key === 'Enter') {
            await loginHandler();
        }
    });
};

/**
 * 아이디 저장 체크박스
 */
vio.setRememberMe = function() {
    const dom = document;
    const authIdSaveCheckbox = dom.getElementById('authIdSave');
    const authIdInput = dom.getElementById('authId');

    const savedAuthId = localStorage.getItem('authId');

    if (savedAuthId) {
        authIdSaveCheckbox.checked = true;
        authIdInput.value = savedAuthId;
    }
};

window.addEventListener('DOMContentLoaded', async function() {
    vio.setLogo();
    vio.eventListenerLogin(); // 이벤트 리스너
    vio.setRememberMe(); // 아이디 저장
});
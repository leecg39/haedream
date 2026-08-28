# FitLoginPage Specification

## Overview
- **Target file:** `src/app/(fit-auth)/fit/login/page.tsx` + `src/components/fit/FitLoginForm.tsx`
- **원본:** https://fit.rfenms.com/login.html · 소스 `docs/research/fit.rfenms.com/pages/login.html`
- **CSS:** `/fit/assets/css/common.css` + `/fit/assets/css/login.css` (무변환 원본)
- **Interaction model:** click-driven (셸 없음, 스크롤 동작 없음)

## DOM Structure

```
body.logBody
  .loginArea
    .loginBox#loginBox
      .left
        .titleBox#titleBox         ← isEgg=false 이므로 disable 제거되어 표시됨
          .titleT1 > img(egfit_top_logo.svg)
          .titleT2 "한전수전합리화 플랫폼"
        .logo#authLogo > img#loginLogo(login_logo.svg)
      .right.loginForm
        .title "Login"
        input#authId[type=text][placeholder=아이디]
        input#authPasswd[type=password][placeholder=비밀번호]
        .add > .info > input#authIdSave[type=checkbox] + label "아이디저장"
        button.actLogin#actLogin "LOGIN"
  .toastArea.disable#toastArea
    .toast.toastRed > .textArea#toastText
```

> **분기 주의:** `base.js isEgg()` 는 `hostname === 'fit.eggbz.com'` 일 때만 true.
> 대상 `fit.rfenms.com` 은 **false** 분기 → `.eggOn` 클래스 없음,
> `#titleBox` 의 `disable` 제거(표시), `#loginLogo` = `login_logo.svg`.

## Computed Styles (login.css 원문값)

### .logBody
- background-color: `#5082cd`
- background-image: `url(../img/loginbg.jpg)`, size cover, position center

### .loginArea
- position relative / overflow hidden / display block
- width 100% / height 100vh / min-height 100vh

### .loginBox
- position fixed / top 48% / left 50% / transform `translate(-50%, -50%)`
- display flex / align-items center / justify-content center
- width 750px / height 450px / padding 10px
- border-radius 12px / background-color #fff
- box-shadow `10px 10px 30px rgba(0,0,0,0.4)` / z-index 10

### .loginBox .left
- flex column / align center / justify space-between
- width 300px / height 430px / margin 0 auto / padding `55px 0 60px 0`
- border-radius 8px / background `linear-gradient(-45deg, #2f58c2, #4874ea)`

### .titleBox
- flex column / center / color #fff / font-size 17px / font-weight 500

### .titleT1
- flex column center / text-align center / width 143px / height 81px / gap 5px
- font-family `"Open Sans", sans-serif` / font-size 16px / font-weight 600 / line-height 1

### .left .logo img
- width 170px / height auto / opacity 0.9

### .loginBox .right
- position relative / overflow hidden
- width `calc(100% - 300px)` / height 100% / padding 65px

### .right .title
- color #333 / font-family `"Open Sans", sans-serif` / font-size 30px / font-weight 500
- line-height 1 / text-align center / margin-bottom 20px

### .loginForm
- width 330px

### input[type=text], input[type=password], .actLogin
- display inline-block / width 100% / height 50px / margin `12px auto` / padding `10px 15px`
- border `1px solid #bbb` / border-radius 8px / background-color `#fafafc`
- color #333 / font-size 16px !important / font-weight 400
- placeholder color `#aaa`

### .actLogin
- border 0 / background `linear-gradient(45deg, #2a8eda, #2a48cb)`
- color #fff / font-size 16px / font-weight 400 / letter-spacing 1px
- box-shadow `5px 5px 5px rgba(0,0,0,0.1)`

### input[type=checkbox]
- 24×24 / margin-top 1px / margin-right 8px / border `1px solid #bbb` / border-radius 3px
- `appearance:none` / cursor pointer
- `::after` content `'\F633'` (bootstrap-icons), color white, font-size 1rem, bold — 기본 `display:none`

## States & Behaviors

### input focus
- **Trigger:** `:focus`
- border `1px solid #bbb` → `1px solid #739de3`
- box-shadow 없음 → `0 0 0 1px #739de3 inset`, outline none
- **Transition:** 없음 (즉시)

### .actLogin hover
- background `linear-gradient(45deg, #2a8eda, #2a48cb)` → `linear-gradient(45deg, #2ca4f4, #4c54e6)`
- **Transition:** 없음

### .actLogin active
- box-shadow `5px 5px 5px rgba(0,0,0,0.1)` → `1px 1px 0px rgba(0,0,0,0.1)`

### 체크박스 checked
- background-color transparent → `#2a79d5`, border `1px solid #2a79d5`
- `::after` display none → block (체크 글리프 노출)

### 아이디저장
- 원본 login.js 가 localStorage 에 저장/복원

### 토스트 (검증 실패)
- **Trigger:** 아이디 미입력 → `아이디를 입력해주세요.` / 비밀번호 미입력 → `비밀번호를 입력해주세요.`
- `#toastArea` 의 `disable` 제거로 노출
- `.toastArea` position absolute / top 50px / right 30px / z-index 3000 / width 300px
- `.toast` position fixed / width 300px / min-height 90px / padding `23px 33px 23px 20px`
  / border-radius 8px / color #fff / font-size 16px / line-height 1.5
  / box-shadow `2px 7px 15px rgba(0,0,0,0.4)`
- `.toastRed` background-color `#ee3e3e` / `white-space: pre-line`

## Text Content (verbatim)
- `한전수전합리화 플랫폼`
- `Login`
- placeholder: `아이디`, `비밀번호`
- `아이디저장`
- `LOGIN`

## Assets
- `/fit/assets/img/loginbg.jpg` (배경)
- `/fit/assets/img/egfit_top_logo.svg` (titleT1)
- `/fit/assets/img/login_logo.svg` (#loginLogo)

## Responsive Behavior
- **≤1000px:** `.loginBox { width:90%; min-width:inherit }`
- **≤780px:** `.loginBox .right { padding:75px 30px }`
- **≤700px:** `.loginBox` flex-direction column, top 50%;
  `.right` width 100% padding `18px 20px 20px 20px`;
  `.left` justify center, gap 17px, width 100%, height 160px, padding `0 0 5px 0`;
  `.titleT1` 90×40, margin-bottom 15px, font-size 20px;
  `.left .logo img` width 120px; `.right .title` **display none**

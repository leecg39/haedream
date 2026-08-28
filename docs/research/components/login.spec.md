# LoginForm Specification

## Overview
- **Target file:** `src/components/LoginForm.tsx`
- **Screenshot:** (capture after ego-browser login QA)
- **Interaction model:** click-driven / keyboard Enter

## DOM Structure
`.logBody` > `.loginArea` > `.loginBox` > [`.left` (logo + title), `.right.loginForm` (inputs + LOGIN)]

## Computed Styles (from origin)
### Body
- backgroundColor: rgb(80, 130, 205)
- background-image: loginbg.jpg cover center
- fontFamily: Pretendard Variable

### .loginBox
- width: 750px, height: 450px, border-radius: 12px
- box-shadow: 10px 10px 30px rgba(0,0,0,0.4)
- position fixed, top 48%, left 50%, translate(-50%,-50%)

### .left
- width 300px, height 430px, radius 8px
- background: linear-gradient(-45deg, #2f58c2, #4874ea)

### .right .title
- Open Sans 30px/500, color #333

### inputs / LOGIN
- height 50px, radius 8px, font 16px
- LOGIN: linear-gradient(45deg, #2a8eda, #2a48cb)

## States & Behaviors
- Validation toasts for empty id/pw
- Demo API accepts any credentials
- Remember-me persists authId in localStorage

## Assets
- `/assets/img/loginbg.jpg`, `login_toplogo.svg`, `login_logo.svg`

## Text Content
- ABC 에너지 통합관제 시스템 / Login / 아이디 / 비밀번호 / 아이디저장 / LOGIN

## Responsive Behavior
- ≤1000px: box width 90%
- ≤700px: column stack, hide Login title, shrink logos

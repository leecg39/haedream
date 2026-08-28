"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

export function LoginForm() {
  const [id, setId] = useState(
    process.env.NODE_ENV === "production" ? "" : "admin",
  );
  const [pw, setPw] = useState("");
  const [remember, setRemember] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<"id" | "pw" | null>(null);
  const [loading, setLoading] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("authId");
    if (saved) {
      // Browser storage is unavailable during server rendering.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setId(saved);
      setRemember(true);
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id.trim()) {
      setToast("아이디를 입력해주세요.");
      setErrorField("id");
      idRef.current?.focus();
      return;
    }
    if (!pw) {
      setToast("비밀번호를 입력해주세요.");
      setErrorField("pw");
      passwordRef.current?.focus();
      return;
    }
    setLoading(true);
    setToast(null);
    setErrorField(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json;charset=utf-8" },
        body: JSON.stringify({ cf: "login", id, pw }),
      });
      const json = await res.json();
      if (!res.ok || !json.token) {
        setToast(
          json.error?.message || json.msg || "로그인에 실패했습니다.",
        );
        setErrorField("pw");
        passwordRef.current?.focus();
        setLoading(false);
        return;
      }
      sessionStorage.setItem("accessToken", json.token);
      localStorage.setItem("authId", remember ? id : "");
      localStorage.setItem("authIdn", json.authIdn);
      localStorage.setItem("authName", json.authName);
      localStorage.setItem("fid", json.fid);
      localStorage.setItem("firmName", json.firmName);
      localStorage.setItem("language", json.language);
      localStorage.setItem("members", JSON.stringify(json.members));
      localStorage.setItem("peakInfo", json.peakInfo);
      localStorage.setItem("permit", json.permit);
      localStorage.setItem("logoPath", "/assets/img/logo/default.png");
      for (const key in json.menu) {
        localStorage.setItem(key, json.menu[key]);
      }
      // Full navigation required — static HTML lives in /public, not App Router
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/main.html";
    } catch {
      setToast("네트워크 오류가 발생했습니다.");
      setErrorField(null);
      setLoading(false);
    }
  }

  return (
    <div className="logBody relative min-h-screen w-full overflow-hidden bg-[#5082cd] bg-[url('/assets/img/loginbg.jpg')] bg-cover bg-center">
      <div className="loginArea relative block h-screen min-h-screen w-full overflow-hidden">
        <form
          onSubmit={onSubmit}
          className="loginBox fixed top-[48%] left-1/2 z-10 flex h-[450px] w-[750px] max-w-[90%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white p-2.5 shadow-[10px_10px_30px_rgba(0,0,0,0.4)] max-[700px]:top-1/2 max-[700px]:h-auto max-[700px]:flex-col"
        >
          <div className="left flex h-[430px] w-[300px] flex-col items-center justify-between rounded-lg bg-[linear-gradient(-45deg,#2f58c2,#4874ea)] px-0 pt-[55px] pb-[60px] max-[700px]:h-40 max-[700px]:w-full max-[700px]:justify-center max-[700px]:gap-[17px] max-[700px]:p-0 max-[700px]:pb-[5px]">
            <div className="titleBox flex flex-col items-center justify-center text-[17px] font-medium text-white">
              <div className="titleT1 mb-0 flex h-[81px] w-[143px] flex-col items-center justify-center gap-[5px] font-[family-name:var(--font-display)] text-base font-semibold leading-none max-[700px]:mb-[15px] max-[700px]:h-10 max-[700px]:w-[90px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/img/login_toplogo.svg" alt="" />
              </div>
              <div className="titleT2 text-center">ABC 에너지 통합관제 시스템</div>
            </div>
            <div className="logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/img/login_logo.svg"
                alt=""
                className="h-auto w-[170px] opacity-90 max-[700px]:w-[120px]"
              />
            </div>
          </div>

          <div className="right loginForm relative h-full w-[calc(100%-300px)] overflow-hidden p-[65px] max-[780px]:px-[30px] max-[780px]:py-[75px] max-[700px]:w-full max-[700px]:px-5 max-[700px]:py-[18px]">
            <div className="title mb-5 text-center font-[family-name:var(--font-display)] text-[30px] font-medium leading-none text-[#333] max-[700px]:hidden">
              Login
            </div>
            <input
              ref={idRef}
              type="text"
              placeholder="아이디"
              aria-label="아이디"
              autoComplete="username"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                if (errorField === "id") setErrorField(null);
              }}
              aria-invalid={errorField === "id"}
              aria-describedby={errorField === "id" ? "login-error" : undefined}
              className="my-3 inline-block h-[50px] w-full rounded-lg border border-[#bbb] bg-[#fafafc] px-[15px] py-2.5 text-base text-black outline-none focus:border-[#739de3] focus:shadow-[0_0_0_1px_#739de3_inset]"
            />
            <input
              ref={passwordRef}
              type="password"
              placeholder="비밀번호"
              aria-label="비밀번호"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                if (errorField === "pw") setErrorField(null);
              }}
              aria-invalid={errorField === "pw"}
              aria-describedby={errorField === "pw" ? "login-error" : undefined}
              className="my-3 inline-block h-[50px] w-full rounded-lg border border-[#bbb] bg-[#fafafc] px-[15px] py-2.5 text-base text-black outline-none focus:border-[#739de3] focus:shadow-[0_0_0_1px_#739de3_inset]"
            />
            <div className="add my-2.5 flex items-center justify-start">
              <label className="info flex cursor-pointer items-center text-base text-[#555]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="mr-2 mt-px flex h-6 w-6 cursor-pointer appearance-none items-center justify-center rounded-[3px] border border-[#bbb] checked:border-[#2a79d5] checked:bg-[#2a79d5]"
                />
                아이디저장
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="actLogin my-3 inline-block h-[50px] w-full rounded-lg border-0 bg-[linear-gradient(45deg,#2a8eda,#2a48cb)] px-[15px] py-2.5 text-base font-normal tracking-[1px] text-white shadow-[5px_5px_5px_rgba(0,0,0,0.1)] hover:bg-[linear-gradient(45deg,#2ca4f4,#4c54e6)] active:shadow-[1px_1px_0_rgba(0,0,0,0.1)] disabled:opacity-70"
            >
              {loading ? "..." : "LOGIN"}
            </button>
            {process.env.NODE_ENV !== "production" ? (
              <p className="mt-2 text-center text-xs text-[#667085]">
                데모 계정: admin · operator · viewer / 비밀번호 demo
              </p>
            ) : null}
          </div>
        </form>
      </div>

      {toast ? (
        <div className="toastArea absolute top-[50px] right-[30px] z-[3000] w-[300px]">
          <div
            id="login-error"
            role="alert"
            aria-live="assertive"
            className="toast toastBlue fixed flex min-h-[90px] w-[300px] items-center rounded-lg bg-[#1d50e5] px-[33px] py-[23px] pr-[33px] pl-5 text-base leading-[1.5] text-white shadow-[2px_7px_15px_rgba(0,0,0,0.4)]"
          >
            {toast}
            <button
              type="button"
              className="close absolute top-0 right-0 flex h-10 w-10 items-center justify-center text-xl text-white opacity-80"
              onClick={() => {
                setToast(null);
                setErrorField(null);
              }}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

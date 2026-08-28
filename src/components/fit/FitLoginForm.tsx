"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ID_STORAGE_KEY = "fit.savedId";

/**
 * 원본 login.html + login.js 재현.
 *
 * hostname 이 fit.eggbz.com 이 아니므로(base.js isEgg) `.eggOn` 분기는 쓰지 않고
 * #titleBox 가 노출되는 else 분기를 그대로 따른다.
 */
export function FitLoginForm() {
  const router = useRouter();
  const [authId, setAuthId] = useState("");
  const [authPasswd, setAuthPasswd] = useState("");
  const [saveId, setSaveId] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(ID_STORAGE_KEY);

        if (saved) {
          setAuthId(saved);
          setSaveId(true);
        }
      } catch (error) {
        console.warn("저장된 아이디를 불러오지 못했습니다:", error);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(null), 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  const persistId = () => {
    try {
      if (saveId) {
        window.localStorage.setItem(ID_STORAGE_KEY, authId);
      } else {
        window.localStorage.removeItem(ID_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("아이디 저장에 실패했습니다:", error);
    }
  };

  // 원본 login.js 의 검증 순서와 문구를 그대로 따른다.
  const handleLogin = () => {
    if (!authId.trim()) {
      setToast("아이디를 입력해주세요.");
      return;
    }

    if (!authPasswd) {
      setToast("비밀번호를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    persistId();
    router.push("/fit/peak");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleLogin();
  };

  return (
    <>
      <div className="loginArea">
        <div className="loginBox" id="loginBox">
          <div className="left">
            <div className="titleBox" id="titleBox">
              <div className="titleT1">
                <img src="/fit/assets/img/egfit_top_logo.svg" alt="egfit" />
              </div>
              <div className="titleT2">한전수전합리화 플랫폼</div>
            </div>
            <div className="logo" id="authLogo">
              <img src="/fit/assets/img/login_logo.svg" id="loginLogo" alt="로고" />
            </div>
          </div>
          <div className="right loginForm">
            <div className="title">Login</div>
            <input
              type="text"
              id="authId"
              placeholder="아이디"
              value={authId}
              onChange={(event) => setAuthId(event.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="username"
            />
            <input
              type="password"
              id="authPasswd"
              placeholder="비밀번호"
              value={authPasswd}
              onChange={(event) => setAuthPasswd(event.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
            />
            <div className="add">
              <div className="info">
                <input
                  type="checkbox"
                  id="authIdSave"
                  checked={saveId}
                  onChange={(event) => setSaveId(event.target.checked)}
                />
                <label htmlFor="authIdSave">아이디저장</label>
              </div>
            </div>
            <button
              type="button"
              className="actLogin"
              id="actLogin"
              onClick={handleLogin}
              disabled={submitting}
            >
              LOGIN
            </button>
          </div>
        </div>
      </div>

      <div className={toast ? "toastArea" : "toastArea disable"} id="toastArea">
        <div className="toast toastRed">
          <div className="textArea" id="toastText">
            {toast}
          </div>
        </div>
      </div>
    </>
  );
}

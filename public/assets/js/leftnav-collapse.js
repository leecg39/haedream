/*
 * 정적 페이지의 왼쪽 내비 패널 접기/펼치기.
 *
 * React 에그핏(FitShellContext/FitShell)의 동작을 정적 페이지로 옮긴 것이다.
 * 접힘 상태는 localStorage 에 저장해 페이지 이동·새로고침 후에도 유지한다.
 *
 * 붙이는 법: common.css 뒤에 leftnav-collapse.css 를, 페이지 스크립트 뒤에
 * 이 파일을 <script defer> 로 추가한다.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "abc.leftNavCollapsed";
  var COLLAPSED_CLASS = "deskCollapsed";

  function readStored() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch (error) {
      // 사생활 보호 모드 등에서 접근이 막히면 기본값(펼침)을 쓴다.
      return false;
    }
  }

  function writeStored(collapsed) {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch (error) {
      // 저장 실패는 무시한다. 화면 동작에는 영향이 없다.
    }
  }

  function makeButton(className, iconClass, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.title = label;
    var icon = document.createElement("i");
    icon.className = iconClass;
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);
    return button;
  }

  function init() {
    var container = document.querySelector(".container");
    if (!container || container.querySelector(".deskNavToggle")) return;

    var collapsed = readStored();

    function apply(next) {
      collapsed = next;
      container.classList.toggle(COLLAPSED_CLASS, collapsed);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      reopen.setAttribute("aria-expanded", String(!collapsed));
      writeStored(collapsed);
    }

    var toggle = makeButton("deskNavToggle", "bi bi-chevron-left", "왼쪽 메뉴 접기");
    var reopen = makeButton("deskNavReopen", "bi bi-list", "왼쪽 메뉴 펼치기");

    toggle.addEventListener("click", function () { apply(true); });
    reopen.addEventListener("click", function () { apply(false); });

    // #leftnav 는 include 로 innerHTML 이 통째로 교체되므로 그 바깥(.container)에 붙인다.
    container.appendChild(toggle);
    container.appendChild(reopen);

    apply(collapsed);
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

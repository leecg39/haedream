"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { FIRM_EDIT_FIELDS, type FirmEditField } from "@/components/fit/firm/firmEditFields";
import { pressableProps } from "@/components/fit/firm/pressable";
import { WEATHER_STATION_GROUPS } from "@/lib/fit-mocks/weather-stations";
import type { PublicFirm } from "@/features/firms/types";

type FormValues = Record<string, string>;

/**
 * 모달의 세 가지 상태.
 *
 * `row: FirmRow | null` 하나로는 "닫힘"과 "빈 폼으로 신규 등록"을 구분할 수
 * 없어서(둘 다 null) 판별 유니온으로 나눴다.
 */
export type FirmModalState =
  | { readonly mode: "closed" }
  | { readonly mode: "create" }
  | {
      readonly mode: "edit";
      readonly row: PublicFirm;
      /** 상세 GET 의 canWritePii. false 면 PII 필드를 비활성화하고 저장에서 제외한다(ISSUE-001). */
      readonly canWritePii: boolean;
    };

export const FIRM_MODAL_CLOSED: FirmModalState = { mode: "closed" };

/** 원본은 행을 선택하면 해당 업체 값으로 폼을 채운다. */
function toFormValues(row: PublicFirm | null): FormValues {
  if (!row) return {};

  return {
    "edit-firmName": row.firmName,
    "edit-degreeCity": String(row.degreeCity),
    "edit-contract": row.contract,
    "edit-kepcoNo": row.kepcoNo,
    "edit-bone": row.bone,
    "edit-kepcoCyber": row.kepcoCyber,
    // EMS 암호는 변경 시에만 입력하는 필드라 기존 값을 채우지 않는다.
    "edit-passwd": "",
    // 한전 비밀번호는 목록 응답에 포함하지 않는다(PublicFirm 에서 제외). 화면으로
    // 흘리지 않으려는 의도이므로 편집 시에도 빈 칸으로 둔다.
    "edit-kepcoPasswd": "",
    "edit-manager": row.manager,
    "edit-phone": row.phone,
    "edit-addressText": row.addressText,
    "edit-checkDay": row.checkDay > 0 ? String(row.checkDay) : "",
    "edit-contractLimit": String(row.contractLimit),
    "edit-ableLimit": String(row.ableLimit),
    "edit-ableLimitTime": row.ableLimitTime,
    "edit-powerLimit": String(row.powerLimit),
    "edit-pct_ratio": String(row.pct_ratio),
    "edit-pulse_num": String(row.pulse_num),
    "edit-peakRunMode": String(row.peakRunMode),
    "edit-peakControlMode": String(row.peakControlMode),
    "edit-isDisable": String(row.isDisable),
    "edit-serviceType": String(row.serviceType),
    "edit-frugalTime": row.frugalTime,
    "edit-investGold": String(row.investGold),
    "edit-kepcoContract": row.kepcoContract,
    "edit-boss": row.boss,
    "edit-memo": row.memo,
    "edit-mapGeo": row.mapGeo,
  };
}

/**
 * 폼 값 → 등록 요청 본문.
 *
 * 화이트리스트 방식이다. 편집 폼에는 한전 비밀번호(`edit-kepcoPasswd`)와
 * EMS 암호(`edit-passwd`) 칸이 있지만 저장 대상이 아니므로 목록에 넣지 않는다.
 * 서버 스키마도 strictObject 라 실수로 실려도 400 으로 막힌다.
 */
const CREATE_FIELDS: readonly (readonly [string, string])[] = [
  ["edit-firmName", "firmName"],
  ["edit-contract", "contract"],
  ["edit-kepcoNo", "kepcoNo"],
  ["edit-bone", "bone"],
  ["edit-kepcoCyber", "kepcoCyber"],
  ["edit-manager", "manager"],
  ["edit-phone", "phone"],
  ["edit-addressText", "addressText"],
  ["edit-memo", "memo"],
  ["edit-boss", "boss"],
  ["edit-mapGeo", "mapGeo"],
  ["edit-kepcoContract", "kepcoContract"],
  ["edit-ableLimitTime", "ableLimitTime"],
  ["edit-frugalTime", "frugalTime"],
  ["edit-degreeCity", "degreeCity"],
  ["edit-checkDay", "checkDay"],
  ["edit-contractLimit", "contractLimit"],
  ["edit-ableLimit", "ableLimit"],
  ["edit-powerLimit", "powerLimit"],
  ["edit-pct_ratio", "pct_ratio"],
  ["edit-pulse_num", "pulse_num"],
  ["edit-investGold", "investGold"],
  ["edit-serviceType", "serviceType"],
  ["edit-peakRunMode", "peakRunMode"],
  ["edit-peakControlMode", "peakControlMode"],
  ["edit-isDisable", "isDisable"],
];

/**
 * 서버(repository FIRM_PII_CREATE_KEYS)가 PII 로 취급하는 저장 키.
 * canWritePii=false 인 편집에서는 이 키를 요청 본문에서 제외한다 —
 * 서버도 무시하지만, 사용자에게 "입력했는데 사라진다"는 착각을 주지 않으려면
 * 애초에 보내지 않는 것이 맞다(ISSUE-001).
 */
const PII_CREATE_KEYS: readonly string[] = [
  "kepcoNo",
  "bone",
  "kepcoCyber",
  "manager",
  "phone",
  "addressText",
  "memo",
  "boss",
  "mapGeo",
];

function toCreateBody(values: FormValues, excludePii = false) {
  const body: Record<string, string> = {};
  for (const [fieldId, key] of CREATE_FIELDS) {
    if (excludePii && PII_CREATE_KEYS.includes(key)) continue;
    const value = values[fieldId];
    // 빈 값은 보내지 않는다. 서버 스키마의 default 가 채운다.
    if (value !== undefined && value !== "") body[key] = value;
  }
  return body;
}

function FieldControl({
  field,
  value,
  onChange,
  inputRef,
  disabled,
}: {
  readonly field: FirmEditField;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly inputRef?: React.Ref<HTMLInputElement | HTMLSelectElement>;
  readonly disabled?: boolean;
}) {
  if (field.kind === "select") {
    return (
      <select
        ref={inputRef as React.Ref<HTMLSelectElement>}
        className="eSelect"
        id={field.id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {field.grouped ? (
          <>
            <option value="0">선택</option>
            {WEATHER_STATION_GROUPS.map((group) => (
              <optgroup label={group.label} key={group.label}>
                {group.options.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </>
        ) : (
          field.options?.map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))
        )}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.Ref<HTMLInputElement>}
      className="eInput"
      id={field.id}
      type={field.kind === "text" ? undefined : field.kind}
      maxLength={field.maxLength}
      min={field.min}
      max={field.max}
      step={field.step}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

interface FirmEditModalProps {
  readonly state: FirmModalState;
  readonly onClose: () => void;
  readonly onOpenMap: () => void;
  /** 신규 등록이 성공했을 때. 목록을 다시 불러오는 데 쓴다. */
  readonly onCreated: () => void;
}

/**
 * 원본 firm.html 의 `#modal` — 업체관리 편집 폼.
 *
 * 원본과 동일하게 `<main>` 밖에 두고 `.disable` 로 토글한다.
 * 필드 정의는 firmEditFields.ts 에 분리해 원본 마크업과 1:1 로 대응시켰다.
 */
export function FirmEditModal({ state, onClose, onOpenMap, onCreated }: FirmEditModalProps) {
  const [values, setValues] = useState<FormValues>({});
  const [loadedState, setLoadedState] = useState<FirmModalState>(FIRM_MODAL_CLOSED);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  /** 편집에서 PII 쓰기가 막혔을 때. PII 폼 필드(id) 목록과 함께 쓴다. */
  const piiLocked = state.mode === "edit" ? !state.canWritePii : false;
  const coordinate = (values["edit-mapGeo"] ?? "").split(",").map(Number);
  const coordinateNeedsReview = Boolean(values["edit-mapGeo"]) &&
    (coordinate.length !== 2 || coordinate.some((value) => !Number.isFinite(value)) ||
      Math.abs(coordinate[0]) > 180 || Math.abs(coordinate[1]) > 90);
  const piiFieldIds: readonly string[] = [
    "edit-kepcoNo",
    "edit-bone",
    "edit-kepcoCyber",
    "edit-manager",
    "edit-phone",
    "edit-addressText",
    "edit-memo",
    "edit-boss",
    "edit-mapGeo",
  ];

  // 상태 객체는 열 때마다 새로 만들어지므로 참조 비교로 전환 시점을 잡는다.
  // create 는 toFormValues(null) 이 빈 객체를 돌려줘 모든 입력이 비워진다.
  if (state !== loadedState) {
    setLoadedState(state);
    setValues(toFormValues(state.mode === "edit" ? state.row : null));
    setError("");
  }

  useEffect(() => {
    if (state.mode === "closed") return;
    const focusTimer = window.setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-disabled") !== "true" &&
          element.tabIndex !== -1,
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [state.mode, onClose]);

  /**
   * 확인 버튼. 신규 등록과 기존 업체 수정을 API 로 저장한다.
   * 성공 응답을 받기 전에는 모달을 닫지 않는다.
   */
  const handleDone = async () => {
    if (state.mode === "closed") return;
    setSaving(true);
    setError("");
    try {
      if (state.mode === "create") {
        const response = await fetch("/api/firm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toCreateBody(values)),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message ?? `등록에 실패했습니다. (HTTP ${response.status})`);
        }
      } else {
        const response = await fetch(`/api/firm/${state.row.fid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...toCreateBody(values, piiLocked),
            version: state.row.version,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message ?? `수정에 실패했습니다. (HTTP ${response.status})`);
        }
      }
      onCreated();
      onClose();
    } catch (cause) {
      console.error(state.mode === "create" ? "업체 등록 실패:" : "업체 수정 실패:", cause);
      setError(cause instanceof Error ? cause.message : "저장 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const update = (id: string, value: string) =>
    setValues((current) => ({ ...current, [id]: value }));

  return (
    <div
      className={state.mode === "closed" ? "disable" : undefined}
      id="modal"
      aria-hidden={state.mode === "closed"}
    >
      <div className="modal">
        <div className="modalBox" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="firmEditTitle">
          <i
            className="modalClose"
            id="modalActClose"
            {...pressableProps(onClose)}
            aria-label="닫기"
          />
          <div className="modalContent">
            <div className="editTitle" id="firmEditTitle">업체관리</div>
            {piiLocked ? (
              <p
                className="editNotice"
                role="note"
                style={{
                  margin: "0 0 12px",
                  padding: "8px 12px",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 4,
                  fontSize: 13,
                  color: "var(--color-leftNava, #cfd6ff)",
                }}
              >
                고객정보 열람 권한이 없는 업체입니다. 연락처·주소·메모 등 일부 항목은 수정할 수 없습니다.
              </p>
            ) : null}
            <div className="editForm">
              {FIRM_EDIT_FIELDS.map((field, index) => (
                <Fragment key={field.id}>
                  <span className={field.tip ? "tip" : undefined} data-tip={field.tip}>
                    <label htmlFor={field.id}>{field.label}</label>
                  </span>
                  <span>
                    <FieldControl
                      field={field}
                      value={values[field.id] ?? ""}
                      onChange={(value) => update(field.id, value)}
                      inputRef={index === 0 ? firstFieldRef : undefined}
                      disabled={field.id === "edit-kepcoPasswd" || (piiLocked && piiFieldIds.includes(field.id))}
                    />
                  </span>
                </Fragment>
              ))}
              <span><label htmlFor="edit-mapGeo" title="경도, 위도 순서">지도 좌표</label></span>
              <span>
                <input className="eInput" id="edit-mapGeo" placeholder="경도, 위도" maxLength={64} value={values["edit-mapGeo"] ?? ""}
                  disabled={piiLocked} onChange={(event) => update("edit-mapGeo", event.target.value)} />
                {coordinateNeedsReview ? <small role="note">원본 좌표가 지도 범위를 벗어났습니다. 확인 후 수정해 주세요.</small> : null}
              </span>
            </div>
            <p className="editNotice">한전 비밀번호는 보안상 화면에 표시하지 않습니다.</p>
          </div>
          {error ? (
            <p className="editError" role="alert">{error}</p>
          ) : null}
          <div className="modalTool">
            <span
              className="modalAct"
              {...pressableProps(onOpenMap, piiLocked)}
            >
              주소검색
            </span>
            <span
              className="modalAct"
              id="modalActDone"
              {...pressableProps(() => { void handleDone(); }, saving)}
            >
              {saving ? "저장 중…" : "확인"}
            </span>
            <span className="modalAct" id="modalActCancel" {...pressableProps(onClose)}>
              취소
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

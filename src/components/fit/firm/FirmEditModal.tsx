"use client";

import { Fragment, useState } from "react";
import { FIRM_EDIT_FIELDS, type FirmEditField } from "@/components/fit/firm/firmEditFields";
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
  | { readonly mode: "edit"; readonly row: PublicFirm };

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

function toCreateBody(values: FormValues) {
  const body: Record<string, string> = {};
  for (const [fieldId, key] of CREATE_FIELDS) {
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
}: {
  readonly field: FirmEditField;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  if (field.kind === "select") {
    return (
      <select className="eSelect" id={field.id} value={value} onChange={(event) => onChange(event.target.value)}>
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
      className="eInput"
      id={field.id}
      type={field.kind === "text" ? undefined : field.kind}
      maxLength={field.maxLength}
      min={field.min}
      max={field.max}
      step={field.step}
      value={value}
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

  // 상태 객체는 열 때마다 새로 만들어지므로 참조 비교로 전환 시점을 잡는다.
  // create 는 toFormValues(null) 이 빈 객체를 돌려줘 모든 입력이 비워진다.
  if (state !== loadedState) {
    setLoadedState(state);
    setValues(toFormValues(state.mode === "edit" ? state.row : null));
    setError("");
  }

  /**
   * 확인 버튼. 신규 등록일 때만 저장한다.
   * 기존 업체 수정 저장은 아직 범위 밖이라 예전처럼 닫기만 한다.
   */
  const handleDone = async () => {
    if (state.mode !== "create") {
      onClose();
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/firm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toCreateBody(values)),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? `등록에 실패했습니다. (HTTP ${response.status})`);
      }
      onCreated();
      onClose();
    } catch (cause) {
      console.error("업체 등록 실패:", cause);
      setError(cause instanceof Error ? cause.message : "등록 중 문제가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const update = (id: string, value: string) =>
    setValues((current) => ({ ...current, [id]: value }));

  return (
    <div className={state.mode === "closed" ? "disable" : undefined} id="modal">
      <div className="modal">
        <div className="modalBox">
          <i className="modalClose" id="modalActClose" role="button" aria-label="닫기" onClick={onClose} />
          <div className="modalContent">
            <div className="editTitle">업체관리</div>
            <div className="editForm">
              <input type="hidden" id="edit-mapGeo" maxLength={32} value={values["edit-mapGeo"] ?? ""} readOnly />
              {FIRM_EDIT_FIELDS.map((field) => (
                <Fragment key={field.id}>
                  <span className={field.tip ? "tip" : undefined} data-tip={field.tip}>
                    {field.label}
                  </span>
                  <span>
                    <FieldControl
                      field={field}
                      value={values[field.id] ?? ""}
                      onChange={(value) => update(field.id, value)}
                    />
                  </span>
                </Fragment>
              ))}
            </div>
          </div>
          {error ? (
            <p className="editError" role="alert">{error}</p>
          ) : null}
          <div className="modalTool">
            <span className="modalAct" role="button" onClick={onOpenMap}>
              주소검색
            </span>
            <span
              className="modalAct"
              id="modalActDone"
              role="button"
              aria-disabled={saving}
              onClick={() => { if (!saving) void handleDone(); }}
            >
              {saving ? "저장 중…" : "확인"}
            </span>
            <span className="modalAct" id="modalActCancel" role="button" onClick={onClose}>
              취소
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

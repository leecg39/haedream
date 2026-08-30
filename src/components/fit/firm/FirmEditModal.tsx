"use client";

import { Fragment, useState } from "react";
import { FIRM_EDIT_FIELDS, type FirmEditField } from "@/components/fit/firm/firmEditFields";
import { WEATHER_STATION_GROUPS } from "@/lib/fit-mocks/weather-stations";
import type { FirmRow } from "@/lib/fit-mocks/firm";

type FormValues = Record<string, string>;

/** 원본은 행을 선택하면 해당 업체 값으로 폼을 채운다. */
function toFormValues(row: FirmRow | null): FormValues {
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
    "edit-kepcoPasswd": row.kepcoPasswd,
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
  readonly row: FirmRow | null;
  readonly onClose: () => void;
  readonly onOpenMap: () => void;
}

/**
 * 원본 firm.html 의 `#modal` — 업체관리 편집 폼.
 *
 * 원본과 동일하게 `<main>` 밖에 두고 `.disable` 로 토글한다.
 * 필드 정의는 firmEditFields.ts 에 분리해 원본 마크업과 1:1 로 대응시켰다.
 */
export function FirmEditModal({ row, onClose, onOpenMap }: FirmEditModalProps) {
  const [values, setValues] = useState<FormValues>({});
  const [loadedRow, setLoadedRow] = useState<FirmRow | null>(null);

  if (row !== loadedRow) {
    setLoadedRow(row);
    setValues(toFormValues(row));
  }

  const update = (id: string, value: string) =>
    setValues((current) => ({ ...current, [id]: value }));

  return (
    <div className={row ? undefined : "disable"} id="modal">
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
          <div className="modalTool">
            <span className="modalAct" role="button" onClick={onOpenMap}>
              주소검색
            </span>
            <span className="modalAct" id="modalActDone" role="button" onClick={onClose}>
              확인
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

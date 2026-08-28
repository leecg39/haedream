"use client";

import { useState } from "react";

interface FirmMapModalProps {
  readonly open: boolean;
  readonly geo: string;
  readonly onClose: () => void;
}

/**
 * 원본 firm.html 의 `#kakaoMapModal` — 주소검색.
 *
 * 원본은 Kakao Maps SDK 로 `#kakaoMapArea` 에 지도를 그리고 `#kakaoMapSearch` 의
 * keyup/change 로 좌표를 옮긴다. 클론은 외부 SDK 를 로드하지 않으므로
 * 컨테이너와 id 만 원본대로 두고 내부는 정적 안내로 채운다.
 */
export function FirmMapModal({ open, geo, onClose }: FirmMapModalProps) {
  const [keyword, setKeyword] = useState("");

  return (
    <div className={open ? "modal" : "modal disable"} id="kakaoMapModal">
      <div className="modalBox">
        <i className="modalClose" role="button" aria-label="닫기" onClick={onClose} />
        <div className="modalContent">
          <div>
            <span>주소검색</span>
            <span className="editMapGeo tip" id="kakaoMapGeo" data-tip="좌표값을 선택하면 변경됩니다.">
              {geo}
            </span>
          </div>
          <div className="editMapSearchArea">
            <input
              className="eInput"
              id="kakaoMapSearch"
              maxLength={64}
              placeholder="검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <div className="editMapArea" id="kakaoMapArea">
            <p>데모 환경에서는 지도를 불러오지 않습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

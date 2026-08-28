"use client";

import { useEffect, useState } from "react";
import { PageStyles } from "@/components/fit/shared/PageStyles";

interface RealtimePacket {
  readonly id: string;
  readonly type: "rtu" | "node";
  readonly label: string;
  readonly name: string;
  readonly gate: number;
  readonly index: number;
  readonly length: number;
  readonly seed: string;
}

const REALTIME_PACKETS: readonly RealtimePacket[] = [
  { id: "5884", type: "rtu", label: "5884", name: "다이캐스팅1 메인", gate: 4101, index: 12, length: 202, seed: "0103040000A16E438A1F5C" },
  { id: "5885", type: "rtu", label: "5885", name: "다이캐스팅2 메인", gate: 4101, index: 13, length: 202, seed: "02030400009F74438228A1" },
  { id: "5891", type: "rtu", label: "5891", name: "다이캐스팅7 메인", gate: 4102, index: 27, length: 202, seed: "0703040000A31F43B14591" },
  { id: "9759", type: "rtu", label: "9759", name: "다이캐스팅1 온도 #1", gate: 4103, index: 80, length: 42, seed: "500314019803E903EA03F2" },
  { id: "9723", type: "rtu", label: "9723", name: "컴프레샤1", gate: 4104, index: 41, length: 66, seed: "2903100000C24846B61C42" },
  { id: "9711", type: "rtu", label: "9711", name: "TR1", gate: 4105, index: 1, length: 98, seed: "01033A43612562440758F6" },
  { id: "9771", type: "rtu", label: "9771", name: "용탕로 A", gate: 4106, index: 61, length: 74, seed: "3D03200000017C01A30189" },
  { id: "4100-power", type: "node", label: "power", name: "다이캐스팅9 옆 4100", gate: 4100, index: 1, length: 57, seed: ">4100030100017C01A30189" },
  { id: "4107-relay", type: "node", label: "relay", name: "다이캐스팅9 위 4107", gate: 4107, index: 1, length: 63, seed: ">4107030100010001000000" },
  { id: "4108-com", type: "node", label: "com", name: "다이캐스팅9호별도", gate: 4108, index: 2, length: 71, seed: ">4108030200C24846B61C42" },
  { id: "4109-air", type: "node", label: "air", name: "8호기단독", gate: 4109, index: 3, length: 49, seed: ">410903030185019D01A8" },
  { id: "4110-power", type: "node", label: "power", name: "다이캐스팅2호", gate: 4110, index: 1, length: 57, seed: ">4110030100017C01A30189" },
] as const;

function buildPacket(packet: RealtimePacket, tick: number): string {
  const byteLength = Math.max(packet.length * 2, 32);
  const source = `000000000006${packet.seed}`;
  const bodyLength = byteLength - 8;
  const body = source.repeat(Math.ceil(bodyLength / source.length)).slice(0, bodyLength);
  const numericId = Number.parseInt(packet.id, 10) || packet.gate;
  const tail = ((numericId * 2654435761 + tick * 4099) >>> 0)
    .toString(16)
    .padStart(8, "0")
    .toUpperCase();
  return `${body}${tail}`;
}

function PacketGrid({
  headers,
  packets,
  tick,
}: {
  readonly headers: readonly string[];
  readonly packets: readonly RealtimePacket[];
  readonly tick: number;
}) {
  return (
    <div className="note" role="table" aria-label={`${headers[0]} 실시간 데이터`}>
      {headers.map((header) => (
        <span className="noteHeader" key={header} role="columnheader">{header}</span>
      ))}
      {packets.map((packet) => {
        const data = buildPacket(packet, tick);
        return [
          <span className="noteText" key={`${packet.id}-label`} role="cell">{packet.label}</span>,
          <span className="noteText name" key={`${packet.id}-name`} role="cell">{packet.name}</span>,
          <span className="noteText" key={`${packet.id}-gate`} role="cell">{packet.gate}</span>,
          <span className="noteText" key={`${packet.id}-index`} role="cell">{packet.index}</span>,
          <span className="noteText" key={`${packet.id}-length`} role="cell">{packet.length}</span>,
          <span className="noteText ellipsis" key={`${packet.id}-data`} role="cell" title={data}>{data}</span>,
        ];
      })}
    </div>
  );
}

export function RealtimeData() {
  const [gate, setGate] = useState("");
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (paused) return;
    const interval = window.setInterval(() => setTick((current) => current + 1), 3000);
    return () => window.clearInterval(interval);
  }, [paused]);

  const visiblePackets = REALTIME_PACKETS.filter(
    (packet) => gate === "" || String(packet.gate).includes(gate),
  );
  const rtuPackets = visiblePackets.filter((packet) => packet.type === "rtu");
  const nodePackets = visiblePackets.filter((packet) => packet.type === "node");

  return (
    <>
      <PageStyles files={["/fit/assets/css/net.css"]} />
      <main className="contents realtime-data" id="contentsArea">
        <h1 className="deskTitle">실시간 데이터</h1>
        <section className="sheetArea" aria-labelledby="realtime-table-title">
          <div className="deskTool realtime-tools">
            <label className="deskLabel" htmlFor="gate-filter">필터</label>
            <input
              aria-label="Gate 필터"
              className="input"
              id="gate-filter"
              inputMode="numeric"
              maxLength={8}
              onChange={(event) => setGate(event.target.value)}
              placeholder="gate"
              value={gate}
            />
            <button
              aria-pressed={paused}
              className="act space pause-button"
              onClick={() => setPaused((current) => !current)}
              type="button"
            >
              <i className={`bi ${paused ? "bi-play-circle" : "bi-stop-circle"}`} aria-hidden="true" />
              {paused ? "업데이트 재개" : "업데이트 멈춤"}
            </button>
            <span aria-live="polite" className="sr-only" role="status">
              {paused ? "실시간 업데이트가 정지되었습니다." : "3초마다 실시간 업데이트 중입니다."}
            </span>
          </div>

          <h2 className="sr-only" id="realtime-table-title">게이트 실시간 패킷 목록</h2>
          <div className="noteTwin">
            <PacketGrid
              headers={["LoadID", "Name", "Gate", "LoadNo", "Len", "Data"]}
              packets={rtuPackets}
              tick={tick}
            />
            <PacketGrid
              headers={["Type", "Name", "Gate", "Node", "Len", "Data"]}
              packets={nodePackets}
              tick={tick}
            />
          </div>
        </section>

        <style>{`
          .realtime-data .realtime-tools {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .realtime-data .realtime-tools .input {
            height: 40px;
            box-sizing: border-box;
            color: #fff;
            text-align: left;
          }
          .realtime-data .pause-button {
            color: #fff;
          }
          .realtime-data .note {
            min-width: 0;
          }
          .realtime-data .noteHeader {
            color: #f8f8f8;
          }
          .realtime-data .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
          }
          @media (max-width: 640px) {
            .realtime-data .realtime-tools {
              flex-wrap: wrap;
            }
            .realtime-data .noteTwin {
              overflow-x: auto;
            }
            .realtime-data .note {
              min-width: 680px;
            }
          }
        `}</style>
      </main>
    </>
  );
}

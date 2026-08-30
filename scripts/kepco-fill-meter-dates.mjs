#!/usr/bin/env node
import { readFileSync } from "node:fs";
import Database from "better-sqlite3";

const firms = JSON.parse(readFileSync("src/lib/fit-mocks/firm-rows.json", "utf8"));
const checkDays = new Map(firms.map((firm) => [firm.fid, Number(firm.checkDay || 0)]));
const db = new Database("data/solarsimz.db", { timeout: 15_000 });
db.pragma("busy_timeout = 15000");
const update = db.prepare("UPDATE kepco_billing SET mr_ymd = ? WHERE fid = ? AND bill_ym = ? AND mr_ymd = ''");
let changes = 0;
db.transaction(() => {
  for (const row of db.prepare("SELECT fid, bill_ym FROM kepco_billing WHERE mr_ymd = ''").all()) {
    const checkDay = checkDays.get(row.fid) ?? 0;
    if (!checkDay || !/^\d{6}$/.test(row.bill_ym)) continue;
    const year = Number(row.bill_ym.slice(0, 4));
    const month = Number(row.bill_ym.slice(4, 6));
    const lastDay = new Date(year, month, 0).getDate();
    const mrYmd = `${row.bill_ym}${String(Math.min(checkDay, lastDay)).padStart(2, "0")}`;
    changes += update.run(mrYmd, row.fid, row.bill_ym).changes;
  }
})();
const remaining = db.prepare("SELECT count(*) count FROM kepco_billing WHERE mr_ymd = ''").get().count;
console.log(JSON.stringify({ updatedMeterDates: changes, remainingWithoutConfiguredCheckDay: remaining }));
db.close();

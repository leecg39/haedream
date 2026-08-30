#!/usr/bin/env node
import Database from "better-sqlite3";

const db = new Database("data/solarsimz.db", { timeout: 15_000 });
db.pragma("busy_timeout = 15000");
const result = db.prepare(
  `DELETE FROM kepco_monthly AS m
   WHERE (SELECT count(*) FROM kepco_billing b WHERE b.fid = m.fid) >= 12
     AND NOT EXISTS (
       SELECT 1 FROM kepco_billing b WHERE b.fid = m.fid AND b.bill_ym = m.yyyymm
     )`,
).run();
const invalid = db.prepare(
  `SELECT count(*) count FROM (
     SELECT m.fid, count(*) rows
     FROM kepco_monthly m
     WHERE EXISTS (SELECT 1 FROM kepco_billing b WHERE b.fid = m.fid)
     GROUP BY m.fid HAVING rows <> 12
   )`,
).get().count;
console.log(JSON.stringify({ removedApproximateRows: result.changes, firmsWithNon12MonthlyRows: invalid }));
db.close();
process.exitCode = invalid === 0 ? 0 : 1;

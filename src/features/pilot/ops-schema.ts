import { z } from "zod";
import {
  PILOT_ALARM_SEVERITIES,
  PILOT_ALARM_TYPES,
  PILOT_CHECKLIST_KEYS,
  PILOT_ITEM_RESULTS,
} from "@/features/pilot/types";

export const inspectionItemInputSchema = z.strictObject({
  itemKey: z.enum(PILOT_CHECKLIST_KEYS),
  result: z.enum(PILOT_ITEM_RESULTS),
  note: z
    .string()
    .trim()
    .max(500, "메모는 500자 이하로 입력해 주세요.")
    .default(""),
});

export const inspectionCreateSchema = z.strictObject({
  gatewayId: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .default("gw-pilot-01"),
  notes: z
    .string()
    .trim()
    .max(1000, "비고는 1000자 이하로 입력해 주세요.")
    .default(""),
  items: z
    .array(inspectionItemInputSchema)
    .length(PILOT_CHECKLIST_KEYS.length, "검수 5항을 모두 입력해 주세요."),
});

export const dailyConfirmationUpsertSchema = z.strictObject({
  gatewayId: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .default("gw-pilot-01"),
  confirmDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "확인일은 YYYY-MM-DD 형식이어야 합니다.")
    .optional(),
  receptionOk: z.boolean(),
  alarmReviewed: z.boolean(),
  note: z
    .string()
    .trim()
    .max(500, "메모는 500자 이하로 입력해 주세요.")
    .default(""),
});

export const alarmSeedShapeSchema = z.strictObject({
  type: z.enum(PILOT_ALARM_TYPES),
  severity: z.enum(PILOT_ALARM_SEVERITIES),
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(500),
});

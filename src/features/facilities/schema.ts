import { z } from "zod";

const optionalUuid = z
  .union([z.string().uuid("올바른 게이트웨이를 선택해 주세요."), z.literal(""), z.null()])
  .transform((value) => value || null);

function numericInput(schema: z.ZodNumber) {
  return z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return Number(value);
    }
    return value;
  }, schema);
}

const facilityFields = z.object({
    code: z
      .string()
      .trim()
      .min(2, "설비 코드는 2자 이상 입력해 주세요.")
      .max(32, "설비 코드는 32자 이하로 입력해 주세요.")
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "설비 코드는 영문, 숫자, 하이픈, 밑줄만 사용할 수 있습니다.",
      )
      .transform((value) => value.toUpperCase()),
    name: z
      .string()
      .trim()
      .min(2, "설비 이름은 2자 이상 입력해 주세요.")
      .max(80, "설비 이름은 80자 이하로 입력해 주세요."),
    processName: z
      .string()
      .trim()
      .min(2, "공정 이름은 2자 이상 입력해 주세요.")
      .max(50, "공정 이름은 50자 이하로 입력해 주세요."),
    groupName: z
      .string()
      .trim()
      .max(50, "그룹 이름은 50자 이하로 입력해 주세요."),
    priority: numericInput(
      z
        .number()
        .int("우선순위는 정수여야 합니다.")
        .min(0, "우선순위는 0 이상이어야 합니다.")
        .max(254, "우선순위는 254 이하여야 합니다."),
    ),
    baseTemperature: numericInput(
      z
        .number()
        .min(0, "기본 설정 온도는 0 이상이어야 합니다.")
        .max(999, "기본 설정 온도는 999 이하여야 합니다."),
    ),
    peakControlPercent: numericInput(
      z
        .number()
        .min(0, "피크 제어 수치는 0 이상이어야 합니다.")
        .max(100, "피크 제어 수치는 100 이하여야 합니다."),
    ),
    gatewayId: optionalUuid,
    nodeNumber: z
      .union([
        numericInput(z.number().int().min(1).max(10)),
        z.literal(""),
        z.null(),
      ])
      .transform((value) => (value === "" ? null : value)),
    channelNumber: z
      .union([
        numericInput(z.number().int().min(1).max(32)),
        z.literal(""),
        z.null(),
      ])
      .transform((value) => (value === "" ? null : value)),
    controlMode: z.enum(["AUTO", "MANUAL"]),
    status: z.enum(["ACTIVE", "INACTIVE"]),
  });

function validateGatewayRelation(
  value: {
    gatewayId?: string | null;
    nodeNumber?: number | null;
    channelNumber?: number | null;
  },
  context: z.RefinementCtx,
) {
  const relation = [value.gatewayId, value.nodeNumber, value.channelNumber];
  const assigned = relation.filter(
    (item) => item !== null && item !== undefined,
  ).length;
  if (assigned !== 0 && assigned !== relation.length) {
    context.addIssue({
      code: "custom",
      path: ["gatewayId"],
      message: "게이트웨이, 노드 번호, 채널 번호는 함께 입력해 주세요.",
    });
  }
}

export const facilityCreateSchema = facilityFields
  .extend({
    groupName: facilityFields.shape.groupName.default(""),
    gatewayId: facilityFields.shape.gatewayId.default(null),
    nodeNumber: facilityFields.shape.nodeNumber.default(null),
    channelNumber: facilityFields.shape.channelNumber.default(null),
    controlMode: facilityFields.shape.controlMode.default("AUTO"),
    status: facilityFields.shape.status.default("ACTIVE"),
  })
  .superRefine((value, context) => {
    validateGatewayRelation(value, context);
  });

export const facilityUpdateSchema = facilityFields
  .partial()
  .extend({
    version: numericInput(
      z.number().int().positive("버전 정보가 올바르지 않습니다."),
    ),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "version"),
    "수정할 항목을 하나 이상 입력해 주세요.",
  );

export const facilityListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(100).default(""),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  controlMode: z.enum(["AUTO", "MANUAL"]).optional(),
  processName: z.string().trim().max(50).optional(),
  gatewayId: z.string().uuid().optional(),
  deleted: z.enum(["exclude", "only", "include"]).default("exclude"),
  sort: z
    .enum(["updatedAt", "createdAt", "name", "code", "priority", "processName"])
    .default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  from: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value).toISOString())
    .optional(),
  to: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value).toISOString())
    .optional(),
});

export type FacilityCreateInput = z.infer<typeof facilityCreateSchema>;
export type FacilityUpdateInput = z.infer<typeof facilityUpdateSchema>;
export type FacilityListQuery = z.infer<typeof facilityListQuerySchema>;

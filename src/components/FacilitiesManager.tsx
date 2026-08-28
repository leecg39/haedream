"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { seoulDateBoundary } from "@/features/facilities/date-range";
import { facilityCreateSchema } from "@/features/facilities/schema";
import type {
  ApiErrorBody,
  ApiSuccess,
  Facility,
  GatewayOption,
  PaginatedFacilities,
  SessionUser,
} from "@/features/facilities/types";

type DialogMode = "create" | "edit" | "detail" | null;
type ConfirmAction = "delete" | "restore" | "purge";

interface Filters {
  q: string;
  status: string;
  controlMode: string;
  processName: string;
  gatewayId: string;
  fromDate: string;
  toDate: string;
  deleted: "exclude" | "only" | "include";
  sort: string;
  order: "asc" | "desc";
  page: number;
  limit: number;
}

interface FormState {
  code: string;
  name: string;
  processName: string;
  groupName: string;
  priority: string;
  baseTemperature: string;
  peakControlPercent: string;
  gatewayId: string;
  nodeNumber: string;
  channelNumber: string;
  controlMode: "AUTO" | "MANUAL";
  status: "ACTIVE" | "INACTIVE";
  version?: number;
}

type ApiFailure = Error & {
  status?: number;
  code?: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  processName: "",
  groupName: "",
  priority: "0",
  baseTemperature: "25",
  peakControlPercent: "0",
  gatewayId: "",
  nodeNumber: "",
  channelNumber: "",
  controlMode: "AUTO",
  status: "ACTIVE",
};

const defaultFilters: Filters = {
  q: "",
  status: "",
  controlMode: "",
  processName: "",
  gatewayId: "",
  fromDate: "",
  toDate: "",
  deleted: "exclude",
  sort: "updatedAt",
  order: "desc",
  page: 1,
  limit: 10,
};

function dateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function roleLabel(role: SessionUser["role"]) {
  return { ADMIN: "관리자", OPERATOR: "운영자", VIEWER: "조회자" }[role];
}

function formFromFacility(facility: Facility): FormState {
  return {
    code: facility.code,
    name: facility.name,
    processName: facility.processName,
    groupName: facility.groupName,
    priority: String(facility.priority),
    baseTemperature: String(facility.baseTemperature),
    peakControlPercent: String(facility.peakControlPercent),
    gatewayId: facility.gatewayId ?? "",
    nodeNumber: facility.nodeNumber === null ? "" : String(facility.nodeNumber),
    channelNumber:
      facility.channelNumber === null ? "" : String(facility.channelNumber),
    controlMode: facility.controlMode,
    status: facility.status,
    version: facility.version,
  };
}

function facilityPayload(form: FormState) {
  return {
    code: form.code,
    name: form.name,
    processName: form.processName,
    groupName: form.groupName,
    priority: form.priority,
    baseTemperature: form.baseTemperature,
    peakControlPercent: form.peakControlPercent,
    gatewayId: form.gatewayId || null,
    nodeNumber: form.nodeNumber || null,
    channelNumber: form.channelNumber || null,
    controlMode: form.controlMode,
    status: form.status,
  };
}

function changedFormFields(current: FormState, initial: FormState) {
  const changed = new Set<keyof FormState>();
  for (const field of Object.keys(initial) as Array<keyof FormState>) {
    if (field !== "version" && current[field] !== initial[field]) {
      changed.add(field);
    }
  }
  return changed;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json()) as ApiSuccess<T> | ApiErrorBody;
  if (!response.ok || !body.ok) {
    const error = body as ApiErrorBody;
    throw Object.assign(new Error(error.error.message), {
      status: response.status,
      code: error.error.code,
      fieldErrors: error.error.fieldErrors,
      requestId: error.requestId,
    });
  }
  return body.data;
}

export function FacilitiesManager() {
  const router = useRouter();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [processes, setProcesses] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<PaginatedFacilities>({
    items: [],
    meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
  });
  const [filters, setFilters] = useState(defaultFilters);
  const [filterDraft, setFilterDraft] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [toast, setToast] = useState("");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selected, setSelected] = useState<Facility | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<Set<keyof FormState>>(
    () => new Set(),
  );
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{
    action: ConfirmAction;
    facility: Facility;
  } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const pageTitleRef = useRef<HTMLHeadingElement>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<FormState>(emptyForm);
  const initialFormRef = useRef<FormState>(emptyForm);
  const listRequestSequence = useRef(0);
  const detailRequestSequence = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canWrite = session?.role === "ADMIN" || session?.role === "OPERATOR";
  const canPurge = session?.role === "ADMIN";

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
      deleted: filters.deleted,
      sort: filters.sort,
      order: filters.order,
    });
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.controlMode) params.set("controlMode", filters.controlMode);
    if (filters.processName) params.set("processName", filters.processName);
    if (filters.gatewayId) params.set("gatewayId", filters.gatewayId);
    if (filters.fromDate) {
      params.set("from", seoulDateBoundary(filters.fromDate, "start"));
    }
    if (filters.toDate) {
      params.set("to", seoulDateBoundary(filters.toDate, "end"));
    }
    return `/api/facilities?${params.toString()}`;
  }, [filters]);

  const loadFacilities = useCallback(async () => {
    const sequence = ++listRequestSequence.current;
    setLoading(true);
    setError("");
    try {
      const result = await api<PaginatedFacilities>(listUrl);
      if (sequence === listRequestSequence.current) {
        if (
          result.meta.totalPages > 0 &&
          result.meta.page > result.meta.totalPages
        ) {
          setFilters((current) => ({
            ...current,
            page: result.meta.totalPages,
          }));
          return;
        }
        setFacilities(result);
      }
    } catch (caught) {
      if (sequence !== listRequestSequence.current) return;
      const apiFailure = caught as ApiFailure;
      if (apiFailure.status === 401) setAuthRequired(true);
      setFacilities({
        items: [],
        meta: {
          page: filters.page,
          limit: filters.limit,
          total: 0,
          totalPages: 0,
        },
      });
      setError(
        `${apiFailure.message}${
          apiFailure.requestId ? ` (요청 ${apiFailure.requestId})` : ""
        }`,
      );
    } finally {
      if (sequence === listRequestSequence.current) {
        setLoading(false);
      }
    }
  }, [filters.limit, filters.page, listUrl]);

  const refreshMetadata = useCallback(async () => {
    try {
      const meta = await api<{
        gateways: GatewayOption[];
        processes: string[];
      }>("/api/gateways");
      setGateways(meta.gateways);
      setProcesses(meta.processes);
    } catch (caught) {
      const failure = caught as ApiFailure;
      if (failure.status === 401) {
        setAuthRequired(true);
      } else {
        setError(
          `${failure.message}${
            failure.requestId ? ` (요청 ${failure.requestId})` : ""
          }`,
        );
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      api<SessionUser>("/api/auth/session"),
      api<{ gateways: GatewayOption[]; processes: string[] }>("/api/gateways"),
    ])
      .then(([user, meta]) => {
        if (!active) return;
        setSession(user);
        setGateways(meta.gateways);
        setProcesses(meta.processes);
      })
      .catch((caught: Error & { status?: number }) => {
        if (!active) return;
        if (caught.status === 401) setAuthRequired(true);
        setError(caught.message);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // The effect intentionally synchronizes the list with URL-like filter state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFacilities();
  }, [loadFacilities]);

  useEffect(() => {
    if (!dialogMode) return;
    dialogTitleRef.current?.focus();
  }, [dialogMode]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => {
      setToast("");
      toastTimer.current = null;
    }, 3200);
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    if (
      filterDraft.fromDate &&
      filterDraft.toDate &&
      filterDraft.fromDate > filterDraft.toDate
    ) {
      setError("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    setError("");
    setFilters({ ...filterDraft, page: 1 });
  }

  function rememberFocus() {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }

  function restoreFocus() {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    window.requestAnimationFrame(() => {
      if (target?.isConnected) {
        target.focus();
      } else {
        pageTitleRef.current?.focus();
      }
    });
  }

  function openCreate() {
    detailRequestSequence.current += 1;
    rememberFocus();
    formRef.current = emptyForm;
    initialFormRef.current = emptyForm;
    setSelected(null);
    setForm(emptyForm);
    setFieldErrors({});
    setDialogError("");
    setDialogLoading(false);
    setDirty(false);
    setDirtyFields(new Set());
    setDialogMode("create");
  }

  function openFacility(facility: Facility, mode: "detail" | "edit") {
    const sequence = ++detailRequestSequence.current;
    rememberFocus();
    setSelected(null);
    setForm(emptyForm);
    setFieldErrors({});
    setDialogError("");
    setDirty(false);
    setDirtyFields(new Set());
    setDialogMode(mode);
    setDialogLoading(true);

    const query = facility.deletedAt ? "?includeDeleted=true" : "";
    void api<Facility>(`/api/facilities/${facility.id}${query}`)
      .then((latest) => {
        if (sequence !== detailRequestSequence.current) return;
        const latestForm = formFromFacility(latest);
        formRef.current = latestForm;
        initialFormRef.current = latestForm;
        setSelected(latest);
        setForm(latestForm);
      })
      .catch((caught: ApiFailure) => {
        if (sequence !== detailRequestSequence.current) return;
        setDialogMode(null);
        if (caught.status === 401) {
          setAuthRequired(true);
        } else {
          setError(
            `${caught.message}${
              caught.requestId ? ` (요청 ${caught.requestId})` : ""
            }`,
          );
        }
        restoreFocus();
      })
      .finally(() => {
        if (sequence === detailRequestSequence.current) {
          setDialogLoading(false);
        }
      });
  }

  function closeDialog() {
    if (dirty && !window.confirm("저장하지 않은 변경사항을 버리시겠습니까?")) {
      return;
    }
    detailRequestSequence.current += 1;
    setDialogMode(null);
    setDialogError("");
    setDirty(false);
    setDirtyFields(new Set());
    restoreFocus();
  }

  function openConfirm(action: ConfirmAction, facility: Facility) {
    rememberFocus();
    setDialogError("");
    setConfirm({ action, facility });
    setConfirmText("");
  }

  function closeConfirm() {
    setConfirm(null);
    setConfirmText("");
    setDialogError("");
    restoreFocus();
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    const next = { ...formRef.current, [key]: value };
    formRef.current = next;
    setForm(next);
    setFieldErrors((current) => ({ ...current, [key]: [] }));
    setDialogError("");

    const changed = changedFormFields(next, initialFormRef.current);
    setDirty(changed.size > 0);
    setDirtyFields(changed);
  }

  async function saveFacility(event: FormEvent) {
    event.preventDefault();
    const payload = facilityPayload(form);
    const parsed = facilityCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors(errors);
      const field = Object.keys(errors)[0];
      window.requestAnimationFrame(() => {
        if (field) {
          document.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
        }
      });
      return;
    }
    const isEdit = dialogMode === "edit" && selected;
    if (isEdit && dirtyFields.size === 0) {
      setDialogError("수정할 항목을 변경해 주세요.");
      return;
    }
    const editPayload: Record<string, unknown> = { version: form.version };
    for (const key of dirtyFields) {
      if (key === "version") continue;
      editPayload[key] = parsed.data[key as keyof typeof parsed.data];
    }

    setSaving(true);
    setDialogError("");
    setFieldErrors({});
    try {
      await api<Facility>(
        isEdit ? `/api/facilities/${selected.id}` : "/api/facilities",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(isEdit ? editPayload : parsed.data),
        },
      );
      setDirty(false);
      setDirtyFields(new Set());
      setDialogMode(null);
      restoreFocus();
      showToast(isEdit ? "설비 정보를 수정했습니다." : "새 설비를 등록했습니다.");
      await Promise.all([loadFacilities(), refreshMetadata()]);
    } catch (caught) {
      const failure = caught as ApiFailure;
      if (failure.status === 401) {
        setDialogMode(null);
        setDirty(false);
        setDirtyFields(new Set());
        setAuthRequired(true);
        return;
      }
      if (failure.fieldErrors) {
        setFieldErrors(failure.fieldErrors);
        const field = Object.keys(failure.fieldErrors)[0];
        window.requestAnimationFrame(() => {
          if (field) {
            document.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
          }
        });
      }
      if (failure.code === "VERSION_CONFLICT" && selected) {
        try {
          const latest = await api<Facility>(
            `/api/facilities/${selected.id}`,
          );
          const latestForm = formFromFacility(latest);
          const rebased = { ...latestForm };
          const current = formRef.current;
          for (const field of dirtyFields) {
            if (field !== "version") {
              (rebased as Record<string, unknown>)[field] = current[field];
            }
          }
          const changed = changedFormFields(rebased, latestForm);
          initialFormRef.current = latestForm;
          formRef.current = rebased;
          setSelected(latest);
          setForm(rebased);
          setDirty(changed.size > 0);
          setDirtyFields(changed);
          setDialogError(
            "다른 사용자의 최신 버전을 불러왔습니다. 입력 내용을 확인한 뒤 다시 저장해 주세요.",
          );
          return;
        } catch {
          // Preserve the original conflict error if refresh fails.
        }
      }
      setDialogError(
        `${failure.message}${
          failure.requestId ? ` (요청 ${failure.requestId})` : ""
        }`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function runConfirmAction() {
    if (!confirm) return;
    const { action, facility } = confirm;
    if (action === "purge" && confirmText !== facility.code) return;
    setSaving(true);
    setDialogError("");
    try {
      if (action === "delete") {
        await api<Facility>(`/api/facilities/${facility.id}`, {
          method: "DELETE",
          body: JSON.stringify({ version: facility.version }),
        });
        showToast("설비를 삭제했습니다. 삭제 데이터에서 복구할 수 있습니다.");
      } else if (action === "restore") {
        await api<Facility>(`/api/facilities/${facility.id}/restore`, {
          method: "POST",
          body: JSON.stringify({ version: facility.version }),
        });
        showToast("설비를 복구했습니다.");
      } else {
        await api<{ id: string; purged: boolean }>(
          `/api/facilities/${facility.id}/purge`,
          {
            method: "DELETE",
            headers: { "x-confirm-purge": facility.code },
            body: JSON.stringify({
              code: facility.code,
              version: facility.version,
            }),
          },
        );
        showToast("설비를 영구 삭제했습니다.");
      }
      closeConfirm();
      await Promise.all([loadFacilities(), refreshMetadata()]);
    } catch (caught) {
      const failure = caught as ApiFailure;
      if (failure.status === 401) {
        setConfirm(null);
        setAuthRequired(true);
        return;
      }
      setDialogError(
        `${failure.message}${
          failure.requestId ? ` (요청 ${failure.requestId})` : ""
        }`,
      );
      if (failure.code === "VERSION_CONFLICT") {
        try {
          const latest = await api<Facility>(
            `/api/facilities/${facility.id}?includeDeleted=true`,
          );
          setConfirm({ action, facility: latest });
        } catch {
          // Keep the original conflict message if the refresh also fails.
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await api<{ loggedOut: boolean }>("/api/auth/logout", {
      method: "POST",
      body: "{}",
    });
    router.push("/");
    router.refresh();
  }

  if (authRequired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0e0d2c] p-6 text-white">
        <section className="w-full max-w-lg rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-2xl">
          <p className="mb-2 text-sm text-sky-300">접근 권한 없음</p>
          <h1 className="mb-4 text-2xl font-semibold">로그인이 필요합니다</h1>
          <p className="mb-6 text-white/65">
            설비 정보는 인증된 사용자만 확인할 수 있습니다.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-lg bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500 focus:outline-2 focus:outline-offset-2 focus:outline-blue-300"
          >
            로그인으로 이동
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0e0d2c_0%,#0e0d2c_55%,#00319b_100%)] px-4 py-5 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-white/15 bg-[#171942]/90 p-5 shadow-xl md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-3 text-sm text-sky-300">
              <Link href="/main.html" className="hover:text-white">
                대시보드
              </Link>
              <span aria-hidden="true">/</span>
              <span>설비관리</span>
            </div>
            <h1
              ref={pageTitleRef}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight outline-none"
            >
              주요설비 관리
            </h1>
            <p className="mt-1 text-sm text-white/55">
              게이트웨이 연결, 우선순위, 기준 온도와 피크 제어값을 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {session ? (
              <div className="rounded-lg border border-white/15 px-3 py-2 text-sm">
                <span className="text-white/55">사용자 </span>
                {session.name}
                <span className="ml-2 rounded bg-sky-500/20 px-2 py-0.5 text-xs text-sky-200">
                  {roleLabel(session.role)}
                </span>
              </div>
            ) : null}
            {canWrite ? (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500 focus:outline-2 focus:outline-offset-2 focus:outline-blue-300"
              >
                + 설비 등록
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-white/20 px-4 py-2.5 text-sm hover:bg-white/10 focus:outline-2 focus:outline-offset-2 focus:outline-white"
            >
              로그아웃
            </button>
          </div>
        </header>

        <form
          onSubmit={applyFilters}
          className="mb-5 grid gap-3 rounded-2xl border border-white/15 bg-[#171942]/85 p-4 md:grid-cols-2 xl:grid-cols-4"
          aria-label="설비 검색 및 필터"
        >
          <label className="text-xs text-white/60">
            검색
            <input
              value={filterDraft.q}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  q: event.target.value,
                }))
              }
              placeholder="설비명, 코드, 공정, 그룹"
              className="mt-1 h-10 w-full rounded-lg border border-white/20 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-sky-400"
            />
          </label>
          <FilterSelect
            label="상태"
            value={filterDraft.status}
            onChange={(value) =>
              setFilterDraft((current) => ({ ...current, status: value }))
            }
            options={[
              ["", "전체"],
              ["ACTIVE", "활성"],
              ["INACTIVE", "비활성"],
            ]}
          />
          <FilterSelect
            label="제어 모드"
            value={filterDraft.controlMode}
            onChange={(value) =>
              setFilterDraft((current) => ({ ...current, controlMode: value }))
            }
            options={[
              ["", "전체"],
              ["AUTO", "자동"],
              ["MANUAL", "수동"],
            ]}
          />
          <FilterSelect
            label="공정"
            value={filterDraft.processName}
            onChange={(value) =>
              setFilterDraft((current) => ({ ...current, processName: value }))
            }
            options={[["", "전체"], ...processes.map((item) => [item, item])]}
          />
          <FilterSelect
            label="게이트웨이 필터"
            value={filterDraft.gatewayId}
            onChange={(value) =>
              setFilterDraft((current) => ({ ...current, gatewayId: value }))
            }
            options={[
              ["", "전체"],
              ...gateways
                .filter((gateway) => gateway.status === "ACTIVE")
                .map((gateway) => [
                  gateway.id,
                  `${gateway.code} · ${gateway.name}`,
                ]),
            ]}
          />
          <label className="text-xs text-white/60">
            수정일 시작
            <input
              type="date"
              value={filterDraft.fromDate}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  fromDate: event.target.value,
                }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-white/20 bg-[#111332] px-3 text-sm text-white outline-none focus:border-sky-400"
            />
          </label>
          <label className="text-xs text-white/60">
            수정일 종료
            <input
              type="date"
              min={filterDraft.fromDate || undefined}
              value={filterDraft.toDate}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  toDate: event.target.value,
                }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-white/20 bg-[#111332] px-3 text-sm text-white outline-none focus:border-sky-400"
            />
          </label>
          <FilterSelect
            label="데이터"
            value={filterDraft.deleted}
            onChange={(value) =>
              setFilterDraft((current) => ({
                ...current,
                deleted: value as Filters["deleted"],
              }))
            }
            options={[
              ["exclude", "운영 데이터"],
              ["only", "삭제 데이터"],
              ["include", "전체 데이터"],
            ]}
            disabled={session?.role === "VIEWER"}
          />
          <FilterSelect
            label="정렬"
            value={`${filterDraft.sort}:${filterDraft.order}`}
            onChange={(value) => {
              const [sort, order] = value.split(":");
              setFilterDraft((current) => ({
                ...current,
                sort,
                order: order as "asc" | "desc",
              }));
            }}
            options={[
              ["updatedAt:desc", "최근 수정순"],
              ["createdAt:desc", "최근 등록순"],
              ["name:asc", "이름순"],
              ["code:asc", "코드순"],
              ["priority:asc", "우선순위순"],
            ]}
          />
          <button
            type="submit"
            className="h-10 self-end rounded-lg bg-sky-600 px-5 text-sm font-semibold hover:bg-sky-500 focus:outline-2 focus:outline-offset-2 focus:outline-sky-300"
          >
            조회
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterDraft(defaultFilters);
              setFilters(defaultFilters);
              setError("");
            }}
            className="h-10 self-end rounded-lg border border-white/20 px-5 text-sm font-semibold hover:bg-white/10 focus:outline-2 focus:outline-offset-2 focus:outline-white"
          >
            초기화
          </button>
        </form>

        {error ? (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-red-400/40 bg-red-500/15 p-4 text-sm text-red-100"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="font-semibold"
              aria-label="오류 메시지 닫기"
            >
              ×
            </button>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-white/15 bg-[#171942]/90 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <p className="text-sm text-white/60">
              총{" "}
              <strong className="font-semibold text-white">
                {facilities.meta.total.toLocaleString("ko-KR")}
              </strong>
              건
            </p>
            <select
              aria-label="페이지당 표시 건수"
              value={filters.limit}
              onChange={(event) => {
                const limit = Number(event.target.value);
                setFilters((current) => ({
                  ...current,
                  limit,
                  page: 1,
                }));
                setFilterDraft((current) => ({ ...current, limit, page: 1 }));
              }}
              className="rounded border border-white/20 bg-[#111332] px-2 py-1 text-sm"
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
            </select>
          </div>

          {loading ? (
            <div
              className="flex min-h-72 items-center justify-center text-white/60"
              role="status"
            >
              설비 정보를 불러오는 중입니다…
            </div>
          ) : facilities.items.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <p className="mb-2 text-lg font-medium">조회 결과가 없습니다</p>
              <p className="text-sm text-white/50">
                검색 조건을 변경하거나 새 설비를 등록해 주세요.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                  <thead className="bg-black/20 text-xs text-white/55">
                    <tr>
                      {[
                        "코드 / 설비명",
                        "공정 / 그룹",
                        "게이트웨이",
                        "제어 설정",
                        "상태",
                        "최근 수정",
                        "작업",
                      ].map((heading) => (
                        <th key={heading} scope="col" className="px-4 py-3 font-medium">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {facilities.items.map((facility) => (
                      <FacilityRow
                        key={facility.id}
                        facility={facility}
                        canWrite={Boolean(canWrite)}
                        canPurge={Boolean(canPurge)}
                        onOpen={openFacility}
                        onConfirm={(action) => openConfirm(action, facility)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 p-3 md:hidden">
                {facilities.items.map((facility) => (
                  <FacilityCard
                    key={facility.id}
                    facility={facility}
                    canWrite={Boolean(canWrite)}
                    canPurge={Boolean(canPurge)}
                    onOpen={openFacility}
                    onConfirm={(action) => openConfirm(action, facility)}
                  />
                ))}
              </div>
            </>
          )}

          <Pagination
            page={facilities.meta.page}
            totalPages={facilities.meta.totalPages}
            onPage={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </section>
      </div>

      <div className="sr-only" aria-live="polite">
        {toast}
      </div>
      {toast ? (
        <div className="fixed right-5 bottom-5 z-50 rounded-xl bg-blue-600 px-5 py-4 text-sm text-white shadow-2xl">
          {toast}
        </div>
      ) : null}

      {dialogMode ? (
        <FacilityDialog
          mode={dialogMode}
          selected={selected}
          form={form}
          gateways={gateways}
          fieldErrors={fieldErrors}
          error={dialogError}
          loading={dialogLoading}
          saving={saving}
          titleRef={dialogTitleRef}
          onChange={updateForm}
          onClose={closeDialog}
          onSubmit={saveFacility}
        />
      ) : null}

      {confirm ? (
        <ConfirmDialog
          action={confirm.action}
          facility={confirm.facility}
          text={confirmText}
          error={dialogError}
          saving={saving}
          onText={setConfirmText}
          onCancel={closeConfirm}
          onConfirm={() => void runConfirmAction()}
        />
      ) : null}
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
  disabled?: boolean;
}) {
  return (
    <label className="text-xs text-white/60">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="mt-1 h-10 w-full rounded-lg border border-white/20 bg-[#111332] px-3 text-sm text-white outline-none focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {options.map(([optionValue, text]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function FacilityRow({
  facility,
  canWrite,
  canPurge,
  onOpen,
  onConfirm,
}: {
  facility: Facility;
  canWrite: boolean;
  canPurge: boolean;
  onOpen: (facility: Facility, mode: "detail" | "edit") => void;
  onConfirm: (action: ConfirmAction) => void;
}) {
  return (
    <tr className={facility.deletedAt ? "bg-red-950/15 text-white/55" : "hover:bg-white/[0.03]"}>
      <td className="px-4 py-4">
        <div className="font-mono text-xs text-sky-300">{facility.code}</div>
        <div className="mt-1 font-medium text-white">{facility.name}</div>
      </td>
      <td className="px-4 py-4">
        <div>{facility.processName}</div>
        <div className="text-xs text-white/45">{facility.groupName || "-"}</div>
      </td>
      <td className="px-4 py-4">
        <div>{facility.gatewayName ?? "미연결"}</div>
        <div className="text-xs text-white/45">
          {facility.gatewayId
            ? `노드 ${facility.nodeNumber} · 채널 ${facility.channelNumber}`
            : "-"}
        </div>
      </td>
      <td className="px-4 py-4">
        <div>우선 {facility.priority} · {facility.baseTemperature}℃</div>
        <div className="text-xs text-white/45">
          피크 {facility.peakControlPercent}% ·{" "}
          {facility.controlMode === "AUTO" ? "자동" : "수동"}
        </div>
      </td>
      <td className="px-4 py-4">
        <StatusBadge facility={facility} />
      </td>
      <td className="px-4 py-4 text-xs">
        <div>{dateTime(facility.updatedAt)}</div>
        <div className="text-white/40">{facility.updatedByName}</div>
      </td>
      <td className="px-4 py-4">
        <ActionButtons
          facility={facility}
          canWrite={canWrite}
          canPurge={canPurge}
          onOpen={onOpen}
          onConfirm={onConfirm}
        />
      </td>
    </tr>
  );
}

function FacilityCard({
  facility,
  canWrite,
  canPurge,
  onOpen,
  onConfirm,
}: {
  facility: Facility;
  canWrite: boolean;
  canPurge: boolean;
  onOpen: (facility: Facility, mode: "detail" | "edit") => void;
  onConfirm: (action: ConfirmAction) => void;
}) {
  return (
    <article className="rounded-xl border border-white/15 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-sky-300">{facility.code}</p>
          <h2 className="mt-1 font-semibold">{facility.name}</h2>
        </div>
        <StatusBadge facility={facility} />
      </div>
      <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-white/45">공정</dt>
          <dd>{facility.processName}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/45">게이트웨이</dt>
          <dd>{facility.gatewayCode ?? "미연결"}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/45">제어</dt>
          <dd>{facility.controlMode === "AUTO" ? "자동" : "수동"}</dd>
        </div>
        <div>
          <dt className="text-xs text-white/45">우선순위</dt>
          <dd>{facility.priority}</dd>
        </div>
      </dl>
      <ActionButtons
        facility={facility}
        canWrite={canWrite}
        canPurge={canPurge}
        onOpen={onOpen}
        onConfirm={onConfirm}
      />
    </article>
  );
}

function StatusBadge({ facility }: { facility: Facility }) {
  if (facility.deletedAt) {
    return (
      <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-200">
        삭제됨
      </span>
    );
  }
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
        facility.status === "ACTIVE"
          ? "bg-emerald-500/15 text-emerald-200"
          : "bg-slate-500/20 text-slate-300"
      }`}
    >
      {facility.status === "ACTIVE" ? "활성" : "비활성"}
    </span>
  );
}

function ActionButtons({
  facility,
  canWrite,
  canPurge,
  onOpen,
  onConfirm,
}: {
  facility: Facility;
  canWrite: boolean;
  canPurge: boolean;
  onOpen: (facility: Facility, mode: "detail" | "edit") => void;
  onConfirm: (action: ConfirmAction) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <SmallButton onClick={() => onOpen(facility, "detail")}>상세</SmallButton>
      {!facility.deletedAt && canWrite ? (
        <>
          <SmallButton onClick={() => onOpen(facility, "edit")}>수정</SmallButton>
          <SmallButton danger onClick={() => onConfirm("delete")}>삭제</SmallButton>
        </>
      ) : null}
      {facility.deletedAt && canWrite ? (
        <SmallButton onClick={() => onConfirm("restore")}>복구</SmallButton>
      ) : null}
      {facility.deletedAt && canPurge ? (
        <SmallButton danger onClick={() => onConfirm("purge")}>영구 삭제</SmallButton>
      ) : null}
    </div>
  );
}

function SmallButton({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2.5 py-1.5 text-xs focus:outline-2 focus:outline-offset-2 ${
        danger
          ? "border-red-400/35 text-red-200 hover:bg-red-500/15 focus:outline-red-300"
          : "border-white/20 text-white/75 hover:bg-white/10 focus:outline-white"
      }`}
    >
      {children}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      className="flex items-center justify-center gap-3 border-t border-white/10 p-4"
      aria-label="페이지 이동"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="rounded border border-white/20 px-3 py-1.5 text-sm disabled:opacity-30"
      >
        이전
      </button>
      <span className="text-sm text-white/60">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="rounded border border-white/20 px-3 py-1.5 text-sm disabled:opacity-30"
      >
        다음
      </button>
    </nav>
  );
}

function FacilityDialog({
  mode,
  selected,
  form,
  gateways,
  fieldErrors,
  error,
  loading,
  saving,
  titleRef,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: Exclude<DialogMode, null>;
  selected: Facility | null;
  form: FormState;
  gateways: GatewayOption[];
  fieldErrors: Record<string, string[]>;
  error: string;
  loading: boolean;
  saving: boolean;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const readOnly = mode === "detail";
  const dialogRef = useRef<HTMLElement>(null);
  const title =
    mode === "create" ? "설비 등록" : mode === "edit" ? "설비 수정" : "설비 상세";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="facility-dialog-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/20 bg-[#171942] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#171942] p-5">
          <div>
            <h2
              ref={titleRef}
              id="facility-dialog-title"
              tabIndex={-1}
              className="text-xl font-semibold outline-none"
            >
              {title}
            </h2>
            {selected ? (
              <p className="mt-1 text-xs text-white/45">
                버전 {selected.version} · 최근 수정 {dateTime(selected.updatedAt)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="창 닫기"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-white/60 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center text-white/60" role="status">
            최신 설비 정보를 불러오는 중입니다…
          </div>
        ) : null}
        <form
          onSubmit={onSubmit}
          noValidate
          className={`${loading ? "hidden" : "grid"} gap-4 p-5 sm:grid-cols-2`}
        >
          {error ? (
            <div
              role="alert"
              className="col-span-full rounded-lg border border-red-400/40 bg-red-500/15 p-3 text-sm text-red-100"
            >
              {error}
            </div>
          ) : null}
          <FormField
            label="설비 코드"
            name="code"
            required
            value={form.code}
            error={fieldErrors.code?.[0]}
            readOnly={readOnly || mode === "edit"}
            onChange={(value) => onChange("code", value)}
            hint={mode === "edit" ? "설비 코드는 수정할 수 없습니다." : undefined}
          />
          <FormField
            label="설비 이름"
            name="name"
            required
            value={form.name}
            error={fieldErrors.name?.[0]}
            readOnly={readOnly}
            onChange={(value) => onChange("name", value)}
          />
          <FormField
            label="공정 이름"
            name="processName"
            required
            value={form.processName}
            error={fieldErrors.processName?.[0]}
            readOnly={readOnly}
            onChange={(value) => onChange("processName", value)}
          />
          <FormField
            label="그룹 이름"
            name="groupName"
            value={form.groupName}
            error={fieldErrors.groupName?.[0]}
            readOnly={readOnly}
            onChange={(value) => onChange("groupName", value)}
          />
          <FormField
            label="우선순위"
            name="priority"
            required
            type="number"
            min="0"
            max="254"
            value={form.priority}
            error={fieldErrors.priority?.[0]}
            readOnly={readOnly}
            onChange={(value) => onChange("priority", value)}
          />
          <FormField
            label="기본 설정 온도 (℃)"
            name="baseTemperature"
            required
            type="number"
            min="0"
            max="999"
            step="0.1"
            value={form.baseTemperature}
            error={fieldErrors.baseTemperature?.[0]}
            readOnly={readOnly}
            onChange={(value) => onChange("baseTemperature", value)}
          />
          <FormField
            label="피크 제어 수치 (%)"
            name="peakControlPercent"
            required
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.peakControlPercent}
            error={fieldErrors.peakControlPercent?.[0]}
            readOnly={readOnly}
            onChange={(value) => onChange("peakControlPercent", value)}
          />
          <label className="text-sm">
            <span className="text-white/70">게이트웨이</span>
            <select
              name="gatewayId"
              value={form.gatewayId}
              disabled={readOnly}
              onChange={(event) => {
                onChange("gatewayId", event.target.value);
                if (!event.target.value) {
                  onChange("nodeNumber", "");
                  onChange("channelNumber", "");
                }
              }}
              aria-describedby={
                fieldErrors.gatewayId ? "gatewayId-error" : undefined
              }
              className="mt-1 h-11 w-full rounded-lg border border-white/20 bg-[#10122f] px-3 outline-none focus:border-sky-400 disabled:opacity-70"
            >
              <option value="">미연결</option>
              {gateways
                .filter((gateway) => gateway.status === "ACTIVE")
                .map((gateway) => (
                  <option key={gateway.id} value={gateway.id}>
                    {gateway.code} · {gateway.name}
                  </option>
                ))}
            </select>
            {fieldErrors.gatewayId?.[0] ? (
              <span id="gatewayId-error" className="mt-1 block text-xs text-red-300">
                {fieldErrors.gatewayId[0]}
              </span>
            ) : null}
          </label>
          <FormField
            label="노드 번호"
            name="nodeNumber"
            type="number"
            min="1"
            max="10"
            value={form.nodeNumber}
            error={fieldErrors.nodeNumber?.[0]}
            readOnly={readOnly || !form.gatewayId}
            onChange={(value) => onChange("nodeNumber", value)}
          />
          <FormField
            label="채널 번호"
            name="channelNumber"
            type="number"
            min="1"
            max="32"
            value={form.channelNumber}
            error={fieldErrors.channelNumber?.[0]}
            readOnly={readOnly || !form.gatewayId}
            onChange={(value) => onChange("channelNumber", value)}
          />
          <FormSelect
            label="제어 모드"
            name="controlMode"
            value={form.controlMode}
            disabled={readOnly}
            onChange={(value) =>
              onChange("controlMode", value as FormState["controlMode"])
            }
            options={[
              ["AUTO", "자동"],
              ["MANUAL", "수동"],
            ]}
          />
          <FormSelect
            label="운영 상태"
            name="status"
            value={form.status}
            disabled={readOnly}
            onChange={(value) =>
              onChange("status", value as FormState["status"])
            }
            options={[
              ["ACTIVE", "활성"],
              ["INACTIVE", "비활성"],
            ]}
          />

          {selected && readOnly ? (
            <dl className="col-span-full mt-2 grid gap-3 rounded-xl bg-black/20 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-white/45">등록자 / 등록일</dt>
                <dd>{selected.createdByName} · {dateTime(selected.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/45">수정자 / 수정일</dt>
                <dd>{selected.updatedByName} · {dateTime(selected.updatedAt)}</dd>
              </div>
              {selected.deletedAt ? (
                <div>
                  <dt className="text-xs text-white/45">삭제자 / 삭제일</dt>
                  <dd>
                    {selected.deletedByName ?? selected.deletedBy ?? "-"} ·{" "}
                    {dateTime(selected.deletedAt)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div className="col-span-full mt-3 flex justify-end gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10"
            >
              {readOnly ? "닫기" : "취소"}
            </button>
            {!readOnly ? (
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "저장 중…" : "저장"}
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}

function FormField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  required,
  type = "text",
  readOnly,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  type?: string;
  readOnly?: boolean;
  min?: string;
  max?: string;
  step?: string;
}) {
  const description = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <label className="text-sm">
      <span className="text-white/70">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        required={required}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={description}
        className={`mt-1 h-11 w-full rounded-lg border bg-[#10122f] px-3 text-white outline-none focus:border-sky-400 read-only:cursor-not-allowed read-only:opacity-65 ${
          error ? "border-red-400" : "border-white/20"
        }`}
      />
      {error ? (
        <span id={`${name}-error`} className="mt-1 block text-xs text-red-300">
          {error}
        </span>
      ) : hint ? (
        <span id={`${name}-hint`} className="mt-1 block text-xs text-white/40">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
  disabled?: boolean;
}) {
  return (
    <label className="text-sm">
      <span className="text-white/70">{label}</span>
      <select
        name={name}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-lg border border-white/20 bg-[#10122f] px-3 outline-none focus:border-sky-400 disabled:opacity-65"
      >
        {options.map(([optionValue, text]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function ConfirmDialog({
  action,
  facility,
  text,
  error,
  saving,
  onText,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  facility: Facility;
  text: string;
  error: string;
  saving: boolean;
  onText: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const purge = action === "purge";
  const labels = {
    delete: {
      title: "설비를 삭제하시겠습니까?",
      body: "일반 목록에서 제외되지만 삭제 데이터 화면에서 복구할 수 있습니다.",
      button: "삭제",
    },
    restore: {
      title: "설비를 복구하시겠습니까?",
      body: "복구하면 일반 설비 목록에 다시 표시됩니다.",
      button: "복구",
    },
    purge: {
      title: "설비를 영구 삭제하시겠습니까?",
      body: "감사 이력을 제외한 설비 데이터가 제거되며 되돌릴 수 없습니다.",
      button: "영구 삭제",
    },
  }[action];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="w-full max-w-md rounded-2xl border border-white/20 bg-[#171942] p-6 shadow-2xl"
      >
        <p className="mb-1 font-mono text-xs text-sky-300">{facility.code}</p>
        <h2 id="confirm-title" className="text-xl font-semibold">
          {labels.title}
        </h2>
        <p id="confirm-description" className="mt-3 text-sm text-white/60">
          {labels.body}
        </p>
        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-400/40 bg-red-500/15 p-3 text-sm text-red-100"
          >
            {error}
          </div>
        ) : null}
        {purge ? (
          <label className="mt-5 block text-sm">
            확인을 위해 설비 코드 <strong>{facility.code}</strong>를 입력하세요.
            <input
              autoFocus
              value={text}
              onChange={(event) => onText(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-red-400/40 bg-black/20 px-3 outline-none focus:border-red-300"
            />
          </label>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          >
            취소
          </button>
          <button
            type="button"
            autoFocus={!purge}
            disabled={saving || (purge && text !== facility.code)}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40 ${
              action === "restore"
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {saving ? "처리 중…" : labels.button}
          </button>
        </div>
      </section>
    </div>
  );
}

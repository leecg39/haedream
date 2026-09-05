"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { MockCategory, MockPage, MockFetchSummary } from "@/lib/mock-db";
import type { PilotSnapshot } from "@/features/pilot/types";
import { PilotSnapshotCard } from "@/components/PilotSnapshot";

interface CategoryStats {
  category: MockCategory;
  pages: MockPage[];
  totalBytes: number;
  activePages: number;
}

interface Props {
  groups: CategoryStats[];
  summary: MockFetchSummary;
  fetchedAt: string;
  pilot?: PilotSnapshot | null;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/** 카테고리별 색상 팔레트 */
const CATEGORY_COLORS: Record<string, string> = {
  통합관제: "from-violet-700/30 to-violet-900/10 border-violet-500/30",
  업체관리: "from-sky-700/30 to-sky-900/10 border-sky-500/30",
  대시보드: "from-cyan-700/30 to-cyan-900/10 border-cyan-500/30",
  컨설팅: "from-teal-700/30 to-teal-900/10 border-teal-500/30",
  피크관리: "from-amber-700/30 to-amber-900/10 border-amber-500/30",
  전력사용량: "from-orange-700/30 to-orange-900/10 border-orange-500/30",
  절감효과: "from-green-700/30 to-green-900/10 border-green-500/30",
  계통감시: "from-blue-700/30 to-blue-900/10 border-blue-500/30",
  설비관리: "from-indigo-700/30 to-indigo-900/10 border-indigo-500/30",
  비교분석: "from-pink-700/30 to-pink-900/10 border-pink-500/30",
  보고서: "from-rose-700/30 to-rose-900/10 border-rose-500/30",
  인증: "from-slate-700/30 to-slate-900/10 border-slate-500/30",
  "include (내부 파일)": "from-zinc-700/30 to-zinc-900/10 border-zinc-500/30",
};

const CATEGORY_ICONS: Record<string, string> = {
  통합관제: "⚡",
  업체관리: "🏢",
  대시보드: "📊",
  컨설팅: "💼",
  피크관리: "📈",
  전력사용량: "🔌",
  절감효과: "🌿",
  계통감시: "🔭",
  설비관리: "⚙️",
  비교분석: "🔍",
  보고서: "📋",
  인증: "🔐",
  "include (내부 파일)": "📁",
};

/** 요약 스탯 카드 */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
      <p className="text-xs font-medium tracking-wide text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-white/35">{sub}</p>}
    </div>
  );
}

/** 개별 페이지 행 */
function PageRow({ page }: { page: MockPage }) {
  return (
    <li className="group flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5">
      <div className="flex items-center gap-2">
        <a
          href={`/${page.pageFile}`}
          className="flex-1 text-sm font-medium text-white/85 hover:text-[#8cd2ff] transition-colors"
          title={page.title}
        >
          {page.menuName}
        </a>
        {page.menuDisabled && (
          <span className="rounded bg-red-900/40 px-1.5 py-0.5 text-[10px] text-red-300/70">
            비활성
          </span>
        )}
        <span
          className={`text-[11px] tabular-nums ${
            page.httpStatus === 200 ? "text-emerald-400/60" : "text-red-400/70"
          }`}
        >
          {page.httpStatus}
        </span>
        <span className="text-[11px] text-white/30 tabular-nums">
          {formatBytes(page.contentLength)}
        </span>
      </div>
      {page.textPreview && (
        <p className="line-clamp-1 text-[11px] leading-relaxed text-white/30">{page.textPreview}</p>
      )}
    </li>
  );
}

/** 카테고리 카드 */
function CategoryCard({ stats, isExpanded, onToggle }: {
  stats: CategoryStats;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const gradient = CATEGORY_COLORS[stats.category.name] ?? "from-gray-700/30 to-gray-900/10 border-gray-500/30";
  const icon = CATEGORY_ICONS[stats.category.name] ?? "📄";

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${gradient} backdrop-blur-sm transition-all`}
    >
      {/* 카드 헤더 */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        aria-expanded={isExpanded}
      >
        <span className="text-2xl leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white/90">{stats.category.name}</h2>
            {stats.category.disabled && (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
                비활성 메뉴
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-white/40">
            {stats.pages.length}개 페이지 · {formatBytes(stats.totalBytes)} ·&nbsp;
            {stats.activePages}/{stats.pages.length} 활성
          </p>
        </div>
        <span className="text-white/40 text-sm transition-transform duration-200" style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
          ▼
        </span>
      </button>

      {/* 페이지 목록 */}
      {isExpanded && (
        <div className="border-t border-white/10 px-2 pb-3 pt-1">
          <ul className="space-y-0.5">
            {stats.pages.map((p) => (
              <PageRow key={p.id} page={p} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function HubDashboard({ groups, summary, fetchedAt, pilot }: Props) {
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // 전체 통계
  const totalBytes = groups.reduce((acc, g) => acc + g.totalBytes, 0);
  const totalActivePages = groups.reduce((acc, g) => acc + g.activePages, 0);
  const enabledCategories = groups.filter((g) => !g.category.disabled).length;

  // 검색 필터
  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;
    const q = query.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        pages: g.pages.filter(
          (p) =>
            p.menuName.toLowerCase().includes(q) ||
            p.title.toLowerCase().includes(q) ||
            p.pageFile.toLowerCase().includes(q) ||
            p.textPreview.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.pages.length > 0 || g.category.name.toLowerCase().includes(q));
  }, [groups, query]);

  // 검색 중이면 모두 자동 펼치기
  const effectiveExpanded = useMemo(() => {
    if (query.trim()) return new Set(filteredGroups.map((g) => g.category.id));
    return expandedIds;
  }, [query, filteredGroups, expandedIds]);

  function toggleCategory(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedIds(new Set(groups.map((g) => g.category.id)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0a0920_0%,#0e0d2c_45%,#0a1a4a_100%)] px-6 py-10 text-white">

      {/* ── 헤더 ── */}
      <header className="mx-auto mb-10 max-w-6xl">
        <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-[#7ec8ff]/70 uppercase">
          SolarSimz · MockDB
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          watt.rfenms.com 허브 대시보드
        </h1>
        <p className="mt-2 text-sm text-white/50">
          파이어크롤로 수집한 페이지를 MockDB에 적재하여 탐색합니다.&nbsp;
          수집일: {fetchedAt}
        </p>

        {/* 빠른 링크 */}
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/login.html"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#217eef] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85"
          >
            🔐 정적 로그인
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
          >
            ← React 로그인
          </Link>
          <a
            href="/main.html"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
          >
            📊 대시보드 위젯
          </a>
          <a
            href="/wattMain.html"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
          >
            ⚡ 전력 대시보드
          </a>
        </div>
      </header>

      {pilot?.gateway ? (
        <div className="mx-auto mb-10 max-w-6xl">
          <PilotSnapshotCard snapshot={pilot} />
        </div>
      ) : null}

      {/* ── 요약 통계 카드 ── */}
      <section className="mx-auto mb-10 max-w-6xl grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="전체 카테고리"
          value={summary.categories}
          sub={`활성 ${enabledCategories}개`}
        />
        <StatCard
          label="전체 페이지"
          value={summary.pagesTotal}
          sub={`수집 성공 ${summary.pagesOk}개`}
        />
        <StatCard
          label="활성 페이지"
          value={totalActivePages}
          sub={`전체 대비 ${Math.round((totalActivePages / summary.pagesTotal) * 100)}%`}
        />
        <StatCard
          label="총 콘텐츠 크기"
          value={formatBytes(totalBytes)}
          sub={`페이지당 평균 ${formatBytes(Math.round(totalBytes / summary.pagesTotal))}`}
        />
      </section>

      {/* ── 검색 & 뷰 컨트롤 ── */}
      <div className="mx-auto mb-6 max-w-6xl flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm select-none">
            🔍
          </span>
          <input
            type="search"
            placeholder="페이지명, 파일명, 설명으로 검색…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/30 outline-none backdrop-blur-sm focus:border-[#7ec8ff]/50 focus:ring-1 focus:ring-[#7ec8ff]/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10 transition-colors"
          >
            모두 펼치기
          </button>
          <button
            onClick={collapseAll}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/60 hover:bg-white/10 transition-colors"
          >
            모두 접기
          </button>
          <div className="flex rounded-lg border border-white/15 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 text-xs transition-colors ${
                viewMode === "grid" ? "bg-[#217eef] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
              title="그리드 뷰"
            >
              ▦
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-2 text-xs transition-colors ${
                viewMode === "list" ? "bg-[#217eef] text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
              title="리스트 뷰"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* 검색 결과 수 */}
      {query.trim() && (
        <div className="mx-auto mb-4 max-w-6xl">
          <p className="text-xs text-white/50">
            &quot;{query}&quot; 검색 결과: {filteredGroups.reduce((a, g) => a + g.pages.length, 0)}개 페이지,{" "}
            {filteredGroups.length}개 카테고리
          </p>
        </div>
      )}

      {/* ── 카테고리 카드 그리드 ── */}
      <div
        className={`mx-auto max-w-6xl gap-5 ${
          viewMode === "grid"
            ? "grid md:grid-cols-2 xl:grid-cols-3"
            : "flex flex-col"
        }`}
      >
        {filteredGroups.map((stats) => (
          <CategoryCard
            key={stats.category.id}
            stats={stats}
            isExpanded={effectiveExpanded.has(stats.category.id)}
            onToggle={() => toggleCategory(stats.category.id)}
          />
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="mx-auto max-w-6xl py-20 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-white/50 text-sm">검색 결과가 없습니다.</p>
          <button
            onClick={() => setQuery("")}
            className="mt-4 rounded-lg border border-white/20 px-4 py-2 text-sm text-white/60 hover:bg-white/5 transition-colors"
          >
            검색 초기화
          </button>
        </div>
      )}

      {/* ── 푸터 ── */}
      <footer className="mx-auto mt-16 max-w-6xl border-t border-white/10 pt-6 text-center">
        <p className="text-xs text-white/30">
          MockDB · data/pages.db (파이어크롤 수집) · {summary.categories}개 카테고리 ·{" "}
          {summary.pagesOk}/{summary.pagesTotal} 페이지 수집 완료 · {fetchedAt}
        </p>
        {summary.failures.length > 0 && (
          <p className="mt-1 text-xs text-red-400/60">
            수집 실패: {summary.failures.join(", ")}
          </p>
        )}
      </footer>
    </main>
  );
}

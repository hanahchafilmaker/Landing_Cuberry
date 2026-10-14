import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { apiOrigin, assetUrl, get, post, siteRoot } from "@/lib/api";
import { ArrowUpRight, ChevronDown, Download, ExternalLink, Film, Github, KeyRound, Loader2, Mail, Plus, Save, Search, Settings2, Trash2, Users, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const emptyPortfolio = { title: "", category: "CORPORATE VIDEO", year: "2026", description: "", videoUrl: "https://", thumbnailUrl: "", tags: "PLANNING, EDITING", sortOrder: 1, isFeatured: false, isPublished: true };
const emptyService = { slug: "", name: "", price: "", duration: "", description: "", accent: "lime", sortOrder: 1, isPublished: true };
const emptyFaq = { question: "", answer: "", sortOrder: 1, isPublished: true };
type PortfolioDraft = typeof emptyPortfolio & { id?: number };
type ServiceDraft = typeof emptyService & { id?: number };
type FaqDraft = typeof emptyFaq & { id?: number };
const emptyTeam = { name: "", role: "", bio: "", photoUrl: "", photoPosition: 0, sortOrder: 1, isPublished: true, removePhoto: false };
type TeamDraft = typeof emptyTeam & { id?: number };

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

/** 큰 사진은 업로드 전에 긴 변 기준으로 줄인다(클래식 어드민과 동일). */
async function imageToDataUrl(file: File, maxSide = 1400): Promise<string> {
  const original = await fileToDataUrl(file);
  const image = new Image();
  image.src = original;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("이미지 파일만 업로드할 수 있습니다."));
  });
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  if (scale >= 1) return original;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div className="space-y-2"><Label className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#a9a59b]">{label}</Label>{children}{hint && <p className="text-xs leading-5 text-[#8a867d]">{hint}</p>}</div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-5 border-b border-[#2a2a26] px-5 py-8 sm:px-8 sm:py-10 lg:flex-row lg:items-end lg:px-10">
      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4b400]">{eyebrow}</p>
        <h1 className="text-[clamp(32px,4.2vw,52px)] font-semibold leading-[1.08] tracking-[-0.055em] text-[#edeae2]">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a9a59b]">{description}</p>
      </div>
      {action && <div className="flex shrink-0 items-center">{action}</div>}
    </header>
  );
}

function SaveBar({ onCancel, saving, label = "변경 사항 저장" }: { onCancel: () => void; saving: boolean; label?: string }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#2a2a26] pt-5"><Button type="button" variant="ghost" onClick={onCancel} className="rounded-sm font-mono text-[10px] uppercase tracking-[0.1em] text-[#a9a59b] hover:bg-[#1c1c19] hover:text-[#edeae2]">취소</Button><Button type="submit" disabled={saving} className="rounded-sm bg-[#f4b400] font-mono text-[10px] uppercase tracking-[0.1em] text-[#140f00] hover:bg-[#ffce3a]">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? "저장 중…" : label}</Button></div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm text-[#c9c5bb]"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#f4b400]" />{label}</label>;
}

function PortfolioEditor({ draft, onCancel, onSaved }: { draft: PortfolioDraft; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(draft);
  const utils = trpc.useUtils();
  const mutation = trpc.admin.portfolio.upsert.useMutation({ onSuccess: async () => { toast.success("포트폴리오를 저장했습니다."); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.landing.content.invalidate()]); onSaved(); }, onError: (error) => toast.error(error.message) });
  const update = (key: keyof PortfolioDraft, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ ...form, sortOrder: Number(form.sortOrder), videoUrl: form.videoUrl, thumbnailUrl: form.thumbnailUrl || undefined }); };
  return <Card className="mb-6 border-[#f4b400]/60 bg-[#161614] shadow-[0_16px_45px_rgba(23,23,20,0.08)]"><CardHeader className="flex flex-row items-center justify-between border-b border-[#2a2a26]"><CardTitle className="text-lg">{form.id ? "작품 수정" : "새 작품 등록"}</CardTitle><Button type="button" size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form onSubmit={submit} className="grid gap-5 pt-2 md:grid-cols-2"><Field label="작품명"><Input required value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="프로젝트 이름" /></Field><Field label="카테고리"><Input required value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="BRAND FILM" /></Field><Field label="연도"><Input required value={form.year} onChange={(e) => update("year", e.target.value)} /></Field><Field label="표시 순서"><Input required type="number" min="0" value={form.sortOrder} onChange={(e) => update("sortOrder", Number(e.target.value))} /></Field><Field label="영상 주소" hint="Google Drive 미리보기 주소 또는 직접 재생 주소"><Input required type="url" value={form.videoUrl} onChange={(e) => update("videoUrl", e.target.value)} /></Field><Field label="썸네일 주소"><Input type="url" value={form.thumbnailUrl} onChange={(e) => update("thumbnailUrl", e.target.value)} placeholder="선택 사항 · 이미지 URL" /></Field><div className="md:col-span-2"><Field label="소개 문구"><Textarea required rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} /></Field></div><Field label="태그"><Input required value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="AI, EDITING, MOTION" /></Field><div className="flex items-end gap-5 pb-2"><Toggle checked={form.isFeatured} onChange={(value) => update("isFeatured", value)} label="대표 작품으로 표시" /><Toggle checked={form.isPublished} onChange={(value) => update("isPublished", value)} label="랜딩에 공개" /></div><div className="md:col-span-2"><SaveBar onCancel={onCancel} saving={mutation.isPending} /></div></form></CardContent></Card>;
}

function ServiceEditor({ draft, onCancel, onSaved }: { draft: ServiceDraft; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(draft);
  const utils = trpc.useUtils();
  const mutation = trpc.admin.services.upsert.useMutation({ onSuccess: async () => { toast.success("서비스를 저장했습니다."); await Promise.all([utils.admin.content.invalidate(), utils.landing.content.invalidate()]); onSaved(); }, onError: (error) => toast.error(error.message) });
  const update = (key: keyof ServiceDraft, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ ...form, sortOrder: Number(form.sortOrder) }); };
  return <Card className="mb-6 border-[#f4b400]/60 bg-[#161614] shadow-[0_16px_45px_rgba(23,23,20,0.08)]"><CardHeader className="flex flex-row items-center justify-between border-b border-[#2a2a26]"><CardTitle className="text-lg">{form.id ? "서비스 수정" : "새 서비스 등록"}</CardTitle><Button type="button" size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form onSubmit={submit} className="grid gap-5 pt-2 md:grid-cols-2"><Field label="URL 식별자"><Input required value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="standard" /></Field><Field label="서비스명"><Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="숏폼 AI 광고" /></Field><Field label="가격"><Input required value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="29만원~" /></Field><Field label="진행 범위"><Input required value={form.duration} onChange={(e) => update("duration", e.target.value)} placeholder="15초 · 최대 5컷" /></Field><Field label="랜딩 컬러 키"><Input required value={form.accent} onChange={(e) => update("accent", e.target.value)} placeholder="lime" /></Field><Field label="표시 순서"><Input required type="number" min="0" value={form.sortOrder} onChange={(e) => update("sortOrder", Number(e.target.value))} /></Field><div className="md:col-span-2"><Field label="소개 문구"><Textarea required rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} /></Field></div><div className="md:col-span-2"><Toggle checked={form.isPublished} onChange={(value) => update("isPublished", value)} label="랜딩에 공개" /></div><div className="md:col-span-2"><SaveBar onCancel={onCancel} saving={mutation.isPending} /></div></form></CardContent></Card>;
}

function FaqEditor({ draft, onCancel, onSaved }: { draft: FaqDraft; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(draft);
  const utils = trpc.useUtils();
  const mutation = trpc.admin.faqs.upsert.useMutation({ onSuccess: async () => { toast.success("질문을 저장했습니다."); await Promise.all([utils.admin.content.invalidate(), utils.landing.content.invalidate()]); onSaved(); }, onError: (error) => toast.error(error.message) });
  const update = (key: keyof FaqDraft, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ ...form, sortOrder: Number(form.sortOrder) }); };
  return <Card className="mb-6 border-[#f4b400]/60 bg-[#161614] shadow-[0_16px_45px_rgba(23,23,20,0.08)]"><CardHeader className="flex flex-row items-center justify-between border-b border-[#2a2a26]"><CardTitle className="text-lg">{form.id ? "질문 수정" : "질문 등록"}</CardTitle><Button type="button" size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form onSubmit={submit} className="grid gap-5 pt-2"><Field label="질문"><Input required value={form.question} onChange={(e) => update("question", e.target.value)} /></Field><Field label="답변"><Textarea required rows={5} value={form.answer} onChange={(e) => update("answer", e.target.value)} /></Field><div className="flex items-center gap-5"><Field label="표시 순서"><Input required type="number" min="0" value={form.sortOrder} onChange={(e) => update("sortOrder", Number(e.target.value))} /></Field><div className="pt-6"><Toggle checked={form.isPublished} onChange={(value) => update("isPublished", value)} label="랜딩에 공개" /></div></div><SaveBar onCancel={onCancel} saving={mutation.isPending} /></form></CardContent></Card>;
}

// 마지막 백업 시각을 "6시간 전 · a1b2c3d" 처럼 보여준다. 백업 기록이 없으면 줄 자체를 그리지 않는다.
function backupLine(summary: { lastBackupAt?: string | null; lastBackupHash?: string | null }) {
  if (!summary.lastBackupAt) return null;
  const at = new Date(summary.lastBackupAt);
  if (Number.isNaN(at.getTime())) return null;
  const minutes = Math.max(0, Math.round((Date.now() - at.getTime()) / 60000));
  const ago = minutes < 1 ? "방금" : minutes < 60 ? `${minutes}분 전` : minutes < 60 * 24 ? `${Math.round(minutes / 60)}시간 전` : `${Math.round(minutes / (60 * 24))}일 전`;
  const hash = summary.lastBackupHash ? ` · ${summary.lastBackupHash.slice(0, 7)}` : "";
  return <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8a867d]">마지막 백업 · {ago}{hash}</p>;
}

function Overview({ summary, content, go }: { summary: { portfolio: number; published: number; inquiries: number; newInquiries: number; lastNotification?: { inquiryCode: string; channel: string; status: string } | null; lastBackupAt?: string | null; lastBackupHash?: string | null }; content: any; go: (path: string) => void }) {
  const cards = [
    { label: "포트폴리오", value: summary.portfolio, note: `${summary.published}개 공개`, icon: Film, path: "/admin/portfolio", color: "bg-[#f4b400]" },
    { label: "새 문의", value: summary.newInquiries, note: `전체 ${summary.inquiries}건`, icon: Mail, path: "/admin/inquiries", color: summary.newInquiries > 0 ? "bg-[#f4b400]" : "bg-[#24231f]" },
    { label: "서비스 · 가격", value: content?.services?.length ?? 0, note: "랜딩의 서비스 섹션", icon: Settings2, path: "/admin/services", color: "bg-[#24231f]" },
  ];
  const recentPortfolio = (content?.portfolio ?? []).slice(0, 4);
  const recentInquiries = (content?.inquiries ?? []).slice(0, 4);

  return (
    <div>
      <PageHeader
        eyebrow="CUBE RRY / CONTENT STUDIO"
        title="콘텐츠 스튜디오"
        description="포트폴리오, 팀 소개, 서비스와 문의를 한곳에서 관리합니다. 저장하면 랜딩 페이지에 반영됩니다."
        action={(
          <a href={siteRoot} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 border border-[#3a3934] px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#f4b400] transition hover:border-[#f4b400] hover:bg-[#f4b400] hover:text-[#140f00]">
            랜딩 미리보기 <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      />
      <div className="mx-auto max-w-[1440px] space-y-8 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#2a2a26] py-3">
          <p className="flex items-center gap-2 text-sm text-[#a9a59b]"><span className="h-1.5 w-1.5 rounded-full bg-[#f4b400]" />콘텐츠 저장은 사이트에 반영됩니다</p>
          <button type="button" onClick={() => go("/admin/portfolio")} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#f4b400] transition hover:text-[#ffce3a]">
            작품 빠르게 추가 <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((card, index) => (
            <button key={card.path} type="button" onClick={() => go(card.path)} className="group flex min-h-36 items-start justify-between border border-[#2a2a26] bg-[#161614] p-5 text-left transition hover:border-[#f4b400] sm:min-h-40 sm:p-6">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8a867d]">{String(index + 1).padStart(2, "0")} / {card.label}</p>
                <p className="mt-5 text-4xl font-semibold leading-none tracking-[-0.05em] text-[#edeae2]">{card.value}</p>
                <p className="mt-3 text-xs text-[#8a867d]">{card.note}</p>
              </div>
              <span className={`flex h-9 w-9 items-center justify-center border border-[#2a2a26] ${card.color}`}>
                <card.icon className={`h-4 w-4 ${card.color === "bg-[#f4b400]" ? "text-[#140f00]" : "text-[#a9a59b]"}`} />
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          <section className="min-w-0 border-t border-[#2a2a26]">
            <div className="flex items-center justify-between gap-3 border-b border-[#2a2a26] py-4">
              <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8a867d]">01 / WORKS</p><h2 className="mt-1 text-lg font-medium text-[#edeae2]">최근 포트폴리오</h2></div>
              <button type="button" onClick={() => go("/admin/portfolio")} className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#f4b400] hover:text-[#ffce3a]">전체 보기 →</button>
            </div>
            <div>
              {recentPortfolio.length === 0 ? (
                <p className="py-8 text-sm text-[#8a867d]">등록된 작품이 없습니다. 첫 포트폴리오를 추가해 보세요.</p>
              ) : recentPortfolio.map((item: any) => (
                <button key={item.id} type="button" onClick={() => go("/admin/portfolio")} className="flex w-full items-center justify-between gap-4 border-b border-[#2a2a26] py-4 text-left transition hover:bg-[#161614]">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-[#edeae2]">{item.title}</span><span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a867d]">{item.category} · {item.year}</span></span>
                  <Badge variant="outline" className={item.isPublished ? "shrink-0 border-[#f4b400]/50 text-[#f4b400]" : "shrink-0 border-[#3a3934] text-[#8a867d]"}>{item.isPublished ? "공개" : "임시"}</Badge>
                </button>
              ))}
            </div>
          </section>

          <section className="min-w-0 border-t border-[#2a2a26]">
            <div className="flex items-center justify-between gap-3 border-b border-[#2a2a26] py-4">
              <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#8a867d]">02 / INBOX</p><h2 className="mt-1 text-lg font-medium text-[#edeae2]">최근 문의</h2></div>
              <button type="button" onClick={() => go("/admin/inquiries")} className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#f4b400] hover:text-[#ffce3a]">전체 보기 →</button>
            </div>
            <div>
              {recentInquiries.length === 0 ? (
                <p className="py-8 text-sm text-[#8a867d]">아직 접수된 문의가 없습니다.</p>
              ) : recentInquiries.map((item: any) => (
                <button key={item.id} type="button" onClick={() => go("/admin/inquiries")} className="flex w-full items-center justify-between gap-4 border-b border-[#2a2a26] py-4 text-left transition hover:bg-[#161614]">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-[#edeae2]">{item.name}{item.company ? ` · ${item.company}` : ""}</span><span className="mt-1 block truncate text-xs text-[#8a867d]">{item.projectType || item.email}</span></span>
                  <span className="flex shrink-0 flex-col items-end gap-1"><Badge variant="outline" className={item.status === "new" ? "border-[#f4b400]/50 text-[#f4b400]" : "border-[#3a3934] text-[#8a867d]"}>{item.status === "new" ? "새 문의" : item.status}</Badge><span className="font-mono text-[9px] text-[#5a574f]">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</span></span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t border-[#2a2a26] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>{summary.lastNotification && <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a867d]">마지막 알림 · {summary.lastNotification.inquiryCode} · {summary.lastNotification.channel} · {summary.lastNotification.status}</p>}{backupLine(summary)}</div>
          <button type="button" onClick={() => go("/admin/settings")} className="self-start font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a867d] hover:text-[#f4b400]">백업 · 비밀번호 설정 →</button>
        </div>
      </div>
    </div>
  );
}
function PortfolioPage({ content }: { content: any }) {
  const [draft, setDraft] = useState<PortfolioDraft | null>(null);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("all");
  const utils = trpc.useUtils();
  const remove = trpc.admin.portfolio.delete.useMutation({ onSuccess: async () => { toast.success("포트폴리오를 삭제했습니다."); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.landing.content.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const rows = content?.portfolio ?? [];
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredRows = rows.filter((item: any) => {
    const matchesSearch = !normalizedSearch || [item.title, item.category, item.year, item.description, item.tags].some((value) => String(value ?? "").toLocaleLowerCase().includes(normalizedSearch));
    const matchesVisibility = visibility === "all" || (visibility === "published" ? Boolean(item.isPublished) : !item.isPublished);
    return matchesSearch && matchesVisibility;
  });

  return (
    <div>
      <PageHeader
        eyebrow="CONTENT / PORTFOLIO"
        title="포트폴리오"
        description="작품 정보를 정리하고 공개 여부를 관리합니다. 공개 상태로 저장하면 랜딩 화면에 반영됩니다."
        action={<Button onClick={() => setDraft({ ...emptyPortfolio, sortOrder: rows.length + 1 })} className="h-10 rounded-sm bg-[#f4b400] px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#140f00] hover:bg-[#ffce3a]"><Plus className="mr-2 h-4 w-4" />작품 등록</Button>}
      />
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        {draft && <PortfolioEditor draft={draft} onCancel={() => setDraft(null)} onSaved={() => setDraft(null)} />}
        <div className="mb-4 flex flex-col gap-3 border-y border-[#2a2a26] py-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a867d]" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="제목, 카테고리, 태그로 검색" aria-label="포트폴리오 검색" className="h-10 rounded-sm border-[#3a3934] bg-[#161614] pl-10 text-sm placeholder:text-[#5a574f] focus-visible:border-[#f4b400] focus-visible:ring-[#f4b400]/30" />
          </div>
          <label className="flex shrink-0 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8a867d]">
            노출 상태
            <select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="h-10 rounded-sm border border-[#3a3934] bg-[#161614] px-3 text-xs text-[#edeae2] outline-none focus:border-[#f4b400]">
              <option value="all">전체</option><option value="published">공개</option><option value="draft">임시 저장</option>
            </select>
          </label>
          <span className="shrink-0 font-mono text-[10px] text-[#8a867d]">{filteredRows.length} / {rows.length}개</span>
        </div>
        <div className="overflow-hidden border-y border-[#2a2a26] bg-[#161614]">
          <div className="hidden grid-cols-[minmax(0,1fr)_150px_64px_92px_112px] gap-4 border-b border-[#2a2a26] px-5 py-3 font-mono text-[9px] uppercase tracking-[0.15em] text-[#8a867d] md:grid"><span>작품</span><span>카테고리</span><span>연도</span><span>상태</span><span className="text-right">관리</span></div>
          {filteredRows.length === 0 ? (
            <div className="border-b border-[#2a2a26] px-5 py-14 text-center">
              <p className="text-sm text-[#a9a59b]">{rows.length ? "검색 조건에 맞는 작품이 없습니다." : "아직 등록된 작품이 없습니다."}</p>
              {!rows.length && <Button type="button" onClick={() => setDraft({ ...emptyPortfolio, sortOrder: 1 })} className="mt-5 rounded-sm bg-[#f4b400] text-[#140f00] hover:bg-[#ffce3a]">첫 작품 등록</Button>}
            </div>
          ) : filteredRows.map((item: any) => (
            <div key={item.id} className="grid gap-3 border-b border-[#2a2a26] px-4 py-4 transition last:border-0 hover:bg-[#1c1c19] sm:px-5 md:grid-cols-[minmax(0,1fr)_150px_64px_92px_112px] md:items-center md:gap-4">
              <div className="min-w-0"><p className="truncate text-sm font-medium text-[#edeae2]">{item.title}</p><p className="mt-1 line-clamp-1 text-xs text-[#8a867d]">{item.description || "설명이 없습니다."}</p><p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#8a867d] md:hidden">{item.category} · {item.year}</p></div>
              <span className="hidden truncate font-mono text-[9px] uppercase tracking-[0.12em] text-[#a9a59b] md:block">{item.category}</span>
              <span className="hidden font-mono text-xs text-[#a9a59b] md:block">{item.year}</span>
              <Badge variant="outline" className={`w-fit ${item.isPublished ? "border-[#f4b400]/50 text-[#f4b400]" : "border-[#3a3934] text-[#8a867d]"}`}>{item.isPublished ? "공개 중" : "임시 저장"}</Badge>
              <div className="flex items-center justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => setDraft({ ...item, isFeatured: Boolean(item.isFeatured), isPublished: Boolean(item.isPublished), thumbnailUrl: item.thumbnailUrl ?? "" })} className="rounded-sm text-xs text-[#c9c5bb] hover:bg-[#24231f] hover:text-[#f4b400]">수정</Button>
                <Button size="icon" variant="ghost" aria-label={`${item.title} 삭제`} title="삭제" onClick={() => { if (window.confirm(`'${item.title}' 작품을 삭제할까요?`)) remove.mutate({ id: item.id }); }} disabled={remove.isPending} className="rounded-sm text-[#8a867d] hover:bg-[#241718] hover:text-[#e5484d]"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function ServicesPage({ content }: { content: any }) {
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const utils = trpc.useUtils();
  const remove = trpc.admin.services.delete.useMutation({ onSuccess: async () => { toast.success("서비스를 삭제했습니다."); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.landing.content.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const services = content?.services ?? [];
  return (
    <div>
      <PageHeader
        eyebrow="CONTENT / SERVICES"
        title="서비스 · 가격"
        description="랜딩 화면의 상담 상품 카드와 가격을 관리합니다. 공개로 저장한 항목만 랜딩에 나타납니다."
        action={<Button onClick={() => setDraft({ ...emptyService, sortOrder: services.length + 1 })} className="h-10 rounded-sm bg-[#f4b400] px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#140f00] hover:bg-[#ffce3a]"><Plus className="mr-2 h-4 w-4" />서비스 등록</Button>}
      />
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        {draft && <ServiceEditor draft={draft} onCancel={() => setDraft(null)} onSaved={() => setDraft(null)} />}
        {services.length === 0 && !draft && <div className="border border-dashed border-[#3a3934] px-6 py-14 text-center text-sm text-[#8a867d]">등록된 서비스가 없습니다. 첫 상담 상품을 등록해 보세요.</div>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {services.map((item: any) => (
            <Card key={item.id} className="flex flex-col rounded-sm border-[#2a2a26] bg-[#161614] shadow-none">
              <CardHeader className="flex flex-row items-start justify-between border-b border-[#2a2a26] pb-4">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-[#f4b400]">{item.slug}{item.duration ? ` / ${item.duration}` : ""}</p>
                  <CardTitle className="mt-2 text-xl tracking-[-0.03em] text-[#edeae2]">{item.name}</CardTitle>
                </div>
                <Badge variant="outline" className={item.isPublished ? "shrink-0 border-[#f4b400]/50 text-[#f4b400]" : "shrink-0 border-[#3a3934] text-[#8a867d]"}>{item.isPublished ? "공개 중" : "임시 저장"}</Badge>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col pt-4">
                <p className="text-2xl font-semibold tracking-[-0.04em] text-[#edeae2]">{item.price}</p>
                <p className="mt-3 flex-1 text-sm leading-6 text-[#a9a59b]">{item.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-[#2a2a26] pt-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a867d]">순서 {item.sortOrder}</span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setDraft({ ...item, isPublished: Boolean(item.isPublished) })} className="rounded-sm text-xs text-[#c9c5bb] hover:bg-[#24231f] hover:text-[#f4b400]">수정</Button>
                    <Button size="icon" variant="ghost" aria-label={`${item.name} 서비스 삭제`} title="삭제" onClick={() => { if (window.confirm(`'${item.name}' 서비스를 삭제할까요?`)) remove.mutate({ id: item.id }); }} disabled={remove.isPending} className="rounded-sm text-[#8a867d] hover:bg-[#241718] hover:text-[#e5484d]"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
function FaqPage({ content }: { content: any }) {
  const [draft, setDraft] = useState<FaqDraft | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const utils = trpc.useUtils();
  const remove = trpc.admin.faqs.delete.useMutation({ onSuccess: async () => { toast.success("질문을 삭제했습니다."); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.landing.content.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const faqs = content?.faqs ?? [];
  return (
    <div>
      <PageHeader
        eyebrow="CONTENT / FAQ"
        title="자주 묻는 질문"
        description="질문과 답변을 관리합니다. 저장하면 랜딩의 FAQ 섹션에 바로 반영됩니다."
        action={<Button onClick={() => setDraft({ ...emptyFaq, sortOrder: faqs.length + 1 })} className="h-10 rounded-sm bg-[#f4b400] px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#140f00] hover:bg-[#ffce3a]"><Plus className="mr-2 h-4 w-4" />질문 등록</Button>}
      />
      <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8 sm:py-8">
        {draft && <FaqEditor draft={draft} onCancel={() => setDraft(null)} onSaved={() => setDraft(null)} />}
        {faqs.length === 0 && !draft && <div className="border border-dashed border-[#3a3934] px-6 py-14 text-center text-sm text-[#8a867d]">등록된 질문이 없습니다. 자주 받는 질문을 먼저 정리해 보세요.</div>}
        <div className="border-t border-[#2a2a26]">
          {faqs.map((item: any, index: number) => {
            const isOpen = openId === item.id;
            return (
              <div key={item.id} className="border-b border-[#2a2a26]">
                <div className="flex items-start gap-3 py-4">
                  <span className="mt-0.5 shrink-0 font-mono text-[10px] text-[#f4b400]">{String(index + 1).padStart(2, "0")}</span>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : item.id)} className="flex min-w-0 flex-1 items-start justify-between gap-4 text-left">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[#edeae2]">{item.question}</span>
                      {!isOpen && <span className="mt-1 line-clamp-1 block text-xs text-[#8a867d]">{item.answer}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {!item.isPublished && <Badge variant="outline" className="border-[#3a3934] font-mono text-[9px] uppercase text-[#8a867d]">임시 저장</Badge>}
                      <ChevronDown className={`h-4 w-4 shrink-0 text-[#8a867d] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                    </span>
                  </button>
                </div>
                {isOpen && (
                  <div className="pb-5 pl-7">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-[#c9c5bb]">{item.answer}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setDraft({ ...item, isPublished: Boolean(item.isPublished) })} className="rounded-sm text-xs text-[#c9c5bb] hover:bg-[#24231f] hover:text-[#f4b400]">수정</Button>
                      <Button size="icon" variant="ghost" aria-label="질문 삭제" title="삭제" onClick={() => { if (window.confirm("이 질문을 삭제할까요?")) remove.mutate({ id: item.id }); }} className="rounded-sm text-[#8a867d] hover:bg-[#241718] hover:text-[#e5484d]"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function inquiryStatusLabel(status: string) {
  return ({ new: "새 문의", review: "검토 중", contacted: "연락 완료", closed: "종료" } as Record<string, string>)[status] ?? status;
}

function InquiriesPage({ content }: { content: any }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const utils = trpc.useUtils();
  const update = trpc.admin.inquiries.updateStatus.useMutation({ onSuccess: async () => { toast.success("문의 상태를 변경했습니다."); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const notificationsQuery = trpc.admin.notifications.list.useQuery(undefined, { retry: false });
  const retry = trpc.admin.notifications.retry.useMutation({ onSuccess: async (data: any) => { if (data?.ok) { toast.success("알림을 다시 보냈습니다."); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.admin.notifications.invalidate()]); } else { toast.error(data?.notification?.lastError || "재발송에 실패했습니다."); } }, onError: (error) => toast.error(error.message) });
  const rows = content?.inquiries ?? [];
  const needle = search.trim().toLocaleLowerCase();
  const filteredRows = rows.filter((item: any) => {
    const matchesSearch = !needle || [item.name, item.company, item.email, item.phone, item.projectType, item.budget, item.message].some((value) => String(value ?? "").toLocaleLowerCase().includes(needle));
    return matchesSearch && (statusFilter === "all" || item.status === statusFilter);
  });
  // 문의별 알림 행 — 배지 상태와 "다시 보내기" 대상으로 쓴다.
  const notifByInquiry = new Map<number, any[]>();
  for (const row of notificationsQuery.data?.notifications ?? []) notifByInquiry.set(row.inquiryId, [...(notifByInquiry.get(row.inquiryId) ?? []), row]);

  return (
    <div>
      <PageHeader eyebrow="LEADS / INQUIRIES" title="문의 관리" description="상담 내용을 확인하고 진행 상태를 관리합니다. 이름·이메일·문의 내용으로 빠르게 찾을 수 있습니다." />
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mb-4 flex flex-col gap-3 border-y border-[#2a2a26] py-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a867d]" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름, 회사, 이메일, 문의 내용 검색" aria-label="상담 문의 검색" className="h-10 rounded-sm border-[#3a3934] bg-[#161614] pl-10 text-sm placeholder:text-[#5a574f] focus-visible:border-[#f4b400] focus-visible:ring-[#f4b400]/30" />
          </div>
          <label className="flex shrink-0 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8a867d]">
            진행 상태
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-sm border border-[#3a3934] bg-[#161614] px-3 text-xs text-[#edeae2] outline-none focus:border-[#f4b400]">
              <option value="all">전체</option><option value="new">새 문의</option><option value="review">검토 중</option><option value="contacted">연락 완료</option><option value="closed">종료</option>
            </select>
          </label>
          <span className="shrink-0 font-mono text-[10px] text-[#8a867d]">{filteredRows.length} / {rows.length}건</span>
        </div>

        <div className="space-y-3">
          {filteredRows.length === 0 && (
            <div className="border border-dashed border-[#3a3934] px-6 py-14 text-center text-sm text-[#8a867d]">
              {rows.length ? "검색 조건에 맞는 문의가 없습니다." : "아직 접수된 문의가 없습니다."}
            </div>
          )}
          {filteredRows.map((item: any) => {
            const notifRows = notifByInquiry.get(item.id) ?? [];
            const failedRows = notifRows.filter((row: any) => row.status === "failed" || (row.status === "pending" && Date.now() - Date.parse(row.createdAt) > 60_000));
            const notifyErrors = notifRows.filter((row: any) => row.lastError).map((row: any) => `${row.channel}: ${row.lastError}`).join("\n");
            const notificationClass = item.notificationStatus === "failed" ? "border-[#5b3032] text-[#e5484d]" : item.notificationStatus === "pending" ? "border-[#f4b400]/50 text-[#f4b400]" : "border-[#3a3934] text-[#8a867d]";
            const statusClass = item.status === "new" ? "border-[#f4b400]/50 text-[#f4b400]" : item.status === "review" ? "border-[#f4b400]/30 text-[#c9c5bb]" : "border-[#3a3934] text-[#8a867d]";
            return (
              <Card key={item.id} className="rounded-sm border-[#2a2a26] bg-[#161614] shadow-none">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-medium text-[#edeae2]">{item.name}</h2>
                        {item.company && <span className="text-sm text-[#8a867d]">· {item.company}</span>}
                        <Badge variant="outline" className={statusClass}>{inquiryStatusLabel(item.status)}</Badge>
                        {item.notificationStatus && <span title={notifyErrors || undefined} className={`inline-flex items-center border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] ${notificationClass}`}>알림 · {item.notificationStatus === "failed" ? "실패" : item.notificationStatus === "pending" ? "대기" : item.notificationStatus}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#8a867d]">
                        <a href={`mailto:${item.email}`} className="break-all text-[#a9a59b] underline decoration-[#3a3934] underline-offset-4 hover:text-[#f4b400]">{item.email}</a>
                        {item.phone && <a href={`tel:${String(item.phone).replace(/[^\d+]/g, "")}`} className="hover:text-[#f4b400]">{item.phone}</a>}
                        {item.projectType && <span>{item.projectType}</span>}
                        {item.budget && <span>{item.budget}</span>}
                      </div>
                      <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[#c9c5bb]">{item.message}</p>
                      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.1em] text-[#5a574f]">{new Date(item.createdAt).toLocaleString("ko-KR")}</p>
                    </div>
                    <div className="flex shrink-0 flex-row items-center gap-3 lg:flex-col lg:items-end">
                      <label className="flex shrink-0 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8a867d]">
                        <span>상태</span>
                        <select aria-label={`${item.name} 문의 상태`} value={item.status} onChange={(event) => update.mutate({ id: item.id, status: event.target.value as "new" | "review" | "contacted" | "closed" })} className="h-10 rounded-sm border border-[#3a3934] bg-[#0e0e0e] px-3 text-xs text-[#edeae2] outline-none focus:border-[#f4b400]">
                          <option value="new">새 문의</option><option value="review">검토 중</option><option value="contacted">연락 완료</option><option value="closed">종료</option>
                        </select>
                      </label>
                      {failedRows.length > 0 && <Button size="sm" variant="outline" onClick={() => failedRows.forEach((row: any) => retry.mutate({ id: row.id }))} disabled={retry.isPending} className="h-10 rounded-sm border-[#5b3032] font-mono text-[9px] uppercase tracking-[0.1em] text-[#e5484d] hover:bg-[#241718]">알림 다시 보내기</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 팀 프로필 (새 어드민에 없던 섹션 — 기존 서버 /api/admin/team 에 직결) ──
function TeamEditor({ draft, onCancel, onSaved }: { draft: TeamDraft; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(draft);
  const [file, setFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const utils = trpc.useUtils();
  const mutation = trpc.admin.team.upsert.useMutation({ onSuccess: async () => { toast.success("팀 프로필을 저장했습니다."); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.landing.content.invalidate()]); onSaved(); }, onError: (error) => { toast.error(error.message); setBusy(false); } });
  const update = (key: keyof TeamDraft, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (!file) { setLocalPreview(""); return; }
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  const preview = localPreview || (form.removePhoto ? "" : assetUrl(form.photoUrl));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = { ...form, sortOrder: Number(form.sortOrder), photoPosition: Number(form.photoPosition) };
      delete payload.removePhotoCheckbox;
      if (file) payload.photoDataUrl = await imageToDataUrl(file);
      mutation.mutate(payload as TeamDraft & { photoDataUrl?: string });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "사진을 준비하는 중 문제가 생겼습니다.");
      setBusy(false);
    }
  };
  return (
    <Card className="mb-6 border-[#f4b400]/60 bg-[#161614] shadow-[0_16px_45px_rgba(23,23,20,0.08)]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#2a2a26]">
        <CardTitle className="text-lg">{form.id ? "프로필 수정" : "프로필 등록"}</CardTitle>
        <Button type="button" size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-6 pt-2 lg:grid-cols-[220px_1fr]">
          <div className="space-y-4">
            <div className="flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl border border-[#2a2a26] bg-[#1c1c19]">
              {preview ? (
                <img src={preview} alt="프로필 미리보기" className="h-full w-full object-cover" style={{ objectPosition: `center ${Number(form.photoPosition) || 0}%` }} />
              ) : (
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a867d]">No photo</span>
              )}
            </div>
            <p className="text-xs leading-5 text-[#8a867d]">랜딩에서는 흑백으로 표시되고, 마우스를 올리면 색이 돌아옵니다.</p>
          </div>
          <div className="space-y-5">
            <Field label="사진 업로드" hint="JPG·PNG·WEBP. 큰 사진은 업로드 전에 자동으로 줄입니다.">
              <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { const picked = e.target.files?.[0] ?? null; setFile(picked); if (picked) update("removePhoto", false); }} />
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="사진 주소" hint="/team_portraits/… 또는 https://">
                <Input value={form.photoUrl} onChange={(e) => update("photoUrl", e.target.value)} placeholder="/team_portraits/person.jpg" />
              </Field>
              <Field label={`Face position — ${Number(form.photoPosition) || 0}%`} hint="0% = 윗부분 기준, 100% = 아랫부분 기준">
                <input type="range" min="0" max="100" step="1" value={Number(form.photoPosition) || 0} onChange={(e) => update("photoPosition", Number(e.target.value))} className="mt-3 w-full accent-[#f4b400]" />
              </Field>
            </div>
            {(form.photoUrl || file) && (
              <Toggle checked={Boolean(form.removePhoto)} onChange={(value) => { update("removePhoto", value); if (value) setFile(null); }} label="사진 삭제" />
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:col-span-2">
            <Field label="이름"><Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="예) 조민희 PD" /></Field>
            <Field label="직함 · 한 줄 소개" hint="“ · ” 기준으로 앞부분은 직함, 뒷부분은 소속처럼 나뉘어 보입니다."><Input value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="PRODUCER / DIRECTOR · SBS 교양국 PD 출신" /></Field>
            <div className="md:col-span-2">
              <Field label="이력" hint='링크는 [표시 텍스트](https://주소) 형식으로 한 줄에 적습니다.'>
                <Textarea rows={7} value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder={"SBS 〈동물농장〉 PD\n미샤·베스킨라빈스 TVCF"} />
              </Field>
            </div>
            <Field label="표시 순서"><Input required type="number" min="0" value={form.sortOrder} onChange={(e) => update("sortOrder", Number(e.target.value))} /></Field>
            <div className="flex items-end pb-2"><Toggle checked={form.isPublished} onChange={(value) => update("isPublished", value)} label="랜딩에 공개" /></div>
          </div>
          <div className="lg:col-span-2"><SaveBar onCancel={onCancel} saving={busy || mutation.isPending} /></div>
        </form>
      </CardContent>
    </Card>
  );
}

function TeamPage({ content }: { content: any }) {
  const [draft, setDraft] = useState<TeamDraft | null>(null);
  const utils = trpc.useUtils();
  const remove = trpc.admin.team.delete.useMutation({ onSuccess: async () => { toast.success("팀 프로필을 삭제했습니다."); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.landing.content.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const rows = content?.team ?? [];
  return (
    <div>
      <PageHeader
        eyebrow="CONTENT / TEAM"
        title="팀 프로필"
        description="PD·감독·디자이너의 이름과 이력, 사진을 관리합니다. 공개로 저장한 프로필만 랜딩에 나타납니다."
        action={<Button onClick={() => setDraft({ ...emptyTeam, sortOrder: rows.length + 1 })} className="h-10 rounded-sm bg-[#f4b400] px-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#140f00] hover:bg-[#ffce3a]"><Plus className="mr-2 h-4 w-4" />프로필 등록</Button>}
      />
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
        {draft && <TeamEditor draft={draft} onCancel={() => setDraft(null)} onSaved={() => setDraft(null)} />}
        {rows.length === 0 && !draft && <div className="border border-dashed border-[#3a3934] px-6 py-14 text-center text-sm text-[#8a867d]">등록된 프로필이 없습니다. 첫 프로필을 추가해 보세요.</div>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((item: any) => {
            const lines = String(item.bio || "").split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
            return (
              <Card key={item.id} className="flex flex-col overflow-hidden rounded-sm border-[#2a2a26] bg-[#161614] shadow-none">
                <div className="flex items-center gap-4 border-b border-[#2a2a26] p-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-[#2a2a26] bg-[#1c1c19]">
                    {item.photoUrl ? <img src={assetUrl(item.photoUrl)} alt={`${item.name} 프로필`} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: `center ${Number(item.photoPosition) || 0}%` }} /> : <Users className="h-6 w-6 text-[#8a867d]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#edeae2]">{item.name}</p>
                    <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-[#8a867d]">{item.role || "—"}</p>
                  </div>
                  <Badge variant="outline" className={item.isPublished ? "shrink-0 border-[#f4b400]/50 text-[#f4b400]" : "shrink-0 border-[#3a3934] text-[#8a867d]"}>{item.isPublished ? "공개 중" : "임시 저장"}</Badge>
                </div>
                <CardContent className="flex flex-1 flex-col p-4">
                  {lines.length > 0 && (
                    <ul className="flex-1 space-y-1 text-xs leading-5 text-[#a9a59b]">
                      {lines.slice(0, 3).map((line: string) => <li key={line} className="truncate">· {line}</li>)}
                      {lines.length > 3 && <li className="font-mono text-[10px] text-[#8a867d]">외 {lines.length - 3}줄</li>}
                    </ul>
                  )}
                  <div className="mt-5 flex items-center justify-between border-t border-[#2a2a26] pt-3">
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a867d]">순서 {item.sortOrder}</span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDraft({ id: item.id, name: item.name, role: item.role ?? "", bio: item.bio ?? "", photoUrl: item.photoUrl ?? "", photoPosition: Number(item.photoPosition) || 0, sortOrder: Number(item.sortOrder) || 0, isPublished: Boolean(item.isPublished), removePhoto: false })} className="rounded-sm text-xs text-[#c9c5bb] hover:bg-[#24231f] hover:text-[#f4b400]">수정</Button>
                      <Button size="icon" variant="ghost" aria-label={`${item.name} 프로필 삭제`} title="삭제" onClick={() => { if (window.confirm(`'${item.name}' 프로필을 삭제할까요?`)) remove.mutate({ id: item.id }); }} disabled={remove.isPending} className="rounded-sm text-[#8a867d] hover:bg-[#241718] hover:text-[#e5484d]"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// ── 설정: 비밀번호 변경 + 콘텐츠 백업(무료 플랜 데이터 리셋 대비) ──
function PasswordCard() {
  const [form, setForm] = useState({ currentPassword: "", nextPassword: "" });
  const mutation = trpc.auth.password.useMutation({ onSuccess: () => { toast.success("비밀번호를 변경했습니다."); setForm({ currentPassword: "", nextPassword: "" }); }, onError: (error) => toast.error(error.message) });
  return (
    <Card className="rounded-sm border-[#2a2a26] bg-[#161614] shadow-none">
      <CardHeader className="border-b border-[#2a2a26] pb-4"><CardTitle className="flex items-center gap-2 text-base text-[#edeae2]"><KeyRound className="h-4 w-4 text-[#f4b400]" />비밀번호 변경</CardTitle></CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(form); }} className="grid gap-5 md:grid-cols-2">
          <Field label="현재 비밀번호"><Input required type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm((current) => ({ ...current, currentPassword: e.target.value }))} /></Field>
          <Field label="새 비밀번호 (8자 이상)"><Input required type="password" autoComplete="new-password" minLength={8} value={form.nextPassword} onChange={(e) => setForm((current) => ({ ...current, nextPassword: e.target.value }))} /></Field>
          <div className="md:col-span-2"><SaveBar onCancel={() => setForm({ currentPassword: "", nextPassword: "" })} saving={mutation.isPending} label="비밀번호 변경" /></div>
        </form>
      </CardContent>
    </Card>
  );
}

function BackupCard() {
  const [busy, setBusy] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);
  const backupToGitHub = async () => {
    setGithubBusy(true);
    try {
      const result = await post<{ message?: string; commitUrl?: string }>("/api/admin/github-backup", {});
      toast.success(result.message || "GitHub 백업과 배포를 시작했습니다.", {
        action: result.commitUrl ? { label: "커밋 보기", onClick: () => window.open(result.commitUrl, "_blank", "noopener,noreferrer") } : undefined,
        duration: 8000,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GitHub 백업에 실패했습니다.");
    } finally {
      setGithubBusy(false);
    }
  };
  const download = async () => {
    setBusy(true);
    try {
      const data = await get("/api/admin/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cuberry-seed-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("콘텐츠 JSON을 내려받았습니다. 저장소의 server/seed.json 을 이 파일로 바꿔 커밋하세요.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "내려받기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="rounded-sm border-[#2a2a26] bg-[#161614] shadow-none">
      <CardHeader className="border-b border-[#2a2a26] pb-4"><CardTitle className="flex items-center gap-2 text-base text-[#edeae2]"><Download className="h-4 w-4 text-[#f4b400]" />백업 · 배포</CardTitle></CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-sm leading-6 text-[#a9a59b]">
          운영 서버가 재시작되면 저장 내용이 <code className="border border-[#2a2a26] px-1.5 py-0.5 font-mono text-xs text-[#c9c5bb]">server/seed.json</code> 상태로 돌아갈 수 있습니다.
          아래 버튼으로 현재 콘텐츠를 백업해 두면, 서버가 다시 켜져도 같은 내용으로 시작합니다.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={backupToGitHub} disabled={githubBusy || busy} className="h-10 rounded-sm bg-[#f4b400] font-mono text-[10px] uppercase tracking-[0.1em] text-[#140f00] hover:bg-[#ffce3a]">
            {githubBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}GitHub에 백업 및 배포
          </Button>
          <Button type="button" variant="outline" onClick={download} disabled={busy || githubBusy} className="h-10 rounded-sm border-[#3a3934] font-mono text-[10px] uppercase tracking-[0.1em] text-[#c9c5bb] hover:border-[#f4b400] hover:text-[#f4b400]">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}JSON 내려받기
          </Button>
          {apiOrigin && <span className="font-mono text-[10px] text-[#8a867d]">API · {apiOrigin}</span>}
        </div>
        <p className="text-xs leading-5 text-[#8a867d]">
          GitHub 백업은 현재 콘텐츠를 저장소의 <code>server/seed.json</code>에 커밋합니다. Render 자동 배포가 켜져 있으면 곧바로 반영됩니다. 업로드 이미지는 포함되지 않습니다.
        </p>
        <p className="text-xs leading-5 text-[#8a867d]">
          자동 백업은 GitHub Actions(<code>.github/workflows/backup-seed.yml</code>)가 6시간마다 확인합니다. 내용이 그대로면 커밋을 건너뛰어 불필요한 재배포를 막습니다. 실제로 돌고 있는지는 개요 화면의 “마지막 백업” 줄로 확인합니다.
        </p>
      </CardContent>
    </Card>
  );
}

function SettingsPage({ settings }: { settings: any }) {
  const emptySettings = { brandName: "CUBE RRY", heroEyebrow: "CREATIVE VIDEO STUDIO / SEOUL · KOREA", heroTitle: "MAKE IT MOVE.", heroSubtitle: "", contactEmail: "f9.flownine@gmail.com", contactPhone: "070-8095-2302" };
  const [form, setForm] = useState(emptySettings);
  const utils = trpc.useUtils();
  useEffect(() => { if (settings) setForm({ brandName: settings.brandName, heroEyebrow: settings.heroEyebrow, heroTitle: settings.heroTitle, heroSubtitle: settings.heroSubtitle, contactEmail: settings.contactEmail, contactPhone: settings.contactPhone }); }, [settings]);
  const mutation = trpc.admin.settings.update.useMutation({ onSuccess: async () => { toast.success("사이트 문구를 저장했습니다."); await Promise.all([utils.admin.content.invalidate(), utils.landing.content.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const reset = () => setForm(settings ? { brandName: settings.brandName, heroEyebrow: settings.heroEyebrow, heroTitle: settings.heroTitle, heroSubtitle: settings.heroSubtitle, contactEmail: settings.contactEmail, contactPhone: settings.contactPhone } : emptySettings);
  return (
    <div>
      <PageHeader eyebrow="SYSTEM / SETTINGS" title="사이트 설정" description="랜딩 첫 화면의 문구와 연락처, 관리자 비밀번호와 백업을 관리합니다." />
      <div className="mx-auto max-w-4xl space-y-6 px-5 py-6 sm:px-8 sm:py-8">
        <Card className="rounded-sm border-[#2a2a26] bg-[#161614] shadow-none">
          <CardHeader className="border-b border-[#2a2a26] pb-4"><CardTitle className="flex items-center gap-2 text-base text-[#edeae2]"><Settings2 className="h-4 w-4 text-[#f4b400]" />첫 화면 문구 · 연락처</CardTitle></CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(form); }} className="space-y-5">
              <Field label="브랜드 이름"><Input required value={form.brandName} onChange={(e) => update("brandName", e.target.value)} /></Field>
              <Field label="히어로 상단 라벨" hint="영문 대문자 라벨을 권장합니다."><Input required value={form.heroEyebrow} onChange={(e) => update("heroEyebrow", e.target.value)} /></Field>
              <Field label="히어로 제목" hint="마지막 단어가 강조 색으로 표시됩니다."><Input required value={form.heroTitle} onChange={(e) => update("heroTitle", e.target.value)} /></Field>
              <Field label="히어로 설명"><Textarea required rows={5} value={form.heroSubtitle} onChange={(e) => update("heroSubtitle", e.target.value)} /></Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="상담 이메일"><Input required type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} /></Field>
                <Field label="상담 전화"><Input required value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} /></Field>
              </div>
              <SaveBar onCancel={reset} saving={mutation.isPending} />
            </form>
          </CardContent>
        </Card>
        <PasswordCard />
        <BackupCard />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const contentQuery = trpc.admin.content.useQuery(undefined, { enabled: isAdmin, retry: false });
  const summaryQuery = trpc.admin.summary.useQuery(undefined, { enabled: isAdmin, retry: false });
  const content = contentQuery.data;

  if (loading || (isAdmin && contentQuery.isLoading)) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0e0e0e]"><Loader2 className="h-6 w-6 animate-spin text-[#f4b400]" /></div>;
  }
  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0e0e0e] p-6">
        <Card className="max-w-md rounded-sm border-[#2a2a26] bg-[#161614] shadow-none">
          <CardContent className="p-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4b400]">CUBE RRY / ADMIN</p>
            <h1 className="mt-4 text-2xl font-semibold text-[#edeae2]">관리자 권한이 필요합니다</h1>
            <p className="mt-2 text-sm leading-6 text-[#a9a59b]">운영자 계정으로 로그인하거나 관리자 권한을 부여받은 계정으로 접속해 주세요.</p>
            <a href={siteRoot} className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.1em] text-[#f4b400]">랜딩으로 돌아가기 →</a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const go = (path: string) => setLocation(path);
  const normalized = location === "/admin" ? "overview" : location.split("/")[2] || "overview";
  if (summaryQuery.error || contentQuery.error) {
    return <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-10"><p className="text-sm text-[#e5484d]">관리자 데이터를 불러오지 못했습니다. 권한과 서버 상태를 확인해 주세요.</p></div>;
  }
  if (normalized === "portfolio") return <PortfolioPage content={content} />;
  if (normalized === "services") return <ServicesPage content={content} />;
  if (normalized === "faqs") return <FaqPage content={content} />;
  if (normalized === "team") return <TeamPage content={content} />;
  if (normalized === "inquiries") return <InquiriesPage content={content} />;
  if (normalized === "settings") return <SettingsPage settings={content?.settings} />;
  return <Overview summary={summaryQuery.data ?? { portfolio: 0, published: 0, inquiries: 0, newInquiries: 0 }} content={content} go={go} />;
}

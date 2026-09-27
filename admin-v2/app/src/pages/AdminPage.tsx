import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { apiOrigin, assetUrl, get, siteRoot } from "@/lib/api";
import { ArrowUpRight, Check, ChevronDown, Download, ExternalLink, Film, KeyRound, Loader2, Mail, Plus, Save, Settings2, Trash2, Users, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

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
  return <div className="space-y-2"><Label className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#77766f]">{label}</Label>{children}{hint && <p className="text-xs text-[#96948c]">{hint}</p>}</div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="flex flex-col justify-between gap-5 border-b border-[#dedbd0] px-5 py-7 sm:px-8 lg:flex-row lg:items-end"><div><p className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-orange-600">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#161616] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#77766f]">{description}</p></div>{action}</header>;
}

function SaveBar({ onCancel, saving, label = "Save changes" }: { onCancel: () => void; saving: boolean; label?: string }) {
  return <div className="flex items-center justify-end gap-2 border-t border-[#dedbd0] pt-5"><Button type="button" variant="ghost" onClick={onCancel} className="font-mono text-xs uppercase tracking-[0.1em]">Cancel</Button><Button type="submit" disabled={saving} className="bg-[#161616] font-mono text-xs uppercase tracking-[0.1em] text-white hover:bg-orange-600">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{label}</Button></div>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex cursor-pointer items-center gap-2 text-sm text-[#494844]"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-orange-600" />{label}</label>;
}

function PortfolioEditor({ draft, onCancel, onSaved }: { draft: PortfolioDraft; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(draft);
  const utils = trpc.useUtils();
  const mutation = trpc.admin.portfolio.upsert.useMutation({ onSuccess: async () => { toast.success("Portfolio saved"); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.landing.content.invalidate()]); onSaved(); }, onError: (error) => toast.error(error.message) });
  const update = (key: keyof PortfolioDraft, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ ...form, sortOrder: Number(form.sortOrder), videoUrl: form.videoUrl, thumbnailUrl: form.thumbnailUrl || undefined }); };
  return <Card className="mb-6 border-[#d8ff57]/60 bg-[#fbfaf6] shadow-[0_16px_45px_rgba(23,23,20,0.08)]"><CardHeader className="flex flex-row items-center justify-between border-b border-[#ece9df]"><CardTitle className="text-lg">{form.id ? "Edit portfolio item" : "New portfolio item"}</CardTitle><Button type="button" size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form onSubmit={submit} className="grid gap-5 pt-2 md:grid-cols-2"><Field label="Title"><Input required value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Project title" /></Field><Field label="Category"><Input required value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="BRAND FILM" /></Field><Field label="Year"><Input required value={form.year} onChange={(e) => update("year", e.target.value)} /></Field><Field label="Sort order"><Input required type="number" min="0" value={form.sortOrder} onChange={(e) => update("sortOrder", Number(e.target.value))} /></Field><Field label="Video URL" hint="Google Drive preview URL or direct video URL"><Input required type="url" value={form.videoUrl} onChange={(e) => update("videoUrl", e.target.value)} /></Field><Field label="Thumbnail URL"><Input type="url" value={form.thumbnailUrl} onChange={(e) => update("thumbnailUrl", e.target.value)} placeholder="Optional image URL" /></Field><div className="md:col-span-2"><Field label="Description"><Textarea required rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} /></Field></div><Field label="Tags"><Input required value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="AI, EDITING, MOTION" /></Field><div className="flex items-end gap-5 pb-2"><Toggle checked={form.isFeatured} onChange={(value) => update("isFeatured", value)} label="Featured" /><Toggle checked={form.isPublished} onChange={(value) => update("isPublished", value)} label="Published" /></div><div className="md:col-span-2"><SaveBar onCancel={onCancel} saving={mutation.isPending} /></div></form></CardContent></Card>;
}

function ServiceEditor({ draft, onCancel, onSaved }: { draft: ServiceDraft; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(draft);
  const utils = trpc.useUtils();
  const mutation = trpc.admin.services.upsert.useMutation({ onSuccess: async () => { toast.success("Service saved"); await Promise.all([utils.admin.content.invalidate(), utils.landing.content.invalidate()]); onSaved(); }, onError: (error) => toast.error(error.message) });
  const update = (key: keyof ServiceDraft, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ ...form, sortOrder: Number(form.sortOrder) }); };
  return <Card className="mb-6 border-[#d8ff57]/60 bg-[#fbfaf6] shadow-[0_16px_45px_rgba(23,23,20,0.08)]"><CardHeader className="flex flex-row items-center justify-between border-b border-[#ece9df]"><CardTitle className="text-lg">{form.id ? "Edit service" : "New service"}</CardTitle><Button type="button" size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form onSubmit={submit} className="grid gap-5 pt-2 md:grid-cols-2"><Field label="Slug"><Input required value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="standard" /></Field><Field label="Name"><Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="숏폼 AI 광고" /></Field><Field label="Price"><Input required value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="29만원~" /></Field><Field label="Duration"><Input required value={form.duration} onChange={(e) => update("duration", e.target.value)} placeholder="15초 · 최대 5컷" /></Field><Field label="Accent"><Input required value={form.accent} onChange={(e) => update("accent", e.target.value)} placeholder="lime" /></Field><Field label="Sort order"><Input required type="number" min="0" value={form.sortOrder} onChange={(e) => update("sortOrder", Number(e.target.value))} /></Field><div className="md:col-span-2"><Field label="Description"><Textarea required rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} /></Field></div><div className="md:col-span-2"><Toggle checked={form.isPublished} onChange={(value) => update("isPublished", value)} label="Published" /></div><div className="md:col-span-2"><SaveBar onCancel={onCancel} saving={mutation.isPending} /></div></form></CardContent></Card>;
}

function FaqEditor({ draft, onCancel, onSaved }: { draft: FaqDraft; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(draft);
  const utils = trpc.useUtils();
  const mutation = trpc.admin.faqs.upsert.useMutation({ onSuccess: async () => { toast.success("FAQ saved"); await Promise.all([utils.admin.content.invalidate(), utils.landing.content.invalidate()]); onSaved(); }, onError: (error) => toast.error(error.message) });
  const update = (key: keyof FaqDraft, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate({ ...form, sortOrder: Number(form.sortOrder) }); };
  return <Card className="mb-6 border-[#d8ff57]/60 bg-[#fbfaf6] shadow-[0_16px_45px_rgba(23,23,20,0.08)]"><CardHeader className="flex flex-row items-center justify-between border-b border-[#ece9df]"><CardTitle className="text-lg">{form.id ? "Edit FAQ" : "New FAQ"}</CardTitle><Button type="button" size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button></CardHeader><CardContent><form onSubmit={submit} className="grid gap-5 pt-2"><Field label="Question"><Input required value={form.question} onChange={(e) => update("question", e.target.value)} /></Field><Field label="Answer"><Textarea required rows={5} value={form.answer} onChange={(e) => update("answer", e.target.value)} /></Field><div className="flex items-center gap-5"><Field label="Sort order"><Input required type="number" min="0" value={form.sortOrder} onChange={(e) => update("sortOrder", Number(e.target.value))} /></Field><div className="pt-6"><Toggle checked={form.isPublished} onChange={(value) => update("isPublished", value)} label="Published" /></div></div><SaveBar onCancel={onCancel} saving={mutation.isPending} /></form></CardContent></Card>;
}

function Overview({ summary, content, go }: { summary: { portfolio: number; published: number; inquiries: number; newInquiries: number }; content: any; go: (path: string) => void }) {
  const cards = [{ label: "Portfolio items", value: summary.portfolio, note: `${summary.published} published`, icon: Film, path: "/admin/portfolio", color: "bg-[#d8ff57]" }, { label: "New inquiries", value: summary.newInquiries, note: `${summary.inquiries} total inquiries`, icon: Mail, path: "/admin/inquiries", color: "bg-[#ffb37b]" }, { label: "Services", value: content?.services?.length ?? 0, note: "Pricing cards", icon: Settings2, path: "/admin/services", color: "bg-[#c6b9ff]" }];
  return <div><PageHeader eyebrow="CUBE RRY / OVERVIEW" title="Good to see you." description="랜딩 페이지에 노출되는 콘텐츠를 한 곳에서 관리합니다." action={<a href={siteRoot} target="_blank" rel="noreferrer"><Button variant="outline" className="border-[#bcb9af] font-mono text-xs uppercase tracking-[0.1em]"><ExternalLink className="mr-2 h-4 w-4" />Live site</Button></a>} /><div className="space-y-8 px-5 py-7 sm:px-8"><div className="grid gap-4 md:grid-cols-3">{cards.map((card) => <button key={card.label} onClick={() => go(card.path)} className="group rounded-2xl border border-[#dedbd0] bg-[#fbfaf6] p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-[#161616] hover:shadow-[0_15px_35px_rgba(23,23,20,0.08)]"><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}><card.icon className="h-5 w-5 text-[#161616]" /></span><ArrowUpRight className="h-4 w-4 text-[#9a988e] transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#161616]" /></div><p className="mt-8 text-3xl font-semibold tracking-[-0.05em] text-[#161616]">{card.value}</p><p className="mt-1 text-sm font-medium text-[#3d3d38]">{card.label}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#929087]">{card.note}</p></button>)}</div><div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><Card className="border-[#dedbd0] bg-[#fbfaf6]"><CardHeader><CardTitle className="flex items-center justify-between text-base">Recent portfolio <button onClick={() => go("/admin/portfolio")} className="font-mono text-[10px] uppercase tracking-[0.1em] text-orange-600">Manage →</button></CardTitle></CardHeader><CardContent className="space-y-1">{(content?.portfolio ?? []).slice(0, 5).map((item: any) => <button key={item.id} onClick={() => go("/admin/portfolio")} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition hover:bg-[#f0eee6]"><div className="min-w-0"><p className="truncate text-sm font-medium text-[#262621]">{item.title}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#929087]">{item.category} · {item.year}</p></div><Badge variant={item.isPublished ? "default" : "outline"} className={item.isPublished ? "bg-[#161616] text-[#d8ff57]" : "text-[#929087]"}>{item.isPublished ? "Live" : "Draft"}</Badge></button>)}</CardContent></Card><div className="rounded-2xl bg-[#161616] p-6 text-white"><p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#d8ff57]">Next best action</p><h2 className="mt-10 max-w-xs text-2xl font-semibold leading-tight tracking-[-0.04em]">Keep the work library fresh.</h2><p className="mt-3 max-w-sm text-sm leading-6 text-white/55">새로운 프로젝트를 등록하면 랜딩 페이지의 Selected Works 영역에 즉시 반영됩니다.</p><button onClick={() => go("/admin/portfolio")} className="mt-8 rounded-full bg-[#d8ff57] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#161616] transition hover:bg-white">Add a project <ArrowUpRight className="ml-1 inline h-3 w-3" /></button></div></div></div></div>;
}

function PortfolioPage({ content }: { content: any }) {
  const [draft, setDraft] = useState<PortfolioDraft | null>(null);
  const utils = trpc.useUtils();
  const remove = trpc.admin.portfolio.delete.useMutation({ onSuccess: async () => { toast.success("Portfolio deleted"); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.landing.content.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const rows = content?.portfolio ?? [];
  return <div><PageHeader eyebrow="CONTENT / PORTFOLIO" title="Selected works" description="영상 링크, 카테고리, 설명과 공개 여부를 관리합니다." action={<Button onClick={() => setDraft({ ...emptyPortfolio })} className="bg-[#161616] font-mono text-xs uppercase tracking-[0.1em] text-white hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Add work</Button>} /><div className="px-5 py-7 sm:px-8">{draft && <PortfolioEditor draft={draft} onCancel={() => setDraft(null)} onSaved={() => setDraft(null)} />}<div className="overflow-hidden rounded-2xl border border-[#dedbd0] bg-[#fbfaf6]"><div className="hidden grid-cols-[1fr_150px_80px_100px_88px] gap-4 border-b border-[#dedbd0] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#929087] md:grid"><span>Project</span><span>Category</span><span>Year</span><span>Status</span><span /></div>{rows.map((item: any) => <div key={item.id} className="grid gap-3 border-b border-[#ece9df] px-5 py-4 last:border-0 md:grid-cols-[1fr_150px_80px_100px_88px] md:items-center md:gap-4"><div className="min-w-0"><p className="truncate font-medium text-[#262621]">{item.title}</p><p className="mt-1 line-clamp-1 text-xs text-[#929087]">{item.description}</p></div><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#77766f]">{item.category}</span><span className="font-mono text-xs text-[#77766f]">{item.year}</span><Badge variant={item.isPublished ? "default" : "outline"} className={`w-fit ${item.isPublished ? "bg-[#d8ff57] text-[#161616]" : "text-[#929087]"}`}>{item.isPublished ? "Published" : "Draft"}</Badge><div className="flex items-center gap-1"><Button size="sm" variant="ghost" onClick={() => setDraft({ ...item, isFeatured: Boolean(item.isFeatured), isPublished: Boolean(item.isPublished), thumbnailUrl: item.thumbnailUrl ?? "" })}>Edit</Button><Button size="icon" variant="ghost" onClick={() => remove.mutate({ id: item.id })} disabled={remove.isPending} className="text-[#a36b63] hover:text-red-600"><Trash2 className="h-4 w-4" /></Button></div></div>)}</div></div></div>;
}

function ServicesPage({ content }: { content: any }) {
  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const utils = trpc.useUtils();
  const remove = trpc.admin.services.delete.useMutation({ onSuccess: async () => { toast.success("Service deleted"); await Promise.all([utils.admin.content.invalidate(), utils.landing.content.invalidate()]); }, onError: (error) => toast.error(error.message) });
  return <div><PageHeader eyebrow="CONTENT / SERVICES" title="Pricing & services" description="랜딩 페이지의 상담 상품 카드와 가격 정보를 관리합니다." action={<Button onClick={() => setDraft({ ...emptyService })} className="bg-[#161616] font-mono text-xs uppercase tracking-[0.1em] text-white hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Add service</Button>} /><div className="grid gap-5 px-5 py-7 sm:px-8 md:grid-cols-2 xl:grid-cols-3">{draft && <div className="md:col-span-2 xl:col-span-3"><ServiceEditor draft={draft} onCancel={() => setDraft(null)} onSaved={() => setDraft(null)} /></div>}{(content?.services ?? []).map((item: any) => <Card key={item.id} className="border-[#dedbd0] bg-[#fbfaf6]"><CardHeader className="flex flex-row items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orange-600">{item.slug} / {item.duration}</p><CardTitle className="mt-2 text-xl">{item.name}</CardTitle></div><Badge className={item.isPublished ? "bg-[#d8ff57] text-[#161616]" : "bg-transparent text-[#929087]"}>{item.isPublished ? "Live" : "Draft"}</Badge></CardHeader><CardContent><p className="text-2xl font-semibold tracking-[-0.04em] text-[#161616]">{item.price}</p><p className="mt-3 text-sm leading-6 text-[#77766f]">{item.description}</p><div className="mt-6 flex justify-between border-t border-[#ece9df] pt-4"><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#929087]">Order {item.sortOrder}</span><div><Button size="sm" variant="ghost" onClick={() => setDraft({ ...item, isPublished: Boolean(item.isPublished) })}>Edit</Button><Button size="icon" variant="ghost" onClick={() => remove.mutate({ id: item.id })} className="text-[#a36b63]"><Trash2 className="h-4 w-4" /></Button></div></div></CardContent></Card>)}</div></div>;
}

function FaqPage({ content }: { content: any }) {
  const [draft, setDraft] = useState<FaqDraft | null>(null);
  const utils = trpc.useUtils();
  const remove = trpc.admin.faqs.delete.useMutation({ onSuccess: async () => { toast.success("FAQ deleted"); await Promise.all([utils.admin.content.invalidate(), utils.landing.content.invalidate()]); }, onError: (error) => toast.error(error.message) });
  return <div><PageHeader eyebrow="CONTENT / FAQ" title="Answers, ready." description="자주 묻는 질문과 답변을 편집하면 랜딩 페이지에 바로 반영됩니다." action={<Button onClick={() => setDraft({ ...emptyFaq })} className="bg-[#161616] font-mono text-xs uppercase tracking-[0.1em] text-white hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Add FAQ</Button>} /><div className="mx-auto max-w-4xl space-y-3 px-5 py-7 sm:px-8">{draft && <FaqEditor draft={draft} onCancel={() => setDraft(null)} onSaved={() => setDraft(null)} />}{(content?.faqs ?? []).map((item: any) => <div key={item.id} className="rounded-2xl border border-[#dedbd0] bg-[#fbfaf6] p-5"><div className="flex items-start gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d8ff57] font-mono text-xs text-[#161616]">{String(item.sortOrder).padStart(2, "0")}</span><div className="min-w-0 flex-1"><h3 className="font-medium text-[#262621]">{item.question}</h3><p className="mt-2 text-sm leading-6 text-[#77766f]">{item.answer}</p><div className="mt-4 flex items-center gap-2"><Badge variant="outline" className="font-mono text-[10px] uppercase">{item.isPublished ? "Published" : "Draft"}</Badge><Button size="sm" variant="ghost" onClick={() => setDraft({ ...item, isPublished: Boolean(item.isPublished) })}>Edit</Button><Button size="icon" variant="ghost" onClick={() => remove.mutate({ id: item.id })} className="text-[#a36b63]"><Trash2 className="h-4 w-4" /></Button></div></div></div></div>)}</div></div>;
}

function InquiriesPage({ content }: { content: any }) {
  const utils = trpc.useUtils();
  const update = trpc.admin.inquiries.updateStatus.useMutation({ onSuccess: async () => { toast.success("Inquiry status updated"); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const rows = content?.inquiries ?? [];
  return <div><PageHeader eyebrow="LEADS / INQUIRIES" title="Project conversations" description="랜딩 페이지에서 접수된 상담 문의를 확인하고 상태를 관리합니다." /><div className="space-y-3 px-5 py-7 sm:px-8">{rows.length === 0 && <div className="rounded-2xl border border-dashed border-[#c9c6bc] p-12 text-center text-sm text-[#929087]">아직 접수된 문의가 없습니다.</div>}{rows.map((item: any) => <Card key={item.id} className="border-[#dedbd0] bg-[#fbfaf6]"><CardContent className="p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-[#262621]">{item.name}</h3>{item.company && <span className="text-sm text-[#929087]">· {item.company}</span>}<Badge className={item.status === "new" ? "bg-[#ffb37b] text-[#161616]" : item.status === "contacted" ? "bg-[#c6b9ff] text-[#161616]" : "bg-[#e6e3da] text-[#77766f]"}>{item.status}</Badge></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#929087]"><a href={`mailto:${item.email}`} className="hover:text-orange-600">{item.email}</a>{item.phone && <span>{item.phone}</span>}{item.projectType && <span>{item.projectType}</span>}{item.budget && <span>{item.budget}</span>}</div><p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[#494844]">{item.message}</p><p className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#b1aea4]">{new Date(item.createdAt).toLocaleString()}</p></div><label className="flex shrink-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#77766f]"><span>Status</span><select value={item.status} onChange={(event) => update.mutate({ id: item.id, status: event.target.value as "new" | "contacted" | "closed" })} className="rounded-lg border border-[#c9c6bc] bg-[#fbfaf6] px-3 py-2 text-xs text-[#262621] outline-none focus:border-orange-600"><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select></label></div></CardContent></Card>)}</div></div>;
}


// ── 팀 프로필 (새 어드민에 없던 섹션 — 기존 서버 /api/admin/team 에 직결) ──
function TeamEditor({ draft, onCancel, onSaved }: { draft: TeamDraft; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(draft);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const utils = trpc.useUtils();
  const mutation = trpc.admin.team.upsert.useMutation({ onSuccess: async () => { toast.success("Team profile saved"); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.landing.content.invalidate()]); onSaved(); }, onError: (error) => { toast.error(error.message); setBusy(false); } });
  const update = (key: keyof TeamDraft, value: string | number | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const preview = file ? URL.createObjectURL(file) : form.removePhoto ? "" : assetUrl(form.photoUrl);
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
    <Card className="mb-6 border-[#d8ff57]/60 bg-[#fbfaf6] shadow-[0_16px_45px_rgba(23,23,20,0.08)]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#ece9df]">
        <CardTitle className="text-lg">{form.id ? "Edit profile" : "New profile"}</CardTitle>
        <Button type="button" size="icon" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-6 pt-2 lg:grid-cols-[220px_1fr]">
          <div className="space-y-4">
            <div className="flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl border border-[#dedbd0] bg-[#efede4]">
              {preview ? (
                <img src={preview} alt="프로필 미리보기" className="h-full w-full object-cover" style={{ objectPosition: `center ${Number(form.photoPosition) || 0}%` }} />
              ) : (
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#929087]">No photo</span>
              )}
            </div>
            <p className="text-xs leading-5 text-[#96948c]">랜딩에서는 흑백으로 표시되고, 마우스를 올리면 색이 돌아옵니다.</p>
          </div>
          <div className="space-y-5">
            <Field label="Photo file (사진 업로드)" hint="JPG·PNG·WEBP. 큰 사진은 업로드 전에 자동으로 줄입니다.">
              <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { const picked = e.target.files?.[0] ?? null; setFile(picked); if (picked) update("removePhoto", false); }} />
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Photo URL" hint="/team_portraits/… 또는 https://">
                <Input value={form.photoUrl} onChange={(e) => update("photoUrl", e.target.value)} placeholder="/team_portraits/person.jpg" />
              </Field>
              <Field label={`Face position — ${Number(form.photoPosition) || 0}%`} hint="0% = 윗부분 기준, 100% = 아랫부분 기준">
                <input type="range" min="0" max="100" step="1" value={Number(form.photoPosition) || 0} onChange={(e) => update("photoPosition", Number(e.target.value))} className="mt-3 w-full accent-orange-600" />
              </Field>
            </div>
            {(form.photoUrl || file) && (
              <Toggle checked={Boolean(form.removePhoto)} onChange={(value) => { update("removePhoto", value); if (value) setFile(null); }} label="사진 삭제" />
            )}
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:col-span-2">
            <Field label="Name (이름·직함)"><Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="예) 조민희 PD" /></Field>
            <Field label="Role (한 줄 소개)" hint="“ · ” 기준으로 앞부분은 직함, 뒷부분은 소속처럼 나뉘어 보입니다."><Input value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="PRODUCER / DIRECTOR · SBS 교양국 PD 출신" /></Field>
            <div className="md:col-span-2">
              <Field label="Profile (이력 — 한 줄에 하나씩)" hint='링크는 [표시 텍스트](https://주소) 형식으로 한 줄에 적습니다.'>
                <Textarea rows={7} value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder={"SBS 〈동물농장〉 PD\n미샤·베스킨라빈스 TVCF"} />
              </Field>
            </div>
            <Field label="Sort order"><Input required type="number" min="0" value={form.sortOrder} onChange={(e) => update("sortOrder", Number(e.target.value))} /></Field>
            <div className="flex items-end pb-2"><Toggle checked={form.isPublished} onChange={(value) => update("isPublished", value)} label="Published" /></div>
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
  const remove = trpc.admin.team.delete.useMutation({ onSuccess: async () => { toast.success("Team profile deleted"); await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate(), utils.landing.content.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const rows = content?.team ?? [];
  return (
    <div>
      <PageHeader eyebrow="CONTENT / TEAM" title="Team profiles" description="PD·감독·디자이너의 이름, 역할, 이력과 얼굴 사진을 관리합니다. 저장하면 랜딩 페이지 Team profile 섹션에 반영됩니다." action={<Button onClick={() => setDraft({ ...emptyTeam, sortOrder: rows.length + 1 })} className="bg-[#161616] font-mono text-xs uppercase tracking-[0.1em] text-white hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Add person</Button>} />
      <div className="space-y-4 px-5 py-7 sm:px-8">
        {draft && <TeamEditor draft={draft} onCancel={() => setDraft(null)} onSaved={() => setDraft(null)} />}
        {rows.length === 0 && !draft && <div className="rounded-2xl border border-dashed border-[#c9c6bc] p-12 text-center text-sm text-[#929087]">등록된 프로필이 없습니다.</div>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((item: any) => {
            const lines = String(item.bio || "").split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean);
            return (
              <Card key={item.id} className="overflow-hidden border-[#dedbd0] bg-[#fbfaf6]">
                <div className="flex items-center gap-4 border-b border-[#ece9df] p-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#efede4]">
                    {item.photoUrl ? <img src={assetUrl(item.photoUrl)} alt={`${item.name} 프로필`} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: `center ${Number(item.photoPosition) || 0}%` }} /> : <Users className="h-6 w-6 text-[#929087]" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#262621]">{item.name}</p>
                    <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[#929087]">{item.role || "—"}</p>
                  </div>
                  <Badge variant={item.isPublished ? "default" : "outline"} className={`ml-auto ${item.isPublished ? "bg-[#d8ff57] text-[#161616]" : "text-[#929087]"}`}>{item.isPublished ? "Live" : "Draft"}</Badge>
                </div>
                <CardContent className="p-4">
                  {lines.length > 0 && (
                    <ul className="space-y-1 text-xs leading-5 text-[#77766f]">
                      {lines.slice(0, 3).map((line: string) => <li key={line} className="truncate">· {line}</li>)}
                      {lines.length > 3 && <li className="text-[#b1aea4]">외 {lines.length - 3}줄</li>}
                    </ul>
                  )}
                  <div className="mt-5 flex items-center justify-between border-t border-[#ece9df] pt-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#929087]">Order {item.sortOrder}</span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDraft({ id: item.id, name: item.name, role: item.role ?? "", bio: item.bio ?? "", photoUrl: item.photoUrl ?? "", photoPosition: Number(item.photoPosition) || 0, sortOrder: Number(item.sortOrder) || 0, isPublished: Boolean(item.isPublished), removePhoto: false })}>Edit</Button>
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate({ id: item.id })} disabled={remove.isPending} className="text-[#a36b63] hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
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

// ── 설정 페이지 추가 카드: 비밀번호 변경 + 콘텐츠 백업(무료 플랜 데이터 리셋 대비) ──
function PasswordCard() {
  const [form, setForm] = useState({ currentPassword: "", nextPassword: "" });
  const mutation = trpc.auth.password.useMutation({ onSuccess: () => { toast.success("비밀번호를 변경했습니다."); setForm({ currentPassword: "", nextPassword: "" }); }, onError: (error) => toast.error(error.message) });
  return (
    <Card className="mt-6 border-[#dedbd0] bg-[#fbfaf6]">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="h-4 w-4" />Password</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={(event) => { event.preventDefault(); mutation.mutate(form); }} className="grid gap-5 md:grid-cols-2">
          <Field label="Current password"><Input required type="password" autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm((current) => ({ ...current, currentPassword: e.target.value }))} /></Field>
          <Field label="New password (8자 이상)"><Input required type="password" autoComplete="new-password" minLength={8} value={form.nextPassword} onChange={(e) => setForm((current) => ({ ...current, nextPassword: e.target.value }))} /></Field>
          <SaveBar onCancel={() => setForm({ currentPassword: "", nextPassword: "" })} saving={mutation.isPending} label="Update password" />
        </form>
      </CardContent>
    </Card>
  );
}

function BackupCard() {
  const [busy, setBusy] = useState(false);
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
      toast.error(error instanceof Error ? error.message : "내려받기 실패.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="mt-6 border-[#dedbd0] bg-[#fbfaf6]">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Download className="h-4 w-4" />Backup</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-[#77766f]">
          Render 무료 플랜은 디스크가 재시작마다 지워지는 환경에서는 저장 내용이 <code className="rounded bg-[#efece4] px-1.5 py-0.5 font-mono text-xs">server/seed.json</code>으로 되돌아갑니다.
          현재 콘텐츠를 내려받기해 저장소의 seed.json 으로 커밋해 두면, 서버가 다시 켜질 때도 같은 내용으로 시작합니다.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={download} disabled={busy} className="bg-[#161616] font-mono text-xs uppercase tracking-[0.1em] text-white hover:bg-orange-600">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}콘텐츠 JSON 내려받기
          </Button>
          {apiOrigin && <span className="font-mono text-[11px] text-[#929087]">API server: {apiOrigin}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPage({ settings }: { settings: any }) {
  const [form, setForm] = useState({ brandName: "CUBE RRY", heroEyebrow: "CREATIVE VIDEO STUDIO / SEOUL · KOREA", heroTitle: "MAKE IT MOVE.", heroSubtitle: "", contactEmail: "f9.flownine@gmail.com", contactPhone: "070-8095-2302" });
  const utils = trpc.useUtils();
  useEffect(() => { if (settings) setForm({ brandName: settings.brandName, heroEyebrow: settings.heroEyebrow, heroTitle: settings.heroTitle, heroSubtitle: settings.heroSubtitle, contactEmail: settings.contactEmail, contactPhone: settings.contactPhone }); }, [settings]);
  const mutation = trpc.admin.settings.update.useMutation({ onSuccess: async () => { toast.success("Site settings saved"); await Promise.all([utils.admin.content.invalidate(), utils.landing.content.invalidate()]); }, onError: (error) => toast.error(error.message) });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return <div><PageHeader eyebrow="SYSTEM / SETTINGS" title="Site settings" description="랜딩 페이지의 첫인상과 연락처를 관리합니다." /><div className="max-w-3xl px-5 py-7 sm:px-8"><Card className="border-[#dedbd0] bg-[#fbfaf6]"><CardHeader><CardTitle className="text-lg">Global content</CardTitle></CardHeader><CardContent><form onSubmit={(event) => { event.preventDefault(); mutation.mutate(form); }} className="space-y-5"><Field label="Brand name"><Input required value={form.brandName} onChange={(e) => update("brandName", e.target.value)} /></Field><Field label="Hero eyebrow"><Input required value={form.heroEyebrow} onChange={(e) => update("heroEyebrow", e.target.value)} /></Field><Field label="Hero title"><Input required value={form.heroTitle} onChange={(e) => update("heroTitle", e.target.value)} /></Field><Field label="Hero subtitle"><Textarea required rows={5} value={form.heroSubtitle} onChange={(e) => update("heroSubtitle", e.target.value)} /></Field><div className="grid gap-5 md:grid-cols-2"><Field label="Contact email"><Input required type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} /></Field><Field label="Contact phone"><Input required value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} /></Field></div><SaveBar onCancel={() => setForm({ brandName: settings?.brandName ?? "CUBE RRY", heroEyebrow: settings?.heroEyebrow ?? "", heroTitle: settings?.heroTitle ?? "", heroSubtitle: settings?.heroSubtitle ?? "", contactEmail: settings?.contactEmail ?? "", contactPhone: settings?.contactPhone ?? "" })} saving={mutation.isPending} /></form></CardContent></Card><PasswordCard /><BackupCard /></div></div>;
}

export default function AdminPage() {
  const [location, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const isAdmin = user?.role === "admin";
  const contentQuery = trpc.admin.content.useQuery(undefined, { enabled: isAdmin, retry: false });
  const summaryQuery = trpc.admin.summary.useQuery(undefined, { enabled: isAdmin, retry: false });
  const content = contentQuery.data;
  if (loading || (isAdmin && contentQuery.isLoading)) return <div className="flex min-h-screen items-center justify-center bg-[#f4f2ed]"><Loader2 className="h-6 w-6 animate-spin text-orange-600" /></div>;
  if (!user || !isAdmin) return <div className="flex min-h-screen items-center justify-center bg-[#f4f2ed] p-6"><Card className="max-w-md border-[#dedbd0] bg-[#fbfaf6]"><CardContent className="p-8 text-center"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange-600">CUBE RRY / ADMIN</p><h1 className="mt-4 text-2xl font-semibold text-[#161616]">Admin access required</h1><p className="mt-2 text-sm leading-6 text-[#77766f]">Owner 계정으로 로그인하거나 관리자 권한을 부여받은 계정으로 접속해 주세요.</p><a href={siteRoot} className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.1em] text-orange-600">Back to site →</a></CardContent></Card></div>;
  const go = (path: string) => setLocation(path);
  const normalized = location === "/admin" ? "overview" : location.split("/")[2] || "overview";
  if (summaryQuery.error || contentQuery.error) return <div className="p-8"><p className="text-red-600">관리자 데이터를 불러오지 못했습니다. 권한과 DB 연결을 확인해 주세요.</p></div>;
  if (normalized === "portfolio") return <PortfolioPage content={content} />;
  if (normalized === "services") return <ServicesPage content={content} />;
  if (normalized === "faqs") return <FaqPage content={content} />;
  if (normalized === "team") return <TeamPage content={content} />;
  if (normalized === "inquiries") return <InquiriesPage content={content} />;
  if (normalized === "settings") return <SettingsPage settings={content?.settings} />;
  return <Overview summary={summaryQuery.data ?? { portfolio: 0, published: 0, inquiries: 0, newInquiries: 0 }} content={content} go={go} />;
}

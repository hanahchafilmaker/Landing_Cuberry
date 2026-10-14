import { LoginScreen, useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { siteRoot } from "@/lib/api";
import { trpc } from "@/lib/trpc";
import {
  CircleHelp,
  ChevronRight,
  ExternalLink,
  Film,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  PanelLeft,
  RefreshCw,
  Settings2,
  Users,
  WalletCards,
} from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "개요", path: "/admin" },
  { icon: Film, label: "포트폴리오", path: "/admin/portfolio" },
  { icon: WalletCards, label: "서비스 · 가격", path: "/admin/services" },
  { icon: CircleHelp, label: "자주 묻는 질문", path: "/admin/faqs" },
  { icon: Users, label: "팀 프로필", path: "/admin/team" },
  { icon: Mail, label: "문의 관리", path: "/admin/inquiries" },
  { icon: Settings2, label: "사이트 설정", path: "/admin/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 268;
const MIN_WIDTH = 232;
const MAX_WIDTH = 380;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
      return Number.isFinite(saved) && saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
    } catch {
      // 비공개 브라우징에서 저장이 막혀도 레이아웃은 그대로 쓸 수 있다.
    }
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <LoginPage />;

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0e0e0e] px-5 py-12 text-[#edeae2] sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full border border-[#2a2a26] opacity-60" />
        <div className="absolute -left-24 -top-24 h-[25rem] w-[25rem] rounded-full border border-[#2a2a26] opacity-60" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#2a2a26] to-transparent" />
      </div>
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <section className="max-w-2xl">
          <a href={siteRoot} className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.08em] text-[#edeae2] transition hover:text-[#f4b400]">
            <span className="flex h-9 w-9 items-center justify-center border border-[#f4b400] font-mono text-sm text-[#f4b400]">C</span>
            <span>CUBE RRY</span>
          </a>
          <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8a867d]">CREATIVE STUDIO / CONTENT DESK</p>
          <h1 className="mt-5 max-w-xl text-[clamp(38px,6vw,68px)] font-semibold leading-[1.05] tracking-[-0.055em]">
            콘텐츠가 모이는 곳<span className="text-[#f4b400]">.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#a9a59b] sm:text-lg">
            포트폴리오와 팀 소개, 상담 문의를 한 화면에서 관리하세요. 저장한 내용은 사이트에 반영됩니다.
          </p>
          <a href={siteRoot} target="_blank" rel="noreferrer" className="mt-9 inline-flex items-center gap-2 border-b border-[#3a3934] pb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#c9c5bb] transition hover:border-[#f4b400] hover:text-[#f4b400]">
            랜딩 화면 보기 <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        <section className="w-full max-w-lg justify-self-center border border-[#2a2a26] bg-[#161614] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)] sm:p-9 lg:justify-self-end">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#f4b400]">OWNER ACCESS / 01</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#edeae2]">관리자 로그인</h2>
          <p className="mt-2 mb-7 text-sm leading-6 text-[#8a867d]">운영자 비밀번호를 입력해 콘텐츠 관리 화면으로 이동합니다.</p>
          <LoginScreen />
        </section>
      </div>
    </div>
  );
}

type DashboardLayoutContentProps = { children: React.ReactNode; setSidebarWidth: (width: number) => void };

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const summaryQuery = trpc.admin.summary.useQuery(undefined, { enabled: user?.role === "admin", retry: false });
  const newInquiries = Number(summaryQuery.data?.newInquiries ?? 0);
  const isMobile = useIsMobile();
  const activeMenuItem = menuItems.find((item) => {
    if (item.path === "/admin") return location === item.path;
    return location === item.path || location.startsWith(item.path + "/");
  }) ?? menuItems[0];

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const nextWidth = event.clientX - sidebarLeft;
      if (nextWidth >= MIN_WIDTH && nextWidth <= MAX_WIDTH) setSidebarWidth(nextWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const refreshContent = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([utils.admin.content.invalidate(), utils.admin.summary.invalidate()]);
      toast.success("최신 콘텐츠를 불러왔습니다.");
    } catch {
      toast.error("새로고침에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-[#2a2a26] bg-[#0a0a09] text-[#edeae2]" disableTransition={isResizing}>
          <SidebarHeader className="h-[88px] justify-center border-b border-[#2a2a26] px-4">
            <div className="flex w-full items-center gap-3 px-1">
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#f4b400]/70 bg-[#f4b400] text-[#140f00] transition hover:bg-[#ffce3a]"
                aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
              >
                <PanelLeft className="h-4 w-4" />
              </button>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[#f4b400]">CUBE RRY</p>
                  <p className="mt-0.5 truncate text-xs text-[#8a867d]">콘텐츠 스튜디오</p>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-5">
            {!isCollapsed && <p className="px-5 pb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-[#8a867d]">WORKSPACE</p>}
            <SidebarMenu aria-label="관리 메뉴" className="gap-1 px-3">
              {menuItems.map((item, index) => {
                const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path + "/"));
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`group/nav h-11 rounded-none border-l-2 px-3 transition ${isActive ? "border-[#f4b400] bg-[#1c1c19] text-[#edeae2]" : "border-transparent text-[#a9a59b] hover:bg-[#161614] hover:text-[#edeae2]"}`}
                    >
                      <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[#f4b400]" : "text-[#8a867d] group-hover/nav:text-[#f4b400]"}`} aria-hidden="true" />
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate text-[13px]">{item.label}</span>
                        {item.path === "/admin/inquiries" && newInquiries > 0 && (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#f4b400] px-1.5 py-0.5 font-mono text-[9px] font-medium leading-none text-[#140f00] group-data-[collapsible=icon]:hidden">
                            {newInquiries > 99 ? "99+" : newInquiries}
                          </span>
                        )}
                        <span className="ml-auto hidden font-mono text-[9px] text-[#5a574f] group-data-[collapsible=icon]:hidden xl:inline">{String(index + 1).padStart(2, "0")}</span>
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-[#2a2a26] p-3">
            {!isCollapsed && (
              <a href={siteRoot} target="_blank" rel="noreferrer" className="mb-3 flex items-center justify-between gap-2 border-b border-[#2a2a26] px-3 py-3 font-mono text-[10px] uppercase tracking-[0.11em] text-[#a9a59b] transition hover:border-[#f4b400] hover:text-[#f4b400]">
                <span className="flex items-center gap-2"><ExternalLink className="h-3.5 w-3.5" />랜딩 화면 보기</span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-sm px-1.5 py-2 text-left transition hover:bg-[#161614] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f4b400] group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 shrink-0 border border-[#3a3934] bg-[#1c1c19]">
                    <AvatarFallback className="bg-[#1c1c19] text-xs font-medium text-[#f4b400]">{user?.name?.charAt(0).toUpperCase() || "A"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium text-[#edeae2]">{user?.name || "Admin"}</p>
                    <p className="mt-0.5 truncate text-[11px] text-[#8a867d]">{user?.email || "owner"}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[#5a574f] group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-[#2a2a26] bg-[#161614] text-[#edeae2]">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-[#e5484d] focus:bg-[#241718] focus:text-[#e5484d]">
                  <LogOut className="mr-2 h-4 w-4" /><span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          aria-hidden="true"
          className={`absolute right-0 top-0 hidden h-full w-1 cursor-col-resize transition-colors hover:bg-[#f4b400]/40 md:block ${isCollapsed ? "md:hidden" : ""}`}
          onMouseDown={() => !isCollapsed && setIsResizing(true)}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="min-w-0 bg-[#0e0e0e]">
        {isMobile ? (
          <div className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-3 border-b border-[#2a2a26] bg-[#0e0e0e]/95 px-4 backdrop-blur">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger aria-label="메뉴 열기" className="h-9 w-9 rounded-sm border border-[#3a3934] text-[#edeae2] hover:bg-[#1c1c19]" />
              <div className="min-w-0">
                <p className="truncate font-mono text-[9px] uppercase tracking-[0.15em] text-[#8a867d]">CUBE RRY / ADMIN</p>
                <p className="truncate text-sm font-medium text-[#edeae2]">{activeMenuItem?.label ?? "관리 메뉴"}</p>
              </div>
            </div>
            <a href={siteRoot} target="_blank" rel="noreferrer" aria-label="랜딩 화면 새 창에서 보기" className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#3a3934] text-[#f4b400] hover:border-[#f4b400]">
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <header className="sticky top-0 z-30 hidden min-h-16 items-center justify-between gap-4 border-b border-[#2a2a26] bg-[#0e0e0e]/95 px-6 backdrop-blur md:flex lg:px-10">
            <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
              <span className="text-[#8a867d]">Content studio</span>
              <ChevronRight className="h-3 w-3 text-[#5a574f]" />
              <span className="truncate text-[#edeae2]">{activeMenuItem?.label ?? "개요"}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden items-center gap-2 text-xs text-[#8a867d] lg:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-[#f4b400]" />저장한 콘텐츠는 랜딩에 반영됩니다</span>
              <Button type="button" variant="ghost" size="sm" onClick={refreshContent} disabled={refreshing} className="h-9 rounded-sm px-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[#a9a59b] hover:bg-[#1c1c19] hover:text-[#edeae2]">
                {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                새로고침
              </Button>
              <a href={siteRoot} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 border border-[#3a3934] px-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[#f4b400] transition hover:border-[#f4b400] hover:bg-[#f4b400] hover:text-[#140f00]">
                랜딩 미리보기 <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </header>
        )}
        <main className="min-h-[calc(100svh-64px)] flex-1">{children}</main>
      </SidebarInset>
    </>
  );
}

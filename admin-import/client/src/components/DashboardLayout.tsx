import { useAuth } from "@/_core/hooks/useAuth";
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
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  CircleHelp,
  ExternalLink,
  Film,
  LayoutDashboard,
  LogOut,
  Mail,
  PanelLeft,
  Settings2,
  WalletCards,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: Film, label: "Portfolio", path: "/admin/portfolio" },
  { icon: WalletCards, label: "Services", path: "/admin/services" },
  { icon: CircleHelp, label: "FAQ", path: "/admin/faqs" },
  { icon: Mail, label: "Inquiries", path: "/admin/inquiries" },
  { icon: Settings2, label: "Site settings", path: "/admin/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 220;
const MAX_WIDTH = 420;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f2ed]">
        <div className="flex w-full max-w-md flex-col items-center gap-8 p-8 text-center">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.35em] text-orange-600">CUBE RRY / ADMIN</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[#161616]">Sign in to continue</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">큐브베리 운영자 계정으로 로그인하면 콘텐츠를 관리할 수 있습니다.</p>
          </div>
          <Button onClick={() => startLogin()} size="lg" className="w-full bg-[#161616] text-white hover:bg-orange-600">Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = { children: React.ReactNode; setSidebarWidth: (width: number) => void };

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => location === item.path) ?? menuItems.find((item) => location.startsWith(item.path + "/"));
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
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

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-[#2b2c27] bg-[#151614] text-[#ecebdd]" disableTransition={isResizing}>
          <SidebarHeader className="h-20 justify-center border-b border-white/10">
            <div className="flex w-full items-center gap-3 px-2">
              <button onClick={toggleSidebar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d8ff57] text-[#151614] transition hover:rotate-[-8deg]" aria-label="Toggle navigation"><PanelLeft className="h-4 w-4" /></button>
              {!isCollapsed && <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#d8ff57]">CUBE RRY</p><p className="truncate text-sm font-semibold text-white">Content OS</p></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="gap-0 py-4">
            {!isCollapsed && <p className="px-5 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Workspace</p>}
            <SidebarMenu className="gap-1 px-3">
              {menuItems.map((item) => {
                const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
                return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={isActive} onClick={() => setLocation(item.path)} tooltip={item.label} className={`h-11 rounded-xl font-mono text-xs uppercase tracking-[0.08em] transition ${isActive ? "bg-[#d8ff57] text-[#151614] hover:bg-[#d8ff57]" : "text-white/55 hover:bg-white/10 hover:text-white"}`}><item.icon className="h-4 w-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-white/10 p-3">
            {!isCollapsed && <a href="/" target="_blank" rel="noreferrer" className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-white/45 transition hover:bg-white/10 hover:text-[#d8ff57]"><ExternalLink className="h-3.5 w-3.5" />View live site</a>}
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d8ff57] group-data-[collapsible=icon]:justify-center"><Avatar className="h-9 w-9 shrink-0 border border-white/20 bg-[#292a25]"><AvatarFallback className="bg-[#292a25] text-xs font-medium text-[#d8ff57]">{user?.name?.charAt(0).toUpperCase() || "A"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-white">{user?.name || "Admin"}</p><p className="mt-1 truncate text-xs text-white/40">{user?.email || "owner"}</p></div></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" /><span>Sign out</span></DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-[#d8ff57]/40 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} style={{ zIndex: 50 }} />
      </div>
      <SidebarInset className="bg-[#f4f2ed]">
        {isMobile && <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-[#dedbd0] bg-[#f4f2ed]/95 px-3 backdrop-blur"><SidebarTrigger className="h-9 w-9 rounded-lg" /><span className="font-mono text-xs uppercase tracking-[0.16em] text-[#76756e]">{activeMenuItem?.label ?? "Menu"}</span></div>}
        <main className="min-h-screen flex-1">{children}</main>
      </SidebarInset>
    </>
  );
}

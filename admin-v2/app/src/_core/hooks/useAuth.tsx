// Manus OAuth 대신 기존 서버의 비밀번호 로그인(/api/auth/login, 클래식 어드민과 세션 공유)을 쓴다.
import { apiOrigin, tokenStore } from "@/lib/api";
import { trpc } from "@/lib/trpc";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function useAuth() {
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.auth.me.invalidate();
    },
  });

  const logout = useCallback(async () => {
    tokenStore.remove();
    try {
      await logoutMutation.mutateAsync();
    } catch {
      /* 서버 세션 정리 실패는 무시 — 로컬 토큰은 이미 버렸다 */
    }
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [logoutMutation, utils]);

  const state = useMemo(
    () => ({
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    }),
    [meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.error, logoutMutation.isPending],
  );

  return { ...state, refresh: () => meQuery.refetch(), logout };
}

/** 비밀번호 로그인 카드. 대시보드 레이아웃의 로그인 분기에서 렌더한다. */
export function LoginScreen() {
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: async (result) => {
      toast.success("로그인했습니다.");
      if ((result as { initialPasswordInUse?: boolean }).initialPasswordInUse) {
        toast.message("초기 관리자 비밀번호를 사용 중입니다. 보안을 위해 사이트 설정에서 변경해 주세요.");
      }
      await Promise.all([utils.auth.me.invalidate(), utils.admin.content.invalidate(), utils.admin.summary.invalidate()]);
    },
    onError: (error) => {
      const status = (error as { status?: number }).status;
      toast.error(status === 0 ? (error as Error).message : String((error as Error).message || "로그인에 실패했습니다."));
    },
  });
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ password });
  };
  return (
    <form onSubmit={submit} className="w-full space-y-5 text-left">
      <div className="space-y-2">
        <label htmlFor="admin-password" className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#a9a59b]">
          관리자 비밀번호
        </label>
        <div className="flex gap-2">
          <Input
            id="admin-password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호를 입력하세요"
            className="h-12 rounded-sm border-[#3a3934] bg-[#0e0e0e] px-4 text-base text-[#edeae2] placeholder:text-[#5a574f] focus-visible:border-[#f4b400] focus-visible:ring-[#f4b400]/30"
            required
          />
          <Button
            type="button"
            variant="outline"
            aria-label={show ? "비밀번호 숨기기" : "비밀번호 표시"}
            onClick={() => setShow((value) => !value)}
            className="h-12 w-12 shrink-0 rounded-sm border-[#3a3934] bg-transparent px-0 text-[#a9a59b] hover:border-[#f4b400] hover:bg-[#1c1c19] hover:text-[#f4b400]"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <Button type="submit" size="lg" disabled={login.isPending} className="h-12 w-full rounded-sm bg-[#f4b400] font-semibold text-[#140f00] hover:bg-[#ffce3a]">
        {login.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {login.isPending ? "확인 중…" : "로그인"}
      </Button>
      <p className="text-center text-xs leading-6 text-[#8a867d]">
        비밀번호는 암호화된 세션으로 확인됩니다. 접근이 계속 실패하면 관리자에게 문의하세요.
        {apiOrigin && (
          <>
            <br />
            <span className="font-mono text-[10px]">API · {apiOrigin}</span>
          </>
        )}
      </p>
    </form>
  );
}

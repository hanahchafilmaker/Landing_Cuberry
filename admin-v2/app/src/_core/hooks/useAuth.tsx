// Manus OAuth 대신 기존 서버의 비밀번호 로그인(/api/auth/login, 클래식 어드민과 세션 공유)을 쓴다.
import { apiOrigin, tokenStore } from "@/lib/api";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
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

/** 비밀번호 로그인 카드. 대시보드 레이아웃의 "Sign in" 분기에서 렌더한다. */
export function LoginScreen() {
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({
    onSuccess: async (result) => {
      toast.success("로그인했습니다.");
      if ((result as { initialPasswordInUse?: boolean }).initialPasswordInUse) {
        toast.message("초기 비밀번호(cuberry2026)를 사용 중입니다. Settings 에서 바꿔 주세요.");
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
    <form onSubmit={submit} className="w-full space-y-4 text-left">
      <div className="space-y-2">
        <label htmlFor="admin-password" className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#77766f]">
          Password
        </label>
        <div className="flex gap-2">
          <Input
            id="admin-password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="관리자 비밀번호"
            required
          />
          <Button type="button" variant="outline" className="shrink-0" onClick={() => setShow((v) => !v)}>
            {show ? "숨기기" : "표시"}
          </Button>
        </div>
      </div>
      <Button type="submit" size="lg" disabled={login.isPending} className="w-full bg-[#161616] text-white hover:bg-orange-600">
        {login.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in
      </Button>
      <p className="text-center text-xs leading-6 text-slate-500">
        초기 비밀번호 <code className="rounded bg-[#efece4] px-1.5 py-0.5 font-mono">cuberry2026</code>
        {apiOrigin ? (
          <>
            <br />
            API 서버: <code className="rounded bg-[#efece4] px-1.5 py-0.5 font-mono">{apiOrigin}</code>
          </>
        ) : (
          <br />
        )}
      </p>
    </form>
  );
}

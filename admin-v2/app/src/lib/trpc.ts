// 임포트 어드민(admin-import)의 tRPC 호출 표면을 기존 REST API(react-query)로 흉낸다.
// 페이지 코드가 trpc.admin.portfolio.upsert.useMutation(...) 처럼 쓰는 모양을 유지한다.
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { del, get, patch, post, put, tokenStore, type AdminContent } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 5_000 },
  },
});

const K = {
  me: ["auth", "me"] as const,
  content: ["admin", "content"] as const,
  summary: ["admin", "summary"] as const,
  landing: ["landing", "content"] as const,
};

type Options = {
  enabled?: boolean;
  retry?: boolean | number;
  refetchOnWindowFocus?: boolean;
  onSuccess?: (data: any) => void | Promise<void>;
  onError?: (error: any) => void;
};

type UpsertVars = Record<string, unknown> & { id?: number };

function upsertFn(base: string) {
  return (vars: UpsertVars) => (vars.id ? put(`${base}/${vars.id}`, vars) : post(base, vars));
}
function deleteFn(base: string) {
  return (vars: { id: number }) => del(`${base}/${vars.id}`);
}

function makeEntity(base: string) {
  return {
    upsert: { useMutation: (o?: Options) => useMutation({ mutationFn: upsertFn(base), ...o }) },
    delete: { useMutation: (o?: Options) => useMutation({ mutationFn: deleteFn(base), ...o }) },
  };
}

export const trpc = {
  auth: {
    me: {
      useQuery: (_input?: undefined, o?: Options) =>
        useQuery({
          queryKey: K.me,
          retry: o?.retry ?? false,
          refetchOnWindowFocus: o?.refetchOnWindowFocus ?? false,
          queryFn: async () => {
            // 토큰 자체가 없으면 서버 왕복 없이 로그아웃 상태.
            if (!tokenStore.get()) return null;
            try {
              return await get<{ id: number; name: string; email: string | null; role: string }>("/api/auth/me");
            } catch (error) {
              if ((error as { status?: number }).status === 401) return null;
              throw error;
            }
          },
        }),
    },
    login: {
      useMutation: (o?: Options) =>
        useMutation({
          mutationFn: async (vars: { password: string }) => {
            const result = await post<{ token: string; initialPasswordInUse?: boolean }>("/api/auth/login", vars);
            tokenStore.set(result.token);
            return result;
          },
          ...o,
        }),
    },
    logout: {
      useMutation: (o?: Options) =>
        useMutation({
          mutationFn: async () => {
            try {
              await post("/api/auth/logout", {});
            } finally {
              tokenStore.remove();
            }
            return { success: true } as const;
          },
          ...o,
        }),
    },
    password: {
      useMutation: (o?: Options) =>
        useMutation({
          mutationFn: (vars: { currentPassword: string; nextPassword: string }) =>
            post("/api/auth/password", vars),
          ...o,
        }),
    },
  },
  landing: {
    content: {
      useQuery: (_input?: undefined, o?: Options) =>
        useQuery({ queryKey: K.landing, retry: o?.retry, enabled: o?.enabled, queryFn: () => get("/api/public/content") }),
    },
  },
  admin: {
    content: {
      useQuery: (_input?: undefined, o?: Options) =>
        useQuery<AdminContent>({ queryKey: K.content, retry: o?.retry, enabled: o?.enabled, queryFn: () => get<AdminContent>("/api/admin/content") }),
    },
    summary: {
      useQuery: (_input?: undefined, o?: Options) =>
        useQuery<{ portfolio: number; published: number; services: number; faqs: number; team: number; inquiries: number; newInquiries: number }>({
          queryKey: K.summary,
          retry: o?.retry,
          enabled: o?.enabled,
          queryFn: () => get("/api/admin/summary"),
        }),
    },
    settings: {
      update: {
        useMutation: (o?: Options) => useMutation({ mutationFn: (vars: Record<string, unknown>) => put("/api/admin/settings", vars), ...o }),
      },
    },
    portfolio: makeEntity("/api/admin/portfolio"),
    services: makeEntity("/api/admin/services"),
    faqs: makeEntity("/api/admin/faqs"),
    team: makeEntity("/api/admin/team"),
    inquiries: {
      updateStatus: {
        useMutation: (o?: Options) =>
          useMutation({
            mutationFn: (vars: { id: number; status: "new" | "contacted" | "closed" }) =>
              patch(`/api/admin/inquiries/${vars.id}`, { status: vars.status }),
            ...o,
          }),
      },
    },
    exportSeed: {
      useQuery: (_input?: undefined, o?: Options) =>
        useQuery({ queryKey: ["admin", "export"], retry: o?.retry, enabled: o?.enabled, queryFn: () => get("/api/admin/export") }),
    },
  },
  useUtils() {
    const qc = useQueryClient();
    const wrap = (key: readonly unknown[]) => ({
      invalidate: () => qc.invalidateQueries({ queryKey: [...key] }),
      setData: (_updater: unknown, value: unknown) => qc.setQueryData([...key], value),
    });
    return {
      auth: { me: wrap(K.me) },
      admin: { content: wrap(K.content), summary: wrap(K.summary) },
      landing: { content: wrap(K.landing) },
    };
  },
};

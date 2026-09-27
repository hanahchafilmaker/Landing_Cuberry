import { createContext, useContext, useEffect, useState } from "react";
import { CMS_EVENT, type CmsContent } from "./api";
import { defaultContent, mapCmsContent, type SiteContent } from "./map";

const ContentContext = createContext<SiteContent>(defaultContent);

/**
 * cms-bridge.js 가 읽어온 어드민 콘텐츠를 구독한다.
 * - 브리지가 React 보다 먼저 응답을 받았으면 window.CuberryContent 에 이미 들어 있다.
 * - 이후 갱신(어드민 탭에서 저장 → 랜딩 탭 복귀)은 "cuberry:content" 이벤트로 온다.
 */
export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(() =>
    typeof window !== "undefined" && window.CuberryContent ? mapCmsContent(window.CuberryContent) : defaultContent,
  );

  useEffect(() => {
    const onContent = (event: Event) => {
      const data = (event as CustomEvent<CmsContent>).detail ?? window.CuberryContent;
      if (data) setContent(mapCmsContent(data));
    };
    window.addEventListener(CMS_EVENT, onContent);
    // 마운트 사이에 도착한 응답을 놓치지 않는다.
    if (window.CuberryContent) setContent(mapCmsContent(window.CuberryContent));
    return () => window.removeEventListener(CMS_EVENT, onContent);
  }, []);

  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent() {
  return useContext(ContentContext);
}

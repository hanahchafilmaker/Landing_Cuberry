import { useEffect } from "react";

/**
 * 위에 고정된 두 겹(헤더 + 콘텐츠 탭 바)의 실제 높이를 재어 CSS 변수로 알려준다.
 *
 *   --header-height 고정 헤더의 높이 (본문이 헤더에 가리지 않게 main 의 위쪽 여백으로 쓴다)
 *   --tab-top       탭 바가 헤더 바로 아래에 붙는 위치
 *   --anchor-offset 해시로 이동한 섹션이 두 겹에 가리지 않게 하는 scroll-margin
 *
 * 헤더는 좁은 화면에서 줄바꿈되어 높이가 달라지므로, 숫자를 코드에 박지 않고
 * 화면에서 잰 값을 쓴다(측정 전에는 CSS 기본값이 쓰인다).
 */
export function useStickyOffset() {
  useEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector("header");
    const bar = document.querySelector<HTMLElement>("[data-tabbar]");

    const measure = () => {
      const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;
      const barHeight = bar instanceof HTMLElement ? bar.offsetHeight : 0;
      if (headerHeight > 0) {
        root.style.setProperty("--header-height", `${headerHeight}px`);
        root.style.setProperty("--tab-top", `${headerHeight}px`);
      }
      const offset = headerHeight + barHeight;
      if (offset > 0) root.style.setProperty("--anchor-offset", `${Math.round(offset + 16)}px`);
    };

    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    for (const element of [header, bar]) {
      if (observer && element instanceof HTMLElement) observer.observe(element);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
}

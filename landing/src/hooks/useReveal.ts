import { useEffect, useState } from "react";

/**
 * 화면에 들어오는 reveal 요소만 관찰합니다.
 * 동적으로 추가된 DOM도 전체 페이지를 다시 검색하지 않고 새 하위 트리만 등록합니다.
 */
export function useReveal() {
  useEffect(() => {
    const revealElements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (typeof IntersectionObserver === "undefined") {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -36px 0px" },
    );

    const observeTree = (root: Element) => {
      if (root.matches("[data-reveal]:not(.is-visible)")) observer.observe(root);
      root.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)").forEach((element) => {
        observer.observe(element);
      });
    };

    observeTree(document.body);

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) observeTree(node as Element);
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);
}

/** 스크롤 임계값을 넘었을 때만 상태를 갱신합니다. */
export function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let current = window.scrollY > threshold;
    setScrolled(current);

    const onScroll = () => {
      const next = window.scrollY > threshold;
      if (next === current) return;
      current = next;
      setScrolled(next);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

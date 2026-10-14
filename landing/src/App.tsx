import { useReveal } from "./hooks/useReveal";
import { useStickyOffset } from "./hooks/useStickyOffset";
import { useI18n } from "./i18n/LanguageContext";
import { TABS } from "./tabs/config";
import { TabsProvider, useTabs } from "./tabs/TabContext";
import { Nav } from "./components/Nav";
import { TabBar } from "./components/TabBar";
import { TabPanel } from "./components/TabPanel";
import { Hero } from "./components/Hero";
import { Stats } from "./components/Stats";
import { Sectors } from "./components/Sectors";
import { WhatWeDo } from "./components/WhatWeDo";
import { Founder } from "./components/Founder";
import { History } from "./components/History";
import { Patents } from "./components/Patents";
import { AILab } from "./components/AILab";
import { Portfolio } from "./components/Portfolio";
import { Team } from "./components/Team";
import { Pricing } from "./components/Pricing";
import { Process } from "./components/Process";
import { Faq } from "./components/Faq";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";

/**
 * FLEXBOARD Design v2 · E안 의 내용 순서를 그대로 두고, 네 개 탭으로 나눠 담는다.
 *
 *   회사소개 · 히어로 → 숫자 → 두 섹터 → 하는 일 → 대표 → 연혁 → 특허
 *   스튜디오 · 작품 → 팀 → 제작 구조
 *   엑스콘다 · XCONDA → 상품
 *   문의     · FAQ → 문의 폼
 *
 * 탭 구성은 landing/src/tabs/config.ts 한 곳에서 관리하고,
 * 상단 메뉴·주소 해시(#works 등)·본문 앵커가 모두 같은 정의를 따라간다.
 */
export default function App() {
  return (
    <TabsProvider>
      <Landing />
    </TabsProvider>
  );
}

function Landing() {
  useReveal();
  useStickyOffset();
  const { t } = useI18n();
  const { active } = useTabs();

  return (
    <div className="min-h-screen bg-ink">
      <a href="#main-content" className="skip-link">
        {t("본문으로 바로가기")}
      </a>
      <Nav />
      <main id="main-content">
        <TabBar />

        <TabPanel tab={TABS[0]}>
          <Hero />
          <Stats />
          <Sectors />
          <WhatWeDo />
          <Founder />
          <History />
          <Patents />
        </TabPanel>

        <TabPanel tab={TABS[1]}>
          <Portfolio />
          <Team />
          <Process />
        </TabPanel>

        <TabPanel tab={TABS[2]}>
          <AILab />
          <Pricing />
        </TabPanel>

        <TabPanel tab={TABS[3]}>
          <Faq />
          <Contact />
        </TabPanel>
      </main>
      <Footer />
      <p className="sr-only" aria-live="polite">
        {t("현재 탭: {tab}", { tab: t(TABS.find((tab) => tab.id === active)?.label ?? "") })}
      </p>
    </div>
  );
}

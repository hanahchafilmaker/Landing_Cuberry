import { useReveal } from "./hooks/useReveal";
import { Nav } from "./components/Nav";
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
 * FLEXBOARD Design v2 · E안 순서 그대로 —
 * 히어로 → 숫자 → 두 섹터 → 하는 일 → 대표 → 연혁 → 특허 → XCONDA → 작품 → 팀 → 상품 → 프로세스 → FAQ → 문의.
 */
export default function App() {
  useReveal();

  return (
    <div className="min-h-screen bg-ink">
      <a href="#main-content" className="skip-link">
        본문으로 바로가기
      </a>
      <Nav />
      <main id="main-content">
        <Hero />
        <Stats />
        <Sectors />
        <WhatWeDo />
        <Founder />
        <History />
        <Patents />
        <AILab />
        <Portfolio />
        <Team />
        <Pricing />
        <Process />
        <Faq />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

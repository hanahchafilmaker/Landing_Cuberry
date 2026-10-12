import { useReveal } from "./hooks/useReveal";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Marquee } from "./components/Marquee";
import { Why } from "./components/Why";
import { WhatWeDo } from "./components/WhatWeDo";
import { Strengths } from "./components/Strengths";
import { AILab } from "./components/AILab";
import { Portfolio } from "./components/Portfolio";
import { Team } from "./components/Team";
import { Pricing } from "./components/Pricing";
import { Process } from "./components/Process";
import { Faq } from "./components/Faq";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";

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
        <Marquee />
        <Why />
        <WhatWeDo />
        <Strengths />
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

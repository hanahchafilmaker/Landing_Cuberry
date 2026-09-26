(() => {
  // ── API 서버 주소(Origin) 결정 ─────────────────────────────────────────
  // GitHub Pages 처럼 정적 호스팅에 올린 랜딩 페이지는 같은 주소에 API 가 없다.
  // 그래서 운영 Node 서버 주소를 아래 BAKED_API_ORIGIN 에 커밋해 두면 방문자가 아무것도
  // 입력하지 않아도 그 서버의 콘텐츠를 읽어온다. 어드민 로그인 화면의 "API 서버 주소"에서
  // 저장한 값(localStorage)이 있으면 그쪽이 우선한다(둘은 같은 키를 공유한다).
  // 서버 쪽에서는 이 페이지의 Origin 을 기본 허용 목록에 넣어 두었다(server/index.mjs 의
  // DEFAULT_ALLOWED_ORIGINS). 다른 사이트를 추가로 허용하려면 ADMIN_ALLOWED_ORIGINS 를 쓴다.
  //
  // 이 Node 서버가 화면을 직접 서빙할 때는 서버가 이 값을 "" 로 바꿔 보내므로 항상 같은 서버를 쓴다.
  // 아래 로컬 가드는 파일을 바로 열거나 다른 정적 서버로 띄웠을 때의 안전장치다.
  const BAKED_API_ORIGIN = "https://landing-cuberry-admin.onrender.com"; // 운영 Node 서버
  const API_ORIGIN_KEY = "cuberry.apiOrigin";
  // 로컬 개발 가드 — localhost 에서 굽힌/저장된 운영 주소를 그대로 쓰면
  // 로컬 서버를 띄워 놓고 하는 편집이 운영 데이터베이스에 반영된다. 그걸 막는다.
  const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  const isLocalHost = () => LOCAL_HOSTNAMES.has(String(location.hostname || ""));

  const normalizeApiOrigin = (value) => {
    let next = String(value ?? "").trim();
    if (!next) return "";
    if (/^(same|clear|reset)$/i.test(next)) return "";
    if (!/^https?:\/\//i.test(next)) next = `https://${next}`;
    try {
      const parsed = new URL(next);
      return /^https?:$/.test(parsed.protocol) ? parsed.origin : null;
    } catch {
      return null;
    }
  };

  const resolveApiOrigin = () => {
    // 주소창의 ?api= 는 이번 방문에만 적용하고 저장하지 않는다(잘못된 링크가 사이트를 망가뜨리지 않게).
    const fromQuery = normalizeApiOrigin(new URLSearchParams(location.search).get("api"));
    if (fromQuery) return fromQuery;
    // 로컬 개발에서는 굽힌/저장된 주소를 무시하고 항상 이 서버를 쓴다. 전환은 ?api= 로만.
    if (isLocalHost()) return "";
    let saved = "";
    try { saved = window.localStorage.getItem(API_ORIGIN_KEY) || ""; } catch { saved = ""; }
    return normalizeApiOrigin(saved) || normalizeApiOrigin(BAKED_API_ORIGIN) || "";
  };

  const apiOrigin = resolveApiOrigin();
  const isSameOrigin = () => !apiOrigin || apiOrigin === location.origin;
  const apiUrl = (path) => (isSameOrigin() ? path : `${apiOrigin}${path}`);
  // "/uploads/a.jpg" 처럼 루트 상대경로인 콘텐츠는 원격 서버 주소를 붙여야 정적 호스트에서도 보인다.
  const assetUrl = (value) => {
    const text = String(value ?? "");
    if (!text) return text;
    if (/^(https?:|data:|blob:|\/\/|#|mailto:|tel:)/i.test(text)) return text;
    if (!text.startsWith("/")) return text; // "portfolio_thumbs/a.jpg" 같은 상대경로는 그대로 둔다
    return isSameOrigin() ? text : `${apiOrigin}${text}`;
  };

  // index.html 의 다른 인라인 스크립트(B2B 문의 폼 등)도 같은 서버 주소를 쓸 수 있도록 공개한다.
  window.CuberryApi = { origin: apiOrigin, isSameOrigin, url: apiUrl, assetUrl };

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));

  const compact = (value) => String(value || "").replace(/[^A-Za-z0-9가-힣]/g, "").toUpperCase();

  const setText = (node, value) => {
    if (node && value != null) node.textContent = value;
  };

  const applyHero = (settings) => {
    const eyebrow = document.querySelector('[data-cms="hero-eyebrow"]');
    if (eyebrow && settings.heroEyebrow && eyebrow.textContent.trim() !== settings.heroEyebrow) {
      eyebrow.textContent = settings.heroEyebrow;
    }
    const title = document.querySelector('[data-cms="hero-title"]');
    if (title && settings.heroTitle && compact(settings.heroTitle) !== "MAKEITMOVE" && compact(title.textContent) !== compact(settings.heroTitle)) {
      title.textContent = settings.heroTitle;
    }
    const copy = document.querySelector('[data-cms="hero-copy"]');
    if (!copy || !settings.heroSubtitle) return;
    const current = copy.textContent.replace(/\s+/g, " ").trim();
    const next = settings.heroSubtitle.replace(/\s+/g, " ").trim();
    if (!next || current.includes(next.slice(0, 24))) return;
    copy.replaceChildren();
    const [lead, ...rest] = next.split(/(?<=\.)\s+/);
    const strong = document.createElement("strong");
    strong.textContent = lead;
    copy.append(strong, document.createElement("br"), document.createTextNode(rest.join(" ")));
  };

  const applyContact = (settings) => {
    if (settings.contactEmail) {
      document.querySelectorAll('[data-cms="email"]').forEach((link) => {
        link.href = `mailto:${settings.contactEmail}`;
        link.textContent = `${settings.contactEmail} ↗`;
      });
    }
    if (settings.contactPhone) {
      const digits = settings.contactPhone.replace(/[^\d+]/g, "");
      document.querySelectorAll('[data-cms="phone"]').forEach((link) => {
        link.href = `tel:${digits}`;
        link.textContent = `${settings.contactPhone} ↗`;
      });
    }
  };

  const applyServices = (services) => {
    services.forEach((service) => {
      if (!service.landingSlot) return;
      document.querySelectorAll(`[data-cms-slot="${service.landingSlot}"]`).forEach((node) => {
        node.hidden = !service.isPublished;
        if (node.classList.contains("package")) {
          setText(node.querySelector("h3"), service.name);
          setText(node.querySelector(".price"), service.price);
          const copy = node.querySelector("p");
          if (copy) {
            copy.replaceChildren(document.createTextNode(service.duration), document.createElement("br"), document.createTextNode(service.description));
          }
        }
        if (node.classList.contains("quick-plan")) {
          const span = node.querySelector("span");
          const lead = String(service.duration || "").split("·")[0].trim();
          if (span) span.textContent = lead ? `${service.price} · ${lead}` : service.price;
        }
      });
    });
    const grid = document.querySelector(".packages");
    services.filter((service) => service.isPublished && !service.landingSlot).forEach((service) => {
      if (!grid || grid.querySelector(`[data-cms-id="service-${service.id}"]`)) return;
      const card = document.createElement("article");
      card.className = "package";
      card.dataset.cmsId = `service-${service.id}`;
      card.innerHTML = `<small>${esc(service.slug)}</small><h3></h3><div class="price"></div><p></p>`;
      setText(card.querySelector("h3"), service.name);
      setText(card.querySelector(".price"), service.price);
      const copy = card.querySelector("p");
      copy.replaceChildren(document.createTextNode(service.duration), document.createElement("br"), document.createTextNode(service.description));
      grid.append(card);
    });
  };

  const applyFaqs = (faqs) => {
    const list = document.querySelector(".faq-list");
    if (!list) return;
    const seen = new Set();
    faqs.forEach((faq) => {
      let item = faq.landingSlot ? list.querySelector(`[data-cms-slot="${faq.landingSlot}"]`) : list.querySelector(`[data-cms-id="faq-${faq.id}"]`);
      if (!item) {
        item = document.createElement("div");
        item.className = "faq-item";
        item.dataset.cmsId = `faq-${faq.id}`;
        item.innerHTML = '<button class="faq-button" type="button"><span class="faq-q"></span><span>+</span></button><div class="faq-answer"><p></p></div>';
        item.querySelector(".faq-button").addEventListener("click", () => item.classList.toggle("open"));
        list.append(item);
      }
      seen.add(item);
      item.hidden = !faq.isPublished;
      const button = item.querySelector(".faq-button");
      const label = button.querySelector(".faq-q") || button.childNodes[0];
      if (label && label.nodeType === Node.TEXT_NODE) label.textContent = faq.question;
      else if (label) label.textContent = faq.question;
      else button.insertBefore(document.createTextNode(faq.question), button.firstChild);
      setText(item.querySelector(".faq-answer p"), faq.answer);
    });
    list.querySelectorAll("[data-cms-slot]").forEach((item) => {
      if (!seen.has(item)) item.hidden = true;
    });
  };

  const fillWork = (card, item) => {
    card.hidden = false;
    card.dataset.kind = item.kind || card.dataset.kind || "광고";
    const tops = card.querySelectorAll(".work-top span");
    if (tops[0]) tops[0].textContent = item.category;
    if (tops[1]) tops[1].textContent = item.year;
    setText(card.querySelector("h3"), item.title);
    setText(card.querySelector(".work-description"), item.description);
    const tag = card.querySelector(".work-bottom span");
    if (tag) tag.textContent = String(item.tags || "").replace(/,\s*/g, " · ");
    const image = card.querySelector("img");
    if (image && item.thumbnailUrl) {
      image.src = assetUrl(item.thumbnailUrl);
      image.alt = `${item.title} 썸네일`;
    }
    const source = card.querySelector("video source");
    if (source && item.videoUrl && !item.videoUrl.includes("drive.google.com")) source.src = assetUrl(item.videoUrl);
  };

  const fillDrive = (card, item) => {
    card.hidden = false;
    setText(card.querySelector("h3"), item.title);
    setText(card.querySelector(".drive-video-meta p"), item.description);
    const link = card.querySelector(".drive-video-meta a");
    if (link && item.videoUrl) {
      link.href = assetUrl(item.videoUrl);
      link.setAttribute("aria-label", `${item.title} 새 창에서 보기`);
    }
    const button = card.querySelector(".drive-load");
    if (button) button.setAttribute("aria-label", `${item.title} 영상 재생`);
    const driveId = String(item.videoUrl || "").match(/\/file\/d\/([^/]+)/);
    if (button && driveId) {
      button.dataset.driveId = driveId[1];
      const image = button.querySelector("img");
      if (image) image.src = assetUrl(item.thumbnailUrl) || `https://drive.google.com/thumbnail?id=${driveId[1]}&sz=w1000`;
    }
  };

  const extraCard = (item) => {
    const card = document.createElement("article");
    card.className = "work work-rich";
    card.dataset.cmsId = `portfolio-${item.id}`;
    card.dataset.kind = item.kind || "광고";
    const media = item.thumbnailUrl
      ? `<div class="work-thumb"><img alt="" loading="lazy"></div>`
      : `<div class="work-thumb" style="min-height:180px;background:#171815"></div>`;
    card.innerHTML = `${media}<div class="work-top"><span></span><span></span></div><h3></h3><p class="work-description"></p><div class="work-bottom"><span></span><span>↗</span></div>`;
    fillWork(card, item);
    if (!item.videoUrl) return card;
    const link = document.createElement("a");
    link.href = assetUrl(item.videoUrl);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.append(...card.childNodes);
    card.append(link);
    return card;
  };

  const applyPortfolio = (items) => {
    const slots = new Set(items.map((item) => item.landingSlot).filter(Boolean));
    document.querySelectorAll("[data-cms-slot^='work-'], [data-cms-slot^='drive-']").forEach((card) => {
      card.hidden = !slots.has(card.dataset.cmsSlot);
    });
    const extra = document.querySelector("#cms-extra-works");
    if (extra) extra.replaceChildren();
    let extras = 0;
    items.forEach((item) => {
      const card = item.landingSlot ? document.querySelector(`[data-cms-slot="${item.landingSlot}"]`) : null;
      if (card && card.classList.contains("drive-video-card")) {
        fillDrive(card, item);
        return;
      }
      if (card) {
        fillWork(card, item);
        return;
      }
      if (extra) {
        extra.append(extraCard(item));
        extras += 1;
      }
    });
    if (extra) extra.hidden = extras === 0;
  };

  // 팀 프로필: "[텍스트](https://...)" 줄은 링크로, 나머지는 일반 텍스트로 렌더링한다.
  const bioItem = (line) => {
    const li = document.createElement("li");
    const link = line.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) {
      const a = document.createElement("a");
      a.href = link[2];
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = link[1];
      li.append(a);
    } else {
      li.textContent = line;
    }
    return li;
  };

  const fillPerson = (card, person) => {
    card.hidden = false;
    let portrait = card.querySelector(".portrait");
    if (!portrait) {
      portrait = document.createElement("div");
      portrait.className = "portrait";
      card.prepend(portrait);
    }
    let image = portrait.querySelector("img");
    if (person.photoUrl) {
      if (!image) {
        image = document.createElement("img");
        image.loading = "lazy";
        portrait.append(image);
      }
      if (image.getAttribute("src") !== assetUrl(person.photoUrl)) image.src = assetUrl(person.photoUrl);
      image.alt = `${person.name} 프로필 사진`;
      image.style.objectPosition = `center ${Number(person.photoPosition) || 0}%`;
    } else if (image) {
      image.remove();
    }
    let title = card.querySelector("h3");
    if (!title) {
      title = document.createElement("h3");
      portrait.after(title);
    }
    title.textContent = person.name;
    let role = card.querySelector(".role");
    if (!role) {
      role = document.createElement("div");
      role.className = "role";
      title.after(role);
    }
    role.textContent = person.role || "";
    role.hidden = !person.role;
    let list = card.querySelector("ul");
    if (!list) {
      list = document.createElement("ul");
      role.after(list);
    }
    const lines = String(person.bio || "").split(/\n/).map((line) => line.trim()).filter(Boolean);
    list.replaceChildren(...lines.map(bioItem));
    list.hidden = lines.length === 0;
  };

  const applyTeam = (team) => {
    const grid = document.querySelector('[data-cms="team-grid"]');
    if (!grid || !Array.isArray(team)) return;
    const slotCards = new Map([...grid.querySelectorAll("[data-cms-slot^='team-']")].map((card) => [card.dataset.cmsSlot, card]));
    grid.querySelectorAll("[data-cms-id^='team-']").forEach((card) => card.remove());
    const used = new Set();
    // 관리자에서 정한 정렬 순서대로 카드를 다시 배치한다.
    team.forEach((person) => {
      let card = person.landingSlot ? slotCards.get(person.landingSlot) : null;
      if (!card) {
        card = document.createElement("article");
        card.className = "person";
        card.dataset.cmsId = `team-${person.id}`;
        card.innerHTML = '<div class="portrait"></div><h3></h3><div class="role"></div><ul></ul>';
      }
      used.add(card);
      fillPerson(card, person);
      grid.append(card);
    });
    slotCards.forEach((card) => {
      if (!used.has(card)) card.hidden = true;
    });
  };

  // ── React + Tailwind 랜딩 어댑터 ────────────────────────────────────────
  // 2026-09-26 랜딩 리빌드 뒤에는 예전 data-cms-* 훅이 사라졌다. API 저장은
  // 정상이어도 위 함수들이 찾을 DOM이 없어서, 방문자에게는 "저장이 안 된 것"처럼
  // 보였다. 빌드 소스가 이 저장소에 없으므로 현재 산출물의 섹션을 안전하게 복제해
  // CMS 전용 뷰로 바꾼다. 복제본은 React가 관리하지 않기 때문에 문의 폼 입력이나
  // FAQ 상태 변경으로 React가 다시 렌더되어도 관리자 콘텐츠가 원복되지 않는다.
  const isModernLanding = () => Boolean(document.querySelector("#root #top"));

  function cloneModernSection(source, key) {
    const existing = document.querySelector(`[data-cms-modern="${key}"]`);
    if (existing) return existing;
    if (!source) return null;
    const clone = source.cloneNode(true);
    source.dataset.cmsOriginal = key;
    source.hidden = true;
    source.setAttribute("aria-hidden", "true");
    source.removeAttribute("id");
    if ("inert" in source) source.inert = true;
    clone.dataset.cmsModern = key;
    source.after(clone);
    return clone;
  }

  function modernSection(selector, key) {
    return document.querySelector(`[data-cms-modern="${key}"]`)
      || cloneModernSection(document.querySelector(selector), key);
  }

  function modernPackagesSection() {
    const existing = document.querySelector('[data-cms-modern="packages"]');
    if (existing) return existing;
    const source = [...document.querySelectorAll("main > section")].find((section) =>
      section.querySelector("h2")?.textContent.includes("어떤 영상부터 시작할까요?"));
    return cloneModernSection(source, "packages");
  }

  function replaceHeroCopy(copy, value) {
    const next = String(value || "").trim();
    if (!copy || !next || copy.textContent.replace(/\s+/g, " ").trim() === next.replace(/\s+/g, " ").trim()) return;
    const [lead, ...rest] = next.split(/(?<=\.)\s+/);
    const strong = document.createElement("strong");
    strong.className = "text-[#f4f1ea]";
    strong.textContent = lead;
    copy.replaceChildren(strong);
    if (rest.length) copy.append(document.createElement("br"), document.createTextNode(` ${rest.join(" ")}`));
  }

  function applyModernHero(settings) {
    const section = modernSection("#top", "hero");
    if (!section) return;
    section.id = "top";
    const lead = section.firstElementChild;
    const paragraphs = lead ? [...lead.children].filter((node) => node.tagName === "P") : [];
    setText(paragraphs[0], settings.heroEyebrow);
    const title = lead?.querySelector("h1");
    if (title && settings.heroTitle && compact(title.textContent) !== compact(settings.heroTitle)) title.textContent = settings.heroTitle;
    replaceHeroCopy(paragraphs[1], settings.heroSubtitle);

    if (settings.brandName) {
      const logo = document.querySelector('header a[href="#top"]');
      if (logo && /^CUBERRY$/i.test(logo.textContent.trim())) setText(logo, settings.brandName);
    }
  }

  function applyModernContact(settings) {
    if (!settings) return;
    // CTA 섹션은 React의 문의 폼 상태와 분리된 복제본으로 둔다.
    const section = modernSection("#contact", "contact");
    if (section) section.id = "contact";
    if (settings.contactEmail) {
      document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
        link.href = `mailto:${settings.contactEmail}`;
        setText(link, `${settings.contactEmail} ↗`);
      });
    }
    if (settings.contactPhone) {
      const digits = String(settings.contactPhone).replace(/[^\d+]/g, "");
      document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
        link.href = `tel:${digits}`;
        setText(link, `${settings.contactPhone} ↗`);
      });
    }
  }

  function applyModernServices(services) {
    const section = modernPackagesSection();
    if (!section) return;
    const layout = section.firstElementChild;
    const cards = layout?.children?.[1];
    if (!cards) return;
    const originalCards = document.querySelector('[data-cms-original="packages"]')?.firstElementChild?.children?.[1];
    const templates = cards.children.length ? [...cards.children] : [...(originalCards?.children || [])];
    const template = templates[0];
    if (!template) return;
    const fragment = document.createDocumentFragment();
    services.forEach((service, index) => {
      const card = (templates[index] || template).cloneNode(false);
      card.dataset.cmsId = `service-${service.id}`;
      const name = document.createElement("b");
      name.className = "block text-[12px] font-bold text-white";
      name.textContent = service.name;
      const detail = document.createElement("span");
      detail.className = "block mt-1 text-purple-400 font-mono text-[11px]";
      const duration = String(service.duration || "").split("·")[0].trim();
      detail.textContent = duration ? `${service.price} · ${duration}` : service.price;
      card.replaceChildren(name, detail);
      fragment.append(card);
    });
    cards.replaceChildren(fragment);
    section.hidden = services.length === 0;
  }

  function portfolioGroups(items) {
    const drive = [];
    const works = [];
    items.forEach((item) => {
      if (item.source === "drive" || String(item.landingSlot || "").startsWith("drive-")) drive.push(item);
      else works.push(item);
    });
    return { drive, works };
  }

  function applyModernDrive(items) {
    const section = modernSection("#drive-portfolio", "drive");
    if (!section) return;
    section.id = "drive-portfolio";
    const layout = section.firstElementChild;
    const grid = layout?.lastElementChild;
    const template = grid?.querySelector("article") || document.querySelector('[data-cms-original="drive"] article');
    if (!grid || !template) return;
    const cards = items.map((item) => {
      const card = template.cloneNode(true);
      card.dataset.cmsId = `portfolio-${item.id}`;
      const image = card.querySelector("img");
      if (image) {
        if (item.thumbnailUrl) image.src = assetUrl(item.thumbnailUrl);
        else image.removeAttribute("src");
        image.alt = `${item.title} 썸네일`;
        image.hidden = !item.thumbnailUrl;
      }
      const links = card.querySelectorAll("a");
      links.forEach((link) => {
        if (item.videoUrl) link.href = assetUrl(item.videoUrl);
        else link.removeAttribute("href");
        link.setAttribute("aria-label", `${item.title} 새 창에서 보기`);
      });
      const copy = card.lastElementChild?.firstElementChild;
      const labels = copy ? copy.querySelectorAll("p") : [];
      setText(labels[0], item.tags || item.category || "PORTFOLIO");
      setText(copy?.querySelector("h3"), item.title);
      setText(labels[1], item.description);
      return card;
    });
    grid.replaceChildren(...cards);
    section.hidden = items.length === 0;
  }

  function workCard(template, item, index, total) {
    const card = template.cloneNode(true);
    card.dataset.cmsId = `portfolio-${item.id}`;
    card.dataset.kind = item.kind || "기타";
    const media = card.firstElementChild;
    const image = media?.querySelector("img");
    if (image) {
      if (item.thumbnailUrl) image.src = assetUrl(item.thumbnailUrl);
      else image.removeAttribute("src");
      image.alt = `${item.title} 썸네일`;
      image.hidden = !item.thumbnailUrl;
    }
    setText(media?.querySelector("span"), `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`);
    const body = card.lastElementChild;
    const meta = body?.firstElementChild?.querySelectorAll("span") || [];
    setText(meta[0], item.category);
    setText(meta[1], item.year);
    setText(body?.querySelector("h3"), item.title);
    const description = body ? [...body.children].find((node) => node.tagName === "P") : null;
    setText(description, item.description);
    const tags = body?.lastElementChild;
    if (tags) {
      tags.replaceChildren(...String(item.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => {
        const chip = document.createElement("span");
        chip.className = "text-[9px] font-mono text-[#999] border border-white/10 px-2 py-0.5 rounded";
        chip.textContent = tag;
        return chip;
      }));
    }
    if (media && item.videoUrl) {
      media.tabIndex = 0;
      media.setAttribute("role", "link");
      media.setAttribute("aria-label", `${item.title} 새 창에서 보기`);
      media.style.cursor = "pointer";
      const open = () => window.open(assetUrl(item.videoUrl), "_blank", "noopener,noreferrer");
      media.addEventListener("click", open);
      media.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
      });
    }
    return card;
  }

  function applyModernWorks(items) {
    const section = modernSection("#works", "works");
    if (!section) return;
    section.id = "works";
    const layout = section.firstElementChild;
    const grid = layout?.lastElementChild;
    const filters = grid?.previousElementSibling;
    const template = grid?.querySelector("article") || document.querySelector('[data-cms-original="works"] article');
    if (!grid || !filters || !template) return;
    const cards = items.map((item, index) => workCard(template, item, index, items.length));
    grid.replaceChildren(...cards);

    const eyebrow = layout.querySelector("div > div > p");
    setText(eyebrow, `04 / Portfolio · ${items.length} works`);
    const kinds = [...new Set(items.map((item) => item.kind).filter(Boolean))];
    const labels = ["all", ...kinds];
    const buttons = labels.map((kind, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `border rounded-full px-4 py-2 text-[11px] font-bold transition-all duration-200 ${index === 0 ? "bg-purple-600 border-purple-600 text-white" : "border-white/15 text-[#999] hover:bg-purple-600/20 hover:border-purple-500/30 hover:text-white"}`;
      button.textContent = kind === "all" ? "ALL" : kind;
      button.addEventListener("click", () => {
        buttons.forEach((node) => {
          const on = node === button;
          node.className = `border rounded-full px-4 py-2 text-[11px] font-bold transition-all duration-200 ${on ? "bg-purple-600 border-purple-600 text-white" : "border-white/15 text-[#999] hover:bg-purple-600/20 hover:border-purple-500/30 hover:text-white"}`;
        });
        cards.forEach((card) => { card.hidden = kind !== "all" && card.dataset.kind !== kind; });
      });
      return button;
    });
    filters.replaceChildren(...buttons);
    section.hidden = items.length === 0;
  }

  function applyModernTeam(team) {
    const section = modernSection("#team", "team");
    if (!section) return;
    section.id = "team";
    const layout = section.firstElementChild;
    const note = layout?.lastElementChild;
    const grid = note?.previousElementSibling;
    const template = grid?.querySelector("article") || document.querySelector('[data-cms-original="team"] article');
    if (!grid || !template) return;
    const mediaClass = template.firstElementChild?.className || "h-[180px] relative overflow-hidden bg-[#222] rounded-md mb-4";
    const titleClass = template.querySelector("h3")?.className || "text-[17px] font-bold mb-1";
    const paragraphClasses = [...template.querySelectorAll(":scope > p")].map((node) => node.className);
    const listClass = template.querySelector("ul")?.className || "pt-3 pl-4 space-y-1 list-disc text-[12px] text-[#64635e]";
    const cards = team.map((person) => {
      const card = document.createElement("article");
      card.className = template.className;
      card.dataset.cmsId = `team-${person.id}`;
      const media = document.createElement("div");
      media.className = mediaClass;
      if (person.photoUrl) {
        const image = document.createElement("img");
        image.src = assetUrl(person.photoUrl);
        image.alt = `${person.name} 프로필`;
        image.loading = "lazy";
        image.className = "w-full h-full object-cover filter grayscale group-hover:grayscale-[0.35] group-hover:scale-105 transition-all duration-350";
        image.style.objectPosition = `center ${Number(person.photoPosition) || 0}%`;
        media.append(image);
      } else {
        const empty = document.createElement("div");
        empty.className = "w-full h-full bg-gradient-to-br from-[#2a2a3a] to-[#1a1a25] flex items-center justify-center";
        const label = document.createElement("span");
        label.className = "text-[#555] font-mono text-[11px]";
        label.textContent = "NO PHOTO";
        empty.append(label);
        media.append(empty);
      }
      const title = document.createElement("h3");
      title.className = titleClass;
      title.textContent = person.name;
      const [roleText, ...backgroundParts] = String(person.role || "").split(" · ");
      const role = document.createElement("p");
      role.className = paragraphClasses[0] || "font-mono text-[10px] text-purple-400 tracking-wider";
      role.textContent = roleText;
      const background = document.createElement("p");
      background.className = paragraphClasses[1] || "text-[11px] text-[#999] mt-0.5";
      background.textContent = backgroundParts.join(" · ");
      background.hidden = !background.textContent;
      const lines = String(person.bio || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const list = document.createElement("ul");
      list.className = listClass;
      list.replaceChildren(...lines.map(bioItem));
      list.hidden = lines.length === 0;
      card.append(media, title, role, background, list);
      return card;
    });
    grid.replaceChildren(...cards);
    section.hidden = team.length === 0;
  }

  function applyModernFaqs(faqs) {
    const section = modernSection("#faq", "faqs");
    if (!section) return;
    section.id = "faq";
    const layout = section.firstElementChild;
    const list = layout?.lastElementChild;
    const template = list?.firstElementChild || document.querySelector('[data-cms-original="faqs"]')?.firstElementChild?.lastElementChild?.firstElementChild;
    if (!list || !template) return;
    const buttonClass = template.querySelector("button")?.className || "w-full py-5 text-left flex justify-between items-center font-bold text-[15px]";
    const answerClass = template.querySelector("p")?.className || "text-[#9b9992] text-[13px] max-w-[680px] pb-4";
    const cards = faqs.map((faq) => {
      const item = document.createElement("div");
      item.className = "border-b border-white/[0.08]";
      item.dataset.cmsId = `faq-${faq.id}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = buttonClass;
      button.setAttribute("aria-expanded", "false");
      const question = document.createElement("span");
      question.textContent = faq.question;
      const icon = document.createElement("span");
      icon.className = "font-mono text-[18px] transition-transform duration-200";
      icon.textContent = "+";
      const answer = document.createElement("p");
      answer.className = answerClass;
      answer.textContent = faq.answer;
      answer.hidden = true;
      button.append(question, icon);
      button.addEventListener("click", () => {
        const open = answer.hidden;
        answer.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
        icon.classList.toggle("rotate-45", open);
      });
      item.append(button, answer);
      return item;
    });
    list.replaceChildren(...cards);
    section.hidden = faqs.length === 0;
  }

  function applyModernContent(data) {
    const settings = data.settings || {};
    const portfolio = portfolioGroups(data.portfolio || []);
    applyModernHero(settings);
    applyModernContact(settings);
    applyModernServices(data.services || []);
    applyModernDrive(portfolio.drive);
    applyModernWorks(portfolio.works);
    applyModernTeam(data.team || []);
    applyModernFaqs(data.faqs || []);
  }

  function applyLegacyContent(data) {
    applyHero(data.settings || {});
    applyContact(data.settings || {});
    applyServices(data.services || []);
    applyFaqs(data.faqs || []);
    applyPortfolio(data.portfolio || []);
    applyTeam(data.team);
  }

  const style = document.createElement("style");
  style.textContent = ".faq-item.open .faq-answer{max-height:520px}#cms-extra-works{margin-top:18px}[hidden],[data-cms-original]{display:none!important}";
  document.head.append(style);

  // API 응답이 React보다 먼저 도착할 수도 있으므로 실제 랜딩 마운트를 기다린다.
  let mountPromise = null;
  function waitForLandingMount() {
    if (!document.querySelector("#root") || isModernLanding()) return Promise.resolve();
    if (mountPromise) return mountPromise;
    mountPromise = new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (!isModernLanding()) return;
        observer.disconnect();
        resolve();
      });
      observer.observe(document.querySelector("#root"), { childList: true, subtree: true });
      // 스크립트 오류가 있어도 Promise를 영원히 붙들지 않는다.
      setTimeout(() => { observer.disconnect(); resolve(); }, 8000);
    });
    return mountPromise;
  }

  let loading = null;
  async function refreshContent() {
    if (loading) return loading;
    loading = fetch(apiUrl("/api/public/content"), { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(async (data) => {
        if (!data) return;
        await waitForLandingMount();
        if (isModernLanding()) applyModernContent(data);
        else applyLegacyContent(data);
      })
      .catch(() => {})
      .finally(() => { loading = null; });
    return loading;
  }

  refreshContent();
  // 어드민 탭에서 저장한 뒤 랜딩 탭으로 돌아오면 새로고침 없이 최신값을 다시 읽는다.
  window.addEventListener("focus", refreshContent);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshContent();
  });
})();

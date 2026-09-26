(() => {
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
      image.src = item.thumbnailUrl;
      image.alt = `${item.title} 썸네일`;
    }
    const source = card.querySelector("video source");
    if (source && item.videoUrl && !item.videoUrl.includes("drive.google.com")) source.src = item.videoUrl;
  };

  const fillDrive = (card, item) => {
    card.hidden = false;
    setText(card.querySelector("h3"), item.title);
    setText(card.querySelector(".drive-video-meta p"), item.description);
    const link = card.querySelector(".drive-video-meta a");
    if (link && item.videoUrl) {
      link.href = item.videoUrl;
      link.setAttribute("aria-label", `${item.title} 새 창에서 보기`);
    }
    const button = card.querySelector(".drive-load");
    if (button) button.setAttribute("aria-label", `${item.title} 영상 재생`);
    const driveId = String(item.videoUrl || "").match(/\/file\/d\/([^/]+)/);
    if (button && driveId) {
      button.dataset.driveId = driveId[1];
      const image = button.querySelector("img");
      if (image) image.src = item.thumbnailUrl || `https://drive.google.com/thumbnail?id=${driveId[1]}&sz=w1000`;
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
    link.href = item.videoUrl;
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
      if (image.getAttribute("src") !== person.photoUrl) image.src = person.photoUrl;
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

  const style = document.createElement("style");
  style.textContent = ".faq-item.open .faq-answer{max-height:520px}#cms-extra-works{margin-top:18px}[hidden]{display:none!important}";
  document.head.append(style);

  fetch("/api/public/content")
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!data) return;
      applyHero(data.settings || {});
      applyContact(data.settings || {});
      applyServices(data.services || []);
      applyFaqs(data.faqs || []);
      applyPortfolio(data.portfolio || []);
      applyTeam(data.team);
    })
    .catch(() => {});
})();

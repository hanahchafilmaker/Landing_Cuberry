// ─────────────────────────────────────────────────────────────
// 검색엔진용 구조화 데이터(JSON-LD) — 빌드할 때 <head> 에 주입한다.
//
// landing/index.html 에는 Organization 1개만 손으로 적혀 있고(JS 없는 환경·원본 확인용),
// 나머지(WebSite · 제작 상품 OfferCatalog · FAQPage)는 **콘텐츠 원본에서 생성**해
// 빌드 산출물(index.html)에만 붙인다. 상품 가격이나 FAQ 문구를 content.ts 에서 고치면
// 구조화 데이터도 같이 따라오므로, 화면 문구와 검색엔진이 읽는 값이 어긋나지 않는다.
//
// ⚠ Organization 은 여기서 다시 만들지 않는다. landing/index.html 의 Organization 과
//    같은 @id(#organization)를 쓰는 노드들이 서로를 참조만 하게 해서 중복 선언을 피한다.
// ─────────────────────────────────────────────────────────────
import { faqs, offices, services, settings } from "../data/content.ts";

/** 공식 도메인(정본). canonical · sitemap · hreflang 과 같은 값을 쓴다. */
export const SITE_ORIGIN = "https://www.cuberry.kr";
export const ORG_ID = `${SITE_ORIGIN}/#organization`;
export const SITE_ID = `${SITE_ORIGIN}/#website`;
export const SERVICES_ID = `${SITE_ORIGIN}/#services`;
export const FAQ_ID = `${SITE_ORIGIN}/#faq`;

/**
 * "118만원~" · "29만원" 같은 표시용 가격을 schema.org Offer 의 숫자 가격으로 바꾼다.
 * "만원" 단위가 없으면(예: "1,180,000원") 숫자만 뽑아 쓴다. 숫자가 없으면 null.
 */
export function priceToKrw(price: string): number | null {
  const cleaned = price.replace(/[,\s]/g, "");
  const man = cleaned.match(/(\d+(?:\.\d+)?)만원/);
  if (man) return Math.round(Number(man[1]) * 10_000);
  const won = cleaned.match(/(\d+)원/);
  if (won) return Number(won[1]);
  return null;
}

/** 주소 문자열에서 schema.org PostalAddress 를 만든다(도로명·시/도 분리 없이 한 줄로도 유효). */
function postalAddress(address: string, locality: string) {
  return {
    "@type": "PostalAddress",
    streetAddress: address,
    addressLocality: locality,
    addressCountry: "KR",
  };
}

/**
 * 빌드 산출물에 넣을 @graph. landing/index.html 의 Organization(@id = #organization)을
 * 참조하므로, 이 스크립트만 읽어도 회사·사이트·상품·FAQ 관계가 한 덩어리로 해석된다.
 */
export function buildStructuredData() {
  const [hq, branch] = offices;

  const webSite = {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: `${SITE_ORIGIN}/`,
    name: `${settings.brandKo} · ${settings.brand}`,
    alternateName: settings.brand,
    description: settings.heroSubtitle,
    inLanguage: ["ko-KR", "en"],
    publisher: { "@id": ORG_ID },
  };

  // 회사의 지역 정보는 Organization 쪽이 정본이지만, @graph 로 함께 내보내
  // Organization 을 수정하지 않고도 주소·연락처가 구조화되게 한다.
  const locations = {
    "@type": "ItemList",
    "@id": `${SITE_ORIGIN}/#locations`,
    name: "큐브베리 사업장",
    numberOfItems: offices.length,
    itemListElement: [hq, branch].filter(Boolean).map((office, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Place",
        name: office.kicker,
        address: postalAddress(office.address, office.kicker.includes("광주") ? "광주" : "부천"),
        parentOrganization: { "@id": ORG_ID },
      },
    })),
  };

  const serviceCatalog = {
    "@type": "OfferCatalog",
    "@id": SERVICES_ID,
    name: "AI 영상 제작 상품",
    url: `${SITE_ORIGIN}/#pricing`,
    provider: { "@id": ORG_ID },
    itemListElement: services.map((service, index) => {
      const price = priceToKrw(service.price);
      return {
        "@type": "Offer",
        position: index + 1,
        name: service.name,
        description: `${service.desc} · ${service.duration}`,
        url: `${SITE_ORIGIN}/#pricing`,
        priceCurrency: "KRW",
        ...(price === null ? {} : { price, priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "KRW",
          minPrice: price,
        } }),
        availability: "https://schema.org/InStock",
        itemOffered: {
          "@type": "Service",
          name: service.name,
          serviceType: service.tier,
          description: `${service.desc} (${service.duration})`,
          provider: { "@id": ORG_ID },
          areaServed: { "@type": "Country", name: "대한민국" },
        },
      };
    }),
  };

  const faqPage = {
    "@type": "FAQPage",
    "@id": FAQ_ID,
    url: `${SITE_ORIGIN}/#faq`,
    name: "자주 묻는 질문",
    inLanguage: "ko-KR",
    isPartOf: { "@id": SITE_ID },
    about: { "@id": ORG_ID },
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [webSite, locations, serviceCatalog, faqPage],
  };
}

/** 탐침용 — 테스트에서 그래프 노드를 타입으로 찾을 때 쓴다. */
export type StructuredDataNode = { "@type": string; [key: string]: unknown };

type LinkedinProfile = {
  name: string;
  company: string;
  title: string;
  location: string;
  profileUrl: string;
};

function cleanText(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function queryAllTexts(selector: string, root: ParentNode = document): string[] {
  return unique(
    Array.from(root.querySelectorAll(selector))
      .map((el) => cleanText(el.textContent))
      .filter(Boolean)
  );
}

function firstNonEmpty(values: Array<string | null | undefined>): string {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return "";
}

function splitCompanyLine(value: string): string {
  return cleanText((value || "").split("·")[0]);
}

function isNoise(value: string): boolean {
  const lower = value.toLowerCase();

  return (
    !value ||
    lower.includes("video player") ||
    lower.includes("seek to live") ||
    lower.includes("currently behind live") ||
    lower.includes("descriptions") ||
    lower.includes("selected") ||
    lower.includes("helped me get this job") ||
    lower.includes("followers") ||
    lower.includes("connections") ||
    lower.includes("message") ||
    lower.includes("connect") ||
    lower.includes("premium") ||
    lower.includes("contact info") ||
    lower.includes("skills")
  );
}

function looksLikeLocation(value: string): boolean {
  const lower = value.toLowerCase();

  return (
    value.includes(",") ||
    lower === "mexico" ||
    lower.includes("mexico") ||
    lower.includes("city") ||
    lower.includes("hybrid") ||
    lower.includes("remote") ||
    lower.includes("remoto") ||
    lower.includes("united states") ||
    lower.includes("florida") ||
    lower.includes("quintana roo") ||
    lower.includes("cancún") ||
    lower.includes("cancun") ||
    lower.includes("perú") ||
    lower.includes("peru") ||
    lower.includes("colombia") ||
    lower.includes("chile")
  );
}

function looksLikeDateOrDuration(value: string): boolean {
  const lower = value.toLowerCase();

  return (
    lower.includes("present") ||
    lower.includes("actualidad") ||
    lower.includes("yrs") ||
    lower.includes("yr") ||
    lower.includes("mos") ||
    lower.includes("mo") ||
    lower.includes("años") ||
    lower.includes("año") ||
    lower.includes("meses") ||
    lower.includes("mes") ||
    /\b(19|20)\d{2}\b/.test(lower)
  );
}

function getNameElement(doc: Document = document): Element | null {
  return (
    doc.querySelector('section[componentkey*="topcard"] h2') ||
    doc.querySelector('section[componentkey*="topcard"] h1') ||
    doc.querySelector("main h1") ||
    doc.querySelector("main h2") ||
    doc.querySelector("h1") ||
    doc.querySelector("h2")
  );
}

function getTopCardRoot(
  nameEl: Element | null,
  doc: Document = document
): Element | null {
  if (!nameEl) {
    return (
      doc.querySelector('section[componentkey*="topcard"]') ||
      doc.querySelector(".pv-top-card") ||
      doc.querySelector("main section:first-of-type") ||
      doc.querySelector("main")
    );
  }

  return (
    nameEl.closest('section[componentkey*="topcard"]') ||
    nameEl.closest("section") ||
    nameEl.parentElement
  );
}

function getName(
  topCard: Element | null,
  doc: Document = document
): string {
  if (!topCard) {
    return (
      cleanText(doc.querySelector("h1")?.textContent) ||
      cleanText(doc.querySelector("h2")?.textContent) ||
      cleanText(doc.title)
        .replace(/\s*\|\s*LinkedIn.*$/i, "")
        .replace(/\s*-\s*LinkedIn.*$/i, "")
        .trim()
    );
  }

  return firstNonEmpty([
    cleanText(topCard.querySelector("h2")?.textContent),
    cleanText(topCard.querySelector("h1")?.textContent),
    cleanText(doc.querySelector("h1")?.textContent),
    cleanText(doc.querySelector("h2")?.textContent),
    cleanText(doc.title)
      .replace(/\s*\|\s*LinkedIn.*$/i, "")
      .replace(/\s*-\s*LinkedIn.*$/i, "")
      .trim(),
  ]);
}

function getLocation(
  topCard: Element | null,
  name: string,
  doc: Document = document
): string {
  if (!topCard) return "";

  const pTexts = queryAllTexts("p", topCard, doc)
    .map((text) => cleanText(text.split("·")[0]))
    .filter((text) => !isNoise(text))
    .filter((text) => text !== name);

  const locationLike = pTexts.filter((text) => looksLikeLocation(text));

  if (locationLike.length > 0) {
    return locationLike[locationLike.length - 1];
  }

  if (pTexts.length > 0) {
    return pTexts[pTexts.length - 1];
  }

  return "";
}

function findExperienceSection(doc: Document = document): Element | null {
  const sections = Array.from(doc.querySelectorAll("section"));

  for (const section of sections) {
    const headingTexts = queryAllTexts(
      "h2, span[aria-hidden='true'], div[role='heading']",
      section,
      doc).map((text) => text.toLowerCase());

    if (
      headingTexts.includes("experience") ||
      headingTexts.includes("experiencia")
    ) {
      return section;
    }
  }

  return null;
}

function getUsefulExperienceAnchors(
  section: Element | null,
  doc: Document = document
): string[][] {
  if (!section) return [];

  const anchors = Array.from(section.querySelectorAll("a"));

  return anchors
    .map((anchor) =>
      queryAllTexts("p", anchor, doc)
        .map((text) => cleanText(text))
        .filter((text) => !isNoise(text))
    )
    .filter((pTexts) => pTexts.length >= 2);
}

function getCurrentExperience(
  section: Element | null,
  doc: Document = document
): {
  title: string;
  company: string;
} {
  const anchors = getUsefulExperienceAnchors(section, doc);

  if (!anchors.length) {
    return { title: "", company: "" };
  }

  const first = anchors[0];

  if (!looksLikeDateOrDuration(first[1])) {
    return {
      title: cleanText(first[0]),
      company: splitCompanyLine(first[1]),
    };
  }

  const second = anchors[1] ?? [];

  return {
    company: splitCompanyLine(first[0]),
    title: cleanText(second[0] ?? ""),
  };
}

import { extractProfileFromDocument } from "./lib/scraper";

function extractProfile():
  | { ok: true; profile: LinkedinProfile }
  | { ok: false; error: string } {
  const result = extractProfileFromDocument(document);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    profile: {
      ...result.profile,
      profileUrl: window.location.href.split("?")[0],
    },
  };
}

  const location = getLocation(topCard, name);
  const experienceSection = findExperienceSection();
  const currentExperience = getCurrentExperience(experienceSection);

  return {
    ok: true,
    profile: {
      name,
      company: currentExperience.company,
      title: currentExperience.title,
      location,
      profileUrl,
    },
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "EXTRACT_PROFILE") {
    sendResponse(extractProfile());
  }
  return true;
});

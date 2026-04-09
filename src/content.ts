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

function looksLikeWorkType(value: string): boolean {
  const lower = value.toLowerCase();

  return (
    lower.includes("full-time") ||
    lower.includes("part-time") ||
    lower.includes("contract") ||
    lower.includes("internship") ||
    lower.includes("temporary") ||
    lower.includes("tiempo completo") ||
    lower.includes("medio tiempo") ||
    lower.includes("jornada completa")
  );
}

function getNameElement(): Element | null {
  return (
    document.querySelector('section[componentkey*="topcard"] h2') ||
    document.querySelector('section[componentkey*="topcard"] h1') ||
    document.querySelector("main h1") ||
    document.querySelector("main h2") ||
    document.querySelector("h1") ||
    document.querySelector("h2")
  );
}

function getTopCardRoot(nameEl: Element | null): Element | null {
  if (!nameEl) {
    return (
      document.querySelector('section[componentkey*="topcard"]') ||
      document.querySelector(".pv-top-card") ||
      document.querySelector("main section:first-of-type") ||
      document.querySelector("main")
    );
  }

  return (
    nameEl.closest('section[componentkey*="topcard"]') ||
    nameEl.closest("section") ||
    nameEl.parentElement
  );
}

function getName(topCard: Element | null): string {
  if (!topCard) {
    return (
      cleanText(document.querySelector("h1")?.textContent) ||
      cleanText(document.querySelector("h2")?.textContent) ||
      cleanText(document.title)
        .replace(/\s*\|\s*LinkedIn.*$/i, "")
        .replace(/\s*-\s*LinkedIn.*$/i, "")
        .trim()
    );
  }

  return firstNonEmpty([
    cleanText(topCard.querySelector("h2")?.textContent),
    cleanText(topCard.querySelector("h1")?.textContent),
    cleanText(document.querySelector("h1")?.textContent),
    cleanText(document.querySelector("h2")?.textContent),
    cleanText(document.title)
      .replace(/\s*\|\s*LinkedIn.*$/i, "")
      .replace(/\s*-\s*LinkedIn.*$/i, "")
      .trim(),
  ]);
}

function getLocation(topCard: Element | null, name: string): string {
  if (!topCard) return "";

  const pTexts = queryAllTexts("p", topCard)
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

function findExperienceSection(): Element | null {
  const sections = Array.from(document.querySelectorAll("section"));

  for (const section of sections) {
    const headingTexts = queryAllTexts(
      "h2, span[aria-hidden='true'], div[role='heading']",
      section
    ).map((text) => text.toLowerCase());

    if (
      headingTexts.includes("experience") ||
      headingTexts.includes("experiencia")
    ) {
      return section;
    }
  }

  return null;
}

function getUsefulExperienceAnchors(section: Element | null): string[][] {
  if (!section) return [];

  const anchors = Array.from(section.querySelectorAll("a"));

  return anchors
    .map((anchor) =>
      queryAllTexts("p", anchor)
        .map((text) => cleanText(text))
        .filter((text) => !isNoise(text))
    )
    .filter((pTexts) => pTexts.length >= 2);
}

function getCurrentExperience(section: Element | null): {
  title: string;
  company: string;
} {
  const anchors = getUsefulExperienceAnchors(section);

  if (!anchors.length) {
    return { title: "", company: "" };
  }

  const first = anchors[0];

  // Caso simple:
  // p[0] = puesto
  // p[1] = empresa · modalidad
  if (!looksLikeDateOrDuration(first[1])) {
    return {
      title: cleanText(first[0]),
      company: splitCompanyLine(first[1]),
    };
  }

  // Caso anidado:
  // first[0] = empresa
  // first[1] = duración empresa
  // second[0] = puesto actual
  const second = anchors[1] ?? [];

  return {
    company: splitCompanyLine(first[0]),
    title: cleanText(second[0] ?? ""),
  };
}

function extractProfile():
  | { ok: true; profile: LinkedinProfile }
  | { ok: false; error: string } {
  const profileUrl = window.location.href.split("?")[0];

  const nameEl = getNameElement();
  const topCard = getTopCardRoot(nameEl);
  const name = getName(topCard);

  if (!name) {
    return {
      ok: false,
      error: "Could not extract the profile name from the page.",
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
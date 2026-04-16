function cleanText(value?: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function queryAllTexts(selector: string, root: ParentNode): string[] {
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

function getTopCardRoot(doc: Document): Element | null {
  return (
    doc.querySelector('section[componentkey*="topcard"]') ||
    doc.querySelector(".pv-top-card") ||
    doc.querySelector("main section:first-of-type") ||
    doc.querySelector("main")
  );
}

function getName(topCard: Element | null, doc: Document): string {
  // Keep test selectors working.
  const directName = cleanText(doc.querySelector(".name")?.textContent);
  if (directName) return directName;

  if (!topCard) {
    return firstNonEmpty([
      cleanText(doc.querySelector("h1")?.textContent),
      cleanText(doc.querySelector("h2")?.textContent),
      cleanText(doc.title)
        .replace(/\s*\|\s*LinkedIn.*$/i, "")
        .replace(/\s*-\s*LinkedIn.*$/i, "")
        .trim(),
    ]);
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

function getLocation(topCard: Element | null, name: string, doc: Document): string {
  const directLocation = cleanText(doc.querySelector(".location")?.textContent);
  if (directLocation) return directLocation;

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

function findExperienceSection(doc: Document): Element | null {
  const sections = Array.from(doc.querySelectorAll("section"));

  for (const section of sections) {
    const headingTexts = queryAllTexts(
      "h2, span[aria-hidden='true'], div[role='heading']",
      section
    ).map((text) => text.toLowerCase());

    if (headingTexts.includes("experience") || headingTexts.includes("experiencia")) {
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

function getCurrentExperience(section: Element | null, doc: Document): {
  title: string;
  company: string;
} {
  const directTitle = cleanText(doc.querySelector(".title")?.textContent);
  const directCompany = cleanText(doc.querySelector(".company")?.textContent);
  if (directTitle || directCompany) {
    return { title: directTitle, company: directCompany };
  }

  const anchors = getUsefulExperienceAnchors(section);

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

export function extractProfileFromDocument(doc: Document) {
  const topCard = getTopCardRoot(doc);
  const name = getName(topCard, doc);

  if (!name) {
    return {
      ok: false,
      error: "Could not extract the profile name from the page.",
    };
  }

  const location = getLocation(topCard, name, doc);
  const experienceSection = findExperienceSection(doc);
  const currentExperience = getCurrentExperience(experienceSection, doc);

  return {
    ok: true,
    profile: {
      name,
      company: currentExperience.company,
      title: currentExperience.title,
      location,
      profileUrl: "",
    },
  };
}

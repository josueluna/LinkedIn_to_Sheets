export function extractProfileFromDocument(doc: Document) {
  const name = doc.querySelector(".name")?.textContent?.trim() || "";
  const company = doc.querySelector(".company")?.textContent?.trim() || "";
  const title = doc.querySelector(".title")?.textContent?.trim() || "";
  const location = doc.querySelector(".location")?.textContent?.trim() || "";

  if (!name) {
    return {
      ok: false,
      error: "Could not extract the profile name from the page.",
    };
  }

  return {
    ok: true,
    profile: {
      name,
      company,
      title,
      location,
      profileUrl: "test-url",
    },
  };
}
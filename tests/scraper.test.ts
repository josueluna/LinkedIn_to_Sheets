import { describe, it, expect } from "vitest";
import { extractProfileFromDocument } from "../src/lib/scraper";

describe("extractProfileFromDocument", () => {
  it("extrae perfil correctamente", () => {
    const html = `
      <div>
        <div class="name">Josué Luna</div>
        <div class="company">Coppel</div>
        <div class="title">Recruiter</div>
        <div class="location">CDMX</div>
      </div>
    `;

    const doc = new DOMParser().parseFromString(html, "text/html");

    const result = extractProfileFromDocument(doc);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.profile.name).toBe("Josué Luna");
      expect(result.profile.company).toBe("Coppel");
      expect(result.profile.title).toBe("Recruiter");
      expect(result.profile.location).toBe("CDMX");
    }
  });

  it("falla si no hay nombre", () => {
    const html = `<div></div>`;
    const doc = new DOMParser().parseFromString(html, "text/html");

    const result = extractProfileFromDocument(doc);

    expect(result.ok).toBe(false);
  });
});
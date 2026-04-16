import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { extractProfileFromDocument } from "../src/lib/scraper";

describe("LinkedIn real profile HTML snapshot", () => {
  it("extracts profile data from a realistic LinkedIn fixture", () => {
    const fixturePath = resolve(__dirname, "fixtures", 
"linkedin-profile.html");
    const html = readFileSync(fixturePath, "utf-8");

    const dom = new JSDOM(html, {
      url: "https://www.linkedin.com/in/ada-lovelace/",
    });

    const result = extractProfileFromDocument(dom.window.document);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.profile.name).toBeDefined();
      expect(result.profile.profileUrl).toContain("linkedin.com/in");
    }
  });
});

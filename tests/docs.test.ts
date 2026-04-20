import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";

function loadHTML(relativePath: string) {
  const filePath = resolve(__dirname, "..", relativePath);
  const html = readFileSync(filePath, "utf-8");
  return new JSDOM(html).window.document;
}

describe("Docs HTML validation", () => {

  it("index.html has main CTA and navigation", () => {
    const doc = loadHTML("docs/index.html");

    const cta = doc.querySelector(".btn-primary");
    expect(cta).toBeTruthy();

    const nav = doc.querySelector(".nav");
    expect(nav).toBeTruthy();

    const hero = doc.querySelector(".hero, .page-hero");
    expect(hero).toBeTruthy();
  });

  it("changelog.html has changelog container", () => {
    const doc = loadHTML("docs/changelog.html");

    const container = doc.querySelector("#changelog-content");
    expect(container).toBeTruthy();

    const scripts = doc.querySelectorAll("script");
    const hasFetch = Array.from(scripts).some(s =>
      s.textContent?.includes("fetch")
    );

    expect(hasFetch).toBe(true);
  });

  it("privacy.html contains key privacy statements", () => {
    const html = readFileSync(
      resolve(__dirname, "..", "docs/privacy.html"),
      "utf-8"
    );

    expect(html).toContain("No external storage");
    expect(html).toContain("What we collect");
    expect(html).toContain("How it's used");
  });

});
describe("Docs HTML snapshots", () => {

  it("index.html snapshot", () => {
    const doc = loadHTML("docs/index.html");

    expect(doc.body.innerHTML.trim()).toMatchSnapshot();
  });

  it("changelog.html snapshot", () => {
    const doc = loadHTML("docs/changelog.html");

    expect(doc.body.innerHTML.trim()).toMatchSnapshot();
  });

  it("privacy.html snapshot", () => {
    const doc = loadHTML("docs/privacy.html");

    expect(doc.body.innerHTML.trim()).toMatchSnapshot();
  });

});
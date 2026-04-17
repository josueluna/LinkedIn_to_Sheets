import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { extractProfileFromDocument } from "../src/lib/scraper";

type FixtureCase = {
  fixture: string;
  url: string;
  expected: {
    name: string;
    company: string;
    title: string;
    location: string;
    profileUrl: string;
  };
};

const cases: FixtureCase[] = [
  {
    fixture: "linkedin-profile-missing-company.html",
    url: "https://www.linkedin.com/in/grace-hopper/?trk=public_profile_browsemap",
    expected: {
      name: "Grace Hopper",
      company: "",
      title: "",
      location: "Arlington, Virginia, United States",
      profileUrl: "https://www.linkedin.com/in/grace-hopper/",
    },
  },
  {
    fixture: "linkedin-profile-missing-location.html",
    url: "https://www.linkedin.com/in/katherine-johnson/",
    expected: {
      name: "Katherine Johnson",
      company: "NASA",
      title: "Senior Mathematician",
      location: "",
      profileUrl: "https://www.linkedin.com/in/katherine-johnson/",
    },
  },
  {
    fixture: "linkedin-profile-alt-layout.html",
    url: "https://www.linkedin.com/in/linus-torvalds/",
    expected: {
      name: "Linus Torvalds",
      company: "Linux Foundation",
      title: "Technical Fellow",
      location: "Mexico City, Mexico",
      profileUrl: "https://www.linkedin.com/in/linus-torvalds/",
    },
  },
  {
    fixture: "linkedin-profile-url-fallback.html",
    url: "https://www.linkedin.com/in/margaret-hamilton/?miniProfileUrn=urn%3Ali%3Afs_miniProfile%3A123",
    expected: {
      name: "Margaret Hamilton",
      company: "Apollo Guidance",
      title: "Lead Engineer",
      location: "Cambridge, Massachusetts, United States",
      profileUrl: "https://www.linkedin.com/in/margaret-hamilton/",
    },
  },
  {
    fixture: "linkedin-profile-reordered-partial.html",
    url: "https://www.linkedin.com/in/barbara-liskov/",
    expected: {
      name: "Barbara Liskov",
      company: "MIT",
      title: "Institute Professor",
      location: "Boston, Massachusetts, United States",
      profileUrl: "https://www.linkedin.com/in/barbara-liskov/",
    },
  },
];

describe("LinkedIn profile fixture variations", () => {
  it.each(cases)("extracts expected fields from $fixture", ({ fixture, url, expected }) => {
    const fixturePath = resolve(__dirname, "fixtures", fixture);
    const html = readFileSync(fixturePath, "utf-8");
    const dom = new JSDOM(html, { url });

    const result = extractProfileFromDocument(dom.window.document);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.profile).toEqual(expected);
    }
  });
});

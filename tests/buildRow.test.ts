import { describe, it, expect } from "vitest";
import { buildRow } from "../src/lib/sheets";

const mapping = {
  name: { enabled: true, column: "B" },
  company: { enabled: true, column: "C" },
  title: { enabled: true, column: "D" },
  location: { enabled: true, column: "E" },
  profileUrl: { enabled: true, column: "F" },
};

const profile = {
  name: "Josué",
  company: "Coppel",
  title: "Recruiter",
  location: "CDMX",
  profileUrl: "linkedin.com/in/josue",
};

describe("buildRow", () => {
  it("coloca datos en columnas correctas", () => {
    const row = buildRow(profile, mapping);

    expect(row[1]).toBe("Josué");
    expect(row[2]).toBe("Coppel");
    expect(row[3]).toBe("Recruiter");
    expect(row[4]).toBe("CDMX");
    expect(row[5]).toBe("linkedin.com/in/josue");
  });

  it("respeta campos deshabilitados", () => {
    const customMapping = {
      ...mapping,
      company: { enabled: false, column: "C" },
    };

    const row = buildRow(profile, customMapping);

    expect(row[2]).toBe("");
  });
});
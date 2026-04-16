import { describe, it, expect } from "vitest";
import { normalizeColumnMapping } from "../src/lib/mappings";

describe("normalizeColumnMapping", () => {
  it("usa valores por default si no hay mapping", () => {
    const result = normalizeColumnMapping(null);

    expect(result.name.column).toBe("B");
    expect(result.company.column).toBe("C");
    expect(result.profileUrl.enabled).toBe(true);
  });

  it("convierte formato legacy (strings) a nuevo formato", () => {
    const legacy = {
      name: "A",
      company: "B",
      title: "C",
      location: "D",
      profileUrl: "E",
    };

    const result = normalizeColumnMapping(legacy);

    expect(result.name).toEqual({ enabled: true, column: "A" });
    expect(result.company).toEqual({ enabled: true, column: "B" });
  });

  it("respeta configuración moderna", () => {
    const modern = {
      name: { enabled: false, column: "Z" },
      company: { enabled: true, column: "Y" },
    };

    const result = normalizeColumnMapping(modern);

    expect(result.name.enabled).toBe(false);
    expect(result.name.column).toBe("Z");
  });

  it("profileUrl siempre queda enabled", () => {
    const input = {
      profileUrl: { enabled: false, column: "A" },
    };

    const result = normalizeColumnMapping(input);

    expect(result.profileUrl.enabled).toBe(true);
  });
});
import { describe, it, expect } from "vitest";
import { getProfileUrlDuplicateColumns, isDuplicateProfile } from "../src/lib/sheets";
import { defaultColumnMapping } from "../src/lib/mappings";

describe("isDuplicateProfile", () => {
  it("detecta duplicado correctamente", () => {
    const rows = [["url1"], ["url2"], ["url3"]];

    const result = isDuplicateProfile(rows, "url2");

    expect(result).toEqual({ duplicate: true, row: 3 });
  });

  it("retorna false si no existe", () => {
    const rows = [["url1"], ["url2"]];

    const result = isDuplicateProfile(rows, "urlX");

    expect(result).toEqual({ duplicate: false });
  });

  it("detecta duplicado cuando profileUrl está en otra columna", () => {
    const rows = [
      ["name 1", "url1"],
      ["name 2", "url2"],
    ];

    const result = isDuplicateProfile(rows, "url2", [1]);

    expect(result).toEqual({ duplicate: true, row: 3 });
  });
});

describe("getProfileUrlDuplicateColumns", () => {
  it("incluye la columna mapeada y fallback F sin duplicados", () => {
    const columns = getProfileUrlDuplicateColumns({
      ...defaultColumnMapping,
      profileUrl: { enabled: true, column: "H" },
    });

    expect(columns).toEqual(["H", "F"]);
  });

  it("evita duplicar F cuando ya está mapeada", () => {
    const columns = getProfileUrlDuplicateColumns(defaultColumnMapping);

    expect(columns).toEqual(["F"]);
  });
});

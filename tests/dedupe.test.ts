import { describe, it, expect } from "vitest";
import { isDuplicateProfile } from "../src/lib/sheets";

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
});
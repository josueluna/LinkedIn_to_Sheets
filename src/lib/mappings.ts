export type ColumnMapping = {
  name: { enabled: boolean; column: string };
  company: { enabled: boolean; column: string };
  title: { enabled: boolean; column: string };
  location: { enabled: boolean; column: string };
  profileUrl: { enabled: boolean; column: string };
};

export const defaultColumnMapping: ColumnMapping = {
  name: { enabled: true, column: "B" },
  company: { enabled: true, column: "C" },
  title: { enabled: true, column: "D" },
  location: { enabled: true, column: "E" },
  profileUrl: { enabled: true, column: "F" },
};

export function normalizeColumnMapping(raw: any): ColumnMapping {
  if (!raw) {
    return defaultColumnMapping;
  }

  const isLegacy =
    typeof raw.name === "string" ||
    typeof raw.company === "string" ||
    typeof raw.title === "string" ||
    typeof raw.location === "string" ||
    typeof raw.profileUrl === "string";

  if (isLegacy) {
    return {
      name: { enabled: true, column: raw.name ?? "B" },
      company: { enabled: true, column: raw.company ?? "C" },
      title: { enabled: true, column: raw.title ?? "D" },
      location: { enabled: true, column: raw.location ?? "E" },
      profileUrl: { enabled: true, column: raw.profileUrl ?? "F" },
    };
  }

  return {
    name: {
      enabled: raw.name?.enabled ?? true,
      column: raw.name?.column ?? "B",
    },
    company: {
      enabled: raw.company?.enabled ?? true,
      column: raw.company?.column ?? "C",
    },
    title: {
      enabled: raw.title?.enabled ?? true,
      column: raw.title?.column ?? "D",
    },
    location: {
      enabled: raw.location?.enabled ?? true,
      column: raw.location?.column ?? "E",
    },
    profileUrl: {
      enabled: true,
      column: raw.profileUrl?.column ?? "F",
    },
  };
}
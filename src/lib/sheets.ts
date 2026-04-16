import { ColumnMapping } from "./mappings";

// --------------------
// DEDUPLICACIÓN
// --------------------

export function isDuplicateProfile(
  existingRows: string[][],
  profileUrl: string
): { duplicate: boolean; row?: number } {
  for (let i = 0; i < existingRows.length; i++) {
    const value = existingRows[i]?.[0];
    if (value === profileUrl) {
      return {
        duplicate: true,
        row: i + 2, // empieza en fila 2
      };
    }
  }

  return { duplicate: false };
}

// --------------------
// COLUMN UTILS
// --------------------

export function columnLetterToIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

export function getMaxColumnIndex(mapping: ColumnMapping): number {
  const enabledColumns = Object.values(mapping)
    .filter((field) => field.enabled)
    .map((field) => columnLetterToIndex(field.column));

  return enabledColumns.length
    ? Math.max(...enabledColumns)
    : columnLetterToIndex("F");
}

// --------------------
// BUILD ROW
// --------------------

export function buildRow(
  profile: {
    name: string;
    company: string;
    title: string;
    location: string;
    profileUrl: string;
  },
  mapping: ColumnMapping
): string[] {
  const maxColumnIndex = getMaxColumnIndex(mapping);
  const rowValues = new Array(maxColumnIndex + 1).fill("");

  if (mapping.name.enabled) {
    rowValues[columnLetterToIndex(mapping.name.column)] = profile.name;
  }

  if (mapping.company.enabled) {
    rowValues[columnLetterToIndex(mapping.company.column)] = profile.company;
  }

  if (mapping.title.enabled) {
    rowValues[columnLetterToIndex(mapping.title.column)] = profile.title;
  }

  if (mapping.location.enabled) {
    rowValues[columnLetterToIndex(mapping.location.column)] = profile.location;
  }

  if (mapping.profileUrl.enabled) {
    rowValues[columnLetterToIndex(mapping.profileUrl.column)] =
      profile.profileUrl;
  }

  return rowValues;
}
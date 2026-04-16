export function isDuplicateProfile(
  existingRows: string[][],
  profileUrl: string
): { duplicate: boolean; row?: number } {
  for (let i = 0; i < existingRows.length; i++) {
    const value = existingRows[i]?.[0];
    if (value === profileUrl) {
      return {
        duplicate: true,
        row: i + 2, // porque empiezas en fila 2
      };
    }
  }

  return { duplicate: false };
}
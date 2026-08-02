/**
 * Capitalize the first character of a string
 * @param str - The string to capitalize
 * @returns The string with the first character uppercased
 */
export function capitalizeFirst(str: string | null | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

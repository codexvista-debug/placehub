/**
 * Canonical Name Normalization Utility
 * Normalizes name casing and consolidates known typos/variations under canonical identities.
 */
export function normalizeName(name: string): string {
  if (!name || name === '-' || name.trim() === '') return 'Unknown';

  // 1. Strip surrounding quotes, trailing dots/commas/punctuation, and collapse whitespace
  let clean = name.trim().replace(/^["']+|["']+$/g, '').replace(/[.,;:]+$/, '').trim();
  if (!clean) return 'Unknown';

  // Clean casing: capitalize first letter of each word
  clean = clean
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Lowercase alphanumeric key for typo resolution
  const lower = clean.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 2. Veera variations (e.g. 'Veera', 'Veera .', 'Veera.')
  if (lower === 'veera') {
    return 'Veera';
  }

  // 3. Mahendra variations (e.g. 'Mahendra', 'Mahndra', 'Mahedra', 'Mahender', 'Mahendar')
  if (
    lower === 'mahendra' ||
    lower === 'mahndra' ||
    lower === 'mahedra' ||
    lower === 'mahender' ||
    lower === 'mahendar'
  ) {
    return 'Mahendra';
  }

  return clean;
}

export function getInitials(name: string): string {
  if (!name || name === '-') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

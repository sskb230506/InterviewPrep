export function formatDateYYYYMMDD(dateLike) {
  const date = new Date(dateLike);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthLabel(dateLike) {
  return new Date(dateLike).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

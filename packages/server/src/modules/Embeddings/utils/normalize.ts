const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

export const normalizeText = (value?: string | null): string => {
  if (!value) {
    return '';
  }

  return collapseWhitespace(value.toLowerCase());
};

export const normalizeVendorName = (value?: string | null): string => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return '';
  }

  return collapseWhitespace(
    normalizedValue.replace(/\b(pt|cv|tbk|ud|pd|corp|inc|ltd|co)\b/g, ' '),
  );
};

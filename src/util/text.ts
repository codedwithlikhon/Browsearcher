export const truncateText = (value: string, limit: number): string => {
  if (limit <= 0) {
    return '';
  }

  if (value.length <= limit) {
    return value;
  }

  if (limit <= 3) {
    return value.slice(0, limit);
  }

  return `${value.slice(0, limit - 3)}...`;
};

export const sanitiseWhitespace = (value: string): string =>
  value
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();

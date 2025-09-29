export const extractJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch (error) {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');

    if (start !== -1 && end !== -1 && end > start) {
      const candidate = value.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch (innerError) {
        return undefined;
      }
    }

    return undefined;
  }
};

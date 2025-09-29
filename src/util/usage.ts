import type { LanguageModelUsage } from 'ai';

export const mergeUsage = (
  primary: LanguageModelUsage | undefined,
  secondary: LanguageModelUsage | undefined
): LanguageModelUsage => {
  const totals: Record<string, number> = {};

  const accumulate = (usage: LanguageModelUsage | undefined) => {
    if (!usage) {
      return;
    }

    Object.entries(usage).forEach(([key, value]) => {
      if (typeof value === 'number') {
        totals[key] = (totals[key] ?? 0) + value;
      }
    });
  };

  accumulate(primary);
  accumulate(secondary);

  return totals as LanguageModelUsage;
};

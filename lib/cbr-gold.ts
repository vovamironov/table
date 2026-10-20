const DAY_MS = 86_400_000;
const moscowDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Moscow',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** UTC midnight representing the current calendar day in Moscow. */
export function moscowDayTimestamp(now = new Date()): number {
  const parts = moscowDate.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)!.value);
  return Date.UTC(part('year'), part('month') - 1, part('day'));
}

function validDay(time: number): boolean {
  return Number.isFinite(time)
    && Number.isInteger(time)
    && time % DAY_MS === 0
    && new Date(time).getTime() === time;
}

/** Validate effective quotes, keeping the last valid value for each date. */
export function effectiveGoldPrices(
  prices: ReadonlyArray<readonly [number, number]>,
  effectiveThrough: number,
): Array<[number, number]> {
  if (!Number.isFinite(effectiveThrough)) return [];
  const byDate = new Map<number, number>();
  for (const [time, value] of prices) {
    if (validDay(time) && time <= effectiveThrough && Number.isFinite(value) && value > 0) {
      byDate.set(time, value);
    }
  }
  return [...byDate].sort(([a], [b]) => a - b);
}

/** Parse CBR accounting prices for gold (Code=1), whose dates are effective dates. */
export function parseCbrGoldPrices(xml: string, effectiveThrough: number): Array<[number, number]> {
  const prices: Array<[number, number]> = [];
  for (const record of xml.matchAll(/<Record(?=\s|>)([^>]*)>([\s\S]*?)<\/Record>/g)) {
    const attributes = record[1];
    if (!/(?:^|\s)Code\s*=\s*(["'])1\1/.test(attributes)) continue;
    const date = attributes.match(/(?:^|\s)Date\s*=\s*(["'])(\d{2})\.(\d{2})\.(\d{4})\1/);
    const buy = record[2].match(/<Buy>\s*(\d+(?:[,.]\d+)?)\s*<\/Buy>/);
    if (!date || !buy) continue;
    const day = Number(date[2]), month = Number(date[3]), year = Number(date[4]);
    const parsed = new Date(0);
    parsed.setUTCFullYear(year, month - 1, day);
    parsed.setUTCHours(0, 0, 0, 0);
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) continue;
    prices.push([parsed.getTime(), Number(buy[1].replace(',', '.'))]);
  }
  return effectiveGoldPrices(prices, effectiveThrough);
}

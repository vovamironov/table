import { goldPriceHistory } from '../../gold-price-history';

// Refresh the Bank of Russia accounting prices; the chart has a bundled
// historical snapshot so it remains usable if the upstream feed is unavailable.
let cached: { expires: number; prices: Array<[number, number]> } | null = null;

export async function GET() {
  if (cached && cached.expires > Date.now()) {
    return Response.json({ prices: cached.prices });
  }

  const today = new Date();
  const moscowDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(today);
  const end = new Date(`${moscowDay}T00:00:00Z`);
  const snapshotEnd = Date.UTC(2011, 0, 1) + goldPriceHistory.at(-1)![0] * 86400000;
  const start = new Date(Math.min(today.getTime() - 45 * 86400000, snapshotEnd - 7 * 86400000));
  const formatDate = (date: Date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
  const url = new URL('https://www.cbr.ru/scripts/xml_metall.asp');
  url.searchParams.set('date_req1', formatDate(start));
  url.searchParams.set('date_req2', formatDate(end));

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`CBR feed responded ${response.status}`);
    const xml = await response.text();
    const prices: Array<[number, number]> = [];
    for (const match of xml.matchAll(/<Record\s+Date="(\d{2})\.(\d{2})\.(\d{4})"\s+Code="1"[^>]*>\s*<Buy>(\d+(?:,\d+)?)<\/Buy>/g)) {
      const time = Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
      const value = Number(match[4].replace(',', '.'));
      if (Number.isFinite(value) && value > 0 && time <= end.getTime()) prices.push([time, value]);
    }
    if (!prices.length) throw new Error('CBR feed contained no gold prices');
    cached = { prices, expires: Date.now() + 60 * 60 * 1000 };
    return Response.json({ prices });
  } catch {
    return Response.json({ prices: [] }, { status: 503 });
  }
}

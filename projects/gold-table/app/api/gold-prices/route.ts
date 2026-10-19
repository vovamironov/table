import { goldPriceHistory } from '../../gold-price-history';
import { moscowDayTimestamp, parseCbrGoldPrices } from '@/lib/cbr-gold';

// Refresh the Bank of Russia accounting prices; the chart has a bundled
// historical snapshot so it remains usable if the upstream feed is unavailable.
let cached: { effectiveThrough: number; expires: number; prices: Array<[number, number]> } | null = null;
const responseHeaders = { 'Cache-Control': 'no-store' };

export async function GET() {
  const now = new Date();
  const effectiveThrough = moscowDayTimestamp(now);
  if (cached && cached.effectiveThrough === effectiveThrough && cached.expires > now.getTime()) {
    return Response.json({ prices: cached.prices }, { headers: responseHeaders });
  }

  const end = new Date(effectiveThrough);
  const snapshotEnd = Date.UTC(2011, 0, 1) + goldPriceHistory.at(-1)![0] * 86400000;
  const start = new Date(Math.min(now.getTime() - 45 * 86400000, snapshotEnd - 7 * 86400000));
  const formatDate = (date: Date) => `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
  const url = new URL('https://www.cbr.ru/scripts/xml_metall.asp');
  url.searchParams.set('date_req1', formatDate(start));
  url.searchParams.set('date_req2', formatDate(end));

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`CBR feed responded ${response.status}`);
    const xml = await response.text();
    const prices = parseCbrGoldPrices(xml, effectiveThrough);
    if (!prices.length) throw new Error('CBR feed contained no gold prices');
    // Invalidate at Moscow midnight even if the five-minute cache is still fresh.
    const nextMoscowMidnight = effectiveThrough + 86400000 - 3 * 60 * 60 * 1000;
    cached = { effectiveThrough, prices, expires: Math.min(Date.now() + 5 * 60 * 1000, nextMoscowMidnight) };
    return Response.json({ prices }, { headers: responseHeaders });
  } catch (error) {
    console.warn('CBR gold-price refresh failed:', error instanceof Error ? error.message : String(error));
    return Response.json({ prices: [] }, { status: 503, headers: responseHeaders });
  }
}

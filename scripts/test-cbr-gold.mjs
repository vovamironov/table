import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../lib/cbr-gold.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const { moscowDayTimestamp, parseCbrGoldPrices, effectiveGoldPrices } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const day = (value) => Date.parse(`${value}T00:00:00Z`);
const record = (date, value, code = 1) => `<Record Date="${date}" Code="${code}"><Buy>${value}</Buy><Sell>${value}</Sell></Record>`;

test('Moscow calendar day changes at 21:00 UTC, regardless of host timezone', () => {
  assert.equal(moscowDayTimestamp(new Date('2026-10-05T20:59:59.999Z')), day('2026-10-05'));
  assert.equal(moscowDayTimestamp(new Date('2026-10-05T21:00:00.000Z')), day('2026-10-06'));
  assert.equal(moscowDayTimestamp(new Date('2026-12-31T21:00:00.000Z')), day('2027-01-01'));
});

test('XML parser reads gold comma decimals and ignores other metals', () => {
  const xml = record('03.10.2026', '11143,31') + record('03.10.2026', '163,51', 2)
    + '<Record Code="1" Extra="x" Date="02.10.2026"><Buy> 11177.45 </Buy></Record>';
  assert.deepEqual(parseCbrGoldPrices(xml, day('2026-10-05')), [
    [day('2026-10-02'), 11177.45], [day('2026-10-03'), 11143.31],
  ]);
});

test('XML parser accepts leap day and rejects impossible calendar dates', () => {
  const xml = record('29.02.2024', '6000,25') + record('29.02.2023', '6001')
    + record('31.04.2024', '6002') + record('00.03.2024', '6003') + record('01.13.2024', '6004');
  assert.deepEqual(parseCbrGoldPrices(xml, day('2026-10-05')), [[day('2024-02-29'), 6000.25]]);
});

test('XML parser rejects nonpositive, malformed, infinite and future-effective quotes', () => {
  const xml = record('03.10.2026', '11143,31') + record('06.10.2026', '11441,31')
    + record('02.10.2026', '0') + record('01.10.2026', '-5') + record('30.09.2026', 'NaN')
    + record('29.09.2026', '11,2,3') + record('28.09.2026', '9'.repeat(400));
  assert.deepEqual(parseCbrGoldPrices(xml, day('2026-10-05')), [[day('2026-10-03'), 11143.31]]);
});

test('XML parser sorts dates and keeps the last valid duplicate quote', () => {
  const xml = record('03.10.2026', '100') + record('01.10.2026', '50')
    + record('03.10.2026', '110') + record('03.10.2026', '0');
  assert.deepEqual(parseCbrGoldPrices(xml, day('2026-10-05')), [
    [day('2026-10-01'), 50], [day('2026-10-03'), 110],
  ]);
});

test('effective prices validate tuples without changing the input', () => {
  const quotes = [
    [day('2026-10-06'), 11441.31], [day('2026-10-03'), 11143.31],
    [day('2026-10-02'), 11177.45], [day('2026-10-03'), 11143.32],
    [NaN, 1], [Infinity, 1], [day('2026-10-01') + 1, 1], [1e20, 1],
    [day('2026-10-01'), 0], [day('2026-09-30'), -1], [day('2026-09-29'), Infinity],
  ];
  const original = structuredClone(quotes);
  assert.deepEqual(effectiveGoldPrices(quotes, day('2026-10-05')), [
    [day('2026-10-02'), 11177.45], [day('2026-10-03'), 11143.32],
  ]);
  assert.deepEqual(quotes, original);
  assert.deepEqual(effectiveGoldPrices(quotes, NaN), []);
});

test('the next published quote becomes effective on the next Moscow day', () => {
  const xml = record('03.10.2026', '11143,31') + record('06.10.2026', '11441,31');
  const beforeMidnight = moscowDayTimestamp(new Date('2026-10-05T20:59:59.999Z'));
  const afterMidnight = moscowDayTimestamp(new Date('2026-10-05T21:00:00.000Z'));
  assert.equal(parseCbrGoldPrices(xml, beforeMidnight).at(-1)[1], 11143.31);
  assert.equal(parseCbrGoldPrices(xml, afterMidnight).at(-1)[1], 11441.31);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../app/gold-landing.tsx', import.meta.url), 'utf8');
const pureSource = source.slice(source.indexOf('function smoothSlope('), source.indexOf('function MobileReturnCalculator('));
const exported = ['samplePointAtX', 'smoothPointAtX', 'smoothControls', 'smoothPath', 'livelineSlopes', 'cubicDifferencePeak', 'simplifyChartSamples', 'goldHoverQuotes', 'nearestGoldQuote', 'goldQuoteAtOrBefore', 'goldWindowStart', 'goldTangents', 'goldPriceAt', 'goldPriceExtrema'];
const load = async (input) => {
  const { outputText } = ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
};
const curve = await load(`${pureSource}\nexport { ${exported.join(', ')} };`);
const { goldPriceHistory } = await load(await readFile(new URL('../app/gold-price-history.ts', import.meta.url), 'utf8'));

test('daily hover keeps every calendar day and carries Friday prices over the weekend', () => {
  const quote = (day, value) => ({ time: Date.UTC(2024, 0, day), value });
  const timeline = [quote(12, 10), quote(15, 12), quote(16, 13)];
  const original = structuredClone(timeline);
  const anchors = [timeline[0], timeline.at(-1)];
  const daily = curve.goldHoverQuotes(timeline, timeline[0].time, anchors);
  assert.deepEqual(daily, [quote(12, 10), quote(13, 10), quote(14, 10), quote(15, 12), quote(16, 13)]);
  assert.deepEqual(curve.goldHoverQuotes(timeline, timeline[0].time, anchors, 'day'), daily);
  assert.equal(curve.nearestGoldQuote(Date.UTC(2024, 0, 14), daily).value, 10);
  assert.equal(curve.nearestGoldQuote(Date.UTC(2024, 0, 15), daily).value, 12);
  assert.equal(daily[0], anchors[0]);
  assert.equal(daily.at(-1), anchors.at(-1));
  assert.deepEqual(timeline, original);
});

test('monthly hover uses the price effective on the UTC 15th through leap February and partial months', () => {
  const quote = (month, day, value) => ({ time: Date.UTC(2024, month - 1, day), value });
  const timeline = [quote(1, 1, 10), quote(1, 14, 12), quote(1, 16, 13), quote(2, 14, 20), quote(2, 16, 22), quote(2, 29, 23), quote(3, 12, 30), quote(3, 20, 31), quote(4, 10, 32)];
  const original = structuredClone(timeline);
  const anchors = [timeline[0], timeline.at(-1)];
  const monthly = curve.goldHoverQuotes(timeline, timeline[0].time, anchors, 'month');
  assert.deepEqual(monthly, [anchors[0], quote(1, 15, 12), quote(2, 15, 20), quote(3, 15, 30), anchors[1]]);
  const partialAnchors = [timeline[2], timeline.at(-1)];
  const partial = curve.goldHoverQuotes(timeline, timeline[2].time, partialAnchors, 'month');
  assert.deepEqual(partial, [partialAnchors[0], quote(2, 15, 20), quote(3, 15, 30), partialAnchors[1]]);
  assert.ok(partial.every(({ time }) => time >= partialAnchors[0].time && time <= partialAnchors[1].time));
  const midpoint = (monthly[1].time + monthly[2].time) / 2;
  assert.equal(curve.nearestGoldQuote(midpoint, monthly), monthly[1]);
  assert.equal(curve.nearestGoldQuote(midpoint + 1, monthly), monthly[2]);
  assert.equal(curve.nearestGoldQuote(Date.UTC(2024, 3, 10), monthly), anchors[1]);
  assert.equal(curve.nearestGoldQuote(0, []), null);
  assert.deepEqual(timeline, original);
});

test('long monthly windows preserve exact desktop and mobile milestones without changing source history', () => {
  const timeline = goldPriceHistory.map(([days, value]) => ({ time: Date.UTC(2011, 0, 1) + days * 86400000, value }));
  const original = structuredClone(timeline);
  const end = timeline.at(-1).time;
  for (const months of [60, 120, 180]) {
    const start = curve.goldWindowStart(end, months, timeline);
    for (const intervals of [3, 4]) {
      const anchors = Array.from({ length: intervals + 1 }, (_, i) => {
        const time = start + (end - start) * i / intervals;
        return { time, value: curve.goldQuoteAtOrBefore(time, timeline).value };
      });
      const originalAnchors = structuredClone(anchors);
      const hovered = curve.goldHoverQuotes(timeline, start, anchors, 'month');
      assert.equal(new Set(hovered.map(({ time }) => Math.floor(time / 86400000))).size, hovered.length);
      assert.ok(hovered.length >= months && hovered.length <= months + anchors.length + 1, 'monthly candidates plus exact anchors must stay a sparse selection grid');
      assert.ok(hovered.every(({ time }, i) => time >= start && time <= end && (i === 0 || time > hovered[i - 1].time)));
      for (const anchor of anchors) {
        assert.equal(curve.nearestGoldQuote(anchor.time, hovered), anchor);
      }
      for (const point of hovered.filter((point) => !anchors.includes(point))) {
        assert.equal(new Date(point.time).getUTCDate(), 15);
        assert.equal(point.time % 86400000, 0);
        assert.equal(point.value, timeline.findLast(({ time }) => time <= point.time).value);
      }
      assert.equal(hovered[0], anchors[0]);
      assert.equal(hovered.at(-1), anchors.at(-1));
      assert.deepEqual(anchors, originalAnchors);
    }
  }
  assert.deepEqual(timeline, original);
});

test('the error bound includes the interior peak, not just endpoint differences', () => {
  assert.ok(Math.abs(curve.cubicDifferencePeak([0, 8 / 9, 8 / 9, 0]) - 1) < 1e-10);
  for (let i = 1; i <= 40; i++) {
    const f = (t) => Math.sin(i) * t ** 3 + Math.cos(i * 2) * t ** 2 + Math.sin(i * 3) * t + Math.cos(i * 4);
    const bound = curve.cubicDifferencePeak([f(0), f(1 / 3), f(2 / 3), f(1)]);
    const dense = Math.max(...Array.from({ length: 1001 }, (_, j) => Math.abs(f(j / 1000))));
    assert.ok(bound + 1e-9 >= dense);
    assert.ok(bound - dense < 1e-4);
  }
});

test('redundant collinear nodes are removed while mandatory points remain unchanged', () => {
  const baseline = Array.from({ length: 9 }, (_, x) => ({ x, y: 10 + 2 * x }));
  const original = structuredClone(baseline);
  const simplified = curve.simplifyChartSamples(baseline, new Set([0, 4, 8]), [{ start: 0, range: 100 }]);
  assert.deepEqual(simplified, [baseline[0], baseline[4], baseline[8]]);
  assert.deepEqual(baseline, original);
});

test('real CBR history keeps window boundaries and extrema within the visual error budget', () => {
  const day = 86400000;
  const origin = Date.UTC(2011, 0, 1);
  const timeline = goldPriceHistory.map(([days, value]) => ({ time: origin + days * day, value }));
  const original = structuredClone(timeline);
  const first = timeline[0].time;
  const end = timeline.at(-1).time;
  const tangents = curve.goldTangents(timeline);
  const times = [first, end];
  const mandatoryTimes = new Set(times);
  for (let time = end; time > first;) {
    const age = end - time;
    time -= (age < 180 * day ? 20 : age < 365 * day ? 30 : age < 5 * 365 * day ? 90 : 180) * day;
    if (time > first) times.push(time);
  }
  const windows = [12, 60, 120, 180].map((months) => {
    const start = curve.goldWindowStart(end, months, timeline);
    const extrema = curve.goldPriceExtrema(start, timeline, tangents);
    for (const time of [start, extrema.minimumTime, extrema.maximumTime]) { times.push(time); mandatoryTimes.add(time); }
    const minimum = Math.floor(extrema.minimum / 100) * 100;
    const maximum = Math.max(minimum + 100, Math.ceil(extrema.maximum / 100) * 100);
    return { start: (start - first) / day, range: maximum - minimum };
  });
  const baseline = [...new Set(times)].sort((a, b) => a - b).map((time) => ({ x: (time - first) / day, y: curve.goldPriceAt(time, timeline, tangents) }));
  const mandatory = new Set([...mandatoryTimes].map((time) => (time - first) / day));
  const started = performance.now();
  const simplified = curve.simplifyChartSamples(baseline, mandatory, windows);
  const smoother = curve.simplifyChartSamples(simplified, mandatory, windows, { maximumError: 7 / 500, visualSpline: true });
  const elapsed = performance.now() - started;
  const visualSlopes = curve.livelineSlopes(simplified);
  const smootherSlopes = curve.livelineSlopes(smoother);
  assert.ok(simplified.length < baseline.length, 'the experiment should remove some redundant nodes');
  for (const x of mandatory) assert.deepEqual(simplified.find((point) => point.x === x), baseline.find((point) => point.x === x));
  assert.ok(smoother.length < simplified.length, 'the smoother experiment should reduce visual nodes');
  for (const x of mandatory) assert.deepEqual(smoother.find((point) => point.x === x), baseline.find((point) => point.x === x));
  let largest = 0, livelineDifference = 0, smoothingDifference = 0;
  for (let i = 0; i < baseline.length - 1; i++) {
    const start = baseline[i].x, end = baseline[i + 1].x;
    const ranges = windows.filter((window) => start >= window.start).map((window) => window.range);
    const range = ranges.length ? Math.min(...ranges) : windows.at(-1).range;
    for (let j = 0; j <= 80; j++) {
      const x = start + (end - start) * j / 80;
      const difference = Math.abs(curve.samplePointAtX(simplified, x).y - curve.samplePointAtX(baseline, x).y);
      largest = Math.max(largest, difference / range);
      const visualDifference = Math.abs(curve.smoothPointAtX(simplified, x, visualSlopes).y - curve.samplePointAtX(simplified, x).y);
      livelineDifference = Math.max(livelineDifference, visualDifference / range);
      const smoothingDeviation = Math.abs(curve.smoothPointAtX(smoother, x, smootherSlopes).y - curve.smoothPointAtX(simplified, x, visualSlopes).y);
      smoothingDifference = Math.max(smoothingDifference, smoothingDeviation / range);
    }
  }
  assert.ok(largest <= 2 / 500 + 1e-9, `visual deviation ${largest * 500}px exceeds the budget`);
  assert.ok(smoothingDifference <= 7 / 500 + 1e-9, `smoothing deviation ${smoothingDifference * 500}px exceeds the budget`);
  assert.deepEqual(timeline, original);
  console.log(JSON.stringify({ baselineNodes: baseline.length, simplifiedNodes: simplified.length, smootherNodes: smoother.length, maximumDeviationAt500px: largest * 500, livelineShapeDifferenceAt500px: livelineDifference * 500, smootherDifferenceAt500px: smoothingDifference * 500, elapsedMs: Math.round(elapsed) }));
});

const stressCurves = [
  [[0, 10], [1, 15], [3, 17], [4, 16], [5, 20], [15, 30]],
  [[0, 6], [1, 6], [2, 6], [3, 4], [4, 4]],
  [[0, 0], [0.01, 100], [0.0101, 0], [1, -100], [1.001, 100], [10, 50]],
  [[0, 1], [1, 2]],
].map((points) => points.map(([x, y]) => ({ x, y })));

test('Liveline curves pass through their nodes, preserve extrema and have continuous tangents', () => {
  for (const points of stressCurves) {
    const original = structuredClone(points);
    const slopes = curve.livelineSlopes(points);
    for (const point of points) {
      assert.ok(Math.abs(curve.smoothPointAtX(points, point.x, slopes).y - point.y) < 1e-8);
    }
    for (let i = 0; i < points.length - 1; i++) {
      const { start, end, controlStart, controlEnd } = curve.smoothControls(points, i, slopes);
      const a = -start.y + 3 * controlStart.y - 3 * controlEnd.y + end.y;
      const b = 3 * start.y - 6 * controlStart.y + 3 * controlEnd.y;
      const c = -3 * start.y + 3 * controlStart.y;
      const positions = [0, 1];
      if (Math.abs(a) < 1e-10) {
        if (Math.abs(b) > 1e-10) positions.push(-c / (2 * b));
      } else {
        const discriminant = 4 * b * b - 12 * a * c;
        if (discriminant >= 0) positions.push((-2 * b + Math.sqrt(discriminant)) / (6 * a), (-2 * b - Math.sqrt(discriminant)) / (6 * a));
      }
      for (const t of positions.filter((t) => t >= 0 && t <= 1)) {
        const y = ((a * t + b) * t + c) * t + start.y;
        assert.ok(y >= Math.min(start.y, end.y) - 1e-8 && y <= Math.max(start.y, end.y) + 1e-8, 'curve invented an overshoot');
      }
      assert.ok(Math.abs((controlStart.y - start.y) / (controlStart.x - start.x) - slopes[i]) < 1e-6);
      assert.ok(Math.abs((end.y - controlEnd.y) / (end.x - controlEnd.x) - slopes[i + 1]) < 1e-6);
    }
    assert.deepEqual(points, original);
  }
});

test('Liveline interpolation keeps the same shape during affine zoom, including inverted price axes', () => {
  for (const points of stressCurves) {
    const slopes = curve.livelineSlopes(points);
    for (const [sx, sy] of [[0.1, -0.2], [0.3, -1], [1, 1], [3, -2], [15, 4]]) {
      const projected = points.map(({ x, y }) => ({ x: 80 + x * sx, y: 400 + y * sy }));
      const projectedSlopes = curve.livelineSlopes(projected);
      for (let i = 0; i < points.length - 1; i++) {
        for (let j = 0; j <= 16; j++) {
          const x = points[i].x + (points[i + 1].x - points[i].x) * j / 16;
          const expected = 400 + curve.smoothPointAtX(points, x, slopes).y * sy;
          const actual = curve.smoothPointAtX(projected, 80 + x * sx, projectedSlopes).y;
          assert.ok(Math.abs(actual - expected) < 1e-4);
        }
      }
    }
  }
});

test('the marker and hover evaluator follows the same Bezier segments as the rendered SVG', () => {
  const points = stressCurves[0];
  const slopes = curve.livelineSlopes(points);
  const path = curve.smoothPath(points, slopes);
  const segments = [...path.matchAll(/C([^MC]+)/g)].map((match) => match[1].split(/[ ,]+/).map(Number));
  assert.equal(segments.length, points.length - 1);
  for (let i = 0; i < segments.length; i++) {
    const [, y1, , y2, x3, y3] = segments[i];
    for (const t of [0, 0.15, 0.5, 0.85, 1]) {
      const expected = (1 - t) ** 3 * points[i].y + 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3 * y3;
      const x = points[i].x + (x3 - points[i].x) * t;
      assert.ok(Math.abs(curve.smoothPointAtX(points, x, slopes).y - expected) < 1e-8);
    }
  }
});

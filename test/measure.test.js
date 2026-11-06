// Run with: node --test test/*.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../tools/measure.js');
const dart = require('./dart-vectors.json');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} vs ${b}`);

test('length display matches the app on the same values (run on its Dart code)', () => {
  for (const v of dart.lengths) {
    assert.strictEqual(L.fmtLength(v.m, 'metric'), v.metric, `${v.m} metric`);
    assert.strictEqual(L.fmtLength(v.m, 'imperial'), v.imperial, `${v.m} imperial`);
  }
  for (const v of dart.areas) {
    assert.strictEqual(L.fmtArea(v.m2, 'metric'), v.metric, `${v.m2} metric`);
    assert.strictEqual(L.fmtArea(v.m2, 'imperial'), v.imperial, `${v.m2} imperial`);
  }
});

test('vectors from the app tests', () => {
  assert.strictEqual(L.fmtLength(0.62, 'metric'), '62 cm');
  assert.strictEqual(L.fmtLength(0.625, 'metric'), '62.5 cm');
  assert.strictEqual(L.fmtLength(1.2, 'metric'), '1.20 m');
  assert.strictEqual(L.fmtLength(0.1, 'imperial'), '3.9 in');
  assert.strictEqual(L.fmtLength(1.2, 'imperial'), '3 ft 11.2 in');
  assert.strictEqual(L.fmtLength(0.3048 * 2 - 0.0001, 'imperial'), '2 ft 0 in');
  assert.strictEqual(L.fmtArea(0.744, 'metric'), '0.74 m²');
  assert.strictEqual(L.fmtArea(1, 'imperial'), '10.8 ft²');
});

test('polygon area and perimeter match the app', () => {
  for (const v of dart.polys) {
    close(L.area3d(v.points), v.area);
    close(L.perimeter3d(v.points), v.perimeter);
  }
  const r = [[0, 0, 0], [0.62, 0, 0], [0.62, 1.2, 0.3], [0, 1.2, 0.3]];
  close(L.area3d(r), 0.62 * L.dist3d([0, 0, 0], [0, 1.2, 0.3]));
  close(L.area3d([[0, 0, 0], [1, 0, 0], [0, 1, 0]]), 0.5);
});

test('known conversions', () => {
  close(L.parseLength("5' 10\"", 'ft'), 1.778);
  close(L.parseLength('6 ft', 'ft'), 1.8288);
  close(L.parseLength('100 cm', 'm'), 1);
  close(L.parseLength('1 in', 'm'), 0.0254);
  assert.strictEqual(L.fmtFeetInches(1.778), '5 ft 10 in');
  assert.strictEqual(L.fmtFeetInches(1), '3 ft 3 3/8 in');
  assert.strictEqual(L.fmtFeetInches(0.0254), '1 in');
  assert.strictEqual(L.fmtFeetInches(0), '0 in');
});

test('fractions reduce, and rounding carries through inches and feet', () => {
  const inches = (n) => n * 0.0254;
  assert.strictEqual(L.fmtFeetInches(inches(10.5)), '10 1/2 in');
  assert.strictEqual(L.fmtFeetInches(inches(10.25)), '10 1/4 in');
  assert.strictEqual(L.fmtFeetInches(inches(0.0625)), '1/16 in');
  assert.strictEqual(L.fmtFeetInches(inches(70.5)), '5 ft 10 1/2 in');
  assert.strictEqual(L.fmtFeetInches(inches(11.99)), '1 ft 0 in');            // 15.84/16 rounds up to the next foot
  assert.strictEqual(L.fmtFeetInches(inches(23.98)), '2 ft 0 in');
  assert.strictEqual(L.fmtFeetInches(inches(10.98)), '11 in');
  assert.strictEqual(L.fmtFeetInches(inches(10.5), 2), '10 1/2 in');
  assert.strictEqual(L.fmtFeetInches(inches(10.3), 4), '10 1/4 in');
  assert.strictEqual(L.fmtFeetInches(inches(10.3), 32), '10 5/16 in');
  assert.strictEqual(L.fmtFeetInches(inches(10.03125), 32), '10 1/32 in');
  assert.strictEqual(L.fmtFeetInchesMarks(inches(70.5)), `5' 10 1/2"`);
  assert.strictEqual(L.fmtFeetInchesMarks(inches(0.5)), `1/2"`);
  const f = L.toFeetInches(inches(10.03125), 32);
  assert.deepStrictEqual([f.feet, f.inches, f.num, f.den], [0, 10, 1, 32]);
});

test('reading numbers and fractions', () => {
  assert.strictEqual(L.parseNumber('10'), 10);
  assert.strictEqual(L.parseNumber('10.5'), 10.5);
  assert.strictEqual(L.parseNumber('10,5'), 10.5);
  assert.strictEqual(L.parseNumber('1/2'), 0.5);
  assert.strictEqual(L.parseNumber('10 1/2'), 10.5);
  assert.strictEqual(L.parseNumber('10-1/2'), 10.5);
  assert.strictEqual(L.parseNumber('10½'), 10.5);
  assert.strictEqual(L.parseNumber('3/0'), null);
  assert.strictEqual(L.parseNumber(''), null);
  assert.strictEqual(L.parseNumber('-1'), null);
  assert.strictEqual(L.parseNumber('abc'), null);
});

test('reading lengths as people type them', () => {
  const ft = (a, b = 0) => a * 0.3048 + b * 0.0254;
  close(L.parseLength('12', 'ft'), ft(12));
  close(L.parseLength('12.5', 'ft'), ft(12.5));
  close(L.parseLength('12 6', 'ft'), ft(12, 6));
  close(L.parseLength('12 6 1/2', 'ft'), ft(12, 6.5));
  close(L.parseLength(`12' 6"`, 'm'), ft(12, 6));
  close(L.parseLength(`12'6 1/2"`, 'm'), ft(12, 6.5));
  close(L.parseLength('12 ft 6 in', 'm'), ft(12, 6));
  close(L.parseLength('12ft', 'm'), ft(12));
  close(L.parseLength('12 feet 6 inches', 'm'), ft(12, 6));
  close(L.parseLength('6 in', 'ft'), ft(0, 6));
  close(L.parseLength('3.6 m', 'ft'), 3.6);
  close(L.parseLength('360 cm', 'ft'), 3.6);
  close(L.parseLength('3,6', 'm'), 3.6);
  close(L.parseLength('3600 mm', 'm'), 3.6);
  assert.strictEqual(L.parseLength('12 6', 'm'), null);
  assert.strictEqual(L.parseLength('wall', 'm'), null);
  assert.strictEqual(L.parseLength('', 'm'), null);
});

test('rectangular room: the worked example on the page', () => {
  const r = L.room({ shape: 'rect', length: 5, width: 4, height: 2.5, wastePercent: 10 });
  close(r.area, 20);
  close(r.perimeter, 18);
  close(r.wallArea, 45);
  close(r.withWaste, 22);
  assert.strictEqual(r.areaFt2.toFixed(1), '215.3');
  assert.strictEqual(r.areaYd2.toFixed(2), '23.92');
});

test('feet example on the page: 12 ft 6 in by 10 ft', () => {
  const r = L.room({ shape: 'rect', length: L.parseLength('12 6', 'ft'), width: L.parseLength('10', 'ft') });
  assert.strictEqual(r.areaFt2.toFixed(1), '125.0');
  assert.strictEqual(L.fmtFeetInches(r.perimeter, 4), '45 ft 0 in');
});

test('L-shaped room: area is outer minus notch, perimeter is unchanged by the notch', () => {
  const r = L.room({ shape: 'l', length: 6, width: 5, notchLength: 2, notchWidth: 2 });
  close(r.area, 26);
  close(r.perimeter, 22);
  assert.strictEqual(r.wallArea, null);
  assert.strictEqual(r.withWaste, null);
  assert.ok(L.room({ shape: 'l', length: 6, width: 5, notchLength: 6, notchWidth: 2 }).error);
  assert.ok(L.room({ shape: 'l', length: 6, width: 5, notchLength: 0, notchWidth: 2 }).error);
  assert.ok(L.room({ shape: 'rect', length: 0, width: 5 }).error);
  assert.ok(L.room({ shape: 'rect', length: NaN, width: 5 }).error);
});

test('the area factors are consistent with 1 ft = 0.3048 m', () => {
  close(L.M2_TO_FT2, 1 / (0.3048 * 0.3048), 1e-6);
  close(L.M2_TO_YD2, 1 / (0.9144 * 0.9144), 1e-6);
});

test('every row of the table on the converter page is right', () => {
  const html = fs.readFileSync(path.join(__dirname, '../tools/length-converter.html'), 'utf8');
  const rows = [...html.matchAll(/<tr><td>(\d+) ft (\d+) in<\/td><td>([\d.]+) cm<\/td><td>([\d.]+) m<\/td><\/tr>/g)];
  assert.ok(rows.length >= 8, `found ${rows.length} rows`);
  for (const [, ft, inn, cm, m] of rows) {
    const metres = ft * 0.3048 + inn * 0.0254;
    assert.strictEqual(L.fmt(metres * 100, 2), cm, `${ft} ft ${inn} in cm`);
    assert.strictEqual(metres.toFixed(2), m, `${ft} ft ${inn} in m`);
  }
});

test('the fractions table on the converter page is right', () => {
  const html = fs.readFileSync(path.join(__dirname, '../tools/length-converter.html'), 'utf8');
  const rows = [...html.matchAll(/<tr><td>(\d+)\/(\d+) in<\/td><td>([\d.]+) mm<\/td><\/tr>/g)];
  assert.ok(rows.length >= 8, `found ${rows.length} rows`);
  for (const [, n, d, mm] of rows) assert.strictEqual(L.fmt(25.4 * n / d, 4), mm);
});

test('numbers quoted on the converter page are right', () => {
  close(70.5 * 2.54, 179.07);
  assert.strictEqual(L.fmtFeetInches(1.8, 16), '5 ft 10 7/8 in');
  assert.strictEqual((180 / 2.54).toFixed(3), '70.866');
  assert.strictEqual(((180 / 2.54 - 70) * 16).toFixed(1), '13.9');
  const f = L.toFeetInches(1.8, 16);
  assert.ok(Math.abs(f.roundedMetres - 1.8) * 1000 < 0.25, 'about 0.2 mm off');
  assert.ok(Math.abs(f.roundedMetres - 1.8) * 1000 > 0.15, 'about 0.2 mm off');
  assert.strictEqual(L.fmtFeetInches(11.99 * 0.0254, 16), '1 ft 0 in');
  assert.strictEqual(L.fmt(70 * 2.54, 2), '177.8');
  assert.strictEqual((180 / 2.54 - 60).toFixed(2), '10.87');
});

test('numbers quoted in the guides are right', () => {
  close(5.05 * 4.04, 20.402);
  close(18 - 0.8, 17.2);
  close(0.5 * 0.01 * 1000, 5);
});

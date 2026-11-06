/* MeasureLog length converter and room calculator: logic only, no browser APIs,
   so it also runs under node (see test/measure.test.js). fmtLength, fmtArea,
   area3d and dist3d are ported from the app's lib/logic/units.dart and
   geometry.dart, so the site and the app agree. Lengths are held in metres.
   1 inch is exactly 25.4 mm by definition. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MeasureLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var INCH = 0.0254, FOOT = 0.3048;
  var M2_TO_FT2 = 10.7639104, M2_TO_YD2 = 1.19599005;

  var UNICODE = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8' };

  function normalise(text) {
    var s = String(text === undefined || text === null ? '' : text).trim().toLowerCase();
    s = s.replace(/[½¼¾⅛⅜⅝⅞]/g, function (c) { return ' ' + UNICODE[c]; });
    s = s.replace(/[’′]/g, "'").replace(/[”″]/g, '"');
    return s.replace(/,/g, '.').replace(/\s+/g, ' ').trim();
  }

  /* "10", "10.5", "1/2", "10 1/2", "10-1/2", "10½". Null if it is none of these. */
  function parseNumber(text) {
    var s = normalise(text);
    var m;
    if (/^\d+(\.\d*)?$|^\.\d+$/.test(s)) return Number(s);
    if ((m = /^(\d+)[ -](\d+)\/(\d+)$/.exec(s))) return Number(m[3]) ? Number(m[1]) + Number(m[2]) / Number(m[3]) : null;
    if ((m = /^(\d+)\/(\d+)$/.exec(s))) return Number(m[2]) ? Number(m[1]) / Number(m[2]) : null;
    return null;
  }

  var NUM = '(\\d+(?:\\.\\d*)?|\\.\\d+|\\d+[ -]\\d+/\\d+|\\d+/\\d+)';
  var FT_WORD = "(?:'|ft\\.?|foot|feet)";
  var IN_WORD = '(?:"|\'\'|in\\.?|inch|inches)';

  /* A length as people type it, to metres. A bare number takes the default unit
     ('m', 'cm', 'ft' or 'in'). In feet, "12 6" and "12 6 1/2" mean feet and inches.
     Returns null for anything it cannot read. */
  function parseLength(text, unit) {
    var s = normalise(text);
    if (!s) return null;
    var m;
    if ((m = new RegExp('^' + NUM + ' ?(?:m|metre|metres|meter|meters)$').exec(s))) return parseNumber(m[1]);
    if ((m = new RegExp('^' + NUM + ' ?(?:cm|centimetre|centimetres|centimeter|centimeters)$').exec(s))) return parseNumber(m[1]) / 100;
    if ((m = new RegExp('^' + NUM + ' ?(?:mm|millimetre|millimetres|millimeter|millimeters)$').exec(s))) return parseNumber(m[1]) / 1000;
    if ((m = new RegExp('^' + NUM + ' ?' + IN_WORD + '$').exec(s))) return parseNumber(m[1]) * INCH;
    if ((m = new RegExp('^' + NUM + ' ?' + FT_WORD + '(?:[ ,-]*' + NUM + '(?: ?' + IN_WORD + ')?)?$').exec(s))) {
      return parseNumber(m[1]) * FOOT + (m[2] ? parseNumber(m[2]) * INCH : 0);
    }
    var bare = parseNumber(s);
    if (bare !== null) {
      if (unit === 'cm') return bare / 100;
      if (unit === 'ft') return bare * FOOT;
      if (unit === 'in') return bare * INCH;
      return bare;
    }
    if (unit === 'ft' && (m = /^(\d+) (\d+(?:\.\d*)?|\d+ \d+\/\d+|\d+\/\d+)$/.exec(s))) {
      return Number(m[1]) * FOOT + parseNumber(m[2]) * INCH;
    }
    return null;
  }

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  /* Feet, inches and a reduced fraction, rounded to the nearest 1/denominator of
     an inch. Counted in whole ticks, so 11 15/16 + 1/16 carries to the next foot. */
  function toFeetInches(metres, denominator) {
    var den = denominator || 16;
    var ticks = Math.round(metres / INCH * den);
    var wholeInches = Math.floor(ticks / den);
    var rest = ticks - wholeInches * den;
    var g = rest ? gcd(rest, den) : 1;
    return {
      feet: Math.floor(wholeInches / 12),
      inches: wholeInches % 12,
      num: rest / g,
      den: rest ? den / g : 0,
      roundedMetres: ticks / den * INCH
    };
  }

  function fractionText(f) { return f.num ? f.num + '/' + f.den : ''; }

  /* "5 ft 10 1/2 in"; below one foot, "10 1/2 in". */
  function fmtFeetInches(metres, denominator) {
    var f = toFeetInches(metres, denominator);
    var inches = String(f.inches);
    if (f.num) inches = (f.inches ? f.inches + ' ' : '') + fractionText(f);
    if (!f.feet) return inches + ' in';
    return f.feet + ' ft ' + inches + ' in';
  }

  /* The same in tape-measure marks: 5' 10 1/2" */
  function fmtFeetInchesMarks(metres, denominator) {
    var f = toFeetInches(metres, denominator);
    var inches = String(f.inches);
    if (f.num) inches = (f.inches ? f.inches + ' ' : '') + fractionText(f);
    return (f.feet ? f.feet + "' " : '') + inches + '"';
  }

  /* At most `places` decimals, no trailing zeros. */
  function fmt(v, places) {
    var s = v.toFixed(places === undefined ? 2 : places);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  function trim(s) { return s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s; }

  /* The app's display: 0.62 -> "62 cm", 1.2 -> "1.20 m", 0.1 -> "3.9 in", 1.2 -> "3 ft 11.2 in". */
  function fmtLength(m, unit) {
    if (unit === 'metric') {
      if (m < 1) return trim((m * 100).toFixed(1)) + ' cm';
      return m.toFixed(2) + ' m';
    }
    var inches = m / INCH;
    if (inches < 12) return trim(inches.toFixed(1)) + ' in';
    var ft = Math.floor(inches / 12);
    var rest = Number((inches - ft * 12).toFixed(1));
    if (rest >= 12) { ft += 1; rest -= 12; }
    return ft + ' ft ' + trim(rest.toFixed(1)) + ' in';
  }

  function fmtArea(m2, unit) {
    return unit === 'metric' ? m2.toFixed(2) + ' m²' : (m2 * M2_TO_FT2).toFixed(1) + ' ft²';
  }

  /* Area of a polygon in 3D by Newell's method: same as the app and its native AR code. */
  function area3d(p) {
    var nx = 0, ny = 0, nz = 0;
    for (var i = 0; i < p.length; i++) {
      var a = p[i], b = p[(i + 1) % p.length];
      nx += a[1] * b[2] - a[2] * b[1];
      ny += a[2] * b[0] - a[0] * b[2];
      nz += a[0] * b[1] - a[1] * b[0];
    }
    return Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
  }
  function dist3d(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2));
  }
  function perimeter3d(p) {
    var s = 0;
    for (var i = 0; i < p.length; i++) s += dist3d(p[i], p[(i + 1) % p.length]);
    return s;
  }

  /* Corner points of a room on the floor plane, in metres. */
  function rectangle(length, width) {
    return [[0, 0, 0], [length, 0, 0], [length, width, 0], [0, width, 0]];
  }
  /* An L is the outer rectangle with a rectangular notch cut from one corner. */
  function lShape(length, width, notchLength, notchWidth) {
    return [[0, 0, 0], [length, 0, 0], [length, width - notchWidth, 0],
      [length - notchLength, width - notchWidth, 0], [length - notchLength, width, 0], [0, width, 0]];
  }

  /* opts: {shape: 'rect'|'l', length, width, notchLength, notchWidth, height, wastePercent}, metres.
     Returns {error} when the numbers cannot describe a room. */
  function room(opts) {
    var L = opts.length, W = opts.width;
    if (!(L > 0) || !(W > 0)) return { error: 'Enter the length and width.' };
    var poly;
    if (opts.shape === 'l') {
      var nl = opts.notchLength, nw = opts.notchWidth;
      if (!(nl > 0) || !(nw > 0)) return { error: 'Enter both sizes of the cut-out corner.' };
      if (nl >= L || nw >= W) return { error: 'The cut-out corner must be smaller than the room.' };
      poly = lShape(L, W, nl, nw);
    } else {
      poly = rectangle(L, W);
    }
    var area = area3d(poly), perimeter = perimeter3d(poly);
    var out = {
      area: area, perimeter: perimeter,
      areaFt2: area * M2_TO_FT2, areaYd2: area * M2_TO_YD2,
      wallArea: opts.height > 0 ? perimeter * opts.height : null,
      withWaste: opts.wastePercent > 0 ? area * (1 + opts.wastePercent / 100) : null
    };
    return out;
  }

  return {
    INCH: INCH, FOOT: FOOT, M2_TO_FT2: M2_TO_FT2, M2_TO_YD2: M2_TO_YD2,
    parseNumber: parseNumber, parseLength: parseLength, toFeetInches: toFeetInches,
    fractionText: fractionText, fmtFeetInches: fmtFeetInches, fmtFeetInchesMarks: fmtFeetInchesMarks,
    fmt: fmt, fmtLength: fmtLength, fmtArea: fmtArea,
    area3d: area3d, dist3d: dist3d, perimeter3d: perimeter3d, rectangle: rectangle, lShape: lShape, room: room
  };
});

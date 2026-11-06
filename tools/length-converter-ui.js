/* MeasureLog length converter: page wiring. Everything runs in this page. */
(function () {
  'use strict';
  var L = window.MeasureLogic;
  var $ = function (id) { return document.getElementById(id); };
  var feet = $('feet'), inches = $('inches'), frac = $('frac'), cm = $('cm'), m = $('m'), round = $('round');

  /* The fraction menu is always in 16ths; other denominators reduce to them.
     A value the menu cannot show (rounding to 1/32) goes in the inches box instead. */
  function showFeetInches(metres) {
    var den = Number(round.value);
    var f = L.toFeetInches(metres, den);
    feet.value = String(f.feet);
    var sixteenths = f.num ? f.num * 16 / f.den : 0;
    if (Number.isInteger(sixteenths)) {
      inches.value = String(f.inches);
      frac.value = String(sixteenths);
    } else {
      inches.value = f.inches + ' ' + L.fractionText(f);
      frac.value = '0';
    }
  }

  function clearAll(except) {
    [feet, inches, cm, m].forEach(function (el) { if (el !== except) el.value = ''; });
    if (except !== frac) frac.value = '0';
    $('out').hidden = true;
  }

  function summary(metres) {
    var den = Number(round.value);
    var f = L.toFeetInches(metres, den);
    $('r-ftin').textContent = L.fmtFeetInches(metres, den);
    $('r-marks').textContent = L.fmtFeetInchesMarks(metres, den);
    var totalIn = metres / L.INCH;
    $('r-in').textContent = L.fmt(totalIn, 3) + ' in';
    $('r-ft').textContent = L.fmt(metres / L.FOOT, 3) + ' ft';
    $('r-cm').textContent = L.fmt(metres * 100, 2) + ' cm';
    $('r-mm').textContent = L.fmt(metres * 1000, 1) + ' mm';
    $('r-m').textContent = L.fmt(metres, 4) + ' m';
    var errMm = Math.abs(f.roundedMetres - metres) * 1000;
    $('r-err').textContent = errMm < 0.005
      ? 'The fraction is exact.'
      : 'Rounded to the nearest 1/' + den + ' in, the fraction is off by ' + L.fmt(errMm, 2) + ' mm.';
    $('out').hidden = false;
  }

  function fromFeetInches() {
    var ft = feet.value.trim() === '' ? 0 : L.parseNumber(feet.value);
    var inn = inches.value.trim() === '' ? 0 : L.parseNumber(inches.value);
    var bad = ft === null || inn === null;
    feet.classList.toggle('bad', ft === null);
    inches.classList.toggle('bad', inn === null);
    if (bad || (feet.value.trim() === '' && inches.value.trim() === '' && frac.value === '0')) {
      cm.value = ''; m.value = ''; $('out').hidden = true;
      return;
    }
    var metres = ft * L.FOOT + (inn + Number(frac.value) / 16) * L.INCH;
    cm.value = L.fmt(metres * 100, 2);
    m.value = L.fmt(metres, 4);
    summary(metres);
  }

  function fromMetric(el, factor) {
    var v = L.parseNumber(el.value);
    el.classList.toggle('bad', el.value.trim() !== '' && v === null);
    if (v === null) { clearAll(el); return; }
    var metres = v / factor;
    if (el === cm) m.value = L.fmt(metres, 4); else cm.value = L.fmt(metres * 100, 2);
    showFeetInches(metres);
    summary(metres);
  }

  feet.addEventListener('input', fromFeetInches);
  inches.addEventListener('input', fromFeetInches);
  frac.addEventListener('change', fromFeetInches);
  cm.addEventListener('input', function () { fromMetric(cm, 100); });
  m.addEventListener('input', function () { fromMetric(m, 1); });
  round.addEventListener('change', function () {
    if (cm.value.trim() !== '') fromMetric(cm, 100);
  });
})();

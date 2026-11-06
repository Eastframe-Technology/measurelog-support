/* MeasureLog room calculator: page wiring. Everything runs in this page. */
(function () {
  'use strict';
  var L = window.MeasureLogic;
  var $ = function (id) { return document.getElementById(id); };
  var ids = ['length', 'width', 'nlength', 'nwidth', 'height'];

  function value(id, unit) {
    var raw = $(id).value;
    if (raw.trim() === '') { $(id).classList.remove('bad'); return 0; }
    var v = L.parseLength(raw, unit);
    $(id).classList.toggle('bad', v === null);
    return v === null ? NaN : v;
  }

  function update() {
    var unit = $('unit').value;
    var isL = $('shape').value === 'l';
    $('notch').hidden = !isL;
    var hint = unit === 'ft' ? 'Type feet, or feet and inches such as 12 6 or 12\' 6"' : 'Type meters, or add a unit such as 360 cm';
    $('hint').textContent = hint;
    var r = L.room({
      shape: $('shape').value,
      length: value('length', unit), width: value('width', unit),
      notchLength: value('nlength', unit), notchWidth: value('nwidth', unit),
      height: value('height', unit),
      wastePercent: Number($('waste').value)
    });
    var touched = $('length').value.trim() !== '' || $('width').value.trim() !== '';
    var err = $('err');
    if (r.error) {
      $('out').hidden = true;
      err.textContent = touched ? r.error : '';
      err.hidden = !touched;
      return;
    }
    err.hidden = true;
    $('r-area').textContent = L.fmt(r.area, 2) + ' m²';
    $('r-ft2').textContent = L.fmt(r.areaFt2, 1) + ' ft²';
    $('r-yd2').textContent = L.fmt(r.areaYd2, 2) + ' yd²';
    $('r-per').textContent = L.fmt(r.perimeter, 2) + ' m';
    $('r-perft').textContent = L.fmtFeetInches(r.perimeter, 4);
    var wall = $('r-wallrow'), waste = $('r-wasterow');
    wall.hidden = r.wallArea === null;
    if (r.wallArea !== null) {
      $('r-wall').textContent = L.fmt(r.wallArea, 2) + ' m² (' + L.fmt(r.wallArea * L.M2_TO_FT2, 1) + ' ft²)';
    }
    waste.hidden = r.withWaste === null;
    if (r.withWaste !== null) {
      $('r-waste').textContent = L.fmt(r.withWaste, 2) + ' m² (' + L.fmt(r.withWaste * L.M2_TO_FT2, 1) + ' ft²)';
    }
    $('out').hidden = false;
  }

  ids.forEach(function (id) { $(id).addEventListener('input', update); });
  ['unit', 'shape', 'waste'].forEach(function (id) { $(id).addEventListener('change', update); });
  update();
})();

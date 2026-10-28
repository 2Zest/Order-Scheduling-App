(function () {
  function money(c) {
    var v = c / 100;
    if (v >= 10000) return (v / 10000).toFixed(v >= 100000 ? 0 : 1) + '万';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return String(Math.round(v));
  }

  function bar(data) {
    var W = 320, H = 152, padL = 34, padR = 6, padT = 12, padB = 24;
    var pw = W - padL - padR, ph = H - padT - padB;
    var n = data.length || 1;
    var max = 1;
    data.forEach(function (d) { if (d.value > max) max = d.value; });
    var slot = pw / n, bw = Math.min(26, slot * 0.56);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="152" preserveAspectRatio="xMidYMid meet" role="img" aria-label="收入趋势">';
    s += '<line x1="' + padL + '" y1="' + (padT + ph) + '" x2="' + (W - padR) + '" y2="' + (padT + ph) + '" stroke="#E8DAC0" stroke-width="1"/>';
    s += '<line x1="' + padL + '" y1="' + (padT + ph / 2) + '" x2="' + (W - padR) + '" y2="' + (padT + ph / 2) + '" stroke="#F1E5CE" stroke-width="1" stroke-dasharray="3 3"/>';
    s += '<text x="' + (padL - 5) + '" y="' + (padT + 4) + '" font-size="9" fill="#B6A893" text-anchor="end">' + money(max) + '</text>';
    s += '<text x="' + (padL - 5) + '" y="' + (padT + ph) + '" font-size="9" fill="#B6A893" text-anchor="end">0</text>';
    data.forEach(function (d, i) {
      var cx = padL + slot * i + slot / 2;
      var h = d.value > 0 ? Math.max(3, d.value / max * ph) : 2;
      var y = padT + ph - h;
      var fill = d.cur ? '#F5C242' : (d.value > 0 ? '#FFE7B0' : '#F5EFE0');
      s += '<rect x="' + (cx - bw / 2) + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="4" fill="' + fill + '">';
      s += '<animate attributeName="height" from="0" to="' + h + '" dur="0.45s" fill="freeze"/>';
      s += '<animate attributeName="y" from="' + (padT + ph) + '" to="' + y + '" dur="0.45s" fill="freeze"/></rect>';
      if (d.value > 0 && (d.cur || d.value === max)) {
        s += '<text x="' + cx + '" y="' + (y - 4) + '" font-size="9" fill="#8C7B65" text-anchor="middle">' + money(d.value) + '</text>';
      }
      s += '<text x="' + cx + '" y="' + (padT + ph + 14) + '" font-size="9" fill="' + (d.cur ? '#D99A10' : '#B6A893') + '" text-anchor="middle">' + d.label + '</text>';
    });
    return s + '</svg>';
  }

  function donut(data, centerTop, centerSub) {
    var R = 54, CX = 70, CY = 70, SW = 26, C = 2 * Math.PI * R;
    var total = data.reduce(function (s, d) { return s + d.value; }, 0);
    var s = '<svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="占比">';
    s += '<g transform="rotate(-90 ' + CX + ' ' + CY + ')" fill="none" stroke-width="' + SW + '">';
    if (total <= 0) {
      s += '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" stroke="#F1E5CE"/>';
    } else {
      var acc = 0;
      data.forEach(function (d) {
        if (d.value <= 0) return;
        var len = d.value / total * C;
        s += '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" stroke="' + d.color + '"' +
          ' stroke-dasharray="' + (len - 1.5 > 0 ? len - 1.5 : len) + ' ' + (C - len + 1.5) + '"' +
          ' stroke-dashoffset="' + (-acc) + '"/>';
        acc += len;
      });
    }
    s += '</g>';
    if (centerTop) s += '<text x="70" y="66" font-size="15" font-weight="700" fill="#4A3B2A" text-anchor="middle">' + centerTop + '</text>';
    if (centerSub) s += '<text x="70" y="82" font-size="10" fill="#8C7B65" text-anchor="middle">' + centerSub + '</text>';
    return s + '</svg>';
  }

  window.LX.charts = { bar: bar, donut: donut, money: money };
})();

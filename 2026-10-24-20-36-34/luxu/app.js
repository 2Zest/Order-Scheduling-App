(function () {
  var S = window.LX.store, V = window.LX.views;
  var $=function(s){return document.querySelector(s)};
  var UI = { tab:'today', filter:'all', q:'', calYM:S.curYM(), incYM:S.curYM(), sheet:null, sheetId:null, tmpId:null };
  var TITLES = { today:'待办', orders:'订单', income:'收入' };

  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2000);
  }

  function render() {
    var v = $('#view'), h = '';
    if (UI.tab === 'today') h = V.today(UI.calYM);
    else if (UI.tab === 'orders') h = V.orders(UI.filter, UI.q);
    else h = V.income(UI.incYM);
    v.innerHTML = h;
    $('#tbTitle').textContent = TITLES[UI.tab];
    var r = $('#tbRight');
    if (UI.tab === 'today') r.innerHTML = '<button class="tb-btn" data-act="settings" aria-label="设置">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg></button>';
    else if (UI.tab === 'income') r.innerHTML = '<button class="tb-btn" data-act="incm" data-v="-1">‹</button>'
      + '<button class="tb-pill" data-act="incm" data-v="0">' + (+UI.incYM.slice(5, 7)) + ' 月</button>'
      + '<button class="tb-btn" data-act="incm" data-v="1">›</button>';
    else r.innerHTML = '';
    fillPhotos();
  }

  function fillPhotos() {
    var imgs = document.querySelectorAll('[data-ph]');
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        if (img.dataset.loaded) return;
        img.dataset.loaded = '1';
        var id = img.getAttribute('data-ph');
        S.thumbURL(id).then(function (u) { if (u) img.src = u; });
      })(imgs[i]);
    }
  }

  function openSheet(html, kind, id) {
    UI.sheet = kind; UI.sheetId = id || null;
    $('#sheetBody').innerHTML = html;
    $('#sheet').hidden = false;
    $('#sheetBody').scrollTop = 0;
    fillPhotos();
    if (kind === 'detail') fillDetailPhotos(id);
    if (kind === 'form') fillFormPhotos();
    if (kind === 'settings') quota();
  }
  function closeSheet() {
    if (UI.sheet === 'form' && UI.tmpId && !UI.sheetId) { S.delPhotos(UI.tmpId); UI.tmpId = null; }
    $('#sheet').hidden = true; $('#sheetBody').innerHTML = '';
    $('#sheetBody').style.transform = '';
    var mk = $('#sheet').querySelector('.sheet-mask'); if (mk) mk.style.opacity = '';
    UI.sheet = null; UI.sheetId = null;
  }

  // 下拉小杠关闭半页面
  function bindSheetDrag() {
    var body = $('#sheetBody');
    var on = false, y0 = 0, dy = 0, t0 = 0;

    function mask(v) {
      var mk = $('#sheet').querySelector('.sheet-mask');
      if (mk) mk.style.opacity = v == null ? '' : String(v);
    }
    body.addEventListener('pointerdown', function (e) {
      if ($('#sheet').hidden) return;
      if (e.target.closest && e.target.closest('.sh-close')) return;   // 返回按钮不触发下拉
      var t = e.target.closest ? e.target.closest('.sh-grab,.sh-t') : null;
      if (!t) return;
      on = true; y0 = e.clientY; dy = 0; t0 = Date.now();
      body.classList.add('dragging');
      try { t.setPointerCapture(e.pointerId); } catch (err) {}
    }, { passive: true });

    body.addEventListener('pointermove', function (e) {
      if (!on) return;
      dy = Math.max(0, e.clientY - y0);
      body.style.transform = 'translateY(' + dy + 'px)';
      mask(Math.max(0.12, 1 - dy / 420));
    });

    function end() {
      if (!on) return;
      on = false;
      body.classList.remove('dragging');
      var v = dy / Math.max(1, Date.now() - t0);   // px/ms
      body.style.transform = '';
      mask();
      var far = dy > 88;                     // 拉过 88px 直接关
      var flick = dy > 45 && v > 0.35;       // 快速下甩也关，轻微误触不算
      if (far || flick) { closeSheet(); render(); }
      dy = 0;
    }
    body.addEventListener('pointerup', end);
    body.addEventListener('pointercancel', end);
  }

  function fillFormPhotos() {
    var box = $('#f-photos'); if (!box) return;
    var h = '';
    UI.formPhotos = UI.formPhotos || [];
    UI.formPhotos.forEach(function (id) {
      h += '<div class="ph"><img data-ph="' + id + '" alt=""><span class="del" data-act="delphoto" data-pid="' + id + '">×</span></div>';
    });
    if (UI.formPhotos.length < S.state.settings.maxPhotos) {
      h += '<button class="ph add" data-act="addphoto"><span style="font-size:20px">+</span>添加</button>';
    }
    box.innerHTML = h;
    fillPhotos();
  }

  function fillDetailPhotos(id) {
    var box = $('#d-photos'), wrap = $('#ph-add-wrap');
    if (wrap) wrap.innerHTML = '<button class="tb-btn" data-act="addphoto" data-id="' + id + '" style="width:auto;padding:0 10px;height:28px;font-size:12px">+ 添加</button>';
    if (!box) return;
    var timeout = new Promise(function (r) { setTimeout(function () { r(null); }, 1500); });
    Promise.race([S.photosOf(id), timeout]).then(function (list) {
      var o = S.getOrder(id);
      if (!list || !list.length) { box.innerHTML = '<div style="font-size:13px;color:#B6A893">还没上传参考图</div>'; return; }
      var h = '';
      list.forEach(function (p) {
        h += '<div class="ph"><img data-ph="' + p.id + '" data-view="' + p.id + '" alt=""><span class="del" data-act="delphoto" data-pid="' + p.id + '" data-oid="' + id + '">×</span></div>';
      });
      box.innerHTML = h;
      if (o) { o.photoIds = list.map(function (p) { return p.id; }); S.commit(); }
      fillPhotos();
    });
  }

  function quota() {
    var el = $('#quota'); if (!el) return;
    S.estimate().then(function (e) {
      if (!e || !e.usage) { el.textContent = '未知'; return; }
      var mb = e.usage / 1048576;
      el.textContent = mb < 1 ? Math.round(e.usage / 1024) + ' KB' : mb.toFixed(1) + ' MB';
    });
  }

  function download(name, blob) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
  }
  function doExport() {
    download('鹿叙备份-' + S.today() + '.json', new Blob([JSON.stringify(S.exportData())], { type: 'application/json' }));
    S.markBackup(); toast('备份已保存到「文件」'); render();
  }
  function doICS() {
    var n = (S.ics().match(/BEGIN:VEVENT/g) || []).length;
    if (!n) { toast('当前没有需要提醒的订单'); return; }
    download('鹿叙日程.ics', new Blob([S.ics()], { type: 'text/calendar;charset=utf-8' }));
    toast('已导出 ' + n + ' 条日程，点开加入日历');
  }

  function saveForm() {
    var customer = $('#f-customer').value.trim();
    var amount = parseFloat($('#f-amount').value);
    var due = $('#f-due').value;
    if (!customer) { toast('请填客户名称'); return; }
    if (!(amount > 0)) { toast('请填客单收入'); return; }
    if (!due) { toast('请选择送达日期'); return; }
    var lead = UI.formLead != null ? UI.formLead : S.state.settings.shipLeadDays;
    var buyPre = UI.formBuyPre != null ? UI.formBuyPre : 3;
    var data = {
      customer: customer,
      contact: $('#f-contact').value.trim(),
      requirement: $('#f-req').value.trim(),
      amountCents: Math.round(amount * 100),
      dueDate: due,
      delivery: UI.formDelivery,
      cat: UI.formCat || S.state.settings.cats[0],
      source: UI.formSrc || S.state.settings.sources[0],
      shipLead: lead,
      buyLead: lead + buyPre,
      note: $('#f-note').value.trim(),
      photoIds: (UI.formPhotos || []).slice()
    };
    if (UI.sheetId) {
      S.updateOrder(UI.sheetId, data);
      toast('已保存');
      var id = UI.sheetId;
      UI.formPhotos = null;
      openSheet(V.detail(id), 'detail', id);
    } else {
      var o = S.addOrder(data);
      if (UI.tmpId) S.rebindPhotos(UI.tmpId, o.id);
      S.commit(function () { });
      UI.tmpId = null; UI.formPhotos = null;
      closeSheet();
      toast('已记一单 ¥' + S.fmt(o.amountCents));
    }
    render();
  }

  function pickPhotos(orderId) {
    var input = $('#photoInput');
    input.value = '';
    input.dataset.oid = orderId || '';
    input.click();
  }
  function handlePhotos(files, oid) {
    var n = files.length;
    if (!n) return;
    var target = oid || UI.tmpId;
    var i = 0;
    toast('正在处理图片…');
    function next() {
      if (i >= n) {
        if (!oid) fillFormPhotos(); else fillDetailPhotos(oid);
        toast('已添加 ' + n + ' 张');
        return;
      }
      S.addPhoto(target, files[i]).then(function (id) {
        if (!oid) { UI.formPhotos = UI.formPhotos || []; UI.formPhotos.push(id); }
        i++; next();
      }).catch(function () { i++; next(); });
    }
    next();
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var pickBtn = t.closest ? t.closest('#f-delivery button') : null;
    if (pickBtn) {
      var box = pickBtn.parentNode;
      for (var i = 0; i < box.children.length; i++) box.children[i].classList.remove('on');
      pickBtn.classList.add('on');
      UI.formDelivery = pickBtn.getAttribute('data-v');
      return;
    }
    var catBtn = t.closest ? t.closest('#f-cat button') : null;
    if (catBtn) {
      var cb = catBtn.parentNode;
      for (var ci = 0; ci < cb.children.length; ci++) cb.children[ci].classList.remove('on');
      catBtn.classList.add('on');
      UI.formCat = catBtn.getAttribute('data-v');
      return;
    }
    var leadBtn = t.closest ? t.closest('#f-lead button') : null;
    if (leadBtn) {
      var lb = leadBtn.parentNode;
      for (var li = 0; li < lb.children.length; li++) lb.children[li].classList.remove('on');
      leadBtn.classList.add('on');
      UI.formLead = +leadBtn.getAttribute('data-v');
      return;
    }
    var bpreBtn = t.closest ? t.closest('#f-buypre button') : null;
    if (bpreBtn) {
      var pb = bpreBtn.parentNode;
      for (var pi = 0; pi < pb.children.length; pi++) pb.children[pi].classList.remove('on');
      bpreBtn.classList.add('on');
      UI.formBuyPre = +bpreBtn.getAttribute('data-v');
      return;
    }
    var srcBtn = t.closest ? t.closest('#f-source button') : null;
    if (srcBtn) {
      var sb = srcBtn.parentNode;
      for (var si = 0; si < sb.children.length; si++) sb.children[si].classList.remove('on');
      srcBtn.classList.add('on');
      UI.formSrc = srcBtn.getAttribute('data-v');
      return;
    }
    var segBtn = t.closest ? t.closest('.seg button') : null;
    if (segBtn && segBtn.parentNode.querySelector('[data-act="basis"]')) {
      var bx = segBtn.parentNode;
      for (var j = 0; j < bx.children.length; j++) bx.children[j].classList.remove('on');
      segBtn.classList.add('on');
    }

    var el = t.closest ? t.closest('[data-act]') : null;
    if (!el) {
      var view = t.closest ? t.closest('[data-view]') : null;
      if (view) {
        var pid = view.getAttribute('data-view');
        S.photoURL(pid).then(function (u) { if (u) { $('#viewerImg').src = u; $('#viewer').hidden = false; } });
      }
      return;
    }
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');

    if (act === 'todo') {
      var oid = el.getAttribute('data-oid');
      var o = oid && S.getOrder(oid);
      if (o) {
        var msg = S.advance(o);
        toast(msg || '已更新');
      } else {
        S.toggleTodo(el.getAttribute('data-key'));
      }
      render();
      return;
    }
    if (act === 'open') { openSheet(V.detail(id), 'detail', id); return; }
    if (act === 'edit') { var eo = S.getOrder(id); UI.formPhotos = null; UI.formDelivery = eo.delivery; UI.formCat = S.catOf(eo); UI.formSrc = S.srcOf(eo); UI.formLead = eo.shipLead != null ? eo.shipLead : S.state.settings.shipLeadDays; UI.formBuyPre = (eo.buyLead != null && eo.shipLead != null) ? Math.max(0, eo.buyLead - eo.shipLead) : 3; UI.tmpId = id; openSheet(V.form(eo), 'form', id); return; }
    if (act === 'close-sheet') { closeSheet(); render(); return; }
    if (act === 'close-viewer') { $('#viewer').hidden = true; return; }
    if (act === 'filter') { UI.filter = el.getAttribute('data-f'); render(); return; }
    if (act === 'cal') { UI.calYM = el.getAttribute('data-m'); render(); return; }
    if (act === 'incm') {
      var v = el.getAttribute('data-v');
      UI.incYM = v === '0' ? S.curYM() : S.shiftYM(UI.incYM, +v);
      render(); return;
    }
    if (act === 'day') { openSheet(V.dayPop(el.getAttribute('data-d')), 'day'); return; }
    if (act === 'settings') { openSheet(V.settings(), 'settings'); return; }
    if (act === 'addphoto') { pickPhotos(id || null); return; }
    if (act === 'delphoto') {
      var pid2 = el.getAttribute('data-pid'), oid2 = el.getAttribute('data-oid') || UI.sheetId || UI.tmpId;
      S.delPhoto(pid2);
      UI.formPhotos = (UI.formPhotos || []).filter(function (x) { return x !== pid2; });
      if (oid2) {
        S.commit(function () {
          var o = S.getOrder(oid2);
          if (o) o.photoIds = (o.photoIds || []).filter(function (x) { return x !== pid2; });
        });
      }
      setTimeout(function () { if (UI.sheet === 'form') fillFormPhotos(); else if (UI.sheetId) fillDetailPhotos(UI.sheetId); }, 60);
      return;
    }
    if (act === 'status') {
      S.setStatus(id, el.getAttribute('data-v'));
      toast('状态已更新');
      render();
      if (UI.sheet === 'detail') openSheet(V.detail(id), 'detail', id);
      return;
    }
    if (act === 'del') {
      if (!confirm('删除订单「' + S.getOrder(id).customer + '」？不可恢复')) return;
      S.delOrder(id); closeSheet(); render(); toast('已删除'); return;
    }
    if (act === 'save') { saveForm(); return; }
    if (act === 'export') { doExport(); return; }
    if (act === 'ics') { doICS(); return; }
    if (act === 'import') { $('#importInput').value = ''; $('#importInput').click(); return; }
    if (act === 'setd') {
      var k = el.getAttribute('data-k'), v = +el.getAttribute('data-v');
      var cur = S.state.settings[k];
      var nv = Math.max(0, Math.min(30, cur + v));
      S.state.settings[k] = nv; S.saveSettings();
      openSheet(V.settings(), 'settings'); render();
      return;
    }
    if (act === 'addcat') {
      var inp = document.getElementById('newcat');
      var name = inp && inp.value.trim();
      if (!name) { toast('请输入分类名'); return; }
      S.addCat(name);
      openSheet(V.settings(), 'settings');
      toast('已添加「' + name + '」');
      return;
    }
    if (act === 'delcat') {
      var idx = +el.getAttribute('data-i');
      var cats = S.state.settings.cats;
      var rm = cats[idx];
      if (cats.length <= 1) { toast('至少保留一个分类'); return; }
      cats.splice(idx, 1);
      S.state.orders.forEach(function (o) { if (o.cat === rm) o.cat = cats[0]; });
      S.saveSettings(); S.commit();
      openSheet(V.settings(), 'settings'); render();
      toast('已删除「' + rm + '」');
      return;
    }
    if (act === 'addsrc') {
      var sinp = document.getElementById('newsrc');
      var sname = sinp && sinp.value.trim();
      if (!sname) { toast('请输入客源名'); return; }
      S.addSrc(sname);
      openSheet(V.settings(), 'settings');
      toast('已添加「' + sname + '」');
      return;
    }
    if (act === 'delsrc') {
      var sidx = +el.getAttribute('data-i');
      var srcs = S.state.settings.sources;
      var srm = srcs[sidx];
      if (srcs.length <= 1) { toast('至少保留一个客源'); return; }
      srcs.splice(sidx, 1);
      S.state.orders.forEach(function (o) { if (o.source === srm) o.source = srcs[0]; });
      S.saveSettings(); S.commit();
      openSheet(V.settings(), 'settings'); render();
      toast('已删除「' + srm + '」');
      return;
    }
    if (act === 'basis') {
      S.state.settings.incomeBasis = el.getAttribute('data-v'); S.saveSettings();
      openSheet(V.settings(), 'settings'); render();
      return;
    }
    if (act === 'wipe') {
      if (!confirm('清空全部订单和图片？建议先导出备份')) return;
      if (!confirm('再确认一次：真的要清空吗？')) return;
      S.commit(function () { S.state.orders = []; });
      S.state.todoDone = {}; localStorage.setItem(S.K.todo, '{}');
      closeSheet(); render(); toast('已清空');
      return;
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'q') {
      UI.q = e.target.value;
      var pos = e.target.selectionStart;
      render();
      var n = $('#q');
      if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} }
    }
  });

  $('#fab').addEventListener('click', function () {
    UI.formPhotos = []; UI.formDelivery = 'sf'; UI.formCat = S.state.settings.cats[0];
    UI.formSrc = S.state.settings.sources[0]; UI.formLead = S.state.settings.shipLeadDays; UI.formBuyPre = 3;
    UI.tmpId = 'tmp_' + Date.now().toString(36);
    openSheet(V.form(null), 'form');
  });

  var tabs = document.querySelectorAll('.tab');
  for (var k = 0; k < tabs.length; k++) {
    tabs[k].addEventListener('click', function () {
      for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('on');
      this.classList.add('on');
      UI.tab = this.getAttribute('data-tab');
      $('#view').scrollTop = 0; window.scrollTo(0, 0);
      render();
    });
  }

  $('#photoInput').addEventListener('change', function () {
    var files = Array.prototype.slice.call(this.files || []);
    var oid = this.dataset.oid || null;
    if (files.length) handlePhotos(files, oid);
  });
  $('#importInput').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        S.importData(JSON.parse(r.result));
        closeSheet(); render(); toast('导入成功');
      } catch (err) { toast('导入失败：' + err.message); }
    };
    r.readAsText(f);
  });

  S.load();
  (function applyDeepLink() {
    try {
      var qs = new URLSearchParams(location.search);
      var tab = qs.get('tab');
      if (tab && TITLES[tab]) {
        UI.tab = tab;
        for (var i = 0; i < tabs.length; i++) {
          tabs[i].classList.toggle('on', tabs[i].getAttribute('data-tab') === tab);
        }
      }
      if (qs.get('ym')) { UI.calYM = qs.get('ym'); UI.incYM = qs.get('ym'); }
    } catch (e) {}
  })();
  bindSheetDrag();
  render();
  (function openDeepLink() {
    try {
      var qs = new URLSearchParams(location.search);
      if (qs.get('settings')) openSheet(V.settings(), 'settings');
      if (qs.get('open') === 'form') { UI.formPhotos = []; UI.formDelivery = 'sf'; UI.formCat = S.state.settings.cats[0]; UI.formSrc = S.state.settings.sources[0]; UI.formLead = S.state.settings.shipLeadDays; UI.formBuyPre = 3; UI.tmpId = 'tmp_' + Date.now().toString(36); openSheet(V.form(null), 'form'); }
      var oid = qs.get('order');
      if (oid && S.getOrder(oid)) openSheet(V.detail(oid), 'detail', oid);
      var day = qs.get('day');
      if (day) openSheet(V.dayPop(day), 'day');
    } catch (e) {}
  })();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            toast('有新版本，关闭重开即可更新');
          }
        });
      });
    }).catch(function () {});
  }
})();

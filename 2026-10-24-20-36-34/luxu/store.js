(function () {
  var K = {
    orders: 'luxu.orders.v1', bak: 'luxu.orders.bak.v1',
    settings: 'luxu.settings.v1', todo: 'luxu.todoDone.v1', meta: 'luxu.meta.v1'
  };
  var DEF_SET = {
    shipLeadDays: 3, buyLeadDays: 3, incomeBasis: 'created',
    maxPhotos: 9, backupRemindDays: 7, embedThumb: false,
    cats: ['花束定制', '剧本杀定制', '专辑定制', '照片定制'],
    sources: ['抖音', '咸鱼', '小红书', '微信', '朋友介绍']
  };
  var DELIVERY = { sf: '顺丰', other: '其他物流', local: '本地' };
  var STATUS = [
    { k: 'tobuy', t: '待采购' }, { k: 'ready', t: '待发货' },
    { k: 'done', t: '已完成' }, { k: 'canceled', t: '已取消' }
  ];

  var BUILD = 'v16';
  var state = { orders: [], settings: {}, todoDone: {}, meta: {} };

  function d2s(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function s2d(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return d2s(new Date()); }
  function nowISO() { return new Date().toISOString(); }
  function daysUntil(s) { return Math.round((s2d(s) - s2d(today())) / 86400000); }
  function addDays(s, n) { return d2s(new Date(s2d(s).getTime() + n * 86400000)); }
  function ym(s) { return String(s).slice(0, 7); }
  function curYM() { return today().slice(0, 7); }
  function shiftYM(m, n) {
    var p = m.split('-'), d = new Date(+p[0], +p[1] - 1 + n, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function fmt(c) { return (c / 100).toFixed(2).replace(/\.00$/, ''); }
  function fmt2(c) {
    var v = (c / 100).toFixed(2), p = v.split('.');
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + p[1];
  }
  function uid(p) { return (p || 'o') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function load() {
    try { state.orders = JSON.parse(localStorage.getItem(K.orders) || '[]'); } catch (e) { state.orders = []; }
    if (!Array.isArray(state.orders)) {
      try { state.orders = JSON.parse(localStorage.getItem(K.bak) || '[]'); } catch (e) { state.orders = []; }
    }
    try { state.settings = Object.assign({}, DEF_SET, JSON.parse(localStorage.getItem(K.settings) || '{}')); }
    catch (e) { state.settings = Object.assign({}, DEF_SET); }
    try { state.todoDone = JSON.parse(localStorage.getItem(K.todo) || '{}'); } catch (e) { state.todoDone = {}; }
    try { state.meta = JSON.parse(localStorage.getItem(K.meta) || '{}'); } catch (e) { state.meta = {}; }
    if (!state.meta.firstRun) { state.meta.firstRun = nowISO(); saveMeta(); }
    migrate();
  }
  function migrate() {
    var ch = false;
    var MAP = { pending: 'tobuy', making: 'tobuy', shipped: 'ready' };
    state.orders.forEach(function (o) {
      if (MAP[o.status]) { o.status = MAP[o.status]; ch = true; }
      if (!o.cat) { o.cat = state.settings.cats[0]; ch = true; }
      if (o.shipLead == null) { o.shipLead = state.settings.shipLeadDays; ch = true; }
      if (o.buyLead == null) { o.buyLead = Math.max(o.shipLead, state.settings.buyLeadDays); ch = true; }
      if (!o.source) { o.source = state.settings.sources[0]; ch = true; }
    });
    if (!Array.isArray(state.settings.cats) || !state.settings.cats.length) {
      state.settings.cats = DEF_SET.cats.slice(); ch = true;
    }
    if (ch) commit();
  }
  function saveMeta() { try { localStorage.setItem(K.meta, JSON.stringify(state.meta)); } catch (e) {} }
  function commit(fn) {
    var prev = localStorage.getItem(K.orders);
    if (fn) fn();
    try {
      localStorage.setItem(K.orders, JSON.stringify(state.orders));
      if (prev) localStorage.setItem(K.bak, prev);
      return true;
    } catch (e) {
      alert('存储空间不足，请到设置页导出备份后清理旧图片');
      if (prev) state.orders = JSON.parse(prev);
      return false;
    }
  }
  function saveSettings() { try { localStorage.setItem(K.settings, JSON.stringify(state.settings)); } catch (e) {} }
  function saveTodo() { try { localStorage.setItem(K.todo, JSON.stringify(state.todoDone)); } catch (e) {} }

  function addOrder(o) {
    o.id = uid('o');
    o.createdAt = nowISO();
    o.updatedAt = o.createdAt;
    o.status = 'tobuy';
    o.statusAt = { tobuy: o.createdAt };
    o.photoIds = o.photoIds || [];
    if (o.shipLead == null) o.shipLead = state.settings.shipLeadDays;
    if (o.buyLead == null) o.buyLead = Math.max(o.shipLead, state.settings.buyLeadDays);
    state.orders.push(o);
    commit();
    return o;
  }
  function getOrder(id) { return state.orders.filter(function (o) { return o.id === id; })[0]; }
  function updateOrder(id, patch) {
    var o = getOrder(id); if (!o) return;
    Object.assign(o, patch); o.updatedAt = nowISO();
    commit();
  }
  function setStatus(id, st) {
    var o = getOrder(id); if (!o) return;
    o.status = st; o.statusAt = o.statusAt || {}; o.statusAt[st] = nowISO(); o.updatedAt = nowISO();
    commit();
  }
  function delOrder(id) {
    delPhotos(id);
    state.orders = state.orders.filter(function (o) { return o.id !== id; });
    commit();
  }

  function isOpen(o) { return o.status === 'tobuy' || o.status === 'ready'; }
  function needBuy(o) { return o.status === 'tobuy'; }
  function incomeOf(o) { return (o.status === 'canceled') ? 0 : (o.amountCents || 0); }
  function monthIncome(m) {
    var f = state.settings.incomeBasis === 'due' ? 'dueDate' : 'createdAt';
    return state.orders.reduce(function (s, o) {
      var d = f === 'dueDate' ? o.dueDate : (o.createdAt || '').slice(0, 10);
      return s + (ym(d) === m ? incomeOf(o) : 0);
    }, 0);
  }
  function monthCount(m) {
    return state.orders.filter(function (o) {
      return o.status !== 'canceled' && ym((o.createdAt || '').slice(0, 10)) === m;
    }).length;
  }
  function totalIncome() {
    return state.orders.reduce(function (s, o) { return s + incomeOf(o); }, 0);
  }
  function totalCount() {
    return state.orders.filter(function (o) { return o.status !== 'canceled'; }).length;
  }
  function sinceDate() {
    var d = (state.meta && state.meta.firstRun) ? String(state.meta.firstRun).slice(0, 10) : '';
    if (d) return d;
    var min = '';
    state.orders.forEach(function (o) {
      var c = (o.createdAt || '').slice(0, 10);
      if (c && (!min || c < min)) min = c;
    });
    return min || today();
  }

  function shipActDate(o) {
    var lead = (o.shipLead != null) ? o.shipLead : state.settings.shipLeadDays;
    return addDays(o.dueDate, -lead);
  }
  function buyActDate(o) {
    var lead = (o.buyLead != null) ? o.buyLead : state.settings.buyLeadDays;
    return addDays(o.dueDate, -lead);
  }

  function todos() {
    var st = state.settings, out = [];
    state.orders.forEach(function (o) {
      if (o.status === 'canceled' || o.status === 'done') return;
      var shipD = shipActDate(o), buyD = buyActDate(o);
      if (o.status === 'tobuy') {
        var db = daysUntil(buyD);
        if (db <= 7) out.push({ o: o, type: 'buy', d: db, actDate: buyD });
      }
      var ds = daysUntil(shipD);
      if (ds <= 7) out.push({ o: o, type: 'ship', d: ds, actDate: shipD });
    });
    return out.filter(function (t) {
      return !state.todoDone[t.o.id + ':' + t.type + ':' + t.actDate];
    }).sort(function (a, b) {
      if (a.d !== b.d) return a.d - b.d;
      if (a.type !== b.type) return a.type === 'buy' ? -1 : 1;
      return a.actDate < b.actDate ? -1 : 1;
    });
  }
  function advance(o) {
    if (o.status === 'tobuy') {
      setStatus(o.id, 'ready');
      return '材料已采购，进入待发货';
    }
    if (o.status === 'ready') {
      setStatus(o.id, 'done');
      return '已完成';
    }
    return '';
  }
  function toggleTodo(key) {
    if (state.todoDone[key]) delete state.todoDone[key]; else state.todoDone[key] = { at: nowISO() };
    saveTodo();
  }
  function todayStats() {
    var t = todos(), ship = 0, buy = 0, late = 0;
    t.forEach(function (x) {
      if (x.d < 0) late++;
      if (x.type === 'ship') ship++; else buy++;
    });
    return { ship: ship, buy: buy, late: late, total: t.length };
  }
  /* 日历落点严格跟订单算出来的日期对齐：
     待采购 → buyActDate(o)，待发货 → shipActDate(o)。
     已经做过的（不用再采购 / 不用再发货）单独放 buyDone / shipDone，供弹层回看。 */
  function calendar() {
    var map = {};
    function put(date, k, o) {
      var e = map[date] = map[date] || { buy: [], ship: [], buyDone: [], shipDone: [] };
      e[k].push(o);
    }
    state.orders.forEach(function (o) {
      if (o.status === 'canceled') return;
      put(buyActDate(o), needBuy(o) ? 'buy' : 'buyDone', o);
      put(shipActDate(o), o.status === 'done' ? 'shipDone' : 'ship', o);
    });
    return map;
  }
  function emptyDay() { return { buy: [], ship: [], buyDone: [], shipDone: [] }; }

  var DB = null;
  function idb() {
    if (DB) return Promise.resolve(DB);
    return new Promise(function (res, rej) {
      var r = indexedDB.open('luxu-db', 1);
      r.onupgradeneeded = function () {
        var db = r.result;
        if (!db.objectStoreNames.contains('photos')) {
          var s = db.createObjectStore('photos', { keyPath: 'id' });
          s.createIndex('orderId', 'orderId', { unique: false });
        }
      };
      r.onsuccess = function () { DB = r.result; res(DB); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbPut(rec) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction('photos', 'readwrite');
        t.objectStore('photos').put(rec);
        t.oncomplete = res; t.onerror = function () { rej(t.error); };
      });
    });
  }
  function idbGet(id) {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var t = db.transaction('photos', 'readonly').objectStore('photos').get(id);
        t.onsuccess = function () { res(t.result); }; t.onerror = function () { res(null); };
      });
    });
  }
  function photosOf(orderId) {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var t = db.transaction('photos', 'readonly').objectStore('photos').index('orderId').getAll(orderId);
        t.onsuccess = function () { res(t.result || []); }; t.onerror = function () { res([]); };
      });
    });
  }
  function delPhoto(id) {
    if (urlCache.has(id)) { URL.revokeObjectURL(urlCache.get(id)); urlCache.delete(id); }
    if (thumbCache.has(id)) { URL.revokeObjectURL(thumbCache.get(id)); thumbCache.delete(id); }
    return idb().then(function (db) {
      return new Promise(function (res) {
        var t = db.transaction('photos', 'readwrite');
        t.objectStore('photos').delete(id);
        t.oncomplete = res; t.onerror = res;
      });
    });
  }
  function delPhotos(orderId) {
    return photosOf(orderId).then(function (list) {
      return Promise.all(list.map(function (p) { return delPhoto(p.id); }));
    });
  }
  function rebindPhotos(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return Promise.resolve();
    return photosOf(fromId).then(function (list) {
      return Promise.all(list.map(function (p) {
        p.orderId = toId;
        return idbPut(p);
      }));
    });
  }
  var urlCache = new Map(), thumbCache = new Map();
  function photoURL(id) {
    if (urlCache.has(id)) return Promise.resolve(urlCache.get(id));
    return idbGet(id).then(function (r) {
      if (!r || !r.blob) return '';
      var u = URL.createObjectURL(r.blob); urlCache.set(id, u); return u;
    });
  }
  function thumbURL(id) {
    if (thumbCache.has(id)) return Promise.resolve(thumbCache.get(id));
    return idbGet(id).then(function (r) {
      if (!r) return '';
      var src = r.thumb || r.blob; if (!src) return '';
      var u = URL.createObjectURL(src); thumbCache.set(id, u); return u;
    });
  }

  function compress(file, maxSide, q) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        var s = Math.min(1, maxSide / Math.max(w, h));
        var tw = Math.max(1, Math.round(w * s)), th = Math.max(1, Math.round(h * s));
        var c = document.createElement('canvas'); c.width = tw; c.height = th;
        var x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, tw, th);
        x.drawImage(img, 0, 0, tw, th);
        c.toBlob(function (b) {
          img.src = ''; URL.revokeObjectURL(url);
          b ? res({ blob: b, w: tw, h: th }) : rej(new Error('toBlob failed'));
        }, 'image/jpeg', q);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('decode failed')); };
      img.src = url;
    });
  }
  function addPhoto(orderId, file) {
    return compress(file, 1600, 0.82).then(function (big) {
      return compress(file, 400, 0.7).then(function (sm) {
        var id = uid('p');
        return idbPut({
          id: id, orderId: orderId, blob: big.blob, thumb: sm.blob,
          w: big.w, h: big.h, bytes: big.blob.size, at: nowISO()
        }).then(function () { return id; });
      });
    });
  }

  function exportData() {
    return {
      app: 'luxu', v: 1, exportedAt: nowISO(),
      orders: state.orders, settings: state.settings, todoDone: state.todoDone
    };
  }
  function importData(obj) {
    if (!obj || !Array.isArray(obj.orders)) throw new Error('文件格式不对');
    state.orders = obj.orders;
    if (obj.settings) state.settings = Object.assign({}, DEF_SET, obj.settings);
    if (obj.todoDone) state.todoDone = obj.todoDone;
    commit(); saveSettings(); saveTodo();
  }
  function markBackup() { state.meta.lastBackupAt = nowISO(); saveMeta(); }
  function backupAgeDays() {
    if (!state.meta.lastBackupAt) return 999;
    return Math.floor((Date.now() - new Date(state.meta.lastBackupAt).getTime()) / 86400000);
  }
  function estimate() {
    if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate();
    return Promise.resolve(null);
  }

  function ics() {
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//luxu//LU XU//CN', 'CALSCALE:GREGORIAN'];
    function ev(o, type, date) {
      var isShip = type === 'ship';
      L.push('BEGIN:VEVENT');
      L.push('UID:luxu-' + type + '-' + o.id + '@luxu');
      L.push('DTSTAMP:' + nowISO().replace(/[-:]/g, '').split('.')[0] + 'Z');
      L.push('DTSTART;VALUE=DATE:' + date.replace(/-/g, ''));
      L.push('DTEND;VALUE=DATE:' + addDays(date, 1).replace(/-/g, ''));
      L.push('SUMMARY:' + (isShip ? '待发货/送达' : '待采购材料') + '｜' + o.customer);
      L.push('DESCRIPTION:' + (o.requirement || '') + ' ¥' + fmt(o.amountCents) + ' ' + (DELIVERY[o.delivery] || ''));
      L.push('BEGIN:VALARM');
      L.push('TRIGGER:-PT15H');
      L.push('ACTION:DISPLAY');
      L.push('DESCRIPTION:鹿叙提醒');
      L.push('END:VALARM');
      L.push('END:VEVENT');
    }
    state.orders.forEach(function (o) {
      if (o.status === 'canceled' || o.status === 'done') return;
      var shipD = shipActDate(o), buyD = buyActDate(o);
      if (needBuy(o) && daysUntil(buyD) <= 0) ev(o, 'buy', buyD);
      if (daysUntil(shipD) <= 0) ev(o, 'ship', shipD);
    });    L.push('END:VCALENDAR');
    return L.join('\r\n');
  }

  window.LX = {
    store: {
      K: K, DELIVERY: DELIVERY, STATUS: STATUS, DEF_SET: DEF_SET, build: BUILD,
      state: state, load: load, commit: commit, saveSettings: saveSettings, saveMeta: saveMeta,
      addOrder: addOrder, getOrder: getOrder, updateOrder: updateOrder, setStatus: setStatus, delOrder: delOrder,
      isOpen: isOpen, needBuy: needBuy, advance: advance,
      shipActDate: shipActDate, buyActDate: buyActDate, incomeOf: incomeOf, monthIncome: monthIncome, monthCount: monthCount,
      totalIncome: totalIncome, totalCount: totalCount, sinceDate: sinceDate,
      todos: todos, toggleTodo: toggleTodo, todayStats: todayStats, calendar: calendar, emptyDay: emptyDay,
      addPhoto: addPhoto, delPhoto: delPhoto, delPhotos: delPhotos, photosOf: photosOf, rebindPhotos: rebindPhotos,
      photoURL: photoURL, thumbURL: thumbURL,
      exportData: exportData, importData: importData, markBackup: markBackup,
      backupAgeDays: backupAgeDays, estimate: estimate, ics: ics,
      d2s: d2s, s2d: s2d, today: today, daysUntil: daysUntil, addDays: addDays,
      ym: ym, curYM: curYM, shiftYM: shiftYM, fmt: fmt, fmt2: fmt2, uid: uid, esc: esc, nowISO: nowISO,
      catOf: function (o) { return o.cat || (state.settings.cats && state.settings.cats[0]) || '其他'; },
      srcOf: function (o) { return o.source || (state.settings.sources && state.settings.sources[0]) || '其他'; },
      addCat: function (name) {
        name = String(name || '').trim(); if (!name) return;
        if (state.settings.cats.indexOf(name) >= 0) return;
        state.settings.cats.push(name); saveSettings();
      },
      addSrc: function (name) {
        name = String(name || '').trim(); if (!name) return;
        if (!Array.isArray(state.settings.sources)) state.settings.sources = DEF_SET.sources.slice();
        if (state.settings.sources.indexOf(name) >= 0) return;
        state.settings.sources.push(name); saveSettings();
      }
    }
  };
})();

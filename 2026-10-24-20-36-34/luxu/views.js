(function () {
  var S = window.LX.store, C = window.LX.charts;
  var esc = S.esc, fmt = S.fmt, fmt2 = S.fmt2;
  var ST = {};
  S.STATUS.forEach(function (s) { ST[s.k] = s.t; });
  var DCOL = ['#F5C242', '#7FC8F5', '#F5A3C2', '#8FD99B', '#C2A8F0', '#F2B27D', '#8C9BD8', '#E8D26A'];

  function dueText(o) {
    var d = S.daysUntil(o.dueDate);
    if (d < 0) return { t: '已逾期 ' + (-d) + ' 天', c: 'due soon' };
    if (d === 0) return { t: '今天送达', c: 'due today' };
    if (d === 1) return { t: '明天送达', c: 'due soon' };
    return { t: d + ' 天后送达', c: 'due' };
  }
  function empty(ic, t, s) {
    return '<div class="empty"><div class="e-ic">' + ic + '</div><div class="e-t">' + t + '</div><div class="e-s">' + (s || '') + '</div></div>';
  }
  // 弹层统一头部：小横条 + 左上角返回按钮 + 居中标题（title 为空则不显示标题）
  function shHead(title) {
    var h = '<div class="sh-grab"><div class="sh-bar"></div><div class="sh-head-row">'
      + '<button class="tb-pill sh-close" data-act="close-sheet" aria-label="返回">'
      + '<span class="sh-back" aria-hidden="true">&#8249;</span><span>返回</span></button>';
    if (title) h += '<div class="sh-t">' + esc(title) + '</div>';
    h += '</div></div>';
    return h;
  }

  function todayPage(m) {
    if (!m) m = S.curYM();
    var h = '';
    h += miniCal(m);

    var list = S.todos();
    h += '<div class="sec"><div class="sec-h"><div class="sec-t">待办清单</div><div class="sec-x">' + list.length + ' 项</div></div>';
    if (!list.length) {
      h += empty('✿', '暂时没有待办', '待采购、待发货的订单会出现在这里');
    } else {
      var G = [
        { k: 'od', t: '以前没做完', od: true, test: function (x) { return x.d < 0; } },
        { k: 't0', t: '今天', test: function (x) { return x.d === 0; } },
        { k: 't1', t: '明天', test: function (x) { return x.d === 1; } },
        { k: 't2', t: '后天', test: function (x) { return x.d === 2; } },
        { k: 't7', t: '后 7 天内', test: function (x) { return x.d > 2 && x.d <= 7; } }
      ];
      G.forEach(function (g) {
        var arr = list.filter(g.test);
        if (!arr.length) return;
        h += '<div class="todo-group"><div class="todo-gh' + (g.od ? ' od' : '') + '"><span class="dot"></span>' + g.t + '</div>';
        arr.forEach(function (x) { h += todoItem(x); });
        h += '</div>';
      });
    }
    h += '</div>';
    return h;
  }

  function todoItem(x) {
    var key = x.o.id + ':' + x.type + ':' + x.actDate;
    var isShip = x.type === 'ship';
    var dt = x.d < 0 ? '超时 ' + (-x.d) + ' 天' : (x.d === 0 ? '今天' : (x.d === 1 ? '明天' : (x.d === 2 ? '后天' : x.d + ' 天后')));
    return '<div class="todo">'
      + '<button class="todo-check" data-act="todo" data-key="' + esc(key) + '" data-oid="' + x.o.id + '">✓</button>'
      + '<div class="todo-main" data-act="open" data-id="' + x.o.id + '">'
      + '<div class="todo-t">' + esc(x.o.customer)
      + '<span class="badge ' + (isShip ? 'b-ship' : 'b-buy') + '">' + (isShip ? '待发货' : '待采购') + '</span>'
      + (x.d < 0 ? '<span class="badge b-late">超时' + (-x.d) + '天</span>' : '') + '</div>'
      + '<div class="todo-s">' + esc(S.catOf(x.o)) + ' · ' + x.o.dueDate.slice(5) + ' 送达</div>'
      + '</div>'
      + '<div class="todo-d' + (x.d < 0 ? ' od' : '') + '">' + dt + '</div></div>';
  }

  function miniCal(m) {
    var y = +m.slice(0, 4), mo = +m.slice(5, 7);
    var map = S.calendar(m);
    var first = new Date(y, mo - 1, 1);
    var start = (first.getDay() + 6) % 7;
    var days = new Date(y, mo, 0).getDate();
    var td = S.today();
    var back = m !== S.curYM();
    var h = '<div class="card"><div class="cal-head">'
      + '<div class="cal-title">' + y + ' 年 ' + mo + ' 月</div>'
      + '<div class="cal-nav">'
      + '<button data-act="cal" data-m="' + S.shiftYM(m, -12) + '" aria-label="上一年">&#171;</button>'
      + '<button data-act="cal" data-m="' + S.shiftYM(m, -1) + '" aria-label="上个月">&#8249;</button>'
      + (back ? '<button data-act="cal" data-m="' + S.curYM() + '" class="cal-today">回本月</button>' : '')
      + '<button data-act="cal" data-m="' + S.shiftYM(m, 1) + '" aria-label="下个月">&#8250;</button>'
      + '<button data-act="cal" data-m="' + S.shiftYM(m, 12) + '" aria-label="下一年">&#187;</button>'
      + '</div></div>';
    var W = ['一', '二', '三', '四', '五', '六', '日'];
    h += '<div class="cal-w">' + W.map(function (w) { return '<div>' + w + '</div>'; }).join('') + '</div><div class="cal-g">';
    var rows = Math.ceil((start + days) / 7);
    for (var i = 0; i < rows * 7; i++) {
      var day = i - start + 1;
      if (day < 1 || day > days) { h += '<div class="cell out"></div>'; continue; }
      var ds = m + '-' + String(day).padStart(2, '0');
      var info = map[ds];
      var cls = 'cell' + (ds === td ? ' today' : '');
      h += '<button class="' + cls + '" data-act="day" data-d="' + ds + '">';
      h += '<div class="cd">' + day + '</div>';
      if (info) {
        var nb = info.buy.length, ns = info.ship.length;
        if (nb || ns) {
          h += '<div class="cm">';
          if (nb) h += '<div class="mk mk-b' + (S.daysUntil(ds) <= 0 ? ' hot' : '') + '">待采' + nb + '</div>';
          if (ns) h += '<div class="mk mk-s">待发' + ns + '</div>';
          h += '</div>';
        }
      }
      h += '</button>';
    }
    h += '</div>';
    h += '<div style="display:flex;gap:14px;justify-content:center;margin-top:12px;font-size:11px;color:#8C7B65">'
      + '<span style="display:flex;align-items:center;gap:5px"><i style="width:7px;height:7px;border-radius:50%;background:#F5C242;display:block"></i>待发货</span>'
      + '<span style="display:flex;align-items:center;gap:5px"><i style="width:7px;height:7px;border-radius:50%;border:1.5px solid #B6A893;display:block"></i>待采购</span></div>';
    h += '</div>';
    return h;
  }

  function ordersPage(f, q) {
    q = (q || '').trim();
    var all = S.state.orders;
    var counts = { all: all.length, tobuy: 0, ready: 0, done: 0, canceled: 0 };
    all.forEach(function (o) { if (counts[o.status] != null) counts[o.status]++; });
    var h = '<input class="search" id="q" placeholder="搜客户名或定制要求" value="' + esc(q) + '">';
    h += '<div class="chips">';
    [['all', '全部'], ['tobuy', '待采购'], ['ready', '待发货'], ['done', '已完成'], ['canceled', '已取消']]
      .forEach(function (p) {
        h += '<button class="chip' + (f === p[0] ? ' on' : '') + '" data-act="filter" data-f="' + p[0] + '">' + p[1] + '<b>' + counts[p[0]] + '</b></button>';
      });
    h += '</div>';

    var list = all.filter(function (o) {
      if (f !== 'all' && o.status !== f) return false;
      if (!q) return true;
      return (o.customer + ' ' + (o.requirement || '') + ' ' + (o.contact || '') + ' ' + (o.note || '')).toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
    var open = [], closed = [];
    list.forEach(function (o) { (S.isOpen(o) ? open : closed).push(o); });
    open.sort(function (a, b) { return a.dueDate < b.dueDate ? -1 : 1; });
    closed.sort(function (a, b) { return a.dueDate > b.dueDate ? -1 : 1; });

    if (!list.length) {
      h += empty('✿', q ? '没找到相关订单' : '还没有订单', '点右下角 + 新建第一单');
      return h;
    }
    var groups = [
      { t: '已逾期', od: true, f: function (d) { return d < 0; } },
      { t: '3 天内送达', f: function (d) { return d >= 0 && d <= 3; } },
      { t: '一周内送达', f: function (d) { return d > 3 && d <= 7; } },
      { t: '一周以后', f: function (d) { return d > 7; } }
    ];
    groups.forEach(function (g) {
      var arr = open.filter(function (o) { return g.f(S.daysUntil(o.dueDate)); });
      if (!arr.length) return;
      h += '<div class="sec-h" style="margin:14px 2px 8px"><div class="sec-t" style="color:' + (g.od ? '#E5484D' : '#4A3B2A') + '">'
        + g.t + ' <span style="font-weight:400;color:#B6A893;font-size:12px">' + arr.length + ' 单</span></div></div>';
      arr.forEach(function (o) { h += orderCard(o); });
    });
    if (closed.length) {
      h += '<div class="sec-h" style="margin:16px 2px 8px"><div class="sec-t" style="color:#B0A798">已结束 <span style="font-weight:400;font-size:12px">' + closed.length + ' 单</span></div></div>';
      closed.forEach(function (o) { h += orderCard(o); });
    }
    return h;
  }

  function orderCard(o) {
    var closed = o.status === 'done' || o.status === 'canceled';
    var d = dueText(o);
    var meta = closed
      ? '<span class="due">' + (o.status === 'done' ? o.dueDate.slice(5) + ' 送达' : '已取消') + '</span>'
      : '<span class="' + d.c + '">' + d.t + '</span>';
    var h = '<div class="order" data-act="open" data-id="' + o.id + '">';
    h += '<div class="thumb">';
    if (o.photoIds && o.photoIds.length) h += '<img data-ph="' + o.photoIds[0] + '" alt="">';
    else h += esc((o.customer || '?').slice(0, 1));
    h += '</div>';
    h += '<div class="o-main">';
    h += '<div class="o-top"><span class="o-name">' + esc(o.customer) + '</span>'
      + '<span class="o-amt"' + (o.status === 'canceled' ? ' style="color:#B0A798;text-decoration:line-through"' : '') + '>¥' + fmt(o.amountCents) + '</span></div>';
    h += '<div class="o-sub">' + esc(S.catOf(o)) + '</div>';
    h += '<div class="o-meta"><span class="st st-' + o.status + '">' + ST[o.status] + '</span>'
      + meta + '</div>';
    h += '</div></div>';
    return h;
  }

  function incomePage(m) {
    var inc = S.monthIncome(m), prev = S.monthIncome(S.shiftYM(m, -1));
    var diff = inc - prev;
    var h = '<div class="card"><div class="inc-big">'
      + '<div class="inc-num"><span>¥</span>' + fmt2(inc) + '</div>'
      + '<div class="inc-sub">' + m.replace('-', ' 年 ') + ' 月 · ' + S.monthCount(m) + ' 单'
      + (diff === 0 ? '' : ' · 较上月 <b class="' + (diff > 0 ? 'up' : 'down') + '">' + (diff > 0 ? '+' : '−') + fmt(Math.abs(diff)) + '</b>')
      + '</div></div></div>';

    h += '<div class="card tint"><div class="row" style="justify-content:space-between;align-items:center">'
      + '<div><div style="font-size:12px;color:#8C7B65">使用以来总收入</div>'
      + '<div style="font-size:22px;font-weight:800;margin-top:3px"><span style="font-size:14px">¥</span>' + fmt2(S.totalIncome()) + '</div></div>'
      + '<div style="text-align:right"><div style="font-size:12px;color:#8C7B65">共 ' + S.totalCount() + ' 单</div>'
      + '<div style="font-size:12px;color:#B6A893;margin-top:2px">自 ' + S.sinceDate() + '</div></div></div></div>';

    var months = [], i;
    for (i = 11; i >= 0; i--) {
      var mm = S.shiftYM(m, -i);
      months.push({ label: (+mm.slice(5, 7)) + '月', value: S.monthIncome(mm), cur: mm === m });
    }
    h += '<div class="card"><div class="sec-h"><div class="sec-t">近 12 个月收入</div></div><div class="chart-box">' + C.bar(months) + '</div></div>';

    var basis = S.state.settings.incomeBasis;
    var inMonth = S.state.orders.filter(function (o) {
      if (o.status === 'canceled') return false;
      var d = basis === 'due' ? o.dueDate : (o.createdAt || '').slice(0, 10);
      return S.ym(d) === m;
    });
    function donutBlock(title, keyFn) {
      var agg = {};
      inMonth.forEach(function (o) {
        var k = keyFn(o);
        agg[k] = (agg[k] || 0) + S.incomeOf(o);
      });
      var data = Object.keys(agg).map(function (k, i) {
        return { label: k, value: agg[k], color: DCOL[i % DCOL.length] };
      });
      data.sort(function (a, b) { return b.value - a.value; });
      var tot = data.reduce(function (s, d) { return s + d.value; }, 0);
      var out = '<div class="card"><div class="sec-h"><div class="sec-t">' + title + '</div><div class="sec-x">共 ' + inMonth.length + ' 单</div></div>';
      if (tot <= 0) {
        out += empty('✿', '本月还没有收入', '记一单就能看到结构');
      } else {
        out += '<div style="display:flex;align-items:center;gap:14px"><div style="flex:0 0 140px">'
          + C.donut(data, '¥' + C.money(tot), '本月') + '</div>'
          + '<div class="legend" style="flex:1;margin-top:0">';
        data.forEach(function (d) {
          if (!d.value) return;
          out += '<div class="lg"><i style="background:' + d.color + '"></i><span class="lg-n">' + d.label + '</span>'
            + '<span class="lg-v">¥' + fmt(d.value) + '</span></div>';
        });
        out += '</div></div>';
      }
      out += '</div>';
      return out;
    }
    h += donutBlock('定制分类收入', function (o) { return S.catOf(o); });
    h += donutBlock('客源收入', function (o) { return S.srcOf(o); });

    h += '<div class="sec"><div class="sec-h"><div class="sec-t">收入明细</div></div>';
    if (!inMonth.length) h += '<div class="card" style="text-align:center;color:#B6A893;font-size:13px;padding:20px">本月还没有订单</div>';
    else {
      var sorted = inMonth.slice().sort(function (a, b) { return a.dueDate < b.dueDate ? -1 : 1; });
      h += '<div class="card">';
      sorted.forEach(function (o) {
        h += '<div class="line" data-act="open" data-id="' + o.id + '"><div class="l-n">'
          + '<div class="l-t">' + esc(o.customer) + ' <span class="tag">' + esc(S.catOf(o)) + '</span> <span class="tag">' + esc(S.srcOf(o)) + '</span></div>'
          + '<div class="l-s">' + o.dueDate + ' 送达 · ' + ST[o.status] + '</div></div>'
          + '<div class="l-v">¥' + fmt(o.amountCents) + '</div></div>';
      });
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  function settingsPage() {
    var s = S.state.settings, age = S.backupAgeDays();
    var h = shHead('设置');
    h += '<div class="card"><div class="sec-h"><div class="sec-t">提醒</div></div>'
      + '<div style="font-size:13px;color:#8C7B65;line-height:1.7;padding:2px 0 6px">每单的提前天数在新建订单时设置（默认提前 3 天），买材料自动再提前 3 天。</div>'
      + '<div class="set-row"><div class="set-l"><div class="t">默认提前天数</div><div class="s">新订单的默认值</div></div>'
      + '<div class="stepper"><button data-act="setd" data-k="shipLeadDays" data-v="-1">−</button><span class="n">' + s.shipLeadDays + '</span>'
      + '<button data-act="setd" data-k="shipLeadDays" data-v="1">+</button></div></div></div>';

    h += '<div class="card"><div class="sec-h"><div class="sec-t">定制分类</div></div>'
      + '<div class="cats-box" style="display:flex;flex-wrap:wrap;gap:8px;padding:2px 0 10px">';
    (s.cats || []).forEach(function (c, i) {
      h += '<span class="cat-chip" style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:#fff;border:1px solid #F1E5CE;font-size:13px">'
        + esc(c)
        + '<button data-act="delcat" data-i="' + i + '" style="color:#B6A893;font-size:13px">×</button></span>';
    });
    h += '</div><div class="row"><input id="newcat" placeholder="新分类名，如：花盒定制" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid #F1E5CE">'
      + '<button class="btn ghost" style="width:auto;padding:10px 14px;font-size:13px" data-act="addcat">添加</button></div>'
      + '<div style="font-size:12px;color:#B6A893;margin-top:8px">删除分类不影响已有订单，它们会归到剩余的第一个分类</div></div>';

    h += '<div class="card"><div class="sec-h"><div class="sec-t">客源渠道</div></div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:2px 0 10px">';
    (s.sources || []).forEach(function (c, i) {
      h += '<span style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:#fff;border:1px solid #F1E5CE;font-size:13px">'
        + esc(c)
        + '<button data-act="delsrc" data-i="' + i + '" style="color:#B6A893;font-size:13px">×</button></span>';
    });
    h += '</div><div class="row"><input id="newsrc" placeholder="新客源，如：快手" style="flex:1;padding:10px 12px;border-radius:10px;border:1px solid #F1E5CE">'
      + '<button class="btn ghost" style="width:auto;padding:10px 14px;font-size:13px" data-act="addsrc">添加</button></div>'
      + '<div style="font-size:12px;color:#B6A893;margin-top:8px">删除客源不影响已有订单</div></div>';

    h += '<div class="card"><div class="sec-h"><div class="sec-t">数据备份</div></div>';
    h += '<div class="set-row"><div class="set-l"><div class="t">上次备份</div><div class="s">'
      + (S.backupAgeDays() > 900 ? '还没备份过' : S.backupAgeDays() + ' 天前')
      + (age >= s.backupRemindDays ? ' · 该备份了' : '') + '</div></div>'
      + '<button class="btn ghost" style="width:auto;padding:8px 14px;font-size:13px" data-act="export">立即备份</button></div>';
    h += '<div class="set-row"><div class="set-l"><div class="t">导出备份</div><div class="s">存到手机「文件」，换手机时导入恢复</div></div>'
      + '<button class="btn ghost" style="width:auto;padding:8px 14px;font-size:13px" data-act="export">导出</button></div>';
    h += '<div class="set-row"><div class="set-l"><div class="t">导入备份</div><div class="s">会覆盖当前数据，建议先导出</div></div>'
      + '<button class="btn ghost" style="width:auto;padding:8px 14px;font-size:13px" data-act="import">导入</button></div>';
    h += '<div class="set-row"><div class="set-l"><div class="t">同步到手机日历</div><div class="s">导出日程后，iPhone 会按时提醒你</div></div>'
      + '<button class="btn ghost" style="width:auto;padding:8px 14px;font-size:13px" data-act="ics">导出</button></div>';
    h += '<div class="set-row"><div class="set-l"><div class="t">收入归月</div><div class="s">决定一笔钱算在哪个月</div></div>'
      + '<div class="seg" style="width:150px"><button data-act="basis" data-v="created" class="' + (s.incomeBasis === 'created' ? 'on' : '') + '">接单日</button>'
      + '<button data-act="basis" data-v="due" class="' + (s.incomeBasis === 'due' ? 'on' : '') + '">送达日</button></div></div>';
    h += '<div class="set-row"><div class="set-l"><div class="t">占用空间</div><div class="s" id="quota">计算中</div></div></div>';
    h += '</div>';

    h += '<div class="card"><div class="sec-h"><div class="sec-t">放到手机桌面</div></div>'
      + '<div style="font-size:13px;color:#8C7B65;line-height:1.7">'
      + '1. 用 <b>Safari</b> 打开本页<br>'
      + '2. 点底部「分享」按钮<br>'
      + '3. 选「添加到主屏幕」<br>'
      + '4. 之后只从桌面图标进入，数据才稳定<br>'
      + '<span style="color:#E5484D">注意：Safari 里录的订单，桌面 App 可能读不到，请统一入口。</span></div></div>';

    h += '<div class="card"><button class="btn danger" data-act="wipe">清空全部数据</button>'
      + '<div style="font-size:12px;color:#B6A893;margin-top:10px;text-align:center">鹿叙 | LU XU · 数据仅保存在本机 · 版本 ' + S.build + '</div></div>';
    return h;
  }

  function formPage(o) {
    var isNew = !o;
    o = o || { customer: '', contact: '', requirement: '', amountCents: '', dueDate: S.addDays(S.today(), 7), delivery: 'sf', cat: S.state.settings.cats[0], note: '', photoIds: [] };
    var h = shHead(isNew ? '新建订单' : '编辑订单');
    h += '<div class="fld"><label>客户名称</label><input id="f-customer" value="' + esc(o.customer) + '" placeholder="必填"></div>';
    h += '<div class="fld"><label>联系方式 / 地址（选填）</label><input id="f-contact" value="' + esc(o.contact || '') + '" placeholder="手机号或收货地址"></div>';
    h += '<div class="fld"><label>客单收入（元）</label><div class="amt-wrap"><i>¥</i>'
      + '<input id="f-amount" inputmode="decimal" type="number" step="0.01" value="' + (o.amountCents ? (o.amountCents / 100) : '') + '" placeholder="0.00"></div></div>';
    h += '<div class="fld"><label>要求送达日期</label><input id="f-due" type="date" value="' + esc(o.dueDate) + '"></div>';
    var lead = o.shipLead != null ? o.shipLead : S.state.settings.shipLeadDays;
    h += '<div class="fld"><label>提前几天提醒发货</label>'
      + '<div class="pick" id="f-lead">';
      [0, 1, 2, 3, 4, 5, 7].forEach(function (n) {
        var on = lead === n ? ' class="on"' : '';
        h += '<button data-v="' + n + '"' + on + '>' + (n === 0 ? '当天' : n + ' 天') + '</button>';
      });
    h += '</div></div>';
    var bl = o.buyLead != null ? (o.buyLead - lead) : 3;
    if (bl < 0) bl = 0;
    h += '<div class="fld"><label>材料采购再提前</label>'
      + '<div class="pick" id="f-buypre">';
      [0, 1, 2, 3, 4, 5].forEach(function (n) {
        var on = bl === n ? ' class="on"' : '';
        h += '<button data-v="' + n + '"' + on + '>' + (n === 0 ? '不提前' : n + ' 天') + '</button>';
      });
    h += '</div><div style="font-size:12px;color:#8C7B65;margin-top:8px">采购提醒 = 发货提醒再提前这些天，给材料快递留时间</div></div>';
    h += '<div class="fld"><label>定制分类</label><div class="pick" id="f-cat">';
    (S.state.settings.cats || []).forEach(function (c) {
      h += '<button data-v="' + esc(c) + '" class="' + (S.catOf(o) === c ? 'on' : '') + '">' + esc(c) + '</button>';
    });
    h += '</div></div>';
    h += '<div class="fld"><label>客源</label><div class="pick" id="f-source">';
    (S.state.settings.sources || []).forEach(function (c) {
      h += '<button data-v="' + esc(c) + '" class="' + (S.srcOf(o) === c ? 'on' : '') + '">' + esc(c) + '</button>';
    });
    h += '</div></div>';
    h += '<div class="fld"><label>送达方式</label><div class="pick" id="f-delivery">';
    Object.keys(S.DELIVERY).forEach(function (k) {
      h += '<button data-v="' + k + '" class="' + (o.delivery === k ? 'on' : '') + '">' + S.DELIVERY[k] + '</button>';
    });
    h += '</div></div>';
    h += '<div class="fld"><label>定制要求</label><textarea id="f-req" placeholder="花材、色系、数量、卡片内容…">' + esc(o.requirement || '') + '</textarea></div>';
    h += '<div class="fld"><label>参考图片（可选，最多 9 张）</label><div class="photos" id="f-photos"></div></div>';
    h += '<div class="fld"><label>备注（选填）</label><input id="f-note" value="' + esc(o.note || '') + '" placeholder="物流单号等"></div>';
    if (isNew) {
      h += '<div class="btn-row"><button class="btn ghost" data-act="close-sheet">取消</button>'
        + '<button class="btn" data-act="save" data-id="">保存</button></div>';
    } else {
      h += '<button class="btn" data-act="save" data-id="' + o.id + '">保存</button>';
      h += '<div class="btn-row"><button class="btn ghost" data-act="open" data-id="' + o.id + '">返回详情</button></div>';
    }
    return h;
  }

  function detailPage(id) {
    var o = S.getOrder(id); if (!o) return shHead('') + empty('✿', '订单不存在');
    var d = S.daysUntil(o.dueDate);
    var h = shHead('');
    h += '<div class="row" style="justify-content:space-between;margin-bottom:12px">'
      + '<div><div style="font-size:20px;font-weight:700">' + esc(o.customer) + '</div>'
      + '<div style="font-size:12px;color:#8C7B65;margin-top:2px">' + (o.createdAt || '').slice(0, 10) + ' 接单</div></div>'
      + '<div style="font-size:24px;font-weight:800;color:' + (o.status === 'canceled' ? '#B0A798' : '#D99A10') + '">¥' + fmt(o.amountCents) + '</div></div>';
    h += '<div class="steps">';
    ['tobuy', 'ready', 'done'].forEach(function (k) {
      h += '<button class="step' + (o.status === k ? ' on' : '') + '" data-act="status" data-id="' + o.id + '" data-v="' + k + '">' + ST[k] + '</button>';
    });
    h += '</div>';

    h += '<div class="card">';
    h += item('要求送达', o.dueDate + '（' + (d < 0 ? '已过 ' + (-d) + ' 天' : d === 0 ? '就是今天' : '还有 ' + d + ' 天') + '）');
    h += item('定制分类', esc(S.catOf(o)));
    h += item('客源', esc(S.srcOf(o)));
    h += item('送达方式', S.DELIVERY[o.delivery]);
      if (o.shipLead != null) {
        h += item('发货提醒', '送达前 ' + o.shipLead + ' 天（' + S.shipActDate(o) + '）');
        h += item('采购提醒', '送达前 ' + o.buyLead + ' 天（' + S.buyActDate(o) + '）');
      }
    if (o.contact) h += item('联系方式', esc(o.contact));
    h += item('状态', ST[o.status]);
    if (o.note) h += item('备注', esc(o.note));
    h += '</div>';

    h += '<div class="card"><div class="sec-h"><div class="sec-t">定制要求</div></div>'
      + '<div style="font-size:14px;line-height:1.7;white-space:pre-wrap">' + (esc(o.requirement) || '<span style="color:#B6A893">未填写</span>') + '</div></div>';

    h += '<div class="card"><div class="sec-h"><div class="sec-t">参考图片</div><div class="sec-x" id="ph-add-wrap"></div></div>'
      + '<div class="photos" id="d-photos"><div style="font-size:13px;color:#B6A893">加载中…</div></div></div>';

    h += '<div class="btn-row"><button class="btn ghost" data-act="edit" data-id="' + o.id + '">编辑</button>';
    if (o.status === 'canceled') h += '<button class="btn ghost" data-act="status" data-id="' + o.id + '" data-v="tobuy">恢复</button>';
    else h += '<button class="btn ghost" data-act="status" data-id="' + o.id + '" data-v="canceled">取消此单</button>';
    h += '</div>';
    h += '<div class="btn-row" style="margin-top:10px"><button class="btn danger" data-act="del" data-id="' + o.id + '">删除订单</button></div>';
    return h;
  }
  function item(k, v) {
    return '<div class="d-item"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>';
  }

  function dayLine(o, tag, dim) {
    return '<div class="line" data-act="open" data-id="' + o.id + '"' + (dim ? ' style="opacity:.55"' : '') + '>'
      + '<div class="l-n"><div class="l-t">' + esc(o.customer)
      + (tag ? ' <span class="tag">' + tag + '</span>' : '') + '</div>'
      + '<div class="l-s">' + esc(S.catOf(o)) + ' · ' + esc(S.srcOf(o))
      + ' · 送达 ' + o.dueDate.slice(5) + '</div></div>'
      + '<div class="l-v">¥' + fmt(o.amountCents) + '</div></div>';
  }

  function dayPop(date) {
    var map = S.calendar();
    var info = map[date] || S.emptyDay();
    var h = shHead(date);

    h += '<div class="card"><div class="sec-h"><div class="sec-t">待采购 ' + info.buy.length + ' 单</div></div>';
    if (!info.buy.length) h += '<div style="font-size:13px;color:#B6A893;padding:2px 0 4px">当天没有要采购的</div>';
    else info.buy.forEach(function (o) { h += dayLine(o); });
    h += '</div>';

    h += '<div class="card"><div class="sec-h"><div class="sec-t">待发货 ' + info.ship.length + ' 单</div></div>';
    if (!info.ship.length) h += '<div style="font-size:13px;color:#B6A893;padding:2px 0 4px">当天没有要发货的</div>';
    else info.ship.forEach(function (o) { h += dayLine(o); });
    h += '</div>';

    var done = [];
    info.buyDone.forEach(function (o) { done.push({ o: o, t: '已采购' }); });
    info.shipDone.forEach(function (o) { done.push({ o: o, t: '已发货' }); });
    if (done.length) {
      h += '<div class="card"><div class="sec-h"><div class="sec-t">已处理 ' + done.length + ' 项</div>'
        + '<div class="sec-x">供回看</div></div>';
      done.forEach(function (d) { h += dayLine(d.o, d.t, true); });
      h += '</div>';
    }
    return h;
  }

  window.LX.views = {
    today: todayPage, orders: ordersPage, income: incomePage,
    settings: settingsPage, form: formPage, detail: detailPage, dayPop: dayPop, orderCard: orderCard
  };
})();

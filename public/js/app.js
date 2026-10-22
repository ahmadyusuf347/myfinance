(() => {
  // ---------- Helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const idr = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
  const compact = n => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(n);
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmtDate = s => new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const sum = (arr, t) => arr.filter(x => x.type === t).reduce((a, x) => a + Number(x.amount), 0);
  const errMsg = e => /Invalid login/i.test(e.message) ? 'Email atau password salah.'
    : /already registered/i.test(e.message) ? 'Email ini sudah terdaftar. Silakan masuk.'
    : /at least 6/i.test(e.message) ? 'Password minimal 6 karakter.' : (e.message || 'Terjadi kesalahan.');

  const S = { sb: null, user: null, profile: null, tx: [], range: '7d', mode: 'login', charts: [] };
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
    { id: 'income', label: 'Income', icon: 'bi-arrow-down-circle-fill' },
    { id: 'outcome', label: 'Outcome', icon: 'bi-arrow-up-circle-fill' },
    { id: 'profile', label: 'Profile', icon: 'bi-person-circle' }
  ];
  const TYPE = { income: 'income', outcome: 'expense' };
  const route = () => { const r = location.hash.replace('#/', '') || 'dashboard'; return NAV.some(n => n.id === r) ? r : 'dashboard'; };

  function toast(msg, ok = true) {
    const el = document.createElement('div');
    el.className = `pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${ok ? 'bg-slate-900' : 'bg-rose-600'}`;
    el.innerHTML = `<i class="bi ${ok ? 'bi-check-circle-fill text-emerald-400' : 'bi-exclamation-triangle-fill'}"></i><span>${esc(msg)}</span>`;
    $('#toast').appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
  const busy = (btn, on) => { if (!btn) return; btn.disabled = on; btn.dataset.t = btn.dataset.t || btn.innerHTML; btn.innerHTML = on ? '<i class="bi bi-arrow-repeat animate-spin"></i> Memproses…' : btn.dataset.t; };

  // ---------- Data ----------
  async function loadProfile() {
    let { data } = await S.sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle();
    if (!data) {
      const name = S.user.user_metadata?.full_name || S.user.email.split('@')[0];
      ({ data } = await S.sb.from('profiles').upsert({ id: S.user.id, full_name: name }).select().single());
    }
    S.profile = data || { app_name: 'Keuanganku' };
    document.title = S.profile.app_name || 'Keuanganku';
  }
  async function loadTx() {
    const { data, error } = await S.sb.from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(5000);
    if (error) toast(error.message, false);
    S.tx = data || [];
  }
  async function enter(user) { S.user = user; await Promise.all([loadProfile(), loadTx()]); render(); }

  // ---------- Boot ----------
  async function boot() {
    const cfg = await fetch('/api/config').then(r => r.json()).catch(() => ({}));
    if (!cfg.url || !cfg.anonKey) {
      app.innerHTML = '<div class="max-w-md p-6 text-center"><p class="font-semibold text-slate-800">Supabase belum dikonfigurasi</p><p class="mt-2 text-sm">Isi SUPABASE_URL dan SUPABASE_ANON_KEY di file .env (lokal) atau Environment Variables Vercel.</p></div>';
      return;
    }
    S.sb = supabase.createClient(cfg.url, cfg.anonKey);
    S.sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') { S.user = null; render(); } });
    const { data: { session } } = await S.sb.auth.getSession();
    if (session) await enter(session.user); else render();
    window.addEventListener('hashchange', render);
  }

  function render() {
    S.charts.forEach(c => c.destroy()); S.charts = [];
    if (!S.user) return authView();
    shell(route());
  }

  // ---------- Auth ----------
  function authView() {
    const reg = S.mode === 'register';
    app.className = '';
    app.innerHTML = `
    <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 via-brand-500 to-indigo-500 sm:p-8">
      <div class="grid min-h-screen w-full max-w-5xl overflow-hidden bg-white shadow-2xl sm:min-h-[620px] sm:rounded-3xl md:grid-cols-2">
        <div class="hidden flex-col justify-between bg-brand-50 p-10 md:flex">
          <div class="flex items-center gap-2 text-lg font-bold text-brand-700"><i class="bi bi-wallet2 text-2xl"></i> Keuanganku</div>
          <div>
            <div class="relative mx-auto h-60 w-72">
              <div class="absolute inset-x-0 top-6 rounded-2xl bg-white p-4 shadow-xl">
                <div class="flex h-24 items-end gap-2">
                  ${[40, 65, 50, 90, 60, 75, 45].map(h => `<div class="flex-1 rounded-t-lg ${h > 80 ? 'bg-brand-600' : 'bg-brand-200'}" style="height:${h}%"></div>`).join('')}
                </div>
                <div class="mt-3 h-2 w-24 rounded bg-slate-200"></div><div class="mt-2 h-2 w-16 rounded bg-slate-100"></div>
              </div>
              <div class="absolute -left-3 top-0 grid size-14 place-items-center rounded-full bg-emerald-400 text-2xl text-white shadow-lg"><i class="bi bi-graph-up-arrow"></i></div>
              <div class="absolute -right-3 bottom-4 grid size-16 place-items-center rounded-2xl bg-brand-600 text-3xl text-white shadow-lg"><i class="bi bi-shield-lock-fill"></i></div>
            </div>
            <h2 class="mt-8 text-2xl font-bold text-slate-900">Catat. Pantau. Atur.</h2>
            <p class="mt-2 max-w-xs text-sm text-slate-600">Semua pemasukan dan pengeluaran Anda dalam satu dashboard yang aman.</p>
          </div>
          <p class="text-xs text-slate-400">Data Anda hanya bisa dilihat oleh Anda.</p>
        </div>
        <div class="flex flex-col justify-center p-6 sm:p-12">
          <div class="mb-8 flex items-center justify-between">
            <span class="flex items-center gap-2 font-bold text-brand-700 md:hidden"><i class="bi bi-wallet2 text-xl"></i> Keuanganku</span>
            <span class="ml-auto text-sm text-slate-500">${reg ? 'Sudah punya akun?' : 'Belum punya akun?'}
              <button data-act="mode" class="ml-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">${reg ? 'Masuk' : 'Daftar'}</button></span>
          </div>
          <h1 class="text-3xl font-extrabold text-slate-900">${reg ? 'Buat akun baru' : 'Selamat datang kembali'}</h1>
          <p class="mt-1 text-slate-500">${reg ? 'Daftar untuk mulai mencatat keuangan.' : 'Masuk untuk membuka dashboard keuangan Anda.'}</p>
          <form data-form="auth" class="mt-8 space-y-4">
            ${reg ? '<div><label class="lbl" for="a-name">Nama</label><input id="a-name" name="name" class="inp" placeholder="Nama lengkap" required></div>' : ''}
            <div><label class="lbl" for="a-email">Email</label><input id="a-email" name="email" type="email" class="inp" placeholder="nama@email.com" autocomplete="email" required></div>
            <div><label class="lbl" for="a-pass">Password</label>
              <div class="relative"><input id="a-pass" name="password" type="password" minlength="6" class="inp pr-11" placeholder="Minimal 6 karakter" autocomplete="${reg ? 'new-password' : 'current-password'}" required>
              <button type="button" data-act="eye" aria-label="Tampilkan password" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><i class="bi bi-eye"></i></button></div></div>
            <p id="autherr" class="hidden rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600"></p>
            <button class="btn w-full rounded-full py-3.5" type="submit">${reg ? 'Daftar' : 'Masuk'}</button>
          </form>
        </div>
      </div>
    </div>`;
  }

  async function doAuth(f) {
    const fd = new FormData(f), email = fd.get('email').trim(), password = fd.get('password');
    const btn = f.querySelector('[type=submit]'); busy(btn, true);
    try {
      if (S.mode === 'register') {
        const { data, error } = await S.sb.auth.signUp({ email, password, options: { data: { full_name: fd.get('name').trim() } } });
        if (error) throw error;
        if (data.session) return await enter(data.user);
        S.mode = 'login'; render(); toast('Akun dibuat. Cek email untuk verifikasi, lalu masuk.');
      } else {
        const { data, error } = await S.sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.hash = '#/dashboard';
        await enter(data.user);
      }
    } catch (err) {
      const box = $('#autherr'); box.textContent = errMsg(err); box.classList.remove('hidden'); busy(btn, false);
    }
  }

  // ---------- Layout ----------
  function logo(size = 'size-10') {
    const p = S.profile || {};
    return p.logo_url
      ? `<img src="${esc(p.logo_url)}" alt="Logo" class="${size} rounded-xl bg-white object-cover">`
      : `<span class="${size} grid place-items-center rounded-xl bg-white text-xl text-brand-600"><i class="bi bi-wallet2"></i></span>`;
  }

  function shell(r) {
    const p = S.profile || {};
    const link = (n, mobile) => mobile
      ? `<a href="#/${n.id}" class="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${r === n.id ? 'text-brand-600' : 'text-slate-400'}"><i class="bi ${n.icon} text-xl"></i>${n.label}</a>`
      : `<a href="#/${n.id}" class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${r === n.id ? 'bg-white text-brand-700 shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'}"><i class="bi ${n.icon} text-lg"></i>${n.label}</a>`;
    app.className = '';
    app.innerHTML = `
    <div class="min-h-screen lg:flex">
      <aside class="fixed inset-y-0 left-0 hidden w-64 flex-col bg-brand-600 p-5 text-white lg:flex">
        <div class="mb-8 flex items-center gap-3">${logo()}<span class="truncate text-lg font-extrabold">${esc(p.app_name)}</span></div>
        <nav class="space-y-1">${NAV.map(n => link(n)).join('')}</nav>
        <button data-act="logout" class="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"><i class="bi bi-box-arrow-left text-lg"></i> Keluar</button>
      </aside>
      <header class="sticky top-0 z-30 flex items-center gap-3 bg-brand-600 px-4 py-3 text-white lg:hidden">
        ${logo('size-9')}<span class="flex-1 truncate font-extrabold">${esc(p.app_name)}</span>
        <button data-act="logout" aria-label="Keluar" class="grid size-9 place-items-center rounded-lg hover:bg-white/10"><i class="bi bi-box-arrow-right text-xl"></i></button>
      </header>
      <main class="min-w-0 flex-1 p-4 pb-28 sm:p-6 lg:ml-64 lg:p-8">${view(r)}</main>
      <nav class="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white lg:hidden">${NAV.map(n => link(n, true)).join('')}</nav>
    </div>`;
    after(r);
  }

  const view = r => r === 'dashboard' ? dashView() : r === 'profile' ? profileView() : txView(r);
  const after = r => { if (r === 'dashboard') drawCharts(); else if (r !== 'profile') renderList(r); };

  // ---------- Dashboard ----------
  function dashView() {
    const mk = ymd(new Date()).slice(0, 7), month = S.tx.filter(x => x.date.startsWith(mk));
    const inc = sum(month, 'income'), out = sum(month, 'expense'), bal = sum(S.tx, 'income') - sum(S.tx, 'expense');
    const stat = (label, val, icon, tone) => `<div class="card flex items-center gap-4"><span class="grid size-12 shrink-0 place-items-center rounded-xl text-xl ${tone}"><i class="bi ${icon}"></i></span><div class="min-w-0"><p class="text-xs text-slate-500">${label}</p><p class="truncate text-lg font-bold sm:text-xl">${val}</p></div></div>`;
    const rangeBtn = (k, t) => `<button data-act="range" data-v="${k}" class="rounded-lg px-3 py-1.5 text-xs font-semibold ${S.range === k ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'}">${t}</button>`;
    const recent = S.tx.slice(0, 6);
    return `
    <div class="mb-6"><h1 class="text-2xl font-extrabold">Dashboard</h1><p class="text-sm text-slate-500">Halo, ${esc(S.profile?.full_name || 'Pengguna')}. Ini ringkasan keuangan Anda.</p></div>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="flex items-center gap-4 rounded-2xl bg-brand-600 p-5 text-white"><span class="grid size-12 shrink-0 place-items-center rounded-xl bg-white/20 text-xl"><i class="bi bi-wallet2"></i></span><div class="min-w-0"><p class="text-xs text-white/70">Saldo total</p><p class="truncate text-lg font-bold sm:text-xl">${idr(bal)}</p></div></div>
      ${stat('Pemasukan bulan ini', idr(inc), 'bi-arrow-down-left', 'bg-emerald-100 text-emerald-600')}
      ${stat('Pengeluaran bulan ini', idr(out), 'bi-arrow-up-right', 'bg-rose-100 text-rose-500')}
      ${stat('Transaksi bulan ini', month.length, 'bi-receipt', 'bg-brand-100 text-brand-600')}
    </div>
    <div class="mt-4 grid gap-4 xl:grid-cols-3">
      <section class="card xl:col-span-2">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 class="font-bold">Grafik pemasukan &amp; pengeluaran</h2>
          <div class="flex gap-1 rounded-xl bg-slate-50 p-1">${rangeBtn('7d', '7 Hari')}${rangeBtn('6m', '6 Bulan')}${rangeBtn('12m', '12 Bulan')}</div></div>
        <div class="relative h-64 sm:h-72"><canvas id="c-bar"></canvas></div>
      </section>
      <section class="card"><h2 class="mb-4 font-bold">Pengeluaran terbesar bulan ini</h2>
        <div class="relative h-64 sm:h-72">${out ? '<canvas id="c-pie"></canvas>' : '<p class="grid h-full place-items-center text-sm text-slate-400">Belum ada pengeluaran bulan ini.</p>'}</div></section>
    </div>
    <section class="card mt-4"><div class="flex items-center justify-between"><h2 class="font-bold">Transaksi terbaru</h2></div>
      <ul class="mt-2 divide-y divide-slate-100">${recent.length ? recent.map(x => row(x)).join('') : '<li class="py-8 text-center text-sm text-slate-400">Belum ada transaksi. Mulai dari menu Income atau Outcome.</li>'}</ul></section>`;
  }

  function series() {
    const now = new Date(), labels = [], keys = [];
    if (S.range === '7d') {
      for (let i = 6; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i); keys.push(ymd(d)); labels.push(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })); }
    } else {
      const n = S.range === '6m' ? 6 : 12;
      for (let i = n - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); keys.push(ymd(d).slice(0, 7)); labels.push(d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })); }
    }
    const len = S.range === '7d' ? 10 : 7, inc = keys.map(() => 0), out = keys.map(() => 0);
    S.tx.forEach(x => { const i = keys.indexOf(x.date.slice(0, len)); if (i > -1) (x.type === 'income' ? inc : out)[i] += Number(x.amount); });
    return { labels, inc, out };
  }

  function drawCharts() {
    const { labels, inc, out } = series();
    const tip = { callbacks: { label: c => ` ${c.dataset.label || c.label}: ${idr(c.parsed.y ?? c.parsed)}` } };
    S.charts.push(new Chart($('#c-bar'), {
      type: 'bar',
      data: { labels, datasets: [
        { label: 'Income', data: inc, backgroundColor: '#2563eb', borderRadius: 8, maxBarThickness: 28 },
        { label: 'Outcome', data: out, backgroundColor: '#fb7185', borderRadius: 8, maxBarThickness: 28 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: tip },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: compact }, grid: { color: '#f1f5f9' } } } }
    }));
    const pie = $('#c-pie');
    if (pie) {
      const mk = ymd(new Date()).slice(0, 7), map = {};
      S.tx.filter(x => x.type === 'expense' && x.date.startsWith(mk)).forEach(x => { const k = x.description.trim().toLowerCase(); (map[k] = map[k] || { n: x.description.trim(), v: 0 }).v += Number(x.amount); });
      const top = Object.values(map).sort((a, b) => b.v - a.v).slice(0, 5);
      S.charts.push(new Chart(pie, {
        type: 'doughnut',
        data: { labels: top.map(t => t.n), datasets: [{ data: top.map(t => t.v), backgroundColor: ['#1d4fcf', '#3b78f2', '#7aa5f7', '#fb7185', '#fdba74'], borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { callbacks: { label: c => ` ${c.label}: ${idr(c.parsed)}` } } } }
      }));
    }
  }

  // ---------- Income / Outcome ----------
  function row(x, actions) {
    const inc = x.type === 'income';
    return `<li class="flex items-center gap-3 py-3">
      <span class="grid size-10 shrink-0 place-items-center rounded-full ${inc ? 'bg-brand-100 text-brand-600' : 'bg-rose-100 text-rose-500'}"><i class="bi ${inc ? 'bi-arrow-down-left' : 'bi-arrow-up-right'}"></i></span>
      <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">${esc(x.description)}</p><p class="text-xs text-slate-500">${fmtDate(x.date)}</p></div>
      <p class="shrink-0 text-sm font-bold ${inc ? 'text-brand-600' : 'text-rose-500'}">${inc ? '+' : '-'}${idr(x.amount)}</p>
      ${actions ? `<div class="flex shrink-0 gap-1"><button data-act="edit" data-id="${x.id}" aria-label="Ubah" class="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-600"><i class="bi bi-pencil-square"></i></button><button data-act="del" data-id="${x.id}" aria-label="Hapus" class="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"><i class="bi bi-trash3"></i></button></div>` : ''}
    </li>`;
  }

  function txView(r) {
    const isIn = r === 'income';
    return `
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div><h1 class="text-2xl font-extrabold">${isIn ? 'Income' : 'Outcome'}</h1><p class="text-sm text-slate-500">${isIn ? 'Catat semua pemasukan Anda.' : 'Catat semua pengeluaran Anda.'}</p></div>
      <button data-act="add" class="btn"><i class="bi bi-plus-lg"></i> ${isIn ? 'Tambah pemasukan' : 'Tambah pengeluaran'}</button>
    </div>
    <div class="card">
      <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="relative flex-1"><i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i><input id="q" class="inp pl-10" placeholder="Cari keterangan…" aria-label="Cari keterangan"></div>
        <input id="m" type="month" class="inp sm:w-48" aria-label="Filter bulan">
      </div>
      <div class="flex items-center justify-between rounded-xl ${isIn ? 'bg-brand-50 text-brand-700' : 'bg-rose-50 text-rose-600'} px-4 py-3 text-sm font-semibold"><span>Total ditampilkan</span><span id="txtotal"></span></div>
      <ul id="txlist" class="mt-2 divide-y divide-slate-100"></ul>
    </div>`;
  }

  function renderList(r) {
    const type = TYPE[r], q = ($('#q')?.value || '').toLowerCase(), m = $('#m')?.value || '';
    const items = S.tx.filter(x => x.type === type && x.description.toLowerCase().includes(q) && (!m || x.date.startsWith(m)));
    $('#txtotal').textContent = idr(items.reduce((a, x) => a + Number(x.amount), 0));
    $('#txlist').innerHTML = items.length ? items.map(x => row(x, true)).join('')
      : `<li class="py-10 text-center text-sm text-slate-400">${S.tx.some(x => x.type === type) ? 'Tidak ada data yang cocok.' : 'Belum ada data. Tekan tombol Tambah untuk mencatat.'}</li>`;
  }

  function openModal(r, item) {
    const isIn = r === 'income';
    const d = document.createElement('div');
    d.id = 'modal';
    d.className = 'fixed inset-0 z-50 grid place-items-end bg-slate-900/50 sm:place-items-center sm:p-4';
    d.innerHTML = `
    <form data-form="tx" data-route="${r}" data-id="${item?.id || ''}" class="max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
      <div class="flex items-center justify-between"><h2 class="text-lg font-bold">${item ? 'Ubah' : 'Tambah'} ${isIn ? 'pemasukan' : 'pengeluaran'}</h2>
        <button type="button" data-act="close" aria-label="Tutup" class="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><i class="bi bi-x-lg"></i></button></div>
      <div><label class="lbl" for="f-desc">Keterangan</label><input id="f-desc" name="description" class="inp" placeholder="${isIn ? 'Contoh: Gaji bulanan' : 'Contoh: Makan siang'}" value="${esc(item?.description)}" required></div>
      <div><label class="lbl" for="f-amt">Nominal (Rp)</label><input id="f-amt" name="amount" type="number" inputmode="numeric" min="1" step="1" class="inp" placeholder="0" value="${item ? Number(item.amount) : ''}" required></div>
      <div><label class="lbl" for="f-date">Tanggal</label><input id="f-date" name="date" type="date" class="inp" value="${item?.date || ymd(new Date())}" required></div>
      <div class="flex gap-3 pt-2"><button type="button" data-act="close" class="btn-ghost flex-1">Batal</button><button type="submit" class="btn flex-1">Simpan</button></div>
    </form>`;
    document.body.appendChild(d);
    $('#f-desc').focus();
  }
  const closeModal = () => $('#modal')?.remove();

  async function saveTx(f) {
    const fd = new FormData(f), id = f.dataset.id, r = f.dataset.route, btn = f.querySelector('[type=submit]');
    const row = { type: TYPE[r], description: fd.get('description').trim(), amount: Number(fd.get('amount')), date: fd.get('date') };
    busy(btn, true);
    const { error } = id ? await S.sb.from('transactions').update(row).eq('id', id) : await S.sb.from('transactions').insert(row);
    if (error) { busy(btn, false); return toast(error.message, false); }
    await loadTx(); closeModal(); render(); toast('Data tersimpan.');
  }

  // ---------- Profile ----------
  function profileView() {
    const p = S.profile || {};
    return `
    <div class="mb-6"><h1 class="text-2xl font-extrabold">Profile</h1><p class="text-sm text-slate-500">Atur nama, logo, dan keamanan akun.</p></div>
    <div class="grid max-w-4xl gap-4 lg:grid-cols-2">
      <form data-form="profile" class="card space-y-4">
        <h2 class="font-bold">Informasi aplikasi</h2>
        <div class="flex items-center gap-4">
          <div id="logo-prev" class="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand-600">${p.logo_url ? `<img src="${esc(p.logo_url)}" alt="Logo" class="size-full object-cover">` : '<i class="bi bi-wallet2 text-3xl text-white"></i>'}</div>
          <div><label for="p-logo" class="btn-ghost cursor-pointer"><i class="bi bi-upload"></i> Ganti logo</label><input id="p-logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="sr-only"><p class="mt-1 text-xs text-slate-400">PNG, JPG, WEBP, atau SVG. Maks 2 MB.</p></div>
        </div>
        <div><label class="lbl" for="p-app">Nama aplikasi</label><input id="p-app" name="app_name" class="inp" value="${esc(p.app_name)}" required maxlength="40"></div>
        <div><label class="lbl" for="p-name">Nama lengkap</label><input id="p-name" name="full_name" class="inp" value="${esc(p.full_name)}" maxlength="60"></div>
        <div><label class="lbl" for="p-mail">Email</label><input id="p-mail" class="inp bg-slate-50 text-slate-500" value="${esc(S.user.email)}" disabled></div>
        <button class="btn w-full" type="submit">Simpan perubahan</button>
      </form>
      <form data-form="pw" class="card h-fit space-y-4">
        <h2 class="font-bold">Ganti password</h2>
        <div><label class="lbl" for="pw1">Password baru</label><input id="pw1" name="pw" type="password" minlength="6" class="inp" placeholder="Minimal 6 karakter" autocomplete="new-password" required></div>
        <button class="btn w-full" type="submit">Perbarui password</button>
        <hr class="border-slate-100">
        <button type="button" data-act="logout" class="btn-ghost w-full text-rose-600"><i class="bi bi-box-arrow-left"></i> Keluar dari akun</button>
      </form>
    </div>`;
  }

  async function saveProfile(f) {
    const fd = new FormData(f), btn = f.querySelector('[type=submit]'), file = fd.get('logo');
    busy(btn, true);
    try {
      let logo_url = S.profile?.logo_url || null;
      if (file && file.size) {
        if (file.size > 2 * 1024 * 1024) throw new Error('Ukuran logo maksimal 2 MB.');
        const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `${S.user.id}/logo-${Date.now()}.${ext}`;
        const up = await S.sb.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type });
        if (up.error) throw up.error;
        logo_url = S.sb.storage.from('logos').getPublicUrl(path).data.publicUrl;
      }
      const { data, error } = await S.sb.from('profiles').upsert({ id: S.user.id, app_name: fd.get('app_name').trim() || 'Keuanganku', full_name: fd.get('full_name').trim(), logo_url, updated_at: new Date().toISOString() }).select().single();
      if (error) throw error;
      S.profile = data; document.title = data.app_name; render(); toast('Profile diperbarui.');
    } catch (err) { busy(btn, false); toast(err.message, false); }
  }

  async function savePw(f) {
    const btn = f.querySelector('[type=submit]'); busy(btn, true);
    const { error } = await S.sb.auth.updateUser({ password: new FormData(f).get('pw') });
    busy(btn, false);
    if (error) return toast(errMsg(error), false);
    f.reset(); toast('Password diperbarui.');
  }

  // ---------- Events ----------
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act, r = route();
    if (a === 'mode') { S.mode = S.mode === 'login' ? 'register' : 'login'; render(); }
    else if (a === 'eye') { const i = $('#a-pass'); i.type = i.type === 'password' ? 'text' : 'password'; el.firstElementChild.className = 'bi ' + (i.type === 'password' ? 'bi-eye' : 'bi-eye-slash'); }
    else if (a === 'logout') { await S.sb.auth.signOut(); location.hash = ''; }
    else if (a === 'range') { S.range = el.dataset.v; render(); }
    else if (a === 'add') openModal(r);
    else if (a === 'edit') openModal(r, S.tx.find(x => x.id === el.dataset.id));
    else if (a === 'close') closeModal();
    else if (a === 'del') {
      if (!confirm('Hapus data ini?')) return;
      const { error } = await S.sb.from('transactions').delete().eq('id', el.dataset.id);
      if (error) return toast(error.message, false);
      await loadTx(); render(); toast('Data dihapus.');
    }
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]'); if (!f) return;
    e.preventDefault();
    ({ auth: doAuth, tx: saveTx, profile: saveProfile, pw: savePw })[f.dataset.form](f);
  });
  document.addEventListener('input', e => { if (e.target.id === 'q' || e.target.id === 'm') renderList(route()); });
  document.addEventListener('change', e => {
    if (e.target.id !== 'p-logo' || !e.target.files[0]) return;
    $('#logo-prev').innerHTML = `<img src="${URL.createObjectURL(e.target.files[0])}" alt="Pratinjau logo" class="size-full object-cover">`;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  boot();
})();

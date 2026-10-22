# Keuanganku – Dashboard Keuangan Pribadi

Node.js · Tailwind CSS · Bootstrap Icons · Supabase (Auth, Database, Storage) · Chart.js

Menu: **Dashboard** (grafik rincian), **Income**, **Outcome**, **Profile** (logo, nama aplikasi, nama, password).
Wajib login untuk membuka dashboard. Responsif (sidebar di desktop, bottom-nav di mobile).

## 1. Siapkan Supabase
1. Buat project di https://supabase.com
2. Buka **SQL Editor** → tempel isi `supabase/schema.sql` → **Run**
   (membuat tabel `profiles`, `transactions`, aturan RLS, dan bucket `logos`)
3. (Opsional untuk uji coba) **Authentication → Providers → Email** → matikan *Confirm email*
   agar bisa langsung masuk setelah daftar.
4. **Project Settings → API** → salin *Project URL* dan *anon public key*.

## 2. Jalankan lokal
```bash
npm install
cp .env.example .env      # isi SUPABASE_URL dan SUPABASE_ANON_KEY
npm run dev               # http://localhost:3000
```

## 3. Upload ke GitHub
```bash
git init && git add . && git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/USERNAME/keuanganku.git
git push -u origin main
```

## 4. Deploy ke Vercel
1. Vercel → **Add New → Project** → pilih repository GitHub tadi.
2. Framework Preset: **Other**. Build Command `npm run build`, Output Directory `public`
   (sudah diatur di `vercel.json`).
3. **Environment Variables**: tambahkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY`.
4. Deploy. Lalu di Supabase → **Authentication → URL Configuration**, isi *Site URL*
   dengan domain Vercel Anda (penting bila verifikasi email aktif).

## Struktur
```
api/config.js        endpoint Vercel yang mengirim config publik Supabase
server.js            server Express untuk development lokal
public/index.html    halaman utama
public/js/app.js     seluruh logika aplikasi (login, dashboard, income, outcome, profile)
src/input.css        sumber Tailwind  →  public/css/app.css (hasil build)
supabase/schema.sql  tabel, RLS, trigger, storage
```

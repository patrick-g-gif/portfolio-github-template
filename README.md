# Portofolio Interaktif (React + Vite)

Template portofolio single-page interaktif tanpa backend. Semua konten diambil
dari satu file data, sehingga isinya bisa diganti tanpa menyentuh komponen.
Hasil build berupa file statis di `dist/` dan bisa di-host di mana saja
(nginx, Apache, atau Vercel).

## Fitur

- Hero dengan animasi topologi jaringan berbasis Canvas (interaktif).
- Efek typewriter untuk nama dan jabatan.
- Mode terang/gelap yang tersimpan di `localStorage`.
- Section About dengan statistik dan grid highlight.
- Section Skills berkelompok dengan progress bar animasi.
- Terminal ala Cisco yang berfungsi (`help`, `show version`, `show ip route`, dll).
- Project dengan filter kategori dan modal berisi diagram topologi SVG.
- Timeline sertifikasi dan pengalaman.
- Section Contact dengan tombol email/LinkedIn/GitHub dan widget ping.
- Menghormati `prefers-reduced-motion` dan preferensi tema sistem.
- SEO dan Open Graph diisi otomatis saat build.

## Tech stack

- React 18 + Framer Motion
- Vite + Tailwind CSS
- Vitest + React Testing Library

## Menjalankan secara lokal

```bash
npm install
npm run dev     # server pengembangan dengan hot reload
```

## Build dan test

```bash
npm test        # test suite
npm run build   # hasil produksi di dist/
npm run preview # pratinjau build produksi
```

## Mengganti data

Cukup edit satu file: `src/data/portfolio.js`. Di dalamnya terdapat blok
`identity`, `seo`, `hero`, `about`, `skills`, `projects`, `timeline`,
`certifications`, `contact`, dan `terminal`. Komponen tidak perlu diubah.

Tag SEO di `index.html` diisi otomatis dari blok `seo` saat build. Gambar
preview media sosial diperbarui dengan `npm run generate:og`.

## Struktur proyek

```
src/
  components/      # komponen UI
  data/portfolio.js # semua konten
  hooks/           # custom hooks
  test/            # test
vite/              # plugin transformHtml (SEO)
deploy/            # contoh konfigurasi nginx/Apache/systemd
```

## Deploy

Build lalu salin isi `dist/` ke document root server. Contoh skrip
`deploy.sh` dan konfigurasi nginx/Apache tersedia di folder `deploy/`.
Untuk HTTPS gunakan Certbot; DNS cukup arahkan record A/AAAA ke server.


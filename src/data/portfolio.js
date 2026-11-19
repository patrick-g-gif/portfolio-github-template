/**
 * ============================================================================
 *  PORTFOLIO DATA — single source of truth
 * ============================================================================
 *
 *  HOW TO EDIT (beginner-friendly):
 *  1. Open this file.
 *  2. Find the line with the value you want to change (Ctrl/Cmd + F helps).
 *  3. Replace the text between the quotes with your own — keep the quotes and
 *     the trailing comma.
 *  4. Save. The dev server hot-reloads instantly; run `npm run build` to publish.
 *
 *  RULES:
 *  - Keep every value inside 'single quotes' or "double quotes".
 *  - Keep the comma at the end of each line.
 *  - Leave the keys (the words before the colon) exactly as they are.
 *  - Everything shown on the site — hero, about, skills, projects, timeline,
 *    certifications, terminal output and contact — is generated from here.
 *
 *  NOTHING INVENTED. Unknown values (a year, a metric, a certification) are
 *  left out or left empty on purpose. Do not fill gaps with plausible numbers.
 *
 *  SEO / OPEN GRAPH — the `seo` block below is the single source for the
 *  <title>, description, canonical, Open Graph and Twitter tags in index.html.
 *  You do NOT edit index.html for SEO: the vite plugin in `vite/transformHtml.js`
 *  reads this file and fills the {NAME}, {TITLE}, {DESCRIPTION}, {SITE_URL},
 *  {OG_IMAGE} and {EMAIL} tokens on every dev page load and on every build.
 *  Edit the values here and both the dev server and the built site follow.
 */

/* --------------------------------------------------------------------------
 * IDENTITY
 * -------------------------------------------------------------------------- */
export const identity = {
  name: 'Alex Rivera',
  title: 'Full-Stack Developer',
  shortTitle: 'Dev',
  // Shown by the hero typewriter after the title.
  tagline: 'Membangun aplikasi web modern yang cepat dan mudah diakses.',
  initials: 'AR',
  location: 'Jakarta, Indonesia',
  availability: 'Open to work',
  // The domain used by the ping widget and shown in the terminal. Single source.
  domain: 'example.com',
}

/* --------------------------------------------------------------------------
 * SEO / OPEN GRAPH — used to fill index.html (see header comment above)
 * -------------------------------------------------------------------------- */
export const seo = {
  // No trailing slash. Used for the canonical URL and as the base of the
  // og:image / twitter:image absolute URLs.
  siteUrl: 'https://example.com',
  description:
    'Portofolio Alex Rivera — Full-Stack Developer yang fokus pada performa web modern dan pengalaman pengguna.',
  // Path (or full URL) of the social preview image. The file itself lives at
  // public/og-image.png and is regenerated with `npm run generate:og`.
  ogImage: '/og-image.png',
  // Cache-buster appended to the og:image / twitter:image URL (see
  // vite/transformHtml.js). Bump this whenever the preview image changes, or
  // Discord/WhatsApp will keep serving the previously cached one.
  ogImageVersion: '2',
}

export const hero = {
  badges: ['MikroTik', 'Fiber Optic', 'Debian Server', 'Troubleshooting'],
}

export const about = {
  bio: [
    'Saya adalah seorang siswa SMK Jurusan Teknik Komputer dan Jaringan yang memiliki ketertarikan besar di bidang infrastruktur IT, manajemen jaringan, dan konfigurasi server.',
  ],
  avatar: {
    // Drop your own photo at public/images/me.jpg and point `src` at it.
    src: '', // e.g. './images/me.jpg'
    alt: 'Portrait of Alex Rivera',
    initials: 'AR',
  },
  // NOTE: the About stat cards are NOT read from this object. They are derived
  // from the real data in `stats` (projectCount / skillCount) so they can never
  // drift from the content. See `src/components/About.jsx`.
  highlights: [
    { title: 'Networking', text: 'Konfigurasi MikroTik dan penataan kabel LAN untuk jaringan lokal.' },
    { title: 'Fiber Optic', text: 'Praktik splicing dan penyambungan fiber optik, termasuk pengetesan sambungan.' },
    { title: 'Server', text: 'Dasar administrasi Debian Server dan pengenalan virtualisasi dengan Proxmox.' },
    { title: 'Support', text: 'Diagnosis dan perawatan PC: mencari penyebab masalah lalu memperbaikinya.' },
  ],
}

/* --------------------------------------------------------------------------
 * SKILLS — grouped cards with a proficiency bar (0-100).
 * Levels are a self-assessment of what has actually been practised in labs.
 * Only these six skills are listed — do not add others.
 * -------------------------------------------------------------------------- */
export const skills = [
  {
    id: 'networking',
    title: 'Networking',
    icon: 'route',
    blurb: 'Konfigurasi perangkat jaringan dan penataan kabel untuk jaringan lokal.',
    items: [
      { name: 'MikroTik', level: 55 },
      { name: 'Manajemen Kabel LAN', level: 50 },
    ],
  },
  {
    id: 'fiber-optic',
    title: 'Fiber Optic',
    icon: 'pulse',
    blurb: 'Penyambungan fiber optik dan pengetesan sambungan.',
    items: [
      { name: 'Splicing', level: 50 },
      { name: 'Fiber Optic', level: 45 },
    ],
  },
  {
    id: 'server',
    title: 'Server & Virtualisasi',
    icon: 'terminal',
    blurb: 'Administrasi dasar server Linux dan pengenalan virtualisasi.',
    items: [
      { name: 'Debian Server', level: 50 },
      { name: 'Proxmox (dasar)', level: 35 },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    icon: 'switch',
    blurb: 'Mencari penyebab masalah pada perangkat lalu memperbaikinya.',
    items: [
      { name: 'Troubleshooting PC', level: 55 },
      // PLACEHOLDER — CV tidak mencantumkan angka untuk ini, ganti sesuai penilaian sendiri.
      { name: 'Kerjasama Tim & Komunikasi', level: 60 },
    ],
  },
]

/* --------------------------------------------------------------------------
 * PROJECTS — `topology` is optional: when present the modal draws an animated
 * SVG diagram. Coordinates are in a 0-100 x 0-60 viewBox.
 * `year` is deliberately absent everywhere: the completion year is not known,
 * and the UI renders nothing for a missing year rather than an empty label.
 * `metrics` is deliberately gone — no invented numbers anywhere.
 * -------------------------------------------------------------------------- */
export const projects = [
  {
    id: 'server-migration',
    title: 'Migrasi Server',
    category: 'Server',
    summary: 'Memindahkan layanan dari server lama ke server baru.',
    description:
      'Layanan pada server lama dipindahkan ke server baru. Prosesnya dimulai dengan menyiapkan server baru, lalu memindahkan data dan konfigurasi layanan secara bertahap. Setelah selesai, layanan dijalankan ulang dan diperiksa satu per satu supaya tidak ada yang terlewat. Konfigurasi penting dicatat ulang supaya server baru bisa dikelola sendiri.',
    tools: ['Debian Server', 'Proxmox'],
    result: 'Layanan berjalan kembali di server baru setelah migrasi selesai.',
    repoUrl: '',
    topology: {
      nodes: [
        { id: 'old', label: 'SERVER LAMA', x: 26, y: 28, type: 'server' },
        { id: 'new', label: 'SERVER BARU', x: 74, y: 28, type: 'server' },
        { id: 'svc', label: 'LAYANAN', x: 50, y: 54, type: 'server' },
      ],
      edges: [
        { from: 'old', to: 'svc' },
        { from: 'new', to: 'svc' },
      ],
    },
  },
  {
    id: 'pc-troubleshooting',
    title: 'Troubleshooting & Maintenance PC',
    category: 'Support',
    summary: 'Diagnosis dan perawatan perangkat PC.',
    description:
      'Perangkat PC yang bermasalah diperiksa secara bertahap: dicek dulu apakah masalahnya ada pada perangkat, sistem operasi, atau aplikasi yang dipakai. Setelah penyebabnya diketahui, perbaikan dilakukan sesuai bagian yang bermasalah. Perawatan rutin juga dikerjakan, seperti membersihkan perangkat dan memastikan kondisinya tetap baik.',
    tools: [],
    result: 'Perangkat yang bermasalah berhasil ditemukan penyebabnya lalu diperbaiki.',
    repoUrl: '',
    topology: {
      nodes: [
        { id: 'user', label: 'PENGGUNA', x: 20, y: 28, type: 'internet' },
        { id: 'pc', label: 'PC', x: 50, y: 28, type: 'server' },
        { id: 'net', label: 'JARINGAN', x: 80, y: 28, type: 'switch' },
      ],
      edges: [
        { from: 'user', to: 'pc' },
        { from: 'pc', to: 'net' },
      ],
    },
  },
  {
    id: 'wifi-cabling-sekolah',
    title: 'Pemasangan WiFi & Penataan Kabel di Sekolah',
    category: 'Networking',
    summary: 'Pemasangan WiFi dan penataan kabel LAN di lingkungan sekolah.',
    description:
      'Pemasangan WiFi di sekolah dilakukan mulai dari menentukan titik pemasangan access point, menata kabel LAN ke switch, lalu mengatur konfigurasi perangkatnya. Kabel dirapikan agar tertata dan mudah dilacak saat terjadi masalah. Setelah selesai, area sekolah sudah bisa dilayani WiFi.',
    tools: ['MikroTik', 'Kabel LAN'],
    result: 'WiFi terpasang dan kabel LAN tertata di sekolah.',
    repoUrl: '',
    topology: {
      nodes: [
        { id: 'isp', label: 'INTERNET', x: 50, y: 8, type: 'internet' },
        { id: 'rtr', label: 'MIKROTIK', x: 50, y: 24, type: 'router' },
        { id: 'ap1', label: 'AP-1', x: 26, y: 44, type: 'switch' },
        { id: 'ap2', label: 'AP-2', x: 74, y: 44, type: 'switch' },
        { id: 'pc', label: 'PC', x: 50, y: 58, type: 'server' },
      ],
      edges: [
        { from: 'isp', to: 'rtr' },
        { from: 'rtr', to: 'ap1' },
        { from: 'rtr', to: 'ap2' },
        { from: 'ap2', to: 'pc' },
      ],
    },
  },
  {
    id: 'school-server-admin',
    title: 'Setup & Administrasi Server Sekolah',
    category: 'Server',
    summary: 'Proxmox VE, VPS Debian 12, monitoring Netdata, dan akses remote lewat Tailscale di server sekolah.',
    description:
      'Proxmox VE dipasang sebagai hypervisor di server sekolah, lalu di atasnya dijalankan VPS Debian 12 untuk berbagai layanan. Netdata dipasang untuk memonitor kondisi server secara real-time, dan Tailscale dipakai supaya server bisa diakses dari jarak jauh tanpa perlu membuka port ke internet publik.',
    tools: ['Proxmox VE', 'Debian 12', 'Netdata', 'Tailscale'],
    result: 'Server sekolah berjalan dengan monitoring aktif dan bisa diakses dari jarak jauh secara aman.',
    repoUrl: '',
    topology: {
      nodes: [
        { id: 'proxmox', label: 'PROXMOX VE', x: 50, y: 14, type: 'server' },
        { id: 'vps', label: 'VPS DEBIAN 12', x: 26, y: 42, type: 'server' },
        { id: 'monitor', label: 'NETDATA', x: 74, y: 42, type: 'server' },
        { id: 'remote', label: 'TAILSCALE', x: 50, y: 58, type: 'internet' },
      ],
      edges: [
        { from: 'proxmox', to: 'vps' },
        { from: 'proxmox', to: 'monitor' },
        { from: 'remote', to: 'proxmox' },
      ],
    },
  },
  {
    id: 'edan-tool',
    title: 'Edan Tool — Alat Pemrosesan File',
    category: 'Web',
    summary: 'Alat pemrosesan file yang cepat dan aman (gambar, video, audio, PDF) berbasis web.',
    description:
      'Edan Tool adalah website alat pemrosesan file yang cepat dan aman dengan 19 tool: gambar (kompres ke ukuran target, tingkatkan resolusi, pas foto standar), video dan audio (video ke GIF, kompres video, ekstrak audio MP3), serta PDF. Pengerjaannya dibagi menjadi beberapa fase dan dikerjakan dengan bantuan AI agent; backend memakai Flask dengan antrean RQ/Redis, plus ffmpeg untuk pemrosesan media.',
    tools: ['AI Agent', 'Flask', 'ffmpeg', 'Redis / RQ'],
    result: 'Website dapat diakses dan menjalankan 19 tool.',
    repoUrl: '',
    topology: {
      nodes: [
        { id: 'user', label: 'PENGGUNA', x: 26, y: 28, type: 'internet' },
        { id: 'web', label: 'EDAN TOOL', x: 74, y: 28, type: 'server' },
      ],
      edges: [{ from: 'user', to: 'web' }],
    },
  },
]

/* --------------------------------------------------------------------------
 * CERTIFICATIONS — none yet. The array stays exported (other modules import
 * it) but is empty; the Certifications block is hidden when it is empty and
 * the terminal's `show certs` says so in words.
 * -------------------------------------------------------------------------- */
export const certifications = []

/* --------------------------------------------------------------------------
 * EXPERIENCE & EDUCATION TIMELINE
 * No dates: the year is not known, so `period` is empty and the UI renders
 * nothing in its place (no 'undefined', no dangling dash).
 * -------------------------------------------------------------------------- */
export const experience = [
  {
    id: 'work-instalasi-lan',
    role: 'Instalasi Jaringan LAN',
    org: 'Perguruan Muhammadiyah komplek Masjid At-Taqwa Sumberrejo',
    location: 'Jakarta, Indonesia',
    period: '',
    type: 'work',
    points: ['Instalasi jaringan LAN Perguruan Muhammadiyah komplek Masjid At-Taqwa Sumberrejo.'],
  },
  {
    id: 'work-helpdesk-support',
    role: 'Helpdesk Support',
    org: 'Sekolah',
    location: 'Jakarta, Indonesia',
    period: '',
    type: 'work',
    points: [
      'Membantu keluhan dan masalah yang dialami Bapak/Ibu Guru di sekolah, seperti instalasi software maupun penanganan hardware.',
    ],
  },
  {
    id: 'work-pc-builder',
    role: 'PC Builder',
    org: 'Sekolah',
    location: 'Jakarta, Indonesia',
    period: '',
    type: 'work',
    points: ['Bongkar pasang maupun merakit sebuah komputer.'],
  },
  {
    id: 'work-topologi-mikrotik',
    role: 'Topologi Jaringan & MikroTik',
    org: 'Sekolah',
    location: 'Jakarta, Indonesia',
    period: '',
    type: 'work',
    points: [
      'Merancang topologi jaringan dan melakukan konfigurasi perangkat MikroTik (routing, DHCP, firewall) dalam praktik sekolah.',
    ],
  },
  {
    id: 'work-server-builder-admin',
    role: 'Server Builder & Administrator',
    org: 'Sekolah',
    location: 'Jakarta, Indonesia',
    period: '',
    type: 'work',
    points: [
      'Merancang dan membangun server untuk kebutuhan sekolah, mulai dari instalasi hardware hingga konfigurasi virtualisasi Proxmox VE, monitoring, dan administrasi sistem secara berkelanjutan.',
    ],
  },
]

/* --------------------------------------------------------------------------
 * EDUCATION — kept separate from `experience` (work) and rendered as its own
 * list in the timeline. Ordered chronologically: SMP first, then SMK.
 * -------------------------------------------------------------------------- */
export const education = [
  {
    id: 'edu-smp-islam-darussalam',
    role: 'Siswa',
    org: 'SMP Islam Darussalam Sumberrejo',
    location: 'Jakarta, Indonesia',
    period: '2021 – 2024',
    type: 'education',
    points: [],
  },
  {
    id: 'edu-smk-muhammadiyah',
    role: 'Siswa Jurusan TKJ',
    org: 'SMK Muhammadiyah 1 Sumberrejo',
    location: 'Jakarta, Indonesia',
    period: '2024 – Sekarang',
    type: 'education',
    points: [
      'Belajar konfigurasi jaringan melalui praktik langsung dan kegiatan di laboratorium.',
      'Mempelajari penataan kabel LAN dan pemasangan jaringan di lingkungan sekolah.',
      'Berlatih splicing dan penyambungan fiber optik.',
    ],
  },
]

/* --------------------------------------------------------------------------
 * CONTACT
 * `linkedin` is empty on purpose: there is no LinkedIn profile, so the Contact
 * section and the terminal omit the line entirely instead of printing a blank.
 * -------------------------------------------------------------------------- */
export const contact = {
  email: 'alex.rivera@example.com',
  linkedin: '',
  github: 'https://github.com/alexrivera-dev',
  website: 'https://example.com',
  location: 'Jakarta, Indonesia',
  responseTime: 'Biasanya membalas dalam beberapa hari.',
  // Optional mailto contact form (no backend).
  mailtoForm: {
    enabled: true,
    subject: 'Lowongan — Alex Rivera',
    intro:
      'Tidak ada backend di halaman ini, jadi form ini hanya membuka aplikasi email Anda dengan pesan yang sudah terisi.',
  },
  socials: [
    { id: 'github', label: 'GitHub', url: 'https://github.com/alexrivera-dev', icon: 'github' },
    { id: 'email', label: 'Email', url: 'mailto:alex.rivera@example.com', icon: 'mail' },
    { id: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/6200000000000', icon: 'whatsapp' },
  ],
}

/* --------------------------------------------------------------------------
 * TERMINAL SHELL CONFIG — simulated lab device used by the `DEVBOX-1>` prompts.
 * IMPORTANT: every address below is a lab or documentation range. This is a
 * demo shell, not a real network, and nothing here should imply production use.
 * -------------------------------------------------------------------------- */
export const terminal = {
  hostname: 'DEVBOX-1',
  user: 'alex',
  enabledPrompt: 'DEVBOX-1#',
  privilegePrompt: 'DEVBOX-1>',
  site: 'LAB-SMK',
  iosVersion: '15.7(3)M5',
  model: 'ISR4331/K9',
  // Fixed date so the `show version` uptime line works. Simulated lab device.
  bootAt: '2025-02-10T08:14:42Z',
  defaultRoute: '0.0.0.0/0',
  defaultNextHop: '203.0.113.1',
  managementIp: '192.0.2.2',
  dns: '1.1.1.1 8.8.8.8',
  interfaces: [
    { name: 'GigabitEthernet0/0/0', ip: '203.0.113.2', mask: '255.255.255.252', status: 'up', protocol: 'up' },
    { name: 'GigabitEthernet0/0/1', ip: '192.0.2.2', mask: '255.255.255.0', status: 'up', protocol: 'up' },
    { name: 'GigabitEthernet0/0/2', ip: 'unassigned', mask: 'unset', status: 'admin down', protocol: 'down' },
    { name: 'Loopback0', ip: '192.0.2.9', mask: '255.255.255.255', status: 'up', protocol: 'up' },
  ],
  // Connected and static lab routes only — no dynamic protocols.
  routes: [
    { prefix: '0.0.0.0/0', nextHop: '203.0.113.1', interface: 'Gi0/0/0', metric: 1, protocol: 'static', tag: '' },
    { prefix: '192.0.2.0/24', nextHop: '0.0.0.0', interface: 'Gi0/0/1', metric: 1, protocol: 'connected', tag: 'C' },
    { prefix: '203.0.113.0/30', nextHop: '0.0.0.0', interface: 'Gi0/0/0', metric: 1, protocol: 'connected', tag: 'C' },
  ],
  // No dynamic-routing experience, so these stay empty. The terminal must handle
  // that without printing 'undefined' or crashing.
  ospfNeighbors: [],
  bgpNeighbors: [],
  vlanDatabase: [
    { id: 10, name: 'LAB', ports: 'Gi0/0/1' },
    { id: 20, name: 'SERVER', ports: 'Gi0/0/2' },
  ],
  // Small lab configuration: no OSPF, no BGP, no secrets, no example.com.
  runningConfig: [
    'version 15.7',
    'service timestamps debug datetime msec',
    'hostname DEVBOX-1',
    'boot-start-marker',
    'no aaa new-model',
    'ip name-server 1.1.1.1 8.8.8.8',
    'interface GigabitEthernet0/0/0',
    ' description LAB-UPLINK',
    ' ip address 203.0.113.2 255.255.255.252',
    ' no shutdown',
    'interface GigabitEthernet0/0/1',
    ' description LAB-LAN',
    ' ip address 192.0.2.2 255.255.255.0',
    ' no shutdown',
    'interface Loopback0',
    ' description ROUTER-ID',
    ' ip address 192.0.2.9 255.255.255.255',
    'ip route 0.0.0.0 0.0.0.0 203.0.113.1',
    'line con 0',
    ' exec-timeout 30 0',
    ' logging synchronous',
    'end',
  ],
  quickCommands: [
    'help',
    'show version',
    'show ip route',
    'show ip interface brief',
    'show skills',
    'show projects',
    'show certs',
    'show contact',
  ],
}

/* --------------------------------------------------------------------------
 * DERIVED HELPERS — used across the UI; keep them at the bottom of the file.
 * -------------------------------------------------------------------------- */
export const projectCategories = ['All', ...Array.from(new Set(projects.map((p) => p.category)))]

export const stats = {
  projectCount: projects.length,
  certCount: certifications.filter((c) => c.status === 'certified').length,
  skillCount: skills.reduce((total, group) => total + group.items.length, 0),
}
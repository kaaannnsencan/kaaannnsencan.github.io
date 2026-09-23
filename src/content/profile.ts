// Single source of truth for everything the site says about Kaan.
// Both the 3D world and the classic (HTML) view render from this file,
// so updating the CV means editing only this file.

export type Lang = 'tr' | 'en'
export type L = Record<Lang, string>

export interface Project {
  id: string
  title: L
  /** Short name for in-world signs (max ~16 chars). */
  short: L
  stack: string[]
  summary: L
  bullets: L[]
  /** GitHub repo name, if the project lives on GitHub. Links the building to the repo. */
  repo?: string
  accent: string
  /** Featured projects get the first lot and a hand-built landmark building. */
  featured?: boolean
  landmark?: 'vitrin'
  /** Full "owner/name" of a repo outside Kaan's account (fetched at build time). */
  externalRepo?: string
  url?: string
  logo?: string
  role?: L
  team?: string
}

export interface DesignWork {
  id: string
  title: L
  kind: L
  /** Optional image under /public/design/…; a procedural poster is drawn when missing. */
  image?: string
  link?: string
  /** Palette used for the generated poster until a real image is provided. */
  colors: [string, string, string]
}

export const profile = {
  name: 'Muhammet Kaan Şencan',
  shortName: 'Kaan Şencan',
  role: {
    tr: 'Yazılım Geliştirici · Veri Analisti · Görsel Tasarımcı',
    en: 'Software Developer · Data Analyst · Visual Designer',
  } as L,
  tagline: {
    tr: 'Kod yazan bir tasarımcı, tasarlayan bir yazılımcı.',
    en: 'A designer who codes, a developer who designs.',
  } as L,
  bio: {
    tr: "İstinye Üniversitesi'nde Görsel İletişim Tasarımı okuyorum; Yönetim Bilişim Sistemleri (ÇAP) ve Yazılım Mühendisliği (Yandal) programlarına devam ediyorum. Veriye dayalı ve yapay zekâ destekli yazılım çözümleri geliştirmeye odaklanıyorum. Flutter ile uçtan uca mobil ürünler geliştirirken C, Python ve SQL'de sağlam bir temelim var. Algoritmik problem çözmeyi iş süreçleri analiziyle ve tasarım gözüyle birleştirerek son kullanıcı için değer yaratan yazılımlar inşa etmeyi hedefliyorum.",
    en: 'I study Visual Communication Design at İstinye University, alongside a double major in Management Information Systems and a minor in Software Engineering. I focus on data-driven, AI-powered software. I build end-to-end mobile products with Flutter and have a solid foundation in C, Python and SQL. I combine algorithmic problem solving with business-process analysis and a designer’s eye to build software that creates real value for its users.',
  } as L,
  contact: {
    email: 'kaansncn30@gmail.com',
    phone: '+90 537 402 32 40',
    github: 'https://github.com/kaaannnsencan',
    linkedin: 'https://www.linkedin.com/in/kaansencann',
  },
  languages: [
    { name: { tr: 'Türkçe', en: 'Turkish' } as L, level: { tr: 'Ana dil', en: 'Native' } as L },
    { name: { tr: 'İngilizce', en: 'English' } as L, level: { tr: 'Profesyonel çalışma yetkinliği', en: 'Professional working proficiency' } as L },
  ],
  // reverse chronological: latest (expected) graduation first
  education: [
    {
      id: 'mis',
      school: 'İstinye Üniversitesi',
      program: { tr: 'Yönetim Bilişim Sistemleri (ÇAP)', en: 'Management Information Systems (Double Major)' } as L,
      detail: { tr: '%100 Eğitim Bursu', en: '100% Scholarship' } as L,
      period: '2024 — 2028',
    },
    {
      id: 'se',
      school: 'İstinye Üniversitesi',
      program: { tr: 'Yazılım Mühendisliği (Yandal)', en: 'Software Engineering (Minor)' } as L,
      detail: { tr: 'Devam ediyor', en: 'In progress' } as L,
      period: '2025 — 2027',
    },
    {
      id: 'vcd',
      school: 'İstinye Üniversitesi',
      program: { tr: 'Görsel İletişim Tasarımı', en: 'Visual Communication Design' } as L,
      detail: { tr: '2026 Mezun', en: 'Graduated 2026' } as L,
      period: '— 2026',
    },
  ],
  experience: [
    {
      org: 'İstinye Üniversitesi',
      title: { tr: 'Tercih Tanıtım Danışmanı', en: 'Admissions Consultant' } as L,
      period: { tr: 'Temmuz 2024 — Ağustos 2024', en: 'Jul 2024 — Aug 2024' } as L,
      bullets: [
        {
          tr: 'Günde ortalama 20+ aday ve aileyle birebir görüşerek bölüm ve akademik programlar hakkında danışmanlık verdim.',
          en: 'Advised 20+ prospective students and families per day, one-on-one, on programs and academic paths.',
        },
        {
          tr: 'Karmaşık akademik süreç ve yönetmelikleri teknik olmayan paydaşların anlayacağı dile sadeleştirdim.',
          en: 'Translated complex academic procedures and regulations into plain language for non-technical stakeholders.',
        },
        {
          tr: 'Kriz anlarında çözüm odaklı yaklaşarak operasyonun aksamadan yürümesine katkı sağladım.',
          en: 'Kept operations running smoothly by staying solution-oriented under pressure.',
        },
      ] as L[],
    },
  ],
  skills: [
    {
      id: 'lang',
      title: { tr: 'Programlama Dilleri', en: 'Languages' } as L,
      items: ['Python', 'SQL', 'Dart', 'C', 'HTML', 'CSS'],
      color: '#37c3d6',
    },
    {
      id: 'tech',
      title: { tr: 'Alan & Teknolojiler', en: 'Fields & Tech' } as L,
      items: ['Machine Learning', 'AI Agents', 'Flutter', 'React', 'FastAPI', 'Data Structures', 'OOP', 'Security'],
      color: '#7bd66a',
    },
    {
      id: 'tools',
      title: { tr: 'Araçlar', en: 'Tools' } as L,
      items: ['Git / GitHub', 'Docker', 'PostgreSQL', 'MySQL', 'Jupyter', 'Cursor', 'VS Code', 'Excel / Power Query'],
      color: '#f2c14e',
    },
    {
      id: 'design',
      title: { tr: 'Tasarım', en: 'Design' } as L,
      items: ['Visual Identity', 'Typography', 'UI / UX', 'Pixel Art', 'Motion', 'Editorial'],
      color: '#c86bd8',
    },
    {
      id: 'other',
      title: { tr: 'Diğer', en: 'Other' } as L,
      items: ['Business Process Analysis', 'Agile / Scrum', 'Data Modeling', 'Prompt Engineering', 'Problem Solving'],
      color: '#ff8a5c',
    },
  ],
  projects: [
    {
      id: 'vitrin-ai',
      short: { tr: 'Vitrin AI', en: 'Vitrin AI' },
      title: { tr: 'Vitrin AI — Kuyumcular için Yapay Zekâ Ürün Görseli', en: 'Vitrin AI — AI Product Photos for Jewellers' },
      stack: ['Next.js', 'TypeScript', 'Tailwind', 'Konva.js', 'FastAPI', 'BiRefNet', 'PostgreSQL', 'Supabase', 'iyzico'],
      summary: {
        tr: 'Telefonla çekilmiş tek bir fotoğraftan satışa hazır ürün görseli üreten platform: yapay zekâ arka planı ince zincirlere ve yansıtıcı taşlara kadar temiz kenarlarla kaldırır, kullanıcı ürünü hazır bir zemine yerleştirip ışık ve gölgeyle bitirir.',
        en: 'A platform that turns a single phone photo into a sales-ready product image: AI removes the background cleanly down to fine chains and reflective stones, then the user places the piece on a ready-made backdrop and finishes it with light and shadow.',
      },
      role: {
        tr: 'Kurucu ekip · Frontend, kompozisyon editörü ve kullanıcı deneyimi',
        en: 'Founding team · Frontend, composition editor and user experience',
      },
      team: 'Serhan Denizhan & Kaan Şencan',
      bullets: [
        {
          tr: 'Konva.js ile üç adımlı kompozisyon stüdyosu: sürükle/ölçekle/döndür, parlaklık-kontrast, gölge ve yansıma.',
          en: 'Three-step composition studio built on Konva.js: drag/scale/rotate, brightness/contrast, shadow and reflection.',
        },
        {
          tr: 'Ürün rengine göre akıllı zemin önerisi, tek tıkla Instagram / A4 katalog / pazaryeri ölçüleri.',
          en: 'Smart backdrop suggestions based on product colour; one-click Instagram / A4 catalogue / marketplace sizes.',
        },
        {
          tr: 'Otomatik kayıt: stüdyodaki her ayar saklanır, yarım kalan iş kaldığı yerden devam eder.',
          en: 'Autosave: every studio setting persists, unfinished work resumes where it left off.',
        },
        {
          tr: 'Arayüz dili apple.com ürün sayfalarından uyarlandı; vurgu rengi altın, hedef kitle Türkiye’deki kuyumcular.',
          en: 'Interface language adapted from apple.com product pages; gold accent, aimed at jewellers in Türkiye.',
        },
      ],
      accent: '#d4af37',
      featured: true,
      landmark: 'vitrin',
      externalRepo: 'serhandenizhan/vitrin-ai',
      url: 'https://github.com/serhandenizhan/vitrin-ai',
      logo: 'brand/vitrin-ai-logo.png',
    },
    {
      id: 'node-ai',
      short: { tr: 'Node AI', en: 'Node AI' },
      title: { tr: 'Node AI — LLM Destekli Verimlilik Yazılımı', en: 'Node AI — LLM-Powered Productivity App' } as L,
      stack: ['LLM API', 'Prompt Engineering', 'System Analysis', 'Software Architecture'],
      summary: {
        tr: 'Kullanıcıların zaman yönetimini ve odaklanma süreçlerini optimize eden, yapay zekâ entegreli etkileşimli bir yazılım.',
        en: 'An interactive, AI-integrated app that optimizes how users manage their time and focus.',
      } as L,
      bullets: [
        { tr: 'Büyük Dil Modelleri dersi kapsamında geliştirildi.', en: 'Built for the Large Language Models course.' },
        {
          tr: "Sistem mimarisine LLM API'leri entegre edilerek uygulamaya akıllı asistan yetenekleri kazandırıldı.",
          en: 'Integrated LLM APIs into the architecture to give the app smart-assistant capabilities.',
        },
        {
          tr: 'Modelin hedef senaryolara uygun çalışması için prompt mühendisliği teknikleri uygulandı.',
          en: 'Applied prompt-engineering techniques so the model behaves reliably in target scenarios.',
        },
      ],
      repo: 'Node-A-',
      accent: '#37c3d6',
    },
    {
      id: 'rfm',
      short: { tr: 'RFM Analizi', en: 'RFM Analysis' },
      title: { tr: 'Müşteri Davranışları & RFM Segmentasyonu', en: 'Customer Behaviour & RFM Segmentation' } as L,
      stack: ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn'],
      summary: {
        tr: 'Müşterileri yenilik, sıklık ve parasal değer metrikleriyle skorlayarak anlamlı segmentlere ayıran analiz.',
        en: 'Scores customers on recency, frequency and monetary value to split them into meaningful segments.',
      } as L,
      bullets: [
        { tr: 'Geniş bir veri seti üzerinde keşifçi veri analizi (EDA) ve ön işleme yapıldı.', en: 'Exploratory data analysis and preprocessing on a large dataset.' },
        { tr: 'Satın alma alışkanlıkları RFM metrikleriyle skorlandı ve segmentlendi.', en: 'Purchasing habits scored and segmented with RFM metrics.' },
        {
          tr: 'Bulgular, kârlılığı ve müşteri elde tutmayı artırmaya yönelik raporlara dönüştürüldü.',
          en: 'Findings turned into reports aimed at improving profitability and retention.',
        },
      ],
      accent: '#7bd66a',
    },
    {
      id: 'credit-risk',
      short: { tr: 'Kredi Riski', en: 'Credit Risk' },
      title: { tr: 'Kredi Risk Analizi & Sınıflandırma', en: 'Credit Risk Analysis & Classification' } as L,
      stack: ['Python', 'Pandas', 'Scikit-learn', 'Matplotlib'],
      summary: {
        tr: 'Bir bankanın müşteri, ödeme ve gelir verisiyle kredi riskini tahmin eden makine öğrenmesi modeli.',
        en: 'A machine-learning model that predicts credit risk from a bank’s customer, payment and income data.',
      } as L,
      bullets: [
        { tr: 'Kategorik veriler sayısallaştırılıp ön işlemden geçirildi.', en: 'Encoded and preprocessed categorical features.' },
        { tr: 'Gini tabanlı bir karar ağacı (Decision Tree) sınıflandırıcısı eğitildi.', en: 'Trained a Gini-based decision-tree classifier.' },
        {
          tr: 'Eğitim/test doğrulukları ölçüldü ve karar ağacı görselleştirildi.',
          en: 'Measured train/test accuracy and visualized the resulting tree.',
        },
      ],
      accent: '#f2c14e',
    },
    {
      id: 'portfolio',
      short: { tr: 'Bu Portfolyo', en: 'This Portfolio' },
      title: { tr: 'Bu Dünya — Etkileşimli Portfolyo', en: 'This World — Interactive Portfolio' } as L,
      stack: ['TypeScript', 'Three.js', 'GLSL', 'Vite', 'Pixel Art'],
      summary: {
        tr: 'Şu an içinde yürüdüğün site. Özel bir piksel render hattı, prosedürel pixel-art ve GitHub verisiyle kendini kuran bir şehir.',
        en: 'The site you are walking around in. A custom pixel render pipeline, procedural pixel art and a city that builds itself from GitHub data.',
      } as L,
      bullets: [
        { tr: 'Düşük çözünürlüklü render + derinlik/normal tabanlı kontur shader’ı.', en: 'Low-res rendering + depth/normal-based outline shader.' },
        { tr: 'Karakter sprite’ları kodla, piksel piksel üretiliyor.', en: 'Character sprites are generated in code, pixel by pixel.' },
        { tr: 'GitHub repoları her derlemede otomatik olarak binaya dönüşüyor.', en: 'GitHub repos turn into buildings automatically on every build.' },
      ],
      repo: 'kaaannnsencan.github.io',
      accent: '#c86bd8',
    },
  ] as Project[],
  design: [
    { id: 'identity', title: { tr: 'Marka Kimliği', en: 'Brand Identity' }, kind: { tr: 'Kimlik Sistemi', en: 'Identity System' }, colors: ['#1d1a2f', '#f2c14e', '#ff6b6b'] },
    { id: 'poster', title: { tr: 'Tipografik Afiş', en: 'Typographic Poster' }, kind: { tr: 'Afiş', en: 'Poster' }, colors: ['#f4efe6', '#1d1a2f', '#e84a5f'] },
    { id: 'ui', title: { tr: 'Mobil Arayüz', en: 'Mobile UI' }, kind: { tr: 'UI / UX', en: 'UI / UX' }, colors: ['#0f1b2d', '#37c3d6', '#7bd66a'] },
    { id: 'lupin', title: { tr: 'Lupin — Jenerik', en: 'Lupin — Title Sequence' }, kind: { tr: 'Hareketli Grafik', en: 'Motion Graphics' }, colors: ['#111111', '#e9e4d4', '#c9a227'], link: 'https://github.com/kaaannnsencan/Lupin-Dizi-Jenerigi' },
    { id: 'pixel', title: { tr: 'Piksel Karakterler', en: 'Pixel Characters' }, kind: { tr: 'Pixel Art', en: 'Pixel Art' }, colors: ['#2b2140', '#c86bd8', '#5fb4e0'] },
    { id: 'editorial', title: { tr: 'Editoryal Tasarım', en: 'Editorial Design' }, kind: { tr: 'Yayın', en: 'Print' }, colors: ['#efe9dd', '#2d2d2d', '#3e7fc1'] },
  ] as DesignWork[],
}

export type Profile = typeof profile

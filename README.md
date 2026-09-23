# Kaan Şencan — Interactive Pixel Portfolio

Piksel bir adada yürüyerek keşfedilen portfolyo. Three.js ile 3D render edilip düşük
çözünürlükte, kontur shader'ıyla piksel sanatına çevriliyor ("HD-2D" tarzı). Karakter
sprite'ı, yazı fontu, afişler, zemin dokusu ve sesler dahil **hiçbir görsel/ses dosyası
yok** — hepsi kodla üretiliyor.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # birim testleri (vitest)
npm run build      # GitHub verisini çeker + tip kontrolü + production build → dist/
```

## Mimari

```
src/
  main.ts              açılış: yükleme ekranı, WebGL kontrolü, klasik görünüme düşüş
  content/             TÜM metin içerik (TR/EN) — CV değişince sadece burası düzenlenir
    profile.ts         bio, projeler, yetenekler, eğitim, deneyim, tasarım işleri
    i18n.ts            arayüz metinleri + dil deposu
    config.json        GitHub kullanıcı adı, site URL'i
  core/
    Experience.ts      orkestrasyon: döngü, etkileşim, hızlı seyahat, kalite ayarı
    PixelRenderer.ts   düşük çözünürlüklü render + derinlik/normal kontur shader'ı
    CameraRig.ts       texel'e kilitli ortografik kamera (titreme yok)
    Input.ts           klavye + dokunmatik joystick + gamepad
    Loop.ts            sabit adımlı simülasyon döngüsü
  world/
    World.ts           bütün bölgeleri kurar
    zones/             Spawn (voksel isim), About, CodeDistrict, Skyline, Gallery,
                       Skills, Campus, Stadium (tekmelenebilir top + gol sayacı)
    Terrain.ts         prosedürel zemin dokusu + su shader'ı
    Props.ts           instanced orman/kaya/çalı dağıtımı
    Collision.ts       2D çarpışma dünyası (test edilmiş)
    PixelFont.ts       el yapımı 5×7 piksel font (Türkçe karakterli)
  player/              prosedürel pixel-art karakter + kontrolcü
  data/
    github.ts          build snapshot'ı + bayat ise canlı API'den yenileme
    city.ts            repo → bina planlayıcısı (saf fonksiyon, test edilmiş)
  ui/                  HUD, paneller, harita, ikonlar, CSS
  fallback/Classic.ts  WebGL yoksa / ziyaretçi isterse hızlı HTML sürümü
scripts/fetch-github.mjs  build sırasında GitHub verisini public/data/github.json'a yazar
```

### GitHub → şehir
- Her public, boş olmayan repo **Kod Mahallesi**'nde bir bina olur. Yükseklik repo boyutu ve
  yıldızlardan, renk ana dilden gelir. Son 30 günde push edilen repoların yanında **dönen bir
  vinç** olur; her yıldız çatıya altın bir blok ekler.
- `featured: true` olan proje (Vitrin AI) ilk arsaya özel bir simge yapı olarak kurulur:
  altın-siyah art-deco kule, zemin katta ışıklı vitrin, tepede dönen pırlanta, logolu tabela.
  Logosu giriş plazasında voksel heykel olarak da durur. Başka bir hesaptaki repo
  `config.json → featuredRepos` ile build sırasında çekilir.
- CV'deki projeler (repo'su olmayanlar) kubbeli binalar olarak durur. Bir projeyi repo'ya
  bağlamak için `profile.ts` içinde `repo: 'repo-adi'` yazman yeterli.
- Boş arsalar "YAKINDA" tabelasıyla bekler; şehir yeni repolarla kendiliğinden büyür.
- **GitHub Skyline**: son bir yılın katkı takvimi 3D çubuklar olarak.

### Oyun alanları
- **Kaan'ın Köyü** (`zones/Village.ts`, içerik `content/village.ts`): her minik ev CV'nin bir
  bölümünü oyun kartı destesi olarak açar; görev panosu eğitim/kariyer yolunu görev günlüğü
  olarak gösterir.
- **ATV'ler** (`world/Atv.ts`): plazada ve parkur kapısında birer tane. E ile bin/in, Shift turbo.
- **ATV Parkuru** (`zones/Arena.ts`): kapıdan geçince süre başlar, 12 parayı topla; dubalar
  devrilir, en iyi süre tarayıcıda saklanır.
- **Stadyum**: ortadaki Fenerbahçe arması `content/fenerbahceLogo.ts` içindeki piksel
  deseninden çizilir (kamera eğimi için hücreler dikeyde 1,5× uzatılır).

Veri üç katmanlı ve her katman sessizce başarısız olabilir:
1. Build sırasında `public/data/github.json` üretilir (API erişilemezse eski snapshot korunur).
2. GitHub Actions her gün yeniden build alır (`.github/workflows/deploy.yml`).
3. Snapshot 6 saatten eskiyse tarayıcı canlı API'yi dener (sonuç localStorage'da önbelleklenir).

### Sağlamlık
- WebGL2 yoksa, 3D başlatılırken hata olursa veya grafik bağlamı kaybolursa otomatik olarak
  **klasik görünüme** düşer. `?classic` ile doğrudan açılır.
- Sabit adımlı fizik, sekme değişiminde döngü durur, ses askıya alınır.
- Yavaş cihazlarda iç çözünürlük otomatik düşer, gerekirse gölgeler kapanır.
- GitHub'dan gelen tüm metinler HTML-escape edilir, linkler protokol kontrolünden geçer.
- Bundle: three.js ayrı chunk (~145 KB gzip), uygulama ~40 KB gzip.

## Özelleştirme

**Kendi pixel-art karakterin:** `public/sprites/player.png` + `public/sprites/player.json` ekle.
Sayfa 4 sütun (yürüme kareleri) × 4 satır (aşağı, yukarı, sol, sağ):
```json
{ "frameWidth": 16, "frameHeight": 26, "frames": 4, "rows": { "down": 0, "up": 1, "left": 2, "right": 3 } }
```
Sonra `src/content/config.json` içinde `"customSprite": true` yap. Dosya yoksa ya da ayar kapalıysa
koddaki prosedürel karakter kullanılır.

**Tasarım işleri:** görseli `public/design/` altına koy, `profile.ts` → `design` içinde ilgili
işe `image: 'design/dosya.png'` ekle. Galerideki şövale ve panel otomatik olarak onu gösterir.

## Yayına alma

GitHub Pages (hazır): repo'yu GitHub'a gönder → *Settings → Pages → Source: GitHub Actions*.
Her push'ta ve her gün 04:17 UTC'de otomatik build + deploy olur. Özel alan adı için
`content/config.json` içindeki `siteUrl`'i güncelle.

Başka bir statik host (Netlify, Vercel, Cloudflare Pages): build komutu `npm run build`,
çıktı klasörü `dist`.

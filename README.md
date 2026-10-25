# Mezat — Kategori Açık Artırma Oyunu

İki oyuncu aynı telefonda, 20 bütçeyle sırası gizli 10 kart için açık artırmaya girer ve 5 kartlık takımını kurar. Sonunda hakem, kategorinin ölçütlerine göre kazananı seçer.

- **40 kategori, 1.400 kart** (her kategoride sadece en iyiler: 25 efsane + 10 yıldız)
- Tek telefonda iki kişi, **karşılıklı masa ekranı**: iki oyuncunun alanı aynı anda görünür, üstteki ters döner, sırası olmayanın düğmeleri kilitli
- **İki katmanlı hakem:** kod puanı hesaplar; oyun Claude içinde açılınca Claude maçı yorumlar ve ±5 uyum bonusu verir (API anahtarı ya da ödeme gerekmez)

---

## 1. Klasörde ne var?

```
mezat/
├── index.html            Oyunun ana sayfası
├── css/style.css         Görünüm (renkler, yazı tipleri, açık/koyu tema)
├── js/engine.js          OYUN MOTORU: kurallar, çekiliş, teklif, hakem
├── js/temalar.js         Her kategorinin arenası (renk, desen, simge)
├── js/app.js             ARAYÜZ: ekranlar ve düğmeler
├── data/
│   ├── kategoriler.json  40 kategorinin kuralları (üretilir, elle düzenleme)
│   └── kartlar/*.json    Her kategorinin kartları (üretilir, elle düzenleme)
├── tools/
│   ├── kategoriler.py    Kategori kuralları — DÜZENLEYECEĞİN YER 1
│   ├── kartlar/*.txt     Kart listeleri — DÜZENLEYECEĞİN YER 2
│   ├── build.py          txt + py → data/*.json üretir ve hataları yakalar
│   └── simule.js         Binlerce rastgele maç oynatıp kuralları test eder
├── hakem-talimati.md     Yapay zeka hakemin "kural kitabı" (Faz 2 için)
├── manifest.webmanifest  Telefona uygulama gibi eklenebilmesi için
├── sw.js                 Çevrimdışı çalışma (önbellek)
└── icon.svg              Uygulama simgesi
```

**Neden motor ve arayüz ayrı?** Benzetme: Motor, futbolun kural kitabı; arayüz, stadyum. Kural kitabı her stadyumda aynıdır. Yarın online oda yaptığımızda kurallar (engine.js) değişmeden sunucuya da taşınabilir; sadece "stadyum" değişir.

---

## 2. Bilgisayarda çalıştırma

`index.html` dosyasına çift tıklamak **çalışmaz**. Çünkü oyun kartları ayrı dosyalardan okur ve tarayıcılar güvenlik için çift tıklanan dosyaların başka dosya okumasını engeller. Benzetme: Kapıcısı olmayan bir apartmana kargo gelmez; küçük bir "sunucu" o kapıcıdır.

1. Terminali aç (Windows: Başlat → "cmd" yaz → Enter).
2. Proje klasörüne gir:
   ```
   cd Desktop\mezat
   ```
3. Sunucuyu başlat (Python yüklü olmalı):
   ```
   python -m http.server 8000
   ```
4. Tarayıcıda aç: `http://localhost:8000`

**Telefonda denemek (aynı Wi-Fi'de):**
1. Bilgisayarın yerel IP'sini bul: terminalde `ipconfig` yaz, "IPv4 Address" satırına bak (ör. `192.168.1.34`).
2. Telefonun tarayıcısına yaz: `http://192.168.1.34:8000`

---

## 3. Ücretsiz yayınlama (herkes linkle oynasın)

### Seçenek A: GitHub Pages (önerilen, ücretsiz, kalıcı)
1. github.com → sağ üstte **+** → **New repository**.
2. Repository name: `mezat` → **Public** seç → **Create repository**.
3. Açılan sayfada **uploading an existing file** bağlantısına tıkla.
4. `mezat` klasörünün **içindeki** her şeyi sürükleyip bırak (klasörün kendisini değil, içini) → en altta **Commit changes**.
5. Üst menüde **Settings** → sol menüde **Pages**.
6. "Branch" altında **main** ve **/ (root)** seç → **Save**.
7. 1-2 dakika sonra sayfanın üstünde link çıkar: `https://KULLANICI-ADIN.github.io/mezat/`

### Seçenek B: Netlify Drop (en hızlı)
1. `app.netlify.com/drop` adresine git.
2. `mezat` klasörünü sayfaya sürükle bırak.
3. Saniyeler içinde bir link verir. (Kalıcı olması için ücretsiz hesap aç.)

### Telefona uygulama gibi ekleme
- **Android (Chrome):** Siteyi aç → sağ üstte **⋮** → **Ana ekrana ekle**.
- **iPhone (Safari):** Siteyi aç → alttaki **Paylaş** simgesi → **Ana Ekrana Ekle**.

---

## 4. Kartları ve kategorileri düzenleme

**Kural:** `data/` klasörünü elle düzenleme; o klasör üretilir. Sen `tools/` içindekileri düzenlersin.

### Bir kartı değiştirmek
`tools/kartlar/hayvanlar.txt` gibi bir dosyayı aç. Her satır bir karttır:

```
Aslan|e|kara|suru|Savanın kralı, sürüyle avlanır.|9,9,6,7,6
 ad  |seviye|grup|etiketler|açıklama|puanlar
```
- **seviye:** `e` efsane (en üst), `g` yıldız (bir tık altı) — 25 / 10 olmalı
- **grup:** O kategorinin gruplarından biri (`tools/kategoriler.py` içinde yazar)
- **etiketler:** Boş bırakılabilir; sinerji için (ör. `suru`, `zehirli`)
- **puanlar:** 1-10 arası, dosyanın ilk satırında yazan **ölçüt sırasıyla**

Kaydettikten sonra:
```
python3 tools/build.py
node tools/simule.js
```
`build.py` bir hata bulursa hangi dosyanın hangi satırında olduğunu söyler.

### Yeni kategori eklemek
1. `tools/kategoriler.py` içine mevcut bir kategoriyi kopyalayıp yeni `id`, ad, görev mesajı, ölçütler, gruplar ve sinerjilerle ekle.
2. `tools/kartlar/<id>.txt` dosyasını 35 kartla oluştur.
3. `python3 tools/build.py` çalıştır.
4. `js/temalar.js` içine kategoriyi bir arenaya bağlayan satırı ekle (ör. `"yeni-id": ["savan", "🐾"]`).
5. Yayındaki siteyi güncellediysen `sw.js` içindeki `SURUM` değerini bir artır (`mezat-v2`), yoksa telefonlar eski önbelleği gösterir.

---

## 5. Oyun kuralları

1. Herkese **20 bütçe** ve **5 slot** verilir.
2. Kategorinin havuzundan **10 lot** gizli sırayla gelir: 7 efsane, 3 yıldız (%70 / %30). Bazı kategorilerde çekiliş garantisi vardır (ör. futbolda en az 2 kaleci).
3. Lotu sırası gelen oyuncu açar, **en az 1** verir; açılışta pas yoktur. Açılış sırası her lotta değişir.
4. Sonra sırayla artırılır; **pas** diyen lotu bırakır.
5. **Bütçe serbest:** İstersen 20'nin hepsini tek karta basabilirsin.
6. **Parası biten teklif veremez.** Rakip bir teklif verince otomatik pas geçmiş sayılır. Açılış sırası parası bitende ise karar rakibe geçer: rakip **1 verip alır** ya da lotu **bedava ona bırakır**. İkisinin de parası bittiyse lot bedava açılış sırasındakine gider.
7. **Bir oyuncunun 5 slotu dolunca** kalan lotların hepsi otomatik ve bedava diğerine geçer.
8. Puanlar mezat sırasında **gizlidir**; oyuncu adı, açıklamayı ve seviyeyi görür.
9. Eşitlikte kalan bütçesi fazla olan kazanır.

## 6. Ekran düzeni

Ana ekranda iki seçenek var:
- **Karşılıklı:** Telefon masanın ortasında durur. 1. oyuncu alttan, 2. oyuncu üstten oynar; üstteki alan 180° döner. Üstteki oyuncu ortadaki kartı ters göreceği için kendi alanında kartın adını ve güncel teklifi ayrıca görür.
- **Aynı yönden:** Yan yana oturuyorsanız iki alan da düz durur.

İki durumda da sırası olmayan oyuncunun düğmeleri kilitlidir; motor da sırası olmayanın hamlesini ayrıca reddeder (çift kilit).

## 7. Hakem nasıl karar veriyor?

```
kart puanı  = Σ (kartın ölçüt puanı × ölçüt ağırlığı)   → 0-10
takım puanı = kart puanları toplamı × 2 + bonuslar/cezalar
```
Bonus örnekleri: Futbolda kalecisiz takım −10, kaleci + defans + orta saha + forvet olan takım +8. Hayvanlarda 2+ sürü hayvanı +6.

**Neden şimdilik kod?** Bedava, internetsiz çalışır ve aynı takımlara her seferinde aynı puanı verir. Benzetme: Maçın skorunu tabela tutar; yorumcu (yapay zeka) sonradan eklenir, skoru değiştiremez.

### Yapay zeka hakemi (Claude)
Oyun claude.ai içinde açıldığında son lottan sonra Claude'a danışır:
1. Kod, kart puanlarını ve kural bonuslarını hesaplar (**kod puanı**, kesin).
2. Claude'a kategori, ölçütler, hakem notu, iki takımın kartları ve eşleşme sonuçları gönderilir. Oyuncu isimleri gönderilmez (Takım 1 / Takım 2), kimse kayrılmaz.
3. Claude her takıma −5 ile +5 arası **uyum bonusu**, her eşleşmeye bir anlatı ve kısa bir gerekçe yazar.
4. Kod Claude'un cevabını denetler: bonusları −5/+5'e kırpar, eksik alanları kod metniyle doldurur, Claude'un söylediği kazanan sayılarla uyuşmuyorsa gerekçesini atar.
5. **Kazananı her zaman sayılar belirler:** toplam = kod puanı + uyum bonusu.

Claude cevap vermezse, izin verilmezse ya da sayfa Claude dışında (ör. GitHub Pages) açılırsa kod hakemi tek başına karar verir. Claude, sayfayı açan kişinin kendi Claude hesabını kullanır ve ilk maçta izin ister. Benzetme: Tabelayı (skoru) kod tutar, Claude yorumcudur; yorumcu skoru en fazla birkaç puan oynatabilir, maçı çeviremez.

Sonuç ekranındaki **"Hakem metnini kopyala"** ile aynı maçı Gemini gibi başka bir yapay zekaya da yapıştırıp karşılaştırabilirsin.

### Faz 3: Online oda
Motor buna hazır: oyunun tüm durumu tek bir JSON nesnesi, her hamle `act(state, hamle)` ile işlenir. Online odada odayı kuran telefonun (ya da sunucunun) durumu tutması, diğer telefonun sadece hamle göndermesi yeterli. Ücretsiz seçenek: Firebase Realtime Database.

---

## 8. Bilinen notlar

- Kartlarda gerçek kişi, marka ve eser **isimleri** geçer; logo ve resmi görsel yoktur. Mağazaya koymadan önce hukuki görüş alınmalı.
- Puanlar tartışmaya açıktır, bilinçli olarak öyle: "Supra neden 9?" tartışması oyunun bir parçası. Değiştirmek için 4. bölüme bak.
- Tarihi Komutanlar kategorisinde yakın dönem ve hassas siyasi figürler bilinçli olarak yoktur.

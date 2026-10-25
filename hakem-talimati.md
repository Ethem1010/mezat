# Yapay Zeka Hakem Talimatı

Bu dosya, maç sonunda Claude'a (ya da Gemini gibi başka bir modele) giden metni anlatır.
Metni kod üretir: `js/engine.js` → `hakemIstemi()`. Burada elle değiştirmen gereken bir şey yok;
hakemi değiştirmek istersen o fonksiyondaki metni ve `REHBER` sözlüğünü düzenle.

## Hakem nasıl "eğitildi"?

Model yeniden eğitilmiyor. Her maçta ona şu kural kitabı veriliyor:

1. **Rol:** Kart gücünü kod zaten puanladı; Claude sadece takım içi uyumu ve kategorinin hakem notunu değerlendirir.
2. **Oyun türüne özel rehber:** düello, maç, yarış, turnuva, jüri ve hayatta kalma için ayrı "nasıl düşün" talimatı (`REHBER`).
3. **Puan cetveli:** Her takım için en fazla 3 gerekçeli madde, her biri −2 ile +2 arası. İyi ve kötü madde örneği verilir.
4. **Kalibrasyon kuralları:** Kart gücünü ikinci kez ödüllendirme, kodun bonuslarını tekrar sayma, emin değilsen yazma, benzer takımlarda farkı küçük tut.
5. **Tarafsızlık:** Oyuncu isimleri gönderilmez ("Takım 1/2"). Takımların sırası her maçta rastgele karıştırılır; böylece model "ilk takımı" kayıramaz.

## Kod, cevabı nasıl denetliyor? (`yzCevabiniDogrula`)

- Madde puanları −2/+2'ye kırpılır, 0 puanlı maddeler atılır, en fazla 3 madde alınır.
- Bonus, maddelerin toplamından **kod tarafından** hesaplanır ve ±5 ile sınırlanır (aşan kısım "±5 sınırı" satırı olarak gösterilir).
- Karıştırılan takım sırası geri çevrilir.
- Claude'un yazdığı kazanan sayılarla uyuşmazsa gerekçesi atılır, kod gerekçesi yazılır.
- Cevap bozuksa, gelmezse ya da izin verilmezse kod hakemi tek başına karar verir.

**Kazananı her zaman sayılar belirler:** toplam = kod puanı + uyum bonusu.

## Örnek: gerçek bir maçın hakem metni

```
Sen bir açık artırma draft oyununun tarafsız ve tutarlı hakemisin. İki takım aynı kategoriden 5'er kart topladı.

ROLÜN
Kartların gücünü kod zaten puanladı (kod_puani kesin, değiştiremezsin). Senin işin kodun göremediğini değerlendirmek: takımın KENDİ İÇİNDEKİ UYUMU ve kategorinin HAKEM NOTU'ndaki kurallar.

NASIL DÜŞÜNECEKSİN (juri)
Bir jüri gibi düşün: seçimler bir arada sunulduğunda bütün oluşturuyor mu (sofra, menü, sepet, portföy), temel bir parça eksik mi, birbirinin tekrarı olan seçim var mı, hedef kitle bunu sever mi.

PUAN CETVELİ
- Her takım için en fazla 3 madde yaz. Her madde -2 ile +2 arası TAM SAYI:
  +2 belirgin, sonucu etkileyecek bir avantaj · +1 küçük avantaj · -1 küçük zayıflık · -2 belirgin zayıflık.
- Kartların tek tek güçlü olmasını (efsane, yüksek puan) ödüllendirme; o zaten kod_puani'nda var.
- Kodun zaten saydığı bonusları tekrar sayma.
- Emin değilsen o maddeyi yazma. Söylenecek bir şey yoksa madde listesi boş kalabilir.
- İyi madde örneği: {"konu":"Hepsi karada","puan":-1,"neden":"Suya kaçan bir rakibe karşı hiçbir kartı yok."} Kötü örnek: {"konu":"Güçlü kartlar","puan":2} (kart gücü zaten sayıldı, nedeni de yok).
- İki takım benzer uyumdaysa farkı küçük tut. Aynı takıma her seferinde aynı değerlendirmeyi yapacak kadar tutarlı ol.

ANLATI
Eşleşmelerin sonucu aşağıda kod tarafından belirlendi; sonucu değiştirme. Her eşleşme için kazananın NEDEN kazandığını kartların gerçek ve genel bilinen özellikleriyle anlatan, 1-2 cümlelik eğlenceli bir metin yaz. Bilgi uydurma, gerçek kişilere saygılı ol, şiddet ayrıntısına girme. Türkçe ve sade yaz.

CEVAP: Sadece şu biçimde tek bir JSON nesnesi döndür, başka hiçbir şey yazma:
{"takim1":{"maddeler":[{"konu":"2-4 kelime","puan":1,"neden":"tek cümle"}]},"takim2":{"maddeler":[]},"anlatilar":["1. eşleşme","2.","3.","4.","5."],"kazanan":"takim1","gerekce":"en fazla 2 cümle"}
"kazanan": kod_puani + maddelerin toplamı yüksek olan takım ("takim1", "takim2" ya da "berabere"). "gerekce": sonucu belirleyen farkı söyle.

KATEGORİ: Yemekler
GÖREV: Misafir sofrası kur: hangi sofradan herkes memnun kalkar?
ÖLÇÜTLER VE AĞIRLIKLAR: Lezzet %40, Doyuruculuk %20, Sofra uyumu %20, Sevilme %20
HAKEM NOTU: Çorba, ana yemek, yan yemek ve tatlı dengesi olan sofraya yüksek uyum bonusu ver. 5 ana yemekten oluşan sofra ağır kaçar.

TAKIM 1 — kod_puani: 87.6 (kodun zaten saydığı bonuslar: Tam sofra +8)
- İskender [Ana yemek, efsane]: Tereyağı, yoğurt ve dönerin Bursa'daki buluşması. (Lezzet 10, Doyuruculuk 9, Sofra uyumu 7, Sevilme 10)
- Hünkâr Beğendi [Ana yemek, yıldız]: Patlıcan beğendi üstünde tas kebabı. (Lezzet 9, Doyuruculuk 8, Sofra uyumu 8, Sevilme 8)
- Künefe [Tatlı, yıldız]: Peynirli tel kadayıf, sıcak sıcak servis edilir. (Lezzet 10, Doyuruculuk 6, Sofra uyumu 6, Sevilme 9)
- İmam Bayıldı [Pilav, salata, meze, yıldız]: Zeytinyağlı patlıcanın en zarif hali. (Lezzet 8, Doyuruculuk 5, Sofra uyumu 8, Sevilme 7)
- Tarhana Çorbası [Çorba, yıldız]: Kış günlerinin ev yapımı çorbası. (Lezzet 7, Doyuruculuk 6, Sofra uyumu 8, Sevilme 6)

TAKIM 2 — kod_puani: 77.2 (kodun zaten saydığı bonuslar: yok)
- Kuru Fasulye [Ana yemek, efsane]: Pilavla birlikte milli yemek. (Lezzet 8, Doyuruculuk 9, Sofra uyumu 9, Sevilme 9)
- Pirinç Pilavı [Pilav, salata, meze, yıldız]: Tane tane pilav her ana yemeğin dostu. (Lezzet 8, Doyuruculuk 7, Sofra uyumu 10, Sevilme 9)
- Sarma [Pilav, salata, meze, yıldız]: Zeytinyağlı yaprak sarması. (Lezzet 9, Doyuruculuk 6, Sofra uyumu 8, Sevilme 8)
- Türlü [Ana yemek, yıldız]: Mevsim sebzelerinin bir arada pişen hali. (Lezzet 7, Doyuruculuk 7, Sofra uyumu 8, Sevilme 6)
- Haydari [Pilav, salata, meze, yıldız]: Süzme yoğurt ve naneyle meze klasiği. (Lezzet 7, Doyuruculuk 3, Sofra uyumu 9, Sevilme 7)

EŞLEŞMELER
1. İskender (Takım 1) vs Kuru Fasulye (Takım 2) → Takım 1 kazandı
2. Hünkâr Beğendi (Takım 1) vs Pirinç Pilavı (Takım 2) → berabere
3. Künefe (Takım 1) vs Sarma (Takım 2) → Takım 1 kazandı
4. İmam Bayıldı (Takım 1) vs Türlü (Takım 2) → Takım 1 kazandı
5. Tarhana Çorbası (Takım 1) vs Haydari (Takım 2) → Takım 1 kazandı
```

## Beklenen cevap biçimi

```json
{"takim1":{"maddeler":[{"konu":"Tam sofra","puan":2,"neden":"Çorbadan tatlıya eksiksiz bir menü."}]},
 "takim2":{"maddeler":[{"konu":"Hepsi ana yemek","puan":-1,"neden":"Sofra çok ağır kaçıyor."}]},
 "anlatilar":["1. eşleşme","2.","3.","4.","5."],
 "kazanan":"takim1",
 "gerekce":"Dengeli sofra, rakibin güçlü ama ağır menüsünü geçti."}
```

# Kategori kuralları — tek doğruluk kaynağı.
# build.py bu dosyayı ve kartlar/*.txt dosyalarını okuyup data/ klasörünü üretir.
#
# Her kategori:
#   ad, sablon, gorev (oyuncuya gösterilen görev mesajı)
#   olcutler: [(ad, ağırlık), ...]  -> kart dosyasındaki puanlar BU SIRAYLA yazılır
#   gruplar:  {anahtar: etiket}     -> her kart tam olarak bir gruba girer
#   sinerjiler: kodun hesapladığı bonus/cezalar
#   garanti:  {grup: n}             -> her maçın 10 lotunda bu gruptan en az n kart olur
#   hakem_notu: yapay zeka hakeme verilen özel kural

def cesit(esikler, ad="Çeşitlilik"):
    return {"tip": "cesitlilik", "ad": ad, "esikler": esikler}

def hepsi(gruplar, bonus, ad):
    return {"tip": "gruplar_hepsi", "ad": ad, "gruplar": gruplar, "bonus": bonus}

def eksik(grup, bonus, ad):
    return {"tip": "grup_eksik", "ad": ad, "grup": grup, "bonus": bonus}

def fazla(grup, en_fazla, bonus, ad):
    return {"tip": "grup_fazla", "ad": ad, "grup": grup, "en_fazla": en_fazla, "bonus": bonus}

def tek_fazla(en_fazla, bonus, ad):
    return {"tip": "tek_grup_fazla", "ad": ad, "en_fazla": en_fazla, "bonus": bonus}

def etiket(et, en_az, bonus, ad):
    return {"tip": "etiket", "ad": ad, "etiket": et, "en_az": en_az, "bonus": bonus}

C4 = {"3": 4, "4": 7}   # 3 farklı grup +4, 4+ farklı grup +7
C3 = {"3": 5}           # 3 gruplu kategoriler: üç grubun hepsi gerekir

KATEGORILER = [
  dict(id="sehirler", ad="Şehirler", sablon="juri",
    gorev="Hayalindeki şehir ekibini kur: hangi takımın şehirleri yaşamak için daha iyi?",
    olcutler=[("Yaşam kalitesi", .35), ("İş imkânı", .25), ("Eğlence", .2), ("Doğa", .2)],
    gruplar={"turkiye": "Türkiye", "avrupa": "Avrupa", "asya": "Asya", "amerika": "Amerika", "diger": "Diğer"},
    sinerjiler=[cesit(C4, "Farklı kıtalar")],
    hakem_notu="Şehirleri yaşamak için değerlendir, sadece turistik açıdan değil. Farklı kıtalardan şehirleri bir araya getiren takıma uyum bonusu ver."),

  dict(id="meyveler", ad="Meyveler", sablon="juri",
    gorev="En lezzetli meyve sepetini kur: hangi sepet daha çok sevilir?",
    olcutler=[("Lezzet", .4), ("Sağlık", .25), ("Popülerlik", .2), ("Çok yönlülük", .15)],
    gruplar={"yaz": "Yaz meyvesi", "kis": "Kış meyvesi", "tropik": "Tropik", "her_mevsim": "Her mevsim"},
    sinerjiler=[cesit(C4, "Dört mevsim sepeti")],
    hakem_notu="Farklı mevsimlerin meyvelerini içeren sepete uyum bonusu ver. Aynı türden çok meyve tekdüzelik sayılır."),

  dict(id="issiz-ada", ad="Issız Ada Malzemeleri", sablon="hayatta_kalma",
    gorev="Issız adaya düştün, yanına 5 şey alabilirsin: kim daha uzun hayatta kalır?",
    olcutler=[("Hayatta kalma faydası", .4), ("Çok amaçlılık", .25), ("Dayanıklılık", .2), ("Kurtarılma şansı", .15)],
    gruplar={"su": "Su", "yiyecek": "Yiyecek", "barinak": "Barınak", "ates": "Ateş", "alet": "Alet", "kurtarilma": "Kurtarılma", "konfor": "Konfor"},
    sinerjiler=[hepsi(["su", "yiyecek", "barinak", "ates"], 8, "Dört temel ihtiyaç karşılandı"),
                fazla("konfor", 1, -3, "Fazla konfor eşyası")],
    garanti={"su": 1, "ates": 1},
    hakem_notu="Su, yiyecek, barınak ve ateş ihtiyaçlarının dördünü de karşılayan takıma yüksek uyum bonusu ver. Aynı ihtiyacı karşılayan tekrar eden eşyalar bonus düşürür. Elektrikli eşyalar şarj kaynağı yoksa zayıftır."),

  dict(id="sarkicilar", ad="Şarkıcılar", sablon="turnuva",
    gorev="Konser kadronu kur: hangi kadro daha çok bilet satar?",
    olcutler=[("Hit şarkılar", .35), ("Sahne performansı", .25), ("Hayran kitlesi", .25), ("Efsanelik", .15)],
    gruplar={"turk_pop": "Türk pop", "turk_klasik": "Arabesk ve halk", "turk_rock": "Türk rock", "yabanci": "Yabancı"},
    sinerjiler=[cesit(C4, "Her zevke hitap")],
    hakem_notu="Farklı tarzları bir araya getiren kadro daha geniş kitleye hitap eder; uyum bonusu ver."),

  dict(id="rapciler", ad="Rapçiler", sablon="turnuva",
    gorev="Rap festivalinin kadrosunu kur: sahneyi kim yakar?",
    olcutler=[("Söz yazarlığı", .3), ("Flow", .25), ("Hit şarkılar", .25), ("Sahne enerjisi", .2)],
    gruplar={"turk_eski": "Türkçe rap, eski kuşak", "turk_yeni": "Türkçe rap, yeni kuşak", "yabanci": "Yabancı"},
    sinerjiler=[cesit(C3, "Kuşaklar buluşuyor")],
    hakem_notu="Hem eski kuşak hem yeni kuşak rapçileri bir araya getiren kadroya uyum bonusu ver."),

  dict(id="oyunlar", ad="Oyunlar", sablon="turnuva",
    gorev="Oyun kütüphaneni kur: hangi raf daha çok oynanır?",
    olcutler=[("Eğlence", .3), ("Nostalji", .25), ("Bağımlılık", .25), ("Oyuncu sayısı", .2)],
    gruplar={"aksiyon": "Aksiyon", "spor": "Spor ve yarış", "strateji": "Strateji", "online": "Çok oyunculu", "macera": "Macera ve RPG"},
    sinerjiler=[cesit(C4, "Her türden oyun")],
    hakem_notu="Farklı türleri içeren kütüphaneye uyum bonusu ver."),

  dict(id="sebzeler", ad="Sebzeler", sablon="juri",
    gorev="Pazar çantanı doldur: hangi çanta daha sağlıklı ve lezzetli bir sofra çıkarır?",
    olcutler=[("Besin değeri", .35), ("Lezzet", .3), ("Mutfakta kullanım", .2), ("Sevilme", .15)],
    gruplar={"yaz": "Yaz sebzesi", "kis": "Kış sebzesi", "kok": "Kök ve yumru", "yesillik": "Yeşillik"},
    sinerjiler=[etiket("temel", 3, 5, "Mutfağın temeli"), cesit(C4, "Renkli tezgâh")],
    hakem_notu="Birlikte bir yemek oluşturabilen sebzelere (ör. domates, biber, soğan) uyum bonusu ver."),

  dict(id="yemekler", ad="Yemekler", sablon="juri",
    gorev="Misafir sofrası kur: hangi sofradan herkes memnun kalkar?",
    olcutler=[("Lezzet", .4), ("Doyuruculuk", .2), ("Sofra uyumu", .2), ("Sevilme", .2)],
    gruplar={"corba": "Çorba", "ana": "Ana yemek", "yan": "Pilav, salata, meze", "hamur": "Hamur işi", "tatli": "Tatlı"},
    sinerjiler=[hepsi(["corba", "ana", "tatli"], 8, "Tam sofra"), fazla("ana", 2, -4, "Fazla ana yemek")],
    garanti={"corba": 1, "tatli": 1},
    hakem_notu="Çorba, ana yemek, yan yemek ve tatlı dengesi olan sofraya yüksek uyum bonusu ver. 5 ana yemekten oluşan sofra ağır kaçar."),

  dict(id="tatlilar", ad="Tatlılar", sablon="juri",
    gorev="Tatlı vitrinini kur: müşteri hangi vitrine koşar?",
    olcutler=[("Lezzet", .4), ("Popülerlik", .25), ("Görünüm", .2), ("Çeşitlilik", .15)],
    gruplar={"serbetli": "Şerbetli", "sutlu": "Sütlü", "pasta": "Pasta ve hamur işi", "soguk": "Dondurma ve soğuk"},
    sinerjiler=[cesit(C4, "Zengin vitrin")],
    hakem_notu="Şerbetli, sütlü ve hamur işi tatlıları karıştıran vitrine uyum bonusu ver."),

  dict(id="icecekler", ad="İçecekler", sablon="juri",
    gorev="Kafe menünü hazırla: hangi menü daha çok satar?",
    olcutler=[("Lezzet", .35), ("Popülerlik", .3), ("Her mevsime uygunluk", .2), ("Çeşitlilik", .15)],
    gruplar={"sicak": "Sıcak", "soguk": "Soğuk", "geleneksel": "Geleneksel"},
    sinerjiler=[hepsi(["sicak", "soguk"], 4, "Yaz kış menü"), cesit({"3": 3}, "Üç çeşit")],
    hakem_notu="Hem sıcak hem soğuk içeceği olan menüye uyum bonusu ver."),

  dict(id="ulkeler", ad="Ülkeler", sablon="turnuva",
    gorev="Dünya turu planla: hangi rota daha unutulmaz?",
    olcutler=[("Turistik yerler", .3), ("Mutfak", .25), ("Kültür", .25), ("Doğa", .2)],
    gruplar={"avrupa": "Avrupa", "asya": "Asya", "amerika": "Amerika", "afrika": "Afrika", "okyanusya": "Okyanusya"},
    sinerjiler=[cesit(C4, "Kıtalar arası tur")],
    hakem_notu="Farklı kıtalardan ülkeleri içeren rotaya uyum bonusu ver."),

  dict(id="futbolcular", ad="Futbolcular", sablon="mac",
    gorev="5 kişilik kadronu kur: sahaya çıkınca hangi takım kazanır?",
    olcutler=[("Mevkisinde ustalık", .35), ("Yetenek", .3), ("Kupalar", .2), ("Efsanelik", .15)],
    gruplar={"kaleci": "Kaleci", "defans": "Defans", "orta": "Orta saha", "forvet": "Forvet"},
    sinerjiler=[eksik("kaleci", -10, "Kalecisiz takım"), hepsi(["kaleci", "defans", "orta", "forvet"], 8, "Dengeli kadro"),
                fazla("forvet", 2, -4, "Fazla forvet"), fazla("kaleci", 1, -5, "İki kaleci")],
    garanti={"kaleci": 2, "defans": 2},
    hakem_notu="Maç simülasyonu yap. Kalecisi olmayan takım ciddi dezavantajlıdır. Kaleci, defans, orta saha ve forvet dengesi olan takım güçlüdür; 5 forvetli takım savunmasız kalır."),

  dict(id="futbol-takimlari", ad="Futbol Takımları", sablon="turnuva",
    gorev="Kendi ligini kur: hangi takımların daha çok kupası olur?",
    olcutler=[("Kupa sayısı", .35), ("Kadro gücü", .25), ("Tarihi başarı", .25), ("Taraftar", .15)],
    gruplar={"turkiye": "Türkiye", "ingiltere": "İngiltere", "ispanya": "İspanya", "italya": "İtalya", "almanya": "Almanya", "diger": "Diğer"},
    sinerjiler=[cesit(C4, "Avrupa turu")],
    hakem_notu="Farklı ülkelerin liglerinden takımlar içeren lige uyum bonusu ver. Taraftarlık duygusuyla değil, ölçütlerle karar ver."),

  dict(id="basketbolcular", ad="Basketbolcular", sablon="mac",
    gorev="Parkeye 5'ini sür: hangi takım maçı alır?",
    olcutler=[("Pozisyonunda ustalık", .35), ("Oyun zekası", .3), ("Şampiyonluklar", .2), ("Efsanelik", .15)],
    gruplar={"oyun_kurucu": "Oyun kurucu", "kanat": "Kanat", "pivot": "Pivot"},
    sinerjiler=[hepsi(["oyun_kurucu", "kanat", "pivot"], 8, "Dengeli beşlik"), eksik("pivot", -6, "Pivotsuz takım")],
    garanti={"pivot": 2, "oyun_kurucu": 2},
    hakem_notu="Maç simülasyonu yap. Oyun kurucu, kanat ve pivot dengesi olan takım güçlüdür. Pivotu olmayan takım ribauntta zayıflar."),

  dict(id="diziler", ad="Diziler", sablon="turnuva",
    gorev="Kendi TV kanalını kur: reytinglerde hangi kanal birinci olur?",
    olcutler=[("Hikâye", .3), ("Reyting", .3), ("Efsanelik", .2), ("Tekrar izlenme", .2)],
    gruplar={"komedi": "Komedi", "dram": "Dram", "aksiyon": "Aksiyon ve suç", "fantastik": "Fantastik ve bilimkurgu"},
    sinerjiler=[cesit(C4, "Her türden yayın")],
    hakem_notu="Farklı türleri içeren kanala uyum bonusu ver; tek türden kanal belli bir kitleye sıkışır."),

  dict(id="filmler", ad="Filmler", sablon="turnuva",
    gorev="Sinema programını yap: hangi salon dolup taşar?",
    olcutler=[("Gişe", .3), ("Efsanelik", .3), ("Ödüller", .2), ("Tekrar izlenme", .2)],
    gruplar={"aksiyon": "Aksiyon", "dram": "Dram", "komedi": "Komedi", "fantastik": "Fantastik ve bilimkurgu", "animasyon": "Animasyon"},
    sinerjiler=[cesit(C4, "Dolu dolu program")],
    hakem_notu="Farklı türleri içeren programa uyum bonusu ver."),

  dict(id="oyuncular", ad="Oyuncular", sablon="turnuva",
    gorev="Film kadronu kur: hangi kadro daha iyi film çeker?",
    olcutler=[("Oyunculuk", .4), ("Ödüller", .2), ("Popülerlik", .25), ("Rol çeşitliliği", .15)],
    gruplar={"dram": "Dram", "komedi": "Komedi", "aksiyon": "Aksiyon"},
    sinerjiler=[cesit(C3, "Her role hazır kadro")],
    hakem_notu="Hem dram hem komedi oynayabilen dengeli kadroya uyum bonusu ver."),

  dict(id="cizgi-filmler", ad="Çizgi Filmler", sablon="turnuva",
    gorev="Sabah çizgi film kuşağını hazırla: çocuklar hangi kanalı açar?",
    olcutler=[("Eğlence", .35), ("Nostalji", .25), ("Karakter sevgisi", .25), ("Efsanelik", .15)],
    gruplar={"klasik": "Klasikler", "doksanlar": "90'lar", "yeni": "2000 sonrası", "anime": "Anime", "yerli": "Yerli"},
    sinerjiler=[cesit(C4, "Kuşaklar boyu kuşak")],
    hakem_notu="Farklı dönemlerin çizgi filmlerini içeren kuşağa uyum bonusu ver."),

  dict(id="arabalar", ad="Arabalar", sablon="yaris",
    gorev="Garajını kur: hangi garaj daha havalı ve güçlü?",
    olcutler=[("Performans", .3), ("İkoniklik", .3), ("Nostalji", .2), ("Tasarım", .2)],
    gruplar={"klasik": "Klasik", "spor": "Spor ve süper", "luks": "Lüks", "jdm": "JDM", "yerli": "Yerli efsane"},
    sinerjiler=[cesit(C4, "Koleksiyoncu garajı")],
    hakem_notu="Yarış simülasyonu yap (düz yol, viraj, gösteri turu). Antika ve efsane araçlar ikoniklik ve nostaljide yeni ama sıradan modelleri geçer."),

  dict(id="telefonlar", ad="Telefonlar", sablon="turnuva",
    gorev="Telefon koleksiyonunu kur: hangi koleksiyon daha efsane?",
    olcutler=[("Yenilik", .3), ("Popülerlik", .3), ("Dayanıklılık", .2), ("Nostalji", .2)],
    gruplar={"tuslu": "Tuşlu efsaneler", "erken_akilli": "İlk akıllılar", "yeni_akilli": "Yeni nesil"},
    sinerjiler=[cesit(C3, "Müze koleksiyonu")],
    hakem_notu="Farklı dönemlerin telefonlarını içeren koleksiyona uyum bonusu ver."),

  dict(id="markalar", ad="Markalar", sablon="juri",
    gorev="Marka portföyünü kur: hangi şirket daha değerli olur?",
    olcutler=[("Bilinirlik", .3), ("Marka değeri", .3), ("Kalite algısı", .2), ("Dünyaya yayılma", .2)],
    gruplar={"teknoloji": "Teknoloji", "giyim": "Giyim ve spor", "gida": "Yiyecek ve içecek", "otomotiv": "Otomotiv", "perakende": "Perakende ve hizmet"},
    sinerjiler=[cesit(C4, "Holding gibi portföy"), tek_fazla(2, -3, "Rakip markalar")],
    hakem_notu="Farklı sektörlerden markaları içeren portföye uyum bonusu ver; aynı sektörde rakip markalar birbirinin pazarını yer."),

  dict(id="meslekler", ad="Meslekler", sablon="hayatta_kalma",
    gorev="Yeni kurulan bir şehre 5 meslek gönder: hangi şehir daha iyi ayakta kalır?",
    olcutler=[("Hayati önem", .4), ("Topluma katkı", .25), ("Çok yönlülük", .2), ("Yerine konamazlık", .15)],
    gruplar={"saglik": "Sağlık", "gida": "Gıda", "barinma": "Barınma ve yapı", "guvenlik": "Güvenlik", "egitim": "Eğitim", "teknik": "Teknik", "diger": "Diğer"},
    sinerjiler=[hepsi(["saglik", "gida", "barinma", "guvenlik"], 8, "Şehrin temeli atıldı")],
    garanti={"saglik": 1, "gida": 1},
    hakem_notu="Sağlık, gıda, barınma ve güvenlik ihtiyaçlarını karşılayan ekibe yüksek uyum bonusu ver."),

  dict(id="hayvanlar", ad="Hayvanlar", sablon="duello",
    gorev="En güçlü hayvan takımını kur: düelloda hangi takım ayakta kalır?",
    olcutler=[("Güç", .3), ("Tehlike", .25), ("Savunma", .2), ("Hız", .15), ("Zeka", .1)],
    gruplar={"kara": "Kara", "deniz": "Deniz", "hava": "Hava"},
    sinerjiler=[etiket("suru", 2, 6, "Sürü avcıları"), etiket("zehirli", 2, 5, "Zehir ordusu"),
                hepsi(["kara", "deniz", "hava"], 7, "Her yerde hakim")],
    hakem_notu="Düellolar kıyı bölgesinde geçer: kara, sığ su ve gökyüzü bir arada. Tamamen deniz hayvanları karada, kara hayvanları derin suda dezavantajlıdır. Zehirli küçük hayvanlar büyükleri yenebilir ama bu nadir olmalı. Sevimlilik puan getirmez."),

  dict(id="kopek-irklari", ad="Köpek Irkları", sablon="juri",
    gorev="Köpek ekibini kur: koruma, zeka ve sadakatte hangi ekip üstün?",
    olcutler=[("Koruma", .3), ("Zeka", .25), ("Sadakat", .25), ("Dayanıklılık", .2)],
    gruplar={"bekci": "Bekçi ve koruma", "aile": "Aile köpeği", "calisma": "Av ve çalışma"},
    sinerjiler=[cesit(C3, "Her işe hazır ekip")],
    hakem_notu="Hem bekçi hem aile köpeği içeren dengeli ekibe uyum bonusu ver."),

  dict(id="kuslar", ad="Kuşlar", sablon="duello",
    gorev="Gökyüzü ekibini kur: havada kim hükmeder?",
    olcutler=[("Avcılık", .35), ("Hız", .25), ("Uçuş yeteneği", .25), ("Zeka", .15)],
    gruplar={"yirtici": "Yırtıcı", "deniz": "Deniz kuşu", "ucamayan": "Uçamayan", "diger": "Diğer"},
    sinerjiler=[etiket("yirtici", 3, 5, "Yırtıcılar filosu"), cesit({"3": 4}, "Karışık sürü")],
    hakem_notu="Düellolar havada geçer. Uçamayan kuşlar havada dezavantajlıdır ama karada savunmaya geçebilir."),

  dict(id="deniz-canlilari", ad="Deniz Canlıları", sablon="duello",
    gorev="Ekibini okyanusa sal: denizin hakimi kim olur?",
    olcutler=[("Güç", .3), ("Tehlike", .3), ("Hız", .2), ("Hayatta kalma", .2)],
    gruplar={"acik_deniz": "Açık deniz", "derin": "Derin deniz", "kiyi": "Kıyı ve resif", "memeli": "Deniz memelisi"},
    sinerjiler=[etiket("zehirli", 2, 5, "Zehir ordusu"), cesit(C4, "Yedi denizin ekibi")],
    hakem_notu="Düellolar açık okyanusta geçer. Hem yüzeyde hem derinde güçlü canlıları birleştiren takıma uyum bonusu ver."),

  dict(id="spor-dallari", ad="Spor Dalları", sablon="turnuva",
    gorev="Olimpiyat programını hazırla: hangi program daha çok izlenir?",
    olcutler=[("İzlenme", .35), ("Heyecan", .25), ("Dünyada yaygınlık", .25), ("Türkiye'de sevilme", .15)],
    gruplar={"takim": "Takım sporu", "bireysel": "Bireysel", "dovus": "Dövüş sporu", "motor": "Motor ve yarış"},
    sinerjiler=[cesit(C4, "Dolu dolu olimpiyat")],
    hakem_notu="Takım sporları ile bireysel sporları karıştıran programa uyum bonusu ver."),

  dict(id="kamp-malzemeleri", ad="Kamp Malzemeleri", sablon="hayatta_kalma",
    gorev="Dağda 3 gece kalacaksın: hangi çanta seni hayatta tutar?",
    olcutler=[("Hayatta kalma faydası", .4), ("Çok amaçlılık", .25), ("Hafiflik", .15), ("Dayanıklılık", .2)],
    gruplar={"barinak": "Barınak", "sicaklik": "Sıcaklık", "su": "Su", "isik": "Işık", "alet": "Alet", "yiyecek": "Yiyecek", "konfor": "Konfor"},
    sinerjiler=[hepsi(["barinak", "sicaklik", "su", "isik"], 8, "Eksiksiz çanta"), fazla("konfor", 1, -3, "Fazla konfor eşyası")],
    garanti={"barinak": 1, "su": 1},
    hakem_notu="Barınak, sıcaklık, su ve ışık ihtiyaçlarını karşılayan çantaya yüksek uyum bonusu ver. Ağır ve tekrar eden eşyalar bonus düşürür."),

  dict(id="okul-dersleri", ad="Okul Dersleri", sablon="juri",
    gorev="Ders programını hazırla: hangi program hayatta daha çok işe yarar?",
    olcutler=[("Hayatta işe yarama", .4), ("Meslek kapısı", .25), ("Genel kültür", .2), ("Eğlence", .15)],
    gruplar={"sayisal": "Sayısal", "sozel": "Sözel", "sanat_spor": "Sanat ve spor", "dil": "Yabancı dil"},
    sinerjiler=[cesit(C4, "Dengeli program")],
    hakem_notu="Sayısal, sözel ve sanat/spor derslerini dengeleyen programa uyum bonusu ver."),

  dict(id="tatil-yerleri", ad="Tatil Yerleri", sablon="turnuva",
    gorev="Yaz tatili rotanı çiz: hangi rota daha unutulmaz?",
    olcutler=[("Doğa", .3), ("Deniz ve eğlence", .3), ("Yemek", .2), ("Ulaşım ve fiyat", .2)],
    gruplar={"deniz": "Deniz", "doga": "Doğa", "sehir": "Şehir"},
    sinerjiler=[hepsi(["deniz", "doga", "sehir"], 6, "Deniz, doğa ve şehir")],
    hakem_notu="Deniz, doğa ve şehir tatilini birleştiren rotaya uyum bonusu ver."),

  dict(id="dinozorlar", ad="Dinozorlar", sablon="duello",
    gorev="Dinozor sürünü kur: hangi sürü hayatta kalır?",
    olcutler=[("Güç", .35), ("Boyut", .2), ("Hız", .2), ("Avcılık", .25)],
    gruplar={"etobur": "Etobur", "otobur": "Otobur", "ucan_yuzen": "Uçan ve yüzen"},
    sinerjiler=[cesit(C3, "Karma sürü"), etiket("suru", 2, 4, "Sürü avcıları")],
    hakem_notu="Etoburların avcılığı, otoburların savunma ve boyutu öne çıkar. Uçan ve yüzen sürüngenler karada zayıf, kendi ortamlarında güçlüdür. Not: uçan ve yüzen sürüngenlerin çoğu bilimsel olarak dinozor sayılmaz; kartlarda bu belirtilir."),

  dict(id="super-kahramanlar", ad="Süper Kahramanlar", sablon="duello",
    gorev="Dünyayı kurtaracak ekibi kur: hangi takım kötüleri yener?",
    olcutler=[("Güç", .35), ("Süper yetenek", .3), ("Zeka", .2), ("Takım uyumu", .15)],
    gruplar={"guc": "Güç ve dövüş", "zeka": "Zeka ve teknoloji", "ozel": "Büyü ve özel yetenek"},
    sinerjiler=[cesit(C3, "Tam kadro")],
    hakem_notu="Güçlü dövüşçülerle zeka ve strateji ustalarını birleştiren ekibe uyum bonusu ver. Karakterlerin yeteneklerini genel olarak bilinen haliyle anlat."),

  dict(id="film-kotuleri", ad="Film Kötüleri", sablon="duello",
    gorev="Kötüler birliğini kur: hangi ekip dünyayı ele geçirir?",
    olcutler=[("Güç", .3), ("Zeka ve plan", .3), ("Korkutuculuk", .25), ("Efsanelik", .15)],
    gruplar={"guc": "Güç", "zeka": "Zeka ve plan", "korku": "Korku"},
    sinerjiler=[cesit(C3, "Kusursuz kötülük planı")],
    hakem_notu="Hem güçlü hem planlayıcı kötüleri birleştiren ekibe uyum bonusu ver. Anlatıda şiddet ayrıntısına girme."),

  dict(id="ucaklar", ad="Uçaklar", sablon="yaris",
    gorev="Hava filonu kur: hangi filo daha hızlı ve güçlü?",
    olcutler=[("Hız", .35), ("Teknoloji", .25), ("Menzil", .2), ("İkoniklik", .2)],
    gruplar={"yolcu": "Yolcu uçağı", "askeri": "Askeri", "ozel": "Keşif ve özel", "helikopter": "Helikopter"},
    sinerjiler=[cesit(C4, "Karma filo")],
    hakem_notu="Yarış simülasyonu yap (kalkış, hız, menzil turu). Farklı tipleri birleştiren filoya uyum bonusu ver."),

  dict(id="motosikletler", ad="Motosikletler", sablon="yaris",
    gorev="Motor garajını kur: yarışı hangi garaj kazanır?",
    olcutler=[("Hız", .35), ("Hızlanma", .25), ("Tasarım", .2), ("Efsanelik", .2)],
    gruplar={"sport": "Süper spor", "naked": "Naked ve tur", "klasik": "Klasik ve chopper", "sehir": "Şehir ve scooter"},
    sinerjiler=[cesit(C4, "Her yola bir motor")],
    hakem_notu="Yarış simülasyonu yap (düz yol, viraj, şehir içi). Şehir içi turda küçük ve çevik motorlar avantajlıdır."),

  dict(id="fast-food", ad="Fast Food", sablon="juri",
    gorev="Gece acıktın: hangi menü daha lezzetli ve doyurucu?",
    olcutler=[("Lezzet", .4), ("Doyuruculuk", .25), ("Fiyat", .15), ("Popülerlik", .2)],
    gruplar={"ana": "Ana ürün", "yan": "Yan ürün", "icecek": "İçecek", "tatli": "Tatlı"},
    sinerjiler=[hepsi(["ana", "yan", "icecek"], 6, "Tam menü"), fazla("icecek", 1, -2, "Fazla içecek")],
    garanti={"icecek": 1, "yan": 1},
    hakem_notu="Ana yemek, yan ürün ve içeceği olan menüye uyum bonusu ver."),

  dict(id="atistirmaliklar", ad="Atıştırmalıklar", sablon="juri",
    gorev="Film gecesi için abur cubur sepeti hazırla: hangi sepet daha çok sevilir?",
    olcutler=[("Lezzet", .35), ("Nostalji", .25), ("Popülerlik", .25), ("Bağımlılık", .15)],
    gruplar={"tuzlu": "Tuzlu", "tatli": "Tatlı"},
    sinerjiler=[hepsi(["tuzlu", "tatli"], 5, "Tuzlu tatlı dengesi")],
    hakem_notu="Tuzlu ve tatlıyı dengeleyen sepete uyum bonusu ver."),

  dict(id="bilim-insanlari", ad="Bilim İnsanları", sablon="turnuva",
    gorev="Bilim ekibini kur: hangi ekip daha büyük keşif yapar?",
    olcutler=[("Keşiflerin önemi", .35), ("İnsanlığa etkisi", .3), ("Ödüller", .15), ("Çok yönlülük", .2)],
    gruplar={"fizik": "Fizik ve astronomi", "kimya": "Kimya", "biyoloji": "Biyoloji ve tıp", "matematik": "Matematik ve bilgisayar"},
    sinerjiler=[cesit(C4, "Disiplinler arası ekip")],
    hakem_notu="Farklı bilim dallarından isimleri birleştiren ekibe uyum bonusu ver."),

  dict(id="icatlar", ad="İcatlar", sablon="juri",
    gorev="Dünyayı değiştiren icatları seç: hangi set insanlık için daha önemli?",
    olcutler=[("Hayata etkisi", .4), ("Yaygınlık", .25), ("Yenilikçilik", .2), ("Yerine konamazlık", .15)],
    gruplar={"ulasim": "Ulaşım", "iletisim": "İletişim", "saglik": "Sağlık", "enerji": "Enerji ve sanayi", "gunluk": "Günlük hayat"},
    sinerjiler=[cesit(C4, "Medeniyet seti")],
    hakem_notu="Farklı alanları kapsayan sete uyum bonusu ver."),

  dict(id="tarihi-komutanlar", ad="Tarihi Komutanlar", sablon="duello",
    gorev="Ordunun komutanlarını seç: savaş meydanında hangi ordu kazanır?",
    olcutler=[("Askeri deha", .35), ("Zafer sayısı", .25), ("Liderlik", .25), ("Strateji", .15)],
    gruplar={"antik": "Antik çağ", "orta_cag": "Orta çağ", "turk": "Türk ve Osmanlı", "yeni_cag": "Yeni çağ"},
    sinerjiler=[cesit(C4, "Çağlar ötesi ordu")],
    hakem_notu="Savaşı taktik düzeyde, şiddet ayrıntısına girmeden anlat. Farklı dönemlerden komutanları birleştiren orduya uyum bonusu ver."),
]

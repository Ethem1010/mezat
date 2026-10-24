/*
 * Kategori temaları: her kategori bir "arenaya" bağlı.
 * Arena; renkleri, arka plan desenini ve oyun ekranındaki başlığı belirler.
 * Yeni kategori eklersen buraya da bir satır ekle (yoksa "akademi" teması kullanılır).
 */
(function (root) {
  "use strict";
  const ARENALAR = {
    savan:   { ad: "Vahşi Doğa Arenası" },
    okyanus: { ad: "Derin Mavi Arena" },
    saha:    { ad: "Yeşil Saha" },
    parke:   { ad: "Parke Arena" },
    garaj:   { ad: "Gece Garajı" },
    sahne:   { ad: "Büyük Sahne" },
    mutfak:  { ad: "Mutfak Mezatı" },
    harita:  { ad: "Dünya Turu" },
    arcade:  { ad: "Arcade Salonu" },
    macera:  { ad: "Hayatta Kalma Kampı" },
    akademi: { ad: "Akademi" },
    tarih:   { ad: "Savaş Meydanı" },
  };
  // kategori id -> [arena, simge]
  const KATEGORI = {
    "hayvanlar": ["savan", "🦁"], "kopek-irklari": ["savan", "🐕"], "dinozorlar": ["savan", "🦖"], "kuslar": ["savan", "🦅"],
    "deniz-canlilari": ["okyanus", "🦈"],
    "futbolcular": ["saha", "⚽"], "futbol-takimlari": ["saha", "🏟️"],
    "basketbolcular": ["parke", "🏀"], "spor-dallari": ["parke", "🏅"],
    "arabalar": ["garaj", "🏎️"], "motosikletler": ["garaj", "🏍️"], "ucaklar": ["garaj", "✈️"],
    "sarkicilar": ["sahne", "🎤"], "rapciler": ["sahne", "🎧"], "diziler": ["sahne", "📺"], "filmler": ["sahne", "🎬"],
    "oyuncular": ["sahne", "🎭"], "film-kotuleri": ["sahne", "🦹"], "super-kahramanlar": ["sahne", "🦸"],
    "meyveler": ["mutfak", "🍓"], "sebzeler": ["mutfak", "🥕"], "yemekler": ["mutfak", "🍲"], "tatlilar": ["mutfak", "🍰"],
    "icecekler": ["mutfak", "☕"], "fast-food": ["mutfak", "🍔"], "atistirmaliklar": ["mutfak", "🍿"],
    "sehirler": ["harita", "🏙️"], "ulkeler": ["harita", "🌍"], "tatil-yerleri": ["harita", "🏖️"],
    "oyunlar": ["arcade", "🎮"], "telefonlar": ["arcade", "📱"], "markalar": ["arcade", "🏷️"], "cizgi-filmler": ["arcade", "🖍️"],
    "issiz-ada": ["macera", "🏝️"], "kamp-malzemeleri": ["macera", "🏕️"],
    "bilim-insanlari": ["akademi", "🔬"], "icatlar": ["akademi", "💡"], "okul-dersleri": ["akademi", "📚"], "meslekler": ["akademi", "🧰"],
    "tarihi-komutanlar": ["tarih", "⚔️"],
  };
  function tema(id) {
    const [arena, simge] = KATEGORI[id] || ["akademi", "🎯"];
    return { arena, simge, arenaAd: ARENALAR[arena].ad };
  }
  root.MezatTema = { tema, ARENALAR };
})(typeof window !== "undefined" ? window : globalThis);

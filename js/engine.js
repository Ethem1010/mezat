/*
 * Mezat oyun motoru — arayüzden bağımsız, saf kurallar.
 *
 * Neden ayrı dosya? Aynı motor hem tek telefonda (tarayıcıda) hem de ileride
 * online odada (sunucuda) çalışabilsin diye. Oyunun durumu (state) düz bir
 * JSON nesnesidir: kaydedilebilir, ağ üzerinden gönderilebilir.
 *
 * Kullanım:
 *   let s = MezatEngine.createGame({ kategori, kartlar, isimler, ayarlar });
 *   s = MezatEngine.act(s, { type: "bid", player: 0, amount: 3 });
 *   s = MezatEngine.act(s, { type: "pass", player: 1 });
 *   s = MezatEngine.act(s, { type: "next" });
 *   const sonuc = MezatEngine.judge(s, kategori);
 */
(function (root) {
  "use strict";

  const TIERS = ["efsane", "guclu", "siradan"];

  // ---------- yardımcılar ----------
  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const round1 = (x) => Math.round(x * 10) / 10;

  function cardScore(card, kategori) {
    let s = 0;
    for (const [k, v] of Object.entries(kategori.olcutler)) s += card.puan[k] * v.agirlik;
    return s;
  }

  // ---------- çekiliş ----------
  // Her seviyeden belirli sayıda kart çeker, sonra kategorinin "garanti"
  // kuralını uygular (ör. futbolda en az 2 kaleci gelsin).
  function drawDeck(kartlar, cekilis, garanti, rng) {
    let deck = [];
    for (const t of TIERS) {
      deck.push(...shuffle(kartlar.filter((c) => c.seviye === t), rng).slice(0, cekilis[t] || 0));
    }
    const need = garanti || {};
    const count = (g) => deck.filter((c) => c.grup === g).length;
    for (const [g, n] of Object.entries(need)) {
      let guard = 0;
      while (count(g) < n && guard++ < 50) {
        const inDeck = new Set(deck.map((c) => c.id));
        const candidates = shuffle(kartlar.filter((c) => c.grup === g && !inDeck.has(c.id)), rng);
        let done = false;
        for (const cand of candidates) {
          const idx = deck.findIndex((c) =>
            c.seviye === cand.seviye && c.grup !== g && count(c.grup) > (need[c.grup] || 0));
          if (idx >= 0) { deck[idx] = cand; done = true; break; }
        }
        if (!done) break;
      }
    }
    return shuffle(deck, rng);
  }

  // ---------- oyun durumu ----------
  function createGame({ kategori, kartlar, isimler, ayarlar = {}, rng = Math.random, ilkAcan }) {
    const butce = ayarlar.butce ?? 20;
    const slot = ayarlar.slot ?? 5;
    const cekilis = ayarlar.cekilis ?? { efsane: 7, guclu: 3 };
    const deck = drawDeck(kartlar, cekilis, kategori.garanti, rng);
    const state = {
      surum: 1,
      kategoriId: kategori.id,
      butce, slot,
      players: isimler.map((ad) => ({ ad, butce, kartlar: [] })),
      deck,
      lot: 0,
      first: ilkAcan ?? (rng() < 0.5 ? 0 : 1),
      phase: "auction",
      opener: 0, turn: 0, bid: 0, leader: null, log: [], sold: null,
    };
    return startLot(state);
  }

  function isFull(state, p) { return state.players[p].kartlar.length >= state.slot; }

  // Bütçe sınırı yok: oyuncu parasının hepsini tek karta basabilir.
  function maxBid(state, p) {
    if (isFull(state, p)) return 0;
    return state.players[p].butce;
  }
  function minBid(state) { return state.bid === 0 ? 1 : state.bid + 1; }
  function currentCard(state) { return state.deck[state.lot]; }
  const broke = (state, p) => state.players[p].butce <= 0;

  function give(state, p, price, auto) {
    const pl = state.players[p];
    pl.butce -= price;
    pl.kartlar.push({ ...currentCard(state), odenen: price });
    return { player: p, price, auto: !!auto };
  }

  // Her lotun başında üç özel durum kontrol edilir:
  //  1) Bir oyuncunun slotları doldu  -> kalan lotlar tek tek açılır, her biri bedava diğerine geçer.
  //  2) İki oyuncunun da parası bitti -> lot bedava açılış sırasındakine gider.
  //  3) Açılış sırası parası bitende  -> karar rakipte: 1 verip alır ya da bedava bırakır.
  function startLot(state) {
    if (state.lot >= state.deck.length) { state.phase = "result"; return state; }
    Object.assign(state, { bid: 0, leader: null, log: [], sold: null });
    let opener = (state.lot + state.first) % 2;
    const full0 = isFull(state, 0), full1 = isFull(state, 1);
    if (full0 || full1) {
      // Lotlar yine tek tek tahtaya çıkar; her biri otomatik olarak diğer oyuncuya geçer.
      const to = full0 ? 1 : 0;
      state.sold = { ...give(state, to, 0, true), reason: "full", from: full0 ? 0 : 1 };
      state.phase = "sold";
      return state;
    }
    if (broke(state, 0) && broke(state, 1)) {
      state.sold = { ...give(state, opener, 0, true), reason: "both_broke" };
      state.phase = "sold";
      return state;
    }
    if (broke(state, opener)) {
      Object.assign(state, { phase: "decide", opener, turn: 1 - opener });
      return state;
    }
    Object.assign(state, { phase: "auction", opener, turn: opener });
    return state;
  }

  function sell(state) {
    state.sold = give(state, state.leader, state.bid, false);
    state.phase = "sold";
    return state;
  }

  // Tek giriş noktası: her hamle buradan geçer. Geçersiz hamle hata fırlatır.
  function act(prev, action) {
    const s = clone(prev);
    if (action.type === "next") {
      if (s.phase !== "sold") throw new Error("Sonraki lota sadece satıştan sonra geçilir.");
      s.lot += 1;
      return startLot(s);
    }
    if (s.phase === "decide") {
      // Rakibinin parası bitti: karar sıradaki (parası olan) oyuncuda.
      if (action.player !== s.turn) throw new Error("Sıra bu oyuncuda değil.");
      if (action.type === "take") {
        s.bid = 1; s.leader = s.turn; s.log.push({ player: s.turn, amount: 1, take: true });
        return sell(s);
      }
      if (action.type === "give") {
        s.log.push({ player: s.turn, gave: true });
        s.sold = { ...give(s, 1 - s.turn, 0, false), gift: true };
        s.phase = "sold";
        return s;
      }
      throw new Error("Bu durumda sadece 'al' ya da 'bırak' seçilebilir.");
    }
    if (s.phase !== "auction") throw new Error("Şu an teklif verilemez.");
    if (action.player !== s.turn) throw new Error("Sıra bu oyuncuda değil.");
    if (action.type === "bid") {
      const a = Math.floor(action.amount);
      if (a < minBid(s) || a > maxBid(s, s.turn)) throw new Error("Teklif izin verilen aralıkta değil.");
      s.bid = a; s.leader = s.turn; s.log.push({ player: s.turn, amount: a });
      const other = 1 - s.leader;
      if (maxBid(s, other) <= s.bid) {
        s.log.push({ player: other, pass: true, auto: true });
        return sell(s);
      }
      s.turn = other;
      return s;
    }
    if (action.type === "pass") {
      if (s.bid === 0) throw new Error("Lotu açan oyuncu pas geçemez; en az 1 vermeli.");
      s.log.push({ player: s.turn, pass: true });
      return sell(s);
    }
    throw new Error("Bilinmeyen hamle: " + action.type);
  }

  // ---------- hakem (kod) ----------
  function synergies(cards, kategori) {
    const groups = {};
    for (const c of cards) groups[c.grup] = (groups[c.grup] || 0) + 1;
    const distinct = Object.keys(groups).length;
    const out = [];
    for (const s of kategori.sinerjiler) {
      let bonus = 0;
      if (s.tip === "cesitlilik") {
        for (const [esik, b] of Object.entries(s.esikler)) if (distinct >= +esik) bonus = Math.max(bonus, b);
      } else if (s.tip === "gruplar_hepsi") {
        if (s.gruplar.every((g) => groups[g])) bonus = s.bonus;
      } else if (s.tip === "grup_eksik") {
        if (!groups[s.grup]) bonus = s.bonus;
      } else if (s.tip === "grup_fazla") {
        if ((groups[s.grup] || 0) > s.en_fazla) bonus = s.bonus;
      } else if (s.tip === "tek_grup_fazla") {
        if (Object.values(groups).some((n) => n > s.en_fazla)) bonus = s.bonus;
      } else if (s.tip === "etiket") {
        if (cards.filter((c) => (c.etiketler || []).includes(s.etiket)).length >= s.en_az) bonus = s.bonus;
      }
      if (bonus !== 0) out.push({ ad: s.ad, bonus });
    }
    return out;
  }

  const DUEL_TEXT = {
    duello: { title: "Düellolar", big: "{W}, {L} karşısında rahat kazandı.", close: "Kıl payı! {W}, {L} karşısında son anda üstün geldi.", mid: "{W}, {L} karşısında üstünlüğü ele geçirdi.", tie: "{A} ile {B} birbirine üstünlük kuramadı." },
    yaris: { title: "Yarış etapları", big: "{W}, {L} karşısında açık ara önde bitirdi.", close: "Foto finiş! {W}, {L} karşısında burun farkıyla önde.", mid: "{W} etabı {L} karşısında önde tamamladı.", tie: "{A} ile {B} aynı anda çizgiyi geçti." },
    mac: { title: "İkili mücadeleler", big: "{W}, {L} ile mücadelede sahayı domine etti.", close: "Çekişmeli! {W}, {L} ile mücadeleden az farkla galip çıktı.", mid: "{W}, {L} ile ikili mücadelede üstün geldi.", tie: "{A} ile {B} mücadelesi berabere bitti." },
    turnuva: { title: "Jüri karşılaştırması", big: "Jüri oybirliğiyle karar verdi: {W}, {L} karşısında açık ara önde.", close: "Jüri ikiye bölündü; {W}, {L} karşısında tek oy farkla önde.", mid: "Jüri oylamasında {W} öne çıktı, {L} geride kaldı.", tie: "Jüri {A} ile {B} arasında karar veremedi." },
    juri: { title: "Jüri karşılaştırması", big: "Jüri oybirliğiyle karar verdi: {W}, {L} karşısında açık ara önde.", close: "Jüri ikiye bölündü; {W}, {L} karşısında tek oy farkla önde.", mid: "Jüri oylamasında {W} öne çıktı, {L} geride kaldı.", tie: "Jüri {A} ile {B} arasında karar veremedi." },
    hayatta_kalma: { title: "Hayatta kalma testleri", big: "{W}, {L} karşısında çok daha işe yaradı.", close: "Zorlu test! {W}, {L} karşısında az farkla daha faydalı çıktı.", mid: "{W}, {L} karşısında daha çok işe yaradı.", tie: "{A} ile {B} eşit derecede faydalı oldu." },
  };
  const fill = (t, m) => t.replace(/\{(\w)\}/g, (_, k) => m[k]);

  function decisive(w, l, kategori) {
    let best = null, gap = -Infinity;
    for (const [k, v] of Object.entries(kategori.olcutler)) {
      const d = (w.puan[k] - l.puan[k]) * v.agirlik;
      if (d > gap) { gap = d; best = v.ad; }
    }
    return best;
  }

  // ai (isteğe bağlı): yzCevabiniDogrula'dan geçmiş yapay zeka kararı.
  // Yapay zeka sadece -5..+5 uyum bonusu ve anlatı ekler; kazananı yine sayılar belirler.
  function judge(state, kategori, ai) {
    const res = state.players.map((pl, i) => {
      const cards = pl.kartlar.map((c) => ({ ...c, skor: cardScore(c, kategori) })).sort((a, b) => b.skor - a.skor);
      const ham = cards.reduce((s, c) => s + c.skor, 0);
      const syn = synergies(cards, kategori);
      const bonus = syn.reduce((s, x) => s + x.bonus, 0);
      const kod = round1(ham * 2 + bonus);
      const uyum = ai ? ai.bonus[i] : 0;
      return { ad: pl.ad, kalanButce: pl.butce, cards, ham: round1(ham), sinerjiler: syn, bonus, kodPuani: kod,
        uyum, uyumGerekce: ai ? ai.bonusGerekce[i] : "", maddeler: ai ? ai.maddeler[i] : [], toplam: round1(kod + uyum) };
    });
    const T = DUEL_TEXT[kategori.sablon] || DUEL_TEXT.duello;
    const n = Math.min(res[0].cards.length, res[1].cards.length);
    const turlar = [];
    for (let i = 0; i < n; i++) {
      const a = res[0].cards[i], b = res[1].cards[i];
      const d = a.skor - b.skor;
      if (Math.abs(d) < 0.05) { turlar.push({ a, b, kazanan: null, metin: fill(T.tie, { A: a.ad, B: b.ad }) }); continue; }
      const [W, L, k] = d > 0 ? [a, b, 0] : [b, a, 1];
      const ad = Math.abs(d);
      const lead = fill(ad >= 2 ? T.big : ad < 0.7 ? T.close : T.mid, { W: W.ad, L: L.ad });
      turlar.push({ a, b, kazanan: k, metin: `${lead} Belirleyici fark: ${decisive(W, L, kategori).toLocaleLowerCase("tr")}.` });
    }
    let kazanan = null, esitlikBozuldu = false;
    if (res[0].toplam !== res[1].toplam) kazanan = res[0].toplam > res[1].toplam ? 0 : 1;
    else if (res[0].kalanButce !== res[1].kalanButce) { kazanan = res[0].kalanButce > res[1].kalanButce ? 0 : 1; esitlikBozuldu = true; }
    let gerekce = "";
    if (ai) {
      ai.anlatilar.forEach((t, i) => { if (t && turlar[i]) turlar[i].metin = t; });
      const beklenen = kazanan === null ? "berabere" : kazanan === 0 ? "takim1" : "takim2";
      if (ai.kazanan === beklenen && !esitlikBozuldu) gerekce = ai.gerekce;
    }
    if (!gerekce && kazanan !== null) {
      const W = res[kazanan], L = res[1 - kazanan];
      const fark = round1(W.toplam - L.toplam);
      const sinerji = W.sinerjiler.filter((s) => s.bonus > 0).map((s) => s.ad.toLocaleLowerCase("tr"));
      gerekce = esitlikBozuldu
        ? "Puanlar eşitti; kalan bütçesi fazla olan taraf kazandı."
        : `${fark} puan fark. ${sinerji.length ? "Fark yaratan: " + sinerji.join(", ") + "." : "Kartların toplam gücü belirleyici oldu."}`;
    }
    return { takimlar: res, turlar, turBasligi: T.title, kazanan, esitlikBozuldu, gerekce, hakem: ai ? "yz" : "kod" };
  }

  // ---------- yapay zeka hakem: istem ve doğrulama ----------
  // Oyun türüne göre hakemin "nasıl düşün" rehberi.
  const REHBER = {
    duello: "Her eşleşmeyi gerçek bir karşılaşma gibi canlandır: ortam (kara/deniz/hava), boyut farkı, zehir, zırh, hız, sürü taktiği. Takım uyumunda şunlara bak: takım farklı tehditlere karşı hazırlıklı mı, ortak bir zayıflığı var mı (hepsi küçük, hepsi yavaş, hepsi aynı ortamda), birbirini tamamlıyorlar mı.",
    mac: "Bir maç gibi düşün: dizilişin mantığı (kaleci ya da pivot gibi kritik mevki var mı), savunma ile hücum dengesi, aynı mevkide gereksiz yığılma, oyuncuların birbirini tamamlaması. Aynı takımda ya da kuşakta birlikte başarı yaşamış oyuncular küçük bir artı olabilir.",
    yaris: "Yarışı etaplara böl: düz yol (hız), viraj (çeviklik), dayanıklılık ya da menzil, gösteri turu (ikoniklik). Garaj her etap için güçlü bir aday sunuyor mu, yoksa tek bir alanda mı güçlü?",
    turnuva: "İzleyiciyi ya da oyuncu kitlesini düşün: farklı zevklere ve dönemlere hitap, tek türe sıkışma, gerçek popülerlik ve kalıcılık. Birbirine çok benzeyen seçimler kitleyi daraltır.",
    juri: "Bir jüri gibi düşün: seçimler bir arada sunulduğunda bütün oluşturuyor mu (sofra, menü, sepet, portföy), temel bir parça eksik mi, birbirinin tekrarı olan seçim var mı, hedef kitle bunu sever mi.",
    hayatta_kalma: "Senaryoyu canlandır: temel ihtiyaçlar karşılanıyor mu, seçimler birbirini tamamlıyor mu, gereksiz ya da tekrar eden var mı. İlk üç günü ve uzun vadeyi ayrı düşün.",
  };

  const SEVIYE_TR = { efsane: "efsane (en üst seviye)", guclu: "yıldız (bir tık altı)" };

  // ters=true: Takım 1 olarak 2. oyuncu sunulur (sıra yanlılığını önlemek için rastgele seçilir).
  function hakemIstemi(state, kategori, ters) {
    const j = judge(state, kategori);
    const sira = ters ? [1, 0] : [0, 1];
    const olc = Object.values(kategori.olcutler).map((o) => `${o.ad} %${Math.round(o.agirlik * 100)}`).join(", ");
    const team = (t, no) => {
      const lines = t.cards.map((c) => {
        const p = Object.entries(kategori.olcutler).map(([k, o]) => `${o.ad} ${c.puan[k]}`).join(", ");
        return `- ${c.ad} [${kategori.gruplar[c.grup] || c.grup}, ${SEVIYE_TR[c.seviye] || c.seviye}]: ${c.aciklama} (${p})`;
      }).join("\n");
      const syn = t.sinerjiler.length ? t.sinerjiler.map((s) => `${s.ad} ${s.bonus > 0 ? "+" : ""}${s.bonus}`).join(", ") : "yok";
      return `TAKIM ${no} — kod_puani: ${t.kodPuani} (kodun zaten saydığı bonuslar: ${syn})\n${lines}`;
    };
    const ad = (oyuncu) => (sira[0] === oyuncu ? "Takım 1" : "Takım 2");
    const pairs = j.turlar.map((d, i) => {
      const [x, y] = ters ? [d.b, d.a] : [d.a, d.b];
      const sonuc = d.kazanan === null ? "berabere" : `${ad(d.kazanan)} kazandı`;
      return `${i + 1}. ${x.ad} (Takım 1) vs ${y.ad} (Takım 2) → ${sonuc}`;
    }).join("\n");
    return `Sen bir açık artırma draft oyununun tarafsız ve tutarlı hakemisin. İki takım aynı kategoriden 5'er kart topladı.

ROLÜN
Kartların gücünü kod zaten puanladı (kod_puani kesin, değiştiremezsin). Senin işin kodun göremediğini değerlendirmek: takımın KENDİ İÇİNDEKİ UYUMU ve kategorinin HAKEM NOTU'ndaki kurallar.

NASIL DÜŞÜNECEKSİN (${kategori.sablon})
${REHBER[kategori.sablon] || REHBER.duello}

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

KATEGORİ: ${kategori.ad}
GÖREV: ${kategori.gorev_mesaji}
ÖLÇÜTLER VE AĞIRLIKLAR: ${olc}
HAKEM NOTU: ${kategori.hakem_notu}

${team(j.takimlar[sira[0]], 1)}

${team(j.takimlar[sira[1]], 2)}

EŞLEŞMELER
${pairs}`;
  }

  // Yapay zekadan gelen her şeyi güvenilmez kabul eder: sınırlar, kırpar, eksikleri boş bırakır.
  // Bonus, maddelerin toplamından kodla hesaplanır (Claude'un toplamına güvenilmez).
  function yzCevabiniDogrula(raw, ters) {
    if (!raw || typeof raw !== "object") return null;
    const str = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
    const takim = (o) => {
      if (!o || typeof o !== "object" || !Array.isArray(o.maddeler)) return null;
      const maddeler = o.maddeler.slice(0, 3).map((m) => {
        const n = Math.round(Number(m && m.puan));
        if (!Number.isFinite(n) || n === 0) return null;
        return { konu: str(m.konu, 40) || "Uyum", puan: Math.max(-2, Math.min(2, n)), neden: str(m.neden, 160) };
      }).filter(Boolean);
      const toplam = maddeler.reduce((s, m) => s + m.puan, 0);
      const bonus = Math.max(-5, Math.min(5, toplam));
      if (bonus !== toplam) maddeler.push({ konu: "±5 sınırı", puan: bonus - toplam, neden: "Hakem bonusu en fazla ±5 olabilir." });
      return { maddeler, bonus };
    };
    let t1 = takim(raw.takim1), t2 = takim(raw.takim2);
    if (!t1 || !t2) return null;
    const anl = Array.isArray(raw.anlatilar) ? raw.anlatilar.slice(0, 5).map((t) => str(t, 280)) : [];
    while (anl.length < 5) anl.push("");
    let kaz = ["takim1", "takim2", "berabere"].includes(raw.kazanan) ? raw.kazanan : "";
    if (ters) { [t1, t2] = [t2, t1]; kaz = kaz === "takim1" ? "takim2" : kaz === "takim2" ? "takim1" : kaz; }
    return {
      bonus: [t1.bonus, t2.bonus], maddeler: [t1.maddeler, t2.maddeler],
      bonusGerekce: [t1.maddeler.map((m) => m.neden).join(" "), t2.maddeler.map((m) => m.neden).join(" ")],
      anlatilar: anl, kazanan: kaz, gerekce: str(raw.gerekce, 400),
    };
  }

  // ---------- yapay zeka hakem için mesaj (Faz 2) ----------
  // Uygulama şimdilik bunu sadece "kopyala" düğmesiyle verir; Gemini'de elle denemek için.
  function hakemMesaji(state, kategori) {
    const j = judge(state, kategori);
    const olc = Object.values(kategori.olcutler).map((o) => `${o.ad} %${Math.round(o.agirlik * 100)}`).join(", ");
    const team = (t, i) => {
      const lines = t.cards.map((c) => {
        const p = Object.entries(kategori.olcutler).map(([k, o]) => `${o.ad} ${c.puan[k]}`).join(", ");
        return `- ${c.ad} (${kategori.gruplar[c.grup] || c.grup}): ${c.aciklama} [${p}]`;
      }).join("\n");
      return `TAKIM ${i + 1} (kod_puani: ${t.toplam})\n${lines}`;
    };
    return [
      `KATEGORİ: ${kategori.ad}`,
      `GÖREV: ${kategori.gorev_mesaji}`,
      `ŞABLON: ${kategori.sablon}`,
      `ÖLÇÜTLER VE AĞIRLIKLAR: ${olc}`,
      `HAKEM NOTU: ${kategori.hakem_notu}`,
      "",
      team(j.takimlar[0], 0), "",
      team(j.takimlar[1], 1), "",
      "Kurallara göre karar ver ve sadece JSON döndür.",
    ].join("\n");
  }

  root.MezatEngine = { createGame, act, judge, maxBid, minBid, currentCard, isFull, cardScore, synergies, drawDeck, hakemMesaji, hakemIstemi, yzCevabiniDogrula };
  if (typeof module !== "undefined") module.exports = root.MezatEngine;
})(typeof window !== "undefined" ? window : globalThis);

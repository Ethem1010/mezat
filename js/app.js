/*
 * Mezat arayüzü — ekranları çizer, düğmeleri motora bağlar.
 * Kurallar engine.js'te, kategori temaları temalar.js'te; burası sadece "ne gösterilecek" kısmı.
 *
 * Masa düzeni: iki oyuncunun alanı aynı anda ekranda. "Karşılıklı" modda üstteki
 * alan 180° döner; telefon masada ortada durur, herkes kendi tarafından oynar.
 * Sırası olmayan oyuncunun düğmeleri kilitli (motor da ayrıca reddeder).
 */
(function () {
  "use strict";
  const E = window.MezatEngine;
  const T = window.MezatTema;
  const LABEL = { efsane: "Efsane", guclu: "Yıldız", siradan: "Sıradan" };
  const ETIKET = { suru: "Sürü", zehirli: "Zehirli", temel: "Mutfağın temeli", yirtici: "Yırtıcı" };
  const COIN = `<span class="coin" aria-hidden="true"></span>`;
  const LOGO = `<svg viewBox="0 0 48 48" aria-hidden="true"><g transform="rotate(-35 24 24)"><rect x="12" y="9" width="24" height="12" rx="4" fill="var(--accent)"/><rect x="22" y="20" width="4.5" height="22" rx="2" fill="var(--fg)"/></g><rect x="6" y="40" width="22" height="5" rx="2.5" fill="var(--p1)"/></svg>`;

  const A = {
    screen: "home",
    katalog: null, ayarlar: null,
    secili: null, kategori: null, yukleniyor: false, hata: null,
    isimler: load("mezat-isimler", ["Oyuncu 1", "Oyuncu 2"]),
    duzen: load("mezat-duzen", "karsilikli"),   // "karsilikli" | "ayni"
    yzAcik: load("mezat-yz", true),
    arama: "",
    state: null, step: [1, 1], sonuc: null, kopya: null,
    sample: null, yzDurum: "bilinmiyor",          // "hazir" | "yok" | "izinsiz"
    hakemCtl: null, hakemNotu: "",
    shownLot: -1, shownBid: 0, konfeti: false,
  };

  function load(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* depolama kapalı olabilir */ } }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pc = (p) => (p === 0 ? "p1" : "p2");
  const $ = (id) => document.getElementById(id);
  const trLower = (s) => s.toLocaleLowerCase("tr");
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- veri ----------
  async function init() {
    try {
      const r = await fetch("data/kategoriler.json");
      if (!r.ok) throw new Error(r.status);
      const k = await r.json();
      A.katalog = k.kategoriler;
      A.ayarlar = { butce: k.butce, slot: k.slot, cekilis: k.cekilis };
      const son = load("mezat-son-kategori", null);
      await sec(A.katalog.some((c) => c.id === son) ? son : "hayvanlar");
    } catch (e) {
      A.hata = "Kategoriler yüklenemedi. Sayfayı bir sunucu üzerinden açtığından emin ol (README'deki 'Bilgisayarda çalıştırma' adımı).";
      render();
    }
  }
  async function sec(id) {
    A.secili = id; A.yukleniyor = true; A.hata = null; render();
    try {
      const r = await fetch(`data/kartlar/${id}.json`);
      if (!r.ok) throw new Error(r.status);
      A.kategori = await r.json();
      save("mezat-son-kategori", id);
    } catch {
      A.kategori = null; A.hata = "Bu kategorinin kartları yüklenemedi.";
    }
    A.yukleniyor = false; render();
  }
  // Claude hakemi: sadece Claude içinde açılınca vardır. Başka yerde (GitHub Pages) kod hakemi çalışır.
  function yzBaglan() {
    if (!window.claude || typeof window.claude.use !== "function") { A.yzDurum = "yok"; return; }
    window.claude.use("sample").then((s) => {
      A.sample = s; A.yzDurum = s ? "hazir" : "yok";
      if (A.screen === "home") render();
    }, () => { A.yzDurum = "yok"; });
  }

  // ---------- metinler ----------
  function sinerjiMetni(s, kat) {
    const g = (k) => kat.gruplar[k] || k;
    const sgn = (b) => (b > 0 ? `+${b}` : `${b}`);
    switch (s.tip) {
      case "cesitlilik": return Object.entries(s.esikler).map(([e, b]) => `${e}${e === String(Object.keys(kat.gruplar).length) ? "" : "+"} farklı grup ${sgn(b)}`).join(" · ");
      case "gruplar_hepsi": return `${s.gruplar.map(g).join(" + ")}: ${sgn(s.bonus)}`;
      case "grup_eksik": return `${g(s.grup)} yoksa ${sgn(s.bonus)}`;
      case "grup_fazla": return `${s.en_fazla}'den fazla ${trLower(g(s.grup))}: ${sgn(s.bonus)}`;
      case "tek_grup_fazla": return `Aynı gruptan ${s.en_fazla}'den fazla: ${sgn(s.bonus)}`;
      case "etiket": return `${s.en_az}+ ${trLower(ETIKET[s.etiket] || s.etiket)}: ${sgn(s.bonus)}`;
      default: return s.ad;
    }
  }

  // ---------- ana ekran ----------
  function home() {
    const kat = A.kategori;
    const q = trLower(A.arama.trim());
    const list = (A.katalog || []).filter((c) => !q || trLower(c.ad).includes(q));
    const tm = kat ? T.tema(kat.id) : null;
    const detail = A.yukleniyor ? `<p class="muted">Kartlar yükleniyor…</p>` : !kat ? "" : `
      <div class="arena"><span class="ico" aria-hidden="true">${tm.simge}</span>
        <div><div class="eyebrow">${esc(tm.arenaAd)} · ${kat.kartlar.length} kart</div><h2>${esc(kat.ad)}</h2></div></div>
      <div class="task">${esc(kat.gorev_mesaji)}</div>
      <div class="kv"><h3>Hakem neye bakar</h3><div class="weights">
        ${Object.values(kat.olcutler).map((o) => `<div class="weight"><span>${esc(o.ad)}</span><span class="bar"><span style="width:${o.agirlik * 100}%"></span></span><span class="num">%${Math.round(o.agirlik * 100)}</span></div>`).join("")}
      </div></div>
      <div class="kv"><h3>Bonus ve cezalar</h3><ul class="list">${kat.sinerjiler.map((s) => `<li><b>${esc(s.ad)}</b> · ${esc(sinerjiMetni(s, kat))}</li>`).join("")}</ul></div>`;
    const yz = A.yzDurum === "hazir"
      ? `<label class="switch" for="yz"><input type="checkbox" id="yz" ${A.yzAcik ? "checked" : ""}><span><b>Yapay zeka hakemi</b> · Claude maçı yorumlar, uyuma göre ±5 bonus verir. Claude hesabını kullanır; ilk maçta izin ister.</span></label>`
      : `<p class="hint">Hakem: kod. Yapay zeka hakemi bu sayfa Claude içinde açılınca devreye girer.</p>`;
    return `
      <header class="hero">
        <div class="logo">${LOGO}<h1>Mezat</h1></div>
        <p class="tagline">Kasanı aç, kartları kap, takımını kur. Hakem karar versin.</p>
      </header>
      ${A.hata && !A.katalog ? `<section class="panel"><p class="error">${esc(A.hata)}</p></section>` : ""}
      <section class="panel">
        <div class="names">
          <label class="p1" for="n1">1. oyuncu (alt)<input id="n1" maxlength="16" value="${esc(A.isimler[0])}" autocomplete="off"></label>
          <label class="p2" for="n2">2. oyuncu (üst)<input id="n2" maxlength="16" value="${esc(A.isimler[1])}" autocomplete="off"></label>
        </div>
        <div class="seg" role="radiogroup" aria-label="Ekran düzeni">
          <button role="radio" aria-checked="${A.duzen === "karsilikli"}" data-duzen="karsilikli"><b>Karşılıklı</b><span>Telefon masada, üst taraf ters döner</span></button>
          <button role="radio" aria-checked="${A.duzen === "ayni"}" data-duzen="ayni"><b>Aynı yönden</b><span>Yan yana oturuyorsanız</span></button>
        </div>
      </section>
      <section class="panel" aria-label="Kategori seçimi">
        <div class="row-actions">
          <div class="eyebrow">Arena seç · ${A.katalog ? A.katalog.length : ""} kategori</div>
          <button class="chipbtn" data-act="random">Rastgele</button>
        </div>
        <input id="arama" class="search" type="search" placeholder="Kategori ara…" value="${esc(A.arama)}" autocomplete="off">
        <div class="catgrid" id="catgrid">${grid(list)}</div>
      </section>
      <section class="panel pick" data-tile="${tm ? tm.arena : ""}">${detail}${A.hata && A.katalog ? `<p class="error">${esc(A.hata)}</p>` : ""}
        ${yz}
        <button class="cta go" data-act="start" ${!kat || A.yukleniyor ? "disabled" : ""}>Mezatı başlat</button>
      </section>
      <details class="panel"><summary>Kurallar</summary><ul class="list">
        <li>Herkese <b>${A.ayarlar?.butce ?? 20} bütçe</b> ve <b>${A.ayarlar?.slot ?? 5} slot</b>. Havuzda sadece en iyiler var. <b>10 lot</b> gizli sırayla gelir: 7 efsane, 3 yıldız.</li>
        <li>Sırası gelen oyuncu lotu <b>en az 1</b> ile açar. Sonra sırayla artırılır; pas diyen lotu bırakır.</li>
        <li>Bütçe serbest: istersen hepsini tek karta basabilirsin.</li>
        <li>Parası biten teklif veremez. Açılış sırası ondaysa karar rakibe geçer: rakip <b>1 verip alır</b> ya da lotu ona <b>bedava bırakır</b>.</li>
        <li>Bir oyuncunun 5 slotu dolunca kalan lotlar otomatik olarak diğerine geçer.</li>
        <li>Puanlar mezatta gizli. Sonunda hakem kategorinin ölçütlerine ve bonuslara bakar. Eşitlikte kalan bütçesi fazla olan kazanır.</li>
      </ul></details>`;
  }
  function grid(list) {
    if (!A.katalog) return `<p class="muted">Yükleniyor…</p>`;
    if (!list.length) return `<p class="muted">Bu aramayla eşleşen kategori yok.</p>`;
    return list.map((c) => {
      const t = T.tema(c.id);
      return `<button class="cat" data-cat="${c.id}" data-tile="${t.arena}" aria-pressed="${c.id === A.secili}"><span class="ico" aria-hidden="true">${t.simge}</span>${esc(c.ad)}</button>`;
    }).join("");
  }

  // ---------- masa ----------
  function seat(p) {
    const s = A.state, pl = s.players[p], c = E.currentCard(s);
    const flip = A.duzen === "karsilikli" && p === 1;
    const myTurn = (s.phase === "auction" || s.phase === "decide") && s.turn === p;
    const slots = Array.from({ length: s.slot }, (_, k) => `<span class="slot ${k < pl.kartlar.length ? "on" : ""}"></span>`).join("");
    const head = `
      <div class="seat-head">
        <span class="who">${esc(pl.ad)}</span>
        <span class="cash num ${pl.butce <= 0 ? "zero" : ""}" aria-label="${pl.butce} bütçe">${pl.butce}${COIN}</span>
      </div>
      <div class="slots">${slots}</div>
      <div class="owned">${pl.kartlar.map((x) => esc(x.ad)).join(", ")}</div>`;
    // Ters dönen oyuncu ortadaki kartı tersten görür; kendi alanında da özetini görsün.
    const mini = flip && c && !(s.sold && s.sold.reason === "full")
      ? `<div class="lotmini"><span class="chip ${c.seviye}">${LABEL[c.seviye]}</span> <b>${esc(c.ad)}</b>${s.bid ? ` · teklif <b class="num">${s.bid}</b>` : ""}</div>` : "";
    let body;
    if (s.phase === "sold") {
      const sd = s.sold, mine = sd.player === p;
      const last = s.lot === s.deck.length - 1;
      let msg;
      if (sd.reason === "full") msg = mine ? `Kalan lotlar bedava <b>sana</b> geçti.` : `Takımın tamam! Kalan lotlar rakibine geçti.`;
      else if (sd.reason === "both_broke") msg = mine ? `İkinizin de parası yok: <b>${esc(c.ad)}</b> bedava sende.` : `İkinizin de parası yok: ${esc(c.ad)} bedava rakibe gitti.`;
      else if (sd.gift) msg = mine ? `Rakibin bıraktı: <b>${esc(c.ad)}</b> bedava sende.` : `${esc(c.ad)} rakibine bedava bırakıldı.`;
      else msg = mine ? `Senin oldu: <b>${esc(c.ad)}</b>, ${sd.price} bütçe` : `${esc(c.ad)} rakibe gitti (${sd.price}).`;
      body = `<div class="seat-msg ${mine ? "won" : ""}">${msg}</div>
        <button class="seat-next" data-act="next">${last ? "Hakeme git" : "Sonraki lot"}</button>`;
    } else if (s.phase === "decide") {
      body = myTurn
        ? `<div class="turn ${pc(p)}">Rakibinin parası bitti. Karar senin.</div>
           <div class="actions"><button class="bidbtn ${pc(p)}" data-act="take" data-p="${p}">Al: 1</button><button class="passbtn" data-act="give" data-p="${p}">Ona bırak</button></div>
           <p class="owned">Alırsan 1 bütçe ödersin. Bırakırsan lot rakibine bedava gider.</p>`
        : `<div class="seat-msg">Paran bitti. Bu lotu rakibin ya alacak ya da sana bedava bırakacak.</div>`;
    } else {
      const mx = E.maxBid(s, p), mn = E.minBid(s), opening = s.bid === 0;
      const step = Math.min(Math.max(A.step[p], mn), Math.max(mx, mn));
      if (myTurn) A.step[p] = step;
      const dis = myTurn ? "" : "disabled";
      const quick = [1, 2, 5].map((n) => {
        const v = Math.min((opening ? 0 : s.bid) + n, mx);
        return `<button data-q="${v}" data-p="${p}" ${!myTurn || v < mn ? "disabled" : ""}>${opening ? n : "+" + n}</button>`;
      }).join("");
      const status = myTurn
        ? `<div class="turn ${pc(p)}">Sıra sende · ${opening ? "aç, en az 1" : "artır ya da pas"} · en fazla ${mx}</div>`
        : `<div class="turn wait">${pl.butce <= 0 ? "Paran bitti" : "Rakibin sırası, bekle"}</div>`;
      body = `${status}
        <div class="ctrl">
          <div class="bidrow">
            <button data-act="minus" data-p="${p}" aria-label="Azalt" ${!myTurn || step <= mn ? "disabled" : ""}>−</button>
            <div class="val num">${myTurn ? step : "–"}</div>
            <button data-act="plus" data-p="${p}" aria-label="Artır" ${!myTurn || step >= mx ? "disabled" : ""}>+</button>
            ${quick}
          </div>
          <div class="actions ${opening && myTurn ? "solo" : ""}">
            <button class="bidbtn ${pc(p)}" data-act="bid" data-p="${p}" ${dis}>${opening ? "Aç" : "Teklif ver"}${myTurn ? ": " + step : ""}</button>
            ${opening && myTurn ? "" : `<button class="passbtn" data-act="pass" data-p="${p}" ${!myTurn || opening ? "disabled" : ""}>Pas</button>`}
          </div>
        </div>`;
    }
    return `<section class="seat ${pc(p)} ${flip ? "flip" : ""} ${myTurn ? "active" : ""}" aria-label="${esc(pl.ad)} alanı">${head}${mini}${body}</section>`;
  }
  function center() {
    const s = A.state, c = E.currentCard(s), kat = A.kategori, tm = T.tema(kat.id);
    const top = `<div class="center-top"><span class="eyebrow arena-name">${tm.simge} ${esc(tm.arenaAd)}</span><span class="eyebrow num">Lot ${Math.min(s.lot + 1, s.deck.length)}/${s.deck.length}</span></div>`;
    if (s.sold && s.sold.reason === "full") {
      const to = s.players[s.sold.player].ad;
      return `<section class="center">${top}
        <div class="lot"><div class="stamp">OTOMATİK</div><div class="chips"><span class="chip">Slot doldu</span></div>
          <h2>Kalan lotlar ${esc(to)} tarafına geçti</h2>
          <p>${s.sold.cards.map(esc).join(", ")}</p></div>
        <button class="linkbtn" data-act="quit">Mezatı bırak</button></section>`;
    }
    const reveal = A.shownLot !== s.lot && !reduced();
    A.shownLot = s.lot;
    const bump = s.bid !== A.shownBid && s.bid > 0 && !reduced();
    A.shownBid = s.bid;
    const chips = [`<span class="chip ${c.seviye}">${LABEL[c.seviye]}</span>`, `<span class="chip">${esc(kat.gruplar[c.grup] || c.grup)}</span>`];
    for (const t of c.etiketler || []) if (ETIKET[t]) chips.push(`<span class="chip">${ETIKET[t]}</span>`);
    let stamp = "";
    if (s.phase === "sold") {
      const sd = s.sold;
      stamp = sd.gift ? `<div class="stamp gift">HEDİYE</div>` : sd.reason === "both_broke" ? `<div class="stamp gift">BEDAVA</div>` : `<div class="stamp">SATILDI</div>`;
    }
    const lead = s.phase === "decide"
      ? `<span class="c${s.turn + 1}">${esc(s.players[s.turn].ad)}</span> karar veriyor`
      : s.leader === null ? "Teklif bekleniyor" : `<span class="c${s.leader + 1}">${esc(s.players[s.leader].ad)}</span> önde`;
    const last = s.log.slice(-2).map((e) => {
      const n = `<span class="c${e.player + 1}">${esc(s.players[e.player].ad)}</span>`;
      if (e.gave) return `${n} rakibine bıraktı`;
      if (e.take) return `${n} 1 ile aldı`;
      return e.pass ? `${n} ${e.auto ? "artıramadı" : "pas"}` : `${n} ${e.amount}`;
    }).join(" · ");
    return `<section class="center">${top}
      <div class="lot ${c.seviye} ${reveal ? "reveal" : ""}">
        ${stamp}<span class="wm" aria-hidden="true">${tm.simge}</span>
        <div class="chips">${chips.join("")}</div>
        <h2>${esc(c.ad)}</h2>
        <p>${esc(c.aciklama)}</p>
      </div>
      <div class="bidline"><span class="paddle num ${s.bid ? "" : "empty"} ${bump ? "bump" : ""}">${s.bid || "–"}</span><span class="lead">${lead}</span></div>
      ${last ? `<div class="loglast"><span class="chipline">${last}</span></div>` : ""}
      <button class="linkbtn" data-act="quit">Mezatı bırak</button>
    </section>`;
  }
  function table() {
    return `<div class="table ${A.duzen}">${seat(1)}${center()}${seat(0)}</div>`;
  }

  // ---------- hakem ----------
  function judging() {
    return `<section class="panel judging">
      <div class="gavel" aria-hidden="true">⚖️</div>
      <div class="eyebrow">${esc(A.kategori.ad)} · hakem masası</div>
      <h2>Hakem maçı inceliyor</h2>
      <p class="muted" id="hakem-satir">Kartlar, ölçütler ve takım uyumu tartılıyor…</p>
      <div class="dots" aria-hidden="true"><span></span><span></span><span></span></div>
      <button class="ghost" data-act="skip">Beklemeden kod hakemiyle bitir</button>
    </section>`;
  }
  async function hakemeGit() {
    A.sonuc = E.judge(A.state, A.kategori);
    A.hakemNotu = ""; A.konfeti = true;
    if (!(A.sample && A.yzAcik && A.yzDurum === "hazir")) { A.screen = "result"; render(); return window.scrollTo(0, 0); }
    A.screen = "judging"; render(); window.scrollTo(0, 0);
    const satirlar = ["Kartlar, ölçütler ve takım uyumu tartılıyor…", "Hakem notlarını okuyor…", "Eşleşmeleri tek tek anlatıyor…", "Son kararı yazıyor…"];
    let i = 0;
    const t = setInterval(() => { const el = $("hakem-satir"); if (el) el.textContent = satirlar[++i % satirlar.length]; }, 3500);
    const ctl = new AbortController(); A.hakemCtl = ctl;
    try {
      const ters = Math.random() < 0.5;   // takım sırası karıştırılır: hakem "ilk takımı" kayıramaz
      const raw = await A.sample.json(E.hakemIstemi(A.state, A.kategori, ters), { signal: ctl.signal, modelTier: "default", effort: "medium" });
      const ai = E.yzCevabiniDogrula(raw, ters);
      if (ai) A.sonuc = E.judge(A.state, A.kategori, ai);
      else A.hakemNotu = "Yapay zekanın cevabı okunamadı; karar kod hakeminden.";
    } catch (e) {
      const code = e && e.code;
      if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(code)) {
        A.yzDurum = "izinsiz"; A.hakemNotu = "Yapay zekaya izin verilmedi; karar kod hakeminden.";
      } else if (code === "cancelled") {
        A.hakemNotu = "Kod hakemiyle bitirildi.";
      } else if (code === "rate_limited") {
        A.hakemNotu = "Yapay zeka şu an meşgul ya da kullanım sınırı doldu; karar kod hakeminden.";
      } else {
        A.hakemNotu = "Yapay zekaya ulaşılamadı; karar kod hakeminden.";
      }
    } finally {
      clearInterval(t); A.hakemCtl = null;
    }
    if (A.screen === "judging") { A.screen = "result"; render(); window.scrollTo(0, 0); }
  }

  function result() {
    const r = A.sonuc, kat = A.kategori, [t0, t1] = r.takimlar, tm = T.tema(kat.id);
    const badge = r.hakem === "yz" ? "Yapay zeka hakemi" : "Kod hakemi";
    const v = r.kazanan === null
      ? `<section class="verdict tie"><div class="eyebrow">${badge} · ${esc(kat.ad)}</div><h2>Berabere</h2><div class="score num">${t0.toplam} – ${t1.toplam}</div></section>`
      : `<section class="verdict ${pc(r.kazanan)}"><span class="trophy" aria-hidden="true">🏆</span><div class="eyebrow">${badge} · ${tm.simge} ${esc(kat.ad)}</div><h2>${esc(r.takimlar[r.kazanan].ad)} kazandı</h2><div class="score num">${t0.toplam} – ${t1.toplam}</div>${r.gerekce ? `<p>${esc(r.gerekce)}</p>` : ""}</section>`;
    const teams = r.takimlar.map((t, i) => `
      <div class="team ${pc(i)}"><h3>${esc(t.ad)}</h3>
        ${t.cards.map((c) => `<div class="trow"><span class="nm">${esc(c.ad)}</span><span class="sc num">${c.skor.toFixed(1)}</span><span class="meta">${esc(kat.gruplar[c.grup] || c.grup)} · ${LABEL[c.seviye]} · ${c.odenen ? c.odenen + " ödendi" : "bedava"}</span></div>`).join("")}
        <div class="sum">
          <div><span>Kart puanı × 2</span><span class="num">${(t.kodPuani - t.bonus).toFixed(1)}</span></div>
          ${t.sinerjiler.map((s) => `<div><span>${esc(s.ad)}</span><span class="num ${s.bonus > 0 ? "plus" : "minus"}">${s.bonus > 0 ? "+" : ""}${s.bonus}</span></div>`).join("") || `<div><span>Kural bonusu yok</span><span class="num">0</span></div>`}
          ${r.hakem === "yz" ? (t.maddeler.length
            ? t.maddeler.map((m) => `<div><span>Hakem: ${esc(m.konu)}</span><span class="num ${m.puan > 0 ? "plus" : "minus"}">${m.puan > 0 ? "+" : ""}${m.puan}</span></div>${m.neden ? `<div class="why">${esc(m.neden)}</div>` : ""}`).join("")
            : `<div><span>Hakem uyum bonusu</span><span class="num">0</span></div>`) : ""}
          <div><span>Kalan bütçe</span><span class="num">${t.kalanButce}</span></div>
          <div class="tot"><span>Toplam</span><span class="num">${t.toplam}</span></div>
        </div>
      </div>`).join("");
    const duels = r.turlar.map((d, i) => `<div class="duel"><div class="vs">${i + 1}. <span class="${d.kazanan === 0 ? "c1" : ""}">${esc(d.a.ad)}</span> vs <span class="${d.kazanan === 1 ? "c2" : ""}">${esc(d.b.ad)}</span></div><p>${esc(d.metin)}</p></div>`).join("");
    return `${v}
      ${A.hakemNotu ? `<p class="note">${esc(A.hakemNotu)}</p>` : ""}
      <section class="teams">${teams}</section>
      <section class="panel"><div class="eyebrow">${esc(r.turBasligi)} · en güçlüler sırayla eşleşir</div>${duels}</section>
      <div class="btns"><button class="cta go" data-act="again">Rövanş</button><button class="ghost" data-act="home">Arena değiştir</button></div>
      <details class="panel"><summary>Hakem metnini dışarıda denemek için</summary>
        <p class="hint">Bu maçın hakem metnini kopyalayıp başka bir yapay zekaya (ör. Gemini) yapıştırabilirsin.</p>
        <button class="ghost" data-act="copy">Hakem metnini kopyala</button>
        ${A.kopya ? `<p class="hint">${esc(A.kopya.durum)}</p>${A.kopya.goster ? `<textarea class="copybox" id="copybox" readonly>${esc(A.kopya.metin)}</textarea>` : ""}` : ""}
      </details>
      <p class="note">Kazananı her zaman sayılar belirler. Yapay zeka hakemi en fazla ±5 uyum bonusu verebilir ve maçı yorumlar.</p>`;
  }

  // Kazanana küçük bir konfeti yağmuru (hareket azaltma açıksa yok).
  function konfeti(renkler) {
    if (reduced()) return;
    const cv = document.createElement("canvas"); cv.id = "konfeti";
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
    const W = innerWidth, H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    const parts = Array.from({ length: 110 }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * .5, vx: (Math.random() - .5) * 2.2, vy: 2 + Math.random() * 3.2, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .25, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: renkler[Math.floor(Math.random() * renkler.length)] }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) { p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
      if (t - t0 < 3200) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  function render() {
    const app = $("app");
    document.body.classList.toggle("in-table", A.screen === "game");
    if (A.screen === "home" || !A.kategori) delete document.body.dataset.arena;
    else document.body.dataset.arena = T.tema(A.kategori.id).arena;
    if (A.screen === "home") app.innerHTML = home();
    else if (A.screen === "game") app.innerHTML = table();
    else if (A.screen === "judging") app.innerHTML = judging();
    else app.innerHTML = result();
    if (A.kopya && A.kopya.goster && $("copybox")) $("copybox").select();
    if (A.screen === "result" && A.konfeti) {
      A.konfeti = false;
      if (A.sonuc.kazanan !== null) {
        const cs = getComputedStyle(document.body);
        konfeti([cs.getPropertyValue(A.sonuc.kazanan === 0 ? "--p1" : "--p2").trim(), cs.getPropertyValue("--accent").trim(), "#F2B705", "#FFFFFF"]);
      }
    }
  }

  // ---------- hamleler ----------
  function startGame() {
    if ($("n1")) A.isimler = [($("n1").value || "").trim() || "Oyuncu 1", ($("n2").value || "").trim() || "Oyuncu 2"];
    save("mezat-isimler", A.isimler);
    A.state = E.createGame({ kategori: A.kategori, kartlar: A.kategori.kartlar, isimler: A.isimler, ayarlar: A.ayarlar });
    A.step = [1, 1]; A.sonuc = null; A.kopya = null; A.hakemNotu = ""; A.shownLot = -1; A.shownBid = 0; A.screen = "game";
    render(); window.scrollTo(0, 0);
  }
  function apply(action) {
    try { A.state = E.act(A.state, action); } catch (e) { console.warn(e.message); return; }
    if (A.state.phase === "auction") A.step[A.state.turn] = E.minBid(A.state);
    if (A.state.phase === "result") return hakemeGit();
    render();
  }

  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b || b.disabled) return;
    if (b.dataset.cat) return sec(b.dataset.cat);
    if (b.dataset.duzen) { A.duzen = b.dataset.duzen; save("mezat-duzen", A.duzen); return render(); }
    const s = A.state;
    // Sırası olmayan oyuncunun dokunuşları yok sayılır.
    if (b.dataset.p !== undefined && (!s || (s.phase !== "auction" && s.phase !== "decide") || +b.dataset.p !== s.turn)) return;
    if (b.dataset.q) { A.step[s.turn] = +b.dataset.q; return render(); }
    switch (b.dataset.act) {
      case "random": { const c = A.katalog[Math.floor(Math.random() * A.katalog.length)]; A.arama = ""; return sec(c.id); }
      case "start": return startGame();
      case "minus": A.step[s.turn]--; return render();
      case "plus": A.step[s.turn]++; return render();
      case "bid": return apply({ type: "bid", player: s.turn, amount: A.step[s.turn] });
      case "pass": return apply({ type: "pass", player: s.turn });
      case "take": return apply({ type: "take", player: s.turn });
      case "give": return apply({ type: "give", player: s.turn });
      case "next": return apply({ type: "next" });
      case "skip": if (A.hakemCtl) A.hakemCtl.abort(); return;
      case "again": return startGame();
      case "quit": case "home": A.screen = "home"; A.state = null; return render();
      case "copy": {
        const metin = E.hakemMesaji(A.state, A.kategori);
        const fallback = () => { A.kopya = { metin, goster: true, durum: "Otomatik kopyalanamadı; metin seçili, kendin kopyala." }; render(); };
        try {
          navigator.clipboard.writeText(metin).then(() => { A.kopya = { metin, goster: false, durum: "Kopyalandı." }; render(); }, fallback);
        } catch { fallback(); }
        return;
      }
    }
  });
  document.addEventListener("input", (ev) => {
    if (ev.target.id === "arama") {
      A.arama = ev.target.value;
      const q = trLower(A.arama.trim());
      $("catgrid").innerHTML = grid(A.katalog.filter((c) => !q || trLower(c.ad).includes(q)));
    }
    if (ev.target.id === "n1" || ev.target.id === "n2") A.isimler = [$("n1").value, $("n2").value];
  });
  document.addEventListener("change", (ev) => {
    if (ev.target.id === "yz") { A.yzAcik = ev.target.checked; save("mezat-yz", A.yzAcik); }
  });

  render();
  init();
  yzBaglan();

  // Uygulama olarak kurulabilsin (PWA). Desteklenmeyen ortamda sessizce atlanır.
  if ("serviceWorker" in navigator && location.protocol === "https:" && !/claude\.ai|claudeusercontent/.test(location.hostname)) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();

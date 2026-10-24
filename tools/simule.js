// Motor testi: her kategoride rastgele maçlar oynatır, kuralları kontrol eder.
// Kullanım: node tools/simule.js [maç sayısı / kategori]
const fs = require("fs"), path = require("path");
const E = require("../js/engine.js");
const ROOT = path.join(__dirname, "..");
const katalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data/kategoriler.json"), "utf8"));
const N = +(process.argv[2] || 300);
let toplam = 0, garantiIhlali = 0;
const stats = [];
for (const meta of katalog.kategoriler) {
  const kat = JSON.parse(fs.readFileSync(path.join(ROOT, "data/kartlar", meta.id + ".json"), "utf8"));
  let p0 = 0, tie = 0, synHit = 0;
  for (let g = 0; g < N; g++) {
    let s = E.createGame({ kategori: kat, kartlar: kat.kartlar, isimler: ["A", "B"], ilkAcan: g % 2 });
    for (const [grp, n] of Object.entries(kat.garanti || {}))
      if (s.deck.filter(c => c.grup === grp).length < n) garantiIhlali++;
    if (new Set(s.deck.map(c => c.id)).size !== 10) throw new Error(kat.id + " tekrar eden kart");
    let guard = 0;
    while (s.phase !== "result") {
      if (guard++ > 400) throw new Error("sonsuz döngü " + kat.id);
      if (s.phase === "sold") { s = E.act(s, { type: "next" }); continue; }
      if (s.phase === "decide") { s = E.act(s, { type: Math.random() < 0.5 ? "take" : "give", player: s.turn }); continue; }
      const mn = E.minBid(s), mx = E.maxBid(s, s.turn);
      if (mx < mn) throw new Error("takıldı " + kat.id);
      if (s.bid > 0 && Math.random() < 0.45) s = E.act(s, { type: "pass", player: s.turn });
      else s = E.act(s, { type: "bid", player: s.turn, amount: Math.random() < 0.1 ? mx : mn + Math.floor(Math.random() * Math.min(4, mx - mn + 1)) });
    }
    for (const p of s.players) {
      if (p.kartlar.length !== 5 || p.butce < 0) throw new Error("hatalı bitiş " + kat.id);
    }
    const j = E.judge(s, kat);
    if (j.kazanan === 0) p0++; if (j.kazanan === null) tie++;
    synHit += j.takimlar.filter(t => t.sinerjiler.length).length;
    // geçersiz hamleler reddedilmeli
    toplam++;
  }
  stats.push(`${kat.id.padEnd(20)} 1.oyuncu %${Math.round(p0 / N * 100)} · berabere ${tie} · sinerji alan takım %${Math.round(synHit / (2 * N) * 100)}`);
}
// kural ihlali testleri
const kat = JSON.parse(fs.readFileSync(path.join(ROOT, "data/kartlar/hayvanlar.json"), "utf8"));
let s = E.createGame({ kategori: kat, kartlar: kat.kartlar, isimler: ["A", "B"], ilkAcan: 0 });
const throws = (fn) => { try { fn(); return false; } catch { return true; } };
if (!throws(() => E.act(s, { type: "pass", player: 0 }))) throw new Error("açan pas geçebildi");
if (!throws(() => E.act(s, { type: "bid", player: 1, amount: 1 }))) throw new Error("sırası olmayan teklif verdi");
if (!throws(() => E.act(s, { type: "bid", player: 0, amount: 99 }))) throw new Error("bütçeyi aşan teklif kabul edildi");
console.log(stats.join("\n"));
console.log(`\n${toplam} maç oynandı, garanti ihlali: ${garantiIhlali}. Kural testleri geçti.`);

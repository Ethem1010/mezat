"""Kategori kurallarını ve kart metin dosyalarını okuyup data/ klasörüne JSON üretir.

Kullanım:  python3 tools/build.py
Hata varsa hangi dosyanın hangi satırında olduğunu yazar ve durur.
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from kategoriler import KATEGORILER  # noqa: E402

SEVIYE = {"e": "efsane", "g": "guclu", "s": "siradan"}
HEDEF = {"efsane": 7, "guclu": 14, "siradan": 14}
CEKILIS = {"efsane": 2, "guclu": 4, "siradan": 4}


def slug(s):
    t = s.lower().translate(str.maketrans("çğıöşüâîû", "cgiosuaiu"))
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def olcut_key(ad):
    return slug(ad).replace("-", "_")


def parse(kat):
    path = ROOT / "tools" / "kartlar" / f"{kat['id']}.txt"
    if not path.exists():
        raise SystemExit(f"Eksik kart dosyası: {path.name}")
    keys = [olcut_key(a) for a, _ in kat["olcutler"]]
    cards, errors, seen = [], [], set()
    for no, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("|")
        if len(parts) != 6:
            errors.append(f"{path.name}:{no} 6 alan olmalı, {len(parts)} var")
            continue
        ad, sev, grup, tags, aciklama, puan = (p.strip() for p in parts)
        cid = slug(ad)
        if cid in seen:
            errors.append(f"{path.name}:{no} tekrar eden kart: {ad}")
        seen.add(cid)
        if sev not in SEVIYE:
            errors.append(f"{path.name}:{no} seviye e/g/s olmalı: {sev}")
        if grup not in kat["gruplar"]:
            errors.append(f"{path.name}:{no} bilinmeyen grup '{grup}'")
        try:
            vals = [int(x) for x in puan.split(",")]
        except ValueError:
            errors.append(f"{path.name}:{no} puanlar sayı olmalı")
            continue
        if len(vals) != len(keys) or any(not 1 <= v <= 10 for v in vals):
            errors.append(f"{path.name}:{no} {len(keys)} adet 1-10 arası puan gerekli: {puan}")
            continue
        if not aciklama:
            errors.append(f"{path.name}:{no} açıklama boş")
        cards.append({
            "id": cid, "ad": ad, "seviye": SEVIYE.get(sev, sev), "grup": grup,
            "etiketler": [t for t in tags.split(",") if t],
            "aciklama": aciklama, "puan": dict(zip(keys, vals)),
        })
    counts = {s: sum(c["seviye"] == s for c in cards) for s in HEDEF}
    if counts != HEDEF:
        errors.append(f"{path.name}: seviye dağılımı {counts}, beklenen {HEDEF}")
    for g, n in kat.get("garanti", {}).items():
        if sum(c["grup"] == g for c in cards) < n + 1:
            errors.append(f"{path.name}: '{g}' grubunda garanti için yeterli kart yok")
    for s in kat["sinerjiler"]:
        if s["tip"] == "etiket" and sum(s["etiket"] in c["etiketler"] for c in cards) < s["en_az"]:
            errors.append(f"{path.name}: '{s['etiket']}' etiketli kart sayısı sinerji için az")
    return cards, errors


def main():
    out_dir = ROOT / "data" / "kartlar"
    out_dir.mkdir(parents=True, exist_ok=True)
    katalog, all_errors, total = [], [], 0
    for kat in KATEGORILER:
        assert abs(sum(w for _, w in kat["olcutler"]) - 1) < 1e-9, kat["id"]
        cards, errors = parse(kat)
        all_errors += errors
        olcutler = {olcut_key(a): {"ad": a, "agirlik": w} for a, w in kat["olcutler"]}
        meta = {
            "id": kat["id"], "ad": kat["ad"], "sablon": kat["sablon"], "gorev_mesaji": kat["gorev"],
            "olcutler": olcutler, "gruplar": kat["gruplar"], "sinerjiler": kat["sinerjiler"],
            "garanti": kat.get("garanti", {}), "hakem_notu": kat["hakem_notu"],
            "kart_sayisi": len(cards),
        }
        katalog.append(meta)
        (out_dir / f"{kat['id']}.json").write_text(
            json.dumps({**meta, "kartlar": cards}, ensure_ascii=False, indent=1), encoding="utf-8")
        total += len(cards)
    if all_errors:
        print("\n".join(all_errors))
        raise SystemExit(f"{len(all_errors)} hata bulundu.")
    (ROOT / "data" / "kategoriler.json").write_text(json.dumps(
        {"surum": 1, "butce": 20, "slot": 5, "cekilis": CEKILIS, "kategoriler": katalog},
        ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Tamam: {len(katalog)} kategori, {total} kart.")


if __name__ == "__main__":
    main()

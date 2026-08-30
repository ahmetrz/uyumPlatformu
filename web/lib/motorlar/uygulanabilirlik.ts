import 'server-only';
import { db } from '../db';

/* Uygulanabilirlik motoru (§5): santral profilinden kural bazlı kapsam kararı.
   Kural JSON'u: { herhangi?: Kosul[], hepsi?: Kosul[] }
   Kosul: { alan, islec: '='|'!='|'>='|'<='|'>'|'<', deger } */

type Kosul = { alan: string; islec: string; deger: unknown };
type Kural = { herhangi?: Kosul[]; hepsi?: Kosul[] };

/** Profil + tesis alanlarından kural değerlendirme bağlamı üretir. */
function baglamKur(tesis: { kuruluGucMw: number | null },
  profil: Record<string, unknown> | null): Record<string, unknown> {
  const p = profil ?? {};
  return {
    ...p,
    kuruluGucMw: tesis.kuruluGucMw,
    // türetilmiş alan: TEİAŞ SCADA/EMS bağlantısı seri OLMAYAN haberleşmeyle
    teiasScadaEmsSeriOlmayan:
      p['teiasScadaEms'] === true && p['seriHaberlesme'] !== true,
  };
}

function kosulSagla(baglam: Record<string, unknown>, k: Kosul): boolean | null {
  const deger = baglam[k.alan];
  if (deger === null || deger === undefined) return null; // BİLİNMİYOR — false değil
  switch (k.islec) {
    case '=': return deger === k.deger;
    case '!=': return deger !== k.deger;
    case '>=': return typeof deger === 'number' && deger >= (k.deger as number);
    case '<=': return typeof deger === 'number' && deger <= (k.deger as number);
    case '>': return typeof deger === 'number' && deger > (k.deger as number);
    case '<': return typeof deger === 'number' && deger < (k.deger as number);
    default: return null;
  }
}

export type KuralSonucu = {
  uygulanabilir: boolean | null; // null = profil eksik, karar verilemedi
  gerekce: string;
};

export function kuralDegerlendir(kuralJson: string, tesis: { kuruluGucMw: number | null },
  profil: Record<string, unknown> | null): KuralSonucu {
  const kural = JSON.parse(kuralJson) as Kural;
  const baglam = baglamKur(tesis, profil);
  const acikla = (k: Kosul, s: boolean | null) =>
    `${k.alan}${k.islec}${JSON.stringify(k.deger)}=${s === null ? 'bilinmiyor' : s ? 'sağlandı' : 'sağlanmadı'}`;

  if (kural.herhangi) {
    const sonuclar = kural.herhangi.map((k) => ({ k, s: kosulSagla(baglam, k) }));
    const saglanan = sonuclar.find((x) => x.s === true);
    if (saglanan) return { uygulanabilir: true, gerekce: `Koşul sağlandı: ${acikla(saglanan.k, true)}` };
    if (sonuclar.some((x) => x.s === null))
      return { uygulanabilir: null,
        gerekce: `Profil eksik — karar verilemedi: ${sonuclar.map((x) => acikla(x.k, x.s)).join('; ')}` };
    return { uygulanabilir: false,
      gerekce: `Hiçbir koşul sağlanmadı: ${sonuclar.map((x) => acikla(x.k, x.s)).join('; ')}` };
  }
  if (kural.hepsi) {
    const sonuclar = kural.hepsi.map((k) => ({ k, s: kosulSagla(baglam, k) }));
    if (sonuclar.every((x) => x.s === true))
      return { uygulanabilir: true, gerekce: `Tüm koşullar sağlandı` };
    if (sonuclar.some((x) => x.s === null))
      return { uygulanabilir: null,
        gerekce: `Profil eksik: ${sonuclar.map((x) => acikla(x.k, x.s)).join('; ')}` };
    return { uygulanabilir: false,
      gerekce: `Sağlanmayan koşul var: ${sonuclar.map((x) => acikla(x.k, x.s)).join('; ')}` };
  }
  return { uygulanabilir: null, gerekce: 'Kural boş' };
}

/** Bir tesis için tüm aktif kuralları çalıştırır; kararları upsert eder.
    El ile değiştirilmiş (override) kararlara DOKUNMAZ. */
export async function tesisKapsaminiHesapla(tesisId: string, aktorId?: string | null):
  Promise<{ hesaplanan: number; atlanianOverride: number }> {
  const tesis = await db.tesis.findUniqueOrThrow({
    where: { id: tesisId }, include: { profil: true } });
  const kurallar = await db.uygulanabilirlikKurali.findMany({ where: { aktif: true } });
  let hesaplanan = 0, atlanianOverride = 0;
  for (const kural of kurallar) {
    const mevcut = await db.uygulanabilirlikKarari.findUnique({
      where: { tesisId_regulasyonId: { tesisId, regulasyonId: kural.regulasyonId } } });
    if (mevcut?.elIleDegistirildi) { atlanianOverride++; continue; }
    const profilKaydi = tesis.profil
      ? JSON.parse(JSON.stringify(tesis.profil)) as Record<string, unknown> : null;
    const sonuc = kuralDegerlendir(kural.kosulJson, tesis, profilKaydi);
    if (sonuc.uygulanabilir === null && !mevcut) {
      // karar verilemiyor: kayıt açma; veri kalitesi bulgusu düş
      await db.veriKalitesiBulgusu.create({ data: {
        kural: 'eksik_profil', kaynakTipi: 'Tesis', kaynakId: tesisId,
        aciklama: `Uygulanabilirlik hesaplanamadı (${kural.ad}): ${sonuc.gerekce}` } });
      continue;
    }
    if (sonuc.uygulanabilir === null) continue;
    await db.uygulanabilirlikKarari.upsert({
      where: { tesisId_regulasyonId: { tesisId, regulasyonId: kural.regulasyonId } },
      update: { uygulanabilir: sonuc.uygulanabilir, gerekce: sonuc.gerekce,
        kuralId: kural.id, kuralSurumu: kural.surum, hesaplandi: new Date() },
      create: { tesisId, regulasyonId: kural.regulasyonId,
        uygulanabilir: sonuc.uygulanabilir, gerekce: sonuc.gerekce,
        kuralId: kural.id, kuralSurumu: kural.surum },
    });
    hesaplanan++;
    await db.aktiviteKaydi.create({ data: {
      aktorId: aktorId ?? null, varlikTipi: 'UygulanabilirlikKarari', varlikId: tesisId,
      eylem: 'guncelleme', alan: kural.ad,
      yeniDeger: sonuc.uygulanabilir ? 'kapsamda' : 'kapsam dışı',
      gerekce: sonuc.gerekce, kaynak: 'is_kosusu' } });
  }
  return { hesaplanan, atlanianOverride };
}

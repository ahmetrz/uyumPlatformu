import 'server-only';
import { db } from '../db';

/* Veri kalitesi motoru (§67): governance verisinin kendisi denetlenir.
   Kurallar:
   - sahipsiz_varlik      → kritik varlık ama sahibi yok
   - kritikligi_bilinmeyen → varlığın kritikliği değerlendirilmemiş
   - eksik_profil          → aktif tesisin profili yok (uygulanabilirlik kör)
   - envanteri_bos_tesis   → aktif tesisin envanterinde hiç varlık yok
   - sahipsiz_kanit        → kanıtın sahibi de yükleyeni de yok (tazelik sorumsuz)
   Açık aynı bulgu varsa yenisi üretilmez; koşul düzelmişse açık bulgu
   'cozuldu' yapılır. */

const KURALLAR = ['sahipsiz_varlik', 'kritikligi_bilinmeyen', 'eksik_profil',
  'envanteri_bos_tesis', 'sahipsiz_kanit'] as const;

type Ihlal = { kural: string; kaynakTipi: string; kaynakId: string; aciklama: string };
const anahtar = (x: { kural: string; kaynakTipi: string; kaynakId: string }) =>
  `${x.kural}|${x.kaynakTipi}|${x.kaynakId}`;

export async function veriKalitesiniIsle(): Promise<{ islenen: number; uretilen: number }> {
  const ihlaller: Ihlal[] = [];

  // sahipsiz kritik varlık + kritikliği bilinmeyen varlık
  const varliklar = await db.varlik.findMany({
    where: { silindi: null, OR: [
      { kritiklik: 'kritik', sahipId: null },
      { kritiklik: 'bilinmiyor' },
    ] },
    select: { id: true, etiket: true, ad: true, kritiklik: true, sahipId: true },
  });
  for (const v of varliklar) {
    if (v.kritiklik === 'kritik' && !v.sahipId)
      ihlaller.push({ kural: 'sahipsiz_varlik', kaynakTipi: 'Varlik', kaynakId: v.id,
        aciklama: `Kritik varlık ${v.etiket} (${v.ad}) sahipsiz — hesap verebilirlik zinciri kopuk.` });
    if (v.kritiklik === 'bilinmiyor')
      ihlaller.push({ kural: 'kritikligi_bilinmeyen', kaynakTipi: 'Varlik', kaynakId: v.id,
        aciklama: `${v.etiket} (${v.ad}) varlığının kritikliği değerlendirilmemiş.` });
  }

  // profili olmayan / envanteri boş aktif tesisler
  const tesisler = await db.tesis.findMany({
    where: { durum: 'aktif' },
    select: { id: true, kod: true, ad: true,
      profil: { select: { id: true } },
      _count: { select: { varliklar: { where: { silindi: null } } } } },
  });
  for (const t of tesisler) {
    if (!t.profil)
      ihlaller.push({ kural: 'eksik_profil', kaynakTipi: 'Tesis', kaynakId: t.id,
        aciklama: `${t.kod} (${t.ad}) aktif tesisin profili yok — uygulanabilirlik hesaplanamaz.` });
    if (t._count.varliklar === 0)
      ihlaller.push({ kural: 'envanteri_bos_tesis', kaynakTipi: 'Tesis', kaynakId: t.id,
        aciklama: `${t.kod} (${t.ad}) aktif tesisin envanterinde hiç varlık yok.` });
  }

  // sahipsiz kanıt (sahip de yükleyen de yoksa tazelik görevi kimseye atanamaz)
  const kanitlar = await db.kanit.findMany({
    where: { silindi: null, sahipId: null, yukleyenId: null },
    select: { id: true, ad: true },
  });
  for (const kn of kanitlar)
    ihlaller.push({ kural: 'sahipsiz_kanit', kaynakTipi: 'Kanit', kaynakId: kn.id,
      aciklama: `"${kn.ad}" kanıtının sahibi yok — yenileme sorumlusu belirsiz.` });

  // mevcut açık bulgularla karşılaştır
  const acikBulgular = await db.veriKalitesiBulgusu.findMany({
    where: { durum: 'acik', kural: { in: [...KURALLAR] } },
  });
  const acikKume = new Set(acikBulgular.map(anahtar));
  const ihlalKume = new Set(ihlaller.map(anahtar));

  let uretilen = 0;
  for (const i of ihlaller) {
    if (acikKume.has(anahtar(i))) continue; // açık aynı kayıt var — üretme
    await db.veriKalitesiBulgusu.create({ data: i });
    uretilen++;
  }
  for (const b of acikBulgular) {
    if (ihlalKume.has(anahtar(b))) continue;
    // koşul düzelmiş — açık bulguyu çöz
    await db.veriKalitesiBulgusu.update({ where: { id: b.id },
      data: { durum: 'cozuldu', kapanis: new Date() } });
  }

  return { islenen: ihlaller.length + acikBulgular.length, uretilen };
}

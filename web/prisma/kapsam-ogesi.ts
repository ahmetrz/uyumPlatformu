/* KAPSAM ÖĞESİ TOHUMU — B1 · B2 (göç `20260908180000_b1_b2_kapsam_ogesi`
   ile AYNI kimlikler ve AYNI satırlar; taze kurulumda tohum, yükseltmede
   göç yazar). `tests/kapsam-ogesi-gocu.test.ts` iki kaynağın aynı şeyi
   söylediğini sınar. */
import type { PrismaClient } from '../lib/prisma-client/client';
import { CEKIRDEK_KAPSAM_TURLERI } from '../lib/kapsam/oge';

/** Çekirdek türler — kimlik deterministik ('kot-<kod>'), göçle aynı. */
export async function kapsamTurleriniKur(db: PrismaClient) {
  const sonuc: Record<'tesis' | 'kurum', { id: string }> = { tesis: { id: '' }, kurum: { id: '' } };
  for (const t of Object.values(CEKIRDEK_KAPSAM_TURLERI)) {
    sonuc[t.kod] = await db.kapsamOgesiTuru.upsert({
      where: { kod: t.kod },
      update: {},
      create: { id: `kot-${t.kod}`, kod: t.kod, ad: t.ad, etiketAnahtari: t.etiketAnahtari,
        tesiseBagli: t.tesiseBagli, sira: t.sira },
    });
  }
  return sonuc;
}

/** Her tesis için bir kapsam öğesi: kod ve ad tesisinki, tür tipin
    varsayılanı (yoksa `tesis`), kimlik 'ko-<tesisId>' (göçle aynı). */
export async function tesislerdenOgeler(db: PrismaClient, tesisler: Record<string, { id: string }>) {
  const idler = Object.values(tesisler).map((t) => t.id);
  const kayitlar = await db.tesis.findMany({
    where: { id: { in: idler } },
    include: { tip: { select: { varsayilanKapsamTuruId: true } } } });
  const tesisTuru = await db.kapsamOgesiTuru.findUniqueOrThrow({ where: { kod: 'tesis' } });
  const ko: Record<string, { id: string }> = {};
  for (const t of kayitlar) {
    ko[t.kod] = await db.kapsamOgesi.upsert({
      where: { tesisId: t.id },
      update: {},
      create: { id: `ko-${t.id}`, kod: t.kod, ad: t.ad, tesisId: t.id,
        turId: t.tip?.varsayilanKapsamTuruId ?? tesisTuru.id,
        durum: t.durum === 'kapali' ? 'pasif' : 'aktif' },
    });
  }
  return ko;
}

/* ── B2 · ENERJİ PROFİL ÖZNİTELİKLERİ ─────────────────────────────────
   Bu sekiz anahtar enerji PAKETİNİN beyanıdır; çekirdek yalnız `rol`ü
   bilir (`kritiklik`). Göçteki `SektorOznitelikSemasi` satırlarıyla
   birebir. */
const KABUL_SECENEKLERI = JSON.stringify([
  { deger: 'lisans_oncesi', ad: 'Lisans öncesi' }, { deger: 'insaat', ad: 'İnşaat' },
  { deger: 'gecici_kabul', ad: 'Geçici kabul' }, { deger: 'kesin_kabul', ad: 'Kesin kabul' },
]);
const KRITIKLIK_SECENEKLERI = JSON.stringify([
  { deger: 'dusuk', ad: 'Düşük' }, { deger: 'orta', ad: 'Orta' },
  { deger: 'yuksek', ad: 'Yüksek' }, { deger: 'kritik', ad: 'Kritik' },
]);
const LISANS = 'Lisans ve kabul';
const SEBEKE = 'Şebeke ve haberleşme';
/* "Kritiklik ve maruziyet" ÇEKİRDEK grubun adıdır: aynı adı taşıyan sektör
   alanı o grubun sonuna girer (Tesis 360 `profilGruplari`). */
const KRITIKLIK = 'Kritiklik ve maruziyet';

export const ENERJI_PROFIL_OZNITELIKLERI = [
  { anahtar: 'lisansTipi', tip: 'metin', kuraldaKullanilir: false, sira: 110, rol: null, grup: LISANS, secenekler: null },
  { anahtar: 'lisansNo', tip: 'metin', kuraldaKullanilir: false, sira: 111, rol: null, grup: LISANS, secenekler: null },
  { anahtar: 'kabulDurumu', tip: 'metin', kuraldaKullanilir: false, sira: 112, rol: null, grup: LISANS, secenekler: KABUL_SECENEKLERI },
  { anahtar: 'kabulTarihi', tip: 'tarih', kuraldaKullanilir: false, sira: 113, rol: null, grup: LISANS, secenekler: null },
  { anahtar: 'blackStart', tip: 'mantik', kuraldaKullanilir: true, sira: 120, rol: null, grup: SEBEKE, secenekler: null },
  { anahtar: 'teiasScadaEms', tip: 'mantik', kuraldaKullanilir: true, sira: 121, rol: null, grup: SEBEKE, secenekler: null },
  { anahtar: 'seriHaberlesme', tip: 'mantik', kuraldaKullanilir: true, sira: 122, rol: null, grup: SEBEKE, secenekler: null },
  { anahtar: 'kritiklikSinifi', tip: 'metin', kuraldaKullanilir: true, sira: 130, rol: 'kritiklik', grup: KRITIKLIK, secenekler: KRITIKLIK_SECENEKLERI },
] as const;

/** "TEİAŞ SCADA/EMS var VE seri değil" — çekirdek TÜRETİLMİŞ alanı değil,
    kuralın kendi bileşimi (B2). Göç `UygulanabilirlikKurali.kosulJson`
    içindeki eski `teiasScadaEmsSeriOlmayan` koşulunu tam bu JSON ile
    değiştirir; tohum kuralı bununla yazar. */
export const TEIAS_SERI_OLMAYAN_KOSULU = { hepsi: [
  { alan: 'teiasScadaEms', islec: '=', deger: true },
  { alan: 'seriHaberlesme', islec: '!=', deger: true },
] } as const;

/* Şemayı veritabanına yazan tek el DEMO-TR-ENERJI paketidir (2.5,
   `paketler/DEMO-TR-ENERJI/oznitelikler.json`); yukarıdaki sabitler tohumun
   kiracı katmanı (`profiliAyir`) ve göç eşitliği testi içindir. Paket ile
   sabitlerin birebir olduğu `tests/paket-demo.test.ts` ile ölçülür. */

const ENERJI_ANAHTARLARI = new Set<string>(ENERJI_PROFIL_OZNITELIKLERI.map((o) => o.anahtar));
const TIP: Record<string, string> = Object.fromEntries(ENERJI_PROFIL_OZNITELIKLERI.map((o) => [o.anahtar, o.tip]));

/** Tohumun profil nesnesini ikiye ayırır: enerji alanları öznitelik
    satırı olur (mantık → 0/1 sayısal, metin/tarih → metin), kalanlar
    OT profil kolonudur. Değeri olmayan alan satır AÇMAZ. */
export function profiliAyir(profil: Record<string, unknown>) {
  const ozellikler: { anahtar: string; sayisalDeger?: number; metinDeger?: string }[] = [];
  const kalan: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(profil)) {
    if (!ENERJI_ANAHTARLARI.has(k)) { kalan[k] = v; continue; }
    if (v === null || v === undefined) continue;
    if (TIP[k] === 'mantik') ozellikler.push({ anahtar: k, sayisalDeger: v ? 1 : 0 });
    else if (v instanceof Date) ozellikler.push({ anahtar: k, metinDeger: v.toISOString() });
    else ozellikler.push({ anahtar: k, metinDeger: String(v) });
  }
  return { ozellikler, kalan };
}

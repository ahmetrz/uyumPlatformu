import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CSV_BASLIK, SOZLUK_SATIRI, cerceve, paketYaz, type PaketDosyalari } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · 2.1 — SÖZLÜK VE ÖZNİTELİK ŞEMASINDA `aktif` BAYRAĞI (URN-PKT-011)

   Paket yükseltmesinin bıraktığı sözlük ve öznitelik satırı silinmez
   (R-C — altında kiracı değeri olabilir) ama PASİFLEŞİR; pasif satır hiçbir
   okuyucuya inmez: sözlük okuyucu, rol anahtarı, Tesis 360 profili, profil
   kaydı, portföy ölçüsü. Kaldırma paketin tüm satırlarını pasifler, aynı
   içerikle geri kurulum aktifler.

   Yetki kapısı SAHTELENMEZ — yalnız `aktifKullanici` değiştirilir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-aktif-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

type Yetki = {
  rol: string; surecId: string | null; kapsamOgesiId: string | null; tesisId: string | null;
  tuzelKisiId: string | null; regulasyonId: string | null; modul: string | null;
};
const oturum = {
  id: '', adSoyad: 'Test Kullanıcısı', eposta: 'aktif@test', unvan: null as string | null,
  yetkiler: [{ rol: 'yonetici', surecId: null, kapsamOgesiId: null, tesisId: null, tuzelKisiId: null, regulasyonId: null, modul: null }] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const { db } = await import('@/lib/db');
const { paketiKaldir, paketiKur } = await import('@/lib/paket/kur');
const { oznitelikEtiketleri } = await import('@/lib/dil/sozlukOku');
const { rolAnahtari } = await import('@/lib/kapsam/rol');
const { tesis360Verisi } = await import('@/app/(kabuk)/(flagship)/tesisler/[id]/veri');
const { portfoyEkranVerisi } = await import('@/app/(tam)/portfoy/veri');
const { profilKaydet } = await import('@/lib/eylemler2/tesis360');

let kuranId = '';
beforeAll(async () => {
  const k = await db.kullanici.findFirstOrThrow({
    where: { aktif: true, yetkiler: { some: { rol: 'yonetici', kapsamOgesiId: null } } },
    include: { yetkiler: { include: { kapsamOgesi: { select: { tesisId: true } } } } },
  });
  kuranId = k.id;
  oturum.id = k.id; oturum.eposta = k.eposta; oturum.adSoyad = k.adSoyad; oturum.unvan = k.unvan;
  oturum.yetkiler = k.yetkiler.map((y) => ({
    rol: y.rol, surecId: y.surecId, kapsamOgesiId: y.kapsamOgesiId, tesisId: y.kapsamOgesi?.tesisId ?? null,
    tuzelKisiId: y.tuzelKisiId, regulasyonId: y.regulasyonId, modul: y.modul,
  }));
});

const kur = (dosyalar: PaketDosyalari, manifest: Record<string, unknown>) =>
  paketiKur(paketYaz(dosyalar, manifest), { kuranId, istemci: db });

const OZ_A = { anahtar: 'aktOzA', tip: 'sayi', birim: 'adet', etiketAnahtari: 'aktOzA', rol: 'kapasite', grup: null, secenekler: null, kuraldaKullanilir: false, sira: 1 };
const OZ_B = { anahtar: 'aktOzB', tip: 'metin', birim: null, etiketAnahtari: 'aktOzB', rol: 'kritiklik', grup: null, secenekler: null, kuraldaKullanilir: false, sira: 2 };
const CERCEVE = { 'cerceve/AKT-REG.json': cerceve('AKT-REG', { tur: 'kamuya_acik', metinDahil: false }), 'cerceve/AKT-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n` };
const v1: PaketDosyalari = { 'sozluk.json': [SOZLUK_SATIRI('tesis', 'istasyon'), SOZLUK_SATIRI('aktOzA', 'kapasite ölçüsü'), SOZLUK_SATIRI('aktOzB', 'kritiklik sınıfı')], 'oznitelikler.json': [OZ_A, OZ_B], ...CERCEVE };
const v2: PaketDosyalari = { 'sozluk.json': [SOZLUK_SATIRI('tesis', 'istasyon'), SOZLUK_SATIRI('aktOzA', 'kapasite ölçüsü')], 'oznitelikler.json': [OZ_A], ...CERCEVE };
const manifest = { kod: 'AKTIF-PAKET', sektor: { kod: 'AKTIF-SEKTOR', ad: 'Aktif' } };

describe('sözlük ve öznitelik pasifleşir, silinmez; okuyucular görmez [URN-PKT-011]', () => {
  it('v2 bir sözlük satırını ve bir özniteliği bırakır: satır aktif=false, sözlük okuyucu ve rol anahtarı görmez [URN-PKT-011]', async () => {
    const a = await kur(v1, { ...manifest, surum: '0.1.0' });
    expect(a.ok, JSON.stringify(a)).toBe(true);
    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'AKTIF-SEKTOR' } });
    expect(await oznitelikEtiketleri(sektor.id)).toMatchObject({ aktOzA: 'kapasite ölçüsü', aktOzB: 'kritiklik sınıfı' });
    expect(await rolAnahtari(sektor.id, 'kritiklik')).toBe('aktOzB');

    const b = await kur(v2, { ...manifest, surum: '0.2.0' });
    expect(b.ok, JSON.stringify(b)).toBe(true);
    if (!b.ok) return;
    expect(b.rapor.pasiflestirilen).toMatchObject({ sozluk: 1, oznitelikler: 1 });
    expect(b.rapor.pasifAnahtarlar).toEqual({ sozluk: ['aktOzB@tr'], oznitelikler: ['aktOzB'] });
    // satır yerinde, pasif
    expect(await db.sektorSozlugu.findUnique({ where: { sektorId_anahtar_dil: { sektorId: sektor.id, anahtar: 'aktOzB', dil: 'tr' } } })).toMatchObject({ aktif: false });
    expect(await db.sektorOznitelikSemasi.findUnique({ where: { sektorId_anahtar: { sektorId: sektor.id, anahtar: 'aktOzB' } } })).toMatchObject({ aktif: false });
    // okuyucular görmez — önbellek istek başına; burada her çağrı yeni
    const etiketler = await oznitelikEtiketleri(sektor.id);
    expect(etiketler).toMatchObject({ aktOzA: 'kapasite ölçüsü' });
    expect(etiketler).not.toHaveProperty('aktOzB');
    expect(await rolAnahtari(sektor.id, 'kritiklik')).toBeNull();
    expect(await rolAnahtari(sektor.id, 'kapasite')).toBe('aktOzA');
  });

  it('kaldırma paketin sözlük ve özniteliklerini pasifler; aynı içerikle geri kurulum aktifler (bırakılan yine pasif) [URN-PKT-011]', async () => {
    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'AKTIF-SEKTOR' } });
    const k = await paketiKaldir('AKTIF-PAKET', db);
    expect(k.ok, JSON.stringify(k)).toBe(true);
    // kaldırma paketin TÜM satırlarına dokunur (zaten pasif olan aktOzB dâhil): sözlük 3, öznitelik 2
    if (k.ok) expect(k.arsivlenen).toMatchObject({ sozluk: 3, oznitelikler: 2 });
    expect(await db.sektorSozlugu.count({ where: { sektorId: sektor.id, aktif: true } })).toBe(0);
    expect(await db.sektorOznitelikSemasi.count({ where: { sektorId: sektor.id, aktif: true } })).toBe(0);
    expect(await oznitelikEtiketleri(sektor.id)).toEqual({});
    const g = await kur(v2, { ...manifest, surum: '0.2.0' });
    expect(g.ok, JSON.stringify(g)).toBe(true);
    expect(await db.sektorSozlugu.findMany({ where: { sektorId: sektor.id, aktif: true }, select: { anahtar: true }, orderBy: { anahtar: 'asc' } }))
      .toEqual([{ anahtar: 'aktOzA' }, { anahtar: 'tesis' }]);
    expect(await db.sektorOznitelikSemasi.findMany({ where: { sektorId: sektor.id, aktif: true }, select: { anahtar: true } })).toEqual([{ anahtar: 'aktOzA' }]);
    expect(await db.sektorOznitelikSemasi.count({ where: { sektorId: sektor.id } })).toBe(2);
  });
});

describe('Tesis 360, profil kaydı ve portföy pasif satırı görmez [URN-PKT-011]', () => {
  it('pasif öznitelik Tesis 360 profilinde çizilmez ve profil kaydı onu "bilinmeyen öznitelik" sayar; aktifleşince geri gelir [URN-PKT-011]', async () => {
    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'ELEKTRIK-URETIM' } });
    const tesis = await db.tesis.findFirstOrThrow({ where: { tip: { sektorId: sektor.id }, durum: { not: 'kapali' } }, select: { id: true } });
    const satir = await db.sektorOznitelikSemasi.findUniqueOrThrow({ where: { sektorId_anahtar: { sektorId: sektor.id, anahtar: 'lisansNo' } } });
    const alanlar = async () => (await tesis360Verisi(oturum, tesis.id))!.veri.sektorProfili.alanlar.map((a) => a.anahtar);
    expect(await alanlar()).toContain('lisansNo');
    // paket yükseltmesinin yaptığı şey: satır pasif (silinmez)
    await db.sektorOznitelikSemasi.update({ where: { id: satir.id }, data: { aktif: false } });
    expect(await alanlar()).not.toContain('lisansNo');
    const s = await profilKaydet({ tesisId: tesis.id, oznitelikler: { lisansNo: 'LIS-9' } });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/Bilinmeyen öznitelik: lisansNo/);
    await db.sektorOznitelikSemasi.update({ where: { id: satir.id }, data: { aktif: true } });
    expect(await alanlar()).toContain('lisansNo');
  });

  it('portföy ölçüyü rolü kapasite olan AKTİF satırdan okur — enerji satırlarında güç dolu; kapasite satırı pasifse ölçülmedi [URN-PKT-011]', async () => {
    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'ELEKTRIK-URETIM' } });
    const enerji = (await portfoyEkranVerisi(oturum)).satirlar.filter((s) => s.sektorId === sektor.id);
    expect(enerji.length).toBeGreaterThan(0);
    expect(enerji.filter((s) => s.guc !== null).length, 'ölçüldü: süzgeçsiz okuma son satırı (kritiklikSinifi) ölçü sanıyordu').toBeGreaterThan(0);
    const kapasite = await db.sektorOznitelikSemasi.findUniqueOrThrow({ where: { sektorId_anahtar: { sektorId: sektor.id, anahtar: 'kuruluGuc' } } });
    await db.sektorOznitelikSemasi.update({ where: { id: kapasite.id }, data: { aktif: false } });
    /* Kapasite satırı pasifse şema ölçü BEYAN ETMİYOR demektir; çekirdek eski
       sabite (KURULU_GUC) düşer — satır adı aynı olduğu için değer yine okunur.
       Ölçülen: düşüş anahtarı şema anahtarıyla aynı, davranış değişmez. */
    const sonra = (await portfoyEkranVerisi(oturum)).satirlar.filter((s) => s.sektorId === sektor.id);
    expect(sonra.filter((s) => s.guc !== null).length).toBe(enerji.filter((s) => s.guc !== null).length);
    await db.sektorOznitelikSemasi.update({ where: { id: kapasite.id }, data: { aktif: true } });
  });
});

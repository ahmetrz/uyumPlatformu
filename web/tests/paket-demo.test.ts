import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ENERJI_OZNITELIK_ETIKETLERI, ENERJI_SOZLUGU, SU_SOZLUGU } from '../prisma/sozlukler';
import { ENERJI_PROFIL_OZNITELIKLERI } from '../prisma/kapsam-ogesi';
import { MADDE_ALANLARI } from '../prisma/seed-madde-alanlari';
import { TELIFLI_METIN } from '@/lib/paket/bicim';
import { hataSatiri, ozetleriHesapla, paketiDogrula } from '@/lib/paket/dogrula';
import { CSV_BASLIK, SOZLUK_SATIRI, cerceve, paketYaz } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · 2.5 — DEMO TOHUMU PAKET BİÇİMİNDE (URN-PKT-015)

   Tohumun sözlüğü, öznitelik şeması, çerçeveleri ve denklikleri
   `paketler/DEMO-TR-*` dizinlerinde durur; `prisma/seed.ts` onları
   `paketiKur` ile kurar ve ilk sürümleri aktif yapar. Bu dosya üç şeyi
   ölçer: (1) paketler doğrulayıcıdan geçer ve sabitlerle birebirdir —
   tek doğruluk kaynağı paket; (2) ÖLÇÜLEN KAYIP: ISO 27001 telifli, dört
   maddenin kısa açıklama metni düştü, kanıt tipi korundu; (3) tohumlanmış
   veritabanı paket kökenli ve aktif sürümlüdür.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const P = (kod: string) => path.join(KOK, 'paketler', kod);
const ORTAK = paketiDogrula(P('DEMO-TR-ORTAK'));
const ENERJI = paketiDogrula(P('DEMO-TR-ENERJI'));
const SU = paketiDogrula(P('DEMO-TR-SU'));
const KANIT_BEKLENTISI = 'Yürürlükteki konfigürasyon veya test kaydı; en fazla 180 gün eski.';

describe('demo paketleri doğrulayıcıdan geçer ve tohum sabitleriyle birebir [URN-PKT-015]', () => {
  it('DEMO-TR-ORTAK · DEMO-TR-ENERJI · DEMO-TR-SU: 0 hata, sayılar, özetler dosyalarla eşit, bağımlılık ortak pakete [URN-PKT-015]', () => {
    for (const [kod, s] of [['DEMO-TR-ORTAK', ORTAK], ['DEMO-TR-ENERJI', ENERJI], ['DEMO-TR-SU', SU]] as const) {
      expect(s.hatalar.map(hataSatiri), kod).toEqual([]);
      expect(s.icerik!.manifest.icerikOzetleri, kod).toEqual(ozetleriHesapla(P(kod)));
    }
    expect(ORTAK.sayilar).toMatchObject({ sozluk: 0, oznitelikler: 0, cerceveler: 3, maddeler: 11, eslemeler: 2 });
    expect(ENERJI.sayilar).toMatchObject({ sozluk: 13, oznitelikler: 9, cerceveler: 1, maddeler: 27, eslemeler: 6 });
    expect(SU.sayilar).toMatchObject({ sozluk: 5, oznitelikler: 1, cerceveler: 0, eslemeler: 0 });
    expect(ORTAK.icerik!.manifest).toMatchObject({ tur: 'yatay', sektor: null, bagimliliklar: [] });
    expect(ENERJI.icerik!.manifest).toMatchObject({ tur: 'demo', sektor: { kod: 'ELEKTRIK-URETIM' }, bagimliliklar: ['DEMO-TR-ORTAK'] });
    expect(SU.icerik!.manifest).toMatchObject({ tur: 'demo', sektor: { kod: 'SU-ARITMA' }, bagimliliklar: ['DEMO-TR-ORTAK'] });
  });

  it('sözlük ve öznitelik şeması tohum sabitleriyle birebir: enerji 13 + 9, su 5 + 1 — sabit ile paket ayrışamaz [URN-PKT-015]', () => {
    const e = ENERJI.icerik!;
    const tohumSozluk = [...ENERJI_SOZLUGU, ...ENERJI_OZNITELIK_ETIKETLERI];
    expect(e.sozluk.map((r) => r.anahtar)).toEqual(tohumSozluk.map((r) => r.anahtar));
    for (const r of tohumSozluk) {
      expect(e.sozluk.find((x) => x.anahtar === r.anahtar), r.anahtar).toMatchObject({ dil: 'tr',
        tekil: r.tekil, cogul: r.cogul, iyelik: r.iyelik, belirtme: r.belirtme, bulunma: r.bulunma, yonelme: r.yonelme });
    }
    expect(e.oznitelikler[0]).toMatchObject({ anahtar: 'kuruluGuc', tip: 'sayi', birim: 'MW', rol: 'kapasite', etiketAnahtari: 'kapasite', kuraldaKullanilir: true });
    expect(e.oznitelikler.slice(1).map((o) => o.anahtar)).toEqual(ENERJI_PROFIL_OZNITELIKLERI.map((o) => o.anahtar));
    for (const o of ENERJI_PROFIL_OZNITELIKLERI) {
      const p = e.oznitelikler.find((x) => x.anahtar === o.anahtar);
      expect(p, o.anahtar).toMatchObject({ tip: o.tip, rol: o.rol, grup: o.grup, kuraldaKullanilir: o.kuraldaKullanilir, sira: o.sira, etiketAnahtari: o.anahtar });
      expect(p?.secenekler ?? null).toEqual(o.secenekler ? JSON.parse(o.secenekler) : null);
    }
    const s = SU.icerik!;
    expect(s.sozluk.map((r) => r.anahtar)).toEqual(SU_SOZLUGU.map((r) => r.anahtar));
    for (const r of SU_SOZLUGU) expect(s.sozluk.find((x) => x.anahtar === r.anahtar), r.anahtar).toMatchObject({ tekil: r.tekil, yonelme: r.yonelme });
    expect(s.oznitelikler).toEqual([{ anahtar: 'gunlukDebi', tip: 'sayi', birim: 'm³/gün', etiketAnahtari: 'kapasite', rol: 'kapasite', grup: null, secenekler: null, kuraldaKullanilir: true, sira: 0 }]);
  });

  it('ÖLÇÜLEN KAYIP: ISO 27001 telifli — 4 madde metinsiz, kanıt tipi korunur; CBDDÖ/SPK/EPDK metinli; EPDK 27 madde, 15 kanıt tipi, 6 kanıt beklentisi [URN-PKT-015]', () => {
    const o = ORTAK.icerik!;
    const iso = o.cerceveler.find((c) => c.kimlik.kod === 'ISO-27001')!;
    expect(iso.kimlik.lisans).toMatchObject({ tur: 'telifli', metinDahil: false });
    expect(iso.maddeler.map((m) => [m.kod, m.metin, m.kanitTipi])).toEqual([
      ['A.5.9', null, 'kayit'], ['A.8.9', null, 'konfigurasyon'], ['A.8.16', null, 'kayit'], ['A.5.24', null, 'politika'],
    ]);
    for (const kod of ['CBDDO', 'SPK-BS']) {
      const c = o.cerceveler.find((x) => x.kimlik.kod === kod)!;
      expect(c.kimlik.lisans).toMatchObject({ tur: 'kamuya_acik', metinDahil: true });
      expect(c.maddeler.every((m) => m.metin && m.kanitTipi), kod).toBe(true);
    }
    expect(o.cerceveler.map((c) => [c.kimlik.kod, c.kimlik.surumEtiketi])).toEqual([['CBDDO', '2.0'], ['ISO-27001', '2022'], ['SPK-BS', 'VII-128.9']]);
    const epdk = ENERJI.icerik!.cerceveler[0];
    expect(epdk.kimlik).toMatchObject({ kod: 'EPDK-SYM', surumEtiketi: '2024', lisans: { tur: 'kamuya_acik', metinDahil: true } });
    expect(epdk.maddeler).toHaveLength(27);
    expect(epdk.maddeler.every((m) => m.metin)).toBe(true);
    expect(epdk.maddeler.filter((m) => m.kanitTipi)).toHaveLength(15);
    expect(epdk.maddeler.filter((m) => m.kanitBeklentisi === KANIT_BEKLENTISI).map((m) => m.kod)).toEqual(['6.1.1', '6.1.2', '6.2.1', '8.1.1', '8.1.2', '8.2.1']);
    expect(epdk.maddeler.find((m) => m.kod === '8.1.2')).toMatchObject({ ustKod: '8.1', kanitTipi: 'test_kaydi', zorunlulukTipi: 'REGULATION', sira: 8102 });
    expect(epdk.maddeler.map((m) => m.kod.split('.')[0]).filter((k, i, a) => a.indexOf(k) === i)).toEqual(['4', '5', '6', '7', '8']);
  });

  it('denklikler: ortak 2 + enerji 6 = tohumun 8 elle denkliği; ISO hedefli eşlemede açıklama yok [URN-PKT-015]', () => {
    const satirlar = [...ORTAK.icerik!.eslemeler, ...ENERJI.icerik!.eslemeler].flatMap((e) => e.satirlar.map((s) => `${e.kimlik.kaynak.cerceve}-${s.kaynakKod}→${e.kimlik.hedef.cerceve}-${s.hedefKod}:${s.denklik}`));
    expect(satirlar.sort()).toEqual([
      'CBDDO-4.1→SPK-BS-11:ilgili', 'EPDK-SYM-4.1.1→ISO-27001-A.5.9:kismi', 'EPDK-SYM-4.2.1→CBDDO-3.1:kismi', 'EPDK-SYM-5.1.2→CBDDO-4.2:kismi',
      'EPDK-SYM-5.1.2→SPK-BS-14:ilgili', 'EPDK-SYM-7.1.4→ISO-27001-A.8.16:kismi', 'EPDK-SYM-7.2→ISO-27001-A.5.24:tam', 'ISO-27001-A.8.9→CBDDO-3.2:kismi',
    ]);
    expect([...ORTAK.icerik!.eslemeler, ...ENERJI.icerik!.eslemeler].every((e) => e.satirlar.every((s) => s.aciklama === null))).toBe(true);
  });

  it('tohumun kiracı katmanı (madde → BT/OT alanı) paketlerin 38 maddesini kapsar — fazlası, eksiği yok [URN-PKT-015]', () => {
    const kodlar = [...ORTAK.icerik!.cerceveler, ...ENERJI.icerik!.cerceveler].flatMap((c) => c.maddeler.map((m) => `${c.kimlik.kod}-${m.kod}`));
    expect(Object.keys(MADDE_ALANLARI).sort()).toEqual([...kodlar].sort());
    expect(Object.values(MADDE_ALANLARI).every((a) => a.length >= 1 && a.every((x) => x === 'BT' || x === 'OT'))).toBe(true);
  });
});

describe('tohumlanmış veritabanı: demo paketleri kurulu, içerik paket kökenli, sürümler aktif [URN-PKT-015]', () => {
  const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-demo-'));
  const testDb = path.join(dizin, 'test.db');
  copyFileSync('prisma/dev.db', testDb);
  process.env.TEST_DB = testDb;

  it('üç paket kurulu; sözlük 18 · öznitelik 10 · regülasyon 4 · eşleme 8 paket kökenli ve aktif; 4 çerçeve sürümü aktif, taslak yok; her madde sürümlü; ISO maddesi TELIFLI_METIN; kanıt tipi ve BT/OT bağı yerinde [URN-PKT-015]', async () => {
    const { db } = await import('@/lib/db');
    expect((await db.icerikPaketi.findMany({ where: { durum: 'kurulu' }, select: { kod: true } })).map((p) => p.kod).sort()).toEqual(['DEMO-TR-ENERJI', 'DEMO-TR-ORTAK', 'DEMO-TR-SU']);
    expect(await db.sektorSozlugu.count()).toBe(18);
    expect(await db.sektorSozlugu.count({ where: { koken: 'paket', aktif: true } })).toBe(18);
    expect(await db.sektorOznitelikSemasi.count()).toBe(10);
    expect(await db.sektorOznitelikSemasi.count({ where: { koken: 'paket', aktif: true } })).toBe(10);
    const regler = await db.regulasyon.findMany({ select: { kod: true, surum: true, koken: true, lisansTuru: true, yururlukTarih: true }, orderBy: { kod: 'asc' } });
    const yururluk = new Date('2024-09-19T00:00:00Z');
    expect(regler).toEqual([
      { kod: 'CBDDO', surum: '2.0', koken: 'paket', lisansTuru: 'kamuya_acik', yururlukTarih: yururluk }, { kod: 'EPDK-SYM', surum: '2024', koken: 'paket', lisansTuru: 'kamuya_acik', yururlukTarih: yururluk },
      { kod: 'ISO-27001', surum: '2022', koken: 'paket', lisansTuru: 'telifli', yururlukTarih: yururluk }, { kod: 'SPK-BS', surum: 'VII-128.9', koken: 'paket', lisansTuru: 'kamuya_acik', yururlukTarih: yururluk },
    ]);
    expect(await db.frameworkSurumu.count({ where: { durum: 'aktif', koken: 'paket' } })).toBe(4);
    expect(await db.frameworkSurumu.count({ where: { durum: { not: 'aktif' } } })).toBe(0);
    const maddeler = await db.madde.findMany({ where: { regulasyon: { kod: { in: ['CBDDO', 'EPDK-SYM', 'ISO-27001', 'SPK-BS'] } } }, select: { kod: true, metin: true, kanitTipi: true, surumId: true, alanlar: { select: { alan: { select: { kod: true } } } } } });
    expect(maddeler).toHaveLength(38);
    expect(maddeler.filter((m) => m.surumId === null)).toEqual([]);
    expect(maddeler.filter((m) => m.kod.startsWith('ISO-27001-')).map((m) => m.metin)).toEqual([TELIFLI_METIN, TELIFLI_METIN, TELIFLI_METIN, TELIFLI_METIN]);
    expect(maddeler.find((m) => m.kod === 'EPDK-SYM-8.1.2')).toMatchObject({ kanitTipi: 'test_kaydi' });
    expect(maddeler.find((m) => m.kod === 'EPDK-SYM-4.2.1')!.alanlar.map((a) => a.alan.kod)).toEqual(['OT']);
    expect(maddeler.find((m) => m.kod === 'EPDK-SYM-4.1.1')!.alanlar.map((a) => a.alan.kod).sort()).toEqual(['BT', 'OT']);
    expect(maddeler.every((m) => m.alanlar.length >= 1)).toBe(true);
    expect(await db.maddeEslestirmesi.count({ where: { koken: 'paket', aktif: true } })).toBe(8);
    expect(await db.maddeEslestirmesi.count({ where: { koken: 'kiraci' } })).toBe(0);
    // kiracı katmanı: aile adı ve süreç durumları yerinde
    expect((await db.madde.findUniqueOrThrow({ where: { id: (await db.madde.findFirstOrThrow({ where: { kod: 'EPDK-SYM-6.1.1' } })).id } })).alanAdi).toBe('Ağ ve Sistem Güvenliği');
    expect(await db.maddeDurumu.count({ where: { madde: { kod: { startsWith: 'EPDK-SYM-6' } } } })).toBeGreaterThan(0);
  });

  it('kanit_tipi sütunu: kod olmayan değer BIÇIM; kurulumda Madde.kanitTipi, Regulasyon.surum ve yururlukTarih paket kimliğinden yazılır [URN-PKT-015]', async () => {
    const { db } = await import('@/lib/db');
    const { paketiKur } = await import('@/lib/paket/kur');
    const BASLIK = `${CSV_BASLIK};kanit_beklentisi;dis_kontrol_id;kanit_tipi`;
    const dosyalar = (kanitTipi: string) => ({
      'sozluk.json': [SOZLUK_SATIRI('tesis', 'şube')],
      'cerceve/KT-REG.json': cerceve('KT-REG', { tur: 'kamuya_acik', metinDahil: false }, { yururlukTarih: '2025-01-15' }),
      'cerceve/KT-REG.csv': `${BASLIK}\n1;;Amaç;;0;;;;;${kanitTipi}\n`,
    });
    const manifest = { kod: 'KT-PAKET', sektor: { kod: 'KT-SEKTOR', ad: 'Kanıt tipi' } };
    const bozuk = paketiDogrula(paketYaz(dosyalar('Kayıt tipi'), manifest));
    expect(bozuk.hatalar.map((h) => `${h.sinif}|${h.dosya}|${h.konum}`)).toEqual(['BIÇIM|cerceve/KT-REG.csv|2']);
    expect(paketiDogrula(paketYaz(dosyalar('kayit'), manifest)).icerik!.cerceveler[0].maddeler[0].kanitTipi).toBe('kayit');
    const kuranId = (await db.kullanici.findFirstOrThrow({ where: { aktif: true } })).id;
    const s = await paketiKur(paketYaz(dosyalar('kayit'), manifest), { kuranId, istemci: db });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    expect(await db.madde.findFirstOrThrow({ where: { kod: 'KT-REG-1' } })).toMatchObject({ kanitTipi: 'kayit' });
    expect(await db.regulasyon.findUniqueOrThrow({ where: { kod: 'KT-REG' } })).toMatchObject({ surum: 'test-1', yururlukTarih: new Date('2025-01-15T00:00:00Z'), koken: 'paket' });
  });
});

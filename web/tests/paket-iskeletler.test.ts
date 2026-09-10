import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ENERJI_OZNITELIK_ETIKETLERI, ENERJI_SOZLUGU } from '../prisma/sozlukler';
import { ENERJI_PROFIL_OZNITELIKLERI } from '../prisma/kapsam-ogesi';
import { csvAyristir } from '@/lib/paket/bicim';
import { hataSatiri, ozetleriHesapla, paketiDogrula } from '@/lib/paket/dogrula';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · İSKELET PAKETLER — TR-ENERJI · TR-BANKACILIK (URN-PKT-005)

   İskelet yalnız YAPI taşır: sözlük, kapsam öğesi türü, öznitelik şeması,
   çerçeve kimliği ve madde ağacı (kod · üst · başlık · seviye). Madde
   metni BİLEREK yok — metin aktarımı içerik işidir ve bu turda değil.
   Bu test iki şeyi kanıtlar: (1) iki iskelet doğrulayıcıdan geçer ve
   özetleri dosyalarla eşittir; (2) taze veritabanına kurulunca çerçeveler
   TASLAK gelir, madde sayısı CSV satır sayısına eşittir.

   4.6 ÖLÇÜMÜ (tohum → paket taşınabilirliği): TR-ENERJI'nin sözlüğü ve
   öznitelikleri tohum sabitleriyle BİREBİR aynıdır — yani tohumun bu
   parçası paket biçimine kayıpsız taşınır; aynı DB'ye kurulunca her satır
   "kiracı satırı var" çelişkisi verir (tohum satırı koken=kiraci) ve
   dokunulmaz — ezmeme kuralı gerçek veriyle ölçülür.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const ENERJI = path.join(KOK, 'paketler', 'TR-ENERJI');
const BANKA = path.join(KOK, 'paketler', 'TR-BANKACILIK');

const csvSatirlari = (yol: string) => csvAyristir(readFileSync(yol, 'utf8')).satirlar;

describe('iskelet paketler doğrulayıcıdan geçer [URN-PKT-005]', () => {
  it('TR-ENERJI: 0 hata; sayılar; özetler dosyalarla eşit', () => {
    const s = paketiDogrula(ENERJI);
    expect(s.hatalar.map(hataSatiri)).toEqual([]);
    expect(s.sayilar).toMatchObject({ sozluk: 17, kapsamTurleri: 1, oznitelikler: 12, cerceveler: 8, maddeler: 3803, yukumlulukler: 5, roller: 2, kurallar: 8 });
    expect(s.icerik!.manifest.icerikOzetleri).toEqual(ozetleriHesapla(ENERJI));
  });

  it('TR-BANKACILIK: 0 hata; sayılar; özetler dosyalarla eşit', () => {
    const s = paketiDogrula(BANKA);
    expect(s.hatalar.map(hataSatiri)).toEqual([]);
    expect(s.sayilar).toMatchObject({ sozluk: 15, kapsamTurleri: 4, oznitelikler: 7, cerceveler: 1, maddeler: 58, yukumlulukler: 0, roller: 3 });
    expect(s.icerik!.manifest.icerikOzetleri).toEqual(ozetleriHesapla(BANKA));
  });

  it('TR-BANKACILIK hâlâ İSKELET: hiçbir maddede metin yok, metinDahil=false [URN-PKT-005]', () => {
    /* TR-ENERJI 9 Eyl 2026'da içerik aldı (0.2.0) ve artık bu kuralın dışında:
       iskelet ölçüsü BANKACILIK'ta durur; enerji tarafı köken kuralıyla ölçülür
       (aşağıdaki vaka ve `tests/paket-icerik.test.ts`). */
    const s = paketiDogrula(BANKA);
    for (const c of s.icerik!.cerceveler) {
      expect(c.kimlik.lisans).toMatchObject({ tur: 'kamuya_acik', metinDahil: false });
      expect(c.maddeler.filter((m) => m.metin !== null), `${c.kimlik.kod}: metin taşıyan madde`).toEqual([]);
    }
  });

  it('TR-ENERJI artık içerikli: iki çerçeve de metin taşır ve her metinli madde KÖKEN taşır [URN-PKT-019]', () => {
    const s = paketiDogrula(ENERJI);
    for (const c of s.icerik!.cerceveler) {
      expect(c.kimlik.lisans, c.kimlik.kod).toMatchObject({ tur: 'kamuya_acik', metinDahil: true });
      expect(c.kimlik.kaynakUrl, `${c.kimlik.kod}: kaynak adresi yok`).toMatch(/^https:\/\//);
      const metinli = c.maddeler.filter((m) => m.metin !== null);
      expect(metinli.length, `${c.kimlik.kod}: metin taşıyan madde yok`).toBeGreaterThan(0);
      expect(metinli.filter((m) => !m.kaynakUrl || !m.erisimTarihi), `${c.kimlik.kod}: kökensiz metin`).toEqual([]);
    }
  });

  it('EPDK-SGYM yapısı: 4 bölüm + 18 madde + 1 geçici, başlıklar birincil dosyadan; Ek-3: 13 aile + 565 kontrol, kademe Seviye 1–3/Ek Kontrol [URN-PKT-005]', () => {
    const yon = csvSatirlari(path.join(ENERJI, 'cerceve', 'EPDK-SGYM.csv'));
    expect(yon.filter((r) => r[0].startsWith('BOLUM-'))).toHaveLength(4);
    expect(yon.filter((r) => /^\d+$/.test(r[0]))).toHaveLength(18);
    expect(yon.find((r) => r[0] === 'GECICI-1')?.[2]).toBe('Geçiş süreci');
    expect(yon.find((r) => r[0] === '8')?.[2]).toBe('Sektörel kritiklik derecesi belirleme');
    const ek3 = csvSatirlari(path.join(ENERJI, 'cerceve', 'EPDK-SGYM-EK3.csv'));
    const aileler = ek3.filter((r) => r[0].startsWith('AILE-'));
    const kontroller = ek3.filter((r) => !r[0].startsWith('AILE-'));
    expect(aileler).toHaveLength(13);
    expect(kontroller).toHaveLength(565);
    expect(kontroller.every((r) => aileler.some((a) => a[0] === r[1]))).toBe(true);
    /* Ölçüldü: 508 kontrol EPDK kademesi 1–3 taşır, 57'si "Ek Kontrol".
       Kademe `gereksinim_tipi` sütunundadır; ürünün HEDEF OLGUNLUĞU (`seviye`)
       boş kalır — düzenleyicinin kademesi hedef olgunluk diye okunamaz
       (bağımsız inceleme, PR #43 tur 2). */
    const kademeler = new Set(kontroller.map((r) => r[14]));
    expect([...kademeler].sort()).toEqual(['Ek Kontrol', 'Seviye 1', 'Seviye 2', 'Seviye 3']);
    expect(new Set(kontroller.map((r) => r[5]))).toEqual(new Set(['']));
    expect(kontroller.filter((r) => r[14] === 'Ek Kontrol')).toHaveLength(57);
    expect(kontroller.filter((r) => r[14].startsWith('Seviye'))).toHaveLength(508);
  });

  it('4.6 ölçümü: TR-ENERJI sözlüğü ve öznitelikleri tohum sabitleriyle birebir — tohum bu parçada paket biçimine kayıpsız taşınır', () => {
    const s = paketiDogrula(ENERJI).icerik!;
    const tohumSozluk = [...ENERJI_SOZLUGU, ...ENERJI_OZNITELIK_ETIKETLERI];
    for (const r of tohumSozluk) {
      expect(s.sozluk.find((x) => x.anahtar === r.anahtar), r.anahtar).toMatchObject({
        tekil: r.tekil, cogul: r.cogul, iyelik: r.iyelik, belirtme: r.belirtme, bulunma: r.bulunma, yonelme: r.yonelme });
    }
    for (const o of ENERJI_PROFIL_OZNITELIKLERI) {
      const p = s.oznitelikler.find((x) => x.anahtar === o.anahtar);
      expect(p, o.anahtar).toMatchObject({ tip: o.tip, rol: o.rol, grup: o.grup, kuraldaKullanilir: o.kuraldaKullanilir, sira: o.sira });
      expect(p?.secenekler ?? null).toEqual(o.secenekler ? JSON.parse(o.secenekler) : null);
    }
    expect(s.oznitelikler.find((x) => x.anahtar === 'kuruluGuc')).toMatchObject({ tip: 'sayi', birim: 'MW', rol: 'kapasite', etiketAnahtari: 'kapasite' });
    // tohumda olmayan üç öznitelik paketin eklemesidir (docs/TR_SEKTOR_PAKETLERI.md §3.1)
    const ek = s.oznitelikler.map((x) => x.anahtar).filter((a) => a !== 'kuruluGuc' && !ENERJI_PROFIL_OZNITELIKLERI.some((o) => o.anahtar === a));
    expect(ek.sort()).toEqual(['epdkEki', 'uretimTipi', 'yetkinlikHedefSeviyesi']);
  });
});

describe('iskeletler taze veritabanına kurulur — taslak çerçeve, madde = CSV satırı, ezmeme gerçek veriyle [URN-PKT-005]', () => {
  const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-iskelet-'));
  const testDb = path.join(dizin, 'test.db');
  copyFileSync('prisma/dev.db', testDb);
  process.env.TEST_DB = testDb;

  it('TR-ENERJI: tohumun (DEMO-TR-ENERJI paketinin) sözlük ve öznitelik satırları KORUNUR (çelişki), çerçeveler taslak, 3 803 madde', async () => {
    const { db } = await import('@/lib/db');
    const { paketiKur } = await import('@/lib/paket/kur');
    const kuranId = (await db.kullanici.findFirstOrThrow({ where: { aktif: true } })).id;
    const sektor = await db.sektor.findUniqueOrThrow({ where: { kod: 'ELEKTRIK-URETIM' } });
    /* 2.5: tohum satırları artık DEMO-TR-ENERJI paketinin (koken=paket); TR-ENERJI
       için "başka paketin satırı"dır ve kiracı satırı gibi korunur. */
    const demo = await db.icerikPaketi.findUniqueOrThrow({ where: { kod: 'DEMO-TR-ENERJI' }, include: { surumler: { select: { id: true } } } });
    const demoSurumleri = demo.surumler.map((x) => x.id);
    const tohumSozluk = await db.sektorSozlugu.count({ where: { sektorId: sektor.id, paketSurumId: { in: demoSurumleri } } });
    const tohumOznitelik = await db.sektorOznitelikSemasi.count({ where: { sektorId: sektor.id, paketSurumId: { in: demoSurumleri } } });
    expect(tohumSozluk).toBe(13);
    expect(tohumOznitelik).toBe(9);

    const s = await paketiKur(ENERJI, { kuranId, istemci: db });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    // tohumun her satırı çelişki olarak işaretlendi, dokunulmadı
    const celiskiSozluk = s.rapor.celiskiler.filter((c) => c.tablo === 'SektorSozlugu').length;
    const celiskiOznitelik = s.rapor.celiskiler.filter((c) => c.tablo === 'SektorOznitelikSemasi').length;
    expect(celiskiSozluk).toBe(tohumSozluk);
    expect(celiskiOznitelik).toBe(tohumOznitelik);
    expect(await db.sektorSozlugu.count({ where: { sektorId: sektor.id, paketSurumId: { in: demoSurumleri }, aktif: true } })).toBe(tohumSozluk);
    // paketin tohumda olmayan satırları eklendi
    expect(s.rapor.sayilar.sozluk).toBe(17 - tohumSozluk);
    expect(s.rapor.sayilar.oznitelikler).toBe(12 - tohumOznitelik);
    expect(s.rapor.sayilar).toMatchObject({ kapsamTurleri: 1, cerceveler: 8, maddeler: 3803, yukumlulukler: 5, formlar: 1, raporlar: 1, roller: 2 });
    expect(await db.raporSablonu.findUniqueOrThrow({ where: { kod: 'EPDK-SGYM-KARNE' } })).toMatchObject({ koken: 'paket', aktif: true });
    for (const t of s.rapor.taslakSurumler) {
      expect((await db.frameworkSurumu.findUniqueOrThrow({ where: { id: t.surumId } })).durum).toBe('taslak');
    }
    const ek3 = await db.regulasyon.findUniqueOrThrow({ where: { kod: 'EPDK-SGYM-EK3' } });
    expect(await db.madde.count({ where: { regulasyonId: ek3.id } })).toBe(578);
    expect(await db.madde.count({ where: { regulasyonId: ek3.id, ustMaddeId: null } })).toBe(13);
    expect(ek3).toMatchObject({ lisansTuru: 'kamuya_acik', metinDahil: true, koken: 'paket' });
  });

  it('TR-BANKACILIK: yeni sektör, 4 tür, 7 öznitelik, BDDK-BS taslak 58 madde', async () => {
    const { db } = await import('@/lib/db');
    const { paketiKur } = await import('@/lib/paket/kur');
    const kuranId = (await db.kullanici.findFirstOrThrow({ where: { aktif: true } })).id;
    const s = await paketiKur(BANKA, { kuranId, istemci: db });
    expect(s.ok, JSON.stringify(s)).toBe(true);
    if (!s.ok) return;
    expect(s.rapor.sayilar).toEqual({ sozluk: 15, kapsamTurleri: 4, oznitelikler: 7, cerceveler: 1, maddeler: 58, yukumlulukler: 0, formlar: 1, raporlar: 0, roller: 3, eslemeler: 0, kaynaklar: 0, kurallar: 0 });
    // 2.2: iskelet form şablonu katalogda, köken paket, madde referansları çözülmüş
    const form = await db.formSablonu.findUniqueOrThrow({ where: { kod: 'BDDK-BS-OZDEGERLENDIRME' } });
    expect(form).toMatchObject({ koken: 'paket', aktif: true, dosyaAdi: null, paketSurumId: s.rapor.surumId });
    expect(JSON.parse(form.tanimJson).bolumler.length).toBeGreaterThanOrEqual(2);
    expect(s.rapor.celiskiler).toEqual([]);
    const reg = await db.regulasyon.findUniqueOrThrow({ where: { kod: 'BDDK-BS' }, include: { surumler: true } });
    expect(reg.surumler.map((v) => v.durum)).toEqual(['taslak']);
    expect(await db.kapsamOgesiTuru.count({ where: { koken: 'paket', sektor: { kod: 'BANKACILIK' } } })).toBe(4);
  });
});

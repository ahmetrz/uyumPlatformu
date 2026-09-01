import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Kontrol-sonra-yaz yarışları: onay kararı, içe aktarım onayı, keşif kararı.

   ── Neden bugün de önemli ──────────────────────────────────────────────
   Bugün SQLite tek yazıcıdır ve pencereyi çok daraltır. Ama daraltmak
   kapatmak değildir ve `docs/POSTGRES_READINESS.md` bu üç noktayı geçişin
   ÜRETECEĞİ hata olarak işaretliyor: PostgreSQL'de (READ COMMITTED)
   pencere gerçek genişliğine kavuşur.

   Düzeltmenin göçten ÖNCE yapılması gerekir: iki kez uygulanmış bir yan
   etkiyi ya da açılmış kopya varlıkları geriye dönük ayırt etmek elle
   yapılacak bir iştir.

   ── Testin dürüstlüğü ──────────────────────────────────────────────────
   Tek süreçte tek yazıcılı SQLite üzerinde "gerçek" bir yarış üretilemez.
   Bu yüzden ölçtüğümüz şey yarışın kendisi değil, KORUMANIN SÖZLEŞMESİDİR:
   eşzamanlı iki çağrıdan tam biri kazanır, kaybeden AÇIK hata alır ve
   HİÇBİR yan etki bırakmaz. Mutasyon (koşullu updateMany → koşulsuz
   update) bu testleri kırmızıya döndürür; ölçüldü. */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-yaris-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { oturumCereziAyarla } = await import('./sahte/next-headers');
const { onayKarar } = await import('@/lib/eylemler2/gorev');
const { kesifKararUygula } = await import('@/lib/entegrasyon/kesif');

const ONEK = `YARIS-${Date.now()}`;
const kimlik = { onaylayan: '', talepEden: '', tesisId: '', turId: '' };

/** Gerçek bir oturum açar ve çerezi ayarlar — sahte AktifKullanici
    enjekte etmiyoruz, üretimdeki yetki modeli aynen koşsun. */
async function oturumAc(kullaniciId: string): Promise<void> {
  const jeton = randomBytes(32).toString('base64url');
  await db.oturum.create({
    data: {
      kullaniciId, tokenHash: createHash('sha256').update(jeton).digest('hex'),
      bitis: new Date(Date.now() + 3_600_000),
    },
  });
  oturumCereziAyarla(jeton);
}

beforeAll(async () => {
  const onaylayan = await db.kullanici.create({
    data: {
      adSoyad: 'Yarış Onaylayan', eposta: `${ONEK}-onay@ornek.test`, aktif: true,
      yetkiler: { create: [{ rol: 'yonetici', modul: null }] },
    },
  });
  const talepEden = await db.kullanici.create({
    data: { adSoyad: 'Yarış Talep Eden', eposta: `${ONEK}-talep@ornek.test`, aktif: true },
  });
  kimlik.onaylayan = onaylayan.id;
  kimlik.talepEden = talepEden.id;

  const tesis = await db.tesis.create({ data: { kod: `${ONEK}-T`, ad: 'Yarış santrali' } });
  const tur = await db.varlikTuru.create({
    data: { kod: `${ONEK}-TUR`, ad: 'Yarış türü', sinif: 'BT' },
  });
  kimlik.tesisId = tesis.id;
  kimlik.turId = tur.id;

  await oturumAc(onaylayan.id);
});

/* ═══ P1 — dört göz onayı ═════════════════════════════════════════════ */

describe('Onay kararı iki kez uygulanmaz', () => {
  async function talepAc() {
    return db.onayTalebi.create({
      data: {
        tip: 'risk_kabul', kaynakTipi: 'Test', kaynakId: `${ONEK}-${Math.random()}`,
        ozet: 'Yarış testi onay talebi',
        talepEdenId: kimlik.talepEden, durum: 'bekliyor',
      },
    });
  }

  it('EŞZAMANLI iki karardan tam biri yazar', async () => {
    const t = await talepAc();
    const sonuclar = await Promise.all([
      onayKarar({ id: t.id, karar: 'onaylandi', gerekce: 'ilk karar' }),
      onayKarar({ id: t.id, karar: 'reddedildi', gerekce: 'ikinci karar' }),
    ]);
    expect(sonuclar.filter((s) => s.ok)).toHaveLength(1);
    const kaybeden = sonuclar.find((s) => !s.ok)!;
    expect('hata' in kaybeden && kaybeden.hata).toMatch(/zaten karara bağlanmış/);
  });

  it('kaybeden denetim izine HİÇBİR ŞEY yazmaz', async () => {
    /* Asıl tehlike buydu: iki karar da yazılırsa denetim izine iki onay
       satırı düşer ve yan etki iki kez uygulanır. */
    const t = await talepAc();
    await Promise.all([
      onayKarar({ id: t.id, karar: 'onaylandi', gerekce: 'a' }),
      onayKarar({ id: t.id, karar: 'onaylandi', gerekce: 'b' }),
    ]);
    const izler = await db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'OnayTalebi', varlikId: t.id },
    });
    expect(izler, 'aynı talep için birden çok karar izi düştü').toHaveLength(1);
  });

  it('ardışık ikinci karar da reddedilir', async () => {
    const t = await talepAc();
    expect((await onayKarar({ id: t.id, karar: 'onaylandi', gerekce: 'ilk' })).ok).toBe(true);
    const ikinci = await onayKarar({ id: t.id, karar: 'reddedildi', gerekce: 'ikinci' });
    expect(ikinci.ok).toBe(false);
    const son = await db.onayTalebi.findUniqueOrThrow({ where: { id: t.id } });
    expect(son.durum).toBe('onaylandi');   // ilk karar korundu
  });
});

/* ═══ P3 — keşif kararı ═══════════════════════════════════════════════ */

describe('Keşif kararı kopya varlık açmaz', () => {
  async function kesifAc(etiket: string) {
    return db.kesifKaydi.create({
      data: {
        kaynak: 'csv', kaynakKayitId: `${ONEK}-${etiket}-${Math.random()}`,
        tesisId: kimlik.tesisId, durum: 'inceleme_bekliyor',
        hamJson: JSON.stringify({ etiket }),
        normalJson: JSON.stringify({
          gozlem: {
            tip: 'varlik',
            koken: {
              kaynakSistem: 'csv', kaynakKayitId: `${ONEK}-${etiket}`,
              toplanma: new Date().toISOString(), guven: null,
            },
            etiket, hostname: `host-${etiket}`, ham: { etiket },
          },
        }),
      },
    });
  }

  it('EŞZAMANLI iki karardan tam biri geçer, TEK varlık açılır', async () => {
    const k = await kesifAc('E1');
    const oncekiVarlik = await db.varlik.count();
    const sonuclar = await Promise.allSettled([
      kesifKararUygula({
        kesifId: k.id, karar: 'yeni_varlik', inceleyenId: kimlik.onaylayan,
        not: 'ilk inceleyici onayı',
        yeniVarlik: { turId: kimlik.turId, tesisId: kimlik.tesisId },
      }),
      kesifKararUygula({
        kesifId: k.id, karar: 'yeni_varlik', inceleyenId: kimlik.onaylayan,
        not: 'ikinci inceleyici onayı',
        yeniVarlik: { turId: kimlik.turId, tesisId: kimlik.tesisId },
      }),
    ]);
    expect(sonuclar.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
    expect(await db.varlik.count()).toBe(oncekiVarlik + 1);
  });

  it('karara bağlanmış kayıt yeniden karara açılmaz', async () => {
    const k = await kesifAc('E2');
    await kesifKararUygula({
      kesifId: k.id, karar: 'reddet', inceleyenId: kimlik.onaylayan,
      not: 'kaynak yanlış santrali bildirmiş',
    });
    await expect(kesifKararUygula({
      kesifId: k.id, karar: 'yeni_varlik', inceleyenId: kimlik.onaylayan,
      not: 'fikir değiştirdim',
      yeniVarlik: { turId: kimlik.turId, tesisId: kimlik.tesisId },
    })).rejects.toThrow(/zaten karara bağlanmış/);
  });
});

/* ═══ P1 devamı — kararın YAN ETKİSİ (denetim bulgusu #16) ════════════

   Yukarıdaki üç vaka kararın KENDİSİNİN iki kez yazılmadığını ölçüyor.
   Asıl zarar yan etkideydi: `onayKarar` sahiplenmeyi atomik yapmıştı ama
   `onayYanEtkisi` transaction DIŞINDA koşuyordu. Kaybeden çağrı
   sahiplenmede duruyordu, ama KAZANAN çağrı yarım kalabiliyordu —
   istisna 'aktif', madde durumlarının bir kısmı hâlâ kapsam içinde.
   Şimdi sahiplenme + yan etki + iz tek transaction. */

describe('İstisna onayının yan etkisi çiftlenmez ve yarım kalmaz', () => {
  async function istisnaTalebiAc(etiket: string, surecSayisi: number) {
    const reg = await db.regulasyon.create({
      data: { kod: `${ONEK}-${etiket}`, ad: `Yarış istisna ${etiket}` } });
    const madde = await db.madde.create({ data: {
      regulasyonId: reg.id, kod: `${ONEK}-${etiket}-M`,
      baslik: 'Yarış maddesi', metin: 'Yarış metni' } });
    const durumIdler: string[] = [];
    for (let i = 0; i < surecSayisi; i += 1) {
      const surec = await db.uyumSureci.create({ data: {
        kod: `${ONEK}-${etiket}-S${i}`, ad: `Yarış süreci ${i}`,
        regulasyonId: reg.id, durum: 'aktif' } });
      const d = await db.maddeDurumu.create({ data: {
        surecId: surec.id, maddeId: madde.id, tesisId: kimlik.tesisId, durum: 'uyumlu' } });
      durumIdler.push(d.id);
    }
    const istisna = await db.istisna.create({ data: {
      maddeId: madde.id, tesisId: kimlik.tesisId, durum: 'onay_bekliyor',
      gerekce: 'Yarış testi için geçici muafiyet.',
      bitis: new Date(Date.now() + 30 * 86_400_000) } });
    const talep = await db.onayTalebi.create({ data: {
      tip: 'istisna', kaynakTipi: 'Istisna', kaynakId: istisna.id,
      ozet: 'Yarış istisna talebi', talepEdenId: kimlik.talepEden, durum: 'bekliyor' } });
    return { istisna, talep, durumIdler };
  }

  it('EŞZAMANLI iki onaydan yan etki TAM BİR KEZ uygulanır', async () => {
    const { istisna, talep, durumIdler } = await istisnaTalebiAc('Y1', 3);
    const sonuclar = await Promise.all([
      onayKarar({ id: talep.id, karar: 'onaylandi', gerekce: 'ilk' }),
      onayKarar({ id: talep.id, karar: 'onaylandi', gerekce: 'ikinci' }),
    ]);
    expect(sonuclar.filter((s) => s.ok)).toHaveLength(1);
    expect((await db.istisna.findUniqueOrThrow({ where: { id: istisna.id } })).durum).toBe('aktif');
    // yan etki bir kez: 3 durum, 3 tarihçe, 3 iz — 6 değil
    expect(await db.maddeDurumu.count({
      where: { id: { in: durumIdler }, durum: 'kapsamdisi' } })).toBe(3);
    expect(await db.degerlendirmeTarihcesi.count({
      where: { maddeDurumuId: { in: durumIdler } } })).toBe(3);
    expect(await db.aktiviteKaydi.count({
      where: { varlikTipi: 'MaddeDurumu', varlikId: { in: durumIdler } } })).toBe(3);
  });

  it('yan etki tamamlanmadan kararın izi düşmez (hepsi ya da hiçbiri)', async () => {
    /* Kontrollü arıza: tarihçe yazımı reddedilir. Karar izi (`OnayTalebi`)
       yan etkiden ÖNCE yazılır; aynı transaction'da olmasaydı ortada
       "onaylandı" izi kalır, karşılığı olan durum değişimi olmazdı. */
    const { istisna, talep, durumIdler } = await istisnaTalebiAc('Y2', 2);
    await db.$executeRawUnsafe(
      'CREATE TRIGGER yaris_tarihce_patlat BEFORE INSERT ON "DegerlendirmeTarihcesi" '
      + "WHEN NEW.yeniDurum = 'kapsamdisi' BEGIN SELECT RAISE(ABORT, 'disk doldu'); END;");
    let sonuc;
    try { sonuc = await onayKarar({ id: talep.id, karar: 'onaylandi', gerekce: 'onay' }); }
    finally { await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS yaris_tarihce_patlat;'); }

    expect(sonuc.ok).toBe(false);
    expect((await db.onayTalebi.findUniqueOrThrow({ where: { id: talep.id } })).durum).toBe('bekliyor');
    expect((await db.istisna.findUniqueOrThrow({ where: { id: istisna.id } })).durum).toBe('onay_bekliyor');
    expect(await db.aktiviteKaydi.count({
      where: { varlikTipi: 'OnayTalebi', varlikId: talep.id } })).toBe(0);
    expect(await db.maddeDurumu.count({
      where: { id: { in: durumIdler }, durum: 'kapsamdisi' } })).toBe(0);

    // ve karar hâlâ verilebilir durumda: yarım kalmışlık kilitlemedi
    expect((await onayKarar({ id: talep.id, karar: 'onaylandi', gerekce: 'yeniden' })).ok).toBe(true);
    expect(await db.maddeDurumu.count({
      where: { id: { in: durumIdler }, durum: 'kapsamdisi' } })).toBe(2);
  });
});

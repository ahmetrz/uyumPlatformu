import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Hata modeli: devre kesici, hata sınıfı, korelasyon kimliği, dead-letter.

   ── Kapatılan kusurlar ─────────────────────────────────────────────────
   1. TEK başarısız koşu connector'ı `hatali` yapıyordu. Zamanlayıcı
      `hatali` olanı bir daha koşturmadığı için (elle yeniden
      etkinleştirme gerekir), tek bir ağ kesintisi entegrasyonu KALICI
      olarak durduruyordu. `ardisikHata` ve `ardisikHataSiniri` sütunları
      şemada bu iş için duruyordu ve hiçbir kod onları okumuyordu.

   2. Reddedilen kaydın SAYISI koşu kaydında duruyordu ama KENDİSİ
      kayboluyordu. Ham yük olmadan eşlemeyi düzeltmek için kaynağa geri
      dönmek gerekir; çoğu kaynakta aynı kaydı bir daha bulamazsın.

   3. Bir koşuyu, ürettiği dead-letter satırlarını ve denetim izini
      bağlayan tek anahtar yoktu. */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-hata-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { senkronizasyonKos, hataSinifiCikar, VARSAYILAN_ARDISIK_HATA_SINIRI } =
  await import('@/lib/entegrasyon/cekirdek');
const { adaptorKaydet } = await import('@/lib/entegrasyon/kayit');
const { temelDogrula } = await import('@/lib/entegrasyon/sozlesme');
import { z } from 'zod';
import type { Adaptor, AdaptorBaglami as Baglam, CekmeSonucu, Gozlem } from '@/lib/entegrasyon/sozlesme';

function gozlem(id: string, kaynak: string, ek: Record<string, unknown> = {}): Gozlem {
  return {
    tip: 'varlik',
    koken: { kaynakSistem: kaynak, kaynakKayitId: id, toplanma: new Date(), guven: null },
    hostname: `sunucu-${id}`,
    ham: { id, kaynak },
    ...ek,
  } as Gozlem;
}

function adaptorYap(tip: string, cek: (b: Baglam) => Promise<CekmeSonucu>, ekstra: Partial<Adaptor> = {}): Adaptor {
  const a = {
    tip, baglanabilir: true,
    yapilandirmaSemasi: z.looseObject({}),
    gerekenSirlar: [] as string[],
    async testConnection() { return { ok: true, ayrinti: 'sahte fikstür' }; },
    async discover() { return { ozet: 'sahte fikstür', tahminiKayit: null }; },
    fetchChanges: cek,
    normalize: () => [],
    validate: (g: Gozlem[]) => temelDogrula(g),
    async health() { return { durum: 'saglikli' as const, ayrinti: 'sahte fikstür', tazelikDk: null }; },
    ...ekstra,
  } as unknown as Adaptor;
  adaptorKaydet(a, true);
  return a;
}

let sayac = 0;
async function connectorYap(tip: string, ek: Record<string, unknown> = {}) {
  sayac += 1;
  return db.connector.create({
    data: {
      kod: `HATA-CON-${sayac}-${Date.now()}`, ad: `Hata testi ${sayac}`, tip,
      kaynakSistem: `HATA-SISTEM-${sayac}`, etkin: true, durum: 'etkin', ...ek,
    },
  });
}

const hicBekleme = async () => {};

/* ═══ Hata sınıflandırma ══════════════════════════════════════════════ */

describe('Hata sınıflandırma', () => {
  it('yetki hatası HTTP koduyla tanınır [SAG-CON-005]', () => {
    expect(hataSinifiCikar({ status: 401 })).toBe('yetki');
    expect(hataSinifiCikar({ status: 403 })).toBe('yetki');
  });

  it('sır ve yapılandırma hataları ayrı sınıflardır', () => {
    expect(hataSinifiCikar(new Error('Sır çözülemedi: vault bağlı değil'))).toBe('sir');
    expect(hataSinifiCikar(new Error('Adaptör kayıtlı değil'))).toBe('yapilandirma');
  });

  it('çağıranın bildirdiği sınıf metin sezgisini EZER', () => {
    /* Çağıran neyin patladığını bilir; metin sezgisi tahmindir. */
    expect(hataSinifiCikar(new Error('401 unauthorized'), 'sozlesme')).toBe('sozlesme');
  });

  it('tanınmayan hata GEÇİCİ sayılmaz — bilinmeyen kalır [SAG-CON-004]', () => {
    /* Bilinmeyen bir hatayı geçici saymak, kalıcı bir arızayı sonsuz
       tekrar denemeye çevirirdi. */
    expect(hataSinifiCikar(new Error('bambaşka bir şey oldu'))).toBe('bilinmeyen');
  });
});

/* ═══ Devre kesici ════════════════════════════════════════════════════ */

describe('Devre kesici — tek hata connector durdurmaz', () => {
  it('ilk başarısızlık connector\'ı HATALI yapmaz, sayacı artırır', async () => {
    const tip = `hata-tek-${Date.now()}`;
    adaptorYap(tip, async () => { throw new Error('geçici ağ hatası'); });
    const c = await connectorYap(tip, { ardisikHataSiniri: 3 });

    const o = await senkronizasyonKos(c.id, { maksDeneme: 1, bekle: hicBekleme });
    expect(o.durum).toBe('basarisiz');
    expect(o.ardisikHata).toBe(1);
    expect(o.devreKesildi).toBe(false);

    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.durum).not.toBe('hatali');
    expect(sonra.ardisikHata).toBe(1);
    // Sebep kaybolmuyor: özet yazıldı.
    expect(sonra.sonHataOzeti).toContain('geçici ağ hatası');
  });

  it('SINIRA ULAŞINCA duraklatır [SAG-CON-003]', async () => {
    const tip = `hata-sinir-${Date.now()}`;
    adaptorYap(tip, async () => { throw new Error('kalıcı arıza'); });
    const c = await connectorYap(tip, { ardisikHataSiniri: 3 });

    for (let i = 1; i <= 2; i += 1) {
      const o = await senkronizasyonKos(c.id, { maksDeneme: 1, bekle: hicBekleme });
      expect(o.devreKesildi, `${i}. koşuda erken kesildi`).toBe(false);
    }
    const ucuncu = await senkronizasyonKos(c.id, { maksDeneme: 1, bekle: hicBekleme });
    expect(ucuncu.ardisikHata).toBe(3);
    expect(ucuncu.devreKesildi).toBe(true);
    expect((await db.connector.findUniqueOrThrow({ where: { id: c.id } })).durum).toBe('hatali');
  });

  it('araya giren BAŞARILI koşu sayacı sıfırlar', async () => {
    const tip = `hata-sifirla-${Date.now()}`;
    let patla = true;
    adaptorYap(tip, async () => {
      if (patla) throw new Error('bir kerelik');
      return { gozlemler: [gozlem('S1', 'SIFIRLA')], yeniImlec: 'x', devamVar: false };
    });
    const c = await connectorYap(tip, { ardisikHataSiniri: 3 });

    await senkronizasyonKos(c.id, { maksDeneme: 1, bekle: hicBekleme });
    await senkronizasyonKos(c.id, { maksDeneme: 1, bekle: hicBekleme });
    expect((await db.connector.findUniqueOrThrow({ where: { id: c.id } })).ardisikHata).toBe(2);

    patla = false;
    const iyi = await senkronizasyonKos(c.id, { maksDeneme: 1, bekle: hicBekleme });
    expect(iyi.durum).toBe('basarili');
    expect(iyi.ardisikHata).toBe(0);
    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.ardisikHata).toBe(0);
    expect(sonra.sonHataOzeti).toBeNull();
  });

  it('sınır 0 verilirse ASLA duraklatılmaz — bilinçli kurulum', async () => {
    const tip = `hata-sinirsiz-${Date.now()}`;
    adaptorYap(tip, async () => { throw new Error('sürekli arıza'); });
    const c = await connectorYap(tip, { ardisikHataSiniri: 0 });
    for (let i = 0; i < 4; i += 1) await senkronizasyonKos(c.id, { maksDeneme: 1, bekle: hicBekleme });
    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.ardisikHata).toBe(4);
    expect(sonra.durum).not.toBe('hatali');
  });

  it('sınır tanımsızsa çekirdek varsayılanı geçerlidir — "duraklatma yok" DEĞİL', async () => {
    /* Şema yorumu bir zamanlar null'ı "duraklatma yok" sayıyordu. Kimlik
       süresi dolmuş bir connector her poll aralığında kurumsal uca yanlış
       kimlikle vurur; çoğu dizin bunu hesap kilitlemesiyle karşılar. Yani
       "asla duraklatma", kendi servis hesabını kilitletmektir. */
    const tip = `hata-varsayilan-${Date.now()}`;
    adaptorYap(tip, async () => { throw new Error('arıza'); });
    const c = await connectorYap(tip, { ardisikHataSiniri: null });
    for (let i = 1; i < VARSAYILAN_ARDISIK_HATA_SINIRI; i += 1) {
      const o = await senkronizasyonKos(c.id, { maksDeneme: 1, bekle: hicBekleme });
      expect(o.devreKesildi).toBe(false);
    }
    const son = await senkronizasyonKos(c.id, { maksDeneme: 1, bekle: hicBekleme });
    expect(son.devreKesildi).toBe(true);
  });

  it('KİMLİK BEKLEYEN koşu sayacı ARTIRMAZ — kurulum arıza değildir', async () => {
    const c = await connectorYap('ad_entra', { ardisikHataSiniri: 2 });
    for (let i = 0; i < 3; i += 1) {
      const o = await senkronizasyonKos(c.id, { maksDeneme: 1, bekle: hicBekleme });
      expect(o.durum).toBe('kimlik_bekleniyor');
      expect(o.ardisikHata).toBe(0);
      expect(o.devreKesildi).toBe(false);
    }
    expect((await db.connector.findUniqueOrThrow({ where: { id: c.id } })).durum).not.toBe('hatali');
  });
});

/* ═══ Korelasyon kimliği ══════════════════════════════════════════════ */

describe('Korelasyon kimliği', () => {
  it('koşu satırına yazılır ve özette döner', async () => {
    const tip = `korelasyon-${Date.now()}`;
    adaptorYap(tip, async () => ({
      gozlemler: [gozlem('K1', 'KORELASYON')], yeniImlec: 'x', devamVar: false,
    }));
    const c = await connectorYap(tip);
    const o = await senkronizasyonKos(c.id, { bekle: hicBekleme });
    expect(o.korelasyonId).toMatch(/[0-9a-f-]{36}/);
    const kosu = await db.entegrasyonKosusu.findUniqueOrThrow({ where: { id: o.kosuId! } });
    expect(kosu.korelasyonId).toBe(o.korelasyonId);
  });

  it('çağıran kendi kimliğini verebilir — zincirin ucu kopmaz', async () => {
    const tip = `korelasyon-dis-${Date.now()}`;
    adaptorYap(tip, async () => ({ gozlemler: [], yeniImlec: null, devamVar: false }));
    const c = await connectorYap(tip);
    const o = await senkronizasyonKos(c.id, { korelasyonId: 'dis-istek-123', bekle: hicBekleme });
    expect(o.korelasyonId).toBe('dis-istek-123');
  });

  it('KOŞU AÇILMAYAN yolda bile kimlik döner', async () => {
    /* `atlandi` yolunda koşu satırı hiç açılmaz. Kimlik dönmeseydi
       "neden koşmadı" sorusunun izlenecek bir ipi olmazdı. */
    const tip = `korelasyon-atlandi-${Date.now()}`;
    adaptorYap(tip, async () => ({ gozlemler: [], yeniImlec: null, devamVar: false }));
    const c = await connectorYap(tip, { etkin: false });
    const o = await senkronizasyonKos(c.id, { bekle: hicBekleme });
    expect(o.durum).toBe('atlandi');
    expect(o.kosuId).toBeNull();
    expect(o.korelasyonId.length).toBeGreaterThan(0);
  });
});

/* ═══ Dead-letter ═════════════════════════════════════════════════════ */

describe('Dead-letter — reddedilen kaydın KENDİSİ saklanır', () => {
  it('doğrulamada düşen kayıt ham yüküyle birlikte yazılır', async () => {
    const tip = `dl-dogrulama-${Date.now()}`;
    adaptorYap(tip, async () => ({
      gozlemler: [
        gozlem('DL1', 'DL-KAYNAK'),
        // kökensiz gözlem: temelDogrula reddeder
        { tip: 'varlik', hostname: 'kokensiz', ham: { neden: 'kökeni yok' } } as Gozlem,
      ],
      yeniImlec: 'x', devamVar: false,
    }));
    const c = await connectorYap(tip);
    const o = await senkronizasyonKos(c.id, { bekle: hicBekleme });

    expect(o.reddedilen).toBe(1);
    const redler = await db.reddedilenKayit.findMany({ where: { kosuId: o.kosuId! } });
    expect(redler, 'sayaç arttı ama dead-letter satırı yazılmadı').toHaveLength(1);
    expect(redler[0].asama).toBe('dogrulama');
    expect(redler[0].sebep.length).toBeGreaterThan(0);
    expect(redler[0].hamJson).toContain('kökeni yok');
    expect(redler[0].durum).toBe('acik');
  });

  it('dead-letter satırı koşuya ve connector\'a bağlıdır', async () => {
    const tip = `dl-bag-${Date.now()}`;
    adaptorYap(tip, async () => ({
      gozlemler: [{ tip: 'varlik', hostname: 'x', ham: {} } as Gozlem],
      yeniImlec: null, devamVar: false,
    }));
    const c = await connectorYap(tip);
    const o = await senkronizasyonKos(c.id, { bekle: hicBekleme });
    const red = await db.reddedilenKayit.findFirstOrThrow({ where: { kosuId: o.kosuId! } });
    expect(red.connectorId).toBe(c.id);
    expect(red.kaynakSistem).toBe(c.kaynakSistem);
  });

  it('KURU KOŞU dead-letter YAZMAZ — hiçbir şey yazmaz sözü', async () => {
    const tip = `dl-kuru-${Date.now()}`;
    adaptorYap(tip, async () => ({
      gozlemler: [{ tip: 'varlik', hostname: 'x', ham: {} } as Gozlem],
      yeniImlec: null, devamVar: false,
    }));
    const c = await connectorYap(tip);
    const once = await db.reddedilenKayit.count();
    const o = await senkronizasyonKos(c.id, { kuru: true, bekle: hicBekleme });
    expect(o.kuru).toBe(true);
    expect(await db.reddedilenKayit.count()).toBe(once);
    // Sebep kaybolmuyor: kuru özette duruyor.
    expect(JSON.stringify(o.kuruOzet)).toContain('köken');
  });

  it('temiz koşu dead-letter üretmez', async () => {
    const tip = `dl-temiz-${Date.now()}`;
    adaptorYap(tip, async () => ({
      gozlemler: [gozlem('T1', 'DL-TEMIZ')], yeniImlec: 'x', devamVar: false,
    }));
    const c = await connectorYap(tip);
    const o = await senkronizasyonKos(c.id, { bekle: hicBekleme });
    expect(o.durum).toBe('basarili');
    expect(await db.reddedilenKayit.count({ where: { kosuId: o.kosuId! } })).toBe(0);
  });
});

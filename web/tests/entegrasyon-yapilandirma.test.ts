import { z } from 'zod';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   CONNECTOR YAPILANDIRMASI VE SANTRAL KAPSAMI

   İki kusuru dondurur:

   (1) SESSİZ SİLME. Yapılandırma formu `yapilandirmaJson` alanını hiç
       göndermiyordu, eylem ise onu koşulsuz `?? null` ile yazıyordu: bir
       connector'ın yalnız ADINI düzeltmek adaptör ayarlarını, varsayılan
       tesis kodunu ve santral kapsamını sessizce siliyordu. Buradaki
       testler kaydın TAMAMINI önce/sonra karşılaştırır — "hata dönmedi"
       yeterli bir kanıt değildir.

   (2) YAZANI OLMAYAN GÜVENLİK KOLONU. `Connector.kapsamTesisleriJson`
       şemada "connector'ın yazabileceği santraller — güvenlik sınırı"
       diye tanımlıydı ve çekirdek onu okuyordu, ama tüm repoda ona YAZAN
       hiçbir yol yoktu. Artık var (`connectorKapsamKaydet`) ve aşağıdaki
       testler yazılan değerin ÇEKİRDEĞİN OKUDUĞU değer olduğunu, hem
       fonksiyon düzeyinde hem GERÇEK BİR KOŞUDA ölçer.

   KAPSAM KAYNAĞI KARARI (dondurulur): iki kaynak varsa KOLON KAZANIR.
   Yapılandırmadaki `kapsamTesisKodlari` yalnız miras okumadır; yazma
   yüzeyinden geçen her kayıt onu kolona taşıyıp yapılandırmadan siler,
   yani iki dolu kaynak bırakılmaz.

   Dış sistem yoktur: koşan tek adaptör bu dosyada kurulan fikstürdür,
   ağa paket çıkmaz.

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-eyap-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Yetki kapısı gerçek kodda koşar; testte HTTP oturumu yok. Kapının
   ARKASINDAKİ kurallar (kısmi güncelleme, kapsam doğrulaması) sahte
   değildir. Aktör kimliği gerçek bir kullanıcıdır — iz satırının yabancı
   anahtarı bunu ister. */
const sahteKullanici = {
  id: '', adSoyad: 'Kapsam Testi', eposta: 'kapsam@test', unvan: null,
  yetkiler: [{ rol: 'yonetici', surecId: null, tesisId: null, tuzelKisiId: null,
    regulasyonId: null, modul: null }],
};
vi.mock('@/lib/erisim', async (asil) => {
  const gercek = await asil<typeof import('@/lib/erisim')>();
  return { ...gercek, yetkiZorunlu: async () => sahteKullanici, izinVar: () => true };
});

const { db } = await import('@/lib/db');
const {
  connectorKaydet, connectorKapsamGorunumu, connectorKapsamKaydet,
} = await import('@/lib/eylemler2/entegrasyon');
const { connectorKapsamKodlari, senkronizasyonKos } =
  await import('@/lib/entegrasyon/cekirdek');
const { adaptorKaydet, adaptorSil } = await import('@/lib/entegrasyon/kayit');
const { temelDogrula } = await import('@/lib/entegrasyon/sozlesme');
const M = await import('@/app/(atlas)/(operasyonel)/saglik/mantik');

import type { Adaptor, CekmeSonucu, Gozlem } from '@/lib/entegrasyon/sozlesme';
import type { KapsamGorunumu } from '@/app/(atlas)/(operasyonel)/saglik/mantik';

const ONEK = 'EYAP';
const kimlik = { tesisA: '', tesisB: '' };

let sayac = 0;
const benzersiz = (onek: string) => `${onek}-${Date.now()}-${sayac++}`;

/** Kaydın 'ad' ve zaman damgası dışındaki TÜM alanları — kısmi güncelleme
    testi kaydın tamamını karşılaştırır, seçilmiş birkaç alanı değil. */
function kalanAlanlar(k: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(k).filter(([alan]) => alan !== 'ad' && alan !== 'guncellendi'));
}

/** Adaptör ayarları + varsayılan tesis kodu — silinmemesi gereken şey. */
const AYARLAR = { tabanUrl: 'https://ornek.local/api', filtre: 'ou=OT', sayfaBoyutu: 250 };

async function connectorAc(ek: Record<string, unknown> = {}) {
  return db.connector.create({ data: {
    kod: benzersiz(`${ONEK}-C`), ad: 'Kapsam tezgâhı', tip: 'manual_import',
    kaynakSistem: `${ONEK}-kaynak`, kimlikTipi: 'none', durum: 'taslak', etkin: false,
    yapilandirmaJson: JSON.stringify(AYARLAR),
    ...ek,
  } });
}

beforeAll(async () => {
  const kisi = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
  sahteKullanici.id = kisi.id;
  const a = await db.tesis.create({ data: { kod: `${ONEK}-A`, ad: 'Kapsam Santrali A' } });
  const b = await db.tesis.create({ data: { kod: `${ONEK}-B`, ad: 'Kapsam Santrali B' } });
  kimlik.tesisA = a.id;
  kimlik.tesisB = b.id;
});

/* ═══ 1 · Kısmi güncelleme: "alan yok" ≠ "alan boş" ══════════════════ */

describe('1 · Connector düzenlemesi yapılandırmayı ve kapsamı SİLMEZ', () => {
  it('yalnız AD güncellenince kaydın geri kalanı bit bit aynı kalır', async () => {
    const c = await connectorAc({
      kapsamTesisleriJson: JSON.stringify([`${ONEK}-A`]),
      pollAralikDk: 30,
    });
    const once = await db.connector.findUniqueOrThrow({ where: { id: c.id } });

    /* Formun gönderdiği alanlar: yapılandırma ve kapsam YOK. */
    const y = await connectorKaydet({
      id: c.id, kod: once.kod, ad: 'Adı düzeltildi', tip: once.tip,
      kaynakSistem: once.kaynakSistem, kimlikTipi: once.kimlikTipi,
      sirReferansi: null, pollAralikDk: once.pollAralikDk, etkin: once.etkin,
    });
    expect(y).toEqual({ ok: true });

    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });

    // (a) Kaydın TAMAMI karşılaştırılır: yalnız 'ad' (ve zaman damgası) değişti.
    expect(kalanAlanlar(sonra)).toEqual(kalanAlanlar(once));
    expect(sonra.ad).toBe('Adı düzeltildi');

    // (b) Ve tek tek: yapılandırma, kapsam, poll aralığı yerinde.
    expect(JSON.parse(sonra.yapilandirmaJson!)).toEqual(AYARLAR);
    expect(sonra.kapsamTesisleriJson).toBe(JSON.stringify([`${ONEK}-A`]));
    expect(sonra.pollAralikDk).toBe(30);
  });

  it('yapılandırma AÇIKÇA null gönderilirse silinir — bilinçli temizleme', async () => {
    const c = await connectorAc();
    const y = await connectorKaydet({
      id: c.id, kod: c.kod, ad: c.ad, tip: c.tip, kaynakSistem: c.kaynakSistem,
      kimlikTipi: 'none', yapilandirmaJson: null, sirReferansi: null, etkin: false,
    });
    expect(y).toEqual({ ok: true });
    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.yapilandirmaJson).toBeNull();
  });

  it('boş dize de açık temizlemedir; "gönderilmedi" ile aynı şey değildir', async () => {
    const c = await connectorAc();
    await connectorKaydet({
      id: c.id, kod: c.kod, ad: c.ad, tip: c.tip, kaynakSistem: c.kaynakSistem,
      kimlikTipi: 'none', yapilandirmaJson: '   ', sirReferansi: null, etkin: false,
    });
    expect((await db.connector.findUniqueOrThrow({ where: { id: c.id } })).yapilandirmaJson)
      .toBeNull();
  });

  it('poll aralığı da gönderilmezse korunur', async () => {
    const c = await connectorAc({ pollAralikDk: 15 });
    await connectorKaydet({
      id: c.id, kod: c.kod, ad: c.ad, tip: c.tip, kaynakSistem: c.kaynakSistem,
      kimlikTipi: 'none', sirReferansi: null, etkin: false,
    });
    expect((await db.connector.findUniqueOrThrow({ where: { id: c.id } })).pollAralikDk)
      .toBe(15);
  });
});

/* ═══ 2 · Kapsam kolonuna yazan yol ═══════════════════════════════════ */

describe('2 · kapsamTesisleriJson kolonuna yazılabiliyor', () => {
  it('eylem kolona yazar ve ÇEKİRDEĞİN OKUDUĞU liste aynıdır', async () => {
    const c = await connectorAc();
    const y = await connectorKapsamKaydet({
      connectorId: c.id, tesisKodlari: [`${ONEK}-A`, `${ONEK}-B`],
      gerekce: 'OT keşif ürünü yalnız bu iki sahayı görüyor',
    });
    expect(y).toEqual({ ok: true });

    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.kapsamTesisleriJson).not.toBeNull();

    // Okuma tarafı çekirdeğin KENDİ fonksiyonudur; ekranla koşu ayrışamaz.
    const okunan = connectorKapsamKodlari(
      JSON.parse(sonra.yapilandirmaJson!) as Record<string, unknown>,
      sonra.kapsamTesisleriJson,
    );
    expect(okunan).toEqual([`${ONEK}-A`, `${ONEK}-B`]);

    // Ekranın okuduğu görünüm de aynı listeyi verir.
    const g = await connectorKapsamGorunumu(c.id);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.kodlar).toEqual([`${ONEK}-A`, `${ONEK}-B`]);
    expect(g.kaynak).toBe('kolon');
  });

  it('kapsam değişimi denetim izine kendi satırıyla düşer', async () => {
    const c = await connectorAc();
    await connectorKapsamKaydet({ connectorId: c.id, tesisKodlari: [`${ONEK}-A`] });
    const iz = await db.aktiviteKaydi.findMany({
      where: { varlikTipi: 'Connector', varlikId: c.id, eylem: 'kapsam_degisimi' },
    });
    expect(iz).toHaveLength(1);
    expect(iz[0].oncekiDeger).toBe('sınır yok');
    expect(iz[0].yeniDeger).toBe(`${ONEK}-A`);
  });

  it('boş liste "sınır yok" demektir — kolon null olur, boş dizi bırakılmaz', async () => {
    const c = await connectorAc({ kapsamTesisleriJson: JSON.stringify([`${ONEK}-A`]) });
    await connectorKapsamKaydet({ connectorId: c.id, tesisKodlari: [] });
    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.kapsamTesisleriJson).toBeNull();
    expect(connectorKapsamKodlari({}, sonra.kapsamTesisleriJson)).toBeNull();
  });

  it('tanımlı olmayan santral kodu REDDEDİLİR ve kolon değişmez', async () => {
    const c = await connectorAc({ kapsamTesisleriJson: JSON.stringify([`${ONEK}-A`]) });
    const y = await connectorKapsamKaydet({
      connectorId: c.id, tesisKodlari: [`${ONEK}-A`, `${ONEK}-YOK`] });
    expect(y.ok).toBe(false);
    if (y.ok) return;
    expect(y.hata).toMatch(new RegExp(`${ONEK}-YOK`));
    expect((await db.connector.findUniqueOrThrow({ where: { id: c.id } })).kapsamTesisleriJson)
      .toBe(JSON.stringify([`${ONEK}-A`]));
  });

  it('varsayılan tesis kodu kapsamın dışındaysa yazma REDDEDİLİR', async () => {
    const c = await connectorAc({
      yapilandirmaJson: JSON.stringify({ ...AYARLAR, tesisKodu: `${ONEK}-B` }) });
    const y = await connectorKapsamKaydet({
      connectorId: c.id, tesisKodlari: [`${ONEK}-A`] });
    expect(y.ok).toBe(false);
    if (y.ok) return;
    expect(y.hata).toMatch(/çelişkili/i);
    expect((await db.connector.findUniqueOrThrow({ where: { id: c.id } })).kapsamTesisleriJson)
      .toBeNull();
  });

  it('kapsam GERÇEK KOŞUDA uygulanır: kapsam dışı kayıt yazılmaz', async () => {
    const TIP = `${ONEK}_kapsam_adaptoru`;
    const KAYNAK = benzersiz(`${ONEK}-KOSU`);
    const gozlem = (id: string, ek: Record<string, unknown> = {}): Gozlem => ({
      tip: 'varlik',
      koken: { kaynakSistem: KAYNAK, kaynakKayitId: id, toplanma: new Date(), guven: null },
      hostname: `eyap-${id}`,
      ham: { id },
      ...ek,
    } as Gozlem);
    adaptorKaydet({
      tip: TIP,
      baglanabilir: true,
      yapilandirmaSemasi: z.looseObject({}),
      gerekenSirlar: [],
      async testConnection() { return { ok: true, ayrinti: 'kapsam fikstürü' }; },
      async discover() { return { ozet: 'kapsam fikstürü', tahminiKayit: null }; },
      async fetchChanges(): Promise<CekmeSonucu> {
        return {
          gozlemler: [
            gozlem('ici', { tesisKodu: `${ONEK}-A` }),
            gozlem('disi', { tesisKodu: `${ONEK}-B` }),
          ],
          yeniImlec: null, devamVar: false,
        };
      },
      normalize: () => [],
      validate: (g) => temelDogrula(g),
      async health() {
        return { durum: 'saglikli', ayrinti: 'kapsam fikstürü', tazelikDk: null }; },
    } as Adaptor, true);

    const c = await db.connector.create({ data: {
      kod: benzersiz(`${ONEK}-KC`), ad: 'Kapsam koşusu', tip: TIP,
      kaynakSistem: KAYNAK, etkin: true, durum: 'etkin', yapilandirmaJson: null } });

    // Kapsam YALNIZ eylemle kurulur — testin ölçtüğü tam olarak bu yoldur.
    expect(await connectorKapsamKaydet({
      connectorId: c.id, tesisKodlari: [`${ONEK}-A`] })).toEqual({ ok: true });

    const ozet = await senkronizasyonKos(c.id);
    expect(ozet.durum).toBe('basarili');
    expect(ozet.reddedilen).toBe(1);
    expect(ozet.kabulEdilen).toBe(1);

    expect(await db.kesifKaydi.count({
      where: { kaynak: KAYNAK, kaynakKayitId: 'disi' } })).toBe(0);
    const ici = await db.kesifKaydi.findUniqueOrThrow({
      where: { kaynak_kaynakKayitId: { kaynak: KAYNAK, kaynakKayitId: 'ici' } } });
    expect(ici.tesisId).toBe(kimlik.tesisA);
    adaptorSil(TIP);
  });
});

/* ═══ 3 · İki kaynak — hangisi kazanır ═══════════════════════════════ */

describe('3 · Kapsamın tek doğruluk kaynağı', () => {
  it('kolon ile yapılandırma çakışırsa KOLON kazanır', async () => {
    // Göç etmemiş bir kurulumdan gelmiş gibi: iki kaynak da dolu.
    const c = await connectorAc({
      yapilandirmaJson: JSON.stringify({ ...AYARLAR, kapsamTesisKodlari: [`${ONEK}-B`] }),
      kapsamTesisleriJson: JSON.stringify([`${ONEK}-A`]),
    });

    // Çekirdeğin okuması:
    expect(connectorKapsamKodlari(
      { ...AYARLAR, kapsamTesisKodlari: [`${ONEK}-B`] }, JSON.stringify([`${ONEK}-A`]),
    )).toEqual([`${ONEK}-A`]);

    // Ekranın okuması (aynı fonksiyon üzerinden):
    const g = await connectorKapsamGorunumu(c.id);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.kodlar).toEqual([`${ONEK}-A`]);
    expect(g.kaynak).toBe('kolon');
    expect(g.mirasKodlari).toEqual([`${ONEK}-B`]);
  });

  it('kolon boşken yapılandırma mirası okunur — eski kayıt sessizce sınırsızlaşmaz', async () => {
    const c = await connectorAc({
      yapilandirmaJson: JSON.stringify({ ...AYARLAR, kapsamTesisKodlari: [`${ONEK}-B`] }),
    });
    const g = await connectorKapsamGorunumu(c.id);
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.kodlar).toEqual([`${ONEK}-B`]);
    expect(g.kaynak).toBe('yapilandirma_mirasi');
  });

  it('kapsam kaydedilince miras anahtar yapılandırmadan SİLİNİR — iki dolu kaynak kalmaz',
    async () => {
      const c = await connectorAc({
        yapilandirmaJson: JSON.stringify({ ...AYARLAR, kapsamTesisKodlari: [`${ONEK}-B`] }),
      });
      expect(await connectorKapsamKaydet({
        connectorId: c.id, tesisKodlari: [`${ONEK}-A`] })).toEqual({ ok: true });

      const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
      const yapilandirma = JSON.parse(sonra.yapilandirmaJson!) as Record<string, unknown>;
      expect('kapsamTesisKodlari' in yapilandirma).toBe(false);
      // Adaptör ayarları taşınmada kaybolmaz.
      expect(yapilandirma).toEqual(AYARLAR);
      expect(sonra.kapsamTesisleriJson).toBe(JSON.stringify([`${ONEK}-A`]));
      // Taşıma denetim izine yazılır.
      const iz = await db.aktiviteKaydi.findFirstOrThrow({
        where: { varlikTipi: 'Connector', varlikId: c.id, eylem: 'kapsam_degisimi' } });
      expect(iz.gerekce).toMatch(/miras/i);
    });

  it('yapılandırma JSON\'una kapsam anahtarı YAZILAMAZ — ikinci kaynak açılmaz', async () => {
    const c = await connectorAc({ kapsamTesisleriJson: JSON.stringify([`${ONEK}-A`]) });
    const y = await connectorKaydet({
      id: c.id, kod: c.kod, ad: c.ad, tip: c.tip, kaynakSistem: c.kaynakSistem,
      kimlikTipi: 'none', sirReferansi: null, etkin: false,
      yapilandirmaJson: JSON.stringify({ ...AYARLAR, kapsamTesisKodlari: [`${ONEK}-B`] }),
    });
    expect(y.ok).toBe(false);
    if (y.ok) return;
    expect(y.hata).toMatch(/kapsam/i);
    const sonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(sonra.kapsamTesisleriJson).toBe(JSON.stringify([`${ONEK}-A`]));
    expect(JSON.parse(sonra.yapilandirmaJson!)).toEqual(AYARLAR);
  });
});

/* ═══ 4 · Ekran sözcükleri (saf) ═════════════════════════════════════ */

describe('4 · Kapsam yüzeyinin saf mantığı', () => {
  it('boş kapsam "hiçbiri" değil "sınır yok" diye okunur', () => {
    expect(M.kapsamCumlesi([])).toMatch(/sınır yok/i);
    expect(M.kapsamCumlesi(['A', 'B'])).toBe('2 santral · A, B');
  });

  it('boş seçim, çelişkili varsayılan ve miras anahtar önden uyarılır', () => {
    const g: KapsamGorunumu = {
      kodlar: ['A'], kaynak: 'kolon', mirasKodlari: [],
      varsayilanTesisKodu: 'B', secenekler: [],
    };
    expect(M.kapsamUyarilari([], g)[0]).toMatch(/SINIR YOK/);
    expect(M.kapsamUyarilari(['A'], g)[0]).toMatch(/dışında/);
    expect(M.kapsamUyarilari(['B'], g)).toEqual([]);
    expect(M.kapsamUyarilari(['B'], { ...g, mirasKodlari: ['C'] })[0]).toMatch(/taşınır/);
  });

  it('yalnız sırası değişen seçim DEĞİŞİKLİK sayılmaz (kapsam bir kümedir)', () => {
    expect(M.kapsamDegisti(['A', 'B'], ['B', 'A'])).toBe(false);
    expect(M.kapsamDegisti(['A'], ['A', 'B'])).toBe(true);
    expect(M.kapsamDegisti(['A', 'B'], ['A'])).toBe(true);
  });

  it('kaynak sözcükleri mirası açıkça miras diye adlandırır', () => {
    expect(M.KAPSAM_KAYNAK_SOZU.yapilandirma_mirasi).toMatch(/miras/i);
    expect(M.KAPSAM_KAYNAK_SOZU.yok).toMatch(/tanımlı değil/i);
  });
});

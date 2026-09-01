import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   ATLAS 2 KABUĞU · PR #1 İNCELEME KUSURLARI

   Üç bulgu burada donduruldu. Hepsi "kabuk her ekranda çizilir" olgusundan
   doğuyor: kabukta yapılan bir hata tek ekranın değil, ÜRÜNÜN hatasıdır.

   1 · P2 — Durum ayağı entegrasyon sağlığını yetki sormadan okuyordu.
   2 · P2 — Aynı şerit SİLİNMİŞ connector'ları sayıyordu.
   3 · P1 — Rota duman testi beklenmeyen yönlendirmeyi GEÇTİ sayıyordu.

   TEST_DB, db'ye dokunan HER importtan ÖNCE ayarlanır (proje kalıbı).
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kabuk-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const V = await import('@/components/atlas/durumAyagiVerisi');
const K = await import('../arac/rota-kurallari.mjs');

type Yetki = {
  rol: string; surecId: null; tesisId: string | null;
  tuzelKisiId: null; regulasyonId: null; modul: string | null;
};
type Kisi = Parameters<typeof V.durumAyagiVerisi>[0];

const kullanici = (yetkiler: Yetki[]): Kisi => ({
  id: 'k1', adSoyad: 'Test', eposta: 't@ornek.local', unvan: null,
  yetkiler,
} as unknown as Kisi);

const tam = (rol: string): Yetki => ({
  rol, surecId: null, tesisId: null, tuzelKisiId: null, regulasyonId: null, modul: null,
});

const ONEK = 'KBK';
let silinenKosu: Date;

beforeAll(async () => {
  /* Temiz bir ölçüm için mevcut connector'lar kaldırılır: şerit GRUP GENELİ
     sayar, tohumdaki kayıtlar sayıyı bulanıklaştırırdı. */
  await db.connector.deleteMany({});

  await db.connector.create({ data: {
    kod: `${ONEK}-ETKIN`, ad: 'Etkin', tip: 'cmdb', kaynakSistem: 'ornek.local',
    durum: 'etkin', sonBasariliKosu: new Date('2026-03-01T00:00:00.000Z') } });
  await db.connector.create({ data: {
    kod: `${ONEK}-BEKLEYEN`, ad: 'Bekleyen', tip: 'cmdb', kaynakSistem: 'ornek.local',
    durum: 'kimlik_bekleniyor' } });

  /* SİLİNMİŞ kayıt: durumu 'hatali' ve koşusu HEPSİNDEN YENİ. Süzgeç
     yoksa hem 'hatali 1' görünür hem de "son başarılı koşu" bu tarihe
     kilitlenir — silinmiş bir bağlayıcı sonsuza kadar şeritte yaşardı. */
  silinenKosu = new Date('2026-08-30T00:00:00.000Z');
  await db.connector.create({ data: {
    kod: `${ONEK}-SILINEN`, ad: 'Silinen', tip: 'cmdb', kaynakSistem: 'ornek.local',
    durum: 'hatali', sonBasariliKosu: silinenKosu, silindi: new Date() } });
});

describe('Durum ayağı · yetki kapısı', () => {
  it('yetkisiz kullanıcıya HİÇBİR ŞEY dönmez (boş özet bile değil)', async () => {
    /* `dis_denetci` yalnız denetim ve uyum okur; yönetim modülü yoktur.
       Dış denetçi tam olarak grup geneli bağlayıcı durumunu GÖRMEMESİ
       gereken kullanıcıdır — ve şerit her sayfanın altındaydı. */
    const v = await V.durumAyagiVerisi(kullanici([tam('dis_denetci')]));
    expect(v).toBeNull();
    // 'risk_sahibi' de yönetim taşımaz; kapı role değil İZNE bakar.
    expect(await V.durumAyagiVerisi(kullanici([tam('risk_sahibi')]))).toBeNull();
    /* `okuyucu` yönetim/okuma TAŞIR ve görmelidir: kapı "salt okunur
       kullanıcıyı kes" değil, "yönetim okuma izni olana ver"dir. */
    expect(await V.durumAyagiVerisi(kullanici([tam('okuyucu')]))).not.toBeNull();
  });

  it('oturumsuz istekte sorgu bile yapılmaz', async () => {
    expect(await V.durumAyagiVerisi(null)).toBeNull();
  });

  it('kapı kanonik sağlık özetiyle AYNI izni ister', async () => {
    // Kapı ayrışırsa şerit ile /saglik ekranı farklı şey söyler.
    expect(V.AYAK_MODULU).toBe('yonetim');
    expect(V.AYAK_ISLEMI).toBe('okuma');
    const { entegrasyonSagligiOzeti } = await import('@/lib/entegrasyon/saglikOzeti');
    const ozet = await entegrasyonSagligiOzeti(
      kullanici([tam('dis_denetci')]) as Parameters<typeof entegrasyonSagligiOzeti>[0],
    );
    // Kanonik özet de yetkisiz kullanıcıya veri vermiyor: iki kapı aynı.
    expect(ozet.yetkili).toBe(false);
  });

  it('yetkili kullanıcı sayıları görür', async () => {
    const v = await V.durumAyagiVerisi(kullanici([tam('yonetici')]));
    expect(v).not.toBeNull();
    expect(v!.toplam).toBeGreaterThan(0);
  });
});

describe('Durum ayağı · silinen kayıt sayılmaz', () => {
  it('silinmiş connector ne sayıya ne de son koşuya girer', async () => {
    const v = (await V.durumAyagiVerisi(kullanici([tam('yonetici')])))!;
    expect(v.toplam).toBe(2);
    expect(v.sayimlar.etkin).toBe(1);
    expect(v.sayimlar.kimlik_bekleniyor).toBe(1);
    // Silinen kaydın durumu hiç görünmemeli.
    expect(v.sayimlar.hatali).toBeUndefined();
    // ve onun koşusu "son başarılı koşu" olmamalı — o tarih daha YENİ.
    expect(v.sonKosu?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(v.sonKosu!.getTime()).toBeLessThan(silinenKosu.getTime());
  });

  it('yüklem kanonik sorgunun kullandığıyla aynı', () => {
    expect(V.ETKIN_KAYIT).toEqual({ silindi: null });
  });

  it('hiç bağlayıcı yoksa null DEĞİL, sıfır döner', async () => {
    // "Bağlayıcı yok" bir CEVAPTIR; şerit bunu yazar. `null` ise
    // "gösterme" demektir ve ikisi karıştırılamaz.
    const hepsi = await db.connector.findMany({ select: { id: true } });
    await db.connector.deleteMany({});
    try {
      const v = await V.durumAyagiVerisi(kullanici([tam('yonetici')]));
      expect(v).not.toBeNull();
      expect(v!.toplam).toBe(0);
      expect(v!.sonKosu).toBeNull();
    } finally {
      // Sonraki testler için geri yükleme gerekmiyor; dosya geçicidir.
      expect(hepsi.length).toBeGreaterThan(0);
    }
  });
});

describe('Rota duman · beklenmeyen yönlendirme kusurdur', () => {
  it('yönlendirme yoksa karar sessizdir', () => {
    const k = K.yonlendirmeKarari('/riskler', '/riskler');
    expect(k).toMatchObject({ yonlendi: false, kusur: null, beklentiDevret: false });
  });

  it('bilinçli yönlendirme geçer ve beklentiyi VARIŞA devreder', () => {
    const k = K.yonlendirmeKarari('/tesisler', '/portfoy');
    expect(k.izinli).toBe(true);
    expect(k.kusur).toBeNull();
    // `/portfoy` (tam) katmanındadır, rayı yoktur; kaynağın beklentisiyle
    // ölçmek "ray yok" diye sahte bir kusur üretirdi.
    expect(k.beklentiDevret).toBe(true);
  });

  it('BİLİNEN bir rotaya düşmek bile KUSURDUR — kapsam sayısı örtemez', () => {
    // İncelemedeki tam senaryo: /riskler → / regresyonu 200 döner ve
    // flagship kabuk kontrollerini geçer. Eskiden 40/40 içinde PASS'ti.
    const k = K.yonlendirmeKarari('/riskler', '/');
    expect(k.izinli).toBe(false);
    expect(k.kusur).toMatch(/beklenmeyen yönlendirme/);
    // Beklenti DEVREDİLMEZ: varışın kontrolleriyle ölçülse regresyon
    // görünmez olurdu.
    expect(k.beklentiDevret).toBe(false);
  });

  it('izin TEK YÖNLÜdür ve tam varış eşleşmesi ister', () => {
    // Ters yön izinli değildir.
    expect(K.yonlendirmeIzinli('/portfoy', '/tesisler')).toBe(false);
    // Başka bir varışa gitmek de değildir.
    expect(K.yonlendirmeIzinli('/tesisler', '/')).toBe(false);
    expect(K.yonlendirmeIzinli('/tesisler', '/portfoy')).toBe(true);
  });

  it('listede yalnız gerçekten var olan yönlendirmeler durur', async () => {
    /* Liste elle tutuluyor; koda karşı doğrulanmazsa zamanla bir "izin"
       kalıcı bir körlüğe dönüşür. Kaynakta gerçekten `redirect` çağıran
       sayfa var mı diye bakılır. */
    const { readFileSync } = await import('node:fs');
    for (const [kaynak, hedef] of K.BILINCLI_YONLENDIRME) {
      const dosya = kaynak === '/tesisler'
        ? 'app/(atlas)/(flagship)/tesisler/page.tsx'
        : null;
      expect(dosya, `${kaynak} için kaynak dosya eşlemesi yok`).not.toBeNull();
      const metin = readFileSync(dosya!, 'utf8');
      expect(metin, `${kaynak} artık ${hedef}'e yönlendirmiyor`)
        .toContain(`redirect('${hedef}')`);
    }
  });
});

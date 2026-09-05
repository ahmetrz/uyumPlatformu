import { z } from 'zod';
import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kuru-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { senkronizasyonKos } = await import('@/lib/entegrasyon/cekirdek');
const { adaptorKaydet } = await import('@/lib/entegrasyon/kayit');
const { temelDogrula } = await import('@/lib/entegrasyon/sozlesme');
const { connectorSagligi } = await import('@/lib/entegrasyon/saglikOzeti');
import type {
  Adaptor, AdaptorBaglami as Baglam, CekmeSonucu, Gozlem,
} from '@/lib/entegrasyon/sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   KURU KOŞU (§6) — "hiçbir şey değişmedi" İDDİASININ KANITI

   Bu dosyanın çekirdeği tek bir fikirdir: kuru koşudan ÖNCE ve SONRA
   ilgili tabloların TAM anlık görüntüsü alınır ve bit bit karşılaştırılır.
   Sayım karşılaştırması yetmez — bir satırın alanı değişse sayım aynı
   kalırdı; bu yüzden satırların kendisi karşılaştırılır.

   Dedektörün kendisi de KANITLANIR (mutasyon doğrulaması): aynı
   karşılaştırma, gerçek koşunun yazdıklarını ve elle yapılan tek alanlık
   bir değişikliği YAKALAMALIDIR. Yakalamıyorsa "fark yok" sonucu bir şey
   ispatlamaz. */

/* ═══ Anlık görüntü ═══════════════════════════════════════════════════ */

const TABLO_ADLARI = [
  'Varlik', 'KesifKaydi', 'Zafiyet', 'Risk', 'Bulgu',
  'ProjeAdayi', 'TopolojiAnlik', 'VeriKokeni',
] as const;

type Anlik = Record<(typeof TABLO_ADLARI)[number], unknown[]>;

/** İlgili tabloların TAM içeriği. JSON turu Date'leri kararlı metne
    çevirir; böylece derin karşılaştırma nesne kimliğine değil DEĞERE bakar. */
async function anlikAl(): Promise<Anlik> {
  const sira = { orderBy: { id: 'asc' } } as const;
  const [Varlik, KesifKaydi, Zafiyet, Risk, Bulgu, ProjeAdayi, TopolojiAnlik, VeriKokeni] =
    await Promise.all([
      db.varlik.findMany(sira),
      db.kesifKaydi.findMany(sira),
      db.zafiyet.findMany(sira),
      db.risk.findMany(sira),
      db.bulgu.findMany(sira),
      db.projeAdayi.findMany(sira),
      db.topolojiAnlik.findMany(sira),
      db.veriKokeni.findMany(sira),
    ]);
  return JSON.parse(JSON.stringify({
    Varlik, KesifKaydi, Zafiyet, Risk, Bulgu, ProjeAdayi, TopolojiAnlik, VeriKokeni,
  })) as Anlik;
}

export function sayimlar(a: Anlik): Record<string, number> {
  return Object.fromEntries(TABLO_ADLARI.map((t) => [t, a[t].length]));
}

/** İki anlık görüntü arasındaki farklı tabloları döner (boş = fark yok). */
function farkliTablolar(once: Anlik, sonra: Anlik): string[] {
  return TABLO_ADLARI.filter((t) => JSON.stringify(once[t]) !== JSON.stringify(sonra[t]));
}

/* ═══ Fikstürler ══════════════════════════════════════════════════════ */

function gozlem(id: string, kaynak: string, ek: Record<string, unknown> = {}): Gozlem {
  return {
    tip: 'varlik',
    yetenekler: ['asset_inventory'] as const,
    koken: { kaynakSistem: kaynak, kaynakKayitId: id, toplanma: new Date(), guven: null },
    hostname: `kuru-${id}`,
    ham: { id, kaynak },
    ...ek,
  } as Gozlem;
}

function adaptorYap(tip: string, cek: (b: Baglam) => Promise<CekmeSonucu>): Adaptor {
  const a: Adaptor = {
    tip,
    baglanabilir: true,
    yetenekler: ['asset_inventory'] as const,
    yapilandirmaSemasi: z.looseObject({}),
    gerekenSirlar: [],
    async testConnection() { return { ok: true, ayrinti: 'kuru koşu fikstürü' }; },
    async discover() { return { ozet: 'kuru koşu fikstürü', tahminiKayit: null }; },
    fetchChanges: cek,
    normalize: () => [],
    validate: (g) => temelDogrula(g),
    async health() { return { durum: 'saglikli', ayrinti: 'kuru koşu fikstürü', tazelikDk: null }; },
  } as Adaptor;
  adaptorKaydet(a, true);
  return a;
}

let sayac = 0;
async function connectorYap(tip: string, ek: Record<string, unknown> = {}) {
  sayac++;
  return db.connector.create({ data: {
    kod: `KURU-CON-${sayac}-${Date.now()}`,
    ad: `Kuru koşu connector ${sayac}`,
    tip,
    kaynakSistem: `KURU-SISTEM-${sayac}`,
    etkin: true,
    durum: 'etkin',
    ...ek,
  } });
}

describe('Kuru koşu (§6) — hesaplar, hiçbir şey yazmaz', () => {
  beforeAll(async () => {
    // Bu dosyanın kendi izole kopyası; başka testlerin bıraktığı koşular karışmasın.
    await db.entegrasyonKosusu.deleteMany({ where: { connectorId: { not: null } } });
  });

  it('KANIT: kuru koşu ilgili tabloların TEK BİR SATIRINI bile değiştirmez [SAG-KUR-001]', async () => {
    const kaynak = 'KURU-KANIT';
    /* CMDB'de var olan bir varlığın seri numarasını taşıyan gözlem: kuru
       koşu gerçekten eşleştirme yapsın, "hiç iş yapmadığı için hiçbir şey
       değiştirmedi" gibi boş bir kanıt üretmesin. */
    const mevcutVarlik = await db.varlik.findFirstOrThrow({
      where: { silindi: null },
      select: { id: true, etiket: true },
    });

    adaptorYap('test_kuru_kanit', async () => ({
      gozlemler: [
        gozlem('kk1', kaynak, { etiket: mevcutVarlik.etiket }),          // eşleşecek
        gozlem('kk2', kaynak),                                           // yeni aday
        gozlem('kk3', kaynak, { hostname: null }),                       // anahtarsız → geçersiz
      ],
      yeniImlec: 'kuru-imlec-1', devamVar: false,
    }));
    const c = await connectorYap('test_kuru_kanit', { imlec: 'baslangic' });

    const once = await anlikAl();
    const isKosusuOnce = await db.isKosusu.count();
    const ozet = await senkronizasyonKos(c.id, { kuru: true });
    const sonra = await anlikAl();

    // 1) TAM anlık görüntü aynı — hiçbir satır eklenmedi, silinmedi, değişmedi.
    expect(farkliTablolar(once, sonra)).toEqual([]);
    expect(sonra).toEqual(once);

    // 2) Motor zinciri / eşleştirme işi tetiklenmedi.
    expect(await db.isKosusu.count()).toBe(isKosusuOnce);

    // 3) Connector kaydına dokunulmadı: imleç ilerlemedi, "başarılı koşu" yazılmadı.
    const conSonra = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(conSonra.imlec).toBe('baslangic');
    expect(conSonra.sonBasariliKosu).toBeNull();
    expect(ozet.imlecSonra).toBeNull();

    // 4) Koşu kaydı YAZILDI ve kuru olduğu okunabilir.
    expect(ozet.kuru).toBe(true);
    expect(ozet.durum).toBe('basarili');
    const kosu = await db.entegrasyonKosusu.findUniqueOrThrow({ where: { id: ozet.kosuId! } });
    expect(kosu.kuruKosu).toBe(true);
    expect(kosu.imlecSonra).toBeNull();
    expect(kosu.ayrinti).toContain('KURU KOŞU');
    expect(kosu.kuruOzetJson).not.toBeNull();
    // Özet GEÇERLİ JSON olmalı: kırpılmış metin ekranda "rapor yok" demekti.
    const kuruOzet = JSON.parse(kosu.kuruOzetJson!) as { sayaclar: Record<string, number> };
    expect(kuruOzet.sayaclar.alinan).toBe(3);
  });

  it('MUTASYON DOĞRULAMASI: aynı dedektör gerçek koşunun yazdıklarını YAKALAR', async () => {
    const kaynak = 'KURU-MUTASYON';
    adaptorYap('test_kuru_mutasyon', async () => ({
      gozlemler: [gozlem('m1', kaynak), gozlem('m2', kaynak)],
      yeniImlec: 'm-1', devamVar: false,
    }));
    const c = await connectorYap('test_kuru_mutasyon');

    // (a) Önce kuru koş: fark YOK.
    const once = await anlikAl();
    const kuru = await senkronizasyonKos(c.id, { kuru: true });
    const kuruSonrasi = await anlikAl();
    expect(kuru.durum).toBe('basarili');
    expect(farkliTablolar(once, kuruSonrasi)).toEqual([]);

    // (b) Şimdi GERÇEK koş: aynı dedektör farkı görmeli — görmezse (a) hiçbir şey ispatlamaz.
    const gercek = await senkronizasyonKos(c.id);
    const gercekSonrasi = await anlikAl();
    expect(gercek.durum).toBe('basarili');
    const farklar = farkliTablolar(kuruSonrasi, gercekSonrasi);
    expect(farklar).toContain('KesifKaydi');
    expect(farklar).toContain('VeriKokeni');
    expect(gercekSonrasi).not.toEqual(kuruSonrasi);

    // (c) Tek alanlık elle değişiklik de yakalanmalı (dedektör sayıma değil DEĞERE bakıyor).
    const kayit = await db.kesifKaydi.findFirstOrThrow({ where: { kaynak } });
    await db.kesifKaydi.update({ where: { id: kayit.id }, data: { incelemeNotu: 'mutasyon' } });
    const mutasyonSonrasi = await anlikAl();
    expect(sayimlar(mutasyonSonrasi)).toEqual(sayimlar(gercekSonrasi));   // sayım AYNI
    expect(farkliTablolar(gercekSonrasi, mutasyonSonrasi)).toEqual(['KesifKaydi']);   // ama fark var
  });

  it('kuru koşu sayaçları: alinan/gecerli/gecersiz/eslesen/yeni/yinelenen/bilinmeyen/olusacak/guncellenecek/reddedilecek', async () => {
    const kaynak = 'KURU-SAYAC';
    const mevcutVarlik = await db.varlik.findFirstOrThrow({
      where: { silindi: null },
      select: { etiket: true },
    });
    adaptorYap('test_kuru_sayac', async () => ({
      gozlemler: [
        gozlem('s1', kaynak, { etiket: mevcutVarlik.etiket }),   // eşleşen
        gozlem('s2', kaynak),                                    // yeni
        gozlem('s3', kaynak),                                    // yeni
        gozlem('s4', kaynak, { hostname: null }),                // anahtarsız → geçersiz
      ],
      yeniImlec: null, devamVar: false,
    }));
    const c = await connectorYap('test_kuru_sayac');

    const once = await anlikAl();
    const ilk = await senkronizasyonKos(c.id, { kuru: true });
    expect(await anlikAl()).toEqual(once);

    const s = ilk.kuruOzet!.sayaclar;
    expect(s.alinan).toBe(4);
    expect(s.gecerli).toBe(3);
    expect(s.gecersiz).toBe(1);
    expect(s.reddedilecek).toBe(1);
    expect(s.olusacak).toBe(3);
    expect(s.guncellenecek).toBe(0);
    expect(s.yinelenen).toBe(0);
    expect(s.eslesen).toBe(1);
    expect(s.yeni).toBe(2);
    expect(s.bilinmeyen).toBe(0);
    // sayaç sözleşmesi
    expect(s.alinan).toBe(s.gecerli + s.gecersiz);
    expect(s.eslesen + s.yeni + s.bilinmeyen).toBe(s.olusacak + s.guncellenecek);
    expect(ilk.kuruOzet!.uyarilar.join(' ')).toContain('hiçbir kayıt yazılmadı');

    // GERÇEK koşudan sonra aynı kuru koşu "güncellenecek" demeli — yinelenen doğru sayılır.
    await senkronizasyonKos(c.id);
    const ikinci = await senkronizasyonKos(c.id, { kuru: true });
    const s2 = ikinci.kuruOzet!.sayaclar;
    expect(s2.olusacak).toBe(0);
    expect(s2.guncellenecek).toBe(3);
    expect(s2.yinelenen).toBe(3);
  });

  it('PASİF connector kuru koşabilir — "etkinleştirsem ne olurdu" sorusu bunun için var', async () => {
    const kaynak = 'KURU-PASIF';
    adaptorYap('test_kuru_pasif', async () => ({
      gozlemler: [gozlem('p1', kaynak)], yeniImlec: null, devamVar: false,
    }));
    const c = await connectorYap('test_kuru_pasif', { etkin: false, durum: 'taslak' });

    const once = await anlikAl();
    const kuru = await senkronizasyonKos(c.id, { kuru: true });
    expect(kuru.durum).toBe('basarili');
    expect(kuru.kuruOzet!.sayaclar.olusacak).toBe(1);
    expect(kuru.kuruOzet!.uyarilar.join(' ')).toContain('PASİF');
    expect(await anlikAl()).toEqual(once);

    // GERÇEK koşu hâlâ atlanır: kuru koşu pasifliği delmez.
    const gercek = await senkronizasyonKos(c.id);
    expect(gercek.durum).toBe('atlandi');
    expect(gercek.ayrinti).toContain('pasif');
    expect(await anlikAl()).toEqual(once);
  });

  it('SAĞLIK: kuru koşu "son başarılı koşu" sayılmaz — entegrasyon hâlâ hiç veri getirmemiştir', async () => {
    const kaynak = 'KURU-SAGLIK';
    adaptorYap('test_kuru_saglik', async () => ({
      gozlemler: [gozlem('h1', kaynak)], yeniImlec: null, devamVar: false,
    }));
    const c = await connectorYap('test_kuru_saglik');
    await senkronizasyonKos(c.id, { kuru: true });

    const con = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    const kosular = await db.entegrasyonKosusu.findMany({
      where: { connectorId: c.id }, orderBy: { baslangic: 'desc' },
    });
    expect(kosular.length).toBe(1);
    expect(kosular[0].kuruKosu).toBe(true);

    const saglik = connectorSagligi(con, kosular);
    expect(saglik.durum).toBe('hic_kosmadi');        // 'basarili' DEĞİL
    expect(saglik.hicKosmadi).toBe(true);
    expect(saglik.sonKosu).toBeNull();               // kuru koşu "son koşu" değildir
    expect(saglik.sonKuruKosu?.kuru).toBe(true);     // ama gizlenmez, ayrı alanda durur
    expect(saglik.gecmis).toEqual([]);
    expect(saglik.kuruGecmis.length).toBe(1);
    expect(saglik.sonBasariliKosu).toBeNull();
    expect(saglik.tazelik.durum).toBe('bilinmiyor');

    // Gerçek koşudan sonra sağlık gerçekten 'basarili' olur.
    await senkronizasyonKos(c.id);
    const con2 = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    const kosular2 = await db.entegrasyonKosusu.findMany({
      where: { connectorId: c.id }, orderBy: { baslangic: 'desc' },
    });
    const saglik2 = connectorSagligi(con2, kosular2);
    expect(saglik2.durum).toBe('basarili');
    expect(saglik2.sonKosu?.kuru).toBe(false);
    expect(saglik2.kuruGecmis.length).toBe(1);
  });

  it('yarıda kalmış KURU koşu gerçek koşuyu BLOKLAMAZ ve connector\'ı hatalı yapmaz', async () => {
    const kaynak = 'KURU-BAYAT';
    adaptorYap('test_kuru_bayat', async () => ({
      gozlemler: [gozlem('b1', kaynak)], yeniImlec: null, devamVar: false,
    }));
    const c = await connectorYap('test_kuru_bayat');
    // süreç ölmüş bir KURU koşu: 30 dk önce başlamış, hâlâ 'calisiyor'
    const asili = await db.entegrasyonKosusu.create({ data: {
      kaynak: c.tip, connectorId: c.id, durum: 'calisiyor', kuruKosu: true,
      baslangic: new Date(Date.now() - 30 * 60_000) } });

    const gercek = await senkronizasyonKos(c.id);
    expect(gercek.durum).toBe('basarili');          // kuru kalıntı bloklamadı
    const kapanan = await db.entegrasyonKosusu.findUniqueOrThrow({ where: { id: asili.id } });
    expect(kapanan.durum).toBe('basarisiz');        // 'calisiyor' bırakılmadı
    expect(kapanan.hata).toContain('KURU koşu yarıda kaldı');
    const con = await db.connector.findUniqueOrThrow({ where: { id: c.id } });
    expect(con.durum).toBe('etkin');                // kuru kalıntı connector'ı 'hatali' yapmadı
  });
});

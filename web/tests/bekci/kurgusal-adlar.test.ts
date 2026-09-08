import { describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-kurgusal-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const {
  BEYANLI_GERCEK_ADLAR, GERCEK_AD_BEYANLARI, JENERIK_SISTEMLER, KISILER,
  TUM_KURULUS_ADLARI, TUM_URUN_ADLARI, URUNLER, ZAFIYET_KAYNAK_BICIMI,
  karisikAd,
} = await import('../../prisma/kurgusal-adlar');

/* ═══════════════════════════════════════════════════════════════════════
   KURGUSAL AD BEKÇİSİ — depoya gerçek bir kuruluş adı giremez

   ── DOĞURAN KUSUR (ölçüldü · 8 Eylül 2026) ────────────────────────────
   Tohumda on sekiz GERÇEK şirket adı vardı ve bazılarına uydurma
   güvenlik zafiyeti bağlıydı: bir firma için "uzaktan erişimi var,
   oturum kaydı YOK, kritiklik kritik". Depo public, sayfa YAYINDA ve
   demo dışarıya gösteriliyor — yani gerçek firmalar hakkında gerçekmiş
   gibi okunacak olumsuz bir iddia. Kusur main'e girdi ve yayına çıktı.

   Ürünün kuralı bunu zaten yasaklıyordu; kuralı TUTAN bir şey yoktu.

   ── NİÇİN KARA LİSTE DEĞİL ────────────────────────────────────────────
   "Siemens · ABB · Cisco…" diye bir yasak liste bilinen kötü örnekleri
   yakalar, YARIN eklenecek on dokuzuncuyu yakalamaz. Bu bekçi tersten
   kurulu: ad kaynağı TEKTİR (`prisma/kurgusal-adlar.ts`) ve
   veritabanına oradan gelmeyen bir kuruluş adı düşerse kırmızı yanar.
   Yeni sektör verisi eklendikçe aynı kusur tekrar doğacak; kaynağı tek
   yere bağlamak kalıcı çözümdür.

   ── NEYİ ÖLÇMEZ ───────────────────────────────────────────────────────
   Bekçi VERİTABANINA bakar, kaynak metnine değil: kusur "tohumda bir
   dize var" değil, "ekranda gerçek bir firma adı görünüyor"du. Aradaki
   fark önemli — adı bir değişkene alıp dolambaçtan geçirmek kaynağı
   temiz gösterir, ekranı temizlemez.

   Kamuya açık resmî kaynaklar (CBDDÖ gibi) kurgusallaştırılmaz ve
   listede ADIYLA durur: bir düzenleyici kurumun adı bir iddia değil,
   belgelenmiş bir gerçektir (`CLAUDE.md` §0.2).
   ═══════════════════════════════════════════════════════════════════════ */

const yabanci = (adlar: (string | null)[]) =>
  [...new Set(adlar.filter((x): x is string => !!x))]
    .filter((ad) => !TUM_KURULUS_ADLARI.has(ad));

describe('Kurgusal ad bekçisi · kuruluşlar [URN-KUR-005]', () => {
  it('TEDARİKÇİ adları tek kaynaktan gelir [URN-KUR-005]', async () => {
    const t = await db.tedarikci.findMany({ select: { ad: true } });
    expect(t.length, 'tedarikçi yok — fikstür bozuk, bekçi hiçbir şey ölçmüyor')
      .toBeGreaterThan(0);
    expect(yabanci(t.map((x) => x.ad)),
      'kurgusal-adlar.ts dışından tedarikçi adı: gerçek bir firmaya kurgusal '
      + 'güvenlik verisi bağlanmış olabilir').toEqual([]);
  });

  it('VARLIK üreticileri tek kaynaktan gelir [URN-KUR-005]', async () => {
    /* Nötr bir envanter satırındaki üretici adı da gerçek olmamalı:
       satır bugün nötr, yarın bir zafiyet kaydına bağlanır. */
    const v = await db.varlik.findMany({ select: { uretici: true } });
    expect(yabanci(v.map((x) => x.uretici))).toEqual([]);
  });

  it('YAZILIM üreticileri tek kaynaktan gelir [URN-KUR-005]', async () => {
    const y = await db.yazilimUrunu.findMany({ select: { uretici: true } });
    expect(yabanci(y.map((x) => x.uretici))).toEqual([]);
  });

  it('DENETLEYİCİ adları tek kaynaktan gelir [URN-KUR-005]', async () => {
    const d = await db.denetim.findMany({ select: { denetleyen: true } });
    expect(yabanci(d.map((x) => x.denetleyen))).toEqual([]);
  });

  it('TÜZEL KİŞİ adları tek kaynaktan gelir [URN-KUR-005]', async () => {
    const tk = await db.tuzelKisi.findMany({ select: { ad: true } });
    expect(yabanci(tk.map((x) => x.ad))).toEqual([]);
  });

  it('KİŞİ adları rol taşır, gerçek ad taşımaz [URN-KUR-005]', async () => {
    /* Gerçek bir kişi adı, kurgusal bir yetki ve davranış kaydına
       bağlandığı anda o kişi hakkında bir iddiaya dönüşür. */
    const k = await db.kullanici.findMany({ select: { adSoyad: true } });
    expect(k.length).toBeGreaterThan(0);
    const kume = new Set<string>(KISILER);
    expect(k.map((x) => x.adSoyad).filter((a) => !kume.has(a))).toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   ÜRÜN VE YAZILIM ADLARI

   Kuruluş adı kadar ürün adı da bir iddia taşır: "şu üründe uzaktan
   erişim var, oturum kaydı yok" cümlesi, ürünün adı gerçekse o ürün
   hakkındadır. Aynı bekçi mantığı — ad KAYNAĞI tektir — ürün adlarına da
   uygulanır.

   İSTİSNA SESSİZ DEĞİLDİR: entegrasyon hedefi olarak anılan gerçek bir
   ürün adı (Entra ID, FortiManager) ya da yayımlanmış bir CVE'nin ürünü
   meşrudur, ama `GERCEK_AD_BEYANLARI` içinde kaynağı ve gerekçesiyle
   BEYAN EDİLMİŞ olmalıdır. Beyansız gerçek ad kırmızıdır.
   ═══════════════════════════════════════════════════════════════════════ */

const urunDisi = (adlar: (string | null)[]) =>
  [...new Set(adlar.filter((x): x is string => !!x))]
    .filter((ad) => !TUM_URUN_ADLARI.has(ad) && !BEYANLI_GERCEK_ADLAR.has(ad));

describe('Kurgusal ad bekçisi · ürünler [URN-KUR-006]', () => {
  it('YAZILIM ÜRÜNÜ adları tek kaynaktan gelir [URN-KUR-006]', async () => {
    const y = await db.yazilimUrunu.findMany({ select: { ad: true } });
    expect(y.length, 'yazılım ürünü yok — fikstür bozuk, bekçi ölçmüyor')
      .toBeGreaterThan(0);
    expect(urunDisi(y.map((x) => x.ad)),
      'kurgusal-adlar.ts dışından yazılım adı: gerçek bir ürüne kurgusal '
      + 'zafiyet/EOL verisi bağlanmış olabilir').toEqual([]);
  });

  it('VARLIK modelleri tek kaynaktan gelir [URN-KUR-006]', async () => {
    const v = await db.varlik.findMany({ select: { model: true } });
    expect(urunDisi(v.map((x) => x.model))).toEqual([]);
  });

  it('İŞLETİM SİSTEMİ adları tek kaynaktan gelir [URN-KUR-006]', async () => {
    /* Alan "<ürün> <sürüm>" birleşiğidir ("Demo Sunucu OS 2016"): ÖN EK
       aranır. Sürüm bir ad değildir; listeyi sürüm sayısı kadar
       şişirmek, kaynağı tek tutmayı değil kopyalamayı öğretirdi. */
    const v = await db.varlik.findMany({ select: { isletimSistemi: true } });
    const yabanci = [...new Set(v.map((x) => x.isletimSistemi).filter((x): x is string => !!x))]
      .filter((deger) => ![...URUNLER, ...BEYANLI_GERCEK_ADLAR]
        .some((ad) => deger === ad || deger.startsWith(`${ad} `)));
    expect(yabanci).toEqual([]);
  });

  it('CONNECTOR kaynak sistemi beyanlıdır [URN-KUR-006]', async () => {
    /* Bir connector'ın kaynak sistemi ya kurgusaldır, ya bir TİP
       sözcüğüdür, ya da beyan edilmiş gerçek bir entegrasyon hedefidir.
       Dördüncüsü — sessizce eklenmiş gerçek bir ürün adı — kırmızıdır. */
    const c = await db.connector.findMany({ select: { kaynakSistem: true } });
    expect(c.length).toBeGreaterThan(0);
    const jenerik = new Set<string>(JENERIK_SISTEMLER);
    expect(c.map((x) => x.kaynakSistem)
      .filter((ad) => !TUM_URUN_ADLARI.has(ad) && !BEYANLI_GERCEK_ADLAR.has(ad)
        && !TUM_KURULUS_ADLARI.has(ad) && !jenerik.has(ad))).toEqual([]);
  });

  it('SERTİFİKAYI VEREN beyanlıdır [URN-KUR-006]', async () => {
    /* "Demo " ÖN EKİ BİR KAYNAK DEĞİLDİR. İlk yazımda bu kontrol
       `ad.startsWith('Demo ')` ile geçiyordu ve o kaçak tam olarak bu
       turda düzeltilen kusuru üretirdi: "Demo Ağ Güvenliği FortiManager"
       ve "Demo Entra ID" ikisi de "Demo " ile başlıyordu ve ikisi de
       gerçek bir ürünü kurgusal bir adla birleştiriyordu. Ön ek
       yazılabilir, kaynak yazılamaz; kaynak tektir ve o dosyadır. */
    const s = await db.sertifika.findMany({ select: { veren: true } });
    expect(s.length).toBeGreaterThan(0);
    expect([...new Set(s.map((x) => x.veren).filter((x): x is string => !!x))]
      .filter((ad) => !TUM_KURULUS_ADLARI.has(ad) && !BEYANLI_GERCEK_ADLAR.has(ad)))
      .toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   İSTİSNANIN KENDİ DİŞLERİ

   Beyan tablosu, kara liste yazmamak için kurulan kapının tersinden bir
   BEYAZ LİSTEYE çürümesinin en kolay yoludur: "ileride lazım olur" diye
   ad biriktirilir ve kapı sessizleşir. Üç diş bunu engeller.
   ═══════════════════════════════════════════════════════════════════════ */

describe('Kurgusal ad bekçisi · beyan disiplini [URN-KUR-007]', () => {
  it('her beyan KAYNAK ve GEREKÇE taşır [URN-KUR-007]', () => {
    expect(GERCEK_AD_BEYANLARI.length).toBeGreaterThan(0);
    const eksik = GERCEK_AD_BEYANLARI.filter(
      (b) => !b.ad.trim() || !b.alan.trim() || !b.kaynak.trim() || b.gerekce.trim().length < 40,
    ).map((b) => b.ad);
    expect(eksik, 'beyan kaynaksız ya da gerekçesiz: gerçek bir ad sessiz geçemez')
      .toEqual([]);
  });

  it('KULLANILMAYAN beyan bırakılmaz [URN-KUR-007]', async () => {
    /* Bu diş istisnanın kaçış kapısına dönmesini engeller: veritabanında
       artık geçmeyen bir ad için duran beyan, ileride sessizce
       kullanılacak bir izindir. */
    const metinler = [
      ...(await db.connector.findMany({ select: { ad: true, kaynakSistem: true } }))
        .flatMap((x) => [x.ad, x.kaynakSistem]),
      ...(await db.zafiyet.findMany({ select: { baslik: true } })).map((x) => x.baslik),
      ...(await db.sertifika.findMany({ select: { veren: true } })).map((x) => x.veren),
      ...(await db.varlik.findMany({ select: { isletimSistemi: true } })).map((x) => x.isletimSistemi),
      ...(await db.yazilimUrunu.findMany({ select: { ad: true } })).map((x) => x.ad),
    ].filter((x): x is string => !!x);
    const olu = GERCEK_AD_BEYANLARI
      .filter((b) => !metinler.some((m) => m.includes(b.ad)))
      .map((b) => b.ad);
    expect(olu, 'veritabanında geçmeyen beyan: silin — beyan tablosu ' +
      'ihtiyaç olur diye ad biriktirilen bir liste değildir').toEqual([]);
  });

  it('her ZAFİYET kamuya açık bir kaynağa atıf yapar [URN-KUR-007]', async () => {
    /* Bir zafiyet başlığı ya yayımlanmış bir kaydın alıntısıdır ya da
       uydurma bir güvenlik iddiasıdır; üçüncüsü yoktur. Referans, o
       satırın beyanıdır. */
    const z = await db.zafiyet.findMany({ select: { kaynakRef: true, baslik: true } });
    expect(z.length).toBeGreaterThan(0);
    expect(z.filter((x) => !x.kaynakRef || !ZAFIYET_KAYNAK_BICIMI.test(x.kaynakRef))
      .map((x) => x.baslik)).toEqual([]);
  });

  it('KURGUSAL ad ile GERÇEK ad aynı kayıtta karışmaz [URN-KUR-007]', async () => {
    /* Kurgusallaştırma turunun kendi ürettiği kusur: gerçek bir CVE'ye
       atıf yapan satırın başlığındaki üretici adı kurgusalla
       değiştirilmişti — kayıt kendi kaynağıyla çelişir hâle geldi. */
    const metinler = [
      ...(await db.connector.findMany({ select: { ad: true, kaynakSistem: true } }))
        .flatMap((x) => [x.ad, x.kaynakSistem]),
      ...(await db.zafiyet.findMany({ select: { baslik: true } })).map((x) => x.baslik),
    ].filter((x): x is string => !!x);
    const karisik = metinler
      .map((m) => [m, karisikAd(m)] as const)
      .filter(([, k]) => k !== null)
      .map(([m, k]) => `${m}  ⟵ kurgusal "${k!.kurgusal}" + gerçek "${k!.gercek}"`);
    expect(karisik, 'kurgusal üretici gerçek ürünle birleşmiş: kayıt ' +
      'doğrulanamaz ve ikisi hakkında da yanlış konuşur').toEqual([]);
  });
});

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-oturum-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Yalnız OTURUM kapısı sahtelenir (`yetkiZorunlu`); `izinVar` ve
   `izinliTesisIdleri` GERÇEK kalır. Kapsam testlerinin anlamı buna bağlı:
   erişim kurallarını sahteleseydik "kapsam dışı veri sızmıyor" testi
   kendi sahtesini ölçerdi. Eylem katmanı yetkilerini `sahteKullanici`
   üzerinden değiştiriyoruz — gerçek `izinVar` onları okuyor. */
const sahteKullanici: import('@/lib/auth').AktifKullanici = {
  id: '', adSoyad: 'Test Erişim Sorumlusu', eposta: 'e@test', unvan: null,
  yetkiler: [{ rol: 'yonetici', surecId: null, tesisId: null,
    tuzelKisiId: null, regulasyonId: null, modul: null }],
};

vi.mock('@/lib/erisim', async (asil) => {
  const gercek = await asil<typeof import('@/lib/erisim')>();
  return { ...gercek, yetkiZorunlu: async () => sahteKullanici };
});

const { db } = await import('@/lib/db');
const {
  oturumYaz, uyumsuzOturumlar, tedarikciOturumOzeti, oturumKaynagiBagliMi,
  OTURUM_VARLIK_TIPI,
} = await import('@/lib/entegrasyon/tedarikciOturum');
const { oturumKarariKaydet } = await import('@/lib/eylemler2/tedarikciOturum');
const { tedarikciEkranVerisi } =
  await import('@/app/(kabuk)/(operasyonel)/tedarikciler/veri');

/** Kapsamı tek santrale kısıtlı kullanıcı — gerçek `izinVar` bunu okur. */
const tekSantralKullanicisi = (tesisId: string, id: string) => ({
  id, adSoyad: 'A Santral Yöneticisi', eposta: 'a@test', unvan: null,
  yetkiler: [{ rol: 'tesis_yoneticisi', surecId: null, tesisId,
    tuzelKisiId: null, regulasyonId: null, modul: null }],
});

const SAAT = 3_600_000;
const koken = (id: string) => ({
  kaynakSistem: 'pam-test', kaynakKayitId: id, toplanma: new Date(), guven: null,
});

let siemens: { id: string };   // oturumKaydiVar = true
let ormat: { id: string };     // oturumKaydiVar = false
let vestas: { id: string };    // oturumKaydiVar = null (bilinmiyor)

describe('Tedarikçi erişim oturumu — üç değerli uyum', () => {
  beforeAll(async () => {
    const yonetici = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
    sahteKullanici.id = yonetici.id;
    await db.tedarikciErisimOturumu.deleteMany();
    [siemens, ormat, vestas] = await Promise.all([
      db.tedarikci.findFirstOrThrow({ where: { ad: 'Siemens Energy' }, select: { id: true } }),
      db.tedarikci.findFirstOrThrow({ where: { ad: 'Ormat Technologies' }, select: { id: true } }),
      db.tedarikci.findFirstOrThrow({ where: { ad: 'Vestas' }, select: { id: true } }),
    ]);
  });

  /* ── Kaynak bağlı değilken: "oturum yok" DENMEZ ──────────────────────── */

  it('hiç kayıt yokken durum "kaynak_bagli_degil" — "oturum yok" DEĞİL', async () => {
    expect(await oturumKaynagiBagliMi()).toBe(false);

    const rapor = await uyumsuzOturumlar();
    expect(rapor.kaynakBagli).toBe(false);
    expect(rapor.kapsam).toBe('kaynak_bagli_degil');
    expect(rapor.uyumsuz).toHaveLength(0);
    expect(rapor.bilinmeyen).toHaveLength(0);
    expect(rapor.gerekce).toMatch(/bağlı değil/);
    expect(rapor.gerekce).toMatch(/DEĞİLDİR/);      // "oturum olmadı" iddiası reddediliyor

    const ozet = await tedarikciOturumOzeti(siemens.id);
    expect(ozet.kapsam).toBe('kaynak_bagli_degil');
    expect(ozet.gerekce).not.toMatch(/^Oturum yok/);
    expect(ozet.gerekce).toMatch(/göremiyoruz/);
    // Beyan "kayıt alınıyor" ama akış yok → tutarsızlık raporlanır
    expect(ozet.oturumKaydiBeyani).toBe(true);
    expect(ozet.tutarsizliklar.some((t) => /doğrulanamıyor/.test(t))).toBe(true);
  });

  /* ── Üç değerli alanlar: null ≠ false ────────────────────────────────── */

  it('null ile false ayrı yazılır: verilmeyen alan "yok" değil "bilinmiyor" olur', async () => {
    const { id } = await oturumYaz({
      koken: koken('SES-1'), tedarikciId: siemens.id,
      baslangic: new Date(Date.now() - 3 * SAAT), bitis: new Date(Date.now() - 2 * SAAT),
      onayli: true,           // kanıtlı olumlu
      mfaVar: false,          // kanıtlı olumsuz
      // izlendi verilmedi → null (bilinmiyor), false DEĞİL
      talepReferansi: 'CHG-1001',
    });
    const satir = await db.tedarikciErisimOturumu.findUniqueOrThrow({ where: { id } });
    expect(satir.onayli).toBe(true);
    expect(satir.mfaVar).toBe(false);
    expect(satir.izlendi).toBeNull();
    expect(satir.izlendi).not.toBe(false);
  });

  it('uyumsuz ile bilinmeyen AYRI sayılır, toplanmaz', async () => {
    // 2 · yalnız bilinmeyen alanlar → uyumsuz DEĞİL
    await oturumYaz({
      koken: koken('ORM-1'), tedarikciId: ormat.id,
      baslangic: new Date(Date.now() - 5 * SAAT), bitis: new Date(Date.now() - 4 * SAAT),
      onayli: null, mfaVar: null, izlendi: null,
    });
    // 3 · tamamen uyumlu
    await oturumYaz({
      koken: koken('ORM-2'), tedarikciId: ormat.id,
      baslangic: new Date(Date.now() - 9 * SAAT), bitis: new Date(Date.now() - 8 * SAAT),
      onayli: true, mfaVar: true, izlendi: true, talepReferansi: 'CHG-1002',
    });
    // 4 · izlenmemiş (kanıtlı ihlal) + onay bilinmiyor
    await oturumYaz({
      koken: koken('VES-1'), tedarikciId: vestas.id,
      baslangic: new Date(Date.now() - 20 * SAAT), bitis: new Date(Date.now() - 19 * SAAT),
      izlendi: false,
    });

    const r = await uyumsuzOturumlar();
    expect(r.kapsam).toBe('kayit_var');
    expect(r.toplam).toBe(4);

    // SES-1 (mfaVar=false) ve VES-1 (izlendi=false) uyumsuz
    expect(r.uyumsuz).toHaveLength(2);
    // ORM-1 (hepsi null) yalnız bilinmeyen
    expect(r.bilinmeyen).toHaveLength(1);
    expect(r.uyumluSayisi).toBe(1);
    expect(r.uyumsuz.length + r.bilinmeyen.length + r.uyumluSayisi).toBe(r.toplam);

    // Sayaçlar: olumsuz ile bilinmeyen ayrı kolonlarda
    expect(r.sayaclar.mfasiz).toBe(1);
    expect(r.sayaclar.izlenmeyen).toBe(1);
    expect(r.sayaclar.mfaBilinmiyor).toBe(2);    // ORM-1 ve VES-1
    expect(r.sayaclar.onayBilinmiyor).toBe(2);   // ORM-1 ve VES-1
    expect(r.sayaclar.onaysiz).toBe(0);          // hiçbir oturum "onaysız" DEĞİL

    // Bilinmeyen bir oturum ihlal listesine sızmadı
    const orm1 = r.bilinmeyen[0];
    expect(orm1.ihlaller).toHaveLength(0);
    expect(orm1.bilinmeyenler.length).toBe(3);

    // Uyumsuz oturumun bilinmeyen alanları da ayrıca görünür
    const ves = r.uyumsuz.find((d) => d.oturum.tedarikciId === vestas.id);
    expect(ves?.ihlaller).toHaveLength(1);
    expect(ves?.bilinmeyenler).toHaveLength(2);
  });

  /* ── Idempotency ─────────────────────────────────────────────────────── */

  it('aynı kaynak kaydı ikinci kez yazılınca yeni satır AÇILMAZ, tazelenir', async () => {
    const once = await db.tedarikciErisimOturumu.count();
    const ilk = await oturumYaz({
      koken: koken('SES-9'), tedarikciId: siemens.id,
      baslangic: new Date(Date.now() - 40 * SAAT), onayli: null, durum: 'suruyor',
    });
    expect(ilk.yeni).toBe(true);

    // Aynı kaynak kaydı, bu kez kapanmış ve onayı bulunmuş hâliyle geliyor
    const tekrar = await oturumYaz({
      koken: koken('SES-9'), tedarikciId: siemens.id,
      baslangic: new Date(Date.now() - 40 * SAAT), bitis: new Date(Date.now() - 39 * SAAT),
      onayli: true, durum: 'tamamlandi',
    });
    expect(tekrar.yeni).toBe(false);
    expect(tekrar.id).toBe(ilk.id);
    expect(await db.tedarikciErisimOturumu.count()).toBe(once + 1);

    const satir = await db.tedarikciErisimOturumu.findUniqueOrThrow({ where: { id: ilk.id } });
    expect(satir.durum).toBe('tamamlandi');
    expect(satir.onayli).toBe(true);

    // Köken satırı da çoğalmadı
    const kokenler = await db.veriKokeni.findMany({
      where: { varlikTipi: OTURUM_VARLIK_TIPI, kaynakSistem: 'pam-test', kaynakKayitId: 'SES-9' } });
    expect(kokenler).toHaveLength(1);
  });

  /* ── Köken ───────────────────────────────────────────────────────────── */

  it('her oturum için köken kaydı düşer; doğrulama insana bırakılır', async () => {
    const { id } = await oturumYaz({
      koken: { kaynakSistem: 'vpn-test', kaynakKayitId: 'VPN-77', toplanma: new Date(), guven: null },
      tedarikciAdi: 'Vestas',   // ad üzerinden çözüm
      baslangic: new Date(Date.now() - 2 * SAAT), izlendi: true, mfaVar: true, onayli: true,
    });
    const k = await db.veriKokeni.findFirstOrThrow({
      where: { varlikTipi: OTURUM_VARLIK_TIPI, varlikId: id } });
    expect(k.kaynakSistem).toBe('vpn-test');
    expect(k.kaynakKayitId).toBe('VPN-77');
    expect(k.kokenTipi).toBe('otomatik');
    expect(k.dogrulamaDurumu).toBe('dogrulanmadi'); // motor kendi verisini doğrulayamaz
    expect(k.guven).toBeNull();                     // ölçülmedi ≠ sıfır güven

    const satir = await db.tedarikciErisimOturumu.findUniqueOrThrow({ where: { id } });
    expect(satir.tedarikciId).toBe(vestas.id);
  });

  it('kökeni ya da tedarikçisi çözülemeyen oturum SESSİZCE ATILMAZ, fırlatır', async () => {
    await expect(oturumYaz({
      koken: { kaynakSistem: '', kaynakKayitId: 'A', toplanma: new Date(), guven: null },
      tedarikciId: siemens.id, baslangic: new Date(),
    })).rejects.toThrow(/kaynakSistem/);

    await expect(oturumYaz({
      koken: koken('X-1'), tedarikciAdi: 'Olmayan Tedarikçi A.Ş.', baslangic: new Date(),
    })).rejects.toThrow(/eşleşmedi/);

    await expect(oturumYaz({
      koken: koken('X-2'), baslangic: new Date(),
    })).rejects.toThrow(/tedarikciId ya da tedarikciAdi/);

    await expect(oturumYaz({
      koken: koken('X-3'), tedarikciId: siemens.id,
      baslangic: new Date(), bitis: new Date(Date.now() - SAAT),
    })).rejects.toThrow(/bitis/);
  });

  /* ── Özet: filtre boşluğu da "yok" sayılmaz ──────────────────────────── */

  it('kaynak bağlıyken kaydı olmayan tedarikçi için "oturum yok" denmez', async () => {
    const bosTedarikci = await db.tedarikci.findFirstOrThrow({
      where: { ad: 'Honeywell' }, select: { id: true } });
    const ozet = await tedarikciOturumOzeti(bosTedarikci.id);
    expect(ozet.kapsam).toBe('kayit_yok');
    expect(ozet.toplam).toBe(0);
    expect(ozet.gerekce).toMatch(/kapsamı dışında kalmış olabilir/);
    // oturumKaydiVar = null → "izlenmiyor" DEĞİL, "bilinmiyor"
    expect(ozet.oturumKaydiBeyani).toBeNull();
    expect(ozet.tutarsizliklar.some((t) => /BİLİNMİYOR/.test(t))).toBe(true);
  });

  it('özet beyan ile gerçek akışın çeliştiğini söyler', async () => {
    const ozet = await tedarikciOturumOzeti(ormat.id);
    // Beyan "oturum kaydı alınmıyor" ama kaynaktan 2 oturum geliyor
    expect(ozet.oturumKaydiBeyani).toBe(false);
    expect(ozet.toplam).toBe(2);
    expect(ozet.tutarsizliklar.some((t) => /beyan güncellenmeli/.test(t))).toBe(true);

    const ves = await tedarikciOturumOzeti(vestas.id);
    expect(ves.uyumsuzSayisi).toBe(1);
    expect(ves.tutarsizliklar.some((t) => /izlenmemiş/.test(t))).toBe(true);
    expect(ves.kaynakSistemler).toEqual(['pam-test', 'vpn-test']);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   §18 · TEDARİKÇİ EKRANI — ÖNERİ, KARAR VE KAPSAM

   Üç sözleşme maddesi burada ölçülür:

   1. UYUMSUZ OTURUM OTOMATİK KAPATILMAZ. Ekran öneriyi sunar; karar
      insanındır ve karar GÖZLEM SATIRINA DOKUNMAZ. Platform PAM değildir;
      oturumu kapattığını sanan bir kayıt, kapanmadığını fark etmemekten
      daha tehlikelidir.
   2. Karar denetim izine düşer: kim, ne zaman, ne karar, hangi gerekçe.
   3. Kapsam dışı santralin verisi ekrana SIZMAZ — ne satırda ne metrikte.
   ═══════════════════════════════════════════════════════════════════════ */

describe('§18 · Uyumsuz oturum bir ÖNERİdir — otomasyon kapatmaz', () => {
  let uyumsuzId = '';

  beforeAll(async () => {
    const { id } = await oturumYaz({
      koken: koken('KARAR-1'), tedarikciId: vestas.id,
      baslangic: new Date(Date.now() - 2 * SAAT),
      onayli: false, mfaVar: false, izlendi: null, durum: 'suruyor',
    });
    uyumsuzId = id;
  });

  it('karar kaydı oturum satırını DEĞİŞTİRMEZ — oturum sürüyor kalır', async () => {
    const once = await db.tedarikciErisimOturumu.findUniqueOrThrow({ where: { id: uyumsuzId } });
    expect(once.durum).toBe('suruyor');

    const sonuc = await oturumKarariKaydet({
      oturumId: uyumsuzId, karar: 'kapatma_talebi',
      gerekce: 'Onaysız ve MFA\'sız erişim; saha ekibi bağlantıyı kesecek',
    });
    expect(sonuc).toEqual({ ok: true });

    const sonra = await db.tedarikciErisimOturumu.findUniqueOrThrow({ where: { id: uyumsuzId } });
    // Gözlem satırının HİÇBİR alanı kararla değişmez: kaynak ne diyorsa o.
    expect(sonra.durum).toBe('suruyor');
    expect(sonra.bitis).toBeNull();
    expect(sonra.onayli).toBe(false);
    expect(sonra.mfaVar).toBe(false);
    expect(sonra.izlendi).toBeNull();
  });

  it('karar denetim izine düşer ve kapatma talebi bir GÖREV açar', async () => {
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'TedarikciErisimOturumu', varlikId: uyumsuzId,
        eylem: 'oturum_karari' },
      orderBy: { zaman: 'desc' },
    });
    expect(iz).not.toBeNull();
    expect(iz?.aktorId).toBe(sahteKullanici.id);
    expect(iz?.alan).toBe('kapatma_talebi');
    expect(iz?.gerekce).toMatch(/saha ekibi/);
    // Kanıtlı ihlaller karara yazılır; ölçülmemiş alan (izlendi=null) YAZILMAZ.
    expect(iz?.oncekiDeger).toMatch(/onaysız/);
    expect(iz?.oncekiDeger).toMatch(/MFA yok/);
    expect(iz?.oncekiDeger).not.toMatch(/izlenmemiş/);

    const gorev = await db.gorev.findFirst({
      where: { tip: 'erisim_incelemesi', baslik: { contains: 'Vestas' } },
      orderBy: { olusturuldu: 'desc' },
    });
    expect(gorev).not.toBeNull();
    // Görev insana verilir; platform erişimi kendisi kesmez.
    expect(gorev?.otomatikUretildi).toBe(false);
  });

  it('gerekçesiz karar reddedilir ve hiçbir iz/görev yazılmaz', async () => {
    const izOnce = await db.aktiviteKaydi.count({ where: { eylem: 'oturum_karari' } });
    const gorevOnce = await db.gorev.count({ where: { tip: 'erisim_incelemesi' } });

    const sonuc = await oturumKarariKaydet({
      oturumId: uyumsuzId, karar: 'istisna', gerekce: 'kısa' });
    expect(sonuc.ok).toBe(false);

    expect(await db.aktiviteKaydi.count({ where: { eylem: 'oturum_karari' } })).toBe(izOnce);
    expect(await db.gorev.count({ where: { tip: 'erisim_incelemesi' } })).toBe(gorevOnce);
  });

  it('geçersiz karar tipi kabul edilmez — "kapat" diye bir karar YOKTUR', async () => {
    const sonuc = await oturumKarariKaydet({
      oturumId: uyumsuzId, karar: 'oturumu_kapat',
      gerekce: 'Bu eylem platformda bulunmuyor olmalı' });
    expect(sonuc.ok).toBe(false);
    const sonra = await db.tedarikciErisimOturumu.findUniqueOrThrow({ where: { id: uyumsuzId } });
    expect(sonra.durum).toBe('suruyor');
  });
});

describe('§18 · Tedarikçi ekranı kapsamı — çapraz santral okuma sızmaz', () => {
  it('tek santrale yetkili kullanıcıya diğer santralin varlığı, riski, oturumu GÖRÜNMEZ',
    async () => {
      const [tesisA, tesisB] = await db.tesis.findMany({
        where: { durum: 'aktif' }, take: 2, orderBy: { kod: 'asc' } });
      expect(tesisB).toBeDefined();

      /* (0) Yasak verinin GERÇEKTEN VAR OLDUĞUNU önce doğrula: "dönmedi"
         ile "zaten yoktu" birbirine karışmasın. */
      const bVarligi = await db.varlik.findFirst({
        where: { tesisId: tesisB.id, silindi: null, tedarikciId: { not: null } },
        select: { id: true, tedarikciId: true, etiket: true },
      });
      expect(bVarligi).not.toBeNull();

      // B santralinde, B'nin tedarikçisine ait UYUMSUZ bir oturum kur.
      await oturumYaz({
        koken: koken('KAPSAM-B'), tedarikciId: bVarligi!.tedarikciId as string,
        tesisId: tesisB.id,
        baslangic: new Date(Date.now() - 3 * SAAT),
        onayli: false, mfaVar: false, izlendi: false,
      });

      const yonetici = await db.kullanici.findFirstOrThrow({ where: { aktif: true } });
      const kisitli = tekSantralKullanicisi(tesisA.id, yonetici.id);

      const { tedarikciler, sertifikaUfku } = await tedarikciEkranVerisi(kisitli);

      /* (a) Hiçbir satır B santralini adıyla, koduyla ya da kimliğiyle
         taşımıyor — santral bağı, sertifika ve risk dâhil. */
      const seri = JSON.stringify(tedarikciler);
      expect(seri).not.toContain(tesisB.id);
      expect(seri).not.toContain(tesisB.kod);
      expect(seri).not.toContain(bVarligi!.etiket);

      for (const t of tedarikciler) {
        for (const s of t.santraller) expect(s.id).toBe(tesisA.id);
        // (b) Metrikler de daraltılmış veriden: B'nin uyumsuz oturumu sayılmaz.
        for (const o of t.oturumlar) {
          expect(o.tesisId === null || o.tesisId === tesisA.id).toBe(true);
        }
      }

      const uyumsuzToplam = tedarikciler.reduce((a, t) => a + t.oturum.uyumsuzSayisi, 0);
      const olculenToplam = tedarikciler.reduce((a, t) => a + t.oturum.toplam, 0);
      const bTedarikcisi = tedarikciler.find((t) => t.id === bVarligi!.tedarikciId);
      expect(bTedarikcisi).toBeDefined();
      // B'deki uyumsuz oturum kısıtlı kullanıcının sayacına GİRMEZ.
      expect(bTedarikcisi!.oturum.uyumsuzSayisi).toBe(0);
      expect(bTedarikcisi!.oturum.toplam).toBe(0);

      /* (c) Kapsamsız kullanıcı AYNI çağrıda B'yi görüyor: test "her şeyi
         gizle" ölçmüyor, sınırın doğru yerden geçtiğini ölçüyor. */
      const genis = await tedarikciEkranVerisi(sahteKullanici);
      const genisSeri = JSON.stringify(genis.tedarikciler);
      expect(genisSeri).toContain(tesisB.id);
      const genisUyumsuz = genis.tedarikciler.reduce((a, t) => a + t.oturum.uyumsuzSayisi, 0);
      const genisOlculen = genis.tedarikciler.reduce((a, t) => a + t.oturum.toplam, 0);
      expect(genisUyumsuz).toBeGreaterThan(uyumsuzToplam);
      expect(genisOlculen).toBeGreaterThan(olculenToplam);
      expect(genis.sertifikaUfku.dolmus).toBeGreaterThanOrEqual(sertifikaUfku.dolmus);
    });

  it('kapsam dışı oturumda karar VERİLEMEZ ve gözlem değişmez', async () => {
    const [tesisA, tesisB] = await db.tesis.findMany({
      where: { durum: 'aktif' }, take: 2, orderBy: { kod: 'asc' } });
    const bOturumu = await db.tedarikciErisimOturumu.findFirstOrThrow({
      where: { tesisId: tesisB.id } });

    const eskiYetkiler = sahteKullanici.yetkiler;
    sahteKullanici.yetkiler = [{ rol: 'tesis_yoneticisi', surecId: null,
      tesisId: tesisA.id, tuzelKisiId: null, regulasyonId: null, modul: null }];
    try {
      const sonuc = await oturumKarariKaydet({
        oturumId: bOturumu.id, karar: 'istisna',
        gerekce: 'Kapsam dışı olduğu için bu karar yazılmamalı' });
      expect(sonuc.ok).toBe(false);
      if (!sonuc.ok) expect(sonuc.hata).toMatch(/kapsam/i);

      expect(await db.aktiviteKaydi.count({
        where: { varlikTipi: 'TedarikciErisimOturumu', varlikId: bOturumu.id },
      })).toBe(0);
    } finally {
      sahteKullanici.yetkiler = eskiYetkiler;
    }
  });

  it('kapsam sınırı özet sayaçlarında da geçerli — satır gizlense bile sayı sızmaz',
    async () => {
      const [tesisA] = await db.tesis.findMany({
        where: { durum: 'aktif' }, take: 1, orderBy: { kod: 'asc' } });
      const dar = await tedarikciOturumOzeti(vestas.id, { tesisIdler: [tesisA.id] });
      const genis = await tedarikciOturumOzeti(vestas.id, { tesisIdler: null });

      // Seed oturumlarının tesisId'si null; kapsamı daraltılmış kullanıcı
      // "santrali bilinmeyen" oturumu GÖRMEZ (lib/api/yetki.ts ile aynı kural).
      expect(dar.toplam).toBe(0);
      expect(genis.toplam).toBeGreaterThan(0);
      expect(dar.kaynakSistemler).toHaveLength(0);
      expect(dar.suren).toBe(0);
      // Sıfır bir SONUÇ değil: kapsam cümlesi "oturum yok" demez.
      expect(dar.gerekce).not.toMatch(/^Oturum yok/);
    });
});

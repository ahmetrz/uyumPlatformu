import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   R-F · S2 · ÜRÜN DEĞİŞMEZLERİNİN GERÇEK YOLU [SIS-DGM-003]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   Bağımsız inceleme (Brief L · tur 1) politika türeticisinin yalnız
   tırnaklı dize sabitlerini taradığını ölçtü; genişletilen türetici
   131 → 184 cümle buldu ve açılan borcun S2 kısmı burada ölçülür.

   S2 = ürünün DEĞİŞMEZİ. İhlali veri sızdırmaz (o S1'dir) ama ürünün
   temel vaadini bozar: "motor önerir, insan karar verir" · "kuru koşu
   yazmaz" · "kayıt silinmez, durumu değişir" · "bilinmeyen ≠ sıfır".

   ── ÖLÇÜT ─────────────────────────────────────────────────────────────
   Her cümle, iddiayı UYGULAYAN kodun GERÇEK yolunu süren bir vaka ile
   ölçülür. Cümlenin doğru yazılmış olması ve kodun doğru olması, ikisi
   arasındaki BAĞI kurmuş saymaz (R-F).

   Vakaların çoğu KARŞI TANIK taşır: "motor alanı doldurmadı" ölçümü,
   motor hiç koşmadıysa da yeşil yanar. Karşı tanık, ölçümün gerçekten
   bir şey ölçtüğünü gösterir.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-s2d-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

const { db } = await import('@/lib/db');

const damga = Date.now();
type Yetki = {
  rol: string; modul: string | null; kapsamOgesiId: string | null;
  surecId: string | null; regulasyonId: string | null;
};
const oturum = {
  id: '', adSoyad: 'Kurgusal S2D', eposta: `s2d-${damga}@kurgusal.local`,
  unvan: null, yetkiler: [] as Yetki[],
};
vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum };
});
const rol = (r: string): Yetki[] =>
  [{ rol: r, modul: null, kapsamOgesiId: null, surecId: null, regulasyonId: null }];

beforeAll(async () => {
  const k = await db.kullanici.create({
    data: { eposta: oturum.eposta, adSoyad: oturum.adSoyad, aktif: true },
  });
  oturum.id = k.id;
  oturum.yetkiler = rol('yonetici');
});
afterAll(async () => { await db.$disconnect(); await rm(dizin, { recursive: true, force: true }); });

const izSayisi = () => db.aktiviteKaydi.count();

/* ═══ 1 · KURU KOŞU HİÇBİR ŞEYE DOKUNMAZ ═════════════════════════════ */

describe('POL-149 · "Kuru koşu kayıtları hiçbir değerlendirmeye dokunmaz" [SIS-DGM-003]', () => {
  it('KURU KOŞU madde durumlarını DEĞİŞTİRMEZ; uygulama kaydı kuru koşuya BAĞLIDIR [SIS-DGM-003]', async () => {
    const { degerlendirmeKuruKosu, degerlendirmeAktarimiUygula } =
      await import('@/lib/eylemler2/degerlendirmeAktarimi');

    /* Gerçek bir madde durumu bulunur — satır KODU ile eşleşecek. */
    const md = await db.maddeDurumu.findFirst({
      where: { madde: { silindi: null } },
      select: {
        id: true, durum: true, kapsamOgesiId: true, surecId: true,
        madde: { select: { kod: true, regulasyonId: true } },
      },
    });
    expect(md, 'madde durumu fikstürü yok — vaka kurulamıyor').not.toBeNull();
    /* Durum SÖZLÜKTEN seçilir: uydurma bir değer eleme sebebine düşer ve
       vaka "kuru koşu dokunmadı" derken aslında satırın hiç okunmadığını
       ölçmüş olurdu. */
    const { AKTARILABILIR_DURUMLAR } = await import('@/lib/uyum/degerlendirmeAktarimi');
    const yeniDurum = AKTARILABILIR_DURUMLAR.find((d) => d !== md!.durum)!;

    const kuru = await degerlendirmeKuruKosu({
      regulasyonId: md!.madde.regulasyonId,
      kapsamOgesiId: md!.kapsamOgesiId,
      surecId: md!.surecId,
      kaynakAdi: `kurgusal-aktarim-${damga}.csv`,
      satirlar: [{
        satirNo: 1, maddeKodu: md!.madde.kod, durum: yeniDurum,
        not: null, gerekce: 'Kurgusal aktarım gerekçesi',
      }],
    }) as { ok: boolean; aktarimId?: string; hata?: string };
    expect(kuru.ok, `kuru koşu reddedildi: ${kuru.hata ?? ''}`).toBe(true);

    /* (1) HİÇBİR DEĞERLENDİRME DOKUNULMADI. */
    const kuruSonrasi = await db.maddeDurumu.findUnique({ where: { id: md!.id } });
    expect(kuruSonrasi?.durum, 'KURU koşu madde durumunu DEĞİŞTİRDİ').toBe(md!.durum);
    expect(await db.degerlendirmeTarihcesi.count({ where: { maddeDurumuId: md!.id } }),
      'kuru koşu değerlendirme tarihçesi yazdı')
      .toBe(await db.degerlendirmeTarihcesi.count({
        where: { maddeDurumuId: md!.id, aktorId: { not: oturum.id } },
      }));

    /* (2) KARŞI TANIK · UYGULAMA gerçekten değiştirir. Değiştirmeseydi
       üstteki "değişmedi" ölçümü hiçbir şey ölçmezdi. */
    const uyg = await degerlendirmeAktarimiUygula({
      kuruKosuId: kuru.aktarimId!,
      gerekce: 'Kurgusal uygulama gerekçesi — en az on karakter.',
    }) as { ok: boolean; degisen?: number; aktarimId?: string; hata?: string };
    expect(uyg.ok, `uygulama reddedildi: ${uyg.hata ?? ''}`).toBe(true);
    const uygSonrasi = await db.maddeDurumu.findUnique({ where: { id: md!.id } });
    expect(uygSonrasi?.durum, 'uygulama da değiştirmedi — vaka boşa koştu').toBe(yeniDurum);

    /* (3) KÖKEN BAĞI · uygulama kaydı KENDİ kuru koşusuna bağlıdır. */
    const uygulama = await db.degerlendirmeAktarimi.findUnique({
      where: { id: uyg.aktarimId! },
      select: { durum: true, kuruKosuId: true },
    });
    expect(uygulama?.durum, 'uygulama kaydı "uygulandi" değil').toBe('uygulandi');
    expect(uygulama?.kuruKosuId, 'uygulama kaydı kendi kuru koşusuna bağlı değil')
      .toBe(kuru.aktarimId);
  });
});

describe('POL-155 · "Bu prova hiçbir şey YAZMAZ ve hiçbir dış sisteme BAĞLANMAZ" [SIS-DGM-003]', () => {
  it('EŞLEME PROVASI hiçbir tabloya yazmaz ve ağa çıkmaz [SIS-DGM-003]', async () => {
    const { eslemeOnizle } = await import('@/lib/eylemler2/esleme');

    /* Ağ ilkelleri fırlatan sahteyle değiştirilir: "bağlanmaz" iddiası
       kaynağı okuyarak değil, çıkışı KAPATARAK ölçülür. */
    const asilFetch = globalThis.fetch;
    let agDenemesi = 0;
    globalThis.fetch = (() => {
      agDenemesi += 1;
      throw new Error('Prova ağa çıktı — POL-155 ihlali');
    }) as typeof fetch;

    const oncekiIz = await izSayisi();
    const oncekiProfil = await db.eslemeProfili.count();
    try {
      const s = await eslemeOnizle({
        kurallar: [{ kaynakAlan: 'name', hedefAlan: 'etiket' }] as never,
        ornekJson: JSON.stringify({ name: 'Kurgusal cihaz' }),
      }) as { ok: boolean; satirlar?: unknown[]; hata?: string };
      expect(s.ok, `prova reddedildi: ${s.hata ?? ''}`).toBe(true);
      expect(s.satirlar?.length, 'prova hiç satır üretmedi — vaka boşa koştu').toBe(1);
    } finally { globalThis.fetch = asilFetch; }

    expect(agDenemesi, 'prova dış sisteme BAĞLANDI').toBe(0);
    expect(await db.eslemeProfili.count(), 'prova eşleme profili YAZDI')
      .toBe(oncekiProfil);
    expect(await izSayisi(), 'okuma yolu olan prova denetim izi yazdı').toBe(oncekiIz);
  });
});

/* ═══ 2 · KAYIT SİLİNMEZ, DURUMU DEĞİŞİR ═════════════════════════════ */

describe('POL-175 · POL-164 · "Kayıt silinmez, durumu değişir" · hukuki muhafaza [SIS-DGM-003]', () => {
  it('KALDIRILAN hold SİLİNMEZ — ne zaman konduğu ve kalktığı kayıtta DURUR [SIS-DGM-003]', async () => {
    const { legalHoldKoy, legalHoldKaldir } = await import('@/lib/eylemler2/saklama');
    const once = await db.legalHold.count();

    const k = await legalHoldKoy({
      ad: `Kurgusal muhafaza ${damga}`, varlikTipi: 'Bulgu',
      gerekce: 'Kurgusal dava dosyası gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(k.ok, `hold konamadı: ${k.hata ?? ''}`).toBe(true);
    const hold = await db.legalHold.findFirst({
      where: { ad: `Kurgusal muhafaza ${damga}` },
    });
    expect(hold, 'hold kaydı yazılmadı').not.toBeNull();
    expect(hold?.durum, 'yeni hold aktif doğmadı').toBe('aktif');

    const s = await legalHoldKaldir({
      id: hold!.id, gerekce: 'Kurgusal kaldırma gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `hold kaldırılamadı: ${s.hata ?? ''}`).toBe(true);

    /* SİLİNMEDİ: satır duruyor, sayı artmış hâlde kaldı. */
    expect(await db.legalHold.count(), 'kaldırılan hold SİLİNDİ').toBe(once + 1);
    const sonra = await db.legalHold.findUnique({ where: { id: hold!.id } });
    expect(sonra, 'kaldırılan hold kayboldu').not.toBeNull();
    /* DURUMU DEĞİŞTİ ve İKİ ZAMAN da okunabilir. */
    expect(sonra?.durum, 'durum değişmedi').toBe('kaldirildi');
    expect(sonra?.konuldu, 'ne zaman KONDUĞU okunamıyor').toBeTruthy();
    expect(sonra?.kaldirildi, 'ne zaman KALKTIĞI okunamıyor').toBeTruthy();
    expect(sonra?.kaldirmaGerekcesi, 'kaldırma gerekçesi yazılmadı')
      .toBe('Kurgusal kaldırma gerekçesi');
  });

  it('ONAYDAN SONRA konan hold imhayı DURDURUR — hiçbir kayıt silinmez [SIS-DGM-003]', async () => {
    /* POL-164'ün asıl iddiası: "Hukuki muhafaza uygulama anında YENİDEN
       sorulur." Onay anında hold yoktu; uygulama anında var. Kapı
       uygulama anında sormasaydı, onaylı bir kararın arkasından gelen
       muhafaza sessizce delinirdi. */
    const {
      saklamaPolitikasiKaydet, imhaOnerisiAc, imhaKarariniOnayla,
      imhaKarariniUygula, legalHoldKoy,
    } = await import('@/lib/eylemler2/saklama');

    /* Süresi dolmuş bir bildirim kaydı kurulur — imhanın kapsayacağı tip. */
    await db.bildirim.create({ data: {
      kullaniciId: oturum.id, baslik: `Kurgusal eski bildirim ${damga}`,
      olusturuldu: new Date(Date.now() - 400 * 86_400_000),
    } });
    const p = await saklamaPolitikasiKaydet({
      varlikTipi: 'Bildirim', saklamaGun: 30, aktif: true,
      sureSonu: 'imha_oner', dayanak: 'Kurgusal saklama dayanağı',
    }) as { ok: boolean; hata?: string };
    expect(p.ok, `politika yazılamadı: ${p.hata ?? ''}`).toBe(true);

    const a = await imhaOnerisiAc({
      varlikTipi: 'Bildirim', gerekce: 'Kurgusal imha önerisi gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(a.ok, `öneri açılamadı: ${a.hata ?? ''}`).toBe(true);
    const karar = await db.imhaKarari.findFirst({
      where: { varlikTipi: 'Bildirim', durum: 'oneri' },
      orderBy: { olusturuldu: 'desc' },
    });
    expect(karar, 'imha kararı yazılmadı').not.toBeNull();

    /* DÖRT GÖZ: öneren kendi önerisini onaylayamaz — ayrı onaylayan. */
    const onaylayan = await db.kullanici.create({ data: {
      eposta: `onay-164-${damga}@kurgusal.local`, adSoyad: 'Kurgusal Onaylayan', aktif: true,
    } });
    const eskiKisi = oturum.id;
    oturum.id = onaylayan.id;
    try {
      const o = await imhaKarariniOnayla({
        id: karar!.id, gerekce: 'Kurgusal onay gerekçesi',
      }) as { ok: boolean; hata?: string };
      expect(o.ok, `karar onaylanamadı: ${o.hata ?? ''}`).toBe(true);

      /* ONAYDAN SONRA hold konur. */
      const h = await legalHoldKoy({
        ad: `Kurgusal geç muhafaza ${damga}`, varlikTipi: 'Bildirim',
        gerekce: 'Kurgusal geç muhafaza gerekçesi',
      }) as { ok: boolean; hata?: string };
      expect(h.ok, `geç hold konamadı: ${h.hata ?? ''}`).toBe(true);

      const bildirimOnce = await db.bildirim.count();
      const u = await imhaKarariniUygula({ id: karar!.id }) as
        { ok: boolean; hata?: string };
      expect(u.ok, 'onaydan SONRA konan hold imhayı durdurmadı').toBe(false);
      expect(await db.bildirim.count(), 'hold varken kayıt İMHA EDİLDİ')
        .toBe(bildirimOnce);
      const kalan = await db.imhaKarari.findUnique({ where: { id: karar!.id } });
      expect(kalan?.durum, 'reddedilen uygulama kararı yine de "uygulandi" yazdı')
        .toBe('onaylandi');
      expect(kalan?.silinenSayi, 'silinen sayısı yazıldı ama silme olmadı').toBeNull();
    } finally { oturum.id = eskiKisi; }
  });
});

describe('POL-190 · "Öneri hiçbir şey silmez: kapsanan kayıt sayısı ÖLÇÜLÜR" [SIS-DGM-003]', () => {
  it('İMHA ÖNERİSİ hiçbir kaydı silmez; sayıyı ÖLÇER ve karara yazar [SIS-DGM-003]', async () => {
    const { saklamaPolitikasiKaydet, imhaOnerisiAc } =
      await import('@/lib/eylemler2/saklama');

    await db.isKosusu.create({ data: {
      isAdi: 'kurgusal_is', durum: 'basarili',
      baslangic: new Date(Date.now() - 500 * 86_400_000),
      bitis: new Date(Date.now() - 500 * 86_400_000),
    } });
    const p = await saklamaPolitikasiKaydet({
      varlikTipi: 'IsKosusu', saklamaGun: 30, aktif: true,
      sureSonu: 'imha_oner', dayanak: 'Kurgusal saklama dayanağı',
    }) as { ok: boolean; hata?: string };
    expect(p.ok, `politika yazılamadı: ${p.hata ?? ''}`).toBe(true);

    const once = await db.isKosusu.count();
    const s = await imhaOnerisiAc({
      varlikTipi: 'IsKosusu', gerekce: 'Kurgusal imha önerisi gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `öneri açılamadı: ${s.hata ?? ''}`).toBe(true);

    /* (1) ÖNERİ HİÇBİR ŞEY SİLMEDİ. */
    expect(await db.isKosusu.count(), 'ÖNERİ kayıt sildi').toBe(once);

    /* (2) SAYI ÖLÇÜLDÜ ve KARARA YAZILDI — "bilinmiyor" bırakılmadı. */
    const karar = await db.imhaKarari.findFirst({
      where: { varlikTipi: 'IsKosusu' }, orderBy: { olusturuldu: 'desc' },
    });
    expect(karar, 'karar kaydı yazılmadı').not.toBeNull();
    expect(karar?.kapsananSayi, 'kapsanan kayıt sayısı ölçülmedi').toBeGreaterThan(0);
    expect(karar?.durum, 'öneri doğrudan uygulanmış').toBe('oneri');
    expect(karar?.silinenSayi, 'öneri anında silinen sayısı yazılmış').toBeNull();
  });
});

describe('POL-161 · "Kaldırma arşivdir: hiçbir satır silinmez" [SIS-DGM-003]', () => {
  it('PAKET KALDIRMA arşivler — kurulum satırı DURUR, durumu değişir [SIS-DGM-003]', async () => {
    const { paketKaldir } = await import('@/lib/eylemler2/paket');
    /* BAĞIMLISI OLMAYAN kurulu paket seçilir: bağımlılık kapısı AYRI bir
       üründür ve burada ölçülen cümle o değil. Seçim koddan türetilir,
       paket kodu elle yazılmaz — tohum değişirse vaka sessizce ölmez. */
    const kurulular = await db.icerikPaketi.findMany({
      where: { durum: 'kurulu' },
      select: { id: true, kod: true, surumler: { select: { id: true } } },
    });
    /* Bağımlılık MANİFESTTEN okunur (kur.ts ile aynı kaynak); ayrı bir
       tablo yoktur, elle liste de yazılmaz. */
    const manifestler = await db.icerikPaketiSurumu.findMany({
      where: { durum: 'kurulu', paket: { durum: 'kurulu' } },
      select: { manifestJson: true },
    });
    const bagimliKodlari = new Set(
      manifestler.flatMap((m) =>
        (JSON.parse(m.manifestJson) as { bagimliliklar?: string[] }).bagimliliklar ?? []),
    );
    const kurulu = kurulular.find((p) => !bagimliKodlari.has(p.kod)) ?? null;
    expect(kurulu, 'kurulu paket fikstürü yok — vaka kurulamıyor').not.toBeNull();

    /* ÖN KOŞUL (ölçülen yol değil): kaldırma kapısı aktif çerçeve sürümü
       taşıyan paketi reddeder — ve bu AYRI bir üründür, burada ölçülen
       cümle o değil. Sürümler pasifleştirilir ki ölçülen şey ARŞİVLEME
       davranışı olsun. */
    await db.frameworkSurumu.updateMany({
      where: { paketSurumId: { in: kurulu!.surumler.map((x) => x.id) }, durum: 'aktif' },
      data: { durum: 'pasif' },
    });

    const oncePaket = await db.icerikPaketi.count();
    const onceMadde = await db.madde.count();
    const s = await paketKaldir({
      kod: kurulu!.kod, gerekce: 'Kurgusal kaldırma gerekçesi — on karakterden uzun.',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `paket kaldırılamadı: ${s.hata ?? ''}`).toBe(true);

    expect(await db.icerikPaketi.count(), 'paket satırı SİLİNDİ').toBe(oncePaket);
    const sonra = await db.icerikPaketi.findUnique({ where: { id: kurulu!.id } });
    expect(sonra, 'kaldırılan paket kaydı kayboldu').not.toBeNull();
    expect(sonra?.durum, 'kaldırma durumu değiştirmedi').toBe('arsiv');
    /* R-C · müşteri verisi kaskatla silinmez: madde sayısı da düşmez. */
    expect(await db.madde.count(), 'paket kaldırma MADDE sildi').toBe(onceMadde);
  });
});

/* ═══ 3 · MOTOR ÖNERİR, İNSAN KARAR VERİR ═══════════════════════════ */

describe('POL-158 · POL-194 · "seçimi insan yapar" · "skorsuz açılır" [SIS-DGM-003]', () => {
  it('SAPMADAN BULGU madde durumu OLMADAN açılamaz — motor maddeyi seçemez [SIS-DGM-003]', async () => {
    const { sapmadanBulguAc } = await import('@/lib/eylemler2/topoloji');
    const sapma = await db.topolojiSapmasi.findFirst({ select: { id: true } });
    expect(sapma, 'topoloji sapması fikstürü yok — vaka kurulamıyor').not.toBeNull();
    const onceBulgu = await db.bulgu.count();

    const s = await sapmadanBulguAc({
      sapmaId: sapma!.id, maddeDurumuId: '',
      gerekce: 'Kurgusal bulgu gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, 'madde durumu OLMADAN bulgu açıldı — motor maddeyi seçti').toBe(false);
    expect(s.hata ?? '', 'ret madde durumu kuralından değil')
      .toMatch(/Madde durumu zorunlu/);
    expect(await db.bulgu.count(), 'reddetti ama bulgu satırı doğdu').toBe(onceBulgu);
  });

  it('SAPMADAN AÇILAN RİSK SKORSUZ doğar — otomatik sayı uydurulmaz [SIS-DGM-003]', async () => {
    const { sapmadanRiskAc } = await import('@/lib/eylemler2/topoloji');
    const sapma = await db.topolojiSapmasi.findFirst({ select: { id: true } });
    const s = await sapmadanRiskAc({
      sapmaId: sapma!.id, kod: `RSK-S2D-${damga}`,
      baslik: 'Kurgusal sapma riski', gerekce: 'Kurgusal risk gerekçesi',
    }) as { ok: boolean; riskId?: string; hata?: string };
    expect(s.ok, `risk açılamadı: ${s.hata ?? ''}`).toBe(true);

    const risk = await db.risk.findUnique({ where: { id: s.riskId! } });
    expect(risk, 'risk kaydı yazılmadı').not.toBeNull();
    /* ÖLÇÜLMEDİ = NULL. Sıfır ya da ortalama bir sayı yazılsaydı,
       ölçülmemiş bir risk kütükte ÖLÇÜLMÜŞ görünürdü. */
    expect(risk?.olasilik, 'olasılık motor tarafından UYDURULDU').toBeNull();
    /* Etki TEK kolon değil, sekiz boyut. Biri bile dolsaydı skor
       hesaplanabilir olurdu ve "skorsuz açılır" cümlesi yalan olurdu;
       alan listesi ŞEMADAN türetilir, elle sayılmaz. */
    const etkiAlanlari = Object.keys(risk!).filter((a) => /^etki[A-Z]/.test(a));
    expect(etkiAlanlari.length, 'etki boyutu okunamadı — vaka yanlış modeli ölçüyor')
      .toBeGreaterThan(4);
    for (const a of etkiAlanlari) {
      expect((risk as Record<string, unknown>)[a],
        `"${a}" motor tarafından UYDURULDU`).toBeNull();
    }
  });
});

describe('POL-199 · "Bu ekran oturumu kapatmaz, erişimi kesmez" [SIS-DGM-003]', () => {
  it('KAPATMA TALEBİ oturumu KAPATMAZ — görev açar, iz gerekçeyle düşer [SIS-DGM-003]', async () => {
    const { oturumKarariKaydet } = await import('@/lib/eylemler2/tedarikciOturum');
    const oturumKaydi = await db.tedarikciErisimOturumu.findFirst({
      select: { id: true, durum: true, bitis: true },
    });
    expect(oturumKaydi, 'tedarikçi oturumu fikstürü yok — vaka kurulamıyor').not.toBeNull();
    const onceGorev = await db.gorev.count();

    const s = await oturumKarariKaydet({
      oturumId: oturumKaydi!.id, karar: 'kapatma_talebi',
      gerekce: 'Kurgusal kapatma talebi gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `karar kaydedilemedi: ${s.hata ?? ''}`).toBe(true);

    /* (1) OTURUM KAPANMADI — ekran erişimi kesmiyor. */
    const sonra = await db.tedarikciErisimOturumu.findUnique({
      where: { id: oturumKaydi!.id },
    });
    expect(sonra?.durum, 'ekran oturumu KAPATTI').toBe(oturumKaydi!.durum);
    expect(sonra?.bitis, 'ekran oturuma bitiş damgası bastı').toEqual(oturumKaydi!.bitis);

    /* (2) KARAR İNSANIN — görev açıldı ve iz GEREKÇEYLE düştü. */
    expect(await db.gorev.count(), 'kapatma talebi görev açmadı').toBe(onceGorev + 1);
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'TedarikciErisimOturumu', varlikId: oturumKaydi!.id },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.gerekce, 'karar gerekçesiz ize düştü')
      .toBe('Kurgusal kapatma talebi gerekçesi');
  });
});

describe('POL-187 · "Onay cihaza dokunmaz" [SIS-DGM-003]', () => {
  it('KONFİG TEMELİ ONAYI cihaz kaydını DEĞİŞTİRMEZ — yalnız karşılaştırma temeli yazar [SIS-DGM-003]', async () => {
    const { konfigTemeliOnayla } = await import('@/lib/eylemler2/varlikYonetisim');
    const yedek = await db.konfigurasyonYedegi.findFirst({
      where: { basarili: true, icerikHash: { not: null } },
      select: { id: true, varlikId: true, icerikHash: true },
    });
    expect(yedek, 'başarılı konfig yedeği fikstürü yok — vaka kurulamıyor').not.toBeNull();
    const onceVarlik = await db.varlik.findUnique({ where: { id: yedek!.varlikId! } });
    const onceYedek = await db.konfigurasyonYedegi.findUnique({ where: { id: yedek!.id } });

    const s = await konfigTemeliOnayla({
      varlikId: yedek!.varlikId!, yedekId: yedek!.id,
      not: 'Kurgusal temel onay notu',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `temel onaylanamadı: ${s.hata ?? ''}`).toBe(true);

    /* (1) CİHAZ KAYDI DEĞİŞMEDİ — onay cihaza dokunmadı. */
    const sonraVarlik = await db.varlik.findUnique({ where: { id: yedek!.varlikId! } });
    expect(sonraVarlik, 'varlık kaydı kayboldu').not.toBeNull();
    expect(JSON.stringify(sonraVarlik), 'onay CİHAZ kaydını değiştirdi')
      .toBe(JSON.stringify(onceVarlik));
    /* (2) YEDEK KAYDI da değişmedi — onay yedeği "uygulamadı". */
    expect(JSON.stringify(await db.konfigurasyonYedegi.findUnique({ where: { id: yedek!.id } })),
      'onay YEDEK kaydını değiştirdi').toBe(JSON.stringify(onceYedek));

    /* (3) KARŞI TANIK · temel gerçekten yazıldı. Yazılmasaydı üstteki
       "değişmedi" ölçümleri hiçbir şey ölçmezdi. */
    const temel = await db.konfigTemeli.findUnique({ where: { varlikId: yedek!.varlikId! } });
    expect(temel?.ozetHash, 'karşılaştırma temeli yazılmadı').toBe(yedek!.icerikHash);
  });
});

describe('POL-160 · "hiçbir motor bu kuyruğu boşaltamaz; reddedilen kayıt silinmez" [SIS-DGM-003]', () => {
  it('MOTORLARIN HİÇBİRİ köken kuyruğunu boşaltmaz [SIS-DGM-003]', async () => {
    /* Motor listesi KODDAN gelir (`lib/motorlar/kayit.ts`); elle yazılan
       bir liste, sonradan eklenen motoru hiç koşturmazdı. */
    const { MOTORLAR } = await import('@/lib/motorlar/kayit');
    const bekleyen = () => db.veriKokeni.count({ where: { dogrulamaDurumu: 'dogrulanmadi' } });
    const once = await bekleyen();
    expect(once, 'köken kuyruğu boş — vaka hiçbir şey ölçmezdi').toBeGreaterThan(0);
    expect(Object.keys(MOTORLAR).length, 'motor kaydı boş okundu').toBeGreaterThan(5);

    for (const kos of Object.values(MOTORLAR)) {
      try { await (kos as () => Promise<unknown>)(); } catch { /* motor hatası ayrı bir kapının işi */ }
    }
    expect(await bekleyen(), 'bir MOTOR köken kuyruğunu boşalttı').toBe(once);
  });

  it('REDDEDİLEN köken SİLİNMEZ — reddin kendisi saklanır [SIS-DGM-003]', async () => {
    const { kokenDogrulaEylem } = await import('@/lib/eylemler2/koken');
    const koken = await db.veriKokeni.findFirst({
      where: { varlikTipi: 'Varlik', dogrulamaDurumu: 'dogrulanmadi' },
      select: { id: true },
    });
    const once = await db.veriKokeni.count();
    const s = await kokenDogrulaEylem({
      kokenId: koken!.id, sonuc: 'reddedildi', gerekce: 'Kurgusal red dayanağı',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `red kaydedilemedi: ${s.hata ?? ''}`).toBe(true);

    expect(await db.veriKokeni.count(), 'REDDEDİLEN köken kaydı silindi').toBe(once);
    const sonra = await db.veriKokeni.findUnique({ where: { id: koken!.id } });
    expect(sonra, 'reddedilen köken kayboldu').not.toBeNull();
    expect(sonra?.dogrulamaDurumu, 'red kaydedilmedi').toBe('reddedildi');
    expect(sonra?.dogrulayanId, 'reddi KİMİN verdiği yazılmadı').toBeTruthy();
  });
});

describe('POL-186 · "Motor bulguyu kendisi kapatamaz; yok sayma kararı insanındır" [SIS-DGM-003]', () => {
  /* ── CÜMLENİN İKİ YARISI AYRI ŞEYLER SÖYLER ───────────────────────────
     "Motor bulguyu KENDİSİ kapatamaz" = motor bir bulguyu SUSTURAMAZ
     (`yok_sayildi` yazamaz). "Koşul gerçekten düzelirse bir sonraki
     koşuda çözülür" = motor, ihlal ORTADAN KALKTIĞINDA `cozuldu`
     yazabilir — ve yazmalıdır, yoksa düzelen koşulun bulgusu sonsuza
     kadar açık kalırdı.

     İlk yazımda bu ayrım kaçırılmıştı: vaka motor koşusundan sonra
     bulgunun `acik` kalmasını bekliyordu ve kırmızı yandı. Kusur kodda
     değil VAKADAYDI — kurgusal bulgunun koşulu zaten yoktu, motor da
     doğru davranıp çözdü. Vaka cümleye göre yeniden yazıldı. */

  it('MOTOR bulguyu SUSTURAMAZ — hiçbir koşu "yok sayıldı" yazmaz [SIS-DGM-003]', async () => {
    const { MOTORLAR } = await import('@/lib/motorlar/kayit');
    const { YEDEK_KURALLARI } = await import('@/lib/motorlar/yedekDogrulama');
    const varlik = await db.varlik.findFirst({
      where: { silindi: null }, select: { id: true },
    });
    const bulgu = await db.veriKalitesiBulgusu.create({ data: {
      kural: YEDEK_KURALLARI.yok, kaynakTipi: 'Varlik', kaynakId: varlik!.id,
      aciklama: 'Kurgusal yedek bulgusu · motor yarısı', durum: 'acik',
    } });
    const susturulanOnce = await db.veriKalitesiBulgusu.count({
      where: { durum: 'yok_sayildi' },
    });

    for (const kos of Object.values(MOTORLAR)) {
      try { await (kos as () => Promise<unknown>)(); } catch { /* motor hatası ayrı kapı */ }
    }

    /* (1) HİÇBİR motor bir bulguyu SUSTURMADI. */
    expect(await db.veriKalitesiBulgusu.count({ where: { durum: 'yok_sayildi' } }),
      'bir MOTOR bulguyu "yok sayıldı" yazdı — susturma insanın kararıdır')
      .toBe(susturulanOnce);

    /* (2) Cümlenin ikinci yarısı: koşul YOKSA motor çözer. Bu bir KARŞI
       TANIKTIR — motor hiç dokunmasaydı üstteki sıfır bedava olurdu. */
    const sonra = await db.veriKalitesiBulgusu.findUnique({ where: { id: bulgu.id } });
    expect(sonra?.durum, 'motor koşul kalkmışken de bulguya dokunmadı')
      .toBe('cozuldu');
  });

  it('"YOK SAY" İNSAN kararıdır ve GEREKÇESİZ kabul edilmez [SIS-DGM-003]', async () => {
    const { yedekBulgusunuIsle } = await import('@/lib/eylemler2/konfigYedek');
    const { YEDEK_KURALLARI } = await import('@/lib/motorlar/yedekDogrulama');
    const varlik = await db.varlik.findFirst({
      where: { silindi: null }, select: { id: true },
    });
    const bulgu = await db.veriKalitesiBulgusu.create({ data: {
      kural: YEDEK_KURALLARI.yok, kaynakTipi: 'Varlik', kaynakId: varlik!.id,
      aciklama: 'Kurgusal yedek bulgusu · insan yarısı', durum: 'acik',
    } });

    /* (1) GEREKÇESİZ yok sayma reddedilir — susturma sessiz olamaz. */
    const bos = await yedekBulgusunuIsle({
      bulguId: bulgu.id, karar: 'yok_sayildi', gerekce: '   ',
    }) as { ok: boolean; hata?: string };
    expect(bos.ok, 'GEREKÇESİZ yok sayma kabul edildi').toBe(false);
    expect((await db.veriKalitesiBulgusu.findUnique({ where: { id: bulgu.id } }))?.durum,
      'reddetti ama bulguyu kapattı').toBe('acik');

    /* (2) İNSAN KARARI geçer ve gerekçe İZDE durur. */
    const s = await yedekBulgusunuIsle({
      bulguId: bulgu.id, karar: 'yok_sayildi',
      gerekce: 'Kurgusal yok sayma gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `insan kararı reddedildi: ${s.hata ?? ''}`).toBe(true);
    expect((await db.veriKalitesiBulgusu.findUnique({ where: { id: bulgu.id } }))?.durum,
      'insan kararı yazılmadı').toBe('yok_sayildi');
    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'VeriKalitesiBulgusu', varlikId: bulgu.id },
      orderBy: { zaman: 'desc' },
    });
    expect(iz?.gerekce, 'yok sayma gerekçesi izde durmuyor')
      .toBe('Kurgusal yok sayma gerekçesi');
  });
});

describe('POL-191 · "Pasif — kayıt durur, karar üretmez" [SIS-DGM-003]', () => {
  it('PASİF taban hiçbir cihaz için karar ÜRETMEZ; kaydı DURUR [SIS-DGM-003]', async () => {
    const { enOzgulTemel, firmwareKarariVer } = await import('@/lib/varlik/firmwareKarari');
    const pasif = {
      id: 'pasif', turId: null, uretici: 'KurgusalUretici', model: null,
      aktif: false, onayliSurum: '9.9.9', asgariSurum: null, bilinenKotuSurumler: null,
    };
    const cihaz = { turId: null, uretici: 'KurgusalUretici', model: null };

    /* (1) PASİF taban SEÇİLMEZ — karar üretmez. */
    expect(enOzgulTemel([pasif], cihaz), 'PASİF taban karar üretti').toBeNull();
    /* Taban seçilmeyince karar `taban_yok`tur: "uyumlu" DEĞİL. */
    expect(firmwareKarariVer('1.0.0', enOzgulTemel([pasif], cihaz)).durum,
      'pasif taban cihazı "uyumlu" saydırdı').toBe('taban_yok');

    /* (2) KARŞI TANIK · AYNI taban aktifken SEÇİLİR. Seçilmeseydi üstteki
       null, pasiflikten değil eşleşmemekten geliyor olurdu. */
    expect(enOzgulTemel([{ ...pasif, aktif: true }], cihaz)?.id,
      'aktif taban da seçilmiyor — vaka eşleşmeyi ölçüyor').toBe('pasif');

    /* (3) KAYIT DURUR: pasiflik bir silme değil, bir durumdur — şemada
       `aktif` alanı var ve kayıt onunla susturulur. */
    const sema = await import('node:fs').then((f) =>
      f.readFileSync('prisma/schema.prisma', 'utf8'));
    expect(sema.slice(sema.indexOf('model FirmwareTemeli')).slice(0, 900),
      'pasifleştirme alanı yok — susturma ancak silmeyle olurdu')
      .toMatch(/\baktif\s+Boolean/);
  });
});

describe('POL-154 · "Bu motor hiç koşmadı — sağlıklı olduğu anlamına gelmez" [SIS-DGM-003]', () => {
  it('KOŞUSUZ motor "ok" GÖRÜNMEZ — işaret "unk", söz "Hiç koşmadı" [SIS-DGM-003]', async () => {
    const M = await import('@/app/(kabuk)/(operasyonel)/saglik/mantik');
    type MotorGibi = { ad: string; aciklama: string; kosular: unknown[] };
    const bos: MotorGibi = { ad: 'kurgusal', aciklama: 'Kurgusal motor', kosular: [] };

    expect(M.motorImi(bos as never), 'koşusuz motor YEŞİL çizildi').toBe('unk');
    expect(M.motorSozu(bos as never), 'koşusuz motorun sözü yanlış').toBe('Hiç koşmadı');
    expect(M.motorCumlesi(bos as never), 'cümle "sağlıklı değil" uyarısını taşımıyor')
      .toMatch(/sağlıklı olduğu anlamına GELMEZ/);
    /* Şerit de uydurmaz: beş boş tik "beş başarısız" gibi çizilmez. */
    expect(M.kosuGecmisi(bos as never), 'koşu geçmişi uydurulmuş')
      .toEqual([null, null, null, null, null]);
    expect(M.kosuGecmisiEtiketi(bos as never), 'ekran okuyucu cümlesi sayı uydurdu')
      .toBe('Koşu kaydı yok');

    /* KARŞI TANIK · BAŞARILI koşusu olan motor "ok" olur. */
    const iyi: MotorGibi = {
      ...bos, kosular: [{ durum: 'basarili', islenen: 1, uretilen: 0 }],
    };
    expect(M.motorImi(iyi as never), 'başarılı motor da yeşil değil — diş hep "unk" diyor')
      .toBe('ok');
  });
});

describe('POL-159 · "Devir geri alınamaz ve her kayıt için AYRI denetim izi bırakır" [SIS-DGM-003]', () => {
  it('SAHİPSİZ BIRAKMA her kayıt için AYRI iz yazar; PASİF kişiye devir REDDEDİLİR [SIS-DGM-003]', async () => {
    const { topluSahipDevri } = await import('@/lib/eylemler2/varlikYonetisim');
    const sahip = await db.kullanici.create({ data: {
      eposta: `devir-159-${damga}@kurgusal.local`, adSoyad: 'Kurgusal Devir', aktif: true,
    } });
    const varliklar = await db.varlik.findMany({
      where: { silindi: null }, select: { id: true }, take: 2,
    });
    expect(varliklar.length, 'iki varlık fikstürü yok — vaka kurulamıyor').toBe(2);
    await db.varlik.updateMany({
      where: { id: { in: varliklar.map((v) => v.id) } }, data: { sahipId: sahip.id },
    });

    /* (1) PASİF kişiye devir REDDEDİLİR — kayıt görünürde sahipli,
       gerçekte sahipsiz kalırdı. */
    const pasif = await db.kullanici.create({ data: {
      eposta: `pasif-159-${damga}@kurgusal.local`, adSoyad: 'Kurgusal Pasif', aktif: false,
    } });
    const r = await topluSahipDevri({
      varlikIdleri: varliklar.map((v) => v.id), hedefKullaniciId: pasif.id,
      gerekce: 'Kurgusal devir gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(r.ok, 'PASİF kullanıcıya sahiplik devredildi').toBe(false);
    expect((await db.varlik.findUnique({ where: { id: varliklar[0].id } }))?.sahipId,
      'reddetti ama sahibi değiştirdi').toBe(sahip.id);

    /* (2) SAHİPSİZ BIRAK · iki kayıt, İKİ ayrı iz satırı. */
    const onceIz = await izSayisi();
    const s = await topluSahipDevri({
      varlikIdleri: varliklar.map((v) => v.id), hedefKullaniciId: null,
      gerekce: 'Kurgusal sahipsiz bırakma gerekçesi',
    }) as { ok: boolean; ozet?: { degisen: number }; hata?: string };
    expect(s.ok, `devir reddedildi: ${s.hata ?? ''}`).toBe(true);
    expect(s.ozet?.degisen, 'iki kayıt değişmedi').toBe(2);

    for (const v of varliklar) {
      expect((await db.varlik.findUnique({ where: { id: v.id } }))?.sahipId,
        'sahipsiz bırakılan varlık hâlâ eski sahibinde').toBeNull();
    }
    /* TEK toplu satır DEĞİL: her kayıt kendi izini bırakır. */
    expect(await izSayisi(), 'toplu devir TEK iz satırına indirgendi')
      .toBe(onceIz + 2);
    for (const v of varliklar) {
      const iz = await db.aktiviteKaydi.findFirst({
        where: { varlikTipi: 'Varlik', varlikId: v.id, alan: 'sahipId' },
        orderBy: { zaman: 'desc' },
      });
      expect(iz?.gerekce, `${v.id} için iz gerekçesiz`)
        .toBe('Kurgusal sahipsiz bırakma gerekçesi');
      expect(iz?.yeniDeger, 'sahipsizlik ize yazılmadı').toBeNull();
    }
  });
});

/* ═══ 4 · ÖLÇÜM SONUCU KARAR DEĞİLDİR ═══════════════════════════════ */

describe('POL-179 · "Sayım hiçbir varlığı silmez: bulunamadı bir ÖLÇÜM SONUCUDUR" [SIS-DGM-003]', () => {
  it('BULUNAMADI işareti varlığı envanterden DÜŞÜRMEZ — kayıt durur [SIS-DGM-003]', async () => {
    const { sayimAc, sayimSatiriKaydet, sayimKapat } = await import('@/lib/eylemler2/sayim');
    const tesis = await db.tesis.findFirst({
      where: { varliklar: { some: { silindi: null } } }, select: { id: true },
    });
    expect(tesis, 'varlığı olan tesis fikstürü yok — vaka kurulamıyor').not.toBeNull();

    const a = await sayimAc({
      ad: `Kurgusal sayım ${damga}`, tesisId: tesis!.id,
    }) as { ok: boolean; id?: string; hata?: string };
    expect(a.ok, `sayım açılamadı: ${a.hata ?? ''}`).toBe(true);

    const satir = await db.sayimSatiri.findFirst({
      where: { sayimId: a.id!, varlikId: { not: null } },
      select: { id: true, varlikId: true },
    });
    expect(satir, 'sayım satırı doğmadı').not.toBeNull();
    const onceVarlik = await db.varlik.count({ where: { silindi: null } });

    const s = await sayimSatiriKaydet({
      sayimId: a.id!, satirId: satir!.id, sonuc: 'bulunamadi',
      not: 'Kurgusal sayım notu',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `satır kaydedilemedi: ${s.hata ?? ''}`).toBe(true);

    /* (1) ÖLÇÜM YAZILDI. */
    expect((await db.sayimSatiri.findUnique({ where: { id: satir!.id } }))?.sonuc,
      'ölçüm sonucu yazılmadı — vaka boşa koştu').toBe('bulunamadi');
    /* (2) VARLIK DÜŞÜRÜLMEDİ — "bulunamadı" envanterden düşme kararı değil. */
    const varlik = await db.varlik.findUnique({ where: { id: satir!.varlikId! } });
    expect(varlik, 'bulunamadı işareti varlığı SİLDİ').not.toBeNull();
    expect(varlik?.silindi, 'bulunamadı işareti varlığı envanterden DÜŞÜRDÜ').toBeNull();
    expect(await db.varlik.count({ where: { silindi: null } }),
      'sayım envanter sayısını değiştirdi').toBe(onceVarlik);

    /* (3) SAYIMIN KAPANMASI da düşürmez — kapanış bir karar değil, bitiş. */
    await sayimKapat({ sayimId: a.id!, gerekce: 'Kurgusal sayım kapanış gerekçesi' } as never);
    expect(await db.varlik.count({ where: { silindi: null } }),
      'sayım KAPANIŞI envanterden varlık düşürdü').toBe(onceVarlik);
  });
});

describe('POL-173 · "Karar kaynak kaydı otomatik değiştirmez; her karar ize yazılır" [SIS-DGM-003]', () => {
  it('ONAY KARARI kaynak kaydına DOKUNMAZ ve İZE yazılır [SIS-DGM-003]', async () => {
    const { onayKarar } = await import('@/lib/eylemler2/gorev');

    /* `proje_aday` seçilir: yan etkisi OLMAYAN bir tip — cümle tam da
       "uygulama ilgili modülün sorumluluğundadır" diyor. */
    const risk = await db.risk.findFirst({ select: { id: true, durum: true } });
    expect(risk, 'risk fikstürü yok — vaka kurulamıyor').not.toBeNull();
    const talepEden = await db.kullanici.create({ data: {
      eposta: `talep-173-${damga}@kurgusal.local`, adSoyad: 'Kurgusal Talep', aktif: true,
    } });
    const talep = await db.onayTalebi.create({ data: {
      tip: 'proje_aday', kaynakTipi: 'Risk', kaynakId: risk!.id,
      ozet: 'Kurgusal proje adayı onayı', talepEdenId: talepEden.id,
    } });
    const onceIz = await izSayisi();

    const s = await onayKarar({
      id: talep.id, karar: 'onaylandi', gerekce: 'Kurgusal onay gerekçesi',
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `karar verilemedi: ${s.hata ?? ''}`).toBe(true);

    /* (1) KAYNAK KAYDI DEĞİŞMEDİ — karar uygulamayı kendi yapmadı. */
    expect((await db.risk.findUnique({ where: { id: risk!.id } }))?.durum,
      'onay kararı KAYNAK kaydını otomatik değiştirdi').toBe(risk!.durum);
    /* (2) KARAR YAZILDI ve İZE düştü. */
    expect((await db.onayTalebi.findUnique({ where: { id: talep.id } }))?.durum,
      'karar talebe yazılmadı — vaka boşa koştu').toBe('onaylandi');
    expect(await izSayisi(), 'karar denetim izine yazılmadı').toBeGreaterThan(onceIz);
  });
});

describe('POL-162 · "Son tarihi girilmeyen görevin gecikmesi ölçülemez" [SIS-DGM-003]', () => {
  it('ELLE AÇILAN görev motor görevinden AYRIŞIR; son tarihsizin gecikmesi BİLİNMEZ [SIS-DGM-003]', async () => {
    const { gorevOlustur } = await import('@/lib/eylemler2/gorev');
    const s = await gorevOlustur({
      baslik: `Kurgusal elle görev ${damga}`, tip: 'manuel', sonTarih: null,
    }) as { ok: boolean; hata?: string };
    expect(s.ok, `görev açılamadı: ${s.hata ?? ''}`).toBe(true);

    const g = await db.gorev.findFirst({
      where: { baslik: `Kurgusal elle görev ${damga}` },
    });
    expect(g, 'görev yazılmadı').not.toBeNull();
    /* (1) ELLE açılan görev motor görevinden AYRIŞIR. */
    expect(g?.otomatikUretildi, 'elle açılan görev MOTOR görevi gibi damgalandı')
      .toBe(false);
    /* (2) SON TARİH BOŞ = gecikme ÖLÇÜLEMEZ. Sıfır ya da bugün yazılsaydı,
       ölçülmemiş bir gecikme ölçülmüş görünürdü (bilinmeyen ≠ sıfır). */
    expect(g?.sonTarih, 'son tarih UYDURULDU — bilinmeyen sıfıra çekildi').toBeNull();

    /* (3) KARŞI TANIK · motor görevi `otomatikUretildi: true` doğar. */
    const { sonTarihleriIsle } = await import('@/lib/motorlar/sonTarih');
    await sonTarihleriIsle();
    const motorGorevi = await db.gorev.findFirst({
      where: { tip: 'son_tarih', otomatikUretildi: true },
    });
    expect(motorGorevi, 'motor görevi hiç doğmadı — ayrışma ölçülemedi').not.toBeNull();
  });
});

describe('POL-165 · "bu ekran hiçbir çerçeveyi aktifleştirmez" [SIS-DGM-003]', () => {
  it('PAKET KURULUMU hiçbir çerçeve sürümünü AKTİF yapmaz [SIS-DGM-003]', async () => {
    const { paketKur } = await import('@/lib/eylemler2/paket');
    /* Kurulu OLMAYAN bir paket koddan seçilir — kurulu paketi yeniden
       kurmak kurulum yolunu sürmezdi. */
    const kurulular = new Set((await db.icerikPaketi.findMany({ select: { kod: true } }))
      .map((p) => p.kod));
    const { readdirSync } = await import('node:fs');
    const aday = readdirSync('paketler', { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name)
      .find((ad) => !kurulular.has(ad));
    expect(aday, 'kurulu olmayan paket yok — vaka kurulamıyor').toBeTruthy();

    const aktifOnce = await db.frameworkSurumu.count({ where: { durum: 'aktif' } });
    const s = await paketKur({ kod: aday! }) as { ok: boolean; hata?: string };
    expect(s.ok, `paket kurulamadı: ${s.hata ?? ''}`).toBe(true);

    /* (1) KURULUM AKTİFLEŞTİRMEDİ. */
    expect(await db.frameworkSurumu.count({ where: { durum: 'aktif' } }),
      'kurulum bir çerçeveyi KENDİ aktifleştirdi').toBe(aktifOnce);
    /* (2) KARŞI TANIK · sürümler gerçekten yazıldı; yazılmasaydı üstteki
       "artmadı" ölçümü hiçbir şey ölçmezdi. */
    const paket = await db.icerikPaketi.findUnique({ where: { kod: aday! } });
    expect(paket?.durum, 'paket kurulmadı — vaka boşa koştu').toBe('kurulu');
  });
});

import 'server-only';
import { db } from '../db';
import type { Prisma } from '../prisma-client/client';
import { kokenYaz } from './koken';
import type { Koken } from './sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   KONFİGÜRASYON YEDEĞİ (PLC / DCS / SCADA) — İZLEME KATMANI

   Bu dosya BİR YEDEKLEME ÜRÜNÜ DEĞİLDİR ve öyle davranmaz:
   yedek ALMAZ, geri YÜKLEMEZ, saklama politikası UYGULAMAZ, cihaza
   BAĞLANMAZ. Yaptığı tek şey, bir yedeğin **varlığını, tazeliğini ve
   doğrulanmışlığını** dış kaynaktan gelen metadata üzerinden izlemek ve
   bunu uyum kanıtına bağlamaktır. Konfigürasyon değişikliği önerisi bile
   üretmez — OT'de otomatik konfigürasyon değişikliği kesin yasaktır.

   ── İKİ KATMAN, İKİ AYRI SORU ────────────────────────────────────────
   Üründe zaten SANTRAL seviyesinde bir yedekleme zinciri var:

     YedeklemePolitikasi → YedeklemeKosusu → GeriYuklemeTesti
       "Bu santralin bir yedekleme politikası var mı, koşuları geçiyor mu,
        geri yükleme testi yapıldı mı?"  → /yedekleme ekranı (O14)

   `KonfigurasyonYedegi` ise VARLIK seviyesidir:

     Varlik → KonfigurasyonYedegi (n)
       "Bu PLC'nin/DCS'in konfigürasyonunun bir yedeği gerçekten var mı,
        ne kadar eski, içeriği değişti mi, son bilinen iyi sürüm hangisi?"

   Biri diğerinin yerini ALMAZ; ikisi farklı hataları yakalar:
     · Politika var + koşular başarılı, ama kritik PLC hiç kapsama
       girmemiş  → santral katmanı 'yeşil', varlık katmanı boş. Yalnız bu
       dosya görür.
     · Her varlığın yedeği var, ama hiç geri yükleme testi yapılmamış
       → varlık katmanı dolu, santral katmanı kanıtsız. Yalnız O14 görür.

   Birleşme noktası `tesisYedekGorunumu()`: iki katmanı yan yana koyar ve
   ÇELİŞKİLERİ ayrıca listeler. Katmanları toplamaz, ortalamasını almaz —
   biri diğerini örtemez.

   Uyum bağında da bölünme aynıdır:
     EPDK-SYM-8.1.1 (yedek kapsamı)     ← ağırlıklı olarak VARLIK katmanı
     EPDK-SYM-8.1.2 (geri yükleme testi) ← ağırlıklı olarak SANTRAL katmanı
   `yedekKontrolBagi()` bu bağı ÖNERİ olarak döndürür; `MaddeDurumu`'na
   asla yazmaz (bkz. dosyanın sonu).

   ── ÜÇ DEĞERLİ SONUÇ ─────────────────────────────────────────────────
   Buradaki her kontrol fonksiyonu `var | yok | bilinmiyor` döner ve
   `yok` ile `bilinmiyor` HİÇBİR YERDE birbirine karışmaz:
     var        = kanıt olumlu (başarılı yedek kaydı var)
     yok        = kanıt olumsuz (kayıt var ama hepsi başarısız / beyan 'yok')
     bilinmiyor = kanıt yok (hiç kayıt yok) — "yedek alınmıyor" DEMEK DEĞİL
   ═══════════════════════════════════════════════════════════════════ */

export type UcDeger = 'var' | 'yok' | 'bilinmiyor';

type Istemci = Prisma.TransactionClient | typeof db;

/** Bu katmanın köken tablosundaki varlık tipi adı. */
export const YEDEK_VARLIK_TIPI = 'KonfigurasyonYedegi';

const GUN_MS = 86_400_000;

/* ═══ 1 · Yedek var mı ════════════════════════════════════════════════ */

export type YedekVarligi = {
  sonuc: UcDeger;
  /** Ekranda gösterilecek tek cümlelik dayanak. */
  gerekce: string;
  kayitSayisi: number;
  basariliSayisi: number;
  sonBasariliZaman: Date | null;
  /** Son başarısız denemenin hatası — 'yok' sonucunun dayanağı. */
  sonHata: string | null;
  kaynakSistemler: string[];
};

/**
 * Bir varlığın konfigürasyon yedeği var mı?
 *
 * · hiç kayıt yok            → `bilinmiyor` (ölçülmedi; sıfır DEĞİL)
 * · kayıt var, hepsi başarısız → `yok` (kanıtlı yokluk)
 * · en az bir başarılı kayıt  → `var`
 */
export async function yedekVarMi(varlikId: string): Promise<YedekVarligi> {
  const kayitlar = await db.konfigurasyonYedegi.findMany({
    where: { varlikId },
    orderBy: { yedekZamani: 'desc' },
    select: { yedekZamani: true, basarili: true, kaynakSistem: true, hata: true },
  });

  const kaynakSistemler = [...new Set(kayitlar.map((k) => k.kaynakSistem))].sort();

  if (kayitlar.length === 0) {
    return {
      sonuc: 'bilinmiyor',
      gerekce: 'Bu varlık için hiç konfigürasyon yedeği kaydı yok — yedeğin '
        + 'alınmadığı değil, ÖLÇÜLMEDİĞİ anlamına gelir.',
      kayitSayisi: 0, basariliSayisi: 0, sonBasariliZaman: null,
      sonHata: null, kaynakSistemler,
    };
  }

  const basarililar = kayitlar.filter((k) => k.basarili);
  const sonBasarisiz = kayitlar.find((k) => !k.basarili) ?? null;

  if (basarililar.length === 0) {
    return {
      sonuc: 'yok',
      gerekce: `${kayitlar.length} yedek denemesinin tamamı başarısız`
        + (sonBasarisiz?.hata ? ` (son hata: ${sonBasarisiz.hata})` : '')
        + ' — kullanılabilir yedek yok.',
      kayitSayisi: kayitlar.length, basariliSayisi: 0, sonBasariliZaman: null,
      sonHata: sonBasarisiz?.hata ?? null, kaynakSistemler,
    };
  }

  const son = basarililar[0];
  const yas = Math.floor((Date.now() - son.yedekZamani.getTime()) / GUN_MS);
  return {
    sonuc: 'var',
    gerekce: `Son başarılı yedek ${yas} gün önce (${son.kaynakSistem}); `
      + `toplam ${basarililar.length}/${kayitlar.length} başarılı kayıt.`,
    kayitSayisi: kayitlar.length,
    basariliSayisi: basarililar.length,
    sonBasariliZaman: son.yedekZamani,
    sonHata: sonBasarisiz?.hata ?? null,
    kaynakSistemler,
  };
}

/* ═══ 2 · Son yedek yaşı ══════════════════════════════════════════════ */

/**
 * Son BAŞARILI yedeğin üzerinden geçen gün sayısı.
 *
 * `null` = ölçülemedi (hiç kayıt yok ya da hiç başarılı kayıt yok).
 * `0` ile `null` aynı şey değildir: 0 "bugün yedeklendi", null "bilmiyoruz".
 * Çağıran taraf yaşı gösterirken `null` için gün yazmaz — `yedekVarMi()`
 * ile birlikte okunup 'yok' mu 'bilinmiyor' mu olduğu ayrıştırılır.
 */
export async function sonYedekYasi(varlikId: string): Promise<number | null> {
  const son = await db.konfigurasyonYedegi.findFirst({
    where: { varlikId, basarili: true },
    orderBy: { yedekZamani: 'desc' },
    select: { yedekZamani: true },
  });
  if (!son) return null;
  return Math.max(0, Math.floor((Date.now() - son.yedekZamani.getTime()) / GUN_MS));
}

/* ═══ 3 · Konfigürasyon değişti mi ════════════════════════════════════ */

export type YedekIzi = {
  id: string; yedekZamani: Date; surum: string | null;
  icerikHash: string | null; kaynakSistem: string;
};

export type KonfigurasyonDegisimi = {
  /** var = değişti · yok = değişmedi · bilinmiyor = karşılaştırılamadı */
  sonuc: UcDeger;
  gerekce: string;
  son: YedekIzi | null;
  onceki: YedekIzi | null;
};

/**
 * Son iki BAŞARILI yedeğin `icerikHash` alanını karşılaştırır.
 *
 * Hash'lerden biri bile yoksa sonuç `bilinmiyor`'dur — hash'siz iki yedeği
 * "değişmedi" saymak, gerçekleşmiş bir konfigürasyon değişikliğini
 * gizlemek olurdu. Sürüm alanı (`surum`) hash yerine KULLANILMAZ: sürüm
 * etiketi değişmeden içerik değişebilir.
 */
export async function konfigurasyonDegistiMi(varlikId: string): Promise<KonfigurasyonDegisimi> {
  const kayitlar = await db.konfigurasyonYedegi.findMany({
    where: { varlikId, basarili: true },
    orderBy: { yedekZamani: 'desc' },
    take: 2,
    select: { id: true, yedekZamani: true, surum: true, icerikHash: true, kaynakSistem: true },
  });
  const son = kayitlar[0] ?? null;
  const onceki = kayitlar[1] ?? null;

  if (!son || !onceki) {
    return {
      sonuc: 'bilinmiyor',
      gerekce: son
        ? 'Karşılaştırılacak ikinci başarılı yedek yok — değişim ölçülemez.'
        : 'Başarılı yedek kaydı yok — değişim ölçülemez.',
      son, onceki,
    };
  }
  if (!son.icerikHash || !onceki.icerikHash) {
    return {
      sonuc: 'bilinmiyor',
      gerekce: 'Yedeklerin en az birinde içerik özeti (hash) yok — '
        + 'hash olmadan "değişmedi" denemez.',
      son, onceki,
    };
  }
  if (son.icerikHash !== onceki.icerikHash) {
    return {
      sonuc: 'var',
      gerekce: `İçerik özeti değişti (${onceki.yedekZamani.toISOString().slice(0, 10)} → `
        + `${son.yedekZamani.toISOString().slice(0, 10)}). Kayıtlı bir değişiklik `
        + 'talebiyle eşleşiyor mu, insan doğrular.',
      son, onceki,
    };
  }
  return {
    sonuc: 'yok',
    gerekce: 'Son iki yedeğin içerik özeti aynı — konfigürasyon değişmemiş.',
    son, onceki,
  };
}

/* ═══ 4 · Son bilinen iyi ═════════════════════════════════════════════ */

export type SonBilinenIyiSonucu = {
  /** var = işaretli yedek bulundu · yok = kayıt var ama işaretli yok ·
      bilinmiyor = hiç kayıt yok */
  sonuc: UcDeger;
  gerekce: string;
  yedek: (YedekIzi & {
    basarili: boolean; dogrulandi: boolean; dogrulamaZamani: Date | null;
    restoreTestId: string | null; depolamaKonumu: string | null; saklamaGun: number | null;
  }) | null;
};

/**
 * `sonBilinenIyi = true` işaretli EN SON yedek.
 *
 * İşaret otomatik konmaz: "son başarılı yedek" ile "son bilinen İYİ yedek"
 * aynı şey değildir — bir yedek başarıyla alınıp yine de bozuk/çalışmayan
 * bir konfigürasyonu taşıyor olabilir. İşareti insan koyar
 * (`eylemler2/konfigYedek.ts → sonBilinenIyiIsaretle`).
 */
export async function sonBilinenIyi(varlikId: string): Promise<SonBilinenIyiSonucu> {
  const [isaretli, toplam] = await Promise.all([
    db.konfigurasyonYedegi.findFirst({
      where: { varlikId, sonBilinenIyi: true },
      orderBy: { yedekZamani: 'desc' },
      select: {
        id: true, yedekZamani: true, surum: true, icerikHash: true, kaynakSistem: true,
        basarili: true, dogrulandi: true, dogrulamaZamani: true, restoreTestId: true,
        depolamaKonumu: true, saklamaGun: true,
      },
    }),
    db.konfigurasyonYedegi.count({ where: { varlikId } }),
  ]);

  if (isaretli) {
    const yas = Math.floor((Date.now() - isaretli.yedekZamani.getTime()) / GUN_MS);
    return {
      sonuc: 'var',
      gerekce: `Son bilinen iyi konfigürasyon ${yas} gün önceki ${
        isaretli.surum ?? 'sürümsüz'} yedeği`
        + (isaretli.dogrulandi ? ' (okunabilirliği doğrulanmış).' : ' (doğrulanmamış).'),
      yedek: isaretli,
    };
  }
  if (toplam === 0) {
    return {
      sonuc: 'bilinmiyor',
      gerekce: 'Hiç yedek kaydı yok — son bilinen iyi sürüm ölçülemez.',
      yedek: null,
    };
  }
  return {
    sonuc: 'yok',
    gerekce: `${toplam} yedek kaydı var ama hiçbiri "son bilinen iyi" olarak `
      + 'işaretlenmemiş — geri dönülecek referans sürüm belirsiz.',
    yedek: null,
  };
}

/* ═══ 5 · Kritik varlıklarda eksik yedek ══════════════════════════════ */

const KRITIK_KADEMELER = ['kritik', 'yuksek'] as const;

export type EksikYedekVarligi = {
  varlikId: string; etiket: string; ad: string; kritiklik: string;
  tesisId: string | null; tesisKodu: string | null;
  /** Envanterde elle beyan edilen `Varlik.yedekDurumu` — üç değerli. */
  beyan: string;
  kayitSayisi: number;
  gerekce: string;
};

export type EksikYedekRaporu = {
  /** Hiç `KonfigurasyonYedegi` kaydı yoksa false: tarama yapılmadı. */
  kaynakBagli: boolean;
  /** Kanıtlı yokluk: kayıt var ve hepsi başarısız, ya da beyan 'yok'. */
  yedeksiz: EksikYedekVarligi[];
  /** Ölçüm yok: otomatik kayıt yok ve beyan da 'bilinmiyor'. TOPLANMAZ. */
  bilinmeyen: EksikYedekVarligi[];
  /** Otomatik kanıtla yedeği doğrulanan kritik varlık sayısı. */
  yedegiVar: number;
  toplamKritik: number;
};

/**
 * Kritik/yüksek kritiklikteki varlıklardan yedeği olmayanlar.
 *
 * `yedeksiz` ve `bilinmeyen` AYRI döner ve asla toplanmaz: birincisi
 * kapatılacak bir açık, ikincisi ölçülecek bir boşluktur.
 *
 * Beyan ('var') edilmiş ama otomatik kanıtı olmayan varlıklar hiçbir
 * listeye girmez — insan zaten bir cevap vermiştir; bunu "eksik" saymak
 * beyanı yok saymak olur. O boşluk santral katmanının işidir (O14).
 */
export async function kritikVarliklardaEksikYedek(tesisId?: string): Promise<EksikYedekRaporu> {
  const varliklar = await db.varlik.findMany({
    where: {
      silindi: null,
      kritiklik: { in: [...KRITIK_KADEMELER] },
      ...(tesisId ? { tesisId } : {}),
    },
    select: {
      id: true, etiket: true, ad: true, kritiklik: true, yedekDurumu: true,
      tesisId: true, tesis: { select: { kod: true } },
    },
    orderBy: { etiket: 'asc' },
  });

  const idler = varliklar.map((v) => v.id);
  const kayitlar = idler.length === 0 ? [] : await db.konfigurasyonYedegi.findMany({
    where: { varlikId: { in: idler } },
    select: { varlikId: true, basarili: true },
  });
  const toplamKayit = await db.konfigurasyonYedegi.count();

  const sayac = new Map<string, { toplam: number; basarili: number }>();
  for (const k of kayitlar) {
    const s = sayac.get(k.varlikId) ?? { toplam: 0, basarili: 0 };
    s.toplam += 1;
    if (k.basarili) s.basarili += 1;
    sayac.set(k.varlikId, s);
  }

  const yedeksiz: EksikYedekVarligi[] = [];
  const bilinmeyen: EksikYedekVarligi[] = [];
  let yedegiVar = 0;

  for (const v of varliklar) {
    const s = sayac.get(v.id) ?? { toplam: 0, basarili: 0 };
    const temel = {
      varlikId: v.id, etiket: v.etiket, ad: v.ad, kritiklik: v.kritiklik,
      tesisId: v.tesisId, tesisKodu: v.tesis?.kod ?? null,
      beyan: v.yedekDurumu, kayitSayisi: s.toplam,
    };
    if (s.basarili > 0) { yedegiVar += 1; continue; }
    if (s.toplam > 0) {
      yedeksiz.push({ ...temel,
        gerekce: `${s.toplam} yedek denemesinin tamamı başarısız.` });
      continue;
    }
    if (v.yedekDurumu === 'yok') {
      yedeksiz.push({ ...temel,
        gerekce: 'Envanterde yedeği "yok" olarak beyan edilmiş; otomatik kayıt da yok.' });
      continue;
    }
    if (v.yedekDurumu === 'var') continue; // beyan var, otomatik kanıt yok — santral katmanının işi
    bilinmeyen.push({ ...temel,
      gerekce: 'Ne otomatik yedek kaydı ne de envanter beyanı var — durum ölçülmedi.' });
  }

  return {
    kaynakBagli: toplamKayit > 0,
    yedeksiz, bilinmeyen, yedegiVar,
    toplamKritik: varliklar.length,
  };
}

/* ═══ 6 · İki katmanın birleşimi ══════════════════════════════════════ */

export type SantralKatmani = {
  bagli: boolean;
  gerekce: string;
  politikaAdi: string | null;
  sonKosu: { zaman: Date; durum: string; hata: string | null } | null;
  sonRestoreTesti: { zaman: Date; sonuc: string; sureDk: number | null } | null;
};

export type YedekGorunumu = {
  tesisId: string;
  santralKatmani: SantralKatmani;
  varlikKatmani: EksikYedekRaporu;
  /** İki katmanın birbirini yalanladığı yerler — örtülmez, listelenir. */
  celiskiler: string[];
};

/**
 * Santral katmanı (politika/koşu/restore testi) ile varlık katmanını
 * (konfigürasyon yedeği) YAN YANA koyar. Toplamaz, ortalamasını almaz.
 *
 * `politikaId` isteğe bağlıdır: şemada Tesis↔YedeklemePolitikasi yabancı
 * anahtarı YOK; /yedekleme ekranı bu bağı politika ADI önekinden kuruyor.
 * O kırılgan eşlemeyi burada tekrarlamıyoruz — çağıran hangi politikayı
 * kastettiğini söyler. Verilmezse santral katmanı `bagli: false` döner
 * ("politika bağı verilmedi"), boş/başarısız gibi GÖSTERİLMEZ.
 */
export async function tesisYedekGorunumu(
  tesisId: string, politikaId?: string,
): Promise<YedekGorunumu> {
  const varlikKatmani = await kritikVarliklardaEksikYedek(tesisId);

  let santralKatmani: SantralKatmani = {
    bagli: false,
    gerekce: 'Yedekleme politikası bağı verilmedi — santral katmanı ölçülmedi '
      + '(şemada Tesis↔YedeklemePolitikasi yabancı anahtarı yok).',
    politikaAdi: null, sonKosu: null, sonRestoreTesti: null,
  };

  if (politikaId) {
    const politika = await db.yedeklemePolitikasi.findUnique({
      where: { id: politikaId },
      include: {
        kosular: {
          orderBy: { zaman: 'desc' },
          include: { geriYuklemeler: { orderBy: { zaman: 'desc' } } },
        },
      },
    });
    if (!politika) {
      throw new Error(`tesisYedekGorunumu: politika bulunamadı (${politikaId})`);
    }
    const sonKosu = politika.kosular[0] ?? null;
    const testler = politika.kosular.flatMap((k) => k.geriYuklemeler)
      .sort((a, b) => b.zaman.getTime() - a.zaman.getTime());
    const sonTest = testler[0] ?? null;
    santralKatmani = {
      bagli: true,
      gerekce: `${politika.ad}: ${politika.kosular.length} koşu, ${testler.length} geri yükleme testi.`,
      politikaAdi: politika.ad,
      sonKosu: sonKosu && { zaman: sonKosu.zaman, durum: sonKosu.durum, hata: sonKosu.hata },
      sonRestoreTesti: sonTest && { zaman: sonTest.zaman, sonuc: sonTest.sonuc, sureDk: sonTest.sureDk },
    };
  }

  const celiskiler: string[] = [];
  if (santralKatmani.sonKosu?.durum === 'basarili' && varlikKatmani.yedeksiz.length > 0) {
    celiskiler.push(
      `Santral yedekleme koşusu başarılı görünüyor, ama ${varlikKatmani.yedeksiz.length} `
      + 'kritik varlığın kullanılabilir konfigürasyon yedeği yok — koşu bu varlıkları kapsamıyor olabilir.');
  }
  if (santralKatmani.bagli && !santralKatmani.sonRestoreTesti && varlikKatmani.yedegiVar > 0) {
    celiskiler.push(
      `${varlikKatmani.yedegiVar} kritik varlığın yedeği var ama hiç geri yükleme testi kaydı yok — `
      + 'yedeğin geri dönebildiği kanıtlanmamış (EPDK-SYM-8.1.2).');
  }
  if (varlikKatmani.bilinmeyen.length > 0 && varlikKatmani.kaynakBagli) {
    celiskiler.push(
      `${varlikKatmani.bilinmeyen.length} kritik varlık hiçbir katmanda ölçülmemiş — `
      + 'bu bir açık değil, bir kör nokta.');
  }

  return { tesisId, santralKatmani, varlikKatmani, celiskiler };
}

/* ═══ 7 · Uyum bağı — ÖNERİ üretir, MaddeDurumu'na YAZMAZ ═════════════ */

export const YEDEK_MADDE_BAGI = {
  kapsam: 'EPDK-SYM-8.1.1',
  geriYukleme: 'EPDK-SYM-8.1.2',
} as const;

export type MaddeKatkisi = 'destekler' | 'zayiflatir' | 'kanit_yok';

export type KontrolBagi = {
  maddeKodu: string;
  maddeId: string | null;
  maddeBaslik: string;
  katki: MaddeKatkisi;
  gerekce: string;
  /** İnsanın işleyeceği öneri cümlesi. */
  oneri: string;
  /** Sözleşme gereği HER ZAMAN false — bu bağ hiçbir koşulda kendiliğinden uygulanmaz. */
  otomatikUygulanir: false;
};

/**
 * Bir varlığın yedek durumunun HANGİ kontrol maddesini beslediğini döndürür.
 *
 * Sözleşme: `MaddeDurumu` BU FONKSİYONDAN GÜNCELLENMEZ. Otomasyon önerir,
 * insan karar verir (detect → correlate → propose → human approve). Dönen
 * `otomatikUygulanir` alanı tip düzeyinde `false` sabitidir; bir çağıran
 * "true ise uygula" yazsa bile derleyici o dalı ölü kod olarak görür.
 */
export async function yedekKontrolBagi(varlikId: string): Promise<KontrolBagi[]> {
  const [varlik, varligiVar, degisim, iyi] = await Promise.all([
    db.varlik.findUnique({ where: { id: varlikId }, select: { etiket: true } }),
    yedekVarMi(varlikId),
    konfigurasyonDegistiMi(varlikId),
    sonBilinenIyi(varlikId),
  ]);
  if (!varlik) throw new Error(`yedekKontrolBagi: varlık bulunamadı (${varlikId})`);
  const etiket = varlik.etiket;
  const yas = await sonYedekYasi(varlikId);

  const maddeler = await db.madde.findMany({
    where: { kod: { in: [YEDEK_MADDE_BAGI.kapsam, YEDEK_MADDE_BAGI.geriYukleme] } },
    select: { id: true, kod: true, baslik: true },
  });
  const madde = (kod: string) => maddeler.find((m) => m.kod === kod) ?? null;

  const baglar: KontrolBagi[] = [];

  /* 8.1.1 — yedek kapsamı: varlığın yedeği var mı, taze mi. */
  {
    const m = madde(YEDEK_MADDE_BAGI.kapsam);
    const katki: MaddeKatkisi = varligiVar.sonuc === 'var' ? 'destekler'
      : varligiVar.sonuc === 'yok' ? 'zayiflatir' : 'kanit_yok';
    const tazelikNotu = yas === null ? ''
      : yas > 90 ? ` Ancak son yedek ${yas} gün önce — kapsam var, tazelik tartışmalı.` : '';
    baglar.push({
      maddeKodu: YEDEK_MADDE_BAGI.kapsam,
      maddeId: m?.id ?? null,
      maddeBaslik: m?.baslik ?? 'Yedek kapsamı',
      katki,
      gerekce: `${etiket}: ${varligiVar.gerekce}${tazelikNotu}`,
      oneri: katki === 'zayiflatir'
        ? `${etiket} için yedek kapsamı açığı var; ${YEDEK_MADDE_BAGI.kapsam} maddesinin `
          + 'değerlendirmesi gözden geçirilsin.'
        : katki === 'kanit_yok'
          ? `${etiket} yedek durumu ölçülmemiş; ${YEDEK_MADDE_BAGI.kapsam} için otomatik kanıt `
            + 'üretilemiyor — kaynak bağlanana kadar öz değerlendirme geçerli.'
          : `${etiket} yedek kaydı ${YEDEK_MADDE_BAGI.kapsam} için otomatik kanıt adayı; `
            + 'kanıt olarak bağlanması insan onayı ister.',
      otomatikUygulanir: false,
    });
  }

  /* 8.1.2 — geri yükleme testi: yedek geri dönebiliyor mu (doğrulama/restore). */
  {
    const m = madde(YEDEK_MADDE_BAGI.geriYukleme);
    const dogrulanmis = iyi.yedek?.dogrulandi === true || iyi.yedek?.restoreTestId != null;
    const katki: MaddeKatkisi = varligiVar.sonuc !== 'var' ? 'kanit_yok'
      : dogrulanmis ? 'destekler' : 'zayiflatir';
    baglar.push({
      maddeKodu: YEDEK_MADDE_BAGI.geriYukleme,
      maddeId: m?.id ?? null,
      maddeBaslik: m?.baslik ?? 'Geri yükleme testi',
      katki,
      gerekce: katki === 'kanit_yok'
        ? `${etiket}: doğrulanacak bir yedek yok (${varligiVar.gerekce})`
        : dogrulanmis
          ? `${etiket}: son bilinen iyi yedek doğrulanmış${
            iyi.yedek?.restoreTestId ? ' ve bir geri yükleme testine bağlı' : ''}.`
          : `${etiket}: yedek var ama okunabilirliği doğrulanmamış — `
            + '"yedek alındı" ile "geri dönebiliyoruz" aynı şey değil.',
      oneri: katki === 'zayiflatir'
        ? `${etiket} yedeği için geri yükleme testi planlansın; ${YEDEK_MADDE_BAGI.geriYukleme} `
          + 'kanıtı eksik.'
        : `${YEDEK_MADDE_BAGI.geriYukleme} için otomatik kanıt adayı — insan doğrulaması ister.`,
      otomatikUygulanir: false,
    });
  }

  // Konfigürasyon değişimi maddeyi doğrudan beslemez; öneriye bağlam katar.
  if (degisim.sonuc === 'var') {
    baglar[0].oneri += ' Not: son iki yedek arasında konfigürasyon değişmiş — '
      + 'değişiklik kaydıyla eşleşip eşleşmediği kontrol edilsin.';
  }

  return baglar;
}

/* ═══ 8 · Dış kaynaktan yedek metadata'sı yazımı ══════════════════════ */

export type YedekMetadataGozlemi = {
  koken: Koken;
  varlikId: string;
  yedekZamani: Date;
  basarili: boolean;
  surum?: string | null;
  icerikHash?: string | null;
  depolamaKonumu?: string | null;
  saklamaGun?: number | null;
  hata?: string | null;
};

/**
 * Dış yedekleme sisteminden gelen bir yedek METADATA'sını idempotent yazar.
 *
 * Yedek almaz, dosya taşımaz — yalnız "şu varlığın şu zamanda şu sonuçla
 * yedeği alınmış" bilgisini kaydeder ve `kokenYaz()` ile kökenini bırakır.
 *
 * Idempotency: (kaynakSistem, kaynakKayitId) çifti tabloda TEKİL'dir ve
 * kısıt veritabanında durur. Aynılık doğrudan bu çiftten okunur; daha önce
 * kullanılan `VeriKokeni` üzerinden dolaylı arama düştü — o yol iki
 * eşzamanlı içe aktarımın ikisinin de "köken yok" görüp aynı yedeği iki
 * kez yazmasına açıktı.
 *
 * `dogrulandi` ve `sonBilinenIyi` alanlarına BU FONKSİYON DOKUNMAZ: ikisi
 * de insan kararıdır, kaynak sistem yeniden senkronize edildi diye
 * sıfırlanmaz ya da otomatik konmaz.
 */
export async function yedekMetadataYaz(
  g: YedekMetadataGozlemi,
): Promise<{ id: string; yeni: boolean }> {
  if (!g.koken?.kaynakSistem) {
    throw new Error('yedekMetadataYaz: kaynakSistem zorunlu — kaynağı bilinmeyen veri otomatik sayılamaz');
  }
  if (!g.koken?.kaynakKayitId) {
    throw new Error('yedekMetadataYaz: kaynakKayitId zorunlu — idempotency buna dayanır');
  }
  if (!g.varlikId) throw new Error('yedekMetadataYaz: varlikId zorunlu');

  return db.$transaction(async (tx) => {
    const varlik = await tx.varlik.findUnique({
      where: { id: g.varlikId }, select: { id: true } });
    if (!varlik) throw new Error(`yedekMetadataYaz: varlık bulunamadı (${g.varlikId})`);

    const mevcutId = await eslesenKayitId(tx, g.koken.kaynakSistem, g.koken.kaynakKayitId);
    const veri = {
      varlikId: g.varlikId,
      kaynakSistem: g.koken.kaynakSistem,
      kaynakKayitId: g.koken.kaynakKayitId,
      yedekZamani: g.yedekZamani,
      basarili: g.basarili,
      surum: g.surum ?? null,
      icerikHash: g.icerikHash ?? null,
      depolamaKonumu: g.depolamaKonumu ?? null,
      saklamaGun: g.saklamaGun ?? null,
      hata: g.hata ?? null,
    };

    const kayit = mevcutId
      ? await tx.konfigurasyonYedegi.update({ where: { id: mevcutId }, data: veri })
      : await tx.konfigurasyonYedegi.create({ data: veri });

    await kokenYaz({
      varlikTipi: YEDEK_VARLIK_TIPI,
      varlikId: kayit.id,
      kaynakSistem: g.koken.kaynakSistem,
      kaynakKayitId: g.koken.kaynakKayitId,
      toplanma: g.koken.toplanma ?? null,
      guven: g.koken.guven ?? null,
    }, tx);

    return { id: kayit.id, yeni: mevcutId === null };
  });
}

/** Idempotency araması: kaydın kaynak sistemdeki kimliği (yukarıdaki nota
    bakın). Kısıt veritabanında olduğu için burası tek sorgu. */
async function eslesenKayitId(
  istemci: Istemci, kaynakSistem: string, kaynakKayitId: string,
): Promise<string | null> {
  const kayit = await istemci.konfigurasyonYedegi.findUnique({
    where: { kaynakSistem_kaynakKayitId: { kaynakSistem, kaynakKayitId } },
    select: { id: true },
  });
  return kayit?.id ?? null;
}

/** Konfigürasyon yedeği kaynağı gerçekten bağlı mı (tek kayıt bile yeter). */
export async function yedekKaynagiBagliMi(): Promise<boolean> {
  return (await db.konfigurasyonYedegi.count()) > 0;
}

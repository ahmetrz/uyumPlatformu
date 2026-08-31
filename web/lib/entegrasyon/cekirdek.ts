import 'server-only';
import { db } from '../db';
import { siriCoz, sirSizintisiVarMi } from './sir';
import { kokenYaz } from './koken';
import { adaptorCoz } from './kayit';
import type { Adaptor, AdaptorBaglami, CekmeSonucu, Gozlem } from './sozlesme';

/* Connector senkronizasyon çekirdeği.

   Bir connector'ı uçtan uca koşturur:
     bayat koşuları kapat → çakışma kontrolü → koşu kaydı aç → adaptörü çöz
     → sırrı çöz → fetchChanges → normalize → validate → upsert → koşuyu kapat

   Sözleşme (isKos ile aynı ilkeler, ayrı kayıt tablosu):
   · Her koşu bir `EntegrasyonKosusu` satırı bırakır — sessiz hata YOK.
   · Aynı connector için ikinci koşu başlamaz (çakışma önleme).
   · Süreç ölse bile koşu `calisiyor` kalmaz: bir sonraki koşu (ya da
     `bayatKosulariKapat` süpürücüsü) bayat satırı `basarisiz` kapatır.
   · İmleç YALNIZ başarılı koşuda ilerler; başarısız koşuda ilerlerse
     çekilememiş kayıtlar bir daha hiç gelmez.
   · Sır değeri hiçbir koşulda loglanmaz, koşu kaydına yazılmaz, döndürülmez.
   · `kimlik_bekleniyor` bir HATA DEĞİL, bir DURUMDUR: adaptör bağlanamıyorsa
     koşu çalıştırılmaz, satır bu durumla kapatılır ve connector `hatali`
     işaretlenmez.

   Sayaç sözleşmesi:  alinan = kabulEdilen + reddedilen
                      yinelenen ⊆ kabulEdilen   (aynı kaynak kaydı yeniden geldi)

   Hedef tablo: `KesifKaydi`. Otomasyon ÖNERİR, karar vermez — gelen gözlem
   doğrudan Varlik/Zafiyet satırına dönüşmez, insan incelemesi bekleyen
   keşif kaydına yazılır ve `kokenYaz()` ile kökenlenir. */

/* ═══ Tipler ══════════════════════════════════════════════════════════ */

export type Tetikleyen = 'manuel' | 'zamanlanmis' | 'api';

/** `atlandi` = koşu hiç başlamadı (pasif/silinmiş connector ya da çakışma). */
export type KosuDurumu = 'basarili' | 'basarisiz' | 'kimlik_bekleniyor' | 'atlandi';

export type KosuOzeti = {
  connectorId: string;
  /** koşu kaydı açılmadıysa (atlandi) null */
  kosuId: string | null;
  durum: KosuDurumu;
  alinan: number;
  kabulEdilen: number;
  reddedilen: number;
  yinelenen: number;
  denemeNo: number;
  sureMs: number;
  imlecOnce: string | null;
  imlecSonra: string | null;
  /** insan okunabilir özet — SIR İÇERMEZ */
  ayrinti: string;
  hata: string | null;
};

export type SenkronSecenegi = {
  tetikleyen?: Tetikleyen;
  maksDeneme?: number;
  maksSayfa?: number;
  bayatEsikMs?: number;
  /** geri çekilme beklemesi — testler gerçek saat beklemesin diye enjekte edilir */
  bekle?: (ms: number) => Promise<void>;
};

/* ═══ Sabitler ════════════════════════════════════════════════════════ */

/** Üstel geri çekilme: 1s, 4s, 16s. */
export const GERI_CEKILME_MS = [1_000, 4_000, 16_000] as const;
export const VARSAYILAN_MAKS_DENEME = 3;
/** Bu süreden uzun 'calisiyor' kalan koşu bayattır: süreç ölmüştür. */
export const BAYAT_ESIK_MS = 15 * 60_000;
/** Koşu kaydındaki özet metin sınırı (~2KB). */
export const OZET_SINIRI = 2_000;
const VARSAYILAN_MAKS_SAYFA = 50;

/** Bu durumlardaki keşif kaydına yeniden senkronizasyon DOKUNMAZ:
    makine ya da insan bir karar vermiştir, koşu onu geri almaz. */
const KARAR_VERILMIS = new Set(['eslesti', 'inceleme_bekliyor', 'onaylandi', 'reddedildi', 'yinelenen']);

/* ═══ Küçük yardımcılar ═══════════════════════════════════════════════ */

function mesaj(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  if (typeof e === 'string') return e;
  return 'Beklenmeyen hata';
}

/**
 * Sır sızıntısına karşı son savunma katmanı. Adaptör hata metnine ya da ham
 * yüke kimlik bilgisini koyduysa kalıcı hâle gelmeden maskelenir.
 * Tek hat değildir — asıl kural sırrı hiç yazmamaktır.
 */
export function sirsizlastir(metin: string, sir: string | null): string {
  if (!sir || !sirSizintisiVarMi(metin, sir)) return metin;
  return metin.split(sir).join('[SIR]');
}

function kirp(metin: string, sinir = OZET_SINIRI): string {
  if (metin.length <= sinir) return metin;
  return `${metin.slice(0, sinir - 20)}… (+${metin.length - (sinir - 20)} karakter)`;
}

/**
 * Yalnız GEÇİCİ hatalar tekrar denenir (ağ, zaman aşımı, geçici sunucu
 * hatası). Yetki ve doğrulama hataları tekrar denenmez — aynı sonucu verir,
 * kaynak sistemi gereksiz yorar ve kilitlenmeye yol açabilir.
 * Adaptör hatasına `gecici` alanı koyarak sınıflandırmayı devralabilir.
 */
export function geciciHataMi(e: unknown): boolean {
  const isaret = (e as { gecici?: unknown } | null | undefined)?.gecici;
  if (typeof isaret === 'boolean') return isaret;

  const kod = (e as { code?: unknown } | null | undefined)?.code;
  const durumKodu = (e as { status?: unknown } | null | undefined)?.status;
  const imza = [
    e instanceof Error ? e.name : '',
    mesaj(e),
    typeof kod === 'string' || typeof kod === 'number' ? String(kod) : '',
    typeof durumKodu === 'number' ? String(durumKodu) : '',
  ].join(' ');

  // Kalıcı: yetki / kimlik / doğrulama — tekrar denemek anlamsız.
  const kalici = /\b(401|403|Unauthorized|Forbidden|yetki|kimlik doğrulama|credential|invalid.?token|dogrulama|doğrulama|ZodError|ValidationError)\b/i;
  if (kalici.test(imza)) return false;

  const gecici = /\b(ETIMEDOUT|ECONNRESET|ECONNREFUSED|ECONNABORTED|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH|EPIPE|429|502|503|504|AbortError|TimeoutError|timeout|zaman aşımı|socket hang up|network|ağ hatası|geçici)\b/i;
  return gecici.test(imza);
}

/** Reddetme sebeplerini gruplayıp ~2KB'lık okunabilir özete çevirir. */
function redOzeti(sebepler: Map<string, number>, toplam: number): string | null {
  if (toplam === 0) return null;
  const satirlar = [...sebepler.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sebep, adet]) => `${adet}× ${sebep}`);
  return kirp(`${toplam} kayıt reddedildi · ${satirlar.join(' · ')}`);
}

function guvenliJson(deger: unknown, sir: string | null): string {
  let metin: string;
  try {
    metin = JSON.stringify(deger ?? null);
  } catch (e) {
    // Serileştirilemeyen ham yükü sessizce boş geçmek kaydı sahte yapar.
    throw new Error(`Ham yük JSON'a çevrilemedi: ${mesaj(e)}`);
  }
  if (metin === undefined) throw new Error("Ham yük JSON'a çevrilemedi (undefined)");
  return sirsizlastir(metin, sir);
}

/** Gözlemin `ham` alanı ayrı sütunda tutulur; normalJson gövdeyi taşır. */
function gozlemGovdesi(g: Gozlem): Record<string, unknown> {
  const kopya: Record<string, unknown> = { ...(g as unknown as Record<string, unknown>) };
  delete kopya.ham;
  return kopya;
}

/* ═══ Bayat koşu süpürücüsü ═══════════════════════════════════════════ */

/**
 * Süreç ölürse koşu satırı `calisiyor` kalır ve o connector bir daha asla
 * koşamaz (çakışma önleme onu bloklar). Bu süpürücü eşiği aşmış satırları
 * `basarisiz` kapatır — sebebi kayda yazar, sessizce silmez.
 *
 * Her senkronizasyondan önce çağrılır; zamanlanmış iş de connectorId
 * vermeden çağırıp tüm bayatları toplayabilir.
 */
export async function bayatKosulariKapat(
  connectorId?: string,
  esikMs: number = BAYAT_ESIK_MS,
): Promise<number> {
  const sinir = new Date(Date.now() - esikMs);
  const bayatlar = await db.entegrasyonKosusu.findMany({
    where: { durum: 'calisiyor', baslangic: { lt: sinir }, ...(connectorId ? { connectorId } : {}) },
    select: { id: true, connectorId: true, baslangic: true },
  });
  const simdi = Date.now();
  for (const k of bayatlar) {
    const gecen = Math.round((simdi - k.baslangic.getTime()) / 60_000);
    const aciklama = `Koşu yarıda kaldı: ${gecen} dk 'calisiyor' kaldı, ` +
      'süreç bitiş yazamadan sonlanmış. Bayat kayıt kapatıldı; imleç ilerletilmedi.';
    await db.entegrasyonKosusu.update({
      where: { id: k.id },
      data: { durum: 'basarisiz', bitis: new Date(), sureMs: simdi - k.baslangic.getTime(), hata: aciklama },
    });
    if (k.connectorId) {
      // updateMany: connector arada silinmişse hata fırlatmaz, satır bulunmaz.
      await db.connector.updateMany({
        where: { id: k.connectorId },
        data: { durum: 'hatali', sonHata: aciklama },
      });
    }
  }
  return bayatlar.length;
}

/* ═══ Çekim + tekrar deneme ═══════════════════════════════════════════ */

async function denemeliCek(
  adaptor: Adaptor,
  baglam: AdaptorBaglami,
  o: { maksDeneme: number; bekle: (ms: number) => Promise<void>; denemeBildir: (n: number) => Promise<void> },
): Promise<{ sonuc: CekmeSonucu; deneme: number }> {
  for (let deneme = 1; deneme <= o.maksDeneme; deneme++) {
    await o.denemeBildir(deneme);
    try {
      return { sonuc: await adaptor.fetchChanges(baglam), deneme };
    } catch (e) {
      const sonDeneme = deneme >= o.maksDeneme;
      if (sonDeneme || !geciciHataMi(e)) {
        const etiket = geciciHataMi(e)
          ? `${deneme} denemede başarısız (geçici hata)`
          : 'kalıcı hata — tekrar denenmedi';
        throw new Error(`${mesaj(e)} [${etiket}]`, { cause: e });
      }
      await o.bekle(GERI_CEKILME_MS[Math.min(deneme - 1, GERI_CEKILME_MS.length - 1)]);
    }
  }
  /* Döngü ya döner ya fırlatır; buraya düşmek imkânsızdır ama sessiz
     davranmaktansa açık hata verir. */
  throw new Error('Çekim döngüsü beklenmedik biçimde sonlandı');
}

/* ═══ Hedef kayıt (idempotent upsert) ═════════════════════════════════ */

/**
 * Gözlemi keşif kaydına yazar ve kökenler. Idempotency `(kaynakSistem,
 * kaynakKayitId)` üzerinedir: aynı kaynak kaydı ikinci kez geldiğinde YENİ
 * satır açılmaz, mevcut satır tazelenir.
 *
 * İnsan/makine kararı korunur: incelenmiş ya da eşleşmiş kayıt yeniden
 * senkronizasyonda başa dönmez (kokenYaz'ın doğrulama durumuna dokunmaması
 * ile aynı ilke).
 */
async function gozlemYaz(
  g: Gozlem,
  connector: { id: string; kaynakSistem: string },
  kosuId: string,
  sir: string | null,
): Promise<'yeni' | 'yinelenen'> {
  const kaynak = g.koken?.kaynakSistem?.trim();
  const kaynakKayitId = g.koken?.kaynakKayitId?.trim();
  if (!kaynak || !kaynakKayitId) {
    throw new Error('köken eksik — idempotency anahtarı olmadan kayıt yazılmaz');
  }
  const guven = g.koken.guven ?? null;   // null = ÖLÇÜLMEDİ, sıfır güven değil
  if (guven != null && (guven < 0 || guven > 1)) {
    throw new Error(`güven 0–1 aralığında olmalı (${guven})`);
  }

  const mevcut = await db.kesifKaydi.findUnique({
    where: { kaynak_kaynakKayitId: { kaynak, kaynakKayitId } },
    select: { id: true, durum: true },
  });
  const hamJson = guvenliJson(g.ham, sir);
  const normalJson = guvenliJson(gozlemGovdesi(g), sir);
  const simdi = new Date();
  const kararVerilmis = mevcut ? KARAR_VERILMIS.has(mevcut.durum) : false;

  await db.$transaction(async (tx) => {
    const kayit = await tx.kesifKaydi.upsert({
      where: { kaynak_kaynakKayitId: { kaynak, kaynakKayitId } },
      create: {
        kaynak, kaynakKayitId, connectorId: connector.id, kosuId,
        hamJson, normalJson, durum: 'normalize', guvenSkoru: guven,
        ilkGorulme: simdi, sonGorulme: simdi,
      },
      update: {
        connectorId: connector.id, kosuId, hamJson, normalJson,
        guvenSkoru: guven, sonGorulme: simdi,
        // karar verilmiş kayıt başa döndürülmez
        ...(kararVerilmis ? {} : { durum: 'normalize' }),
      },
      select: { id: true },
    });
    await kokenYaz({
      varlikTipi: 'KesifKaydi',
      varlikId: kayit.id,
      kaynakSistem: kaynak,
      kaynakKayitId,
      connectorId: connector.id,
      kosuId,
      toplanma: g.koken.toplanma ?? null,
      guven,
    }, tx);
  });

  return mevcut ? 'yinelenen' : 'yeni';
}

/* ═══ Çekirdek ════════════════════════════════════════════════════════ */

/**
 * Bir connector'ı uçtan uca koşturur. Hiçbir yolda sessiz dönmez: ya
 * `EntegrasyonKosusu` satırı yazılır ya da `atlandi` sebebi döner.
 *
 * Connector bulunamazsa fırlatır — koşu kaydı bir connector'a bağlanamadan
 * yazılamaz, bu yüzden çağıranın (server action) hatası olarak yüzeye çıkar.
 */
export async function senkronizasyonKos(
  connectorId: string,
  secenek: SenkronSecenegi = {},
): Promise<KosuOzeti> {
  const t0 = Date.now();
  const tetikleyen: Tetikleyen = secenek.tetikleyen ?? 'manuel';
  const maksDeneme = Math.max(1, secenek.maksDeneme ?? VARSAYILAN_MAKS_DENEME);
  const maksSayfa = Math.max(1, secenek.maksSayfa ?? VARSAYILAN_MAKS_SAYFA);
  const bekle = secenek.bekle ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  const connector = await db.connector.findUnique({ where: { id: connectorId } });
  if (!connector) throw new Error(`Connector bulunamadı: ${connectorId}`);

  const atlandi = (sebep: string): KosuOzeti => ({
    connectorId, kosuId: null, durum: 'atlandi',
    alinan: 0, kabulEdilen: 0, reddedilen: 0, yinelenen: 0,
    denemeNo: 0, sureMs: Date.now() - t0,
    imlecOnce: connector.imlec, imlecSonra: null,
    ayrinti: sebep, hata: null,
  });

  // 0) Süreç ölmüş olabilir: bayat 'calisiyor' satırlarını kapat.
  await bayatKosulariKapat(connectorId, secenek.bayatEsikMs);

  // 1) Silinmiş / pasif connector koşmaz.
  if (connector.silindi) return atlandi('Silinmiş connector koşturulmaz');
  if (!connector.etkin) return atlandi('Connector pasif — koşu başlatılmadı');

  // 2) Çakışma önleme: aynı connector için ikinci koşu başlamaz.
  const calisan = await db.entegrasyonKosusu.findFirst({
    where: { connectorId, durum: 'calisiyor' },
    select: { id: true, baslangic: true },
  });
  if (calisan) {
    return atlandi(`Bu connector için bir koşu zaten sürüyor (${calisan.id})`);
  }

  const imlecOnce = connector.imlec;
  const kosu = await db.entegrasyonKosusu.create({
    data: {
      kaynak: connector.tip, connectorId, tetikleyen,
      guvenEtiketi: 'otomatik', durum: 'calisiyor', denemeNo: 1, imlecOnce,
    },
    select: { id: true },
  });

  const sayac = { alinan: 0, kabulEdilen: 0, reddedilen: 0, yinelenen: 0 };
  const redSebepleri = new Map<string, number>();
  const redEkle = (sebep: string, adet = 1) => {
    const k = kirp(sebep.replace(/\s+/g, ' ').trim() || 'sebep bildirilmedi', 160);
    redSebepleri.set(k, (redSebepleri.get(k) ?? 0) + adet);
    sayac.reddedilen += adet;
  };
  let denemeNo = 1;
  let sir: string | null = null;

  /** Koşuyu kapatır — her çıkış yolu buradan geçer, `calisiyor` kalmaz. */
  const kapat = async (
    durum: Exclude<KosuDurumu, 'atlandi'>,
    o: { hata?: string | null; imlecSonra?: string | null; ayrinti: string },
  ): Promise<KosuOzeti> => {
    const sureMs = Date.now() - t0;
    const hataMetni = o.hata ? kirp(sirsizlastir(o.hata, sir)) : null;
    await db.entegrasyonKosusu.update({
      where: { id: kosu.id },
      data: {
        durum, bitis: new Date(), sureMs, denemeNo,
        alinan: sayac.alinan, kabulEdilen: sayac.kabulEdilen,
        reddedilen: sayac.reddedilen, yinelenen: sayac.yinelenen,
        kayitSayisi: sayac.kabulEdilen,
        imlecSonra: o.imlecSonra ?? null,
        hata: hataMetni,
      },
    });

    /* Connector durumu her koşu sonunda tazelenir.
       kimlik_bekleniyor HATA DEĞİL: connector 'hatali' işaretlenmez,
       'taslak' (henüz işler değil) olur ve sonHata boş bırakılır. */
    if (durum === 'basarili') {
      await db.connector.update({
        where: { id: connectorId },
        data: {
          durum: 'etkin', sonHata: null, sonBasariliKosu: new Date(),
          // İmleç YALNIZ başarılı koşuda ve adaptör yeni imleç verdiyse ilerler.
          ...(o.imlecSonra != null ? { imlec: o.imlecSonra } : {}),
        },
      });
    } else if (durum === 'kimlik_bekleniyor') {
      await db.connector.update({
        where: { id: connectorId },
        data: { durum: 'taslak', sonHata: null },
      });
    } else {
      await db.connector.update({
        where: { id: connectorId },
        data: { durum: 'hatali', sonHata: hataMetni },
      });
    }

    return {
      connectorId, kosuId: kosu.id, durum,
      alinan: sayac.alinan, kabulEdilen: sayac.kabulEdilen,
      reddedilen: sayac.reddedilen, yinelenen: sayac.yinelenen,
      denemeNo, sureMs, imlecOnce, imlecSonra: o.imlecSonra ?? null,
      ayrinti: o.ayrinti, hata: hataMetni,
    };
  };

  // 3) Adaptörü çöz — yoksa koşu sessizce geçilmez, başarısız kapanır.
  let adaptor: Adaptor;
  try {
    adaptor = adaptorCoz(connector.tip);
  } catch (e) {
    return kapat('basarisiz', { hata: mesaj(e), ayrinti: 'Adaptör kayıtlı değil' });
  }

  const yapilandirmaCoz = (): Record<string, unknown> => {
    if (!connector.yapilandirmaJson) return {};
    const ayristirilan: unknown = JSON.parse(connector.yapilandirmaJson);
    if (!ayristirilan || typeof ayristirilan !== 'object' || Array.isArray(ayristirilan)) {
      throw new Error('Yapılandırma bir JSON nesnesi olmalı');
    }
    return ayristirilan as Record<string, unknown>;
  };
  let yapilandirma: Record<string, unknown>;
  try {
    yapilandirma = yapilandirmaCoz();
  } catch (e) {
    return kapat('basarisiz', { hata: `Yapılandırma okunamadı: ${mesaj(e)}`, ayrinti: 'Yapılandırma geçersiz' });
  }

  // 4) Bağlanamayan adaptör: koşu BAŞLATILMAZ, satır 'kimlik_bekleniyor' kapanır.
  if (adaptor.baglanabilir === false) {
    const saglik = await adaptor.health({
      connectorId, kod: connector.kod, kaynakSistem: connector.kaynakSistem,
      yapilandirma, sir: null, imlec: imlecOnce,
    });
    return kapat('kimlik_bekleniyor', {
      // `hata` sütunu koşunun açıklama alanıdır (reddedilen özeti de buraya
      // yazılır); kırmızı/bekliyor ayrımını `durum` verir, bu alanın doluluğu değil.
      hata: saglik.ayrinti || 'Adaptör bağlı değil — kimlik bilgisi bekleniyor',
      ayrinti: saglik.ayrinti || 'Kimlik bilgisi bekleniyor',
    });
  }

  // 5) Sır çözümü — değer yalnız bellekte yaşar, hiçbir yere yazılmaz.
  if (connector.sirReferansi) {
    const cozum = await siriCoz(connector.sirReferansi);
    if (!cozum.ok) {
      return kapat('basarisiz', { hata: `Sır çözülemedi: ${cozum.hata}`, ayrinti: 'Sır çözülemedi' });
    }
    sir = cozum.deger;
  } else if (connector.kimlikTipi !== 'none') {
    return kapat('basarisiz', {
      hata: `Kimlik tipi '${connector.kimlikTipi}' için sır referansı tanımlı değil`,
      ayrinti: 'Sır referansı eksik',
    });
  }

  // 6) Çekim döngüsü: sayfa sayfa çek, normalize et, doğrula, yaz.
  let imlec = imlecOnce;
  let yazmaHatasi = 0;
  try {
    let devam = true;
    for (let sayfa = 1; devam; sayfa++) {
      if (sayfa > maksSayfa) {
        throw new Error(`Sayfa sınırı aşıldı (${maksSayfa}) — adaptör devamVar bayrağını kapatmıyor`);
      }
      const baglam: AdaptorBaglami = {
        connectorId, kod: connector.kod, kaynakSistem: connector.kaynakSistem,
        yapilandirma, sir, imlec,
      };
      const { sonuc, deneme } = await denemeliCek(adaptor, baglam, {
        maksDeneme, bekle,
        denemeBildir: async (n) => {
          // Süreç deneme ortasında ölse bile kaçıncı denemede olduğu kayıtta durur.
          if (n <= denemeNo) return;
          denemeNo = n;
          await db.entegrasyonKosusu.update({ where: { id: kosu.id }, data: { denemeNo: n } });
        },
      });
      denemeNo = Math.max(denemeNo, deneme);

      const cekilen = Array.isArray(sonuc?.gozlemler) ? sonuc.gozlemler : [];

      /* normalize kancası: sözleşmede fetchChanges zaten Gozlem[] döndürür,
         `normalize` ham yükü çeviren adaptörler içindir. Kanca boş dönerse
         (uygulanmamışsa) fetchChanges çıktısı geçerlidir; kayıt sayısı
         azalırsa fark REDDEDİLENLERE yazılır — kayıt sessizce düşmez. */
      const cevrilen = adaptor.normalize(cekilen.map((g) => (g as Gozlem)?.ham), baglam) ?? [];
      let gozlemler: Gozlem[];
      if (cevrilen.length === 0) {
        gozlemler = cekilen;
      } else {
        gozlemler = cevrilen;
        if (cevrilen.length < cekilen.length) {
          redEkle('normalize sırasında düştü (adaptör sebep bildirmedi)', cekilen.length - cevrilen.length);
        }
      }
      sayac.alinan += Math.max(cekilen.length, gozlemler.length);

      const dogrulama = adaptor.validate(gozlemler);
      const gecerli = dogrulama?.gecerli ?? [];
      for (const r of dogrulama?.reddedilen ?? []) redEkle(r.sebep);
      const kayip = gozlemler.length - gecerli.length - (dogrulama?.reddedilen?.length ?? 0);
      if (kayip > 0) redEkle('doğrulamada kayboldu (adaptör ne kabul ne ret bildirdi)', kayip);

      for (const g of gecerli) {
        try {
          const sonuclanan = await gozlemYaz(g, connector, kosu.id, sir);
          sayac.kabulEdilen++;
          if (sonuclanan === 'yinelenen') sayac.yinelenen++;
        } catch (e) {
          /* Yazılamayan kayıt yutulmaz: sebebi koşu kaydına girer ve koşu
             başarısız kapanır — imleç ilerlemezse kayıt kaybolmaz. */
          yazmaHatasi++;
          redEkle(`yazılamadı: ${sirsizlastir(mesaj(e), sir)}`);
        }
      }

      const yeni = sonuc?.yeniImlec ?? null;
      devam = Boolean(sonuc?.devamVar);
      if (devam && yeni === imlec) {
        throw new Error('Adaptör devamVar=true dedi ama imleci ilerletmedi — sonsuz döngü önlendi');
      }
      if (yeni != null) imlec = yeni;
    }
  } catch (e) {
    const ozet = redOzeti(redSebepleri, sayac.reddedilen);
    return kapat('basarisiz', {
      hata: [mesaj(e), ozet].filter(Boolean).join(' · '),
      imlecSonra: null,                       // BAŞARISIZ KOŞUDA İMLEÇ İLERLEMEZ
      ayrinti: 'Çekim başarısız',
    });
  }

  const ozet = redOzeti(redSebepleri, sayac.reddedilen);
  const sayim = `${sayac.alinan} alındı · ${sayac.kabulEdilen} kabul · ` +
    `${sayac.reddedilen} reddedildi · ${sayac.yinelenen} yinelenen`;

  if (yazmaHatasi > 0) {
    return kapat('basarisiz', {
      hata: [`${yazmaHatasi} kayıt yazılamadı`, ozet].filter(Boolean).join(' · '),
      imlecSonra: null,
      ayrinti: `Kısmî yazma hatası · ${sayim}`,
    });
  }
  return kapat('basarili', { hata: ozet, imlecSonra: imlec, ayrinti: sayim });
}

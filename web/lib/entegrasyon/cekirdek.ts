import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '../db';
import { siriCoz, sirSizintisiVarMi } from './sir';
import { kokenYaz } from './koken';
import { adaptorCoz } from './kayit';
import { bekleyenleriEslestir, varlikIndeksiYukle } from './kesif';
import { connectorProfili, eslemeRedleriniYaz, gozlemeUygula, type ProfilKaydi } from './esleme';
import {
  kuruCumle, kuruDefterAc, kuruOzetJson, sayacTutarsizligi,
  type KuruDefter, type KuruOzet, type RedAsamasi,
} from './kuru';
import { isKos } from '../motorlar/isKosucu';
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
  /** başarısızlıkta hatanın SINIFI; başarılı koşuda null */
  hataSinifi: HataSinifi | null;
  /** bu koşuyu, ürettiği dead-letter satırlarını ve denetim izini bağlayan
      kimlik. Bir kullanıcı "şu koşuda ne oldu" diye sorduğunda tek anahtar. */
  korelasyonId: string;
  /** koşu sonrası connector'ın ardışık hata sayacı */
  ardisikHata: number;
  /** devre kesici bu koşuda tetiklendi mi (connector duraklatıldı) */
  devreKesildi: boolean;
  /** KURU KOŞU muydu? true ise hiçbir kayıt yazılmadı, imleç ilerlemedi. */
  kuru: boolean;
  /** kuru koşunun "olsaydı ne olurdu" raporu; gerçek koşuda null */
  kuruOzet: KuruOzet | null;
  /** koşuda kullanılan eşleme profili sürümü; null = gömülü eşleme */
  eslemeProfilSurumu: number | null;
};

export type SenkronSecenegi = {
  tetikleyen?: Tetikleyen;
  maksDeneme?: number;
  maksSayfa?: number;
  bayatEsikMs?: number;
  /** geri çekilme beklemesi — testler gerçek saat beklemesin diye enjekte edilir */
  bekle?: (ms: number) => Promise<void>;
  /** çağıran zaten bir korelasyon kimliği taşıyorsa (API isteği, zincir)
      koşu onunla etiketlenir; verilmezse üretilir. */
  korelasyonId?: string;
  /**
   * KURU KOŞU: dış yük çekilir, normalize edilir, eşlenir, doğrulanır ve
   * etkileri hesaplanır — ama HİÇBİR ŞEY YAZILMAZ. CMDB'ye dokunulmaz,
   * risk/bulgu/proje adayı üretilmez, temel değişmez, imleç ilerlemez,
   * motor zinciri tetiklenmez. Tek kalıcı iz koşunun kendi kaydıdır ve o
   * kayıt `kuruKosu: true` taşır.
   */
  kuru?: boolean;
};

/* ═══ Sabitler ════════════════════════════════════════════════════════ */

/** Üstel geri çekilme: 1s, 4s, 16s. */
export const GERI_CEKILME_MS = [1_000, 4_000, 16_000] as const;
export const VARSAYILAN_MAKS_DENEME = 3;
/** Bu süreden uzun 'calisiyor' kalan koşu bayattır: süreç ölmüştür. */
export const BAYAT_ESIK_MS = 15 * 60_000;

/* ── DEVRE KESİCİ ─────────────────────────────────────────────────────
   Eskiden TEK başarısız koşu connector'ı `hatali` yapıyordu. Zamanlayıcı
   `hatali` bir connector'ı bir daha koşturmadığı için (elle yeniden
   etkinleştirilmesi gerekir), tek bir ağ kesintisi entegrasyonu KALICI
   olarak durduruyordu ve kimse sebebini "geçici bir hata" diye aramıyordu.

   Diğer uç da yanlış: hiç durmamak. Kimlik bilgisi süresi dolmuş bir
   connector her poll aralığında kurumsal bir uca yanlış kimlikle vurur;
   çoğu dizin bunu birkaç denemeden sonra HESAP KİLİTLEMESİYLE karşılar.
   Yani "asla duraklatma", kendi servis hesabını kilitletmek demektir.

   Bu yüzden eşik SAYILIR: art arda `ardisikHataSiniri` kez başarısız olan
   connector duraklatılır. Sayaç ilk başarıda sıfırlanır — araya giren tek
   başarılı koşu, sayacın sıfırlanmasını hak eder.

   `ardisikHataSiniri` null ise bu varsayılan kullanılır. Şema yorumu bir
   zamanlar "null = duraklatma yok" diyordu; yukarıdaki hesap kilitleme
   gerekçesiyle bu güvenli varsayılan değil. Duraklatmayı gerçekten
   istemeyen kurulum sınırı açıkça 0 verir. */
export const VARSAYILAN_ARDISIK_HATA_SINIRI = 5;

/** Bir koşunun neden başarısız olduğunun SINIFI. Sebep metni insan
    içindir; sınıf makine içindir: hangi hatanın tekrar denenebileceğine,
    hangisinin kurulum işi olduğuna buradan bakılır. */
export type HataSinifi =
  | 'gecici'        // ağ, zaman aşımı, 5xx — tekrar denenir
  | 'yetki'         // 401/403 — tekrar denemek hesabı kilitletir
  | 'yapilandirma'  // adaptör yok, uç nokta yanlış, profil bozuk
  | 'sir'           // sır referansı çözülemedi
  | 'sozlesme'      // adaptör sözleşmeyi çiğnedi (imleç ilerletmedi vb.)
  | 'yazma'         // veritabanına yazılamadı
  | 'bilinmeyen';

/** Hata metninden/nesnesinden sınıf çıkarır. Bilinmeyen sınıf UYDURULMAZ:
    tanınmayan hata `bilinmeyen` kalır ve `gecici` sayılmaz — bilinmeyen
    bir hatayı geçici saymak, kalıcı bir arızayı sonsuz tekrar denemeye
    çevirirdi. */
export function hataSinifiCikar(e: unknown, ipucu?: HataSinifi): HataSinifi {
  if (ipucu) return ipucu;
  const durumKodu = (e as { status?: unknown } | null | undefined)?.status;
  if (durumKodu === 401 || durumKodu === 403) return 'yetki';
  const metin = (e instanceof Error ? `${e.name} ${e.message}` : String(e ?? '')).toLowerCase();
  if (/yetkisiz|unauthorized|forbidden|invalid[_ ]?credential|401|403/.test(metin)) return 'yetki';
  if (/sır|secret|vault|çözülemedi/.test(metin)) return 'sir';
  if (/adaptör|profil|yapılandırma|endpoint|uç nokta/.test(metin)) return 'yapilandirma';
  if (/imleci ilerletmedi|sözleşme|contract/.test(metin)) return 'sozlesme';
  if (geciciHataMi(e)) return 'gecici';
  return 'bilinmeyen';
}
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
    select: { id: true, connectorId: true, baslangic: true, kuruKosu: true },
  });
  const simdi = Date.now();
  for (const k of bayatlar) {
    const gecen = Math.round((simdi - k.baslangic.getTime()) / 60_000);
    const aciklama = `${k.kuruKosu ? 'KURU koşu' : 'Koşu'} yarıda kaldı: ${gecen} dk 'calisiyor' kaldı, ` +
      'süreç bitiş yazamadan sonlanmış. Bayat kayıt kapatıldı; imleç ilerletilmedi.';
    await db.entegrasyonKosusu.update({
      where: { id: k.id },
      data: { durum: 'basarisiz', bitis: new Date(), sureMs: simdi - k.baslangic.getTime(), hata: aciklama },
    });
    /* Yarıda kalmış KURU koşu connector'ı 'hatali' yapmaz: kuru koşu
       connector kaydına hiçbir koşulda dokunmaz ve zaten hiç veri
       getirmemiştir — entegrasyonun sağlığı hakkında bir şey söylemez. */
    if (k.connectorId && !k.kuruKosu) {
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

/* ═══ Santral çözümü ══════════════════════════════════════════════════ */

/**
 * Bir tesis KODUNU tesis kimliğine çevirir. Sonuç koşu boyunca
 * önbelleklenir; çözülemeyen kod da önbelleğe `null` olarak girer ki
 * her kayıt için tekrar sorgulanmasın.
 *
 * Çözülemeyen kod SESSİZ GEÇMEZ ama kaydı da düşürmez: keşif kaydının
 * santrali `null` (BİLİNMİYOR) kalır ve ham gözlemdeki kod inceleme
 * ekranında "Tesis kodu" alanı olarak görünür. Platformda tanımlı olmayan
 * bir santralde cihaz bulmak, görmezden gelinecek değil GÖRÜLECEK bir
 * durumdur.
 */
async function tesisKodunuCoz(
  kod: string | null | undefined,
  onbellek: Map<string, string | null>,
): Promise<string | null> {
  const k = kod?.trim();
  if (!k) return null;
  const onbelleklenmis = onbellek.get(k);
  if (onbelleklenmis !== undefined) return onbelleklenmis;
  const tesis = await db.tesis.findUnique({ where: { kod: k }, select: { id: true } });
  const id = tesis?.id ?? null;
  onbellek.set(k, id);
  return id;
}

/* ═══ Connector kapsamı ══════════════════════════════════════════════ */

/**
 * Connector'ın YAZABİLECEĞİ santral kodları. `null` = kapsam sınırı YOK.
 *
 * NEDEN gerekli: `yapilandirma.tesisKodu` bir VARSAYILANDIR, kapsam değil —
 * gözlemin kendi `tesisKodu` alanı onu ezer (bilinçli davranış, kendi testi
 * var). Yani tek başına o alan yanlış yapılandırılmış ya da ele geçirilmiş
 * bir kaynağın BAŞKA sahanın adına kayıt yazmasını engellemez: OT keşif
 * ürünü yalnız kendi sahasını görür, ama beyan ettiği kod sorgusuz kabul
 * edilirdi. Kapsam bu yüzden AYRI ve AÇIK bir alandır.
 *
 * İki kaynaktan okunur, bu sırayla:
 *   1. `Connector.kapsamTesisleriJson` — şema kolonu (varsa; henüz bu
 *      kuruluma göç etmemiş olabilir, o yüzden savunmacı okunur).
 *   2. `yapilandirmaJson.kapsamTesisKodlari` — kolon gelene kadar çalışan,
 *      kolon geldiğinde de geçerli kalan yapılandırma anahtarı.
 *
 * Boş dizi ile hiç tanımlı olmamak AYNI ŞEYDİR (ikisi de "sınır yok"):
 * "hiçbir santrale yazamaz" demek isteyen bir yapılandırma connector'ı
 * pasif eder, boş kapsam listesi bırakmaz.
 */
export function connectorKapsamKodlari(
  yapilandirma: Record<string, unknown>,
  kapsamJson?: string | null,
): string[] | null {
  const topla = (ham: unknown): string[] | null => {
    if (!Array.isArray(ham)) return null;
    const kodlar = [...new Set(
      ham.filter((k): k is string => typeof k === 'string').map((k) => k.trim()).filter(Boolean),
    )];
    return kodlar.length > 0 ? kodlar : null;
  };
  if (kapsamJson) {
    let ayristirilan: unknown;
    try {
      ayristirilan = JSON.parse(kapsamJson);
    } catch (e) {
      // Okunamayan kapsam SESSİZCE "sınır yok" sayılmaz — o, kapsamı silmek olurdu.
      throw new Error(`Kapsam santralleri okunamadı: ${mesaj(e)}`);
    }
    const kodlar = topla(ayristirilan);
    if (kodlar) return kodlar;
  }
  return topla(yapilandirma.kapsamTesisKodlari);
}

/**
 * Gözlem connector kapsamını aşıyor mu? Aşıyorsa REDDEDİLME SEBEBİ döner
 * (null = kapsam içinde).
 *
 * Kapsam tanımlıyken "santrali bilinmeyen" kayıt kabul EDİLMEZ: kapsamsız
 * yazılan keşif kaydı, kapsamı daraltılmış her kullanıcıya görünür
 * (bkz. keşif kuyruğu kapsam koşulu) — yani kapsam sınırından kaçmanın en
 * kolay yolu santral beyan etmemek olurdu.
 */
async function kapsamDisiSebep(
  g: Gozlem,
  kapsam: Set<string>,
  varsayilanTesisId: string | null,
  onbellek: Map<string, string | null>,
): Promise<string | null> {
  const beyan = 'tesisKodu' in g ? (g as { tesisKodu?: string | null }).tesisKodu : null;
  const kod = typeof beyan === 'string' ? beyan.trim() : '';
  if (kod) {
    const id = await tesisKodunuCoz(kod, onbellek);
    if (!id) return `kapsam dışı: beyan edilen tesis kodu tanımsız (${kod})`;
    if (!kapsam.has(id)) return `kapsam dışı: kayıt '${kod}' santralini beyan ediyor, connector kapsamında değil`;
    return null;
  }
  if (!varsayilanTesisId) {
    return 'kapsam dışı: kayıt santral beyan etmiyor ve connector varsayılan santrali yok';
  }
  return kapsam.has(varsayilanTesisId) ? null : 'kapsam dışı: connector varsayılan santrali kapsam dışında';
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
  kapsam: {
    varsayilanTesisId: string | null;
    onbellek: Map<string, string | null>;
    /* Bu koşuda GERÇEKTEN yazılan kaynak sistemler. Kaydın kaynağı
       connector'ın `kaynakSistem` alanı DEĞİL, gözlemin kendi kökenidir
       (bir connector birden çok kaynaktan besleniyor olabilir); eşleştirme
       geçişi doğru kümeyi taramak için buradan okur. */
    yazilanKaynaklar: Set<string>;
    /** Kaydın hangi eşleme profili SÜRÜMÜYLE yorumlandığı; null = gömülü
        eşleme. Eşleme değişince eski kaydın kuralı kaybolmasın diye
        kökene yazılır. */
    eslemeProfilSurumu: number | null;
  },
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
  /* Kaydın BEYAN EDİLEN santrali: önce gözlemin kendi tesis kodu, yoksa
     connector'ın bağlı olduğu santral. Eşleşmemiş kaydın kapsamı buradan
     bilinir — eşleşmeyi beklemek, kapsamı daraltılmış kullanıcıya başka
     santralin keşif kuyruğunu göstermek demekti. */
  const beyanEdilenKod = 'tesisKodu' in g ? g.tesisKodu : null;
  const tesisId = (await tesisKodunuCoz(beyanEdilenKod, kapsam.onbellek))
    ?? kapsam.varsayilanTesisId;
  const hamJson = guvenliJson(g.ham, sir);
  const normalJson = guvenliJson(gozlemGovdesi(g), sir);
  const simdi = new Date();
  const kararVerilmis = mevcut ? KARAR_VERILMIS.has(mevcut.durum) : false;

  await db.$transaction(async (tx) => {
    const kayit = await tx.kesifKaydi.upsert({
      where: { kaynak_kaynakKayitId: { kaynak, kaynakKayitId } },
      create: {
        kaynak, kaynakKayitId, connectorId: connector.id, kosuId, tesisId,
        hamJson, normalJson, durum: 'normalize', guvenSkoru: guven,
        ilkGorulme: simdi, sonGorulme: simdi,
      },
      update: {
        connectorId: connector.id, kosuId, hamJson, normalJson,
        guvenSkoru: guven, sonGorulme: simdi,
        /* Santral yalnız ÇÖZÜLEBİLDİĞİNDE yazılır, asla silinmez: kaynak
           bir kez santral bildirip sonra bildirmez olursa kaydı kapsamsız
           bırakmak onu herkese görünür yapardı. */
        ...(tesisId ? { tesisId } : {}),
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
      eslemeProfilSurumu: kapsam.eslemeProfilSurumu,
      // Kaynak ne gönderdi sorusu kanıtlanabilir kalsın: ham yükün özeti.
      kayitOzeti: createHash('sha256').update(hamJson).digest('hex'),
    }, tx);
  });

  kapsam.yazilanKaynaklar.add(kaynak);
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
  const kuru = secenek.kuru === true;
  /* Koşuyu, ürettiği dead-letter satırlarını ve denetim izini birbirine
     bağlayan kimlik. Koşu satırı henüz açılmadan üretilir: `atlandi` ile
     dönen — yani koşu satırı HİÇ AÇILMAYAN — yollar da bir kimlikle
     dönmeli, yoksa "neden koşmadı" sorusunun izlenecek bir ipi olmaz. */
  const korelasyonId = secenek.korelasyonId ?? randomUUID();

  const connector = await db.connector.findUnique({ where: { id: connectorId } });
  if (!connector) throw new Error(`Connector bulunamadı: ${connectorId}`);

  const atlandi = (sebep: string): KosuOzeti => ({
    connectorId, kosuId: null, durum: 'atlandi',
    alinan: 0, kabulEdilen: 0, reddedilen: 0, yinelenen: 0,
    denemeNo: 0, sureMs: Date.now() - t0,
    imlecOnce: connector.imlec, imlecSonra: null,
    ayrinti: sebep, hata: null,
    hataSinifi: null, korelasyonId, ardisikHata: connector.ardisikHata, devreKesildi: false,
    kuru, kuruOzet: null, eslemeProfilSurumu: null,
  });

  /* 0) Süreç ölmüş olabilir: bayat 'calisiyor' satırlarını kapat.
     KURU koşuda çağrılmaz: süpürücü koşu ve connector satırlarını
     GÜNCELLER; kuru koşunun hiçbir şeyi değiştirmeme sözü bunu kapsar. */
  if (!kuru) await bayatKosulariKapat(connectorId, secenek.bayatEsikMs);

  // 1) Silinmiş connector hiçbir kipte koşturulmaz.
  if (connector.silindi) return atlandi('Silinmiş connector koşturulmaz');
  /* Pasif connector GERÇEK koşmaz. Kuru koşu ise tam olarak bunun için
     vardır: "etkinleştirsem ne olurdu?" sorusunu etkinleştirmeden
     yanıtlar. Pasifken kuru koşuyu da engellemek aracı işlevsiz bırakırdı. */
  if (!connector.etkin && !kuru) return atlandi('Connector pasif — koşu başlatılmadı');

  /* 2) Çakışma önleme: aynı connector için ikinci GERÇEK koşu başlamaz.
     Kuru koşular bu kapıya girmez ve bu kapıyı tutmaz — hiçbir şey
     yazmadıkları için ne kilit isterler ne de gerçek bir koşuyu bloklarlar
     (bloklasalardı yarıda kalmış bir kuru koşu entegrasyonu durdururdu). */
  if (!kuru) {
    const calisan = await db.entegrasyonKosusu.findFirst({
      where: { connectorId, durum: 'calisiyor', kuruKosu: false },
      select: { id: true, baslangic: true },
    });
    if (calisan) {
      return atlandi(`Bu connector için bir koşu zaten sürüyor (${calisan.id})`);
    }
  }

  /* Eşleme profili: koşunun kullandığı SÜRÜM hem koşu satırına hem de
     her kaydın kökenine yazılır. Profil yoksa adaptörün gömülü eşlemesi
     geçerlidir ve sürüm null kalır. */
  let profil: ProfilKaydi | null = null;
  let profilHatasi: string | null = null;
  try {
    profil = await connectorProfili(connector);
  } catch (e) {
    // Bozuk profil SESSİZ GEÇMEZ: koşu gömülü eşlemeye düşer ama sebebi kayda girer.
    profilHatasi = `Eşleme profili okunamadı, gömülü eşleme kullanıldı: ${mesaj(e)}`;
  }
  const profilSurumu = profil?.surum ?? null;

  const imlecOnce = connector.imlec;
  const kosu = await db.entegrasyonKosusu.create({
    data: {
      kaynak: connector.tip, connectorId, tetikleyen,
      guvenEtiketi: 'otomatik', durum: 'calisiyor', denemeNo: 1, imlecOnce,
      kuruKosu: kuru, eslemeProfilSurumu: profilSurumu,
      korelasyonId,
    },
    select: { id: true },
  });

  /* Kuru koşu defteri: yalnız kuru kipte açılır. İçinde `db` yoktur —
     "hiçbir şey yazmaz" iddiası bir yorum değil, yapısal özelliktir. */
  const defter: KuruDefter | null = kuru
    ? kuruDefterAc({
        indeks: await varlikIndeksiYukle(),          // SALT OKUMA
        mevcutMu: async (kaynak, kaynakKayitId) => Boolean(
          kaynak && kaynakKayitId && await db.kesifKaydi.findUnique({
            where: { kaynak_kaynakKayitId: { kaynak, kaynakKayitId } },
            select: { id: true },
          })),
      })
    : null;
  if (defter) {
    defter.uyarEkle('Kuru koşu: hiçbir kayıt yazılmadı, imleç ilerlemedi, '
      + 'eşleştirme ve motor zinciri tetiklenmedi.');
    defter.uyarEkle('Eşleme aşamasındaki redler ReddedilenKayit tablosuna YAZILMADI '
      + '(kuru koşu yazmaz); sebepleri bu özette durur.');
    if (!connector.etkin) defter.uyarEkle('Connector PASİF — bu koşu yalnız kuru kipte yapılabildi.');
    if (profilHatasi) defter.uyarEkle(profilHatasi);
  }

  const sayac = { alinan: 0, kabulEdilen: 0, reddedilen: 0, yinelenen: 0 };
  /* Kaydı reddetmeyen ama söylenmesi gereken şeyler (dead-letter yazılamadı
     gibi). Sayaca girmezler; koşu özetinde görünürler — sessiz kalmazlar. */
  const ekNotlar: string[] = [];
  const redSebepleri = new Map<string, number>();

  /* ── DEAD-LETTER ────────────────────────────────────────────────────
     Reddedilen kaydın SAYISI koşu kaydında duruyordu ama KENDİSİ
     kayboluyordu. "Üç kayıt reddedildi" ile "şu üç kayıt şu sebeple
     reddedildi" arasındaki fark, eşlemeyi düzeltebilmek ile
     düzeltememek arasındaki farktır: elinde ham yük yoksa kaynağa geri
     dönüp aynı kaydı bulman gerekir, çoğu kaynakta bu imkânsızdır.

     Sertifikasyon harness'ı bu boşluğu `bozuk_reddi = bilinmiyor` diye
     raporluyordu — sayaç artmış ama dead-letter satırı yok.

     Yazımlar sayfa sonunda TOPLU yapılır: kayıt başına bir INSERT,
     SQLite'ın tek yazıcısında çekme döngüsünü yavaşlatırdı. */
  const bekleyenRedler: {
    asama: string; sebep: string; kaynakKayitId: string | null; hamJson: string;
  }[] = [];

  const redleriBosalt = async () => {
    if (bekleyenRedler.length === 0 || kuru) { bekleyenRedler.length = 0; return; }
    const yazilacak = bekleyenRedler.splice(0, bekleyenRedler.length);
    try {
      await db.reddedilenKayit.createMany({
        data: yazilacak.map((r) => ({
          kosuId: kosu.id, connectorId, kaynakSistem: connector.kaynakSistem,
          kaynakKayitId: r.kaynakKayitId, asama: r.asama,
          sebep: kirp(r.sebep, 500), hamJson: r.hamJson, durum: 'acik',
        })),
      });
    } catch (e) {
      /* Dead-letter YAZILAMADIYSA sessiz kalınmaz: sebep koşu özetine
         girer. Kaydı yutup "yazıldı" sanmak, kuyruğu boş görüp sorunun
         olmadığını sanmaya yol açardı. */
      const not = `dead-letter yazılamadı (${yazilacak.length} kayıt): ${sirsizlastir(mesaj(e), sir)}`;
      if (!ekNotlar.includes(not)) ekNotlar.push(not);
    }
  };

  const redEkle = (
    sebep: string,
    adet = 1,
    asama: RedAsamasi = 'dogrulama',
    kayit?: { ham: unknown; kaynakKayitId: string | null },
  ) => {
    const k = kirp(sebep.replace(/\s+/g, ' ').trim() || 'sebep bildirilmedi', 160);
    redSebepleri.set(k, (redSebepleri.get(k) ?? 0) + adet);
    sayac.reddedilen += adet;
    defter?.redEkle(k, asama, adet);
    /* Ham yük olmayan toplu redler (ör. "normalize sırasında düştü,
       adaptör sebep bildirmedi") dead-letter'a giremez: yazacak bir kayıt
       yoktur. Bunlar koşu özetinde kalır ve orada da görünür — sessiz
       değildir, yalnız kayıt düzeyinde izlenemez. */
    if (!kayit || kuru) return;
    let hamJson: string;
    try { hamJson = guvenliJson(kayit.ham, sir); } catch { hamJson = '"(ham yük serileştirilemedi)"'; }
    bekleyenRedler.push({ asama, sebep: k, kaynakKayitId: kayit.kaynakKayitId, hamJson });
  };
  let denemeNo = 1;
  let sir: string | null = null;

  /** Koşuyu kapatır — her çıkış yolu buradan geçer, `calisiyor` kalmaz. */
  const kapat = async (
    durum: Exclude<KosuDurumu, 'atlandi'>,
    o: {
      hata?: string | null; imlecSonra?: string | null; ayrinti: string;
      /** hata sınıfı biliniyorsa verilir; verilmezse metinden çıkarılır */
      sinif?: HataSinifi; sebepNesnesi?: unknown;
    },
  ): Promise<KosuOzeti> => {
    /* Her çıkış yolu buradan geçer: yarım kalmış sayfanın redleri de
       yazılır. Yazılmasaydı, hatayla kesilen bir koşunun reddettiği
       kayıtlar — yani asıl merak edilenler — kaybolurdu. */
    await redleriBosalt();

    const sureMs = Date.now() - t0;
    const hataMetni = o.hata ? kirp(sirsizlastir(o.hata, sir)) : null;
    /* Sınıf, hata METNİNDEN değil önce ÇAĞIRANIN bildirdiğinden çıkarılır:
       çağıran neyin patladığını bilir, metin sezgisi ise tahmindir.
       Başarılı ve kimlik bekleyen koşuda sınıf YOKTUR (null) — 'yok' ile
       'bilinmeyen' ayrı şeylerdir. */
    const sinifi: HataSinifi | null = durum === 'basarisiz'
      ? hataSinifiCikar(o.sebepNesnesi ?? o.hata, o.sinif)
      : null;
    /* KURU KOŞUDA İMLEÇ İLERLEMEZ. Koşu satırına bile yazılmaz: kuru
       koşunun `imlecSonra` alanı dolu olsaydı, bir sonraki okuyan onu
       "buraya kadar çekildi" sanardı — oysa hiçbir kayıt yazılmadı. */
    const imlecSonra = kuru ? null : (o.imlecSonra ?? null);
    let kuruOzet: KuruOzet | null = null;
    if (defter) {
      const tutarsizlik = sayacTutarsizligi(defter.sayaclar());
      if (tutarsizlik) defter.uyarEkle(`Sayaç sözleşmesi tutmuyor: ${tutarsizlik}`);
      kuruOzet = defter.ozet(profil ? { kod: profil.kod, surum: profil.surum } : null);
    }
    await db.entegrasyonKosusu.update({
      where: { id: kosu.id },
      data: {
        durum, bitis: new Date(), sureMs, denemeNo,
        alinan: sayac.alinan, kabulEdilen: sayac.kabulEdilen,
        reddedilen: sayac.reddedilen, yinelenen: sayac.yinelenen,
        kayitSayisi: sayac.kabulEdilen,
        imlecSonra,
        hata: hataMetni,
        hataSinifi: sinifi,
        hataOzeti: sinifi ? kirp(`${sinifi}: ${hataMetni ?? ''}`, 300) : null,
        /* `ayrinti` YALNIZ kuru koşuda yazılır. Gerçek koşuda bu alan ret
           sebeplerinin yeridir (sağlık ekranı oradan okur); sayım cümlesini
           oraya yazmak ret sebebini görünmez yapardı. */
        ...(kuru ? { ayrinti: kirp(o.ayrinti) } : {}),
        kuruOzetJson: kuruOzet ? sirsizlastir(kuruOzetJson(kuruOzet), sir) : null,
      },
    });

    /* Connector durumu her koşu sonunda tazelenir.
       kimlik_bekleniyor HATA DEĞİL: connector 'hatali' işaretlenmez,
       'taslak' (henüz işler değil) olur ve sonHata boş bırakılır.

       KURU KOŞU CONNECTOR SATIRINA DOKUNMAZ. Dokunsaydı `sonBasariliKosu`
       tazelenir ve sağlık ekranı "veri geldi" derdi; oysa kuru koşudan
       sonra entegrasyon hâlâ HİÇ VERİ GETİRMEMİŞTİR. */
    let ardisikHata = connector.ardisikHata;
    let devreKesildi = false;

    if (kuru) {
      // bilinçli boşluk: connector kaydı kuru koşuda değişmez
    } else if (durum === 'basarili') {
      /* Başarı sayacı SIFIRLAR. Araya giren tek başarılı koşu, sayacın
         sıfırlanmasını hak eder: aksi hâlde aylar içinde biriken tekil
         kesintiler bir gün sessizce devreyi keserdi. */
      ardisikHata = 0;
      await db.connector.update({
        where: { id: connectorId },
        data: {
          durum: 'etkin', sonHata: null, sonHataOzeti: null,
          sonBasariliKosu: new Date(), ardisikHata: 0,
          // İmleç YALNIZ başarılı koşuda ve adaptör yeni imleç verdiyse ilerler.
          ...(o.imlecSonra != null ? { imlec: o.imlecSonra } : {}),
        },
      });
    } else if (durum === 'kimlik_bekleniyor') {
      /* Bekleyen kurulum bir HATA DEĞİLDİR: sayaç ARTMAZ. Artsaydı, hiç
         kurulmamış bir connector poll aralığı kadar sonra kendini
         "hatali" işaretler ve kurulum işi bir arıza gibi görünürdü. */
      await db.connector.update({
        where: { id: connectorId },
        data: { durum: 'taslak', sonHata: null, sonHataOzeti: null },
      });
    } else {
      ardisikHata = connector.ardisikHata + 1;
      const sinir = connector.ardisikHataSiniri ?? VARSAYILAN_ARDISIK_HATA_SINIRI;
      devreKesildi = sinir > 0 && ardisikHata >= sinir;
      const ozet = `${sinifi ?? 'bilinmeyen'} · ${denemeNo}. deneme · ${hataMetni ?? 'sebep yok'}`;
      await db.connector.update({
        where: { id: connectorId },
        data: {
          /* Tek başarısızlık connector'ı DURDURMAZ. Eskiden durduruyordu ve
             zamanlayıcı `hatali` olanı bir daha koşturmadığı için tek bir ağ
             kesintisi entegrasyonu kalıcı olarak sonlandırıyordu. */
          ...(devreKesildi ? { durum: 'hatali' } : {}),
          sonHata: hataMetni,
          sonHataOzeti: kirp(ozet, 300),
          ardisikHata,
        },
      });
    }

    return {
      connectorId, kosuId: kosu.id, durum,
      alinan: sayac.alinan, kabulEdilen: sayac.kabulEdilen,
      reddedilen: sayac.reddedilen, yinelenen: sayac.yinelenen,
      denemeNo, sureMs, imlecOnce, imlecSonra,
      ayrinti: o.ayrinti, hata: hataMetni,
      kuru, kuruOzet, eslemeProfilSurumu: profilSurumu,
      hataSinifi: sinifi, korelasyonId, ardisikHata, devreKesildi,
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

  /* Connector bir santrale bağlıysa (OT keşfi gibi) gelen her kayıt o
     santralindir. Kod tanımlı bir santrale çözülemiyorsa koşu BAŞLAMAZ:
     yanlış santralin adına veri toplamak, kapsam denetimini sessizce
     delmek olurdu. */
  const tesisOnbellegi = new Map<string, string | null>();
  const yazilanKaynaklar = new Set<string>();
  let varsayilanTesisId: string | null = null;
  const yapilandirmaTesisKodu = typeof yapilandirma.tesisKodu === 'string'
    ? yapilandirma.tesisKodu : null;
  if (yapilandirmaTesisKodu) {
    varsayilanTesisId = await tesisKodunuCoz(yapilandirmaTesisKodu, tesisOnbellegi);
    if (!varsayilanTesisId) {
      return kapat('basarisiz', {
        hata: `Yapılandırmadaki tesis kodu tanımlı değil: ${yapilandirmaTesisKodu}`,
        ayrinti: 'Santral çözülemedi',
      });
    }
  }

  /* Connector kapsamı: yapılandırılmışsa AŞILAMAZ. Çözülemeyen bir kapsam
     kodu koşuyu BAŞLATMAZ — kapsamı yarım uygulamak, uygulamamaktan daha
     kötüdür (uygulandığı sanılır). */
  let kapsamTesisIdleri: Set<string> | null = null;
  try {
    const kapsamKodlari = connectorKapsamKodlari(
      yapilandirma,
      (connector as { kapsamTesisleriJson?: string | null }).kapsamTesisleriJson,
    );
    if (kapsamKodlari) {
      const idler: string[] = [];
      for (const kod of kapsamKodlari) {
        const id = await tesisKodunuCoz(kod, tesisOnbellegi);
        if (!id) {
          return kapat('basarisiz', {
            hata: `Kapsam santral kodu tanımlı değil: ${kod}`,
            ayrinti: 'Kapsam çözülemedi',
          });
        }
        idler.push(id);
      }
      kapsamTesisIdleri = new Set(idler);
      if (varsayilanTesisId && !kapsamTesisIdleri.has(varsayilanTesisId)) {
        return kapat('basarisiz', {
          hata: `Yapılandırmadaki varsayılan tesis kodu (${yapilandirmaTesisKodu}) `
            + 'connector kapsamının dışında — çelişkili yapılandırma',
          ayrinti: 'Kapsam çelişkisi',
        });
      }
      /* Tek santralli kapsamda varsayılan da odur: aksi hâlde santral
         beyan etmeyen her kayıt kapsam dışı sayılıp reddedilirdi ve
         kapsam eklemek connector'ı sessizce çalışmaz hâle getirirdi. */
      if (!varsayilanTesisId && kapsamTesisIdleri.size === 1) {
        varsayilanTesisId = [...kapsamTesisIdleri][0];
      }
    }
  } catch (e) {
    return kapat('basarisiz', { hata: mesaj(e), ayrinti: 'Kapsam okunamadı' });
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
      const alinanSayfa = Math.max(cekilen.length, gozlemler.length);
      sayac.alinan += alinanSayfa;
      defter?.alinanEkle(alinanSayfa);

      const dogrulama = adaptor.validate(gozlemler);
      const gecerli = dogrulama?.gecerli ?? [];
      defter?.gecerliEkle(gecerli.length);
      for (const r of dogrulama?.reddedilen ?? []) {
        const kimlik = (r.gozlem as { koken?: { kaynakKayitId?: unknown } } | null)
          ?.koken?.kaynakKayitId;
        redEkle(r.sebep, 1, 'dogrulama', {
          ham: r.gozlem, kaynakKayitId: typeof kimlik === 'string' ? kimlik : null,
        });
      }
      const kayip = gozlemler.length - gecerli.length - (dogrulama?.reddedilen?.length ?? 0);
      if (kayip > 0) redEkle('doğrulamada kayboldu (adaptör ne kabul ne ret bildirdi)', kayip);

      for (const ham of gecerli) {
        /* Eşleme profili varsa doğruluk kaynağı ODUR: kurallar ham yükten
           okur ve normalize alanları ezer. Profil yoksa adaptörün gömülü
           eşlemesi geçerlidir ve bu blok hiç çalışmaz. */
        let g = ham;
        if (profil) {
          const { gozlem, uygulama } = gozlemeUygula(profil.kurallar, ham);
          g = gozlem;
          if (uygulama.sorunlar.length > 0 && !kuru) {
            /* Tanınmayan enum / dönüşemeyen değer SESSİZ DÜŞMEZ: kaydı
               düşürmese bile `ReddedilenKayit`e yazılır ki birileri
               eşlemeyi düzeltebilsin. Kuru koşu YAZMAZ — sebepler kuru
               özete girer (defter.redEkle aşağıda). */
            try {
              await eslemeRedleriniYaz(uygulama.sorunlar, {
                kosuId: kosu.id, connectorId,
                kaynakSistem: g.koken?.kaynakSistem ?? connector.kaynakSistem,
                kaynakKayitId: g.koken?.kaynakKayitId ?? null,
                hamJson: guvenliJson(ham.ham, sir),
              });
            } catch (e) {
              // Dead-letter yazılamadıysa bile sebep koşu kaydında kalmalı.
              const not = `eşleme redleri yazılamadı: ${sirsizlastir(mesaj(e), sir)}`;
              if (!ekNotlar.includes(not)) ekNotlar.push(not);
            }
          }
          if (uygulama.reddedildi) {
            const sebepler = uygulama.sorunlar.filter((x) => x.etki === 'kayit').map((x) => x.sebep);
            redEkle(`eşleme: ${sebepler.join(' · ') || 'kural karşılanmadı'}`, 1, 'esleme', {
              ham: ham.ham ?? ham, kaynakKayitId: ham.koken?.kaynakKayitId ?? null,
            });
            continue;
          }
          if (kuru) {
            for (const sorun of uygulama.sorunlar) {
              // Kaydı düşürmeyen eşleme sorunu da kuru raporda görünür (sayaca girmez).
              defter?.uyarEkle(`eşleme uyarısı: ${sorun.sebep}`);
            }
          }
        }

        /* Kapsam denetimi YAZMADAN ÖNCE: kapsam dışı kayıt bir sistem
           arızası değil, REDDEDİLEN bir kayıttır — sayacı `reddedilen`e
           girer, koşuyu başarısız yapmaz, ama sebebi koşu kaydında durur. */
        if (kapsamTesisIdleri) {
          const sebep = await kapsamDisiSebep(g, kapsamTesisIdleri, varsayilanTesisId, tesisOnbellegi);
          if (sebep) {
            redEkle(sebep, 1, 'kapsam', {
              ham: g.ham ?? g, kaynakKayitId: g.koken?.kaynakKayitId ?? null,
            });
            continue;
          }
        }

        /* KURU KOŞU: yazmak yerine ne olacağını hesapla. `gozlemYaz`
           çağrılmaz — bu satır kuru koşunun CMDB'ye dokunmadığının
           tek ve tam gerekçesidir. */
        if (defter) {
          const etki = await defter.yaz(g);
          sayac.kabulEdilen++;
          if (etki.etki === 'guncellenecek') sayac.yinelenen++;
          continue;
        }

        try {
          const sonuclanan = await gozlemYaz(g, connector, kosu.id, sir, {
            varsayilanTesisId, onbellek: tesisOnbellegi, yazilanKaynaklar,
            eslemeProfilSurumu: profilSurumu,
          });
          sayac.kabulEdilen++;
          if (sonuclanan === 'yinelenen') sayac.yinelenen++;
        } catch (e) {
          /* Yazılamayan kayıt yutulmaz: sebebi koşu kaydına girer ve koşu
             başarısız kapanır — imleç ilerlemezse kayıt kaybolmaz. */
          yazmaHatasi++;
          redEkle(`yazılamadı: ${sirsizlastir(mesaj(e), sir)}`, 1, 'yazma', {
            ham: g.ham ?? g, kaynakKayitId: g.koken?.kaynakKayitId ?? null,
          });
        }
      }

      /* Sayfa bitti: bu sayfanın dead-letter satırları yazılır. Koşunun
         sonuna bırakmak, çok sayfalı bir çekimde onca ham yükü bellekte
         tutmak demek olurdu. */
      await redleriBosalt();

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

  const ozet = [redOzeti(redSebepleri, sayac.reddedilen), ...ekNotlar]
    .filter(Boolean).join(' · ') || null;
  const sayim = `${sayac.alinan} alındı · ${sayac.kabulEdilen} kabul · ` +
    `${sayac.reddedilen} reddedildi · ${sayac.yinelenen} yinelenen`;

  if (yazmaHatasi > 0) {
    return kapat('basarisiz', {
      hata: [`${yazmaHatasi} kayıt yazılamadı`, ozet].filter(Boolean).join(' · '),
      imlecSonra: null,
      ayrinti: `Kısmî yazma hatası · ${sayim}`,
    });
  }
  /* KURU KOŞU MOTOR ZİNCİRİNİ TETİKLEMEZ. `eslestirmeyiKos` kendi iş
     koşusunu açar ve keşif kayıtlarını eşleştirip günceller — kuru koşuda
     çağrılması "hiçbir şey değişmez" sözünü tek başına bozardı. */
  if (kuru && defter) {
    return kapat('basarili', {
      hata: ozet,
      imlecSonra: null,
      ayrinti: [kuruCumle(defter.sayaclar()), ...ekNotlar].join(' · '),
    });
  }

  const eslestirmeNotu = yazilanKaynaklar.size > 0
    ? await eslestirmeyiKos([...yazilanKaynaklar]) : null;
  return kapat('basarili', {
    hata: ozet,
    imlecSonra: imlec,
    ayrinti: eslestirmeNotu ? `${sayim} · ${eslestirmeNotu}` : sayim,
  });
}

/**
 * Başarılı senkronizasyondan sonra eşleştirme geçişini koşturur.
 *
 * Neden burada: çekirdek kayıtları `normalize` durumunda bırakıyordu ve
 * onları CMDB adaylarıyla eşleştiren geçiş YALNIZ "Eşleştir" düğmesinden
 * çağrılıyordu. Yani connector saatte bir koşsa da kimse düğmeye basmazsa
 * kuyruk hiç ilerlemiyordu. "detect → correlate" zincirinin correlate
 * halkası kopuktu.
 *
 * Eşleştirme CMDB'ye YAZMAZ; yalnız aday ve güven skoru üretir. Karar
 * (onayla/reddet/yeni varlık) hâlâ insanındır.
 *
 * `isKos` üzerinden geçer: kendi koşu satırını bırakır, çakışma koruması
 * ve ölü koşu kirası bedava gelir. Eşleştirme HATASI senkronizasyonu
 * başarısız saymaz — kayıtlar yazıldı, imleç ilerlemeli; ama hata
 * SESSİZ DE GEÇMEZ: koşu satırına yazılır ve özet cümlesinde görünür.
 */
export async function eslestirmeyiKos(kaynaklar: string[]): Promise<string> {
  const toplam = { bakilan: 0, eslesen: 0, incelemeBekleyen: 0, cakisan: 0 };
  const sonuc = await isKos('kesif_eslestirme', async () => {
    for (const kaynak of kaynaklar) {
      const o = await bekleyenleriEslestir({ kaynak });
      toplam.bakilan += o.bakilan;
      toplam.eslesen += o.eslesen;
      toplam.incelemeBekleyen += o.incelemeBekleyen;
      toplam.cakisan += o.cakisan;
    }
    return { islenen: toplam.bakilan, uretilen: toplam.eslesen + toplam.incelemeBekleyen };
  });

  if (sonuc.ok) {
    return `eşleştirme: ${toplam.eslesen} eşleşti · ${toplam.incelemeBekleyen} inceleme`
      + (toplam.cakisan > 0 ? ` · ${toplam.cakisan} çakışan` : '');
  }
  if (sonuc.sebep === 'zaten_calisiyor') {
    return 'eşleştirme atlandı (başka bir koşuda çalışıyor)';
  }
  return `eşleştirme BAŞARISIZ: ${sonuc.hata}`;
}

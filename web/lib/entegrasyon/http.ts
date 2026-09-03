import 'server-only';

/* ═══════════════════════════════════════════════════════════════════════
   OT-40 · Dış sistem HTTP istemcisi

   Bu dosya HİÇBİR ADRESE BAĞLANMAZ ve hiçbir uç nokta İÇERMEZ. Taban URL
   her zaman connector yapılandırmasından gelir; burada varsayılan host,
   varsayılan yol ya da örnek kurum adresi YOKTUR ve olmayacaktır.

   Adaptörler bugün `BaglanmamisAdaptor`dur ve gerçek bir sisteme
   bağlanmaz. Bu istemci o gün geldiğinde kullanılacak KATMANDIR; şimdi
   yazılmasının sebebi, bağlantı gününde zaman aşımı/yeniden yönlendirme/
   boyut sınırı gibi kararların acele verilmemesidir.

   ── Neden `fetch` doğrudan kullanılmıyor ──────────────────────────────
   Çıplak `fetch` üç sessiz kusur taşır ve üçü de OT ağında pahalıdır:

   1. ZAMAN AŞIMI YOK. Yanıt vermeyen bir uç nokta koşuyu `calisiyor`
      durumunda sonsuza kadar asar; bayat koşu temizliği 15 dakika sonra
      devreye girer ve o süre boyunca connector kilitlidir.
   2. YENİDEN YÖNLENDİRME SESSİZCE İZLENİR. `Authorization` başlığı
      taşıyan bir istek başka bir origin'e yönlendirilirse kimlik bilgisi
      O ORIGIN'E GÖNDERİLİR. Bu bir sır sızıntısıdır ve fark edilmez.
   3. YANIT BOYUTU SINIRSIZ. Yanlış filtreyle açılan bir uç nokta
      milyonlarca satır döndürür ve süreç belleği tükenir.

   Üçü de burada kapalıdır ve kapalılığı test edilir.

   ── SSRF ─────────────────────────────────────────────────────────────
   Connector yapılandırması ekrandan/API'den gelir; yani taban URL bir
   KULLANICI GİRDİSİDİR. Bulut metadata adresleri (169.254.169.254 ve
   eşdeğerleri) her koşulda reddedilir — oraya yapılan tek bir istek
   sürecin kendi kimlik bilgisini dışarı taşır. */

import { z } from 'zod';
import type { HataSinifi } from './cekirdek';

/** Varsayılan zaman aşımı; yapılandırma daha kısasını isteyebilir. */
export const VARSAYILAN_ZAMAN_ASIMI_MS = 30_000;
/** Bir yanıtın okunacağı en büyük boyut (8 MiB). */
export const VARSAYILAN_GOVDE_SINIRI = 8 * 1024 * 1024;
/** `Retry-After` bu süreden uzunsa beklenmez; koşu başarısız sayılır. */
export const EN_UZUN_RETRY_AFTER_MS = 120_000;

/* ── Adres politikası ────────────────────────────────────────────────── */

/** Bulut sağlayıcı metadata uçları — HER KOŞULDA yasak. */
const METADATA_ADRESLERI = new Set([
  '169.254.169.254',      // AWS · Azure · GCP · OpenStack
  'metadata.google.internal',
  'metadata.goog',
  '[fd00:ec2::254]',      // AWS IMDSv2 IPv6
  'fd00:ec2::254',
]);

/** Yerel/özel ağ mı? `guvensizHttpKabul` yalnız bunlarda anlamlıdır. */
export function ozelAgMi(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '::1') return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  /* IPv6 benzersiz yerel adres (fc00::/7) ve bağlantı yerel (fe80::/10). */
  if (/^f[cd][0-9a-f]{2}:/.test(h)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(h)) return true;
  return false;
}

export type AdresKarari =
  | { ok: true; url: URL }
  | { ok: false; hata: string; sinif: HataSinifi };

/**
 * Taban URL + yolu birleştirir ve politikayı uygular.
 *
 * `guvensizHttpKabul` yalnız ÖZEL AĞ adreslerinde geçerlidir: kurum içi
 * bir OT segmentinde TLS sonlandırması olmayan eski bir yönetim arayüzü
 * gerçek bir durumdur, ama aynı bayrağın internete açık bir adrese
 * uygulanmasına izin vermek kimlik bilgisini düz metin taşımak olurdu.
 */
export function adresKur(
  tabanUrl: string,
  yol: string,
  o: { guvensizHttpKabul?: boolean } = {},
): AdresKarari {
  let url: URL;
  try {
    url = new URL(yol, tabanUrl.endsWith('/') ? tabanUrl : `${tabanUrl}/`);
  } catch {
    return { ok: false, sinif: 'yapilandirma', hata: `Geçersiz adres: ${tabanUrl} + ${yol}` };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return {
      ok: false, sinif: 'yapilandirma',
      hata: `Yalnız http/https desteklenir; verilen: ${url.protocol}`,
    };
  }
  if (METADATA_ADRESLERI.has(url.hostname.toLowerCase())) {
    return {
      ok: false, sinif: 'yapilandirma',
      hata: 'Bulut metadata adresine istek yapılamaz — sürecin kendi kimlik bilgisini dışarı taşır.',
    };
  }
  if (url.protocol === 'http:') {
    if (!o.guvensizHttpKabul) {
      return {
        ok: false, sinif: 'yapilandirma',
        hata: 'Düz http reddedildi; TLS zorunludur. Kurum içi TLS\'siz bir uç için '
          + 'yapılandırmada `guvensizHttpKabul` açıkça verilmelidir.',
      };
    }
    if (!ozelAgMi(url.hostname)) {
      return {
        ok: false, sinif: 'yapilandirma',
        hata: `guvensizHttpKabul yalnız özel ağ adreslerinde geçerlidir; ${url.hostname} özel ağ değil.`,
      };
    }
  }
  return { ok: true, url };
}

/* ── İstek ───────────────────────────────────────────────────────────── */

export const HTTP_YAPILANDIRMASI = {
  /** Kurumun kendi uç noktası; ürünle GELMEZ, kurulumda girilir. */
  tabanUrl: z.string().url('Taban URL geçerli bir adres olmalı'),
  zamanAsimiMs: z.number().int().min(1_000).max(300_000).optional(),
  govdeSiniriBayt: z.number().int().min(1_024).optional(),
  /** Yalnız özel ağ adreslerinde geçerli; internete açık adreste reddedilir. */
  guvensizHttpKabul: z.boolean().optional(),
} as const;

export type Istek = {
  tabanUrl: string;
  yol: string;
  yontem?: 'GET' | 'POST';
  basliklar?: Record<string, string>;
  govde?: string;
  zamanAsimiMs?: number;
  govdeSiniriBayt?: number;
  guvensizHttpKabul?: boolean;
  /** Testler gerçek ağa çıkmasın diye enjekte edilebilir. */
  getir?: typeof fetch;
};

export type Yanit = {
  durum: number;
  basliklar: Record<string, string>;
  govde: string;
  /** Gövde sınıra takıldı mı — takıldıysa `govde` EKSİKTİR ve öyle söylenir. */
  kirpildi: boolean;
  url: string;
};

export class HttpHatasi extends Error {
  readonly sinif: HataSinifi;
  readonly status: number | null;
  readonly gecici: boolean;
  /** Sunucunun istediği bekleme (ms); yoksa null. */
  readonly retryAfterMs: number | null;

  constructor(mesaj: string, o: {
    sinif: HataSinifi; status?: number | null; gecici?: boolean; retryAfterMs?: number | null;
  }) {
    super(mesaj);
    this.name = 'HttpHatasi';
    this.sinif = o.sinif;
    this.status = o.status ?? null;
    this.gecici = o.gecici ?? false;
    this.retryAfterMs = o.retryAfterMs ?? null;
  }
}

/**
 * Durum kodunu hata sınıfına çevirir.
 *
 * 429 GEÇİCİDİR ama `yetki` değildir: hız sınırı kimlik sorunu değil,
 * beklenecek bir durumdur. 401/403 ise geçici SAYILMAZ — tekrar denemek
 * çoğu dizinde servis hesabını kilitletir (bkz. cekirdek.ts devre kesici).
 */
export function durumSinifi(durum: number): { sinif: HataSinifi; gecici: boolean } {
  if (durum === 401 || durum === 403) return { sinif: 'yetki', gecici: false };
  if (durum === 408 || durum === 429) return { sinif: 'gecici', gecici: true };
  if (durum >= 500) return { sinif: 'gecici', gecici: true };
  if (durum === 404) return { sinif: 'yapilandirma', gecici: false };
  if (durum >= 400) return { sinif: 'yapilandirma', gecici: false };
  return { sinif: 'bilinmeyen', gecici: false };
}

/** `Retry-After` başlığını ms'ye çevirir. Saniye ve HTTP-date biçimi. */
export function retryAfterMs(ham: string | null, simdi = Date.now()): number | null {
  if (!ham) return null;
  const s = ham.trim();
  if (/^\d+$/.test(s)) {
    const ms = Number(s) * 1_000;
    return ms >= 0 && ms <= EN_UZUN_RETRY_AFTER_MS ? ms : null;
  }
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  const fark = t - simdi;
  return fark > 0 && fark <= EN_UZUN_RETRY_AFTER_MS ? fark : null;
}

/** Başlıklardan kimlik taşıyanları maskeler — hata metnine giren tek biçim. */
export function basliklariMaskele(b: Record<string, string>): Record<string, string> {
  const gizli = /^(authorization|proxy-authorization|cookie|x-api-key|api-key|x-auth-token)$/i;
  return Object.fromEntries(
    Object.entries(b).map(([k, v]) => [k, gizli.test(k) ? '***' : v]),
  );
}

/**
 * Tek HTTP isteği — zaman aşımlı, boyut sınırlı, yönlendirme İZLEMEZ.
 *
 * Yönlendirme `manual`: 3xx bir hatadır ve `Location` başlığıyla birlikte
 * bildirilir. Otomatik izlemek, `Authorization` başlığını hedefteki
 * origin'e taşırdı ve bu bir sır sızıntısıdır. Kurulum yönlendirmeyi
 * görürse taban URL'i düzeltir — doğru çözüm budur.
 */
export async function istek(i: Istek): Promise<Yanit> {
  const adres = adresKur(i.tabanUrl, i.yol, { guvensizHttpKabul: i.guvensizHttpKabul });
  if (!adres.ok) throw new HttpHatasi(adres.hata, { sinif: adres.sinif });

  const zamanAsimi = i.zamanAsimiMs ?? VARSAYILAN_ZAMAN_ASIMI_MS;
  const sinir = i.govdeSiniriBayt ?? VARSAYILAN_GOVDE_SINIRI;
  const getir = i.getir ?? fetch;

  let yanit: Response;
  try {
    yanit = await getir(adres.url, {
      method: i.yontem ?? 'GET',
      headers: i.basliklar,
      body: i.govde,
      redirect: 'manual',
      signal: AbortSignal.timeout(zamanAsimi),
    });
  } catch (e) {
    const ad = (e as Error | null)?.name ?? '';
    if (ad === 'TimeoutError' || ad === 'AbortError') {
      throw new HttpHatasi(
        `${adres.url.origin} ${zamanAsimi} ms içinde yanıt vermedi`,
        { sinif: 'gecici', gecici: true },
      );
    }
    /* Ağ hatası geçicidir; DNS çözülemeyen bir host ise YAPILANDIRMA
       hatasıdır ve tekrar denemek anlamsızdır. */
    const kod = (e as { code?: string } | null)?.code ?? '';
    const yapilandirma = kod === 'ENOTFOUND' || kod === 'ERR_INVALID_URL';
    throw new HttpHatasi(
      `${adres.url.origin} bağlantı hatası: ${(e as Error)?.message ?? 'bilinmeyen'}`,
      { sinif: yapilandirma ? 'yapilandirma' : 'gecici', gecici: !yapilandirma },
    );
  }

  const basliklar: Record<string, string> = {};
  yanit.headers.forEach((v, k) => { basliklar[k] = v; });

  if (yanit.status >= 300 && yanit.status < 400) {
    throw new HttpHatasi(
      `Yeniden yönlendirme izlenmedi (${yanit.status} → ${basliklar.location ?? 'hedef yok'}). `
      + 'Kimlik başlığının başka bir origin\'e taşınmaması için taban URL düzeltilmelidir.',
      { sinif: 'yapilandirma', status: yanit.status },
    );
  }

  const { govde, kirpildi } = await govdeyiOku(yanit, sinir);

  if (!yanit.ok) {
    const { sinif, gecici } = durumSinifi(yanit.status);
    throw new HttpHatasi(
      `${adres.url.origin} ${yanit.status} döndürdü: ${govde.slice(0, 300) || '(gövde yok)'}`,
      { sinif, status: yanit.status, gecici, retryAfterMs: retryAfterMs(basliklar['retry-after'] ?? null) },
    );
  }

  return { durum: yanit.status, basliklar, govde, kirpildi, url: adres.url.toString() };
}

/**
 * Gövdeyi sınıra kadar okur.
 *
 * Sınıra takılan gövde SESSİZCE kesilmez: `kirpildi: true` döner ve
 * çağıran onu ayrıştırmaya kalkarsa kendi hatasını alır. Kırpılmış JSON'u
 * "boş sonuç" saymak, kaynakta 900 bin kayıt varken "değişiklik yok"
 * demek olurdu.
 */
async function govdeyiOku(yanit: Response, sinir: number): Promise<{ govde: string; kirpildi: boolean }> {
  const govdeAkisi = yanit.body;
  if (!govdeAkisi) return { govde: '', kirpildi: false };

  const okuyucu = govdeAkisi.getReader();
  const cozucu = new TextDecoder();
  let toplam = 0;
  let metin = '';
  let kirpildi = false;
  try {
    for (;;) {
      const { done, value } = await okuyucu.read();
      if (done) break;
      toplam += value.byteLength;
      if (toplam > sinir) {
        kirpildi = true;
        await okuyucu.cancel();
        break;
      }
      metin += cozucu.decode(value, { stream: true });
    }
    if (!kirpildi) metin += cozucu.decode();
  } finally {
    okuyucu.releaseLock();
  }
  return { govde: metin, kirpildi };
}

/**
 * JSON yanıtı — kırpılmış gövde AYRIŞTIRILMAZ.
 *
 * Kırpılmış bir JSON çoğu zaman ayrıştırma hatası verir ama bazen
 * (dizinin ortasında kesilirse) vermez ve EKSİK veri sessizce geçer.
 * Bu yüzden kırpılma ayrı bir hata olarak fırlatılır.
 */
export async function jsonIstek<T = unknown>(i: Istek): Promise<{ veri: T; yanit: Yanit }> {
  const yanit = await istek(i);
  if (yanit.kirpildi) {
    throw new HttpHatasi(
      `Yanıt gövdesi ${i.govdeSiniriBayt ?? VARSAYILAN_GOVDE_SINIRI} bayt sınırını aştı; `
      + 'eksik gövde ayrıştırılmadı. Sorguyu daraltın ya da sayfalama kullanın.',
      { sinif: 'yapilandirma', status: yanit.durum },
    );
  }
  try {
    return { veri: JSON.parse(yanit.govde) as T, yanit };
  } catch {
    throw new HttpHatasi(
      `${yanit.url} JSON döndürmedi (içerik tipi: ${yanit.basliklar['content-type'] ?? 'bildirilmedi'})`,
      { sinif: 'yapilandirma', status: yanit.durum },
    );
  }
}

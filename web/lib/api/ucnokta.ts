import 'server-only';
import { z } from 'zod';
import { db } from '../db';
import { DEMO } from '../demo';
import type { AktifKullanici } from '../auth';
import type { Modul } from '../erisim';
import {
  ApiHata, apiHatasinaCevir, durumKodu, hataGovdesi, zodAyrintilari,
} from './hatalar';
import { adresBilinmiyor, adresEtiketi, istekAdresi } from '../istemciAdresi';
import { apiTokenOzeti, bearerToken, istekKimligi, type ApiKimlik } from './kimlik';
import { oranSinirla } from './oranSinir';
import { ucaErisim, type UcKimligi } from './kapsam';
import { modulYazmaZorunlu, okumaKapsami } from './yetki';

/* API uç noktası sarmalayıcısı. Her uç bu çemberden geçer:

     demo kilidi → oran sınırı → kimlik → ANAHTAR KAPSAMI → modül izni →
     gövde → idempotency rezervasyonu → işleyici → denetim satırı

   Değişmezler:
   · HER istek bir ApiIstegi satırı bırakır (kimliksiz istekler dahil).
   · Aynı (anahtar, Idempotency-Key) ikinci kez işi TEKRAR ETMEZ; ilk yanıt döner.
   · Yığın izi/iç mesaj gövdeye girmez; yalnız ApiIstegi.yanitOzeti'ne yazılır.
   · Demo yayını salt okunurdur — yazma uçları 403 döner, hiçbir şey yazmaz.
   · UY-52: anahtar kapsamı ROLDEN ÖNCE bakılır ve rolü yalnız daraltır. */

export type Baglam = {
  istek: Request;
  url: URL;
  kimlik: ApiKimlik;
  kullanici: AktifKullanici;
  /** okuma uçları için izinli tesis kümesi; null = tümü */
  kapsam: string[] | null;
  /** yazma uçlarında ayrıştırılmış JSON gövde */
  govde: unknown;
  idempotencyAnahtari: string | null;
};

export type UcYaniti = { durum?: number; govde: unknown; basliklar?: Record<string, string> };

export type UcSecenegi = {
  /** UY-52 · Ucun kendi kimliği. Anahtar kapsamı bununla eşleşir. */
  uc: UcKimligi;
  modul: Modul;
  islem: 'okuma' | 'yazma';
};

/* Kimliksiz (jetonsuz) isteklerin oran kovası — adres başına.

   Eskiden jetonsuz HER istek tek bir `'anonim'` kovasındaydı: bir çağıran
   dakikada 120 istekle tüm kimliksiz trafiği 429'a düşürebiliyordu. Kovayı
   adrese bölmek bunu çözer, AMA adres güvenilir biçimde çözülemiyorsa
   (varsayılan: TRUST_PROXY tanımsız) kovayı yine de başlıktan seçmek daha
   kötüsünü yapardı — saldırgan her istekte başka `X-Forwarded-For` gönderip
   sınırdan tamamen kaçardı. Bu yüzden:

     · adres çözüldüyse  → `anonim:<ip>`, normal API eşiği,
     · çözülemediyse     → TEK paylaşılan `anonim:bilinmiyor` kovası, AYRI ve
                           geniş eşik (`API_BILINMEYEN_SINIRI`).

   Jeton taşıyan çağıranlar kendi kovalarındadır; paylaşılan kovanın dolması
   entegrasyonları etkilemez. Tam gerekçe: `lib/istemciAdresi.ts`
   `ADRES_BILINMIYOR`. */
const sayiOku = (ham: string | undefined, varsayilan: number): number => {
  const n = Number(ham);
  return Number.isFinite(n) && n > 0 ? n : varsayilan;
};
const ANONIM_BILINMEYEN_SINIRI = sayiOku(process.env.API_BILINMEYEN_SINIRI, 2000);

const AZAMI_GOVDE_BAYT = 4 * 1024 * 1024;
/** Bu boyutu aşan yanıt idempotency defterine sığmaz; tekrar oynatılamaz. */
const AZAMI_YANIT_OZETI = 32_000;

const p2002 = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002';

async function govdeOku(istek: Request): Promise<unknown> {
  const uzunluk = Number(istek.headers.get('content-length') ?? '0');
  if (Number.isFinite(uzunluk) && uzunluk > AZAMI_GOVDE_BAYT) {
    throw new ApiHata('gecersiz_istek', 'İstek gövdesi çok büyük');
  }
  const metin = await istek.text();
  if (metin.length > AZAMI_GOVDE_BAYT) {
    throw new ApiHata('gecersiz_istek', 'İstek gövdesi çok büyük');
  }
  if (metin.trim() === '') {
    throw new ApiHata('gecersiz_istek', 'JSON gövde bekleniyor', {
      ayrinti: [{ alan: '(gövde)', mesaj: 'boş gövde' }],
    });
  }
  try {
    return JSON.parse(metin);
  } catch {
    throw new ApiHata('gecersiz_istek', 'Gövde geçerli JSON değil', {
      ayrinti: [{ alan: '(gövde)', mesaj: 'JSON ayrıştırılamadı' }],
    });
  }
}

function yanit(govde: unknown, durum: number, basliklar: Record<string, string> = {}): Response {
  return Response.json(govde, {
    status: durum,
    headers: { 'Cache-Control': 'no-store', ...basliklar },
  });
}

/** Gövdeyi doğrular; zod hatası alan adıyla 400'e çevrilir. */
export function dogrula<T>(sema: z.ZodType<T>, veri: unknown): T {
  const sonuc = sema.safeParse(veri);
  if (!sonuc.success) {
    throw new ApiHata('gecersiz_istek', 'Gövde doğrulaması başarısız', {
      ayrinti: zodAyrintilari(sonuc.error),
    });
  }
  return sonuc.data;
}

export function apiUcu(
  secenek: UcSecenegi,
  isle: (b: Baglam) => Promise<UcYaniti>,
): (istek: Request) => Promise<Response> {
  return async function ucNoktasi(istek: Request): Promise<Response> {
    const basla = Date.now();
    const url = new URL(istek.url);
    const yol = url.pathname;
    const yontem = istek.method;

    // 1 · Demo yayını salt okunur: yazma uçları hiçbir şeye dokunmadan 403.
    if (DEMO && secenek.islem !== 'okuma') {
      return yanit(
        hataGovdesi('kapsam_disi', 'Demo yayını salt okunurdur; yazma uçları kapalıdır'),
        403,
      );
    }

    let anahtarId: string | null = null;
    let idem: string | null = null;
    let kayitId: string | null = null;
    let oranBasliklari: Record<string, string> = {};

    try {
      // 2 · Oran sınırı — kimlik çözülmeden, kimlik başına kova.
      const token = bearerToken(istek);
      const adres = token ? null : istekAdresi(istek);
      const kova = token
        ? `anahtar:${apiTokenOzeti(token)}`
        : `anonim:${adresEtiketi(adres)}`;
      const oran = await oranSinirla(
        kova,
        !token && adresBilinmiyor(adres) ? { sinir: ANONIM_BILINMEYEN_SINIRI } : undefined,
      );
      oranBasliklari = {
        'X-RateLimit-Limit': String(oran.sinir),
        'X-RateLimit-Remaining': String(oran.kalan),
        'X-RateLimit-Reset': String(Math.ceil(oran.sifirlanma / 1000)),
      };
      if (!oran.izin) {
        throw new ApiHata('oran_asildi', 'İstek sınırı aşıldı', {
          basliklar: { 'Retry-After': String(oran.yenidenDeneSn) },
        });
      }

      // 3 · Kimlik
      const kimlik = await istekKimligi(istek);
      anahtarId = kimlik.anahtarId;

      /* 4 · ANAHTAR KAPSAMI (UY-52) — rol kapısından ÖNCE.
         Sıra bilinçlidir: "bu anahtar bu uca bakabilir mi" sorusu, "bu
         kullanıcı bu veriyi görebilir mi" sorusundan bağımsızdır ve önce
         gelir. Kapsamı olmayan bir anahtar, sahibi yönetici olsa bile
         uca giremez. Ters sırada, kapsam dışı bir uç için önce rol
         kapısı çalışır ve yetkili bir sahiple istek geçerdi. */
      const kapsamKarari = ucaErisim({
        kapsamJson: kimlik.kapsamJson,
        saltOkunur: kimlik.saltOkunur,
        uc: secenek.uc,
      });
      if (!kapsamKarari.izin) {
        throw new ApiHata('kapsam_disi', kapsamKarari.sebep);
      }
      /* Kapsamı hiç tanımlanmamış eski anahtar çalışmaya devam eder ama
         SESSİZ kalmaz: entegrasyonu kuran taraf yanıtta görür. */
      const kapsamBasliklari: Record<string, string> = kapsamKarari.miras
        ? { 'X-Anahtar-Kapsami': 'tanimsiz' }
        : {};

      // 5 · Modül izni (kapsamdan bağımsız ön kontrol)
      let kapsam: string[] | null = null;
      if (secenek.islem === 'okuma') {
        kapsam = okumaKapsami(kimlik.kullanici, secenek.modul);
      } else {
        modulYazmaZorunlu(kimlik.kullanici, secenek.modul);
      }

      // 6 · Gövde + idempotency
      let govde: unknown = null;
      if (secenek.islem !== 'okuma') {
        idem = (istek.headers.get('idempotency-key') ?? '').trim() || null;
        if (!idem) {
          throw new ApiHata('gecersiz_istek', 'Idempotency-Key başlığı zorunlu', {
            ayrinti: [{ alan: 'Idempotency-Key', mesaj: 'istemci tarafından üretilen benzersiz değer' }],
          });
        }
        if (idem.length > 200) {
          throw new ApiHata('gecersiz_istek', 'Idempotency-Key en fazla 200 karakter', {
            ayrinti: [{ alan: 'Idempotency-Key', mesaj: 'en fazla 200 karakter' }],
          });
        }
        govde = await govdeOku(istek);

        // Rezervasyon: aynı anahtarla aynı Idempotency-Key ikinci kez gelirse
        // iş TEKRAR EDİLMEZ. durumKodu 0 = ilk istek hâlâ işleniyor.
        try {
          const kayit = await db.apiIstegi.create({
            data: { anahtarId, yontem, yol, idempotencyAnahtari: idem, durumKodu: 0 },
          });
          kayitId = kayit.id;
        } catch (e) {
          if (!p2002(e)) throw e;
          const onceki = await db.apiIstegi.findFirst({
            where: { anahtarId, idempotencyAnahtari: idem },
          });
          if (!onceki) throw e;
          if (onceki.durumKodu === 0) {
            throw new ApiHata('cakisma', 'Aynı Idempotency-Key ile bir istek hâlâ işleniyor', {
              basliklar: { 'Retry-After': '2' },
            });
          }
          if (onceki.yontem !== yontem || onceki.yol !== yol) {
            throw new ApiHata('cakisma', 'Bu Idempotency-Key başka bir uç için kullanılmış');
          }
          if (!onceki.yanitOzeti) {
            throw new ApiHata('cakisma', 'İlk yanıt tekrar oynatılamıyor; yeni bir Idempotency-Key kullanın');
          }
          return yanit(JSON.parse(onceki.yanitOzeti), onceki.durumKodu, {
            ...oranBasliklari, ...kapsamBasliklari, 'Idempotent-Replay': 'true',
          });
        }
      }

      // 7 · İşleyici
      const sonuc = await isle({
        istek, url, kimlik, kullanici: kimlik.kullanici, kapsam, govde,
        idempotencyAnahtari: idem,
      });
      const durum = sonuc.durum ?? 200;
      const ozet = JSON.stringify(sonuc.govde);
      const saklanabilir = ozet.length <= AZAMI_YANIT_OZETI;

      await denetimYaz({
        kayitId, anahtarId, yontem, yol, idem,
        durumKodu: durum, yanitOzeti: saklanabilir ? ozet : null,
        hataKodu: null, sureMs: Date.now() - basla,
      });

      return yanit(sonuc.govde, durum, {
        ...oranBasliklari, ...kapsamBasliklari, ...(sonuc.basliklar ?? {}),
      });
    } catch (e) {
      const h = apiHatasinaCevir(e);
      const durum = durumKodu(h.kod);
      const govde = hataGovdesi(h.kod, h.message, h.ayrinti);
      // 5xx idempotency kilidini AÇAR: iç hata sonrası aynı anahtarla yeniden
      // denemek mümkün olmalı. Denetim satırı yine de kalır.
      const kilitKalsin = durum < 500;
      await denetimYaz({
        kayitId, anahtarId, yontem, yol,
        idem: kilitKalsin ? idem : null,
        durumKodu: durum,
        yanitOzeti: kilitKalsin ? JSON.stringify(govde) : (h.icNot ?? null),
        hataKodu: h.kod,
        sureMs: Date.now() - basla,
      }).catch(() => { /* denetim yazımı isteği düşürmez; hata yanıtı yine döner */ });

      if (durum >= 500) console.error(`[api] ${yontem} ${yol} → ${h.kod}: ${h.icNot ?? h.message}`);
      return yanit(govde, durum, { ...oranBasliklari, ...(h.basliklar ?? {}) });
    }
  };
}

async function denetimYaz(v: {
  kayitId: string | null; anahtarId: string | null; yontem: string; yol: string;
  idem: string | null; durumKodu: number; yanitOzeti: string | null;
  hataKodu: string | null; sureMs: number;
}): Promise<void> {
  const veri = {
    durumKodu: v.durumKodu,
    yanitOzeti: v.yanitOzeti,
    hataKodu: v.hataKodu,
    sureMs: v.sureMs,
    idempotencyAnahtari: v.idem,
  };
  if (v.kayitId) {
    await db.apiIstegi.update({ where: { id: v.kayitId }, data: veri });
    return;
  }
  await db.apiIstegi.create({
    data: { anahtarId: v.anahtarId, yontem: v.yontem, yol: v.yol, ...veri },
  });
}

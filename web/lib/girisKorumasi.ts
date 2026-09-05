import 'server-only';
import { db } from './db';
import { oranKovasiniUnut, oranSinirla } from './api/oranSinir';
import { adresBilinmiyor, adresEtiketi, istemciAdresi } from './istemciAdresi';

/* Kaynak adres çözümü ARTIK BURADA DEĞİL: ham `x-forwarded-for` /
   `x-real-ip` okuması `lib/istemciAdresi.ts`e taşındı ve orada açık bir
   güvenilir-vekil sözleşmesine (TRUST_PROXY) bağlandı. Eski kod başlığın
   taklit edilebilir olduğunu YORUMDA kabul edip yine de kova seçimine
   sokuyordu; bu, adres sınırını istemcinin isteğine bırakmaktı. Yeniden
   dışa veriliyor ki çağıranlar (girisEylemleri.ts) tek yerden alsın. */
export { istemciAdresi };

/* ═══════════════════════════════════════════════════════════════════════
   GİRİŞ UCU SERTLEŞTİRMESİ — kaba kuvvet kancası + başarısız giriş kaydı

   Denetimde bulunan iki eksik burada kapatılır:

   1. BAŞARISIZ GİRİŞ HİÇ KAYDEDİLMİYORDU. `girisEylemleri.ts` yalnız
      BAŞARILI oturum açılışını `AktiviteKaydi`'na yazıyordu. Yani bir
      hesaba yüz yanlış parola denenmesi ile hiç denenmemesi, denetim
      izinde BİREBİR AYNI görünüyordu: olay müdahalesinin ilk sorusu olan
      "bu hesaba ne zaman, nereden saldırıldı" sorusunun yanıtı yoktu.

   2. GİRİŞ UCUNDA ORAN SINIRI YOKTU. `lib/api/oranSinir.ts` yazılmış ve
      API uçlarında uygulanmıştı, ama parola denemesi sınırsızdı. scrypt
      (N=2^15) denemeyi pahalı yapar — bu bir yavaşlatmadır, sınır değil.

   ── SIZINTI KURALI ─────────────────────────────────────────────────────
   Ekrana dönen mesaj HER durumda aynıdır ('E-posta veya parola hatalı');
   hesabın var olup olmadığı, pasif olup olmadığı istemciye SIZMAZ. Gerçek
   sebep yalnız denetim izine yazılır — orası yetkiyle korunur ve olay
   müdahalesinin ihtiyacı olan ayrım oradadır.

   Kayda PAROLA ASLA GİRMEZ; ne açık ne özet, ne uzunluğu.

   ── KİLİTLEME DEĞİL, YAVAŞLATMA ────────────────────────────────────────
   Sayaç BAŞARILI girişte düşürülür. Aksi hâlde kaba kuvvet koruması hesap
   kilitleme silahına dönerdi: bir saldırgan bildiği bir hesaba art arda
   yanlış parola göndererek sahibini pencere boyunca dışarıda bırakabilirdi.
   ═══════════════════════════════════════════════════════════════════════ */

const sayiOku = (ham: string | undefined, varsayilan: number): number => {
  const n = Number(ham);
  return Number.isFinite(n) && n > 0 ? n : varsayilan;
};

/* Eşikler ortamdan okunur (`lib/api/oranSinir.ts` ile aynı kalıp): NAT
   arkasındaki büyük bir sahanın adres eşiği ile küçük bir ofisinki aynı
   olmak zorunda değil. Kod değişmeden ayarlanabilmesi işletmenin işidir.

     hesapSiniri — kimlik başına deneme. Dar: meşru kullanıcı bir oturumda
                   sekiz kez yanlış yazmaz, saldırgan binlerce kez dener.
     adresSiniri — kaynak adres başına. Geniş: kimlik doldurma saldırısı her
                   denemede BAŞKA hesap dener ve hesap sayacına hiç takılmaz;
                   adres sayacı onu yakalar ama bir ofisi kilitlememeli.
     bilinmeyenSiniri — adres ÇÖZÜLEMEDİĞİNDE kullanılan PAYLAŞILAN kovanın
                   eşiği. Ayrı ve çok daha geniştir, çünkü bu kova bir adresi
                   değil bir POPÜLASYONU temsil eder: TRUST_PROXY
                   yapılandırılmadığında (varsayılan) tüm kimliksiz çağıranlar
                   buradadır. Gerekçenin tamamı `lib/istemciAdresi.ts`
                   `ADRES_BILINMIYOR` yorumundadır. */
let ayar = {
  hesapSiniri: sayiOku(process.env.GIRIS_ORAN_SINIRI, 8),
  adresSiniri: sayiOku(process.env.GIRIS_ADRES_SINIRI, 40),
  bilinmeyenSiniri: sayiOku(process.env.GIRIS_BILINMEYEN_SINIRI, 1000),
  pencereMs: sayiOku(process.env.GIRIS_ORAN_PENCERE_MS, 15 * 60_000),
};

export const girisOraniAyari = (): typeof ayar => ({ ...ayar });
export function girisOraniAyarla(yeni: Partial<typeof ayar>): void {
  ayar = { ...ayar, ...yeni };
}

/** Denetim izindeki `varlikId` — e-postası tanınmayan denemede kullanıcı
    kimliği YOKTUR ve uydurulmaz. */
export const BILINMEYEN_HESAP = 'bilinmeyen';

/** Başarısız girişin GERÇEK sebebi — yalnız denetim izine yazılır. */
export type GirisRedSebebi =
  | 'kullanici_yok'
  | 'kullanici_pasif'
  | 'parola_hatali'
  | 'oran_asildi';

const SEBEP_SOZU: Record<GirisRedSebebi, string> = {
  kullanici_yok: 'tanımsız e-posta',
  kullanici_pasif: 'kullanıcı pasif',
  parola_hatali: 'parola hatalı',
  oran_asildi: 'deneme sınırı aşıldı',
};

export const epostaNormalize = (ham: string): string => ham.trim().toLowerCase();

const hesapKovasi = (eposta: string) => `giris:hesap:${eposta}`;

/* Kova anahtarı ADRESTEN türetilir; adres çözülemediyse `adresEtiketi()` TEK
   paylaşılan etiketi verir. Kritik nokta: taklit edilmiş bir başlık bu
   anahtara HİÇ GİREMEZ — `istemciAdresi()` güvenilmeyen modda `null` döner,
   `null` da tek etikete çözülür. Eski kodda saldırgan her istekte başka bir
   `X-Forwarded-For` göndererek her istek için YENİ BİR KOVA açtırıyor ve
   adres sınırını hiç doldurmuyordu. */
const adresKovasi = (adres: string | null) => `giris:adres:${adresEtiketi(adres)}`;

/** Adres bilinmiyorsa paylaşılan kovanın (geniş) eşiği, biliniyorsa adres
    eşiği. Aynı sayıyı kullanmak, ya paylaşılan kovayı bir ofisin trafiğiyle
    doldurur ya da adres eşiğini işe yaramaz kadar genişletirdi. */
const adresEsigi = (adres: string | null): number =>
  (adresBilinmiyor(adres) ? ayar.bilinmeyenSiniri : ayar.adresSiniri);

export type GirisKotasi =
  | { izin: true }
  | { izin: false; yenidenDeneSn: number; kova: 'hesap' | 'adres' };

/**
 * Deneme kotasını TÜKETİR (yan etkilidir: sayaçları artırır) ve kararı
 * döner. Parola doğrulamasından ÖNCE çağrılmalıdır — scrypt'i sınırsız
 * çağırtmak tek başına bir hizmet dışı bırakma yüzeyidir.
 */
export async function girisKotasiTuket(
  eposta: string, adres: string | null,
): Promise<GirisKotasi> {
  /* İki sayaç da HER denemede artar: birinden geçip diğerine takılan bir
     istek, geçtiği sayaçta da sayılmış olmalı. Kısa devre yapılsaydı
     saldırgan hesap sayacını doldurup adres sayacını bedavaya getirirdi. */
  const [hesap, kaynak] = await Promise.all([
    oranSinirla(hesapKovasi(eposta), { sinir: ayar.hesapSiniri, pencereMs: ayar.pencereMs }),
    oranSinirla(adresKovasi(adres), { sinir: adresEsigi(adres), pencereMs: ayar.pencereMs }),
  ]);
  if (!hesap.izin) return { izin: false, yenidenDeneSn: hesap.yenidenDeneSn, kova: 'hesap' };
  if (!kaynak.izin) return { izin: false, yenidenDeneSn: kaynak.yenidenDeneSn, kova: 'adres' };
  return { izin: true };
}

/** Başarılı kimlik doğrulamadan sonra hesap sayacını düşürür (kilitleme
    silahı olmasın diye). Adres sayacı KASITLI olarak düşürülmez: tek bir
    başarılı giriş, aynı adresten gelen yüz başarısız denemeyi aklamaz. */
export async function girisKotasiniAkla(eposta: string): Promise<void> {
  await oranKovasiniUnut(hesapKovasi(eposta));
}

/* ═══ Denetim izi ═════════════════════════════════════════════════════ */

/** Denetim izine yazılan adres notu. Adres çözülemediyse SAHTE BİR ADRES
    yazılmaz ('0.0.0.0' bir kaynakmış gibi okunurdu); "adres bilinmiyor"
    cümlesi, olay müdahalesine "burada IP yoktu" bilgisini dürüstçe verir. */
const adresNotu = (adres: string | null): string => adres ?? 'adres bilinmiyor';

/**
 * Başarısız giriş denemesini denetim izine yazar.
 *
 * Yazma HATASI girişin sonucunu değiştirmez ama SESSİZ DE GEÇMEZ: sunucu
 * günlüğüne düşer. "Denetim yazılamadı" ile "deneme olmadı" aynı şey değil.
 */
export async function basarisizGirisiYaz(v: {
  eposta: string;
  kullaniciId: string | null;
  sebep: GirisRedSebebi;
  adres: string | null;
}): Promise<void> {
  try {
    await db.aktiviteKaydi.create({
      data: {
        aktorId: v.kullaniciId,
        varlikTipi: 'Oturum',
        varlikId: v.kullaniciId ?? BILINMEYEN_HESAP,
        eylem: 'red',
        alan: 'giris',
        // PAROLA YOK. Yalnız denenen kimlik ve kaynak adres.
        yeniDeger: `${v.eposta} · ${adresNotu(v.adres)}`,
        gerekce: SEBEP_SOZU[v.sebep],
        kaynak: 'ui',
      },
    });
  } catch (e) {
    console.error('[giris] başarısız giriş denetim izine yazılamadı:', e);
  }
}

/** Başarılı girişi denetim izine yazar (kaynak adresle birlikte). */
export async function basariliGirisiYaz(v: {
  kullaniciId: string;
  eposta: string;
  adres: string | null;
}): Promise<void> {
  await db.aktiviteKaydi.create({
    data: {
      aktorId: v.kullaniciId,
      varlikTipi: 'Oturum',
      varlikId: v.kullaniciId,
      eylem: 'olusturma',
      alan: 'giris',
      yeniDeger: `${v.eposta} · ${adresNotu(v.adres)}`,
      kaynak: 'ui',
    },
  });
}

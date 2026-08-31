import 'server-only';
import { headers } from 'next/headers';
import { db } from './db';
import { oranKovasiniUnut, oranSinirla } from './api/oranSinir';

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
                   adres sayacı onu yakalar ama bir ofisi kilitlememeli. */
let ayar = {
  hesapSiniri: sayiOku(process.env.GIRIS_ORAN_SINIRI, 8),
  adresSiniri: sayiOku(process.env.GIRIS_ADRES_SINIRI, 40),
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
const adresKovasi = (adres: string) => `giris:adres:${adres}`;

/**
 * İsteğin kaynak adresi. Ters vekil arkasında `x-forwarded-for`ın İLK
 * girdisi istemcidir; sonrakiler vekil zinciridir.
 *
 * Değer İSTEMCİ TARAFINDAN UYDURULABİLİR (başlık taklit edilebilir) —
 * bu yüzden adres sayacı tek başına bir güvence değil, ikinci katmandır;
 * asıl sınır hesap sayacıdır. Adres okunamıyorsa 'bilinmeyen' döner ve
 * tüm adressiz istekler tek kovada toplanır (sessizce sınırsız kalmaz).
 */
export async function istemciAdresi(): Promise<string> {
  try {
    const b = await headers();
    const iletilen = b.get('x-forwarded-for');
    if (iletilen) {
      const ilk = iletilen.split(',')[0]?.trim();
      if (ilk) return ilk.slice(0, 64);
    }
    const gercek = b.get('x-real-ip')?.trim();
    if (gercek) return gercek.slice(0, 64);
  } catch {
    /* İstek bağlamı yoksa (test, arka plan işi) adres bilinmez. */
  }
  return 'bilinmeyen';
}

export type GirisKotasi =
  | { izin: true }
  | { izin: false; yenidenDeneSn: number; kova: 'hesap' | 'adres' };

/**
 * Deneme kotasını TÜKETİR (yan etkilidir: sayaçları artırır) ve kararı
 * döner. Parola doğrulamasından ÖNCE çağrılmalıdır — scrypt'i sınırsız
 * çağırtmak tek başına bir hizmet dışı bırakma yüzeyidir.
 */
export async function girisKotasiTuket(eposta: string, adres: string): Promise<GirisKotasi> {
  /* İki sayaç da HER denemede artar: birinden geçip diğerine takılan bir
     istek, geçtiği sayaçta da sayılmış olmalı. Kısa devre yapılsaydı
     saldırgan hesap sayacını doldurup adres sayacını bedavaya getirirdi. */
  const [hesap, kaynak] = await Promise.all([
    oranSinirla(hesapKovasi(eposta), { sinir: ayar.hesapSiniri, pencereMs: ayar.pencereMs }),
    oranSinirla(adresKovasi(adres), { sinir: ayar.adresSiniri, pencereMs: ayar.pencereMs }),
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
  adres: string;
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
        yeniDeger: `${v.eposta} · ${v.adres}`,
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
  adres: string;
}): Promise<void> {
  await db.aktiviteKaydi.create({
    data: {
      aktorId: v.kullaniciId,
      varlikTipi: 'Oturum',
      varlikId: v.kullaniciId,
      eylem: 'olusturma',
      alan: 'giris',
      yeniDeger: `${v.eposta} · ${v.adres}`,
      kaynak: 'ui',
    },
  });
}

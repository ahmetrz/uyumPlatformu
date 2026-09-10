'use server';

import { redirect } from 'next/navigation';
import { db } from './db';
import { parolaDogru, oturumAc, oturumKapat } from './auth';
import {
  basariliGirisiYaz, basarisizGirisiYaz, epostaNormalize,
  girisKotasiTuket, girisKotasiniAkla, istemciAdresi,
} from './girisKorumasi';
import { guvenliHedef } from '../app/(giris)/giris/mantik';
import { mfaGirisDogrula, mfaKuruluMu } from './kimlik/mfaGiris';
import { mfaGirisKapisi, politikaCoz } from './kimlik/politika';
import { db as veritabani } from './db';

/* Giriş ucu.

   Sertleştirme `lib/girisKorumasi.ts` içinde yaşar; buradaki akış onun
   sözleşmesini uygular:

     kota tüket → kullanıcıyı bul → parolayı HER DURUMDA doğrula →
     karar → denetim izi (başarı DA başarısızlık DA) → oturum

   İSTEMCİYE DÖNEN MESAJ TEK: hesabın varlığı, pasifliği ya da parolanın
   yanlışlığı ayırt edilemez. Gerçek sebep denetim izindedir.

   DÖNÜŞ HEDEFİ (E40): `next` istemciden gelir ve yalnız site içi göreli
   yolsa kullanılır; kural `app/(giris)/giris/mantik.ts → guvenliHedef`.
   Ret dallarında `next` hiç okunmaz — yönlendirme yalnız başarıda olur. */

/** Ekranda görünen tek ret cümlesi — hangi sebeple reddedildiği sızmaz. */
const GENEL_RET = 'E-posta veya parola hatalı';

/* ── İKİNCİ FAKTÖR BURADA SORULUR ──────────────────────────────────────
   Bağımsız inceleme bulgusu (#49) ve bu turun en pahalı kusuru: MFA
   katmanı bütünüyle yazılmıştı (kayıt · doğrulama · kurtarma kodu ·
   kiracı politikası · ekran) ama HİÇBİR YERDEN ÇAĞRILMIYORDU. `girisYap`
   parolayı doğrulayınca doğrudan `oturumAc` diyordu; `/ayarlar/kimlik`
   ekranı ise "MFA zorunlu — TOTP'siz yerel hesap giriş YAPAMAZ" diye
   yazıyordu. İki cümle tek tek doğruydu, BİRLİKTE yalandı ve ürünün
   kendi ekranı uygulanmayan bir kontrolü uygulanıyor gösteriyordu —
   `Oturum.sonKullanim` sütununun bir zamanlar yaptığı şeyin aynısı.

   Akış İKİ ADIMLIDIR ve adımlar ayrı çağrılardır: parola doğru ama kod
   gelmediyse eylem `mfaGerekli: true` döner, form kod alanını açar,
   ikinci çağrı kodu getirir. Parola İLK adımda doğrulanır ve her
   başarısız adım oran sınırını tüketir — kod alanı bir kaba kuvvet
   kaçamağı olamaz. */
export type GirisSonucu =
  | { ok: false; hata: string }
  | { ok: false; hata: string; mfaGerekli: true };

async function politika() {
  try {
    const k = await veritabani.oturumPolitikasi.findUnique({
      where: { kiraci: 'varsayilan' }, select: { mutlakSaat: true, mfaZorunlu: true },
    });
    return politikaCoz(k && { mutlakSaat: k.mutlakSaat, mfaZorunlu: k.mfaZorunlu });
  } catch {
    /* Politika okunamıyorsa varsayılan uygulanır — `auth.ts` ile aynı
       gerekçe: yapılandırma eksiği kullanıcıyı dışarı atma sebebi değil. */
    return politikaCoz(null);
  }
}

export async function girisYap(girdi: {
  eposta: string; parola: string; kod?: string | null; next?: string | null;
}): Promise<GirisSonucu | never> {
  const eposta = epostaNormalize(girdi.eposta);
  const adres = await istemciAdresi();

  /* 1 · Kaba kuvvet kancası — scrypt'ten ÖNCE. Sınırsız parola denemesi
     yalnız hesabı değil, sunucuyu da hedeftir: scrypt(N=2^15) her çağrıda
     kasıtlı olarak pahalıdır. */
  const kota = await girisKotasiTuket(eposta, adres);
  if (!kota.izin) {
    await basarisizGirisiYaz({ eposta, kullaniciId: null, sebep: 'oran_asildi', adres });
    return {
      ok: false,
      hata: `Çok fazla başarısız giriş denemesi. ${kota.yenidenDeneSn} saniye sonra tekrar deneyin.`,
    };
  }

  const kullanici = await db.kullanici.findUnique({ where: { eposta } });
  // Zamanlama sızıntısını sınırlamak için parola her durumda doğrulanır
  const dogru = parolaDogru(girdi.parola, kullanici?.parolaHash ?? 's1$00$00');

  if (!kullanici || !kullanici.aktif || !dogru) {
    // Gerçek sebep YALNIZ denetim izine; istemciye tek cümle döner.
    const sebep = !kullanici ? 'kullanici_yok' : (!kullanici.aktif ? 'kullanici_pasif' : 'parola_hatali');
    await basarisizGirisiYaz({ eposta, kullaniciId: kullanici?.id ?? null, sebep, adres });
    return { ok: false, hata: GENEL_RET };
  }

  /* 2 · İKİNCİ FAKTÖR. Parola geçti; oturum HENÜZ AÇILMADI. */
  const p = await politika();
  const kurulu = await mfaKuruluMu(kullanici.id);

  /* 2a · Politika zorunlu kılıyor ama hesapta kayıt yok → içeri ALINMAZ.
     Sessizce almak, politikayı ekranda "açık" gösterip fiilen delmek
     olurdu. Kurum hesabı (OIDC) bu yoldan geçmez: orada ikinci faktör
     IdP'nin işidir ve sınır `politika.ts`te yazılıdır. */
  const kapi = mfaGirisKapisi({
    mfaZorunlu: p.mfaZorunlu, mfaKurulu: kurulu, kurumHesabi: false,
  });
  if (!kapi.ok) {
    await basarisizGirisiYaz({
      eposta, kullaniciId: kullanici.id, sebep: 'mfa_kurulu_degil', adres,
    });
    return { ok: false, hata: kapi.sebep };
  }

  if (kurulu) {
    const kod = (girdi.kod ?? '').trim();
    if (kod === '') {
      /* Parola DOĞRU ama kod yok: form kod alanını açsın diye AYRI bir
         hâl döner. Bu hâl bir bilgi sızıntısı değildir — kaba kuvvet
         kotası zaten tüketildi ve saldırgan parolayı zaten biliyor. */
      return {
        ok: false,
        mfaGerekli: true,
        hata: 'Doğrulayıcı uygulamanızdaki kodu girin.',
      };
    }
    const ikinci = await mfaGirisDogrula({ kullaniciId: kullanici.id, kod });
    if (!ikinci.ok) {
      /* Kod hatası da oran sınırını tüketir ve ize yazılır: ikinci faktör
         sınırsız denenebilen bir alan olamaz. */
      await basarisizGirisiYaz({
        eposta, kullaniciId: kullanici.id, sebep: 'mfa_kod_hatali', adres,
      });
      return { ok: false, mfaGerekli: true, hata: ikinci.hata };
    }
  }

  await oturumAc(kullanici.id);
  // Başarılı giriş hesap sayacını temizler — koruma kilitleme silahı olmasın.
  await girisKotasiniAkla(eposta);
  await basariliGirisiYaz({ kullaniciId: kullanici.id, eposta, adres });
  redirect(guvenliHedef(girdi.next));
}

export async function cikisYap(): Promise<never> {
  await oturumKapat();
  redirect('/giris');
}

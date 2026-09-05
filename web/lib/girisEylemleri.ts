'use server';

import { redirect } from 'next/navigation';
import { db } from './db';
import { parolaDogru, oturumAc, oturumKapat } from './auth';
import {
  basariliGirisiYaz, basarisizGirisiYaz, epostaNormalize,
  girisKotasiTuket, girisKotasiniAkla, istemciAdresi,
} from './girisKorumasi';
import { guvenliHedef } from '../app/(giris)/giris/mantik';

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

export async function girisYap(girdi: { eposta: string; parola: string; next?: string | null }):
  Promise<{ ok: false; hata: string } | never> {
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

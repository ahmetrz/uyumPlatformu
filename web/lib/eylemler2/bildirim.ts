'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { aktifKullanici, type AktifKullanici } from '../auth';
import { izinliTesisIdleri } from '../erisim';
import { DEMO } from '../demo';
import { kutuKapisiAcik } from '../../app/(atlas)/(operasyonel)/bildirimler/mantik';
import { tamam, hata, type Sonuc } from './ortak';

/* Bildirim kutusunun yazma yüzeyi (§52).

   Bulgu #11'e kadar bu eylem hiçbir yerden çağrılmıyordu ve hiçbir ekran
   `db.bildirim` okumuyordu: son tarih motoru her koşuda uyarı üretiyor,
   uyarı kimseye ulaşmıyordu. Okuma yüzeyi artık
   `app/(atlas)/(operasyonel)/bildirimler`.

   ─ SAHİPLİK SINIRI ──────────────────────────────────────────────────────
   `kullaniciId` bir filtre değil, SINIRDIR. Güncelleme `updateMany` ile ve
   HER İKİ koşul birden (`id` + `kullaniciId`) verilerek yapılır;
   `update({ where: { id } })` kullanılsaydı bir kullanıcı başkasının
   bildirimini okundu işaretleyebilirdi. Bu biçimde başkasının bildirimini
   hedefleyen çağrı HİÇBİR SATIR GÜNCELLEMEZ
   (tests/bildirim-kutusu.test.ts bunu dondurur).

   ─ KAPI NEDEN `yetkiZorunlu` DEĞİL ──────────────────────────────────────
   Önceki hâli `yetkiZorunlu('uyum', 'okuma')` idi ve bu, kapsamsız (kurum
   geneli) bir işlem sorar: `lib/erisim.ts → kapsamUyar` gereği santrale
   KISITLI bir yetki bu kapıdan geçemez. Bildirimin santrali yoktur — kutu
   kişiseldir — ve bildirimi asıl alanlar (bir santralin bulgu/aksiyon
   sorumluları) tam da santrale kısıtlı kullanıcılardır. Yani eski kapı,
   uyarıyı gönderdiğimiz insanların kendi bildirimlerini okundu
   işaretlemesini engelliyordu.

   Paralel bir yetki modeli KURULMADI: karar yine `izinliTesisIdleri`in,
   burada yalnız onun çıktısı okunuyor (`kutuKapisiAcik`) — API tarafında
   `lib/api/yetki.ts → okumaKapsami` aynı kuralı uygular. */

/** Kutu kapısı: oturum + demo kilidi + "uyum modülünde bir yerde okuma". */
async function kutuSahibi(): Promise<AktifKullanici> {
  const k = await aktifKullanici();
  if (!k) throw new Error('Oturum gerekli');
  // Okundu işareti bir YAZMADIR; demo yayını salt okunurdur.
  if (DEMO) throw new Error('Demo sürümü: değişiklik kaydedilmez.');
  if (!kutuKapisiAcik(izinliTesisIdleri(k, 'uyum'))) {
    throw new Error('Bu işlem için yetkiniz yok (uyum/okuma)');
  }
  return k;
}

export async function bildirimOkundu(girdi: { id?: string; hepsi?: boolean }): Promise<Sonuc> {
  try {
    const k = await kutuSahibi();
    if (girdi.hepsi) {
      await db.bildirim.updateMany({
        where: { kullaniciId: k.id, okundu: null }, data: { okundu: new Date() } });
    } else if (girdi.id) {
      /* Sahibi olmayan bir id sessizce 0 satır günceller ve `ok` döner.
         Bu bilinçlidir: "bu bildirim başkasınındır" yanıtı, var olmayan bir
         bildirimle var olan ama başkasına ait bir bildirimi ayırt ettirir —
         yani başka kullanıcıların kutusunu yoklamaya yarardı. Kayıt
         DEĞİŞMEDİĞİ için sızıntı da yok. */
      await db.bildirim.updateMany({
        where: { id: girdi.id, kullaniciId: k.id }, data: { okundu: new Date() } });
    }
    revalidatePath('/bildirimler');
    revalidatePath('/');
    return tamam();
  } catch (e) { return hata(e); }
}

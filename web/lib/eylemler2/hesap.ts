'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db } from '../db';
import { aktifKullanici, parolaDogru, parolaOzetle, tumOturumlariKapat } from '../auth';
import { DEMO } from '../demo';
import { yetkiZorunlu } from '../erisim';
import { PAROLA_EN_AZ } from '../../app/(kabuk)/(operasyonel)/ayarlar/mantik';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

/* Hesap eylemleri (D26 · D31): parola tanımlama, parola değiştirme, profil
   ve oturum temizliği.

   ── PAROLA HİÇBİR YERE YAZILMAZ ────────────────────────────────────────
   Bu modül parolayı yalnız `parolaOzetle`/`parolaDogru` (lib/auth.ts) ile
   görür. Denetim izine (`iz`) parolanın kendisi, uzunluğu ya da özeti
   GİRMEZ: iz kaydı "kim, kime, ne zaman, kaç oturum düştü" der, o kadar.
   Bir gün iz tablosu dışa açıldığında parola sızmasın; kural buradadır.

   ── PAROLA DEĞİŞİMİ OTURUM KESER ───────────────────────────────────────
   Yönetici bir kullanıcıya parola tanımladığında o kullanıcının TÜM
   oturumları düşer (`tumOturumlariKapat`): parolası ele geçmiş hesabın
   saldırgandaki açık oturumu canlı kalmasın. Kullanıcı KENDİ parolasını
   değiştirdiğinde ise yalnız DİĞER oturumları düşer — kişiyi az önce
   kaydettiği ekrandan atmak, "değişikliği kaydettim mi" sorusunu doğurur
   ve işlemi ikinci kez yaptırır. Mevcut oturum çerezin özetinden tanınır. */

/* Parola alt sınırı `ayarlar/mantik.ts` içinde yaşar: 'use server' modülü
   sabit dışa açamaz, formlar da aynı sayıyı görmek zorunda. */
const parolaKurali = (ad: string) => z.string()
  .min(PAROLA_EN_AZ, `${ad} en az ${PAROLA_EN_AZ} karakter olmalı`)
  .max(256, `${ad} 256 karakteri aşamaz`);

/* Çerez adı ve SHA-256 özeti `lib/auth.ts` içinde dışa açılmamış sabittir;
   burada aynı sözleşme tekrar edilir. auth.ts'te çerez adı ya da özet
   algoritması değişirse burası da değişmeli — `tests/hesap.test.ts`
   "mevcut oturum ayakta kalır" testi bunu yakalar. */
const CEREZ_ADI = 'oturum';
async function mevcutOturumOzeti(): Promise<string | null> {
  const token = (await cookies()).get(CEREZ_ADI)?.value;
  return token ? createHash('sha256').update(token).digest('hex') : null;
}

/** Kişinin kendi kaydına dokunan eylemlerin kapısı: oturum şart, demo yazmaz.
    `yetkiZorunlu` kullanılmaz çünkü kendi profilini düzenlemek bir modül
    yetkisi değildir — yetkisiz (okuyucu bile olmayan) bir hesap da kendi
    parolasını değiştirebilmeli. */
async function kendiHesabi() {
  const k = await aktifKullanici();
  if (!k) throw new Error('Oturum gerekli');
  if (DEMO) throw new Error('Demo sürümü: değişiklik kaydedilmez.');
  return k;
}

/**
 * Yönetici bir kullanıcıya parola tanımlar (ilk parola ya da sıfırlama).
 *
 * Kapı `yetkiVer` ile aynıdır (yönetim/onay): parola tanımlamak erişim
 * vermekle eşdeğer bir ayrıcalıktır — parolası olmayan hesap giriş
 * yapamaz, parola tanımlanınca yapar.
 */
export async function parolaBelirle(girdi: { kullaniciId: string; parola: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'onay');
    const v = z.object({
      kullaniciId: bosluksuz('Kullanıcı'),
      parola: parolaKurali('Parola'),
    }).parse(girdi);

    const hedef = await db.kullanici.findUnique({
      where: { id: v.kullaniciId }, select: { id: true, parolaHash: true },
    });
    if (!hedef) throw new Error('Kullanıcı bulunamadı');
    const ilkKez = hedef.parolaHash === null;

    await db.kullanici.update({
      where: { id: hedef.id }, data: { parolaHash: parolaOzetle(v.parola) },
    });
    const dusen = await tumOturumlariKapat(hedef.id);
    await iz({
      aktorId: k.id, varlikTipi: 'Kullanici', varlikId: hedef.id,
      eylem: ilkKez ? 'parola_tanimlama' : 'parola_sifirlama', alan: 'parolaHash',
      once: ilkKez ? 'tanımlı değil' : 'tanımlı', sonra: 'tanımlı',
      gerekce: `${dusen} oturum kapatıldı`,
    });
    revalidatePath('/yetkiler');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Kullanıcı kendi parolasını değiştirir; eski parola doğrulanır. */
export async function parolaDegistir(girdi: { eski: string; yeni: string }): Promise<Sonuc> {
  try {
    const k = await kendiHesabi();
    const v = z.object({
      eski: z.string().min(1, 'Mevcut parola boş olamaz'),
      yeni: parolaKurali('Yeni parola'),
    }).parse(girdi);
    if (v.eski === v.yeni) throw new Error('Yeni parola mevcut parolayla aynı olamaz');

    const kayit = await db.kullanici.findUniqueOrThrow({
      where: { id: k.id }, select: { parolaHash: true },
    });
    /* Ret cümlesi tek ve bilgi vermez: "parola tanımlı değil" ile "yanlış"
       ayrılmaz — oturumu çalınmış hesabın parolasız olup olmadığı, oturumu
       ele geçirene söylenmez. */
    if (!parolaDogru(v.eski, kayit.parolaHash)) throw new Error('Mevcut parola hatalı');

    await db.kullanici.update({ where: { id: k.id }, data: { parolaHash: parolaOzetle(v.yeni) } });
    const dusen = await digerOturumlariSil(k.id);
    await iz({
      aktorId: k.id, varlikTipi: 'Kullanici', varlikId: k.id,
      eylem: 'parola_degisimi', alan: 'parolaHash', once: 'tanımlı', sonra: 'tanımlı',
      gerekce: `kullanıcı kendi değiştirdi · ${dusen} diğer oturum kapatıldı`,
    });
    revalidatePath('/ayarlar');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Kişi kendi ad-soyad ve unvanını günceller. E-posta kimliktir; buradan
    değişmez (yönetici /yetkiler'den değiştirir, iz oraya yazılır). */
export async function profilGuncelle(girdi: { adSoyad: string; unvan: string | null }): Promise<Sonuc> {
  try {
    const k = await kendiHesabi();
    const v = z.object({
      adSoyad: bosluksuz('Ad soyad').max(120, 'Ad soyad 120 karakteri aşamaz'),
      unvan: z.string().trim().max(120, 'Unvan 120 karakteri aşamaz').nullable()
        .transform((s) => (s ? s : null)),
    }).parse(girdi);

    const eski = await db.kullanici.findUniqueOrThrow({
      where: { id: k.id }, select: { adSoyad: true, unvan: true },
    });
    await db.kullanici.update({ where: { id: k.id }, data: { adSoyad: v.adSoyad, unvan: v.unvan } });
    if (eski.adSoyad !== v.adSoyad) {
      await iz({ aktorId: k.id, varlikTipi: 'Kullanici', varlikId: k.id,
        eylem: 'guncelleme', alan: 'adSoyad', once: eski.adSoyad, sonra: v.adSoyad });
    }
    if (eski.unvan !== v.unvan) {
      await iz({ aktorId: k.id, varlikTipi: 'Kullanici', varlikId: k.id,
        eylem: 'guncelleme', alan: 'unvan', once: eski.unvan, sonra: v.unvan });
    }
    revalidatePath('/ayarlar');
    revalidatePath('/yetkiler');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Mevcut çerezin oturumu dışında kalan tüm oturumları siler; düşen sayıyı
    döndürür. Çerez okunamıyorsa (istek dışı bağlam) hiçbir oturum ayrı
    tutulmaz — bu durumda çağıran zaten oturumsuzdur ve `kendiHesabi`
    daha önce fırlatmıştır. */
async function digerOturumlariSil(kullaniciId: string): Promise<number> {
  const mevcut = await mevcutOturumOzeti();
  const sonuc = await db.oturum.deleteMany({
    where: { kullaniciId, ...(mevcut ? { NOT: { tokenHash: mevcut } } : {}) },
  });
  return sonuc.count;
}

/** /ayarlar · "Diğer oturumları kapat": bu tarayıcı açık kalır, gerisi düşer. */
export async function digerOturumlariKapat(): Promise<Sonuc> {
  try {
    const k = await kendiHesabi();
    const dusen = await digerOturumlariSil(k.id);
    await iz({
      aktorId: k.id, varlikTipi: 'Oturum', varlikId: k.id, eylem: 'silme',
      alan: 'digerOturumlar', sonra: String(dusen), gerekce: 'kullanıcı diğer oturumlarını kapattı',
    });
    revalidatePath('/ayarlar');
    return tamam();
  } catch (e) { return hata(e); }
}

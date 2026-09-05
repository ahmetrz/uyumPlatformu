'use server';

/* Otomasyon motoru eylemleri (§68): motorlar YALNIZ isKos sarmalayıcısı
   üzerinden koşar — her koşu IsKosusu satırı bırakır, sessiz hata yoktur.
   Motor çalıştırmak yönetim yetkisi ister. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { yetkiZorunlu } from '../erisim';
import { isKos } from '../motorlar/isKosucu';
import { MOTORLAR, MOTOR_ADLARI } from '../motorlar/kayit';
import { tamam, hata, type Sonuc } from './ortak';

/* Motor listesi burada DEĞİL, `lib/motorlar/kayit.ts` içinde yaşıyor:
   zamanlayıcı (instrumentation.ts) da aynı defteri okuyor. İki kopya
   ayrışmıştı ve zamanlayıcı sekiz motorun beşini koşturuyordu. */
const ISLER = MOTORLAR;

const IsAdiSemasi = z.enum(MOTOR_ADLARI, 'Bilinmeyen iş adı');

/** Kayıtlı motorların TAMAMINI sırayla çalıştırır: önce tazelik ve son
    tarihler işlenir, gap-to-action bunların çıktısını görür, veri kalitesi
    en sonda tarar.

    NOT — iki farklı sıra vardır ve bu bilinçlidir:
    · Buradaki sıra ELLE tetiklenen "hepsini çalıştır" düğmesinindir ve
      ürünün özgün tasarımıdır (veri kalitesi en sonda tam tarama yapar).
    · Entegrasyondan YENİ VERİ geldiğinde koşan sıra farklıdır ve
      lib/entegrasyon/zincir.ts içinde yaşar: orada veri kalitesi
      gap-to-action'dan ÖNCE koşar, çünkü yeni aktarılan kaydın
      kalitesi bilinmeden ondan aksiyon türetmek yanlış olur. */
export async function tumIsleriCalistir(): Promise<Sonuc> {
  try {
    await yetkiZorunlu('yonetim', 'yazma');
    /* Başarısız koşu SESSİZ GEÇMEZ. Eskiden hepsi patlasa bile tamam()
       dönüyordu; kullanıcı motorların çalıştığını sanıyordu. Koşu kaydı
       zaten /saglik'te görünüyor ama çağırana da bildirilmeli. */
    const basarisizlar: string[] = [];
    const kosmayanlar: string[] = [];
    let kosan = 0;
    for (const [ad, motor] of Object.entries(ISLER)) {
      const sonuc = await isKos(ad, motor);
      if (sonuc.ok) { kosan += 1; continue; }
      if (sonuc.sebep === 'hata') basarisizlar.push(ad);
      else kosmayanlar.push(ad);          // zaten_calisiyor
    }
    revalidatePath('/saglik');

    if (basarisizlar.length > 0) {
      return { ok: false, hata: `${basarisizlar.length} motor başarısız: ${basarisizlar.join(', ')}. Ayrıntı platform sağlığı ekranında.` };
    }

    /* HİÇBİRİ KOŞMADIYSA BAŞARI DÖNMEZ.

       Eskiden yalnız `sebep === 'hata'` başarısızlık sayılıyordu; sekiz
       motorun hepsi `zaten_calisiyor` dönse bile kullanıcı `tamam()`
       görüyordu. Yani düğmeye basan kişi motorların koştuğunu sanıyordu,
       oysa hiçbiri koşmamıştı — ekranda da bir değişiklik olmadığı için
       bunu ancak koşu geçmişini açıp saat karşılaştırarak fark ederdi.

       Çakışma bir HATA DEĞİLDİR (başka bir koşu sürüyor olabilir), bu
       yüzden kısmî durumda başarı dönülür ama kaç motorun atlandığı
       SÖYLENİR. Hiçbiri koşmadıysa söylenecek şey "başarılı" değildir. */
    if (kosan === 0 && kosmayanlar.length > 0) {
      return {
        ok: false,
        hata: `Hiçbir motor koşmadı: ${kosmayanlar.length} motorun koşusu hâlihazırda sürüyor. `
          + 'Bu bir hata değil, çakışma korumasıdır — birkaç dakika sonra tekrar deneyin.',
      };
    }
    if (kosmayanlar.length > 0) {
      return {
        ok: false,
        hata: `${kosan} motor koştu; ${kosmayanlar.length} motor atlandı `
          + `(koşusu sürüyor): ${kosmayanlar.join(', ')}.`,
      };
    }
    return tamam();
  } catch (e) { return hata(e); }
}

/** Tek motoru adıyla çalıştırır. */
export async function tekIsCalistir(ad: string): Promise<Sonuc> {
  try {
    await yetkiZorunlu('yonetim', 'yazma');
    const isAdi = IsAdiSemasi.parse(ad);
    const sonuc = await isKos(isAdi, ISLER[isAdi]);
    revalidatePath('/saglik');
    if (!sonuc.ok) {
      return sonuc.sebep === 'zaten_calisiyor'
        ? { ok: false, hata: 'Bu motor hâlihazırda koşuyor.' }
        : { ok: false, hata: `Motor başarısız: ${sonuc.hata}` };
    }
    return tamam();
  } catch (e) { return hata(e); }
}

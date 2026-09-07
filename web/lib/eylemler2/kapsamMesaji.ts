import 'server-only';
import type { AktifKullanici } from '../auth';
import { izinliTesisIdleri, type Modul } from '../erisim';
import { kapsamAnahtari, kapsamSozlugu, tesisSozlugu } from '../dil/sozlukOku';
import { t, type Bicim } from '../dil/terimler';

/* ═══════════════════════════════════════════════════════════════════════
   KAPSAM YETKİ MESAJI — sözlükten, tek yerden

   ── NİÇİN ─────────────────────────────────────────────────────────────
   Sekiz sunucu eylem dosyasında aynı cümle çekirdek sözcükle YAZILIYDI:
   "Bu tesis kapsamında … yetkiniz yok". Bekçi bunu göremez (sektör
   sözcüğü yok), `sozluk-farki` de göremez (mesaj yalnız yetki reddinde
   render edilir — koşula bağlı dal). Sınıf taraması buldu.

   Bunlar KULLANICIYA GÖRÜNEN metindir; muafiyet konusu değil, sözlüğe
   bağlanması ZORUNLU. Her dosyada `kapsamSozlugu(kapsamAnahtari(...))`
   dansını tekrarlamak yerine tek kapı.

   ── BAĞLAM EN DAR YERDEN ──────────────────────────────────────────────
   Tesisi BİLİNEN işlemde kaydın KENDİ sözlüğü kullanılır (`tesisSozlugu`)
   — kullanıcı o kaydın sözcüğünü okur. Tesisi bilinmeyende böyle bir
   bağlam yok; kullanıcının KAPSAMI kullanılır. Aynı ayrım
   `tedarikciOturum` ve `olay` dilimlerinde de yapıldı.

   ── NİÇİN async ───────────────────────────────────────────────────────
   Sözlük veritabanından okunur. `kapsamZorunlu` senkron olduğu için
   mesaj ÖNDEN kurulur ve ona verilir — kapının kendisi değişmez.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── ÇEKİM EKİ ÜRETİLMEZ ───────────────────────────────────────────────
   `SektorSozlugu`nun ALTI ayrı alanı (tekil · çoğul · iyelik · belirtme ·
   bulunma · yönelme) tam olarak ek üretimini engellemek için var.
   "arıtma tesisi" + "'ne" gibi bir birleştirme Türkçede yanlış sonuç
   verir ve sektöre göre değişir; doğru hâl SÖZLÜKTEN çekilir.

   Bu yüzden yardımcı `bicim` parametresi alır ve terimi o hâliyle okur.
   Hiçbir yerde terim + ek birleştirmesi YOKTUR.

   ── 25 MESAJIN GEREKTİRDİĞİ HÂLLER (ölçüldü) ──────────────────────────
   Sekiz dosyadaki yirmi beş mesajın hepsi TEKİL hâl istiyor:
     "Bu <tesis> kapsamında … yetkiniz yok"           → tekil
     "<Tesis> bulunamadı" · "<Tesis> veya madde seçin" → tekil (baş harf)
     "En az bir <tesis> seçin"                        → tekil
     "… <tesis> kapsamı dışında"                      → tekil
   Çerçeve gerçekten tek biçimli; "tesisi güncellendi" / "tesise eklendi"
   gibi başka hâl isteyen bir mesaj bu kümede YOK. Yeni bir çerçeve
   gerekirse `bicim` verilir — dize birleştirmesi değil. */

/**
 * "Bu <tesis> kapsamında <sonek>" — sonek çağıranın işidir.
 *
 * @param tesisId Kaydın tesisi; `null`/`undefined` ise kullanıcının kapsamı.
 * @param sonek   "risk yazma yetkiniz yok" gibi; cümlenin geri kalanı.
 * @param bicim   Terimin çekim hâli; SÖZLÜKTEN okunur, ek üretilmez.
 */
export async function kapsamMesaji(
  k: AktifKullanici, modul: Modul, sonek: string, tesisId?: string | null,
  bicim: Bicim = 'tekil',
): Promise<string> {
  const sozluk = tesisId
    ? await tesisSozlugu(tesisId)
    : await kapsamSozlugu(kapsamAnahtari(izinliTesisIdleri(k, modul)));
  return `Bu ${t(sozluk, 'tesis', bicim)} kapsamında ${sonek}`;
}

/** Kullanıcının kapsamına göre tesis sözcüğü — serbest cümleler için. */
export async function kapsamTerimi(
  k: AktifKullanici, modul: Modul, bicim: Bicim = 'tekil',
): Promise<string> {
  const sozluk = await kapsamSozlugu(kapsamAnahtari(izinliTesisIdleri(k, modul)));
  return t(sozluk, 'tesis', bicim);
}

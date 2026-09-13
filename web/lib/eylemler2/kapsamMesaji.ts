import 'server-only';
import type { AktifKullanici } from '../auth';
import { izinliTesisIdleri, type Modul } from '../erisim';
import { kapsamAnahtari, kapsamSozlugu, ogeSozlugu } from '../dil/sozlukOku';
import { t, tBas, terim, type Bicim, type Sozluk, type Terim } from '../dil/terimler';

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

   ── MESAJLARIN GEREKTİRDİĞİ HÂLLER (ölçüldü · `lib/eylemler2` geneli) ─
   İlk ölçüm sekiz dosyadaki yirmi beş mesajı kapsıyordu ve hepsi TEKİL
   istiyordu. Sınıf taraması aile geneline yayılınca çerçeve sayısı
   arttı; hâller ölçüldü:

     "Bu <tesis> kapsamında … yetkiniz yok"            → tekil   (44)
     "<Tesis> bulunamadı" · "<Tesis> veya madde seçin" → tekil   (9)
     "Bu <tesiste> … yetkiniz yok"                     → bulunma (7)
     "Bu hesabın <tesisi> kapsamınızda değil"          → belirtme (3)
     "Bu <tesisin> sicilinde …"                        → iyelik  (1)
     "<Tesise> bağlı olmayan kayıt …"                  → yönelme (2)

   Yani ALTI hâlin beşi gerçekten kullanılıyor. Hiçbiri ek birleştirerek
   üretilmez; her biri sözlükten OKUNUR. Yeni bir çerçeve gerekirse yine
   `bicim` verilir — dize birleştirmesi değil. */

/**
 * "Bu <tesis> kapsamında <sonek>" — sonek çağıranın işidir.
 *
 * @param kapsamOgesiId Kaydın kapsam öğesi (B1); `null`/`undefined` ise
 *                      kullanıcının kapsamı.
 * @param sonek   "risk yazma yetkiniz yok" gibi; cümlenin geri kalanı.
 * @param bicim   Terimin çekim hâli; SÖZLÜKTEN okunur, ek üretilmez.
 */
export async function kapsamMesaji(
  k: AktifKullanici, modul: Modul, sonek: string, kapsamOgesiId?: string | null,
  bicim: Bicim = 'tekil',
): Promise<string> {
  return `Bu ${t(await eylemSozlugu(k, modul, kapsamOgesiId), 'tesis', bicim)} kapsamında ${sonek}`;
}

/** Kapsama (ya da kaydın tesisine) göre tesis sözcüğü — serbest cümleler.

    `kapsamMesaji`nin çerçevesi ("Bu … kapsamında …") ailedeki mesajların
    çoğunu karşılıyor, ama HEPSİNİ değil: "Bu <tesiste> zimmet açma
    yetkiniz yok", "<Tesise> bağlı olmayan kayıt", "Bu hesabın <tesisi>
    kapsamınızda değil". Bunlar için çerçeve BAŞINA yardımcı yazmak
    yardımcı enflasyonu olurdu; doğru kapı terimin kendisidir. */
export async function kapsamTerimi(
  k: AktifKullanici, modul: Modul, kapsamOgesiId?: string | null,
  bicim: Bicim = 'tekil',
): Promise<string> {
  return t(await eylemSozlugu(k, modul, kapsamOgesiId), 'tesis', bicim);
}

/** Cümle başındaki hâli. Türkçe büyütme sözlüğün işi (`tBas`): düz
    `toUpperCase` "işletme"yi "ISLETME" yapardı. */
export async function kapsamTerimiBas(
  k: AktifKullanici, modul: Modul = 'yonetim', kapsamOgesiId?: string | null,
  bicim: Bicim = 'tekil',
): Promise<string> {
  return tBas(await eylemSozlugu(k, modul, kapsamOgesiId), 'tesis', bicim);
}

/** Tesis teriminin BÜTÜN hâlleri — çerçevesi standart olmayan cümleler.

    Aile içindeki kapsam yardımcıları (`bulguKapsamiDayat`,
    `varligiAlVeKapsamiDayat` …) mesajı ÇAĞIRANDAN alır, ama tesisi
    KENDİ okur. Çağıran doğru hâli seçebilsin diye mesaj bir işlev
    olarak verilir ve terim ona geçirilir; çağıranın ayrıca veritabanı
    okuması gerekmez. */
export async function eylemTerimi(
  k: AktifKullanici, modul: Modul, kapsamOgesiId?: string | null,
): Promise<Terim> {
  return terim(await eylemSozlugu(k, modul, kapsamOgesiId), 'tesis');
}

/** Sunucu eyleminin okuyacağı sözlük — kayıt tesisi biliniyorsa onunki.

    Bir eylemde BİRDEN ÇOK terim geçiyorsa (zod etiketi + iki mesaj gibi)
    sözlük bir kez okunur ve `t`/`tBas` ile kullanılır; her mesaj için
    ayrı veritabanı okuması yapılmaz. */
export async function eylemSozlugu(
  k: AktifKullanici, modul: Modul, kapsamOgesiId?: string | null,
): Promise<Sozluk | null> {
  return kapsamOgesiId
    ? ogeSozlugu(kapsamOgesiId)
    : kapsamSozlugu(kapsamAnahtari(izinliTesisIdleri(k, modul)));
}

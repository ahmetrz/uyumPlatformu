import 'server-only';

/* P6 · GİRİŞ EKRANININ KURUM HESABI BÖLÜMÜ · SUNUCU VERİSİ

   ── BAĞLI OLMAYAN SAĞLAYICI GÖRÜNMEZ ──────────────────────────────────
   Liste `bagli: true, aktif: true` ile daraltılır. Yarım yapılandırılmış
   bir sağlayıcıyı düğme olarak çizmek, tıklayınca hata veren bir yol
   göstermek olurdu; ürünün kuralı bunun tersidir — bağlanmamış sağlayıcı
   YÖNETİM ekranında "bağlı değil" der, giriş ekranında hiç görünmez.

   ── RET CÜMLELERİ TEK YERDE ───────────────────────────────────────────
   Dönüş ucu `?kimlik=<kod>` ile geri atar. Kodun karşılığı burada durur:
   iki yerde yaşasaydı biri güncellenir, öbürü eski cümleyi göstermeye
   devam ederdi. */

import { db } from '@/lib/db';
import { DEMO } from '@/lib/demo';

export type GirisSaglayicisi = { id: string; ad: string };

export async function girisSaglayicilari(): Promise<GirisSaglayicisi[]> {
  /* Statik demoda veritabanı YOK; sorgu derlemeyi kırardı. */
  if (DEMO) return [];
  try {
    return await db.kimlikSaglayici.findMany({
      where: { bagli: true, aktif: true },
      select: { id: true, ad: true },
      orderBy: { ad: 'asc' },
    });
  } catch {
    /* Göçü uygulanmamış bir kurulumda tablo olmayabilir; giriş ekranı
       bu yüzden çökmez — kurum hesabı bölümü yalnız GÖRÜNMEZ. */
    return [];
  }
}

export const KIMLIK_RET_SOZU: Record<string, string> = {
  bagli_degil: 'Kurum hesabıyla giriş bu kurulumda bağlı değil.',
  yapilandirma: 'Kimlik sağlayıcı yapılandırması eksik — yöneticinize bildirin.',
  akis_yok: 'Giriş isteğinin süresi doldu. Yeniden deneyin.',
  taninmayan: 'Kurum hesabınız doğrulandı ama bu kurulumda bir hesabınız yok.'
    + ' Yöneticinizden hesabınızı açmasını isteyin.',
  kimlik_reddedildi: 'Kurum hesabıyla giriş yapılamadı.',
  /* İz yazılamadıysa oturum AÇILMADI — bu bir hata değil, ürünün "izi
     olmayan oturum açılmaz" kuralının uygulanmasıdır ve kullanıcıya
     böyle söylenir. */
  iz_yazilamadi: 'Giriş kaydedilemedi, bu yüzden oturum açılmadı. Yeniden deneyin;'
    + ' sürerse yöneticinize bildirin.',
};

/** Bilinmeyen kod SESSİZ GEÇMEZ: genel cümle döner, boş dönmez. */
export const kimlikRetCumlesi = (kod: string | null | undefined): string | null => {
  if (!kod) return null;
  return KIMLIK_RET_SOZU[kod] ?? KIMLIK_RET_SOZU.kimlik_reddedildi;
};

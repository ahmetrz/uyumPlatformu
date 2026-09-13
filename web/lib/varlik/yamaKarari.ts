import { surumCozumle } from '@/lib/alan/surum';

/* ═══ OT-21 · Yama durumu TÜRETİLİR ═══════════════════════════════════

   Durum hiçbir yerde kullanıcıdan alınmaz. Alınabilseydi "uyumlu"
   işaretli ama eksik yaması olan bir kayıt üretmek mümkün olurdu ve
   ekranın rakamı kendi verisiyle çelişirdi.

   Sıra bilinçlidir:

     yamalanamaz      Üretici bu cihaz için yama yayımlamıyor. Bu bir
                      uyumsuzluk DEĞİL, kalıcı bir gerçektir; eksik yama
                      listesi dolu olsa bile üstte durur.
     istisna          Boşluk biliniyor ve gerekçesiyle üstlenildi.
     eksik            Bildirilmiş eksik yama var.
     karar_verilemedi Seviyelerden biri okunmamış ya da çözümlenemiyor —
                      bir ÖLÇÜM BORCUDUR, "uyumlu" değil.
     uyumlu           Yukarıdakilerin hiçbiri geçerli değil.

   Bu dosya saftır: sunucu, demo ikizi ve testler AYNI kaynağı okur.
   Kopyalanmış bir ikinci uygulama, iki ortamın sessizce ayrışması
   demekti. */

export type YamaDurumu =
  | 'uyumlu' | 'eksik' | 'yamalanamaz' | 'istisna' | 'karar_verilemedi';

export function yamaDurumuTuret(v: {
  yamalanamaz: boolean; istisnaGerekcesi?: string | null;
  eksikYama?: string | null; mevcutSeviye?: string | null; temelSeviye?: string | null;
}): YamaDurumu {
  if (v.yamalanamaz) return 'yamalanamaz';
  if (v.istisnaGerekcesi) return 'istisna';
  if (v.eksikYama) return 'eksik';
  if (!v.mevcutSeviye || !v.temelSeviye) return 'karar_verilemedi';
  if (!surumCozumle(v.mevcutSeviye) || !surumCozumle(v.temelSeviye)) return 'karar_verilemedi';
  return 'uyumlu';
}

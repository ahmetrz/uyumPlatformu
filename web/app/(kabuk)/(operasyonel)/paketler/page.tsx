import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { db } from '@/lib/db';
import { paketEkranVerisi } from './veri';
import PaketlerIstemci from './PaketlerIstemci';

export const metadata: Metadata = { title: 'İçerik paketleri' };

/* İçerik paketleri — "hangi paket kurulu, hangisi güncel, ne yapabilirim?"
   Kabuk (operasyonel)/layout.tsx'ten gelir; alan Uyum (Regülasyonlar'ın
   yanı: paket regülasyonu GETİRİR, değerlendirmez).

   Bu bir tanım ekranıdır: yetki `tanimlar` modülünden gelir (okuma görür,
   yazma kurar/kaldırır). Kapsam süzgeci YOKTUR — paket kurum geneli bir
   tanımdır; kiracı boyutu P2 ile gelir.

   EKRAN HİÇBİR ÇERÇEVEYİ AKTİFLEŞTİRMEZ. Paket çerçeveyi TASLAK getirir;
   aktifleştirme insan kararıdır ve Regülasyonlar ekranında, sürüm farkı
   görülerek verilir. Kaldırma arşivdir: hiçbir satır silinmez (R-C). */

export default async function Sayfa() {
  const kullanici = await girisZorunlu();
  if (!izinVar(kullanici, 'tanimlar', 'okuma')) return <Yetkisiz rol="tanımlar okuma" />;
  const yazabilir = izinVar(kullanici, 'tanimlar', 'yazma');
  const veri = await paketEkranVerisi(db);
  return <PaketlerIstemci veri={veri} yazabilir={yazabilir} />;
}

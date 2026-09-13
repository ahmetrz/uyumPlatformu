import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import KimlikAyarlariIstemci from './KimlikAyarlariIstemci';
import { kimlikEkranVerisi } from './veri';

export const metadata: Metadata = { title: 'Kimlik ve oturum' };

/* P6 · KİMLİK VE OTURUM — kurum hesabıyla giriş, MFA ve oturum politikası.

   BİRİNCİL İŞ: "kurum hesabıyla giriş açık mı, değilse NEYİ eksik".

   Ekranın sert kuralı: SIR DEĞERİ BURADA GÖRÜNMEZ. Yetkili bir yönetici
   bile istemci sırrını okuyamaz; yalnız sırra giden ADRESİ görür. Aynı
   kural `/saglik` bağlayıcı ekranında da geçerlidir ve gerekçesi orada
   yazılıdır — bir sırrın ekrana inmesi, o sırrın tarayıcı geçmişine,
   ekran görüntüsüne ve destek biletine inmesi demektir.

   Kapı `yonetim/okuma`: kimin içeri girebileceğini belirleyen
   yapılandırma, kurulum genelidir ve tesise kısıtlı bir rol tarafından
   okunmaz. Yazma tarafı `yonetim/onay` ister
   (`lib/eylemler2/kimlikSaglayici.ts`). */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'yonetim', 'okuma')) return <Yetkisiz rol="yönetim okuma" />;
  const veri = await kimlikEkranVerisi();
  return (
    <KimlikAyarlariIstemci veri={veri} yazabilir={izinVar(k, 'yonetim', 'onay')} />
  );
}

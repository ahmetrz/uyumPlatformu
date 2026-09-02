import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/kabuk/temel';
import { db } from '@/lib/db';
import YetkilerIstemci from './YetkilerIstemci';
import type { Hesap } from './mantik';

export const metadata: Metadata = { title: 'Kullanıcı ve yetki' };

/* Kullanıcı & yetki — "kim neye erişiyor, kimin fazlası var?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Yetki yönetimi `yonetim` modülüne tabidir: okuma olmadan ekran açılmaz,
   yazma olmadan kullanıcı kaydı, onay olmadan yetki verilmez/kaldırılmaz
   (lib/eylemler.ts aynı kapıları sunucu tarafında da uygular).

   Santral seçenekleri VERİ seviyesinde daraltılır: yetkisi tesise kısıtlı
   bir yönetici, kapsamı dışındaki santral için yetki öneremez.

   KULLANICI LİSTESİ ise BİLEREK kapsamsızdır, çünkü `Kullanici` bir santral
   kaydı değil kurum kaydıdır ve bu ekranın sorusu tam olarak "kimin fazla
   yetkisi var" — bir kullanıcıyı santraline göre gizlemek, aynı kişinin
   başka santraldeki yetkisini de gizlerdi ve ekran kendi sorusunu
   yanıtlayamaz hâle gelirdi. Daraltılan şey ATANABİLİR kapsamdır, görünen
   kişi kümesi değil. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'yonetim', 'okuma')) return <Yetkisiz rol="yönetim okuma" />;

  const izinli = izinliTesisIdleri(k, 'yonetim');

  const [kullanicilar, surecler, tesisler] = await Promise.all([
    db.kullanici.findMany({
      include: {
        yetkiler: {
          include: { surec: { include: { regulasyon: true } }, tesis: true },
        },
      },
      orderBy: { adSoyad: 'asc' },
    }),
    db.uyumSureci.findMany({
      where: { durum: { in: ['aktif', 'planlandi'] } },
      include: { regulasyon: true },
      orderBy: { kod: 'asc' },
    }),
    db.tesis.findMany({ where: { durum: 'aktif' }, orderBy: { kod: 'asc' } }),
  ]);

  const hesaplar: Hesap[] = kullanicilar.map((u) => ({
    id: u.id,
    ad: u.adSoyad,
    eposta: u.eposta,
    unvan: u.unvan,
    aktif: u.aktif,
    // Özet istemciye İNMEZ; yalnız "tanımlı mı" bilgisi gider.
    parolaVar: u.parolaHash !== null,
    yetkiler: u.yetkiler.map((y) => ({
      id: y.id,
      rol: y.rol,
      surec: y.surec
        ? { id: y.surec.id, kod: y.surec.kod, regKod: y.surec.regulasyon.kod }
        : null,
      tesis: y.tesis ? { id: y.tesis.id, kod: y.tesis.kod, ad: y.tesis.ad } : null,
    })),
  }));

  const verilebilirTesisler = (izinli === null ? tesisler : tesisler.filter((t) => izinli.includes(t.id)))
    .map((t) => ({ id: t.id, ad: `${t.kod} — ${t.ad}` }));

  return (
    <YetkilerIstemci
      hesaplar={hesaplar}
      surecler={surecler.map((s) => ({ id: s.id, ad: `${s.regulasyon.kod} · ${s.kod}` }))}
      tesisler={verilebilirTesisler}
      yazabilir={izinVar(k, 'yonetim', 'yazma')}
      onaylayabilir={izinVar(k, 'yonetim', 'onay')}
      kisitliKapsam={izinli !== null}
    />
  );
}

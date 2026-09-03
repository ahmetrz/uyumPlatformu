import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { modulYazabilir } from '@/app/kapsam';
import { Yetkisiz } from '@/components/kabuk/temel';
import { db } from '@/lib/db';
import YetkilerIstemci from './YetkilerIstemci';
import type { Ekip, Hesap } from './mantik';

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

  /* OT-09 · devir kapsamı ERİŞİM kapsamından ayrıdır: yetki ekranı
     `yonetim` modülüne tabidir ama sahiplik devri `envanter/onay` ister
     ve kendi santral kapsamına bakar. İkisini tek `izinli` üzerinden
     yürütmek, yönetim yetkisi olan birine envanterde yetkisi olmayan
     santralin varlıklarını devrettirirdi. */
  const envanterKapsami = izinliTesisIdleri(k, 'envanter');
  /* KABA kapı: "onay verebildiğin bir santral var mı". `izinVar(...)`
     kapsamsız sorulsaydı tesise kısıtlı bir yönetici KENDİ santralinin
     varlıklarını da devredemezdi — sunucu ona izin verirken ekran
     düğmeyi gizlerdi. Satır kararı zaten `kapsamda()` ile ayrıca
     veriliyor. */
  const devredebilir = modulYazabilir(k, 'envanter', 'onay');

  const [kullanicilar, surecler, tesisler, ekipler, sahiplikler] = await Promise.all([
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
    /* Ekip listesi BİLEREK kapsamsız okunur — kurumsal (santralsiz)
       ekipler de burada görünür. Daraltılan şey DÜZENLEME kapsamıdır:
       `ekipKaydet` ekibin santralini ayrıca sorar. */
    db.ekip.findMany({
      include: {
        uyeler: {
          include: { kullanici: { select: { id: true, adSoyad: true, aktif: true } } },
        },
        tesis: { select: { ad: true } },
        _count: { select: { varliklar: true } },
      },
      orderBy: { kod: 'asc' },
    }),
    /* Sahiplik yükü: kim kaç varlığın sahibi/emanetçisi. Sayım
       KAPSAMSIZ (kişinin gerçek yükü), devredilebilir liste ise
       envanter onay kapsamıyla süzülür. */
    db.varlik.findMany({
      where: { silindi: null, OR: [{ sahipId: { not: null } }, { emanetciId: { not: null } }] },
      select: { id: true, sahipId: true, emanetciId: true, tesisId: true },
    }),
  ]);

  const sahipVarliklari = new Map<string, { id: string; tesisId: string | null }[]>();
  const emanetSayisi = new Map<string, number>();
  for (const v of sahiplikler) {
    if (v.sahipId) {
      const liste = sahipVarliklari.get(v.sahipId) ?? [];
      liste.push({ id: v.id, tesisId: v.tesisId });
      sahipVarliklari.set(v.sahipId, liste);
    }
    if (v.emanetciId) {
      emanetSayisi.set(v.emanetciId, (emanetSayisi.get(v.emanetciId) ?? 0) + 1);
    }
  }

  /* Devredilebilir küme: onay yetkisi YOKSA boştur (sayı yine görünür —
     "devredilecek bir şey yok" ile "devretme yetkin yok" farklı şeylerdir
     ve ekran ikisini ayrı yazar). */
  const kapsamda = (tesisId: string | null) =>
    devredebilir && (envanterKapsami === null
      || (tesisId !== null && envanterKapsami.includes(tesisId)));

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
    sahiplik: {
      toplam: sahipVarliklari.get(u.id)?.length ?? 0,
      emanet: emanetSayisi.get(u.id) ?? 0,
      devredilebilir: (sahipVarliklari.get(u.id) ?? [])
        .filter((v) => kapsamda(v.tesisId)).map((v) => v.id),
    },
  }));

  const ekipListesi: Ekip[] = ekipler.map((e) => ({
    id: e.id, kod: e.kod, ad: e.ad, tip: e.tip,
    tesisId: e.tesisId, tesisAd: e.tesis?.ad ?? null,
    eposta: e.eposta, aktif: e.aktif,
    uyeler: e.uyeler.map((u) => ({
      kullaniciId: u.kullaniciId, ad: u.kullanici.adSoyad,
      rol: u.rol, aktif: u.kullanici.aktif,
    })),
    varlikSayisi: e._count.varliklar,
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
      ekipler={ekipListesi}
      ekipTesisleri={tesisler.map((t) => ({ id: t.id, ad: `${t.kod} — ${t.ad}` }))}
      ekipYonetebilir={izinVar(k, 'tanimlar', 'onay')}
      devredebilir={devredebilir}
    />
  );
}

import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/abacus/temel';
import { db } from '@/lib/db';
import { kapsamda } from '@/app/kapsam';
import BildirimlerIstemci from './BildirimlerIstemci';
import { kutuKapisiAcik, type BildirimSatiri, type KaynakHali } from './mantik';

export const metadata: Metadata = { title: 'Bildirimler — Abacus' };

/* O25 · Bildirim kutusu.

   VAR OLMA SEBEBİ (denetim bulgusu #11): `lib/motorlar/sonTarih.ts:36` her
   koşuda `Bildirim` satırı yazıyordu; hiçbir ekran `db.bildirim` OKUMUYOR,
   `bildirimOkundu` hiçbir yerden ÇAĞRILMIYORDU. Yani motor "bulgunun hedef
   tarihi geçti" diye uyarı üretiyor, uyarı kimseye ulaşmıyor ve tablo tek
   yönlü büyüyordu. Bu ekran o uyarının varış noktasıdır.

   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   ─ İKİ AYRI SINIR, KARIŞTIRILMAZ ────────────────────────────────────────

   1. KUTU SAHİPLİĞİ: sorgu `kullaniciId: k.id` ile daraltılır. Bu bir
      filtre değil, sınırdır — başka bir kullanıcının bildirimi bu ekrana
      hiç gelmez. Yazma tarafında aynı sınırı `lib/eylemler2/bildirim.ts`
      `updateMany({ where: { id, kullaniciId: k.id } })` ile uygular:
      başkasının bildirimini okundu işaretleme denemesi HİÇBİR SATIR
      GÜNCELLEMEZ (tests/bildirim-kutusu.test.ts bunu dondurur).

   2. KAYNAK KAPSAMI: bildirimin işaret ettiği KAYIT bir santrale ait
      olabilir. Bildirim kullanıcıya yazıldığı için listeden düşürülmez,
      ama kayda giden bağ `izinliTesisIdleri` ile denetlenir. Yetki
      bildirim yazıldıktan SONRA daraltılmış olabilir; o durumda kullanıcı
      uyarıyı görür, kaydı göremez ve ekran bunu açıkça yazar.

   Modül kapısı `uyum` okuma iznidir ve `mantik.ts → kutuKapisiAcik` ile
   kurulur — `izinVar(k, 'uyum', 'okuma')` ile DEĞİL. Gerekçe o fonksiyonun
   başında yazılı: `izinVar` kapsamsız bir işlem sorar ve santrale kısıtlı
   yetkiyi geçirmez; oysa bildirimi asıl alanlar (bir santralin bulgu ve
   aksiyon sorumluları) tam da santrale kısıtlı kullanıcılardır. `izinVar`
   kapısı, uyarıyı gönderdiğimiz insanları kutudan dışarıda bırakırdı. */

/** Kutu tavanı — en yeni bu kadar bildirim okunur (tek yönlü büyüyen tablo). */
const TAVAN = 200;

/** Kaynak türü → kaydın santrali ve (varsa) ekran yolu.
    Santral taşımayan tür `tesisId: undefined` döner: kapsam dışı DEĞİL,
    santral kavramı olmayan kayıt demektir. */
type Cozum = { tesisId: string | null | undefined; yol: string | null };

export default async function Sayfa() {
  /* Sunucu saati BİR KEZ, render'dan önce okunur. "Kaç gündür okunmadı"
     sorusunun cevabı tek bir andan türemeli; istemci kendi saatini
     kullansaydı iki makinede iki farklı sayı görünürdü. */
  const simdi = new Date().getTime();
  const k = await girisZorunlu();
  const gorulebilir = izinliTesisIdleri(k, 'uyum');
  if (!kutuKapisiAcik(gorulebilir)) return <Yetkisiz rol="uyum okuma" />;

  const ham = await db.bildirim.findMany({
    where: { kullaniciId: k.id },
    orderBy: { olusturuldu: 'desc' },
    take: TAVAN,
  });

  /* Kaynak kayıtların santrali TÜRE GÖRE TEK SORGUDA çözülür (N+1 yok).
     Motorun bildirim yazdığı türler: Bulgu, Aksiyon, Sertifika, Risk
     (`lib/motorlar/sonTarih.ts`). Listede olmayan bir tür gelirse kaynak
     "bilinmiyor" kalır — uydurma bir santral atanmaz. */
  const idler = (tip: string) => [...new Set(ham
    .filter((b) => b.kaynakTipi === tip && b.kaynakId)
    .map((b) => b.kaynakId as string))];

  const [bulgular, aksiyonlar, riskler, sertifikalar] = await Promise.all([
    idler('Bulgu').length
      ? db.bulgu.findMany({
        where: { id: { in: idler('Bulgu') } },
        select: { id: true, maddeDurumu: { select: { tesisId: true } } },
      })
      : Promise.resolve([]),
    idler('Aksiyon').length
      ? db.aksiyon.findMany({
        where: { id: { in: idler('Aksiyon') } },
        select: { id: true, bulguId: true,
          bulgu: { select: { maddeDurumu: { select: { tesisId: true } } } } },
      })
      : Promise.resolve([]),
    idler('Risk').length
      ? db.risk.findMany({
        where: { id: { in: idler('Risk') } }, select: { id: true, tesisId: true },
      })
      : Promise.resolve([]),
    idler('Sertifika').length
      ? db.sertifika.findMany({
        where: { id: { in: idler('Sertifika') } },
        select: { id: true, varlik: { select: { tesisId: true } } },
      })
      : Promise.resolve([]),
  ]);

  const cozumler = new Map<string, Cozum>();
  for (const b of bulgular) {
    cozumler.set(`Bulgu:${b.id}`, { tesisId: b.maddeDurumu.tesisId, yol: `/bulgular/${b.id}` });
  }
  for (const a of aksiyonlar) {
    // Aksiyonun kendi ekranı yok; bağlı bulgusunun kaydına götürülür.
    cozumler.set(`Aksiyon:${a.id}`, {
      tesisId: a.bulgu.maddeDurumu.tesisId, yol: `/bulgular/${a.bulguId}`,
    });
  }
  for (const r of riskler) {
    cozumler.set(`Risk:${r.id}`, { tesisId: r.tesisId, yol: `/riskler/${r.id}` });
  }
  for (const s of sertifikalar) {
    // Sertifikanın tekil kayıt ekranı yok; ömür tezgâhı listeler.
    cozumler.set(`Sertifika:${s.id}`, { tesisId: s.varlik?.tesisId ?? null, yol: '/omur' });
  }

  const tesisIdleri = [...new Set(
    [...cozumler.values()].map((c) => c.tesisId).filter((t): t is string => !!t))];
  const tesisler = tesisIdleri.length
    ? await db.tesis.findMany({
      where: { id: { in: tesisIdleri } }, select: { id: true, kod: true } })
    : [];
  const tesisKodu = new Map(tesisler.map((t) => [t.id, t.kod]));

  const satirlar: BildirimSatiri[] = ham.map((b) => {
    const c = b.kaynakTipi && b.kaynakId
      ? cozumler.get(`${b.kaynakTipi}:${b.kaynakId}`)
      : undefined;

    /* Üç hâl, üç ayrı anlam:
       · çözüm yok            → kaynak silinmiş ya da tür tanınmıyor: BİLİNMİYOR
       · çözüldü, kapsamda    → bağ verilir
       · çözüldü, kapsam dışı → satır kalır, bağ verilmez */
    let hal: KaynakHali = 'bilinmiyor';
    if (c && c.tesisId !== undefined) {
      hal = kapsamda(gorulebilir, c.tesisId) ? 'kapsamda' : 'kapsamDisi';
    }

    return {
      id: b.id,
      baslik: b.baslik,
      govde: b.govde,
      tip: b.tip,
      kaynakTipi: b.kaynakTipi,
      kaynakId: b.kaynakId,
      okundu: b.okundu?.toISOString() ?? null,
      olusturuldu: b.olusturuldu.toISOString(),
      kaynakHali: hal,
      kaynakYolu: hal === 'kapsamda' ? c?.yol ?? null : null,
      tesisKodu: hal === 'kapsamda' && c?.tesisId
        ? tesisKodu.get(c.tesisId) ?? null
        : null,
    };
  });

  return (
    <BildirimlerIstemci
      satirlar={satirlar}
      tavan={TAVAN}
      simdi={simdi}
    />
  );
}

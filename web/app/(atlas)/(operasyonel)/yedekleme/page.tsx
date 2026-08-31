import type { Metadata } from 'next';
import { girisZorunlu, izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { Yetkisiz } from '@/components/atlas/temel';
import { db } from '@/lib/db';
import { tesisYedekGorunumu } from '@/lib/entegrasyon/konfigYedek';
import { YEDEK_KURALLARI } from '@/lib/motorlar/yedekDogrulama';
import YedeklemeIstemci from './YedeklemeIstemci';
import type { Politika, Santral, TurKirilimi, YedekBulgusu } from './mantik';

export const metadata: Metadata = { title: 'Yedekleme & kurtarma — Atlas' };

/* O14 · Yedekleme & DR hazırlığı — "kurtarabilir miyiz?" (03-screens O14).
   Yerleşim kabuğu (.atlas atlas-kabuk + Ray) (operasyonel)/layout.tsx'ten
   gelir; bu sayfa yalnız <main> ve seçim varsa <aside class="cekmece">
   render eder — UstCubuk ya da .icerik sarmalayıcısı YOK.

   ── YARGIYI SAYFA VERMEZ ────────────────────────────────────────────
   Santral katmanı (politika → koşu → geri yükleme testi) ve varlık
   katmanı (kritik varlıkların konfigürasyon yedeği)
   `lib/entegrasyon/konfigYedek.ts → tesisYedekGorunumu()` tarafından
   ÜRETİLİR. Sayfa onu yalnız serileştirir. Önceki sürüm aynı soruyu ham
   `db` sorgusuyla ikinci kez cevaplıyordu: yazılmış özet kullanılmıyordu
   ve iki cevap sessizce ayrışabiliyordu. Kalan tek yerel türetme envanter
   BEYANI (`Varlik.yedekDurumu`) üzerindeki kapsama barıdır — o bir ölçüm
   değil, ayrı bir sorudur ("insan ne diyor") ve ekranda öyle etiketlenir.

   ── KAPSAM ──────────────────────────────────────────────────────────
   Santraller kullanıcının envanter kapsamıyla daraltılır. Daha önce
   `girisZorunlu()` dışında hiçbir kapsam yoktu: tek santrale yetkili bir
   kullanıcı bütün filonun DR hazırlığını görebiliyordu. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'envanter', 'okuma')) return <Yetkisiz rol="envanter okuma" />;

  const izinli = izinliTesisIdleri(k, 'envanter');

  const [tesisler, varliklar, turAdlari, politikalar, hamBulgular] = await Promise.all([
    db.tesis.findMany({
      where: { durum: 'aktif', ...(izinli === null ? {} : { id: { in: izinli } }) },
      select: { id: true, kod: true, ad: true, tip: { select: { kod: true } } },
      orderBy: { kod: 'asc' },
    }),
    db.varlik.findMany({
      where: {
        silindi: null,
        ...(izinli === null ? { tesisId: { not: null } } : { tesisId: { in: izinli } }),
      },
      select: {
        id: true, etiket: true, ad: true, tesisId: true, kritiklik: true, yedekDurumu: true,
        /* Tür ilişki olarak çekilmez: Prisma `VarlikTuru.id IN (…)` sorgusunu
           999'luk parçalara böler, 10.000 varlıkta 10 ek sorgu (~19ms) eder —
           tablo ise 11 satırdır. Aşağıda bir kez okunup eşlenir. */
        turId: true,
      },
      orderBy: { etiket: 'asc' },
    }),
    db.varlikTuru.findMany({ select: { id: true, ad: true } }),
    db.yedeklemePolitikasi.findMany({
      include: { kosular: { orderBy: { zaman: 'desc' }, select: { id: true, durum: true } } },
    }),
    /* Yedek doğrulama motorunun ürettiği AÇIK veri kalitesi bulguları.
       Motor bunları kendisi kapatamaz; `yedekBulgusunuIsle` insan kapısıdır.
       Süzgeç motorun SABİTİNİ kullanır, önek değil: kuralların ikincisi
       `yedegi_bilinmeyen_kritik_varlik` ve 'yedek' önekiyle EŞLEŞMEZ —
       önekle süzen bir liste ölçüm boşluğu bulgularını hiç göstermezdi. */
    db.veriKalitesiBulgusu.findMany({
      where: { durum: 'acik', kural: { in: Object.values(YEDEK_KURALLARI) } },
      orderBy: { olusturuldu: 'desc' },
    }),
  ]);

  const turHaritasi = new Map(turAdlari.map((x) => [x.id, x.ad]));

  /* Politika ↔ santral bağı şemada yabancı anahtarla değil, politika ADINDA
     kurulmuş (`${tesis.ad} — kontrol sistemi yedeklemesi`). `kapsam` alanı
     ayırt edici değil — santrallerin çoğunda aynı metin. Bu yüzden ad
     önekiyle eşleştiriyoruz; ÖNCE UZUN ADLAR denenir ki "Kızıldere I JES"
     kendinden uzun adlı "Kızıldere II JES"in politikasını kapmasın. Eşleşen
     politika havuzdan düşer, iki santral aynı kaydı paylaşamaz.

     `tesisYedekGorunumu` bu kırılgan eşlemeyi bilerek TEKRARLAMIYOR —
     hangi politikanın kastedildiğini çağıran söyler. Eşleme bu yüzden
     burada, tek yerde kalıyor. */
  const havuz = new Set(politikalar);
  const politikaHaritasi = new Map<string, (typeof politikalar)[number]>();
  for (const t of [...tesisler].sort((a, b) => b.ad.length - a.ad.length)) {
    for (const p of havuz) {
      if (p.ad.startsWith(t.ad)) { politikaHaritasi.set(t.id, p); havuz.delete(p); break; }
    }
  }

  /* Bulgu → santral eşlemesi varlık üzerinden kurulur (motor `kaynakId`ye
     varlık kimliği yazar). Kapsam dışı varlığa asılı bir bulgu hiçbir
     santrale düşmez ve ekranda görünmez. */
  const varlikTesisi = new Map(varliklar.map((v) => [v.id, v.tesisId]));
  const bulguHaritasi = new Map<string, YedekBulgusu[]>();
  for (const b of hamBulgular) {
    const tesisId = b.kaynakTipi === 'Varlik' ? varlikTesisi.get(b.kaynakId) ?? null : null;
    if (!tesisId) continue;
    const liste = bulguHaritasi.get(tesisId) ?? [];
    liste.push({
      id: b.id, kural: b.kural, aciklama: b.aciklama,
      olusturuldu: b.olusturuldu.toISOString(),
    });
    bulguHaritasi.set(tesisId, liste);
  }

  const santraller: Santral[] = await Promise.all(tesisler.map(async (t) => {
    const kendi = varliklar.filter((v) => v.tesisId === t.id);

    // Tür bazında kırılım — kapsama barının popover'ı ve çekmece bunu kullanır.
    const turler = new Map<string, TurKirilimi>();
    for (const v of kendi) {
      const ad = turHaritasi.get(v.turId) ?? 'Tür girilmemiş';
      const g = turler.get(ad) ?? { ad, yedekli: 0, bilinmeyen: 0, toplam: 0 };
      g.toplam += 1;
      if (v.yedekDurumu === 'var') g.yedekli += 1;
      else if (v.yedekDurumu === 'bilinmiyor') g.bilinmeyen += 1;
      turler.set(ad, g);
    }

    const ham = politikaHaritasi.get(t.id) ?? null;
    const politika: Politika | null = ham && {
      id: ham.id, ad: ham.ad, kapsam: ham.kapsam, siklik: ham.siklik,
      saklamaGun: ham.saklamaGun, hedef: ham.hedef,
      rpoSaat: ham.rpoSaat, rtoSaat: ham.rtoSaat, haricTutulan: ham.haricTutulan,
    };

    // İKİ KATMANIN TEK KAYNAĞI. Ekran burada yalnız serileştirir.
    const gorunum = await tesisYedekGorunumu(t.id, ham?.id);

    const kosular = ham?.kosular ?? [];

    return {
      id: t.id, kod: t.kod, ad: t.ad, tip: t.tip?.kod ?? null,
      toplam: kendi.length,
      yedekli: kendi.filter((v) => v.yedekDurumu === 'var').length,
      yedeksiz: kendi.filter((v) => v.yedekDurumu === 'yok').length,
      bilinmeyen: kendi.filter((v) => v.yedekDurumu === 'bilinmiyor').length,
      kirilim: [...turler.values()].sort((a, b) =>
        (a.yedekli / a.toplam) - (b.yedekli / b.toplam) || a.ad.localeCompare(b.ad, 'tr')),
      politika,
      kosuOzeti: {
        basarili: kosular.filter((x) => x.durum === 'basarili').length,
        kismi: kosular.filter((x) => x.durum === 'kismi').length,
        basarisiz: kosular.filter((x) => x.durum === 'basarisiz').length,
      },
      sonKosuId: kosular[0]?.id ?? null,
      santralKatmani: {
        bagli: gorunum.santralKatmani.bagli,
        gerekce: gorunum.santralKatmani.gerekce,
        politikaAdi: gorunum.santralKatmani.politikaAdi,
        sonKosu: gorunum.santralKatmani.sonKosu && {
          zaman: gorunum.santralKatmani.sonKosu.zaman.toISOString(),
          durum: gorunum.santralKatmani.sonKosu.durum,
          hata: gorunum.santralKatmani.sonKosu.hata,
        },
        sonRestoreTesti: gorunum.santralKatmani.sonRestoreTesti && {
          zaman: gorunum.santralKatmani.sonRestoreTesti.zaman.toISOString(),
          sonuc: gorunum.santralKatmani.sonRestoreTesti.sonuc,
          sureDk: gorunum.santralKatmani.sonRestoreTesti.sureDk,
        },
      },
      varlikKatmani: {
        kaynakBagli: gorunum.varlikKatmani.kaynakBagli,
        yedeksiz: gorunum.varlikKatmani.yedeksiz.map((v) => ({
          varlikId: v.varlikId, etiket: v.etiket, ad: v.ad, kritiklik: v.kritiklik,
          beyan: v.beyan, kayitSayisi: v.kayitSayisi, gerekce: v.gerekce,
        })),
        bilinmeyen: gorunum.varlikKatmani.bilinmeyen.map((v) => ({
          varlikId: v.varlikId, etiket: v.etiket, ad: v.ad, kritiklik: v.kritiklik,
          beyan: v.beyan, kayitSayisi: v.kayitSayisi, gerekce: v.gerekce,
        })),
        yedegiVar: gorunum.varlikKatmani.yedegiVar,
        toplamKritik: gorunum.varlikKatmani.toplamKritik,
      },
      celiskiler: gorunum.celiskiler,
      // Motorun açıklaması varlık etiketiyle başlar; kısaltılmaz —
      // gerekçenin tamamı denetimde okunacak metindir.
      bulgular: bulguHaritasi.get(t.id) ?? [],
      // Görev açma uyum/yazma ister ve tesis kapsamına tabidir (lib/erisim).
      planlanabilir: izinVar(k, 'uyum', 'yazma', { tesisId: t.id }),
      yazabilir: izinVar(k, 'envanter', 'yazma', { tesisId: t.id }),
      // Veri kalitesi bulgusu yönetim/yazma ister (yedekBulgusunuIsle kapısı).
      bulguIsleyebilir: izinVar(k, 'yonetim', 'yazma'),
    };
  }));

  return (
    <YedeklemeIstemci santraller={santraller} politikaSayisi={politikalar.length} />
  );
}

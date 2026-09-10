import type { Metadata } from 'next';
import { girisZorunlu, izinliTesisIdleri } from '@/lib/erisim';
import { db } from '@/lib/db';
import { kopruKosulu } from '@/app/kapsam';
import { Yetkisiz } from '@/components/kabuk/temel';
import { KAPSAM_DISI_DURUMU } from '@/lib/denetim/formVerisi';
import { sablonOrtusmesi, type Sablon } from '@/lib/denetim/sablonDoldurma';
import DenetimFormlariIstemci, {
  type FormSatiriOzeti, type SablonOzeti,
} from './DenetimFormlariIstemci';

export const metadata: Metadata = { title: 'Denetim formları' };

/* DENETİM FORMLARI (R12) — öz denetim formu ve uygulanabilirlik beyanı.

   BİRİNCİL İŞ: denetçiye verilecek formu, KUSURUNU GÖREREK üretmek.

   Ekranın ilk üç saniyede cevapladığı soru "hangi kapsamda kaç kontrol
   var" DEĞİL: "bu formu denetçiye verirsem hangi soruyla karşılaşırım".
   O soru gerekçesiz kapsam-dışı kararıdır ve listede ADIYLA durur —
   üretimden sonra bir uyarı balonunda değil, üretimden ÖNCE satırda.

   Kapsam VERİ seviyesinde daraltılır: `izinliTesisIdleri` dışındaki
   kapsam bu listeye HİÇ girmez. Ekranda gösterip eylemde reddetmek,
   kullanıcıya var olmayan bir düğme göstermek olurdu. Dış denetçi de
   buradan geçer: daveti `yetkileriAc` ile yetki satırı açar, liste onu
   okur ve denetçi yalnız kendi kapsamını görür. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  const izinli = izinliTesisIdleri(k, 'denetim');
  if (izinli !== null && izinli.length === 0) return <Yetkisiz rol="denetim okuma" />;

  const satirlar = await db.maddeDurumu.findMany({
    where: kopruKosulu(izinli),
    select: {
      durum: true,
      not: true,
      kapsamOgesi: { select: { id: true, ad: true, tesisId: true } },
      surec: { select: { regulasyon: { select: { id: true, kod: true, ad: true } } } },
    },
  });

  /* Kapsam öğesi × çerçeve kırılımı. Sayılar BURADA çıkar: ekran kendi
     saymaz, sunucudan sayılmış gelir — iki yerde sayan bir sayı, bir gün
     iki farklı cevap verir. */
  const kova = new Map<string, FormSatiriOzeti>();
  for (const s of satirlar) {
    const reg = s.surec.regulasyon;
    /* Köprüsüz öğe forma giremez: form TESİS kapsamıyla yetkilendirilir
       ve tesise bağlanmayan öğe o yetkinin dışındadır. */
    if (s.kapsamOgesi.tesisId === null) continue;
    const anahtar = `${s.kapsamOgesi.id}|${reg.id}`;
    const mevcut = kova.get(anahtar) ?? {
      anahtar,
      tesisId: s.kapsamOgesi.tesisId,
      kapsamAd: s.kapsamOgesi.ad,
      regulasyonId: reg.id,
      regulasyonKod: reg.kod,
      regulasyonAd: reg.ad,
      madde: 0,
      kapsamDisi: 0,
      gerekcesizKapsamDisi: 0,
      degerlendirilmedi: 0,
    };
    mevcut.madde += 1;
    if (s.durum === KAPSAM_DISI_DURUMU) {
      mevcut.kapsamDisi += 1;
      /* Gerekçe `not` alanındadır ve boşluktan ibaret olması da
         gerekçesizliktir — form katmanıyla AYNI kural. */
      if (s.not === null || s.not.trim() === '') mevcut.gerekcesizKapsamDisi += 1;
    }
    if (s.durum === 'degerlendirilmedi') mevcut.degerlendirilmedi += 1;
    kova.set(anahtar, mevcut);
  }

  const liste = [...kova.values()].sort((a, b) => (
    /* Kusurlu satır ÜSTTE: ekranın cevapladığı soru "en önemli sorun
       hangisi" ve o soru sıralamayla cevaplanır. */
    b.gerekcesizKapsamDisi - a.gerekcesizKapsamDisi
    || a.kapsamAd.localeCompare(b.kapsamAd, 'tr')
    || a.regulasyonKod.localeCompare(b.regulasyonKod, 'tr')
  ));

  /* PAKET FORM ŞABLONLARI. Çekirdeğin iki formu (öz denetim · SoA) her
     kurulumda vardır; düzenleyicinin formu paketten gelir ve YALNIZ kurulu
     olduğu kurulumda görünür — enerji kiracısı EPDK şablonunu görür,
     bankacılık kiracısı görmez. Pasif şablon listeye girmez: paket
     güncellemesiyle geri çekilmiş bir soruyu doldurulabilir göstermek,
     bugünün verisiyle dünün sorusunu cevaplamak olurdu. */
  const sablonKayitlari = await db.formSablonu.findMany({
    where: { aktif: true },
    select: { kod: true, ad: true, tanimJson: true, sektor: { select: { ad: true } } },
    orderBy: { kod: 'asc' },
  });

  const cozulen = sablonKayitlari.map((r) => {
    try {
      return { r, sablon: JSON.parse(r.tanimJson) as Sablon };
    } catch {
      /* Okunamayan şablon GİZLENMEZ: kataloğa girmiş ama tanımı bozuk bir
         şablon, olmayan bir şablondan farklı bir kusurdur ve ekranda
         adıyla durur. */
      return { r, sablon: null };
    }
  });

  /* Şablonun bağlı olduğu kontroller KURULUMDA var mı — tek sorguda.
     Bu sayı kapsamdan değil KURULUMDAN gelir: şablon ile paketin
     ayrışması kapsam seçiminden önce olur. */
  const referanslar = [...new Set(cozulen.flatMap(({ sablon }) => (sablon === null ? []
    : sablon.bolumler.flatMap((b) => b.alanlar.map((a) => a.maddeKod ?? '').filter(Boolean)))))];
  const kuruluMaddeler = referanslar.length === 0 ? [] : await db.madde.findMany({
    where: { kod: { in: referanslar } }, select: { kod: true },
  });
  const kuruluKodlar = new Map(kuruluMaddeler.map((m) => [m.kod, true]));

  const sablonlar: SablonOzeti[] = cozulen.map(({ r, sablon }) => {
    if (sablon === null) {
      return {
        kod: r.kod, ad: r.ad, sektorAd: r.sektor?.ad ?? null, okunamadi: true,
        alan: 0, bagli: 0, baglanmadi: 0, sayim: 0, serbest: 0,
      };
    }
    const o = sablonOrtusmesi(sablon, kuruluKodlar);
    return { kod: r.kod, ad: r.ad, sektorAd: r.sektor?.ad ?? null, okunamadi: false, ...o };
  });

  return (
    <DenetimFormlariIstemci
      satirlar={liste}
      sablonlar={sablonlar}
      kisitliKapsam={izinli !== null}
    />
  );
}

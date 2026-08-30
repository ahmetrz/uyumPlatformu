import 'server-only';
import { db } from '../db';
import { tarihTR } from '../sabitler';

/* Gap-to-action motoru (§21): uyum açığını proje ÖNERİSİNE çevirir.
   Kaynaklar: (a) 'uyumsuz' + kritik/yüksek bulgulu madde durumları,
   (b) destek sonu (EOS) geçmiş kritik varlıklar, (c) tekrar eden açık bulgular.
   Gerekçe alanına karar zinciri yazılır (madde → tesis → bulgu → risk).
   İNSAN ONAYI OLMADAN projeye dönüşmez: aday YALNIZ 'oneri' durumunda üretilir;
   dönüşüm kararını proje ekranında insan verir. */

type AdayGirdisi = {
  baslik: string; gerekce: string; kaynak: string;
  kaynakRef: string; tesisId: string | null;
};

/** Duplicate önleme: aynı (kaynak, kaynakRef) için daha önce üretilmiş aday
    varsa — öneri, onaylı, reddedilmiş ya da projeye dönüşmüş — yenisi
    açılmaz; insan kararının üzerine yazılmaz. */
async function adayGuvenceyeAl(g: AdayGirdisi): Promise<number> {
  const mevcut = await db.projeAdayi.findFirst({
    where: { kaynak: g.kaynak, kaynakRef: g.kaynakRef } });
  if (mevcut) return 0;
  await db.projeAdayi.create({ data: { ...g, durum: 'oneri' } });
  return 1;
}

export async function gapAksiyonIsle(): Promise<{ islenen: number; uretilen: number }> {
  const simdi = new Date();
  let islenen = 0, uretilen = 0;

  // (a) 'uyumsuz' durumda VE kritik/yüksek önemde açık bulgusu olan madde durumları
  const kritikBulguFiltresi = {
    silindi: null, durum: { in: ['acik', 'aksiyonda'] },
    onemDerecesi: { in: ['kritik', 'yuksek'] },
  };
  const gapler = await db.maddeDurumu.findMany({
    where: { durum: 'uyumsuz', bulgular: { some: kritikBulguFiltresi } },
    include: {
      madde: { select: { kod: true } },
      tesis: { select: { kod: true } },
      bulgular: {
        where: kritikBulguFiltresi,
        orderBy: { onemDerecesi: 'asc' }, // 'kritik' alfabetik önce gelir
        include: { riskler: { where: { silindi: null },
          select: { kod: true, baslik: true } } },
      },
    },
  });
  for (const md of gapler) {
    islenen++;
    const bulgu = md.bulgular[0];
    if (!bulgu) continue;
    const risk = bulgu.riskler[0];
    uretilen += await adayGuvenceyeAl({
      baslik: `Uyum açığı kapatma: ${md.madde.kod} · ${md.tesis.kod}`,
      gerekce: `${md.madde.kod} ${md.tesis.kod} için uyumsuz; `
        + `${bulgu.onemDerecesi === 'yuksek' ? 'yüksek önemde' : 'kritik'} bulgu: ${bulgu.baslik}`
        + (risk ? `; risk: ${risk.kod} ${risk.baslik}` : ''),
      kaynak: 'regulatory_gap', kaynakRef: md.id, tesisId: md.tesisId,
    });
  }

  // (b) destek sonu (EOS) tarihi geçmiş kritik varlıklar
  const eosVarliklar = await db.varlik.findMany({
    where: { silindi: null, kritiklik: 'kritik', eosTarihi: { lt: simdi } },
    include: { tesis: { select: { kod: true } } },
  });
  for (const v of eosVarliklar) {
    islenen++;
    uretilen += await adayGuvenceyeAl({
      baslik: `EOS yenileme: ${v.etiket} ${v.ad}`,
      gerekce: `${v.etiket} (${v.ad}) için destek sonu ${tarihTR(v.eosTarihi)} tarihinde geçti; `
        + `kritiklik: kritik${v.tesis ? `; tesis: ${v.tesis.kod}` : ''}`
        + ' — yama/güvenlik desteği olmayan kritik varlık yenilenmeli.',
      kaynak: 'eol_eos', kaynakRef: v.id, tesisId: v.tesisId,
    });
  }

  // (c) tekrar eden (tekrarBulguId dolu) açık bulgular
  const tekrarlar = await db.bulgu.findMany({
    where: { silindi: null, durum: { in: ['acik', 'aksiyonda'] }, tekrarBulguId: { not: null } },
    include: {
      maddeDurumu: { include: {
        madde: { select: { kod: true } }, tesis: { select: { kod: true } } } },
      tekrarBulgu: { select: { baslik: true, tespitTarihi: true } },
    },
  });
  for (const b of tekrarlar) {
    islenen++;
    uretilen += await adayGuvenceyeAl({
      baslik: `Tekrar eden bulgu için yapısal çözüm: ${b.baslik}`,
      gerekce: `${b.maddeDurumu.madde.kod} ${b.maddeDurumu.tesis.kod} için tekrar eden bulgu: ${b.baslik}`
        + (b.tekrarBulgu
          ? `; ilk tespit: "${b.tekrarBulgu.baslik}" (${tarihTR(b.tekrarBulgu.tespitTarihi)})`
          : '')
        + ' — düzeltici aksiyon kalıcı olmamış, yapısal proje gerekir.',
      kaynak: 'tekrar_bulgu', kaynakRef: b.id, tesisId: b.maddeDurumu.tesisId,
    });
  }

  return { islenen, uretilen };
}

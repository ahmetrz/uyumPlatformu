import 'server-only';
import { db } from '../db';
import { tarihTR } from '../sabitler';

/* Son tarih (deadline) motoru (§52): yaklaşan/geçen tarihleri tarar,
   her kaynak için açık bir 'son_tarih' görevi güvence altına alır ve ilgili
   sorumluya bildirim yazar. Kaynaklar:
   (a) hedef tarihi 14 gün içinde ya da geçmiş açık bulgular
   (b) hedefi geçmiş açık aksiyonlar
   (c) plan başlangıcı 30 gün içindeki denetimler
   (d) bitişi 30 gün içindeki (ya da geçmiş) sertifikalar
   (e) kabul süresi dolmuş kabul_edildi riskler → durum 'acik'e döner + iz */

const GUN = 86_400_000;

type GorevAdayi = {
  kaynakTipi: string; kaynakId: string; baslik: string;
  sorumluId: string | null; tesisId: string | null; sonTarih: Date | null;
  bildirimGovde: string;
};

/** Açık 'son_tarih' görevi yoksa görev + (sorumlu varsa) bildirim üretir. */
async function gorevGuvenceyeAl(aday: GorevAdayi): Promise<number> {
  const acik = await db.gorev.findFirst({ where: {
    tip: 'son_tarih', kaynakTipi: aday.kaynakTipi, kaynakId: aday.kaynakId,
    durum: { in: ['acik', 'yapiliyor'] },
  } });
  if (acik) return 0;
  await db.gorev.create({ data: {
    baslik: aday.baslik, tip: 'son_tarih',
    kaynakTipi: aday.kaynakTipi, kaynakId: aday.kaynakId,
    sorumluId: aday.sorumluId, tesisId: aday.tesisId,
    sonTarih: aday.sonTarih, otomatikUretildi: true,
  } });
  if (aday.sorumluId) {
    await db.bildirim.create({ data: {
      kullaniciId: aday.sorumluId, baslik: aday.baslik, govde: aday.bildirimGovde,
      tip: 'uyari', kaynakTipi: aday.kaynakTipi, kaynakId: aday.kaynakId,
    } });
  }
  return 1;
}

export async function sonTarihleriIsle(): Promise<{ islenen: number; uretilen: number }> {
  const simdi = new Date();
  const gun14 = new Date(simdi.getTime() + 14 * GUN);
  const gun30 = new Date(simdi.getTime() + 30 * GUN);
  let islenen = 0, uretilen = 0;

  // (a) hedef tarihi 14 gün içinde ya da geçmiş açık bulgular
  const bulgular = await db.bulgu.findMany({
    where: { silindi: null, durum: { in: ['acik', 'aksiyonda'] }, hedefTarih: { lte: gun14 } },
    include: { maddeDurumu: { include: {
      madde: { select: { kod: true } }, tesis: { select: { kod: true } } } } },
  });
  for (const b of bulgular) {
    islenen++;
    const gecti = !!b.hedefTarih && b.hedefTarih < simdi;
    uretilen += await gorevGuvenceyeAl({
      kaynakTipi: 'Bulgu', kaynakId: b.id,
      baslik: `Bulgu hedef tarihi ${gecti ? 'geçti' : 'yaklaşıyor'}: ${b.baslik}`,
      sorumluId: b.sorumluId, tesisId: b.maddeDurumu.tesisId, sonTarih: b.hedefTarih,
      bildirimGovde: `${b.maddeDurumu.madde.kod} · ${b.maddeDurumu.tesis.kod} — hedef: ${tarihTR(b.hedefTarih)}`,
    });
  }

  // (b) hedefi geçmiş açık aksiyonlar
  const aksiyonlar = await db.aksiyon.findMany({
    where: { durum: { in: ['planlandi', 'devam'] }, hedef: { lt: simdi } },
    include: { bulgu: { select: { baslik: true,
      maddeDurumu: { select: { tesisId: true } } } } },
  });
  for (const a of aksiyonlar) {
    islenen++;
    uretilen += await gorevGuvenceyeAl({
      kaynakTipi: 'Aksiyon', kaynakId: a.id,
      baslik: `Aksiyon hedefi geçti: ${a.baslik}`,
      sorumluId: a.sorumluId, tesisId: a.bulgu.maddeDurumu.tesisId, sonTarih: a.hedef,
      bildirimGovde: `"${a.bulgu.baslik}" bulgusunun aksiyonu — hedef: ${tarihTR(a.hedef)}`,
    });
  }

  // (c) plan başlangıcı 30 gün içindeki denetimler (hazırlık görevi)
  const denetimler = await db.denetim.findMany({ where: {
    silindi: null, durum: { not: 'kapanis' },
    planBaslangic: { gte: simdi, lte: gun30 },
  } });
  for (const d of denetimler) {
    islenen++;
    uretilen += await gorevGuvenceyeAl({
      kaynakTipi: 'Denetim', kaynakId: d.id,
      baslik: `Denetim yaklaşıyor: ${d.kod} ${d.ad}`,
      sorumluId: null, tesisId: null, sonTarih: d.planBaslangic,
      bildirimGovde: `Plan başlangıcı: ${tarihTR(d.planBaslangic)}`,
    });
  }

  // (d) bitişi 30 gün içindeki (ya da geçmiş) sertifikalar
  const sertifikalar = await db.sertifika.findMany({
    where: { bitis: { lte: gun30 } },
    include: { varlik: { select: { etiket: true, sahipId: true, tesisId: true } } },
  });
  for (const s of sertifikalar) {
    islenen++;
    const gecti = s.bitis < simdi;
    uretilen += await gorevGuvenceyeAl({
      kaynakTipi: 'Sertifika', kaynakId: s.id,
      baslik: `Sertifika süresi ${gecti ? 'doldu' : 'yaklaşıyor'}: ${s.ad}`,
      sorumluId: s.varlik?.sahipId ?? null, tesisId: s.varlik?.tesisId ?? null,
      sonTarih: s.bitis,
      bildirimGovde: `${s.varlik ? `${s.varlik.etiket} — ` : ''}bitiş: ${tarihTR(s.bitis)}`,
    });
  }

  // (e) kabul süresi dolmuş riskler: durum yeniden 'acik' + iz (kaynak: is_kosusu)
  const riskler = await db.risk.findMany({ where: {
    silindi: null, durum: 'kabul_edildi', kabulBitis: { lt: simdi },
  } });
  for (const r of riskler) {
    islenen++;
    await db.risk.update({ where: { id: r.id }, data: { durum: 'acik' } });
    await db.aktiviteKaydi.create({ data: {
      aktorId: null, varlikTipi: 'Risk', varlikId: r.id,
      eylem: 'durum_degisimi', alan: 'durum',
      oncekiDeger: 'kabul_edildi', yeniDeger: 'acik',
      gerekce: `Risk kabul süresi doldu (${tarihTR(r.kabulBitis)}) — otomatik yeniden açıldı`,
      kaynak: 'is_kosusu',
    } });
    uretilen += await gorevGuvenceyeAl({
      kaynakTipi: 'Risk', kaynakId: r.id,
      baslik: `Risk kabul süresi doldu: ${r.kod} ${r.baslik}`,
      sorumluId: r.sahipId, tesisId: r.tesisId, sonTarih: r.kabulBitis,
      bildirimGovde: `Kabul bitişi ${tarihTR(r.kabulBitis)} — risk yeniden 'Açık' durumuna alındı; işlem kararı gerekli.`,
    });
  }

  
  // (f) süresi dolan AKTİF istisnalar: kapsam dışılık kalkar, yeniden değerlendirme açılır
  const dolanIstisnalar = await db.istisna.findMany({
    where: { durum: 'aktif', bitis: { lt: simdi } } });
  for (const ist of dolanIstisnalar) {
    islenen++;
    await db.istisna.update({ where: { id: ist.id }, data: { durum: 'suresi_doldu' } });
    const durumlar = await db.maddeDurumu.findMany({
      where: { maddeId: ist.maddeId, tesisId: ist.tesisId, durum: 'kapsamdisi' } });
    for (const d of durumlar) {
      await db.degerlendirmeTarihcesi.create({ data: {
        maddeDurumuId: d.id, eskiDurum: 'kapsamdisi', yeniDurum: 'degerlendirilmedi',
        gerekce: 'İstisna süresi doldu — yeniden değerlendirme gerekli' } });
      await db.maddeDurumu.update({ where: { id: d.id },
        data: { durum: 'degerlendirilmedi' } });
      const acikGorev = await db.gorev.findFirst({ where: {
        tip: 'dogrulama', kaynakTipi: 'MaddeDurumu', kaynakId: d.id,
        durum: { in: ['acik', 'yapiliyor'] } } });
      if (!acikGorev) {
        await db.gorev.create({ data: {
          baslik: 'İstisna süresi doldu — maddeyi yeniden değerlendirin',
          tip: 'dogrulama', kaynakTipi: 'MaddeDurumu', kaynakId: d.id,
          tesisId: d.tesisId, sorumluId: d.sorumluId,
          otomatikUretildi: true } });
        uretilen++;
      }
    }
    await db.aktiviteKaydi.create({ data: {
      varlikTipi: 'Istisna', varlikId: ist.id, eylem: 'durum_degisimi',
      alan: 'durum', oncekiDeger: 'aktif', yeniDeger: 'suresi_doldu',
      kaynak: 'is_kosusu' } });
  }

  return { islenen, uretilen };
}

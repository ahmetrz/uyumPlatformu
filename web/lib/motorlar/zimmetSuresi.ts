import 'server-only';
import { db } from '../db';
import { ZIMMET_UYARI_GUN, sureDurumu } from '../varlik/zimmet';

/* ═══ OT-09b · Zimmet süresi motoru ════════════════════════════════════

   ── NE YAPAR ──────────────────────────────────────────────────────────
   Bekleyen zimmet taleplerinin dört şeyini bakar:

   1. Süresi GEÇMİŞ talep `suresi_doldu` olur ve atayan için görev açılır.
      Cevapsız kalmış bir zimmet, reddedilmiş bir zimmetten daha kötüdür:
      kimse bakmamıştır ve varlığın sahibi hâlâ belirsizdir.
   2. Süresi DARALAN talep için BİR KEZ hatırlatma görevi açılır.
      `uyarildi` bayrağı olmasaydı her koşuda aynı iş yeniden düşer ve
      kuyruk okunmaz hâle gelirdi.
   3. Atanan kişi PASİFLEŞTİYSE talep iptal edilir: ayrılmış birinin
      cevaplamasını beklemek, sahipliği sonsuza kadar askıda tutardı.
   4. Varlığın sahibi BAŞKA BİR YOLDAN değiştiyse bekleyen talep iptal
      edilir — daha yeni bir karar vardır ve eski talebin kabulü onu
      sessizce geri alırdı.

   ── NE YAPMAZ ─────────────────────────────────────────────────────────
   · Kimse adına KABUL ETMEZ. Süresi dolan bir talep sahipliği devretmez;
     zimmet imzasız kalmıştır ve bu görünür olmalıdır.
   · Varlığın sahibini DEĞİŞTİRMEZ. Sahiplik yalnız insanın kabulüyle
     geçer — bu motorun tek dokunduğu şey talebin kendi durumudur.
   · Talep AÇMAZ. Zimmet bir insan kararıdır. */

export type ZimmetSuresiKosusu = {
  islenen: number;
  /** Motor kayıt defterinin ortak sözleşmesi: açılan görev sayısı. */
  uretilen: number;
  suresiDolan: number;
  uyarilan: number;
  pasifIptal: number;
  sahipDegisti: number;
};

export async function zimmetSurelerini(): Promise<ZimmetSuresiKosusu> {
  const bekleyenler = await db.varlikAtamaTalebi.findMany({
    where: { durum: 'bekliyor' },
    select: {
      id: true, varlikId: true, atananId: true, atayanId: true,
      oncekiSahipId: true, sonTarih: true, uyarildi: true,
      atanan: { select: { aktif: true, adSoyad: true } },
      varlik: { select: { etiket: true, tesisId: true, sahipId: true } },
    },
  });

  const simdi = Date.now();
  let suresiDolan = 0;
  let uyarilan = 0;
  let pasifIptal = 0;
  let sahipDegisti = 0;
  let uretilen = 0;

  for (const t of bekleyenler) {
    /* 3. Atanan pasifleşti — beklemenin anlamı kalmadı. */
    if (!t.atanan.aktif) {
      await db.varlikAtamaTalebi.update({
        where: { id: t.id },
        data: { durum: 'iptal_edildi', iptalZamani: new Date() },
      });
      await db.aktiviteKaydi.create({
        data: {
          varlikTipi: 'VarlikAtamaTalebi', varlikId: t.id, eylem: 'guncelleme',
          alan: 'durum', oncekiDeger: 'bekliyor', yeniDeger: 'iptal_edildi',
          kaynak: 'is_kosusu',
          gerekce: `${t.atanan.adSoyad} pasifleştirildi; bekleyen zimmet düştü.`,
        },
      });
      pasifIptal += 1;
      continue;
    }

    /* 4. Sahiplik başka bir yoldan değişti — eski talep artık geçersiz. */
    if ((t.varlik.sahipId ?? null) !== (t.oncekiSahipId ?? null)
      && t.varlik.sahipId !== t.atananId) {
      await db.varlikAtamaTalebi.update({
        where: { id: t.id },
        data: { durum: 'iptal_edildi', iptalZamani: new Date() },
      });
      await db.aktiviteKaydi.create({
        data: {
          varlikTipi: 'VarlikAtamaTalebi', varlikId: t.id, eylem: 'guncelleme',
          alan: 'durum', oncekiDeger: 'bekliyor', yeniDeger: 'iptal_edildi',
          kaynak: 'is_kosusu',
          gerekce: `${t.varlik.etiket}: sahiplik başka bir yoldan değişti; `
            + 'bekleyen zimmet düştü.',
        },
      });
      sahipDegisti += 1;
      continue;
    }

    const durum = sureDurumu({ sonTarih: t.sonTarih.getTime(), simdi });

    /* 1. Süre geçti. */
    if (durum === 'gecti') {
      await db.varlikAtamaTalebi.update({
        where: { id: t.id }, data: { durum: 'suresi_doldu' },
      });
      await db.aktiviteKaydi.create({
        data: {
          varlikTipi: 'VarlikAtamaTalebi', varlikId: t.id, eylem: 'guncelleme',
          alan: 'durum', oncekiDeger: 'bekliyor', yeniDeger: 'suresi_doldu',
          kaynak: 'is_kosusu',
          gerekce: 'Cevap süresi doldu; zimmet imzasız kaldı.',
        },
      });
      await db.gorev.create({
        data: {
          baslik: `Zimmet cevapsız kaldı: ${t.varlik.etiket} · ${t.atanan.adSoyad}`,
          tip: 'son_tarih', kaynakTipi: 'VarlikAtamaTalebi', kaynakId: t.id,
          tesisId: t.varlik.tesisId, sonTarih: t.sonTarih, otomatikUretildi: true,
        },
      });
      suresiDolan += 1;
      uretilen += 1;
      continue;
    }

    /* 2. Süre daralıyor — BİR KEZ hatırlat. */
    if (durum === 'daraliyor' && !t.uyarildi) {
      await db.varlikAtamaTalebi.update({
        where: { id: t.id }, data: { uyarildi: true },
      });
      await db.gorev.create({
        data: {
          baslik: `Zimmet cevabı bekleniyor (${ZIMMET_UYARI_GUN} günden az): `
            + `${t.varlik.etiket} · ${t.atanan.adSoyad}`,
          tip: 'son_tarih', kaynakTipi: 'VarlikAtamaTalebi', kaynakId: t.id,
          tesisId: t.varlik.tesisId, sonTarih: t.sonTarih, otomatikUretildi: true,
        },
      });
      uyarilan += 1;
      uretilen += 1;
    }
  }

  return {
    islenen: bekleyenler.length,
    uretilen,
    suresiDolan,
    uyarilan,
    pasifIptal,
    sahipDegisti,
  };
}

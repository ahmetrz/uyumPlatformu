import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamda, modulKapisi } from '@/app/kapsam';
import { uyumOzeti, gecikmisMi, gecenGun } from '@/lib/sabitler';
import type { Plant360Veri, Santral } from './Plant360';

/* F3 · Plant 360 — SUNUCU VERİSİ.

   ═══ KAPSAM SIZINTISI ══════════════════════════════════════════════════
   Rota `db.tesis.findUnique({ where: { id } })` diyordu: kapsam dışı bir
   santralin id'sini bilen herkes o santralin TAM dosyasını açabiliyordu —
   kurulu güç, tüzel kişi, konum, uyum yüzdesi, açık bulgu başlıkları, en
   yüksek risk, varlık sayısı, denetim programı. Ayrıca alt gezinme şeridi
   (`tumTesisler`) BÜTÜN aktif santralleri kod/ad/fotoğrafıyla taşıyordu:
   kapsam dışı bir santral açılamasa bile listede DURUYORDU.

   MODÜL SEÇİMİ: `uyum` — /portfoy ile AYNI modül, bilerek. Bu ekrana
   portföyden girilir; portföyde plakası görünen santralin dosyası
   açılabilmeli, açılamayan bir santralin plakası da portföyde durmamalıdır.
   İki ekran farklı modül seçseydi kullanıcı görebildiği bir plakaya
   tıklayıp "bulunamadı" alırdı.

   PANELLER (risk · denetim · varlık · bölge) santral kapısını GEÇTİKTEN
   sonra ayrıca kendi modül kapsamlarıyla daraltılmaz. Nedeni
   "bilinmeyen ≠ sıfır"dır: riski hiç okuyamayan bir kullanıcı için risk
   kapsamı boş küme döner ve panel "en yüksek risk yok", "0 açık risk"
   yazardı — yani ölçülmemiş olanı sıfır diye gösterirdi. Kapsam bir
   SANTRAL sınırıdır; modül izni ayrı bir eksendir ve panelin sayısını
   sıfıra çevirerek anlatılamaz.

   ── VARLIĞI DOĞRULAMAK DA BİR SIZINTIDIR ───────────────────────────────
   Kapsam dışı santral için `null` döner, rota `notFound()` çağırır.
   "Bu santral kapsamınızda değil" demek, o id'de bir santralin VAR
   OLDUĞUNU doğrulamak olurdu. */

export type EkranVerisi = { veri: Plant360Veri; santraller: Santral[] };

/** Kapsam dışı ya da olmayan santral için `null` — çağıran `notFound()` der. */
export async function tesis360Verisi(
  k: AktifKullanici,
  id: string,
): Promise<EkranVerisi | null> {
  modulKapisi(k, 'uyum');
  const izinli = izinliTesisIdleri(k, 'uyum');
  // Kural `lib/api/yetki.ts → tesisKapsamda` ile aynı; `app/kapsam.ts` onu
  // aynen çağırır. Santral kaydı okunmadan ÖNCE karar verilir.
  if (!kapsamda(izinli, id)) return null;

  const tesis = await db.tesis.findUnique({
    where: { id },
    include: { tip: true, tuzelKisi: true, profil: true },
  });
  if (!tesis) return null;

  const simdi = new Date();
  const [durumlar, bulgular, riskler, varliklar, denetimler, surecler, bolgeler, uniteler,
    tumTesisler] =
    await Promise.all([
      db.maddeDurumu.groupBy({ by: ['durum'], where: { tesisId: id }, _count: { _all: true } }),
      db.bulgu.findMany({
        where: { maddeDurumu: { tesisId: id }, durum: { in: ['acik', 'aksiyonda'] }, silindi: null },
        include: { sorumlu: { select: { adSoyad: true } },
          maddeDurumu: { include: { madde: { select: { kod: true, baslik: true } } } },
          aksiyonlar: { select: { durum: true } } },
        orderBy: [{ onemDerecesi: 'asc' }, { hedefTarih: 'asc' }],
        take: 6,
      }),
      db.risk.findMany({
        where: { tesisId: id, silindi: null, durum: { in: ['acik', 'islemde'] } },
        select: { id: true, kod: true, baslik: true, artikRisk: true, durum: true },
        orderBy: [{ artikRisk: 'desc' }], take: 4,
      }),
      db.varlik.findMany({
        where: { tesisId: id, silindi: null },
        select: { id: true, destekBitis: true } }),
      db.denetimKapsami.findMany({
        where: { tesisId: id, denetim: { silindi: null } },
        include: { denetim: { select: { kod: true, ad: true, durum: true, planBitis: true } } },
      }),
      db.surecKapsami.findMany({
        where: { tesisId: id },
        include: { surec: { include: { regulasyon: { select: { kod: true } } } } },
      }),
      db.agBolgesi.count({ where: { tesisId: id } }),
      db.uretimUnitesi.count({ where: { tesisId: id } }),
      /* Alt gezinme şeridi santral kapısıyla AYNI kapsamdan gelir: bu
         ekranda açamayacağın bir santralin adı/kodu/fotoğrafı şeritte de
         anılmaz. */
      db.tesis.findMany({
        where: { durum: 'aktif', ...(izinli === null ? {} : { id: { in: izinli } }) },
        select: { id: true, kod: true, ad: true, kuruluGucMw: true, gorselAnahtari: true,
          tip: { select: { kod: true, ad: true } } },
        orderBy: { ad: 'asc' },
      }),
    ]);

  const sayim = Object.fromEntries(durumlar.map((d) => [d.durum, d._count._all]));
  const ozet = uyumOzeti(sayim);
  const eos = varliklar.filter((v) => v.destekBitis && v.destekBitis < simdi).length;
  const gecikmisBulgu = bulgular.filter((b) => gecikmisMi(b.hedefTarih)).length;
  const yaklasanDenetim = denetimler
    .map((d) => d.denetim)
    .filter((d) => d.planBitis && d.planBitis > simdi)
    .sort((a, b) => (a.planBitis!.getTime() - b.planBitis!.getTime()))[0] ?? null;
  const enYuksekRisk = riskler[0] ?? null;

  return {
    veri: {
      id: tesis.id,
      kod: tesis.kod,
      ad: tesis.ad,
      tipKod: tesis.tip?.kod ?? null,
      tipAdi: tesis.tip?.ad ?? 'Tesis',
      tuzelKisi: tesis.tuzelKisi?.ad ?? null,
      konum: tesis.konum,
      gucMw: tesis.kuruluGucMw,
      gorselAnahtari: tesis.gorselAnahtari,
      kritiklik: tesis.profil?.kritiklikSinifi ?? null,
      uniteSayisi: uniteler || null,
      // Uyum: bilinmeyen ASLA 0 sayılmaz — yüzde yalnız değerlendirilenden,
      // bilinmeyen oranı ayrıca taşınır (lib/sabitler.ts:uyumOzeti).
      uyumYuzde: ozet.yuzde,
      bilinmeyenOran: ozet.bilinmeyenOran,
      cerceveKodu: surecler[0]?.surec.regulasyon.kod ?? null,
      enYuksekRisk: enYuksekRisk
        ? { kod: enYuksekRisk.kod, baslik: enYuksekRisk.baslik, skor: enYuksekRisk.artikRisk }
        : null,
      acikBulgu: bulgular.length,
      gecikmisBulgu,
      yaklasanDenetim: yaklasanDenetim
        ? { kod: yaklasanDenetim.kod, ad: yaklasanDenetim.ad,
            // planBitis yukarıda "gelecekte" diye süzüldü; gecenGun negatif döner
            kalanGun: -gecenGun(yaklasanDenetim.planBitis!) }
        : null,
      eosVarlik: eos,
      varlikSayisi: varliklar.length,
      bolgeSayisi: bolgeler,
      surecSayisi: surecler.length,
      odak: bulgular[0]
        ? {
            id: bulgular[0].id,
            kod: bulgular[0].maddeDurumu.madde.kod,
            baslik: bulgular[0].baslik,
            aciklama: bulguAciklamasi(bulgular[0].aciklama),
            onem: bulgular[0].onemDerecesi,
            durum: bulgular[0].durum,
            sorumlu: bulgular[0].sorumlu?.adSoyad ?? null,
            hedefTarih: bulgular[0].hedefTarih?.toISOString() ?? null,
            aksiyonTamam: bulgular[0].aksiyonlar.filter((a) => a.durum === 'tamamlandi').length,
            aksiyonToplam: bulgular[0].aksiyonlar.length,
          }
        : null,
      digerEksikler: bulgular.slice(1, 3).map((b) => ({
        id: b.id, baslik: b.baslik,
        alt: `${b.maddeDurumu.madde.kod} · ${b.sorumlu?.adSoyad ?? 'sahipsiz'}`,
      })),
    },
    santraller: tumTesisler.map((x) => ({
      id: x.id, kod: x.kod, ad: x.ad,
      alt: x.kuruluGucMw ? `${x.kuruluGucMw} MWe` : '—',
      tip: x.tip?.ad ?? 'Diğer',
      gorselAnahtari: x.gorselAnahtari,
    })),
  };
}

/** Bulgu açıklaması tek cümleye indirilir (06 §A2: ekran başına bir cümle). */
function bulguAciklamasi(metin: string | null): string | null {
  if (!metin) return null;
  const ilk = metin.split(/(?<=\.)\s/)[0];
  return ilk.length > 200 ? `${ilk.slice(0, 197)}…` : ilk;
}

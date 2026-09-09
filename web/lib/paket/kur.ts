/* ═══ P4 · PAKET KURUCU ve KALDIRICI ═════════════════════════════════════
   `docs/SEKTOR_PAKETI_SOZLESMESI.md` §1 (dokuz kalemden dördü: sözlük ·
   kapsam öğesi türleri · öznitelik şeması · çerçeve; beşincisi
   yükümlülükler) ve §4 (köken, ezmeme, arşiv).

   SÖZLEŞME
   · Doğrulayıcıdan geçmeyen paket YAZILMAZ; tek hata reddeder.
   · Yazma TEK transaction'dır — ortada patlarsa hiçbir satır kalmaz
     (kısmi yazma yok). Ölçülür: `tests/paket-kur.test.ts`.
   · Çerçeve TASLAK sürüm olarak gelir; aktifleştirme insan onayıyla
     (`lib/eylemler2/surum.ts → surumAktiflestir`). Kurucu hiçbir sürümü
     aktif yapmaz, hiçbir madde durumunu yazmaz.
   · KÖKEN: kurucunun yazdığı her satır `koken = 'paket'` ve
     `paketSurumId` taşır. Güncelleme yalnız `paket` kökenli satırı
     değiştirir; aynı anahtarda `kiraci` satırı varsa DOKUNULMAZ ve rapora
     "çelişki" düşer — silinmez, ezilmez.
   · Kaldırma = ARŞİV: paket ve sürüm kaydı `arsiv`, taslak çerçeve
     sürümü `arsiv`, tür ve yükümlülük `aktif=false`. Hiçbir satır
     silinmez. Aktif çerçeve sürümü taşıyan paket kaldırılamaz — önce
     insan başka bir sürümü aktifleştirir.
   · Lisans sınırı ALANDA: `Regulasyon.lisansTuru` · `metinDahil`; telifli
     çerçevede `Madde.metin` = TELIFLI_METIN, kamuya açık iskelette
     METIN_GELMEDI. Metin uydurulmaz. */
import type { Prisma, PrismaClient } from '../prisma-client/client';
import { METIN_GELMEDI, TELIFLI_METIN, type Manifest } from './bicim';
import { paketiDogrula, type DogrulamaHatasi, type PaketIcerigi } from './dogrula';

type Tx = Prisma.TransactionClient;

export type Celiski = { tablo: string; anahtar: string; sebep: string };
export type KurulumRaporu = {
  paketId: string; surumId: string; kod: string; surum: string;
  sayilar: { sozluk: number; kapsamTurleri: number; oznitelikler: number; cerceveler: number; maddeler: number; yukumlulukler: number };
  celiskiler: Celiski[];
  taslakSurumler: { regulasyonKod: string; surumEtiketi: string; surumId: string }[];
};
export type KurulumSonucu =
  | { ok: true; rapor: KurulumRaporu }
  | { ok: false; hatalar: DogrulamaHatasi[] };

const lisansJson = (m: Manifest) => JSON.stringify(m.lisans);

/** Doğrula → tek transaction'da yaz. `istemci` test için enjekte edilir. */
export async function paketiKur(
  dizin: string, secenekler: { kuranId: string | null; istemci: PrismaClient; simdi?: Date },
): Promise<KurulumSonucu> {
  const dogrulama = paketiDogrula(dizin);
  if (!dogrulama.ok || !dogrulama.icerik) return { ok: false, hatalar: dogrulama.hatalar };
  const icerik = dogrulama.icerik;
  const { istemci, kuranId } = secenekler;

  // bağımlılıklar: kurulu ve arşivlenmemiş olmalı
  const hatalar: DogrulamaHatasi[] = [];
  for (const b of icerik.manifest.bagimliliklar) {
    const kurulu = await istemci.icerikPaketi.findUnique({ where: { kod: b }, select: { durum: true } });
    if (!kurulu || kurulu.durum !== 'kurulu') {
      hatalar.push({ sinif: 'KİMLİK', dosya: 'manifest.json', konum: 'bagimliliklar', mesaj: `bağımlılık kurulu değil: ${b}`,
        duzeltme: `önce ${b} paketini kurun` });
    }
  }
  // aynı sürüm zaten kuruluysa: yeniden kurulum idempotenttir; aktif çerçeve etiket çakışması ayrıca ölçülür
  if (hatalar.length) return { ok: false, hatalar };

  try {
    const rapor = await istemci.$transaction(async (tx) => yaz(tx, icerik, kuranId, secenekler.simdi ?? new Date()));
    return { ok: true, rapor };
  } catch (e) {
    if (e instanceof KurulumHatasi) return { ok: false, hatalar: e.hatalar };
    throw e;
  }
}

class KurulumHatasi extends Error {
  constructor(public hatalar: DogrulamaHatasi[]) { super(hatalar.map((h) => h.mesaj).join(' · ')); }
}

async function yaz(tx: Tx, icerik: PaketIcerigi, kuranId: string | null, simdi: Date): Promise<KurulumRaporu> {
  const m = icerik.manifest;
  const celiskiler: Celiski[] = [];

  /* paket + sürüm kaydı */
  const paket = await tx.icerikPaketi.upsert({
    where: { kod: m.kod },
    update: { ad: m.ad, tur: m.tur, ulke: m.ulke, sektorKod: m.sektor?.kod ?? null, dil: m.dil, yayinci: m.yayinci, durum: 'kurulu' },
    create: { kod: m.kod, ad: m.ad, tur: m.tur, ulke: m.ulke, sektorKod: m.sektor?.kod ?? null, dil: m.dil, yayinci: m.yayinci },
  });
  await tx.icerikPaketiSurumu.updateMany({ where: { paketId: paket.id, durum: 'kurulu', NOT: { surum: m.surum } }, data: { durum: 'onceki' } });
  const surumKaydi = await tx.icerikPaketiSurumu.upsert({
    where: { paketId_surum: { paketId: paket.id, surum: m.surum } },
    update: { lisansJson: lisansJson(m), ozetJson: JSON.stringify(m.icerikOzetleri), manifestJson: JSON.stringify(m), durum: 'kurulu', kurulumZamani: simdi, kuranId },
    create: { paketId: paket.id, surum: m.surum, lisansJson: lisansJson(m), ozetJson: JSON.stringify(m.icerikOzetleri), manifestJson: JSON.stringify(m), kurulumZamani: simdi, kuranId },
  });
  const koken = { koken: 'paket', paketSurumId: surumKaydi.id } as const;
  /* Aynı paketin ESKİ sürümünden gelen satırlar da "paket" kökenlidir; onları
     bu sürüm günceller. Kimlik: paketSurumId bu paketin herhangi bir sürümü. */
  const paketinSurumleri = (await tx.icerikPaketiSurumu.findMany({ where: { paketId: paket.id }, select: { id: true } })).map((s) => s.id);
  const paketKokenli = (paketSurumId: string | null) => paketSurumId !== null && paketinSurumleri.includes(paketSurumId);

  /* sektör */
  let sektorId: string | null = null;
  if (m.sektor) {
    const s = await tx.sektor.upsert({ where: { kod: m.sektor.kod }, update: { ad: m.sektor.ad }, create: { kod: m.sektor.kod, ad: m.sektor.ad } });
    sektorId = s.id;
  }

  /* sözlük */
  let sozlukSayisi = 0;
  for (const r of icerik.sozluk) {
    if (!sektorId) break;
    const veri = { tekil: r.tekil, cogul: r.cogul, iyelik: r.iyelik, belirtme: r.belirtme, bulunma: r.bulunma, yonelme: r.yonelme };
    const mevcut = await tx.sektorSozlugu.findUnique({ where: { sektorId_anahtar_dil: { sektorId, anahtar: r.anahtar, dil: r.dil } } });
    if (mevcut && !paketKokenli(mevcut.paketSurumId)) {
      celiskiler.push({ tablo: 'SektorSozlugu', anahtar: `${r.anahtar}@${r.dil}`, sebep: 'kiracı satırı var — paket satırı yazılmadı, kiracınınki korundu' });
      continue;
    }
    if (mevcut) await tx.sektorSozlugu.update({ where: { id: mevcut.id }, data: { ...veri, ...koken } });
    else await tx.sektorSozlugu.create({ data: { sektorId, anahtar: r.anahtar, dil: r.dil, ...veri, ...koken } });
    sozlukSayisi++;
  }

  /* kapsam öğesi türleri — katalog */
  let turSayisi = 0;
  for (const t of icerik.kapsamTurleri) {
    const mevcut = await tx.kapsamOgesiTuru.findUnique({ where: { kod: t.kod } });
    if (mevcut && !paketKokenli(mevcut.paketSurumId)) {
      celiskiler.push({ tablo: 'KapsamOgesiTuru', anahtar: t.kod, sebep: 'çekirdek ya da kiracı türü var — paket türü yazılmadı' });
      continue;
    }
    const veri = { ad: t.ad, etiketAnahtari: t.etiketAnahtari ?? null, tesiseBagli: t.tesiseBagli, sira: t.sira, sektorId, aktif: true, ...koken };
    if (mevcut) await tx.kapsamOgesiTuru.update({ where: { id: mevcut.id }, data: veri });
    else await tx.kapsamOgesiTuru.create({ data: { kod: t.kod, ...veri } });
    turSayisi++;
  }

  /* öznitelik şeması */
  let oznitelikSayisi = 0;
  for (const o of icerik.oznitelikler) {
    if (!sektorId) break;
    const mevcut = await tx.sektorOznitelikSemasi.findUnique({ where: { sektorId_anahtar: { sektorId, anahtar: o.anahtar } } });
    if (mevcut && !paketKokenli(mevcut.paketSurumId)) {
      celiskiler.push({ tablo: 'SektorOznitelikSemasi', anahtar: o.anahtar, sebep: 'kiracı özniteliği var — paket satırı yazılmadı' });
      continue;
    }
    const veri = { etiketAnahtari: o.etiketAnahtari, tip: o.tip, birim: o.birim ?? null, rol: o.rol ?? null, grup: o.grup ?? null,
      secenekler: o.secenekler ? JSON.stringify(o.secenekler) : null, kuraldaKullanilir: o.kuraldaKullanilir, sira: o.sira, ...koken };
    if (mevcut) await tx.sektorOznitelikSemasi.update({ where: { id: mevcut.id }, data: veri });
    else await tx.sektorOznitelikSemasi.create({ data: { sektorId, anahtar: o.anahtar, ...veri } });
    oznitelikSayisi++;
  }

  /* çerçeveler → Regulasyon + TASLAK FrameworkSurumu + Madde */
  const taslakSurumler: KurulumRaporu['taslakSurumler'] = [];
  let maddeSayisi = 0;
  for (const c of icerik.cerceveler) {
    const k = c.kimlik;
    const regMevcut = await tx.regulasyon.findUnique({ where: { kod: k.kod } });
    let regulasyonId: string;
    if (regMevcut && !paketKokenli(regMevcut.paketSurumId)) {
      /* Kiracının (ya da tohumun) regülasyonu: kimliğe DOKUNULMAZ; paket
         yalnız yeni bir taslak sürüm ekler, lisans alanı boşsa doldurur. */
      regulasyonId = regMevcut.id;
      celiskiler.push({ tablo: 'Regulasyon', anahtar: k.kod, sebep: 'regülasyon kaydı kiracıya ait — ad/kaynak değiştirilmedi, yalnız taslak sürüm eklendi' });
      if (regMevcut.lisansTuru === null) {
        await tx.regulasyon.update({ where: { id: regulasyonId }, data: { lisansTuru: k.lisans.tur, metinDahil: k.lisans.metinDahil } });
      }
    } else {
      const veri = { ad: k.ad, kaynakUrl: k.kaynakUrl ?? null, lisansTuru: k.lisans.tur, metinDahil: k.lisans.metinDahil, ...koken };
      const reg = regMevcut
        ? await tx.regulasyon.update({ where: { id: regMevcut.id }, data: veri })
        : await tx.regulasyon.create({ data: { kod: k.kod, ...veri } });
      regulasyonId = reg.id;
    }

    const surumMevcut = await tx.frameworkSurumu.findUnique({ where: { regulasyonId_surumEtiketi: { regulasyonId, surumEtiketi: k.surumEtiketi } } });
    if (surumMevcut && surumMevcut.durum !== 'taslak') {
      throw new KurulumHatasi([{ sinif: 'SÜRÜM', dosya: c.dosya, konum: 'surumEtiketi',
        mesaj: `${k.kod} ${k.surumEtiketi} sürümü zaten ${surumMevcut.durum} — taslak değil, üzerine yazılamaz`,
        duzeltme: 'paket yeni bir surumEtiketi vermeli; aktif sürüm insan kararıyla değişir' }]);
    }
    if (surumMevcut && !paketKokenli(surumMevcut.paketSurumId)) {
      throw new KurulumHatasi([{ sinif: 'SÜRÜM', dosya: c.dosya, konum: 'surumEtiketi',
        mesaj: `${k.kod} ${k.surumEtiketi} taslağı kiracıya ait — paket ezemez`,
        duzeltme: 'paket başka bir surumEtiketi vermeli' }]);
    }
    let surumId: string;
    if (surumMevcut) {
      /* Paketin kendi taslağı: içerik yenilenir. Ama taslağın maddesine
         kiracı bir şey bağladıysa (eşleme, durum, istisna, proje, risk,
         denetim kapsamı, belge, eğitim) o bağ EZİLMEZ — yenileme reddedilir,
         paket yeni bir sürüm etiketi vermek zorundadır (§4). */
      const bagli = await tx.madde.count({ where: { surumId: surumMevcut.id, OR: [
        { durumlar: { some: {} } }, { eslestirmeKaynak: { some: {} } }, { eslestirmeHedef: { some: {} } },
        { istisnalar: { some: {} } }, { projeBaglantilari: { some: {} } }, { riskKontrolleri: { some: {} } },
        { denetimKapsamlari: { some: {} } }, { belgeBaglantilari: { some: {} } }, { egitimBaglari: { some: {} } },
      ] } });
      if (bagli > 0) {
        throw new KurulumHatasi([{ sinif: 'SÜRÜM', dosya: c.dosya, konum: 'surumEtiketi',
          mesaj: `${k.kod} ${k.surumEtiketi} taslağının ${bagli} maddesine kiracı kaydı bağlı — üzerine yazılamaz`,
          duzeltme: 'paket yeni bir surumEtiketi vermeli; kiracının bağladığı kayıt korunur' }]);
      }
      await tx.madde.deleteMany({ where: { surumId: surumMevcut.id } });
      await tx.frameworkSurumu.update({ where: { id: surumMevcut.id }, data: {
        kaynakUrl: k.kaynakUrl ?? null, yayimTarihi: k.yayimTarihi ? new Date(k.yayimTarihi) : null, ...koken } });
      surumId = surumMevcut.id;
    } else {
      const s = await tx.frameworkSurumu.create({ data: {
        regulasyonId, surumEtiketi: k.surumEtiketi, durum: 'taslak', kaynakUrl: k.kaynakUrl ?? null,
        yayimTarihi: k.yayimTarihi ? new Date(k.yayimTarihi) : null, ...koken } });
      surumId = s.id;
    }
    taslakSurumler.push({ regulasyonKod: k.kod, surumEtiketi: k.surumEtiketi, surumId });

    const idler = new Map<string, string>();
    for (const md of c.maddeler) {
      const metin = k.lisans.tur === 'telifli' ? TELIFLI_METIN : (md.metin ?? METIN_GELMEDI);
      const kayit = await tx.madde.create({ data: {
        regulasyonId, surumId, kod: `${k.kod}-${md.kod}`, baslik: md.baslik, metin,
        ustMaddeId: md.ustKod ? (idler.get(md.ustKod) ?? null) : null, sira: md.sira,
        olgunlukSeviyesi: md.seviye, zorunlulukTipi: md.zorunlulukTipi ?? k.zorunlulukTipi,
        kanitBeklentisi: md.kanitBeklentisi, disKontrolId: md.disKontrolId,
      } });
      idler.set(md.kod, kayit.id);
      maddeSayisi++;
    }
  }

  /* yükümlülükler */
  let yukumlulukSayisi = 0;
  for (const y of icerik.yukumlulukler) {
    let regulasyonId: string | null = null;
    if (y.regulasyonKod) {
      const reg = await tx.regulasyon.findUnique({ where: { kod: y.regulasyonKod }, select: { id: true } });
      if (!reg) {
        throw new KurulumHatasi([{ sinif: 'KİMLİK', dosya: 'yukumlulukler.json', konum: y.kod,
          mesaj: `regulasyonKod bulunamadı: ${y.regulasyonKod} (ne pakette ne kurulu)`, duzeltme: 'çerçeveyi pakete ekleyin ya da önce kurun' }]);
      }
      regulasyonId = reg.id;
    }
    const mevcut = await tx.bildirimYukumlulugu.findUnique({ where: { kod: y.kod } });
    if (mevcut && !paketKokenli(mevcut.paketSurumId)) {
      celiskiler.push({ tablo: 'BildirimYukumlulugu', anahtar: y.kod, sebep: 'kiracı yükümlülüğü var — paket satırı yazılmadı' });
      continue;
    }
    const veri = { ad: y.ad, regulasyonId, asgariSiddet: y.asgariSiddet, sureSaat: y.sureSaat, dayanak: y.dayanak, merci: y.merci, aktif: true, ...koken };
    if (mevcut) await tx.bildirimYukumlulugu.update({ where: { id: mevcut.id }, data: veri });
    else await tx.bildirimYukumlulugu.create({ data: { kod: y.kod, ...veri } });
    yukumlulukSayisi++;
  }

  const rapor: KurulumRaporu = {
    paketId: paket.id, surumId: surumKaydi.id, kod: m.kod, surum: m.surum,
    sayilar: { sozluk: sozlukSayisi, kapsamTurleri: turSayisi, oznitelikler: oznitelikSayisi, cerceveler: icerik.cerceveler.length, maddeler: maddeSayisi, yukumlulukler: yukumlulukSayisi },
    celiskiler, taslakSurumler,
  };
  await tx.icerikPaketiSurumu.update({ where: { id: surumKaydi.id }, data: { raporJson: JSON.stringify(rapor) } });
  return rapor;
}

export type KaldirmaSonucu = { ok: true; arsivlenen: { surumler: number; cerceveSurumleri: number; turler: number; yukumlulukler: number } } | { ok: false; hata: string };

/** Kaldırma = arşiv. Hiçbir satır silinmez; aktif çerçeve sürümü taşıyan paket kaldırılamaz. */
export async function paketiKaldir(kod: string, istemci: PrismaClient): Promise<KaldirmaSonucu> {
  const paket = await istemci.icerikPaketi.findUnique({ where: { kod }, include: { surumler: { select: { id: true } } } });
  if (!paket) return { ok: false, hata: `paket kurulu değil: ${kod}` };
  if (paket.durum === 'arsiv') return { ok: false, hata: `paket zaten arşivde: ${kod}` };
  const surumIdleri = paket.surumler.map((s) => s.id);
  const aktif = await istemci.frameworkSurumu.count({ where: { paketSurumId: { in: surumIdleri }, durum: 'aktif' } });
  if (aktif > 0) {
    return { ok: false, hata: `${kod} aktif çerçeve sürümü taşıyor (${aktif}); önce başka bir sürüm aktifleştirilmeli — paket kaldırma aktif sürümü düşüremez` };
  }
  return istemci.$transaction(async (tx) => {
    await tx.icerikPaketi.update({ where: { id: paket.id }, data: { durum: 'arsiv' } });
    const s = await tx.icerikPaketiSurumu.updateMany({ where: { paketId: paket.id }, data: { durum: 'arsiv' } });
    const c = await tx.frameworkSurumu.updateMany({ where: { paketSurumId: { in: surumIdleri }, durum: 'taslak' }, data: { durum: 'arsiv' } });
    const t = await tx.kapsamOgesiTuru.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const y = await tx.bildirimYukumlulugu.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    return { ok: true as const, arsivlenen: { surumler: s.count, cerceveSurumleri: c.count, turler: t.count, yukumlulukler: y.count } };
  });
}

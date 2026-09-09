/* ═══ P4 · PAKET KURUCU ve KALDIRICI ═════════════════════════════════════
   `docs/SEKTOR_PAKETI_SOZLESMESI.md` §1 (dokuz kalemden dördü: sözlük ·
   kapsam öğesi türleri · öznitelik şeması · çerçeve; beşincisi
   yükümlülükler) ve §4 (köken, ezmeme, arşiv).

   SÖZLEŞME
   · Doğrulayıcıdan geçmeyen paket YAZILMAZ; tek hata reddeder.
   · Yazma TEK transaction'dır — ortada patlarsa hiçbir satır kalmaz
     (kısmi yazma yok). Ölçülür: `tests/paket-kur.test.ts`. İz kaydı da
     AYNI transaction'a girer (`ayniIslemde`): iz yazılamazsa kurulum /
     arşiv de geri alınır — izsiz durum değişimi yok (ortak.ts › iz).
   · Çerçeve TASLAK sürüm olarak gelir; aktifleştirme insan onayıyla
     (`lib/eylemler2/surum.ts → surumAktiflestir`). Kurucu hiçbir sürümü
     aktif yapmaz, hiçbir madde durumunu yazmaz.
   · KÖKEN: kurucunun yazdığı her satır `koken = 'paket'` ve
     `paketSurumId` taşır. Güncelleme yalnız `paket` kökenli satırı
     değiştirir; aynı anahtarda `kiraci` satırı varsa DOKUNULMAZ ve rapora
     "çelişki" düşer — silinmez, ezilmez.
   · YÜKSELTME UZLAŞTIRMASI: yeni sürümün artık beyan etmediği, bu paketin
     önceki sürümünden kalan paket kökenli tür ve yükümlülük PASİF olur,
     paketin kendi taslak çerçeve sürümü ARŞİV — silme yok. Aktif bayrağı
     olmayan sözlük ve öznitelik şeması satırı yerinde kalır ve rapora
     `artik` düşer: sessiz değil, silme değil; insan karar verir.
   · Kaldırma = ARŞİV: paket ve sürüm kaydı `arsiv`, taslak çerçeve
     sürümü `arsiv`, tür ve yükümlülük `aktif=false`. Hiçbir satır
     silinmez. Aktif çerçeve sürümü taşıyan paket kaldırılamaz — önce
     insan başka bir sürümü aktifleştirir; bu karar arşiv yazımıyla AYNI
     transaction'da verilir (arada aktifleştirme giremez).
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
  /** Yükseltme uzlaştırması: bu sürümün artık beyan etmediği paket kökenli satırlar (pasif / arşiv). */
  pasiflestirilen: { kapsamTurleri: number; yukumlulukler: number; cerceveSurumleri: number };
  /** Aktif bayrağı olmayan tablolarda kaldırılan anahtarlar — satır yerinde kalır, RAPORLANIR (insan karar verir). */
  artik: { sozluk: string[]; oznitelikler: string[] };
};
export type KurulumSonucu =
  | { ok: true; rapor: KurulumRaporu }
  | { ok: false; hatalar: DogrulamaHatasi[] };

/** Taslak yenilenirken "kiracı bu maddeye bir şey bağlamış mı" diye bakılan
    Madde ilişkileri. Şemadaki HER liste ilişkisi ya buradadır ya da
    `MADDE_BAG_DISI`nda gerekçesiyle — bekçi (`tests/paket-kur.test.ts`)
    şemayı okur ve ikisinin birleşimini Madde modeliyle karşılaştırır: yeni
    bir ilişki eklenip burada unutulursa kırmızı. Ölçüldü: `alanlar`
    (MaddeAlan) listede yoktu ve `madde.deleteMany` kiracının kapsam alanı
    eşlemelerini kaskatla siliyordu (inceleme bulgusu, PR #41). */
export const MADDE_BAG_ILISKILERI = [
  'alanlar', 'durumlar', 'eslestirmeKaynak', 'eslestirmeHedef', 'istisnalar', 'projeBaglantilari',
  'riskKontrolleri', 'denetimKapsamlari', 'belgeBaglantilari', 'egitimBaglari', 'yerineGecenler',
] as const;
export const MADDE_BAG_DISI: Readonly<Record<string, string>> = {
  altMaddeler: 'aynı taslağın alt maddeleri — sürümle birlikte yenilenir, kiracı bağı değil',
};

const lisansJson = (m: Manifest) => JSON.stringify(m.lisans);
const tarih = (s: string | null | undefined) => (s ? new Date(s) : null);

/** Doğrula → tek transaction'da yaz. `istemci` test için enjekte edilir;
    `ayniIslemde` kurulumla aynı transaction'da koşar (iz kaydı) — patlarsa
    kurulum da geri alınır. */
export async function paketiKur(
  dizin: string,
  secenekler: {
    kuranId: string | null; istemci: PrismaClient; simdi?: Date;
    ayniIslemde?: (tx: Tx, rapor: KurulumRaporu) => Promise<void>;
  },
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
    const rapor = await istemci.$transaction(async (tx) => {
      const r = await yaz(tx, icerik, kuranId, secenekler.simdi ?? new Date());
      if (secenekler.ayniIslemde) await secenekler.ayniIslemde(tx, r);
      return r;
    });
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
    /* Paket sürümün kimlik tarihlerini beyan eder; ikisi de sürüme yazılır
       (yayım · yürürlük). Ölçüldü: yürürlük tarihi iki dalda da unutulmuştu
       ve mevzuat kütüphanesi "yürürlük yok" diyordu (inceleme bulgusu). */
    const surumVerisi = { kaynakUrl: k.kaynakUrl ?? null, yayimTarihi: tarih(k.yayimTarihi), yururlukTarih: tarih(k.yururlukTarih), ...koken };
    let surumId: string;
    if (surumMevcut) {
      /* Paketin kendi taslağı: içerik yenilenir. Ama taslağın maddesine
         kiracı bir şey bağladıysa (kapsam alanı, durum, eşleme, istisna,
         proje, risk, denetim kapsamı, belge, eğitim, yerine geçme) o bağ
         EZİLMEZ — yenileme reddedilir, paket yeni bir sürüm etiketi vermek
         zorundadır (§4). Liste şemadan bekçiyle doğrulanır. */
      const bagli = await tx.madde.count({ where: { surumId: surumMevcut.id,
        OR: MADDE_BAG_ILISKILERI.map((iliski) => ({ [iliski]: { some: {} } }) as Prisma.MaddeWhereInput) } });
      if (bagli > 0) {
        throw new KurulumHatasi([{ sinif: 'SÜRÜM', dosya: c.dosya, konum: 'surumEtiketi',
          mesaj: `${k.kod} ${k.surumEtiketi} taslağının ${bagli} maddesine kiracı kaydı bağlı — üzerine yazılamaz`,
          duzeltme: 'paket yeni bir surumEtiketi vermeli; kiracının bağladığı kayıt korunur' }]);
      }
      await tx.madde.deleteMany({ where: { surumId: surumMevcut.id } });
      await tx.frameworkSurumu.update({ where: { id: surumMevcut.id }, data: surumVerisi });
      surumId = surumMevcut.id;
    } else {
      const s = await tx.frameworkSurumu.create({ data: { regulasyonId, surumEtiketi: k.surumEtiketi, durum: 'taslak', ...surumVerisi } });
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

  /* ── YÜKSELTME UZLAŞTIRMASI ───────────────────────────────────────────
     Bu sürümün artık beyan etmediği ama bu paketin bir sürümünden kalan
     paket kökenli satırlar. Ölçüldü: kaldırılan yükümlülük `aktif=true`
     kalıp bildirim süresi işletiyor, kaldırılan tür seçilebiliyordu
     (inceleme bulgusu, PR #41). Aktif bayrağı olan tablolarda PASİF,
     paketin kendi TASLAK çerçeve sürümü ARŞİV — silme yok. Süzgeç
     `paketSurumId`dir: kiracı satırına dokunulmaz. `kod`/`id` NOT NULL,
     olumsuz yüklem NULL düşürmez (URN-VER-001). */
  const pasifTur = await tx.kapsamOgesiTuru.updateMany({
    where: { paketSurumId: { in: paketinSurumleri }, aktif: true, kod: { notIn: icerik.kapsamTurleri.map((t) => t.kod) } },
    data: { aktif: false } });
  const pasifYukumluluk = await tx.bildirimYukumlulugu.updateMany({
    where: { paketSurumId: { in: paketinSurumleri }, aktif: true, kod: { notIn: icerik.yukumlulukler.map((y) => y.kod) } },
    data: { aktif: false } });
  const arsivSurum = await tx.frameworkSurumu.updateMany({
    where: { paketSurumId: { in: paketinSurumleri }, durum: 'taslak', id: { notIn: taslakSurumler.map((t) => t.surumId) } },
    data: { durum: 'arsiv' } });
  /* Sözlük ve öznitelik şemasında aktif bayrağı yok; öznitelik satırının
     altında kiracının değerleri olabilir. Satır yerinde kalır, anahtarı
     rapora düşer — pasifleştirme P4'ün sonraki diliminde (şema alanı). */
  const artik: KurulumRaporu['artik'] = { sozluk: [], oznitelikler: [] };
  if (sektorId) {
    const beyanSozluk = new Set(icerik.sozluk.map((r) => `${r.anahtar}@${r.dil}`));
    const eskiSozluk = await tx.sektorSozlugu.findMany({ where: { sektorId, paketSurumId: { in: paketinSurumleri } }, select: { anahtar: true, dil: true } });
    artik.sozluk = eskiSozluk.map((r) => `${r.anahtar}@${r.dil}`).filter((a) => !beyanSozluk.has(a)).sort();
    const beyanOznitelik = new Set(icerik.oznitelikler.map((o) => o.anahtar));
    const eskiOznitelik = await tx.sektorOznitelikSemasi.findMany({ where: { sektorId, paketSurumId: { in: paketinSurumleri } }, select: { anahtar: true } });
    artik.oznitelikler = eskiOznitelik.map((r) => r.anahtar).filter((a) => !beyanOznitelik.has(a)).sort();
  }

  const rapor: KurulumRaporu = {
    paketId: paket.id, surumId: surumKaydi.id, kod: m.kod, surum: m.surum,
    sayilar: { sozluk: sozlukSayisi, kapsamTurleri: turSayisi, oznitelikler: oznitelikSayisi, cerceveler: icerik.cerceveler.length, maddeler: maddeSayisi, yukumlulukler: yukumlulukSayisi },
    celiskiler, taslakSurumler,
    pasiflestirilen: { kapsamTurleri: pasifTur.count, yukumlulukler: pasifYukumluluk.count, cerceveSurumleri: arsivSurum.count },
    artik,
  };
  await tx.icerikPaketiSurumu.update({ where: { id: surumKaydi.id }, data: { raporJson: JSON.stringify(rapor) } });
  return rapor;
}

export type KaldirmaRaporu = { paketId: string; arsivlenen: { surumler: number; cerceveSurumleri: number; turler: number; yukumlulukler: number } };
export type KaldirmaSonucu = ({ ok: true } & KaldirmaRaporu) | { ok: false; hata: string };

/** Kaldırma = arşiv. Hiçbir satır silinmez; aktif çerçeve sürümü taşıyan
    paket kaldırılamaz. Okuma, karar ve yazma TEK transaction'dadır: "aktif
    sürüm yok" kararı ile arşiv yazımı arasına başka bir isteğin
    aktifleştirmesi giremez (ölçülür: kök istemciye dokunan kaldırma
    `tests/paket-kur.test.ts`te kırmızı). `ayniIslemde` iz kaydı içindir. */
export async function paketiKaldir(
  kod: string, istemci: PrismaClient,
  secenekler: { ayniIslemde?: (tx: Tx, rapor: KaldirmaRaporu) => Promise<void> } = {},
): Promise<KaldirmaSonucu> {
  return istemci.$transaction(async (tx): Promise<KaldirmaSonucu> => {
    const paket = await tx.icerikPaketi.findUnique({ where: { kod }, include: { surumler: { select: { id: true } } } });
    if (!paket) return { ok: false, hata: `paket kurulu değil: ${kod}` };
    if (paket.durum === 'arsiv') return { ok: false, hata: `paket zaten arşivde: ${kod}` };
    const surumIdleri = paket.surumler.map((s) => s.id);
    const aktif = await tx.frameworkSurumu.count({ where: { paketSurumId: { in: surumIdleri }, durum: 'aktif' } });
    if (aktif > 0) {
      return { ok: false, hata: `${kod} aktif çerçeve sürümü taşıyor (${aktif}); önce başka bir sürüm aktifleştirilmeli — paket kaldırma aktif sürümü düşüremez` };
    }
    await tx.icerikPaketi.update({ where: { id: paket.id }, data: { durum: 'arsiv' } });
    const s = await tx.icerikPaketiSurumu.updateMany({ where: { paketId: paket.id }, data: { durum: 'arsiv' } });
    const c = await tx.frameworkSurumu.updateMany({ where: { paketSurumId: { in: surumIdleri }, durum: 'taslak' }, data: { durum: 'arsiv' } });
    const t = await tx.kapsamOgesiTuru.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const y = await tx.bildirimYukumlulugu.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const rapor: KaldirmaRaporu = { paketId: paket.id, arsivlenen: { surumler: s.count, cerceveSurumleri: c.count, turler: t.count, yukumlulukler: y.count } };
    if (secenekler.ayniIslemde) await secenekler.ayniIslemde(tx, rapor);
    return { ok: true, ...rapor };
  });
}

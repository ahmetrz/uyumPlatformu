/* ═══ P4 · PAKET KURUCU ve KALDIRICI ═════════════════════════════════════
   `docs/SEKTOR_PAKETI_SOZLESMESI.md` §1 (dokuz kalemden dördü: sözlük ·
   kapsam öğesi türleri · öznitelik şeması · çerçeve; beşincisi
   yükümlülükler; 2.2–2.3 ile form · rapor şablonu · rol önerisi) ve §4
   (köken, ezmeme, arşiv).

   SÖZLEŞME
   · Doğrulayıcıdan geçmeyen paket YAZILMAZ; tek hata reddeder.
   · Yazma TEK transaction'dır — ortada patlarsa hiçbir satır kalmaz
     (kısmi yazma yok). Ölçülür: `tests/paket-kur.test.ts`. Veritabanına
     dokunan HER karar (bağımlılık · sürüm değişmezliği · bağ kontrolü)
     transaction'ın içindedir; iz kaydı da AYNI transaction'a girer
     (`ayniIslemde`): iz yazılamazsa kurulum / arşiv geri alınır.
   · KURULU SÜRÜM DEĞİŞMEZ: aynı `surum` numarasıyla değişmez alanları
     (kimlik · sektör · lisans · bağımlılık · özetler) farklı paket
     reddedilir; birebir aynıysa yeniden kurulum idempotenttir ve madde
     ağacına DOKUNULMAZ (kimlikler ve kiracının madde düzenlemeleri korunur).
   · Çerçeve TASLAK sürüm olarak gelir; aktifleştirme insan onayıyla
     (`lib/eylemler2/surum.ts → surumAktiflestir`). Kurucu hiçbir sürümü
     aktif yapmaz, hiçbir madde durumunu yazmaz.
   · KÖKEN: kurucunun yazdığı her satır `koken = 'paket'` ve
     `paketSurumId` taşır. Güncelleme yalnız `paket` kökenli satırı
     değiştirir; aynı anahtarda `kiraci` satırı varsa DOKUNULMAZ ve rapora
     "çelişki" düşer — silinmez, ezilmez. Taslağın maddesine kiracı bir
     şey bağladıysa (ilişki) ya da maddeyi düzenlediyse (denetim izinde
     `Madde` kaydı) taslak üzerine yazılmaz.
   · YÜKSELTME UZLAŞTIRMASI: yeni sürümün artık beyan etmediği, bu paketin
     önceki sürümünden kalan paket kökenli tür ve yükümlülük PASİF olur,
     paketin kendi taslak çerçeve sürümü ARŞİV — silme yok. Aktif bayrağı
     olmayan sözlük ve öznitelik şeması satırı yerinde kalır ve rapora
     `artik` düşer: sessiz değil, silme değil; insan karar verir.
   · Kaldırma = ARŞİV: paket ve sürüm kaydı `arsiv`, taslak çerçeve
     sürümü `arsiv`, tür · yükümlülük · şablon · rol · eşleme `aktif=false`. Hiçbir satır
     silinmez. Aktif çerçeve sürümü taşıyan ya da kurulu başka paketin
     bağımlı olduğu paket kaldırılamaz; bu kararlar arşiv yazımıyla AYNI
     transaction'da verilir. Kaldırılan paket aynı içerikle geri kurulunca
     arşivdeki kendi taslağı taslağa döner.
   · Lisans sınırı ALANDA: `Regulasyon.lisansTuru` · `metinDahil`; telifli
     çerçevede `Madde.metin` = TELIFLI_METIN, kamuya açık iskelette
     METIN_GELMEDI. Metin uydurulmaz. */
import type { Prisma, PrismaClient } from '../prisma-client/client';
import { DOSYALAR, METIN_GELMEDI, TELIFLI_METIN, beyandanKural, type CerceveKimligi, type MaddeSatiri, type Manifest } from './bicim';
import { paketiDogrula, type DogrulamaHatasi, type PaketIcerigi } from './dogrula';

type Tx = Prisma.TransactionClient;

/** Toplu yazma bütçesi — `lib/eylemler2/surum.ts` ile aynı: 500+ satırlık
    çerçeve yazımı Prisma'nın 5 sn varsayılanını aşabiliyordu (ölçüldü). */
const TX_SECENEK = { timeout: 120_000, maxWait: 15_000 } as const;
/** Madde ağacı bu büyüklükte partilerle yazılır (600 satır ≈ 3–6 sorgu). */
const MADDE_PARTI = 200;
/** `IN (...)` parametre sınırı için parça büyüklüğü. */
const IN_PARCASI = 500;

export type Celiski = { tablo: string; anahtar: string; sebep: string };
export type KurulumRaporu = {
  paketId: string; surumId: string; kod: string; surum: string;
  sayilar: { sozluk: number; kapsamTurleri: number; oznitelikler: number; cerceveler: number; maddeler: number; yukumlulukler: number; formlar: number; raporlar: number; roller: number; eslemeler: number; kurallar: number };
  celiskiler: Celiski[];
  taslakSurumler: { regulasyonKod: string; surumEtiketi: string; surumId: string }[];
  /** Yükseltme uzlaştırması: bu sürümün artık beyan etmediği paket kökenli satırlar (pasif / arşiv; silme yok). */
  pasiflestirilen: { kapsamTurleri: number; yukumlulukler: number; cerceveSurumleri: number; sozluk: number; oznitelikler: number; formlar: number; raporlar: number; roller: number; eslemeler: number; kurallar: number };
  /** Pasifleşen sözlük (`anahtar@dil`) ve öznitelik (`anahtar`) satırları — satır yerinde, okuyucular görmez. */
  pasifAnahtarlar: { sozluk: string[]; oznitelikler: string[] };
};
export type KurulumSonucu =
  | { ok: true; rapor: KurulumRaporu }
  | { ok: false; hatalar: DogrulamaHatasi[] };

/** Taslak yenilenirken "kiracı bu maddeye bir şey bağlamış mı" diye bakılan
    Madde ilişkileri. KURAL (R-C, tavan sıfır, istisna listesi YOK): şemada
    Madde'den BAŞKA bir modele giden her liste ilişkisi burada olmak
    zorundadır — bekçi (`tests/bekci/paket-silme.test.ts`) şemayı okur ve
    karşılaştırır; yeni bir ilişki eklenip burada unutulursa kırmızı.
    Madde→Madde öz-ilişkiler (`altMaddeler`: aynı taslağın alt maddeleri,
    sürümle birlikte yenilenir) yapı gereği kiracı bağı değildir; bu bir
    gerekçeli istisna değil, tipten okunan kuraldır. `yerineGecenler` de
    öz-ilişkidir ama başka sürümün maddesinden gelir, listede tutulur.
    Ölçüldü: `alanlar` (MaddeAlan) listede yoktu ve `madde.deleteMany`
    kiracının kapsam alanı eşlemelerini kaskatla siliyordu (inceleme
    bulgusu, PR #41). */
export const MADDE_BAG_ILISKILERI = [
  'alanlar', 'durumlar', 'eslestirmeKaynak', 'eslestirmeHedef', 'istisnalar', 'projeBaglantilari',
  'riskKontrolleri', 'denetimKapsamlari', 'belgeBaglantilari', 'egitimBaglari', 'yerineGecenler',
] as const;

/** Manifestin sürüm numarasıyla birlikte DEĞİŞMEZ olan alanları: kimlik,
    sektör, dil, lisans, bağımlılık ve içerik özetleri. `ad` · `aciklama` ·
    `imza` betimleyicidir, aynı sürümde değişebilir. Ölçüldü: yalnız
    özetler karşılaştırılınca aynı sürümde `sektor` değiştirilip sözlük
    başka sektöre yazılabiliyordu (inceleme bulgusu, PR #41). */
export const MANIFEST_DEGISMEZ_ALANLAR = ['kod', 'tur', 'ulke', 'sektor', 'dil', 'surum', 'yayinci', 'lisans', 'bagimliliklar', 'icerikOzetleri'] as const;

const lisansJson = (m: Manifest) => JSON.stringify(m.lisans);
const tarih = (s: string | null | undefined) => (s ? new Date(s) : null);

/** Anahtar sırası bağımsız JSON — iki nesne "aynı mı" karşılaştırması için. */
export function kanonik(deger: unknown): string {
  if (Array.isArray(deger)) return `[${deger.map(kanonik).join(',')}]`;
  if (deger && typeof deger === 'object') {
    const n = deger as Record<string, unknown>;
    return `{${Object.keys(n).sort().map((k) => `${JSON.stringify(k)}:${kanonik(n[k])}`).join(',')}}`;
  }
  return JSON.stringify(deger ?? null);
}

/** Eski (kayıtlı) manifest ile yeni manifestin değişmez alanlarından farklı olanlar. */
export function manifestDegismezFarklari(eski: Record<string, unknown>, yeni: Manifest): string[] {
  const y = yeni as unknown as Record<string, unknown>;
  return MANIFEST_DEGISMEZ_ALANLAR.filter((a) => kanonik(eski[a] ?? null) !== kanonik(y[a] ?? null));
}

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

  /* Veritabanına dokunan HER karar transaction'ın içindedir — bağımlılık
     kontrolü dâhil: dışarıda verilen "bağımlılık kurulu" kararı ile
     kurulum arasına bağımlılığın arşivlenmesi girebiliyordu (inceleme
     bulgusu, PR #41). Ölçülür: transaction öncesi kök istemciye dokunan
     kurulum `tests/paket-kur.test.ts`te kırmızı. */
  try {
    const rapor = await istemci.$transaction(async (tx) => {
      await bagimliliklariDogrula(tx, icerik.manifest);
      const r = await yaz(tx, icerik, kuranId, secenekler.simdi ?? new Date());
      if (secenekler.ayniIslemde) await secenekler.ayniIslemde(tx, r);
      return r;
    }, TX_SECENEK);
    return { ok: true, rapor };
  } catch (e) {
    if (e instanceof KurulumHatasi) return { ok: false, hatalar: e.hatalar };
    throw e;
  }
}

class KurulumHatasi extends Error {
  constructor(public hatalar: DogrulamaHatasi[]) { super(hatalar.map((h) => h.mesaj).join(' · ')); }
}

/** Bağımlılıklar kurulu ve arşivlenmemiş olmalı — transaction içinde okunur. */
async function bagimliliklariDogrula(tx: Tx, m: Manifest): Promise<void> {
  const hatalar: DogrulamaHatasi[] = [];
  for (const b of m.bagimliliklar) {
    const kurulu = await tx.icerikPaketi.findUnique({ where: { kod: b }, select: { durum: true } });
    if (!kurulu || kurulu.durum !== 'kurulu') {
      hatalar.push({ sinif: 'KİMLİK', dosya: 'manifest.json', konum: 'bagimliliklar', mesaj: `bağımlılık kurulu değil: ${b}`,
        duzeltme: `önce ${b} paketini kurun` });
    }
  }
  if (hatalar.length) throw new KurulumHatasi(hatalar);
}

/** Denetim izinde bu maddelere dokunulmuş mu (`hedefOlgunlukKaydet`, madde
    güncelleme…): kiracının SKALER düzenlemesi ilişki bırakmaz, izi bırakır.
    Değişmez denetim izi bu kararın kaynağıdır (inceleme bulgusu, PR #41). */
async function maddeIziSayisi(tx: Tx, maddeIdler: string[]): Promise<number> {
  let toplam = 0;
  for (let i = 0; i < maddeIdler.length; i += IN_PARCASI) {
    toplam += await tx.aktiviteKaydi.count({ where: { varlikTipi: 'Madde', varlikId: { in: maddeIdler.slice(i, i + IN_PARCASI) } } });
  }
  return toplam;
}

/** Madde ağacını partiler hâlinde yazar (`createManyAndReturn`). Üst madde
    aynı partideyse kimliği ancak yazınca belli olur: parti önce boşaltılır.
    Doğrulayıcı üst maddenin alt maddeden ÖNCE geldiğini garanti eder. */
async function maddeleriYaz(tx: Tx, regulasyonId: string, surumId: string, k: CerceveKimligi, maddeler: MaddeSatiri[]): Promise<number> {
  const idler = new Map<string, string>();
  let parti: MaddeSatiri[] = [];
  const bosalt = async () => {
    if (parti.length === 0) return;
    const yazilan = await tx.madde.createManyAndReturn({
      data: parti.map((md) => ({
        regulasyonId, surumId, kod: `${k.kod}-${md.kod}`, baslik: md.baslik,
        metin: k.lisans.tur === 'telifli' ? TELIFLI_METIN : (md.metin ?? METIN_GELMEDI),
        ustMaddeId: md.ustKod ? (idler.get(md.ustKod) ?? null) : null, sira: md.sira,
        olgunlukSeviyesi: md.seviye, zorunlulukTipi: md.zorunlulukTipi ?? k.zorunlulukTipi,
        // telifli çerçevede serbest metin alanı yazılmaz — doğrulayıcı reddeder, kurucu da yazmaz (iki kilit)
        kanitBeklentisi: k.lisans.tur === 'telifli' ? null : md.kanitBeklentisi, disKontrolId: md.disKontrolId,
        kanitTipi: md.kanitTipi,
        /* Çerçevenin kendi kademesi ürünün hedef olgunluğuna YAZILMAZ (inceleme, PR #43 tur 2):
           `seviye` → `olgunlukSeviyesi` (0–5 hedef merdiveni), `gereksinim_tipi` → `gereksinimTipi`. */
        gereksinimTipi: md.gereksinimTipi,
        /* köken: metnin nereden ve ne zaman alındığı maddenin YANINDA durur (içerik kuralı) */
        maddeKaynakUrl: md.kaynakUrl, kaynakSayfa: md.kaynakYeri, kaynakErisimTarihi: tarih(md.erisimTarihi), gecerliBaslangic: tarih(md.yururlukTarihi),
      })),
      select: { id: true, kod: true },
    });
    for (const y of yazilan) idler.set(y.kod.slice(k.kod.length + 1), y.id);
    parti = [];
  };
  for (const md of maddeler) {
    if (md.ustKod && !idler.has(md.ustKod)) await bosalt();
    parti.push(md);
    if (parti.length >= MADDE_PARTI) await bosalt();
  }
  await bosalt();
  return maddeler.length;
}

/** Bağ sorgusu: hangi ilişki "kiracı bir şey bağlamış" sayılır. Köken
    taşıyan ilişkide (eşleme, 2.4) paketin KENDİ satırı bağ değildir — kendi
    eşlemesini taşıyan paket aynı etiketle asla yenilenemezdi; başka paketin
    ya da kiracının (köken `kiraci`, `paketSurumId` NULL) satırı bağdır. NULL
    açıkça dâhil (URN-VER-001). Köken taşımayan ilişkide her satır bağdır. */
const KOKENLI_BAGLAR: readonly string[] = ['eslestirmeKaynak', 'eslestirmeHedef'];
function kiraciBagi(iliski: (typeof MADDE_BAG_ILISKILERI)[number], paketinSurumleri: string[]): Prisma.MaddeWhereInput {
  if (KOKENLI_BAGLAR.includes(iliski)) {
    return { [iliski]: { some: { OR: [{ paketSurumId: null }, { paketSurumId: { notIn: paketinSurumleri } }] } } } as Prisma.MaddeWhereInput;
  }
  return { [iliski]: { some: {} } } as Prisma.MaddeWhereInput;
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
  /* KURULU SÜRÜM DEĞİŞMEZ. Aynı `surum` numarasıyla değişmez alanları
     (kimlik · sektör · dil · lisans · bağımlılık · özetler) farklı paket,
     sürüm kaydını ve altındaki içeriği sessizce ezer, "o SemVer sürümünde
     ne vardı" izini yok ederdi (inceleme bulgusu, PR #41). Birebir aynıysa
     yeniden kurulum idempotenttir: madde ağacına DOKUNULMAZ. */
  const surumOnceki = await tx.icerikPaketiSurumu.findUnique({ where: { paketId_surum: { paketId: paket.id, surum: m.surum } }, select: { manifestJson: true, durum: true } });
  let ayniIcerik = false;
  if (surumOnceki) {
    const farklar = manifestDegismezFarklari(JSON.parse(surumOnceki.manifestJson) as Record<string, unknown>, m);
    if (farklar.length) {
      throw new KurulumHatasi([{ sinif: 'SÜRÜM', dosya: 'manifest.json', konum: 'surum',
        mesaj: `${m.kod} ${m.surum} sürümü zaten kayıtlı (${surumOnceki.durum}) ve değişmez alanları farklı: ${farklar.join(', ')} — kurulu sürüm değişmez`,
        duzeltme: 'manifest.surum\'u yükseltin: yama = metin/çeviri, minör = ekleme, majör = kaldırma/kod değişimi; ad ve açıklama aynı sürümde değişebilir' }]);
    }
    ayniIcerik = true;
  }
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
  /* Çelişkinin SAHİBİ: `paketSurumId` doluysa satır BAŞKA BİR PAKETİN, boşsa
     kiracının. İkisine de "kiracı satırı var" demek denetim izine yanlış sebep
     yazıyordu (bağımsız inceleme bulgusu, PR #43). */
  const sahip = (paketSurumId: string | null) => (paketSurumId === null ? 'kiracı' : 'başka paketin');

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
      celiskiler.push({ tablo: 'SektorSozlugu', anahtar: `${r.anahtar}@${r.dil}`, sebep: `${sahip(mevcut.paketSurumId)} satırı var — paket satırı yazılmadı, kiracınınki korundu` });
      continue;
    }
    if (mevcut) await tx.sektorSozlugu.update({ where: { id: mevcut.id }, data: { ...veri, ...koken, aktif: true } });
    else await tx.sektorSozlugu.create({ data: { sektorId, anahtar: r.anahtar, dil: r.dil, ...veri, ...koken, aktif: true } });
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
      celiskiler.push({ tablo: 'SektorOznitelikSemasi', anahtar: o.anahtar, sebep: `${sahip(mevcut.paketSurumId)} özniteliği var — paket satırı yazılmadı` });
      continue;
    }
    const veri = { etiketAnahtari: o.etiketAnahtari, tip: o.tip, birim: o.birim ?? null, rol: o.rol ?? null, grup: o.grup ?? null,
      secenekler: o.secenekler ? JSON.stringify(o.secenekler) : null, kuraldaKullanilir: o.kuraldaKullanilir, sira: o.sira, aktif: true, ...koken };
    if (mevcut) await tx.sektorOznitelikSemasi.update({ where: { id: mevcut.id }, data: veri });
    else await tx.sektorOznitelikSemasi.create({ data: { sektorId, anahtar: o.anahtar, ...veri } });
    oznitelikSayisi++;
  }

  /* çerçeveler → Regulasyon + TASLAK FrameworkSurumu + Madde */
  const taslakSurumler: KurulumRaporu['taslakSurumler'] = [];
  let maddeSayisi = 0;
  let kuralSayisi = 0;
  const yazilanKurallar = new Set<string>();
  /** Taslak yenilemesinde kaskatla düşen paket kökenli eşlemeler (id → `kaynak→hedef`). */
  const kaskatEslemeler = new Map<string, string>();
  for (const c of icerik.cerceveler) {
    const k = c.kimlik;
    const regMevcut = await tx.regulasyon.findUnique({ where: { kod: k.kod } });
    let regulasyonId: string;
    if (regMevcut && !paketKokenli(regMevcut.paketSurumId)) {
      /* Kiracının (ya da tohumun) regülasyonu: kimliğe DOKUNULMAZ; paket
         yalnız yeni bir taslak sürüm ekler, lisans alanı boşsa doldurur. */
      regulasyonId = regMevcut.id;
      /* Kurulu regülasyon TELİFLİ ilan edilmişse paket ona metin getiremez:
         doğrulayıcı paketin kendi kimliğini bilir, kuruluyu KURUCU bilir
         (eşlemede bu kilit vardı, çerçeve metninde yoktu — inceleme, PR #43). */
      if (regMevcut.lisansTuru === 'telifli' && k.lisans.tur !== 'telifli') {
        throw new KurulumHatasi([{ sinif: 'LİSANS', dosya: c.dosya, konum: 'lisans.tur',
          mesaj: `lisans sınırı: ${k.kod} kurulu çerçevesi telifli — paket bu çerçeveye metin getiremez (paket lisansı: ${k.lisans.tur})`,
          duzeltme: 'çerçeveyi telifli olarak beyan edin (metin sütunu boş) ya da başka bir çerçeve kodu kullanın' }]);
      }
      celiskiler.push({ tablo: 'Regulasyon', anahtar: k.kod, sebep: 'regülasyon kaydı kiracıya ait — ad/kaynak değiştirilmedi, yalnız taslak sürüm eklendi' });
      if (regMevcut.lisansTuru === null) {
        await tx.regulasyon.update({ where: { id: regulasyonId }, data: { lisansTuru: k.lisans.tur, metinDahil: k.lisans.metinDahil } });
      }
    } else {
      /* `Regulasyon.surum` ve `yururlukTarih` ekranın gösterdiği kısa sürüm etiketi ve
         yürürlük tarihidir (mevzuat listesi, uyum verisi — ölçüldü: paketle gelen
         regülasyon "yürürlük yok" gösteriyordu); paket kimliğinden yazılır. */
      const veri = { ad: k.ad, surum: k.surumEtiketi, yururlukTarih: tarih(k.yururlukTarih), kaynakUrl: k.kaynakUrl ?? null, lisansTuru: k.lisans.tur, metinDahil: k.lisans.metinDahil, ...koken };
      const reg = regMevcut
        ? await tx.regulasyon.update({ where: { id: regMevcut.id }, data: veri })
        : await tx.regulasyon.create({ data: { kod: k.kod, ...veri } });
      regulasyonId = reg.id;
    }

    const surumMevcut = await tx.frameworkSurumu.findUnique({ where: { regulasyonId_surumEtiketi: { regulasyonId, surumEtiketi: k.surumEtiketi } } });
    if (surumMevcut && surumMevcut.durum === 'aktif') {
      throw new KurulumHatasi([{ sinif: 'SÜRÜM', dosya: c.dosya, konum: 'surumEtiketi',
        mesaj: `${k.kod} ${k.surumEtiketi} sürümü zaten aktif — taslak değil, üzerine yazılamaz`,
        duzeltme: 'paket yeni bir surumEtiketi vermeli; aktif sürüm insan kararıyla değişir' }]);
    }
    if (surumMevcut && !paketKokenli(surumMevcut.paketSurumId)) {
      throw new KurulumHatasi([{ sinif: 'SÜRÜM', dosya: c.dosya, konum: 'surumEtiketi',
        mesaj: `${k.kod} ${k.surumEtiketi} ${surumMevcut.durum} sürümü kiracıya ait — paket ezemez`,
        duzeltme: 'paket başka bir surumEtiketi vermeli' }]);
    }
    /* Paket sürümün kimlik tarihlerini beyan eder; ikisi de sürüme yazılır
       (yayım · yürürlük). Ölçüldü: yürürlük tarihi iki dalda da unutulmuştu
       ve mevzuat kütüphanesi "yürürlük yok" diyordu (inceleme bulgusu).
       Paketin kendi ARŞİV taslağı (kaldırma sonrası geri kurulum) taslağa
       döner — yeni etiket istemez (inceleme bulgusu). */
    /* Paketin beyanı SÜRÜME iner: `not` (ör. "metin TEMSİLÎDİR") ve `temsili` bayrağı
       kurulumda buharlaşıyordu — veritabanında kurgusal metin gerçek mevzuattan ayırt
       edilemiyordu (bağımsız inceleme, PR #43 tur 2). Rozet henüz yok; veri artık var. */
    const surumVerisi = { kaynakUrl: k.kaynakUrl ?? null, yayimTarihi: tarih(k.yayimTarihi), yururlukTarih: tarih(k.yururlukTarih), durum: 'taslak', paketNotu: k.not ?? null, temsili: k.temsili ?? false, ...koken };
    let surumId: string;
    if (surumMevcut && ayniIcerik) {
      /* Aynı sürüm, aynı içerik: madde ağacına DOKUNULMAZ — kimlikler,
         kiracının hedef olgunluk gibi skaler düzenlemeleri ve izleri kalır. */
      await tx.frameworkSurumu.update({ where: { id: surumMevcut.id }, data: surumVerisi });
      surumId = surumMevcut.id;
      maddeSayisi += await tx.madde.count({ where: { surumId } });
    } else if (surumMevcut) {
      /* Paketin kendi taslağı, YENİ paket sürümüyle yenileniyor. Taslağın
         maddesine kiracı bir şey bağladıysa (kapsam alanı, durum, eşleme,
         istisna, proje, risk, denetim kapsamı, belge, eğitim, yerine geçme)
         ya da maddeyi DÜZENLEDİYSE (denetim izinde `Madde` kaydı: hedef
         olgunluk vb.) o bağ/düzenleme EZİLMEZ — yenileme reddedilir, paket
         yeni bir sürüm etiketi vermek zorundadır (§4). İlişki listesi
         şemadan bekçiyle doğrulanır. */
      const maddeIdler = (await tx.madde.findMany({ where: { surumId: surumMevcut.id }, select: { id: true } })).map((x) => x.id);
      const bagli = await tx.madde.count({ where: { surumId: surumMevcut.id,
        OR: MADDE_BAG_ILISKILERI.map((iliski) => kiraciBagi(iliski, paketinSurumleri)) } });
      const dokunulan = await maddeIziSayisi(tx, maddeIdler);
      if (bagli > 0 || dokunulan > 0) {
        throw new KurulumHatasi([{ sinif: 'SÜRÜM', dosya: c.dosya, konum: 'surumEtiketi',
          mesaj: `${k.kod} ${k.surumEtiketi} taslağının maddelerine kiracı kaydı bağlı (${bagli} bağ, ${dokunulan} düzenleme izi) — üzerine yazılamaz`,
          duzeltme: 'paket yeni bir surumEtiketi vermeli; kiracının bağladığı kayıt ve düzenlemesi korunur' }]);
      }
      /* Taslak yenilenirken bu taslağın maddelerine bağlı PAKET KÖKENLİ eşlemeler
         kaskatla gider (`MaddeEslestirmesi` onDelete: Cascade). Sayı SİLMEDEN ÖNCE
         ölçülür: uzlaştırma listesi silmeden sonra okunduğu için rapor "0 eşleme
         bırakıldı" diyordu (inceleme bulgusu, PR #43). Yeniden beyan edilenler
         eşleme bloğunda yeniden yazılır; yazılmayanlar rapora düşer. */
      for (const e of await tx.maddeEslestirmesi.findMany({
        where: { paketSurumId: { in: paketinSurumleri }, OR: [{ kaynak: { surumId: surumMevcut.id } }, { hedef: { surumId: surumMevcut.id } }] },
        select: { id: true, kaynak: { select: { kod: true } }, hedef: { select: { kod: true } } },
      })) kaskatEslemeler.set(e.id, `${e.kaynak.kod}→${e.hedef.kod}`);
      await tx.madde.deleteMany({ where: { surumId: surumMevcut.id } });
      await tx.frameworkSurumu.update({ where: { id: surumMevcut.id }, data: surumVerisi });
      surumId = surumMevcut.id;
      maddeSayisi += await maddeleriYaz(tx, regulasyonId, surumId, k, c.maddeler);
    } else {
      const s = await tx.frameworkSurumu.create({ data: { regulasyonId, surumEtiketi: k.surumEtiketi, ...surumVerisi } });
      surumId = s.id;
      maddeSayisi += await maddeleriYaz(tx, regulasyonId, surumId, k, c.maddeler);
    }
    taslakSurumler.push({ regulasyonKod: k.kod, surumEtiketi: k.surumEtiketi, surumId });

    /* Uygulanabilirlik BEYANI (§1/9) → `UygulanabilirlikKurali`, köken paket.
       Paketin bu regülasyon için önceki kuralı yenilenir; koşul değiştiyse kural
       SÜRÜMÜ artar (kararlar `kuralSurumu` taşır, eski karar hangi kuralla
       verildiği belli kalır). Kiracının kuralı (`paketSurumId` NULL) süzgeçte
       hiç yok: ezilmez. Motor kararı ÖNERİR; hiçbir sürüm aktifleşmez. */
    const beyan = k.uygulanabilirlik ?? null;
    const eskiKural = await tx.uygulanabilirlikKurali.findFirst({ where: { regulasyonId, paketSurumId: { in: paketinSurumleri } }, orderBy: { olusturuldu: 'desc' } });
    /* BAŞKA bir paketin aynı regülasyon için aktif kuralı varsa iki paket kuralı
       yan yana durur ve motorda sıra belirsizleşir: çelişki RAPORLANIR (inceleme,
       PR #43 tur 2). Kiracının kuralı bu sayıma girmez — o zaten üstündür. */
    if (beyan) {
      const baskaPaket = await tx.uygulanabilirlikKurali.count({ where: { regulasyonId, aktif: true, koken: 'paket', NOT: { paketSurumId: { in: paketinSurumleri } }, paketSurumId: { not: null } } });
      if (baskaPaket > 0) celiskiler.push({ tablo: 'UygulanabilirlikKurali', anahtar: k.kod, sebep: `başka paketin ${baskaPaket} aktif kuralı var — iki paket kuralı yan yana, kararın hangisiyle verildiği belirsizleşebilir` });
    }
    if (beyan) {
      const kosulJson = JSON.stringify(beyandanKural(beyan));
      const veri = { ad: `Paket beyanı · ${k.kod}`, kosulJson, aciklama: beyan.aciklama ?? null, aktif: true, ...koken };
      const kayit = eskiKural
        ? await tx.uygulanabilirlikKurali.update({ where: { id: eskiKural.id }, data: { ...veri, ...(eskiKural.kosulJson === kosulJson ? {} : { surum: { increment: 1 } }) }, select: { id: true } })
        : await tx.uygulanabilirlikKurali.create({ data: { regulasyonId, ...veri }, select: { id: true } });
      yazilanKurallar.add(kayit.id);
      kuralSayisi++;
    }
  }

  /* eşlemeler (2.4) — çerçeveler arası madde eşlemesi, `MaddeEslestirmesi`
     koken=paket. Uç: paketin kendi taslağı ya da KURULU bir çerçeve sürümü
     (kod + etiket; yoksa KİMLİK). Kurulu çerçeve telifliyse açıklama
     yazılmaz (LİSANS) — doğrulayıcı paket içini bilir, kurucu kuruluyu.
     Aynı kaynak→hedef çiftinde kiracı eşlemesi varsa DOKUNULMAZ (çelişki). */
  const yazilanEslemeler = new Set<string>();
  /** Bu kurulumda yazılan eşleme ÇİFTLERİ (`<kaynak madde kodu>→<hedef madde kodu>`).
      Taslak yenilemesinde satır kaskatla silinip YENİ kimlikle yeniden yazılır:
      kimlik karşılaştırması "bırakıldı" derdi, çift karşılaştırması doğruyu söyler. */
  const yazilanCiftler = new Set<string>();
  let eslemeSayisi = 0;
  for (const e of icerik.eslemeler) {
    const cozumle = async (ref: { cerceve: string; surumEtiketi: string }, yon: 'kaynak' | 'hedef') => {
      const taslak = taslakSurumler.find((t) => t.regulasyonKod === ref.cerceve);
      if (taslak) return { surumId: taslak.surumId, telifli: icerik.cerceveler.some((c) => c.kimlik.kod === ref.cerceve && c.kimlik.lisans.tur === 'telifli') };
      const reg = await tx.regulasyon.findUnique({ where: { kod: ref.cerceve }, select: { id: true, lisansTuru: true } });
      const surum = reg ? await tx.frameworkSurumu.findUnique({ where: { regulasyonId_surumEtiketi: { regulasyonId: reg.id, surumEtiketi: ref.surumEtiketi } }, select: { id: true } }) : null;
      if (!reg || !surum) {
        throw new KurulumHatasi([{ sinif: 'KİMLİK', dosya: e.dosya, konum: `${yon}.cerceve`, mesaj: `${ref.cerceve} ${ref.surumEtiketi} sürümü bulunamadı (ne pakette ne kurulu)`,
          duzeltme: 'çerçeveyi pakete ekleyin ya da önce kurun; sürüm etiketi kurulu sürümünkiyle aynı olmalı' }]);
      }
      return { surumId: surum.id, telifli: reg.lisansTuru === 'telifli' };
    };
    const kaynak = await cozumle(e.kimlik.kaynak, 'kaynak');
    const hedef = await cozumle(e.kimlik.hedef, 'hedef');
    if ((kaynak.telifli || hedef.telifli) && e.satirlar.some((s) => s.aciklama)) {
      throw new KurulumHatasi([{ sinif: 'LİSANS', dosya: e.dosya, mesaj: `lisans sınırı: ${kaynak.telifli ? e.kimlik.kaynak.cerceve : e.kimlik.hedef.cerceve} kurulu çerçevesi telifli — eşleme açıklaması girilemez`,
        duzeltme: 'aciklama sütununu boş bırakın' }]);
    }
    const kimlikler = async (surumId: string, cerceveKod: string, kodlar: string[]) => {
      const m = new Map<string, string>();
      for (let i = 0; i < kodlar.length; i += IN_PARCASI) {
        const parca = kodlar.slice(i, i + IN_PARCASI).map((k) => `${cerceveKod}-${k}`);
        for (const md of await tx.madde.findMany({ where: { surumId, kod: { in: parca } }, select: { id: true, kod: true } })) m.set(md.kod.slice(cerceveKod.length + 1), md.id);
      }
      return m;
    };
    const kaynakIdler = await kimlikler(kaynak.surumId, e.kimlik.kaynak.cerceve, [...new Set(e.satirlar.map((s) => s.kaynakKod))]);
    const hedefIdler = await kimlikler(hedef.surumId, e.kimlik.hedef.cerceve, [...new Set(e.satirlar.map((s) => s.hedefKod))]);
    for (const s of e.satirlar) {
      const kaynakId = kaynakIdler.get(s.kaynakKod); const hedefId = hedefIdler.get(s.hedefKod);
      if (!kaynakId || !hedefId) {
        const [ref, kod] = !kaynakId ? [e.kimlik.kaynak, s.kaynakKod] : [e.kimlik.hedef, s.hedefKod];
        throw new KurulumHatasi([{ sinif: 'KİMLİK', dosya: e.dosya, konum: `${s.kaynakKod}→${s.hedefKod}`, mesaj: `madde bulunamadı: ${ref.cerceve} ${ref.surumEtiketi} sürümünde ${kod} yok`,
          duzeltme: 'madde kodunu kurulu çerçevedeki gibi yazın (çerçeve önekinden sonraki kısım)' }]);
      }
      const mevcut = await tx.maddeEslestirmesi.findUnique({ where: { kaynakId_hedefId: { kaynakId, hedefId } } });
      if (mevcut && !paketKokenli(mevcut.paketSurumId)) {
        celiskiler.push({ tablo: 'MaddeEslestirmesi', anahtar: `${e.kimlik.kod}:${s.kaynakKod}→${s.hedefKod}`, sebep: 'kiracı ya da başka paketin eşlemesi var — paket eşlemesi yazılmadı, mevcut korundu' });
        continue;
      }
      const veri = { denklik: s.denklik, aciklama: s.aciklama, aktif: true, ...koken };
      const kayit = mevcut
        ? await tx.maddeEslestirmesi.update({ where: { id: mevcut.id }, data: veri, select: { id: true } })
        : await tx.maddeEslestirmesi.create({ data: { kaynakId, hedefId, ...veri }, select: { id: true } });
      yazilanEslemeler.add(kayit.id);
      yazilanCiftler.add(`${e.kimlik.kaynak.cerceve}-${s.kaynakKod}→${e.kimlik.hedef.cerceve}-${s.hedefKod}`);
      eslemeSayisi++;
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
      celiskiler.push({ tablo: 'BildirimYukumlulugu', anahtar: y.kod, sebep: `${sahip(mevcut.paketSurumId)} yükümlülüğü var — paket satırı yazılmadı` });
      continue;
    }
    /* Tetikleyici türü ve dönem alanları da PAKETTEN gelir; koda
       gömülmez. Doğrulayıcı türle alanların tutarlılığını zaten
       ölçtü (olay tetiklide dönem, takvim tetiklide sureSaat yasak). */
    const veri = { ad: y.ad, regulasyonId, asgariSiddet: y.asgariSiddet, sureSaat: y.sureSaat, dayanak: y.dayanak, merci: y.merci, kanalNotu: y.kanalNotu ?? null, tetikleyici: y.tetikleyici, donem: y.donem ?? null, donemBaslangici: y.donemBaslangici ?? null, teslimGun: y.teslimGun ?? null, aktif: true, ...koken };
    if (mevcut) await tx.bildirimYukumlulugu.update({ where: { id: mevcut.id }, data: veri });
    else await tx.bildirimYukumlulugu.create({ data: { kod: y.kod, ...veri } });
    yukumlulukSayisi++;
  }

  /* form ve rapor şablonları (2.2) — katalog; tanım JSON'da, köken ve aktif
     öbür paket tablolarıyla aynı. Madde referansı ya paketin kendi
     çerçevesinde ya kurulu bir maddede olmalı: kopuk referans KİMLİK. */
  const paketMaddeKodlari = new Set(icerik.cerceveler.flatMap((c) => c.maddeler.map((md) => `${c.kimlik.kod}-${md.kod}`)));
  const maddeVarMi = async (kod: string) => paketMaddeKodlari.has(kod) || (await tx.madde.count({ where: { kod } })) > 0;
  let formSayisi = 0;
  for (const f of icerik.formlar) {
    for (const b of f.bolumler) for (const a of b.alanlar) {
      if (a.maddeKod && !(await maddeVarMi(a.maddeKod))) {
        throw new KurulumHatasi([{ sinif: 'KİMLİK', dosya: `${DOSYALAR.formDizini}/${f.kod}.json`, konum: `${b.kod}.${a.anahtar}.maddeKod`,
          mesaj: `madde referansı bulunamadı: ${a.maddeKod} (ne pakette ne kurulu)`, duzeltme: 'çerçeveyi pakete ekleyin ya da referansı düzeltin' }]);
      }
    }
    const mevcut = await tx.formSablonu.findUnique({ where: { kod: f.kod } });
    if (mevcut && !paketKokenli(mevcut.paketSurumId)) {
      celiskiler.push({ tablo: 'FormSablonu', anahtar: f.kod, sebep: `${sahip(mevcut.paketSurumId)} form şablonu var — paket şablonu yazılmadı` });
      continue;
    }
    const veri = { ad: f.ad, tur: f.tur, sektorId, dosyaAdi: f.dosya ?? null, tanimJson: JSON.stringify(f), aktif: true, ...koken };
    if (mevcut) await tx.formSablonu.update({ where: { id: mevcut.id }, data: veri });
    else await tx.formSablonu.create({ data: { kod: f.kod, ...veri } });
    formSayisi++;
  }
  let raporSayisi = 0;
  for (const r of icerik.raporlar) {
    const mevcut = await tx.raporSablonu.findUnique({ where: { kod: r.kod } });
    if (mevcut && !paketKokenli(mevcut.paketSurumId)) {
      celiskiler.push({ tablo: 'RaporSablonu', anahtar: r.kod, sebep: `${sahip(mevcut.paketSurumId)} rapor şablonu var — paket şablonu yazılmadı` });
      continue;
    }
    const veri = { ad: r.ad, sektorId, tanimJson: JSON.stringify(r), aktif: true, ...koken };
    if (mevcut) await tx.raporSablonu.update({ where: { id: mevcut.id }, data: veri });
    else await tx.raporSablonu.create({ data: { kod: r.kod, ...veri } });
    raporSayisi++;
  }

  /* rol önerileri (2.3) — katalog. Çalışma zamanı yetkisi (`lib/erisim.ts`)
     kataloğu OKUMAZ: paket önerir, kiracı ezer, koda bağlanması P2/P6.
     Çekirdek rol kodu doğrulayıcıda reddedilir; burada yalnız köken kuralı. */
  let rolSayisi = 0;
  for (const r of icerik.roller) {
    const mevcut = await tx.rolKatalogu.findUnique({ where: { kod: r.kod } });
    if (mevcut && !paketKokenli(mevcut.paketSurumId)) {
      celiskiler.push({ tablo: 'RolKatalogu', anahtar: r.kod, sebep: `${sahip(mevcut.paketSurumId)} rolü var — paket önerisi yazılmadı` });
      continue;
    }
    const veri = { ad: r.ad, aciklama: r.aciklama ?? null, izinlerJson: JSON.stringify(r.izinler), kapsamEkseni: r.kapsamEkseni, sira: r.sira, aktif: true, ...koken };
    if (mevcut) await tx.rolKatalogu.update({ where: { id: mevcut.id }, data: veri });
    else await tx.rolKatalogu.create({ data: { kod: r.kod, ...veri } });
    rolSayisi++;
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
  const pasifForm = await tx.formSablonu.updateMany({
    where: { paketSurumId: { in: paketinSurumleri }, aktif: true, kod: { notIn: icerik.formlar.map((f) => f.kod) } },
    data: { aktif: false } });
  const pasifRapor = await tx.raporSablonu.updateMany({
    where: { paketSurumId: { in: paketinSurumleri }, aktif: true, kod: { notIn: icerik.raporlar.map((r) => r.kod) } },
    data: { aktif: false } });
  const pasifRol = await tx.rolKatalogu.updateMany({
    where: { paketSurumId: { in: paketinSurumleri }, aktif: true, kod: { notIn: icerik.roller.map((r) => r.kod) } },
    data: { aktif: false } });
  /* Bu sürümün beyan etmediği paket kökenli uygulanabilirlik kuralı PASİF: motor
     koşmaz, satır durur (R-C). Kiracının kuralı süzgecin dışında — `paketSurumId`
     NULL, `in` listesi NULL'u zaten eşlemez (URN-VER-001: olumsuz yüklem yok). */
  const pasifKural = await tx.uygulanabilirlikKurali.updateMany({
    where: { paketSurumId: { in: paketinSurumleri }, aktif: true, id: { notIn: [...yazilanKurallar] } },
    data: { aktif: false } });
  /* Eşleme (2.4): bu sürümün yazmadığı paket kökenli eşleme pasif — kimlik
     listesi parçalarla (IN sınırı). Paketin kendi taslağı yenilenirken
     kaskatla giden kendi eşlemeleri zaten yeniden yazıldı. */
  const eskiEslemeler = await tx.maddeEslestirmesi.findMany({ where: { paketSurumId: { in: paketinSurumleri }, aktif: true }, select: { id: true } });
  const dusenEslemeler = eskiEslemeler.map((r) => r.id).filter((id) => !yazilanEslemeler.has(id));
  /* Kaskatla giden ve yeniden yazılmayan eşlemeler de "bırakıldı": satır artık
     yok, rapor bunu SAYAR (susmak, izde "0 eşleme" yalanı üretiyordu). */
  const kaskatDusen = [...kaskatEslemeler.values()].filter((cift) => !yazilanCiftler.has(cift));
  for (let i = 0; i < dusenEslemeler.length; i += IN_PARCASI) {
    await tx.maddeEslestirmesi.updateMany({ where: { id: { in: dusenEslemeler.slice(i, i + IN_PARCASI) } }, data: { aktif: false } });
  }
  /* Sözlük ve öznitelik şeması da PASİFLEŞİR (2.1): silinmez — öznitelik
     satırının altında kiracının değerleri olabilir (R-C) — ama okuyucular
     artık görmez. Anahtar (anahtar@dil · anahtar) rapora düşer. */
  const pasifAnahtarlar: KurulumRaporu['pasifAnahtarlar'] = { sozluk: [], oznitelikler: [] };
  if (sektorId) {
    const beyanSozluk = new Set(icerik.sozluk.map((r) => `${r.anahtar}@${r.dil}`));
    const eskiSozluk = await tx.sektorSozlugu.findMany({ where: { sektorId, aktif: true, paketSurumId: { in: paketinSurumleri } }, select: { id: true, anahtar: true, dil: true } });
    const dusenSozluk = eskiSozluk.filter((r) => !beyanSozluk.has(`${r.anahtar}@${r.dil}`));
    if (dusenSozluk.length) await tx.sektorSozlugu.updateMany({ where: { id: { in: dusenSozluk.map((r) => r.id) } }, data: { aktif: false } });
    pasifAnahtarlar.sozluk = dusenSozluk.map((r) => `${r.anahtar}@${r.dil}`).sort();
    const beyanOznitelik = new Set(icerik.oznitelikler.map((o) => o.anahtar));
    const eskiOznitelik = await tx.sektorOznitelikSemasi.findMany({ where: { sektorId, aktif: true, paketSurumId: { in: paketinSurumleri } }, select: { id: true, anahtar: true } });
    const dusenOznitelik = eskiOznitelik.filter((r) => !beyanOznitelik.has(r.anahtar));
    if (dusenOznitelik.length) await tx.sektorOznitelikSemasi.updateMany({ where: { id: { in: dusenOznitelik.map((r) => r.id) } }, data: { aktif: false } });
    pasifAnahtarlar.oznitelikler = dusenOznitelik.map((r) => r.anahtar).sort();
  }

  const rapor: KurulumRaporu = {
    paketId: paket.id, surumId: surumKaydi.id, kod: m.kod, surum: m.surum,
    sayilar: { sozluk: sozlukSayisi, kapsamTurleri: turSayisi, oznitelikler: oznitelikSayisi, cerceveler: icerik.cerceveler.length, maddeler: maddeSayisi, yukumlulukler: yukumlulukSayisi,
      formlar: formSayisi, raporlar: raporSayisi, roller: rolSayisi, eslemeler: eslemeSayisi, kurallar: kuralSayisi },
    celiskiler, taslakSurumler,
    pasiflestirilen: {
      kapsamTurleri: pasifTur.count, yukumlulukler: pasifYukumluluk.count, cerceveSurumleri: arsivSurum.count,
      sozluk: pasifAnahtarlar.sozluk.length, oznitelikler: pasifAnahtarlar.oznitelikler.length,
      formlar: pasifForm.count, raporlar: pasifRapor.count, roller: pasifRol.count, eslemeler: dusenEslemeler.length + kaskatDusen.length, kurallar: pasifKural.count,
    },
    pasifAnahtarlar,
  };
  await tx.icerikPaketiSurumu.update({ where: { id: surumKaydi.id }, data: { raporJson: JSON.stringify(rapor) } });
  return rapor;
}

export type KaldirmaRaporu = { paketId: string; arsivlenen: {
  surumler: number; cerceveSurumleri: number; turler: number; yukumlulukler: number; sozluk: number; oznitelikler: number; formlar: number; raporlar: number; roller: number; eslemeler: number; kurallar: number };
  /** Pasifleşen paket kurallarıyla verilmiş kapsam kararı sayısı — kayıtlar SİLİNMEZ, sayılır. */
  etkilenenKarar: number };
export type KaldirmaSonucu = ({ ok: true } & KaldirmaRaporu) | { ok: false; hata: string };

/** Kaldırma = arşiv. Hiçbir satır silinmez; aktif çerçeve sürümü taşıyan
    ya da kurulu başka paketin bağımlı olduğu paket kaldırılamaz. Okuma,
    karar ve yazma TEK transaction'dadır: "aktif sürüm yok" kararı ile
    arşiv yazımı arasına başka bir isteğin aktifleştirmesi giremez
    (ölçülür: kök istemciye dokunan kaldırma `tests/paket-kur.test.ts`te
    kırmızı). `ayniIslemde` iz kaydı içindir. */
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
    /* Kurulu başka bir paket bu pakete bağımlıysa kaldırma reddedilir:
       kurulumda reddedilecek durum kaldırmayla üretilemez (inceleme
       bulgusu, PR #41). Bağımlılık, kurulu sürümün manifestinden okunur. */
    const digerleri = await tx.icerikPaketi.findMany({ where: { durum: 'kurulu', NOT: { id: paket.id } },
      select: { kod: true, surumler: { where: { durum: 'kurulu' }, select: { manifestJson: true } } } });
    const bagimlilar = digerleri
      .filter((p) => p.surumler.some((s) => ((JSON.parse(s.manifestJson) as { bagimliliklar?: string[] }).bagimliliklar ?? []).includes(kod)))
      .map((p) => p.kod).sort();
    if (bagimlilar.length) {
      return { ok: false, hata: `${kod} paketine bağımlı kurulu paket var: ${bagimlilar.join(', ')} — önce onları kaldırın` };
    }
    await tx.icerikPaketi.update({ where: { id: paket.id }, data: { durum: 'arsiv' } });
    const s = await tx.icerikPaketiSurumu.updateMany({ where: { paketId: paket.id }, data: { durum: 'arsiv' } });
    const c = await tx.frameworkSurumu.updateMany({ where: { paketSurumId: { in: surumIdleri }, durum: 'taslak' }, data: { durum: 'arsiv' } });
    const t = await tx.kapsamOgesiTuru.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const y = await tx.bildirimYukumlulugu.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const sz = await tx.sektorSozlugu.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const oz = await tx.sektorOznitelikSemasi.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const fr = await tx.formSablonu.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const rp = await tx.raporSablonu.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const rl = await tx.rolKatalogu.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const es = await tx.maddeEslestirmesi.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    /* Kural pasifleşir ama onunla verilmiş KARARLAR yerinde kalır (R-C: silme yok).
       Sayısı raporlanır: "geri çekilmiş bir kuralla verilmiş karar" sessiz kalmasın
       (bağımsız inceleme, PR #43 tur 2). */
    const kuralIdleri = (await tx.uygulanabilirlikKurali.findMany({ where: { paketSurumId: { in: surumIdleri } }, select: { id: true } })).map((x) => x.id);
    const kr = await tx.uygulanabilirlikKurali.updateMany({ where: { paketSurumId: { in: surumIdleri } }, data: { aktif: false } });
    const etkilenenKarar = kuralIdleri.length ? await tx.uygulanabilirlikKarari.count({ where: { kuralId: { in: kuralIdleri } } }) : 0;
    const rapor: KaldirmaRaporu = { paketId: paket.id, arsivlenen: {
      surumler: s.count, cerceveSurumleri: c.count, turler: t.count, yukumlulukler: y.count, sozluk: sz.count, oznitelikler: oz.count, formlar: fr.count, raporlar: rp.count, roller: rl.count, eslemeler: es.count, kurallar: kr.count }, etkilenenKarar };
    if (secenekler.ayniIslemde) await secenekler.ayniIslemde(tx, rapor);
    return { ok: true, ...rapor };
  }, TX_SECENEK);
}

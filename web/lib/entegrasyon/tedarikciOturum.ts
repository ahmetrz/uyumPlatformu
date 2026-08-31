import 'server-only';
import { db } from '../db';
import type { Prisma } from '../prisma-client/client';
import { kokenYaz } from './koken';
import type { Koken } from './sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   TEDARİKÇİ ERİŞİM OTURUMU — İZLEME KATMANI

   Bu dosya BİR PAM / VPN / SESSION-RECORDING ÜRÜNÜ DEĞİLDİR:
   oturum AÇMAZ, KAPATMAZ, KESMEZ, KAYDETMEZ, ekran görüntüsü tutmaz,
   erişim vermez ya da geri almaz. Yaptığı tek şey, dış sistemden gelen
   oturum METADATA'sını normalize etmek, kökenini yazmak ve uyum sonucunu
   (onaylı mı, MFA var mı, izlendi mi) gösterebilir hâle getirmektir.

   ── ÜÇ DEĞERLİ ALANLAR ───────────────────────────────────────────────
   `onayli`, `mfaVar`, `izlendi` üç değerlidir ve ÜÇÜ DE AYRI gösterilir:

     true  → kanıtlı olumlu   (onay kaydı bulundu / MFA doğrulandı / kayıt var)
     false → kanıtlı olumsuz  (kaynak sistem "yok" diyor) → UYUMSUZLUK
     null  → BİLİNMİYOR       (kaynak bu alanı hiç raporlamıyor) → ölçüm boşluğu

   `null`'ı `false` gibi göstermek defect'tir: "MFA'sı olmayan oturum" ile
   "MFA'sı olup olmadığını bilmediğimiz oturum" farklı iki bulgudur ve
   farklı iki aksiyon gerektirir. Bu yüzden `uyumsuzOturumlar()` ikisini
   ayrı listede döndürür ve HİÇBİR YERDE toplamaz.

   Aynı üç değerli mantık `Tedarikci.oturumKaydiVar` alanında da var
   (true kayıt alınıyor · false alınmıyor · null bilinmiyor).
   `tedarikciOturumOzeti()` beyan ile gerçek kayıt akışını karşılaştırır
   ve çeliştiği yeri söyler.

   ── KAYIT YOKLUĞU ────────────────────────────────────────────────────
   Gerçek bir PAM/VPN connector'ı bağlı değilse OTURUM UYDURULMAZ.
   Kayıt yoksa dönen durum "oturum yok" DEĞİL, "oturum kaydı bağlı değil"dir:
   tedarikçi pekâlâ bağlanmış olabilir, biz görmüyoruzdur. Boş liste
   döndürmek "hiç oturum olmadı" demek olurdu; kastedilen o değil.
   ═══════════════════════════════════════════════════════════════════ */

type Istemci = Prisma.TransactionClient | typeof db;

/** Köken tablosundaki varlık tipi adı. */
export const OTURUM_VARLIK_TIPI = 'TedarikciErisimOturumu';

/** true / false / null=bilinmiyor. `undefined` de bilinmiyordur. */
export type UcDegerAlan = boolean | null;

const ucDeger = (v: boolean | null | undefined): UcDegerAlan => (v === undefined ? null : v);

export const OTURUM_ALAN_SOZU = {
  onayli: { evet: 'onaylı', hayir: 'onaysız', bilinmiyor: 'onay durumu bilinmiyor' },
  mfaVar: { evet: 'MFA var', hayir: 'MFA yok', bilinmiyor: 'MFA durumu bilinmiyor' },
  izlendi: { evet: 'izlendi', hayir: 'izlenmedi', bilinmiyor: 'izlenip izlenmediği bilinmiyor' },
} as const;

/* ═══ 1 · Dış kaynaktan oturum yazımı ═════════════════════════════════ */

export type OturumGozlemi = {
  koken: Koken;
  /** İkisinden biri zorunlu; ikisi de çözülemezse kayıt YAZILMAZ, fırlatılır. */
  tedarikciId?: string | null;
  tedarikciAdi?: string | null;
  hesapId?: string | null;
  tesisId?: string | null;
  varlikId?: string | null;
  sistemId?: string | null;
  baslangic: Date;
  bitis?: Date | null;
  /** Üç değerli — verilmezse null (bilinmiyor), false DEĞİL. */
  onayli?: boolean | null;
  mfaVar?: boolean | null;
  izlendi?: boolean | null;
  talepReferansi?: string | null;
  kayitReferansi?: string | null;
  /** suruyor | tamamlandi | kesildi */
  durum?: string;
};

/**
 * Dış sistemden (PAM, VPN yoğunlaştırıcı, jump host günlüğü) gelen bir
 * erişim oturumunu idempotent yazar ve `kokenYaz()` ile kökenini bırakır.
 *
 * Idempotency `kaynakSistem` + `kaynakKayitId` üzerinden kurulur. Şemada
 * `TedarikciErisimOturumu.kaynakKayitId` kolonu YOK (şema merkezî), bu
 * yüzden eşleştirme `VeriKokeni` tablosu üzerinden dolaylı yapılıyor;
 * kolon eklenirse bu arama düşer (rapordaki şema isteği).
 *
 * Eksik/çözülemeyen kayıt SESSİZCE ATILMAZ — fırlatılır ki çağıran koşu
 * onu "reddedilen" sayacına yazsın.
 */
export async function oturumYaz(g: OturumGozlemi): Promise<{ id: string; yeni: boolean }> {
  if (!g.koken?.kaynakSistem) {
    throw new Error('oturumYaz: kaynakSistem zorunlu — kaynağı bilinmeyen veri otomatik sayılamaz');
  }
  if (!g.koken?.kaynakKayitId) {
    throw new Error('oturumYaz: kaynakKayitId zorunlu — idempotency buna dayanır');
  }
  if (!(g.baslangic instanceof Date) || Number.isNaN(g.baslangic.getTime())) {
    throw new Error('oturumYaz: baslangic geçerli bir tarih olmalı');
  }
  if (g.bitis && g.bitis.getTime() < g.baslangic.getTime()) {
    throw new Error('oturumYaz: bitis baslangictan önce olamaz');
  }

  return db.$transaction(async (tx) => {
    const tedarikciId = await tedarikciCoz(tx, g);

    const mevcutId = await eslesenOturumId(tx, g.koken.kaynakSistem, g.koken.kaynakKayitId);
    const veri = {
      tedarikciId,
      hesapId: g.hesapId ?? null,
      tesisId: g.tesisId ?? null,
      varlikId: g.varlikId ?? null,
      sistemId: g.sistemId ?? null,
      baslangic: g.baslangic,
      bitis: g.bitis ?? null,
      kaynakSistem: g.koken.kaynakSistem,
      kaynakKayitId: g.koken.kaynakKayitId,
      // Üç değerli alanlar OLDUĞU GİBİ geçer; undefined → null (bilinmiyor).
      onayli: ucDeger(g.onayli),
      mfaVar: ucDeger(g.mfaVar),
      izlendi: ucDeger(g.izlendi),
      talepReferansi: g.talepReferansi ?? null,
      kayitReferansi: g.kayitReferansi ?? null,
      durum: g.durum ?? (g.bitis ? 'tamamlandi' : 'suruyor'),
    };

    const kayit = mevcutId
      ? await tx.tedarikciErisimOturumu.update({ where: { id: mevcutId }, data: veri })
      : await tx.tedarikciErisimOturumu.create({ data: veri });

    await kokenYaz({
      varlikTipi: OTURUM_VARLIK_TIPI,
      varlikId: kayit.id,
      kaynakSistem: g.koken.kaynakSistem,
      kaynakKayitId: g.koken.kaynakKayitId,
      toplanma: g.koken.toplanma ?? null,
      guven: g.koken.guven ?? null,
    }, tx);

    return { id: kayit.id, yeni: mevcutId === null };
  });
}

async function tedarikciCoz(istemci: Istemci, g: OturumGozlemi): Promise<string> {
  if (g.tedarikciId) {
    const t = await istemci.tedarikci.findUnique({
      where: { id: g.tedarikciId }, select: { id: true } });
    if (!t) throw new Error(`oturumYaz: tedarikçi bulunamadı (${g.tedarikciId})`);
    return t.id;
  }
  if (g.tedarikciAdi) {
    const t = await istemci.tedarikci.findFirst({
      where: { ad: g.tedarikciAdi, silindi: null }, select: { id: true } });
    if (!t) throw new Error(`oturumYaz: tedarikçi adı eşleşmedi ("${g.tedarikciAdi}") — `
      + 'eşleşmeyen oturum sessizce atılmaz, reddedilenlere yazılmalı');
    return t.id;
  }
  throw new Error('oturumYaz: tedarikciId ya da tedarikciAdi zorunlu');
}

/** Idempotency araması. (kaynakSistem, kaynakKayitId) tabloda TEKİL'dir;
    kısıt veritabanında durduğu için tek sorgu yeter. Önceki dolaylı
    `VeriKokeni` araması eşzamanlı iki içe aktarımda aynı oturumu iki kez
    yazmaya açıktı. */
async function eslesenOturumId(
  istemci: Istemci, kaynakSistem: string, kaynakKayitId: string,
): Promise<string | null> {
  const kayit = await istemci.tedarikciErisimOturumu.findUnique({
    where: { kaynakSistem_kaynakKayitId: { kaynakSistem, kaynakKayitId } },
    select: { id: true },
  });
  return kayit?.id ?? null;
}

/* ═══ 2 · Uyumsuz oturumlar ═══════════════════════════════════════════ */

export type OturumFiltresi = {
  tedarikciId?: string;
  tesisId?: string;
  /**
   * SANTRAL KAPSAMI — `lib/erisim.ts → izinliTesisIdleri` sözleşmesiyle
   * BİREBİR aynı: `null`/verilmemiş = tüm santraller, `[]` = hiçbiri.
   *
   * `tesisId` bir FİLTREdir (kullanıcı bir santrale bakmak istiyor);
   * `tesisIdler` bir SINIRdır (kullanıcı ancak bunları görebilir). İkisi
   * birlikte verilirse ikisi de uygulanır: kapsam dışı bir `tesisId`
   * filtresi boş sonuç döndürür, kapsamı GENİŞLETMEZ.
   *
   * Santrali `null` olan (BİLİNMEYEN) oturum, ancak kapsamı sınırsız olan
   * kullanıcıya görünür — `lib/api/yetki.ts → tesisKapsamda` ile aynı
   * kural: kapsamı daraltılmış birine "hangi santralde olduğu bilinmeyen"
   * bir erişim kaydını göstermek, kapsam sınırını sessizce delmek olurdu.
   */
  tesisIdler?: string[] | null;
  varlikId?: string;
  sistemId?: string;
  kaynakSistem?: string;
  /** Yalnız bu tarihten sonra başlayan oturumlar. */
  baslangicSonrasi?: Date;
  baslangicOncesi?: Date;
};

export type OturumSatiri = {
  id: string; tedarikciId: string; tedarikciAdi: string;
  hesapId: string | null; tesisId: string | null; varlikId: string | null;
  sistemId: string | null; baslangic: Date; bitis: Date | null;
  kaynakSistem: string;
  onayli: UcDegerAlan; mfaVar: UcDegerAlan; izlendi: UcDegerAlan;
  talepReferansi: string | null; kayitReferansi: string | null; durum: string;
};

export type OturumDegerlendirmesi = {
  oturum: OturumSatiri;
  /** Kanıtlı ihlaller (alan === false). */
  ihlaller: string[];
  /** Ölçülmemiş alanlar (alan === null). İhlal DEĞİL. */
  bilinmeyenler: string[];
  sinif: 'uyumsuz' | 'bilinmeyen' | 'uyumlu';
};

export type OturumKapsami = 'kaynak_bagli_degil' | 'kayit_yok' | 'kayit_var';

export type UyumsuzOturumRaporu = {
  /** Sistemde tek bir oturum kaydı bile var mı. */
  kaynakBagli: boolean;
  kapsam: OturumKapsami;
  gerekce: string;
  /** En az bir alanı kanıtlı olumsuz olan oturumlar. */
  uyumsuz: OturumDegerlendirmesi[];
  /** İhlali olmayan ama en az bir alanı ölçülmemiş oturumlar. AYRI SAYILIR. */
  bilinmeyen: OturumDegerlendirmesi[];
  uyumluSayisi: number;
  toplam: number;
  /** Alan bazında sayaçlar — olumsuz ile bilinmeyen ayrı kolonlarda. */
  sayaclar: {
    onaysiz: number; mfasiz: number; izlenmeyen: number;
    onayBilinmiyor: number; mfaBilinmiyor: number; izlemeBilinmiyor: number;
  };
};

function degerlendir(o: OturumSatiri): OturumDegerlendirmesi {
  const ihlaller: string[] = [];
  const bilinmeyenler: string[] = [];

  if (o.onayli === false) ihlaller.push('onay kaydı yok (kaynak sistem "onaysız" diyor)');
  else if (o.onayli === null) bilinmeyenler.push('onay durumu kaynak sistemde raporlanmıyor');

  if (o.mfaVar === false) ihlaller.push('çok faktörlü doğrulama kullanılmamış');
  else if (o.mfaVar === null) bilinmeyenler.push('MFA kullanılıp kullanılmadığı raporlanmıyor');

  if (o.izlendi === false) ihlaller.push('oturum izlenmemiş / kaydı alınmamış');
  else if (o.izlendi === null) bilinmeyenler.push('oturumun izlenip izlenmediği raporlanmıyor');

  // Talep referansı olmayan oturum tek başına ihlal sayılmaz: onay alanı
  // zaten üç değerli ve asıl kanıt orada. Yalnız bağlam olarak taşınır.
  return {
    oturum: o, ihlaller, bilinmeyenler,
    sinif: ihlaller.length > 0 ? 'uyumsuz' : bilinmeyenler.length > 0 ? 'bilinmeyen' : 'uyumlu',
  };
}

/**
 * Onayı olmayan / MFA'sız / izlenmeyen oturumlar.
 *
 * BİLİNMEYEN AYRI SAYILIR: `uyumsuz` yalnız kanıtlı olumsuzları (false)
 * taşır; ölçülmemiş alanlar (null) `bilinmeyen` listesine gider. Bir
 * oturumda hem ihlal hem bilinmeyen olabilir — o oturum `uyumsuz` sayılır
 * ama bilinmeyen alanları yine de kendi metninde görünür.
 */
export async function uyumsuzOturumlar(filtre: OturumFiltresi = {}): Promise<UyumsuzOturumRaporu> {
  const toplamKayit = await db.tedarikciErisimOturumu.count();

  /* Kapsam sınırı ile santral filtresi TEK koşulda birleşir. Ayrı ayrı
     yayılsalardı ikinci `tesisId` anahtarı birincisini EZERDİ — yani
     kapsam dışı bir filtre kapsamı genişletirdi. Kesişim alınır:
     kapsam dışı bir filtre boş küme verir (`{ in: [] }`), asla geniş küme. */
  const kapsamIdleri = filtre.tesisIdler;
  const tesisKosulu = kapsamIdleri != null
    ? { tesisId: { in: filtre.tesisId ? kapsamIdleri.filter((t) => t === filtre.tesisId) : kapsamIdleri } }
    : (filtre.tesisId ? { tesisId: filtre.tesisId } : {});

  const satirlar = await db.tedarikciErisimOturumu.findMany({
    where: {
      ...(filtre.tedarikciId ? { tedarikciId: filtre.tedarikciId } : {}),
      ...tesisKosulu,
      ...(filtre.varlikId ? { varlikId: filtre.varlikId } : {}),
      ...(filtre.sistemId ? { sistemId: filtre.sistemId } : {}),
      ...(filtre.kaynakSistem ? { kaynakSistem: filtre.kaynakSistem } : {}),
      ...(filtre.baslangicSonrasi || filtre.baslangicOncesi
        ? { baslangic: {
          ...(filtre.baslangicSonrasi ? { gte: filtre.baslangicSonrasi } : {}),
          ...(filtre.baslangicOncesi ? { lt: filtre.baslangicOncesi } : {}),
        } }
        : {}),
    },
    orderBy: { baslangic: 'desc' },
    include: { tedarikci: { select: { ad: true } } },
  });

  const degerlendirmeler = satirlar.map((s) => degerlendir({
    id: s.id, tedarikciId: s.tedarikciId, tedarikciAdi: s.tedarikci.ad,
    hesapId: s.hesapId, tesisId: s.tesisId, varlikId: s.varlikId, sistemId: s.sistemId,
    baslangic: s.baslangic, bitis: s.bitis, kaynakSistem: s.kaynakSistem,
    onayli: s.onayli, mfaVar: s.mfaVar, izlendi: s.izlendi,
    talepReferansi: s.talepReferansi, kayitReferansi: s.kayitReferansi, durum: s.durum,
  }));

  const kapsam: OturumKapsami = toplamKayit === 0 ? 'kaynak_bagli_degil'
    : satirlar.length === 0 ? 'kayit_yok' : 'kayit_var';

  const gerekce = kapsam === 'kaynak_bagli_degil'
    ? 'Oturum kaydı bağlı değil — hiçbir PAM/VPN kaynağından oturum metadata\'sı '
      + 'akmıyor. Bu "oturum olmadı" DEMEK DEĞİLDİR; oturumları görmüyoruz.'
    : kapsam === 'kayit_yok'
      ? 'Kaynak bağlı ama bu filtreye uyan oturum raporlanmamış — filtre dışında '
        + 'oturum olmuş olabilir; "hiç erişilmedi" kanıtı değildir.'
      : `${satirlar.length} oturum değerlendirildi.`;

  const say = (f: (o: OturumSatiri) => boolean) =>
    degerlendirmeler.filter((d) => f(d.oturum)).length;

  return {
    kaynakBagli: toplamKayit > 0,
    kapsam,
    gerekce,
    uyumsuz: degerlendirmeler.filter((d) => d.sinif === 'uyumsuz'),
    bilinmeyen: degerlendirmeler.filter((d) => d.sinif === 'bilinmeyen'),
    uyumluSayisi: degerlendirmeler.filter((d) => d.sinif === 'uyumlu').length,
    toplam: degerlendirmeler.length,
    sayaclar: {
      onaysiz: say((o) => o.onayli === false),
      mfasiz: say((o) => o.mfaVar === false),
      izlenmeyen: say((o) => o.izlendi === false),
      onayBilinmiyor: say((o) => o.onayli === null),
      mfaBilinmiyor: say((o) => o.mfaVar === null),
      izlemeBilinmiyor: say((o) => o.izlendi === null),
    },
  };
}

/* ═══ 3 · Tedarikçi özeti (ekranın çağıracağı sorgu) ══════════════════ */

export type TedarikciOturumOzeti = {
  tedarikciId: string;
  tedarikciAdi: string;
  /** Envanterdeki beyan: true kayıt alınıyor · false alınmıyor · null bilinmiyor. */
  oturumKaydiBeyani: UcDegerAlan;
  uzaktanErisimVar: boolean;
  kapsam: OturumKapsami;
  /** Ekranda gösterilecek tek cümle — "oturum yok" ASLA yazmaz. */
  gerekce: string;
  toplam: number;
  uyumsuzSayisi: number;
  bilinmeyenSayisi: number;
  uyumluSayisi: number;
  sayaclar: UyumsuzOturumRaporu['sayaclar'];
  sonOturum: { baslangic: Date; bitis: Date | null; kaynakSistem: string; durum: string } | null;
  suren: number;
  kaynakSistemler: string[];
  /** Beyan ile gerçek kayıt akışının çeliştiği yerler. */
  tutarsizliklar: string[];
};

/**
 * Tedarikçi çekmecesinin/ekranın çağıracağı özet.
 *
 * Kayıt yoksa `kapsam` 'kaynak_bagli_degil' ya da 'kayit_yok' döner;
 * hiçbir durumda "bu tedarikçi hiç bağlanmadı" iddiası üretilmez.
 *
 * `kapsam.tesisIdler` — `izinliTesisIdleri` sözleşmesiyle aynı: null = tümü,
 * [] = hiçbiri. VERİLMEZSE ÖZET TÜM SANTRALLERİ SAYAR; bu yüzden ekran
 * katmanı kullanıcının kapsamını GEÇMEK ZORUNDADIR. Parametresiz çağrı
 * bilerek "sistem geneli" anlamındadır (motor/rapor tarafı), ekran değil:
 * kapsamı daraltılmış bir kullanıcıya yetkisi olmayan santralin oturum
 * sayısını göstermek, satırı göstermeden veriyi sızdırmak olurdu.
 */
export async function tedarikciOturumOzeti(
  tedarikciId: string,
  kapsam: { tesisIdler?: string[] | null } = {},
): Promise<TedarikciOturumOzeti> {
  const tedarikci = await db.tedarikci.findUnique({
    where: { id: tedarikciId },
    select: { id: true, ad: true, oturumKaydiVar: true, uzaktanErisimVar: true,
      uzaktanErisimYontemi: true },
  });
  if (!tedarikci) throw new Error(`tedarikciOturumOzeti: tedarikçi bulunamadı (${tedarikciId})`);

  const rapor = await uyumsuzOturumlar({ tedarikciId, tesisIdler: kapsam.tesisIdler });

  /* "Son oturum", "kaynak sistemler" ve "süren oturum" sayacı da AYNI kapsam
     süzgecinden geçer. Yalnız `uyumsuzOturumlar`ı daraltıp bu üç sorguyu
     serbest bırakmak, satırı göstermeden "kapsam dışında bir oturum var"
     bilgisini sızdırırdı — kapsam sınırı sayaçta da geçerlidir. */
  const kapsamKosulu = kapsam.tesisIdler != null
    ? { tesisId: { in: kapsam.tesisIdler } } : {};
  const sonKayit = await db.tedarikciErisimOturumu.findFirst({
    where: { tedarikciId, ...kapsamKosulu },
    orderBy: { baslangic: 'desc' },
    select: { baslangic: true, bitis: true, kaynakSistem: true, durum: true },
  });
  const kaynakSistemler = [...new Set(
    (await db.tedarikciErisimOturumu.findMany({
      where: { tedarikciId, ...kapsamKosulu }, select: { kaynakSistem: true },
    })).map((x) => x.kaynakSistem),
  )].sort();
  const suren = await db.tedarikciErisimOturumu.count({
    where: { tedarikciId, durum: 'suruyor', ...kapsamKosulu } });

  const tutarsizliklar: string[] = [];
  if (tedarikci.oturumKaydiVar === true && rapor.toplam === 0) {
    tutarsizliklar.push('Envanterde "oturum kaydı alınıyor" beyan edilmiş, ama hiçbir kaynaktan '
      + 'bu tedarikçi için oturum metadata\'sı akmıyor — beyan doğrulanamıyor.');
  }
  if (tedarikci.oturumKaydiVar === false && rapor.toplam > 0) {
    tutarsizliklar.push('Envanterde "oturum kaydı alınmıyor" beyan edilmiş, ama kaynaktan '
      + `${rapor.toplam} oturum kaydı geliyor — beyan güncellenmeli.`);
  }
  if (tedarikci.oturumKaydiVar === null) {
    tutarsizliklar.push('Envanterde oturum kaydı alınıp alınmadığı BİLİNMİYOR '
      + '(alınmıyor değil) — doğrulanmadan kapalı sayılamaz.');
  }
  if (tedarikci.uzaktanErisimVar && rapor.kapsam === 'kaynak_bagli_degil') {
    tutarsizliklar.push('Uzaktan erişimi açık bir tedarikçi ama oturum kaynağı hiç bağlı değil — '
      + 'erişimler görünmüyor.');
  }
  if (rapor.sayaclar.izlenmeyen > 0) {
    tutarsizliklar.push(`${rapor.sayaclar.izlenmeyen} oturum kaynağa göre izlenmemiş — `
      + 'geriye dönük "kim ne yaptı" gösterilemez.');
  }

  const gerekce = rapor.kapsam === 'kaynak_bagli_degil'
    ? 'Oturum kaydı bağlı değil — bu tedarikçinin erişimleri ölçülmüyor. '
      + '"Oturum yok" DEĞİL, "oturumu göremiyoruz".'
    : rapor.kapsam === 'kayit_yok'
      ? 'Oturum kaynağı bağlı, ama bu tedarikçi için raporlanmış oturum yok — '
        + 'kaynağın kapsamı dışında kalmış olabilir.'
      : `${rapor.toplam} oturum: ${rapor.uyumsuz.length} uyumsuz, `
        + `${rapor.bilinmeyen.length} ölçülmemiş, ${rapor.uyumluSayisi} uyumlu.`;

  return {
    tedarikciId: tedarikci.id,
    tedarikciAdi: tedarikci.ad,
    oturumKaydiBeyani: tedarikci.oturumKaydiVar,
    uzaktanErisimVar: tedarikci.uzaktanErisimVar,
    kapsam: rapor.kapsam,
    gerekce,
    toplam: rapor.toplam,
    uyumsuzSayisi: rapor.uyumsuz.length,
    bilinmeyenSayisi: rapor.bilinmeyen.length,
    uyumluSayisi: rapor.uyumluSayisi,
    sayaclar: rapor.sayaclar,
    sonOturum: sonKayit,
    suren,
    kaynakSistemler,
    tutarsizliklar,
  };
}

/** Herhangi bir oturum kaynağı gerçekten bağlı mı (tek kayıt bile yeter). */
export async function oturumKaynagiBagliMi(): Promise<boolean> {
  return (await db.tedarikciErisimOturumu.count()) > 0;
}

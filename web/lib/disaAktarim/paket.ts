import 'server-only';
import { createHash } from 'node:crypto';
import { db } from '../db';
import { sirMaskesi, sirSizintisiVarMi } from '../entegrasyon/sir';
import { connectorSagligi, type SaglikDurumu } from '../entegrasyon/saglikOzeti';
import {
  disEtkinSaglayici, imzaBeyani, imzaDurumu, type ImzaDurumu,
} from '../uyum/disSaglayicilar';

/* Denetim kanıt paketi (§19) — denetçiye verilen BÜTÜNLÜKLÜ dosya.

   Bugüne kadar dışa aktarım yalnız istemcideydi (components/disaAktar.ts):
   ekrandaki satırlar Excel'e dökülüyordu. Ekranda görünen satır bir
   KANIT DEĞİLDİR — nereden geldiği, hangi koşuda alındığı, kimin ne zaman
   ürettiği ve arada değişip değişmediği yazmıyorsa denetçi onu kabul
   etmez. Bu modül o eksiği kapatır.

   ── Değişmezler ───────────────────────────────────────────────────────

   1. SIR PAKETE GİRMEZ. `Connector.sirReferansi` ham hâliyle hiçbir alana
      yazılmaz; yalnız `sirMaskesi()` çıktısı (sırra giden ADRES) girer.
      Serileştirmeden SONRA `paketiDenetle()` süzgeci koşar ve sızıntı
      bulursa paket ÜRETİLMEZ — maskeleyip geçmek, bir dahaki alan
      eklendiğinde sessiz sızıntı demektir. Üretimi durdurmak gürültülüdür
      ve doğru olan budur.

   2. KÖKEN GİZLENMEZ. Kökeni olmayan kayıt paketten çıkarılmaz; satır
      `kökeni yok` diye işaretlenir. Kökensiz satırı elemek, denetçiye
      "tüm kayıtların kökeni var" yalanını söylerdi.

   3. BİLİNMEYEN ≠ SIFIR. `guven` null ise ÖLÇÜLMEDİ demektir; koşu kaydı
      olmayan connector "başarılı" değil `hic_kosmadi`dır (bu kararı
      saglikOzeti.connectorSagligi verir, burada yeniden üretilmez).

   4. KIRPMA SESSİZ OLMAZ. Denetim izi satırı sınırı aşarsa paket
      `kirpildi: true` ve gerçek sayı ile birlikte gelir; eksik veriyi
      tam gibi göstermek denetimde en pahalı hatadır.

   Bu modül hiçbir dış sisteme bağlanmaz ve HİÇBİR SIR ÇÖZMEZ
   (`siriCoz` burada çağrılmaz). */

/** Paket şemasının sürümü — biçim değişirse denetçi hangi şemayı
    okuduğunu bilsin diye başlıkta taşınır.

    2 · UY-18 imza beyanı başlığa eklendi. Sürüm artırılmasaydı, 1 numaralı
    şemayı bekleyen bir okuyucu imza alanını görmez ve paketi İMZALI
    sanabilirdi; sessiz şema değişikliği tam olarak bu paketin engellemek
    için var olduğu şeydir. */
export const PAKET_SEMA_SURUMU = 2;

/**
 * Paketin imza beyanı.
 *
 * İmza sağlayıcısı kayıt defterinden okunur ve bugün BAĞLI DEĞİLDİR;
 * sonuç daima `imzasiz`tır. Bu bir hata değildir ve paketin üretimini
 * engellemez — paket geçerlidir, damgalıdır ve denetçiye verilebilir.
 * Eksik olan tek şey imzanın kanıtladığı kimliktir ve beyan bunu yazar.
 */
export function paketImzasi(): PaketImzasi {
  const saglayici = disEtkinSaglayici('imza');
  /* İmza ATILMADIĞI için `imzaVar` daima false: bağlı bir sağlayıcı
     olsaydı imza uzakta atılır ve sonucu buraya taşınırdı. */
  const durum: ImzaDurumu = imzaDurumu({ imzaVar: false, dogrulandi: null });
  return { durum, beyan: imzaBeyani(durum), saglayici: saglayici?.ad ?? null };
}

/** Kökeni olmayan satırın taşıdığı işaret. Tek yerde durur; ekran, test ve
    paket aynı sözcüğü kullanır. */
export const KOKEN_YOK = 'kökeni yok';

/** Tek pakete giren en fazla denetim izi satırı. Sınırsız iz, denetçinin
    açamayacağı bir dosya demektir; aşılırsa kırpma AÇIKÇA bildirilir. */
export const IZ_SINIRI = 2000;

/* ═══ Biçimler ════════════════════════════════════════════════════════ */

export type PaketKapsami = {
  regulasyonId: string;
  /** Çağıran YETKİYLE DARALTILMIŞ küme verir; bu modül yetki hesaplamaz. */
  tesisIdleri: string[];
  baslangic: Date;
  bitis: Date;
};

/** Bir kaydın veri kökeni. `bilinen: false` satırı gizlemez, işaretler. */
export type PaketKokeni =
  | {
    bilinen: true;
    kaynakSistem: string;
    /** Kaydı getiren entegrasyon koşusu; null = köken koşu bildirmedi. */
    kosuId: string | null;
    connectorId: string | null;
    /** Kaynağın veriyi topladığı an; null = kaynak söylemedi. */
    toplanma: string | null;
    /** Platforma yazıldığı an. */
    alinma: string;
    /** manuel | otomatik | dogrulanmis */
    guvenEtiketi: string;
    /** 0–1; null = ÖLÇÜLMEDİ (sıfır güven değil). */
    guven: number | null;
    dogrulamaDurumu: string;
  }
  | { bilinen: false; not: typeof KOKEN_YOK };

export type MaddeSatiri = {
  maddeDurumuId: string;
  maddeKodu: string;
  maddeBasligi: string;
  tesisKodu: string;
  surecKodu: string;
  durum: string;
  /** MaddeDurumu.guven — kanıtın niteliği (otomatik_kanit, kanit_yok…). */
  kanitGuveni: string;
  kanitBayat: boolean;
  sonDegerlendirme: string | null;
  koken: PaketKokeni;
};

export type BulguSatiri = {
  id: string;
  baslik: string;
  onemDerecesi: string;
  durum: string;
  /** kapali/kabul_edildi dışındaki her şey açıktır — ekranla aynı kural. */
  acik: boolean;
  tespitTarihi: string;
  /** son tarih (hedef); null = tarih verilmedi */
  hedefTarih: string | null;
  kapanmaTarihi: string | null;
  maddeKodu: string;
  tesisKodu: string;
  koken: PaketKokeni;
};

export type IzSatiri = {
  id: string;
  zaman: string;
  aktor: string | null;
  varlikTipi: string;
  varlikId: string;
  eylem: string;
  alan: string | null;
  gerekce: string | null;
  kaynak: string;
};

export type ConnectorSatiri = {
  kod: string;
  ad: string;
  tip: string;
  /** gelistirme | test | uretim — hangi ortamın sistemine baktığı bir
      GÜVENLİK bilgisidir, paketten düşürülmez. */
  ortam: string;
  etkin: boolean;
  kayitDurumu: string;
  sonKosuDurumu: SaglikDurumu;
  sonKosuZamani: string | null;
  sonBasariliKosu: string | null;
  /* Sırra giden ADRES (maskeli), sırrın kendisi DEĞİL. Alan adı bilerek
     'sir' ile başlamaz: `paketiDenetle` sır adı taşıyan alanları
     reddeder ve bu alan meşru olduğu hâlde tetiklerdi. */
  kimlikAdresi: string;
};

/* UY-18 · İmza beyanı.

   Paket bütünlük damgası (`ozet`) taşır ve bu damga içeriğin
   DEĞİŞMEDİĞİNİ kanıtlar. İmzanın kanıtladığı şey farklıdır: paketi KİMİN
   ürettiği. İkisini aynı şey sanmak denetimde pahalıdır, bu yüzden başlık
   ikisini ayrı ayrı yazar ve imza yoksa "imzasız" der.

   Ürün kendi ürettiği bir anahtarla imza ATMAZ: imzalayanın kimliğini
   kanıtlamayan bir imza, ekranda "imzalandı" yazdığı için imzasız
   olmaktan daha kötüdür (`lib/uyum/disSaglayicilar.ts`). */
export type PaketImzasi = {
  durum: ImzaDurumu;
  /** Denetçinin okuyacağı tam cümle — paket dosyasının İÇİNDE durur. */
  beyan: string;
  /** İmzayı atan sağlayıcı; bağlı değilse `null`. */
  saglayici: string | null;
};

export type PaketBasligi = {
  uretimZamani: string;
  ureten: { id: string; adSoyad: string };
  urunSurumu: string;
  semaSurumu: number;
  kapsam: {
    regulasyon: { id: string; kod: string; ad: string; surum: string | null };
    tesisler: { id: string; kod: string; ad: string }[];
    baslangic: string;
    bitis: string;
    /* Madde durumları ANLIK okunur (bugünkü durum), tarih aralığı bulgu ve
       denetim izine uygulanır. Bunu yazmazsak denetçi madde durumlarının
       da aralığa ait olduğunu sanar. */
    not: string;
  };
  imza: PaketImzasi;
};

export type PaketSayimlari = {
  madde: number;
  /** kökeni olmayan madde satırı — gizlenmedi, sayıldı */
  kokensizMadde: number;
  bulgu: number;
  acikBulgu: number;
  kokensizBulgu: number;
  izSatiri: number;
  /** sınır aşıldı mı; aşıldıysa `izToplami` gerçek sayıyı taşır */
  izKirpildi: boolean;
  izToplami: number;
  connector: number;
};

export type PaketGovdesi = {
  baslik: PaketBasligi;
  maddeler: MaddeSatiri[];
  bulgular: BulguSatiri[];
  denetimIzi: IzSatiri[];
  connectorlar: ConnectorSatiri[];
  sayimlar: PaketSayimlari;
};

/** Bütünlük damgası taşıyan tam paket. `ozet` gövdenin SHA-256'sıdır ve
    hesaba KENDİSİ girmez. */
export type KanitPaketi = PaketGovdesi & { ozet: string };

/* ═══ Bütünlük damgası ════════════════════════════════════════════════ */

/** Anahtarları özyinelemeli sıralayan kanonik biçim. Denetçi paketi başka
    bir araçla yeniden serileştirse bile aynı özeti bulabilsin diye anahtar
    SIRASI özetin parçası olmaktan çıkarılır. */
function kanonik(deger: unknown): unknown {
  if (Array.isArray(deger)) return deger.map(kanonik);
  if (deger !== null && typeof deger === 'object') {
    const kaynak = deger as Record<string, unknown>;
    const cikti: Record<string, unknown> = {};
    for (const anahtar of Object.keys(kaynak).sort()) cikti[anahtar] = kanonik(kaynak[anahtar]);
    return cikti;
  }
  return deger;
}

/** Özetin üzerinde hesaplandığı metin — `ozet` alanı DIŞARIDA bırakılır. */
export function paketMetni(paket: PaketGovdesi | KanitPaketi): string {
  const govde: Record<string, unknown> = { ...paket };
  delete govde.ozet;
  return JSON.stringify(kanonik(govde), null, 2);
}

export function paketOzeti(paket: PaketGovdesi | KanitPaketi): string {
  return createHash('sha256').update(paketMetni(paket), 'utf8').digest('hex');
}

/** Denetçinin elindeki dosyanın değişmediğini kanıtlar. */
export function ozetDogrula(paket: KanitPaketi): boolean {
  return paketOzeti(paket) === paket.ozet;
}

/* ═══ Sır süzgeci ═════════════════════════════════════════════════════ */

/* Alan adı kara listesi. Normalize edilmiş (küçük harf, harf-rakam dışı
   atılmış) anahtar bunlardan birini İÇERİYORSA paket üretilmez. Liste
   bilerek geniştir: yanlış pozitif bir alanı yeniden adlandırmak ucuz,
   yanlış negatif denetçiye giden bir sırdır. */
const YASAKLI_ALAN_PARCALARI = [
  'parola', 'password', 'passwd', 'pwd', 'sifre',
  'token', 'secret', 'apikey', 'clientsecret', 'privatekey', 'privkey',
  'credential', 'kimlikbilgisi', 'authorization', 'cookie', 'bearer',
  'sirdegeri', 'sirreferansi',
] as const;

/* Değer kalıpları: alan adı masum olsa bile içerik kendini ele veriyorsa
   yakalanır (bir hata metnine yapıştırılmış başlık, bir PEM anahtarı). */
const YASAKLI_DEGER_KALIPLARI: { ad: string; kalip: RegExp }[] = [
  { ad: 'PEM özel anahtar bloğu', kalip: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { ad: 'Authorization: Bearer başlığı', kalip: /\bbearer\s+[A-Za-z0-9._~+/-]{16,}/i },
  { ad: 'Basic kimlik başlığı', kalip: /\bbasic\s+[A-Za-z0-9+/]{16,}={0,2}/i },
];

export type Sizinti = { yol: string; sebep: string };

function normalizeAnahtar(anahtar: string): string {
  return anahtar.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Serileştirilmiş paketi tarar. İki hat:
 *   · alan ADI kara listede mi (yeni eklenen bir alanı da yakalar),
 *   · değer bilinen bir sırrı ya da bilinen bir kimlik kalıbını taşıyor mu.
 *
 * `bilinenSirlar` çağıranın elindeki HAM değerlerdir (connector'ların ham
 * `sirReferansi` alanları gibi) — pakete ham girmemesi gerekenler.
 * `sirSizintisiVarMi` ile karşılaştırılır; o yardımcı 6 karakterden kısa
 * değerleri elemek dahil kuralı zaten taşıyor, burada ikinci bir kopyası
 * yazılmaz.
 */
export function sizintilariAra(
  json: string,
  bilinenSirlar: readonly (string | null | undefined)[] = [],
): Sizinti[] {
  let kok: unknown;
  try {
    kok = JSON.parse(json);
  } catch {
    throw new Error('sizintilariAra: geçerli JSON bekleniyor — paket serileştirilmemiş');
  }

  const bulunanlar: Sizinti[] = [];

  const gez = (deger: unknown, yol: string): void => {
    if (Array.isArray(deger)) {
      deger.forEach((oge, i) => gez(oge, `${yol}[${i}]`));
      return;
    }
    if (deger !== null && typeof deger === 'object') {
      for (const [anahtar, alt] of Object.entries(deger as Record<string, unknown>)) {
        const altYol = yol ? `${yol}.${anahtar}` : anahtar;
        const ad = normalizeAnahtar(anahtar);
        const parca = YASAKLI_ALAN_PARCALARI.find((p) => ad.includes(p));
        if (parca) {
          bulunanlar.push({
            yol: altYol,
            sebep: `alan adı sır taşıyor olabilir ('${parca}')`,
          });
        }
        gez(alt, altYol);
      }
      return;
    }
    if (typeof deger !== 'string') return;
    for (const k of YASAKLI_DEGER_KALIPLARI) {
      if (k.kalip.test(deger)) bulunanlar.push({ yol, sebep: `değer ${k.ad} içeriyor` });
    }
    for (const sir of bilinenSirlar) {
      if (sirSizintisiVarMi(deger, sir ?? null)) {
        bulunanlar.push({ yol, sebep: 'değer ham sır/sır referansı içeriyor' });
      }
    }
  };

  gez(kok, '');

  /* İkinci hat: gövdeyi metin olarak da süz. Bir sır alan ADINA ya da
     gezinmenin ulaşamadığı bir yere gömülmüşse buradan çıkar. */
  for (const sir of bilinenSirlar) {
    if (sirSizintisiVarMi(json, sir ?? null)
      && !bulunanlar.some((b) => b.sebep.startsWith('değer ham sır'))) {
      bulunanlar.push({ yol: '(paket gövdesi)', sebep: 'ham sır/sır referansı metinde geçiyor' });
    }
  }

  return bulunanlar;
}

/**
 * Süzgecin kendisi. Sızıntı varsa FIRLATIR — sessizce maskelemez.
 *
 * Maskeleyip geçmek, bir dahaki alan eklendiğinde sessiz sızıntı demektir:
 * kimse fark etmez, paket denetçiye gider. Üretimi durdurmak gürültülüdür
 * ve gürültü burada doğru davranıştır.
 */
export function paketiDenetle(
  json: string,
  bilinenSirlar: readonly (string | null | undefined)[] = [],
): void {
  const bulunanlar = sizintilariAra(json, bilinenSirlar);
  if (bulunanlar.length === 0) return;
  const liste = bulunanlar.map((b) => `${b.yol || '(kök)'}: ${b.sebep}`).join(' · ');
  throw new Error(
    `Kanıt paketi ÜRETİLMEDİ — sır sızıntısı süzgeci ${bulunanlar.length} bulgu verdi: ${liste}`,
  );
}

/* ═══ Toplama ═════════════════════════════════════════════════════════ */

const ACIK_OLMAYAN = new Set(['kapali', 'kabul_edildi']);

const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** Köken satırlarını (varlıkTipi, varlıkId) → paket kökeni haritasına çevirir.
    `kokenHaritasi` yeniden kullanılamadı: o yardımcı koşu kimliğini ve
    alınma zamanını DÜŞÜRÜYOR, kanıt paketinde ikisi de zorunlu. Kazanan
    satır kuralı ise onunla aynı: en yeni kayıt, doğrulanmış olan öne geçer. */
async function kokenleriTopla(
  hedefler: { varlikTipi: string; idler: string[] }[],
): Promise<Map<string, PaketKokeni>> {
  const harita = new Map<string, PaketKokeni>();
  for (const hedef of hedefler) {
    if (hedef.idler.length === 0) continue;
    const satirlar = await db.veriKokeni.findMany({
      where: { varlikTipi: hedef.varlikTipi, varlikId: { in: hedef.idler } },
      orderBy: { aktarim: 'desc' },
      select: {
        varlikId: true, kokenTipi: true, kaynakSistem: true, kosuId: true,
        connectorId: true, toplanma: true, aktarim: true, guven: true,
        dogrulamaDurumu: true,
      },
    });
    for (const s of satirlar) {
      const anahtar = `${hedef.varlikTipi}|${s.varlikId}`;
      const mevcut = harita.get(anahtar);
      const dogrulandi = s.dogrulamaDurumu === 'dogrulandi';
      if (mevcut && !(dogrulandi && mevcut.bilinen && mevcut.dogrulamaDurumu !== 'dogrulandi')) {
        continue;
      }
      harita.set(anahtar, {
        bilinen: true,
        kaynakSistem: s.kaynakSistem,
        kosuId: s.kosuId,
        connectorId: s.connectorId,
        toplanma: iso(s.toplanma),
        alinma: s.aktarim.toISOString(),
        guvenEtiketi: dogrulandi ? 'dogrulanmis' : s.kokenTipi,
        guven: s.guven,
        dogrulamaDurumu: s.dogrulamaDurumu,
      });
    }
  }
  return harita;
}

const kokensiz = (): PaketKokeni => ({ bilinen: false, not: KOKEN_YOK });

/* ═══ Üretim ══════════════════════════════════════════════════════════ */

export type PaketUretimi = { paket: KanitPaketi; json: string };

/**
 * Kanıt paketini üretir. Yetki bu katmanda HESAPLANMAZ: çağıran
 * (lib/eylemler2/disaAktarim.ts) izinli tesis kümesini daraltıp verir —
 * yetkiyi iki yerde hesaplamak, ikisinin sessizce ayrışması demektir.
 *
 * Akış: topla → gövde → serileştir → SÜZ → damgala. Süzgeç gövdeyi
 * gördükten sonra koşar; damga süzgeçten geçen içeriğin üstüne basılır.
 */
export async function kanitPaketiUret(girdi: {
  kapsam: PaketKapsami;
  ureten: { id: string; adSoyad: string };
  urunSurumu: string;
  simdi?: Date;
}): Promise<PaketUretimi> {
  const { kapsam, ureten } = girdi;
  const simdi = girdi.simdi ?? new Date();

  if (kapsam.tesisIdleri.length === 0) {
    // Boş kapsam sessizce boş paket üretmez: denetçi eline geçen boş
    // dosyayı "bu santralde kayıt yok" diye okur, oysa kapsam hiç yoktur.
    throw new Error('Kanıt paketi için en az bir santral kapsama girmeli');
  }
  if (kapsam.bitis < kapsam.baslangic) {
    throw new Error('Kapsam bitişi başlangıçtan önce olamaz');
  }

  const regulasyon = await db.regulasyon.findUnique({
    where: { id: kapsam.regulasyonId },
    select: { id: true, kod: true, ad: true, surum: true },
  });
  if (!regulasyon) throw new Error('Regülasyon bulunamadı');

  const tesisler = await db.tesis.findMany({
    where: { id: { in: kapsam.tesisIdleri } },
    orderBy: { kod: 'asc' },
    select: { id: true, kod: true, ad: true },
  });
  if (tesisler.length === 0) throw new Error('Kapsamdaki santraller bulunamadı');

  const maddeDurumlari = await db.maddeDurumu.findMany({
    where: {
      tesisId: { in: tesisler.map((t) => t.id) },
      surec: { regulasyonId: regulasyon.id },
    },
    orderBy: [{ tesisId: 'asc' }, { maddeId: 'asc' }],
    select: {
      id: true, durum: true, guven: true, kanitBayat: true, sonDegerlendirme: true,
      madde: { select: { kod: true, baslik: true } },
      tesis: { select: { kod: true } },
      surec: { select: { kod: true } },
    },
  });

  const hamBulgular = await db.bulgu.findMany({
    where: { silindi: null, maddeDurumuId: { in: maddeDurumlari.map((m) => m.id) } },
    orderBy: { tespitTarihi: 'desc' },
    select: {
      id: true, baslik: true, onemDerecesi: true, durum: true, tespitTarihi: true,
      hedefTarih: true, kapanmaTarihi: true,
      maddeDurumu: { select: { madde: { select: { kod: true } }, tesis: { select: { kod: true } } } },
    },
  });

  /* Aralıkta TESPİT edilmiş ya da aralık sonunda hâlâ AÇIK olan bulgu
     pakete girer. Yalnız tespit tarihine bakmak, aralıktan önce açılıp
     hâlâ kapanmamış bulguyu — denetimin en çok ilgilendiği kaydı —
     paketin dışında bırakırdı. */
  const bulgular = hamBulgular.filter((b) => {
    const aralikta = b.tespitTarihi >= kapsam.baslangic && b.tespitTarihi <= kapsam.bitis;
    const sonundaAcik = b.tespitTarihi <= kapsam.bitis
      && (b.kapanmaTarihi === null || b.kapanmaTarihi > kapsam.bitis);
    return aralikta || sonundaAcik;
  });

  const kokenler = await kokenleriTopla([
    { varlikTipi: 'MaddeDurumu', idler: maddeDurumlari.map((m) => m.id) },
    { varlikTipi: 'Bulgu', idler: bulgular.map((b) => b.id) },
  ]);
  const kokenAl = (tip: string, id: string): PaketKokeni =>
    kokenler.get(`${tip}|${id}`) ?? kokensiz();

  /* Denetim izi: paketteki KAYITLARA ait satırlar + kapsamdaki santral ve
     regülasyon satırları. varlikId cuid olduğu için tip ayrıca eşlenmez. */
  const izHedefleri = [
    ...maddeDurumlari.map((m) => m.id),
    ...bulgular.map((b) => b.id),
    ...tesisler.map((t) => t.id),
    regulasyon.id,
  ];
  const izKosulu = {
    zaman: { gte: kapsam.baslangic, lte: kapsam.bitis },
    varlikId: { in: izHedefleri },
  };
  const [izToplami, izSatirlari] = await Promise.all([
    db.aktiviteKaydi.count({ where: izKosulu }),
    db.aktiviteKaydi.findMany({
      where: izKosulu,
      orderBy: { zaman: 'desc' },
      take: IZ_SINIRI,
      select: {
        id: true, zaman: true, varlikTipi: true, varlikId: true, eylem: true,
        alan: true, gerekce: true, kaynak: true,
        aktor: { select: { adSoyad: true } },
      },
    }),
  ]);

  /* Connector envanteri kapsam santralinden bağımsızdır: denetçi "bu
     veriyi hangi entegrasyonlar besliyor" sorusunu tüm envanter üzerinden
     sorar. Sağlık kararı saglikOzeti'nden gelir; burada yeniden üretilmez. */
  const connectorlar = await db.connector.findMany({
    where: { silindi: null },
    orderBy: [{ etkin: 'desc' }, { kod: 'asc' }],
    select: {
      id: true, kod: true, ad: true, tip: true, durum: true, kaynakSistem: true,
      kimlikTipi: true, sirReferansi: true, pollAralikDk: true, ortam: true,
      sonBasariliKosu: true, sonHata: true, etkin: true, imlec: true,
    },
  });
  const sonKosular = await Promise.all(connectorlar.map((c) => db.entegrasyonKosusu.findMany({
    where: { connectorId: c.id },
    orderBy: { baslangic: 'desc' },
    take: 1,
    select: {
      id: true, durum: true, tetikleyen: true, baslangic: true, bitis: true,
      sureMs: true, alinan: true, kabulEdilen: true, reddedilen: true,
      yinelenen: true, denemeNo: true, imlecOnce: true, imlecSonra: true,
      hata: true, ayrinti: true,
    },
  })));

  const connectorSatirlari: ConnectorSatiri[] = connectorlar.map((c, i) => {
    const saglik = connectorSagligi(c, sonKosular[i], { simdi });
    return {
      kod: c.kod,
      ad: c.ad,
      tip: c.tip,
      ortam: c.ortam,
      etkin: c.etkin,
      kayitDurumu: c.durum,
      sonKosuDurumu: saglik.durum,
      sonKosuZamani: saglik.sonKosu?.baslangic ?? null,
      sonBasariliKosu: saglik.sonBasariliKosu,
      // Ham referans DEĞİL, maskesi. Süzgeç bunu ayrıca doğrular.
      kimlikAdresi: sirMaskesi(c.sirReferansi),
    };
  });

  const maddeSatirlari: MaddeSatiri[] = maddeDurumlari.map((m) => ({
    maddeDurumuId: m.id,
    maddeKodu: m.madde.kod,
    maddeBasligi: m.madde.baslik,
    tesisKodu: m.tesis.kod,
    surecKodu: m.surec.kod,
    durum: m.durum,
    kanitGuveni: m.guven,
    kanitBayat: m.kanitBayat,
    sonDegerlendirme: iso(m.sonDegerlendirme),
    koken: kokenAl('MaddeDurumu', m.id),
  }));

  const bulguSatirlari: BulguSatiri[] = bulgular.map((b) => ({
    id: b.id,
    baslik: b.baslik,
    onemDerecesi: b.onemDerecesi,
    durum: b.durum,
    acik: !ACIK_OLMAYAN.has(b.durum),
    tespitTarihi: b.tespitTarihi.toISOString(),
    hedefTarih: iso(b.hedefTarih),
    kapanmaTarihi: iso(b.kapanmaTarihi),
    maddeKodu: b.maddeDurumu.madde.kod,
    tesisKodu: b.maddeDurumu.tesis.kod,
    koken: kokenAl('Bulgu', b.id),
  }));

  const izler: IzSatiri[] = izSatirlari.map((a) => ({
    id: a.id,
    zaman: a.zaman.toISOString(),
    aktor: a.aktor?.adSoyad ?? null,
    varlikTipi: a.varlikTipi,
    varlikId: a.varlikId,
    eylem: a.eylem,
    alan: a.alan,
    gerekce: a.gerekce,
    kaynak: a.kaynak,
  }));

  const govde: PaketGovdesi = {
    baslik: {
      uretimZamani: simdi.toISOString(),
      ureten: { id: ureten.id, adSoyad: ureten.adSoyad },
      urunSurumu: girdi.urunSurumu,
      semaSurumu: PAKET_SEMA_SURUMU,
      imza: paketImzasi(),
      kapsam: {
        regulasyon,
        tesisler,
        baslangic: kapsam.baslangic.toISOString(),
        bitis: kapsam.bitis.toISOString(),
        not: 'Madde durumları paketin ÜRETİM ANI itibarıyla alınmıştır; '
          + 'tarih aralığı bulgulara ve denetim izine uygulanır.',
      },
    },
    maddeler: maddeSatirlari,
    bulgular: bulguSatirlari,
    denetimIzi: izler,
    connectorlar: connectorSatirlari,
    sayimlar: {
      madde: maddeSatirlari.length,
      kokensizMadde: maddeSatirlari.filter((m) => !m.koken.bilinen).length,
      bulgu: bulguSatirlari.length,
      acikBulgu: bulguSatirlari.filter((b) => b.acik).length,
      kokensizBulgu: bulguSatirlari.filter((b) => !b.koken.bilinen).length,
      izSatiri: izler.length,
      izKirpildi: izToplami > izler.length,
      izToplami,
      connector: connectorSatirlari.length,
    },
  };

  /* Süzgeç önce gövdenin üstünde koşar: sızıntı varsa damga bile
     basılmaz, paket hiç var olmaz. Ham referanslar süzgece VERİLİR —
     maskelenmiş adresle ham referansı ayırt eden tek şey budur. */
  const hamSirlar = connectorlar.map((c) => c.sirReferansi);
  const govdeMetni = paketMetni(govde);
  paketiDenetle(govdeMetni, hamSirlar);

  const paket: KanitPaketi = { ...govde, ozet: paketOzeti(govde) };
  const json = JSON.stringify(kanonik(paket), null, 2);
  // Damgalı hâli de süzülür: `ozet` alanının kendisi bir şey sızdırmasın.
  paketiDenetle(json, hamSirlar);

  return { paket, json };
}

import type { Durum } from '@/components/kabuk/temel';
import { etiketle, kanitTazelik, KANIT_ESIK_VARSAYILAN, type KanitEsik } from '@/lib/sabitler';
import { an } from '@/lib/an';

/* C21 · Kanıt kütüphanesi — SAF MANTIK (veritabanı ve React yok).

   Liste ekranı üç soruyu yanıtlar ve hepsinin kuralı buradadır:
     · kanıt TAZE mi? — eşik yönetim konsolundan (`kanit.tazelik.*`, B sınıfı);
       sunucu `kanitEsikleri()` ile okur, ekran `esik` prop'uyla alır; kod
       varsayılanı 90 / 180 (`lib/sabitler → KANIT_ESIK_VARSAYILAN`)
       ile aynıdır (tazelik motoru da onu izler); burada yalnız referans
       tarihi seçilir ve `gecerliBitis` aşıldıysa sonuç "süresi doldu"ya
       çekilir. İki yerde iki farklı "taze" tanımı doğmasın.
     · kanıt BAĞLI mı? — madde durumu (dolayısıyla bulgu), doğrudan santral
       ya da varlık bağı yoksa kanıt bağlantısızdır: kimin hangi maddeyi
       hangi belgeyle karşıladığı BİLİNMİYOR demektir. İşaretçisi `unk`,
       sıfır değil.
     · DOSYA nerede? — bu sürümde dosya yükleme/indirme YOK. Kütük yalnız
       bir `dosyaYolu` metni tutar; dosya yoksa ekran "dosya yolu kayıtlı
       değil" der, "dosya var" DEMEZ. Yol kayıtlıysa da dosyanın gerçekten
       orada olduğu ölçülmemiştir; cümle bunu da söyler.

   Durum eşlemesi (06 §A2 · işaretçi dışında durum sözcüğü yazılmaz):
     taze → ok · yenilenmeli → md · süresi doldu → bd · bağlantısız → unk */

export type KanitMaddesi = {
  maddeDurumuId: string; maddeKod: string; maddeBaslik: string;
  surecId: string; surecKod: string; regKod: string;
  tesisId: string; tesisKod: string; tesisAd: string;
};

export type KanitBulgusu = {
  id: string; baslik: string; durum: string; tesisKod: string;
};

export type KanitTesisi = { id: string; kod: string; ad: string };

export type KanitSatiri = {
  id: string; ad: string; tip: string;
  dosyaYolu: string | null;
  /** ISO — şemadaki `gecerlilikBaslangic` (zorunlu, varsayılan: oluşturma anı) */
  baslangic: string;
  /** ISO ya da null — `toplanmaTarihi`; yoksa tazelik `baslangic`tan ölçülür */
  toplanma: string | null;
  /** ISO ya da null — `gecerliBitis`; geçtiyse tazelik ne olursa olsun "doldu" */
  bitis: string | null;
  yukleyen: string | null;
  sahip: string | null;
  kaynakSistem: string | null;
  otomatik: boolean;
  gizlilik: string;
  surum: number;
  maddeler: KanitMaddesi[];
  bulgular: KanitBulgusu[];
  tesisler: KanitTesisi[];
  /** doğrudan varlık bağı sayısı — varlık künyesi bu ekranda taşınmaz, yalnız sayılır */
  varlikSayisi: number;
};

export type TazelikKovasi = 'taze' | 'yenilenmeli' | 'dolmus';

export type Tazelik = {
  kova: TazelikKovasi;
  etiket: string;
  durum: Durum;
  /** referans tarihten bu yana geçen gün (bitiş aşıldıysa bitişten bu yana) */
  gun: number;
  /** tazeliğin ölçüldüğü tarihin kaynağı — ekran "neye göre" olduğunu söyler */
  kaynak: 'toplanma' | 'baslangic' | 'bitis';
};

const GUN = 86_400_000;

/** Tazelik hangi tarihten ölçülür: toplanma tarihi varsa o, yoksa geçerlilik başlangıcı. */
export function tazelikTarihi(k: Pick<KanitSatiri, 'baslangic' | 'toplanma'>): {
  iso: string; kaynak: 'toplanma' | 'baslangic';
} {
  return k.toplanma
    ? { iso: k.toplanma, kaynak: 'toplanma' }
    : { iso: k.baslangic, kaynak: 'baslangic' };
}

/**
 * Tazelik kovası. Karar `kanitTazelik`te alınır; eşik (`esik`) sunucudan
 * gelir, verilmezse kod varsayılanı (90 taze / 180 dolmuş). `gecerliBitis` geçtiyse kova doğrudan
 * "dolmus"tur — belge takvimde tazeyken bile yürürlükten çıkmış olabilir.
 *
 * `simdi` yalnız test için dışarıdan verilir; ekran `lib/an → an()` kullanır
 * ki sunucu ile tarayıcı aynı anı görsün.
 */
export function tazelik(
  k: Pick<KanitSatiri, 'baslangic' | 'toplanma' | 'bitis'>,
  simdi: number = an(),
  esik: KanitEsik = KANIT_ESIK_VARSAYILAN,
): Tazelik {
  if (k.bitis) {
    const bitisMs = new Date(k.bitis).getTime();
    if (bitisMs <= simdi) {
      return {
        kova: 'dolmus', etiket: 'Süresi doldu', durum: 'bd',
        gun: Math.floor((simdi - bitisMs) / GUN), kaynak: 'bitis',
      };
    }
  }
  const ref = tazelikTarihi(k);
  /* `kanitTazelik` anı kendisi `an()`dan okur; testte sabit bir "şimdi"
     verebilmek için gün farkını burada ölçüp aynı eşikleri uygularız.
     Eşik sayıları oradan kopyalanmaz: `kanitTazelik`e "simdi - gun" ile
     kaydırılmış bir tarih verilir, karar yine tek yerde alınır. */
  const gun = Math.floor((simdi - new Date(ref.iso).getTime()) / GUN);
  const karar = kanitTazelik(new Date(an() - gun * GUN), esik);
  const kova: TazelikKovasi = karar.durum === 'uyumlu' ? 'taze'
    : karar.durum === 'kismi' ? 'yenilenmeli' : 'dolmus';
  const durum: Durum = kova === 'taze' ? 'ok' : kova === 'yenilenmeli' ? 'md' : 'bd';
  return { kova, etiket: karar.etiket, durum, gun, kaynak: ref.kaynak };
}

/** Bir madde durumuna, bulguya, santrale ya da varlığa bağlı mı? */
export function bagliMi(
  k: Pick<KanitSatiri, 'maddeler' | 'bulgular' | 'tesisler' | 'varlikSayisi'>,
): boolean {
  return k.maddeler.length > 0 || k.bulgular.length > 0
    || k.tesisler.length > 0 || k.varlikSayisi > 0;
}

/** Satır işaretçisi: bağlantısız kanıt bilinmeyen elması taşır; bağlıysa tazelik konuşur. */
export function kanitImi(k: KanitSatiri, simdi: number = an(), esik: KanitEsik = KANIT_ESIK_VARSAYILAN): Durum {
  if (!bagliMi(k)) return 'unk';
  return tazelik(k, simdi, esik).durum;
}

/** Çekmece kimlik bloğundaki tek durum sözcüğü (06 §A2). */
export function kimlikSozu(k: KanitSatiri, simdi: number = an(), esik: KanitEsik = KANIT_ESIK_VARSAYILAN): string {
  if (!bagliMi(k)) return 'Bağlantısız';
  const t = tazelik(k, simdi, esik);
  return `${t.etiket} · ${t.gun} gün`;
}

/**
 * "2 bulgu · 3 madde · 1 santral" — bağlantı özeti. Bağ yoksa sözcük
 * "bağlantısız"dır; boş dize ya da "0 bulgu" yazılmaz (unknown ≠ zero).
 */
export function baglantiOzeti(
  k: Pick<KanitSatiri, 'maddeler' | 'bulgular' | 'tesisler' | 'varlikSayisi'>,
): string {
  const parcalar: string[] = [];
  if (k.bulgular.length > 0) parcalar.push(`${k.bulgular.length} bulgu`);
  if (k.maddeler.length > 0) parcalar.push(`${k.maddeler.length} madde`);
  if (k.tesisler.length > 0) parcalar.push(`${k.tesisler.length} santral`);
  if (k.varlikSayisi > 0) parcalar.push(`${k.varlikSayisi} varlık`);
  return parcalar.length === 0 ? 'bağlantısız' : parcalar.join(' · ');
}

/**
 * Dosya cümlesi — dürüst. Bu sürümde dosya yükleme ve indirme yoktur;
 * kütükteki `dosyaYolu` yalnız bir metindir ve dosyanın varlığı ölçülmez.
 */
export function dosyaCumlesi(k: Pick<KanitSatiri, 'dosyaYolu'>): string {
  return k.dosyaYolu
    ? `Dosya yolu kayıtlı: ${k.dosyaYolu} · dosya bu sürümde açılamaz`
    : 'Dosya yolu kayıtlı değil · dosya yükleme bu sürümde yok';
}

/** Kanıt tipinin Türkçe etiketi — `EK_ETIKET` tablosundan, yoksa okunur biçim. */
export function tipEtiketi(tip: string): string {
  return etiketle(tip);
}

/* ── mercek · süzgeç · sıralama ─────────────────────────────────────── */

export type Mercek = 'hepsi' | 'taze' | 'yenilenmeli' | 'dolmus' | 'bagli' | 'bagsiz';

export const MERCEKLER: { id: Mercek; ad: string }[] = [
  { id: 'hepsi', ad: 'Tümü' },
  { id: 'taze', ad: 'Taze' },
  { id: 'yenilenmeli', ad: 'Yenilenmeli' },
  { id: 'dolmus', ad: 'Süresi dolmuş' },
  { id: 'bagsiz', ad: 'Bağlantısız' },
];

export function mercekten(k: KanitSatiri, mercek: Mercek, simdi: number = an(), esik: KanitEsik = KANIT_ESIK_VARSAYILAN): boolean {
  switch (mercek) {
    case 'hepsi': return true;
    case 'bagli': return bagliMi(k);
    case 'bagsiz': return !bagliMi(k);
    default: return tazelik(k, simdi, esik).kova === mercek;
  }
}

/** Serbest metin: ad · tip etiketi · madde kodu · bulgu başlığı · santral kodu · yükleyen. */
export function aramaHavuzu(k: KanitSatiri): string {
  return [
    k.ad, tipEtiketi(k.tip), k.tip, k.yukleyen ?? '', k.kaynakSistem ?? '',
    ...k.maddeler.map((m) => `${m.maddeKod} ${m.tesisKod} ${m.surecKod}`),
    ...k.bulgular.map((b) => `${b.baslik} ${b.tesisKod}`),
    ...k.tesisler.map((t) => `${t.kod} ${t.ad}`),
  ].join(' ').toLocaleLowerCase('tr-TR');
}

export function aramadan(k: KanitSatiri, arama: string): boolean {
  const s = arama.trim().toLocaleLowerCase('tr-TR');
  if (!s) return true;
  return aramaHavuzu(k).includes(s);
}

export function suz(
  satirlar: KanitSatiri[],
  secim: { mercek: Mercek; tip: string | null; arama: string },
  simdi: number = an(),
  esik: KanitEsik = KANIT_ESIK_VARSAYILAN,
): KanitSatiri[] {
  return satirlar.filter((k) =>
    mercekten(k, secim.mercek, simdi, esik)
    && (secim.tip === null || k.tip === secim.tip)
    && aramadan(k, secim.arama));
}

export type SiraAnahtari = 'konu' | 'tip' | 'tarih' | 'bagli' | 'yukleyen';
export type SiraYonu = 'artan' | 'azalan';

/**
 * Sıralama. `tarih` tazelik referans tarihidir (toplanma ya da başlangıç):
 * artan = en eski önce — yenilenmesi gereken kayıtlar üste çıkar.
 * `bagli` önce bağlantısızları (unk) sonra bağ sayısına göre sıralar.
 */
export function sirala(
  satirlar: KanitSatiri[],
  anahtar: SiraAnahtari,
  yon: SiraYonu,
): KanitSatiri[] {
  const carpan = yon === 'artan' ? 1 : -1;
  const metin = (k: KanitSatiri): string => {
    switch (anahtar) {
      case 'konu': return k.ad;
      case 'tip': return tipEtiketi(k.tip);
      case 'yukleyen': return k.yukleyen ?? '￿';
      default: return '';
    }
  };
  const sayi = (k: KanitSatiri): number => {
    if (anahtar === 'tarih') return new Date(tazelikTarihi(k).iso).getTime();
    return k.maddeler.length + k.bulgular.length + k.tesisler.length + k.varlikSayisi;
  };
  return [...satirlar].sort((x, y) => (
    anahtar === 'tarih' || anahtar === 'bagli'
      ? sayi(x) - sayi(y)
      : metin(x).localeCompare(metin(y), 'tr')
  ) * carpan);
}

/* ── metrikler ──────────────────────────────────────────────────────── */

export type KanitMetrikleri = {
  toplam: number;
  taze: number;
  yenilenmeli: number;
  dolmus: number;
  bagsiz: number;
};

/** Metrikler tam liste üzerinden; bağlantısız kanıt tazelik kovalarına da girer (tarihi vardır). */
export function metrikleriHesapla(satirlar: KanitSatiri[], simdi: number = an(), esik: KanitEsik = KANIT_ESIK_VARSAYILAN): KanitMetrikleri {
  const m: KanitMetrikleri = { toplam: satirlar.length, taze: 0, yenilenmeli: 0, dolmus: 0, bagsiz: 0 };
  for (const k of satirlar) {
    m[tazelik(k, simdi, esik).kova] += 1;
    if (!bagliMi(k)) m.bagsiz += 1;
  }
  return m;
}

/** Ekran başlığı: en kötü olgu önce — süresi dolmuş > yenilenmeli > bağlantısız > iyi haber. */
export function baslikMetni(m: KanitMetrikleri, kapsamli: boolean): {
  vurgu?: string; ad: string; durum?: Durum;
} {
  if (m.dolmus > 0) return { vurgu: `${m.dolmus} kanıt`, ad: 'süresi doldu', durum: 'bd' };
  if (m.yenilenmeli > 0) return { vurgu: `${m.yenilenmeli} kanıt`, ad: 'yenilenmeli', durum: 'md' };
  if (m.bagsiz > 0) return { vurgu: `${m.bagsiz} kanıt`, ad: 'bağlantısız', durum: 'unk' };
  if (m.toplam > 0) return { vurgu: `${m.toplam} kanıt`, ad: 'taze' };
  return { ad: kapsamli ? 'Kapsamınızda kanıt yok' : 'Kanıt kaydı yok' };
}

/** Tablo dip notu — kesme ve kapsam dışı kanıt sayısı sessiz kalmaz. */
export function dipNot(girdi: {
  gorunur: number; toplam: number; yuklenen: number; kapsamDisi: number;
}): string {
  const parcalar = [`${girdi.gorunur} satır görünüyor`, 'kolon başlığından sıralama'];
  if (girdi.toplam > girdi.yuklenen) {
    parcalar.push(`kütükte ${girdi.toplam} kanıt var, ${girdi.yuklenen} tanesi yüklendi`);
  }
  if (girdi.kapsamDisi > 0) {
    parcalar.push(`${girdi.kapsamDisi} kanıt santral kapsamınız dışında (bağlantısız ya da yalnız başka santrale bağlı) — listelenmiyor`);
  }
  return parcalar.join(' · ');
}

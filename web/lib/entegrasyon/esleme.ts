import 'server-only';
import { db } from '../db';
import { anahtarla, HEDEF_ALANLAR, type AlanTanimi, type HedefAlan } from './varlikAktarim';
import type { Gozlem } from './sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   EŞLEME TEZGÂHI — sürümlü eşleme profili motoru (§7)

   Bir dış sistemin alanını platformun alanına çeviren kuralların SÜRÜMLÜ
   tanımı ve o kuralları ham kayda uygulayan saf motor.

   NEDEN sürümlü: gerçek bir kurum sistemi bağlandığında en çok vakit alan
   iş eşleme olacak ve eşleme DEĞİŞECEK. Yeni sürüm eskisini EZERSE, geçen
   ay içe aktarılmış bir kaydın hangi kuralla yorumlandığı kaybolur ve bir
   denetimde "bu alan neden böyle" sorusunun yanıtı olmaz. Bu yüzden:
   yayımlanmış profil DÜZENLENMEZ, yeni SÜRÜM çıkarılır; eski satır
   `arsiv` olur ama silinmez; ve her içe aktarım `VeriKokeni
   .eslemeProfilSurumu` alanında hangi sürümle yorumlandığını taşır.

   Dört sert madde (hiçbiri esnetilmez):

   1. VARSAYILAN BİR ÖLÇÜM DEĞİLDİR. Kaynağın gerçekten verdiği değer ile
      kuralın varsayılanıyla dolan alan ayırt edilir (`kaynagi` alanı) ve
      varsayılanla dolan alan köken güvenine KATKI VERMEZ.
   2. TANINMAYAN DEĞER SESSİZ DÜŞMEZ. Enum eşlemesinde karşılığı olmayan
      değer `ReddedilenKayit`e `asama: 'esleme'` ile yazılır. Kaydın
      tümünü düşürmesi yalnız kural `zorunlu` ise olur — ama her iki
      durumda da kayıt tutulur, hiçbir durumda susulmaz.
   3. ÖLÇÜLEMEYEN GÜVEN null'dır, sıfır değil. Hiçbir güven kuralı
      dolmadıysa güven `null` döner; 0 yazmak "ölçtük, sıfır çıktı"
      demektir ve yalandır.
   4. BU DOSYA HİÇBİR DIŞ SİSTEME BAĞLANMAZ. Girdisi adaptörün getirdiği
      ham kayıttır; çıktısı platform alanlarıdır.

   Hedef alan sözlüğü `varlikAktarim.ts` ile ORTAKTIR: kullanıcı kolon
   eşleme ekranında hangi alanları görüyorsa connector eşlemesinde de
   onları görür — iki ayrı sözlük iki ayrı doğruluk demekti. */

/* ═══ Kural biçimi ════════════════════════════════════════════════════ */

export const DONUSUMLER = [
  'yok', 'kirp', 'buyukHarf', 'kucukHarf', 'sayi', 'tarih', 'mantik', 'mac', 'ip',
] as const;
export type Donusum = (typeof DONUSUMLER)[number];

/**
 * Bir alanın köken güvenine katkısı.
 *
 * `agirlik`: alan KAYNAKTAN gerçekten geldiğinde güvene katkısı (0–1).
 * `eksikCezasi`: alan hiç gelmediğinde (ya da varsayılanla dolduğunda)
 * güveni çarpan ceza (0–1). İkisi de isteğe bağlıdır; hiçbir kuralda
 * güven tanımı yoksa güven ÖLÇÜLMEZ ve null kalır.
 */
export type GuvenKurali = {
  agirlik: number;
  eksikCezasi?: number;
};

export type EslemeKurali = {
  /** dış sistemdeki alan yolu — 'seri' ya da 'device.serial' ya da 'a.0.b' */
  kaynakAlan: string;
  /** platform alanı — HEDEF_ALANLAR sözlüğünden */
  hedefAlan: HedefAlan;
  donusum?: Donusum;
  /** kaynak vermezse kayıt reddedilir */
  zorunlu?: boolean;
  /** kaynak vermezse yazılacak değer — BİR ÖLÇÜM DEĞİLDİR */
  varsayilan?: string | null;
  /** kaynak değeri → platform değeri (kapalı listeler için) */
  enumEsleme?: Record<string, string>;
  guvenKurali?: GuvenKurali;
};

/** Kaynak sistemin kimliği için kullanılacak alan(lar) ve profil kimliği. */
export type EslemeProfilTanimi = {
  kod: string;
  ad: string;
  connectorTipi: string;
  aciklama?: string | null;
  kurallar: EslemeKurali[];
};

/* Özel eşlemeler (§7): santral · varlık tipi · sahip · ağ bölgesi.
   Bunlar KOD taşır, kimlik değil: profil motoru saf kalır, kod→kimlik
   çözümü veritabanına dokunan katmanın işidir. Ayrı bir kural tipi
   değiller — hedef alan sözlüğünde `tip: 'referans'` olarak zaten
   varlar; burada yalnız hangi dördünün "özel" olduğu adlandırılır ki
   ekran onları ayrı bir bölümde toplasın. */
export const OZEL_HEDEFLER: Record<string, string> = {
  tesisKodu: 'Santral',
  turKodu: 'Varlık tipi',
  sahipEposta: 'Sahip',
  bolgeKodu: 'Ağ bölgesi',
};

const ALAN_INDEKSI = new Map<string, AlanTanimi>(HEDEF_ALANLAR.map((a) => [a.anahtar, a]));

/* Güven sınırları: 0 ve 1 kullanılmaz. 0 `null` (ölçülmedi) ile
   karıştırılır, 1 ise hiçbir olasılıksal çıkarımda dürüst değildir.
   `kesif.ts` ile aynı gerekçe, aynı sayılar. */
const EN_DUSUK_GUVEN = 0.05;
const EN_YUKSEK_GUVEN = 0.99;

/* ═══ Uygulama sonucu ═════════════════════════════════════════════════ */

/** `kaynak` = dış sistem gerçekten verdi · `varsayilan` = kural doldurdu ·
    `yok` = ne kaynak verdi ne varsayılan var (BİLİNMİYOR). */
export type DegerKaynagi = 'kaynak' | 'varsayilan' | 'yok';

export type AlanSonucu = {
  hedefAlan: HedefAlan;
  kaynakAlan: string;
  deger: string | number | boolean | null;
  kaynagi: DegerKaynagi;
  /** kaynağın ham hâli — izlenebilirlik için saklanır */
  hamDeger: unknown;
  not: string | null;
};

/** Eşleme aşamasında bulunan sorun. `etki`: kaydın tümü mü düşer, yalnız
    alan mı boş kalır. İkisi de ReddedilenKayit'e yazılır — fark ciddiyette,
    kayıt tutulmasında değil. */
export type EslemeSorunu = {
  asama: 'esleme';
  etki: 'kayit' | 'alan';
  kaynakAlan: string | null;
  hedefAlan: string | null;
  sebep: string;
};

export type EslemeUygulamasi = {
  alanlar: Record<string, AlanSonucu>;
  /** yalnız KAYNAKTAN gelen alanlardan hesaplanır; ölçülemiyorsa null */
  guven: number | null;
  sorunlar: EslemeSorunu[];
  /** kaydın tümünü düşüren sorun var mı */
  reddedildi: boolean;
  /** özel eşlemeler — kod düzeyinde; kimlik çözümü çağıranın işi */
  ozel: { tesisKodu: string | null; turKodu: string | null; sahipEposta: string | null; bolgeKodu: string | null };
};

/* ═══ Kural doğrulama ═════════════════════════════════════════════════ */

/**
 * Kural listesini doğrular. Sorun listesi döner — BOŞ liste = geçerli.
 * Doğrulama profil YAYIMLANMADAN önce yapılır: bozuk bir profil koşu
 * anında patlarsa hangi kaydın neden düştüğü kaybolur.
 */
export function kurallariDogrula(kurallar: EslemeKurali[]): string[] {
  const sorunlar: string[] = [];
  if (kurallar.length === 0) sorunlar.push('Profil en az bir kural içermeli');
  const sayac = new Map<string, number>();
  for (const [i, k] of kurallar.entries()) {
    const yer = `${i + 1}. kural`;
    if (!k.kaynakAlan?.trim()) sorunlar.push(`${yer}: kaynak alan boş`);
    const tanim = ALAN_INDEKSI.get(k.hedefAlan);
    if (!tanim) { sorunlar.push(`${yer}: bilinmeyen hedef alan (${k.hedefAlan})`); continue; }
    sayac.set(k.hedefAlan, (sayac.get(k.hedefAlan) ?? 0) + 1);
    if (k.donusum && !DONUSUMLER.includes(k.donusum)) {
      sorunlar.push(`${yer}: bilinmeyen dönüşüm (${k.donusum})`);
    }
    if (k.zorunlu && k.varsayilan != null && k.varsayilan !== '') {
      /* Zorunlu + varsayılan bir çelişkidir: varsayılan her zaman
         dolduracağı için "zorunlu" kuralı hiç tetiklenmez ve kaynağın
         alanı hiç göndermediği fark edilmez. */
      sorunlar.push(`${yer}: alan hem zorunlu hem varsayılanlı — varsayılan zorunluluğu susturur`);
    }
    if (k.guvenKurali) {
      const { agirlik, eksikCezasi } = k.guvenKurali;
      if (!(agirlik >= 0 && agirlik <= 1)) sorunlar.push(`${yer}: güven ağırlığı 0–1 aralığında olmalı`);
      if (eksikCezasi != null && !(eksikCezasi >= 0 && eksikCezasi <= 1)) {
        sorunlar.push(`${yer}: eksik cezası 0–1 aralığında olmalı`);
      }
    }
    if (tanim.tip === 'sozluk' && k.enumEsleme) {
      for (const [ham, hedef] of Object.entries(k.enumEsleme)) {
        if (!tanim.sozluk?.includes(hedef)) {
          sorunlar.push(`${yer}: '${ham}' → '${hedef}' hedefi ${tanim.etiket} sözlüğünde yok`);
        }
      }
    }
  }
  for (const [hedef, n] of sayac) {
    if (n > 1) sorunlar.push(`"${ALAN_INDEKSI.get(hedef)?.etiket ?? hedef}" alanına ${n} kural yazılmış`);
  }
  return sorunlar;
}

/** Saklanan JSON'u kural listesine çevirir. Bozuk JSON SESSİZ GEÇMEZ. */
export function kurallariCoz(kurallarJson: string): EslemeKurali[] {
  let ham: unknown;
  try {
    ham = JSON.parse(kurallarJson);
  } catch (e) {
    throw new Error(`Eşleme kuralları okunamadı: ${e instanceof Error ? e.message : 'geçersiz JSON'}`);
  }
  if (!Array.isArray(ham)) throw new Error('Eşleme kuralları bir dizi olmalı');
  const kurallar = ham as EslemeKurali[];
  const sorunlar = kurallariDogrula(kurallar);
  if (sorunlar.length > 0) throw new Error(`Eşleme kuralları geçersiz: ${sorunlar.join(' · ')}`);
  return kurallar;
}

/* ═══ Değer okuma ve dönüşüm ══════════════════════════════════════════ */

/**
 * Ham kayıttan alan okur. Nokta gösterimi desteklenir (`device.serial`,
 * `arayuz.0.mac`). Yol tutmazsa, TEK parçalı yollarda normalize edilmiş
 * başlık eşleşmesi denenir ('Serial Number' → 'serialnumber') — dosya
 * başlıkları tr/en ve boşluklu gelir, `varlikAktarim` de aynı
 * normalizasyonu kullanır.
 */
export function hamDeger(ham: unknown, yol: string): unknown {
  const parcalar = yol.split('.').map((p) => p.trim()).filter(Boolean);
  let imlec: unknown = ham;
  for (const p of parcalar) {
    if (imlec == null) return undefined;
    if (Array.isArray(imlec)) {
      const i = Number(p);
      imlec = Number.isInteger(i) ? imlec[i] : undefined;
      continue;
    }
    if (typeof imlec !== 'object') return undefined;
    imlec = (imlec as Record<string, unknown>)[p];
  }
  if (imlec !== undefined) return imlec;
  if (parcalar.length !== 1 || !ham || typeof ham !== 'object' || Array.isArray(ham)) return undefined;
  const aranan = anahtarla(parcalar[0]);
  for (const [k, v] of Object.entries(ham as Record<string, unknown>)) {
    if (anahtarla(k) === aranan) return v;
  }
  return undefined;
}

/** Boş sayılan değerler. `0` ve `false` BOŞ DEĞİLDİR — birer ölçümdür. */
function bosMu(d: unknown): boolean {
  return d == null || (typeof d === 'string' && d.trim() === '');
}

const EVET = new Set(['evet', 'e', 'var', 'true', '1', 'yes', 'y', 'aktif', 'acik', 'enabled']);
const HAYIR = new Set(['hayir', 'h', 'yok', 'false', '0', 'no', 'n', 'pasif', 'kapali', 'disabled']);

/** Dönüşüm sonucu: ya değer ya da SEBEP. Sessiz `null` dönmez. */
type DonusumSonucu = { ok: true; deger: string | number | boolean | null } | { ok: false; sebep: string };

export function donusumUygula(deger: unknown, donusum: Donusum = 'yok'): DonusumSonucu {
  const metin = typeof deger === 'string' ? deger.trim() : deger;
  switch (donusum) {
    case 'yok':
      return { ok: true, deger: (typeof metin === 'object' ? JSON.stringify(metin) : metin) as string };
    case 'kirp':
      return { ok: true, deger: String(metin).trim() };
    case 'buyukHarf':
      return { ok: true, deger: String(metin).trim().toLocaleUpperCase('tr-TR') };
    case 'kucukHarf':
      return { ok: true, deger: String(metin).trim().toLocaleLowerCase('tr-TR') };
    case 'sayi': {
      /* Ondalık ayracı virgül olan kaynaklar var; binlik ayracı nokta
         olanları da. Belirsiz biçim SESSİZCE 0 olmaz, reddedilir. */
      const ham = String(metin).trim().replace(/\s/g, '');
      const normal = ham.includes(',') ? ham.replace(/\./g, '').replace(',', '.') : ham;
      const n = Number(normal);
      if (!Number.isFinite(n)) return { ok: false, sebep: `sayıya çevrilemedi: "${String(deger)}"` };
      return { ok: true, deger: n };
    }
    case 'tarih': {
      const t = metin instanceof Date ? metin : new Date(String(metin));
      if (Number.isNaN(t.getTime())) return { ok: false, sebep: `tarihe çevrilemedi: "${String(deger)}"` };
      return { ok: true, deger: t.toISOString() };
    }
    case 'mantik': {
      const s = String(metin).trim().toLocaleLowerCase('tr-TR').replace(/[ı]/g, 'i');
      if (EVET.has(s)) return { ok: true, deger: true };
      if (HAYIR.has(s)) return { ok: true, deger: false };
      // BİLİNMİYOR ≠ false: tanınmayan değer sessizce "hayır" sayılmaz.
      return { ok: false, sebep: `evet/hayır olarak okunamadı: "${String(deger)}"` };
    }
    case 'mac': {
      const hex = String(metin).replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      if (hex.length !== 12) return { ok: false, sebep: `MAC biçimi tanınmadı: "${String(deger)}"` };
      return { ok: true, deger: (hex.match(/.{2}/g) ?? []).join(':') };
    }
    case 'ip': {
      const s = String(metin).trim();
      const p = s.split('.');
      const gecerliV4 = p.length === 4 && p.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255);
      // IPv6'yı biçimsel olarak doğrulamıyoruz; iki nokta üst üste taşıyan
      // değer olduğu gibi geçer — yanlış reddetmektense dokunmamak yeğdir.
      if (!gecerliV4 && !s.includes(':')) return { ok: false, sebep: `IP biçimi tanınmadı: "${String(deger)}"` };
      return { ok: true, deger: s };
    }
    default:
      return { ok: false, sebep: `bilinmeyen dönüşüm: ${String(donusum)}` };
  }
}

/* ═══ Motor ═══════════════════════════════════════════════════════════ */

/**
 * Güven: kaynağın GERÇEKTEN verdiği, güven kuralı taşıyan alanlardan
 * gürültülü-VEYA ile hesaplanır. Varsayılanla dolan alan katkı vermez —
 * varsayılan bir ölçüm değildir.
 *
 * Hiç katkı yoksa `null` döner: "ölçemedik" ile "sıfır güven" aynı şey
 * değildir ve ekranlar bu ikisini aynı göstermez.
 */
export function guvenHesapla(
  katkilar: number[],
  cezalar: number[],
): number | null {
  if (katkilar.length === 0) return null;
  let kalan = 1;
  for (const a of katkilar) kalan *= 1 - a;
  let guven = 1 - kalan;
  for (const c of cezalar) guven *= 1 - c;
  guven = Math.min(EN_YUKSEK_GUVEN, Math.max(EN_DUSUK_GUVEN, guven));
  return Math.round(guven * 100) / 100;
}

/**
 * Kural listesini bir ham kayda uygular.
 *
 * Saf fonksiyon: veritabanına dokunmaz, dış sisteme bağlanmaz, hiçbir şey
 * yazmaz. Ne yazılacağını SÖYLER; yazmak çağıranın işidir (kuru koşu bu
 * yüzden aynı motoru hiçbir şey değiştirmeden koşturabiliyor).
 */
export function eslemeUygula(kurallar: EslemeKurali[], ham: unknown): EslemeUygulamasi {
  const alanlar: Record<string, AlanSonucu> = {};
  const sorunlar: EslemeSorunu[] = [];
  const katkilar: number[] = [];
  const cezalar: number[] = [];
  let reddedildi = false;

  for (const kural of kurallar) {
    const tanim = ALAN_INDEKSI.get(kural.hedefAlan);
    if (!tanim) {
      // Doğrulamadan geçmiş profilde olmaz; yine de sessiz geçilmez.
      sorunlar.push({
        asama: 'esleme', etki: 'alan', kaynakAlan: kural.kaynakAlan,
        hedefAlan: kural.hedefAlan, sebep: `bilinmeyen hedef alan: ${kural.hedefAlan}`,
      });
      continue;
    }
    const gelen = hamDeger(ham, kural.kaynakAlan);
    const sonuc: AlanSonucu = {
      hedefAlan: kural.hedefAlan, kaynakAlan: kural.kaynakAlan,
      deger: null, kaynagi: 'yok', hamDeger: gelen, not: null,
    };

    if (bosMu(gelen)) {
      if (kural.zorunlu) {
        reddedildi = true;
        sorunlar.push({
          asama: 'esleme', etki: 'kayit', kaynakAlan: kural.kaynakAlan, hedefAlan: kural.hedefAlan,
          sebep: `zorunlu alan kaynakta yok ya da boş (${kural.kaynakAlan} → ${tanim.etiket})`,
        });
      } else if (kural.varsayilan != null && kural.varsayilan !== '') {
        /* Varsayılan uygulandı — bu bir ÖLÇÜM DEĞİLDİR: `kaynagi` alanı
           ayrımı taşır ve güvene katkı vermez. */
        sonuc.deger = kural.varsayilan;
        sonuc.kaynagi = 'varsayilan';
        sonuc.not = 'kaynak vermedi, kural varsayılanı uygulandı (ölçüm değil)';
      } else {
        sonuc.not = 'kaynak vermedi (bilinmiyor)';
      }
      if (sonuc.kaynagi !== 'kaynak' && kural.guvenKurali?.eksikCezasi != null) {
        cezalar.push(kural.guvenKurali.eksikCezasi);
      }
      alanlar[kural.hedefAlan] = sonuc;
      continue;
    }

    // 1) Dönüşüm
    const donusmus = donusumUygula(gelen, kural.donusum ?? 'yok');
    if (!donusmus.ok) {
      const zorunlu = Boolean(kural.zorunlu);
      if (zorunlu) reddedildi = true;
      sorunlar.push({
        asama: 'esleme', etki: zorunlu ? 'kayit' : 'alan',
        kaynakAlan: kural.kaynakAlan, hedefAlan: kural.hedefAlan,
        sebep: `dönüşüm başarısız (${kural.donusum ?? 'yok'}): ${donusmus.sebep}`,
      });
      sonuc.not = donusmus.sebep;
      if (kural.guvenKurali?.eksikCezasi != null) cezalar.push(kural.guvenKurali.eksikCezasi);
      alanlar[kural.hedefAlan] = sonuc;
      continue;
    }
    let deger = donusmus.deger;

    // 2) Enum eşlemesi — tanınmayan değer SESSİZ DÜŞMEZ.
    if (kural.enumEsleme && Object.keys(kural.enumEsleme).length > 0) {
      const arananAnahtar = anahtarla(String(deger));
      let bulunan: string | undefined;
      for (const [ham2, hedef] of Object.entries(kural.enumEsleme)) {
        if (anahtarla(ham2) === arananAnahtar) { bulunan = hedef; break; }
      }
      if (bulunan === undefined) {
        const zorunlu = Boolean(kural.zorunlu);
        if (zorunlu) reddedildi = true;
        sorunlar.push({
          asama: 'esleme', etki: zorunlu ? 'kayit' : 'alan',
          kaynakAlan: kural.kaynakAlan, hedefAlan: kural.hedefAlan,
          sebep: `enum karşılığı yok: "${String(deger)}" → ${tanim.etiket}. `
            + 'Eşlemeye eklenene kadar bu alan BİLİNMİYOR kalır.',
        });
        sonuc.not = `enum karşılığı yok: "${String(deger)}"`;
        if (kural.guvenKurali?.eksikCezasi != null) cezalar.push(kural.guvenKurali.eksikCezasi);
        alanlar[kural.hedefAlan] = sonuc;
        continue;
      }
      deger = bulunan;
    } else if (tanim.tip === 'sozluk' && tanim.sozluk) {
      /* Enum eşlemesi tanımlanmamış kapalı liste: değerin kendisi listede
         olmalı. Olmayan değeri yazmak sözlüğü sessizce genişletirdi. */
      const s = String(deger).trim().toLocaleLowerCase('tr-TR');
      if (!tanim.sozluk.includes(s)) {
        const zorunlu = Boolean(kural.zorunlu);
        if (zorunlu) reddedildi = true;
        sorunlar.push({
          asama: 'esleme', etki: zorunlu ? 'kayit' : 'alan',
          kaynakAlan: kural.kaynakAlan, hedefAlan: kural.hedefAlan,
          sebep: `"${String(deger)}" ${tanim.etiket} sözlüğünde yok (${tanim.sozluk.join(', ')}) `
            + '— enum eşlemesi tanımlanmalı',
        });
        sonuc.not = `sözlükte yok: "${String(deger)}"`;
        if (kural.guvenKurali?.eksikCezasi != null) cezalar.push(kural.guvenKurali.eksikCezasi);
        alanlar[kural.hedefAlan] = sonuc;
        continue;
      }
      deger = s;
    }

    sonuc.deger = deger;
    sonuc.kaynagi = 'kaynak';
    if (kural.guvenKurali) katkilar.push(kural.guvenKurali.agirlik);
    alanlar[kural.hedefAlan] = sonuc;
  }

  const kod = (a: string): string | null => {
    const s = alanlar[a];
    return s && s.deger != null && s.deger !== '' ? String(s.deger) : null;
  };

  return {
    alanlar,
    guven: guvenHesapla(katkilar, cezalar),
    sorunlar,
    reddedildi,
    ozel: {
      tesisKodu: kod('tesisKodu'), turKodu: kod('turKodu'),
      sahipEposta: kod('sahipEposta'), bolgeKodu: kod('bolgeKodu'),
    },
  };
}

/* ═══ Gözleme uygulama ════════════════════════════════════════════════ */

/** Hedef alan → `Gozlem` alanı. Listede olmayan hedefler gözlem gövdesine
    `eslenenAlanlar` altında taşınır: eşlenmiş ama gözlem şemasında yeri
    olmayan bir alan (sahip, kritiklik…) düşürülmez, keşif kaydının
    normalJson'unda insanın önüne gelir. */
const GOZLEM_ALANI: Partial<Record<HedefAlan, string>> = {
  etiket: 'etiket', hostname: 'hostname', seriNo: 'seriNo', macAdresi: 'macAdresi',
  ipAdresi: 'ipAdresi', uretici: 'uretici', model: 'model',
  isletimSistemi: 'isletimSistemi', firmware: 'firmware',
  tesisKodu: 'tesisKodu', bolgeKodu: 'bolgeKodu', turKodu: 'turKodu',
};

export type GozlemEslemesi = {
  gozlem: Gozlem;
  uygulama: EslemeUygulamasi;
};

/**
 * Profili bir gözleme uygular: kurallar gözlemin HAM yükünden okur ve
 * normalize alanları EZER.
 *
 * NEDEN ezer: profil varsa doğruluk kaynağı odur — adaptörün gömülü
 * eşlemesi yalnız profil yokken geçerlidir. Ama yalnız kaynağın gerçekten
 * verdiği ya da varsayılanla dolan alanlar yazılır; kural boş bıraktığı
 * alanı adaptörün bulduğu değerin ÜSTÜNE null yazmaz — boş hücre "bilgi
 * yok" demektir, "sil" demek değil (varlikAktarim ile aynı ilke).
 */
export function gozlemeUygula(kurallar: EslemeKurali[], g: Gozlem): GozlemEslemesi {
  const uygulama = eslemeUygula(kurallar, g.ham);
  const govde: Record<string, unknown> = { ...(g as unknown as Record<string, unknown>) };
  const artakalan: Record<string, unknown> = {};

  for (const [hedef, sonuc] of Object.entries(uygulama.alanlar)) {
    if (sonuc.kaynagi === 'yok' || sonuc.deger == null) continue;
    const alan = GOZLEM_ALANI[hedef as HedefAlan];
    if (alan) govde[alan] = sonuc.deger;
    else artakalan[hedef] = sonuc.deger;
  }
  if (Object.keys(artakalan).length > 0) govde.eslenenAlanlar = artakalan;

  /* Güven ölçüldüyse kökene o girer. Ölçülemediyse gözlemin kendi güveni
     korunur — profil "ölçemedim" dedi diye adaptörün ölçümü silinmez. */
  const koken = { ...g.koken, guven: uygulama.guven ?? g.koken.guven ?? null };
  govde.koken = koken;

  return { gozlem: govde as unknown as Gozlem, uygulama };
}

/* ═══ Sürümleme (veritabanı) ══════════════════════════════════════════ */

export type ProfilKaydi = {
  id: string;
  kod: string;
  ad: string;
  connectorTipi: string;
  surum: number;
  durum: string;
  kurallar: EslemeKurali[];
  aciklama: string | null;
};

function kayitCevir(satir: {
  id: string; kod: string; ad: string; connectorTipi: string; surum: number;
  durum: string; kurallarJson: string; aciklama: string | null;
}): ProfilKaydi {
  return {
    id: satir.id, kod: satir.kod, ad: satir.ad, connectorTipi: satir.connectorTipi,
    surum: satir.surum, durum: satir.durum, aciklama: satir.aciklama,
    kurallar: kurallariCoz(satir.kurallarJson),
  };
}

/**
 * Yeni SÜRÜM yayımlar. Yayımlanmış bir sürüm ASLA güncellenmez:
 * aynı kod için en yüksek sürüm bulunur, bir fazlası yeni satır olarak
 * açılır ve o koda ait eski `etkin` satırlar `arsiv` olur.
 *
 * Böylece eski içe aktarımların hangi kuralla yorumlandığı okunabilir
 * kalır (`VeriKokeni.eslemeProfilSurumu` → `EslemeProfili(kod, surum)`).
 */
export async function profilYayinla(
  tanim: EslemeProfilTanimi,
  o: { olusturanId?: string | null; etkinlestir?: boolean } = {},
): Promise<ProfilKaydi> {
  const kod = tanim.kod.trim().toUpperCase();
  if (!kod) throw new Error('Profil kodu boş olamaz');
  const sorunlar = kurallariDogrula(tanim.kurallar);
  if (sorunlar.length > 0) {
    throw new Error(`Eşleme kuralları geçersiz: ${sorunlar.join(' · ')}`);
  }
  const etkinlestir = o.etkinlestir !== false;

  return db.$transaction(async (tx) => {
    const oncekiler = await tx.eslemeProfili.findMany({
      where: { kod }, orderBy: { surum: 'desc' }, take: 1, select: { surum: true },
    });
    const surum = (oncekiler[0]?.surum ?? 0) + 1;
    const yeni = await tx.eslemeProfili.create({
      data: {
        kod, ad: tanim.ad.trim(), connectorTipi: tanim.connectorTipi.trim(),
        surum, durum: etkinlestir ? 'etkin' : 'taslak',
        kurallarJson: JSON.stringify(tanim.kurallar),
        aciklama: tanim.aciklama ?? null,
        olusturanId: o.olusturanId ?? null,
      },
    });
    if (etkinlestir) {
      /* Eski sürüm SİLİNMEZ, EZİLMEZ: yalnız arşive alınır. Onunla
         yorumlanmış kayıtların kuralı okunabilir kalmalı. */
      await tx.eslemeProfili.updateMany({
        where: { kod, durum: 'etkin', NOT: { id: yeni.id } },
        data: { durum: 'arsiv' },
      });
    }
    return kayitCevir(yeni);
  });
}

/** Bir kodun tüm sürümleri, yeniden eskiye. Arşiv dahil — geçmiş gizlenmez. */
export async function profilSurumleri(kod: string): Promise<ProfilKaydi[]> {
  const satirlar = await db.eslemeProfili.findMany({
    where: { kod: kod.trim().toUpperCase() }, orderBy: { surum: 'desc' },
  });
  return satirlar.map(kayitCevir);
}

/** Belirli bir sürümü getirir — eski içe aktarımın kuralını okumak için. */
export async function profilSurumu(kod: string, surum: number): Promise<ProfilKaydi | null> {
  const satir = await db.eslemeProfili.findUnique({
    where: { kod_surum: { kod: kod.trim().toUpperCase(), surum } },
  });
  return satir ? kayitCevir(satir) : null;
}

/**
 * Bir connector'ın koşuda kullanacağı profil.
 *
 * Öncelik: connector'a AÇIKÇA bağlanmış profil (etkin olmasa bile — bağı
 * kuran insan bilerek kurmuştur), yoksa connector tipinin etkin profili.
 * Hiçbiri yoksa `null` = adaptörün gömülü eşlemesi geçerlidir.
 */
export async function connectorProfili(c: {
  tip: string; eslemeProfilId?: string | null;
}): Promise<ProfilKaydi | null> {
  if (c.eslemeProfilId) {
    const bagli = await db.eslemeProfili.findUnique({ where: { id: c.eslemeProfilId } });
    if (bagli) return kayitCevir(bagli);
  }
  const etkin = await db.eslemeProfili.findFirst({
    where: { connectorTipi: c.tip, durum: 'etkin' },
    orderBy: { surum: 'desc' },
  });
  return etkin ? kayitCevir(etkin) : null;
}

/* ═══ Reddedilen kayıt defteri ════════════════════════════════════════ */

/** Eşleme aşamasındaki sorunları `ReddedilenKayit`e yazar. Sayaç yetmez:
    hangi kayıt, neden, hangi aşamada — bunlar olmadan kimse düzeltemez. */
export async function eslemeRedleriniYaz(
  sorunlar: EslemeSorunu[],
  o: {
    kosuId?: string | null; connectorId?: string | null;
    kaynakSistem: string; kaynakKayitId?: string | null; hamJson?: string | null;
  },
): Promise<number> {
  if (sorunlar.length === 0) return 0;
  await db.reddedilenKayit.createMany({
    data: sorunlar.map((s) => ({
      kosuId: o.kosuId ?? null,
      connectorId: o.connectorId ?? null,
      kaynakSistem: o.kaynakSistem,
      kaynakKayitId: o.kaynakKayitId ?? null,
      asama: s.asama,
      sebep: s.etki === 'kayit' ? `[kayıt düştü] ${s.sebep}` : `[alan boş kaldı] ${s.sebep}`,
      hamJson: o.hamJson ?? null,
    })),
  });
  return sorunlar.length;
}

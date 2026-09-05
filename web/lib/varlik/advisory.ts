import { surumCozumle } from '@/lib/alan/surum';

/* ═══ OT-25 · Güvenlik duyurusu (advisory) ayrıştırıcı ═════════════════

   Duyurular kuruma ÜÇ yoldan gelir: ICS-CERT bültenleri, üretici PSIRT
   yayınları, NVD dışa aktarımları. Bu ürün hiçbirine BAĞLANMAZ ve
   bağlanmış gibi de yapmaz: ayrıştırıcı, insanın indirdiği belgeyi
   okur. Ürünün gerçek bir akıştan beslenmesi bir dış bağımlılıktır ve
   bu dosya o bağımlılığı gizlemez.

   ── AYRIŞTIRICI HİÇ THROW ETMEZ ───────────────────────────────────────
   Aynı sözleşme `sbom.ts`teki gibi: bozuk bir kayıt bütün yüklemeyi
   düşürmez, REDDEDİLEN olarak sayılır ve gerekçesiyle geri döner.
   Sessizce düşürülmesi, "kaç duyuru yüklendi" sorusunu yalanlardı.

   ── ARALIK UÇLARI TAHMİN EDİLMEZ ──────────────────────────────────────
   `>= 2.0` ile `> 2.0` farklıdır ve advisory metinlerinde ikisi de
   geçer. Uç noktanın dahil olup olmadığı belgede yoksa VARSAYILAN
   uygulanır (alt uç dahil, üst uç hariç — CVE aralıklarının yaygın
   yazımı) ve bu varsayım burada tek yerde durur.

   ── SÜRÜM ÇÖZÜMLENEMİYORSA KAYIT YİNE ALINIR ─────────────────────────
   Çözümlenemeyen bir sürüm aralığı kaydı reddetmez: korelasyon motoru o
   ürün için `karar_verilemedi` üretir ve bu doğrudur. Reddetmek,
   duyurunun varlığını bile gizlerdi. */

/**
 * Tek yüklemede alınacak EN ÇOK duyuru.
 *
 * Sınır burada — ayrıştırıcının yanında — durur, sunucu eyleminde değil:
 * `'use server'` modülü sabit dışa aktaramaz ve sayıyı demo ikizi ile
 * testler de okur.
 */
export const ADVISORY_TAVANI = 2000;

export type AdvisoryUrunGirdisi = {
  uretici: string | null;
  urunAdi: string | null;
  cpe: string | null;
  etkilenenAlt: string | null;
  etkilenenAltDahil: boolean;
  etkilenenUst: string | null;
  etkilenenUstDahil: boolean;
  duzeltilenSurum: string | null;
  /** Sürüm alanlarından biri çözümlenemedi mi (kayıt yine alınır). */
  surumBelirsiz: boolean;
};

export type AdvisoryGirdisi = {
  kaynak: string;
  referans: string;
  baslik: string;
  yayim: string | null;
  guncelleme: string | null;
  url: string | null;
  ozet: string | null;
  /** CVE kimlikleri — tekilleştirilmiş, büyük harfe çevrilmiş. */
  cveler: string[];
  urunler: AdvisoryUrunGirdisi[];
};

export type AdvisoryAyristirmaSonucu = {
  girdiler: AdvisoryGirdisi[];
  /** Alınamayan kayıtlar; sayısı ekranda gösterilir, sessizce yutulmaz. */
  reddedilen: { sira: number; sebep: string }[];
};

const KAYNAKLAR = new Set(['icscert', 'uretici', 'nvd', 'diger']);

/** CVE-2024-1234 · CVE-2024-12345678 — yıl dört hane, sıra en az dört. */
const CVE = /^CVE-\d{4}-\d{4,}$/;

function metin(h: unknown): string | null {
  if (typeof h !== 'string') return null;
  const k = h.trim();
  return k === '' ? null : k;
}

function mantik(h: unknown, varsayilan: boolean): boolean {
  if (typeof h === 'boolean') return h;
  /* Metin gelmesi olağandır (CSV, elle yazılmış JSON). Tanınmayan değer
     varsayılana düşer — `false` demek, aralığı sessizce daraltırdı. */
  if (typeof h === 'string') {
    const k = h.trim().toLowerCase();
    if (k === 'true' || k === 'evet' || k === '1') return true;
    if (k === 'false' || k === 'hayir' || k === 'hayır' || k === '0') return false;
  }
  return varsayilan;
}

/** ISO tarih; çözümlenemeyen değer `null` (bugünün tarihi UYDURULMAZ). */
function tarih(h: unknown): string | null {
  const m = metin(h);
  if (m === null) return null;
  const t = new Date(m);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

function cveleriTopla(ham: unknown): string[] {
  const dizi = Array.isArray(ham) ? ham : typeof ham === 'string' ? ham.split(',') : [];
  const gorulen = new Set<string>();
  for (const h of dizi) {
    const m = metin(h);
    if (m === null) continue;
    /* CVE kimliği bir TANIMLAYICIDIR, Türkçe metin değil: `toUpperCase()`
       yerine ASCII harf harf yükseltmek gerekmez çünkü kimlikte yalnız
       `CVE` ön eki ve rakam vardır; yine de Türkçe yerelinden bağımsız
       olması için sabit yerelli çevrim kullanılır. */
    const buyuk = m.toLocaleUpperCase('en-US');
    if (CVE.test(buyuk)) gorulen.add(buyuk);
  }
  return [...gorulen];
}

function urunCozumle(ham: unknown): AdvisoryUrunGirdisi | null {
  if (!ham || typeof ham !== 'object' || Array.isArray(ham)) return null;
  const o = ham as Record<string, unknown>;
  const uretici = metin(o.uretici ?? o.vendor);
  const urunAdi = metin(o.urunAdi ?? o.product ?? o.ad);
  const cpe = metin(o.cpe);
  /* Ürünü tanımlayan hiçbir alan yoksa satır işe yaramaz: motor onu
     hiçbir varlıkla eşleştiremez ve tabloyu şişirmekten başka bir şey
     yapmaz. */
  if (uretici === null && urunAdi === null && cpe === null) return null;

  const etkilenenAlt = metin(o.etkilenenAlt ?? o.versionStartIncluding ?? o.altSinir);
  const etkilenenUst = metin(o.etkilenenUst ?? o.versionEndExcluding ?? o.ustSinir);
  const duzeltilenSurum = metin(o.duzeltilenSurum ?? o.fixedVersion);

  const surumBelirsiz = [etkilenenAlt, etkilenenUst, duzeltilenSurum]
    .some((s) => s !== null && !surumCozumle(s));

  return {
    uretici, urunAdi, cpe,
    etkilenenAlt,
    etkilenenAltDahil: mantik(o.etkilenenAltDahil, true),
    etkilenenUst,
    etkilenenUstDahil: mantik(o.etkilenenUstDahil, false),
    duzeltilenSurum,
    surumBelirsiz,
  };
}

/**
 * Duyuru belgesini ayrıştırır. Belge ya bir dizi ya da `{ advisories: [] }`
 * sarmalayıcısıdır; ikisi de kabul edilir çünkü ihracat biçimleri farklı.
 */
export function advisoryAyristir(ham: string): AdvisoryAyristirmaSonucu {
  const reddedilen: { sira: number; sebep: string }[] = [];
  let kok: unknown;
  try {
    kok = JSON.parse(ham);
  } catch {
    return { girdiler: [], reddedilen: [{ sira: 0, sebep: 'Belge geçerli JSON değil.' }] };
  }

  const dizi = Array.isArray(kok)
    ? kok
    : kok && typeof kok === 'object' && Array.isArray((kok as Record<string, unknown>).advisories)
      ? (kok as { advisories: unknown[] }).advisories
      : null;
  if (dizi === null) {
    return {
      girdiler: [],
      reddedilen: [{ sira: 0, sebep: 'Belge bir duyuru dizisi ya da { advisories: [...] } değil.' }],
    };
  }

  const girdiler: AdvisoryGirdisi[] = [];
  const gorulenReferans = new Set<string>();

  dizi.forEach((h, i) => {
    const sira = i + 1;
    if (!h || typeof h !== 'object' || Array.isArray(h)) {
      reddedilen.push({ sira, sebep: 'Kayıt bir nesne değil.' });
      return;
    }
    const o = h as Record<string, unknown>;
    const referans = metin(o.referans ?? o.id ?? o.advisoryId);
    if (referans === null) {
      reddedilen.push({ sira, sebep: 'Referans (kimlik) yok; duyuru tekilleştirilemez.' });
      return;
    }
    if (gorulenReferans.has(referans)) {
      reddedilen.push({ sira, sebep: `Aynı belgede yinelenen referans: ${referans}` });
      return;
    }
    const baslik = metin(o.baslik ?? o.title);
    if (baslik === null) {
      reddedilen.push({ sira, sebep: `${referans}: başlık yok.` });
      return;
    }

    const hamKaynak = (metin(o.kaynak ?? o.source) ?? 'diger').toLocaleLowerCase('en-US');
    /* Tanınmayan kaynak REDDEDİLMEZ, `diger`e düşer: kaynağı bilinmeyen
       gerçek bir duyuruyu atmak, onu hiç görmemekten daha kötüdür. */
    const kaynak = KAYNAKLAR.has(hamKaynak) ? hamKaynak : 'diger';

    const hamUrunler = Array.isArray(o.urunler) ? o.urunler
      : Array.isArray(o.products) ? o.products : [];
    const urunler: AdvisoryUrunGirdisi[] = [];
    hamUrunler.forEach((u, j) => {
      const c = urunCozumle(u);
      if (c === null) {
        reddedilen.push({
          sira, sebep: `${referans}: ${j + 1}. ürün satırında üretici/ürün/CPE yok.`,
        });
        return;
      }
      urunler.push(c);
    });

    const cveler = cveleriTopla(o.cveler ?? o.cves ?? o.cve);
    /* Ürünsüz duyuru KAYDA ALINIR: bir duyurunun varlığı, hangi ürünü
       etkilediği bilinmese de bilgidir. Korelasyon motoru ürün satırı
       olmayan duyuru için hiçbir varlık kaydı açmaz — bu doğrudur. */

    gorulenReferans.add(referans);
    girdiler.push({
      kaynak, referans, baslik,
      yayim: tarih(o.yayim ?? o.published),
      guncelleme: tarih(o.guncelleme ?? o.modified),
      url: metin(o.url ?? o.link),
      ozet: metin(o.ozet ?? o.summary ?? o.description),
      cveler, urunler,
    });
  });

  return { girdiler, reddedilen };
}

/* ═══════════════════════════════════════════════════════════════════════
   DENETİM FORMU · VERİ EŞLEMESİ — SAF

   Veritabanı satırlarını form girdisine çevirir. Sorguyu YAPMAZ: satırları
   çağıran getirir, kapsam daraltmasını çağıran uygular. Bu ayrım sayesinde
   eşleme veritabanısız test edilebilir — ve eşleme tam olarak test edilmesi
   gereken yerdir.

   ── HANGİ ALAN NEREDEN GELİR (R-D) ────────────────────────────────────
   Bu ürünün en pahalı kusuru bir ALAN EŞLEME kusuruydu: EPDK Ek-3'ün
   "Seviye" kademesi ürünün HEDEF OLGUNLUK alanına yazılmış, 508 zorunlu
   kontrolün hedefi en alt üç kademeye çekilmiş ve ad-hoc uygulamalar
   "hedefte" (yeşil) görünmüştü. Biçim doğru, değer aralıkta, iki taraf da
   geçerli veri — hiçbir kapı göremedi.

   Bu yüzden eşleme burada ADIYLA yazılıdır:

     hedefOlgunluk   ← `Madde.olgunlukSeviyesi`        (çerçevenin HEDEFİ,
                                                        her kapsam öğesi
                                                        için ORTAK)
     mevcutOlgunluk  ← `MaddeDurumu.olgunlukSeviyesi`  (bu öğede ÖLÇÜLEN)

   İkisini tek alana sıkıştırmak "hedefimiz neydi" sorusunu cevapsız
   bırakır; ters yazmak formu sessizce yalan söyletir.

   ── KAPSAM DIŞI, ÜRÜNDE BİR DURUM DEĞERİDİR ───────────────────────────
   `MaddeDurumu.durum === 'kapsamdisi'`. Gerekçe için ayrı bir kolon yok;
   kurumun yazdığı yer `not` alanıdır. `not` boşsa bu bir KUSURDUR ve
   form onu işaretler — burada gerekçe ÜRETİLMEZ. */

import type { MaddeGirdisi } from './formDoldurma';
import type { SoaGirdisi } from './soa';

/** Ürünün "kapsam dışı" durum değeri. */
export const KAPSAM_DISI_DURUMU = 'kapsamdisi';

/** Durum kodlarının denetçi diline karşılığı. */
export const DURUM_SOZU: Record<string, string> = {
  uyumlu: 'Uyumlu',
  kismi: 'Kısmen uyumlu',
  uyumsuz: 'Uyumsuz',
  degerlendirilmedi: 'Değerlendirilmedi',
  incelemede: 'İncelemede',
  kapsamdisi: 'Kapsam dışı',
};

/** Çağıranın getirdiği satır — sorgu şekli değil, ANLAM. */
export type MaddeDurumSatiri = {
  madde: {
    kod: string;
    baslik: string;
    /** ÇERÇEVENİN HEDEFİ — kapsam öğesinden bağımsız. */
    olgunlukSeviyesi: number | null;
  };
  /** Ürünün durum kodu. */
  durum: string;
  /** BU ÖĞEDE ÖLÇÜLEN kademe; `null` = ölçülmedi, `0` = uygulama başlamadı. */
  olgunlukSeviyesi: number | null;
  /** Kapsam dışı kararının gerekçesi burada durur; boşsa KUSUR. */
  not: string | null;
  sorumluAdi: string | null;
  sonDegerlendirme: Date | null;
  /** Bu madde durumuna bağlı kanıt sayısı; `null` = SAYILMADI. */
  kanitSayisi: number | null;
};

/** Tarihi denetçinin okuyacağı biçime çevirir; `null` ise `null` kalır. */
function tarihSozu(d: Date | null): string | null {
  if (d === null) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}

/** DB satırı → öz denetim formu girdisi. */
export function maddeGirdisi(s: MaddeDurumSatiri): MaddeGirdisi {
  const kapsamDisi = s.durum === KAPSAM_DISI_DURUMU;
  return {
    kod: s.madde.kod,
    baslik: s.madde.baslik,
    /* Durum kodu bilinmiyorsa KODUN KENDİSİ yazılır, "Değerlendirilmedi"
       değil: bilinmeyen bir kod, ölçülmemiş bir değer DEĞİLDİR — sözlüğün
       eksiği ürünün eksiğidir ve denetçi hangi kodu görmediğimizi
       görebilmelidir. */
    durum: DURUM_SOZU[s.durum] ?? s.durum,
    hedefOlgunluk: s.madde.olgunlukSeviyesi,
    mevcutOlgunluk: s.olgunlukSeviyesi,
    kapsamDisi,
    kapsamDisiGerekcesi: kapsamDisi ? s.not : null,
    kanitSayisi: s.kanitSayisi,
    sorumlu: s.sorumluAdi,
    sonDegerlendirme: tarihSozu(s.sonDegerlendirme),
  };
}

/** DB satırı → uygulanabilirlik beyanı (SoA) girdisi. */
export function soaGirdisi(s: MaddeDurumSatiri): SoaGirdisi {
  const kapsamDisi = s.durum === KAPSAM_DISI_DURUMU;
  return {
    kod: s.madde.kod,
    baslik: s.madde.baslik,
    uygulanabilir: !kapsamDisi,
    gerekce: s.not,
    uygulamaDurumu: DURUM_SOZU[s.durum] ?? s.durum,
    /* Kanıt REFERANSI ile kanıt SAYISI ayrı şeylerdir: sayı "kaç dosya
       var" der, referans "hangisi" der. Bugün ürün satır başına referans
       tutmuyor; sayı varsa onu yazmak referans yerine geçmez, bu yüzden
       sayı burada referans olarak SUNULMAZ. */
    kanitReferansi: s.kanitSayisi === null || s.kanitSayisi === 0
      ? null : `${s.kanitSayisi} kanıt kaydı`,
    sorumlu: s.sorumluAdi,
  };
}

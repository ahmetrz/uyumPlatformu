/* ═══════════════════════════════════════════════════════════════════════
   UY-41 · Resmî mevzuat kaynağı takibi

   `lib/uyum/disSaglayicilar.ts` ile aynı kalıp: bir ARAYÜZ, bir KAYIT
   DEFTERİ ve bağlanmamış sağlayıcının açık beyanı.

   ── ÜRÜN HİÇBİR ADRESLE GELMEZ ────────────────────────────────────────
   Bu dosyada tek bir resmî site adresi YOKTUR ve olmayacaktır. Bir
   mevzuat kaynağının adresi kurumun kararıdır: hangi otoritenin hangi
   sayfasının takip edileceği, kurumun kendi uyum kapsamına bağlıdır.
   Ürüne gömülü bir adres, kurum başka bir kaynağı takip ediyorsa
   sessizce yanlış bir izlenim verir.

   ── BAĞLI OLMAMAK, İZLEMEMEK DEMEK DEĞİLDİR ───────────────────────────
   Sağlayıcı bağlı değilken de kayıt işe yarar: hangi regülasyonun hangi
   kaynaktan, hangi aralıkla izleneceği yazılı bir kurum kararıdır ve
   ürün bunu kütüğe alır. "En son ne zaman bakıldı" sorusunu elle de
   olsa cevaplayabilmek, hiç cevaplayamamaktan iyidir.

   Bu dosya hiçbir dış sisteme bağlanmaz ve hiçbir adres içermez. */

export type KaynakSaglayici = {
  readonly ad: string;
  readonly bagli: boolean;
  /** Bağlanmak için kurumdan ne gerekiyor — ekranda AYNEN görünür. */
  readonly gereken: string;
  /** Bağlı olmadığında ürün ne YAPAR. */
  readonly bagliDegilkenDavranis: string;
};

export const mevzuatSaglayici: KaynakSaglayici = {
  ad: 'resmi_kaynak_izleyici',
  bagli: false,
  gereken: 'Takip edilecek resmî kaynakların adresleri ve erişim biçimi: '
    + 'yayım sayfası ya da besleme (RSS/Atom/API) adresi, kimlik gerekiyorsa '
    + 'yöntemi, ve değişikliğin nasıl anlaşılacağı (yayım tarihi alanı, '
    + 'sürüm etiketi ya da içerik özeti). Adresler ÜRÜNLE GELMEZ; kurumun '
    + 'uyum kapsamına göre kurum belirler.',
  bagliDegilkenDavranis: 'Kaynaklar kütüğe ELLE kaydedilir ve "en son ne zaman '
    + 'bakıldı" bilgisi elle güncellenir. Ürün hiçbir siteye kendiliğinden '
    + 'bağlanmaz ve "değişiklik yok" DEMEZ — yalnız en son bakılan tarihi '
    + 've o bakışta düşülen notu gösterir.',
};

export const KAYNAK_SAGLAYICILARI: readonly KaynakSaglayici[] = [mevzuatSaglayici];

export function etkinKaynakSaglayici(): KaynakSaglayici | null {
  return KAYNAK_SAGLAYICILARI.find((s) => s.bagli) ?? null;
}

/* ═══ Takip durumu ════════════════════════════════════════════════════ */

export const IZLEME_TURLERI = ['elle', 'saglayici'] as const;
export type IzlemeTuru = (typeof IZLEME_TURLERI)[number];

export const IZLEME_SOZU: Record<IzlemeTuru, string> = {
  elle: 'Elle izleniyor',
  saglayici: 'Sağlayıcı ile izleniyor',
};

export type TakipDurumu = 'guncel' | 'yaklasiyor' | 'gecikti' | 'hic_bakilmadi' | 'adressiz';

export const TAKIP_SOZU: Record<TakipDurumu, string> = {
  guncel: 'takip güncel',
  yaklasiyor: 'kontrol zamanı yaklaşıyor',
  gecikti: 'kontrol GECİKTİ',
  /* Sıfır değil, bilinmiyor: hiç bakılmamış bir kaynak "0 gün önce
     bakıldı" değildir ve "güncel" hiç değildir. */
  hic_bakilmadi: 'hiç bakılmadı',
  adressiz: 'adres girilmemiş — izlenecek bir yer yok',
};

export const TAKIP_SINIFI: Record<TakipDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  guncel: 'ok', yaklasiyor: 'md', gecikti: 'bd',
  hic_bakilmadi: 'unk', adressiz: 'unk',
};

/** Kontrol aralığının bu oranı geçilince "yaklaşıyor" denir. */
export const YAKLASMA_ORANI = 0.8;

/**
 * Bir kaynağın takip durumu.
 *
 * `adressiz` bir kusur DEĞİL bir kurulum durumudur ve `hic_bakilmadi`
 * ile karıştırılmaz: adresi olmayan bir kayda "gecikti" demek, kurumun
 * yapmadığı bir işi kusur saymak olurdu — önce adresin girilmesi
 * gerekir.
 */
export function takipDurumu(o: {
  adres: string | null;
  sonKontrol: number | null;
  araliksGun: number;
  simdi: number;
}): TakipDurumu {
  if (!o.adres || o.adres.trim().length === 0) return 'adressiz';
  if (o.sonKontrol === null) return 'hic_bakilmadi';
  const gecen = o.simdi - o.sonKontrol;
  const aralik = o.araliksGun * 86_400_000;
  if (gecen > aralik) return 'gecikti';
  return gecen >= aralik * YAKLASMA_ORANI ? 'yaklasiyor' : 'guncel';
}

export type TakipOzeti = {
  toplam: number;
  guncel: number;
  yaklasiyor: number;
  gecikti: number;
  hicBakilmadi: number;
  adressiz: number;
  /** Takip oranı yalnız ADRESİ OLAN kaynaklar üzerinden; payda 0 ise null. */
  guncelOrani: number | null;
};

export function takipOzeti(durumlar: readonly TakipDurumu[]): TakipOzeti {
  const say = (d: TakipDurumu) => durumlar.filter((x) => x === d).length;
  const adressiz = say('adressiz');
  const payda = durumlar.length - adressiz;
  return {
    toplam: durumlar.length,
    guncel: say('guncel'),
    yaklasiyor: say('yaklasiyor'),
    gecikti: say('gecikti'),
    hicBakilmadi: say('hic_bakilmadi'),
    adressiz,
    guncelOrani: payda === 0 ? null : Math.round((say('guncel') / payda) * 100),
  };
}

export function takipCumlesi(o: TakipOzeti): string {
  if (o.toplam === 0) {
    return 'Kayıtlı resmî kaynak yok — mevzuat değişikliği izlenmiyor.';
  }
  if (o.gecikti > 0) {
    return `${o.gecikti} kaynağın kontrol zamanı geçti; mevzuat değişmiş olabilir.`;
  }
  if (o.hicBakilmadi > 0) {
    return `${o.hicBakilmadi} kaynağa HİÇ bakılmadı — takip başlamadı.`;
  }
  if (o.adressiz > 0) {
    return `${o.adressiz} kaynağın adresi girilmemiş; izlenecek bir yer yok.`;
  }
  return `${o.toplam} kaynağın takibi güncel.`;
}

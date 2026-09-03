import type { Durum } from '@/components/kabuk/temel';
// YALNIZ TİP: `saglikOzeti` server-only bir modüldür, `import type` derlemede
// silinir ve istemci paketine hiçbir sunucu kodu sızmaz.
import type {
  ConnectorSagligi, SaglikDurumu, Tazelik, ZamanlayiciGorunumu,
} from '@/lib/entegrasyon/saglikOzeti';

/* Platform sağlığı — saf mantık. Veritabanına, React'e ve server-only'ye
   dokunmaz; testi de dokunmaz (tests/saglik-mantik.test.ts).

   Ekranın tek sözü: SESSİZ HATA YOK. Bu sözün üç kuralı burada yaşar:

   1. Hiç koşmamış motor BAŞARISIZ DEĞİLDİR — `unk` işaretçisi alır,
      "başarılı" da sayılmaz.
   2. `kimlik_bekleniyor` bir hata değil, bekleyen kurulum adımıdır;
      `basarisiz` ile aynı kovaya konmaz (lib/entegrasyon/saglikOzeti.ts
      bunu zaten ayrı bir durum olarak üretir — burada yalnız giydiriyoruz).
   3. Ölçülemeyen tazelik `gecikmis` DEĞİLDİR: poll aralığı tanımsızsa
      "bilinmiyor" yazılır, sıfır gecikme uydurulmaz. */

/* ═══ Motor kataloğu ══════════════════════════════════════════════════════
   `elleCalisir` = lib/eylemler2/isler.ts içindeki ISLER haritasında var,
   yani ekrandan tetiklenebilir. Zincirin kendi kendine yazdığı koşular
   (uygulanabilirlik, entegrasyon_zinciri, zincir_guvenlik_ihlali) elle
   tetiklenmez ama GÖRÜNÜR — koşan bir motorun ekranda karşılığı olmaması
   sessiz hata olurdu. */

export type IsTanimi = {
  ad: string; etiket: string; aciklama: string; elleCalisir: boolean;
};

/* Motor kataloğu — İNSAN İÇİN olan kısım.

   Motorların KENDİSİ `lib/motorlar/kayit.ts`'te yaşar; burası yalnız
   etiket ve açıklama taşır (kod bunları türetemez). Ama iki liste ayrı
   olduğu sürece ayrışabilirler: bir motor deftere girip buraya girmezse
   ekranda "Motor kataloğunda tanımlı değil" diye görünür ve yanlışlıkla
   "zincirden koşar" etiketi alır — yani yeni motor, bozuk bir motor gibi
   görünür.

   `tests/saglik-mantik.test.ts` bu ayrışmayı yakalar: defterdeki her
   motorun burada bir satırı olmak ZORUNDA. Buradaki fazla satırlar
   serbesttir — zincirden koşan işler (uygulanabilirlik, entegrasyon
   zinciri) ve bakım işi motor defterinde YOKTUR ve olmamalıdır. */
export const IS_TANIMLARI: IsTanimi[] = [
  { ad: 'kanit_tazelik', etiket: 'Kanıt tazeliği', elleCalisir: true,
    aciklama: 'Geçerliliği biten kanıtları bayatlar, yenileme görevi üretir' },
  { ad: 'deadline_motoru', etiket: 'Son tarih motoru', elleCalisir: true,
    aciklama: 'Yaklaşan/geçen tarihler için görev ve bildirim üretir' },
  { ad: 'gap_to_action', etiket: 'Gap → Aksiyon', elleCalisir: true,
    aciklama: 'Uyum açıklarından onay bekleyen proje önerisi üretir' },
  { ad: 'veri_kalitesi', etiket: 'Veri kalitesi', elleCalisir: true,
    aciklama: 'Governance verisindeki boşlukları tarar ve raporlar' },
  { ad: 'uyum_anlik', etiket: 'Uyum anlık görüntüsü', elleCalisir: true,
    aciklama: 'Aktif süreçlerin durum ve güven dağılımını günlük olarak saklar' },
  { ad: 'yedek_dogrulama', etiket: 'Yedek doğrulama', elleCalisir: true,
    aciklama: 'Kritik varlıkların konfigürasyon yedeği boşluklarını tarar — yedek almaz' },
  { ad: 'topoloji_sapma', etiket: 'Topoloji sapması', elleCalisir: true,
    aciklama: 'Topoloji anlıklarını onaylı temelle karşılaştırır — kayıt değiştirmez' },
  { ad: 'olay_etki', etiket: 'Olay etkisi', elleCalisir: true,
    aciklama: 'Olayın üretim/emniyet etkisini ÖNERİR; kararı insan doğrular' },
  { ad: 'erisim_degerlendirme', etiket: 'Erişim değerlendirme', elleCalisir: true,
    aciklama: 'Tedarikçi/uzaktan erişim oturumlarından görev ve veri kalitesi bulgusu '
      + 'üretir — oturuma DOKUNMAZ, erişim kesmez' },
  /* Varlık güvenlik duruşu üçlüsü (OT-11 · OT-22 · OT-25). Üçünün de
     açıklaması NE YAPMADIKLARINI da söyler: bu ekran "motor bir şeyi
     kendiliğinden kapattı mı" sorusunun sorulduğu yerdir. */
  { ad: 'firmware_uyumu', etiket: 'Firmware uyumu', elleCalisir: true,
    aciklama: 'Kurulu firmware\'i onaylı tabana karşı ölçer — sürüm okunamazsa '
      + 'UYUMLU SAYMAZ; cihaza ya da varlık kaydına dokunmaz' },
  { ad: 'zafiyet_korelasyonu', etiket: 'Zafiyet korelasyonu', elleCalisir: true,
    aciklama: 'Üretici duyurusu ile kurulu sürümü eşleştirir; elle verilmiş '
      + 'kararı EZMEZ, zafiyet durumunu değiştirmez' },
  { ad: 'ag_tutarliligi', etiket: 'Ağ tutarlılığı', elleCalisir: true,
    aciklama: 'Zone dışı IP, çakışan subnet ve çift IP arar; ölçülemeyeni '
      + 'bulguya çevirmez, ayrı bir ölçüm borcu olarak açar' },
  { ad: 'bakim_temizlik', etiket: 'Bakım temizliği', elleCalisir: false,
    aciklama: 'Süresi dolmuş oturum ve iş kilidi satırlarını siler (saatlik, zamanlayıcıdan) '
      + '— bulgu üretmez, veri yorumlamaz' },
  { ad: 'uygulanabilirlik', etiket: 'Uygulanabilirlik', elleCalisir: false,
    aciklama: 'Tesis profili değiştiğinde madde kapsamını yeniden hesaplar (zincirden koşar)' },
  { ad: 'entegrasyon_zinciri', etiket: 'Entegrasyon zinciri', elleCalisir: false,
    aciklama: 'Yeni veri aktarıldığında motorları doğru sırada koşturur (zincirden koşar)' },
  { ad: 'zincir_guvenlik_ihlali', etiket: 'Zincir güvenlik ihlali', elleCalisir: false,
    aciklama: 'Zincir otomasyon sınırını aştıysa başarısız koşu bırakır — boş olması iyi haberdir' },
];

/** Her motorun çekmecede gösterilen koşu geçmişi derinliği.
    Önceki arayüz katmanında "son 20 koşu" TEK bir listede duruyordu ve çok koşan bir motor
    az koşanı listeden düşürebiliyordu. Geçmiş artık kaydın kendi
    çekmecesinde yaşıyor: hiçbir motor listeden düşmez. */
export const GECMIS_DERINLIGI = 8;

/* ═══ Biçimler ══════════════════════════════════════════════════════════ */

export type Kosu = {
  id: string;
  isAdi: string;
  durum: string;
  baslangic: string;
  bitis: string | null;
  sureMs: number | null;
  islenen: number;
  uretilen: number;
  hata: string | null;
  denemeNo: number;
};

export type Motor = IsTanimi & {
  /** yeniden eskiye sıralı; boş dizi = HİÇ KOŞMADI ("başarısız" değil) */
  kosular: Kosu[];
};

export type KaliteBulgusu = {
  id: string;
  kural: string;
  aciklama: string;
  kaynakTipi: string;
  olusturuldu: string;
  /** işaret edilen kayıt silinmişse null — bu bir bilinmeyendir */
  kayitEtiket: string | null;
  href: string | null;
};

/* ═══ Biçimlendirme ═════════════════════════════════════════════════════ */

export function sureFmt(ms: number | null): string {
  if (ms === null) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** Dakikayı okunur süreye çevirir (tazelik ve bayatlık için). */
export function dkFmt(dk: number): string {
  if (dk < 60) return `${dk} dk`;
  if (dk < 1440) return `${Math.floor(dk / 60)} sa`;
  return `${Math.floor(dk / 1440)} g`;
}

export function kisalt(metin: string, uzunluk: number): string {
  return metin.length > uzunluk ? `${metin.slice(0, uzunluk)}…` : metin;
}

/* ═══ Motor ═════════════════════════════════════════════════════════════ */

export function sonKosu(m: Motor): Kosu | null {
  return m.kosular[0] ?? null;
}

/** Motor işaretçisi. Hiç koşmamış motor `unk`tur: ne başarılı ne başarısız. */
export function motorImi(m: Motor): Durum {
  const s = sonKosu(m);
  if (s === null) return 'unk';
  if (s.durum === 'basarisiz') return 'bd';
  if (s.durum === 'calisiyor') return 'pl';
  if (s.durum === 'basarili') return 'ok';
  // Tanımadığımız koşu durumu uydurulmaz.
  return 'unk';
}

/** Koşu geçmişi şeridindeki tik sayısı. */
export const GECMIS_TIK = 5;

/**
 * Son N koşunun tik dizisi — ESKİDEN YENİYE.
 *
 * Neden listede: motor satırı bugüne kadar YALNIZ son koşuyu gösteriyordu.
 * "Bir kez patladı" ile "beş koşudur patlıyor" aynı satırdı; ikisi çok
 * farklı kararlar gerektirir ve fark ancak çekmeceyi açınca görülüyordu.
 *
 * Kaydı olmayan sıra `null` döner ve tik BOŞ çizilir: hiç koşmamış bir
 * motorun şeridi "beş başarısız" gibi görünmemeli — BİLİNMEYEN ≠ YANLIŞ.
 * Bu yüzden dizi sona hizalanır: son tik daima en yeni koşudur.
 */
export function kosuGecmisi(m: Motor, adet = GECMIS_TIK): (Durum | null)[] {
  const son = m.kosular.slice(0, adet).reverse();
  const bos = adet - son.length;
  return [
    ...Array.from({ length: bos }, () => null),
    ...son.map((k): Durum => {
      if (k.durum === 'basarisiz') return 'bd';
      if (k.durum === 'calisiyor') return 'pl';
      if (k.durum === 'basarili') return 'ok';
      return 'unk';
    }),
  ];
}

/** Şeridin ekran okuyucu cümlesi — sayı uydurulmaz, sayılır. */
export function kosuGecmisiEtiketi(m: Motor, adet = GECMIS_TIK): string {
  const d = kosuGecmisi(m, adet);
  const kayit = d.filter((x) => x !== null);
  if (kayit.length === 0) return 'Koşu kaydı yok';
  const basarisiz = kayit.filter((x) => x === 'bd').length;
  return `Son ${kayit.length} koşu · ${basarisiz} başarısız`;
}

/** Çekmece kimlik sözcüğü — durumun kelimeyle yazıldığı TEK yer. */
export function motorSozu(m: Motor): string {
  const s = sonKosu(m);
  if (s === null) return 'Hiç koşmadı';
  if (s.durum === 'basarisiz') return 'Son koşu başarısız';
  if (s.durum === 'calisiyor') return 'Koşu sürüyor';
  if (s.durum === 'basarili') return 'Son koşu başarılı';
  return 'Koşu durumu bilinmiyor';
}

export function motorCumlesi(m: Motor): string {
  const s = sonKosu(m);
  if (s === null) {
    return `${m.aciklama}. Hiç koşu kaydı yok — sağlıklı olduğu anlamına GELMEZ.`;
  }
  if (s.durum === 'basarisiz') {
    return s.hata ?? 'Koşu hata ile bitti ama hata metni kaydedilmemiş — bu bir kayıt boşluğudur.';
  }
  if (s.durum === 'calisiyor') return `${m.aciklama}. Koşu şu an sürüyor.`;
  return `${m.aciklama}. Son koşuda ${s.islenen} kayıt işlendi, ${s.uretilen} çıktı üretildi.`;
}

const MOTOR_AGIRLIGI: Record<Durum, number> = {
  bd: 0, unk: 1, pl: 2, md: 3, ok: 4, tamam: 5,
};

export function motorlariSirala(motorlar: Motor[]): Motor[] {
  return [...motorlar].sort((a, b) =>
    MOTOR_AGIRLIGI[motorImi(a)] - MOTOR_AGIRLIGI[motorImi(b)]
    || a.etiket.localeCompare(b.etiket, 'tr'));
}

/** Kuyruğa yalnız son koşusu başarılı motor iner; başarısız ve hiç
    koşmamış motor sayıdan bağımsız görünür kalır (06 §A3). */
export function motorToplanabilir(m: Motor): boolean {
  return motorImi(m) === 'ok';
}

/* ═══ Entegrasyon ═══════════════════════════════════════════════════════ */

/** Sağlık durumu → durum işaretçisi.
    `kimlik_bekleniyor` ve `calisiyor` PLANLI'dır: ikisi de hata değildir ve
    ikisi de "kanıtlanmış sağlık" değildir. `hic_kosmadi` ve `bilinmiyor`
    BİLİNMEYEN'dir — sıfır değil. */
export const ENTEGRASYON_IM: Record<SaglikDurumu, Durum> = {
  basarili: 'ok',
  basarisiz: 'bd',
  bayat_kosu: 'bd',
  kimlik_bekleniyor: 'pl',
  calisiyor: 'pl',
  hic_kosmadi: 'unk',
  bilinmiyor: 'unk',
};

export const ENTEGRASYON_SOZU: Record<SaglikDurumu, string> = {
  basarili: 'Son koşu başarılı',
  basarisiz: 'Son koşu başarısız',
  bayat_kosu: 'Bayat koşu',
  kimlik_bekleniyor: 'Kimlik bekleniyor',
  calisiyor: 'Koşu sürüyor',
  hic_kosmadi: 'Hiç koşmadı',
  bilinmiyor: 'Koşu durumu bilinmiyor',
};

export const ENTEGRASYON_ACIKLAMA: Record<SaglikDurumu, string> = {
  basarili: 'Son koşu başarıyla tamamlandı.',
  basarisiz: 'Kimlik bilgisi yerinde ama son koşu hata ile bitti.',
  bayat_kosu: '“Çalışıyor” görünen koşunun başlangıcı çok eski — süreç ölmüş olabilir.',
  kimlik_bekleniyor: 'Dış sistem henüz bağlı değil — hata değil, bekleyen kurulum adımı.',
  calisiyor: 'Koşu şu an sürüyor.',
  hic_kosmadi: 'Hiç koşu kaydı yok — sağlıklı olduğu anlamına GELMEZ.',
  bilinmiyor: 'Koşu kaydı yorumlanamayan bir durum taşıyor.',
};

export const CONNECTOR_TIP: Record<string, string> = {
  ad_entra: 'Dizin (AD/Entra)', vuln_scanner: 'Zafiyet tarayıcı', edr: 'EDR',
  siem: 'SIEM', backup: 'Yedekleme', network_firewall: 'Güvenlik duvarı',
  ot_discovery: 'OT keşfi', manual_import: 'Elle içe aktarım',
};

export const KIMLIK_TIP: Record<string, string> = {
  none: 'Kimlik gerekmiyor', api_key: 'API anahtarı', basic: 'Kullanıcı adı / parola',
  oauth2_client_credentials: 'OAuth2 (client credentials)', certificate: 'İstemci sertifikası',
};

export const TETIKLEYEN: Record<string, string> = {
  manuel: 'elle', zamanlanmis: 'zamanlanmış', api: 'API',
};

/** Tazelik hücresi metni. Ölçülemeyen tazelik SAYIYA çevrilmez. */
export function tazelikYazisi(t: Tazelik): string {
  if (t.durum === 'bilinmiyor') {
    return t.gecenDk !== null ? `ölçülemedi · ${dkFmt(t.gecenDk)}` : 'ölçülemedi';
  }
  const kat = t.gecikmeOrani !== null ? ` · ${t.gecikmeOrani.toFixed(1)}×` : '';
  return `${dkFmt(t.gecenDk ?? 0)}${kat}`;
}

/** Tazeliğin işaretçi karşılığı — `bilinmiyor` kritik DEĞİLDİR. */
export function tazelikDurumu(t: Tazelik): Durum | undefined {
  if (t.durum === 'bilinmiyor') return 'unk';
  return t.durum === 'gecikmis' ? 'bd' : undefined;
}

export function connectorToplanabilir(c: ConnectorSagligi): boolean {
  return ENTEGRASYON_IM[c.durum] === 'ok';
}

/** Connector satırının alt satırı: kimlik + en fazla iki olgu. */
export function connectorAlt(c: ConnectorSagligi): string {
  const olgular = [
    CONNECTOR_TIP[c.tip] ?? c.tip,
    c.etkin ? null : 'otomatik koşuya kapalı',
  ].filter((x): x is string => !!x).slice(0, 2);
  return [c.kod, ...olgular].join(' · ');
}

/* ═══ Veri kalitesi ═════════════════════════════════════════════════════ */

/** Açık bulgu bir boşluktur, çökme değil. İşaret ettiği kayıt silinmişse
    bulgu artık DOĞRULANAMAZ — o zaman bilinmeyen olur. */
export function kaliteImi(b: KaliteBulgusu): Durum {
  return b.kayitEtiket === null ? 'unk' : 'md';
}

export function kaliteToplanabilir(b: KaliteBulgusu): boolean {
  return kaliteImi(b) === 'md';
}

export function kaliteSirala(bulgular: KaliteBulgusu[]): KaliteBulgusu[] {
  return [...bulgular].sort((a, b) =>
    (kaliteImi(a) === 'unk' ? 0 : 1) - (kaliteImi(b) === 'unk' ? 0 : 1)
    || a.kural.localeCompare(b.kural, 'tr')
    || b.olusturuldu.localeCompare(a.olusturuldu));
}

/* ═══ Kip (kayıt ailesi) ════════════════════════════════════════════════
   Dört kayıt ailesi tek canvasta yaşar: motorlar (içeride koşan),
   connector'lar (dışarıya bağlanan), veri kalitesi bulguları (ikisinin
   bulduğu boşluk) ve veri kökeni (gelen verinin nereden geldiği).
   Ayrı ekranlara bölmek "platform sağlığı" sorusunu parçalardı; hepsini
   aynı tabloda üst üste yığmak yoğunluk sözleşmesini kırardı.

   METRİK BÜTÇESİ: dört kip var ama metrik satırı hâlâ DÖRT metriktir ve
   kipten bağımsızdır. Köken kipi kendi sayısını metriğe eklemez — bütçeyi
   beşe çıkarmak yerine sayı kip düğmesinde ve tablo dip notunda yaşar. */

export type Kip = 'motor' | 'entegrasyon' | 'kalite' | 'koken';

/** Yoğunluk sözleşmesi: 5–9 görünür satır, gerisi kuyruğa iner. */
export const GORUNUR_BUTCE = 7;

/** Kritik satır ASLA toplanmaz; kuyruk yalnız kalan bütçeyi yer. */
export function bolumle<T>(
  sirali: T[], toplanabilir: (x: T) => boolean, kuyrukAcik: boolean,
  butce = GORUNUR_BUTCE,
): { gorunur: T[]; toplanan: T[] } {
  if (kuyrukAcik) return { gorunur: sirali, toplanan: [] };
  const sabit = sirali.filter((x) => !toplanabilir(x));
  const kalan = sirali.filter(toplanabilir);
  const slot = Math.max(0, butce - sabit.length);
  return { gorunur: [...sabit, ...kalan.slice(0, slot)], toplanan: kalan.slice(slot) };
}

/* ═══ Metrikler ═════════════════════════════════════════════════════════
   En fazla dört ve filtreden BAĞIMSIZ. Motorlarla connector'lar aynı
   kovada sayılır: kullanıcının sorusu "platform sağlıklı mı", "iç motor mu
   dış bağlantı mı" değil. */

export type Metrikler = {
  /** son koşusu hata ile biten motor + connector (bayat koşu dâhil) */
  basarisiz: number;
  /** hiç koşmamış ya da durumu yorumlanamayan kaynak — SIFIR DEĞİL */
  olculmedi: number;
  /** kimlik kurulumu bekleyen connector — hata değil, bekleyen adım */
  kimlikBekleyen: number;
  /** açık veri kalitesi bulgusu */
  kaliteAcik: number;
  motorToplam: number;
  connectorToplam: number;
  /** veri tazeliği beklenen aralığın ötesine geçmiş connector */
  gecikmisTazelik: number;
};

export function metrikleriHesapla(
  motorlar: Motor[], connectorlar: ConnectorSagligi[], kalite: KaliteBulgusu[],
): Metrikler {
  const motorIm = motorlar.map(motorImi);
  const connectorIm = connectorlar.map((c) => ENTEGRASYON_IM[c.durum]);
  return {
    basarisiz: motorIm.filter((d) => d === 'bd').length
      + connectorIm.filter((d) => d === 'bd').length,
    olculmedi: motorIm.filter((d) => d === 'unk').length
      + connectorIm.filter((d) => d === 'unk').length,
    kimlikBekleyen: connectorlar.filter((c) => c.durum === 'kimlik_bekleniyor').length,
    kaliteAcik: kalite.length,
    motorToplam: motorlar.length,
    connectorToplam: connectorlar.length,
    gecikmisTazelik: connectorlar.filter((c) => c.tazelik.durum === 'gecikmis').length,
  };
}

export function baslikMetni(m: Metrikler): { vurgu?: string; ad: string; durum?: Durum } {
  if (m.basarisiz > 0) {
    return { vurgu: `${m.basarisiz} kaynak`, ad: 'son koşusunu tamamlayamadı', durum: 'bd' };
  }
  if (m.olculmedi > 0) {
    return { vurgu: `${m.olculmedi} kaynak`, ad: 'hiç ölçülmedi', durum: 'unk' };
  }
  if (m.kaliteAcik > 0) {
    return { vurgu: `${m.kaliteAcik} veri boşluğu`, ad: 'açık', durum: 'md' };
  }
  return { ad: 'Tüm motorlar ve bağlantılar koştu' };
}

/* ═══ Connector yapılandırma tezgâhı — saf mantık ════════════════════════
   §8'in ekrana düşen kısmı. Buradaki hiçbir fonksiyon dış sisteme
   bağlanmaz, sır çözmez ve "başarılı" uydurmaz; yalnız sunucudan gelen
   sonucu durum işaretçisine çevirir. */

/** Ortam sözcükleri — `prisma/schema.prisma` → `Connector.ortam` ile birebir. */
export const ORTAM_SOZU: Record<string, string> = {
  gelistirme: 'Geliştirme', test: 'Test', uretim: 'Üretim',
};

export const SENKRON_SOZU: Record<string, string> = {
  tam: 'Tam çekim', delta: 'Delta (imleçli)',
};

/**
 * Ortam hücresinin metni. `null` BİLİNMİYOR demektir; "geliştirme"
 * varsayılmaz — üretim OT ağına bakan bir kaydı zararsız göstermek bu
 * ekranda yapılabilecek en pahalı hatadır.
 */
export function ortamYazisi(ortam: string | null): string {
  if (!ortam) return 'bilinmiyor';
  return ORTAM_SOZU[ortam] ?? etiketleYerel(ortam);
}

/** `etiketle` sunucu sabitlerinden gelir; burada tek satırlık yerel karşılığı
    kullanılıyor ki bu modül hiçbir şeye bağımlı kalmasın (saf mantık). */
function etiketleYerel(deger: string): string {
  const okunur = deger.replace(/[_-]+/g, ' ').trim();
  return okunur.charAt(0).toLocaleUpperCase('tr-TR') + okunur.slice(1);
}

/** Üretime bakan kayıt AYIRT EDİLİR: bu bir durum değil, bir güvenlik
    niteliğidir — bu yüzden işaretçi değil, kendi rengiyle yazılır. */
export function uretimMi(ortam: string | null): boolean {
  return ortam === 'uretim';
}

export function ortamRengi(ortam: string | null): string {
  if (uretimMi(ortam)) return 'var(--aksan)';
  if (!ortam) return 'var(--unk)';
  return 'var(--i3)';
}

/** Senkron kipi metni; bilinmiyorsa 'delta' varsayılmaz. */
export function senkronYazisi(kip: string | null): string {
  if (!kip) return 'bilinmiyor';
  return SENKRON_SOZU[kip] ?? etiketleYerel(kip);
}

/* ── Sır sağlayıcıları ──────────────────────────────────────────────── */

/** Bağlı olmayan sağlayıcı HATA değildir: bekleyen kurulum adımıdır.
    `bd` verilseydi çalışan bir kurulumda kırmızı bir alarm asılı kalırdı. */
export function saglayiciImi(s: { bagli: boolean }): Durum {
  return s.bagli ? 'ok' : 'pl';
}

/** İşaretçinin yanına durum SÖZCÜĞÜ yazılmaz; bağlı olmayan sağlayıcı
    yerine NE GEREKTİĞİ yazılır — tek eyleme dönük bilgi budur. */
export function saglayiciNotu(s: { bagli: boolean; gereken: string | null }): string | null {
  if (s.bagli) return null;
  return s.gereken ?? 'Bağlantı bilgisi tanımlı değil';
}

/* ── Zamanlayıcı görünürlüğü ────────────────────────────────────────── */

export type VadeCevabi =
  /** zamanlayıcıya bakılamadı — "koşmuyor" demek DEĞİL */
  | { tur: 'bilinmiyor'; cumle: string }
  | { tur: 'vadeli'; cumle: string }
  | { tur: 'koşmuyor'; cumle: string };

/**
 * "Bu connector neden senkronize olmuyor?" sorusunun tek cevabı.
 *
 * Kaynak `lib/is/zamanlayici.ts` → `vadesiGelenler()`; sebep metnini o
 * modül üretir ve BURADA YENİDEN YAZILMAZ. Ekranın kendi tahminini
 * uydurması, zamanlayıcının gerçek kararıyla ayrışan bir açıklama üretirdi.
 */
export function vadeCevabi(
  z: ZamanlayiciGorunumu, connectorId: string,
): VadeCevabi {
  if (!z.okundu) {
    return { tur: 'bilinmiyor',
      cumle: z.hata ?? 'Zamanlayıcı durumu okunamadı — koşmadığı anlamına gelmez.' };
  }
  if (z.connectorVadeli.includes(connectorId)) {
    return { tur: 'vadeli', cumle: 'Vadesi geldi — sıradaki tikte koşacak.' };
  }
  const sebep = z.connectorSebep[connectorId];
  if (sebep) return { tur: 'koşmuyor', cumle: sebep };
  /* Ne vadeli ne atlanan listesinde: zamanlayıcı bu kaydı hiç görmemiş
     (silinmiş ya da yeni eklenmiş olabilir). Bu bir bilinmeyendir. */
  return { tur: 'bilinmiyor',
    cumle: 'Zamanlayıcı bu kaydı hiç değerlendirmemiş — sebebi bilinmiyor.' };
}

export const VADE_IM: Record<VadeCevabi['tur'], Durum> = {
  bilinmiyor: 'unk', vadeli: 'ok', 'koşmuyor': 'pl',
};

/* ── Bağlantı testi ─────────────────────────────────────────────────── */

/** `connectorTest` sunucu eyleminin dönüş biçimi (demo ikizi dâhil). */
export type TestYaniti =
  | { ok: true; baglandi: boolean; kimlikEksik: boolean; ayrinti: string }
  | { ok: false; hata: string };

export type TestSonucu = {
  tur: 'baglandi' | 'kimlik_bekleniyor' | 'basarisiz';
  ayrinti: string;
};

/**
 * Test sonucunu ekranın diline çevirir.
 *
 * DEĞİŞMEZ: `ok:true` "bağlandı" DEMEK DEĞİLDİR — eylem başarıyla koştu
 * demektir. Bağlanıp bağlanmadığını yalnız `baglandi` söyler. Bu ikisini
 * karıştırmak, bağlanamayan bir adaptör için "test başarılı" yazmak
 * olurdu; bu ekranın varlık sebebi tam olarak bunu engellemektir.
 *
 * `kimlikEksik` HATA DEĞİLDİR: bekleyen bir kurulum adımıdır ve `pl`
 * işaretçisi alır, `bd` değil.
 */
export function testSonucunuYorumla(y: TestYaniti): TestSonucu {
  if (!y.ok) return { tur: 'basarisiz', ayrinti: y.hata };
  if (y.baglandi) return { tur: 'baglandi', ayrinti: y.ayrinti };
  if (y.kimlikEksik) return { tur: 'kimlik_bekleniyor', ayrinti: y.ayrinti };
  return { tur: 'basarisiz', ayrinti: y.ayrinti };
}

export const TEST_IM: Record<TestSonucu['tur'], Durum> = {
  baglandi: 'ok', kimlik_bekleniyor: 'pl', basarisiz: 'bd',
};

/** Durum sözcüğü YALNIZ burada — çekmece kimlik bloğunun karşılığı. */
export const TEST_SOZU: Record<TestSonucu['tur'], string> = {
  baglandi: 'Bağlandı',
  kimlik_bekleniyor: 'Kimlik bekleniyor — bekleyen kurulum adımı',
  basarisiz: 'Bağlanamadı',
};

/* ── Yapılandırma formu ─────────────────────────────────────────────── */

export type ConnectorFormu = {
  id: string | null;
  kod: string;
  ad: string;
  tip: string;
  kaynakSistem: string;
  kimlikTipi: string;
  /** sır REFERANSI (adres) — sır DEĞERİ değil ve asla ön doldurulmaz */
  sirReferansi: string;
  pollAralikDk: string;
  ortam: string;
  senkronKipi: string;
  ardisikHataSiniri: string;
  gerekce: string;
};

/**
 * Kayıtlı connector'dan form varsayılanı.
 *
 * `sirReferansi` DAİMA BOŞTUR ve bu bilinçlidir: kayıtlı referans ekrana
 * yalnız `sirMaskesi()` çıktısı olarak iner, forma geri yazılmaz. Sırrın
 * DEĞERİ zaten hiçbir katmandan geçmez; adresi de forma geri doldurmayınca
 * "kaydet" tuşuna basan kişi neyi kaydettiğini yeniden yazarak beyan eder.
 */
export function formVarsayilani(c: ConnectorSagligi | null): ConnectorFormu {
  if (!c) {
    return {
      id: null, kod: '', ad: '', tip: 'manual_import', kaynakSistem: '',
      kimlikTipi: 'none', sirReferansi: '', pollAralikDk: '',
      // Yeni kayıt DAİMA geliştirme ortamında başlar: üretim bilinçli bir
      // seçimdir, varsayılan olamaz.
      ortam: 'gelistirme', senkronKipi: 'delta', ardisikHataSiniri: '', gerekce: '',
    };
  }
  return {
    id: c.id, kod: c.kod, ad: c.ad, tip: c.tip, kaynakSistem: c.kaynakSistem,
    kimlikTipi: c.kimlikTipi, sirReferansi: '',
    pollAralikDk: c.pollAralikDk === null ? '' : String(c.pollAralikDk),
    ortam: c.ortam ?? 'gelistirme',
    senkronKipi: c.senkronKipi ?? 'delta',
    ardisikHataSiniri: c.ardisikHataSiniri === null ? '' : String(c.ardisikHataSiniri),
    gerekce: '',
  };
}

/** Sır referansı biçimi — `lib/entegrasyon/sir.ts` ile AYNI dilbilgisi.
    İstemcide de denetlenir ki kullanıcı sunucuya gidip dönmeden görsün;
    asıl kapı sunucudadır, bu yalnız erken uyarıdır. */
const REFERANS_BICIMI = /^([a-z][a-z0-9_-]*):([^\s#]+)(?:#([^\s#]+))?$/;

export function referansBicimiTamam(referans: string): boolean {
  return REFERANS_BICIMI.test(referans.trim());
}

/**
 * Formu göndermeden önceki denetim. Dönen liste BOŞSA form gönderilebilir.
 *
 * Buradaki tek olağandışı kural: kimlik tipi 'none' değilse sır referansı
 * HER KAYITTA yeniden yazılmalıdır — çünkü kayıtlı referans forma geri
 * doldurulmaz. Bunu "boş bırakılırsa korunur" diye çözmek, `connectorKaydet`
 * boş referansı null'a çevirdiği için sessizce kimlik bilgisini
 * düşürürdü.
 */
export function formSorunlari(f: ConnectorFormu): string[] {
  const sorunlar: string[] = [];
  if (!f.kod.trim()) sorunlar.push('Kod boş olamaz');
  if (!f.ad.trim()) sorunlar.push('Ad boş olamaz');
  if (!f.kaynakSistem.trim()) sorunlar.push('Kaynak sistem boş olamaz');
  if (f.kimlikTipi !== 'none') {
    if (!f.sirReferansi.trim()) {
      sorunlar.push('Kayıtlı sır referansı ekrana inmez — kaydetmek için yeniden yazın');
    } else if (!referansBicimiTamam(f.sirReferansi)) {
      sorunlar.push('Sır referansı biçimi: env:ANAHTAR · dosya:/yol#alan · vault:yol#alan');
    }
  } else if (f.sirReferansi.trim() && !referansBicimiTamam(f.sirReferansi)) {
    sorunlar.push('Sır referansı biçimi: env:ANAHTAR · dosya:/yol#alan · vault:yol#alan');
  }
  if (f.pollAralikDk.trim() && !(Number(f.pollAralikDk) > 0)) {
    sorunlar.push('Poll aralığı pozitif bir dakika değeri olmalı');
  }
  if (f.ardisikHataSiniri.trim() && !(Number(f.ardisikHataSiniri) > 0)) {
    sorunlar.push('Ardışık hata sınırı pozitif olmalı');
  }
  return sorunlar;
}

/** Ortam değişiyorsa gerekçe zorunlu — sunucu da aynısını uygular. */
export function ortamGerekcesiEksik(f: ConnectorFormu, once: string | null): boolean {
  return once !== null && f.ortam !== once && !f.gerekce.trim();
}

/* ── Santral kapsamı ────────────────────────────────────────────────────

   Kapsam formun geri kalanından AYRI bir alandır ve ayrı kaydedilir; sebebi
   `lib/eylemler2/entegrasyon.ts` başındaki kapsam notunda yazılı. Buradaki
   yardımcılar yalnız sözcük üretir: kararı sunucu verir, ekran onu tekrar
   hesaplamaz.

   TEK DOĞRULUK KAYNAĞI: kapsam `Connector.kapsamTesisleriJson` kolonundadır.
   Yapılandırma JSON'undaki `kapsamTesisKodlari` yalnız MİRAS okumadır ve
   ekranda da böyle adlandırılır — kullanıcı hangi kaynağın yürürlükte
   olduğunu tahmin etmek zorunda kalmasın. */

export type KapsamKaynagi = 'kolon' | 'yapilandirma_mirasi' | 'yok';

export const KAPSAM_KAYNAK_SOZU: Record<KapsamKaynagi, string> = {
  kolon: 'Kapsam alanı (kolon)',
  yapilandirma_mirasi: 'Yapılandırma mirası — kaydettiğinizde kapsam alanına taşınır',
  yok: 'Kapsam sınırı tanımlı değil',
};

export type KapsamGorunumu = {
  kodlar: string[];
  kaynak: KapsamKaynagi;
  mirasKodlari: string[];
  varsayilanTesisKodu: string | null;
  secenekler: { kod: string; ad: string }[];
};

/** Yürürlükteki kapsamın tek cümlesi. BOŞ liste "hiçbir santral" DEĞİL,
    "sınır yok" demektir — çekirdek de öyle okur ve bu ayrım ekranın
    yanlış okunmaması için sözcükle söylenir. */
export function kapsamCumlesi(kodlar: string[]): string {
  return kodlar.length === 0
    ? 'Sınır yok — bu bağlantı her santral adına kayıt yazabilir'
    : `${kodlar.length} santral · ${kodlar.join(', ')}`;
}

/** Kaydetmeden önce gösterilecek uyarılar. Boş liste dönerse kaydetmenin
    sürprizi yoktur; dolu liste kaydetmeyi ENGELLEMEZ, yalnız sonucu önden
    söyler (biri hariç: varsayılan tesis çelişkisini sunucu reddeder). */
export function kapsamUyarilari(secili: string[], g: KapsamGorunumu): string[] {
  const uyarilar: string[] = [];
  if (secili.length === 0) {
    uyarilar.push('Hiçbir santral seçili değil: bu, "hiçbirine yazamaz" değil '
      + '"SINIR YOK" demektir. Bağlantıyı durdurmak için etkinliği kapatın.');
  }
  if (g.varsayilanTesisKodu && secili.length > 0
    && !secili.includes(g.varsayilanTesisKodu)) {
    uyarilar.push(`Yapılandırmadaki varsayılan tesis kodu (${g.varsayilanTesisKodu}) `
      + 'seçili kapsamın dışında — sunucu bu kaydı reddeder.');
  }
  if (g.mirasKodlari.length > 0) {
    uyarilar.push('Yapılandırmada eski kapsam anahtarı var '
      + `(${g.mirasKodlari.join(', ')}); kaydettiğinizde kapsam alanına taşınır `
      + 've yapılandırmadan silinir.');
  }
  return uyarilar;
}

/** Seçim kayıtlı kapsamdan farklı mı? Sıra önemsizdir — kapsam bir
    KÜMEDİR; yalnız sırayı değiştiren bir "kaydet" iz satırı üretmemeli. */
export function kapsamDegisti(once: string[], sonra: string[]): boolean {
  if (once.length !== sonra.length) return true;
  const a = [...once].sort();
  const b = [...sonra].sort();
  return a.some((x, i) => x !== b[i]);
}

/* ═══ Veri kökeni — saf mantık ═══════════════════════════════════════════
   §12 + §18'in ekrana düşen kısmı. Tek bir DEĞİŞMEZ bu bölümün tamamına
   hâkimdir ve testle korunur:

     KAYNAK BAĞLAMI OLMAYAN KAYIT 'DOĞRULANMIŞ' GÖRÜNEMEZ.

   Kökeni olmayan kayıt gizlenmez de: kendi hücresinde "kökeni yok" diye
   AÇIKÇA sayılır ve satırı hiçbir koşulda kuyruğa toplanmaz. Bir kaydın
   nereden geldiğini bilmemek, bilmediğimizi görmemekten iyidir. */

/** Bir kökenin "bayat" sayılması için geçmesi gereken gün. Bayat köken
    yanlış veri demek DEĞİLDİR: kaynağın kaydı artık tazelemediği, yani
    güncelliğinin BİLİNMEDİĞİ anlamına gelir. */
export const BAYAT_KOKEN_GUN = 30;

/** Ekranda gösterilen doğrulama kuyruğunun üst sınırı. `kokenTopluDogrula`
    tek çağrıda 200 kayıt kabul eder; ekran daha fazlasını seçtirmemeli. */
export const BEKLEYEN_SINIRI = 200;

export type KokenSayimSatiri = {
  varlikTipi: string;
  /** kökeni OLMAYAN kayıt sayısı; null = kayıt evreni bilinmiyor (SIFIR DEĞİL) */
  manuel: number | null;
  /** kökeni var, insan doğrulaması bekliyor */
  otomatik: number;
  /** insan doğrulamış */
  dogrulanmis: number;
  /** insan bakmış ve reddetmiş */
  reddedildi: number;
  /** köken satırı olan ayrık kayıt */
  kokenli: number;
  /** kayıt evreni; null = bilinmiyor */
  toplam: number | null;
};

export type KaynakSatiri = {
  kaynakSistem: string;
  kayit: number;
  dogrulanmis: number;
  dogrulanmadi: number;
  reddedildi: number;
  guveniOlculen: number;
  guveniOlculmemis: number;
  /** null = hiç ölçüm yok — %0 DEĞİL */
  ortalamaGuven: number | null;
  sonAktarim: string;
  /** bu kaynağın bayat köken sayısı */
  bayat: number;
};

export type BekleyenSatiri = {
  kokenId: string;
  varlikTipi: string;
  varlikId: string;
  kaynakSistem: string;
  kaynakKayitId: string;
  /** null = ÖLÇÜLMEDİ */
  guven: number | null;
  aktarim: string;
  bekleyenGun: number;
};

export type BayatSatiri = {
  kokenId: string;
  varlikTipi: string;
  varlikId: string;
  kaynakSistem: string;
  dogrulamaDurumu: string;
  guven: number | null;
  sonAktarim: string;
  gecenGun: number;
};

export type KokenOzeti = {
  /** false = kullanıcı envanter/okuma taşımıyor; hiçbir alan doldurulmaz */
  yetkili: boolean;
  sayimlar: KokenSayimSatiri[];
  kaynaklar: KaynakSatiri[];
  bekleyenler: BekleyenSatiri[];
  bayatlar: BayatSatiri[];
  /** bayatlık eşiği (gün) */
  esikGun: number;
  /** kapsamın yuttuğu kayıtlar — filtrenin sessizce sildiği şey olmasın */
  kapsanamayanTipler: string[];
  tesisiBilinmeyen: number;
  /** kullanıcı köken doğrulayabilir mi (envanter/onay) */
  dogrulayabilir: boolean;
};

/** Bir varlık tipinde kökeni olmayan kayıt var mı? `null` = evren bilinmiyor,
    yani "yok" DEĞİL — bu da bir bilinmeyendir ve gizlenmez. */
export function kokensizVar(s: KokenSayimSatiri): boolean {
  return s.manuel === null || s.manuel > 0;
}

/** "Kökeni yok" hücresi. Bilinmeyen evren SIFIR yazılmaz. */
export function kokensizYazisi(s: KokenSayimSatiri): string {
  return s.manuel === null ? 'bilinmiyor' : String(s.manuel);
}

/**
 * Satır işaretçisi.
 *   bd  → insan reddetmiş bir köken var (veri doğru kabul edilmiyor)
 *   md  → insan doğrulaması bekleyen otomatik kayıt var
 *   unk → kökeni olmayan kayıt ya da kayıt evreni bilinmiyor
 *   ok  → her kaydın kaynağı belli ve doğrulanmış
 *
 * `ok` en dar koşuldur: kökeni olmayan tek bir kayıt bile satırı `unk`
 * yapar. Aksi hâlde "hepsi doğrulanmış" görünen bir tipin içinde kaynağı
 * bilinmeyen yüz kayıt saklanabilirdi.
 */
export function kokenImi(s: KokenSayimSatiri): Durum {
  if (s.reddedildi > 0) return 'bd';
  if (s.otomatik > 0) return 'md';
  if (kokensizVar(s)) return 'unk';
  return 'ok';
}

export function kokenSozu(s: KokenSayimSatiri): string {
  if (s.reddedildi > 0) return 'Reddedilmiş köken var';
  if (s.otomatik > 0) return 'Doğrulama bekliyor';
  if (s.manuel === null) return 'Kayıt evreni bilinmiyor';
  if (s.manuel > 0) return 'Kaynak bağlamı olmayan kayıt var';
  return 'Her kaydın kaynağı doğrulanmış';
}

export function kokenCumlesi(s: KokenSayimSatiri): string {
  const parcalar: string[] = [];
  if (s.manuel === null) {
    parcalar.push('Bu tipin kayıt evreni bilinmiyor — kökeni olmayan kayıt sayısı çıkarılamaz.');
  } else if (s.manuel > 0) {
    parcalar.push(`${s.manuel} kaydın köken kaydı yok; elle girilmiş sayılır ve `
      + 'hiçbir koşulda "doğrulanmış" görünmez.');
  }
  if (s.otomatik > 0) parcalar.push(`${s.otomatik} otomatik kayıt insan doğrulaması bekliyor.`);
  if (s.reddedildi > 0) parcalar.push(`${s.reddedildi} kayıt incelenip reddedilmiş.`);
  if (parcalar.length === 0) {
    parcalar.push('Bu tipteki her kaydın kaynağı belli ve bir insan tarafından doğrulanmış.');
  }
  return parcalar.join(' ');
}

/** Kuyruğa YALNIZ tamamen doğrulanmış satır iner. Kökeni olmayan kayıt
    taşıyan satır sayıdan bağımsız görünür kalır — "gizlenmez" sözü budur. */
export function kokenToplanabilir(s: KokenSayimSatiri): boolean {
  return kokenImi(s) === 'ok';
}

const KOKEN_AGIRLIGI: Record<Durum, number> = {
  bd: 0, md: 1, unk: 2, pl: 3, ok: 4, tamam: 5,
};

export function kokenSirala(satirlar: KokenSayimSatiri[]): KokenSayimSatiri[] {
  return [...satirlar].sort((a, b) =>
    KOKEN_AGIRLIGI[kokenImi(a)] - KOKEN_AGIRLIGI[kokenImi(b)]
    || a.varlikTipi.localeCompare(b.varlikTipi, 'tr'));
}

/** Kaynak sistem satırının işaretçisi. Bayat köken bir HATA değildir:
    kaynağın kaydı artık doğrulamadığı, güncelliğin BİLİNMEDİĞİ anlamına
    gelir — bu yüzden `unk`, `bd` değil. */
export function kaynakImi(k: KaynakSatiri): Durum {
  if (k.reddedildi > 0) return 'bd';
  if (k.dogrulanmadi > 0) return 'md';
  if (k.bayat > 0) return 'unk';
  return 'ok';
}

export function kaynakToplanabilir(k: KaynakSatiri): boolean {
  return kaynakImi(k) === 'ok';
}

/** Ortalama güven metni. `null` ölçülmedi demektir; "%0" YAZILMAZ.
    Tek kaydın güveni için eski köken bileşenindeki `guvenYazisi`
    kullanılır; bu ad çakışmasın diye ayrıdır. */
export function ortalamaGuvenYazisi(guven: number | null): string {
  if (guven === null) return 'ölçülmedi';
  return `%${Math.round(guven * 100)}`;
}

/**
 * Doğrulama düğmesinin açılma koşulu. Gerekçe ZORUNLU: dayanağı
 * yazılmayan bir doğrulama denetim izinde hiçbir şey ifade etmez, sunucu
 * da onu reddeder.
 */
export function dogrulamaPasif(
  secim: string[], gerekce: string, yetkili: boolean, bekliyor: boolean,
): boolean {
  return !yetkili || bekliyor || secim.length === 0 || gerekce.trim().length === 0;
}

/** Maskeli referanstan sağlayıcı adı (`env: AD_PAROLA` → `env`).
    `sirMaskesi()` çıktısı ekrana zaten iniyor; sağlayıcı adı onun ilk
    parçasıdır ve sır DEĞİLDİR. Böylece connector'ın çekmecesinde tam da
    sırrın yaşadığı yerde "bu sağlayıcı bağlı mı" sorusu cevaplanabilir. */
export function maskeSaglayicisi(sirMaskeli: string): string | null {
  const m = /^([a-z][a-z0-9_-]*):\s/.exec(sirMaskeli);
  return m ? m[1] : null;
}

/* ═══ Kuru koşu (§6) ═════════════════════════════════════════════════════
   Kuru koşu HİÇBİR ŞEY YAZMAZ: çeker, normalleştirir, doğrular, eşleşmeyi
   dener ve "olsaydı ne olurdu" tablosunu üretir.

   DEĞİŞMEZ: kuru koşu GERÇEK KOŞU DEĞİLDİR. Yalnız kuru koşmuş bir
   connector hâlâ `hic_kosmadi`dır ve tazeliği `bilinmiyor`dur. Ekran bu
   ayrımı bozarsa, hiç veri çekmemiş bir entegrasyon çalışıyor görünür —
   bu ekranın engellemek için var olduğu tam olarak budur. */

/** Kuru koşu satırının işaretçisi. `ok` VERİLMEZ: başarıyla biten bir kuru
    koşu bile "entegrasyon çalışıyor" kanıtı değildir; olsa olsa planlıdır. */
export function kuruImi(k: { durum: string }): Durum {
  if (k.durum === 'basarisiz') return 'bd';
  if (k.durum === 'kimlik_bekleniyor') return 'pl';
  return 'pl';
}

/** Kuru koşu sayaçlarının tek satırlık okuması. */
export function kuruSayacYazisi(s: {
  alinan: number; gecerli: number; gecersiz: number;
  olusacak: number; guncellenecek: number; reddedilecek: number;
}): string {
  return `${s.alinan} alınacaktı · ${s.gecerli} geçerli · ${s.gecersiz} geçersiz · `
    + `${s.olusacak} yeni kayıt · ${s.guncellenecek} tazeleme · ${s.reddedilecek} red`;
}

/** Eşleşme dağılımı. `bilinmeyen` SIFIR DEĞİLDİR: eşleşme kararı
    verilememiş kayıt "yeni" sayılamaz — sayılsaydı kuru koşu, gerçek
    koşunun açacağından fazla yeni varlık vaat ederdi. */
export function kuruEslesmeYazisi(s: {
  eslesen: number; yeni: number; yinelenen: number; bilinmeyen: number;
}): string {
  return `${s.eslesen} mevcut varlığa eşleşecek · ${s.yeni} yeni aday · `
    + `${s.yinelenen} yinelenen · ${s.bilinmeyen} eşleşme kararı verilemedi`;
}

/* ═══ Eşleme profili (§7) ════════════════════════════════════════════════ */

export type EslemeProfilSatiri = {
  id: string; kod: string; ad: string; connectorTipi: string;
  surum: number; durum: string;
};

/**
 * Connector'ın koşuda kullanacağı profil.
 *
 * Bağlı profil varsa odur; yoksa TİPİN etkin profilidir; o da yoksa
 * adaptörün gömülü eşlemesi (null). Ekranın "profil yok" ile "tipin etkin
 * profili" arasındaki farkı yazması gerekir — ikisi aynı görünürse
 * kullanıcı hangi kuralın koştuğunu bilemez.
 */
export function etkinEslemeProfili(
  c: { tip: string; eslemeProfilId: string | null },
  profiller: EslemeProfilSatiri[],
): { profil: EslemeProfilSatiri | null; kaynak: 'bagli' | 'tip' | 'gomulu' } {
  if (c.eslemeProfilId) {
    const p = profiller.find((x) => x.id === c.eslemeProfilId);
    if (p) return { profil: p, kaynak: 'bagli' };
    /* Bağlı profil listede yoksa kaydı "gömülü eşleme" diye göstermek
       yalan olurdu: bağ duruyor, profil okunamıyor. */
    return { profil: null, kaynak: 'bagli' };
  }
  const tipin = profiller.find((x) => x.connectorTipi === c.tip && x.durum === 'etkin');
  return tipin ? { profil: tipin, kaynak: 'tip' } : { profil: null, kaynak: 'gomulu' };
}

export function profilYazisi(
  secim: { profil: EslemeProfilSatiri | null; kaynak: 'bagli' | 'tip' | 'gomulu' },
): string {
  if (secim.profil) {
    const ek = secim.kaynak === 'tip' ? ' · tipin etkin profili' : '';
    return `${secim.profil.kod} v${secim.profil.surum} (${secim.profil.durum})${ek}`;
  }
  if (secim.kaynak === 'bagli') return 'bağlı profil okunamadı';
  return 'adaptörün gömülü eşlemesi';
}

/* ═══ Hata modeli ve devre kesici ════════════════════════════════════════ */

/** Koşunun hata sınıfı sözlüğü. Başarılı ve `kimlik_bekleniyor` koşuda sınıf
    YOKTUR; "yok" ile "bilinmeyen" ayrı yazılır. */
export const HATA_SINIFI_SOZU: Record<string, string> = {
  gecici: 'Geçici (yeniden denenebilir)',
  yetki: 'Yetki',
  yapilandirma: 'Yapılandırma',
  sir: 'Sır / kimlik bilgisi',
  sozlesme: 'Sözleşme (kaynak biçimi değişti)',
  yazma: 'Yazma',
  bilinmeyen: 'Sınıflandırılamadı',
};

/**
 * Hata sınıfı hücresi.
 *   null + hatasız koşu  → 'sınıf yok' (beklenen)
 *   null + hatalı koşu   → 'sınıf yazılmamış' (bir KAYIT BOŞLUĞU)
 * İkisini aynı yazmak, sınıflandırılmayan hataları görünmez yapardı.
 */
export function hataSinifiYazisi(
  k: { hataSinifi: string | null; durum: string },
): { metin: string; eksik: boolean } {
  if (k.hataSinifi) {
    return { metin: HATA_SINIFI_SOZU[k.hataSinifi] ?? k.hataSinifi, eksik: false };
  }
  if (k.durum === 'basarisiz') {
    return { metin: 'sınıf yazılmamış — kayıt boşluğu', eksik: true };
  }
  return { metin: 'sınıf yok', eksik: false };
}

/**
 * Devre kesici ilerlemesi: "3/5 ardışık hata".
 *
 * "hatali" damgasından daha kullanışlıdır çünkü devrenin NE ZAMAN keseceğini
 * söyler. Sayaç bilinmiyorsa `null` döner ve ekran sıfır uydurmaz.
 */
export function devreKesiciIlerlemesi(c: {
  ardisikHata: number | null; ardisikHataSiniri: number | null;
}): { metin: string; oran: number | null; durum: Durum } {
  if (c.ardisikHata === null) {
    return { metin: 'ardışık hata sayacı bilinmiyor', oran: null, durum: 'unk' };
  }
  if (c.ardisikHataSiniri === null || c.ardisikHataSiniri <= 0) {
    return {
      metin: `${c.ardisikHata} ardışık hata · otomatik duraklatma yok`,
      oran: null,
      durum: c.ardisikHata > 0 ? 'md' : 'ok',
    };
  }
  const oran = Math.min(100, (c.ardisikHata / c.ardisikHataSiniri) * 100);
  const esikte = c.ardisikHata >= c.ardisikHataSiniri;
  return {
    metin: `${c.ardisikHata}/${c.ardisikHataSiniri} ardışık hata`
      + (esikte ? ' · sınır aşıldı, connector duraklatıldı' : ''),
    oran,
    durum: esikte ? 'bd' : c.ardisikHata > 0 ? 'md' : 'ok',
  };
}

/** Adaptörün beyan ettiği sırların özeti.
    `bilinmiyor` YOK DEĞİLDİR: sağlayıcı bağlı olmadığı için sırrın var olup
    olmadığını bilmiyoruz; ikisini aynı kovaya koymak kurulumu eksik olmayan
    bir connector'ı eksik göstermek olurdu. */
export function sirBeyanImi(
  sirlar: { durum: 'var' | 'yok' | 'bilinmiyor' }[] | null,
): Durum {
  if (sirlar === null) return 'unk';
  if (sirlar.length === 0) return 'ok';
  if (sirlar.some((x) => x.durum === 'yok')) return 'pl';
  if (sirlar.some((x) => x.durum === 'bilinmiyor')) return 'unk';
  return 'ok';
}

export function sirBeyanYazisi(
  sirlar: { durum: 'var' | 'yok' | 'bilinmiyor' }[] | null,
): string {
  if (sirlar === null) return 'adaptör beyanı okunamadı — ölçülmedi';
  if (sirlar.length === 0) return 'bu adaptör sır istemiyor';
  const yok = sirlar.filter((x) => x.durum === 'yok').length;
  const bilinmiyor = sirlar.filter((x) => x.durum === 'bilinmiyor').length;
  const parcalar = [`${sirlar.length} sır isteniyor`];
  if (yok > 0) parcalar.push(`${yok} tanesi yok`);
  if (bilinmiyor > 0) parcalar.push(`${bilinmiyor} tanesinin varlığı bilinmiyor`);
  return parcalar.join(' · ');
}

import type { Durum } from '@/components/atlas/temel';
// YALNIZ TİP: `saglikOzeti` server-only bir modüldür, `import type` derlemede
// silinir ve istemci paketine hiçbir sunucu kodu sızmaz.
import type { ConnectorSagligi, SaglikDurumu, Tazelik } from '@/lib/entegrasyon/saglikOzeti';

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
  { ad: 'uygulanabilirlik', etiket: 'Uygulanabilirlik', elleCalisir: false,
    aciklama: 'Tesis profili değiştiğinde madde kapsamını yeniden hesaplar (zincirden koşar)' },
  { ad: 'entegrasyon_zinciri', etiket: 'Entegrasyon zinciri', elleCalisir: false,
    aciklama: 'Yeni veri aktarıldığında motorları doğru sırada koşturur (zincirden koşar)' },
  { ad: 'zincir_guvenlik_ihlali', etiket: 'Zincir güvenlik ihlali', elleCalisir: false,
    aciklama: 'Zincir otomasyon sınırını aştıysa başarısız koşu bırakır — boş olması iyi haberdir' },
];

/** Her motorun çekmecede gösterilen koşu geçmişi derinliği.
    Ozalit'te "son 20 koşu" TEK bir listede duruyordu ve çok koşan bir motor
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

/** Sağlık durumu → Atlas işaretçisi.
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
   Üç kayıt ailesi tek canvasta yaşar: motorlar (içeride koşan), connector'lar
   (dışarıya bağlanan), veri kalitesi bulguları (ikisinin bulduğu boşluk).
   Ayrı ekranlara bölmek "platform sağlığı" sorusunu üçe bölerdi; hepsini
   aynı tabloda üst üste yığmak yoğunluk sözleşmesini kırardı. */

export type Kip = 'motor' | 'entegrasyon' | 'kalite';

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

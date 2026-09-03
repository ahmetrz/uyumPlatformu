import { z } from 'zod';
import { KANIT_ESIK_VARSAYILAN } from '../sabitler';
import { SAHA_YERLESIM_VARSAYILAN, yerlesimDogrula, yerlesimMetni, type SahaYerlesimi } from '../yonetim/sahaModulleri';
import {
  OLCULMEMIS_VARSAYILAN, olculmemisDogrula, olculmemisMetni, type OlculmemisGosterimi,
} from '../yonetim/olculmemisGosterimi';

/* ═══ Yapılandırma anahtar sözlüğü — TEK doğruluk kaynağı ═══════════════

   Konsoldan değiştirilebilen her parametre BURADA tanımlıdır: grubu,
   sınıfı (A doğrudan · B onaylı), kod varsayılanı, doğrulama şeması ve
   "bu değişiklik nereyi etkiler" cümleleri. Veritabanı (`Yapilandirma`)
   yalnız GEÇERLİ DEĞERİ saklar; sözlükte olmayan anahtar okunmaz, yazılmaz.

   Sınıf sözleşmesi (yönetim konsolu denetimi, 2026-09):
     A · ADMIN-MANAGED    — yetkili doğrudan kaydeder, iz düşer.
     B · APPROVAL-MANAGED — Kaydet → İncele → Onayla → Uygula; dört göz.
   C (CODE-MANAGED) alanlar bu sözlüğe GİRMEZ: RBAC matrisi, durum
   makineleri, motor uygulamaları, connector sözleşmesi, tasarım
   belirteçleri kodda kalır ve konsolda salt okunur listelenir.

   Bu dosya istemciye de gider: `db` içe aktarmaz, yalnız şema ve metin. */

export type AyarGrubu =
  | 'organizasyon' | 'uyum' | 'risk' | 'varlik' | 'akis'
  | 'erisim' | 'entegrasyon' | 'gorunum' | 'sistem';

export type AyarSinifi = 'A' | 'B';

export type AyarTanimi = {
  anahtar: string;
  grup: AyarGrubu;
  sinif: AyarSinifi;
  etiket: string;
  aciklama: string;
  /** motor / ekran adı — değişiklik nereyi yeniden hesaplatır */
  etki: string[];
  varsayilan: unknown;
  sema: z.ZodTypeAny;
  birim?: string;
};

const tamSayi = (min: number, max: number) => z.number().int().min(min).max(max);

const T: AyarTanimi[] = [
  /* ── Uyum & regülasyon ─────────────────────────────────────────────── */
  {
    anahtar: 'kanit.tazelik.taze_gun', grup: 'uyum', sinif: 'B',
    etiket: 'Kanıt taze eşiği', birim: 'gün',
    aciklama: 'Yaşı bu günden küçük kanıt "taze" sayılır; bu değerden "süresi doldu" eşiğine kadar "yenilenmeli".',
    etki: ['Kanıt kütüphanesi', 'Bulgu detayı · bağlı kanıtlar', 'Raporlar · kanıt tazeliği'],
    varsayilan: KANIT_ESIK_VARSAYILAN.taze, sema: tamSayi(7, 365),
  },
  {
    anahtar: 'kanit.tazelik.dolmus_gun', grup: 'uyum', sinif: 'B',
    etiket: 'Kanıt süresi doldu eşiği', birim: 'gün',
    aciklama: 'Yaşı bu günü aşan kanıt "süresi doldu" sayılır. Taze eşiğinden büyük olmalı.',
    etki: ['Kanıt kütüphanesi', 'Bulgu detayı · bağlı kanıtlar', 'Raporlar · kanıt tazeliği'],
    varsayilan: KANIT_ESIK_VARSAYILAN.dolmus, sema: tamSayi(14, 730),
  },
  /* ── Risk & denetim ────────────────────────────────────────────────── */
  {
    anahtar: 'motor.son_tarih.bulgu_gun', grup: 'risk', sinif: 'B',
    etiket: 'Bulgu son tarih ufku', birim: 'gün',
    aciklama: 'Hedef tarihi bu kadar gün içinde olan açık bulgular için görev üretilir.',
    etki: ['deadline_motoru', 'Yönetim tezgâhı · iş kuyruğu', 'Saha · odak kartı'],
    varsayilan: 14, sema: tamSayi(1, 180),
  },
  {
    anahtar: 'motor.son_tarih.denetim_gun', grup: 'risk', sinif: 'B',
    etiket: 'Denetim / sertifika son tarih ufku', birim: 'gün',
    aciklama: 'Planlı denetim ve sertifika bitişleri bu ufukta iş kuyruğuna düşer.',
    etki: ['deadline_motoru', 'Yönetim tezgâhı · iş kuyruğu'],
    varsayilan: 30, sema: tamSayi(1, 365),
  },
  {
    anahtar: 'risk.esik.kritik', grup: 'risk', sinif: 'B',
    etiket: 'Kritik risk skoru eşiği', birim: 'skor (olasılık × etki)',
    aciklama: 'Skoru bu değere eşit ya da büyük riskler "kritik" sayılır.',
    etki: ['Saha · risk matrisi', 'Risk kütüğü metrikleri'],
    varsayilan: 15, sema: tamSayi(2, 25),
  },
  {
    anahtar: 'risk.esik.yuksek', grup: 'risk', sinif: 'B',
    etiket: 'Yüksek risk skoru eşiği', birim: 'skor (olasılık × etki)',
    aciklama: 'Kritik eşiğin altında, bu değere eşit ya da büyük riskler "yüksek" sayılır.',
    etki: ['Saha · risk matrisi', 'Risk kütüğü metrikleri'],
    varsayilan: 8, sema: tamSayi(1, 24),
  },
  /* ── Varlık & OT ───────────────────────────────────────────────────── */
  {
    anahtar: 'motor.erisim.kosu_basina_oturum', grup: 'varlik', sinif: 'B',
    etiket: 'Erişim değerlendirme · koşu başına oturum', birim: 'kayıt',
    aciklama: 'Tek motor koşusunda değerlendirilen en fazla tedarikçi erişim oturumu.',
    etki: ['erisim_degerlendirme'],
    varsayilan: 1000, sema: tamSayi(50, 10_000),
  },
  {
    anahtar: 'motor.erisim.suren_bayat_saat', grup: 'varlik', sinif: 'B',
    etiket: 'Süren oturum bayatlık eşiği', birim: 'saat',
    aciklama: 'Bu süreden uzun "süren" görünen erişim oturumu bayat kabul edilir.',
    etki: ['erisim_degerlendirme', 'Kimlik ekranı'],
    varsayilan: 24, sema: tamSayi(1, 168),
  },
  {
    anahtar: 'motor.erisim.anormal_uzun_saat', grup: 'varlik', sinif: 'B',
    etiket: 'Anormal uzun oturum eşiği', birim: 'saat',
    aciklama: 'Bu süreyi aşan erişim oturumu "anormal uzun" kuralını tetikler.',
    etki: ['erisim_degerlendirme'],
    varsayilan: 12, sema: tamSayi(1, 72),
  },
  /* ── Entegrasyon & veri ────────────────────────────────────────────── */
  {
    anahtar: 'motor.veri_kalitesi.bayat_gun', grup: 'entegrasyon', sinif: 'B',
    etiket: 'Kaynak bayatlık eşiği (aralığı bilinmeyen)', birim: 'gün',
    aciklama: 'Poll aralığı bilinmeyen otomatik kaynak bu kadar gün veri getirmezse bayat sayılır.',
    etki: ['veri_kalitesi', 'Sağlık ekranı'],
    varsayilan: 30, sema: tamSayi(1, 365),
  },
  {
    anahtar: 'motor.veri_kalitesi.bayat_periyot_kati', grup: 'entegrasyon', sinif: 'B',
    etiket: 'Kaçırılan periyot katı', birim: 'periyot',
    aciklama: 'Poll aralığı bilinen kaynakta art arda bu kadar periyot kaçırılınca kesinti sayılır.',
    etki: ['veri_kalitesi', 'Sağlık ekranı'],
    varsayilan: 3, sema: tamSayi(1, 20),
  },
  {
    anahtar: 'motor.veri_kalitesi.inceleme_yigilma_gun', grup: 'entegrasyon', sinif: 'B',
    etiket: 'İnceleme kuyruğu yığılma eşiği', birim: 'gün',
    aciklama: 'İnsan inceleme kuyruğunda bu kadar gün bekleyen kayıt yığılma ihlali üretir.',
    etki: ['veri_kalitesi', 'Keşif ekranı'],
    varsayilan: 14, sema: tamSayi(1, 180),
  },
  /* ── Görünüm & içerik ──────────────────────────────────────────────── */
  {
    anahtar: 'saha.kuyruk_penceresi', grup: 'gorunum', sinif: 'A',
    etiket: 'Saha · odak kuyruğu penceresi', birim: 'kayıt',
    aciklama: 'Saha ekranında odak kartı + kuyruk için çekilen en fazla bulgu.',
    etki: ['Saha ekranı'],
    varsayilan: 12, sema: tamSayi(3, 50),
  },
  {
    anahtar: 'saha.takvim_gun', grup: 'gorunum', sinif: 'A',
    etiket: 'Saha · düzenleyici takvim ufku', birim: 'gün',
    aciklama: 'Saha takviminde kaç gün ileriye bakılır.',
    etki: ['Saha ekranı'],
    varsayilan: 90, sema: tamSayi(7, 365),
  },
  {
    anahtar: 'saha.akis_hafta', grup: 'gorunum', sinif: 'A',
    etiket: 'Saha · uygunsuzluk akışı penceresi', birim: 'hafta',
    aciklama: 'Açılan/kapanan bulgu akışının haftalık penceresi.',
    etki: ['Saha ekranı'],
    varsayilan: 12, sema: tamSayi(4, 52),
  },
  {
    anahtar: 'saha.yerlesim', grup: 'gorunum', sinif: 'A',
    etiket: 'Saha · modül görünürlüğü ve KPI sırası',
    aciklama: 'İzinli sunum bloklarının açık/kapalı durumu ve KPI kalemlerinin sırası. Zorunlu modüller gizlenemez; tek ekran sözleşmesini bozan yerleşim kaydedilmez.',
    etki: ['Saha ekranı'],
    varsayilan: SAHA_YERLESIM_VARSAYILAN,
    /* Şema kütükle doğrular: bilinmeyen kimlik, zorunlu modülün gizlenmesi,
       izinsiz konum ve sözleşme bütçesi aşımı aynı yerde reddedilir. */
    sema: z.unknown().superRefine((v, ctx) => {
      const d = yerlesimDogrula(v);
      if (!d.ok) ctx.addIssue({ code: 'custom', message: d.hata });
    }).transform((v) => { const d = yerlesimDogrula(v); return d.ok ? d.deger : (v as SahaYerlesimi); }),
  },
  {
    anahtar: 'saha.olculmemis', grup: 'gorunum', sinif: 'A',
    etiket: 'Saha · değerlendirilmemiş özeti',
    aciklama: 'Değerlendirilmemiş santral özetinin ayrıntı düzeyi: yalnız sayı mı, sayı + ilk adlar mı; detay listesi panelde açılabilsin mi. Sayının KENDİSİ kapatılamaz — "bilinmeyen ≠ sıfır" kuralı ayara bağlanmaz.',
    etki: ['Saha ekranı'],
    varsayilan: OLCULMEMIS_VARSAYILAN,
    sema: z.unknown().superRefine((v, ctx) => {
      const d = olculmemisDogrula(v);
      if (!d.ok) ctx.addIssue({ code: 'custom', message: d.hata });
    }).transform((v) => {
      const d = olculmemisDogrula(v);
      return d.ok ? d.deger : (v as OlculmemisGosterimi);
    }),
  },
  {
    anahtar: 'kabuk.kunye', grup: 'gorunum', sinif: 'A',
    etiket: 'Ayak künye metni',
    aciklama: 'Her ekranın ayağında görünen kurum/platform adı. Sürüm ve ortam koddan gelir.',
    etki: ['Kabuk · ayak'],
    varsayilan: 'Zorlu Enerji Yönetişim Platformu',
    sema: z.string().trim().min(3).max(80),
  },
  /* ── Sistem ────────────────────────────────────────────────────────── */
  {
    anahtar: 'zamanlayici.motor_aralik_dk', grup: 'sistem', sinif: 'B',
    etiket: 'Motor koşu aralığı', birim: 'dakika',
    aciklama: 'Her motorun son başarılı koşusundan sonra yeniden vadesinin gelmesi için geçmesi gereken süre.',
    etki: ['zamanlayıcı', 'tüm motorlar'],
    varsayilan: 60, sema: tamSayi(5, 1440),
  },
];

/* Motor bayrakları: güvenli feature flag — motoru kapatmak veri silmez,
   yalnız zamanlayıcı onu vadesi gelmiş saymaz. Elle "çalıştır" düğmesi
   bayrağı dinlemez (kasıtlı: insan tetikler, bayrak otomasyonu keser). */
export const MOTOR_ADLARI_SOZLUK = [
  'kanit_tazelik', 'deadline_motoru', 'gap_to_action', 'veri_kalitesi', 'uyum_anlik',
  'yedek_dogrulama', 'olay_etki', 'topoloji_sapma', 'erisim_degerlendirme',
  /* Varlık güvenlik duruşu üçlüsü (OT-11 · OT-22 · OT-25). Bu liste
     `lib/motorlar/kayit.ts` defteriyle AYNI olmak zorundadır: eksik bir
     ad zamanlayıcıyı "Bilinmeyen yapılandırma anahtarı" ile durdurur ve
     o motor hiç koşmaz. `tests/zamanlayici.test.ts` bunu ölçüyor. */
  'firmware_uyumu', 'zafiyet_korelasyonu', 'ag_tutarliligi',
  /* Varlık yönetişimi ikilisi (OT-28 · OT-16) — aynı kural. */
  'konfig_drift', 'envanter_gorunurlugu',
] as const;

for (const ad of MOTOR_ADLARI_SOZLUK) {
  T.push({
    anahtar: `motor.${ad}.etkin`, grup: 'sistem', sinif: 'B',
    etiket: `Motor · ${ad} · zamanlanmış koşu`,
    aciklama: 'Kapalıyken zamanlayıcı bu motoru koşturmaz; elle çalıştırma etkilenmez.',
    etki: ['zamanlayıcı', ad],
    varsayilan: true, sema: z.boolean(),
  });
}

export const AYARLAR: readonly AyarTanimi[] = T;
export const AYAR_SOZLUGU: Record<string, AyarTanimi> =
  Object.fromEntries(T.map((a) => [a.anahtar, a]));

export function ayarTanimi(anahtar: string): AyarTanimi | null {
  return AYAR_SOZLUGU[anahtar] ?? null;
}

/** Değeri şemaya göre doğrular; hata mesajı Türkçe tek cümledir. */
export function ayarDogrula(anahtar: string, deger: unknown):
  { ok: true; deger: unknown } | { ok: false; hata: string } {
  const t = ayarTanimi(anahtar);
  if (!t) return { ok: false, hata: `Bilinmeyen yapılandırma anahtarı: ${anahtar}` };
  const s = t.sema.safeParse(deger);
  if (!s.success) {
    return { ok: false, hata: `${t.etiket}: ${s.error.issues.map((i) => i.message).join(' · ')}` };
  }
  return { ok: true, deger: s.data };
}

/* Birbirine bağlı eşik çiftleri: [büyük olmalı, küçük olmalı, hata cümlesi].
   Öneri açılırken yeni değer diğerinin bugünkü değeriyle birlikte sınanır. */
export const AYAR_CIFTLERI: readonly { buyuk: string; kucuk: string; hata: string }[] = [
  { buyuk: 'risk.esik.kritik', kucuk: 'risk.esik.yuksek', hata: 'Yüksek risk eşiği kritik eşiğinden küçük olmalı.' },
  { buyuk: 'kanit.tazelik.dolmus_gun', kucuk: 'kanit.tazelik.taze_gun', hata: 'Kanıt taze eşiği, süresi doldu eşiğinden küçük olmalı.' },
];

/** Anahtarın bağlı olduğu çiftin öteki anahtarları (yoksa boş). */
export function ayarEsleri(anahtar: string): string[] {
  const es: string[] = [];
  for (const c of AYAR_CIFTLERI) {
    if (c.buyuk === anahtar) es.push(c.kucuk);
    if (c.kucuk === anahtar) es.push(c.buyuk);
  }
  return es;
}

/** Birbirine bağlı eşikler: kritik > yüksek · dolmuş > taze. */
export function ayarCiftDogrula(degerler: Record<string, unknown>): string | null {
  for (const c of AYAR_CIFTLERI) {
    const b = degerler[c.buyuk], k = degerler[c.kucuk];
    if (typeof b === 'number' && typeof k === 'number' && k >= b) return c.hata;
  }
  return null;
}

export const GRUP_ETIKETI: Record<AyarGrubu, string> = {
  organizasyon: 'Organizasyon & saha',
  uyum: 'Uyum & regülasyon',
  risk: 'Risk & denetim',
  varlik: 'Varlık & OT',
  akis: 'İş akışları',
  erisim: 'Kullanıcı & erişim',
  entegrasyon: 'Entegrasyon & veri',
  gorunum: 'Görünüm & içerik',
  sistem: 'Sistem',
};

export const GRUP_SIRASI: AyarGrubu[] = [
  'organizasyon', 'uyum', 'risk', 'varlik', 'akis', 'erisim', 'entegrasyon', 'gorunum', 'sistem',
];

export function degerMetni(t: AyarTanimi, deger: unknown): string {
  if (typeof deger === 'boolean') return deger ? 'açık' : 'kapalı';
  if (deger === null || deger === undefined) return 'bilinmiyor';
  if (t.anahtar === 'saha.yerlesim' && typeof deger === 'object') return yerlesimMetni(deger as SahaYerlesimi);
  if (t.anahtar === 'saha.olculmemis' && typeof deger === 'object') return olculmemisMetni(deger as OlculmemisGosterimi);
  if (typeof deger === 'object') return JSON.stringify(deger);
  return `${String(deger)}${t.birim ? ` ${t.birim}` : ''}`;
}

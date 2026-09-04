/* ═══════════════════════════════════════════════════════════════════════
   UY-52 · API anahtarı kapsamı — SAF KARAR

   ── ÖLÇÜLMÜŞ KUSUR ────────────────────────────────────────────────────
   `ApiAnahtari` sahibinin BÜTÜN yetkilerini miras alıyordu ve kendi
   kapsamı yoktu (`lib/api/kimlik.ts`: "API için paralel bir yetki
   sistemi YOKTUR"). Bu, rol katmanı için doğru bir karardı ama bir
   şeyi atlıyordu: bir CMDB entegrasyonuna verilen anahtar, sahibi
   yönetici olduğu için kanıt paketi de okuyabiliyor, varlık da
   yazabiliyordu. Salt okunur olması gereken bir bağlantı, kurumun her
   şeyine erişen bir anahtar taşıyordu ve kimse fark etmiyordu.

   ── KAPSAM ROLÜ DARALTIR, GENİŞLETMEZ ─────────────────────────────────
   Kapsam bir YETKİ KAYNAĞI DEĞİLDİR: anahtarın erişebileceği uçları
   kısar. Sahibinin yetkisi olmayan bir uca kapsam açmak hiçbir şey
   vermez — rol kapısı yine reddeder. İki kapı arka arkaya durur ve
   sırası önemlidir: önce kapsam (bu anahtar bu uca bakabilir mi), sonra
   rol (bu kullanıcı bu veriyi görebilir mi).

   Bu dosya veritabanı ve React bilmez. */

/** Uç kimlikleri — `lib/api/uclar/` ile BİREBİR. */
export const UC_KIMLIKLERI = [
  'plants', 'assets', 'assets.upsert', 'assets.observations',
  'evidence', 'vulnerabilities', 'backup-results', 'integration-runs',
  'access-observations',
] as const;
export type UcKimligi = (typeof UC_KIMLIKLERI)[number];

export const UC_ETIKETI: Record<UcKimligi, string> = {
  plants: 'Santraller (okuma)',
  assets: 'Varlıklar (okuma)',
  'assets.upsert': 'Varlık yazma (upsert)',
  'assets.observations': 'Varlık gözlemi bildirimi (yazma)',
  evidence: 'Kanıtlar (okuma)',
  vulnerabilities: 'Zafiyet bildirimi (yazma)',
  'backup-results': 'Yedek sonucu bildirimi (yazma)',
  'integration-runs': 'Entegrasyon koşuları (okuma)',
  'access-observations': 'Erişim gözlemi bildirimi (yazma)',
};

/** Ucun bağlı olduğu modül — rol kapısının sorduğu modülün AYNISI. */
export const UC_MODULU: Record<UcKimligi, 'envanter' | 'uyum' | 'yonetim'> = {
  plants: 'envanter',
  assets: 'envanter',
  'assets.upsert': 'envanter',
  'assets.observations': 'envanter',
  evidence: 'uyum',
  vulnerabilities: 'envanter',
  'backup-results': 'envanter',
  'integration-runs': 'yonetim',
  'access-observations': 'envanter',
};

/* YAZMA yapan uçlar. Liste burada durur ve tek kaynaktır.

   ── BU LİSTE BAŞTA YANLIŞ YAZILDI ──────────────────────────────────────
   İlk hâlinde yalnız `assets.upsert` vardı; adı "upsert" olmayan dört uç
   (`vulnerabilities`, `backup-results`, `access-observations`,
   `assets.observations`) da POST alıp veritabanına YAZIYOR. Bu hâliyle
   salt okunur bir anahtar zafiyet kaydı yazabilirdi — yani kapının
   koruduğunu sandığı şeyin dördü açıkta kalırdı.

   Bir daha kaymasın diye `tests/faz-f-api-kapsam.test.ts` bu listeyi
   `lib/api/uclar/` içindeki `islem: 'yazma'` bildirimleriyle karşılaştırır:
   yeni bir yazma ucu eklenip buraya yazılmazsa test kırılır. */
export const YAZMA_UCLARI: readonly UcKimligi[] = [
  'assets.upsert', 'assets.observations', 'vulnerabilities',
  'backup-results', 'access-observations',
];

export function yazmaUcuMu(uc: UcKimligi): boolean {
  return YAZMA_UCLARI.includes(uc);
}

/* ── Kapsam çözümü ───────────────────────────────────────────────────── */

export type KapsamDurumu = 'tanimli' | 'tanimsiz' | 'bos' | 'bozuk';

export const KAPSAM_SOZU: Record<KapsamDurumu, string> = {
  tanimli: 'kapsam tanımlı',
  /* Eski kayıt: kapsam alanı hiç doldurulmamış. KUSURDUR ve gizlenmez —
     anahtar sahibinin bütün yetkilerini taşır. */
  tanimsiz: 'KAPSAM TANIMSIZ — anahtar sahibinin bütün yetkilerini taşır',
  bos: 'kapsam boş — anahtar hiçbir uca erişemez',
  bozuk: 'kapsam okunamadı — anahtar hiçbir uca erişemez',
};

export const KAPSAM_SINIFI: Record<KapsamDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  tanimli: 'ok', tanimsiz: 'bd', bos: 'md', bozuk: 'bd',
};

export type CozulmusKapsam = {
  durum: KapsamDurumu;
  /** Tanımlıysa izinli uçlar; tanımsızda BOŞ (miras ayrı ele alınır). */
  uclar: UcKimligi[];
  /** Listede olup tanınmayan girdiler — sessizce atılmaz, sayılır. */
  taninmayan: string[];
};

/**
 * `ApiAnahtari.kapsamJson` alanını çözer.
 *
 * BOZUK JSON boş kapsama düşer, "her şey"e DEĞİL: bozuk bir kapsam
 * alanını "kısıt yok" diye yorumlamak, tam da kısıtın var olma
 * sebebini ortadan kaldırırdı.
 */
export function kapsamiCoz(kapsamJson: string | null): CozulmusKapsam {
  if (kapsamJson === null) {
    return { durum: 'tanimsiz', uclar: [], taninmayan: [] };
  }
  let ham: unknown;
  try {
    ham = JSON.parse(kapsamJson);
  } catch {
    return { durum: 'bozuk', uclar: [], taninmayan: [] };
  }
  if (!Array.isArray(ham)) {
    return { durum: 'bozuk', uclar: [], taninmayan: [] };
  }
  const uclar: UcKimligi[] = [];
  const taninmayan: string[] = [];
  for (const x of ham) {
    if (typeof x !== 'string') { taninmayan.push(String(x)); continue; }
    if (UC_KIMLIKLERI.includes(x as UcKimligi)) {
      if (!uclar.includes(x as UcKimligi)) uclar.push(x as UcKimligi);
    } else {
      taninmayan.push(x);
    }
  }
  return {
    durum: uclar.length === 0 ? 'bos' : 'tanimli',
    uclar,
    taninmayan,
  };
}

/* ── Kapı ────────────────────────────────────────────────────────────── */

export type KapsamKarari =
  | { izin: true; miras: boolean }
  | { izin: false; sebep: string };

/**
 * Bu anahtar bu uca erişebilir mi?
 *
 * ── İKİ KATMANLI SAVUNMA ──────────────────────────────────────────────
 * `saltOkunur` bayrağı kapsam listesinden BAĞIMSIZ tutar: kapsam
 * listesine yanlışlıkla bir yazma ucu eklense bile bayrak kapalıysa
 * yazma geçmez. Tek bir alana güvenmek, o alanı yanlış dolduran tek bir
 * kullanıcı hatasının yazma hakkı vermesi demek olurdu.
 *
 * ── TANIMSIZ KAPSAM REDDEDİLMEZ, İŞARETLENİR ──────────────────────────
 * Eski anahtarlar (`kapsamJson: null`) çalışmaya devam eder ve
 * `miras: true` döner. Onları bugün kesmek, çalışan entegrasyonları
 * sessizce kırardı; bunun yerine ekran o anahtarları kusur olarak
 * gösterir ve kurum kapsam tanımlayana kadar boşluk GÖRÜNÜR kalır.
 */
export function ucaErisim(o: {
  kapsamJson: string | null;
  saltOkunur: boolean;
  uc: UcKimligi;
}): KapsamKarari {
  /* Yazma yasağı ÖNCE bakılır: kapsam ne derse desin, salt okunur bir
     anahtar yazma ucuna giremez. */
  if (o.saltOkunur && yazmaUcuMu(o.uc)) {
    return {
      izin: false,
      sebep: 'Bu anahtar SALT OKUNUR olarak tanımlanmış; yazma uçlarına erişemez.',
    };
  }
  const k = kapsamiCoz(o.kapsamJson);
  if (k.durum === 'tanimsiz') {
    /* Eski kayıt: kısıt yok ama işaretli. */
    return { izin: true, miras: true };
  }
  if (k.durum === 'bozuk') {
    return {
      izin: false,
      sebep: 'Anahtarın kapsam tanımı okunamadı; erişim reddedildi.',
    };
  }
  if (!k.uclar.includes(o.uc)) {
    return {
      izin: false,
      sebep: `Bu anahtarın kapsamında "${o.uc}" ucu yok.`,
    };
  }
  return { izin: true, miras: false };
}

/* ── Tanımlama kapısı ────────────────────────────────────────────────── */

export type TanimKarari =
  | { ok: true; kapsamJson: string }
  | { ok: false; sebep: string };

/**
 * Yeni bir anahtarın kapsamı geçerli mi?
 *
 * ── BOŞ KAPSAM KABUL EDİLMEZ ──────────────────────────────────────────
 * Kapsamsız anahtar üretmeye devam etmek, kapatmaya çalıştığımız kusuru
 * her gün yeniden üretmek olurdu. Eski kayıtlar (`kapsamJson: null`)
 * çalışmaya devam eder ama YENİSİ açılamaz.
 *
 * ── ÇELİŞKİ ÜRETİM ANINDA KESİLİR ─────────────────────────────────────
 * Salt okunur işaretli bir anahtara yazma ucu seçilemez. Çalışma anındaki
 * iki katmanlı savunma (`ucaErisim`) yine yerinde durur — o katman
 * veritabanına elle dokunan birine karşıdır; bu katman formu dolduran
 * kişiye karşı ve hatayı SEBEBİYLE söyler.
 */
export function kapsamKapisi(o: {
  uclar: readonly string[];
  saltOkunur: boolean;
}): TanimKarari {
  const taninmayan = o.uclar.filter((u) => !UC_KIMLIKLERI.includes(u as UcKimligi));
  if (taninmayan.length > 0) {
    return {
      ok: false,
      sebep: `Tanınmayan uç: ${taninmayan.join(', ')}. Geçerli uçlar: `
        + UC_KIMLIKLERI.join(', '),
    };
  }
  const benzersiz = [...new Set(o.uclar as readonly UcKimligi[])];
  if (benzersiz.length === 0) {
    return {
      ok: false,
      sebep: 'En az bir uç seçilmeli. Kapsamsız anahtar, sahibinin bütün '
        + 'yetkilerini taşır ve bu tam olarak kaçınılan durumdur.',
    };
  }
  if (o.saltOkunur) {
    const yazanlar = benzersiz.filter(yazmaUcuMu);
    if (yazanlar.length > 0) {
      return {
        ok: false,
        sebep: `Anahtar SALT OKUNUR işaretli ama yazma ucu seçilmiş: `
          + `${yazanlar.join(', ')}. Ya işareti kaldırın ya da bu uçları çıkarın.`,
      };
    }
  }
  /* Sıra sabitlenir: aynı kapsam her zaman aynı metni üretsin ki denetim
     izinde anlamsız "değişti" satırları oluşmasın. */
  const sirali = UC_KIMLIKLERI.filter((u) => benzersiz.includes(u));
  return { ok: true, kapsamJson: JSON.stringify(sirali) };
}

/* ── Kütük özeti ─────────────────────────────────────────────────────── */

export type AnahtarOzeti = {
  toplam: number;
  /** Kapsamı hiç tanımlanmamış anahtar — KUSUR. */
  kapsamsiz: number;
  saltOkunur: number;
  yazabilen: number;
  /** Süresi dolmuş ya da iptal edilmiş; erişimi yok. */
  pasif: number;
};

export function anahtarOzeti(
  anahtarlar: readonly {
    kapsamJson: string | null; saltOkunur: boolean; pasif: boolean;
  }[],
): AnahtarOzeti {
  const aktif = anahtarlar.filter((a) => !a.pasif);
  return {
    toplam: anahtarlar.length,
    kapsamsiz: aktif.filter((a) => a.kapsamJson === null).length,
    saltOkunur: aktif.filter((a) => a.saltOkunur).length,
    yazabilen: aktif.filter((a) => !a.saltOkunur).length,
    pasif: anahtarlar.filter((a) => a.pasif).length,
  };
}

export function anahtarCumlesi(o: AnahtarOzeti): string {
  if (o.toplam === 0) return 'Tanımlı API anahtarı yok.';
  if (o.kapsamsiz > 0) {
    return `${o.kapsamsiz} aktif anahtarın KAPSAMI TANIMSIZ: sahibinin bütün `
      + 'yetkilerini taşıyor. Her anahtara erişebileceği uçlar tanımlanmalı.';
  }
  if (o.yazabilen > 0) {
    return `${o.toplam - o.pasif} aktif anahtar · ${o.yazabilen} tanesi yazma `
      + 'yapabiliyor.';
  }
  return `${o.toplam - o.pasif} aktif anahtarın tamamı salt okunur.`;
}

import 'server-only';

/* Sır sağlayıcı soyutlaması.

   ── Değişmezler ───────────────────────────────────────────────────────
   · Connector kimlik bilgisi VERİTABANINDA TUTULMAZ. Connector kaydı
     yalnız bir REFERANS taşır (`sirReferansi`); değerin kendisi bu
     katmandan çözülür ve asla serileştirilmez, loglanmaz, istemciye gider.
   · Bağlanmamış sağlayıcı SESSİZCE boş dönmez — yapılandırma hatası
     olarak bildirir, çünkü "sır yok" ile "sır okunamadı" aynı şey değil.
   · Sır değerinin ömrü çağıranın belleğidir. Bu modül hiçbir yerde
     önbelleğe almaz: rotasyon sonrası eski değerin yaşamaya devam etmesi
     sessiz bir kimlik doğrulama hatasıdır.

   ── Referans biçimi ───────────────────────────────────────────────────
     <sağlayıcı>:<yol>[#alan]
       env:AD_BIND_PAROLA           → process.env.AD_BIND_PAROLA
       dosya:/run/secrets/ad#parola → dosyadaki JSON'un `parola` alanı
       vault:ot/ad#parola           → sağlayıcı kayıtlı değilse açık hata

   ── Neden takılabilir sağlayıcı ───────────────────────────────────────
   Eskiden çözüm gövdesi bir `switch` idi ve yeni sağlayıcı eklemek bu
   dosyayı değiştirmeyi gerektiriyordu. Vault/KMS gerçek bir dış sisteme
   bağlanmadan uygulanamaz; ama o gün geldiğinde çekirdeğe dokunulmasın
   diye sağlayıcı bir ARAYÜZ ve bu dosya bir KAYIT DEFTERİ oldu.
   `vault` bugün kayıtlı DEĞİLDİR ve öyle davranır. */

export type SirCozumu =
  | { ok: true; deger: string }
  | { ok: false; hata: string };

/** Değeri ÇÖZMEDEN "bu referans karşılığı var mı" yanıtı.
    Sağlık ekranı ve sertifikasyon koşusu bunu kullanır: bir connector'ın
    kimlik bilgisi tanımlı mı sorusuna, sırrı belleğe almadan yanıt. */
export type SirVarligi =
  | { durum: 'var' }
  | { durum: 'yok'; sebep: string }
  /** sağlayıcı bağlı değil → var mı yok mu BİLİNMİYOR (yok DEĞİL) */
  | { durum: 'bilinmiyor'; sebep: string };

export interface SirSaglayici {
  /** referans önekindeki ad: 'env', 'dosya', 'vault'… */
  readonly ad: string;
  /** Gerçekten bir kaynağa bağlı mı? false ise çözüm denenmez. */
  readonly bagli: boolean;
  /** Bağlı değilse ne gerekiyor — ekranda ve hata metninde görünür. */
  readonly gereken?: string;
  coz(yol: string, alan: string | null): Promise<SirCozumu>;
  /** Değeri okumadan varlık kontrolü. */
  varMi(yol: string, alan: string | null): Promise<SirVarligi>;
}

/* ═══ Sağlayıcılar ════════════════════════════════════════════════════ */

const ortamSaglayici: SirSaglayici = {
  ad: 'env',
  bagli: true,
  async coz(yol) {
    const deger = process.env[yol];
    if (!deger) return { ok: false, hata: `Ortam değişkeni tanımsız: ${yol}` };
    return { ok: true, deger };
  },
  async varMi(yol) {
    return process.env[yol]
      ? { durum: 'var' }
      : { durum: 'yok', sebep: `Ortam değişkeni tanımsız: ${yol}` };
  },
};

const dosyaSaglayici: SirSaglayici = {
  ad: 'dosya',
  bagli: true,
  async coz(yol, alan) {
    try {
      const { readFile } = await import('node:fs/promises');
      const ham = await readFile(yol, 'utf8');
      if (!alan) return { ok: true, deger: ham.trim() };
      const nesne = JSON.parse(ham) as Record<string, unknown>;
      const deger = nesne[alan];
      if (typeof deger !== 'string' || !deger) {
        return { ok: false, hata: `Sır dosyasında '${alan}' alanı yok ya da boş` };
      }
      return { ok: true, deger };
    } catch (e) {
      // Hata metni dosya YOLUNU taşıyabilir ama İÇERİĞİNİ asla taşımaz.
      return { ok: false, hata: `Sır dosyası okunamadı (${yol}): ${(e as Error).message}` };
    }
  },
  async varMi(yol, alan) {
    try {
      const { access, readFile } = await import('node:fs/promises');
      await access(yol);
      if (!alan) return { durum: 'var' };
      /* Alan istendiyse dosyayı açmak gerekiyor. Değer belleğe alınır ama
         DÖNDÜRÜLMEZ; yalnız varlığı bildirilir. */
      const nesne = JSON.parse(await readFile(yol, 'utf8')) as Record<string, unknown>;
      const d = nesne[alan];
      return typeof d === 'string' && d
        ? { durum: 'var' }
        : { durum: 'yok', sebep: `Sır dosyasında '${alan}' alanı yok ya da boş` };
    } catch {
      return { durum: 'yok', sebep: `Sır dosyası okunamıyor: ${yol}` };
    }
  },
};

/* Vault/KMS: kayıtlı ama BAĞLI DEĞİL. Sahte bir değer döndürmek ya da
   sessizce env'e düşmek, çalıştığı sanılan ama çalışmayan bir entegrasyon
   üretir. Gerçek bağlantı geldiğinde YALNIZ bu nesnenin gövdesi
   değişecek; çağıranların hiçbiri değişmeyecek. */
const vaultSaglayici: SirSaglayici = {
  ad: 'vault',
  bagli: false,
  gereken: 'HashiCorp Vault ya da AWS KMS uç noktası + rol/token',
  async coz() {
    return {
      ok: false,
      hata: 'Vault sağlayıcısı bu kurulumda bağlı değil — '
        + 'gereken: HashiCorp Vault/AWS KMS uç noktası. '
        + 'Bağlanana kadar env: ya da dosya: kullanın',
    };
  },
  async varMi() {
    /* "yok" DEĞİL: sağlayıcı bağlı olmadığı için sırrın var olup
       olmadığını BİLMİYORUZ. İkisini karıştırmak, kurulumu eksik bir
       connector'ı "kimlik bilgisi yok" diye raporlamak olurdu. */
    return {
      durum: 'bilinmiyor',
      sebep: 'Vault sağlayıcısı bağlı değil — varlık doğrulanamıyor',
    };
  },
};

const KAYIT = new Map<string, SirSaglayici>(
  [ortamSaglayici, dosyaSaglayici, vaultSaglayici].map((s) => [s.ad, s]),
);

/** Yeni sağlayıcı kaydeder (gerçek Vault/KMS bağlandığında kullanılacak). */
export function sirSaglayiciKaydet(saglayici: SirSaglayici, ustuneYaz = false): void {
  const mevcut = KAYIT.get(saglayici.ad);
  if (mevcut && mevcut !== saglayici && !ustuneYaz) {
    throw new Error(
      `sirSaglayiciKaydet: '${saglayici.ad}' zaten kayıtlı — `
      + 'üzerine yazmak için ustuneYaz=true verin',
    );
  }
  KAYIT.set(saglayici.ad, saglayici);
}

/** Kayıtlı sağlayıcılar ve bağlı olup olmadıkları (ekran/rapor için). */
export function sirSaglayicilari(): { ad: string; bagli: boolean; gereken: string | null }[] {
  return [...KAYIT.values()]
    .map((s) => ({ ad: s.ad, bagli: s.bagli, gereken: s.gereken ?? null }))
    .sort((a, b) => a.ad.localeCompare(b.ad));
}

/* ═══ Referans ayrıştırma ve doğrulama ════════════════════════════════ */

export type SirReferansi = { saglayici: string; yol: string; alan: string | null };

const BICIM = /^([a-z][a-z0-9_-]*):([^\s#]+)(?:#([^\s#]+))?$/;

/** Referansı ayrıştırır. Biçim bozuksa null — sağlayıcı tanınmasa bile
    biçim geçerli olabilir; ikisi AYRI kontroldür. */
export function referansAyristir(referans: string): SirReferansi | null {
  const m = BICIM.exec(referans.trim());
  if (!m) return null;
  return { saglayici: m[1], yol: m[2], alan: m[3] ?? null };
}

/** Biçimsel geçerlilik — değeri çözmeden. */
export function referansGecerli(referans: string): boolean {
  return referansAyristir(referans) !== null;
}

export type ReferansDenetimi =
  | { ok: true; referans: SirReferansi; saglayiciBagli: boolean }
  | { ok: false; hata: string };

/** Referansı ayrıştırır VE sağlayıcısının kayıtlı olduğunu doğrular.
    Connector kaydedilirken çağrılır: biçimi bozuk ya da sağlayıcısı
    tanınmayan bir referansı kaydetmek, kurulumu ilk koşuya kadar
    sessizce erteler. */
export function referansDenetle(referans: string | null | undefined): ReferansDenetimi {
  if (!referans) return { ok: false, hata: 'Sır referansı tanımlı değil' };
  const ayrik = referansAyristir(referans);
  if (!ayrik) {
    return {
      ok: false,
      hata: 'Geçersiz sır referansı biçimi — beklenen: <sağlayıcı>:<yol>[#alan]',
    };
  }
  const saglayici = KAYIT.get(ayrik.saglayici);
  if (!saglayici) {
    return {
      ok: false,
      hata: `Bilinmeyen sır sağlayıcısı: ${ayrik.saglayici} — `
        + `kayıtlı olanlar: ${[...KAYIT.keys()].sort().join(', ')}`,
    };
  }
  return { ok: true, referans: ayrik, saglayiciBagli: saglayici.bagli };
}

/* ═══ Çözüm ve varlık kontrolü ════════════════════════════════════════ */

/**
 * Sır referansını çözer. Değer yalnız çağıranın belleğinde yaşar.
 * Dönen değeri LOGLAMA, denetim izine YAZMA, yanıt gövdesine KOYMA.
 *
 * Önbellek YOKTUR ve bilinçlidir: sır döndürüldükten sonra kaynakta
 * değişirse (rotasyon) bir sonraki çözüm YENİ değeri getirir. Önbellek,
 * rotasyonu sessiz bir kimlik doğrulama hatasına çevirirdi.
 */
export async function siriCoz(referans: string | null | undefined): Promise<SirCozumu> {
  const denetim = referansDenetle(referans);
  if (!denetim.ok) return { ok: false, hata: denetim.hata };
  const s = KAYIT.get(denetim.referans.saglayici)!;
  return s.coz(denetim.referans.yol, denetim.referans.alan);
}

/**
 * Sırrın VAR OLUP OLMADIĞINI değeri okumadan bildirir.
 *
 * Üç yanıt vardır ve üçü de farklıdır: `var`, `yok`, `bilinmiyor`.
 * Sağlayıcı bağlı değilse yanıt `bilinmiyor`dur — "yok" demek, kurulumu
 * eksik olmayan bir connector'ı eksik göstermek olurdu.
 */
export async function sirVarMi(referans: string | null | undefined): Promise<SirVarligi> {
  const denetim = referansDenetle(referans);
  if (!denetim.ok) return { durum: 'yok', sebep: denetim.hata };
  const s = KAYIT.get(denetim.referans.saglayici)!;
  if (!s.bagli) {
    return {
      durum: 'bilinmiyor',
      sebep: `'${s.ad}' sağlayıcısı bağlı değil${s.gereken ? ` — gereken: ${s.gereken}` : ''}`,
    };
  }
  return s.varMi(denetim.referans.yol, denetim.referans.alan);
}

/* ═══ Maskeleme ve redaksiyon ═════════════════════════════════════════ */

/** Maskeli gösterim — ekranda ve logda yalnız bu görünebilir.
    Yol bir sır DEĞİL, sırra giden adrestir; açık gösterilebilir. */
export function sirMaskesi(referans: string | null): string {
  if (!referans) return 'tanımsız';
  const ayrik = referansAyristir(referans);
  if (!ayrik) return '(geçersiz referans)';
  return ayrik.alan
    ? `${ayrik.saglayici}: ${ayrik.yol} → ${ayrik.alan}`
    : `${ayrik.saglayici}: ${ayrik.yol}`;
}

/** Bir metnin içinde sır geçip geçmediğini denetler — log yazmadan önce
    kullanılır. Tam güvence vermez; savunma katmanıdır, tek hat değil. */
export function sirSizintisiVarMi(metin: string, sir: string | null): boolean {
  if (!sir || sir.length < 6) return false;
  return metin.includes(sir);
}

/** Kısa sırların ayıklanma eşiği. Bunun altındaki değerler metinde
    tesadüfen geçebilir; körlemesine değiştirmek okunabilir metni bozar. */
const EN_KISA_SIR = 6;

/**
 * Metinden sır değerlerini ayıklar.
 *
 * Loga, koşu kaydına, hata mesajına ve API yanıtına giden HER metin
 * buradan geçmelidir. Birden çok sır verilebilir (bir connector'ın
 * parolası + token'ı gibi); hepsi ayrı ayrı temizlenir.
 *
 * Ayıklama YERİNE KOYMA yapar, silmez: metnin yapısı korunur ki
 * "burada bir sır vardı" bilgisi kaybolmasın.
 */
export function sirlariAyikla(metin: string, sirlar: (string | null | undefined)[]): string {
  let sonuc = metin;
  for (const sir of sirlar) {
    if (!sir || sir.length < EN_KISA_SIR) continue;
    // Kaçış: sır düzenli ifade karakteri içerebilir.
    const kaliplanmis = sir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sonuc = sonuc.replace(new RegExp(kaliplanmis, 'g'), '«sır ayıklandı»');
  }
  return sonuc;
}

/* ═══ Rotasyon sözleşmesi ═════════════════════════════════════════════ */

/**
 * Sır rotasyonundan sonra çağrılır.
 *
 * Bu katman sır ÖNBELLEKLEMEDİĞİ için yapacak bir şey yoktur ve bu
 * bilinçlidir — fonksiyon sözleşmeyi GÖRÜNÜR kılmak için var: ileride
 * bir sağlayıcı önbellek eklerse, temizlemesi gereken yer burasıdır ve
 * çağıranların değişmesi gerekmez.
 *
 * Dönen değer: temizlenen sağlayıcı sayısı (bugün 0).
 */
export function rotasyonBildir(): { temizlenen: number; not: string } {
  return {
    temizlenen: 0,
    not: 'Sır önbelleği yok — her çözüm kaynağa gider, rotasyon anında geçerlidir.',
  };
}

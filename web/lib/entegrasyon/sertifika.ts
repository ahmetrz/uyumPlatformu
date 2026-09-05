import 'server-only';
import type { Adaptor, AdaptorBaglami, Gozlem } from './sozlesme';
import { referansDenetle, sirVarMi } from './sir';

/* ═══════════════════════════════════════════════════════════════════════
   CONNECTOR SERTİFİKASYON HARNESS'I

   Her adaptörün — bağlansın ya da bağlanmasın — geçmesi gereken ORTAK
   sözleşme kontrolleri. Bir adaptörün "hazır" sayılması için gereken
   asgari kanıt budur.

   ── Bu dosyanın ASLA yapmadığı ───────────────────────────────────────
   · Hiçbir dış sisteme bağlanmaz. `fetchChanges` / `discover` / `health`
     ancak fikstür `disBaglantiGerekmez: true` diyorsa çağrılır; yani
     kaynağı yerel bir dosya ya da yapıştırılmış içerik olan adaptörlerde.
     Aksi hâlde kontrol `uygulanamaz` döner — sertifikasyon koşusu bir
     kurum sistemine paket göndermez.
   · Sır ÇÖZMEZ. `sirVarMi()` ile yalnız varlık sorulur; değer belleğe
     alınmaz, rapora girmez.
   · Veri UYDURMAZ. Girdi yalnız çağıranın verdiği fikstürdür.

   ── `uygulanamaz` ile `kaldi` KARIŞTIRILMAZ ──────────────────────────
   Bu ayrım harness'ın varlık sebebidir. Bağlanmamış bir adaptörün
   `fetchChanges` kontrolü UYGULANAMAZ: adaptör sözleşme gereği "bağlı
   değilim" diyor ve bu doğru davranış. Onu `kaldi` saymak, doğru
   davranan bir adaptörü kusurlu göstermek olurdu; tersi (uygulanamayan
   kontrolü `gecti` saymak) ise sahte bir başarı raporu üretirdi.

   ── Dört durum ───────────────────────────────────────────────────────
     gecti        kontrol koştu ve beklenen sonucu verdi
     kaldi        kontrol koştu ve sözleşme ihlali buldu
     uygulanamaz  bu adaptörde/bu kurulumda anlamı yok (sebebi yazılır)
     bilinmiyor   ölçülemedi — kusur DA olabilir, olmayabilir de
   ═══════════════════════════════════════════════════════════════════ */

/* ═══ Kontrol kataloğu ════════════════════════════════════════════════ */

export const KONTROL_KODLARI = [
  'yapilandirma_semasi',
  'sir_referanslari',
  'payload_ayristirici',
  'normalize_dogru',
  'bilinmeyen_yanlis_degil',
  'yinelenen_tespiti',
  'idempotency',
  'santral_kapsami',
  'bozuk_reddi',
  'kismi_basarisizlik',
  'retry_backoff',
  'bayat_connector',
  'koken_eksiksiz',
  'kuru_kosu',
  'baglanti_ihtiyaci',
] as const;

export type KontrolKodu = (typeof KONTROL_KODLARI)[number];

export const KONTROL_BASLIKLARI: Record<KontrolKodu, string> = {
  yapilandirma_semasi: 'Yapılandırma şeması beyan edildi ve doğruluyor',
  sir_referanslari: 'Gereken sır referansları mevcut',
  payload_ayristirici: 'Payload ayrıştırıcı çalışıyor',
  normalize_dogru: 'Normalize beklenen Gozlem alanlarını üretiyor',
  bilinmeyen_yanlis_degil: 'Bilinmeyen alan null kalıyor (false/0/boş değil)',
  yinelenen_tespiti: 'Yinelenen tespiti (kararlı kaynak kayıt kimliği)',
  idempotency: 'Idempotency — aynı fikstür iki kez, tek kayıt',
  santral_kapsami: 'Santral kapsamı korunuyor',
  bozuk_reddi: 'Bozuk payload reddediliyor (sessizce atılmıyor)',
  kismi_basarisizlik: 'Kısmî başarısızlık denetime düşüyor',
  retry_backoff: 'Retry / geri çekilme davranışı',
  bayat_connector: 'Bayat connector doğru raporlanıyor',
  koken_eksiksiz: 'Köken (provenance) eksiksiz',
  kuru_kosu: 'Kuru koşu (dry-run)',
  baglanti_ihtiyaci: 'Bağlantı ihtiyacı yapısal olarak beyan edildi',
};

export type KontrolDurumu = 'gecti' | 'kaldi' | 'uygulanamaz' | 'bilinmiyor';

export type KontrolSonucu = {
  kod: KontrolKodu;
  baslik: string;
  durum: KontrolDurumu;
  /** NEDEN bu sonuç — boş bırakılmaz, `uygulanamaz` için de zorunludur */
  gerekce: string;
};

export type SertifikaRaporu = {
  tip: string;
  baglanabilir: boolean;
  kontroller: KontrolSonucu[];
  ozet: Record<KontrolDurumu, number>;
  /** Hiç `kaldi` yoksa sertifika geçerlidir. `uygulanamaz` kusur DEĞİLDİR. */
  gecerli: boolean;
};

/* ═══ Fikstür sözleşmesi ══════════════════════════════════════════════
   Fikstür VERİSİ bu dosyada durmaz (üretim derlemesine sızmasın diye
   `tests/fixture/` altındadır); burada yalnız BİÇİMİ tanımlıdır. */

export type BeklenenGozlem = {
  tip: Gozlem['tip'];
  /** biliniyorsa beklenen kararlı kaynak kayıt kimliği */
  kaynakKayitId?: string;
  /** normalize çıktısında birebir eşleşmesi beklenen alanlar */
  alanlar: Record<string, unknown>;
};

/** Çekirdek koşusu gerektiren kontroller için hazır yapılandırmalar. */
export type KosumFiksturu = {
  gecerli: Record<string, unknown>;
  /** geçerli + reddedilecek satırlar birlikte — kısmî başarısızlık */
  karisik: Record<string, unknown>;
  /** aynı kayıt iki kez */
  yinelenen: Record<string, unknown>;
  kapsam: {
    yapilandirma: Record<string, unknown>;
    kapsamKodlari: string[];
    /** kapsam İÇİNDEKİ santral kodu (kabul edilmeli) */
    icKod: string;
    /** kapsam DIŞINDAKİ santral kodu (reddedilmeli) */
    disKod: string;
  };
  /** kaynağı okunamayan yapılandırma — KALICI hata üretmeli */
  okunamayan: Record<string, unknown>;
};

export type FiksturSeti = {
  tip: string;
  kaynakSistem: string;
  /**
   * Bu fikstür dış sisteme bağlanmadan koşulabilir mi?
   *
   * false ise harness adaptörün ağa çıkabilecek hiçbir metodunu
   * (`fetchChanges`, `discover`, `health`) çağırmaz ve çekirdek koşusu
   * istemez. Sertifikasyonun bir kurum sistemine paket göndermesini
   * engelleyen sınır budur — dokunulmadan bırakılmamalıdır.
   */
  disBaglantiGerekmez: boolean;
  /** connector yapılandırması — SIR, credential ve gerçek uç nokta İÇERMEZ */
  yapilandirma: Record<string, unknown>;
  /** şema kontrolünün reddetmesi beklenen yapılandırma */
  gecersizYapilandirma?: Record<string, unknown>;
  sir: {
    /** biçimi geçerli, sağlayıcısı kayıtlı sentetik referans */
    gecerliReferans: string;
    /** biçimi geçerli ama karşılığı olmayan referans → 'yok' beklenir */
    eksikReferans: string;
    /** biçimi bozuk referans → 'yok' + sebep beklenir */
    bozukReferans: string;
  };
  gecerli: { satirlar: unknown[]; beklenen: BeklenenGozlem[] };
  /** normalize'a ULAŞAN ama reddedilmesi gereken satırlar */
  bozuk: { satirlar: unknown[]; not: string };
  /** kaynak düzeyinde bozuk içerik — koşu sessiz geçmemeli */
  bozukKaynak?: { yapilandirma: Record<string, unknown>; not: string };
  kismi: { satirlar: unknown[]; bosAlanlar: string[] };
  yinelenen: { satirlar: unknown[] };
  bayat?: { yapilandirma: Record<string, unknown>; enAzDk: number };
  bilinmeyenAlan: { satirlar: unknown[]; alanlar: string[] };
  /** referansı platformda TANIMSIZ olan satırlar — düşürülmemeli, referans korunmalı */
  eksikReferans: { satirlar: unknown[]; korunanAlan: string; not: string };
  kosum?: KosumFiksturu;
};

/* ═══ Sandbox koşucusu ════════════════════════════════════════════════
   Çekirdek gerektiren kontroller (idempotency, kapsam, retry, dead-letter)
   veritabanına yazar. Harness kendi veritabanı açmaz: koşucuyu ÇAĞIRAN
   verir — testte izole bir dev.db kopyası, başka bir yerde hiçbir şey.
   Koşucu verilmezse bu kontroller `uygulanamaz` döner; sessizce `gecti`
   OLMAZ. */

export type SandboxIstegi = {
  yapilandirma: Record<string, unknown>;
  /** aynı `oturum` değeri aynı connector'ı yeniden kullanır (idempotency) */
  oturum: string;
  kapsamKodlari?: string[] | null;
  sirReferansi?: string | null;
  /** çekimi bu kadar kez GEÇİCİ hatayla düşür (vekil adaptör ile) */
  geciciHata?: number;
  /** çekimi KALICI hatayla düşür */
  kaliciHata?: boolean;
};

export type SandboxSonucu = {
  durum: string;
  alinan: number;
  kabulEdilen: number;
  reddedilen: number;
  yinelenen: number;
  denemeNo: number;
  imlecSonra: string | null;
  hata: string | null;
  ayrinti: string;
  /** çekirdeğe enjekte edilen bekleme süreleri (geri çekilme kanıtı) */
  beklemeler: number[];
  /** koşu satırı 'calisiyor' kaldı mı — sessiz ölüm kontrolü */
  kosuAcikKaldi: boolean;
  kesifKayitlari: { kaynakKayitId: string; tesisKodu: string | null; durum: string }[];
  kokenler: {
    kaynakSistem: string; kaynakKayitId: string;
    kokenTipi: string; guven: number | null; toplanma: Date | null;
  }[];
  /** dead-letter satırları; null = tablo bu kurulumda okunamadı */
  reddedilenKayitlar: { asama: string; sebep: string }[] | null;
};

export type SandboxKosucu = {
  kos(istek: SandboxIstegi): Promise<SandboxSonucu>;
  /** Bayat 'calisiyor' koşusu üretip süpürücüyü koşturur. */
  bayatKosu?(): Promise<{ kapanan: number; durum: string; hata: string | null }>;
};

/** Kuru koşu başka bir ajanın işi; varsa buradan takılır, yoksa UYDURULMAZ. */
export type KuruKosucu = {
  kos(istek: SandboxIstegi): Promise<{
    /** Çekirdek kuru koşuyu GERÇEKTEN uyguluyor mu? false ise ölçüm yok. */
    destekli: boolean;
    /** kuru koşuda hedef tabloya yazılan satır sayısı — SIFIR olmalı */
    yazilanKayit: number;
    /** "olsaydı ne olurdu" sayacı */
    olacakKayit: number;
    durum: string;
    not: string;
  }>;
};

export type SertifikaOrtami = {
  fikstur: FiksturSeti;
  kosucu?: SandboxKosucu;
  kuruKosucu?: KuruKosucu;
};

/* ═══ Yardımcılar ═════════════════════════════════════════════════════ */

function baglamKur(f: FiksturSeti, yapilandirma?: Record<string, unknown>): AdaptorBaglami {
  return {
    connectorId: 'sertifika-sandbox',
    kod: `SERTIFIKA-${f.tip.toUpperCase()}`,
    kaynakSistem: f.kaynakSistem,
    yapilandirma: yapilandirma ?? f.yapilandirma,
    // Sertifikasyon sır ÇÖZMEZ; adaptöre sır verilmez.
    sir: null,
    imlec: null,
  };
}

function mesaj(e: unknown): string {
  return e instanceof Error ? (e.message || e.name) : String(e);
}

/** Adaptör kendi config şemasını beyan ediyor mu — yapısal yoklama.
    `sozlesme.ts` bende değil; alan eklenene kadar isteğe bağlı okunur. */
type SemaTasiyan = { yapilandirmaSemasi: { safeParse(deger: unknown): { success: boolean } } };
function semaBeyanEdilmis(a: Adaptor): a is Adaptor & SemaTasiyan {
  const s = (a as Partial<SemaTasiyan>).yapilandirmaSemasi;
  return !!s && typeof s.safeParse === 'function';
}

type SirTasiyan = { gerekenSirlar: string[] };
function sirlarBeyanEdilmis(a: Adaptor): a is Adaptor & SirTasiyan {
  const s = (a as Partial<SirTasiyan>).gerekenSirlar;
  return Array.isArray(s) && s.every((x) => typeof x === 'string');
}

/** "Bağlı değil" bir kusur değil bir DURUMDUR; gerekçesi adaptörden gelir. */
function bagliDegilGerekce(a: Adaptor, ek: string): string {
  const gereken = (a as Adaptor & { gereken?: string }).gereken;
  return `Adaptör bağlı değil (baglanabilir=false) — ${ek}.`
    + (gereken ? ` Bağlanması için gereken: ${gereken}` : '');
}

/** Bilinmeyen ile "yanlış bilinen"i ayırır: null/undefined bilinmiyordur,
    false/0/'' ise ÖLÇÜLMÜŞ bir değer gibi görünür ve yalan söyler. */
function bilinmiyorMu(deger: unknown): boolean {
  return deger === null || deger === undefined;
}

/* ═══ Kontroller ══════════════════════════════════════════════════════ */

type Yazici = (kod: KontrolKodu, durum: KontrolDurumu, gerekce: string) => void;

/* 1 — Yapılandırma şeması */
function kontrolSema(a: Adaptor, f: FiksturSeti, yaz: Yazici): void {
  if (!semaBeyanEdilmis(a)) {
    yaz('yapilandirma_semasi', 'uygulanamaz',
      'Adaptör `yapilandirmaSemasi` alanını BEYAN ETMİYOR. Alan sözleşmede '
      + '(lib/entegrasyon/sozlesme.ts) henüz yok; şema sahibine diff olarak '
      + 'önerildi. Alan gelene kadar kontrol çalıştırılamaz — uydurulmaz.');
    return;
  }
  const gecerli = a.yapilandirmaSemasi.safeParse(f.yapilandirma);
  if (!gecerli.success) {
    yaz('yapilandirma_semasi', 'kaldi',
      'Adaptörün kendi şeması, fikstürdeki GEÇERLİ yapılandırmayı reddetti.');
    return;
  }
  if (!f.gecersizYapilandirma) {
    yaz('yapilandirma_semasi', 'bilinmiyor',
      'Geçerli yapılandırma kabul edildi ama fikstür GEÇERSİZ örnek '
      + 'vermiyor — şemanın gerçekten ayıklayıp ayıklamadığı ölçülemedi.');
    return;
  }
  const gecersiz = a.yapilandirmaSemasi.safeParse(f.gecersizYapilandirma);
  yaz('yapilandirma_semasi', gecersiz.success ? 'kaldi' : 'gecti',
    gecersiz.success
      ? 'Şema, geçersiz yapılandırmayı KABUL etti — şema iş görmüyor.'
      : 'Geçerli yapılandırma kabul, geçersiz yapılandırma reddedildi.');
}

/* 2 — Sır referansları */
async function kontrolSir(a: Adaptor, f: FiksturSeti, yaz: Yazici): Promise<void> {
  /* Bozuk ve eksik referans her adaptörde denetlenir: bu, sır KATMANININ
     kontrolü değil, connector kurulumunun ilk koşuya kadar sessizce
     ertelenmemesinin kontrolüdür. */
  const bozuk = referansDenetle(f.sir.bozukReferans);
  const eksik = await sirVarMi(f.sir.eksikReferans);
  const temelSorun: string[] = [];
  if (bozuk.ok) temelSorun.push('bozuk biçimli referans KABUL edildi');
  if (eksik.durum !== 'yok') {
    temelSorun.push(`karşılığı olmayan referans '${eksik.durum}' döndü, 'yok' bekleniyordu`);
  }
  if (temelSorun.length > 0) {
    yaz('sir_referanslari', 'kaldi', `Referans denetimi: ${temelSorun.join(' · ')}.`);
    return;
  }

  if (!sirlarBeyanEdilmis(a)) {
    const ornek = await sirVarMi(f.sir.gecerliReferans);
    yaz('sir_referanslari', 'uygulanamaz',
      'Adaptör `gerekenSirlar` listesini BEYAN ETMİYOR (sözleşmeye alan '
      + 'önerildi, diff bekliyor); hangi sırların aranacağı makine tarafından '
      + 'bilinemiyor. Referans yolu yine de doğrulandı: bozuk referans '
      + `reddedildi, eksik referans 'yok' döndü, örnek referans '${ornek.durum}'.`);
    return;
  }
  if (a.gerekenSirlar.length === 0) {
    yaz('sir_referanslari', 'uygulanamaz',
      'Adaptör hiç sır gerektirmediğini beyan ediyor (gerekenSirlar boş) — '
      + 'aranacak referans yok.');
    return;
  }
  const eksikler: string[] = [];
  const bilinmeyenler: string[] = [];
  for (const referans of a.gerekenSirlar) {
    const varlik = await sirVarMi(referans);
    if (varlik.durum === 'yok') eksikler.push(`${referans}: ${varlik.sebep}`);
    // 'bilinmiyor' BAŞARISIZLIK DEĞİLDİR: sağlayıcı bağlı değil, sır yok değil.
    else if (varlik.durum === 'bilinmiyor') bilinmeyenler.push(`${referans}: ${varlik.sebep}`);
  }
  if (eksikler.length > 0) {
    /* Bağlı OLMAYAN adaptörde sırrın tanımsız olması KUSUR DEĞİLDİR:
       kimlik bilgisi zaten bekleniyor. Bunu `kaldi` saymak, kurulumu
       henüz yapılmamış bir connector'ı bozuk göstermek olurdu. */
    if (!a.baglanabilir) {
      yaz('sir_referanslari', 'uygulanamaz',
        'Adaptör bağlı değil ve beyan ettiği sırlar henüz tanımlanmamış — '
        + 'bu bekleyen bir kurulum adımıdır, kusur değil. Eksik olanlar: '
        + eksikler.join(' · '));
      return;
    }
    yaz('sir_referanslari', 'kaldi', `Beyan edilen sır bulunamadı — ${eksikler.join(' · ')}`);
    return;
  }
  if (bilinmeyenler.length > 0) {
    yaz('sir_referanslari', 'bilinmiyor',
      'Sağlayıcı bağlı olmadığı için varlık DOĞRULANAMADI (yok DEĞİL) — '
      + bilinmeyenler.join(' · '));
    return;
  }
  yaz('sir_referanslari', 'gecti',
    `Beyan edilen ${a.gerekenSirlar.length} sır referansının hepsi mevcut; `
    + 'bozuk ve eksik referanslar reddedildi.');
}

/* 3 + 4 + 5 + 13 — normalize yolu (hepsi aynı çıktıyı okur) */
type NormalizeCiktisi = { gozlemler: Gozlem[]; hata: string | null };

function normalizeCalistir(a: Adaptor, f: FiksturSeti, satirlar: unknown[]): NormalizeCiktisi {
  try {
    return { gozlemler: a.normalize(satirlar, baglamKur(f)) ?? [], hata: null };
  } catch (e) {
    return { gozlemler: [], hata: mesaj(e) };
  }
}

function kontrolAyristirici(a: Adaptor, f: FiksturSeti, c: NormalizeCiktisi, yaz: Yazici): void {
  if (!a.baglanabilir) {
    yaz('payload_ayristirici', 'uygulanamaz',
      bagliDegilGerekce(a, 'normalize() sözleşme gereği boş döner, ayrıştırıcı henüz yazılmadı'));
    return;
  }
  if (c.hata) {
    yaz('payload_ayristirici', 'kaldi', `normalize() fikstürde hata verdi: ${c.hata}`);
    return;
  }
  if (c.gozlemler.length === 0) {
    yaz('payload_ayristirici', 'kaldi',
      `${f.gecerli.satirlar.length} geçerli satır verildi, normalize() hiç gözlem üretmedi.`);
    return;
  }
  /* Bilinmeyen alan bir HATA DEĞİLDİR: kaynak sürüm atlayınca yeni kolon
     gelir. Ayrıştırıcı ne patlamalı ne de o kolonu yok saymalı — ham
     kayıtta durmalı ki denetim izi eksilmesin. */
  const bilinmeyen = normalizeCalistir(a, f, f.bilinmeyenAlan.satirlar);
  if (bilinmeyen.hata) {
    yaz('payload_ayristirici', 'kaldi',
      `Bilinmeyen alan taşıyan satır ayrıştırıcıyı patlattı: ${bilinmeyen.hata}`);
    return;
  }
  if (bilinmeyen.gozlemler.length === 0) {
    yaz('payload_ayristirici', 'kaldi',
      'Bilinmeyen alan taşıyan satır hiç gözlem üretmedi — tanınmayan kolon kaydı düşürmemeli.');
    return;
  }
  const kayipAlanlar: string[] = [];
  for (const g of bilinmeyen.gozlemler) {
    const ham = JSON.stringify(g.ham ?? null);
    for (const alan of f.bilinmeyenAlan.alanlar) {
      if (!ham.includes(alan)) kayipAlanlar.push(alan);
    }
  }
  if (kayipAlanlar.length > 0) {
    yaz('payload_ayristirici', 'kaldi',
      `Tanınmayan alanlar ham kayıttan silindi (denetim izi eksildi): ${[...new Set(kayipAlanlar)].join(', ')}`);
    return;
  }
  yaz('payload_ayristirici', 'gecti',
    `${f.gecerli.satirlar.length} satır → ${c.gozlemler.length} gözlem; `
    + `tanınmayan alanlar (${f.bilinmeyenAlan.alanlar.join(', ')}) ham kayıtta korundu.`);
}

function kontrolNormalizeDogru(a: Adaptor, f: FiksturSeti, c: NormalizeCiktisi, yaz: Yazici): void {
  if (!a.baglanabilir) {
    yaz('normalize_dogru', 'uygulanamaz',
      bagliDegilGerekce(a, 'üretilecek gözlem yok, alan eşlemesi ölçülemez'));
    return;
  }
  if (c.gozlemler.length === 0) {
    yaz('normalize_dogru', 'kaldi', 'Gözlem üretilmedi — alan eşlemesi ölçülemiyor.');
    return;
  }
  const sapmalar: string[] = [];
  f.gecerli.beklenen.forEach((beklenen, i) => {
    const g = c.gozlemler[i] as unknown as Record<string, unknown> | undefined;
    if (!g) { sapmalar.push(`#${i + 1}: gözlem üretilmedi`); return; }
    if (g.tip !== beklenen.tip) sapmalar.push(`#${i + 1}: tip ${String(g.tip)} ≠ ${beklenen.tip}`);
    if (beklenen.kaynakKayitId !== undefined) {
      const kimlik = (g.koken as { kaynakKayitId?: string } | undefined)?.kaynakKayitId;
      if (kimlik !== beklenen.kaynakKayitId) {
        sapmalar.push(`#${i + 1}: kaynakKayitId ${String(kimlik)} ≠ ${beklenen.kaynakKayitId}`);
      }
    }
    for (const [alan, deger] of Object.entries(beklenen.alanlar)) {
      if (g[alan] !== deger) {
        sapmalar.push(`#${i + 1}: ${alan}=${JSON.stringify(g[alan])} ≠ ${JSON.stringify(deger)}`);
      }
    }
  });
  yaz('normalize_dogru', sapmalar.length === 0 ? 'gecti' : 'kaldi',
    sapmalar.length === 0
      ? `${f.gecerli.beklenen.length} gözlemin beklenen alanları birebir eşleşti.`
      : `Beklenen alanlardan sapma: ${sapmalar.slice(0, 8).join(' · ')}`);
}

function kontrolBilinmeyen(a: Adaptor, f: FiksturSeti, yaz: Yazici): void {
  if (!a.baglanabilir) {
    yaz('bilinmeyen_yanlis_degil', 'uygulanamaz',
      bagliDegilGerekce(a, 'kısmî kayıt normalize edilmiyor, alanların hâli ölçülemez'));
    return;
  }
  const c = normalizeCalistir(a, f, f.kismi.satirlar);
  if (c.hata) {
    yaz('bilinmeyen_yanlis_degil', 'kaldi', `Kısmî kayıt normalize edilirken hata: ${c.hata}`);
    return;
  }
  if (c.gozlemler.length === 0) {
    yaz('bilinmeyen_yanlis_degil', 'kaldi',
      'Kısmî kayıt hiç gözlem üretmedi — eksik alan kaydı DÜŞÜRMEMELİ.');
    return;
  }
  const ihlaller: string[] = [];
  for (const [i, g] of c.gozlemler.entries()) {
    const nesne = g as unknown as Record<string, unknown>;
    for (const alan of f.kismi.bosAlanlar) {
      const deger = nesne[alan];
      if (!bilinmiyorMu(deger)) {
        // false/0/'' ölçülmüş bir değer gibi görünür; bilinmeyeni yalana çevirir.
        ihlaller.push(`#${i + 1}: ${alan}=${JSON.stringify(deger)} (null olmalıydı)`);
      }
    }
    const guven = (nesne.koken as { guven?: unknown } | undefined)?.guven;
    if (guven !== null && guven !== undefined && typeof guven !== 'number') {
      ihlaller.push(`#${i + 1}: koken.guven=${JSON.stringify(guven)} (null ya da 0–1 olmalı)`);
    }
    if (guven === 0) {
      ihlaller.push(`#${i + 1}: koken.guven=0 — ölçülmediyse null olmalı, sıfır güven başka şeydir`);
    }
  }
  yaz('bilinmeyen_yanlis_degil', ihlaller.length === 0 ? 'gecti' : 'kaldi',
    ihlaller.length === 0
      ? `Kaynağın vermediği ${f.kismi.bosAlanlar.length} alan null kaldı; false/0/boş metne çevrilmedi.`
      : ihlaller.join(' · '));
}

function kontrolKoken(a: Adaptor, c: NormalizeCiktisi, yaz: Yazici): void {
  if (!a.baglanabilir) {
    yaz('koken_eksiksiz', 'uygulanamaz',
      bagliDegilGerekce(a, 'gözlem üretilmiyor, köken alanları ölçülemez'));
    return;
  }
  if (c.gozlemler.length === 0) {
    yaz('koken_eksiksiz', 'kaldi', 'Gözlem üretilmedi — köken ölçülemiyor.');
    return;
  }
  const eksikler: string[] = [];
  for (const [i, g] of c.gozlemler.entries()) {
    const k = g.koken;
    if (!k) { eksikler.push(`#${i + 1}: köken yok`); continue; }
    if (!k.kaynakSistem?.trim()) eksikler.push(`#${i + 1}: kaynakSistem boş`);
    if (!k.kaynakKayitId?.trim()) eksikler.push(`#${i + 1}: kaynakKayitId boş`);
    if (!(k.toplanma instanceof Date) || Number.isNaN(k.toplanma.getTime())) {
      eksikler.push(`#${i + 1}: toplanma geçerli bir tarih değil`);
    }
    if (k.guven !== null && (typeof k.guven !== 'number' || k.guven < 0 || k.guven > 1)) {
      eksikler.push(`#${i + 1}: guven null ya da 0–1 olmalı (${String(k.guven)})`);
    }
  }
  yaz('koken_eksiksiz', eksikler.length === 0 ? 'gecti' : 'kaldi',
    eksikler.length === 0
      ? `${c.gozlemler.length} gözlemin hepsinde kaynakSistem, kaynakKayitId, `
        + 'toplanma dolu; guven null (ölçülmedi) ya da 0–1 aralığında.'
      : eksikler.slice(0, 8).join(' · '));
}

/* 6 — Yinelenen tespiti */
async function kontrolYinelenen(
  a: Adaptor, f: FiksturSeti, ortam: SertifikaOrtami, yaz: Yazici,
): Promise<void> {
  if (!a.baglanabilir) {
    yaz('yinelenen_tespiti', 'uygulanamaz',
      bagliDegilGerekce(a, 'kaynak kayıt kimliği üretilmiyor, yineleme ölçülemez'));
    return;
  }
  const c = normalizeCalistir(a, f, f.yinelenen.satirlar);
  if (c.hata || c.gozlemler.length < 2) {
    yaz('yinelenen_tespiti', 'kaldi',
      c.hata ?? `Yinelenen fikstürü ${c.gozlemler.length} gözlem üretti, en az 2 bekleniyordu.`);
    return;
  }
  const kimlikler = c.gozlemler.map((g) => g.koken?.kaynakKayitId ?? '');
  const ilk = kimlikler[0];
  if (!ilk || !kimlikler.every((k) => k === ilk)) {
    yaz('yinelenen_tespiti', 'kaldi',
      'Aynı kaynak kaydı farklı kimlikler üretti — idempotency anahtarı '
      + `kararsız: ${kimlikler.join(' , ')}`);
    return;
  }
  // Ayırt etme yeteneği: farklı kayıtlar aynı kimliğe çökmemeli.
  const ayrik = normalizeCalistir(a, f, f.gecerli.satirlar);
  const ayrikKimlikler = new Set(ayrik.gozlemler.map((g) => g.koken?.kaynakKayitId));
  if (ayrik.gozlemler.length > 1 && ayrikKimlikler.size !== ayrik.gozlemler.length) {
    yaz('yinelenen_tespiti', 'kaldi',
      'Farklı kayıtlar aynı kaynak kayıt kimliğine çöktü — yineleme yanlış '
      + 'pozitif üretir ve gerçek kayıtlar birbirini ezer.');
    return;
  }
  const kosucu = ortam.kosucu;
  if (!kosucu || !f.kosum || !f.disBaglantiGerekmez) {
    yaz('yinelenen_tespiti', 'gecti',
      `Aynı kayıt kararlı tek kimlik üretti (${ilk}); farklı kayıtlar ayrıştı. `
      + 'Çekirdek sayacı ölçülmedi (sandbox koşucusu verilmedi).');
    return;
  }
  const sonuc = await kosucu.kos({ yapilandirma: f.kosum.yinelenen, oturum: 'yinelenen' });
  const tekKayit = sonuc.kesifKayitlari.length === 1;
  yaz('yinelenen_tespiti', tekKayit ? 'gecti' : 'kaldi',
    tekKayit
      ? `Kararlı kimlik (${ilk}); aynı kayıt iki kez geldi, çekirdek tek keşif `
        + `satırı yazdı (alınan ${sonuc.alinan}, kabul ${sonuc.kabulEdilen}).`
      : `Aynı kayıt iki kez geldi ama ${sonuc.kesifKayitlari.length} keşif satırı yazıldı.`);
}

/* 7 — Idempotency (çekirdek koşusu gerekir) */
async function kontrolIdempotency(
  a: Adaptor, f: FiksturSeti, ortam: SertifikaOrtami, yaz: Yazici,
): Promise<void> {
  const kosucu = ortam.kosucu;
  if (!a.baglanabilir) {
    yaz('idempotency', 'uygulanamaz',
      bagliDegilGerekce(a, 'çekirdek koşuyu başlatmaz (kimlik_bekleniyor), yazılan kayıt olmaz'));
    return;
  }
  if (!f.disBaglantiGerekmez) {
    yaz('idempotency', 'uygulanamaz',
      'Fikstür dış bağlantı gerektiriyor — sertifikasyon gerçek sisteme bağlanmaz.');
    return;
  }
  if (!kosucu || !f.kosum) {
    yaz('idempotency', 'uygulanamaz',
      'Sandbox koşucusu ya da koşum fikstürü verilmedi; çekirdek koşusu olmadan '
      + 'idempotency ölçülemez.');
    return;
  }
  const ilk = await kosucu.kos({ yapilandirma: f.kosum.gecerli, oturum: 'idempotency' });
  const ikinci = await kosucu.kos({ yapilandirma: f.kosum.gecerli, oturum: 'idempotency' });
  if (ilk.durum !== 'basarili' || ikinci.durum !== 'basarili') {
    yaz('idempotency', 'kaldi',
      `Koşular başarılı kapanmadı (${ilk.durum} → ${ikinci.durum}): ${ikinci.hata ?? ''}`);
    return;
  }
  const ayniSayi = ilk.kesifKayitlari.length === ikinci.kesifKayitlari.length;
  const hepsiYinelenen = ikinci.yinelenen === ikinci.kabulEdilen && ikinci.kabulEdilen > 0;
  yaz('idempotency', ayniSayi && hepsiYinelenen ? 'gecti' : 'kaldi',
    ayniSayi && hepsiYinelenen
      ? `Aynı fikstür iki kez koştu: ${ilk.kesifKayitlari.length} kayıt sabit kaldı, `
        + `ikinci koşuda ${ikinci.yinelenen}/${ikinci.kabulEdilen} yinelenen sayıldı.`
      : `İlk koşu ${ilk.kesifKayitlari.length} kayıt, ikinci koşu `
        + `${ikinci.kesifKayitlari.length} kayıt; ikinci koşuda yinelenen `
        + `${ikinci.yinelenen}/${ikinci.kabulEdilen}.`);
}

/* 8 — Santral kapsamı */
async function kontrolKapsam(
  a: Adaptor, f: FiksturSeti, ortam: SertifikaOrtami, yaz: Yazici,
): Promise<void> {
  const kosucu = ortam.kosucu;
  if (!a.baglanabilir) {
    yaz('santral_kapsami', 'uygulanamaz',
      bagliDegilGerekce(a, 'kayıt yazılmadığı için kapsam denetimi hiç çalışmaz'));
    return;
  }

  /* Platformda TANIMSIZ bir santral kodu bildiren kayıt düşürülmez ve kodu
     silinmez: kapsam kararı çekirdeğindir, ama karar verebilmesi için
     beyanın adaptörden kayıpsız geçmesi gerekir. */
  const eksik = normalizeCalistir(a, f, f.eksikReferans.satirlar);
  if (eksik.hata || eksik.gozlemler.length !== f.eksikReferans.satirlar.length) {
    yaz('santral_kapsami', 'kaldi',
      'Referansı tanımsız kayıt normalize aşamasında düştü: '
      + (eksik.hata ?? `${f.eksikReferans.satirlar.length} satır → ${eksik.gozlemler.length} gözlem`));
    return;
  }
  const korunmayan = eksik.gozlemler.filter((g) =>
    bilinmiyorMu((g as unknown as Record<string, unknown>)[f.eksikReferans.korunanAlan]));
  if (korunmayan.length > 0) {
    yaz('santral_kapsami', 'kaldi',
      `Tanımsız referans '${f.eksikReferans.korunanAlan}' alanından silindi `
      + `(${korunmayan.length} kayıt) — kapsam denetimi kör kalır.`);
    return;
  }
  if (!f.disBaglantiGerekmez) {
    yaz('santral_kapsami', 'uygulanamaz',
      'Fikstür dış bağlantı gerektiriyor — sertifikasyon gerçek sisteme bağlanmaz.');
    return;
  }
  if (!kosucu || !f.kosum) {
    yaz('santral_kapsami', 'uygulanamaz',
      'Sandbox koşucusu ya da koşum fikstürü verilmedi; kapsam çekirdekte '
      + 'uygulandığı için koşusuz ölçülemez.');
    return;
  }
  const k = f.kosum.kapsam;
  const sonuc = await kosucu.kos({
    yapilandirma: k.yapilandirma, kapsamKodlari: k.kapsamKodlari, oturum: 'kapsam',
  });
  const disKayit = sonuc.kesifKayitlari.some((r) => r.tesisKodu === k.disKod);
  const kapsamRedVar = sonuc.reddedilen > 0
    && `${sonuc.hata ?? ''} ${sonuc.ayrinti}`.includes('kapsam dışı');
  const icKayit = sonuc.kesifKayitlari.some((r) => r.tesisKodu === k.icKod);
  const sorunlar: string[] = [];
  if (disKayit) sorunlar.push(`kapsam dışı santral (${k.disKod}) adına kayıt YAZILDI`);
  if (!kapsamRedVar) sorunlar.push('kapsam dışı kayıt reddedilmedi ya da sebebi koşuya yazılmadı');
  if (!icKayit) sorunlar.push(`kapsam içi santral (${k.icKod}) kaydı yazılmadı`);
  yaz('santral_kapsami', sorunlar.length === 0 ? 'gecti' : 'kaldi',
    sorunlar.length === 0
      ? `Kapsam ${k.kapsamKodlari.join(', ')} ile sınırlıyken ${k.icKod} kaydı yazıldı, `
        + `${k.disKod} kaydı reddedildi (sebep koşu kaydında); tanımsız santral `
        + 'kodu bildiren kayıt düşürülmedi, kodu korundu.'
      : sorunlar.join(' · '));
}

/* 9 — Bozuk payload reddi (+ dead-letter) */
async function kontrolBozuk(
  a: Adaptor, f: FiksturSeti, ortam: SertifikaOrtami, yaz: Yazici,
): Promise<void> {
  if (!a.baglanabilir) {
    yaz('bozuk_reddi', 'uygulanamaz',
      bagliDegilGerekce(a, 'payload hiç ayrıştırılmıyor, reddetme yolu yok'));
    return;
  }
  const sorunlar: string[] = [];
  for (const [i, satir] of f.bozuk.satirlar.entries()) {
    const c = normalizeCalistir(a, f, [satir]);
    if (c.hata) continue;                       // açık hata = sessiz değil
    const d = a.validate(c.gozlemler);
    if (d.gecerli.length > 0) {
      sorunlar.push(`#${i + 1}: bozuk satır GEÇERLİ sayıldı`);
      continue;
    }
    if (c.gozlemler.length === 0) {
      // Adaptör satırı normalize aşamasında düşürdü: sebep bildirmedi.
      sorunlar.push(`#${i + 1}: normalize sessizce düşürdü (ret sebebi üretilmedi)`);
      continue;
    }
    if (d.reddedilen.length === 0 || d.reddedilen.some((r) => !r.sebep?.trim())) {
      sorunlar.push(`#${i + 1}: reddedildi ama sebep yazılmadı`);
    }
  }
  if (sorunlar.length > 0) {
    yaz('bozuk_reddi', 'kaldi', sorunlar.join(' · '));
    return;
  }
  const temel = `${f.bozuk.satirlar.length} bozuk satırın hepsi sebebiyle reddedildi (${f.bozuk.not}).`;

  const kosucu = ortam.kosucu;
  if (!kosucu || !f.kosum || !f.disBaglantiGerekmez) {
    yaz('bozuk_reddi', 'gecti', `${temel} Dead-letter yazımı ölçülmedi (sandbox koşucusu yok).`);
    return;
  }
  if (f.bozukKaynak) {
    const kaynak = await kosucu.kos({
      yapilandirma: f.bozukKaynak.yapilandirma, oturum: 'bozuk-kaynak',
    });
    /* Kaynağın tamamı okunamıyorsa koşu SESSİZ GEÇMEZ: boş sonuç "kaynakta
       kayıt yok" demektir ve bu onunla karıştırılamaz. */
    if (kaynak.durum !== 'basarisiz') {
      yaz('bozuk_reddi', 'kaldi',
        `Kaynak düzeyinde bozuk içerik (${f.bozukKaynak.not}) koşuyu `
        + `'${kaynak.durum}' kapattı — bozuk kaynak boş kaynakla karıştırıldı.`);
      return;
    }
  }
  const sonuc = await kosucu.kos({ yapilandirma: f.kosum.karisik, oturum: 'bozuk' });
  if (sonuc.reddedilen === 0) {
    yaz('bozuk_reddi', 'kaldi',
      `${temel} Ama çekirdek koşusunda reddedilen sayacı 0 kaldı — kayıt sessizce düştü.`);
    return;
  }
  if (sonuc.reddedilenKayitlar === null) {
    yaz('bozuk_reddi', 'bilinmiyor',
      `${temel} Çekirdek ${sonuc.reddedilen} kaydı reddetti ama ReddedilenKayit `
      + 'tablosu bu kurulumda okunamadı — dead-letter durumu BİLİNMİYOR.');
    return;
  }
  if (sonuc.reddedilenKayitlar.length === 0) {
    /* Sayaç ve koşu özeti reddi gösteriyor ama kaydın kendisi yok: bu bir
       KUSUR DEĞİL, henüz uygulanmamış bir yol. Dead-letter yazımı çekirdek
       sahibinin işi; harness onu "geçti" saymaz, "kaldı" da demez. */
    yaz('bozuk_reddi', 'bilinmiyor',
      `${temel} Çekirdek ${sonuc.reddedilen} kaydı reddetti ve sebebi koşu `
      + 'kaydında görünüyor, ama ReddedilenKayit (dead-letter) satırı '
      + 'yazılmadı — çekirdekte bu yazım HENÜZ UYGULANMADI.');
    return;
  }
  const sebepsiz = sonuc.reddedilenKayitlar.filter((r) => !r.sebep?.trim()).length;
  yaz('bozuk_reddi', sebepsiz === 0 ? 'gecti' : 'kaldi',
    sebepsiz === 0
      ? `${temel} Çekirdek ${sonuc.reddedilen} kaydı reddetti ve `
        + `${sonuc.reddedilenKayitlar.length} dead-letter satırı yazdı.`
      : `${sebepsiz} dead-letter satırı sebepsiz yazıldı.`);
}

/* 10 — Kısmî başarısızlık denetime düşüyor mu */
async function kontrolKismi(
  a: Adaptor, f: FiksturSeti, ortam: SertifikaOrtami, yaz: Yazici,
): Promise<void> {
  const kosucu = ortam.kosucu;
  if (!a.baglanabilir) {
    yaz('kismi_basarisizlik', 'uygulanamaz',
      bagliDegilGerekce(a, 'koşu kimlik_bekleniyor ile kapanır; kısmî başarı diye bir hâli yok'));
    return;
  }
  if (!f.disBaglantiGerekmez) {
    yaz('kismi_basarisizlik', 'uygulanamaz',
      'Fikstür dış bağlantı gerektiriyor — sertifikasyon gerçek sisteme bağlanmaz.');
    return;
  }
  if (!kosucu || !f.kosum) {
    yaz('kismi_basarisizlik', 'uygulanamaz',
      'Sandbox koşucusu ya da koşum fikstürü verilmedi; denetim izi koşusuz ölçülemez.');
    return;
  }
  const sonuc = await kosucu.kos({ yapilandirma: f.kosum.karisik, oturum: 'kismi' });
  const sorunlar: string[] = [];
  if (sonuc.kabulEdilen === 0) sorunlar.push('geçerli kayıtlar da yazılmadı — kısmî değil tam kayıp');
  if (sonuc.reddedilen === 0) sorunlar.push('reddedilen kayıt sayaca girmedi');
  if (sonuc.alinan !== sonuc.kabulEdilen + sonuc.reddedilen) {
    sorunlar.push(`sayaç sözleşmesi bozuk: alınan ${sonuc.alinan} ≠ `
      + `kabul ${sonuc.kabulEdilen} + red ${sonuc.reddedilen}`);
  }
  const iz = `${sonuc.hata ?? ''} ${sonuc.ayrinti}`.trim();
  if (!iz || !/redded/i.test(iz)) sorunlar.push('ret sebebi koşu kaydında görünmüyor');
  if (sonuc.kosuAcikKaldi) sorunlar.push("koşu satırı 'calisiyor' kaldı");
  yaz('kismi_basarisizlik', sorunlar.length === 0 ? 'gecti' : 'kaldi',
    sorunlar.length === 0
      ? `Karışık yükte ${sonuc.kabulEdilen} kayıt kabul, ${sonuc.reddedilen} kayıt `
        + 'reddedildi; sebep koşu kaydına yazıldı ve koşu kapandı.'
      : sorunlar.join(' · '));
}

/* 11 — Retry / geri çekilme */
async function kontrolRetry(
  a: Adaptor, f: FiksturSeti, ortam: SertifikaOrtami, yaz: Yazici,
): Promise<void> {
  const kosucu = ortam.kosucu;
  if (!a.baglanabilir) {
    yaz('retry_backoff', 'uygulanamaz',
      bagliDegilGerekce(a, 'çekim yolu hiç koşulmaz, tekrar deneme davranışı oluşmaz'));
    return;
  }
  if (!f.disBaglantiGerekmez) {
    yaz('retry_backoff', 'uygulanamaz',
      'Fikstür dış bağlantı gerektiriyor — sertifikasyon gerçek sisteme bağlanmaz.');
    return;
  }
  if (!kosucu || !f.kosum) {
    yaz('retry_backoff', 'uygulanamaz',
      'Sandbox koşucusu ya da koşum fikstürü verilmedi; tekrar deneme çekirdekte '
      + 'yaşadığı için koşusuz ölçülemez.');
    return;
  }
  const gecici = await kosucu.kos({
    yapilandirma: f.kosum.gecerli, oturum: 'retry-gecici', geciciHata: 2,
  });
  const kalici = await kosucu.kos({
    yapilandirma: f.kosum.gecerli, oturum: 'retry-kalici', kaliciHata: true,
  });
  /* Adaptörün KENDİ kalıcı hatası: kaynak okunamıyor. Vekil enjeksiyonu
     değil, gerçek adaptör hatası — yutulmadan çekirdeğe ulaşmalı. */
  const kaynakYok = await kosucu.kos({
    yapilandirma: f.kosum.okunamayan, oturum: 'retry-kaynak',
  });

  const sorunlar: string[] = [];
  if (gecici.durum !== 'basarili') sorunlar.push(`geçici hata sonrası koşu ${gecici.durum} kapandı`);
  if (gecici.denemeNo !== 3) sorunlar.push(`geçici hatada denemeNo ${gecici.denemeNo}, 3 bekleniyordu`);
  if (gecici.beklemeler.join(',') !== '1000,4000') {
    sorunlar.push(`geri çekilme ${JSON.stringify(gecici.beklemeler)}, [1000,4000] bekleniyordu`);
  }
  if (kalici.denemeNo !== 1) sorunlar.push(`kalıcı hatada denemeNo ${kalici.denemeNo}, 1 bekleniyordu`);
  if (kalici.beklemeler.length !== 0) sorunlar.push('kalıcı hatada geri çekilme beklendi');
  if (kalici.durum !== 'basarisiz') sorunlar.push(`kalıcı hata koşusu ${kalici.durum} kapandı`);
  if (kaynakYok.durum !== 'basarisiz') {
    sorunlar.push(`okunamayan kaynak koşusu ${kaynakYok.durum} kapandı — hata yutuldu`);
  }
  if (kaynakYok.denemeNo !== 1) {
    sorunlar.push(`okunamayan kaynak ${kaynakYok.denemeNo} kez denendi — kalıcı hata tekrar denenmemeli`);
  }
  if (kaynakYok.imlecSonra !== null) sorunlar.push('başarısız koşuda imleç ilerledi');
  yaz('retry_backoff', sorunlar.length === 0 ? 'gecti' : 'kaldi',
    sorunlar.length === 0
      ? 'Geçici hata 3 denemede 1s/4s geri çekilmeyle toparlandı; kalıcı hata '
        + 'tekrar denenmedi; adaptörün kendi okuma hatası yutulmadan başarısız '
        + 'kapandı ve imleç ilerlemedi.'
      : sorunlar.join(' · '));
}

/* 12 — Bayat connector */
async function kontrolBayat(
  a: Adaptor, f: FiksturSeti, ortam: SertifikaOrtami, yaz: Yazici,
): Promise<void> {
  const parcalar: string[] = [];
  const sorunlar: string[] = [];
  let olculdu = false;

  const kosucu = ortam.kosucu;
  if (kosucu?.bayatKosu && f.disBaglantiGerekmez && a.baglanabilir) {
    const b = await kosucu.bayatKosu();
    if (b.kapanan < 1) sorunlar.push('bayat koşu süpürücüsü hiçbir satır kapatmadı');
    else if (b.durum === 'calisiyor') sorunlar.push("bayat koşu hâlâ 'calisiyor'");
    else if (!b.hata?.includes('yarıda kaldı')) sorunlar.push('bayat koşu sebebi kayda yazılmadı');
    else {
      olculdu = true;
      parcalar.push(`ölmüş süreç koşusu '${b.durum}' olarak kapatıldı ve sebebi yazıldı`);
    }
  } else {
    parcalar.push('koşu düzeyi bayatlık ölçülmedi (sandbox koşucusu ya da bağlanabilir adaptör yok)');
  }

  if (!f.bayat) {
    parcalar.push('bayat veri fikstürü verilmedi');
  } else if (!f.disBaglantiGerekmez || !a.baglanabilir) {
    parcalar.push('bayat veri tazeliği ölçülemedi (adaptör bağlı değil ya da dış bağlantı gerekiyor)');
  } else {
    const saglik = await a.health(baglamKur(f, f.bayat.yapilandirma));
    const t = saglik.tazelikDk;
    if (t === null || t === undefined) {
      // null = ÖLÇÜLEMEDİ; kusur değil ama "taze" de denmemeli.
      if (saglik.durum === 'saglikli') {
        /* null = ÖLÇÜLEMEDİ. Kusur değil, ama "taze" de denmedi; ayrımı
           koruyan adaptör doğru davranıyor, ölçüm yine de yapılamadı. */
        parcalar.push('kaynak tazeliği ölçülemedi (tazelikDk=null) — bayatlık raporlanamaz');
      } else {
        olculdu = true;
        parcalar.push(`bayat kaynakta sağlık '${saglik.durum}' bildirildi`);
      }
    } else if (t < f.bayat.enAzDk) {
      sorunlar.push(`bayat kaynak ${t} dk yaşında raporlandı, en az ${f.bayat.enAzDk} dk bekleniyordu`);
    } else {
      olculdu = true;
      parcalar.push(`bayat kaynak ${t} dk yaşında raporlandı (0 ya da 'taze' denmedi)`);
    }
  }

  if (sorunlar.length > 0) { yaz('bayat_connector', 'kaldi', sorunlar.join(' · ')); return; }
  yaz('bayat_connector', olculdu ? 'gecti' : 'uygulanamaz', parcalar.join(' · ') + '.');
}

/* 14 — Kuru koşu */
async function kontrolKuruKosu(
  f: FiksturSeti, ortam: SertifikaOrtami, yaz: Yazici,
): Promise<void> {
  const kuru = ortam.kuruKosucu;
  if (!kuru) {
    /* Kuru koşu başka bir ajanın işi. Yokken "geçti" demek sahte başarı,
       "kaldı" demek yazılmamış bir şeyi kusur saymak olurdu. */
    yaz('kuru_kosu', 'uygulanamaz',
      'Kuru koşu (dry-run) bu ağaçta HENÜZ UYGULANMADI: EntegrasyonKosusu.kuruKosu '
      + 'kolonu şemada var ama çekirdekte yazan kod yok ve harness\'a kuru koşucu '
      + 'verilmedi. Uygulandığında `kuruKosucu` takılınca bu kontrol kendiliğinden koşar.');
    return;
  }
  if (!f.kosum) {
    yaz('kuru_kosu', 'uygulanamaz', 'Koşum fikstürü yok — kuru koşu denenemedi.');
    return;
  }
  const sonuc = await kuru.kos({ yapilandirma: f.kosum.gecerli, oturum: 'kuru' });
  if (!sonuc.destekli) {
    /* Kolon ve seçenek şemada duruyor olabilir; koşan kod yoksa kontrol
       UYGULANAMAZ'dır. "Geçti" demek uydurmak olurdu. */
    yaz('kuru_kosu', 'uygulanamaz',
      `Kuru koşu çekirdekte henüz uygulanmadı: ${sonuc.not}`);
    return;
  }
  const sorunlar: string[] = [];
  if (sonuc.yazilanKayit !== 0) sorunlar.push(`kuru koşu ${sonuc.yazilanKayit} kayıt YAZDI`);
  if (sonuc.olacakKayit <= 0) sorunlar.push('kuru koşu "olsaydı ne olurdu" sayacı üretmedi');
  yaz('kuru_kosu', sorunlar.length === 0 ? 'gecti' : 'kaldi',
    sorunlar.length === 0
      ? `Kuru koşu hiçbir kayıt yazmadan ${sonuc.olacakKayit} kaydın yazılacağını bildirdi.`
      : sorunlar.join(' · '));
}

/* ═══ Koşucu ══════════════════════════════════════════════════════════ */

/**
 * Bir adaptörü ortak sözleşme kontrollerinden geçirir.
 *
 * Hiçbir kontrol atlanmaz: uygulanamayan kontrol de raporda GEREKÇESİYLE
 * durur. Rapor "geçerli" ise adaptör sözleşmeyi ihlal etmiyor demektir —
 * "bağlı ve çalışıyor" demek DEĞİLDİR.
 */
/* ── OT-50 · Bağlantı ihtiyacı kontrolü ─────────────────────────────────

   Bağlanmamış bir adaptörün en değerli çıktısı ÇALIŞAN KODU değil,
   "kurumdan ne isteyeceğiz" listesidir. O liste bir paragrafta kaldığı
   sürece ne kontrol listesine dönüşür ne de denetlenebilir. Bu kontrol
   üç şeyi arar:

     1. Liste BOŞ DEĞİL — bağlanmamış bir adaptörün hiçbir şeye ihtiyacı
        olmaması mümkün değildir; boş liste bir beyan değil, bir unutmadır.
     2. Kod TEKİL — aynı kodun iki kalemi listeyi sessizce çakıştırır.
     3. SIR kalemi varsa `gerekenSirlar` da BOŞ DEĞİL — "bir sır lazım"
        deyip hangi referansın aranacağını söylememek, sağlık ekranının
        sır varlığını hiç sorgulayamaması demektir.

   Bağlı adaptörde kontrol `uygulanamaz`dır: bağlıysa istenecek bir şey
   kalmamıştır ve boş listesi doğru davranıştır. */
function kontrolIhtiyac(a: Adaptor, yaz: Yazici): void {
  const liste = (a as Adaptor & { ihtiyaclar?: unknown }).ihtiyaclar;
  if (a.baglanabilir) {
    yaz('baglanti_ihtiyaci', 'uygulanamaz',
      'Adaptör bağlı — kurumdan istenecek bağlantı bilgisi yok.');
    return;
  }
  if (!Array.isArray(liste)) {
    yaz('baglanti_ihtiyaci', 'kaldi',
      'Bağlanmamış adaptör `ihtiyaclar` listesini beyan etmiyor; bağlantı günü '
      + 'kontrol listesi üretilemez.');
    return;
  }
  const kalemler = liste as { kod?: unknown; sir?: unknown }[];
  if (kalemler.length === 0) {
    yaz('baglanti_ihtiyaci', 'kaldi',
      'İhtiyaç listesi BOŞ. Bağlanmamış bir adaptörün hiçbir şeye ihtiyacı '
      + 'olmaması mümkün değildir; boş liste bir beyan değil bir unutmadır.');
    return;
  }
  const kodlar = kalemler.map((k) => String(k.kod ?? ''));
  const yinelenen = kodlar.filter((k, i) => kodlar.indexOf(k) !== i);
  if (yinelenen.length > 0) {
    yaz('baglanti_ihtiyaci', 'kaldi',
      `İhtiyaç kodu yinelenmiş: ${[...new Set(yinelenen)].join(', ')}.`);
    return;
  }
  const sirliVar = kalemler.some((k) => k.sir === true);
  if (sirliVar && (!Array.isArray(a.gerekenSirlar) || a.gerekenSirlar.length === 0)) {
    yaz('baglanti_ihtiyaci', 'kaldi',
      'Listede SIR kalemi var ama `gerekenSirlar` boş: hangi referansın '
      + 'aranacağı makine tarafından bilinemez, sağlık ekranı sır varlığını '
      + 'sorgulayamaz.');
    return;
  }
  yaz('baglanti_ihtiyaci', 'gecti',
    `${kalemler.length} kalem beyan edildi${sirliVar
      ? `; sır kalemi var ve ${a.gerekenSirlar.length} referans bildirilmiş.`
      : '; sır gerektiren kalem yok.'}`);
}

export async function sertifikaKos(
  adaptor: Adaptor,
  ortam: SertifikaOrtami,
): Promise<SertifikaRaporu> {
  const f = ortam.fikstur;
  if (f.tip !== adaptor.tip) {
    throw new Error(
      `Sertifikasyon fikstürü uyuşmuyor: adaptör '${adaptor.tip}', fikstür '${f.tip}'`,
    );
  }
  const kontroller = new Map<KontrolKodu, KontrolSonucu>();
  const yaz: Yazici = (kod, durum, gerekce) => {
    kontroller.set(kod, { kod, baslik: KONTROL_BASLIKLARI[kod], durum, gerekce });
  };

  const gecerliCikti = adaptor.baglanabilir
    ? normalizeCalistir(adaptor, f, f.gecerli.satirlar)
    : { gozlemler: [], hata: null };

  kontrolSema(adaptor, f, yaz);
  await kontrolSir(adaptor, f, yaz);
  kontrolAyristirici(adaptor, f, gecerliCikti, yaz);
  kontrolNormalizeDogru(adaptor, f, gecerliCikti, yaz);
  kontrolBilinmeyen(adaptor, f, yaz);
  await kontrolYinelenen(adaptor, f, ortam, yaz);
  await kontrolIdempotency(adaptor, f, ortam, yaz);
  await kontrolKapsam(adaptor, f, ortam, yaz);
  await kontrolBozuk(adaptor, f, ortam, yaz);
  await kontrolKismi(adaptor, f, ortam, yaz);
  await kontrolRetry(adaptor, f, ortam, yaz);
  await kontrolBayat(adaptor, f, ortam, yaz);
  kontrolKoken(adaptor, gecerliCikti, yaz);
  await kontrolKuruKosu(f, ortam, yaz);
  kontrolIhtiyac(adaptor, yaz);

  const sirali = KONTROL_KODLARI.map((kod) => {
    const s = kontroller.get(kod);
    if (!s) {
      /* Bir kontrol hiç yazılmadıysa bu bir harness kusurudur ve sessiz
         geçilmez: 'bilinmiyor' olarak görünür. */
      return {
        kod, baslik: KONTROL_BASLIKLARI[kod], durum: 'bilinmiyor' as const,
        gerekce: 'Kontrol koşmadı — harness bu kod için sonuç yazmadı.',
      };
    }
    return s;
  });

  const ozet: Record<KontrolDurumu, number> = { gecti: 0, kaldi: 0, uygulanamaz: 0, bilinmiyor: 0 };
  for (const k of sirali) ozet[k.durum] += 1;

  return {
    tip: adaptor.tip,
    baglanabilir: adaptor.baglanabilir,
    kontroller: sirali,
    ozet,
    // `uygulanamaz` ve `bilinmiyor` kusur değildir; yalnız `kaldi` sertifikayı düşürür.
    gecerli: ozet.kaldi === 0,
  };
}

/* ═══ Rapor biçimlendirme ═════════════════════════════════════════════ */

const SIMGE: Record<KontrolDurumu, string> = {
  gecti: 'G', kaldi: 'K', uygulanamaz: '—', bilinmiyor: '?',
};

/** Sekiz adaptörün tek tabloda özeti — denetim raporuna yapıştırılabilir. */
export function raporTablosu(raporlar: SertifikaRaporu[]): string {
  const basliklar = ['kontrol', ...raporlar.map((r) => r.tip)];
  const satirlar = KONTROL_KODLARI.map((kod) => [
    kod,
    ...raporlar.map((r) => SIMGE[r.kontroller.find((k) => k.kod === kod)!.durum]),
  ]);
  const genislik = basliklar.map((b, i) =>
    Math.max(b.length, ...satirlar.map((s) => s[i].length)));
  const cizgi = (h: string[]) => h.map((x, i) => x.padEnd(genislik[i])).join(' | ');
  return [
    cizgi(basliklar),
    genislik.map((g) => '-'.repeat(g)).join('-+-'),
    ...satirlar.map(cizgi),
    '',
    'G = geçti · K = kaldı · — = uygulanamaz · ? = bilinmiyor',
  ].join('\n');
}

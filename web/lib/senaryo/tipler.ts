/* ═══════════════════════════════════════════════════════════════════════
   SENARYO KÜTÜĞÜ — tipler ve eksenler

   ── NEDEN KOD, NEDEN BELGE DEĞİL ──────────────────────────────────────
   Senaryo listesi bir Markdown tablosunda yaşasaydı, yazıldığı gün doğru
   olur ve ertesi gün sessizce yalan söylemeye başlardı. Kütük burada
   yaşar; `docs/MASTER_SCENARIO_REGISTRY.md` ve
   `docs/SCENARIO_TEST_MATRIX.md` ondan ÜRETİLİR ve bir nöbetçi test
   sapmayı ilk koşuda kırmızı yapar.

   ── SENARYO NEDİR ─────────────────────────────────────────────────────
   Bir kullanıcının belirli bir rolde, belirli bir veri hâlinde, belirli
   bir ekranda yaptığı TEK bir iş ve o işin beklenen sonucu. Mutlu yol
   bir senaryodur; yetkisiz deneme, boş liste, çakışan kayıt, süresi
   dolmuş talep ve bağlı olmayan kaynak da AYRI senaryolardır.

   ── TESTE NASIL BAĞLANIR ──────────────────────────────────────────────
   Senaryo kimliği testin BAŞLIĞINDA köşeli parantez içinde geçer:

     it('kapsam dışı varlığa yazılamaz [ENV-VAR-012]', …)

   Araç `tests/` altını bu kimlik için tarar. Bulamazsa o satır GAP'tir.
   Bağı ayrı bir eşleme tablosunda tutmak, tablonun testten ayrışmasına
   izin verirdi: burada bağ testin kendi metnidir. */

/** Testin hangi katmanda koştuğu. */
export const TEST_KATMANLARI = [
  'DOMAIN', 'SERVER', 'API', 'RBAC', 'SCOPE', 'WORKFLOW', 'ENGINE',
  'INTEGRATION', 'UI', 'ACCESSIBILITY', 'RESPONSIVE', 'VISUAL',
  'CONCURRENCY', 'MIGRATION',
] as const;
export type TestKatmani = (typeof TEST_KATMANLARI)[number];

/** Senaryonun sürüklendiği eksen — raporda gruplamak için. */
export const EKSENLER = ['veri', 'yetki', 'akis', 'entegrasyon', 'arayuz'] as const;
export type Eksen = (typeof EKSENLER)[number];

export type Senaryo = {
  /** ALAN-KONU-NNN — kalıcıdır, yeniden kullanılmaz. */
  id: string;
  alan: string;
  /** Ekran rotası; ekransız senaryoda (motor, uç) '—'. */
  rota: string;
  eksen: Eksen;
  /** Kullanıcının amacı — ürün diliyle, tek cümle. */
  amac: string;
  rol: string;
  kapsam: string;
  onkosul: string;
  /** Veri hâli: yok · tek · normal · yüksek · kısmi · bilinmiyor · bayat … */
  veriHali: string;
  eylem: string;
  beklenenSonuc: string;
  beklenenEkran: string;
  /** Denetim izi beklentisi; yazma yoksa 'yazma yok'. */
  beklenenIz: string;
  /** Görev/bildirim beklentisi; yoksa 'yok'. */
  beklenenBildirim: string;
  katmanlar: TestKatmani[];
};

/** Kimlik biçimi: üç harfli alan · konu · üç haneli sıra. */
export const KIMLIK_KALIBI = /^[A-Z]{3}-[A-Z0-9]{2,10}-\d{3}$/;

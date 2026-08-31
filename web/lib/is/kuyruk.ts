import 'server-only';

/* ═══════════════════════════════════════════════════════════════════════
   İŞ KUYRUĞU SOYUTLAMASI

   Bugün tek bir Node süreci var ve işler süreç-içi koşuyor. Yarın işler
   ayrı bir kuyruğa (Redis/BullMQ, Temporal, SQS…) taşınacak. Bu dosya o
   günün bugün YENİDEN MİMARİ gerektirmemesi için var: çağıranlar bir
   sağlayıcı arayüzü görür, hangi sağlayıcının bağlı olduğunu bilmez.

   ── SAHTE BAĞLILIK YASAK ───────────────────────────────────────────────
   `dis` sağlayıcısı KAYITLI ama BAĞLI DEĞİL (`bagli: false`) ve neyin
   gerektiğini söyler. Çağrılırsa açık hata verir; sessizce süreç-içi
   kuyruğa DÜŞMEZ. Sessiz düşme, "dağıtık kuyruğa geçtik" sanılan bir
   kurulumda işlerin hâlâ tek süreçte koştuğunu gizlerdi.

   ── SÜREÇ-İÇİ KUYRUK NEDEN GÜVENLİ ─────────────────────────────────────
   Süreç-içi kuyruk DAYANIKLI DEĞİLDİR: yeniden başlatma bekleyen işleri
   kaybeder. Bu kabul edilebilir, çünkü zamanlayıcı ne koşacağını
   veritabanından TÜRETİR (`zamanlayici.ts`), bir listede saklamaz.
   Kaybolan iş bir sonraki tikte yeniden vadesi gelmiş görünür. Kuyruk
   dayanıklı olsaydı bile bu türetme doğru olurdu; dayanıklı olmadığı için
   ZORUNLUDUR ve `dayanikli` alanı bunu görünür kılar.

   ── EŞZAMANLILIK NEDEN SINIRLI ─────────────────────────────────────────
   SQLite tek yazıcıdır; sınırsız eşzamanlılık kilit zaman aşımına döner.
   Sınır burada tek yerde durur ve PostgreSQL'e geçişte tek satır değişir.
   ═══════════════════════════════════════════════════════════════════════ */

export type IsTuru = 'motor' | 'connector' | 'bakim';

export type IsTalebi = {
  /** Kuyruk içinde tekilleştirme anahtarı: aynı anahtar sırada iki kez
      beklemez. Kilit değildir — kilit `lib/is/kilit.ts` işidir; bu yalnız
      kuyruğun kendi kendini şişirmesini engeller. */
  anahtar: string;
  tur: IsTuru;
  hedef: string;
};

export type IsSonucu = { anahtar: string; ok: boolean; hata: string | null; sureMs: number };

export interface KuyrukSaglayici {
  readonly ad: string;
  readonly bagli: boolean;
  /** Bağlı değilse: bağlanmak için ne gerekiyor. */
  readonly gereken?: string;
  /** Yeniden başlatmada bekleyen iş hayatta kalır mı. */
  readonly dayanikli: boolean;
  readonly esZamanliSinir: number;
  /** İşi sıraya koyar. Dönüş "sıraya alındı" demektir, "bitti" demek değil. */
  gonder(talep: IsTalebi, calistir: () => Promise<void>): Promise<'siraya_alindi' | 'zaten_sirada'>;
  /** Sıradaki her şey bitene kadar bekler. Kapanış ve testler için. */
  bosalt(): Promise<IsSonucu[]>;
  bekleyenSayisi(): number;
}

/* ─── Süreç-içi sağlayıcı ────────────────────────────────────────────── */

class SurecIciKuyruk implements KuyrukSaglayici {
  readonly ad = 'surec-ici';
  readonly bagli = true;
  readonly dayanikli = false;
  constructor(readonly esZamanliSinir: number) {}

  private bekleyen: { talep: IsTalebi; calistir: () => Promise<void> }[] = [];
  private kosan = new Set<string>();
  private sonuclar: IsSonucu[] = [];
  private bosalmaSozu: Promise<void> | null = null;
  private bosaldi: (() => void) | null = null;

  async gonder(talep: IsTalebi, calistir: () => Promise<void>) {
    const zaten = this.kosan.has(talep.anahtar)
      || this.bekleyen.some((b) => b.talep.anahtar === talep.anahtar);
    if (zaten) return 'zaten_sirada' as const;

    this.bekleyen.push({ talep, calistir });
    if (!this.bosalmaSozu) {
      this.bosalmaSozu = new Promise<void>((r) => { this.bosaldi = r; });
    }
    this.tetikle();
    return 'siraya_alindi' as const;
  }

  private tetikle(): void {
    while (this.kosan.size < this.esZamanliSinir && this.bekleyen.length > 0) {
      const is = this.bekleyen.shift()!;
      this.kosan.add(is.talep.anahtar);
      const t0 = Date.now();
      void is.calistir()
        .then(
          () => { this.sonuclar.push({ anahtar: is.talep.anahtar, ok: true, hata: null, sureMs: Date.now() - t0 }); },
          (e: unknown) => {
            /* Kuyruk HİÇBİR hatayı yutmaz ama fırlatmaz da: fırlatmak
               süreç-içi kuyrukta yakalanmamış reddedilmiş söz demektir ve
               süreci düşürür. Hata sonuca yazılır; işin kendi kayıt satırı
               (IsKosusu / EntegrasyonKosusu) zaten çağıranın sorumluluğu. */
            const mesaj = e instanceof Error ? e.message : String(e);
            this.sonuclar.push({ anahtar: is.talep.anahtar, ok: false, hata: mesaj, sureMs: Date.now() - t0 });
          },
        )
        .finally(() => {
          this.kosan.delete(is.talep.anahtar);
          if (this.bekleyen.length > 0) this.tetikle();
          else if (this.kosan.size === 0 && this.bosaldi) { this.bosaldi(); this.bosaldi = null; this.bosalmaSozu = null; }
        });
    }
  }

  async bosalt(): Promise<IsSonucu[]> {
    while (this.bosalmaSozu) await this.bosalmaSozu;
    const s = this.sonuclar;
    this.sonuclar = [];
    return s;
  }

  bekleyenSayisi(): number { return this.bekleyen.length + this.kosan.size; }
}

/* ─── Bağlanmamış dış kuyruk ─────────────────────────────────────────── */

const DIS_KUYRUK: KuyrukSaglayici = {
  ad: 'dis',
  bagli: false,
  dayanikli: true,
  esZamanliSinir: 0,
  gereken: 'Redis/BullMQ ya da Temporal uç noktası + kimlik bilgisi. '
    + 'Kuyruk adresi bir SIR DEĞİLDİR ama kimliği sırdır: '
    + 'lib/entegrasyon/sir.ts referansı üzerinden verilir.',
  async gonder() {
    throw new Error(
      'Dış iş kuyruğu bağlı değil. Bu kurulumda işler süreç-içi kuyrukta koşar; '
      + 'dağıtık kuyruk gerektiğinde bu sağlayıcı bir uç noktaya bağlanır.',
    );
  },
  async bosalt() { return []; },
  bekleyenSayisi() { return 0; },
};

/* ─── Kayıt defteri ──────────────────────────────────────────────────── */

/** SQLite tek yazıcıdır: dört eşzamanlı iş yazma kilidinde sıraya girer,
    daha fazlası zaman aşımı üretir. PostgreSQL'e geçişte yükseltilecek
    TEK sayı budur (bkz. belge/POSTGRESQL_HAZIRLIK.md). */
export const ES_ZAMANLI_SINIR = 4;

const KAYIT = new Map<string, KuyrukSaglayici>();
KAYIT.set('surec-ici', new SurecIciKuyruk(ES_ZAMANLI_SINIR));
KAYIT.set('dis', DIS_KUYRUK);

export function kuyrukSaglayicilari(): KuyrukSaglayici[] {
  return [...KAYIT.values()].sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

export function kuyrukSaglayiciKaydet(s: KuyrukSaglayici, ustuneYaz = false): void {
  if (KAYIT.has(s.ad) && !ustuneYaz) {
    throw new Error(`kuyrukSaglayiciKaydet: '${s.ad}' zaten kayıtlı — üzerine yazmak için ustuneYaz=true`);
  }
  KAYIT.set(s.ad, s);
}

/**
 * Kullanılacak kuyruğu seçer: `IS_KUYRUGU` ortam değişkeni bir sağlayıcı
 * adı verirse o, yoksa bağlı olanların ilki.
 *
 * İstenen sağlayıcı bağlı DEĞİLSE sessizce başkasına düşülmez: bu, dağıtık
 * kuyruğa geçtiğini sanan bir kurulumun tek süreçte koştuğunu gizlerdi.
 */
export function kuyrukSec(istenen: string | undefined = process.env.IS_KUYRUGU): KuyrukSaglayici {
  if (istenen) {
    const s = KAYIT.get(istenen);
    if (!s) throw new Error(`Bilinmeyen iş kuyruğu sağlayıcısı: '${istenen}'`);
    if (!s.bagli) {
      throw new Error(
        `İş kuyruğu '${istenen}' bağlı değil. Gereken: ${s.gereken ?? 'bilinmiyor'}`,
      );
    }
    return s;
  }
  const bagli = kuyrukSaglayicilari().find((s) => s.bagli);
  if (!bagli) throw new Error('Bağlı bir iş kuyruğu sağlayıcısı yok');
  return bagli;
}

import { describe, expect, it } from 'vitest';
import {
  ARTIK_KALIBI, artikAdlari, dusur, sahipPid, sahipYasiyor, sizintiKarari,
  yetimleriSec, yetimleriSupur,
} from '../arac/pg-artik.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   TEST İZOLASYONU · ARTIK VERİTABANI SÜPÜRMESİ [SIS-IZO-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Kurulum provası sırasında yerel test PostgreSQL'inde 228 sızmış test
   veritabanı bulundu (~4,1 GB). `tests/sahte/db.ts` temizlik kancası
   kusursuz değil, EKSİKTİ: `exit`/`beforeExit`/`SIGINT`/`SIGTERM`
   dinliyor ve DROP'u ölçüyor — ama hiçbir kanca `SIGKILL`i, OOM
   öldürmesini ya da disk dolunca gelen ölümü yakalayamaz.

   Kusur ÜRETİLDİ (10 Eyl 2026): iki dosyalık bir PostgreSQL koşumu
   `kill -9` ile öldürüldü ve iki veritabanından biri arkada kaldı.

   ── NE ÖLÇÜLÜR ────────────────────────────────────────────────────────
   Süpürmenin KARARI: hangi veritabanı yetimdir, hangisi eşzamanlı bir
   koşumun canlı veritabanıdır. Karar saf fonksiyonlardadır ve sentetik
   girdilerle sınanır — `psql` çağrısı enjekte edilir, bu yüzden vaka
   sunucuya bağlı değildir ve sabotaj kararı sabote eder.
   ═══════════════════════════════════════════════════════════════════════ */

describe('artık adı ve sahibi [SIS-IZO-001]', () => {
  it('KALIP yalnız koşum veritabanlarını tanır — ŞABLON artık DEĞİLDİR', () => {
    /* Şablon süpürülürse her koşum onu yeniden kurmak zorunda kalır ve
       "izolasyon temizliği" ürünün kendi fikstürünü siler. */
    expect(sahipPid('uyum_test_1234_5678')).toBe(1234);
    expect(sahipPid('uyum_test_sablonu'), 'şablon artık sayıldı').toBeNull();
    expect(sahipPid('uyum'), 'kurulum veritabanı artık sayıldı').toBeNull();
    expect(sahipPid('postgres')).toBeNull();
    expect(ARTIK_KALIBI.test('uyum_test_sablonu')).toBe(false);
  });

  it('SAHİP YAŞIYOR MU: ESRCH ölü, EPERM CANLI [SIS-IZO-001]', () => {
    /* `EPERM` "süreç var ama benim değil" demektir — canlıdır. Onu ölü
       saymak, başka kullanıcının koşumunu süpürmek olurdu. */
    const yok = () => { const e = new Error('yok') as Error & { code?: string }; e.code = 'ESRCH'; throw e; };
    const baskasinin = () => { const e = new Error('yasak') as Error & { code?: string }; e.code = 'EPERM'; throw e; };
    expect(sahipYasiyor(1234, () => true as never), 'sinyal geçti ama ölü sayıldı').toBe(true);
    expect(sahipYasiyor(1234, yok as never), 'ESRCH canlı sayıldı').toBe(false);
    expect(sahipYasiyor(1234, baskasinin as never), 'EPERM ÖLÜ sayıldı').toBe(true);
    expect(sahipYasiyor(0, () => true as never), 'pid 0 kabul edildi').toBe(false);
    expect(sahipYasiyor(-1, () => true as never)).toBe(false);
  });
});

describe('YETİM SEÇİMİ eşzamanlı koşumu ezmez [SIS-IZO-001]', () => {
  const canli = new Set([100]);
  const yasiyorMu = (pid: number) => canli.has(pid);

  it('sahibi ÖLÜ olan seçilir, CANLI olan DOKUNULMAZ', () => {
    const adlar = ['uyum_test_100_1', 'uyum_test_200_2', 'uyum_test_sablonu'];
    expect(yetimleriSec(adlar, yasiyorMu)).toEqual(['uyum_test_200_2']);
  });

  it('hepsi canlıysa süpürülecek bir şey YOKTUR — boş küme ölçülmez', () => {
    expect(yetimleriSec(['uyum_test_100_1'], yasiyorMu)).toEqual([]);
  });
});

/** İki `SELECT count` sorgusu AYRI şeydir ve sahte de öyle ayırmalıdır:
    `pg_stat_activity` = bağlantı dişi · `pg_database` = varlık ölçümü.
    Tek dala düşen bir sahte, bağlantı dişini yanlışlıkla besler ve
    düşürme vakası "kırmızı yandı" derken aslında hiç DROP koşmamış
    olurdu. */
function sahtePsql({ baglanti = 0, kaliyor = false }) {
  const koşan: string[] = [];
  const calistir = (_url: string, sql: string) => {
    koşan.push(sql);
    if (sql.includes('pg_stat_activity')) return String(baglanti);
    if (sql.includes('pg_database WHERE datname =')) return kaliyor ? '1' : '0';
    return '';
  };
  return { calistir, koşan };
}

describe('DÜŞÜRME SON KOŞULUNU ÖLÇER [SIS-IZO-001]', () => {
  it('DROP koştu ama satır DURUYORSA temizlik KIRIKTIR', () => {
    /* "Sildim" diyen adım sildiğini ölçmelidir; başarısız olamayan bir
       adım adım değildir. */
    const { calistir, koşan } = sahtePsql({ kaliyor: true });
    expect(dusur('u', ['uyum_test_9_9'], calistir), 'silinmeyen veritabanı sessizce geçti')
      .toEqual(['uyum_test_9_9']);
    expect(koşan.some((q) => q.startsWith('DROP DATABASE')),
      'vaka DROP koşmadan "kırmızı" ölçüyor').toBe(true);
  });

  it('DROP FIRLATIRSA da kalan listesine girer — sessiz yutma yok', () => {
    const patlar = () => { throw new Error('bağlantı düştü'); };
    expect(dusur('u', ['uyum_test_9_9'], patlar as never)).toEqual(['uyum_test_9_9']);
  });

  it('gerçekten silinen KALAN listesine GİRMEZ', () => {
    const { calistir } = sahtePsql({});
    expect(dusur('u', ['uyum_test_9_9'], calistir)).toEqual([]);
  });
});

describe('BAĞLANTI DİŞİ · ad alanından BAĞIMSIZ [SIS-IZO-001]', () => {
  /* ── ÖLÇÜLEN KUSUR (bağımsız inceleme, PR #51 tur 1) ─────────────────
     Yetimlik ölçütü `process.kill(pid, 0)` idi ve bu SÜPÜRÜCÜNÜN pid ad
     alanında değerlendirilir; addaki pid ise veritabanını YARATAN
     sürecin ad alanındandır. Kapsayıcıdan koşan bir süpürme, host'ta
     CANLI olan bir koşumu "yetim" görebilirdi — ve `WITH (FORCE)` da
     PostgreSQL'in doğal emniyet supabını kapattığı için canlı
     bağlantıları keserek düşürürdü. Öbür koşum ortasında "database
     does not exist" ile parçalanırdı: modülün kendi ölçütüne göre EN
     KÖTÜ sonuç. */

  it('BAĞLANTISI OLAN veritabanı DÜŞÜRÜLMEZ — pid ölü görünse bile', () => {
    const { calistir, koşan } = sahtePsql({ baglanti: 3 });
    /* pid ad alanında YOK: birinci diş "yetim" der. */
    expect(yetimleriSec(['uyum_test_4711_1'], () => false)).toEqual(['uyum_test_4711_1']);
    /* İkinci diş kurtarır. */
    expect(dusur('u', ['uyum_test_4711_1'], calistir),
      'canlı bağlantılı veritabanı düşürüldü — eşzamanlı koşum ezildi')
      .toEqual(['uyum_test_4711_1']);
    expect(koşan.some((q) => q.startsWith('DROP DATABASE')),
      'kullanımdaki veritabanına DROP koşuldu').toBe(false);
  });

  it('DROP deyimi `WITH (FORCE)` TAŞIMAZ — emniyet supabı açık kalır', () => {
    /* Sabotaj yüzeyi: `FORCE` geri gelirse bu vaka kırmızı yanar. */
    const { calistir, koşan } = sahtePsql({});
    dusur('u', ['uyum_test_9_9'], calistir);
    const drop = koşan.find((q) => q.startsWith('DROP DATABASE')) ?? '';
    expect(drop, 'FORCE geri gelmiş — canlı bağlantılar kesilerek düşürülüyor')
      .not.toMatch(/FORCE/i);
  });

  it('BAĞLANTISI YOK ve pid ÖLÜ ise düşürülür — diş kilitlemez', () => {
    const { calistir } = sahtePsql({ baglanti: 0 });
    expect(dusur('u', ['uyum_test_9_9'], calistir)).toEqual([]);
  });
});

describe('SIZINTI KARARI · üç hâl [SIS-IZO-001]', () => {
  /* Saf karar: "sızıntı var" hâlini üretmek için gerçekten bir koşumu
     `kill -9` ile öldürmek gerekmesin. */
  const oldu = (p: number) => p === 100;   /* yalnız 100 canlı */

  it('KOŞUMDA DOĞAN ve sahibi ÖLMÜŞ olan SIZINTIDIR', () => {
    const k = sizintiKarari(['uyum_test_5_1'], ['uyum_test_5_1', 'uyum_test_7_2'],
      (a) => a.filter((x) => !oldu(Number(/^uyum_test_(\d+)_/.exec(x)![1]))));
    expect(k.hal).toBe('sizinti');
    expect(k.sizanlar).toEqual(['uyum_test_7_2']);
  });

  it('EŞZAMANLI koşumun CANLI veritabanı sızıntı SAYILMAZ', () => {
    const k = sizintiKarari([], ['uyum_test_100_9'],
      (a) => a.filter((x) => !oldu(Number(/^uyum_test_(\d+)_/.exec(x)![1]))));
    expect(k.hal, 'canlı koşum sızıntı sayıldı').toBe('temiz');
  });

  it('KOŞUMDAN ÖNCE de duran yetim BU koşuma yazılmaz', () => {
    const k = sizintiKarari(['uyum_test_7_2'], ['uyum_test_7_2'], (a) => a);
    expect(k.hal).toBe('temiz');
  });

  it('TABAN YOKSA sızıntı İDDİA EDİLMEZ — ÖLÇÜLEMEDİ ayrı hâldir', () => {
    /* Bağımsız inceleme bulgusu (PR #51, tur 1): taban alınamadığında
       boş dizi varsayan okuma, geçmişin yetimlerini "bu koşum bıraktı"
       diye yazıyordu — uydurulmuş bir sızıntı iddiası. */
    const k = sizintiKarari(null, ['uyum_test_7_2', 'uyum_test_9_3'], (a) => a);
    expect(k.hal, 'tabansız ölçüm sızıntı iddia etti').toBe('olculemedi');
    expect(k.sizanlar).toEqual([]);
  });
});

describe('SÜPÜRME UÇTAN UCA (sahte psql) [SIS-IZO-001]', () => {
  it('yetimi düşürür, canlıyı bırakır ve sayıyı DOĞRU raporlar', () => {
    const kalanlar = new Set(['uyum_test_100_1', 'uyum_test_200_2', 'uyum_test_sablonu']);
    const sahte = (_url: string, sql: string) => {
      if (sql.startsWith('SELECT datname')) return [...kalanlar].join('\n');
      /* Hiçbirine bağlantı YOK: bu vaka birinci dişi (pid) ölçüyor. */
      if (sql.includes('pg_stat_activity')) return '0';
      const m = /DROP DATABASE IF EXISTS "([^"]+)"/.exec(sql);
      if (m) { kalanlar.delete(m[1]); return ''; }
      const s = /datname = '([^']+)'/.exec(sql);
      return s && kalanlar.has(s[1]) ? '1' : '0';
    };
    const sonuc = yetimleriSupur('u', sahte, (pid: number) => pid === 100);
    expect(sonuc.hepsi.sort(), 'şablon artık listesine girdi')
      .toEqual(['uyum_test_100_1', 'uyum_test_200_2']);
    expect(sonuc.yetim).toEqual(['uyum_test_200_2']);
    expect(sonuc.kalan, 'düşürülemeyen kaldı').toEqual([]);
    expect(kalanlar.has('uyum_test_100_1'), 'CANLI koşumun veritabanı süpürüldü').toBe(true);
    expect(kalanlar.has('uyum_test_sablonu'), 'ŞABLON süpürüldü').toBe(true);
    expect(kalanlar.has('uyum_test_200_2'), 'yetim düşmedi').toBe(false);
  });

  it('artikAdlari ŞABLONU ve yabancı veritabanlarını dışarıda bırakır', () => {
    const sahte = () => ['uyum_test_5_5', 'uyum_test_sablonu', 'postgres', 'uyum'].join('\n');
    expect(artikAdlari('u', sahte as never)).toEqual(['uyum_test_5_5']);
  });
});

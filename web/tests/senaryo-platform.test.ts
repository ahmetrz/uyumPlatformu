import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { enZayif, olcuYazisi, sirala, suz, type PortfoySatiri }
  from '@/app/(tam)/portfoy/mantik';
import { hucreOzeti, kapsamDisiHucre }
  from '@/app/(kabuk)/(operasyonel)/raporlar/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   Senaryo kütüğünün platform boşlukları

   Demo dürüstlüğü, rapor dürüstlüğü, sistem sayfaları, duyarlı yerleşim
   kapısının bağlı olması ve EKRAN DİLİ. Sonuncusu bir stil tercihi değil
   bir kullanılabilirlik kuralıdır: son kullanıcı `provider`, `adapter`,
   `payload` gibi sözcüklerle karşılaşmamalıdır.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();

describe('Demo oturumu · salt okunur', () => {
  it('her yazma eylemi demo ikizinde REDDE düşer [OTR-GRS-003]', async () => {
    /* Statik demoda arkada sunucu yoktur; yazma eyleminin "başardı"
       demesi kullanıcıya olmayan bir kayıt vaat etmek olurdu. */
    const dizin = path.join(KOK, 'lib/eylemler2');
    const ikizler = readdirSync(dizin).filter((d) => d.endsWith('.demo.ts'));
    expect(ikizler.length).toBeGreaterThan(20);

    let uyarSayisi = 0;
    for (const d of ikizler) {
      const metin = readFileSync(path.join(dizin, d), 'utf8');
      /* Demo ikizi bir REDDEDİCİ tanımlar ve dışa aktardıklarını ona
         bağlar; içinde `db.` geçmesi ikizin sunucuya uzandığı anlamına
         gelirdi. */
      expect(metin, `${d} demo ikizinde veritabanı erişimi var`).not.toMatch(/\bdb\./);
      if (/ok:\s*false/.test(metin)) uyarSayisi += 1;
    }
    expect(uyarSayisi).toBeGreaterThan(20);
  });

  it('her sunucu eylemi dosyasının bir demo ikizi vardır', () => {
    const dizin = path.join(KOK, 'lib/eylemler2');
    const hepsi = readdirSync(dizin).filter((d) => d.endsWith('.ts'));
    /* `ortak.ts` bir EYLEM DOSYASI DEĞİL, eylemlerin paylaştığı
       yardımcılardır: dışa aktardığı hiçbir şey sunucu eylemi değildir
       ve bir demo ikizi anlamsız olurdu. */
    const gercek = hepsi
      .filter((d) => !d.endsWith('.demo.ts'))
      .filter((d) => d !== 'ortak.ts');
    for (const g of gercek) {
      const ikiz = g.replace(/\.ts$/, '.demo.ts');
      expect(hepsi, `${g} için demo ikizi yok`).toContain(ikiz);
    }
  });
});

describe('Portföy özeti', () => {
  const satir = (ek: Partial<PortfoySatiri> = {}): PortfoySatiri => ({
    id: 's1', kod: 'SAN-1', ad: 'Santral 1',
    tipKod: 'HES', tipAdi: 'Hidroelektrik', tuzelKisi: 'A',
    konum: null, gucMw: 100, gorselAnahtari: null,
    enlem: null, boylam: null, konumKaynagi: null, konumDogrulandi: false,
    kritiklik: null, uyumYuzde: null, bilinmeyenOran: null,
    acikBulgu: 0, acikRisk: 0, ...ek,
  });

  it('ölçülmemiş uyum yüzdesi SIFIRA çekilmez [PRT-OZT-001]', () => {
    const s = satir({ uyumYuzde: null });
    expect(olcuYazisi(s, 'uyum')).not.toMatch(/^%0$/);
    /* Hiçbir satır ölçülmemişse "en zayıf" da yoktur — uydurulmaz. */
    expect(enZayif([s], 'uyum')).toBeNull();
  });

  it('kurulu güçte "zayıflık" tanımsızdır — küçük santral kötü santral değildir', () => {
    expect(enZayif([satir({ gucMw: 1 })], 'guc')).toBeNull();
  });

  it('açık bulgusu olmayan kümede zayıf yoktur', () => {
    expect(enZayif([satir({ acikBulgu: 0 })], 'bulgu')).toBeNull();
    expect(enZayif([satir({ acikBulgu: 3 })], 'bulgu')?.neden).toMatch(/3 açık bulgu/);
  });

  it('süzgeç tüzel kişiyi ve tipi birlikte daraltır', () => {
    const a = satir({ id: 'a', tipKod: 'HES', tuzelKisi: 'A' });
    const b = satir({ id: 'b', tipKod: 'RES', tuzelKisi: 'B' });
    expect(suz([a, b], { tip: 'HES' }).map((s) => s.id)).toEqual(['a']);
    expect(suz([a, b], { tuzelKisi: 'B' }).map((s) => s.id)).toEqual(['b']);
    expect(sirala([a, b], 'bulgu')).toHaveLength(2);
  });
});

describe('Rapor dürüstlüğü', () => {
  it('kapsam dışı hücre "0 uyum" DEĞİL, kapsam dışıdır [RAP-URT-001]', () => {
    /* Bu santralin bu süreçte hiç maddesi yok. Hücreye %0 yazmak, hiç
       sorulmamış bir soruya "başarısız" demek olurdu. */
    const disi = kapsamDisiHucre('s1');
    expect(disi.kapsamda).toBe(false);
    expect(disi.yuzde).toBeNull();
    /* Sayacı hiç gelmemiş bir kapsam İÇİ hücrede de yüzde uydurulmaz. */
    const olculmemis = hucreOzeti('s1', undefined);
    expect(olculmemis.yuzde).toBeNull();
    expect(olculmemis.kapsam).toBe(0);
  });

  it('değerlendirilmemiş madde yüzdenin PAYDASINA girmez [RAP-URT-003]', () => {
    const h = hucreOzeti('s1', { uyumlu: 2, degerlendirilmedi: 8 });
    expect(h.kapsamda).toBe(true);
    expect(h.bilinmeyen).toBe(8);
    expect(h.degerlendirilen).toBe(2);
    /* İki maddeden ikisi uyumlu: yüzde %100'dür ve bu dürüsttür. Yanına
       "8 madde ölçülmedi" bilgisi ayrıca taşınır. */
    expect(h.yuzde).toBe(100);
    expect(h.bilinmeyenOran).not.toBeNull();
  });
});

describe('Sistem sayfaları', () => {
  it('bulunamadı ve hata sayfaları vardır ve dönüş yolu sunar [SIS-HTA-001]', () => {
    for (const dosya of ['not-found.tsx', 'error.tsx']) {
      const yol = path.join(KOK, 'app', dosya);
      const metin = readFileSync(yol, 'utf8');
      /* Kullanıcı çıkmaz sokakta bırakılmaz: her iki sayfa da geri dönüş
         yolu gösterir. */
      expect(metin, `${dosya} dönüş yolu sunmuyor`).toMatch(/href=|Link|yenidenDene|router/);
    }
  });
});

describe('Duyarlı yerleşim kapısı', () => {
  it('yatay taşma kapısı ölçülen genişlikleri koda gömer [SIS-RSP-001]', () => {
    /* Bu senaryo bir tarayıcı ölçümüdür ve `npm run tasarim:tasma` ile
       koşar. Vitest'in ölçebileceği şey kapının GERÇEKTEN var olduğu ve
       dar bantları kapsadığıdır: kapı listeden düşerse ölçüm sessizce
       durur ve kimse fark etmez. */
    const tasma = readFileSync(path.join(KOK, 'arac/yatay-tasma.mjs'), 'utf8');
    /* En sıkı iki bant burada ölçülür: telefon ve dikey tablet. */
    for (const genislik of ['375', '768']) {
      expect(tasma, `${genislik}px bandı taşma kapısında yok`).toContain(genislik);
    }
    /* Dizüstü bandı ayrı bir kapıdadır ve kırpılan öğeyi de arar. */
    const dizustu = readFileSync(path.join(KOK, 'arac/dizustu.mjs'), 'utf8');
    expect(dizustu).toContain('1366');

    const paket = JSON.parse(readFileSync(path.join(KOK, 'package.json'), 'utf8'));
    expect(paket.scripts['tasarim:tasma']).toContain('yatay-tasma');
    expect(paket.scripts['tasarim:dizustu']).toContain('dizustu');
  });
});

/* ── Ekran dili ─────────────────────────────────────────────────────── */

/** Son kullanıcıya gösterilmeyecek geliştirici sözcükleri. */
const JARGON = [
  'provider', 'adapter', 'registry', 'mutation', 'payload', 'boolean',
  'foreign key', 'nullable', 'endpoint', 'middleware', 'schema',
  /* UX-0010'da ölçüldü. "connector" ürünün KENDİ İÇİNDE tutarsızdı:
     durum şeridi "bağlayıcı" derken /esleme ve /kesif "connector"
     diyordu. "ölü mektup" ile "legal hold" ise doğrudan çeviri
     jargonudur; ikisinin de son kullanıcı sözlüğünde karşılığı yok. */
  'connector', 'ölü mektup', 'legal hold', 'dead letter',
];

/** Bu sözcüklerin GEÇMESİ serbest olan yerler ve gerekçeleri. */
const JARGON_MUAF: Record<string, string> = {
  'app/(kabuk)/(operasyonel)/api-sozlesmesi': 'API sözleşmesi ekranının okuru geliştiricidir',
  'app/(kabuk)/(operasyonel)/sistem': 'Tasarım sistemi ekranı geliştiriciye bakar',
};

function tsxDosyalari(dizin: string, birikim: string[] = []): string[] {
  for (const ad of readdirSync(dizin)) {
    const yol = path.join(dizin, ad);
    if (statSync(yol).isDirectory()) tsxDosyalari(yol, birikim);
    else if (ad.endsWith('.tsx')) birikim.push(yol);
  }
  return birikim;
}

/** JSX metin düğümleri ve kullanıcıya dönük öznitelikler. */
function kullaniciMetinleri(kaynak: string): string[] {
  const metinler: string[] = [];
  for (const m of kaynak.matchAll(/>([^<>{}\n]{4,})</g)) metinler.push(m[1]!);
  for (const m of kaynak.matchAll(
    /\b(etiket|baslik|ad|cumle|yazi|aciklama|placeholder|title|aria-label)=["']([^"']{4,})["']/g,
  )) metinler.push(m[2]!);
  return metinler;
}

describe('Ekran dili · son kullanıcı geliştirici sözcüğü görmez', () => {
  it('kullanıcıya dönük hiçbir metinde jargon geçmez [SIS-DIL-001]', () => {
    /* `components/` de taranır: kabuk, çekmece ve tablo primitifleri her
       ekranda çizilir; oradaki bir jargon tek ekranın değil ürünün
       dilini bozar. Muafiyet yolları `app/` köküne göre yazıldığı için
       iki taban ayrı ayrı gezilir ve bağıl yol ürün köküne göre kurulur. */
    const dosyalar = [
      ...tsxDosyalari(path.join(KOK, 'app')),
      ...tsxDosyalari(path.join(KOK, 'components')),
    ];
    expect(dosyalar.length).toBeGreaterThan(40);

    const bulgular: string[] = [];
    for (const yol of dosyalar) {
      const bagil = path.relative(KOK, yol).replace(/\\/g, '/');
      if (Object.keys(JARGON_MUAF).some((m) => bagil.startsWith(m))) continue;
      const metinler = kullaniciMetinleri(readFileSync(yol, 'utf8'));
      for (const metin of metinler) {
        for (const kelime of JARGON) {
          if (new RegExp(`\\b${kelime}\\b`, 'i').test(metin)) {
            bulgular.push(`${bagil}: "${metin.trim().slice(0, 60)}" → ${kelime}`);
          }
        }
      }
    }
    expect(bulgular, bulgular.join('\n')).toEqual([]);
  });

  it('muafiyet listesi gerekçesiz büyümez', () => {
    for (const [yol, neden] of Object.entries(JARGON_MUAF)) {
      expect(neden.length, `${yol} muafiyeti gerekçesiz`).toBeGreaterThan(20);
    }
    expect(Object.keys(JARGON_MUAF).length).toBeLessThanOrEqual(4);
  });
});

/* ── Görsel kapılar ─────────────────────────────────────────────────── */

describe('Görsel kalite kapıları', () => {
  /* Bu iki senaryonun ÖLÇÜMÜ tarayıcıda yapılır: `tasarim:kapi`,
     `tasarim:axe`, `tasarim:tasma` ve `tasarim:dizustu`. Vitest'in dürüstçe
     ölçebileceği şey, kapıların GERÇEKTEN var olduğu ve CI'da koştuğudur:
     bir kapı listeden düşerse ölçüm sessizce durur ve kimse fark etmez.
     Kapıların o koşudaki sayısal sonuçları final raporunda yazılıdır. */

  const ci = () => readFileSync(
    path.join(KOK, '..', '.github/workflows/pr-kapisi.yml'), 'utf8');

  it('tasarım dili kapısı tanımlı ve CI\'da koşuyor [SIS-GRS-001]', () => {
    const paket = JSON.parse(readFileSync(path.join(KOK, 'package.json'), 'utf8'));
    const kapi = paket.scripts['tasarim:kapi'];
    /* Üç ölçüm birlikte koşar: kontrast, font kütüğü ve eski tasarım izi. */
    expect(kapi).toContain('kontrast');
    expect(kapi).toContain('font-kontrol');
    expect(kapi).toContain('iz-tarama');
    expect(ci()).toContain('tasarim:kapi');
  });

  it('dar bant ve dizüstü kapıları koda gömülü eşikler taşır [SIS-GRS-002]', () => {
    /* Kırpılan öğe ve yatay taşma ayrı kapılardır: biri "sayfa yana
       kayıyor mu", öteki "içerik kutusundan taşıyor mu" sorusunu sorar.
       İkisini tek kapıya indirmek, ikinci soruyu sessizce düşürürdü. */
    const tasma = readFileSync(path.join(KOK, 'arac/yatay-tasma.mjs'), 'utf8');
    const dizustu = readFileSync(path.join(KOK, 'arac/dizustu.mjs'), 'utf8');
    expect(tasma).toContain('scrollWidth');
    expect(dizustu).toContain('1366');
    expect(dizustu).toMatch(/kırp|kirp/i);
  });
});

/* ── Göç güvenliği ──────────────────────────────────────────────────── */

describe('Göçler', () => {
  it('hiçbir göç veri kaybettirmez — her DROP bir yeniden kurma adımıdır [SIS-GOC-001]', () => {
    /* SQLite kolon değiştiremez; Prisma tabloyu YENİDEN KURAR:

         CREATE TABLE "new_X" (…)
         INSERT INTO "new_X" (…) SELECT … FROM "X"
         DROP TABLE "X"
         ALTER TABLE "new_X" RENAME TO "X"

       Bu kalıpta veri KORUNUR. Tehlikeli olan, bu üçlüden kopuk bir
       `DROP TABLE`tir: satırlar geri gelmez. Ölçülen tam olarak budur. */
    const dizin = path.join(KOK, 'prisma/migrations');
    const gocler = readdirSync(dizin).filter((d) => d.startsWith('2026'));
    expect(gocler.length).toBeGreaterThan(20);

    const korumasiz: string[] = [];
    for (const g of gocler) {
      const yol = path.join(dizin, g, 'migration.sql');
      if (!existsSync(yol)) continue;
      const sql = readFileSync(yol, 'utf8');
      for (const m of sql.matchAll(/DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"?([A-Za-z_]+)"?/gi)) {
        const tablo = m[1]!;
        const tasindi = new RegExp(
          `INSERT\\s+INTO\\s+"new_${tablo}"[\\s\\S]*?FROM\\s+"${tablo}"`, 'i').test(sql);
        const yenidenAdlandirildi = new RegExp(
          `ALTER\\s+TABLE\\s+"new_${tablo}"\\s+RENAME\\s+TO\\s+"${tablo}"`, 'i').test(sql);
        /* İkinci meşru yol: tablo o gün BOŞtur ve göç bunu YAZILI olarak
           gerekçelendirir. Gerekçesiz bir düşürme, satırların geri
           gelmeyeceği anlamına gelir; yorum zorunluluğu tam da bunu
           gözden kaçırılamaz yapar. */
        const yenidenKuruldu = new RegExp(
          `CREATE\\s+TABLE\\s+"${tablo}"`, 'i').test(sql);
        const gerekceli = /--[^\n]*(0 satır|boştur|veri almadı|henüz veri)/i.test(sql);
        if (!(tasindi && yenidenAdlandirildi) && !(yenidenKuruldu && gerekceli)) {
          korumasiz.push(`${g}: ${tablo}`);
        }
      }
    }
    expect(korumasiz, `veri taşımadan düşürülen tablo:\n${korumasiz.join('\n')}`)
      .toEqual([]);
  });

  it('kolon düşüren her göç önce veriyi TAŞIR', () => {
    /* `DROP COLUMN` de aynı soruyu sorar: kolonun taşındığı bir hedef var
       mı, yoksa değer siliniyor mu. */
    const dizin = path.join(KOK, 'prisma/migrations');
    const dogrudan: string[] = [];
    for (const g of readdirSync(dizin).filter((d) => d.startsWith('2026'))) {
      const yol = path.join(dizin, g, 'migration.sql');
      if (!existsSync(yol)) continue;
      const sql = readFileSync(yol, 'utf8');
      if (/DROP\s+COLUMN/i.test(sql) && !/INSERT\s+INTO\s+"new_/i.test(sql)) {
        dogrudan.push(g);
      }
    }
    expect(dogrudan, dogrudan.join(' · ')).toEqual([]);
  });

  it('denetim izini koruyan tetikleyiciler göçlerde tanımlıdır [SIS-GOC-002]', () => {
    const dizin = path.join(KOK, 'prisma/migrations');
    const hepsi = readdirSync(dizin)
      .filter((d) => d.startsWith('2026'))
      .map((d) => path.join(dizin, d, 'migration.sql'))
      .filter((y) => existsSync(y))
      .map((y) => readFileSync(y, 'utf8'))
      .join('\n');
    /* Değişmezlik uygulamada DEĞİL veritabanında tutulur: uygulamayı
       atlayan bir yol bile geçmişi değiştiremesin. */
    expect(hepsi).toMatch(/CREATE\s+TRIGGER/i);
    expect(hepsi).toMatch(/RAISE\s*\(\s*ABORT/i);
  });
});

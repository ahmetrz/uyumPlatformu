import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SENARYOLAR, alanOzeti, kutukTutarli } from '@/lib/senaryo/kutuk';
import { TEST_KATMANLARI } from '@/lib/senaryo/tipler';
import { KUTUKSUZ_DOSYALAR, olc } from '../arac/senaryo-belge.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   SENARYO KÜTÜĞÜNÜN NÖBETÇİSİ

   Kütük bir belge değil KODdur; `docs/MASTER_SCENARIO_REGISTRY.md` ve
   `docs/SCENARIO_TEST_MATRIX.md` ondan üretilir. Bu dosya üç şeyi çivi
   gibi tutar:

     · GAP = 0        — testi olmayan senaryo yoktur,
     · HAYALET = 0    — kütükte olmayan kimliği işaret eden test yoktur,
     · ÖKSÜZ = 0      — gerekçesiz, hiçbir senaryoya bağlanmamış test
                        dosyası yoktur.

   Üçü birden tutulmazsa kütük ilk yeniden adlandırmada gerçeklikten
   ayrılır ve kimse fark etmez.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const olcum = olc(SENARYOLAR);

describe('Kütüğün kendi tutarlılığı', () => {
  it('kimlikler tekildir, kalıba uyar ve hiçbir alan boş değildir', () => {
    expect(kutukTutarli()).toEqual([]);
  });

  it('kütük gerçekten dolu ve alanlara yayılmış', () => {
    expect(SENARYOLAR.length).toBeGreaterThanOrEqual(150);
    const alanlar = alanOzeti();
    expect(alanlar.length).toBeGreaterThanOrEqual(20);
    /* Tek bir alanın kütüğü domine etmesi, ölçümün dar kaldığını
       gösterirdi. */
    const enBuyuk = Math.max(...alanlar.map(([, n]) => n));
    expect(enBuyuk).toBeLessThan(SENARYOLAR.length * 0.5);
  });

  it('her senaryo tanımlı bir katman bildirir', () => {
    for (const s of SENARYOLAR) {
      for (const k of s.katmanlar) {
        expect(TEST_KATMANLARI, `${s.id}: ${k}`).toContain(k);
      }
    }
  });

  it('ekranı olan her senaryonun rotası GERÇEKTEN vardır', () => {
    /* Dinamik parça `[id]` klasör adıdır; rota metni doğrudan dosya
       yoluna çevrilebilir. Olmayan bir rotaya senaryo yazmak, ölçülen
       şeyin var olmadığı anlamına gelir. */
    const eksik: string[] = [];
    for (const s of SENARYOLAR) {
      if (s.rota === '—') continue;
      const parca = s.rota.replace(/^\//, '');
      const adaylar = [
        `app/(kabuk)/(operasyonel)/${parca}/page.tsx`,
        `app/(kabuk)/(flagship)/${parca}/page.tsx`,
        `app/(tam)/${parca}/page.tsx`,
        `app/(giris)/${parca}/page.tsx`,
        `app/${parca}/page.tsx`,
      ];
      if (!adaylar.some((a) => existsSync(path.join(KOK, a)))) {
        eksik.push(`${s.id} → ${s.rota}`);
      }
    }
    expect(eksik, eksik.join(' · ')).toEqual([]);
  });
});

describe('Kapsam ölçüsü', () => {
  it('GAP SIFIRDIR — testi olmayan senaryo yoktur', () => {
    expect(olcum.bosluklar, `testsiz senaryo: ${olcum.bosluklar.join(' ')}`)
      .toEqual([]);
  });

  it('HAYALET işaret yoktur — kütükte olmayan kimliği kimse işaret etmez', () => {
    expect(olcum.hayaletler, `kütükte yok: ${olcum.hayaletler.join(' ')}`)
      .toEqual([]);
  });

  it('ÖKSÜZ test dosyası yoktur — her dosya ya bağlıdır ya gerekçelidir', () => {
    expect(olcum.oksuzDosyalar, `bağsız: ${olcum.oksuzDosyalar.join(' ')}`)
      .toEqual([]);
  });

  it('gerekçeli muafiyet listesi gerekçesiz büyümez', () => {
    for (const [dosya, neden] of Object.entries(KUTUKSUZ_DOSYALAR)) {
      expect(neden.length, `${dosya} muafiyeti gerekçesiz`).toBeGreaterThan(15);
    }
  });

  it('her katmanın en az bir senaryosu vardır — ölü katman yok', () => {
    for (const k of TEST_KATMANLARI) {
      const kume = SENARYOLAR.filter((s) => s.katmanlar.includes(k));
      expect(kume.length, `${k} katmanında senaryo yok`).toBeGreaterThan(0);
    }
  });

  it('yalnız mutlu yol yazılmamış: her alanda en az bir aykırı hâl var', () => {
    /* Bir alanın bütün senaryoları "normal" veri hâlindeyse o alan
       gerçekte ölçülmemiş demektir. */
    const alanlar = [...new Set(SENARYOLAR.map((s) => s.alan))];
    const mutluAlanlar = alanlar.filter((a) => {
      const kume = SENARYOLAR.filter((s) => s.alan === a);
      return kume.every((s) => s.veriHali === 'normal');
    });
    expect(mutluAlanlar, `yalnız mutlu yol: ${mutluAlanlar.join(', ')}`)
      .toEqual([]);
  });
});

describe('Üretilen belgeler koda karşı TAZE', () => {
  const belge = (ad: string) =>
    readFileSync(path.join(KOK, '..', 'docs', ad), 'utf8');

  it('kütük belgesi güncel senaryo sayısını taşır', () => {
    const metin = belge('MASTER_SCENARIO_REGISTRY.md');
    expect(metin).toContain(`Senaryo: **${SENARYOLAR.length}**`);
    expect(metin).toContain('GAP: **0**');
  });

  it('matris belgesi her senaryoyu satır olarak taşır', () => {
    const metin = belge('SCENARIO_TEST_MATRIX.md');
    for (const s of SENARYOLAR) {
      expect(metin, `${s.id} matriste yok`).toContain(`\`${s.id}\``);
    }
    expect(metin).toContain('| **GAP** | **0** |');
  });
});

/* ── UX denetim belgesi ─────────────────────────────────────────────── */

/* Denetim belgesi ekran ekran yazılır ve elle tutulur; kod ürettiğinde
   değil. Tek gerçek kuralı vardır: BİR EKRAN ATLANAMAZ. Yeni bir ekran
   eklendiğinde denetimi de yapılmalıdır — yoksa belge "49 ekranı
   denetledik" der ve yalan söyler.

   UX-0015 tam olarak bu delikten çıktı: `/degerlendirme-aktarim`
   gezinmede vardı, kapı listesinde yoktu, dolayısıyla hiçbir denetimde
   görünmüyordu. */

describe('UX denetim belgesi · hiçbir ekran atlanmaz', () => {
  const metin = readFileSync(path.join(KOK, '..', 'docs', 'END_USER_UX_AUDIT.md'), 'utf8');
  const rotalar: string[] = JSON.parse(readFileSync(path.join(KOK, 'arac', 'rotalar.json'), 'utf8'))
    .map((r: string) => r || '/');

  it('rota envanterindeki her ekranın kendi bölümü var [SIS-UXD-001]', () => {
    const eksik = rotalar.filter((r) => !metin.includes(`#### \`${r}\` `));
    expect(eksik, `denetlenmemiş ekran: ${eksik.join(', ')}`).toEqual([]);
  });

  it('her bulgu bir önem derecesi taşır [SIS-UXD-002]', () => {
    const kimlikler = [...metin.matchAll(/\bUX-(\d{4})\b/g)].map((m) => m[0]);
    expect(new Set(kimlikler).size).toBeGreaterThan(0);
    /* Bulgu tablosunun her satırı: kimlik · önem · ekran · kusur · durum. */
    for (const kimlik of new Set(kimlikler)) {
      const satir = metin.split('\n').find((l) => l.startsWith(`| ${kimlik} |`));
      expect(satir, `${kimlik} bulgu tablosunda yok`).toBeTruthy();
      expect(satir!, `${kimlik} önem derecesiz`).toMatch(/\*\*P[0-3]\*\*/);
      /* Durum sütunu "açık" ya da "kapatıldı" ile başlar; kapanışın
         nasıl olduğu parantez içinde eklenebilir ("kapatıldı (UX-0003
         ile)") — bilgi eksiltmeden okunurluk katar. */
      expect(satir!, `${kimlik} durumsuz`).toMatch(/\| (açık|kapatıldı)[^|]*\|\s*$/);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ASGARI_SOZCUK, aciklar, sirayla, sozcukler, tamAyrisma,
} from '../../arac/tanik-karsilastirma.mjs';
import { tabanDalKarari } from '../../arac/taban-dal.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   İKİNCİ BAĞIMSIZ POPÜLASYON TANIĞI · BEKÇİ [URN-TNK-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Bu depoda iki kütüğün de POPÜLASYONU tek bir düzenli ifadeden
   türüyordu ve "tavan sıfır" dişi yalnız TÜRETİCİNİN GÖRDÜĞÜNÜ koruyor:

     politika  : 131 → 184 → 213 → 215
     boş durum : 74 → 94 → 95 → 102 → 100 → 126

   Yedi kez genişleyen bir türeticinin "ölçülmeyen 0" çıktısı, payda
   bağımsız doğrulanmadıkça bir ölçüm DEĞİLDİR. Sayaç cırcırı,
   türeticinin hiç görmediği cümleyi göremez.

   ── TANIĞIN MEKANİZMASI FARKLIDIR ─────────────────────────────────────
   `arac/dom-tanik.mjs` kaynağı HİÇ OKUMAZ: ürünü gerçek bir tarayıcıda
   açar ve KULLANICIYA GÖRÜNEN metni toplar. Aynı kusurun iki farklı
   mekanizmada birden olması gerekir ki ayrışma görünmesin.

   ── BU BEKÇİNİN ÖLÇTÜĞÜ ───────────────────────────────────────────────
   1. Tanığın GÖRDÜĞÜ her cümle bir kütükte AÇIKLANIYOR mu (mutlak).
   2. Tanık kütüğünde ÖLÜ satır var mı.
   3. Tanık kütüğünün her satırı ÖLÇÜMÜNÜ taşıyor mu (tavan sıfır).
   4. Tanığın ERİŞİMİ daralmış mı — kör bir tanık sıfır ayrışma bulur.
   5. Karşılaştırma ölçütünün kendisi kaçamak mı (sentetik vakalar).

   ── TANIK ÇIKTISI YOKSA ───────────────────────────────────────────────
   `arac/dom-tanik.json` canlı sunucu ister ve her `npm test` koşusunda
   üretilemez. Çıktı yoksa bekçi CI'da KIRMIZI, yerelde beyanlı atlar —
   "ölçülmedi" yazar, "geçti" değil.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const TANIK = path.join(KOK, 'arac', 'dom-tanik.json');
const TANIK_KUTUK = path.join(KOK, 'arac', 'dom-tanik-kutugu.json');
const POLITIKA = path.join(KOK, 'arac', 'politika-cumleleri.json');

type TanikCiktisi = {
  uretilme: string;
  rota: string[];
  atlanan: { rota: string; sebep: string }[];
  politikaAdaylari: { cumle: string; rotalar: string[] }[];
  bosDurumlar: { metin: string; rota: string; sinif: string; eylem: boolean }[];
};
type TanikSatiri = {
  kod: string; rota: string; cekirdek: string; sinif: string;
  sonucSinifi?: string; gerekce?: string;
  olcum?: { dosya: string; vaka: string };
};

const tanikVar = existsSync(TANIK);
const tanik: TanikCiktisi | null = tanikVar
  ? JSON.parse(readFileSync(TANIK, 'utf8')) as TanikCiktisi : null;
const tanikKutuk = JSON.parse(readFileSync(TANIK_KUTUK, 'utf8')) as {
  tavanlar: { olculmeyen: number }; satirlar: TanikSatiri[];
};
const politika = JSON.parse(readFileSync(POLITIKA, 'utf8')) as {
  satirlar: { cumle: string }[];
};

/* Tanığın ERİŞİM TABANI. Sıfır rota gezen bir tanık sıfır ayrışma
   bulur ve kapı yeşil yanar — "hiçbir şeye bakmadan temiz raporlamak"
   bu dosyada tam olarak böyle görünürdü. */
const ROTA_TABANI = 55;
const CUMLE_TABANI = 30;

describe('DOM tanığı · POPÜLASYON AYRIŞMASI [URN-TNK-001]', () => {
  it('TANIK ÇIKTISI VAR — yoksa CI kırmızı, yerelde "ölçülmedi" [URN-TNK-001]', () => {
    if (tanikVar) { expect(tanik!.politikaAdaylari.length).toBeGreaterThan(0); return; }
    expect(process.env.CI ?? '', 'CI\'da tanık çıktısı YOK: `PORT=3210 node arac/dom-tanik.mjs --yaz`')
      .toBe('');
  });

  it('TANIĞIN ERİŞİMİ DARALMADI — kör tanık sıfır ayrışma bulur [URN-TNK-001]', () => {
    if (!tanik) return;
    expect(tanik.rota.length,
      `tanık ${tanik.rota.length} rota gezdi, taban ${ROTA_TABANI}`)
      .toBeGreaterThanOrEqual(ROTA_TABANI);
    expect(tanik.politikaAdaylari.length,
      `tanık ${tanik.politikaAdaylari.length} cümle gördü, taban ${CUMLE_TABANI}`)
      .toBeGreaterThanOrEqual(CUMLE_TABANI);
    /* Atlanan rota SESSİZ olamaz: tanığın göremediği yer, ayrışmanın
       göremediği yerdir. */
    expect(tanik.atlanan.map((a) => `${a.rota} — ${a.sebep}`), 'tanık rota atladı')
      .toEqual([]);
  });

  it('EKRANDA GÖRÜLEN her cümle bir kütükte AÇIKLANIYOR [URN-TNK-001]', () => {
    if (!tanik) return;
    const { acikta } = tamAyrisma(
      tanik.politikaAdaylari.map((a) => a.cumle),
      politika.satirlar.map((s) => s.cumle),
      tanikKutuk.satirlar,
    );
    const yer = new Map(tanik.politikaAdaylari.map((a) => [a.cumle, a.rotalar[0]]));
    const liste = acikta.map((c) => `${yer.get(c)} :: ${c.slice(0, 110)}`);
    expect(liste, 'TÜRETİCİ KÖR: ekranda okunan ama hiçbir kütükte olmayan cümle:\n'
      + `${liste.join('\n')}\n`
      + 'çözüm: türeticiyi genişlet ya da satırı arac/dom-tanik-kutugu.json\'a '
      + 'ÖLÇÜMÜYLE ekle. Sayıyı düşürme — yükselt.').toEqual([]);
  });

  it('TANIK KÜTÜĞÜNDE ölü satır YOK [URN-TNK-001]', () => {
    if (!tanik) return;
    const { olu } = tamAyrisma(
      tanik.politikaAdaylari.map((a) => a.cumle),
      politika.satirlar.map((s) => s.cumle),
      tanikKutuk.satirlar,
    );
    expect(olu, `artık hiçbir ekranda görünmeyen tanık satırı: ${olu.join(', ')}`)
      .toEqual([]);
  });

  it('TANIK KÜTÜĞÜNÜN her satırı ÖLÇÜMÜNÜ taşır — tavan SIFIR [URN-TNK-001]', () => {
    const olcumsuz = tanikKutuk.satirlar.filter((s) => !s.olcum).map((s) => s.kod);
    expect(olcumsuz, `ölçümsüz tanık satırı: ${olcumsuz.join(', ')}`).toEqual([]);
    expect(tanikKutuk.tavanlar.olculmeyen, 'tanık kütüğünün ölçülmeyen tavanı sıfır olmalı')
      .toBe(0);
  });

  it('ÖLÇÜM referansı GERÇEK: dosya var ve vaka o dosyada [URN-TNK-001]', () => {
    const kusur: string[] = [];
    for (const s of tanikKutuk.satirlar) {
      if (!s.olcum) continue;
      const yol = path.join(KOK, s.olcum.dosya);
      if (!existsSync(yol)) { kusur.push(`${s.kod}: dosya yok — ${s.olcum.dosya}`); continue; }
      if (!readFileSync(yol, 'utf8').includes(s.olcum.vaka)) {
        kusur.push(`${s.kod}: vaka yok — "${s.olcum.vaka}" (${s.olcum.dosya})`);
      }
    }
    expect(kusur, kusur.join('\n')).toEqual([]);
  });

  it('TANIK KÜTÜĞÜ CIRCIRDADIR — taban dala göre BÜYÜYEMEZ [URN-TNK-001]', () => {
    /* Kaçış kapısının kendisi cırcırdadır: "türeticiyi genişletmek"
       yerine her cümleyi tanık kütüğüne atmak, körlüğü kütüğe taşımak
       olurdu. Satır sayısı taban dala göre artamaz; artması gerekiyorsa
       türetici genişletilir. */
    const git = (a: string[]) => execFileSync('git', a,
      { cwd: KOK, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    let tabanDalVar = true;
    try { git(['rev-parse', '--verify', 'origin/main']); } catch { tabanDalVar = false; }
    if (!tabanDalVar) {
      expect(process.env.CI ?? '', 'CI\'da taban dal okunamadı').toBe('');
      return;
    }
    const YOL = 'origin/main:web/arac/dom-tanik-kutugu.json';
    let tabandaVar = true;
    try { git(['cat-file', '-e', YOL]); } catch { tabandaVar = false; }
    let ham: string | null = null;
    if (tabandaVar) { try { ham = git(['show', YOL]); } catch { ham = null; } }
    const karar = tabanDalKarari(tabandaVar, ham);
    if (karar.hal === 'taban_yok') return;      /* ilk tur: kütük yeni */
    if (karar.hal === 'olculemedi') {
      expect(process.env.CI ?? '', `TABAN DAL ÖLÇÜLEMEDİ (${karar.sebep})`).toBe('');
      return;
    }
    const taban = karar.belge as { satirlar: { kod: string }[] };
    expect(tanikKutuk.satirlar.length,
      `tanık kütüğü ${taban.satirlar.length} → ${tanikKutuk.satirlar.length} BÜYÜDÜ; `
      + 'körlüğü kütüğe taşımak yerine türeticiyi genişletin')
      .toBeLessThanOrEqual(taban.satirlar.length);
  });
});

/* ═══ ÖLÇÜTÜN KENDİSİ · SENTETİK VAKALAR ═════════════════════════════
   Kural saf bir fonksiyondadır ve sentetik girdilerle sınanır —
   sabotaj kuralı sabote eder, ölçüm ortamını değil. */

describe('AÇIKLAMA ÖLÇÜTÜ kaçamak DEĞİL [URN-TNK-001]', () => {
  it('ARA DEĞER dolmuş cümle, şablonu AÇIKLAR [URN-TNK-001]', () => {
    expect(aciklar(
      'Eksikler ayrı sayılır:  değerlendirilmedi ·  kanıtsız',
      'Eksikler ayrı sayılır: 2 değerlendirilmedi · 1 kanıtsız',
    )).toBe(true);
  });

  it('BAŞKA bir cümle açıklamaz — ölçüt her şeyi eşleştirmiyor [URN-TNK-001]', () => {
    expect(aciklar(
      'Kapsam boş bırakılamaz ve dış denetçiye her şey açılmaz',
      'Yedekleme politikası kaydı bir yedekleme işi başlatmaz',
    )).toBe(false);
  });

  it('ÇOK KISA kütük satırı hiçbir şeyi açıklayamaz [URN-TNK-001]', () => {
    /* İki sözcüklük bir satır her metinde "bulunur" ve ayrışmayı
       sessizce sıfırlardı; eşik ölçütün kaçamak olmasını engeller. */
    expect(ASGARI_SOZCUK).toBeGreaterThanOrEqual(4);
    expect(aciklar('kayıt yok', 'kayıt bulunamadı, yok sayıldı')).toBe(false);
  });

  it('SIRA ÖNEMLİ — aynı sözcükler farklı sırada açıklamaz [URN-TNK-001]', () => {
    expect(sirayla(['bir', 'iki', 'uc'], ['bir', 'iki', 'uc'])).toBe(true);
    expect(sirayla(['bir', 'iki', 'uc'], ['uc', 'iki', 'bir'])).toBe(false);
  });

  it('SAYILAR düşer, harfler kalır [URN-TNK-001]', () => {
    expect(sozcukler('12 kayıt açık · 3 kapalı')).toEqual(['kayıt', 'açık', 'kapalı']);
  });

  it('BOŞ kütükte HİÇBİR ŞEY açıklanmaz — ayrışma sessizce sıfırlanamaz [URN-TNK-001]', () => {
    const { acikta } = tamAyrisma(['Ekranda duran bir politika cümlesi burada'], [], []);
    expect(acikta.length, 'boş kütük her şeyi açıklıyor görünüyor').toBe(1);
  });
});

/* ═══ BOŞ DURUM TARAFI ═══════════════════════════════════════════════ */

describe('DOM tanığı · BOŞ DURUM ayrışması [URN-TNK-001]', () => {
  it('EKRANDA görülen boş durumun EYLEMİ de var [URN-TNK-001]', () => {
    if (!tanik) return;
    /* R-G'nin sıfır kilidi kaynaktan ölçülür; tanık aynı sözü RENDER
       EDİLMİŞ tarafta okur. İYİ HABER boş durumu (`bos iyi`) dişin
       dışındadır ve muafiyeti KODDAN gelir, kütükten değil. */
    const eylemsiz = tanik.bosDurumlar
      .filter((b) => !b.eylem && !/\bbos\s+iyi\b|\biyi\b/.test(b.sinif))
      .map((b) => `${b.rota} :: ${b.metin.slice(0, 80)}`);
    expect(eylemsiz, 'RENDER EDİLMİŞ ekranda eylemsiz boş durum:\n'
      + eylemsiz.join('\n')).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { omurgaIhlalleri, omurgaModelleri, semaModelleri } from './semaBekcisi';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · kapsam omurgası tesise çakılamaz (B1 · URN-KAP-001) — CIRCIR

   Uyum zincirinin öznesi `KapsamOgesi`dir; `tesisId` yalnız öğenin
   köprüsüdür. B1 göçü dokuz omurga tablosundan `tesisId`yi çıkardı. Bu
   bekçi geri gelmesini engeller: `kapsamOgesiId` taşıyan bir modelde
   doğrudan `tesisId` görülürse kırmızı.

   ── DİŞLER ────────────────────────────────────────────────────────────
   (a) Omurga TANIMI şemadan türer (elle liste yok) ama en az dokuz
       bilinen tabloyu kapsamak ZORUNDA: `kapsamOgesiId`si düşürülen bir
       tablo omurgadan sessizce çıkamaz.
   (b) Listede olmayan omurga tablosunda `tesisId` → kırmızı, adıyla.
   (c) Listedeki model artık `tesisId` taşımıyorsa → kırmızı (ölü satır).
   (d) Her satır sınıflı ve gerekçeli; ertelenmiş kapanış taşır, kalıcı
       taşımaz.
   (e) Liste taban daldaki listenin ALT KÜMESİDİR — yalnız küçülür.
       Taban okunamıyorsa yerelde ATLANIR (gerekçesi yazılır), CI'da
       KIRMIZIDIR (`tests/bekci/sektor-terimi.test.ts` ile aynı kural).
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const IZIN_DOSYASI = 'tests/bekci/kapsam-omurga-izin.json';
const TABAN_DAL = process.env.BEKCI_TABAN?.trim() || 'origin/main';

type Satir = { model: string; tur: 'kalici' | 'ertelenmis'; sebep: string; kapanis?: string };
const izin = JSON.parse(readFileSync(path.join(KOK, IZIN_DOSYASI), 'utf8')) as { satirlar: Satir[] };
const SEMA = readFileSync(path.join(KOK, 'prisma/schema.prisma'), 'utf8');

/** B1'in öğeye bağladığı dokuz tablo — omurga tanımı bunları kapsamalı. */
const BEKLENEN_OMURGA = [
  'SurecKapsami', 'MaddeDurumu', 'UygulanabilirlikKarari', 'Istisna', 'KanitKapsami',
  'DenetciKapsami', 'DegerlendirmeAktarimi', 'UyumAnlik', 'Yetki',
];

type TabanYok = { yok: string };
function tabanListesi(): { satirlar: Satir[] } | TabanYok {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${TABAN_DAL}^{commit}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return { yok: `${TABAN_DAL} dalı okunamadı (sığ klon ya da eksik fetch)` };
  }
  let ham: string;
  try {
    // `<ref>:./yol` çalışma dizinine göre çözer; depo kökü `web/`in üstünde.
    ham = execFileSync('git', ['show', `${TABAN_DAL}:./${IZIN_DOSYASI}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    /* Taban dal listeyi henüz taşımıyor: cırcır SIFIRDAN başlar — boş
       liste. Yani ilk kurulumda da kimse satır ekleyemez. */
    return { satirlar: [] };
  }
  const j = JSON.parse(ham) as { satirlar?: unknown };
  return { satirlar: Array.isArray(j.satirlar) ? (j.satirlar as Satir[]) : [] };
}

describe('Bekçi · kapsam omurgası tesise çakılamaz [URN-KAP-001]', () => {
  const modeller = semaModelleri(SEMA);
  const omurga = omurgaModelleri(modeller);
  const ihlaller = omurgaIhlalleri(modeller);

  it('omurga tanımı şemadan türer ve dokuz tabloyu kapsar [URN-KAP-001]', () => {
    const eksik = BEKLENEN_OMURGA.filter((m) => !omurga.includes(m));
    expect(eksik, `omurgadan düşen tablo (kapsamOgesiId kaldırıldı mı?): ${eksik.join(' · ')}`)
      .toEqual([]);
  });

  it('omurga tablosunda doğrudan tesisId YOK — listede olmayan kolon adıyla kırmızı [URN-KAP-001]', () => {
    const izinli = new Set(izin.satirlar.map((s) => s.model));
    const yeni = ihlaller.filter((m) => !izinli.has(m));
    expect(yeni, [
      `omurga tablosuna doğrudan tesisId kondu: ${yeni.join(' · ')}.`,
      'Kapsam ekseni KAPSAM ÖĞESİDİR (B1); tesis köprüden sorulur',
      '(`kapsamOgesi: { tesisId }`). Kolonu kaldırın; izin listesi büyümez.',
    ].join('\n')).toEqual([]);
  });

  it('ölü satır yok — listedeki model artık tesisId taşımıyorsa liste küçülmeli [URN-KAP-001]', () => {
    const olu = izin.satirlar.map((s) => s.model).filter((m) => !ihlaller.includes(m));
    expect(olu, `temizlendi ama listeden düşmedi: ${olu.join(' · ')}`).toEqual([]);
  });

  it('her satır sınıflı ve kusuru anlatan gerekçeli; ertelenmiş kapanış taşır, kalıcı taşımaz [URN-KAP-001]', () => {
    for (const s of izin.satirlar) {
      expect(['kalici', 'ertelenmis'], `${s.model}: tür`).toContain(s.tur);
      expect(s.sebep.trim().length, `${s.model}: gerekçe`).toBeGreaterThan(20);
      if (s.tur === 'ertelenmis') expect(s.kapanis?.trim(), `${s.model}: kapanış aşaması yok`).toBeTruthy();
      else expect(s.kapanis, `${s.model}: kalıcı satır kapanış taşıyamaz`).toBeUndefined();
    }
  });

  it('liste taban dalın ALT KÜMESİDİR — cırcır yalnız küçülür [URN-KAP-001]', (ctx) => {
    const taban = tabanListesi();
    if ('yok' in taban) {
      if (process.env.CI) throw new Error(`CI'da taban dal okunamadı: ${taban.yok}`);
      ctx.skip(`ölçülmedi: ${taban.yok}`);
      return;
    }
    const tabanKumesi = new Set(taban.satirlar.map((s) => s.model));
    const eklenen = izin.satirlar.map((s) => s.model).filter((m) => !tabanKumesi.has(m));
    expect(eklenen, `izin listesine YENİ model eklendi (cırcır yalnız küçülür): ${eklenen.join(' · ')}`)
      .toEqual([]);
  });

  /* ── KALICI VAKALAR — sabotaj testin içinde yaşar ─────────────────── */
  it('kalıcı vaka: omurga tablosuna eklenen tesisId ayrıştırıcıda görünür [URN-KAP-001]', () => {
    const kirli = `model MaddeDurumu {\n  id String @id\n  kapsamOgesiId String\n  tesisId String // geri çakıldı\n}\n`
      + `model KapsamOgesi {\n  id String @id\n  tesisId String? @unique\n}\n`;
    expect(omurgaIhlalleri(semaModelleri(kirli))).toEqual(['MaddeDurumu']);
    const temiz = kirli.replace('  tesisId String // geri çakıldı\n', '');
    expect(omurgaIhlalleri(semaModelleri(temiz))).toEqual([]);
  });
});

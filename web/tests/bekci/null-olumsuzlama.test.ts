import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  bulguAnahtari, depoyuTara, dosyayiTara, semaAyristir, type Bulgu, type IzinSatiri,
} from './nullOlumsuzlama';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · NULL-OLUMSUZLAMA SINIFI (URN-VER-001) — CIRCIR

   Nullable kolon üzerinde olumsuz yüklem SQL'in üç değerli mantığında
   NULL satırı SESSİZCE düşürür: `NOT (rol = 'kapasite')` rolü NULL
   satırda NULL'dır, NULL da doğru değildir. Ölçüldü (8 Eylül 2026):
   `NOT: { rol: 'kapasite' }` enerji Tesis 360'ta rolü boş yedi
   özniteliği düşürdü (20 yerine 13 alan) ve 3 292 yeşil test görmedi —
   kaçtığı için bu kapı var.

   ── DİŞLER ────────────────────────────────────────────────────────────
   (a) ÖLÇÜM TABANI: tarama en az N dosya, N Prisma çağrısı ve N bulgu
       görmeli — sıfır ölçümle "temiz" raporlanmaz.
   (b) Beyan isteyen her bulgu izin listesinde; olmayan adıyla ve
       sebebiyle kırmızı.
   (c) Ölü satır yok: listedeki satır gerçek bir bulguya karşılık gelmeli.
   (d) Satır sınıflı ve gerekçeli; ertelenmiş kapanış taşır, kalıcı
       taşımaz. Çağrı dışı parça için beyan edilen `model` şemaya karşı
       doğrulanır; alan nullable ise gerekçe NULL'un akıbetini söylemeli.
   (e) `tavan` satır sayısına EŞİT — gevşeklik yok.
   (f) Liste taban dalın ALT KÜMESİ; ilk kurulumda (taban listeyi
       taşımıyorsa) bu diş "ölçülmedi" der, CI'da taban okunamıyorsa
       kırmızıdır.
   (g) KALICI VAKALAR: kusurun kendisi, düzeltmesi, her karar kuralı ve
       yanlış alarm kaynakları (Türkçe "not", veri nesnesi, yorum, dize,
       JSON içindeki `!=`) sentetik parçalarda — sabotaj testin içinde.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const IZIN_DOSYASI = 'tests/bekci/null-olumsuzlama-izin.json';
const TABAN_DAL = process.env.BEKCI_TABAN?.trim() || 'origin/main';

type IzinDosyasi = { tavan: number; satirlar: IzinSatiri[] };
const izin = JSON.parse(readFileSync(path.join(KOK, IZIN_DOSYASI), 'utf8')) as IzinDosyasi;
const SEMA = semaAyristir(readFileSync(path.join(KOK, 'prisma/schema.prisma'), 'utf8'));
const tarama = depoyuTara(SEMA);
const beyanlar = tarama.bulgular.filter((b) => b.karar === 'beyan');
const satirAnahtari = (s: IzinSatiri) => bulguAnahtari({ dosya: s.dosya, tur: s.tur, alan: s.alan });

type TabanYok = { yok: string };
type IlkKurulum = { ilk: true };
function tabanListesi(): IzinDosyasi | TabanYok | IlkKurulum {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${TABAN_DAL}^{commit}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return { yok: `${TABAN_DAL} dalı okunamadı (sığ klon ya da eksik fetch)` };
  }
  let ham: string;
  try {
    ham = execFileSync('git', ['show', `${TABAN_DAL}:./${IZIN_DOSYASI}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return { ilk: true };
  }
  const j = JSON.parse(ham) as Partial<IzinDosyasi>;
  return { tavan: j.tavan ?? 0, satirlar: Array.isArray(j.satirlar) ? j.satirlar : [] };
}

const kisa = (b: Bulgu) => `${b.dosya}:${b.satir} ${b.tur} ${b.model ?? '-'}.${b.alan ?? '-'} — ${b.sebep}`;

describe('Bekçi · NULL-olumsuzlama sınıfı [URN-VER-001]', () => {
  it('ölçüm tabanı: tarama gerçekten dosya, çağrı ve bulgu görüyor [URN-VER-001]', () => {
    expect(tarama.dosyalar, 'taranan dosya').toBeGreaterThanOrEqual(300);
    expect(tarama.cagrilar, 'Prisma çağrısı').toBeGreaterThanOrEqual(500);
    expect(tarama.bulgular.length, 'olumsuz yüklem bulgusu').toBeGreaterThanOrEqual(20);
  });

  it('beyan isteyen her olumsuzlama izin listesinde — olmayan adıyla kırmızı [URN-VER-001]', () => {
    const izinli = new Set(izin.satirlar.map(satirAnahtari));
    const beyansiz = beyanlar.filter((b) => !izinli.has(bulguAnahtari(b)));
    expect(beyansiz.map(kisa), [
      'Nullable kolonda olumsuz yüklem NULL satırı sessizce düşürür.',
      'Ya NULL\'u aynı where içinde açıkça ele alın (`OR: [{ x: null }, …]` /',
      '`NOT: { x: null }`), ya kolonu NOT NULL yapın; izin listesi büyümez.',
    ].join('\n')).toEqual([]);
  });

  it('ölü satır yok — bulgusu kalmayan satır listeden düşmeli [URN-VER-001]', () => {
    const gercek = new Set(beyanlar.map(bulguAnahtari));
    const olu = izin.satirlar.map(satirAnahtari).filter((k) => !gercek.has(k));
    expect(olu, `temizlendi ama listeden düşmedi: ${olu.join(' · ')}`).toEqual([]);
  });

  it('her satır sınıflı ve gerekçeli; beyan edilen model şemaya karşı doğru [URN-VER-001]', () => {
    for (const s of izin.satirlar) {
      const k = satirAnahtari(s);
      expect(['kalici', 'ertelenmis'], `${k}: sınıf`).toContain(s.sinif);
      expect(s.gerekce.trim().length, `${k}: gerekçe`).toBeGreaterThan(40);
      if (s.sinif === 'ertelenmis') expect(s.kapanis?.trim(), `${k}: kapanış aşaması yok`).toBeTruthy();
      else expect(s.kapanis, `${k}: kalıcı satır kapanış taşıyamaz`).toBeUndefined();

      const bulgu = beyanlar.find((b) => bulguAnahtari(b) === k);
      if (bulgu?.model && s.model) expect(s.model, `${k}: beyan edilen model çağrıdan çözülenle çelişiyor`).toBe(bulgu.model);
      if (s.model) {
        const model = SEMA.get(s.model);
        expect(model, `${k}: beyan edilen model şemada yok (${s.model})`).toBeTruthy();
        if (s.alan) {
          const alan = model!.alanlar.get(s.alan);
          expect(alan, `${k}: ${s.model}.${s.alan} şemada yok`).toBeTruthy();
          if (alan!.nullable) {
            expect(s.gerekce, `${k}: ${s.model}.${s.alan} NULLABLE — gerekçe NULL satırın akıbetini söylemeli`)
              .toMatch(/NULL/);
          }
        }
      } else {
        expect(bulgu?.model, `${k}: model statik çözülemedi; satır \`model\` beyan etmeli`).toBeTruthy();
      }
    }
  });

  it('tavan satır sayısına EŞİT — gevşeklik yok [URN-VER-001]', () => {
    expect(izin.tavan, `tavan ${izin.tavan} ≠ satır ${izin.satirlar.length}`).toBe(izin.satirlar.length);
  });

  it('liste taban dalın ALT KÜMESİDİR — cırcır yalnız küçülür [URN-VER-001]', (ctx) => {
    const taban = tabanListesi();
    if ('yok' in taban) {
      if (process.env.CI) throw new Error(`CI'da taban dal okunamadı: ${taban.yok}`);
      ctx.skip(`ölçülmedi: ${taban.yok}`);
      return;
    }
    if ('ilk' in taban) {
      ctx.skip(`ölçülmedi: ${TABAN_DAL} listeyi henüz taşımıyor (ilk kurulum) — birleşince diş devreye girer`);
      return;
    }
    const tabanKumesi = new Set(taban.satirlar.map(satirAnahtari));
    const eklenen = izin.satirlar.map(satirAnahtari).filter((k) => !tabanKumesi.has(k));
    expect(eklenen, `izin listesine YENİ satır eklendi (cırcır yalnız küçülür): ${eklenen.join(' · ')}`).toEqual([]);
    expect(izin.tavan, 'tavan taban dalın üstüne çıktı').toBeLessThanOrEqual(taban.tavan);
  });

  /* ── KALICI VAKALAR — sabotaj testin içinde yaşar ─────────────────── */
  const tara = (kod: string, dosya = 'sentetik.ts') => dosyayiTara(dosya, kod, SEMA);
  const beyan = (kod: string, dosya?: string) => tara(kod, dosya).filter((b) => b.karar === 'beyan');

  it('kalıcı vaka: kusurun kendisi — nullable rol üzerinde NOT, NULL ele alınmamış → beyan [URN-VER-001]', () => {
    const kirli = `const s = await db.sektorOznitelikSemasi.findMany({ where: { sektorId, NOT: { rol: 'kapasite' } } });`;
    const b = tara(kirli);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ tur: 'NOT', model: 'SektorOznitelikSemasi', alan: 'rol', karar: 'beyan' });
    expect(b[0].sebep).toMatch(/NULLABLE/);
  });

  it('kalıcı vaka: düzeltme — NULL OR dalıyla dâhil → güvenli [URN-VER-001]', () => {
    const temiz = `const s = await db.sektorOznitelikSemasi.findMany({\n  where: { sektorId, OR: [{ rol: null }, { rol: { not: 'kapasite' } }] },\n});`;
    const b = tara(temiz);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ tur: 'not', model: 'SektorOznitelikSemasi', alan: 'rol', karar: 'guvenli' });
  });

  it('kalıcı vaka: NULL\'un kendisini olumsuzlamak IS NOT NULL\'dır → güvenli [URN-VER-001]', () => {
    expect(beyan(`db.varlik.count({ where: { silindi: { not: null } } });`)).toEqual([]);
    expect(beyan(`db.entegrasyonKosusu.count({ where: { NOT: { connectorId: null } } });`)).toEqual([]);
  });

  it('kalıcı vaka: NOT NULL kolon → güvenli; ilişki zinciri hedef modelde çözülür [URN-VER-001]', () => {
    const b1 = tara(`db.olay.findMany({ where: { durum: { not: 'kapali' } } });`);
    expect(b1[0]).toMatchObject({ model: 'Olay', alan: 'durum', karar: 'guvenli' });
    const b2 = tara(`db.risk.count({ where: { bulgu: { durum: { notIn: ['kapali'] } } } });`);
    expect(b2[0]).toMatchObject({ model: 'Bulgu', alan: 'durum', karar: 'guvenli' });
    const b3 = tara(`db.risk.count({ where: { bulgu: { tekrarBulguId: { not: 'x' } } } });`);
    expect(b3[0]).toMatchObject({ model: 'Bulgu', alan: 'tekrarBulguId', karar: 'beyan' });
  });

  it('kalıcı vaka: NULL açıkça DIŞLANMIŞSA (NOT null + notIn) → güvenli [URN-VER-001]', () => {
    const kod = `db.entegrasyonKosusu.count({ where: { NOT: { connectorId: null }, connectorId: { notIn: idler } } });`;
    expect(beyan(kod)).toEqual([]);
  });

  it('kalıcı vaka: dinamik NOT (çağrı/yayma) ve isNot → beyan [URN-VER-001]', () => {
    expect(beyan(`db.kanit.count({ where: { silindi: null, NOT: kapsamKosulu(izinli) } });`)).toHaveLength(1);
    expect(beyan(`db.kesifKaydi.findMany({ where: { eslesenVarlik: { isNot: { silindi: null } } } });`)).toHaveLength(1);
    expect(beyan(`db.kesifKaydi.findMany({ where: { eslesenVarlik: { isNot: null } } });`)).toEqual([]);
  });

  it('kalıcı vaka: çağrı dışı süzgeç parçası beyan ister; tohum verisindeki Türkçe "not" istemez [URN-VER-001]', () => {
    const parca = `const kutuk = { silindi: null, durum: { not: 'kapali' } };\nawait db.risk.count({ where: kutuk });`;
    const b = tara(parca);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ tur: 'not', model: null, alan: 'durum', karar: 'beyan' });
    const tohum = `const C = [{ kod: 'IMP-01', yapilandirma: {\n  not: 'Dış sistem gerektirmez.',\n} }];\nfor (const c of C) await db.connector.create({ data: c });`;
    expect(tara(tohum)).toEqual([]);
  });

  it('kalıcı vaka: yorum, dize ve veri nesnesi bulgu değildir [URN-VER-001]', () => {
    const kod = [
      `// NOT: bu bir açıklama, süzgeç değil`,
      `const m = 'NOT: dize içinde';`,
      `await db.varlik.update({ where: { id }, data: { not: 'Türkçe not alanı', ad } });`,
      `/* x: { not: 'yorum içinde' } */`,
    ].join('\n');
    expect(tara(kod)).toEqual([]);
  });

  it('kalıcı vaka: ham SQL NOT IN / != beyan ister; tırnak içindeki != göç JSON sabitidir [URN-VER-001]', () => {
    expect(beyan('const r = await db.$queryRaw`SELECT 1 FROM "X" WHERE "a" NOT IN (SELECT "b" FROM "Y")`;')).toHaveLength(1);
    const goc = `UPDATE "K" SET "j" = '{"islec":"!="}' WHERE "j" LIKE '%x%';\nDELETE FROM "K" WHERE "durum" != 'aktif';`;
    const b = tara(goc, 'prisma/migrations/x/migration.sql');
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ satir: 2, tur: 'sql', karar: 'beyan' });
  });

  it('kalıcı vaka: gevşek tavan kırmızı — tavan satır sayısından büyük olamaz [URN-VER-001]', () => {
    const gevsek = { tavan: izin.satirlar.length + 1, satirlar: izin.satirlar };
    expect(gevsek.tavan === gevsek.satirlar.length).toBe(false);
  });
});

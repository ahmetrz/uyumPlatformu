import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { MADDE_BAG_ILISKILERI } from '@/lib/paket/kur';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · PAKET İŞLEMLERİ MÜŞTERİ VERİSİNİ SİLEMEZ (R-C · URN-PKT-010)

   Kural yazılıydı ("kaldırma = arşiv, silme yok") ve kod ihlal etti:
   `madde.deleteMany` kiracının kapsam alanı eşlemesini kaskatla siliyordu
   (PR #41 inceleme bulgusu). Kural yetmedi, kapı gerekti. Bu bekçinin
   TAVANI SIFIRDIR ve gerekçeli istisna listesi YOKTUR:

   (a) `lib/paket/` ve paket eylemleri içinde `delete`/`deleteMany`
       yalnız paketin KENDİ taslak maddesini (`madde`, `surumId` süzgeçli)
       hedefleyebilir; başka her model için sayı sıfırdır;
   (b) şemada `Madde`den BAŞKA bir modele giden her liste ilişkisi taslak
       yenileme bağ kontrolünde (`MADDE_BAG_ILISKILERI`) olmak zorundadır —
       yeni ilişki eklenip unutulursa kırmızı; Madde→Madde öz-ilişki tipten
       okunur, istisna değildir.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const PAKET_DOSYALARI = [
  ...readdirSync(path.join(KOK, 'lib/paket')).filter((d) => d.endsWith('.ts')).map((d) => `lib/paket/${d}`),
  'lib/eylemler2/paket.ts',
];

type SilmeCagrisi = { dosya: string; satir: number; model: string; where: string };

/** Yorum ve dize maskelemeden kaba tarama yeter: paket modülü küçük ve
    `delete` sözcüğü yorumda geçse bile `.delete(` biçimi geçmez. */
function silmeCagrilari(dosya: string): SilmeCagrisi[] {
  const metin = readFileSync(path.join(KOK, dosya), 'utf8');
  const sonuc: SilmeCagrisi[] = [];
  const satirNo = (i: number) => metin.slice(0, i).split('\n').length;
  for (const m of metin.matchAll(/\b(?:tx|db|istemci)\.(\w+)\.(?:delete|deleteMany)\s*\(([\s\S]{0,160})/g)) {
    sonuc.push({ dosya, satir: satirNo(m.index), model: m[1], where: m[2] });
  }
  /* İÇ İÇE YAZMA (`update({ data: { maddeler: { deleteMany: {} } } })`) ilişkili
     satırı GERÇEKTEN siler ve PR #41'in kapattığı kaskat kusurunun eşdeğerini
     üretir; ilk tarama yalnız `tx.model.delete(` biçimini görüyordu (bağımsız
     inceleme bulgusu, PR #43). Ham SQL de aynı kapıdan geçer. */
  for (const m of metin.matchAll(/(\w+)\s*:\s*\{\s*(?:delete|deleteMany)\s*:/g)) {
    sonuc.push({ dosya, satir: satirNo(m.index), model: m[1], where: 'iç içe yazma (nested delete)' });
  }
  for (const m of metin.matchAll(/\$(?:executeRaw|queryRaw)(?:Unsafe)?[\s\S]{0,200}?DELETE\s+FROM\s+"?(\w+)/gi)) {
    sonuc.push({ dosya, satir: satirNo(m.index), model: m[1], where: 'ham SQL DELETE' });
  }
  return sonuc;
}

describe('Bekçi · paket işlemleri müşteri verisini silemez [URN-PKT-010]', () => {
  const cagrilar = PAKET_DOSYALARI.flatMap(silmeCagrilari);

  it('ölçüm tabanı: paket modülü dosyaları okunuyor', () => {
    expect(PAKET_DOSYALARI.length).toBeGreaterThanOrEqual(5);
    expect(cagrilar.length, 'kurucunun bilinen tek silmesi (taslak madde yenileme) görünmeli').toBeGreaterThanOrEqual(1);
  });

  it('madde dışında HİÇBİR modelde delete/deleteMany yok — tavan sıfır, istisna listesi yok [URN-PKT-010]', () => {
    const yasak = cagrilar.filter((c) => c.model !== 'madde');
    expect(yasak.map((c) => `${c.dosya}:${c.satir} ${c.model}`), 'paket işlemi müşteri verisini silemez; arşivler').toEqual([]);
  });

  it('madde silmesi yalnız paketin kendi taslağını (`surumId` süzgeci) hedefler ve bağ kontrolünden sonra gelir [URN-PKT-010]', () => {
    const maddeSilme = cagrilar.filter((c) => c.model === 'madde');
    expect(maddeSilme).toHaveLength(1);
    expect(maddeSilme[0].where).toMatch(/where:\s*\{\s*surumId:/);
    const kur = readFileSync(path.join(KOK, 'lib/paket/kur.ts'), 'utf8');
    const bagKontrolu = kur.indexOf('MADDE_BAG_ILISKILERI.map(');
    const silme = kur.indexOf('tx.madde.deleteMany(');
    expect(bagKontrolu).toBeGreaterThan(0);
    expect(silme, 'deleteMany bağ kontrolünden ÖNCE olamaz').toBeGreaterThan(bagKontrolu);
  });

  it('şemada Madde\'den başka modele giden HER liste ilişkisi bağ kontrolünde; listede şemada olmayan ilişki yok [URN-PKT-010]', () => {
    const sema = readFileSync(path.join(KOK, 'prisma/schema.prisma'), 'utf8');
    const model = /\nmodel Madde \{([\s\S]*?)\n\}/.exec(sema)?.[1] ?? '';
    const listeler = [...model.matchAll(/^\s+(\w+)\s+(\w+)\[\]/gm)].map((m) => ({ ad: m[1], hedef: m[2] }));
    expect(listeler.length, 'ölçüm tabanı: Madde liste ilişkileri okunamadı').toBeGreaterThanOrEqual(10);
    const kontrol = MADDE_BAG_ILISKILERI as readonly string[];
    const eksik = listeler.filter((l) => l.hedef !== 'Madde' && !kontrol.includes(l.ad)).map((l) => l.ad);
    expect(eksik, 'kiracı verisine giden ilişki bağ kontrolünde değil — deleteMany kaskatla silerdi').toEqual([]);
    const adlar = listeler.map((l) => l.ad);
    for (const k of kontrol) expect(adlar, `${k} şemada yok — ölü giriş`).toContain(k);
    expect(kontrol).toContain('alanlar');
  });

  it('PAKETİN KURDUĞU model, İNSAN KARARI taşıyan modele KASKAT AKMAZ [URN-PKT-010]', () => {
    /* ── SINIFI KAPAT, ÖRNEĞİ DEĞİL ────────────────────────────────────
       Bu bekçi yalnız `model Madde`nin liste ilişkilerini tarıyordu ve
       bağımsız inceleme (PR #50 tur 1) kökün başka olabileceğini
       gösterdi: `MevzuatKaynagi` de PAKETİN KURDUĞU bir modeldir ve
       `MevzuatDegisiklikAdayi`ye `Cascade` ile bağlıydı — karara
       bağlanmış adaylar (durum · kararVeren · gerekçe) kaynakla birlikte
       silinebilirdi.

       Kural artık TÜRETİLİR, iki listeden:
         PAKETİN KURDUĞU MODEL  — köken sütunu taşır (`paketSurumId`
                                  ya da `paketKodu`)
         İNSAN KARARI TAŞIYAN   — karar/gerekçe sütunu taşır
       Bu ikisi arasında `onDelete: Cascade` KIRMIZIDIR. Elle liste
       tutulsaydı, on ikinci model eklendiği gün bekçi ona hiç bakmazdı.

       Tavan SIFIR, gerekçeli istisna YOK — R-C'nin kendi şartı. */
    const sema = readFileSync(path.join(KOK, 'prisma/schema.prisma'), 'utf8');
    const modeller = [...sema.matchAll(/\nmodel (\w+) \{([\s\S]*?)\n\}/g)]
      .map((m) => ({ ad: m[1], govde: m[2] }));
    expect(modeller.length, 'ölçüm tabanı: şema modelleri okunamadı')
      .toBeGreaterThan(50);

    const KOKEN = /^\s+(paketSurumId|paketKodu)\s+String\??/m;
    const KARAR = /^\s+(kararVerenId|kararZamani|onaylayanId|gerekce|uygulanmazGerekcesi|redGerekcesi|muafiyetGerekcesi)\s+/m;
    const paketli = modeller.filter((m) => KOKEN.test(m.govde)).map((m) => m.ad);
    const kararli = modeller.filter((m) => KARAR.test(m.govde)).map((m) => m.ad);
    expect(paketli.length, 'ölçüm tabanı: paket kökenli model bulunamadı')
      .toBeGreaterThanOrEqual(10);
    expect(kararli.length, 'ölçüm tabanı: karar taşıyan model bulunamadı')
      .toBeGreaterThanOrEqual(10);
    expect(paketli).toContain('Regulasyon');
    expect(kararli).toContain('MevzuatDegisiklikAdayi');

    const kusur: string[] = [];
    for (const m of modeller) {
      if (!kararli.includes(m.ad)) continue;
      for (const r of m.govde.matchAll(
        /^\s+(\w+)\s+(\w+)\??\s+@relation\(([^)]*onDelete:\s*Cascade[^)]*)\)/gm)) {
        if (paketli.includes(r[2])) kusur.push(`${m.ad}.${r[1]} → ${r[2]}`);
      }
    }
    expect(kusur, ['paket kökenli bir kaydın silinmesi İNSAN KARARINI kaskatla siler:',
      kusur.join(' · '),
      'R-C: paket işlemi müşteri verisini silemez; ilişki `Restrict` olmalı.',
    ].join('\n')).toEqual([]);
  });

  it('istisna listesi yok: kurucu modülü gerekçeli dışlama ihraç etmez [URN-PKT-010]', async () => {
    const kur = (await import('@/lib/paket/kur')) as Record<string, unknown>;
    expect(kur.MADDE_BAG_DISI, 'R-C: gerekçeli istisna kabul edilmez').toBeUndefined();
  });
});

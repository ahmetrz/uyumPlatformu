import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sektorKolonlari, semaModelleri } from './semaBekcisi';
import { terimleriBul } from './terimler';
import { ENERJI_PROFIL_OZNITELIKLERI } from '../../prisma/kapsam-ogesi';
import { KURULU_GUC } from '@/lib/alan/oznitelik';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · sektöre özgü alan çekirdek kolonu OLMAZ (B2 · URN-KAP-002)
   KALICI KURAL — cırcır değil, tavan sıfır, borç kütüğü yok.

   `TesisProfili` sekiz enerji kolonu taşıyordu (lisans, kabul, black
   start, TEİAŞ, seri haberleşme, EPDK kritiklik sınıfı): bu, kuralın
   ihlaliydi. B2 onları paketin öznitelik şemasına taşıdı. Bu bekçi geri
   gelmelerini iki yoldan engeller:

   (a) PAKET ANAHTARI KOLON OLAMAZ — kurulu paketlerin beyan ettiği
       öznitelik anahtarlarıyla aynı adlı çekirdek kolon kırmızıdır.
       Anahtar listesi paketlerin KENDİ beyanından türer (enerji şeması,
       kurulu güç, günlük debi); elle liste tutulmaz.
   (b) SEKTÖR TERİMİ KOLON ADINDA OLAMAZ — model ve alan adları sektör
       terimi kalıplarına (`tests/bekci/terimler.ts`) karşı taranır.
       Yorumlar taranmaz: şema yorumu "tesis → santral" örneğini
       vermek zorunda; kolon adı vermek zorunda değil.

   Kalıcı vakalar sabotajı içinde taşır: kirli bir şema parçası kırmızı,
   temizlenmiş hâli yeşil olmalıdır.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const SEMA = readFileSync(path.join(KOK, 'prisma/schema.prisma'), 'utf8');

/** Kurulu paketlerin öznitelik anahtarları — tohum kaynağından. Su
    paketinin anahtarı (`gunlukDebi`) `prisma/seed-su.ts` sabitinden
    okunur; sabit adı değişirse bu okuma sıfır döner ve aşağıdaki sayım
    dişi kırmızı olur — liste sessizce kısalamaz. */
function paketAnahtarlari(): string[] {
  const su = readFileSync(path.join(KOK, 'prisma/seed-su.ts'), 'utf8');
  const debi = /GUNLUK_DEBI\s*=\s*'([A-Za-z0-9_]+)'/.exec(su)?.[1];
  return [
    ...ENERJI_PROFIL_OZNITELIKLERI.map((o) => o.anahtar),
    KURULU_GUC,
    ...(debi ? [debi] : []),
  ];
}

describe('Bekçi · sektöre özgü alan çekirdek kolonu olmaz [URN-KAP-002]', () => {
  const modeller = semaModelleri(SEMA);
  const anahtarlar = paketAnahtarlari();

  it('paket anahtarları ölçülüyor — liste sessizce kısalamaz [URN-KAP-002]', () => {
    expect(modeller.length).toBeGreaterThan(50);
    expect(anahtarlar.length).toBeGreaterThanOrEqual(10);
    expect(anahtarlar).toContain('blackStart');
    expect(anahtarlar).toContain('kritiklikSinifi');
    expect(anahtarlar).toContain(KURULU_GUC);
  });

  it('paketin beyan ettiği anahtarla aynı adlı çekirdek kolon YOK [URN-KAP-002]', () => {
    const bulgular = sektorKolonlari(modeller, anahtarlar).map((b) => `${b.model}.${b.alan}`);
    expect(bulgular, [
      `sektöre özgü alan çekirdek kolonu oldu: ${bulgular.join(' · ')}.`,
      'Kalıcı kural: paket anahtarı `SektorOznitelikSemasi` satırı + `TesisOzellik`',
      'değeridir; çekirdek şemaya kolon olarak giremez.',
    ].join('\n')).toEqual([]);
  });

  it('model ve alan adlarında sektör terimi YOK [URN-KAP-002]', () => {
    const kirli: string[] = [];
    for (const m of modeller) {
      const bulunan = terimleriBul('prisma/schema.prisma', [m.ad, ...m.alanlar].join('\n'));
      if (bulunan.length) kirli.push(`${m.ad} (${bulunan.map((b) => b.terim).join(', ')})`);
    }
    expect(kirli, `çekirdek şema tanımlayıcısında sektör terimi: ${kirli.join(' · ')}`).toEqual([]);
  });

  /* ── KALICI VAKALAR ────────────────────────────────────────────────── */
  it('kalıcı vaka: geri eklenen `blackStart` kolonu ve `santralKodu` alanı kırmızı, temiz şema yeşil [URN-KAP-002]', () => {
    const kirli = 'model TesisProfili {\n  id String @id\n  blackStart Boolean?\n  iotVar Boolean?\n}\n'
      + 'model Tesis {\n  id String @id\n  santralKodu String\n}\n';
    const m = semaModelleri(kirli);
    expect(sektorKolonlari(m, anahtarlar)).toEqual([{ model: 'TesisProfili', alan: 'blackStart' }]);
    expect(terimleriBul('prisma/schema.prisma', 'Tesis\nid\nsantralKodu').map((b) => b.terim)).toContain('santral');
    const temiz = semaModelleri('model TesisProfili {\n  id String @id\n  iotVar Boolean?\n}\n');
    expect(sektorKolonlari(temiz, anahtarlar)).toEqual([]);
    expect(terimleriBul('prisma/schema.prisma', 'TesisProfili\nid\niotVar')).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/* ═══════════════════════════════════════════════════════════════════════
   ÇEKİRDEK SÖZCÜK CIRCIRI — B listesinin dişi (URN-ALN-003)

   A listesi (bekçi izin listesi) cırcırlıydı: dosya eklenemez, temizlenen
   düşmek zorunda. B listesi (sınıf taraması) ilk ölçümde DİŞSİZDİ — sayı
   düşse de düştüğünü kimse garanti etmiyor, geri tırmanışı kimse
   görmüyordu. "Hiçbir şeyin korumadığı bir sayıyı düşürmek" ölçüm değil
   temennidir.

   Kural A ile AYNI:
     · dosya başına sayı ARTAMAZ,
     · listeye YENİ DOSYA eklenemez,
     · sayı düşerse taban güncellenmek ZORUNDA.

   Üçüncüsü olmadan taban bayatlar ve gösterge yalan söyler — bu depoda
   `rotalar.json` ve izin listesi aynı dersi verdi.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = path.join(__dirname, '..', '..');
const TABAN: { toplam: number; dosyalar: Record<string, number> } =
  JSON.parse(readFileSync(path.join(KOK, 'arac', 'cekirdek-sozcuk-taban.json'), 'utf8'));

/** Taramayı koşar ve dosya başına bulgu sayısını döner. */
function olc(): Record<string, number> {
  const cikti = execFileSync('npx', ['tsx', 'arac/cekirdek-sozcuk-taramasi.mjs', '--json'],
    { cwd: KOK, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const bulgular: { dosya: string }[] = JSON.parse(cikti);
  const say: Record<string, number> = {};
  for (const b of bulgular) say[b.dosya] = (say[b.dosya] ?? 0) + 1;
  return say;
}

describe('Çekirdek sözcük cırcırı [URN-ALN-003]', () => {
  const olculen = olc();

  it('YENİ DOSYA eklenemez — çakılı sözcük yeni bir yere giremez [URN-ALN-003]', () => {
    const yeni = Object.keys(olculen).filter((d) => !(d in TABAN.dosyalar));
    expect(yeni, `tabanda olmayan dosyada çakılı çekirdek sözcük: ${yeni.join(' · ')}`)
      .toEqual([]);
  });

  it('dosya başına sayı ARTAMAZ [URN-ALN-003]', () => {
    const artan = Object.entries(olculen)
      .filter(([d, n]) => n > (TABAN.dosyalar[d] ?? 0))
      .map(([d, n]) => `${d} ${TABAN.dosyalar[d] ?? 0}→${n}`);
    expect(artan, `çakılı sözcük ARTTI: ${artan.join(' · ')}`).toEqual([]);
  });

  it('DÜŞEN sayı tabana yazılmalı — bayat taban gösterge değildir [URN-ALN-003]', () => {
    const dusen = Object.entries(TABAN.dosyalar)
      .filter(([d, n]) => (olculen[d] ?? 0) < n)
      .map(([d, n]) => `${d} ${n}→${olculen[d] ?? 0}`);
    expect(dusen,
      'Temizlendi ama taban güncellenmedi. Koşun: '
      + `npx tsx arac/cekirdek-sozcuk-taramasi.mjs --taban  ·  ${dusen.join(' · ')}`)
      .toEqual([]);
  });

  it('toplam taban ölçümle tutuyor [URN-ALN-003]', () => {
    const toplam = Object.values(olculen).reduce((a, b) => a + b, 0);
    expect(toplam, 'taban toplamı sapmış — --taban ile güncelleyin').toBe(TABAN.toplam);
  });
});

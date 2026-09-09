import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { taranacakKaynaklar } from './nullOlumsuzlama';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · PASİF SÖZLÜK / ÖZNİTELİK SATIRI EKRANA İNMEZ (2.1 · URN-PKT-011)

   `SektorSozlugu.aktif` ve `SektorOznitelikSemasi.aktif` paket
   yükseltmesinde ve kaldırmada false olur; satır SİLİNMEZ (R-C). Bayrağın
   anlamı okuyucuda kurulur: her okuma sorgusu `aktif: true` süzmelidir —
   yoksa pasif sözcük ekranda konuşmaya, pasif öznitelik çizilmeye devam
   eder ve bayrak süs olur. Kurucu (`lib/paket/`) ve sözlük takas aracı
   (geliştirme aracı, tabloyu bütün olarak yazar) kapsam dışıdır.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const KAPSAM_DISI = [/^lib\/paket\//, /^arac\//, /^prisma\//];
const OKUMA = /\b(?:db|tx|istemci)\.(sektorSozlugu|sektorOznitelikSemasi)\.(findMany|findFirst|findUnique|count)\s*\(/g;

type Sorgu = { dosya: string; satir: number; model: string; islem: string; govde: string };

function sorgular(): Sorgu[] {
  const sonuc: Sorgu[] = [];
  // üretim kaynakları (app · components · lib · arac · prisma) — testler ve kurucu kapsam dışı
  for (const dosya of taranacakKaynaklar()) {
    const goreli = path.relative(KOK, dosya).split(path.sep).join('/');
    if (!/\.(ts|tsx)$/.test(goreli) || KAPSAM_DISI.some((k) => k.test(goreli))) continue;
    const metin = readFileSync(dosya, 'utf8');
    for (const m of metin.matchAll(OKUMA)) {
      sonuc.push({ dosya: goreli, satir: metin.slice(0, m.index).split('\n').length, model: m[1], islem: m[2],
        govde: metin.slice(m.index! + m[0].length, m.index! + m[0].length + 400) });
    }
  }
  return sonuc;
}

describe('Bekçi · sözlük ve öznitelik okuyucuları yalnız aktif satırı görür [URN-PKT-011]', () => {
  const tum = sorgular();

  it('ölçüm tabanı: okuyucu sorguları gerçekten bulunuyor', () => {
    expect(tum.length, 'sözlük/öznitelik okuma sorgusu sıfır olamaz — tarama boş bakıyor').toBeGreaterThanOrEqual(5);
  });

  it('her okuma sorgusu `aktif: true` süzer — pasif satır ekrana inmez [URN-PKT-011]', () => {
    const suzgecsiz = tum.filter((s) => !/aktif:\s*true/.test(s.govde));
    expect(suzgecsiz.map((s) => `${s.dosya}:${s.satir} ${s.model}.${s.islem}`), 'aktif süzgeci olmayan okuyucu').toEqual([]);
  });
});

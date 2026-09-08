/* ═══════════════════════════════════════════════════════════════════════
   SU / ATIKSU SEKTÖR PAKETİ — ikinci sektör (demo · Faz 2)

   NİÇİN VAR: sektör bağımsızlığı bugüne kadar KODDA vardı ve EKRANDA
   görünmüyordu. Tek sektörlü bir kurulumda "çekirdek sektör bilmez"
   cümlesi kanıtlanamaz; kanıt, ikinci sektörün aynı ekranlarda kendi
   sözcüğü ve kendi ÖLÇÜ BİRİMİYLE açılmasıdır.

   ── VERİ KURGUSALDIR ──────────────────────────────────────────────────
   Depo halka açıktır. Buradaki hiçbir kurum, tesis ya da kişi adı gerçek
   değildir ve gerçek bir işletmeye karşılık gelmez. Adlandırma enerji
   tarafıyla aynı kalıbı izler ("Saha A-1"): kurgusallığı okur okumaz
   belli olan, coğrafi olarak tekil olmayan adlar.

   ── BİLİNMEYEN ≠ SIFIR ────────────────────────────────────────────────
   Debisi ölçülmemiş tesis öznitelik satırı ALMAZ; ekran "ölçülmedi" der.
   Sıfır yazmak ya da ortalama atamak, demoda ürünün en ayırt edici
   davranışını gizlerdi. Bir tesis bilerek ölçümsüz bırakıldı.

   ── BİRİM NEDEN ÖNEMLİ ────────────────────────────────────────────────
   Enerji `MW`, su `m³/gün` taşır. `birimliToplam` farklı birimleri
   TOPLAMAZ; iki sektörlü bir kapsamda portföy toplamı bilerek "karışık
   birim" der. Bu bir kusur değil, ölçünün dürüstlüğüdür ve demoda
   gösterilebilir.
   ═══════════════════════════════════════════════════════════════════════ */

import type { PrismaClient } from '../lib/prisma-client/client';
import { SU_SOZLUGU } from './sozlukler';

const G = 86_400_000;
const gun = (n: number) => new Date(Date.now() + n * G);

/** Su sektörünün birincil ölçüsü — şemadan gelir, koda gömülü değildir. */
export const GUNLUK_DEBI = 'gunlukDebi';

/* Tesis tipleri: su/atıksu işinin kendi tipleri. Enerji tiplerinin
   çevirisi DEĞİL — "arıtma" ile "santral" aynı şeyin iki adı değildir. */
const SU_TIPLERI = [
  ['ICME-ARITMA', 'İçme Suyu Arıtma', 1],
  ['ATIKSU-ARITMA', 'Atıksu Arıtma', 2],
  ['TERFI', 'Terfi Merkezi', 3],
  ['DEPO', 'Su Deposu', 4],
  ['SU-MERKEZ', 'Merkez BT', 9],
] as const;

/* kod, ad, tip, günlük debi (m³/gün · null = ÖLÇÜLMEDİ), konum, durum, devreye giriş */
const SU_TESISLERI = [
  ['SU-A1', 'Saha A-1 İçme Suyu Arıtma', 'ICME-ARITMA', 120_000, 'Kuzey Bölge', 'aktif', -4200],
  ['SU-A2', 'Saha A-2 İçme Suyu Arıtma', 'ICME-ARITMA', 64_000, 'Kuzey Bölge', 'aktif', -3100],
  ['SU-B1', 'Saha B-1 Atıksu Arıtma', 'ATIKSU-ARITMA', 85_000, 'Merkez Bölge', 'aktif', -5400],
  ['SU-B2', 'Saha B-2 Atıksu Arıtma', 'ATIKSU-ARITMA', 38_500, 'Merkez Bölge', 'aktif', -2600],
  ['SU-C1', 'Saha C-1 Terfi Merkezi', 'TERFI', 24_000, 'Güney Bölge', 'aktif', -3800],
  ['SU-C2', 'Saha C-2 Terfi Merkezi', 'TERFI', 11_200, 'Güney Bölge', 'aktif', -1900],
  /* Debisi ÖLÇÜLMEMİŞ: telemetri hattı yok. Sıfır yazılmaz, satır açılmaz. */
  ['SU-D1', 'Saha D-1 Su Deposu', 'DEPO', null, 'Güney Bölge', 'aktif', -6100],
  ['SU-MERKEZ-BT', 'Demo Su Genel Müdürlük', 'SU-MERKEZ', null, 'Merkez Bölge', 'aktif', -5000],
] as const;

export async function suSektoru(db: PrismaClient) {
  const su = await db.sektor.create({
    data: { kod: 'SU-ARITMA', ad: 'Su ve Atıksu' },
  });

  const tip = Object.fromEntries(await Promise.all(
    SU_TIPLERI.map(async ([kod, ad, sira]) => [kod, await db.tesisTipi.create({
      data: { kod, ad, sira, sektorId: su.id },
    })]),
  )) as Record<string, { id: string }>;

  await db.sektorSozlugu.createMany({
    data: SU_SOZLUGU.map((r) => ({ ...r, sektorId: su.id })),
  });

  await Promise.all(SU_TESISLERI.map(([kod, ad, tipKod, debi, konum, durum, giris]) =>
    db.tesis.create({
      data: {
        kod, ad, tipId: tip[tipKod].id, konum, durum,
        devreyeGiris: gun(giris),
        /* Ölçülmemiş debi satır AÇMAZ (URN-ALN-001). */
        ozellikler: debi === null ? undefined : {
          create: [{ anahtar: GUNLUK_DEBI, sayisalDeger: debi, birim: 'm³/gün', kaynak: 'tohum' }],
        },
        /* Su tesislerinin fotoğrafı YOK: başka bir tesisin görseli
           ödünç alınmaz (public/tesisler/KUNYE.md §1.3). Ekran
           tipografik yedeğe düşer. */
        gorselAnahtari: null,
      },
    })));

  return { sektorId: su.id, tesisSayisi: SU_TESISLERI.length };
}

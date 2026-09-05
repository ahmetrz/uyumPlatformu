'use server';

/* ═══ UY-39 · Değişiklik etki önizlemesi ═══════════════════════════════

   ── ÖLÇÜLMÜŞ KUSUR ────────────────────────────────────────────────────
   `SurumFarki` yalnız AKTİFLEŞTİRMEDEN SONRA yazılıyordu. Kullanıcı "bu
   sürümü aktifleştirirsem ne olur" diye SORAMIYORDU; cevabı ancak
   aktifleştirdikten sonra görüyordu ve aktifleştirme geri alınamaz.

   Bu eylem HİÇBİR ŞEY YAZMAZ. Aynı saf fark fonksiyonunu
   (`lib/uyum/degisiklikEtkisi.ts → surumFarki`) `surumAktiflestir` ile
   PAYLAŞIR: önizlemenin gösterdiği ile aktifleştirmenin yapacağı şeyin
   ayrışamamasının tek garantisi budur.

   ── ZİNCİR HALKA HALKA SAYILIR ────────────────────────────────────────
   Etkilenen kayıtlar tek bir sayıya toplanmaz. "42 kayıt etkilenir"
   cümlesi, 40'ı kanıt bağı 2'si açık bulgu olduğunda yanıltıcıdır. */

import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { parcala } from '../sorguParcala';
import {
  etkiAgirligi, etkiCumlesi, etkiOzeti, etkiSonucu, surumFarki,
  type EtkiOzeti, type EtkiSatiri, type MaddeAyakIzi,
} from '../uyum/degisiklikEtkisi';
import { hata, bosluksuz, type Sonuc } from './ortak';

export type OnizlemeSonucu = Sonuc & {
  satirlar?: EtkiSatiri[];
  ozet?: EtkiOzeti;
  cumle?: string;
  /** Karşılaştırılan aktif sürüm; yoksa `null` (ilk sürüm). */
  aktifSurumEtiketi?: string | null;
};

const BOS_IZ = (maddeId: string): MaddeAyakIzi => ({
  maddeId, degerlendirme: 0, kararliDegerlendirme: 0, kanitBagi: 0,
  acikBulgu: 0, acikAksiyon: 0, risk: 0, belge: 0, esdegerlik: 0, istisna: 0,
});

/** Karar VERİLMİŞ sayılan durumlar — `degerlendirilmedi` ve `incelemede` değil. */
const KARARLI = ['uyumlu', 'kismi', 'uyumsuz', 'kapsamdisi'];

/**
 * Bir taslak sürümün aktifleştirilmesi ne yapardı?
 *
 * Salt okunur: `tanimlar/okuma` yetkisi ister, hiçbir tabloya yazmaz.
 */
export async function surumEtkisiOnizle(girdi: {
  surumId: string;
}): Promise<OnizlemeSonucu> {
  try {
    await yetkiZorunlu('tanimlar', 'okuma');
    const v = z.object({ surumId: bosluksuz('Sürüm') }).parse(girdi);

    const yeni = await db.frameworkSurumu.findUnique({
      where: { id: v.surumId },
      select: { id: true, regulasyonId: true, surumEtiketi: true, durum: true },
    });
    if (!yeni) return hata(new Error('Sürüm bulunamadı'));

    const aktif = await db.frameworkSurumu.findFirst({
      where: { regulasyonId: yeni.regulasyonId, durum: 'aktif' },
      select: { id: true, surumEtiketi: true },
    });
    /* Aktifleştirmenin okuduğu kümenin AYNISI: aktif sürüm yoksa
       `surumId: null` maddeleri (sürümlendirilmemiş kütük) taban alınır. */
    const alan = { id: true, kod: true, baslik: true, metin: true } as const;
    const eskiMaddeler = await db.madde.findMany({
      where: {
        regulasyonId: yeni.regulasyonId, silindi: null,
        surumId: aktif ? aktif.id : null,
      },
      select: alan,
    });
    const yeniMaddeler = await db.madde.findMany({
      where: { regulasyonId: yeni.regulasyonId, surumId: yeni.id, silindi: null },
      select: alan,
    });

    const farklar = surumFarki({ eski: eskiMaddeler, yeni: yeniMaddeler });
    const degismeyen = eskiMaddeler.length
      - farklar.filter((f) => f.degisimTipi === 'kaldirildi').length
      - farklar.filter((f) => f.degisimTipi === 'degisti').length;

    /* ── Ayak izi: halka halka, TOPLU sorgularla ───────────────────────
       Madde başına ayrı sorgu, fark satırı sayısıyla orantılı bir sorgu
       patlaması olurdu (500 maddelik bir çerçevede 4500 sorgu). Her
       halka tek `groupBy` ile okunur ve parametre sınırına göre
       parçalanır. */
    const maddeIdler = farklar.map((f) => f.maddeId);
    const izler = new Map<string, MaddeAyakIzi>(
      maddeIdler.map((id) => [id, BOS_IZ(id)]),
    );

    if (maddeIdler.length > 0) {
      for (const p of parcala(maddeIdler, 1)) {
        const durumlar = await db.maddeDurumu.findMany({
          where: { maddeId: { in: p } },
          select: { id: true, maddeId: true, durum: true },
        });
        const durumIdler = durumlar.map((d) => d.id);
        for (const d of durumlar) {
          const iz = izler.get(d.maddeId)!;
          iz.degerlendirme += 1;
          if (KARARLI.includes(d.durum)) iz.kararliDegerlendirme += 1;
        }
        const durumdanMadde = new Map(durumlar.map((d) => [d.id, d.maddeId]));

        if (durumIdler.length > 0) {
          for (const q of parcala(durumIdler, 1)) {
            const kanitlar = await db.kanitBaglantisi.findMany({
              where: { maddeDurumuId: { in: q } }, select: { maddeDurumuId: true },
            });
            for (const kb of kanitlar) {
              const mid = durumdanMadde.get(kb.maddeDurumuId);
              if (mid) izler.get(mid)!.kanitBagi += 1;
            }
            const bulgular = await db.bulgu.findMany({
              where: {
                maddeDurumuId: { in: q }, silindi: null,
                durum: { in: ['acik', 'aksiyonda'] },
              },
              select: { id: true, maddeDurumuId: true },
            });
            for (const b of bulgular) {
              const mid = durumdanMadde.get(b.maddeDurumuId);
              if (mid) izler.get(mid)!.acikBulgu += 1;
            }
            const bulguIdler = bulgular.map((b) => b.id);
            const bulgudanMadde = new Map(
              bulgular.map((b) => [b.id, durumdanMadde.get(b.maddeDurumuId)!]),
            );
            for (const r of parcala(bulguIdler, 1)) {
              const aksiyonlar = await db.aksiyon.findMany({
                where: { bulguId: { in: r }, durum: { in: ['planlandi', 'devam'] } },
                select: { bulguId: true },
              });
              for (const a of aksiyonlar) {
                const mid = bulgudanMadde.get(a.bulguId);
                if (mid) izler.get(mid)!.acikAksiyon += 1;
              }
              const riskler = await db.risk.findMany({
                where: { bulguId: { in: r }, silindi: null },
                select: { bulguId: true },
              });
              for (const rk of riskler) {
                const mid = bulgudanMadde.get(rk.bulguId!);
                if (mid) izler.get(mid)!.risk += 1;
              }
            }
          }
        }

        const belgeler = await db.dokumanMadde.findMany({
          where: { maddeId: { in: p } }, select: { maddeId: true },
        });
        for (const b of belgeler) izler.get(b.maddeId)!.belge += 1;

        const esdeger = await db.maddeEslestirmesi.findMany({
          where: { OR: [{ kaynakId: { in: p } }, { hedefId: { in: p } }] },
          select: { kaynakId: true, hedefId: true },
        });
        for (const e of esdeger) {
          if (izler.has(e.kaynakId)) izler.get(e.kaynakId)!.esdegerlik += 1;
          if (izler.has(e.hedefId)) izler.get(e.hedefId)!.esdegerlik += 1;
        }

        const istisnalar = await db.istisna.findMany({
          where: { maddeId: { in: p }, durum: 'aktif' }, select: { maddeId: true },
        });
        for (const i of istisnalar) izler.get(i.maddeId)!.istisna += 1;
      }
    }

    const satirlar: EtkiSatiri[] = farklar.map((f) => {
      const ayakIzi = izler.get(f.maddeId) ?? BOS_IZ(f.maddeId);
      return {
        ...f,
        ayakIzi,
        agirlik: etkiAgirligi({ degisimTipi: f.degisimTipi, ayakIzi }),
        sonuc: etkiSonucu({ degisimTipi: f.degisimTipi, ayakIzi }),
      };
    });
    /* En ağır satır önde: kullanıcının ilk göreceği şey, kaybolacak
       dayanaktır — "12 yeni madde eklenecek" değil. */
    const sira = { yuksek: 0, orta: 1, dusuk: 2, yok: 3 };
    satirlar.sort((a, b) => sira[a.agirlik] - sira[b.agirlik]
      || a.maddeKodu.localeCompare(b.maddeKodu, 'tr'));

    const ozet = etkiOzeti({ satirlar, degismeyen: Math.max(0, degismeyen) });
    return {
      ok: true,
      satirlar,
      ozet,
      cumle: etkiCumlesi(ozet),
      aktifSurumEtiketi: aktif?.surumEtiketi ?? null,
    };
  } catch (e) { return hata(e); }
}

'use server';

/* ═══ UY-66 · Eğitim ve farkındalık kütüğü ═════════════════════════════

   Eğitim TANIMI kurum genelindedir (`uyum/onay`); eğitim KAYDI bir
   kişinin bir eğitimi aldığını söyler ve `uyum/yazma` yeterlidir.
   İkisini aynı kapıya koymak, her katılım listesini onaya bağlardı. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { egitimKapisi, gecerlilikBitisi, kayitKapisi } from '../uyum/egitim';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

export async function egitimKaydet(girdi: {
  id?: string | null;
  kod: string;
  ad: string;
  gecerlilikAy?: number | null;
  zorunlu?: boolean;
  aciklama?: string | null;
  aktif?: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      id: z.string().trim().max(64).nullable().optional(),
      kod: bosluksuz('Eğitim kodu').max(64),
      ad: bosluksuz('Eğitim adı').max(200),
      gecerlilikAy: z.number().int().nullable().optional(),
      zorunlu: z.boolean().optional(),
      aciklama: z.string().trim().max(2000).nullable().optional(),
      aktif: z.boolean().optional(),
    }).parse(girdi);

    const kapi = egitimKapisi({ gecerlilikAy: v.gecerlilikAy ?? null });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    const veri = {
      kod: v.kod, ad: v.ad,
      gecerlilikAy: v.gecerlilikAy ?? null,
      zorunlu: v.zorunlu ?? false,
      aciklama: v.aciklama ?? null,
      aktif: v.aktif ?? true,
    };
    const onceki = v.id ? await db.egitim.findUnique({ where: { id: v.id } }) : null;
    const kayit = onceki
      ? await db.egitim.update({ where: { id: onceki.id }, data: veri })
      : await db.egitim.create({ data: veri });

    await iz({
      aktorId: k.id, varlikTipi: 'Egitim', varlikId: kayit.id,
      eylem: onceki ? 'guncelleme' : 'olusturma',
      sonra: `${v.ad}${v.zorunlu ? ' · ZORUNLU' : ''}`
        + (v.gecerlilikAy === null ? ' · süresiz' : ` · ${v.gecerlilikAy} ay geçerli`),
    });

    revalidatePath('/egitimler');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Bir kişinin eğitimi tamamladığını kaydeder.
 *
 * Geçerlilik bitişi TAMAMLANMA tarihinden hesaplanır, kaydın girildiği
 * tarihten değil: geçmişe dönük girilen bir eğitim, girildiği gün
 * alınmış gibi geçerlilik kazanmamalı.
 */
export async function egitimKaydiEkle(girdi: {
  egitimId: string;
  kullaniciId: string;
  tamamlanma: string;
  belgeNo?: string | null;
  kanitId?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma');
    const v = z.object({
      egitimId: bosluksuz('Eğitim'),
      kullaniciId: bosluksuz('Kullanıcı'),
      tamamlanma: bosluksuz('Tamamlanma tarihi'),
      belgeNo: z.string().trim().max(120).nullable().optional(),
      kanitId: z.string().trim().max(64).nullable().optional(),
    }).parse(girdi);

    const egitim = await db.egitim.findUnique({ where: { id: v.egitimId } });
    if (!egitim) throw new Error('Eğitim bulunamadı');
    if (!egitim.aktif) return { ok: false, hata: 'Pasif eğitime kayıt eklenemez.' };

    const kisi = await db.kullanici.findUnique({
      where: { id: v.kullaniciId }, select: { id: true, adSoyad: true },
    });
    if (!kisi) throw new Error('Kullanıcı bulunamadı');

    const tarih = new Date(v.tamamlanma);
    if (Number.isNaN(tarih.getTime())) return { ok: false, hata: 'Tarih okunamadı.' };
    const kapi = kayitKapisi({ tamamlanma: tarih.getTime(), simdi: Date.now() });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    const bitis = gecerlilikBitisi(tarih.getTime(), egitim.gecerlilikAy);

    const mevcut = await db.egitimKaydi.findFirst({
      where: { egitimId: v.egitimId, kullaniciId: v.kullaniciId, tamamlanma: tarih },
      select: { id: true },
    });
    if (mevcut) return tamam(); // idempotent: aynı gün ikinci kayıt açılmaz

    const kayit = await db.egitimKaydi.create({
      data: {
        egitimId: v.egitimId,
        kullaniciId: v.kullaniciId,
        tamamlanma: tarih,
        gecerlilikBitis: bitis === null ? null : new Date(bitis),
        belgeNo: v.belgeNo ?? null,
        kanitId: v.kanitId || null,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'EgitimKaydi', varlikId: kayit.id,
      eylem: 'olusturma',
      sonra: `${kisi.adSoyad} · ${egitim.ad} · ${tarih.toISOString().slice(0, 10)}`,
      gerekce: bitis === null
        ? 'Süresiz eğitim'
        : `Geçerlilik ${new Date(bitis).toISOString().slice(0, 10)}`,
    });

    revalidatePath('/egitimler');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Eğitimi bir kontrol maddesine bağlar. */
export async function egitimMaddeBagla(girdi: {
  egitimId: string; maddeId: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({
      egitimId: bosluksuz('Eğitim id'),
      maddeId: bosluksuz('Madde id'),
    }).parse(girdi);

    const madde = await db.madde.findUnique({
      where: { id: v.maddeId }, select: { kod: true },
    });
    if (!madde) throw new Error('Madde bulunamadı');

    const mevcut = await db.egitimMadde.findFirst({
      where: { egitimId: v.egitimId, maddeId: v.maddeId }, select: { id: true },
    });
    if (mevcut) return tamam();

    await db.egitimMadde.create({ data: { egitimId: v.egitimId, maddeId: v.maddeId } });
    await iz({
      aktorId: k.id, varlikTipi: 'Egitim', varlikId: v.egitimId,
      eylem: 'guncelleme', alan: 'madde_bagi', sonra: madde.kod,
    });

    revalidatePath('/egitimler');
    return tamam();
  } catch (e) { return hata(e); }
}

export async function egitimMaddeCoz(girdi: { id: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = z.object({ id: bosluksuz('Bağ id') }).parse(girdi);
    const bag = await db.egitimMadde.findUnique({
      where: { id: v.id }, include: { madde: { select: { kod: true } } },
    });
    if (!bag) return tamam();
    await db.egitimMadde.delete({ where: { id: v.id } });
    await iz({
      aktorId: k.id, varlikTipi: 'Egitim', varlikId: bag.egitimId,
      eylem: 'guncelleme', alan: 'madde_bagi', once: bag.madde.kod, sonra: null,
    });
    revalidatePath('/egitimler');
    return tamam();
  } catch (e) { return hata(e); }
}

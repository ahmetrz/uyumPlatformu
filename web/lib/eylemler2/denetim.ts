'use server';

/* Denetim yaşam döngüsü eylemleri: kayıt, SIRALI aşama ilerletme (atlama yok;
   kapanışa geçiş onay yetkisi ister ve açık kanıt talebi ya da açık bulgu
   varken REDDEDİLİR), gerekçeli geri alma, kanıt talepleri ve kapsam yönetimi. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar } from '../erisim';
import { DENETIM_ASAMALARI } from '../sabitler';
import { tamam, hata, iz, bosluksuz, tarihAlani, type Sonuc } from './ortak';

type Asama = (typeof DENETIM_ASAMALARI)[number];

function tazele(id?: string) {
  revalidatePath('/denetimler');
  if (id) revalidatePath(`/denetimler/${id}`);
}

function asamaIndeksi(durum: string): number {
  const i = DENETIM_ASAMALARI.indexOf(durum as Asama);
  if (i < 0) throw new Error(`Bilinmeyen denetim aşaması: ${durum}`);
  return i;
}

// ------------------------------------------------------------ denetim kaydı

const DenetimGirdisi = z.object({
  kod: bosluksuz('Kod'),
  ad: bosluksuz('Ad'),
  tip: z.enum(['ic_denetim', 'dis_denetim', 'oz_degerlendirme', 'regulasyon_denetimi'],
    'Geçersiz denetim tipi'),
  denetleyen: z.string().nullable().optional(),
  surecId: z.string().nullable().optional(),
  planBaslangic: tarihAlani,
  planBitis: tarihAlani,
});

/** Yeni denetim oluşturur; yaşam döngüsü daima 'plan' aşamasından başlar. */
export async function denetimKaydet(girdi: {
  kod: string; ad: string; tip: string; denetleyen?: string | null;
  surecId?: string | null; planBaslangic?: string | null; planBitis?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('denetim', 'yazma');
    const v = DenetimGirdisi.parse(girdi);
    if (v.planBaslangic && v.planBitis && v.planBitis < v.planBaslangic)
      throw new Error('Plan bitişi başlangıçtan önce olamaz');
    if (await db.denetim.findUnique({ where: { kod: v.kod } }))
      throw new Error(`"${v.kod}" kodu zaten kullanılıyor`);
    if (v.surecId && !(await db.uyumSureci.findUnique({ where: { id: v.surecId } })))
      throw new Error('Seçilen uyum süreci bulunamadı');

    const yeni = await db.denetim.create({ data: {
      kod: v.kod, ad: v.ad, tip: v.tip,
      denetleyen: v.denetleyen?.trim() || null,
      surecId: v.surecId || null,
      planBaslangic: v.planBaslangic ?? null,
      planBitis: v.planBitis ?? null,
    } });
    await iz({ aktorId: k.id, varlikTipi: 'Denetim', varlikId: yeni.id,
      eylem: 'olusturma', sonra: yeni.kod });
    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------ aşama ilerlet / geri

/** SIRA ZORUNLU ilerleme: yalnız bir sonraki aşamaya geçilir, atlama yoktur.
    Kapanışa geçiş denetim/onay yetkisi ister; açık kanıt talebi veya bu
    denetime bağlı açık bulgu varsa mesajla reddedilir. */
export async function asamaIlerlet(girdi: { id: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('denetim', 'yazma');
    const { id } = z.object({ id: z.string() }).parse(girdi);
    const d = await db.denetim.findUnique({ where: { id } });
    if (!d || d.silindi) throw new Error('Denetim bulunamadı');
    const i = asamaIndeksi(d.durum);
    if (i === DENETIM_ASAMALARI.length - 1)
      throw new Error('Denetim zaten kapanış aşamasında');
    const sonraki = DENETIM_ASAMALARI[i + 1];

    if (sonraki === 'kapanis') {
      if (!izinVar(k, 'denetim', 'onay'))
        throw new Error('Kapanışa geçiş için denetim onay yetkisi gerekli');
      const [acikTalep, acikBulgu] = await Promise.all([
        db.kanitTalebi.count({ where: { denetimId: id, durum: 'acik' } }),
        db.bulgu.count({ where: {
          denetimId: id, silindi: null, durum: { in: ['acik', 'aksiyonda'] },
        } }),
      ]);
      if (acikTalep > 0 || acikBulgu > 0)
        throw new Error(`Kapanış reddedildi: ${[
          acikTalep > 0 ? `${acikTalep} açık kanıt talebi` : null,
          acikBulgu > 0 ? `${acikBulgu} açık bulgu` : null,
        ].filter(Boolean).join(' ve ')} var; önce bunlar kapatılmalı.`);
    }

    await db.denetim.update({ where: { id }, data: { durum: sonraki } });
    await iz({ aktorId: k.id, varlikTipi: 'Denetim', varlikId: id,
      eylem: 'durum_degisimi', alan: 'durum', once: d.durum, sonra: sonraki });
    tazele(id);
    return tamam();
  } catch (e) { return hata(e); }
}

/** Bir önceki aşamaya dönüş: denetim/onay yetkisi + gerekçe zorunlu;
    gerekçe iz kaydına yazılır. */
export async function asamaGeriAl(girdi: { id: string; gerekce: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('denetim', 'onay');
    const v = z.object({ id: z.string(), gerekce: bosluksuz('Gerekçe') }).parse(girdi);
    const d = await db.denetim.findUnique({ where: { id: v.id } });
    if (!d || d.silindi) throw new Error('Denetim bulunamadı');
    const i = asamaIndeksi(d.durum);
    if (i === 0) throw new Error('Denetim zaten ilk aşamada (plan)');
    const onceki = DENETIM_ASAMALARI[i - 1];

    await db.denetim.update({ where: { id: v.id }, data: { durum: onceki } });
    await iz({ aktorId: k.id, varlikTipi: 'Denetim', varlikId: v.id,
      eylem: 'durum_degisimi', alan: 'durum', once: d.durum, sonra: onceki,
      gerekce: v.gerekce });
    tazele(v.id);
    return tamam();
  } catch (e) { return hata(e); }
}

// -------------------------------------------------------- kanıt talepleri

const TalepGirdisi = z.object({
  denetimId: z.string(),
  baslik: bosluksuz('Başlık'),
  aciklama: z.string().nullable().optional(),
  sorumluId: z.string().nullable().optional(),
  sonTarih: tarihAlani,
});

/** Denetime kanıt talebi ekler (durum: açık). */
export async function kanitTalebiEkle(girdi: {
  denetimId: string; baslik: string; aciklama?: string | null;
  sorumluId?: string | null; sonTarih?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('denetim', 'yazma');
    const v = TalepGirdisi.parse(girdi);
    const d = await db.denetim.findUnique({ where: { id: v.denetimId } });
    if (!d || d.silindi) throw new Error('Denetim bulunamadı');
    if (d.durum === 'kapanis') throw new Error('Kapanmış denetime kanıt talebi eklenemez');

    const yeni = await db.kanitTalebi.create({ data: {
      denetimId: v.denetimId, baslik: v.baslik,
      aciklama: v.aciklama?.trim() || null,
      sorumluId: v.sorumluId || null,
      sonTarih: v.sonTarih ?? null,
    } });
    await iz({ aktorId: k.id, varlikTipi: 'KanitTalebi', varlikId: yeni.id,
      eylem: 'olusturma', sonra: v.baslik });
    tazele(v.denetimId);
    return tamam();
  } catch (e) { return hata(e); }
}

const TalepDurumGirdisi = z.object({
  id: z.string(),
  durum: z.enum(['acik', 'saglandi', 'reddedildi'], 'Geçersiz talep durumu'),
  kanitId: z.string().nullable().optional(),
  yeniKanitAd: z.string().nullable().optional(),
});

/** Talep durumu değişimi. 'saglandi' seçilirse mevcut bir kanıt bağlanır ya da
    verilen adla yeni Kanit oluşturulup bağlanır; diğer durumlarda bağ çözülür. */
export async function kanitTalebiDurum(girdi: {
  id: string; durum: string; kanitId?: string | null; yeniKanitAd?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('denetim', 'yazma');
    const v = TalepDurumGirdisi.parse(girdi);
    const talep = await db.kanitTalebi.findUnique({ where: { id: v.id } });
    if (!talep) throw new Error('Kanıt talebi bulunamadı');

    let kanitId: string | null = null;
    if (v.durum === 'saglandi') {
      if (v.kanitId) {
        const kanit = await db.kanit.findUnique({ where: { id: v.kanitId } });
        if (!kanit || kanit.silindi) throw new Error('Seçilen kanıt bulunamadı');
        kanitId = kanit.id;
      } else if (v.yeniKanitAd?.trim()) {
        const kanit = await db.kanit.create({ data: {
          ad: v.yeniKanitAd.trim(), tip: 'kayit',
          yukleyenId: k.id, sahipId: talep.sorumluId ?? k.id,
          toplanmaTarihi: new Date(),
        } });
        kanitId = kanit.id;
        await iz({ aktorId: k.id, varlikTipi: 'Kanit', varlikId: kanit.id,
          eylem: 'olusturma', sonra: kanit.ad });
      } else {
        throw new Error('Sağlandı için mevcut bir kanıt seçin veya yeni kanıt adı girin');
      }
    }

    await db.kanitTalebi.update({ where: { id: v.id }, data: { durum: v.durum, kanitId } });
    await iz({ aktorId: k.id, varlikTipi: 'KanitTalebi', varlikId: v.id,
      eylem: 'durum_degisimi', alan: 'durum', once: talep.durum, sonra: v.durum });
    tazele(talep.denetimId);
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------------ kapsam

const KapsamGirdisi = z.object({
  denetimId: z.string(),
  tesisId: z.string().nullable().optional(),
  maddeId: z.string().nullable().optional(),
}).refine((g) => g.tesisId || g.maddeId, { message: 'Tesis veya madde seçin' });

/** Denetim kapsamına tesis ya da madde ekler. Tesis eklerken kullanıcının o
    tesis kapsamında denetim yazma yetkisi aranır. */
export async function kapsamEkle(girdi: {
  denetimId: string; tesisId?: string | null; maddeId?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('denetim', 'yazma');
    const v = KapsamGirdisi.parse(girdi);
    const d = await db.denetim.findUnique({ where: { id: v.denetimId } });
    if (!d || d.silindi) throw new Error('Denetim bulunamadı');
    if (d.durum === 'kapanis') throw new Error('Kapanmış denetimin kapsamı değiştirilemez');
    if (v.tesisId && !izinVar(k, 'denetim', 'yazma', { tesisId: v.tesisId }))
      throw new Error('Bu tesis kapsamında denetim yazma yetkiniz yok');

    let etiket = '';
    if (v.tesisId) {
      const tesis = await db.tesis.findUnique({ where: { id: v.tesisId } });
      if (!tesis) throw new Error('Tesis bulunamadı');
      etiket = tesis.kod;
    }
    if (v.maddeId) {
      const madde = await db.madde.findUnique({ where: { id: v.maddeId } });
      if (!madde) throw new Error('Madde bulunamadı');
      etiket = etiket ? `${etiket} · ${madde.kod}` : madde.kod;
    }

    const mevcut = await db.denetimKapsami.findFirst({ where: {
      denetimId: v.denetimId, tesisId: v.tesisId || null, maddeId: v.maddeId || null,
    } });
    if (mevcut) throw new Error(`${etiket} zaten kapsamda`);

    await db.denetimKapsami.create({ data: {
      denetimId: v.denetimId, tesisId: v.tesisId || null, maddeId: v.maddeId || null,
    } });
    await iz({ aktorId: k.id, varlikTipi: 'Denetim', varlikId: v.denetimId,
      eylem: 'kapsam_degisimi', sonra: etiket });
    tazele(v.denetimId);
    return tamam();
  } catch (e) { return hata(e); }
}

/** Kapsam kaydını çıkarır (geçmiş, iz kaydında kalır). */
export async function kapsamCikar(girdi: { id: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('denetim', 'yazma');
    const { id } = z.object({ id: z.string() }).parse(girdi);
    const kapsam = await db.denetimKapsami.findUnique({
      where: { id }, include: { tesis: true, madde: true, denetim: true },
    });
    if (!kapsam) throw new Error('Kapsam kaydı bulunamadı');
    if (kapsam.denetim.durum === 'kapanis')
      throw new Error('Kapanmış denetimin kapsamı değiştirilemez');
    if (kapsam.tesisId && !izinVar(k, 'denetim', 'yazma', { tesisId: kapsam.tesisId }))
      throw new Error('Bu tesis kapsamında denetim yazma yetkiniz yok');

    await db.denetimKapsami.delete({ where: { id } });
    await iz({ aktorId: k.id, varlikTipi: 'Denetim', varlikId: kapsam.denetimId,
      eylem: 'kapsam_degisimi',
      once: [kapsam.tesis?.kod, kapsam.madde?.kod].filter(Boolean).join(' · ') });
    tazele(kapsam.denetimId);
    return tamam();
  } catch (e) { return hata(e); }
}

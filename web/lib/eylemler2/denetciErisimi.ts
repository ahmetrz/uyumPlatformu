'use server';

/* ═══ UY-57 · Dış denetçi erişimi ══════════════════════════════════════

   ── KAYIT TEK BAŞINA BİR KAPI DEĞİLDİR ────────────────────────────────
   `DenetciErisimi` bir DEFTERDİR: kim, hangi denetim için, ne zamana
   kadar, hangi santralleri görecek. Erişimi gerçekten uygulayan şey
   ürünün var olan yetki katmanıdır (`Yetki` satırları, `lib/erisim.ts`).
   Bu yüzden davet, kapsamdaki her santral için bir `dis_denetci` yetki
   satırı YAZAR; iptal ve süre sonu o satırları SİLER.

   İkisini ayırmak — deftere yazıp yetkiye dokunmamak — ekranda "erişim
   kapandı" yazarken kapının açık kalması demek olurdu. Bu üründe en
   pahalı hata sınıfı budur.

   ── PARALEL BİR YETKİ SİSTEMİ KURULMAZ ────────────────────────────────
   `dis_denetci` rolü `lib/erisim.ts`te zaten tanımlıdır
   (`denetim: ['okuma'], uyum: ['okuma']`). Burada yeni bir izin modeli
   yok; var olan rolün ne zaman verilip ne zaman alınacağı var. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { AZAMI_SURE_GUN, davetKapisi } from '../uyum/denetciErisimi';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

/** Kapsamdaki santraller için `dis_denetci` yetki satırlarını yazar. */
async function yetkileriAc(kullaniciId: string, tesisIdler: string[]): Promise<void> {
  for (const tesisId of tesisIdler) {
    /* `createMany` + skipDuplicates yerine tek tek upsert: bileşik
       benzersizlik anahtarı null alanlar içeriyor ve SQLite'ta null'lu
       benzersizlik çakışma ÜRETMEZ — skipDuplicates burada sessizce
       çift satır bırakırdı. */
    const mevcut = await db.yetki.findFirst({
      where: {
        kullaniciId, tesisId, rol: 'dis_denetci',
        surecId: null, tuzelKisiId: null, regulasyonId: null, modul: null,
      },
      select: { id: true },
    });
    if (mevcut) continue;
    await db.yetki.create({
      data: { kullaniciId, tesisId, rol: 'dis_denetci' },
    });
  }
}

/** Dış denetçi yetki satırlarını kaldırır. Başka rolleri ELLEMEZ. */
async function yetkileriKapat(kullaniciId: string): Promise<number> {
  const sonuc = await db.yetki.deleteMany({
    where: { kullaniciId, rol: 'dis_denetci' },
  });
  return sonuc.count;
}

/**
 * Dış denetçiyi davet eder: erişim defterine yazar ve yetkileri açar.
 *
 * Süre ZORUNLUDUR ve tavanı vardır; kapsam BOŞ OLAMAZ. Üçü de
 * `davetKapisi` içinde, ürünün geri kalanından bağımsız olarak sınanır.
 */
export async function denetciDavetEt(girdi: {
  kullaniciId: string;
  denetimId?: string | null;
  firma: string;
  bitis: string;
  tesisIdler: string[];
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const v = z.object({
      kullaniciId: bosluksuz('Kullanıcı'),
      denetimId: z.string().trim().max(64).nullable().optional(),
      firma: bosluksuz('Firma').max(200),
      bitis: bosluksuz('Bitiş tarihi'),
      tesisIdler: z.array(z.string()).max(500),
    }).parse(girdi);

    const bitis = new Date(v.bitis);
    if (Number.isNaN(bitis.getTime())) {
      return { ok: false, hata: 'Bitiş tarihi okunamadı.' };
    }
    const simdi = Date.now();
    const kapi = davetKapisi({
      baslangic: simdi, bitis: bitis.getTime(), simdi,
      kapsamSayisi: new Set(v.tesisIdler).size,
    });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    const kisi = await db.kullanici.findUnique({
      where: { id: v.kullaniciId }, select: { id: true, aktif: true, adSoyad: true },
    });
    if (!kisi) throw new Error('Kullanıcı bulunamadı');
    if (!kisi.aktif) return { ok: false, hata: 'Pasif kullanıcı davet edilemez.' };

    /* Santrallerin gerçekten var olduğu doğrulanır: olmayan bir santral
       kimliğiyle açılan kapsam, ekranda "1 santral" yazar ama hiçbir şey
       göstermez. */
    const tesisler = await db.tesis.findMany({
      where: { id: { in: [...new Set(v.tesisIdler)] } }, select: { id: true, kod: true },
    });
    if (tesisler.length !== new Set(v.tesisIdler).size) {
      return { ok: false, hata: 'Seçilen santrallerden biri bulunamadı.' };
    }

    const erisim = await db.denetciErisimi.create({
      data: {
        kullaniciId: kisi.id,
        denetimId: v.denetimId || null,
        firma: v.firma,
        bitis,
        davetEdenId: k.id,
        kapsamlar: { create: tesisler.map((t) => ({ tesisId: t.id })) },
      },
    });
    await yetkileriAc(kisi.id, tesisler.map((t) => t.id));

    await iz({
      aktorId: k.id, varlikTipi: 'DenetciErisimi', varlikId: erisim.id,
      eylem: 'olusturma',
      sonra: `${kisi.adSoyad} · ${v.firma} · ${tesisler.map((t) => t.kod).join(', ')}`,
      gerekce: `Bitiş: ${bitis.toISOString()} (tavan ${AZAMI_SURE_GUN} gün)`,
    });

    revalidatePath('/denetci-erisimi');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Erişimi iptal eder ve yetkileri KAPATIR.
 *
 * Kayıt silinmez: bir dış denetçinin ne zaman girip ne zaman çıktığı,
 * denetimin kendisi kadar kayda değerdir.
 */
export async function denetciErisimiIptal(girdi: {
  id: string; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const v = z.object({
      id: bosluksuz('Erişim id'),
      gerekce: bosluksuz('İptal gerekçesi').max(1000),
    }).parse(girdi);

    const erisim = await db.denetciErisimi.findUnique({
      where: { id: v.id },
      select: { id: true, durum: true, kullaniciId: true },
    });
    if (!erisim) throw new Error('Erişim bulunamadı');
    if (erisim.durum === 'iptal') return tamam(); // idempotent

    await db.denetciErisimi.update({
      where: { id: v.id },
      data: {
        durum: 'iptal', iptalEdenId: k.id, iptalZamani: new Date(),
        iptalGerekcesi: v.gerekce,
      },
    });
    const silinen = await yetkileriKapat(erisim.kullaniciId);

    await iz({
      aktorId: k.id, varlikTipi: 'DenetciErisimi', varlikId: v.id,
      eylem: 'iptal', alan: 'durum', once: erisim.durum, sonra: 'iptal',
      gerekce: `${v.gerekce} · ${silinen} yetki satırı kaldırıldı`,
    });

    revalidatePath('/denetci-erisimi');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Süresi dolan erişimleri kapatır.
 *
 * ── BU BİR MOTOR DEĞİLDİR ─────────────────────────────────────────────
 * Elle çağrılır ve HİÇBİR uyum kararına dokunmaz: yalnız süresi geçmiş
 * bir erişimin yetki satırlarını kaldırır. Ürünün otomasyon yasakları
 * (`tests/otomasyon-guvenligi.test.ts`) bulguyu kapatan, değerlendirme
 * değiştiren, kanıt üreten otomasyonu yasaklar; süresi dolmuş bir kapıyı
 * kapatmak bunların hiçbiri değildir — tersine, açık bırakmak kusurdur.
 */
export async function denetciSureleriniIsle(): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const simdi = new Date();
    const dolanlar = await db.denetciErisimi.findMany({
      where: { durum: 'aktif', bitis: { lte: simdi } },
      select: { id: true, kullaniciId: true, kullanici: { select: { adSoyad: true } } },
    });

    for (const e of dolanlar) {
      await db.denetciErisimi.update({
        where: { id: e.id }, data: { durum: 'suresi_doldu' },
      });
      const silinen = await yetkileriKapat(e.kullaniciId);
      await iz({
        aktorId: k.id, varlikTipi: 'DenetciErisimi', varlikId: e.id,
        eylem: 'guncelleme', alan: 'durum', once: 'aktif', sonra: 'suresi_doldu',
        gerekce: `Süre doldu · ${silinen} yetki satırı kaldırıldı`,
      });
    }

    revalidatePath('/denetci-erisimi');
    return tamam();
  } catch (e) { return hata(e); }
}

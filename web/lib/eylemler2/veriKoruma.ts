'use server';

/* ═══ R15 · KİŞİSEL VERİ KORUMA · İNSAN KARARLARI ══════════════════════

   Motor süreyi izler ve GÖREV açar; buradaki eylemler motorun
   yapamadıklarıdır:

     işleme faaliyeti kaydet  → İŞ SÜRECİ ZORUNLU (KVK-ENV-004)
     başvuruyu yanıtla        → yanıt METNİ bir insanın kalemidir
     başvuruyu reddet         → GEREKÇE zorunlu ("ret" DE bir karardır)
     aktarım bildirimi işle   → BİLDİRİM TARİHİ insanın beyanıdır

   ── AYDINLATMA METNİ ÜRETİLMEZ ────────────────────────────────────────
   R15 kapsam dışıdır ve bilinçlidir: bir aydınlatma metni kurumun HUKUKİ
   BEYANIDIR. Ürünün onu üretmesi, kurumun adına hukuki metin yazmak
   olurdu; şablon doldurmak da öyledir çünkü şablonun kendisi de bir
   beyandır. Ürün envanteri tutar, metni kurum yazar.

   ── EŞZAMANLILIK ──────────────────────────────────────────────────────
   Yazma `updateMany` ile BEKLENEN duruma koşullanır: iki kullanıcı aynı
   başvuruya farklı karar verirse kaybeden sessizce ezilmez.
   ═══════════════════════════════════════════════════════════════════════ */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { BASVURU_DURUM_SOZU, type BasvuruDurumu } from '../veriKoruma/basvuru';
import { bosluksuz, type Sonuc, tamam, hata, iz } from './ortak';

const YOL = '/kisisel-veri';

const ARADA_DEGISTI = 'Bu başvuru siz bakarken değişti — ekranı yenileyip'
  + ' yeniden bakın. Aynı başvuruya başka biri karar vermiş olabilir.';

const GEREKCE_ASGARI = 10;

const soz = (d: string) => BASVURU_DURUM_SOZU[d as BasvuruDurumu] ?? d;

/* ── İŞLEME FAALİYETİ ──────────────────────────────────────────────── */

const FaaliyetGirdisi = z.object({
  id: z.string().trim().min(1).optional(),
  kod: bosluksuz('Kod').transform((s) => s.toUpperCase()),
  ad: bosluksuz('Ad'),
  /* KVK-ENV-004 · SÜREÇ ZORUNLUDUR ve boş dize kabul edilmez: sürece
     bağlanmamış bir envanter satırı, denetçinin ilk sorusuna cevap
     veremez ve zamanla amacı unutulmuş satırlarla dolar. Kolonun
     kendisi de NOT NULL — kapı iki yerdedir. */
  isSureciId: bosluksuz('İş süreci'),
  amac: bosluksuz('İşleme amacı'),
  hukukiSebep: bosluksuz('Hukuki sebep'),
  veriKategorileri: z.array(z.string().trim().min(1)).default([]),
  ilgiliKisiGruplari: z.array(z.string().trim().min(1)).default([]),
  aliciGruplari: z.array(z.string().trim().min(1)).default([]),
  /* ÜÇ DEĞERLİ: `null` = değerlendirilmedi, `false` = bakıldı ve yok. */
  ozelNitelikli: z.boolean().nullable().optional(),
  saklamaPolitikasiId: z.string().trim().min(1).nullable().optional(),
  maddeId: z.string().trim().min(1).nullable().optional(),
});

export async function veriFaaliyetiKaydet(
  girdi: z.input<typeof FaaliyetGirdisi>,
): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma');
    const v = FaaliyetGirdisi.parse(girdi);

    /* SÜREÇ GERÇEKTEN VAR MI. Olmayan bir kimlikle kayıt açmak, FK
       hatasını kullanıcının önüne ham hâliyle koyardı. */
    const surec = await db.isSureci.findUnique({
      where: { id: v.isSureciId }, select: { id: true, kod: true },
    });
    if (!surec) throw new Error('İş süreci bulunamadı — envanter satırı sürece bağlanmadan kaydedilemez.');

    const veri = {
      kod: v.kod, ad: v.ad, isSureciId: surec.id, amac: v.amac,
      hukukiSebep: v.hukukiSebep,
      veriKategorileriJson: JSON.stringify(v.veriKategorileri),
      ilgiliKisiGruplariJson: JSON.stringify(v.ilgiliKisiGruplari),
      aliciGruplariJson: JSON.stringify(v.aliciGruplari),
      ozelNitelikli: v.ozelNitelikli ?? null,
      saklamaPolitikasiId: v.saklamaPolitikasiId ?? null,
      maddeId: v.maddeId ?? null,
    };

    await db.$transaction(async (tx) => {
      const kayit = v.id
        ? await tx.veriIslemeFaaliyeti.update({ where: { id: v.id }, data: veri })
        : await tx.veriIslemeFaaliyeti.create({ data: veri });
      await iz({
        aktorId: k.id, varlikTipi: 'VeriIslemeFaaliyeti', varlikId: kayit.id,
        eylem: v.id ? 'guncelleme' : 'olusturma', alan: 'kayit',
        sonra: `${v.kod} · süreç ${surec.kod}`,
        gerekce: `işleme envanteri · hukuki sebep ${v.hukukiSebep}`,
      }, tx);
    });
    revalidatePath(YOL);
    return tamam();
  } catch (e) { return hata(e); }
}

/* ── VERİ SAHİBİ BAŞVURUSU ─────────────────────────────────────────── */

const YanitGirdisi = z.object({
  basvuruId: z.string().min(1),
  /* YANIT METNİ İNSANIN KALEMİDİR. Motor buraya asla yazmaz; kısa bir
     metin de kabul edilmez çünkü bir veri sahibine verilen cevap
     kurumun beyanıdır. */
  yanitMetni: z.string().trim().min(20,
    'Yanıt en az 20 karakter — veri sahibine verilen cevap kurumun beyanıdır'),
});

export async function basvuruyuYanitla(
  girdi: z.input<typeof YanitGirdisi>,
): Promise<Sonuc> {
  try {
    /* Kapsam KAPSAMSIZ sorulur: bir veri sahibi başvurusu tek bir
       tesisin değil KURUMUN meselesidir. */
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = YanitGirdisi.parse(girdi);

    const mevcut = await db.veriSahibiBasvurusu.findUnique({
      where: { id: v.basvuruId }, select: { id: true, kod: true, durum: true },
    });
    if (!mevcut) throw new Error('Başvuru bulunamadı');
    if (mevcut.durum === 'yanitlandi' || mevcut.durum === 'reddedildi') {
      throw new Error(`Bu başvuru zaten karara bağlanmış (${soz(mevcut.durum)}).`);
    }

    await db.$transaction(async (tx) => {
      const s = await tx.veriSahibiBasvurusu.updateMany({
        where: { id: v.basvuruId, durum: mevcut.durum },
        data: {
          durum: 'yanitlandi', yanitMetni: v.yanitMetni,
          yanitlayanId: k.id, yanitZamani: new Date(),
        },
      });
      if (s.count === 0) throw new Error(ARADA_DEGISTI);
      await iz({
        aktorId: k.id, varlikTipi: 'VeriSahibiBasvurusu', varlikId: v.basvuruId,
        eylem: 'guncelleme', alan: 'durum',
        once: soz(mevcut.durum), sonra: soz('yanitlandi'),
        gerekce: `${mevcut.kod} · yanıt yazıldı`,
      }, tx);
    });
    revalidatePath(YOL);
    return tamam();
  } catch (e) { return hata(e); }
}

const RedGirdisi = z.object({
  basvuruId: z.string().min(1),
  gerekce: z.string().trim().min(GEREKCE_ASGARI,
    `Gerekçe en az ${GEREKCE_ASGARI} karakter — "ret" de bir karardır`),
});

export async function basvuruyuReddet(
  girdi: z.input<typeof RedGirdisi>,
): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = RedGirdisi.parse(girdi);

    const mevcut = await db.veriSahibiBasvurusu.findUnique({
      where: { id: v.basvuruId }, select: { id: true, kod: true, durum: true },
    });
    if (!mevcut) throw new Error('Başvuru bulunamadı');
    if (mevcut.durum === 'yanitlandi' || mevcut.durum === 'reddedildi') {
      throw new Error(`Bu başvuru zaten karara bağlanmış (${soz(mevcut.durum)}).`);
    }

    await db.$transaction(async (tx) => {
      const s = await tx.veriSahibiBasvurusu.updateMany({
        where: { id: v.basvuruId, durum: mevcut.durum },
        data: {
          durum: 'reddedildi', redGerekcesi: v.gerekce,
          yanitlayanId: k.id, yanitZamani: new Date(),
        },
      });
      if (s.count === 0) throw new Error(ARADA_DEGISTI);
      await iz({
        aktorId: k.id, varlikTipi: 'VeriSahibiBasvurusu', varlikId: v.basvuruId,
        eylem: 'guncelleme', alan: 'durum',
        once: soz(mevcut.durum), sonra: soz('reddedildi'), gerekce: v.gerekce,
      }, tx);
    });
    revalidatePath(YOL);
    return tamam();
  } catch (e) { return hata(e); }
}

/* ── YURT DIŞINA AKTARIM BİLDİRİMİ ─────────────────────────────────── */

const BildirimGirdisi = z.object({
  aktarimId: z.string().min(1),
  /* Bildirim tarihi İNSANIN BEYANIDIR: bugünü varsaymak, kurumun
     yapmadığı bir bildirime tarih atfetmek olurdu (KVK-ENV-001). */
  bildirimTarihi: z.string().trim().min(1, 'Bildirim tarihi zorunlu'),
});

export async function aktarimBildirimiIsaretle(
  girdi: z.input<typeof BildirimGirdisi>,
): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'onay');
    const v = BildirimGirdisi.parse(girdi);
    const tarih = new Date(v.bildirimTarihi);
    if (Number.isNaN(tarih.getTime())) throw new Error('Bildirim tarihi okunamadı');
    if (tarih.getTime() > Date.now()) {
      throw new Error('Bildirim tarihi GELECEKTE olamaz — yapılmamış bir bildirim işaretlenemez.');
    }

    const mevcut = await db.yurtDisiAktarim.findUnique({
      where: { id: v.aktarimId },
      select: { id: true, dayanak: true, bildirimTarihi: true, aliciUlke: true },
    });
    if (!mevcut) throw new Error('Aktarım kaydı bulunamadı');

    await db.$transaction(async (tx) => {
      const s = await tx.yurtDisiAktarim.updateMany({
        where: { id: v.aktarimId, bildirimTarihi: mevcut.bildirimTarihi },
        data: { bildirimTarihi: tarih },
      });
      if (s.count === 0) throw new Error(ARADA_DEGISTI);
      await iz({
        aktorId: k.id, varlikTipi: 'YurtDisiAktarim', varlikId: v.aktarimId,
        eylem: 'guncelleme', alan: 'bildirimTarihi',
        once: mevcut.bildirimTarihi?.toISOString() ?? 'girilmedi',
        sonra: tarih.toISOString(),
        gerekce: `${mevcut.aliciUlke} · ${mevcut.dayanak} · mercie bildirim beyanı`,
      }, tx);
    });
    revalidatePath(YOL);
    return tamam();
  } catch (e) { return hata(e); }
}

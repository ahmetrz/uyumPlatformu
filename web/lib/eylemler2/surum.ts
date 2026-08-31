'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';
import { z } from 'zod';

/* Regülasyon sürüm yaşam döngüsü (§42, §66 — kabul testi 6):
   - Yeni sürüm TASLAK olarak açılır; aktif sürümün maddeleri kopyalanır.
   - Taslak üzerinde içe aktarım / elle düzenleme yapılır.
   - Aktifleştirme: eski sürüm arşive iner, kod bazında DIFF üretilir,
     değişen/yeni maddeler için aktif süreçlerin kapsamındaki tesislere
     'degerlendirilmedi' durum kayıtları açılır.
   - ESKİ SÜRÜMÜN MADDELERİ VE DEĞERLENDİRMELERİ SİLİNMEZ. */

export async function surumOlustur(girdi: { regulasyonId: string; etiket: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma');
    const v = z.object({ regulasyonId: z.string().min(1), etiket: bosluksuz('Sürüm etiketi') }).parse(girdi);

    const yeni = await db.frameworkSurumu.create({ data: {
      regulasyonId: v.regulasyonId, surumEtiketi: v.etiket, durum: 'taslak' } });

    // Aktif sürümün (veya sürümsüz geçiş kayıtlarının) maddelerini taslağa kopyala
    const aktif = await db.frameworkSurumu.findFirst({
      where: { regulasyonId: v.regulasyonId, durum: 'aktif' } });
    const kaynakMaddeler = await db.madde.findMany({
      where: { regulasyonId: v.regulasyonId, silindi: null,
        surumId: aktif ? aktif.id : null },
      include: { alanlar: true, ustMadde: { select: { kod: true } } },
      orderBy: { sira: 'asc' },
    });
    const kodIdx = new Map<string, string>();
    for (const m of kaynakMaddeler) {
      const kopya = await db.madde.create({ data: {
        regulasyonId: m.regulasyonId, surumId: yeni.id, kod: m.kod,
        baslik: m.baslik, metin: m.metin, kanitTipi: m.kanitTipi, sira: m.sira,
        alanAdi: m.alanAdi, altAlan: m.altAlan, zorunlulukTipi: m.zorunlulukTipi,
        kanitBeklentisi: m.kanitBeklentisi, degerlendirmeRehberi: m.degerlendirmeRehberi,
        varsayilanIncelemeGunu: m.varsayilanIncelemeGunu,
      } });
      kodIdx.set(m.kod, kopya.id);
      for (const a of m.alanlar)
        await db.maddeAlan.create({ data: { maddeId: kopya.id, alanId: a.alanId } });
    }
    // hiyerarşiyi kod üzerinden yeniden kur
    for (const m of kaynakMaddeler) {
      if (m.ustMadde?.kod && kodIdx.has(m.kod) && kodIdx.has(m.ustMadde.kod))
        await db.madde.update({ where: { id: kodIdx.get(m.kod)! },
          data: { ustMaddeId: kodIdx.get(m.ustMadde.kod)! } });
    }

    await iz({ aktorId: k.id, varlikTipi: 'Regulasyon', varlikId: v.regulasyonId,
      eylem: 'olusturma', alan: 'surum', sonra: `${v.etiket} (taslak, ${kaynakMaddeler.length} madde kopyalandı)` });
    revalidatePath('/regulasyonlar'); revalidatePath('/ice-aktarim');
    return tamam();
  } catch (e) { return hata(e); }
}

const CAKISMA =
  'Bu regülasyonun sürüm durumu bu sırada başka bir kullanıcı tarafından '
  + 'değiştirildi; sayfayı yenileyip tekrar deneyin.';

/**
 * `FrameworkSurumu_tekAktif` kısmi tekil indeksinin ihlalini kullanıcı diline
 * çevirir. Kısıt şemada görünmez (Prisma `@@unique` üzerinde `WHERE` yazamaz;
 * bkz. migration 20260901201000), bu yüzden Prisma onu tanımaz ve çıplak
 * istisna ekrana "Invalid `db.frameworkSurumu.updateMany()` invocation …
 * UNIQUE constraint failed: FrameworkSurumu.regulasyonId" olarak,
 * kaynak kodu ve dosya yolu ile birlikte düşerdi. Kullanıcıya çıkan mesaj
 * sorunu ANLATMALI ve iç yapıyı sızdırmamalı.
 *
 * Ayırt etme: aynı modelde bir de `@@unique([regulasyonId, surumEtiketi])`
 * var. İhlal edilen kısıt YALNIZ `regulasyonId` kolonundaysa bu bizim kısmi
 * indeksimizdir; iki kolonluysa "bu sürüm etiketi zaten var" hatasıdır ve
 * olduğu gibi bırakılır.
 */
function tekAktifIhlaliniCevir(e: unknown): unknown {
  const h = e as { code?: string; meta?: Record<string, unknown> } | null;
  if (h?.code !== 'P2002') return e;
  const meta = JSON.stringify(h.meta ?? {});
  if (!meta.includes('FrameworkSurumu')) return e;
  // Kısmi indeks tek kolonludur; iki kolonlu tekillik başka bir hatadır.
  if (meta.includes('surumEtiketi')) return e;
  return new Error(
    'Bu regülasyonda zaten aktif bir sürüm var; aktifleştirme veritabanı '
    + 'kısıtıyla reddedildi (bir regülasyonda yalnız bir aktif sürüm olabilir). '
    + 'Sayfayı yenileyip güncel durumla tekrar deneyin.',
  );
}

export async function surumAktiflestir(girdi: { surumId: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'onay');
    const yeni = await db.frameworkSurumu.findUniqueOrThrow({
      where: { id: girdi.surumId }, include: { regulasyon: true } });
    if (yeni.durum !== 'taslak') return { ok: false, hata: 'Yalnız taslak sürüm aktifleştirilir' };

    const eski = await db.frameworkSurumu.findFirst({
      where: { regulasyonId: yeni.regulasyonId, durum: 'aktif' } });
    const eskiMaddeler = await db.madde.findMany({
      where: { regulasyonId: yeni.regulasyonId, silindi: null,
        surumId: eski ? eski.id : null } });
    const yeniMaddeler = await db.madde.findMany({
      where: { regulasyonId: yeni.regulasyonId, surumId: yeni.id, silindi: null } });

    // ---- DIFF (kod bazında)
    const eskiIdx = new Map(eskiMaddeler.map((m) => [m.kod, m]));
    const yeniIdx = new Map(yeniMaddeler.map((m) => [m.kod, m]));
    const degisenYeniIdler: string[] = [];
    let yeniSayisi = 0, degisenSayisi = 0, kaldirilanSayisi = 0;
    for (const m of yeniMaddeler) {
      const e = eskiIdx.get(m.kod);
      if (!e) {
        await db.surumFarki.create({ data: {
          eskiSurumId: eski?.id ?? null, yeniSurumId: yeni.id, maddeKodu: m.kod,
          degisimTipi: 'yeni', ozet: m.baslik } });
        degisenYeniIdler.push(m.id); yeniSayisi++;
      } else if (e.metin !== m.metin || e.baslik !== m.baslik) {
        await db.surumFarki.create({ data: {
          eskiSurumId: eski?.id ?? null, yeniSurumId: yeni.id, maddeKodu: m.kod,
          degisimTipi: 'degisti',
          ozet: e.baslik !== m.baslik ? `${e.baslik} → ${m.baslik}` : 'Metin güncellendi' } });
        degisenYeniIdler.push(m.id); degisenSayisi++;
      }
    }
    for (const e of eskiMaddeler) {
      if (!yeniIdx.has(e.kod)) {
        const etkilenen = await db.maddeDurumu.count({ where: { maddeId: e.id } });
        await db.surumFarki.create({ data: {
          eskiSurumId: eski?.id ?? null, yeniSurumId: yeni.id, maddeKodu: e.kod,
          degisimTipi: 'kaldirildi', ozet: e.baslik,
          etkiNotu: etkilenen > 0 ? `${etkilenen} mevcut değerlendirme tarihçede kalır` : null } });
        kaldirilanSayisi++;
      }
    }

    /* ---- sürüm durumları (P7 · docs/POSTGRES_READINESS.md §c)

       Eski kod "eskiyi arşivle, yeniyi aktifleştir" adımlarını koşulsuz ve
       transaction'sız yazıyordu. Eşzamanlı iki aktifleştirme iki AKTİF sürüm
       bırakabiliyordu; `lib/arama.ts` ve `app/(atlas)/uyum/veri.ts` gibi
       "aktif sürüm" filtreleri o anda sonuçları İKİ KAT döndürüyordu.

       İki katmanlı savunma:
       1) Koşullu `updateMany` — taslak hâlâ taslakken, eski hâlâ aktifken
          yazılır; kaybeden `count === 0` görür ve açık hata alır.
       2) ASIL kısıt veritabanındadır: `FrameworkSurumu_tekAktif` kısmi tekil
          indeksi (migration 20260901201000). Uygulama katmanı atlansa da
          (seed, ham SQL, ileride başka bir çağrı yolu) ikinci aktif sürüm
          fiziksel olarak yazılamaz.

       Sürüm durumları, açılan değerlendirmeler ve İZ tek transaction içinde:
       arşivleme yazılıp aktifleştirme reddedilirse regülasyon aktif sürümsüz
       kalırdı. İz de içeride, çünkü tek SQLite bağlantısında transaction
       DIŞINDA yazılan iz, eşzamanlı başarısız bir çağrının geri alınmasıyla
       SESSİZCE yutuluyor (ölçüldü: tests/yaris-kosullari; bkz. eylemler2/
       ortak.ts `iz` yorumu). Aktifleştirme izsiz kalamaz. */
    await db.$transaction(async (tx) => {
      if (eski) {
        const arsivlendi = await tx.frameworkSurumu.updateMany({
          where: { id: eski.id, durum: 'aktif' }, data: { durum: 'arsiv' } });
        if (arsivlendi.count === 0) throw new Error(CAKISMA);
      }
      const aktiflendi = await tx.frameworkSurumu.updateMany({
        where: { id: yeni.id, durum: 'taslak' },
        data: { durum: 'aktif', yururlukTarih: new Date() } });
      if (aktiflendi.count === 0) throw new Error(CAKISMA);

      // ---- yeni değerlendirme ihtiyacı: değişen/yeni YAPRAK maddeler için
      // aktif süreçlerin kapsam tesislerine 'degerlendirilmedi' kayıtları
      const surecler = await tx.uyumSureci.findMany({
        where: { regulasyonId: yeni.regulasyonId, durum: 'aktif' },
        include: { kapsam: true } });
      const altSahipler = new Set(yeniMaddeler.map((m) => m.ustMaddeId).filter(Boolean));
      let acilan = 0;
      for (const surec of surecler) {
        for (const maddeId of degisenYeniIdler) {
          if (altSahipler.has(maddeId)) continue; // yaprak değil
          for (const kapsamKaydi of surec.kapsam) {
            await tx.maddeDurumu.upsert({
              where: { surecId_maddeId_tesisId: {
                surecId: surec.id, maddeId, tesisId: kapsamKaydi.tesisId } },
              update: {},
              create: { surecId: surec.id, maddeId, tesisId: kapsamKaydi.tesisId,
                durum: 'degerlendirilmedi', guven: 'kanit_yok' },
            });
            acilan++;
          }
        }
      }

      await iz({ aktorId: k.id, varlikTipi: 'Regulasyon', varlikId: yeni.regulasyonId,
        eylem: 'durum_degisimi', alan: 'aktif_surum',
        once: eski?.surumEtiketi ?? 'sürümsüz', sonra: yeni.surumEtiketi,
        gerekce: `diff: +${yeniSayisi} yeni, ~${degisenSayisi} değişen, -${kaldirilanSayisi} kaldırılan; ${acilan} yeni değerlendirme açıldı` }, tx);
    });

    revalidatePath('/regulasyonlar'); revalidatePath('/surecler'); revalidatePath('/');
    return tamam();
  } catch (e) { return hata(tekAktifIhlaliniCevir(e)); }
}

'use server';

import { revalidatePath } from 'next/cache';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { PARAMETRE_SINIRI, parcala } from '../sorguParcala';
import type { Prisma } from '../prisma-client/client';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';
import { z } from 'zod';

/* Toplu yazma yollarının transaction bütçesi. `lib/eylemler.ts`
   (aktarimOnayla) ile aynı değerler: 500 maddelik bir çerçevede toplu
   yazma saniyeler sürebilir, varsayılan 5 sn'lik Prisma sınırı yetmez. */
const TX_SECENEK = { timeout: 120_000, maxWait: 15_000 };

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

    /* ---- TEK TRANSACTION + TOPLU YAZMA (denetim bulgusu #14)

       Eski kod sürümü açıp maddeleri transaction DIŞINDA, madde başına bir
       `create` ve alan başına bir `create` ile kopyalıyordu. İki ayrı kusur:

       1) ATOMİKLİK. Ortada patlarsa YARIM KOPYALANMIŞ bir taslak sürüm
          kalıcı olarak kalıyordu ve yarım olduğu hiçbir yerde yazmıyordu:
          sonraki okuyucu (içe aktarım ekranı, aktifleştirme diff'i) onu TAM
          sanıyor, eksik maddeler "kaldırılmış" görünüyordu. Sürüm satırının
          kendisi de dışarıda açıldığı için hata sonrası bile duruyordu.
       2) N+1. 500 maddelik bir çerçevede 500 madde + 500 alan + üst madde
          başına bir `update` = 1.000'den fazla sıralı gidiş-dönüş.

       Artık her şey tek transaction içinde ve toplu: sürüm satırı, madde
       kopyaları, alan bağları, hiyerarşi ve İZ. Tek `throw` hepsini geri
       sarar — yarım sürüm fiziksel olarak oluşamaz.

       İZ de içeride: `lib/db.ts` tek SQLite bağlantısı kullanır ve
       transaction DIŞINDA yazılan iz, eşzamanlı başarısız bir çağrının
       geri alınmasıyla SESSİZCE yutulur (bkz. eylemler2/ortak.ts `iz`). */
    await db.$transaction(async (tx) => {
      const yeni = await tx.frameworkSurumu.create({ data: {
        regulasyonId: v.regulasyonId, surumEtiketi: v.etiket, durum: 'taslak' } });

      // Aktif sürümün (veya sürümsüz geçiş kayıtlarının) maddelerini taslağa kopyala
      const aktif = await tx.frameworkSurumu.findFirst({
        where: { regulasyonId: v.regulasyonId, durum: 'aktif' } });
      const kaynakMaddeler = await tx.madde.findMany({
        where: { regulasyonId: v.regulasyonId, silindi: null,
          surumId: aktif ? aktif.id : null },
        include: { alanlar: { select: { alanId: true } }, ustMadde: { select: { kod: true } } },
        orderBy: { sira: 'asc' },
      });

      if (kaynakMaddeler.length > 0) {
        /* Madde kopyaları TOPLU açılır. `createManyAndReturn` parça başına
           TEK gidiş-dönüş yapar ve açılan id'leri döndürür; dönen SIRAYA
           güvenilmez, eşleştirme `kod` üzerinden yapılır (`Madde` modelinde
           `@@unique([regulasyonId, surumId, kod])` bunu garanti eder).
           Satır başına 14 parametre bağlanır (id + 13 kolon); parçalama
           SQLite'ın 999 parametre sınırına göre yapılır. */
        const satirlar = kaynakMaddeler.map((m) => ({
          regulasyonId: m.regulasyonId, surumId: yeni.id, kod: m.kod,
          baslik: m.baslik, metin: m.metin, kanitTipi: m.kanitTipi, sira: m.sira,
          alanAdi: m.alanAdi, altAlan: m.altAlan, zorunlulukTipi: m.zorunlulukTipi,
          kanitBeklentisi: m.kanitBeklentisi, degerlendirmeRehberi: m.degerlendirmeRehberi,
          varsayilanIncelemeGunu: m.varsayilanIncelemeGunu,
        }));
        const kodIdx = new Map<string, string>();
        for (const p of parcala(satirlar, 14)) {
          const acilan = await tx.madde.createManyAndReturn({
            data: p, select: { id: true, kod: true } });
          for (const a of acilan) kodIdx.set(a.kod, a.id);
        }

        // Alan bağları: madde başına bir `create` değil, tek toplu yazma.
        // createMany satır başına 3 parametre bağlar: id, maddeId, alanId.
        const ciftler = kaynakMaddeler.flatMap((m) => {
          const maddeId = kodIdx.get(m.kod);
          return maddeId ? m.alanlar.map((a) => ({ maddeId, alanId: a.alanId })) : [];
        });
        for (const p of parcala(ciftler, 3)) await tx.maddeAlan.createMany({ data: p });

        /* Hiyerarşi: kimlik eşlemesi BELLEKTE (`kodIdx`) çözülür, madde
           başına sorgu açılmaz. Aynı üst maddeye bağlanan çocuklar tek
           `updateMany` ile yazılır — sorgu sayısı madde sayısıyla değil
           FARKLI ÜST MADDE sayısıyla orantılıdır. */
        const ustGruplari = new Map<string, string[]>();
        for (const m of kaynakMaddeler) {
          const ustKod = m.ustMadde?.kod;
          if (!ustKod) continue;
          const ustId = kodIdx.get(ustKod);
          const cocukId = kodIdx.get(m.kod);
          if (!ustId || !cocukId) continue; // üst madde kopyalanan kümede değil
          const grup = ustGruplari.get(ustId);
          if (grup) grup.push(cocukId); else ustGruplari.set(ustId, [cocukId]);
        }
        for (const [ustMaddeId, cocuklar] of ustGruplari) {
          for (const p of parcala(cocuklar, 1)) {
            await tx.madde.updateMany({ where: { id: { in: p } }, data: { ustMaddeId } });
          }
        }
      }

      await iz({ aktorId: k.id, varlikTipi: 'Regulasyon', varlikId: v.regulasyonId,
        eylem: 'olusturma', alan: 'surum',
        sonra: `${v.etiket} (taslak, ${kaynakMaddeler.length} madde kopyalandı)` }, tx);
    }, TX_SECENEK);

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

    /* ---- DIFF (kod bazında) — PLANLANIR, henüz YAZILMAZ (bulgu #15)

       Eski kod `SurumFarki` satırlarını aktifleştirme transaction'ından
       ÖNCE ve DIŞINDA yazıyordu. Asıl transaction `CAKISMA` ile (ya da
       kısmi tekil indeks ihlaliyle) reddedilirse diff satırları
       veritabanında kalıyor ve HİÇ AKTİFLEŞMEMİŞ bir sürüm için
       "değişiklik farkı" görünüyordu — sürüm hâlâ taslakken kullanıcıya
       "şu maddeler değişti" diye sunulan, karşılığı olmayan bir liste.
       Ayrıca ikinci bir deneme aynı satırları BİR KEZ DAHA yazıyordu.

       Şimdi diff yalnız bellekte kurulur; yazma aşağıda, durum değişimiyle
       AYNI transaction içinde ve toplu yapılır. */
    const eskiIdx = new Map(eskiMaddeler.map((m) => [m.kod, m]));
    const yeniIdx = new Map(yeniMaddeler.map((m) => [m.kod, m]));
    const degisenYeniIdler: string[] = [];
    const farkSatirlari: Prisma.SurumFarkiCreateManyInput[] = [];
    let yeniSayisi = 0, degisenSayisi = 0, kaldirilanSayisi = 0;
    for (const m of yeniMaddeler) {
      const e = eskiIdx.get(m.kod);
      if (!e) {
        farkSatirlari.push({
          eskiSurumId: eski?.id ?? null, yeniSurumId: yeni.id, maddeKodu: m.kod,
          degisimTipi: 'yeni', ozet: m.baslik });
        degisenYeniIdler.push(m.id); yeniSayisi++;
      } else if (e.metin !== m.metin || e.baslik !== m.baslik) {
        farkSatirlari.push({
          eskiSurumId: eski?.id ?? null, yeniSurumId: yeni.id, maddeKodu: m.kod,
          degisimTipi: 'degisti',
          ozet: e.baslik !== m.baslik ? `${e.baslik} → ${m.baslik}` : 'Metin güncellendi' });
        degisenYeniIdler.push(m.id); degisenSayisi++;
      }
    }
    const kaldirilanlar = eskiMaddeler.filter((e) => !yeniIdx.has(e.kod));
    /* Etki notu sayımı: kaldırılan madde başına bir `count` yerine tek
       `groupBy`. Sorgu sayısı kaldırılan madde sayısıyla değil parametre
       sınırıyla (madde id başına 1 parametre) orantılıdır. */
    const etkiSayilari = new Map<string, number>();
    for (const p of parcala(kaldirilanlar.map((e) => e.id), 1)) {
      const gruplar = await db.maddeDurumu.groupBy({
        by: ['maddeId'], where: { maddeId: { in: p } }, _count: { _all: true } });
      for (const g of gruplar) etkiSayilari.set(g.maddeId, g._count._all);
    }
    for (const e of kaldirilanlar) {
      const etkilenen = etkiSayilari.get(e.id) ?? 0;
      farkSatirlari.push({
        eskiSurumId: eski?.id ?? null, yeniSurumId: yeni.id, maddeKodu: e.kod,
        degisimTipi: 'kaldirildi', ozet: e.baslik,
        etkiNotu: etkilenen > 0 ? `${etkilenen} mevcut değerlendirme tarihçede kalır` : null });
      kaldirilanSayisi++;
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

       Sürüm durumları, DIFF SATIRLARI, açılan değerlendirmeler ve İZ tek
       transaction içinde: arşivleme yazılıp aktifleştirme reddedilirse
       regülasyon aktif sürümsüz kalırdı; diff dışarıda yazılırsa (eski hâli,
       bulgu #15) hiç aktifleşmemiş sürümün farkı ortada kalırdı. İz de
       içeride, çünkü tek SQLite bağlantısında transaction
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

      /* DIFF yazımı burada — aktifleştirme kabul edildikten SONRA, aynı
         transaction'da (bulgu #15). createMany satır başına 7 parametre
         bağlar: id, eskiSurumId, yeniSurumId, maddeKodu, degisimTipi,
         ozet, etkiNotu (`olusturuldu` şema varsayılanıdır). */
      for (const p of parcala(farkSatirlari, 7)) await tx.surumFarki.createMany({ data: p });

      /* ---- yeni değerlendirme ihtiyacı: değişen/yeni YAPRAK maddeler için
         aktif süreçlerin kapsam tesislerine 'degerlendirilmedi' kayıtları

         BULGU #21 — burada süreç × değişen madde × kapsam tesisi üçlü
         döngüsü vardı ve her yaprakta bir `upsert` çalışıyordu. SQLite TEK
         YAZICIDIR: bu döngü yazma transaction'ını binlerce gidiş-dönüş
         boyunca açık tutuyordu ve o süre boyunca uygulamada BAŞKA HİÇBİR
         yazma ilerleyemiyordu — giriş (oturum açma) dâhil. 500 madde × 2
         süreç × 3 tesis = 3.000 upsert ölçüldü.

         `upsert` yerine "önce var olanları TEK sorguda oku → `Map`/`Set` →
         eksikleri `createMany`" kalıbı: okuma parametre sınırına göre
         parçalanır, yazma da öyle. Atomiklik değişmedi — hepsi hâlâ aynı
         transaction'ın içinde.

         `skipDuplicates` KULLANILMADI: SQLite'ta desteklenmiyor (üretilmiş
         istemcide o seçenek yok). Tekrarlar bu yüzden bellekte elenir;
         transaction içinde başka yazıcı olmadığı için okuma-yazma arası
         yeni satır da doğamaz. */
      const surecler = await tx.uyumSureci.findMany({
        where: { regulasyonId: yeni.regulasyonId, durum: 'aktif' },
        include: { kapsam: { select: { tesisId: true } } } });
      const altSahipler = new Set(yeniMaddeler.map((m) => m.ustMaddeId).filter(Boolean));
      const yaprakIdler = degisenYeniIdler.filter((id) => !altSahipler.has(id));
      const surecIdler = surecler.map((s) => s.id);

      const anahtar = (surecId: string, maddeId: string, tesisId: string) =>
        `${surecId} ${maddeId} ${tesisId}`;
      const mevcut = new Set<string>();
      if (yaprakIdler.length > 0 && surecIdler.length > 0) {
        /* Parametre bütçesi: ifade hem `maddeId IN (…)` hem `surecId IN (…)`
           bağlar. Madde parçası, süreç listesine yer kalsın diye yarım
           bütçeyle bölünür; süreç sayısı o payı aşarsa süreç filtresi
           bırakılır ve ayıklama zaten bellekte yapıldığı için sonuç değişmez. */
        const surecFiltresi = surecIdler.length <= PARAMETRE_SINIRI / 2
          ? { surecId: { in: surecIdler } } : {};
        for (const p of parcala(yaprakIdler, 2)) {
          const satirlar = await tx.maddeDurumu.findMany({
            where: { maddeId: { in: p }, ...surecFiltresi },
            select: { surecId: true, maddeId: true, tesisId: true } });
          for (const s of satirlar) mevcut.add(anahtar(s.surecId, s.maddeId, s.tesisId));
        }
      }

      const acilacak: Prisma.MaddeDurumuCreateManyInput[] = [];
      for (const surec of surecler) {
        for (const maddeId of yaprakIdler) {
          for (const kapsamKaydi of surec.kapsam) {
            const a = anahtar(surec.id, maddeId, kapsamKaydi.tesisId);
            if (mevcut.has(a)) continue;
            mevcut.add(a); // aynı üçlü iki kez planlanmasın
            acilacak.push({ surecId: surec.id, maddeId, tesisId: kapsamKaydi.tesisId,
              durum: 'degerlendirilmedi', guven: 'kanit_yok' });
          }
        }
      }
      // createMany satır başına 7 parametre bağlar: id, surecId, maddeId,
      // tesisId, durum, guven, guncellendi (@updatedAt).
      for (const p of parcala(acilacak, 7)) await tx.maddeDurumu.createMany({ data: p });
      /* Eski kod `acilan`'ı ZATEN VAR OLAN satırlar için de artırıyordu
         (`upsert` + `update: {}`), yani iz "açıldı" derken çoğu zaman
         hiçbir şey açmamış olabiliyordu. Sayı artık gerçekten açılan
         satırdır. */
      const acilan = acilacak.length;

      await iz({ aktorId: k.id, varlikTipi: 'Regulasyon', varlikId: yeni.regulasyonId,
        eylem: 'durum_degisimi', alan: 'aktif_surum',
        once: eski?.surumEtiketi ?? 'sürümsüz', sonra: yeni.surumEtiketi,
        gerekce: `diff: +${yeniSayisi} yeni, ~${degisenSayisi} değişen, -${kaldirilanSayisi} kaldırılan; ${acilan} yeni değerlendirme açıldı` }, tx);
    }, TX_SECENEK);

    revalidatePath('/regulasyonlar'); revalidatePath('/surecler'); revalidatePath('/');
    return tamam();
  } catch (e) { return hata(tekAktifIhlaliniCevir(e)); }
}

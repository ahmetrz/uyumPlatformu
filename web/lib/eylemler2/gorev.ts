'use server';

/* Görev ve onay merkezi eylemleri: manuel görev açma, görev durum değişimi
   (sahiplik: sorumlu ya da uyum onay yetkisi) ve onay taleplerinin karara
   bağlanması. Onay kararı yonetim/onay VEYA talebin ilgili modülünde onay
   yetkisi ister; red gerekçesiz verilemez; her karar iz bırakır. Karar kaydı
   kaynak kaydı otomatik DEĞİŞTİRMEZ — uygulama ilgili modülün sorumluluğudur. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar, kapsamZorunlu, KAPSAM_SONRA, type Modul } from '../erisim';
import { GOREV_TIP_ETIKET } from '../sabitler';
import { parcala } from '../sorguParcala';
import type { Prisma } from '../prisma-client/client';
import type { AktifKullanici } from '../auth';
import { tamam, hata, iz, bosluksuz, tarihAlani, type Sonuc } from './ortak';

const GOREV_DURUMLARI = ['acik', 'yapiliyor', 'tamamlandi', 'iptal'] as const;

/* Onay talebi tipi → kararın dayandığı modül (yonetim/onay her tipe yeter). */
const ONAY_TIP_MODUL: Record<string, Modul> = {
  bulgu_kapanis: 'uyum', risk_kabul: 'risk', istisna: 'uyum',
  proje_aday: 'proje', applicability_override: 'uyum', proje_kapanis: 'proje',
};

function tazele() {
  revalidatePath('/yonetim-tezgahi');
  revalidatePath('/'); // ana panodaki açık görev / bekleyen onay sayaçları
}

// ------------------------------------------------------------ manuel görev

const GorevGirdisi = z.object({
  baslik: bosluksuz('Başlık'),
  tip: bosluksuz('Tip').refine((t) => t in GOREV_TIP_ETIKET, 'Geçersiz görev tipi'),
  sorumluId: z.string().nullable().optional(),
  tesisId: z.string().nullable().optional(),
  sonTarih: tarihAlani,
});

/** Elle görev açar (otomatikUretildi=false). Tesise bağlı görevde o tesis
    kapsamında uyum yazma yetkisi aranır. */
export async function gorevOlustur(girdi: {
  baslik: string; tip: string; sorumluId?: string | null;
  tesisId?: string | null; sonTarih?: string | null;
}): Promise<Sonuc> {
  try {
    /* İKİ AŞAMALI KAPI (`KAPSAM_SONRA`, bkz. erisim.ts): ön kapı kapsamsız
       çağrılırsa tesise kısıtlı rol daha ilk adımda reddedilir ve kendi
       santraline görev açamaz. Gerçek denetim KOŞULSUZ: tesissiz görev
       kurumsaldır, tesise kısıtlı rol onu da açamaz. */
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = GorevGirdisi.parse(girdi);
    kapsamZorunlu(k, 'uyum', 'yazma', { tesisId: v.tesisId },
      'Bu tesis kapsamında görev açma yetkiniz yok');
    if (v.sorumluId) {
      const sorumlu = await db.kullanici.findUnique({ where: { id: v.sorumluId } });
      if (!sorumlu || !sorumlu.aktif) throw new Error('Seçilen sorumlu bulunamadı ya da pasif');
    }
    if (v.tesisId && !(await db.tesis.findUnique({ where: { id: v.tesisId } })))
      throw new Error('Seçilen tesis bulunamadı');

    const yeni = await db.gorev.create({ data: {
      baslik: v.baslik, tip: v.tip,
      sorumluId: v.sorumluId || null, tesisId: v.tesisId || null,
      sonTarih: v.sonTarih ?? null, otomatikUretildi: false,
    } });
    await iz({ aktorId: k.id, varlikTipi: 'Gorev', varlikId: yeni.id,
      eylem: 'olusturma', sonra: v.baslik });
    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------ görev durumu

/** Görev durum değişimi: uyum/yazma yeterli; sorumlusu atanmış görevi yalnız
    sorumlusu ya da uyum onay yetkisi olan değiştirir. 'tamamlandi' kapanış
    damgası basar; yeniden açılış damgayı siler. */
export async function gorevDurum(girdi: { id: string; durum: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('uyum', 'yazma', KAPSAM_SONRA);
    const v = z.object({
      id: z.string(),
      durum: z.enum(GOREV_DURUMLARI, 'Geçersiz görev durumu'),
    }).parse(girdi);
    const g = await db.gorev.findUnique({ where: { id: v.id } });
    if (!g) throw new Error('Görev bulunamadı');
    /* Kapsam denetimi HER ŞEYDEN ÖNCE. İki sebebi var:
       · Ön kapı `KAPSAM_SONRA` ile gevşetildi; görevin kendi tesisi burada
         sorulmazsa tesise kısıtlı rol başka santralin görevini kapatır.
       · "Zaten bu durumda" kısa yolundan da önce gelmeli: sonra gelseydi
         kapsam dışı bir çağrı, durumu DOĞRU tahmin ettiğinde `tamam()`,
         yanlış tahmin ettiğinde yetki hatası alırdı — eylem başka
         santralin görevleri için bir DURUM KEHANETİNE dönerdi.
         Ölçüldü (2026-09-02, gözden geçirme).
       Aşağıdaki sahiplik kuralı bundan AYRI bir sorudur, yerine geçmez. */
    kapsamZorunlu(k, 'uyum', 'yazma', { tesisId: g.tesisId },
      'Bu tesis kapsamında görev değiştirme yetkiniz yok');
    if (g.durum === v.durum) return tamam();
    if (g.sorumluId && g.sorumluId !== k.id
      && !izinVar(k, 'uyum', 'onay', g.tesisId ? { tesisId: g.tesisId } : {}))
      throw new Error('Bu görevi yalnız sorumlusu ya da uyum onay yetkisi olan kapatabilir');

    await db.gorev.update({ where: { id: v.id }, data: {
      durum: v.durum,
      kapanis: v.durum === 'tamamlandi' || v.durum === 'iptal' ? new Date() : null,
    } });
    await iz({ aktorId: k.id, varlikTipi: 'Gorev', varlikId: v.id,
      eylem: 'durum_degisimi', alan: 'durum', once: g.durum, sonra: v.durum });
    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}

// ------------------------------------------------------------- onay kararı

const OnayKararGirdisi = z.object({
  id: z.string(),
  karar: z.enum(['onaylandi', 'reddedildi'], 'Geçersiz karar'),
  gerekce: z.string().nullable().optional(),
}).refine((g) => g.karar !== 'reddedildi' || !!g.gerekce?.trim(),
  { message: 'Red kararı gerekçesiz verilemez' });

/** Bekleyen onay talebini karara bağlar. Yetki: yonetim/onay VEYA talebin
    tipine karşılık gelen modülde onay. Dört göz ilkesi: talebi açan kendi
    talebini karara bağlayamaz. */
export async function onayKarar(girdi: {
  id: string; karar: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const v = OnayKararGirdisi.parse(girdi);
    const talep = await db.onayTalebi.findUnique({ where: { id: v.id } });
    if (!talep) throw new Error('Onay talebi bulunamadı');

    const modul = ONAY_TIP_MODUL[talep.tip] ?? 'yonetim';
    let k: AktifKullanici;
    try {
      k = await yetkiZorunlu('yonetim', 'onay');
    } catch (e) {
      // yonetim/onay yoksa ilgili modülün onay yetkisi de kabul edilir;
      // oturum/demo hataları olduğu gibi yükselir.
      if (e instanceof Error && e.message.startsWith('Bu işlem için yetkiniz yok'))
        k = await yetkiZorunlu(modul, 'onay');
      else throw e;
    }

    if (talep.durum !== 'bekliyor') throw new Error('Bu talep zaten karara bağlanmış');
    if (talep.talepEdenId === k.id)
      throw new Error('Dört göz ilkesi: kendi açtığınız talebi siz karara bağlayamazsınız');

    /* Kararı ATOMİK olarak sahiplen.

       Yukarıdaki `durum !== 'bekliyor'` kontrolü tek başına yetmez: iki
       onaylayan aynı anda karar verirse İKİSİ DE 'bekliyor' görür, ikisi
       de yazar ve `onayYanEtkisi` İKİ KEZ uygulanır — istisna iki kez
       aktifleşir, madde durumu iki kez değişir, denetim izine iki onay
       satırı düşer. Dört göz kontrolü de yalnız aynı kişiye karşı korur,
       iki farklı kişiye karşı değil.

       Koşullu `updateMany` bunu tek atomik ifadeye indirir: yalnız hâlâ
       'bekliyor' olan satır güncellenir. `count === 0` demek "başkası önce
       davrandı" demektir; kaybeden ne yan etki uygular ne de iz yazar.

       Bugün SQLite tek yazıcı olduğu için bu yarış dar bir pencerededir;
       PostgreSQL'de (READ COMMITTED) pencere gerçek genişliğine kavuşur.
       Düzeltmenin göçten ÖNCE yapılması gerekir: sonrasında iki kez
       uygulanmış bir yan etkiyi geriye dönük ayırt etmek mümkün değildir.

       SAHİPLENME + YAN ETKİ + İZ TEK TRANSACTION (denetim bulgusu #16).
       Sahiplenme atomikti ama yan etki transaction DIŞINDAYDI: istisna
       `aktif` yazıldıktan sonra madde durumları tek tek `kapsamdisi`'ye
       çekiliyordu ve ortada patlarsa istisna AKTİF görünürken maddelerin
       bir kısmı kapsam İÇİNDE kalıyordu — uyum yüzdesi (lib/sabitler.ts
       `uyumOzeti`) o maddeleri paydada saymaya devam ediyor, ekranda
       "onaylanmış istisna" ile "hâlâ uyumsuz madde" yan yana duruyordu.
       Geriye dönük ayırt edilemez, çünkü yarım kalmışlık hiçbir yerde
       yazmıyordu.

       İz de içeride: tek SQLite bağlantısında transaction DIŞINDA yazılan
       iz, eşzamanlı başarısız bir çağrının geri alınmasıyla SESSİZCE
       yutulur (bkz. eylemler2/ortak.ts `iz` yorumu).

       Sahiplenme transaction'ın İLK işlemidir: kaybeden `count === 0`
       görüp fırlatır ve yan etki HİÇ çalışmaz (bugünkü davranış). */
    await db.$transaction(async (tx) => {
      const sahiplenme = await tx.onayTalebi.updateMany({
        where: { id: v.id, durum: 'bekliyor' },
        data: {
          durum: v.karar, gerekce: v.gerekce?.trim() || null,
          onaylayanId: k.id, kapanis: new Date(),
        },
      });
      if (sahiplenme.count === 0) throw new Error('Bu talep zaten karara bağlanmış');
      await iz({ aktorId: k.id, varlikTipi: 'OnayTalebi', varlikId: v.id,
        eylem: v.karar === 'onaylandi' ? 'onay' : 'red',
        alan: 'durum', once: 'bekliyor', sonra: v.karar,
        gerekce: v.gerekce?.trim() || null }, tx);
      await onayYanEtkisi(tx, talep, v.karar, k.id);
    }, { timeout: 120_000, maxWait: 15_000 });
    tazele();
    return tamam();
  } catch (e) { return hata(e); }
}


/* Onay kararlarının tip bazlı yan etkileri. Şimdilik: istisna (§50) —
   onaylanınca istisna aktifleşir ve ilgili madde durumu 'kapsamdisi' olur;
   süre bitiminde deadline motoru yeniden değerlendirme açar.

   ÇAĞIRANIN transaction istemcisini alır ve YALNIZ onu kullanır: `db`
   üzerinden yazılan tek bir satır bile (tek SQLite bağlantısında) bu
   transaction geri alındığında sessizce yutulur ya da tersine, geri
   alınmayan bir yan etki bırakır. Bu yüzden imza `tx` zorunlu. */
async function onayYanEtkisi(
  tx: Prisma.TransactionClient,
  talep: { tip: string; kaynakTipi: string; kaynakId: string },
  karar: string, aktorId: string,
): Promise<void> {
  if (talep.tip !== 'istisna' || talep.kaynakTipi !== 'Istisna') return;
  const istisna = await tx.istisna.findUnique({ where: { id: talep.kaynakId } });
  if (!istisna || istisna.durum !== 'onay_bekliyor') return;

  if (karar !== 'onaylandi') {
    await tx.istisna.update({ where: { id: istisna.id },
      data: { durum: 'reddedildi' } });
    return;
  }
  await tx.istisna.update({ where: { id: istisna.id },
    data: { durum: 'aktif', onaylayanId: aktorId } });
  const durumlar = await tx.maddeDurumu.findMany({ where: {
    maddeId: istisna.maddeId, tesisId: istisna.tesisId } });
  const etkilenen = durumlar.filter((d) => d.durum !== 'kapsamdisi');
  if (etkilenen.length === 0) return;

  /* Satır başına üç gidiş-dönüş (tarihçe + durum + iz) yerine üç TOPLU
     yazma. Bugün `etkilenen` bir avuçtur (madde+tesis çifti başına aktif
     süreç sayısı kadar), yani kazanç ÖLÇÜLEBİLİR DEĞİL; değişikliğin
     gerekçesi transaction'ı kısa tutmaktır — SQLite tek yazıcıdır ve bu
     transaction açıkken başka hiçbir yazma ilerleyemez. */
  const bitisMetni = istisna.bitis.toISOString().slice(0, 10);
  const tarihceler: Prisma.DegerlendirmeTarihcesiCreateManyInput[] = etkilenen.map((d) => ({
    maddeDurumuId: d.id, eskiDurum: d.durum, yeniDurum: 'kapsamdisi',
    gerekce: `İstisna onayı: ${istisna.gerekce}`, aktorId }));
  // createMany satır başına 8 parametre bağlar: id, maddeDurumuId, eskiDurum,
  // yeniDurum, eskiGuven, yeniGuven, gerekce, aktorId.
  for (const p of parcala(tarihceler, 8)) await tx.degerlendirmeTarihcesi.createMany({ data: p });

  for (const p of parcala(etkilenen.map((d) => d.id), 1)) {
    await tx.maddeDurumu.updateMany({ where: { id: { in: p } }, data: { durum: 'kapsamdisi' } });
  }

  /* İz satırları `iz()` yerine doğrudan toplu yazılır: yardımcı tek satır
     yazar ve burada N satır var. Alan kümesi `ortak.ts` `iz` ile birebir
     aynıdır — `kaynak` şema varsayılanı ('ui') olarak bırakılır, tıpkı
     `iz`in bıraktığı gibi. */
  const izler: Prisma.AktiviteKaydiCreateManyInput[] = etkilenen.map((d) => ({
    aktorId, varlikTipi: 'MaddeDurumu', varlikId: d.id,
    eylem: 'durum_degisimi', alan: 'durum', oncekiDeger: d.durum, yeniDeger: 'kapsamdisi',
    gerekce: `İstisna ${istisna.id} onaylandı (bitiş: ${bitisMetni})` }));
  // createMany satır başına 9 parametre bağlar: id, aktorId, varlikTipi,
  // varlikId, eylem, alan, oncekiDeger, yeniDeger, gerekce.
  for (const p of parcala(izler, 9)) await tx.aktiviteKaydi.createMany({ data: p });
}

import 'server-only';
import { db } from '@/lib/db';
import { izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamda, type TesisKapsami, modulKapisi } from '@/app/kapsam';
import type { Kayit } from './mantik';

/* Denetim izi — SUNUCU VERİSİ.

   ═══════════════════════════════════════════════════════════════════════
   KARAR · DENETİM İZİNE KİM ERİŞİR (bilinçli, sessiz değil)
   ═══════════════════════════════════════════════════════════════════════
   Denetim izi hem bir GÜVENLİK yüzeyi hem bir GOVERNANCE yüzeyidir ve iki
   yön birbirini çeker: kısıtlarsan denetçi göremez, açık bırakırsan kütük
   "kim neyi ne zaman değiştirdi"yi herkese anlatır. Bu ekran daha önce
   YALNIZ oturum kontrolü yapıyordu ve gerekçesi de yazılıydı ("bir modül
   yetkisine bağlanması ekranı bugün görebilen rollerden alırdı"). O gerekçe
   ölçüldü ve yetersiz bulundu: `risk_sahibi` — envanteri, denetimi,
   projeyi, yönetimi HİÇ okuyamayan bir rol — bütün kurumun değişiklik
   geçmişini okuyabiliyordu.

   VERİLEN KARAR, iki katman:

   1. MODÜL KAPISI: `denetim/okuma`.
      Kütüğün konusu denetlenebilirliktir; `denetim` modülü tam olarak bu
      işin modülüdür. Kapıyı geçen roller (lib/erisim.ts ROL_IZINLERI):
      `yonetici`, `denetim_sorumlusu`, `dis_denetci`, `tesis_yoneticisi`,
      `katkici`, `okuyucu` — yani denetçinin ve yönetimin tamamı kütüğü
      görmeye devam eder. Kapının dışında kalanlar: `risk_sahibi`,
      `bt_yoneticisi`, `ot_yoneticisi`. Bu bilinçli bir DARALTMADIR:
      operatör rollerinin işi kendi kayıtlarını değiştirmektir, kurumun
      değişiklik geçmişini okumak değil. `yonetim` modülünü seçmek daha da
      dar olurdu ve dış denetçiyi (`dis_denetci`) dışarıda bırakırdı — yani
      kütüğü tam da onun için var olduğu kişiden alırdı.

   2. SANTRAL KAPSAMI: kaydın işaret ettiği santral TÜRETİLEBİLİYORSA
      kapsama uyulur; TÜRETİLEMİYORSA satır yalnız kapsamsız kullanıcıya
      görünür. Kural `lib/api/yetki.ts → tesisKapsamda` ile aynıdır
      (`app/kapsam.ts → kapsamda` onu aynen çağırır).
      Bu, "gizli olan gizli kalsın" tarafında hata yapar: bir madde ya da
      regülasyon değişikliği santral taşımadığı için santrale kısıtlı bir
      denetçiye görünmez. Alternatifi — türetilemeyeni herkese göstermek —
      kütüğü kapsam sınırından kaçmanın yolu yapardı: santralsiz bir
      varlık tipi seçen her kayıt sınırın dışına düşerdi.

   `AktiviteKaydi` şemada `tesisId` TAŞIMAZ (varlikTipi + varlikId ile
   işaret eder). Santral aşağıdaki TURETICILER tablosuyla, kayıt tipine
   göre tek sorguda çözülür.
   ═══════════════════════════════════════════════════════════════════════ */

/** Kütük penceresi — ekrana taşınan en yeni kayıt sayısı. */
export const PENCERE = 400;

export type EkranVerisi = {
  kayitlar: Kayit[];
  simdi: number;
  pencere: number;
  /** kütüğün gerçek büyüklüğü — pencerenin "hepsi bu" demesini engeller */
  toplam: number;
  /** true = kütük bir santral kapsamıyla daraltıldı */
  kapsamli: boolean;
};

/** Kayıt tipi → o tipteki id'lerin santralleri. `null` = türetilemedi. */
async function tesisleriCoz(
  kayitlar: { varlikTipi: string; varlikId: string }[],
): Promise<Map<string, (string | null)[]>> {
  const tipBasi = new Map<string, string[]>();
  for (const k of kayitlar) {
    const liste = tipBasi.get(k.varlikTipi) ?? [];
    liste.push(k.varlikId);
    tipBasi.set(k.varlikTipi, liste);
  }
  const id = (tip: string) => [...new Set(tipBasi.get(tip) ?? [])];
  const anahtar = (tip: string, x: string) => `${tip}:${x}`;
  const sonuc = new Map<string, (string | null)[]>();
  const yaz = (tip: string, x: string, t: (string | null)[]) => {
    sonuc.set(anahtar(tip, x), t);
  };

  await Promise.all([
    /* 'Tesis' kaydında varlikId SANTRALİN KENDİSİDİR — ayrı sorgu gerekmez,
       ama kaydın gerçekten var olduğunu doğrulamaya da gerek yoktur:
       kapsam kararı id üzerinden verilir. */
    (async () => {
      for (const x of id('Tesis')) yaz('Tesis', x, [x]);
    })(),
    (async () => {
      const idler = id('Risk');
      if (!idler.length) return;
      for (const r of await db.risk.findMany({
        where: { id: { in: idler } }, select: { id: true, tesisId: true },
      })) yaz('Risk', r.id, [r.tesisId]);
    })(),
    (async () => {
      const idler = id('Bulgu');
      if (!idler.length) return;
      for (const b of await db.bulgu.findMany({
        where: { id: { in: idler } },
        select: { id: true, maddeDurumu: { select: { tesisId: true } } },
      })) yaz('Bulgu', b.id, [b.maddeDurumu.tesisId]);
    })(),
    (async () => {
      const idler = id('Aksiyon');
      if (!idler.length) return;
      for (const a of await db.aksiyon.findMany({
        where: { id: { in: idler } },
        select: { id: true, bulgu: { select: { maddeDurumu: { select: { tesisId: true } } } } },
      })) yaz('Aksiyon', a.id, [a.bulgu.maddeDurumu.tesisId]);
    })(),
    (async () => {
      const idler = id('MaddeDurumu');
      if (!idler.length) return;
      for (const m of await db.maddeDurumu.findMany({
        where: { id: { in: idler } }, select: { id: true, tesisId: true },
      })) yaz('MaddeDurumu', m.id, [m.tesisId]);
    })(),
    (async () => {
      const idler = id('Varlik');
      if (!idler.length) return;
      for (const v of await db.varlik.findMany({
        where: { id: { in: idler } }, select: { id: true, tesisId: true },
      })) yaz('Varlik', v.id, [v.tesisId]);
    })(),
    (async () => {
      const idler = id('Denetim');
      if (!idler.length) return;
      /* Denetim birden çok santrali kapsayabilir: satır, kapsamındaki
         santrallerden HERHANGİ BİRİ görünür olduğunda görünür. Kapsam
         satırı hiç olmayan denetim ise santralsizdir — /denetimler'in
         "portföy geneli" istisnası kütüğe TAŞINMAZ, çünkü orada istisnanın
         gerekçesi kaydın kaybolmaması, burada ise kütüğün kapsam
         sınırından kaçış yolu olmamasıdır. */
      for (const d of await db.denetim.findMany({
        where: { id: { in: idler } },
        select: { id: true, kapsamlar: { select: { tesisId: true } } },
      })) yaz('Denetim', d.id, d.kapsamlar.map((x) => x.tesisId));
    })(),
    (async () => {
      const idler = id('KimlikHesabi');
      if (!idler.length) return;
      for (const h of await db.kimlikHesabi.findMany({
        where: { id: { in: idler } }, select: { id: true, tesisId: true },
      })) yaz('KimlikHesabi', h.id, [h.tesisId]);
    })(),
    (async () => {
      const idler = id('Olay');
      if (!idler.length) return;
      for (const o of await db.olay.findMany({
        where: { id: { in: idler } }, select: { id: true, tesisId: true },
      })) yaz('Olay', o.id, [o.tesisId]);
    })(),
  ]);

  return sonuc;
}

/** Satır görünür mü? Türetilemeyen santral `tesisKapsamda(kapsam, null)` gibi işlenir. */
function satirGorunur(
  kapsam: TesisKapsami,
  tesisler: (string | null)[] | undefined,
): boolean {
  if (kapsam === null) return true;
  // Türetilemeyen (tanınmayan tip / silinmiş hedef) kayıt: santrali BİLİNMİYOR.
  if (!tesisler || tesisler.length === 0) return kapsamda(kapsam, null);
  return tesisler.some((t) => kapsamda(kapsam, t));
}

export async function aktiviteVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'denetim');
  // "Şimdi" istek başına bir kez okunur; metrikler ve tablo aynı anı paylaşsın.
  const simdi = new Date().getTime();
  const izinli = izinliTesisIdleri(k, 'denetim');

  const [kayitlar, tamToplam] = await Promise.all([
    db.aktiviteKaydi.findMany({
      include: { aktor: { select: { adSoyad: true } } },
      orderBy: { zaman: 'desc' },
      take: PENCERE,
    }),
    db.aktiviteKaydi.count(),
  ]);

  const tesisHaritasi = izinli === null ? null : await tesisleriCoz(kayitlar);
  const gorunur = tesisHaritasi === null
    ? kayitlar
    : kayitlar.filter((a) =>
      satirGorunur(izinli, tesisHaritasi.get(`${a.varlikTipi}:${a.varlikId}`)));

  const veri: Kayit[] = gorunur.map((a) => ({
    id: a.id,
    aktor: a.aktor?.adSoyad ?? null,
    varlikTipi: a.varlikTipi,
    varlikId: a.varlikId,
    eylem: a.eylem,
    alan: a.alan,
    once: a.oncekiDeger,
    sonra: a.yeniDeger,
    dosya: a.dosyaAdi,
    kaynak: a.kaynak,
    zaman: a.zaman.toISOString(),
  }));

  return {
    kayitlar: veri,
    simdi,
    pencere: PENCERE,
    /* Kapsamsız kullanıcı kütüğün GERÇEK büyüklüğünü görür — pencerenin
       "hepsi bu" demesini engelleyen sayı budur. Kapsamlı kullanıcı kendi
       görünür satır sayısını görür: tam sayıyı göstermek "görmediğin
       12.400 kayıt var" demek olurdu ve sayının kendisi sızıntıdır. */
    toplam: izinli === null ? tamToplam : veri.length,
    kapsamli: kapsamDaraltildi(izinli),
  };
}

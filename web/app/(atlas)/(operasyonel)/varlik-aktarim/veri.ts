import 'server-only';
import { db } from '@/lib/db';
import { izinVar, izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamda, modulKapisi } from '@/app/kapsam';
import { ONIZLEME, raporCoz, type CozulmusSatir } from '@/lib/entegrasyon/varlikAktarim';
import type { Aktarim } from './VarlikAktarimIstemci';

/* CMDB toplu aktarımı — SUNUCU VERİSİ.

   ═══ KAPSAM SIZINTISI ══════════════════════════════════════════════════
   Ekran `envanter/okuma` kapısını geçtikten sonra hiçbir SANTRAL kapsamı
   uygulamıyordu. Üç ayrı sızıntı vardı:
     1. `tanimliKodlar.tesis` BÜTÜN santral kodlarını, eşleme yardımı diye
        doğrudan istemciye gönderiyordu — hiç aktarım olmasa bile.
     2. Önizleme satırları `cozum(s.veri.tesisId)` ile kapsam dışı santral
        kodunu satır satır yazıyordu.
     3. Yinelenen listesi, dosyadaki satırın CMDB'de eşleştiği MEVCUT
        varlığın etiketini veriyordu; eşleşme adayları bilerek kapsamsız
        okunur (`mevcutVarliklariYukle` — benzersizlik ihlali olmasın diye),
        yani kapsam dışı bir varlığın etiketi buradan sızıyordu.

   MODÜL: `envanter`. Aktarımın konusu VARLIKTIR; `lib/eylemler2/varlikAktarim.ts`
   içindeki dört eylem de `yetkiZorunlu('envanter', …)` çağırır ve
   `lib/entegrasyon/varlikAktarim.ts → kapsamKur` yazma kapsamını yine
   `izinliTesisIdleri(k, 'envanter')`den alır. Okuma ile yazma aynı modülden
   gelmezse, yazamayacağın satırı önizleyebilir olurdun.

   ── AKTARIM KAYDININ KENDİSİ ───────────────────────────────────────────
   `VarlikAktarimi` şemada santrale bağlı DEĞİLDİR: bir YÜKLEME kütüğü
   satırıdır (dosya adı, yükleyen, sayaçlar, onay). Gerekçe tedarikçi
   siciliyle aynıdır — kayıt gizlenmez, santrale bağlı olan HER ŞEY
   daraltılır. Kaydı gizlemek ayrıca çalışan bir akışı kırardı: `eslesme`
   aşamasındaki yeni yüklemenin henüz çözülmüş satırı (dolayısıyla santrali)
   yoktur; santral türetilemediği için gizlenseydi, kullanıcı kendi az önce
   yüklediği dosyayı bulamazdı.

   ── SANTRALİ BİLİNMEYEN SATIR ──────────────────────────────────────────
   `app/kapsam.ts → kapsamda` (= `lib/api/yetki.ts → tesisKapsamda`):
   `tesisId` çözülememiş önizleme satırı YALNIZ kapsamsız kullanıcıya
   görünür. Bu, eylem katmanıyla da tutarlıdır: `kapsamKur().yazabilir(null)`
   tesise kısıtlı role zaten `false` döner — göremediğin satırı yazamazsın,
   yazamayacağın satırı da görmezsin. */

/** Hata/yinelenen listelerinin ekrana taşınan üst sınırı; kalanı sayıyla anılır. */
const LISTE_TAVANI = 60;

/** Kütükten çekilen en fazla aktarım kaydı. */
const KAYIT_TAVANI = 25;

export type EkranVerisi = {
  aktarimlar: Aktarim[];
  yukleyebilir: boolean;
  onizlemeButcesi: number;
  tanimliKodlar: { tur: string[]; tesis: string[]; sistem: string[]; bolge: string[] };
  /** true = önizleme/yinelenen listeleri santral kapsamıyla daraltıldı */
  kapsamli: boolean;
};

export async function varlikAktarimVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  modulKapisi(k, 'envanter');
  const izinli = izinliTesisIdleri(k, 'envanter');

  const [kayitlar, turler, tesisler, sistemler, bolgeler] = await Promise.all([
    db.varlikAktarimi.findMany({
      orderBy: { olusturuldu: 'desc' }, take: KAYIT_TAVANI,
      include: {
        yukleyen: { select: { adSoyad: true } },
        onaylayan: { select: { adSoyad: true } },
      },
    }),
    db.varlikTuru.findMany({ select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' } }),
    // Santral sözlüğü de daraltılır: kapsam dışı bir kod eşleme yardımında
    // bile anılmaz — "hangi kodlar var" sorusunun yanıtı bir portföy listesidir.
    db.tesis.findMany({
      where: izinli === null ? {} : { id: { in: izinli } },
      select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' },
    }),
    db.sistemServis.findMany({ select: { id: true, kod: true }, orderBy: { kod: 'asc' } }),
    db.agBolgesi.findMany({ select: { id: true, kod: true }, orderBy: { kod: 'asc' } }),
  ]);

  const adi = new Map<string, string>([
    ...turler.map((t) => [t.id, t.kod] as const),
    ...tesisler.map((t) => [t.id, t.kod] as const),
    ...sistemler.map((s) => [s.id, s.kod] as const),
    ...bolgeler.map((b) => [b.id, b.kod] as const),
  ]);
  const cozum = (id: string | null | undefined) => (id ? adi.get(id) ?? id : null);

  const raporlar = kayitlar.map((a) => (a.raporJson ? guvenliRapor(a.raporJson) : {}));

  /* Yinelenen listesindeki HEDEF varlıkların santrali tek sorguda okunur:
     eşleşme adayları kapsamsız yüklendiği için hedefin kapsam içinde olup
     olmadığı ayrıca sorulmak zorundadır. */
  const hedefIdleri = [...new Set(
    raporlar.flatMap((r) => (r.yinelenenler ?? []).map((y) => y.hedefId)),
  )];
  const hedefTesisi = new Map<string, string | null>(
    hedefIdleri.length === 0 ? [] : (await db.varlik.findMany({
      where: { id: { in: hedefIdleri } }, select: { id: true, tesisId: true },
    })).map((v) => [v.id, v.tesisId] as const),
  );

  const aktarimlar: Aktarim[] = kayitlar.map((a, i) => {
    const rapor = raporlar[i];
    const satirlar = rapor.satirlar ?? [];
    const hatalar = rapor.hatalar ?? [];
    const yinelenenler = rapor.yinelenenler ?? [];

    /* Önizleme kapsamla daraltılır ve DARALTILMIŞ küme üzerinden kırpılır —
       önce kırpıp sonra süzmek, kapsam dışı satırların bütçeyi yemesi
       demek olurdu (ekran boş görünür, sebebi görünmez). */
    const gorunurSatirlar = satirlar.filter(
      (s: CozulmusSatir) => kapsamda(izinli, s.veri.tesisId ?? null),
    );
    const gorunurYinelenenler = yinelenenler.filter(
      (y) => kapsamda(izinli, hedefTesisi.get(y.hedefId) ?? null),
    );

    return {
      id: a.id,
      dosyaAdi: a.dosyaAdi,
      kaynakTipi: a.kaynakTipi,
      durum: a.durum,
      yukleyen: a.yukleyen?.adSoyad ?? null,
      onaylayan: a.onaylayan?.adSoyad ?? null,
      zaman: a.olusturuldu.toISOString(),
      onayZamani: a.onayZamani?.toISOString() ?? null,
      okunan: a.okunan, gecerli: a.gecerli, hatali: a.hatali,
      /* Yinelenen SAYACI da daraltılmış listeden gelir: satırı gizleyip
         sayacı bırakmak, "görmediğin bir santralde şu kadar eşleşme var"
         demek olurdu. `okunan/gecerli/hatali` dosyanın kendi sayaçlarıdır
         ve santral taşımazlar — onlar olduğu gibi kalır. */
      yinelenen: izinli === null ? a.yinelenen : gorunurYinelenenler.length,
      eklenen: a.eklenen, guncellenen: a.guncellenen,
      basliklar: a.basliklarJson ? (JSON.parse(a.basliklarJson) as string[]) : [],
      esleme: a.eslemeJson ? (JSON.parse(a.eslemeJson) as Record<string, string>) : {},
      hataMesaji: rapor.hataMesaji ?? null,
      onizleme: gorunurSatirlar.slice(0, ONIZLEME).map((s: CozulmusSatir) => ({
        satirNo: s.satirNo,
        etiket: s.etiket,
        islem: s.islem,
        ad: s.veri.ad ?? null,
        tur: cozum(s.veri.turId),
        tesis: cozum(s.veri.tesisId),
        kritiklik: s.veri.kritiklik ?? null,
        eslesmeAlani: s.eslesmeAlani,
        bosAlanlar: s.bosAlanlar,
      })),
      /* Hata listesi santral taşımaz: satır numarası, DOSYADAKİ etiket ve
         sebep metninden ibarettir — dolayısıyla daraltılmaz. */
      hatalar: hatalar.slice(0, LISTE_TAVANI),
      hataKalan: Math.max(0, hatalar.length - LISTE_TAVANI),
      yinelenenler: gorunurYinelenenler.slice(0, LISTE_TAVANI),
      yinelenenKalan: Math.max(0, gorunurYinelenenler.length - LISTE_TAVANI),
      // Yetki satır bazında değil ekran bazında: kapsam denetimi doğrulamada
      // satır satır uygulanır (lib/entegrasyon/varlikAktarim → kapsamKur).
      duzenlenebilir: izinVar(k, 'envanter', 'yazma'),
      onaylanabilir: izinVar(k, 'envanter', 'onay'),
    };
  });

  return {
    aktarimlar,
    yukleyebilir: izinVar(k, 'envanter', 'yazma'),
    onizlemeButcesi: ONIZLEME,
    tanimliKodlar: {
      tur: turler.map((t) => t.kod),
      tesis: tesisler.map((t) => t.kod),
      sistem: sistemler.map((s) => s.kod),
      bolge: bolgeler.map((b) => b.kod),
    },
    kapsamli: kapsamDaraltildi(izinli),
  };
}

/** Bozuk rapor ekranı düşürmez ama SESSİZCE de geçilmez: hata mesajı taşınır. */
function guvenliRapor(json: string) {
  try {
    return raporCoz(json);
  } catch (e) {
    return { hataMesaji: e instanceof Error ? e.message : 'Rapor okunamadı' };
  }
}

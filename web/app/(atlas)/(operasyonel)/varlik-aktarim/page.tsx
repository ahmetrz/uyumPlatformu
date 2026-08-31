import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { db } from '@/lib/db';
import { Yetkisiz } from '@/components/atlas/temel';
import {
  HEDEF_ALANLAR, ONIZLEME, raporCoz,
  type Esleme, type CozulmusSatir,
} from '@/lib/entegrasyon/varlikAktarim';
import VarlikAktarimIstemci from './VarlikAktarimIstemci';
import type { Aktarim, AlanSecenegi } from './VarlikAktarimIstemci';

export const metadata: Metadata = { title: 'Varlık aktarımı — Atlas' };

/* CMDB toplu aktarımı (P1-2) — "bu dosyayı envantere almak güvenli mi?"
   Yerleşim kabuğu (operasyonel)/layout.tsx'ten gelir; bu sayfa yalnız
   <main> ve seçim varsa <aside class="cekmece"> render eder.

   Sunucu tarafında ham satırlar İSTEMCİYE GÖNDERİLMEZ: dosya binlerce satır
   olabilir ve içeriği ekranda yaşamaz. Yalnız önizleme (ilk 20), hata listesi
   ve yinelenen listesi taşınır — kalanı raporda durur. */

/** Hata/yinelenen listelerinin ekrana taşınan üst sınırı; kalanı sayıyla anılır. */
const LISTE_TAVANI = 60;

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'envanter', 'okuma')) return <Yetkisiz rol="envanter okuma" />;

  const [kayitlar, turler, tesisler, sistemler, bolgeler] = await Promise.all([
    db.varlikAktarimi.findMany({
      orderBy: { olusturuldu: 'desc' }, take: 25,
      include: {
        yukleyen: { select: { adSoyad: true } },
        onaylayan: { select: { adSoyad: true } },
      },
    }),
    db.varlikTuru.findMany({ select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' } }),
    db.tesis.findMany({ select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' } }),
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

  const aktarimlar: Aktarim[] = kayitlar.map((a) => {
    const rapor = a.raporJson ? guvenliRapor(a.raporJson) : {};
    const satirlar = rapor.satirlar ?? [];
    const hatalar = rapor.hatalar ?? [];
    const yinelenenler = rapor.yinelenenler ?? [];
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
      yinelenen: a.yinelenen, eklenen: a.eklenen, guncellenen: a.guncellenen,
      basliklar: a.basliklarJson ? (JSON.parse(a.basliklarJson) as string[]) : [],
      esleme: a.eslemeJson ? (JSON.parse(a.eslemeJson) as Esleme) : {},
      hataMesaji: rapor.hataMesaji ?? null,
      onizleme: satirlar.slice(0, ONIZLEME).map((s: CozulmusSatir) => ({
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
      hatalar: hatalar.slice(0, LISTE_TAVANI),
      hataKalan: Math.max(0, hatalar.length - LISTE_TAVANI),
      yinelenenler: yinelenenler.slice(0, LISTE_TAVANI),
      yinelenenKalan: Math.max(0, yinelenenler.length - LISTE_TAVANI),
      // Yetki satır bazında değil ekran bazında: kapsam denetimi doğrulamada
      // satır satır uygulanır (lib/entegrasyon/varlikAktarim → kapsamKur).
      duzenlenebilir: izinVar(k, 'envanter', 'yazma'),
      onaylanabilir: izinVar(k, 'envanter', 'onay'),
    };
  });

  const alanlar: AlanSecenegi[] = HEDEF_ALANLAR.map((a) => ({
    anahtar: a.anahtar, etiket: a.etiket, tip: a.tip,
    zorunlu: a.zorunlu ?? false,
    sozluk: a.sozluk ? [...a.sozluk] : null,
  }));

  return (
    <VarlikAktarimIstemci
      aktarimlar={aktarimlar}
      alanlar={alanlar}
      yukleyebilir={izinVar(k, 'envanter', 'yazma')}
      onizlemeButcesi={ONIZLEME}
      tanimliKodlar={{
        tur: turler.map((t) => t.kod),
        tesis: tesisler.map((t) => t.kod),
        sistem: sistemler.map((s) => s.kod),
        bolge: bolgeler.map((b) => b.kod),
      }}
    />
  );
}

/** Bozuk rapor ekranı düşürmez ama SESSİZCE de geçilmez: hata mesajı taşınır. */
function guvenliRapor(json: string) {
  try {
    return raporCoz(json);
  } catch (e) {
    return { hataMesaji: e instanceof Error ? e.message : 'Rapor okunamadı' };
  }
}

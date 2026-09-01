import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { db } from '@/lib/db';
import { Yetkisiz } from '@/components/abacus/temel';
import IceAktarimIstemci from './IceAktarimIstemci';
import type { Aktarim, ElenenSatir, OnizlemeSatiri } from './mantik';

export const metadata: Metadata = { title: 'Madde içe aktarımı — Abacus' };

/* Regülasyon MADDE aktarımı — "bu dosyayı kütüğe almak güvenli mi?"
   Kabuk (ray + çekmece kolonu) (operasyonel)/layout.tsx'ten gelir; burada
   UstCubuk ya da .icerik sarmalayıcısı YOK.

   Ekran `tanimlar` modülüne tabidir: okuma olmadan açılmaz, yazma olmadan
   dosya yüklenmez, onay olmadan hiçbir madde yayına girmez (lib/eylemler.ts
   aynı kapıları sunucu tarafında da uygular).

   Ham satırlar İSTEMCİYE GÖNDERİLMEZ: dosya binlerce satır olabilir ve
   metni ekranda yaşamaz. Yalnız önizleme (ilk 20), elenen listesi ve
   sayılar taşınır — kalanı raporda durur.

   SANTRAL KAPSAMI: bu ekran BİLEREK kapsamsızdır, çünkü aktarılan şey
   REGÜLASYON MADDESİDİR, santral verisi değil — `IceAktarim` ve hedefi olan
   `Madde` şemada `tesisId` taşımaz, dosya bir çerçevenin katalogunu kütüğe
   alır ve o katalog bütün santraller için ortaktır. (Santral verisi taşıyan
   kardeşi /varlik-aktarim'dır ve O kapsamla daraltılır.) */

/** Önizlemenin ekrana taşınan satır sayısı; kalanı sayıyla anılır. */
const ONIZLEME = 20;
/** Elenen listesinin üst sınırı; kalanı sayıyla anılır. */
const LISTE_TAVANI = 60;

type HamRapor = {
  satirlar?: { kod: string; baslik: string; alanlar?: string[]; islem?: string }[];
  elenenler?: ElenenSatir[];
};

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'tanimlar', 'okuma')) return <Yetkisiz rol="tanımlar okuma" />;

  const [kayitlar, regulasyonlar, alanlar] = await Promise.all([
    db.iceAktarim.findMany({
      include: { regulasyon: true, yukleyen: { select: { adSoyad: true } } },
      orderBy: { olusturuldu: 'desc' },
      take: 25,
    }),
    db.regulasyon.findMany({ where: { aktif: true }, orderBy: { kod: 'asc' } }),
    db.kapsamAlani.findMany({ where: { aktif: true }, orderBy: { kod: 'asc' } }),
  ]);

  const aktarimlar: Aktarim[] = kayitlar.map((a) => {
    const { rapor, hata } = guvenliRapor(a.raporJson);
    const satirlar = rapor.satirlar ?? [];
    const elenenler = rapor.elenenler ?? [];
    const onizleme: OnizlemeSatiri[] = satirlar.slice(0, ONIZLEME).map((s) => ({
      kod: s.kod,
      baslik: s.baslik,
      islem: s.islem === 'guncelleme' ? 'guncelleme' : 'yeni',
      alanlar: s.alanlar ?? [],
    }));
    return {
      id: a.id,
      kaynakAdi: a.kaynakAdi,
      kaynakTipi: a.kaynakTipi,
      durum: a.durum,
      regKod: a.regulasyon.kod,
      regAd: a.regulasyon.ad,
      yukleyen: a.yukleyen?.adSoyad ?? null,
      zaman: a.olusturuldu.toISOString(),
      okunan: a.okunan,
      eklenen: a.eklenen,
      guncellenen: a.guncellenen,
      elenen: a.elenen,
      islenecek: satirlar.length,
      yeni: satirlar.filter((s) => s.islem !== 'guncelleme').length,
      guncelleme: satirlar.filter((s) => s.islem === 'guncelleme').length,
      onizleme,
      elenenler: elenenler.slice(0, LISTE_TAVANI),
      elenenKalan: Math.max(0, elenenler.length - LISTE_TAVANI),
      raporHatasi: hata,
    };
  });

  return (
    <IceAktarimIstemci
      aktarimlar={aktarimlar}
      regulasyonlar={regulasyonlar.map((r) => ({ id: r.id, kod: r.kod, ad: r.ad }))}
      alanKodlari={alanlar.map((x) => x.kod)}
      onizlemeButcesi={ONIZLEME}
      yukleyebilir={izinVar(k, 'tanimlar', 'yazma')}
      onaylayabilir={izinVar(k, 'tanimlar', 'onay')}
    />
  );
}

/** Bozuk rapor ekranı düşürmez ama SESSİZCE de geçilmez: sebep taşınır. */
function guvenliRapor(json: string | null): { rapor: HamRapor; hata: string | null } {
  if (!json) return { rapor: {}, hata: null };
  try {
    return { rapor: JSON.parse(json) as HamRapor, hata: null };
  } catch (e) {
    return { rapor: {}, hata: e instanceof Error ? e.message : 'Rapor okunamadı' };
  }
}

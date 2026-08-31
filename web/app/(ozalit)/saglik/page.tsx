import { girisZorunlu, izinVar } from '@/lib/erisim';
import { db } from '@/lib/db';
import { entegrasyonSagligiOzeti } from '@/lib/entegrasyon/saglikOzeti';
import UstCubuk from '@/components/UstCubuk';
import SaglikIstemci from './SaglikIstemci';

/* Platform sağlığı (§68): otomasyon motorlarının koşu durumu, veri kalitesi
   bulguları ve koşu geçmişi tek ekranda — sessiz hata yok, her koşu görünür.

   Entegrasyon bölümü aynı sözü dış sistemler için verir: her connector'ın
   son koşusu, kabul/ret/yinelenen sayaçları ve veri tazeliği görünür.
   Bu bölüm `yonetim/okuma` ister — yetkisiz kullanıcıya connector'ın maskeli
   sır referansı bile gitmez (özet katmanı boş döner). Sır DEĞERİ hiçbir
   koşulda bu sayfadan geçmez; yalnız `sirMaskesi()` çıktısı taşınır. */

const IS_TANIMLARI = [
  { ad: 'kanit_tazelik', etiket: 'Kanıt tazeliği',
    aciklama: 'Geçerliliği biten kanıtları bayatlar, yenileme görevi üretir' },
  { ad: 'deadline_motoru', etiket: 'Son tarih motoru',
    aciklama: 'Yaklaşan/geçen tarihler için görev ve bildirim üretir' },
  { ad: 'gap_to_action', etiket: 'Gap → Aksiyon',
    aciklama: 'Uyum açıklarından onay bekleyen proje önerisi üretir' },
  { ad: 'veri_kalitesi', etiket: 'Veri kalitesi',
    aciklama: 'Governance verisindeki boşlukları tarar ve raporlar' },
] as const;

type KosuKaydi = {
  id: string; isAdi: string; durum: string; baslangic: Date; bitis: Date | null;
  sureMs: number | null; islenen: number; uretilen: number; hata: string | null;
};

function serile(ko: KosuKaydi) {
  return {
    id: ko.id, isAdi: ko.isAdi, durum: ko.durum,
    baslangic: ko.baslangic.toISOString(), bitis: ko.bitis?.toISOString() ?? null,
    sureMs: ko.sureMs, islenen: ko.islenen, uretilen: ko.uretilen, hata: ko.hata,
  };
}

export default async function Saglik() {
  const k = await girisZorunlu();
  const yazabilir = izinVar(k, 'yonetim', 'yazma');

  const [sonKosular, gecmis, kaliteBulgulari, entegrasyon] = await Promise.all([
    Promise.all(IS_TANIMLARI.map((t) =>
      db.isKosusu.findFirst({ where: { isAdi: t.ad }, orderBy: { baslangic: 'desc' } }))),
    db.isKosusu.findMany({ orderBy: { baslangic: 'desc' }, take: 20 }),
    db.veriKalitesiBulgusu.findMany({
      where: { durum: 'acik' },
      orderBy: [{ kural: 'asc' }, { olusturuldu: 'desc' }] }),
    entegrasyonSagligiOzeti(k),
  ]);

  // Veri kalitesi bulgularının işaret ettiği kayıtları etiketle/linkle.
  const idler = (tip: string) =>
    [...new Set(kaliteBulgulari.filter((b) => b.kaynakTipi === tip).map((b) => b.kaynakId))];
  const [varliklar, tesisler, kanitlar] = await Promise.all([
    db.varlik.findMany({ where: { id: { in: idler('Varlik') } },
      select: { id: true, etiket: true } }),
    db.tesis.findMany({ where: { id: { in: idler('Tesis') } },
      select: { id: true, kod: true } }),
    db.kanit.findMany({ where: { id: { in: idler('Kanit') } },
      select: { id: true, ad: true } }),
  ]);
  const kayitBilgisi = new Map<string, { etiket: string; href: string | null }>();
  for (const v of varliklar) kayitBilgisi.set(`Varlik|${v.id}`, { etiket: v.etiket, href: '/envanter' });
  for (const t of tesisler) kayitBilgisi.set(`Tesis|${t.id}`, { etiket: t.kod, href: `/tesisler/${t.id}` });
  for (const kn of kanitlar) kayitBilgisi.set(`Kanit|${kn.id}`, { etiket: kn.ad, href: null });

  const isler = IS_TANIMLARI.map((t, i) => ({
    ...t, son: sonKosular[i] ? serile(sonKosular[i]) : null,
  }));
  const kalite = kaliteBulgulari.map((b) => {
    const bilgi = kayitBilgisi.get(`${b.kaynakTipi}|${b.kaynakId}`);
    return {
      id: b.id, kural: b.kural, aciklama: b.aciklama,
      kaynakTipi: b.kaynakTipi, olusturuldu: b.olusturuldu.toISOString(),
      kayitEtiket: bilgi?.etiket ?? null, href: bilgi?.href ?? null,
    };
  });

  return (
    <>
      <UstCubuk baslik="Platform sağlığı" />
      <main className="icerik">
        <SaglikIstemci isler={isler} gecmis={gecmis.map(serile)}
          kalite={kalite} yazabilir={yazabilir} entegrasyon={entegrasyon} />
      </main>
    </>
  );
}

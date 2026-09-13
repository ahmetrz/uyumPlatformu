import type { Metadata } from 'next';
import { girisZorunlu, izinVar } from '@/lib/erisim';
import { db } from '@/lib/db';
import { Yetkisiz } from '@/components/kabuk/temel';
import { kuraliCoz } from '@/lib/uyum/veriKorumaKosumu';
import VeriKorumaIstemci from './VeriKorumaIstemci';
import {
  aktarimSatirlari, basvuruSatirlari,
  type AktarimKaydi, type BasvuruKaydi, type FaaliyetKaydi,
} from './mantik';

export const metadata: Metadata = { title: 'Kişisel veri koruma' };

/* KİŞİSEL VERİ KORUMA (R15).

   BİRİNCİL İŞ: "süresi dolmak üzere olan veri sahibi başvurusunu bul ve
   yanıtla". İKİNCİ İŞ, aynı ağırlıkta: "hangi sayaç ÇALIŞMIYOR". İkincisi
   gizlenirse ekran "yanıt bekleyen başvuru yok" derken aslında hiçbir
   sayaç işlemiyor olabilir.

   ── KAPSAM: KURUMSAL, KAPSAMSIZ SORULUR ───────────────────────────────
   Bir veri sahibi başvurusu tek bir tesisin değil KURUMUN meselesidir;
   kapı `izinVar(k, 'uyum', 'okuma')` ile KAPSAMSIZ sorulur ve
   `kapsamUyar` gereği tesise kısıtlı rol geçmez. Eylem katmanı aynı
   kuralı taşır (`lib/eylemler2/veriKoruma.ts`): ekranda gösterip
   sunucuda reddetmek ya da tersi, #48'in dışa aktarım bulgusunun bu
   yüzeydeki hâli olurdu.

   ── ROTA MEVZUAT ADI TAŞIMAZ ──────────────────────────────────────────
   `/kisisel-veri` — `/kvkk` DEĞİL. Çekirdeğe mevzuat adı girmez; KVKK
   terimleri (VERBİS, 72 saat, 30 gün) paketten gelir. */

export default async function Sayfa() {
  const k = await girisZorunlu();
  if (!izinVar(k, 'uyum', 'okuma')) return <Yetkisiz rol="uyum okuma (kurum geneli)" />;

  const [
    basvuruKayitlari, faaliyetKayitlari, aktarimKayitlari, sicilKaydi,
    yanitKurali, aktarimKurali,
  ] = await Promise.all([
    db.veriSahibiBasvurusu.findMany({
      select: {
        id: true, kod: true, alinma: true, konu: true, kanal: true, ozet: true,
        durum: true, sonTarih: true, yanitMetni: true, redGerekcesi: true,
      },
      orderBy: [{ alinma: 'desc' }], take: 200,
    }),
    db.veriIslemeFaaliyeti.findMany({
      where: { aktif: true },
      select: {
        id: true, kod: true, ad: true, amac: true, hukukiSebep: true,
        ozelNitelikli: true, veriKategorileriJson: true,
        ilgiliKisiGruplariJson: true, aliciGruplariJson: true,
        isSureci: { select: { kod: true, ad: true } },
        saklamaPolitikasi: { select: { varlikTipi: true } },
        madde: { select: { kod: true } },
        _count: { select: { aktarimlar: true } },
      },
      orderBy: { kod: 'asc' }, take: 200,
    }),
    db.yurtDisiAktarim.findMany({
      where: { aktif: true },
      select: {
        id: true, aliciUlke: true, aliciAd: true, dayanak: true,
        bildirimTarihi: true, faaliyet: { select: { kod: true } },
      },
      orderBy: [{ olusturuldu: 'desc' }], take: 200,
    }),
    db.sicilKaydi.findFirst({
      where: { aktif: true },
      select: {
        id: true, sicilAd: true, sicilNo: true, kayitTarihi: true,
        sonGuncelleme: true, yukumluMu: true, muafiyetGerekcesi: true, dayanak: true,
      },
    }),
    db.veriKorumaSuresi.findUnique({
      where: { konu: 'basvuru_yanit' },
      select: {
        konu: true, gun: true, isGunu: true, haftaSonuJson: true,
        dayanak: true, aktif: true,
      },
    }),
    db.veriKorumaSuresi.findUnique({
      where: { konu: 'aktarim_bildirim_standart_sozlesme' },
      select: {
        konu: true, gun: true, isGunu: true, haftaSonuJson: true,
        dayanak: true, aktif: true,
      },
    }),
  ]);

  /* LİSTE ALANLARI JSON'DAN ÇÖZÜLÜR. Bozuk JSON boş listeye düşer ve
     ekran "girilmedi" der: sessizce bir dizi uydurmak, olmayan bir veri
     kategorisi göstermek olurdu. */
  const dizi = (s: string): string[] => {
    try {
      const c = JSON.parse(s) as unknown;
      return Array.isArray(c) ? c.filter((x): x is string => typeof x === 'string') : [];
    } catch { return []; }
  };

  const faaliyetler: FaaliyetKaydi[] = faaliyetKayitlari.map((f) => ({
    id: f.id, kod: f.kod, ad: f.ad, amac: f.amac, hukukiSebep: f.hukukiSebep,
    surecKod: f.isSureci.kod, surecAd: f.isSureci.ad,
    ozelNitelikli: f.ozelNitelikli,
    veriKategorileri: dizi(f.veriKategorileriJson),
    ilgiliKisiGruplari: dizi(f.ilgiliKisiGruplariJson),
    aliciGruplari: dizi(f.aliciGruplariJson),
    saklamaAdi: f.saklamaPolitikasi?.varlikTipi ?? null,
    maddeKodu: f.madde?.kod ?? null,
    aktarimSayisi: f._count.aktarimlar,
  }));

  const basvuruListesi: BasvuruKaydi[] = basvuruKayitlari;
  const aktarimListesi: AktarimKaydi[] = aktarimKayitlari.map((a) => ({
    id: a.id, faaliyetKod: a.faaliyet.kod, aliciUlke: a.aliciUlke,
    aliciAd: a.aliciAd, dayanak: a.dayanak, bildirimTarihi: a.bildirimTarihi,
  }));

  /* ŞİMDİ BİR KEZ OKUNUR: her satırda ayrı okumak, uzun bir listede
     satırların birbirinden milisaniyelerce farklı "şimdi"lerle
     hesaplanmasına yol açardı (`/raporlar/takvim` ile aynı kalıp). */
  const simdiMs = new Date().getTime();
  const yanit = kuraliCoz(yanitKurali);
  const aktarim = kuraliCoz(aktarimKurali);

  return (
    <VeriKorumaIstemci
      basvurular={basvuruSatirlari(basvuruListesi, yanit, simdiMs)}
      faaliyetler={faaliyetler}
      aktarimlar={aktarimSatirlari(aktarimListesi, aktarim, simdiMs)}
      sicil={sicilKaydi}
      karar={izinVar(k, 'uyum', 'onay')}
      sureDayanagi={yanit?.dayanak ?? null}
    />
  );
}

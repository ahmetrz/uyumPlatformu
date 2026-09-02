'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Im, Metrikler, Bar, Segment, Kesir, TikSeridi, Ipucu, Dugme, Alan,
  Iskelet, BosIlk, BosFiltre, Hata, Yetkisiz, Olculmedi, BaglantiYok, KismiVeri, DURUM_SOZU, type Durum,
} from '@/components/kabuk/temel';
import { Tablo, Matris, GenisleyenSatir } from '@/components/kabuk/tablo';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import {
  EkranBasligi, Filtreler, KipDegistir, Asamalar, OdakKarti,
} from '@/components/kabuk/ekran';
import { ZamanCizelgesi, OmurUfku } from '@/components/kabuk/zaman';
import { Tuval } from '@/components/kabuk/grafik';
import { KokenRozeti, KokenSatiri, type KokenGorunumu } from '@/components/kabuk/Koken';
import BaglamCubugu from '@/components/kabuk/BaglamCubugu';
import { IKINCIL } from '@/components/kabuk/yonler';

/* Paylaşılan primitif galerisi: her bileşen her durumda, gerçek işaretlemeyle.
   Anti-regresyon listesi burada denenir — durum sözcüğü işaretçinin yanında
   tekrar edilmez, bilinmeyen sıfır sayılmaz, kritik bilgi ipucunda yaşamaz.
   Tasarım sözleşmesi: web/DESIGN.md. */

const DURUMLAR: Durum[] = ['ok', 'md', 'bd', 'pl', 'unk', 'tamam'];

/* Galerinin gösterdiği primitifler — başlıktaki sayı bu listeden türer,
   elle yazılmaz. Yeni primitif eklenince buraya da eklenir. */
const PRIMITIFLER = [
  'Im', 'Metrikler', 'Bar', 'Segment', 'Kesir', 'TikSeridi', 'Ipucu', 'Dugme', 'Alan',
  'Filtreler', 'KipDegistir', 'Asamalar', 'Tablo', 'Matris', 'GenisleyenSatir',
  'OdakKarti', 'ZamanCizelgesi', 'OmurUfku', 'Tuval', 'Iskelet', 'BosIlk', 'BosFiltre',
  'Hata', 'Yetkisiz', 'Olculmedi', 'BaglantiYok', 'KismiVeri', 'Cekmece', 'KokenRozeti', 'KokenSatiri', 'BaglamCubugu', 'IkincilSira',
] as const;

/* Köken örnekleri — dört görünümün dördü de gerçek `KokenGorunumu` şekliyle
   kurulur ki galeri bileşenin gerçekten kabul ettiği veriyi göstersin. */
const KOKENLER: { ad: string; koken: KokenGorunumu | null }[] = [
  { ad: 'Elle girildi', koken: null },
  { ad: 'Otomatik · doğrulanmadı', koken: {
    kokenTipi: 'otomatik', kaynakSistem: 'CMDB aktarımı', guven: null,
    dogrulamaDurumu: 'dogrulanmadi', toplanma: null,
  } },
  { ad: 'Doğrulanmış', koken: {
    kokenTipi: 'dogrulanmis', kaynakSistem: 'Varlık keşfi', guven: 0.92,
    dogrulamaDurumu: 'dogrulandi', toplanma: '2026-08-30T09:12:00Z',
    dogrulayan: 'M. Kaya', dogrulamaZamani: '2026-08-31T14:05:00Z',
  } },
  { ad: 'Reddedildi', koken: {
    kokenTipi: 'otomatik', kaynakSistem: 'Zafiyet tarayıcı', guven: 0.4,
    dogrulamaDurumu: 'reddedildi', toplanma: '2026-08-28T22:40:00Z',
    dogrulayan: 'B. Şahin', dogrulamaZamani: '2026-08-29T08:00:00Z',
  } },
];

function B({ no, ad, not, children }: {
  no: string; ad: string; not?: string; children: React.ReactNode;
}) {
  return (
    <section style={{ padding: '0 var(--gutter-op) var(--sec-pad-bot)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s12)',
        padding: 'var(--sec-pad-top) 0 var(--s18)' }}>
        <span className="etiket num">{no}</span>
        <h2 className="ab-bolum-basligi" style={{ margin: 0 }}>{ad}</h2>
        <span style={{ flex: 1, height: 1, background: 'var(--hr)' }} />
      </div>
      {not && <p style={{ margin: '0 0 var(--s18)', fontSize: 'var(--t-cell)',
        color: 'var(--i2)', maxWidth: 720 }}>{not}</p>}
      {children}
    </section>
  );
}

export default function Galeri() {
  const [secili, setSecili] = useState<string | null>('R-2');
  const [filtre, setFiltre] = useState('epdk');
  const [kip, setKip] = useState('iliski');
  const [odak, setOdak] = useState<string | null>(null);

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow="Paylaşılan primitif galerisi"
          vurgu={`${PRIMITIFLER.length} primitif`}
          baslik="her durumda"
          metrikler={[
            { deger: PRIMITIFLER.length, yazi: 'Bileşen' },
            { deger: DURUMLAR.length, yazi: 'Durum' },
            { deger: 0, yazi: 'Yarıçap' },
            { deger: 0, yazi: 'Canvasta durum sözü', durum: 'ok' },
          ]}
        />

        <B no="01" ad="Durum işaretçisi"
          not="Boyut şiddeti, şekil bilinmeyeni kodlar. Bilinmeyen içi boş / noktalı glif — asla dolu nokta. Yanında durum kelimesi bulunmaz; her birinin erişilebilir adı vardır.">
          {/* Efsane: bir bileşen kataloğu gösterdiği şeyi adlandırmak zorundadır.
              Ürün ekranlarında işaretçinin yanına durum sözcüğü YAZILAMAZ (durum
              sözleşmesi); denetim aracı bu bloğu data-efsane ile muaf sayar,
              kuralı gevşetmez. */}
          <div data-efsane="statusmarker"
            style={{ display: 'flex', gap: 'var(--s34)', alignItems: 'center' }}>
            {DURUMLAR.map((d) => (
              <span key={d} style={{ display: 'grid', justifyItems: 'center', gap: 'var(--s10)' }}>
                <Im durum={d} />
                <span className="etiket">{DURUM_SOZU[d]}</span>
              </span>
            ))}
            <span style={{ display: 'grid', justifyItems: 'center', gap: 'var(--s10)' }}>
              <Im durum="bd" enKotu />
              <span className="etiket">Satırın en kötüsü</span>
            </span>
          </div>
        </B>

        <B no="02" ad="Ölçüt satırı" not="Üründeki tek KPI muamelesi. Kart, kenarlık, ikon, sparkline yok. Renk yalnız sayının kendisi alarm olduğunda.">
          <Metrikler metrikler={[
            { deger: '%78', yazi: 'Uyum' },
            { deger: '%14', yazi: 'Bilinmeyen' },
            { deger: 3, yazi: 'Kritik risk', durum: 'bd' },
            { deger: '19g', yazi: 'EPDK bildirimi', durum: 'md' },
          ]} />
        </B>

        <B no="03" ad="İlerleme · kesir · tik şeridi" not="Bar · segment · kesir · tik. Donut, radyal gauge, yüzde halkası yok. Bilinmeyen segmenti daima sonda ve kendi gri tonunda. Tik şeridi bir ORANI değil, bir dizi ölçümü ya da eşik üzerindeki ağırlığı anlatır; boş tik kayıt yokluğudur, sıfır değil.">
          <div style={{ display: 'grid', gap: 'var(--s22)', maxWidth: 420 }}>
            <Bar oran={64} deger="%64" />
            <Bar oran={31} durum="bd" deger="%31" />
            <Segment ok={58} md={14} bd={11} unk={17} />
            <div><Kesir pay={11} payda={15} /></div>
            <div style={{ display: 'flex', gap: 'var(--s24)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', gap: 'var(--s8)', alignItems: 'center' }}>
                <TikSeridi dolu={4} toplam={5} durum="bd" etiket="Risk skoru 16/25 · 5 tikten 4'ü dolu" />
                <span className="etiket">16/25</span>
              </span>
              <span style={{ display: 'inline-flex', gap: 'var(--s8)', alignItems: 'center' }}>
                <TikSeridi dolu={2} toplam={5} durum="md" etiket="Risk skoru 8/25 · 5 tikten 2'si dolu" />
                <span className="etiket">8/25</span>
              </span>
              <span style={{ display: 'inline-flex', gap: 'var(--s8)', alignItems: 'center' }}>
                <TikSeridi olculmedi etiket="Skor ölçülmedi" />
                <span className="etiket">ölçülmedi</span>
              </span>
              <span style={{ display: 'inline-flex', gap: 'var(--s8)', alignItems: 'center' }}>
                <TikSeridi tikler={['ok', 'ok', 'bd', null, 'md']} etiket="Son beş koşu: başarılı, başarılı, başarısız, kayıt yok, kısmi" />
                <span className="etiket">koşu geçmişi</span>
              </span>
            </div>
          </div>
        </B>

        <B no="04" ad="Düğme ve form" not="Yarıçap yok, odak halkası 2px aksan + 2px offset. Zorunlu gerekçe alanı mono etiketle işaretlenir.">
          <div style={{ display: 'flex', gap: 'var(--s12)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Dugme tur="birincil">Kapsamı çalıştır</Dugme>
            <Dugme tur="ikincil">Kontrol ağacı</Dugme>
            <Dugme tur="ret">Reddet</Dugme>
            <Dugme tur="satir">Tüm kayıtlar ▸</Dugme>
            <span style={{ width: 260 }}>
              <Dugme tur="tam">Kanıt talep et</Dugme>
            </span>
          </div>
          <div style={{ display: 'grid', gap: 'var(--s16)', maxWidth: 420, marginTop: 'var(--s22)' }}>
            <Alan etiket="Arama"><input className="ab-gr" placeholder="Kontrol veya santral" /></Alan>
            <Alan etiket="Gerekçe" zorunlu hata="Gerekçe en az 10 karakter olmalı.">
              <textarea className="ab-gr" rows={2} aria-invalid="true" aria-label="Hatalı alan örneği" defaultValue="kısa" />
            </Alan>
          </div>
        </B>

        <B no="05" ad="İpucu" not="Hover ve odakla açılır. Sözleşme: kritik hiçbir bilgi yalnız burada yaşayamaz.">
          <div style={{ display: 'flex', gap: 'var(--s34)' }}>
            <Ipucu metin="EPDK-SYM 4.2.1 · Kızıldere 3 · ağ ayrıştırma yok">
              <span style={{ display: 'inline-flex' }}><Im durum="bd" /></span>
            </Ipucu>
            <Ipucu genis metin="R-EPDK-01 · kurulu güç ≥ 50 MWe ve TEİAŞ SCADA bağlantısı varsa kapsam açılır.">
              <button type="button" className="ab-dugme satir">Kapsam kuralı ⓘ</button>
            </Ipucu>
          </div>
        </B>

        <B no="06" ad="Süzgeç şeridi · kip ikilisi · aşama şeridi" not="Aktif filtre dolu ve köşeli; pasifler sadece metin. Pill, kenarlık, kayan gösterge yok. Aşama şeridi sekme değildir.">
          <Filtreler
            secenekler={[
              { id: 'epdk', ad: 'EPDK-SYM' }, { id: 'cbddo', ad: 'CBDDÖ' },
              { id: 'iso', ad: 'ISO 27019' }, { id: 'iec', ad: 'IEC 62443' },
              { id: 'kvkk', ad: 'KVKK' }, { id: 'nis', ad: 'NIS2' },
            ]}
            aktif={filtre} sec={setFiltre}
            kapsam={<button type="button" className="ab-dugme">Filtre ▾</button>}
          />
          <div style={{ marginTop: 'var(--s22)' }}>
            <KipDegistir secenekler={[{ id: 'iliski', ad: 'İlişki' }, { id: 'tablo', ad: 'Tablo' }]}
              aktif={kip} sec={setKip} />
          </div>
          <div style={{ marginTop: 'var(--s22)', maxWidth: 760 }}>
            <Asamalar aktifIndeks={2} asamalar={[
              { ad: 'Plan', tarih: '12 Oca' }, { ad: 'Kapsam', tarih: '3 Şub' },
              { ad: 'Saha', tarih: '14 Eki' }, { ad: 'Bulgu' }, { ad: 'Kapanış' },
            ]} />
          </div>
        </B>

        <B no="07" ad="Bağlam çubuğu" not="En fazla üç seviyelik kırıntı yolu (sarmaz; önce orta segment kısalır), sağda üretim tipine göre gruplanmış santral seçici. Fotoğrafı olmayan santral tipografik döşeme alır; sahte görsel uydurulmaz.">
          <BaglamCubugu
            kirintiler={[
              { ad: 'Portföy', yol: '/portfoy' },
              { ad: 'Zorlu Jeotermal Enerji', yol: '/portfoy' },
              { ad: 'Kızıldere 3 JES' },
            ]}
            secici={[
              { id: 'k3', ad: 'Kızıldere 3 JES', alt: '165 MWe · Denizli', tip: 'JES', gorsel: null, yol: '/tesisler/k3' },
              { id: 'k2', ad: 'Kızıldere 2 JES', alt: '80 MWe · Denizli', tip: 'JES', gorsel: null, yol: '/tesisler/k2' },
              { id: 'gd', ad: 'Gökçedağ RES', alt: '135 MWe · Osmaniye', tip: 'RES', gorsel: null, yol: '/tesisler/gd' },
              { id: 'ik', ad: 'İkizdere HES', alt: '18 MWe · Rize', tip: 'HES', gorsel: null, yol: '/tesisler/ik' },
            ]}
            sag={<Dugme tur="ikincil">Kapsamı daralt</Dugme>}
          />
        </B>

        <B no="08" ad="Kütük tablosu" not="Satır: işaretçi · konu (+alt satır) · hücreler · chevron. Zebra yok, satır içi eylem yok, durum kelimesi yok. Son satır sağlıklı kalanı toplar.">
          <Tablo
            kolonlar={[
              { baslik: 'Santral', genislik: '190px' },
              { baslik: 'Sahip', genislik: '150px', ikincil: true },
              { baslik: 'Hedef', genislik: '120px', sag: true },
            ]}
            satirlar={[
              { id: 'R-1', durum: 'bd', konu: 'SCADA ağı kurumsal ağdan ayrıştırılmamış',
                alt: 'RSK-2026-001 · 16/25 · üretim etkisi 5/5',
                hucreler: ['Gökçedağ RES', 'B. Şahin', '24 gün'], kenar: 'bd' },
              { id: 'R-2', durum: 'md', konu: 'Kuyubaşı RTU’larda tekil haberleşme güzergâhı',
                alt: 'RSK-2026-004 · 12/25 · azalt',
                hucreler: ['Kızıldere 3 JES', 'M. Kaya', 'Q1’27'], kenar: 'md' },
              { id: 'R-3', durum: 'unk', konu: 'Alaşehir JES saha ağı envanteri',
                alt: 'RSK-2026-011 · profil eksik',
                hucreler: ['Alaşehir JES', '—', '—'] },
            ]}
            secili={secili} sec={setSecili}
            kuyruk={{ metin: '+22 risk · zamanında ilerliyor' }}
            dipNot="Satıra gelince özet · tıklayınca çekmece"
          />
        </B>

        <B no="09" ad="Kesişim matrisi" not="Hücrelerde yalnız işaretçi bulunur — asla metin. Satırın en kötüsü bir kademe büyük ve haleli. Sakin satırlar %58 opaklıkta.">
          <Matris
            kolonBasliklari={['Erişim', 'Ağ', 'İzleme', 'Yedek', 'Olay']}
            satirlar={[
              { id: 'k3', ad: 'Kızıldere 3 JES', alt: '165 MWe', hucreler: [
                { durum: 'md', ipucu: 'Erişim · kısmi' }, { durum: 'bd', ipucu: 'Ağ · uyumsuz' },
                { durum: 'ok', ipucu: 'İzleme · uyumlu' }, { durum: 'md', ipucu: 'Yedek · kısmi' },
                { durum: 'ok', ipucu: 'Olay · uyumlu' }] },
              { id: 'gd', ad: 'Gökçedağ RES', alt: '135 MWe', hucreler: [
                { durum: 'bd', ipucu: 'Erişim · uyumsuz' }, { durum: 'bd', ipucu: 'Ağ · uyumsuz' },
                { durum: 'md', ipucu: 'İzleme · kısmi' }, { durum: 'ok', ipucu: 'Yedek · uyumlu' },
                { durum: 'md', ipucu: 'Olay · kısmi' }] },
              { id: 'k2', ad: 'Kızıldere 2 JES', alt: '80 MWe', hucreler: [
                { durum: 'ok', ipucu: 'Erişim · uyumlu' }, { durum: 'md', ipucu: 'Ağ · kısmi' },
                { durum: 'ok', ipucu: 'İzleme · uyumlu' }, { durum: 'ok', ipucu: 'Yedek · uyumlu' },
                { durum: 'unk', ipucu: 'Olay · henüz değerlendirme yok' }] },
              { id: 'coklu', ad: 'Kuzgun · Mercan · Tercan', alt: '3 HES', hucreler: [
                { durum: 'ok', ipucu: 'Erişim · uyumlu' }, { durum: 'md', ipucu: 'Ağ · kısmi' },
                { durum: 'md', ipucu: 'İzleme · kısmi' }, { durum: 'ok', ipucu: 'Yedek · uyumlu' },
                { durum: 'unk', ipucu: 'Olay · henüz değerlendirme yok' }] },
              { id: 'sakin', ad: 'Beyköy · Çıldır · Ataköy', alt: '3 tesis', sakin: true, hucreler: [
                { durum: 'ok', ipucu: 'Erişim · uyumlu' }, { durum: 'ok', ipucu: 'Ağ · uyumlu' },
                { durum: 'ok', ipucu: 'İzleme · uyumlu' }, { durum: 'ok', ipucu: 'Yedek · uyumlu' },
                { durum: 'ok', ipucu: 'Olay · uyumlu' }] },
            ]}
            secili={secili} sec={(id) => setSecili(id)}
            dipNot="Hücreye gelince özet · tıklayınca çekmece"
          />
        </B>

        <B no="10" ad="Genişleyen satır" not="Kontrol aileleri. Varsayılan olarak aynı anda tek aile açık.">
          <GenisleyenSatir grup="aile" ad="4.2 · Ağ güvenliği" adet="7 kontrol" durum="bd" varsayilanAcik
            cocuklar={
              <>
                {[['4.2.1', 'Ağ ayrıştırma', 'OT · tüm santraller', 'bd'],
                  ['4.2.2', 'Uzak erişim MFA', 'BT/OT · 13 santral', 'ok'],
                  ['4.2.3', 'Güvenlik duvarı kural gözden geçirme', 'BT · merkez', 'md']]
                  .map(([kod, ad, kapsam, d]) => (
                    <div key={kod} className="satir">
                      <span className="kod">{kod}</span>
                      <span className="ad">{ad}</span>
                      <span className="kapsam">{kapsam}</span>
                      <Im durum={d as Durum} />
                    </div>
                  ))}
              </>
            } />
          <GenisleyenSatir grup="aile" ad="5.1 · Kimlik yönetimi" adet="4 kontrol" durum="md"
            cocuklar={<div className="satir"><span className="kod">5.1.1</span>
              <span className="ad">Servis hesapları</span>
              <span className="kapsam">BT · merkez</span><Im durum="md" /></div>} />
        </B>

        <B no="11" ad="Odak kartı" not="Ekran başına bir tane. En fazla bir cümle düzyazı. 5px sol kenar sürükleyen durumun renginde.">
          <OdakKarti
            ust="Kritik · yönetim kararı gerektirir"
            vurgu="Gökçedağ RES" baslik="’te SCADA ağı kurumsal ağdan ayrıştırılmamış"
            cumle="Düz ağ topolojisi tespit edildi; EPDK-SYM 4.2.1, RSK-2026-001 ve CBDDÖ denetim hazırlığı bu boşluğa bağlı."
            hedef={{ sayi: '24 gün', yazi: 'Sahip B. Şahin' }}
            seritler={[
              { etiket: 'Uyum', deger: 'EPDK 4.2.1 uyumsuz', not: 'Grup uyumu −3 puan' },
              { etiket: 'Risk', deger: 'RSK-2026-001 · 16/25', not: 'Üretim etkisi 5/5' },
              { etiket: 'Azaltım', deger: 'PRJ-OT-SEG · %58', not: 'ACL fazı planlandı' },
              { etiket: 'Denetim', deger: 'CBDDÖ · 35 gün', not: 'Kanıt 11/15' },
            ]}
            eylemler={<>
              <Dugme tur="birincil">Kaydı aç</Dugme>
              <Dugme tur="ikincil">Zinciri gör</Dugme>
            </>}
          />
        </B>

        <B no="12" ad="Zaman şeridi · ömür ufku" not="Etiketler eksenin üstünde, kartlar ayrılmış şeritte — asla aynı lanede. EOL varyantı 3px sol kenarla dönüşümlü dizilir.">
          <ZamanCizelgesi
            bugun={0.28}
            donemler={[{ ad: 'Oca', konum: 0 }, { ad: 'Nis', konum: 0.28 },
              { ad: 'Tem', konum: 0.56 }, { ad: 'Eki', konum: 0.82 }]}
            kartlar={[
              { id: 'a', ad: 'CBDDÖ denetimi', geri: '35g', kapsam: '13 santral · kanıt 11/15', durum: 'bd', konum: 0.30 },
              { id: 'b', ad: 'İç denetim · JES', geri: '14 Eki', kapsam: 'Kızıldere 1–3', durum: 'md', konum: 0.62 },
            ]}
          />
          <div style={{ marginTop: 'var(--s24)' }}>
            <OmurUfku kartlar={[
              { id: 'e1', ad: 'Separatör PLC (S7-300 ×3)', geri: 'Mar 27', kapsam: 'EOS geçti · telafi yok', gecmis: true, konum: 0.06 },
              { id: 'e2', ad: 'WinCC SCADA sunucu', geri: 'Eyl 27', kapsam: 'Kızıldere 3', gecmis: false, konum: 0.44 },
              { id: 'e3', ad: 'Saha anahtarları', geri: 'Q2 28', kapsam: '4 santral', gecmis: false, konum: 0.74 },
            ]} />
          </div>
        </B>

        <B no="13" ad="Grafik tuvali" not="İlk render yalnız bölgeleri ve kritik düğümleri gösterir. Akış yalnız yön anlatır; azaltılmış harekette durur, kesik çizgi kalır.">
          <Tuval
            odak={odak} odakla={(id) => setOdak(odak === id ? null : id)}
            dipNot="Düğüme tıkla · ilgisiz kenarlar söner"
            dugumler={[
              { id: 'kur', ad: 'Kurumsal ağ', alt: 'SL4 · 22 varlık', x: 16, y: 26 },
              { id: 'uzak', ad: 'Uzak erişim', alt: 'Vendor ×2 · MFA ✓', x: 16, y: 62 },
              { id: 'dmz', ad: 'OT DMZ', alt: 'SL3 · 6 varlık', x: 46, y: 44 },
              { id: 'scada', ad: 'SCADA', alt: 'SL2 · WinCC · EOS Mar 27', x: 70, y: 44,
                kritik: true, durum: 'bd', ustEtiket: 'EOS Mar 27' },
              { id: 'kuyu', ad: 'Kuyu sahası', alt: 'RTU ×8 · tekil güzergâh', x: 90, y: 22 },
              { id: 'sep', ad: 'Separatör', alt: 'PLC ×3 · EOS', x: 90, y: 68 },
            ]}
            kenarlar={[
              { kaynak: 'kur', hedef: 'dmz' }, { kaynak: 'uzak', hedef: 'dmz' },
              { kaynak: 'dmz', hedef: 'scada', aktif: true },
              { kaynak: 'scada', hedef: 'kuyu', aktif: true },
              { kaynak: 'scada', hedef: 'sep' },
            ]}
          />
        </B>

        <B no="14" ad="Veri kökeni" not="Bu bir durum rozeti değildir: kaydın DOĞRULUĞUNU değil KÖKENİNİ söyler. Zemin, kenarlık, yarıçap yok. Kökeni olmayan kayıt sessizce kaybolmaz, 'Elle girildi' der; güven ölçülmemişse '%0' değil 'ölçülmedi' yazar.">
          <div style={{ display: 'flex', gap: 'var(--s34)', flexWrap: 'wrap', alignItems: 'baseline' }}>
            {KOKENLER.map((k) => (
              <span key={k.ad} style={{ display: 'grid', gap: 'var(--s8)' }}>
                <KokenRozeti koken={k.koken} />
                <span className="etiket">{k.ad}</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--s24)', marginTop: 'var(--s22)', maxWidth: 900 }}>
            {KOKENLER.map((k) => (
              <div key={k.ad}>
                <p className="kolonbas" style={{ margin: '0 0 var(--s6)' }}>{k.ad}</p>
                <KokenSatiri koken={k.koken} />
              </div>
            ))}
          </div>
        </B>

        <B no="15" ad="İkincil sıra" not="Tek kabuğun 36px ikincil gezinme sırası: alanın kendi ekranları, gruplar saç çizgisiyle ayrılır; aktif öğe aria-current=&quot;true&quot; taşır (belgede tek &quot;page&quot; alan sekmesindedir). Barlow Condensed 14px büyük harf; grup başlığı yalnız Varlık'ta. Kendi okuma anahtarını veren ekran (uyum matrisi) `.ab-c-ekrandizin` ile ayrıca 212px sol sütun çizer.">
          <nav className="ab-ikincil" aria-label="Bölümler (örnek)" style={{ position: 'static', margin: '0 calc(-1 * var(--s24))' }}>
            {IKINCIL['/uyum'].map((grup, i) => (
              <div key={i} className="grup">
                {grup.ogeler.map((o) => (
                  <Link key={o.yol} href={o.yol}
                    aria-current={o.yol === '/uyum' ? 'true' : undefined}>
                    {o.ad}
                  </Link>
                ))}
              </div>
            ))}
            <span className="mono etiket sag">Zorlu Enerji · 16 santral</span>
          </nav>
          <div style={{ maxWidth: 212, marginTop: 'var(--s24)' }}>
            <aside className="ab-c-dizin" aria-label="Okuma anahtarı (örnek)">
              <div className="bolum">
                <span className="etiket">Okuma anahtarı</span>
                {DURUMLAR.map((d) => (
                  <span key={d} className="anahtar">
                    <Im durum={d} />
                    <span>{DURUM_SOZU[d]}</span>
                  </span>
                ))}
              </div>
            </aside>
          </div>
        </B>

        <B no="16" ad="Yükleniyor · boş · hata · yetkisiz" not="Yapı korunur: gerçek etiketler hemen render olur, değerler blok olur. Spinner yok, illüstrasyon yok, cesaretlendirme yok.">
          <div style={{ display: 'grid', gap: 'var(--s24)' }}>
            <div>
              <p className="kolonbas" style={{ margin: '0 0 var(--s12)' }}>Yükleniyor</p>
              <div className="ab-olcutler">
                {['Uyum', 'Bilinmeyen', 'Kanıt', 'Kritik'].map((y) => (
                  <div key={y}>
                    <Iskelet sinif="iskelet-metrik" stil={{ display: 'block' }} />
                    <span className="yazi etiket">{y}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'var(--s18)', display: 'grid', gap: 'var(--s18)' }}>
                {[0, 1].map((i) => (
                  <div key={i}>
                    <Iskelet sinif="iskelet-satir" stil={{ display: 'block' }} />
                    <Iskelet sinif="iskelet-alt" stil={{ display: 'block' }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--s24)', flexWrap: 'wrap' }}>
              <BosIlk cumle="Bu çerçeve için henüz değerlendirme başlatılmadı."
                eylem={<Dugme tur="birincil">Kapsamı çalıştır</Dugme>} />
              <Hata cumle="Uyum özeti alınamadı; tablo son bilinen veriyle çalışıyor."
                teknik="ETIMEDOUT · uyumOzeti · 8.4s" yenidenDene={() => {}} />
              <Yetkisiz rol="denetim sorumlusu" />
            </div>
            <BosFiltre temizle={() => setFiltre('epdk')} />
            {/* Bilinmeyen ≠ sıfır ≠ sağlıklı ≠ ölçülmedi: dört hâl, dört kutu.
                Sol kenardaki 45° tarama bilinmeyen dilimiyle aynı şekil kodu. */}
            <div style={{ display: 'flex', gap: 'var(--s24)', flexWrap: 'wrap' }}>
              <Olculmedi ne="Alaşehir JES · OT segmenti" neden="tarama kapsamı dışında" />
              <BaglantiYok kaynak="EPDK-SYM bağlayıcısı" sonBasarili="02 Eyl 03:10" />
              <KismiVeri olculen={7} toplam={11} birim="santral" />
            </div>
          </div>
        </B>
      </main>

      {secili && (
        <Cekmece kod="RSK-2026-004 · Kızıldere 3" kapat={() => setSecili(null)}>
          <CekmeceKimlik durum="bd" soz="Uyumsuz"
            baslik="EPDK-SYM 4.2.1 — ağ ayrıştırma"
            cumle="Kuyu sahası ile kurumsal ağ arasında düz L2 geçiş." />
          <CekmeceAlanlar alanlar={[
            { etiket: 'Kanıt', deger: 'yok', durum: 'bd' },
            { etiket: 'Sahip', deger: 'B. Şahin' },
            { etiket: 'Son tarih', deger: '26 Eylül' },
            { etiket: 'Aile durumu', deger: '1 / 4 uyumsuz' },
          ]} />
          <KokenSatiri koken={KOKENLER[2].koken} />
          <CekmeceBagli kayitlar={[
            { id: '1', kod: 'RSK-2026-004', alt: '12/25', yol: '/riskler' },
            { id: '2', kod: 'BLG-2026-118', alt: 'aksiyonda', yol: '/bulgular' },
            { id: '3', kod: 'PRJ-OT-SEG', alt: '%58 · Q2’27', yol: '/projeler', suren: true },
          ]} />
          <CekmeceEylemler
            birincil={<Dugme tur="tam">Kanıt talep et</Dugme>}
            ikincil={<Dugme tur="ikincil">Kontrol ağacı</Dugme>}
            dipNot="Talep, denetim izine kaydedilir ve sahibe bildirim düşer."
          />
        </Cekmece>
      )}
    </>
  );
}

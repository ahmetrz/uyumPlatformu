'use client';
import { useState } from 'react';
import {
  Im, Metrikler, Bar, Segment, Kesir, Ipucu, Dugme, Alan,
  Iskelet, BosIlk, BosFiltre, Hata, Yetkisiz, DURUM_SOZU, type Durum,
} from '@/components/atlas/temel';
import { Tablo, Matris, GenisleyenSatir } from '@/components/atlas/tablo';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/atlas/cekmece';
import {
  EkranBasligi, Filtreler, KipDegistir, Asamalar, OdakKarti,
} from '@/components/atlas/ekran';
import { ZamanCizelgesi, OmurUfku } from '@/components/atlas/zaman';
import { Tuval } from '@/components/atlas/grafik';

/* Faz 3 çıkış kriteri (07 §Phase 3): her bileşen her durumda.
   Bu galeri aynı zamanda 06 §A4 anti-regresyon listesinin denendiği yerdir. */

const DURUMLAR: Durum[] = ['ok', 'md', 'bd', 'pl', 'unk', 'tamam'];

function B({ no, ad, not, children }: {
  no: string; ad: string; not?: string; children: React.ReactNode;
}) {
  return (
    <section style={{ padding: '0 var(--gutter-op) var(--sec-pad-bot)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s12)',
        padding: 'var(--sec-pad-top) 0 var(--s18)' }}>
        <span className="t-caption num">{no}</span>
        <h2 className="t-section" style={{ margin: 0 }}>{ad}</h2>
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
          eyebrow="Atlas · Faz 3 · Bileşen galerisi"
          vurgu="18 primitif"
          baslik="her durumda"
          metrikler={[
            { deger: 18, yazi: 'Bileşen' },
            { deger: 6, yazi: 'Durum' },
            { deger: 0, yazi: 'Yarıçap' },
            { deger: 0, yazi: 'Canvasta durum sözü', durum: 'ok' },
          ]}
        />

        <B no="08" ad="StatusMarker"
          not="Boyut şiddeti, şekil bilinmeyeni kodlar. Bilinmeyen içi boş 45° elmastır — asla dolu nokta. Yanında durum kelimesi bulunmaz; her birinin erişilebilir adı vardır.">
          {/* Efsane: bir bileşen kataloğu gösterdiği şeyi adlandırmak zorundadır.
              Ürün ekranlarında marker'ın yanına durum sözcüğü YAZILAMAZ (06 §A4-3);
              denetim aracı bu bloğu data-efsane ile muaf sayar, kuralı gevşetmez. */}
          <div data-efsane="statusmarker"
            style={{ display: 'flex', gap: 'var(--s34)', alignItems: 'center' }}>
            {DURUMLAR.map((d) => (
              <span key={d} style={{ display: 'grid', justifyItems: 'center', gap: 'var(--s10)' }}>
                <Im durum={d} />
                <span className="t-caption">{DURUM_SOZU[d]}</span>
              </span>
            ))}
            <span style={{ display: 'grid', justifyItems: 'center', gap: 'var(--s10)' }}>
              <Im durum="bd" enKotu />
              <span className="t-caption">Satırın en kötüsü</span>
            </span>
          </div>
        </B>

        <B no="03" ad="MetricRow" not="Üründeki tek KPI muamelesi. Kart, kenarlık, ikon, sparkline yok. Renk yalnız sayının kendisi alarm olduğunda.">
          <Metrikler metrikler={[
            { deger: '%78', yazi: 'Uyum' },
            { deger: '%14', yazi: 'Bilinmeyen' },
            { deger: 3, yazi: 'Kritik risk', durum: 'bd' },
            { deger: '19g', yazi: 'EPDK bildirimi', durum: 'md' },
          ]} />
        </B>

        <B no="16" ad="ProgressIndicator" not="Bar · segment · kesir. Donut, radyal gauge, yüzde halkası yok. Bilinmeyen segmenti daima sonda ve kendi gri tonunda.">
          <div style={{ display: 'grid', gap: 'var(--s22)', maxWidth: 420 }}>
            <Bar oran={64} deger="%64" />
            <Bar oran={31} durum="bd" deger="%31" />
            <Segment ok={58} md={14} bd={11} unk={17} />
            <div><Kesir pay={11} payda={15} /></div>
          </div>
        </B>

        <B no="17/18" ad="Buttons & Forms" not="Yarıçap yok, odak halkası 2px aksan + 2px offset. Zorunlu gerekçe alanı mono etiketle işaretlenir.">
          <div style={{ display: 'flex', gap: 'var(--s12)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Dugme tur="birincil">Kapsamı çalıştır</Dugme>
            <Dugme tur="ikincil">Kontrol ağacı</Dugme>
            <Dugme tur="ret">Reddet</Dugme>
            <Dugme tur="satir">Tüm kayıtlar ▸</Dugme>
            <span style={{ width: 260 }}>
              <Dugme tur="cekmece">Kanıt talep et</Dugme>
            </span>
          </div>
          <div style={{ display: 'grid', gap: 'var(--s16)', maxWidth: 420, marginTop: 'var(--s22)' }}>
            <Alan etiket="Arama"><input className="gr" placeholder="Kontrol veya santral" /></Alan>
            <Alan etiket="Gerekçe" zorunlu hata="Gerekçe en az 10 karakter olmalı.">
              <textarea className="gr" rows={2} aria-invalid="true" defaultValue="kısa" />
            </Alan>
          </div>
        </B>

        <B no="13" ad="Tooltip & Popover" not="Hover ve odakla açılır. Sözleşme: kritik hiçbir bilgi yalnız burada yaşayamaz.">
          <div style={{ display: 'flex', gap: 'var(--s34)' }}>
            <Ipucu metin="EPDK-SYM 4.2.1 · Kızıldere 3 · ağ ayrıştırma yok">
              <span style={{ display: 'inline-flex' }}><Im durum="bd" /></span>
            </Ipucu>
            <Ipucu genis metin="R-EPDK-01 · kurulu güç ≥ 50 MWe ve TEİAŞ SCADA bağlantısı varsa kapsam açılır.">
              <button type="button" className="acikla">Kapsam kuralı ⓘ</button>
            </Ipucu>
          </div>
        </B>

        <B no="04/12" ad="FilterBar · ModeSwitch · Asamalar" not="Aktif filtre dolu ve köşeli; pasifler sadece metin. Pill, kenarlık, kayan gösterge yok.">
          <Filtreler
            secenekler={[
              { id: 'epdk', ad: 'EPDK-SYM' }, { id: 'cbddo', ad: 'CBDDÖ' },
              { id: 'iso', ad: 'ISO 27019' }, { id: 'iec', ad: 'IEC 62443' },
              { id: 'kvkk', ad: 'KVKK' }, { id: 'nis', ad: 'NIS2' },
            ]}
            aktif={filtre} sec={setFiltre}
            kapsam={<button type="button" className="kapsam-dugme">Filtre ▾</button>}
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

        <B no="05" ad="DataTable" not="Satır: marker · konu (+alt satır) · hücreler · chevron. Zebra yok, satır içi eylem yok, durum kelimesi yok. Son satır sağlıklı kalanı toplar.">
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

        <B no="07" ad="MatrixTable" not="Hücrelerde yalnız marker bulunur — asla metin. Satırın en kötüsü bir kademe büyük ve haleli. Sakin satırlar %58 opaklıkta.">
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

        <B no="11" ad="ExpandableRow" not="Kontrol aileleri. Varsayılan olarak aynı anda tek aile açık.">
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

        <B no="09" ad="RecordCard" not="Ekran başına bir tane. En fazla bir cümle düzyazı. 5px sol kenar sürükleyen durumun renginde.">
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

        <B no="14" ad="Timeline" not="Etiketler eksenin üstünde, kartlar ayrılmış şeritte — asla aynı lanede. EOL varyantı 3px sol kenarla dönüşümlü dizilir.">
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

        <B no="15" ad="GraphCanvas" not="İlk render yalnız bölgeleri ve kritik düğümleri gösterir. Akış yalnız yön anlatır; azaltılmış harekette durur, kesik çizgi kalır.">
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

        <B no="19" ad="Loading · Empty · Error · Unauthorised" not="Yapı korunur: gerçek etiketler hemen render olur, değerler blok olur. Spinner yok, illüstrasyon yok, cesaretlendirme yok.">
          <div style={{ display: 'grid', gap: 'var(--s24)' }}>
            <div>
              <p className="t-colhead" style={{ margin: '0 0 var(--s12)' }}>Yükleniyor</p>
              <div className="metrikler">
                {['Uyum', 'Bilinmeyen', 'Kanıt', 'Kritik'].map((y) => (
                  <div key={y} className="metrik">
                    <Iskelet sinif="iskelet-metrik" stil={{ display: 'block' }} />
                    <span className="yazi t-caption">{y}</span>
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
          <CekmeceBagli kayitlar={[
            { id: '1', kod: 'RSK-2026-004', alt: '12/25', yol: '/riskler' },
            { id: '2', kod: 'BLG-2026-118', alt: 'aksiyonda', yol: '/bulgular' },
            { id: '3', kod: 'PRJ-OT-SEG', alt: '%58 · Q2’27', yol: '/projeler', suren: true },
          ]} />
          <CekmeceEylemler
            birincil={<Dugme tur="cekmece">Kanıt talep et</Dugme>}
            ikincil={<Dugme tur="ikincil">Kontrol ağacı</Dugme>}
            dipNot="Talep, denetim izine kaydedilir ve sahibe bildirim düşer."
          />
        </Cekmece>
      )}
    </>
  );
}

'use client';
import { SegBar, Halka, Bos, type DurumSayilari } from '@/components/ui';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { ONEM_DURUM_RENGI, type Onem, type Durum } from '@/lib/sabitler';

type Matris = { id: string; kod: string; regKod: string; ad: string;
  tesisler: { id: string; kod: string; ad: string; sayilar: DurumSayilari;
    yuzde: number | null; bilinmeyen: number | null }[] }[];
type B = { id: string; baslik: string; durum: string; onem: string;
  tesisKod: string; regKod: string; yasGun: number; acik: boolean };
type K = { id: string; ad: string; tip: string; gun: number; baglanti: number };

export default function RaporlarIstemci({ matris, bulgular, kanitlar }: {
  matris: Matris; bulgular: B[]; kanitlar: K[];
}) {
  const aciklar = bulgular.filter((b) => b.acik);
  const yasKovalar: [string, number, Durum][] = [
    ['0–30 gün', aciklar.filter((b) => b.yasGun <= 30).length, 'uyumlu'],
    ['31–60 gün', aciklar.filter((b) => b.yasGun > 30 && b.yasGun <= 60).length, 'kismi'],
    ['61–90 gün', aciklar.filter((b) => b.yasGun > 60 && b.yasGun <= 90).length, 'kismi'],
    ['90+ gün', aciklar.filter((b) => b.yasGun > 90).length, 'uyumsuz'],
  ];
  const enYasli = Math.max(1, ...yasKovalar.map(([, n]) => n));
  const tazelik: DurumSayilari = {
    uyumlu: kanitlar.filter((k) => k.gun < 90).length,
    kismi: kanitlar.filter((k) => k.gun >= 90 && k.gun <= 180).length,
    uyumsuz: kanitlar.filter((k) => k.gun > 180).length,
  };

  return (
    <>
      <div className="filtreler yazdirmada-gizle">
        <span className="mikro-etiket">ANLIK RAPOR · {new Date().toLocaleDateString('tr-TR')}</span>
        <span style={{ flex: 1 }} />
        <button className="btn" onClick={pdfYazdir}>🖨 PDF</button>
        <button className="btn birincil" onClick={() => exceleAktar('uyum-raporu', [
          { ad: 'Uyum matrisi', satirlar: [
            ['Süreç', 'Regülasyon', 'Tesis', 'Uyum %', 'Uyumlu', 'Kısmi', 'Uyumsuz', 'İncelemede', 'Kapsam dışı'],
            ...matris.flatMap((s) => s.tesisler.map((t) => [
              s.kod, s.regKod, t.kod, t.yuzde ?? '',
              t.sayilar.uyumlu ?? 0, t.sayilar.kismi ?? 0, t.sayilar.uyumsuz ?? 0,
              t.sayilar.incelemede ?? 0, t.sayilar.kapsamdisi ?? 0])) ] },
          { ad: 'Bulgular', satirlar: [
            ['Bulgu', 'Durum', 'Önem', 'Tesis', 'Regülasyon', 'Yaş (gün)'],
            ...bulgular.map((b) => [b.baslik, b.durum, b.onem, b.tesisKod, b.regKod, b.yasGun]) ] },
          { ad: 'Kanıtlar', satirlar: [
            ['Kanıt', 'Tip', 'Yaş (gün)', 'Bağlantı sayısı'],
            ...kanitlar.map((k) => [k.ad, k.tip, k.gun, k.baglanti]) ] },
        ])}>⤓ Excel</button>
      </div>

      <section>
        <div className="sahne-baslik">
          <span className="no">01</span><h2>Tesis × süreç uyum matrisi</h2><span className="cizgi" />
        </div>
        <div className="kpi-grid" style={{ marginTop: 'var(--sp-4)' }}>
          {matris.map((s) => (
            <div key={s.id} className="kart">
              <div className="kart-baslik">
                <div><span className="mikro-etiket">{s.regKod}</span>
                  <h3 style={{ marginTop: 2 }}>{s.ad}</h3></div>
              </div>
              <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {s.tesisler.map((t) => (
                  <div key={t.id} className="mini-cubuk" style={{ gridTemplateColumns: '110px 1fr 40px' }}>
                    <span className="etiket mono" title={t.ad}>{t.kod}</span>
                    <SegBar sayilar={t.sayilar} yukseklik={8} />
                    <span className="sayi" title={t.bilinmeyen ? `bilinmeyen %${t.bilinmeyen}` : undefined}>
                      {t.yuzde === null ? '—' : `%${t.yuzde}`}
                      {(t.bilinmeyen ?? 0) > 0 && <span style={{ color: 'var(--text-3)' }}>?</span>}
                    </span>
                  </div>
                ))}
                {s.tesisler.length === 0 && <Bos baslik="Kapsam boş" />}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 'var(--sp-6)' }}>
        <section>
          <div className="sahne-baslik">
            <span className="no">02</span><h2>Açık bulgu yaş dağılımı</h2><span className="cizgi" />
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {yasKovalar.map(([etiket, n, renk]) => (
                <div key={etiket} className="mini-cubuk" style={{ gridTemplateColumns: '90px 1fr 30px' }}>
                  <span className="etiket">{etiket}</span>
                  <div className="seg-bar" style={{ height: 14 }}>
                    <span className={`seg-${renk}`} style={{ width: `${(n / enYasli) * 100}%`,
                      transition: 'width var(--mo-draw) var(--ease-out)' }} />
                  </div>
                  <span className="sayi">{n}</span>
                </div>
              ))}
              <div className="mikro-etiket" style={{ marginTop: 'var(--sp-2)' }}>
                90 günü aşan açık bulgu denetimde doğrudan bulguya dönüşür.
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="sahne-baslik">
            <span className="no">03</span><h2>Kanıt tazeliği</h2><span className="cizgi" />
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="kart-icerik" style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'center' }}>
              <Halka yuzde={kanitlar.length === 0 ? null
                : Math.round(((tazelik.uyumlu ?? 0) / kanitlar.length) * 100)} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <SegBar sayilar={tazelik} />
                <div className="mikro-etiket">
                  {tazelik.uyumlu ?? 0} taze · {tazelik.kismi ?? 0} yenilenmeli · {tazelik.uyumsuz ?? 0} süresi dolmuş
                </div>
                <div className="filtreler">
                  {kanitlar.filter((k) => k.gun > 180).slice(0, 3).map((k) => (
                    <span key={k.id} className="pill durum-uyumsuz" title={`${k.gun} gün`}>🗎 {k.ad}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="sahne-baslik">
            <span className="no">04</span><h2>Önem dağılımı (açık)</h2><span className="cizgi" />
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {(['kritik', 'yuksek', 'orta', 'dusuk'] as Onem[]).map((o) => {
                const n = aciklar.filter((b) => b.onem === o).length;
                const enCok = Math.max(1, ...(['kritik', 'yuksek', 'orta', 'dusuk'] as Onem[])
                  .map((x) => aciklar.filter((b) => b.onem === x).length));
                return (
                  <div key={o} className="mini-cubuk" style={{ gridTemplateColumns: '70px 1fr 30px' }}>
                    <span className="etiket" style={{ textTransform: 'capitalize' }}>{o}</span>
                    <div className="seg-bar" style={{ height: 14 }}>
                      <span className={`seg-${ONEM_DURUM_RENGI[o]}`}
                        style={{ width: `${(n / enCok) * 100}%`,
                          transition: 'width var(--mo-draw) var(--ease-out)' }} />
                    </div>
                    <span className="sayi">{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

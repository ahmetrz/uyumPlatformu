'use client';
import { useMemo, useState, useTransition } from 'react';
import { Alan, BosIlk, Dugme, Kesir, type Durum } from '@/components/atlas/temel';
import { Tablo, type Satir } from '@/components/atlas/tablo';
import { EkranBasligi } from '@/components/atlas/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceEylemler,
} from '@/components/atlas/cekmece';
import { kanitPaketiUretEylem } from '@/lib/eylemler2/disaAktarim';
import { hucreDurumu, hucreSozu, type Hucre } from '../mantik';

/* Kanıt paketi ekranı — tek canvas modülü: paketlenebilir kapsam listesi.

   Üretim ve indirme ÇEKMECEDE yaşar (modal yok, snackbar yok): satır
   seçilir, tarih aralığı verilir, paket sunucuda üretilir ve tarayıcı
   dosyayı indirir. Sonuç bir bildirim balonunda kaybolmaz — çekmecede
   özet (SHA-256) ile birlikte durur, çünkü denetçiye verilecek dosyanın
   damgası ekranda görülebilmelidir.

   Bilinmeyen sıfır sayılmaz: değerlendirilmemiş madde yüzdenin paydasına
   girmez (hucreDurumu), son değerlendirme yoksa 'bilinmiyor' yazılır. */

export type KapsamSatiri = {
  anahtar: string;
  tesisId: string;
  tesisKod: string;
  tesisAd: string;
  regulasyonId: string;
  regulasyonKod: string;
  surecKod: string;
  hucre: Hucre;
  madde: number;
  acikBulgu: number;
  kokensiz: number;
  /** null = hiç değerlendirilmemiş — sıfır ya da boş tarih DEĞİL */
  sonDegerlendirme: string | null;
};

type Uretim = { ozet: string; dosyaAdi: string; madde: number; bulgu: number; iz: number };

/** Canvasta aynı anda duran satır bütçesi (02-components §5). */
const GORUNUR_SATIR = 9;

const AGIRLIK: Record<string, number> = { bd: 0, md: 1, unk: 2, ok: 3 };

export default function KanitPaketiIstemci({
  satirlar, kisitliKapsam, bugun,
}: {
  satirlar: KapsamSatiri[];
  kisitliKapsam: boolean;
  /** Bugünün tarihi SUNUCUDA damgalanır: istemcide üretilse hidrasyonda kayardı. */
  bugun: string;
}) {
  const [secim, setSecim] = useState<string | null>(null);
  const [hepsi, setHepsi] = useState(false);

  const sirali = useMemo(() => [...satirlar].sort((a, b) => {
    const f = (AGIRLIK[hucreDurumu(a.hucre) ?? 'ok'] ?? 4)
      - (AGIRLIK[hucreDurumu(b.hucre) ?? 'ok'] ?? 4);
    return f !== 0
      ? f
      : `${a.regulasyonKod}${a.tesisKod}`.localeCompare(`${b.regulasyonKod}${b.tesisKod}`, 'tr');
  }), [satirlar]);

  const gorunen = hepsi ? sirali : sirali.slice(0, GORUNUR_SATIR);
  const kalan = sirali.length - gorunen.length;

  const toplamMadde = satirlar.reduce((a, s) => a + s.madde, 0);
  const toplamBulgu = satirlar.reduce((a, s) => a + s.acikBulgu, 0);
  const toplamKokensiz = satirlar.reduce((a, s) => a + s.kokensiz, 0);

  const tabloSatirlari: Satir[] = gorunen.map((s) => ({
    id: s.anahtar,
    durum: hucreDurumu(s.hucre) ?? 'unk',
    konu: s.tesisAd,
    alt: `${s.regulasyonKod} · ${s.surecKod} · ${s.tesisKod}`,
    hucreler: [
      s.madde,
      s.acikBulgu,
      <Kesir key="k" pay={s.kokensiz} payda={s.madde} />,
      s.sonDegerlendirme ?? 'bilinmiyor',
    ],
  }));

  const secilen = sirali.find((s) => s.anahtar === secim) ?? null;

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Kanıt paketi · ${satirlar.length} paketlenebilir kapsam`}
          vurgu={String(satirlar.length)}
          baslik="kapsam denetime hazır"
          metrikler={[
            { deger: satirlar.length, yazi: 'Kapsam' },
            { deger: toplamMadde, yazi: 'Madde' },
            { deger: toplamBulgu, yazi: 'Açık bulgu', durum: toplamBulgu > 0 ? 'bd' : undefined },
            {
              deger: toplamKokensiz, yazi: 'Kökeni yok',
              durum: toplamKokensiz > 0 ? 'md' : undefined,
            },
          ]}
        />

        <section className="ekran-govde">
          {sirali.length === 0 ? (
            <div style={{ marginTop: 'var(--s26)' }}>
              <BosIlk cumle={kisitliKapsam
                ? 'Yetkinizin kapsamındaki santraller için değerlendirilmiş madde yok — paketlenecek kanıt bulunmuyor.'
                : 'Hiçbir süreçte madde durumu yok — kanıt paketi üretilecek kapsam bulunmuyor.'} />
            </div>
          ) : (
            <div style={{ marginTop: 'var(--s26)' }}>
              <Tablo
                konuBasligi="Kapsam"
                kolonlar={[
                  { baslik: 'Madde', genislik: '70px', sag: true },
                  { baslik: 'Açık bulgu', genislik: '90px', sag: true },
                  { baslik: 'Kökeni yok', genislik: '90px', sag: true },
                  { baslik: 'Son değerlendirme', genislik: '130px', sag: true, ikincil: true },
                ]}
                satirlar={tabloSatirlari}
                secili={secim}
                sec={(id) => setSecim((o) => (o === id ? null : id))}
                kuyruk={kalan > 0 ? { metin: `${kalan} kapsam daha`, ac: () => setHepsi(true) } : null}
                dipNot={dipNot(toplamKokensiz, kisitliKapsam)}
              />
            </div>
          )}
        </section>
      </main>

      {secilen && (
        <PaketCekmecesi kapsam={secilen} bugun={bugun} kapat={() => setSecim(null)} />
      )}
    </>
  );
}

function dipNot(kokensiz: number, kisitli: boolean): string {
  const parcalar = ['Paket JSON olarak iner ve SHA-256 damgası taşır'];
  // Kökensiz satır pakette KALIR; sayısı burada da yazılır ki indiren kişi
  // dosyayı açmadan bilsin.
  if (kokensiz > 0) parcalar.push(`${kokensiz} madde "kökeni yok" işaretiyle girer`);
  if (kisitli) parcalar.push('liste yetkinizin kapsamıyla sınırlı');
  return parcalar.join(' · ');
}

/* ── Çekmece · paket üretimi ─────────────────────────────────────────── */

function birYilOnce(bugun: string): string {
  const d = new Date(bugun);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function PaketCekmecesi({ kapsam, bugun, kapat }: {
  kapsam: KapsamSatiri; bugun: string; kapat: () => void;
}) {
  const [baslangic, setBaslangic] = useState(() => birYilOnce(bugun));
  const [bitis, setBitis] = useState(bugun);
  const [hata, setHata] = useState<string | null>(null);
  const [uretim, setUretim] = useState<Uretim | null>(null);
  const [bekliyor, baslat] = useTransition();

  const d: Durum = hucreDurumu(kapsam.hucre) ?? 'unk';

  function uret() {
    setHata(null);
    baslat(async () => {
      const sonuc = await kanitPaketiUretEylem({
        regulasyonId: kapsam.regulasyonId,
        tesisIdleri: [kapsam.tesisId],
        baslangic: new Date(`${baslangic}T00:00:00`).toISOString(),
        bitis: new Date(`${bitis}T23:59:59`).toISOString(),
      });
      if (!sonuc.ok) { setHata(sonuc.hata); return; }

      /* İndirme istemcide yapılır: sunucu dosya yazmaz, paket yalnız
         isteyenin tarayıcısına iner. */
      const url = URL.createObjectURL(new Blob([sonuc.json], { type: 'application/json' }));
      const bag = document.createElement('a');
      bag.href = url;
      bag.download = sonuc.dosyaAdi;
      bag.click();
      URL.revokeObjectURL(url);

      setUretim({
        ozet: sonuc.ozet,
        dosyaAdi: sonuc.dosyaAdi,
        madde: sonuc.sayimlar.madde,
        bulgu: sonuc.sayimlar.bulgu,
        iz: sonuc.sayimlar.izSatiri,
      });
    });
  }

  return (
    <Cekmece kod={`${kapsam.regulasyonKod} · ${kapsam.tesisKod}`} kapat={kapat}>
      <CekmeceKimlik
        durum={d}
        soz={hucreSozu(kapsam.hucre)}
        baslik={kapsam.tesisAd}
        cumle={`${kapsam.madde} madde, ${kapsam.acikBulgu} açık bulgu ve kapsamın denetim izi `
          + 'tek dosyada iner. Sır, token ve parola pakete girmez: süzgeç sızıntı '
          + 'bulursa paket üretilmez.'}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Madde', deger: kapsam.madde },
        {
          etiket: 'Açık bulgu', deger: kapsam.acikBulgu,
          durum: kapsam.acikBulgu > 0 ? 'bd' : undefined,
        },
        {
          etiket: 'Kökeni yok',
          deger: <Kesir pay={kapsam.kokensiz} payda={kapsam.madde} />,
          durum: kapsam.kokensiz > 0 ? 'md' : undefined,
        },
        { etiket: 'Son değerlendirme', deger: kapsam.sonDegerlendirme ?? 'bilinmiyor' },
      ]} />

      <div className="cekmece-blok" style={{ marginTop: 'var(--s22)', display: 'grid',
        gap: 'var(--s12)' }}>
        <Alan etiket="Aralık başlangıcı" zorunlu>
          <input className="gr" type="date" value={baslangic} max={bitis}
            onChange={(e) => setBaslangic(e.target.value)} />
        </Alan>
        <Alan etiket="Aralık bitişi" zorunlu hata={bitis < baslangic ? 'Bitiş başlangıçtan önce olamaz' : null}>
          <input className="gr" type="date" value={bitis} min={baslangic}
            onChange={(e) => setBitis(e.target.value)} />
        </Alan>
      </div>

      {hata && <p className="gr-hata" style={{ marginTop: 'var(--s12)' }}>{hata}</p>}

      {uretim && (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s18)' }}>
          <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Üretilen paket</p>
          <div className="cekmece-alan">
            <span className="etiket">Dosya</span>
            <span className="deger">{uretim.dosyaAdi}</span>
          </div>
          <div className="cekmece-alan">
            <span className="etiket">SHA-256</span>
            <span className="deger" style={{ fontFamily: 'var(--mo)', wordBreak: 'break-all' }}>
              {uretim.ozet}
            </span>
          </div>
          <div className="cekmece-alan">
            <span className="etiket">İçerik</span>
            <span className="deger">
              {`${uretim.madde} madde · ${uretim.bulgu} bulgu · ${uretim.iz} iz satırı`}
            </span>
          </div>
        </div>
      )}

      <CekmeceEylemler
        birincil={
          <Dugme tur="birincil" onClick={uret} disabled={bekliyor || bitis < baslangic}>
            {bekliyor ? 'Paket üretiliyor…' : 'Paketi üret ve indir'}
          </Dugme>
        }
        dipNot={'Üretim denetim izine yazılır: kim, ne zaman, hangi kapsam. '
          + 'Paketin SHA-256 özeti iz satırında da durur — denetçinin elindeki '
          + 'dosya ile kayıt böyle eşleşir. Kökeni olmayan kayıt gizlenmez, '
          + '"kökeni yok" diye işaretlenir.'}
      />
    </Cekmece>
  );
}

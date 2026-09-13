'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { BosIlk, Dugme, Kesir, type Durum } from '@/components/kabuk/temel';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { denetimFormuUretEylem } from '@/lib/eylemler2/denetimFormu';
import {
  FORM_TURLERI, FORM_TURU_ADI, SABLON_ONEKI,
} from '@/lib/denetim/formTuru';

/* DENETİM FORMLARI EKRANI — tek canvas modülü.

   BİRİNCİL İŞ: denetçiye verilecek formu, KUSURUNU GÖREREK üretmek.

   Listenin taşıdığı asıl sayı madde sayısı değil GEREKÇESİZ KAPSAM DIŞI
   sayısıdır: denetçinin ilk sorusu "bu kontrol neden yok" olur ve o soru
   formu verdikten sonra değil, ÖNCE görünmelidir. Satırlar ona göre
   sıralanır ve kusurlu satır kırmızı kenar taşır.

   Üretim ve indirme ÇEKMECEDE yaşar (modal yok, snackbar yok): satır
   seçilir, form türü seçilir, form sunucuda üretilir, iki dosya (CSV ve
   XLSX) inilir. Üretimin ÖLÇÜMÜ çekmecede kalır — "boş hücre 0" bir
   bildirim balonunda kaybolmaz, çünkü denetçiye verilen dosyanın bu
   iddiası ekranda görülebilmelidir.

   Bilinmeyen sıfır sayılmaz: değerlendirilmemiş kontrol ayrı sayılır ve
   "uyumsuz" kovasına atılmaz. */

export type FormSatiriOzeti = {
  anahtar: string;
  tesisId: string;
  kapsamAd: string;
  regulasyonId: string;
  regulasyonKod: string;
  regulasyonAd: string;
  madde: number;
  kapsamDisi: number;
  /** Denetçinin ilk sorusu. Sıfırdan büyükse satır kusurludur. */
  gerekcesizKapsamDisi: number;
  degerlendirilmedi: number;
};

/** Kurulu paket form şablonu — ekran onu ÜRETMEZ, yalnız doldurulabilir gösterir. */
export type SablonOzeti = {
  kod: string;
  ad: string;
  /** Şablonu getiren sektör paketi; çekirdek şablonu yoktur, bu yüzden `null` beklenmez. */
  sektorAd: string | null;
  /** Tanımı okunamayan şablon GİZLENMEZ; kusuru adıyla durur. */
  okunamadi: boolean;
  alan: number;
  bagli: number;
  /** Şablonun sorduğu kontrol KURULUMDA yok — form dolu görünürdü. */
  baglanmadi: number;
  sayim: number;
  serbest: number;
};

type Uretim = {
  turAdi: string;
  csvAdi: string;
  xlsxAdi: string;
  satir: number;
  hucre: number;
  bosHucre: number;
  olculmedi: number;
  gerekcesizKapsamDisi: number;
};

/** Canvasta aynı anda duran satır bütçesi (02-components §5). */
const GORUNUR_SATIR = 9;

function indir(ad: string, gövde: BlobPart, tip: string) {
  const url = URL.createObjectURL(new Blob([gövde], { type: tip }));
  const bag = document.createElement('a');
  bag.href = url;
  bag.download = ad;
  bag.click();
  URL.revokeObjectURL(url);
}

/** base64 → ikili gövde; XLSX metin değildir, dizeye çevrilirse bozulur. */
function ikiliye(b64: string): ArrayBuffer {
  const ham = atob(b64);
  const arabellek = new ArrayBuffer(ham.length);
  const bayt = new Uint8Array(arabellek);
  for (let i = 0; i < ham.length; i += 1) bayt[i] = ham.charCodeAt(i);
  return arabellek;
}

export default function DenetimFormlariIstemci({ satirlar, sablonlar, kisitliKapsam }: {
  satirlar: FormSatiriOzeti[];
  sablonlar: SablonOzeti[];
  kisitliKapsam: boolean;
}) {
  const [secim, setSecim] = useState<string | null>(null);
  const [tur, setTur] = useState<string>('oz_denetim');
  const [uretim, setUretim] = useState<Uretim | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  const secilen = satirlar.find((s) => s.anahtar === secim) ?? null;
  const kusurlu = satirlar.filter((s) => s.gerekcesizKapsamDisi > 0).length;

  /* Form türü seçenekleri TEK LİSTEDİR: çekirdeğin iki formu ve kurulu
     paket şablonları yan yana durur. Şablonları ayrı bir ekrana ya da ayrı
     bir sekmeye koymak, kullanıcıyı aynı işi yapmak için iki yere
     bakmaya zorlardı — seçim aynı çekmecede, aynı adımda kalır.
     Tanımı okunamayan şablon SEÇİLEMEZ ama listede durur ve neden
     seçilemediğini söyler. */
  const secenekler = [
    ...FORM_TURLERI.map((t) => ({
      deger: t as string, ad: FORM_TURU_ADI[t], not: null as string | null,
      kusur: false, secilebilir: true,
    })),
    ...sablonlar.map((sb) => ({
      deger: `${SABLON_ONEKI}${sb.kod}`,
      ad: sb.ad,
      not: sb.okunamadi
        ? 'Şablon tanımı okunamadı — paket yeniden kurulmalı'
        : `${sb.sektorAd ?? 'sektörsüz'} paketi · ${sb.alan} alan`
          + (sb.baglanmadi > 0 ? ` · ${sb.baglanmadi} alan kuruluma bağlanmadı` : ''),
      kusur: sb.okunamadi || sb.baglanmadi > 0,
      secilebilir: !sb.okunamadi,
    })),
  ];
  const secilenTurAdi = secenekler.find((o) => o.deger === tur)?.ad ?? tur;

  const tabloSatirlari: Satir[] = satirlar.map((s) => {
    const durum: Durum = s.gerekcesizKapsamDisi > 0 ? 'bd'
      : s.degerlendirilmedi > 0 ? 'unk' : 'ok';
    return {
      id: s.anahtar,
      durum,
      kenar: s.gerekcesizKapsamDisi > 0 ? 'bd' : undefined,
      konu: s.kapsamAd,
      alt: `${s.regulasyonKod} — ${s.regulasyonAd}`,
      hucreler: [
        <span key="m" className="mono">{s.madde}</span>,
        <Kesir key="kd" pay={s.kapsamDisi} payda={s.madde} />,
        /* Sıfır burada İYİ HABERDİR ve öyle okunmalı; sıfırdan büyük olan
           sayı denetçinin soracağı sorunun ta kendisidir. */
        <span key="g" className={`mono${s.gerekcesizKapsamDisi > 0 ? ' d-bd' : ''}`}>
          {s.gerekcesizKapsamDisi}
        </span>,
        <span key="d" className={`mono${s.degerlendirilmedi > 0 ? ' d-unk' : ''}`}>
          {s.degerlendirilmedi}
        </span>,
      ],
    };
  });

  const uret = () => {
    if (!secilen) return;
    setHata(null);
    basla(async () => {
      const sonuc = await denetimFormuUretEylem({
        regulasyonId: secilen.regulasyonId,
        tesisIdleri: [secilen.tesisId],
        tur,
      });
      if (!sonuc.ok) { setHata(sonuc.hata); setUretim(null); return; }
      indir(sonuc.csvAdi, sonuc.csv, 'text/csv;charset=utf-8');
      indir(sonuc.xlsxAdi, ikiliye(sonuc.xlsxBase64),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      setUretim({
        turAdi: secilenTurAdi,
        csvAdi: sonuc.csvAdi,
        xlsxAdi: sonuc.xlsxAdi,
        satir: sonuc.olcum.satir,
        hucre: sonuc.olcum.hucre,
        bosHucre: sonuc.olcum.bosHucre,
        olculmedi: sonuc.olcum.olculmedi,
        gerekcesizKapsamDisi: sonuc.olcum.gerekcesizKapsamDisi,
      });
    });
  };

  return (
    <>
      <main className="ab-canvas">
        <EkranBasligi
          eyebrow="Rapor"
          baslik="Denetim formları"
          vurgu={kusurlu > 0 ? `${kusurlu} kapsamda gerekçesiz kapsam dışı var` : undefined}
          vurguDurumu={kusurlu > 0 ? 'bd' : undefined}
          metrikler={[
            { deger: satirlar.length, yazi: 'Kapsam × çerçeve' },
            { deger: kusurlu, yazi: 'Gerekçesiz kapsam dışı',
              durum: kusurlu > 0 ? 'bd' : undefined },
          ]}
        />

        <section className="ab-modul">
          {satirlar.length === 0 ? (
            /* Boş hâl "ne oldu" ile yetinmez, "ne yapabilirim" der. İki
               sebep AYRI: yetki kapsamı boş olmak ile kurulumda hiç
               kontrol olmamak farklı şeylerdir ve farklı adım ister. */
            <BosIlk
              cumle={kisitliKapsam
                ? 'Yetkinizin kapsamında bu çerçevelere ait kontrol kaydı yok.'
                  + ' Kapsamınızda hangi süreçlerin tanımlı olduğunu uyum'
                  + ' süreçleri ekranından görebilirsiniz.'
                : 'Henüz hiçbir kapsamda kontrol kaydı yok. Form üretilebilmesi'
                  + ' için önce bir çerçeve kurulmalı ve kapsam tanımlanmalı.'}
              eylem={
                <Link href="/surecler" className="ab-dugme">Uyum süreçleri</Link>
              } />
          ) : (
            <Tablo
              konuBasligi="Kapsam"
              kolonlar={[
                { baslik: 'Kontrol', genislik: '80px', sag: true },
                { baslik: 'Kapsam dışı', genislik: '110px', sag: true },
                { baslik: 'Gerekçesiz', genislik: '100px', sag: true },
                { baslik: 'Değerlendirilmedi', genislik: '140px', sag: true, ikincil: true },
              ]}
              satirlar={tabloSatirlari}
              secili={secim}
              sec={(id) => { setSecim(id); setUretim(null); setHata(null); }}
              yukseklik={`${GORUNUR_SATIR}`}
              dipNot={'Gerekçesiz kapsam dışı, denetçinin ilk sorusudur:'
                + ' kontrol kapsam dışı bırakılmış ama sebebi yazılmamış.'
                + ' Form o hücreyi boş bırakmaz, KUSUR olarak yazar.'}
            />
          )}
        </section>
      </main>

      {secilen && (
        <Cekmece kod={secilen.regulasyonKod} etiket="Denetim formu"
          ad={secilen.kapsamAd} kapat={() => setSecim(null)}>
          <CekmeceKimlik
            durum={secilen.gerekcesizKapsamDisi > 0 ? 'bd' : 'ok'}
            soz={secilen.gerekcesizKapsamDisi > 0 ? 'gerekçe eksik' : 'gerekçeler tam'}
            baslik={secilen.kapsamAd}
            cumle={`${secilen.regulasyonKod} — ${secilen.regulasyonAd}`}
          />
          <CekmeceAlanlar alanlar={[
            { etiket: 'Kontrol', deger: <span className="mono">{secilen.madde}</span> },
            { etiket: 'Kapsam dışı',
              deger: <Kesir pay={secilen.kapsamDisi} payda={secilen.madde} /> },
            { etiket: 'Gerekçesiz kapsam dışı',
              deger: <span className="mono">{secilen.gerekcesizKapsamDisi}</span>,
              durum: secilen.gerekcesizKapsamDisi > 0 ? 'bd' : 'ok' },
            { etiket: 'Değerlendirilmedi',
              deger: <span className="mono">{secilen.degerlendirilmedi}</span>,
              durum: secilen.degerlendirilmedi > 0 ? 'unk' : 'ok' },
          ]} />

          <fieldset className="ab-alan" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="etiket">Form türü</legend>
            {secenekler.map((o) => (
              <label key={o.deger} style={{ display: 'block' }}>
                <input type="radio" name="formTuru" value={o.deger} checked={tur === o.deger}
                  disabled={!o.secilebilir}
                  onChange={() => { setTur(o.deger); setUretim(null); }} />
                {' '}{o.ad}
                {o.not && (
                  /* Şablonun kusuru ÜRETİMDEN ÖNCE, seçeneğin yanında
                     durur: "kaç alan kuruluma bağlanmadı" sorusu, form
                     denetçiye gittikten sonra sorulacak bir soru değildir. */
                  <span className={`ikincil${o.kusur ? ' d-bd' : ''}`}> — {o.not}</span>
                )}
              </label>
            ))}
          </fieldset>

          {hata && <p className="hata" role="alert">{hata}</p>}

          {uretim && (
            /* ÜRETİMİN ÖLÇÜMÜ EKRANDA KALIR. "Boş hücre 0" bu ürünün
               denetçiye verdiği bir iddiadır; iddianın kendisi
               görülebilmelidir. Ölçülmemiş hücre sayısı da gizlenmez —
               bilinmeyen sıfır sayılmaz. */
            <CekmeceAlanlar alanlar={[
              { etiket: 'Üretilen', deger: uretim.turAdi },
              { etiket: 'Satır · hücre',
                deger: <span className="mono">{uretim.satir} · {uretim.hucre}</span> },
              { etiket: 'Boş hücre', deger: <span className="mono">{uretim.bosHucre}</span>,
                durum: uretim.bosHucre === 0 ? 'ok' : 'bd' },
              { etiket: 'Değerlendirilmedi (hücre)',
                deger: <span className="mono">{uretim.olculmedi}</span>,
                durum: uretim.olculmedi > 0 ? 'unk' : 'ok' },
              { etiket: 'İnen dosya',
                deger: <span className="mono">{uretim.csvAdi} · {uretim.xlsxAdi}</span> },
            ]} />
          )}

          <CekmeceEylemler
            birincil={
              <Dugme tur="birincil" onClick={uret} disabled={bekliyor}>
                {bekliyor ? 'Üretiliyor…' : 'Formu üret ve indir'}
              </Dugme>
            }
            dipNot={'Form iki biçimde birden iner: CSV ve XLSX.'
              + ' Üretim denetim izine yazılır — kim, ne zaman, hangi kapsam için.'}
          />
        </Cekmece>
      )}
    </>
  );
}

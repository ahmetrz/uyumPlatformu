'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BosIlk, BosFiltre, Dugme, Kesir } from '@/components/abacus/temel';
import { Tablo, type Kolon, type Satir } from '@/components/abacus/tablo';
import { EkranBasligi, Filtreler } from '@/components/abacus/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/abacus/panel';
import { tarihTR } from '@/lib/sabitler';
import { AsamaEylemleri, DegisiklikFormu, KapiListesi, OlayBagi } from './Formlar';
import {
  ASAMALAR, GORUNUR_BUTCE, MERCEKLER,
  altSatir, asamaEtiketi, asamaIndeksi, baslikMetni, bolumle, degisiklikImi,
  dipNot, gecikmeGunu, kapiHucresi, kimlikCumlesi, kimlikSozu,
  metrikleriHesapla, mercekten, santralMetni, sirala,
  type D, type Kodlu, type Mercek, type OlayAdayi,
} from './mantik';

/* O · Değişiklik yönetimi — "hangi değişiklik emniyet kanıtını taşımıyor?"
   Tek canvas modülü: önceliğe göre sıralı değişiklik tablosu. Durum sözcüğü
   canvasta geçmez; işaretçi emniyetli ilerleyip ilerlemediğini söyler,
   "Aşama" kolonu yaşam döngüsündeki yeri yazar — ikisi farklı şeydir.
   Detay modalda değil 420px çekmecede açılır (06 §B4).

   Yedekleme, kimlik ve tedarikçi sekmeleri bu ekranda YOKTUR; gerekçesi
   mantik.ts başındaki notta. */

const KOLONLAR: Kolon[] = [
  { baslik: 'Aşama', genislik: '104px' },
  { baslik: 'Kapı', genislik: '72px', sag: true },
  { baslik: 'Plan', genislik: '108px', sag: true },
  { baslik: 'Santral', genislik: '150px', ikincil: true },
];

type Kip = 'ozet' | 'form';

export default function OperasyonIstemci({
  degisiklikler, tesisler, olaylar, simdi, yazabilir,
}: {
  degisiklikler: D[]; tesisler: Kodlu[]; olaylar: OlayAdayi[];
  simdi: number; yazabilir: boolean;
}) {
  const [mercek, setMercek] = useState<Mercek>('acik');
  const [tesisF, setTesisF] = useState<string | null>(null);
  const [tipF, setTipF] = useState<string | null>(null);
  const [secili, setSecili] = useState<string | null>(null);
  const [kip, setKip] = useState<Kip>('ozet');
  const [yeniAcik, setYeniAcik] = useState(false);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  /* Metrikler filtreden BAĞIMSIZ: kütüğün tamamını anlatır (06 §A2). */
  const m = useMemo(() => metrikleriHesapla(degisiklikler, simdi), [degisiklikler, simdi]);

  const suzulmus = useMemo(() => sirala(degisiklikler.filter((d) => {
    if (!mercekten(d, mercek)) return false;
    if (tesisF && d.tesis?.id !== tesisF) return false;
    if (tipF === 'ot' && !d.otMu) return false;
    if (tipF === 'bt' && d.otMu) return false;
    return true;
  }), simdi), [degisiklikler, mercek, tesisF, tipF, simdi]);

  const { gorunur, toplanan } = useMemo(
    () => bolumle(suzulmus, kuyrukAcik, GORUNUR_BUTCE), [suzulmus, kuyrukAcik]);

  const secilen = degisiklikler.find((d) => d.id === secili) ?? null;
  const filtreAktif = mercek !== 'acik' || tesisF !== null || tipF !== null;

  const satirlar: Satir[] = gorunur.map((d) => {
    const im = degisiklikImi(d, simdi);
    const kapi = kapiHucresi(d);
    const gec = gecikmeGunu(d, simdi);
    return {
      id: d.id,
      durum: im,
      kenar: im,
      konu: d.baslik,
      alt: altSatir(d),
      hucreler: [
        asamaEtiketi(d.durum),
        kapi
          ? <Kesir key="k" pay={kapi.pay} payda={kapi.payda} />
          : <Bos key="k" />,
        <span key="p" style={gec !== null ? { color: 'var(--bd)', fontWeight: 600 }
          : !d.planTarihi ? { color: 'var(--i3)' } : undefined}>
          {gec !== null ? `+${gec} gün` : d.planTarihi ? tarihTR(d.planTarihi) : 'tarih yok'}
        </span>,
        santralMetni(d),
      ],
    };
  });

  const bas = baslikMetni(m);

  function sec(id: string) {
    setSecili((o) => (o === id ? null : id));
    setKip('ozet');
    setYeniAcik(false);
  }

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Değişiklik yönetimi · ${m.toplam} kayıt · ${m.otAcik} açık OT`}
          vurgu={bas.vurgu}
          vurguDurumu={bas.durum}
          baslik={bas.ad}
          metrikler={[
            { deger: m.gecikmis, yazi: 'Plan aşıldı', durum: m.gecikmis > 0 ? 'bd' : undefined },
            { deger: m.kapiEksik, yazi: 'Kapı eksik', durum: m.kapiEksik > 0 ? 'md' : undefined },
            { deger: m.dogrulamaBekleyen, yazi: 'Doğrulama bekliyor',
              durum: m.dogrulamaBekleyen > 0 ? 'md' : undefined },
            // Bilinmeyen ≠ sıfır: takvimi hiç girilmemiş kayıt "zamanında" değildir.
            { deger: m.planTarihsiz, yazi: 'Plan tarihi yok',
              durum: m.planTarihsiz > 0 ? 'unk' : undefined },
          ]}
        />

        <section className="ab-ekran-govde">
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id as Mercek); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Kapsam etiket="Santral" aktif={tesisF}
                  sec={(id) => { setTesisF(id); setKuyrukAcik(false); }}
                  secenekler={tesisler.map((t) => ({ id: t.id, ad: t.ad }))} />
                <Kapsam etiket="Tip" aktif={tipF}
                  sec={(id) => { setTipF(id); setKuyrukAcik(false); }}
                  secenekler={[{ id: 'ot', ad: 'OT' }, { id: 'bt', ad: 'BT' }]} />
                {yazabilir && (
                  <button type="button" className="ab-dugme"
                    onClick={() => { setYeniAcik(true); setSecili(null); }}>
                    + Yeni değişiklik
                  </button>
                )}
              </>
            }
          />

          {gorunur.length > 0 || toplanan.length > 0 ? (
            <div style={{ marginTop: 'var(--s26)' }}>
              <Tablo
                konuBasligi="Değişiklik"
                kolonlar={KOLONLAR}
                satirlar={satirlar}
                secili={secili}
                sec={sec}
                kuyruk={toplanan.length > 0
                  ? { metin: `+${toplanan.length} doğrulanarak kapanmış değişiklik`,
                    ac: () => setKuyrukAcik(true) }
                  : null}
                dipNot={dipNot(gorunur.length, m, mercek)}
              />
            </div>
          ) : filtreAktif ? (
            <BosFiltre temizle={() => { setMercek('acik'); setTesisF(null); setTipF(null); }} />
          ) : (
            <div style={{ marginTop: 'var(--s26)' }}>
              <BosIlk
                cumle="Değişiklik kütüğünde kayıt yok."
                eylem={yazabilir
                  ? <Dugme tur="birincil" onClick={() => setYeniAcik(true)}>
                    Değişiklik talebi aç
                  </Dugme>
                  : undefined}
              />
            </div>
          )}
        </section>
      </main>

      {secilen && (
        <Cekmece kod={secilen.kod} kapat={() => { setSecili(null); setKip('ozet'); }}>
          {kip === 'ozet' ? (
            <Ozet d={secilen} olaylar={olaylar} simdi={simdi}
              duzenle={() => setKip('form')} />
          ) : (
            <>
              <div className="ab-panel-blok">
                <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Değişikliği düzenle</p>
              </div>
              <div className="ab-panel-blok">
                <DegisiklikFormu degisiklik={secilen} tesisler={tesisler}
                  kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
        </Cekmece>
      )}

      {yeniAcik && !secilen && (
        <Cekmece kod="Yeni değişiklik" kapat={() => setYeniAcik(false)}>
          <div className="ab-panel-blok">
            <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Değişiklik talebi</p>
          </div>
          <div className="ab-panel-blok">
            <DegisiklikFormu degisiklik={null} tesisler={tesisler}
              kapat={() => setYeniAcik(false)} />
          </div>
        </Cekmece>
      )}
    </>
  );
}

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

/* ── Çekmece özeti ──────────────────────────────────────────────────── */

function Ozet({ d, olaylar, simdi, duzenle }: {
  d: D; olaylar: OlayAdayi[]; simdi: number; duzenle: () => void;
}) {
  const im = degisiklikImi(d, simdi);
  const ix = asamaIndeksi(d.durum);

  /* Zincir değişikliğin dokunduğu kayıtları anlatır: doğurduğu ya da
     kapattığı olaylar. Olmayan halka uydurulmaz. */
  const zincir = d.olaylar;

  return (
    <>
      <CekmeceKimlik durum={im} soz={kimlikSozu(d, simdi)} baslik={d.baslik}
        cumle={kimlikCumlesi(d, simdi)} />

      <AsamaSeridi d={d} ix={ix} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Tip', deger: d.otMu ? 'OT değişikliği' : 'BT değişikliği' },
        {
          etiket: 'Kapsam',
          deger: `${santralMetni(d)}${d.varlikEtiketi ? ` · ${d.varlikEtiketi}` : ''}`,
        },
        {
          etiket: 'Plan tarihi',
          deger: d.planTarihi ? tarihTR(d.planTarihi) : 'girilmedi',
          durum: gecikmeGunu(d, simdi) !== null ? 'bd' : d.planTarihi ? undefined : 'unk',
        },
        { etiket: 'Talep eden', deger: d.talepEden ?? 'kayıtta yok',
          durum: d.talepEden ? undefined : 'unk' },
        { etiket: 'Onaylayan', deger: d.onaylayan ?? 'onay adımına gelmedi',
          durum: d.onaylayan ? undefined : 'unk' },
      ]} />

      <KapiListesi d={d} />

      {zincir.length > 0 && <CekmeceBagli baslik="Bağlı olaylar" kayitlar={zincir} />}

      <OlayBagi d={d} adaylar={olaylar} />

      <AsamaEylemleri d={d} />

      <CekmeceEylemler
        ikincil={d.yazilabilir
          ? <Dugme onClick={duzenle}>Kaydı düzenle</Dugme>
          : undefined}
        // Aşama sayısı yukarıdaki şeritte zaten yazılı; burada tekrar edilmez.
        dipNot={`Açılış ${tarihTR(d.olusturuldu)}`
          + (d.yazilabilir ? '' : ' · bu kaydın kapsamında yazma yetkiniz yok')}
      />
    </>
  );
}

/* ── Yaşam döngüsü şeridi ───────────────────────────────────────────────
   `Asamalar` primitifi BEŞ eşit sütunu yan yana dizer ve kayıt EKRANI için
   tasarlanmıştır: 420px çekmecede sütun başına ~45px metin kalıyor,
   "Doğrulandı" sığmıyor ve şerit çekmecenin kenarından taşıyordu — kritik
   bilgi kırpılmış oluyordu. Aynı sıra burada dikey okunur; primitif
   olduğu gibi durur, kayıt ekranı doğduğunda oraya geri gelir.

   Geri alınmış kayıt döngünün DIŞINA çıkmıştır: hiçbir adım "şimdi"
   işaretlenmez, çünkü kayıt hiçbir adımda beklemiyor. */

function AsamaSeridi({ d, ix }: { d: D; ix: number }) {
  const tarihi = (a: string) =>
    (a === 'talep' ? tarihTR(d.olusturuldu)
      : a === 'planlandi' && d.planTarihi ? tarihTR(d.planTarihi) : null);

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s22)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Yaşam döngüsü · {ix >= 0 ? `${ix + 1}/${ASAMALAR.length}` : 'döngü dışı'}
      </p>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none',
        display: 'grid', gap: 'var(--s6)' }}>
        {ASAMALAR.map((a, i) => {
          const gecti = ix >= 0 && i < ix;
          const simdiki = i === ix;
          const t = tarihi(a);
          return (
            <li key={a}
              {...(simdiki ? { 'aria-current': 'step' as const } : {})}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 'var(--s10)',
                padding: 'var(--s4) 0 var(--s4) var(--s12)',
                borderLeft: `var(--bw-edge) solid ${simdiki ? 'var(--aksan)'
                  : gecti ? 'var(--ok)' : 'var(--hr2)'}`,
                fontSize: 'var(--t-field)',
                fontWeight: simdiki ? 600 : 400,
                color: simdiki ? 'var(--murekkep)' : gecti ? 'var(--i2)' : 'var(--i3)',
              }}>
              <span>{asamaEtiketi(a)}</span>
              {t && (
                <span className="mono" style={{ marginLeft: 'auto',
                  fontSize: 'var(--t-label)', color: 'var(--i3)' }}>{t}</span>
              )}
            </li>
          );
        })}
      </ol>
      {d.durum === 'geri_alindi' && (
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
          Kayıt geri alındı; döngüde beklediği bir adım yok.
        </p>
      )}
    </div>
  );
}

/* ── Kapsam kontrolü (SANTRAL ▾ / TİP ▾) ────────────────────────────────
   Kutu yok, kenarlık yok: 9.5px mono açılır liste (02-components §4). */

function Kapsam({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  const secim = secenekler.find((s) => s.id === aktif);
  const kok = useRef<HTMLDetailsElement | null>(null);

  // Açık kalan bir menü altındaki tabloyu örter: dışarı tık ve Esc kapatır.
  useEffect(() => {
    const kapat = (e: Event) => {
      const el = kok.current;
      if (!el?.open) return;
      if (e.type === 'keydown') {
        if ((e as KeyboardEvent).key === 'Escape') el.open = false;
        return;
      }
      if (!el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener('mousedown', kapat);
    document.addEventListener('keydown', kapat);
    return () => {
      document.removeEventListener('mousedown', kapat);
      document.removeEventListener('keydown', kapat);
    };
  }, []);

  return (
    <details ref={kok} style={{ position: 'relative' }}>
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 200,
        maxHeight: 300, overflowY: 'auto', background: 'var(--panel)',
        border: 'var(--bw-strong) solid var(--hr2)', boxShadow: 'none',
        padding: 'var(--s8)',
      }}>
        {[{ id: '', ad: 'Tümü' }, ...secenekler].map((s) => (
          <button key={s.id} type="button" className="ab-filtre"
            style={{ display: 'block', width: '100%', textAlign: 'left' }}
            aria-pressed={(aktif ?? '') === s.id}
            onClick={(e) => {
              sec(s.id === '' ? null : s.id);
              e.currentTarget.closest('details')?.removeAttribute('open');
            }}>
            {s.ad}
          </button>
        ))}
      </div>
    </details>
  );
}

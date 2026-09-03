'use client';
import { useMemo, useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import { Im, Metrikler, BosIlk, BosFiltre, Dugme, type Durum } from '@/components/kabuk/temel';
import { Filtreler } from '@/components/kabuk/ekran';
import { VeriTablosu, type VtKolon } from '@/components/kabuk/tablo';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { tarihTR } from '@/lib/sabitler';
import { IncelemeEylemleri } from './Inceleme';
import {
  ATIL_ESIK, DURUM_SOZU_HESAP, SONUC_ETIKET, TIP_ETIKET, YETKI_ETIKET,
  acikYetkiler, altSatir, atilYonetici, baslikMetni, grupAltSatiri, grupCumlesi,
  gruplandir, gunFarki, hesapDurumu, kapsamMetni, kapsamda, kullanimHucresi,
  metrikleriHesapla, nedenCumlesi, oncekiMetin, rotasyonsuzServis, sahipHucresi, sahipsiz,
  satirDurumu, sirala, toplanabilir, verilisYolu,
  type Hesap, type TabloSatiri, type Yetki,
} from './mantik';

/* O15 · Identity & Access Review — "kimin fazla yetkisi var?"

   Kütük `VeriTablosu` çekirdeğinde: önek grubu ve açık grubun üye
   hesapları TEK düz listeye indirilir; grup satırı aria-expanded taşır,
   üye satırı kimlik hücresinde girintilidir. Zebra yok, satır içi eylem
   yok, sarmalayıcı kart yok.

   Sıralama: ayrıcalıklı / atıl / sahipsiz üstte; sağlıklı hesaplar tek
   kuyruk satırında toplanır. Kritik satır ASLA toplanmaz. */

/** tablo satırı: grup, açık grubun üyesi ya da tekil hesap */
type DuzSatir = { id: string; satir: TabloSatiri; uye: boolean; acik: boolean };

const KOLONLAR: VtKolon<DuzSatir>[] = [
  {
    anahtar: 'hesap', baslik: 'Hesap',
    hucre: ({ satir, uye }) => {
      const grup = satir.tur === 'grup';
      return (
        <span className="kimlik" style={uye ? { paddingLeft: 'var(--s22)' } : undefined}>
          <Im durum={satirDurumu(satir)} />
          <span className="konu">
            {baslikMetni(satir)}
            {grup && <span className="mono ek"> · {satir.hesaplar.length} hesap</span>}
            <span className="alt">
              {grup ? grupAltSatiri(satir.hesaplar) : altSatir(satir.hesaplar[0])}
            </span>
          </span>
        </span>
      );
    },
  },
  {
    anahtar: 'kapsam', baslik: 'Kapsam', ikincil: true, genislik: '170px',
    hucre: ({ satir }) => kapsamMetni(satir.hesaplar),
  },
  {
    anahtar: 'kullanim', baslik: 'Son kullanım', genislik: '160px',
    hucre: ({ satir }) => <DurumluHucre {...kullanimHucresi(satir.hesaplar)} />,
  },
  {
    anahtar: 'sahip', baslik: 'Sahip', genislik: '140px',
    hucre: ({ satir }) => <DurumluHucre {...sahipHucresi(satir.hesaplar)} />,
  },
];

const UYE_LISTE_BUTCESI = 10;

const MERCEKLER = [
  { id: 'hepsi', ad: 'Tümü' },
  { id: 'ayricalikli', ad: 'Ayrıcalıklı' },
  { id: 'rotasyonsuz', ad: 'Rotasyonsuz' },
  { id: 'atil', ad: 'Atıl' },
  { id: 'sahipsiz', ad: 'Sahipsiz' },
];

export default function KimlikIstemci({ hesaplar, tesisler, kaynaklar, kapsamli = false }: {
  hesaplar: Hesap[];
  tesisler: { id: string; ad: string }[];
  kaynaklar: string[];
  /** liste bir santral kapsamıyla daraltıldı mı — boş ekranın SÖZÜ değişir */
  kapsamli?: boolean;
}) {
  const [mercek, setMercek] = useUrlDurumu<string>('mercek', 'hepsi');
  const [tesisF, setTesisF] = useUrlDurumuBos('tesis');
  const [kaynakF, setKaynakF] = useUrlDurumuBos('kaynak');
  const [seciliId, setSeciliId] = useUrlDurumuBos('sec');
  const [acikGruplar, setAcikGruplar] = useState<string[]>([]);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [yetkiSecimi, setYetkiSecimi] = useState<string | null>(null);

  /* ── metrikler: filtrelerden BAĞIMSIZ, kapsamın tamamı ─────────────── */
  const m = useMemo(() => metrikleriHesapla(hesaplar), [hesaplar]);

  /* ── mercek + kapsam ───────────────────────────────────────────────── */
  const suzulmus = useMemo(() => hesaplar.filter((h) => {
    if (!kapsamda(h)) return false;
    if (mercek === 'ayricalikli' && !h.ayricalikli) return false;
    if (mercek === 'rotasyonsuz' && !rotasyonsuzServis(h)) return false;
    if (mercek === 'atil' && !atilYonetici(h)) return false;
    if (mercek === 'sahipsiz' && !sahipsiz(h)) return false;
    if (tesisF && h.tesisId !== tesisF) return false;
    if (kaynakF && h.kaynakSistem !== kaynakF) return false;
    return true;
  }), [hesaplar, mercek, tesisF, kaynakF]);

  const sirali = useMemo(() => sirala(gruplandir(suzulmus)), [suzulmus]);

  /* İncelemesi biten satırlar tek kuyruk satırına iner; kritik/kısmi satır
     sıralamadan ve sayıdan bağımsız görünür kalır (06 §A3). */
  const one = sirali.filter((s) => !toplanabilir(s));
  const sakin = sirali.filter(toplanabilir);
  const gosterilen = kuyrukAcik ? [...one, ...sakin] : one;
  const toplananHesap = kuyrukAcik ? 0 : sakin.reduce((a, s) => a + s.hesaplar.length, 0);

  /* Grup + açık grubun üyeleri tek düz listeye iner (tablo çekirdeği düz
     satır bekler; girinti ve aria-expanded satır verisinden türetilir). */
  const duzSatirlar: DuzSatir[] = gosterilen.flatMap((s) => {
    const acik = s.tur === 'grup' && acikGruplar.includes(s.onek);
    return [
      { id: s.id, satir: s, uye: false, acik },
      ...(acik && s.tur === 'grup'
        ? s.hesaplar.map((u): DuzSatir => ({
          id: u.id, satir: { tur: 'hesap', id: u.id, hesaplar: [u] }, uye: true, acik: false,
        }))
        : []),
    ];
  });

  /* ── seçim ─────────────────────────────────────────────────────────── */
  const seciliHesap = seciliId ? hesaplar.find((h) => h.id === seciliId) ?? null : null;
  const seciliGrup = seciliId?.startsWith('grp:')
    ? sirali.find((s): s is Extract<TabloSatiri, { tur: 'grup' }> =>
      s.tur === 'grup' && s.id === seciliId) ?? null
    : null;

  const seciliYetki: Yetki | null = seciliHesap
    ? seciliHesap.yetkiler.find((y) => y.id === yetkiSecimi)
      ?? acikYetkiler(seciliHesap)[0]
      ?? seciliHesap.yetkiler[0]
      ?? null
    : null;

  function hesapSec(id: string) {
    setSeciliId(id);
    setYetkiSecimi(null);
  }

  function grupTikla(satir: Extract<TabloSatiri, { tur: 'grup' }>) {
    setAcikGruplar((eski) => {
      const acik = eski.includes(satir.onek);
      if (acik && seciliId === satir.id) return eski.filter((o) => o !== satir.onek);
      return acik ? eski : [...eski, satir.onek];
    });
    setSeciliId(satir.id);
    setYetkiSecimi(null);
  }

  function filtreleriTemizle() {
    setMercek('hepsi');
    setTesisF(null);
    setKaynakF(null);
  }

  const filtreAktif = mercek !== 'hepsi' || tesisF !== null || kaynakF !== null;
  const gecikmeVar = m.gecikmeGun !== null;

  /* ── başlık: gecikme varsa vurgu state/critical taşır, kapatılamaz ─── */
  const gecikmeDegeri = !m.ayricalikliAtamaVar ? '—' : `${m.gecikmeGun ?? 0}g`;

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        {/* EkranBasligi vurguya renk vermiyor; O15 sözleşmesi başlığın da
            state/critical taşımasını istiyor — aynı sınıflarla elde kuruldu. */}
        <header className="ab-lede">
          <div className="sol">
            <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
              Erişim incelemesi · {m.toplam} hesap
            </p>
            <h1 className="ab-ekran-basligi" style={{ margin: 0 }}>
              {m.toplam === 0 ? 'İnceleme kapsamında hesap yok'
                : m.mudahale > 0 ? (
                  <>
                    <b style={{ color: 'var(--bd)' }}>{m.mudahale} hesap</b> müdahale bekliyor
                  </>
                ) : (
                  <><b>{m.toplam} hesap</b> incelemeden geçti</>
                )}
            </h1>
          </div>
          <Metrikler metrikler={[
            {
              deger: m.rotasyonsuz, yazi: 'Rotasyonsuz servis',
              durum: m.rotasyonsuz > 0 ? 'bd' : undefined,
            },
            {
              deger: m.atil, yazi: 'Atıl yönetici',
              durum: m.atil > 0 ? 'bd' : undefined,
            },
            {
              deger: m.sahipsiz, yazi: 'Sahipsiz',
              durum: m.sahipsiz > 0 ? 'md' : undefined,
            },
            {
              deger: gecikmeDegeri, yazi: 'İnceleme gecikmesi',
              durum: gecikmeVar ? 'bd' : undefined,
            },
          ]} />
        </header>

        <section className="ab-ekran-govde">
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Kapsam etiket="Santral" aktif={tesisF} sec={setTesisF}
                  secenekler={tesisler.map((t) => ({ id: t.id, ad: t.ad }))} />
                <Kapsam etiket="Kaynak" aktif={kaynakF} sec={setKaynakF}
                  secenekler={kaynaklar.map((k) => ({ id: k, ad: k }))} />
              </>
            }
          />

          {gosterilen.length === 0 && toplananHesap === 0 ? (
            <BosDurum hicKayitYok={m.toplam === 0} kapsamli={kapsamli}
              filtreAktif={filtreAktif} temizle={filtreleriTemizle} />
          ) : (
            <div style={{ marginTop: 'var(--s22)', borderTop: 'var(--bw-strong) solid var(--hr2)' }}>
              <VeriTablosu<DuzSatir>
                etiket="Erişim incelemesi kütüğü"
                kolonlar={KOLONLAR}
                satirlar={duzSatirlar}
                secili={seciliId}
                sec={(id) => {
                  if (!id) { setSeciliId(null); return; }
                  const d = duzSatirlar.find((x) => x.id === id);
                  if (d?.satir.tur === 'grup') grupTikla(d.satir); else hesapSec(id);
                }}
                durum={(d) => satirDurumu(d.satir)}
                acik={(d) => (d.satir.tur === 'grup' ? d.acik : undefined)}
                bosCumle={null}
                kuyruk={toplananHesap > 0
                  ? { metin: `+${toplananHesap} hesap · inceleme tamam`, ac: () => setKuyrukAcik(true) }
                  : null}
                dipNot={
                  <>
                    {m.ayricalikliAtamaVar
                      ? `İnceleme gecikmesi ${m.bekleyenAtama} incelenmemiş ayrıcalıklı atamadan ölçüldü`
                      : 'Ayrıcalıklı atama yok — inceleme gecikmesi ölçülemiyor'}
                    {' · '}atıl eşiği {ATIL_ESIK} gün
                    {m.ayricalikOlculmedi > 0
                      && ` · ${m.ayricalikOlculmedi} hesabın ayrıcalık durumu kaynak sistemden gelmedi — ayrıcalıklı değil SAYILMADI`}
                    {kuyrukAcik && sakin.length > 0 && (
                      <>
                        {' · '}
                        <button type="button" className="ab-vt-dip-eylem"
                          onClick={() => setKuyrukAcik(false)}>Kuyruğu topla</button>
                      </>
                    )}
                  </>
                }
              />
            </div>
          )}
        </section>
      </main>

      {seciliHesap && (
        <Cekmece kod={seciliHesap.hesapAdi} kapat={() => setSeciliId(null)}>
          <HesapOzeti hesap={seciliHesap} yetki={seciliYetki} secYetki={setYetkiSecimi} />
        </Cekmece>
      )}

      {!seciliHesap && seciliGrup && (
        <Cekmece kod={seciliGrup.onek} kapat={() => setSeciliId(null)}>
          <GrupOzeti grup={seciliGrup} sec={hesapSec} />
        </Cekmece>
      )}
    </>
  );
}

/* ── durum renkli hücre ────────────────────────────────────────────────── */

function DurumluHucre({ metin, durum }: { metin: string; durum?: Durum }) {
  return <span style={durum ? { color: `var(--${durum})` } : undefined}>{metin}</span>;
}

/* ── kapsam kontrolü (SANTRAL ▾ / KAYNAK ▾) ────────────────────────────── */

function Kapsam({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  const secim = secenekler.find((s) => s.id === aktif);
  return (
    <details style={{ position: 'relative' }}>
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 210,
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

/* ── çekmece · hesap ───────────────────────────────────────────────────── */

function rotasyonAlani(h: Hesap) {
  if (h.parolaRotasyon) return { deger: oncekiMetin(gunFarki(h.parolaRotasyon)) };
  // Servis/paylaşımlı kimlikte rotasyon kaydının olmaması BİLİNMEYEN değil,
  // "hiç yapılmamış" olgusudur (§9 · EPDK-SYM-5.1.1 veri temeli).
  return h.tip === 'kisi'
    ? { deger: 'kayıt yok', durum: 'unk' as const }
    : { deger: 'hiç yapılmadı', durum: 'bd' as const };
}

function yetkiAltSatiri(y: Yetki): string {
  return [
    `${tarihTR(y.verilis)} verildi`,
    y.varlikEtiketi ?? 'varlık bağı yok',
    y.bitis ? `${tarihTR(y.bitis)} kaldırıldı`
      : y.sonInceleme
        ? `${SONUC_ETIKET[y.sonInceleme.sonuc] ?? y.sonInceleme.sonuc} · ${tarihTR(y.sonInceleme.zaman)}`
        : 'hiç incelenmedi',
  ].join(' · ');
}

function HesapOzeti({ hesap, yetki, secYetki }: {
  hesap: Hesap; yetki: Yetki | null; secYetki: (id: string) => void;
}) {
  const durum = hesapDurumu(hesap);
  const rotasyon = rotasyonAlani(hesap);
  const kullanim = gunFarki(hesap.sonKullanim);
  const acik = acikYetkiler(hesap);

  return (
    <>
      <CekmeceKimlik durum={durum} soz={DURUM_SOZU_HESAP[durum]}
        baslik={hesap.hesapAdi} cumle={nedenCumlesi(hesap)} />

      <CekmeceAlanlar alanlar={[
        {
          etiket: 'Tip',
          deger: `${TIP_ETIKET[hesap.tip] ?? hesap.tip}${hesap.ayricalikli ? ' · ayrıcalıklı' : ''}`,
          durum: hesap.ayricalikli ? 'bd' : undefined,
        },
        {
          etiket: 'Kaynak sistem',
          deger: hesap.kaynakSistem ?? '—',
          durum: hesap.kaynakSistem ? undefined : 'unk',
        },
        { etiket: 'Santral', deger: hesap.tesisAd ?? 'portföy' },
        { etiket: 'Parola rotasyonu', ...rotasyon },
        {
          etiket: 'Son kullanım',
          deger: oncekiMetin(kullanim),
          durum: kullanim === null ? 'unk' : kullanim > ATIL_ESIK ? 'bd' : undefined,
        },
        {
          etiket: 'Sahip',
          deger: hesap.sahip ?? 'atanmadı',
          durum: hesap.sahip ? undefined : 'md',
        },
      ]} />

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
          Yetkiler · {acik.length} açık
        </p>
        {hesap.yetkiler.length === 0 ? (
          <p className="ab-panel-dip" style={{ margin: 0 }}>Bu hesaba bağlı erişim ataması yok.</p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s3)' }}>
            {hesap.yetkiler.map((y) => {
              const secili = yetki?.id === y.id;
              return (
                <button key={y.id} type="button" aria-pressed={secili}
                  onClick={() => secYetki(y.id)}
                  style={{
                    display: 'grid', gap: 'var(--s4)', width: '100%', textAlign: 'left',
                    background: 'var(--panel)', font: 'inherit', color: 'inherit',
                    cursor: 'pointer', padding: 'var(--s12) var(--s14)',
                    border: `var(--bw-hair) solid ${secili ? 'var(--aksan)' : 'var(--hr2)'}`,
                    opacity: y.bitis ? 0.6 : 1,
                  }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)' }}>
                    <Im durum={y.bitis ? 'tamam' : y.sonInceleme ? 'ok' : 'bd'} />
                    <span style={{ fontSize: 'var(--t-cell)', fontWeight: 600 }}>
                      {y.kapsam ?? 'kapsam yazılmamış'}
                    </span>
                    <span style={{
                      marginLeft: 'auto', fontFamily: 'var(--veri)',
                      fontSize: 'var(--t-code)', color: 'var(--i3)',
                    }}>
                      {YETKI_ETIKET[y.yetkiSeviyesi ?? ''] ?? '—'}
                    </span>
                  </span>
                  <span style={{
                    fontFamily: 'var(--veri)', fontSize: 'var(--t-code)',
                    color: 'var(--i3)', lineHeight: 1.6,
                  }}>
                    {yetkiAltSatiri(y)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {yetki && (
          <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
            Veriliş yolu · {verilisYolu(hesap, yetki)}
          </p>
        )}
      </div>

      {hesap.bagli.length > 0 ? (
        <CekmeceBagli baslik="Bağlı kayıtlar" kayitlar={hesap.bagli} />
      ) : (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Bağlı kayıtlar</p>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Bu hesabın varlıkları ve santrali üzerinden açık risk ya da bulgu bağı kurulmadı.
          </p>
        </div>
      )}

      <IncelemeEylemleri hesap={hesap} yetki={yetki} />
    </>
  );
}

/* ── çekmece · önek grubu ──────────────────────────────────────────────── */

function GrupOzeti({ grup, sec }: {
  grup: Extract<TabloSatiri, { tur: 'grup' }>; sec: (id: string) => void;
}) {
  const durum = satirDurumu(grup);
  const uyeler = grup.hesaplar;
  const ayricalikli = uyeler.filter((h) => h.ayricalikli).length;
  const kaynak = [...new Set(uyeler.map((h) => h.kaynakSistem ?? 'kaynak yok'))];
  const kullanim = kullanimHucresi(uyeler);
  const sahip = sahipHucresi(uyeler);
  const gosterilen = uyeler.slice(0, UYE_LISTE_BUTCESI);

  return (
    <>
      <CekmeceKimlik durum={durum} soz={DURUM_SOZU_HESAP[durum]}
        baslik={grup.onek} cumle={grupCumlesi(grup.onek, uyeler)} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Hesap', deger: `${uyeler.length}` },
        {
          etiket: 'Ayrıcalıklı', deger: `${ayricalikli} / ${uyeler.length}`,
          durum: ayricalikli > 0 ? 'bd' : undefined,
        },
        { etiket: 'Kaynak sistem', deger: kaynak.join(' · ') },
        { etiket: 'Kapsam', deger: kapsamMetni(uyeler) },
        { etiket: 'En eski kullanım', deger: kullanim.metin, durum: kullanim.durum },
        { etiket: 'Sahip', deger: sahip.metin, durum: sahip.durum },
      ]} />

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Üye hesaplar</p>
        <div style={{ display: 'grid', gap: 'var(--s3)' }}>
          {gosterilen.map((u) => (
            <button key={u.id} type="button" onClick={() => sec(u.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--s10)', width: '100%',
                textAlign: 'left', background: 'var(--panel)', font: 'inherit', color: 'inherit',
                cursor: 'pointer', padding: 'var(--s12) var(--s14)',
                border: 'var(--bw-hair) solid var(--hr2)',
              }}>
              <Im durum={hesapDurumu(u)} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 'var(--t-cell)', fontWeight: 600 }}>
                  {u.hesapAdi}
                </span>
                <span style={{
                  display: 'block', marginTop: 2, fontFamily: 'var(--veri)',
                  fontSize: 'var(--t-label)', color: 'var(--i3)',
                }}>
                  {altSatir(u)}
                </span>
              </span>
              <span className="ab-ok" style={{ marginLeft: 'auto' }} aria-hidden>▸</span>
            </button>
          ))}
        </div>
        {uyeler.length > gosterilen.length && (
          <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
            +{uyeler.length - gosterilen.length} hesap daha — grup satırı açıldığında tabloda görünür.
          </p>
        )}
      </div>

      <CekmeceEylemler
        dipNot="İnceleme kararı atama düzeyinde verilir; karar için bir üye hesap seçin." />
    </>
  );
}

/* ── boş durumlar ──────────────────────────────────────────────────────── */

function BosDurum({ hicKayitYok, kapsamli, filtreAktif, temizle }: {
  hicKayitYok: boolean; kapsamli: boolean; filtreAktif: boolean; temizle: () => void;
}) {
  if (hicKayitYok) {
    /* "Hesap kaydı yok" ile "kapsamınızda hesap yok" AYNI ŞEY DEĞİLDİR. */
    return (
      <div style={{ marginTop: 'var(--s26)' }}>
        <BosIlk cumle={kapsamli
          ? 'Kapsamınızda hesap kaydı yok.'
          : 'İnceleme kapsamında hesap yok.'} />
      </div>
    );
  }
  if (filtreAktif) return <BosFiltre temizle={temizle} />;
  return (
    <div className="ab-blok" style={{ marginTop: 'var(--s26)' }}>
      <p className="cumle" style={{ marginTop: 0 }}>İnceleme kapsamında hesap yok.</p>
      <div className="eylem">
        <Dugme tur="birincil" onClick={temizle}>Kapsamı sıfırla</Dugme>
      </div>
    </div>
  );
}

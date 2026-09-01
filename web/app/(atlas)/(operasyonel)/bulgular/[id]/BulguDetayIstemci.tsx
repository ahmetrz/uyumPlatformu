'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Im, Ipucu, Dugme, Alan, BosIlk, Hata, type Durum,
} from '@/components/atlas/temel';
import { Tablo, type Satir } from '@/components/atlas/tablo';
import { EkranBasligi, Asamalar, KipDegistir } from '@/components/atlas/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/atlas/cekmece';
import { ZamanCizelgesi, type ZamanKarti } from '@/components/atlas/zaman';
import BaglamCubugu from '@/components/atlas/BaglamCubugu';
import { useEylem } from '@/components/useEylem';
import { bulguGuncelle, aksiyonEkle, aksiyonDurumDegistir, kanitEkle } from '@/lib/eylemler';
import {
  ONEM_DERECELERI, ONEM_ETIKET, BULGU_DURUMLARI, BULGU_DURUM_ETIKET,
  AKSIYON_DURUMLARI, AKSIYON_ETIKET, kanitTazelik, etiketle, eylemCumlesi, zamanTR,
} from '@/lib/sabitler';
import {
  aksiyonAcikMi, aksiyonDogrulamaHucresi, aksiyonImi, bugunAn, bulguImi,
  dogrulamaBekliyorMu, dogrulamaHucresi, gecikmeGunu,
  kisaTarih,
  surukleyenAksiyon,
  type AksiyonOzeti,
} from '../mantik';

export type Veri = {
  id: string; maddeDurumuId: string; baslik: string; aciklama: string;
  durum: string; onem: string; kaynak: string | null; kokNeden: string | null;
  tespit: string; hedef: string | null; kapanma: string | null;
  retestGerekli: boolean; retestSonucu: string | null;
  kapanisDogrulama: string | null; kapanisDogrulayan: string | null;
  sorumluId: string | null; sorumlu: string | null;
  madde: { kod: string; baslik: string; metin: string };
  tesis: { id: string; kod: string; ad: string; tip: string | null };
  surec: { id: string; kod: string; regKod: string };
  aksiyonlar: AksiyonOzeti[];
  projeler: { id: string; kod: string; ad: string }[];
  riskler: { id: string; kod: string; baslik: string }[];
  kanitlar: { id: string; ad: string; tip: string; baslangic: string }[];
  aktiviteler: {
    id: string; aktor: string; eylem: string; varlikTipi: string; alan: string | null;
    once: string | null; sonra: string | null; dosya: string | null; zaman: string;
  }[];
  kullanicilar: { id: string; ad: string }[];
};

const SOZ: Record<Durum, string> = {
  bd: 'Gecikmiş', md: 'Doğrulama bekliyor', ok: 'Zamanında',
  unk: 'Aksiyon yok', tamam: 'Kapandı', pl: 'Riski kabul edildi',
};

const ASAMALAR = ['Tespit', 'Aksiyon', 'Doğrulama', 'Kapanış'];
const KANIT_TIPLERI = ['politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor'];

export default function BulguDetayIstemci({ veri }: { veri: Veri }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [panel, setPanel] = useState(true);
  const [kip, setKip] = useState<'kayit' | 'iz'>('kayit');
  const [seciliAksiyon, setSeciliAksiyon] = useState<string | null>(null);
  const [aksiyonFormu, setAksiyonFormu] = useState(false);
  const [kanitFormu, setKanitFormu] = useState(false);
  const [yeniAksiyon, setYeniAksiyon] = useState({ baslik: '', sorumluId: '', hedef: '' });
  const [yeniKanit, setYeniKanit] = useState({ ad: '', tip: 'kayit' });

  const im = bulguImi(veri);
  const gecikme = gecikmeGunu(veri);
  const dogrulama = dogrulamaHucresi(veri);
  const biten = veri.aksiyonlar.filter((a) => a.durum === 'tamamlandi').length;
  const acikAksiyon = veri.aksiyonlar.filter(aksiyonAcikMi).length;
  const aksiyon = veri.aksiyonlar.find((a) => a.id === seciliAksiyon) ?? null;

  /* Aşama: bulgu → aksiyon → doğrulama → kapanış. Kayıt etiketinden DEĞİL,
     iş durumundan türer: aksiyon sürüyorsa "Aksiyon", bittiyse "Doğrulama".
     Beklemenin kendisi metrikle aynı yerden gelir (dogrulamaBekliyorMu). */
  const dogrulamaBekliyor = dogrulamaBekliyorMu(veri);
  const asamaIndeksi = veri.durum === 'kapali' ? 3
    : veri.aksiyonlar.length === 0 ? 0
      : acikAksiyon > 0 ? 1 : 2;

  const asamaTarihleri = [
    kisaTarih(veri.tespit),
    veri.aksiyonlar.length ? `${biten}/${veri.aksiyonlar.length}` : undefined,
    dogrulamaBekliyor || dogrulama.im ? dogrulama.soz : undefined,
    veri.kapanma ? kisaTarih(veri.kapanma) : veri.hedef ? kisaTarih(veri.hedef) : undefined,
  ];

  const kartlar = useMemo(() => zamanKartlari(veri), [veri]);

  const satirlar: Satir[] = veri.aksiyonlar.map((a) => ({
    id: a.id,
    durum: aksiyonImi(a),
    kenar: aksiyonImi(a),
    konu: a.baslik,
    alt: a.tamamlanma ? `bitti ${kisaTarih(a.tamamlanma)}`
      : a.hedef ? `hedef ${kisaTarih(a.hedef)}` : 'termin yok',
    hucreler: [
      a.sorumlu ?? <span key="s" style={{ color: 'var(--i3)' }}>—</span>,
      a.hedef ? kisaTarih(a.hedef) : <span key="h" style={{ color: 'var(--i3)' }}>—</span>,
      <DogrulamaHucresi key="d" hucre={aksiyonDogrulamaHucresi(a)} />,
    ],
  }));

  function guncelle(alan: 'durum' | 'onemDerecesi' | 'sorumluId' | 'hedefTarih', deger: string) {
    calistir(() => bulguGuncelle({
      id: veri.id,
      ...(alan === 'sorumluId' ? { sorumluId: deger || null } : { [alan]: deger }),
    }));
  }

  return (
    <>
      <main style={{ minWidth: 0 }}>
        <BaglamCubugu
          kirintiler={[
            { ad: 'Bulgu & CAPA', yol: '/bulgular' },
            { ad: veri.tesis.kod, yol: `/tesisler/${veri.tesis.id}` },
            { ad: veri.madde.kod },
          ]}
          sag={
            <>
              <Link href={`/surecler/${veri.surec.id}`} className="dg dg-satir">
                {veri.surec.regKod} · {veri.surec.kod} ▸
              </Link>
              {!panel && (
                <button type="button" className="dg dg-satir" onClick={() => setPanel(true)}>
                  Kayıt paneli ▸
                </button>
              )}
            </>
          }
        />

        <EkranBasligi
          eyebrow={`${etiketle(veri.kaynak, 'Bulgu')} · tespit ${kisaTarih(veri.tespit)}`}
          vurgu={veri.tesis.ad}
          baslik={`— ${veri.baslik}`}
          metrikler={[
            {
              deger: veri.aksiyonlar.length === 0 ? '—' : biten,
              payda: veri.aksiyonlar.length === 0 ? undefined : veri.aksiyonlar.length,
              yazi: 'Aksiyon',
              durum: veri.aksiyonlar.length === 0 ? undefined : acikAksiyon > 0 ? 'md' : 'ok',
            },
            {
              deger: gecikme !== null ? `+${gecikme} g` : veri.hedef ? kisaTarih(veri.hedef) : '—',
              yazi: 'Son tarih',
              durum: gecikme !== null ? 'bd' : undefined,
            },
            { deger: veri.kanitlar.length || '—', yazi: 'Bağlı kanıt' },
          ]}
        />

        <div style={{ padding: 'var(--s26) var(--gutter-op) 0', maxWidth: 900 }}>
          <Asamalar aktifIndeks={asamaIndeksi}
            asamalar={ASAMALAR.map((ad, i) => ({ ad, tarih: asamaTarihleri[i] }))} />
        </div>

        {/* ── Modül 1 · aksiyon zinciri ─────────────────────────────── */}
        <section style={{ padding: 'var(--s30) var(--gutter-op) 0' }}>
          <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Aksiyonlar</p>
          {veri.aksiyonlar.length === 0 ? (
            <BosIlk
              cumle="Bu bulgu için aksiyon planlanmadı."
              eylem={<Dugme tur="birincil"
                onClick={() => { setPanel(true); setKip('kayit'); setSeciliAksiyon(null); setAksiyonFormu(true); }}>
                Aksiyon planla
              </Dugme>}
            />
          ) : (
            <Tablo
              sik
              kolonlar={[
                { baslik: 'Sahip', genislik: '150px', ikincil: true },
                { baslik: 'Hedef', genislik: '130px' },
                { baslik: 'Doğrulama', genislik: '140px' },
              ]}
              satirlar={satirlar}
              secili={seciliAksiyon}
              sec={(id) => { setSeciliAksiyon((o) => (o === id ? null : id)); setPanel(true); setKip('kayit'); }}
              dipNot="Satıra tıklayınca aksiyon paneli açılır."
            />
          )}
        </section>

        {/* ── Modül 2 · bulgu → aksiyon → doğrulama zaman ekseni ────── */}
        {kartlar.kartlar.length > 1 && (
          <section style={{ padding: 'var(--s30) var(--gutter-op) var(--sec-pad-bot)' }}>
            <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Zaman ekseni</p>
            <ZamanCizelgesi
              donemler={kartlar.donemler}
              kartlar={kartlar.kartlar}
              bugun={kartlar.bugun}
              tikla={(id) => {
                if (veri.aksiyonlar.some((a) => a.id === id)) {
                  setSeciliAksiyon(id); setPanel(true); setKip('kayit');
                }
              }}
            />
          </section>
        )}
      </main>

      {panel && (
        <Cekmece kod={`${veri.madde.kod} · ${veri.tesis.kod}`} kapat={() => setPanel(false)}>
          {aksiyon ? (
            <AksiyonPaneli
              aksiyon={aksiyon}
              bekliyor={bekliyor}
              geri={() => setSeciliAksiyon(null)}
              degistir={(durum) => calistir(() => aksiyonDurumDegistir({ id: aksiyon.id, durum }))}
            />
          ) : (
            <>
              <div className="cekmece-blok">
                <KipDegistir
                  aktif={kip}
                  sec={(id) => setKip(id as 'kayit' | 'iz')}
                  secenekler={[
                    { id: 'kayit', ad: 'Kayıt' },
                    { id: 'iz', ad: `Denetim izi ${veri.aktiviteler.length}` },
                  ]}
                />
              </div>

              {kip === 'kayit' ? (
                <>
                  <CekmeceKimlik
                    durum={im}
                    soz={im === 'bd' && gecikme !== null ? `${SOZ.bd} · ${gecikme} gün` : SOZ[im]}
                    baslik={veri.baslik}
                    cumle={veri.aciklama}
                  />

                  <CekmeceAlanlar alanlar={[
                    { etiket: 'Madde', deger: veri.madde.kod },
                    { etiket: 'Santral', deger: veri.tesis.ad },
                    { etiket: 'Kök neden', deger: veri.kokNeden ?? '—' },
                    { etiket: 'Doğrulama', deger: dogrulama.soz,
                      durum: dogrulama.im ?? undefined },
                    { etiket: 'Kapanış', deger: veri.kapanma ? kisaTarih(veri.kapanma) : '—' },
                  ]} />

                  <div className="cekmece-blok" style={{ marginTop: 'var(--s24)',
                    display: 'grid', gap: 'var(--s14)' }}>
                    <p className="t-label" style={{ margin: 0 }}>Kaydı güncelle</p>
                    <Alan etiket="Durum">
                      <select className="gr" value={veri.durum} disabled={bekliyor}
                        onChange={(e) => guncelle('durum', e.target.value)}>
                        {BULGU_DURUMLARI.map((d) => (
                          <option key={d} value={d}>{BULGU_DURUM_ETIKET[d]}</option>
                        ))}
                      </select>
                    </Alan>
                    <Alan etiket="Önem">
                      <select className="gr" value={veri.onem} disabled={bekliyor}
                        onChange={(e) => guncelle('onemDerecesi', e.target.value)}>
                        {ONEM_DERECELERI.map((o) => (
                          <option key={o} value={o}>{ONEM_ETIKET[o]}</option>
                        ))}
                      </select>
                    </Alan>
                    <Alan etiket="Sahip">
                      <select className="gr" value={veri.sorumluId ?? ''} disabled={bekliyor}
                        onChange={(e) => guncelle('sorumluId', e.target.value)}>
                        <option value="">Atanmadı</option>
                        {veri.kullanicilar.map((u) => (
                          <option key={u.id} value={u.id}>{u.ad}</option>
                        ))}
                      </select>
                    </Alan>
                    <Alan etiket="Son tarih">
                      <input className="gr" type="date" disabled={bekliyor}
                        defaultValue={veri.hedef ? veri.hedef.slice(0, 10) : ''}
                        onChange={(e) => guncelle('hedefTarih', e.target.value)} />
                    </Alan>
                    {hata && <Hata cumle={hata} />}
                  </div>

                  {/* aksiyonEkle */}
                  <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
                    <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>
                      Aksiyon · {biten}/{veri.aksiyonlar.length}
                    </p>
                    {aksiyonFormu ? (
                      <div style={{ display: 'grid', gap: 'var(--s12)' }}>
                        <Alan etiket="Başlık" zorunlu>
                          <input className="gr" value={yeniAksiyon.baslik} disabled={bekliyor}
                            placeholder="Ne yapılacak?"
                            onChange={(e) => setYeniAksiyon({ ...yeniAksiyon, baslik: e.target.value })} />
                        </Alan>
                        <Alan etiket="Sahip">
                          <select className="gr" value={yeniAksiyon.sorumluId} disabled={bekliyor}
                            onChange={(e) => setYeniAksiyon({ ...yeniAksiyon, sorumluId: e.target.value })}>
                            <option value="">Atanmadı</option>
                            {veri.kullanicilar.map((u) => (
                              <option key={u.id} value={u.id}>{u.ad}</option>
                            ))}
                          </select>
                        </Alan>
                        <Alan etiket="Hedef">
                          <input className="gr" type="date" value={yeniAksiyon.hedef} disabled={bekliyor}
                            onChange={(e) => setYeniAksiyon({ ...yeniAksiyon, hedef: e.target.value })} />
                        </Alan>
                        <div style={{ display: 'flex', gap: 'var(--s12)' }}>
                          <Dugme tur="birincil" disabled={bekliyor}
                            onClick={() => calistir(
                              () => aksiyonEkle({
                                bulguId: veri.id,
                                baslik: yeniAksiyon.baslik,
                                sorumluId: yeniAksiyon.sorumluId || null,
                                hedef: yeniAksiyon.hedef || null,
                              }),
                              () => {
                                setAksiyonFormu(false);
                                setYeniAksiyon({ baslik: '', sorumluId: '', hedef: '' });
                              },
                            )}>
                            Ekle
                          </Dugme>
                          <Dugme tur="ikincil" onClick={() => setAksiyonFormu(false)}>Vazgeç</Dugme>
                        </div>
                      </div>
                    ) : (
                      <Dugme tur="cekmece" onClick={() => setAksiyonFormu(true)}>Aksiyon planla</Dugme>
                    )}
                  </div>

                  {/* kanitEkle */}
                  <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
                    <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Kanıt</p>
                    <div style={{ display: 'grid', gap: 'var(--s8)' }}>
                      {veri.kanitlar.length === 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s8)',
                          fontSize: 'var(--t-field)', color: 'var(--i3)' }}>
                          <Im durum="unk" ad="Kanıt bağlanmadı" />bağlı kanıt yok
                        </span>
                      )}
                      {veri.kanitlar.map((k) => {
                        const taze = kanitTazelik(new Date(k.baslangic));
                        return (
                          <span key={k.id} style={{ display: 'flex', alignItems: 'center',
                            gap: 'var(--s8)', fontSize: 'var(--t-field)' }}>
                            <Im durum={taze.durum === 'uyumlu' ? 'ok'
                              : taze.durum === 'kismi' ? 'md' : 'unk'}
                              ad={`${etiketle(k.tip)} · ${taze.gun} gün önce`} />
                            <span style={{ minWidth: 0, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.ad}</span>
                            <span style={{ marginLeft: 'auto', fontFamily: 'var(--mo)',
                              fontSize: 'var(--t-label)', color: 'var(--i3)' }}>{taze.gun} g</span>
                          </span>
                        );
                      })}
                    </div>
                    {kanitFormu ? (
                      <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s14)' }}>
                        <Alan etiket="Kanıt adı" zorunlu>
                          <input className="gr" value={yeniKanit.ad} disabled={bekliyor}
                            onChange={(e) => setYeniKanit({ ...yeniKanit, ad: e.target.value })} />
                        </Alan>
                        <Alan etiket="Tip">
                          <select className="gr" value={yeniKanit.tip} disabled={bekliyor}
                            onChange={(e) => setYeniKanit({ ...yeniKanit, tip: e.target.value })}>
                            {KANIT_TIPLERI.map((t) => (
                              <option key={t} value={t}>{etiketle(t)}</option>
                            ))}
                          </select>
                        </Alan>
                        <div style={{ display: 'flex', gap: 'var(--s12)' }}>
                          <Dugme tur="birincil" disabled={bekliyor}
                            onClick={() => calistir(
                              () => kanitEkle({
                                maddeDurumuId: veri.maddeDurumuId,
                                ad: yeniKanit.ad,
                                tip: yeniKanit.tip,
                              }),
                              () => { setKanitFormu(false); setYeniKanit({ ad: '', tip: 'kayit' }); },
                            )}>
                            Bağla
                          </Dugme>
                          <Dugme tur="ikincil" onClick={() => setKanitFormu(false)}>Vazgeç</Dugme>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 'var(--s12)' }}>
                        <Dugme tur="ikincil" onClick={() => setKanitFormu(true)}>Kanıt bağla</Dugme>
                      </div>
                    )}
                  </div>

                  {(veri.projeler.length > 0 || veri.riskler.length > 0) && (
                    <CekmeceBagli kayitlar={[
                      ...veri.riskler.map((r) => ({
                        id: r.id, kod: r.kod, alt: r.baslik, yol: '/riskler',
                      })),
                      ...veri.projeler.map((p) => ({
                        id: p.id, kod: p.kod, alt: p.ad, yol: '/projeler', suren: true,
                      })),
                    ]} />
                  )}

                  <CekmeceEylemler dipNot="Kapatma, açık aksiyon kalmadığında ve doğrulama yetkisiyle yapılır; her değişiklik denetim izine yazılır." />
                </>
              ) : (
                <DenetimIzi kayitlar={veri.aktiviteler} />
              )}
            </>
          )}
        </Cekmece>
      )}
    </>
  );
}

/* İşaretçi doğrulamanın durumunu taşır; metin yalnız kanıt olgusunu yazar
   — durum sözcüğü canvasta tekrarlanmaz (06 §A2). */
function DogrulamaHucresi({ hucre }: { hucre: ReturnType<typeof aksiyonDogrulamaHucresi> }) {
  if (!hucre.im) return <span style={{ color: 'var(--i3)' }}>—</span>;
  const govde = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s10)', minWidth: 0 }}>
      <Im durum={hucre.im} ad={hucre.ad} />
      {hucre.olgu && <span style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hucre.olgu}</span>}
    </span>
  );
  return hucre.kanit ? <Ipucu metin={hucre.kanit} genis>{govde}</Ipucu> : govde;
}

/* ── Aksiyon paneli ─────────────────────────────────────────────────── */

function AksiyonPaneli({
  aksiyon, bekliyor, geri, degistir,
}: {
  aksiyon: AksiyonOzeti; bekliyor: boolean; geri: () => void;
  degistir: (durum: string) => void;
}) {
  const im = aksiyonImi(aksiyon);
  return (
    <>
      <div className="cekmece-blok">
        <button type="button" className="dg dg-satir" onClick={geri}>◂ Bulgu kaydı</button>
      </div>
      <CekmeceKimlik
        durum={im}
        soz={AKSIYON_ETIKET[aksiyon.durum as keyof typeof AKSIYON_ETIKET] ?? etiketle(aksiyon.durum)}
        baslik={aksiyon.baslik}
        cumle={aksiyon.not ?? undefined}
      />
      <CekmeceAlanlar alanlar={[
        { etiket: 'Sahip', deger: aksiyon.sorumlu ?? '—' },
        { etiket: 'Hedef', deger: aksiyon.hedef ? kisaTarih(aksiyon.hedef) : '—',
          durum: im === 'bd' ? 'bd' : undefined },
        { etiket: 'Tamamlanma', deger: aksiyon.tamamlanma ? kisaTarih(aksiyon.tamamlanma) : '—' },
        { etiket: 'Doğrulama', deger: etiketle(aksiyon.dogrulama) },
        { etiket: 'Doğrulayan', deger: aksiyon.dogrulayan ?? '—' },
      ]} />
      <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
        <Alan etiket="Aksiyon durumu">
          <select className="gr" value={aksiyon.durum} disabled={bekliyor}
            onChange={(e) => degistir(e.target.value)}>
            {AKSIYON_DURUMLARI.map((d) => (
              <option key={d} value={d}>{AKSIYON_ETIKET[d]}</option>
            ))}
          </select>
        </Alan>
      </div>
      <CekmeceEylemler dipNot="Durum değişikliği aktör ve zaman damgasıyla denetim izine yazılır." />
    </>
  );
}

/* ── Denetim izi ────────────────────────────────────────────────────── */

function DenetimIzi({ kayitlar }: { kayitlar: Veri['aktiviteler'] }) {
  if (kayitlar.length === 0) {
    return (
      <div className="cekmece-blok">
        <p style={{ margin: 0, fontFamily: 'var(--mo)', fontSize: 'var(--t-label)',
          color: 'var(--i3)' }}>Kayıt yok</p>
      </div>
    );
  }
  return (
    <div className="cekmece-blok" style={{ display: 'grid', gap: 'var(--s14)' }}>
      {kayitlar.map((k) => (
        <div key={k.id} style={{ display: 'grid', gap: 2,
          borderLeft: 'var(--bw-edge) solid var(--hr2)', paddingLeft: 'var(--s12)' }}>
          <span style={{ fontSize: 'var(--t-field)' }}>
            <b style={{ fontWeight: 600 }}>{k.aktor}</b>{' '}
            {eylemCumlesi(k.eylem, k.varlikTipi === 'Bulgu' ? null : k.varlikTipi, k.alan)}
          </span>
          <span style={{ fontFamily: 'var(--mo)', fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
            {zamanTR(k.zaman)}
            {(k.once || k.sonra) && ` · ${etiketle(k.once, '—')} → ${etiketle(k.sonra, '—')}`}
            {k.dosya && ` · ${k.dosya}`}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Zaman ekseni: bulgu → aksiyonlar → doğrulama/kapanış ───────────── */

const AY_KISA = new Intl.DateTimeFormat('tr-TR', { month: 'short' });

function zamanKartlari(veri: Veri): {
  donemler: { ad: string; konum: number }[]; kartlar: ZamanKarti[]; bugun: number | undefined;
} {
  type Ham = { id: string; ad: string; kapsam: string; durum: Durum; an: number };

  /* Eksen üç kilometre taşı taşır — bulgu → aksiyon → doğrulama. Aksiyonların
     tamamı zaten üstteki tabloda; burada ilerlemenin yayı okunur. Kart 208px
     olduğu için ikiden fazla ara nokta bu genişlikte üst üste biner. */
  const ham: Ham[] = [{
    id: 'tespit', ad: 'Bulgu tespit edildi',
    kapsam: `${etiketle(veri.kaynak, 'Bulgu')} · ${veri.madde.kod}`,
    durum: 'tamam', an: new Date(veri.tespit).getTime(),
  }];

  const suruyor = surukleyenAksiyon(veri);
  const aksiyonAni = suruyor ? (suruyor.tamamlanma ?? suruyor.hedef) : null;
  if (suruyor && aksiyonAni) {
    const kalan = veri.aksiyonlar.length - 1;
    ham.push({
      id: suruyor.id, ad: suruyor.baslik,
      kapsam: [suruyor.sorumlu, kalan > 0 ? `+${kalan} aksiyon` : null]
        .filter(Boolean).join(' · ') || veri.madde.kod,
      durum: aksiyonImi(suruyor), an: new Date(aksiyonAni).getTime(),
    });
  }

  if (veri.kapanma) {
    ham.push({
      id: 'kapanis', ad: 'Kapanış doğrulaması',
      kapsam: veri.kapanisDogrulayan ?? 'doğrulayan kaydı yok',
      durum: 'ok', an: new Date(veri.kapanma).getTime(),
    });
  } else if (veri.hedef) {
    ham.push({
      id: 'kapanis', ad: 'Bulgu son tarihi',
      kapsam: veri.sorumlu ?? 'sahip atanmadı',
      durum: gecikmeGunu(veri) !== null ? 'bd' : 'pl',
      an: new Date(veri.hedef).getTime(),
    });
  }

  ham.sort((x, y) => x.an - y.an);
  const simdi = bugunAn();
  const enKucuk = Math.min(ham[0].an, simdi);
  const enBuyuk = Math.max(ham[ham.length - 1].an, simdi);
  const acikGenislik = Math.max(enBuyuk - enKucuk, 86_400_000);
  const oran = (t: number) => 0.02 + ((t - enKucuk) / acikGenislik) * 0.68;

  /* Kart genişliği eksenin ~%32'si; sıralama korunarak asgari aralık dayatılır,
     sonra son kart 0.70'e çekilerek hepsi tuvale sığdırılır. Bu bir YERLEŞİM
     düzeltmesidir — kart üzerindeki tarih etiketi gerçek tarihi söyler. */
  const ARALIK = 0.34;
  let onceki = -1;
  const konumlar = ham.map((h) => {
    const k = Math.max(oran(h.an), onceki + ARALIK);
    onceki = k;
    return k;
  });
  const tasma = Math.max(0, (konumlar[konumlar.length - 1] ?? 0) - 0.70);
  const kartlar: ZamanKarti[] = ham.map((h, i) => ({
    id: h.id, ad: h.ad, kapsam: h.kapsam, durum: h.durum,
    konum: Math.max(0.02, konumlar[i] - tasma),
    geri: gunEtiketi(h.an, simdi),
  }));

  const donemler = [0, 0.25, 0.5, 0.75, 1]
    .map((p) => ({
      ad: AY_KISA.format(new Date(enKucuk + acikGenislik * p)),
      konum: 0.02 + p * 0.68,
    }))
    .filter((d, i, hepsi) => i === 0 || d.ad !== hepsi[i - 1].ad);

  return { donemler, kartlar, bugun: oran(simdi) };
}

function gunEtiketi(an: number, simdi: number): string {
  const gun = Math.round((an - simdi) / 86_400_000);
  if (gun === 0) return 'bugün';
  return gun > 0 ? `${gun}g` : `−${Math.abs(gun)}g`;
}

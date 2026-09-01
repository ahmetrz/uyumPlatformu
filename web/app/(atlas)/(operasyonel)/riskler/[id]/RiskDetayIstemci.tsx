'use client';
import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Im, Ipucu, Metrikler, Dugme, type Durum } from '@/components/abacus/temel';
import BaglamCubugu, { type SeciciOgesi } from '@/components/abacus/BaglamCubugu';
import { CekmeceAlanlar } from '@/components/abacus/panel';
import { etiketle, tarihTR } from '@/lib/sabitler';
import { RiskFormu, KararFormu } from '../Formlar';
import {
  gunFarki, kabulDoldu, maxEtki, santralMetni, skorDurumu, SKOR_TAVANI,
  type BulguSecenegi, type Kisi, type Kodlu, type R,
} from '../ortak';

/* O4 · Risk Detail — ContextNav + içerik + 420px yan panel.
   Durum SÖZCÜĞÜ canvas'ta yazılmaz: şiddeti işaretçi ve skor rengi taşır.
   Karar ve yeniden değerlendirme MODALDA değil, yan panelde / içerikte açılır. */

export type AksiyonSatiri = {
  id: string; baslik: string; durum: string;
  sorumlu: string | null; hedef: string | null; tamamlanma: string | null;
  dogrulamaDurumu: string;
};

export type DetayVerisi = {
  risk: R;
  aksiyonlar: AksiyonSatiri[];
  bulguTespit: string | null;
  bulguKapanma: string | null;
  dogrulamaTarihi: string | null;
  dogrulayan: string | null;
  kontrolDurumu: string | null;
  kontrolTarihi: string | null;
  trend: { zaman: string; deger: number | null }[];
  kullanicilar: Kisi[];
  tesisler: Kodlu[];
  sistemler: Kodlu[];
  bulgular: BulguSecenegi[];
  santraller: SeciciOgesi[];
};

/** Uyum durumu → Atlas işaretçisi. Değerlendirilmemiş madde BİLİNMEYEN kalır. */
const UYUM_DURUMU: Record<string, Durum> = {
  uyumlu: 'ok', kismi: 'md', uyumsuz: 'bd', incelemede: 'pl',
  kapsamdisi: 'unk', degerlendirilmedi: 'unk',
};

const AKSIYON_DURUMU: Record<string, Durum> = {
  planlandi: 'pl', devam: 'md', tamamlandi: 'ok', iptal: 'unk',
};

type Halka = { anahtar: string; durum: Durum; kod: string; not: string; yol?: string; suren?: boolean };

export default function RiskDetayIstemci({ veri }: { veri: DetayVerisi }) {
  const { risk } = veri;
  const [duzenle, setDuzenle] = useState(false);
  const [karar, setKarar] = useState(false);

  const durum = skorDurumu(risk.artikRisk);
  const etki = maxEtki(risk.etkiler);
  const doldu = kabulDoldu(risk);

  /* ── Kapanma zinciri: dört EŞİT halka ─────────────────────────────── */
  const kontrol = risk.kontroller[0] ?? null;
  const bulguYasi = gunFarki(veri.bulguTespit);
  const proje = veri.risk.projeler[0] ?? null;
  const dogrulanmisAksiyon = veri.aksiyonlar.find((a) => a.dogrulamaDurumu === 'dogrulandi');
  const bekleyenDogrulama = veri.aksiyonlar.find((a) => a.dogrulamaDurumu === 'bekliyor');

  const zincir: Halka[] = [
    kontrol
      ? {
          anahtar: 'kontrol',
          durum: veri.kontrolDurumu ? UYUM_DURUMU[veri.kontrolDurumu] ?? 'unk' : 'unk',
          kod: kontrol.kod,
          not: 'kontrol boşluğu',
          yol: '/uyum',
        }
      : { anahtar: 'kontrol', durum: 'unk', kod: 'Kontrol', not: 'bağ yok' },
    risk.bulgu
      ? {
          anahtar: 'bulgu',
          durum: veri.bulguKapanma ? 'ok' : 'md',
          kod: risk.bulgu.baslik,
          not: veri.bulguKapanma
            ? `kapandı ${tarihTR(veri.bulguKapanma)}`
            : bulguYasi !== null ? `${bulguYasi} gün` : 'bulgu',
          yol: `/bulgular/${risk.bulgu.id}`,
        }
      : { anahtar: 'bulgu', durum: 'unk', kod: 'Bulgu', not: 'bağ yok' },
    proje
      ? {
          anahtar: 'proje',
          durum: proje.durum === 'tamamlandi' ? 'ok' : proje.durum === 'devam' ? 'md' : 'pl',
          kod: proje.kod,
          not: proje.ilerleme !== null ? `%${proje.ilerleme}` : 'kilometre taşı yok',
          yol: '/projeler',
          suren: proje.durum === 'devam',
        }
      : { anahtar: 'proje', durum: 'unk', kod: 'Proje', not: 'bağ yok' },
    veri.dogrulamaTarihi
      ? {
          anahtar: 'dogrulama',
          durum: 'ok',
          kod: veri.dogrulayan ?? 'Kapanış doğrulaması',
          not: `${tarihTR(veri.dogrulamaTarihi)} · doğrulama`,
          yol: risk.bulgu ? `/bulgular/${risk.bulgu.id}` : undefined,
        }
      : dogrulanmisAksiyon
        ? {
            anahtar: 'dogrulama', durum: 'ok', kod: dogrulanmisAksiyon.baslik,
            not: 'aksiyon doğrulandı',
            yol: risk.bulgu ? `/bulgular/${risk.bulgu.id}` : undefined,
          }
        : bekleyenDogrulama
          ? {
              anahtar: 'dogrulama', durum: 'md', kod: bekleyenDogrulama.baslik,
              not: 'doğrulama bekliyor',
              yol: risk.bulgu ? `/bulgular/${risk.bulgu.id}` : undefined,
            }
          : { anahtar: 'dogrulama', durum: 'unk', kod: 'Doğrulama', not: 'kayıt yok' },
  ];

  /* ── Aksiyon listesi ───────────────────────────────────────────────── */
  const aksiyonlar = veri.aksiyonlar.map((a) => {
    const acik = a.durum !== 'tamamlandi' && a.durum !== 'iptal';
    const asim = acik && a.hedef ? gunFarki(a.hedef) : null;
    const asti = asim !== null && asim > 0;
    return { ...a, asti, asim, im: asti ? ('bd' as Durum) : AKSIYON_DURUMU[a.durum] ?? 'unk' };
  });

  const telafiSayisi = risk.mevcutKontroller
    ? risk.mevcutKontroller.split(/[·;\n]/).map((s) => s.trim()).filter(Boolean).length
    : 0;

  return (
    <main data-yuzey="defter" style={{ minWidth: 0 }}>
      <BaglamCubugu
        kirintiler={[{ ad: 'Risk', yol: '/riskler' }, { ad: risk.kod }]}
        seciciEtiketi="Santral"
        secici={veri.santraller}
        sag={
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s12)' }}>
            <Dugme tur="satir"
              onClick={() => { setDuzenle((v) => !v); setKarar(false); }}>
              Yeniden değerlendir
            </Dugme>
            <Dugme tur="birincil"
              onClick={() => { setKarar((v) => !v); setDuzenle(false); }}>
              Karar kaydet
            </Dugme>
          </span>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) var(--drawer-w)' }}>
        {/* ── İçerik ────────────────────────────────────────────────── */}
        <div style={{
          minWidth: 0,
          padding: 'var(--s36) var(--s40) var(--sec-pad-bot) var(--gutter-op)',
          borderRight: 'var(--bw-hair) solid var(--hr)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)' }}>
            <Im durum={durum} ad={`Artık skor ${risk.artikRisk ?? 'bilinmiyor'}`} />
            <span className="etiket">
              {etiketle(risk.kaynak, 'kayıt')} · {tarihTR(risk.olusturuldu)}
            </span>
          </span>

          <h1 className="ab-pano-basligi" style={{ margin: 'var(--s14) 0 0', maxWidth: '26ch' }}>
            {risk.baslik}
          </h1>

          <div style={{ marginTop: 'var(--s28)', paddingTop: 'var(--s22)',
            borderTop: 'var(--bw-hair) solid var(--hr)' }}>
            <Metrikler metrikler={[
              {
                deger: risk.artikRisk ?? '—',
                payda: risk.artikRisk === null ? undefined : SKOR_TAVANI,
                yazi: 'Artık', durum: risk.artikRisk === null ? undefined : durum,
              },
              {
                deger: risk.dogalRisk ?? '—',
                payda: risk.dogalRisk === null ? undefined : SKOR_TAVANI,
                yazi: 'Brüt',
              },
              { deger: '—', yazi: 'Hedef' },
              {
                deger: risk.olasilik !== null && etki !== null ? (
                  <Ipucu genis metin={
                    `Olasılık ${risk.olasilik}/5 · en büyük etki ${etki}/5 · `
                    + `brüt ${risk.dogalRisk ?? '—'} → artık ${risk.artikRisk ?? '—'}`
                  }>
                    <span className="ab-dugme satir" style={{ fontWeight: 700 }}>
                      {risk.olasilik}×{etki}
                    </span>
                  </Ipucu>
                ) : '—',
                yazi: 'Olasılık × etki',
              },
            ]} />
            <p className="ab-dip" style={{ marginTop: 'var(--s12)' }}>
              Hedef skor tanımlı değil
              {doldu && ` · kabul ${tarihTR(risk.kabulBitis)} tarihinde düştü`}
            </p>
          </div>

          {duzenle ? (
            <div style={{ marginTop: 'var(--s34)' }}>
              <p className="etiket" style={{ margin: '0 0 var(--s16)' }}>Yeniden değerlendir</p>
              <RiskFormu genis risk={risk} yeniKod={risk.kod}
                kullanicilar={veri.kullanicilar} tesisler={veri.tesisler}
                sistemler={veri.sistemler} bulgular={veri.bulgular}
                kapat={() => setDuzenle(false)} />
            </div>
          ) : (
            <>
              {/* ── Kapanma zinciri ───────────────────────────────── */}
              <div style={{ marginTop: 'var(--s34)' }}>
                <p className="etiket" style={{ margin: 0 }}>Kapanma zinciri</p>
                <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 'var(--s14)' }}>
                  {zincir.map((h, i) => (
                    <span key={h.anahtar} style={{ display: 'contents' }}>
                      {i > 0 && (
                        <span aria-hidden style={{ width: 28, display: 'grid', placeItems: 'center',
                          fontFamily: 'var(--veri)', fontSize: 'var(--t-code-lg)', color: 'var(--i3)' }}>
                          →
                        </span>
                      )}
                      <ZincirKarti halka={h} />
                    </span>
                  ))}
                </div>
              </div>

              {/* ── Aksiyonlar ────────────────────────────────────── */}
              <div style={{ marginTop: 'var(--s34)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'baseline' }}>
                  <p className="etiket" style={{ margin: 0 }}>Aksiyonlar</p>
                  <span className="etiket">{aksiyonlar.length} kayıt</span>
                </div>

                {aksiyonlar.length === 0 ? (
                  <div className="ab-blok" style={{ marginTop: 'var(--s14)' }}>
                    <p className="cumle" style={{ marginTop: 0 }}>Aksiyon tanımlanmadı</p>
                    <div className="eylem">
                      {risk.bulgu ? (
                        <Link href={`/bulgular/${risk.bulgu.id}`}>
                          <Dugme tur="birincil">Aksiyon ekle</Dugme>
                        </Link>
                      ) : (
                        <Dugme tur="birincil" onClick={() => setDuzenle(true)}>Bulgu bağla</Dugme>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 'var(--s12)',
                    borderTop: 'var(--bw-hair) solid var(--hr)' }}>
                    {aksiyonlar.map((a) => (
                      <div key={a.id} style={{
                        display: 'grid',
                        gridTemplateColumns: '22px minmax(0, 1fr) 130px 110px',
                        gap: 'var(--col-gap)', alignItems: 'center',
                        padding: 'var(--s14) 0',
                        borderBottom: 'var(--bw-hair) solid var(--hr)',
                        background: a.asti ? 'var(--secim)' : undefined,
                      }}>
                        <Im durum={a.im} enKotu={a.asti} ad={a.baslik} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: 'var(--t-body)',
                            fontWeight: a.asti ? 600 : 500,
                            color: a.asti ? 'var(--murekkep)' : 'var(--i2)',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' }}>
                            {a.baslik}
                          </span>
                          {a.asti && (
                            <span style={{ display: 'block', marginTop: 'var(--s3)',
                              fontFamily: 'var(--veri)', fontSize: 'var(--t-code)',
                              color: 'var(--bd)' }}>
                              hedef +{a.asim} gün
                            </span>
                          )}
                        </span>
                        <span style={{ fontSize: 'var(--t-cell)',
                          color: a.sorumlu ? 'var(--i2)' : 'var(--md)' }}>
                          {a.sorumlu ?? 'atanmadı'}
                        </span>
                        <span style={{ justifySelf: 'end', fontFamily: 'var(--veri)',
                          fontSize: 'var(--t-code-lg)',
                          color: a.asti ? 'var(--bd)' : 'var(--i3)' }}>
                          {a.hedef ? tarihTR(a.hedef) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Yan panel 420px ───────────────────────────────────────── */}
        <aside style={{
          minWidth: 0, background: 'var(--panel2)',
          padding: 'var(--s36) var(--gutter-op) var(--sec-pad-bot) var(--s32)',
        }}
          aria-label="Risk bağlamı">
          {karar ? (
            <>
              <p className="etiket" style={{ margin: '0 0 var(--s16)' }}>Karar kaydet</p>
              <KararFormu risk={risk} kapat={() => setKarar(false)} />
            </>
          ) : (
            <>
              <p className="etiket" style={{ margin: 0 }}>Skor eğilimi</p>
              <Egilim noktalar={veri.trend} />

              <div style={{ marginTop: 'var(--s20)' }}>
                <CekmeceAlanlar alanlar={[
                  { etiket: 'Santral', deger: santralMetni(risk) },
                  { etiket: 'Sistem', deger: risk.sistem ? `${risk.sistem.kod} · ${risk.sistem.ad}` : '—' },
                  {
                    etiket: 'Sahip',
                    deger: risk.sahip?.ad ?? 'atanmadı',
                    durum: risk.sahip ? undefined : 'md',
                  },
                  { etiket: 'Son değerlendirme', deger: tarihTR(risk.guncellendi) },
                ]} />
              </div>

              <div style={{ marginTop: 'var(--s22)', paddingTop: 'var(--s18)',
                borderTop: 'var(--bw-strong) solid var(--hr2)' }}>
                {telafiSayisi > 0 && risk.mevcutKontroller ? (
                  <Ipucu genis metin={risk.mevcutKontroller}>
                    <button type="button" className="ab-dugme satir etiket">
                      Telafi kontrolleri · {telafiSayisi}
                    </button>
                  </Ipucu>
                ) : (
                  <p className="ab-panel-dip" style={{ margin: 0 }}>
                    Telafi edici kontrol kaydı yok — artık skor brütten düşmüyor.
                  </p>
                )}
              </div>

              {veri.kontrolTarihi && (
                <p className="ab-panel-dip" style={{ margin: 'var(--s16) 0 0' }}>
                  Kontrol değerlendirmesi {tarihTR(veri.kontrolTarihi)}
                </p>
              )}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

/* ── Zincir kartı ───────────────────────────────────────────────────── */

function ZincirKarti({ halka }: { halka: Halka }) {
  const stil: CSSProperties = {
    flex: 1, minWidth: 0, display: 'block',
    background: halka.suren ? 'var(--secim)' : 'var(--panel)',
    border: `var(--bw-hair) solid ${halka.suren ? 'var(--aksan)' : 'var(--hr2)'}`,
    padding: 'var(--s16)',
  };
  const ic: ReactNode = (
    <>
      <Im durum={halka.durum} ad={halka.kod} />
      <span style={{ display: 'block', marginTop: 'var(--s9)', fontSize: 'var(--t-body)',
        fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {halka.kod}
      </span>
      <span style={{ display: 'block', marginTop: 'var(--s2)', fontFamily: 'var(--veri)',
        fontSize: 'var(--t-code)', color: 'var(--i3)' }}>
        {halka.not}
      </span>
    </>
  );
  return halka.yol
    ? <Link href={halka.yol} style={stil}>{ic}</Link>
    : <div style={stil}>{ic}</div>;
}

/* ── Skor eğilimi ───────────────────────────────────────────────────── */

/** Artık skor DOLU çizgi. Hedef çizgisi yalnız hedef skoru tanımlıysa
    çizilir — veri yokken kesikli çizgi UYDURULMAZ (06 §19). */
function Egilim({ noktalar }: { noktalar: { zaman: string; deger: number | null }[] }) {
  const bilinen = noktalar.filter(
    (n): n is { zaman: string; deger: number } => n.deger !== null,
  );
  const bilinmeyen = noktalar.length - bilinen.length;

  const G = 300, ALT = 64, UST = 8;
  const y = (v: number) => ALT - (Math.min(v, SKOR_TAVANI) / SKOR_TAVANI) * (ALT - UST);

  /* Tek ölçüm bir EĞİLİM değildir: çizgi çizilmez, yalnız bugünkü değer
     eksenin üzerinde tek nokta olarak durur. */
  if (bilinen.length < 2) {
    const tek = bilinen[0] ?? null;
    return (
      <div style={{ marginTop: 'var(--s12)' }}>
        <svg width="100%" height="76" viewBox="0 0 300 76" role="img"
          aria-label={tek ? `Tek ölçüm: ${tek.deger}/${SKOR_TAVANI}` : 'Skor geçmişi yok'}
          style={{ display: 'block' }}>
          <line x1="0" y1="64" x2="300" y2="64" stroke="var(--hr2)" strokeWidth="1" />
          {tek && (
            <circle cx="294" cy={y(tek.deger)} r="3.2" fill="var(--bd)">
              <title>{`${tarihTR(tek.zaman)} · ${tek.deger}/${SKOR_TAVANI}`}</title>
            </circle>
          )}
        </svg>
        <p className="ab-panel-dip" style={{ margin: 'var(--s8) 0 0' }}>
          {tek
            ? `Tek ölçüm ${tek.deger}/${SKOR_TAVANI} · eğilim için ikinci değerlendirme gerekli`
            : 'Skor geçmişi yok'}
        </p>
      </div>
    );
  }

  const x = (i: number) => 6 + (i / (bilinen.length - 1)) * (G - 12);
  const cizgi = bilinen.map((n, i) => `${x(i).toFixed(1)},${y(n.deger).toFixed(1)}`).join(' ');
  const son = bilinen[bilinen.length - 1];

  return (
    <div style={{ marginTop: 'var(--s12)' }}>
      <svg width="100%" height="76" viewBox="0 0 300 76" role="img"
        aria-label={`Artık skor eğilimi: ${bilinen.map((n) => n.deger).join(', ')}`}
        style={{ display: 'block' }}>
        <line x1="0" y1="64" x2="300" y2="64" stroke="var(--hr2)" strokeWidth="1" />
        <polyline points={cizgi} fill="none" stroke="var(--bd)" strokeWidth="1.8" />
        {bilinen.map((n, i) => (
          <circle key={n.zaman + i} cx={x(i)} cy={y(n.deger)} r={i === bilinen.length - 1 ? 3.2 : 2}
            fill="var(--bd)">
            <title>{`${tarihTR(n.zaman)} · ${n.deger}/${SKOR_TAVANI}`}</title>
          </circle>
        ))}
      </svg>
      <p className="ab-panel-dip" style={{ margin: 'var(--s8) 0 0' }}>
        Artık skor · {bilinen.length} ölçüm · son {son.deger}/{SKOR_TAVANI}
        {bilinmeyen > 0 && ` · ${bilinmeyen} ölçüm skorsuz`}
      </p>
    </div>
  );
}

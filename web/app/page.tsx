import { girisZorunlu } from '@/lib/erisim';
import Link from 'next/link';
import { db } from '@/lib/db';
import { uyumYuzdesi, uyumOzeti, tarihTR, ONEM_ETIKET, ONEM_DURUM_RENGI, etiketle,
  eylemCumlesi, SUREC_DURUM_ETIKET, SUREC_DURUM_RENGI,
  type Durum, type Onem, type SurecDurum } from '@/lib/sabitler';
import { Pill, SegBar, Halka, Bos, type DurumSayilari } from '@/components/ui';
import UstCubuk from '@/components/UstCubuk';
import { TesisKapagi, HeroFotograf } from '@/components/Fotograf';
import UyumTrendi from '@/components/UyumTrendi';


export default async function GenelBakis() {
  await girisZorunlu();
  const [surecler, durumGruplari, acikBulgular, gecikenAksiyonlar, onayKuyrugu, aktiviteler,
    acikGorevler, bekleyenOnaylar, projeAdaylari, acikRiskSayisi, tesisler] =
    await Promise.all([
      db.uyumSureci.findMany({
        where: { durum: { in: ['aktif', 'planlandi'] } },
        include: { regulasyon: true, kapsam: { include: { tesis: { include: { tip: true } } } } },
        orderBy: { bitis: 'asc' },
      }),
      db.maddeDurumu.groupBy({ by: ['surecId', 'tesisId', 'durum'], _count: { _all: true } }),
      db.bulgu.findMany({
        where: { durum: { in: ['acik', 'aksiyonda'] } },
        include: { sorumlu: true, maddeDurumu: { include: {
          madde: true, tesis: true, surec: true } } },
        orderBy: [{ onemDerecesi: 'asc' }, { hedefTarih: 'asc' }],
      }),
      db.aksiyon.findMany({
        where: { durum: { in: ['planlandi', 'devam'] }, hedef: { lt: new Date() } },
        include: { bulgu: true, sorumlu: true },
      }),
      db.iceAktarim.findMany({
        where: { durum: 'dogrulama_bekliyor' }, include: { regulasyon: true } }),
      db.aktiviteKaydi.findMany({
        take: 8, orderBy: { zaman: 'desc' }, include: { aktor: true } }),
      db.gorev.count({ where: { durum: 'acik' } }),
      db.onayTalebi.count({ where: { durum: 'bekliyor' } }),
      db.projeAdayi.count({ where: { durum: 'oneri' } }),
      db.risk.count({ where: { durum: { in: ['acik', 'islemde'] }, silindi: null } }),
      db.tesis.findMany({ where: { durum: 'aktif' }, include: { tip: true }, orderBy: { kod: 'asc' } }),
    ]);
  const anlikler = await db.uyumAnlik.findMany({
    where: { tesisId: null }, orderBy: { tarih: 'asc' }, take: 60 });

  // süreç → durum sayıları / tesis kırılımı
  const surecSayilari = new Map<string, DurumSayilari>();
  const tesisSayilari = new Map<string, Map<string, DurumSayilari>>();
  for (const g of durumGruplari) {
    const s = surecSayilari.get(g.surecId) ?? {};
    s[g.durum as Durum] = (s[g.durum as Durum] ?? 0) + g._count._all;
    surecSayilari.set(g.surecId, s);
    const t = tesisSayilari.get(g.surecId) ?? new Map();
    const td = t.get(g.tesisId) ?? {};
    td[g.durum as Durum] = (td[g.durum as Durum] ?? 0) + g._count._all;
    t.set(g.tesisId, td);
    tesisSayilari.set(g.surecId, t);
  }

  const aktifSurecler = surecler.filter((s) => s.durum === 'aktif');
  const genelSayilar: DurumSayilari = {};
  for (const s of aktifSurecler) {
    const sy = surecSayilari.get(s.id) ?? {};
    for (const [d, n] of Object.entries(sy))
      genelSayilar[d as Durum] = (genelSayilar[d as Durum] ?? 0) + (n ?? 0);
  }
  const genelYuzde = uyumYuzdesi(genelSayilar);
  const kritikSayisi = acikBulgular.filter((b) => b.onemDerecesi === 'kritik').length;
  const siradakiDenetim = aktifSurecler.find((s) => s.bitis);
  // eslint-disable-next-line react-hooks/purity -- sunucu bileşeni: istek anının zamanı kasıtlı
  const simdi = Date.now();
  const kalanGun = siradakiDenetim?.bitis
    ? Math.ceil((siradakiDenetim.bitis.getTime() - simdi) / 86_400_000) : null;

  const bugun = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date());

  return (
    <>
      <UstCubuk baslik="Genel bakış" />
      <main className="icerik">
        <div className="belir gorunur">
          <div className="mikro-etiket">GENEL UYUM DURUMU · <span className="vurgu">{bugun.toLocaleUpperCase('tr-TR')}</span></div>
          <div className="kart" style={{ marginTop: 'var(--sp-3)', position: 'relative', overflow: 'hidden' }}>
            <HeroFotograf dosya="sebeke" alt="Elektrik iletim hattı, gün batımı" />
            <div className="band" style={{ position: 'relative' }}>
              <div className="band-hucre">
                <span className="mikro-etiket">Genel uyum / aktif süreçler</span>
                <span className="metrik-dev">
                  {genelYuzde === null ? '—' : <><span data-sayac={genelYuzde}>0</span><span className="birim">%</span></>}
                </span>
                <SegBar sayilar={genelSayilar} />
              </div>
              <div className="band-hucre">
                <span className="mikro-etiket">Uyum trendi</span>
                <UyumTrendi anlikler={anlikler.map((a) => ({
                  tarih: a.tarih.toISOString(), ozetJson: a.ozetJson }))} />
              </div>
              <div className="band-hucre">
                <span className="mikro-etiket">Açık bulgu</span>
                <span className="metrik-dev"><span data-sayac={acikBulgular.length}>0</span></span>
                <span>
                  {kritikSayisi > 0
                    ? <Pill durum="uyumsuz" etiket={`${kritikSayisi} kritik`} />
                    : <Pill durum="uyumlu" etiket="Kritik yok" />}
                </span>
              </div>
              <div className="band-hucre">
                <span className="mikro-etiket">Gecikmiş aksiyon</span>
                <span className="metrik-dev"><span data-sayac={gecikenAksiyonlar.length}>0</span></span>
                <span>{gecikenAksiyonlar.length > 0
                  ? <Pill durum="kismi" etiket="Müdahale gerekli" />
                  : <Pill durum="uyumlu" etiket="Takvimde" />}</span>
              </div>
              <div className="band-hucre">
                <span className="mikro-etiket">Yaklaşan denetim</span>
                <span className="metrik-buyuk" style={{ fontSize: 'clamp(1.4rem,2vw,1.9rem)' }}>
                  {siradakiDenetim ? siradakiDenetim.regulasyon.kod : '—'}
                </span>
                {kalanGun !== null && (
                  <span className="filtreler">
                    <Pill durum={kalanGun < 30 ? 'kismi' : 'incelemede'} etiket={`${kalanGun} gün`} />
                    <span className="mikro-etiket">{tarihTR(siradakiDenetim?.bitis)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {onayKuyrugu.length > 0 && (
          <Link href="/ice-aktarim" className="kart tikla belir gorunur" style={{ display: 'block' }}>
            <div className="kart-icerik" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
              <span className="dot nabiz" style={{ background: 'var(--accent)', width: 10, height: 10 }} />
              <div style={{ flex: 1 }}>
                <strong>{onayKuyrugu.length} içe aktarım onay bekliyor</strong>
                <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-sm)' }}>
                  {onayKuyrugu.map((a) => `${a.regulasyon.kod} · ${a.kaynakAdi}`).join(' — ')}
                </div>
              </div>
              <span className="btn kucuk">İncele →</span>
            </div>
          </Link>
        )}

        {(acikGorevler > 0 || bekleyenOnaylar > 0 || projeAdaylari > 0) && (
          <div className="filtreler belir gorunur">
            {acikGorevler > 0 && (
              <Link href="/gorevler" className="pill durum-kismi">
                <span className="dot" />{acikGorevler} açık görev
              </Link>
            )}
            {bekleyenOnaylar > 0 && (
              <Link href="/gorevler" className="pill durum-incelemede">
                <span className="dot nabiz" />{bekleyenOnaylar} onay bekliyor
              </Link>
            )}
            {projeAdaylari > 0 && (
              <Link href="/projeler" className="pill durum-incelemede">
                <span className="dot" />{projeAdaylari} proje adayı öneride
              </Link>
            )}
            <Link href="/riskler" className={`pill durum-${acikRiskSayisi > 0 ? 'uyumsuz' : 'uyumlu'}`}>
              <span className="dot" />{acikRiskSayisi} açık risk
            </Link>
          </div>
        )}

        <section className="belir">
          <div className="sahne-baslik">
            <span className="no">01</span><h2>Santral ısı haritası</h2><span className="cizgi" />
            <Link className="btn kucuk" href="/tesisler">Santral 360 →</Link>
          </div>
          <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
            <div className="tablo-sar">
              <table className="matris" style={{ width: '100%' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left' }}>Tesis ↓ · Süreç →</th>
                  {aktifSurecler.map((s) => <th key={s.id} title={s.ad}>{s.regulasyon.kod}</th>)}
                </tr></thead>
                <tbody>
                  {tesisler.map((tesis) => (
                    <tr key={tesis.id}>
                      <th title={`${tesis.ad} · ${tesis.kod}`}>
                        <Link href={`/tesisler/${tesis.id}`} style={{ display: 'block',
                          maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', fontFamily: 'var(--font-ui)',
                          fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{tesis.ad}</Link>
                        {/* İkincil kod satırı --text-3 ile AA altındaydı
                            (açık 4,2:1 / koyu 4,3:1) — bir kademe yukarı. */}
                        <span className="mono" style={{ color: 'var(--text-2)',
                          fontSize: 'var(--fs-micro)' }}>{tesis.kod}</span>
                      </th>
                      {aktifSurecler.map((surec) => {
                        const hucre = tesisSayilari.get(surec.id)?.get(tesis.id);
                        if (!hucre) return <td key={surec.id}><span style={{ opacity: .25 }}>·</span></td>;
                        const ozet = uyumOzeti(hucre);
                        const renk = ozet.yuzde === null ? 'degerlendirilmedi'
                          : ozet.yuzde >= 85 ? 'uyumlu' : ozet.yuzde >= 60 ? 'kismi' : 'uyumsuz';
                        return (
                          <td key={surec.id}>
                            <Link href={`/surecler/${surec.id}`} className={`hucre durum-${renk}`}
                              style={{ display: 'grid', placeItems: 'center', minHeight: 26, borderRadius: 4,
                                fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)' }}
                              title={`${tesis.ad} × ${surec.kod}: ${ozet.yuzde === null ? 'değerlendirilmedi' : `%${ozet.yuzde}`} · bilinmeyen %${ozet.bilinmeyenOran ?? 0}`}>
                              {ozet.yuzde === null ? '—' : `%${ozet.yuzde}`}
                            </Link>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="belir">
          <div className="sahne-baslik">
            <span className="no">02</span><h2>Uyum süreçleri</h2><span className="cizgi" />
            <Link className="btn kucuk" href="/surecler">Tümü →</Link>
          </div>
          <div className="kpi-grid" style={{ marginTop: 'var(--sp-4)', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
            {aktifSurecler.map((s) => {
              const sayilar = surecSayilari.get(s.id) ?? {};
              const yuzde = uyumYuzdesi(sayilar);
              const tesisler = s.kapsam.map((k) => k.tesis);
              const tKirilim = tesisSayilari.get(s.id) ?? new Map<string, DurumSayilari>();
              return (
                <Link key={s.id} href={`/surecler/${s.id}`} className="kart tikla" style={{ display: 'block' }}>
                  <div className="kart-baslik">
                    <div>
                      <span className="mikro-etiket">{s.regulasyon.kod} · {s.kod}</span>
                      <h3 style={{ marginTop: 2 }}>{s.ad}</h3>
                    </div>
                    <Pill durum={SUREC_DURUM_RENGI[s.durum as SurecDurum]}
                      etiket={SUREC_DURUM_ETIKET[s.durum as SurecDurum]} />
                  </div>
                  <div className="kart-icerik" style={{ display: 'flex', gap: 'var(--sp-5)', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: .55, pointerEvents: 'none' }}>
                      <TesisKapagi tipKod={tesisler[0]?.tip?.kod} genis />
                    </div>
                    <Halka yuzde={yuzde} />
                    <div className="mini-cubuklar" style={{ flex: 1, minWidth: 0 }}>
                      {tesisler.slice(0, 5).map((t) => {
                        const td = tKirilim.get(t.id) ?? {};
                        const ty = uyumYuzdesi(td);
                        return (
                          <div key={t.id} className="mini-cubuk">
                            <span className="etiket" title={t.ad}>{t.kod}</span>
                            <SegBar sayilar={td} yukseklik={6} />
                            <span className="sayi">{ty === null ? '—' : `%${ty}`}</span>
                          </div>
                        );
                      })}
                      {tesisler.length === 0 && (
                        <span style={{ color: 'var(--text-3)', fontSize: 'var(--fs-xs)' }}>
                          Kapsama tesis eklenmemiş
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
            {aktifSurecler.length === 0 && (
              <div className="kart"><Bos baslik="Aktif süreç yok"
                altMetin="Uyum süreçleri ekranından yeni dönem başlatın." /></div>
            )}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: 'var(--sp-6)' }}>
          <section className="belir">
            <div className="sahne-baslik">
              <span className="no">03</span><h2>Açık bulgular</h2><span className="cizgi" />
              <Link className="btn kucuk" href="/bulgular">Tümü →</Link>
            </div>
            <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
              <div className="kart-icerik sifir">
                {acikBulgular.length === 0 && <Bos baslik="Açık bulgu yok" />}
                {acikBulgular.slice(0, 6).map((b) => (
                  <Link key={b.id} href={`/bulgular/${b.id}`}
                    className="hucre-madde" style={{
                      padding: 'var(--sp-3) var(--sp-5)', borderBottom: '1px solid var(--border)',
                    }}>
                    <span className={`serit serit-${ONEM_DURUM_RENGI[b.onemDerecesi as Onem]}`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ad" style={{ fontWeight: 500 }}>{b.baslik}</div>
                      <div className="mikro-etiket" style={{ letterSpacing: '.04em' }}>
                        {b.maddeDurumu.madde.kod} · {b.maddeDurumu.tesis.kod}
                        {b.hedefTarih && ` · hedef ${tarihTR(b.hedefTarih)}`}
                      </div>
                    </div>
                    <Pill durum={ONEM_DURUM_RENGI[b.onemDerecesi as Onem]}
                      etiket={ONEM_ETIKET[b.onemDerecesi as Onem]}
                      hollow={b.onemDerecesi === 'yuksek'} />
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="belir">
            <div className="sahne-baslik">
              <span className="no">04</span><h2>Son aktivite</h2><span className="cizgi" />
              <Link className="btn kucuk" href="/aktivite">Tümü →</Link>
            </div>
            <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
              <div className="kart-icerik">
                <ul className="zaman">
                  {aktiviteler.map((a, i) => (
                    <li key={a.id} className="zaman-oge">
                      <span className={`zaman-nokta${i === 0 ? ' vurgu' : ''}`} />
                      <div className="zaman-ust">
                        <span className="aktor">{a.aktor?.adSoyad ?? 'Sistem'}</span>
                        <span style={{ color: 'var(--text-2)' }}>
                          {eylemCumlesi(a.eylem, a.varlikTipi, a.alan)}
                        </span>
                        <span className="an">{tarihTR(a.zaman)}</span>
                      </div>
                      {(a.oncekiDeger || a.yeniDeger) && (
                        <div className="zaman-govde">
                          <span className="fark">
                            {a.oncekiDeger && <span className="eski">{etiketle(a.oncekiDeger)}</span>}
                            {a.oncekiDeger && a.yeniDeger && '→'}
                            {a.yeniDeger && <span className="yeni">{etiketle(a.yeniDeger)}</span>}
                          </span>
                        </div>
                      )}
                      {a.dosyaAdi && <div className="zaman-govde mono">{a.dosyaAdi}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

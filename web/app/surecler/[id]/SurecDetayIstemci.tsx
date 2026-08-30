'use client';
import { useMemo, useState } from 'react';
import Kip from '@/components/Kip';
import { Pill, SegBar, Halka, Bos, type DurumSayilari } from '@/components/ui';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { useEylem } from '@/components/useEylem';
import { maddeDurumGuncelle, bulguOlustur, kanitEkle } from '@/lib/eylemler';
import {
  DURUMLAR, DURUM_ETIKET, ONEM_DERECELERI, ONEM_ETIKET, ONEM_DURUM_RENGI,
  uyumYuzdesi, uyumOzeti, tarihTR, kanitTazelik,
  type Durum, type Onem,
} from '@/lib/sabitler';

type Madde = {
  id: string; kod: string; baslik: string; metin: string;
  ustMaddeId: string | null; kanitTipi: string | null;
  alanlar: string[]; esler: { kod: string; denklik: string }[];
};
type DurumKaydi = {
  id: string; maddeId: string; tesisId: string; durum: string; not: string | null;
  sorumlu: { id: string; ad: string } | null; sonDegerlendirme: string | null;
  bulgular: { id: string; durum: string; onemDerecesi: string; baslik: string }[];
  kanitlar: { id: string; ad: string; tip: string; baslangic: string }[];
};
type Veri = {
  id: string; kod: string; ad: string; durum: string;
  baslangic: string | null; bitis: string | null; aciklama: string | null;
  regulasyon: { id: string; kod: string; ad: string };
  tesisler: { id: string; kod: string; ad: string; tip: string | null }[];
  maddeler: Madde[]; durumlar: DurumKaydi[];
  kullanicilar: { id: string; ad: string }[];
  alanlar: { id: string; kod: string; ad: string }[];
};

export default function SurecDetayIstemci({ veri }: { veri: Veri }) {
  const [tesisF, setTesisF] = useState<string>('hepsi');
  const [durumF, setDurumF] = useState<string>('hepsi');
  const [alanF, setAlanF] = useState<string>('hepsi');
  const [arama, setArama] = useState('');
  const [acikMadde, setAcikMadde] = useState<Madde | null>(null);

  const durumIdx = useMemo(() => {
    const m = new Map<string, DurumKaydi[]>();
    for (const d of veri.durumlar) {
      const l = m.get(d.maddeId) ?? [];
      l.push(d); m.set(d.maddeId, l);
    }
    return m;
  }, [veri.durumlar]);

  const cocuklar = useMemo(() => {
    const m = new Map<string | null, Madde[]>();
    for (const md of veri.maddeler) {
      const l = m.get(md.ustMaddeId) ?? [];
      l.push(md); m.set(md.ustMaddeId, l);
    }
    return m;
  }, [veri.maddeler]);

  // filtrelenen yaprak kümesi
  const yaprakGorunur = (md: Madde): boolean => {
    if (alanF !== 'hepsi' && !md.alanlar.includes(alanF)) return false;
    if (arama && !(`${md.kod} ${md.baslik}`.toLocaleLowerCase('tr-TR')
      .includes(arama.toLocaleLowerCase('tr-TR')))) return false;
    const kayitlar = (durumIdx.get(md.id) ?? [])
      .filter((d) => tesisF === 'hepsi' || d.tesisId === tesisF);
    if (durumF !== 'hepsi' && !kayitlar.some((d) => d.durum === durumF)) return false;
    return true;
  };

  const gorunurMu = (md: Madde): boolean => {
    const altlar = cocuklar.get(md.id) ?? [];
    if (altlar.length === 0) return yaprakGorunur(md);
    return altlar.some(gorunurMu);
  };

  const seciliSayilar: DurumSayilari = useMemo(() => {
    const s: DurumSayilari = {};
    for (const d of veri.durumlar) {
      if (tesisF !== 'hepsi' && d.tesisId !== tesisF) continue;
      s[d.durum as Durum] = (s[d.durum as Durum] ?? 0) + 1;
    }
    return s;
  }, [veri.durumlar, tesisF]);

  const acikBulguSayisi = veri.durumlar
    .filter((d) => tesisF === 'hepsi' || d.tesisId === tesisF)
    .reduce((a, d) => a + d.bulgular.filter((b) => b.durum !== 'kapali').length, 0);

  return (
    <>
      <div className="kapsam-cubugu">
        ⛨ <strong>{veri.regulasyon.kod}</strong> · {veri.kod} kapsamında görüntülüyorsunuz
        {tesisF !== 'hepsi' && <> · tesis: <strong>
          {veri.tesisler.find((t) => t.id === tesisF)?.kod}</strong></>}
      </div>

      <div className="kart">
        <div className="band">
          <div className="band-hucre" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--sp-5)' }}>
            <Halka yuzde={uyumYuzdesi(seciliSayilar)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', flex: 1 }}>
              <span className="mikro-etiket">Uyum · {tesisF === 'hepsi' ? 'tüm kapsam' : 'seçili tesis'}</span>
              <SegBar sayilar={seciliSayilar} />
              {(uyumOzeti(seciliSayilar).bilinmeyenOran ?? 0) > 0 && (
                <span className="mikro-etiket" title="Değerlendirilmemiş + incelemede — yüzdeye dahil değil, ayrı izlenir">
                  BİLİNMEYEN: %{uyumOzeti(seciliSayilar).bilinmeyenOran} — yüzde yalnız değerlendirilenleri anlatır
                </span>
              )}
            </div>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Açık bulgu</span>
            <span className="metrik-buyuk">{acikBulguSayisi}</span>
          </div>
          <div className="band-hucre">
            <span className="mikro-etiket">Denetim tarihi</span>
            <span className="metrik-buyuk" style={{ fontSize: 'var(--fs-h2)' }}>{tarihTR(veri.bitis)}</span>
            <span className="mikro-etiket">{veri.aciklama ?? ''}</span>
          </div>
        </div>
      </div>

      <div className="filtreler">
        <input className="inp" placeholder="Madde ara… (kod veya başlık)" value={arama}
          onChange={(e) => setArama(e.target.value)} style={{ minWidth: 220 }} />
        <select className="sec" value={tesisF} onChange={(e) => setTesisF(e.target.value)}>
          <option value="hepsi">Tüm tesisler</option>
          {veri.tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
        </select>
        <select className="sec" value={durumF} onChange={(e) => setDurumF(e.target.value)}>
          <option value="hepsi">Tüm durumlar</option>
          {DURUMLAR.map((d) => <option key={d} value={d}>{DURUM_ETIKET[d]}</option>)}
        </select>
        <select className="sec" value={alanF} onChange={(e) => setAlanF(e.target.value)}>
          <option value="hepsi">Tüm alanlar</option>
          {veri.alanlar.map((a) => <option key={a.id} value={a.kod}>{a.kod}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn yazdirmada-gizle" onClick={pdfYazdir}>🖨 PDF</button>
        <button className="btn yazdirmada-gizle" onClick={() => exceleAktar(veri.kod, [{
          ad: 'Madde durumları', satirlar: [
            ['Madde', 'Başlık', 'Tesis', 'Durum', 'Sorumlu', 'Son değerlendirme', 'Açık bulgu', 'Kanıt'],
            ...veri.durumlar
              .filter((d) => tesisF === 'hepsi' || d.tesisId === tesisF)
              .map((d) => {
                const m = veri.maddeler.find((x) => x.id === d.maddeId);
                const t = veri.tesisler.find((x) => x.id === d.tesisId);
                return [m?.kod ?? '', m?.baslik ?? '', t?.kod ?? '',
                  DURUM_ETIKET[d.durum as Durum] ?? d.durum, d.sorumlu?.ad ?? '',
                  d.sonDegerlendirme ? tarihTR(d.sonDegerlendirme) : '',
                  d.bulgular.filter((b) => b.durum !== 'kapali').length, d.kanitlar.length];
              }) ] }])}>⤓ Excel</button>
      </div>

      <div className="kart agac">
        {(cocuklar.get(null) ?? []).filter(gorunurMu).map((bolum) => (
          <Bolum key={bolum.id} madde={bolum} cocuklar={cocuklar} durumIdx={durumIdx}
            tesisF={tesisF} gorunurMu={gorunurMu} yaprakGorunur={yaprakGorunur}
            tesisler={veri.tesisler} ac={setAcikMadde} derinlik={0} />
        ))}
        {(cocuklar.get(null) ?? []).filter(gorunurMu).length === 0 && (
          <Bos baslik="Eşleşen madde yok" altMetin="Filtreleri gevşetmeyi deneyin." />
        )}
      </div>

      <Kip acik={!!acikMadde} kapat={() => setAcikMadde(null)} genis
        baslik={acikMadde?.baslik ?? ''}
        ust={<span className="mikro-etiket">{acikMadde?.kod}
          {acikMadde?.alanlar.map((a) => ` · ${a}`)}</span>}>
        {acikMadde && (
          <MaddeDetay madde={acikMadde}
            kayitlar={(durumIdx.get(acikMadde.id) ?? [])}
            tesisler={veri.tesisler} kullanicilar={veri.kullanicilar} />
        )}
      </Kip>
    </>
  );
}

function Bolum({ madde, cocuklar, durumIdx, tesisF, gorunurMu, yaprakGorunur, tesisler, ac, derinlik }: {
  madde: Madde; cocuklar: Map<string | null, Madde[]>;
  durumIdx: Map<string, DurumKaydi[]>; tesisF: string;
  gorunurMu: (m: Madde) => boolean; yaprakGorunur: (m: Madde) => boolean;
  tesisler: Veri['tesisler']; ac: (m: Madde) => void; derinlik: number;
}) {
  const altlar = (cocuklar.get(madde.id) ?? []);
  if (altlar.length === 0) {
    return <YaprakSatir madde={madde} kayitlar={durumIdx.get(madde.id) ?? []}
      tesisF={tesisF} tesisler={tesisler} ac={ac} derinlik={derinlik} />;
  }
  // bölümün altındaki tüm yaprakların durum dağılımı
  const sayilar: DurumSayilari = {};
  const topla = (m: Madde) => {
    const l = cocuklar.get(m.id) ?? [];
    if (l.length === 0) {
      for (const d of durumIdx.get(m.id) ?? []) {
        if (tesisF !== 'hepsi' && d.tesisId !== tesisF) continue;
        sayilar[d.durum as Durum] = (sayilar[d.durum as Durum] ?? 0) + 1;
      }
    } else l.forEach(topla);
  };
  topla(madde);

  return (
    <details open>
      <summary>
        <div className="bolum-satir" style={{ paddingLeft: `calc(var(--sp-4) + ${derinlik} * var(--sp-6))` }}>
          <span className="ok">▸</span>
          <span className="chip mono">{madde.kod}</span>
          <span style={{ flex: 1 }}>{madde.baslik}</span>
          <div style={{ width: 130 }}><SegBar sayilar={sayilar} yukseklik={6} /></div>
        </div>
      </summary>
      {altlar.filter(gorunurMu).map((alt) => (
        <Bolum key={alt.id} madde={alt} cocuklar={cocuklar} durumIdx={durumIdx}
          tesisF={tesisF} gorunurMu={gorunurMu} yaprakGorunur={yaprakGorunur}
          tesisler={tesisler} ac={ac} derinlik={derinlik + 1} />
      ))}
    </details>
  );
}

function YaprakSatir({ madde, kayitlar, tesisF, tesisler, ac, derinlik }: {
  madde: Madde; kayitlar: DurumKaydi[]; tesisF: string;
  tesisler: Veri['tesisler']; ac: (m: Madde) => void; derinlik: number;
}) {
  const gorunen = kayitlar.filter((d) => tesisF === 'hepsi' || d.tesisId === tesisF);
  const bulguSayisi = gorunen.reduce((a, d) => a + d.bulgular.filter((b) => b.durum !== 'kapali').length, 0);
  const kanitSayisi = gorunen.reduce((a, d) => a + d.kanitlar.length, 0);
  const sorumlular = [...new Set(gorunen.map((d) => d.sorumlu?.ad).filter(Boolean))] as string[];
  // baskın durum: en kötüsü öne
  const oncelik: Durum[] = ['uyumsuz', 'kismi', 'incelemede', 'uyumlu', 'kapsamdisi'];
  const baskin = oncelik.find((d) => gorunen.some((g) => g.durum === d));

  return (
    <button className="satir" onClick={() => ac(madde)} style={{
      width: '100%', textAlign: 'left', background: 'none', border: 'none',
      borderBottom: '1px solid var(--border)', cursor: 'pointer',
      font: 'inherit', color: 'inherit',
      paddingLeft: `calc(var(--sp-4) + ${derinlik} * var(--sp-6) + 22px)`,
    }}>
      <span className={`serit serit-${baskin ?? 'incelemede'}`} />
      <span className="chip mono">{madde.kod}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {madde.baslik}
      </span>
      <span className="sirada-gizli filtreler" style={{ flexWrap: 'nowrap' }}>
        {sorumlular.slice(0, 2).map((s) => <span key={s} className="chip">{s}</span>)}
        {madde.esler.slice(0, 2).map((e) => <span key={e.kod} className="chip mono">⇄ {e.kod}</span>)}
        {kanitSayisi > 0 && <span className="chip">🗎 {kanitSayisi}</span>}
      </span>
      {bulguSayisi > 0 && <Pill durum="uyumsuz" etiket={`${bulguSayisi} bulgu`} hollow />}
      {tesisF === 'hepsi' ? (
        <span style={{ display: 'inline-flex', gap: 4 }}>
          {gorunen.map((d) => (
            <span key={d.id} className={`dot`} title={`${tesisler.find((t) => t.id === d.tesisId)?.kod}: ${DURUM_ETIKET[d.durum as Durum]}`}
              style={{ background: `var(--${d.durum}-dot)` }} />
          ))}
        </span>
      ) : (
        baskin && <Pill durum={baskin} />
      )}
    </button>
  );
}

function MaddeDetay({ madde, kayitlar, tesisler, kullanicilar }: {
  madde: Madde; kayitlar: DurumKaydi[];
  tesisler: Veri['tesisler']; kullanicilar: Veri['kullanicilar'];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [bulguFormu, setBulguFormu] = useState<string | null>(null); // durumKaydi id
  const [kanitFormu, setKanitFormu] = useState<string | null>(null);
  const [yeniBulgu, setYeniBulgu] = useState({ baslik: '', aciklama: '', onem: 'orta', hedef: '' });
  const [yeniKanit, setYeniKanit] = useState({ ad: '', tip: 'kayit' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <p style={{ margin: 0, color: 'var(--text-2)' }}>{madde.metin}</p>
      {madde.esler.length > 0 && (
        <div className="filtreler">
          <span className="mikro-etiket">EŞLEŞTİRMELER</span>
          {madde.esler.map((e) => (
            <span key={e.kod} className="chip mono" title={e.denklik}>⇄ {e.kod}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {kayitlar.map((d) => {
          const tesis = tesisler.find((t) => t.id === d.tesisId);
          return (
            <div key={d.id} className="kart" style={{ boxShadow: 'none' }}>
              <div className="kart-baslik" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                <span className="chip mono">{tesis?.kod ?? '?'}</span>
                <span style={{ flex: 1, fontSize: 'var(--fs-sm)', color: 'var(--text-2)' }}>{tesis?.ad}</span>
                <select className="sec" value={d.sorumlu?.id ?? ''} disabled={bekliyor}
                  title="Sorumlu ata"
                  onChange={(e) => calistir(() => maddeDurumGuncelle({
                    id: d.id, durum: d.durum, sorumluId: e.target.value || null }))}>
                  <option value="">Sorumlu yok</option>
                  {kullanicilar.map((u) => <option key={u.id} value={u.id}>{u.ad}</option>)}
                </select>
                <select className="sec" value={d.durum} disabled={bekliyor}
                  onChange={(e) => calistir(() => maddeDurumGuncelle({ id: d.id, durum: e.target.value }))}>
                  {DURUMLAR.map((x) => <option key={x} value={x}>{DURUM_ETIKET[x]}</option>)}
                </select>
              </div>
              <div className="kart-icerik" style={{ padding: 'var(--sp-3) var(--sp-4)', display: 'flex',
                flexDirection: 'column', gap: 'var(--sp-2)' }}>
                <div className="filtreler" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>
                  {d.sorumlu && <span className="chip">Sorumlu: {d.sorumlu.ad}</span>}
                  {d.sonDegerlendirme && <span className="chip">Son değerlendirme: {tarihTR(d.sonDegerlendirme)}</span>}
                  {d.not && <span className="chip" title={d.not}>Not var</span>}
                </div>

                {d.bulgular.length > 0 && (
                  <div className="filtreler">
                    {d.bulgular.map((b) => (
                      <a key={b.id} href={`/bulgular/${b.id}`}
                        className={`pill durum-${b.durum === 'kapali' ? 'uyumlu' : ONEM_DURUM_RENGI[b.onemDerecesi as Onem]}`}
                        title={b.baslik}>
                        <span className="dot" />{b.baslik.slice(0, 40)}{b.baslik.length > 40 && '…'}
                      </a>
                    ))}
                  </div>
                )}
                {d.kanitlar.length > 0 && (
                  <div className="filtreler">
                    {d.kanitlar.map((kn) => {
                      const taze = kanitTazelik(new Date(kn.baslangic));
                      return (
                        <span key={kn.id} className={`pill durum-${taze.durum}`}
                          title={`${taze.etiket} · ${taze.gun} gün`}>
                          🗎 {kn.ad}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="filtreler sirada-gizli">
                  <button className="btn kucuk" onClick={() => { setBulguFormu(bulguFormu === d.id ? null : d.id); setKanitFormu(null); }}>
                    + Bulgu
                  </button>
                  <button className="btn kucuk" onClick={() => { setKanitFormu(kanitFormu === d.id ? null : d.id); setBulguFormu(null); }}>
                    + Kanıt
                  </button>
                </div>

                {bulguFormu === d.id && (
                  <div className="form-izgara" style={{ marginTop: 'var(--sp-2)' }}>
                    <input className="inp" placeholder="Bulgu başlığı" value={yeniBulgu.baslik}
                      onChange={(e) => setYeniBulgu({ ...yeniBulgu, baslik: e.target.value })}
                      style={{ gridColumn: '1/-1' }} />
                    <textarea className="inp" rows={2} placeholder="Açıklama" value={yeniBulgu.aciklama}
                      onChange={(e) => setYeniBulgu({ ...yeniBulgu, aciklama: e.target.value })}
                      style={{ gridColumn: '1/-1' }} />
                    <select className="sec" value={yeniBulgu.onem}
                      onChange={(e) => setYeniBulgu({ ...yeniBulgu, onem: e.target.value })}>
                      {ONEM_DERECELERI.map((o) => <option key={o} value={o}>{ONEM_ETIKET[o]}</option>)}
                    </select>
                    <input className="inp" type="date" value={yeniBulgu.hedef}
                      onChange={(e) => setYeniBulgu({ ...yeniBulgu, hedef: e.target.value })} />
                    <button className="btn birincil" disabled={bekliyor}
                      onClick={() => calistir(() => bulguOlustur({
                        maddeDurumuId: d.id, baslik: yeniBulgu.baslik, aciklama: yeniBulgu.aciklama,
                        onemDerecesi: yeniBulgu.onem, hedefTarih: yeniBulgu.hedef || null,
                      }), () => { setBulguFormu(null); setYeniBulgu({ baslik: '', aciklama: '', onem: 'orta', hedef: '' }); })}>
                      Bulgu aç
                    </button>
                  </div>
                )}
                {kanitFormu === d.id && (
                  <div className="form-izgara" style={{ marginTop: 'var(--sp-2)' }}>
                    <input className="inp" placeholder="Kanıt adı (dosya/kayıt)" value={yeniKanit.ad}
                      onChange={(e) => setYeniKanit({ ...yeniKanit, ad: e.target.value })} />
                    <select className="sec" value={yeniKanit.tip}
                      onChange={(e) => setYeniKanit({ ...yeniKanit, tip: e.target.value })}>
                      {['politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor'].map((t) =>
                        <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button className="btn birincil" disabled={bekliyor}
                      onClick={() => calistir(() => kanitEkle({
                        maddeDurumuId: d.id, ad: yeniKanit.ad, tip: yeniKanit.tip,
                      }), () => { setKanitFormu(null); setYeniKanit({ ad: '', tip: 'kayit' }); })}>
                      Kanıt ekle
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {kayitlar.length === 0 && (
          <Bos baslik="Bu madde için kayıt yok"
            altMetin="Süreç kapsamına tesis eklendiğinde durum kayıtları açılır." />
        )}
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
    </div>
  );
}

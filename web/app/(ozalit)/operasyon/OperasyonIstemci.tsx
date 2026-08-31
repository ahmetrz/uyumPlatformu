'use client';
import { useState } from 'react';
import Kip from '@/components/Kip';
import { Pill, Bos } from '@/components/ui';
import { useEylem } from '@/components/useEylem';
import {
  degisiklikKaydet, degisiklikIlerlet, degisiklikGeriAl, olayKaydet,
  yedeklemePolitikasiKaydet, yedeklemeKosusuKaydet, restoreTestiKaydet,
  tedarikciKaydet, sertifikaKaydet,
} from '@/lib/eylemler2/operasyon';
import { hesapKaydet, erisimIncele } from '@/lib/eylemler2/kimlik';
import { tarihTR, zamanTR, gecenGun, type Durum } from '@/lib/sabitler';

function sertifikaDurumu(bitis: string): { etiket: string; durum: Durum } {
  const gunKaldi = -gecenGun(bitis); // gelecek tarihte negatif geçen = kalan
  if (gunKaldi < 0) return { etiket: 'Süresi doldu', durum: 'uyumsuz' };
  if (gunKaldi < 30) return { etiket: `${gunKaldi} gün kaldı`, durum: 'kismi' };
  return { etiket: `${gunKaldi} gün`, durum: 'uyumlu' };
}

type Degisiklik = {
  id: string; kod: string; baslik: string; aciklama: string | null;
  tesisKod: string | null; tesisAd: string | null;
  tesisId: string | null; varlikEtiketi: string | null;
  otMu: boolean; durum: string; saglayiciOnayi: boolean | null;
  bakimPenceresi: string | null; geriAlmaPlani: string | null;
  onDegisiklikYedegi: boolean | null; uretimEtkisi: string | null;
  sonDogrulama: string | null; talepEden: string | null; onaylayan: string | null;
  planTarihi: string | null;
};
type Olay = { id: string; kod: string; baslik: string; tip: string; siddet: string;
  durum: string; tesisKod: string | null; tesisAd: string | null; tesisId: string | null;
  ozet: string | null; baslangic: string };
type Politika = { id: string; ad: string; kapsam: string | null; siklik: string | null;
  saklamaGun: number | null; hedef: string | null;
  kosular: { id: string; zaman: string; durum: string; boyutMb: number | null;
    hata: string | null; restoreTestleri: { sonuc: string; zaman: string }[] }[] };
type Tedarikci = { id: string; ad: string; tip: string | null; uzaktanErisimVar: boolean;
  kritiklik: string; sozlesmeSayisi: number; varlikSayisi: number };
type Sertifika = { id: string; ad: string; veren: string | null;
  varlikEtiketi: string | null; bitis: string };
type Hesap = {
  id: string; hesapAdi: string; tip: string; ayricalikli: boolean | null;
  tesisKod: string | null; tesisAd: string | null;
  tesisId: string | null; kaynakSistem: string | null;
  durum: string; parolaRotasyon: string | null;
  atamalar: { id: string; kapsam: string | null; yetkiSeviyesi: string | null;
    varlikEtiketi: string | null; bitis: string | null;
    sonInceleme: { sonuc: string; inceleyen: string | null; zaman: string } | null }[];
};

const DEGISIKLIK_ETIKET: Record<string, { ad: string; renk: Durum }> = {
  talep: { ad: 'Talep', renk: 'incelemede' }, onay: { ad: 'Onaylandı', renk: 'incelemede' },
  planlandi: { ad: 'Planlandı', renk: 'kismi' }, uygulandi: { ad: 'Uygulandı', renk: 'kismi' },
  dogrulandi: { ad: 'Doğrulandı', renk: 'uyumlu' }, geri_alindi: { ad: 'Geri alındı', renk: 'uyumsuz' },
};
const SIDDET_RENK: Record<string, Durum> = {
  dusuk: 'kapsamdisi', orta: 'kismi', yuksek: 'uyumsuz', kritik: 'uyumsuz' };
const OLAY_DURUM: Record<string, { ad: string; renk: Durum }> = {
  acik: { ad: 'Açık', renk: 'uyumsuz' }, mudahale: { ad: 'Müdahale', renk: 'kismi' },
  cozuldu: { ad: 'Çözüldü', renk: 'uyumlu' }, kapali: { ad: 'Kapalı', renk: 'kapsamdisi' } };

export default function OperasyonIstemci({ degisiklikler, olaylar, politikalar, tedarikciler, sertifikalar, tesisler, hesaplar }: {
  degisiklikler: Degisiklik[]; olaylar: Olay[]; politikalar: Politika[];
  tedarikciler: Tedarikci[]; sertifikalar: Sertifika[];
  tesisler: { id: string; kod: string; ad: string }[]; hesaplar: Hesap[];
}) {
  const [sekme, setSekme] = useState<'degisiklik' | 'olay' | 'yedek' | 'tedarikci' | 'kimlik'>('degisiklik');
  return (
    <>
      <div className="filtreler">
        {([['degisiklik', `Değişiklikler (${degisiklikler.filter((d) => d.durum !== 'dogrulandi' && d.durum !== 'geri_alindi').length})`],
          ['olay', `Olaylar (${olaylar.filter((o) => o.durum === 'acik' || o.durum === 'mudahale').length})`],
          ['yedek', 'Yedekleme & DR'], ['tedarikci', 'Tedarikçi & sertifika'],
          ['kimlik', `Kimlik & erişim (${hesaplar.filter((h) => h.ayricalikli === true && h.durum === 'aktif').length}⚿)`]] as const)
          .map(([kod, ad]) => (
            <button key={kod} className={`btn${sekme === kod ? ' birincil' : ''}`}
              onClick={() => setSekme(kod)}>{ad}</button>
          ))}
      </div>
      {sekme === 'degisiklik' && <DegisiklikPaneli degisiklikler={degisiklikler} tesisler={tesisler} />}
      {sekme === 'olay' && <OlayPaneli olaylar={olaylar} tesisler={tesisler} />}
      {sekme === 'yedek' && <YedekPaneli politikalar={politikalar} />}
      {sekme === 'tedarikci' && <TedarikciPaneli tedarikciler={tedarikciler} sertifikalar={sertifikalar} />}
      {sekme === 'kimlik' && <KimlikPaneli hesaplar={hesaplar} tesisler={tesisler} />}
    </>
  );
}

/* ------------------------------------------------------ kimlik / erişim */

const HESAP_TIP_ETIKET: Record<string, string> = {
  kisi: 'Kişi', servis: 'Servis', paylasimli: 'Paylaşımlı', acil_durum: 'Acil durum' };

function KimlikPaneli({ hesaplar, tesisler }: {
  hesaplar: Hesap[]; tesisler: { id: string; kod: string; ad: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [yeni, setYeni] = useState({ hesapAdi: '', tip: 'servis', tesisId: '',
    kaynakSistem: '', ayricalikli: false });

  const rotasyonYasi = (t: string | null) => t === null ? null : gecenGun(t);

  return (
    <>
      <div className="filtreler">
        <span className="mikro-etiket">
          SERVİS HESAPLARI PAROLA ROTASYONUYLA İZLENİR · ATAMALAR DÖNEMSEL İNCELEMEDEN GEÇER (§9)
        </span>
      </div>
      <div className="kart"><div className="kart-icerik sifir">
        {hesaplar.map((h) => {
          const yas = rotasyonYasi(h.parolaRotasyon);
          const rotasyonDurumu: Durum = yas === null ? 'degerlendirilmedi'
            : yas > 180 ? 'uyumsuz' : yas > 90 ? 'kismi' : 'uyumlu';
          return (
            <div key={h.id} className="satir" style={{ alignItems: 'flex-start' }}>
              <span className="chip mono">{h.hesapAdi}</span>
              <span className="chip">{HESAP_TIP_ETIKET[h.tip] ?? h.tip}</span>
              {h.ayricalikli === true && <Pill durum="uyumsuz" etiket="Ayrıcalıklı" hollow />}
              {/* null = kaynak sistem söylemedi; 'ayrıcalıklı değil' diye gösterilmez */}
              {h.ayricalikli === null
                && <Pill durum="degerlendirilmedi" etiket="Ayrıcalık bilinmiyor" hollow />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mikro-etiket">
                  {h.tesisAd
                    ? <span title={h.tesisKod ?? undefined}>{h.tesisAd}</span> : 'grup'}
                  {' · '}{h.kaynakSistem ?? '?'}
                  {h.durum !== 'aktif' && ` · ${h.durum}`}
                </div>
                <div className="filtreler" style={{ marginTop: 4 }}>
                  {h.atamalar.map((a) => (
                    <span key={a.id} className="filtreler" style={{ gap: 4 }}>
                      <span className="chip" style={a.bitis ? { textDecoration: 'line-through', opacity: .6 } : undefined}
                        title={a.sonInceleme
                          ? `Son inceleme: ${a.sonInceleme.sonuc} (${a.sonInceleme.inceleyen ?? '?'}, ${tarihTR(a.sonInceleme.zaman)})`
                          : 'Hiç incelenmedi'}>
                        {a.varlikEtiketi ?? a.kapsam ?? '?'} · {a.yetkiSeviyesi ?? '?'}
                        {!a.sonInceleme && !a.bitis && ' · incelenmedi'}
                      </span>
                      {!a.bitis && (
                        <span className="filtreler sirada-gizli" style={{ gap: 2 }}>
                          <button className="btn kucuk" disabled={bekliyor} title="İnceleme: onayla"
                            onClick={() => calistir(() => erisimIncele({ atamaId: a.id, sonuc: 'onaylandi' }))}>✓</button>
                          <button className="btn kucuk tehlike" disabled={bekliyor} title="İnceleme: kaldırılsın"
                            onClick={() => calistir(() => erisimIncele({ atamaId: a.id, sonuc: 'kaldirilsin' }))}>✕</button>
                        </span>
                      )}
                    </span>
                  ))}
                  {h.atamalar.length === 0 && <span className="mikro-etiket">ATAMA YOK</span>}
                </div>
              </div>
              <Pill durum={rotasyonDurumu}
                etiket={yas === null ? 'Rotasyon bilinmiyor' : `Rotasyon ${yas} gün önce`} />
            </div>
          );
        })}
        {hesaplar.length === 0 && <Bos baslik="Hesap kaydı yok" />}
        <div className="satir" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          <input className="inp" placeholder="hesap adı (svc_scada...)" value={yeni.hesapAdi}
            style={{ flex: 1, minWidth: 150 }}
            onChange={(e) => setYeni({ ...yeni, hesapAdi: e.target.value })} />
          <select className="sec" value={yeni.tip}
            onChange={(e) => setYeni({ ...yeni, tip: e.target.value })}>
            {Object.entries(HESAP_TIP_ETIKET).map(([kod, ad]) => <option key={kod} value={kod}>{ad}</option>)}
          </select>
          <select className="sec" value={yeni.tesisId}
            onChange={(e) => setYeni({ ...yeni, tesisId: e.target.value })}>
            <option value="">grup</option>
            {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
          </select>
          <input className="inp" placeholder="kaynak (AD/SCADA...)" value={yeni.kaynakSistem}
            style={{ width: 130 }}
            onChange={(e) => setYeni({ ...yeni, kaynakSistem: e.target.value })} />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)' }}>
            <input type="checkbox" checked={yeni.ayricalikli}
              onChange={(e) => setYeni({ ...yeni, ayricalikli: e.target.checked })} /> ayrıcalıklı
          </label>
          <button className="btn birincil kucuk" disabled={bekliyor}
            onClick={() => calistir(() => hesapKaydet({
              hesapAdi: yeni.hesapAdi, tip: yeni.tip, tesisId: yeni.tesisId || null,
              kaynakSistem: yeni.kaynakSistem || null, ayricalikli: yeni.ayricalikli,
            }), () => setYeni({ hesapAdi: '', tip: 'servis', tesisId: '', kaynakSistem: '', ayricalikli: false }))}>
            + Hesap</button>
        </div>
      </div></div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
    </>
  );
}

/* --------------------------------------------- değişiklik (OT kapılı) */

function DegisiklikPaneli({ degisiklikler, tesisler }: {
  degisiklikler: Degisiklik[]; tesisler: { id: string; kod: string; ad: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState<Degisiklik | 'yeni' | null>(null);
  const [dogrulamaNotu, setDogrulamaNotu] = useState('');

  return (
    <>
      <div className="filtreler">
        <span className="mikro-etiket">
          OT DEĞİŞİKLİĞİ EMNİYET KAPILARI: SAĞLAYICI ONAYI · BAKIM PENCERESİ · GERİ ALMA PLANI ·
          ÖN YEDEK · ÜRETİM ETKİSİ — TAMAMLANMADAN PLANLANAMAZ
        </span>
        <span style={{ flex: 1 }} />
        <button className="btn birincil" onClick={() => setAcik('yeni')}>+ Değişiklik talebi</button>
      </div>
      <div className="kart">
        <div className="kart-icerik sifir">
          {degisiklikler.map((d) => {
            const e = DEGISIKLIK_ETIKET[d.durum] ?? { ad: d.durum, renk: 'incelemede' as Durum };
            const kapilar = d.otMu ? [
              ['Sağlayıcı', d.saglayiciOnayi === true], ['Pencere', !!d.bakimPenceresi],
              ['Geri alma', !!d.geriAlmaPlani], ['Ön yedek', d.onDegisiklikYedegi === true],
              ['Üretim etkisi', !!d.uretimEtkisi]] as const : [];
            return (
              <div key={d.id} className="satir" style={{ cursor: 'pointer' }}
                onClick={() => { setAcik(d); setDogrulamaNotu(''); }}>
                <span className={`serit serit-${e.renk}`} />
                <span className="chip mono">{d.kod}</span>
                {d.otMu && <span className="chip">OT</span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{d.baslik}</div>
                  <div className="mikro-etiket">
                    {d.tesisAd
                      ? <span title={d.tesisKod ?? undefined}>{d.tesisAd}</span> : '—'}
                    {d.varlikEtiketi && ` · ${d.varlikEtiketi}`}
                    {d.planTarihi && ` · plan ${tarihTR(d.planTarihi)}`}
                  </div>
                </div>
                {d.otMu && d.durum !== 'dogrulandi' && (
                  <span className="filtreler sirada-gizli" style={{ flexWrap: 'nowrap' }}>
                    {kapilar.map(([ad, tamamMi]) => (
                      <span key={ad} className={`dot${tamamMi ? '' : ' hollow'}`}
                        title={`${ad}: ${tamamMi ? 'tamam' : 'eksik'}`}
                        style={{ color: tamamMi ? 'var(--uyumlu-dot)' : 'var(--kismi-dot)',
                          background: tamamMi ? 'var(--uyumlu-dot)' : 'transparent' }} />
                    ))}
                  </span>
                )}
                <Pill durum={e.renk} etiket={e.ad} />
              </div>
            );
          })}
          {degisiklikler.length === 0 && <Bos baslik="Değişiklik kaydı yok" />}
        </div>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      <Kip acik={acik !== null} kapat={() => setAcik(null)} genis
        baslik={acik === 'yeni' ? 'Yeni değişiklik talebi' : `${acik?.kod} — ${acik?.baslik ?? ''}`}
        ust={acik !== 'yeni' && acik?.otMu
          ? <span className="mikro-etiket">OT DEĞİŞİKLİĞİ — EMNİYET KAPILARI ZORUNLU</span> : undefined}>
        <DegisiklikFormu key={acik === 'yeni' ? 'yeni' : acik?.id ?? 'x'}
          degisiklik={acik === 'yeni' ? null : acik} tesisler={tesisler}
          kapat={() => setAcik(null)}
          dogrulamaNotu={dogrulamaNotu} setDogrulamaNotu={setDogrulamaNotu}
          bekliyor={bekliyor} calistir={calistir} />
      </Kip>
    </>
  );
}

function DegisiklikFormu({ degisiklik, tesisler, kapat, dogrulamaNotu, setDogrulamaNotu, bekliyor, calistir }: {
  degisiklik: Degisiklik | null; tesisler: { id: string; kod: string; ad: string }[];
  kapat: () => void; dogrulamaNotu: string; setDogrulamaNotu: (v: string) => void;
  bekliyor: boolean;
  calistir: (is: () => Promise<{ ok: true } | { ok: false; hata: string }>, sonra?: () => void) => void;
}) {
  const [v, setV] = useState({
    baslik: degisiklik?.baslik ?? '', aciklama: degisiklik?.aciklama ?? '',
    tesisId: degisiklik?.tesisId ?? '', varlikEtiketi: degisiklik?.varlikEtiketi ?? '',
    otMu: degisiklik?.otMu ?? false, planTarihi: degisiklik?.planTarihi?.slice(0, 10) ?? '',
    saglayiciOnayi: degisiklik?.saglayiciOnayi ?? false,
    bakimPenceresi: degisiklik?.bakimPenceresi ?? '',
    geriAlmaPlani: degisiklik?.geriAlmaPlani ?? '',
    onDegisiklikYedegi: degisiklik?.onDegisiklikYedegi ?? false,
    uretimEtkisi: degisiklik?.uretimEtkisi ?? '',
  });
  const kaydet = () => calistir(() => degisiklikKaydet({
    id: degisiklik?.id, baslik: v.baslik, aciklama: v.aciklama || null,
    tesisId: v.tesisId || null, varlikEtiketi: v.varlikEtiketi || null,
    otMu: v.otMu, planTarihi: v.planTarihi || null,
    saglayiciOnayi: v.otMu ? v.saglayiciOnayi : null,
    bakimPenceresi: v.otMu ? v.bakimPenceresi || null : null,
    geriAlmaPlani: v.otMu ? v.geriAlmaPlani || null : null,
    onDegisiklikYedegi: v.otMu ? v.onDegisiklikYedegi : null,
    uretimEtkisi: v.otMu ? v.uretimEtkisi || null : null,
  }), kapat);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="form-izgara">
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Başlık</span>
          <input className="inp" value={v.baslik}
            onChange={(e) => setV({ ...v, baslik: e.target.value })} /></label>
        <label className="form-satir"><span>Tesis</span>
          <select className="sec" value={v.tesisId}
            onChange={(e) => setV({ ...v, tesisId: e.target.value })}>
            <option value="">—</option>
            {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
          </select></label>
        <label className="form-satir"><span>Varlık etiketi</span>
          <input className="inp" value={v.varlikEtiketi} placeholder="ADANA-OTFW-01"
            onChange={(e) => setV({ ...v, varlikEtiketi: e.target.value })} /></label>
        <label className="form-satir"><span>Plan tarihi</span>
          <input className="inp" type="date" value={v.planTarihi}
            onChange={(e) => setV({ ...v, planTarihi: e.target.value })} /></label>
        <label className="form-satir" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <input type="checkbox" checked={v.otMu}
            onChange={(e) => setV({ ...v, otMu: e.target.checked })} />
          <span>OT değişikliği (emniyet kapıları devreye girer)</span></label>
        <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Açıklama</span>
          <textarea className="inp" rows={2} value={v.aciklama}
            onChange={(e) => setV({ ...v, aciklama: e.target.value })} /></label>
      </div>

      {v.otMu && (
        <div className="kart" style={{ boxShadow: 'none' }}>
          <div className="kart-baslik" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
            <h3 style={{ fontSize: 'var(--fs-sm)' }}>OT emniyet kapıları</h3>
            <span className="mikro-etiket">TAMAMLANMADAN PLANLANAMAZ</span>
          </div>
          <div className="kart-icerik form-izgara" style={{ padding: 'var(--sp-4)' }}>
            <label className="form-satir" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <input type="checkbox" checked={v.saglayiciOnayi}
                onChange={(e) => setV({ ...v, saglayiciOnayi: e.target.checked })} />
              <span>Sağlayıcı (vendor) onayı alındı</span></label>
            <label className="form-satir" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <input type="checkbox" checked={v.onDegisiklikYedegi}
                onChange={(e) => setV({ ...v, onDegisiklikYedegi: e.target.checked })} />
              <span>Değişiklik öncesi yedek alındı</span></label>
            <label className="form-satir"><span>Bakım penceresi</span>
              <input className="inp" value={v.bakimPenceresi} placeholder="12.10 02:00-05:00"
                onChange={(e) => setV({ ...v, bakimPenceresi: e.target.value })} /></label>
            <label className="form-satir"><span>Üretim etkisi</span>
              <input className="inp" value={v.uretimEtkisi} placeholder="Ünite-2 30 dk yedekte"
                onChange={(e) => setV({ ...v, uretimEtkisi: e.target.value })} /></label>
            <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Geri alma planı</span>
              <textarea className="inp" rows={2} value={v.geriAlmaPlani}
                onChange={(e) => setV({ ...v, geriAlmaPlani: e.target.value })} /></label>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {degisiklik && degisiklik.durum !== 'dogrulandi' && degisiklik.durum !== 'geri_alindi' && (
          <>
            {degisiklik.durum === 'uygulandi' && (
              <input className="inp" placeholder="Değişiklik-sonrası doğrulama notu (zorunlu)"
                value={dogrulamaNotu} onChange={(e) => setDogrulamaNotu(e.target.value)}
                style={{ flex: 1, minWidth: 220 }} />
            )}
            <button className="btn" disabled={bekliyor}
              onClick={() => calistir(() => degisiklikIlerlet({
                id: degisiklik.id, sonDogrulama: dogrulamaNotu || null }), kapat)}>
              → Sonraki aşama
            </button>
            <button className="btn tehlike" disabled={bekliyor}
              onClick={() => {
                const gerekce = prompt('Geri alma gerekçesi:');
                if (gerekce) calistir(() => degisiklikGeriAl({ id: degisiklik.id, gerekce }), kapat);
              }}>
              Geri al
            </button>
          </>
        )}
        <button className="btn" onClick={kapat}>Vazgeç</button>
        <button className="btn birincil" disabled={bekliyor} onClick={kaydet}>Kaydet</button>
      </div>
      {degisiklik?.sonDogrulama && (
        <p className="mikro-etiket">DOĞRULAMA: {degisiklik.sonDogrulama}</p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- olay */

function OlayPaneli({ olaylar, tesisler }: {
  olaylar: Olay[]; tesisler: { id: string; kod: string; ad: string }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState<Olay | 'yeni' | null>(null);
  const o = acik === 'yeni' ? null : acik;
  const [v, setV] = useState({ baslik: '', tip: 'olay', siddet: 'orta', tesisId: '', durum: 'acik', ozet: '' });

  return (
    <>
      <div className="filtreler">
        <span style={{ flex: 1 }} />
        <button className="btn birincil" onClick={() => {
          setV({ baslik: '', tip: 'olay', siddet: 'orta', tesisId: '', durum: 'acik', ozet: '' });
          setAcik('yeni'); }}>+ Olay kaydı</button>
      </div>
      <div className="kart"><div className="kart-icerik sifir">
        {olaylar.map((olay) => {
          const d = OLAY_DURUM[olay.durum] ?? { ad: olay.durum, renk: 'incelemede' as Durum };
          return (
            <div key={olay.id} className="satir" style={{ cursor: 'pointer' }}
              onClick={() => { setV({ baslik: olay.baslik, tip: olay.tip, siddet: olay.siddet,
                tesisId: olay.tesisId ?? '', durum: olay.durum, ozet: olay.ozet ?? '' }); setAcik(olay); }}>
              <span className={`serit serit-${SIDDET_RENK[olay.siddet] ?? 'incelemede'}`} />
              <span className="chip mono">{olay.kod}</span>
              {olay.tip === 'problem' && <span className="chip">Problem</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{olay.baslik}</div>
                <div className="mikro-etiket">
                  {olay.tesisAd
                    ? <span title={olay.tesisKod ?? undefined}>{olay.tesisAd}</span> : '—'}
                  {' · '}{zamanTR(olay.baslangic)}
                </div>
              </div>
              <Pill durum={SIDDET_RENK[olay.siddet] ?? 'incelemede'} etiket={olay.siddet}
                hollow={olay.siddet === 'yuksek'} />
              <Pill durum={d.renk} etiket={d.ad} />
            </div>
          );
        })}
        {olaylar.length === 0 && <Bos baslik="Olay kaydı yok" altMetin="İyi haber — sessizlik değil, kayıtlı sessizlik." />}
      </div></div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}

      <Kip acik={acik !== null} kapat={() => setAcik(null)}
        baslik={acik === 'yeni' ? 'Yeni olay' : `${o?.kod} düzenle`}>
        <div className="form-izgara">
          <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Başlık</span>
            <input className="inp" value={v.baslik} onChange={(e) => setV({ ...v, baslik: e.target.value })} /></label>
          <label className="form-satir"><span>Tip</span>
            <select className="sec" value={v.tip} onChange={(e) => setV({ ...v, tip: e.target.value })}>
              <option value="olay">Olay</option><option value="problem">Problem</option>
            </select></label>
          <label className="form-satir"><span>Şiddet</span>
            <select className="sec" value={v.siddet} onChange={(e) => setV({ ...v, siddet: e.target.value })}>
              {['dusuk', 'orta', 'yuksek', 'kritik'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select></label>
          <label className="form-satir"><span>Tesis</span>
            <select className="sec" value={v.tesisId} onChange={(e) => setV({ ...v, tesisId: e.target.value })}>
              <option value="">—</option>
              {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
            </select></label>
          <label className="form-satir"><span>Durum</span>
            <select className="sec" value={v.durum} onChange={(e) => setV({ ...v, durum: e.target.value })}>
              {Object.entries(OLAY_DURUM).map(([kod, x]) => <option key={kod} value={kod}>{x.ad}</option>)}
            </select></label>
          <label className="form-satir" style={{ gridColumn: '1/-1' }}><span>Özet</span>
            <textarea className="inp" rows={2} value={v.ozet} onChange={(e) => setV({ ...v, ozet: e.target.value })} /></label>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => setAcik(null)}>Vazgeç</button>
          <button className="btn birincil" disabled={bekliyor}
            onClick={() => calistir(() => olayKaydet({
              id: o?.id, baslik: v.baslik, tip: v.tip, siddet: v.siddet,
              tesisId: v.tesisId || null, durum: v.durum, ozet: v.ozet || null,
            }), () => setAcik(null))}>Kaydet</button>
        </div>
      </Kip>
    </>
  );
}

/* ---------------------------------------------------------- yedek / DR */

function YedekPaneli({ politikalar }: { politikalar: Politika[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [yeni, setYeni] = useState({ ad: '', kapsam: '', siklik: 'gunluk', saklamaGun: '30', hedef: 'uzak' });

  return (
    <>
      <div className="filtreler">
        <span className="mikro-etiket">
          YEDEK, RESTORE TESTİYLE KANITLANIR — TEST EDİLMEMİŞ YEDEK &quot;BİLİNMİYOR&quot; SAYILIR
        </span>
      </div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))' }}>
        {politikalar.map((p) => {
          const restoreVar = p.kosular.some((ks) => ks.restoreTestleri.some((r) => r.sonuc === 'basarili'));
          return (
            <div key={p.id} className="kart">
              <div className="kart-baslik">
                <div><h3>{p.ad}</h3>
                  <span className="mikro-etiket">{p.kapsam ?? '—'} · {p.siklik ?? '?'} ·
                    saklama {p.saklamaGun ?? '?'} gün · hedef {p.hedef ?? '?'}</span></div>
                {restoreVar
                  ? <Pill durum="uyumlu" etiket="Restore kanıtlı" />
                  : <Pill durum="degerlendirilmedi" etiket="Restore testi yok" />}
              </div>
              <div className="kart-icerik sifir">
                {p.kosular.map((ks) => (
                  <div key={ks.id} className="satir">
                    <Pill durum={ks.durum === 'basarili' ? 'uyumlu' : ks.durum === 'kismi' ? 'kismi' : 'uyumsuz'}
                      etiket={ks.durum} />
                    <span style={{ flex: 1, fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>
                      {zamanTR(ks.zaman)}{ks.boyutMb ? ` · ${ks.boyutMb} MB` : ''}{ks.hata ? ` · ${ks.hata}` : ''}
                    </span>
                    {ks.restoreTestleri.map((r, i) => (
                      <span key={i} className={`chip`} title={zamanTR(r.zaman)}>
                        ↺ {r.sonuc === 'basarili' ? '✓' : '✗'}
                      </span>
                    ))}
                    <span className="filtreler sirada-gizli">
                      <button className="btn kucuk" disabled={bekliyor}
                        onClick={() => calistir(() => restoreTestiKaydet({
                          kosuId: ks.id, sonuc: 'basarili' }))}>↺ Restore ✓</button>
                      <button className="btn kucuk tehlike" disabled={bekliyor}
                        onClick={() => calistir(() => restoreTestiKaydet({
                          kosuId: ks.id, sonuc: 'basarisiz' }))}>↺ Restore ✗</button>
                    </span>
                  </div>
                ))}
                {p.kosular.length === 0 && <Bos baslik="Koşu kaydı yok" />}
                <div className="satir filtreler">
                  <button className="btn kucuk" disabled={bekliyor}
                    onClick={() => calistir(() => yedeklemeKosusuKaydet({
                      politikaId: p.id, durum: 'basarili' }))}>+ Başarılı koşu</button>
                  <button className="btn kucuk" disabled={bekliyor}
                    onClick={() => {
                      const hataMetni = prompt('Hata özeti:') ?? 'bilinmeyen hata';
                      calistir(() => yedeklemeKosusuKaydet({
                        politikaId: p.id, durum: 'basarisiz', hata: hataMetni }));
                    }}>+ Başarısız koşu</button>
                </div>
              </div>
            </div>
          );
        })}
        <div className="kart">
          <div className="kart-baslik"><h3>Yeni politika</h3></div>
          <div className="kart-icerik form-izgara">
            <input className="inp" placeholder="Ad" value={yeni.ad}
              onChange={(e) => setYeni({ ...yeni, ad: e.target.value })} />
            <input className="inp" placeholder="Kapsam (SCADA sunucuları...)" value={yeni.kapsam}
              onChange={(e) => setYeni({ ...yeni, kapsam: e.target.value })} />
            <select className="sec" value={yeni.siklik}
              onChange={(e) => setYeni({ ...yeni, siklik: e.target.value })}>
              {['saatlik', 'gunluk', 'haftalik', 'aylik'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className="sec" value={yeni.hedef}
              onChange={(e) => setYeni({ ...yeni, hedef: e.target.value })}>
              {['yerel', 'uzak', 'immutable'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <input className="inp" type="number" placeholder="Saklama (gün)" value={yeni.saklamaGun}
              onChange={(e) => setYeni({ ...yeni, saklamaGun: e.target.value })} />
            <button className="btn birincil" disabled={bekliyor}
              onClick={() => calistir(() => yedeklemePolitikasiKaydet({
                ad: yeni.ad, kapsam: yeni.kapsam || null, siklik: yeni.siklik,
                saklamaGun: yeni.saklamaGun ? Number(yeni.saklamaGun) : null, hedef: yeni.hedef,
              }), () => setYeni({ ad: '', kapsam: '', siklik: 'gunluk', saklamaGun: '30', hedef: 'uzak' }))}>
              + Ekle</button>
          </div>
        </div>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
    </>
  );
}

/* ------------------------------------------------ tedarikçi / sertifika */

function TedarikciPaneli({ tedarikciler, sertifikalar }: {
  tedarikciler: Tedarikci[]; sertifikalar: Sertifika[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [yeniT, setYeniT] = useState({ ad: '', tip: 'ot_saglayici', uzaktan: false });
  const [yeniS, setYeniS] = useState({ ad: '', veren: '', bitis: '' });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))', gap: 'var(--sp-6)' }}>
      <div className="kart">
        <div className="kart-baslik"><h3>Tedarikçiler</h3>
          <span className="mikro-etiket">UZAKTAN ERİŞİMİ OLANLAR İŞARETLİ</span></div>
        <div className="kart-icerik sifir">
          {tedarikciler.map((t) => (
            <div key={t.id} className="satir">
              <span style={{ flex: 1, fontWeight: 500 }}>{t.ad}</span>
              {t.tip && <span className="chip">{t.tip.replace('_', ' ')}</span>}
              {t.uzaktanErisimVar && <Pill durum="kismi" etiket="Uzaktan erişim" />}
              <span className="mikro-etiket">{t.varlikSayisi} VARLIK · {t.sozlesmeSayisi} SÖZLEŞME</span>
            </div>
          ))}
          {tedarikciler.length === 0 && <Bos baslik="Tedarikçi yok" />}
          <div className="satir" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <input className="inp" placeholder="Tedarikçi adı" value={yeniT.ad} style={{ flex: 1, minWidth: 140 }}
              onChange={(e) => setYeniT({ ...yeniT, ad: e.target.value })} />
            <select className="sec" value={yeniT.tip}
              onChange={(e) => setYeniT({ ...yeniT, tip: e.target.value })}>
              {['ot_saglayici', 'donanim', 'yazilim', 'hizmet', 'mssp'].map((x) =>
                <option key={x} value={x}>{x.replace('_', ' ')}</option>)}
            </select>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-xs)' }}>
              <input type="checkbox" checked={yeniT.uzaktan}
                onChange={(e) => setYeniT({ ...yeniT, uzaktan: e.target.checked })} /> uzaktan erişim
            </label>
            <button className="btn birincil kucuk" disabled={bekliyor}
              onClick={() => calistir(() => tedarikciKaydet({
                ad: yeniT.ad, tip: yeniT.tip, uzaktanErisimVar: yeniT.uzaktan,
              }), () => setYeniT({ ad: '', tip: 'ot_saglayici', uzaktan: false }))}>+ Ekle</button>
          </div>
        </div>
      </div>

      <div className="kart">
        <div className="kart-baslik"><h3>Sertifikalar</h3>
          <span className="mikro-etiket">BİTİŞE GÖRE SIRALI — DEADLINE MOTORU İZLER</span></div>
        <div className="kart-icerik sifir">
          {sertifikalar.map((s) => {
            const eol = sertifikaDurumu(s.bitis);
            return (
              <div key={s.id} className="satir">
                <span style={{ flex: 1, fontWeight: 500 }}>{s.ad}</span>
                {s.varlikEtiketi && <span className="chip mono">{s.varlikEtiketi}</span>}
                {s.veren && <span className="mikro-etiket">{s.veren}</span>}
                <Pill durum={eol.durum === 'degerlendirilmedi' ? 'degerlendirilmedi' : eol.durum}
                  etiket={eol.etiket} />
              </div>
            );
          })}
          {sertifikalar.length === 0 && <Bos baslik="Sertifika kaydı yok" />}
          <div className="satir" style={{ gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <input className="inp" placeholder="Sertifika adı" value={yeniS.ad} style={{ flex: 1, minWidth: 140 }}
              onChange={(e) => setYeniS({ ...yeniS, ad: e.target.value })} />
            <input className="inp" placeholder="Veren" value={yeniS.veren} style={{ width: 110 }}
              onChange={(e) => setYeniS({ ...yeniS, veren: e.target.value })} />
            <input className="inp" type="date" value={yeniS.bitis}
              onChange={(e) => setYeniS({ ...yeniS, bitis: e.target.value })} />
            <button className="btn birincil kucuk" disabled={bekliyor || !yeniS.bitis}
              onClick={() => calistir(() => sertifikaKaydet({
                ad: yeniS.ad, veren: yeniS.veren || null, bitis: yeniS.bitis,
              }), () => setYeniS({ ad: '', veren: '', bitis: '' }))}>+ Ekle</button>
          </div>
        </div>
      </div>
      {hata && <p className="pill durum-uyumsuz" role="alert" style={{ gridColumn: '1/-1' }}>{hata}</p>}
    </div>
  );
}

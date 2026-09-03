'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import {
  etkiDegerlendirmesiKaydet, konfigTemeliOnayla, varligaEkipAta,
} from '@/lib/eylemler2/varlikYonetisim';
import {
  ETKI_ETIKETI, degerlendirilmemisBaglar, enSikiRpo, enSikiRto, etkiDuzeyi,
  gecerliEtki, tekNoktaRiskleri, type AdimBagi,
} from '@/lib/varlik/etki';
import { SAHIPLIK_SINIFI, SAHIPLIK_SOZU, sahiplikDurumu } from '@/lib/varlik/sahiplik';
import {
  SURE_ETIKETI, SURE_SINIFI, bakimDurumu, BAKIM_SOZU, enAcilSure,
  olcumBorcu, sureleriCoz,
} from '@/lib/varlik/omurTarihleri';
import { driftKarsilastir } from '@/lib/varlik/konfigDrift';
import { etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import type { V } from './mantik';

/* ═══ O11 · Yönetişim sekmesi — OT-05 · 08 · 09 · 20 · 28 ══════════════

   Duruş sekmesi "bu cihaz güvenli mi" der; bu sekme dört başka soruyu
   cevaplar ve dördü de aynı kişilere sorulmaz:

     KİM SAHİBİ?          (OT-09) — kişi, ekip, ikisi de yoksa öksüz.
     DURURSA NE OLUR?     (OT-08) — MW kaybı, RTO/RPO, emniyet, çevre.
     NEREDE DEVREDE?      (OT-05) — hangi proses adımında, tek nokta mı.
     KONFİGÜRASYONU ONAYLI MI? (OT-28) — taban var mı, sapma var mı.
     NE ZAMAN BİTİYOR?    (OT-20) — garanti/destek/bakım/EOL/EOS.

   ── ÜÇ AYRIM BURADA DA GEÇERLİ ────────────────────────────────────────
   `null` MW kaybı "kayıp yok" değil "hesaplanmadı"dır. Değerlendirilmemiş
   bir tek nokta "tek nokta değil" değildir. Girilmemiş bir garanti tarihi
   "garanti bitti" değildir. Ekran üçünü de ayrı kelimelerle yazar. */

const KAYIP_ETIKET: Record<string, string> = {
  tam: 'tam kayıp', kismi: 'kısmi kayıp', yok: 'kayıp yok', bilinmiyor: 'bilinmiyor',
};

const ROL_ETIKET: Record<string, string> = {
  kontrol: 'kontrol', olcum: 'ölçüm', iletisim: 'iletişim',
  kayit: 'kayıt', emniyet: 'emniyet', diger: 'diğer',
};

function Blok({ ad, rozet, children }: {
  ad: string; rozet?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="ab-durus-blok">
      <p className="etiket blokbas">
        {ad}
        {rozet ? <span className="ab-durus-rozet">{rozet}</span> : null}
      </p>
      {children}
    </section>
  );
}

/* ── OT-09 · Sahiplik zinciri ───────────────────────────────────────── */

function SahiplikBlogu({ v, ekipler }: {
  v: V; ekipler: { id: string; kod: string; ad: string; tip: string; aktifUye: number }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [secim, setSecim] = useState(v.yonetisim.ekip?.id ?? '');

  /* Aktiflik bilgisi `V` üzerinde YOK (kişi listesi yalnız ad taşır);
     ekranın elindeki tek gerçek, sunucunun gönderdiği ekip kaydıdır.
     Kişi sahipliği bu yüzden "atandı/atanmadı" düzeyinde okunur ve
     PASİF ayrımını sunucu tarafı `sahiplikDurumu` ile yapar. */
  const durum = sahiplikDurumu({
    sahip: v.sahip ? { id: v.sahip.id, ad: v.sahip.ad, aktif: true } : null,
    emanetci: v.emanetci ? { id: v.emanetci.id, ad: v.emanetci.ad, aktif: true } : null,
    ekip: v.yonetisim.ekip,
  });

  return (
    <Blok ad="Sahiplik" rozet={<span className={`ab-glif g-${SAHIPLIK_SINIFI[durum] === 'ok' ? 'uygun' : SAHIPLIK_SINIFI[durum] === 'bd' ? 'uygunsuz' : SAHIPLIK_SINIFI[durum] === 'md' ? 'kismi' : 'yok'}`} aria-label={SAHIPLIK_SOZU[durum]} />}>
      <p className="cumle">{SAHIPLIK_SOZU[durum]}</p>
      <dl className="ciftler">
        <div>
          <dt>Sahip kişi</dt>
          <dd className={v.sahip ? undefined : 'unk'}>{v.sahip?.ad ?? 'atanmadı'}</dd>
        </div>
        <div>
          <dt>Emanetçi</dt>
          <dd className={v.emanetci ? undefined : 'unk'}>{v.emanetci?.ad ?? 'atanmadı'}</dd>
        </div>
        <div>
          <dt>Sahip ekip</dt>
          <dd className={v.yonetisim.ekip ? undefined : 'unk'}>
            {v.yonetisim.ekip
              ? `${v.yonetisim.ekip.kod} · ${v.yonetisim.ekip.aktifUye} aktif üye`
              : 'atanmadı'}
          </dd>
        </div>
      </dl>
      {v.yazilabilir && (
        <>
          <button type="button" className="ab-dugme mini" aria-expanded={acik}
            onClick={() => setAcik(!acik)}>Ekip ata</button>
          {acik && (
            <div className="ab-durus-form">
              <Alan etiket="Ekip">
                <select className="ab-gr" value={secim}
                  onChange={(e) => setSecim(e.target.value)}>
                  <option value="">— atama yok —</option>
                  {ekipler.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.kod} · {etiketle(e.tip)} · {e.aktifUye} aktif üye
                    </option>
                  ))}
                </select>
              </Alan>
              {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
              <Dugme tur="tam" disabled={bekliyor}
                onClick={() => calistir(
                  () => varligaEkipAta({ varlikId: v.id, ekipId: secim || null }),
                  () => setAcik(false),
                )}>
                Atamayı kaydet
              </Dugme>
            </div>
          )}
        </>
      )}
    </Blok>
  );
}

/* ── OT-08 · Etki değerlendirmesi ───────────────────────────────────── */

type EtkiFormu = {
  mw: string; kayipTipi: string; rto: string; rpo: string;
  emniyet: string; cevre: string; gerekce: string;
};

function EtkiBlogu({ v }: { v: V }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const e = v.yonetisim.etki;
  const [f, setF] = useState<EtkiFormu>({
    mw: e?.uretimKaybiMw === null || e === null ? '' : String(e.uretimKaybiMw),
    kayipTipi: e?.kayipTipi ?? 'bilinmiyor',
    rto: e?.rtoSaat === null || e === null ? '' : String(e.rtoSaat),
    rpo: e?.rpoSaat === null || e === null ? '' : String(e.rpoSaat),
    emniyet: e?.emniyetEtkisi ?? 'bilinmiyor',
    cevre: e?.cevreEtkisi ?? 'bilinmiyor',
    gerekce: e?.gerekce ?? '',
  });

  const baglar: AdimBagi[] = v.yonetisim.adimlar.map((a) => ({
    adimId: a.adimId, adimAd: a.adimAd, surecKod: a.surecKod, surecAd: a.surecAd,
    rol: a.rol, tekNokta: a.tekNokta, yedekli: a.yedekli,
    adimEtkisi: a.adimEtkisi, rtoSaat: a.rtoSaat, rpoSaat: a.rpoSaat,
  }));
  const gecerliDuzey = gecerliEtki(v.uretimEtkisi, baglar);

  const mwSayi = f.mw.trim() === '' ? null : Number(f.mw);
  const mwGecerli = mwSayi === null || (Number.isFinite(mwSayi) && mwSayi >= 0);
  /* Sayı yazan değerlendirme GEREKÇE ister — kural sunucuda da var;
     buradaki kopya formu erken kapatmak için, kapı olmak için değil. */
  const gerekceGerekli = mwSayi !== null;
  const formGecerli = mwGecerli && (!gerekceGerekli || f.gerekce.trim().length >= 10);

  return (
    <Blok
      ad="Üretim etkisi"
      rozet={(
        <span className="mono">
          {ETKI_ETIKETI[gecerliDuzey.duzey]}
          {gecerliDuzey.kaynak === 'miras' ? ' · adımdan miras' : ''}
          {gecerliDuzey.kaynak === 'olculdu' ? ' · ölçüldü' : ''}
        </span>
      )}
    >
      {!e ? (
        <p className="bos">Etki değerlendirmesi yok — üretim kaybı hesaplanmadı.</p>
      ) : (
        <>
          <dl className="ciftler">
            <div>
              <dt>Üretim kaybı</dt>
              <dd className={`mono${e.uretimKaybiMw === null ? ' unk' : ''}`}>
                {e.uretimKaybiMw === null
                  ? 'hesaplanmadı'
                  : `${e.uretimKaybiMw.toLocaleString('tr')} MW`}
              </dd>
            </div>
            <div>
              <dt>Kayıp tipi</dt>
              <dd className={e.kayipTipi === 'bilinmiyor' ? 'unk' : undefined}>
                {KAYIP_ETIKET[e.kayipTipi] ?? e.kayipTipi}
              </dd>
            </div>
            <div>
              <dt>RTO</dt>
              <dd className={`mono${e.rtoSaat === null ? ' unk' : ''}`}>
                {e.rtoSaat === null ? 'belirlenmedi' : `${e.rtoSaat} saat`}
              </dd>
            </div>
            <div>
              <dt>RPO</dt>
              <dd className={`mono${e.rpoSaat === null ? ' unk' : ''}`}>
                {e.rpoSaat === null ? 'belirlenmedi' : `${e.rpoSaat} saat`}
              </dd>
            </div>
            <div>
              <dt>Emniyet etkisi</dt>
              <dd className={e.emniyetEtkisi === 'bilinmiyor' ? 'unk' : undefined}>
                {etiketle(e.emniyetEtkisi)}
              </dd>
            </div>
            <div>
              <dt>Çevre etkisi</dt>
              <dd className={e.cevreEtkisi === 'bilinmiyor' ? 'unk' : undefined}>
                {etiketle(e.cevreEtkisi)}
              </dd>
            </div>
          </dl>
          {e.gerekce && <p className="mono dipnot">{e.gerekce}</p>}
          <p className="mono dipnot">
            {e.degerlendiren ?? 'bilinmeyen kişi'} · {zamanTR(e.zaman)}
          </p>
        </>
      )}

      {gecerliDuzey.kaynak === 'miras' && (
        <p className="mono dipnot">
          Bu değer cihazın kendi kaydından değil, bağlı olduğu proses
          adımından MİRAS alındı; cihaza kendi değeri girilirse o kazanır.
        </p>
      )}

      {v.yazilabilir && (
        <>
          <button type="button" className="ab-dugme mini" aria-expanded={acik}
            onClick={() => setAcik(!acik)}>
            {e ? 'Değerlendirmeyi güncelle' : 'Etki değerlendir'}
          </button>
          {acik && (
            <div className="ab-durus-form">
              <Alan etiket="Üretim kaybı (MW) — boş = hesaplanmadı"
                hata={mwGecerli ? null : 'Negatif olamaz.'}>
                <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }}
                  inputMode="decimal" value={f.mw}
                  onChange={(x) => setF({ ...f, mw: x.target.value })} />
              </Alan>
              <Alan etiket="Kayıp tipi">
                <select className="ab-gr" value={f.kayipTipi}
                  onChange={(x) => setF({ ...f, kayipTipi: x.target.value })}>
                  {['bilinmiyor', 'tam', 'kismi', 'yok'].map((t) => (
                    <option key={t} value={t}>{KAYIP_ETIKET[t]}</option>
                  ))}
                </select>
              </Alan>
              <Alan etiket="RTO (saat)">
                <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }}
                  inputMode="decimal" value={f.rto}
                  onChange={(x) => setF({ ...f, rto: x.target.value })} />
              </Alan>
              <Alan etiket="RPO (saat)">
                <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }}
                  inputMode="decimal" value={f.rpo}
                  onChange={(x) => setF({ ...f, rpo: x.target.value })} />
              </Alan>
              <Alan etiket="Emniyet etkisi">
                <select className="ab-gr" value={f.emniyet}
                  onChange={(x) => setF({ ...f, emniyet: x.target.value })}>
                  {['bilinmiyor', 'yok', 'dusuk', 'orta', 'yuksek'].map((t) => (
                    <option key={t} value={t}>{etiketle(t)}</option>
                  ))}
                </select>
              </Alan>
              <Alan etiket="Çevre etkisi">
                <select className="ab-gr" value={f.cevre}
                  onChange={(x) => setF({ ...f, cevre: x.target.value })}>
                  {['bilinmiyor', 'yok', 'dusuk', 'orta', 'yuksek'].map((t) => (
                    <option key={t} value={t}>{etiketle(t)}</option>
                  ))}
                </select>
              </Alan>
              <Alan etiket={gerekceGerekli
                ? 'Gerekçe (MW sayısı için zorunlu, en az 10 karakter)'
                : 'Gerekçe'}>
                <textarea className="ab-gr" rows={2} value={f.gerekce}
                  onChange={(x) => setF({ ...f, gerekce: x.target.value })} />
              </Alan>
              {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
              <Dugme tur="tam" disabled={bekliyor || !formGecerli}
                onClick={() => calistir(
                  () => etkiDegerlendirmesiKaydet({
                    varlikId: v.id,
                    uretimKaybiMw: mwSayi,
                    kayipTipi: f.kayipTipi,
                    rtoSaat: f.rto.trim() === '' ? null : Number(f.rto),
                    rpoSaat: f.rpo.trim() === '' ? null : Number(f.rpo),
                    emniyetEtkisi: f.emniyet, cevreEtkisi: f.cevre,
                    gerekce: f.gerekce || null,
                  }),
                  () => setAcik(false),
                )}>
                Değerlendirmeyi kaydet
              </Dugme>
            </div>
          )}
        </>
      )}
    </Blok>
  );
}

/* ── OT-05 · Proses adımları ────────────────────────────────────────── */

function AdimBlogu({ v }: { v: V }) {
  const adimlar = v.yonetisim.adimlar;
  const baglar: AdimBagi[] = adimlar.map((a) => ({
    adimId: a.adimId, adimAd: a.adimAd, surecKod: a.surecKod, surecAd: a.surecAd,
    rol: a.rol, tekNokta: a.tekNokta, yedekli: a.yedekli,
    adimEtkisi: a.adimEtkisi, rtoSaat: a.rtoSaat, rpoSaat: a.rpoSaat,
  }));
  const riskli = tekNoktaRiskleri(baglar);
  const olculmemis = degerlendirilmemisBaglar(baglar);
  const rto = enSikiRto(baglar);
  const rpo = enSikiRpo(baglar);

  return (
    <Blok ad="Proses adımları" rozet={<span className="mono">{adimlar.length} bağ</span>}>
      {adimlar.length === 0 ? (
        <p className="bos">
          Bu varlık hiçbir proses adımına bağlanmadı — durduğunda hangi işin
          etkileneceği bilinmiyor.
        </p>
      ) : (
        <>
          <ul className="ab-durus-alanlar">
            {adimlar.map((a) => (
              <li key={a.bagId}>
                <span className="ad">{a.surecKod} › {a.sira}. {a.adimAd}</span>
                <span className="mono deger">{ROL_ETIKET[a.rol] ?? a.rol}</span>
                <p className="mono gerekce">
                  {ETKI_ETIKETI[etkiDuzeyi(a.adimEtkisi)]}
                  {' · tek nokta: '}
                  {a.tekNokta === null ? 'değerlendirilmedi' : a.tekNokta ? 'EVET' : 'hayır'}
                  {' · yedek: '}
                  {a.yedekli === null ? 'değerlendirilmedi' : a.yedekli ? 'var' : 'yok'}
                </p>
              </li>
            ))}
          </ul>
          <dl className="ciftler">
            <div>
              <dt>En sıkı RTO</dt>
              <dd className={`mono${rto === null ? ' unk' : ''}`}>
                {rto === null ? 'belirlenmedi' : `${rto} saat`}
              </dd>
            </div>
            <div>
              <dt>En sıkı RPO</dt>
              <dd className={`mono${rpo === null ? ' unk' : ''}`}>
                {rpo === null ? 'belirlenmedi' : `${rpo} saat`}
              </dd>
            </div>
          </dl>
          {riskli.length > 0 && (
            <p className="mono dipnot">
              {riskli.length} adımda TEK NOKTA ve yedeği yok.
            </p>
          )}
          {olculmemis.length > 0 && (
            <p className="mono dipnot">
              {olculmemis.length} bağda tek nokta durumu değerlendirilmedi —
              bu bir ölçüm borcudur, &quot;risk yok&quot; demek değildir.
            </p>
          )}
        </>
      )}
    </Blok>
  );
}

/* ── OT-20 · Süreler ────────────────────────────────────────────────── */

function SureBlogu({ v, simdi }: { v: V; simdi: number }) {
  const kayitlar = sureleriCoz({
    garantiBitis: v.garantiBitis, destekBitis: v.destekBitis,
    bakimBitis: v.bakimBitis, eolTarihi: v.eolTarihi, eosTarihi: v.eosTarihi,
  }, simdi);
  const acil = enAcilSure(kayitlar);
  const borc = olcumBorcu(kayitlar);
  const bakim = bakimDurumu(v.sonrakiBakim, simdi);

  return (
    <Blok
      ad="Süreler"
      rozet={(
        <span className="mono">
          {acil === null
            ? 'hiçbir tarih girilmedi'
            : `${SURE_ETIKETI[acil.tip]} · ${acil.kalanGun! < 0
              ? `${Math.abs(acil.kalanGun!)} gün geçti`
              : `${acil.kalanGun} gün`}`}
        </span>
      )}
    >
      <ul className="ab-durus-alanlar">
        {kayitlar.map((s) => (
          <li key={s.tip}>
            <span className="ad">{SURE_ETIKETI[s.tip]}</span>
            <span className={`mono deger${SURE_SINIFI[s.durum] === 'unk' ? ' unk' : ''}`}>
              {s.tarih === null ? 'girilmedi' : tarihTR(s.tarih)}
            </span>
            {s.kalanGun !== null && (
              <p className="mono gerekce">
                {s.kalanGun < 0
                  ? `${Math.abs(s.kalanGun)} gün önce doldu`
                  : `${s.kalanGun} gün kaldı`}
              </p>
            )}
          </li>
        ))}
      </ul>
      <dl className="ciftler">
        <div>
          <dt>Garanti sağlayıcı</dt>
          <dd className={v.garantiSaglayici ? undefined : 'unk'}>
            {v.garantiSaglayici ?? 'girilmedi'}
          </dd>
        </div>
        <div>
          <dt>Son bakım</dt>
          <dd className={`mono${v.sonBakim ? '' : ' unk'}`}>
            {v.sonBakim ? tarihTR(v.sonBakim) : 'kayıt yok'}
          </dd>
        </div>
        <div>
          <dt>Sonraki bakım</dt>
          <dd className={`mono${bakim === 'planlanmadi' ? ' unk' : bakim === 'gecikti' ? ' vurgu' : ''}`}>
            {v.sonrakiBakim ? tarihTR(v.sonrakiBakim) : 'planlanmadı'}
          </dd>
        </div>
      </dl>
      <p className="mono dipnot">{BAKIM_SOZU[bakim]}</p>
      {borc.length > 0 && (
        <p className="mono dipnot">
          {borc.length} süre girilmedi ({borc.map((t) => SURE_ETIKETI[t]).join(' · ')})
          {' '}— girilmemiş tarih &quot;doldu&quot; demek değildir.
        </p>
      )}
    </Blok>
  );
}

/* ── OT-28 · Konfigürasyon tabanı ───────────────────────────────────── */

function KonfigBlogu({ v, onaylanabilir }: { v: V; onaylanabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [not, setNot] = useState('');
  const kk = v.yonetisim.konfig;
  const karar = driftKarsilastir({
    temelHash: kk.temelHash, gozlenenHash: kk.sonYedekHash,
  });

  return (
    <Blok
      ad="Konfigürasyon tabanı"
      rozet={(
        <span className="mono">
          {kk.acikSapma > 0 ? `${kk.acikSapma} açık sapma` : karar.sonuc === 'ayni'
            ? 'tabanla aynı' : karar.sonuc === 'sapma' ? 'sapma var' : 'karar verilemedi'}
        </span>
      )}
    >
      <dl className="ciftler">
        <div>
          <dt>Onaylı taban</dt>
          <dd className={`mono${kk.temelHash ? '' : ' unk'}`}>
            {kk.temelHash ? `${kk.temelHash.slice(0, 12)}…` : 'yok'}
          </dd>
        </div>
        <div>
          <dt>Onaylayan</dt>
          <dd className={kk.temelOnaylayan ? undefined : 'unk'}>
            {kk.temelOnaylayan ?? '—'}
            {kk.temelOnayZamani ? ` · ${tarihTR(kk.temelOnayZamani)}` : ''}
          </dd>
        </div>
        <div>
          <dt>Son başarılı yedek</dt>
          <dd className={`mono${kk.sonYedekHash ? '' : ' unk'}`}>
            {kk.sonYedekHash ? `${kk.sonYedekHash.slice(0, 12)}…` : 'özet yok'}
            {kk.sonYedekZamani ? ` · ${tarihTR(kk.sonYedekZamani)}` : ''}
          </dd>
        </div>
      </dl>
      <p className="cumle">{karar.gerekce}</p>
      {kk.acikSapma > 0 && (
        <p className="mono dipnot">
          Açık sapmalar <Link href="/yedekleme">Yedekleme</Link> ekranından
          karara bağlanır; onaylı bir değişiklikten gelen fark kusur değildir
          ama izlenmeden geçmemelidir.
        </p>
      )}

      {onaylanabilir && kk.sonYedekId && kk.sonYedekHash && (
        <>
          <button type="button" className="ab-dugme mini" aria-expanded={acik}
            onClick={() => setAcik(!acik)}>
            {kk.temelHash ? 'Tabanı güncelle' : 'Son yedeği taban onayla'}
          </button>
          {acik && (
            <div className="ab-durus-form">
              <p className="mono dipnot">
                Onaylanan yedek bundan sonra BEKLENEN konfigürasyondur;
                sonraki yedekler buna göre karşılaştırılır.
              </p>
              <Alan etiket="Not">
                <textarea className="ab-gr" rows={2} value={not}
                  onChange={(e) => setNot(e.target.value)} />
              </Alan>
              {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
              <Dugme tur="tam" disabled={bekliyor}
                onClick={() => calistir(
                  () => konfigTemeliOnayla({
                    varlikId: v.id, yedekId: kk.sonYedekId!, not: not || null,
                  }),
                  () => { setAcik(false); setNot(''); },
                )}>
                Tabanı onayla
              </Dugme>
            </div>
          )}
        </>
      )}
      {onaylanabilir && !kk.sonYedekHash && (
        <p className="mono dipnot">
          Taban onaylamak için içerik özeti OLAN başarılı bir yedek gerekir;
          özetsiz bir taban sonsuza kadar &quot;karar verilemedi&quot; üretirdi.
        </p>
      )}
    </Blok>
  );
}

/* ── Sekme gövdesi ──────────────────────────────────────────────────── */

export function YonetisimPaneli({ v, ekipler, onaylanabilir, simdi }: {
  v: V;
  ekipler: { id: string; kod: string; ad: string; tip: string; aktifUye: number }[];
  onaylanabilir: boolean;
  simdi: number;
}) {
  return (
    <div className="ab-durus">
      <SahiplikBlogu v={v} ekipler={ekipler} />
      <EtkiBlogu v={v} />
      <AdimBlogu v={v} />
      <SureBlogu v={v} simdi={simdi} />
      <KonfigBlogu v={v} onaylanabilir={onaylanabilir} />
    </div>
  );
}

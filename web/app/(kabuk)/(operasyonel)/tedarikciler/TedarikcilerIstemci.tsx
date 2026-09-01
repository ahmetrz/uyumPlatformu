'use client';
import Link from 'next/link';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { BosIlk, Im, Ipucu, type Durum } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli,
} from '@/components/kabuk/panel';
import { etiketle, tarihTR } from '@/lib/sabitler';
import { ErisimOturumlari, TedarikciEylemleri, SertifikaYenile } from './Eylemler';
import {
  asilSozlesme, ayYil, degerlendir, erisimAciklamasi, santralOzeti, sirala,
  GORUNUR_TAVAN, KADEME, UFUK, YONTEM_ETIKET,
  type SertifikaOzeti, type T,
} from './ortak';

/* O16 · Tedarikçiler / üçüncü taraf — "hangi tedarikçi bizi açıkta bırakıyor?"
   Tek tablo, üç metrik, 420px çekmece (03-screens O16).

   Satır <button> değil <div role="row">: santral hücresi Plant 360'a giden
   GERÇEK bağlantı taşır, düğme içine bağlantı yerleştirilemez. Klavye için
   satırın etkinleştirme hedefi konu hücresindeki düğmedir; tıklama satırın
   tamamında çalışır, hücre içi bağlantılar yayılımı durdurur.

   `izlenmiyor` kesikli alt çizgi + popover taşır ama KRİTİK BİLGİ HOVER'DA
   KALMAZ: satır işaretçisi zaten durumu söyler, çekmece boşluğu açar. */

const KOLONLAR = '22px minmax(0, 1fr) 190px 150px 150px 26px';
/** Çekmece açıkken santral kolonu düşer — bilgi çekmeceye iner, sıkışmaz. */
const KOLONLAR_DAR = '22px minmax(0, 1fr) 150px 150px 26px';

export default function TedarikcilerIstemci({
  tedarikciler, yazabilir, sertifikaUfku,
}: {
  tedarikciler: T[];
  yazabilir: boolean;
  sertifikaUfku: { yakinGun: number | null; dolmus: number; ufuk: number };
}) {
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const secili = tedarikciler.find((t) => t.id === seciliId) ?? null;

  /* ── Metrikler: hepsi veriden, hiçbiri sabit ─────────────────────────── */
  const sayim = useMemo(() => {
    const uzaktan = tedarikciler.filter((t) => t.uzaktanErisimVar);
    return {
      toplam: tedarikciler.length,
      uzaktan: uzaktan.length,
      izlenmeyen: uzaktan.filter((t) => t.oturumKaydiVar === false).length,
      oturumBilinmeyen: uzaktan.filter((t) => t.oturumKaydiVar === null).length,
      sozlesmesiz: tedarikciler.filter((t) => t.sozlesmeler.length === 0).length,
      destekBitiyor: tedarikciler.filter((t) => degerlendir(t).bayrak.destekBitiyor).length,
      destekBitti: tedarikciler.filter((t) => degerlendir(t).bayrak.destekBitti).length,
      /* ÖLÇÜM sayaçları. `uyumsuzOturum` kanıtlı ihlal, `olculmemisOturum`
         ölçüm boşluğu — ikisi ayrı sayılır ve asla toplanmaz. */
      uyumsuzOturum: tedarikciler.reduce((a, t) => a + t.oturum.uyumsuzSayisi, 0),
      olculmemisOturum: tedarikciler.reduce((a, t) => a + t.oturum.bilinmeyenSayisi, 0),
      oturumKaynagiYok: uzaktan.filter((t) => t.oturum.kapsam === 'kaynak_bagli_degil').length,
      olculenOturum: tedarikciler.reduce((a, t) => a + t.oturum.toplam, 0),
    };
  }, [tedarikciler]);

  const sirali = useMemo(() => sirala(tedarikciler), [tedarikciler]);
  const acikta = sirali.filter((t) => degerlendir(t).durum === 'bd');

  /* Sağlıklı kalan kuyruğa iner; kritik ve süresi dolmuş satırlar ASLA. */
  const one = sirali.filter((t) => degerlendir(t).durum !== 'ok').slice(0, GORUNUR_TAVAN);
  const kalan = sirali.filter((t) => !one.includes(t));
  const gosterilen = kuyrukAcik ? sirali : one;
  const toplanan = kuyrukAcik ? [] : kalan;

  const dipNot = [
    `${sayim.toplam} tedarikçi`,
    `${sayim.uzaktan} uzaktan erişimli`,
    sayim.oturumBilinmeyen > 0 && `${sayim.oturumBilinmeyen} oturum kaydı beyanı bilinmeyen`,
    /* Kaynak bağlı değilken sıfır uyumsuzluk bir sonuç DEĞİLDİR; bu cümle
       olmadan "0 uyumsuz oturum" metriği temiz bir tablo gibi okunurdu. */
    sayim.oturumKaynagiYok > 0
      && `${sayim.oturumKaynagiYok} uzaktan erişimli tedarikçide oturum kaynağı bağlı değil `
        + '— erişimleri göremiyoruz, olmadığı anlamına gelmez',
    sayim.olculmemisOturum > 0
      && `${sayim.olculmemisOturum} oturumda en az bir alan ölçülmemiş (ihlal değil)`,
    sayim.sozlesmesiz > 0 && `${sayim.sozlesmesiz} sözleşme kaydı olmayan`,
    sayim.destekBitti > 0 && `${sayim.destekBitti} sözleşme süresi dolmuş`,
    sertifikaUfku.dolmus > 0 && `${sertifikaUfku.dolmus} sertifika süresi dolmuş`,
  ].filter(Boolean).join(' · ');

  if (tedarikciler.length === 0) {
    return (
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi eyebrow="Üçüncü taraf" baslik="Tedarikçiler" />
        <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <BosIlk cumle="Tedarikçi kaydı yok" />
        </section>
      </main>
    );
  }

  const baslik = acikta.length > 0
    ? { vurgu: `${acikta.length} tedarikçi`, metin: 'kritik açıkta' }
    : sirali.some((t) => degerlendir(t).durum === 'md')
      ? { vurgu: `${sirali.filter((t) => degerlendir(t).durum === 'md').length} tedarikçi`,
        metin: 'ufukta' }
      : { vurgu: undefined, metin: 'Bilinen tedarikçi açığı yok' };

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Tedarikçiler · ${sayim.toplam} kayıt`}
          vurgu={baslik.vurgu}
          baslik={baslik.metin}
          metrikler={[
            {
              deger: sayim.izlenmeyen,
              yazi: sayim.oturumBilinmeyen > 0
                ? `İzlenmeyen erişim · ${sayim.oturumBilinmeyen} bilinmiyor`
                : 'İzlenmeyen erişim',
              durum: sayim.izlenmeyen > 0 ? 'bd' : undefined,
            },
            /* ÖLÇÜM metriği. Hiç kayıt akmıyorsa sayı 0'dır ama bu bir
               sonuç değildir: `unk` işaretiyle ve dip notla söylenir. */
            {
              deger: sayim.olculenOturum === 0 ? '—' : sayim.uyumsuzOturum,
              payda: sayim.olculenOturum === 0 ? undefined : sayim.olculenOturum,
              yazi: sayim.olculenOturum === 0
                ? 'Uyumsuz oturum · ölçülmedi'
                : 'Uyumsuz oturum',
              durum: sayim.olculenOturum === 0 ? 'unk'
                : sayim.uyumsuzOturum > 0 ? 'bd' : undefined,
            },
            {
              deger: sertifikaUfku.yakinGun === null ? '—' : `${sertifikaUfku.yakinGun}g`,
              yazi: 'Sertifika doluyor',
              durum: sertifikaUfku.yakinGun === null ? 'unk'
                : sertifikaUfku.yakinGun <= sertifikaUfku.ufuk ? 'bd' : undefined,
            },
            {
              deger: sayim.destekBitiyor,
              yazi: `Destek bitiyor · ${UFUK}g`,
              durum: sayim.destekBitiyor > 0 ? 'md' : undefined,
            },
          ]}
        />

        <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <div className="ab-tablo" role="table"
            style={{ '--kolonlar': KOLONLAR, '--kolonlar-dar': KOLONLAR_DAR } as CSSProperties}>
            <div className="bas" role="row">
              <span />
              <span className="kolonbas">Tedarikçi</span>
              <span className="kolonbas ikincil">Santral</span>
              <span className="kolonbas">Uzak erişim</span>
              <span className="kolonbas">Sözleşme</span>
              <span />
            </div>

            {gosterilen.map((t) => (
              <Satir key={t.id} t={t} secili={seciliId === t.id}
                sec={() => setSeciliId(t.id === seciliId ? null : t.id)} />
            ))}

            {toplanan.length > 0 && (
              <button type="button" className="satir kuyruk"
                style={{ gridTemplateColumns: '22px minmax(0, 1fr) 26px' }}
                onClick={() => setKuyrukAcik(true)}>
                <Im durum="ok" ad={`${toplanan.length} tedarikçide bilinen açık yok`} />
                <span className="" style={{ textAlign: 'left' }}>
                  {toplanan.length} düşük riskli tedarikçi
                </span>
                <span className="ab-ok" style={{ justifySelf: 'end' }} aria-hidden>▾</span>
              </button>
            )}

            {kuyrukAcik && kalan.length > 0 && (
              <p className="ab-dip dip">
                <button type="button" className="ab-dugme satir"
                  onClick={() => setKuyrukAcik(false)}>Kuyruğu topla</button>
              </p>
            )}

            <p className="ab-dip dip">{dipNot}</p>
            <p className="ab-dip" style={{ marginTop: 'var(--s6)' }}>
              Kritiklik kademesi A→D · A en yüksek
            </p>
          </div>
        </section>
      </main>

      {secili && (
        <Cekmece
          kod={asilSozlesme(secili)?.kod ?? 'Sözleşme kaydı yok'}
          kapat={() => setSeciliId(null)}
        >
          <Ozet t={secili} yazabilir={yazabilir} />
        </Cekmece>
      )}
    </>
  );
}

/* ── Satır ────────────────────────────────────────────────────────────── */

function Satir({ t, secili, sec }: { t: T; secili: boolean; sec: () => void }) {
  const d = degerlendir(t);
  const soz = asilSozlesme(t);
  const santral = santralOzeti(t.santraller);

  /* Alt satır durumu TEKRAR ETMEZ, ne olduğunu yazar (06 §A2). Kritiklik
     kademe harfiyle yazılır; sözcük karşılığı yalnız çekmecede geçer. */
  const alt = [
    t.tip ? etiketle(t.tip) : 'tip kayıtlı değil',
    `kritiklik ${KADEME[t.kritiklik] ?? '—'}`,
    d.olgu,
  ].filter(Boolean).join(' · ');

  const sozRenk = soz === null || soz.kalanGun === null ? 'var(--i2)'
    : soz.kalanGun < 0 ? 'var(--bd)'
      : soz.kalanGun <= UFUK ? 'var(--md)' : 'var(--i2)';

  return (
    <div
      role="row"
      aria-selected={secili}
      className="satir"
      onClick={sec}
      style={{ position: 'relative', cursor: 'default',
        borderLeftColor: secili ? `var(--${d.durum})` : undefined }}
    >
      <Im durum={d.durum} ad={d.soz} enKotu={d.sabit} />

      <span role="cell" style={{ minWidth: 0 }}>
        <button type="button" className="konu"
          style={{ background: 'none', border: 0, padding: 0, width: '100%',
            fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
          {t.ad}
        </button>
        <span className="alt">{alt}</span>
      </span>

      {/* Kolon dar kipte DÜŞER: `display` satır içi verilirse .tbl-ikincil'in
          display:none kuralını ezer — hizalama iç sarmalayıcıda yapılır. */}
      <span role="cell" className="ikincil"
        style={{ minWidth: 0, fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s6)', minWidth: 0 }}>
          {santral.gorunen.length === 0 ? (
            <span style={{ color: 'var(--i3)' }} title="bağlı varlık kaydı yok">—</span>
          ) : (
            <>
              {santral.gorunen.map((s) => (
                <Link key={s.id} href={`/tesisler/${s.id}`}
                  onClick={(e) => e.stopPropagation()}
                  title={`${s.ad} · ${s.varlikSayisi} varlık · Plant 360`}
                  style={{ position: 'relative', minWidth: 0, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.ad}
                </Link>
              ))}
              {santral.ekSayi > 0 && (
                <Ipucu genis metin={santral.tam}>
                  <button type="button" className="ab-dugme satir"
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: 'var(--t-cell)', color: 'var(--i2)', whiteSpace: 'nowrap' }}>
                    +{santral.ekSayi}
                  </button>
                </Ipucu>
              )}
            </>
          )}
        </span>
      </span>

      <span role="cell" style={{ minWidth: 0 }}>
        <ErisimHucresi t={t} />
      </span>

      <span role="cell" className=""
        style={{ color: sozRenk, fontWeight: sozRenk === 'var(--i2)' ? 400 : 600 }}
        title={soz
          ? `${soz.kod} · ${soz.ad} · bitiş ${tarihTR(soz.bitis)}`
          : 'sözleşme kaydı yok'}>
        {soz === null ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s6)' }}>
            <Im durum="unk" ad="Sözleşme kaydı yok" /> —
          </span>
        ) : soz.kalanGun !== null && soz.kalanGun >= 0 && soz.kalanGun <= UFUK
          ? `${ayYil(soz.bitis)} · ${soz.kalanGun}g`
          : ayYil(soz.bitis)}
      </span>

      <span className="ab-ok" style={{ justifySelf: 'end' }} aria-hidden>▸</span>
    </div>
  );
}

/** Uzak erişim hücresi — üç değerli BEYANIN üç ayrı yüzü, artı ÖLÇÜM.
    Ölçüm varsa o konuşur: beyan "kayıtlı" dese bile kaynak "onaysız" diyorsa
    hücre ihlali yazar. Ölçüm yoksa beyan konuşur ama "ölçüldü" gibi
    görünmez. */
function ErisimHucresi({ t }: { t: T }) {
  // Uzaktan erişimi olmayan tedarikçide bu alan HİÇ gösterilmez.
  if (!t.uzaktanErisimVar) return null;

  const yontem = YONTEM_ETIKET[t.uzaktanErisimYontemi ?? 'yok'] ?? 'yöntem kayıtsız';

  if (t.oturum.uyumsuzSayisi > 0) {
    return (
      <Ipucu genis metin={t.oturum.gerekce}>
        <button type="button" className="ab-dugme satir" onClick={(e) => e.stopPropagation()}
          style={{ fontSize: 'var(--t-cell)', fontWeight: 600, color: 'var(--bd)',
            whiteSpace: 'nowrap' }}>
          {yontem} · {t.oturum.uyumsuzSayisi} uyumsuz
        </button>
      </Ipucu>
    );
  }

  if (t.oturum.kapsam === 'kayit_var') {
    return (
      <Ipucu genis metin={t.oturum.gerekce}>
        <span className="" style={{ color: 'var(--i2)' }}>
          {yontem} · {t.oturum.toplam} oturum
        </span>
      </Ipucu>
    );
  }

  if (t.oturumKaydiVar === true) {
    return (
      <Ipucu genis metin={t.oturum.gerekce}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s6)',
          fontSize: 'var(--t-cell)', color: 'var(--i2)', whiteSpace: 'nowrap' }}>
          <Im durum="unk" ad="Beyan var, ölçüm yok" />
          {yontem} · beyan
        </span>
      </Ipucu>
    );
  }

  if (t.oturumKaydiVar === false) {
    return (
      <Ipucu genis metin={erisimAciklamasi(t)}>
        <button type="button" className="ab-dugme satir" onClick={(e) => e.stopPropagation()}
          style={{ fontSize: 'var(--t-cell)', fontWeight: 600, color: 'var(--bd)' }}>
          izlenmiyor
        </button>
      </Ipucu>
    );
  }

  // null → bilinmiyor. Sıfır değil, "alınmıyor" da değil: elmas + —
  return (
    <Ipucu genis metin={erisimAciklamasi(t)}>
      <button type="button" className="ab-dugme satir" onClick={(e) => e.stopPropagation()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s6)',
          fontSize: 'var(--t-cell)', color: 'var(--i2)', whiteSpace: 'nowrap' }}>
        <Im durum="unk" ad="Oturum kaydı bilinmiyor" />
        {yontem} · —
      </button>
    </Ipucu>
  );
}

/* ── Çekmece özeti ────────────────────────────────────────────────────── */

function Ozet({ t, yazabilir }: { t: T; yazabilir: boolean }) {
  const d = degerlendir(t);
  const soz = asilSozlesme(t);
  const sertifikalar = [...t.sertifikalar].sort((a, b) => a.kalanGun - b.kalanGun);
  const ilgiliSertifikalar = sertifikalar.filter((s) => s.kalanGun <= UFUK);

  const guvenlikSarti: { deger: ReactNode; durum?: Durum } =
    soz === null ? { deger: '—', durum: 'unk' }
      : soz.guvenlikSartlariVar === true ? { deger: 'Var', durum: 'ok' }
        : soz.guvenlikSartlariVar === false ? { deger: 'Yok', durum: 'bd' }
          : { deger: 'Bilinmiyor', durum: 'unk' };

  const oturum: { deger: ReactNode; durum?: Durum } =
    t.oturumKaydiVar === true ? { deger: 'Alınıyor', durum: 'ok' }
      : t.oturumKaydiVar === false ? { deger: 'Alınmıyor', durum: 'bd' }
        : { deger: 'Bilinmiyor', durum: 'unk' };

  const santralBaglari = [...t.santraller]
    .sort((a, b) => b.varlikSayisi - a.varlikSayisi || a.ad.localeCompare(b.ad, 'tr'))
    .slice(0, 6)
    .map((s) => ({
      id: s.id, kod: s.ad, alt: `${s.kod} · ${s.varlikSayisi} varlık`,
      yol: `/tesisler/${s.id}`,
    }));

  return (
    <>
      <CekmeceKimlik durum={d.durum} soz={d.soz} baslik={t.ad} cumle={d.cumle} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Sözleşme', deger: soz?.kod ?? '—', durum: soz ? undefined : 'unk' },
        {
          etiket: 'Dönem',
          deger: soz ? `${tarihTR(soz.baslangic)} – ${tarihTR(soz.bitis)}` : '—',
          durum: soz ? undefined : 'unk',
        },
        {
          etiket: 'Bitişe kalan',
          deger: soz === null || soz.kalanGun === null ? '—'
            : soz.kalanGun < 0 ? `${Math.abs(soz.kalanGun)} gün önce bitti`
              : `${soz.kalanGun} gün`,
          durum: soz === null || soz.kalanGun === null ? 'unk'
            : soz.kalanGun < 0 ? 'bd' : soz.kalanGun <= UFUK ? 'md' : undefined,
        },
        { etiket: 'Destek kapsamı', deger: soz?.slaOzeti ?? '—', durum: soz?.slaOzeti ? undefined : 'unk' },
        { etiket: 'Güvenlik şartları', deger: guvenlikSarti.deger, durum: guvenlikSarti.durum },
      ]} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Tip', deger: t.tip ? etiketle(t.tip) : '—',
          durum: t.tip ? undefined : 'unk' },
        { etiket: 'Kritiklik', deger: etiketle(t.kritiklik) },
        {
          etiket: 'Uzaktan erişim',
          deger: t.uzaktanErisimVar
            ? YONTEM_ETIKET[t.uzaktanErisimYontemi ?? 'yok'] ?? 'Yöntem kayıtlı değil'
            : t.uzaktanErisimYontemi && t.uzaktanErisimYontemi !== 'yok'
              ? `Yok · kayıtlı yöntem ${YONTEM_ETIKET[t.uzaktanErisimYontemi] ?? t.uzaktanErisimYontemi}`
              : 'Yok',
          durum: t.uzaktanErisimVar && !t.uzaktanErisimYontemi ? 'unk' : undefined,
        },
        // Oturum kaydı yalnız uzaktan erişimi olan tedarikçide anlamlıdır.
        ...(t.uzaktanErisimVar
          ? [{ etiket: 'Oturum kaydı', deger: oturum.deger, durum: oturum.durum }]
          : []),
        {
          etiket: 'Bağlı varlık',
          deger: t.varlikSayisi === 0 ? '—'
            : `${t.varlikSayisi}${t.kritikVarlikSayisi > 0 ? ` · ${t.kritikVarlikSayisi} kritik` : ''}`,
          durum: t.varlikSayisi === 0 ? 'unk' : undefined,
        },
      ]} />

      {sertifikalar.length > 0 && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
            Sertifika · {sertifikalar.length}
          </p>
          <div style={{ display: 'grid', gap: 'var(--s10)' }}>
            {(ilgiliSertifikalar.length > 0 ? ilgiliSertifikalar : sertifikalar.slice(0, 2))
              .map((s) => <SertifikaSatiri key={s.id} s={s} />)}
          </div>
          {ilgiliSertifikalar.length === 0 && sertifikalar.length > 2 && (
            <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
              {sertifikalar.length - 2} sertifika daha · hepsi {UFUK} günün ötesinde
            </p>
          )}
        </div>
      )}

      {santralBaglari.length > 0 ? (
        <>
          <CekmeceBagli baslik={`Santral · ${t.santraller.length}`} kayitlar={santralBaglari} />
          {t.santraller.length > santralBaglari.length && (
            <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
              {t.santraller.length - santralBaglari.length} santral daha
            </p>
          )}
        </>
      ) : (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Santral</p>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Bu tedarikçiye bağlanmış varlık kaydı yok — hizmet verdiği santral
            envanterden türetilemiyor.
          </p>
        </div>
      )}

      {t.riskler.length > 0 ? (
        <CekmeceBagli baslik="Bağlı risk" kayitlar={t.riskler.slice(0, 4)} />
      ) : (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Bağlı risk</p>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Açık risk kaydı bağlanmamış.
          </p>
        </div>
      )}

      {t.kontroller.length > 0 && (
        <CekmeceBagli baslik="Kontrol" kayitlar={t.kontroller.slice(0, 4)} />
      )}

      <ErisimOturumlari t={t} />

      <TedarikciEylemleri tedarikci={t} yazabilir={yazabilir} />
    </>
  );
}

function SertifikaSatiri({ s }: { s: SertifikaOzeti }) {
  const durum: Durum = s.kalanGun < 0 ? 'bd' : s.kalanGun <= UFUK ? 'md' : 'ok';
  return (
    <div style={{ background: 'var(--panel)', border: 'var(--bw-hair) solid var(--hr2)',
      padding: 'var(--s12) var(--s14)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s10)' }}>
        <span style={{ fontSize: 'var(--t-cell)', fontWeight: 600, minWidth: 0 }}>{s.ad}</span>
        <span className="num" style={{ marginLeft: 'auto', fontSize: 'var(--t-cell)',
          fontWeight: 600, color: `var(--${durum})`, whiteSpace: 'nowrap' }}>
          {s.kalanGun < 0 ? `${Math.abs(s.kalanGun)}g önce` : `${s.kalanGun}g`}
        </span>
      </div>
      <p className="ab-panel-dip" style={{ margin: 'var(--s6) 0 var(--s10)' }}>
        {tarihTR(s.bitis)}{s.veren ? ` · ${s.veren}` : ''}
        {s.varlikEtiketi ? ` · ${s.varlikEtiketi}` : ''}
      </p>
      <SertifikaYenile sertifika={s} />
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BosIlk, Dugme, Im, type Durum } from '@/components/atlas/temel';
import { GenisleyenSatir } from '@/components/atlas/tablo';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import { CekmeceKimlik } from '@/components/atlas/cekmece';
import { tarihTR } from '@/lib/sabitler';
import { AktiflestirmeOnayi, MaddeFormu, TaslakFormu } from './Formlar';
import {
  acilisCercevesi, agaciKur, aktifSurum, alansizMi, alansizSayisi, dallar, eslesiyor,
  FARK_ETIKET, FARK_IM, gercekFarklar, maddeImi, silinebilir, surumCumlesi,
  surumImi, surumOzeti, surumSozu, surumsuzSayisi, taslakSurumler, yapraklar,
  type Alan, type Madde, type Reg, type Surum,
} from './mantik';

/* Regülasyon kütüphanesi — "hangi çerçeve hangi sürümde, kataloğu tam mı?"

   İki yüzey: solda madde ağacı (kontrol kataloğunun kendisi), sağda kalıcı
   420px sürüm paneli. Sürüm yaşam döngüsü kritik bilgidir ve hover'da
   yaşayamaz; bu yüzden panel DAİMA açıktır (03-screens O2 kapsam paneliyle
   aynı kalıp) ve fark önizlemesi ikinci bir panel değil, aynı panelin
   içeriğidir.

   /uyum ile çakışmaz: orada ağacın UYUM durumu okunur, burada ağacın
   KENDİSİ tanımlanır — işaretçi katalog bütünlüğünü kodlar. */

/** 06 §A3: aynı anda 5–9 bölüm görünür; kalanı tek satıra toplanır. */
const KOK_BUTCESI = 7;

type Kip = 'surum' | 'taslak' | 'fark' | 'aktiflestir' | 'madde';

const PANEL_KODU: Record<Kip, string> = {
  surum: 'Sürümler', taslak: 'Yeni taslak', fark: 'Sürüm farkı',
  aktiflestir: 'Yürürlüğe alma', madde: 'Madde',
};

export default function RegulasyonlarIstemci({
  regulasyonlar, alanlar, yazabilir, onaylayabilir,
}: {
  regulasyonlar: Reg[];
  alanlar: Alan[];
  yazabilir: boolean;
  onaylayabilir: boolean;
}) {
  const [seciliReg, setSeciliReg] = useState(() => acilisCercevesi(regulasyonlar)?.id ?? '');
  const [arama, setArama] = useState('');
  const [kip, setKip] = useState<Kip>('surum');
  const [maddeId, setMaddeId] = useState<string | null>(null);
  const [surumId, setSurumId] = useState<string | null>(null);
  const [hepsiAcik, setHepsiAcik] = useState(false);

  const reg = regulasyonlar.find((r) => r.id === seciliReg) ?? regulasyonlar[0] ?? null;
  const agac = useMemo(() => agaciKur(reg?.maddeler ?? []), [reg]);

  const kokler = useMemo(
    () => (agac.get(null) ?? []).filter((m) => eslesiyor(m, arama, agac)),
    [agac, arama],
  );
  const gorunurKokler = hepsiAcik || arama.trim() ? kokler : kokler.slice(0, KOK_BUTCESI);

  if (!reg) {
    return (
      <main style={{ minWidth: 0 }}>
        <EkranBasligi eyebrow="Regülasyon kütüphanesi" baslik="Çerçeve tanımlı değil" />
        <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <BosIlk
            cumle="Sistemde regülasyon kaydı yok."
            eylem={<Link className="dg dg-birincil" href="/ice-aktarim">Katalog içe aktar</Link>}
          />
        </section>
      </main>
    );
  }

  const alansiz = alansizSayisi(reg, agac);
  const surumsuz = surumsuzSayisi(reg);
  const madde = maddeId ? reg.maddeler.find((m) => m.id === maddeId) ?? null : null;
  const surum = surumId ? reg.surumler.find((s) => s.id === surumId) ?? null : null;

  const baslik = reg.maddeler.length === 0
    ? { vurgu: undefined, ad: 'Katalog boş', durum: undefined }
    : alansiz > 0
      ? { vurgu: `${alansiz} madde`, ad: 'alansız', durum: 'md' as Durum }
      : { vurgu: `${reg.maddeler.length} madde`, ad: 'kayıtlı', durum: undefined };

  function cerceveSec(id: string) {
    setSeciliReg(id);
    setKip('surum');
    setMaddeId(null);
    setSurumId(null);
    setHepsiAcik(false);
  }

  function maddeAc(id: string | null) {
    setMaddeId(id);
    setKip('madde');
  }

  function panele(k: Kip) {
    setKip(k);
    if (k !== 'madde') setMaddeId(null);
    if (k !== 'fark' && k !== 'aktiflestir') setSurumId(null);
  }

  return (
    <>
      <main style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`${reg.kod} · ${regulasyonlar.length} çerçeve kütüphanede`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            { deger: reg.maddeler.length, yazi: 'Madde' },
            { deger: alansiz, yazi: 'Alansız', durum: alansiz > 0 ? 'md' : undefined },
            { deger: surumsuz, yazi: 'Sürümsüz', durum: surumsuz > 0 ? 'unk' : undefined },
            { deger: reg.surecSayisi, yazi: 'Kampanya' },
          ]}
        />

        <section className="ekran-govde">
          <Filtreler
            secenekler={regulasyonlar.map((r) => ({ id: r.id, ad: r.kod }))}
            aktif={reg.id}
            sec={cerceveSec}
            kapsam={
              <>
                <Ara deger={arama} degistir={setArama} />
                {yazabilir && (
                  <button type="button" className="kapsam-dugme" onClick={() => maddeAc(null)}>
                    + Madde
                  </button>
                )}
              </>
            }
          />

          {reg.maddeler.length === 0 ? (
            <div style={{ marginTop: 'var(--s26)' }}>
              <BosIlk
                cumle={`${reg.kod} kataloğu henüz yüklenmedi.`}
                eylem={<Link className="dg dg-birincil" href="/ice-aktarim">Katalog içe aktar</Link>}
              />
            </div>
          ) : kokler.length === 0 ? (
            <div className="bos-filtre">
              <span>Bu aramayla madde yok.</span>
              <button type="button" className="dg dg-satir"
                onClick={() => setArama('')}>Aramayı temizle</button>
            </div>
          ) : (
            <div style={{ marginTop: 'var(--s26)',
              borderTop: 'var(--bw-strong) solid var(--hr2)' }}>
              {gorunurKokler.map((k) => (
                <Bolum key={k.id} bolum={k} agac={agac} regId={reg.id} arama={arama}
                  secili={maddeId} ac={maddeAc} />
              ))}

              {gorunurKokler.length < kokler.length && (
                <p className="dip-not">
                  {kokler.length - gorunurKokler.length} bölüm toplandı ·{' '}
                  <button type="button" className="dg dg-satir"
                    style={{ fontSize: 'inherit', fontWeight: 400 }}
                    onClick={() => setHepsiAcik(true)}>Tümünü aç</button>
                </p>
              )}

              <p className="dip-not">
                Bölüm başlığı aileyi açar · madde satırı kaydı sağ panelde düzenler
                {alansiz > 0 && ` · ${alansiz} yaprak maddenin kapsam alanı eşleşmemiş`}
                {surumsuz > 0 && ` · ${surumsuz} madde sürüme bağlı değil`}
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Kalıcı yan panel — bu ekranın TEK yan yüzeyi; modal açılmaz. */}
      <aside className="cekmece" aria-label={PANEL_KODU[kip]}>
        <div className="cekmece-bas">
          <span className="kod">{PANEL_KODU[kip]}</span>
          {kip !== 'surum' && (
            <button type="button" className="cekmece-kapat" onClick={() => panele('surum')}
              aria-label="Sürüm paneline dön">✕</button>
          )}
        </div>
        <div className="cekmece-govde">
          {kip === 'surum' && (
            <SurumPaneli reg={reg} agac={agac} yazabilir={yazabilir}
              onaylayabilir={onaylayabilir}
              taslak={() => panele('taslak')}
              fark={(id) => { setSurumId(id); setKip('fark'); }}
              aktiflestir={(id) => { setSurumId(id); setKip('aktiflestir'); }} />
          )}
          {kip === 'taslak' && (
            <div className="cekmece-blok">
              <TaslakFormu reg={reg} kapat={() => panele('surum')} />
            </div>
          )}
          {kip === 'fark' && surum && (
            <FarkPaneli surum={surum} />
          )}
          {kip === 'aktiflestir' && surum && (
            <div className="cekmece-blok">
              <AktiflestirmeOnayi surum={surum} kapat={() => panele('surum')} />
            </div>
          )}
          {kip === 'madde' && (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>
                  {madde ? `${madde.kisaKod} · düzenle` : `${reg.kod} · yeni madde`}
                </p>
              </div>
              <div className="cekmece-blok">
                <MaddeFormu madde={madde} reg={reg} alanlar={alanlar}
                  kapat={() => panele('surum')} />
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

/* Arama kutusu: kutu yok, kenarlık yok — tek satır alt çizgili girdi
   (02-components §4). */
function Ara({ deger, degistir }: { deger: string; degistir: (v: string) => void }) {
  return (
    <input
      className="gr"
      aria-label="Madde kodu, başlığı ya da metni ara"
      placeholder="Ara"
      value={deger}
      onChange={(e) => degistir(e.target.value)}
      style={{
        width: 118, background: 'none', border: 0,
        borderBottom: 'var(--bw-hair) solid var(--hr2)',
        padding: '3px 0', fontFamily: 'var(--mo)', fontSize: 'var(--t-label)',
        letterSpacing: 'var(--tr-label)', textTransform: 'uppercase',
      }}
    />
  );
}

/* ── Katalog ağacı ──────────────────────────────────────────────────── */

function Bolum({ bolum, agac, regId, arama, secili, ac }: {
  bolum: Madde;
  agac: ReturnType<typeof agaciKur>;
  regId: string;
  arama: string;
  secili: string | null;
  ac: (id: string) => void;
}) {
  const altlar = dallar(bolum, agac).filter((d) => eslesiyor(d.madde, arama, agac));
  // Alt maddesi olmayan kök madde kendi yaprağıdır: sayaç 1'dir, "yok" değil.
  const yaprakSayisi = yapraklar(bolum, agac).length;

  return (
    <GenisleyenSatir
      grup={`reg-${regId}`}
      ad={`${bolum.kisaKod} — ${bolum.baslik}`}
      adet={`${yaprakSayisi}`}
      durum={maddeImi(bolum, agac)}
      varsayilanAcik={!!arama.trim() || secili === bolum.id
        || altlar.some((d) => d.madde.id === secili)}
      cocuklar={
        <>
          {/* Bölümün kendi kaydı da düzenlenebilir olmalı: başlık satırı
              <summary> içinde yaşadığı için tıklama oraya bağlanamaz. */}
          <MaddeSatiri madde={bolum} agac={agac} derinlik={0} secili={secili}
            ac={ac} kendiKaydi />
          {altlar.map((d) => (
            <MaddeSatiri key={d.madde.id} madde={d.madde} agac={agac}
              derinlik={d.derinlik + 1} secili={secili} ac={ac} />
          ))}
        </>
      }
    />
  );
}

function MaddeSatiri({ madde, agac, derinlik, secili, ac, kendiKaydi = false }: {
  madde: Madde;
  agac: ReturnType<typeof agaciKur>;
  derinlik: number;
  secili: string | null;
  ac: (id: string) => void;
  kendiKaydi?: boolean;
}) {
  const im = maddeImi(madde, agac);
  const alansiz = alansizMi(madde, agac);
  const kapsam = kendiKaydi
    ? (silinebilir(madde) ? 'kullanılmıyor' : `${madde.kullanimSayisi} değerlendirme`)
    : alansiz
      ? 'alan eşleşmemiş'
      : madde.alanlar.map((a) => a.kod).join(' · ');

  return (
    <button
      type="button"
      className="satir"
      aria-current={secili === madde.id ? 'true' : undefined}
      onClick={() => ac(madde.id)}
      style={{
        width: '100%', background: secili === madde.id ? 'var(--row-sel)' : 'none',
        border: 0, borderBottom: 'var(--bw-hair) solid var(--hr)',
        font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer',
        paddingLeft: derinlik * 16,
      }}
    >
      <span className="kod">{kendiKaydi ? 'kayıt' : madde.kisaKod}</span>
      <span className="ad" style={{ overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' }}>
        {madde.baslik}
      </span>
      <span className="kapsam">{kapsam}</span>
      {/* İşaretçi kendi kutusunda durur: yanındaki metinle karışmaz. */}
      <span><Im durum={im} ad={`${madde.kisaKod} katalog kaydı`} /></span>
    </button>
  );
}

/* ── Sürüm paneli ─────────────────────────────────────────────────────
   §42: yeni sürüm eskiyi EZMEZ, diff üretir. Panel bu sözleşmeyi anlatır
   ve yürürlüğe almayı iki adıma böler. */

function SurumPaneli({ reg, agac, yazabilir, onaylayabilir, taslak, fark, aktiflestir }: {
  reg: Reg;
  agac: ReturnType<typeof agaciKur>;
  yazabilir: boolean;
  onaylayabilir: boolean;
  taslak: () => void;
  fark: (id: string) => void;
  aktiflestir: (id: string) => void;
}) {
  const aktif = aktifSurum(reg);
  const taslaklar = taslakSurumler(reg);

  return (
    <>
      {/* Durum SÖZCÜĞÜ ürün genelinde yalnız burada geçer (06 §A2). */}
      <CekmeceKimlik
        durum={surumImi(reg)}
        soz={surumSozu(reg)}
        baslik={reg.ad}
        cumle={surumCumlesi(reg, agac)}
      />

      <div className="cekmece-blok" style={{ marginTop: 'var(--s22)' }}>
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>
          Sürüm yaşam döngüsü
        </p>
        {reg.surumler.length === 0 ? (
          <p className="cekmece-dip" style={{ margin: 0 }}>
            Sürüm kaydı yok — maddeler geçiş dönemi kaydı olarak duruyor.
            Taslak açılınca kopyalanır.
          </p>
        ) : reg.surumler.map((s) => (
          <SurumSatiri key={s.id} surum={s} yazabilir={yazabilir}
            onaylayabilir={onaylayabilir} fark={fark} aktiflestir={aktiflestir} />
        ))}
      </div>

      {yazabilir && (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
          <Dugme tur="cekmece" onClick={taslak}>Taslak sürüm aç</Dugme>
        </div>
      )}

      <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Kütüphane</p>
        <div className="cekmece-bagli">
          <Link href={`/uyum/${encodeURIComponent(reg.kod)}`}>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--t-cell)', fontWeight: 600 }}>
                {reg.kod} çerçevesi
              </span>
              <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--mo)',
                fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                uyum durumu
              </span>
            </span>
            <span className="tbl-ok" style={{ marginLeft: 'auto' }} aria-hidden>▸</span>
          </Link>
          <Link href="/eslestirme">
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--t-cell)', fontWeight: 600 }}>
                Çapraz eşleme
              </span>
              <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--mo)',
                fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                madde denklikleri
              </span>
            </span>
            <span className="tbl-ok" style={{ marginLeft: 'auto' }} aria-hidden>▸</span>
          </Link>
          <Link href="/ice-aktarim">
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--t-cell)', fontWeight: 600 }}>
                İçe aktarım
              </span>
              <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--mo)',
                fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                Excel katalog yükleme
              </span>
            </span>
            <span className="tbl-ok" style={{ marginLeft: 'auto' }} aria-hidden>▸</span>
          </Link>
        </div>
      </div>

      <p className="cekmece-dip" style={{ marginTop: 'var(--s22)', paddingTop: 'var(--s18)',
        borderTop: 'var(--bw-strong) solid var(--hr2)' }}>
        {aktif?.yururluk
          ? `Yürürlük ${tarihTR(aktif.yururluk)}`
          : 'Yürürlük tarihi girilmedi'}
        {taslaklar.length > 0 && ` · ${taslaklar.length} taslak bekliyor`}
        {reg.surecSayisi > 0 && ` · ${reg.surecSayisi} kampanyada kullanılıyor`}
      </p>
    </>
  );
}

function SurumSatiri({ surum, yazabilir, onaylayabilir, fark, aktiflestir }: {
  surum: Surum;
  yazabilir: boolean;
  onaylayabilir: boolean;
  fark: (id: string) => void;
  aktiflestir: (id: string) => void;
}) {
  const farkSayisi = gercekFarklar(surum).length;
  return (
    <div style={{ padding: 'var(--s12) 0',
      borderBottom: 'var(--bw-hair) solid var(--hr)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s10)' }}>
        <span style={{ fontFamily: 'var(--mo)', fontSize: 'var(--t-code-lg)',
          fontWeight: 600 }}>{surum.etiket}</span>
        <span style={{ marginLeft: 'auto', fontSize: 'var(--t-field)', color: 'var(--i3)' }}>
          {surumOzeti(surum)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s12)',
        marginTop: 'var(--s8)' }}>
        <span className="cekmece-dip">
          {surum.durum === 'aktif' ? 'yürürlükte'
            : surum.durum === 'taslak' ? 'taslak' : 'arşiv'}
          {surum.yururluk && ` · ${tarihTR(surum.yururluk)}`}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--s12)' }}>
          {farkSayisi > 0 && (
            <button type="button" className="dg dg-satir" onClick={() => fark(surum.id)}>
              Δ {farkSayisi} fark
            </button>
          )}
          {surum.durum === 'taslak' && yazabilir && onaylayabilir && (
            <button type="button" className="dg dg-satir"
              onClick={() => aktiflestir(surum.id)}>
              Yürürlüğe al ▸
            </button>
          )}
        </span>
      </div>
    </div>
  );
}

/* ── Fark önizlemesi ──────────────────────────────────────────────────
   §66: regülasyon değişirse eski değerlendirmeler korunur, yalnız değişen
   maddeler yeni değerlendirme ister. Panel tam olarak bunu listeler. */

function FarkPaneli({ surum }: { surum: Surum }) {
  const farklar = gercekFarklar(surum);
  const gruplar = ['kaldirildi', 'degisti', 'yeni'] as const;

  return (
    <>
      <div className="cekmece-blok">
        <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
          {surum.etiket} sürümü önceki katalogla karşılaştırıldı:
          {' '}{farklar.length} maddede içerik farkı var.
        </p>
      </div>

      {farklar.length === 0 ? (
        <p className="cekmece-dip" style={{ marginTop: 'var(--s18)' }}>
          İçerik farkı üretilmedi — maddeler birebir aynı.
        </p>
      ) : gruplar.map((tip) => {
        const liste = farklar.filter((f) => f.tip === tip);
        if (liste.length === 0) return null;
        return (
          <div key={tip} className="cekmece-blok" style={{ marginTop: 'var(--s20)' }}>
            <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>
              {FARK_ETIKET[tip]} · {liste.length}
            </p>
            {liste.map((f, i) => (
              <div key={`${f.kod}-${i}`} className="cekmece-alan">
                <span className="etiket" style={{ display: 'flex', alignItems: 'center',
                  gap: 'var(--s8)', minWidth: 0 }}>
                  <span><Im durum={FARK_IM[f.tip] ?? 'unk'} ad={FARK_ETIKET[f.tip] ?? f.tip} /></span>
                  <span style={{ fontFamily: 'var(--mo)' }}>{f.kod}</span>
                </span>
                <span className="deger" style={{ fontWeight: 400, minWidth: 0 }}>
                  {f.ozet ?? '—'}
                  {f.etki && (
                    <span style={{ display: 'block', marginTop: 2,
                      fontFamily: 'var(--mo)', fontSize: 'var(--t-label)',
                      color: 'var(--i3)' }}>{f.etki}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        );
      })}

      <p className="cekmece-dip" style={{ marginTop: 'var(--s22)', paddingTop: 'var(--s18)',
        borderTop: 'var(--bw-strong) solid var(--hr2)' }}>
        Kaldırılan maddelerin geçmiş değerlendirmeleri tarihçede kalır;
        değişen ve yeni maddeler için aktif kampanyalarda yeni değerlendirme
        açılır.
      </p>
    </>
  );
}

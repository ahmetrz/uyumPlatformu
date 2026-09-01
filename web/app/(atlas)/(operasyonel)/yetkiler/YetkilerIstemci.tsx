'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dugme, Kesir, BosIlk, BosFiltre, type Durum } from '@/components/abacus/temel';
import { Tablo, type Kolon, type Satir } from '@/components/abacus/tablo';
import { EkranBasligi, Filtreler } from '@/components/abacus/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceEylemler,
} from '@/components/abacus/panel';
import { useEylem } from '@/components/useEylem';
import { yetkiSil, kullaniciAktifDegistir } from '@/lib/eylemler';
import { ROLLER, ROL_ETIKET } from '@/lib/sabitler';
import { KullaniciFormu, YetkiFormu } from './Formlar';
import {
  artikYetki, durumCumlesi, durumSozu, enGenisRol, erisimsiz, hesapDurumu,
  kapsamMetni, kapsamsiz, kapsamsizYonetici, metrikleriHesapla, rolEtiketi,
  sirala, toplanabilir, yetkiKapsami,
  type Hesap, type Secenek,
} from './mantik';

/* Kullanıcı & yetki — "kim neye erişiyor, kimin fazlası var?"
   Tek canvas modülü: erişim kütüğü. Durum sözcüğü canvasta GEÇMEZ; satırın
   işaretçisi erişimin sağlam olup olmadığını söyler, "Rol" kolonu hesabın
   en geniş rolünü yazar — ikisi farklı şeydir.

   Erişim kusuru olan satırlar (yetkisiz hesap, pasif hesapta duran artık
   yetki, kapsamsız yönetici) sıralamadan bağımsız üstte durur ve ASLA
   kuyruğa inmez. Detay modalda değil 420px çekmecede açılır (06 §B4). */

/** 06 §A3: tabloda 5–9 satır görünür; sabitlenen satırlar bütçenin dışında. */
const GORUNUR_BUTCE = 7;

const KOLONLAR: Kolon[] = [
  { baslik: 'Rol', genislik: '150px', siraAnahtari: 'rol' },
  { baslik: 'Kapsam', genislik: '178px' },
  { baslik: 'Yetki', genislik: '58px', sag: true, siraAnahtari: 'yetki' },
  { baslik: 'Unvan', genislik: '176px', ikincil: true },
];

const MERCEKLER = [
  { id: 'hepsi', ad: 'Tümü' },
  { id: 'yetkisiz', ad: 'Yetkisiz' },
  { id: 'ayricalikli', ad: 'Ayrıcalıklı' },
  { id: 'artik', ad: 'Artık yetki' },
  { id: 'kapali', ad: 'Kapalı hesap' },
];

type Anahtar = 'konu' | 'rol' | 'yetki';
type SiraYonu = 'artan' | 'azalan';
type Kip = 'ozet' | 'kullanici' | 'yetki';

export default function YetkilerIstemci({
  hesaplar, surecler, tesisler, yazabilir, onaylayabilir, kisitliKapsam,
}: {
  hesaplar: Hesap[];
  surecler: Secenek[];
  tesisler: Secenek[];
  yazabilir: boolean;
  onaylayabilir: boolean;
  kisitliKapsam: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [mercek, setMercek] = useState('hepsi');
  const [rolF, setRolF] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [sira, setSira] = useState<{ anahtar: Anahtar; yon: SiraYonu }>(
    { anahtar: 'konu', yon: 'artan' });
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [kip, setKip] = useState<Kip>('ozet');
  const [yeniAcik, setYeniAcik] = useState(false);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const secili = hesaplar.find((h) => h.id === seciliId) ?? null;

  /* ── metrikler · filtrelerden BAĞIMSIZ, kütüğün tamamı ─────────────── */
  const m = useMemo(() => metrikleriHesapla(hesaplar), [hesaplar]);

  /* ── mercek + kapsam ───────────────────────────────────────────────── */
  const suzulmus = useMemo(() => hesaplar.filter((h) => {
    if (mercek === 'yetkisiz' && !erisimsiz(h)) return false;
    if (mercek === 'ayricalikli' && !kapsamsizYonetici(h)) return false;
    if (mercek === 'artik' && !artikYetki(h)) return false;
    if (mercek === 'kapali' && h.aktif) return false;
    if (rolF && !h.yetkiler.some((y) => y.rol === rolF)) return false;
    if (arama) {
      const havuz = `${h.ad} ${h.eposta} ${h.unvan ?? ''} `
        + h.yetkiler.map((y) => `${rolEtiketi(y.rol)} ${yetkiKapsami(y)}`).join(' ');
      if (!havuz.toLocaleLowerCase('tr-TR').includes(arama.toLocaleLowerCase('tr-TR'))) return false;
    }
    return true;
  }), [hesaplar, mercek, rolF, arama]);

  /* Erişim kusurları üste sabitlenir ve toplanmaz; sağlıklı ve kapalı
     hesaplar tek kuyruk satırında toplanır (06 §A3). */
  const bolumler = useMemo(() => {
    const yon = sira.yon === 'artan' ? 1 : -1;
    const karsilastir = (a: Hesap, b: Hesap) => {
      switch (sira.anahtar) {
        case 'rol':
          return (rolEtiketi(enGenisRol(a)).localeCompare(rolEtiketi(enGenisRol(b)), 'tr')) * yon;
        case 'yetki':
          return (a.yetkiler.length - b.yetkiler.length) * yon;
        default:
          return a.ad.localeCompare(b.ad, 'tr') * yon;
      }
    };
    const taban = sirala(suzulmus);
    return {
      sabit: taban.filter((h) => !toplanabilir(h)).sort(karsilastir),
      kalan: taban.filter(toplanabilir).sort(karsilastir),
    };
  }, [suzulmus, sira]);

  const { gorunur, toplanan } = useMemo(() => {
    const { sabit, kalan } = bolumler;
    if (kuyrukAcik) return { gorunur: [...sabit, ...kalan], toplanan: [] as Hesap[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return { gorunur: [...sabit, ...kalan.slice(0, slot)], toplanan: kalan.slice(slot) };
  }, [bolumler, kuyrukAcik]);

  const satirlar: Satir[] = gorunur.map((h) => {
    const d = hesapDurumu(h);
    return {
      id: h.id,
      durum: d,
      kenar: d,
      konu: h.ad,
      alt: `${h.eposta}${h.aktif ? '' : ' · hesap kapalı'}`,
      hucreler: [
        rolEtiketi(enGenisRol(h)),
        kapsamMetni(h),
        h.yetkiler.length > 0 ? h.yetkiler.length : <Bos key="y" />,
        h.unvan ?? <Bilinmiyor key="u" />,
      ],
    };
  });

  const filtreAktif = mercek !== 'hepsi' || rolF !== null || arama.trim() !== '';

  function sec(id: string) {
    setSeciliId((o) => (o === id ? null : id));
    setKip('ozet');
    setYeniAcik(false);
  }

  /* ── başlık: erişim kusuru varsa vurgu kritik rengi taşır ──────────── */
  const baslik = m.yetkisiz > 0
    ? { vurgu: `${m.yetkisiz} hesap`, ad: 'yetkisiz', durum: 'bd' as Durum }
    : m.artik > 0
      ? { vurgu: `${m.artik} artık yetki`, ad: 'kapalı hesapta duruyor', durum: 'bd' as Durum }
      : m.ayricalikli > 0
        ? { vurgu: `${m.ayricalikli} hesap`, ad: 'portföyün tamamında yetkili', durum: 'md' as Durum }
        : { vurgu: `${m.aktif} hesap`, ad: 'kapsamıyla sınırlı', durum: undefined };

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Kullanıcı ve yetki · ${m.hesap} hesap`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.ad}
          metrikler={[
            { deger: m.yetkisiz, yazi: 'Yetkisiz hesap', durum: m.yetkisiz > 0 ? 'bd' : undefined },
            { deger: m.ayricalikli, yazi: 'Ayrıcalıklı', durum: m.ayricalikli > 0 ? 'md' : undefined },
            { deger: m.artik, yazi: 'Artık yetki', durum: m.artik > 0 ? 'bd' : undefined },
            {
              deger: <Kesir pay={m.yetkiKapsamli} payda={m.yetkiToplam} />,
              yazi: 'Kapsamlı yetki',
            },
          ]}
        />

        <section className="ab-ekran-govde">
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Ara deger={arama} degistir={(v) => { setArama(v); setKuyrukAcik(false); }} />
                <Kapsam etiket="Rol" aktif={rolF}
                  sec={(id) => { setRolF(id); setKuyrukAcik(false); }}
                  secenekler={ROLLER.map((r) => ({ id: r, ad: ROL_ETIKET[r] }))} />
                {yazabilir && (
                  <button type="button" className="ab-dugme"
                    onClick={() => { setYeniAcik(true); setSeciliId(null); }}>
                    + Yeni kullanıcı
                  </button>
                )}
              </>
            }
          />

          {hata && <p className="ab-gr-hata" role="alert" style={{ marginTop: 'var(--s16)' }}>{hata}</p>}

          {gorunur.length > 0 || toplanan.length > 0 ? (
            <div style={{ marginTop: 'var(--s22)' }}>
              <Tablo
                konuBasligi="Kullanıcı"
                kolonlar={KOLONLAR}
                satirlar={satirlar}
                secili={seciliId}
                sec={sec}
                sirala={{
                  anahtar: sira.anahtar,
                  yon: sira.yon,
                  degistir: (a) => setSira((o) => ({
                    anahtar: a as Anahtar,
                    yon: o.anahtar === a && o.yon === 'artan' ? 'azalan' : 'artan',
                  })),
                }}
                kuyruk={toplanan.length > 0
                  ? { metin: `+${toplanan.length} hesap · kapsamıyla sınırlı`,
                    ac: () => setKuyrukAcik(true) }
                  : null}
                dipNot={dipNot(gorunur.length, m.unvansiz, m.hesap - m.aktif)}
              />
            </div>
          ) : filtreAktif ? (
            <BosFiltre temizle={() => { setMercek('hepsi'); setRolF(null); setArama(''); }} />
          ) : (
            <div style={{ marginTop: 'var(--s26)' }}>
              <BosIlk cumle="Kullanıcı kütüğünde kayıt yok."
                eylem={yazabilir
                  ? <Dugme tur="birincil" onClick={() => setYeniAcik(true)}>Kullanıcı oluştur</Dugme>
                  : undefined} />
            </div>
          )}
        </section>
      </main>

      {secili && (
        <Cekmece kod={secili.eposta} kapat={() => { setSeciliId(null); setKip('ozet'); }}>
          {kip === 'ozet' && (
            <Ozet
              hesap={secili}
              yazabilir={yazabilir}
              onaylayabilir={onaylayabilir}
              bekliyor={bekliyor}
              duzenle={() => setKip('kullanici')}
              yetkiEkle={() => setKip('yetki')}
              yetkiKaldir={(id) => calistir(() => yetkiSil({ id }))}
              aktifDegistir={() => calistir(
                () => kullaniciAktifDegistir({ id: secili.id, aktif: !secili.aktif }))}
            />
          )}
          {kip === 'kullanici' && (
            <>
              <div className="ab-panel-blok">
                <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Kullanıcıyı düzenle</p>
              </div>
              <div className="ab-panel-blok">
                <KullaniciFormu hesap={secili} kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
          {kip === 'yetki' && (
            <>
              <div className="ab-panel-blok">
                <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Yetki ver</p>
              </div>
              <div className="ab-panel-blok">
                <YetkiFormu hesap={secili} surecler={surecler} tesisler={tesisler}
                  kisitliKapsam={kisitliKapsam} kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
        </Cekmece>
      )}

      {yeniAcik && !secili && (
        <Cekmece kod="YENİ HESAP" kapat={() => setYeniAcik(false)}>
          <div className="ab-panel-blok">
            <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Yeni kullanıcı</p>
          </div>
          <div className="ab-panel-blok">
            <KullaniciFormu hesap={null} kapat={() => setYeniAcik(false)} />
          </div>
        </Cekmece>
      )}
    </>
  );
}

function dipNot(gorunur: number, unvansiz: number, kapali: number): string {
  const parcalar = [`${gorunur} satır görünüyor`, 'kolon başlığından sıralama'];
  // Bilinmeyen unvan sıfır sayılmaz: kaç hesabın unvanı hiç girilmediğini söyler.
  if (unvansiz > 0) parcalar.push(`${unvansiz} hesabın unvanı girilmedi`);
  if (kapali > 0) parcalar.push(`${kapali} hesap kapalı`);
  return parcalar.join(' · ');
}

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;
const Bilinmiyor = () => <span style={{ color: 'var(--i3)' }}>bilinmiyor</span>;

/* ── Çekmece özeti ──────────────────────────────────────────────────── */

function Ozet({
  hesap, yazabilir, onaylayabilir, bekliyor,
  duzenle, yetkiEkle, yetkiKaldir, aktifDegistir,
}: {
  hesap: Hesap;
  yazabilir: boolean;
  onaylayabilir: boolean;
  bekliyor: boolean;
  duzenle: () => void;
  yetkiEkle: () => void;
  yetkiKaldir: (id: string) => void;
  aktifDegistir: () => void;
}) {
  const d = hesapDurumu(hesap);

  return (
    <>
      <CekmeceKimlik durum={d} soz={durumSozu(hesap)} baslik={hesap.ad}
        cumle={durumCumlesi(hesap)} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Unvan', deger: hesap.unvan ?? 'bilinmiyor', durum: hesap.unvan ? undefined : 'unk' },
        { etiket: 'En geniş rol', deger: rolEtiketi(enGenisRol(hesap)) },
        { etiket: 'Kapsam', deger: kapsamMetni(hesap) },
        { etiket: 'Yetki', deger: hesap.yetkiler.length },
      ]} />

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
          Yetkiler {hesap.yetkiler.length > 0 && `· ${hesap.yetkiler.length}`}
        </p>
        {hesap.yetkiler.length === 0 ? (
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Tanımlı yetki yok — hesap giriş yapar, hiçbir ekranı açamaz.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s3)' }}>
            {hesap.yetkiler.map((y) => (
              <div key={y.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--s10)',
                background: 'var(--panel)', border: 'var(--bw-hair) solid var(--hr2)',
                padding: 'var(--s12) var(--s14)',
              }}>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 'var(--t-cell)', fontWeight: 600 }}>
                    {rolEtiketi(y.rol)}
                  </span>
                  <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--veri)',
                    fontSize: 'var(--t-label)', color: kapsamsiz(y) ? 'var(--md)' : 'var(--i3)' }}>
                    {yetkiKapsami(y)}
                  </span>
                </span>
                {onaylayabilir && (
                  <button type="button" className="ab-dugme satir" disabled={bekliyor}
                    onClick={() => yetkiKaldir(y.id)}>Kaldır</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <CekmeceEylemler
        birincil={onaylayabilir
          ? <Dugme tur="tam" onClick={yetkiEkle} disabled={bekliyor}>Yetki ver</Dugme>
          : undefined}
        ikincil={
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            {yazabilir && <Dugme onClick={duzenle} disabled={bekliyor}>Düzenle</Dugme>}
            {onaylayabilir && (
              <Dugme tur={hesap.aktif ? 'ret' : 'ikincil'} onClick={aktifDegistir} disabled={bekliyor}>
                {hesap.aktif ? 'Hesabı kapat' : 'Hesabı aç'}
              </Dugme>
            )}
          </div>
        }
        dipNot={!onaylayabilir
          ? 'Yetki vermek ve kaldırmak için yönetim/onay yetkisi gerekir.'
          : 'Kapsam boş bırakılan yetki tüm süreçlere ve tüm santrallere uygulanır. '
            + 'Yetki verme ve kaldırma denetim izine yazılır.'}
      />
    </>
  );
}

/* ── Kapsam kontrolleri ─────────────────────────────────────────────────
   Kutu yok, kenarlık yok: arama tek satır alt çizgili girdi, rol 9.5px
   mono açılır liste (02-components §4). */

function Ara({ deger, degistir }: { deger: string; degistir: (v: string) => void }) {
  return (
    <input
      className="ab-gr"
      aria-label="Kullanıcı, e-posta ya da yetki ara"
      placeholder="Ara"
      value={deger}
      onChange={(e) => degistir(e.target.value)}
      style={{
        width: 118, background: 'none', border: 0,
        borderBottom: 'var(--bw-hair) solid var(--hr2)',
        padding: '3px 0', fontFamily: 'var(--veri)', fontSize: 'var(--t-label)',
        letterSpacing: 'var(--tr-label)', textTransform: 'uppercase',
      }}
    />
  );
}

/** Açılır listeyi dışarı tık ve Esc kapatır — açık kalan menü tabloyu örter. */
function disariKapat(kok: React.RefObject<HTMLDetailsElement | null>) {
  const kapat = (e: Event) => {
    const d = kok.current;
    if (!d?.open) return;
    if (e.type === 'keydown') {
      if ((e as KeyboardEvent).key === 'Escape') d.open = false;
      return;
    }
    if (!d.contains(e.target as Node)) d.open = false;
  };
  document.addEventListener('mousedown', kapat);
  document.addEventListener('keydown', kapat);
  return () => {
    document.removeEventListener('mousedown', kapat);
    document.removeEventListener('keydown', kapat);
  };
}

function Kapsam({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  const secim = secenekler.find((s) => s.id === aktif);
  const kok = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => disariKapat(kok), []);

  return (
    <details ref={kok} style={{ position: 'relative' }}>
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 190,
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

'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Bar, BosIlk, BosFiltre, Dugme, Im, type Durum } from '@/components/kabuk/temel';
import { EkranBasligi, Filtreler } from '@/components/kabuk/ekran';
import { ZamanCizelgesi } from '@/components/kabuk/zaman';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { PROJE_DURUM_ETIKET, etiketle } from '@/lib/sabitler';
import { ProjeFormu, DurumFormu, BaglantiFormu } from './Formlar';
import {
  aktifMi, altSatir, bagMetni, barDurumu, butceAsimi, butceOzeti, buyuk, ceyrek,
  donemler, engelleyenler, etkilenenler, fazGecikmesi, gecikenFazlar,
  gecikmisEngeller, gunFarki, hedefMetni, ilerleme,
  kapatilanSayisi, kartDurumu, kisaAd, riskteMi, santralMetni,
  sapmaMetni, ufkaYay, ufukKonumu, ufukUzunlugu,
  GORUNUR_BUTCE, KART_BUTCESI, KART_BUTCESI_DAR,
  type Faz, type Kisi, type P, type Secenek,
} from './ortak';

/* O8 · Transformation Portfolio — "hangi proje taahhüdünü tutmuyor?"
   İki canvas modülü (06 §A1): teslim ufku zaman çizelgesi + portföy tablosu.
   İlerleme LİDER kolondur; durum sözcüğü satırda YAZILMAZ, çubuğun rengi ve
   yanındaki yüzde taşır. Gecikmiş proje çeyrek yerine aşım gününü yazar.
   Detay modalda değil 420px çekmecede açılır (O9). */

const KOLONLAR = 'minmax(0, 1fr) 200px 176px 68px 26px';
const KOLONLAR_DAR = 'minmax(0, 1fr) 140px 68px 26px';

type Kip = 'ozet' | 'form' | 'durum' | 'bag';

/** Faz markerının erişilebilir adı — sözcük ekranda değil, yalnız burada. */
const FAZ_SOZU: Record<string, string> = {
  tamam: 'tamamlandı', bd: 'gecikti', pl: 'planlı',
};

export default function ProjelerIstemci({
  projeler, simdi, yeniKod, yazabilir, kullanicilar, maddeler, bulgular,
}: {
  projeler: P[]; simdi: number; yeniKod: string; yazabilir: boolean;
  kullanicilar: Kisi[]; maddeler: Secenek[]; bulgular: Secenek[];
}) {
  const [filtre, setFiltre] = useState('aktif');
  const [tesisF, setTesisF] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [kip, setKip] = useState<Kip>('ozet');
  const [yeniAcik, setYeniAcik] = useState(false);

  const secili = projeler.find((p) => p.id === seciliId) ?? null;

  /* ── Metrikler: filtrelerden BAĞIMSIZ, portföyün tamamı ─────────────── */
  const aktif = useMemo(() => projeler.filter(aktifMi), [projeler]);
  const riskteSayisi = aktif.filter((p) => riskteMi(p, simdi)).length;

  const fazliProjeler = aktif.filter((p) => p.fazlar.length > 0);
  const ortalamaIlerleme = fazliProjeler.length
    ? Math.round(fazliProjeler.reduce((a, p) => a + (ilerleme(p) as number), 0)
      / fazliProjeler.length)
    : null;

  const kapatilan = projeler.reduce((a, p) => a + kapatilanSayisi(p), 0);

  /* Bütçe sapması portföy toplamından çıkar: bütçesi girilmemiş proje
     toplama SIFIR olarak katılmaz, hiç katılmaz (unknown ≠ zero). */
  const butceli = projeler.map(butceOzeti).filter((b) => b !== null);
  const planToplam = butceli.reduce((a, b) => a + b.planlanan, 0);
  const harcamaToplam = butceli.reduce((a, b) => a + b.harcanan, 0);
  const portfoySapmasi = planToplam > 0
    ? Math.round(((harcamaToplam - planToplam) / planToplam) * 100) : null;
  const butcesiz = projeler.length - butceli.length;

  /* ── Filtre + kapsam ────────────────────────────────────────────────── */
  const taban = useMemo(() => projeler.filter((p) => {
    if (filtre === 'aktif' && !aktifMi(p)) return false;
    if (filtre === 'riskte' && !riskteMi(p, simdi)) return false;
    if (filtre === 'tamam' && p.durum !== 'tamamlandi') return false;
    if (tesisF && !p.tesisler.some((t) => t.id === tesisF)) return false;
    return true;
  }), [projeler, filtre, tesisF, simdi]);

  /* Varsayılan sıralama TESLİM TARİHİ. Riskteki projeler sıralamadan
     bağımsız üstte (06 §A2) ve asla toplanmaz; hedefi olmayan proje en
     alta iner ama "yakın" sayılmaz — bilinmeyen ≠ sıfır. */
  const sirali = useMemo(() => [...taban].sort((a, b) => {
    const ra = riskteMi(a, simdi), rb = riskteMi(b, simdi);
    if (ra !== rb) return ra ? -1 : 1;
    if (!a.hedef && !b.hedef) return a.kod.localeCompare(b.kod, 'tr');
    if (!a.hedef) return 1;
    if (!b.hedef) return -1;
    return a.hedef.localeCompare(b.hedef);
  }), [taban, simdi]);

  const sabit = sirali.filter((p) => riskteMi(p, simdi));
  const kalan = sirali.filter((p) => !riskteMi(p, simdi));
  const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
  const gosterilen = kuyrukAcik ? sirali : [...sabit, ...kalan.slice(0, slot)];
  const toplanan = kuyrukAcik ? [] : kalan.slice(slot);

  /* ── Zaman çizelgesi ──────────────────────────────────────────────────
     Çekmece açıkken tuval 682px'e iner: tablo ikincil kolonunu düşürürken
     şerit de kart düşürür, yoksa 208px'lik gövdeler üst üste biner. */
  const dar = seciliId !== null || yeniAcik;

  const uzunluk = useMemo(
    () => ufukUzunlugu(taban.map((p) => (p.hedef ? new Date(p.hedef).getTime() : null)), simdi),
    [taban, simdi],
  );

  /* Kart başlığı proje KODUDUR: 208px'lik gövdede uzun ad iki üç satıra
     sarar ve şeridin altındaki tabloya taşar. Kapsam satırı adı DEĞİL
     santral + ilerlemeyi yazar — ad zaten hemen altındaki tabloda tam
     hâliyle duruyor, kartta kırpılmış bir kopyası tekrar olurdu. */
  const kartlar = useMemo(() => {
    const adaylar = sirali.map((p) => ({
      p, an: p.hedef ? new Date(p.hedef).getTime() : null,
    }));
    const secim = ufkaYay(adaylar, simdi, uzunluk,
      dar ? KART_BUTCESI_DAR : KART_BUTCESI);
    /* Ayırma ve kaç kartın sığdığı artık ZamanCizelgesi'nin işi: eksen
       genişliğini ölçüyor, biz tahmin etmiyoruz. Buradan HAM konum gider. */
    return secim.map((k) => {
      const oran = ilerleme(k.p);
      return {
        id: k.p.id,
        ad: k.p.kod,
        geri: hedefMetni(k.p, simdi).metin,
        kapsam: buyuk(`${kisaAd(santralMetni(k.p))}`
          + `${oran !== null ? ` · %${oran}` : ' · FAZ YOK'}`),
        durum: kartDurumu(k.p, simdi),
        konum: ufukKonumu(k.an, simdi, uzunluk),
      };
    });
  }, [sirali, simdi, uzunluk, dar]);

  const santraller = useMemo(() => {
    const kova = new Map<string, string>();
    for (const p of projeler) for (const t of p.tesisler) kova.set(t.id, t.ad);
    return [...kova].map(([id, ad]) => ({ id, ad })).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
  }, [projeler]);

  function sec(id: string) {
    setSeciliId((o) => (o === id ? null : id));
    setKip('ozet');
    setYeniAcik(false);
  }

  /* ── Başlık ─────────────────────────────────────────────────────────── */
  const baslik: { vurgu?: string; metin: string } =
    riskteSayisi > 0 ? { vurgu: `${riskteSayisi} proje`, metin: 'riskte' }
      : aktif.length > 0 ? { vurgu: String(aktif.length), metin: 'proje yolunda' }
        : { metin: 'Açık proje yok' };

  /* Çekmece <main>'in KARDEŞİdir: kabuk gridinin ikinci kolonu
     `.atlas-govde:has(> .cekmece)` ile açılıyor, iç içe girerse açılmaz. */
  if (projeler.length === 0) {
    return (
      <>
        <main data-yuzey="defter" style={{ minWidth: 0 }}>
          <EkranBasligi eyebrow="Dönüşüm portföyü" baslik="Portföy boş" />
          <div className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
            <BosIlk cumle="Kayıtlı proje yok."
              eylem={yazabilir
                ? <Dugme tur="birincil" onClick={() => setYeniAcik(true)}>Proje oluştur</Dugme>
                : undefined} />
          </div>
        </main>
        {yeniAcik && (
          <Cekmece kod={yeniKod} kapat={() => setYeniAcik(false)}>
            <div className="ab-panel-blok">
              <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Yeni proje</p>
            </div>
            <div className="ab-panel-blok">
              <ProjeFormu proje={null} yeniKod={yeniKod} kullanicilar={kullanicilar}
                kapat={() => setYeniAcik(false)} />
            </div>
          </Cekmece>
        )}
      </>
    );
  }

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Dönüşüm portföyü · ${projeler.length} proje`}
          vurgu={baslik.vurgu}
          baslik={baslik.metin}
          metrikler={[
            {
              deger: ortalamaIlerleme === null ? '—' : `%${ortalamaIlerleme}`,
              yazi: 'Ortalama ilerleme',
            },
            { deger: kapatilan, yazi: 'Kapattığı boşluk' },
            {
              deger: portfoySapmasi === null ? '—' : sapmaMetni(portfoySapmasi),
              yazi: 'Bütçe sapması',
              durum: portfoySapmasi !== null && portfoySapmasi > 0 ? 'md' : undefined,
            },
          ]}
        />

        <div style={{ padding: '0 var(--gutter-op)' }}>
          <Filtreler
            secenekler={[
              { id: 'aktif', ad: 'Aktif' },
              { id: 'riskte', ad: 'Riskte' },
              { id: 'tamam', ad: 'Tamamlanan' },
            ]}
            aktif={filtre}
            sec={(id) => { setFiltre(id); setKuyrukAcik(false); }}
            kapsam={
              <>
                <Kapsam etiket="Santral" aktif={tesisF} sec={setTesisF}
                  secenekler={santraller} />
                {yazabilir && (
                  <button type="button" className="ab-dugme"
                    onClick={() => { setYeniAcik(true); setSeciliId(null); }}>
                    + Yeni proje
                  </button>
                )}
              </>
            }
          />
        </div>

        <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s22)' }}>
          {gosterilen.length === 0 ? (
            <BosFiltre temizle={() => { setFiltre('aktif'); setTesisF(null); }} />
          ) : (
            <>
              {/* Filtre değişince şerit yeniden dizilir: key değişimi `blok-gir`i
                  (motion/reveal) yeniden çalıştırır. */}
              <div key={`${filtre}-${tesisF ?? ''}`}
                style={{ animation: 'blok-gir var(--mo-reveal) var(--ez)' }}>
                <ZamanCizelgesi
                  donemler={donemler(simdi, uzunluk)}
                  kartlar={kartlar}
                  bugun={0}
                  tikla={sec}
                />
              </div>

              {/* Şerit kartları mutlak konumlu: taşarlarsa akışı itmez,
                  tablonun üstüne biner. Aradaki boşluk o riski kapatır. */}
              <div className="ab-tablo"
                style={{
                  '--kolonlar': KOLONLAR,
                  '--kolonlar-dar': KOLONLAR_DAR,
                  marginTop: 'var(--s26)',
                  borderTop: 'var(--bw-strong) solid var(--hr2)',
                } as CSSProperties}
                role="table">
                {gosterilen.map((p) => (
                  <Satir key={p.id} proje={p} simdi={simdi}
                    secili={seciliId === p.id} sec={() => sec(p.id)} />
                ))}

                {/* Kuyruk satırı kolon düşürmeden etkilenmesin diye kendi
                    şablonunu taşır (02-components §6). */}
                {toplanan.length > 0 && (
                  <button type="button" className="satir kuyruk"
                    style={{ gridTemplateColumns: 'minmax(0, 1fr) 26px' }}
                    onClick={() => setKuyrukAcik(true)}>
                    <span className="" style={{ paddingLeft: 'var(--s16)' }}>
                      +{toplanan.length} proje · {kuyrukOlgusu(toplanan)}
                    </span>
                    <span className="ab-ok" style={{ justifySelf: 'end' }} aria-hidden>▾</span>
                  </button>
                )}

                {kuyrukAcik && kalan.length > slot && (
                  <p className="ab-dip dip">
                    <button type="button" className="ab-dugme satir"
                      onClick={() => setKuyrukAcik(false)}>Kuyruğu topla</button>
                  </p>
                )}

                {butcesiz > 0 && (
                  <p className="ab-dip dip">{butcesiz} projede bütçe kaydı yok</p>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {secili && (
        <Cekmece kod={secili.kod} kapat={() => { setSeciliId(null); setKip('ozet'); }}>
          {kip === 'ozet' && (
            <Ozet proje={secili} simdi={simdi} yazabilir={yazabilir}
              duzenle={() => setKip('form')} durumKip={() => setKip('durum')}
              bagla={() => setKip('bag')} />
          )}
          {kip === 'form' && (
            <>
              <div className="ab-panel-blok">
                <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Projeyi düzenle</p>
              </div>
              <div className="ab-panel-blok">
                <ProjeFormu proje={secili} yeniKod={yeniKod} kullanicilar={kullanicilar}
                  kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
          {kip === 'durum' && (
            <>
              <div className="ab-panel-blok">
                <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Durum güncelle</p>
              </div>
              <div className="ab-panel-blok">
                <DurumFormu proje={secili} kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
          {kip === 'bag' && (
            <>
              <div className="ab-panel-blok">
                <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>
                  Varoluş gerekçesini bağla
                </p>
              </div>
              <div className="ab-panel-blok">
                <BaglantiFormu proje={secili} maddeler={maddeler} bulgular={bulgular}
                  kapat={() => setKip('ozet')} />
              </div>
            </>
          )}
        </Cekmece>
      )}

      {yeniAcik && !secili && (
        <Cekmece kod={yeniKod} kapat={() => setYeniAcik(false)}>
          <div className="ab-panel-blok">
            <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Yeni proje</p>
          </div>
          <div className="ab-panel-blok">
            <ProjeFormu proje={null} yeniKod={yeniKod} kullanicilar={kullanicilar}
              kapat={() => setYeniAcik(false)} />
          </div>
        </Cekmece>
      )}
    </>
  );
}

/* ── Satır ──────────────────────────────────────────────────────────────
   Marker YOK: portföyde şiddeti taşıyan şey ilerleme çubuğudur (03-screens
   O8). Renk tek sinyal değildir — yanındaki yüzde ve gecikme günü yazılıdır. */

function Satir({ proje, simdi, secili, sec }: {
  proje: P; simdi: number; secili: boolean; sec: () => void;
}) {
  const oran = ilerleme(proje);
  const durum = barDurumu(proje, simdi);
  const hedef = hedefMetni(proje, simdi);
  return (
    <button
      type="button"
      role="row"
      aria-selected={secili}
      className={`satir d-${kartDurumu(proje, simdi)}`}
      onClick={sec}
    >
      <span role="cell" style={{ minWidth: 0, paddingLeft: 'var(--s16)' }}>
        <span className="konu">{proje.ad}</span>
        <span className="alt">{altSatir(proje)}</span>
      </span>
      <span role="cell" className="ikincil">{bagMetni(proje)}</span>
      <span role="cell" className="">
        {oran === null
          ? <span style={{ color: 'var(--i3)' }}>faz kaydı yok</span>
          : <Bar oran={oran} durum={durum} deger={`%${oran}`} />}
      </span>
      <span role="cell" className="sag"
        style={hedef.gecikmis ? { color: 'var(--bd)', fontWeight: 600 } : undefined}>
        {hedef.metin}
      </span>
      <span className="ab-ok" style={{ justifySelf: 'end' }} aria-hidden>▸</span>
    </button>
  );
}

/** Kuyruk satırı neyi topladığını yazar — "diğerleri" demez. Takvimi
    tutmayan proje zaten üstte sabit; kuyrukta gizlenebilecek tek sert
    olgu bütçe aşımıdır, o da sayıyla söylenir. */
function kuyrukOlgusu(toplanan: P[]): string {
  const asan = toplanan.filter(butceAsimi).length;
  return asan > 0 ? `${asan} bütçesini aştı` : 'planlandığı gibi';
}

/* ── Kapsam kontrolü (SANTRAL ▾) ────────────────────────────────────── */

function Kapsam({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  const secim = secenekler.find((s) => s.id === aktif);
  const kok = useRef<HTMLDetailsElement | null>(null);

  // Açılır kapsam listesi dışarı tıklandığında ve Esc ile kapanır —
  // açık kalan bir menü altındaki şeridi örter.
  useEffect(() => {
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
  }, []);

  return (
    <details ref={kok} style={{ position: 'relative' }}>
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

/* ── O9 · Çekmece özeti ─────────────────────────────────────────────────
   Durum sözcüğü yalnız kimlik bloğunda geçer (06 §A2). */

function Ozet({ proje, simdi, yazabilir, duzenle, durumKip, bagla }: {
  proje: P; simdi: number; yazabilir: boolean;
  duzenle: () => void; durumKip: () => void; bagla: () => void;
}) {
  const durum = kartDurumu(proje, simdi);
  const oran = ilerleme(proje);
  const butce = butceOzeti(proje);
  const geciken = gecikenFazlar(proje, simdi);
  const hedefGun = gunFarki(proje.hedef, simdi);
  const gecikmis = proje.durum !== 'tamamlandi' && hedefGun !== null && hedefGun > 0;

  const soz = riskteMi(proje, simdi)
    ? `Riskte${butce?.sapma != null && butce.sapma > 0 ? ` · bütçe +%${butce.sapma}` : ''}`
    : PROJE_DURUM_ETIKET[proje.durum as keyof typeof PROJE_DURUM_ETIKET] ?? etiketle(proje.durum);

  /* Varoluş gerekçesi: projenin kapattığı kayıtlar. Zincir en fazla dört
     halka gösterir, kalanı dip nota sayı olarak iner. */
  const engeller = engelleyenler(proje);
  const gecEngeller = gecikmisEngeller(proje, simdi);
  const etkilenen = etkilenenler(proje);

  const zincir = proje.baglantilar.filter((b) => b.tur !== 'tesis').slice(0, 4);
  const gizliBag = Math.max(0, proje.baglantilar.filter((b) => b.tur !== 'tesis').length - 4);

  return (
    <>
      <CekmeceKimlik durum={durum} soz={soz} baslik={proje.ad}
        cumle={proje.gerekce ?? proje.aciklama ?? undefined} />

      <CekmeceAlanlar alanlar={[
        {
          etiket: 'İlerleme',
          deger: oran === null
            ? 'faz kaydı yok'
            : `%${oran} · ${proje.fazlar.filter((f) => f.durum === 'tamamlandi').length}/${proje.fazlar.length} faz`,
          durum: oran === null ? 'unk' : barDurumu(proje, simdi),
        },
        {
          etiket: 'Hedef',
          deger: gecikmis ? `+${hedefGun} gün` : ceyrek(proje.hedef) ?? 'tarih yok',
          durum: gecikmis ? 'bd' : proje.hedef ? undefined : 'unk',
        },
        {
          etiket: 'Bütçe',
          deger: butce === null || butce.sapma === null
            ? 'bilinmiyor'
            : butce.sapma === 0 ? 'sapma yok' : `${sapmaMetni(butce.sapma)} sapma`,
          durum: butce === null || butce.sapma === null ? 'unk'
            : butce.sapma > 0 ? 'md' : undefined,
        },
        { etiket: 'Sahip', deger: proje.sahip?.ad ?? 'atanmadı',
          durum: proje.sahip ? undefined : 'md' },
      ]} />

      <Fazlar fazlar={proje.fazlar} simdi={simdi} />

      {/* BAĞIMLILIK — "beni ne engelliyor" ve "ben kimi engelliyorum".
          İki yön ayrı sorudur ve tek satırda toplanamaz. Bloğun kendisi
          bağımlılık YOKKEN de çizilir: sessizlik "önkoşulu yok" ile
          "bakmadık"ı ayırt ettirmez. */}
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Bağımlılık</p>
        {proje.onkosullar.length === 0 && proje.bagimlilar.length === 0 ? (
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Kayıtlı proje bağımlılığı yok — bu proje tek başına ilerleyebilir
            sayılıyor.
          </p>
        ) : (
          <>
            {engeller.length > 0 && (
              <p className="ab-panel-dip" style={{ margin: '0 0 var(--s10)' }}>
                {engeller.length} önkoşul kapanmadı
                {gecEngeller.length > 0 ? ` · ${gecEngeller.length} tanesi hedefini geçti` : ''}
                {' — '}bu proje onlar bitmeden tamamlanamaz.
              </p>
            )}
            {proje.onkosullar.length > 0 && (
              <CekmeceBagli baslik="Önkoşul" kayitlar={proje.onkosullar.map((o) => ({
                id: o.id, kod: o.kod, yol: '/projeler',
                alt: `${PROJE_DURUM_ETIKET[o.durum as keyof typeof PROJE_DURUM_ETIKET]
                  ?? etiketle(o.durum)} · ${ceyrek(o.hedef) ?? 'tarih yok'}`,
                suren: o.durum !== 'tamamlandi',
              }))} />
            )}
            {etkilenen.length > 0 && (
              <CekmeceBagli baslik="Bu projeye bağlı" kayitlar={etkilenen.map((b) => ({
                id: b.id, kod: b.kod, yol: '/projeler',
                alt: `${PROJE_DURUM_ETIKET[b.durum as keyof typeof PROJE_DURUM_ETIKET]
                  ?? etiketle(b.durum)} · ${ceyrek(b.hedef) ?? 'tarih yok'}`,
              }))} />
            )}
          </>
        )}
      </div>

      {zincir.length > 0 ? (
        <CekmeceBagli baslik="Varoluş gerekçesi" kayitlar={zincir.map((b) => ({
          id: b.id, kod: b.kod, alt: b.alt, yol: b.yol, suren: b.tur === 'risk',
        }))} />
      ) : (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Varoluş gerekçesi</p>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Kontrol, bulgu ya da risk bağı yok — bu projenin neyi kapattığı kayıtlı değil.
          </p>
        </div>
      )}

      <CekmeceEylemler
        birincil={yazabilir
          ? <Dugme tur="tam" onClick={durumKip}>Durum güncelle</Dugme>
          : undefined}
        ikincil={yazabilir ? (
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme onClick={duzenle}>Düzenle</Dugme>
            <Dugme onClick={bagla}>Bağla</Dugme>
          </div>
        ) : undefined}
        dipNot={dipNot(proje, butce, geciken.length, gizliBag, yazabilir)}
      />
    </>
  );
}

/** Çekmece dip notu: bütçenin mutlak büyüklüğü, gecikmiş faz sayısı ve
    zincire sığmayan bağlar. Yazma yetkisi yoksa bunu da söyler. */
function dipNot(
  proje: P, butce: ReturnType<typeof butceOzeti>, gecikenSayisi: number,
  gizliBag: number, yazabilir: boolean,
): string {
  const parcalar: string[] = [];
  if (butce) parcalar.push(`Bütçe ${para(butce.planlanan)} planlandı · ${para(butce.harcanan)} harcandı`);
  else parcalar.push('Bütçe kaydı yok');
  if (gecikenSayisi > 0) parcalar.push(`${gecikenSayisi} faz taahhüdü aştı`);
  if (gizliBag > 0) parcalar.push(`${gizliBag} bağ daha kayıtta`);
  /* "Ben kimi engelliyorum" dip nota iner: gecikmiş bir projenin asıl
     maliyeti çoğu zaman kendi takviminde değil, ona bağlı olanlarda. */
  const etkilenenSayisi = etkilenenler(proje).length;
  if (etkilenenSayisi > 0) {
    parcalar.push(`${etkilenenSayisi} proje bu projenin bitmesini bekliyor`);
  }
  parcalar.push(`Tip ${etiketle(proje.tip).toLocaleLowerCase('tr-TR')}`);
  if (!yazabilir) parcalar.push('yazma yetkiniz yok');
  return parcalar.join(' · ');
}

/** `18,5 M₺` — portföy ölçeğinde kuruş okunmaz. */
function para(n: number): string {
  return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} M₺`;
}

/* ── Fazlar (kilometre taşları) ─────────────────────────────────────────
   Sözcük yerine tarih: tamamlanan faz gerçekleşme çeyreğini, taahhüdü aşan
   faz aşım gününü yazar. Yazma yüzeyi yok — faz takvimi bu sürümde okunur. */

function Fazlar({ fazlar, simdi }: { fazlar: Faz[]; simdi: number }) {
  if (fazlar.length === 0) return null;
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Fazlar</p>
      {fazlar.map((f) => {
        const gecikme = fazGecikmesi(f, simdi);
        const durum: Durum = f.durum === 'tamamlandi' ? 'tamam'
          : (f.durum === 'gecikti' || gecikme !== null) ? 'bd' : 'pl';
        return (
          <div key={f.id} style={{ display: 'flex', alignItems: 'center',
            gap: 'var(--s10)', padding: 'var(--s8) 0',
            borderBottom: 'var(--bw-hair) solid var(--hr)' }}>
            <Im durum={durum} ad={`${f.ad} · ${FAZ_SOZU[durum]}`} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--t-cell)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.ad}
            </span>
            <span style={{ fontFamily: 'var(--veri)', fontSize: 'var(--t-label)',
              color: gecikme !== null ? 'var(--bd)' : 'var(--i3)' }}>
              {gecikme !== null ? `+${gecikme} g` : ceyrek(f.gerceklesen ?? f.hedef)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

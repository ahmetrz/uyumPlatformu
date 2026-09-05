'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useUrlDurumu } from '@/components/kabuk/urlDurumu';
import { Dugme, BosIlk, type Durum } from '@/components/kabuk/temel';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi, Asamalar, KipDegistir } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceEylemler,
} from '@/components/kabuk/panel';
import BaglamCubugu from '@/components/kabuk/BaglamCubugu';
import { DENETIM_ASAMALARI, tarihTR } from '@/lib/sabitler';
import { AsamaEylemleri, KapsamPaneli, TalepFormu, TalepSonucFormu } from '../Formlar';
import {
  asamaEtiketi, asamaIndeksi, denetimImi, gunAy, kapandiMi, kimlikCumlesi,
  KISA_ASAMA, planMetni, santralMetni, talepGecikmesi, talepImi, talepSonucu,
  tipEtiketi, bulguImi,
  type BulguOzeti, type D, type Kisi, type Kodlu, type Talep,
} from '../ortak';

/* O6 · Audit Detail & Evidence — "bu denetim neden kapanamıyor?"
   İki canvas modülü (06 §A1): yaşam döngüsü rayı + kip değiştiricinin
   seçtiği tek tablo (kanıt talepleri ya da bulgular). Kapsam bir kuyruk
   değil yapılandırmadır: canvasta değil çekmecede yaşar. Durum sözcüğü
   yalnız çekmecenin kimlik bloğunda geçer. */

export type DetayVerisi = {
  denetim: D;
  simdi: number;
  kapsamlar: {
    id: string;
    tesis: Kodlu | null;
    madde: { id: string; kod: string; baslik: string } | null;
  }[];
  talepler: Talep[];
  bulgular: BulguOzeti[];
  kullanicilar: Kisi[];
  tesisler: Kodlu[];
  maddeler: { id: string; kod: string; baslik: string }[];
  kanitlar: { id: string; ad: string; tip: string }[];
  yazabilir: boolean;
  onaylayabilir: boolean;
};

/** 06 §A3: tabloda 5–9 satır; sabitlenen (geciken) satırlar bütçenin dışında. */
const GORUNUR_BUTCE = 8;

const TALEP_KOLONLARI: Kolon[] = [
  { baslik: 'Son tarih', genislik: '132px' },
  { baslik: 'Kanıt', genislik: 'minmax(160px, 1fr)' },
];

const BULGU_KOLONLARI: Kolon[] = [
  { baslik: 'Sahip', genislik: '146px', ikincil: true },
  { baslik: 'Hedef', genislik: '118px' },
];

type Kip = 'talep' | 'bulgu';
type PanelKipi = 'kayit' | 'kapsam';

export default function DenetimDetayIstemci({ veri }: { veri: DetayVerisi }) {
  const yonlendirici = useRouter();
  const { denetim: d, simdi } = veri;
  const [kip, setKip] = useUrlDurumu<Kip>('kip', 'talep');
  const [panelKipi, setPanelKipi] = useState<PanelKipi>('kayit');
  const [panel, setPanel] = useState(true);
  const [seciliTalep, setSeciliTalep] = useState<string | null>(null);
  const [talepFormu, setTalepFormu] = useState(false);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const im = denetimImi(d, simdi);
  const plan = planMetni(d, simdi);
  const aktifIx = asamaIndeksi(d.durum);
  const sonraki = aktifIx >= 0 && aktifIx < DENETIM_ASAMALARI.length - 1
    ? DENETIM_ASAMALARI[aktifIx + 1] : null;
  const onceki = aktifIx > 0 ? DENETIM_ASAMALARI[aktifIx - 1] : null;

  /* Kapanış engeli sunucudaki koşulun AYNISI (eylemler2/denetim.ts):
     açık kanıt talebi ya da açık bulgu varken kapanışa geçilemez. */
  const engel = sonraki === 'kapanis' && (d.talep.acik > 0 || d.acikBulgu > 0)
    ? [
      d.talep.acik > 0 ? `${d.talep.acik} açık kanıt talebi` : null,
      d.acikBulgu > 0 ? `${d.acikBulgu} açık bulgu` : null,
    ].filter(Boolean).join(' ve ')
    : null;

  const talep = veri.talepler.find((t) => t.id === seciliTalep) ?? null;

  /* Geciken talepler sıralamadan bağımsız üste sabitlenir ve toplanmaz. */
  const { gorunurTalep, toplananTalep } = useMemo(() => {
    const sabit = veri.talepler.filter((t) => talepGecikmesi(t, simdi) !== null);
    const kalan = veri.talepler.filter((t) => talepGecikmesi(t, simdi) === null);
    if (kuyrukAcik) return { gorunurTalep: [...sabit, ...kalan], toplananTalep: [] as Talep[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return {
      gorunurTalep: [...sabit, ...kalan.slice(0, slot)],
      toplananTalep: kalan.slice(slot),
    };
  }, [veri.talepler, simdi, kuyrukAcik]);

  const talepSatirlari: Satir[] = gorunurTalep.map((t) => {
    const gecikme = talepGecikmesi(t, simdi);
    const isaret = talepImi(t, simdi);
    return {
      id: t.id,
      durum: isaret,
      kenar: isaret,
      konu: t.baslik,
      alt: t.sorumlu?.ad ?? 'sorumlu atanmadı',
      hucreler: [
        gecikme !== null
          ? <span key="s" style={{ color: 'var(--bd)' }}>+{gecikme} gün</span>
          : t.sonTarih ? gunAy(new Date(t.sonTarih).getTime()) : <Bos key="s" />,
        <span key="k" style={t.kanit ? undefined : { color: 'var(--i3)' }}>
          {talepSonucu(t)}
        </span>,
      ],
    };
  });

  const bulguSatirlari: Satir[] = veri.bulgular.map((b) => {
    const isaret = bulguImi(b, simdi);
    return {
      id: b.id,
      durum: isaret,
      kenar: isaret,
      konu: b.baslik,
      alt: `${b.maddeKod} · ${b.tesisKod}`,
      hucreler: [
        b.sorumlu ?? <Bos key="s" />,
        b.hedef ? gunAy(new Date(b.hedef).getTime()) : <Bos key="h" />,
      ],
    };
  });

  /* Ray dokuz segmenttir; tarih yalnız iki uçta yazılır — her segmente tarih
     asmak rayı bir tabloya çevirir. */
  const asamalar = DENETIM_ASAMALARI.map((a, i) => ({
    ad: KISA_ASAMA[a],
    tarih: i === 0 && d.planBaslangic ? gunAy(new Date(d.planBaslangic).getTime())
      : i === DENETIM_ASAMALARI.length - 1 && d.planBitis
        ? gunAy(new Date(d.planBitis).getTime())
        : undefined,
  }));

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <BaglamCubugu
          kirintiler={[{ ad: 'Denetim', yol: '/denetimler' }, { ad: d.kod }]}
          sag={
            <>
              {d.surec && (
                <Link href={`/uyum/${encodeURIComponent(d.surec.regKod)}`} className="ab-dugme satir">
                  {d.surec.regKod} · {d.surec.kod} ▸
                </Link>
              )}
              {!panel && (
                <button type="button" className="ab-dugme satir" onClick={() => setPanel(true)}>
                  Kayıt paneli ▸
                </button>
              )}
            </>
          }
        />

        <EkranBasligi
          eyebrow={`${tipEtiketi(d.tip)} · ${d.denetleyen ?? 'denetleyen girilmedi'}`}
          vurgu={santralMetni(d)}
          baslik={`— ${d.ad}`}
          metrikler={[
            {
              deger: d.talep.toplam > 0 ? d.talep.saglandi : '—',
              payda: d.talep.toplam > 0 ? d.talep.toplam : undefined,
              yazi: 'Kanıt',
              durum: d.talep.toplam === 0 ? undefined : d.talep.acik > 0 ? 'md' : 'ok',
            },
            {
              deger: d.talep.gecikmis, yazi: 'Gecikmiş',
              durum: d.talep.gecikmis > 0 ? 'bd' : undefined,
            },
            {
              deger: d.acikBulgu, yazi: 'Açık bulgu',
              durum: d.acikBulgu > 0 ? 'bd' : undefined,
            },
          ]}
        />

        <div style={{ padding: 'var(--s26) var(--gutter-op) 0' }}>
          <Asamalar asamalar={asamalar} aktifIndeks={aktifIx} />
        </div>

        <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s16)' }}>
            <KipDegistir
              aktif={kip}
              sec={(id) => { setKip(id as Kip); setSeciliTalep(null); }}
              secenekler={[
                { id: 'talep', ad: `Kanıt talebi ${d.talep.saglandi}/${d.talep.toplam}` },
                { id: 'bulgu', ad: `Bulgu ${d.acikBulgu}/${d.toplamBulgu}` },
              ]}
            />
            {kip === 'talep' && veri.yazabilir && !kapandiMi(d) && (
              <button type="button" className="ab-dugme" style={{ marginLeft: 'auto' }}
                onClick={() => {
                  setSeciliTalep(null); setPanel(true); setPanelKipi('kayit'); setTalepFormu(true);
                }}>
                + Kanıt talebi
              </button>
            )}
          </div>

          <div style={{ marginTop: 'var(--s20)' }}>
            {kip === 'talep' ? (
              veri.talepler.length === 0 ? (
                <BosIlk
                  cumle="Bu denetim için kanıt talebi açılmadı."
                  eylem={veri.yazabilir && !kapandiMi(d)
                    ? <Dugme tur="birincil" onClick={() => {
                      setPanel(true); setPanelKipi('kayit'); setTalepFormu(true);
                    }}>Kanıt talep et</Dugme>
                    : undefined}
                />
              ) : (
                <Tablo
                  sik
                  konuBasligi="İstenen kanıt"
                  kolonlar={TALEP_KOLONLARI}
                  satirlar={talepSatirlari}
                  secili={seciliTalep}
                  sec={(id) => {
                    setSeciliTalep((o) => (o === id ? null : id));
                    setPanel(true);
                  }}
                  kuyruk={toplananTalep.length > 0
                    ? { metin: `+${toplananTalep.length} talep · son tarihi geçmedi`,
                      ac: () => setKuyrukAcik(true) }
                    : null}
                  dipNot="Satıra tıklayınca talep paneli açılır."
                />
              )
            ) : veri.bulgular.length === 0 ? (
              <BosIlk iyiHaber cumle="Bu denetime bağlı bulgu yok." />
            ) : (
              <Tablo
                sik
                konuBasligi="Bulgu"
                kolonlar={BULGU_KOLONLARI}
                satirlar={bulguSatirlari}
                sec={(id) => yonlendirici.push(`/bulgular/${id}`)}
                dipNot="Bulgu bu denetimde yalnız izlenir; önem, aksiyon ve doğrulama bulgu kaydında yaşar."
              />
            )}
          </div>
        </section>
      </main>

      {panel && (
        <Cekmece kod={d.kod} kapat={() => { setPanel(false); setSeciliTalep(null); }}>
          {talep ? (
            <TalepPaneli talep={talep} simdi={simdi} kanitlar={veri.kanitlar}
              yazabilir={veri.yazabilir} geri={() => setSeciliTalep(null)} />
          ) : (
            <>
              <div className="ab-panel-blok">
                <KipDegistir
                  aktif={panelKipi}
                  sec={(id) => setPanelKipi(id as PanelKipi)}
                  secenekler={[
                    { id: 'kayit', ad: 'Kayıt' },
                    { id: 'kapsam', ad: `Kapsam ${veri.kapsamlar.length}` },
                  ]}
                />
              </div>

              {panelKipi === 'kayit' ? (
                <>
                  <CekmeceKimlik durum={im} soz={asamaEtiketi(d.durum)} baslik={d.ad}
                    cumle={kimlikCumlesi(d, simdi)} />

                  <CekmeceAlanlar alanlar={[
                    { etiket: 'Plan', deger: plan.metin, durum: plan.durum },
                    {
                      etiket: 'Kapsam',
                      deger: `${santralMetni(d)}${d.maddeSayisi > 0 ? ` · ${d.maddeSayisi} madde` : ''}`,
                    },
                    { etiket: 'Çerçeve', deger: d.surec ? `${d.surec.regKod} · ${d.surec.kod}` : 'bağ yok' },
                    {
                      etiket: 'Aşama',
                      deger: `${aktifIx + 1} / ${DENETIM_ASAMALARI.length}`,
                    },
                  ]} />

                  {veri.yazabilir && (
                    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
                      <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Yaşam döngüsü</p>
                      <AsamaEylemleri
                        id={d.id}
                        sonraki={sonraki}
                        onceki={onceki}
                        engel={engel}
                        ilerletebilir={sonraki !== 'kapanis' || veri.onaylayabilir}
                        geriAlabilir={veri.onaylayabilir}
                      />
                    </div>
                  )}

                  {veri.yazabilir && !kapandiMi(d) && (
                    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
                      <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Kanıt talebi</p>
                      {talepFormu ? (
                        <TalepFormu denetimId={d.id} kullanicilar={veri.kullanicilar}
                          kapat={() => setTalepFormu(false)} />
                      ) : (
                        <Dugme onClick={() => setTalepFormu(true)}>Yeni talep aç</Dugme>
                      )}
                    </div>
                  )}

                  <CekmeceEylemler
                    dipNot={`${tipEtiketi(d.tip)}${d.denetleyen ? ` · ${d.denetleyen}` : ''}`
                      + (d.planBitis ? ` · plan bitişi ${tarihTR(d.planBitis)}` : '')}
                  />
                </>
              ) : (
                <div className="ab-panel-blok" style={{ marginTop: 'var(--s18)' }}>
                  <KapsamPaneli
                    denetimId={d.id}
                    tesisler={veri.tesisler}
                    maddeler={veri.maddeler}
                    kapsamlar={veri.kapsamlar}
                    kilitli={!veri.yazabilir || kapandiMi(d)}
                  />
                </div>
              )}
            </>
          )}
        </Cekmece>
      )}
    </>
  );
}

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

/* ── Talep paneli ───────────────────────────────────────────────────── */

const TALEP_SOZU: Record<Durum, string> = {
  bd: 'Gecikti', md: 'Açık', ok: 'Açık', pl: 'Açık',
  unk: 'Son tarih yok', tamam: 'Sağlandı',
};

function TalepPaneli({ talep, simdi, kanitlar, yazabilir, geri }: {
  talep: Talep; simdi: number;
  kanitlar: { id: string; ad: string; tip: string }[];
  yazabilir: boolean; geri: () => void;
}) {
  const isaret = talepImi(talep, simdi);
  const gecikme = talepGecikmesi(talep, simdi);
  const soz = talep.durum === 'reddedildi' ? 'Reddedildi'
    : gecikme !== null ? `Gecikti · ${gecikme} gün` : TALEP_SOZU[isaret];

  const cumle = talep.aciklama
    ?? (talep.durum === 'saglandi'
      ? 'Talep karşılandı; bağlı kanıt aşağıda.'
      : talep.sonTarih
        ? `Son tarih ${tarihTR(talep.sonTarih)}.`
        : 'Son tarih girilmedi — gecikme ölçülemiyor.');

  return (
    <>
      <CekmeceKimlik durum={isaret} soz={soz} baslik={talep.baslik} cumle={cumle} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Sorumlu', deger: talep.sorumlu?.ad ?? 'atanmadı',
          durum: talep.sorumlu ? undefined : 'md' },
        { etiket: 'Son tarih', deger: talep.sonTarih ? tarihTR(talep.sonTarih) : 'yok',
          durum: gecikme !== null ? 'bd' : undefined },
        { etiket: 'Kanıt', deger: talepSonucu(talep) },
      ]} />

      {yazabilir && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <TalepSonucFormu talep={talep} kanitlar={kanitlar} kapat={geri} />
        </div>
      )}

      <CekmeceEylemler ikincil={<Dugme onClick={geri}>Denetim kaydına dön</Dugme>} />
    </>
  );
}

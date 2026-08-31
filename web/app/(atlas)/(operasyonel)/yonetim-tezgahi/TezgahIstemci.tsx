'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BosFiltre, BosIlk, Dugme, type Durum } from '@/components/atlas/temel';
import { EkranBasligi, Filtreler, KipDegistir } from '@/components/atlas/ekran';
import { Tablo, type Kolon, type Satir } from '@/components/atlas/tablo';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/atlas/cekmece';
import { etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import {
  GorevFormu, GorevDurumEylemleri, OnayKarariFormu, TanimEylemleri, TanimFormu,
} from './Formlar';
import {
  GORUNUR_BUTCE, KATALOG_ETIKET, UFUK_GUN,
  gecenGun, gecikmisMi, isAcikMi, isAltSatiri, isDurumSozu, isImi, isSabit,
  isKuyrukEtiketi, isSirala, isTipEtiketi, kalanGun, kaynakYolu, kullanimMetni,
  silinebilir, tanimAltSatiri, tanimImi, tanimKuyrukEtiketi, tanimSabit,
  tanimSirala, tanimSozu,
  type Is, type Katalog, type Kisi, type Kodlu, type Tanim,
} from './ortak';

/* M1/M2 · Yönetim tezgâhı — "bugün ne karar bekliyor, katalog doğru mu?"

   KİP AYRIMI (gerekçe ortak.ts başında ayrıntılı): iki ekran tek canvasta
   duramazdı, çünkü iş kuyruğu ZAMAN ekseninde, tanım katalogları KULLANIM
   ekseninde okunur; ortak bir öncelik sayısı yok ve 4 metriklik bütçe tek
   şeritte ikisini anlatamaz. Kip içinde ise gerçek birleştirme yapıldı:
   görev + onay talebi tek tabloda, beş katalog tek tabloda.

   Yoğunluk sözleşmesi: kip başına 4 metrik, 5–9 görünür satır + toplanan
   kuyruk (kritik satır asla toplanmaz), durum sözcüğü canvasta YAZILMAZ —
   yalnız çekmecenin kimlik bloğunda geçer, kart ızgarası/zebra/pill yok,
   detay modalda değil 420px çekmecede açılır. */

type Kip = 'is' | 'tanim';

const IS_KOLONLARI: Kolon[] = [
  { baslik: 'Tür', genislik: '78px' },
  { baslik: 'Sorumlu', genislik: '148px' },
  { baslik: 'Son tarih', genislik: '104px', sag: true },
  { baslik: 'Açılış', genislik: '100px', sag: true, ikincil: true },
];

const TANIM_KOLONLARI: Kolon[] = [
  { baslik: 'Katalog', genislik: '116px' },
  { baslik: 'Bağlı kayıt', genislik: '118px', sag: true },
  { baslik: 'Not', genislik: '150px', ikincil: true },
];

const IS_MERCEKLERI = [
  { id: 'bekleyen', ad: 'Bekleyen' },
  { id: 'gecikmis', ad: 'Gecikmiş' },
  { id: 'bana', ad: 'Bana atanan' },
  { id: 'onay', ad: 'Onay talebi' },
  { id: 'hepsi', ad: 'Tümü' },
];

const TANIM_MERCEKLERI = [
  { id: 'hepsi', ad: 'Tümü' },
  { id: 'kirik', ad: 'Zinciri kıran' },
  { id: 'bagsiz', ad: 'Bağsız' },
  { id: 'devre', ad: 'Devre dışı' },
];

export default function TezgahIstemci({
  aktifId, simdi, isler, tanimlar, kullanicilar, tesisSecenekleri,
  kirilimSecenekleri, sektorSecenekleri,
  tanimOkuyabilir, isOkuyabilir, tanimYazabilir, tanimOnaylayabilir, gorevAcabilir,
}: {
  aktifId: string;
  simdi: number;
  isler: Is[];
  tanimlar: Tanim[];
  kullanicilar: Kisi[];
  tesisSecenekleri: Kodlu[];
  kirilimSecenekleri: Kodlu[];
  sektorSecenekleri: Kodlu[];
  tanimOkuyabilir: boolean;
  isOkuyabilir: boolean;
  tanimYazabilir: boolean;
  tanimOnaylayabilir: boolean;
  gorevAcabilir: boolean;
}) {
  const [kip, setKip] = useState<Kip>(isOkuyabilir ? 'is' : 'tanim');
  const [isMercek, setIsMercek] = useState('bekleyen');
  const [tanimMercek, setTanimMercek] = useState('hepsi');
  const [sorumluF, setSorumluF] = useState<string | null>(null);
  const [tesisF, setTesisF] = useState<string | null>(null);
  const [katalogF, setKatalogF] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [secili, setSecili] = useState<string | null>(null);
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [yeniAcik, setYeniAcik] = useState<null | 'gorev' | 'tanim'>(null);
  const [yeniKatalog, setYeniKatalog] = useState<Katalog>('tesis');

  const isKipi = kip === 'is';

  function kipeGec(y: Kip) {
    setKip(y);
    setSecili(null);
    setDuzenleAcik(false);
    setYeniAcik(null);
    setKuyrukAcik(false);
  }

  /* ── Metrikler · filtrelerden BAĞIMSIZ, kipin tüm popülasyonu ───────── */

  const acikIsler = useMemo(() => isler.filter(isAcikMi), [isler]);
  const gecikmis = useMemo(
    () => isler.filter((i) => gecikmisMi(i, simdi)).length, [isler, simdi]);
  const bekleyenOnay = acikIsler.filter((i) => i.tur === 'onay').length;
  const banaAtanan = acikIsler.filter(
    (i) => i.tur === 'gorev' && i.kisi?.id === aktifId).length;
  const tarihsiz = acikIsler.filter(
    (i) => i.tur === 'gorev' && !i.sonTarih).length;

  const kirikTanim = useMemo(
    () => tanimlar.filter((t) => tanimImi(t) === 'bd').length, [tanimlar]);
  const bagsizTanim = tanimlar.filter((t) => tanimImi(t) === 'md').length;
  const devreDisiTanim = tanimlar.filter((t) => t.devreDisi).length;

  /* ── Mercek + kapsam ───────────────────────────────────────────────── */

  const suzulmusIs = useMemo(() => isSirala(isler.filter((i) => {
    if (isMercek === 'bekleyen' && !isAcikMi(i)) return false;
    if (isMercek === 'gecikmis' && !gecikmisMi(i, simdi)) return false;
    if (isMercek === 'bana' && !(isAcikMi(i) && i.kisi?.id === aktifId)) return false;
    if (isMercek === 'onay' && i.tur !== 'onay') return false;
    if (sorumluF === 'yok' ? !!i.kisi : sorumluF !== null && i.kisi?.id !== sorumluF) return false;
    if (tesisF && i.tesis?.id !== tesisF) return false;
    return true;
  }), simdi), [isler, isMercek, sorumluF, tesisF, simdi, aktifId]);

  const suzulmusTanim = useMemo(() => tanimSirala(tanimlar.filter((t) => {
    if (tanimMercek === 'kirik' && tanimImi(t) !== 'bd') return false;
    if (tanimMercek === 'bagsiz' && tanimImi(t) !== 'md') return false;
    if (tanimMercek === 'devre' && !t.devreDisi) return false;
    if (katalogF && t.katalog !== katalogF) return false;
    return true;
  })), [tanimlar, tanimMercek, katalogF]);

  /* Sabitlenen satırlar bütçenin DIŞINDADIR ve asla kuyruğa inmez
     (06 §A3); sakin olanlar bütçeyi doldurur, kalanı toplanır. */
  const { gorunur, toplanan } = useMemo(() => {
    const hepsi: (Is | Tanim)[] = isKipi ? suzulmusIs : suzulmusTanim;
    const sabitMi = (x: Is | Tanim) =>
      isKipi ? isSabit(x as Is, simdi) : tanimSabit(x as Tanim);
    const sabit = hepsi.filter(sabitMi);
    const sakin = hepsi.filter((x) => !sabitMi(x));
    if (kuyrukAcik) return { gorunur: [...sabit, ...sakin], toplanan: [] as (Is | Tanim)[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return { gorunur: [...sabit, ...sakin.slice(0, slot)], toplanan: sakin.slice(slot) };
  }, [isKipi, suzulmusIs, suzulmusTanim, kuyrukAcik, simdi]);

  const seciliIs = isKipi ? isler.find((i) => i.id === secili) ?? null : null;
  const seciliTanim = !isKipi ? tanimlar.find((t) => t.id === secili) ?? null : null;

  const filtreAktif = isKipi
    ? isMercek !== 'bekleyen' || sorumluF !== null || tesisF !== null
    : tanimMercek !== 'hepsi' || katalogF !== null;

  function temizle() {
    if (isKipi) { setIsMercek('bekleyen'); setSorumluF(null); setTesisF(null); }
    else { setTanimMercek('hepsi'); setKatalogF(null); }
    setKuyrukAcik(false);
  }

  function sec(id: string) {
    setSecili((o) => (o === id ? null : id));
    setDuzenleAcik(false);
    setYeniAcik(null);
  }

  /* ── Satırlar ──────────────────────────────────────────────────────── */

  const satirlar: Satir[] = isKipi
    ? (gorunur as Is[]).map((i) => {
      const im = isImi(i, simdi);
      const gun = kalanGun(i.sonTarih, simdi);
      return {
        id: i.id, durum: im, kenar: im,
        konu: i.baslik,
        alt: isAltSatiri(i, simdi),
        hucreler: [
          i.tur === 'gorev' ? 'Görev' : 'Onay',
          <span key="k" style={i.tur === 'gorev' && !i.kisi
            ? { color: 'var(--md)' } : undefined}>
            {i.kisi?.ad ?? (i.tur === 'gorev' ? 'atanmadı' : 'sistem')}
          </span>,
          i.tur === 'onay'
            ? <span key="s" style={{ color: 'var(--i3)' }}>—</span>
            : i.sonTarih
              ? <span key="s" style={gun !== null && gun < 0
                ? { color: 'var(--bd)' }
                : gun !== null && gun <= UFUK_GUN ? { color: 'var(--md)' } : undefined}>
                {tarihTR(i.sonTarih)}
              </span>
              : <span key="s" style={{ color: 'var(--i3)' }}>girilmedi</span>,
          tarihTR(i.olusturuldu),
        ],
      };
    })
    : (gorunur as Tanim[]).map((t) => {
      const im = tanimImi(t);
      return {
        id: t.id, durum: im, kenar: im,
        konu: t.ad,
        alt: tanimAltSatiri(t),
        hucreler: [
          KATALOG_ETIKET[t.katalog],
          <span key="b" style={t.kullanim === 0 ? { color: 'var(--md)' } : undefined}>
            {kullanimMetni(t)}
          </span>,
          t.not,
        ],
      };
    });

  /* ── Başlık ────────────────────────────────────────────────────────── */

  const baslik: { vurgu?: string; metin: string; durum?: Durum } = isKipi
    ? gecikmis > 0
      ? { vurgu: `${gecikmis} görev`, metin: 'süresini aştı', durum: 'bd' }
      : bekleyenOnay > 0
        ? { vurgu: `${bekleyenOnay} onay`, metin: 'karar bekliyor' }
        : acikIsler.length > 0
          ? { vurgu: `${acikIsler.length} iş`, metin: 'kuyrukta' }
          : { metin: 'Kuyrukta iş yok' }
    : kirikTanim > 0
      ? { vurgu: `${kirikTanim} tanım`, metin: 'zinciri kırıyor', durum: 'bd' }
      : bagsizTanim > 0
        ? { vurgu: `${bagsizTanim} tanım`, metin: 'hiçbir yere bağlı değil' }
        : { vurgu: `${tanimlar.length} tanım`, metin: 'katalogda' };

  const kipSecenekleri = [
    ...(isOkuyabilir ? [{ id: 'is', ad: `İş kuyruğu · ${acikIsler.length}` }] : []),
    ...(tanimOkuyabilir ? [{ id: 'tanim', ad: `Tanımlar · ${tanimlar.length}` }] : []),
  ];

  return (
    <>
      <main style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={isKipi
            ? `Yönetim tezgâhı · iş kuyruğu · ${isler.length} kayıt`
            : `Yönetim tezgâhı · tanım katalogları · ${tanimlar.length} kayıt`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.metin}
          metrikler={isKipi ? [
            { deger: gecikmis, yazi: 'Gecikmiş', durum: gecikmis > 0 ? 'bd' : undefined },
            { deger: bekleyenOnay, yazi: 'Bekleyen onay',
              durum: bekleyenOnay > 0 ? 'md' : undefined },
            { deger: banaAtanan, yazi: 'Bana atanan' },
            { deger: tarihsiz, yazi: 'Son tarihsiz', durum: tarihsiz > 0 ? 'unk' : undefined },
          ] : [
            { deger: kirikTanim, yazi: 'Zinciri kıran',
              durum: kirikTanim > 0 ? 'bd' : undefined },
            { deger: bagsizTanim, yazi: 'Bağsız', durum: bagsizTanim > 0 ? 'md' : undefined },
            { deger: devreDisiTanim, yazi: 'Devre dışı',
              durum: devreDisiTanim > 0 ? 'pl' : undefined },
            { deger: tanimlar.length, yazi: 'Katalog kaydı' },
          ]}
        />

        <section className="ekran-govde">
          {kipSecenekleri.length > 1 && (
            <div style={{ marginTop: 'var(--s26)' }}>
              <KipDegistir secenekler={kipSecenekleri} aktif={kip}
                sec={(id) => kipeGec(id as Kip)} />
            </div>
          )}

          <Filtreler
            secenekler={isKipi ? IS_MERCEKLERI : TANIM_MERCEKLERI}
            aktif={isKipi ? isMercek : tanimMercek}
            sec={(id) => {
              if (isKipi) setIsMercek(id); else setTanimMercek(id);
              setKuyrukAcik(false);
            }}
            kapsam={isKipi ? (
              <>
                <Kapsam etiket="Sorumlu" aktif={sorumluF}
                  sec={(id) => { setSorumluF(id); setKuyrukAcik(false); }}
                  secenekler={[...kullanicilar.map((u) => ({ id: u.id, ad: u.ad })),
                    { id: 'yok', ad: 'atanmadı' }]} />
                <Kapsam etiket="Santral" aktif={tesisF}
                  sec={(id) => { setTesisF(id); setKuyrukAcik(false); }}
                  secenekler={tesisSecenekleri.map((t) => ({ id: t.id, ad: t.ad }))} />
                {gorevAcabilir && (
                  <button type="button" className="kapsam-dugme"
                    onClick={() => { setYeniAcik('gorev'); setSecili(null); }}>
                    + Yeni görev
                  </button>
                )}
              </>
            ) : (
              <>
                <Kapsam etiket="Katalog" aktif={katalogF}
                  sec={(id) => { setKatalogF(id); setKuyrukAcik(false); }}
                  secenekler={(Object.keys(KATALOG_ETIKET) as Katalog[])
                    .map((k) => ({ id: k, ad: KATALOG_ETIKET[k] }))} />
                {tanimYazabilir && (
                  <button type="button" className="kapsam-dugme"
                    onClick={() => { setYeniAcik('tanim'); setSecili(null); }}>
                    + Yeni tanım
                  </button>
                )}
              </>
            )}
          />

          {satirlar.length === 0 ? (
            <div style={{ marginTop: 'var(--s22)' }}>
              {filtreAktif ? <BosFiltre temizle={temizle} /> : (
                <BosIlk
                  cumle={isKipi
                    ? 'Kuyrukta bekleyen görev ya da onay talebi yok.'
                    : 'Tanım kataloglarında kayıt yok.'}
                  eylem={isKipi && gorevAcabilir
                    ? <Dugme tur="birincil" onClick={() => setYeniAcik('gorev')}>Görev aç</Dugme>
                    : !isKipi && tanimYazabilir
                      ? <Dugme tur="birincil" onClick={() => setYeniAcik('tanim')}>Tanım ekle</Dugme>
                      : undefined} />
              )}
            </div>
          ) : (
            <div style={{ marginTop: 'var(--s22)' }}>
              <Tablo
                konuBasligi={isKipi ? 'İş' : 'Tanım'}
                kolonlar={isKipi ? IS_KOLONLARI : TANIM_KOLONLARI}
                satirlar={satirlar}
                secili={secili}
                sec={sec}
                kuyruk={toplanan.length > 0
                  ? { metin: isKipi
                    ? isKuyrukEtiketi(toplanan as Is[])
                    : tanimKuyrukEtiketi(toplanan as Tanim[]),
                  ac: () => setKuyrukAcik(true) }
                  : null}
                dipNot={dipNot({
                  isKipi, gorunur: satirlar.length, tarihsiz,
                  kapali: isler.length - acikIsler.length,
                  onayVar: (gorunur as Is[]).some((x) => 'tur' in x && x.tur === 'onay'),
                  devreDisi: devreDisiTanim,
                  kuyruktaBagsiz: isKipi ? 0
                    : (toplanan as Tanim[]).filter((t) => tanimImi(t) === 'md').length,
                  mercek: isKipi ? isMercek : tanimMercek,
                })}
              />
              {kuyrukAcik && (
                <p className="dip-not tbl-dip">
                  <button type="button" className="dg dg-satir"
                    onClick={() => setKuyrukAcik(false)}>Kuyruğu topla</button>
                </p>
              )}
            </div>
          )}
        </section>
      </main>

      {seciliIs && (
        <Cekmece kod={isKodu(seciliIs)} kapat={() => setSecili(null)}>
          <IsOzeti is={seciliIs} simdi={simdi} />
        </Cekmece>
      )}

      {seciliTanim && (
        <Cekmece kod={seciliTanim.kod} kapat={() => { setSecili(null); setDuzenleAcik(false); }}>
          {duzenleAcik ? (
            <>
              <div className="cekmece-blok">
                <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>
                  {KATALOG_ETIKET[seciliTanim.katalog]} kaydını düzenle
                </p>
              </div>
              <div className="cekmece-blok">
                <TanimFormu tanim={seciliTanim} katalog={seciliTanim.katalog}
                  kirilimler={kirilimSecenekleri} sektorler={sektorSecenekleri}
                  kapat={() => setDuzenleAcik(false)} />
              </div>
            </>
          ) : (
            <TanimOzeti tanim={seciliTanim}
              yazabilir={tanimYazabilir} onaylayabilir={tanimOnaylayabilir}
              duzenle={() => setDuzenleAcik(true)} />
          )}
        </Cekmece>
      )}

      {yeniAcik === 'gorev' && !secili && (
        <Cekmece kod="YENİ GÖREV" kapat={() => setYeniAcik(null)}>
          <div className="cekmece-blok">
            <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>Yeni görev</p>
          </div>
          <div className="cekmece-blok">
            <GorevFormu kullanicilar={kullanicilar} tesisler={tesisSecenekleri}
              kapat={() => setYeniAcik(null)} />
          </div>
        </Cekmece>
      )}

      {yeniAcik === 'tanim' && !secili && (
        <Cekmece kod="YENİ TANIM" kapat={() => setYeniAcik(null)}>
          <div className="cekmece-blok">
            <p className="t-label" style={{ margin: '0 0 var(--s12)' }}>
              Yeni {KATALOG_ETIKET[yeniKatalog].toLocaleLowerCase('tr-TR')}
            </p>
          </div>
          <div className="cekmece-blok">
            <TanimFormu key={yeniKatalog} tanim={null} katalog={yeniKatalog}
              katalogDegistir={setYeniKatalog}
              kirilimler={kirilimSecenekleri} sektorler={sektorSecenekleri}
              kapat={() => setYeniAcik(null)} />
          </div>
        </Cekmece>
      )}
    </>
  );
}

/* ── Dip not ────────────────────────────────────────────────────────────
   Bilinmeyen sıfır sayılmaz: kaç işin son tarihi hiç girilmediği burada
   yazılır, "0 gün gecikme" uydurulmaz (§19). */

function dipNot({
  isKipi, gorunur, tarihsiz, kapali, onayVar, devreDisi, kuyruktaBagsiz, mercek,
}: {
  isKipi: boolean; gorunur: number; tarihsiz: number;
  kapali: number; onayVar: boolean; devreDisi: number;
  kuyruktaBagsiz: number; mercek: string;
}): string {
  const parca = [`${gorunur} satır görünüyor`];
  if (isKipi) {
    parca.push('sıralama son tarihe göre');
    // Karışma riski yalnız onay satırı ekrandayken var: o satırda kolon
    // sorumluyu değil talebi AÇANI gösterir.
    if (onayVar) parca.push('onay satırında kişi talebi açandır');
    if (tarihsiz > 0) parca.push(`${tarihsiz} görevin son tarihi girilmedi`);
    if (kapali > 0 && mercek === 'bekleyen') parca.push(`${kapali} kapanmış kayıt bu mercekte gizli`);
  } else {
    parca.push('beş katalog tek listede');
    // Kuyruğa inen bağsız kayıt sayısı canvasta söylenir: bütçe dışında
    // kalan iş, etiketin arkasına saklanmasın.
    if (kuyruktaBagsiz > 0) parca.push(`${kuyruktaBagsiz} bağsız kayıt kuyrukta`);
    if (devreDisi > 0 && mercek !== 'devre') parca.push(`${devreDisi} kayıt devre dışı`);
  }
  return parca.join(' · ');
}

/** Görev ve onay talebinin kayıt kodu yok; çekmece kimliği için kısa ve
    kararlı bir damga türetilir. */
function isKodu(i: Is): string {
  return `${i.tur === 'gorev' ? 'GRV' : 'ONY'}-${i.kayitId.slice(-6).toUpperCase()}`;
}

/* ── Çekmece · iş ───────────────────────────────────────────────────── */

function IsOzeti({ is, simdi }: { is: Is; simdi: number }) {
  const im = isImi(is, simdi);
  const gun = kalanGun(is.sonTarih, simdi);
  const bekleme = gecenGun(is.olusturuldu, simdi);
  const yol = kaynakYolu(is.kaynakTipi, is.kaynakId);

  const cumle = is.tur === 'onay'
    ? isAcikMi(is)
      ? `${bekleme} gündür karar bekliyor; karar kaynak kaydı otomatik değiştirmez.`
      : `${is.onaylayan ?? 'sistem'} karara bağladı${is.gerekce ? ` · ${is.gerekce}` : ''}.`
    : gun !== null && gun < 0
      ? `Son tarih ${Math.abs(gun)} gün aşıldı.`
      : gun !== null
        ? `Son tarihe ${gun} gün kaldı.`
        : is.kapanis
          ? `${tarihTR(is.kapanis)} tarihinde kapandı.`
          : 'Son tarih girilmedi — gecikmesi ölçülemez.';

  return (
    <>
      <CekmeceKimlik durum={im} soz={isDurumSozu(is)} baslik={is.baslik} cumle={cumle} />

      <CekmeceAlanlar alanlar={[
        {
          etiket: 'Tür',
          deger: `${is.tur === 'gorev' ? 'Görev' : 'Onay talebi'} · ${isTipEtiketi(is)}`,
        },
        {
          etiket: is.tur === 'gorev' ? 'Sorumlu' : 'Talep eden',
          deger: is.kisi?.ad ?? (is.tur === 'gorev' ? 'atanmadı' : 'sistem'),
          durum: is.tur === 'gorev' && !is.kisi ? 'md' : undefined,
        },
        ...(is.tur === 'gorev' ? [{
          etiket: 'Santral',
          deger: is.tesis ? `${is.tesis.kod} — ${is.tesis.ad}` : 'portföy',
        }] : []),
        {
          etiket: is.tur === 'gorev' ? 'Son tarih' : 'Bekleme',
          deger: is.tur === 'onay'
            ? `${bekleme} gün`
            : is.sonTarih ? tarihTR(is.sonTarih) : 'girilmedi',
          durum: im === 'bd' ? 'bd' : im === 'unk' ? 'unk' : undefined,
        },
      ]} />

      {yol ? (
        <CekmeceBagli
          baslik="Kaynak"
          kayitlar={[{
            id: is.kaynakId ?? is.id,
            kod: etiketle(is.kaynakTipi),
            alt: 'işi doğuran kayıt',
            yol,
            suren: isAcikMi(is),
          }]}
        />
      ) : is.kaynakTipi ? (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Kaynak</p>
          <p className="cekmece-dip" style={{ margin: 0 }}>
            {etiketle(is.kaynakTipi)} kaydından doğdu — bu tipin ayrı bir ekranı yok.
          </p>
        </div>
      ) : null}

      <CekmeceEylemler
        birincil={is.tur === 'gorev'
          ? <GorevDurumEylemleri is={is} />
          : isAcikMi(is)
            ? <OnayKarariFormu is={is} />
            : undefined}
        dipNot={`${is.otomatik ? 'Motor üretti' : 'Elle açıldı'} · ${zamanTR(is.olusturuldu)}`
          + (is.kapanis ? ` · kapanış ${tarihTR(is.kapanis)}` : '')}
      />
    </>
  );
}

/* ── Çekmece · tanım ────────────────────────────────────────────────── */

function TanimOzeti({ tanim, yazabilir, onaylayabilir, duzenle }: {
  tanim: Tanim; yazabilir: boolean; onaylayabilir: boolean; duzenle: () => void;
}) {
  const im = tanimImi(tanim);

  const cumle = tanim.eksik
    ? `Kayıtta ${tanim.eksik}; bu boşluk zinciri kırıyor.`
    : tanim.devreDisi
      ? tanim.katalog === 'tesis'
        ? `${etiketle(tanim.kapanisNedeni, 'neden girilmedi')} · ${tarihTR(tanim.kapanisTarihi)}`
        : 'Kayıt pasif; yeni değerlendirmelerde kullanılmaz.'
      : tanim.kullanim === 0
        ? 'Hiçbir kayda bağlı değil — bağlanmalı ya da silinmeli.'
        : `${kullanimMetni(tanim)} bu tanıma bağlı.`;

  // Katalog başına bir ek alan: kaydın kendi kimlik olgusu.
  const ekAlan = tanim.katalog === 'tesis'
    ? [{ etiket: 'Kurulu güç',
      deger: tanim.guc !== null ? `${tanim.guc} MW` : 'bilinmiyor',
      durum: tanim.guc === null ? ('unk' as const) : undefined },
    { etiket: 'Konum', deger: tanim.konum ?? 'bilinmiyor',
      durum: tanim.konum ? undefined : ('unk' as const) }]
    : tanim.katalog === 'regulasyon'
      ? [{ etiket: 'Sürüm', deger: tanim.surum ?? 'bilinmiyor',
        durum: tanim.surum ? undefined : ('unk' as const) }]
      : tanim.katalog === 'alan'
        ? [{ etiket: 'Açıklama', deger: tanim.aciklama ?? 'girilmedi' }]
        : tanim.katalog === 'kirilim'
          ? [{ etiket: 'Sektör', deger: tanim.not }]
          : [];

  return (
    <>
      <CekmeceKimlik durum={im} soz={tanimSozu(tanim)} baslik={tanim.ad} cumle={cumle} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Katalog', deger: KATALOG_ETIKET[tanim.katalog] },
        { etiket: 'Bağlı kayıt', deger: kullanimMetni(tanim),
          durum: tanim.kullanim === 0 ? 'md' : undefined },
        ...(tanim.ikincilKullanim
          ? [{ etiket: 'Ayrıca',
            deger: `${tanim.ikincilKullanim.sayi} ${tanim.ikincilKullanim.birim}` }]
          : []),
        ...ekAlan,
      ]} />

      {tanim.kaynakUrl && (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Resmî kaynak</p>
          <p className="cekmece-dip" style={{ margin: 0 }}>
            <a href={tanim.kaynakUrl} target="_blank" rel="noreferrer">{tanim.kaynakUrl}</a>
          </p>
        </div>
      )}

      <CekmeceEylemler
        birincil={yazabilir
          ? <Dugme tur="cekmece" onClick={duzenle}>Kaydı düzenle</Dugme>
          : undefined}
        ikincil={<TanimEylemleri tanim={tanim} onaylayabilir={onaylayabilir} />}
        dipNot={`Kod ${tanim.kod}`
          + (silinebilir(tanim) ? ' · bağı yok, silinebilir' : '')}
      />
    </>
  );
}

/* ── Kapsam kontrolü (SORUMLU ▾ / SANTRAL ▾ / KATALOG ▾) ─────────────
   Referans ekranlardaki kalıbın aynısı: kutu yok, 9.5px mono açılır liste;
   dışarı tık ve Esc kapatır — açık kalan menü tabloyu örter. */

function Kapsam({ etiket, secenekler, aktif, sec }: {
  etiket: string;
  secenekler: { id: string; ad: string }[];
  aktif: string | null;
  sec: (id: string | null) => void;
}) {
  const secim = secenekler.find((s) => s.id === aktif);
  const kok = useRef<HTMLDetailsElement | null>(null);

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
      <summary className="kapsam-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 200,
        maxHeight: 300, overflowY: 'auto', background: 'var(--card)',
        border: 'var(--bw-strong) solid var(--hr2)', boxShadow: 'var(--sh-tip)',
        padding: 'var(--s8)',
      }}>
        {[{ id: '', ad: 'Tümü' }, ...secenekler].map((s) => (
          <button key={s.id} type="button" className="filtre"
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

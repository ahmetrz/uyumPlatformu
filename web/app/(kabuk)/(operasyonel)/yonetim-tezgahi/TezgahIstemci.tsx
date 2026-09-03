'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import { BosFiltre, BosIlk, Dugme, type Durum } from '@/components/kabuk/temel';
import { EkranBasligi, Filtreler, KipDegistir } from '@/components/kabuk/ekran';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import {
  ApiAnahtarFormu, ApiAnahtarIptal,
  GorevFormu, GorevDurumEylemleri, OnayKarariFormu, TanimEylemleri, TanimFormu,
} from './Formlar';
import {
  GORUNUR_BUTCE, KATALOG_ETIKET, SON_ISTEK_TAVANI, UFUK_GUN,
  anahtarAltSatiri, anahtarBittiMi, anahtarEtkinMi, anahtarImi,
  anahtarKuyrukEtiketi, anahtarSabit, anahtarSirala, anahtarSozu,
  gecenGun, gecikmisMi, isAcikMi, isAltSatiri, isDurumSozu, isImi, isSabit,
  isKuyrukEtiketi, isSirala, isTipEtiketi, istekDurumMetni, istekImi, istekMetni,
  kalanGun, kaynakYolu, kullanimMetni, silinebilir, sonIstekDipNotu, sonKullanimMetni,
  sureMetni, tanimAltSatiri, tanimImi, tanimKuyrukEtiketi, tanimSabit, tanimSirala,
  tanimSozu,
  type Anahtar, type Is, type Katalog, type Kisi, type Kodlu, type SonIstek, type Tanim,
} from './ortak';

/* M1/M2/P1-3 · Yönetim tezgâhı — "bugün ne karar bekliyor, katalog doğru
   mu, dışarıdan kim girebiliyor?"

   KİP AYRIMI (gerekçe ortak.ts başında ayrıntılı): üç ekran tek canvasta
   duramazdı, çünkü iş kuyruğu ZAMAN, tanım katalogları KULLANIM, API
   anahtarları ERİŞİM ekseninde okunur; ortak bir öncelik sayısı yok ve
   4 metriklik bütçe tek şeritte üçünü anlatamaz. Kip içinde ise gerçek
   birleştirme yapıldı: görev + onay talebi tek tabloda, beş katalog tek
   tabloda, anahtarın kimliği/sahipliği/ömrü/trafiği tek tabloda.

   TOKEN SÖZLEŞMESİ: tam API token'ı bu bileşene HİÇ GELMEZ. Yalnız üretim
   formunun kendi yerel state'inde bir kez yaşar (Formlar.tsx), çekmece
   kapanınca sökülür. Burada saklanmaz, kip değişiminde taşınmaz.

   Yoğunluk sözleşmesi: kip başına 4 metrik, 5–9 görünür satır + toplanan
   kuyruk (kritik satır asla toplanmaz), durum sözcüğü canvasta YAZILMAZ —
   yalnız çekmecenin kimlik bloğunda geçer, kart ızgarası/zebra/pill yok,
   detay modalda değil 420px çekmecede açılır. */

type Kip = 'is' | 'tanim' | 'anahtar';

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

/* Anahtar kolonları ERİŞİM sorusunu sırayla yanıtlar: kim adına çalışıyor,
   ne kadar kullanılmış, en son ne zaman, ne zaman bitiyor. */
const ANAHTAR_KOLONLARI: Kolon[] = [
  { baslik: 'Sahip', genislik: '148px' },
  { baslik: 'İstek', genislik: '78px', sag: true },
  { baslik: 'Son kullanım', genislik: '112px', sag: true },
  { baslik: 'Bitiş', genislik: '100px', sag: true, ikincil: true },
];

/* D32 · Son istek kolonları: ne (yöntem), sonuç (durum kodu + hata kodu),
   kim (anahtar adı), ne kadar (süre). Yol konu sütunudur — en uzun ve en
   ayırt edici alan; zaman alt satırda. Bu tablo SEÇİLMEZ: istek satırının
   açılacak bir çekmecesi yok, yanıt gövdesi ekrana bilerek inmiyor. */
const ISTEK_KOLONLARI: Kolon[] = [
  { baslik: 'Yöntem', genislik: '78px' },
  { baslik: 'Durum', genislik: '150px' },
  { baslik: 'Anahtar', genislik: '148px' },
  { baslik: 'Süre', genislik: '84px', sag: true, ikincil: true },
];

const ANAHTAR_MERCEKLERI = [
  { id: 'etkin', ad: 'Etkin' },
  { id: 'atil', ad: 'Kullanılmamış' },
  { id: 'doluyor', ad: 'Süresi doluyor' },
  { id: 'sonlanmis', ad: 'Sonlanmış' },
  { id: 'hepsi', ad: 'Tümü' },
];

export default function TezgahIstemci({
  aktifId, simdi, isler, tanimlar, anahtarlar, sonIstekler, kullanicilar, tesisSecenekleri,
  kirilimSecenekleri, sektorSecenekleri,
  tanimOkuyabilir, isOkuyabilir, anahtarOkuyabilir,
  tanimYazabilir, tanimOnaylayabilir, gorevAcabilir, anahtarYazabilir, baslangicKipi, konsolOkuyabilir,
}: {
  aktifId: string;
  /** adresteki ?bolum= değeri (is | tanim | anahtar); yoksa yetkiye göre ilk kip */
  baslangicKipi?: Kip;
  /** yönetim okuma yetkisi: Konsol seçeneği görünür (yetki sunucuda ayrıca aranır) */
  konsolOkuyabilir?: boolean;
  simdi: number;
  isler: Is[];
  tanimlar: Tanim[];
  anahtarlar: Anahtar[];
  /** D32 · son N API isteği (yanıt gövdesi ve idempotency değeri yok) */
  sonIstekler: SonIstek[];
  kullanicilar: Kisi[];
  tesisSecenekleri: Kodlu[];
  kirilimSecenekleri: Kodlu[];
  sektorSecenekleri: Kodlu[];
  tanimOkuyabilir: boolean;
  isOkuyabilir: boolean;
  anahtarOkuyabilir: boolean;
  tanimYazabilir: boolean;
  tanimOnaylayabilir: boolean;
  gorevAcabilir: boolean;
  anahtarYazabilir: boolean;
}) {
  const router = useRouter();
  const [kip, setKip] = useState<Kip>(
    baslangicKipi ?? (isOkuyabilir ? 'is' : tanimOkuyabilir ? 'tanim' : 'anahtar'));
  const [isMercek, setIsMercek] = useState('bekleyen');
  const [tanimMercek, setTanimMercek] = useState('hepsi');
  const [anahtarMercek, setAnahtarMercek] = useState('etkin');
  const [sorumluF, setSorumluF] = useState<string | null>(null);
  const [tesisF, setTesisF] = useUrlDurumuBos('tesis');
  const [katalogF, setKatalogF] = useState<string | null>(null);
  const [sahipF, setSahipF] = useUrlDurumuBos('sahip');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [secili, setSecili] = useUrlDurumuBos('sec');
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [yeniAcik, setYeniAcik] = useState<null | 'gorev' | 'tanim' | 'anahtar'>(null);
  const [yeniKatalog, setYeniKatalog] = useState<Katalog>('tesis');

  const isKipi = kip === 'is';
  const tanimKipi = kip === 'tanim';
  const anahtarKipi = kip === 'anahtar';

  /* Kip değişimi açık çekmeceyi kapatır. Bu yalnız düzen tercihi değil,
     token sözleşmesinin uygulanmasıdır: üretim formu sökülür ve bir kez
     gösterilen tam token bellekten gider. */
  function kipeGec(y: Kip | 'konsol') {
    // Konsol ayrı bir istemcidir (KonsolIstemci); adres değişir, kip burada kalmaz.
    if (y === 'konsol') { router.push('/yonetim-tezgahi'); return; }
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

  const etkinAnahtar = useMemo(
    () => anahtarlar.filter((a) => anahtarEtkinMi(a, simdi)), [anahtarlar, simdi]);
  const sahibiPasif = etkinAnahtar.filter((a) => !a.sahipAktif).length;
  const doluyorAnahtar = etkinAnahtar.filter(
    (a) => anahtarImi(a, simdi) === 'md').length;
  /* Hiç kullanılmamış etkin anahtar: `sonKullanim` boş. Bu bir BOŞLUK değil
     ölçülmüş bir olgudur — anahtar duruyor ama kimse kullanmadı, iptal
     adayıdır. Toplam istek de aynı şekilde gerçek bir COUNT toplamı. */
  const kullanilmamis = etkinAnahtar.filter((a) => !a.sonKullanim).length;
  const toplamIstek = anahtarlar.reduce((t, a) => t + a.istekSayisi, 0);
  const sonlanmisAnahtar = anahtarlar.length - etkinAnahtar.length;

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

  const suzulmusAnahtar = useMemo(() => anahtarSirala(anahtarlar.filter((a) => {
    const etkin = anahtarEtkinMi(a, simdi);
    if (anahtarMercek === 'etkin' && !etkin) return false;
    if (anahtarMercek === 'atil' && !(etkin && !a.sonKullanim)) return false;
    if (anahtarMercek === 'doluyor' && anahtarImi(a, simdi) !== 'md') return false;
    if (anahtarMercek === 'sonlanmis' && etkin) return false;
    if (sahipF && a.sahip.id !== sahipF) return false;
    return true;
  }), simdi), [anahtarlar, anahtarMercek, sahipF, simdi]);

  /* Sabitlenen satırlar bütçenin DIŞINDADIR ve asla kuyruğa inmez
     (06 §A3); sakin olanlar bütçeyi doldurur, kalanı toplanır. */
  type Kayit = Is | Tanim | Anahtar;
  const { gorunur, toplanan } = useMemo(() => {
    const hepsi: Kayit[] = isKipi ? suzulmusIs : tanimKipi ? suzulmusTanim : suzulmusAnahtar;
    const sabitMi = (x: Kayit) => (isKipi
      ? isSabit(x as Is, simdi)
      : tanimKipi ? tanimSabit(x as Tanim) : anahtarSabit(x as Anahtar, simdi));
    const sabit = hepsi.filter(sabitMi);
    const sakin = hepsi.filter((x) => !sabitMi(x));
    if (kuyrukAcik) return { gorunur: [...sabit, ...sakin], toplanan: [] as Kayit[] };
    const slot = Math.max(0, GORUNUR_BUTCE - sabit.length);
    return { gorunur: [...sabit, ...sakin.slice(0, slot)], toplanan: sakin.slice(slot) };
  }, [isKipi, tanimKipi, suzulmusIs, suzulmusTanim, suzulmusAnahtar, kuyrukAcik, simdi]);

  const seciliIs = isKipi ? isler.find((i) => i.id === secili) ?? null : null;
  const seciliTanim = tanimKipi ? tanimlar.find((t) => t.id === secili) ?? null : null;
  const seciliAnahtar = anahtarKipi ? anahtarlar.find((a) => a.id === secili) ?? null : null;

  /* D32 · Son istekler anahtar seçimine ve sahip süzgecine uyar: çekmecede
     bir anahtar açıkken listede yalnız onun trafiği kalır; sahip süzgeci
     de o sahibin anahtarlarına iner. Mercek (etkin/sonlanmış) uygulanmaz —
     iptal edilmiş anahtarın SON istekleri tam da görülmesi gereken şeydir. */
  const gorunurIstekler = useMemo(() => sonIstekler.filter((i) => {
    if (seciliAnahtar) return i.anahtar?.id === seciliAnahtar.id;
    if (sahipF) {
      const sahipAnahtarlari = new Set(anahtarlar.filter((a) => a.sahip.id === sahipF).map((a) => a.id));
      return !!i.anahtar && sahipAnahtarlari.has(i.anahtar.id);
    }
    return true;
  }), [sonIstekler, seciliAnahtar, sahipF, anahtarlar]);

  const istekSatirlari: Satir[] = gorunurIstekler.map((i) => {
    const im = istekImi(i.durumKodu);
    return {
      id: i.id, durum: im, kenar: im === 'bd' ? 'bd' : undefined,
      konu: <span className="mono">{i.yol}</span>,
      alt: zamanTR(i.zaman),
      hucreler: [
        <span key="y" className="mono">{i.yontem}</span>,
        <span key="d" className="mono" style={im === 'bd'
          ? { color: 'var(--bd)' } : im === 'md' ? { color: 'var(--md)' }
            : im === 'unk' ? { color: 'var(--unk)' } : undefined}>
          {istekDurumMetni(i)}
        </span>,
        // Anahtarsız istek gizlenmez: kimlik doğrulanamayan trafik de trafiktir.
        <span key="a" style={i.anahtar ? undefined : { color: 'var(--i3)' }}>
          {i.anahtar?.ad ?? 'anahtarsız'}
        </span>,
        <span key="s" style={i.sureMs === null ? { color: 'var(--i3)' } : undefined}>
          {sureMetni(i.sureMs)}
        </span>,
      ],
    };
  });

  const filtreAktif = isKipi
    ? isMercek !== 'bekleyen' || sorumluF !== null || tesisF !== null
    : tanimKipi
      ? tanimMercek !== 'hepsi' || katalogF !== null
      : anahtarMercek !== 'etkin' || sahipF !== null;

  function temizle() {
    if (isKipi) { setIsMercek('bekleyen'); setSorumluF(null); setTesisF(null); }
    else if (tanimKipi) { setTanimMercek('hepsi'); setKatalogF(null); }
    else { setAnahtarMercek('etkin'); setSahipF(null); }
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
    : tanimKipi
      ? (gorunur as Tanim[]).map((t) => {
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
      })
      : (gorunur as Anahtar[]).map((a) => {
        const im = anahtarImi(a, simdi);
        const gun = kalanGun(a.bitis, simdi);
        return {
          id: a.id, durum: im, kenar: im,
          konu: a.ad,
          alt: anahtarAltSatiri(a),
          hucreler: [
            <span key="s" style={a.sahipAktif ? undefined : { color: 'var(--bd)' }}>
              {a.sahip.ad}
            </span>,
            /* "0 istek" uydurma değil ölçülmüş sıfırdır (ApiIstegi COUNT'u);
               yine de sakin bir tonda yazılır, trafiği olan satır öne çıksın. */
            <span key="i" style={a.istekSayisi === 0 ? { color: 'var(--i3)' } : undefined}>
              {istekMetni(a)}
            </span>,
            <span key="k" style={a.sonKullanim ? undefined : { color: 'var(--i3)' }}>
              {sonKullanimMetni(a)}
            </span>,
            a.bitis
              ? <span key="b" style={gun !== null && gun <= 0
                ? { color: 'var(--pl)' }
                : gun !== null && gun <= UFUK_GUN ? { color: 'var(--md)' } : undefined}>
                {tarihTR(a.bitis)}
              </span>
              : <span key="b" style={{ color: 'var(--i3)' }}>süresiz</span>,
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
    : tanimKipi
      ? kirikTanim > 0
        ? { vurgu: `${kirikTanim} tanım`, metin: 'zinciri kırıyor', durum: 'bd' }
        : bagsizTanim > 0
          ? { vurgu: `${bagsizTanim} tanım`, metin: 'hiçbir yere bağlı değil' }
          : { vurgu: `${tanimlar.length} tanım`, metin: 'katalogda' }
      : sahibiPasif > 0
        ? { vurgu: `${sahibiPasif} anahtar`, metin: 'sahibi pasifken etkin', durum: 'bd' }
        : doluyorAnahtar > 0
          ? { vurgu: `${doluyorAnahtar} anahtar`, metin: 'süresi doluyor' }
          : etkinAnahtar.length > 0
            ? { vurgu: `${etkinAnahtar.length} anahtar`, metin: 'dış API erişimi taşıyor' }
            : { metin: 'Etkin API anahtarı yok' };

  const kipSecenekleri = [
    ...(konsolOkuyabilir ? [{ id: 'konsol', ad: 'Konsol' }] : []),
    ...(isOkuyabilir ? [{ id: 'is', ad: `İş kuyruğu · ${acikIsler.length}` }] : []),
    ...(tanimOkuyabilir ? [{ id: 'tanim', ad: `Tanımlar · ${tanimlar.length}` }] : []),
    ...(anahtarOkuyabilir
      ? [{ id: 'anahtar', ad: `API anahtarları · ${etkinAnahtar.length}` }] : []),
  ];

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={isKipi
            ? `Yönetim tezgâhı · iş kuyruğu · ${isler.length} kayıt`
            : tanimKipi
              ? `Yönetim tezgâhı · tanım katalogları · ${tanimlar.length} kayıt`
              : `Yönetim tezgâhı · API anahtarları · ${anahtarlar.length} kayıt`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.metin}
          metrikler={isKipi ? [
            { deger: gecikmis, yazi: 'Gecikmiş', durum: gecikmis > 0 ? 'bd' : undefined },
            { deger: bekleyenOnay, yazi: 'Bekleyen onay',
              durum: bekleyenOnay > 0 ? 'md' : undefined },
            { deger: banaAtanan, yazi: 'Bana atanan' },
            { deger: tarihsiz, yazi: 'Son tarihsiz', durum: tarihsiz > 0 ? 'unk' : undefined },
          ] : tanimKipi ? [
            { deger: kirikTanim, yazi: 'Zinciri kıran',
              durum: kirikTanim > 0 ? 'bd' : undefined },
            { deger: bagsizTanim, yazi: 'Bağsız', durum: bagsizTanim > 0 ? 'md' : undefined },
            { deger: devreDisiTanim, yazi: 'Devre dışı',
              durum: devreDisiTanim > 0 ? 'pl' : undefined },
            { deger: tanimlar.length, yazi: 'Katalog kaydı' },
          ] : [
            { deger: etkinAnahtar.length, yazi: 'Etkin anahtar' },
            { deger: doluyorAnahtar, yazi: 'Süresi doluyor',
              durum: doluyorAnahtar > 0 ? 'md' : undefined },
            { deger: kullanilmamis, yazi: 'Kullanılmamış',
              durum: kullanilmamis > 0 ? 'pl' : undefined },
            { deger: toplamIstek, yazi: 'Toplam istek' },
          ]}
        />

        <section className="ab-ekran-govde">
          {kipSecenekleri.length > 1 && (
            <div style={{ marginTop: 'var(--s26)' }}>
              <KipDegistir secenekler={kipSecenekleri} aktif={kip}
                sec={(id) => kipeGec(id as Kip | 'konsol')} />
            </div>
          )}

          <Filtreler
            secenekler={isKipi ? IS_MERCEKLERI : tanimKipi ? TANIM_MERCEKLERI : ANAHTAR_MERCEKLERI}
            aktif={isKipi ? isMercek : tanimKipi ? tanimMercek : anahtarMercek}
            sec={(id) => {
              if (isKipi) setIsMercek(id);
              else if (tanimKipi) setTanimMercek(id);
              else setAnahtarMercek(id);
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
                  <button type="button" className="ab-dugme"
                    onClick={() => { setYeniAcik('gorev'); setSecili(null); }}>
                    + Yeni görev
                  </button>
                )}
              </>
            ) : tanimKipi ? (
              <>
                <Kapsam etiket="Katalog" aktif={katalogF}
                  sec={(id) => { setKatalogF(id); setKuyrukAcik(false); }}
                  secenekler={(Object.keys(KATALOG_ETIKET) as Katalog[])
                    .map((k) => ({ id: k, ad: KATALOG_ETIKET[k] }))} />
                {tanimYazabilir && (
                  <button type="button" className="ab-dugme"
                    onClick={() => { setYeniAcik('tanim'); setSecili(null); }}>
                    + Yeni tanım
                  </button>
                )}
              </>
            ) : (
              <>
                <Kapsam etiket="Sahip" aktif={sahipF}
                  sec={(id) => { setSahipF(id); setKuyrukAcik(false); }}
                  secenekler={kullanicilar.map((u) => ({ id: u.id, ad: u.ad }))} />
                {/* Üretim düğmesi yalnız yonetim/yazma yetkisiyle görünür;
                    kapı sunucuda da var (yetkiZorunlu('yonetim','yazma')). */}
                {anahtarYazabilir && (
                  <button type="button" className="ab-dugme"
                    onClick={() => { setYeniAcik('anahtar'); setSecili(null); }}>
                    + Yeni anahtar
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
                    : tanimKipi
                      ? 'Tanım kataloglarında kayıt yok.'
                      : 'Dış API için üretilmiş anahtar yok — anahtar seed edilmez, '
                        + 'bir kişinin bilerek ürettiği kayıttır.'}
                  eylem={isKipi && gorevAcabilir
                    ? <Dugme tur="birincil" onClick={() => setYeniAcik('gorev')}>Görev aç</Dugme>
                    : tanimKipi && tanimYazabilir
                      ? <Dugme tur="birincil" onClick={() => setYeniAcik('tanim')}>Tanım ekle</Dugme>
                      : anahtarKipi && anahtarYazabilir
                        ? <Dugme tur="birincil"
                          onClick={() => setYeniAcik('anahtar')}>Anahtar üret</Dugme>
                        : undefined} />
              )}
            </div>
          ) : (
            <div style={{ marginTop: 'var(--s22)' }}>
              <Tablo
                konuBasligi={isKipi ? 'İş' : tanimKipi ? 'Tanım' : 'Anahtar'}
                kolonlar={isKipi ? IS_KOLONLARI : tanimKipi ? TANIM_KOLONLARI : ANAHTAR_KOLONLARI}
                satirlar={satirlar}
                secili={secili}
                sec={sec}
                kuyruk={toplanan.length > 0
                  ? { metin: isKipi
                    ? isKuyrukEtiketi(toplanan as Is[])
                    : tanimKipi
                      ? tanimKuyrukEtiketi(toplanan as Tanim[])
                      : anahtarKuyrukEtiketi(toplanan as Anahtar[], simdi),
                  ac: () => setKuyrukAcik(true) }
                  : null}
                dipNot={dipNot({
                  isKipi, tanimKipi, gorunur: satirlar.length, tarihsiz,
                  kapali: isler.length - acikIsler.length,
                  onayVar: (gorunur as Is[]).some((x) => 'tur' in x && x.tur === 'onay'),
                  devreDisi: devreDisiTanim,
                  kuyruktaBagsiz: tanimKipi
                    ? (toplanan as Tanim[]).filter((t) => tanimImi(t) === 'md').length : 0,
                  sahibiPasif, kullanilmamis, sonlanmis: sonlanmisAnahtar,
                  mercek: isKipi ? isMercek : tanimKipi ? tanimMercek : anahtarMercek,
                })}
              />
              {kuyrukAcik && (
                <p className="ab-dip dip">
                  <button type="button" className="ab-dugme satir"
                    onClick={() => setKuyrukAcik(false)}>Kuyruğu topla</button>
                </p>
              )}
            </div>
          )}

          {/* D32 · Son istekler — anahtar tablosunun altında ikinci kütük.
              Anahtar yokken de çizilir: anahtarsız (401) istekler tam o
              durumda görülmek ister. Tablo seçimsizdir; çekmecesi yok. */}
          {anahtarKipi && (
            <div style={{ marginTop: 'var(--s30)' }}>
              <h2 className="ab-bolum-basligi" style={{ margin: '0 0 var(--s12)' }}>
                Son istekler
                {seciliAnahtar ? ` · ${seciliAnahtar.ad}` : ''}
              </h2>
              {istekSatirlari.length === 0 ? (
                <p className="ab-dip" style={{ margin: 0 }}>
                  {seciliAnahtar
                    ? `${seciliAnahtar.ad} için son ${SON_ISTEK_TAVANI} istek penceresinde kayıt yok; `
                      + `tüm zamanlar: ${istekMetni(seciliAnahtar)}.`
                    : sonIstekDipNotu(gorunurIstekler, SON_ISTEK_TAVANI)}
                </p>
              ) : (
                <Tablo
                  konuBasligi="Yol"
                  kolonlar={ISTEK_KOLONLARI}
                  satirlar={istekSatirlari}
                  sik
                  dipNot={sonIstekDipNotu(gorunurIstekler, SON_ISTEK_TAVANI)
                    + ' · yanıt gövdesi ve Idempotency-Key ekrana inmez'}
                />
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
              <div className="ab-panel-blok">
                <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>
                  {KATALOG_ETIKET[seciliTanim.katalog]} kaydını düzenle
                </p>
              </div>
              <div className="ab-panel-blok">
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

      {seciliAnahtar && (
        <Cekmece kod={anahtarKodu(seciliAnahtar)} kapat={() => setSecili(null)}>
          <AnahtarOzeti anahtar={seciliAnahtar} simdi={simdi} yazabilir={anahtarYazabilir} />
        </Cekmece>
      )}

      {yeniAcik === 'gorev' && !secili && (
        <Cekmece kod="YENİ GÖREV" kapat={() => setYeniAcik(null)}>
          <div className="ab-panel-blok">
            <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Yeni görev</p>
          </div>
          <div className="ab-panel-blok">
            <GorevFormu kullanicilar={kullanicilar} tesisler={tesisSecenekleri}
              kapat={() => setYeniAcik(null)} />
          </div>
        </Cekmece>
      )}

      {yeniAcik === 'tanim' && !secili && (
        <Cekmece kod="YENİ TANIM" kapat={() => setYeniAcik(null)}>
          <div className="ab-panel-blok">
            <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>
              Yeni {KATALOG_ETIKET[yeniKatalog].toLocaleLowerCase('tr-TR')}
            </p>
          </div>
          <div className="ab-panel-blok">
            <TanimFormu key={yeniKatalog} tanim={null} katalog={yeniKatalog}
              katalogDegistir={setYeniKatalog}
              kirilimler={kirilimSecenekleri} sektorler={sektorSecenekleri}
              kapat={() => setYeniAcik(null)} />
          </div>
        </Cekmece>
      )}

      {/* Üretim çekmecesi tam token'ı bir kez gösterir ve kapanınca sökülür;
          token hiçbir üst state'e taşınmaz. */}
      {yeniAcik === 'anahtar' && !secili && (
        <Cekmece kod="YENİ ANAHTAR" kapat={() => setYeniAcik(null)}>
          <div className="ab-panel-blok">
            <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Yeni API anahtarı</p>
          </div>
          <div className="ab-panel-blok">
            <ApiAnahtarFormu kullanicilar={kullanicilar} aktifId={aktifId}
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
  isKipi, tanimKipi, gorunur, tarihsiz, kapali, onayVar, devreDisi,
  kuyruktaBagsiz, sahibiPasif, kullanilmamis, sonlanmis, mercek,
}: {
  isKipi: boolean; tanimKipi: boolean; gorunur: number; tarihsiz: number;
  kapali: number; onayVar: boolean; devreDisi: number;
  kuyruktaBagsiz: number; sahibiPasif: number; kullanilmamis: number;
  sonlanmis: number; mercek: string;
}): string {
  const parca = [`${gorunur} satır görünüyor`];
  if (isKipi) {
    parca.push('sıralama son tarihe göre');
    // Karışma riski yalnız onay satırı ekrandayken var: o satırda kolon
    // sorumluyu değil talebi AÇANI gösterir.
    if (onayVar) parca.push('onay satırında kişi talebi açandır');
    if (tarihsiz > 0) parca.push(`${tarihsiz} görevin son tarihi girilmedi`);
    if (kapali > 0 && mercek === 'bekleyen') parca.push(`${kapali} kapanmış kayıt bu mercekte gizli`);
  } else if (tanimKipi) {
    parca.push('beş katalog tek listede');
    // Kuyruğa inen bağsız kayıt sayısı canvasta söylenir: bütçe dışında
    // kalan iş, etiketin arkasına saklanmasın.
    if (kuyruktaBagsiz > 0) parca.push(`${kuyruktaBagsiz} bağsız kayıt kuyrukta`);
    if (devreDisi > 0 && mercek !== 'devre') parca.push(`${devreDisi} kayıt devre dışı`);
  } else {
    parca.push('sıralama en yeni üretim önce');
    // Sahibi pasif anahtar canvasta sayıyla söylenir: satırda yalnız
    // işaretçi var, sayı metrik şeridine sığmıyor.
    if (sahibiPasif > 0) parca.push(`${sahibiPasif} anahtarın sahibi pasif — istekleri 401 döner`);
    // "Kullanılmadı" bilinmeyen değil ölçülmüş sıfırdır; sayısı yazılır.
    if (kullanilmamis > 0) parca.push(`${kullanilmamis} anahtar hiç kullanılmadı`);
    if (sonlanmis > 0 && mercek === 'etkin') {
      parca.push(`${sonlanmis} sonlanmış anahtar bu mercekte gizli`);
    }
  }
  return parca.join(' · ');
}

/** Görev ve onay talebinin kayıt kodu yok; çekmece kimliği için kısa ve
    kararlı bir damga türetilir. */
function isKodu(i: Is): string {
  return `${i.tur === 'gorev' ? 'GRV' : 'ONY'}-${i.kayitId.slice(-6).toUpperCase()}`;
}

/** Anahtarın da kodu yok. Ön ek buraya YAZILMAZ: çekmece kimlik satırı
    tasarım gereği büyük harfe çevrilir, ön ek ise base64url'dür ve harf
    büyüklüğü anlam taşır — 'aBEX-mJ7' yerine 'ABEX-MJ7' göstermek yanlış
    bilgi olurdu. Ön ek doğru büyüklüğüyle alan listesinde durur. */
function anahtarKodu(a: Anahtar): string {
  return `ANH-${a.id.slice(-6).toUpperCase()}`;
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
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Kaynak</p>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
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
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Resmî kaynak</p>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            <a href={tanim.kaynakUrl} target="_blank" rel="noreferrer">{tanim.kaynakUrl}</a>
          </p>
        </div>
      )}

      <CekmeceEylemler
        birincil={yazabilir
          ? <Dugme tur="tam" onClick={duzenle}>Kaydı düzenle</Dugme>
          : undefined}
        ikincil={<TanimEylemleri tanim={tanim} onaylayabilir={onaylayabilir} />}
        dipNot={`Kod ${tanim.kod}`
          + (silinebilir(tanim) ? ' · bağı yok, silinebilir' : '')}
      />
    </>
  );
}

/* ── Çekmece · API anahtarı ─────────────────────────────────────────
   Tam token BURADA DA YOKTUR: kimlik olarak yalnız ön ek yazılır. Anahtar
   kaybedilirse gösterilecek bir şey kalmaz, yenisi üretilir. */

function AnahtarOzeti({ anahtar, simdi, yazabilir }: {
  anahtar: Anahtar; simdi: number; yazabilir: boolean;
}) {
  const im = anahtarImi(anahtar, simdi);
  const gun = kalanGun(anahtar.bitis, simdi);

  const cumle = anahtar.iptalZamani
    ? `${tarihTR(anahtar.iptalZamani)} tarihinde iptal edildi; istekleri 401 döner.`
    : anahtarBittiMi(anahtar, simdi)
      ? `Geçerlilik ${tarihTR(anahtar.bitis)} günü doldu; uzatılamaz, yenisi üretilir.`
      : !anahtar.sahipAktif
        ? 'Sahibi pasif: anahtar listede etkin görünür ama her istek 401 döner.'
        : gun !== null
          ? `Bitişine ${gun} gün kaldı.`
          : 'Süresiz — bitiş girilmedi, iptal edilene kadar geçerli.';

  return (
    <>
      <CekmeceKimlik durum={im} soz={anahtarSozu(anahtar, simdi)}
        baslik={anahtar.ad} cumle={cumle} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Ön ek', deger: `${anahtar.onEk}…` },
        { etiket: 'Sahip', deger: anahtar.sahip.ad,
          durum: anahtar.sahipAktif ? undefined : 'bd' },
        { etiket: 'Üreten', deger: anahtar.olusturan ?? 'kayıtta yok',
          durum: anahtar.olusturan ? undefined : 'unk' },
        // Renk verilmez: "kullanılmadı" bir alarm değil ölçülmüş bir olgu,
        // ayrıca --pl mavisi alan listesinde bağlantı gibi okunuyor.
        { etiket: 'Son kullanım', deger: sonKullanimMetni(anahtar) },
        { etiket: 'Bitiş', deger: anahtar.bitis ? tarihTR(anahtar.bitis) : 'süresiz' },
        { etiket: 'İstek', deger: istekMetni(anahtar) },
      ]} />

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Yetki</p>
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          Anahtar kendi yetkisini taşımaz: {anahtar.sahip.ad} adına çalışır ve
          onun rol/kapsam yetkileriyle sınırlıdır. Sahibin yetkisi daralınca
          anahtarınki de daralır; sahip pasifleşirse anahtar 401 döner.
        </p>
      </div>

      <CekmeceEylemler
        birincil={<ApiAnahtarIptal anahtar={anahtar} yazabilir={yazabilir} />}
        dipNot={`Üretim ${zamanTR(anahtar.olusturuldu)}`
          + ' · tam token yalnız üretim yanıtında bir kez gösterildi, saklanmadı'}
      />
    </>
  );
}

/* ── Kapsam kontrolü (SORUMLU ▾ / SANTRAL ▾ / KATALOG ▾ / SAHİP ▾) ────
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
      <summary className="ab-dugme"
        style={{ listStyle: 'none', cursor: 'pointer', display: 'inline-block' }}>
        {etiket}{secim ? ` · ${secim.ad}` : ''} <span aria-hidden>▾</span>
      </summary>
      <div style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 200,
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

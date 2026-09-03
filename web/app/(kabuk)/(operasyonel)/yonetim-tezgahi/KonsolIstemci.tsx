'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import { BosIlk, Dugme, type Durum } from '@/components/kabuk/temel';
import { EkranBasligi, KipDegistir } from '@/components/kabuk/ekran';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceEylemler } from '@/components/kabuk/panel';
import { zamanTR } from '@/lib/sabitler';
import {
  MODULLER, MODUL_SOZLUGU, kapsamaOzeti, modulAyarlari, type Modul, type Sinif, type Yer,
} from '@/lib/yonetim/moduller';
import { AYAR_SOZLUGU, GRUP_ETIKETI, GRUP_SIRASI, degerMetni, type AyarGrubu } from '@/lib/yapilandirma/tanimlar';
import {
  AyarCekmecesi, KayitCekmecesi, TalepCekmecesi, YeniKayitCekmecesi,
} from './KonsolFormlar';
import {
  EYLEM_ETIKET, HEDEF_VARLIK_TIPI, TALEP_DURUM_ETIKET, TALEP_DURUM_IMI,
  type IzKaydi, type KonsolVerisi, type Talep,
} from './konsolOrtak';

/* ═══ Yönetim konsolu — platformun yapılandırılabilir alanları TEK yerden ═══

   Bilgi mimarisi üç seviyedir ve üçü de adreste yaşar (paylaşılabilir):
     ?bolum=<grup>            9 grup + Onay kuyruğu + Değişiklik geçmişi
     &modul=<kod>             grubun bir modülü (kayıt listesi / ayar listesi)
     &sec=<id|yeni>           çekmece: kayıt, ayar, talep ya da iz

   Sınıf sözleşmesi ekranda SÖZCÜKLE yazılır (A doğrudan · B onaylı · C kodda);
   renk ya da rozet yok. Konsolun düğmeleri yetkiye göre gizlenir ama bu
   yetki DEĞİLDİR: her eylem sunucuda `yetkiZorunlu('yonetim', …)` kapısından
   geçer (lib/eylemler2/yonetim.ts). */

type Bolum = AyarGrubu | 'onay' | 'gecmis';
const BOLUMLER: readonly Bolum[] = [...GRUP_SIRASI, 'onay', 'gecmis'];

const SINIF_SOZU: Record<Sinif, string> = { A: 'A · doğrudan', B: 'B · onaylı', C: 'C · kodda' };
const YER_SOZU: Record<Yer, string> = {
  konsol: 'bu konsol', mevcut_ekran: 'mevcut ekran', eksik: 'henüz yönetilemez', kod: 'kod',
};

const MODUL_KOLONLARI: Kolon[] = [
  { baslik: 'Sınıf', genislik: '124px' },
  { baslik: 'Yönetim yeri', genislik: '124px' },
  { baslik: 'Kayıt', genislik: '72px', sag: true },
  { baslik: 'Açık talep', genislik: '88px', sag: true, ikincil: true },
];
const KAYIT_KOLONLARI: Kolon[] = [
  { baslik: 'Kod', genislik: '150px' },
  { baslik: 'Bağlı', genislik: '72px', sag: true },
  { baslik: 'Açık talep', genislik: '88px', sag: true, ikincil: true },
];
const AYAR_KOLONLARI: Kolon[] = [
  { baslik: 'Değer', genislik: '150px', sag: true },
  { baslik: 'Kaynak', genislik: '112px' },
  { baslik: 'Açık talep', genislik: '88px', sag: true, ikincil: true },
];
const TALEP_KOLONLARI: Kolon[] = [
  { baslik: 'Hedef', genislik: '160px' },
  { baslik: 'Talep eden', genislik: '140px' },
  { baslik: 'Açılış', genislik: '112px', sag: true, ikincil: true },
];
const IZ_KOLONLARI: Kolon[] = [
  { baslik: 'Varlık', genislik: '160px' },
  { baslik: 'Eylem', genislik: '100px' },
  { baslik: 'Kim', genislik: '140px', ikincil: true },
  { baslik: 'Zaman', genislik: '112px', sag: true },
];

const IZ_DURUMU: Record<string, Durum> = {
  silme: 'bd', pasife_alma: 'pl', red: 'bd', iptal: 'pl', onay: 'ok', olusturma: 'ok', guncelleme: 'ok',
};

export default function KonsolIstemci({ veri }: { veri: KonsolVerisi }) {
  const router = useRouter();
  const [bolum, setBolum] = useUrlDurumu<Bolum>('bolum', 'organizasyon', BOLUMLER);
  const [modulKod, setModulKod] = useUrlDurumuBos('modul');
  const [secili, setSecili] = useUrlDurumuBos('sec');
  const [arama, setArama] = useState('');
  const [talepMercek, setTalepMercek] = useState<'acik' | 'hepsi'>('acik');

  const kapsama = useMemo(() => kapsamaOzeti(), []);
  const acikTalepler = veri.talepler.filter((t) => t.durum === 'incelemede');
  const onayliTalepler = veri.talepler.filter((t) => t.durum === 'onaylandi');

  const modul: Modul | null = modulKod ? MODUL_SOZLUGU[modulKod] ?? null : null;
  const grupModulleri = useMemo(
    () => MODULLER.filter((m) => m.grup === bolum), [bolum]);

  function bolumeGec(b: Bolum) { setBolum(b); setModulKod(null); setSecili(null); setArama(''); }
  function moduleGir(kod: string | null) { setModulKod(kod); setSecili(null); setArama(''); }

  /* Açık talep sayısı: modül ya da kayıt bazında. */
  const acikTalepSayisi = (hedefTipi: string, hedefId?: string) =>
    veri.talepler.filter((t) => ['incelemede', 'onaylandi'].includes(t.durum)
      && t.hedefTipi === hedefTipi && (hedefId === undefined || t.hedefId === hedefId)).length;
  const modulTalepSayisi = (m: Modul) => {
    if (m.hedefTipi === 'ayar') return modulAyarlari(m.kod).reduce((s, a) => s + acikTalepSayisi('ayar', a), 0);
    if (m.hedefTipi) return acikTalepSayisi(m.hedefTipi);
    return 0;
  };
  const modulKayitSayisi = (m: Modul): number | null => {
    if (m.hedefTipi === 'ayar') return modulAyarlari(m.kod).length;
    if (m.hedefTipi) return veri.kayitlar[m.hedefTipi]?.length ?? null;
    if (m.kod === 'degisiklikTalepleri') return veri.talepler.length;
    return null;
  };

  /* ── Seviye 1: grubun modülleri ─────────────────────────────────────── */
  const modulSatirlari: Satir[] = grupModulleri.map((m) => {
    const acik = modulTalepSayisi(m);
    const kayit = modulKayitSayisi(m);
    return {
      id: m.kod,
      durum: m.yer === 'eksik' ? 'bd' : m.sinif === 'C' ? 'pl' : acik > 0 ? 'md' : 'ok',
      konu: m.ad,
      alt: m.aciklama,
      hucreler: [
        <span key="s" className="mono">{SINIF_SOZU[m.sinif]}</span>,
        <span key="y" className="mono">{YER_SOZU[m.yer]}</span>,
        <span key="k" className="mono">{kayit === null ? '—' : kayit}</span>,
        <span key="t" className="mono">{acik > 0 ? acik : '—'}</span>,
      ],
    };
  });

  /* ── Seviye 2: modülün kayıtları ya da ayarları ─────────────────────── */
  const aramaGecer = (metin: string) => !arama.trim() || metin.toLocaleLowerCase('tr').includes(arama.trim().toLocaleLowerCase('tr'));

  const kayitlar = modul?.hedefTipi && modul.hedefTipi !== 'ayar' ? veri.kayitlar[modul.hedefTipi] ?? [] : [];
  const kayitSatirlari: Satir[] = kayitlar
    .filter((k) => aramaGecer(`${k.kod} ${k.ad} ${k.alt}`))
    .map((k) => {
      const acik = modul?.hedefTipi ? acikTalepSayisi(modul.hedefTipi, k.id) : 0;
      return {
        id: k.id, durum: k.durum, konu: k.ad, alt: k.alt,
        hucreler: [
          <span key="k" className="mono">{k.kod}</span>,
          <span key="b" className="mono">{k.bagli === null ? '—' : k.bagli}</span>,
          <span key="t" className="mono">{acik > 0 ? acik : '—'}</span>,
        ],
      };
    });

  const ayarAnahtarlari = modul?.hedefTipi === 'ayar' ? modulAyarlari(modul.kod) : [];
  const ayarSatirlari: Satir[] = ayarAnahtarlari
    .map((a) => ({ tanim: AYAR_SOZLUGU[a], okuma: veri.ayarlar.find((x) => x.anahtar === a) }))
    .filter(({ tanim }) => aramaGecer(`${tanim.anahtar} ${tanim.etiket}`))
    .map(({ tanim, okuma }) => {
      const acik = acikTalepSayisi('ayar', tanim.anahtar);
      return {
        id: tanim.anahtar,
        durum: okuma?.kaynak === 'gecersiz_kayit' ? 'bd' : acik > 0 ? 'md' : 'ok',
        konu: tanim.etiket,
        alt: `${tanim.anahtar} · ${SINIF_SOZU[tanim.sinif]}`,
        hucreler: [
          <span key="d" className="mono">{okuma ? degerMetni(tanim, okuma.deger) : 'bilinmiyor'}</span>,
          <span key="k" className="mono">{okuma?.kaynak === 'yapilandirma' ? 'konsol' : okuma?.kaynak === 'gecersiz_kayit' ? 'geçersiz kayıt' : 'kod varsayılanı'}</span>,
          <span key="t" className="mono">{acik > 0 ? acik : '—'}</span>,
        ],
      };
    });

  /* ── Onay kuyruğu ───────────────────────────────────────────────────── */
  const talepListesi = (talepMercek === 'acik'
    ? veri.talepler.filter((t) => ['incelemede', 'onaylandi'].includes(t.durum))
    : veri.talepler).filter((t) => aramaGecer(`${t.hedefEtiket} ${t.talepEden.ad} ${t.gerekce}`));
  const talepSatirlari: Satir[] = talepListesi.map((t) => ({
    id: t.id, durum: TALEP_DURUM_IMI[t.durum],
    konu: t.hedefEtiket,
    alt: `${TALEP_DURUM_ETIKET[t.durum]} · ${t.gerekce.length > 90 ? `${t.gerekce.slice(0, 90)}…` : t.gerekce}`,
    hucreler: [
      <span key="h" className="mono">{MODULLER.find((m) => m.hedefTipi === t.hedefTipi)?.ad ?? t.hedefTipi}</span>,
      <span key="k">{t.talepEden.ad}</span>,
      <span key="z" className="mono">{zamanTR(t.olusturuldu)}</span>,
    ],
  }));

  /* ── Değişiklik geçmişi ─────────────────────────────────────────────── */
  const gecmisListesi = veri.gecmis.filter((g) => aramaGecer(`${g.varlikTipi} ${g.varlikId} ${g.eylem} ${g.aktor ?? ''} ${g.gerekce ?? ''}`));
  const izSatirlari: Satir[] = gecmisListesi.map((g) => ({
    id: g.id, durum: IZ_DURUMU[g.eylem] ?? 'ok',
    konu: izKonusu(g, veri),
    alt: g.gerekce ?? (g.alan ? `alan: ${g.alan}` : 'gerekçe yazılmadı'),
    hucreler: [
      <span key="v" className="mono">{g.varlikTipi}</span>,
      <span key="e" className="mono">{EYLEM_ETIKET[g.eylem] ?? g.eylem}</span>,
      <span key="k">{g.aktor ?? 'sistem'}</span>,
      <span key="z" className="mono">{zamanTR(g.zaman)}</span>,
    ],
  }));

  /* ── Seçili nesne çözümü (çekmece) ──────────────────────────────────── */
  const seciliModul: Modul | null = !modul && secili && bolum !== 'onay' && bolum !== 'gecmis' ? MODUL_SOZLUGU[secili] ?? null : null;
  const seciliKayit = modul && secili && secili !== 'yeni' ? kayitlar.find((k) => k.id === secili) ?? null : null;
  const seciliAyar = modul?.hedefTipi === 'ayar' && secili ? AYAR_SOZLUGU[secili] ?? null : null;
  const seciliTalep = bolum === 'onay' && secili ? veri.talepler.find((t) => t.id === secili) ?? null : null;
  const seciliIz = bolum === 'gecmis' && secili ? veri.gecmis.find((g) => g.id === secili) ?? null : null;
  const yeniAcik = modul?.hedefTipi && modul.hedefTipi !== 'ayar' && modul.hedefTipi !== 'tesisGorsel' && secili === 'yeni';

  useEffect(() => {
    /* Bozuk adres: seçili kayıt yoksa çekmece kapanır. */
    if (secili && !seciliModul && !seciliKayit && !seciliAyar && !seciliTalep && !seciliIz && !yeniAcik) setSecili(null);
  }, [secili, seciliModul, seciliKayit, seciliAyar, seciliTalep, seciliIz, yeniAcik, setSecili]);

  const kapat = () => setSecili(null);
  const tazele = () => router.refresh();

  const bolumSecenekleri = [
    { id: 'konsol', ad: 'Konsol' },
    { id: 'is', ad: 'İş kuyruğu' },
    { id: 'tanim', ad: 'Tanımlar' },
    { id: 'anahtar', ad: 'API anahtarları' },
  ];

  const gecmisIzleri = (varlikTipi: string, varlikId: string) =>
    veri.gecmis.filter((g) => g.varlikTipi === varlikTipi && g.varlikId === varlikId);

  return (
    <>
      <main data-yuzey="tezgah" data-alan="yonetim" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Yönetim konsolu · ${GRUP_SIRASI.length} grup · ${MODULLER.length} modül`}
          vurgu={`Kapsama ${kapsama.yonetilen}/${kapsama.ab}`}
          vurguDurumu={kapsama.eksik > 0 ? 'md' : 'ok'}
          baslik="Yapılandırılabilir alanlar tek konsoldan: doğrudan, onaylı ya da kodda"
          metrikler={[
            { deger: acikTalepler.length, yazi: 'İncelemede', durum: acikTalepler.length > 0 ? 'md' : undefined },
            { deger: onayliTalepler.length, yazi: 'Onaylı · uygulanmadı', durum: onayliTalepler.length > 0 ? 'md' : undefined },
            { deger: kapsama.eksik, yazi: 'Henüz yönetilemeyen', durum: kapsama.eksik > 0 ? 'bd' : undefined },
            { deger: kapsama.c, yazi: 'Kodda (C)', durum: 'pl' },
          ]}
        />

        <section className="ab-ekran-govde">
          <div style={{ marginTop: 'var(--s26)', display: 'flex', gap: 'var(--s16)', alignItems: 'center', flexWrap: 'wrap' }}>
            <KipDegistir secenekler={bolumSecenekleri} aktif="konsol"
              sec={(id) => { if (id !== 'konsol') router.push(`/yonetim-tezgahi?bolum=${id}`); }} />
            <span className="etiket">yönetim · sınıf A doğrudan · B onaylı · C kodda</span>
          </div>

          <div className="ab-konsol">
            <nav className="ab-konsol-dizin" aria-label="Yönetim grupları">
              <p className="etiket">Gruplar</p>
              {GRUP_SIRASI.map((g, i) => {
                const mods = MODULLER.filter((m) => m.grup === g);
                const eksik = mods.filter((m) => m.yer === 'eksik').length;
                const talep = mods.reduce((s, m) => s + modulTalepSayisi(m), 0);
                return (
                  <button key={g} type="button" className="ab-filtre" aria-pressed={bolum === g}
                    onClick={() => bolumeGec(g)}>
                    <span className="mono sira">{i + 1}</span>
                    <span className="ad">{GRUP_ETIKETI[g]}</span>
                    <span className={`mono sayi${eksik > 0 ? ' d-bd' : talep > 0 ? ' d-md' : ''}`}>
                      {mods.length}{talep > 0 ? ` · ${talep}` : ''}{eksik > 0 ? ' · eksik' : ''}
                    </span>
                  </button>
                );
              })}
              <p className="etiket" style={{ marginTop: 'var(--s12)' }}>Değişiklik modeli</p>
              <button type="button" className="ab-filtre" aria-pressed={bolum === 'onay'} onClick={() => bolumeGec('onay')}>
                <span className="mono sira">◇</span>
                <span className="ad">Onay kuyruğu</span>
                <span className={`mono sayi${acikTalepler.length + onayliTalepler.length > 0 ? ' d-md' : ''}`}>
                  {acikTalepler.length + onayliTalepler.length}
                </span>
              </button>
              <button type="button" className="ab-filtre" aria-pressed={bolum === 'gecmis'} onClick={() => bolumeGec('gecmis')}>
                <span className="mono sira">≡</span>
                <span className="ad">Değişiklik geçmişi</span>
                <span className="mono sayi">{veri.gecmis.length}</span>
              </button>
            </nav>

            <div className="ab-konsol-icerik">
              {bolum !== 'onay' && bolum !== 'gecmis' && !modul && (
                <>
                  <h2 className="ab-bolum-basligi">
                    <span className="mono" style={{ color: 'var(--i3)', marginRight: 'var(--s8)' }}>{GRUP_SIRASI.indexOf(bolum) + 1}</span>
                    {GRUP_ETIKETI[bolum]}
                  </h2>
                  <p className="ab-dip">
                    {grupModulleri.filter((m) => m.sinif !== 'C').length} yönetilebilir modül · {grupModulleri.filter((m) => m.sinif === 'C').length} kodda.
                    Bu konsolun kendi modülleri satıra tıklayınca açılır; mevcut ekranlar bağlantı verir; kodda kalanlar nedeniyle listelenir.
                  </p>
                  <Tablo kolonlar={MODUL_KOLONLARI} satirlar={modulSatirlari} konuBasligi="Modül"
                    secili={secili} sik
                    sec={(id) => {
                      const m = MODUL_SOZLUGU[id];
                      if (m?.yer === 'konsol' && m.hedefTipi) moduleGir(id);
                      else if (m?.kod === 'degisiklikTalepleri') bolumeGec('onay');
                      else setSecili((s) => (s === id ? null : id));
                    }} />
                </>
              )}

              {modul && (
                <>
                  <div className="ab-konsol-yol">
                    <button type="button" className="ab-dugme" onClick={() => moduleGir(null)}>‹ {GRUP_ETIKETI[bolum as AyarGrubu]}</button>
                    <h2 className="ab-bolum-basligi">{modul.ad}</h2>
                    <span className="mono etiket">{SINIF_SOZU[modul.sinif]}</span>
                  </div>
                  <p className="ab-dip">{modul.aciklama}</p>
                  <div className="ab-konsol-arac">
                    <input className="ab-gr" value={arama} onChange={(e) => setArama(e.target.value)}
                      placeholder="Kod, ad ya da açıklamada ara" aria-label="Kayıt ara" />
                    <span className="mono etiket">{modul.hedefTipi === 'ayar' ? ayarSatirlari.length : kayitSatirlari.length} kayıt</span>
                    {veri.izin.yazma && modul.hedefTipi && modul.hedefTipi !== 'ayar' && modul.hedefTipi !== 'tesisGorsel' && (
                      <Dugme tur="birincil" onClick={() => setSecili('yeni')}>
                        {modul.sinif === 'B' ? '+ Yeni (onaylı)' : '+ Yeni'}
                      </Dugme>
                    )}
                  </div>
                  {modul.hedefTipi === 'ayar' ? (
                    <Tablo kolonlar={AYAR_KOLONLARI} satirlar={ayarSatirlari} konuBasligi="Ayar" sik
                      secili={secili} sec={(id) => setSecili((s) => (s === id ? null : id))}
                      dipNot="Kaynak «kod varsayılanı»: konsolda kayıt yok, motor koddaki değeri okur. «geçersiz kayıt»: konsoldaki değer şemayı geçmiyor, motor varsayılana düşer." />
                  ) : kayitSatirlari.length === 0 ? (
                    <BosIlk cumle={arama ? 'Aramayla eşleşen kayıt yok.' : 'Bu katalogda kayıt yok.'} />
                  ) : (
                    <Tablo kolonlar={KAYIT_KOLONLARI} satirlar={kayitSatirlari} konuBasligi={modul.ad} sik
                      secili={secili} sec={(id) => setSecili((s) => (s === id ? null : id))} />
                  )}
                </>
              )}

              {bolum === 'onay' && (
                <>
                  <h2 className="ab-bolum-basligi">Onay kuyruğu</h2>
                  <p className="ab-dip">
                    Sınıf B değişiklikler: Kaydet → İncele → Onayla → Uygula. Talebi açan onaylayamaz (dört göz);
                    onaylanan talep uygulanana kadar motorlar eski değeri okur.
                  </p>
                  <div className="ab-konsol-arac">
                    <KipDegistir secenekler={[{ id: 'acik', ad: `Açık · ${acikTalepler.length + onayliTalepler.length}` }, { id: 'hepsi', ad: `Tümü · ${veri.talepler.length}` }]}
                      aktif={talepMercek} sec={(id) => setTalepMercek(id as 'acik' | 'hepsi')} />
                    <input className="ab-gr" value={arama} onChange={(e) => setArama(e.target.value)}
                      placeholder="Hedef, kişi ya da gerekçede ara" aria-label="Talep ara" />
                  </div>
                  {talepSatirlari.length === 0
                    ? <BosIlk cumle={talepMercek === 'acik' ? 'Açık talep yok.' : 'Talep kaydı yok.'} />
                    : <Tablo kolonlar={TALEP_KOLONLARI} satirlar={talepSatirlari} konuBasligi="Talep" sik
                      secili={secili} sec={(id) => setSecili((s) => (s === id ? null : id))} />}
                </>
              )}

              {bolum === 'gecmis' && (
                <>
                  <h2 className="ab-bolum-basligi">Değişiklik geçmişi</h2>
                  <p className="ab-dip">
                    Konsolun yönettiği varlıkların denetim izi (son {veri.gecmis.length} kayıt). İz değiştirilemez ve silinmez;
                    önce/sonra değerleri seçilen satırın çekmecesinde.
                  </p>
                  <div className="ab-konsol-arac">
                    <input className="ab-gr" value={arama} onChange={(e) => setArama(e.target.value)}
                      placeholder="Varlık, eylem, kişi ya da gerekçede ara" aria-label="İz ara" />
                  </div>
                  {izSatirlari.length === 0
                    ? <BosIlk cumle="Eşleşen iz yok." />
                    : <Tablo kolonlar={IZ_KOLONLARI} satirlar={izSatirlari} konuBasligi="Kayıt" sik
                      secili={secili} sec={(id) => setSecili((s) => (s === id ? null : id))} />}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {seciliModul && (
        <Cekmece kod={seciliModul.kod} kapat={kapat}>
          <CekmeceKimlik durum={seciliModul.yer === 'eksik' ? 'bd' : seciliModul.sinif === 'C' ? 'pl' : 'ok'}
            soz={`${SINIF_SOZU[seciliModul.sinif]} · ${YER_SOZU[seciliModul.yer]}`}
            baslik={seciliModul.ad} cumle={seciliModul.aciklama} />
          <CekmeceAlanlar alanlar={[
            { etiket: 'Grup', deger: GRUP_ETIKETI[seciliModul.grup] },
            { etiket: 'Sınıf', deger: SINIF_SOZU[seciliModul.sinif] },
            { etiket: 'Yönetim yeri', deger: YER_SOZU[seciliModul.yer] },
            ...(seciliModul.kodYeri ? [{ etiket: 'Kodun yeri', deger: <span className="mono">{seciliModul.kodYeri}</span> }] : []),
            ...(seciliModul.rota ? [{ etiket: 'Ekran', deger: <span className="mono">{seciliModul.rota}</span> }] : []),
          ]} />
          {seciliModul.neden && (
            <>
              <p className="etiket ab-panel-blokbas">{seciliModul.yer === 'eksik' ? 'Neden henüz yönetilemez' : 'Neden kodda kalır'}</p>
              <p className="ab-dip">{seciliModul.neden}</p>
            </>
          )}
          {seciliModul.etki && seciliModul.etki.length > 0 && (
            <>
              <p className="etiket ab-panel-blokbas">Değişiklik nereyi etkiler</p>
              <p className="ab-dip">{seciliModul.etki.join(' · ')}</p>
            </>
          )}
          <CekmeceEylemler
            birincil={seciliModul.rota
              ? <Dugme tur="birincil" onClick={() => router.push(seciliModul.rota!)}>Ekrana git →</Dugme>
              : undefined}
            dipNot={seciliModul.sinif === 'C'
              ? 'Kod yönetimli: değişiklik pull request ve sürüm notuyla gelir; konsoldan düzenlenmez.'
              : seciliModul.yer === 'eksik' ? 'Bu modül ADMIN COVERAGE paydasında sayılır, payda sayılmaz.' : undefined} />
        </Cekmece>
      )}

      {modul && yeniAcik && modul.hedefTipi && (
        <YeniKayitCekmecesi modul={modul} veri={veri} kapat={kapat} tazele={tazele} />
      )}

      {modul && seciliKayit && modul.hedefTipi && modul.hedefTipi !== 'ayar' && (
        <KayitCekmecesi modul={modul} kayit={seciliKayit} veri={veri} kapat={kapat} tazele={tazele}
          gecmis={gecmisIzleri(HEDEF_VARLIK_TIPI[modul.hedefTipi], seciliKayit.id)}
          acikTalepler={veri.talepler.filter((t) => t.hedefTipi === modul.hedefTipi && t.hedefId === seciliKayit.id && ['incelemede', 'onaylandi'].includes(t.durum))} />
      )}

      {seciliAyar && modul && (
        <AyarCekmecesi tanim={seciliAyar} okuma={veri.ayarlar.find((a) => a.anahtar === seciliAyar.anahtar) ?? null}
          veri={veri} kapat={kapat} tazele={tazele}
          gecmis={gecmisIzleri('Yapilandirma', seciliAyar.anahtar)}
          acikTalepler={veri.talepler.filter((t) => t.hedefTipi === 'ayar' && t.hedefId === seciliAyar.anahtar && ['incelemede', 'onaylandi'].includes(t.durum))} />
      )}

      {seciliTalep && (
        <TalepCekmecesi talep={seciliTalep} veri={veri} kapat={kapat} tazele={tazele}
          gecmis={gecmisIzleri('DegisiklikTalebi', seciliTalep.id)} />
      )}

      {seciliIz && (
        <Cekmece kod={seciliIz.id.slice(-8)} kapat={kapat}>
          <CekmeceKimlik durum={IZ_DURUMU[seciliIz.eylem] ?? 'ok'} soz={EYLEM_ETIKET[seciliIz.eylem] ?? seciliIz.eylem}
            baslik={izKonusu(seciliIz, veri)} cumle={seciliIz.gerekce ?? undefined} />
          <CekmeceAlanlar alanlar={[
            { etiket: 'Varlık', deger: <span className="mono">{seciliIz.varlikTipi} · {seciliIz.varlikId}</span> },
            { etiket: 'Kim', deger: seciliIz.aktor ?? 'sistem' },
            { etiket: 'Zaman', deger: <span className="mono">{zamanTR(seciliIz.zaman)}</span> },
            ...(seciliIz.alan ? [{ etiket: 'Alan', deger: <span className="mono">{seciliIz.alan}</span> }] : []),
          ]} />
          <p className="etiket ab-panel-blokbas">Önce → sonra</p>
          <pre className="ab-konsol-json">{jsonBicimle(seciliIz.once)}</pre>
          <pre className="ab-konsol-json">{jsonBicimle(seciliIz.sonra)}</pre>
          <CekmeceEylemler dipNot="Denetim izi değiştirilemez; bu kayıt yalnız okunur." />
        </Cekmece>
      )}
    </>
  );
}

/* İz satırının başlığı: kayıt adı çözülebiliyorsa ad, değilse kimlik. */
function izKonusu(g: IzKaydi, veri: KonsolVerisi): string {
  if (g.varlikTipi === 'Yapilandirma') return AYAR_SOZLUGU[g.varlikId]?.etiket ?? g.varlikId;
  if (g.varlikTipi === 'DegisiklikTalebi') {
    const t: Talep | undefined = veri.talepler.find((x) => x.id === g.varlikId);
    return t ? `Talep · ${t.hedefEtiket}` : `Talep · ${g.varlikId.slice(-8)}`;
  }
  const tip = Object.entries(HEDEF_VARLIK_TIPI).find(([, v]) => v === g.varlikTipi)?.[0];
  const kayit = tip ? veri.kayitlar[tip]?.find((k) => k.id === g.varlikId) : null;
  if (kayit) return `${kayit.kod} · ${kayit.ad}`;
  return `${g.varlikTipi} · ${g.varlikId.slice(-8)}`;
}

export function jsonBicimle(s: string | null): string {
  if (s === null || s === '') return '—';
  try { return JSON.stringify(JSON.parse(s), null, 1); } catch { return s; }
}

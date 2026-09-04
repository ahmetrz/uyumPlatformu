'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Im, Ipucu, Dugme, Alan, BosIlk, Hata, type Durum,
} from '@/components/kabuk/temel';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi, KapanisBandi, KipDegistir } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { ZamanCizelgesi, type ZamanKarti } from '@/components/kabuk/zaman';
import BaglamCubugu from '@/components/kabuk/BaglamCubugu';
import { useEylem } from '@/components/useEylem';

/** `useEylem.calistir` sözleşmesi — sunucu eylemlerinin ortak dönüşü. */
type Sonuc = { ok: true } | { ok: false; hata: string };
import { kokNedenKaydet, tekrarBagiKur } from '@/lib/eylemler2/kokNedenTekrar';
import {
  ANALIZ_ASGARI, ANALIZ_SINIFI, ANALIZ_SOZU, KOK_NEDEN_ETIKETI,
  KOK_NEDEN_KATEGORILERI, analizDurumu, analizZorunluMu, kapanisKapisi,
  type KokNedenKategorisi,
} from '@/lib/uyum/kokNeden';
import { KRONIK_ESIK, TEKRAR_KAYNAK_SOZU } from '@/lib/uyum/tekrarBulgu';
import { kapanisYolu } from '@/lib/uyum/kapanisYolu';
import {
  bulguGuncelle, aksiyonEkle, aksiyonDurumDegistir, aksiyonDogrula, kanitEkle,
} from '@/lib/eylemler';
import {
  ONEM_DERECELERI, ONEM_ETIKET, BULGU_DURUMLARI, BULGU_DURUM_ETIKET,
  AKSIYON_DURUMLARI, AKSIYON_ETIKET, KANIT_ESIK_VARSAYILAN, kanitTazelik, etiketle, eylemCumlesi, zamanTR, type KanitEsik,
} from '@/lib/sabitler';
import {
  aksiyonAcikMi, aksiyonDogrulamaHucresi, aksiyonImi, bugunAn, bulguImi,
  dogrulamaBekliyorMu, dogrulamaHucresi, gecikmeGunu,
  kisaTarih,
  surukleyenAksiyon,
  type AksiyonOzeti,
} from '../mantik';

/** Kayıt ekranındaki aksiyon: özet + görev ayrılığı için sorumlu kimliği. */
export type AksiyonKaydi = AksiyonOzeti & { sorumluId: string | null };

export type Veri = {
  id: string; maddeDurumuId: string; baslik: string; aciklama: string;
  durum: string; onem: string; kaynak: string | null; kokNeden: string | null;
  /* UY-26 · kategori ve analiz damgası — serbest metnin YANINDA. */
  kokNedenKategori: string | null;
  kokNedenAnalizEden: string | null;
  kokNedenAnalizZamani: string | null;
  /* UY-28 · tekrar bağı ve zincir. */
  tekrarBulguId: string | null;
  tekrarKaynagi: string | null;
  tekrarPenceresiGun: number | null;
  zincir: {
    uzunluk: number; kronik: boolean; ortalamaAralikGun: number | null;
    halkalar: {
      id: string; baslik: string; tespit: string; kapanma: string | null;
      durum: string; onem: string; buMu: boolean;
    }[];
  };
  tespit: string; hedef: string | null; kapanma: string | null;
  retestGerekli: boolean; retestSonucu: string | null;
  kapanisDogrulama: string | null; kapanisDogrulayan: string | null;
  sorumluId: string | null; sorumlu: string | null;
  /* C20 · sunucuda hesaplanan yetki bayrakları (bkz. veri.ts) */
  aktifKullaniciId: string; yazabilir: boolean; dogrulayabilir: boolean;
  madde: { kod: string; baslik: string; metin: string };
  tesis: { id: string; kod: string; ad: string; tip: string | null };
  surec: { id: string; kod: string; regKod: string };
  aksiyonlar: AksiyonKaydi[];
  projeler: { id: string; kod: string; ad: string }[];
  riskler: { id: string; kod: string; baslik: string }[];
  kanitlar: { id: string; ad: string; tip: string; baslangic: string }[];
  aktiviteler: {
    id: string; aktor: string; eylem: string; varlikTipi: string; alan: string | null;
    once: string | null; sonra: string | null; dosya: string | null; zaman: string;
  }[];
  kullanicilar: { id: string; ad: string }[];
};

const SOZ: Record<Durum, string> = {
  bd: 'Gecikmiş', md: 'Doğrulama bekliyor', ok: 'Zamanında',
  unk: 'Aksiyon yok', tamam: 'Kapandı', pl: 'Riski kabul edildi',
};

const KANIT_TIPLERI = ['politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor'];

export default function BulguDetayIstemci({ veri, esik = KANIT_ESIK_VARSAYILAN }: {
  veri: Veri;
  /** kanıt tazelik eşiği — sunucudan (`kanitEsikleri()`), Kanıt kütüphanesiyle aynı kaynak */
  esik?: KanitEsik;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [panel, setPanel] = useState(true);
  const [kip, setKip] = useState<'kayit' | 'iz'>('kayit');
  const [seciliAksiyon, setSeciliAksiyon] = useState<string | null>(null);
  const [aksiyonFormu, setAksiyonFormu] = useState(false);
  const [kanitFormu, setKanitFormu] = useState(false);
  /* Okuma hâli ile düzenleme hâli AYRI (§11): kayıt açılınca dört seçim
     kutusu birden gelmez. Kullanıcı çoğu zaman bakmaya gelmiştir. */
  const [duzenle, setDuzenle] = useState(false);
  const [analizAcik, setAnalizAcik] = useState(false);
  /* Şeritten bir adıma gidildiğinde o bloğa kaydırılır. Kaydırma
     render'dan SONRA olmalı (blok o an açılıyor olabilir), bu yüzden
     bir tetikleyici tutulur. Sayaç, aynı adıma ikinci kez tıklandığında
     da etkinin yeniden koşmasını sağlar — nesne kimliği değişir. */
  const [odak, setOdak] = useState<{ ad: string; kez: number } | null>(null);
  const [yeniAksiyon, setYeniAksiyon] = useState({ baslik: '', sorumluId: '', hedef: '' });
  const [yeniKanit, setYeniKanit] = useState({ ad: '', tip: 'kayit' });

  const im = bulguImi(veri);
  const gecikme = gecikmeGunu(veri);
  const dogrulama = dogrulamaHucresi(veri);
  const biten = veri.aksiyonlar.filter((a) => a.durum === 'tamamlandi').length;
  const acikAksiyon = veri.aksiyonlar.filter(aksiyonAcikMi).length;
  const aksiyon = veri.aksiyonlar.find((a) => a.id === seciliAksiyon) ?? null;

  /* KAPANIŞ YOLU — ekranın birincil işi budur ve cevabı `lib/uyum/
     kapanisYolu.ts` hesaplar. Kural orada tek yerdedir ve sunucu kapısı
     (`kapanisKapisi`) ile aynı fonksiyonu paylaşır: ekranın "hazır"
     deyip sunucunun reddetmesi mümkün değil. */
  const dogrulamaBekliyor = dogrulamaBekliyorMu(veri);
  const yol = useMemo(() => kapanisYolu({
    durum: veri.durum,
    onemDerecesi: veri.onem,
    tekrarMi: veri.tekrarBulguId !== null,
    analiz: {
      kategori: veri.kokNedenKategori,
      metin: veri.kokNeden,
      analizEdenId: veri.kokNedenAnalizEden,
      analizZamani: veri.kokNedenAnalizZamani ? Date.parse(veri.kokNedenAnalizZamani) : null,
    },
    aksiyonToplam: veri.aksiyonlar.length,
    aksiyonAcik: acikAksiyon,
    retestGerekli: veri.retestGerekli,
    retestSonucu: veri.retestSonucu,
    dogrulamaBekleyen: dogrulamaBekliyor,
    kapanisDogrulama: veri.kapanisDogrulama,
    tespit: veri.tespit,
    tarih: kisaTarih,
  }), [veri, acikAksiyon, dogrulamaBekliyor]);

  /* Şerit bir NAVİGATÖRDÜR: adıma tıklamak o adımın işine götürür. */
  function yolaGit(anahtar: string) {
    setPanel(true); setKip('kayit'); setSeciliAksiyon(null);
    if (anahtar === 'analiz') setAnalizAcik(true);
    if (anahtar === 'aksiyon' && veri.aksiyonlar.length === 0) setAksiyonFormu(true);
    if (anahtar === 'kapanis') setDuzenle(true);
    setOdak((o) => ({ ad: anahtar, kez: (o?.kez ?? 0) + 1 }));
  }

  useEffect(() => {
    if (!odak) return;
    document.getElementById(`yol-${odak.ad}`)?.scrollIntoView({ block: 'nearest' });
  }, [odak]);

  const kartlar = useMemo(() => zamanKartlari(veri), [veri]);

  const satirlar: Satir[] = veri.aksiyonlar.map((a) => ({
    id: a.id,
    durum: aksiyonImi(a),
    kenar: aksiyonImi(a),
    konu: a.baslik,
    alt: a.tamamlanma ? `bitti ${kisaTarih(a.tamamlanma)}`
      : a.hedef ? `hedef ${kisaTarih(a.hedef)}` : 'termin yok',
    hucreler: [
      a.sorumlu ?? <span key="s" style={{ color: 'var(--i3)' }}>—</span>,
      a.hedef ? kisaTarih(a.hedef) : <span key="h" style={{ color: 'var(--i3)' }}>—</span>,
      <DogrulamaHucresi key="d" hucre={aksiyonDogrulamaHucresi(a)} />,
    ],
  }));

  function guncelle(alan: 'durum' | 'onemDerecesi' | 'sorumluId' | 'hedefTarih', deger: string) {
    calistir(() => bulguGuncelle({
      id: veri.id,
      ...(alan === 'sorumluId' ? { sorumluId: deger || null } : { [alan]: deger }),
    }));
  }

  /* C20 · Kök neden ve retest, her tuşta değil kaydet düğmesiyle yazılır:
     serbest metin denetim izine satır satır düşmesin. Boş metin sunucuda
     null olur — "kayıt yok" ile "boş dize" ayrımı ekrana sızmaz. */
  function retestKaydet(deger: string) {
    calistir(() => bulguGuncelle({ id: veri.id, retestSonucu: deger }));
  }

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <BaglamCubugu
          kirintiler={[
            { ad: 'Bulgu & CAPA', yol: '/bulgular' },
            { ad: veri.tesis.kod, yol: `/tesisler/${veri.tesis.id}` },
            { ad: veri.madde.kod },
          ]}
          sag={
            <>
              <Link href={`/surecler/${veri.surec.id}`} className="ab-dugme satir">
                {veri.surec.regKod} · {veri.surec.kod} ▸
              </Link>
              {!panel && (
                <button type="button" className="ab-dugme satir" onClick={() => setPanel(true)}>
                  Kayıt paneli ▸
                </button>
              )}
            </>
          }
        />

        <EkranBasligi
          eyebrow={`${etiketle(veri.kaynak, 'Bulgu')} · tespit ${kisaTarih(veri.tespit)}`}
          vurgu={veri.tesis.ad}
          baslik={`— ${veri.baslik}`}
          /* "Aksiyon x/y" buradan KALKTI: kapanış şeridi aynı sayıyı
             hem taşıyor hem de ne yapılacağını söylüyor. İki yerde
             yazmak, ikinci yazının hiçbir yeni karar üretmemesi
             demekti. */
          metrikler={[
            {
              deger: gecikme !== null ? `+${gecikme} g` : veri.hedef ? kisaTarih(veri.hedef) : '—',
              yazi: 'Son tarih',
              durum: gecikme !== null ? 'bd' : undefined,
            },
            { deger: veri.kanitlar.length || '—', yazi: 'Bağlı kanıt' },
          ]}
        />

        <div style={{ padding: 'var(--s26) var(--gutter-op) 0', maxWidth: 900 }}>
          <KapanisBandi
            adimlar={yol.adimlar}
            sonraki={yol.sonraki}
            git={yolaGit}
            bittiCumlesi={yol.adimlar[yol.adimlar.length - 1].cumle}
            birincil={yol.sonraki && veri.yazabilir ? (
              <Dugme tur="birincil" onClick={() => yolaGit(yol.sonraki!.anahtar)}>
                {yol.sonraki.etiket}
              </Dugme>
            ) : undefined}
          />
        </div>

        {/* ── Modül 1 · aksiyon zinciri ─────────────────────────────── */}
        <section style={{ padding: 'var(--s30) var(--gutter-op) 0' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Aksiyonlar</p>
          {veri.aksiyonlar.length === 0 ? (
            <BosIlk
              cumle="Bu bulgu için aksiyon planlanmadı."
              eylem={<Dugme tur="birincil"
                onClick={() => { setPanel(true); setKip('kayit'); setSeciliAksiyon(null); setAksiyonFormu(true); }}>
                Aksiyon planla
              </Dugme>}
            />
          ) : (
            <Tablo
              sik
              kolonlar={[
                { baslik: 'Sahip', genislik: '150px', ikincil: true },
                { baslik: 'Hedef', genislik: '130px' },
                { baslik: 'Doğrulama', genislik: '140px' },
              ]}
              satirlar={satirlar}
              secili={seciliAksiyon}
              sec={(id) => { setSeciliAksiyon((o) => (o === id ? null : id)); setPanel(true); setKip('kayit'); }}
              dipNot="Satıra tıklayınca aksiyon paneli açılır."
            />
          )}
        </section>

      </main>

      {panel && (
        <Cekmece kod={`${veri.madde.kod} · ${veri.tesis.kod}`} kapat={() => setPanel(false)}>
          {aksiyon ? (
            <AksiyonPaneli
              aksiyon={aksiyon}
              bekliyor={bekliyor}
              hata={hata}
              yazabilir={veri.yazabilir}
              /* Görev ayrılığı satır bazlı: yetkisi olsa da sorumlu kendi
                 aksiyonunu doğrulayamaz. Sunucu aynı kuralı yeniden denetler. */
              dogrulayabilir={veri.dogrulayabilir && aksiyon.sorumluId !== veri.aktifKullaniciId}
              kendiAksiyonu={aksiyon.sorumluId === veri.aktifKullaniciId}
              geri={() => setSeciliAksiyon(null)}
              degistir={(durum, not) => calistir(
                () => aksiyonDurumDegistir({ id: aksiyon.id, durum, not }))}
              dogrula={(sonuc, not) => calistir(
                () => aksiyonDogrula({ id: aksiyon.id, sonuc, not }))}
            />
          ) : (
            <>
              <div className="ab-panel-blok">
                <KipDegistir
                  aktif={kip}
                  sec={(id) => setKip(id as 'kayit' | 'iz')}
                  secenekler={[
                    { id: 'kayit', ad: 'Kayıt' },
                    { id: 'iz', ad: `Denetim izi ${veri.aktiviteler.length}` },
                  ]}
                />
              </div>

              {kip === 'kayit' ? (
                <>
                  <div id="yol-tespit" />
                  <CekmeceKimlik
                    durum={im}
                    soz={im === 'bd' && gecikme !== null ? `${SOZ.bd} · ${gecikme} gün` : SOZ[im]}
                    baslik={veri.baslik}
                    cumle={veri.aciklama}
                  />

                  <CekmeceAlanlar alanlar={[
                    { etiket: 'Madde', deger: veri.madde.kod },
                    { etiket: 'Santral', deger: veri.tesis.ad },
                    { etiket: 'Kök neden', deger: veri.kokNeden ?? 'kayıt yok' },
                    { etiket: 'Retest', deger: veri.retestGerekli
                      ? (veri.retestSonucu ? 'Gerekli · sonuç girildi' : 'Gerekli · sonuç bekliyor')
                      : 'Gerekmiyor' },
                    { etiket: 'Doğrulama', deger: dogrulama.soz,
                      durum: dogrulama.im ?? undefined },
                    { etiket: 'Kapanış', deger: veri.kapanma ? kisaTarih(veri.kapanma) : '—' },
                  ]} />

                  {/* UY-26 · Kök neden analizi ve KAPANIŞ KAPISI. Kapı
                      ekranda da gösterilir ama asıl kapı sunucudadır
                      (`bulguGuncelle` aynı saf fonksiyonu çağırır). */}
                  <div id="yol-analiz">
                    <KokNedenBlogu veri={veri} bekliyor={bekliyor} calistir={calistir}
                      acik={analizAcik} ac={() => setAnalizAcik(true)} />
                  </div>

                  {/* UY-28 · Tekrar zinciri. */}
                  <TekrarBlogu veri={veri} bekliyor={bekliyor} calistir={calistir} />

                  {/* C20 · Retest — yazma yetkisi olana. Kök neden YUKARIDA,
                      tek yerde yazılır. */}
                  {veri.yazabilir && (
                    <RetestBlogu
                      key={veri.retestSonucu ?? ''}
                      retestGerekli={veri.retestGerekli}
                      retestSonucu={veri.retestSonucu}
                      bekliyor={bekliyor}
                      kaydet={retestKaydet}
                      retestDegistir={(g) => calistir(
                        () => bulguGuncelle({ id: veri.id, retestGerekli: g }))}
                    />
                  )}

                  {/* OKUMA ≠ DÜZENLEME (§11). Kayıt açılır açılmaz dört
                      seçim kutusu gelmez: kullanıcı çoğu zaman bakmaya
                      gelmiştir ve düzenleme yüzeyi okumanın önüne
                      geçmemeli. Şeritten "Kapanışa gönder" denince kip
                      kendiliğinden açılır — kullanıcı istediği anda
                      formu bulur. */}
                  <div className="ab-panel-blok" id="yol-kapanis"
                    style={{ marginTop: 'var(--s24)', display: 'grid', gap: 'var(--s14)' }}>
                    <div style={{ display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: 'var(--s12)' }}>
                      <p className="etiket" style={{ margin: 0 }}>Kayıt</p>
                      {veri.yazabilir && (
                        <Dugme tur="ikincil" onClick={() => setDuzenle((o) => !o)}
                          aria-expanded={duzenle}>
                          {duzenle ? 'Düzenlemeyi kapat' : 'Düzenle'}
                        </Dugme>
                      )}
                    </div>
                    {!duzenle && (
                      <dl className="ab-panel-ciftler">
                        <div>
                          <dt className="etiket">Durum</dt>
                          <dd className="deger">{BULGU_DURUM_ETIKET[
                            veri.durum as keyof typeof BULGU_DURUM_ETIKET] ?? veri.durum}</dd>
                        </div>
                        <div>
                          <dt className="etiket">Önem</dt>
                          <dd className="deger">{ONEM_ETIKET[
                            veri.onem as keyof typeof ONEM_ETIKET] ?? veri.onem}</dd>
                        </div>
                        <div>
                          <dt className="etiket">Sahip</dt>
                          <dd className="deger">{veri.sorumlu ?? 'atanmadı'}</dd>
                        </div>
                      </dl>
                    )}
                    {duzenle && (
                    <>
                    <Alan etiket="Durum">
                      <select className="ab-gr" value={veri.durum} disabled={bekliyor}
                        onChange={(e) => guncelle('durum', e.target.value)}>
                        {BULGU_DURUMLARI.map((d) => (
                          <option key={d} value={d}>{BULGU_DURUM_ETIKET[d]}</option>
                        ))}
                      </select>
                    </Alan>
                    <Alan etiket="Önem">
                      <select className="ab-gr" value={veri.onem} disabled={bekliyor}
                        onChange={(e) => guncelle('onemDerecesi', e.target.value)}>
                        {ONEM_DERECELERI.map((o) => (
                          <option key={o} value={o}>{ONEM_ETIKET[o]}</option>
                        ))}
                      </select>
                    </Alan>
                    <Alan etiket="Sahip">
                      <select className="ab-gr" value={veri.sorumluId ?? ''} disabled={bekliyor}
                        onChange={(e) => guncelle('sorumluId', e.target.value)}>
                        <option value="">Atanmadı</option>
                        {veri.kullanicilar.map((u) => (
                          <option key={u.id} value={u.id}>{u.ad}</option>
                        ))}
                      </select>
                    </Alan>
                    <Alan etiket="Son tarih">
                      <input className="ab-gr" type="date" disabled={bekliyor}
                        defaultValue={veri.hedef ? veri.hedef.slice(0, 10) : ''}
                        onChange={(e) => guncelle('hedefTarih', e.target.value)} />
                    </Alan>
                    </>
                    )}
                    {hata && <Hata cumle={hata} />}
                  </div>

                  {/* aksiyonEkle */}
                  <div className="ab-panel-blok" id="yol-aksiyon"
                    style={{ marginTop: 'var(--s24)' }}>
                    <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
                      Aksiyon · {biten}/{veri.aksiyonlar.length}
                    </p>
                    {aksiyonFormu ? (
                      <div style={{ display: 'grid', gap: 'var(--s12)' }}>
                        <Alan etiket="Başlık" zorunlu>
                          <input className="ab-gr" value={yeniAksiyon.baslik} disabled={bekliyor}
                            placeholder="Ne yapılacak?"
                            onChange={(e) => setYeniAksiyon({ ...yeniAksiyon, baslik: e.target.value })} />
                        </Alan>
                        <Alan etiket="Sahip">
                          <select className="ab-gr" value={yeniAksiyon.sorumluId} disabled={bekliyor}
                            onChange={(e) => setYeniAksiyon({ ...yeniAksiyon, sorumluId: e.target.value })}>
                            <option value="">Atanmadı</option>
                            {veri.kullanicilar.map((u) => (
                              <option key={u.id} value={u.id}>{u.ad}</option>
                            ))}
                          </select>
                        </Alan>
                        <Alan etiket="Hedef">
                          <input className="ab-gr" type="date" value={yeniAksiyon.hedef} disabled={bekliyor}
                            onChange={(e) => setYeniAksiyon({ ...yeniAksiyon, hedef: e.target.value })} />
                        </Alan>
                        <div style={{ display: 'flex', gap: 'var(--s12)' }}>
                          <Dugme tur="birincil" disabled={bekliyor}
                            onClick={() => calistir(
                              () => aksiyonEkle({
                                bulguId: veri.id,
                                baslik: yeniAksiyon.baslik,
                                sorumluId: yeniAksiyon.sorumluId || null,
                                hedef: yeniAksiyon.hedef || null,
                              }),
                              () => {
                                setAksiyonFormu(false);
                                setYeniAksiyon({ baslik: '', sorumluId: '', hedef: '' });
                              },
                            )}>
                            Ekle
                          </Dugme>
                          <Dugme tur="ikincil" onClick={() => setAksiyonFormu(false)}>Vazgeç</Dugme>
                        </div>
                      </div>
                    ) : (
                      <Dugme tur="tam" onClick={() => setAksiyonFormu(true)}>Aksiyon planla</Dugme>
                    )}
                  </div>

                  {/* kanitEkle */}
                  <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
                    <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Kanıt</p>
                    <div style={{ display: 'grid', gap: 'var(--s8)' }}>
                      {veri.kanitlar.length === 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s8)',
                          fontSize: 'var(--t-field)', color: 'var(--i3)' }}>
                          <Im durum="unk" ad="Kanıt bağlanmadı" />bağlı kanıt yok
                        </span>
                      )}
                      {veri.kanitlar.map((k) => {
                        const taze = kanitTazelik(new Date(k.baslangic), esik);
                        return (
                          <span key={k.id} style={{ display: 'flex', alignItems: 'center',
                            gap: 'var(--s8)', fontSize: 'var(--t-field)' }}>
                            <Im durum={taze.durum === 'uyumlu' ? 'ok'
                              : taze.durum === 'kismi' ? 'md' : 'unk'}
                              ad={`${etiketle(k.tip)} · ${taze.gun} gün önce`} />
                            <span style={{ minWidth: 0, overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.ad}</span>
                            <span style={{ marginLeft: 'auto', fontFamily: 'var(--veri)',
                              fontSize: 'var(--t-label)', color: 'var(--i3)' }}>{taze.gun} g</span>
                          </span>
                        );
                      })}
                    </div>
                    {kanitFormu ? (
                      <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s14)' }}>
                        <Alan etiket="Kanıt adı" zorunlu>
                          <input className="ab-gr" value={yeniKanit.ad} disabled={bekliyor}
                            onChange={(e) => setYeniKanit({ ...yeniKanit, ad: e.target.value })} />
                        </Alan>
                        <Alan etiket="Tip">
                          <select className="ab-gr" value={yeniKanit.tip} disabled={bekliyor}
                            onChange={(e) => setYeniKanit({ ...yeniKanit, tip: e.target.value })}>
                            {KANIT_TIPLERI.map((t) => (
                              <option key={t} value={t}>{etiketle(t)}</option>
                            ))}
                          </select>
                        </Alan>
                        <div style={{ display: 'flex', gap: 'var(--s12)' }}>
                          <Dugme tur="birincil" disabled={bekliyor}
                            onClick={() => calistir(
                              () => kanitEkle({
                                maddeDurumuId: veri.maddeDurumuId,
                                ad: yeniKanit.ad,
                                tip: yeniKanit.tip,
                              }),
                              () => { setKanitFormu(false); setYeniKanit({ ad: '', tip: 'kayit' }); },
                            )}>
                            Bağla
                          </Dugme>
                          <Dugme tur="ikincil" onClick={() => setKanitFormu(false)}>Vazgeç</Dugme>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 'var(--s12)' }}>
                        <Dugme tur="ikincil" onClick={() => setKanitFormu(true)}>Kanıt bağla</Dugme>
                      </div>
                    )}
                  </div>

                  {(veri.projeler.length > 0 || veri.riskler.length > 0) && (
                    <CekmeceBagli kayitlar={[
                      ...veri.riskler.map((r) => ({
                        id: r.id, kod: r.kod, alt: r.baslik, yol: '/riskler',
                      })),
                      ...veri.projeler.map((p) => ({
                        id: p.id, kod: p.kod, alt: p.ad, yol: '/projeler', suren: true,
                      })),
                    ]} />
                  )}

                  <CekmeceEylemler dipNot="Kapatma, açık aksiyon kalmadığında ve doğrulama yetkisiyle yapılır; her değişiklik denetim izine yazılır." />
                </>
              ) : (
                /* GEÇMİŞ TEK YERDE (§12). Zaman ekseni buraya taşındı:
                   ana yüzeyde 362px yer kaplıyor ve karar yüzeyini
                   aşağı itiyordu. Sıra, sıradaki kararı doğrudan
                   etkilemiyorsa kanıt katmanına aittir. */
                <>
                  {kartlar.kartlar.length > 1 && (
                    <div className="ab-panel-blok" style={{ marginBottom: 'var(--s20)' }}>
                      <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Zaman ekseni</p>
                      <ZamanCizelgesi
                        donemler={kartlar.donemler}
                        kartlar={kartlar.kartlar}
                        bugun={kartlar.bugun}
                        tikla={(id) => {
                          if (veri.aksiyonlar.some((a) => a.id === id)) {
                            setSeciliAksiyon(id); setPanel(true); setKip('kayit');
                          }
                        }}
                      />
                    </div>
                  )}
                  <DenetimIzi kayitlar={veri.aktiviteler} />
                </>
              )}
            </>
          )}
        </Cekmece>
      )}
    </>
  );
}

/* İşaretçi doğrulamanın durumunu taşır; metin yalnız kanıt olgusunu yazar
   — durum sözcüğü canvasta tekrarlanmaz (06 §A2). */
function DogrulamaHucresi({ hucre }: { hucre: ReturnType<typeof aksiyonDogrulamaHucresi> }) {
  if (!hucre.im) return <span style={{ color: 'var(--i3)' }}>—</span>;
  const govde = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--s10)', minWidth: 0 }}>
      <Im durum={hucre.im} ad={hucre.ad} />
      {hucre.olgu && <span style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hucre.olgu}</span>}
    </span>
  );
  return hucre.kanit ? <Ipucu metin={hucre.kanit} genis>{govde}</Ipucu> : govde;
}

/* ── Retest bloğu ────────────────────────────────────────────────────
   BURADA BİR ZAMANLAR İKİNCİ BİR KÖK NEDEN FORMU VARDI ve aynı alana
   `KokNedenBlogu`dan farklı bir yoldan yazıyordu: kategori istemeden,
   asgari uzunluk aramadan, imza bırakmadan. Yani kapanış kapısının
   REDDETTİĞİ hâli (`kategorisiz` · `metinsiz` · `imzasiz`) tam olarak
   bu form üretebiliyordu. Kullanıcı kaydediyor, ekran
   kaydediyor, kapı yine "analiz yok" diyordu.

   Aynı gerçeği iki yerden yazdırmak bir kolaylık değil, bir çelişki
   üreticisidir. Kök neden tek yerde yazılır: `KokNedenBlogu`. Burada
   yalnız retest kalır. */

function RetestBlogu({
  retestGerekli, retestSonucu, bekliyor, kaydet, retestDegistir,
}: {
  retestGerekli: boolean; retestSonucu: string | null;
  bekliyor: boolean;
  kaydet: (deger: string) => void;
  retestDegistir: (gerekli: boolean) => void;
}) {
  const [sonuc, setSonuc] = useState(retestSonucu ?? '');
  const sonucDegisti = sonuc.trim() !== (retestSonucu ?? '');
  return (
    <div className="ab-panel-blok" id="yol-dogrulama"
      style={{ marginTop: 'var(--s24)', display: 'grid', gap: 'var(--s14)' }}>
      <p className="etiket" style={{ margin: 0 }}>Retest</p>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s8)',
        fontSize: 'var(--t-field)' }}>
        <input className="ab-gr" type="checkbox" checked={retestGerekli} disabled={bekliyor}
          onChange={(e) => retestDegistir(e.target.checked)} />
        Retest gerekli
      </label>
      {retestGerekli && (
        <>
          <Alan etiket="Retest sonucu">
            <textarea className="ab-gr" value={sonuc} disabled={bekliyor}
              placeholder="Yeniden test edildi mi, ne bulundu?"
              onChange={(e) => setSonuc(e.target.value)} />
          </Alan>
          <div style={{ display: 'flex', gap: 'var(--s12)' }}>
            <Dugme tur="birincil" disabled={bekliyor || !sonucDegisti}
              onClick={() => kaydet(sonuc)}>
              Retest sonucunu kaydet
            </Dugme>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Aksiyon paneli ─────────────────────────────────────────────────── */

function AksiyonPaneli({
  aksiyon, bekliyor, hata, yazabilir, dogrulayabilir, kendiAksiyonu, geri, degistir, dogrula,
}: {
  aksiyon: AksiyonKaydi; bekliyor: boolean; hata: string | null;
  yazabilir: boolean; dogrulayabilir: boolean; kendiAksiyonu: boolean;
  geri: () => void;
  degistir: (durum: string, not?: string) => void;
  dogrula: (sonuc: 'etkin' | 'etkisiz', not: string | null) => void;
}) {
  const im = aksiyonImi(aksiyon);
  const dogrulamaH = aksiyonDogrulamaHucresi(aksiyon);
  /* 'tamamlandi' seçimi hemen yazılmaz: önce tamamlama notu istenir.
     Diğer geçişler eskisi gibi anında gider. */
  const [tamamlamaFormu, setTamamlamaFormu] = useState(false);
  const [tamamlamaNotu, setTamamlamaNotu] = useState('');
  const [dogrulamaFormu, setDogrulamaFormu] = useState<'etkin' | 'etkisiz' | null>(null);
  const [dogrulamaNotu, setDogrulamaNotu] = useState('');

  const dogrulanabilir = aksiyon.durum === 'tamamlandi'
    && aksiyon.dogrulama !== 'dogrulandi';

  return (
    <>
      <div className="ab-panel-blok">
        <button type="button" className="ab-dugme satir" onClick={geri}>◂ Bulgu kaydı</button>
      </div>
      <CekmeceKimlik
        durum={im}
        soz={AKSIYON_ETIKET[aksiyon.durum as keyof typeof AKSIYON_ETIKET] ?? etiketle(aksiyon.durum)}
        baslik={aksiyon.baslik}
        cumle={aksiyon.not ?? undefined}
      />
      <CekmeceAlanlar alanlar={[
        { etiket: 'Sahip', deger: aksiyon.sorumlu ?? '—' },
        { etiket: 'Hedef', deger: aksiyon.hedef ? kisaTarih(aksiyon.hedef) : '—',
          durum: im === 'bd' ? 'bd' : undefined },
        { etiket: 'Tamamlanma', deger: aksiyon.tamamlanma ? kisaTarih(aksiyon.tamamlanma) : '—' },
        /* Durum sözcük + işaretçi birlikte: renk tek başına anlam taşımaz. */
        { etiket: 'Doğrulama', deger: dogrulamaH.soz, durum: dogrulamaH.im ?? undefined },
        { etiket: 'Doğrulayan', deger: aksiyon.dogrulayan
          ? `${aksiyon.dogrulayan}${aksiyon.dogrulamaTarihi ? ` · ${kisaTarih(aksiyon.dogrulamaTarihi)}` : ''}`
          : '—' },
      ]} />

      {yazabilir && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)', display: 'grid', gap: 'var(--s12)' }}>
          <Alan etiket="Aksiyon durumu">
            <select className="ab-gr" value={tamamlamaFormu ? 'tamamlandi' : aksiyon.durum}
              disabled={bekliyor}
              onChange={(e) => {
                const d = e.target.value;
                if (d === 'tamamlandi' && aksiyon.durum !== 'tamamlandi') {
                  setTamamlamaFormu(true);
                  return;
                }
                setTamamlamaFormu(false);
                // Not verilmez: sunucu eski tamamlama/doğrulama notunu korur.
                degistir(d);
              }}>
              {AKSIYON_DURUMLARI.map((d) => (
                <option key={d} value={d}>{AKSIYON_ETIKET[d]}</option>
              ))}
            </select>
          </Alan>
          {tamamlamaFormu && (
            <>
              <Alan etiket="Tamamlama notu" zorunlu>
                <textarea className="ab-gr" value={tamamlamaNotu} disabled={bekliyor}
                  placeholder="Ne yapıldı? Doğrulayan bu nota bakacak."
                  onChange={(e) => setTamamlamaNotu(e.target.value)} />
              </Alan>
              <div style={{ display: 'flex', gap: 'var(--s12)' }}>
                <Dugme tur="birincil" disabled={bekliyor || !tamamlamaNotu.trim()}
                  onClick={() => degistir('tamamlandi', tamamlamaNotu)}>
                  Tamamlandı olarak kaydet
                </Dugme>
                <Dugme tur="ikincil" onClick={() => { setTamamlamaFormu(false); setTamamlamaNotu(''); }}>
                  Vazgeç
                </Dugme>
              </div>
            </>
          )}
        </div>
      )}

      {/* C20 · Doğrulama — yalnız tamamlanmış aksiyon, yalnız yetkili, sorumlu hariç */}
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)', display: 'grid', gap: 'var(--s12)' }}>
        <p className="etiket" style={{ margin: 0 }}>Doğrulama</p>
        {!dogrulanabilir ? (
          <span style={{ fontSize: 'var(--t-field)', color: 'var(--i3)' }}>
            {aksiyon.dogrulama === 'dogrulandi'
              ? 'Doğrulandı; yeniden doğrulama gerekmez.'
              : 'Doğrulama, aksiyon tamamlandığında yapılır.'}
          </span>
        ) : !dogrulayabilir ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s8)',
            fontSize: 'var(--t-field)', color: 'var(--i3)' }}>
            <Im durum="unk" ad="Doğrulama yetkisi yok" />
            {kendiAksiyonu
              ? 'Görev ayrılığı: kendi aksiyonunuzu doğrulayamazsınız.'
              : 'Doğrulama için uyum onay yetkisi gerekir.'}
          </span>
        ) : dogrulamaFormu ? (
          <>
            <Alan etiket={dogrulamaFormu === 'etkin' ? 'Doğrulama notu' : 'Gerekçe'}
              zorunlu={dogrulamaFormu === 'etkisiz'}>
              <textarea className="ab-gr" value={dogrulamaNotu} disabled={bekliyor}
                placeholder={dogrulamaFormu === 'etkin'
                  ? 'Nasıl doğrulandı? (retest, kanıt, gözlem)'
                  : 'Neden etkisiz? Sorumluya geri dönecek.'}
                onChange={(e) => setDogrulamaNotu(e.target.value)} />
            </Alan>
            <div style={{ display: 'flex', gap: 'var(--s12)' }}>
              <Dugme tur="birincil"
                disabled={bekliyor || (dogrulamaFormu === 'etkisiz' && !dogrulamaNotu.trim())}
                onClick={() => dogrula(dogrulamaFormu, dogrulamaNotu || null)}>
                {dogrulamaFormu === 'etkin' ? 'Etkin · doğrula' : 'Etkisiz · reddet'}
              </Dugme>
              <Dugme tur="ikincil" onClick={() => { setDogrulamaFormu(null); setDogrulamaNotu(''); }}>
                Vazgeç
              </Dugme>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 'var(--s12)' }}>
            <Dugme tur="birincil" disabled={bekliyor} onClick={() => setDogrulamaFormu('etkin')}>
              Doğrula · etkin
            </Dugme>
            <Dugme tur="ikincil" disabled={bekliyor} onClick={() => setDogrulamaFormu('etkisiz')}>
              Etkisiz
            </Dugme>
          </div>
        )}
        {hata && <Hata cumle={hata} />}
      </div>
      <CekmeceEylemler dipNot="Durum değişikliği ve doğrulama aktör ve zaman damgasıyla denetim izine yazılır. Sorumlu kendi aksiyonunu doğrulayamaz." />
    </>
  );
}

/* ── Denetim izi ────────────────────────────────────────────────────── */

function DenetimIzi({ kayitlar }: { kayitlar: Veri['aktiviteler'] }) {
  if (kayitlar.length === 0) {
    return (
      <div className="ab-panel-blok">
        <p style={{ margin: 0, fontFamily: 'var(--veri)', fontSize: 'var(--t-label)',
          color: 'var(--i3)' }}>Kayıt yok</p>
      </div>
    );
  }
  return (
    <div className="ab-panel-blok" style={{ display: 'grid', gap: 'var(--s14)' }}>
      {kayitlar.map((k) => (
        <div key={k.id} style={{ display: 'grid', gap: 2,
          borderLeft: 'var(--bw-edge) solid var(--hr2)', paddingLeft: 'var(--s12)' }}>
          <span style={{ fontSize: 'var(--t-field)' }}>
            <b style={{ fontWeight: 600 }}>{k.aktor}</b>{' '}
            {eylemCumlesi(k.eylem, k.varlikTipi === 'Bulgu' ? null : k.varlikTipi, k.alan)}
          </span>
          <span style={{ fontFamily: 'var(--veri)', fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
            {zamanTR(k.zaman)}
            {(k.once || k.sonra) && ` · ${etiketle(k.once, '—')} → ${etiketle(k.sonra, '—')}`}
            {k.dosya && ` · ${k.dosya}`}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Zaman ekseni: bulgu → aksiyonlar → doğrulama/kapanış ───────────── */

const AY_KISA = new Intl.DateTimeFormat('tr-TR', { month: 'short' });

function zamanKartlari(veri: Veri): {
  donemler: { ad: string; konum: number }[]; kartlar: ZamanKarti[]; bugun: number | undefined;
} {
  type Ham = { id: string; ad: string; kapsam: string; durum: Durum; an: number };

  /* Eksen üç kilometre taşı taşır — bulgu → aksiyon → doğrulama. Aksiyonların
     tamamı zaten üstteki tabloda; burada ilerlemenin yayı okunur. Kart 208px
     olduğu için ikiden fazla ara nokta bu genişlikte üst üste biner. */
  const ham: Ham[] = [{
    id: 'tespit', ad: 'Bulgu tespit edildi',
    kapsam: `${etiketle(veri.kaynak, 'Bulgu')} · ${veri.madde.kod}`,
    durum: 'tamam', an: new Date(veri.tespit).getTime(),
  }];

  const suruyor = surukleyenAksiyon(veri);
  const aksiyonAni = suruyor ? (suruyor.tamamlanma ?? suruyor.hedef) : null;
  if (suruyor && aksiyonAni) {
    const kalan = veri.aksiyonlar.length - 1;
    ham.push({
      id: suruyor.id, ad: suruyor.baslik,
      kapsam: [suruyor.sorumlu, kalan > 0 ? `+${kalan} aksiyon` : null]
        .filter(Boolean).join(' · ') || veri.madde.kod,
      durum: aksiyonImi(suruyor), an: new Date(aksiyonAni).getTime(),
    });
  }

  if (veri.kapanma) {
    ham.push({
      id: 'kapanis', ad: 'Kapanış doğrulaması',
      kapsam: veri.kapanisDogrulayan ?? 'doğrulayan kaydı yok',
      durum: 'ok', an: new Date(veri.kapanma).getTime(),
    });
  } else if (veri.hedef) {
    ham.push({
      id: 'kapanis', ad: 'Bulgu son tarihi',
      kapsam: veri.sorumlu ?? 'sahip atanmadı',
      durum: gecikmeGunu(veri) !== null ? 'bd' : 'pl',
      an: new Date(veri.hedef).getTime(),
    });
  }

  ham.sort((x, y) => x.an - y.an);
  const simdi = bugunAn();
  const enKucuk = Math.min(ham[0].an, simdi);
  const enBuyuk = Math.max(ham[ham.length - 1].an, simdi);
  const acikGenislik = Math.max(enBuyuk - enKucuk, 86_400_000);
  const oran = (t: number) => 0.02 + ((t - enKucuk) / acikGenislik) * 0.68;

  /* Kart genişliği eksenin ~%32'si; sıralama korunarak asgari aralık dayatılır,
     sonra son kart 0.70'e çekilerek hepsi tuvale sığdırılır. Bu bir YERLEŞİM
     düzeltmesidir — kart üzerindeki tarih etiketi gerçek tarihi söyler. */
  const ARALIK = 0.34;
  let onceki = -1;
  const konumlar = ham.map((h) => {
    const k = Math.max(oran(h.an), onceki + ARALIK);
    onceki = k;
    return k;
  });
  const tasma = Math.max(0, (konumlar[konumlar.length - 1] ?? 0) - 0.70);
  const kartlar: ZamanKarti[] = ham.map((h, i) => ({
    id: h.id, ad: h.ad, kapsam: h.kapsam, durum: h.durum,
    konum: Math.max(0.02, konumlar[i] - tasma),
    geri: gunEtiketi(h.an, simdi),
  }));

  const donemler = [0, 0.25, 0.5, 0.75, 1]
    .map((p) => ({
      ad: AY_KISA.format(new Date(enKucuk + acikGenislik * p)),
      konum: 0.02 + p * 0.68,
    }))
    .filter((d, i, hepsi) => i === 0 || d.ad !== hepsi[i - 1].ad);

  return { donemler, kartlar, bugun: oran(simdi) };
}

function gunEtiketi(an: number, simdi: number): string {
  const gun = Math.round((an - simdi) / 86_400_000);
  if (gun === 0) return 'bugün';
  return gun > 0 ? `${gun}g` : `−${Math.abs(gun)}g`;
}

/* ═══ UY-26 · Kök neden analizi ══════════════════════════════════════

   Serbest metin (`kokNeden`) ile KATEGORİ birlikte yaşar ve biri
   ötekinin yerine geçmez: kategori sayılır ("aynı kök neden kaç
   bulguda tekrarlıyor"), metin anlatır.

   Analizi KİMİN, NE ZAMAN yaptığı ekranda görünür. Damgasız bir analiz
   `imzasiz` sayılır ve bu bir kusurdur — "bunu kim yazdı" sorusuna
   cevap veremeyen bir analiz denetimde bir görüştür.

   KAPANIŞ KAPISI burada da gösterilir. Bu bir GÖRÜNÜM kararıdır: asıl
   kapı `lib/eylemler.ts → bulguGuncelle` içindedir ve AYNI saf
   fonksiyonu (`kapanisKapisi`) çağırır. Ekranın kapıyı önceden
   göstermesi, kullanıcının reddedilecek bir düğmeye basmasını önler. */

function KokNedenBlogu({ veri, bekliyor, calistir, acik, ac }: {
  veri: Veri;
  bekliyor: boolean;
  calistir: (is: () => Promise<Sonuc>) => void;
  /* Form varsayılan olarak KAPALI: kayıt açılır açılmaz boş bir kategori
     kutusu ve boş bir metin alanı görmek, bakmaya gelen kullanıcıya
     doldurulmamış bir form göstermektir. Şeritteki "Kök neden" adımına
     tıklamak burayı açar. */
  acik: boolean;
  ac: () => void;
}) {
  const [kategori, setKategori] = useState(veri.kokNedenKategori ?? '');
  const [metin, setMetin] = useState(veri.kokNeden ?? '');

  const tekrarMi = veri.tekrarBulguId !== null;
  const analiz = {
    kategori: veri.kokNedenKategori,
    metin: veri.kokNeden,
    analizEdenId: veri.kokNedenAnalizEden === null ? null : 'var',
    analizZamani: veri.kokNedenAnalizZamani === null
      ? null : Date.parse(veri.kokNedenAnalizZamani),
  };
  const durum = analizDurumu(analiz);
  const zorunlu = analizZorunluMu({ onemDerecesi: veri.onem, tekrarMi });
  const acikAksiyon = veri.aksiyonlar.filter(
    (a) => a.durum === 'planlandi' || a.durum === 'devam').length;
  const kapi = kapanisKapisi({
    onemDerecesi: veri.onem, tekrarMi, analiz, acikAksiyon,
  });

  return (
    <section className="ab-panel-blok" style={{ marginTop: 'var(--s24)',
      display: 'grid', gap: 'var(--s12)' }}>
      <p className="etiket" style={{ margin: 0 }}>Kök neden analizi</p>

      <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
        alignItems: 'start', gap: 'var(--s8)' }}>
        <span style={{ paddingTop: 3 }}>
          <Im durum={ANALIZ_SINIFI[durum]} ad={ANALIZ_SOZU[durum]} />
        </span>
        <div style={{ display: 'grid', gap: 'var(--s4)' }}>
          <span style={{ fontSize: 'var(--t-field)' }}>{ANALIZ_SOZU[durum]}</span>
          {veri.kokNedenKategori && (
            <span style={{ fontSize: 'var(--t-label)', color: 'var(--i2)' }}>
              {KOK_NEDEN_ETIKETI[veri.kokNedenKategori as KokNedenKategorisi]
                ?? veri.kokNedenKategori}
            </span>
          )}
          <span className="mono" style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
            {veri.kokNedenAnalizEden && veri.kokNedenAnalizZamani
              ? `${veri.kokNedenAnalizEden} · ${kisaTarih(veri.kokNedenAnalizZamani)}`
              : 'analizi kimin, ne zaman yaptığı kayıtlı değil'}
          </span>
          <span style={{ fontSize: 'var(--t-label)',
            color: zorunlu ? 'var(--md)' : 'var(--i3)' }}>
            {zorunlu
              ? (tekrarMi
                ? 'Bu bulgu TEKRAR ediyor — önem derecesinden bağımsız olarak analiz zorunlu.'
                : `"${veri.onem}" önem derecesi kök neden analizi ister.`)
              : 'Bu önem derecesinde analiz zorunlu değil; yine de yazılabilir.'}
          </span>
        </div>
      </div>

      {/* Kapanış kapısının bugünkü cevabı — düğmeye basmadan görünür. */}
      <p className="ab-dip" style={{ margin: 0,
        color: kapi.ok ? 'var(--ok)' : 'var(--bd)' }}>
        {kapi.ok
          ? 'Kapanış kapısı açık: bu bulgu kapatılabilir.'
          : `Kapanış kapısı KAPALI — ${kapi.ok === false ? kapi.sebep : ''}`}
      </p>

      {veri.yazabilir && !acik && (
        <div>
          <Dugme tur="ikincil" onClick={ac} aria-expanded={false}>
            {durum === 'tam' ? 'Analizi düzenle' : 'Analizi yaz'}
          </Dugme>
        </div>
      )}

      {veri.yazabilir && acik && (
        <>
          <Alan etiket="Kök neden kategorisi">
            <select className="ab-gr" value={kategori} disabled={bekliyor}
              onChange={(e) => setKategori(e.target.value)}>
              <option value="">— seçilmedi —</option>
              {KOK_NEDEN_KATEGORILERI.map((kk) => (
                <option key={kk} value={kk}>{KOK_NEDEN_ETIKETI[kk]}</option>
              ))}
            </select>
          </Alan>
          <Alan etiket={`Analiz (en az ${ANALIZ_ASGARI} karakter)`}>
            <textarea className="ab-gr" rows={4} value={metin} disabled={bekliyor}
              onChange={(e) => setMetin(e.target.value)}
              placeholder="Bu bulgunun kökeninde ne var? Kategori seçmek analiz değildir." />
          </Alan>
          <div style={{ display: 'flex', gap: 'var(--s8)', alignItems: 'center' }}>
            <Dugme tur="ikincil"
              disabled={bekliyor || !kategori || metin.trim().length < ANALIZ_ASGARI}
              onClick={() => calistir(() => kokNedenKaydet({
                bulguId: veri.id, kategori, metin,
              }))}>
              Analizi kaydet
            </Dugme>
            <span className="mono" style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
              {metin.trim().length}/{ANALIZ_ASGARI}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

/* ═══ UY-28 · Tekrar zinciri ═════════════════════════════════════════

   Zincir aynı KONTROL (madde × santral) üzerindeki bütün bulgulardan
   kurulur, bulgunun kendi bağını yukarı yürüyerek DEĞİL: motorun ya da
   insanın bağ kurmayı atladığı bir halka da görünsün.

   Bağı KİMİN kurduğu (motor / elle) ayrı yazılır: insanın gördüğü bir
   örüntü ile motorun bulduğu bir eşleşme aynı güvende değildir. */

function TekrarBlogu({ veri, bekliyor, calistir }: {
  veri: Veri;
  bekliyor: boolean;
  calistir: (is: () => Promise<Sonuc>) => void;
}) {
  const z = veri.zincir;
  if (z.uzunluk <= 1 && veri.tekrarBulguId === null) {
    return (
      <section className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s8)' }}>Tekrar</p>
        <p className="ab-dip" style={{ margin: 0 }}>
          Bu kontrolde başka bulgu yok — tekrar değil.
        </p>
      </section>
    );
  }

  return (
    <section className="ab-panel-blok" style={{ marginTop: 'var(--s24)',
      display: 'grid', gap: 'var(--s12)' }}>
      <p className="etiket" style={{ margin: 0 }}>Tekrar zinciri</p>

      <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
        alignItems: 'start', gap: 'var(--s8)' }}>
        <span style={{ paddingTop: 3 }}>
          <Im durum={z.kronik ? 'bd' : z.uzunluk > 1 ? 'md' : 'ok'}
            ad={z.kronik ? 'kronik' : 'tekrar'} />
        </span>
        <div style={{ display: 'grid', gap: 'var(--s4)' }}>
          <span style={{ fontSize: 'var(--t-field)' }}>
            {z.kronik
              ? `KRONİK: bu kontrolde ${z.uzunluk} bulgu açıldı (eşik ${KRONIK_ESIK}). `
                + 'Kapanışlar sorunu gidermiyor.'
              : `Bu kontrolde ${z.uzunluk} bulgu var.`}
          </span>
          <span className="mono" style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
            {z.ortalamaAralikGun === null
              ? 'kapanışlar arası ortalama ölçülmedi'
              : `kapanıştan yeniden açılışa ortalama ${z.ortalamaAralikGun} gün`}
          </span>
          {veri.tekrarBulguId !== null && (
            <span style={{ fontSize: 'var(--t-label)', color: 'var(--i2)' }}>
              Bağ: {TEKRAR_KAYNAK_SOZU[
                veri.tekrarKaynagi === 'motor' ? 'motor' : 'elle']}
              {veri.tekrarPenceresiGun !== null
                && ` · pencere ${veri.tekrarPenceresiGun} gün`}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--s8)' }}>
        {z.halkalar.map((h, i) => (
          <div key={h.id} style={{ display: 'grid',
            gridTemplateColumns: '28px 1fr', gap: 'var(--s8)',
            padding: 'var(--s8)',
            background: h.buMu ? 'var(--panel2)' : 'transparent',
            borderRadius: 4 }}>
            <span className="mono" style={{ fontSize: 'var(--t-label)',
              color: 'var(--i3)' }}>
              #{i + 1}
            </span>
            <div style={{ display: 'grid', gap: 2 }}>
              <span style={{ fontSize: 'var(--t-label)',
                fontWeight: h.buMu ? 600 : 400 }}>
                {h.buMu
                  ? <>{h.baslik} <span style={{ color: 'var(--aksan)' }}>· bu kayıt</span></>
                  : <Link href={`/bulgular/${h.id}`}>{h.baslik}</Link>}
              </span>
              <span className="mono" style={{ fontSize: 'var(--t-label)',
                color: 'var(--i3)' }}>
                {kisaTarih(h.tespit)}
                {h.kapanma ? ` → ${kisaTarih(h.kapanma)}` : ' → açık'}
                {' · '}{h.onem}
              </span>
            </div>
          </div>
        ))}
      </div>

      {veri.yazabilir && veri.tekrarBulguId !== null && (
        <Dugme tur="ikincil" disabled={bekliyor}
          onClick={() => calistir(() => tekrarBagiKur({
            bulguId: veri.id, oncekiBulguId: null,
          }))}>
          Tekrar bağını kaldır
        </Dugme>
      )}
    </section>
  );
}

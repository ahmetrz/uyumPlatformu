'use client';
import { useMemo, useState, useTransition } from 'react';
import { useUrlDurumu } from '@/components/kabuk/urlDurumu';
import { BosFiltre, BosIlk, Dugme } from '@/components/kabuk/temel';
import { EkranBasligi, Filtreler, KipDegistir } from '@/components/kabuk/ekran';
import { Tablo, type Kolon } from '@/components/kabuk/tablo';
import {
  Cekmece, CekmeceAlanlar, CekmeceEylemler, CekmeceKimlik,
} from '@/components/kabuk/panel';
import { eslemeProfilKurallari } from '@/lib/eylemler2/esleme';
import Duzenleyici, { bosKural, type KuralTaslagi, type Sozluk } from './Duzenleyici';
import {
  DURUM_SOZU, GORUNUR_TAVAN, KAYNAK_SOZU, MERCEKLER,
  connectorImi, ekranHali, eslemeHucresi, mercekten, profilImi, sayimHesapla,
  sirala, toplanabilir,
  type ConnectorSatiri, type Mercek, type ProfilAilesi,
} from './mantik';

/* O26 · Eşleme profili tezgâhı.

   Yoğunluk sözleşmesi: 4 metrik, 5–9 görünür satır + katlanmış kuyruk,
   durum kelimesi canvas'ta YAZILMAZ (yalnız çekmece kimlik bloğunda),
   kart ızgarası/zebra/rozet yok, detay modalda değil ÇEKMECEDE açılır.

   ÜÇ AYRI SIFIR birbirine karıştırılmaz:
     · profil yok           → hiç yayımlanmadı; connector'lar gömülü
                              eşlemeyle koşuyor olabilir (eşlemesiz DEĞİL)
     · etkin sürüm yok      → yayımlandı ama koşuda kullanılmıyor
     · gömülü eşleme        → kural var ama ÜRÜNDE tanımlı değil: BİLİNMİYOR */

type Kip = 'profil' | 'connector' | 'duzenleyici';

const PROFIL_KOLONLARI: Kolon[] = [
  { baslik: 'Bağlayıcı tipi', genislik: '150px' },
  { baslik: 'Etkin sürüm', genislik: '110px' },
  { baslik: 'Kural', genislik: '70px', sag: true },
  { baslik: 'Sürüm', genislik: '80px', sag: true, ikincil: true },
];

const CONNECTOR_KOLONLARI: Kolon[] = [
  { baslik: 'Tip', genislik: '150px' },
  { baslik: 'Koşuda geçerli eşleme', genislik: '190px' },
  { baslik: 'Kaynak', genislik: '150px', ikincil: true },
];

export default function EslemeIstemci({
  aileler, connectorlar, okunamayanKodlar, sozluk, tipler, yazabilir, connectorTavani,
}: {
  aileler: ProfilAilesi[];
  connectorlar: ConnectorSatiri[];
  okunamayanKodlar: { kod: string; hata: string }[];
  sozluk: Sozluk;
  tipler: string[];
  yazabilir: boolean;
  connectorTavani: number;
}) {
  const [kip, setKip] = useUrlDurumu<Kip>('kip', 'profil');
  const [mercek, setMercek] = useUrlDurumu<Mercek>('mercek', 'hepsi');
  const [seciliKod, setSeciliKod] = useState<string | null>(null);
  const [seciliConnector, setSeciliConnector] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [taslak, setTaslak] = useState<Parameters<typeof Duzenleyici>[0]['baslangic']>(null);

  /* Sürüm kuralları TALEP ÜZERİNE okunur: sayfa açılışında her sürümün
     kural gövdesini taşımak, kimsenin bakmadığı JSON'u istemciye
     göndermek olurdu. */
  const [kuralYukleniyor, kuralBaslat] = useTransition();
  const [acikSurum, setAcikSurum] = useState<{
    kod: string; surum: number; kurallar: KuralTaslagi[]; hata: string | null;
  } | null>(null);

  const sayim = useMemo(
    () => sayimHesapla(aileler, connectorlar), [aileler, connectorlar]);

  const suzulmus = useMemo(
    () => sirala(aileler.filter((a) => mercekten(a, mercek))), [aileler, mercek]);

  /* Etkin sürümü olmayan profil kuyruğa İNMEZ: çözülmemiş iş odur. */
  const acikSayisi = suzulmus.filter((a) => !toplanabilir(a)).length;
  const gorunurTavan = Math.max(GORUNUR_TAVAN, acikSayisi);
  const gosterilen = kuyrukAcik ? suzulmus : suzulmus.slice(0, gorunurTavan);
  const toplanan = suzulmus.length - gosterilen.length;

  const secim = aileler.find((a) => a.kod === seciliKod) ?? null;
  const cSecim = connectorlar.find((c) => c.id === seciliConnector) ?? null;
  const hal = ekranHali(sayim, connectorlar.length);

  function surumAc(kod: string, surum: number) {
    setAcikSurum(null);
    kuralBaslat(async () => {
      const sonuc = await eslemeProfilKurallari(kod, surum);
      if (!sonuc.ok) { setAcikSurum({ kod, surum, kurallar: [], hata: sonuc.hata }); return; }
      setAcikSurum({
        kod, surum, hata: null,
        kurallar: sonuc.kurallar.map((k) => ({
          kaynakAlan: k.kaynakAlan,
          hedefAlan: k.hedefAlan as string,
          donusum: (k.donusum as string) ?? 'yok',
          zorunlu: k.zorunlu === true,
          varsayilan: k.varsayilan ?? '',
        })),
      });
    });
  }

  function duzenleyiciyeYukle(aile: ProfilAilesi, surum: number, kurallar: KuralTaslagi[]) {
    setTaslak({
      kod: aile.kod, ad: aile.ad, connectorTipi: aile.connectorTipi,
      aciklama: '', kurallar: kurallar.length ? kurallar : [bosKural()],
      kaynakSurum: surum,
    });
    setKip('duzenleyici');
    setSeciliKod(null);
  }

  const dipNot = [
    `${aileler.length} profil · ${sayim.etkinSurum} etkin sürüm`
      + ` · ${sayim.arsivSurum} arşiv sürüm`,
    okunamayanKodlar.length > 0
      && `${okunamayanKodlar.length} profilin sürüm geçmişi OKUNAMADI`,
  ].filter(Boolean).join(' · ');

  const connectorDipNot = [
    `${connectorlar.length} connector`,
    sayim.gomuluConnector > 0
      && `${sayim.gomuluConnector}'i gömülü eşlemeyle koşuyor —`
        + ' kuralları üründe tanımlı DEĞİL, "kural yok" demek değil',
    sayim.okunamayanConnector > 0
      && `${sayim.okunamayanConnector} connector'ın eşlemesi okunamadı`,
    connectorlar.length >= connectorTavani && `ilk ${connectorTavani} connector`,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow="Eşleme profili · sürümlü kural tanımı"
          vurgu={hal.vurgu}
          vurguDurumu={hal.durum}
          baslik={hal.metin}
          metrikler={[
            { deger: sayim.profil, yazi: 'Profil',
              durum: sayim.profil === 0 ? 'unk' : undefined },
            { deger: sayim.etkinSurum, yazi: 'Etkin sürüm',
              durum: sayim.etkinsizProfil > 0 ? 'md' : undefined },
            { deger: sayim.arsivSurum, yazi: 'Arşiv sürüm' },
            { deger: sayim.gomuluConnector, yazi: 'Gömülü eşlemeyle koşan bağlayıcı',
              durum: sayim.gomuluConnector > 0 ? 'unk' : undefined },
          ]}
        />

        <KipDegistir
          secenekler={[
            { id: 'profil', ad: `Profiller · ${aileler.length}` },
            { id: 'connector', ad: `Connector eşlemesi · ${connectorlar.length}` },
            { id: 'duzenleyici', ad: 'Düzenleyici' },
          ]}
          aktif={kip}
          sec={(id) => {
            setKip(id as Kip); setSeciliKod(null); setSeciliConnector(null);
          }}
        />

        {kip === 'profil' && (
          <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s22)' }}>
            {okunamayanKodlar.length > 0 && (
              <p className="ab-dip" style={{ marginBottom: 'var(--s14)', color: 'var(--unk)' }}>
                Şu profillerin sürüm geçmişi okunamadı ve listede YOK —
                bu, o profillerin var olmadığı anlamına gelmez:{' '}
                {okunamayanKodlar.map((o) => `${o.kod} (${o.hata})`).join(' · ')}
              </p>
            )}

            {aileler.length === 0 ? (
              <BosIlk
                cumle={'Hiç eşleme profili yayımlanmadı. Bu, bağlayıcıların'
                  + ' eşlemesiz koştuğu anlamına GELMEZ: profili olmayan'
                  + ' bağlayıcı kendi gömülü eşlemesini kullanır ve o'
                  + ' kurallar üründe görünmez. Bir profil yayımlamak, o'
                  + ' kuralları görünür ve sürümlü hâle getirir.'}
                eylem={yazabilir
                  ? <Dugme tur="birincil" onClick={() => setKip('duzenleyici')}>
                    Düzenleyiciyi aç
                  </Dugme>
                  : undefined}
              />
            ) : (
              <>
                <Filtreler secenekler={MERCEKLER} aktif={mercek}
                  sec={(id) => setMercek(id as Mercek)} />
                {gosterilen.length === 0 ? (
                  <BosFiltre temizle={() => setMercek('hepsi')} />
                ) : (
                  <Tablo
                    konuBasligi="Profil"
                    kolonlar={PROFIL_KOLONLARI}
                    secili={seciliKod}
                    sec={(id) => {
                      setSeciliKod(id === seciliKod ? null : id);
                      setAcikSurum(null);
                    }}
                    kuyruk={toplanan > 0
                      ? { metin: `Etkin sürümü olan ${toplanan} profil`,
                        ac: () => setKuyrukAcik(true) }
                      : null}
                    dipNot={dipNot}
                    satirlar={gosterilen.map((a) => ({
                      id: a.kod,
                      durum: profilImi(a),
                      kenar: profilImi(a),
                      konu: a.kod,
                      alt: a.ad,
                      hucreler: [
                        a.connectorTipi,
                        <span key="e" style={a.etkin ? undefined : { color: 'var(--unk)' }}>
                          {a.etkin ? `v${a.etkin.surum}` : 'etkin sürüm yok'}
                        </span>,
                        a.etkin ? a.etkin.kuralSayisi : a.surumler[0].kuralSayisi,
                        `${a.surumler.length} sürüm`,
                      ],
                    }))}
                  />
                )}
              </>
            )}
          </section>
        )}

        {kip === 'connector' && (
          <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s22)' }}>
            {connectorlar.length === 0 ? (
              <BosIlk cumle={'Tanımlı bağlayıcı yok. Eşleme profili yine de'
                + ' yayımlanabilir: bağlayıcı açıldığında tipinin etkin profili'
                + ' kendiliğinden geçerli olur.'} />
            ) : (
              <Tablo
                konuBasligi="Connector"
                kolonlar={CONNECTOR_KOLONLARI}
                secili={seciliConnector}
                sec={(id) => setSeciliConnector(id === seciliConnector ? null : id)}
                dipNot={connectorDipNot}
                satirlar={connectorlar.map((c) => ({
                  id: c.id,
                  durum: connectorImi(c),
                  kenar: connectorImi(c),
                  konu: c.kod,
                  alt: c.ad,
                  hucreler: [
                    c.tip,
                    <span key="e" style={c.kaynak === 'gomulu' || c.hata
                      ? { color: 'var(--unk)' } : undefined}>
                      {eslemeHucresi(c)}
                    </span>,
                    c.hata ? 'okunamadı' : KAYNAK_SOZU[c.kaynak],
                  ],
                }))}
              />
            )}
          </section>
        )}

        {kip === 'duzenleyici' && (
          <Duzenleyici
            sozluk={sozluk}
            tipler={tipler}
            yazabilir={yazabilir}
            baslangic={taslak}
            sozlukOkunamadi={sozluk.hedefAlanlar.length === 0}
          />
        )}
      </main>

      {kip === 'profil' && secim && (
        <Cekmece kod={secim.kod} kapat={() => setSeciliKod(null)}>
          <CekmeceKimlik
            durum={profilImi(secim)}
            soz={secim.etkin
              ? DURUM_SOZU.etkin
              : secim.surumler.some((s) => s.durum === 'taslak')
                ? DURUM_SOZU.taslak
                : 'Etkin sürüm yok · yalnız arşiv'}
            baslik={secim.ad}
            cumle={secim.surumler[0].aciklama ?? undefined}
          />

          <CekmeceAlanlar
            alanlar={[
              { etiket: 'Bağlayıcı tipi', deger: secim.connectorTipi },
              { etiket: 'Etkin sürüm',
                deger: secim.etkin ? `v${secim.etkin.surum}` : 'yok',
                durum: secim.etkin ? undefined : 'unk' },
              { etiket: 'Son sürüm', deger: `v${secim.sonSurum}` },
              { etiket: 'Sürüm sayısı', deger: secim.surumler.length },
              { etiket: 'Kural sayısı',
                deger: (secim.etkin ?? secim.surumler[0]).kuralSayisi },
            ]}
          />

          {/* Sürüm geçmişi ARŞİV DAHİL gösterilir: yayımlanmış bir sürüm
              değişmediği için "bu alan neden böyle" sorusunun yanıtı
              buradadır. Geçmiş gizlenmez. */}
          <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
            <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
              Sürüm geçmişi · {secim.surumler.length} sürüm
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0,
              display: 'grid', gap: 'var(--s8)' }}>
              {secim.surumler.map((s) => (
                <li key={s.id}>
                  <button type="button" className="ab-dugme satir"
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => surumAc(s.kod, s.surum)}>
                    v{s.surum} · {DURUM_SOZU[s.durum] ?? s.durum} · {s.kuralSayisi} kural
                  </button>
                </li>
              ))}
            </ul>
            {kuralYukleniyor && (
              <p className="ab-dip" style={{ margin: 'var(--s10) 0 0' }}>
                Kurallar okunuyor…
              </p>
            )}
            {acikSurum && acikSurum.hata && (
              <p role="alert" style={{ margin: 'var(--s10) 0 0',
                fontSize: 'var(--t-field)', color: 'var(--bd)' }}>{acikSurum.hata}</p>
            )}
            {acikSurum && !acikSurum.hata && (
              <div style={{ marginTop: 'var(--s12)' }}>
                <p className="etiket" style={{ margin: '0 0 var(--s8)' }}>
                  v{acikSurum.surum} kuralları · DEĞİŞTİRİLEMEZ
                </p>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0,
                  display: 'grid', gap: 'var(--s6)' }}>
                  {acikSurum.kurallar.map((k, i) => (
                    <li key={i} style={{ fontFamily: 'var(--veri)',
                      fontSize: 'var(--t-label)', color: 'var(--i2)' }}>
                      {k.kaynakAlan} → {k.hedefAlan}
                      {k.donusum && k.donusum !== 'yok' ? ` · ${k.donusum}` : ''}
                      {k.zorunlu ? ' · zorunlu' : ''}
                      {k.varsayilan ? ` · varsayılan "${k.varsayilan}"` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <CekmeceEylemler
            birincil={yazabilir && acikSurum && !acikSurum.hata ? (
              <Dugme tur="tam"
                onClick={() => duzenleyiciyeYukle(
                  secim, acikSurum.surum, acikSurum.kurallar)}>
                v{acikSurum.surum} kurallarını düzenleyiciye yükle
              </Dugme>
            ) : undefined}
            dipNot={'Yüklemek bu sürümü DEĞİŞTİRMEZ. Düzenleyicideki yayın'
              + ' aynı kod için YENİ sürüm açar; bu sürüm arşivde kalır ve'
              + ' onunla yorumlanmış içe aktarımların kuralı okunabilir olur.'}
          />
        </Cekmece>
      )}

      {kip === 'connector' && cSecim && (
        <Cekmece kod={cSecim.kod} kapat={() => setSeciliConnector(null)}>
          <CekmeceKimlik
            durum={connectorImi(cSecim)}
            soz={cSecim.hata
              ? 'Eşleme okunamadı'
              : cSecim.kaynak === 'gomulu'
                ? 'Gömülü eşleme · kurallar üründe yok'
                : DURUM_SOZU[cSecim.profilDurumu ?? ''] ?? 'Profil bağlı'}
            baslik={cSecim.ad}
            cumle={cSecim.kaynak === 'gomulu' && !cSecim.hata
              ? 'Bu bağlayıcı kendi gömülü eşlemesiyle koşuyor. Alanların'
                + ' nasıl çevrildiği üründe TANIMLI DEĞİL; sürümlü bir profil'
                + ' yayımlayıp bağlamak kuralı görünür ve denetlenebilir yapar.'
              : undefined}
          />
          <CekmeceAlanlar
            alanlar={[
              { etiket: 'Tip', deger: cSecim.tip },
              { etiket: 'Koşuda geçerli eşleme', deger: eslemeHucresi(cSecim),
                durum: cSecim.kaynak === 'gomulu' || cSecim.hata ? 'unk' : undefined },
              { etiket: 'Eşlemenin kaynağı',
                deger: cSecim.hata ?? KAYNAK_SOZU[cSecim.kaynak],
                durum: cSecim.hata ? 'unk' : undefined },
              { etiket: 'Profil durumu',
                deger: cSecim.profilDurumu
                  ? DURUM_SOZU[cSecim.profilDurumu] ?? cSecim.profilDurumu
                  : 'profil yok',
                durum: cSecim.profilDurumu ? undefined : 'unk' },
            ]}
          />
          <CekmeceEylemler
            dipNot={'Profil BAĞLAMA bu ekranda değil, bağlayıcı yapılandırma'
              + ' çekmecesindedir (/saglik): bağ bağlayıcı kaydının alanıdır,'
              + ' profilin değil. Burası profilin doğduğu yerdir.'}
          />
        </Cekmece>
      )}
    </>
  );
}

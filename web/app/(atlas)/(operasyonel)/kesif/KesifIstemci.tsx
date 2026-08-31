'use client';
import { useMemo, useState } from 'react';
import { BosIlk, BosFiltre } from '@/components/atlas/temel';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import { Tablo, type Kolon } from '@/components/atlas/tablo';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli,
} from '@/components/atlas/cekmece';
import { tarihTR, zamanTR } from '@/lib/sabitler';
import {
  ElleAktarimFormu, KararEylemleri, TopluKararTepsisi, type Tesis, type Tur,
} from './Karar';
import {
  ANAHTAR_SOZU, DURUM_SOZU_KESIF, GORUNUR_TAVAN, KAYNAK_SOZU, MERCEKLER,
  bekliyorMu, guvenDurumu, guvenYazisi, mercekten, metrikleriHesapla,
  satirDurumu, sirala, toplanabilir,
  type KesifSatiri, type Mercek,
} from './mantik';

/* Varlık keşfi · inceleme kuyruğu.

   Yoğunluk sözleşmesi: 4 metrik, 5–9 görünür satır + toplanan kuyruk,
   durum kelimesi canvas'ta YAZILMAZ (yalnız çekmece kimlik bloğunda),
   kart ızgarası/zebra yok, detay modalda açılmaz.

   "Güven ölçülmedi" ile "güven düşük" AYNI GÖSTERİLMEZ: birincisi
   bilinmeyen işaretçisiyle ve "ölçülmedi" sözüyle, ikincisi kritik
   işaretçisiyle ve yüzdeyle görünür. */

const KOLONLAR: Kolon[] = [
  { baslik: 'Kaynak', genislik: '150px', ikincil: true },
  { baslik: 'Eşleşme adayı', genislik: '190px' },
  { baslik: 'Güven', genislik: '110px', sag: true },
  { baslik: 'Son görülme', genislik: '120px', sag: true, ikincil: true },
];

export default function KesifIstemci({
  satirlar, turler, tesisler, yazabilir, onaylayabilir, gorunmezEsikGun, kuyrukTavani,
}: {
  satirlar: KesifSatiri[];
  turler: Tur[];
  tesisler: Tesis[];
  yazabilir: boolean;
  onaylayabilir: boolean;
  gorunmezEsikGun: number;
  kuyrukTavani: number;
}) {
  const [mercek, setMercek] = useState<Mercek>('hepsi');
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [toplu, setToplu] = useState<string[]>([]);

  /* Metrikler filtreden BAĞIMSIZ: kapsamın tamamını anlatır. */
  const m = useMemo(() => metrikleriHesapla(satirlar), [satirlar]);

  const suzulmus = useMemo(
    () => sirala(satirlar.filter((s) => mercekten(s, mercek))),
    [satirlar, mercek],
  );

  /* Karar bekleyen hiçbir satır kuyruğa inmez; yalnız karara bağlananlar
     toplanır (06 §A3: kritik satır sayıdan bağımsız görünür kalır). */
  const one = suzulmus.filter((s) => !toplanabilir(s)).slice(0, GORUNUR_TAVAN);
  const sakin = suzulmus.filter((s) => !one.includes(s));
  const gosterilen = kuyrukAcik ? suzulmus : one;
  const toplanan = kuyrukAcik ? 0 : sakin.length;

  const secili = satirlar.find((s) => s.id === seciliId) ?? null;
  const secilenler = toplu
    .map((id) => satirlar.find((s) => s.id === id))
    .filter((s): s is KesifSatiri => !!s && bekliyorMu(s));

  const dipNot = [
    `${satirlar.length} keşif kaydı`,
    `${m.bekleyen} karar bekliyor`,
    m.guvensiz > 0 && `${m.guvensiz} kaydın güveni ölçülmedi`,
    m.gorunmeyen > 0
      && `${m.gorunmeyen} kayıt ${gorunmezEsikGun} gündür görülmüyor — silinmedi, gözlem olarak duruyor`,
    satirlar.length >= kuyrukTavani && `en yeni ${kuyrukTavani} kayıt gösteriliyor`,
  ].filter(Boolean).join(' · ');

  if (satirlar.length === 0) {
    return (
      <main style={{ minWidth: 0 }}>
        <EkranBasligi eyebrow="Varlık keşfi" baslik="İnceleme kuyruğu" />
        <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <ElleAktarimFormu yazabilir={yazabilir} />
          <BosIlk cumle="Henüz keşif kaydı yok. Pasif bir kaynağın dışa aktarımını yükleyin ya da bir connector çalıştırın." />
        </section>
      </main>
    );
  }

  const baslik = m.cakisan > 0
    ? { vurgu: `${m.cakisan} kayıt`, metin: 'çakışan eşleşmede', durum: 'bd' as const }
    : m.bekleyen > 0
      ? { vurgu: `${m.bekleyen} kayıt`, metin: 'karar bekliyor', durum: undefined }
      : { vurgu: undefined, metin: 'Bekleyen keşif kaydı yok', durum: undefined };

  return (
    <>
      <main style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Varlık keşfi · pasif kaynaklar · ${satirlar.length} kayıt`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.metin}
          metrikler={[
            { deger: m.bekleyen, yazi: 'Karar bekliyor',
              durum: m.bekleyen > 0 ? 'md' : undefined },
            { deger: m.cakisan, yazi: 'Çakışan eşleşme',
              durum: m.cakisan > 0 ? 'bd' : undefined },
            { deger: m.guvensiz, yazi: 'Güven ölçülmedi',
              durum: m.guvensiz > 0 ? 'unk' : undefined },
            { deger: m.gorunmeyen, yazi: `Görülmüyor · ${gorunmezEsikGun}g`,
              durum: m.gorunmeyen > 0 ? 'unk' : undefined },
          ]}
        />

        <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <ElleAktarimFormu yazabilir={yazabilir} />

          <TopluKararTepsisi
            secilenler={secilenler}
            cikar={(id) => setToplu((e) => e.filter((x) => x !== id))}
            temizle={() => setToplu([])}
          />

          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => setMercek(id as Mercek)}
          />

          {gosterilen.length === 0 ? (
            <BosFiltre temizle={() => setMercek('hepsi')} />
          ) : (
            <Tablo
              konuBasligi="Keşfedilen kayıt"
              kolonlar={KOLONLAR}
              secili={seciliId}
              sec={(id) => setSeciliId(id === seciliId ? null : id)}
              kuyruk={toplanan > 0
                ? { metin: `Karara bağlanmış ${toplanan} kayıt`, ac: () => setKuyrukAcik(true) }
                : null}
              dipNot={dipNot}
              satirlar={gosterilen.map((s) => ({
                id: s.id,
                durum: satirDurumu(s),
                kenar: satirDurumu(s),
                konu: s.konu,
                alt: s.alt,
                hucreler: [
                  KAYNAK_SOZU[s.kaynak] ?? s.kaynak,
                  s.eslesen
                    ? s.eslesen.etiket
                    : s.cakisma
                      ? `${s.adaylar.length} aday`
                      : '—',
                  <span key="g" style={s.guvenSkoru === null
                    ? { color: 'var(--i3)' }
                    : guvenDurumu(s.guvenSkoru) === 'bd'
                      ? { color: 'var(--bd)' } : undefined}>
                    {guvenYazisi(s.guvenSkoru)}
                  </span>,
                  tarihTR(s.sonGorulme),
                ],
              }))}
            />
          )}
        </section>
      </main>

      {secili && (
        <Cekmece kod={`${secili.kaynak}/${secili.kaynakKayitId}`} kapat={() => setSeciliId(null)}>
          <CekmeceKimlik
            durum={satirDurumu(secili)}
            soz={DURUM_SOZU_KESIF[secili.durum] ?? secili.durum}
            baslik={secili.konu}
            cumle={secili.gerekce}
          />

          <CekmeceAlanlar
            alanlar={[
              { etiket: 'Kaynak',
                deger: `${KAYNAK_SOZU[secili.kaynak] ?? secili.kaynak}`
                  + (secili.connectorAd ? ` · ${secili.connectorAd}` : '') },
              { etiket: 'Eşleşme anahtarı',
                deger: secili.eslesmeAnahtari
                  ? (ANAHTAR_SOZU[secili.eslesmeAnahtari] ?? secili.eslesmeAnahtari)
                  : 'yok' },
              { etiket: 'Güven skoru',
                deger: guvenYazisi(secili.guvenSkoru),
                durum: guvenDurumu(secili.guvenSkoru) },
              { etiket: 'İlk görülme', deger: zamanTR(secili.ilkGorulme) },
              { etiket: 'Son görülme',
                deger: `${zamanTR(secili.sonGorulme)}`
                  + (secili.gunGorulmedi >= gorunmezEsikGun
                    ? ` · ${secili.gunGorulmedi} gündür görülmüyor` : ''),
                durum: secili.gunGorulmedi >= gorunmezEsikGun ? 'unk' : undefined },
            ]}
          />

          {secili.gozlemAlanlari.length > 0 && (
            <CekmeceAlanlar
              alanlar={secili.gozlemAlanlari.slice(0, 8)
                .map((a) => ({ etiket: a.etiket, deger: a.deger }))}
            />
          )}

          {secili.adaylar.length > 0 && (
            <CekmeceBagli
              baslik={secili.cakisma ? 'Çakışan adaylar' : 'Eşleşme adayı'}
              kayitlar={secili.adaylar.map((a) => ({
                id: a.varlikId,
                kod: a.etiket,
                alt: `${a.anahtarlar.map((k) => ANAHTAR_SOZU[k] ?? k).join(' + ')}`
                  + ` · ${guvenYazisi(a.guven)}`,
                yol: '/envanter',
                suren: a.varlikId === secili.eslesen?.id,
              }))}
            />
          )}

          <KararEylemleri
            satir={secili}
            turler={turler}
            tesisler={tesisler}
            onaylayabilir={onaylayabilir}
            seciliMi={toplu.includes(secili.id)}
            secimeEkle={(id) => setToplu((e) => (e.includes(id) ? e : [...e, id]))}
            secimdenCikar={(id) => setToplu((e) => e.filter((x) => x !== id))}
          />
        </Cekmece>
      )}
    </>
  );
}

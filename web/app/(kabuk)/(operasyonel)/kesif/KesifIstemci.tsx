'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import { BosIlk, BosFiltre } from '@/components/kabuk/temel';
import { EkranBasligi, Filtreler, TezgahHatti } from '@/components/kabuk/ekran';
import { Tablo, type Kolon } from '@/components/kabuk/tablo';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli,
} from '@/components/kabuk/panel';
import { Im } from '@/components/kabuk/temel';
import { csvAktar, damgaliAd, exceleAktar } from '@/components/disaAktar';
import { tarihTR, zamanTR } from '@/lib/sabitler';
import {
  AKTIF_ISLEM_YASAKLARI, KESIF_ADIMLARI, KESIF_GRUPLARI, KESIF_GRUP_ACIKLAMASI,
  KESIF_GRUP_ADI, KESIF_GRUP_SINIFI, kesifCumlesi,
  type KesifDagilimi, type KesifGrubu,
} from '@/lib/varlik/pasifKesif';
import {
  ElleAktarimFormu, EslestirmeDugmesi, KararEylemleri, PasifGozlemFormu,
  TopluKararTepsisi, YetkiKarari,
  type Tesis, type Tur,
} from './Karar';
import {
  ANAHTAR_SOZU, DURUM_SOZU_KESIF, GORUNUR_TAVAN, KAYNAK_SOZU, MERCEKLER,
  bekliyorMu, guvenDurumu, guvenYazisi, kesifDisaAktarimi, kesifOzeti,
  mercekten, metrikleriHesapla, satirDurumu, satirinGrubu, sirala, toplanabilir,
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

/* ═══ OT-16b · Santral süzgeci ═══════════════════════════════════════

   "Yeri belirsiz" ayrı bir seçenektir ve GİZLENMEZ: santrali çözülemeyen
   kayıt tam da incelenmesi gereken kayıttır. Bir santral seçildiğinde
   özet de o santrale daralır — bir santrale bakan kişi kurumun toplamını
   değil kendi sayısını görmelidir. */

function SantralSuzgeci({ tesisler, aktif, sec, yerisiz }: {
  tesisler: Tesis[];
  aktif: string | null;
  sec: (id: string | null) => void;
  yerisiz: number;
}) {
  return (
    <div className="ab-suzgec" style={{ marginBottom: 'var(--s12)' }}>
      <div className="mercekler" role="group" aria-label="Santral">
        <button type="button" aria-pressed={aktif === null} onClick={() => sec(null)}>
          Tüm santraller
        </button>
        {tesisler.map((t) => (
          <button key={t.id} type="button" className="tasma"
            aria-pressed={aktif === t.id} onClick={() => sec(t.id)}>
            {t.kod}
          </button>
        ))}
        {yerisiz > 0 && (
          <button type="button" className="tasma"
            aria-pressed={aktif === 'yok'} onClick={() => sec('yok')}>
            Yeri belirsiz · {yerisiz}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══ OT-16b · Yedi grup süzgeci ════════════════════════════════════

   Gruplar DIŞLAYICIDIR: her kayıt tek bir gruba düşer ve sayılar toplama
   eşittir. Bir kayıt birden çok tarife uyduğunda önce yapılacak iş
   kazanır; sıra `lib/varlik/pasifKesif.ts` içinde sabittir ve panelden
   değiştirilemez (aynı kuyruğa bakan iki kişi aynı önceliği görmelidir).

   ── KART IZGARASI SÜZGEÇ ŞERİDİNE İNDİ (UX-0004) ──────────────────────
   Yedi grup, her biri kendi kenarını çizen ve tam paragraf taşıyan
   kutulardı: 1440px'te iki sütuna dört satır, ~560px. Dördü sıfır
   sayılıydı ve yine de tam paragrafını taşıyordu. Ölçüldü: inceleme
   kuyruğu — kullanıcının bu ekrana gelme sebebi — sayfanın 1518px
   altında başlıyordu.

   Gerekçe metni SİLİNMEDİ, GÖSTERİMİ SIKIŞTI: grup seçilince açıklaması
   şeridin altında tek satır olarak yazılır. Seçilmemiş grubun
   açıklaması `title` ile durur. Bilgi kaybı yok; ilk ekranda 560px
   yerine 60px yer var. */

function GrupSuzgeci({ dagilim, aktif, sec, disaAktar }: {
  dagilim: KesifDagilimi;
  aktif: KesifGrubu | null;
  sec: (g: KesifGrubu | null) => void;
  disaAktar: { excel: () => void; csv: () => void; sayi: number };
}) {
  return (
    <div className="ab-suzgec ab-kesif-suzgec">
      <div className="mercekler" role="group" aria-label="Keşif grubu">
        {KESIF_GRUPLARI.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={aktif === g}
            title={KESIF_GRUP_ACIKLAMASI[g]}
            disabled={dagilim[g] === 0 && aktif !== g}
            onClick={() => sec(aktif === g ? null : g)}
          >
            <Im durum={KESIF_GRUP_SINIFI[g]} ad={KESIF_GRUP_ADI[g]} />
            <span className="mono sayi">{dagilim[g]}</span>
            {KESIF_GRUP_ADI[g]}
          </button>
        ))}
      </div>
      <div className="kapsam">
        <span className="ab-dip" style={{ margin: 0 }}>
          {aktif === null
            ? `Dosya ekranda görünen ${disaAktar.sayi} kaydı taşır.`
            : `Dosya bu gruptaki ${disaAktar.sayi} kaydı taşır.`}
        </span>
        <button type="button" className="ab-dugme mini" onClick={disaAktar.excel}>Excel</button>
        <button type="button" className="ab-dugme mini" onClick={disaAktar.csv}>CSV</button>
      </div>
      {aktif !== null && (
        <p className="ab-dip aciklama">{KESIF_GRUP_ACIKLAMASI[aktif]}</p>
      )}
    </div>
  );
}

/* ═══ OT-16b · Ürünün ağa YAPMADIĞI şeyler ═══════════════════════════

   OT ekibinin ilk sorusu "bu şey ağıma ne yapacak" olur. Cevabın
   sözleşmede ya da bir sunumda değil, ÜRÜNÜN KENDİSİNDE durması gerekir:
   burada yazan her satır kodda da bir C sınıfı kuraldır ve panelden
   gevşetilemez.

   ── BLOK TEK SATIRA İNDİ (UX-0004) ────────────────────────────────────
   Söz her ziyarette görünür kalmalı — o yüzden SİLİNMEDİ ve gizlenmedi.
   Ama üç cümlelik bir paragraf olarak kuyruğun üstünde durması, seyrek
   okunan bir metni her gün önüne koymaktı. Şimdi bir cümle görünür,
   yapılmayan işlemlerin listesi düğmenin ardındadır. */

function PasiflikSatiri() {
  const [acik, setAcik] = useState(false);
  return (
    <div className="ab-kesif-pasiflik">
      <p>
        <strong>Bu ürün ağa paket ATMAZ.</strong> Bütün keşif, kurumun
        zaten çalışan gözlem kaynaklarının çıktısını OKUMAYA dayanır;
        gerekçe teknik değil emniyettir.
      </p>
      <button type="button" className="ab-dugme mini" aria-expanded={acik}
        onClick={() => setAcik(!acik)}>
        {acik ? 'Listeyi kapat' : `Yapılmayan ${AKTIF_ISLEM_YASAKLARI.length} işlem`}
      </button>
      {acik && (
        <ul className="yasaklar">
          {AKTIF_ISLEM_YASAKLARI.map((y) => (
            <li key={y.islem}>
              <Im durum="pl" ad="yapılmaz" />
              <span><b>{y.islem} — yapılmaz.</b> {y.neden}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function KesifIstemci({
  satirlar, turler, tesisler, yazabilir, onaylayabilir, gorunmezEsikGun,
  kuyrukTavani, simdi,
}: {
  satirlar: KesifSatiri[];
  turler: Tur[];
  tesisler: Tesis[];
  yazabilir: boolean;
  onaylayabilir: boolean;
  gorunmezEsikGun: number;
  kuyrukTavani: number;
  /** Sunucuda istek başına bir kez okunan an — dosya damgası buradan. */
  simdi: number;
}) {
  const [mercek, setMercek] = useUrlDurumu<Mercek>('mercek', 'hepsi');
  /* OT-16b · Grup merceği ile iş akışı merceği AYNI ANDA açılmaz: ikisi
     aynı listeye iki farklı soru sorar ve birlikte uygulanınca ekran
     hangi soruyu cevapladığını söyleyemez hâle gelirdi. Biri seçilince
     diğeri sıfırlanır. */
  const [grup, setGrup] = useUrlDurumuBos('grup');
  const [tesisF, setTesisF] = useUrlDurumuBos('tesis');
  const [seciliId, setSeciliId] = useUrlDurumuBos('sec');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const [toplu, setToplu] = useState<string[]>([]);

  /* Santral süzgeci metriklerden ÖNCE uygulanır: bir santrale bakan kişi
     kendi santralinin sayısını görmelidir, kurumun toplamını değil.
     `yeri_belirsiz` ayrı bir seçenektir — santralsiz kayıt gizlenmez. */
  const kapsamli = useMemo(() => {
    if (tesisF === null) return satirlar;
    if (tesisF === 'yok') return satirlar.filter((s) => s.tesisId === null);
    return satirlar.filter((s) => s.tesisId === tesisF);
  }, [satirlar, tesisF]);

  /* Metrikler mercekten BAĞIMSIZ: seçilen santral kapsamının tamamını
     anlatır. */
  const m = useMemo(
    () => metrikleriHesapla(kapsamli, gorunmezEsikGun), [kapsamli, gorunmezEsikGun]);
  const dagilim = useMemo(
    () => kesifOzeti(kapsamli, gorunmezEsikGun), [kapsamli, gorunmezEsikGun]);

  const suzulmus = useMemo(
    () => sirala(kapsamli.filter((s) => (grup === null
      ? mercekten(s, mercek)
      : satirinGrubu(s, gorunmezEsikGun) === grup))),
    [kapsamli, mercek, grup, gorunmezEsikGun],
  );

  /* Dosya EKRANDA GÖRÜNEN kümeyi taşır: dışa aktarılan liste ile bakılan
     liste ayrışırsa dosyayı açan kişi başka bir gerçeği okur. */
  const disaSayfa = () => ({
    ad: 'Keşif', satirlar: kesifDisaAktarimi(suzulmus, gorunmezEsikGun),
  });
  const disaAd = (uzanti: string) => damgaliAd('kesif', simdi, uzanti);

  /* Karar bekleyen hiçbir satır kuyruğa inmez; yalnız karara bağlananlar
     toplanır (06 §A3: kritik satır sayıdan bağımsız görünür kalır). */
  const one = suzulmus.filter((s) => !toplanabilir(s)).slice(0, GORUNUR_TAVAN);
  const sakin = suzulmus.filter((s) => !one.includes(s));
  const gosterilen = kuyrukAcik ? suzulmus : one;
  const toplanan = kuyrukAcik ? 0 : sakin.length;

  const secili = satirlar.find((s) => s.id === seciliId) ?? null;
  const eslestirilmemis = satirlar.filter((s) => s.eslestirilmedi && bekliyorMu(s)).length;
  const secilenler = toplu
    .map((id) => satirlar.find((s) => s.id === id))
    .filter((s): s is KesifSatiri => !!s && bekliyorMu(s));

  /* Dipnot, METRİK BANDININ SÖYLEMEDİĞİNİ söyler (UX-0012). Kayıt
     sayısı künyede, karar bekleyen / güveni ölçülmemiş / görülmeyen
     sayıları metrik kutularında zaten yazıyor; dördünü burada tekrar
     etmek aynı gerçeği ekranda üç kez göstermekti. Burada kalan iki şey
     yalnız burada söylenebilir: "görülmüyor" bir SİLME kararı değildir,
     ve liste bir tavana vurmuşsa kullanıcı bunu bilmelidir. */
  const dipNot = [
    m.gorunmeyen > 0
      && `${m.gorunmeyen} kayıt ${gorunmezEsikGun} gündür görülmüyor — silinmedi, gözlem olarak duruyor`,
    satirlar.length >= kuyrukTavani && `en yeni ${kuyrukTavani} kayıt gösteriliyor`,
  ].filter(Boolean).join(' · ');

  if (satirlar.length === 0) {
    return (
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi eyebrow="Varlık keşfi" baslik="İnceleme kuyruğu" />
        <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <TezgahHatti
            asamalar={KESIF_ADIMLARI.map((a) => ({ ad: a.ad }))}
            aktifIndeks={0}
            not="Kayıt CMDB'ye kendiliğinden yazılmaz; eşleştirme öneri üretir, kararı insan verir"
          />
          <PasiflikSatiri />
          <BosIlk
            cumle={'Henüz keşif kaydı yok. Aşağıdan pasif bir kaynağın dışa'
              + ' aktarımını yükleyin ya da bir bağlayıcı çalıştırın.'}
            eylem={<Link href="/saglik" className="ab-dugme">Bağlayıcıları aç</Link>} />
          <ElleAktarimFormu yazabilir={yazabilir} />
          <PasifGozlemFormu yazabilir={yazabilir} tesisler={tesisler} />
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
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Varlık keşfi · pasif kaynaklar · ${satirlar.length} kayıt`}
          vurgu={baslik.vurgu}
          vurguDurumu={baslik.durum}
          baslik={baslik.metin}
          sag={<EslestirmeDugmesi yazabilir={yazabilir} />}
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

        <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <TezgahHatti
            asamalar={KESIF_ADIMLARI.map((a) => ({ ad: a.ad }))}
            aktifIndeks={m.bekleyen > 0 ? 3 : eslestirilmemis > 0 ? 1 : 4}
            not="Kayıt CMDB'ye kendiliğinden yazılmaz; eşleştirme öneri üretir, kararı insan verir"
          />

          {/* ── SÜZGEÇLER · üç şerit, arka arkaya ──────────────────────
              Santral → grup → iş akışı merceği. Üçü de aynı gramerde
              (`.ab-suzgec`) ve toplamda ~150px; eskiden yalnız grup
              özeti 560px tutuyordu (UX-0004). */}
          <SantralSuzgeci
            tesisler={tesisler} aktif={tesisF} sec={setTesisF}
            yerisiz={satirlar.filter((x) => x.tesisId === null).length}
          />

          <GrupSuzgeci
            dagilim={dagilim} aktif={grup as KesifGrubu | null}
            sec={(g) => { setGrup(g); if (g !== null) setMercek('hepsi'); }}
            disaAktar={{
              excel: () => void exceleAktar(disaAd('xlsx'), [disaSayfa()]),
              csv: () => csvAktar(disaAd('csv'), disaSayfa()),
              sayi: suzulmus.length,
            }}
          />

          <Filtreler
            secenekler={MERCEKLER}
            aktif={grup === null ? mercek : ''}
            sec={(id) => { setMercek(id as Mercek); setGrup(null); }}
          />

          {/* Özet cümlesi ne olduğunu söyler; `kesifCumlesi` her zaman
              bir cümle döner (temiz veride bile) — koşul gerekmez. */}
          <p className="ab-dip" style={{ margin: '0 0 var(--s12)' }}>
            {kesifCumlesi(dagilim)}
            {eslestirilmemis > 0
              && ` ${eslestirilmemis} kayıt henüz eşleştirilmedi — eşleştirme`
                + ' öneri üretir, CMDB’ye yazmaz.'}
          </p>

          <TopluKararTepsisi
            secilenler={secilenler}
            cikar={(id) => setToplu((e) => e.filter((x) => x !== id))}
            temizle={() => setToplu([])}
          />

          {gosterilen.length === 0 ? (
            <BosFiltre temizle={() => { setMercek('hepsi'); setGrup(null); setTesisF(null); }} />
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

          {/* ── Kuyruğun ALTINDA: seyrek yapılan işler ─────────────────
              Politika sözü ve iki yükleme formu buradadır. İkisi de
              her ziyarette değil, ara sıra kullanılır; kuyruğun üstünde
              durmaları kullanıcının bu ekrana geliş sebebini üç ekran
              aşağı itiyordu (UX-0004). */}
          <PasiflikSatiri />
          <ElleAktarimFormu yazabilir={yazabilir} />
          <PasifGozlemFormu yazabilir={yazabilir} tesisler={tesisler} />
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
              ...(secili.kaynakGuveni !== null
                ? [{ etiket: 'Kaynağın beyanı', deger: guvenYazisi(secili.kaynakGuveni) }]
                : []),
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

          <YetkiKarari satir={secili} />

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

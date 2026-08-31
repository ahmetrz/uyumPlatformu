'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Im, Bar, Segment, Ipucu, Dugme, Alan, BosIlk, BosFiltre, type Durum,
} from '@/components/atlas/temel';
import { Tablo, type Kolon, type Satir } from '@/components/atlas/tablo';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceBagli, CekmeceEylemler,
} from '@/components/atlas/cekmece';
import { gorevOlustur } from '@/lib/eylemler2/gorev';
import { etiketle, tarihTR } from '@/lib/sabitler';
import {
  BAR_OK_ESIGI, KAPSAMA_ESIGI, TEST_ESIGI,
  barDurumu, bilinmeyenPayi, filoOzeti, haricListesi, hazirlik, kapsama, karsilastir,
  kirilimMetni, testGunu, testHucresi, toplanabilir, yuzde, type Santral,
} from './mantik';

/* O14 istemcisi. Tek canvas modülü: hazırlığa göre sıralı santral tablosu.
   Detay asla modalda değil 420px çekmecede açılır (06 §B4). */

/* Tasarım sözleşmesi: 22px işaretçi · 1fr santral · 200px kapsama barı ·
   190px son restore testi · 150px kapsam dışı sistem · 26px ▸
   (işaretçi ve chevron kolonlarını Tablo'nun kendisi ekler).             */
const KAPSAMA_KOL = 200;
const KOLONLAR: Kolon[] = [
  { baslik: 'Kapsama', genislik: `${KAPSAMA_KOL}px` },
  { baslik: 'Son restore testi', genislik: '190px' },
  // Kapsam dışı liste çekmecede tam haliyle var; dar alanda bu kolon düşer.
  { baslik: 'Kapsam dışı sistem', genislik: '150px', ikincil: true },
];

/* `.ipucu-sar` inline-flex olduğu için içindeki bar kendiliğinden
   genişleyemez; kolon genişliğinden biraz dar sabit bir kutu veriyoruz. */
const BAR_KUTU = KAPSAMA_KOL - 10;

const MERCEKLER = [
  { id: 'hepsi', ad: 'Tümü' },
  { id: 'hazirDegil', ad: 'Hazır değil' },
  { id: 'testYok', ad: 'Test yok' },
  { id: 'haric', ad: 'Kapsam dışı sistemi olan' },
];

/* Durum sözcüğünün yazılabildiği TEK yer çekmecenin kimlik bloğudur (06 §A2). */
const SOZ: Record<Durum, string> = {
  bd: 'Kurtarmaya hazır değil',
  md: 'Kısmi hazırlık',
  unk: 'Değerlendirilmedi',
  ok: 'Kurtarmaya hazır',
  pl: 'Planlı',
  tamam: 'Tamamlandı',
};

export default function YedeklemeIstemci({
  santraller, politikaSayisi,
}: { santraller: Santral[]; politikaSayisi: number }) {
  const [mercek, setMercek] = useState('hepsi');
  const [secili, setSecili] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const filo = useMemo(() => filoOzeti(santraller), [santraller]);

  const suzulmus = useMemo(() => santraller.filter((s) => {
    if (mercek === 'hazirDegil') return hazirlik(s) === 'bd';
    if (mercek === 'testYok') return Boolean(s.politika) && testGunu(s) === null;
    if (mercek === 'haric') return haricListesi(s.politika).length > 0;
    return true;
  }), [santraller, mercek]);

  /* Hazırlığa göre en kötü üstte. Sağlıklı olanlar (yalnız onlar) kuyruğa
     toplanır; hazır olmayan satır sıralamadan bağımsız üstte kalır. */
  const { gorunur, toplanan } = useMemo(() => {
    const sirali = [...suzulmus].sort(karsilastir);
    if (kuyrukAcik) return { gorunur: sirali, toplanan: [] as Santral[] };
    return {
      gorunur: sirali.filter((s) => !toplanabilir(s)),
      toplanan: sirali.filter(toplanabilir),
    };
  }, [suzulmus, kuyrukAcik]);

  const secilen = santraller.find((s) => s.id === secili) ?? null;

  const satirlar: Satir[] = gorunur.map((s) => {
    const oran = kapsama(s);
    const bilinmeyen = s.bilinmeyen;
    const test = testHucresi(s);
    const haric = haricListesi(s.politika);
    const im = hazirlik(s);
    return {
      id: s.id,
      durum: im,
      kenar: im,
      konu: s.ad,
      // Alt satır durumu tekrar etmez, NE olduğunu yazar (06 §A2).
      alt: `${s.kod} · ${s.toplam} varlık${bilinmeyen > 0 ? ` · ${bilinmeyen} bilinmiyor` : ''}`,
      hucreler: [
        <KapsamaHucresi key="k" santral={s} oran={oran} />,
        <span key="t" style={{ fontWeight: test.renk ? 600 : 400,
          color: test.renk ? `var(--${test.renk})` : 'var(--i2)' }}>{test.yazi}</span>,
        <HaricHucresi key="h" liste={haric} politikaVar={Boolean(s.politika)} />,
      ],
    };
  });

  const baslik = filo.testYok > 0
    ? { vurgu: `${filo.testYok} santral`, ad: 'hiç restore testi görmedi' }
    : filo.hazirDegil > 0
      ? { vurgu: `${filo.hazirDegil} santral`, ad: 'kurtarmaya hazır değil' }
      : filo.kismi > 0
        ? { vurgu: `${filo.kismi} santral`, ad: 'kısmi hazırlıkta' }
        : { vurgu: `${santraller.length} santral`, ad: 'kurtarmaya hazır' };

  const filtreAktif = mercek !== 'hepsi';

  return (
    <>
      <main style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Yedekleme & kurtarma · ${santraller.length} santral`}
          vurgu={baslik.vurgu}
          baslik={baslik.ad}
          metrikler={[
            // Yüzde gösterilen her yerde bilinmeyen payı da gösterilir (06 §A3).
            { deger: yuzde(filo.kapsama),
              yazi: `Kapsama · bilinmeyen ${yuzde(filo.bilinmeyenPayi)}` },
            { deger: filo.bayatTest, yazi: `Test ${TEST_ESIGI}g+`,
              durum: filo.bayatTest > 0 ? 'bd' : undefined },
            { deger: filo.haricSistem, yazi: 'Kritik sistem dışta',
              durum: filo.haricSistem > 0 ? 'md' : undefined },
          ]}
        />

        <div style={{ padding: '0 var(--gutter-op)' }}>
          <Filtreler
            secenekler={MERCEKLER}
            aktif={mercek}
            sec={(id) => { setMercek(id); setKuyrukAcik(false); }}
            kapsam={
              <span className="t-caption">
                {filo.yedekli} / {filo.toplam} varlık yedekli
              </span>
            }
          />
        </div>

        <div className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          {politikaSayisi === 0 || santraller.length === 0 ? (
            <BosIlk
              cumle="Yedekleme kaydı yok."
              // Yedekleme kayıtları dışarıdan aktarılır; eylem aktarım yüzeyine gider.
              eylem={
                <Link href="/ice-aktarim" className="dg dg-birincil"
                  style={{ display: 'inline-block' }}>
                  Yedekleme API&apos;sini bağla
                </Link>
              }
            />
          ) : gorunur.length === 0 && toplanan.length === 0 ? (
            filtreAktif ? <BosFiltre temizle={() => setMercek('hepsi')} />
              : <BosIlk cumle="Yedekleme kaydı yok." />
          ) : (
            <Tablo
              kolonlar={KOLONLAR}
              konuBasligi="Santral"
              satirlar={satirlar}
              secili={secili}
              sec={(id) => setSecili((o) => (o === id ? null : id))}
              kuyruk={toplanan.length > 0
                ? { metin: `+${toplanan.length} santral · kapsama tam, restore kanıtı güncel`,
                  ac: () => setKuyrukAcik(true) }
                : null}
              dipNot={dipNot(filo)}
            />
          )}
        </div>
      </main>

      {secilen && <SantralCekmecesi santral={secilen} kapat={() => setSecili(null)} />}
    </>
  );
}

function dipNot(filo: ReturnType<typeof filoOzeti>): string {
  const parcalar = ['Satıra tıklayınca çekmece · kapsama barında tür kırılımı'];
  if (filo.testYok > 0) parcalar.push(`${filo.testYok} santralde hiç restore testi kaydı yok`);
  if (filo.bilinmeyen > 0) {
    parcalar.push(`${filo.bilinmeyen} varlığın yedek durumu bilinmiyor — paydada, kapsamada değil`);
  }
  if (filo.politikasiz > 0) parcalar.push(`${filo.politikasiz} santralin politikası yok`);
  return parcalar.join(' · ');
}

/* ── Hücreler ─────────────────────────────────────────────────────────── */

function KapsamaHucresi({ santral, oran }: { santral: Santral; oran: number | null }) {
  if (oran === null) {
    // unknown ≠ zero: %0 barı değil bilinmeyen elması + em tire.
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s10)' }}>
        <Im durum="unk" ad="Kapsama ölçülmedi" />
        <span style={{ color: 'var(--i3)' }}>—</span>
      </span>
    );
  }
  return (
    <Ipucu genis metin={kirilimMetni(santral)}>
      {/* blok kutu: `.ilerleme` esnek öğe olarak değil, kutunun tamamını
          kaplayan blok olarak açılsın ki iz (`flex:1`) genişleyebilsin. */}
      <span style={{ display: 'block', width: BAR_KUTU }}>
        <Bar oran={oran} durum={barDurumu(oran)} deger={yuzde(oran)} />
      </span>
    </Ipucu>
  );
}

function HaricHucresi({ liste, politikaVar }: { liste: string[]; politikaVar: boolean }) {
  if (!politikaVar) return <span style={{ color: 'var(--i3)' }}>—</span>;
  if (liste.length === 0) return <span style={{ color: 'var(--i2)' }}>tam</span>;
  return (
    <Ipucu genis metin={liste.join(' · ')}>
      <span style={{ color: 'var(--md)', fontWeight: 600 }}>{liste.length} dışta</span>
    </Ipucu>
  );
}

/* ── Çekmece · RPO/RTO · takvim · kapsam dışı · kanıt · test planla ───── */

function SantralCekmecesi({ santral, kapat }: { santral: Santral; kapat: () => void }) {
  const im = hazirlik(santral);
  const oran = kapsama(santral);
  const bilinmeyen = bilinmeyenPayi(santral);
  const gun = testGunu(santral);
  const haric = haricListesi(santral.politika);
  const p = santral.politika;

  /* Kimlik bloğu durumu KELİMEYLE söyleyebilen tek yer; sözcük mümkün olan
     en dar gerekçeyi taşır ki satırdaki işaretçiyle örtüşsün. */
  const soz = !p ? 'Yedekleme politikası yok'
    : gun === null ? 'Restore testi yok'
      : gun > TEST_ESIGI ? `Restore kanıtı ${gun} gün eski`
        : santral.sonTest?.sonuc === 'basarisiz' ? 'Son restore testi başarısız'
          : SOZ[im];

  return (
    <Cekmece kod={`${santral.kod} · Yedekleme & DR`} kapat={kapat}>
      <CekmeceKimlik
        durum={im}
        soz={soz}
        baslik={santral.ad}
        cumle={`${santral.yedekli} varlık yedekleme kapsamında, ${santral.yedeksiz} varlık kapsam `
          + `dışında ve ${santral.bilinmeyen} varlığın yedek durumu bilinmiyor.`}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Kapsama',
          deger: `${yuzde(oran)} · bilinmeyen ${yuzde(bilinmeyen)}`,
          durum: oran !== null && oran < KAPSAMA_ESIGI ? 'md'
            : oran !== null && oran >= BAR_OK_ESIGI ? 'ok' : undefined },
        { etiket: 'RPO · kabul edilen veri kaybı',
          deger: p?.rpoSaat != null ? `${p.rpoSaat} saat` : '—',
          durum: p?.rpoSaat == null ? 'unk' : undefined },
        { etiket: 'RTO · hedeflenen kurtarma',
          deger: p?.rtoSaat != null ? `${p.rtoSaat} saat` : '—',
          durum: p?.rtoSaat == null ? 'unk' : undefined },
        { etiket: 'Sıklık', deger: p?.siklik ? etiketle(p.siklik) : '—' },
        { etiket: 'Saklama', deger: p?.saklamaGun != null ? `${p.saklamaGun} gün` : '—' },
        { etiket: 'Hedef', deger: p?.hedef ? etiketle(p.hedef) : '—' },
      ]} />

      <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Son restore testi</p>
        {santral.sonTest ? (
          <div style={{ borderLeft: 'var(--bw-edge) solid var(--hr2)', paddingLeft: 'var(--s12)',
            display: 'grid', gap: 'var(--s4)' }}>
            <span style={{ fontSize: 'var(--t-field)', fontWeight: 600,
              color: gun !== null && gun > TEST_ESIGI ? 'var(--bd)' : 'var(--ink)' }}>
              {tarihTR(santral.sonTest.zaman)} · {gun} gün önce
            </span>
            <span className="mono" style={{ fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
              {etiketle(santral.sonTest.sonuc)}
              {santral.sonTest.sureDk != null && ` · ${santral.sonTest.sureDk} dk`}
            </span>
            {santral.sonTest.not && (
              <span style={{ fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
                {santral.sonTest.not}
              </span>
            )}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
            Kayıt yok — bu santralde yedeğin geri döndüğü hiç kanıtlanmadı.
          </p>
        )}
      </div>

      <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Yedekleme koşuları</p>
        {santral.sonKosu ? (
          <>
            <Segment ok={santral.kosuOzeti.basarili} md={santral.kosuOzeti.kismi}
              bd={santral.kosuOzeti.basarisiz} />
            <p className="mono" style={{ margin: 'var(--s10) 0 0', fontSize: 'var(--t-label)',
              color: 'var(--i3)' }}>
              Son koşu {tarihTR(santral.sonKosu.zaman)} · {etiketle(santral.sonKosu.durum)}
              {santral.sonKosu.boyutMb != null
                && ` · ${Math.round(santral.sonKosu.boyutMb).toLocaleString('tr-TR')} MB`}
            </p>
            {santral.sonKosu.hata && (
              <p style={{ margin: 'var(--s8) 0 0', fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
                {santral.sonKosu.hata}
              </p>
            )}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
            Koşu kaydı yok.
          </p>
        )}
      </div>

      <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Kapsam dışı sistemler</p>
        {/* İki ayrı kaynak: politikanın kendi beyanı ve envanterin söylediği.
            Ayrı etiketlenir ki "politikada tam" ile "sahada yedeksiz" karışmasın. */}
        <p className="mono" style={{ margin: '0 0 var(--s8)', fontSize: 'var(--t-label)',
          color: 'var(--i3)' }}>Politikada hariç tutulan</p>
        {haric.length === 0 ? (
          <p style={{ margin: '0 0 var(--s16)', fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
            Beyan edilmiş kapsam dışı sistem yok.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s10)', marginBottom: 'var(--s16)' }}>
            {haric.map((x) => (
              <div key={x} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
                alignItems: 'start', gap: 'var(--s8)' }}>
                <span style={{ paddingTop: 3 }}><Im durum="md" ad="Politikada hariç tutulmuş" /></span>
                <span style={{ fontSize: 'var(--t-field)' }}>{x}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mono" style={{ margin: '0 0 var(--s8)', fontSize: 'var(--t-label)',
          color: 'var(--i3)' }}>Envanterde yedeği doğrulanmamış yüksek/kritik varlık</p>
        {santral.acikVarliklar.length === 0 ? (
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
            Yüksek ve kritik varlıkların tamamı yedekli.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 'var(--s10)' }}>
            {santral.acikVarliklar.map((v) => (
              <div key={v.etiket} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
                alignItems: 'start', gap: 'var(--s8)' }}>
                <span style={{ paddingTop: 3 }}>
                  <Im durum={v.yedekDurumu === 'bilinmiyor' ? 'unk' : 'bd'}
                    ad={v.yedekDurumu === 'bilinmiyor' ? 'Yedek durumu bilinmiyor' : 'Yedeği yok'} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 'var(--t-field)' }}>{v.ad}</span>
                  <span className="mono" style={{ display: 'block', marginTop: 2,
                    fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                    {v.etiket} · {etiketle(v.kritiklik)} kritiklik
                    {v.yedekDurumu === 'bilinmiyor' ? ' · yedek bilinmiyor' : ' · yedek yok'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <CekmeceBagli kayitlar={[
        { id: 'tesis', kod: santral.kod, alt: santral.ad, yol: `/tesisler/${santral.id}` },
        { id: 'envanter', kod: 'Varlık envanteri', alt: `${santral.toplam} kayıt`, yol: '/envanter' },
      ]} />

      <TestPlanla santral={santral} />
    </Cekmece>
  );
}

/* `Test planla` yeni bir mutasyon yazmaz: var olan gorevOlustur server
   action'ını `dogrulama` tipiyle çağırır. Yetki (uyum/yazma + tesis kapsamı)
   sunucuda zaten kontrol edilir; burada yalnız yüzeyi kapatıyoruz. */
function TestPlanla({ santral }: { santral: Santral }) {
  const [tarih, setTarih] = useState('');
  const [calisiyor, setCalisiyor] = useState(false);
  const [sonuc, setSonuc] = useState<{ ok: boolean; mesaj: string } | null>(null);

  if (!santral.planlanabilir) {
    return (
      <CekmeceEylemler dipNot={'Restore testi planlamak uyum yazma yetkisi ister; '
        + 'bu santral kapsamında yetkiniz yok.'} />
    );
  }

  async function planla() {
    setCalisiyor(true);
    setSonuc(null);
    const r = await gorevOlustur({
      baslik: `Restore testi · ${santral.ad}`,
      tip: 'dogrulama',
      tesisId: santral.id,
      sonTarih: tarih || null,
    });
    setCalisiyor(false);
    setSonuc(r.ok
      ? { ok: true, mesaj: 'Doğrulama görevi açıldı ve denetim izine yazıldı.' }
      : { ok: false, mesaj: r.hata });
  }

  return (
    <CekmeceEylemler
      birincil={
        <div style={{ display: 'grid', gap: 'var(--s12)' }}>
          <Alan etiket="Hedef tarih">
            <input className="gr" type="date" value={tarih}
              onChange={(e) => { setTarih(e.target.value); setSonuc(null); }} />
          </Alan>
          <Dugme tur="cekmece" disabled={calisiyor} onClick={planla}>
            {calisiyor ? 'Planlanıyor…' : 'Test planla'}
          </Dugme>
          {sonuc && (
            <p style={{ margin: 0, fontSize: 'var(--t-field)',
              color: sonuc.ok ? 'var(--ok)' : 'var(--bd)' }} role="status">
              {sonuc.mesaj}
            </p>
          )}
        </div>
      }
      dipNot={'Görev doğrulama kuyruğuna düşer; test yürütülüp sonucu kaydedilene kadar '
        + 'bu santralin restore kanıtı değişmez.'}
    />
  );
}

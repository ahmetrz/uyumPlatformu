'use client';
import Link from 'next/link';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Dugme, BosIlk } from '@/components/kabuk/temel';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi, KipDegistir } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { aktarimYukle, aktarimOnayla, aktarimReddet } from '@/lib/eylemler';
import { zamanTR } from '@/lib/sabitler';
import {
  DURUM_IMI, DURUM_SOZU, altSatir, bekliyorMu, kimlikCumlesi, metrikleriHesapla,
  type Aktarim,
} from './mantik';

/* Regülasyon MADDE aktarımı — yükle → doğrula → incele → onayla.

   Ekran iki modüllü (06 §A1): üstte aktarım kuyruğu tablosu, altta seçili
   dosyanın çalışma yüzeyi (işlenecek satırlar / elenenler). Durum sözcüğü
   canvas'ta GEÇMEZ — yalnız çekmecenin kimlik bloğunda yazılır.

   Hiçbir madde otomatik yayına girmez: doğrulanan satırlar onay kuyruğunda
   bekler, onay ayrı yetki (tanimlar/onay) ister ve tek transaction içinde
   yürür. Aynı kod ikinci kez gelirse ÇOĞALTILMAZ, güncellenir. */

/** 06 §A3: tabloda 5–9 satır görünür, kalanı kuyrukta toplanır. */
const GORUNUR_BUTCE = 7;

const KOLONLAR: Kolon[] = [
  { baslik: 'Okunan', genislik: '70px', sag: true },
  { baslik: 'İşlenecek', genislik: '80px', sag: true },
  { baslik: 'Elenen', genislik: '64px', sag: true },
  { baslik: 'Yükleyen', genislik: '150px', ikincil: true },
];

type Kip = 'islenecek' | 'elenen';

export default function IceAktarimIstemci({
  aktarimlar, regulasyonlar, alanKodlari, onizlemeButcesi, yukleyebilir, onaylayabilir,
}: {
  aktarimlar: Aktarim[];
  regulasyonlar: { id: string; kod: string; ad: string }[];
  alanKodlari: string[];
  onizlemeButcesi: number;
  yukleyebilir: boolean;
  onaylayabilir: boolean;
}) {
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const [regId, setRegId] = useState('');
  const [secili, setSecili] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const dosyaRef = useRef<HTMLInputElement>(null);

  const secilen = aktarimlar.find((a) => a.id === secili) ?? null;
  const m = useMemo(() => metrikleriHesapla(aktarimlar), [aktarimlar]);

  /* Karar bekleyen dosyalar ASLA kuyruğa inmez; tamamlanmış aktarımlar
     tek satırda toplanır (06 §A3). */
  const { gorunur, toplanan } = useMemo(() => {
    const bekleyen = aktarimlar.filter(bekliyorMu);
    const kalan = aktarimlar.filter((a) => !bekliyorMu(a));
    if (kuyrukAcik) return { gorunur: [...bekleyen, ...kalan], toplanan: [] as Aktarim[] };
    const slot = Math.max(0, GORUNUR_BUTCE - bekleyen.length);
    return { gorunur: [...bekleyen, ...kalan.slice(0, slot)], toplanan: kalan.slice(slot) };
  }, [aktarimlar, kuyrukAcik]);

  const satirlar: Satir[] = gorunur.map((a) => ({
    id: a.id,
    durum: DURUM_IMI[a.durum] ?? 'unk',
    kenar: DURUM_IMI[a.durum] ?? 'unk',
    konu: a.kaynakAdi,
    alt: altSatir(a, zamanTR(a.zaman)),
    hucreler: [
      <Mono key="o">{a.okunan}</Mono>,
      a.islenecek > 0 ? <Mono key="i">{a.islenecek}</Mono> : <Bos key="i" />,
      a.elenen > 0 ? <Mono key="e" renk="var(--bd)">{a.elenen}</Mono> : <Bos key="e" />,
      a.yukleyen ?? <Bilinmiyor key="y" />,
    ],
  }));

  function yukle() {
    const dosya = dosyaRef.current?.files?.[0];
    if (!regId) { setHata('Regülasyon seçin — madde hedefsiz aktarılamaz'); return; }
    if (!dosya) { setHata('Dosya seçin (Excel veya CSV)'); return; }
    const form = new FormData();
    form.set('dosya', dosya);
    form.set('regulasyonId', regId);
    calistir(() => aktarimYukle(form), () => {
      if (dosyaRef.current) dosyaRef.current.value = '';
    });
  }

  /* Şablon dosyanın beklediği kolonları gösterir; tanımlı kapsam alanları
     sunucudan gelir, şablonda uydurulmaz. */
  function sablonIndir() {
    const csv = ['madde_kodu;ust_madde_kodu;baslik;metin;alan;kanit_tipi',
      `4;;Varlık Yönetimi;Bölüm başlığı;${alanKodlari.join('/')};`,
      `4.1;4;Varlık Envanteri;Tüm varlıklar envanterde izlenir.;${alanKodlari[0] ?? 'BT'};kayit`,
    ].join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'madde-sablonu.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        {/* Yükleme bloğu iki satıra katlanır: tek satırda 470px yer kaplıyor
            ve metrik şeridini sıkıştırıp etiket satırlarını kırıyordu. */}
        <EkranBasligi
          eyebrow={`Madde içe aktarımı · ${m.dosya} dosya`}
          vurgu={m.bekleyen > 0 ? `${m.bekleyen} dosya` : `${m.dosya} dosya`}
          vurguDurumu={m.bekleyen > 0 ? 'md' : undefined}
          baslik={m.bekleyen > 0 ? 'karar bekliyor' : 'kütükte'}
          metrikler={[
            { deger: m.yeni, yazi: 'Yeni madde' },
            { deger: m.guncelleme, yazi: 'Güncelleme', durum: m.guncelleme > 0 ? 'md' : undefined },
            { deger: m.elenen, yazi: 'Elenen', durum: m.elenen > 0 ? 'bd' : undefined },
          ]}
          sag={yukleyebilir ? (
            <div style={{ display: 'grid', gap: 'var(--s8)', width: 268 }}>
              <select className="ab-gr" value={regId} aria-label="Hedef regülasyon"
                style={{ padding: '7px 9px' }}
                onChange={(e) => setRegId(e.target.value)}>
                <option value="">Regülasyon seçin…</option>
                {regulasyonlar.map((r) => (
                  <option key={r.id} value={r.id}>{r.kod} — {r.ad}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 'var(--s10)', alignItems: 'center' }}>
                <input ref={dosyaRef} type="file" accept=".xlsx,.xls,.csv"
                  className="ab-gr" style={{ minWidth: 0, flex: 1, padding: '7px 9px' }}
                  aria-label="Madde dosyası (Excel/CSV)" />
                <Dugme tur="birincil" disabled={bekliyor} onClick={yukle}>
                  {bekliyor ? 'Doğrulanıyor…' : 'Yükle'}
                </Dugme>
              </div>
            </div>
          ) : undefined}
        />

        <div className="ab-ekran-govde" style={{ paddingTop: 'var(--s22)' }}>
          {hata && <p className="ab-gr-hata" role="alert" style={{ marginTop: 0 }}>{hata}</p>}

          {aktarimlar.length === 0 ? (
            <BosIlk
              cumle={yukleyebilir
                ? 'Henüz dosya yüklenmedi. Regülasyonu seçip Excel/CSV yükleyin; satırlar doğrulanır, onaydan sonra maddeler yayına girer.'
                : 'Henüz dosya yüklenmedi.'}
              eylem={yukleyebilir
                ? <Dugme onClick={sablonIndir}>Şablonu indir</Dugme>
                : undefined}
            />
          ) : (
            <>
              <Tablo
                konuBasligi="Dosya"
                kolonlar={KOLONLAR}
                satirlar={satirlar}
                secili={secili}
                sec={(id) => setSecili((o) => (o === id ? null : id))}
                kuyruk={toplanan.length > 0
                  ? { metin: `+${toplanan.length} tamamlanmış aktarım`, ac: () => setKuyrukAcik(true) }
                  : null}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s16)',
                padding: 'var(--s14) 0 0' }}>
                <p className="ab-dip" style={{ margin: 0, flex: 1, minWidth: 0 }}>
                  {dipNot(gorunur.length, m.raporsuz)}
                </p>
                {yukleyebilir && (
                  <button type="button" className="ab-dugme" onClick={sablonIndir}>
                    ⤓ Excel/CSV şablonu
                  </button>
                )}
              </div>
              <p className="ab-dip" style={{ marginTop: 'var(--s8)' }}>
                Bu hat regülasyon MADDELERİNİ taşır · CMDB varlık aktarımı{' '}
                <Link href="/varlik-aktarim" style={{ textDecoration: 'underline' }}>
                  /varlik-aktarim
                </Link>{' '}ekranındadır · aynı madde kodu çoğaltılmaz, güncellenir
              </p>
            </>
          )}

          {/* Çalışma yüzeyi seçili dosyaya bağlı; `key` ile kip sıfırlanır. */}
          {secilen && (
            <CalismaYuzeyi key={secilen.id} a={secilen} butce={onizlemeButcesi} />
          )}
        </div>
      </main>

      {secilen && (
        <AktarimCekmecesi
          a={secilen}
          bekliyor={bekliyor}
          onaylayabilir={onaylayabilir}
          calistir={calistir}
          kapat={() => setSecili(null)}
        />
      )}
    </>
  );
}

function dipNot(gorunur: number, raporsuz: number): string {
  const parcalar = [`${gorunur} satır görünüyor`];
  // Okunamayan rapor sıfır satır sayılmaz: kaç dosyanın raporu bozuk, söylenir.
  if (raporsuz > 0) parcalar.push(`${raporsuz} dosyanın raporu okunamadı`);
  parcalar.push('onay tek transaction içinde yürür');
  return parcalar.join(' · ');
}

/* ═══ Çalışma yüzeyi ═════════════════════════════════════════════════════
   Seçili dosyanın doğrulama çıktısı. Detay modalda açılmaz (06 §B4) —
   canvas'ın ikinci modülüdür. */

function CalismaYuzeyi({ a, butce }: { a: Aktarim; butce: number }) {
  const [kip, setKip] = useState<Kip>(a.islenecek > 0 ? 'islenecek' : 'elenen');

  return (
    <section style={{ marginTop: 'var(--s30)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        {a.kaynakAdi} · {a.okunan} satır okundu · {a.regKod}
      </p>
      <KipDegistir
        aktif={kip}
        sec={(id) => setKip(id as Kip)}
        secenekler={[
          { id: 'islenecek', ad: `İşlenecek ${a.islenecek}` },
          { id: 'elenen', ad: `Elenen ${a.elenen}` },
        ]}
      />

      <div style={{ marginTop: 'var(--s20)' }}>
        {kip === 'islenecek' ? <Islenecek a={a} butce={butce} /> : <ElenenListesi a={a} />}
      </div>
    </section>
  );
}

function Islenecek({ a, butce }: { a: Aktarim; butce: number }) {
  if (a.raporHatasi) {
    return (
      <p className="ab-gr-hata" style={{ margin: 0 }}>
        Rapor okunamadı: {a.raporHatasi} — satır listesi gösterilemiyor.
      </p>
    );
  }
  if (a.islenecek === 0) {
    return <BosIlk cumle="Doğrulamayı geçen satır yok. Elenen listesine bakın." />;
  }
  return (
    <>
      <DuzTablo
        basliklar={['Madde', 'Başlık', 'Kapsam alanı', 'İşlem']}
        genislikler="150px 1.6fr 130px 160px"
        satirlar={a.onizleme.map((s) => [
          <Mono key="k">{s.kod}</Mono>,
          s.baslik,
          s.alanlar.length > 0
            ? <Mono key="a">{s.alanlar.join(' · ')}</Mono>
            : <Bos key="a" />,
          s.islem === 'yeni'
            ? <span key="i">yeni madde</span>
            : <span key="i" style={{ color: 'var(--md)' }}>mevcut maddeyi günceller</span>,
        ])}
      />
      <p className="ab-dip">
        İlk {Math.min(butce, a.onizleme.length)} satır gösteriliyor · toplam {a.islenecek} satır
        işlenecek ({a.yeni} yeni, {a.guncelleme} güncelleme).
      </p>
    </>
  );
}

function ElenenListesi({ a }: { a: Aktarim }) {
  if (a.elenen === 0) {
    return <BosIlk cumle="Elenen satır yok — tüm satırlar doğrulamayı geçti." />;
  }
  if (a.elenenler.length === 0) {
    return (
      <p className="ab-dip" style={{ marginTop: 0 }}>
        {a.elenen} satır elendi; sebep listesi bu kayıtta tutulmamış.
      </p>
    );
  }
  return (
    <>
      <DuzTablo
        basliklar={['Satır', 'Elenme sebebi']}
        genislikler="80px 1fr"
        satirlar={a.elenenler.map((e) => [
          <Mono key="n">{e.satir}</Mono>,
          <span key="s" style={{ color: 'var(--bd)' }}>{e.sebep}</span>,
        ])}
      />
      <p className="ab-dip">
        Bu satırlar yazılmaz; kalan satırlar onayla birlikte yayına girer.
        {a.elenenKalan > 0 && ` +${a.elenenKalan} satır daha (listede gösterilmiyor).`}
      </p>
    </>
  );
}

/* ── Çekmece · 420px, kimlik → alanlar → karar ───────────────────────── */

function AktarimCekmecesi({
  a, bekliyor, onaylayabilir, calistir, kapat,
}: {
  a: Aktarim;
  bekliyor: boolean;
  onaylayabilir: boolean;
  calistir: ReturnType<typeof useEylem>['calistir'];
  kapat: () => void;
}) {
  const im = DURUM_IMI[a.durum] ?? 'unk';
  const karar = bekliyorMu(a);

  const alanlar: { etiket: string; deger: ReactNode; durum?: 'ok' | 'md' | 'bd' | 'unk' }[] = [
    { etiket: 'Regülasyon', deger: `${a.regKod} · ${a.regAd}` },
    { etiket: 'Kaynak', deger: `${a.kaynakTipi === 'excel' ? 'Excel/CSV' : 'Otomatik'} · ${a.okunan} satır` },
    {
      etiket: 'İşlenecek / elenen',
      deger: `${a.islenecek} / ${a.elenen}`,
      durum: a.elenen > 0 ? 'bd' : undefined,
    },
    { etiket: 'Yükleyen', deger: a.yukleyen ?? 'bilinmiyor', durum: a.yukleyen ? undefined : 'unk' },
  ];
  if (a.durum === 'onaylandi') {
    alanlar.push({ etiket: 'Sonuç', deger: `+${a.eklenen} yeni · ~${a.guncellenen} güncelleme` });
  }

  return (
    <Cekmece kod={a.kaynakAdi} kapat={kapat}>
      <CekmeceKimlik
        durum={im}
        soz={DURUM_SOZU[a.durum] ?? a.durum}
        baslik={a.kaynakAdi}
        cumle={kimlikCumlesi(a)}
      />
      <CekmeceAlanlar alanlar={alanlar} />

      {karar && onaylayabilir && (
        <CekmeceEylemler
          birincil={
            <Dugme tur="tam" disabled={bekliyor || a.islenecek === 0}
              onClick={() => calistir(() => aktarimOnayla({ id: a.id }), kapat)}>
              {bekliyor ? 'Yayına alınıyor…' : `Onayla ve yayınla (${a.islenecek} madde)`}
            </Dugme>
          }
          ikincil={
            <Dugme tur="ret" disabled={bekliyor}
              onClick={() => calistir(() => aktarimReddet({ id: a.id }), kapat)}>
              Reddet
            </Dugme>
          }
          dipNot={'Onay ve ret denetim izine düşer. Satırlar tek transaction içinde yazılır: '
            + 'biri patlarsa hiçbiri yazılmaz, yarım aktarım oluşmaz.'}
        />
      )}
      {karar && !onaylayabilir && (
        <CekmeceEylemler dipNot="Onay ve ret için tanımlar/onay yetkisi gerekir." />
      )}
    </Cekmece>
  );
}

/* ── Küçük yardımcılar ──────────────────────────────────────────────── */

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;
const Bilinmiyor = () => <span style={{ color: 'var(--i3)' }}>bilinmiyor</span>;

function Mono({ children, renk }: { children: ReactNode; renk?: string }) {
  return (
    <span style={{ fontFamily: 'var(--veri)', fontSize: 'var(--t-code)', color: renk,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
      {children}
    </span>
  );
}

/** Seçilemeyen düz veri tablosu: kart sarmalayıcısı, zebra ve pill yok;
    geniş içerik kendi kabında yatay kayar. */
function DuzTablo({
  basliklar, genislikler, satirlar,
}: { basliklar: string[]; genislikler: string; satirlar: ReactNode[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 620 }}>
        <div style={{ display: 'grid', gridTemplateColumns: genislikler,
          gap: 'var(--s14)', padding: '0 0 var(--s8)',
          borderBottom: 'var(--bw-strong) solid var(--hr2)' }}>
          {basliklar.map((b) => <span key={b} className="kolonbas">{b}</span>)}
        </div>
        {satirlar.map((s, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: genislikler,
            gap: 'var(--s14)', padding: 'var(--s10) 0', alignItems: 'center',
            fontSize: 'var(--t-cell)', borderBottom: 'var(--bw-hair) solid var(--hr)' }}>
            {s.map((h, j) => <span key={j} style={{ minWidth: 0 }}>{h}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}

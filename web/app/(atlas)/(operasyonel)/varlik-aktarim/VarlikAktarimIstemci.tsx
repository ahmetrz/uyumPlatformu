'use client';
import { useMemo, useRef, useState } from 'react';
import { Dugme, BosIlk, Alan, type Durum } from '@/components/abacus/temel';
import { Tablo, type Kolon, type Satir } from '@/components/abacus/tablo';
import { EkranBasligi, KipDegistir } from '@/components/abacus/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceEylemler,
} from '@/components/abacus/panel';
import { useEylem } from '@/components/useEylem';
import { zamanTR } from '@/lib/sabitler';
import {
  varlikAktarimYukle, varlikAktarimEsle, varlikAktarimOnayla, varlikAktarimReddet,
} from '@/lib/eylemler2/varlikAktarim';

/* CMDB toplu aktarımı — yükle → eşle → doğrula → önizle → onayla.

   Ekran iki modüllü (06 §A1): üstte aktarım kuyruğu tablosu, altta seçili
   aktarımın çalışma yüzeyi (eşleme / önizleme / hata / yinelenen). Durum
   sözcüğü canvas'ta GEÇMEZ — yalnız çekmecenin kimlik bloğunda yazılır.

   Kolon eşlemesi otomatik uygulanmaz: sunucu öneri üretir, kullanıcı
   onaylayana kadar hiçbir satır doğrulanmış sayılmaz ve hiçbir varlık
   yazılmaz. Onay adımı ayrı yetki (envanter/onay) ister. */

/** 06 §A3: tabloda 5–9 satır görünür, kalanı kuyrukta toplanır. */
const GORUNUR_BUTCE = 7;

export type AlanSecenegi = {
  anahtar: string; etiket: string; tip: string;
  zorunlu: boolean; sozluk: string[] | null;
};

export type OnizlemeSatiri = {
  satirNo: number; etiket: string; islem: 'yeni' | 'guncelleme';
  ad: string | null; tur: string | null; tesis: string | null;
  kritiklik: string | null; eslesmeAlani: string | null; bosAlanlar: string[];
};

export type Aktarim = {
  id: string; dosyaAdi: string; kaynakTipi: string; durum: string;
  yukleyen: string | null; onaylayan: string | null;
  zaman: string; onayZamani: string | null;
  okunan: number; gecerli: number; hatali: number;
  yinelenen: number; eklenen: number; guncellenen: number;
  basliklar: string[];
  esleme: Record<string, string>;
  hataMesaji: string | null;
  onizleme: OnizlemeSatiri[];
  hatalar: { satirNo: number; etiket: string | null; sebep: string }[];
  hataKalan: number;
  yinelenenler: { satirNo: number; etiket: string; hedefEtiket: string; eslesmeAlani: string }[];
  yinelenenKalan: number;
  duzenlenebilir: boolean; onaylanabilir: boolean;
};

const DURUM_IMI: Record<string, Durum> = {
  eslesme: 'pl',
  dogrulama_bekliyor: 'md',
  onaylandi: 'tamam',
  reddedildi: 'unk',
  hata: 'bd',
};

/* Durum sözcükleri — YALNIZ çekmecede kullanılır (06 §A2). */
const DURUM_SOZU: Record<string, string> = {
  eslesme: 'Kolon eşlemesi bekliyor',
  dogrulama_bekliyor: 'Onay bekliyor',
  onaylandi: 'Aktarıldı',
  reddedildi: 'Reddedildi',
  hata: 'Geri alındı',
};

const KOLONLAR: Kolon[] = [
  { baslik: 'Satır', genislik: '64px', sag: true },
  { baslik: 'Geçerli', genislik: '70px', sag: true },
  { baslik: 'Hata', genislik: '60px', sag: true },
  { baslik: 'Yükleyen', genislik: '150px', ikincil: true },
];

type Kip = 'esleme' | 'onizleme' | 'hatalar' | 'yinelenenler';

export default function VarlikAktarimIstemci({
  aktarimlar, alanlar, yukleyebilir, onizlemeButcesi, tanimliKodlar, kapsamli = false,
}: {
  aktarimlar: Aktarim[];
  alanlar: AlanSecenegi[];
  yukleyebilir: boolean;
  onizlemeButcesi: number;
  tanimliKodlar: { tur: string[]; tesis: string[]; sistem: string[]; bolge: string[] };
  /** listeler santral kapsamıyla daraltıldı mı — boş listenin SÖZÜ değişir */
  kapsamli?: boolean;
}) {
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const [secili, setSecili] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);
  const dosyaRef = useRef<HTMLInputElement>(null);

  const secilen = aktarimlar.find((a) => a.id === secili) ?? null;

  /* ── metrikler · dördü de kayıtlardan gelir (02-components §3: en fazla 4) */
  const bekleyenler = aktarimlar.filter(
    (a) => a.durum === 'eslesme' || a.durum === 'dogrulama_bekliyor');
  const bekleyenGecerli = bekleyenler.reduce((t, a) => t + a.gecerli, 0);
  const bekleyenHatali = bekleyenler.reduce((t, a) => t + a.hatali, 0);
  const bekleyenYinelenen = bekleyenler.reduce((t, a) => t + a.yinelenen, 0);

  const { gorunur, toplanan } = useMemo(() => {
    if (kuyrukAcik) return { gorunur: aktarimlar, toplanan: [] as Aktarim[] };
    return {
      gorunur: aktarimlar.slice(0, GORUNUR_BUTCE),
      toplanan: aktarimlar.slice(GORUNUR_BUTCE),
    };
  }, [aktarimlar, kuyrukAcik]);

  const satirlar: Satir[] = gorunur.map((a) => ({
    id: a.id,
    durum: DURUM_IMI[a.durum] ?? 'unk',
    kenar: DURUM_IMI[a.durum] ?? 'unk',
    konu: a.dosyaAdi,
    alt: `${zamanTR(a.zaman)} · ${a.kaynakTipi.toUpperCase()}${
      a.durum === 'onaylandi' ? ` · +${a.eklenen} yeni / ~${a.guncellenen} güncelleme` : ''}${
      a.durum === 'hata' ? ' · yazılan satır yok' : ''}`,
    hucreler: [
      <Mono key="o">{a.okunan}</Mono>,
      <Mono key="g">{a.gecerli}</Mono>,
      a.hatali > 0
        ? <Mono key="h" renk="var(--bd)">{a.hatali}</Mono>
        : <Bos key="h" />,
      a.yukleyen ?? <Bos key="y" />,
    ],
  }));

  function yukle() {
    const dosya = dosyaRef.current?.files?.[0];
    if (!dosya) { setHata('Dosya seçin (CSV veya Excel)'); return; }
    const form = new FormData();
    form.set('dosya', dosya);
    calistir(() => varlikAktarimYukle(form), () => {
      if (dosyaRef.current) dosyaRef.current.value = '';
    });
  }

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`CMDB toplu aktarım · ${aktarimlar.length} dosya`}
          vurgu={`${bekleyenler.length} dosya`}
          baslik="karar bekliyor"
          vurguDurumu={bekleyenHatali > 0 ? 'md' : undefined}
          metrikler={[
            { deger: bekleyenGecerli, yazi: 'Yazılacak satır' },
            { deger: bekleyenHatali, yazi: 'Hatalı satır', durum: bekleyenHatali > 0 ? 'bd' : undefined },
            { deger: bekleyenYinelenen, yazi: 'Mevcutla eşleşen' },
          ]}
          sag={yukleyebilir ? (
            <div style={{ display: 'flex', gap: 'var(--s10)', alignItems: 'center' }}>
              <input ref={dosyaRef} type="file" accept=".csv,.xlsx,.xls"
                className="ab-gr" style={{ width: 230, padding: '7px 9px' }}
                aria-label="Varlık dosyası (CSV/Excel)" />
              <Dugme tur="birincil" disabled={bekliyor} onClick={yukle}>
                {bekliyor ? 'Yükleniyor…' : 'Yükle'}
              </Dugme>
            </div>
          ) : undefined}
        />

        <div className="ab-ekran-govde" style={{ paddingTop: 'var(--s22)' }}>
          {hata && (
            <p className="ab-gr-hata" role="alert" style={{ marginTop: 0 }}>{hata}</p>
          )}

          {aktarimlar.length === 0 ? (
            <BosIlk cumle={yukleyebilir
              ? 'Henüz dosya yüklenmedi. CSV/Excel yükleyin; kolonları eşleyin, önizlemeyi görün, sonra onaylayın.'
              : 'Henüz dosya yüklenmedi.'} />
          ) : (
            <>
              <Tablo
                kolonlar={KOLONLAR}
                satirlar={satirlar}
                secili={secili}
                sec={(id) => setSecili((o) => (o === id ? null : id))}
                konuBasligi="DOSYA"
                kuyruk={toplanan.length > 0
                  ? { metin: `+${toplanan.length} tamamlanmış aktarım`, ac: () => setKuyrukAcik(true) }
                  : null}
              />
              <p className="ab-dip">
                Onay tek transaction içinde yürür: bir satır patlarsa hiçbir satır yazılmaz
                ve dosya “geri alındı” durumuna düşer. Yarım aktarım oluşmaz.
              </p>
            </>
          )}

          {/* Çalışma yüzeyi seçili dosyaya bağlı: `key` değişince eşleme
              taslağı da sıfırlanır — yarım düzenleme başka dosyaya sızmaz. */}
          {secilen && (
            <CalismaYuzeyi
              key={secilen.id}
              a={secilen} alanlar={alanlar}
              bekliyor={bekliyor} calistir={calistir}
              onizlemeButcesi={onizlemeButcesi} tanimliKodlar={tanimliKodlar}
              kapsamli={kapsamli}
            />
          )}
        </div>
      </main>

      {secilen && (
        <AktarimCekmecesi
          a={secilen} bekliyor={bekliyor} calistir={calistir}
          kapat={() => setSecili(null)}
        />
      )}
    </>
  );
}

/* ═══ Çalışma yüzeyi ═════════════════════════════════════════════════════
   Seçili dosyanın eşleme tablosu ve doğrulama çıktıları. Detay modalda
   açılmaz (06 §B4) — canvas'ın ikinci modülüdür. */

function CalismaYuzeyi({
  a, alanlar, bekliyor, calistir, onizlemeButcesi, tanimliKodlar, kapsamli,
}: {
  a: Aktarim; alanlar: AlanSecenegi[];
  bekliyor: boolean; calistir: ReturnType<typeof useEylem>['calistir'];
  onizlemeButcesi: number;
  tanimliKodlar: { tur: string[]; tesis: string[]; sistem: string[]; bolge: string[] };
  kapsamli: boolean;
}) {
  // Eşleme taslağı sunucudaki kayıtlı eşlemeden başlar; kullanıcı onaylayana
  // kadar (kaydet düğmesi) hiçbir satır doğrulanmaz.
  const [taslak, setTaslak] = useState<Record<string, string>>(() => ({ ...a.esleme }));
  const [kip, setKip] = useState<Kip>(a.durum === 'eslesme' ? 'esleme' : 'onizleme');

  const kipler: { id: Kip; ad: string }[] = [
    { id: 'esleme', ad: 'Kolon eşleme' },
    { id: 'onizleme', ad: `Önizleme ${a.gecerli}` },
    { id: 'hatalar', ad: `Hata ${a.hatali}` },
    { id: 'yinelenenler', ad: `Yinelenen ${a.yinelenen}` },
  ];

  return (
    <section style={{ marginTop: 'var(--s30)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        {a.dosyaAdi} · {a.okunan} satır okundu
      </p>
      <KipDegistir secenekler={kipler} aktif={kip} sec={(id) => setKip(id as Kip)} />

      <div style={{ marginTop: 'var(--s20)' }}>
        {kip === 'esleme' && (
          <EslemeTablosu
            a={a} alanlar={alanlar} taslak={taslak} setTaslak={setTaslak}
            bekliyor={bekliyor} calistir={calistir} tanimliKodlar={tanimliKodlar}
            dogrulandi={() => setKip('onizleme')}
          />
        )}
        {kip === 'onizleme' && <Onizleme a={a} butce={onizlemeButcesi} kapsamli={kapsamli} />}
        {kip === 'hatalar' && <HataListesi a={a} />}
        {kip === 'yinelenenler' && <YinelenenListesi a={a} kapsamli={kapsamli} />}
      </div>
    </section>
  );
}

/* ── Kolon eşleme ───────────────────────────────────────────────────────
   Her dosya başlığı bir hedef alana eşlenir. Öneri sunucudan gelir ama
   kaydeden kullanıcıdır — "Eşlemeyi kaydet ve doğrula" basılmadan hiçbir
   satır doğrulanmaz. */

function EslemeTablosu({
  a, alanlar, taslak, setTaslak, bekliyor, calistir, tanimliKodlar, dogrulandi,
}: {
  a: Aktarim; alanlar: AlanSecenegi[];
  taslak: Record<string, string>; setTaslak: (e: Record<string, string>) => void;
  bekliyor: boolean; calistir: ReturnType<typeof useEylem>['calistir'];
  tanimliKodlar: { tur: string[]; tesis: string[]; sistem: string[]; bolge: string[] };
  dogrulandi: () => void;
}) {
  const kilitli = a.durum === 'onaylandi' || a.durum === 'reddedildi' || !a.duzenlenebilir;
  const secilenler = Object.values(taslak).filter(Boolean);
  const etiketVar = secilenler.includes('etiket');
  const cift = secilenler.filter((v, i) => secilenler.indexOf(v) !== i);

  return (
    <>
      <div style={{ display: 'grid', gap: 'var(--s14) var(--s20)',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {a.basliklar.map((b) => (
          <Alan key={b} etiket={b}>
            <select className="ab-gr" value={taslak[b] ?? ''} disabled={kilitli}
              aria-invalid={cift.includes(taslak[b] ?? '') || undefined}
              onChange={(e) => setTaslak({ ...taslak, [b]: e.target.value })}>
              <option value="">— aktarma —</option>
              {alanlar.map((al) => (
                <option key={al.anahtar} value={al.anahtar}>
                  {al.etiket}{al.zorunlu ? ' · zorunlu' : ''}
                </option>
              ))}
            </select>
          </Alan>
        ))}
      </div>

      <p className="ab-dip" style={{ marginTop: 'var(--s18)' }}>
        Etiket zorunludur (Varlik.etiket benzersiz) · boş hücre <b>bilinmiyor</b> yazar,
        0/hayır yazmaz · mevcut kayıtta boş hücre bilinen değeri silmez.
        <br />
        Tanımlı kodlar — tür: {ozet(tanimliKodlar.tur)} · tesis: {ozet(tanimliKodlar.tesis)} ·
        {' '}sistem: {ozet(tanimliKodlar.sistem)} · bölge: {ozet(tanimliKodlar.bolge)}
      </p>

      {!etiketVar && (
        <p className="ab-gr-hata" style={{ marginTop: 'var(--s10)' }}>
          Etiket alanı eşlenmeden doğrulama yapılamaz.
        </p>
      )}
      {cift.length > 0 && (
        <p className="ab-gr-hata" style={{ marginTop: 'var(--s10)' }}>
          Aynı hedef alana birden çok kolon eşlenmiş: {[...new Set(cift)].join(', ')}
        </p>
      )}

      {!kilitli && (
        <div style={{ marginTop: 'var(--s18)' }}>
          <Dugme tur="birincil" disabled={bekliyor || !etiketVar || cift.length > 0}
            onClick={() => calistir(
              () => varlikAktarimEsle({ id: a.id, esleme: taslak }), dogrulandi)}>
            {bekliyor ? 'Doğrulanıyor…' : 'Eşlemeyi kaydet ve doğrula'}
          </Dugme>
        </div>
      )}
    </>
  );
}

const ozet = (kodlar: string[]) =>
  kodlar.length === 0 ? 'tanımlı yok'
    : `${kodlar.slice(0, 4).join(', ')}${kodlar.length > 4 ? ` +${kodlar.length - 4}` : ''}`;

/* ── Önizleme · ilk N satır ─────────────────────────────────────────── */

function Onizleme({ a, butce, kapsamli }: {
  a: Aktarim; butce: number; kapsamli: boolean;
}) {
  /* Kapsam yüzünden boşalan önizleme "satır yok" DEMEZ: dosyada satır
     olabilir, sen göremiyorsundur — ikisi farklı şeydir ve ikincisi
     kullanıcıyı hata listesine bakmaya göndermez. */
  if (a.onizleme.length === 0 && kapsamli && a.gecerli > 0) {
    return <BosIlk cumle="Kapsamınızdaki santrallere yazacak satır yok." />;
  }
  if (a.gecerli === 0) {
    return <BosIlk cumle="Doğrulamayı geçen satır yok. Hata listesine bakın." />;
  }
  return (
    <>
      <DuzTablo
        basliklar={['#', 'Etiket', 'Ad', 'Tür', 'Tesis', 'Kritiklik', 'İşlem']}
        genislikler="52px 1.2fr 1.4fr 90px 120px 90px 130px"
        satirlar={a.onizleme.map((s) => [
          <Mono key="n">{s.satirNo}</Mono>,
          <Mono key="e">{s.etiket}</Mono>,
          s.ad ?? <Bos key="a" />,
          s.tur ? <Mono key="t">{s.tur}</Mono> : <Bos key="t" />,
          s.tesis ? <Mono key="s">{s.tesis}</Mono> : <Bos key="s" />,
          s.kritiklik ?? <Bos key="k" />,
          s.islem === 'yeni'
            ? <span key="i">yeni kayıt</span>
            : <span key="i" style={{ color: 'var(--md)' }}>
                güncelleme · {s.eslesmeAlani}
              </span>,
        ])}
      />
      <p className="ab-dip">
        İlk {Math.min(butce, a.onizleme.length)} satır gösteriliyor · toplam {a.gecerli} geçerli satır.
        {a.onizleme.some((s) => s.bosAlanlar.length > 0) && (
          <> Boş bırakılan hücreler bilinmiyor olarak yazılır.</>
        )}
      </p>
    </>
  );
}

/* ── Hata listesi ───────────────────────────────────────────────────── */

function HataListesi({ a }: { a: Aktarim }) {
  if (a.hatali === 0) {
    return <BosIlk cumle="Reddedilen satır yok — tüm satırlar doğrulamayı geçti." />;
  }
  return (
    <>
      <DuzTablo
        basliklar={['#', 'Etiket', 'Reddedilme nedeni']}
        genislikler="52px 180px 1fr"
        satirlar={a.hatalar.map((h) => [
          <Mono key="n">{h.satirNo}</Mono>,
          h.etiket ? <Mono key="e">{h.etiket}</Mono> : <Bos key="e" />,
          <span key="s" style={{ color: 'var(--bd)' }}>{h.sebep}</span>,
        ])}
      />
      <p className="ab-dip">
        Bu satırlar yazılmaz; kalan geçerli satırlar onayla birlikte aktarılır.
        {a.hataKalan > 0 && ` +${a.hataKalan} satır daha (listede gösterilmiyor).`}
      </p>
    </>
  );
}

/* ── Yinelenen listesi ──────────────────────────────────────────────── */

function YinelenenListesi({ a, kapsamli }: { a: Aktarim; kapsamli: boolean }) {
  if (a.yinelenen === 0) {
    return <BosIlk cumle={kapsamli
      ? 'Kapsamınızdaki varlıklarla eşleşen satır yok.'
      : 'Mevcut envanterle eşleşen satır yok — hepsi yeni kayıt.'} />;
  }
  return (
    <>
      <DuzTablo
        basliklar={['#', 'Dosyadaki etiket', 'Eşleşen varlık', 'Eşleşme alanı']}
        genislikler="52px 1fr 1fr 140px"
        satirlar={a.yinelenenler.map((y) => [
          <Mono key="n">{y.satirNo}</Mono>,
          <Mono key="e">{y.etiket}</Mono>,
          <Mono key="h">{y.hedefEtiket}</Mono>,
          <Mono key="a">{y.eslesmeAlani}</Mono>,
        ])}
      />
      <p className="ab-dip">
        Eşleşen satırlar yeni kayıt açmaz, mevcut varlığı günceller.
        Farklı alanlar farklı varlıkları gösteriyorsa satır hata listesine düşer.
        {a.yinelenenKalan > 0 && ` +${a.yinelenenKalan} satır daha.`}
      </p>
    </>
  );
}

/* ── Çekmece · 420px, kimlik → alanlar → eylem ───────────────────────── */

function AktarimCekmecesi({
  a, bekliyor, calistir, kapat,
}: {
  a: Aktarim; bekliyor: boolean;
  calistir: ReturnType<typeof useEylem>['calistir']; kapat: () => void;
}) {
  const [gerekce, setGerekce] = useState('');
  const im = DURUM_IMI[a.durum] ?? 'unk';
  const bekliyorOnay = a.durum === 'dogrulama_bekliyor';

  const alanlar: { etiket: string; deger: React.ReactNode; durum?: Durum }[] = [
    { etiket: 'Kaynak', deger: `${a.kaynakTipi.toUpperCase()} · ${a.okunan} satır` },
    { etiket: 'Geçerli / hatalı', deger: `${a.gecerli} / ${a.hatali}`,
      durum: a.hatali > 0 ? 'bd' : undefined },
    { etiket: 'Mevcutla eşleşen', deger: a.yinelenen },
    { etiket: 'Yükleyen', deger: a.yukleyen ?? 'bilinmiyor' },
  ];
  if (a.durum === 'onaylandi') {
    alanlar.push({ etiket: 'Sonuç',
      deger: `+${a.eklenen} yeni · ~${a.guncellenen} güncelleme` });
    alanlar.push({ etiket: 'Onaylayan',
      deger: `${a.onaylayan ?? 'bilinmiyor'} · ${zamanTR(a.onayZamani)}` });
  }

  return (
    <Cekmece kod={a.dosyaAdi} kapat={kapat}>
      <CekmeceKimlik
        durum={im}
        soz={DURUM_SOZU[a.durum] ?? a.durum}
        baslik={a.dosyaAdi}
        cumle={a.durum === 'hata'
          ? 'Aktarım transaction içinde geri alındı; hiçbir varlık yazılmadı.'
          : a.durum === 'eslesme'
            ? 'Kolonlar hedef alanlara eşlenmeden doğrulama yapılmaz.'
            : a.durum === 'dogrulama_bekliyor'
              ? 'Onaylanana kadar envanter değişmez.'
              : undefined}
      />
      <CekmeceAlanlar alanlar={alanlar} />

      {a.hataMesaji && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s20)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s8)' }}>Geri alma nedeni</p>
          <p style={{ margin: 0, fontSize: 'var(--t-cell)', color: 'var(--bd)' }}>{a.hataMesaji}</p>
        </div>
      )}

      {bekliyorOnay && a.onaylanabilir && (
        <CekmeceEylemler
          birincil={
            <Dugme tur="tam" disabled={bekliyor || a.gecerli === 0}
              onClick={() => calistir(() => varlikAktarimOnayla({ id: a.id }), kapat)}>
              {bekliyor ? 'Aktarılıyor…' : `Onayla ve aktar (${a.gecerli} satır)`}
            </Dugme>
          }
          ikincil={
            <>
              <input className="ab-gr" placeholder="Ret gerekçesi (isteğe bağlı)"
                value={gerekce} onChange={(e) => setGerekce(e.target.value)}
                style={{ marginBottom: 'var(--s10)' }} />
              <Dugme tur="ret" disabled={bekliyor}
                onClick={() => calistir(
                  () => varlikAktarimReddet({ id: a.id, gerekce }), kapat)}>
                Reddet
              </Dugme>
            </>
          }
          dipNot="Onay ve ret denetim izine düşer. Onay tek transaction içinde yürür; bir satır patlarsa hiçbir satır yazılmaz."
        />
      )}
      {bekliyorOnay && !a.onaylanabilir && (
        <CekmeceEylemler dipNot="Onay için envanter/onay yetkisi gerekir." />
      )}
    </Cekmece>
  );
}

/* ── Küçük yardımcılar ──────────────────────────────────────────────── */

const Bos = () => <span style={{ color: 'var(--i3)' }}>—</span>;

function Mono({ children, renk }: { children: React.ReactNode; renk?: string }) {
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
}: { basliklar: string[]; genislikler: string; satirlar: React.ReactNode[][] }) {
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

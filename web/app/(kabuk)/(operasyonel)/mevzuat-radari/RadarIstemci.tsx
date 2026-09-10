'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import { Alan, BosIlk, BosFiltre, Dugme } from '@/components/kabuk/temel';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi, Filtreler } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceKimlik, CekmeceAlanlar, CekmeceEylemler,
} from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { zamanTR } from '@/lib/sabitler';
import { adayIlgisiz, adayIncelendi, taramayiAyarla } from '@/lib/eylemler2/mevzuatRadari';
import {
  ADAY_SOZU, baslikCumlesi, kapsamCumlesi, radarOzeti,
  type AdayKaydi, type KaynakSatiri,
} from './mantik';

/* MEVZUAT RADARI EKRANI — tek canvas modülü.

   ── ÜÇ SANİYE ─────────────────────────────────────────────────────────
   Ekrana bakan kişi şunu görmeli: kaç değişiklik adayı karar bekliyor,
   kaç kaynak taranıyor ve NEREYE BAKILAMADI. Üçüncüsü bir kusur sayısı
   değil BİLGİ EKSİĞİ sayısıdır ve kendi sınıfıyla (bilinmeyen) durur.

   ── ENGELLİ VE KARŞILAŞTIRILAMADI AYRI GÖRÜNÜR ────────────────────────
   İkisi ayrı metriktir ve ayrı cümledir. Biri kaynağın kararıdır (ürün
   aşmaz), öbürü bizim eksiğimizdir (ayrıştırıcı düzeltilir). Tek sayıya
   toplamak, iki bambaşka işi aynı satıra sıkıştırmak olurdu.

   ── MOTORUN YAPAMADIKLARI ÇEKMECEDE ───────────────────────────────────
   Adayın durumu ve taramanın açık/kapalı olması insan kararıdır. Karar
   yetkisi olmayan kullanıcıda düğme HİÇ görünmez — gösterip sunucuda
   reddetmek, olmayan bir düğme göstermek olurdu. */

const ADAY_KOLONLARI: Kolon[] = [
  { baslik: 'Merci', genislik: '170px', ikincil: true },
  { baslik: 'Bulundu', genislik: '150px' },
  { baslik: 'Durum', genislik: '190px' },
];

const KAYNAK_KOLONLARI: Kolon[] = [
  { baslik: 'Tarama', genislik: '120px' },
  { baslik: 'Kaynak durumu', genislik: '260px' },
  { baslik: 'Son sonuç', genislik: '210px' },
];

const MERCEKLER = [
  { id: 'yeni', ad: 'Karar bekleyen' },
  { id: 'hepsi', ad: 'Hepsi' },
  { id: 'kaynaklar', ad: 'Kaynaklar' },
] as const;

const GORUNUR_SATIR = 9;

export default function RadarIstemci({
  adaylar, kaynaklar, bekleyenToplam, adayToplam, karar, yonetim,
}: {
  adaylar: AdayKaydi[];
  kaynaklar: KaynakSatiri[];
  /** Karar bekleyen adayın GERÇEK sayısı — kırpılmış listeden DEĞİL. */
  bekleyenToplam: number;
  /** Bütün adayların GERÇEK sayısı. */
  adayToplam: number;
  karar: boolean;
  yonetim: boolean;
}) {
  const [mercek, setMercek] = useUrlDurumu<string>('mercek', 'yeni');
  const [seciliId, setSeciliId] = useUrlDurumuBos('sec');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const bekleyen = adaylar.filter((a) => a.durum === 'yeni');
  /* ── SAYI KIRPILMIŞ LİSTEDEN GELMEZ (bağımsız inceleme, #50 tur 2) ──
     Başlık `bekleyen.length` ile hesaplanıyordu ve o liste sunucuda
     kırpılıyordu: 252 karar bekleyen adayda ekran "200" diyordu.
     Sayı artık GERÇEK `count()` sorgusundan gelir; liste kırpılmışsa
     ekran bunu ayrıca söyler. */
  const ozet = radarOzeti(kaynaklar, bekleyenToplam);
  const listeKirpildi = adaylar.length < adayToplam;
  const kaynakGorunumu = mercek === 'kaynaklar';
  const suzulen = mercek === 'yeni' ? bekleyen : adaylar;

  const seciliAday = adaylar.find((a) => a.id === seciliId) ?? null;
  const seciliKaynak = kaynaklar.find((k) => k.id === seciliId) ?? null;

  const adaySatirlari: Satir[] = suzulen.map((a): Satir => ({
    id: a.id,
    durum: a.durum === 'yeni' ? 'md' : 'ok',
    konu: <span>{a.baslik}</span>,
    alt: a.kaynakAd,
    hucreler: [
      <span key="m">{a.merci ?? '—'}</span>,
      <span key="b">{zamanTR(a.bulundu)}</span>,
      <span key="d" className={a.durum === 'yeni' ? 'd-md' : 'd-ok'}>
        {ADAY_SOZU[a.durum as keyof typeof ADAY_SOZU] ?? a.durum}
      </span>,
    ],
  }));

  const kaynakSatirlari: Satir[] = kaynaklar.map((k): Satir => ({
    id: k.id,
    durum: k.durum === 'engelli' ? 'unk' : (k.etkin ? 'ok' : 'md'),
    konu: <span className="mono">{k.kod}</span>,
    alt: k.ad,
    hucreler: [
      <span key="t" className={k.etkin ? undefined : 'd-md'}>
        {k.etkin ? 'Açık' : 'KAPALI'}
      </span>,
      <span key="d" className={k.durum === 'engelli' ? 'd-unk' : undefined}>
        {k.durumSozu}
      </span>,
      /* Taranmamış ya da karşılaştırılamamış kaynak "yolunda" görünemez. */
      <span key="s" className={k.sonTarama === null || k.sonTaramaFarkVar === null ? 'd-unk' : undefined}>
        {k.farkSozu}
      </span>,
    ],
  }));

  const tumSatirlar = kaynakGorunumu ? kaynakSatirlari : adaySatirlari;
  const gorunur = kuyrukAcik ? tumSatirlar : tumSatirlar.slice(0, GORUNUR_SATIR);
  const kuyruk = tumSatirlar.length > GORUNUR_SATIR && !kuyrukAcik
    ? { metin: `+${tumSatirlar.length - GORUNUR_SATIR} satır daha`, ac: () => setKuyrukAcik(true) }
    : null;

  return (
    <>
      <main className="ab-canvas">
        <EkranBasligi
          eyebrow="Mevzuat radarı"
          vurgu={String(ozet.bekleyenAday)}
          vurguDurumu={ozet.bekleyenAday > 0 ? 'md' : 'ok'}
          baslik={baslikCumlesi(ozet).toLowerCase()}
          metrikler={[
            { deger: ozet.bekleyenAday, yazi: 'Karar bekleyen aday',
              durum: ozet.bekleyenAday > 0 ? 'md' : 'ok' },
            { deger: ozet.etkinKaynak, yazi: 'Taranan kaynak', durum: 'ok' },
            /* ENGELLİ: kaynağın kararı. Ürün bu engeli AŞMAZ. */
            { deger: ozet.engelliKaynak, yazi: 'Engelli kaynak', durum: 'unk' },
            /* KARŞILAŞTIRILAMADI: bizim eksiğimiz. AYRI metrik. */
            { deger: ozet.karsilastirilamayan, yazi: 'Karşılaştırılamadı', durum: 'unk' },
          ]}
        />

        <p className="ikincil" style={{ margin: '0 0 var(--s16)' }}>
          {kapsamCumlesi(ozet, kaynaklar.length)}
          {listeKirpildi && (
            <>
              {' · '}
              <span className="d-unk">
                {adayToplam - adaylar.length} aday bu listede YOK (en yeni
                {' '}{adaylar.length} satır gösteriliyor; karar bekleyenler önce)
              </span>
            </>
          )}
        </p>

        <Filtreler
          secenekler={MERCEKLER.map((m) => ({ id: m.id, ad: m.ad }))}
          aktif={mercek}
          sec={(id) => { setMercek(id); setSeciliId(null); }}
        />

        {kaynaklar.length === 0 ? (
          <BosIlk
            cumle={'Kurulu paketlerde izlenecek bir mevzuat kaynağı yok. Kaynak'
              + ' kataloğu içerik paketinden gelir; hangi resmî kanalın izleneceği'
              + ' ülkeye ve sektöre bağlıdır ve çekirdeğe gömülmez.'}
            eylem={<Link className="ab-dugme" href="/paketler">Kurulu paketler</Link>}
          />
        ) : tumSatirlar.length === 0 ? (
          <BosFiltre temizle={() => setMercek('hepsi')} />
        ) : (
          <Tablo
            etiket={kaynakGorunumu ? 'Mevzuat kaynakları' : 'Değişiklik adayları'}
            konuBasligi={kaynakGorunumu ? 'Kaynak' : 'Değişiklik'}
            kolonlar={kaynakGorunumu ? KAYNAK_KOLONLARI : ADAY_KOLONLARI}
            satirlar={gorunur}
            secili={seciliId}
            sec={(id) => setSeciliId(id === seciliId ? null : id)}
            kuyruk={kuyruk}
            dipNot={'Motor yalnız ADAY açar: çerçeve sürümünü, regülasyonu ve'
              + ' taramanın açık olmasını DEĞİŞTİRMEZ.'}
          />
        )}
      </main>

      {!kaynakGorunumu && seciliAday && (
        <Cekmece
          kod={seciliAday.kaynakKod}
          ad={seciliAday.baslik}
          etiket="Değişiklik adayı"
          kapat={() => setSeciliId(null)}
        >
          <AdayCekmecesi a={seciliAday} karar={karar} />
        </Cekmece>
      )}

      {kaynakGorunumu && seciliKaynak && (
        <Cekmece
          kod={seciliKaynak.kod}
          ad={seciliKaynak.ad}
          etiket="Mevzuat kaynağı"
          kapat={() => setSeciliId(null)}
        >
          <KaynakCekmecesi k={seciliKaynak} yonetim={yonetim} />
        </Cekmece>
      )}
    </>
  );
}

function AdayCekmecesi({ a, karar }: { a: AdayKaydi; karar: boolean }) {
  return (
    <>
      <CekmeceKimlik
        durum={a.durum === 'yeni' ? 'md' : 'ok'}
        soz={ADAY_SOZU[a.durum as keyof typeof ADAY_SOZU] ?? a.durum}
        baslik={a.baslik}
        cumle={'Bu bir ÖNERİDİR. Aday hiçbir şeyi değiştirmedi: ne regülasyonu,'
          + ' ne çerçeve sürümünü. Kararı siz verirsiniz.'}
      />
      <CekmeceAlanlar alanlar={[
        { etiket: 'Kaynak', deger: a.kaynakAd },
        { etiket: 'Merci', deger: a.merci ?? '—', durum: a.merci ? undefined : 'unk' },
        { etiket: 'Adres', deger: a.url },
        {
          etiket: 'Yayın tarihi',
          /* Kaynak tarih vermediyse boş hücre bırakılmaz: boş bir hücre
             "girilmedi" gibi okunur, oysa BİLİNMİYOR. */
          deger: a.yayinTarihi ? zamanTR(a.yayinTarihi) : 'Kaynak tarih vermedi',
          durum: a.yayinTarihi ? undefined : 'unk',
        },
        { etiket: 'Radara düştüğü an', deger: zamanTR(a.bulundu) },
        {
          etiket: 'Kaynağın özeti',
          deger: a.ozet ?? 'Kaynak özet vermedi',
          durum: a.ozet ? undefined : 'unk',
        },
      ]} />
      {a.gerekce && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Karar gerekçesi</p>
          <p className="ikincil" style={{ margin: 0 }}>{a.gerekce}</p>
        </div>
      )}
      <AdayEylemleri a={a} karar={karar} />
    </>
  );
}

function AdayEylemleri({ a, karar }: { a: AdayKaydi; karar: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState<'incelendi' | 'ilgisiz' | null>(null);
  const [gerekce, setGerekce] = useState('');

  if (!karar) {
    return (
      <CekmeceEylemler dipNot={'Aday kararı uyum onay yetkisi ister ve kurum geneli'
        + ' kapsam gerektirir. Aday okunabilir, kapatılamaz.'} />
    );
  }
  if (a.durum !== 'yeni') {
    return (
      <CekmeceEylemler dipNot={'Bu aday karara bağlandı. Kayıt SİLİNMEZ; denetim izinde'
        + ' kimin, ne zaman ve hangi gerekçeyle karar verdiği durur.'} />
    );
  }

  const kapat = () => { setAcik(null); setGerekce(''); };

  if (acik) {
    const eylem = acik === 'incelendi' ? adayIncelendi : adayIlgisiz;
    return (
      <div style={{ marginTop: 'var(--s10)' }}>
        <Alan etiket={acik === 'incelendi'
          ? 'Ne bulundu — gerekçe (en az 10 karakter)'
          : 'Neden ilgisiz — gerekçe (en az 10 karakter)'}>
          <textarea className="ab-girdi" rows={3} value={gerekce} disabled={bekliyor}
            onChange={(e) => setGerekce(e.target.value)} />
        </Alan>
        {hata && <p className="d-bd ikincil" style={{ margin: 'var(--s6) 0 0' }}>{hata}</p>}
        <CekmeceEylemler
          birincil={
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(async () => {
                const r = await eylem({ adayId: a.id, gerekce });
                if (r.ok) kapat();
                return r;
              })}>
              {bekliyor ? 'İşleniyor…' : 'Kaydet'}
            </Dugme>
          }
          ikincil={<Dugme onClick={kapat}>Vazgeç</Dugme>}
        />
      </div>
    );
  }

  return (
    <CekmeceEylemler
      birincil={<Dugme tur="birincil" onClick={() => setAcik('incelendi')}>İncelendi</Dugme>}
      ikincil={<Dugme onClick={() => setAcik('ilgisiz')}>İlgisiz</Dugme>}
      dipNot={'"İlgisiz" DE bir karardır ve gerekçesi denetim izine yazılır.'}
    />
  );
}

function KaynakCekmecesi({ k, yonetim }: { k: KaynakSatiri; yonetim: boolean }) {
  return (
    <>
      <CekmeceKimlik
        durum={k.durum === 'engelli' ? 'unk' : (k.etkin ? 'ok' : 'md')}
        soz={k.durumSozu}
        baslik={k.ad}
        cumle={k.durum === 'engelli'
          ? 'Bu kaynak otomatik erişime KAPALI. Ürün bu engeli AŞMAZ: kaynak'
            + ' elle izlenir ve tarama açılamaz.'
          : undefined}
      />
      <CekmeceAlanlar alanlar={[
        { etiket: 'Yayın kanalı', deger: k.yayinKanali },
        { etiket: 'Merci', deger: k.merci ?? '—', durum: k.merci ? undefined : 'unk' },
        {
          etiket: 'Geldiği paket',
          deger: k.paketKodu ?? 'Kurulumun kendi eklediği kaynak',
          durum: k.paketKodu ? undefined : 'unk',
        },
        { etiket: 'Tarama', deger: k.etkin ? 'AÇIK' : 'KAPALI — istek gönderilmiyor',
          durum: k.etkin ? undefined : 'md' },
        {
          etiket: 'Son tarama',
          deger: k.sonTarama ? zamanTR(k.sonTarama) : 'Hiç taranmadı',
          durum: k.sonTarama ? undefined : 'unk',
        },
        { etiket: 'Son sonuç', deger: k.farkSozu,
          durum: k.sonTarama === null || k.sonTaramaFarkVar === null ? 'unk' : undefined },
        {
          etiket: 'Sebep',
          deger: k.sonTaramaSebep ?? k.durumNotu ?? '—',
          durum: k.sonTaramaSebep || k.durumNotu ? 'unk' : undefined,
        },
        { etiket: 'Bekleyen aday', deger: String(k.bekleyenAday) },
      ]} />
      <KaynakEylemleri k={k} yonetim={yonetim} />
    </>
  );
}

function KaynakEylemleri({ k, yonetim }: { k: KaynakSatiri; yonetim: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [gerekce, setGerekce] = useState('');

  if (!yonetim) {
    return (
      <CekmeceEylemler dipNot={'Taramayı açmak ya da kapatmak yönetim onay yetkisi ister.'
        + ' Kaynak okunabilir, taraması değiştirilemez.'} />
    );
  }
  if (k.durum === 'engelli') {
    return (
      <CekmeceEylemler dipNot={'Engelli kaynakta tarama AÇILAMAZ. Kaynak otomatik erişime'
        + ' kapalı olduğunu söylüyor ve ürün bu engeli aşmaz.'} />
    );
  }

  const kapat = () => { setAcik(false); setGerekce(''); };

  if (acik) {
    return (
      <div style={{ marginTop: 'var(--s10)' }}>
        <Alan etiket={`${k.etkin ? 'Kapatma' : 'Açma'} gerekçesi (en az 10 karakter)`}>
          <textarea className="ab-girdi" rows={3} value={gerekce} disabled={bekliyor}
            onChange={(e) => setGerekce(e.target.value)} />
        </Alan>
        {hata && <p className="d-bd ikincil" style={{ margin: 'var(--s6) 0 0' }}>{hata}</p>}
        <CekmeceEylemler
          birincil={
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(async () => {
                const r = await taramayiAyarla({ kaynakId: k.id, etkin: !k.etkin, gerekce });
                if (r.ok) kapat();
                return r;
              })}>
              {bekliyor ? 'İşleniyor…' : (k.etkin ? 'Taramayı kapat' : 'Taramayı aç')}
            </Dugme>
          }
          ikincil={<Dugme onClick={kapat}>Vazgeç</Dugme>}
        />
      </div>
    );
  }

  return (
    <CekmeceEylemler
      birincil={
        <Dugme tur="birincil" onClick={() => setAcik(true)}>
          {k.etkin ? 'Taramayı kapat' : 'Taramayı aç'}
        </Dugme>
      }
      dipNot={'Kaynağa istek göndermek KURULUMUN kararıdır: paket kanalı önerir,'
        + ' kaynak kapalı doğar.'}
    />
  );
}

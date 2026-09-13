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
import {
  donemTeyitIsaretle, donemUygulanmazIsaretle, donemVerildiIsaretle,
} from '@/lib/eylemler2/bildirimDonemi';
import {
  GRUP_DONEMSIZ, MERCEKLER, mercekSuz, takvimOzeti, type TakvimSatiri,
} from './mantik';

/* RAPORLAMA TAKVİMİ EKRANI — tek canvas modülü.

   ── ÜÇ SANİYE ─────────────────────────────────────────────────────────
   Kullanıcı ekrana bakınca şunu görmeli: kaç dönem açık, kaçının süresi
   geçti, ürünün periyodunu BİLMEDİĞİ kaç yükümlülük var. Üçüncüsü bir
   kusur sayısı değil bir BİLGİ EKSİĞİ sayısıdır ve metrikte kendi
   sınıfıyla (bilinmeyen) durur — yeşil sayılmaz, sıfıra da çekilmez.

   ── SAYAÇ YOKSA GÖSTERİLMEZ ───────────────────────────────────────────
   Ekranın sert kuralı: dönemi ya da teslim süresi mevzuatta
   belirlenmemiş bir yükümlülükte geri sayım YOKTUR. "0 gün kaldı" ya da
   "süresiz" yazmak, mevzuatın vermediği bir tarihi ürünün uydurması
   olurdu. Satır "Dönem mevzuatta belirlenmedi" der ve BİLİNMEYEN
   sınıfında durur.

   ── MOTORUN YAZAMADIĞI ÜÇ DURUM ÇEKMECEDE ─────────────────────────────
   `verildi` · `teyit_alindi` · `uygulanmaz` insan kararıdır. Düğmeler
   çekmecededir (modal yok, snackbar yok) ve karar yetkisi olmayan
   kullanıcıda HİÇ görünmez — gösterip sunucuda reddetmek, olmayan bir
   düğme göstermek olurdu. */

const KOLONLAR: Kolon[] = [
  { baslik: 'Dönem', genislik: '110px' },
  { baslik: 'Merci', genislik: '150px', ikincil: true },
  { baslik: 'Durum', genislik: '210px' },
  { baslik: 'Kalan süre', genislik: '176px', sag: true },
];

/** Canvasta aynı anda duran satır bütçesi (02-components §5). */
const GORUNUR_SATIR = 9;

export default function TakvimIstemci({ satirlar, karar }: {
  satirlar: TakvimSatiri[];
  karar: boolean;
}) {
  const [mercek, setMercek] = useUrlDurumu<string>('mercek', 'acik');
  const [seciliId, setSeciliId] = useUrlDurumuBos('sec');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const ozet = takvimOzeti(satirlar);
  const suzulen = mercekSuz(satirlar, mercek);
  const secili = satirlar.find((s) => s.id === seciliId) ?? null;

  const tabloSatirlari: Satir[] = suzulen.map((s): Satir => ({
    id: s.id,
    durum: s.im,
    kenar: s.gorunen === 'suresi_gecti' ? 'bd' : undefined,
    konu: <span className="mono">{s.kod}</span>,
    alt: s.ad,
    grup: s.grup,
    hucreler: [
      <span key="d" className={s.donemId === null ? 'd-unk' : undefined}>
        {s.donemEtiketi}
      </span>,
      <span key="m">{s.merci}</span>,
      <span key="s" className={`d-${s.im}`}>{s.durumSozu}</span>,
      /* Sayacı olmayan satır BİLİNMEYEN sınıfında; "yolunda" görünemez. */
      <span key="k" className={s.sureVar ? (s.gecti ? 'd-bd' : undefined) : 'd-unk'}>
        {s.geriSayimSozu}
      </span>,
    ],
  }));

  const gorunur = kuyrukAcik ? tabloSatirlari : tabloSatirlari.slice(0, GORUNUR_SATIR);
  const kuyruk = tabloSatirlari.length > GORUNUR_SATIR && !kuyrukAcik
    ? { metin: `+${tabloSatirlari.length - GORUNUR_SATIR} dönem daha`,
      ac: () => setKuyrukAcik(true) }
    : null;

  return (
    <>
      {/* KANVAS SARMALAYICISI ŞART. Ekran bir `<main>` içinde durmazsa
          sayfanın ana yer imi (landmark) yoktur: ekran okuyucu "içeriğe
          atla" diyemez ve tasarım sisteminin kanvas ızgarası hiç
          uygulanmaz. Ölçüldü — bu sarmalayıcı ilk turda unutulmuştu ve
          kusuru tarayıcı kanıtı yakaladı (`main` bulunamadı). */}
      <main className="ab-canvas">
          <EkranBasligi
          eyebrow="Raporlama takvimi"
          vurgu={String(ozet.acik)}
          vurguDurumu={ozet.suresiGecti > 0 ? 'bd' : 'md'}
          baslik="açık raporlama dönemi"
          metrikler={[
            { deger: ozet.acik, yazi: 'Açık dönem', durum: 'md' },
            { deger: ozet.suresiGecti, yazi: 'Süresi geçti',
              durum: ozet.suresiGecti > 0 ? 'bd' : 'ok' },
            { deger: ozet.kapali, yazi: 'Kapandı', durum: 'ok' },
            /* BİLİNMEYEN AYRI METRİK: dönemi belirlenmemiş yükümlülük
               "kapandı" da değildir "açık" da — ürünün bilmediği şeydir. */
            { deger: ozet.donemsiz, yazi: 'Dönemi belirlenmemiş', durum: 'unk' },
          ]}
        />

        <Filtreler
          secenekler={MERCEKLER.map((m) => ({ id: m.id, ad: m.ad }))}
          aktif={mercek}
          sec={setMercek}
        />

        {satirlar.length === 0 ? (
          <BosIlk
            cumle={'Kurulu paketlerde takvim tetikli bir bildirim yükümlülüğü yok.'
              + ' Bu ekran periyodik raporlama yükümlülüklerini gösterir; yükümlülükler'
              + ' sektör paketinden gelir, ürün bir takvim UYDURMAZ.'}
            /* BOŞ HÂL "NE OLDU" İLE YETİNMEZ: sıradaki iş paket kurmaktır
               ve bağ oraya gider. */
            eylem={<Link className="ab-dugme" href="/paketler">Kurulu paketler</Link>}
          />
        ) : tabloSatirlari.length === 0 ? (
          <BosFiltre temizle={() => setMercek('hepsi')} />
        ) : (
          <Tablo
            etiket="Raporlama dönemleri"
            konuBasligi="Yükümlülük"
            kolonlar={KOLONLAR}
            satirlar={gorunur}
            secili={seciliId}
            sec={(id) => setSeciliId(id === seciliId ? null : id)}
            kuyruk={kuyruk}
            dipNot={'Motor dönemi AÇAR ve süresi geçtiğini yazar; "verildi" diyebilecek'
              + ' tek şey insandır.'}
          />
        )}

      </main>

      {secili && (
        <Cekmece
          kod={secili.kod}
          ad={secili.ad}
          etiket="Raporlama dönemi"
          kapat={() => setSeciliId(null)}
        >
          <DonemCekmecesi s={secili} karar={karar} />
        </Cekmece>
      )}
    </>
  );
}

function DonemCekmecesi({ s, karar }: { s: TakvimSatiri; karar: boolean }) {
  return (
    <>
      <CekmeceKimlik
        durum={s.im}
        soz={s.durumSozu}
        baslik={`${s.donemEtiketi} · ${s.ad}`}
        cumle={s.grup === GRUP_DONEMSIZ && s.donemId === null
          ? 'Bu yükümlülüğün raporlama periyodu mevzuatta belirlenmedi ya da paket'
            + ' beyan etmedi. Ürün bir periyot uydurmaz: dönem açılmaz, geri sayım'
            + ' gösterilmez ve bu satır "yolunda" sayılmaz.'
          : undefined}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Merci', deger: s.merci },
        { etiket: 'Dayanak', deger: s.dayanak },
        { etiket: 'Periyot', deger: s.periyotSozu,
          durum: s.periyotSozu.startsWith('Dönem') ? 'unk' : undefined },
        {
          etiket: 'Teslim son tarihi',
          /* Son tarih YOKSA tarih alanı boş bırakılmaz, mevzuatın hâli
             yazılır — boş bir hücre "tarih girilmedi" gibi okunurdu. */
          deger: s.sonTarih && s.sureVar ? zamanTR(s.sonTarih) : s.geriSayimSozu,
          durum: s.sureVar ? undefined : 'unk',
        },
        {
          etiket: 'Kalan süre',
          deger: s.geriSayimSozu,
          durum: s.sureVar ? (s.gecti ? 'bd' : undefined) : 'unk',
        },
        { etiket: 'Kanal', deger: s.kanalNotu ?? '—',
          durum: s.kanalNotu ? undefined : 'unk' },
      ]} />

      {(s.referansNo || s.verenAd || s.teyitZamani || s.uygulanmazGerekcesi) && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Teslim kaydı</p>
          {s.referansNo && (
            <p className="ikincil" style={{ margin: '0 0 var(--s6)' }}>
              Referans: <span className="mono">{s.referansNo}</span>
              {s.verilmeZamani ? ` · ${zamanTR(s.verilmeZamani)}` : ''}
              {s.verenAd ? ` · ${s.verenAd}` : ''}
            </p>
          )}
          {s.teyitZamani && (
            <p className="ikincil" style={{ margin: '0 0 var(--s6)' }}>
              Merci teyidi: {zamanTR(s.teyitZamani)}
            </p>
          )}
          {s.uygulanmazGerekcesi && (
            <p className="ikincil" style={{ margin: 0 }}>
              Gerekçe: {s.uygulanmazGerekcesi}
            </p>
          )}
        </div>
      )}

      <DonemEylemleri s={s} karar={karar} />
    </>
  );
}

/** Motorun yapamadığı üç karar. Dönemi olmayan satırda karar da yoktur. */
function DonemEylemleri({ s, karar }: { s: TakvimSatiri; karar: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState<'verildi' | 'uygulanmaz' | null>(null);
  const [referans, setReferans] = useState('');
  const [gerekce, setGerekce] = useState('');

  if (s.donemId === null) {
    return (
      <CekmeceEylemler dipNot={'Dönem açılmadığı için üzerinde verilecek bir karar yok.'
        + ' Periyot paket manifestinde beyan edilince motor dönemi açar.'} />
    );
  }
  if (!karar) {
    return (
      <CekmeceEylemler dipNot={'Raporlama kararı uyum onay yetkisi ister ve kurum'
        + ' geneli kapsam gerektirir. Dönem okunabilir, kapatılamaz.'} />
    );
  }
  /* Kapanmış dönemde eylem YOKTUR: teyit alınmış ya da uygulanmaz
     işaretlenmiş bir dönem bu ekrandan geri alınmaz. */
  if (s.durum === 'teyit_alindi' || s.durum === 'uygulanmaz') {
    return (
      <CekmeceEylemler dipNot={'Bu dönem kapandı. Kayıt SİLİNMEZ; denetim izinde kimin,'
        + ' ne zaman kapattığı durur.'} />
    );
  }

  const donemId = s.donemId;
  const kapat = () => { setAcik(null); setReferans(''); setGerekce(''); };

  if (acik === 'verildi') {
    return (
      <div style={{ marginTop: 'var(--s10)' }}>
        <Alan etiket="Merciden alınan referans numarası">
          <input className="ab-girdi" value={referans} disabled={bekliyor}
            onChange={(e) => setReferans(e.target.value)} />
        </Alan>
        <CekmeceEylemler
          birincil={
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(async () => {
                const r = await donemVerildiIsaretle({ donemId, referansNo: referans });
                if (r.ok) kapat();
                return r;
              })}>
              {bekliyor ? 'İşleniyor…' : 'Verildi olarak işaretle'}
            </Dugme>
          }
          ikincil={<Dugme tur="ikincil" disabled={bekliyor} onClick={kapat}>Vazgeç</Dugme>}
          dipNot={hata ?? 'Referansı olmayan bir teslim denetimde doğrulanamaz;'
            + ' bu yüzden numara zorunludur.'}
        />
      </div>
    );
  }

  if (acik === 'uygulanmaz') {
    return (
      <div style={{ marginTop: 'var(--s10)' }}>
        <Alan etiket="Bu dönem neden uygulanmıyor">
          <textarea className="ab-girdi" rows={3} value={gerekce} disabled={bekliyor}
            onChange={(e) => setGerekce(e.target.value)} />
        </Alan>
        <CekmeceEylemler
          birincil={
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(async () => {
                const r = await donemUygulanmazIsaretle({ donemId, gerekce });
                if (r.ok) kapat();
                return r;
              })}>
              {bekliyor ? 'İşleniyor…' : 'Uygulanmaz olarak kapat'}
            </Dugme>
          }
          ikincil={<Dugme tur="ikincil" disabled={bekliyor} onClick={kapat}>Vazgeç</Dugme>}
          dipNot={hata ?? 'Gerekçe dönemin kendisinde kalır; dönem SİLİNMEZ.'}
        />
      </div>
    );
  }

  return (
    <CekmeceEylemler
      birincil={s.durum === 'verildi'
        ? (
          <Dugme tur="birincil" disabled={bekliyor}
            onClick={() => calistir(() => donemTeyitIsaretle({ donemId }))}>
            {bekliyor ? 'İşleniyor…' : 'Merci teyidini işle'}
          </Dugme>
        )
        : (
          <Dugme tur="birincil" disabled={bekliyor} onClick={() => setAcik('verildi')}>
            Verildi olarak işaretle
          </Dugme>
        )}
      ikincil={s.durum === 'verildi' ? undefined : (
        <Dugme tur="ikincil" disabled={bekliyor} onClick={() => setAcik('uygulanmaz')}>
          Uygulanmaz
        </Dugme>
      )}
      dipNot={hata ?? 'Bu kararları YALNIZ insan verir; motor dönemi açar, süresi'
        + ' geçtiğini yazar ve "verildi" YAZAMAZ.'}
    />
  );
}

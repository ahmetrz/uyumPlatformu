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
  aktarimBildirimiIsaretle, basvuruyuReddet, basvuruyuYanitla,
} from '@/lib/eylemler2/veriKoruma';
import { VARSAYIM_SOZU } from '@/lib/veriKoruma/sureler';
import {
  type AktarimSatiri, baslikCumlesi, type BasvuruSatiri, type FaaliyetKaydi,
  kapsamCumlesi, type SicilKaydiGorunumu, veriKorumaOzeti,
} from './mantik';

/* KİŞİSEL VERİ KORUMA EKRANI (R15) — tek canvas modülü.

   ── ÜÇ SANİYE ─────────────────────────────────────────────────────────
   Ekrana bakan kişi şunu görmeli: kaç başvurunun süresi geçti, kaç
   başvuru yanıt bekliyor ve NEREDE SAYAÇ ÇALIŞMIYOR. Üçüncüsü bir kusur
   sayısı değil BİLGİ EKSİĞİ sayısıdır ve kendi sınıfıyla durur.

   ── SÜRE YOKSA GERİ SAYIM YOKTUR ──────────────────────────────────────
   Bildirim tarihi girilmemiş bir aktarımda sayaç ÇALIŞMAZ ve ekran bunu
   cümleyle söyler. Bugünü varsayıp geri saymak, kurumun yapmadığı bir
   bildirime tarih atfetmek ve olmayan bir gecikme uydurmak olurdu.

   ── AYDINLATMA METNİ ÜRETİLMEZ ────────────────────────────────────────
   Ekranda böyle bir düğme YOKTUR ve bu bilinçlidir: aydınlatma metni
   kurumun HUKUKİ BEYANIDIR; ürünün onu üretmesi kurumun adına hukuki
   metin yazmak olurdu. */

const BASVURU_KOLONLARI: Kolon[] = [
  { baslik: 'Konu', genislik: '150px', ikincil: true },
  { baslik: 'Alındı', genislik: '150px' },
  { baslik: 'Süre', genislik: '190px' },
  { baslik: 'Durum', genislik: '200px' },
];

const FAALIYET_KOLONLARI: Kolon[] = [
  { baslik: 'İş süreci', genislik: '190px', ikincil: true },
  { baslik: 'Hukuki sebep', genislik: '200px' },
  { baslik: 'Özel nitelikli', genislik: '190px' },
];

const AKTARIM_KOLONLARI: Kolon[] = [
  { baslik: 'Alıcı ülke', genislik: '160px', ikincil: true },
  { baslik: 'Dayanak', genislik: '200px' },
  { baslik: 'Bildirim', genislik: '250px' },
];

const MERCEKLER = [
  { id: 'basvurular', ad: 'Başvurular' },
  { id: 'envanter', ad: 'İşleme envanteri' },
  { id: 'aktarimlar', ad: 'Yurt dışına aktarım' },
] as const;

const GORUNUR_SATIR = 9;

/** Özel nitelikli üç değerlidir: evet · hayır · DEĞERLENDİRİLMEDİ. */
function ozelSozu(v: boolean | null): { yazi: string; sinif?: string } {
  if (v === true) return { yazi: 'Evet — özel nitelikli', sinif: 'd-md' };
  if (v === false) return { yazi: 'Hayır' };
  return { yazi: 'DEĞERLENDİRİLMEDİ', sinif: 'd-unk' };
}

export default function VeriKorumaIstemci({
  basvurular, faaliyetler, aktarimlar, sicil, karar, sureDayanagi,
}: {
  basvurular: BasvuruSatiri[];
  faaliyetler: FaaliyetKaydi[];
  aktarimlar: AktarimSatiri[];
  sicil: SicilKaydiGorunumu | null;
  karar: boolean;
  sureDayanagi: string | null;
}) {
  const [mercek, setMercek] = useUrlDurumu<string>('mercek', 'basvurular');
  const [seciliId, setSeciliId] = useUrlDurumuBos('sec');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const ozet = veriKorumaOzeti({ basvurular, faaliyetler, aktarimlar });

  const basvuruSatir: Satir[] = basvurular.map((b): Satir => ({
    id: b.id,
    durum: b.durumSinifi,
    konu: <span className="mono">{b.kod}</span>,
    alt: b.ozet ?? undefined,
    hucreler: [
      <span key="k">{b.konu}</span>,
      <span key="a">{zamanTR(b.alinma)}</span>,
      /* SÜRESİZ HÂL AYRI SINIFTA: "0 gün kaldı" ile "süre yok" aynı
         hücrede aynı renkte görünürse ekran yalan söyler. */
      <span key="s" className={!b.geri.sureVar ? 'd-unk' : (b.geri.gecti ? 'd-bd' : undefined)}>
        {b.geri.soz}
      </span>,
      <span key="d" className={`d-${b.durumSinifi}`}>{b.durumSozu}</span>,
    ],
  }));

  const faaliyetSatir: Satir[] = faaliyetler.map((f): Satir => {
    const o = ozelSozu(f.ozelNitelikli);
    return {
      id: f.id,
      durum: f.ozelNitelikli === null ? 'unk' : 'ok',
      konu: <span className="mono">{f.kod}</span>,
      alt: f.ad,
      hucreler: [
        <span key="s">{f.surecKod}</span>,
        <span key="h">{f.hukukiSebep}</span>,
        <span key="o" className={o.sinif}>{o.yazi}</span>,
      ],
    };
  });

  const aktarimSatir: Satir[] = aktarimlar.map((a): Satir => ({
    id: a.id,
    durum: a.bildirim.hal === 'tarih_girilmedi' ? 'unk'
      : (a.bildirim.hal === 'sayiyor' && a.bildirim.geri.sureVar && a.bildirim.geri.gecti
        ? 'bd' : 'ok'),
    konu: <span className="mono">{a.faaliyetKod}</span>,
    alt: a.aliciAd ?? undefined,
    hucreler: [
      <span key="u">{a.aliciUlke}</span>,
      <span key="d">{a.dayanakSozu}</span>,
      <span key="b" className={a.bildirim.hal === 'tarih_girilmedi' ? 'd-unk' : undefined}>
        {a.bildirim.soz}
      </span>,
    ],
  }));

  const tumSatirlar = mercek === 'envanter' ? faaliyetSatir
    : mercek === 'aktarimlar' ? aktarimSatir : basvuruSatir;
  const gorunur = kuyrukAcik ? tumSatirlar : tumSatirlar.slice(0, GORUNUR_SATIR);
  const kuyruk = tumSatirlar.length > GORUNUR_SATIR && !kuyrukAcik
    ? { metin: `+${tumSatirlar.length - GORUNUR_SATIR} satır daha`, ac: () => setKuyrukAcik(true) }
    : null;

  const seciliBasvuru = basvurular.find((b) => b.id === seciliId) ?? null;
  const seciliFaaliyet = faaliyetler.find((f) => f.id === seciliId) ?? null;
  const seciliAktarim = aktarimlar.find((a) => a.id === seciliId) ?? null;

  return (
    <>
      <main className="ab-canvas">
        <EkranBasligi
          eyebrow="Kişisel veri koruma"
          vurgu={String(ozet.suresiGecen > 0 ? ozet.suresiGecen : ozet.bekleyenBasvuru)}
          vurguDurumu={ozet.suresiGecen > 0 ? 'bd' : (ozet.bekleyenBasvuru > 0 ? 'md' : 'ok')}
          baslik={baslikCumlesi(ozet).toLowerCase()}
          metrikler={[
            { deger: ozet.suresiGecen, yazi: 'Süresi geçen başvuru',
              durum: ozet.suresiGecen > 0 ? 'bd' : 'ok' },
            { deger: ozet.bekleyenBasvuru, yazi: 'Yanıt bekleyen',
              durum: ozet.bekleyenBasvuru > 0 ? 'md' : 'ok' },
            { deger: ozet.faaliyet, yazi: 'İşleme faaliyeti', durum: 'ok' },
            /* DEĞERLENDİRİLMEDİ: bilgi eksiği, kusur değil. AYRI metrik. */
            { deger: ozet.degerlendirilmeyen, yazi: 'Değerlendirilmedi', durum: 'unk' },
            /* SAYACI ÇALIŞMAYAN aktarım — üçüncü ve AYRI hâl. */
            { deger: ozet.tarihsizAktarim, yazi: 'Bildirim tarihi yok', durum: 'unk' },
          ]}
        />

        <p className="ikincil" style={{ margin: '0 0 var(--s16)' }}>
          {kapsamCumlesi(ozet)}
        </p>

        <Filtreler
          secenekler={MERCEKLER.map((m) => ({ id: m.id, ad: m.ad }))}
          aktif={mercek}
          sec={(id) => { setMercek(id); setSeciliId(null); }}
        />

        {faaliyetler.length === 0 && basvurular.length === 0 ? (
          <BosIlk
            cumle={'Kişisel veri işleme envanteri boş. Envanter satırı bir İŞ'
              + ' SÜRECİNE bağlı olmadan kaydedilemez: sürece bağlanmamış bir'
              + ' satır, denetçinin ilk sorusuna cevap veremez. İlk adım'
              + ' süreçleri tanımlamaktır.'}
            eylem={<Link className="ab-dugme" href="/surecler">İş süreçleri</Link>}
          />
        ) : tumSatirlar.length === 0 ? (
          <BosFiltre temizle={() => setMercek('basvurular')} />
        ) : (
          <Tablo
            etiket={mercek === 'envanter' ? 'İşleme faaliyetleri'
              : mercek === 'aktarimlar' ? 'Yurt dışına aktarımlar' : 'Veri sahibi başvuruları'}
            konuBasligi={mercek === 'envanter' ? 'Faaliyet'
              : mercek === 'aktarimlar' ? 'Faaliyet' : 'Başvuru'}
            kolonlar={mercek === 'envanter' ? FAALIYET_KOLONLARI
              : mercek === 'aktarimlar' ? AKTARIM_KOLONLARI : BASVURU_KOLONLARI}
            satirlar={gorunur}
            secili={seciliId}
            sec={(id) => setSeciliId(id === seciliId ? null : id)}
            kuyruk={kuyruk}
            dipNot={'Motor süreyi izler ve GÖREV açar; başvuruya CEVAP YAZMAZ.'
              + ' Aydınlatma metni de üretilmez — metin kurumun beyanıdır.'}
          />
        )}

        {sicil && <SicilSeridi s={sicil} />}
        {sureDayanagi && (
          <p className="ikincil" style={{ margin: 'var(--s16) 0 0' }}>
            Yanıt süresi dayanağı: {sureDayanagi} · {VARSAYIM_SOZU}
          </p>
        )}
      </main>

      {mercek === 'basvurular' && seciliBasvuru && (
        <Cekmece
          kod={seciliBasvuru.kod} ad={seciliBasvuru.konu}
          etiket="Veri sahibi başvurusu" kapat={() => setSeciliId(null)}
        >
          <BasvuruCekmecesi b={seciliBasvuru} karar={karar} />
        </Cekmece>
      )}

      {mercek === 'envanter' && seciliFaaliyet && (
        <Cekmece
          kod={seciliFaaliyet.kod} ad={seciliFaaliyet.ad}
          etiket="İşleme faaliyeti" kapat={() => setSeciliId(null)}
        >
          <FaaliyetCekmecesi f={seciliFaaliyet} />
        </Cekmece>
      )}

      {mercek === 'aktarimlar' && seciliAktarim && (
        <Cekmece
          kod={seciliAktarim.faaliyetKod} ad={seciliAktarim.aliciUlke}
          etiket="Yurt dışına aktarım" kapat={() => setSeciliId(null)}
        >
          <AktarimCekmecesi a={seciliAktarim} karar={karar} />
        </Cekmece>
      )}
    </>
  );
}

function SicilSeridi({ s }: { s: SicilKaydiGorunumu }) {
  /* SİCİLİN ADI PAKETTEN GELİR. Çekirdek bir ülke sicilinin adını
     taşımaz; ekran onu `sicilAd` alanından okur. */
  const yuk = s.yukumluMu;
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>{s.sicilAd} kaydı</p>
      <p className="ikincil" style={{ margin: 0 }}>
        {yuk === null ? (
          <span className="d-unk">
            Kayıt yükümlülüğü DEĞERLENDİRİLMEDİ — &quot;yükümlü değiliz&quot; demek değildir.
          </span>
        ) : yuk === false ? (
          <>Yükümlü değil{s.muafiyetGerekcesi ? ` — ${s.muafiyetGerekcesi}` : ''}</>
        ) : (
          <>
            {s.sicilNo ? `Sicil no ${s.sicilNo}` : <span className="d-unk">Sicil no girilmedi</span>}
            {s.kayitTarihi ? ` · kayıt ${zamanTR(s.kayitTarihi)}` : ''}
            {s.sonGuncelleme ? ` · son güncelleme ${zamanTR(s.sonGuncelleme)}` : ''}
          </>
        )}
      </p>
    </div>
  );
}

function FaaliyetCekmecesi({ f }: { f: FaaliyetKaydi }) {
  const o = ozelSozu(f.ozelNitelikli);
  const liste = (x: string[]) => (x.length > 0 ? x.join(' · ') : 'Girilmedi');
  return (
    <>
      <CekmeceKimlik
        durum={f.ozelNitelikli === null ? 'unk' : 'ok'}
        soz={o.yazi}
        baslik={f.ad}
        cumle={'Bu satır bir İŞ SÜRECİNE bağlıdır ve bağsız kaydedilemez:'
          + ' sürece bağlanmamış bir envanter, hangi iş için veri işlendiğini'
          + ' söyleyemez.'}
      />
      <CekmeceAlanlar alanlar={[
        { etiket: 'İş süreci', deger: `${f.surecKod} · ${f.surecAd}` },
        { etiket: 'İşleme amacı', deger: f.amac },
        { etiket: 'Hukuki sebep', deger: f.hukukiSebep },
        { etiket: 'Veri kategorileri', deger: liste(f.veriKategorileri),
          durum: f.veriKategorileri.length ? undefined : 'unk' },
        { etiket: 'İlgili kişi grupları', deger: liste(f.ilgiliKisiGruplari),
          durum: f.ilgiliKisiGruplari.length ? undefined : 'unk' },
        { etiket: 'Alıcı grupları', deger: liste(f.aliciGruplari),
          durum: f.aliciGruplari.length ? undefined : 'unk' },
        { etiket: 'Özel nitelikli', deger: o.yazi,
          durum: f.ozelNitelikli === null ? 'unk' : undefined },
        { etiket: 'Saklama politikası', deger: f.saklamaAdi ?? 'Bağlanmadı',
          durum: f.saklamaAdi ? undefined : 'unk' },
        { etiket: 'Teknik/idari tedbir', deger: f.maddeKodu ?? 'Bağlanmadı',
          durum: f.maddeKodu ? undefined : 'unk' },
        { etiket: 'Yurt dışına aktarım', deger: String(f.aktarimSayisi) },
      ]} />
      <CekmeceEylemler dipNot={'Aydınlatma metni ÜRETİLMEZ: metin kurumun hukuki'
        + ' beyanıdır ve ürün kurumun adına beyanda bulunmaz.'} />
    </>
  );
}

function BasvuruCekmecesi({ b, karar }: { b: BasvuruSatiri; karar: boolean }) {
  return (
    <>
      <CekmeceKimlik
        durum={b.durumSinifi} soz={b.durumSozu} baslik={b.konu}
        cumle={!b.geri.sureVar
          ? 'Yanıt süresi kuralı kurulu paketlerde YOK — geri sayım gösterilmiyor'
            + ' ve "süresi geçti" yazılmıyor. Ürün bir süre uydurmaz.'
          : undefined}
      />
      <CekmeceAlanlar alanlar={[
        { etiket: 'Alındı', deger: zamanTR(b.alinma) },
        { etiket: 'Kanal', deger: b.kanal ?? 'Girilmedi',
          durum: b.kanal ? undefined : 'unk' },
        { etiket: 'Son tarih',
          deger: b.sonTarih ? zamanTR(b.sonTarih) : 'Süre kuralı yok',
          durum: b.sonTarih ? undefined : 'unk' },
        { etiket: 'Kalan süre', deger: b.geri.soz,
          durum: !b.geri.sureVar ? 'unk' : (b.geri.gecti ? 'bd' : undefined) },
        { etiket: 'Özet', deger: b.ozet ?? 'Girilmedi',
          durum: b.ozet ? undefined : 'unk' },
      ]} />
      {b.yanitMetni && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Verilen yanıt</p>
          <p className="ikincil" style={{ margin: 0 }}>{b.yanitMetni}</p>
        </div>
      )}
      {b.redGerekcesi && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Ret gerekçesi</p>
          <p className="ikincil" style={{ margin: 0 }}>{b.redGerekcesi}</p>
        </div>
      )}
      <BasvuruEylemleri b={b} karar={karar} />
    </>
  );
}

function BasvuruEylemleri({ b, karar }: { b: BasvuruSatiri; karar: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState<'yanit' | 'ret' | null>(null);
  const [metin, setMetin] = useState('');

  if (!karar) {
    return (
      <CekmeceEylemler dipNot={'Başvuruyu karara bağlamak uyum onay yetkisi ister ve'
        + ' kurum geneli kapsam gerektirir. Başvuru okunabilir, yanıtlanamaz.'} />
    );
  }
  if (b.durum === 'yanitlandi' || b.durum === 'reddedildi') {
    return (
      <CekmeceEylemler dipNot={'Bu başvuru karara bağlandı. Kayıt SİLİNMEZ; denetim'
        + ' izinde kimin, ne zaman ve hangi metinle yanıtladığı durur.'} />
    );
  }

  const kapat = () => { setAcik(null); setMetin(''); };

  if (acik) {
    const yanitMi = acik === 'yanit';
    return (
      <div style={{ marginTop: 'var(--s10)' }}>
        <Alan etiket={yanitMi
          ? 'Veri sahibine verilecek yanıt (en az 20 karakter)'
          : 'Ret gerekçesi (en az 10 karakter)'}>
          <textarea className="ab-girdi" rows={4} value={metin} disabled={bekliyor}
            onChange={(e) => setMetin(e.target.value)} />
        </Alan>
        {hata && <p className="d-bd ikincil" style={{ margin: 'var(--s6) 0 0' }}>{hata}</p>}
        <CekmeceEylemler
          birincil={
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(async () => {
                const r = yanitMi
                  ? await basvuruyuYanitla({ basvuruId: b.id, yanitMetni: metin })
                  : await basvuruyuReddet({ basvuruId: b.id, gerekce: metin });
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
      birincil={<Dugme tur="birincil" onClick={() => setAcik('yanit')}>Yanıtla</Dugme>}
      ikincil={<Dugme onClick={() => setAcik('ret')}>Reddet</Dugme>}
      dipNot={'Yanıt metnini SİZ yazarsınız: motor bir veri sahibine cevap yazmaz,'
        + ' yalnız süreyi izler ve görev açar.'}
    />
  );
}

function AktarimCekmecesi({ a, karar }: { a: AktarimSatiri; karar: boolean }) {
  return (
    <>
      <CekmeceKimlik
        durum={a.bildirim.hal === 'tarih_girilmedi' ? 'unk' : 'ok'}
        soz={a.bildirim.soz}
        baslik={a.aliciUlke}
        cumle={a.bildirim.hal === 'tarih_girilmedi'
          ? 'Bildirim tarihi GİRİLMEDİ: sayaç çalışmaz. Bugünü varsayıp geri'
            + ' saymak, kurumun yapmadığı bir bildirime tarih atfetmek olurdu.'
          : undefined}
      />
      <CekmeceAlanlar alanlar={[
        { etiket: 'Alıcı ülke', deger: a.aliciUlke },
        { etiket: 'Alıcı', deger: a.aliciAd ?? 'Girilmedi',
          durum: a.aliciAd ? undefined : 'unk' },
        { etiket: 'Dayanak', deger: a.dayanakSozu },
        { etiket: 'Bildirim tarihi',
          deger: a.bildirimTarihi ? zamanTR(a.bildirimTarihi) : 'Girilmedi',
          durum: a.bildirimTarihi ? undefined : 'unk' },
        { etiket: 'Bildirim durumu', deger: a.bildirim.soz,
          durum: a.bildirim.hal === 'tarih_girilmedi' ? 'unk' : undefined },
      ]} />
      <AktarimEylemleri a={a} karar={karar} />
    </>
  );
}

function AktarimEylemleri({ a, karar }: { a: AktarimSatiri; karar: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [tarih, setTarih] = useState('');

  if (!karar) {
    return (
      <CekmeceEylemler dipNot={'Bildirim tarihini yazmak uyum onay yetkisi ister ve'
        + ' kurum geneli kapsam gerektirir. Aktarım okunabilir, değiştirilemez.'} />
    );
  }
  if (a.bildirim.hal === 'gerekmiyor') {
    return (
      <CekmeceEylemler dipNot={'Bu dayanak mercie bildirim gerektirmiyor — ürün'
        + ' olmayan bir yükümlülük için tarih istemez.'} />
    );
  }

  if (acik) {
    return (
      <div style={{ marginTop: 'var(--s10)' }}>
        <Alan etiket="Mercie bildirim tarihi (gerçekleşen tarih)">
          <input className="ab-girdi" type="date" value={tarih} disabled={bekliyor}
            onChange={(e) => setTarih(e.target.value)} />
        </Alan>
        {hata && <p className="d-bd ikincil" style={{ margin: 'var(--s6) 0 0' }}>{hata}</p>}
        <CekmeceEylemler
          birincil={
            <Dugme tur="birincil" disabled={bekliyor}
              onClick={() => calistir(async () => {
                const r = await aktarimBildirimiIsaretle({
                  aktarimId: a.id, bildirimTarihi: tarih,
                });
                if (r.ok) { setAcik(false); setTarih(''); }
                return r;
              })}>
              {bekliyor ? 'İşleniyor…' : 'Kaydet'}
            </Dugme>
          }
          ikincil={<Dugme onClick={() => { setAcik(false); setTarih(''); }}>Vazgeç</Dugme>}
        />
      </div>
    );
  }

  return (
    <CekmeceEylemler
      birincil={<Dugme tur="birincil" onClick={() => setAcik(true)}>Bildirim tarihini yaz</Dugme>}
      dipNot={'Tarih SİZİN beyanınızdır: ürün bugünü varsaymaz, sayaç ancak'
        + ' gerçekleşen tarihle işler.'}
    />
  );
}

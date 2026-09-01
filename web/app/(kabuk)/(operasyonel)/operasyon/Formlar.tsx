'use client';
import { useState } from 'react';
import { Alan, Dugme, Im } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import {
  degisiklikKaydet, degisiklikIlerlet, degisiklikGeriAl,
} from '@/lib/eylemler2/operasyon';
import { olayBagla, olayBagKaldir } from '@/lib/eylemler2/olay';
import { ASAMALAR, asamaEtiketi, asamaIndeksi, eksikKapilar, kapandiMi, kapilar,
  type D, type Kodlu, type OlayAdayi } from './mantik';

/* Değişiklik yazma yüzeyleri — MODAL YOK (06 §B4), `prompt()` YOK.
   Hepsi 420px çekmecede render edilir. Mutasyonlar
   lib/eylemler2/operasyon.ts'ten AYNEN çağrılır; imza değiştirilmez,
   doğrulama ve yetki sunucuda kalır. Ozalit sürümünde geri alma gerekçesi
   tarayıcının `prompt()` kutusundan alınıyordu — o kutu ne çekmecede
   yaşayabilir ne de klavye/ekran okuyucu sözleşmesine uyar; yerini
   çekmecenin içinde açılan bir gerekçe alanı aldı. */

/* ── Yeni / mevcut değişiklik ───────────────────────────────────────── */

/* Üç değerli alanın (`Boolean?`) form karşılığı. `null` bir SEÇENEKTİR,
   varsayılan değil: "sorulmadı" ile "hayır" ayrı bilgilerdir ve emniyet
   kapısı ikisini de geçirmez ama denetim ikisini ayrı okur. */
function ucDegerMetni(d: boolean | null): 'evet' | 'hayir' | 'bilinmiyor' {
  return d === true ? 'evet' : d === false ? 'hayir' : 'bilinmiyor';
}

function ucDegerCoz(m: string): boolean | null {
  return m === 'evet' ? true : m === 'hayir' ? false : null;
}

const ONAY_KUTUSU: React.CSSProperties = {
  display: 'flex', gap: 'var(--s8)', alignItems: 'flex-start',
  fontSize: 'var(--t-code-lg)', color: 'var(--i2)',
};

export function DegisiklikFormu({ degisiklik, tesisler, kapat }: {
  degisiklik: D | null; tesisler: Kodlu[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [v, setV] = useState({
    baslik: degisiklik?.baslik ?? '',
    aciklama: degisiklik?.aciklama ?? '',
    tesisId: degisiklik?.tesis?.id ?? '',
    varlikEtiketi: degisiklik?.varlikEtiketi ?? '',
    otMu: degisiklik?.otMu ?? false,
    planTarihi: degisiklik?.planTarihi?.slice(0, 10) ?? '',
    /* ÜÇ DEĞERLİ: null = HENÜZ SORULMADI. `?? false` yazmak, hiç
       değerlendirilmemiş bir emniyet kapısını "hayır, alınmadı" diye
       KAYDA GEÇİRİRDİ — sunucu üç değeri doğru saklıyor (operasyon.ts
       `?? null`), kaybı yapan yer bu formdu. Kapı `=== true` istediği için
       planlama davranışı değişmiyordu; değişen şey, kimsenin bakmadığı bir
       alanın "bakıldı ve olumsuz" görünmesiydi. */
    saglayiciOnayi: degisiklik?.saglayiciOnayi ?? null,
    bakimPenceresi: degisiklik?.bakimPenceresi ?? '',
    geriAlmaPlani: degisiklik?.geriAlmaPlani ?? '',
    onDegisiklikYedegi: degisiklik?.onDegisiklikYedegi ?? null,
    uretimEtkisi: degisiklik?.uretimEtkisi ?? '',
  });

  const gecerli = v.baslik.trim().length > 0;

  /* Eksik kapılar formun İÇİNDE önceden söylenir: kullanıcı kaydedip
     sonra "planlanamaz" hatası almasın. Sunucu yine de son sözü söyler. */
  /* Kapı `=== true` ister: `null` (sorulmadı) ile `false` (hayır) ikisi de
     kapıyı açmaz ama AYNI ŞEY DEĞİLDİR ve eksik listesinde ayrı okunur. */
  const kapiEtiketi = (deger: boolean | null, ad: string) =>
    (deger === true ? null : deger === false ? `${ad} (alınmadı)` : `${ad} (sorulmadı)`);

  const eksik = v.otMu
    ? [
      kapiEtiketi(v.saglayiciOnayi, 'sağlayıcı onayı'),
      v.bakimPenceresi.trim() ? null : 'bakım penceresi',
      v.geriAlmaPlani.trim() ? null : 'geri alma planı',
      kapiEtiketi(v.onDegisiklikYedegi, 'ön değişiklik yedeği'),
      v.uretimEtkisi.trim() ? null : 'üretim etkisi',
    ].filter((x): x is string => x !== null)
    : [];

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Başlık" zorunlu>
        <input className="ab-gr" value={v.baslik}
          placeholder="Örn. OT güvenlik duvarı kural seti güncellemesi"
          onChange={(e) => setV({ ...v, baslik: e.target.value })} />
      </Alan>
      <Alan etiket="Santral">
        <select className="ab-gr" value={v.tesisId}
          onChange={(e) => setV({ ...v, tesisId: e.target.value })}>
          <option value="">portföy (santral bağı yok)</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Varlık etiketi">
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={v.varlikEtiketi}
          placeholder="ADANA-OTFW-01"
          onChange={(e) => setV({ ...v, varlikEtiketi: e.target.value })} />
      </Alan>
      <Alan etiket="Plan tarihi">
        <input className="ab-gr" type="date" value={v.planTarihi}
          onChange={(e) => setV({ ...v, planTarihi: e.target.value })} />
      </Alan>
      <label style={ONAY_KUTUSU}>
        <input type="checkbox" checked={v.otMu}
          onChange={(e) => setV({ ...v, otMu: e.target.checked })} />
        OT değişikliği — beş emniyet kapısı devreye girer
      </label>
      <Alan etiket="Açıklama">
        <textarea className="ab-gr" rows={3} value={v.aciklama}
          style={{ resize: 'vertical' }}
          onChange={(e) => setV({ ...v, aciklama: e.target.value })} />
      </Alan>

      {v.otMu && (
        <div style={{ display: 'grid', gap: 'var(--s14)',
          borderTop: 'var(--bw-edge) solid var(--hr2)', paddingTop: 'var(--s16)' }}>
          <p className="etiket" style={{ margin: 0 }}>OT emniyet kapıları</p>
          {/* Onay kutusu iki değer taşır; bu alanlar ÜÇ değerlidir.
              Kutuyla gösterilseydi "sorulmadı" diye bir hâl anlatılamaz,
              her kaydedişte "hayır" yazılırdı. */}
          <Alan etiket="Sağlayıcı (vendor) onayı">
            <select className="ab-gr" value={ucDegerMetni(v.saglayiciOnayi)}
              onChange={(e) => setV({ ...v, saglayiciOnayi: ucDegerCoz(e.target.value) })}>
              <option value="bilinmiyor">sorulmadı</option>
              <option value="evet">alındı</option>
              <option value="hayir">alınmadı</option>
            </select>
          </Alan>
          <Alan etiket="Değişiklik öncesi yedek">
            <select className="ab-gr" value={ucDegerMetni(v.onDegisiklikYedegi)}
              onChange={(e) => setV({ ...v, onDegisiklikYedegi: ucDegerCoz(e.target.value) })}>
              <option value="bilinmiyor">sorulmadı</option>
              <option value="evet">alındı</option>
              <option value="hayir">alınmadı</option>
            </select>
          </Alan>
          <Alan etiket="Bakım penceresi">
            <input className="ab-gr" value={v.bakimPenceresi} placeholder="12.10 02:00–05:00"
              onChange={(e) => setV({ ...v, bakimPenceresi: e.target.value })} />
          </Alan>
          <Alan etiket="Üretim etkisi">
            <input className="ab-gr" value={v.uretimEtkisi} placeholder="Ünite-2 30 dk yedekte"
              onChange={(e) => setV({ ...v, uretimEtkisi: e.target.value })} />
          </Alan>
          <Alan etiket="Geri alma planı">
            <textarea className="ab-gr" rows={2} value={v.geriAlmaPlani}
              style={{ resize: 'vertical' }}
              onChange={(e) => setV({ ...v, geriAlmaPlani: e.target.value })} />
          </Alan>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            {eksik.length === 0
              ? 'Beş kapı da dolu — kayıt planlama aşamasına geçebilir.'
              : `${eksik.length} kapı eksik: ${eksik.join(', ')}. Kayıt saklanır ama planlanamaz.`}
          </p>
        </div>
      )}

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => degisiklikKaydet({
            id: degisiklik?.id,
            baslik: v.baslik,
            aciklama: v.aciklama || null,
            tesisId: v.tesisId || null,
            varlikEtiketi: v.varlikEtiketi || null,
            otMu: v.otMu,
            planTarihi: v.planTarihi || null,
            // OT olmayan değişiklikte kapı alanları null kalır: "hayır" değil,
            // "bu kayda uygulanmaz" demektir.
            saglayiciOnayi: v.otMu ? v.saglayiciOnayi : null,
            bakimPenceresi: v.otMu ? v.bakimPenceresi || null : null,
            geriAlmaPlani: v.otMu ? v.geriAlmaPlani || null : null,
            onDegisiklikYedegi: v.otMu ? v.onDegisiklikYedegi : null,
            uretimEtkisi: v.otMu ? v.uretimEtkisi || null : null,
          }), kapat)}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Yaşam döngüsü talep aşamasından başlar ve atlanamaz; her geçiş denetim izine yazılır.
      </p>
    </div>
  );
}

/* ── Aşama ilerlet · geri al ────────────────────────────────────────────
   İlerleme tek adımlıdır (sunucu atlamayı reddeder). Engeller düğmeye
   basmadan ÖNCE söylenir: OT kapıları eksikse planlamaya, doğrulama notu
   boşsa kapanışa geçilemez. */

export function AsamaEylemleri({ d }: { d: D }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [dogrulama, setDogrulama] = useState('');
  const [geriAcik, setGeriAcik] = useState(false);
  const [gerekce, setGerekce] = useState('');

  const ix = asamaIndeksi(d.durum);
  const sonraki = ix >= 0 && ix < ASAMALAR.length - 1 ? ASAMALAR[ix + 1] : null;
  const eksik = eksikKapilar(d);
  const kapiEngeli = sonraki === 'planlandi' && d.otMu && eksik.length > 0;
  const notEngeli = sonraki === 'dogrulandi' && dogrulama.trim().length === 0;

  if (!d.onaylanabilir) {
    return (
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s26)' }}>
        <div className="ab-blok">
          <p className="etiket" style={{ margin: 0 }}>Yetkisiz</p>
          <p className="cumle">
            Aşama ilerletmek ve geri almak envanter onay yetkisi ister;
            bu kaydın kapsamında yetkiniz yok.
          </p>
        </div>
      </div>
    );
  }

  // Kapanmış kayıt ne ilerler ne geri alınır; sunucu da ikisini reddeder.
  if (kapandiMi(d)) return null;

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s26)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>Aşama</p>

      {sonraki === 'dogrulandi' && (
        <div style={{ marginBottom: 'var(--s12)' }}>
          <Alan etiket="Değişiklik-sonrası doğrulama notu" zorunlu>
            <textarea className="ab-gr" rows={2} value={dogrulama}
              style={{ resize: 'vertical' }}
              placeholder="Değişiklik sonrası ne gözlendi, hangi kontrol yapıldı?"
              onChange={(e) => setDogrulama(e.target.value)} />
          </Alan>
        </div>
      )}

      {sonraki && (
        <Dugme tur="tam" disabled={bekliyor || kapiEngeli || notEngeli}
          onClick={() => calistir(
            () => degisiklikIlerlet({ id: d.id, sonDogrulama: dogrulama || null }),
            () => setDogrulama(''),
          )}>
          Sonraki aşama · {asamaEtiketi(sonraki)}
        </Dugme>
      )}

      {kapiEngeli && (
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0', color: 'var(--bd)' }}>
          Planlamadan önce {eksik.length} kapı doldurulmalı:
          {' '}{eksik.join(', ').toLocaleLowerCase('tr-TR')}.
        </p>
      )}

      {geriAcik ? (
        <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s12)' }}>
          <Alan etiket="Geri alma gerekçesi" zorunlu>
            <textarea className="ab-gr" rows={2} value={gerekce}
              style={{ resize: 'vertical' }}
              placeholder="Değişiklik neden geri alınıyor?"
              onChange={(e) => setGerekce(e.target.value)} />
          </Alan>
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="ret" disabled={bekliyor || !gerekce.trim()}
              onClick={() => calistir(
                () => degisiklikGeriAl({ id: d.id, gerekce }),
                () => { setGeriAcik(false); setGerekce(''); },
              )}>
              Geri al
            </Dugme>
            <Dugme onClick={() => setGeriAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 'var(--s10)' }}>
          <Dugme onClick={() => setGeriAcik(true)} disabled={bekliyor}>
            Değişikliği geri al
          </Dugme>
        </div>
      )}

      {hata && <p className="ab-gr-hata" role="alert"
        style={{ margin: 'var(--s10) 0 0' }}>{hata}</p>}
    </div>
  );
}

/* ── Kapı listesi (salt okuma) ──────────────────────────────────────────
   Kapının üç hâli vardır ve üçü ayrı işaretlenir: dolu · alınmadı (karar) ·
   kaydedilmedi (boşluk). "Kaydedilmedi"yi "alınmadı" gibi göstermek
   bilinmeyeni karara çevirirdi. */

export function KapiListesi({ d }: { d: D }) {
  const hepsi = kapilar(d);
  if (hepsi.length === 0) {
    return (
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Emniyet kapıları</p>
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          BT değişikliği — OT emniyet kapıları bu kayda uygulanmaz.
        </p>
      </div>
    );
  }
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Emniyet kapıları · {hepsi.filter((k) => k.tamam).length}/{hepsi.length}
      </p>
      <div style={{ display: 'grid', gap: 'var(--s10)' }}>
        {hepsi.map((k) => (
          <div key={k.ad} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
            alignItems: 'start', gap: 'var(--s8)' }}>
            <span style={{ paddingTop: 3 }}>
              <Im durum={k.tamam ? 'ok' : k.deger === null ? 'unk' : 'bd'}
                ad={k.tamam ? `${k.ad} tamam` : k.deger === null
                  ? `${k.ad} kaydedilmedi` : `${k.ad} alınmadı`} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--t-field)' }}>{k.ad}</span>
              <span className="mono" style={{ display: 'block', marginTop: 2,
                fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                {k.deger ?? 'kaydedilmedi'}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Olay bağı ──────────────────────────────────────────────────────────
   Değişiklik ile olay arasındaki halka. Bu ekran olay KÜTÜĞÜ değildir ve
   öyle olmayacak (bkz. mantik.ts başındaki not): olay açma ve güncelleme
   /olaylar ekranında yaşar, burada YALNIZ bağ kurulur. Aynı kaydı iki
   ekranda iki farklı yoğunlukla göstermek, kapatılmış bir yoğunluk
   borcunu geri getirirdi.

   Bağ `olayBagla`/`olayBagKaldir` ile kurulur ve kapsam denetimi OLAYIN
   santralinden gelir — değişikliğin değil. Portföy geneli (santralsiz) bir
   değişikliğe, kullanıcının yetkisi olmayan bir santralin olayı
   bağlanamaz; sunucu reddeder. */

export function OlayBagi({ d, adaylar }: { d: D; adaylar: OlayAdayi[] }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [hedef, setHedef] = useState('');

  const bagliIdler = new Set(d.olaylar.map((o) => o.id));
  const secilebilir = adaylar.filter((a) => !bagliIdler.has(a.id));

  if (!d.yazilabilir) {
    return (
      <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
        Olay bağı kurmak envanter yazma yetkisi ister; bu kaydın kapsamında
        yetkiniz yok.
      </p>
    );
  }

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s22)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Olay bağı · {d.olaylar.length}
      </p>

      {d.olaylar.length === 0 ? (
        <p className="ab-panel-dip" style={{ margin: '0 0 var(--s10)' }}>
          Bu değişikliğe bağlı olay kaydı yok. Bağ yokluğu &quot;bu değişiklik
          olaysız geçti&quot; demek DEĞİLDİR — kimse bağlamamış olabilir.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s6)', marginBottom: 'var(--s10)' }}>
          {d.olaylar.map((o) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'baseline',
              gap: 'var(--s10)', fontSize: 'var(--t-cell)' }}>
              <span className="mono" style={{ fontWeight: 600 }}>{o.kod}</span>
              <span style={{ color: 'var(--i3)', minWidth: 0, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.alt}</span>
              <button type="button" className="ab-dugme satir" style={{ marginLeft: 'auto' }}
                disabled={bekliyor}
                onClick={() => calistir(() => olayBagKaldir({
                  olayId: o.id, tip: 'degisiklik', hedefId: d.id }))}>
                Bağı kaldır
              </button>
            </div>
          ))}
        </div>
      )}

      {acik ? (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          <Alan etiket="Bağlanacak olay" zorunlu hata={hata}>
            <select className="ab-gr" value={hedef} onChange={(e) => setHedef(e.target.value)}>
              <option value="">Seçiniz…</option>
              {secilebilir.map((a) => (
                <option key={a.id} value={a.id}>{a.kod} — {a.alt}</option>
              ))}
            </select>
          </Alan>
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor || !hedef}
              onClick={() => calistir(
                () => olayBagla({ olayId: hedef, tip: 'degisiklik', hedefId: d.id }),
                () => { setAcik(false); setHedef(''); },
              )}>
              {bekliyor ? 'Bağlanıyor…' : 'Bağla'}
            </Dugme>
            <Dugme tur="ret" disabled={bekliyor}
              onClick={() => { setAcik(false); setHedef(''); }}>Vazgeç</Dugme>
          </div>
        </div>
      ) : (
        <Dugme disabled={secilebilir.length === 0} onClick={() => setAcik(true)}>
          {secilebilir.length === 0 ? 'Bağlanabilecek olay kalmadı' : 'Olay bağla'}
        </Dugme>
      )}

      {hata && !acik && <p className="ab-gr-hata" role="alert"
        style={{ margin: 'var(--s10) 0 0' }}>{hata}</p>}
    </div>
  );
}

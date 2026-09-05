'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import { kullaniciKaydet, yetkiVer } from '@/lib/eylemler';
import { parolaBelirle } from '@/lib/eylemler2/hesap';
import { topluZimmetAc, zimmetIptal } from '@/lib/eylemler2/zimmet';
import {
  ekipKaydet, ekipUyeligiKaydet, ekipUyeligiKaldir, topluSahipDevri,
} from '@/lib/eylemler2/varlikYonetisim';
import {
  EKIP_TIPLERI, EKIP_TIP_ETIKETI, UYELIK_ROLLERI,
} from '@/lib/varlik/sahiplik';
import { ROLLER, ROL_ETIKET, tarihTR } from '@/lib/sabitler';
import { PAROLA_EN_AZ, parolaKusuru } from '../ayarlar/mantik';
import { devirDisi, type Ekip, type EkipUyesi, type Hesap, type Secenek } from './mantik';

/** Üyelik rolünün Türkçe karşılığı — `sahip` ekibin karar mercii. */
const UYELIK_ROL_ETIKETI: Record<string, string> = {
  sahip: 'sahip · karar mercii', emanetci: 'emanetçi', uye: 'üye',
};

/* Yetki yazma yüzeyleri — MODAL YOK (06 §B4): ikisi de 420px çekmecede
   açılır. Mutasyonlar lib/eylemler.ts'ten AYNEN çağrılır; imza değişmez. */

export function KullaniciFormu({ hesap, kapat }: { hesap: Hesap | null; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({
    adSoyad: hesap?.ad ?? '',
    eposta: hesap?.eposta ?? '',
    unvan: hesap?.unvan ?? '',
  });
  const gecerli = !!f.adSoyad.trim() && !!f.eposta.trim();

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Ad soyad" zorunlu>
        <input className="ab-gr" value={f.adSoyad}
          onChange={(e) => setF({ ...f, adSoyad: e.target.value })} />
      </Alan>
      <Alan etiket="E-posta" zorunlu>
        <input className="ab-gr" type="email" style={{ fontFamily: 'var(--veri)' }}
          value={f.eposta} onChange={(e) => setF({ ...f, eposta: e.target.value })} />
      </Alan>
      <Alan etiket="Unvan">
        <input className="ab-gr" value={f.unvan} placeholder="bilinmiyor"
          onChange={(e) => setF({ ...f, unvan: e.target.value })} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => kullaniciKaydet({
            id: hesap?.id, eposta: f.eposta, adSoyad: f.adSoyad,
            unvan: f.unvan.trim() || null,
          }), kapat)}>
          {hesap ? 'Kaydet' : 'Kullanıcı oluştur'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Kullanıcı oluşturmak erişim vermez: yetki ayrı verilir ve denetim izine yazılır.
      </p>
    </div>
  );
}

/* Yetki verme: üç eksen de boş bırakılabilir ve boş eksen "tümü" demektir —
   bu yüzden seçim ekranda açıkça yazılır, kullanıcı ne verdiğini görür. */

export function YetkiFormu({ hesap, surecler, tesisler, kisitliKapsam, kapat }: {
  hesap: Hesap;
  surecler: Secenek[];
  tesisler: Secenek[];
  kisitliKapsam: boolean;
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({ surecId: '', tesisId: '', rol: 'okuyucu' });

  const surecAdi = surecler.find((s) => s.id === f.surecId)?.ad ?? 'tüm süreçler';
  const tesisAdi = tesisler.find((t) => t.id === f.tesisId)?.ad ?? 'tüm santraller';

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Rol" zorunlu>
        <select className="ab-gr" value={f.rol}
          onChange={(e) => setF({ ...f, rol: e.target.value })}>
          {ROLLER.map((r) => <option key={r} value={r}>{ROL_ETIKET[r]}</option>)}
        </select>
      </Alan>
      <Alan etiket="Uyum süreci">
        <select className="ab-gr" value={f.surecId}
          onChange={(e) => setF({ ...f, surecId: e.target.value })}>
          <option value="">tüm süreçler</option>
          {surecler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Santral">
        <select className="ab-gr" value={f.tesisId}
          onChange={(e) => setF({ ...f, tesisId: e.target.value })}>
          <option value="">tüm santraller</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
        </select>
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <Dugme tur="tam" disabled={bekliyor}
        onClick={() => calistir(() => yetkiVer({
          kullaniciId: hesap.id,
          surecId: f.surecId || null,
          tesisId: f.tesisId || null,
          rol: f.rol,
        }), kapat)}>
        {bekliyor ? 'Veriliyor…' : 'Yetkiyi ver'}
      </Dugme>
      <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        {`${hesap.ad} · ${ROL_ETIKET[f.rol as keyof typeof ROL_ETIKET]} · ${surecAdi} · ${tesisAdi}`}
        {!f.surecId && !f.tesisId
          && ' — kapsam boş bırakıldı: yetki portföyün tamamına uygulanır.'}
        {kisitliKapsam && ' Santral listesi kendi kapsamınızla sınırlıdır.'}
      </p>
    </div>
  );
}

/* Parola tanımlama (D26): yönetici bir hesaba ilk parolayı verir ya da
   sıfırlar. Parola ekrandan sunucuya bir kez gider; tarayıcıda tutulmaz,
   izde görünmez. Onaylanınca o hesabın TÜM açık oturumları düşer — form
   bunu saklamaz, altına yazar. */

export function ParolaFormu({ hesap, kapat }: { hesap: Hesap; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [parola, setParola] = useState('');
  const [tekrar, setTekrar] = useState('');
  const kusur = parolaKusuru(parola);
  const uyusmuyor = tekrar.length > 0 && tekrar !== parola;
  const gecerli = parola.length >= PAROLA_EN_AZ && tekrar === parola;

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket={hesap.parolaVar ? 'Yeni parola' : 'İlk parola'} zorunlu hata={kusur ?? undefined}>
        <input className="ab-gr" type="password" autoComplete="new-password"
          style={{ fontFamily: 'var(--veri)' }} value={parola}
          onChange={(e) => setParola(e.target.value)} />
      </Alan>
      <Alan etiket="Parola (tekrar)" zorunlu hata={uyusmuyor ? 'İki parola aynı değil' : undefined}>
        <input className="ab-gr" type="password" autoComplete="new-password"
          style={{ fontFamily: 'var(--veri)' }} value={tekrar}
          onChange={(e) => setTekrar(e.target.value)} />
      </Alan>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(
            () => parolaBelirle({ kullaniciId: hesap.id, parola }),
            () => { setParola(''); setTekrar(''); kapat(); },
          )}>
          {bekliyor ? 'Kaydediliyor…' : (hesap.parolaVar ? 'Parolayı sıfırla' : 'Parolayı tanımla')}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>

      <p className="ab-panel-dip" style={{ margin: 0 }}>
        {`${hesap.ad} · en az ${PAROLA_EN_AZ} karakter. `}
        {hesap.parolaVar
          ? 'Kaydedilince bu hesabın açık oturumlarının tamamı kapanır; kişi yeni parolayla girer. '
          : 'Bu hesap şu an giriş yapamaz; parola tanımlanınca yapar. '}
        {'Parola denetim izine yazılmaz, yalnız "kim, kime, ne zaman" yazılır.'}
      </p>
    </div>
  );
}

/* ═══ OT-09 · Ekip ve sahiplik devri ═══════════════════════════════════

   Bu ekranın asıl sorusu "kim neye ERİŞİYOR"dur; buradaki iki yüzey
   "kim neyin SAHİBİ" sorusunu aynı yere getirir. İkisi birleştirilemez
   ama ayrı ekranlara da konamaz: bir hesabı kapatan kişi, o kişinin
   üstünde kalan varlıkları da aynı anda görmeli — yoksa kayıt görünürde
   sahipli kalır, gerçekte öksüzleşir. */

export function EkipFormu({ ekip, tesisler, kapat }: {
  ekip: Ekip | null; tesisler: Secenek[]; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState({
    kod: ekip?.kod ?? '', ad: ekip?.ad ?? '', tip: ekip?.tip ?? 'diger',
    tesisId: ekip?.tesisId ?? '', eposta: ekip?.eposta ?? '',
    aktif: ekip?.aktif ?? true,
  });
  const gecerli = !!f.kod.trim() && !!f.ad.trim();

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <Alan etiket="Kod" zorunlu>
        <input className="ab-gr" value={f.kod} disabled={!!ekip}
          style={{ fontFamily: 'var(--veri)' }}
          onChange={(e) => setF({ ...f, kod: e.target.value })} />
      </Alan>
      <Alan etiket="Ad" zorunlu>
        <input className="ab-gr" value={f.ad}
          onChange={(e) => setF({ ...f, ad: e.target.value })} />
      </Alan>
      <Alan etiket="Tip">
        <select className="ab-gr" value={f.tip}
          onChange={(e) => setF({ ...f, tip: e.target.value })}>
          {EKIP_TIPLERI.map((t) => (
            <option key={t} value={t}>{EKIP_TIP_ETIKETI[t]}</option>
          ))}
        </select>
      </Alan>
      <Alan etiket="Santral">
        <select className="ab-gr" value={f.tesisId}
          onChange={(e) => setF({ ...f, tesisId: e.target.value })}>
          <option value="">— kurumsal ekip (santralsiz) —</option>
          {tesisler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="E-posta">
        <input className="ab-gr" type="email" value={f.eposta}
          style={{ fontFamily: 'var(--veri)' }}
          onChange={(e) => setF({ ...f, eposta: e.target.value })} />
      </Alan>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)',
        fontSize: 'var(--t-field)' }}>
        <input type="checkbox" checked={f.aktif}
          onChange={(e) => setF({ ...f, aktif: e.target.checked })} />
        Ekip aktif
      </label>

      {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s10)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => ekipKaydet({
            id: ekip?.id, kod: f.kod, ad: f.ad, tip: f.tip,
            tesisId: f.tesisId || null, eposta: f.eposta.trim() || null,
            aktif: f.aktif,
          }), kapat)}>
          {ekip ? 'Kaydet' : 'Ekip oluştur'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-panel-dip" style={{ margin: 0 }}>
        Pasif ekip varlık sahibi OLAMAZ; ekibi kapatmak mevcut atamaları
        silmez ama sahiplik zincirini &quot;boş ekip&quot; olarak
        işaretler. Ekip kodu oluşturulduktan sonra değişmez.
      </p>
    </div>
  );
}

export function UyelikFormu({ ekip, adaylar }: {
  ekip: Ekip; adaylar: { id: string; ad: string; aktif: boolean }[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [kullaniciId, setKullaniciId] = useState('');
  const [rol, setRol] = useState<string>('uye');

  /* Zaten üye olanlar ve PASİF kullanıcılar listede yok: pasif üye
     ekibin "aktif üyesi var" görünmesine yol açar ve sahiplik zinciri
     sahte biçimde sağlam okunur (sunucu da reddeder). */
  const uyeIdleri = new Set(ekip.uyeler.map((u) => u.kullaniciId));
  const secilebilir = adaylar.filter((a) => a.aktif && !uyeIdleri.has(a.id));

  return (
    <div style={{ display: 'grid', gap: 'var(--s10)', marginTop: 'var(--s12)' }}>
      {secilebilir.length === 0 ? (
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          Eklenebilecek aktif kullanıcı yok — pasif hesaplar ekibe alınamaz.
        </p>
      ) : (
        <>
          <Alan etiket="Kullanıcı">
            <select className="ab-gr" value={kullaniciId}
              onChange={(e) => setKullaniciId(e.target.value)}>
              <option value="">— seçin —</option>
              {secilebilir.map((a) => <option key={a.id} value={a.id}>{a.ad}</option>)}
            </select>
          </Alan>
          <Alan etiket="Üyelik rolü">
            <select className="ab-gr" value={rol} onChange={(e) => setRol(e.target.value)}>
              {UYELIK_ROLLERI.map((r) => (
                <option key={r} value={r}>{UYELIK_ROL_ETIKETI[r]}</option>
              ))}
            </select>
          </Alan>
          {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
          <div>
            <Dugme tur="birincil" disabled={bekliyor || !kullaniciId}
              onClick={() => calistir(
                () => ekipUyeligiKaydet({ ekipId: ekip.id, kullaniciId, rol }),
                () => setKullaniciId(''),
              )}>
              Üye ekle
            </Dugme>
          </div>
        </>
      )}
    </div>
  );
}

export function UyeSatiri({ ekip, uye, yetkili }: {
  ekip: Ekip; uye: EkipUyesi; yetkili: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s10)',
      background: 'var(--panel)', border: 'var(--bw-hair) solid var(--hr2)',
      padding: 'var(--s10) var(--s12)' }}>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 'var(--t-cell)', fontWeight: 600 }}>
          {uye.ad}
        </span>
        <span style={{ display: 'block', marginTop: 2, fontFamily: 'var(--veri)',
          fontSize: 'var(--t-label)', color: uye.aktif ? 'var(--i3)' : 'var(--bd)' }}>
          {UYELIK_ROL_ETIKETI[uye.rol as keyof typeof UYELIK_ROL_ETIKETI] ?? uye.rol}
          {!uye.aktif && ' · hesap kapalı, üyelik duruyor'}
        </span>
      </span>
      {yetkili && (
        <button type="button" className="ab-dugme satir" disabled={bekliyor}
          onClick={() => calistir(() => ekipUyeligiKaldir({
            ekipId: ekip.id, kullaniciId: uye.kullaniciId,
          }))}>Çıkar</button>
      )}
      {hata && <span className="ab-gr-hata" role="alert">{hata}</span>}
    </div>
  );
}

export function SahiplikDevri({ hesap, adaylar, yetkili }: {
  hesap: Hesap; adaylar: { id: string; ad: string; aktif: boolean }[]; yetkili: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [hedef, setHedef] = useState('');
  const [gerekce, setGerekce] = useState('');
  const [ozet, setOzet] = useState<string | null>(null);

  const s = hesap.sahiplik;
  const disarida = devirDisi(s);
  const gecerli = s.devredilebilir.length > 0 && gerekce.trim().length > 0;

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Varlık sahipliği</p>

      <dl className="ab-panel-ciftler">
        <div>
          <dt>Sahibi olduğu varlık</dt>
          <dd className={s.toplam === 0 ? undefined : !hesap.aktif ? 'd-bd' : undefined}>
            {s.toplam}
          </dd>
        </div>
        <div>
          <dt>Emanetçisi olduğu</dt>
          <dd>{s.emanet}</dd>
        </div>
      </dl>

      {s.toplam === 0 ? (
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
          Bu kişinin üstünde varlık yok; hesap kapatıldığında öksüz kalacak
          kayıt da yok.
        </p>
      ) : !hesap.aktif ? (
        <p style={{ margin: 'var(--s10) 0 0', fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
          Hesap kapalı ama {s.toplam} varlık hâlâ bu kişinin üstünde:
          ekranlarda &quot;sahibi var&quot; yazar, gerçekte sahip yoktur.
        </p>
      ) : null}

      {/* OT-09b · Cevap bekleyen zimmetler. Sahiplik sayısına KATILMAZ:
          imzalanmamış bir atama sahiplik değildir. */}
      {s.bekleyenZimmet.length > 0 && (
        <div style={{ marginTop: 'var(--s12)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s8)' }}>
            Cevap bekleyen zimmet ({s.bekleyenZimmet.length})
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 'var(--s8)' }}>
            {s.bekleyenZimmet.map((z) => (
              <li key={z.id} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s10)' }}>
                <span className="mono" style={{ flex: '1 1 auto', minWidth: 0 }}>
                  {z.varlikEtiket} · son tarih {tarihTR(z.sonTarih)}
                </span>
                {z.iptalEdilebilir && (
                  <button type="button" className="ab-dugme mini" disabled={bekliyor}
                    onClick={() => calistir(() => zimmetIptal({ talepId: z.id }))}>
                    İptal
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="ab-panel-dip" style={{ margin: 'var(--s8) 0 0' }}>
            Yönetici bir zimmeti yalnız İPTAL edebilir; kimse adına kabul
            edemez. Kabul ve red kararı zimmetlenen kişinindir.
          </p>
        </div>
      )}

      {disarida > 0 && (
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
          {disarida} varlık envanter onay kapsamınızın dışında ve bu
          formdan devredilemez — devir tek bir kapsam dışı kayıtta
          tamamen reddedilir, o yüzden liste peşin daraltıldı.
        </p>
      )}

      {!yetkili ? (
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>
          Sahiplik devri envanter onay yetkisi ister.
        </p>
      ) : s.devredilebilir.length === 0 ? null : !acik ? (
        <div style={{ marginTop: 'var(--s12)' }}>
          <Dugme onClick={() => setAcik(true)}>
            {s.devredilebilir.length} varlığı devret
          </Dugme>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s12)' }}>
          <Alan etiket="Yeni sahip">
            <select className="ab-gr" value={hedef} onChange={(e) => setHedef(e.target.value)}>
              <option value="">— sahipsiz bırak —</option>
              {adaylar.filter((a) => a.aktif && a.id !== hesap.id)
                .map((a) => <option key={a.id} value={a.id}>{a.ad}</option>)}
            </select>
          </Alan>
          <Alan etiket="Gerekçe" zorunlu>
            <textarea className="ab-gr" rows={2} value={gerekce} style={{ resize: 'vertical' }}
              placeholder="Devrin dayanağı — her kayda ayrı iz satırı olarak yazılır"
              onChange={(e) => setGerekce(e.target.value)} />
          </Alan>
          {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
          {ozet && <p style={{ margin: 0, fontSize: 'var(--t-field)' }} role="status">{ozet}</p>}
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="birincil" disabled={bekliyor || !gecerli}
              onClick={() => calistir(async () => {
                const r = await topluSahipDevri({
                  varlikIdleri: s.devredilebilir,
                  hedefKullaniciId: hedef || null,
                  gerekce,
                });
                if (r.ok && r.ozet) {
                  setOzet(`${r.ozet.degisen} kayıt devredildi, `
                    + `${r.ozet.degismeyen} kayıt zaten hedefteydi.`);
                }
                return r;
              }, () => { setAcik(false); setGerekce(''); })}>
              {bekliyor ? 'Devrediliyor…' : 'Devri uygula'}
            </Dugme>
            <Dugme disabled={bekliyor || !hedef}
              onClick={() => calistir(async () => {
                const r = await topluZimmetAc({
                  varlikIdleri: s.devredilebilir,
                  atananId: hedef,
                  not: gerekce.trim() || null,
                });
                if (r.ok && r.ozet) {
                  setOzet(`${r.ozet.acilan} zimmet talebi açıldı, `
                    + `${r.ozet.atlanan} kayıt atlandı.`
                    + (r.ozet.sebepler.length > 0 ? ` ${r.ozet.sebepler[0]}` : ''));
                }
                return r;
              }, () => { setGerekce(''); })}>
              {bekliyor ? 'Gönderiliyor…' : 'Zimmetle (kabul iste)'}
            </Dugme>
            <Dugme onClick={() => setAcik(false)} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            İki yol arasındaki fark bilinçlidir: <strong>devir</strong> sahipliği
            anında geçirir ve karşı tarafa sormaz; <strong>zimmet</strong> bir
            talep açar ve sahiplik ancak kişi kabul edince geçer. Sorumluluk
            devri için ikincisi, kapanan bir hesabın yükünü boşaltmak için
            birincisi kullanılır.
          </p>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Devir geri alınamaz ve her kayıt için AYRI denetim izi bırakır.
            &quot;Sahipsiz bırak&quot; seçeneği bilinçli bir karardır:
            varlıklar sahipsiz görünür ve envanterde açık borç olarak
            listelenir — pasif bir kişinin üstünde saklanmaz.
          </p>
        </div>
      )}
    </div>
  );
}

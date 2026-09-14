'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useSozluk, useTerim } from '@/lib/dil/SozlukSaglayici';
import Link from 'next/link';
import { Alan, Dugme, EntegrasyonYok } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { CekmeceAlanlar } from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import MfaKarti from './MfaKarti';
import { digerOturumlariKapat, parolaDegistir, profilGuncelle } from '@/lib/eylemler2/hesap';
import { tarihTR, zamanTR } from '@/lib/sabitler';
import {
  enGenisRol, kapsamMetni, kapsamsizYonetici, rolEtiketi, yetkiKapsami,
} from '../yetkiler/mantik';
import {
  PAROLA_EN_AZ, kalanSureMetni, oturumCumlesi, parolaKusuru, sureMetni,
} from './mantik';
import type { AyarlarVerisi } from './veri';

/* D31 · Ayarlar — tek ekran, dört bölüm: profil · parola · oturum · yetki;
   altında bildirim/görünüm satırı. Sekme yok, kip yok: dördü de kısa ve
   birlikte okunur ("ben kimim, nereye girebiliyorum, oturumum ne durumda").

   Yazan bölümler (profil, parola, oturum) SOL kolonda, salt okunur olanlar
   (yetki, bildirim) SAĞ kolonda; CSS yüklü değilken sırayla alt alta iner
   ve anlam bozulmaz. Kart yok, ikon yok; bölümleri kenar çizgisi ayırır.

   Her form kendi `useEylem`ini taşır: bir formun bekleme/hata durumu
   diğerini kilitlemesin — parola formunun hatası profil formunda görünmez. */

export default function AyarlarIstemci({ veri, simdi }: { veri: AyarlarVerisi; simdi: number }) {
  const { profil, oturum, hesap, yonetimOkuyabilir, mfa } = veri;

  return (
    <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow={`Ayarlar · hesap · ${profil.eposta}`}
        vurgu={profil.adSoyad}
        baslik="hesabı"
        metrikler={[
          { deger: oturum.aktifSayi, yazi: 'Açık oturum' },
          { deger: hesap.yetkiler.length, yazi: 'Yetki',
            durum: hesap.yetkiler.length === 0 ? 'unk' : undefined },
          /* Reddedilen giriş bir COUNT'tur: 0 ölçülmüş sıfırdır. Sıfırdan
             büyükse kısmi: hesap hedef alınıyor olabilir, kişi görmeli. */
          { deger: oturum.reddedilen24, yazi: 'Reddedilen giriş · 24 sa',
            durum: oturum.reddedilen24 > 0 ? 'md' : undefined },
        ]}
      />

      <section className="ab-ekran-govde">
        <div className="ab-ayar-izgara">
          <div>
            <Profil profil={profil} />
            <Parola parolaVar={profil.parolaVar} />
            {/* P6 · ikinci faktör parolanın HEMEN ALTINDA: ikisi de aynı
                soruyu cevaplar — "bu hesaba kim girebilir". */}
            <MfaKarti kurulu={mfa.kurulu} anahtarVar={mfa.anahtarVar}
              anahtarNotu={mfa.anahtarNotu} zorunlu={mfa.zorunlu} />
            <Oturum oturum={oturum} simdi={simdi} />
          </div>
          <div>
            <Yetki hesap={hesap} yonetimOkuyabilir={yonetimOkuyabilir} />
            <Kanallar />
          </div>
        </div>
      </section>
    </main>
  );
}

/* ── Kip değişiminde ODAK ────────────────────────────────────────────
   Okuma ve düzenleme dalları birbirinin YERİNE geçer: kipi açan düğme
   DOM'dan silinir ve klavye kullanıcısının odağı gövdeye düşer — o
   kişi, az önce bastığı düğmenin ne yaptığını göremez ve sekmeye
   sayfanın başından başlar. Bu yüzden odak açılışta formun İLK alanına,
   kapanışta kipi açan düğmeye taşınır.

   İLK ÇİZİMDE TAŞINMAZ: ekran açılır açılmaz odağı bir düğmeye çekmek,
   kullanıcının hiç istemediği bir yere ışınlanması olurdu. */
function useKipOdagi(
  acik: boolean,
  ilkAlan: RefObject<HTMLInputElement | null>,
  acanDugme: RefObject<HTMLButtonElement | null>,
) {
  const ilkCizim = useRef(true);
  useEffect(() => {
    if (ilkCizim.current) { ilkCizim.current = false; return; }
    (acik ? ilkAlan.current : acanDugme.current)?.focus();
  }, [acik, ilkAlan, acanDugme]);
}

/* ── Profil ─────────────────────────────────────────────────────────── */

function Profil({ profil }: { profil: AyarlarVerisi['profil'] }) {
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const [f, setF] = useState({ adSoyad: profil.adSoyad, unvan: profil.unvan ?? '' });
  const [kaydedildi, setKaydedildi] = useState(false);
  /* OKUMA HÂLİ ≠ DÜZENLEME HÂLİ. Ekran açılışta üç giriş alanı (burada
     iki yazılabilir + bir salt okunur) ve parola bölümünde üç alan daha
     çiziyordu: kullanıcı yalnız "unvanım ne yazıyor" diye baktığında bile
     altı input karşılıyordu. Değerler artık OKUNUR; düzenleme kullanıcının
     kararıyla açılır. Ürünün kendi kalıbı budur — `bulgular/[id]`
     (`setDuzenle`) ve `/regulasyonlar` (`Kaynak ekle`) böyle çalışır. */
  const [duzenle, setDuzenle] = useState(false);
  const degisti = f.adSoyad.trim() !== profil.adSoyad || (f.unvan.trim() || null) !== profil.unvan;
  const acRef = useRef<HTMLButtonElement>(null);
  const ilkAlanRef = useRef<HTMLInputElement>(null);
  useKipOdagi(duzenle, ilkAlanRef, acRef);

  /* Vazgeçmek DENEMEYİ de siler: kalan hata, üç boş alanın üstünde bir
     ÖNCEKİ denemeyi anlatır ve kullanıcı onu bu formun cevabı sanar. */
  const vazgec = () => {
    setF({ adSoyad: profil.adSoyad, unvan: profil.unvan ?? '' });
    setHata(null);
    setDuzenle(false);
  };

  return (
    <section className="ab-ayar-bolum" aria-labelledby="ayar-profil">
      <h2 id="ayar-profil" className="ab-bolum-basligi">Profil</h2>
      <p className="cumle">
        Ad ve unvan kütükte sizin adınıza yazılan her kaydın imzasıdır.
        E-posta kimliktir; yönetici Yetki ekranından değiştirir.
      </p>
      {!duzenle ? (
        <div className="ab-ayar-form">
          <dl className="ab-panel-ciftler">
            <div><dt>Ad soyad</dt><dd>{profil.adSoyad}</dd></div>
            <div>
              <dt>Unvan</dt>
              {/* BİLİNMEYEN ≠ BOŞ: unvan girilmemişse öyle YAZILIR ve
                  bilinmeyen mürekkebiyle çizilir; sessizce boş bırakmak
                  "unvanı yok" demek olurdu. */}
              <dd className={profil.unvan ? undefined : 'd-unk'}>
                {profil.unvan ?? 'girilmedi'}
              </dd>
            </div>
            <div>
              <dt>E-posta</dt>
              <dd style={{ fontFamily: 'var(--veri)' }}>{profil.eposta}</dd>
            </div>
          </dl>
          {kaydedildi && !hata && (
            <p className="ab-panel-dip" role="status" style={{ margin: 0, color: 'var(--ok)' }}>
              Kaydedildi · değişen alan denetim izine yazıldı.
            </p>
          )}
          <div className="eylem">
            <Dugme ref={acRef} onClick={() => {
              setDuzenle(true); setKaydedildi(false); setHata(null);
            }}>
              Profili düzenle
            </Dugme>
            <span className="ab-panel-dip">
              {profil.kayitVar
                ? profil.olusturuldu
                  ? `Hesap ${tarihTR(profil.olusturuldu)} tarihinde açıldı.`
                  : 'Hesap açılış tarihi kayıtta yok.'
                : 'Hesap kaydı okunamadı; bu ortamda profil yazılmaz.'}
            </span>
          </div>
        </div>
      ) : (
      <div className="ab-ayar-form">
        <Alan etiket="Ad soyad" zorunlu>
          <input className="ab-gr" ref={ilkAlanRef} value={f.adSoyad} autoComplete="name" maxLength={120}
            onChange={(e) => { setF({ ...f, adSoyad: e.target.value }); setKaydedildi(false); }} />
        </Alan>
        <Alan etiket="Unvan">
          <input className="ab-gr" value={f.unvan} autoComplete="organization-title" maxLength={120}
            placeholder="girilmedi — boş bırakılırsa 'bilinmiyor' yazılır"
            onChange={(e) => { setF({ ...f, unvan: e.target.value }); setKaydedildi(false); }} />
        </Alan>
        <Alan etiket="E-posta · salt okunur">
          <input className="ab-gr" value={profil.eposta} readOnly aria-readonly="true"
            style={{ fontFamily: 'var(--veri)', color: 'var(--i2)' }} />
        </Alan>

        {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
        {kaydedildi && !hata && (
          <p className="ab-panel-dip" role="status" style={{ margin: 0, color: 'var(--ok)' }}>
            Kaydedildi · değişen alan denetim izine yazıldı.
          </p>
        )}

        <div className="eylem">
          <Dugme tur="birincil" disabled={bekliyor || !degisti || !f.adSoyad.trim()}
            onClick={() => calistir(
              () => profilGuncelle({ adSoyad: f.adSoyad, unvan: f.unvan.trim() || null }),
              () => { setKaydedildi(true); setDuzenle(false); },
            )}>
            {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </Dugme>
          <Dugme tur="ikincil" disabled={bekliyor} onClick={vazgec}>Vazgeç</Dugme>
        </div>
      </div>
      )}
    </section>
  );
}

/* ── Parola ─────────────────────────────────────────────────────────── */

function Parola({ parolaVar }: { parolaVar: boolean }) {
  const { bekliyor, hata, setHata, calistir } = useEylem();
  const [f, setF] = useState({ eski: '', yeni: '', tekrar: '' });
  const [degisti, setDegisti] = useState(false);
  /* OKUMA HÂLİ ≠ DÜZENLEME HÂLİ — Profil ile aynı gerekçe. Burada
     okunacak bir DEĞER yok (parola özeti ekrana inmez, `veri.ts`), yani
     açıkken form üç boş kutudan ibaretti: ekranı açan herkes, parolasını
     değiştirmek istemese bile üç parola kutusuyla karşılaşıyordu. */
  const [degistir, setDegistir] = useState(false);
  const kusur = parolaKusuru(f.yeni);
  const uyusmuyor = f.tekrar.length > 0 && f.tekrar !== f.yeni;
  const ayni = f.yeni.length > 0 && f.yeni === f.eski;
  const gecerli = f.eski.length > 0 && f.yeni.length >= PAROLA_EN_AZ
    && f.tekrar === f.yeni && !ayni;

  const acRef = useRef<HTMLButtonElement>(null);
  const ilkAlanRef = useRef<HTMLInputElement>(null);
  useKipOdagi(degistir, ilkAlanRef, acRef);

  const vazgec = () => {
    setF({ eski: '', yeni: '', tekrar: '' });
    setHata(null);
    setDegistir(false);
  };

  return (
    <section className="ab-ayar-bolum" aria-labelledby="ayar-parola">
      <h2 id="ayar-parola" className="ab-bolum-basligi">Parola</h2>
      <p className="cumle">
        {parolaVar
          ? `Mevcut parola doğrulanır; yenisi en az ${PAROLA_EN_AZ} karakter. `
            + 'Değişince bu tarayıcı açık kalır, diğer oturumlar kapanır.'
          : 'Bu hesabın parolası tanımlı değil; ilk parolayı yönetici Yetki ekranından tanımlar.'}
      </p>
      {parolaVar && (
        <>
          {!degistir ? (
            <div className="ab-ayar-form">
              {degisti && !hata && (
                <p className="ab-panel-dip" role="status" style={{ margin: 0, color: 'var(--ok)' }}>
                  Parola değiştirildi · diğer oturumlar kapatıldı.
                </p>
              )}
              <div className="eylem">
                <Dugme ref={acRef} onClick={() => {
                  setDegistir(true); setDegisti(false); setHata(null);
                }}>
                  Parolayı değiştir
                </Dugme>
              </div>
            </div>
          ) : (
            <div className="ab-ayar-form">
              <Alan etiket="Mevcut parola" zorunlu>
                <input className="ab-gr" ref={ilkAlanRef} type="password" autoComplete="current-password"
                  style={{ fontFamily: 'var(--veri)' }} value={f.eski}
                  onChange={(e) => { setF({ ...f, eski: e.target.value }); setDegisti(false); }} />
              </Alan>
              <Alan etiket="Yeni parola" zorunlu
                hata={kusur ?? (ayni ? 'Yeni parola mevcut parolayla aynı olamaz' : undefined)}>
                <input className="ab-gr" type="password" autoComplete="new-password"
                  style={{ fontFamily: 'var(--veri)' }} value={f.yeni}
                  onChange={(e) => { setF({ ...f, yeni: e.target.value }); setDegisti(false); }} />
              </Alan>
              <Alan etiket="Yeni parola (tekrar)" zorunlu hata={uyusmuyor ? 'İki parola aynı değil' : undefined}>
                <input className="ab-gr" type="password" autoComplete="new-password"
                  style={{ fontFamily: 'var(--veri)' }} value={f.tekrar}
                  onChange={(e) => { setF({ ...f, tekrar: e.target.value }); setDegisti(false); }} />
              </Alan>

              {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}

              <div className="eylem">
                <Dugme tur="birincil" disabled={bekliyor || !gecerli}
                  onClick={() => calistir(
                    () => parolaDegistir({ eski: f.eski, yeni: f.yeni }),
                    () => { setF({ eski: '', yeni: '', tekrar: '' }); setDegisti(true); setDegistir(false); },
                  )}>
                  {bekliyor ? 'Değiştiriliyor…' : 'Yeni parolayı kaydet'}
                </Dugme>
                <Dugme tur="ikincil" disabled={bekliyor} onClick={vazgec}>Vazgeç</Dugme>
              </div>
            </div>
          )}
          <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
            Parola denetim izine yazılmaz; yalnız &quot;kim, ne zaman&quot; yazılır.
          </p>
        </>
      )}
    </section>
  );
}

/* ── Oturum ─────────────────────────────────────────────────────────── */

function Oturum({ oturum, simdi }: { oturum: AyarlarVerisi['oturum']; simdi: number }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [kapatildi, setKapatildi] = useState(false);
  const bu = oturum.buOturum;
  const digerVar = oturum.aktifSayi > 1;

  return (
    <section className="ab-ayar-bolum" aria-labelledby="ayar-oturum">
      <h2 id="ayar-oturum" className="ab-bolum-basligi">Oturum</h2>
      <p className="cumle">
        Oturum 12 saatte kendiliğinden, 2 saat kullanılmazsa erken düşer;
        etkinlik mutlak süreyi uzatmaz.
      </p>
      <CekmeceAlanlar alanlar={[
        /* Bu oturum bulunamadıysa "bilinmiyor" — süre uydurulmaz. */
        { etiket: 'Bu oturumun başlangıcı',
          deger: bu ? zamanTR(bu.baslangic) : 'bilinmiyor',
          durum: bu ? undefined : 'unk' },
        { etiket: 'Açık süre',
          deger: bu ? sureMetni(simdi - new Date(bu.baslangic).getTime()) : 'ölçülmedi',
          durum: bu ? undefined : 'unk' },
        { etiket: 'Son etkinlik',
          deger: bu ? zamanTR(bu.sonEtkinlik) : 'bilinmiyor',
          durum: bu ? undefined : 'unk' },
        { etiket: 'Mutlak bitişe kalan',
          deger: bu ? kalanSureMetni(bu.mutlakBitis, simdi) : 'ölçülmedi',
          durum: bu ? undefined : 'unk' },
        { etiket: 'Açık oturum · tüm cihazlar', deger: oturum.aktifSayi },
        { etiket: 'Son başarılı giriş',
          deger: oturum.sonGiris ? zamanTR(oturum.sonGiris) : 'kayıt yok',
          durum: oturum.sonGiris ? undefined : 'unk' },
        { etiket: 'Reddedilen deneme · 24 sa', deger: oturum.reddedilen24,
          durum: oturum.reddedilen24 > 0 ? 'md' : undefined },
      ]} />

      <div className="ab-ayar-form" style={{ marginTop: 'var(--s16)' }}>
        {hata && <p className="ab-gr-hata" role="alert" style={{ margin: 0 }}>{hata}</p>}
        {kapatildi && !hata && (
          <p className="ab-panel-dip" role="status" style={{ margin: 0, color: 'var(--ok)' }}>
            Diğer oturumlar kapatıldı; bu tarayıcı açık.
          </p>
        )}
        <div className="eylem">
          <Dugme tur={digerVar ? 'ret' : 'ikincil'} disabled={bekliyor || !digerVar}
            onClick={() => calistir(() => digerOturumlariKapat(), () => setKapatildi(true))}>
            {bekliyor ? 'Kapatılıyor…' : 'Diğer oturumları kapat'}
          </Dugme>
          <span className="ab-panel-dip">{oturumCumlesi(oturum.aktifSayi)}</span>
        </div>
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          Reddedilen deneme sayısı bu hesaba yapılan ve denetim izine yazılan
          başarısız girişlerdir; beklemediğiniz bir sayı görüyorsanız parolanızı
          değiştirin ve yöneticinize söyleyin.
        </p>
      </div>
    </section>
  );
}

/* ── Yetki özeti — salt okunur ──────────────────────────────────────── */

function Yetki({ hesap, yonetimOkuyabilir }: {
  hesap: AyarlarVerisi['hesap']; yonetimOkuyabilir: boolean;
}) {
  const { t } = useTerim();
  const sozluk = useSozluk();
  const rol = enGenisRol(hesap);
  return (
    <section className="ab-ayar-bolum" aria-labelledby="ayar-yetki">
      <h2 id="ayar-yetki" className="ab-bolum-basligi">Yetki</h2>
      <p className="cumle">
        {hesap.yetkiler.length === 0
          ? 'Hesabınızda tanımlı yetki yok: giriş yaparsınız, hiçbir ekran açılmaz.'
          : kapsamsizYonetici(hesap)
            ? `Yönetici yetkiniz kapsamsız: tüm süreçler ve tüm ${t('tesis', 'cogul')}.`
            : `Yetkiniz ${kapsamMetni(hesap, sozluk).toLocaleLowerCase('tr-TR')} kapsamıyla sınırlı.`}
      </p>
      <CekmeceAlanlar alanlar={[
        { etiket: 'En geniş rol', deger: rolEtiketi(rol), durum: rol ? undefined : 'unk' },
        { etiket: 'Kapsam', deger: kapsamMetni(hesap, sozluk) },
        { etiket: 'Yetki sayısı', deger: hesap.yetkiler.length },
      ]} />
      {hesap.yetkiler.length > 0 && (
        <ul className="ab-ayar-yetki" aria-label="Yetkiler">
          {hesap.yetkiler.map((y) => (
            <li key={y.id}>
              <span>{rolEtiketi(y.rol)}</span>
              <span className="mono" style={{ color: 'var(--i3)' }}>{yetkiKapsami(y, sozluk)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
        Yetki buradan değişmez; yönetim yetkisi olan biri Yetki ekranından
        verir ya da kaldırır, her değişiklik denetim izine yazılır.{' '}
        {yonetimOkuyabilir
          ? <Link href="/yetkiler" className="ab-dugme satir">Yetki ekranı →</Link>
          : 'Talebinizi kurum yöneticinize iletin.'}
      </p>
    </section>
  );
}

/* ── Bildirim kanalı · görünüm — dürüst satırlar ────────────────────── */

function Kanallar() {
  return (
    <section className="ab-ayar-bolum" aria-labelledby="ayar-kanal">
      <h2 id="ayar-kanal" className="ab-bolum-basligi">Bildirim ve görünüm</h2>
      {/* Ortak "entegrasyon yapılandırılmamış" hâli: bir tercih formu
          çizip sessizce yok saymak yerine kanalın bağlı olmadığı yazılır. */}
      <div className="ab-ayar-hal">
        <EntegrasyonYok
          kaynak="E-posta / webhook bildirim kanalı"
          ne="kanal tercihleri"
          eylem={<Link href="/bildirimler" className="ab-dugme">Uygulama içi bildirim kutusu →</Link>}
        />
      </div>
      <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
        Görünüm: platform tek koyu temadır (tezgâh, saha, defter — üçü de);
        tema seçimi yok. Klavye kısayolları ve okuma anahtarı Yardım ekranında.
      </p>
    </section>
  );
}

'use client';
import { Im, type Durum } from '@/components/atlas/temel';
import {
  CekmeceKimlik, CekmeceAlanlar, CekmeceBagli,
} from '@/components/atlas/cekmece';
import { etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import type { ConnectorSagligi, KosuSatiri } from '@/lib/entegrasyon/saglikOzeti';
import { MotorCalistir } from './Eylemler';
import {
  CONNECTOR_TIP, ENTEGRASYON_ACIKLAMA, ENTEGRASYON_IM, ENTEGRASYON_SOZU,
  KIMLIK_TIP, TETIKLEYEN,
  kaliteImi, kisalt, motorCumlesi, motorImi, motorSozu, sonKosu, sureFmt,
  tazelikDurumu, tazelikYazisi,
  type KaliteBulgusu, type Kosu, type Motor,
} from './mantik';

/* Platform sağlığının ÜÇ kayıt ailesinin çekmece gövdeleri.

   Ayrı dosyada duruyorlar çünkü SaglikIstemci yalnız canvası (kip anahtarı +
   tablo) kurar; kayıt detayı ondan bağımsız okunur ve değişir. Durum sözcüğü
   yalnız burada — kimlik bloğunda — yazılır (06 §A2). Modal YOK: hepsi 420px
   çekmecede render edilir. */

/* ── Çekmece · motor ────────────────────────────────────────────────── */

export function MotorOzeti({ motor, yazabilir }: { motor: Motor; yazabilir: boolean }) {
  const s = sonKosu(motor);
  const im = motorImi(motor);

  return (
    <>
      <CekmeceKimlik durum={im} soz={motorSozu(motor)} baslik={motor.etiket}
        cumle={motorCumlesi(motor)} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Başlangıç', deger: s ? zamanTR(s.baslangic) : 'koşu kaydı yok',
          durum: s ? undefined : 'unk' },
        { etiket: 'Bitiş · süre',
          deger: s ? `${s.bitis ? zamanTR(s.bitis) : 'bitmedi'} · ${sureFmt(s.sureMs)}` : '—',
          durum: s && !s.bitis ? 'pl' : undefined },
        { etiket: 'İşlenen → üretilen', deger: s ? `${s.islenen} → ${s.uretilen}` : '—' },
        { etiket: 'Tetikleme',
          deger: motor.elleCalisir ? 'elle ya da zamanlanmış' : 'yalnız zincirden' },
      ]} />

      {s?.hata && <HataBlogu metin={s.hata} />}

      <KosuListesi kosular={motor.kosular} />

      <MotorCalistir motor={motor} yazabilir={yazabilir} />
    </>
  );
}

/** Motorun son koşuları — Ozalit'te bu liste tek bir global tabloydu ve
    modalla açılıyordu; artık kaydın kendi çekmecesinde yaşıyor. */
function KosuListesi({ kosular }: { kosular: Kosu[] }) {
  return (
    <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Son koşular</p>
      {kosular.length === 0 ? (
        <p className="cekmece-dip" style={{ margin: 0 }}>
          Bu motor hiç koşmadı — sağlıklı olduğu anlamına gelmez.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          {kosular.map((k) => (
            <div key={k.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
              alignItems: 'start', gap: 'var(--s8)' }}>
              <span style={{ paddingTop: 3 }}>
                <Im durum={kosuImi(k.durum)} ad={kosuAdi(k.durum)} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 'var(--t-field)' }}>
                  {zamanTR(k.baslangic)}
                </span>
                <span className="mono" style={{ display: 'block', marginTop: 2,
                  fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                  {k.islenen} → {k.uretilen} · {sureFmt(k.sureMs)}
                  {k.denemeNo > 1 && ` · ${k.denemeNo}. deneme`}
                </span>
                {k.hata && (
                  <span style={{ display: 'block', marginTop: 4,
                    fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
                    {kisalt(k.hata, 140)}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function kosuImi(durum: string): Durum {
  if (durum === 'basarili') return 'ok';
  if (durum === 'basarisiz') return 'bd';
  if (durum === 'calisiyor') return 'pl';
  return 'unk';
}

function kosuAdi(durum: string): string {
  if (durum === 'basarili') return 'Koşu tamamlandı';
  if (durum === 'basarisiz') return 'Koşu hata ile bitti';
  if (durum === 'calisiyor') return 'Koşu sürüyor';
  return 'Koşu durumu bilinmiyor';
}

/* ── Çekmece · connector ────────────────────────────────────────────── */

export function ConnectorOzeti({ c }: { c: ConnectorSagligi }) {
  const im = ENTEGRASYON_IM[c.durum];
  const s = c.sonKosu;
  const hataMetni = s?.hata ?? c.sonHata;
  /* Renk `durum`dan gelir, `hata` alanının doluluğundan DEĞİL: başarılı bir
     koşu da geçmiş bir hata metni taşıyabilir. */
  const hataliMi = c.durum === 'basarisiz' || c.durum === 'bayat_kosu';

  return (
    <>
      <CekmeceKimlik durum={im} soz={ENTEGRASYON_SOZU[c.durum]} baslik={c.ad}
        cumle={ENTEGRASYON_ACIKLAMA[c.durum]} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Tip · kaynak sistem',
          deger: `${CONNECTOR_TIP[c.tip] ?? etiketle(c.tip)} · ${c.kaynakSistem}` },
        { etiket: 'Kayıt durumu',
          deger: `${etiketle(c.kayitDurumu)} · `
            + `${c.etkin ? 'otomatik koşuya açık' : 'otomatik koşuya kapalı'}` },
        { etiket: 'Son başarılı koşu',
          deger: c.sonBasariliKosu ? zamanTR(c.sonBasariliKosu) : 'hiç',
          durum: c.sonBasariliKosu ? undefined : 'unk' },
        { etiket: 'Veri tazeliği', deger: tazelikYazisi(c.tazelik),
          durum: tazelikDurumu(c.tazelik) },
      ]} />

      <div className="cekmece-blok" style={{ marginTop: 'var(--s22)' }}>
        <p className="cekmece-dip" style={{ margin: 0 }}>{c.tazelik.aciklama}</p>
      </div>

      {/* Hiç koşmamış connector, durumu başka bir sebeple gölgelense bile
          bunu saklamaz. */}
      {c.hicKosmadi && c.durum !== 'hic_kosmadi' && (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s16)' }}>
          <p className="cekmece-dip" style={{ margin: 0 }}>
            Hiç koşu kaydı yok; yukarıdaki durum başka bir kaynaktan geliyor.
          </p>
        </div>
      )}

      <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Kimlik · sır referansı</p>
        <p className="mono" style={{ margin: 0, fontSize: 'var(--t-field)' }}>
          {KIMLIK_TIP[c.kimlikTipi] ?? etiketle(c.kimlikTipi)}
          {c.kimlikTipi === 'none' ? '' : ` · ${c.sirMaskeli}`}
        </p>
        <p className="cekmece-dip" style={{ margin: 'var(--s8) 0 0' }}>
          Yalnız sırra giden adres gösterilir. Kimlik bilgisinin kendisi
          veritabanında tutulmaz, loglanmaz ve bu ekrana hiçbir koşulda gelmez.
        </p>
        {c.kimlikGerekce && (
          <p style={{ margin: 'var(--s10) 0 0', fontSize: 'var(--t-field)',
            color: 'var(--pl)' }}>
            {c.kimlikGerekce}
          </p>
        )}
      </div>

      {c.imlec && (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Senkronizasyon imleci</p>
          <p className="mono" style={{ margin: 0, fontSize: 'var(--t-label)',
            wordBreak: 'break-all', color: 'var(--i2)' }}>{c.imlec}</p>
        </div>
      )}

      {s && (s.reddedilen > 0 || s.sayacTutarsiz || s.ayrinti) && (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Son koşunun sayaçları</p>
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
            {s.alinan} alındı · {s.kabulEdilen} kabul · {s.reddedilen} red ·
            {' '}{s.yinelenen} yinelenen
          </p>
          {/* `ayrinti` bir başarısızlık DEĞİLDİR — bilgi notudur. */}
          {s.ayrinti && s.ayrinti !== hataMetni && (
            <p className="cekmece-dip" style={{ margin: 'var(--s8) 0 0' }}>{s.ayrinti}</p>
          )}
          {s.reddSebebiEksik && (
            <p style={{ margin: 'var(--s8) 0 0', fontSize: 'var(--t-field)', color: 'var(--md)' }}>
              {s.reddedilen} kayıt reddedildi ama sebebi yazılmamış — reddedilen
              kayıtlar sessizce yok sayılmış olabilir.
            </p>
          )}
          {s.sayacTutarsiz && (
            <p style={{ margin: 'var(--s8) 0 0', fontSize: 'var(--t-field)', color: 'var(--md)' }}>
              Sayaçlar tutmuyor: alınan ≠ kabul + red + yinelenen.
            </p>
          )}
        </div>
      )}

      {hataMetni && (hataliMi
        ? <HataBlogu metin={hataMetni} />
        : (
          <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
            <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Önceki hata</p>
            {/* Hata metni duruyor ama connector artık hatalı değil: kaybolmaz,
                ama kritik renge de boyanmaz. */}
            <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
              {kisalt(hataMetni, 220)}
            </p>
          </div>
        ))}

      <ConnectorGecmisi gecmis={c.gecmis} />
    </>
  );
}

function ConnectorGecmisi({ gecmis }: { gecmis: KosuSatiri[] }) {
  return (
    <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="t-label" style={{ margin: '0 0 var(--s10)' }}>Son koşular</p>
      {gecmis.length === 0 ? (
        <p className="cekmece-dip" style={{ margin: 0 }}>
          Bu connector hiç koşmadı — sağlıklı olduğu anlamına gelmez.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          {gecmis.map((g) => (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
              alignItems: 'start', gap: 'var(--s8)' }}>
              <span style={{ paddingTop: 3 }}>
                <Im durum={g.bayat ? 'bd' : kosuImi(g.durum)}
                  ad={g.bayat ? 'Koşu bayat — süreç yanıt vermiyor' : kosuAdi(g.durum)} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 'var(--t-field)' }}>
                  {zamanTR(g.baslangic)} · {TETIKLEYEN[g.tetikleyen] ?? etiketle(g.tetikleyen)}
                </span>
                <span className="mono" style={{ display: 'block', marginTop: 2,
                  fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                  {g.alinan} → {g.kabulEdilen} · {g.reddedilen} red · {g.yinelenen} yinelenen
                  {' · '}{sureFmt(g.sureMs)}
                  {g.denemeNo > 1 && ` · ${g.denemeNo}. deneme`}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Çekmece · veri kalitesi ─────────────────────────────────────────── */

export function KaliteOzeti({ b }: { b: KaliteBulgusu }) {
  const im = kaliteImi(b);
  return (
    <>
      <CekmeceKimlik
        durum={im}
        soz={im === 'unk' ? 'Kaynak kayıt silinmiş' : 'Açık veri boşluğu'}
        baslik={etiketle(b.kural)}
        cumle={b.aciklama}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Kaynak tipi', deger: etiketle(b.kaynakTipi) },
        { etiket: 'İlgili kayıt', deger: b.kayitEtiket ?? 'silinmiş',
          durum: b.kayitEtiket ? undefined : 'unk' },
        { etiket: 'Tespit', deger: tarihTR(b.olusturuldu) },
      ]} />

      {b.href && b.kayitEtiket && (
        <CekmeceBagli baslik="Kayıt" kayitlar={[
          { id: b.id, kod: b.kayitEtiket, alt: etiketle(b.kaynakTipi), yol: b.href },
        ]} />
      )}

      {!b.href && (
        <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="cekmece-dip" style={{ margin: 0 }}>
            {b.kayitEtiket
              ? 'Bu kayıt tipinin kendi ekranı yok; bulgu kaydın üstünde durur.'
              : 'Bulgunun işaret ettiği kayıt silinmiş — boşluk doğrulanamıyor.'}
          </p>
        </div>
      )}
    </>
  );
}

/* ── Ortak parçalar ─────────────────────────────────────────────────── */

function HataBlogu({ metin }: { metin: string }) {
  return (
    <div className="cekmece-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="t-label" style={{ margin: '0 0 var(--s10)', color: 'var(--bd)' }}>Hata</p>
      <pre className="mono" style={{ margin: 0, padding: 'var(--s12)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        background: 'var(--card)', border: 'var(--bw-edge) solid var(--bd)',
        fontSize: 'var(--t-label)', color: 'var(--bd)' }}>
        {metin}
      </pre>
    </div>
  );
}

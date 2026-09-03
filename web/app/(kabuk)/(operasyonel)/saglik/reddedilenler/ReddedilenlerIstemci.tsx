'use client';
import { useMemo, useState } from 'react';
import { useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import Link from 'next/link';
import { Alan, BosIlk, Dugme, Yetkisiz } from '@/components/kabuk/temel';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { EkranBasligi } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceAlanlar, CekmeceEylemler, CekmeceKimlik,
} from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { redKaydiIncele } from '@/lib/eylemler2/reddedilenKayit';
import { zamanTR } from '@/lib/sabitler';
import { bolumle, kisalt } from '../mantik';
import {
  ASAMA_ACIKLAMA, RED_DURUM_SOZU, asamaYazisi, redImi, redKararPasif,
  redMetrikleri, redSirala, redToplanabilir, type RedSatiri,
} from './mantik';

/* Dead-letter inceleme kuyruğu.

   Bir kaydın reddedilmesi bir SAYIDAN ibaret olamaz: hangi kayıt, neden,
   hangi aşamada düştü, ham hâli neydi. Sayaç `EntegrasyonKosusu.reddedilen`
   alanında duruyordu ama kaydın kendisi kayboluyordu.

   Ekran sözleşmesi: dört metrik, 5–9 görünür satır + kuyruk, detay 420px
   çekmecede. 'Yok sayıldı' YEŞİL DEĞİLDİR — bilinçli bir karardır ama
   kaynaktaki sorun çözülmüş demek değildir. */

const KOLONLAR: Kolon[] = [
  { baslik: 'Aşama', genislik: '176px' },
  { baslik: 'Kaynak', genislik: '150px', ikincil: true },
  { baslik: 'Düşme zamanı', genislik: '146px', sag: true, ikincil: true },
];

const GORUNUR = 7;

const DURUMLAR = ['incelendi', 'duzeltildi', 'yok_sayildi', 'acik'] as const;

export default function ReddedilenlerIstemci({
  satirlar, yetkili, yazabilir, toplam, sinir, kapsamli = false,
}: {
  satirlar: RedSatiri[]; yetkili: boolean; yazabilir: boolean;
  toplam: number; sinir: number;
  /** kuyruk bir santral kapsamıyla daraltıldı mı — boş ekranın SÖZÜ değişir */
  kapsamli?: boolean;
}) {
  const [secili, setSecili] = useUrlDurumuBos('sec');
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const sirali = useMemo(() => redSirala(satirlar), [satirlar]);
  const m = useMemo(() => redMetrikleri(satirlar), [satirlar]);
  const bolum = useMemo(
    () => bolumle(sirali, redToplanabilir, kuyrukAcik, GORUNUR),
    [sirali, kuyrukAcik]);

  const secilen = satirlar.find((r) => r.id === secili) ?? null;

  const govde = () => {
    if (!yetkili) return <Yetkisiz rol="yönetim okuma" />;
    if (satirlar.length === 0) {
      return (
        /* Kuyruğun boş olması ile kuyruğu görememek AYNI ŞEY DEĞİLDİR. */
        <BosIlk cumle={kapsamli
          ? 'Kapsamınızdaki santrallere ait reddedilen kayıt yok.'
          : 'Reddedilen kayıt yok. Bir connector koşusunda düşen her '
            + 'kayıt — şemadan, eşlemeden, doğrulamadan ya da kapsamdan — burada '
            + 'ham hâliyle görünür.'} />
      );
    }

    const tabloSatirlari: Satir[] = bolum.gorunur.map((r) => {
      const im = redImi(r);
      return {
        id: r.id,
        durum: im,
        kenar: im,
        konu: r.sebep,
        alt: `${r.connectorAdi ?? 'connector kaydı yok'}`
          + `${r.kaynakKayitId ? ` · ${kisalt(r.kaynakKayitId, 40)}` : ''}`,
        hucreler: [
          asamaYazisi(r.asama),
          r.kaynakSistem,
          zamanTR(r.olusturuldu),
        ],
      };
    });

    const notlar = [`${m.acik} kayıt açık`];
    if (m.baskinAsama) {
      notlar.push(`en çok düşülen aşama: ${asamaYazisi(m.baskinAsama.asama)} `
        + `(${m.baskinAsama.adet})`);
    }
    if (m.yokSayildi > 0) {
      notlar.push(`${m.yokSayildi} kayıt yok sayıldı — kaynaktaki sorun `
        + 'çözüldü anlamına gelmez');
    }
    if (toplam > sinir) {
      notlar.push(`kuyrukta ${toplam} kayıt var, en yeni ${sinir} tanesi listelendi`);
    }

    return (
      <Tablo
        konuBasligi="Ret sebebi"
        kolonlar={KOLONLAR}
        satirlar={tabloSatirlari}
        secili={secili}
        sec={(id) => setSecili((o) => (o === id ? null : id))}
        kuyruk={bolum.toplanan.length > 0
          ? { metin: `+${bolum.toplanan.length} kayıt · düzeltildi`,
            ac: () => setKuyrukAcik(true) }
          : null}
        dipNot={notlar.join(' · ')}
      />
    );
  };

  return (
    <>
      <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow="Platform sağlığı · reddedilen kayıtlar"
          vurgu={m.acik > 0 ? `${m.acik} kayıt` : undefined}
          vurguDurumu={m.acik > 0 ? 'bd' : undefined}
          baslik={m.acik > 0 ? 'inceleme bekliyor' : 'Bekleyen reddedilen kayıt yok'}
          sag={
            <Link href="/saglik" className="ab-dugme" style={{ alignSelf: 'center' }}>
              ← Platform sağlığı
            </Link>
          }
          metrikler={[
            { deger: m.acik, yazi: 'Açık', durum: m.acik > 0 ? 'bd' : undefined },
            { deger: m.incelendi, yazi: 'İncelendi',
              durum: m.incelendi > 0 ? 'md' : undefined },
            // Yok sayılan kayıt "çözüldü" değildir: kendi kovasında ve unk.
            { deger: m.yokSayildi, yazi: 'Yok sayıldı',
              durum: m.yokSayildi > 0 ? 'unk' : undefined },
            { deger: m.duzeltildi, yazi: 'Düzeltildi' },
          ]}
        />
        <section className="ab-ekran-govde">{govde()}</section>
      </main>

      {secilen && (
        <Cekmece kod={secilen.kaynakKayitId ?? secilen.id} kapat={() => setSecili(null)}>
          <RedOzeti r={secilen} yazabilir={yazabilir} kapat={() => setSecili(null)} />
        </Cekmece>
      )}
    </>
  );
}

function RedOzeti({ r, yazabilir, kapat }: {
  r: RedSatiri; yazabilir: boolean; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [durum, setDurum] = useState<string>('incelendi');
  const [not, setNot] = useState('');

  const im = redImi(r);
  const pasif = redKararPasif([r.id], durum, not, yazabilir, bekliyor);

  return (
    <>
      <CekmeceKimlik durum={im} soz={RED_DURUM_SOZU[r.durum] ?? r.durum}
        baslik={r.sebep}
        cumle={ASAMA_ACIKLAMA[r.asama] ?? 'Bu aşama sözlükte tanımlı değil — '
          + 'kaydın hangi adımda düştüğü yorumlanamıyor.'} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Aşama', deger: asamaYazisi(r.asama),
          durum: ASAMA_ACIKLAMA[r.asama] ? undefined : 'unk' },
        { etiket: 'Kaynak sistem', deger: r.kaynakSistem },
        { etiket: 'Kaynak kayıt kimliği', deger: r.kaynakKayitId ?? 'kaynak vermedi',
          durum: r.kaynakKayitId ? undefined : 'unk' },
        { etiket: 'Connector', deger: r.connectorAdi ?? 'kayda bağlı değil',
          durum: r.connectorAdi ? undefined : 'unk' },
        { etiket: 'Düşme zamanı', deger: zamanTR(r.olusturuldu) },
        { etiket: 'İnceleme',
          deger: r.incelemeZamani
            ? `${r.inceleyen ?? 'inceleyen kaydı yok'} · ${zamanTR(r.incelemeZamani)}`
            : 'henüz incelenmedi',
          durum: r.incelemeZamani ? undefined : 'bd' },
      ]} />

      {r.incelemeNotu && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s22)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s8)' }}>İnceleme notu</p>
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
            {r.incelemeNotu}
          </p>
        </div>
      )}

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Ham kayıt</p>
        {r.hamJson ? (
          <pre className="mono" style={{ margin: 0, padding: 'var(--s12)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 260,
            overflow: 'auto', background: 'var(--panel)',
            border: 'var(--bw-edge) solid var(--hr2)', fontSize: 'var(--t-label)' }}>
            {r.hamJson}
          </pre>
        ) : (
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Ham kayıt saklanmamış — bu bir kayıt boşluğudur, kaydın neden
            düştüğü yalnız sebep metninden okunabilir.
          </p>
        )}
        <p className="ab-panel-dip" style={{ margin: 'var(--s8) 0 0' }}>
          Ham kayıt çekirdek tarafından sırları maskelenerek yazılır.
        </p>
      </div>

      {yazabilir ? (
        <CekmeceEylemler
          birincil={
            <>
              <Alan etiket="Karar">
                <select className="ab-gr" value={durum}
                  onChange={(e) => setDurum(e.target.value)}>
                  {DURUMLAR.map((d) => (
                    <option key={d} value={d}>{RED_DURUM_SOZU[d]}</option>
                  ))}
                </select>
              </Alan>
              <div style={{ marginTop: 'var(--s10)' }}>
                <Alan etiket="İnceleme notu" zorunlu={durum !== 'acik'}>
                  <textarea className="ab-gr" rows={3} value={not}
                    onChange={(e) => setNot(e.target.value)}
                    placeholder="Kaydın neden bu karara bağlandığı — denetim izine yazılır"
                    style={{ resize: 'vertical' }} />
                </Alan>
              </div>
              <div style={{ marginTop: 'var(--s12)' }}>
                <Dugme tur="tam" disabled={pasif}
                  style={pasif ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                  onClick={() => calistir(
                    () => redKaydiIncele({ idler: [r.id], durum, not: not.trim() || null }),
                    () => { setNot(''); kapat(); },
                  )}>
                  {bekliyor ? 'Yazılıyor…' : 'Kararı kaydet'}
                </Dugme>
              </div>
            </>
          }
          dipNot={hata ?? 'Kayıt silinmez. “Yok sayıldı” da bir karardır ve '
            + 'saklanır; notsuz kapatılamaz.'}
        />
      ) : (
        <CekmeceEylemler dipNot="Reddedilen kaydı kapatmak yönetim yazma yetkisi ister." />
      )}
    </>
  );
}

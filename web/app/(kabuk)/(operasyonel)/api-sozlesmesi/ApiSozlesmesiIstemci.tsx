'use client';
import Link from 'next/link';
import { useState } from 'react';
import { BosIlk, Im } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import {
  anahtarCumlesi, UC_ETIKETI, UC_KIMLIKLERI, yazmaUcuMu,
  type AnahtarOzeti,
} from '@/lib/api/kapsam';
import { SOZLESME_SURUMU, UC_YOLU } from '@/lib/api/sozlesme';

/* ═══ UY-52 · API sözleşmesi ekranı ═══════════════════════════════════

   İki soruya sırayla cevap verir:
     1. Bu API ne yapar?          → uç tablosu (yol · yöntem · kapsam adı)
     2. Bugün kim neye erişiyor?  → uç başına etkin anahtar sayısı

   İkinci soru birincisinden ÖNCE görünmez ama daha önemlidir: bir uca kaç
   anahtarın eriştiğini bilmeyen kurum, o ucu kapatamaz.

   OpenAPI belgesi ekranın DİBİNDE durur ve kapalı başlar: entegrasyonu
   yazan kişi bir kez alır, yönetici her gün buraya bakar. */

const KOLONLAR = [
  { baslik: 'Yol', genislik: '1fr' },
  { baslik: 'Yöntem', genislik: '84px' },
  { baslik: 'Erişen anahtar', genislik: '132px', sag: true },
];

export default function ApiSozlesmesiIstemci({
  belge, ozet, ucKullanimi, mirasli,
}: {
  belge: string;
  ozet: AnahtarOzeti;
  ucKullanimi: Record<string, number>;
  mirasli: number;
}) {
  const [acik, setAcik] = useState(false);

  const satirlar: Satir[] = UC_KIMLIKLERI.map((uc) => {
    const sayi = ucKullanimi[uc] ?? 0;
    const yazan = yazmaUcuMu(uc);
    return {
      id: uc,
      /* Yazma ucu 'md' ile durur: bir kusur değil ama listede gözle
         ayrılması gereken şey. Hiç anahtarın erişmediği uç 'unk' —
         ölçülmüş sıfır, ama yine de "kimse kullanmıyor" bilgisi. */
      durum: yazan ? 'md' : sayi === 0 ? 'unk' : 'ok',
      konu: UC_ETIKETI[uc],
      alt: uc,
      hucreler: [
        UC_YOLU[uc],
        yazan ? 'POST' : 'GET',
        sayi === 0 ? 'hiç' : `${sayi} anahtar`,
      ],
    };
  });

  return (
    /* Kabuk `<main>` BASMAZ (components/kabuk/Kabuk.tsx): ana bölgeyi
       ekranın kendisi çizer. Unutulursa sayfanın hiç ana bölgesi olmaz
       ve "içeriğe atla" bağı bir yere varmaz; axe'ın wcag2a/aa kümesi
       bunu GÖRMEZ, `rota:duman` görür. */
    <main data-yuzey="tezgah" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow="Dış API · uç sözleşmesi"
        baslik="uç sözleşmesi tanımlı"
        vurgu={`${UC_KIMLIKLERI.length}`}
        vurguDurumu={ozet.kapsamsiz > 0 ? 'bd' : 'ok'}
        metrikler={[
          { deger: String(ozet.toplam - ozet.pasif), payda: String(ozet.toplam),
            yazi: 'etkin anahtar' },
          { deger: String(ozet.saltOkunur), yazi: 'salt okunur' },
          { deger: String(ozet.yazabilen), yazi: 'yazabiliyor',
            durum: ozet.yazabilen > 0 ? 'md' : undefined },
          { deger: String(ozet.kapsamsiz), yazi: 'kapsamı tanımsız',
            durum: ozet.kapsamsiz > 0 ? 'bd' : undefined },
        ]}
      />

      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s16)' }}>
        {anahtarCumlesi(ozet)}
        {mirasli > 0 && (
          <>
            {' '}Kapsamı tanımsız {mirasli} anahtar aşağıdaki BÜTÜN uçlara
            sayılmıştır: bugünkü gerçek erişimleri budur.
          </>
        )}
      </p>

      {satirlar.length === 0
        ? (
          <BosIlk
            cumle={'Uç kütüğü boş — sözleşmede tanımlı hiçbir uç yok.'
              + ' Anahtar kütüğü yönetim tezgâhındadır.'}
            eylem={<Link href="/yonetim-tezgahi" className="ab-dugme">API anahtarlarını aç</Link>} />
        )
        : <Tablo kolonlar={KOLONLAR} satirlar={satirlar} />}

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
          OpenAPI 3.1 · sürüm {SOZLESME_SURUMU}
        </p>
        <p className="ab-panel-dip" style={{ margin: '0 0 var(--s12)' }}>
          Belge ürünün uç kütüğünden ve istek şemalarından üretilir; elle
          düzenlenmez ve diskte bir kopyası tutulmaz.{' '}
          <b>Taban adres (<code>servers</code>) belgede YOKTUR</b>: ürünün
          nerede koşacağı ürünle gelmez, örnek bir adres yazmak üretilen her
          istemciye yanlış bir adres koymak olurdu.
        </p>
        <button type="button" className="ab-gr" onClick={() => setAcik(!acik)}
          aria-expanded={acik}
          style={{ cursor: 'pointer', textAlign: 'left' }}>
          {acik ? 'Belgeyi gizle' : 'Belgeyi göster'}
        </button>
        {acik && (
          <pre style={{
            marginTop: 'var(--s12)', maxHeight: '52vh', overflow: 'auto',
            fontFamily: 'var(--veri)', fontSize: 'var(--t-code)', lineHeight: 1.55,
            background: 'var(--panel2)', padding: 'var(--s12)', borderRadius: 3,
            userSelect: 'all',
          }}>{belge}</pre>
        )}
      </div>

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>İki kapı, bu sırayla</p>
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          <Im durum="ok" /> Önce <b>kapsam</b>: bu anahtar bu uca bakabilir mi?
          Sonra <b>rol</b>: anahtar sahibi bu veriyi görebilir mi? Kapsam bir
          yetki kaynağı DEĞİLDİR — sahibinde olmayan bir yetkiyi açmaz, yalnız
          erişilebilir uçları kısar. Salt okunur işareti kapsam listesinden
          bağımsız ikinci bir katmandır: listeye yanlışlıkla bir yazma ucu
          girse bile işaret kapalıysa yazma geçmez.
        </p>
      </div>
    </main>
  );
}

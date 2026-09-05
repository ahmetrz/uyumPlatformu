'use client';
import { Im } from '@/components/kabuk/temel';
import { Tuval } from '@/components/kabuk/grafik';
import {
  Cekmece, CekmeceAlanlar, CekmeceBagli, CekmeceKimlik,
} from '@/components/kabuk/panel';
import { tarihTR } from '@/lib/sabitler';
import {
  BOLGE_TIP_SOZU, bolgeImi, envanterBagi,
  type BolgeGeciti, type BolgeGrafigi, type BolgeSatiri,
} from './mantik';

/* B8/B10 · Bölge–geçit görünümü — topoloji tezgâhının OKUMA yüzeyi.

   Burada hiçbir yazma eylemi yoktur: bölge ve geçit tanımı varlık
   aktarımı / CMDB kaydından gelir, bu ekran onu yalnız ÇİZER. Geçidin
   onayı da burada verilmez; onay iş akışı geçit kaydının sahibindedir.

   Tuval kenar etiketi çizmez (grafik.tsx sözleşmesi). Protokol etiketi
   kritik bilgidir ve ipucuna saklanamaz; bu yüzden tuvalin üstüne
   bindirilmiş bir katmanda yazılır ve çekmecede tekrar edilir. */

export function BolgeTuvali({ grafik, odak, odakla }: {
  grafik: BolgeGrafigi;
  odak: string | null;
  odakla: (id: string) => void;
}) {
  /* Bant başına ~96px: 168×46 kutu + etiket + nefes payı. */
  const yukseklik = Math.max(300, grafik.katmanlar.length * 96 + 60);
  const ilgili = (kaynak: string, hedef: string) =>
    !odak || odak === kaynak || odak === hedef;

  const dipNot = [
    `${grafik.cizilen} bölge · ${grafik.kenarlar.length} geçit`,
    grafik.cizilen < grafik.toplam
      && `${grafik.toplam - grafik.cizilen} bölge tavan dışında kaldı`,
    grafik.dusenGecit > 0 && `${grafik.dusenGecit} geçidin bir ucu çizilmedi`,
  ].filter(Boolean).join(' · ');

  return (
    <div className="ab-graf-sar">
      <Tuval
        dugumler={grafik.dugumler}
        kenarlar={grafik.kenarlar}
        odak={odak}
        odakla={odakla}
        dipNot={dipNot}
        yukseklik={yukseklik}
      />

      {/* Bant adları: Purdue seviyesi sol kenarda, düğümün kendi üst
          etiketinde de tekrar eder — biri konum, öteki kimlik. */}
      <div className="ab-graf-katmanlar" aria-hidden>
        {grafik.katmanlar.map((k) => (
          <span key={k.ad} className="ab-graf-katman mono" style={{ top: `${k.y}%` }}>
            {k.ad}
          </span>
        ))}
      </div>

      {/* Geçit protokolü kenarın ortasında. Odak dışı kenarın etiketi
          sönümlenir ama KALIR — Tuval'ın kenar opaklığıyla aynı sözleşme. */}
      <ul className="ab-graf-etiketler" aria-label="Geçit protokolleri">
        {grafik.etiketler.map((e) => (
          <li key={e.id} className="ab-graf-etiket mono"
            style={{ left: `${e.x}%`, top: `${e.y}%`, opacity: ilgili(e.kaynak, e.hedef) ? 1 : 0.3 }}>
            {e.metin}
          </li>
        ))}
      </ul>
    </div>
  );
}

const YON_SOZU = { giden: 'bu bölgeden →', gelen: '← bu bölgeye' } as const;

export function BolgeCekmecesi({ bolge, gecitler, kapat }: {
  bolge: BolgeSatiri;
  gecitler: BolgeGeciti[];
  kapat: () => void;
}) {
  const im = bolgeImi(gecitler);
  const giden = gecitler.filter((g) => g.yon === 'giden').length;
  const gelen = gecitler.length - giden;

  return (
    <Cekmece kod={bolge.kod} kapat={kapat}>
      <CekmeceKimlik
        durum={im.durum}
        soz={im.soz}
        baslik={bolge.ad}
        cumle={bolge.seviye === null
          ? 'Bu bölgenin Purdue seviyesi tanımlı değil; diyagramda ayrı bantta'
            + ' durur. Seviye varlık aktarımıyla ya da bölge kaydından gelir.'
          : undefined}
      />

      <CekmeceAlanlar
        alanlar={[
          { etiket: 'Tip', deger: BOLGE_TIP_SOZU[bolge.tip] ?? bolge.tip },
          { etiket: 'Seviye',
            deger: bolge.seviye === null ? 'tanımsız' : `SL${bolge.seviye}`,
            durum: bolge.seviye === null ? 'unk' : undefined },
          { etiket: 'Santral', deger: bolge.tesisKodu ?? 'tesissiz · grup düzeyi',
            durum: bolge.tesisKodu ? undefined : 'unk' },
          { etiket: 'Varlık', deger: `${bolge.varlikSayisi}` },
          { etiket: 'Geçit', deger: `${gecitler.length} · ${giden} giden · ${gelen} gelen` },
        ]}
      />

      <p className="etiket ab-panel-blokbas">Geçitler</p>
      {gecitler.length === 0 ? (
        <p className="ab-dip" style={{ margin: 0 }}>
          Bu bölge için geçit kaydı yok. Bu &quot;yalıtılmış&quot; demek DEĞİLDİR;
          geçit tanımı henüz kayda girmemiş de olabilir.
        </p>
      ) : (
        <ul className="ab-graf-gecitler">
          {gecitler.map((g) => (
            <li key={g.id} className="ab-graf-gecit">
              <span className="ust">
                <Im durum={g.onaylandi ? 'ok' : 'md'}
                  ad={g.onaylandi ? 'Onaylı geçit' : 'Onaysız geçit'} />
                <span className="mono yon">{YON_SOZU[g.yon]}</span>
                <span className="ad">{g.diger?.ad ?? 'bilinmeyen bölge'}</span>
              </span>
              <span className="mono alt">
                {[
                  g.protokoller ?? 'protokol kaydı yok',
                  g.kontrolVarligi ? `kontrol: ${g.kontrolVarligi}` : 'kontrol varlığı yok',
                  g.onaylandi ? 'onaylı' : 'onaysız',
                  g.sonDogrulama
                    ? `doğrulandı ${tarihTR(g.sonDogrulama)}`
                    : 'hiç doğrulanmadı',
                ].join(' · ')}
              </span>
              {g.aciklama && <span className="aciklama">{g.aciklama}</span>}
            </li>
          ))}
        </ul>
      )}

      <CekmeceBagli
        baslik="Bağlı kayıtlar"
        kayitlar={[{
          id: `env-${bolge.id}`,
          kod: `${bolge.varlikSayisi} varlık`,
          alt: `Envanter · ${bolge.kod} kodu aranmış açılır`,
          yol: envanterBagi(bolge.kod),
        }]}
      />
    </Cekmece>
  );
}

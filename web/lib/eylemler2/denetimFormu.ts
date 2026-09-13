'use server';

/* ═══════════════════════════════════════════════════════════════════════
   DENETİM FORMU DIŞA AKTARIMI — denetlenebilir bir OLAY olarak (R12)

   Kanıt paketiyle (`disaAktarim.ts`) AYNI üç kural geçerlidir ve gerekçesi
   aynıdır: bu eylem veri okur ama sıradan bir okuma değildir — kapsamdaki
   her kontrolün durumu, olgunluğu ve kapsam kararı tek dosyada kurumun
   dışına çıkar.

   1. KAPSAM YETKİDEN GELİR ve kesiştirilmez, DENETLENİR. Kapsam dışı bir
      id istendiğinde istek sessizce daraltılmaz, REDDEDİLİR — sessiz
      daraltma, denetçiye eksik bir formu tam sanarak vermek olurdu.
      Dış denetçi (`DenetciErisimi`) yalnız KENDİ kapsamını indirir: davet
      `yetkileriAc` ile yetki satırı açar, `izinliTesisIdleri` onu okur ve
      kapsam dışı kalan her tesis burada reddedilir.
   2. HER ÇAĞRI İZ BIRAKIR — reddedilen çağrı da.
   3. BOŞ HÜCRE KAPISI FORM KATMANINDA. Buradan geçen yol `formCsv` /
      `formXlsx`; kapı orada fırlatırsa dosya üretilmez ve eylem hatayı
      olduğu gibi taşır — yutmaz.

   Kalıp: demo kapısı → zod → oturum → kapsam denetimi → form → iz. */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { kopruKosulu } from '@/app/kapsam';
import { aktifKullanici } from '../auth';
import { db } from '../db';
import { DEMO } from '../demo';
import { izinVar, disaAktarimKapsami } from '../erisim';
import { MARKA_AD } from '../marka';
import { DURUMLAR } from '../sabitler';
import { damgaliAd } from '../disaAktarim/csv';
import { formSatiri, FORM_SUTUNLARI, type FormOlcumu } from '../denetim/formDoldurma';
import { SOA_SUTUNLARI, soaSatiri } from '../denetim/soa';
import { maddeGirdisi, soaGirdisi } from '../denetim/formVerisi';
import {
  formCsv, formXlsx, formlarinOlcumu, type FormBolumu, type Kunye,
} from '../denetim/formDisaAktarim';
import {
  FORM_TURU_ADI, cekirdekTuru, sablonKodu,
} from '../denetim/formTuru';
import {
  SABLON_SUTUNLARI, sablonuDoldur, type Sablon,
} from '../denetim/sablonDoldurma';
import { hata, iz } from './ortak';

export type DenetimFormuSonucu =
  | {
    ok: true;
    csvAdi: string;
    csv: string;
    xlsxAdi: string;
    /** İkili gövde; indirme istemcide yapılır, sunucu dosya yazmaz. */
    xlsxBase64: string;
    olcum: FormOlcumu;
  }
  | { ok: false; hata: string };

const Sema = z.object({
  regulasyonId: z.string().trim().min(1, 'Çerçeve seçin'),
  tesisIdleri: z.array(z.string().trim().min(1)).min(1, 'En az bir kapsam seçin'),
  /* Çekirdek türü ya da `sablon:<KOD>`; şablon kodları kurulumdan gelir,
     derleme anında bilinemez, bu yüzden enum değil süzgeç. */
  tur: z.string().trim().min(1, 'Form türü seçin')
    .refine((t) => cekirdekTuru(t) || sablonKodu(t) !== null, 'Bilinmeyen form türü'),
});

/**
 * Denetim formunu üretir (CSV + XLSX) ve gövdelerini döndürür.
 *
 * `denetim/okuma` yeter — dış denetçi rolü de bu yetkiyi taşır ve kendi
 * kapsamının formunu alabilmelidir. Yetkinin YAPTIĞI iş kapsam daraltmadır.
 */
export async function denetimFormuUretEylem(girdi: {
  regulasyonId: string;
  tesisIdleri: string[];
  tur: string;
}): Promise<DenetimFormuSonucu> {
  const istekId = randomUUID();
  let kullaniciId: string | null = null;
  try {
    if (DEMO) {
      throw new Error('Demo sürümü: denetim formu üretilmez —'
        + ' form gerçek kapsam kararı ve denetim izi gerektirir.');
    }

    /* Sıra bilerek ters (kanıt paketiyle aynı gerekçe): yetkinin GİRDİSİ
       kapsamın kendisidir, önce hangi kapsamın istendiğini bilmeliyiz. */
    const v = Sema.parse(girdi);
    const istenen = [...new Set(v.tesisIdleri)];

    const k = await aktifKullanici();
    if (!k) throw new Error('Oturum gerekli');
    kullaniciId = k.id;

    /* KAPSAM KARARI TEK KAYNAKTAN — `erisim.ts` → `disaAktarimKapsami`.
       Her yüzeyin kendi başına karar vermesi, dışa aktarımın ekrandan
       geniş kalmasına yol açar ve ayrışma SESSİZDİR (ölçüldü: #48). */
    const kapsam = disaAktarimKapsami(k, 'denetim');
    if (kapsam.bos) {
      throw new Error('Denetim modülünde okuma yetkiniz yok — form üretilemedi');
    }
    /* Her kapsam TEK TEK denetlenir; ilkinin geçmesi kalanını geçirmez.
       Kaç tanesinin dışarıda kaldığı söylenir, HANGİSİ olduğu değil. */
    const disarida = istenen.filter((t) => !izinVar(k, 'denetim', 'okuma', { tesisId: t }));
    if (disarida.length > 0) {
      throw new Error(`İstenen ${disarida.length} kapsam yetkinizin dışında — form üretilmedi`);
    }

    const regulasyon = await db.regulasyon.findUnique({
      where: { id: v.regulasyonId }, select: { kod: true, ad: true },
    });
    if (!regulasyon) throw new Error('Çerçeve bulunamadı');

    const satirlar = await db.maddeDurumu.findMany({
      where: {
        surec: { regulasyonId: v.regulasyonId },
        ...kopruKosulu(istenen),
      },
      select: {
        durum: true, olgunlukSeviyesi: true, not: true, sonDegerlendirme: true,
        madde: { select: { kod: true, baslik: true, olgunlukSeviyesi: true } },
        sorumlu: { select: { adSoyad: true } },
        kapsamOgesi: { select: { tesisId: true, ad: true } },
        _count: { select: { kanitBaglantilari: true } },
      },
      orderBy: [{ kapsamOgesi: { ad: 'asc' } }, { madde: { kod: 'asc' } }],
    });

    /* Kapsam öğesi başına AYRI bölüm: tek listede birleştirmek, hangi
       kontrolün hangi öğede ölçüldüğünü kaybetmek olurdu. */
    const gruplar = new Map<string, typeof satirlar>();
    for (const s of satirlar) {
      const ad = s.kapsamOgesi.ad;
      const mevcut = gruplar.get(ad);
      if (mevcut) mevcut.push(s); else gruplar.set(ad, [s]);
    }

    if (gruplar.size === 0) {
      /* Sıfır satırlık bir form üretmek, denetçiye "bu çerçevede hiçbir
         kontrol yok" demektir — oysa olan şey kapsamda kayıt olmamasıdır.
         İkisi ayrı ve bu ayrım gizlenmez. */
      throw new Error('Seçilen kapsamda bu çerçeveye ait kayıt yok — form üretilmedi');
    }

    const sablonKod = sablonKodu(v.tur);
    let bolumler: FormBolumu[];
    let formAdi: string;
    let taban: string;

    if (sablonKod !== null) {
      /* PAKET ŞABLONU. Çekirdek şablonu ÜRETMEZ, yalnız doldurur: bölümler
         ve sorular paketten gelir. Pasif şablon doldurulmaz — pasifleşmiş
         bir şablonu doldurmak, paket güncellemesiyle geri çekilmiş bir
         soruya bugünün verisiyle cevap vermek olurdu. */
      const kayit = await db.formSablonu.findFirst({
        where: { kod: sablonKod, aktif: true },
        select: { kod: true, ad: true, tanimJson: true },
      });
      if (!kayit) throw new Error(`Form şablonu kurulu değil ya da pasif: ${sablonKod}`);
      const sablon = JSON.parse(kayit.tanimJson) as Sablon;

      /* Durum sayımı kovaları BURADA kurulur: altı çekirdek durumun altısı
         da sıfırla açılır ki ölçülmüş sıfır ile hiç sayılmamış kova
         birbirine karışmasın. Kova kurulmadan doldurucuya gitseydi, boş
         çıkan durum "Değerlendirilmedi" derdi — oysa sayıldı ve sıfırdı. */
      const sayimlar = new Map<string, number>(DURUMLAR.map((d) => [d, 0]));
      for (const s of satirlar) {
        /* Kurulumda tanınmayan bir durum kodu varsa kova açılır: bilinmeyen
           kod sessizce bir başkasının kovasına eklenmez. */
        sayimlar.set(s.durum, (sayimlar.get(s.durum) ?? 0) + 1);
      }

      const maddeHaritasi = new Map(satirlar.map((s) => [s.madde.kod, maddeGirdisi({
        madde: s.madde,
        durum: s.durum,
        olgunlukSeviyesi: s.olgunlukSeviyesi,
        not: s.not,
        sorumluAdi: s.sorumlu?.adSoyad ?? null,
        sonDegerlendirme: s.sonDegerlendirme,
        kanitSayisi: s._count.kanitBaglantilari,
      })]));

      bolumler = sablonuDoldur(sablon, maddeHaritasi, sayimlar)
        .map((b) => ({ ad: b.ad, sutunlar: SABLON_SUTUNLARI, satirlar: b.satirlar }));
      formAdi = kayit.ad;
      taban = `${kayit.kod}_${regulasyon.kod}`;
    } else {
      bolumler = [...gruplar.entries()].map(([ad, grup]) => {
        const eslenmis = grup.map((s) => ({
          madde: s.madde,
          durum: s.durum,
          olgunlukSeviyesi: s.olgunlukSeviyesi,
          not: s.not,
          sorumluAdi: s.sorumlu?.adSoyad ?? null,
          sonDegerlendirme: s.sonDegerlendirme,
          kanitSayisi: s._count.kanitBaglantilari,
        }));
        return v.tur === 'soa'
          ? { ad, sutunlar: SOA_SUTUNLARI, satirlar: eslenmis.map((e) => soaSatiri(soaGirdisi(e))) }
          : { ad, sutunlar: FORM_SUTUNLARI, satirlar: eslenmis.map((e) => formSatiri(maddeGirdisi(e))) };
      });
      formAdi = FORM_TURU_ADI[v.tur === 'soa' ? 'soa' : 'oz_denetim'];
      taban = `${v.tur === 'soa' ? 'soa' : 'oz-denetim'}_${regulasyon.kod}`;
    }

    const simdi = Date.now();
    const kunye: Kunye = {
      baslik: `${formAdi} · ${regulasyon.kod}`,
      alanlar: [
        { etiket: 'Ürün', deger: MARKA_AD },
        { etiket: 'Çerçeve', deger: `${regulasyon.kod} — ${regulasyon.ad}` },
        { etiket: 'Kapsam', deger: [...gruplar.keys()].join(', ') },
        { etiket: 'Üreten', deger: k.adSoyad },
        { etiket: 'Üretim zamanı', deger: new Date(simdi).toISOString() },
      ],
    };

    /* SIR SÜZGECİNİN ÜÇÜNCÜ DİŞİ (bağımsız inceleme bulgusu, PR #46):
       kurulumdaki HAM `sirReferansi` değerleri süzgece VERİLİR. Bir
       operatör kapsam gerekçesine `vault:kv/uretim/...#anahtar` gibi bir
       referansı yapıştırırsa, ad kara listesi ve kalıp listesi onu
       görmez — yalnız bu karşılaştırma görür. Kanıt paketi bunu ilk
       günden yapıyordu; form yolu yapmıyordu ve fark okunan bir yorumla
       "aynı süzgeç" diye örtülüydü. */
    const hamSirlar = (await db.connector.findMany({
      select: { sirReferansi: true },
    })).map((c) => c.sirReferansi);

    const olcum = formlarinOlcumu(bolumler);
    const csv = formCsv(kunye, bolumler, hamSirlar);
    const xlsx = formXlsx(kunye, bolumler, hamSirlar);

    await iz({
      aktorId: k.id,
      varlikTipi: 'DenetimFormu',
      varlikId: istekId,
      eylem: 'olusturma',
      gerekce: `${formAdi} · ${regulasyon.kod} · ${[...gruplar.keys()].join(', ')}`
        + ` · ${olcum.satir} satır · ${olcum.hucre} hücre · boş 0`
        + ` · ölçülmedi ${olcum.olculmedi}`
        + ` · gerekçesiz kapsam dışı ${olcum.gerekcesizKapsamDisi}`,
    });

    return {
      ok: true,
      csvAdi: damgaliAd(taban, simdi, 'csv'),
      csv,
      xlsxAdi: damgaliAd(taban, simdi, 'xlsx'),
      xlsxBase64: xlsx.toString('base64'),
      olcum,
    };
  } catch (e) {
    const s = hata(e);
    const mesaj = s.ok ? 'Beklenmeyen hata' : s.hata;
    if (kullaniciId) {
      try {
        await iz({
          aktorId: kullaniciId,
          varlikTipi: 'DenetimFormu',
          varlikId: istekId,
          eylem: 'red',
          gerekce: `Denetim formu reddedildi: ${mesaj}`,
        });
      } catch {
        // İz yazılamadıysa kullanıcıya dönen hata değişmez; asıl hata bildirilir.
      }
    }
    return { ok: false, hata: mesaj };
  }
}

'use server';

/* Kanıt paketi dışa aktarımı — denetlenebilir bir OLAY olarak (§19).

   Bu eylem veri okur ama sıradan bir okuma değildir: kapsamdaki her madde,
   bulgu, köken ve denetim izi satırı tek dosyada kurumun dışına çıkar.
   Bu yüzden üç kural:

   1. KAPSAM YETKİDEN GELİR. Kullanıcının istediği santral kümesi
      `izinliTesisIdleri` ile KESİŞTİRİLMEZ, DENETLENİR: kapsam dışı bir id
      istendiğinde istek sessizce daraltılmaz, REDDEDİLİR. Sessiz daraltma,
      denetçiye eksik bir paketi tam sanarak vermek olurdu.
   2. HER ÇAĞRI İZ BIRAKIR — reddedilen çağrı da. "Kim, ne zaman, hangi
      kapsam için kanıt paketi istedi" sorusunun yanıtsız kalması, denetim
      izinin kendisinde bir boşluktur.
   3. SIR SÜZGECİ PAKET KATMANINDA. Buradan geçen yol `kanitPaketiUret`;
      süzgeç orada fırlatırsa paket üretilmez ve eylem hatayı olduğu gibi
      taşır — yutmaz.

   Kalıp: zod → oturum → kapsam denetimi (santral başına) → paket → iz. */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { aktifKullanici } from '../auth';
import { DEMO } from '../demo';
import { izinVar, izinliTesisIdleri } from '../erisim';
import {
  kanitPaketiUret, type PaketImzasi, type PaketSayimlari,
} from '../disaAktarim/paket';
import { hata, iz } from './ortak';
import { version as URUN_SURUMU } from '../../package.json';

export type PaketSonucu =
  | {
    ok: true;
    dosyaAdi: string;
    /** Denetçiye giden dosyanın tam gövdesi. */
    json: string;
    /** SHA-256 bütünlük damgası — denetim izine de bu yazılır. */
    ozet: string;
    /** UY-18 · paketin imza beyanı; bugün daima "imzasız". */
    imza: PaketImzasi;
    sayimlar: PaketSayimlari;
  }
  | { ok: false; hata: string };

const Sema = z.object({
  regulasyonId: z.string().trim().min(1, 'Regülasyon seçin'),
  tesisIdleri: z.array(z.string().trim().min(1)).min(1, 'En az bir santral seçin'),
  baslangic: z.string().min(1, 'Başlangıç tarihi zorunlu'),
  bitis: z.string().min(1, 'Bitiş tarihi zorunlu'),
});

function tarihCoz(deger: string, ad: string): Date {
  const d = new Date(deger);
  if (Number.isNaN(d.getTime())) throw new Error(`${ad} okunamadı: ${deger}`);
  return d;
}

/**
 * Kapsam kanıt paketini üretir ve gövdesini döndürür (indirme istemcide
 * yapılır; sunucu dosya yazmaz).
 *
 * `denetim/okuma` yeter — dış denetçi rolü de bu yetkiyi taşır ve kendi
 * kapsamının kanıtını alabilmelidir. Yetkinin YAPTIĞI iş kapsam daraltmadır:
 * kullanıcı yalnız izinli olduğu santrallerin verisini alır.
 */
export async function kanitPaketiUretEylem(girdi: {
  regulasyonId: string;
  tesisIdleri: string[];
  baslangic: string;
  bitis: string;
}): Promise<PaketSonucu> {
  const istekId = randomUUID();
  let kullaniciId: string | null = null;
  try {
    /* Demo kapısı burada da duruyor. next.config.ts bu modülü `.demo.ts`
       ikizine alias'lar; ama alias kaydı unutulursa demo yayını gerçek
       veriye bakan bir kanıt paketi üretmeye çalışırdı. Kapı iki yerde. */
    if (DEMO) {
      throw new Error(
        'Demo sürümü: kanıt paketi üretilmez — paket gerçek veri ve denetim izi gerektirir.');
    }

    /* Sıra bilerek ters: önce zod, sonra yetki. Bu eylemde YETKİNİN GİRDİSİ
       kapsamın kendisidir — santrale kısıtlı bir rol `izinVar`ın kapsamUyar
       kuralı gereği KAPSAMSIZ okumayı geçemez, dolayısıyla önce hangi
       santrallerin istendiğini bilmemiz gerekir. Kapsamsız bir kapı koysaydık
       tesis yetkili denetçi kendi santralinin kanıtını bile alamazdı. */
    const v = Sema.parse(girdi);
    const istenen = [...new Set(v.tesisIdleri)];

    /* `yetkiZorunlu` yerine oturum + açık `izinVar`: aktörün KİM olduğu,
       kapsam kararından ÖNCE bilinmek zorunda. yetkiZorunlu kapsam dışı bir
       istekte fırlatır ve geriye yazacak aktör bırakmaz — reddedilen dışa
       aktarım denetim izinde görünmez olurdu. Kapının kendisi kaybolmuyor:
       aşağıda istenen HER santral için izinVar koşuyor. */
    const k = await aktifKullanici();
    if (!k) throw new Error('Oturum gerekli');
    kullaniciId = k.id;

    const izinli = izinliTesisIdleri(k, 'denetim');
    if (izinli !== null && izinli.length === 0) {
      throw new Error('Denetim modülünde okuma yetkiniz yok — kanıt paketi üretilemez');
    }
    /* Her santral TEK TEK denetlenir; ilk santralin geçmesi kalanını
       geçirmez. Kapsam dışı id'nin var olup olmadığı sızmaz: kaç tanesinin
       dışarıda kaldığı söylenir, hangisi olduğu değil. */
    const disarida = istenen.filter((t) => !izinVar(k, 'denetim', 'okuma', { tesisId: t }));
    if (disarida.length > 0) {
      throw new Error(
        `İstenen ${disarida.length} santral yetkinizin kapsamı dışında — paket üretilmedi`);
    }

    const baslangic = tarihCoz(v.baslangic, 'Başlangıç tarihi');
    const bitis = tarihCoz(v.bitis, 'Bitiş tarihi');

    const { paket, json } = await kanitPaketiUret({
      kapsam: { regulasyonId: v.regulasyonId, tesisIdleri: istenen, baslangic, bitis },
      ureten: { id: k.id, adSoyad: k.adSoyad },
      urunSurumu: URUN_SURUMU,
    });

    const reg = paket.baslik.kapsam.regulasyon.kod;
    const gun = paket.baslik.uretimZamani.slice(0, 10);

    /* İz satırı paketin ÖZETİNİ taşır: denetçinin elindeki dosyayla bu
       kaydı eşleştirmenin tek yolu budur. */
    await iz({
      aktorId: k.id,
      varlikTipi: 'KanitPaketi',
      varlikId: istekId,
      eylem: 'olusturma',
      alan: 'ozet',
      sonra: paket.ozet,
      gerekce: `Kanıt paketi · ${reg} · ${paket.baslik.kapsam.tesisler.map((t) => t.kod).join(', ')}`
        + ` · ${v.baslangic}–${v.bitis} · ${paket.sayimlar.madde} madde, `
        + `${paket.sayimlar.bulgu} bulgu, ${paket.sayimlar.izSatiri} iz satırı`,
    });

    return {
      ok: true,
      dosyaAdi: `kanit-paketi_${reg}_${gun}_${paket.ozet.slice(0, 8)}.json`,
      json,
      ozet: paket.ozet,
      imza: paket.baslik.imza,
      sayimlar: paket.sayimlar,
    };
  } catch (e) {
    const s = hata(e);
    const mesaj = s.ok ? 'Beklenmeyen hata' : s.hata;
    /* Reddedilen istek de denetim izine yazılır. Oturum hiç açılmadıysa
       (yetkiZorunlu fırlattıysa) aktör bilinmez ve iz yazılamaz — o durumda
       kayıt girişin kendi izindedir, burada uydurulmaz. */
    if (kullaniciId) {
      try {
        await iz({
          aktorId: kullaniciId,
          varlikTipi: 'KanitPaketi',
          varlikId: istekId,
          eylem: 'red',
          gerekce: `Kanıt paketi reddedildi: ${mesaj}`,
        });
      } catch {
        // İz yazılamadıysa kullanıcıya dönen hata değişmez; sessiz kalmaz,
        // asıl hata zaten aşağıda bildirilir.
      }
    }
    return { ok: false, hata: mesaj };
  }
}

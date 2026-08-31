import 'server-only';
import { kanitTazeligiIsle } from './kanitTazelik';
import { sonTarihleriIsle } from './sonTarih';
import { gapAksiyonIsle } from './gapAksiyon';
import { veriKalitesiniIsle } from './veriKalitesi';
import { anlikGoruntuAl } from './anlik';
import { yedekDogrulamayiIsle } from './yedekDogrulama';
import { topolojiSapmasiniIsle } from './topolojiSapma';
import { olayEtkileriniIsle } from './olayEtki';

/* Motor kayıt defteri — TEK doğruluk kaynağı.

   Bu liste iki yerde ayrı ayrı yazılıyordu: `lib/eylemler2/isler.ts`
   (ekrandaki "hepsini çalıştır" düğmesi) ve `instrumentation.ts`
   (saatlik zamanlayıcı). İkisi ayrışmıştı: zamanlayıcı sekiz motorun
   yalnız BEŞİNİ koşturuyordu — `yedek_dogrulama`, `olay_etki` ve
   `topoloji_sapma` sonradan eklendiği için o kopyaya girmemişti. Yani
   kimse düğmeye basmazsa o üç motor hiç koşmuyordu; ekranda "hiç
   ölçülmedi" görünüyor ama sebebi bir veri eksikliği değil, unutulmuş
   bir satırdı.

   Yeni motor buraya eklenir; iki çağıran da onu kendiliğinden görür. */
export const MOTORLAR = {
  kanit_tazelik: kanitTazeligiIsle,
  deadline_motoru: sonTarihleriIsle,
  gap_to_action: gapAksiyonIsle,
  veri_kalitesi: veriKalitesiniIsle,
  uyum_anlik: anlikGoruntuAl,
  yedek_dogrulama: yedekDogrulamayiIsle,
  olay_etki: olayEtkileriniIsle,
  topoloji_sapma: topolojiSapmasiniIsle,
} as const satisfies Record<string, () => Promise<{ islenen: number; uretilen: number }>>;

export type MotorAdi = keyof typeof MOTORLAR;

/** Elle tetiklenen "hepsini çalıştır" sırası: veri kalitesi EN SONDA tam
    tarama yapar (ürünün özgün tasarımı). Entegrasyondan yeni veri
    geldiğinde koşan sıra FARKLIDIR ve `lib/entegrasyon/zincir.ts` içinde
    yaşar — orada veri kalitesi gap_to_action'dan ÖNCE koşar, çünkü yeni
    aktarılan kaydın kalitesi bilinmeden ondan aksiyon türetmek yanlış
    olur. İki sıra da bilinçlidir; ikisi de burada değil, çağıranda. */
export const MOTOR_ADLARI = Object.keys(MOTORLAR) as [MotorAdi, ...MotorAdi[]];

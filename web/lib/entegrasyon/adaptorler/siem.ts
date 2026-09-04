import 'server-only';
import { z } from 'zod';
import { BaglanmamisAdaptor, type IhtiyacKalemi, type Yetenek } from '../sozlesme';
import { AKTIF_ISLEM_YASAK, ORTAK_YAPILANDIRMA } from './ortak';

/* ═══════════════════════════════════════════════════════════════════════
   SIEM / log platformu (Splunk · Microsoft Sentinel · QRadar · Elastic)
   — BAĞLI DEĞİL.

   ── PASSIVE-FIRST NOTU ───────────────────────────────────────────────
   SIEM keşfin en pasif kaynağıdır: cihazlar zaten log gönderir, biz
   yalnız "kim log gönderiyor" sorusunun cevabını okuruz. Ağa hiçbir
   paket çıkmaz. Bu yüzden OT bölgelerinde ilk tercih edilecek kaynaktır.

   YASAK: SIEM üzerinden playbook/otomasyon tetiklemek, alarm kapatmak.
   Bu adaptör YALNIZ arama çalıştırır ve sonucu okur.

   ── BAĞLARKEN NEREYE NE YAZILACAK ────────────────────────────────────
   Splunk (REST, salt okunur rol):
     POST /services/search/jobs           (search= aşağıdaki sorgu)
     GET  /services/search/jobs/{sid}/results?output_mode=json
     Sorgu örneği (log kaynağı envanteri):
       | tstats latest(_time) as sonGorulme by host, sourcetype, index
       | where sonGorulme > <imlec>
   Microsoft Sentinel (Log Analytics):
     POST /v1/workspaces/{id}/query
       Heartbeat | summarize sonGorulme=max(TimeGenerated)
                   by Computer, RemoteIPCountry, OSType, ComputerIP
   QRadar:
     GET /api/config/domain_management/domains
     GET /api/ariel/searches   (AQL: SELECT sourceip, hostname FROM events …)

   `fetchChanges` imleci: son okunan olayın epoch zamanı. Delta bu alana
   dayanır; imleç GERİYE alınmaz (aynı pencere iki kez okunursa kayıtlar
   kaynakKayitId üzerinden zaten idempotent birleşir).

   VarlikGozlemi eşlemesi:
     host / Computer                → hostname
     ComputerIP / sourceip          → ipAdresi (destekleyici; tek başına eşleşmez)
     OSType / os                    → isletimSistemi
     sourcetype / index / log kaynağı adı → ham içinde saklanır
     `siem:${host}`                 → koken.kaynakKayitId  (KARARLI — host adı
                                      kaynakta birincil anahtar değildir, bu
                                      yüzden ön ek + normalize host kullanılır)
     ham olay/özet satırı           → ham

   ErisimGozlemi eşlemesi (ayrıcalıklı oturum açma izleri):
     Account / user                 → hesapAdi
     4624/4672 olay tipi            → ayricalikli
     max(TimeGenerated)             → sonKullanim

   CMDB anlamı: SIEM'den gelen kayıt varlığa onaylandığında
   `Varlik.logKaynagi = 'var'` yazılabilir. Tersi ÇIKARILMAZ — SIEM'de
   görünmeyen varlık için 'bilinmiyor' kalır.

   koken.guven: SIEM host alanı çoğu zaman cihazın kendi beyanıdır ve
   çakışabilir. Öneri: doğrulanmış heartbeat kaynağı → 0.6, serbest metin
   syslog host alanı → 0.3, bilgi yoksa null. */

export class SiemAdaptoru extends BaglanmamisAdaptor {
  readonly tip = 'siem';
  readonly yapilandirmaSemasi = z.looseObject({
    ...ORTAK_YAPILANDIRMA,
    /* Boş liste ile hiç vermemek AYNI ŞEY DEĞİL: boş liste "hiçbir index
       okunmayacak" demektir ve connector'ı sessizce çalışmaz yapar. */
    indexKapsami: z.array(z.string().min(1)).min(1).optional(),
    otSourcetype: z.string().min(1).optional(),
    /* Playbook/otomasyon tetikleme YASAK. */
    playbookIzni: AKTIF_ISLEM_YASAK,
  });
  /* Log kaynağı envanteri ve ayrıcalıklı oturum izleri verir. Cihazın
     yama ya da firmware seviyesini SÖYLEMEZ — log göndermek bir duruş
     beyanı değildir. */
  readonly yetenekler: Yetenek[] = ['asset_inventory', 'access_observation', 'passive_asset_discovery'];

  readonly gerekenSirlar = ['env:SIEM_TOKEN'];
  readonly gereken =
    'SIEM üzerinde salt okunur arama hesabı ve token: Splunk için ' +
    'HEC/REST token + arama yetkisi olan rol (env:SIEM_TOKEN); Sentinel ' +
    'için Log Analytics workspace id + Entra uygulama kaydı (Log Analytics ' +
    'Reader); QRadar için SEC token. Ayrıca hangi index/workspace/domain ' +
    'okunacağı ve OT loglarının hangi sourcetype altında toplandığı bilgisi.';

  readonly ihtiyaclar: IhtiyacKalemi[] = [
    { kod: 'taban_url', ad: 'SIEM taban URL / workspace', tur: 'adres', sir: false,
      aciklama: 'Splunk arama başlığı · Sentinel Log Analytics workspace kimliği · '
        + 'QRadar konsol adresi.' },
    { kod: 'token', ad: 'Salt okunur arama tokeni', tur: 'kimlik', sir: true,
      aciklama: 'Sır katmanından çözülür. Arama yetkisi olan salt okunur bir rol '
        + 'yeterlidir; yönetim yetkisi istenmez.' },
    { kod: 'kapsam', ad: 'Okunacak index / workspace / domain', tur: 'kapsam', sir: false,
      aciklama: 'Bütün SIEM\'i taramak yerine hangi kaynağın okunacağı.' },
    { kod: 'sourcetype', ad: 'OT loglarının sourcetype/tablo adı', tur: 'kapsam', sir: false,
      aciklama: 'OT günlüklerinin hangi ad altında toplandığı bilinmeden sorgu '
        + 'yazılamaz; bu bilgi kurumdan gelir ve tahmin edilmez.' },
  ];
}

export const siemAdaptoru = new SiemAdaptoru();

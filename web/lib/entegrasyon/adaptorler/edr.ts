import 'server-only';
import { z } from 'zod';
import { BaglanmamisAdaptor, type IhtiyacKalemi } from '../sozlesme';
import { AKTIF_ISLEM_YASAK, ORTAK_YAPILANDIRMA } from './ortak';

/* ═══════════════════════════════════════════════════════════════════════
   EDR / uç nokta koruması (CrowdStrike · Defender for Endpoint ·
   SentinelOne) — BAĞLI DEĞİL.

   ── PASSIVE-FIRST NOTU ───────────────────────────────────────────────
   EDR envanteri agent'ın kendi raporudur; ağa tarama paketi çıkmaz.
   YASAK olan uç noktalar: karantina/izolasyon (`/devices/entities/
   devices-actions/v2?action_name=contain`), süreç sonlandırma, script
   çalıştırma (RTR). Bu adaptör YALNIZ OKUR — müdahale kararı insanındır
   ve platformdan tetiklenmez.

   ── BAĞLARKEN NEREYE NE YAZILACAK ────────────────────────────────────
   CrowdStrike Falcon:
     POST /oauth2/token                       (client_credentials)
     GET  /devices/queries/devices-scroll/v1?filter=…&offset=…
     POST /devices/entities/devices/v2        (id listesiyle detay)
   Defender for Endpoint:
     GET  /api/machines?$filter=lastSeen gt {imlec}
   SentinelOne:
     GET  /web/api/v2.1/agents?updatedAt__gt={imlec}&cursor=…

   `fetchChanges` imleci: CrowdStrike'ta scroll `offset`, Defender'da son
   `lastSeen` ISO zamanı, SentinelOne'da `cursor`. Hangi biçim olursa
   olsun ham hâliyle `yeniImlec` alanına yazılır; yorumu adaptöre aittir.

   VarlikGozlemi eşlemesi (CrowdStrike alan adlarıyla):
     device_id                     → koken.kaynakKayitId  (KARARLI)
     hostname                      → hostname
     serial_number                 → seriNo
     mac_address                   → macAdresi
     local_ip                      → ipAdresi   (DHCP'de gezer — tek başına eşleme YAPMAZ)
     system_manufacturer           → uretici
     system_product_name           → model
     os_version + os_build         → isletimSistemi
     bios_version                  → firmware
     site_name / groups            → tesisKodu  (kurum eşlemesi yapılandırmadan)
     tüm cihaz nesnesi             → ham

   EDR kapsaması CMDB'de ayrı bir olgudur: bu adaptörden gelen bir kayıt
   varlığa onaylandığında `Varlik.edrDurumu = 'var'` yazılabilir. AMA
   tersi ÇIKARILMAZ: EDR'de görünmeyen varlık "edrDurumu = yok" DEĞİL,
   'bilinmiyor' kalır — yokluk kanıtı değildir.

   koken.guven: agent doğrudan cihazın üzerinde çalıştığı için kimlik
   alanları güvenilirdir. Öneri: son 24 saatte iletişim kurmuş agent → 0.9,
   bayat agent (>30 gün) → 0.4, bilgi yoksa null. */

export class EdrAdaptoru extends BaglanmamisAdaptor {
  readonly tip = 'edr';
  readonly yapilandirmaSemasi = z.looseObject({
    ...ORTAK_YAPILANDIRMA,
    grupKapsami: z.array(z.string().min(1)).min(1).optional(),
    /* İzolasyon/karantina bu adaptörden tetiklenmez; şema açılmasına
       izin vermez. */
    mudahaleIzni: AKTIF_ISLEM_YASAK,
  });
  readonly gerekenSirlar = ['env:EDR_ISTEMCI_SIRRI'];
  readonly gereken =
    'EDR konsolunda salt okunur API istemcisi: CrowdStrike için client id + ' +
    'secret ve "Hosts: Read" kapsamı (env:EDR_ISTEMCI_SIRRI); Defender için ' +
    'Entra uygulama kaydı + Machine.Read.All; SentinelOne için salt okunur ' +
    'API token. Ayrıca konsolun bölge taban URL\'i ve hangi site/grupların ' +
    'okunacağı. Müdahale (izolasyon/karantina) izni İSTENMEZ ve verilmemelidir.';

  readonly ihtiyaclar: IhtiyacKalemi[] = [
    { kod: 'taban_url', ad: 'Konsolun bölge taban URL\'i', tur: 'adres', sir: false,
      aciklama: 'EDR konsolunun kurum için geçerli bölgesel adresi.' },
    { kod: 'istemci_kimligi', ad: 'API istemci kimliği', tur: 'kimlik', sir: false,
      aciklama: 'CrowdStrike client id · Defender için Entra uygulama kaydı · '
        + 'SentinelOne için API kullanıcısı.' },
    { kod: 'istemci_sirri', ad: 'API sırrı / token', tur: 'kimlik', sir: true,
      aciklama: 'Sır katmanından referansla çözülür; değeri hiçbir yere yazılmaz.' },
    { kod: 'izinler', ad: 'Yalnız "Hosts: Read" sınıfı izin', tur: 'izin', sir: false,
      aciklama: 'İzolasyon/karantina, süreç sonlandırma ve RTR izni İSTENMEZ — '
        + 'bu adaptör müdahale etmez.' },
    { kod: 'kapsam', ad: 'Okunacak site / grup listesi', tur: 'kapsam', sir: false,
      aciklama: 'Hangi site ya da cihaz grubunun envanteri okunacak.' },
  ];
}

export const edrAdaptoru = new EdrAdaptoru();

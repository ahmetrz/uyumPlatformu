import 'server-only';
import { BaglanmamisAdaptor } from '../sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   Ağ / güvenlik duvarı — firewall · switch ARP-MAC tablosu · DHCP ·
   SNMP (salt okunur) — BAĞLI DEĞİL.

   ── PASSIVE-FIRST · BU ADAPTÖRÜN VAROLUŞ SEBEBİ ─────────────────────
   OT'de varlık keşfinin doğru yolu budur: cihazı SORGULAMAK yerine, ağ
   ekipmanının ZATEN TUTTUĞU tabloları okumak. Trafik cihazdan geçerken
   switch MAC öğrenir, router ARP tutar, DHCP kira verir, firewall oturum
   görür. Hiçbiri için OT cihazına tek bir paket göndermek gerekmez.

   KESİNLİKLE YASAK (kod bunları yapamaz):
     · kural/politika/ACL değişikliği (POST/PUT/DELETE hiçbir uçta)
     · konfigürasyon push, commit, arayüz açma/kapama
     · ping sweep, port taraması, SNMP walk ile cihaz UYANDIRMA
   SNMP yalnız salt okunur community/SNMPv3 authPriv ile ve YALNIZ ağ
   ekipmanına (switch/router/firewall) yapılır — PLC/RTU'ya SNMP sorgusu
   YAPILMAZ. İzinli hedefler `yapilandirma.izinliHedefler` ile sınırlanır.

   ── BAĞLARKEN NEREYE NE YAZILACAK ────────────────────────────────────
   Palo Alto PAN-OS (salt okunur yönetici, XML API):
     GET /api/?type=op&cmd=<show><arp><entry name='all'/></arp></show>
     GET /api/?type=op&cmd=<show><dhcp><server><lease/></server></dhcp></show>
     GET /api/?type=op&cmd=<show><mac><all/></mac></show>
   Fortinet FortiOS:
     GET /api/v2/monitor/network/arp
     GET /api/v2/monitor/system/dhcp
   Cisco IOS-XE RESTCONF (salt okunur):
     GET /restconf/data/Cisco-IOS-XE-arp-oper:arp-data
     GET /restconf/data/ietf-interfaces:interfaces-state
   SNMP (salt okunur OID'ler):
     ipNetToMediaPhysAddress  1.3.6.1.2.1.4.22.1.2   → ARP (IP ↔ MAC)
     dot1dTpFdbPort           1.3.6.1.2.1.17.4.3.1.2 → MAC ↔ port
     ifDescr / ifPhysAddress  1.3.6.1.2.1.2.2.1.2/6  → arayüz envanteri
   DHCP (Windows DHCP / ISC):
     Get-DhcpServerv4Lease  ·  /var/lib/dhcp/dhcpd.leases  (salt okunur)

   `fetchChanges` imleci: ARP/MAC tablosunun anlık görüntüsü olduğu için
   delta yoktur; imleç olarak tablonun içerik özeti (hash) kullanılır —
   tablo değişmediyse koşu atlanabilir.

   VarlikGozlemi eşlemesi:
     mac (normalize edilmiş)     → macAdresi   → koken.kaynakKayitId
                                    (`arp:${mac}`; MAC bu kaynakta EN KARARLI
                                     kimliktir, IP kirası değişir)
     ip                          → ipAdresi    (DHCP'de gezer — kesif.ts
                                                bunu TEK BAŞINA eşlemez)
     dhcp lease hostname / client-id → hostname
     MAC OUI ilk 3 oktet → üretici tablosu → uretici  (yalnız DESTEKLEYİCİ;
                                  uretici+model tek başına eşleme yapmaz)
     switch/VLAN/zone adı        → bolgeKodu
     firewall vsys / site        → tesisKodu
     ham tablo satırı            → ham

   TopolojiGozlemiGirdi eşlemesi (ağ topolojisi ajanının girdisi):
     ogeTipi 'dugum'   → switch/router/firewall'ın kendisi
     ogeTipi 'gecit'   → iki bölge arasındaki kural seti (conduit)
     ogeTipi 'baglanti'→ MAC'in görüldüğü port  (anahtar: `${cihaz}/${port}`)
     ozellikler        → { vlan, port, sonGorulme, kuralSayisi … }

   koken.guven: ARP/MAC tablosu cihazın gerçekten o segmentte trafik
   ürettiğini kanıtlar; ama MAC sanallaştırma/NIC teaming ile çakışabilir.
   Öneri: statik ARP + DHCP rezervasyonu birlikte → 0.8, yalnız dinamik
   ARP → 0.5, yalnız MAC tablosu → 0.4, bilgi yoksa null. */

export class AgGuvenlikDuvariAdaptoru extends BaglanmamisAdaptor {
  readonly tip = 'network_firewall';
  readonly gereken =
    'Ağ ekipmanında SALT OKUNUR yönetim hesabı ve API erişimi: Palo Alto ' +
    'için XML API anahtarı (env:FW_API_ANAHTARI) + salt okunur yönetici ' +
    'rolü; Fortinet için read-only REST API kullanıcısı ve trusted-host ' +
    'kaydı; Cisco için RESTCONF/NETCONF salt okunur kullanıcı ya da SNMPv3 ' +
    'authPriv (yalnız ağ ekipmanı OID\'leri). DHCP kira dosyası/servisi için ' +
    'salt okunur erişim. Ayrıca yönetim ağından hedeflere erişim izni ve ' +
    'okunacak cihaz/VLAN listesi. Yazma (kural/konfigürasyon) izni ' +
    'İSTENMEZ ve verilmemelidir.';
}

export const agGuvenlikDuvariAdaptoru = new AgGuvenlikDuvariAdaptoru();

import type { FiksturSeti } from '@/lib/entegrasyon/sertifika';
import { TANIMSIZ_TESIS_KODU, baglanmamisFikstur } from './ortak';

/* Ağ / güvenlik duvarı fikstürü — SENTETİK. Şekil bir ARP + DHCP kira
   tablosununkidir: cihazı SORGULAMADAN, ağ ekipmanının zaten tuttuğu
   kayıtları okumak.

   Gerçek cihaz adresi, gerçek community string ya da gerçek yönetim
   arayüzü BURADA YOKTUR. MAC adresleri belgeleme için ayrılmış
   00:1B:1B (sentetik) blokla yazılmıştır. */

export const agGuvenlikDuvariFiksturu: FiksturSeti = baglanmamisFikstur({
  tip: 'network_firewall',
  kaynakSistem: 'SERTIFIKA-SANDBOX · ARP/DHCP tablo okuması',
  yapilandirma: { izinliHedefler: ['kd3-otfw-01'], yazmaIzni: false },
  gecersizYapilandirma: { izinliHedefler: '*' },

  gecerli: {
    satirlar: [
      { mac: '00:1b:1b:aa:bb:01', ip: '10.60.10.11', interface: 'port3', vlan: 'KIZILDERE3-OT', tip: 'static', hostname: 'kd3-scada-01' },
      { mac: '00-1b-1b-aa-bb-02', ip: '10.60.10.12', interface: 'port3', vlan: 'KIZILDERE3-OT', tip: 'dynamic' },
    ],
    beklenen: [
      { tip: 'varlik', kaynakKayitId: 'arp:00:1B:1B:AA:BB:01', alanlar: { macAdresi: '00:1b:1b:aa:bb:01', ipAdresi: '10.60.10.11', hostname: 'kd3-scada-01', bolgeKodu: 'KIZILDERE3-OT' } },
      // Yazım biçimi farklı (tire) ama AYNI kanonik MAC: kimlik kararlı olmalı.
      { tip: 'varlik', kaynakKayitId: 'arp:00:1B:1B:AA:BB:02', alanlar: { macAdresi: '00-1b-1b-aa-bb-02', ipAdresi: '10.60.10.12' } },
    ],
  },

  bozuk: {
    satirlar: [
      // MAC yok: bu kaynakta MAC tek kararlı kimliktir, IP kirası gezer.
      { ip: '10.60.10.13', interface: 'port4', tip: 'dynamic' },
      { mac: 'ZZ:ZZ:ZZ:ZZ:ZZ:ZZ', ip: '10.60.10.14' },
    ],
    not: 'MAC yok ya da MAC değil — `arp:${mac}` kararlı kimliği üretilemez',
  },

  kismi: {
    /* Yalnız MAC tablosu satırı: IP eşlemesi yok. Hostname BİLİNMİYOR;
       "" yazmak cihazın adsız olduğunu iddia etmek olurdu. */
    satirlar: [{ mac: '00:1b:1b:cc:dd:03', interface: 'port7', vlan: 'KIZILDERE3-OT' }],
    bosAlanlar: ['hostname', 'ipAdresi', 'seriNo', 'model', 'isletimSistemi'],
  },

  yinelenen: {
    // Aynı MAC hem ARP hem DHCP kirasında görünür; cihaz TEKtir.
    satirlar: [
      { mac: '00:1b:1b:ee:ff:04', ip: '10.60.10.20', kaynak: 'arp' },
      { mac: '00:1B:1B:EE:FF:04', ip: '10.60.10.20', kaynak: 'dhcp', hostname: 'kd3-hmi-03' },
    ],
  },

  bilinmeyenAlan: {
    satirlar: [{ mac: '00:1b:1b:00:11:05', ip: '10.60.10.21', age_seconds: 120, ha_sync: true }],
    alanlar: ['age_seconds', 'ha_sync'],
  },

  eksikReferans: {
    satirlar: [{ mac: '00:1b:1b:00:11:06', ip: '10.99.9.9', vsys: TANIMSIZ_TESIS_KODU }],
    korunanAlan: 'tesisKodu',
    not: `vsys/site '${TANIMSIZ_TESIS_KODU}' platformda tanımsız — kayıt düşürülmez`,
  },
});

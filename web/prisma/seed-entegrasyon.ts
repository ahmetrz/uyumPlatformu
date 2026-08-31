/* Entegrasyon katmanı başlangıç verisi — connector TANIMLARI.

   Buradaki kayıtlar birer YAPILANDIRMA'dır, çalışan bir bağlantı değil.
   Hiçbirinin kimlik bilgisi yoktur: `sirReferansi` yalnız sırra giden
   adresi gösterir ve o adres bu kurulumda tanımlı değildir. Dolayısıyla
   senkronizasyon çekirdeği bunları koşturmaz, `kimlik_bekleniyor` ile
   kapatır ve sağlık ekranı bunu "başarılı" değil "bekliyor" gösterir.

   Sahte veri üretmiyoruz: bu tanımlar bir kurulumda gerçekten yapılacak
   işin şeklini gösterir — hangi tip, hangi kaynak sistem, hangi kimlik
   yöntemi, hangi sır adresi, hangi periyot. Gerçek bağlantı için gereken
   şeyler her kaydın `yapilandirmaJson` alanında açıkça yazılıdır. */

import type { PrismaClient } from '../lib/prisma-client/client';

type Tanim = {
  kod: string;
  ad: string;
  tip: string;
  kaynakSistem: string;
  kimlikTipi: string;
  sirReferansi: string | null;
  pollAralikDk: number | null;
  yapilandirma: Record<string, unknown>;
};

const CONNECTORLAR: Tanim[] = [
  {
    kod: 'AD-01',
    ad: 'Zorlu Entra ID',
    tip: 'ad_entra',
    kaynakSistem: 'Entra ID',
    kimlikTipi: 'oauth2_client_credentials',
    sirReferansi: 'env:ENTRA_ISTEMCI_SIRRI',
    pollAralikDk: 360,
    yapilandirma: {
      kiraci: '<<KURULUMDA-DOLDURULACAK>>  ör. <kiraci>.onmicrosoft.com',
      tabanUrl: 'https://graph.microsoft.com/v1.0',
      kapsam: ['users', 'servicePrincipals', 'signInActivity'],
      gerekenIzin: 'Directory.Read.All + AuditLog.Read.All (uygulama izni)',
      not: 'Salt okunur. Hesap kapatma/açma platformdan YAPILMAZ.',
    },
  },
  {
    kod: 'EDR-01',
    ad: 'CrowdStrike Falcon',
    tip: 'edr',
    kaynakSistem: 'CrowdStrike Falcon',
    kimlikTipi: 'oauth2_client_credentials',
    sirReferansi: 'env:FALCON_ISTEMCI_SIRRI',
    pollAralikDk: 120,
    yapilandirma: {
      tabanUrl: 'https://api.eu-1.crowdstrike.com',
      kapsam: ['hosts', 'detections'],
      gerekenIzin: 'Hosts:read, Detections:read',
      not: 'Yalnız envanter ve tespit okuması. Uzaktan müdahale kullanılmaz.',
    },
  },
  {
    kod: 'VULN-01',
    ad: 'Tenable Nessus (elle dışa aktarım)',
    tip: 'vuln_scanner',
    kaynakSistem: 'Tenable Nessus',
    kimlikTipi: 'api_key',
    sirReferansi: 'env:NESSUS_API_ANAHTARI',
    pollAralikDk: null,
    yapilandirma: {
      tabanUrl: '<<KURULUMDA-DOLDURULACAK>>  ör. https://<nessus-sunucusu>:8834',
      not: 'OT segmentinde AKTİF TARAMA YAPILMAZ. Yalnız BT tarafındaki ' +
        'mevcut tarama sonuçları okunur; OT varlıkları için pasif kaynaklar kullanılır.',
      kapsamDisi: 'OT bölgeleri (Purdue 0-2)',
    },
  },
  {
    kod: 'OT-01',
    ad: 'OT pasif keşif — Kızıldere III',
    tip: 'ot_discovery',
    kaynakSistem: 'OT keşif ürünü',
    kimlikTipi: 'api_key',
    sirReferansi: 'env:OT_KESIF_API_ANAHTARI',
    pollAralikDk: 720,
    yapilandirma: {
      tesisKodu: 'KIZILDERE-3',
      yontem: 'pasif',
      kaynaklar: ['span_port', 'arp_tablosu', 'dhcp_kaydi', 'scada_envanter_disa_aktarim'],
      not: 'PASSIVE-FIRST. Aktif tarama, port taraması ve cihaz sorgulaması ' +
        'YASAKTIR — üretim kontrol sistemleri bunlara beklenmedik tepki verebilir.',
    },
  },
  {
    kod: 'BACKUP-01',
    ad: 'Yedekleme platformu',
    tip: 'backup',
    kaynakSistem: 'Veeam',
    kimlikTipi: 'api_key',
    sirReferansi: 'env:YEDEKLEME_API_ANAHTARI',
    pollAralikDk: 240,
    yapilandirma: {
      tabanUrl: '<<KURULUMDA-DOLDURULACAK>>  ör. https://<yedekleme-sunucusu>/api/v1',
      kapsam: ['jobs', 'sessions', 'restorePoints'],
      not: 'Yalnız koşu sonucu okunur. Yedek alma/geri yükleme platformdan TETİKLENMEZ.',
    },
  },
  {
    kod: 'FW-01',
    ad: 'OT güvenlik duvarı yapılandırması',
    tip: 'network_firewall',
    kaynakSistem: 'Fortinet FortiManager',
    kimlikTipi: 'api_key',
    sirReferansi: 'env:FORTIMANAGER_API_ANAHTARI',
    pollAralikDk: 1440,
    yapilandirma: {
      tabanUrl: '<<KURULUMDA-DOLDURULACAK>>  ör. https://<fortimanager>/jsonrpc',
      kapsam: ['policy', 'address', 'interface'],
      not: 'SALT OKUNUR. Kural yazma/değiştirme platformdan YAPILMAZ — ' +
        'topoloji sapması yalnız RAPORLANIR, düzeltme değişiklik sürecinden geçer.',
    },
  },
  {
    kod: 'IMP-01',
    ad: 'CMDB elle içe aktarım',
    tip: 'manual_import',
    kaynakSistem: 'dosya',
    kimlikTipi: 'none',
    sirReferansi: null,
    pollAralikDk: null,
    yapilandirma: {
      not: 'Dış sistem gerektirmez: CSV/XLSX dosyasından gözlem üretir. ' +
        'Bu, kimlik bilgisi olmadan uçtan uca çalışabilen tek connector tipidir.',
    },
  },
];

export async function entegrasyonVerisi(db: PrismaClient) {
  let eklenen = 0;
  for (const c of CONNECTORLAR) {
    const varOlan = await db.connector.findUnique({ where: { kod: c.kod } });
    if (varOlan) continue;
    await db.connector.create({
      data: {
        kod: c.kod, ad: c.ad, tip: c.tip,
        kaynakSistem: c.kaynakSistem, kimlikTipi: c.kimlikTipi,
        sirReferansi: c.sirReferansi,
        pollAralikDk: c.pollAralikDk,
        yapilandirmaJson: JSON.stringify(c.yapilandirma),
        /* Hiçbiri 'etkin' başlamaz. Kimlik bilgisi tanımlanana ve bağlantı
           testi geçene kadar bir connector'ı etkin işaretlemek, çalıştığı
           izlenimi verir — sağlık ekranı yeşil görünür ama veri akmaz. */
        durum: c.kimlikTipi === 'none' ? 'taslak' : 'kimlik_bekleniyor',
        etkin: false,
      },
    });
    eklenen++;
  }
  console.log(
    `Entegrasyon: ${eklenen} connector tanımı eklendi ` +
    `(hiçbiri etkin değil — kimlik bilgisi bekleniyor)`,
  );
}

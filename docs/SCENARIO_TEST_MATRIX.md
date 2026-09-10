# Senaryo · test matrisi

Üretilen belge — kaynağı `web/lib/senaryo/` ve `web/tests/`.

| Ölçü | Değer |
| --- | --- |
| Senaryo | 343 |
| Testi olan senaryo | 343 |
| **GAP** | **0** |
| Hayalet işaret (kütükte olmayan kimlik) | 0 |
| Kütüksüz test dosyası | 0 |
| Taranan test dosyası | 218 |

## Katman başına kapsam

| Katman | Senaryo | Testli | GAP |
| --- | --- | --- | --- |
| ACCESSIBILITY | 8 | 8 | 0 |
| API | 12 | 12 | 0 |
| CONCURRENCY | 7 | 7 | 0 |
| DOMAIN | 199 | 199 | 0 |
| ENGINE | 33 | 33 | 0 |
| INTEGRATION | 40 | 40 | 0 |
| MIGRATION | 5 | 5 | 0 |
| RBAC | 35 | 35 | 0 |
| RESPONSIVE | 8 | 8 | 0 |
| SCOPE | 30 | 30 | 0 |
| SERVER | 140 | 140 | 0 |
| UI | 98 | 98 | 0 |
| VISUAL | 4 | 4 | 0 |
| WORKFLOW | 36 | 36 | 0 |

## Satır satır

| Senaryo | Alan | Katman | Test dosyası | Test başlığı | Otomatik | Sonuç |
| --- | --- | --- | --- | --- | --- | --- |
| `ENV-LST-001` | Envanter | DOMAIN · SCOPE · UI | `envanter-mantik.test.ts` | santral kapsamı dışındaki varlık süzülür | evet | geçti |
| `ENV-LST-002` | Envanter | DOMAIN · UI | `senaryo-envanter.test.ts` | kapsamda hiç varlık yokken sayaçlar SIFIR ölçümdür, uydurma değil | evet | geçti |
| `ENV-LST-003` | Envanter | DOMAIN · UI | `senaryo-envanter.test.ts` | sonuç vermeyen mercek BOŞ küme döndürür — sessizce hepsini göstermez | evet | geçti |
| `ENV-LST-004` | Envanter | DOMAIN · UI | `envanter-mantik.test.ts` | kritik işaretli satırlar bütçeden bağımsız görünür kalır | evet | geçti |
| `ENV-LST-005` | Envanter | DOMAIN · UI | `envanter-mantik.test.ts` | EOS tarihi girilmemiş varlık "ömrü bitmedi" değildir: unk, ok DEĞİL | evet | geçti |
| `ENV-YAZ-001` | Envanter | SERVER · RBAC · DOMAIN | `envanter-eylem.test.ts` | varlık KENDİ etiketiyle güncellenebilir | evet | geçti |
| `ENV-YAZ-002` | Envanter | SERVER · RBAC | `envanter-eylem.test.ts` | okuyucu rolü varlık yazamaz | evet | geçti |
| `ENV-YAZ-003` | Envanter | SERVER · SCOPE | `envanter-eylem.test.ts` | tesise kısıtlı rol BAŞKA tesise varlık yazamaz | evet | geçti |
| `ENV-YAZ-004` | Envanter | SERVER · RBAC · WORKFLOW | `envanter-eylem.test.ts` | İMHA yazma yetkisiyle YAPILAMAZ — onay yetkisi ister | evet | geçti |
| `ENV-DIS-001` | Envanter | DOMAIN · UI | `senaryo-envanter.test.ts` | dosya EKRANDA GÖRÜNEN süzülmüş kümeyi taşır | evet | geçti |
| `ENV-DIS-002` | Envanter | DOMAIN | `disa-aktarim-csv.test.ts` | Türkçe karakterler bozulmadan geçer | evet | geçti |
| `ENV-DIS-003` | Envanter | DOMAIN | `disa-aktarim-csv.test.ts` | dört tehlikeli başlangıcın hepsini yakalar | evet | geçti |
| `ENV-DIS-004` | Envanter | DOMAIN · SCOPE | `senaryo-envanter.test.ts` | dosya kapsam dışı hiçbir satır taşımaz | evet | geçti |
| `ENV-DIS-005` | Envanter | DOMAIN | `disa-aktarim-csv.test.ts` | 10.000 satırı üretir ve satır sayısı korunur | evet | geçti |
| `ZIM-ACT-001` | Zimmet | SERVER · WORKFLOW · DOMAIN | `zimmet-eylem.test.ts` | talep açılır ama varlığın sahibi aynı kalır | evet | geçti |
| `ZIM-ACT-002` | Zimmet | SERVER · WORKFLOW · CONCURRENCY | `zimmet-eylem.test.ts` | kısıt VERİTABANINDA durur — eşzamanlı iki yazma tek talep bırakır | evet | geçti |
| `ZIM-CVP-001` | Zimmet | SERVER · WORKFLOW · DOMAIN | `zimmet-eylem.test.ts` | zimmetlenen kişi kabul edince sahiplik geçer | evet | geçti |
| `ZIM-CVP-002` | Zimmet | SERVER · WORKFLOW · UI | `zimmet-eylem.test.ts` | gerekçeli redde sahiplik önceki sahibine DÖNER | evet | geçti |
| `ZIM-CVP-003` | Zimmet | SERVER · WORKFLOW · DOMAIN | `zimmet-eylem.test.ts` | önceki sahip yoksa red SAHİPSİZ bırakır ve bulgu açar | evet | geçti |
| `ZIM-CVP-004` | Zimmet | SERVER · RBAC · WORKFLOW | `zimmet-eylem.test.ts` | yönetici bile başkası adına kabul edemez | evet | geçti |
| `ZIM-CVP-005` | Zimmet | SERVER · WORKFLOW | `zimmet-eylem.test.ts` | atayan iptal edebilir ve sahiplik değişmez | evet | geçti |
| `ZIM-SUR-001` | Zimmet | ENGINE · WORKFLOW | `zimmet-eylem.test.ts` | süresi geçen talep düşer ama sahiplik DEĞİŞMEZ | evet | geçti |
| `ZIM-SUR-002` | Zimmet | ENGINE · WORKFLOW | `zimmet-eylem.test.ts` | atanan pasifleşirse bekleyen talep düşer | evet | geçti |
| `DUR-TAZ-001` | Canlı duruş | DOMAIN · UI | `canli-durus.test.ts` | canlı eşiği tam sınırda hâlâ canlıdır | evet | geçti |
| `DUR-TAZ-002` | Canlı duruş | DOMAIN · UI | `canli-durus.test.ts` | veri saniyeler önce gelse bile bağlı olmayan kaynak canlı sayılmaz | evet | geçti |
| `DUR-TAZ-003` | Canlı duruş | DOMAIN | `canli-durus.test.ts` | poll aralığı olmayan kaynak ne kadar yeni olursa olsun canlı değildir | evet | geçti |
| `DUR-TAZ-004` | Canlı duruş | DOMAIN · UI | `canli-durus.test.ts` | kaynak hatalıysa tazelik değil HATA raporlanır | evet | geçti |
| `DUR-CAK-001` | Canlı duruş | DOMAIN · UI | `canli-durus.test.ts` | en YENİ ölçüm kazanır — kaynak önceliği bunu bozamaz | evet | geçti |
| `DUR-CAK-002` | Canlı duruş | DOMAIN · UI | `senaryo-envanter.test.ts` | iki değer farklıysa ÇELİŞKİ işaretlenir | evet | geçti |
| `DUR-API-001` | Canlı duruş | API · INTEGRATION | `api.test.ts` | gözlem yazılır ama Varlik satırına DOKUNULMAZ | evet | geçti |
| `DUR-API-002` | Canlı duruş | API · INTEGRATION | `api.test.ts` | GEÇ GELEN paket yazılmaz ve cevapta `stale` olarak SAYILIR | evet | geçti |
| `DUR-API-003` | Canlı duruş | API · SCOPE | `api.test.ts` | KAPSAM DIŞI santralin varlığına duruş yazılamaz | evet | geçti |
| `KES-GRP-001` | Pasif keşif | DOMAIN · UI | `pasif-kesif.test.ts` | envanterde karşılığı olmayan cihaz ayrı gruptur | evet | geçti |
| `KES-GRP-002` | Pasif keşif | DOMAIN · UI | `pasif-kesif.test.ts` | envanterde var ama SAHİBİ YOK ayrı bir gruptur | evet | geçti |
| `KES-GRP-003` | Pasif keşif | DOMAIN | `pasif-kesif.test.ts` | kimlik çakışması diğer bütün tariflerin ÖNÜNE geçer | evet | geçti |
| `KES-GRP-004` | Pasif keşif | DOMAIN | `pasif-kesif.test.ts` | eşik konsoldan gelir — 30 gün koda gömülü değildir | evet | geçti |
| `KES-GRP-005` | Pasif keşif | DOMAIN · SCOPE | `pasif-kesif.test.ts` | santrali çözülemeyen kayıt gizlenmez, kendi grubuna düşer | evet | geçti |
| `KES-ESL-001` | Pasif keşif | DOMAIN | `pasif-kesif.test.ts` | IP ve üretici+model TEK BAŞINA eşleşme kuramaz | evet | geçti |
| `KES-ONY-001` | Pasif keşif | DOMAIN · WORKFLOW | `pasif-kesif.test.ts` | öneri ile envanter arasında İNSAN ONAYI vardır | evet | geçti |
| `KES-ONY-002` | Pasif keşif | SERVER · RBAC | `kesif-karar.test.ts` | YAZMA yetkisi karar vermeye yetmez | evet | geçti |
| `KES-YSK-001` | Pasif keşif | DOMAIN · UI | `pasif-kesif.test.ts` | port taraması, SNMP denemesi, OT protokol sorgusu ve PLC yoklaması listede | evet | geçti |
| `KES-YSK-002` | Pasif keşif | DOMAIN · INTEGRATION | `adaptor-yetenekleri.test.ts` | hiçbir adaptör aktif tarama yeteneği beyan EDEMEZ — kütükte yoktur | evet | geçti |
| `ENV-KML-001` | Envanter | DOMAIN · UI | `kimlik-envanteri.test.ts` | kurulu yazılım yoksa alan ÖLÇÜLMEDİ olur, "yok" değil | evet | geçti |
| `ENV-KML-002` | Envanter | SERVER · DOMAIN | `varlik-durusu-eylem.test.ts` | gerekçesiz uygulanamazlık reddedilir | evet | geçti |
| `ENV-YAS-001` | Envanter | DOMAIN · SERVER | `varlik-sbom-kapsam-ag.test.ts` | SÜRÜM UYDURULMAZ — yoksa null geçer | evet | geçti |
| `ENV-FRM-001` | Envanter | DOMAIN | `varlik-durus.test.ts` | TABAN YOKSA uyumlu SAYILMAZ | evet | geçti |
| `ENV-ZAF-001` | Envanter | ENGINE · DOMAIN | `varlik-durusu-motor.test.ts` | SBOM’u olmayan cihaz bileşen zafiyetinden etkilenmiş SAYILMAZ | evet | geçti |
| `ENV-AG-001` | Envanter | SERVER · DOMAIN | `varlik-durusu-eylem.test.ts` | geçersiz CIDR REDDEDİLİR | evet | geçti |
| `TOP-SAP-001` | Topoloji | ENGINE · DOMAIN | `topoloji-sapma.test.ts` | temel yokken sapma HESAPLANMAZ — ilk anlık kendiliğinden temel olmaz | evet | geçti |
| `TOP-SAP-002` | Topoloji | SERVER · RBAC · UI | `topoloji-tezgah.test.ts` | envanter/onay yetkisi olmayan kullanıcı karar VEREMEZ | evet | geçti |
| `TAB-KNF-001` | Konfigürasyon tabanı | ENGINE · DOMAIN | `konfig-yedek.test.ts` | hiç kayıt yokken sonuç "bilinmiyor" — "yok" DEĞİL | evet | geçti |
| `YED-POL-001` | Yedekleme | SERVER · DOMAIN | `operasyon-yedekleme-sertifika.test.ts` | restore testi KANITTIR: koşuya bağlanır ve iz bırakır | evet | geçti |
| `YED-POL-002` | Yedekleme | SERVER | `operasyon-yedekleme-sertifika.test.ts` | boş ad ve negatif saklama süresi reddedilir | evet | geçti |
| `SAY-KMP-001` | Sayım | SERVER · DOMAIN | `faz-g-varlik.test.ts` | boş kapsamda sayım açılmaz — sıfır paydalı kampanya olamaz | evet | geçti |
| `SAY-KMP-002` | Sayım | SERVER · WORKFLOW | `faz-g-eylem.test.ts` | "bulunamadı" varlığı SİLMEZ — envanterden düşürme ayrı bir karardır | evet | geçti |
| `MED-KRT-001` | Taşınabilir medya | SERVER · WORKFLOW | `faz-g-eylem.test.ts` | ZARARLI bulunan medya kendiliğinden KARANTİNAYA alınır | evet | geçti |
| `YDP-STK-001` | Yedek parça | SERVER · DOMAIN | `faz-g-eylem.test.ts` | ölçülmemiş tedarik süresi BOŞ kalır; sıfır reddedilir | evet | geçti |
| `OMR-EOL-001` | Ömür | DOMAIN | `envanter-mantik.test.ts` | ömür mercekleri bilinmeyen tarihi ne "bitti" ne "yakın" sayar | evet | geçti |
| `OLY-ETK-001` | Olay | ENGINE · DOMAIN | `olay-etki.test.ts` | kopuk zincir (sistemin süreci yok) BİLİNMİYOR der, YOK demez | evet | geçti |
| `OLY-ETK-002` | Olay | SERVER · SCOPE | `olay-konfigyedek-eylem.test.ts` | olay BAŞKA SANTRALE taşınırken hedefte de yetki aranır | evet | geçti |
| `KES-KYT-001` | Pasif keşif | SERVER · WORKFLOW | `kesif-karar.test.ts` | birden çok kaydı tek gerekçeyle kapatır ve izi TOPLU diye işaretler | evet | geçti |
| `KES-KYT-002` | Pasif keşif | SERVER · INTEGRATION | `ot40-toplama.test.ts` | bulut metadata adresi HER KOŞULDA reddedilir | evet | geçti |
| `ZIM-SUR-003` | Zimmet | ENGINE · WORKFLOW | `zimmet-eylem.test.ts` | süre daralınca BİR KEZ uyarır — ikinci koşuda tekrar etmez | evet | geçti |
| `ENV-ETK-001` | Envanter | DOMAIN | `faz-b-alan.test.ts` | hiçbir kaynak bilinmiyorsa sonuç BİLİNMİYOR — "yok" değil | evet | geçti |
| `ENV-SUR-001` | Envanter | DOMAIN · UI | `faz-b-ekran.test.ts` | değerlendirilmemiş bağ TEK NOKTA sayılmaz ama ölçüm borcuna girer | evet | geçti |
| `KES-ESL-002` | Pasif keşif | DOMAIN | `kesif.test.ts` | seri numarasıyla eşleşir ve en yüksek güveni alır | evet | geçti |
| `ZIM-KAP-001` | Zimmet | DOMAIN · WORKFLOW | `zimmet.test.ts` | kapanmış talep yeniden cevaplanamaz | evet | geçti |
| `ENV-YRS-001` | Envanter | SERVER · CONCURRENCY | `yaris-kosullari.test.ts` | aynı geçişi aynı anda deneyen iki onaylayandan yalnız biri yazar; izde TEK satır olur | evet | geçti |
| `UYU-CRC-001` | Uyum | DOMAIN · UI | `uyum-grubu-mantik.test.ts` | bilinmeyeni kalan kampanya kısmi, hepsi uyumlu olan tamdır | evet | geçti |
| `UYU-CRC-002` | Uyum | DOMAIN · UI | `uyum-grubu-mantik.test.ts` | hiç değerlendirme yoksa yüzde null olur, %0 uydurulmaz | evet | geçti |
| `UYU-CRC-003` | Uyum | DOMAIN · UI | `senaryo-uyum.test.ts` | bir ailenin durumu EN KÖTÜ yaprağından gelir | evet | geçti |
| `UYU-UYG-001` | Uyum | DOMAIN · ENGINE | `uygulanabilirlik.test.ts` | küçük santral, koşulsuz → kapsam dışı | evet | geçti |
| `UYU-UYG-002` | Uyum | DOMAIN · ENGINE | `uygulanabilirlik.test.ts` | profil eksikse karar VERİLMEZ (bilinmiyor ≠ hayır) | evet | geçti |
| `UYU-OLC-001` | Uyum | SERVER · RBAC · WORKFLOW | `faz-g-eylem.test.ts` | ölçümü KALDIRMAK serbesttir ve iz düşer | evet | geçti |
| `UYU-OLC-002` | Uyum | SERVER · SCOPE | `surec-kapsam-eylem.test.ts` | BAŞKA santrali kapsamdan çıkaramaz | evet | geçti |
| `UYU-SHP-001` | Uyum | SERVER · DOMAIN | `faz-d-uyum.test.ts` | kişi + aktif ekip → sağlam | evet | geçti |
| `BUL-LST-001` | Bulgu | DOMAIN · UI | `senaryo-uyum.test.ts` | son tarihi geçen açık bulgu GECİKMİŞTİR ve gün sayısı ölçülür | evet | geçti |
| `BUL-LST-002` | Bulgu | DOMAIN · UI | `senaryo-uyum.test.ts` | hedefi girilmemiş bulgu "gecikmedi" SAYILMAZ — ölçülemez | evet | geçti |
| `BUL-DTY-001` | Bulgu | DOMAIN · UI | `senaryo-uyum.test.ts` | bulgu detayında açık aksiyon işaretçiyi belirler | evet | geçti |
| `BUL-DTY-002` | Bulgu | SCOPE · UI | `kapsam-ekranlari.test.ts` | detay kapsam dışı bulguyu AÇMIYOR | evet | geçti |
| `BUL-KAP-001` | Bulgu | SERVER · WORKFLOW | `capa-dogrulama.test.ts` | tamamlanmış ama doğrulanmamış aksiyon varken kapanış reddedilir; aşama yerinde kalır | evet | geçti |
| `BUL-KAP-002` | Bulgu | ENGINE · WORKFLOW | `faz-e-uyum.test.ts` | aynı kontrolde pencere içinde kapanmış bulgu → TEKRAR | evet | geçti |
| `RSK-LST-001` | Risk | DOMAIN · UI | `risk-eylem.test.ts` | skor = olasılık × EN YÜKSEK bilinen etki | evet | geçti |
| `RSK-LST-002` | Risk | DOMAIN | `risk-eylem.test.ts` | hiçbir boyut ölçülmemişse skor null kalır | evet | geçti |
| `RSK-DTY-001` | Risk | SERVER · DOMAIN | `risk-eylem.test.ts` | tesise kısıtlı rol KENDİ tesisinin riskini yazabilir | evet | geçti |
| `DEN-LST-001` | Denetim | DOMAIN · UI | `denetim-asama-kanit.test.ts` | SIRA ZORUNLU: her ilerletme yalnız bir sonraki aşamaya gider | evet | geçti |
| `DEN-ASM-001` | Denetim | SERVER · WORKFLOW | `denetim-asama-kanit.test.ts` | AÇIK KANIT TALEBİYLE kapanmaz ve aşama GERİ ALINIR | evet | geçti |
| `DEN-ASM-002` | Denetim | SERVER · SCOPE | `denetim-kapsam.test.ts` | kapanmış denetimin kapsamı GENİŞLETİLEMEZ | evet | geçti |
| `KNT-LST-001` | Kanıt | DOMAIN · ENGINE | `kanitlar-mantik.test.ts` | 180 günden yaşlı kanıt süresi dolmuş · bd | evet | geçti |
| `KNT-YUK-001` | Kanıt | SERVER · RBAC | `faz-d-eylem.test.ts` | geçerli kanıt açılır ve ize düşer | evet | geçti |
| `KNT-YUK-002` | Kanıt | SCOPE · DOMAIN | `kanit-kapsam.test.ts` | tesise kısıtlı rol BAŞKA santralin maddesine kanıt EKLEYEMEZ | evet | geçti |
| `KNT-SHP-001` | Kanıt | ENGINE · DOMAIN | `senaryo-uyum.test.ts` | sahibi de yükleyeni de olmayan kanıt SORUMSUZDUR | evet | geçti |
| `KNT-PKT-001` | Kanıt | SERVER · DOMAIN | `disa-aktarim-paketi.test.ts` | yetkili kapsam üretilir ve denetim izine yazılır | evet | geçti |
| `KNT-PKT-002` | Kanıt | DOMAIN · INTEGRATION | `senaryo-uyum.test.ts` | imza altyapısı bağlı değilken paket İMZALI görünmez | evet | geçti |
| `OLY-BIL-001` | Olay | SERVER · DOMAIN · UI · WORKFLOW | `bildirim-kaydi-eylem.test.ts` | uyan HER yükümlülük için ayrı taslak açılır | evet | geçti |
| `OLY-BIL-001` | Olay | SERVER · DOMAIN · UI · WORKFLOW | `bildirim-kaydi-eylem.test.ts` | İKİNCİ koşuda ikinci taslak AÇILMAZ — idempotent | evet | geçti |
| `OLY-BIL-001` | Olay | SERVER · DOMAIN · UI · WORKFLOW | `bildirim-kaydi.test.ts` | uyanların HEPSİ döner — en kısa süreli seçilmez | evet | geçti |
| `OLY-BIL-002` | Olay | SERVER · DOMAIN · UI | `bildirim-kaydi-eylem.test.ts` | SÜRESİZ yükümlülüğün kaydında son tarih YOKTUR | evet | geçti |
| `OLY-BIL-002` | Olay | SERVER · DOMAIN · UI | `bildirim-kaydi-eylem.test.ts` | süresi geçen SÜRELİ kayıt suresi_gecti olur; SÜRESİZ olan OLMAZ | evet | geçti |
| `OLY-BIL-003` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-kaydi-eylem.test.ts` | motor HİÇBİR kayda gonderildi yazmadı | evet | geçti |
| `OLY-BIL-003` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-kaydi-eylem.test.ts` | MOTOR gönderilmiş kaydı suresi_gecti yapamaz | evet | geçti |
| `OLY-BIL-004` | Olay | SERVER · DOMAIN · UI | `bildirim-kaydi-eylem.test.ts` | REFERANSSIZ gönderim REDDEDİLİR ve kayıt DEĞİŞMEZ | evet | geçti |
| `OLY-BIL-004` | Olay | SERVER · DOMAIN · UI | `bildirim-kaydi-eylem.test.ts` | gönderim DENETİM İZİNE düşer ve izde referans numarası vardır | evet | geçti |
| `OLY-BIL-004` | Olay | SERVER · DOMAIN · UI | `bildirim-kaydi.test.ts` | REFERANSSIZ gönderim REDDEDİLİR | evet | geçti |
| `OLY-BIL-005` | Olay | SERVER · DOMAIN · UI | `disa-aktarim-paketi.test.ts` | kapsamdaki olayın bildirim kayıtları pakete girer | evet | geçti |
| `OLY-BIL-006` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-donemi-zincir.test.ts` | takvim tetikli her yükümlülük için içinde bulunulan dönem açılır | evet | geçti |
| `OLY-BIL-006` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-donemi-zincir.test.ts` | PERİYODU BELİRSİZ yükümlülükte dönem AÇILMAZ ve bu sayılır | evet | geçti |
| `OLY-BIL-006` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-donemi-zincir.test.ts` | motor HİÇBİR döneme verildi/teyit/uygulanmaz yazmadı | evet | geçti |
| `OLY-BIL-006` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-donemi.test.ts` | motorun yazabildiği küme İKİ durumdur | evet | geçti |
| `OLY-BIL-006` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-donemi.test.ts` | dönem BOŞSA pencere açılmaz ve ekran mevzuatın hâlini söyler | evet | geçti |
| `OLY-BIL-006` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-donemi.test.ts` | ÜÇ periyot da çapa günü 01 DEĞİLKEN şimdiyi kapsar | evet | geçti |
| `OLY-BIL-006` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-donemi.test.ts` | SABOTAJ VAKASI: çeyreklikte bir YIL geri sarma pencereyi kaçırır | evet | geçti |
| `OLY-BIL-006` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-donemi.test.ts` | aylık dal da aynı değişmezi tutar | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | açık dönem etiketi, durumu ve geri sayımıyla durur | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | DÖNEMSİZ yükümlülük listeden DÜŞMEZ — kendi grubunda durur | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | dönemsiz satırda SAYAÇ YOK — sıfır da değil | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | teslim süresi olmayan DÖNEM açılır ama sayaç işlemez | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | periyodu VAR ama dönemi açılmamış yükümlülük "motor işlemedi" der | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | süresi geçmiş dönem, motor henüz yazmamışken de GEÇMİŞ görünür | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | KAPALI dönemde süre geçse bile durum DEĞİŞMEZ | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | sıralama: en yakın son tarih üstte, sayaçsızlar altta | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | dönemsiz yükümlülük açık döneme EKLENMEZ | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | teslim süresi olmayan dönem "teslimsiz" sayılır | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | varsayılan mercek kapanmış dönemi gizler, BİLİNMEYENİ GİZLEMEZ | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | "sayacı olmayan" merceği ürünün BİLMEDİKLERİNİ toplar | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | "süresi geçti" merceği yalnız gecikmişleri verir | evet | geçti |
| `OLY-BIL-007` | Olay | SERVER · DOMAIN · UI | `takvim-ekrani.test.ts` | "tümü" hiçbir satırı düşürmez | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | referans boşken istek reddedilir ve dönem DEĞİŞMEZ | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | referans verilince geçer ve iz REFERANSI taşır | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | SÜRESİ GEÇMİŞ dönem verilebilir; gecikme ize ADIYLA yazılır | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | olmayan kanıt bağlanamaz — dönem AÇIK kalır | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | teyit VERİLMEMİŞ döneme işlenemez | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | verilmiş dönem teyit alır | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | uygulanmaz GEREKÇESİZ kapatılamaz | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | uygulanmaz dönem SİLİNMEZ, gerekçesiyle durur | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | KAPANMIŞ dönem yeniden kapatılamaz | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | TESİSE KISITLI rol kurumsal takvim yükümlülüğüne DOKUNAMAZ | evet | geçti |
| `OLY-BIL-008` | Olay | SERVER · DOMAIN · UI | `bildirim-donemi-eylem.test.ts` | EŞZAMANLI iki karar: biri geçer, öbürü SESSİZCE EZİLMEZ | evet | geçti |
| `OLY-BIL-009` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-tetikleyici-ayrimi.test.ts` | TAKVİM tetikli kural olaya UYMAZ | evet | geçti |
| `OLY-BIL-009` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-tetikleyici-ayrimi.test.ts` | TEKİL seçici de takvim kuralını almaz | evet | geçti |
| `OLY-BIL-009` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-tetikleyici-ayrimi.test.ts` | TANIMADIĞI tetikleyici de UYMAZ — yüklem olumlu | evet | geçti |
| `OLY-BIL-009` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-tetikleyici-ayrimi.test.ts` | açık olaya YALNIZ olay tetikli kural için kayıt açılır | evet | geçti |
| `OLY-BIL-009` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-tetikleyici-ayrimi.test.ts` | TAKVİM yükümlülüğünün HİÇBİR olay kaydı yok | evet | geçti |
| `OLY-BIL-009` | Olay | SERVER · DOMAIN · WORKFLOW | `bildirim-tetikleyici-ayrimi.test.ts` | ikinci koşu da açmıyor — tekrar da sızdırmaz | evet | geçti |
| `DNT-FRM-001` | Denetim | SERVER · DOMAIN · UI | `denetim-formu-eylem.test.ts` | öz denetim formu üretilir; BOŞ HÜCRE SIFIR | evet | geçti |
| `DNT-FRM-001` | Denetim | SERVER · DOMAIN · UI | `denetim-formu-eylem.test.ts` | SoA da aynı kapıdan geçer ve yedi sütun taşır | evet | geçti |
| `DNT-FRM-002` | Denetim | UI · DOMAIN | `denetim-formu.test.ts` | GEREKÇESİZ kapsam dışı İŞARETLENİR — gerekçe uydurulmaz | evet | geçti |
| `DNT-FRM-002` | Denetim | UI · DOMAIN | `denetim-formu.test.ts` | kapsam dışı ama `not` BOŞSA gerekçe üretilmez — kusur işaretlenir | evet | geçti |
| `DNT-FRM-003` | Denetim | SERVER · DOMAIN | `denetim-formu-eylem.test.ts` | KAPSAM DIŞI istek REDDEDİLİR — sessizce daraltılmaz | evet | geçti |
| `DNT-FRM-003` | Denetim | SERVER · DOMAIN | `denetim-formu-eylem.test.ts` | DENETİM MODÜLÜNDE yetkisi olmayan form üretemez | evet | geçti |
| `PRJ-LST-001` | Proje | DOMAIN · UI | `proje-bagimliligi.test.ts` | gecikmiş engel AYRI sayılır ve engellerin alt kümesidir | evet | geçti |
| `PRJ-BAG-001` | Proje | SERVER · DOMAIN | `proje-bagimliligi.test.ts` | İPTAL edilmiş önkoşul da engeldir — dayanılan iş artık yapılmayacak | evet | geçti |
| `GZD-DON-001` | Gözden geçirme | DOMAIN · ENGINE | `senaryo-uyum.test.ts` | kararı olmayan toplantı "yapıldı" işaretlenemez | evet | geçti |
| `SAK-SUR-001` | Saklama | DOMAIN · UI | `faz-f-saklama-denetci.test.ts` | politika yoksa TANIMSIZ — süresiz değil | evet | geçti |
| `DNE-ERS-001` | Dış denetçi | SERVER · RBAC | `senaryo-uyum.test.ts` | süresiz erişim AÇILAMAZ | evet | geçti |
| `DNE-ERS-002` | Dış denetçi | SERVER · RBAC | `erisim.test.ts` | dış denetçi yalnız denetim ve uyum okur | evet | geçti |
| `DOK-SUR-001` | Doküman | DOMAIN · UI | `dokuman-eylem.test.ts` | yürürlüğe alma tarihi, onaylayanı ve gözden geçirme takvimini kurar | evet | geçti |
| `DOK-SUR-002` | Doküman | DOMAIN · INTEGRATION | `senaryo-uyum.test.ts` | yürürlükte belgesi olmayan kontrol KARŞILANMIŞ sayılmaz | evet | geçti |
| `EGT-KAT-001` | Eğitim | DOMAIN · UI | `senaryo-uyum.test.ts` | kaydı olmayan kişi "katılmadı" DEĞİL, "kaydı yok"tur | evet | geçti |
| `MEV-KYN-001` | Mevzuat | DOMAIN · INTEGRATION | `senaryo-uyum.test.ts` | adresi girilmemiş kaynak "gecikti" DEĞİL, "adressiz"dir | evet | geçti |
| `UYU-SUR-001` | Uyum | SERVER · WORKFLOW · CONCURRENCY | `surum.test.ts` | yeni sürüm eski değerlendirmeleri SİLMEZ; diff oluşur; yeni değerlendirme ihtiyacı açılır | evet | geçti |
| `UYU-IST-001` | Uyum | SERVER · DOMAIN | `istisna-eylem.test.ts` | on karakterden kısa gerekçe reddedilir | evet | geçti |
| `UYU-IST-002` | Uyum | SERVER · WORKFLOW | `istisna.test.ts` | onaylı istisna maddeyi kapsam dışına alır; süre dolunca yeniden değerlendirme açılır | evet | geçti |
| `UYU-TRN-001` | Uyum | DOMAIN · SCOPE | `uyum-trend.test.ts` | aynı gün süreç geneli varsa santral kayıtları SAYILMAZ; yoksa toplanır | evet | geçti |
| `UYU-BLG-001` | Uyum | DOMAIN · SCOPE | `uyum-belge-bagi.test.ts` | santrale bağlı belge ÖTEKİ santralin hücresine sızmaz | evet | geçti |
| `UYU-PRS-001` | Uyum | SERVER · SCOPE | `faz-b-eylem.test.ts` | süreç başka santrale kaçırılamaz: eski santralin kapsamı da sorulur | evet | geçti |
| `UYU-OLG-001` | Uyum | DOMAIN | `faz-g-uyum.test.ts` | ölçülmemiş olgunluk `olculmedi`; sıfır ölçülmüş bir sonuçtur | evet | geçti |
| `BUL-ANL-001` | Bulgu | SERVER · WORKFLOW | `faz-e-eylem.test.ts` | kısa analiz metni reddedilir — kategori seçmek analiz değildir | evet | geçti |
| `BUL-UYG-001` | Bulgu | ENGINE | `uygulanabilirlik-bulgu.test.ts` | tekrarlı koşu açık bulguyu ÇOĞALTMAZ | evet | geçti |
| `KNT-DEP-001` | Kanıt | SERVER · INTEGRATION | `faz-d-kanit-deposu.test.ts` | diskte DEĞİŞTİRİLMİŞ dosya sessizce sağlam dönmez | evet | geçti |
| `KNT-TAZ-001` | Kanıt | SERVER · RBAC | `kanit-tazelik-ayar.test.ts` | ayarKaydet B anahtarını reddeder | evet | geçti |
| `DEN-GRV-001` | Denetim | SERVER · RBAC | `gorev-eylem.test.ts` | BAŞKASININ görevini yazma yetkisi tek başına kapatamaz | evet | geçti |
| `DOK-KTK-001` | Doküman | SERVER · WORKFLOW | `dokuman-mantik.test.ts` | taslaktan doğrudan yürürlüğe atlanamaz — inceleme adımı onaylayanı kayda geçirir | evet | geçti |
| `DGA-AKT-001` | Değerlendirme aktarımı | SERVER · CONCURRENCY | `yaris-onay-aktarim.test.ts` | EŞZAMANLI iki karardan tam biri yazar | evet | geçti |
| `ESL-MTR-001` | Eşleştirme | DOMAIN · UI | `senaryo-uyum.test.ts` | karşılığı olmayan madde boş bırakılır, uydurulmaz | evet | geçti |
| `GZD-DON-002` | Gözden geçirme | DOMAIN | `senaryo-uyum.test.ts` | tarihi geçmiş plan "planlı" görünmez | evet | geçti |
| `DNE-ERS-003` | Dış denetçi | ENGINE · WORKFLOW | `faz-f-eylem.test.ts` | SÜRESİ DOLAN erişimin yetkileri de kapanır | evet | geçti |
| `MED-KRT-002` | Taşınabilir medya | SERVER · DOMAIN | `faz-g-eylem.test.ts` | şifreleme ÜÇ değerlidir; ölçülmemiş `null` kalır | evet | geçti |
| `ESL-MTR-002` | Eşleştirme | DOMAIN · UI | `senaryo-uyum.test.ts` | karşılığı olmayan madde boş bırakılır, uydurulmaz | evet | geçti |
| `OTR-GRS-001` | Oturum | SERVER · RBAC | `giris-guvenligi.test.ts` | başarılı giriş de kaynak adresle birlikte kaydedilir | evet | geçti |
| `OTR-GRS-002` | Oturum | SERVER · RBAC | `giris-guvenligi.test.ts` | istemciye dönen mesaj HER ret için AYNIDIR — hesap sayımı yapılamaz | evet | geçti |
| `OTR-GRS-003` | Oturum | SERVER · RBAC | `senaryo-platform.test.ts` | her yazma eylemi demo ikizinde REDDE düşer | evet | geçti |
| `OTR-OTR-001` | Oturum | SERVER · RBAC | `oturum-yasam-dongusu.test.ts` | MUTLAK süre dolmuşsa, az önce kullanılmış olsa bile düşer | evet | geçti |
| `YTK-LST-001` | Yetkiler | DOMAIN · UI | `kabuk-kapsami.test.ts` | tek santrale kısıtlı kullanıcı YALNIZ onu sayar | evet | geçti |
| `YTK-LST-002` | Yetkiler | SERVER · RBAC | `yonetim-konsolu-eylem.test.ts` | yönetim yetkisi olmayan yazar rol (bt_yoneticisi) de konsola yazamaz | evet | geçti |
| `YON-AYR-001` | Yönetim konsolu | SERVER · RBAC · DOMAIN | `yonetim-konsolu-eylem.test.ts` | A sınıfı ayar doğrudan yazılır, okuyucu görür, iz düşer | evet | geçti |
| `YON-AYR-002` | Yönetim konsolu | SERVER · DOMAIN | `yapilandirma.test.ts` | şema: tip ve sınır dışı değerler reddedilir | evet | geçti |
| `YON-AYR-003` | Yönetim konsolu | DOMAIN | `yapilandirma.test.ts` | şemayı geçmeyen kayıt varsayılana düşer ama gecersiz_kayit diye işaretlenir | evet | geçti |
| `YON-MOD-001` | Yönetim konsolu | DOMAIN · UI | `yapilandirma.test.ts` | modül kodları tek; kapsama özeti payda/pay tutarlı | evet | geçti |
| `YON-MOD-002` | Yönetim konsolu | DOMAIN | `yapilandirma.test.ts` | her ayar bir konsol modülüne bağlı; kütük–sözlük çapraz kontrolü boş döner | evet | geçti |
| `SAG-CON-001` | Sağlık | DOMAIN · UI | `entegrasyon-saglik.test.ts` | hiç koşmamış connector SAĞLIKLI görünmez; "hiç koşmadı" ayrı bir durumdur | evet | geçti |
| `SAG-CON-002` | Sağlık | DOMAIN · UI | `entegrasyon-saglik.test.ts` | kimlik referansı olmayan connector başarısız DEĞİL, kimlik bekleniyor sayılır | evet | geçti |
| `SAG-CON-003` | Sağlık | INTEGRATION · ENGINE | `entegrasyon-hata-modeli.test.ts` | SINIRA ULAŞINCA duraklatır | evet | geçti |
| `SAG-CON-004` | Sağlık | INTEGRATION | `entegrasyon-hata-modeli.test.ts` | tanınmayan hata GEÇİCİ sayılmaz — bilinmeyen kalır | evet | geçti |
| `SAG-CON-005` | Sağlık | INTEGRATION | `entegrasyon-hata-modeli.test.ts` | yetki hatası HTTP koduyla tanınır | evet | geçti |
| `SAG-CON-006` | Sağlık | INTEGRATION · CONCURRENCY | `entegrasyon-cekirdek.test.ts` | idempotent senkronizasyon: aynı kaynak kaydı ikinci koşuda YENİ satır açmaz | evet | geçti |
| `SAG-CON-007` | Sağlık | SERVER · RBAC | `saglik-connector.test.ts` | özet katmanının tamamında sır değeri geçmez; yalnız maskeli adres geçer | evet | geçti |
| `SAG-KUR-001` | Sağlık | INTEGRATION | `entegrasyon-kuru-kosu.test.ts` | KANIT: kuru koşu ilgili tabloların TEK BİR SATIRINI bile değiştirmez | evet | geçti |
| `SAG-RED-001` | Sağlık | DOMAIN · UI | `saglik-reddedilen.test.ts` | iki aşama ayrı yazılır ve ayrı açıklanır | evet | geçti |
| `SAG-MOT-001` | Sağlık | DOMAIN · ENGINE | `saglik-mantik.test.ts` | koşu kaydı olmayan motor bilinmeyendir | evet | geçti |
| `SAG-MOT-002` | Sağlık | DOMAIN · ENGINE | `saglik-mantik.test.ts` | elle koşan işler TAM OLARAK motor defteridir | evet | geçti |
| `API-KIM-001` | API | API · RBAC | `api.test.ts` | token yoksa 401 yetkisiz | evet | geçti |
| `API-KIM-002` | API | API · RBAC | `api.test.ts` | süresi dolmuş anahtar 401 | evet | geçti |
| `API-KIM-003` | API | API · RBAC | `api.test.ts` | veritabanında token AÇIK HÂLDE durmaz (yalnız SHA-256 özeti) | evet | geçti |
| `API-KPS-001` | API | API · RBAC | `faz-f-eylem.test.ts` | SALT OKUNUR anahtar yazma ucundan 403 alır ve hiçbir şey yazılmaz | evet | geçti |
| `API-KPS-002` | API | API · SCOPE | `api.test.ts` | okuma: yalnız kendi santralinin varlıkları döner | evet | geçti |
| `API-KPS-003` | API | API · DOMAIN | `faz-f-api-kapsam.test.ts` | UC_KIMLIKLERI ile bildirilen uçlar AYNI kümedir | evet | geçti |
| `API-DGR-001` | API | API | `api.test.ts` | köken alanı eksikse hangi alan olduğunu söyler | evet | geçti |
| `API-IDM-001` | API | API · CONCURRENCY | `entegrasyon-cekirdek.test.ts` | bayat "calisiyor" koşusu kapatılır; TAZE koşu ikinci koşuyu engeller | evet | geçti |
| `BLD-KTU-001` | Bildirim | DOMAIN · SCOPE | `bildirim-kutusu.test.ts` | kullanıcı KENDİ bildirimini okundu işaretleyebilir | evet | geçti |
| `BLD-KTU-002` | Bildirim | SERVER · SCOPE | `bildirim-kutusu.test.ts` | BAŞKASININ bildirimini okundu işaretleme denemesi REDDEDİLİR | evet | geçti |
| `RAP-KRN-001` | Rapor | DOMAIN · UI | `karne.test.ts` | ölçülmemiş uyum yüzdesi ORTALAMAYA katılmaz, ayrıca sayılır | evet | geçti |
| `RAP-KRN-001` | Rapor | DOMAIN · UI | `karne.test.ts` | açık bulgu ve risk kapsamdaki satırlardan toplanır | evet | geçti |
| `RAP-KRN-001` | Rapor | DOMAIN · UI | `karne.test.ts` | tek ölçüde kapasite toplanır ve ölçüsünü taşır | evet | geçti |
| `RAP-KRN-001` | Rapor | DOMAIN · UI | `karne.test.ts` | ölçülmemiş kayıt "en zayıf" listesine GİRMEZ | evet | geçti |
| `RAP-KRN-001` | Rapor | DOMAIN · UI | `karne.test.ts` | artan yüzde sırası; eşitlikte ada göre | evet | geçti |
| `RAP-KRN-001` | Rapor | DOMAIN · UI | `karne.test.ts` | en fazla beş kayıt döner | evet | geçti |
| `RAP-KRN-002` | Rapor | DOMAIN · UI | `karne.test.ts` | iki sektöre yayılan kapsamda TOPLAM ÜRETİLMEZ | evet | geçti |
| `RAP-KRN-002` | Rapor | DOMAIN · UI | `karne.test.ts` | ölçülmemiş kapasite sıfır sayılmaz — sayım ayrı raporlanır | evet | geçti |
| `RAP-KRN-002` | Rapor | DOMAIN · UI | `karne.test.ts` | mercek yokken bütün kayıtlar görünür | evet | geçti |
| `RAP-KRN-002` | Rapor | DOMAIN · UI | `karne.test.ts` | mercek varken YALNIZ o sektörün kayıtları kalır | evet | geçti |
| `RAP-URT-001` | Rapor | DOMAIN · UI | `senaryo-platform.test.ts` | kapsam dışı hücre "0 uyum" DEĞİL, kapsam dışıdır | evet | geçti |
| `RAP-URT-002` | Rapor | DOMAIN · SCOPE | `disa-aktarim-paketi.test.ts` | kapsam dışı tesis istenirse istek REDDEDİLİR, sessizce daraltılmaz | evet | geçti |
| `IMP-XLS-001` | İçe aktarım | SERVER · DOMAIN | `varlik-aktarim.test.ts` | etiket eşleşmesi güncelleme, eşleşmeyen yeni | evet | geçti |
| `IMP-XLS-002` | İçe aktarım | SERVER · DOMAIN | `varlik-aktarim.test.ts` | sözlük dışı değer ve okunamayan tarih satırı reddeder — uydurulmaz | evet | geçti |
| `ESL-PRF-001` | Eşleme | SERVER · DOMAIN | `esleme-tezgahi.test.ts` | ikinci yayın v2 açar, v1 arşive geçer ve v1 kuralları AYNEN kalır | evet | geçti |
| `ESL-PRF-002` | Eşleme | SERVER · DOMAIN | `esleme-tezgahi.test.ts` | önizleme profil, köken ya da red kaydı YAZMAZ | evet | geçti |
| `SIS-HTA-001` | Sistem | UI | `senaryo-platform.test.ts` | bulunamadı ve hata sayfaları vardır ve dönüş yolu sunar | evet | geçti |
| `SIS-KBK-001` | Sistem | UI · ACCESSIBILITY | `yardim.test.ts` | atla bağı kabuğun ilk çocuğu; tek kabukta TEK `#icerik` sarmalayıcısı var, kabuk main AÇMAZ | evet | geçti |
| `SIS-ERS-001` | Sistem | ACCESSIBILITY · UI | `yardim.test.ts` | dialog rolü, modal, başlık bağı ve odak tuzağı var | evet | geçti |
| `SIS-RSP-001` | Sistem | RESPONSIVE · UI | `senaryo-platform.test.ts` | yatay taşma kapısı ölçülen genişlikleri koda gömer | evet | geçti |
| `SIS-RSP-001` | Sistem | RESPONSIVE · UI | `senaryo-platform.test.ts` | düzen kapıları İKİ sektör sözlüğüyle koşabilir | evet | geçti |
| `SIS-RSP-001` | Sistem | RESPONSIVE · UI | `senaryo-platform.test.ts` | iki-sözlük kuralının istisnası BELGELİDİR | evet | geçti |
| `SIS-DIL-001` | Sistem | UI | `senaryo-platform.test.ts` | kullanıcıya dönük hiçbir metinde jargon geçmez | evet | geçti |
| `PRT-OZT-001` | Portföy | DOMAIN · UI | `senaryo-platform.test.ts` | ölçülmemiş uyum yüzdesi SIFIRA çekilmez | evet | geçti |
| `PRT-OZT-002` | Portföy | DOMAIN · UI | `tesis360-profil.test.ts` | profil kaydı yokken her alan tanımsızdır; gruplar tüm çekirdek alanları kapsar | evet | geçti |
| `PRT-OZT-003` | Portföy | DOMAIN · UI | `ekran-mantik-72.test.ts` | sözlükten işaretli satır sektörün sözcüğünü alır, ötekiler kendi adını | evet | geçti |
| `PRT-OZT-003` | Portföy | DOMAIN · UI | `ekran-mantik-72.test.ts` | hiçbir sıralama satırı sektör sözcüğünü SABİT taşımaz | evet | geçti |
| `HRT-KNM-001` | Harita | DOMAIN · UI | `harita-mantik.test.ts` | koordinatı olan yerleşir, ili olan YAKLAŞIK, ikisi de yoksa haritada YOK | evet | geçti |
| `YRD-SOR-001` | Yardım | DOMAIN · UI | `yardim.test.ts` | listedeki genel kısayolların her biri kaynakta bağlıdır | evet | geçti |
| `OTR-HSP-001` | Oturum | SERVER · DOMAIN | `hesap.test.ts` | alt sınır 12 karakter; kısa parola kusur cümlesi üretir, boş alan susar | evet | geçti |
| `OTR-HSP-002` | Oturum | SERVER · RBAC | `oturum-yasam-dongusu.test.ts` | başka kullanıcının oturumuna DOKUNMAZ | evet | geçti |
| `YTK-ATM-001` | Yetkiler | SERVER · DOMAIN | `erisim.test.ts` | farklı yetki seviyesi de İKİNCİ SATIR açmaz — aynı erişimin değişimidir | evet | geçti |
| `KIM-HSP-001` | Kimlik | SERVER · SCOPE | `kimlik-eylem.test.ts` | SANTRALSİZ (kurumsal) hesap kapsamsız yetki ister | evet | geçti |
| `KIM-ERS-001` | Kimlik | ENGINE · DOMAIN | `erisim-degerlendirme.test.ts` | null ile false KARIŞTIRILMAZ: biri ihlal, diğeri ölçüm boşluğu | evet | geçti |
| `TED-OTR-001` | Tedarikçi | DOMAIN · INTEGRATION | `tedarikci-oturum.test.ts` | hiç kayıt yokken durum "kaynak_bagli_degil" — "oturum yok" DEĞİL | evet | geçti |
| `OPR-DEG-001` | Operasyon | SERVER · SCOPE | `operasyon-tedarikci-eylem.test.ts` | KAYDIN GERÇEK tesisi güncellemede de bağlayıcıdır | evet | geçti |
| `OPR-DEG-002` | Operasyon | DOMAIN | `operasyon-mantik.test.ts` | BT değişikliğinin kapısı YOKTUR — "0/5" uydurulmaz | evet | geçti |
| `TES-PRF-001` | Portföy | SERVER · DOMAIN | `tesis360-eylem.test.ts` | boş metin NULL olur — "" ile "bilinmiyor" aynı şey değildir | evet | geçti |
| `TES-PRF-002` | Portföy | ENGINE · SERVER | `tesis360-eylem.test.ts` | MOTOR insanın kararını ezmez — override sonrası yeniden hesap kararı korur | evet | geçti |
| `TES-PRF-003` | Portföy | ENGINE · DOMAIN | `yeniTesis.test.ts` | profilsiz santral: karar verilmez + veri kalitesi bulgusu; profil gelince kapsam kararı gerekçeli yazılır | evet | geçti |
| `TES-PRF-004` | Portföy | SERVER · DOMAIN | `tesis360-eylem.test.ts` | şemanın seçenek listesi dışındaki öznitelik değeri reddedilir; beyansız anahtar da | evet | geçti |
| `TES-PRF-005` | Portföy | UI · DOMAIN | `tesis360-profil.test.ts` | şema tipi alan türüne çevrilir: mantık → üç durum, seçenekli metin → seçim, tarih, sayı | evet | geçti |
| `TES-PRF-006` | Portföy | SERVER · INTEGRATION | `tesis360-sektor-profili.test.ts` | rolü boş öznitelikler de alan olur; kapasite rolü çizilmez; sayı şemadan ölçülür | evet | geçti |
| `KNM-KRD-001` | Harita | SERVER · DOMAIN | `konum-apianahtar-eylem.test.ts` | YARIM koordinat reddedilir — tek başına enlem haritada bir yer değildir | evet | geçti |
| `SAG-KOK-001` | Sağlık | DOMAIN · UI | `koken.test.ts` | köken satırı olmayan varlık MANUEL sayılır, "otomatik" kovasına girmez | evet | geçti |
| `SAG-KOK-002` | Sağlık | SERVER · SCOPE | `koken-kapsam.test.ts` | KAPSAM DIŞI tek kayıt bütün partiyi durdurur — yarım onay bırakmaz | evet | geçti |
| `SAG-SRT-001` | Sağlık | INTEGRATION | `connector-sertifika.test.ts` | sır kontrolü: bağlı olmayan adaptörde eksik sır KUSUR DEĞİLDİR | evet | geçti |
| `SAG-YAP-001` | Sağlık | SERVER · INTEGRATION | `entegrasyon-yapilandirma.test.ts` | tanımlı olmayan santral kodu REDDEDİLİR ve kolon değişmez | evet | geçti |
| `SAG-ESL-001` | Sağlık | DOMAIN · INTEGRATION | `esleme.test.ts` | güven ÖLÇÜLEMİYORSA null döner — sıfır DEĞİL | evet | geçti |
| `SAG-ADV-001` | Sağlık | SERVER · INTEGRATION | `advisory.test.ts` | geçersiz JSON reddedilen olarak döner, istisna fırlatmaz | evet | geçti |
| `YON-MOT-001` | Yönetim konsolu | SERVER · RBAC | `isler-eylem.test.ts` | yonetim/yazma yetkisi olmayan çalıştıramaz — tek motora bile dokunulmaz | evet | geçti |
| `YON-MOT-002` | Yönetim konsolu | ENGINE | `motor-zinciri.test.ts` | bir motor patlarsa zincir DEVAM eder ve sonuç bunu bildirir | evet | geçti |
| `YON-KLT-001` | Yönetim konsolu | CONCURRENCY · ENGINE | `zamanlayici.test.ts` | EŞZAMANLI iki istekten yalnız BİRİ kazanır | evet | geçti |
| `YON-OTO-001` | Yönetim konsolu | ENGINE · DOMAIN | `otomasyon-guvenligi.test.ts` | her yasak için bir ölçü vardır — yorumda kalan kural yok | evet | geçti |
| `SIS-KPS-001` | Sistem | RBAC · SCOPE | `ekran-yazma-kapisi.test.ts` | EKRAN DAR DEĞİLDİR: satır yazılabiliyorsa kaba kapı da açıktır | evet | geçti |
| `SIS-KPS-002` | Sistem | RBAC · SCOPE | `kapsam-kapisi.test.ts` | KAPSAM_SONRA tek başına yetki VERMEZ: modül/işlem eşleşmesi aranır | evet | geçti |
| `SIS-GVN-001` | Sistem | API · SCOPE · RBAC | `guvenlik-negatif.test.ts` | B santralini açıkça isteyen sorgu 403 döner ve gövde kayıt taşımaz | evet | geçti |
| `SIS-SIR-001` | Sistem | SERVER · INTEGRATION | `sir-katmani.test.ts` | tanınmayan sağlayıcı biçimsel olarak geçerli ama DENETİMDEN geçmez | evet | geçti |
| `SIS-ALT-001` | Sistem | DOMAIN · INTEGRATION | `ot48-49-altyapi.test.ts` | ölçülemeyen zorunlu kontrol varken HAZIR cümlesi kurulmaz | evet | geçti |
| `YON-MOT-003` | Yönetim konsolu | ENGINE · DOMAIN | `motor-defteri.test.ts` | defterdeki on sekiz motorun her biri seed verisinde HATASIZ koşar | evet | geçti |
| `YON-MOT-004` | Yönetim konsolu | ENGINE · WORKFLOW | `motorlar.test.ts` | gap-to-action: uyumsuz+kritik → proje adayı üretir; İNSAN ONAYSIZ projeye dönmez; mükerrer üretmez | evet | geçti |
| `SAG-VKL-001` | Sağlık | ENGINE | `veri-kalitesi-aktarim.test.ts` | entegrasyon tabloları boşken HİÇBİR aktarım kuralı bulgu üretmez | evet | geçti |
| `SAG-VKL-002` | Sağlık | ENGINE · DOMAIN | `veri-kalitesi-aktarim.test.ts` | aynı varlığı iki kaynak görse bile TEK bulgu açılır | evet | geçti |
| `SIS-KPS-003` | Sistem | RBAC · SCOPE | `kapsam-kapisi-nobetci.test.ts` | KAPSAM_SONRA verilip ikinci aşama YAZILMAMIŞ eylem yoktur | evet | geçti |
| `SIS-GOC-001` | Sistem | MIGRATION | `senaryo-platform.test.ts` | hiçbir göç veri kaybettirmez — her DROP bir yeniden kurma adımıdır | evet | geçti |
| `SIS-GOC-002` | Sistem | MIGRATION · SERVER | `senaryo-platform.test.ts` | denetim izini koruyan tetikleyiciler göçlerde tanımlıdır | evet | geçti |
| `SIS-GRS-001` | Sistem | VISUAL | `senaryo-platform.test.ts` | tasarım dili kapısı tanımlı ve CI\'da koşuyor | evet | geçti |
| `SIS-GRS-002` | Sistem | VISUAL · RESPONSIVE | `senaryo-platform.test.ts` | dar bant ve dizüstü kapıları koda gömülü eşikler taşır | evet | geçti |
| `SIS-KML-001` | Sistem | SERVER · RBAC · UI | `kimlik-oidc.test.ts` | eşlenen grup ürün rolüne çevrilir | evet | geçti |
| `SIS-KML-001` | Sistem | SERVER · RBAC · UI | `kimlik-oidc.test.ts` | EŞLENMEYEN grup sessizce ATILMAZ, adıyla sayılır | evet | geçti |
| `SIS-KML-001` | Sistem | SERVER · RBAC · UI | `kimlik-oidc.test.ts` | rol iddiası tanımlı DEĞİLSE hiçbir rol çıkarılmaz | evet | geçti |
| `SIS-KML-001` | Sistem | SERVER · RBAC · UI | `kimlik-oidc.test.ts` | boşlukla ayrılmış tek dizeli iddia da okunur | evet | geçti |
| `SIS-KML-001` | Sistem | SERVER · RBAC · UI | `kimlik-saglayici-eylem.test.ts` | BOZUK sır referansı reddedilir ve kayıt AÇILMAZ | evet | geçti |
| `SIS-KML-001` | Sistem | SERVER · RBAC · UI | `kimlik-saglayici-eylem.test.ts` | BOZUK rol eşlemesi reddedilir — sessizce boş sayılmaz | evet | geçti |
| `SIS-KML-001` | Sistem | SERVER · RBAC · UI | `kimlik-saglayici-eylem.test.ts` | geçerli kayıt BAĞLI DEĞİL ve AKTİF DEĞİL doğar | evet | geçti |
| `SIS-KML-001` | Sistem | SERVER · RBAC · UI | `kimlik-saglayici-eylem.test.ts` | denetim izi MASKELİ adres taşır, sır DEĞERİ taşımaz | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | meydan okuma doğrulayıcının SHA-256 özetidir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | iki üretim AYNI doğrulayıcıyı vermez | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | yetkilendirme adresi state · nonce · S256 taşır | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | imzası ve iddiaları doğru jeton kabul edilir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | `aud` dizi olabilir ve içinde bizim istemci varsa geçer | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | süre payı içindeki jeton geçer (saat kayması) | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | BAŞKA anahtarla imzalanmış jeton reddedilir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | gövdesi kurcalanmış jeton reddedilir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | `alg: none` REDDEDİLİR — imzasız jeton kimlik kanıtı değildir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | HMAC (`HS256`) REDDEDİLİR — açık anahtarı sır sanma tuzağı | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | BAŞKA issuer\'ın verdiği jeton reddedilir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | BAŞKA istemciye verilmiş jeton reddedilir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | nonce UYUŞMAZSA reddedilir — yeniden oynatma | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | nonce HİÇ YOKSA da reddedilir — eksik ≠ geçerli | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | süresi dolmuş jeton reddedilir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | `exp` HİÇ YOKSA da reddedilir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | gelecekte düzenlenmiş jeton reddedilir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | `sub` yoksa reddedilir — kimliksiz jeton | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | JWKS\'te olmayan `kid` reddedilir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | `kid` yokken BİRDEN ÇOK anahtar varsa tahmin EDİLMEZ | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | bozuk bir JWK girdisi doğrulamayı ÇÖKERTMEZ, atlanır | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | üç parçalı olmayan metin reddedilir | evet | geçti |
| `SIS-KML-002` | Sistem | SERVER · DOMAIN | `kimlik-oidc.test.ts` | başlık okunabilir ama gövde imzasız DÖNMEZ | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | bağlı `sub` mevcut kullanıcıya çözülür | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | IdP grubu ürün rolüne ÖNERİ olarak çevrilir — yetki YAZILMAZ | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | JIT kapalıyken giriş reddedilir | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | JIT AÇIKKEN hesap açılır ama YETKİSİZ doğar | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | JIT açıkken VAR OLAN e-postaya BAĞLANMAZ, REDDEDİLİR | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | JIT açık ama JETONDA E-POSTA YOKSA hesap açılmaz | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | KABUL dalı yazma hatasında FIRLATIR | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | RED dalı aynı hatada SESSİZ geçer | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | BAĞLI OLMAYAN sağlayıcı akışa hiç girmez | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | SIR REFERANSI çözülemezse akış durur | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | jeton ucu hata dönerse akış durur | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | NONCE UYUŞMAYAN jeton reddedilir — zincirde de | evet | geçti |
| `SIS-KML-003` | Sistem | SERVER · RBAC | `kimlik-akis.test.ts` | PASİF kullanıcının kurum girişi reddedilir | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-mfa-zincir.test.ts` | kayıt AÇILIR ama DOĞRULANMAMIŞ doğar | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-mfa-zincir.test.ts` | SIR VERİTABANINDA AÇIK DURMAZ — zarf yazılır | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-mfa-zincir.test.ts` | YANLIŞ kod doğrulamaz, kayıt kurulu OLMAZ | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-mfa-zincir.test.ts` | DOĞRU kod kaydı kurar ve kurtarma kodları BİR KEZ döner | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-mfa-zincir.test.ts` | AYNI kod ikinci kez giriş DOĞRULAMAZ | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-mfa-zincir.test.ts` | SONRAKİ adımın kodu giriş doğrular | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-mfa-zincir.test.ts` | kurtarma kodu çalışır ve BİR KEZ kullanılır | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-mfa-zincir.test.ts` | boşluklu/küçük harfli kurtarma kodu da kabul edilir | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-mfa-zincir.test.ts` | anahtar referansı tanımsızken kayıt açılmaz | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-mfa-zincir.test.ts` | anahtar DEĞİŞİRSE eski kayıt "kod yanlış" demez, anahtar der | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | on sayacın onu da RFC ile birebir | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | beş zaman noktasının beşi de RFC ile birebir | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | adım 30 saniyedir: adım İÇİNDE sabit, SINIRINDA değişir | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | kodlanan çözülür ve aynı bayta döner | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | boşluk ve küçük harf hoş görülür — elle giriş | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | bozuk karakter SESSİZCE ATLANMAZ, null döner | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | şimdiki adımın kodu geçer | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | bir önceki ve bir sonraki adım da geçer (saat kayması) | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | İKİ adım öteki kod GEÇMEZ — pencere ±1 | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | AYNI kod ikinci kez KABUL EDİLMEZ | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | GERİYE dönük bir adım da tekrar sayılır | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | yanlış uzunluktaki kod BİÇİM olarak reddedilir | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | bozuk sır "kod yanlış" DEĞİL, "sır bozuk" der | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | üretilen sır 160 bit ve her seferinde farklı | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | otpauth URI standart alanları taşır | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | kurtarma kodları sayıca ve uzunlukça sabit, hepsi FARKLI | evet | geçti |
| `SIS-KML-004` | Sistem | SERVER · DOMAIN · UI | `kimlik-totp.test.ts` | normalize boşluk ve tireyi yok sayar | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-giris-mfa.test.ts` | politika kapalıysa parola tek başına yeter | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-giris-mfa.test.ts` | politika ZORUNLU ise parola doğru olsa da GİREMEZ | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-giris-mfa.test.ts` | reddedilen giriş denetim izine SEBEBİYLE yazılır | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-giris-mfa.test.ts` | KOD GELMEDEN oturum açılmaz — ikinci adım istenir | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-giris-mfa.test.ts` | YANLIŞ kod reddedilir ve oturum açılmaz | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-giris-mfa.test.ts` | yanlış kod da oran sınırını tüketir ve ize yazılır | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-giris-mfa.test.ts` | DOĞRU kod oturumu açar | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-giris-mfa.test.ts` | başarılı ikinci faktör İZ bırakır | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-giris-mfa.test.ts` | AYNI kod ikinci girişte GEÇMEZ | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-mfa-zincir.test.ts` | politika zorunlu ise kaldırma REDDEDİLİR | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-mfa-zincir.test.ts` | politika kapalıyken kaldırılır ve kurtarma kodları da düşer | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-saglayici-eylem.test.ts` | ATIL süre mutlaktan büyük olamaz | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-saglayici-eylem.test.ts` | tavanı aşan mutlak süre reddedilir | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-saglayici-eylem.test.ts` | geçerli politika yazılır ve iz VARSAYILANI adıyla anar | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-totp.test.ts` | kayıt YOKSA varsayılan uygulanır — 12/2 DEĞİŞMEDİ | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-totp.test.ts` | eksik alan varsayılandan tamamlanır, SIFIR sayılmaz | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-totp.test.ts` | tavanı aşan mutlak süre reddedilir | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-totp.test.ts` | tabanın altındaki atıl süre reddedilir | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-totp.test.ts` | ATIL süre MUTLAKTAN büyük olamaz | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-totp.test.ts` | sıkılaştırma geçer | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-totp.test.ts` | politika kapalıysa kapı açık | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-totp.test.ts` | zorunluyken TOTP\'siz YEREL hesap giremez | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-totp.test.ts` | zorunluyken TOTP\'li yerel hesap girer | evet | geçti |
| `SIS-KML-005` | Sistem | SERVER · RBAC · DOMAIN | `kimlik-totp.test.ts` | KURUM hesabında ikinci faktör IdP\'nin işidir | evet | geçti |
| `SIS-KML-006` | Sistem | SERVER · UI | `kimlik-oidc.test.ts` | tam yapılandırma geçer | evet | geçti |
| `SIS-KML-006` | Sistem | SERVER · UI | `kimlik-oidc.test.ts` | eksik alan ADIYLA sayılır — "bağlı değil" sessiz değildir | evet | geçti |
| `SIS-KML-006` | Sistem | SERVER · UI | `kimlik-oidc.test.ts` | SIR REFERANSI eksikse yapılandırma tamamlanmaz | evet | geçti |
| `SIS-KML-006` | Sistem | SERVER · UI | `kimlik-oidc.test.ts` | HTTP uç REDDEDİLİR (localhost hariç) | evet | geçti |
| `SIS-KML-006` | Sistem | SERVER · UI | `kimlik-saglayici-eylem.test.ts` | EKSİK yapılandırma bağlanamaz, eksik ADIYLA söylenir | evet | geçti |
| `SIS-KML-006` | Sistem | SERVER · UI | `kimlik-saglayici-eylem.test.ts` | BAĞLI OLMAYAN sağlayıcı aktif EDİLEMEZ | evet | geçti |
| `SIS-KML-006` | Sistem | SERVER · UI | `kimlik-saglayici-eylem.test.ts` | tam yapılandırma bağlanır, sonra aktif edilir | evet | geçti |
| `SIS-KML-006` | Sistem | SERVER · UI | `kimlik-saglayici-eylem.test.ts` | YAPILANDIRMA DEĞİŞİRSE bağ ve aktiflik DÜŞER | evet | geçti |
| `SIS-KML-006` | Sistem | SERVER · UI | `kimlik-saglayici-eylem.test.ts` | bağ düşerse aktiflik de düşer | evet | geçti |
| `BLD-KTU-003` | Bildirim | DOMAIN · UI | `bildirim-kutusu.test.ts` | okunmamış bildirim yokken "en eski okunmamış" SIFIR GÜN DEĞİL, null olur | evet | geçti |
| `RAP-URT-003` | Rapor | DOMAIN | `senaryo-platform.test.ts` | değerlendirilmemiş madde yüzdenin PAYDASINA girmez | evet | geçti |
| `ESL-PRF-003` | Eşleme | DOMAIN · INTEGRATION | `esleme.test.ts` | VARSAYILAN BİR ÖLÇÜM DEĞİLDİR: kaynağın verdiği alan ile varsayılan ayırt edilir | evet | geçti |
| `YRD-SOR-002` | Yardım | UI · ACCESSIBILITY | `yardim.test.ts` | yazı alanında TETİKLENMEZ: input/textarea/select/contentEditable | evet | geçti |
| `OPR-DEG-003` | Operasyon | DOMAIN | `operasyon-mantik.test.ts` | geri alma döngünün adımı değildir — indeksi yoktur | evet | geçti |
| `SIS-KPS-004` | Sistem | SERVER · RBAC | `yetki-kapisi.test.ts` | oturumsuz çağrı REDDEDİLİR | evet | geçti |
| `SIS-KPS-005` | Sistem | SERVER · RBAC | `yetki-kapisi.test.ts` | modülde YAZMA izni olmayan rol reddedilir | evet | geçti |
| `SIS-KPS-006` | Sistem | SERVER · RBAC | `yetki-kapisi.test.ts` | BAŞKA modülün yetkisi bu modülü açmaz | evet | geçti |
| `SIS-KPS-007` | Sistem | SERVER · SCOPE | `yetki-kapisi.test.ts` | kapsam dışı kayıtta verilen MESAJI fırlatır | evet | geçti |
| `SIS-KBK-010` | Sistem | UI · RESPONSIVE | `kabuk-gezinme.test.ts` | temel kural SARAR — bağların hepsi ulaşılabilir | evet | geçti |
| `SIS-KBK-011` | Sistem | UI · ACCESSIBILITY | `kabuk-gezinme.test.ts` | temel kuralda gizli kaydırma çubuğu YOK | evet | geçti |
| `SIS-KBK-012` | Sistem | UI · RESPONSIVE | `kabuk-gezinme.test.ts` | temel kuralda sabit yükseklik YOK — ikinci satır kırpılamaz | evet | geçti |
| `SIS-KBK-013` | Sistem | UI · RESPONSIVE | `kabuk-gezinme.test.ts` | yatay kaydırma yalnız dokunmatik banda izinli | evet | geçti |
| `SIS-KBK-014` | Sistem | UI · RESPONSIVE | `kabuk-gezinme.test.ts` | Uyum alanının sırası 1440px pencereye SIĞMAZ | evet | geçti |
| `SIS-KBK-015` | Sistem | UI · RESPONSIVE | `kabuk-gezinme.test.ts` | sararken hiçbir alan iki satırı aşmaz | evet | geçti |
| `SIS-KBK-016` | Sistem | UI · ACCESSIBILITY | `kabuk-gezinme.test.ts` | hiçbir ikincil bağ adı kırpılacak kadar uzun değil | evet | geçti |
| `SIS-KBK-017` | Sistem | UI · RESPONSIVE | `kabuk-gezinme.test.ts` | hiçbir Varlık grubu 1024px bandını taşırmaz | evet | geçti |
| `SIS-KBK-018` | Sistem | UI · DOMAIN | `kabuk-gezinme.test.ts` | app/ altındaki her statik sayfa rotalar.json içinde | evet | geçti |
| `SIS-BSL-001` | Sistem | UI · ACCESSIBILITY | `ekran-basligi.test.ts` | vurgusuz kalabilen başlık cümle parçası olamaz | evet | geçti |
| `SIS-BSL-002` | Sistem | UI | `ekran-basligi.test.ts` | künyede ister kodu geçmiyor | evet | geçti |
| `SIS-ERS-002` | Sistem | ACCESSIBILITY · UI | `senaryo-platform.test.ts` | seçilemeyen tablo grid demez, işaretçi imleci taşımaz | evet | geçti |
| `SIS-ERS-003` | Sistem | ACCESSIBILITY | `senaryo-platform.test.ts` | sekme rolü yalnız gerçek sekmelerde kullanılır | evet | geçti |
| `SIS-SNG-001` | Sistem | DOMAIN | `giris-zaman.test.ts` | ileri ve geri aynı kaydırma noktasında aynı pozu verir | evet | geçti |
| `SIS-SNG-001` | Sistem | DOMAIN | `giris-zaman.test.ts` | dört kareyi tek dünya koordinatına diker: ortak hedef komşu karelerde aynı noktadadır | evet | geçti |
| `SIS-SNG-001` | Sistem | DOMAIN | `giris-zaman.test.ts` | her bantta en fazla iki komşu kare görünür, toplam opaklık 1 ve görünen her kare görüntü alanını kaplar | evet | geçti |
| `SIS-SNG-001` | Sistem | DOMAIN | `giris-zaman.test.ts` | çözünme boyunca ortak hedef iki karede aynı piksel dikdörtgenindedir: tek kamera, slayt değil | evet | geçti |
| `SIS-SNG-001` | Sistem | DOMAIN | `giris-zaman.test.ts` | kamera yalnız ileri gider; yavaş başlar, ortada hızlanır, sonda yavaşlar | evet | geçti |
| `SIS-SNG-001` | Sistem | DOMAIN | `giris-zaman.test.ts` | canlı arayüz yalnız son kare tek başınayken belirir ve ekran yüzeyinden sıçramasız devralır | evet | geçti |
| `SIS-SNG-001` | Sistem | DOMAIN | `giris-zaman.test.ts` | ölçülen bağlar dünyadaki hedef zincirini kesintisiz kurar: farklı bağ setiyle model bozulmaz | evet | geçti |
| `SAH-GRS-001` | Saha | DOMAIN · UI | `ters-kapsam-ekran.test.ts` | fotoğrafı olmayan santral BAŞKA santralin görselini almaz | evet | geçti |
| `SAH-GRS-002` | Saha | SERVER · DOMAIN | `ters-kapsam-eylem.test.ts` | hiç anlık görüntü yoksa eğilim null kalır — düz sıfır çizgisi çizilmez | evet | geçti |
| `AKT-IZL-001` | Aktivite | DOMAIN · UI | `ters-kapsam-ekran.test.ts` | mercek hiçbir kayda uymayınca boş SÜZGEÇ sonucu doğar | evet | geçti |
| `AKT-IZL-002` | Aktivite | DOMAIN | `ters-kapsam-ekran.test.ts` | aktörü bilinmeyen kayıt aktör sayısına KATILMAZ, ayrı sayılır | evet | geçti |
| `API-SZL-001` | API | DOMAIN · UI | `ters-kapsam-ekran.test.ts` | kapsamı tanımsız anahtar, "salt okunur" cümlesinin ARDINA saklanmaz | evet | geçti |
| `SIS-BKM-001` | Sistem | DOMAIN · UI | `ters-kapsam-ekran.test.ts` | bitiş saati uydurulmaz ve eylem düğmesi konmaz | evet | geçti |
| `SIS-TKN-001` | Sistem | DOMAIN · VISUAL | `ters-kapsam-ekran.test.ts` | token değerleri stil dosyasından OKUNUR, ekrana elle yazılmaz | evet | geçti |
| `SIS-BLS-001` | Sistem | UI · VISUAL | `ters-kapsam-ekran.test.ts` | bozuk durum primitiflerinin HEPSİ galeride yer alır | evet | geçti |
| `UYU-SRC-001` | Uyum | DOMAIN | `ters-kapsam-ekran.test.ts` | hiçbir madde değerlendirilmemişse yüzde null kalır — %0 değil | evet | geçti |
| `UYU-SRC-002` | Uyum | DOMAIN | `ters-kapsam-ekran.test.ts` | kapsam dışı madde paydaya girmez; toplam alt sayımların toplamıdır | evet | geçti |
| `TES-YON-001` | Tesis | UI | `ters-kapsam-ekran.test.ts` | eski adres kanona yönlendirir; ikinci bir santral listesi tutulmaz | evet | geçti |
| `DEN-LST-002` | Denetim | DOMAIN · UI | `ters-kapsam-ekran.test.ts` | boş liste ile boş süzgeç sonucu AYRI durumlardır | evet | geçti |
| `UYU-CRC-004` | Uyum | DOMAIN · UI | `ters-kapsam-ekran.test.ts` | değerlendirilmemiş madde uyumlu da uyumsuz da SAYILMAZ | evet | geçti |
| `YON-TZG-001` | Yönetim konsolu | DOMAIN · UI | `ters-kapsam-ekran.test.ts` | tezgâhta boş süzgeç sonucu, hiç görev olmamasından ayrılır | evet | geçti |
| `OLY-BLD-001` | Olay | SERVER · WORKFLOW | `ters-kapsam-eylem.test.ts` | kural SİLİNMEZ, pasifleştirilir — geçmiş olayın dayanağı kayıtta kalır | evet | geçti |
| `EGT-MDD-001` | Eğitim | SERVER | `ters-kapsam-eylem.test.ts` | olmayan bağı kaldırmak hata vermez ve İZ YAZMAZ — idempotent | evet | geçti |
| `SAG-KOS-001` | Sağlık | SERVER · INTEGRATION | `ters-kapsam-eylem.test.ts` | kuru koşu hiçbir varlık kaydı YAZMAZ | evet | geçti |
| `SAG-KOS-002` | Sağlık | SERVER · INTEGRATION | `ters-kapsam-eylem.test.ts` | tanımsız tetikleyenle senkronizasyon reddedilir | evet | geçti |
| `SAG-ETK-001` | Sağlık | SERVER · INTEGRATION | `ters-kapsam-eylem.test.ts` | sır referansı olmadan connector etkinleştirilemez | evet | geçti |
| `ESL-SZL-001` | Eşleme | SERVER · DOMAIN | `ters-kapsam-eylem.test.ts` | sözlük KOPYA verir; çağıran onu değiştirerek kaynağı bozamaz | evet | geçti |
| `ESL-BAG-001` | Eşleme | SERVER · INTEGRATION | `ters-kapsam-eylem.test.ts` | tipi tutmayan profil bağlanamaz | evet | geçti |
| `GZD-KRR-001` | Gözden geçirme | SERVER · WORKFLOW | `ters-kapsam-eylem.test.ts` | karar kapanınca bağlı görev de kapanır | evet | geçti |
| `GZD-KRR-002` | Gözden geçirme | SERVER · WORKFLOW | `ters-kapsam-eylem.test.ts` | karar iptali gerekçe ister | evet | geçti |
| `OLY-ETK-003` | Olay | SERVER · SCOPE | `ters-kapsam-eylem.test.ts` | kapsam dışı olayın etki önerisi yenilenemez | evet | geçti |
| `TOP-TML-001` | Topoloji | SERVER · SCOPE | `ters-kapsam-eylem.test.ts` | kapsam dışı anlık temel onaylanamaz | evet | geçti |
| `TOP-BUL-001` | Topoloji | SERVER · WORKFLOW | `ters-kapsam-eylem.test.ts` | madde durumu bağlanmadan sapmadan bulgu açılamaz | evet | geçti |
| `VAK-YUK-001` | Varlık aktarımı | SERVER · INTEGRATION | `ters-kapsam-eylem.test.ts` | desteklenmeyen dosya türü aktarım kaydı AÇMAZ | evet | geçti |
| `VAK-YUK-001` | Varlık aktarımı | SERVER · INTEGRATION | `ters-kapsam-eylem.test.ts` | boş dosya da reddedilir ve kayıt açmaz | evet | geçti |
| `VAK-ESL-001` | Varlık aktarımı | SERVER · WORKFLOW | `ters-kapsam-eylem.test.ts` | etiket alanı eşlenmeden ilerlenemez | evet | geçti |
| `VAK-RED-001` | Varlık aktarımı | SERVER · WORKFLOW | `ters-kapsam-eylem.test.ts` | onaylanmış aktarım reddedilemez | evet | geçti |
| `ENV-UYG-001` | Envanter | SERVER · SCOPE | `ters-kapsam-eylem.test.ts` | kapsam dışı varlığın uygulanamaz işareti kaldırılamaz | evet | geçti |
| `ENV-FRM-010` | Envanter | SERVER · DOMAIN | `ters-kapsam-eylem.test.ts` | firmware istisnası uyum DURUMUNU değiştirmez | evet | geçti |
| `ENV-PRS-001` | Envanter | SERVER · SCOPE | `ters-kapsam-eylem.test.ts` | olmayan proses adımı bağı sessizce başarılı SAYILMAZ | evet | geçti |
| `YTK-EKP-001` | Yetkiler | SERVER | `ters-kapsam-eylem.test.ts` | olmayan ekip üyeliği sessizce başarılı SAYILMAZ | evet | geçti |
| `YDP-BAG-001` | Yedek parça | SERVER · SCOPE | `ters-kapsam-eylem.test.ts` | zaten çözülmüş yedek parça bağı ikinci kez çözülünce iz yazılmaz | evet | geçti |
| `YON-MOD-003` | Yönetim konsolu | SERVER · DOMAIN | `ters-kapsam-eylem.test.ts` | tanımsız modül kodu bir sınıfa DÜŞMEZ, null döner | evet | geçti |
| `ZIM-SUR-010` | Zimmet | SERVER · DOMAIN | `ters-kapsam-eylem.test.ts` | zimmet süre sınırları TEK kaynaktan gelir | evet | geçti |
| `UYU-ANL-001` | Uyum | ENGINE | `ters-kapsam-eylem.test.ts` | uyum anlığı günde bir alınır | evet | geçti |
| `ENV-FRM-011` | Envanter | ENGINE | `ters-kapsam-eylem.test.ts` | firmware kararı değişmediyse yeniden YAZILMAZ | evet | geçti |
| `ENV-AGT-001` | Envanter | ENGINE | `ters-kapsam-eylem.test.ts` | segmenti atanmamış varlık için ölçüm BORCU açılır, bulgu değil | evet | geçti |
| `TAB-DRF-001` | Konfigürasyon tabanı | ENGINE | `ters-kapsam-eylem.test.ts` | özeti olmayan yedek konfigürasyon SAPMASI açmaz | evet | geçti |
| `ENV-GRN-001` | Envanter | ENGINE | `ters-kapsam-eylem.test.ts` | "hiç görülmedi" ile "ağda görülmedi" ayrı kurallardır | evet | geçti |
| `SIS-KYR-001` | Sistem | SERVER | `ters-kapsam-eylem.test.ts` | aynı adla ikinci sağlayıcı sessizce ÜSTÜNE YAZMAZ | evet | geçti |
| `BUL-KAP-003` | Bulgu | DOMAIN · UI | `kapanis-yolu.test.ts` | kapanış şeridi TIKLANABİLİR — süs değil, navigatör | evet | geçti |
| `BUL-KAP-004` | Bulgu | DOMAIN · UI | `kapanis-yolu.test.ts` | kök nedene yazan İKİNCİ form yoktur | evet | geçti |
| `BUL-KAP-005` | Bulgu | UI | `kapanis-yolu.test.ts` | kayıt açılınca düzenleme formu KENDİLİĞİNDEN gelmez | evet | geçti |
| `URN-KUR-001` | Ürünleştirme | DOMAIN | `marka-adi.test.ts` | CLAUDE.md bağlayıcı kuralları kalan/değişen ayrımıyla yazar | evet | geçti |
| `URN-KUR-002` | Ürünleştirme | DOMAIN | `marka-adi.test.ts` | PRODUCT.md ürünleştirme kurgusunu anlatır | evet | geçti |
| `URN-KUR-003` | Ürünleştirme | DOMAIN | `marka-adi.test.ts` | CLAUDE.md yönlendirme tablosunda ölü atıf yoktur | evet | geçti |
| `URN-KUR-004` | Ürünleştirme | DOMAIN · UI | `marka-adi.test.ts` | belge başlıkları marka.ts varsayılanından sapmaz | evet | geçti |
| `URN-KUR-005` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | TEDARİKÇİ adları tek kaynaktan gelir | evet | geçti |
| `URN-KUR-005` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | VARLIK üreticileri tek kaynaktan gelir | evet | geçti |
| `URN-KUR-005` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | YAZILIM üreticileri tek kaynaktan gelir | evet | geçti |
| `URN-KUR-005` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | DENETLEYİCİ adları tek kaynaktan gelir | evet | geçti |
| `URN-KUR-005` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | TÜZEL KİŞİ adları tek kaynaktan gelir | evet | geçti |
| `URN-KUR-005` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | KİŞİ adları rol taşır, gerçek ad taşımaz | evet | geçti |
| `URN-KUR-006` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | YAZILIM ÜRÜNÜ adları tek kaynaktan gelir | evet | geçti |
| `URN-KUR-006` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | VARLIK modelleri tek kaynaktan gelir | evet | geçti |
| `URN-KUR-006` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | İŞLETİM SİSTEMİ adları tek kaynaktan gelir | evet | geçti |
| `URN-KUR-006` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | CONNECTOR kaynak sistemi beyanlıdır | evet | geçti |
| `URN-KUR-006` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | KİMLİK HESABI kaynak sistemi beyanlıdır | evet | geçti |
| `URN-KUR-006` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | SERTİFİKAYI VEREN beyanlıdır | evet | geçti |
| `URN-KUR-007` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | her beyan KAYNAK ve GEREKÇE taşır | evet | geçti |
| `URN-KUR-007` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | KULLANILMAYAN beyan bırakılmaz | evet | geçti |
| `URN-KUR-007` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | ADAPTÖR hedef ürünleri beyanlıdır | evet | geçti |
| `URN-KUR-007` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | her ZAFİYET kamuya açık bir kaynağa atıf yapar | evet | geçti |
| `URN-KUR-007` | Ürünleştirme | DOMAIN | `bekci/kurgusal-adlar.test.ts` | KURGUSAL ad ile GERÇEK ad aynı kayıtta karışmaz | evet | geçti |
| `URN-KUR-008` | Ürünleştirme | DOMAIN | `goc-zinciri.test.ts` | boş veritabanında bütün göçler uygulanır ve schema.prisma ile fark sıfırdır | evet | geçti |
| `URN-KUR-008` | Ürünleştirme | DOMAIN | `goc-zinciri.test.ts` | sabotaj: ADD COLUMN silinmiş zincir kopyası kırmızı yanar — zincir sessizce uygulanır, şema farkı yakalar | evet | geçti |
| `URN-KUR-008` | Ürünleştirme | DOMAIN | `goc-zinciri.test.ts` | sabotaj: göçsüz şema kolonu kırmızı yanar | evet | geçti |
| `URN-ALN-001` | Ürünleştirme | MIGRATION · DOMAIN | `p1-oznitelik-gocu.test.ts` | göç betiği kurulu gücü kayıpsız taşır; ölçülmemiş satır almaz | evet | geçti |
| `URN-ALN-001` | Ürünleştirme | MIGRATION · DOMAIN | `p1-oznitelik-gocu.test.ts` | uygulama veritabanında ölçülmemiş nitelik SATIRSIZ durur | evet | geçti |
| `URN-ALN-002` | Ürünleştirme | DOMAIN · UI | `p1-oznitelik-gocu.test.ts` | kural öznitelik üzerinden AYNI kararları üretir | evet | geçti |
| `URN-ALN-002` | Ürünleştirme | DOMAIN · UI | `uygulanabilirlik.test.ts` | öznitelik ÖLÇÜLMEMİŞSE karar verilmez, kapsam dışı sayılmaz | evet | geçti |
| `URN-ALN-002` | Ürünleştirme | DOMAIN · UI | `uygulanabilirlik.test.ts` | ölçülmemiş öznitelik, sağlanan başka bir koşulu ENGELLEMEZ | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `bekci/muafiyet-canli.test.ts` | her VERİ muafiyeti kaynağını taşır ve gerekçesi vardır | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `bekci/muafiyet-canli.test.ts` | muaf dize kaynağında HÂLÂ geçiyor — ölü muafiyet yok | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `bekci/muafiyet-canli.test.ts` | her DOSYA muafiyeti var olan dosyayı gösterir ve gerekçelidir | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `bekci/muafiyet-canli.test.ts` | DİZE muafiyeti kaynağında HÂLÂ geçiyor ve boş değil | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `p1-ikinci-sozluk.test.ts` | $ad — üç sözlükte de kurulur | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `p1-kabuk-sozluk.test.ts` | tek sektörlü kapsamda sektörün sözcüğü iner | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `p1-kabuk-sozluk.test.ts` | sektörün sözlüğü yoksa ÇEKİRDEK sözcük iner | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `p1-kabuk-sozluk.test.ts` | kapsam İKİ sektöre yayılıyorsa hiçbiri seçilmez | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `p1-terim-sozlugu.test.ts` | ekran adı sözlükle "Santral 360", sözlüksüz "Tesis 360" | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `p1-terim-sozlugu.test.ts` | çekirdek karşılıklar hiçbir sektör sözcüğü taşımaz | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `p1-tesis360-sozluk.test.ts` | enerji sözlüğü kuruluyken ekran adı "Santral 360" | evet | geçti |
| `URN-ALN-004` | Ürünleştirme | DOMAIN · UI | `p1-tesis360-sozluk.test.ts` | sözlük kaldırılınca AYNI ekran "Tesis 360" der | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/cekirdek-taban.test.ts` | YENİ DOSYA eklenemez — çakılı sözcük yeni bir yere giremez | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/cekirdek-taban.test.ts` | dosya başına sayı ARTAMAZ | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/cekirdek-taban.test.ts` | DÜŞEN sayı tabana yazılmalı — bayat taban gösterge değildir | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/cekirdek-taban.test.ts` | toplam taban ölçümle tutuyor | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/sektor-terimi.test.ts` | izin listesinde OLMAYAN dosyada sektör terimi yok | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/sektor-terimi.test.ts` | liste taban daldaki listenin ALT KÜMESİ | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/sektor-terimi.test.ts` | her satır SINIFLANDIRILMIŞ — kalıcı mı, ertelenmiş mi | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/sektor-terimi.test.ts` | ERTELENMİŞ satır hangi aşamada kapanacağını YAZAR | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/sektor-terimi.test.ts` | ERTELENMİŞ terim toplamı `ertelenmisTavani`yi aşmıyor | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/sektor-terimi.test.ts` | terim toplamı `terimTavani`yi aşmıyor | evet | geçti |
| `URN-ALN-003` | Ürünleştirme | DOMAIN · UI | `bekci/sektor-terimi.test.ts` | tavan YÜKSELTMESİ gerekçe ister | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | YORUMLAR sökülür — render edilmeyen metin aranmaz | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | GÜRÜLTÜ 1: sözlük ÇAĞRISI bulgu sayılmaz | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | GÜRÜLTÜ 2: anahtar argümanı ekran metni değildir | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | GÜRÜLTÜ 3: kod jetonu ekran metni değildir | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | POZİTİF: gerçek ekran metni yakalanır | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | POZİTİF: çakılı sözcük, sözlük çağrısıyla AYNI satırdaysa da görünür | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | GÜRÜLTÜ 5: model adı alanlarının DEĞERİ saklanan kimliktir | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | GÜRÜLTÜ 5 KONUMLUDUR: aynı dosyadaki ekran etiketi yakalanır | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | GÜRÜLTÜ 4: dosya adı ve nitelikli ad tanımlayıcıdır | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | GÜRÜLTÜ 4: eğik çizgi SEÇENEK bağıysa ekran metnidir | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | GÜRÜLTÜ 5: cümle sonundaki nokta tanımlayıcı DEĞİLDİR | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/cekirdek-tarayici.test.ts` | GÜRÜLTÜ 5: nitelikli ad noktası hâlâ tanımlayıcıdır | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | ÜNİTE — değişmez katlamada GÖRÜNMEZ, Türkçe katlamada görünür | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | TERMİK — yalnız Türkçe katlamada görünür | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | TERMIK (ASCII I) — yalnız DEĞİŞMEZ katlamada görünür | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | UNITE (ASCII I) — yalnız DEĞİŞMEZ katlamada görünür | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | BIRIM — katlama yönünün kendisi sabitlenir | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | DGKÇ — ASCII `\\b` sondaki Ç yüzünden HİÇ görmüyordu | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | RES — ASCII `\\b` Türkçe sözcüğün ORTASINDA eşleşiyordu | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | şapkasız rüzgar — yazım varyantı da sektör sözcüğüdür | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | `gucMw` NUMUNESİ — öncesi 0, sonrası 1 | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | birim sonekli yazımlar da görünür (`Mwe` · `MWe` · `Mwp`) | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | YANLIŞ POZİTİF YOK — küçük harfli ve sınırsız yazımlar sessiz | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | sözcük sınırlı yazım HÂLÂ görünüyor — eski kalıp kaybolmadı | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | KÖRLÜK KAPANINCA BEŞ DOSYA ÇIKTI — ölçüm, temizlikten sonra | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | camelCase kod biçimi depoda HİÇ geçmiyor (ölçüm) | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | bugünkü bekçi camelCase kod biçimini GÖRMÜYOR — bilinçli | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | küçük harf araması neden yapılmıyor — yanlış pozitif kanıtı | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | ölçüm sondası: `/…/i` kör, `katlamaliVarMi` görür | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | `plant` sınırsız aranınca "toplantı"yı yakalıyordu | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/katlama-korlugu.test.ts` | CSS jetonu (`--hes`) — öncesi 0, sonrası 1 | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/terim-dogrulama.test.ts` | TERIMLER içindeki HER terimin fikstürde karşılığı var | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/terim-dogrulama.test.ts` | fikstürde TERIMLER dışında kayıt yok | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/terim-dogrulama.test.ts` | ${ad}: EŞLEŞMELİ olanların hepsi yakalanır | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/terim-dogrulama.test.ts` | ${ad}: EŞLEŞMEMELİ olanların hiçbiri yakalanmaz | evet | geçti |
| `URN-ALN-007` | Ürünleştirme | DOMAIN | `bekci/terim-dogrulama.test.ts` | ${ad}: bilinçli körlükler HÂLÂ kör | evet | geçti |
| `URN-ALN-008` | Ürünleştirme | DOMAIN · UI | `bekci/ek-eklemesi.test.ts` | hiçbir kaynak dosyada sözlük terimine elle ek eklenmiyor | evet | geçti |
| `URN-ALN-008` | Ürünleştirme | DOMAIN · UI | `bekci/ek-eklemesi.test.ts` | düzeltilen gerçek yazımları görür | evet | geçti |
| `URN-ALN-008` | Ürünleştirme | DOMAIN · UI | `bekci/ek-eklemesi.test.ts` | ayrı sözcüğü ve büyük harfi ekleme saymaz | evet | geçti |
| `URN-ALN-008` | Ürünleştirme | DOMAIN · UI | `bekci/ek-eklemesi.test.ts` | alan erişimiyle yazılan eki de görür | evet | geçti |
| `URN-KAP-001` | Ürünleştirme | DOMAIN · MIGRATION | `bekci/kapsam-omurga.test.ts` | omurga tanımı şemadan türer ve dokuz tabloyu kapsar | evet | geçti |
| `URN-KAP-001` | Ürünleştirme | DOMAIN · MIGRATION | `bekci/kapsam-omurga.test.ts` | omurga tablosunda doğrudan tesisId YOK — listede olmayan kolon adıyla kırmızı | evet | geçti |
| `URN-KAP-001` | Ürünleştirme | DOMAIN · MIGRATION | `bekci/kapsam-omurga.test.ts` | ölü satır yok — listedeki model artık tesisId taşımıyorsa liste küçülmeli | evet | geçti |
| `URN-KAP-001` | Ürünleştirme | DOMAIN · MIGRATION | `bekci/kapsam-omurga.test.ts` | her satır sınıflı ve kusuru anlatan gerekçeli; ertelenmiş kapanış taşır, kalıcı taşımaz | evet | geçti |
| `URN-KAP-001` | Ürünleştirme | DOMAIN · MIGRATION | `bekci/kapsam-omurga.test.ts` | liste taban dalın ALT KÜMESİDİR — cırcır yalnız küçülür | evet | geçti |
| `URN-KAP-001` | Ürünleştirme | DOMAIN · MIGRATION | `bekci/kapsam-omurga.test.ts` | kalıcı vaka: omurga tablosuna eklenen tesisId ayrıştırıcıda görünür | evet | geçti |
| `URN-KAP-002` | Ürünleştirme | DOMAIN | `bekci/sema-sektorsuz.test.ts` | paket anahtarları ölçülüyor — liste sessizce kısalamaz | evet | geçti |
| `URN-KAP-002` | Ürünleştirme | DOMAIN | `bekci/sema-sektorsuz.test.ts` | paketin beyan ettiği anahtarla aynı adlı çekirdek kolon YOK | evet | geçti |
| `URN-KAP-002` | Ürünleştirme | DOMAIN | `bekci/sema-sektorsuz.test.ts` | model ve alan adlarında sektör terimi YOK | evet | geçti |
| `URN-KAP-002` | Ürünleştirme | DOMAIN | `bekci/sema-sektorsuz.test.ts` | kalıcı vaka: geri eklenen `blackStart` kolonu ve `santralKodu` alanı kırmızı, temiz şema yeşil | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | çekirdek türler göçte aynı kimlik, kod, ad, etiket, sıra ile yazılır | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | öğe kimlik kuralı `ko-<tesisId>` dört yerde aynı: göç · tohum · sunucu · test yardımcısı | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | kurum eşlemesi: MERKEZ ve SU-MERKEZ tipleri göçte ve tohumda `kurum` türüne gider | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | kapalı tesisin öğesi pasif — göç ve tohum aynı kararı verir | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | şema satırları alan alan aynı (anahtar · tip · kuralda · sıra · rol · grup · seçenekler) | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | kapasite ROLÜ: göç rolsüz kapasite satırını işaretler, tohum rolle yazar | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | kritiklik ROLÜ tek anahtarda ve iki kaynakta aynı | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | etiketler: altı hâlin hepsi göçte, yalnız enerji sektörüne, NOT EXISTS korumalı | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | profil kolonları öznitelik satırına aynı kuralla taşınır: mantık → sayısal 0/1, kalanı metin, NULL satır açmaz | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | türetilmiş alan kuraldan çıkar: göçün REPLACE hedefi tohumun bileşik koşuluyla birebir | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | ortak sayısal anahtarların hepsi eşit; ölçüm dosyaları boş değil | evet | geçti |
| `URN-KAP-003` | Ürünleştirme | MIGRATION · DOMAIN | `kapsam-ogesi-gocu.test.ts` | her tesis bir öğe aldı; tür dağılımı öğe sayısına toplanır | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | ölçüm tabanı: tarama gerçekten dosya, çağrı ve bulgu görüyor | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | beyan isteyen her olumsuzlama izin listesinde — olmayan adıyla kırmızı | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | ölü satır yok — bulgusu kalmayan satır listeden düşmeli | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | her satır sınıflı ve gerekçeli; beyan edilen model şemaya karşı doğru | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | tavan satır sayısına EŞİT — gevşeklik yok | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | liste taban dalın ALT KÜMESİDİR — cırcır yalnız küçülür | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: kusurun kendisi — nullable rol üzerinde NOT, NULL ele alınmamış → beyan | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: düzeltme — NULL OR dalıyla dâhil → güvenli | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: NULL\'un kendisini olumsuzlamak IS NOT NULL\'dır → güvenli | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: NOT NULL kolon → güvenli; ilişki zinciri hedef modelde çözülür | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: NULL açıkça DIŞLANMIŞSA (NOT null + notIn) → güvenli | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: NULL yalnız BAŞKA ilişki yolunda ele alınmışsa olumsuzlama temizlenmez; aynı yolda ele alınmışsa temizlenir | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: NULL dâhil etme yalnız OR KARDEŞİ olarak sayılır — başka bağlaçtaki `x: null` temizlemez; bilerek dışlama her yerde sayılır | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: aynı dosyada aynı alanın ikinci yüklemi AYRI anahtar taşır — eski izin satırı örtemez | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: dinamik NOT (çağrı/yayma) ve isNot → beyan | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: çağrı dışı süzgeç parçası beyan ister; tohum verisindeki Türkçe "not" istemez | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: yorum, dize ve veri nesnesi bulgu değildir | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: ham SQL NOT IN / != beyan ister; tırnak içindeki != göç JSON sabitidir | evet | geçti |
| `URN-VER-001` | Ürünleştirme | DOMAIN · INTEGRATION | `bekci/null-olumsuzlama.test.ts` | kalıcı vaka: gevşek tavan kırmızı — tavan satır sayısından büyük olamaz | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | eksik alan → BIÇIM, konum adıyla; sürüm SemVer değilse SÜRÜM | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | bilinmeyen manifest alanı reddedilir — yazım hatası sessizce yutulmaz | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | özet uyuşmazlığı, listede olmayan dosya ve eksik dosya üçü de BIÇIM | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | tur=sektor sektör ister; yatay paket sektör, öznitelik ve sözlük taşıyamaz | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | madde ağacı: kod tekrarı ve sonra gelen üst madde KİMLİK — düzeltme cümlesi sözleşmedeki gibi | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | CSV başlığında zorunlu sütun eksikse ya da bilinmeyen sütun varsa BIÇIM | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | sözlükte boş hâl SÖZLÜK; bilinmeyen rol, metinde birim ve iki kapasite ÖZNİTELİK; tür kodu büyük harfse KAPSAM TÜRÜ | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | dizin adı manifest koduyla uyuşmalı — kopyalanmış dizin BAŞKA paketi kuramaz: KİMLİK | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | ust_kod kendisine eşit satır KİMLİK — öz-referans üst madde değildir, kurulumda köke düşmez | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | sektörsüz paket (uluslararasi, sektor=null) sözlük ve öznitelik beyan edemez — kurucu sessizce düşürmesin | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | seviye 0–5 dışındaysa BIÇIM (ürünün olgunluk ölçeği); 5 geçer | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | takvimde olmayan tarih (2025-02-30, 2025-13-01) BIÇIM — biçim yetmez, gidiş-dönüş eşitliği ister | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | kapanmamış tırnak BIÇIM — dosyanın kalanı tek hücreye yutulmaz, satır numarası söylenir | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | hata satırı biçimi: dosya:konum — SINIF: mesaj → düzeltme | evet | geçti |
| `URN-PKT-001` | Ürünleştirme | DOMAIN | `paket-dogrula.test.ts` | paket dizini yoksa BIÇIM, çökme yok | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-dogrula.test.ts` | CSV: tekrar eden başlık ve başlığı aşan dolu hücre BIÇIM — telifli metin ikinci "metin" sütunundan ya da satır sonundan kaçamaz | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-dogrula.test.ts` | telifli çerçeve metin taşıyorsa LİSANS: "lisans sınırı: <kod> telifli, metin girilemez" | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-dogrula.test.ts` | telifli çerçevede başlık 120 karakteri aşamaz; metinsiz yapı GEÇER | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-dogrula.test.ts` | paket yapısında yeri olmayan dosya BIÇIM — özeti doğru olsa da hiçbir tanımlayıcı okumaz, lisans kontrolü göremezdi | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-dogrula.test.ts` | telifli çerçevede kanit_beklentisi serbest metindir → LİSANS; dis_kontrol_id 60 karakteri aşamaz; kısa kimlik geçer | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-dogrula.test.ts` | telifli + metinDahil=true çelişkisi hem manifestte hem çerçevede LİSANS | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-dogrula.test.ts` | kamuya açık ama metinDahil=false (iskelet) → metin taşıyan satır LİSANS; metinsiz geçer | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-kur.test.ts` | kurulu regülasyon telifliyse kamuya açık beyanlı paket LİSANS ile reddedilir | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-oscal.test.ts` | telifli çerçevede OKUNMAYAN metin alanı (yabancı prose/prop) LİSANS ile reddedilir | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-oscal.test.ts` | telifli metin GRUP part\'ında ya da İÇ İÇE part\'ta saklanamaz — muafiyet ada değil YOLA bağlı | evet | geçti |
| `URN-PKT-002` | Ürünleştirme | DOMAIN · SERVER | `paket-sablon.test.ts` | manifesti kamuya açık ama TELİFLİ ÇERÇEVE taşıyan pakette de XLSX yasak | evet | geçti |
| `URN-PKT-003` | Ürünleştirme | SERVER · INTEGRATION | `paket-eylem.test.ts` | okuyucu rolü paket kuramaz | evet | geçti |
| `URN-PKT-003` | Ürünleştirme | SERVER · INTEGRATION | `paket-eylem.test.ts` | paket yolu paketler/ dışına çıkamaz — kod deseni ve dizin çözümü | evet | geçti |
| `URN-PKT-003` | Ürünleştirme | SERVER · INTEGRATION | `paket-eylem.test.ts` | olmayan paket doğrulayıcı diliyle reddedilir; veritabanına dokunulmaz | evet | geçti |
| `URN-PKT-003` | Ürünleştirme | SERVER · INTEGRATION | `paket-eylem.test.ts` | yetkili kullanıcı iskelet paketi kurar: rapor döner, çerçeve taslak, iz sayılarla düşer | evet | geçti |
| `URN-PKT-003` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | doğrulanmış paket yazılır: sayılar, taslak sürümler, köken, lisans alanı, metin sabitleri, sürüm tarihleri | evet | geçti |
| `URN-PKT-003` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | aynı sürüm ikinci kez kurulunca idempotent: satır sayıları değişmez, ikinci sürüm kaydı açılmaz | evet | geçti |
| `URN-PKT-003` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | kısmi yazma YOK: sonda patlayan kurulum hiçbir satır bırakmaz | evet | geçti |
| `URN-PKT-003` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | doğrulayıcıdan geçmeyen paket veritabanına dokunmaz | evet | geçti |
| `URN-PKT-003` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | kurulu olmayan bağımlılık kurulumu durdurur | evet | geçti |
| `URN-PKT-003` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | 211 satır (kök + 150 kardeş + 60 halkalık zincir) doğru üst bağlarıyla yazılır | evet | geçti |
| `URN-PKT-004` | Ürünleştirme | SERVER · INTEGRATION | `paket-eylem.test.ts` | gerekçesiz kaldırma reddedilir | evet | geçti |
| `URN-PKT-004` | Ürünleştirme | SERVER · INTEGRATION | `paket-eylem.test.ts` | okuyucu kaldıramaz; yetkili gerekçeyle kaldırır → arşiv + iz, satır silinmez | evet | geçti |
| `URN-PKT-004` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | aynı anahtarda kiracı satırı varsa dokunulmaz ve raporda çelişki olur; paket satırı güncellenir; yenilenen taslağın tarihi de yazılır | evet | geçti |
| `URN-PKT-004` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | kiracının KAPSAM ALANI eşlemesi (MaddeAlan) bağlı taslak üzerine yazılamaz — deleteMany kaskatla silmez | evet | geçti |
| `URN-PKT-004` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | kiracı kaydı bağlı taslak üzerine yazılamaz — SÜRÜM hatası, hiçbir şey değişmez | evet | geçti |
| `URN-PKT-004` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | kaldırma = arşiv: paket/sürüm arşiv, taslak çerçeve arşiv, tür ve yükümlülük pasif; HİÇBİR satır silinmez | evet | geçti |
| `URN-PKT-004` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | aktif çerçeve sürümü taşıyan paket kaldırılamaz | evet | geçti |
| `URN-PKT-004` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | hedef olgunluk gibi skaler düzenleme izi olan madde: yeni sürüm aynı etiketi yenileyemez (SÜRÜM); yeni etiket kurulur | evet | geçti |
| `URN-PKT-005` | Ürünleştirme | DOMAIN · INTEGRATION | `paket-iskeletler.test.ts` | TR-BANKACILIK hâlâ İSKELET: hiçbir maddede metin yok, metinDahil=false | evet | geçti |
| `URN-PKT-005` | Ürünleştirme | DOMAIN · INTEGRATION | `paket-iskeletler.test.ts` | EPDK-SGYM yapısı: 4 bölüm + 18 madde + 1 geçici, başlıklar birincil dosyadan; Ek-3: 13 aile + 565 kontrol, kademe Seviye 1–3/Ek Kontrol | evet | geçti |
| `URN-PKT-006` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | v0.2.0 B\'yi bırakınca: tür B ve yükümlülük B pasif, YUK-B taslağı arşiv, A yeni sürüme geçer; hiçbir satır silinmez; sözlük/öznitelik B artık | evet | geçti |
| `URN-PKT-006` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | uzlaştırma kiracı satırına dokunmaz: kiracı türü pasifleşmez; tekrar kurulumda uzlaştırma sıfır | evet | geçti |
| `URN-PKT-007` | Ürünleştirme | SERVER · INTEGRATION | `paket-eylem.test.ts` | iz yazılamazsa kurulum da GERİ ALINIR — durum ve iz aynı transaction\'da | evet | geçti |
| `URN-PKT-007` | Ürünleştirme | SERVER · INTEGRATION | `paket-eylem.test.ts` | iz yazılamazsa arşiv de GERİ ALINIR — paket kurulu kalır, iz yok | evet | geçti |
| `URN-PKT-007` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | ayniIslemde (iz) patlarsa kurulum da geri alınır — durum ve iz aynı transaction\'da | evet | geçti |
| `URN-PKT-007` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | kaldırmada "aktif sürüm var mı" kararı arşiv yazımıyla AYNI transaction\'da — kök istemciye dokunan kaldırma kırmızı | evet | geçti |
| `URN-PKT-007` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | ayniIslemde (iz) patlarsa arşiv de geri alınır | evet | geçti |
| `URN-PKT-007` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | bağımlılık kararı transaction İÇİNDE — transaction öncesi kök istemciye dokunan kurulum kırmızı | evet | geçti |
| `URN-PKT-008` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | aynı sürüm numarasıyla İÇERİĞİ DEĞİŞMİŞ paket reddedilir (SÜRÜM); sürüm kaydı ve içerik değişmez; aynı içerik idempotent; yeni numara geçer | evet | geçti |
| `URN-PKT-008` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | değişmez alan (sektör · lisans) aynı sürümde değişemez; betimleyici alan (ad) değişebilir ve madde kimlikleri korunur | evet | geçti |
| `URN-PKT-009` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | kurulu bir paket bağımlıysa kaldırma reddedilir; bağımlı kaldırılınca kaldırılır | evet | geçti |
| `URN-PKT-009` | Ürünleştirme | SERVER · INTEGRATION | `paket-kur.test.ts` | kaldırılan paket aynı içerikle geri kurulur: arşiv taslak taslağa döner, madde kimlikleri korunur, paket kurulu | evet | geçti |
| `URN-PKT-011` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `bekci/aktif-suzgec.test.ts` | her okuma sorgusu ve eşleme içermesi `aktif: true` süzer — pasif satır ekrana inmez | evet | geçti |
| `URN-PKT-011` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-aktif-bayragi.test.ts` | v2 bir sözlük satırını ve bir özniteliği bırakır: satır aktif=false, sözlük okuyucu ve rol anahtarı görmez | evet | geçti |
| `URN-PKT-011` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-aktif-bayragi.test.ts` | kaldırma paketin sözlük ve özniteliklerini pasifler; aynı içerikle geri kurulum aktifler (bırakılan yine pasif) | evet | geçti |
| `URN-PKT-011` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-aktif-bayragi.test.ts` | pasif öznitelik Tesis 360 profilinde çizilmez ve profil kaydı onu "bilinmeyen öznitelik" sayar; aktifleşince geri gelir | evet | geçti |
| `URN-PKT-011` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-aktif-bayragi.test.ts` | portföy ölçüyü rolü kapasite olan AKTİF satırdan okur — enerji satırlarında güç dolu; kapasite satırı pasifse ölçülmedi | evet | geçti |
| `URN-PKT-012` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-sablon.test.ts` | JSON form ve rapor geçer, sayılır; dosya adı koddan farklıysa KİMLİK | evet | geçti |
| `URN-PKT-012` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-sablon.test.ts` | XLSX: sayfa ve hücreler dosyaya karşı okunur — yok sayfa, aralık dışı hücre, hücresiz alan BIÇIM; doğru olan geçer | evet | geçti |
| `URN-PKT-012` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-sablon.test.ts` | manifesti kamuya açık ama TELİFLİ ÇERÇEVE taşıyan pakette de XLSX yasak | evet | geçti |
| `URN-PKT-012` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-sablon.test.ts` | telifli pakette XLSX form LİSANS; JSON yapı geçer; hücre var dosya yoksa BIÇIM | evet | geçti |
| `URN-PKT-012` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-sablon.test.ts` | rapor: sıralama alanların permütasyonu olmalı; secim tipi seçenek ister | evet | geçti |
| `URN-PKT-012` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-sablon.test.ts` | kopuk madde referansı KİMLİK ve hiçbir satır yazılmaz; çözülen referansla şablonlar koken=paket yazılır | evet | geçti |
| `URN-PKT-012` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-sablon.test.ts` | kiracı şablonu ezilmez (çelişki); yükseltmede bırakılan şablon pasif; kaldırma pasifler | evet | geçti |
| `URN-PKT-013` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `bekci/rol-sabitleri.test.ts` | CEKIRDEK_ROLLER = ROL_IZINLERI anahtarları | evet | geçti |
| `URN-PKT-013` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `bekci/rol-sabitleri.test.ts` | MODULLER ve ISLEMLER çekirdeğin kullandığı kümeyle birebir — eksik de fazla da kırmızı | evet | geçti |
| `URN-PKT-013` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `bekci/rol-sabitleri.test.ts` | çekirdek roller izin merdivenine uyar: onay yazma ister, yazma okuma ister | evet | geçti |
| `URN-PKT-013` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `bekci/rol-sabitleri.test.ts` | ekranın seçtirdiği roller (sabitler.ROLLER) çekirdek rol kümesinin alt kümesi | evet | geçti |
| `URN-PKT-013` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-rol.test.ts` | geçerli roller sayılır; kapsam ekseni ve sıra varsayılanı; sektörsüz (yatay) paket rol önerebilir | evet | geçti |
| `URN-PKT-013` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-rol.test.ts` | tekrar eden kod ve ÇEKİRDEK rol kodu KİMLİK — paket yönetici/denetim sorumlusunu yeniden tanımlayamaz | evet | geçti |
| `URN-PKT-013` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-rol.test.ts` | bilinmeyen modül, bilinmeyen işlem, boş izin, işlem tekrarı, bilinmeyen eksen BIÇIM | evet | geçti |
| `URN-PKT-013` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-rol.test.ts` | izin merdiveni: onay yazma ister, yazma okuma ister | evet | geçti |
| `URN-PKT-013` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-rol.test.ts` | roller koken=paket yazılır (izinler JSON, eksen, sıra); paket rol kodu çalışma zamanında izin VERMEZ — katalog öneri, kod karar | evet | geçti |
| `URN-PKT-013` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-rol.test.ts` | kiracı rolü ezilmez (çelişki); bırakılan rol pasif, silinmez; yeniden beyan aktifler; kaldırma paket rollerini pasifler | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `bekci/aktif-suzgec.test.ts` | her okuma sorgusu ve eşleme içermesi `aktif: true` süzer — pasif satır ekrana inmez | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | geçerli eşleme satır sayısıyla sayılır; kimlik ve satırlar okunur; metinDahil=true ile açıklama geçer | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | dosya adı ≠ kod KİMLİK; kaynak = hedef çerçeve BIÇIM; paket içi çerçeveye yanlış etiket KİMLİK; CSV yok BIÇIM | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | YAPI KUSURU LİSANS\'TAN ÖNCE: tekrar başlık ve başlığı aşan dolu hücre BIÇIM, o satırda LİSANS üretilmez; eksik/bilinmeyen sütun BIÇIM | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | satır: boş kod KİMLİK, tekrar çift KİMLİK, denklik bilinmiyor BIÇIM, paket içi çerçevede olmayan madde KİMLİK | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | açıklama: telifli pakette, metinDahil=false eşlemede, telifli çerçeveye karşı LİSANS (sebep adıyla); > 200 karakter BIÇIM | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | eşlemeler koken=paket, aktif, denklik ve açıklamayla yazılır; sayılır | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | paketin KENDİ eşlemesi bağ değildir: aynı etiketle yenilenen taslak eşlemeleri yeniden yazar; kiracının eşlemesi bağdır: yenileme SÜRÜM | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | kurulu çerçeveye eşleme: yalnız eşleme taşıyan yatay paket; başka kökenli eşleme çelişki; bırakılan pasif, yeniden beyan aktif; kaldırma pasifler | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | kurulu çerçeve çözümü: yanlış sürüm etiketi KİMLİK, olmayan madde KİMLİK, telifli kurulu çerçeveye açıklama LİSANS — hiçbir satır yazılmaz | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | iki eşlemeden birine düşen sürüm: kalan yeniden yazılır, düşen RAPORA girer | evet | geçti |
| `URN-PKT-014` | Ürünleştirme | DOMAIN · SERVER · INTEGRATION | `paket-esleme.test.ts` | hiçbir eşleme düşmeyen yenilemede rapor 0 der — yeniden yazım "bırakıldı" sayılmaz | evet | geçti |
| `URN-PKT-015` | Ürünleştirme | DOMAIN · INTEGRATION | `paket-demo.test.ts` | DEMO-TR-ORTAK · DEMO-TR-ENERJI · DEMO-TR-SU: 0 hata, sayılar, özetler dosyalarla eşit, bağımlılık ortak pakete | evet | geçti |
| `URN-PKT-015` | Ürünleştirme | DOMAIN · INTEGRATION | `paket-demo.test.ts` | sözlük ve öznitelik şeması tohum sabitleriyle birebir: enerji 13 + 9, su 5 + 1 — sabit ile paket ayrışamaz | evet | geçti |
| `URN-PKT-015` | Ürünleştirme | DOMAIN · INTEGRATION | `paket-demo.test.ts` | ÖLÇÜLEN KAYIP: ISO 27001 telifli — 4 madde metinsiz, kanıt tipi korunur; CBDDÖ/SPK/EPDK metinli; EPDK 27 madde, 15 kanıt tipi, 6 kanıt beklentisi | evet | geçti |
| `URN-PKT-015` | Ürünleştirme | DOMAIN · INTEGRATION | `paket-demo.test.ts` | denklikler: ortak 2 + enerji 6 = tohumun 8 elle denkliği; ISO hedefli eşlemede açıklama yok | evet | geçti |
| `URN-PKT-015` | Ürünleştirme | DOMAIN · INTEGRATION | `paket-demo.test.ts` | tohumun kiracı katmanı (madde → BT/OT alanı) paketlerin 38 maddesini kapsar — fazlası, eksiği yok | evet | geçti |
| `URN-PKT-015` | Ürünleştirme | DOMAIN · INTEGRATION | `paket-demo.test.ts` | üç paket kurulu; sözlük 18 · öznitelik 10 · regülasyon 4 · eşleme 8 paket kökenli ve aktif; 4 çerçeve sürümü aktif, taslak yok; her madde sürümlü; ISO maddesi TELIFLI_METIN; kanıt tipi ve BT/OT bağı yerinde | evet | geçti |
| `URN-PKT-015` | Ürünleştirme | DOMAIN · INTEGRATION | `paket-demo.test.ts` | kanit_tipi sütunu: kod olmayan değer BIÇIM; kurulumda Madde.kanitTipi, Regulasyon.surum ve yururlukTarih paket kimliğinden yazılır | evet | geçti |
| `URN-PKT-016` | Ürünleştirme | DOMAIN · SERVER · UI | `paketler-mantik.test.ts` | hâl: disk × veritabanı birleşik karar — bilinmeyen kaynak başarı gibi görünmez | evet | geçti |
| `URN-PKT-016` | Ürünleştirme | DOMAIN · SERVER · UI | `paketler-mantik.test.ts` | eylemler: düğme yetkisize gösterilir ve nedeni yazılır; bağımlı ve aktif çerçeve kaldırmayı engeller; diskte yok kurmayı engeller, kaldırmayı değil | evet | geçti |
| `URN-PKT-016` | Ürünleştirme | DOMAIN · SERVER · UI | `paketler-mantik.test.ts` | ekran kaynağı: "aktifleştirme insan kararı" cümlesi kalıcı; hiçbir aktifleştirme eylemi çağrılmaz; kaldırma gerekçe ister | evet | geçti |
| `URN-PKT-016` | Ürünleştirme | DOMAIN · SERVER · UI | `paketler-mantik.test.ts` | rota gezinmede ve envanterde: Uyum alanının ikincil sırasında Regülasyonlar\'ın yanında, rotalar.json\'da, rota haritasında | evet | geçti |
| `URN-PKT-016` | Ürünleştirme | DOMAIN · SERVER · UI | `paketler-veri.test.ts` | tohumlanmış veritabanı + depo paketleri: üç demo paketi güncel, iskeletler kurulu değil; bağımlılar ve çerçeve sayıları | evet | geçti |
| `URN-PKT-016` | Ürünleştirme | DOMAIN · SERVER · UI | `paketler-veri.test.ts` | geçici kök: yeni sürüm → güncelleme var; bozuk manifest → doğrulanamadı (hatalar listelenir); dizin yok → diskte yok; paket kökü yok → kökHatasi | evet | geçti |
| `URN-PKT-016` | Ürünleştirme | DOMAIN · SERVER · UI | `paketler-veri.test.ts` | kaldırma (arşiv) → hâl arşiv, diskte varsa geri kurulabilir; kaldırılan paket bağımlılar listesinden düşer | evet | geçti |
| `URN-PKT-017` | Ürünleştirme | DOMAIN | `paket-oscal.test.ts` | satırlar → OSCAL → satırlar birebir; belirteçler ASCII, Türkçe kod prop\'ta korunur; uuid deterministik | evet | geçti |
| `URN-PKT-017` | Ürünleştirme | DOMAIN | `paket-oscal.test.ts` | bilinmeyen değer prop olarak yazılmaz; tarih bilinmiyorsa last-modified uydurulmaz | evet | geçti |
| `URN-PKT-017` | Ürünleştirme | DOMAIN | `paket-oscal.test.ts` | telifli çerçevede statement/guidance prose LİSANS, uzun başlık LİSANS; kamuya açık metinsiz kimlikte prose LİSANS; temiz katalog geçer ve sayılır | evet | geçti |
| `URN-PKT-017` | Ürünleştirme | DOMAIN | `paket-oscal.test.ts` | tekrar kod KİMLİK, katalog kodu kimlikle uyuşmazsa KİMLİK, bozuk katalog BIÇIM, seviye aralık dışı BIÇIM | evet | geçti |
| `URN-PKT-017` | Ürünleştirme | DOMAIN | `paket-oscal.test.ts` | İÇ İÇE grup okunur: alt aile ve maddeleri sessizce düşmez | evet | geçti |
| `URN-PKT-017` | Ürünleştirme | DOMAIN | `paket-oscal.test.ts` | telifli çerçevede OKUNMAYAN metin alanı (yabancı prose/prop) LİSANS ile reddedilir | evet | geçti |
| `URN-PKT-017` | Ürünleştirme | DOMAIN | `paket-oscal.test.ts` | grup derinlik sınırı SESSİZ KAYIP üretmez: kendi kontrolleri okunur, aşan grup uyarıya düşer | evet | geçti |
| `URN-PKT-017` | Ürünleştirme | DOMAIN | `paket-oscal.test.ts` | katalog SÜRÜMÜ kimlikle uyuşmalı; ns\'siz yabancı prop bizim sanılmaz | evet | geçti |
| `URN-PKT-017` | Ürünleştirme | DOMAIN | `paket-oscal.test.ts` | yabancı katalog: kod prop\'u yok, gruplu — grup üst madde, id kod, sıra gezinti sırası | evet | geçti |
| `URN-PKT-018` | Ürünleştirme | DOMAIN · SERVER · UI | `paketler-mantik.test.ts` | eylemler: düğme yetkisize gösterilir ve nedeni yazılır; bağımlı ve aktif çerçeve kaldırmayı engeller; diskte yok kurmayı engeller, kaldırmayı değil | evet | geçti |
| `URN-PKT-018` | Ürünleştirme | DOMAIN · SERVER · UI | `paketler-veri.test.ts` | geçici kök: yeni sürüm → güncelleme var; bozuk manifest → doğrulanamadı (hatalar listelenir); dizin yok → diskte yok; paket kökü yok → kökHatasi | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | kaynağı olan çerçevede metinli madde kaynak_url + erisim_tarihi taşır; taşımayan KAYNAK | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | kaçış kapısı kapalı: kaynak adresini SİLMEK muafiyet vermez — çerçeve ya kaynağını ya temsilîliğini beyan eder | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | kaynak_url adres olmalı, tarihler takvimde olmalı, kaynak_yeri konumdur | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | metinsiz madde köken istemez — "metin girilmedi" hâli boş bırakılır, uydurulmaz | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | metinli her maddede kaynak adresi ve erişim tarihi var; metinsiz madde uydurma köken taşımaz | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | yedi ekin ölçümü: aile · kontrol · metni olan — hiçbiri tahmin değil | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | kademe DÖRT kanonik sınıftır: ham dize sadık, gruplama anahtarı tek | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | Ek-3: 565 kontrol, 57 "Ek Kontrol" seviyesiz ve OPTIONAL — seviyesizlik sıfır değil | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | lisans: kamuya açık, metin dâhil, FSEK md. 31 dayanağı kimliklerde yazılı | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-iskeletler.test.ts` | TR-ENERJI artık içerikli: iki çerçeve de metin taşır ve her metinli madde KÖKEN taşır | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `paket-uygulanabilirlik.test.ts` | madde köken alanları veritabanına iner: kaynak adresi, belge içi konum, erişim ve yürürlük tarihi | evet | geçti |
| `URN-PKT-019` | Ürünleştirme | DOMAIN · SERVER | `uyum-metin-durumu.test.ts` | notsuz hücrede sabit gerekçe olmaz; gerçek metin ilk cümlesiyle gerekçe olur | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | geçerli beyan: çekirdek ve paket türleri, kuralda kullanılan öznitelik | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | tanınmayan tür KAPSAM TÜRÜ; paketin olmayan özniteliği ÖZNİTELİK | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | kuraldaKullanilir=false alan koşulda kullanılamaz | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | işleç–değer uyumu: >= sayı, icinde liste, = tek değer ister | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | kural ya herhangi ya hepsi taşır; iç içe koşul da doğrulanır | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | kapsamTuru alanı yalnız icinde/= ile ve tanınan tür değeriyle | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-icerik.test.ts` | iki çerçeve de uygulanabilirlik beyan eder; beyan dayanağını (madde) yazar | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-uygulanabilirlik.test.ts` | kurulum kuralı köken paket olarak yazar; koşul beyandan türer, karar YAZILMAZ | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-uygulanabilirlik.test.ts` | koşul değişince kural sürümü artar; aynı koşulda artmaz | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-uygulanabilirlik.test.ts` | beyan bırakılınca kural PASİF — satır durur, motor koşmaz | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-uygulanabilirlik.test.ts` | kiracının kendi kuralına dokunulmaz; kaldırma paket kuralını pasifler, silmez | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `paket-uygulanabilirlik.test.ts` | türü listede olan öğe kapsamda, olmayan kapsam dışı; gerekçe türü yazar | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `uygulanabilirlik.test.ts` | `icinde` işleci: kapsam öğesi TÜRÜ paket beyanından okunur | evet | geçti |
| `URN-PKT-020` | Ürünleştirme | DOMAIN · SERVER | `uygulanabilirlik.test.ts` | paket beyanının türü, aynı adlı bir ÖZNİTELİKLE ezilemez | evet | geçti |
| `URN-PKT-021` | Ürünleştirme | SERVER · UI | `paket-uygulanabilirlik.test.ts` | paket kurulur: sekiz çerçeve TASLAK, 3 803 madde, hiçbir sürüm aktif değil | evet | geçti |
| `URN-PKT-021` | Ürünleştirme | SERVER · UI | `paket-uygulanabilirlik.test.ts` | /uyum: çerçeve görünür ve "aktif sürüm yok · N madde taslak" der — 0 kontrol demez | evet | geçti |
| `URN-PKT-021` | Ürünleştirme | SERVER · UI | `paket-uygulanabilirlik.test.ts` | /uyum: yedi ekin madde sayısı ÖLÇÜLEN sayıyla aynı, hiçbiri kendiliğinden aktif değil | evet | geçti |
| `URN-PKT-021` | Ürünleştirme | SERVER · UI | `paketler-mantik.test.ts` | seçilen TASLAK çerçeve gösterilir — satırı olan çerçeveye kaymaz | evet | geçti |
| `URN-PKT-021` | Ürünleştirme | SERVER · UI | `uyum-taslak-serit.test.ts` | şerit taslak dalını tanır ve dört ölçütü de bilinmeyene çevirir | evet | geçti |
| `URN-PKT-021` | Ürünleştirme | SERVER · UI | `uyum-taslak-serit.test.ts` | taslak dalı sayısal ölçüt taşımaz — "0 Uygunsuz" iyi haber gibi okunur | evet | geçti |
| `URN-KUR-009` | Kurulum | DOMAIN | `arama-kosulu.test.ts` | kip SAĞLAYICIDAN gelir: PostgreSQL duyarsız kip gönderir, SQLite göndermez | evet | geçti |
| `URN-KUR-009` | Kurulum | DOMAIN | `arama-kosulu.test.ts` | sağlayıcı bağlantı dizesinden çözülür; tanınmayan şema SESSİZCE SQLite olmaz | evet | geçti |
| `URN-KUR-009` | Kurulum | DOMAIN | `arama-kosulu.test.ts` | TEST_PG_URL ürünü yönetemez: yalnız test koşumunda okunur | evet | geçti |
| `URN-KUR-009` | Kurulum | DOMAIN | `arama-kosulu.test.ts` | arama büyük/küçük harf duyarsızdır — iki sağlayıcıda da | evet | geçti |
| `URN-KUR-009` | Kurulum | DOMAIN | `pg-gocu.test.ts` | taban göçü ELLE YAZILAN DDL\'i taşır: dokuz tetikleyici ve üç indeks | evet | geçti |
| `URN-KUR-009` | Kurulum | DOMAIN | `pg-gocu.test.ts` | canlı kapı ÜÇ değişmez tabloyu da sınar — DDL\'i olup sınanmayan tablo kalmaz | evet | geçti |
| `URN-KUR-009` | Kurulum | DOMAIN | `pg-gocu.test.ts` | SQLite zincirindeki elle yazılan DDL, PostgreSQL tarafında KARŞILIKSIZ kalmaz | evet | geçti |
| `URN-KUR-009` | Kurulum | DOMAIN | `pg-gocu.test.ts` | PostgreSQL ad kısaltması YALANCI kırmızı üretmez | evet | geçti |
| `URN-KUR-010` | Kurulum | DOMAIN | `bekci/gunluk-sir.test.ts` | sunucu kodunda çıplak console.* çağrısı yok | evet | geçti |
| `URN-KUR-010` | Kurulum | DOMAIN | `bekci/gunluk-sir.test.ts` | sır kokan anahtarın DEĞERİ yazılmaz, adı yazılır | evet | geçti |
| `URN-KUR-010` | Kurulum | DOMAIN | `bekci/gunluk-sir.test.ts` | anahtar tanıma büyük/küçük harf ve ayraç duyarsızdır | evet | geçti |
| `URN-KUR-010` | Kurulum | DOMAIN | `bekci/gunluk-sir.test.ts` | hata nesnesi yığın izi olmadan yazılır — iz iç yol sızdırır | evet | geçti |
| `URN-KUR-010` | Kurulum | DOMAIN | `bekci/gunluk-sir.test.ts` | derin nesne sonsuza inmez | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | `KimlikSaglayici` yalnız REFERANS taşır | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | `MfaKaydi` düz sır değil ZARF taşır | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | `MfaKurtarmaKodu` kodu değil ÖZETİ tutar | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | SABOTAJ: `istemciSirri` sütunu eklenmiş bir şema YAKALANIR | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | zod şemasında `...Referansi` dışında sır alanı yok | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | çözülmüş bir sır BU DOSYADAN geçmez — `siriCoz` çağrılmaz | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | ize giden metin MASKELİDİR | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | `siriCoz` bu dosyada çağrılmaz | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | yalnız `sirMaskesi` (adres) kullanılır | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | istemci bileşenine giden tipte sır DEĞERİ alanı yok | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | `mfaGirisDogrula` `use server` dosyasından ihraç EDİLMEZ | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | giriş doğrulaması tekrar engelini KOŞULLU yazar | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | başarılı TOTP girişi İZ bırakır | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | `sirZarfi` alanına yazan her yol `sifrele()`den geçer | evet | geçti |
| `URN-KML-001` | Kurulum | DOMAIN · SERVER | `bekci/kimlik-sir.test.ts` | şifreleme anahtarı REFERANSTAN çözülür, koda gömülmez | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | yedek alır, doğrular ve göç durumunu raporlar | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | var olan yedeğin ÜSTÜNE YAZMAZ | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | MANTIKSAL karşılaştırma bayt karşılaştırması değildir | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | içerik özeti VERİ DEĞİŞİNCE değişir — yoksa hiçbir şey ölçmezdi | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | BOZUK yedek sessizce kabul edilmez | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | olmayan yedek ve manifestsiz dizin açıkça reddedilir | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | sağlayıcı bağlantıdan çözülür; tanınmayan şema HATADIR | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | kanıt dosyalarını ALIR ve manifeste anahtar · boyut · özet yazar | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | BOŞ depoda "dosya: 0" ölçülür — "kanıt dosyası yok" denmez | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | DEPOSU ÖLÇÜLEMEYEN yedek DOĞRULANMIŞ sayılmaz | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | BOŞ DİZE `dosyaHash` iki sağlayıcıda da "özet yok" sayılır | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | yedekten SİLİNEN kanıt dosyası doğrulamada ADIYLA çıkar | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | yedekte DEĞİŞTİRİLEN kanıt dosyası ÇÜRÜK diye çıkar | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | veritabanının BEKLEDİĞİ ama yedekte olmayan dosya EKSİK diye çıkar | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | `dosyaHash` ile TUTMAYAN dosya ÇÜRÜK diye çıkar | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | kanıt SÜRÜMLERİNİN dosyaları da beklenenler arasındadır | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | BOŞ ortama geri yükler: veritabanı ve kanıt dosyaları geri gelir | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | DOLU ortama üstüne yazmaz — geri yükleme veri kaybettirir | evet | geçti |
| `URN-KUR-011` | Kurulum | DOMAIN | `yedek-araci.test.ts` | SAĞLAYICILAR ARASI geri yükleme reddedilir | evet | geçti |
| `URN-KUR-012` | Kurulum | DOMAIN | `bekci/ortam-semasi.test.ts` | geçerli ortam çözülür ve hata listesi BOŞTUR | evet | geçti |
| `URN-KUR-012` | Kurulum | DOMAIN | `bekci/ortam-semasi.test.ts` | AYRIŞTIRILAMAYAN PostgreSQL dizesi ADIYLA reddedilir | evet | geçti |
| `URN-KUR-012` | Kurulum | DOMAIN | `bekci/ortam-semasi.test.ts` | SESSİZCE YANLIŞ HOSTA ayrışan dize de reddedilir | evet | geçti |
| `URN-KUR-012` | Kurulum | DOMAIN | `bekci/ortam-semasi.test.ts` | UNIX SOKET ve IPv6 biçimleri REDDEDİLMEZ | evet | geçti |
| `URN-KUR-012` | Kurulum | DOMAIN | `bekci/ortam-semasi.test.ts` | URL kodlanmış parola KABUL edilir — kural dizeye, parolaya değil | evet | geçti |
| `URN-KUR-012` | Kurulum | DOMAIN | `bekci/ortam-semasi.test.ts` | TANINMAYAN sağlayıcı sessizce SQLite olmaz | evet | geçti |
| `URN-KUR-012` | Kurulum | DOMAIN | `bekci/ortam-semasi.test.ts` | BOZUK sayı ve mantık değeri varsayılana DÜŞMEZ, hata verir | evet | geçti |
| `URN-KUR-012` | Kurulum | DOMAIN | `bekci/ortam-semasi.test.ts` | kurulumda verilmesi gereken anahtarlar ADIYLA sayılıdır | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | tam beyan temizdir; kaynakta karşılığı olmayan alan null ile beyan edilir | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | beyanı hiç olmayan çerçeve kırmızıdır ve dolu sütunları sayar | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | dolu ama BEYANSIZ sütun kırmızıdır — kusurun ölçülmüş hâli | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | dosyada boş kalan sütunun beyanı ÖLÜ beyandır | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | bir ürün alanı iki kez beyan edilemez — hangi kaynağın yazıldığı belirsiz kalır | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | temsilî çerçeve beyan EDEMEZ (kaynak belgesi yok), beyansızlığı da kırmızı değildir | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | pakette olmayan çerçeveye beyan ölü atıftır | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | ürün alanındaki yazım hatası yutulmaz; gerekçe kısaltılamaz | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | boş beyan listesi beyan değildir | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | paketler/ altındaki HER paket doğrulayıcıdan temiz geçer | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | EPDK "Seviye" kademesi gereksinim_tipi olarak beyanlıdır, seviye sütunu BOŞTUR | evet | geçti |
| `URN-PKT-022` | Ürünleştirme | DOMAIN | `paket-alan-eslemesi.test.ts` | beyan yazan her paketin manifesti şemayı geçer ve gerekçeleri maliyet cümlesi değildir | evet | geçti |
| `URN-PKT-010` | Ürünleştirme | DOMAIN | `bekci/paket-silme.test.ts` | madde dışında HİÇBİR modelde delete/deleteMany yok — tavan sıfır, istisna listesi yok | evet | geçti |
| `URN-PKT-010` | Ürünleştirme | DOMAIN | `bekci/paket-silme.test.ts` | madde silmesi yalnız paketin kendi taslağını (`surumId` süzgeci) hedefler ve bağ kontrolünden sonra gelir | evet | geçti |
| `URN-PKT-010` | Ürünleştirme | DOMAIN | `bekci/paket-silme.test.ts` | şemada Madde\'den başka modele giden HER liste ilişkisi bağ kontrolünde; listede şemada olmayan ilişki yok | evet | geçti |
| `URN-PKT-010` | Ürünleştirme | DOMAIN | `bekci/paket-silme.test.ts` | istisna listesi yok: kurucu modülü gerekçeli dışlama ihraç etmez | evet | geçti |

## Gerekçesiyle kütüksüz kalan dosyalar

| Dosya | Neden senaryosu yok |
| --- | --- |
| `olcum-tabani.test.ts` | Ölçüm kapsamı tabanı — sıfır ölçümle geçen kapı sınıfı |
| `tek-nusha.test.ts` | Tek nüsha değişmezi — ortak davranışın ikinci tanımı ve ikiz liste dosyası |
| `kesif-karari.test.ts` | Test keşfi sıfır dönerse ölçüm değil kırık sayılır |
| `belge-sayimlari.test.ts` | Belgelerdeki sayıların koda karşı doğrulaması |
| `tasarim-belgesi.test.ts` | DESIGN.md jeton değerlerinin kabuk.css'e karşı doğrulaması |
| `senaryo-kutugu.test.ts` | Kütüğün kendi nöbetçisi |
| `ters-kapsam.test.ts` | Ters kapsamanın nöbetçisi — davranış envanterini kütüğe karşı sayar |
| `eylem-dili.test.ts` | Bozuk durum bloklarının eylem/beklenen-durum nöbetçisi |
| `bagimlilik-guvenligi.test.ts` | Bağımlılık ağacının güvenlik taraması |
| `kalite-kapilari.test.ts` | Kapı betiklerinin varlığı |
| `kalite-borcu-listesi.test.ts` | Kalite borcu izin listesinin okunabilirliği — muafiyet mantığından BAĞIMSIZ iddia, bilerek ayrı dosyada |
| `semantik.test.ts` | Ortak durum sözlüğünün tutarlılığı |
| `alan-metin.test.ts` | Metin yardımcılarının saf davranışı |
| `alan-surum.test.ts` | Sürüm karşılaştırma yardımcısı |
| `alan-ag.test.ts` | Ağ adresi yardımcıları |
| `kisit-mesaji.test.ts` | Veritabanı kısıt mesajlarının insan diline çevrimi |
| `istemci-adresi.test.ts` | İstemci adresi çözümleme yardımcısı |
| `turkiye-siniri.test.ts` | Coğrafi sınır verisinin tutarlılığı |
| `yedek-araci.test.ts` | Ürünün kendi yedekleme aracı |
| `xlsx-ayristirma.test.ts` | Tablo ayrıştırıcısının saf davranışı |
| `arama-kosulu.test.ts` | Arama koşulu üreticisinin saf davranışı |
| `olculmemis-gosterimi.test.ts` | Ölçülmemiş değer gösterim sözlüğü |
| `saha-yerlesim.test.ts` | Saha yerleşim sözlüğü |
| `saha-arka-plan.test.ts` | Saha arka plan seçimi |
| `kabuk-inceleme.test.ts` | Kabuk gramerinin statik incelemesi |
| `ekran-mantik-72.test.ts` | Ekran mantığı toplu regresyonu |
| `uc-deger-kurali.test.ts` | Üç değerli mantığın sözlüğü |
| `omur-ufuk.test.ts` | Ömür şeridinin aciliyet bantları — ölçek işaretinin saf mantığı |
| `kapi-farki.test.ts` | Kapı farkı ölçüsünün saf kuralları — hangi betik CI'da koşuyor |
| `kirpan-ata.test.ts` | Düzen kapısının kırpan-ata yürüyüşü — kaydırılabilen içerik kayıp sayılmaz |
| `inceleme-30.test.ts` | Bir inceleme turunun beş bulgusunun düzeltme kanıtı — birlikte okunmaları gerekir |
| `bekci/sunucu-eylem-ihraci.test.ts` | `'use server'` dosyasının ihraç kuralı — nesne ihracı çalışma zamanında 500 verir, tsc ve lint göremez |
| `denetim-sablon.test.ts` | Paket form şablonunun doldurulması — çekirdek yalnız doldurur; bağlanmayan şablon alanı formu dolu göstermez |
| `denetim-formu-eylem.test.ts` | Denetim formu eyleminin kapsam denetimi ve iz kaydı — kapsam dışı istek reddedilir, sessizce daraltılmaz |
| `denetim-formu.test.ts` | Denetim formunun saf kuralları — hiçbir hücre boş kalmaz, gerekçe uydurulmaz, hedef ile mevcut olgunluk karışmaz |
| `derleme-artefakti.test.ts` | Paylaşılan derleme artefaktının ortam beyanı — beyansız tüketim ve gizli yol tuzağı |
| `disa-aktarim-xlsx.test.ts` | XLSX üretiminin saf kuralları — formül hücresi üretilmez, kalkan CSV ile aynı |
| `bildirim-kaydi.test.ts` | Olaydan doğan mevzuat bildiriminin saf kuralları — motor GÖNDERMEZ, süresiz yükümlülükte geri sayım yoktur, referanssız gönderim reddedilir |
| `bildirim-kaydi-eylem.test.ts` | Bildirim zincirinin kendisi — olaydan taslak doğar, ikinci koşuda ikinci taslak açılmaz, insan kararı iz bırakır |
| `bildirim-donemi.test.ts` | Takvim tetikli yükümlülüğün saf kuralları — dönem yoksa pencere yok, teslim süresi yoksa sayaç yok, motor VERMEZ |
| `bildirim-donemi-zincir.test.ts` | Dönem zincirinin kendisi — periyottan dönem doğar, ikinci koşuda ikinci dönem açılmaz, kapalı döneme motor dokunmaz |
| `bildirim-donemi-eylem.test.ts` | Dönemi kapatan insan kararı — referanssız teslim reddedilir, tesise kısıtlı rol kurumsal yükümlülüğe dokunamaz, eşzamanlı iki karar sessizce ezişmez |
| `takvim-ekrani.test.ts` | Raporlama takvimi ekranının saf katmanı — dönemsiz yükümlülük listeden düşmez, sayacı olmayan satır bilinmeyen sınıfında durur |
| `kimlik-oidc.test.ts` | OIDC saf katmanı — sahte bir IdP'ye karşı imza, iss, aud, nonce ve exp doğrulaması; alg karıştırma ve yeniden oynatma reddi |
| `kimlik-totp.test.ts` | TOTP ve oturum politikası saf katmanı — RFC vektörleri, ±1 adım penceresi, tekrar engeli, 12/2 varsayılanı |
| `kimlik-akis.test.ts` | Kurum hesabıyla giriş zinciri — tanınmayan sub reddedilir ve kullanıcı açılmaz, JIT açıkken bile hesap yetkisiz doğar |
| `kimlik-mfa-zincir.test.ts` | MFA zinciri — TOTP sırrı veritabanında zarflı durur, kurtarma kodu bir kez kullanılır, zorunlu politikada kayıt kaldırılamaz |
| `kimlik-saglayici-eylem.test.ts` | Kimlik sağlayıcı yönetimi — sır DEĞERİ kabul edilmez, kaydet/bağla/aktif et üç ayrı karardır, yapılandırma değişince bağ düşer |
| `bekci/disa-aktarim-kapsami.test.ts` | Dışa aktarım kapsamı EKRAN kapsamından geniş olamaz — yüzey listesi türetilir, kapsam kararı tek kaynaktan okunur |
| `bekci/bildirim-motoru.test.ts` | Motor dosyaları METİN olarak taranır: insan kararı olan durum kodu motora yazılamaz |
| `ithal-zinciri.test.ts` | Araç zincirinin YAPISAL ölçüsü — bir aracın ihracı silinince ya da dosyası üzerine yazılınca kırmızı; modül ÇALIŞTIRILMADAN ölçülür |
| `kapi-is-kapsami.test.ts` | Kapı kümesinin İŞ katmanı — iş adları türetilir, bölünmeyle hiçbir kapı düşmez |
| `sunucu-durdurma.test.ts` | Başarısız OLAMAYAN temizlik adımı sınıfı — süreç adıyla öldürme, sonucu yutan `|| true` ve son koşulunu doğrulamayan adım |


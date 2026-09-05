# Senaryo · test matrisi

Üretilen belge — kaynağı `web/lib/senaryo/` ve `web/tests/`.

| Ölçü | Değer |
| --- | --- |
| Senaryo | 273 |
| Testi olan senaryo | 273 |
| **GAP** | **0** |
| Hayalet işaret (kütükte olmayan kimlik) | 0 |
| Kütüksüz test dosyası | 0 |
| Taranan test dosyası | 139 |

## Katman başına kapsam

| Katman | Senaryo | Testli | GAP |
| --- | --- | --- | --- |
| ACCESSIBILITY | 8 | 8 | 0 |
| API | 12 | 12 | 0 |
| CONCURRENCY | 7 | 7 | 0 |
| DOMAIN | 140 | 140 | 0 |
| ENGINE | 33 | 33 | 0 |
| INTEGRATION | 26 | 26 | 0 |
| MIGRATION | 2 | 2 | 0 |
| RBAC | 32 | 32 | 0 |
| RESPONSIVE | 8 | 8 | 0 |
| SCOPE | 30 | 30 | 0 |
| SERVER | 104 | 104 | 0 |
| UI | 75 | 75 | 0 |
| VISUAL | 4 | 4 | 0 |
| WORKFLOW | 32 | 32 | 0 |

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
| `RAP-URT-001` | Rapor | DOMAIN · UI | `senaryo-platform.test.ts` | kapsam dışı hücre "0 uyum" DEĞİL, kapsam dışıdır | evet | geçti |
| `RAP-URT-002` | Rapor | DOMAIN · SCOPE | `disa-aktarim-paketi.test.ts` | kapsam dışı santral istenirse istek REDDEDİLİR, sessizce daraltılmaz | evet | geçti |
| `IMP-XLS-001` | İçe aktarım | SERVER · DOMAIN | `varlik-aktarim.test.ts` | etiket eşleşmesi güncelleme, eşleşmeyen yeni | evet | geçti |
| `IMP-XLS-002` | İçe aktarım | SERVER · DOMAIN | `varlik-aktarim.test.ts` | sözlük dışı değer ve okunamayan tarih satırı reddeder — uydurulmaz | evet | geçti |
| `ESL-PRF-001` | Eşleme | SERVER · DOMAIN | `esleme-tezgahi.test.ts` | ikinci yayın v2 açar, v1 arşive geçer ve v1 kuralları AYNEN kalır | evet | geçti |
| `ESL-PRF-002` | Eşleme | SERVER · DOMAIN | `esleme-tezgahi.test.ts` | önizleme profil, köken ya da red kaydı YAZMAZ | evet | geçti |
| `SIS-HTA-001` | Sistem | UI | `senaryo-platform.test.ts` | bulunamadı ve hata sayfaları vardır ve dönüş yolu sunar | evet | geçti |
| `SIS-KBK-001` | Sistem | UI · ACCESSIBILITY | `yardim.test.ts` | atla bağı kabuğun ilk çocuğu; tek kabukta TEK `#icerik` sarmalayıcısı var, kabuk main AÇMAZ | evet | geçti |
| `SIS-ERS-001` | Sistem | ACCESSIBILITY · UI | `yardim.test.ts` | dialog rolü, modal, başlık bağı ve odak tuzağı var | evet | geçti |
| `SIS-RSP-001` | Sistem | RESPONSIVE · UI | `senaryo-platform.test.ts` | yatay taşma kapısı ölçülen genişlikleri koda gömer | evet | geçti |
| `SIS-DIL-001` | Sistem | UI | `senaryo-platform.test.ts` | kullanıcıya dönük hiçbir metinde jargon geçmez | evet | geçti |
| `PRT-OZT-001` | Portföy | DOMAIN · UI | `senaryo-platform.test.ts` | ölçülmemiş uyum yüzdesi SIFIRA çekilmez | evet | geçti |
| `PRT-OZT-002` | Portföy | DOMAIN · UI | `plant360-profil.test.ts` | profil kaydı yokken her alan tanımsızdır; gruplar tüm alanları kapsar | evet | geçti |
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

## Gerekçesiyle kütüksüz kalan dosyalar

| Dosya | Neden senaryosu yok |
| --- | --- |
| `belge-sayimlari.test.ts` | Belgelerdeki sayıların koda karşı doğrulaması |
| `senaryo-kutugu.test.ts` | Kütüğün kendi nöbetçisi |
| `ters-kapsam.test.ts` | Ters kapsamanın nöbetçisi — davranış envanterini kütüğe karşı sayar |
| `eylem-dili.test.ts` | Bozuk durum bloklarının eylem/beklenen-durum nöbetçisi |
| `bagimlilik-guvenligi.test.ts` | Bağımlılık ağacının güvenlik taraması |
| `kalite-kapilari.test.ts` | Kapı betiklerinin varlığı |
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


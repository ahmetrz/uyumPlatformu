# Ana senaryo kütüğü

Bu belge **elle yazılmaz.** `web/lib/senaryo/` altındaki kütükten
`node arac/senaryo-belge.mjs --yaz` ile üretilir ve
`tests/senaryo-kutugu.test.ts` sapma olduğu an kırmızı olur.

Senaryo ile test arasındaki bağ, testin **kendi başlığıdır**:

```
it('kapsam dışı varlığa yazılamaz [ENV-YAZ-003]', …)
```

Ayrı bir eşleme tablosu tutulsaydı, tablo ilk yeniden adlandırmada
testten ayrışır ve kimse görmezdi.

Senaryo: **275** · testli: **275** · GAP: **0**

## Aktivite · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AKT-IZL-001` | /aktivite | güvenlik denetçisi · kurum geneli | Seçilen mercek hiçbir kayda uymuyor · yok | Mercek süzgecini uygular | Boş SÜZGEÇ sonucu, hiç kayıt olmamasından ayrı yazılır | Süzgeci temizle eylemi görünür | yazma yok | yok | `ters-kapsam-ekran.test.ts` |
| `AKT-IZL-002` | /aktivite | güvenlik denetçisi · kurum geneli | Bazı panel kaydının aktörü bilinmiyor · kısmi | Metrik bandını okur | Aktörü bilinmeyen kayıt ayrı sayılır; aktör sayısına katılmaz | Aktörsüz kayıt sayısı ayrı metrik | yazma yok | yok | `ters-kapsam-ekran.test.ts` |

## API · 9 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `API-KIM-001` | — | API istemcisi · yok | Anahtar gönderilmiyor · yok | Bir ucu çağırır | 401 döner ve gövdede kayıt bulunmaz | — | yazma yok | yok | `api.test.ts` |
| `API-KIM-002` | — | API istemcisi · yok | Anahtar iptal ya da süresi dolmuş · bayat | Bir ucu çağırır | 401 döner | — | yazma yok | yok | `api.test.ts` |
| `API-KIM-003` | — | güvenlik denetçisi · kurum geneli | Anahtarlar üretilmiş · normal | Anahtar tablosunu inceler | Yalnız SHA-256 özeti ve kısa ön ek saklanır | — | yazma yok | yok | `api.test.ts` |
| `API-KPS-001` | — | API istemcisi · salt okunur | Anahtar salt okunur işaretli · normal | Bir yazma ucunu çağırır | Reddedilir | — | yazma yok | yok | `faz-f-eylem.test.ts` |
| `API-KPS-002` | — | API istemcisi · tek santral | Kurumda başka santraller de var · normal | Varlık listesini okur | Yalnız kendi santralinin kayıtları döner | — | yazma yok | yok | `api.test.ts` |
| `API-KPS-003` | — | geliştirici / denetçi · kurum geneli | — · normal | Uç dosyaları, kapsam listesi ve OpenAPI karşılaştırılır | Üçü de AYNI uç kümesini söyler | — | yazma yok | yok | `faz-f-api-kapsam.test.ts` |
| `API-DGR-001` | — | API istemcisi · anahtarın kapsamı | Zorunlu bir alan eksik · kısmi | Eksik gövdeyle gönderir | 400 döner ve eksik alan adlandırılır | — | yazma yok | yok | `api.test.ts` |
| `API-IDM-001` | — | API istemcisi · anahtarın kapsamı | Aynı kaynak kaydı iki kez gönderiliyor · yinelenen | İkinci isteği gönderir | Kayıt tazelenir, yeni satır açılmaz | — | Köken kaydı | yok | `entegrasyon-cekirdek.test.ts` |
| `API-SZL-001` | /api-sozlesmesi | güvenlik denetçisi · kurum geneli | Aktif anahtarların bazısının kapsamı tanımsız · kısmi | Sözleşme ekranının özet cümlesini okur | Kapsamı tanımsız anahtar ÖNCE söylenir; "hepsi salt okunur" cümlesi onu gizleyemez | Hiç anahtarın erişmediği uç bilinmeyen işaretiyle durur | yazma yok | yok | `ters-kapsam-ekran.test.ts` |

## Bildirim · 3 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `BLD-KTU-001` | /bildirimler | herhangi bir kullanıcı · kendi kutusu | Okunmamış bildirim var · normal | Bildirimler ekranını açar | Yalnız kendi kutusundakiler görünür | Sayaç sıfırda rozet çizmez | yazma yok | yok | `bildirim-kutusu.test.ts` |
| `BLD-KTU-002` | /bildirimler | herhangi bir kullanıcı · kendi kutusu | Okunmamış bildirim var · normal | Okundu işaretler | Yalnız kendi kutusunda okundu olur; kayıt kapanmaz | Sayaç düşer | Bildirim · guncelleme | yok | `bildirim-kutusu.test.ts` |
| `BLD-KTU-003` | /bildirimler | herhangi bir kullanıcı · kendi kutusu | Hiç okunmamış bildirim yok · yok | Kabuktaki sayaca bakar | "En eski okunmamış" SIFIR GÜN değil, ölçülmedi (null) | Sıfırda rozet ÇİZİLMEZ | yazma yok | yok | `bildirim-kutusu.test.ts` |

## Bulgu · 11 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `BUL-LST-001` | /bulgular | uyum uzmanı · kendi santrali | Açık bulgular var · normal | Bulgular ekranını açar | Son tarihi geçen ve yüksek şiddetli bulgular önde | Sürükleyici satırlar kuyruğa inmez | yazma yok | yok | `senaryo-uyum.test.ts` |
| `BUL-LST-002` | /bulgular | uyum uzmanı · kendi santrali | Kapsamda açık bulgu yok · yok | Bulgular ekranını açar | Boş durum "denetlenmedi" ile karıştırılmaz | Boş ilk-durum cümlesi | yazma yok | yok | `senaryo-uyum.test.ts` |
| `BUL-DTY-001` | /bulgular/[id] | uyum uzmanı · kendi santrali | Bulgu kullanıcının kapsamında · normal | Bulgu detayını açar | Zaman çizelgesi, kanıtlar ve aksiyonlar görünür | Denetim izi kronolojik | yazma yok | yok | `senaryo-uyum.test.ts` |
| `BUL-DTY-002` | /bulgular/[id] | uyum uzmanı · tek santral | Bulgu başka santrale ait · normal | Doğrudan adresle açmayı dener | Kayıt bulunamaz olarak döner | Bulunamadı sayfası | yazma yok | yok | `kapsam-ekranlari.test.ts` |
| `BUL-KAP-001` | /bulgular/[id] | uyum uzmanı · kendi santrali | Bulgunun doğrulama kanıtı yok · kısmi | Bulguyu kapatmayı dener | Doğrulama kanıtı olmadan kapatılamaz | Eksik kanıt açıkça yazılır | yazma yok | yok | `capa-dogrulama.test.ts` |
| `BUL-KAP-002` | /bulgular/[id] | uyum yöneticisi · kurum geneli | Aynı kök nedenle bulgu tekrar açılmış · yinelenen | Tekrar motoru koşar | Tekrar işaretlenir ve görev açılır | Tekrar rozeti | Aktivite kaydı | Görev | `faz-e-uyum.test.ts` |
| `BUL-ANL-001` | /bulgular/[id] | uyum uzmanı · kendi santrali | Bulgu kritik, analiz yok · kısmi | Bulguyu kapatmayı dener | Reddedilir; kategori seçmek analiz DEĞİLDİR | Eksik olanın ne olduğu yazılır | yazma yok | yok | `faz-e-eylem.test.ts` |
| `BUL-UYG-001` | /bulgular | sistem (motor) · kurum geneli | Aynı tesis ve kural için açık bulgu var · yinelenen | Motor tekrar koşar | Açık bulgu ÇOĞALTILMAZ | Kapatılmış bulgu koşuyu engellemez | yazma yok | yok | `uygulanabilirlik-bulgu.test.ts` |
| `BUL-KAP-003` | /bulgular/[id] | uyum uzmanı · kendi santrali | Bulgunun bir adımı eksik · kısmi | Kapanış şeridindeki bir adıma tıklar | O adımın işine gidilir — şerit navigatördür, ilerleme süsü değil | Sıradaki iş tek cümleyle ve birincil eylemle yan yana durur | yazma yok | yok | `kapanis-yolu.test.ts` |
| `BUL-KAP-004` | /bulgular/[id] | uyum uzmanı · kendi santrali | Ekranda kök nedene yazan iki ayrı form vardı · çelişen | Kök nedeni kaydeder | Tek yol vardır; kategori ve asgari uzunluk isteyen kapıdan geçilir | Kapının reddettiği hâli üretebilen ikinci form YOKTUR | Bulgu · guncelleme (kokNeden) | yok | `kapanis-yolu.test.ts` |
| `BUL-KAP-005` | /bulgular/[id] | uyum uzmanı · kendi santrali | Kullanıcı düzenleme istemedi · normal | Bulgu kaydını açar | Düzenleme formu KENDİLİĞİNDEN açılmaz; okunabilir özet gelir | Düzenle düğmesi formu açar; geçmiş ana yüzeyde durmaz | yazma yok | yok | `kapanis-yolu.test.ts` |

## Canlı duruş · 9 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DUR-TAZ-001` | /envanter | BT yöneticisi · kendi santrali | Kaynak bağlı, son koşu başarılı, veri poll aralığı içinde · normal | Varlık çekmecesinde Duruş sekmesini açar | Alan "CANLI" olarak işaretlenir | Değer, kaynak adı ve yaş birlikte görünür | yazma yok | yok | `canli-durus.test.ts` |
| `DUR-TAZ-002` | /envanter | BT yöneticisi · kendi santrali | Hiçbir kaynak sistem bağlı değil · yok | Duruş sekmesini açar | "KAYNAK BAĞLI DEĞİL" yazılır; "canlı" YAZILMAZ | Kusur rengi değil, bekleyen kurulum işaretçisi | yazma yok | yok | `canli-durus.test.ts` |
| `DUR-TAZ-003` | /envanter | BT yöneticisi · kendi santrali | Kaynağın sorgu aralığı tanımsız · kısmi | Duruş sekmesini açar | Tazelik "ölçülmedi" der; canlı sayılmaz | Bilinmeyen işaretçisi | yazma yok | yok | `canli-durus.test.ts` |
| `DUR-TAZ-004` | /envanter | BT yöneticisi · kendi santrali | Connector durumu hatalı · kısmi | Duruş sekmesini açar | Alan "kaynak HATALI" der | Hata işaretçisi ve son hata metni | yazma yok | yok | `canli-durus.test.ts` |
| `DUR-CAK-001` | /envanter | BT yöneticisi · kendi santrali | İki kaynak aynı alan için farklı değer bildirmiş · çelişen | Duruş sekmesini açar | En YENİ ölçüm kazanır; öncelik yalnız berabere bozar | Kaybeden kaynaklar çakışma satırında listelenir | yazma yok | yok | `canli-durus.test.ts` |
| `DUR-CAK-002` | /envanter | BT yöneticisi · kendi santrali | Elle girilen değer ile gözlem farklı · çelişen | Duruş sekmesini açar | Ürün envanteri KENDİLİĞİNDEN değiştirmez, çelişkiyi yazar | İki değer yan yana + uyarı cümlesi | yazma yok | yok | `senaryo-envanter.test.ts` |
| `DUR-API-001` | — | API istemcisi · anahtarın kapsamı | Anahtar `asset-state` kapsamı taşıyor · normal | POST /api/v1/asset-state çağırır | Gözlem yazılır; `Varlik` satırına DOKUNULMAZ | — | VarlikDurusGozlemi · olusturma + köken kaydı | yok | `api.test.ts` |
| `DUR-API-002` | — | API istemcisi · anahtarın kapsamı | Gönderilen ölçüm anı kayıttakinden eski · bayat | Eski `observedAt` ile gönderir | Yazma atlanır ve cevapta `stale` olarak SAYILIR | — | yazma yok | yok | `api.test.ts` |
| `DUR-API-003` | — | API istemcisi · tek santral | Hedef varlık başka santralde · normal | Kapsam dışı varlık anahtarıyla gönderir | Reddedilir; hiçbir gözlem yazılmaz | — | yazma yok | yok | `api.test.ts` |

## Değerlendirme aktarımı · 1 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DGA-AKT-001` | /degerlendirme-aktarim | uyum uzmanı · kendi santrali | İki kullanıcı aynı anda aktarıyor · yinelenen | Eşzamanlı iki aktarım denemesi yapılır | Tam biri yazar; kaybeden ize HİÇBİR ŞEY yazmaz | Karara bağlanmış kayıt yeniden karara açılmaz | Tek karar satırı | yok | `yaris-onay-aktarim.test.ts` |

## Denetim · 5 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DEN-LST-001` | /denetimler | uyum yöneticisi · kendi santrali | Denetimler tanımlı · normal | Denetimler ekranını açar | Aşamasıyla birlikte listelenir | Aşama şeridi | yazma yok | yok | `denetim-asama-kanit.test.ts` |
| `DEN-ASM-001` | /denetimler/[id] | uyum yöneticisi · kendi santrali | Aşamanın zorunlu kanıtı eksik · kısmi | Aşamayı ilerletmeyi dener | Zorunlu kanıt olmadan ilerlemez | Eksik kanıt listelenir | yazma yok | yok | `denetim-asama-kanit.test.ts` |
| `DEN-ASM-002` | /denetimler/[id] | uyum uzmanı · tek santral | Denetim başka santrale ait · normal | Aşama değiştirmeyi dener | Reddedilir | Denetim listede yok | yazma yok | yok | `denetim-kapsam.test.ts` |
| `DEN-GRV-001` | /yonetim-tezgahi | görev sorumlusu · kendi santrali | Görev başkasına ait · normal | Başkasının görevini kapatmayı dener | Yazma yetkisi TEK BAŞINA yetmez | Sorumlusu kendi görevini kapatabilir | yazma yok | yok | `gorev-eylem.test.ts` |
| `DEN-LST-002` | /denetimler | uyum yöneticisi · kurum geneli | Kapsamda hiç denetim planlanmamış · yok | Denetimler ekranını açar | Boş liste "denetlendi ve temiz" ile KARIŞTIRILMAZ | Boş ilk-durum; süzgeç boşluğundan ayrı | yazma yok | yok | `ters-kapsam-ekran.test.ts` |

## Dış denetçi · 3 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DNE-ERS-001` | /denetci-erisimi | uyum yöneticisi · kurum geneli | Kullanıcı yetkili · normal | Denetçi erişimi tanımlar | Erişim bitiş tarihiyle açılır | Süresiz erişim verilemez | Erişim kaydı | yok | `senaryo-uyum.test.ts` |
| `DNE-ERS-002` | /denetci-erisimi | dış denetçi · verilen kapsam | Denetçi hesabı aktif · normal | Bir yazma eylemi çağırır | Reddedilir | Yazma yüzeyleri kapalı | yazma yok | yok | `erisim.test.ts` |
| `DNE-ERS-003` | /denetci-erisimi | sistem (motor) · kurum geneli | Erişimin bitiş tarihi geçti · bayat | Süre motoru koşar | Erişim kapanır; kimse elle kapatmayı hatırlamak zorunda kalmaz | Kapanan erişim listede geçmiş olarak durur | Erişim · guncelleme | yok | `faz-f-eylem.test.ts` |

## Doküman · 3 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DOK-SUR-001` | /dokumanlar | uyum uzmanı · kurum geneli | Doküman kütüğü dolu · normal | Dokümanlar ekranını açar | Yürürlükteki sürüm ve onay tarihi görünür | Süresi geçen doküman ayrı işaretlenir | yazma yok | yok | `dokuman-eylem.test.ts` |
| `DOK-SUR-002` | /dokumanlar | uyum uzmanı · kurum geneli | Doküman yönetim sistemi bağlı değil · yok | Doküman kaydına bakar | Sürüm "elle girildi" der; "DYS ile senkron" DEMEZ | Bağlı değil cümlesi | yazma yok | yok | `senaryo-uyum.test.ts` |
| `DOK-KTK-001` | /dokumanlar | uyum uzmanı · kurum geneli | Belge taslak · normal | Taslağı doğrudan yürürlüğe almayı dener | Reddedilir — inceleme adımı atlanamaz | Hangi adımın eksik olduğu söylenir | yazma yok | yok | `dokuman-mantik.test.ts` |

## Eğitim · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `EGT-KAT-001` | /egitimler | uyum yöneticisi · kurum geneli | Eğitim kayıtları var · kısmi | Eğitimler ekranını açar | Katılmayan ile kaydı olmayan ayrı sayılır | "Kayıt yok" ile "katılmadı" farklı | yazma yok | yok | `senaryo-uyum.test.ts` |
| `EGT-MDD-001` | /egitimler | uyum yöneticisi · kurum geneli | Bağ zaten kaldırılmış · yok | Aynı bağı ikinci kez kaldırır | İkinci çağrı hata vermez ve İZ YAZMAZ — idempotent | Ekran değişmez | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Envanter · 29 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ENV-LST-001` | /envanter | BT yöneticisi · kendi santrali | Kullanıcı giriş yapmış ve en az bir santrale yetkili · normal | Envanter ekranını açar | Yalnız yetkili olduğu santrallerin varlıkları listelenir | Metrik şeridi + tablo; başka santralin kaydı görünmez | yazma yok | yok | `envanter-mantik.test.ts` |
| `ENV-LST-002` | /envanter | BT yöneticisi · kendi santrali | Kapsamda hiç varlık yok · yok | Envanter ekranını açar | Boş durum, ilk adımı söyleyen bir cümleyle gösterilir | Boş ilk-durum bloğu; sıfır dolu tablo DEĞİL | yazma yok | yok | `senaryo-envanter.test.ts` |
| `ENV-LST-003` | /envanter | BT yöneticisi · kendi santrali | Varlık var ama seçilen mercek hiçbirine uymuyor · kısmi | Sonuç vermeyen bir mercek seçer | Boş süzgeç durumu ve süzgeci temizleme yolu gösterilir | Boş süzgeç bloğu; "kayıt yok" ile "süzgeç boş" ayrı | yazma yok | yok | `senaryo-envanter.test.ts` |
| `ENV-LST-004` | /envanter | BT yöneticisi · kurum geneli | Kapsamda görünür tavandan çok varlık var · yüksek | Envanter ekranını açar | Sürükleyici satırlar önde kalır, gerisi kuyruğa iner | Görünür satır tavanı aşılmaz; kuyruk sayısı yazılı | yazma yok | yok | `envanter-mantik.test.ts` |
| `ENV-LST-005` | /envanter | BT yöneticisi · kendi santrali | EOS tarihi girilmemiş varlık var · bilinmiyor | Varlık listesine bakar | Ömrü ölçülmemiş varlık "sağlıklı" sayılmaz | Bilinmeyen işaretçisi; sıfır ya da yeşil DEĞİL | yazma yok | yok | `envanter-mantik.test.ts` |
| `ENV-YAZ-001` | /envanter | BT yöneticisi · kendi santrali | Kullanıcı varlığın santraline yazma yetkili · normal | Varlık formunu açıp bir alanı değiştirir ve kaydeder | Değişiklik kaydedilir | Çekmece açık kalır, güncel değer görünür | Varlik · guncelleme · önceki ve yeni değerle | yok | `envanter-eylem.test.ts` |
| `ENV-YAZ-002` | /envanter | salt okuyucu · kendi santrali | Kullanıcının envanter yazma yetkisi yok · normal | Sunucu eylemini doğrudan çağırmayı dener | Eylem reddedilir; hiçbir satır değişmez | Yazma yüzeyi hiç açılmaz | yazma yok | yok | `envanter-eylem.test.ts` |
| `ENV-YAZ-003` | /envanter | BT yöneticisi · tek santral | Hedef varlık başka bir santralde · normal | Kapsam dışı varlığın kimliğiyle güncelleme çağırır | Kapsam kapısı reddeder | Kayıt zaten listede görünmez | yazma yok | yok | `envanter-eylem.test.ts` |
| `ENV-YAZ-004` | /envanter | BT yöneticisi · kendi santrali | Kullanıcının onay yetkisi yok · normal | Varlığı emekliye çıkarmayı dener | Onay yetkisi istenir, geçiş yapılmaz | Yaşam döngüsü formu açılmaz | yazma yok | yok | `envanter-eylem.test.ts` |
| `ENV-DIS-001` | /envanter | BT yöneticisi · kendi santrali | Bir mercek seçili · normal | CSV düğmesine basar | Dosya, ekranda görünen SÜZÜLMÜŞ kümeyi taşır | İndirme başlar; liste değişmez | yazma yok | yok | `senaryo-envanter.test.ts` |
| `ENV-DIS-002` | /envanter | BT yöneticisi · kendi santrali | Kayıtlarda Türkçe karakter, virgül ve tırnak var · normal | CSV dışa aktarır | BOM yazılır, hücreler kaçırılır, satır sonu CRLF olur | Dosya Excel ve LibreOffice'te aynı okunur | yazma yok | yok | `disa-aktarim-csv.test.ts` |
| `ENV-DIS-003` | /envanter | BT yöneticisi · kendi santrali | Bir alan "=" ile başlıyor · kısmi | CSV dışa aktarır | Tehlikeli başlangıç tek tırnakla kaçırılır | Sayı gibi görünen değerler kalkandan muaf | yazma yok | yok | `disa-aktarim-csv.test.ts` |
| `ENV-DIS-004` | /envanter | BT yöneticisi · tek santral | Kurumda başka santrallerin varlıkları da var · normal | Dışa aktarır | Dosyada yalnız görmeye yetkili olduğu kayıtlar bulunur | Satır sayısı ekrandaki ile aynı | yazma yok | yok | `senaryo-envanter.test.ts` |
| `ENV-DIS-005` | /envanter | kurum yöneticisi · kurum geneli | Çok sayıda kayıt var · yüksek | Dışa aktarır | Dosya bozulmadan üretilir | İndirme tamamlanır | yazma yok | yok | `disa-aktarim-csv.test.ts` |
| `ENV-KML-001` | /envanter | BT yöneticisi · kendi santrali | Bazı kimlik alanları boş · kısmi | Kimlik alanları bloğuna bakar | Boş alan "ölçülmedi" der; "yok" DEMEZ | Doluluk oranı uygulanamaz alanları paydaya katmaz | yazma yok | yok | `kimlik-envanteri.test.ts` |
| `ENV-KML-002` | /envanter | BT yöneticisi · kendi santrali | Alan bu cihaz tipinde anlamsız · kısmi | Alanı gerekçesiyle "uygulanamaz" işaretler | Gerekçesiz işaretleme reddedilir | Alan orandan çıkar, ölçüm borcu sayılmaz | Varlik alanı · guncelleme · gerekçeyle | yok | `varlik-durusu-eylem.test.ts` |
| `ENV-YAS-001` | /envanter | BT yöneticisi · kendi santrali | SBOM belgesi yüklenmiş · normal | Yazılım listesi bloğunu açar | Bileşenler ve sürümleri listelenir; sürüm UYDURULMAZ | Okunamayan satır sebebiyle raporlanır, öbürleri kalır | SBOM · olusturma | yok | `varlik-sbom-kapsam-ag.test.ts` |
| `ENV-FRM-001` | /envanter | OT mühendisi · kendi santrali | Taban sürüm tanımlı değil · yok | Firmware bloğuna bakar | Taban yoksa UYUMLU sayılmaz | "Taban tanımlı değil" ayrı bir durumdur | yazma yok | yok | `varlik-durus.test.ts` |
| `ENV-ZAF-001` | /envanter | güvenlik uzmanı · kendi santrali | Cihazın SBOM belgesi yok · bilinmiyor | Zafiyet korelasyonuna bakar | Bileşen zafiyetinden ETKİLENMİŞ sayılmaz | Karar verilemedi; motor insanın kararını ezmez | yazma yok | yok | `varlik-durusu-motor.test.ts` |
| `ENV-AG-001` | /envanter | ağ sorumlusu · kendi santrali | Girilen adres bloğu bozuk · çelişen | Geçersiz bir adres bloğu girer | Reddedilir | Neyin beklendiği yazılır | yazma yok | yok | `varlik-durusu-eylem.test.ts` |
| `ENV-ETK-001` | /envanter | santral sorumlusu · kendi santrali | Varlığın kendi etkisi girilmemiş · bilinmiyor | Üretim etkisine bakar | Etki proses adımından MİRAS alınır; hiçbiri yoksa BİLİNMİYOR | "Yok" ile "bilinmiyor" ayrı yazılır | yazma yok | yok | `faz-b-alan.test.ts` |
| `ENV-SUR-001` | /prosesler | süreç sorumlusu · kendi santrali | Bağın tek noktalığı değerlendirilmemiş · bilinmiyor | Süreç zincirine bakar | Değerlendirilmemiş bağ TEK NOKTA sayılmaz ama ölçüm borcuna girer | Dört hâl dört ayrı sözle yazılır | yazma yok | yok | `faz-b-ekran.test.ts` |
| `ENV-YRS-001` | /envanter | BT yöneticisi · kendi santrali | İki onaylayan aynı geçişi aynı anda deniyor · yinelenen | Eşzamanlı iki geçiş denenir | Yalnız biri yazar; kaybeden AÇIK hata alır | İzde TEK satır kalır | Tek geçiş satırı | yok | `yaris-kosullari.test.ts` |
| `ENV-UYG-001` | /envanter | santral kullanıcısı · tek santral | Varlık başka santralde · normal | Kapsam dışı varlığın işaretini kaldırmayı dener | Reddedilir; işaret DURUR | Yetki cümlesi | yazma yok | yok | `ters-kapsam-eylem.test.ts` |
| `ENV-FRM-010` | /envanter | BT yöneticisi · kendi santrali | Cihaz eski firmware'de · normal | İstisna gerekçesini kaydeder | Uyum DURUMU DEĞİŞMEZ — cihaz hâlâ eski sürümdedir; istisna yalnız "biliniyor ve kabul edildi" der | İstisna rozeti; durum rengi aynı kalır | Varlik · onay (firmwareIstisnasi) | yok | `ters-kapsam-eylem.test.ts` |
| `ENV-PRS-001` | /prosesler | santral kullanıcısı · tek santral | Bağın varlığı başka santralde · normal | Kapsam dışı bağı kaldırmayı dener | Reddedilir; bağ DURUR | Yetki cümlesi | yazma yok | yok | `ters-kapsam-eylem.test.ts` |
| `ENV-FRM-011` | — | sistem (motor) · kurum geneli | Karar önceki koşuyla aynı · yinelenen | Motor tekrar koşar | Aynı karar YENİDEN YAZILMAZ — "bu karar ne zaman değişti" sorusu cevapsız kalmasın | — | yazma yok | yok | `ters-kapsam-eylem.test.ts` |
| `ENV-AGT-001` | — | sistem (motor) · kurum geneli | Bazı varlığın IP adresi ölçülmemiş · bilinmiyor | Motor koşar | Ölçüm borcu AYRI bir kural adıyla yazılır — "ölçemedik" ile "sorun yok" aynı sayılmaz | — | VeriKalitesiBulgusu · olusturma (…_olculemedi) | yok | `ters-kapsam-eylem.test.ts` |
| `ENV-GRN-001` | — | sistem (motor) · kurum geneli | Varlık hiç keşifte görülmemiş · yok | Motor koşar | "Hiç görülmedi" ile "eşikten uzun süre görülmedi" AYRI kurallardır | — | VeriKalitesiBulgusu · olusturma | yok | `ters-kapsam-eylem.test.ts` |

## Eşleme · 5 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ESL-PRF-001` | /esleme | platform yöneticisi · kurum geneli | Profil taslak · normal | Eşleme kuralı ekler ve profili etkinleştirir | Yeni sürüm açılır; eski sürüm EZİLMEZ | Sürüm numarası görünür | Profil · olusturma | yok | `esleme-tezgahi.test.ts` |
| `ESL-PRF-002` | /esleme | platform yöneticisi · kurum geneli | Örnek kayıt girilmiş · normal | Önizleme çalıştırır | Sonuç gösterilir; hiçbir kayıt yazılmaz | Dönüşen alanlar yan yana | yazma yok | yok | `esleme-tezgahi.test.ts` |
| `ESL-PRF-003` | /esleme | platform yöneticisi · kurum geneli | Alan kaynaktan hiç gelmiyor · bilinmiyor | Eşlemeyi önizler | Gelmeyen alan SIFIR değil BİLİNMEYENdir | Varsayılan bir ÖLÇÜM DEĞİLDİR | yazma yok | yok | `esleme.test.ts` |
| `ESL-SZL-001` | /esleme | entegrasyon uzmanı · kurum geneli | Eşleme tezgâhı açık · normal | Alan sözlüğünü okur | Sözlük hedef alanların KOPYASINI verir; çağıran onu değiştirerek kaynağı bozamaz | Alan listesi tek kaynaktan | yazma yok | yok | `ters-kapsam-eylem.test.ts` |
| `ESL-BAG-001` | /esleme | entegrasyon uzmanı · kurum geneli | Profil başka connector tipi için yazılmış · çelişen | Tipi tutmayan profili bağlamayı dener | Reddedilir — yükte hiçbir alan bulunamayacağı için kayıtlar sessizce boş geçerdi | Hata iki tipi de adlandırır | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Eşleştirme · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ESL-MTR-001` | /eslestirme | uyum uzmanı · kurum geneli | Eşleştirme kayıtları var · normal | Eşleştirme matrisine bakar | Karşılığı olmayan madde boş bırakılır, uydurulmaz | Bilinmeyen ayrı işaretlenir | yazma yok | yok | `senaryo-uyum.test.ts` |
| `ESL-MTR-002` | /eslestirme | uyum uzmanı · kurum geneli | Denklik "ilgili" düzeyinde · kısmi | Matris hücresine bakar | "İlgili" bir BİLİNMEYEN DEĞİLDİR — zayıf ama kayıtlı bir karardır | Elmas değil planlı işaretçisi alır | yazma yok | yok | `senaryo-uyum.test.ts` |

## Gözden geçirme · 4 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GZD-DON-001` | /gozden-gecirme | uyum yöneticisi · kurum geneli | Dönem sonu yaklaşmış · normal | Gözden geçirme ekranını açar | Bekleyen kalemler ve son tarih görünür | Geciken kalem ayrı sayılır | yazma yok | Görev | `senaryo-uyum.test.ts` |
| `GZD-DON-002` | /gozden-gecirme | uyum yöneticisi · kurum geneli | Toplantı tarihi geçmiş ama yapılmamış · bayat | Gözden geçirme listesine bakar | Kayıt "gecikmiş plan" olur | Planlı ile gecikmiş plan ayrı işaretlenir | yazma yok | Görev | `senaryo-uyum.test.ts` |
| `GZD-KRR-001` | /gozden-gecirme | uyum yöneticisi · kurum geneli | Karara bağlı görev açık · normal | Kararı tamamlandı olarak işaretler | Bağlı görev de kapanır — iş iki yerde ayrı ayrı kapatılmaz | Görev kuyruğunda kalmaz | GozdenGecirmeKarari · guncelleme (durum) | yok | `ters-kapsam-eylem.test.ts` |
| `GZD-KRR-002` | /gozden-gecirme | uyum yöneticisi · kurum geneli | Gerekçe girilmemiş · kısmi | Kararı gerekçesiz iptal etmeyi dener | Reddedilir — iptal gerekçe ister | Eksik alan adlandırılır | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Harita · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `HRT-KNM-001` | /harita | kurum yöneticisi · kurum geneli | Koordinatı olmayan santral var · kısmi | Haritayı açar | Koordinatsız santral uydurma bir yere KONMAZ | Listede ayrıca sayılır | yazma yok | yok | `harita-mantik.test.ts` |
| `KNM-KRD-001` | /tesisler/[id] | santral sorumlusu · kendi santrali | Yalnız enlem girildi · kısmi | Koordinatı kaydetmeyi dener | YARIM koordinat reddedilir | Silme meşrudur; iki alan birlikte boşaltılabilir | Tesis · guncelleme | yok | `konum-apianahtar-eylem.test.ts` |

## İçe aktarım · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `IMP-XLS-001` | /ice-aktarim | BT yöneticisi · kendi santrali | Dosya geçerli · normal | Dosyayı yükler | Kayıtlar ayrıştırılır ve önizlenir | Yazmadan önce ne olacağı gösterilir | yazma yok | yok | `varlik-aktarim.test.ts` |
| `IMP-XLS-002` | /ice-aktarim | BT yöneticisi · kendi santrali | Dosyada eksik/bozuk satır var · kısmi | Dosyayı yükler | Bozuk satır reddedilir ve sebebi yazılır | Kaç satır kabul, kaç satır ret — ayrı | Reddedilen kayıt | yok | `varlik-aktarim.test.ts` |

## Kanıt · 8 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `KNT-LST-001` | /kanitlar | uyum uzmanı · kendi santrali | Kanıt tazelik eşiği aşılmış · bayat | Kanıtlar ekranını açar | Bayat kanıt ayrı işaretlenir | Eşik konsoldan gelir | yazma yok | Görev | `kanitlar-mantik.test.ts` |
| `KNT-YUK-001` | /kanitlar | uyum uzmanı · kendi santrali | Kullanıcı yazma yetkili · normal | Kanıt ekler | Kanıt kaydedilir ve özeti alınır | Kanıt listesinde görünür | Kanit · olusturma | yok | `faz-d-eylem.test.ts` |
| `KNT-YUK-002` | /kanitlar | uyum uzmanı · tek santral | Kanıt başka santrale ait · normal | Kanıt listesine bakar | Kayıt listede yoktur | Sayaçlar da kapsamla sınırlı | yazma yok | yok | `kanit-kapsam.test.ts` |
| `KNT-SHP-001` | /kanitlar | uyum yöneticisi · kurum geneli | Kanıtın sahibi de yükleyeni de yok · kısmi | Veri kalitesi motoru koşar | Sahipsiz kanıt bulgusu açılır | Sağlık ekranında görünür | Bulgu | Veri kalitesi bulgusu | `senaryo-uyum.test.ts` |
| `KNT-PKT-001` | /raporlar/kanit-paketi | uyum yöneticisi · kendi santrali | Kanıtlar seçili · normal | Paket üretir | Paket üretilir ve içindekiler listelenir | İmza yoksa paket "imzasız" der | Paket kaydı | yok | `disa-aktarim-paketi.test.ts` |
| `KNT-PKT-002` | /raporlar/kanit-paketi | uyum yöneticisi · kendi santrali | İmzalama altyapısı bağlı değil · yok | Paket üretir | Paket "imzasız" olarak işaretlenir | Bağlı değil cümlesi ve ürünün ne yaptığı yazılı | Paket kaydı | yok | `senaryo-uyum.test.ts` |
| `KNT-DEP-001` | /kanitlar | uyum uzmanı · kendi santrali | Dosya diskte değiştirilmiş · çelişen | Kanıt dosyasını okur | Sessizce sağlam DÖNMEZ; özet doğrulaması düşer | Boş dosya reddedilir | yazma yok | yok | `faz-d-kanit-deposu.test.ts` |
| `KNT-TAZ-001` | /ayarlar | kurum yöneticisi · kurum geneli | Eşik B sınıfı bir ayardır · normal | Eşiği doğrudan yazmayı dener | B sınıfı ayar doğrudan yazılamaz; öneri–onay ister | Konsolda sınıf ve hedef görünür | Değişiklik önerisi | Onay merkezi | `kanit-tazelik-ayar.test.ts` |

## Kimlik · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `KIM-HSP-001` | /kimlik | BT yöneticisi · tek santral | Hesap başka santralde açılmak isteniyor · normal | Hesap açmayı dener | Reddedilir; santralsiz hesap kapsamsız yetki ister | Ayrıcalık ÜÇ DURUMLUDUR — null "yok" değildir | yazma yok | yok | `kimlik-eylem.test.ts` |
| `KIM-ERS-001` | /kimlik | güvenlik uzmanı · kendi santrali | Bazı alanlar ölçülmemiş · bilinmiyor | Erişim değerlendirmesine bakar | null ile false KARIŞTIRILMAZ — biri ihlal, öteki boşluk | Kritik olmamak "kritikliği düşük" demek değildir | yazma yok | Görev | `erisim-degerlendirme.test.ts` |

## Konfigürasyon tabanı · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TAB-KNF-001` | /tabanlar | OT mühendisi · kendi santrali | Hiç yedek kaydı yok · yok | Sapma durumuna bakar | Sonuç "bilinmiyor" — "yok" DEĞİL | Kaynak bağlı değilken motor temiz kapanır | Koşu kaydı | yok | `konfig-yedek.test.ts` |
| `TAB-DRF-001` | /tabanlar | sistem (motor) · kurum geneli | Yedeğin içerik özeti yok · bilinmiyor | Motor koşar | Karar verilemeyen durum sapma AÇMAZ — özet hesaplayamayan bir kaynak bütün filoyu kırmızıya boyamaz | "Ölçülmedi" yazılır | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Mevzuat · 1 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MEV-KYN-001` | /regulasyonlar | uyum uzmanı · kurum geneli | Takip edilecek kaynak tanımlanmamış · yok | Regülasyonlar ekranını açar | Kaynak yoksa "takip edilmiyor" yazılır | Adres ürünle GELMEZ; kurum tanımlar | yazma yok | yok | `senaryo-uyum.test.ts` |

## Olay · 4 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `OLY-ETK-001` | /olaylar | olay sorumlusu · kendi santrali | Varlığın sistemi tanımlı değil · kısmi | Etki önerisine bakar | Zincir kopar ve "bilinmiyor" der; "etki yok" DEMEZ | Motor etki alanlarına YAZMAZ, yalnız öneri üretir | yazma yok | yok | `olay-etki.test.ts` |
| `OLY-ETK-002` | /olaylar | olay sorumlusu · tek santral | Olay başka santrale taşınmak isteniyor · normal | Olayın santralini değiştirmeyi dener | Hedef santralde de yetki aranır ve reddedilir | Santral seçimi kapsamla sınırlı | yazma yok | yok | `olay-konfigyedek-eylem.test.ts` |
| `OLY-BLD-001` | /olaylar | uyum yöneticisi · kurum geneli | Kural geçmiş olaylarda kullanılmış · normal | Bildirim kuralını siler | Kayıt SİLİNMEZ, pasifleştirilir — geçmiş olayın hangi kurala göre değerlendirildiği kalır | Kural pasif olarak görünür | BildirimYukumlulugu · guncelleme (aktif: true→false) | yok | `ters-kapsam-eylem.test.ts` |
| `OLY-ETK-003` | /olaylar | santral kullanıcısı · tek santral | Olay başka santralde · normal | Kapsam dışı olayın etki önerisini yenilemeyi dener | Reddedilir; hiçbir öneri yazılmaz | Yetki cümlesi | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Operasyon · 3 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `OPR-DEG-001` | /operasyon | operasyon sorumlusu · tek santral | Değişiklik başka santrale ait · normal | Değişiklik kaydetmeyi dener | Reddedilir | Kaydın GERÇEK santrali güncellemede de bağlayıcıdır | yazma yok | yok | `operasyon-tedarikci-eylem.test.ts` |
| `OPR-DEG-002` | /operasyon | operasyon sorumlusu · kendi santrali | Değişiklik BT tarafında · normal | Kapı sayacına bakar | BT değişikliğinin kapısı YOKTUR — "0/5" uydurulmaz | OT değişikliği beş kapı taşır | yazma yok | yok | `operasyon-mantik.test.ts` |
| `OPR-DEG-003` | /operasyon | operasyon sorumlusu · kendi santrali | Değişiklik geri alındı · kısmi | Aşama şeridine bakar | Geri alma döngünün ADIMI DEĞİLDİR — indeksi yoktur | Kapanış hem doğrulanmayı hem geri alınmayı kapsar | yazma yok | yok | `operasyon-mantik.test.ts` |

## Oturum · 6 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `OTR-GRS-001` | /giris | kayıtlı kullanıcı · kendi hesabı | Hesap aktif · normal | Geçerli kimlikle giriş yapar | Oturum açılır | Ana ekrana yönlendirilir | Oturum kaydı | yok | `giris-guvenligi.test.ts` |
| `OTR-GRS-002` | /giris | kimliksiz ziyaretçi · yok | Oturum yok · yok | Korumalı bir ekranı doğrudan açmayı dener | Girişe yönlendirilir; veri sızmaz | Giriş ekranı | yazma yok | yok | `giris-guvenligi.test.ts` |
| `OTR-GRS-003` | /giris | demo kullanıcısı · kurum geneli | Demo oturumu açık · normal | Bir yazma eylemi çağırır | Reddedilir — demo salt okunurdur | Yazma düğmeleri kapalı | yazma yok | yok | `senaryo-platform.test.ts` |
| `OTR-OTR-001` | — | kayıtlı kullanıcı · kendi hesabı | Oturum süresi dolmuş · bayat | Bir istek yapar | Oturum reddedilir | Girişe döner | yazma yok | yok | `oturum-yasam-dongusu.test.ts` |
| `OTR-HSP-001` | /ayarlar | kayıtlı kullanıcı · kendi hesabı | Yeni parola kısa · çelişen | Parolayı değiştirmeyi dener | Reddedilir; alt sınır söylenir | Boş alan sessizdir, kusur cümlesi üretmez | yazma yok | yok | `hesap.test.ts` |
| `OTR-HSP-002` | /ayarlar | kayıtlı kullanıcı · kendi hesabı | Birden çok oturum açık · normal | Tüm oturumları kapatır | Yalnız KENDİ oturumları kapanır | Kaç oturumun kapandığı söylenir | Oturum · guncelleme | yok | `oturum-yasam-dongusu.test.ts` |

## Ömür · 1 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `OMR-EOL-001` | /omur | BT yöneticisi · kendi santrali | Bazı cihazların EOS tarihi girilmemiş · bilinmiyor | Ömür ekranını açar | Tarihi olmayan cihaz "ömrü bitmedi" sayılmaz | Bilinmeyen ayrı sayılır | yazma yok | yok | `envanter-mantik.test.ts` |

## Pasif keşif · 13 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `KES-GRP-001` | /kesif | BT yöneticisi · kendi santrali | Gözlemde eşleşmeyen kayıt var · normal | Keşif ekranını açar | Kayıt "envanterde yok" grubunda sayılır | Yedi grup özeti; sayıların toplamı kayıt sayısına eşit | yazma yok | yok | `pasif-kesif.test.ts` |
| `KES-GRP-002` | /kesif | BT yöneticisi · kendi santrali | Eşleşen varlığın sahibi yok · kısmi | Keşif özetine bakar | Kayıt "sahibi yok" grubuna düşer | Grup tıklanınca liste süzülür | yazma yok | yok | `pasif-kesif.test.ts` |
| `KES-GRP-003` | /kesif | BT yöneticisi · kendi santrali | Kayıt birden çok varlığa uyuyor · çelişen | Keşif özetine bakar | Kayıt "kimlik çakışması" grubuna düşer ve önceliklidir | Çakışma en üstte; güven skoru "ölçülmedi" | yazma yok | yok | `pasif-kesif.test.ts` |
| `KES-GRP-004` | /kesif | BT yöneticisi · kendi santrali | Kayıt eşiği aşan süredir görülmemiş · bayat | Keşif özetine bakar | Kayıt "artık görülmüyor" grubunda; SİLİNMEZ | Eşik konsoldan gelir, koda gömülü değildir | yazma yok | yok | `pasif-kesif.test.ts` |
| `KES-GRP-005` | /kesif | BT yöneticisi · tek santral | Kaydın santrali çözülememiş · bilinmiyor | Keşif ekranını açar | Kayıt görünür ve "yeri belirsiz" grubuna düşer | Santral süzgecinde ayrı bir seçenek | yazma yok | yok | `pasif-kesif.test.ts` |
| `KES-ESL-001` | /kesif | sistem (eşleştirme) · kurum geneli | Gözlemde yalnız IP var · kısmi | Eşleştirme koşar | IP TEK BAŞINA eşleşme kurmaz | Kayıt eşleşmemiş kalır | yazma yok | yok | `pasif-kesif.test.ts` |
| `KES-ONY-001` | /kesif | BT yöneticisi · kendi santrali | Yüksek güvenli bir eşleşme var · normal | Eşleştirme geçişi koşar | CMDB'ye YAZILMAZ; kayıt insan onayı bekler | Beş adımlı tezgâh hattı; karar adımı aktif | yazma yok | yok | `pasif-kesif.test.ts` |
| `KES-ONY-002` | /kesif | BT yöneticisi · kendi santrali | Kullanıcının onay yetkisi yok · normal | Kaydı onaylamayı dener | Reddedilir | Karar düğmeleri açılmaz | yazma yok | yok | `kesif-karar.test.ts` |
| `KES-YSK-001` | /kesif | OT mühendisi · kendi santrali | — · normal | Keşif ekranındaki pasiflik bölümünü açar | Yapılmayan aktif işlemler gerekçeleriyle listelenir | Port tarama · SNMP · Modbus · PLC · aktif paket | yazma yok | yok | `pasif-kesif.test.ts` |
| `KES-YSK-002` | — | güvenlik denetçisi · kurum geneli | — · normal | Adaptör yetenek kütüğünü inceler | Kütükte aktif tarama karşılığı bir kod YOKTUR | — | yazma yok | yok | `adaptor-yetenekleri.test.ts` |
| `KES-KYT-001` | /kesif | BT yöneticisi · kendi santrali | Birden çok kayıt seçili · yüksek | Toplu karar verir | Hepsi tek gerekçeyle kapanır ve iz TOPLU işaretlenir | Tekrarlanan kimlik iki kez işlenmez | Keşif kaydı · karar · toplu | yok | `kesif-karar.test.ts` |
| `KES-KYT-002` | /kesif | platform yöneticisi · kurum geneli | Yapılandırmaya bir adres giriliyor · çelişen | Bulut metadata adresi girer | HER KOŞULDA reddedilir | Düz HTTP de açık izin olmadan reddedilir | yazma yok | yok | `ot40-toplama.test.ts` |
| `KES-ESL-002` | /kesif | sistem (eşleştirme) · kurum geneli | Gözlem seri numarası taşıyor · normal | Eşleştirme koşar | Seri numarasıyla eşleşir ve EN YÜKSEK güveni alır | MAC yazımı farkları aynı kabul edilir | yazma yok | yok | `kesif.test.ts` |

## Portföy · 5 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PRT-OZT-001` | /portfoy | kurum yöneticisi · kurum geneli | Santraller tanımlı · normal | Portföy ekranını açar | Santral başına özet görünür | Ölçülmemiş değer sıfıra çekilmez | yazma yok | yok | `senaryo-platform.test.ts` |
| `PRT-OZT-002` | /tesisler/[id] | santral sorumlusu · kendi santrali | Santral kimliği geçerli · normal | Santral detayını açar | Varlık, uyum, risk ve olay özetleri birlikte görünür | Fotoğrafı olmayan santral tipografik karşılık alır | yazma yok | yok | `plant360-profil.test.ts` |
| `TES-PRF-001` | /tesisler/[id] | santral sorumlusu · kendi santrali | Bazı alanlar boş bırakıldı · kısmi | Profili kaydeder | Boş metin NULL olur — "" ile "bilinmiyor" ayrıdır | Üç durumlu alanlarda false ile null ayrı saklanır | Profil · guncelleme | yok | `tesis360-eylem.test.ts` |
| `TES-PRF-002` | /tesisler/[id] | santral sorumlusu · kendi santrali | İnsan kararı gerekçesiyle yazılmış · çelişen | Uygulanabilirlik motoru yeniden koşar | İnsanın kararı KORUNUR | Elle değiştirildi işareti görünür | Karar satırı | yok | `tesis360-eylem.test.ts` |
| `TES-PRF-003` | /tesisler/[id] | uyum uzmanı · kurum geneli | Yeni santral açıldı, profili yok · yok | Uygulanabilirlik motoru koşar | Karar VERİLMEZ ve veri kalitesi bulgusu açılır | Profil gelince kapsam kendiliğinden hesaplanır | Bulgu | Veri kalitesi bulgusu | `yeniTesis.test.ts` |

## Proje · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PRJ-LST-001` | /projeler | proje sorumlusu · kendi santrali | Projeler tanımlı · normal | Projeler ekranını açar | Durum ve son tarihle listelenir | Geciken proje ayrı işaretlenir | yazma yok | yok | `proje-bagimliligi.test.ts` |
| `PRJ-BAG-001` | /projeler | proje sorumlusu · kendi santrali | Bağımlılık döngü yaratacak · çelişen | Bağımlılık ekler | Döngü reddedilir | Neden reddedildiği yazılır | yazma yok | yok | `proje-bagimliligi.test.ts` |

## Rapor · 3 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RAP-URT-001` | /raporlar | uyum yöneticisi · kendi santrali | Veri var · normal | Raporu dışa aktarır | Sayfa başına Excel ve CSV üretilir | Hangi sayfanın indirileceği açık | yazma yok | yok | `senaryo-platform.test.ts` |
| `RAP-URT-002` | /raporlar | uyum uzmanı · tek santral | Kurumda başka santraller var · normal | Rapor üretir | Yalnız kendi kapsamı raporlanır | Sayılar ekranla aynı | yazma yok | yok | `disa-aktarim-paketi.test.ts` |
| `RAP-URT-003` | /raporlar | uyum yöneticisi · kendi santrali | Hücrenin yarısından çoğu değerlendirilmemiş · bilinmiyor | Rapor matrisine bakar | Yüzde artık hücreyi TEMSİL ETMEZ ve hücre bilinmeyen işareti alır | Bilinmeyen oranı ayrıca yazılır | yazma yok | yok | `senaryo-platform.test.ts` |

## Risk · 3 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RSK-LST-001` | /riskler | risk sorumlusu · kendi santrali | Riskler tanımlı · normal | Riskler ekranını açar | Artık risk sıralamasıyla listelenir | Eşikler konsoldan gelir | yazma yok | yok | `risk-eylem.test.ts` |
| `RSK-LST-002` | /riskler | risk sorumlusu · kendi santrali | Artık risk hesaplanmamış · bilinmiyor | Listeye bakar | "Hesaplanmadı" yazılır; 0 DEĞİL | Bilinmeyen işaretçisi | yazma yok | yok | `risk-eylem.test.ts` |
| `RSK-DTY-001` | /riskler/[id] | risk sorumlusu · kendi santrali | Kullanıcı yazma yetkili · normal | Risk detayında kontrol bağlar | Zincir kurulur | Risk → kontrol → bulgu zinciri görünür | Risk · guncelleme | yok | `risk-eylem.test.ts` |

## Sağlık · 22 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SAG-CON-001` | /saglik | platform yöneticisi · kurum geneli | Connector hiç koşmamış · yok | Sağlık ekranını açar | "Hiç koşmadı" yazılır; sağlıklı SAYILMAZ | Bilinmeyen işaretçisi; yeşil DEĞİL | yazma yok | yok | `entegrasyon-saglik.test.ts` |
| `SAG-CON-002` | /saglik | platform yöneticisi · kurum geneli | Connector durumu kimlik_bekleniyor · kısmi | Sağlık ekranını açar | Bekleyen kurulum adımı olarak gösterilir | Kırmızı DEĞİL | yazma yok | yok | `entegrasyon-saglik.test.ts` |
| `SAG-CON-003` | /saglik | platform yöneticisi · kurum geneli | Ardışık hata sınırı aşılmış · kısmi | Senkronizasyon koşar | Devre kesici connector'ı duraklatır | Durum "hatalı" olur ve görünür | Koşu kaydı | yok | `entegrasyon-hata-modeli.test.ts` |
| `SAG-CON-004` | /saglik | platform yöneticisi · kurum geneli | Kaynak zaman aşımı veriyor · kısmi | Senkronizasyon koşar | Geri çekilmeyle tekrar denenir | Deneme sayısı görünür | Koşu kaydı | yok | `entegrasyon-hata-modeli.test.ts` |
| `SAG-CON-005` | /saglik | platform yöneticisi · kurum geneli | Kaynak 401 döndürüyor · kısmi | Senkronizasyon koşar | Tekrar DENENMEZ | Hata sebebi yazılır | Koşu kaydı | yok | `entegrasyon-hata-modeli.test.ts` |
| `SAG-CON-006` | /saglik | platform yöneticisi · kurum geneli | Aynı kaynak kaydı tekrar geliyor · yinelenen | İkinci koşuyu çalıştırır | Kayıt tazelenir, kopyalanmaz | Yinelenen sayacı artar | Köken kaydı | yok | `entegrasyon-cekirdek.test.ts` |
| `SAG-CON-007` | /saglik | platform yöneticisi · kurum geneli | Connector bir sır referansı taşıyor · normal | Connector çekmecesini açar | Yalnız maske görünür; sır DEĞERİ hiç taşınmaz | Maskelenmiş referans | yazma yok | yok | `saglik-connector.test.ts` |
| `SAG-KUR-001` | /saglik | platform yöneticisi · kurum geneli | Connector yapılandırılmış · normal | Kuru koşu çalıştırır | Hiçbir kayıt YAZILMAZ; sayaçlar gösterilir | Kuru koşu desteklenmiyorsa açıkça söylenir | yazma yok | yok | `entegrasyon-kuru-kosu.test.ts` |
| `SAG-RED-001` | /saglik/reddedilenler | platform yöneticisi · kurum geneli | Reddedilen kayıt var · kısmi | Reddedilenler ekranını açar | Aşama ve sebep listelenir | Kayıt sessizce düşmez | yazma yok | yok | `saglik-reddedilen.test.ts` |
| `SAG-MOT-001` | /saglik | platform yöneticisi · kurum geneli | Motor kütüğü dolu · normal | Sağlık ekranını açar | Her motorun son koşusu ve sonucu görünür | Hiç koşmamış motor ayrı gösterilir | yazma yok | yok | `saglik-mantik.test.ts` |
| `SAG-MOT-002` | — | geliştirici / denetçi · kurum geneli | — · normal | Kütük, sözlük ve iş tanımları karşılaştırılır | Üçü de AYNI motor kümesini söyler | — | yazma yok | yok | `saglik-mantik.test.ts` |
| `SAG-KOK-001` | /saglik | platform yöneticisi · kurum geneli | Kaydın köken satırı yok · bilinmiyor | Köken bölümüne bakar | Kayıt MANUEL sayılır; "otomatik" kovasına GİRMEZ | null "ölçülmedi" yazar, 0 "%0" yazar — ikisi ayrı | yazma yok | yok | `koken.test.ts` |
| `SAG-KOK-002` | /saglik | BT yöneticisi · tek santral | Parti içinde kapsam dışı bir kayıt var · kısmi | Toplu doğrulama yapar | Kapsam dışı TEK kayıt bütün partiyi durdurur | Yarım onay bırakılmaz | yazma yok | yok | `koken-kapsam.test.ts` |
| `SAG-SRT-001` | /saglik | platform yöneticisi · kurum geneli | Adaptör bağlı değil · yok | Sertifikasyon raporuna bakar | Bağlantı isteyen kontroller "uygulanamaz"dır, "kaldı" DEĞİL | Eksik sır bir kusur değil, kurulum adımıdır | yazma yok | yok | `connector-sertifika.test.ts` |
| `SAG-YAP-001` | /saglik | platform yöneticisi · kurum geneli | Sır referansı biçimi bozuk · çelişen | Yapılandırmayı kaydetmeyi dener | Reddedilir; sır DEĞERİ hiç istenmez | Form kayıtlı referansı geri doldurmaz | yazma yok | yok | `entegrasyon-yapilandirma.test.ts` |
| `SAG-ESL-001` | /esleme | platform yöneticisi · kurum geneli | Hiçbir güven kuralı tanımlı değil · bilinmiyor | Önizleme çalıştırır | Güven ÖLÇÜLMEDİ (null) — sıfır DEĞİL | Varsayılan bir ÖLÇÜM DEĞİLDİR | yazma yok | yok | `esleme.test.ts` |
| `SAG-ADV-001` | /saglik | güvenlik uzmanı · kurum geneli | Gelen belge bozuk · çelişen | Duyuru belgesini yükler | İstisna FIRLATILMAZ; reddedilen olarak gerekçesiyle döner | Boş dizi bir hata değildir | Reddedilen kayıt | yok | `advisory.test.ts` |
| `SAG-VKL-001` | /saglik | platform yöneticisi · kurum geneli | Entegrasyon tabloları boş · yok | Veri kalitesi motoru koşar | Aktarım kuralları YANLIŞ POZİTİF üretmez | Sessizlik de bir sözleşmedir ve ölçülür | Koşu kaydı | yok | `veri-kalitesi-aktarim.test.ts` |
| `SAG-VKL-002` | /saglik | platform yöneticisi · kurum geneli | Eşleşen varlığın sahibi yok · kısmi | Veri kalitesi motoru koşar | Bulgu VARLIK başına açılır, gözlem başına DEĞİL | Aynı cihaz için beş bulgu üretilmez | Bulgu | Veri kalitesi bulgusu | `veri-kalitesi-aktarim.test.ts` |
| `SAG-KOS-001` | /saglik | BT yöneticisi · kurum geneli | Connector tanımlı · normal | Kuru koşu başlatır | Hiçbir kayıt YAZILMAZ; yalnız koşu özeti ve iz üretilir | Kuru koşu ayrı işaretlenir | Connector · kuru_kosu | yok | `ters-kapsam-eylem.test.ts` |
| `SAG-KOS-002` | /saglik | BT yöneticisi · kurum geneli | Tetikleyen değeri sözlükte yok · çelişen | Tanımsız bir tetikleyen adıyla senkronizasyon çağırır | Reddedilir; koşu AÇILMAZ | Hata cümlesi tetikleyeni adlandırır | yazma yok | yok | `ters-kapsam-eylem.test.ts` |
| `SAG-ETK-001` | /saglik | BT yöneticisi · kurum geneli | Connector kimlik ister ama sır referansı tanımsız · kısmi | Connector'ı etkinleştirmeyi dener | Reddedilir — sır referansı olmadan etkinleştirilemez | Eksik olanın ne olduğu yazılır | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Saha · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SAH-GRS-001` | / | herhangi bir kullanıcı · kendi kapsamı | Bazı santralin fotoğrafı yok · kısmi | Saha ekranını açar | Fotoğrafı olmayan santral BAŞKA santralin görselini almaz | Tipografik geri düşüş; görsel ödünç alınmaz | yazma yok | yok | `ters-kapsam-ekran.test.ts` |
| `SAH-GRS-002` | / | herhangi bir kullanıcı · kendi kapsamı | Hiç anlık görüntü alınmamış · yok | Saha ekranını açar | Eğilim şeridi null kalır — düz sıfır çizgisi ÇİZİLMEZ | "Ölçülmedi" yazılır; eğilim uydurulmaz | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Saklama · 1 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SAK-SUR-001` | /saklama | uyum yöneticisi · kurum geneli | Saklama süresi tanımlanmamış · yok | Saklama ekranını açar | Süre uydurulmaz; "tanımlanmadı" yazılır | Dayanak alanı boşsa imha önerilmez | yazma yok | yok | `faz-f-saklama-denetci.test.ts` |

## Sayım · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SAY-KMP-001` | /sayim | BT yöneticisi · kendi santrali | Kapsamda hiç varlık yok · yok | Sayım açmayı dener | Açılmaz — sıfır paydalı kampanya olamaz | Neden açılmadığı yazılır | yazma yok | yok | `faz-g-varlik.test.ts` |
| `SAY-KMP-002` | /sayim | BT yöneticisi · kendi santrali | Satır "bulunamadı" işaretlendi · kısmi | Sonucu kaydeder | Varlık SİLİNMEZ — envanterden düşürme ayrı bir karardır | "Sayılmadı" ile "bulunamadı" ayrı durumlardır | Sayım satırı · guncelleme | yok | `faz-g-eylem.test.ts` |

## Sistem · 38 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SIS-HTA-001` | — | herhangi bir kullanıcı · kendi kapsamı | Adres yok · yok | Geçersiz bir adres açar | Bulunamadı sayfası ve dönüş yolu gösterilir | Ana ekrana bağ | yazma yok | yok | `senaryo-platform.test.ts` |
| `SIS-KBK-001` | — | herhangi bir kullanıcı · kendi kapsamı | Kullanıcı giriş yapmış · normal | Rotalar arasında gezinir | Aktif bölüm gezinmede işaretlidir | Her sayfada tek bir ana bölge bulunur | yazma yok | yok | `yardim.test.ts` |
| `SIS-ERS-001` | — | klavye kullanıcısı · kendi kapsamı | Fare kullanılmıyor · normal | Sekme ile gezinir | Odak görünür ve sıra mantıklıdır | Çekmecede odak tuzağı ve ESC çalışır | yazma yok | yok | `yardim.test.ts` |
| `SIS-RSP-001` | — | sahadaki kullanıcı · kendi kapsamı | Ekran dar · normal | Ekranı daraltır | Sayfa yatay kaymaz; içerik yeniden akar | Kritik bilgi gizlenmez | yazma yok | yok | `senaryo-platform.test.ts` |
| `SIS-DIL-001` | — | son kullanıcı · kendi kapsamı | — · normal | Ekranlardaki metinleri okur | Kullanıcıya dönük metinlerde teknik jargon yoktur | Türkçe, kısa, kurumsal | yazma yok | yok | `senaryo-platform.test.ts` |
| `SIS-KPS-001` | — | geliştirici / denetçi · kurum geneli | — · normal | Ekran kapısı ile sunucu kapısı karşılaştırılır | İki kapı AYNI yanıtı verir | Ekran sunucudan dar da geniş de değildir | yazma yok | yok | `ekran-yazma-kapisi.test.ts` |
| `SIS-KPS-002` | — | geliştirici / denetçi · kurum geneli | — · normal | Kapsam sonrası bildiren her eylem taranır | Ön kapı TEK BAŞINA yetki VERMEZ; ikinci aşama zorunludur | — | yazma yok | yok | `kapsam-kapisi.test.ts` |
| `SIS-GVN-001` | — | güvenlik denetçisi · tek santral | Kapsam dışı kayıt veritabanında GERÇEKTEN var · normal | Liste, filtre ve yazma yolları denenir | Hiçbiri kaydı döndürmez, ima etmez ya da yazdırmaz | Açıkça istenen kapsam dışı sorgu 403 döner | yazma yok | yok | `guvenlik-negatif.test.ts` |
| `SIS-SIR-001` | — | güvenlik denetçisi · kurum geneli | Sır referansı tanımlı · normal | Sır katmanı çözümlenir | Yalnız referans saklanır; tanınmayan sağlayıcı denetimden GEÇMEZ | Bağlı olup olmadığı ayrıca bildirilir | yazma yok | yok | `sir-katmani.test.ts` |
| `SIS-ALT-001` | /saglik | platform yöneticisi · kurum geneli | Zorunlu bir kontrol ölçülemedi · bilinmiyor | Hazırlık özetine bakar | HAZIR cümlesi KURULMAZ | Ölçülemeyen zorunlu kontrol ayrı sayılır | yazma yok | yok | `ot48-49-altyapi.test.ts` |
| `SIS-KPS-003` | — | geliştirici / denetçi · kurum geneli | — · normal | Bütün sunucu eylemleri taranır | Kapsam sonrası bildiren her eylem ikinci aşamayı GERÇEKTEN çağırır | — | yazma yok | yok | `kapsam-kapisi-nobetci.test.ts` |
| `SIS-GOC-001` | — | platform yöneticisi · kurum geneli | Yeni bir göç uygulanacak · normal | Göçler uygulanır ve şema doğrulanır | Tablo ve tetikleyici sayısı korunur; yabancı anahtar temizdir | — | Göç kaydı | yok | `senaryo-platform.test.ts` |
| `SIS-GOC-002` | — | güvenlik denetçisi · kurum geneli | Kanıt sürüm geçmişi yazılmış · normal | Geçmişi değiştirmeyi ya da silmeyi dener | Veritabanı tetikleyicisi REDDEDER | — | yazma yok | yok | `senaryo-platform.test.ts` |
| `SIS-GRS-001` | — | tasarım denetçisi · kurum geneli | — · normal | Tasarım kapısı koşturulur | Kontrast, font ve eski tasarım izi kusuru SIFIRDIR | Tek palet; açık temaya geçiş yok | yazma yok | yok | `senaryo-platform.test.ts` |
| `SIS-GRS-002` | — | son kullanıcı · kendi kapsamı | Kayıt adları uzun · yüksek | Dar bantta ekranları gezer | Kırpılan kritik bilgi ve yatay taşma SIFIRDIR | Geniş içerik kendi kabında kayar | yazma yok | yok | `senaryo-platform.test.ts` |
| `SIS-KPS-004` | — | kimliksiz ziyaretçi · yok | Oturum yok · yok | Bir sunucu eylemini doğrudan çağırır | Kapı "oturum gerekli" diye reddeder | — | yazma yok | yok | `yetki-kapisi.test.ts` |
| `SIS-KPS-005` | — | salt okuyucu · kurum geneli | Rolün modülde yazma izni yok · normal | Bir yazma eylemi çağırır | İlk kapı TEK BAŞINA reddeder — ikinci aşamaya kalmaz | Yazma yüzeyi hiç açılmaz | yazma yok | yok | `yetki-kapisi.test.ts` |
| `SIS-KPS-006` | — | uyum uzmanı · kurum geneli | Yetki yalnız uyum modülüne verilmiş · normal | Envanter modülünde yazma dener | Reddedilir | Modül kısıtı diğer modülleri kapatır | yazma yok | yok | `yetki-kapisi.test.ts` |
| `SIS-KPS-007` | — | BT yöneticisi · tek santral | Kaydın santrali kullanıcının kapsamı dışında · normal | Kayıt okunduktan sonra kapsam kapısı sorulur | Eyleme özel mesajla reddedilir | Kullanıcı neyin eksik olduğunu okur | yazma yok | yok | `yetki-kapisi.test.ts` |
| `SIS-KBK-010` | /uyum | uyum uzmanı · kurum geneli | Uyum alanı açık · normal | İkincil gezinme sırasına bakar | Sıra sarar; 16 bağın hepsi görünür | İkinci satır çizilir, hiçbir bağ ekran dışında kalmaz | yazma yok | yok | `kabuk-gezinme.test.ts` |
| `SIS-KBK-011` | /uyum | uyum uzmanı · kurum geneli | Geniş ekran · normal | Sıranın taşma davranışı okunur | Kaydırma çubuğu gizlenerek taşma saklanmaz | Kayan ama ipucu vermeyen sıra YOK | yazma yok | yok | `kabuk-gezinme.test.ts` |
| `SIS-KBK-012` | /uyum | uyum uzmanı · kurum geneli | Sıra iki satıra sarmış · normal | Sıranın yüksekliği okunur | Yükseklik içerikle büyür (sabit değil) | İkinci satır tam görünür | yazma yok | yok | `kabuk-gezinme.test.ts` |
| `SIS-KBK-013` | /uyum | saha kullanıcısı · tek santral | Ekran eni 375px · normal | Sırayı parmakla yana kaydırır | Sıra yatay kayar — dar bantta sarma çözüm değildir | Bağlar kırpılmadan kaydırılabilir | yazma yok | yok | `kabuk-gezinme.test.ts` |
| `SIS-KBK-014` | /uyum | uyum uzmanı · kurum geneli | Pencere 1440px · yüksek hacim | Bağların toplam eni hesaplanır | Toplam en pencereyi aşar | Tek satır bu alanı taşıyamaz | yazma yok | yok | `kabuk-gezinme.test.ts` |
| `SIS-KBK-015` | /uyum | uyum uzmanı · kurum geneli | Pencere 1280px · yüksek hacim | Sıranın kaç satıra sardığı hesaplanır | Hiçbir alan iki satırı aşmaz | Gövdenin yeri korunur | yazma yok | yok | `kabuk-gezinme.test.ts` |
| `SIS-KBK-016` | /uyum | saha kullanıcısı · tek santral | Dar bant · uzun içerik | En uzun bağ adı ölçülür | Hiçbir bağ dar bandın yarısını aşmaz | Gezinme etiketi yarım okunmaz | yazma yok | yok | `kabuk-gezinme.test.ts` |
| `SIS-KBK-017` | /envanter | BT yöneticisi · kurum geneli | Pencere 1024px · Varlık grubu açık · normal | Grubun alt ekranlarının toplam eni hesaplanır | Sıra sığar — saramadığı için sığmak zorundadır | Alt ekranların hepsi görünür | yazma yok | yok | `kabuk-gezinme.test.ts` |
| `SIS-KBK-018` | — | ürün ekibi · kurum geneli | Yeni bir ekran eklendi · normal | Rota envanteri sayfa ağacıyla karşılaştırılır | Kabuklu her statik sayfa envanterde | Listede olmayan ekran hiçbir kapıdan geçmez | yazma yok | yok | `kabuk-gezinme.test.ts` |
| `SIS-UXD-001` | — | ürün ekibi · kurum geneli | Yeni bir ekran eklendi · normal | Denetim belgesi rota envanteriyle karşılaştırılır | Her ekranın kendi denetim bölümü var | Belge "hepsini denetledik" derken doğru söyler | yazma yok | yok | `senaryo-kutugu.test.ts` |
| `SIS-UXD-002` | — | ürün ekibi · kurum geneli | Denetimde bulgu var · kısmi | Bulgu kimlikleri tabloyla karşılaştırılır | Her kimlik P0–P3 ve açık/kapatıldı taşır | Önemsiz ya da durumsuz bulgu kalmaz | yazma yok | yok | `senaryo-kutugu.test.ts` |
| `SIS-BSL-001` | — | herhangi bir kullanıcı · kendi kapsamı | Ekranın vurgusu boş kalabiliyor · yok | Ekran açılır ve H1 okunur | Başlık cümle parçası değil | Ekran okuyucu ve arama sonucu anlamlı bir ad görür | yazma yok | yok | `ekran-basligi.test.ts` |
| `SIS-BSL-002` | — | herhangi bir kullanıcı · kendi kapsamı | Ekran bir isterden doğmuş · normal | Ekran künyesi okunur | Künyede UY-/OT- kodu geçmez | Kod ürün belgesinde kalır | yazma yok | yok | `ekran-basligi.test.ts` |
| `SIS-ERS-002` | — | klavye kullanıcısı · kendi kapsamı | Tablo seçilebilir değil · normal | Satırın imlecine ve rolüne bakılır | Seçilemeyen satır işaretçi imleci taşımaz | Sahte tıklama çağrısı yok | yazma yok | yok | `senaryo-platform.test.ts` |
| `SIS-ERS-003` | — | klavye kullanıcısı · kendi kapsamı | Ekranda grid ya da sekme listesi var · normal | Widget içinde odaklanabilir bir durak aranır | Rol varsa gezinen odak da vardır | Tab ile girilir, ok tuşlarıyla gezilir | yazma yok | yok | `senaryo-platform.test.ts` |
| `SIS-BKM-001` | /bakim | herhangi bir ziyaretçi · yok | Bakım bitiş saati bilinmiyor · bilinmiyor | Bakım ekranını açar | Bitiş saati bilinmiyorsa "bilinmiyor" yazılır; süre TAHMİN EDİLMEZ | Kayıt okumaz; oturum istemez | yazma yok | yok | `ters-kapsam-ekran.test.ts` |
| `SIS-TKN-001` | /sistem | tasarımcı / geliştirici · kurum geneli | Token değerleri stil dosyasında · normal | Tasarım sistemi ekranını açar | Değerler `app/kabuk.css` OKUNARAK gelir; ekranda elle yazılmış renk yoktur | Kaynak tek — ekran stil dosyasından ayrışamaz | yazma yok | yok | `ters-kapsam-ekran.test.ts` |
| `SIS-BLS-001` | /sistem/bilesenler | tasarımcı / geliştirici · kurum geneli | Galeri bileşen kütüğü · yok | Bileşen galerisini açar | Boş · ölçülmedi · bağlı değil · kısmi · hata durumlarının HEPSİ galeride yer alır | Ekranlar bozuk durumu tutarsız çizemez | yazma yok | yok | `ters-kapsam-ekran.test.ts` |
| `SIS-KYR-001` | — | geliştirici / işletme · kurum geneli | Aynı adla sağlayıcı zaten kayıtlı · yinelenen | Aynı adla ikinci sağlayıcı kaydeder | Reddedilir — üzerine yazmak AÇIKÇA istenmelidir; sessiz değişim işleri görünmez biçimde başka kuyruğa yollardı | — | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Taşınabilir medya · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MED-KRT-001` | /tasinabilir-medya | güvenlik uzmanı · kendi santrali | Medya zararlı bulundu · normal | Tarama sonucunu kaydeder | Medya kendiliğinden KARANTİNAYA alınır | Karantinadaki medyaya kullanım kaydı girilemez | Medya · guncelleme | yok | `faz-g-eylem.test.ts` |
| `MED-KRT-002` | /tasinabilir-medya | güvenlik uzmanı · kendi santrali | Şifreleme durumu girilmemiş · bilinmiyor | Medya kaydına bakar | Şifreleme ÜÇ DEĞERLİDİR; ölçülmemiş `null` kalır | Onaysız kullanım reddedilmez, UYARIYLA kaydedilir | Medya · guncelleme | yok | `faz-g-eylem.test.ts` |

## Tedarikçi · 1 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TED-OTR-001` | /tedarikciler | güvenlik uzmanı · kendi santrali | Hiç kayıt yok · yok | Tedarikçi oturumlarına bakar | Durum "kaynak bağlı değil" — "oturum yok" DEĞİL | Uyumsuz ile bilinmeyen ayrı sayılır | yazma yok | yok | `tedarikci-oturum.test.ts` |

## Tesis · 1 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TES-YON-001` | /tesisler | herhangi bir kullanıcı · kendi kapsamı | Eski adres yer imlerinde · yok | /tesisler adresini açar | Kanon listeye yönlendirilir; derin bağ kırılmaz | İki ayrı santral listesi tutulmaz | yazma yok | yok | `ters-kapsam-ekran.test.ts` |

## Topoloji · 4 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TOP-SAP-001` | /topoloji | ağ sorumlusu · kendi santrali | Onaylı taban anlık yok · yok | Sapma hesabına bakar | Taban yokken sapma HESAPLANMAZ | İlk anlık kendiliğinden taban olmaz | yazma yok | yok | `topoloji-sapma.test.ts` |
| `TOP-SAP-002` | /topoloji | ağ sorumlusu · kendi santrali | Kullanıcının onay yetkisi yok · normal | Sapmayı karara bağlamayı dener | Reddedilir; sapma AÇIK kalır | Düğme etkinleşmez, gerekçe alanı eşik ister | yazma yok | yok | `topoloji-tezgah.test.ts` |
| `TOP-TML-001` | /topoloji | santral kullanıcısı · tek santral | Anlık başka santralin · normal | Kapsam dışı anlığı temel onaylamayı dener | Reddedilir; yürürlükteki temel DEĞİŞMEZ | Yetki cümlesi tesisi adlandırır | yazma yok | yok | `ters-kapsam-eylem.test.ts` |
| `TOP-BUL-001` | /topoloji | uyum uzmanı · kendi santrali | Madde durumu seçilmemiş · kısmi | Madde durumu bağlamadan bulgu açmayı dener | Reddedilir — bağsız bulgu hangi maddeyi ihlal ettiğini söyleyemez | Eksik alan adlandırılır | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Uyum · 19 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UYU-CRC-001` | /uyum | uyum uzmanı · kendi santrali | En az bir regülasyon tanımlı · normal | Uyum ekranını açar | Çerçeve başına uyum oranı ve açık madde sayısı görünür | Oran payda ile birlikte; çıplak yüzde değil | yazma yok | yok | `uyum-grubu-mantik.test.ts` |
| `UYU-CRC-002` | /uyum | uyum uzmanı · kendi santrali | Bazı maddeler hiç değerlendirilmemiş · bilinmiyor | Uyum oranına bakar | Değerlendirilmemiş madde paydada kalır, payda sayılmaz | Bilinmeyen dilimi ayrı taramayla çizilir | yazma yok | yok | `uyum-grubu-mantik.test.ts` |
| `UYU-CRC-003` | /uyum/[cerceve] | uyum uzmanı · kendi santrali | Çerçeve kodu geçerli · normal | Çerçeve detayını açar | Maddeler hiyerarşisiyle listelenir | Madde durumu ve kanıt bağı görünür | yazma yok | yok | `senaryo-uyum.test.ts` |
| `UYU-UYG-001` | /uyum | uyum uzmanı · kendi santrali | Tesis profiline göre madde uygulanamaz · kısmi | Uygulanabilirlik hesabına bakar | Madde payda dışına çıkar; kusur olarak sayılmaz | "Uygulanamaz" ayrı bir durum olarak yazılır | yazma yok | yok | `uygulanabilirlik.test.ts` |
| `UYU-UYG-002` | /uyum | uyum uzmanı · kendi santrali | Tesisin profili yok · yok | Uygulanabilirlik hesabına bakar | Hesap yapılamaz ve bu AÇIKÇA yazılır | "Hesaplanamaz" cümlesi; sıfır DEĞİL | yazma yok | Veri kalitesi bulgusu | `uygulanabilirlik.test.ts` |
| `UYU-OLC-001` | /surecler/[id] | uyum uzmanı · kendi santrali | Kullanıcı yazma yetkili · normal | Madde durumunu değiştirir | Ölçüm kaydedilir | Yeni durum ve ölçen kişi görünür | Uyum ölçümü · guncelleme | yok | `faz-g-eylem.test.ts` |
| `UYU-OLC-002` | /surecler/[id] | uyum uzmanı · tek santral | Süreç başka santrale ait · normal | Ölçüm kaydetmeyi dener | Kapsam kapısı reddeder | Süreç listede görünmez | yazma yok | yok | `surec-kapsam-eylem.test.ts` |
| `UYU-SHP-001` | /uyum | uyum yöneticisi · kurum geneli | Maddenin sahibi yok · kısmi | Sahiplik atar | Sahiplik kaydedilir | Sahipsiz madde sayısı düşer | Sahiplik · olusturma | yok | `faz-d-uyum.test.ts` |
| `UYU-SUR-001` | /regulasyonlar | uyum yöneticisi · kurum geneli | Yeni sürüm hazırlanıyor · normal | Regülasyonun yeni sürümünü etkinleştirir | Eski değerlendirmeler SİLİNMEZ; fark listesi çıkar | Yarım sürüm oluşmaz — kopyalama ya tamdır ya hiç | Sürüm · olusturma + fark satırları | yok | `surum.test.ts` |
| `UYU-IST-001` | /uyum | uyum uzmanı · kendi santrali | Gerekçe kısa ya da bitiş tarihi geçmiş · çelişen | İstisna talep eder | Reddedilir — süresiz ya da gerekçesiz istisna olmaz | Madde durumu talepten SONRA da aynı kalır | yazma yok | yok | `istisna-eylem.test.ts` |
| `UYU-IST-002` | /uyum | uyum yöneticisi · kurum geneli | İstisna onay bekliyor · normal | İstisnayı onaylar | Madde kapsam dışına çıkar; süre dolunca geri döner | Yan etki patlarsa istisna da aktif KALMAZ | İstisna + durum + tarihçe + iz birlikte | Onay merkezine talep | `istisna.test.ts` |
| `UYU-TRN-001` | /uyum | uyum yöneticisi · tek santral | Aynı gün hem süreç geneli hem santral kaydı var · yinelenen | Eğilim çizgisine bakar | Aynı gün için tek nokta sayılır; kapsam daraltması korunur | Başka santralin noktası sızmaz | yazma yok | yok | `uyum-trend.test.ts` |
| `UYU-BLG-001` | /uyum | uyum uzmanı · tek santral | Belge başka santrale bağlı · kısmi | Matris hücresine bakar | Belge ÖTEKİ santralin hücresine SIZMAZ | Kurumsal belge her santralin hücresine düşer | yazma yok | yok | `uyum-belge-bagi.test.ts` |
| `UYU-PRS-001` | /prosesler | uyum uzmanı · tek santral | Süreç başka santrale ait olacak · normal | Süreç açmayı dener | Reddedilir; süreç başka santrale KAÇIRILAMAZ | Santral seçimi kapsamla sınırlı | yazma yok | yok | `faz-b-eylem.test.ts` |
| `UYU-OLG-001` | /surecler/[id] | uyum uzmanı · kendi santrali | Olgunluk hiç ölçülmemiş · bilinmiyor | Olgunluk dağılımına bakar | Ölçülmemiş `olculmedi`dir; SIFIR ölçülmüş bir sonuçtur | Ortalama diye bir alan YOKTUR | yazma yok | yok | `faz-g-uyum.test.ts` |
| `UYU-SRC-001` | /surecler | uyum uzmanı · kendi santrali | Hiçbir madde değerlendirilmemiş · yok | Süreç listesini açar | Yüzde null kalır — %0 GÖSTERİLMEZ | "Ölçülmedi" yazılır | yazma yok | yok | `ters-kapsam-ekran.test.ts` |
| `UYU-SRC-002` | /surecler | uyum uzmanı · kendi santrali | Bazı maddeler kapsam dışı · kısmi | Süreç toplamına bakar | Kapsam dışı maddeler paydaya GİRMEZ; toplam alt sayımların toplamıdır | Kapsam dışı ayrı sayılır | yazma yok | yok | `ters-kapsam-ekran.test.ts` |
| `UYU-CRC-004` | /uyum/[cerceve] | uyum uzmanı · kendi santrali | Çerçevenin bazı maddeleri hiç değerlendirilmemiş · kısmi | Madde satırını genişletir | Değerlendirilmemiş madde "uyumlu" ya da "uyumsuz" SAYILMAZ | Genişleyen satırda "ölçülmedi" ayrı okunur | yazma yok | yok | `ters-kapsam-ekran.test.ts` |
| `UYU-ANL-001` | — | sistem (motor) · kurum geneli | Aynı gün zaten anlık alınmış · yinelenen | Motor aynı gün ikinci kez koşar | İkinci anlık YAZILMAZ — günde bir | — | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Varlık aktarımı · 3 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `VAK-YUK-001` | /varlik-aktarim | BT yöneticisi · kendi santrali | Dosya desteklenmeyen türde · çelişen | Desteklenmeyen uzantılı dosya yükler | Reddedilir; aktarım kaydı AÇILMAZ | Hata uzantıyı adlandırır | yazma yok | yok | `ters-kapsam-eylem.test.ts` · `ters-kapsam-eylem.test.ts` |
| `VAK-ESL-001` | /varlik-aktarim | BT yöneticisi · kendi santrali | Zorunlu hedef alan eşlenmemiş · kısmi | Eksik eşlemeyle ilerlemeyi dener | Reddedilir; eksik alan adlandırılır | Aşama hattı eşleşme adımında kalır | yazma yok | yok | `ters-kapsam-eylem.test.ts` |
| `VAK-RED-001` | /varlik-aktarim | BT yöneticisi · kendi santrali | Aktarım zaten onaylanmış · normal | Onaylanmış aktarımı reddetmeyi dener | Reddedilir — karara bağlanmış aktarım yeniden karara açılmaz | Durum değişmez | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Yardım · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `YRD-SOR-001` | /yardim | yeni kullanıcı · kendi kapsamı | — · normal | Yardım ekranını açar | Durum sözcükleri ve iş kuralları kaynağıyla açıklanır | Her cevabın altında kural dosyası anılır | yazma yok | yok | `yardim.test.ts` |
| `YRD-SOR-002` | /yardim | herhangi bir kullanıcı · kendi kapsamı | Kullanıcı bir metin alanında yazıyor · kısmi | Soru işaretine basar | Katman AÇILMAZ — yazılan metin bölünmez | Yazı almayan öğelerde tetiklenir | yazma yok | yok | `yardim.test.ts` |

## Yedek parça · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `YDP-STK-001` | /yedek-parca | bakım sorumlusu · kendi santrali | Tedarik süresi ölçülmemiş · bilinmiyor | Parça kaydına bakar | Süre BOŞ kalır; sıfır REDDEDİLİR | Kritik varlığa bağlı parçasızlık AÇIK RİSK olur | yazma yok | yok | `faz-g-eylem.test.ts` |
| `YDP-BAG-001` | /yedek-parca | santral kullanıcısı · tek santral | Bağın varlığı başka santralde · normal | Kapsam dışı bağı çözmeyi dener | Reddedilir; bağ DURUR | Yetki cümlesi | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Yedekleme · 2 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `YED-POL-001` | /yedekleme | BT yöneticisi · kendi santrali | Politika tanımlı · normal | Geri yükleme testi kaydeder | Test koşuya bağlanır ve iz bırakır | Testi olmayan yedek "kanıtlanmadı" der | Restore testi · olusturma | yok | `operasyon-yedekleme-sertifika.test.ts` |
| `YED-POL-002` | /yedekleme | BT yöneticisi · kendi santrali | Saklama süresi negatif · çelişen | Politikayı kaydetmeyi dener | Reddedilir | Hata cümlesi alanı adlandırır | yazma yok | yok | `operasyon-yedekleme-sertifika.test.ts` |

## Yetkiler · 4 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `YTK-LST-001` | /yetkiler | kurum yöneticisi · kurum geneli | Kullanıcılar tanımlı · normal | Yetkiler ekranını açar | Rol ve santral kapsamıyla listelenir | Sahiplik yükü ve bekleyen zimmet görünür | yazma yok | yok | `kabuk-kapsami.test.ts` |
| `YTK-LST-002` | /yetkiler | BT yöneticisi · tek santral | Kullanıcı kurum yöneticisi değil · normal | Yetki değiştirmeyi dener | Reddedilir | Yazma yüzeyi açılmaz | yazma yok | yok | `yonetim-konsolu-eylem.test.ts` |
| `YTK-ATM-001` | /yetkiler | kurum yöneticisi · kurum geneli | Aynı atama zaten var · yinelenen | Aynı atamayı tekrar yapar | İkinci satır AÇILMAZ | Farklı seviye de ikinci satır açmaz — aynı erişimin değişimidir | Yetki · guncelleme | yok | `erisim.test.ts` |
| `YTK-EKP-001` | /yetkiler | kurum yöneticisi · kurum geneli | Üyelik zaten yok · yok | Olmayan üyeliği kaldırmayı dener | Hata döner; sessizce başarılı SAYILMAZ | Ekip listesi değişmez | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Yönetim konsolu · 13 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `YON-AYR-001` | /ayarlar | kurum yöneticisi · kurum geneli | Kullanıcı yetkili · normal | Bir ayarı değiştirir | Değer doğrulanır ve kaydedilir | Değerin nereden geldiği (varsayılan/konsol) yazılı | Yapilandirma · guncelleme | yok | `yonetim-konsolu-eylem.test.ts` |
| `YON-AYR-002` | /ayarlar | kurum yöneticisi · kurum geneli | Şema bir aralık dayatıyor · çelişen | Aralık dışı bir değer girer | Reddedilir; eski değer korunur | Neyin beklendiği yazılır | yazma yok | yok | `yapilandirma.test.ts` |
| `YON-AYR-003` | /ayarlar | sistem · kurum geneli | Saklanan değer şemayı geçmiyor · çelişen | Ayar okunur | Kod varsayılanı döner ve kaynak "geçersiz kayıt" olur | Konsolda bozukluk görünür | yazma yok | yok | `yapilandirma.test.ts` |
| `YON-MOD-001` | /yonetim-tezgahi | kurum yöneticisi · kurum geneli | Modül kütüğü dolu · normal | Yönetim tezgâhını açar | A/B modüller yönetilebilir, C modüller gerekçesiyle kodda | Kapsama oranı C modülleri paydaya KATMAZ | yazma yok | yok | `yapilandirma.test.ts` |
| `YON-MOD-002` | — | geliştirici / denetçi · kurum geneli | — · normal | Ayar kütüğü ile modül kütüğü karşılaştırılır | Modülsüz ayar YOKTUR | — | yazma yok | yok | `yapilandirma.test.ts` |
| `YON-MOT-001` | /saglik | platform yöneticisi · kurum geneli | Kullanıcının yönetim yazma yetkisi yok · normal | Motorları çalıştırmayı dener | Tek motora bile DOKUNULMAZ | Düğme kapalı | yazma yok | yok | `isler-eylem.test.ts` |
| `YON-MOT-002` | — | sistem (zamanlayıcı) · kurum geneli | Yalnız kanıt değişmiş · kısmi | Zincir koşar | İlgisiz motor KOŞMAZ; bir motor patlarsa zincir devam eder | Sonuç neyin atlandığını bildirir | Koşu kaydı | yok | `motor-zinciri.test.ts` |
| `YON-KLT-001` | — | sistem (zamanlayıcı) · kurum geneli | İki istek aynı anda geliyor · yinelenen | Kilit alınmaya çalışılır | Yalnız BİRİ kazanır; kirası dolmuş kilit devralınır | Kimin tuttuğu söylenir | Kilit kaydı | yok | `zamanlayici.test.ts` |
| `YON-OTO-001` | — | güvenlik denetçisi · kurum geneli | — · normal | Otomasyon sınırları ölçülür | Her yasak için bir ÖLÇÜ vardır — yorumda kalan kural yok | — | yazma yok | yok | `otomasyon-guvenligi.test.ts` |
| `YON-MOT-003` | /saglik | geliştirici / denetçi · kurum geneli | — · normal | Motor kütüğü ile çalıştırma yolu karşılaştırılır | Kütükteki her motor koşturulabilir; ölü kayıt yoktur | Motor adı kütükte tekrar etmez | yazma yok | yok | `motor-defteri.test.ts` |
| `YON-MOT-004` | — | sistem (motor) · kurum geneli | Uyumsuz ve kritik bir madde var · normal | Boşluk–aksiyon motoru koşar | Proje ADAYI üretir; insan onayı olmadan projeye DÖNMEZ | Aday listesi ayrı durur | Aday kaydı | Görev | `motorlar.test.ts` |
| `YON-TZG-001` | /yonetim-tezgahi | herhangi bir kullanıcı · kendi kapsamı | Süzgeç hiçbir göreve uymuyor · yok | Görev süzgecini daraltır | Boş SÜZGEÇ sonucu, hiç görev olmamasından ayrı yazılır | Süzgeci temizle eylemi görünür | yazma yok | yok | `ters-kapsam-ekran.test.ts` |
| `YON-MOD-003` | /ayarlar | kurum yöneticisi · kurum geneli | Kod kütükte yok · bilinmiyor | Tanımsız modül kodunu sorar | null döner — varsayılan bir sınıfa DÜŞMEZ | "Bilinmiyor" yazılır | yazma yok | yok | `ters-kapsam-eylem.test.ts` |

## Zimmet · 12 senaryo

| ID | Rota | Rol · kapsam | Ön koşul · veri | Eylem | Beklenen sonuç | Ekran | Denetim izi | Görev/bildirim | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ZIM-ACT-001` | /envanter | BT yöneticisi · kendi santrali | Varlığın açık zimmet talebi yok · normal | Sahiplik bloğundan zimmet açar | Talep açılır; varlığın sahibi HENÜZ DEĞİŞMEZ | Sahiplik alanında "cevap bekliyor" cümlesi | VarlikAtamaTalebi · olusturma | Zimmetlenen kişiye bildirim | `zimmet-eylem.test.ts` |
| `ZIM-ACT-002` | /envanter | BT yöneticisi · kendi santrali | Varlığın zaten bekleyen bir talebi var · yinelenen | İkinci bir zimmet açmayı dener | Reddedilir; tek aktif talep kuralı korunur | Açık talep gösterilir, yeni form açılmaz | yazma yok | yok | `zimmet-eylem.test.ts` |
| `ZIM-CVP-001` | /zimmetlerim | herhangi bir kullanıcı · kendi kaydı | Kişinin bekleyen bir talebi var · normal | Kabul eder | Sahiplik kesinleşir | Talep "kabul ettiklerim" sekmesine geçer | İki kayıt: talep durumu + Varlik sahibi | yok | `zimmet-eylem.test.ts` |
| `ZIM-CVP-002` | /zimmetlerim | herhangi bir kullanıcı · kendi kaydı | Kişinin bekleyen bir talebi var · normal | Gerekçe yazıp reddeder | Sahiplik önceki sahibine döner | Gerekçe yazılmadan red düğmesi açılmaz | VarlikAtamaTalebi · red · gerekçeyle | yok | `zimmet-eylem.test.ts` |
| `ZIM-CVP-003` | /zimmetlerim | herhangi bir kullanıcı · kendi kaydı | Varlığın önceki sahibi yok ya da pasif · kısmi | Reddeder | Varlık sahipsiz kalır ve veri kalitesi bulgusu açılır | Sahiplik alanı "sahipsiz" der, boş değil | Bulgu kaydı açılır | Veri kalitesi bulgusu | `zimmet-eylem.test.ts` |
| `ZIM-CVP-004` | /zimmetlerim | BT yöneticisi · kurum geneli | Talep başka bir kişiye ait · normal | Başkasının talebini cevaplamayı dener | Reddedilir — kimlik kapısı geçilemez | Talep o kişinin ekranında görünmez | yazma yok | yok | `zimmet-eylem.test.ts` |
| `ZIM-CVP-005` | /envanter | BT yöneticisi · kendi santrali | Bekleyen bir talep var · normal | Talebi iptal eder | Talep iptal olur; sahiplik DEĞİŞMEZ | Sahiplik alanı eski sahibi göstermeye devam eder | VarlikAtamaTalebi · iptal | yok | `zimmet-eylem.test.ts` |
| `ZIM-SUR-001` | — | sistem (motor) · kurum geneli | Talebin son tarihi geçmiş · bayat | Zimmet süresi motoru koşar | Talep "süresi doldu" olur; KİMSE ADINA KABUL EDİLMEZ | Varlığın sahibi değişmemiş görünür | Aktivite kaydı · kaynak: iş koşusu | Görev açılır | `zimmet-eylem.test.ts` |
| `ZIM-SUR-002` | — | sistem (motor) · kurum geneli | Zimmetlenen kullanıcı pasifleştirilmiş · kısmi | Motor koşar | Talep iptal olur | Bekleyen listede görünmez | Aktivite kaydı | Görev | `zimmet-eylem.test.ts` |
| `ZIM-SUR-003` | — | sistem (motor) · kurum geneli | Talebin son tarihi yaklaşıyor · normal | Motor iki kez koşar | Uyarı BİR KEZ üretilir; ikinci koşuda tekrar etmez | Bildirim kutusu gürültüyle dolmaz | Aktivite kaydı | Görev · bir kez | `zimmet-eylem.test.ts` |
| `ZIM-KAP-001` | /zimmetlerim | herhangi bir kullanıcı · kendi kaydı | Talep zaten cevaplanmış · yinelenen | Aynı talebi tekrar cevaplamayı dener | Reddedilir | Kapanmış talep bekleyen sekmesinde görünmez | yazma yok | yok | `zimmet.test.ts` |
| `ZIM-SUR-010` | /zimmetlerim | herhangi bir kullanıcı · kendi kapsamı | Zimmet formu açık · normal | Süre alanını doldurur | Varsayılan ve azami gün TEK kaynaktan gelir; ekran kendi sayısını uydurmaz | Azami gün alan ipucunda yazılı | yazma yok | yok | `ters-kapsam-eylem.test.ts` |


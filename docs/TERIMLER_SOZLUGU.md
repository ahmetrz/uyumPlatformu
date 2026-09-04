# Terimler sözlüğü

Bu sözlük, **ürün karşılaştırma isterleri listesinde** ve o listenin
"Ürün 03 (Ahmet)" sütunundaki açıklamalarda geçen bütün kısaltma ve
terimleri açıklar.

Amaç: listeyi okuyan birinin, konuya hiç aşina olmasa bile hiçbir
kelimede takılmaması. Tanımlar bu yüzden kasten **kısa ve gündelik
dildedir**; teknik kesinlik değil, anlaşılırlık gözetilmiştir.

Sözlük dört bölümdür: kısaltmalar, kurum ve düzenleme adları, envanter
ve OT terimleri, uyum ve denetim terimleri. Bir terim iki bölüme de
girebilecekse en çok kullanıldığı yere konmuştur.

---

## 1. Kısaltmalar

| Kısaltma | Açılımı | Ne demek |
| --- | --- | --- |
| **API** | Application Programming Interface | İki yazılımın birbirine veri vermesini sağlayan kapı. İnsan değil, program kullanır. |
| **BT** | Bilgi Teknolojileri | Ofis tarafı: bilgisayarlar, e-posta, sunucular, kurumsal uygulamalar. |
| **OT** | Operasyonel Teknoloji | Saha tarafı: türbini, kazanı, şalt sahasını fiilen çalıştıran cihazlar. Bozulursa üretim durur. |
| **BT-OT geçişi** | — | İki dünyanın birbirine bağlandığı nokta. Saldırıların en çok ilgilendiği yer. |
| **CAPA** | Corrective and Preventive Action | Düzeltici ve önleyici faaliyet: bir kusur bulunduğunda "bunu nasıl düzelteceğiz ve nasıl tekrar etmemesini sağlayacağız" planı. |
| **CMDB** | Configuration Management Database | Kurumun bütün cihaz ve sistem kayıtlarını tutan merkezî envanter veritabanı. |
| **CSV** | Comma-Separated Values | Excel'in en sade hâli: virgülle ayrılmış düz metin tablo dosyası. |
| **CVE** | Common Vulnerabilities and Exposures | Bilinen bir güvenlik açığına verilen dünya çapında tek numara (örn. CVE-2024-1234). |
| **CVSS** | Common Vulnerability Scoring System | Bir güvenlik açığının ne kadar ciddi olduğunu 0–10 arası puanlayan ortak ölçek. |
| **DCS** | Distributed Control System | Bir tesisin bütününü yöneten dağıtık kontrol sistemi. SCADA'nın daha entegre akrabası. |
| **DMZ** | Demilitarized Zone | İki ağ arasındaki tampon bölge. Ne tam içeride ne tam dışarıda; geçiş buradan yapılır. |
| **DYS / DMS** | Doküman Yönetim Sistemi / Document Management System | Kurumun resmî belgelerinin sürümleriyle birlikte tutulduğu sistem. |
| **EDR** | Endpoint Detection and Response | Bilgisayar ve sunuculara kurulan, zararlı davranışı yakalayıp müdahale eden güvenlik yazılımı. |
| **EOL** | End of Life | Üreticinin ürünü tamamen bıraktığı tarih. Artık yeni sürüm de yama da gelmez. |
| **EOS** | End of Support | Üreticinin destek vermeyi bıraktığı tarih. Ürün çalışır ama arıza ve açıkta yalnızsınız. |
| **HMI** | Human-Machine Interface | Operatörün sahadaki makineyi izleyip komut verdiği ekran. |
| **HSM** | Hardware Security Module | İmza ve şifreleme anahtarlarını içinde tutan, anahtarı dışarı çıkarmayan özel donanım. |
| **IdP** | Identity Provider | Kimlik sağlayıcı: "bu kişi gerçekten o kişi mi" sorusunu cevaplayan merkezî sistem (örn. Entra ID). |
| **IEC** | International Electrotechnical Commission | Elektrik ve otomasyon alanında uluslararası standart yazan kuruluş. |
| **IEEE** | Institute of Electrical and Electronics Engineers | Elektrik-elektronik alanında standart yazan uluslararası meslek kuruluşu. |
| **IP adresi** | Internet Protocol | Bir cihazın ağdaki adresi. |
| **ISO** | International Organization for Standardization | Uluslararası standart kuruluşu. |
| **KMS** | Key Management Service | Şifreleme anahtarlarını üreten, saklayan ve kullandıran servis. |
| **MAC adresi** | Media Access Control | Bir ağ kartının fabrikadan gelen, değişmeyen donanım kimliği. |
| **MFA** | Multi-Factor Authentication | Çok adımlı doğrulama: paroladan başka bir şey daha isteme (SMS kodu, uygulama onayı). |
| **MW** | Megawatt | Güç birimi. Bir santralin ne kadar elektrik üretebildiğini anlatır. |
| **OUI** | Organizationally Unique Identifier | MAC adresinin ilk yarısı. Cihazı hangi üreticinin yaptığını söyler. |
| **PAM** | Privileged Access Management | Ayrıcalıklı erişim yönetimi: yönetici yetkili oturumların kimin, ne zaman, ne kadar süreyle açtığını kontrol eden sistem. |
| **PLC** | Programmable Logic Controller | Sahadaki vanayı, motoru, rölesi fiilen kumanda eden küçük endüstriyel bilgisayar. |
| **RPO** | Recovery Point Objective | Bir felakette **kaç saatlik veriyi** kaybetmeyi göze aldığımız. |
| **RTO** | Recovery Time Objective | Bir felakette sistemin **kaç saat içinde** ayağa kalkması gerektiği. |
| **RTU** | Remote Terminal Unit | Uzaktaki bir noktadan veri toplayıp merkeze gönderen saha cihazı. |
| **SBOM** | Software Bill of Materials | Bir yazılımın "içindekiler listesi": hangi hazır bileşenlerden, hangi sürümlerden oluşuyor. |
| **SCADA** | Supervisory Control and Data Acquisition | Sahayı merkezden izleyip kumanda eden sistem. Kontrol odasındaki büyük ekran. |
| **SHA-256** | Secure Hash Algorithm | Bir dosyanın parmak izini çıkaran hesap. İçerik bir bit değişirse parmak izi tamamen değişir. |
| **SIEM** | Security Information and Event Management | Bütün sistemlerin loglarını tek yerde toplayıp şüpheli olayı yakalayan güvenlik sistemi. |
| **SPDX** | Software Package Data Exchange | SBOM yazmanın standart biçimlerinden biri. |
| **CycloneDX** | — | SBOM yazmanın diğer yaygın standart biçimi. |
| **SSO** | Single Sign-On | Tek girişle bütün uygulamalara girebilme. Kurumsal hesapla oturum açma. |
| **SSRF** | Server-Side Request Forgery | Bir sunucuyu kandırıp, dışarıdan erişilemeyecek bir iç adrese istek attırma saldırısı. |
| **TLS** | Transport Layer Security | İnternet trafiğini şifreleyen katman. Tarayıcıdaki kilit simgesi. |
| **USB** | Universal Serial Bus | Bilgisayara takılan bellek, disk ve kablo standardı. Burada kastedilen çoğunlukla USB bellektir. |
| **VLAN** | Virtual Local Area Network | Aynı fiziksel ağı yazılımla birbirinden ayrılmış bölmelere ayırma yöntemi. |

---

## 2. Kurum ve düzenleme adları

| Ad | Ne demek |
| --- | --- |
| **EPDK** | Enerji Piyasası Düzenleme Kurumu. Türkiye'de enerji sektörünü düzenleyen kamu kurumu. |
| **EPDK-SYM** | EPDK Siber Güvenlik Yetkinlik Modeli. Enerji sektöründeki kurumların siber güvenlik olgunluğunu kademelerle ölçen model. |
| **CBDDÖ** | Cumhurbaşkanlığı Bilgi ve İletişim Güvenliği Rehberi kapsamındaki denetim ve değerlendirme ölçütleri. |
| **SPK-BS** | Sermaye Piyasası Kurulu Bilgi Sistemleri yönetimi düzenlemesi. Halka açık şirketlerin bilgi sistemlerine getirdiği kurallar. |
| **ISO 27001** | Bilgi güvenliği yönetim sistemi standardı. Dünyanın en yaygın bilgi güvenliği sertifikasyonu. |
| **IEC 62443** | Endüstriyel otomasyon ve kontrol sistemleri (yani OT) için siber güvenlik standardı. |
| **Purdue modeli** | OT ağlarını 0'dan 5'e kadar katmanlara ayıran klasik referans model. Saha en altta, ofis en üstte. |
| **Regülasyon** | Uyulması zorunlu düzenleme. Bu belgede kanun, yönetmelik ve resmî rehberlerin ortak adı. |

---

## 3. Envanter ve OT terimleri

| Terim | Ne demek |
| --- | --- |
| **Varlık** | Kayda değer her cihaz veya sistem: PLC, sunucu, switch, yazılım. |
| **Envanter** | Bütün varlıkların listesi. "Neyimiz var" sorusunun cevabı. |
| **Hiyerarşi** | Santral → ünite → sistem → varlık zinciri. Bir cihazın nerede durduğunu anlatır. |
| **Kritiklik** | Bir varlığın bozulmasının ne kadar can yakacağı. Genelde dört kademe artı "bilinmiyor". |
| **Yaşam döngüsü durumu** | Varlığın hangi aşamada olduğu: planlandı, aktif, bakımda, emekli, imha. |
| **Keşif (discovery)** | Ağı tarayıp orada duran cihazları otomatik bulma. Yalnız **ağda görüneni** bulur. |
| **Pasif keşif** | Ağa hiç paket göndermeden, yalnız geçen trafiği dinleyerek cihaz tanıma. OT'de tercih edilir; aktif tarama üretimi bozabilir. |
| **Fiziksel sayım** | Sahaya gidip cihazları gözle sayma. Keşfin göremediğini görür: kapalı panodaki yedek kart, ağa hiç bağlanmayan dizüstü. |
| **Fazladan cihaz** | Sahada bulunan ama envanterde kaydı olmayan cihaz. OT'de en tehlikeli bulgudur: kimse ondan sorumlu değil, kimse yamalamıyor. |
| **Yedek parça** | Bozulan bir bileşenin yerine takılacak parçadan elde kaç adet olduğu. EOL "ne zaman desteksiz kalacak" der; yedek parça "bugün bozulursa ne olur" der. |
| **Tedarik süresi** | Elde olmayan bir parçanın sipariş verildikten sonra kaç günde geldiği. |
| **Taşınabilir medya** | USB bellek, harici disk gibi elden ele dolaşan depolama aygıtları. OT'de en sık bulaşma yollarından biri. |
| **Karantina** | Şüpheli bulunan bir medyanın kullanımdan çekilip ayrı tutulması. |
| **Firmware** | Cihazın içine gömülü yazılım. Bilgisayardaki işletim sisteminin karşılığı. |
| **Yama (patch)** | Bir açığı kapatmak için üreticinin yayımladığı düzeltme. |
| **Zafiyet** | Kötüye kullanılabilecek güvenlik açığı. |
| **Advisory (üretici bülteni)** | Üreticinin "ürünümüzde şu açık var, şu sürüme geçin" duyurusu. |
| **Konfigürasyon temeli (baseline)** | Bir cihazın "olması gereken" onaylı ayar hâli. |
| **Drift (sapma)** | Cihazın ayarlarının onaylı temelden uzaklaşması. |
| **Ağ segmenti / zone** | Ağın güvenlik amacıyla ayrılmış bölmesi. |
| **Subnet** | Bir ağ bölmesinin adres aralığı. |
| **Topoloji** | Ağın haritası: neyin neye bağlı olduğu. |
| **Proses / proses adımı** | Üretimin iş akışı ve o akışın tek bir basamağı. Bir varlığın "hangi işe yaradığını" bu bağ anlatır. |
| **Tek nokta (single point of failure)** | Bozulduğunda yerine geçecek başka bir şey olmayan varlık. |
| **Restore testi** | Yedekten geri dönmenin gerçekten çalıştığını deneyerek kanıtlama. Yedek almak yetmez. |

---

## 4. Uyum ve denetim terimleri

| Terim | Ne demek |
| --- | --- |
| **Uyum (compliance)** | Kurumun tabi olduğu kurallara fiilen uyup uymadığı. |
| **Çerçeve (framework)** | Bir düzenlemenin maddelerinin bütünü. Örn. ISO 27001'in maddeler ağacı. |
| **Kontrol / madde** | Uyulması gereken tek bir kural. "Yedekler şifreli saklanır" gibi. |
| **Uygulanabilirlik** | Bir maddenin o santral için geçerli olup olmadığı. Her madde her tesise uymaz. |
| **Kanıt** | Bir kontrolün gerçekten uygulandığını gösteren belge, ekran görüntüsü, log veya rapor. |
| **Kanıt kapsaması** | Kaç kontrolün kanıtı var. |
| **Kanıt güncelliği** | Var olan kanıtların ne kadar taze olduğu. Kapsamayla **aynı şey değildir**. |
| **Bulgu** | Denetim ya da kontrolde tespit edilen uyumsuzluk. |
| **Kök neden** | Bulgunun asıl sebebi. "Unutulmuş" değil, "süreçte adım yok" gibi. |
| **Tekrarlayan bulgu** | Kapanmış bir bulgunun aynı kontrolde yeniden açılması. |
| **Eskalasyon** | Bir işin geciktiğinde kademe kademe üst yöneticiye haber verilmesi. |
| **İstisna / muafiyet** | Bir maddenin gerekçeli ve süreli olarak uygulanmamasına izin verilmesi. |
| **Olgunluk seviyesi** | Bir kontrolün ne kadar oturmuş olduğu (0–5). "Yapılıyor mu" değil, "ne kadar sağlam yapılıyor" sorusu. |
| **Tasarım testi** | Kontrolün doğru kurgulanıp kurgulanmadığının sınanması. |
| **İşleyiş testi** | Kontrolün kurgulandığı gibi fiilen çalışıp çalışmadığının sınanması. |
| **Evren** | Test edilebilecek kayıtların tamamı. |
| **Örneklem** | Evrenden fiilen incelenen kayıt sayısı. "Test ettik" demek, kaç kayda bakıldığını söylemeden bir iddiadır. |
| **Yönetim gözden geçirmesi** | Üst yönetimin uyum durumunu periyodik olarak masaya yatırıp **karar aldığı** toplantı. Çoğu çerçevede zorunludur. |
| **Bildirim yükümlülüğü** | Bir olayın resmî bir mercie bildirilmesi zorunluluğu. |
| **Bildirim süresi** | O bildirimin kaç saat içinde yapılması gerektiği. Süre mevzuattan gelir, üründen değil. |
| **Merci** | Bildirimin yapılacağı resmî makam. |
| **Dayanak** | Bir kuralın hangi mevzuat maddesinden geldiği. Dayanaksız bir süre denetimde savunulamaz. |
| **Denetim izi (audit trail)** | Kim, ne zaman, neyi değiştirdi kaydı. Silinmez. |
| **Saklama (retention)** | Bir kaydın kaç yıl tutulacağı. |
| **Legal hold** | Devam eden bir soruşturma nedeniyle kaydın silinmesinin dondurulması. |
| **Köken (provenance)** | Bir verinin nereden geldiği: elle mi girildi, hangi sistemden mi aktarıldı. |
| **Eşleştirme / crosswalk** | Aynı işi anlatan farklı çerçeve maddelerini birbirine bağlama. Bir kanıt birden çok maddeye hizmet edebilir. |
| **RBAC** | Rol bazlı yetkilendirme: kim ne yapabilir. |
| **Kapsam (santral kapsamı)** | Bir kullanıcının yalnız yetkili olduğu santralleri görebilmesi. |

---

## 5. Bu üründe özel anlam taşıyan üç ifade

| İfade | Neden özel |
| --- | --- |
| **"Ölçülmedi"** | Bilinmeyen bir değer **sıfır değildir** ve ortalamaya çekilmez. Ürün ölçülmemiş bir şeyi boş bırakır ve boş olduğunu söyler. Bir orana ölçülmemiş satırları katmak, ekranı yanlış konuda rahatlatır. |
| **"Sayılmadı" ≠ "bulunamadı"** | Henüz gidilip bakılmamış bir raf, kayıp varlık değildir. İkisini aynı kovaya koymak sayımı ilk gün "%90 kayıp" gösterir ve kimse bir daha o ekrana bakmaz. |
| **"Ürünle gelmez"** | Bildirim süreleri, resmî kaynak adresleri, saklama süreleri, eğitim tanımları gibi **kuruma özgü** değerler ürüne gömülmez. Örnek bir değer yazmak, kimsenin değiştirmediği yanlış bir sayaç bırakırdı. |

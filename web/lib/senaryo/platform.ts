import type { Senaryo } from './tipler';

/* Platform alanının senaryoları: oturum, yetki, yönetim konsolu,
   entegrasyon sağlığı, API, bildirim, rapor, içe/dışa aktarım, eşleme
   tezgâhı, sistem sayfaları, saha/portföy ve yardım.

   Bu alanın değişmezi: bağlı olmayan bir kaynak "hatalı" değildir,
   hiç koşmamış bir motor "sağlıklı" değildir ve bilinmeyen bir ölçü
   sıfır değildir. */

export const PLATFORM_SENARYOLARI: Senaryo[] = [
  /* ── Oturum ve giriş ────────────────────────────────────────────── */
  {
    id: 'OTR-GRS-001', alan: 'Oturum', rota: '/giris', eksen: 'yetki',
    amac: 'Sisteme girmek',
    rol: 'kayıtlı kullanıcı', kapsam: 'kendi hesabı',
    onkosul: 'Hesap aktif', veriHali: 'normal',
    eylem: 'Geçerli kimlikle giriş yapar',
    beklenenSonuc: 'Oturum açılır',
    beklenenEkran: 'Ana ekrana yönlendirilir',
    beklenenIz: 'Oturum kaydı', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'OTR-GRS-002', alan: 'Oturum', rota: '/giris', eksen: 'yetki',
    amac: 'Yetkisiz erişimin engellenmesi',
    rol: 'kimliksiz ziyaretçi', kapsam: 'yok',
    onkosul: 'Oturum yok', veriHali: 'yok',
    eylem: 'Korumalı bir ekranı doğrudan açmayı dener',
    beklenenSonuc: 'Girişe yönlendirilir; veri sızmaz',
    beklenenEkran: 'Giriş ekranı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'OTR-GRS-003', alan: 'Oturum', rota: '/giris', eksen: 'yetki',
    amac: 'Demo oturumunun veri bozmaması',
    rol: 'demo kullanıcısı', kapsam: 'kurum geneli',
    onkosul: 'Demo oturumu açık', veriHali: 'normal',
    eylem: 'Bir yazma eylemi çağırır',
    beklenenSonuc: 'Reddedilir — demo salt okunurdur',
    beklenenEkran: 'Yazma düğmeleri kapalı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'OTR-OTR-001', alan: 'Oturum', rota: '—', eksen: 'yetki',
    amac: 'Süresi geçen oturumun kapanması',
    rol: 'kayıtlı kullanıcı', kapsam: 'kendi hesabı',
    onkosul: 'Oturum süresi dolmuş', veriHali: 'bayat',
    eylem: 'Bir istek yapar',
    beklenenSonuc: 'Oturum reddedilir',
    beklenenEkran: 'Girişe döner',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },

  /* ── Yetkiler ekranı ────────────────────────────────────────────── */
  {
    id: 'YTK-LST-001', alan: 'Yetkiler', rota: '/yetkiler', eksen: 'yetki',
    amac: 'Kimin neye yetkili olduğunu görmek',
    rol: 'kurum yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Kullanıcılar tanımlı', veriHali: 'normal',
    eylem: 'Yetkiler ekranını açar',
    beklenenSonuc: 'Rol ve tesis kapsamıyla listelenir',
    beklenenEkran: 'Sahiplik yükü ve bekleyen zimmet görünür',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'YTK-LST-002', alan: 'Yetkiler', rota: '/yetkiler', eksen: 'yetki',
    amac: 'Yetki yönetiminin herkese açık olmaması',
    rol: 'BT yöneticisi', kapsam: 'tek tesis',
    onkosul: 'Kullanıcı kurum yöneticisi değil', veriHali: 'normal',
    eylem: 'Yetki değiştirmeyi dener',
    beklenenSonuc: 'Reddedilir',
    beklenenEkran: 'Yazma yüzeyi açılmaz',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },

  /* ── Yönetim konsolu ────────────────────────────────────────────── */
  {
    id: 'YON-AYR-001', alan: 'Yönetim konsolu', rota: '/ayarlar',
    eksen: 'yetki',
    amac: 'Bir eşiği kurumun gerçeğine göre ayarlamak',
    rol: 'kurum yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Kullanıcı yetkili', veriHali: 'normal',
    eylem: 'Bir ayarı değiştirir',
    beklenenSonuc: 'Değer doğrulanır ve kaydedilir',
    beklenenEkran: 'Değerin nereden geldiği (varsayılan/konsol) yazılı',
    beklenenIz: 'Yapilandirma · guncelleme',
    beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC', 'DOMAIN'],
  },
  {
    id: 'YON-AYR-002', alan: 'Yönetim konsolu', rota: '/ayarlar',
    eksen: 'veri',
    amac: 'Geçersiz değerin sisteme girmemesi',
    rol: 'kurum yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Şema bir aralık dayatıyor', veriHali: 'çelişen',
    eylem: 'Aralık dışı bir değer girer',
    beklenenSonuc: 'Reddedilir; eski değer korunur',
    beklenenEkran: 'Neyin beklendiği yazılır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'YON-AYR-003', alan: 'Yönetim konsolu', rota: '/ayarlar',
    eksen: 'veri',
    amac: 'Bozuk kayıt yüzünden motorun durmaması',
    rol: 'sistem', kapsam: 'kurum geneli',
    onkosul: 'Saklanan değer şemayı geçmiyor', veriHali: 'çelişen',
    eylem: 'Ayar okunur',
    beklenenSonuc: 'Kod varsayılanı döner ve kaynak "geçersiz kayıt" olur',
    beklenenEkran: 'Konsolda bozukluk görünür',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'YON-MOD-001', alan: 'Yönetim konsolu', rota: '/yonetim-tezgahi',
    eksen: 'veri',
    amac: 'Hangi kuralın panelden yönetildiğini görmek',
    rol: 'kurum yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Modül kütüğü dolu', veriHali: 'normal',
    eylem: 'Yönetim tezgâhını açar',
    beklenenSonuc: 'A/B modüller yönetilebilir, C modüller gerekçesiyle kodda',
    beklenenEkran: 'Kapsama oranı C modülleri paydaya KATMAZ',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'YON-MOD-002', alan: 'Yönetim konsolu', rota: '—', eksen: 'veri',
    amac: 'Her ayarın bir yönetim yüzeyine bağlı olması',
    rol: 'geliştirici / denetçi', kapsam: 'kurum geneli',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Ayar kütüğü ile modül kütüğü karşılaştırılır',
    beklenenSonuc: 'Modülsüz ayar YOKTUR',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },

  /* ── Entegrasyon sağlığı ────────────────────────────────────────── */
  {
    id: 'SAG-CON-001', alan: 'Sağlık', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Bağlantıların gerçekten çalışıp çalışmadığını görmek',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Connector hiç koşmamış', veriHali: 'yok',
    eylem: 'Sağlık ekranını açar',
    beklenenSonuc: '"Hiç koşmadı" yazılır; sağlıklı SAYILMAZ',
    beklenenEkran: 'Bilinmeyen işaretçisi; yeşil DEĞİL',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'SAG-CON-002', alan: 'Sağlık', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Kimlik bekleyen kurulumun hata sanılmaması',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Connector durumu kimlik_bekleniyor', veriHali: 'kısmi',
    eylem: 'Sağlık ekranını açar',
    beklenenSonuc: 'Bekleyen kurulum adımı olarak gösterilir',
    beklenenEkran: 'Kırmızı DEĞİL',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'SAG-CON-003', alan: 'Sağlık', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Ardışık hatanın sessizce sürmemesi',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Ardışık hata sınırı aşılmış', veriHali: 'kısmi',
    eylem: 'Senkronizasyon koşar',
    beklenenSonuc: 'Devre kesici connector\'ı duraklatır',
    beklenenEkran: 'Durum "hatalı" olur ve görünür',
    beklenenIz: 'Koşu kaydı', beklenenBildirim: 'yok',
    katmanlar: ['INTEGRATION', 'ENGINE'],
  },
  {
    id: 'SAG-CON-004', alan: 'Sağlık', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Geçici hatada verinin kaybolmaması',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Kaynak zaman aşımı veriyor', veriHali: 'kısmi',
    eylem: 'Senkronizasyon koşar',
    beklenenSonuc: 'Geri çekilmeyle tekrar denenir',
    beklenenEkran: 'Deneme sayısı görünür',
    beklenenIz: 'Koşu kaydı', beklenenBildirim: 'yok',
    katmanlar: ['INTEGRATION'],
  },
  {
    id: 'SAG-CON-005', alan: 'Sağlık', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Kalıcı yetki hatasında boşuna denenmemesi',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Kaynak 401 döndürüyor', veriHali: 'kısmi',
    eylem: 'Senkronizasyon koşar',
    beklenenSonuc: 'Tekrar DENENMEZ',
    beklenenEkran: 'Hata sebebi yazılır',
    beklenenIz: 'Koşu kaydı', beklenenBildirim: 'yok',
    katmanlar: ['INTEGRATION'],
  },
  {
    id: 'SAG-CON-006', alan: 'Sağlık', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Aynı kaydın iki koşuda iki kez yazılmaması',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Aynı kaynak kaydı tekrar geliyor', veriHali: 'yinelenen',
    eylem: 'İkinci koşuyu çalıştırır',
    beklenenSonuc: 'Kayıt tazelenir, kopyalanmaz',
    beklenenEkran: 'Yinelenen sayacı artar',
    beklenenIz: 'Köken kaydı', beklenenBildirim: 'yok',
    katmanlar: ['INTEGRATION', 'CONCURRENCY'],
  },
  {
    id: 'SAG-CON-007', alan: 'Sağlık', rota: '/saglik', eksen: 'yetki',
    amac: 'Sırların ekrana hiç çıkmaması',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Connector bir sır referansı taşıyor', veriHali: 'normal',
    eylem: 'Connector çekmecesini açar',
    beklenenSonuc: 'Yalnız maske görünür; sır DEĞERİ hiç taşınmaz',
    beklenenEkran: 'Maskelenmiş referans',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'SAG-KUR-001', alan: 'Sağlık', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Bağlanmadan önce ne olacağını görmek',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Connector yapılandırılmış', veriHali: 'normal',
    eylem: 'Kuru koşu çalıştırır',
    beklenenSonuc: 'Hiçbir kayıt YAZILMAZ; sayaçlar gösterilir',
    beklenenEkran: 'Kuru koşu desteklenmiyorsa açıkça söylenir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['INTEGRATION'],
  },
  {
    id: 'SAG-RED-001', alan: 'Sağlık', rota: '/saglik/reddedilenler',
    eksen: 'veri',
    amac: 'Kabul edilmeyen kayıtların nedenini görmek',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Reddedilen kayıt var', veriHali: 'kısmi',
    eylem: 'Reddedilenler ekranını açar',
    beklenenSonuc: 'Aşama ve sebep listelenir',
    beklenenEkran: 'Kayıt sessizce düşmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'SAG-MOT-001', alan: 'Sağlık', rota: '/saglik', eksen: 'veri',
    amac: 'Motorların koşup koşmadığını görmek',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Motor kütüğü dolu', veriHali: 'normal',
    eylem: 'Sağlık ekranını açar',
    beklenenSonuc: 'Her motorun son koşusu ve sonucu görünür',
    beklenenEkran: 'Hiç koşmamış motor ayrı gösterilir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'ENGINE'],
  },
  {
    id: 'SAG-MOT-002', alan: 'Sağlık', rota: '—', eksen: 'veri',
    amac: 'Motor kütüğünün ekranla ayrışmaması',
    rol: 'geliştirici / denetçi', kapsam: 'kurum geneli',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Kütük, sözlük ve iş tanımları karşılaştırılır',
    beklenenSonuc: 'Üçü de AYNI motor kümesini söyler',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'ENGINE'],
  },

  /* ── API ────────────────────────────────────────────────────────── */
  {
    id: 'API-KIM-001', alan: 'API', rota: '—', eksen: 'yetki',
    amac: 'Anahtarsız isteğin veri göstermemesi',
    rol: 'API istemcisi', kapsam: 'yok',
    onkosul: 'Anahtar gönderilmiyor', veriHali: 'yok',
    eylem: 'Bir ucu çağırır',
    beklenenSonuc: '401 döner ve gövdede kayıt bulunmaz',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['API', 'RBAC'],
  },
  {
    id: 'API-KIM-002', alan: 'API', rota: '—', eksen: 'yetki',
    amac: 'Süresi dolmuş ya da iptal edilmiş anahtarın çalışmaması',
    rol: 'API istemcisi', kapsam: 'yok',
    onkosul: 'Anahtar iptal ya da süresi dolmuş', veriHali: 'bayat',
    eylem: 'Bir ucu çağırır',
    beklenenSonuc: '401 döner',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['API', 'RBAC'],
  },
  {
    id: 'API-KIM-003', alan: 'API', rota: '—', eksen: 'yetki',
    amac: 'Anahtarın veritabanında açık durmaması',
    rol: 'güvenlik denetçisi', kapsam: 'kurum geneli',
    onkosul: 'Anahtarlar üretilmiş', veriHali: 'normal',
    eylem: 'Anahtar tablosunu inceler',
    beklenenSonuc: 'Yalnız SHA-256 özeti ve kısa ön ek saklanır',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['API', 'RBAC'],
  },
  {
    id: 'API-KPS-001', alan: 'API', rota: '—', eksen: 'yetki',
    amac: 'Salt okunur anahtarın yazamaması',
    rol: 'API istemcisi', kapsam: 'salt okunur',
    onkosul: 'Anahtar salt okunur işaretli', veriHali: 'normal',
    eylem: 'Bir yazma ucunu çağırır',
    beklenenSonuc: 'Reddedilir',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['API', 'RBAC'],
  },
  {
    id: 'API-KPS-002', alan: 'API', rota: '—', eksen: 'yetki',
    amac: 'Anahtarın tesis kapsamının dışına çıkmaması',
    rol: 'API istemcisi', kapsam: 'tek tesis',
    onkosul: 'Kurumda başka tesisler de var', veriHali: 'normal',
    eylem: 'Varlık listesini okur',
    beklenenSonuc: 'Yalnız kendi tesisinin kayıtları döner',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['API', 'SCOPE'],
  },
  {
    id: 'API-KPS-003', alan: 'API', rota: '—', eksen: 'veri',
    amac: 'Uç kütüğünün sözleşmeyle ayrışmaması',
    rol: 'geliştirici / denetçi', kapsam: 'kurum geneli',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Uç dosyaları, kapsam listesi ve OpenAPI karşılaştırılır',
    beklenenSonuc: 'Üçü de AYNI uç kümesini söyler',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['API', 'DOMAIN'],
  },
  {
    id: 'API-DGR-001', alan: 'API', rota: '—', eksen: 'veri',
    amac: 'Bozuk yükün hangi alanda bozuk olduğunu öğrenmek',
    rol: 'API istemcisi', kapsam: 'anahtarın kapsamı',
    onkosul: 'Zorunlu bir alan eksik', veriHali: 'kısmi',
    eylem: 'Eksik gövdeyle gönderir',
    beklenenSonuc: '400 döner ve eksik alan adlandırılır',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['API'],
  },
  {
    id: 'API-IDM-001', alan: 'API', rota: '—', eksen: 'veri',
    amac: 'Tekrar gönderilen isteğin kaydı ikilememesi',
    rol: 'API istemcisi', kapsam: 'anahtarın kapsamı',
    onkosul: 'Aynı kaynak kaydı iki kez gönderiliyor',
    veriHali: 'yinelenen',
    eylem: 'İkinci isteği gönderir',
    beklenenSonuc: 'Kayıt tazelenir, yeni satır açılmaz',
    beklenenEkran: '—',
    beklenenIz: 'Köken kaydı', beklenenBildirim: 'yok',
    katmanlar: ['API', 'CONCURRENCY'],
  },

  /* ── Bildirim ve görev ──────────────────────────────────────────── */
  {
    id: 'BLD-KTU-001', alan: 'Bildirim', rota: '/bildirimler', eksen: 'veri',
    amac: 'Bana düşen işleri görmek',
    rol: 'herhangi bir kullanıcı', kapsam: 'kendi kutusu',
    onkosul: 'Okunmamış bildirim var', veriHali: 'normal',
    eylem: 'Bildirimler ekranını açar',
    beklenenSonuc: 'Yalnız kendi kutusundakiler görünür',
    beklenenEkran: 'Sayaç sıfırda rozet çizmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SCOPE'],
  },
  {
    id: 'BLD-KTU-002', alan: 'Bildirim', rota: '/bildirimler', eksen: 'akis',
    amac: 'Bildirimi okundu işaretlemek',
    rol: 'herhangi bir kullanıcı', kapsam: 'kendi kutusu',
    onkosul: 'Okunmamış bildirim var', veriHali: 'normal',
    eylem: 'Okundu işaretler',
    beklenenSonuc: 'Yalnız kendi kutusunda okundu olur; kayıt kapanmaz',
    beklenenEkran: 'Sayaç düşer',
    beklenenIz: 'Bildirim · guncelleme', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'SCOPE'],
  },

  /* ── Rapor ──────────────────────────────────────────────────────── */
  {
    id: 'RAP-KRN-001', alan: 'Rapor', rota: '/raporlar/karne', eksen: 'veri',
    amac: 'Denetime ya da yönetime bırakılacak tek sayfayı almak',
    rol: 'uyum yöneticisi', kapsam: 'kendi tesisi',
    onkosul: 'Kapsamda en az bir kayıt var', veriHali: 'normal',
    eylem: 'Uyum karnesini açıp yazdırır',
    beklenenSonuc: 'Endeks, kapsam büyüklüğü, açık bulgu/risk ve en zayıf beş '
      + 'kayıt tek sayfada; sayılar portföy ekranıyla AYNI formülden gelir',
    beklenenEkran: 'Yüzdenin yanında bilinmeyen payı; ölçülmemiş değer "—"',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'RAP-KRN-002', alan: 'Rapor', rota: '/raporlar/karne', eksen: 'veri',
    amac: 'Farklı ölçülerin toplanmaması',
    rol: 'uyum yöneticisi', kapsam: 'tümü',
    onkosul: 'Kapsam iki sektöre yayılıyor', veriHali: 'aykiri',
    eylem: 'Karneyi mercek seçmeden açar',
    beklenenSonuc: 'Toplam kapasite ÜRETİLMEZ; sebebi yazılır',
    beklenenEkran: '"ortak ölçü yok — toplanmaz"; çıplak bir sayı yok',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'RAP-URT-001', alan: 'Rapor', rota: '/raporlar', eksen: 'veri',
    amac: 'Yönetime sunulacak özeti almak',
    rol: 'uyum yöneticisi', kapsam: 'kendi tesisi',
    onkosul: 'Veri var', veriHali: 'normal',
    eylem: 'Raporu dışa aktarır',
    beklenenSonuc: 'Sayfa başına Excel ve CSV üretilir',
    beklenenEkran: 'Hangi sayfanın indirileceği açık',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'RAP-URT-002', alan: 'Rapor', rota: '/raporlar', eksen: 'yetki',
    amac: 'Raporun kapsam dışına çıkmaması',
    rol: 'uyum uzmanı', kapsam: 'tek tesis',
    onkosul: 'Kurumda başka tesisler var', veriHali: 'normal',
    eylem: 'Rapor üretir',
    beklenenSonuc: 'Yalnız kendi kapsamı raporlanır',
    beklenenEkran: 'Sayılar ekranla aynı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SCOPE'],
  },

  /* ── İçe aktarım ve eşleme ──────────────────────────────────────── */
  {
    id: 'IMP-XLS-001', alan: 'İçe aktarım', rota: '/ice-aktarim',
    eksen: 'veri',
    amac: 'Elde olan listeyi sisteme almak',
    rol: 'BT yöneticisi', kapsam: 'kendi tesisi',
    onkosul: 'Dosya geçerli', veriHali: 'normal',
    eylem: 'Dosyayı yükler',
    beklenenSonuc: 'Kayıtlar ayrıştırılır ve önizlenir',
    beklenenEkran: 'Yazmadan önce ne olacağı gösterilir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'IMP-XLS-002', alan: 'İçe aktarım', rota: '/ice-aktarim',
    eksen: 'veri',
    amac: 'Bozuk dosyanın veriyi kirletmemesi',
    rol: 'BT yöneticisi', kapsam: 'kendi tesisi',
    onkosul: 'Dosyada eksik/bozuk satır var', veriHali: 'kısmi',
    eylem: 'Dosyayı yükler',
    beklenenSonuc: 'Bozuk satır reddedilir ve sebebi yazılır',
    beklenenEkran: 'Kaç satır kabul, kaç satır ret — ayrı',
    beklenenIz: 'Reddedilen kayıt', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'ESL-PRF-001', alan: 'Eşleme', rota: '/esleme', eksen: 'veri',
    amac: 'Kaynak alanını hedef alana bağlamak',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Profil taslak', veriHali: 'normal',
    eylem: 'Eşleme kuralı ekler ve profili etkinleştirir',
    beklenenSonuc: 'Yeni sürüm açılır; eski sürüm EZİLMEZ',
    beklenenEkran: 'Sürüm numarası görünür',
    beklenenIz: 'Profil · olusturma', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'ESL-PRF-002', alan: 'Eşleme', rota: '/esleme', eksen: 'veri',
    amac: 'Eşlemenin örnek veriyle sınanabilmesi',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Örnek kayıt girilmiş', veriHali: 'normal',
    eylem: 'Önizleme çalıştırır',
    beklenenSonuc: 'Sonuç gösterilir; hiçbir kayıt yazılmaz',
    beklenenEkran: 'Dönüşen alanlar yan yana',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },

  /* ── Sistem sayfaları ve kabuk ──────────────────────────────────── */
  {
    id: 'SIS-HTA-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Olmayan bir adreste kaybolmamak',
    rol: 'herhangi bir kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Adres yok', veriHali: 'yok',
    eylem: 'Geçersiz bir adres açar',
    beklenenSonuc: 'Bulunamadı sayfası ve dönüş yolu gösterilir',
    beklenenEkran: 'Ana ekrana bağ',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-SAHA-001', alan: 'Sistem', rota: '/', eksen: 'arayuz',
    amac: 'Saha tuvalindeki her tesis künyesinin OKUNABİLİR kalması — '
      + 'üst üste binen künye iki tesisin adını tek okunamaz metne çevirir '
      + 've kullanıcı hangi tesise baktığını bilemez',
    rol: 'herhangi bir kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Kurulu gücü kaydedilmemiş birden çok tesis var — hepsi '
      + 'dikey eksenin aynı bandına iner', veriHali: 'bilinmeyen',
    eylem: 'Saha ekranını açar',
    beklenenSonuc: 'Künyeler ayrı yollara açılır; hiçbiri üst üste binmez '
      + 've NOKTALAR yerinden oynamaz (nokta ölçülen veridir)',
    beklenenEkran: 'Uyum × güç tuvali',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Her ekranda nerede olduğunu bilmek',
    rol: 'herhangi bir kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Kullanıcı giriş yapmış', veriHali: 'normal',
    eylem: 'Rotalar arasında gezinir',
    beklenenSonuc: 'Aktif bölüm gezinmede işaretlidir',
    beklenenEkran: 'Her sayfada tek bir ana bölge bulunur',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-ERS-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Klavyeyle çalışabilmek',
    rol: 'klavye kullanıcısı', kapsam: 'kendi kapsamı',
    onkosul: 'Fare kullanılmıyor', veriHali: 'normal',
    eylem: 'Sekme ile gezinir',
    beklenenSonuc: 'Odak görünür ve sıra mantıklıdır',
    beklenenEkran: 'Çekmecede odak tuzağı ve ESC çalışır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['ACCESSIBILITY', 'UI'],
  },
  {
    id: 'SIS-RSP-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Dar ekranda bilgi kaybetmemek',
    rol: 'sahadaki kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Ekran dar', veriHali: 'normal',
    eylem: 'Ekranı daraltır',
    beklenenSonuc: 'Sayfa yatay kaymaz; içerik yeniden akar',
    beklenenEkran: 'Kritik bilgi gizlenmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['RESPONSIVE', 'UI'],
  },
  {
    id: 'SIS-DIL-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Ekranda geliştirici diliyle karşılaşmamak',
    rol: 'son kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Ekranlardaki metinleri okur',
    beklenenSonuc: 'Kullanıcıya dönük metinlerde teknik jargon yoktur',
    beklenenEkran: 'Türkçe, kısa, kurumsal',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },

  /* ── Saha ve portföy ────────────────────────────────────────────── */
  {
    id: 'PRT-OZT-001', alan: 'Portföy', rota: '/portfoy', eksen: 'veri',
    amac: 'Bütün tesislerin durumunu tek bakışta görmek',
    rol: 'kurum yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Tesisler tanımlı', veriHali: 'normal',
    eylem: 'Portföy ekranını açar',
    beklenenSonuc: 'Tesis başına özet görünür',
    beklenenEkran: 'Ölçülmemiş değer sıfıra çekilmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'PRT-OZT-002', alan: 'Portföy', rota: '/tesisler/[id]', eksen: 'veri',
    amac: 'Tek bir tesisin bütün resmini görmek',
    rol: 'tesis sorumlusu', kapsam: 'kendi tesisi',
    onkosul: 'Tesis kimliği geçerli', veriHali: 'normal',
    eylem: 'Tesis detayını açar',
    beklenenSonuc: 'Varlık, uyum, risk ve olay özetleri birlikte görünür',
    beklenenEkran: 'Fotoğrafı olmayan tesis tipografik karşılık alır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'PRT-OZT-003', alan: 'Portföy', rota: '/portfoy', eksen: 'veri',
    amac: 'Sıralama etiketinin sektörün sözcüğünü söylemesi',
    rol: 'kurum yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Mercek su sektöründe; birincil ölçü "günlük debi" — ölçüldü '
      + '(8 Eyl 2026, yayında): sıralama seçeneği ve kimlik paneli her mercekte '
      + '"Kurulu güç" yazıyordu; ölçünün DEĞERİ sektörden çözülüyor, ADI çekirdeğe gömülüydü',
    veriHali: 'normal',
    eylem: 'Sıralama listesi ve kimlik panelindeki birincil ölçü etiketi okunur',
    beklenenSonuc: 'Etiket sözlüğün `kapasite` anahtarından gelir: elektrik "kurulu güç", '
      + 'su "günlük debi", çekirdek "kapasite"; hiçbir sıralama satırı sektör sözcüğünü '
      + 'sabit taşımaz (çekirdek sözcük cırcırı taban 0)',
    beklenenEkran: 'Su merceğinde "Günlük debi", çekirdekte "Kapasite"',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'HRT-KNM-001', alan: 'Harita', rota: '/harita', eksen: 'veri',
    amac: 'Tesislerin coğrafi dağılımını görmek',
    rol: 'kurum yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Koordinatı olmayan tesis var', veriHali: 'kısmi',
    eylem: 'Haritayı açar',
    beklenenSonuc: 'Koordinatsız tesis uydurma bir yere KONMAZ',
    beklenenEkran: 'Listede ayrıca sayılır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'HRT-DOK-010', alan: 'Harita', rota: '/harita', eksen: 'arayuz',
    amac: 'İşaretin dokunulabilir olması — ölçüldü: vuruş dairesi SVG '
      + 'kullanıcı biriminde veriliyordu ve 375px’te ekranda 11px ÇAP '
      + 'oluyordu, beyan edilen WCAG 2.2 AA eşiğinin yarısından az',
    rol: 'telefonla bakan kullanıcı', kapsam: 'kurum geneli',
    onkosul: 'Haritaya yerleşen tesis var', veriHali: 'normal',
    eylem: 'Haritayı 375px ve 1440px genişlikte açar',
    beklenenSonuc: 'Her işaretin vuruş alanı iki bantta da en az 24 CSS '
      + 'piksel; yarıçap tuvalin ölçeğinden TÜRETİLİR, sabit yazılmaz',
    beklenenEkran: 'Harita tuvali',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'HRT-DOK-011', alan: 'Harita', rota: '/harita', eksen: 'arayuz',
    amac: 'Küçük bir hedefin TEK yol olmaması — işaret küçük kalmak '
      + 'zorunda (konum ölçülen veridir) ama bu, ona ulaşmanın başka '
      + 'yolu olmamasını meşru kılmaz',
    rol: 'telefonla bakan kullanıcı', kapsam: 'kurum geneli',
    onkosul: 'Panel eskiden boştu ve "bir işarete tıklayın" diyordu',
    veriHali: 'normal',
    eylem: 'Panel listesinden bir satıra dokunur',
    beklenenSonuc: 'Listede haritadaki her işaret için bir satır var, her '
      + 'satır en az 24px, dokunulan satır haritadaki işareti seçer ve '
      + 'künyeyi açar; seçim iki yüzeyde birden işaretlidir',
    beklenenEkran: 'Harita yan paneli · tesis listesi',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-UYM-030', alan: 'Uyum', rota: '/uyum', eksen: 'arayuz',
    amac: 'Bir kontrolün tesislerin yalnız BİR KISMINA uygulandığı '
      + 'satırın görülmesi — ölçüldü: kapsam kolonunun on dört değeri de '
      + 'tek renkteydi, "5 / 5" ile "2 / 5" ayırt edilemiyordu',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Matriste tam ve eksik kapsamlı satırlar birlikte',
    veriHali: 'kısmi',
    eylem: 'Matrisi açar ve kapsam kolonunu tarar',
    beklenenSonuc: 'Eksik kapsamlı satır mürekkebe çıkar, tam kapsam '
      + 'sessiz kalır; ölçüt veriden gelir (kapsamda < tesis sayısı), '
      + 'sabit bir sayıdan değil',
    beklenenEkran: 'Uyum matrisi · kapsam kolonu',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-UYM-031', alan: 'Uyum', rota: '/uyum', eksen: 'arayuz',
    amac: 'İstisnanın yalnız RENGE bağlı olmaması',
    rol: 'renk ayrımı sınırlı kullanıcı', kapsam: 'kurum geneli',
    onkosul: 'Eksik kapsamlı satır var', veriHali: 'kısmi',
    eylem: 'Kapsam hücresinin üstünde durur ya da ekran okuyucuyla okur',
    beklenenSonuc: 'Hücre kaç tesiste kapsamda olduğunu SÖZLE de söyler; '
      + 'sayı iki hâlde de çizilir, gizlenmez',
    beklenenEkran: 'Uyum matrisi · kapsam hücresi',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-UYM-032', alan: 'Uyum', rota: '/uyum', eksen: 'arayuz',
    amac: 'Vurgu sınıfının ÖLÜ kalmaması — sınıf yazılıp CSS’i '
      + 'yazılmazsa kural bir yorumdan ibaret olurdu',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Kapsam kolonunun iki hâli var', veriHali: 'normal',
    eylem: 'Kabuk CSS’inde iki kural karşılaştırılır',
    beklenenSonuc: 'İki kural farklı renk yazar; aynı rengi yazan bir '
      + 'ayrım ayrım değildir',
    beklenenEkran: 'Sınıf gerçekten bir şey yapıyor',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-UYM-033', alan: 'Uyum', rota: '/uyum', eksen: 'arayuz',
    amac: 'Ekranın CEVABININ ilk bakışta okunması — ölçüldü (15 Eyl 2026, '
      + 'kullanıcı geri bildirimi): "8 uygunsuz" sağ üstte 11px’te, aynı '
      + 'ağırlıkta on etiketin arasındaydı; "nereye odaklanacağımı '
      + 'anlamıyorum"',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Aktif çerçevede uygunsuz hücre var', veriHali: 'normal',
    eylem: 'Ekranı açar ve başlığı okur',
    beklenenSonuc: 'Başlık "N uygunsuz — nerede, ve neden?" der; uygunsuz '
      + 'yoksa "Uygunsuz yok"; taslak çerçevede "Ölçülmedi" (sıfır değil)',
    beklenenEkran: 'Uyum · ekran başlığı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-UYM-034', alan: 'Uyum', rota: '/uyum', eksen: 'arayuz',
    amac: 'Başlığın çevresindeki büyük harfli etiketlerden AYRI bir sesle '
      + 'konuşması — ölçüldü: kabukta 74 büyük harfli kural var, başlık da '
      + 'büyük harf olunca hiçbir şey öne çıkmıyordu',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Kabuk CSS’i ve DESIGN.md okunur', veriHali: 'normal',
    eylem: '`.ab-lede h1` kuralı ve Display satırı karşılaştırılır',
    beklenenSonuc: 'Başlık cümle düzenindedir (uppercase yok); aile, boy ve '
      + 'ağırlık korunur; belge ile kod ayrışmaz',
    beklenenEkran: 'Ekran başlığı · tasarım belgesi',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-UYM-035', alan: 'Uyum', rota: '/uyum', eksen: 'arayuz',
    amac: 'Uygunsuz satırın kalabalığın içinden ÇIKMASI — belge "matris en '
      + 'kötüden iyiye sıralanır" diyordu, ekran kod sırası veriyordu '
      + '(niyet vardı, bağ yoktu)',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Matriste uygunsuz, kısmi, değerlendirilmemiş ve uygun satırlar '
      + 'birlikte', veriHali: 'normal',
    eylem: 'Ekranı açar; gerekirse "Kod sırası" düğmesine dokunur',
    beklenenSonuc: 'Varsayılan sıra önemdir (uygunsuz › kısmi › bilinmeyen › '
      + 'uygun; bilinmeyen en alta atılmaz); ağırlık tek kaynaktan gelir; kod '
      + 'sırası tek dokunuşla açılır ve silinmemiştir',
    beklenenEkran: 'Uyum matrisi · satır sırası',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'DOMAIN'],
  },
  {
    id: 'SIS-UYM-036', alan: 'Uyum', rota: '/uyum', eksen: 'arayuz',
    amac: 'Lejantın her açılışta dört durum çizerek dikkat ÇALMAMASI',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Ekran açık', veriHali: 'normal',
    eylem: 'Kenar çubuğundaki "Okuma anahtarı" özetine dokunur',
    beklenenSonuc: 'Anahtar varsayılan KAPALI bir açılır kutudur; özet '
      + 'klavyeyle odaklanır ve açılır; içerik silinmemiştir',
    beklenenEkran: 'Uyum · kenar çubuğu',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-UYM-037', alan: 'Uyum', rota: '/uyum', eksen: 'arayuz',
    amac: 'Matrisin ekranın ilk gövdesi olması — eğilim kutusu ve yardımcı '
      + 'cümle matrisin ÜSTÜNDE duruyordu; ikisi de cevap değil bağlamdı',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Ekran açık', veriHali: 'normal',
    eylem: 'Ekranı yukarıdan aşağı okur',
    beklenenSonuc: 'Başlıktan sonra matris gelir; eğilim şeridi matrisin '
      + 'altında ince bir çizgiyle ayrılmıştır; "Satır = kontrol · sütun = '
      + '…" cümlesi yoktur',
    beklenenEkran: 'Uyum · gövde sırası',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-UYM-038', alan: 'Uyum', rota: '/uyum', eksen: 'arayuz',
    amac: 'Bir şey söylemeyen kolonun çizilmemesi — ölçüldü: tohumda on '
      + 'dört satırın on dördü "5 / 5" idi, kolon on dört eş sayı ekliyordu',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Her satır tesislerin tamamında kapsamda', veriHali: 'normal',
    eylem: 'Matrisi ve altbilgiyi okur',
    beklenenSonuc: 'Kapsam kolonu çizilmez; altbilgi "Her kontrol N tesisin '
      + 'tamamında kapsamda" der; tek bir satır bile eksikse kolon geri '
      + 'gelir ve eksik satır mürekkebe çıkar (ölçüt veriden)',
    beklenenEkran: 'Uyum matrisi · kapsam kolonu',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-031', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Büyük harfin yapısal kaşta kalması — ölçüldü (odak turu, '
      + '1440×900): ana sayfada 83 büyük harfli metin parçasının 24’ü tesis '
      + 'adıydı, 3’ü üretim tipi adı, biri tam bir cümle; portföyde seçili '
      + 'tesis adı 34px, tesis dosyasında 78px büyük harfti. Kaşla aynı '
      + 'sesle konuşan veri kaşı işlevsiz kılar',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Kabuk CSS’i okunur', veriHali: 'normal',
    eylem: 'Her büyük harf kuralı boyuyla birlikte sınıflanır; 13px ve üstü '
      + 'olanlar izin listesiyle karşılaştırılır; ad/başlık/cümle sınıfları '
      + 'kaş boyunun üstünde büyük harf taşıyamaz',
    beklenenSonuc: 'İzin dışı büyük boy büyük harf 0; izin listesinde ölü '
      + 'satır 0; boyunu bildirmeyen kural 0; tarama tabanın altına inmez',
    beklenenEkran: 'Veri, ad ve cümle cümle düzeninde; kaş ve gezinme büyük harf',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'PRT-ODK-001', alan: 'Portföy', rota: '/tesisler', eksen: 'arayuz',
    amac: 'Portföyün ilk açılışta cevap vermesi — ölçüldü: ekran kapasite '
      + 'sırasıyla açılıyor ve kendi notunda "kapasite bir zayıflık ölçüsü '
      + 'değil — en zayıf işareti bu sıralamada yok" diyordu',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Portföyde ölçülmüş ve ölçülmemiş tesisler birlikte',
    veriHali: 'kısmi',
    eylem: 'Portföyü açar',
    beklenenSonuc: 'İlk satır ve seçili panel en düşük uyum endeksli tesistir; '
      + 'ölçülmemiş tesisler sona düşer ve "ölçülmedi" yazar (bilinmeyen ≠ '
      + 'sıfır); kapasite sırası seçicide durur, silinmemiştir',
    beklenenEkran: 'Portföy · plakalar ve kimlik paneli',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'DOMAIN'],
  },
  {
    id: 'TES-ODK-001', alan: 'Tesis', rota: '/tesisler/[id]', eksen: 'arayuz',
    amac: 'Tesis dosyası başlığının cümle düzeninde olması — ad iki yerde '
      + 'birden büyük harfe çevriliyordu (CSS ve JS); yalnız CSS düzeltilse '
      + 'ekran aynı kalır, bekçi yeşil yanardı',
    rol: 'yönetici', kapsam: 'kendi kapsamı',
    onkosul: 'Tesis dosyası açık', veriHali: 'normal',
    eylem: 'Plaka başlığını okur',
    beklenenSonuc: 'Ad cümle düzeninde, iki satır ve tip rengi korunmuş; '
      + 'satır aralığı küçük harfin kuyruğunu kesmez',
    beklenenEkran: 'Tesis 360 · plaka',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-UYM-039', alan: 'Uyum', rota: '/uyum', eksen: 'arayuz',
    amac: 'Altbilgideki cümlenin büyük harfle bağırmaması — "6 hücre '
      + 'değerlendirilmedi — sıfır değil, bilinmeyen" kaş etiketiyle '
      + 'basılıyordu',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Matris açık', veriHali: 'normal',
    eylem: 'Altbilgiyi okur',
    beklenenSonuc: 'Satır dip nottur (`.ab-dip.satir`), cümle düzeninde; '
      + 'içerik değişmemiştir',
    beklenenEkran: 'Uyum · altbilgi',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SAH-ODK-001', alan: 'Saha', rota: '/', eksen: 'arayuz',
    amac: 'Ana sayfada kaş ile verinin ayrı sesle konuşması — 24 kart adı ve '
      + '3 tip adı büyük harfti; gücü ölçülmemiş şeridinin notu kaştan büyük '
      + 'harf miras alıyordu',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Saha açık', veriHali: 'normal',
    eylem: 'Ekranı okur',
    beklenenSonuc: 'Kart adı ve tip adı cümle düzeninde; kaş etiketleri ve '
      + 'gezinme büyük harf kalır; tek ekran sözleşmesi bozulmaz (şeridin yöntem '
      + 'notu 15 Eyl 2026\'da title\'a taşınmış, 17 Eyl 2026\'da title erişilmez '
      + 'olduğu için tümüyle SİLİNMİŞTİR — SAH-SDL-001; bu vaka artık yalnız '
      + 'kart adı ve tip etiketini ölçer)',
    beklenenEkran: 'Saha · tesis şeridi ve takımyıldız',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SAH-SER-001', alan: 'Saha', rota: '/', eksen: 'arayuz',
    amac: 'Tesis şeridinde fotoğrafların "yüksekliği farklı" okunması — 24 kart '
      + 'eşit boydayken boydan boya fotoğraf, gradyan perde, %38 opaklık ve ilk '
      + 'dört karttaki kırmızı iç çerçeve kartları farklı boyda gösteriyordu',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Saha açık, en az bir tesisin fotoğrafı yok', veriHali: 'normal',
    eylem: 'Şeridi tarar, uygunsuzu olan kartı ve fotoğrafsız kartı okur',
    beklenenSonuc: 'Her kartta aynı yükseklikte fotoğraf bandı, metin bandın '
      + 'altında panel zemininde; fotoğrafsız tesis aynı bandı düz zeminle alır; '
      + 'çerçeve yok, uygunsuzluk yığın çubuğu + skor rengi + bağ başlığında sözcükle',
    beklenenEkran: 'Saha · tesis şeridi',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SAH-SDL-001', alan: 'Saha', rota: '/', eksen: 'arayuz',
    amac: 'Ana sayfada karar yüzeyinde tekrar ve yöntem notu — katman paneli yedi '
      + 'tip adını üç satırda sayıyordu, gücü ölçülmemiş şeridi yöntem notunu '
      + 'ekrana yazıyordu, "N ölçülemedi" iki KPI\'da aynı sayıyla duruyordu ve '
      + 'aynı adlı iki tip ("Merkez BT" · enerji ve su) ekranda aynı adla çiziliyordu',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Saha açık, çekirdek mercek (iki sektör birlikte)', veriHali: 'normal',
    eylem: 'Katman panelini, gücü ölçülmemiş şeridini ve öncelik şeridini okur',
    beklenenSonuc: 'Kalan tipler sayıyla ("Diğer 7 tip · 16 tesis"), adlar '
      + 'odaklanabilir açılır listede; gücü ölçülmemiş şeridinin yöntem notu '
      + 'SİLİNMİŞTİR — sebebi etiketin kendisi ("Kurulu güç ölçülmedi"), sonucu '
      + 'konumu (eksenin altında) söyler; "ölçülemedi" yalnız Kritik risk '
      + 'kaleminde (risk yoğunluğunda ancak kritik ve yüksek sıfırken); aynı adlı '
      + 'tipler sektör adıyla ayrılır, tek sektörlü kiracı ek görmez',
    beklenenEkran: 'Saha · katman paneli, takımyıldız, öncelik şeridi',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'DOMAIN'],
  },
  {
    id: 'URN-TIP-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Tipografik ölçek jetondan gelmiyordu. Ölçüldü (18 Eyl 2026, '
      + 'yorumlar çıkarılarak): kabuk.css içindeki 360 font-size '
      + 'bildiriminin 240\'ı (%66) jeton katmanını ATLIYORDU ve jeton '
      + 'katmanının kendisi 15 jetonu 10 değere çakıştırıyordu — dördü '
      + 'aynı 11px, üçü aynı 12,5px. `--t-code-lg` adında "büyük" diyor, '
      + '`--t-code` ile aynı değeri taşıyordu. Üç piksel aralığında altı '
      + 'kademe vardı ve tek başına 11px bildirimlerin %44\'üydü; üst uç '
      + 'boştu. Kapının İLK yazımı da kör doğdu: yalnız kabuk.css\'e '
      + 'bakıyordu ve TSX satır içi 305 başvuru ile giriş stilinin 15 '
      + 'bildirimi evrenin dışındaydı — gerçek payda 360 değil 682.',
    rol: 'geliştirici', kapsam: 'ürün geneli',
    onkosul: 'Kaynak ağacı okunabilir', veriHali: 'normal',
    eylem: 'Tipografi bekçisi kaynağı tarar',
    beklenenSonuc: 'Ölçek SEKİZ kademedir (10 · 11 · 13 · 16 · 21 · 28 · '
      + '40 · 58), her kademe TEK rol taşır ve komşu oran %8\'in altına '
      + 'inemez. Bildirimlerin %95\'inden çoğu jetondan geçer; geçmeyen '
      + 'her biri izin listesinde değeriyle, sayısıyla ve gerekçesiyle '
      + 'durur (baskı puntosu · akışkan clamp · bilinçli inherit). İki '
      + 'jeton aynı değeri taşıyamaz, tanımlanan her jeton kullanılır ve '
      + 'BAŞVURULAN her jeton TANIMLIDIR — tanımsız var() özelliği '
      + 'geçersiz kılar ve ekran sessizce kalıtıma döner. Aynı disiplin '
      + 'ÜÇ EKSENDE birden koşar: boy (--t-*), harf aralığı (--tr-*) ve '
      + 'satır aralığı (--lh-*); ölçüm tabanı da eksen BAŞINADIR, çünkü '
      + 'tek eksenli bir taban öbür ikisinin körleşmesini göremez.',
    beklenenEkran: 'Ürün geneli — kaynak taraması',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SAH-SER-002', alan: 'Saha', rota: '/', eksen: 'arayuz',
    amac: 'Saha şeridinin kaydırma çubuğu kullanıcı tarafından İKİ KEZ '
      + 'bildirildi (15 ve 18 Eyl 2026): "siteden bağımsız, kötü ve çok '
      + 'dikkat çekiyor". Çubuğun RENGİ düşürülemez (WCAG 1.4.11 · 3:1, '
      + 'dört zeminde ölçülü) ve GİZLENEMEZ (gizleme izni kabuk gezinme '
      + 'raylarıyla sınırlı, URN-CBK-001). Kalan tek yol uzunluktu: '
      + '24 kart × 218px = 5 224px; 1914px bantta başparmak %37. '
      + 'İlk plan "yalnız müdahale gerektirenleri göster" idi ve ÖLÇÜM '
      + 'ONU ÇÜRÜTTÜ: 6 tesisin uygunsuzu var, 16\'sı ÖLÇÜLMEMİŞ, 2\'si '
      + 'temiz — "müdahale gerektiren" 22/24 eder ve süzmek iki kartı '
      + 'düşürürdü. Asıl bulgu TEKRARDI: o 16 tesis aynı ekranda iki kez '
      + 'duruyor — takımyıldızın değerlendirilmemiş bandında (sayı, güç, '
      + 'ilk üç ad, açılır panel) ve şeritte 16 kart olarak.',
    rol: 'BT direktörü', kapsam: 'kurum geneli',
    onkosul: 'Portföyde hem ölçülmüş hem ölçülmemiş tesis var',
    veriHali: 'kısmi',
    eylem: 'Saha ekranı açılır, şerit incelenir',
    beklenenSonuc: 'Şerit YALNIZ uyumu ÖLÇÜLMÜŞ tesisleri taşır ve '
      + 'süzgeç ölçütü `endeks !== null`dur — uygunsuzluğa, skora ya da '
      + 'tipe göre süzmek bir uygunsuzu gizleyebilirdi. Süzülen küme '
      + 'KAYBOLMAZ ("bilinmeyen ≠ sıfır"): değerlendirilmemişler '
      + 'takımyıldızın kendi bandında adlarıyla ve sayısıyla durur. '
      + 'Başlık portföyün TAMAMINI söyler, şeridin uzunluğunu değil; '
      + 'şeridin sonunda tümüne giden bağ vardır ve bağ SONDA durur — '
      + 'karar sırası önce, gezinme sonra. Ölçüldü: içerik 5 224px\'ten '
      + '1 900px\'e indi; 1914px bantta şerit artık HİÇ KAYMIYOR, '
      + '1366px\'te başparmak %26\'dan %72\'ye çıktı.',
    beklenenEkran: 'Saha · tesis şeridi',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SAH-SER-003', alan: 'Saha', rota: '/', eksen: 'arayuz',
    amac: 'Kullanıcı Saha şeridini ÜÇÜNCÜ kez bildirdi (19 Eyl 2026) ve '
      + 'bu kez soru değişti: "hangisinin fazla olduğuna sen karar ver". '
      + 'Bölge denetimi şeridi ekranın ikinci en büyük bölgesi ölçtü '
      + '(304k px² · 38 metin parçası) ve şeridin sekiz tesis bağının '
      + 'KİMLİK KÜMESİ takımyıldızınkiyle birebir aynı çıktı. Şerit '
      + 'kaldırıldı — sonra `kabuk.css`te 17 Eyl 2026 tarihli bir karşı '
      + 'ölçüm okundu: dar bantta tuval künyeleri çizilmiyor ve şerit '
      + 'tesis ADLARININ okunduğu tek yüzey. Ölçüm HEDEF saymıştı, '
      + 'görünür AD saymamıştı — payda o eksende kördü. Yeniden '
      + 'ölçüldü ve sınır iki pikselde kesin çıktı: 1101px’te künye 4 · '
      + 'güçsüz şerit 4 · şeride özgü ad 0; 1100px’te künye 0 · şeride '
      + 'özgü ad 4 (en kötü dört tesis). Şerit bu yüzden KALDIRILMADI, '
      + 'BANDINA ÇEKİLDİ. Kusur sınıfı iki eşiğin ayrışmasıdır: künyeyi '
      + 'susturan kural ile şeridi gizleyen kural ayrı yerlerde durur ve '
      + 'ayrışırlarsa arada DÖRT ADIN ekrandan tümüyle kaybolduğu bir '
      + 'pencere açılır — iki kural da tek başına doğru olduğu için '
      + 'hiçbir kapı görmez ("tek tek doğru, BİRLİKTE tutarsız").',
    rol: 'BT direktörü', kapsam: 'kurum geneli',
    onkosul: 'Portföyde uyumu ölçülmüş en az dört tesis var',
    veriHali: 'kısmi',
    eylem: 'Saha ekranı 1101px ve 1100px bantlarında açılır; okunabilen '
      + 'tesis adları iki bantta karşılaştırılır',
    beklenenSonuc: 'Şerit yalnız ≤1100px’te çizilir; ≥1101px’te gizlidir '
      + 've orada ekrana tek bir yeni ad katmaz (şeride özgü ad 0). '
      + '≤1100px’te künye çizilmediği için şerit dört adın tek yüzeyidir. '
      + 'Şeridi gizleyen eşik, künyeyi susturan eşiğin BİTİŞİĞİDİR — '
      + 'aralarında ad kaybettiren bir pencere kalamaz. OKUNABİLEN TESİS '
      + 'ADLARININ KÜMESİ İKİ BANTTA DA AYNIDIR ve bu gerçek tarayıcıda '
      + 'ölçülür. Geniş bantta şeridin başlığı da gizlendiği için '
      + 'portföyün sayısı ve güç toplamı takımyıldızın başlığında durur.',
    beklenenEkran: 'Saha · tesis şeridi ve takımyıldız',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'URN-KBK-022', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Kabuk kromu (56px başlık · 32px ayak) her ekranda durur; '
      + 'oradaki bir kusur 49 rotanın hepsine dağılır. Ölçüldü '
      + '(18 Eyl 2026): (1) marka ile gezinme AYNI kademede yarışıyordu '
      + '— ikisi de 16px, tek fark ağırlıktı; 56px\'lik barda altı eşit '
      + 'ağırlıklı tipografik nesne vardı. (2) Ayak telifi kiracı adını '
      + 'KODA GÖMMÜŞTÜ (`© 2026 Demo Enerji`): başlık adı '
      + 'yapılandırmadan okuyordu, ayak okumuyordu — su kiracısı '
      + 'kurduğunda başlıkta kendi adını, ayakta "Demo Enerji" '
      + 'görüyordu ve "Enerji" ÇEKİRDEK bir bileşende duran bir SEKTÖR '
      + 'sözcüğüydü; yıl da sabitti. Marka kapısı bunu göremiyordu, '
      + 'çünkü nöbetçiyle yalnız ÜRÜN adını koruyordu. (3) Telif bağ '
      + 'kümesinin içine düşüyor, dört bağla tek küme gibi okunuyordu.',
    rol: 'geliştirici', kapsam: 'ürün geneli',
    onkosul: 'Kaynak ağacı okunabilir', veriHali: 'normal',
    eylem: 'Kabuk kromu bekçisi kaynağı tarar; marka kapısı nöbetçi '
      + 'ADLARLA derleyip çıktıyı okur',
    beklenenSonuc: 'Marka kademesi gezinmeden KESİNLİKLE büyüktür '
      + '(16px / 13px). Aktif sekme ÜÇ ipucu taşır — mürekkep, panel '
      + 'zemini ve bakır alt çizgi; durum yalnız renkle anlatılmaz. '
      + 'Kiracı adı kabuk bileşenine düz dizge olarak GİRMEZ; telif '
      + 'satırı adı `veri.kiraciAd`den, yılı takvimden hesaplar. '
      + 'Ayakta kimlik kümesi (künye · sürüm · telif) gezinme '
      + 'kümesinden ÖNCE gelir. Başlıkta büyük harf YALNIZ yapı ve '
      + 'birincil gezinmededir ve kural sayısı TAVANLIDIR (ölçüldü: '
      + 'ekrandaki 17 büyük harfli dizeden 9\'a, kaynaktaki 5 kurala '
      + 'indi; sektör adı, unvan ve eylem etiketi DEĞERDİR, kaş değil). '
      + 'Büyük harf bekçisi yalnız >=13px\'e baktığı için barın 10-11px '
      + 'yükünü göremiyordu; o körlük buradan kapanır. Kaydırma çubuğu '
      + 'İKİ SINIR arasında durur: >=3:1 (WCAG 1.4.11 — çubuk metin '
      + 'değil KONTROLDÜR) ve --i3\'ten sönük (ayırdığı içerikten '
      + 'okunaklı olamaz). Marka kapısı iki nöbetçi taşır ve '
      + 'kiracı adı sızıntısını KABUK KROMUYLA sınırlı tarar — '
      + 'beyanlı bir sınırdır, çünkü tohum verisinde tesis adları o adı '
      + 'meşru olarak taşır (ölçüldü: 567 dosya).',
    beklenenEkran: 'Kabuk · başlık ve ayak (bütün rotalar)',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'URN-TBL-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Kütük gramerinin tek yerden çıktığı İDDİA edilmişti; ölçüm '
      + 'iddiayı doğruladı ama BAŞKA bir kaymayı ortaya çıkardı. '
      + 'Ölçüldü (18 Eyl 2026): <Tablo> 46 dosyada, <VeriTablosu> 7 '
      + 'dosyada görünüyordu ve bu "iki rakip bileşen" gibi okunup göç '
      + 'planlanacaktı. Kaynak okunca dayanaksız çıktı — <Tablo> bir '
      + 'SARMALAYICIDIR, eski satır biçimini kolon biçimine çevirip '
      + 'çizimi VeriTablosu\'ya bırakır; 48 ekranı "göç ettirmek" aynı '
      + 'yolu ikinci kez çağırmak olurdu. Gerçek kusur altı ham <table> '
      + 'bildirimindeydi: beşi kendi gramerini taşıyor (baskı karnesi, '
      + 'fark tablosu, yardım çizelgesi, kontrast matrisi ×2), biri '
      + 'PAYLAŞILAN sınıfı (ab-vt) elle yazıyor — tedarikciler/loading '
      + 'iskeleti. Paylaşılan CSS\'i miras aldığı için ekranda doğru '
      + 'görünür, VeriTablosu\'nun kendi iskelet dalıyla hiçbir bağı '
      + 'yoktur ve biri değişirse öbürü değişmez.',
    rol: 'geliştirici', kapsam: 'ürün geneli',
    onkosul: 'Kaynak ağacı okunabilir', veriHali: 'normal',
    eylem: 'Tablo grameri bekçisi kaynağı tarar',
    beklenenSonuc: 'Paylaşılan bileşen dışındaki her ham <table> '
      + 'dosyasıyla, sınıfıyla ve GEREKÇESİYLE beyanlıdır; sayısı yalnız '
      + 'küçülür ve ölü izin satırı kabul edilmez. Paylaşılan sınıfı '
      + 'taşıyan kopya, paylaşılan grameri VAAT ETTİĞİ için yapısal '
      + 'sözleşmesini kanıtlar (aria-busy · .kolonbas · tr.iskelet · '
      + '.ab-vt-sar). İki giriş kapısı sözleşmesini sürdürür: Tablo '
      + 'VeriTablosu\'yu çağırır, Matris ise <table> değil ARIA '
      + 'rolleriyle (table · row · columnheader) tablo olan bir CSS '
      + 'ızgarasıdır — roller düşerse ekranda hiçbir şey değişmez, '
      + 'ekran okuyucuda her şey değişir.',
    beklenenEkran: 'Ürün geneli — kaynak taraması',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SAH-SDL-002', alan: 'Saha', rota: '/', eksen: 'arayuz',
    amac: 'Ekranın ölçeği karar değerinin TERSİNİ söylüyordu: durum '
      + 'manşeti 68px, eylem taşıyan tek satır (müdahale kuyruğunun bulgu '
      + 'başlığı) 13px — beş kat fark. Ray aynı 24 tesisi beşinci kez, '
      + 'ekranın beşte birini alarak çiziyordu ve sunucunun verdiği sırada '
      + 'duruyordu. Panel, kapsam daraltılmış olsa da koşulsuz "Grup '
      + 'durumu" diyordu. Kuyrukta 26px\'lik sıra rakamları 1,30:1 '
      + 'kontrastla duruyordu.',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Saha açık; müdahale kuyruğunda en az bir bulgu var', veriHali: 'normal',
    eylem: 'Ekranı okur ve rayı tarar',
    beklenenSonuc: 'Ekranın birincil işi MÜDAHALEDİR (ürün kararı, 17 Eyl '
      + '2026) ve ölçek bunu izler: durum manşeti eylemli satırı üç kattan '
      + 'fazla ezemez (oran bekçide, sabit sayı değil). Ray karar sırasına '
      + 'dizilir — açık uygunsuzluğu olan tesis önde, sıralama kararlıdır — '
      + 've kimlik şeridine iner; KALDIRILMAZ, çünkü dar bantta tesis '
      + 'adlarının okunduğu tek yüzey odur. Panel etiketi kapsamdan türer. '
      + 'Sıra rakamları silinmiştir: bilgi taşıyorsa erişilemez, '
      + 'taşımıyorsa süstü.',
    beklenenEkran: 'Saha · dikkat paneli, müdahale kuyruğu, tesis rayı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SAH-EKS-001', alan: 'Saha', rota: '/', eksen: 'arayuz',
    amac: 'Takımyıldızın eksenleri sabitti (%0–100 · 0–enBüyükGüç) ve çizilen '
      + 'dört tesis tuval genişliğinin %14,5\'ine, yüksekliğinin %31,9\'una '
      + 'sıkışıyordu — ekranın en büyük yüzeyi portföyün karar sorusunu '
      + 'okunamayacak bir yamada cevaplıyordu',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Saha açık; tuvale çizilen en az bir tesis var', veriHali: 'normal',
    eylem: 'Takımyıldızı okur ve eksen çentiklerine bakar',
    beklenenSonuc: 'Eksen penceresi ÇİZİLEN kümeden türetilir, uçları yuvarlanır '
      + 've çentikte YAZILIR (yatayda "%50 → %80", dikeyde sayı ve paketten '
      + 'gelen birimiyle); pencere en az iki adım '
      + 'geniştir, uyum endeksinde [0, 100] sınırını delmez; konum pencere '
      + 'içinde DOĞRUSALDIR (karekök ölçek kalkmıştır); dikey çentik yalnız '
      + 'çizilen tesislerin birimi TEKSE sayı yazar',
    beklenenEkran: 'Saha · takımyıldız',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SAH-TUV-001', alan: 'Saha', rota: '/', eksen: 'arayuz',
    amac: 'Künye çakışma çözücüsü künyeyi noktanın MERKEZİNDE sayıyordu; künye '
      + 'ise yönüne göre noktanın altında ya da üstünde durur ve zıt yönlere '
      + 'açılan iki künye merkezleri bir künye boyundan uzak olsa bile ekranda '
      + 'üst üste biniyordu',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Saha açık; tuvalde birbirine yakın en az iki tesis var', veriHali: 'normal',
    eylem: 'Takımyıldızdaki künyeleri okur',
    beklenenSonuc: 'Çözücü künyenin YÖNLÜ dikey şeridini hesaplar; biri yukarı '
      + 'biri aşağı açılan iki künye örtüşmez ve tarayıcı kapısı iki bantta da '
      + 'sıfır çift ölçer',
    beklenenEkran: 'Saha · takımyıldız',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SAH-TUV-002', alan: 'Saha', rota: '/', eksen: 'arayuz',
    amac: 'Künye modeli ile ekran farklı birim kullanıyordu: künye kutusu '
      + 'piksel, model ise tuval yüzdesi. Elle yazılan yüzde 1440\'ta '
      + 'gerçeğin üstünde, 1366 ve 1280\'de altındaydı; dar bantta model '
      + '"bu iki künye ayrık" deyip çakışmayı geçiriyordu. Aynı sapma '
      + 'yatay eksende de vardı ve 1024 ile 375\'te birer çakışma olarak '
      + 'ekranda duruyordu.',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Saha açık; tuvale çizilen en az iki tesis var', veriHali: 'normal',
    eylem: 'Takımyıldızı beş bantta okur (1440 · 1366 · 1280 · 1024 · 375)',
    beklenenSonuc: 'Künye yüzdesi tuval TABANINDAN türetilir ve en kötü '
      + 'durumu alır; CSS tabanı, şerit adımı ve model sabiti aynı sayıyı '
      + 'kullanır (bekçi üçünü karşılaştırır). Şerit tavanı PİKSELLE '
      + 'yazılır — yüzdeyle yazılmış bir piksel sınırı tuval kısalınca '
      + 'kendiliğinden kayıyordu. Serbest yüzen künye yüzeyi, tek kolona '
      + 'inen dar bantta hiç çizilmez: orada uzun adlar tuvalin yarısından '
      + 'geniştir ve hiçbir eşikle sığmaz; işaretler erişilebilir adlarıyla '
      + 'kalır, adlar rayda tam durur. Beş bantta da çakışma sıfırdır.',
    beklenenEkran: 'Saha · takımyıldız',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-PAL-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Kullanıcı "site genel olarak çok karanlık ve hâlâ düzenli değil" '
      + 'dedi. Ölçüldü (19 Eyl 2026) ve iki şikâyet TEK kusurda buluştu: '
      + 'metin kontrastı zaten kusursuzdu (16,84 / 10,41 / 6,36), kusur '
      + 'YÜZEY KADEMESİNDEYDİ — zemin → panel 1,042:1, panel → panel-2 '
      + '1,053:1. Üç yüzey birbirinden %10\'dan az ayrışıyordu, yani göz '
      + 'için tek siyahtı; koyu arayüzde düzeni yüzey kademesi kurar ve '
      + 'kademe çökünce ekran tek parça levhaya döner. `DESIGN.md` bu '
      + 'kademeyi ZATEN BEYAN EDİYORDU ("üç kademe", "panel zeminin bir '
      + 'kademe üstüdür") — beyan koddan ayrışmıştı. Kontrast kapısı bunu '
      + 'göremez ve bu beyanlı bir körlüktür: o kapı yalnız MÜREKKEP × '
      + 'YÜZEY oranını ölçer, yüzeyin YÜZEYE oranını hiçbir kapı '
      + 'ölçmüyordu. Kademeyi açmanın tavanını paletin EN SOLUK metin '
      + 'mürekkebi koyar: ölçüldü, bağlayıcı jeton `--bd` (kritik kırmızı) '
      + 've eski değeriyle kademe 1,075:1\'de kilitliydi — kilidi açan şey '
      + 'yüzey değil mürekkepti.',
    rol: 'BT direktörü', kapsam: 'kurum geneli',
    onkosul: 'Koyu kabuk paleti kurulu', veriHali: 'normal',
    eylem: 'Palet jetonları kaynaktan okunur; komşu yüzeylerin kontrast '
      + 'oranı ve saç çizgilerinin yüzeylere göre sırası hesaplanır',
    beklenenSonuc: 'Kademe SIRALIDIR (zemin < panel < panel-2) ve her komşu '
      + 'adım algılanabilir: 1,10:1 altı bir adım koyu yüzeyde ayrışma '
      + 'sayılmaz. Saç çizgileri EN PARLAK yüzeyin de üstündedir — yoksa '
      + 'panel üstündeki kenarlıklar görünmez olur (bu kusur gerçekten '
      + 'oldu: panel açılınca eski `--hr` panelden koyu kaldı). '
      + '`DESIGN.md`in yazdığı kademe sayıları ölçülenle AYNIDIR; belge '
      + 'koddan ayrışırsa kapı kırmızı yanar. Taban `olcum-tabani.json` '
      + 'içinde binde cinsinden durur ve yalnız yükselir.',
    beklenenEkran: 'Kabuk geneli — koyu tema yüzeyleri',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-CBK-001', alan: 'Sistem', rota: '/', eksen: 'arayuz',
    amac: 'Kaydırma çubuğu ürünün dışında kalmıştı: ana sayfada kayan tek kap '
      + '(tesis şeridi, 3 624px taşma) çubuk için hiçbir karar taşımıyordu, '
      + 'işletim sistemi kalın ve yuvarlak uçlu açık gri bir başparmak çiziyordu',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Saha açık; kayan kap var (tesis şeridi taşıyor)', veriHali: 'normal',
    eylem: 'Fareyle şeridi kaydırır; klasik kaydırma çubuğu çizen bir masaüstü tarayıcıda bakar',
    beklenenSonuc: 'Çubuk ince ve palet içinde (`--cubuk`); karar `.ab` kökünde '
      + 'bir kez verilir ve her kayan kaba kalıtımla iner; belge kökü aynı değeri '
      + 'taşır; çubuk gizlenmez (kayan içeriğin tek işareti) ve klasik kipe '
      + 'düşüren `::-webkit-scrollbar` renk/boy kuralı yoktur',
    beklenenEkran: 'Saha · tesis şeridi ve kabuğun tüm kayan kapları',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-SAHA-020', alan: 'Sistem', rota: '/', eksen: 'arayuz',
    amac: 'Saha ekranındaki "+N diğer" bağının parmakla vurulabilmesi — '
      + 'ölçüldü: satır 20px idi, ürünün beyan ettiği WCAG 2.2 AA 24×24 '
      + 'eşiğinin altında',
    rol: 'telefonla bakan kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Müdahale listesine sığmayan bulgu var', veriHali: 'normal',
    eylem: 'Saha ekranını açar ve listenin sonundaki bağa dokunur',
    beklenenSonuc: 'Bağ kutusu en az 24px; bütçeye sığmayan bir kalem '
      + 'düşse bile ulaşılamayan bir bağ bırakılmaz',
    beklenenEkran: 'Saha · müdahale gerektirenler',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-SAHA-021', alan: 'Sistem', rota: '/', eksen: 'arayuz',
    amac: 'Satır yüksekliğinin İKİ kaynakta ayrışmaması — CSS satırı '
      + 'çizer, bileşen onu ÇİZİLMEDEN ÖNCE bütçeye katar',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Yükseklik hem CSS’te hem bileşende yazılı', veriHali: 'normal',
    eylem: 'İki sayı karşılaştırılır',
    beklenenSonuc: 'Aynıdırlar; ayrışırlarsa bütçe hesabı sessizce yanlış '
      + 'olur ve son kalem kutudan taşar',
    beklenenEkran: 'Bütçe hesabı doğru',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-ERS-020', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Ürünün beyan ettiği erişilebilirlik eşiğinin KAPISI olması — '
      + 'ölçüldü: "WCAG 2.2 24px" ürünün kendi CSS’inde yazılıydı ama axe '
      + 'kapısı yalnız wcag2a + wcag2aa koşuyordu ve 2.5.8 o kümede YOK',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Axe kapısı üç bantta koşuyor', veriHali: 'normal',
    eylem: 'Kural etiketleri okunur',
    beklenenSonuc: 'Küme wcag22aa taşır ve eski etiketler düşmez; kapı '
      + 'eklendiği ilk koşuda gerçek bir ihlal buldu',
    beklenenEkran: 'Beyan edilen eşik ölçülüyor',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-ERS-021', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Eşiğin uydurulmaması — kapı kendi sayısını yazmaz, axe 2.5.8’i '
      + 'istisnalarıyla (satır içi · aralık · temel) uygular',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Ürün eşiği CSS’te beyan ediyor', veriHali: 'normal',
    eylem: 'Beyan ile kapının ölçtüğü ölçüt karşılaştırılır',
    beklenenSonuc: 'İkisi aynı eşiği söyler',
    beklenenEkran: 'Beyan ile kapı aynı şeyi ölçer',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },

  /* ── Yardım ─────────────────────────────────────────────────────── */
  {
    id: 'YRD-SOR-001', alan: 'Yardım', rota: '/yardim', eksen: 'arayuz',
    amac: 'Bir ekranı nasıl okuyacağını öğrenmek',
    rol: 'yeni kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Yardım ekranını açar',
    beklenenSonuc: 'Durum sözcükleri ve iş kuralları kaynağıyla açıklanır',
    beklenenEkran: 'Her cevabın altında kural dosyası anılır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
];

/* ── İkinci dalga: kalan platform yüzeyleri ─────────────────────────── */

export const PLATFORM_SENARYOLARI_2: Senaryo[] = [
  {
    id: 'OTR-HSP-001', alan: 'Oturum', rota: '/ayarlar', eksen: 'yetki',
    amac: 'Kendi parolamı güvenli biçimde değiştirmek',
    rol: 'kayıtlı kullanıcı', kapsam: 'kendi hesabı',
    onkosul: 'Yeni parola kısa', veriHali: 'çelişen',
    eylem: 'Parolayı değiştirmeyi dener',
    beklenenSonuc: 'Reddedilir; alt sınır söylenir',
    beklenenEkran: 'Boş alan sessizdir, kusur cümlesi üretmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'OTR-HSP-002', alan: 'Oturum', rota: '/ayarlar', eksen: 'yetki',
    amac: 'Başka cihazlardaki oturumlarımı kapatmak',
    rol: 'kayıtlı kullanıcı', kapsam: 'kendi hesabı',
    onkosul: 'Birden çok oturum açık', veriHali: 'normal',
    eylem: 'Tüm oturumları kapatır',
    beklenenSonuc: 'Yalnız KENDİ oturumları kapanır',
    beklenenEkran: 'Kaç oturumun kapandığı söylenir',
    beklenenIz: 'Oturum · guncelleme', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'YTK-ATM-001', alan: 'Yetkiler', rota: '/yetkiler', eksen: 'yetki',
    amac: 'Aynı yetkinin iki kez yazılmaması',
    rol: 'kurum yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Aynı atama zaten var', veriHali: 'yinelenen',
    eylem: 'Aynı atamayı tekrar yapar',
    beklenenSonuc: 'İkinci satır AÇILMAZ',
    beklenenEkran: 'Farklı seviye de ikinci satır açmaz — aynı erişimin değişimidir',
    beklenenIz: 'Yetki · guncelleme', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'KIM-HSP-001', alan: 'Kimlik', rota: '/kimlik', eksen: 'yetki',
    amac: 'Bir sistem hesabını kayda geçirmek',
    rol: 'BT yöneticisi', kapsam: 'tek tesis',
    onkosul: 'Hesap başka tesiste açılmak isteniyor', veriHali: 'normal',
    eylem: 'Hesap açmayı dener',
    beklenenSonuc: 'Reddedilir; tesissiz hesap kapsamsız yetki ister',
    beklenenEkran: 'Ayrıcalık ÜÇ DURUMLUDUR — null "yok" değildir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'SCOPE'],
  },
  {
    id: 'KIM-ERS-001', alan: 'Kimlik', rota: '/kimlik', eksen: 'veri',
    amac: 'Riskli erişimleri görmek',
    rol: 'güvenlik uzmanı', kapsam: 'kendi tesisi',
    onkosul: 'Bazı alanlar ölçülmemiş', veriHali: 'bilinmiyor',
    eylem: 'Erişim değerlendirmesine bakar',
    beklenenSonuc: 'null ile false KARIŞTIRILMAZ — biri ihlal, öteki boşluk',
    beklenenEkran: 'Kritik olmamak "kritikliği düşük" demek değildir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'Görev',
    katmanlar: ['ENGINE', 'DOMAIN'],
  },
  {
    id: 'TED-OTR-001', alan: 'Tedarikçi', rota: '/tedarikciler',
    eksen: 'entegrasyon',
    amac: 'Tedarikçi uzaktan bağlantılarını görmek',
    rol: 'güvenlik uzmanı', kapsam: 'kendi tesisi',
    onkosul: 'Hiç kayıt yok', veriHali: 'yok',
    eylem: 'Tedarikçi oturumlarına bakar',
    beklenenSonuc: 'Durum "kaynak bağlı değil" — "oturum yok" DEĞİL',
    beklenenEkran: 'Uyumsuz ile bilinmeyen ayrı sayılır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'INTEGRATION'],
  },
  {
    id: 'OPR-DEG-001', alan: 'Operasyon', rota: '/operasyon', eksen: 'akis',
    amac: 'Bir değişikliği kayda geçirmek',
    rol: 'operasyon sorumlusu', kapsam: 'tek tesis',
    onkosul: 'Değişiklik başka tesise ait', veriHali: 'normal',
    eylem: 'Değişiklik kaydetmeyi dener',
    beklenenSonuc: 'Reddedilir',
    beklenenEkran: 'Kaydın GERÇEK tesisi güncellemede de bağlayıcıdır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'SCOPE'],
  },
  {
    id: 'OPR-DEG-002', alan: 'Operasyon', rota: '/operasyon', eksen: 'veri',
    amac: 'OT değişikliğinin ek kapılardan geçmesi',
    rol: 'operasyon sorumlusu', kapsam: 'kendi tesisi',
    onkosul: 'Değişiklik BT tarafında', veriHali: 'normal',
    eylem: 'Kapı sayacına bakar',
    beklenenSonuc: 'BT değişikliğinin kapısı YOKTUR — "0/5" uydurulmaz',
    beklenenEkran: 'OT değişikliği beş kapı taşır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'TES-PRF-001', alan: 'Portföy', rota: '/tesisler/[id]', eksen: 'veri',
    amac: 'Tesis profilini doldurmak',
    rol: 'tesis sorumlusu', kapsam: 'kendi tesisi',
    onkosul: 'Bazı alanlar boş bırakıldı', veriHali: 'kısmi',
    eylem: 'Profili kaydeder',
    beklenenSonuc: 'Boş metin NULL olur — "" ile "bilinmiyor" ayrıdır',
    beklenenEkran: 'Üç durumlu alanlarda false ile null ayrı saklanır',
    beklenenIz: 'Profil · guncelleme', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'TES-PRF-002', alan: 'Portföy', rota: '/tesisler/[id]', eksen: 'akis',
    amac: 'Motorun insanın kararını ezmemesi',
    rol: 'tesis sorumlusu', kapsam: 'kendi tesisi',
    onkosul: 'İnsan kararı gerekçesiyle yazılmış', veriHali: 'çelişen',
    eylem: 'Uygulanabilirlik motoru yeniden koşar',
    beklenenSonuc: 'İnsanın kararı KORUNUR',
    beklenenEkran: 'Elle değiştirildi işareti görünür',
    beklenenIz: 'Karar satırı', beklenenBildirim: 'yok',
    katmanlar: ['ENGINE', 'SERVER'],
  },
  {
    id: 'TES-PRF-003', alan: 'Portföy', rota: '/tesisler/[id]', eksen: 'veri',
    amac: 'Profilsiz tesisin uyum hesabını bozmaması',
    rol: 'uyum uzmanı', kapsam: 'kurum geneli',
    onkosul: 'Yeni tesis açıldı, profili yok', veriHali: 'yok',
    eylem: 'Uygulanabilirlik motoru koşar',
    beklenenSonuc: 'Karar VERİLMEZ ve veri kalitesi bulgusu açılır',
    beklenenEkran: 'Profil gelince kapsam kendiliğinden hesaplanır',
    beklenenIz: 'Bulgu', beklenenBildirim: 'Veri kalitesi bulgusu',
    katmanlar: ['ENGINE', 'DOMAIN'],
  },
  {
    id: 'TES-PRF-004', alan: 'Portföy', rota: '/tesisler/[id]', eksen: 'veri',
    amac: 'Şemanın seçenek listesi dışındaki öznitelik değerinin sessizce girmemesi',
    rol: 'tesis sorumlusu', kapsam: 'kendi tesisi',
    onkosul: 'Sektör paketi `kritiklikSinifi` için dört seçenek beyan etmiş; olay etki '
      + 'motoru bu değeri rolüyle okur',
    veriHali: 'aykiri',
    eylem: 'Profil formu listede olmayan bir değer ya da beyan edilmemiş bir anahtar gönderir',
    beklenenSonuc: 'Kayıt reddedilir; hata seçenekleri adıyla sayar; beyansız anahtar için '
      + 'satır açılmaz',
    beklenenEkran: 'Form hata satırı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'TES-PRF-005', alan: 'Portföy', rota: '/tesisler/[id]', eksen: 'arayuz',
    amac: 'Profil bloğunun sektör paketinin özniteliklerini adını bilmeden çizmesi',
    rol: 'uyum uzmanı', kapsam: 'kendi tesisi',
    onkosul: 'Paket şeması tip (mantık · metin · tarih · sayı), seçenek, grup ve birim '
      + 'beyan eder; su paketi profil özniteliği beyan etmez',
    veriHali: 'normal',
    eylem: 'Tesis 360 profil bloğu açılır ve düzenlenir',
    beklenenSonuc: 'Enerjide çekirdek 12 + paket 8 alan, suda yalnız çekirdek 12; aynı kod, '
      + 'aynı sözleşme (boş alan "tanımsız", üç durum, boş giden null)',
    beklenenEkran: 'Gruplar: çekirdek + paket grupları; çekirdekle aynı adlı grup birleşir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'DOMAIN'],
  },
  {
    id: 'TES-PRF-006', alan: 'Portföy', rota: '/tesisler/[id]', eksen: 'veri',
    amac: 'Paketin rol beyan etmeyen özniteliklerinin veri yolunda düşmemesi',
    rol: 'uyum uzmanı', kapsam: 'kendi tesisi',
    onkosul: 'Şemada rolü boş (lisans, kabul, şebeke) ve rolü dolu (kapasite, kritiklik) '
      + 'satırlar bir arada; kapasite rolü kimlik kartında çizilir, profilde değil',
    veriHali: 'aykiri',
    eylem: 'Tesis 360 sunucu verisi paketin şemasını okur',
    beklenenSonuc: 'Kapasite dışı HER şema satırı alan olur — rolü NULL olanlar dahil; '
      + 'SQL üç değerli mantığı (`NOT rol = x` NULL\'ı düşürür) satır eksiltmez; '
      + 'yalnız kapasite beyan eden paket boş profil verir',
    beklenenEkran: 'Enerjide "N/20 alan tanımsız", suda "N/12"',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'INTEGRATION'],
  },
  {
    id: 'KNM-KRD-001', alan: 'Harita', rota: '/tesisler/[id]', eksen: 'veri',
    amac: 'Tesisin konumunu düzeltmek',
    rol: 'tesis sorumlusu', kapsam: 'kendi tesisi',
    onkosul: 'Yalnız enlem girildi', veriHali: 'kısmi',
    eylem: 'Koordinatı kaydetmeyi dener',
    beklenenSonuc: 'YARIM koordinat reddedilir',
    beklenenEkran: 'Silme meşrudur; iki alan birlikte boşaltılabilir',
    beklenenIz: 'Tesis · guncelleme', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'SAG-KOK-001', alan: 'Sağlık', rota: '/saglik', eksen: 'veri',
    amac: 'Bir kaydın nereden geldiğini bilmek',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Kaydın köken satırı yok', veriHali: 'bilinmiyor',
    eylem: 'Köken bölümüne bakar',
    beklenenSonuc: 'Kayıt MANUEL sayılır; "otomatik" kovasına GİRMEZ',
    beklenenEkran: 'null "ölçülmedi" yazar, 0 "%0" yazar — ikisi ayrı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'SAG-KOK-002', alan: 'Sağlık', rota: '/saglik', eksen: 'yetki',
    amac: 'Köken doğrulamasının kapsamla sınırlı kalması',
    rol: 'BT yöneticisi', kapsam: 'tek tesis',
    onkosul: 'Parti içinde kapsam dışı bir kayıt var', veriHali: 'kısmi',
    eylem: 'Toplu doğrulama yapar',
    beklenenSonuc: 'Kapsam dışı TEK kayıt bütün partiyi durdurur',
    beklenenEkran: 'Yarım onay bırakılmaz',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'SCOPE'],
  },
  {
    id: 'SAG-SRT-001', alan: 'Sağlık', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Bir adaptörün sözleşmeye uyduğunu görmek',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Adaptör bağlı değil', veriHali: 'yok',
    eylem: 'Sertifikasyon raporuna bakar',
    beklenenSonuc: 'Bağlantı isteyen kontroller "uygulanamaz"dır, "kaldı" DEĞİL',
    beklenenEkran: 'Eksik sır bir kusur değil, kurulum adımıdır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['INTEGRATION'],
  },
  {
    id: 'SAG-YAP-001', alan: 'Sağlık', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Bir bağlantıyı yapılandırmak',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Sır referansı biçimi bozuk', veriHali: 'çelişen',
    eylem: 'Yapılandırmayı kaydetmeyi dener',
    beklenenSonuc: 'Reddedilir; sır DEĞERİ hiç istenmez',
    beklenenEkran: 'Form kayıtlı referansı geri doldurmaz',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'INTEGRATION'],
  },
  {
    id: 'SAG-ESL-001', alan: 'Sağlık', rota: '/esleme', eksen: 'veri',
    amac: 'Gelen alanın güvenini bilmek',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Hiçbir güven kuralı tanımlı değil', veriHali: 'bilinmiyor',
    eylem: 'Önizleme çalıştırır',
    beklenenSonuc: 'Güven ÖLÇÜLMEDİ (null) — sıfır DEĞİL',
    beklenenEkran: 'Varsayılan bir ÖLÇÜM DEĞİLDİR',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'INTEGRATION'],
  },
  {
    id: 'SAG-ADV-001', alan: 'Sağlık', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Zafiyet duyurularını almak',
    rol: 'güvenlik uzmanı', kapsam: 'kurum geneli',
    onkosul: 'Gelen belge bozuk', veriHali: 'çelişen',
    eylem: 'Duyuru belgesini yükler',
    beklenenSonuc: 'İstisna FIRLATILMAZ; reddedilen olarak gerekçesiyle döner',
    beklenenEkran: 'Boş dizi bir hata değildir',
    beklenenIz: 'Reddedilen kayıt', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'INTEGRATION'],
  },
  {
    id: 'YON-MOT-001', alan: 'Yönetim konsolu', rota: '/saglik', eksen: 'yetki',
    amac: 'Motorları elle çalıştırmak',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Kullanıcının yönetim yazma yetkisi yok', veriHali: 'normal',
    eylem: 'Motorları çalıştırmayı dener',
    beklenenSonuc: 'Tek motora bile DOKUNULMAZ',
    beklenenEkran: 'Düğme kapalı',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'YON-MOT-002', alan: 'Yönetim konsolu', rota: '—', eksen: 'akis',
    amac: 'Motor zincirinin gereksiz koşmaması',
    rol: 'sistem (zamanlayıcı)', kapsam: 'kurum geneli',
    onkosul: 'Yalnız kanıt değişmiş', veriHali: 'kısmi',
    eylem: 'Zincir koşar',
    beklenenSonuc: 'İlgisiz motor KOŞMAZ; bir motor patlarsa zincir devam eder',
    beklenenEkran: 'Sonuç neyin atlandığını bildirir',
    beklenenIz: 'Koşu kaydı', beklenenBildirim: 'yok',
    katmanlar: ['ENGINE'],
  },
  {
    id: 'YON-KLT-001', alan: 'Yönetim konsolu', rota: '—', eksen: 'akis',
    amac: 'Aynı işin iki kez koşmaması',
    rol: 'sistem (zamanlayıcı)', kapsam: 'kurum geneli',
    onkosul: 'İki istek aynı anda geliyor', veriHali: 'yinelenen',
    eylem: 'Kilit alınmaya çalışılır',
    beklenenSonuc: 'Yalnız BİRİ kazanır; kirası dolmuş kilit devralınır',
    beklenenEkran: 'Kimin tuttuğu söylenir',
    beklenenIz: 'Kilit kaydı', beklenenBildirim: 'yok',
    katmanlar: ['CONCURRENCY', 'ENGINE'],
  },
  {
    id: 'YON-OTO-001', alan: 'Yönetim konsolu', rota: '—', eksen: 'akis',
    amac: 'Otomasyonun insan kararı yerine geçmemesi',
    rol: 'güvenlik denetçisi', kapsam: 'kurum geneli',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Otomasyon sınırları ölçülür',
    beklenenSonuc: 'Her yasak için bir ÖLÇÜ vardır — yorumda kalan kural yok',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['ENGINE', 'DOMAIN'],
  },
  {
    id: 'SIS-KPS-001', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Ekranın açtığı yazma yüzeyinin sunucuyla aynı cevabı vermesi',
    rol: 'geliştirici / denetçi', kapsam: 'kurum geneli',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Ekran kapısı ile sunucu kapısı karşılaştırılır',
    beklenenSonuc: 'İki kapı AYNI yanıtı verir',
    beklenenEkran: 'Ekran sunucudan dar da geniş de değildir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['RBAC', 'SCOPE'],
  },
  {
    id: 'SIS-KPS-002', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'İki aşamalı kapının doğru kullanılması',
    rol: 'geliştirici / denetçi', kapsam: 'kurum geneli',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Kapsam sonrası bildiren her eylem taranır',
    beklenenSonuc: 'Ön kapı TEK BAŞINA yetki VERMEZ; ikinci aşama zorunludur',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['RBAC', 'SCOPE'],
  },
  {
    id: 'SIS-GVN-001', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Kapsam dışı verinin hiçbir yoldan sızmaması',
    rol: 'güvenlik denetçisi', kapsam: 'tek tesis',
    onkosul: 'Kapsam dışı kayıt veritabanında GERÇEKTEN var',
    veriHali: 'normal',
    eylem: 'Liste, filtre ve yazma yolları denenir',
    beklenenSonuc: 'Hiçbiri kaydı döndürmez, ima etmez ya da yazdırmaz',
    beklenenEkran: 'Açıkça istenen kapsam dışı sorgu 403 döner',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['API', 'SCOPE', 'RBAC'],
  },
  {
    id: 'SIS-SIR-001', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Sır değerinin veritabanına ve ekrana hiç girmemesi',
    rol: 'güvenlik denetçisi', kapsam: 'kurum geneli',
    onkosul: 'Sır referansı tanımlı', veriHali: 'normal',
    eylem: 'Sır katmanı çözümlenir',
    beklenenSonuc: 'Yalnız referans saklanır; tanınmayan sağlayıcı denetimden GEÇMEZ',
    beklenenEkran: 'Bağlı olup olmadığı ayrıca bildirilir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'INTEGRATION'],
  },
  {
    id: 'SIS-ALT-001', alan: 'Sistem', rota: '/saglik', eksen: 'entegrasyon',
    amac: 'Üretime hazır olup olmadığımızı görmek',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Zorunlu bir kontrol ölçülemedi', veriHali: 'bilinmiyor',
    eylem: 'Hazırlık özetine bakar',
    beklenenSonuc: 'HAZIR cümlesi KURULMAZ',
    beklenenEkran: 'Ölçülemeyen zorunlu kontrol ayrı sayılır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'INTEGRATION'],
  },
];

/* ── Üçüncü dalga: motor kütüğü ve veri kalitesi ────────────────────── */

export const PLATFORM_SENARYOLARI_3: Senaryo[] = [
  {
    id: 'YON-MOT-003', alan: 'Yönetim konsolu', rota: '/saglik', eksen: 'veri',
    amac: 'Kütükteki her motorun gerçekten çalıştırılabilir olması',
    rol: 'geliştirici / denetçi', kapsam: 'kurum geneli',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Motor kütüğü ile çalıştırma yolu karşılaştırılır',
    beklenenSonuc: 'Kütükteki her motor koşturulabilir; ölü kayıt yoktur',
    beklenenEkran: 'Motor adı kütükte tekrar etmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['ENGINE', 'DOMAIN'],
  },
  {
    id: 'YON-MOT-004', alan: 'Yönetim konsolu', rota: '—', eksen: 'akis',
    amac: 'Motorun insan onayı olmadan iş açmaması',
    rol: 'sistem (motor)', kapsam: 'kurum geneli',
    onkosul: 'Uyumsuz ve kritik bir madde var', veriHali: 'normal',
    eylem: 'Boşluk–aksiyon motoru koşar',
    beklenenSonuc: 'Proje ADAYI üretir; insan onayı olmadan projeye DÖNMEZ',
    beklenenEkran: 'Aday listesi ayrı durur',
    beklenenIz: 'Aday kaydı', beklenenBildirim: 'Görev',
    katmanlar: ['ENGINE', 'WORKFLOW'],
  },
  {
    id: 'SAG-VKL-001', alan: 'Sağlık', rota: '/saglik', eksen: 'veri',
    amac: 'Aktarılan verinin kendi kalitesinin denetlenmesi',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Entegrasyon tabloları boş', veriHali: 'yok',
    eylem: 'Veri kalitesi motoru koşar',
    beklenenSonuc: 'Aktarım kuralları YANLIŞ POZİTİF üretmez',
    beklenenEkran: 'Sessizlik de bir sözleşmedir ve ölçülür',
    beklenenIz: 'Koşu kaydı', beklenenBildirim: 'yok',
    katmanlar: ['ENGINE'],
  },
  {
    id: 'SAG-VKL-002', alan: 'Sağlık', rota: '/saglik', eksen: 'veri',
    amac: 'Ağda görülen sahipsiz cihazın bulguya dönmesi',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Eşleşen varlığın sahibi yok', veriHali: 'kısmi',
    eylem: 'Veri kalitesi motoru koşar',
    beklenenSonuc: 'Bulgu VARLIK başına açılır, gözlem başına DEĞİL',
    beklenenEkran: 'Aynı cihaz için beş bulgu üretilmez',
    beklenenIz: 'Bulgu', beklenenBildirim: 'Veri kalitesi bulgusu',
    katmanlar: ['ENGINE', 'DOMAIN'],
  },
  {
    id: 'SIS-KPS-003', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Kapsam kapısının hiçbir eylemde atlanmaması',
    rol: 'geliştirici / denetçi', kapsam: 'kurum geneli',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Bütün sunucu eylemleri taranır',
    beklenenSonuc: 'Kapsam sonrası bildiren her eylem ikinci aşamayı GERÇEKTEN çağırır',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['RBAC', 'SCOPE'],
  },
];

/* ── Dördüncü dalga: görsel kapı ve kalan aykırı hâller ─────────────── */

export const PLATFORM_SENARYOLARI_4: Senaryo[] = [
  {
    id: 'SIS-GOC-001', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Sürüm yükseltmesinin veri kaybettirmemesi',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Yeni bir göç uygulanacak', veriHali: 'normal',
    eylem: 'Göçler uygulanır ve şema doğrulanır',
    beklenenSonuc: 'Tablo ve tetikleyici sayısı korunur; yabancı anahtar temizdir',
    beklenenEkran: '—',
    beklenenIz: 'Göç kaydı', beklenenBildirim: 'yok',
    katmanlar: ['MIGRATION'],
  },
  {
    id: 'SIS-GOC-002', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Denetim izinin sonradan değiştirilememesi',
    rol: 'güvenlik denetçisi', kapsam: 'kurum geneli',
    onkosul: 'Kanıt sürüm geçmişi yazılmış', veriHali: 'normal',
    eylem: 'Geçmişi değiştirmeyi ya da silmeyi dener',
    beklenenSonuc: 'Veritabanı tetikleyicisi REDDEDER',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['MIGRATION', 'SERVER'],
  },
  {
    id: 'SIS-GRS-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Ekranların görsel dilinin sürüklenmemesi',
    rol: 'tasarım denetçisi', kapsam: 'kurum geneli',
    onkosul: '—', veriHali: 'normal',
    eylem: 'Tasarım kapısı koşturulur',
    beklenenSonuc: 'Kontrast, font ve eski tasarım izi kusuru SIFIRDIR',
    beklenenEkran: 'Tek palet; açık temaya geçiş yok',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['VISUAL'],
  },
  {
    id: 'SIS-GRS-002', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Uzun Türkçe metnin yerleşimi bozmaması',
    rol: 'son kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Kayıt adları uzun', veriHali: 'yüksek',
    eylem: 'Dar bantta ekranları gezer',
    beklenenSonuc: 'Kırpılan kritik bilgi ve yatay taşma SIFIRDIR',
    beklenenEkran: 'Geniş içerik kendi kabında kayar',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['VISUAL', 'RESPONSIVE'],
  },
  /* ── P6 · Kimlik ve SSO ─────────────────────────────────────────── */
  {
    id: 'SIS-KML-001', alan: 'Sistem', rota: '/ayarlar/kimlik', eksen: 'yetki',
    amac: 'Kurum kimlik sağlayıcısını, sırrını üründe SAKLAMADAN tanımlamak',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Kurulumda kimlik sağlayıcı yok', veriHali: 'yok',
    eylem: 'OIDC sağlayıcısı tanımlanır (`kimlikSaglayici.kimlikSaglayiciKaydet`)',
    beklenenSonuc: 'İstemci sırrının DEĞERİ kabul EDİLMEZ; yalnız `sirReferansi`'
      + ' (env: · dosya: · vault:) alınır. Biçimi bozuk ya da sağlayıcısı'
      + ' tanınmayan referans reddedilir. Kayıt `bagli=false` ve `aktif=false`'
      + ' doğar — bağlamak ayrı bir insan kararıdır',
    beklenenEkran: 'Sır alanı MASKELİ adres gösterir, değeri değil',
    beklenenIz: 'KimlikSaglayici · olusturma (gerekçede maskeli referans)',
    beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC', 'UI'],
  },
  {
    id: 'SIS-KML-002', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Sahte ya da başkasına ait bir kimlik jetonunun kabul edilmemesi',
    rol: 'son kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Bağlı bir OIDC sağlayıcısı var', veriHali: 'normal',
    eylem: 'Kimlik jetonu doğrulanır (`oidc.kimlikJetonuDogrula`)',
    beklenenSonuc: 'İmza, `iss`, `aud`, `nonce`, `exp` ve `sub` AYRI AYRI'
      + ' doğrulanır; biri eksikse jeton REDDEDİLİR. `alg: none` ve HMAC'
      + ' algoritmaları kabul edilmez. İmza geçmeden HİÇBİR iddia okunmaz',
    beklenenEkran: 'Giriş ekranında tek ret cümlesi; sebep denetim izinde',
    beklenenIz: 'KimlikGirisi · red (sebep adıyla)',
    beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'SIS-KML-003', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'IdP\'de var olan ama üründe TANINMAYAN kimliğin hesap açtırmaması',
    rol: 'son kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Sağlayıcıda `jitAcik` KAPALI (varsayılan)', veriHali: 'yok',
    eylem: 'Geçerli ama tanınmayan bir `sub` ile giriş denenir',
    beklenenSonuc: 'Giriş REDDEDİLİR ve KULLANICI AÇILMAZ. Bir uyum ürününde'
      + ' kimin hesabı olduğu bir yönetim kararıdır; otomatik açılan hesap'
      + ' denetim izinde sahipsiz bir aktör bırakır. JIT açıkken bile açılan'
      + ' hesap YETKİSİZ doğar',
    beklenenEkran: 'Ne yapılacağını söyleyen ret cümlesi',
    beklenenIz: 'KimlikGirisi · red (`sub` ÖZETİYLE — ham `sub` yazılmaz)',
    beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'SIS-KML-004', alan: 'Sistem', rota: '/ayarlar', eksen: 'akis',
    amac: 'İkinci faktörü kurmak ve kaybedilen telefonda kilitlenmemek',
    rol: 'son kullanıcı', kapsam: 'kendi hesabı',
    onkosul: 'MFA anahtar referansı kurulumda tanımlı', veriHali: 'yok',
    eylem: 'TOTP kaydı açılır, ilk kod doğrulanır (`mfa.mfaKur` · `mfaDogrula`)',
    beklenenSonuc: 'Sır ürünün veritabanında AÇIK durmaz: AES-256-GCM zarfıyla'
      + ' durur ve ŞİFRELEME ANAHTARI veritabanında YOKTUR. Kayıt insan ilk'
      + ' kodu doğrulayana kadar KURULU sayılmaz. Kurtarma kodları bir kez'
      + ' gösterilir, ÖZETLERİ saklanır ve her biri BİR KEZ kullanılır.'
      + ' Aynı TOTP kodu ikinci kez KABUL EDİLMEZ',
    beklenenEkran: 'Anahtar referansı yoksa "bağlı değil" der, sessizce düşmez',
    beklenenIz: 'MfaKaydi · olusturma · dogrulama (sır DEĞERİ ize girmez)',
    beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN', 'UI'],
  },
  {
    id: 'SIS-DEM-001', alan: 'Sistem', rota: '/yardim', eksen: 'yetki',
    amac: 'Demo kurulumunda hiçbir yazma eyleminin geçmemesini güvence altına almak',
    rol: 'demo izleyicisi', kapsam: 'kurum geneli',
    onkosul: 'Kurulum DEMO modunda (`NEXT_PUBLIC_DEMO=1`) ve oturum TAM YETKİLİ',
    veriHali: 'dolu',
    eylem: 'Gerçek bir sunucu eylemi (risk kaydet) çağrılır',
    beklenenSonuc: 'Eylem REDDEDİLİR ve veritabanına HİÇBİR SATIR yazılmaz. Okuma aynı'
      + ' oturumda AÇIK kalır — kapı yazmayı kapatır, ekranı değil. Onay gibi'
      + ' DEĞİŞTİREN işlemler de kapalıdır: kapı `islem !== okuma` diye sorar.'
      + ' Yetki taklidi TAM YETKİLİDİR: aksi hâlde ölçüm yetkisizliği ölçerdi',
    beklenenEkran: '/yardim ekranı bu politikayı yazar; ölçüm yazının karşılığını sürer',
    beklenenIz: 'yazma yok — eylem hiç yürümedi', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'SIS-KML-005', alan: 'Sistem', rota: '/ayarlar/kimlik', eksen: 'yetki',
    amac: 'Kiracının oturum politikasını sıkılaştırabilmesi',
    rol: 'yönetici', kapsam: 'kurum geneli',
    onkosul: 'Politika kaydı yok (varsayılan geçerli)', veriHali: 'yok',
    eylem: 'Mutlak/atıl süre ve "MFA zorunlu" ayarlanır',
    beklenenSonuc: 'Kayıt yoksa 12 saat mutlak · 2 saat atıl VARSAYILANI'
      + ' uygulanır. Atıl süre mutlaktan büyük olamaz; tavan ve tabanlar'
      + ' gerekçelidir. "MFA zorunlu" açıkken TOTP\'si olmayan YEREL hesap'
      + ' giriş YAPAMAZ — kurum hesabında ikinci faktör IdP\'nin işidir',
    beklenenEkran: 'Varsayılan olduğu AÇIKÇA yazılır; boş alan sıfır sayılmaz',
    beklenenIz: 'OturumPolitikasi · guncelleme',
    beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC', 'DOMAIN'],
  },
  {
    id: 'SIS-KML-006', alan: 'Sistem', rota: '/giris', eksen: 'arayuz',
    amac: 'Bağlı olmayan bir sağlayıcının giriş ekranında GÖRÜNMEMESİ',
    rol: 'son kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Sağlayıcı tanımlı ama `bagli=false`', veriHali: 'kısmi',
    eylem: 'Giriş ekranı açılır',
    beklenenSonuc: '"Kurum hesabıyla gir" düğmesi YALNIZ bağlı VE aktif'
      + ' sağlayıcı varsa çizilir. Bağlanmamış sağlayıcı sessizce düşmez;'
      + ' yönetim ekranında "bağlı değil" der ve eksiği ADIYLA söyler',
    beklenenEkran: 'Olmayan bir yol düğme olarak gösterilmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'UI'],
  },

  {
    id: 'BLD-KTU-003', alan: 'Bildirim', rota: '/bildirimler', eksen: 'veri',
    amac: 'Okunmamış bildirimi olmayan kullanıcının rozet görmemesi',
    rol: 'herhangi bir kullanıcı', kapsam: 'kendi kutusu',
    onkosul: 'Hiç okunmamış bildirim yok', veriHali: 'yok',
    eylem: 'Kabuktaki sayaca bakar',
    beklenenSonuc: '"En eski okunmamış" SIFIR GÜN değil, ölçülmedi (null)',
    beklenenEkran: 'Sıfırda rozet ÇİZİLMEZ',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'RAP-URT-003', alan: 'Rapor', rota: '/raporlar', eksen: 'veri',
    amac: 'Yarısı ölçülmemiş bir hücreye güvenmemek',
    rol: 'uyum yöneticisi', kapsam: 'kendi tesisi',
    onkosul: 'Hücrenin yarısından çoğu değerlendirilmemiş',
    veriHali: 'bilinmiyor',
    eylem: 'Rapor matrisine bakar',
    beklenenSonuc: 'Yüzde artık hücreyi TEMSİL ETMEZ ve hücre bilinmeyen işareti alır',
    beklenenEkran: 'Bilinmeyen oranı ayrıca yazılır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'ESL-PRF-003', alan: 'Eşleme', rota: '/esleme', eksen: 'veri',
    amac: 'Kaynağın göndermediği alanın sıfır sanılmaması',
    rol: 'platform yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Alan kaynaktan hiç gelmiyor', veriHali: 'bilinmiyor',
    eylem: 'Eşlemeyi önizler',
    beklenenSonuc: 'Gelmeyen alan SIFIR değil BİLİNMEYENdir',
    beklenenEkran: 'Varsayılan bir ÖLÇÜM DEĞİLDİR',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'INTEGRATION'],
  },
  {
    id: 'YRD-SOR-002', alan: 'Yardım', rota: '/yardim', eksen: 'arayuz',
    amac: 'Kısayol katmanının yazı yazarken açılmaması',
    rol: 'herhangi bir kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Kullanıcı bir metin alanında yazıyor', veriHali: 'kısmi',
    eylem: 'Soru işaretine basar',
    beklenenSonuc: 'Katman AÇILMAZ — yazılan metin bölünmez',
    beklenenEkran: 'Yazı almayan öğelerde tetiklenir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'OPR-DEG-003', alan: 'Operasyon', rota: '/operasyon', eksen: 'akis',
    amac: 'Geri almanın bir aşama sanılmaması',
    rol: 'operasyon sorumlusu', kapsam: 'kendi tesisi',
    onkosul: 'Değişiklik geri alındı', veriHali: 'kısmi',
    eylem: 'Aşama şeridine bakar',
    beklenenSonuc: 'Geri alma döngünün ADIMI DEĞİLDİR — indeksi yoktur',
    beklenenEkran: 'Kapanış hem doğrulanmayı hem geri alınmayı kapsar',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
];

/* ── Beşinci dalga: yetki kapısının kendisi ──────────────────────────
   Bu dört senaryo bir SABOTAJ koşusunun bulduğu boşluktan doğdu: ilk
   kapının izin kontrolü silindiğinde test paketi kırılmıyordu, çünkü
   ölçüm hep ikinci aşamadan geçiyordu. Kapı artık kendi başına ölçülür. */

export const PLATFORM_SENARYOLARI_5: Senaryo[] = [
  {
    id: 'SIS-KPS-004', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Oturumsuz bir çağrının hiçbir şey yapamaması',
    rol: 'kimliksiz ziyaretçi', kapsam: 'yok',
    onkosul: 'Oturum yok', veriHali: 'yok',
    eylem: 'Bir sunucu eylemini doğrudan çağırır',
    beklenenSonuc: 'Kapı "oturum gerekli" diye reddeder',
    beklenenEkran: '—',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'SIS-KPS-005', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Okuma yetkisinin yazmaya yetmemesi',
    rol: 'salt okuyucu', kapsam: 'kurum geneli',
    onkosul: 'Rolün modülde yazma izni yok', veriHali: 'normal',
    eylem: 'Bir yazma eylemi çağırır',
    beklenenSonuc: 'İlk kapı TEK BAŞINA reddeder — ikinci aşamaya kalmaz',
    beklenenEkran: 'Yazma yüzeyi hiç açılmaz',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'SIS-KPS-006', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Bir modüldeki yetkinin başka modülü açmaması',
    rol: 'uyum uzmanı', kapsam: 'kurum geneli',
    onkosul: 'Yetki yalnız uyum modülüne verilmiş', veriHali: 'normal',
    eylem: 'Envanter modülünde yazma dener',
    beklenenSonuc: 'Reddedilir',
    beklenenEkran: 'Modül kısıtı diğer modülleri kapatır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'RBAC'],
  },
  {
    id: 'SIS-KPS-007', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'İkinci aşamanın kendi mesajını vermesi',
    rol: 'BT yöneticisi', kapsam: 'tek tesis',
    onkosul: 'Kaydın tesisi kullanıcının kapsamı dışında',
    veriHali: 'normal',
    eylem: 'Kayıt okunduktan sonra kapsam kapısı sorulur',
    beklenenSonuc: 'Eyleme özel mesajla reddedilir',
    beklenenEkran: 'Kullanıcı neyin eksik olduğunu okur',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'SCOPE'],
  },
];

/* ── Kabuk gezinmesi (SIS-KBK) ─────────────────────────────────────────
   Kabuk her ekranda çizilir; kabuktaki bir kırpma tek ekranın değil,
   ÜRÜNÜN kusurudur. Bu grup UX denetiminde ölçülen bir P0'dan doğdu:
   ikincil sıra 1440px'te üç ekranı ekran dışında bırakıyor, gizli
   kaydırma çubuğu yüzünden de hiçbir ipucu vermiyordu. */

export const PLATFORM_SENARYOLARI_6: Senaryo[] = [
  {
    id: 'SIS-KBK-010', alan: 'Sistem', rota: '/uyum', eksen: 'arayuz',
    amac: 'Alanın bütün ekranlarına ulaşabilmek',
    rol: 'uyum uzmanı', kapsam: 'kurum geneli',
    onkosul: 'Uyum alanı açık', veriHali: 'normal',
    eylem: 'İkincil gezinme sırasına bakar',
    beklenenSonuc: 'Sıra sarar; 16 bağın hepsi görünür',
    beklenenEkran: 'İkinci satır çizilir, hiçbir bağ ekran dışında kalmaz',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'RESPONSIVE'],
  },
  {
    id: 'SIS-KBK-011', alan: 'Sistem', rota: '/uyum', eksen: 'arayuz',
    amac: 'Gizli kaydırmanın geri gelmemesi',
    rol: 'uyum uzmanı', kapsam: 'kurum geneli',
    onkosul: 'Geniş ekran', veriHali: 'normal',
    eylem: 'Sıranın taşma davranışı okunur',
    beklenenSonuc: 'Kaydırma çubuğu gizlenerek taşma saklanmaz',
    beklenenEkran: 'Kayan ama ipucu vermeyen sıra YOK',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-KBK-012', alan: 'Sistem', rota: '/uyum', eksen: 'arayuz',
    amac: 'Sarınca ikinci satırın kırpılmaması',
    rol: 'uyum uzmanı', kapsam: 'kurum geneli',
    onkosul: 'Sıra iki satıra sarmış', veriHali: 'normal',
    eylem: 'Sıranın yüksekliği okunur',
    beklenenSonuc: 'Yükseklik içerikle büyür (sabit değil)',
    beklenenEkran: 'İkinci satır tam görünür',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'RESPONSIVE'],
  },
  {
    id: 'SIS-KBK-013', alan: 'Sistem', rota: '/uyum', eksen: 'arayuz',
    amac: 'Dokunmatik bantta kaydırmanın korunması',
    rol: 'saha kullanıcısı', kapsam: 'tek tesis',
    onkosul: 'Ekran eni 375px', veriHali: 'normal',
    eylem: 'Sırayı parmakla yana kaydırır',
    beklenenSonuc: 'Sıra yatay kayar — dar bantta sarma çözüm değildir',
    beklenenEkran: 'Bağlar kırpılmadan kaydırılabilir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'RESPONSIVE'],
  },
  {
    id: 'SIS-KBK-014', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'İkincil sıranın masaüstünde tek satırda kalması — sarma artık '
      + 'bir zorunluluk değil, kiracı sözlüğünden gelen bilinmeyen terime '
      + 'karşı korumadır (Uyum sırası odak turunda on dokuz bağdan üçe indi)',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Pencere 1280px', veriHali: 'normal',
    eylem: 'Her alanın bağlarının toplam eni hesaplanır',
    beklenenSonuc: 'Hiçbir sıra pencereyi aşmaz; sarma masaüstünde tetiklenmez',
    beklenenEkran: 'Her alan tek satırda',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'RESPONSIVE'],
  },
  {
    id: 'SIS-KBK-015', alan: 'Sistem', rota: '/uyum', eksen: 'arayuz',
    amac: 'Kabuğun yükseklik bütçesinin korunması',
    rol: 'uyum uzmanı', kapsam: 'kurum geneli',
    onkosul: 'Pencere 1280px', veriHali: 'yüksek hacim',
    eylem: 'Sıranın kaç satıra sardığı hesaplanır',
    beklenenSonuc: 'Hiçbir alan iki satırı aşmaz',
    beklenenEkran: 'Gövdenin yeri korunur',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'RESPONSIVE'],
  },
  {
    id: 'SIS-KBK-016', alan: 'Sistem', rota: '/uyum', eksen: 'arayuz',
    amac: 'Bağ adlarının okunur uzunlukta kalması',
    rol: 'saha kullanıcısı', kapsam: 'tek tesis',
    onkosul: 'Dar bant', veriHali: 'uzun içerik',
    eylem: 'En uzun bağ adı ölçülür',
    beklenenSonuc: 'Hiçbir bağ dar bandın yarısını aşmaz',
    beklenenEkran: 'Gezinme etiketi yarım okunmaz',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-KBK-017', alan: 'Sistem', rota: '/envanter', eksen: 'arayuz',
    amac: 'Üçüncül sıranın en dar masaüstünde sığması',
    rol: 'BT yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Pencere 1024px · Varlık grubu açık', veriHali: 'normal',
    eylem: 'Grubun alt ekranlarının toplam eni hesaplanır',
    beklenenSonuc: 'Sıra sığar — saramadığı için sığmak zorundadır',
    beklenenEkran: 'Alt ekranların hepsi görünür',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'RESPONSIVE'],
  },
  {
    id: 'SIS-MRC-001', alan: 'Sistem', rota: '/envanter', eksen: 'arayuz',
    amac: 'İkincil (taşma) merceğin birincil gibi görünmemesi — sekiz eşit '
      + 'ağırlıklı düğme, hangisinin günlük iş olduğunu söylemez',
    rol: 'BT yöneticisi', kapsam: 'kurum geneli',
    onkosul: 'Envanter ekranı açık; mercek şeridi beş birincil ve üç taşma '
      + 'merceği taşıyor', veriHali: 'normal',
    eylem: 'Mercek şeridine bakar',
    beklenenSonuc: 'Beş birincil mercek düz kenarlıkla, üç taşma merceği '
      + 'kesikli kenarlıkla çizilir — paylaşılan süzgeç bileşeninin ve '
      + 'keşif ekranının kullandığı gramerin aynısı',
    beklenenEkran: 'Envanter süzgeç şeridi',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-SAHA-002', alan: 'Sistem', rota: '/', eksen: 'veri',
    amac: 'Kurulu gücü ÖLÇÜLMEMİŞ tesisin, gücü sıfır ölçülmüş tesisle '
      + 'aynı yerde görünmemesi — tuvalin dikey ekseni kurulu güçtür ve '
      + 'ölçülmemiş bir değerin o eksende yeri yoktur',
    rol: 'BT direktörü', kapsam: 'kurum geneli',
    onkosul: 'Saha ekranı açık; portföyde kurulu gücü kayıtlı olmayan '
      + 'tesis var ve uyum endeksi ölçülmüş', veriHali: 'kısmi',
    eylem: 'Uyum × güç tuvaline bakar',
    beklenenSonuc: 'Gücü ölçülmemiş tesis tuvalin tabanına konmaz; eksenin '
      + 'altında "Kurulu güç ölçülmedi" başlıklı kendi şeridinde, adı, uyum '
      + 'endeksi ve uygunsuz sayısıyla ve en düşük endeks önce olacak '
      + 'şekilde listelenir',
    beklenenEkran: 'Saha · uyum × güç tuvali',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'DOMAIN'],
  },
  {
    id: 'SIS-OKM-001', alan: 'Sistem', rota: '/ayarlar', eksen: 'arayuz',
    amac: 'Okuma hâlinin düzenleme hâlinden ayrılması — ekranın birincil '
      + 'görevi hesabı OKUMAKTIR, ama açılışta altı giriş alanı çiziliyordu; '
      + 'parola bölümü, okunacak bir değeri olmadığı için üç BOŞ kutuydu',
    rol: 'herhangi bir kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Ayarlar ekranı açık; hesabın parolası tanımlı',
    veriHali: 'normal',
    eylem: 'Ekranı açar ve hiçbir şey değiştirmeden profilini okur',
    beklenenSonuc: 'Profil değerleri okunur biçimde (ad, unvan, e-posta) '
      + 'gelir ve hiçbir yazma alanı çizilmez; düzenleme ve parola '
      + 'değişimi kullanıcının kararıyla açılır, Vazgeç ile kapanır',
    beklenenEkran: 'Ayarlar · profil ve parola bölümleri',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-019', alan: 'Sistem', rota: '/uyum', eksen: 'arayuz',
    amac: 'İkincil sıradaki grup yapısının EKRAN OKUYUCUYA da ulaşması — '
      + 'gören kullanıcı grupları dikey çizgiden ayırır, ekran okuyucu o '
      + 'çizgiyi göremez ve bağları tek yığın olarak duyar',
    rol: 'ekran okuyucu kullanan kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Bir alan açık; ikincil sıra en az bir grup taşıyor',
    veriHali: 'normal',
    eylem: 'Gezinme bölgesini ekran okuyucuyla dolaşır',
    beklenenSonuc: 'Her grup kendi ADIYLA duyulur (Uyum · Varlık operasyonları · '
      + 'Portföy…); bir alanın grup adları birbirinden farklıdır',
    beklenenEkran: 'İkincil gezinme sırası',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-KBK-020', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Dar bant için YAZILAN bir kuralın gerçekten uygulanması — '
      + 'ölçüldü: iki bildirim doğru banda konmuş, doğru yazılmış ve '
      + 'cascade yüzünden hiç uygulanmamıştı (hesaplanan değer 375px’te '
      + 'temel kuralın değeriydi)',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Kabuk CSS’inde dar bant blokları var', veriHali: 'normal',
    eylem: 'Kabuk CSS’i okunur; her dar bant bildirimi, aynı seçiciyi aynı '
      + 'özellikle ezen SONRAKİ bir kurala karşı sınanır',
    beklenenSonuc: 'Tarama sıfırdan çok bildirim görür ve tabanın altına düşmez',
    beklenenEkran: 'Kör bir ayrıştırıcı "ölü kural yok" diyemez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-021', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Ölü dar bant bildiriminin depoya girmemesi',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Bir dar bant bloğuna bildirim eklendi', veriHali: 'normal',
    eylem: 'Bildirim, medyasız ya da daha GENİŞ bir max-width taşıyan '
      + 'sonraki bir kuralla karşılaştırılır',
    beklenenSonuc: 'Ölü bildirim sayısı SIFIR; gerekçeli istisna yok — '
      + 'çalışmayan bir kuralın gerekçesi olamaz',
    beklenenEkran: 'Yazılan iyileştirme ekranda gerçekten var',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-022', alan: 'Sistem', rota: '/envanter', eksen: 'arayuz',
    amac: 'Telefonda "neredeyim" sorusunun BAKARAK cevaplanması — ölçüldü: '
      + 'kayan 45 rotanın 24’ünde aktif sekme ekranın dışındaydı',
    rol: 'telefonla bakan kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Varlık alanı açık; ikincil sıra beş bağ taşıyor (Uyum sırası '
      + 'odak turunda üç bağa indi ve artık katlanmaz)',
    veriHali: 'normal',
    eylem: 'Ekranı 375px genişlikte açar',
    beklenenSonuc: 'Sıra yatay kaymaz; tek bir düğme aktif grubu ve aktif '
      + 'bölümü yazar',
    beklenenEkran: 'İkincil sıra · bölüm seçici',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-023', alan: 'Sistem', rota: '/riskler', eksen: 'arayuz',
    amac: 'Ekrana SIĞAN bir sıranın gereksiz yere katlanmaması',
    rol: 'telefonla bakan kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Risk alanı açık; ikincil sıra iki bağ taşıyor',
    veriHali: 'normal',
    eylem: 'Ekranı 375px genişlikte açar',
    beklenenSonuc: 'İki bağ da doğrudan görünür; katlama yok, ek dokunuş yok',
    beklenenEkran: 'İkincil sıra · düz',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-024', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Katlama eşiğinin uydurulmuş değil ÖLÇÜLMÜŞ bir sınır olması',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'İkincil sıralar iki · iki · üç · beş bağ taşıyor',
    veriHali: 'normal',
    eylem: 'Eşik, ürünün gerçek sıralarına karşı sınanır',
    beklenenSonuc: 'Eşiğin iki yanında da gerçek sıra var ve hiçbir sıra '
      + 'eşiğin tam üstünde durmuyor',
    beklenenEkran: 'Bir bağ eklendiği gün davranış sessizce değişmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-025', alan: 'Sistem', rota: '/egitimler', eksen: 'arayuz',
    amac: 'Aktif bölümün GRUBUYLA birlikte bulunması — grup bağlamı gören '
      + 'kullanıcıya ulaşmıyordu, yalnız aria-label taşıyordu',
    rol: 'telefonla bakan kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Sıranın en sonundaki bölüm açık', veriHali: 'normal',
    eylem: 'Bölüm seçici düğmesini okur',
    beklenenSonuc: 'Aktif bölüm "Uyum › Kayıt ve kanıt" bulunur (alt ekran '
      + 'ikincil öğesini yakar); alan dışı bir patikada uydurma bölüm '
      + 'yazmaz, alan adını yazar',
    beklenenEkran: 'Bölüm seçici düğmesi',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-KBK-026', alan: 'Sistem', rota: '/uyum', eksen: 'arayuz',
    amac: 'Bant kararının CSS’te durması — bileşen bandı ölçseydi sunucu '
      + 'geniş bandı çizer, istemci dar bandı düzeltir ve ilk karede '
      + 'yanlış yüzey yanardı',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Katlanan bir sıra var', veriHali: 'normal',
    eylem: 'Kabuk CSS’i okunur',
    beklenenSonuc: 'Seçici geniş ekranda gizli, dar bantta görünür; '
      + 'katlanan sıranın grupları yalnız dar bantta düşer',
    beklenenEkran: 'Her bant tek bir yüzey gösterir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-027', alan: 'Sistem', rota: '/envanter', eksen: 'arayuz',
    amac: 'Katlanan sıranın HİÇBİR ROTAYI gizlememesi — ulaşım yolu '
      + 'değişir, rota kaybolmaz',
    rol: 'telefonla bakan kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Varlık alanı 375px’te açık; sıra katlanmış', veriHali: 'normal',
    eylem: 'Bölüm seçiciyi dokunarak açar ve sıranın son bölümüne dokunur',
    beklenenSonuc: 'Panel her grubu başlığıyla dikey listeler, aktif bölüm '
      + 'işaretli gelir, dokunulan bölüme gidilir ve panel kapanır',
    beklenenEkran: 'Bölüm paneli',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-KBK-028', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Katlama kapısının KÖR kalmaması — kapı sınıf adına bakar, '
      + 'bileşen o adı değiştirirse kapı hiçbir şey bulamadan yeşil yanar',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Gezinme kapısı bölüm seçicisini sürüyor', veriHali: 'normal',
    eylem: 'Kapının kullandığı seçiciler bileşenin gerçek sınıflarıyla '
      + 'karşılaştırılır',
    beklenenSonuc: 'Üç sınıf da iki dosyada birebir; sıfır ölçüm kırmızı yakar',
    beklenenEkran: 'Kör bir kapı yeşil yanamaz',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-029', alan: 'Sistem', rota: '/tedarikciler', eksen: 'arayuz',
    amac: 'Alt ekranlar sırasının AKTİF olanı göstererek açılması — '
      + 'ölçüldü: 19 rotanın altısında aktif alt ekran görünür alanın '
      + 'dışındaydı, en uzağı 537px',
    rol: 'telefonla bakan kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Varlık alanında bir grubun son alt ekranı açık',
    veriHali: 'normal',
    eylem: 'Ekranı 375px genişlikte açar',
    beklenenSonuc: 'Aktif alt ekran sıranın görünür penceresinde gelir; '
      + 'sayfanın kendisi kaymaz ve zaten görünür olan oynatılmaz',
    beklenenEkran: 'Üçüncül gezinme sırası',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-030', alan: 'Sistem', rota: '/uyum', eksen: 'arayuz',
    amac: 'Uyum gezinmesinin Varlık ile AYNI grameri konuşması — ölçüldü: '
      + 'Uyum on dokuz eş ağırlıklı bağı tek sırada taşıyordu, Varlık beş '
      + 'öğe + üçüncül sıra; kullanıcı "her tarafta metin" görüyordu',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Uyum alanı açık', veriHali: 'normal',
    eylem: 'İkincil sırayı okur; bir öğeye dokunur; üçüncül sırada gezer',
    beklenenSonuc: 'İkincil sıra üç öğe taşır (Uyum durumu · Denetim ve '
      + 'aksiyon · Kayıt ve kanıt); her öğe üçüncül sıra açar; on dokuz '
      + 'rotanın on dokuzu da bir üçüncül sırada durur, hiçbiri kaybolmaz',
    beklenenEkran: 'İkincil ve üçüncül sıra',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-KBK-018', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Hiçbir ekranın kalite kapılarının dışında kalmaması',
    rol: 'ürün ekibi', kapsam: 'kurum geneli',
    onkosul: 'Yeni bir ekran eklendi', veriHali: 'normal',
    eylem: 'Rota envanteri sayfa ağacıyla karşılaştırılır',
    beklenenSonuc: 'Kabuklu her statik sayfa envanterde',
    beklenenEkran: 'Listede olmayan ekran hiçbir kapıdan geçmez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'DOMAIN'],
  },
  {
    id: 'SIS-BSL-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Sayfa başlığının tek başına okunması',
    rol: 'herhangi bir kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Ekranın vurgusu boş kalabiliyor', veriHali: 'yok',
    eylem: 'Ekran açılır ve H1 okunur',
    beklenenSonuc: 'Başlık cümle parçası değil',
    beklenenEkran: 'Ekran okuyucu ve arama sonucu anlamlı bir ad görür',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-BSL-002', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'İster kodunun son kullanıcıya gösterilmemesi',
    rol: 'herhangi bir kullanıcı', kapsam: 'kendi kapsamı',
    onkosul: 'Ekran bir isterden doğmuş', veriHali: 'normal',
    eylem: 'Ekran künyesi okunur',
    beklenenSonuc: 'Künyede UY-/OT- kodu geçmez',
    beklenenEkran: 'Kod ürün belgesinde kalır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI'],
  },
  {
    id: 'SIS-ERS-002', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Tıklanabilir görünen her şeyin gerçekten tıklanabilir olması',
    rol: 'klavye kullanıcısı', kapsam: 'kendi kapsamı',
    onkosul: 'Tablo seçilebilir değil', veriHali: 'normal',
    eylem: 'Satırın imlecine ve rolüne bakılır',
    beklenenSonuc: 'Seçilemeyen satır işaretçi imleci taşımaz',
    beklenenEkran: 'Sahte tıklama çağrısı yok',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['ACCESSIBILITY', 'UI'],
  },
  {
    id: 'SIS-ERS-003', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Bileşik widget rolünün sözünü tutması',
    rol: 'klavye kullanıcısı', kapsam: 'kendi kapsamı',
    onkosul: 'Ekranda grid ya da sekme listesi var', veriHali: 'normal',
    eylem: 'Widget içinde odaklanabilir bir durak aranır',
    beklenenSonuc: 'Rol varsa gezinen odak da vardır',
    beklenenEkran: 'Tab ile girilir, ok tuşlarıyla gezilir',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['ACCESSIBILITY'],
  },
  {
    id: 'SIS-BSD-002', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Boş durum cümlelerinin taşıdığı politika iddialarının GERÇEKTEN tutulması',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Sebebini söyleyen boş durum cümleleri; R-F türeticisi beşini politika saydı',
    veriHali: 'yok',
    eylem: 'İddiayı tutan katman sürülür: şema kolonu, motor defteri, ekran sorgusu',
    beklenenSonuc: 'Kanıt talebi denetimsiz yazılamaz · imha önerensiz açılamaz · '
      + 'gözden geçirmeye motor yazmaz · dış erişim süresiz olamaz · değişiklik '
      + 'listesi tek kaynaktan gelir',
    beklenenEkran: 'Boş durumun söylediği ile kodun yaptığı aynıdır',
    beklenenIz: 'yazma yok — ölçüm şemayı ve sorguyu okur',
    beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'MIGRATION'],
  },
  {
    id: 'SIS-KAP-004', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Tarayıcılı kanıt kapılarında SABİT iddia bulunmaması',
    rol: 'kapı bakımcısı', kapsam: 'kurum geneli',
    onkosul: '`kaydet(...)` çağıran bir kanıt aracı var',
    veriHali: 'yok',
    eylem: 'Araçların kaynağı taranır',
    beklenenSonuc: 'Hiçbir `kaydet` çağrısı sabit `true` geçmez; rapora '
      + '"geçti" yazan her satır bir GÖZLEME dayanır. Sabit `false` '
      + 'yasak değildir: bulunamama dalında ölçülen olumsuz sonucu yazar '
      + 've olsa olsa yanlış alarm üretir.',
    beklenenEkran: 'yok — kapı raporunda ölçülmüş iddia ile ölçülmemiş cümle ayrışır',
    beklenenIz: 'yazma yok — ölçüm kaynağı okur',
    beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'SIS-BSD-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Boş durumun SEBEBİNİ söylemesi ve ÇÖZÜM EYLEMİNE işaret etmesi',
    rol: 'ilk kurulumdaki kullanıcı', kapsam: 'kurum geneli',
    onkosul: 'Ekranın listesi boş — kayıt yok, süzgeç eledi ya da karar bekliyor',
    veriHali: 'yok',
    eylem: 'Ekran açılır',
    beklenenSonuc: 'Cümle "X yok" demekle kalmaz; sebebini ya da sonucunu söyler '
      + 've bir eylem verir. İYİ HABER boş durumu eylem istemez.',
    beklenenEkran: 'Kullanıcı ekranda kalmaz: ne olduğu ve ne yapacağı yazılıdır',
    beklenenIz: 'yazma yok',
    beklenenBildirim: 'yok',
    katmanlar: ['UI', 'DOMAIN'],
  },
  {
    id: 'SIS-BOS-001', alan: 'Sistem', rota: '—', eksen: 'akis',
    amac: 'Müşterinin BİRİNCİ GÜNÜ: sıfır satırdan satılabilir duruma kadar yazma yolu',
    rol: 'kurulum operatörü ve ilk yönetici', kapsam: 'yeni kurulum',
    onkosul: 'Boş veritabanı; göç zinciri uygulanmış; TOHUM YOK',
    veriHali: 'yok',
    eylem: 'Göç → ilk kullanıcı → giriş → paket → insan kararıyla aktifleştirme '
      + '→ ilk tesis → madde durumu → denetim formu → yedek doğrulama',
    beklenenSonuc: 'Dokuz adımın dokuzu da geçer; paket hiçbir sürümü '
      + 'KENDİLİĞİNDEN aktifleştirmez',
    beklenenEkran: 'Her adım ADIYLA, SÜRESİYLE ve SONUCUYLA raporlanır — "çalıştı" yetmez',
    beklenenIz: 'kurucu hesap izi aktörsüz ve kaynak kurulum; sonraki adımlar aktörlü',
    beklenenBildirim: 'yok',
    katmanlar: ['MIGRATION', 'SERVER', 'WORKFLOW', 'DOMAIN'],
  },
  {
    id: 'SIS-IZO-001', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Test izolasyonunun kendi veritabanını GERÇEKTEN düşürmesi',
    rol: 'koşum sahibi', kapsam: 'test sunucusu',
    onkosul: 'Şablondan klonlanmış koşum veritabanları; bazılarının sahibi ölmüş',
    veriHali: 'kısmi',
    eylem: 'Koşum öncesi yetimler süpürülür, sonrasında bu koşumun bıraktığı ölçülür',
    beklenenSonuc: 'Yetim düşer; eşzamanlı koşumun CANLI veritabanı ve ŞABLON '
      + 'dokunulmaz; koşum artık bırakırsa KIRMIZI',
    beklenenEkran: 'Sızıntı adıyla raporlanır — sessiz geçmez',
    beklenenIz: 'düşürme SON KOŞULUNU ölçer; silinmeyen satır kalan listesine girer',
    beklenenBildirim: 'yok',
    katmanlar: ['MIGRATION', 'CONCURRENCY'],
  },
  {
    id: 'SIS-SAB-001', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Sabotaj turunda kaldırılan iddianın GERİ KONDUĞUNUN ölçülmesi',
    rol: 'geliştirici', kapsam: 'depo',
    onkosul: 'Sabotaj turu koşuldu; bir iddia geçici olarak kaldırıldı',
    veriHali: 'yok',
    eylem: 'İzlenen kaynak dosyalar sabotaj işareti için taranır',
    beklenenSonuc: 'Tek başına bir ifadenin YERİNE geçmiş "sabotaj" yorumu '
      + 'hiçbir izlenen dosyada kalmaz; sabotaj sözcüğünü ANLATAN yorumlar '
      + 'yakalanmaz (gürültüye boğulan bekçi susturulur).',
    beklenenEkran: 'Kalan işaret dosya ve satırıyla yazılır',
    beklenenIz: 'yazma yok — ölçüm git kapsamını okur',
    beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'SIS-SIL-001', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Yumuşak silinmiş maddenin SAYIMA girmemesi — sayı ile liste ayrışmaz',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Bir sürümün maddeleri yumuşak silinmiş (`silindi` dolu)',
    veriHali: 'kısmi',
    eylem: 'Madde sayan her `_count` bloğu taranır',
    beklenenSonuc: 'Her sayım `where: { silindi: null }` taşır. Taşımayan bir '
      + 'sayım, ekranın boşluk cümlesini ve "madde içe aktarılmadı" kararını '
      + 'YANLIŞ tarafa çevirir: silinmiş ≠ var.',
    beklenenEkran: 'Süzgeçsiz sayım dosya ve blok olarak yazılır',
    beklenenIz: 'yazma yok',
    beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'UI'],
  },
  {
    id: 'SIS-TAB-001', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Ölçüm tabanının ELLE indirilememesi — cırcır yalnız sıkılaşır',
    rol: 'geliştirici', kapsam: 'depo',
    onkosul: 'Taban dalda beyanlı bir ölçüm tabanı var',
    veriHali: 'yok',
    eylem: 'Taban dosyası taban dala göre karşılaştırılır',
    beklenenSonuc: 'İnen her taban `dususler` kaydı taşır; kayıtsız iniş KIRMIZI. '
      + 'Taban yalnız `--taban-yaz --sebep=` ile ve gerekçesi DOSYADA iner.',
    beklenenEkran: 'Kapı hangi tabanın ne kadar indiğini adıyla yazar',
    beklenenIz: 'yazma yok — ölçüm iki dosyayı okur',
    beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'SIS-TAB-002', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Taban dal okumasının ÜÇ HÂLİNİ ayırması — okunamayan "temiz" değildir',
    rol: 'geliştirici', kapsam: 'depo',
    onkosul: 'Kütük taban dalda yok · var ve okunur · var ama okunamıyor',
    veriHali: 'kısmi',
    eylem: 'Cırcır taban dal kütüğünü okumayı dener',
    beklenenSonuc: 'Üç hâl ayrı karar verir: taban yok → cırcır koşmaz · okundu → '
      + 'koşar · ÖLÇÜLEMEDİ → CI\'da KIRMIZI. Tek `catch` üçünü de yeşil yapardı.',
    beklenenEkran: 'Sebep adıyla yazılır (bozuk JSON · okunamayan blob)',
    beklenenIz: 'yazma yok',
    beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
  {
    id: 'SIS-KUR-001', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Boş kurulumun ilk kullanıcısının açılması ve aracın arka kapıya dönmemesi',
    rol: 'kurulum operatörü', kapsam: 'kurulum',
    onkosul: 'Göç uygulanmış, Kullanici tablosu BOŞ',
    veriHali: 'yok',
    eylem: 'arac/kurucu-hesap.ts stdin ile parola alarak koşturulur',
    beklenenSonuc: 'Kullanıcı + KÜRESEL yetki + denetim izi TEK transaction; '
      + 'kurulum doluyken hiçbir şey yazmaz ve sıfır dışı çıkar',
    beklenenEkran: 'Parola hiçbir yere yazılmadı; yalnız scrypt özeti saklandı',
    beklenenIz: 'aktorId NULL, kaynak kurulum; parola/uzunluğu/özeti ize GİRMEZ',
    beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER', 'RBAC', 'MIGRATION'],
  },
  {
    id: 'SIS-DGM-001', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Ekranın ÜRÜN DEĞİŞMEZİ cümlelerinin (S2) gerçek yolla ölçülmesi',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Kapanmış bildirim, açık dead-letter kaydı, el ile değiştirilmiş '
      + 'uygulanabilirlik kararı ve kapalı bulgu kurulu',
    veriHali: 'normal',
    eylem: 'Motorlar GERÇEKTEN koşturulur ve sunucu eylemleri GERÇEKTEN çağrılır',
    beklenenSonuc: 'Dokunmadığı iddia edilen kayıt DEĞİŞMEZ; silmez dediğini SİLMEZ; '
      + 'uydurmaz dediği sayıyı UYDURMAZ',
    beklenenEkran: 'Ekranın yazdığı değişmez, sunucunun davranışıyla aynıdır',
    beklenenIz: 'reddedilen denemede yan etki YOK — delta ile ölçülür',
    beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER', 'ENGINE', 'WORKFLOW'],
  },
  {
    id: 'SIS-YTK-011', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Sunucu eyleminin kapsam ve yetki cümlelerinin gerçek yolla ölçülmesi',
    rol: 'güvenlik denetçisi', kapsam: 'kurum geneli',
    onkosul: 'İptalli anahtar, kapanmış denetim, silinmiş connector ve öksüz kanıt kurulu',
    veriHali: 'normal',
    eylem: 'Her durumda GERÇEK sunucu eylemi çağrılır',
    beklenenSonuc: 'Eylem REDDEDER ve kayıt DEĞİŞMEZ; yetkili rol geçer',
    beklenenEkran: 'Ekranın yazdığı cümle sunucunun verdiği cevapla aynıdır',
    beklenenIz: 'reddedilen denemede yazma yok; iz kütüğü yalnız eklenir',
    beklenenBildirim: 'yok',
    katmanlar: ['RBAC', 'SCOPE', 'SERVER', 'DOMAIN'],
  },
  {
    id: 'SIS-DEM-002', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Demo ikizlerinin kendi politika cümlelerini tutması',
    rol: 'demo ziyaretçisi', kapsam: 'demo kurulumu',
    onkosul: 'Statik demo derlemesi', veriHali: 'normal',
    eylem: 'Demo ikizi eylemleri doğrudan çağrılır',
    beklenenSonuc: 'AÇIK RET döner ve gerekçesini söyler; sessiz düşüş yok',
    beklenenEkran: 'Ekran neden yapılamadığını yazar',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN'],
  },
  {
    id: 'SIS-DEM-003', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Demo ORTAM VAADİNİN tamamının ölçülmesi: eşleme kapsamı, ihraç '
      + 'paritesi, sessiz başarı yokluğu ve yapısal yazamazlık',
    rol: 'demo ziyaretçisi', kapsam: 'demo kurulumu',
    onkosul: 'Yazan her sunucu eylemi modülünün bir demo ikizi var',
    veriHali: 'normal',
    eylem: 'İkizlerin TAMAMI glob ile yüklenir ve HER ihracı gerçekten çağrılır',
    beklenenSonuc: 'Hiçbiri sessizce başarı dönmez; ikiz kümesi eşlenen modül '
      + 'kümesiyle birebirdir; hiçbir ikiz veritabanına dokunmaz',
    beklenenEkran: 'Demo ekranı "bu ortamda çalışmaz" der ve ÇÖKMEZ',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    /* Takma ad eşlemesi DERLEME ANI bir bağlantıdır; katman kataloğunda
       ayrı bir `BUILD` yok ve yenisini açmak kataloğu bu tek vaka için
       genişletmek olurdu — `INTEGRATION` derleme/ortam bağlantısını
       zaten taşıyor. */
    katmanlar: ['SERVER', 'DOMAIN', 'INTEGRATION'],
  },
  {
    id: 'SIS-EKR-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Ekranda okunan ama iddiası EKRANIN DIŞINDA yaşayan cümlelerin '
      + '(S3) gerçek yolla ölçülmesi',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Kayıt evreni bilinmeyen tip, boş kapsam seçimi, reddedilmiş '
      + 'aktarım, çerçeve dışı koordinat ve engelli mevzuat kaynağı kurulu',
    veriHali: 'bilinmeyen',
    eylem: 'Cümleyi üreten saf fonksiyon, onu uygulayan sunucu eylemi ve '
      + 'onu boyayan bileşen+CSS sözleşmesi ayrı ayrı sürülür',
    beklenenSonuc: 'Bilinmeyen evren SIFIR yazılmaz ve "ok" görünmez; '
      + '"silinmez" diyen ekranın eyleminde kayıt silme yoktur; köken '
      + 'işareti hap değildir; ipucu odakla da açılır',
    beklenenEkran: 'Ekranın cümlesi, onu uygulayan kodun davranışıyla aynıdır',
    beklenenIz: 'okuma yolları iz bırakmaz', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN', 'SERVER', 'UI', 'ACCESSIBILITY'],
  },
  {
    id: 'SIS-DGM-002', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Sunucu eyleminin RET GEREKÇESİ cümlelerinin (S3) gerçek yolla ölçülmesi',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Pasif eğitim, engelli mevzuat kaynağı, değişmez saklama ailesi, '
      + 'uygulanmış aktarım, tamamlanmış gözden geçirme ve pasif kullanıcı kurulu',
    veriHali: 'normal',
    eylem: 'Her durumda GERÇEK sunucu eylemi çağrılır',
    beklenenSonuc: 'Eylem REDDEDER ve gerekçe EKRANDAKİ cümledir; kayıt DEĞİŞMEZ',
    beklenenEkran: 'Ekranın yazdığı ret gerekçesi sunucunun verdiğiyle aynıdır',
    beklenenIz: 'reddedilen denemede iz satırı YOK — delta ile ölçülür',
    beklenenBildirim: 'yok',
    katmanlar: ['SERVER', 'DOMAIN', 'RBAC'],
  },
  {
    id: 'SIS-PAS-001', alan: 'Sistem', rota: '/topoloji', eksen: 'entegrasyon',
    amac: 'Ekranın "ağa paket göndermez" sözünün ÇALIŞMA ANINDA tutulması',
    rol: 'OT güvenlik sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Ağ ilkelleri fırlatan sahteyle değiştirildi', veriHali: 'normal',
    eylem: 'Anlık alma, sapma işleme, kayıttan anlık ve temel onaylama koşturulur',
    beklenenSonuc: 'Hiçbir yol ağa çıkmaz; çıkarsa ölçüm kırmızı yanar',
    beklenenEkran: 'Ekranın pasif önce cümlesi gerçek yolla ölçülmüştür',
    beklenenIz: 'temel onayı iz bırakır', beklenenBildirim: 'yok',
    katmanlar: ['ENGINE', 'SERVER', 'INTEGRATION'],
  },
  {
    id: 'SIS-YTK-010', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Ekranın yetki cümlelerinin GERÇEK eylemle ölçülmesi',
    rol: 'güvenlik denetçisi', kapsam: 'kurum geneli',
    onkosul: 'Yetkisiz, okuyucu, katkıcı ve tesise kısıtlı roller kurulu',
    veriHali: 'normal',
    eylem: 'Her rol gerçek sunucu eylemini çağırır',
    beklenenSonuc: 'Yetkisi olmayan REDDEDİLİR ve kayıt DEĞİŞMEZ; olan geçer',
    beklenenEkran: 'Yetkisiz hesap hiçbir modülü açamaz',
    beklenenIz: 'reddedilen denemede yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['RBAC', 'SCOPE', 'SERVER'],
  },
  {
    id: 'SIS-YTK-012', alan: 'Sistem', rota: '—', eksen: 'yetki',
    amac: 'Düz JSX metninde duran YETKİ ve SIR iddialarının (S1) gerçek '
      + 'yolla ölçülmesi',
    rol: 'güvenlik denetçisi', kapsam: 'kurum geneli',
    onkosul: 'Okuyucu, katkıcı ve yönetici roller kurulu; API anahtarı, '
      + 'köken kuyruğu, görev ve dış denetçi erişimi fikstürleri hazır',
    veriHali: 'normal',
    eylem: 'Her yetki iddiası GERÇEK sunucu eylemiyle sürülür; sır '
      + 'iddiaları yapısal olarak (şemada alan YOK) ölçülür',
    beklenenSonuc: 'Yetkisiz rol REDDEDİLİR, kayıt DEĞİŞMEZ ve iz DÜŞMEZ; '
      + 'sır DEĞERİ için hiçbir kolon yoktur; iptal edilmiş anahtar 401 '
      + 'döner; kapsam değişimi token\'ı değiştirmez',
    beklenenEkran: 'Ekranın yetki ve sır cümlesi, onu uygulayan kodun '
      + 'davranışıyla aynıdır',
    beklenenIz: 'reddedilen denemede yazma yok — delta ile ölçülür',
    beklenenBildirim: 'yok',
    katmanlar: ['RBAC', 'SCOPE', 'SERVER', 'DOMAIN'],
  },
  {
    id: 'SIS-DGM-003', alan: 'Sistem', rota: '—', eksen: 'veri',
    amac: 'Ürün DEĞİŞMEZLERİNİN (S2) gerçek yolla ölçülmesi: kuru koşu '
      + 'yazmaz · kayıt silinmez · motor önerir, insan karar verir',
    rol: 'uyum sorumlusu', kapsam: 'kurum geneli',
    onkosul: 'Madde durumu, hukuki muhafaza, imha politikası, kurulu paket, '
      + 'topoloji sapması, tedarikçi oturumu ve konfig yedeği fikstürleri kurulu',
    veriHali: 'normal',
    eylem: 'Her değişmez, onu uygulayan GERÇEK eylemle ya da motorla sürülür; '
      + 'çoğu vaka bir KARŞI TANIK taşır',
    beklenenSonuc: 'Kuru koşu hiçbir değerlendirmeye dokunmaz · kaldırılan '
      + 'hold ve arşivlenen paket SİLİNMEZ · onaydan sonra konan hold imhayı '
      + 'durdurur · motor kuyruk boşaltmaz, bulgu susturmaz, skor uydurmaz',
    beklenenEkran: 'Ekranın değişmez cümlesi, onu uygulayan kodun '
      + 'davranışıyla aynıdır',
    beklenenIz: 'her kayıt KENDİ iz satırını bırakır; reddedilen denemede yok',
    beklenenBildirim: 'sorumlusu olmayan kayıt için bildirim ÜRETİLMEZ',
    katmanlar: ['SERVER', 'DOMAIN', 'ENGINE'],
  },
  {
    id: 'SIS-BAG-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Ekranın gösterdiği ÇIKIŞIN gerçek bir rotaya çözülmesi',
    rol: 'herhangi bir kullanıcı', kapsam: 'kurum geneli',
    onkosul: '`app/` rota ağacı okunabiliyor', veriHali: 'normal',
    eylem: 'Rota desenleri `app/` AĞACINDAN türetilir; kaynaktaki her iç bağ '
      + '(href düz/ifade · router.push · redirect · revalidatePath) o desenlere '
      + 'karşı segment segment çözümlenir; çözümleyici ayrıca sentetik '
      + 'desenlerle sınanır',
    beklenenSonuc: 'Olmayan rotaya giden bağ YOKTUR; üst yola yaslanan gevşek '
      + 'eşleşme KABUL EDİLMEZ',
    beklenenEkran: 'Boş durumun önerdiği çıkış 404 vermez',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'DOMAIN'],
  },
  {
    id: 'URN-TNK-001', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Kütük popülasyonunun İKİNCİ BİR MEKANİZMAYLA doğrulanması',
    rol: 'kalite kapısı', kapsam: 'kurum geneli',
    onkosul: 'Ürün canlı sunucuda ayakta; DOM tanığı koştu',
    veriHali: 'tohumlanmış kurulum',
    eylem: 'Tanık kaynağı HİÇ OKUMADAN ürünü gerçek tarayıcıda gezer ve '
      + 'kullanıcıya görünen politika cümlelerini ve boş durumları toplar; '
      + 'kütükle karşılaştırılır',
    beklenenSonuc: 'Ekranda okunan her cümle bir kütükte AÇIKLANIR; ölü tanık '
      + 'satırı yoktur; tanığın erişimi (rota ve cümle sayısı) tabanın altına '
      + 'düşmez',
    beklenenEkran: 'Render edilmiş ekranda eylemsiz boş durum yoktur',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['UI', 'DOMAIN'],
  },
  {
    id: 'SIS-POL-002', alan: 'Sistem', rota: '—', eksen: 'arayuz',
    amac: 'Türetici genişleyince AÇILAN politika cümlelerinin gerçek yolla '
      + 'ölçülmesi',
    rol: 'kalite kapısı', kapsam: 'kurum geneli',
    onkosul: 'Politika kütüğü türetildi', veriHali: 'tohumlanmış kurulum',
    eylem: 'Her cümle, iddiayı UYGULAYAN kodun gerçek yolunu süren bir vaka '
      + 'ile ölçülür; vakaların çoğu KARŞI TANIK taşır',
    beklenenSonuc: 'Kapsamsız davet reddedilir · çok bağlı kanıt her kapsamda '
      + 'yetki ister · kararsız gözden geçirme "yapıldı" olmaz · uygulanmış '
      + 'talep ikinci kez uygulanmaz · aday yalnız kritik sapmadan doğar',
    beklenenEkran: 'Ekranın cümlesi ile sunucunun davranışı AYNI',
    beklenenIz: 'reddedilen denemede iz YOK; geçen işlemde iz VAR',
    beklenenBildirim: 'yok',
    katmanlar: ['UI', 'SERVER', 'DOMAIN'],
  },
  {
    id: 'SIS-SNG-001', alan: 'Sistem', rota: '/giris', eksen: 'arayuz',
    amac: 'Giriş sahnesinin kaydırma konumuna bağlı ve tersinir kalması',
    rol: 'ilk kez gelen ziyaretçi', kapsam: 'giriş deneyimi',
    onkosul: 'Hareketli giriş kullanılabilir', veriHali: 'ileri ve geri kaydırma',
    eylem: 'Aynı ilerleme noktasına ileri ve geri yönden ulaşılır',
    beklenenSonuc: 'Poz aynıdır; dört kare tek dünya koordinatında ilerler; çözünmede ortak hedef aynı piksel dikdörtgenindedir; arayüz ekran yüzeyinden sıçramasız devralır',
    beklenenEkran: 'Görsel süreklilik ayrıca tarayıcıda doğrulanmalıdır',
    beklenenIz: 'yazma yok', beklenenBildirim: 'yok',
    katmanlar: ['DOMAIN'],
  },
];

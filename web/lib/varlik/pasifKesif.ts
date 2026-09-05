/* ═══════════════════════════════════════════════════════════════════════
   OT-16b · Pasif cihaz keşfi — SAF KARAR

   Soru şudur: "ağımda envanterde olmayan ya da sahibi belli olmayan
   cihaz var mı?" Cevabı ürün ağa paket atarak DEĞİL, kurumun zaten
   çalışan gözlem kaynaklarının çıktısını okuyarak verir.

   ── ÜRÜN AĞA ÇIKMAZ ───────────────────────────────────────────────────
   Port taraması, SNMP deneme-yanılması, Modbus sorgusu, PLC yoklaması ve
   herhangi bir aktif keşif paketi bu üründe YOKTUR ve eklenmeyecektir.
   Gerekçe teknik değil EMNİYETTİR: bir OT ağında beklenmeyen bir paket,
   eski bir PLC'nin haberleşme yığınını kilitleyebilir ve bunun bedeli
   bir üretim durması, en kötü hâlde bir emniyet olayıdır. Bir envanter
   aracının bu riski alması savunulamaz.

   Bu kural yönetim panelinden gevşetilemez (C sınıfı). Bir kurum aktif
   tarama istiyorsa bunu kendi tarama ürünüyle, kendi değişiklik
   yönetimiyle yapar; bu ürün o çıktıyı OKUR.

   ── KEŞFEDİLEN CİHAZ KENDİLİĞİNDEN ENVANTERE GİRMEZ ───────────────────
   Akış: Tespit → Eşleştirme → Öneri → İNSAN ONAYI → envantere ekle,
   mevcut kayda bağla ya da gerekçeyle yoksay. Otomasyon önerir, karar
   vermez: yanlış eşleşen bir kayıt sessizce CMDB'ye yazılsaydı, envanter
   düzelmez KİRLENİRDİ.

   Bu dosya veritabanı ve React bilmez. */

/** Bir kaydın "artık görülmüyor" sayılması için gereken gün. */
export const GORUNMEZ_GUN_VARSAYILAN = 30;

/* ── Kaynak kategorileri ─────────────────────────────────────────────
   Kategori ÜRÜN ADI DEĞİLDİR. Kütükte hiçbir marka, model ya da satıcı
   adı geçmez: kurum hangi ürünü kullanıyorsa onun dışa aktarımı ilgili
   kategoriye bağlanır. Marka adı gömmek, ürünü tek bir satıcıya
   çivilemek ve olmayan bir entegrasyonu varmış gibi göstermek olurdu. */

export type KesifKaynakKategorisi = {
  kod: string;
  ad: string;
  /** Bu kaynağın ürüne ne verdiği. */
  verdigi: string;
  /** Kaynağın kendi doğası — ürünün ne YAPMADIĞI da burada yazar. */
  not: string;
};

export const KESIF_KAYNAKLARI: readonly KesifKaynakKategorisi[] = [
  {
    kod: 'siem',
    ad: 'SIEM / log toplama',
    verdigi: 'Log üreten ya da logda görünen cihazın kimliği ve son görülme anı.',
    not: 'Ürün SIEM\'e sorgu atmaz; kurumun verdiği arama çıktısı ya da '
      + 'connector akışı okunur.',
  },
  {
    kod: 'ag_izleme',
    ad: 'Ağ izleme / akış telemetrisi',
    verdigi: 'Trafiği görülen uç noktaların adres ve arayüz bilgisi.',
    not: 'Akış kayıtları zaten toplanan veridir; ürün yeni akış üretmez.',
  },
  {
    kod: 'firewall',
    ad: 'Güvenlik duvarı oturum/kural kayıtları',
    verdigi: 'Bölgeler arası haberleşen kaynak ve hedef adresler.',
    not: 'Kural yazılmaz, oturum kesilmez — yalnız okunur.',
  },
  {
    kod: 'switch_arp',
    ad: 'Switch MAC/CAM tablosu',
    verdigi: 'Hangi MAC adresinin hangi porttan göründüğü — fiziksel yer ipucu.',
    not: 'Tablo kurumun yönetim istasyonundan alınır; ürün anahtara bağlanmaz.',
  },
  {
    kod: 'arp',
    ad: 'ARP gözlemleri',
    verdigi: 'IP ↔ MAC eşleşmesinin belirli bir andaki hâli.',
    not: 'Ürün ARP isteği YAYINLAMAZ; var olan tablo okunur.',
  },
  {
    kod: 'dhcp',
    ad: 'DHCP kira kayıtları',
    verdigi: 'Adres kiralamış istemcinin MAC adresi, hostname ve kira süresi.',
    not: 'DHCP adresi gezer: bu kaynağın IP\'si tek başına kimlik sayılmaz.',
  },
  {
    kod: 'nac',
    ad: 'Ağ erişim kontrolü (NAC)',
    verdigi: 'Ağa katılmaya çalışan cihazın kimliği ve kabul/ret sonucu.',
    not: 'Ürün erişim kararı VERMEZ, verilmiş kararı okur.',
  },
  {
    kod: 'edr',
    ad: 'Uç nokta koruma / yönetim ajanı',
    verdigi: 'Ajan kurulu cihazların künyesi — ajanı olmayan cihaz burada GÖRÜNMEZ.',
    not: 'Bir cihazın bu listede olmaması onun yok olduğunu değil, ajanının '
      + 'olmadığını gösterir.',
  },
  {
    kod: 'ot_discovery',
    ad: 'OT pasif keşif platformu',
    verdigi: 'OT protokolü konuşan cihazların üretici, model ve firmware bilgisi.',
    not: 'Bu ürünlerin pasif dinleme kipi kullanılır; aktif sorgulama kipi '
      + 'istenmez ve kurulan connector onu tetiklemez.',
  },
  {
    kod: 'snmp',
    ad: 'SNMP salt okunur çıktı',
    verdigi: 'Yönetilen ağ cihazlarının arayüz ve komşuluk tabloları.',
    not: 'Ürün SNMP sorgusu ÜRETMEZ: kurumun kendi yönetim istasyonundan '
      + 'aldığı çıktı yüklenir.',
  },
  {
    kod: 'historian',
    ad: 'Historian / proses veri tabanı',
    verdigi: 'Veri gönderen saha cihazlarının etiketleri ve son veri anı.',
    not: 'Proses değerleri okunmaz; yalnız hangi cihazın veri gönderdiği alınır.',
  },
  {
    kod: 'scada_export',
    ad: 'SCADA envanter dışa aktarımı',
    verdigi: 'Kontrol sisteminin kendi cihaz listesi.',
    not: 'SCADA\'ya bağlanılmaz; operasyon ekibinin verdiği dosya okunur.',
  },
  {
    kod: 'vendor_export',
    ad: 'Tedarikçi cihaz listesi',
    verdigi: 'Bakım sözleşmesi kapsamındaki cihazların listesi.',
    not: 'Tedarikçinin verdiği dosya bir gözlemdir, envanterin kendisi değil.',
  },
  {
    kod: 'csv',
    ad: 'Elle aktarım (CSV / tablo)',
    verdigi: 'Yukarıdakilerden hiçbiri bağlı değilken elle yüklenen liste.',
    not: 'Bir dosya bir AKIŞ değildir: bu kaynak "canlı" sayılmaz.',
  },
];

export const KESIF_KAYNAK_KODLARI = KESIF_KAYNAKLARI.map((k) => k.kod);

/** Kaynak kodu → insan sözü. Bilinmeyen kod OLDUĞU GİBİ gösterilir. */
export const KESIF_KAYNAK_SOZU: Record<string, string> = Object.fromEntries(
  KESIF_KAYNAKLARI.map((k) => [k.kod, k.ad]),
);

/* ── Ürünün YAPMADIĞI şeyler ────────────────────────────────────────
   Bu liste bir eksik listesi DEĞİL, bir taahhüt listesidir. Ekranda
   gösterilir çünkü OT ekibinin ilk sorusu "bu şey ağıma ne yapacak"
   olur ve cevabın yorumda değil üründe durması gerekir. */

export const AKTIF_ISLEM_YASAKLARI: readonly { islem: string; neden: string }[] = [
  {
    islem: 'Port taraması',
    neden: 'Kapalı portlara gelen bağlantı denemesi eski cihazlarda '
      + 'haberleşme yığınını kilitleyebilir.',
  },
  {
    islem: 'SNMP deneme-yanılması',
    neden: 'Topluluk adı denemek hem bir kimlik saldırısıdır hem de cihazın '
      + 'yönetim işlemcisini boğar.',
  },
  {
    islem: 'Modbus / OT protokol sorgusu',
    neden: 'Beklenmeyen bir istek saha cihazının çevrimini bozabilir; '
      + 'bedeli üretim durmasıdır.',
  },
  {
    islem: 'PLC yoklaması',
    neden: 'Kontrolörün tanı arayüzüne yapılan istek emniyet fonksiyonunu '
      + 'geciktirebilir.',
  },
  {
    islem: 'Aktif keşif paketi (broadcast / ping süpürme)',
    neden: 'Determinist OT ağında beklenmeyen yayın trafiği çevrim süresini '
      + 'kaydırır.',
  },
];

/* ── İnsan onayı akışı ──────────────────────────────────────────────── */

export const KESIF_ADIMLARI: readonly { ad: string; aciklama: string }[] = [
  { ad: 'Tespit', aciklama: 'Kurumun gözlem kaynağı cihazı görür; ürün okur.' },
  { ad: 'Eşleştirme', aciklama: 'Kayıt envanterdeki varlıklarla karşılaştırılır.' },
  { ad: 'Öneri', aciklama: 'En güçlü aday ve güven skoru hesaplanır.' },
  { ad: 'İnsan onayı', aciklama: 'Karar bir kişiye ve gerekçeye bağlanır.' },
  { ad: 'Envanter', aciklama: 'Ekle · mevcut kayda bağla · gerekçeyle yoksay.' },
];

/* ── Yedi grup ──────────────────────────────────────────────────────── */

export const KESIF_GRUPLARI = [
  'kimlik_cakismasi', 'yetkisiz', 'envanterde_yok', 'sahipsiz',
  'gorulmuyor', 'yeri_belirsiz', 'envanterde_sahipli',
] as const;
export type KesifGrubu = (typeof KESIF_GRUPLARI)[number];

export const KESIF_GRUP_ADI: Record<KesifGrubu, string> = {
  kimlik_cakismasi: 'Kimlik çakışması',
  yetkisiz: 'Yetkisiz / tanınmayan',
  envanterde_yok: 'Envanterde yok',
  sahipsiz: 'Envanterde var, SAHİBİ YOK',
  gorulmuyor: 'Artık görülmüyor',
  yeri_belirsiz: 'Yeri çözülemedi',
  envanterde_sahipli: 'Envanterde var, sahibi belli',
};

export const KESIF_GRUP_ACIKLAMASI: Record<KesifGrubu, string> = {
  kimlik_cakismasi: 'Kaydın kimlik alanları birden çok varlığa uyuyor. '
    + 'Otomatik çözülmez: iki cihazdan biri yanlış kaydedilmiş olabilir.',
  yetkisiz: 'Cihazın ağda olması gerektiğine dair bir karar yok ya da '
    + '"yetkisiz" kararı verilmiş. Envanterde karşılığı olması onu '
    + 'yetkili YAPMAZ — iki soru ayrıdır.',
  envanterde_yok: 'Gözlemde var, envanterde karşılığı bulunamadı. '
    + 'Kendiliğinden eklenmez; bir kişi karar verir.',
  sahipsiz: 'Envanterde kaydı var ama sorumlusu yok. Hesap verebilirlik '
    + 'zinciri burada kopar: kimse yamayı, yedeği ya da emekliliği üstlenmiyor.',
  gorulmuyor: 'Kayıt eşiği aşan süredir hiçbir kaynakta görülmedi. '
    + 'SİLİNMEDİ: "görülmüyor" bir gözlemdir, bir silme kararı değil.',
  yeri_belirsiz: 'Kaydın hangi santrale ait olduğu çözülemedi. '
    + 'Santralsiz kayıt gizlenmez; gizlenseydi kimse incelemezdi.',
  envanterde_sahipli: 'Gözlem envanterle örtüşüyor ve sorumlusu belli. '
    + 'Bu satırlar için yapılacak bir şey yok.',
};

/** Grubun ekran sınıfı. `envanterde_sahipli` tek "ok" olandır. */
export const KESIF_GRUP_SINIFI: Record<KesifGrubu, 'ok' | 'md' | 'bd' | 'unk' | 'pl'> = {
  kimlik_cakismasi: 'bd',
  yetkisiz: 'bd',
  envanterde_yok: 'md',
  sahipsiz: 'md',
  gorulmuyor: 'unk',
  yeri_belirsiz: 'unk',
  envanterde_sahipli: 'ok',
};

/** Gruplandırma için gereken en küçük gerçek. */
export type KesifDurusu = {
  /** Kimlik alanları birden çok varlığa uyuyor. */
  cakisma: boolean;
  /** karar_verilmedi | bilinen | yetkisiz | gerekceyle_yoksayildi */
  yetkiDurumu: string;
  /** Envanterde eşleşen bir varlık var mı. */
  eslesenVar: boolean;
  /** Eşleşen varlığın sahibi var mı; eşleşme yoksa null. */
  eslesenSahipVar: boolean | null;
  /** Kaydın santrali çözülebildi mi. */
  tesisBilinen: boolean;
  gunGorulmedi: number;
  gorunmezEsikGun: number;
};

/**
 * Bir keşif kaydının BİRİNCİL grubu.
 *
 * Gruplar dışlayıcıdır: bir kayıt tek bir gruba düşer ve sayımlar
 * toplama eşittir. Bir kayıt birden çok tarife uyabilir (sahipsiz VE
 * görülmüyor olabilir); o zaman ÖNCE YAPILACAK İŞ kazanır. Sıra:
 *
 *   çakışma → yetkisiz → envanterde yok → sahipsiz → görülmüyor →
 *   yeri belirsiz → tamam
 *
 * Gerekçe: çakışmayı çözmeden diğer hiçbir karar güvenilir değildir;
 * yetkisiz cihaz bir güvenlik sorusudur ve envanter eksiğinden önce
 * gelir; sahipsizlik, artık görülmemekten daha acildir çünkü ikincisi
 * kendiliğinden zararsızdır.
 */
export function kesifGrubu(d: KesifDurusu): KesifGrubu {
  if (d.cakisma) return 'kimlik_cakismasi';
  if (d.yetkiDurumu === 'yetkisiz') return 'yetkisiz';
  if (!d.eslesenVar) return 'envanterde_yok';
  if (d.eslesenSahipVar === false) return 'sahipsiz';
  if (d.gunGorulmedi >= d.gorunmezEsikGun) return 'gorulmuyor';
  if (!d.tesisBilinen) return 'yeri_belirsiz';
  return 'envanterde_sahipli';
}

export type KesifDagilimi = Record<KesifGrubu, number>;

export function kesifDagilimi(kayitlar: readonly KesifDurusu[]): KesifDagilimi {
  const d = Object.fromEntries(KESIF_GRUPLARI.map((g) => [g, 0])) as KesifDagilimi;
  for (const k of kayitlar) d[kesifGrubu(k)] += 1;
  return d;
}

/** Kişinin bakması gereken kayıt sayısı — "tamam" olanlar hariç. */
export function isBekleyen(d: KesifDagilimi): number {
  return KESIF_GRUPLARI
    .filter((g) => g !== 'envanterde_sahipli')
    .reduce((t, g) => t + d[g], 0);
}

export function kesifCumlesi(d: KesifDagilimi): string {
  if (d.kimlik_cakismasi > 0) {
    return `${d.kimlik_cakismasi} kaydın kimliği birden çok varlığa uyuyor; `
      + 'çakışma çözülmeden diğer kararlar güvenilir değil.';
  }
  if (d.yetkisiz > 0) {
    return `${d.yetkisiz} cihaz yetkisiz ya da tanınmıyor.`;
  }
  if (d.envanterde_yok > 0) {
    return `${d.envanterde_yok} cihaz gözlemde var, envanterde yok — `
      + 'kendiliğinden eklenmez, karar bekliyor.';
  }
  if (d.sahipsiz > 0) {
    return `${d.sahipsiz} cihazın envanterde kaydı var ama sorumlusu yok.`;
  }
  if (isBekleyen(d) === 0) {
    return 'Gözlenen bütün cihazlar envanterle örtüşüyor ve sorumlusu belli.';
  }
  return `${isBekleyen(d)} kayıt inceleme bekliyor.`;
}

import 'server-only';
import type { ZodType } from 'zod';

/* Connector sözleşmesi — her adaptörün uyduğu tek arayüz.

   Bu dosya SAHTE VERİ ÜRETMEZ ve hiçbir dış sisteme bağlanmaz. Yalnız
   adaptörlerin uyacağı sözleşmeyi, normalize edilmiş kayıt biçimini ve
   çalıştırma çekirdeğinin adaptörden ne beklediğini tanımlar.

   Gerçek bir vendor API'si bağlanana kadar o tipin adaptörü
   `baglantiYok()` döner — "çalışıyor" numarası yapmaz. Sağlık ekranı bunu
   "kimlik bilgisi bekleniyor" olarak gösterir, "başarılı" olarak değil. */

/* ═══ Normalize kayıt biçimleri ═══════════════════════════════════════
   Adaptör dış sistemin biçimini bilir; çekirdek yalnız bunları bilir. */

/** Her normalize kaydın ortak kökeni. Kaynak bilinmiyorsa kayıt üretilmez. */
export type Koken = {
  kaynakSistem: string;
  /** kaynak sistemdeki birincil anahtar — yeniden senkronizasyon idempotent olsun */
  kaynakKayitId: string;
  toplanma: Date;
  /** 0–1. null = ÖLÇÜLMEDİ; sıfır güven ile ölçülmemiş güven aynı şey değil. */
  guven: number | null;
};

export type VarlikGozlemi = {
  tip: 'varlik';
  koken: Koken;
  /** eşleme anahtarları — hiçbiri zorunlu değil, ama en az biri olmalı */
  etiket?: string | null;
  hostname?: string | null;
  seriNo?: string | null;
  macAdresi?: string | null;
  ipAdresi?: string | null;
  uretici?: string | null;
  model?: string | null;
  isletimSistemi?: string | null;
  firmware?: string | null;
  tesisKodu?: string | null;
  bolgeKodu?: string | null;
  turKodu?: string | null;
  /** ham gözlem — denetim izinin girdisi, dokunulmaz */
  ham: unknown;
};

export type ZafiyetGozlemi = {
  tip: 'zafiyet';
  koken: Koken;
  kaynakRef: string;          // CVE-…
  baslik: string;
  cvss?: number | null;
  varlikAnahtari: string;     // hostname | ip | seri | etiket
  sonTarih?: Date | null;
  ham: unknown;
};

export type YedekGozlemi = {
  tip: 'yedek';
  koken: Koken;
  varlikAnahtari: string;
  yedekZamani: Date;
  basarili: boolean;
  surum?: string | null;
  icerikHash?: string | null;
  depolamaKonumu?: string | null;
  hata?: string | null;
  ham: unknown;
};

export type ErisimGozlemi = {
  tip: 'erisim';
  koken: Koken;
  hesapAdi: string;
  hesapTipi?: string | null;
  ayricalikli?: boolean | null;
  sonKullanim?: Date | null;
  parolaRotasyon?: Date | null;
  kapsam?: string | null;
  varlikAnahtari?: string | null;
  ham: unknown;
};

export type TopolojiGozlemiGirdi = {
  tip: 'topoloji';
  koken: Koken;
  /** dugum | gecit | baglanti */
  ogeTipi: 'dugum' | 'gecit' | 'baglanti';
  anahtar: string;
  ozellikler: Record<string, unknown>;
  tesisKodu?: string | null;
  ham: unknown;
};

export type Gozlem =
  | VarlikGozlemi | ZafiyetGozlemi | YedekGozlemi | ErisimGozlemi | TopolojiGozlemiGirdi;

/* ═══ Adaptör sonuç tipleri ═══════════════════════════════════════════ */

export type BaglantiSonucu =
  | { ok: true; ayrinti: string }
  | { ok: false; hata: string; kimlikEksik?: boolean };

export type SaglikSonucu = {
  /** saglikli | bozuk | kimlik_bekleniyor | bilinmiyor */
  durum: 'saglikli' | 'bozuk' | 'kimlik_bekleniyor' | 'bilinmiyor';
  ayrinti: string;
  /** kaynak sistemdeki verinin tazeliği (dakika); null = ölçülemedi */
  tazelikDk?: number | null;
};

export type CekmeSonucu = {
  gozlemler: Gozlem[];
  /** bir sonraki delta senkronizasyonun başlayacağı imleç */
  yeniImlec: string | null;
  /** kaynak sistemde daha fazla sayfa var mı */
  devamVar: boolean;
};

export type DogrulamaSonucu = {
  gecerli: Gozlem[];
  reddedilen: { gozlem: unknown; sebep: string }[];
};

/* ═══ Adaptör arayüzü ═════════════════════════════════════════════════ */

export type AdaptorBaglami = {
  connectorId: string;
  kod: string;
  kaynakSistem: string;
  /** SIR İÇERMEZ — yalnız host/port/filtre gibi ayarlar */
  yapilandirma: Record<string, unknown>;
  /** çözülmüş sır; adaptör bunu LOGLAMAZ ve geri döndürmez */
  sir: string | null;
  /** delta senkronizasyon imleci; null = ilk koşu */
  imlec: string | null;
};

export interface Adaptor {
  readonly tip: string;
  /** Bu adaptör gerçek bir dış sisteme bağlanabiliyor mu? false ise
      çekirdek onu koşturmaz ve sağlık ekranında "kimlik bekleniyor" yazar. */
  readonly baglanabilir: boolean;
  /**
   * Bu adaptörün kabul ettiği yapılandırma şeması.
   *
   * NEDEN sözleşmede: yanlış yapılandırma bugün ancak İLK KOŞUDA
   * anlaşılıyor — kurulum hatası üretimde bir başarısız koşu olarak ortaya
   * çıkıyor. Şema hatayı kayıt anına çeker. Ayrıca PASSIVE-FIRST kısıtları
   * (aktif sorgulama/tarama/müdahale izni) şemada durur: adaptör
   * gövdesindeki bir `if` unutulabilir, şema unutulamaz.
   *
   * Şemalar GEVŞEKTİR (`z.looseObject`): çekirdek kendi anahtarlarını
   * (tesisKodu, kapsamTesisKodlari) aynı nesnede taşır ve kaynak sürüm
   * atlayınca yeni ayar gelebilir.
   */
  readonly yapilandirmaSemasi: ZodType;
  /**
   * Bu adaptörün çalışması için gereken sır REFERANSLARI (değerleri değil):
   * ör. `['env:ENTRA_ISTEMCI_SIRRI']`. Boş dizi = hiç sır gerekmiyor.
   * Sertifikasyon ve sağlık ekranı, sırrı ÇÖZMEDEN `sirVarMi()` ile
   * varlığını sorar; `bilinmiyor` yanıtı `yok` ile karıştırılmaz.
   */
  readonly gerekenSirlar: string[];

  testConnection(b: AdaptorBaglami): Promise<BaglantiSonucu>;
  /** kaynak sistemdeki kapsamı keşfeder (kaç kayıt, hangi alanlar) */
  discover(b: AdaptorBaglami): Promise<{ ozet: string; tahminiKayit: number | null }>;
  /** delta çekim; `since` imleci adaptörün yorumuna bırakılır */
  fetchChanges(b: AdaptorBaglami): Promise<CekmeSonucu>;
  /** dış biçimi normalize kayda çevirir */
  normalize(ham: unknown[], b: AdaptorBaglami): Gozlem[];
  /** iş kuralı doğrulaması — geçersiz kayıt SESSİZCE ATILMAZ, reddedilenlere yazılır */
  validate(gozlemler: Gozlem[]): DogrulamaSonucu;
  health(b: AdaptorBaglami): Promise<SaglikSonucu>;
}

/* ═══ Bağlanmamış adaptör temeli ══════════════════════════════════════
   Gerçek credential/API olmadan tamamlanamayan tipler bunu genişletir.
   Uydurma veri döndürmek yerine açıkça "bağlı değil" der. */

export abstract class BaglanmamisAdaptor implements Adaptor {
  abstract readonly tip: string;
  readonly baglanabilir = false;
  /* Bağlanmamış adaptör de bunları BEYAN EDER: hangi ayarların geçerli
     olduğu ve hangi sırların isteneceği, bağlantı gelmeden önce bilinen ve
     denetlenebilir olması gereken şeylerdir. Varsayılan verilmez —
     varsayılan, "sır gerekmiyor" gibi yanlış bir beyan üretirdi. */
  abstract readonly yapilandirmaSemasi: ZodType;
  abstract readonly gerekenSirlar: string[];
  /** bu tipin gerçekten bağlanması için ne gerekiyor — sağlık ekranı gösterir */
  abstract readonly gereken: string;

  async testConnection(): Promise<BaglantiSonucu> {
    return { ok: false, kimlikEksik: true, hata: `Bağlı değil — gereken: ${this.gereken}` };
  }
  async discover(): Promise<{ ozet: string; tahminiKayit: number | null }> {
    return { ozet: `Bağlı değil — gereken: ${this.gereken}`, tahminiKayit: null };
  }
  async fetchChanges(): Promise<CekmeSonucu> {
    // Boş liste "hiç kayıt yok" demektir; burada kastedilen o DEĞİL.
    throw new Error(`${this.tip}: dış sistem bağlı değil — gereken: ${this.gereken}`);
  }
  normalize(): Gozlem[] { return []; }
  validate(gozlemler: Gozlem[]): DogrulamaSonucu {
    return { gecerli: gozlemler, reddedilen: [] };
  }
  async health(): Promise<SaglikSonucu> {
    return {
      durum: 'kimlik_bekleniyor',
      ayrinti: `Bağlı değil — gereken: ${this.gereken}`,
      tazelikDk: null,
    };
  }
}

/* ═══ Ortak doğrulama yardımcıları ════════════════════════════════════ */

/** Bir varlık gözleminin eşleşebilmesi için en az bir kimlik anahtarı şart. */
export function varlikAnahtarlari(g: VarlikGozlemi): { alan: string; deger: string }[] {
  const c: { alan: string; deger: string }[] = [];
  if (g.seriNo) c.push({ alan: 'seri', deger: g.seriNo.trim().toUpperCase() });
  if (g.macAdresi) c.push({ alan: 'mac', deger: g.macAdresi.trim().toUpperCase().replace(/[-.]/g, ':') });
  if (g.etiket) c.push({ alan: 'etiket', deger: g.etiket.trim().toUpperCase() });
  if (g.hostname) c.push({ alan: 'hostname', deger: g.hostname.trim().toLowerCase() });
  if (g.ipAdresi) c.push({ alan: 'ip', deger: g.ipAdresi.trim() });
  return c;
}

/** Genel doğrulama: köken eksikse kayıt reddedilir — kaynağı bilinmeyen
    veri "otomatik" sayılamaz (provenance sözleşmesi). */
export function temelDogrula(gozlemler: Gozlem[]): DogrulamaSonucu {
  const gecerli: Gozlem[] = [];
  const reddedilen: { gozlem: unknown; sebep: string }[] = [];
  for (const g of gozlemler) {
    if (!g.koken?.kaynakSistem || !g.koken?.kaynakKayitId) {
      reddedilen.push({ gozlem: g, sebep: 'köken eksik (kaynakSistem/kaynakKayitId)' });
      continue;
    }
    if (g.tip === 'varlik' && varlikAnahtarlari(g).length === 0) {
      reddedilen.push({ gozlem: g, sebep: 'eşleme anahtarı yok (seri/mac/etiket/hostname/ip)' });
      continue;
    }
    gecerli.push(g);
  }
  return { gecerli, reddedilen };
}

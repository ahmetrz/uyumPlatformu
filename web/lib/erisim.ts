import 'server-only';
import { redirect } from 'next/navigation';
import { aktifKullanici, type AktifKullanici } from './auth';
import { DEMO } from './demo';

/* RBAC + kapsam: yetki yalnız ekranda değil, VERİ seviyesinde uygulanır.
   Her server action yazmadan önce yetkiZorunlu çağırır; her sayfa sorgusu
   izinliTesisIdleri ile daraltılır. Kapsam alanı null = "tümü". */

export type Modul = 'uyum' | 'envanter' | 'risk' | 'denetim' | 'proje' | 'tanimlar' | 'yonetim';
export type Islem = 'okuma' | 'yazma' | 'onay';

/* Çekirdek rollerin izinleri KODDADIR ve tek kaynaktır. Paketin rol
   ÖNERİSİ (`RolKatalogu`, P4 · 2.3) buraya girmez: katalog öneri ve ekran
   içindir, çalışma zamanı yetkisi onu okumaz (koda bağlanması P2/P6
   kararı). Dışa açıldı: bekçi (`tests/bekci/rol-sabitleri.test.ts`) paket
   biçiminin modül · işlem · çekirdek rol sabitlerini buna karşı ölçer. */
export const ROL_IZINLERI: Record<string, Partial<Record<Modul, Islem[]>>> = {
  yonetici: { uyum: ['okuma', 'yazma', 'onay'], envanter: ['okuma', 'yazma', 'onay'],
    risk: ['okuma', 'yazma', 'onay'], denetim: ['okuma', 'yazma', 'onay'],
    proje: ['okuma', 'yazma', 'onay'], tanimlar: ['okuma', 'yazma', 'onay'],
    yonetim: ['okuma', 'yazma', 'onay'] },
  denetim_sorumlusu: { uyum: ['okuma', 'yazma', 'onay'], denetim: ['okuma', 'yazma', 'onay'],
    risk: ['okuma', 'yazma'], proje: ['okuma', 'yazma'], envanter: ['okuma'], tanimlar: ['okuma'] },
  tesis_yoneticisi: { uyum: ['okuma', 'yazma'], envanter: ['okuma', 'yazma'],
    risk: ['okuma', 'yazma'], denetim: ['okuma'], proje: ['okuma', 'yazma'], tanimlar: ['okuma'] },
  bt_yoneticisi: { uyum: ['okuma', 'yazma'], envanter: ['okuma', 'yazma'],
    risk: ['okuma', 'yazma'], proje: ['okuma', 'yazma'], tanimlar: ['okuma'] },
  ot_yoneticisi: { uyum: ['okuma', 'yazma'], envanter: ['okuma', 'yazma'],
    risk: ['okuma', 'yazma'], proje: ['okuma', 'yazma'], tanimlar: ['okuma'] },
  risk_sahibi: { risk: ['okuma', 'yazma'], uyum: ['okuma'] },
  katkici: { uyum: ['okuma', 'yazma'], envanter: ['okuma'], risk: ['okuma'],
    denetim: ['okuma'], proje: ['okuma'], tanimlar: ['okuma'] },
  dis_denetci: { denetim: ['okuma'], uyum: ['okuma'] },
  okuyucu: { uyum: ['okuma'], envanter: ['okuma'], risk: ['okuma'],
    denetim: ['okuma'], proje: ['okuma'], tanimlar: ['okuma'], yonetim: ['okuma'] },
};

/* ── KAPSAM EKSENİ KAPSAM ÖĞESİDİR (B1) ──────────────────────────────
   Yetki bir kapsam öğesine verilir (tesis, kurum, ileride sistem…).
   `kapsamOgesiId` birincil eksendir; `tesisId` KÖPRÜDÜR: tesis tabanlı
   tablolar (varlık, risk, olay) tesis kimliğiyle sorar ve yetkinin
   öğesi o tesise köprülüyse uyar. Köprü, yetkinin kendisi değildir —
   kurum öğesine yetkili biri, kurumun tesis kaydına da yetkilidir çünkü
   öğe ona köprülüdür; başka bir tesise değil. */
export type Kapsam = {
  kapsamOgesiId?: string | null; tesisId?: string | null;
  surecId?: string | null; regulasyonId?: string | null;
};

function kapsamUyar(y: AktifKullanici['yetkiler'][number], kapsam: Kapsam): boolean {
  /* Öğesi YA DA köprüsü olan yetki kısıtlıdır: köprü tek başına gelmişse
     (bellek içi nesne) yetki yine tesise kısıtlıdır — "öğe yok" demek
     "sınırsız" demek değildir. */
  if (y.kapsamOgesiId || y.tesisId) {
    const ogeSoruldu = kapsam.kapsamOgesiId !== undefined;
    const tesisSoruldu = kapsam.tesisId !== undefined;
    // öğeye kısıtlı rol, kapsamsız (global) işlem yapamaz
    if (!ogeSoruldu && !tesisSoruldu) return false;
    if (ogeSoruldu && kapsam.kapsamOgesiId && y.kapsamOgesiId !== kapsam.kapsamOgesiId) return false;
    if (tesisSoruldu && kapsam.tesisId && y.tesisId !== kapsam.tesisId) return false;
  }
  if (y.surecId && kapsam.surecId && y.surecId !== kapsam.surecId) return false;
  if (y.regulasyonId && kapsam.regulasyonId && y.regulasyonId !== kapsam.regulasyonId) return false;
  return true;
}

export function izinVar(k: AktifKullanici, modul: Modul, islem: Islem, kapsam: Kapsam = {}): boolean {
  return k.yetkiler.some((y) => {
    if (y.modul && y.modul !== modul) return false;
    if (!ROL_IZINLERI[y.rol]?.[modul]?.includes(islem)) return false;
    return kapsamUyar(y, kapsam);
  });
}

/** Sayfa koruması: oturum yoksa girişe yönlendirir. */
export async function girisZorunlu(): Promise<AktifKullanici> {
  const k = await aktifKullanici();
  if (!k) redirect('/giris');
  return k;
}

/** İKİ AŞAMALI KAPI için ön kapsam. Kaydın tesisi/süreci okunmadan
    bilinemeyen eylemlerde (bulgu güncelle, aksiyon ekle/durum/doğrula)
    `yetkiZorunlu(modul, islem, KAPSAM_SONRA)` yalnız oturum + demo kilidi
    + "bu modülde bu işlem için BİR rolü var mı" sorusunu yanıtlar; tesise
    kısıtlı rolü peşinen reddetmez (kapsamsız `{}` çağrı `kapsamUyar`
    gereği reddederdi — ekran "yazabilirsin" derken sunucu "yetkin yok"
    diyordu). Çağıran, kaydı okuduktan sonra GERÇEK kapsamla
    `izinVar(k, modul, islem, { kapsamOgesiId, surecId })` denetimini
    yapmak ZORUNDADIR; bu sabit tek başına bir yetki kapısı değildir. */
export const KAPSAM_SONRA: Kapsam = { kapsamOgesiId: null, tesisId: null, surecId: null };

/**
 * İKİ AŞAMALI KAPININ İKİNCİ AŞAMASI. `KAPSAM_SONRA` ile açılan ön kapıyı
 * kapatan tek yer burasıdır; çağrılmazsa kapı açık kalır.
 *
 * Kaydın gerçek kapsamıyla denetler. **Kapsamı olmayan kayıt kapsamsız
 * sorulur** — yani `{}` ile — ve `kapsamUyar` gereği tesise kısıtlı rol
 * orada reddedilir. Bu dal olmasaydı ön kapıyı gevşetmek doğrudan bir
 * YETKİ YÜKSELTMESİ olurdu: tesise kısıtlı bir rol, tesis alanını boş
 * bırakarak kurumsal kayıt açabilirdi.
 *
 * Çağıranların hepsi aynı biçimi kullansın diye buradadır; kalıp dosya
 * dosya kopyalandığında biri "kayıt kapsamsızsa denetimi atla" diye
 * yazıyor ve delik oradan açılıyordu.
 */
export function kapsamZorunlu(
  k: AktifKullanici, modul: Modul, islem: Islem,
  kapsam: Kapsam, mesaj: string,
): void {
  const soru: Kapsam = {};
  if (kapsam.kapsamOgesiId) soru.kapsamOgesiId = kapsam.kapsamOgesiId;
  if (kapsam.tesisId) soru.tesisId = kapsam.tesisId;
  if (kapsam.surecId) soru.surecId = kapsam.surecId;
  if (kapsam.regulasyonId) soru.regulasyonId = kapsam.regulasyonId;
  if (!izinVar(k, modul, islem, soru)) throw new Error(mesaj);
}

/** Eylem koruması: yetki yoksa fırlatır — eylem katmanı hata olarak döndürür. */
export async function yetkiZorunlu(modul: Modul, islem: Islem, kapsam: Kapsam = {}): Promise<AktifKullanici> {
  const k = await aktifKullanici();
  if (!k) throw new Error('Oturum gerekli');
  if (DEMO && islem !== 'okuma') throw new Error('Demo sürümü: değişiklik kaydedilmez.');
  if (!izinVar(k, modul, islem, kapsam))
    throw new Error(`Bu işlem için yetkiniz yok (${modul}/${islem})`);
  return k;
}

function okumaYetkileri(k: AktifKullanici, modul: Modul) {
  return k.yetkiler.filter((y) =>
    (!y.modul || y.modul === modul) && ROL_IZINLERI[y.rol]?.[modul]?.includes('okuma'));
}

/** Veri daraltma: kullanıcının modül için görebildiği KAPSAM ÖĞESİ kümesi.
    null = tümü; [] = hiçbiri. Omurga sorguları (madde durumu, kapsam,
    istisna, kanıt bağı) bununla süzülür. */
export function izinliKapsamOgesiIdleri(k: AktifKullanici, modul: Modul): string[] | null {
  const ilgili = okumaYetkileri(k, modul);
  if (ilgili.length === 0) return [];
  if (ilgili.some(kisitsiz)) return null;
  return [...new Set(ilgili.map((y) => y.kapsamOgesiId).filter((x): x is string => !!x))];
}

/** Ne öğesi ne köprüsü olan yetki sınırsızdır. */
const kisitsiz = (y: AktifKullanici['yetkiler'][number]) => !y.kapsamOgesiId && !y.tesisId;

/** Veri daraltma — TESİS köprüsü: öğeye kısıtlı yetkinin köprülü tesisi.
    Tesis tabanlı tablolar (varlık, risk, olay, ağ bölgesi) bununla
    süzülür. Öğesi tesise köprülü OLMAYAN bir yetki (ileride: sistem,
    iş fonksiyonu) hiçbir tesisi görmez — [] döner, null değil; "tesis
    görmüyor" ile "hepsini görüyor" aynı şey değildir. */
export function izinliTesisIdleri(k: AktifKullanici, modul: Modul): string[] | null {
  const ilgili = okumaYetkileri(k, modul);
  if (ilgili.length === 0) return [];
  if (ilgili.some(kisitsiz)) return null;
  return [...new Set(ilgili.map((y) => y.tesisId).filter((x): x is string => !!x))];
}

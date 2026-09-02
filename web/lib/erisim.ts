import 'server-only';
import { redirect } from 'next/navigation';
import { aktifKullanici, type AktifKullanici } from './auth';
import { DEMO } from './demo';

/* RBAC + kapsam: yetki yalnız ekranda değil, VERİ seviyesinde uygulanır.
   Her server action yazmadan önce yetkiZorunlu çağırır; her sayfa sorgusu
   izinliTesisIdleri ile daraltılır. Kapsam alanı null = "tümü". */

export type Modul = 'uyum' | 'envanter' | 'risk' | 'denetim' | 'proje' | 'tanimlar' | 'yonetim';
export type Islem = 'okuma' | 'yazma' | 'onay';

const ROL_IZINLERI: Record<string, Partial<Record<Modul, Islem[]>>> = {
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

export type Kapsam = { tesisId?: string | null; surecId?: string | null; regulasyonId?: string | null };

function kapsamUyar(y: AktifKullanici['yetkiler'][number], kapsam: Kapsam): boolean {
  if (y.tesisId && kapsam.tesisId && y.tesisId !== kapsam.tesisId) return false;
  if (y.tesisId && kapsam.tesisId === undefined) return false; // tesise kısıtlı rol, kapsamsız (global) işlem yapamaz
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

/** İKİ AŞAMALI KAPI için ön kapsam. Kaydın santrali/süreci okunmadan
    bilinemeyen eylemlerde (bulgu güncelle, aksiyon ekle/durum/doğrula)
    `yetkiZorunlu(modul, islem, KAPSAM_SONRA)` yalnız oturum + demo kilidi
    + "bu modülde bu işlem için BİR rolü var mı" sorusunu yanıtlar; tesise
    kısıtlı rolü peşinen reddetmez (kapsamsız `{}` çağrı `kapsamUyar`
    gereği reddederdi — ekran "yazabilirsin" derken sunucu "yetkin yok"
    diyordu). Çağıran, kaydı okuduktan sonra GERÇEK kapsamla
    `izinVar(k, modul, islem, { tesisId, surecId })` denetimini yapmak
    ZORUNDADIR; bu sabit tek başına bir yetki kapısı değildir. */
export const KAPSAM_SONRA: Kapsam = { tesisId: null, surecId: null };

/** Eylem koruması: yetki yoksa fırlatır — eylem katmanı hata olarak döndürür. */
export async function yetkiZorunlu(modul: Modul, islem: Islem, kapsam: Kapsam = {}): Promise<AktifKullanici> {
  const k = await aktifKullanici();
  if (!k) throw new Error('Oturum gerekli');
  if (DEMO && islem !== 'okuma') throw new Error('Demo sürümü: değişiklik kaydedilmez.');
  if (!izinVar(k, modul, islem, kapsam))
    throw new Error(`Bu işlem için yetkiniz yok (${modul}/${islem})`);
  return k;
}

/** Veri daraltma: kullanıcının modül için görebildiği tesis kümesi.
    null = tüm tesisler; [] = hiçbiri. */
export function izinliTesisIdleri(k: AktifKullanici, modul: Modul): string[] | null {
  const ilgili = k.yetkiler.filter((y) =>
    (!y.modul || y.modul === modul) && ROL_IZINLERI[y.rol]?.[modul]?.includes('okuma'));
  if (ilgili.length === 0) return [];
  if (ilgili.some((y) => !y.tesisId)) return null;
  return [...new Set(ilgili.map((y) => y.tesisId!))];
}

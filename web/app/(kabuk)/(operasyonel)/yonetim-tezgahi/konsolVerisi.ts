import 'server-only';
import { db } from '@/lib/db';
import { izinVar } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { tumAyarlar } from '@/lib/yapilandirma/oku';
import { GORSEL_ANAHTARLARI } from '@/lib/gorsel';
import {
  KONSOL_VARLIK_TIPLERI, type KonsolKayit, type KonsolVerisi, type Talep, type TalepDurumu,
} from './konsolOrtak';

/* Yönetim konsolu veri katmanı. Kapı: yonetim/okuma yoksa HİÇ sorgu
   koşmaz (çağıran sayfa kontrol eder). Sayımlar Prisma COUNT'tur —
   ölçülmüş sıfır; ölçülmeyen yer `null` taşır. */

const GECMIS_TAVANI = 300;

export async function konsolVerisi(kullanici: AktifKullanici, simdi: number): Promise<KonsolVerisi> {
  const [ayarlar, talepler, gruplar, tuzelKisiler, uniteler, turler, bolgeler, kurallar, tesisler,
    regulasyonlar, gecmis] = await Promise.all([
    tumAyarlar(),
    db.degisiklikTalebi.findMany({ orderBy: { olusturuldu: 'desc' }, take: 200 }),
    db.grup.findMany({ include: { _count: { select: { tuzelKisiler: true } } }, orderBy: { kod: 'asc' } }),
    db.tuzelKisi.findMany({ include: { grup: true, _count: { select: { tesisler: true, yetkiler: true } } },
      orderBy: { kod: 'asc' } }),
    db.uretimUnitesi.findMany({ include: { tesis: true, _count: { select: { varliklar: true, sistemler: true } } },
      orderBy: [{ tesis: { kod: 'asc' } }, { kod: 'asc' }] }),
    db.varlikTuru.findMany({ include: { _count: { select: { varliklar: true } } }, orderBy: { kod: 'asc' } }),
    db.agBolgesi.findMany({ include: { tesis: true,
      _count: { select: { varliklar: true, kaynakGecitler: true, hedefGecitler: true } } }, orderBy: { kod: 'asc' } }),
    db.uygulanabilirlikKurali.findMany({ include: { regulasyon: true, _count: { select: { kararlar: true } } },
      orderBy: [{ regulasyon: { kod: 'asc' } }, { ad: 'asc' }] }),
    db.tesis.findMany({ select: { id: true, kod: true, ad: true, gorselAnahtari: true, durum: true },
      orderBy: { kod: 'asc' } }),
    db.regulasyon.findMany({ select: { id: true, kod: true, ad: true }, orderBy: { kod: 'asc' } }),
    db.aktiviteKaydi.findMany({
      where: { varlikTipi: { in: [...KONSOL_VARLIK_TIPLERI] } },
      include: { aktor: { select: { adSoyad: true } } },
      orderBy: { zaman: 'desc' }, take: GECMIS_TAVANI }),
  ]);

  /* Aktör adları: DegisiklikTalebi kimlikleri ilişkisiz saklar (şema
     bilinçli); adlar tek sorguyla çözülür. */
  const kimlikler = new Set<string>();
  for (const t of talepler) for (const id of [t.talepEdenId, t.onaylayanId, t.uygulayanId, t.inceleyenId]) if (id) kimlikler.add(id);
  for (const a of ayarlar) if (a.guncelleyenId) kimlikler.add(a.guncelleyenId);
  const kisiler = kimlikler.size
    ? await db.kullanici.findMany({ where: { id: { in: [...kimlikler] } }, select: { id: true, adSoyad: true } }) : [];
  const ad = (id: string | null | undefined) => (id ? kisiler.find((k) => k.id === id)?.adSoyad ?? 'bilinmeyen kullanıcı' : null);

  const acikTalepSayisi = (hedefTipi: string, hedefId: string) =>
    talepler.filter((t) => t.hedefTipi === hedefTipi && t.hedefId === hedefId && ['incelemede', 'onaylandi'].includes(t.durum)).length;

  const kayitlar: Record<string, KonsolKayit[]> = {
    grup: gruplar.map((g) => ({
      id: g.id, kod: g.kod, ad: g.ad, durum: 'ok', bagli: g._count.tuzelKisiler,
      alt: `${g._count.tuzelKisiler} tüzel kişi`, degerler: { kod: g.kod, ad: g.ad } })),
    tuzelKisi: tuzelKisiler.map((t) => ({
      id: t.id, kod: t.kod, ad: t.ad, durum: 'ok', bagli: t._count.tesisler,
      alt: `${t.grup.kod} · ${t._count.tesisler} santral · ${t._count.yetkiler} yetki`,
      degerler: { kod: t.kod, ad: t.ad, grupId: t.grupId, vergiNo: t.vergiNo ?? '' } })),
    uretimUnitesi: uniteler.map((u) => ({
      id: u.id, kod: `${u.tesis.kod}/${u.kod}`, ad: u.ad,
      durum: u.durum === 'devre_disi' ? 'pl' : u.durum === 'bakim' ? 'md' : 'ok',
      pasif: u.durum === 'devre_disi', bagli: u._count.varliklar,
      alt: `${u.tesis.ad} · ${u.kuruluGucMw !== null ? `${u.kuruluGucMw} MW` : 'güç bilinmiyor'} · ${u._count.varliklar} varlık`,
      degerler: { tesisId: u.tesisId, kod: u.kod, ad: u.ad, kuruluGucMw: u.kuruluGucMw ?? '', durum: u.durum } })),
    varlikTuru: turler.map((v) => ({
      id: v.id, kod: v.kod, ad: v.ad, durum: v.aktif ? 'ok' : 'pl', pasif: !v.aktif, bagli: v._count.varliklar,
      alt: `${v.sinif} · ${v._count.varliklar} varlık`,
      degerler: { kod: v.kod, ad: v.ad, sinif: v.sinif, aktif: v.aktif } })),
    agBolgesi: bolgeler.map((b) => ({
      id: b.id, kod: b.kod, ad: b.ad, durum: 'ok', bagli: b._count.varliklar,
      alt: `${b.tip}${b.guvenlikSeviyesi !== null ? ` · Purdue ${b.guvenlikSeviyesi}` : ''} · ${b.tesis?.kod ?? 'kurumsal'} · ${b._count.varliklar} varlık · ${b._count.kaynakGecitler + b._count.hedefGecitler} geçit`,
      degerler: { kod: b.kod, ad: b.ad, tip: b.tip, tesisId: b.tesisId ?? '', guvenlikSeviyesi: b.guvenlikSeviyesi ?? '' } })),
    uygulanabilirlikKurali: kurallar.map((k) => {
      const acik = acikTalepSayisi('uygulanabilirlikKurali', k.id);
      return {
        id: k.id, kod: `${k.regulasyon.kod} · v${k.surum}`, ad: k.ad,
        durum: acik > 0 ? 'md' : k.aktif ? 'ok' : 'pl', pasif: !k.aktif, bagli: k._count.kararlar,
        alt: `${k._count.kararlar} kapsam kararı${acik > 0 ? ` · ${acik} açık talep` : ''}${k.aktif ? '' : ' · pasif'}`,
        degerler: { regulasyonId: k.regulasyonId, ad: k.ad, kosulJson: k.kosulJson, aciklama: k.aciklama ?? '', aktif: k.aktif },
      };
    }),
    tesisGorsel: tesisler.map((t) => ({
      id: t.id, kod: t.kod, ad: t.ad,
      durum: t.gorselAnahtari ? (GORSEL_ANAHTARLARI.includes(t.gorselAnahtari) ? 'ok' : 'bd') : 'unk',
      bagli: null, pasif: t.durum === 'kapali',
      alt: t.gorselAnahtari
        ? (GORSEL_ANAHTARLARI.includes(t.gorselAnahtari) ? `görsel: ${t.gorselAnahtari}` : `katalogda olmayan anahtar: ${t.gorselAnahtari}`)
        : 'görsel yok — tipografik plaka',
      degerler: { gorselAnahtari: t.gorselAnahtari ?? '' } })),
  };

  const talepListesi: Talep[] = talepler.map((t) => ({
    id: t.id, hedefTipi: t.hedefTipi, hedefId: t.hedefId, hedefEtiket: t.hedefEtiket,
    once: t.onceJson ? JSON.parse(t.onceJson) as Record<string, unknown> : null,
    sonra: JSON.parse(t.sonraJson) as Record<string, unknown>,
    etki: t.etkiJson ? JSON.parse(t.etkiJson) as Talep['etki'] : null,
    gerekce: t.gerekce, durum: t.durum as TalepDurumu,
    talepEden: { id: t.talepEdenId, ad: ad(t.talepEdenId) ?? 'bilinmeyen kullanıcı' },
    onaylayan: ad(t.onaylayanId), uygulayan: ad(t.uygulayanId), inceleyen: ad(t.inceleyenId),
    redNedeni: t.redNedeni,
    olusturuldu: t.olusturuldu.toISOString(),
    onaylandi: t.onaylandi?.toISOString() ?? null,
    uygulandi: t.uygulandi?.toISOString() ?? null,
  }));

  return {
    aktifId: kullanici.id,
    simdi,
    izin: {
      okuma: izinVar(kullanici, 'yonetim', 'okuma'),
      yazma: izinVar(kullanici, 'yonetim', 'yazma'),
      onay: izinVar(kullanici, 'yonetim', 'onay'),
    },
    ayarlar: ayarlar.map((a) => ({
      anahtar: a.anahtar, deger: a.deger, kaynak: a.kaynak,
      guncellendi: a.guncellendi?.toISOString() ?? null,
      guncelleyen: ad(a.guncelleyenId),
    })),
    talepler: talepListesi,
    kayitlar,
    secenekler: {
      tesis: tesisler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad })),
      grup: gruplar.map((g) => ({ id: g.id, kod: g.kod, ad: g.ad })),
      tuzelKisi: tuzelKisiler.map((t) => ({ id: t.id, kod: t.kod, ad: t.ad })),
      regulasyon: regulasyonlar,
      gorsel: GORSEL_ANAHTARLARI.map((g) => ({ id: g, ad: g })),
    },
    gecmis: gecmis.map((g) => ({
      id: g.id, zaman: g.zaman.toISOString(), aktor: g.aktor?.adSoyad ?? null,
      varlikTipi: g.varlikTipi, varlikId: g.varlikId, eylem: g.eylem, alan: g.alan,
      once: g.oncekiDeger, sonra: g.yeniDeger, gerekce: g.gerekce,
    })),
  };
}

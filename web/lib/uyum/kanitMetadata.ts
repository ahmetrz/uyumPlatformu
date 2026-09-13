/* ═══════════════════════════════════════════════════════════════════════
   UY-12 · Kanıt metadata — SAF KARAR

   Kanıt kaydı bir dosya adı ve bir tipten ibaretti. Denetimde sorulan
   soruların hiçbiri o kayıttan cevaplanamıyordu:

     · Bu kanıt ne zamana kadar geçerli? (tarih vardı ama yazan yoktu)
     · Kim sahibi? (yükleyen ≠ sahip; ikisi ayrı sorulardır)
     · Nereden geldi? (elle mi, bir sistemden mi)
     · Geçen sene de böyle miydi? (sürüm sayacı vardı, kimse artırmıyordu)
     · Kabul edildi mi? (geçerlilik TARİHİ ile kabul DURUMU karıştırılıyordu)

   Bu dosya veritabanı ve React bilmez.

   ── TARİH BİR DURUM DEĞİLDİR ──────────────────────────────────────────
   `gecerliBitis` "ne zamana kadar geçerli" der. `durum` "kabul edildi mi"
   der. İkisini tek alana sıkıştırmak, REDDEDİLMİŞ bir kanıtı süresi
   dolana kadar geçerli göstermek olurdu — ve reddedilmiş bir kanıta
   dayanan "uyumlu" kararı denetimde en pahalı bulgudur. */

/** Şemadaki `Kanit.tip` yorumuyla BİREBİR — burada uydurma tip açılmaz.
    Saf modülde durur çünkü `'use server'` dosyaları YALNIZ async fonksiyon
    dışa aktarabilir; sabit oraya konulursa derleme kırılır. */
export const KANIT_TIPLERI = [
  'politika', 'kayit', 'konfigurasyon', 'ekran_goruntusu', 'rapor', 'log',
  'bilet', 'onay', 'test_sonucu', 'egitim_kaydi', 'sozlesme', 'ag_semasi',
] as const;
export type KanitTipi = (typeof KANIT_TIPLERI)[number];

export const KANIT_TIP_ETIKETI: Record<KanitTipi, string> = {
  politika: 'Politika / prosedür', kayit: 'Kayıt', konfigurasyon: 'Konfigürasyon',
  ekran_goruntusu: 'Ekran görüntüsü', rapor: 'Rapor', log: 'Günlük (log)',
  bilet: 'Bilet / talep', onay: 'Onay', test_sonucu: 'Test sonucu',
  egitim_kaydi: 'Eğitim kaydı', sozlesme: 'Sözleşme', ag_semasi: 'Ağ şeması',
};

export const KANIT_DURUMLARI = ['taslak', 'gecerli', 'reddedildi', 'arsivlendi'] as const;
export type KanitDurumu = (typeof KANIT_DURUMLARI)[number];

export const KANIT_DURUM_ETIKETI: Record<KanitDurumu, string> = {
  taslak: 'taslak · henüz kanıt sayılmaz',
  gecerli: 'geçerli',
  reddedildi: 'reddedildi',
  arsivlendi: 'arşivlendi',
};

export const GIZLILIK_DUZEYLERI = ['acik', 'kurumsal', 'gizli', 'ot_hassas'] as const;
export type GizlilikDuzeyi = (typeof GIZLILIK_DUZEYLERI)[number];

export const GIZLILIK_ETIKETI: Record<GizlilikDuzeyi, string> = {
  acik: 'Açık', kurumsal: 'Kurumsal', gizli: 'Gizli',
  ot_hassas: 'OT hassas — saha güvenliği',
};

/* ── Tazelik ─────────────────────────────────────────────────────────── */

export const TAZELIK_UYARI_GUN = 30;

export type TazelikDurumu = 'gecerli' | 'yaklasiyor' | 'doldu' | 'suresiz' | 'baslamadi';

export const TAZELIK_SOZU: Record<TazelikDurumu, string> = {
  gecerli: 'geçerli',
  yaklasiyor: 'süresi yaklaşıyor',
  doldu: 'süresi doldu',
  /* Süresiz kanıt bir KUSUR DEĞİLDİR (bir sözleşme metni yıllarca
     geçerli olabilir) ama "ölçülmüş tazelik" de değildir; ayrı yazılır. */
  suresiz: 'bitiş tarihi girilmedi',
  baslamadi: 'geçerlilik henüz başlamadı',
};

export const TAZELIK_SINIFI: Record<TazelikDurumu, 'ok' | 'md' | 'bd' | 'unk'> = {
  gecerli: 'ok', yaklasiyor: 'md', doldu: 'bd', suresiz: 'unk', baslamadi: 'unk',
};

export function tazelikDurumu(o: {
  baslangic: number | null;
  bitis: number | null;
  simdi: number;
  uyariGun?: number;
}): TazelikDurumu {
  if (o.baslangic !== null && o.baslangic > o.simdi) return 'baslamadi';
  if (o.bitis === null) return 'suresiz';
  if (o.bitis <= o.simdi) return 'doldu';
  const esik = (o.uyariGun ?? TAZELIK_UYARI_GUN) * 86_400_000;
  return o.bitis - o.simdi <= esik ? 'yaklasiyor' : 'gecerli';
}

/* ── Kanıt gücü ──────────────────────────────────────────────────────── */

export type KanitGucu = 'kanit_degil' | 'zayif' | 'orta' | 'guclu';

export const GUC_SOZU: Record<KanitGucu, string> = {
  kanit_degil: 'kanıt sayılmaz',
  zayif: 'zayıf — kaynağı ve bütünlüğü yok',
  orta: 'orta — kaynağı belli',
  guclu: 'güçlü — otomatik toplanmış ve bütünlüğü damgalı',
};

/**
 * Bir kanıtın DENETİMDEKİ ağırlığı.
 *
 * Bu bir puan değil bir SINIFLAMADIR ve tek bir sayıya indirilmez:
 * "yüzde 70 güçlü kanıt" cümlesi hiçbir şey ifade etmez. Denetçinin
 * sorduğu üç şey vardır ve üçü ayrı ayrı sorulur — nereden geldi
 * (kaynak), değişti mi (özet), kim topladı (otomatik/elle).
 *
 * TASLAK ve REDDEDİLMİŞ kanıt hiç tartılmaz: `kanit_degil`. Geçerlilik
 * süresi dolmuş kanıt da öyledir — tazelik ayrı ölçülür ama süresi
 * dolmuş bir belgeye dayanarak "uyumlu" denemez.
 */
export function kanitGucu(k: {
  durum: string;
  otomatik: boolean;
  dosyaHash: string | null;
  kaynakSistem: string | null;
  tazelik: TazelikDurumu;
}): KanitGucu {
  if (k.durum !== 'gecerli') return 'kanit_degil';
  if (k.tazelik === 'doldu' || k.tazelik === 'baslamadi') return 'kanit_degil';
  if (k.otomatik && k.dosyaHash) return 'guclu';
  if (k.kaynakSistem || k.dosyaHash) return 'orta';
  return 'zayif';
}

/* ── Sürüm ───────────────────────────────────────────────────────────── */

export type SurumKarari =
  | { yeniSurum: true; sebep: string }
  | { yeniSurum: false; sebep: string };

/**
 * Bu değişiklik yeni bir SÜRÜM açmalı mı?
 *
 * Ayrım keskindir: İÇERİK değişirse yeni sürüm, METADATA değişirse
 * değil. Sahibi değişince yeni sürüm açmak, sürüm geçmişini
 * anlamsızlaştırır (her küçük düzeltme bir sürüm olur ve kimse
 * bakmaz); içerik değişince açmamak ise kanıtı sessizce değiştirmektir
 * ve denetimde tam olarak yasak olan şey budur.
 */
export function surumGerekiyorMu(o: {
  eskiHash: string | null;
  yeniHash: string | null;
}): SurumKarari {
  if (o.yeniHash === null) {
    return { yeniSurum: false, sebep: 'Yeni dosya verilmedi; içerik değişmedi.' };
  }
  if (o.eskiHash === null) {
    return { yeniSurum: true, sebep: 'Kanıta ilk kez dosya eklendi.' };
  }
  if (o.eskiHash === o.yeniHash) {
    return { yeniSurum: false, sebep: 'Dosya özeti aynı — içerik birebir aynı.' };
  }
  return { yeniSurum: true, sebep: 'Dosya özeti değişti — içerik farklı.' };
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type KanitOzeti = {
  toplam: number;
  gecerli: number;
  taslak: number;
  reddedildi: number;
  arsivlendi: number;
  suresiDolan: number;
  /** Bitiş tarihi hiç girilmemiş kanıt — ÖLÇÜLMEMİŞ tazelik. */
  suresiz: number;
  dosyasiz: number;
  ozetsiz: number;
};

export function kanitOzeti(
  kanitlar: readonly {
    durum: string; tazelik: TazelikDurumu;
    dosyaHash: string | null; depoAnahtari: string | null;
  }[],
): KanitOzeti {
  const say = (f: (k: (typeof kanitlar)[number]) => boolean) => kanitlar.filter(f).length;
  return {
    toplam: kanitlar.length,
    gecerli: say((k) => k.durum === 'gecerli'),
    taslak: say((k) => k.durum === 'taslak'),
    reddedildi: say((k) => k.durum === 'reddedildi'),
    arsivlendi: say((k) => k.durum === 'arsivlendi'),
    suresiDolan: say((k) => k.tazelik === 'doldu'),
    suresiz: say((k) => k.tazelik === 'suresiz'),
    dosyasiz: say((k) => k.depoAnahtari === null),
    ozetsiz: say((k) => k.dosyaHash === null),
  };
}

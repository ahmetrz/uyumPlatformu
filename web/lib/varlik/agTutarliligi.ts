/* ═══ OT-11 · OT-44 · Ağ tutarlılık kuralları — SAF MANTIK ═════════════

   Denetim: `AgBolgesi` Purdue seviyesi ve conduit taşıyor ama ADRESLEME
   katmanı hiç yoktu — VLAN, subnet, gateway, yönetim ağı alanları yok.
   Bu yüzden OT-11'in doğrulama isterlerinin tamamı (zone dışı IP, çakışan
   subnet, çift IP) HESAPLANAMIYORDU. Şema `AgSegmenti` ile o katmanı
   kurdu; bu dosya kuralları yazıyor.

   ── KURAL MOTORUNUN DÜRÜSTLÜĞÜ ────────────────────────────────────────
   Her kural üç şey döndürebilir: bulgu VAR, bulgu YOK, ya da ÖLÇÜLEMEDİ.
   Üçüncüsü kayıt dışı bırakılmaz. Çözümlenemeyen bir IP'yi "zone dışı"
   diye bulguya çevirmek, bilinmeyeni kusura çevirmektir; sessizce atlamak
   ise ölçüm borcunu gizlemektir. */

import { ayniAdresMi, cakisirMi, icindeMi, subnetCozumle } from '@/lib/alan/ag';

export type AgBulgusu = {
  /** ip_segment_disi | cakisan_segment | cift_ip | gecersiz_cidr |
   *  gecersiz_ip | segment_yok | gateway_segment_disi */
  kural: string;
  siddet: 'kritik' | 'yuksek' | 'orta' | 'dusuk';
  /** Bulgunun bağlandığı kayıt. */
  kaynakTipi: 'Varlik' | 'AgSegmenti';
  kaynakId: string;
  aciklama: string;
};

export type OlcumBorcu = {
  kural: string;
  kaynakTipi: 'Varlik' | 'AgSegmenti';
  kaynakId: string;
  sebep: string;
};

export type SegmentGirdi = {
  id: string;
  kod: string;
  cidr: string;
  gatewayIp: string | null;
  bolgeId: string;
};

export type VarlikAgGirdi = {
  id: string;
  etiket: string;
  ipAdresi: string | null;
  segmentId: string | null;
};

export type AgTaramaSonucu = { bulgular: AgBulgusu[]; borclar: OlcumBorcu[] };

/**
 * Segment tanımlarının kendi tutarlılığı: geçerli CIDR mi, gateway kendi
 * ağının içinde mi, iki segment çakışıyor mu.
 */
export function segmentleriDenetle(segmentler: readonly SegmentGirdi[]): AgTaramaSonucu {
  const bulgular: AgBulgusu[] = [];
  const borclar: OlcumBorcu[] = [];
  const gecerli: SegmentGirdi[] = [];

  for (const s of segmentler) {
    if (!subnetCozumle(s.cidr)) {
      bulgular.push({
        kural: 'gecersiz_cidr',
        siddet: 'yuksek',
        kaynakTipi: 'AgSegmenti',
        kaynakId: s.id,
        aciklama: `"${s.kod}" segmentinin CIDR değeri çözümlenemedi: "${s.cidr}".`,
      });
      continue;
    }
    gecerli.push(s);

    if (s.gatewayIp !== null) {
      const icinde = icindeMi(s.gatewayIp, s.cidr);
      if (icinde === null) {
        borclar.push({
          kural: 'gateway_segment_disi',
          kaynakTipi: 'AgSegmenti',
          kaynakId: s.id,
          sebep: `Gateway adresi çözümlenemedi: "${s.gatewayIp}".`,
        });
      } else if (!icinde) {
        bulgular.push({
          kural: 'gateway_segment_disi',
          siddet: 'yuksek',
          kaynakTipi: 'AgSegmenti',
          kaynakId: s.id,
          aciklama: `"${s.kod}" segmentinin gateway'i (${s.gatewayIp}) kendi ağının (${s.cidr}) dışında.`,
        });
      }
    }
  }

  /* Çakışma çift yönlü değil, ÇİFT BAŞINA bir kez raporlanır: aynı
     çakışmayı iki satır olarak göstermek sayacı şişirirdi. */
  for (let i = 0; i < gecerli.length; i += 1) {
    for (let j = i + 1; j < gecerli.length; j += 1) {
      if (cakisirMi(gecerli[i].cidr, gecerli[j].cidr) === true) {
        bulgular.push({
          kural: 'cakisan_segment',
          siddet: 'yuksek',
          kaynakTipi: 'AgSegmenti',
          kaynakId: gecerli[i].id,
          aciklama: `"${gecerli[i].kod}" (${gecerli[i].cidr}) ile "${gecerli[j].kod}" (${gecerli[j].cidr}) adres aralıkları çakışıyor.`,
        });
      }
    }
  }
  return { bulgular, borclar };
}

/**
 * Varlıkların adres tutarlılığı: IP kendi segmentinin içinde mi, aynı IP
 * iki varlıkta mı, IP var ama segment atanmamış mı.
 */
export function varliklariDenetle(
  varliklar: readonly VarlikAgGirdi[],
  segmentler: readonly SegmentGirdi[],
): AgTaramaSonucu {
  const bulgular: AgBulgusu[] = [];
  const borclar: OlcumBorcu[] = [];
  const segmentHarita = new Map(segmentler.map((s) => [s.id, s]));

  for (const v of varliklar) {
    if (v.ipAdresi === null) continue;   // IP yokluğu bu kuralın konusu değil

    if (v.segmentId === null) {
      /* Bir bulgu DEĞİL, ölçüm borcu: IP'si olan ama segmenti atanmamış
         varlık yanlış yapılandırılmış olmayabilir, sadece eşlenmemiştir. */
      borclar.push({
        kural: 'segment_yok',
        kaynakTipi: 'Varlik',
        kaynakId: v.id,
        sebep: `"${v.etiket}" IP taşıyor (${v.ipAdresi}) ama ağ segmenti atanmamış.`,
      });
      continue;
    }
    const s = segmentHarita.get(v.segmentId);
    if (!s) {
      borclar.push({
        kural: 'segment_yok',
        kaynakTipi: 'Varlik',
        kaynakId: v.id,
        sebep: `"${v.etiket}" bilinmeyen bir segmente bağlı.`,
      });
      continue;
    }
    const icinde = icindeMi(v.ipAdresi, s.cidr);
    if (icinde === null) {
      borclar.push({
        kural: 'ip_segment_disi',
        kaynakTipi: 'Varlik',
        kaynakId: v.id,
        sebep: `"${v.etiket}" adresi çözümlenemedi: "${v.ipAdresi}".`,
      });
    } else if (!icinde) {
      bulgular.push({
        kural: 'ip_segment_disi',
        siddet: 'yuksek',
        kaynakTipi: 'Varlik',
        kaynakId: v.id,
        aciklama: `"${v.etiket}" adresi ${v.ipAdresi}, bağlı olduğu "${s.kod}" segmentinin (${s.cidr}) dışında.`,
      });
    }
  }

  /* Çift IP — metin karşılaştırmasıyla bulunamaz (`10.0.0.1` ile
     `010.0.0.1`, `::1` ile `0:0:0:0:0:0:0:1`); sayısal değer üzerinden
     eşleştirilir. Her çift bir kez raporlanır. */
  const ipliler = varliklar.filter((v) => v.ipAdresi !== null);
  for (let i = 0; i < ipliler.length; i += 1) {
    for (let j = i + 1; j < ipliler.length; j += 1) {
      if (ayniAdresMi(ipliler[i].ipAdresi, ipliler[j].ipAdresi) === true) {
        bulgular.push({
          kural: 'cift_ip',
          siddet: 'kritik',
          kaynakTipi: 'Varlik',
          kaynakId: ipliler[i].id,
          aciklama: `${ipliler[i].ipAdresi} adresi iki varlıkta kayıtlı: "${ipliler[i].etiket}" ve "${ipliler[j].etiket}".`,
        });
      }
    }
  }
  return { bulgular, borclar };
}

/** İki taramayı birleştirir — motor tek bir sonuç yazar. */
export function agiDenetle(
  varliklar: readonly VarlikAgGirdi[],
  segmentler: readonly SegmentGirdi[],
): AgTaramaSonucu {
  const a = segmentleriDenetle(segmentler);
  const b = varliklariDenetle(varliklar, segmentler);
  return { bulgular: [...a.bulgular, ...b.bulgular], borclar: [...a.borclar, ...b.borclar] };
}

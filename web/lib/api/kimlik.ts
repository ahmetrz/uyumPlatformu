import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { db } from '../db';
import type { AktifKullanici } from '../auth';
import { ApiHata } from './hatalar';

/* API kimliği — oturum kalıbının aynısı (lib/auth.ts):
   32 bayt rastgele token, base64url; VERİTABANINDA YALNIZ SHA-256 özeti durur.
   Tam token yalnız üretim anında bir kez döner, bir daha asla gösterilemez.

   Çözülen kimlik `AktifKullanici` veri şeklidir — böylece lib/erisim.ts
   içindeki izinVar/izinliTesisIdleri saf fonksiyonları AYNEN kullanılır.
   API için paralel bir yetki sistemi YOKTUR. */

/** Gösterim öneki: anahtarı listede tanımaya yeter, token'ı ele vermez
    (kalan 35 karakter ≈ 210 bit entropi). */
const ONEK_UZUNLUGU = 8;

export const apiTokenOzeti = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export function apiTokenUret(): { token: string; onEk: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, onEk: token.slice(0, ONEK_UZUNLUGU), tokenHash: apiTokenOzeti(token) };
}

export type ApiKimlik = {
  anahtarId: string;
  anahtarAdi: string;
  kullanici: AktifKullanici;
};

/** `Authorization: Bearer <token>` — başka taşıyıcı kabul edilmez
    (sorgu parametresiyle token taşımak logları kirletir, yasak). */
export function bearerToken(istek: Request): string | null {
  const ham = istek.headers.get('authorization');
  if (!ham) return null;
  const eslesme = /^Bearer\s+(\S+)$/i.exec(ham.trim());
  return eslesme ? eslesme[1] : null;
}

/**
 * Bearer token'dan AktifKullanici çözer.
 * Geçersiz / iptal edilmiş / süresi dolmuş anahtar → 401 (yetkisiz).
 * Hata mesajları anahtarın varlığını AYIRT ETTİRMEZ ölçüde geneldir.
 */
export async function istekKimligi(istek: Request): Promise<ApiKimlik> {
  const token = bearerToken(istek);
  if (!token) {
    throw new ApiHata('yetkisiz', 'Authorization: Bearer <token> başlığı gerekli');
  }
  const anahtar = await db.apiAnahtari.findUnique({
    where: { tokenHash: apiTokenOzeti(token) },
    include: { kullanici: { include: { yetkiler: true } } },
  });
  if (!anahtar) throw new ApiHata('yetkisiz', 'Geçersiz API anahtarı');
  if (anahtar.iptalZamani) throw new ApiHata('yetkisiz', 'API anahtarı iptal edilmiş');
  if (anahtar.bitis && anahtar.bitis.getTime() <= Date.now()) {
    throw new ApiHata('yetkisiz', 'API anahtarının süresi dolmuş');
  }
  if (!anahtar.kullanici.aktif) {
    throw new ApiHata('yetkisiz', 'Anahtar sahibi kullanıcı pasif');
  }

  await db.apiAnahtari.update({ where: { id: anahtar.id }, data: { sonKullanim: new Date() } });

  const k = anahtar.kullanici;
  const kullanici: AktifKullanici = {
    id: k.id,
    adSoyad: k.adSoyad,
    eposta: k.eposta,
    unvan: k.unvan,
    yetkiler: k.yetkiler.map((y) => ({
      rol: y.rol, surecId: y.surecId, tesisId: y.tesisId,
      tuzelKisiId: y.tuzelKisiId, regulasyonId: y.regulasyonId, modul: y.modul,
    })),
  };
  return { anahtarId: anahtar.id, anahtarAdi: anahtar.ad, kullanici };
}

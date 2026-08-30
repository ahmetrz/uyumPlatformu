'use server';

import { redirect } from 'next/navigation';
import { db } from './db';
import { parolaDogru, oturumAc, oturumKapat } from './auth';

export async function girisYap(girdi: { eposta: string; parola: string }):
  Promise<{ ok: false; hata: string } | never> {
  const kullanici = await db.kullanici.findUnique({ where: { eposta: girdi.eposta.trim().toLowerCase() } });
  // Zamanlama sızıntısını sınırlamak için parola her durumda doğrulanır
  const dogru = parolaDogru(girdi.parola, kullanici?.parolaHash ?? 's1$00$00');
  if (!kullanici || !kullanici.aktif || !dogru)
    return { ok: false, hata: 'E-posta veya parola hatalı' };
  await oturumAc(kullanici.id);
  await db.aktiviteKaydi.create({ data: {
    aktorId: kullanici.id, varlikTipi: 'Oturum', varlikId: kullanici.id,
    eylem: 'olusturma', kaynak: 'ui' } });
  redirect('/');
}

export async function cikisYap(): Promise<never> {
  await oturumKapat();
  redirect('/giris');
}

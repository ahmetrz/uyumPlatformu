import type { Metadata } from 'next';
import { girisZorunlu } from '@/lib/erisim';

export const metadata: Metadata = { title: 'Yönetim tezgâhı — Atlas' };

/* M1 · Faz 2 iskelesi — içerik Faz 5'te gelecek.
   Rota şimdiden gezilebilir olmalı (07 §Phase 2 çıkış kriteri). */

export default async function Sayfa() {
  await girisZorunlu();
  return (
    <main>
      <header style={{ padding: 'var(--sec-pad-top) var(--gutter-op) 0' }}>
        <p className="t-eyebrow" style={{ margin: '0 0 var(--s10)' }}>YÖNETİM · DİKKAT LİSTESİ</p>
        <h1 className="t-screen" style={{ margin: 0 }}>Yönetim tezgâhı</h1>
      </header>
      <div style={{ padding: 'var(--s26) var(--gutter-op) var(--sec-pad-bot)' }}>
        <div style={{ background: 'var(--card)', border: 'var(--bw-strong) solid var(--hr2)',
          padding: 'var(--s22) var(--s24)', maxWidth: 520 }}>
          <p className="t-caption" style={{ margin: '0 0 var(--s10)' }}>BOŞ · YAPIM AŞAMASI</p>
          <p style={{ margin: 0, fontSize: 'var(--t-cell)', color: 'var(--i2)' }}>
            Bu ekran M1 olarak onaylandı; içeriği Faz 5&apos;te bağlanacak.
          </p>
        </div>
      </div>
    </main>
  );
}

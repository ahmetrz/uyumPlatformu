'use client';
import { useEffect, useState } from 'react';

export default function TemaDugmesi() {
  const [tema, setTema] = useState<string | null>(null);

  useEffect(() => {
    let t: string | null = null;
    try { t = localStorage.getItem('tema'); } catch { /* özel pencere */ }
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tema yalnızca istemcide bilinebilir
    setTema(t);
  }, []);

  function degistir() {
    const kok = document.documentElement;
    const koyuMu = kok.dataset.theme
      ? kok.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    const yeni = koyuMu ? 'light' : 'dark';
    kok.dataset.theme = yeni;
    setTema(yeni);
    try { localStorage.setItem('tema', yeni); } catch { /* yoksay */ }
  }

  const koyu = tema ? tema === 'dark' : true;
  return (
    <button className="btn kucuk" onClick={degistir} title="Tema değiştir">
      {koyu ? '☀ Gündüz vardiyası' : '☾ Gece vardiyası'}
    </button>
  );
}

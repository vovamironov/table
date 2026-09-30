'use client';

import { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

type PreviewMode = 'desktop' | 'mobile';

export default function Page() {
  const [slowLoading, setSlowLoading] = useState(false);
  const [mode, setMode] = useState<PreviewMode | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMode(window.matchMedia('(max-width: 640px)').matches ? 'mobile' : 'desktop');
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="chart-preview-shell">
      <div className="chart-preview-toolbar">
        <div className="chart-preview-mode-switch" role="group" aria-label="Версия графика">
          <button type="button" aria-pressed={mode === 'desktop'} onClick={() => setMode('desktop')}>
            <Monitor size={17} aria-hidden="true" />
            Десктоп
          </button>
          <button type="button" aria-pressed={mode === 'mobile'} onClick={() => setMode('mobile')}>
            <Smartphone size={17} aria-hidden="true" />
            Мобильная
          </button>
        </div>
        <div className="chart-preview-mode-switch">
          <button type="button" aria-pressed={slowLoading} onClick={() => setSlowLoading(!slowLoading)}>Медленная загрузка · 5 с</button>
        </div>
      </div>
      <div className="chart-preview-stage">
        <iframe className={`chart-preview-frame ${mode ?? 'auto'}`} src={slowLoading ? "/preview?slow=5" : "/preview"} title="Как менялась цена золота — интерактивный график" />
      </div>
    </main>
  );
}

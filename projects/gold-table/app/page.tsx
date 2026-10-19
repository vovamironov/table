'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone, LoaderCircle, CloudOff, DatabaseZap, ChartNoAxesCombined } from 'lucide-react';

type PreviewMode = 'desktop' | 'mobile';
type ChartVariant = 'a' | 'b' | 'c' | 'd';

export default function Page() {
  const [showData, setShowData] = useState(true);
  const [emptyLoading, setEmptyLoading] = useState(false);
  const [failedLoading, setFailedLoading] = useState(false);
  const [slowLoading, setSlowLoading] = useState(false);
  const [mode, setMode] = useState<PreviewMode | null>(null);
  const [variant, setVariant] = useState<ChartVariant>('b');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sendVariant = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'gold-chart-variant', variant, showData }, window.location.origin);
  }, [variant, showData]);

  useEffect(() => {
    const handleReady = (event: MessageEvent) => {
      const childWindow = iframeRef.current?.contentWindow;
      if (childWindow && event.origin === window.location.origin && event.source === childWindow && event.data?.type === 'gold-chart-ready') {
        sendVariant();
      }
    };
    window.addEventListener('message', handleReady);
    sendVariant();
    return () => window.removeEventListener('message', handleReady);
  }, [sendVariant]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMode(window.matchMedia('(max-width: 640px)').matches ? 'mobile' : 'desktop');
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="chart-preview-shell">
      <div className="chart-preview-toolbar">
        <div className="chart-preview-mode-switch chart-preview-variant-switch" role="group" aria-label="Вариант графика">
          <button type="button" aria-pressed={variant === 'b'} onClick={() => setVariant('b')}>B</button>
          <button type="button" aria-pressed={variant === 'a'} onClick={() => setVariant('a')}>A</button>
          <button type="button" aria-pressed={variant === 'c'} onClick={() => setVariant('c')}>C</button>
          <button type="button" aria-pressed={variant === 'd'} onClick={() => setVariant('d')}>D</button>
        </div>
        <div className="chart-preview-mode-switch" role="group" aria-label="Версия графика">
          <button type="button" aria-label="Десктоп" title="Десктоп" aria-pressed={mode === 'desktop'} onClick={() => setMode('desktop')}>
            <Monitor size={17} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Мобильная версия" title="Мобильная версия" aria-pressed={mode === 'mobile'} onClick={() => setMode('mobile')}>
            <Smartphone size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="chart-preview-mode-switch">
          <button type="button" aria-label="Медленная загрузка · 5 с" title="Медленная загрузка · 5 с" aria-pressed={slowLoading} onClick={() => setSlowLoading(!slowLoading)}><LoaderCircle size={17} aria-hidden="true" /></button>
          <button type="button" aria-label="Данные не загрузились" title="Данные не загрузились · имитация сбоя ЦБ" aria-pressed={failedLoading} onClick={() => { setFailedLoading(!failedLoading); setEmptyLoading(false); }}><CloudOff size={17} aria-hidden="true" /></button>
          <button type="button" aria-label="Нет сохранённых данных" title="Нет сохранённых данных · ошибка загрузки" aria-pressed={emptyLoading} onClick={() => { setEmptyLoading(!emptyLoading); setFailedLoading(false); }}><DatabaseZap size={17} aria-hidden="true" /></button>
          <button type="button" aria-label="Данные" title="Данные" aria-pressed={showData} onClick={() => setShowData(!showData)}><ChartNoAxesCombined size={17} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="chart-preview-stage">
        <iframe ref={iframeRef} onLoad={sendVariant} className={`chart-preview-frame ${mode ?? 'auto'}`} src={`/preview?${new URLSearchParams({ ...(slowLoading ? { slow: '5' } : {}), ...(failedLoading ? { failure: '1' } : {}), ...(emptyLoading ? { empty: '1' } : {}) })}`} title="Как менялась цена золота — интерактивный график" />
      </div>
    </main>
  );
}

'use client';

import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { goldPriceHistory } from './gold-price-history';
import { AssetComparison } from './asset-comparison';
import { Check, ChevronRight, Minus, Plus, Search, ShoppingCart, X } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type GoldShape = 'account' | 'coin' | 'bar';
type GoalId = 'regular' | 'gift' | 'reserve';

type Product = {
  id: GoldShape;
  title: string;
  hrefLabel: string;
  facts: Array<{ icon: string; title: string; note: string }>;
};

const products: Product[] = [
  {
    id: 'account',
    title: 'Золотой счёт',
    hrefLabel: 'Подробнее о счёте',
    facts: [
      { icon: '/landing-assets/gold.svg', title: 'Можно начать с 0,1 г', note: 'По актуальной цене банка' },
      { icon: '/landing-assets/arrows-left-right.svg', title: 'Покупка и продажа 24/7', note: 'Даже в праздничные дни' },
      { icon: '/landing-assets/percent-circle.svg?v=2', title: 'Бесплатное обслуживание', note: 'И отсутствие комиссий' },
    ],
  },
  {
    id: 'coin',
    title: 'Монеты',
    hrefLabel: 'Подробнее о монетах',
    facts: [
      { icon: '/landing-assets/gold.svg', title: 'Физическое золото', note: 'Монеты 999 пробы' },
      { icon: '/landing-assets/arrows-left-right.svg', title: 'Можно подарить', note: 'Памятный и ценный подарок' },
      { icon: '/landing-assets/percent-circle.svg?v=2', title: 'Легко продать', note: 'Обратно банку' },
    ],
  },
  {
    id: 'bar',
    title: 'Слитки',
    hrefLabel: 'Подробнее о слитках',
    facts: [
      { icon: '/landing-assets/gold.svg', title: 'От 1 г до 1 кг', note: 'Разные варианты веса' },
      { icon: '/landing-assets/arrows-left-right.svg', title: 'Доставка или хранение', note: 'Можно оставить в банке' },
      { icon: '/landing-assets/percent-circle.svg?v=2', title: 'Обратная продажа', note: 'По актуальной цене банка' },
    ],
  },
];

const investmentReasons = [
  {
    icon: '/landing-assets/figma-reasons/shield-chart.svg',
    title: 'Защита',
    text: 'Когда деньги обесцениваются, золото помогает сохранить покупательную способность накоплений.',
  },
  {
    icon: '/landing-assets/figma-reasons/chart.svg',
    title: 'Доходность',
    text: 'В долгосрочной перспективе золото исторически дорожало: за последние двадцать лет цена выросла больше чем вдвое.',
  },
  {
    icon: '/landing-assets/figma-reasons/chart-pie.svg',
    title: 'Диверсификация',
    text: 'Золото слабо связано с рынком акций, облигаций и курсом рубля, поэтому делает портфель устойчивее.',
  },
];

const returnPoints = [94000, 91462, 77802, 78337, 127839, 144357, 129701, 139621, 166777, 247108, 221161, 174116, 316437, 381570, 509375, 633276];
const years = Array.from({ length: 16 }, (_, index) => 2011 + index);
type GoldPricePoint = { time: number; value: number };
const goldPriceOrigin = Date.UTC(2011, 0, 1);
const initialGoldTimeline: GoldPricePoint[] = goldPriceHistory.map(([day, value]) => ({ time: goldPriceOrigin + day * 86400000, value }));
const comparisonEndTime = Date.UTC(2026, 8, 24);
const goldPriceWindowDefinitions = [
  { value: '1y', label: '1 год', months: 12 },
  { value: '5y', label: '5 лет', months: 60 },
  { value: '10y', label: '10 лет', months: 120 },
  { value: '15y', label: '15 лет', months: 180 },
];
const money = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const milestoneDate = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const formatMilestoneDate = (time: number) => milestoneDate.format(new Date(time)).replace(/\s*г\.$/, '').replace(/\./g, '');
const currentAxisDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const formatCurrentAxisDate = (time: number) => currentAxisDate.format(new Date(time)).replace(/\s*г\.$/, '').replace(/\./g, '');
const axisMonth = new Intl.DateTimeFormat('ru-RU', { month: 'short', timeZone: 'UTC' });
const formatMobileAxisDate = (time: number) => {
  const date = new Date(time);
  return `${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCFullYear()).slice(-2)}`;
};
function goldAxisMarks(start: number, end: number, months: number, compact: boolean) {
  const axisIntervals = compact ? 3 : 4;
  const endDate = new Date(end);
  const middleMarks = Array.from({ length: axisIntervals - 1 }, (_, index) => {
    let time = start + (end - start) * (index + 1) / axisIntervals;
    if (!compact) {
      const monthsBack = months * (axisIntervals - index - 1) / axisIntervals;
      const targetMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() - monthsBack, 1));
      const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
      time = Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth(), Math.min(endDate.getUTCDate(), lastDay));
    }
    return { time, label: compact ? formatMobileAxisDate(time) : formatMilestoneDate(time) };
  });
  return [{ time: start, label: compact ? formatMobileAxisDate(start) : formatMilestoneDate(start) }, ...middleMarks];
}

const hoverDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const formatHoverDate = (time: number) => hoverDate.format(new Date(time)).replace(/\./g, '');

const faqCategories: Array<{ value: GoldShape; label: string }> = [
  { value: 'account', label: 'Золотой счёт' },
  { value: 'coin', label: 'Монеты' },
  { value: 'bar', label: 'Слитки' },
];

const faqItems: Record<GoldShape, Array<{ question: string; answer: string }>> = {
  account: [
    { question: 'Что такое золотой счёт?', answer: 'Это счёт, на котором учитывается золото в граммах. Его стоимость меняется вместе с актуальной ценой металла.' },
    { question: 'С какой суммы можно начать?', answer: 'Можно купить от 0,1 грамма золота. Сумма покупки рассчитывается по актуальной цене банка.' },
    { question: 'Когда можно покупать и продавать золото?', answer: 'Операции доступны круглосуточно, в том числе в выходные и праздничные дни.' },
    { question: 'Есть ли плата за обслуживание?', answer: 'Открытие и обслуживание золотого счёта бесплатны.' },
    { question: 'Нужно ли самостоятельно хранить золото?', answer: 'Нет. Золото учитывается на счёте, поэтому вам не нужны сейф или банковская ячейка.' },
    { question: 'Как получить деньги обратно?', answer: 'Продайте нужное количество золота по актуальной цене банка — деньги поступят на ваш рублёвый счёт.' },
  ],
  coin: [
    { question: 'Какие золотые монеты можно купить?', answer: 'Доступные монеты отличаются весом, тиражом и дизайном. Актуальный ассортимент можно посмотреть перед покупкой.' },
    { question: 'Как выбрать монету?', answer: 'Для вложения обычно сравнивают вес, пробу и цену, а для подарка дополнительно учитывают сюжет и оформление.' },
    { question: 'Можно ли подарить золотую монету?', answer: 'Да. Монета остаётся физическим активом и может стать памятным подарком близкому человеку.' },
    { question: 'Какие документы выдаются при покупке?', answer: 'Вместе с монетой вы получите документы, подтверждающие покупку и основные характеристики изделия.' },
    { question: 'Как хранить монету?', answer: 'Храните монету в защитной упаковке и старайтесь не касаться её поверхности, чтобы сохранить внешний вид.' },
    { question: 'Можно ли продать монету обратно?', answer: 'Да. Банк оценит состояние монеты и назовёт актуальную цену обратной покупки.' },
  ],
  bar: [
    { question: 'Какие слитки можно купить?', answer: 'Доступны слитки разного веса — от 1 грамма до 1 килограмма.' },
    { question: 'Как купить слиток?', answer: 'Выберите подходящий вес и способ получения: доставку или хранение в банке.' },
    { question: 'Какие документы выдаются вместе со слитком?', answer: 'Слиток передаётся вместе с документами, в которых указаны его вес, проба и другие характеристики.' },
    { question: 'Где можно хранить слиток?', answer: 'Слиток можно забрать или оставить на хранение в банке.' },
    { question: 'Почему важно сохранить упаковку?', answer: 'Целая упаковка и хорошее состояние слитка упрощают последующую оценку и обратную продажу.' },
    { question: 'Можно ли продать слиток обратно?', answer: 'Да. Банк проверит слиток и предложит цену покупки, актуальную на момент обращения.' },
  ],
};

const goalJourneys: Record<GoalId, {
  label: string;
  shape: GoldShape;
  product: string;
  initial: number;
  weights?: number[];
  min: string;
  max: string;
}> = {
  regular: { label: 'Копить понемногу', shape: 'account', product: 'Золотой счёт', initial: 24, min: '0,1 г', max: '100 г' },
  gift: { label: 'Подарить золото', shape: 'coin', product: 'Золотая монета', initial: 34, weights: [3.11, 7.78, 15.55, 31.1], min: '3,11 г', max: '31,1 г' },
  reserve: { label: 'Сохранить надолго', shape: 'bar', product: 'Золотой слиток', initial: 0, weights: [1, 10, 50, 100, 500, 1000], min: '1 г', max: '1 кг' },
};

function journeyWeightValue(goal: GoalId, progress: number) {
  const config = goalJourneys[goal];
  if (config.weights) {
    const index = Math.min(config.weights.length - 1, Math.floor((progress / 101) * config.weights.length));
    return config.weights[index];
  }
  return .1 * Math.pow(1000, progress / 100);
}

function formatJourneyWeight(weight: number) {
  if (weight === 1000) return '1 кг';
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: weight < 10 ? 2 : 1 }).format(weight)} г`;
}

function GoldScene({
  shape,
  label,
  clear = false,
  scrollSpin = false,
  onReady,
  barVariant = 'original',
}: {
  shape: GoldShape;
  label: string;
  clear?: boolean;
  scrollSpin?: boolean;
  onReady?: () => void;
  barVariant?: 'original' | '100g';
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const initialShape = useRef(shape);
  const clearSurface = useRef(clear);
  const scrollProgress = useRef(0);
  const readyNotified = useRef(false);
  const sendShape = useCallback(() => {
    const sceneWindow = frame.current?.contentWindow as (Window & { setGoldShape?: (nextShape: GoldShape) => void }) | null;
    if (!sceneWindow) return;
    sceneWindow.setGoldShape?.(shape);
    sceneWindow.postMessage({ type: 'gold-shape', shape }, '*');
  }, [shape]);
  const sendScrollSpin = useCallback(() => {
    if (!scrollSpin) return;
    frame.current?.contentWindow?.postMessage({ type: 'gold-scroll-spin', progress: scrollProgress.current }, '*');
  }, [scrollSpin]);

  useEffect(() => sendShape(), [sendShape]);
  useEffect(() => {
    let readyProbe = 0;
    const requestReadyState = () => {
      frame.current?.contentWindow?.postMessage({ type: 'gold-ready-request' }, '*');
    };
    const onSceneReady = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'gold-scene-ready') return;
      sendShape();
      sendScrollSpin();
      if (readyProbe) window.clearInterval(readyProbe);
      if (!readyNotified.current) {
        readyNotified.current = true;
        onReady?.();
      }
    };
    window.addEventListener('message', onSceneReady);
    requestReadyState();
    readyProbe = window.setInterval(requestReadyState, 250);
    return () => {
      window.removeEventListener('message', onSceneReady);
      if (readyProbe) window.clearInterval(readyProbe);
    };
  }, [onReady, sendScrollSpin, sendShape]);
  useEffect(() => {
    const sceneFrame = frame.current;
    if (!scrollSpin || !sceneFrame) return;
    let animationFrame = 0;
    const measure = () => {
      animationFrame = 0;
      const rect = sceneFrame.getBoundingClientRect();
      scrollProgress.current = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      sendScrollSpin();
    };
    const scheduleMeasure = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', scheduleMeasure, { passive: true });
    window.addEventListener('resize', scheduleMeasure);
    return () => {
      window.removeEventListener('scroll', scheduleMeasure);
      window.removeEventListener('resize', scheduleMeasure);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [scrollSpin, sendScrollSpin]);

  return (
    <iframe
      ref={frame}
      className="gold-scene"
      src={`/gold-scene/index.html?v=4&shape=${initialShape.current}&surface=${clearSurface.current ? 'clear' : 'soft'}&bar=${barVariant}`} 
      title={label}
      loading="lazy"
      onLoad={() => { sendShape(); sendScrollSpin(); }}
    />
  );
}

function GoldJourneyScene({ shape, progress, weight, label }: { shape: GoldShape; progress: number; weight: number; label: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latestProgress = useRef(progress);
  const latestShape = useRef(shape);
  const latestWeight = useRef(weight);
  const sendProgress = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: 'gold-goal', shape: latestShape.current, progress: latestProgress.current / 100, weight: latestWeight.current }, '*');
  }, []);

  useEffect(() => {
    latestProgress.current = progress;
    latestShape.current = shape;
    latestWeight.current = weight;
    sendProgress();
  }, [progress, shape, weight, sendProgress]);
  useEffect(() => {
    const onSceneReady = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== 'gold-scene-ready') return;
      sendProgress();
    };
    window.addEventListener('message', onSceneReady);
    return () => window.removeEventListener('message', onSceneReady);
  }, [sendProgress]);

  return (
    <iframe
      ref={frame}
      className="gold-journey-scene"
      src="/gold-scene/index.html?v=9&shape=account&surface=clear"
      title={label}
      loading="lazy"
      onLoad={sendProgress}
    />
  );
}

function Header() {
  return (
    <header className="site-header">
      <nav className="header-inner" aria-label="Основная навигация">
        <div className="main-nav">
          <a href="#">Частным лицам</a>
          <a href="#">Бизнесу</a>
          <a href="#">Премиум</a>
          <a href="#">Ещё</a>
        </div>
        <div className="header-actions">
          <button type="button" aria-label="Выбрать язык">RU</button>
          <button type="button" aria-label="Поиск"><Search size={24} strokeWidth={1.8} /></button>
          <button type="button" className="account-button"><img src="/landing-assets/figma-user.svg" alt="" />Личный кабинет</button>
        </div>
      </nav>
    </header>
  );
}

function HeroGoldMorph() {
  const sequence: GoldShape[] = ['account', 'coin', 'bar'];
  const [step, setStep] = useState(0);
  const [sceneReady, setSceneReady] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    if (!introComplete) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches) return;
    const interval = window.setInterval(() => {
      setStep((current) => (current + 1) % sequence.length);
    }, 3200);
    return () => window.clearInterval(interval);
  }, [introComplete, sequence.length]);

  return (
    <>
      <div
        className={`hero-gold-entry${sceneReady ? ' is-ready' : ''}`}
        onAnimationEnd={() => setIntroComplete(true)}
      >
        <GoldScene
          shape={sequence[step]}
          label="Самородок превращается в монету и слиток"
          clear
          onReady={handleSceneReady}
          barVariant="100g"
        />
      </div>
      <div className={`hero-gold-fade${sceneReady ? ' is-ready' : ''}`} aria-hidden="true" />
    </>
  );
}

function Hero({ animatedGold = false }: { animatedGold?: boolean }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <h1>Драгоценные металлы</h1>
        <p>{animatedGold ? 'Надежный способ сохранить сбережения' : 'ОМС, инвестиционные монеты, слитки с доставкой и хранением в банке'}</p>
        {!animatedGold && <a href="#products" className="primary-button">Начать инвестировать</a>}
      </div>
      <div className={`hero-image-frame${animatedGold ? ' hero-morph-frame' : ''}`}>
        {animatedGold
          ? <HeroGoldMorph />
          : <img className="hero-image" src="/landing-assets/hero-safe.png" alt="Сейф с золотыми слитками" />}
      </div>
    </section>
  );
}

function WhyGoldSection() {
  return (
    <section className="landing-section reasons-section">
      <h2 className="section-title">Зачем инвестировать в золото</h2>
      <div className="reason-cards">
        {investmentReasons.map((reason) => (
          <article className="reason-card" key={reason.title}>
            <span className="reason-icon"><img src={reason.icon} alt="" /></span>
            <h3>{reason.title}</h3>
            <p>{reason.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductsSection() {
  const [active, setActive] = useState<GoldShape>('account');

  return (
    <section className="landing-section products-section" id="products">
      <h2 className="section-title">Что у нас есть</h2>
      <div className="products-layout">
        <Accordion className="product-accordion" value={[active]}>
          {products.map((product) => (
            <AccordionItem className="product-item" value={product.id} key={product.id}>
              <AccordionTrigger
                className="product-trigger"
                onClick={() => setActive(product.id)}
              >
                <span>{product.title}</span>
                <ChevronRight className="product-chevron" aria-hidden="true" />
              </AccordionTrigger>
              <AccordionContent className="product-content">
                <div className="fact-list">
                  {product.facts.map((fact) => (
                    <div className="fact" key={fact.title}>
                      <span className="fact-icon"><img src={fact.icon} alt="" /></span>
                      <span><strong>{fact.title}</strong><small>{fact.note}</small></span>
                    </div>
                  ))}
                </div>
                <a className="product-link" href="#">{product.hrefLabel}</a>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="product-stage" aria-label="Интерактивная форма золота">
          <GoldScene shape={active} label="Самородок превращается в монету и слиток" clear scrollSpin />
        </div>
      </div>
    </section>
  );
}

const productPrimaryActions: Record<GoldShape, string> = {
  account: 'Открыть счёт',
  coin: 'Выбрать',
  bar: 'Выбрать',
};

const productScenarios: Array<{ value: GoldShape; label: string }> = [
  { value: 'account', label: 'Копить понемногу' },
  { value: 'coin', label: 'Собрать коллекцию' },
  { value: 'bar', label: 'Сохранить надолго' },
];

const productDescriptions: Record<GoldShape, string> = {
  account: 'Покупайте золото от 0,1 грамма по актуальной цене банка. Не нужно выбирать слиток, организовывать доставку и хранение.',
  coin: 'Инвестиционные монеты — физическое золото, которое можно собирать, дарить близким и со временем продать обратно банку.',
  bar: 'Физическое золото для долгосрочного резерва. Выберите вес слитка, получите его с доставкой или оставьте на хранение в банке.',
};

function ScenarioProductsSection() {
  const [active, setActive] = useState<GoldShape>('account');
  const product = products.find((item) => item.id === active) ?? products[0];

  return (
    <section className="landing-section scenario-products-section" id="products">
      <h2 className="section-title">Способы инвестиций в металлы</h2>
      <Tabs value={active} onValueChange={(value) => setActive(value as GoldShape)} className="scenario-tabs">
        <TabsList className="scenario-tab-list" aria-label="Цель покупки золота">
          {productScenarios.map((scenario) => (
            <TabsTrigger className="scenario-tab" value={scenario.value} key={scenario.value}>
              {scenario.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="scenario-product-layout">
        <article className="scenario-product-copy" key={product.id}>
          <div>
            <h3>{product.title}</h3>
            <p>{productDescriptions[product.id]}</p>
          </div>
          <div className="fact-list scenario-product-facts">
            {product.facts.map((fact) => (
              <div className="fact" key={fact.title}>
                <span className="fact-icon"><img src={fact.icon} alt="" /></span>
                <span><strong>{fact.title}</strong><small>{fact.note}</small></span>
              </div>
            ))}
          </div>
          <div className="scenario-product-actions">
            <a className="product-story-primary" href="#">{productPrimaryActions[product.id]}</a>
            <a className="product-story-secondary" href="#">Подробнее</a>
          </div>
        </article>
        <div className="scenario-product-stage" aria-label={`3D-модель: ${product.title}`}>
          <GoldScene shape={active} label="Самородок превращается в монету и слиток" clear scrollSpin />
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <h2>{product.title}</h2>
      <div className="fact-list product-card-facts">
        {product.facts.map((fact) => (
          <div className="fact" key={fact.title}>
            <span className="fact-icon"><img src={fact.icon} alt="" /></span>
            <span><strong>{fact.title}</strong><small>{fact.note}</small></span>
          </div>
        ))}
      </div>
      <div className="product-story-actions">
        <a className="product-story-primary" href="#">{productPrimaryActions[product.id]}</a>
        <a className="product-story-secondary" href="#">Подробнее</a>
      </div>
    </article>
  );
}

function ProductCardsSection() {
  return (
    <section className="landing-section product-cards-section" id="products">
      <div className="product-cards-grid">
        {products.map((product) => <ProductCard product={product} key={product.id} />)}
      </div>
    </section>
  );
}

function SegmentedTabs({ value, onValueChange, options, label }: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  label: string;
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="segmented-tabs">
      <TabsList className="segmented-list" aria-label={label}>
        {options.map((option) => <TabsTrigger className="segmented-trigger" key={option.value} value={option.value}>{option.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}

function smoothSlope(points: Array<{ x: number; y: number }>, index: number) {
  const last = points.length - 1;
  if (index === 0) return (points[1].y - points[0].y) / (points[1].x - points[0].x);
  if (index === last) return (points[last].y - points[last - 1].y) / (points[last].x - points[last - 1].x);
  const beforeWidth = points[index].x - points[index - 1].x;
  const afterWidth = points[index + 1].x - points[index].x;
  const beforeSlope = (points[index].y - points[index - 1].y) / beforeWidth;
  const afterSlope = (points[index + 1].y - points[index].y) / afterWidth;
  if (beforeSlope * afterSlope <= 0) return 0;
  const beforeWeight = 2 * afterWidth + beforeWidth;
  const afterWeight = afterWidth + 2 * beforeWidth;
  return (beforeWeight + afterWeight) / (beforeWeight / beforeSlope + afterWeight / afterSlope);
}

function smoothControls(points: Array<{ x: number; y: number }>, index: number) {
  const start = points[index], end = points[index + 1];
  const handle = (end.x - start.x) / 3;
  return {
    start,
    end,
    controlStart: { x: start.x + handle, y: start.y + smoothSlope(points, index) * handle },
    controlEnd: { x: end.x - handle, y: end.y - smoothSlope(points, index + 1) * handle },
  };
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return '';
  let path = `M${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index++) {
    const { end, controlStart, controlEnd } = smoothControls(points, index);
    path += ` C${controlStart.x},${controlStart.y} ${controlEnd.x},${controlEnd.y} ${end.x},${end.y}`;
  }
  return path;
}

function smoothPointAtX(points: Array<{ x: number; y: number }>, targetX: number) {
  if (points.length < 2) return points[0] ?? { x: targetX, y: 0 };
  let lowIndex = 0, highIndex = points.length - 1;
  while (highIndex - lowIndex > 1) {
    const middle = Math.floor((lowIndex + highIndex) / 2);
    if (points[middle].x <= targetX) lowIndex = middle;
    else highIndex = middle;
  }
  const index = lowIndex;
  const { start, end, controlStart, controlEnd } = smoothControls(points, index);
  const cubic = (a: number, b: number, c: number, d: number, t: number) => {
    const inverse = 1 - t;
    return inverse ** 3 * a + 3 * inverse ** 2 * t * b + 3 * inverse * t ** 2 * c + t ** 3 * d;
  };
  // With the horizontal controls at one-third and two-thirds, x is linear in t.
  const t = Math.max(0, Math.min(1, (targetX - start.x) / (end.x - start.x)));
  return { x: targetX, y: cubic(start.y, controlStart.y, controlEnd.y, end.y, t) };
}

function goldQuoteAtOrBefore(time: number, timeline: GoldPricePoint[]) {
  if (time <= timeline[0].time) return timeline[0];
  let low = 0, high = timeline.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (timeline[middle].time <= time) low = middle;
    else high = middle;
  }
  return timeline[high].time <= time ? timeline[high] : timeline[low];
}

function goldWindowStart(endTime: number, months: number, timeline: GoldPricePoint[]) {
  const end = new Date(endTime);
  const monthStart = Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months, 1);
  const startMonth = new Date(monthStart);
  const lastDay = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + 1, 0)).getUTCDate();
  const target = Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth(), Math.min(end.getUTCDate(), lastDay));
  return goldQuoteAtOrBefore(target, timeline).time;
}

function goldTangents(timeline: GoldPricePoint[]) {
  const slopes = timeline.slice(0, -1).map((point, index) =>
    (timeline[index + 1].value - point.value) / (timeline[index + 1].time - point.time));
  return timeline.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === timeline.length - 1) return slopes.at(-1)!;
    const before = slopes[index - 1], after = slopes[index];
    if (before === 0 || after === 0 || Math.sign(before) !== Math.sign(after)) return 0;
    const beforeSpan = timeline[index].time - timeline[index - 1].time;
    const afterSpan = timeline[index + 1].time - timeline[index].time;
    const beforeWeight = 2 * afterSpan + beforeSpan;
    const afterWeight = afterSpan + 2 * beforeSpan;
    return (beforeWeight + afterWeight) / (beforeWeight / before + afterWeight / after);
  });
}

function goldPriceAt(time: number, timeline: GoldPricePoint[], tangents: number[]) {
  if (time <= timeline[0].time) return timeline[0].value;
  if (time >= timeline.at(-1)!.time) return timeline.at(-1)!.value;
  let low = 0, high = timeline.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (timeline[middle].time <= time) low = middle;
    else high = middle;
  }
  const start = timeline[low], end = timeline[high];
  const span = end.time - start.time, progress = (time - start.time) / span;
  const square = progress * progress, cube = square * progress;
  return (2 * cube - 3 * square + 1) * start.value
    + (cube - 2 * square + progress) * span * tangents[low]
    + (-2 * cube + 3 * square) * end.value
    + (cube - square) * span * tangents[high];
}

function goldReturnPercent(value: number, startingValue: number) {
  return Math.round((value / startingValue - 1) * 100);
}

function goldPriceExtrema(start: number, timeline: GoldPricePoint[], tangents: number[]) {
  let minimum = goldPriceAt(start, timeline, tangents);
  let maximum = minimum;
  let minimumTime = start, maximumTime = start;
  for (const point of timeline) if (point.time > start) {
    if (point.value < minimum) { minimum = point.value; minimumTime = point.time; }
    if (point.value > maximum) { maximum = point.value; maximumTime = point.time; }
  }
  return { minimum, maximum, minimumTime, maximumTime };
}

function MobileReturnCalculator({ priceRatio, principal }: { priceRatio: number; principal: number | null }) {
  const changePercent = (priceRatio - 1) * 100;
  const roundedPercent = Math.round(changePercent * 10) / 10 || 0;
  const potentialChange = principal === null ? null : Math.round(principal * (priceRatio - 1));
  const percentFormatter = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="mobile-return-calculator">
      <div className="mobile-return-summary" aria-live="polite">
        <div className="mobile-return-summary-row">
          <span>Доходность за период</span>
          <strong className={roundedPercent < 0 ? 'negative' : roundedPercent === 0 ? 'neutral' : 'positive'}>
            {roundedPercent > 0 ? '+' : ''}{percentFormatter.format(roundedPercent)}%
          </strong>
        </div>
        <div className="mobile-return-summary-row">
          <span>{potentialChange !== null && potentialChange < 0 ? 'Могли потерять' : 'Могли заработать'}</span>
          <strong className={potentialChange === null || potentialChange === 0 ? 'neutral' : potentialChange < 0 ? 'negative' : 'positive'}>
            {potentialChange === null ? '—' : `${potentialChange > 0 ? '+' : ''}${money.format(potentialChange)} ₽`}
          </strong>
        </div>
      </div>
      <Link className="mobile-return-buy" href="/#catalog">Купить золото</Link>
    </div>
  );
}

type PriceChartProps = {
  showMobileCalculator?: boolean;
  period?: string;
  onPeriodChange?: (period: string) => void;
  timeline?: GoldPricePoint[];
};

function PriceChart({ showMobileCalculator = false, period, onPeriodChange, timeline }: PriceChartProps) {
  const svgId = useId().replace(/:/g, '');
  const fillId = `${svgId}-gold-price-fill`;
  const scrubId = `${svgId}-gold-price-scrub`;
  const plotId = `${svgId}-gold-price-plot`;
  const entryId = `${svgId}-gold-price-entry`;
  const [fetchedGoldState, setFetchedGoldState] = useState({ timeline: initialGoldTimeline, ready: false });
  const goldTimeline = timeline ?? fetchedGoldState.timeline;
  const liveDataReady = timeline !== undefined || fetchedGoldState.ready;
  const tangents = useMemo(() => goldTangents(goldTimeline), [goldTimeline]);
  const endTime = goldTimeline.at(-1)!.time;
  const [analysisView, setAnalysisView] = useState<'history' | 'compare' | 'chart'>('chart');
  const [investment, setInvestment] = useState('1000000');
  const investmentPrincipal = investment ? Number(investment) : null;
  const goldPriceWindows = useMemo(() => goldPriceWindowDefinitions.map((option) => ({
    ...option,
    start: goldWindowStart(endTime, option.months, goldTimeline),
  })), [endTime, goldTimeline]);
  // Use a sparse, fixed rendering grid throughout a window transition so
  // minor daily fluctuations do not make the curve jagged or shimmer.
  // Keep each selectable window's true extrema in the visual path.
  const chartSampleTimes = useMemo(() => {
    const firstTime = goldTimeline[0].time;
    const day = 24 * 60 * 60 * 1000;
    const times = [firstTime, endTime];
    for (let time = endTime; time > firstTime;) {
      const age = endTime - time;
      const step = age < 180 * day ? 20 : age < 365 * day ? 30 : age < 5 * 365 * day ? 90 : 180;
      time -= step * day;
      if (time > firstTime) times.push(time);
    }
    for (const option of goldPriceWindows) {
      const extrema = goldPriceExtrema(option.start, goldTimeline, tangents);
      times.push(option.start, extrema.minimumTime, extrema.maximumTime);
    }
    return [...new Set(times)].sort((a, b) => a - b);
  }, [goldTimeline, endTime, goldPriceWindows, tangents]);
  const [selected, setSelected] = useState<{ x: number; y: number; time: number; value: number; cursorX: number; cursorY: number; badgeAbove: boolean } | null>(null);
  const [ownActivePeriod, setOwnActivePeriod] = useState('5y');
  const activePeriod = period ?? ownActivePeriod;
  const [showLoader, setShowLoader] = useState(false);
  const [loaderReady, setLoaderReady] = useState(liveDataReady);
  const loaderShownAt = useRef<number | null>(null);
  useEffect(() => {
    if (!liveDataReady) {
      setLoaderReady(false);
      const timer = window.setTimeout(() => {
        loaderShownAt.current = performance.now();
        setShowLoader(true);
      }, 300);
      return () => window.clearTimeout(timer);
    }
    const remaining = loaderShownAt.current === null
      ? 0 : Math.max(0, 500 - (performance.now() - loaderShownAt.current));
    const finish = () => {
      setShowLoader(false);
      setLoaderReady(true);
      loaderShownAt.current = null;
    };
    if (remaining === 0) { finish(); return; }
    const timer = window.setTimeout(finish, remaining);
    return () => window.clearTimeout(timer);
  }, [liveDataReady]);
  const [entryPhase, setEntryPhase] = useState<'waiting' | 'drawing' | 'done'>('waiting');
  const [startDateTransition, setStartDateTransition] = useState<{ from: number; to: number; viewFrom: number; fromMonths: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartClientWidth, setChartClientWidth] = useState(1000);
  const [currentBadgeWidth, setCurrentBadgeWidth] = useState(90);
  const [hoverBadgeWidth, setHoverBadgeWidth] = useState(112);
  const [mobileViewport, setMobileViewport] = useState(false);
  const [view, setView] = useState<{ start: number; minimum?: number; maximum?: number }>(() => {
    const startingTimeline = timeline ?? initialGoldTimeline;
    const months = goldPriceWindowDefinitions.find((option) => option.value === (period ?? '5y'))?.months ?? 60;
    const start = goldWindowStart(startingTimeline.at(-1)!.time, months, startingTimeline);
    return { start };
  });
  const viewRef = useRef(view);
  const activeOption = goldPriceWindows.find((option) => option.value === activePeriod)!;
  const comparisonStartTime = goldWindowStart(comparisonEndTime, activeOption.months, goldTimeline);
  const comparisonGoldReturn = (goldPriceAt(comparisonEndTime, goldTimeline, tangents) / goldPriceAt(comparisonStartTime, goldTimeline, tangents) - 1) * 100;
  const left = 8, width = 1000, top = 16, bottom = 54, height = 400;
  const badgeGap = mobileViewport ? 16 : 40;
  // The badge ends 8px past the right-aligned minimum and maximum labels.
  // Measuring its width also lets the graph use all available horizontal space.
  const right = (currentBadgeWidth + badgeGap - 8) * width / chartClientWidth;
  const pointTimes = [
    view.start,
    ...chartSampleTimes.filter((time) => time > view.start && time < endTime),
    endTime,
  ];
  const sampledPrices = pointTimes.map((time) => goldPriceAt(time, goldTimeline, tangents));
  const visibleExtrema = sampledPrices.reduce((result, price) => {
    if (price < result.minimum) result.minimum = price;
    if (price > result.maximum) result.maximum = price;
    return result;
  }, { minimum: sampledPrices[0], maximum: sampledPrices[0] });
  const { minimum, maximum } = visibleExtrema;
  const axisMinimum = view.minimum ?? Math.floor(minimum / 100) * 100;
  const axisMaximum = view.maximum ?? Math.max(axisMinimum + 100, Math.ceil(maximum / 100) * 100);
  const y = (value: number) => top + (height - top - bottom) * (axisMaximum - value) / (axisMaximum - axisMinimum);
  const currentPrice = goldTimeline.at(-1)!.value;
  const priceRatio = currentPrice / goldPriceAt(activeOption.start, goldTimeline, tangents);
  const isProfitable = priceRatio > 1;
  const points = pointTimes.map((time, index) => ({
    x: left + (width - left - right) * (time - view.start) / (endTime - view.start),
    y: y(sampledPrices[index]),
  }));
  // On mobile, draw a short stretch of earlier history past the screen edge.
  // The selected window and its first date still begin at `left`.
  const visualStartX = mobileViewport ? -32 * width / chartClientWidth : left;
  // Transform one fixed historical curve rather than rebuilding a synthetic
  // left endpoint from each intermediate day's price. Keeping the offscreen
  // neighbours also keeps spline tangents stable as samples cross the edge.
  const visualPoints = chartSampleTimes.map((time) => ({
    x: left + (width - left - right) * (time - view.start) / (endTime - view.start),
    y: y(goldPriceAt(time, goldTimeline, tangents)),
  }));
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const badge = chart.querySelector('.chart-current-price-badge');
    const observer = new ResizeObserver(([entry]) => {
      setChartClientWidth(Math.max(entry.contentRect.width, 1));
      setMobileViewport(window.matchMedia('(max-width: 560px)').matches);
      setSelected(null);
    });
    const badgeObserver = new ResizeObserver(([entry]) => {
      setCurrentBadgeWidth(entry.target.getBoundingClientRect().width);
    });
    const probe = chart.querySelector('.hover-date-width-probe');
    const probeObserver = new ResizeObserver(([entry]) => {
      setHoverBadgeWidth(Math.ceil(entry.target.getBoundingClientRect().width) + 16);
    });
    if (probe) probeObserver.observe(probe);
    observer.observe(chart);
    if (badge) badgeObserver.observe(badge);
    return () => {
      observer.disconnect();
      badgeObserver.disconnect();
      probeObserver.disconnect();
    };
  }, []);
  useEffect(() => {
    if (entryPhase !== 'waiting' || !liveDataReady || !loaderReady) return;
    const chart = chartRef.current;
    if (!chart) return;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frame = requestAnimationFrame(() => setEntryPhase('done'));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < .2) return;
      observer.disconnect();
      setEntryPhase('drawing');
    }, { threshold: .2, rootMargin: '0px 0px -10% 0px' });
    observer.observe(chart);
    return () => observer.disconnect();
  }, [entryPhase, liveDataReady, loaderReady]);
  useEffect(() => {
    if (entryPhase !== 'drawing') return;
    const completionTimer = window.setTimeout(() => setEntryPhase('done'), 1700);
    return () => window.clearTimeout(completionTimer);
  }, [entryPhase]);
  useEffect(() => {
    if (timeline) return;
    const controller = new AbortController();
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    const delay = new URLSearchParams(window.location.search).get('slow') === '5' ? 5000 : 0;
    const minimumDelay = new Promise<void>((resolve) => { delayTimer = setTimeout(resolve, delay); });
    const request = fetch('/api/gold-prices', { signal: controller.signal })
      .then((response): Promise<{ prices?: Array<[number, number]> } | null> => response.ok ? response.json() : Promise.resolve(null))
      .catch(() => null);
    Promise.all([request, minimumDelay]).then(([data]) => data)
      .then((data: { prices?: Array<[number, number]> } | null) => {
        if (controller.signal.aborted) return;
        if (!data?.prices?.length) {
          setFetchedGoldState((current) => ({ ...current, ready: true }));
          return;
        }
        setFetchedGoldState((current) => {
          const byDate = new Map(current.timeline.map((point) => [point.time, point.value]));
          for (const [time, value] of data.prices!) {
            if (Number.isFinite(time) && Number.isFinite(value) && value > 0) byDate.set(time, value);
          }
          const next = Array.from(byDate, ([time, value]) => ({ time, value })).sort((a, b) => a.time - b.time);
          return { timeline: next, ready: true };
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFetchedGoldState((current) => ({ ...current, ready: true }));
      }); // Keep the last verified CBR snapshot if the live feed is unavailable.
    return () => { controller.abort(); clearTimeout(delayTimer); };
  }, [timeline]);
  useEffect(() => {
    const targetTimes = [activeOption.start, ...chartSampleTimes.filter((time) => time > activeOption.start && time < endTime), endTime];
    const targetPrices = targetTimes.map((time) => goldPriceAt(time, goldTimeline, tangents));
    const targetMinimum = Math.floor(Math.min(...targetPrices) / 100) * 100;
    const targetMaximum = Math.max(targetMinimum + 100, Math.ceil(Math.max(...targetPrices) / 100) * 100);
    const target = { start: activeOption.start, minimum: targetMinimum, maximum: targetMaximum };
    const source = { ...viewRef.current, minimum: axisMinimum, maximum: axisMaximum };
    if (source.start === target.start) {
      viewRef.current = target;
      setView(target);
      setStartDateTransition(null);
      return;
    }
    if (entryPhase === 'waiting') {
      viewRef.current = target;
      setView(target);
      setStartDateTransition(null);
      return;
    }
    const startTime = performance.now();
    const sourceWindow = Math.max(endTime - source.start, 1);
    const targetWindow = Math.max(endTime - target.start, 1);
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0 : 750;
    let frame = 0;
    const animate = (now: number) => {
      const progress = duration === 0 ? 1 : Math.min(1, (now - startTime) / duration);
      // Liveline uses one cosine easing for both the logarithmic time zoom
      // and the price range, completing all window changes in 750ms.
      const eased = (1 - Math.cos(progress * Math.PI)) / 2;
      // Match Liveline's time-window zoom: interpolate the duration in log
      // space so the visible history grows by a steady ratio, not by years.
      const windowSize = Math.exp(Math.log(sourceWindow) + (Math.log(targetWindow) - Math.log(sourceWindow)) * eased);
      viewRef.current = progress === 1 ? target : {
        start: endTime - windowSize,
        minimum: source.minimum + (target.minimum - source.minimum) * eased,
        maximum: source.maximum + (target.maximum - source.maximum) * eased,
      };
      setView(viewRef.current);
      if (progress < 1) frame = requestAnimationFrame(animate);
      else setStartDateTransition(null);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  // Refresh the viewport when a time window or the latest CBR quote changes.
  }, [activePeriod, goldTimeline, tangents, activeOption.start, endTime, entryPhase]);
  const changePeriod = (period: string) => {
    if (period === activePeriod) return;
    const nextOption = goldPriceWindows.find((option) => option.value === period);
    if (!nextOption) return;
    setStartDateTransition({ from: activeOption.start, to: nextOption.start, viewFrom: viewRef.current.start, fromMonths: activeOption.months });
    if (entryPhase === 'drawing') setEntryPhase('done');
    if (onPeriodChange) onPeriodChange(period);
    else setOwnActivePeriod(period);
    setSelected(null);
  };
  const dateDividerY = height - 34;
  const linePath = smoothPath(visualPoints), baseline = dateDividerY;
  const areaPath = `${linePath} L${points.at(-1)!.x},${baseline} L${visualPoints[0].x},${baseline} Z`;
  const latestPoint = points.at(-1)!;
  const entryClipWidth = latestPoint.x - visualStartX + 4;
  const entryStartScale = (left - visualStartX + 2) / entryClipWidth;
  const markersForCount = (count: number) => Array.from({ length: count }, (_, index) => {
    const fraction = (index + 1) / (count + 1);
    const time = view.start + (endTime - view.start) * fraction;
    const x = left + (latestPoint.x - left) * fraction;
    const value = goldQuoteAtOrBefore(time, goldTimeline).value;
    const change = goldReturnPercent(value, sampledPrices[0]);
    return { x, y: smoothPointAtX(visualPoints, x).y, time, value, change };
  });
  const intermediateMarkers = !mobileViewport && !startDateTransition
    ? goldAxisMarks(view.start, endTime, activeOption.months, false).slice(1).map(({ time }) => {
      const x = left + (latestPoint.x - left) * (time - view.start) / (endTime - view.start);
      const value = goldQuoteAtOrBefore(time, goldTimeline).value;
      return { x, y: smoothPointAtX(visualPoints, x).y, time, value, change: goldReturnPercent(value, sampledPrices[0]) };
    })
    : markersForCount(3);
  const visibleMarkers = mobileViewport ? markersForCount(2) : intermediateMarkers;
  const transitionProgress = startDateTransition ? (() => {
    const from = Math.log(endTime - startDateTransition.viewFrom);
    const to = Math.log(endTime - startDateTransition.to);
    return Math.max(0, Math.min(1, (Math.log(endTime - view.start) - from) / (to - from)));
  })() : 1;
  const axisIntervals = mobileViewport ? 3 : 4;
  const compactDates = mobileViewport;
  const targetDateMarks = goldAxisMarks(activeOption.start, endTime, activeOption.months, compactDates);
  const sourceDateMarks = startDateTransition
    ? goldAxisMarks(startDateTransition.from, endTime, startDateTransition.fromMonths, compactDates)
    : targetDateMarks;
  const projectDate = (time: number) => left + (latestPoint.x - left) * (time - view.start) / (endTime - view.start);
  const dateEdgeOpacity = (x: number) => Math.max(0, Math.min(1,
    1 + (x - left) * chartClientWidth / width / 24,
    ((latestPoint.x - x) * chartClientWidth / width - (compactDates ? 64 : 140)) / 32,
  ));
  const dateSpacingOpacity = (start: number) => {
    const spacing = (latestPoint.x - left) * (endTime - start) / (endTime - view.start) / axisIntervals * chartClientWidth / width;
    return Math.max(0, Math.min(1, (spacing - (compactDates ? 52 : 100)) / 24));
  };
  const animatedDateMarks = targetDateMarks.flatMap((mark, index) => {
    const previous = sourceDateMarks[index] ?? mark;
    const changing = startDateTransition !== null && previous.time !== mark.time;
    const x = projectDate(mark.time);
    const current = { ...mark, key: `target-${index}`, index, x, opacity: changing ? transitionProgress * dateEdgeOpacity(x) * dateSpacingOpacity(activeOption.start) : 1, outgoing: false };
    if (!changing) return [current];
    const sourceX = projectDate(previous.time);
    return [{ ...previous, key: `source-${index}`, index, x: sourceX, opacity: Math.max(0, 1 - transitionProgress / .65) * dateEdgeOpacity(sourceX) * dateSpacingOpacity(startDateTransition!.from), outgoing: true }, current];
  });
  const currentGuideEndX = latestPoint.x + badgeGap * width / chartClientWidth;
  const highLabelY = y(axisMaximum);
  const lowLabelY = y(axisMinimum);
  const scrubX = selected?.x ?? width;
  const hasFadedRight = selected !== null && selected.x < latestPoint.x;
  const selectedReturnPercent = selected ? goldReturnPercent(selected.value, sampledPrices[0]) : 0;
  const updateSelection = (event: React.PointerEvent<SVGSVGElement>) => {
    if (entryPhase !== 'done') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const cursorX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const cursorY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const chartX = cursorX / rect.width * width;
    // The latest price already has a permanent badge; exclude its hit area.
    if (chartX >= latestPoint.x - 8 * width / rect.width) {
      setSelected(null);
      return;
    }
    const targetX = Math.max(left, chartX);
    const anchors = [
      { x: left, time: view.start, value: sampledPrices[0] },
      ...visibleMarkers,
    ];
    const nearest = anchors.reduce((closest, anchor) =>
      Math.abs(anchor.x - targetX) < Math.abs(closest.x - targetX) ? anchor : closest);
    const snapped = event.pointerType === 'mouse' && Math.abs(nearest.x - targetX) <= 8 * width / rect.width ? nearest : null;
    const selectedX = snapped?.x ?? targetX;
    const point = smoothPointAtX(visualPoints, selectedX);
    const selectedTime = snapped?.time ?? view.start + (endTime - view.start) * (selectedX - left) / (width - left - right);
    setSelected({
      x: point.x,
      y: point.y,
      cursorX,
      cursorY,
      badgeAbove: event.pointerType !== 'mouse' || cursorY > rect.height - 100,
      time: selectedTime,
      value: snapped?.value ?? goldQuoteAtOrBefore(selectedTime, goldTimeline).value,
    });
  };
  return (
    <div className={`price-analysis${showMobileCalculator ? '' : ' no-tabs'}`}>
    <div className={`price-chart-layout${showMobileCalculator ? ' with-calculator' : ''}`} data-profitable={isProfitable ? '' : undefined} data-entry={entryPhase} data-morphing={startDateTransition ? '' : undefined}>
    <div className="chart-panel price-chart-panel">
      <div className="price-window-row">
        <div className="price-window-list" role="group" aria-label="Период графика">
          {goldPriceWindows.map((option) => {
            const returnPercent = goldReturnPercent(currentPrice, goldPriceAt(option.start, goldTimeline, tangents));
            return <button className="price-window-button" data-active={activePeriod === option.value ? '' : undefined} type="button" aria-pressed={activePeriod === option.value} onClick={() => changePeriod(option.value)} key={option.value}>
              {activePeriod === option.value ? `За ${option.label}` : option.label}{activePeriod === option.value && (loaderReady
                ? <span className={`price-window-return${returnPercent < 0 ? ' negative' : returnPercent === 0 ? ' neutral' : ''}`}>{returnPercent > 0 ? '+' : ''}{returnPercent}%</span>
                : showLoader ? <span className="price-window-return is-loading" role="status" aria-label="Загружается доходность"><span className="price-window-spinner" aria-hidden="true" /></span> : null)}
            </button>;
          })}
        </div>
      </div>
      <div className="liveline-chart" ref={chartRef} aria-busy={entryPhase === 'waiting'}>
        {showLoader && entryPhase === 'waiting' && <div className="chart-loading" role="status" aria-label="Загружаются цены золота">
          <svg className="chart-loading-line" viewBox="0 0 700 40" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 20 C58 20 58 10 116 10 S174 30 232 30 S290 10 348 10 S406 30 464 30 S522 10 580 10 S642 20 700 20" />
          </svg>
        </div>}
        <svg className="price-chart" viewBox="0 0 1000 400" preserveAspectRatio="none" role="img" aria-label={`Динамика цены золота за период ${formatMilestoneDate(view.start)} — ${formatMilestoneDate(endTime)}`} onPointerMove={(event) => { if (event.pointerType === 'mouse' || event.currentTarget.hasPointerCapture(event.pointerId)) updateSelection(event); }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); updateSelection(event); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); if (event.pointerType !== 'mouse') setSelected(null); }} onLostPointerCapture={(event) => { if (event.pointerType !== 'mouse') setSelected(null); }} onPointerCancel={() => setSelected(null)} onPointerLeave={(event) => { if (event.pointerType === 'mouse') setSelected(null); }}>
          <defs>
            <linearGradient id={fillId} gradientUnits="userSpaceOnUse" x1="0" y1={top} x2="0" y2={dateDividerY}>
              <stop offset="0%" stopColor={isProfitable ? '#36c578' : '#d8e4f6'} stopOpacity={isProfitable ? .2 : 1} />
              <stop offset="100%" stopColor={isProfitable ? '#36c578' : '#d8e4f6'} stopOpacity="0" />
            </linearGradient>
            <clipPath id={scrubId}>
              <rect x={mobileViewport ? visualStartX - 2 : 0} y="0" width={mobileViewport ? scrubX - visualStartX + 3 : scrubX + 1} height={height} />
            </clipPath>
            <clipPath id={plotId}>
              <rect x={visualStartX - 2} y={top - 2} width={width - visualStartX - right + 4} height={dateDividerY - top + 2} />
            </clipPath>
            <clipPath id={entryId} clipPathUnits="userSpaceOnUse">
              <rect className="chart-entry-clip" x={visualStartX - 2} y="0" width={entryClipWidth} height={height} style={{ '--chart-entry-start-scale': entryStartScale } as CSSProperties} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${entryId})`}>
            <g clipPath={`url(#${plotId})`}>
              <path className="liveline-area liveline-area-muted" d={areaPath} fill={`url(#${fillId})`} />
              <path className="liveline-area liveline-area-active" d={areaPath} fill={`url(#${fillId})`} clipPath={`url(#${scrubId})`} />
            </g>
          </g>
          <g className="chart-entry-svg-data">
            {[{ x: left, y: points[0].y }, ...visibleMarkers].map((marker, index) => (
              <g key={index}>
                <defs>
                  <clipPath id={`${entryId}-guide-${index}`} clipPathUnits="userSpaceOnUse">
                    <rect className="chart-guide-reveal" x={marker.x - 2} y={marker.y + 8} width={4} height={Math.max(0, dateDividerY - marker.y - 8)} />
                  </clipPath>
                </defs>
                <line className={`chart-intermediate-guide${mobileViewport ? ' mobile-guide' : ''}${selected ? ' is-scrubbing' : ''}`} x1={marker.x} x2={marker.x} y1={marker.y + 8} y2={dateDividerY} clipPath={`url(#${entryId}-guide-${index})`} />
              </g>
            ))}
            <line className={`chart-current-guide${hasFadedRight ? ' muted' : ''}`} x1={left} x2={currentGuideEndX} y1={latestPoint.y} y2={latestPoint.y} />
          </g>
          <g clipPath={`url(#${entryId})`}>
            <g clipPath={`url(#${plotId})`}>
              <path className="price-line gold-price-line gold-price-line-muted" d={linePath} />
              <path className="price-line gold-price-line gold-price-line-active" d={linePath} clipPath={`url(#${scrubId})`} />
            </g>
          </g>
          <g className="chart-entry-svg-data">
            <line className="chart-date-divider" x1={left} x2={latestPoint.x} y1={dateDividerY} y2={dateDividerY} />
            {animatedDateMarks.filter((mark) => mark.x >= left && mark.x <= latestPoint.x).map((mark) => (
              <line className="chart-date-tick" x1={mark.x} x2={mark.x} y1={dateDividerY} y2={dateDividerY + 6} style={{ opacity: mark.opacity }} key={mark.key} />
            ))}
            <line className="chart-date-tick" x1={latestPoint.x} x2={latestPoint.x} y1={dateDividerY} y2={dateDividerY + 6} />
            {selected !== null && <line className="liveline-crosshair" x1={selected.x} x2={selected.x} y1={top} y2={dateDividerY} />}
          </g>
          <rect x="0" y="0" width={latestPoint.x} height={height} fill="transparent" pointerEvents={entryPhase === 'done' ? 'all' : 'none'} />
        </svg>
        <div
          className={`chart-intermediate-marker start${mobileViewport ? ' mobile-marker' : ''}${selected ? ' is-scrubbing' : ''}`}
          style={{ left: `${left / width * 100}%`, top: `${points[0].y / height * 100}%` }}
          aria-label={`${formatHoverDate(view.start)}: ${money.format(sampledPrices[0])} рублей за грамм, начало периода`}
        >
          <span className="chart-intermediate-point" aria-hidden="true" />
          <span className="chart-intermediate-label" style={{ opacity: entryPhase === 'done' ? 1 : 0 }} aria-hidden="true">
            <strong>{money.format(Math.round(sampledPrices[0]))} ₽</strong>
          </span>
        </div>
        <div className="chart-entry-overlays" aria-hidden={entryPhase !== 'done'}>
        {visibleMarkers.map((marker, index) => (
          <div
            className={`chart-intermediate-marker${mobileViewport ? ' mobile-marker' : ''}${!mobileViewport && index % 2 ? ' staggered' : ''}${mobileViewport && marker.y < 90 ? ' label-below' : ''}${selected ? ' is-scrubbing' : ''}`}
            style={{ left: `${marker.x / width * 100}%`, top: `${marker.y / height * 100}%` }}
            aria-label={`${formatHoverDate(marker.time)}: ${money.format(marker.value)} рублей за грамм, ${marker.change > 0 ? 'рост' : marker.change < 0 ? 'снижение' : 'изменение'} на ${Math.abs(marker.change)}% с начала периода`}
            key={index}
          >
            <span className="chart-intermediate-point" aria-hidden="true" />
            <span className="chart-intermediate-label" aria-hidden="true">
              <strong>{money.format(Math.round(marker.value))} ₽</strong>
              <span className={`chart-intermediate-change${marker.change < 0 ? ' negative' : marker.change === 0 ? ' neutral' : ''}`}>
                {marker.change > 0 ? '+' : marker.change < 0 ? '-' : ''}{Math.abs(marker.change)}%
              </span>
            </span>
          </div>
        ))}
        <span className="chart-extreme-price" style={{ top: `${highLabelY / height * 100}%` }}>{money.format(axisMaximum)} ₽</span>
        <div className={`chart-current-indicator${hasFadedRight ? ' muted' : ''}${selected ? ' is-scrubbing' : ''}`} style={{ left: `${latestPoint.x / width * 100}%`, top: `${latestPoint.y / height * 100}%` }} aria-label={`Актуальная цена ${money.format(currentPrice)} рублей за грамм`}>
          <span className="chart-current-point" aria-hidden="true" />
          <Badge variant="secondary" className="chart-current-price-badge">{money.format(currentPrice)} ₽</Badge>
        </div>
        <span className="chart-extreme-price" style={{ top: `${lowLabelY / height * 100}%` }}>{money.format(axisMinimum)} ₽</span>
        <div className="chart-timeline-labels">
        {animatedDateMarks.map((mark) => (
          <span key={mark.key} className={`chart-milestone-date ${mark.index === 0 ? 'start' : 'tick'}`} style={{ left: `${mark.x / width * 100}%`, opacity: mark.opacity }} aria-hidden={mark.outgoing || undefined}>{mark.label}</span>
        ))}
        <span className={`chart-milestone-date current${hasFadedRight ? ' muted' : ''}`} style={{ left: `${latestPoint.x / width * 100}%` }}>{mobileViewport ? formatMobileAxisDate(endTime) : formatCurrentAxisDate(endTime)}</span>
        </div>
        <span className="hover-date-width-probe" aria-hidden="true">
          {Array.from({ length: 12 }, (_, month) => <span key={month}>{formatHoverDate(Date.UTC(2024, month, 28))}</span>)}
        </span>
        {selected !== null && <div className="chart-hover-marker" style={{ left: `${selected.x / width * 100}%`, top: `${selected.y / height * 100}%` }} aria-hidden="true">
          <span className="chart-intermediate-point" />
        </div>}
        {selected !== null && <div className="liveline-badge point-anchored" style={{ width: hoverBadgeWidth, left: Math.max(8, Math.min(chartClientWidth - hoverBadgeWidth - 8, selected.cursorX - hoverBadgeWidth / 2)), top: selected.cursorY, transform: selected.badgeAbove ? 'translateY(calc(-100% - 16px))' : 'translateY(14px)' }}>
          <strong>{money.format(selected.value)} ₽</strong>
          <span className={`liveline-badge-return${selectedReturnPercent < 0 ? ' negative' : selectedReturnPercent === 0 ? ' neutral' : ''}`}>
            {selectedReturnPercent > 0 ? '+' : ''}{selectedReturnPercent}%
          </span>
          <time dateTime={new Date(selected.time).toISOString()}>{formatHoverDate(selected.time)}</time>
        </div>}
        </div>
      </div>
      <p className="price-chart-disclaimer">Не является инвестиционной рекомендацией. Доходность в прошлом не гарантирует доходность в будущем</p>
    </div>
    {showMobileCalculator && <section className="mobile-return-section" aria-labelledby="mobile-return-title">
      <h3 id="mobile-return-title">Как менялась цена золота</h3>
      <p className="mobile-return-subtitle">Рассчитайте историческую доходность и сравните золото с долларом, акциями и вкладом</p>
      <div className="mobile-return-tabs price-window-list" role="tablist" aria-labelledby="mobile-return-title">
        <button id="mobile-chart-tab" className="price-window-button" data-active={analysisView === 'chart' ? '' : undefined} type="button" role="tab" aria-selected={analysisView === 'chart'} aria-controls="mobile-chart-panel" onClick={() => { setAnalysisView('chart'); setSelected(null); }}>График</button>
        <button id="mobile-return-tab" className="price-window-button" data-active={analysisView === 'history' ? '' : undefined} type="button" role="tab" aria-selected={analysisView === 'history'} aria-controls="mobile-return-panel" onClick={() => setAnalysisView('history')}>Доходность</button>
        <button id="mobile-comparison-tab" className="price-window-button" data-active={analysisView === 'compare' ? '' : undefined} type="button" role="tab" aria-selected={analysisView === 'compare'} aria-controls="mobile-comparison-panel" onClick={() => { setAnalysisView('compare'); setSelected(null); }}>Сравнение</button>
      </div>
      {analysisView !== 'chart' && <>
      <fieldset className="mobile-return-period-group" aria-label={analysisView === 'history' ? 'Период вложения' : 'Период сравнения'}>
        <div className="price-window-list mobile-return-periods">
          {goldPriceWindows.map((option) => {
            const returnPercent = goldReturnPercent(currentPrice, goldPriceAt(option.start, goldTimeline, tangents));
            return <button className="price-window-button" data-active={activePeriod === option.value ? '' : undefined} type="button" aria-pressed={activePeriod === option.value} onClick={() => changePeriod(option.value)} key={option.value}>
              {activePeriod === option.value ? `За ${option.label}` : option.label}{activePeriod === option.value && <span className={`price-window-return${returnPercent < 0 ? ' negative' : returnPercent === 0 ? ' neutral' : ''}`}>{returnPercent > 0 ? '+' : ''}{returnPercent}%</span>}
            </button>;
          })}
        </div>
      </fieldset>
      <label className="mobile-return-amount">
        <span>Сумма вложения</span>
        <span className="mobile-return-amount-entry">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Сумма вложения в рублях"
            value={investment ? money.format(Number(investment)) : ''}
            onChange={(event) => setInvestment(event.target.value.replace(/\D/g, '').slice(0, 12))}
          />
          <span aria-hidden="true">₽</span>
        </span>
        {investmentPrincipal !== null && investmentPrincipal > 0 && <Check className="mobile-return-valid" size={20} strokeWidth={3} aria-hidden="true" />}
      </label>
      </>}
      <div id="mobile-return-panel" className="mobile-return-panel" role="tabpanel" aria-labelledby="mobile-return-tab" hidden={analysisView !== 'history'}>
        <MobileReturnCalculator priceRatio={priceRatio} principal={investmentPrincipal} />
      </div>
      <div id="mobile-comparison-panel" className="mobile-return-panel" role="tabpanel" aria-labelledby="mobile-comparison-tab" hidden={analysisView !== 'compare'}>
        <AssetComparison activePeriod={activePeriod} onPeriodChange={changePeriod} goldReturn={comparisonGoldReturn} showPeriodSelector={false} showHeader={false} principal={investmentPrincipal} />
      </div>
      <div id="mobile-chart-panel" className="mobile-return-panel mobile-return-chart-panel" role="tabpanel" aria-labelledby="mobile-chart-tab" hidden={analysisView !== 'chart'}>
        {analysisView === 'chart' && <PriceChart period={activePeriod} onPeriodChange={changePeriod} timeline={goldTimeline} />}
      </div>
    </section>}
    </div>
    </div>
  );
}

function ReturnChart({ onShowPrice }: { onShowPrice: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const defaultPrincipal = 50000;
  const sourcePrincipal = 100000;
  const presetAmounts = [50000, 100000, 500000, 1000000];
  const [principal, setPrincipal] = useState(defaultPrincipal);
  const [customAmount, setCustomAmount] = useState(String(defaultPrincipal));
  const [amountDialogOpen, setAmountDialogOpen] = useState(false);
  const adjustedPoints = returnPoints.map((value) => Math.round(value * principal / sourcePrincipal));
  const peakValue = Math.max(...adjustedPoints, principal, 1000);
  const chartStep = 10 ** Math.floor(Math.log10(peakValue)) / 2;
  const maximum = Math.ceil(peakValue / chartStep) * chartStep;
  const gridValues = [1, 2, 3, 4].map((step) => maximum * step / 4);
  const formatGridValue = (value: number) => value >= 1000000
    ? `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value / 1000000)}М ₽`
    : `${money.format(Math.round(value / 1000))}К ₽`;
  const choosePrincipal = (value: number) => {
    setPrincipal(value);
    setSelected(null);
  };
  const openCustomAmount = () => {
    setCustomAmount(String(principal));
  };
  const applyCustomAmount = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextValue = Math.min(Number(customAmount.replace(/\D/g, '')) || 0, 99999999);
    if (!nextValue) return;
    choosePrincipal(nextValue);
    setAmountDialogOpen(false);
  };
  const customSelected = !presetAmounts.includes(principal);
  return (
    <div className="return-chart-wrap">
      <div className="return-toolbar">
        <div className="return-chips" role="group" aria-label="Сумма вложения">
          {presetAmounts.map((amount) => (
            <button
              className="return-chip"
              data-active={principal === amount ? '' : undefined}
              type="button"
              aria-pressed={principal === amount}
              onClick={() => choosePrincipal(amount)}
              key={amount}
            >
              {money.format(amount)} ₽
            </button>
          ))}
          <Dialog open={amountDialogOpen} onOpenChange={setAmountDialogOpen}>
            <DialogTrigger
              render={<button className="return-chip" data-active={customSelected ? '' : undefined} type="button" aria-pressed={customSelected} />}
              onClick={openCustomAmount}
            >
              Другая сумма
            </DialogTrigger>
            <DialogContent className="return-dialog" showCloseButton={false}>
              <DialogClose render={<button className="return-dialog-close" type="button" aria-label="Закрыть" />}>
                <X size={20} strokeWidth={1.8} />
              </DialogClose>
              <DialogHeader className="return-dialog-header">
                <DialogTitle>Другая сумма</DialogTitle>
                <DialogDescription>Введите сумму, которую хотите вложить</DialogDescription>
              </DialogHeader>
              <form className="return-dialog-form" onSubmit={applyCustomAmount}>
                <label htmlFor="custom-principal">Сумма, ₽</label>
                <input
                  id="custom-principal"
                  inputMode="numeric"
                  value={customAmount ? money.format(Number(customAmount)) : ''}
                  onChange={(event) => setCustomAmount(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  autoFocus
                  required
                />
                <div className="return-dialog-actions">
                  <DialogClose render={<button className="return-dialog-button secondary" type="button" />}>Отмена</DialogClose>
                  <button className="return-dialog-button primary" type="submit">Показать</button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <button className="price-window-action" type="button" onClick={onShowPrice}>Посмотреть динамику</button>
      </div>
      <div className="return-chart" onPointerLeave={() => setSelected(null)}>
        <div className="return-grid-layer" aria-hidden="true">
          {gridValues.map((value) => <div className="return-grid" style={{ bottom: `${value / maximum * 100}%` }} key={value}><span>{formatGridValue(value)}</span></div>)}
        </div>
        <div className="return-columns">
          {adjustedPoints.map((value, index) => {
            const loss = value < principal;
            const barTop = Math.min(value / maximum * 100, 100);
            return <button
              className={`return-column${selected !== null && selected !== index ? ' dimmed' : ''}`}
              style={{ '--bar-top': `${barTop}%` } as React.CSSProperties}
              type="button"
              key={years[index]}
              onPointerEnter={() => setSelected(index)}
              onFocus={() => setSelected(index)}
              aria-label={`${years[index]} год: ${money.format(value)} рублей`}
            >
              <span className={`return-base${loss ? ' loss' : ''}`} style={{ height: `${Math.min(value, principal) / maximum * 100}%` }} />
              {!loss && <span className="return-profit" style={{ height: `${(value - principal) / maximum * 100}%`, bottom: `calc(${principal / maximum * 100}% + 4px)` }} />}
              {selected === index && <span className="return-tip">{value >= principal ? '+' : '−'}{money.format(Math.abs(value - principal))} ₽</span>}
            </button>;
          })}
        </div>
        <span className="return-year start">2011</span><span className="return-year end">2026</span>
      </div>
    </div>
  );
}

function PriceHistorySection({ showMobileCalculator = true }: { showMobileCalculator?: boolean }) {
  return (
    <section className="landing-section price-section">
      <h2 className="section-title">Как менялась <span className="price-title-second-line">цена золота</span></h2>
      <div className="chart-content">
        <PriceChart showMobileCalculator={showMobileCalculator} />
      </div>
    </section>
  );
}

function FaqSection() {
  const [category, setCategory] = useState<GoldShape>('account');

  return (
    <section className="landing-section faq-section" id="faq">
      <h2 className="section-title">Ответы на частые вопросы</h2>
      <Tabs value={category} onValueChange={(value) => setCategory(value as GoldShape)} className="faq-tabs">
        <TabsList className="faq-tab-list" aria-label="Тема вопросов">
          {faqCategories.map((item) => (
            <TabsTrigger className="faq-tab" value={item.value} key={item.value}>{item.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="faq-panel">
        <Accordion className="faq-accordion" key={category}>
          {faqItems[category].map((item, index) => (
            <AccordionItem className="faq-item" value={`${category}-${index}`} key={item.question}>
              <AccordionTrigger className="faq-trigger">{item.question}</AccordionTrigger>
              <AccordionContent className="faq-content"><p>{item.answer}</p></AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function GoalSection() {
  const [goal, setGoal] = useState<GoalId>('regular');
  const [progress, setProgress] = useState(goalJourneys.regular.initial);
  const config = goalJourneys[goal];
  const weightValue = journeyWeightValue(goal, progress);
  const weight = formatJourneyWeight(weightValue);
  const chooseGoal = (value: string) => {
    const next = value as GoalId;
    setGoal(next);
    setProgress(goalJourneys[next].initial);
  };

  return (
    <section className="landing-section goal-section">
      <h2 className="section-title">Что подойдет вам</h2>
      <SegmentedTabs
        value={goal}
        onValueChange={chooseGoal}
        label="Выберите цель"
        options={(Object.keys(goalJourneys) as GoalId[]).map((id) => ({ value: id, label: goalJourneys[id].label }))}
      />
      <div className="goal-journey">
        <div className="goal-journey-stage">
          <GoldJourneyScene shape={config.shape} progress={progress} weight={weightValue} label={`${config.product}, ${weight}`} />
        </div>
        <div className="goal-journey-controls">
          <div className="goal-journey-heading">
            <span>{config.product}</span>
            <strong key={`${goal}-${weight}`}>{weight}</strong>
          </div>
          <input
            type="range"
            className="goal-journey-slider"
            min={0}
            max={100}
            step={1}
            value={progress}
            onChange={(event) => setProgress(Number(event.currentTarget.value))}
            style={{ '--goal-progress': `${progress}%` } as React.CSSProperties}
            aria-label={`Вес: ${config.product}`}
            aria-valuetext={weight}
          />
          <div className="goal-journey-limits"><span>{config.min}</span><span>{config.max}</span></div>
        </div>
      </div>
    </section>
  );
}

const offerProducts = [
  {
    title: 'Золотой счет',
    subtitle: 'Для накоплений понемногу',
    action: 'Открыть счет',
    facts: [
      ['Можно начать с 0,1 г', 'Покупайте небольшими частями'],
      ['Открывается онлайн', 'Без платы за обслуживание'],
      ['Баланс — в граммах', 'Не нужно хранить дома'],
      ['Продажа в любое время', '24/7 по цене банка'],
    ],
  },
  {
    title: 'Монеты',
    subtitle: 'Для коллекции или подарка',
    action: 'Выбрать монету',
    facts: [
      ['Вес и дизайн на выбор', 'Высокая проба, от 3,11 г'],
      ['Покупка онлайн', 'Выберите монету и закажите'],
      ['Бережное хранение', 'В упаковке или ячейке'],
      ['Продажа обратно', 'По актуальной цене банка'],
    ],
  },
  {
    title: 'Слитки',
    subtitle: 'Для долгосрочных вложений',
    action: 'Выбрать слиток',
    facts: [
      ['Вес от 10 г', 'Золото 999,9 пробы'],
      ['Доставка бесплатно', 'По Москве и области'],
      ['Хранение на выбор', 'В кейсе или в банке'],
      ['Продажа банку', 'Цена зависит от состояния'],
    ],
  },
];

const catalogProducts = [
  { id: 'bar-10', kind: 'bar', name: 'Слиток', weight: '10 г', price: 128229 },
  { id: 'coin-7', kind: 'bar', name: 'Слиток', weight: '7,78 г', price: 99756 },
  { id: 'nugget-20', kind: 'bar', name: 'Слиток', weight: '20 г', price: 256458 },
  { id: 'bar-100', kind: 'bar', name: 'Слиток', weight: '100 г', price: 1282290 },
  { id: 'coin-31', kind: 'bar', name: 'Слиток', weight: '31,1 г', price: 398592 },
  { id: 'nugget-50', kind: 'bar', name: 'Слиток', weight: '50 г', price: 641145 },
];

function SimpleMetalPreview({ kind }: { kind: (typeof catalogProducts)[number]['kind'] }) {
  if (kind === 'bar') {
    return <img src="/landing-assets/figma-product-bar-v2.png" alt="" />;
  }

  if (kind === 'coin') {
    return (
      <span className="metal-object metal-coin" aria-hidden="true">
        <span className="metal-coin-face"><i>Au</i><b>999</b></span>
      </span>
    );
  }

  return (
    <span className="metal-object metal-nugget" aria-hidden="true">
      <i /><b /><em />
    </span>
  );
}

function FigmaHero() {
  return (
    <section className="figma-hero">
      <div className="figma-hero-copy">
        <h1>Драгоценные металлы</h1>
        <p>ОМС, инвестиционные монеты, слитки с доставкой и хранением в банке</p>
      </div>
      <iframe
        className="figma-hero-morph"
        src="/liquid-gold/index.html?hero=1"
        title="Морфинг золота: самородок, монета и слиток"
        loading="eager"
      />
    </section>
  );
}

function OfferCard({ product }: { product: (typeof offerProducts)[number] }) {
  return (
    <article className="figma-offer-card">
      <header>
        <h2>{product.title}</h2>
        <p>{product.subtitle}</p>
      </header>
      <div className="figma-offer-facts">
        {product.facts.map(([title, note]) => (
          <div className="figma-offer-fact" key={title}>
            <span className="figma-star"><img src="/landing-assets/figma-star.svg" alt="" /></span>
            <span><strong>{title}</strong><small>{note}</small></span>
          </div>
        ))}
      </div>
      <footer>
        <a className="figma-primary-action" href="#catalog">{product.action}</a>
        <a className="figma-secondary-action" href="#faq">Подробнее</a>
      </footer>
    </article>
  );
}

function OfferCardsSection() {
  return (
    <section className="figma-offers" id="products">
      <div className="figma-offer-grid">
        {offerProducts.map((product) => <OfferCard product={product} key={product.title} />)}
      </div>
      <div className="figma-budget-prompt">
        <span><strong>Сколько хотите вложить?</strong><small>Введите сумму, а мы покажем оптимальные варианты</small></span>
        <a href="#catalog">Попробовать</a>
      </div>
    </section>
  );
}

function FigmaPriceSection() {
  return (
    <section className="figma-section figma-price-section">
      <h2 className="section-title">Как менялась цена на золото</h2>
      <div className="figma-chart-content"><PriceChart /></div>
    </section>
  );
}

function FigmaReasonsSection() {
  return (
    <section className="figma-section figma-reasons-section">
      <h2 className="section-title">Зачем покупать золото</h2>
      <div className="figma-reason-grid">
        {investmentReasons.map((reason, index) => {
          return (
            <article className="figma-reason-card" key={reason.title}>
              <span className="figma-reason-number">0{index + 1}</span>
              <span className="figma-reason-icon"><img src={reason.icon} alt="" /></span>
              <h3>{reason.title}</h3>
              <p>{reason.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function InvestmentCatalogSection() {
  const [budget, setBudget] = useState(1000000);
  const [strategy, setStrategy] = useState('more');
  const [quantities, setQuantities] = useState<Record<string, number>>({
    'bar-10': 2,
    'coin-7': 1,
    'nugget-20': 1,
    'bar-100': 1,
    'coin-31': 1,
    'nugget-50': 3,
  });
  const [cartNotice, setCartNotice] = useState<{ count: number; key: number } | null>(null);
  const [selectedBar, setSelectedBar] = useState<(typeof catalogProducts)[number] | null>(null);

  const changeQuantity = (id: string, delta: number) => {
    setQuantities((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) }));
  };

  const addToCart = () => {
    const count = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
    setCartNotice({ count, key: Date.now() });
  };

  const strategyCopy = strategy === 'mix'
    ? 'Сочетаем слитки и монеты, чтобы распределить сумму между разными форматами физического золота'
    : strategy === 'flex'
      ? 'Подбираем разные веса, чтобы часть золота можно было продать отдельно при необходимости'
      : 'Подбираем крупные слитки, чтобы получить больше золота на вашу сумму и меньше переплачивать за каждый грамм';

  return (
    <section className="figma-section figma-catalog-section" id="catalog">
      <h2 className="section-title">Стратегии инвестиций в золото</h2>
      <div className="figma-catalog-layout">
        <aside className="figma-catalog-sidebar">
          <div className="figma-filter-card">
            <div className="figma-filter-group">
              <h3>Бюджет</h3>
              <output>{money.format(budget)} ₽</output>
              <input
                aria-label="Бюджет"
                type="range"
                min={50000}
                max={6500000}
                step={50000}
                value={budget}
                onChange={(event) => setBudget(Number(event.currentTarget.value))}
                style={{ '--catalog-progress': `${(budget - 50000) / 6450000 * 100}%` } as React.CSSProperties}
              />
            </div>
            <div className="figma-filter-group">
              <h3>Стратегия</h3>
              <div className="figma-chip-list">
                {[['more', 'Больше золота'], ['flex', 'Гибкий'], ['mix', 'Слитки + монеты']].map(([value, label]) => (
                  <button data-active={strategy === value ? '' : undefined} onClick={() => setStrategy(value)} type="button" key={value}>{label}</button>
                ))}
              </div>
            </div>
          </div>
          <p className="figma-filter-note">{strategyCopy}</p>
        </aside>
        <div className="figma-catalog-products">
          <div className="figma-catalog-grid">
            {catalogProducts.map((product) => {
              const quantity = quantities[product.id] ?? 0;
              const preview = <>
                <div className="figma-catalog-media" data-kind={product.kind}><SimpleMetalPreview kind={product.kind} /></div>
                <div className="figma-catalog-copy">
                  <h3>{money.format(product.price)} ₽</h3>
                  <p>{product.name} · {product.weight}</p>
                </div>
              </>;
              return (
                <article className="figma-catalog-card" data-openable={product.kind === 'bar' ? '' : undefined} key={product.id}>
                  {product.kind === 'bar' ? (
                    <button className="figma-catalog-card-preview" type="button" onClick={() => setSelectedBar(product)} aria-label={`Посмотреть слиток ${product.weight} в 3D`}>
                      {preview}
                    </button>
                  ) : <div className="figma-catalog-card-preview">{preview}</div>}
                  <div className="figma-quantity" aria-label={`Количество: ${product.name.toLowerCase()}, ${product.weight}`}>
                    <button type="button" onClick={() => changeQuantity(product.id, -1)} disabled={quantity === 0} aria-label="Уменьшить количество">
                      <Minus size={24} strokeWidth={1.8} />
                    </button>
                    <output aria-live="polite">{quantity}</output>
                    <button type="button" onClick={() => changeQuantity(product.id, 1)} aria-label="Увеличить количество">
                      <Plus size={24} strokeWidth={1.8} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <button className="figma-add-cart" type="button" onClick={addToCart}>Добавить в корзину</button>
        </div>
      </div>
      <Dialog open={selectedBar !== null} onOpenChange={(open) => { if (!open) setSelectedBar(null); }}>
        <DialogContent className="figma-bar-dialog" showCloseButton={false}>
          <DialogClose render={<button className="figma-bar-dialog-close" type="button" aria-label="Закрыть 3D-просмотр" />}>
            <X size={22} strokeWidth={1.8} />
          </DialogClose>
          {selectedBar && <>
            <DialogHeader className="figma-bar-dialog-header">
              <DialogTitle>Золотой слиток · {selectedBar.weight}</DialogTitle>
              <DialogDescription>{money.format(selectedBar.price)} ₽</DialogDescription>
            </DialogHeader>
            <div className="figma-bar-viewer">
              <iframe
                src="/liquid-gold/index.html?hero=1&shape=3&spin-speed=.32&modal=bar"
                title={`Вращающийся золотой слиток ${selectedBar.weight}`}
                loading="eager"
              />
            </div>
            <p className="figma-bar-viewer-hint">Потяните, чтобы рассмотреть слиток со всех сторон</p>
          </>}
        </DialogContent>
      </Dialog>
      {cartNotice && (
        <output className="figma-cart-toast" aria-live="polite" key={cartNotice.key}>
          <span className="figma-cart-toast-icon"><ShoppingCart size={24} strokeWidth={1.8} /></span>
          <span><strong>Добавлено в корзину</strong><small>{cartNotice.count} {cartNotice.count % 10 === 1 && cartNotice.count % 100 !== 11 ? 'товар' : 'товаров'}</small></span>
        </output>
      )}
    </section>
  );
}

export function GoldLanding() {
  return (
    <main>
      <Header />
      <FigmaHero />
      <OfferCardsSection />
      <FigmaPriceSection />
      <FigmaReasonsSection />
      <InvestmentCatalogSection />
      <FaqSection />
    </main>
  );
}

export function GoldLandingV2() {
  return (
    <main>
      <Header />
      <Hero animatedGold />
      <ProductCardsSection />
      <PriceHistorySection />
      <FaqSection />
    </main>
  );
}

export function GoldLandingV3() {
  return (
    <main>
      <Header />
      <Hero />
      <ScenarioProductsSection />
      <PriceHistorySection />
      <GoalSection />
    </main>
  );
}

export function GoldChartPreview() {
  return (
    <main className="chart-preview-page">
      <PriceHistorySection showMobileCalculator={false} />
    </main>
  );
}

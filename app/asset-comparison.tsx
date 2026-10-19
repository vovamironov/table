'use client';

type Period = '1y' | '5y' | '10y' | '15y';

type AssetComparisonProps = {
  activePeriod: string;
  onPeriodChange: (period: string) => void;
  goldReturn: number;
  showPeriodSelector?: boolean;
  showHeader?: boolean;
  principal?: number | null;
};

const periods: Array<{ value: Period; label: string; years: number }> = [
  { value: '1y', label: '1 год', years: 1 },
  { value: '5y', label: '5 лет', years: 5 },
  { value: '10y', label: '10 лет', years: 10 },
  { value: '15y', label: '15 лет', years: 15 },
];

// Official RUB/USD reference rates for September 24 of each year.
// Source: https://www.cbr.ru/currency_base/dynamics/
const usdRubByYear: Record<number, number> = {
  2011: 32.1083,
  2016: 63.8642,
  2021: 72.7245,
  2025: 83.3506,
  2026: 84.3969,
};

// IMOEX daily closes. The September 23 closes are used in 2011 and 2016,
// when September 24 was not a trading day.
// Source: https://iss.moex.com/iss/history/engines/stock/markets/index/securities/IMOEX.json
const imoexByYear: Record<number, number> = {
  2011: 1327.19,
  2016: 2011.83,
  2021: 4038.23,
  2025: 2723.58,
  2026: 2312.35,
};

// Bank of Russia August volume-weighted average annual rates for new RUB
// retail deposits with terms of 181 days to one year. Earlier years come
// from the archive; later years from the current monthly workbook.
// Source: https://www.cbr.ru/statistics/bank_sector/int_rat/
const depositRateByYear: Record<number, number> = {
  2011: 6.0,
  2012: 6.5,
  2013: 6.8,
  2014: 7.37,
  2015: 9.62,
  2016: 7.42,
  2017: 6.09,
  2018: 5.13,
  2019: 5.64,
  2020: 3.56,
  2021: 4.24,
  2022: 5.92,
  2023: 7.65,
  2024: 16.98,
  2025: 15.8,
};

const percentage = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const rubles = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

function formatReturn(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${percentage.format(rounded)}%`;
}

function depositReturn(startYear: number) {
  let growth = 1;
  for (let year = startYear; year < 2026; year++) {
    growth *= 1 + depositRateByYear[year] / 100;
  }
  return (growth - 1) * 100;
}

export function AssetComparison({ activePeriod, onPeriodChange, goldReturn, showPeriodSelector = true, showHeader = true, principal }: AssetComparisonProps) {
  const option = periods.find((period) => period.value === activePeriod) ?? periods[3];
  const startYear = 2026 - option.years;
  const returns = [
    { key: 'gold', name: 'Золото', detail: 'Цена за грамм в рублях', value: goldReturn },
    { key: 'usd', name: 'Доллар', detail: 'Курс ЦБ, рублей за $1', value: (usdRubByYear[2026] / usdRubByYear[startYear] - 1) * 100 },
    { key: 'imoex', name: 'Индекс Мосбиржи', detail: 'Индекс цен, без дивидендов', value: (imoexByYear[2026] / imoexByYear[startYear] - 1) * 100 },
    { key: 'deposit', name: 'Вклад', detail: 'Средняя ставка, 181 день — 1 год', value: depositReturn(startYear) },
  ];
  const min = Math.min(0, ...returns.map((item) => item.value));
  const max = Math.max(0, ...returns.map((item) => item.value));
  const range = Math.max(max - min, 1);
  const zero = -min / range * 100;

  return (
    <section className="asset-comparison" aria-label="Сравнение доходности золота и других активов">
      {showHeader && <div className="asset-comparison-header">
        <div>
          <h3>Доходность за {option.label}</h3>
          <p>24 сент. {startYear} — 24 сент. 2026</p>
        </div>
        {showPeriodSelector && <div className="asset-comparison-periods">
          {periods.map((period) => (
            <button type="button" aria-pressed={activePeriod === period.value} onClick={() => onPeriodChange(period.value)} key={period.value}>
              {period.label}
            </button>
          ))}
        </div>}
      </div>}
      <div className="asset-comparison-list">
        {returns.map((item) => {
          const left = Math.min(zero, (item.value - min) / range * 100);
          const barWidth = Math.abs(item.value) / range * 100;
          const profit = principal == null ? null : Math.round(principal * item.value / 100);
          return <div className={`asset-comparison-row ${item.key}`} key={item.key}>
            <div className="asset-comparison-name"><strong>{item.name}</strong><span>{item.detail}</span></div>
            <div className="asset-comparison-track" aria-hidden="true">
              <span className="asset-comparison-zero" style={{ left: `${zero}%` }} />
              <span className={`asset-comparison-bar${item.value < 0 ? ' negative' : ''}`} style={{ left: `${left}%`, width: `${Math.max(barWidth, 0.6)}%` }} />
            </div>
            <div className="asset-comparison-result">
              <strong className={`asset-comparison-value${item.value < 0 ? ' negative' : ''}`}>{formatReturn(item.value)}</strong>
              {principal !== undefined && <span className={`asset-comparison-profit${profit !== null && profit < 0 ? ' negative' : profit === null || profit === 0 ? ' neutral' : ''}`} aria-label={profit === null ? 'Изменение суммы вложения не рассчитано' : `${profit < 0 ? 'Убыток' : 'Прибыль'} ${rubles.format(Math.abs(profit))} рублей`}>
                {profit === null ? '—' : `${profit > 0 ? '+' : ''}${rubles.format(profit)} ₽`}
              </span>}
            </div>
          </div>;
        })}
      </div>
      <p className="asset-comparison-method">
        На 24.09.2026, в рублях. Золото — цена за грамм, доллар — курс ЦБ без спреда, <a href="https://www.moex.com/ru/indices" target="_blank" rel="noopener noreferrer">индекс Мосбиржи</a> — без дивидендов. При отсутствии котировки 24 сентября взят предыдущий день. Вклад — модель ежегодного переоткрытия по средней августовской ставке ЦБ на 181 день — 1 год, с капитализацией, без налогов и комиссий. <a href="https://www.cbr.ru/currency_base/dynamics/" target="_blank" rel="noopener noreferrer">Курс ЦБ</a> · <a href="https://www.cbr.ru/statistics/bank_sector/int_rat/" target="_blank" rel="noopener noreferrer">Ставки вкладов ЦБ</a>
      </p>
    </section>
  );
}

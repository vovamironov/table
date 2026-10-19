# Макеты и отличия от v159

Подготовлено 19.10.2026 по локальному журналу дизайн-ревью. Код фиксирует v159 от 16.10.2026; перечисленные ниже изменения макетов от 19.10.2026 в него ещё не перенесены.

## Ссылки

- [Обзор — «График золота B»](https://www.figma.com/design/WHJRaGbXRkAGF3n3sjuJ71/?node-id=6260-1759)
- [Desktop](https://www.figma.com/design/WHJRaGbXRkAGF3n3sjuJ71/?node-id=6260-1766)
- [Mobile](https://www.figma.com/design/WHJRaGbXRkAGF3n3sjuJ71/?node-id=6260-1810)
- [Спецификация](https://www.figma.com/design/WHJRaGbXRkAGF3n3sjuJ71/?node-id=6261-3326)
- [Матрица проверки](https://www.figma.com/design/WHJRaGbXRkAGF3n3sjuJ71/?node-id=6261-3504)
- [Прототип desktop](https://www.figma.com/proto/WHJRaGbXRkAGF3n3sjuJ71/?node-id=6262-3372&starting-point-node-id=6262-3372)
- [Прототип mobile](https://www.figma.com/proto/WHJRaGbXRkAGF3n3sjuJ71/?node-id=6262-3530&starting-point-node-id=6262-3530)

## Последующие изменения для реализации

| Область | Требование макетов |
| --- | --- |
| Размеры | Desktop 1360 × 872 px, mobile web 375 × 812 px. Высота графика 450 px; ширина desktop 1104 px, область mobile 343 px. 320/430 px — дополнительные адаптации. |
| Типографика | Стили TUI Desktop. Mobile Heading 3 Medium; tracking заголовков 0; desktop Body S 13/20 для дат и подписи; mobile Body XS tracking +0.4 px. |
| Периоды | `tui-segmented` / `tui-segmented-item`: desktop medium 44 px, mobile small 32 px. Выбранный сегмент hug, остальные fill на широком mobile. |
| Доходность периода | Обычный текст в одной строке с периодом, того же размера и начертания. Цвет процента по знаку, без отдельной подложки. Белая подложка выбранного сегмента сохраняется. |
| Бейджи | Прямые TUI CELL для Start/Historical/Current/Hover. Фон Background/Elevation 1, тень Shadow/Small. |
| Цвета | TUI Foundations Text/Primary, Text/Positive, Text/Negative, включая смешанный текст табов. |
| Ошибка и повтор | `tui-block-status`, иллюстрация `error-red`, подпись «Попробуйте обновить», действие «Обновить». Desktop: заголовок 28/32, иллюстрация 144 px, кнопка secondary large 109 × 56 px/r12. Mobile: 20/24, 128 px, secondary medium 101 × 44 px/r8. |
| Отрицательная доходность | Сценарий 12 000 → 10 800 ₽, −10%, с пометкой условных данных. Линия и заливка синие; доходности окрашены по знаку. [Desktop](https://www.figma.com/design/WHJRaGbXRkAGF3n3sjuJ71/?node-id=6307-6064), [mobile](https://www.figma.com/design/WHJRaGbXRkAGF3n3sjuJ71/?node-id=6307-6186). |

Прототипы Figma используют dissolve 380 мс для порядка состояний; точный morph проверяется по реализации v159. Связи компонентов TUI в Figma не означают, что React-код уже использует продуктовую библиотеку TUI.

При интеграции сверить normal/loading/error/retry, периоды, hover/touch, отрицательную доходность и адаптации. Проверка на физических устройствах и внешние дизайн-согласования остаются отдельными шагами.

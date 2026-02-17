# MiMentiMeter Design System (UX Guardian Standard)

## Core Principles
Este sistema de diseño implementa las directrices de `theme-ux-guardian` para garantizar accesibilidad (WCAG AA) y reducir la fatiga visual.

## Color Tokens

### Light Mode
- **Primary**: #266963 (Teal) - High contrast for readability.
- **Secondary**: #E0A883 (Apricot).
- **Background**: #F7F9F2 (White-Sage).
- **Text (Muted)**: #475569 (Adjusted to Ratio 5.1:1 on white).

### Dark Mode (UX Guardian Optimized)
- **Luminance**: Utiliza `#0D1117` para el fondo principal, evitando el negro puro (#000000) para permitir profundidad visual.
- **Elevations**: Las superficies elevadas (cards) utilizan `#161B22`, un tono más claro que el fondo en lugar de sombras negras pesadas.
- **Text Readability**:
    - **Primary Text**: `rgba(254, 254, 250, 0.87)`. La reducción de opacidad al 87% previene el efecto de halación y mejora la lectura prolongada.
    - **Secondary/Sage**: `rgba(226, 232, 192, 0.70)`.
- **Accent Desaturation**:
    - **Primary**: `#469F91` (Teal suavizado).
    - **Secondary**: `#CEB19E` (Apricot desaturado al 40% para evitar vibración cromática sobre fondo oscuro).

## Accessibility Standards
- **Contrast Ratio**: Mínimo 4.5:1 para todo el texto funcional.
- **Reduced Vibration**: Desaturación aplicada intencionalmente en modo oscuro.
- **Depth**: Jerarquía visual basada en niveles de luminancia grisácea.

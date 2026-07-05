# AntiLink Brand

Visual identity guidelines for the AntiLink project. Colors below were sampled
directly from the official shield logo.

## Logo

The AntiLink mark is a shield containing a broken/crossed link — representing
blocked links and server protection.

> Place logo files in `docs/brand/` (e.g. `logo.png`, `logo.svg`,
> `logo-mark.svg`) and reference them from the README.

## Color Palette

| Role | Hex | RGB | Preview |
| ---- | --- | --- | ------- |
| **AntiLink Blue** (primary) | `#00A3F0` | `0, 163, 240` | ![#00A3F0](https://placehold.co/40x20/00A3F0/00A3F0.png) |
| **Blue Shadow** (shaded face) | `#0080C1` | `0, 128, 193` | ![#0080C1](https://placehold.co/40x20/0080C1/0080C1.png) |
| **Blue Highlight** (bevel) | `#25B0F1` | `37, 176, 241` | ![#25B0F1](https://placehold.co/40x20/25B0F1/25B0F1.png) |
| **Blue Tint** (light bevel) | `#74CBF4` | `116, 203, 244` | ![#74CBF4](https://placehold.co/40x20/74CBF4/74CBF4.png) |
| **White** (icon / outline) | `#FFFFFF` | `255, 255, 255` | ![#FFFFFF](https://placehold.co/40x20/FFFFFF/FFFFFF.png) |

### Suggested neutrals (for docs/site UI)

| Role | Hex |
| ---- | --- |
| Ink / text | `#0B1B2B` |
| Muted text | `#5A6B7B` |
| Surface / background | `#FFFFFF` |
| Subtle border | `#E3ECF3` |

## Design Tokens

```css
:root {
  --antilink-blue: #00A3F0;
  --antilink-blue-shadow: #0080C1;
  --antilink-blue-highlight: #25B0F1;
  --antilink-blue-tint: #74CBF4;
  --antilink-white: #FFFFFF;

  --antilink-ink: #0B1B2B;
  --antilink-muted: #5A6B7B;
  --antilink-border: #E3ECF3;
}
```

```json
{
  "color": {
    "brand": {
      "blue": "#00A3F0",
      "blueShadow": "#0080C1",
      "blueHighlight": "#25B0F1",
      "blueTint": "#74CBF4"
    }
  }
}
```

## Usage Notes

- Use **`#00A3F0`** as the primary brand color for buttons, links, and accents.
- Reserve `#0080C1` for shadows, hover/pressed states, or gradient depth.
- Maintain sufficient contrast: white text on `#00A3F0` is legible for large text;
  for small body text prefer `#0080C1` or a darker shade to meet WCAG AA.

> Values were sampled from the raster logo and are accurate to the source image.
> If a vector logo with defined swatches exists, treat that as the source of truth.

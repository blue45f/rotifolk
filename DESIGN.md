# Rotifolk Design Reference

소스: `apps/web/src/styles/tokens.css`, `apps/web/src/styles/global.css`.
모든 디자인 결정은 **wine cellar at twilight**: 어둠 속 한 잔, 따뜻한 크림 빛, 골드 라벨.

## Color Strategy
**Committed** — burgundy가 30–60% 면적을 차지. 보조로 cream + gold. 카테고리 컨테이너는 카테고리별 grad로 "drenched" 모드 일시 적용.

## OKLCH 팔레트
- `--brand-burgundy-700` = `#7A1F3D` ≈ `oklch(36% 0.13 8)` — primary
- `--brand-burgundy-400` = `#C9627F` ≈ `oklch(63% 0.12 10)` — primary-soft / accent rose
- `--brand-gold-500`     = `#D4A24C` ≈ `oklch(73% 0.13 80)` — accent (라이브, 매칭, CTA 골드)
- `--brand-cream-100`    = `#FBF3E2` ≈ `oklch(96% 0.03 80)` — canvas warm
- `--brand-ink-900`      = `#14101D` ≈ `oklch(15% 0.03 290)` — dark canvas

중성색은 모두 burgundy hue로 약하게 틴트 (chroma 0.005–0.01). `#000`/`#fff` 사용 금지.

## 카테고리 색
| key | hex | 무드 |
|-----|-----|------|
| wine | `#7A1F3D` | deep, late evening |
| coffee | `#6B4226` | mocha, morning |
| tea | `#6B8E5A` | sage, calm |
| whisky | `#B47433` | tobacco, glow |
| cocktail | `#2F7884` | mint cool |
| dessert | `#C9628E` | rose petite |

## Theme
**Light by default, dark as twilight ceremony.** 라이트 = 와인바 입구의 크림 톤. 다크 = 라운지 깊은 곳. `[data-theme='dark']`로 토글, 시스템 선호 자동 따라감(`useApplyTheme`).

## Typography
- 본문/제목: Pretendard Variable (CDN).
- 모노스페이스: JetBrains Mono (타이머·코드 한정).
- Scale: --fs-2xs..--fs-6xl, 비율 ≥ 1.25, 본문 65–75ch.
- 디스플레이 타이틀은 `font-weight: 800` + `letter-spacing: -0.03em`.

## Layout
- 모바일 우선: container padding fluid (var(--space-3) → 8), header 56–64px.
- Cards는 다음 컨텍스트에만:
  - PartyCard: cover + 메타.
  - LiveParty pair card: 글래스 패널 (몰입형).
- 그 외: 텍스트 + divider + border-bottom 사용. 카드 남발 금지.

## Elevation
- xs / sm / md / lg / xl — burgundy alpha 베이스로 따뜻한 그림자. cool gray 그림자 금지.
- glow: 라이브 매칭 / 액티브 아바타에만 사용 (`--shadow-glow`).

## Motion
- `--ease-out`, `--ease-spring` — 부드러운 ease-out. bounce·elastic 금지.
- 라운드 타이머, 펄스 링, 그라데이션 blob — CSS transform only.
- prefers-reduced-motion 존중.

## Component anchors
- Button: pill, 4 variants (primary burgundy / soft rose / gold accent / ghost).
- Card: plain / soft / glass / gradient / twilight. **nested card 금지.**
- Avatar: mood-driven gradient + emoji badge. 실제 사진 X.
- Chip: 필터에 사용, pill, selected는 burgundy 채움.
- Sheet: bottom drawer, 메뉴/주문/매칭 폼.

## Disallowed
- side-stripe colored borders (`border-left: 4px solid …` for accent)
- gradient text (`background-clip: text` + gradient)
- glassmorphism as default — 라이브 페어 카드와 글래스 nav만.
- hero-metric SaaS 템플릿
- identical card grids
- modal-first 사고

## Brand voice in copy
- 한 문장 = 한 호흡. 군더더기 금지.
- "AI 매칭", "최고의" 같은 마케팅 슬롭 금지.
- 액션 동사 우선: "한 모금 더", "다음 자리로", "오늘 첫 잔".

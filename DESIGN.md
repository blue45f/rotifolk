---
name: Rotifolk
description: 로테이션 파티 매칭 — 해 지기 직전, 첫 잔을 나누는 5분 라운드
colors:
  apricot-700: 'oklch(50% 0.16 34)'
  apricot-600: 'oklch(57% 0.17 36)'
  apricot-400: 'oklch(76% 0.14 46)'
  apricot-100: 'oklch(95% 0.032 58)'
  teal-500: 'oklch(70% 0.11 195)'
  teal-600: 'oklch(60% 0.11 197)'
  amber-500: 'oklch(80% 0.13 78)'
  paper-100: 'oklch(98.5% 0.01 70)'
  page-bg: 'oklch(98.5% 0.01 70)'
  surface: 'oklch(99.5% 0.005 70)'
  surface-soft: 'oklch(96% 0.016 68)'
  clay-900: 'oklch(20% 0.02 40)'
  text: 'oklch(26% 0.022 50)'
  text-muted: 'oklch(46% 0.022 48)'
  text-subtle: 'oklch(62% 0.016 50)'
  border: 'oklch(20% 0.02 40 / 0.12)'
  success: 'oklch(58% 0.12 155)'
  warning: 'oklch(72% 0.14 72)'
  danger: 'oklch(57% 0.18 22)'
  cat-wine: 'oklch(52% 0.16 18)'
  cat-coffee: 'oklch(48% 0.07 55)'
  cat-tea: 'oklch(60% 0.09 150)'
  cat-whisky: 'oklch(62% 0.12 72)'
  cat-cocktail: 'oklch(62% 0.1 200)'
  cat-beer: 'oklch(78% 0.13 90)'
  cat-dessert: 'oklch(66% 0.13 8)'
typography:
  display:
    fontFamily: 'Pretendard Variable, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '2.5rem'
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: '-0.02em'
  headline:
    fontFamily: 'Pretendard Variable, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.02em'
  title:
    fontFamily: 'Pretendard Variable, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: 'Pretendard Variable, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: 'JetBrains Mono, SF Mono, monospace'
    fontSize: '0.75rem'
    fontWeight: 600
    letterSpacing: '0.16em'
rounded:
  xs: '6px'
  sm: '10px'
  md: '14px'
  lg: '18px'
  xl: '26px'
  2xl: '34px'
  pill: '999px'
spacing:
  1: '4px'
  2: '8px'
  3: '12px'
  4: '16px'
  5: '20px'
  6: '24px'
  8: '32px'
  12: '48px'
components:
  button-primary:
    backgroundColor: '{colors.apricot-600}'
    textColor: '{colors.paper-100}'
    rounded: '{rounded.pill}'
    padding: '0 18px'
    height: '44px'
  button-primary-hover:
    backgroundColor: '{colors.apricot-700}'
  button-accent:
    backgroundColor: '{colors.teal-500}'
    textColor: '{colors.clay-900}'
    rounded: '{rounded.pill}'
    padding: '0 18px'
    height: '44px'
  button-soft:
    backgroundColor: '{colors.apricot-100}'
    textColor: '{colors.apricot-700}'
    rounded: '{rounded.pill}'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.text}'
    rounded: '{rounded.pill}'
  chip:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text-muted}'
    rounded: '{rounded.pill}'
    padding: '7px 14px'
  chip-selected:
    backgroundColor: '{colors.apricot-600}'
    textColor: '{colors.paper-100}'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.xl}'
    padding: '24px'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    height: '44px'
    padding: '0 12px'
---

# Design System: Rotifolk

## 1. Overview

**Creative North Star: "Aperitivo · Sunset Social"**

Rotifolk는 해가 지기 직전, 사람들이 첫 잔을 나누러 모이는 황금빛 사교 시간을 인터페이스로 옮긴다. 살구빛 석양이 따뜻한 종이 같은 캔버스를 물들이고, 또렷한 틸이 "지금 이 순간"을 한 점 찍는다. 밝고 따뜻하고 명료한 "환대하는 사치(warm hospitality)"가 기준이다. 소셜(모임 탐색·호스팅)은 따뜻한 페이퍼와 카테고리 그라데이션으로 데우고, 매칭·투표·라이브처럼 또렷해야 하는 순간은 틸/앰버로 한 점 찍는다.

밀도는 product 레지스터를 따른다. 디자인은 사용자의 과업(공간 섭외, 라운드 진행, 매칭)을 SERVE하며 스스로 주인공이 되지 않는다. 예외는 랜딩(`/`)과 즉석 모임(`/quick`)으로, 여기서만 brand에 가까운 hero/CTA 톤을 허용한다. 라이브 라운드 화면(`/live`)은 풀스크린 몰입형이라 평소의 헤더·푸터 UI를 걷어내고, 라이트 모드에서도 깊은 코코아 다크를 유지해 무대 조명 같은 집중을 만든다.

이 시스템이 명시적으로 거부하는 것: 문토·프립식 "같은 크기 카드 무한 그리드", Tinder·Bumble식 외모 우선 스와이프, "통계 차트 카드 그리드"로 보이는 SaaS 대시보드, 그리고 형광·네온 AI 슬롭. 우리의 밝은 톤은 환대의 온기이지 자극이 아니다.

**Key Characteristics:**

- 석양 아페리티보: apricot 25–45% + warm paper canvas + teal/amber 강조점
- 카테고리가 정체성: 같은 화면도 카테고리 그라데이션이 무드를 바꾼다
- product 우선, 라이브만 몰입형 풀스크린 다크
- 모든 중성색은 warm(40–70) hue로 미세 틴트, `#000`·`#fff` 금지
- 카드 남발 금지 — 텍스트 + divider가 기본, 카드는 cover가 있는 객체에만

## 2. Colors

석양빛 살구를 따뜻한 종이 위에 따른 팔레트. **Committed** 전략: apricot가 화면의 25–45%를 지고, paper가 캔버스를, teal/amber가 ≤10%의 강조를 맡는다.

### Primary

- **Apricot 600** (`oklch(57% 0.17 36)`): 주 색. 1차 버튼, 선택된 칩, 강조 텍스트, 헤더 강조. 면적의 1/3 가까이를 채워 정체성을 만든다.
- **Apricot 700** (`oklch(50% 0.16 34)`): primary hover, 깊은 강조.
- **Apricot 400** (`oklch(76% 0.14 46)`): primary-soft / soft 강조. 다크모드 primary, soft 버튼 배경.

### Secondary

- **Teal 500** (`oklch(70% 0.11 195)`): 액센트. 라이브·매칭·즉시예약(instantBook)·핵심 CTA처럼 "또렷해야 하는" 순간에만. 틸은 희소할수록 강하다.
- **Amber 500** (`oklch(80% 0.13 78)`): 따뜻한 보조 강조 — 핀·하이라이트·축하 모멘트.

### Tertiary (카테고리)

밝은 명도 대역에서 채도와 hue로 카테고리 컨테이너에 일시적 "drenched" 무드를 입힌다.

- **Wine** `oklch(52% 0.16 18)` · **Coffee** `oklch(48% 0.07 55)` · **Tea** `oklch(60% 0.09 150)` · **Whisky** `oklch(62% 0.12 72)` · **Cocktail** `oklch(62% 0.1 200)` · **Beer** `oklch(78% 0.13 90)` · **Dessert** `oklch(66% 0.13 8)`.

### Neutral

- **Paper Canvas** (`oklch(98.5% 0.01 70)`): 페이지 배경. 햇살 든 종이 톤.
- **Surface** (`oklch(99.5% 0.005 70)` light / `oklch(25% 0.022 40)` dark): 카드·시트 표면.
- **Surface Soft** (`oklch(96% 0.016 68)`): 칩·썸네일·보조 패널 배경.
- **Clay 900** (`oklch(20% 0.02 40)`): 다크 캔버스(warm cocoa lounge), 오버레이 베이스.
- **Text / Muted / Subtle** (`oklch(26% 0.022 50)` → `46%` → `62%`): 본문·보조·placeholder. 모두 warm(48–50) hue로 미세 틴트.
- **Border** (`clay 12% over transparent`): 1px 풀 보더·divider 전용.

### Named Rules

**The Accent Scarcity Rule.** 액센트(`teal-500`·`amber-500`)는 어느 화면에서도 합쳐 ≤10%. 라이브·매칭·즉시예약·단 하나의 핵심 CTA에만. 강조가 흔해지면 소음이 된다.

**The Warm-Neutral Rule.** `#000`·`#fff` 금지. 모든 중성색은 warm(40–70) hue로 chroma 0.005–0.03 틴트한다.

## 3. Typography

**Display / Body Font:** Pretendard Variable (with -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif)
**Label / Mono Font:** JetBrains Mono (with SF Mono, Consolas) — 타이머·kicker 라벨·코드 한정

**Character:** 한글 가독성이 첫째인 단일 산세리프 한 벌이 디스플레이부터 본문·라벨까지 모두 감당한다. 디스플레이는 굵게(800) 조여서(-0.02em) 무게를, 본문은 1.6 행간으로 밝은 캔버스 위 편안함을 준다. 모노는 시간·코드·대문자 kicker에만 절제해서 쓴다.

### Hierarchy

- **Display** (800, `2.5rem`–`4rem` `--fs-4xl..6xl`, lh 1.08): 랜딩 hero, 페이지 타이틀. `letter-spacing: -0.02em`.
- **Headline** (700, `1.5rem`–`1.875rem`, lh 1.25): 섹션 제목.
- **Title** (700, `1.125rem`–`1.25rem`, lh 1.25): 카드·서브섹션 제목.
- **Body** (400, `1rem`, lh 1.6): 본문. 산문은 65–75ch(`--max-prose: 680px`)로 제한.
- **Label** (600, `0.75rem`, `letter-spacing: 0.16em`, UPPERCASE, mono): kicker, 타이머.

### Named Rules

**The Fixed-Scale Rule.** product 화면은 고정 rem 스케일(`--fs-*`)을 쓴다. 사이드바·시트에서 줄어드는 clamp 디스플레이는 hero(랜딩) 외 금지.

## 4. Elevation

따뜻한 apricot-tinted 그림자로 깊이를 만든다. cool gray 그림자는 금지 — 차가운 그림자는 따뜻한 캔버스 위에서 이물처럼 뜬다. 표면은 기본적으로 평평하고, 그림자는 hover·시트·glow처럼 상태에 반응할 때 올라온다.

### Shadow Vocabulary

- **xs / sm** (`0 1–2px … apricot-900 9–11%`): 칩·작은 버튼, hover 미세 부상.
- **md** (`0 10px 24px … apricot-900 14%`): 추천 카드 hover, 떠 있는 패널.
- **lg / xl** (`0 22–40px … apricot-900 18–24%`): 바텀 시트, 최상위 오버레이.
- **glow** (`0 0 0 4px amber 30% + 0 14px 36px apricot 34%`): 라이브 매칭·액티브 아바타·핏 스코어 링 전용.

### Named Rules

**The Warm-Shadow Rule.** 모든 그림자는 apricot/clay alpha 기반. `rgba(0,0,0,…)` 회색 그림자 금지(다크모드 제외). **The Glow-Is-Sacred Rule.** `--shadow-glow`는 "지금 살아있는" 요소(라이브·매칭·핏 링)에만.

## 5. Components

### Buttons

- **Shape:** 알약형 (`999px`, `--radius-pill`). 높이 sm 36 / md 44 / lg 52 / xl 60px.
- **Primary:** `apricot-600` 채움 + paper 글자, `--shadow-md`. hover → `apricot-700`. 누름 시 `scale(0.98)` 스프링.
- **Accent (gold variant):** `teal-500`/`amber-500` + ink 글자. 즉시예약·핵심 CTA 전용 (액센트 희소 규칙).
- **Soft:** `apricot-100` 배경 + `apricot-700` 글자. 보조 액션.
- **Ghost / Outline:** 투명/1px 보더. 취소·뒤로·토글.
- 로딩 시 스피너 + `aria-busy`. 모든 상태(default/hover/focus/active/disabled/loading) 구비.

### Chips

- **Style:** 알약형, `surface` 배경 + `text-muted`, 1px border. **Selected:** `apricot-600` 채움 + paper 글자 (`aria-pressed`).
- **Use:** 필터·카테고리·동네·요일 토글. 섭외 스튜디오 브리프 바의 1차 입력 수단.

### Cards / Containers

- **Corner:** `26px`(`--radius-xl`) 카드, `14px` 내부 블록.
- **Variants:** plain / soft / glass / gradient / sunset. **Background:** `surface`, 강조 패널은 `--grad-cream-rose`(paper→coral).
- **Shadow:** 기본 `--shadow-sm`, hover `--shadow-md` + `translateY(-3px)`.
- **Nested cards 금지.** 카드 안의 카드는 항상 오답.

### Inputs / Fields

- **Style:** `surface` 배경, 1px `border`, `14px` radius, 높이 44px.
- **Focus:** `outline: 2px var(--color-primary)` + offset 3px.
- **Error:** `--color-danger` 보더 + 하단 메시지, `aria-invalid`.

### Navigation

- 상단 헤더(56–64px) + 모바일 하단 탭(64px). chrome 아이콘은 인라인 line-glyph(`Icon`) — emoji 금지(카테고리 emoji는 예외, 브랜드 정체성). 라이브 라운드에서는 전부 숨김(몰입형).

### Overlays / Primitives (Radix UI)

modal·sheet·tabs·toast·tooltip·dropdown·popover·switch는 **Radix UI** 프리미티브로 구현하고, 시각은 토큰 기반 CSS로 입힌다. 포커스 트랩·키보드 내비게이션·ARIA는 Radix가 보장한다.

### Fit Score Ring (signature)

섭외 스튜디오의 시그니처. 추천 공간의 적합도(0–100)를 `conic-gradient(grade-color var(--deg), 트랙 0)` 도넛으로 표현하고, grade(perfect=amber / great=success / good=apricot / fair=subtle)로 색을 바꾼다. 가운데 흰 원에 점수 + "FIT" 라벨. 카드 cover 우하단에 살짝 걸쳐 떠 있다(`--shadow-md`).

### Booking Bottom Sheet (signature)

modal-first를 피한 진행형 시트. Radix Dialog 기반으로 화면 하단에서 `sheetUp`(translateY+opacity)으로 올라오며, 투명 견적(시간×단가×배수 − 막판할인 + 청소비)을 행 단위로 풀어 보여주고 instant/request에 따라 CTA 문구·색이 바뀐다. scrim은 `clay 55%` + 미세 blur.

## 6. Do's and Don'ts

### Do:

- **Do** apricot로 면적의 25–45%를 채워 정체성을 만든다. paper는 캔버스, teal/amber는 ≤10% 강조.
- **Do** 카테고리 그라데이션(`--grad-*`)으로 같은 레이아웃에 다른 무드를 입힌다.
- **Do** 모든 중성색을 warm(40–70) hue로 미세 틴트한다.
- **Do** 그림자는 warm(apricot alpha). `--shadow-glow`는 라이브·매칭·핏 링에만.
- **Do** 카드는 cover가 있는 객체(공간 추천·파티)에만. 그 외엔 텍스트 + divider.
- **Do** 오버레이/탭/토스트는 Radix 프리미티브로 — 접근성을 손으로 다시 짜지 않는다.
- **Do** ease-out 곡선(`--ease-out`, `--ease-out-expo`)으로 140–320ms 전환. `prefers-reduced-motion` 존중.

### Don't:

- **Don't** 문토·프립식 "같은 크기 카드 무한 그리드"를 만들지 않는다 (identical card grids).
- **Don't** Tinder·Bumble식 외모 우선 스와이프 UI를 쓰지 않는다.
- **Don't** 호스트 콘솔을 "통계 차트 카드 그리드" SaaS 대시보드로 만들지 않는다. 라이브 진행 도구처럼 보여야 한다.
- **Don't** 형광·네온으로 자극하지 않는다. 밝은 톤은 환대의 온기.
- **Don't** "AI 매칭"·"최고의" 같은 마케팅 슬롭, hero-metric 템플릿(큰 숫자+라벨+gradient)을 쓰지 않는다.
- **Don't** chrome에서 emoji를 아이콘으로 쓰지 않는다(`Icon` line-glyph 사용; 카테고리 emoji만 예외). `background-clip:text` 그라데이션 텍스트, 기본 glassmorphism, nested card, modal-first 사고도 금지.
- **Don't** `#000`·`#fff`, cool gray 그림자, em dash(`—`)를 쓰지 않는다.

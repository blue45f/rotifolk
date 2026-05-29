---
name: Rotifolk
description: 로테이션 파티 매칭 — 와인 셀러의 어스름에서 만나는 5분 라운드
colors:
  burgundy-700: 'oklch(36% 0.13 10)'
  burgundy-800: 'oklch(30% 0.115 10)'
  burgundy-400: 'oklch(63% 0.115 10)'
  burgundy-100: 'oklch(94% 0.025 10)'
  gold-500: 'oklch(74% 0.125 80)'
  gold-600: 'oklch(63% 0.115 80)'
  cream-100: 'oklch(97% 0.02 80)'
  page-bg: 'oklch(98.5% 0.008 80)'
  surface: 'oklch(100% 0 80)'
  surface-soft: 'oklch(96.5% 0.022 80)'
  ink-900: 'oklch(15% 0.025 290)'
  text: 'oklch(20% 0.025 290)'
  text-muted: 'oklch(45% 0.02 290)'
  text-subtle: 'oklch(60% 0.012 290)'
  border: 'oklch(15% 0.025 290 / 0.1)'
  success: 'oklch(58% 0.11 160)'
  warning: 'oklch(70% 0.13 70)'
  danger: 'oklch(57% 0.165 20)'
  cat-wine: 'oklch(36% 0.13 10)'
  cat-coffee: 'oklch(36% 0.07 50)'
  cat-tea: 'oklch(56% 0.07 135)'
  cat-whisky: 'oklch(57% 0.13 60)'
  cat-cocktail: 'oklch(48% 0.08 200)'
  cat-beer: 'oklch(70% 0.13 85)'
  cat-dessert: 'oklch(60% 0.13 10)'
typography:
  display:
    fontFamily: 'Pretendard Variable, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: '2.375rem'
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: '-0.022em'
  headline:
    fontFamily: 'Pretendard Variable, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.022em'
  title:
    fontFamily: 'Pretendard Variable, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: 'Pretendard Variable, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'JetBrains Mono, SF Mono, monospace'
    fontSize: '0.75rem'
    fontWeight: 600
    letterSpacing: '0.18em'
rounded:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  2xl: '32px'
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
    backgroundColor: '{colors.burgundy-700}'
    textColor: '{colors.cream-100}'
    rounded: '{rounded.pill}'
    padding: '0 18px'
    height: '44px'
  button-primary-hover:
    backgroundColor: '{colors.burgundy-800}'
  button-gold:
    backgroundColor: '{colors.gold-500}'
    textColor: '{colors.ink-900}'
    rounded: '{rounded.pill}'
    padding: '0 18px'
    height: '44px'
  button-soft:
    backgroundColor: '{colors.burgundy-100}'
    textColor: '{colors.burgundy-800}'
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
    backgroundColor: '{colors.burgundy-700}'
    textColor: '{colors.cream-100}'
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

**Creative North Star: "Wine Cellar at Twilight"**

Rotifolk는 어스름이 내린 와인 셀러에 들어선 첫 순간을 인터페이스로 옮긴다. 어둠 속의 한 잔, 따뜻한 크림 빛, 병목에 걸린 골드 라벨. 차분하지만 한 잔의 무게가 있는 "차분한 사치(quiet luxury)"가 기준이다. 소셜(모임 탐색·호스팅)은 따뜻한 크림과 카테고리 그라데이션으로 데우고, 매칭·투표·라이브처럼 또렷해야 하는 순간은 골드로 한 점 찍는다.

밀도는 product 레지스터를 따른다. 디자인은 사용자의 과업(공간 섭외, 라운드 진행, 매칭)을 SERVE하며 스스로 주인공이 되지 않는다. 예외는 랜딩(`/`)과 즉석 모임(`/quick`)으로, 여기서만 brand에 가까운 hero/CTA 톤을 허용한다. 라이브 라운드 화면은 풀스크린 몰입형이라 평소의 헤더·푸터 UI를 걷어낸다.

이 시스템이 명시적으로 거부하는 것: 문토·프립식 "같은 크기 카드 무한 그리드", Tinder·Bumble식 외모 우선 스와이프, "통계 차트 카드 그리드"로 보이는 SaaS 대시보드, 그리고 자극적인 카지노식 적색+황금. 우리의 어두운 톤은 라운지의 깊이이지 카지노가 아니다.

**Key Characteristics:**

- 어스름 와인 셀러: burgundy 30–60% + cream canvas + gold 강조점
- 카테고리가 정체성: 같은 화면도 카테고리 그라데이션이 무드를 바꾼다
- product 우선, 라이브만 몰입형 풀스크린
- 모든 중성색은 burgundy/ink hue로 미세 틴트, `#000`·`#fff` 금지
- 카드 남발 금지 — 텍스트 + divider가 기본, 카드는 cover가 있는 객체에만

## 2. Colors

부르고뉴 와인을 크림 위에 따른 팔레트. **Committed** 전략: burgundy가 화면의 30–60%를 지고, cream이 캔버스를, gold가 ≤10%의 강조를 맡는다.

### Primary

- **Burgundy 700** (`oklch(36% 0.13 10)`): 주 색. 1차 버튼, 선택된 칩, 강조 텍스트, 헤더 강조. 면적의 절반 가까이를 채워 정체성을 만든다.
- **Burgundy 800** (`oklch(30% 0.115 10)`): primary hover, 깊은 강조.
- **Rose 400** (`oklch(63% 0.115 10)`): primary-soft / 로즈 액센트. 다크모드 primary, soft 버튼 배경, 부드러운 강조.

### Secondary

- **Gold 500** (`oklch(74% 0.125 80)`): 액센트. 라이브·매칭·즉시예약(instantBook)·핵심 CTA처럼 "또렷해야 하는" 순간에만. 골드는 희소할수록 강하다.
- **Gold 600** (`oklch(63% 0.115 80)`): 골드 텍스트·아이콘 (대비 확보용).

### Tertiary (카테고리)

같은 명도 대역에서 채도만 달리해, 카테고리 컨테이너에 일시적 "drenched" 무드를 입힌다.

- **Wine** `oklch(36% 0.13 10)` · **Coffee** `oklch(36% 0.07 50)` · **Tea** `oklch(56% 0.07 135)` · **Whisky** `oklch(57% 0.13 60)` · **Cocktail** `oklch(48% 0.08 200)` · **Beer** `oklch(70% 0.13 85)` · **Dessert** `oklch(60% 0.13 10)`.

### Neutral

- **Cream Canvas** (`oklch(98.5% 0.008 80)`): 페이지 배경. 와인바 입구의 크림 톤.
- **Surface** (`oklch(100% 0 80)` light / `oklch(22% 0.030 290)` dark): 카드·시트 표면.
- **Surface Soft** (`oklch(96.5% 0.022 80)`): 칩·썸네일·보조 패널 배경.
- **Ink 900** (`oklch(15% 0.025 290)`): 다크 캔버스(late-night cellar), 오버레이 베이스.
- **Text / Muted / Subtle** (`oklch(20% 0.025 290)` → `45%` → `60%`): 본문·보조·placeholder. 모두 290 hue로 미세 틴트.
- **Border** (`ink 10% over transparent`): 1px 풀 보더·divider 전용.

### Named Rules

**The Gold Scarcity Rule.** 골드(`gold-500`)는 어느 화면에서도 ≤10%. 라이브·매칭·즉시예약·단 하나의 핵심 CTA에만. 골드가 흔해지면 카지노가 된다.

**The Tinted Neutral Rule.** `#000`·`#fff` 금지. 모든 중성색은 burgundy(10) 또는 ink(290) hue로 chroma 0.005–0.04 틴트한다.

## 3. Typography

**Display / Body Font:** Pretendard Variable (with -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif)
**Label / Mono Font:** JetBrains Mono (with SF Mono, Consolas) — 타이머·kicker 라벨·코드 한정

**Character:** 한글 가독성이 첫째인 단일 산세리프 한 벌이 디스플레이부터 본문·라벨까지 모두 감당한다. 디스플레이는 굵게(800) 조여서(-0.022em) 셀러의 묵직함을, 본문은 1.5 행간으로 편안함을 준다. 모노는 시간·코드·대문자 kicker에만 절제해서 쓴다.

### Hierarchy

- **Display** (800, `2.375rem`–`3.75rem` `--fs-4xl..6xl`, lh 1.1): 랜딩 hero, 페이지 타이틀. `letter-spacing: -0.022em`.
- **Headline** (700, `1.5rem`–`1.875rem`, lh 1.25): 섹션 제목.
- **Title** (700, `1.125rem`–`1.25rem`, lh 1.25): 카드·서브섹션 제목.
- **Body** (400, `1rem`, lh 1.5): 본문. 산문은 65–75ch(`--max-prose: 680px`)로 제한.
- **Label** (600, `0.75rem`, `letter-spacing: 0.18em`, UPPERCASE, mono): kicker("VENUE SOURCING STUDIO"), 타이머.

### Named Rules

**The Fixed-Scale Rule.** product 화면은 고정 rem 스케일(`--fs-*`)을 쓴다. 사이드바·시트에서 줄어드는 clamp 디스플레이는 hero(랜딩) 외 금지.

## 4. Elevation

따뜻한 burgundy-tinted 그림자로 깊이를 만든다. cool gray 그림자는 금지 — 차가운 그림자는 크림 캔버스 위에서 이물처럼 뜬다. 표면은 기본적으로 평평하고, 그림자는 hover·시트·glow처럼 상태에 반응할 때 올라온다.

### Shadow Vocabulary

- **xs / sm** (`0 1–2px … burgundy-900 8–10%`): 칩·작은 버튼, hover 미세 부상.
- **md** (`0 10px 24px … burgundy-900 12%`): 추천 카드 hover, 떠 있는 패널.
- **lg / xl** (`0 22–40px … burgundy-900 16–22%`): 바텀 시트, 최상위 오버레이.
- **glow** (`0 0 0 4px rose 22% + 0 14px 36px burgundy 32%`): 라이브 매칭·액티브 아바타·핏 스코어 링 전용.

### Named Rules

**The Warm-Shadow Rule.** 모든 그림자는 burgundy/ink alpha 기반. `rgba(0,0,0,…)` 회색 그림자 금지(다크모드 제외). **The Glow-Is-Sacred Rule.** `--shadow-glow`는 "지금 살아있는" 요소(라이브·매칭·핏 링)에만.

## 5. Components

### Buttons

- **Shape:** 알약형 (`999px`, `--radius-pill`). 높이 sm 36 / md 44 / lg 52 / xl 60px.
- **Primary:** `burgundy-700` 채움 + cream-100 글자, `--shadow-md`. hover → `burgundy-800`. 누름 시 `scale(0.98)` 스프링.
- **Gold:** `gold-500` + ink 글자. 즉시예약·핵심 CTA 전용 (골드 희소 규칙).
- **Soft:** `burgundy-100` 배경 + `burgundy-800` 글자. 보조 액션.
- **Ghost / Outline:** 투명/1px 보더. 취소·뒤로·토글.
- 로딩 시 스피너 + `aria-busy`. 모든 상태(default/hover/focus/active/disabled/loading) 구비.

### Chips

- **Style:** 알약형, `surface` 배경 + `text-muted`, 1px border. **Selected:** `burgundy-700` 채움 + cream 글자 (`aria-pressed`).
- **Use:** 필터·카테고리·동네·요일 토글. 섭외 스튜디오 브리프 바의 1차 입력 수단.

### Cards / Containers

- **Corner:** `16px`(`--radius-xl`) 카드, `12px` 내부 블록.
- **Variants:** plain / soft / glass / gradient / twilight. **Background:** `surface`, 강조 패널은 `--grad-cream-rose`.
- **Shadow:** 기본 `--shadow-sm`, hover `--shadow-md` + `translateY(-3px)`.
- **Nested cards 금지.** 카드 안의 카드는 항상 오답.

### Inputs / Fields

- **Style:** `surface` 배경, 1px `border`, `12px` radius, 높이 44px.
- **Focus:** `outline: 2px var(--brand-burgundy-400)` + offset 3px.
- **Error:** `--color-danger` 보더 + 하단 메시지, `aria-invalid`.

### Navigation

- 상단 헤더(56–64px) + 모바일 하단 탭(64px). 라이브 라운드에서는 전부 숨김(몰입형).

### Fit Score Ring (signature)

섭외 스튜디오의 시그니처. 추천 공간의 적합도(0–100)를 `conic-gradient(grade-color var(--deg), 트랙 0)` 도넛으로 표현하고, grade(perfect=gold / great=success / good=rose / fair=subtle)로 색을 바꾼다. 가운데 흰 원에 점수 + "FIT" 라벨. 카드 cover 우하단에 살짝 걸쳐 떠 있다(`--shadow-md`).

### Booking Bottom Sheet (signature)

modal-first를 피한 진행형 시트. 화면 하단에서 `sheetUp`(translateY+opacity)으로 올라오며, 투명 견적(시간×단가×배수 − 막판할인 + 청소비)을 행 단위로 풀어 보여주고 instant/request에 따라 CTA 문구·색이 바뀐다. scrim은 `ink 55%` + 미세 blur.

## 6. Do's and Don'ts

### Do:

- **Do** burgundy로 면적의 30–60%를 채워 정체성을 만든다. cream은 캔버스, gold는 ≤10% 강조.
- **Do** 카테고리 그라데이션(`--grad-*`)으로 같은 레이아웃에 다른 무드를 입힌다.
- **Do** 모든 중성색을 burgundy(10)/ink(290) hue로 미세 틴트한다.
- **Do** 그림자는 warm(burgundy alpha). `--shadow-glow`는 라이브·매칭·핏 링에만.
- **Do** 카드는 cover가 있는 객체(공간 추천·파티)에만. 그 외엔 텍스트 + divider.
- **Do** ease-out 곡선(`--ease-out`, `--ease-out-expo`)으로 140–320ms 전환. `prefers-reduced-motion` 존중.

### Don't:

- **Don't** 문토·프립식 "같은 크기 카드 무한 그리드"를 만들지 않는다 (identical card grids).
- **Don't** Tinder·Bumble식 외모 우선 스와이프 UI를 쓰지 않는다.
- **Don't** 호스트 콘솔을 "통계 차트 카드 그리드" SaaS 대시보드로 만들지 않는다. 라이브 진행 도구처럼 보여야 한다.
- **Don't** 카지노식 적색+황금으로 자극하지 않는다. 어두운 톤은 라운지의 깊이.
- **Don't** "AI 매칭"·"최고의" 같은 마케팅 슬롭, hero-metric 템플릿(큰 숫자+라벨+gradient)을 쓰지 않는다.
- **Don't** `border-left/right > 1px` 컬러 스트라이프, `background-clip:text` 그라데이션 텍스트, 기본 glassmorphism, nested card, modal-first 사고. (glass는 라이브 페어 카드·글래스 nav만)
- **Don't** `#000`·`#fff`, cool gray 그림자, em dash(`—`)를 쓰지 않는다.

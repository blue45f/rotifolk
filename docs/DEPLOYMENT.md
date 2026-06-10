# Rotifolk 배포 가이드 (Deployment)

이 문서는 Rotifolk 전체 배포 구조를 다룹니다. 두 개의 독립 티어를 서로 다른
호스트에 올립니다.

| 티어             | 패키지                                      | 호스트                                    | 배포 트리거                               |
| ---------------- | ------------------------------------------- | ----------------------------------------- | ----------------------------------------- |
| 프론트엔드 (SPA) | `apps/web` (React 19 + Vite)                | **Vercel**                                | `.github/workflows/deploy-vercel-web.yml` |
| 백엔드 (API)     | `apps/api` (NestJS 11 + Prisma + Socket.IO) | **EC2** (Docker + Caddy)                  | `.github/workflows/deploy-ec2-api.yml`    |
| 공통 패키지      | `packages/shared`                           | (독립 배포 없음 — 두 티어가 빌드 시 흡수) | —                                         |

> 핵심: 웹은 Vercel 정적 호스팅, API는 컨테이너로 영구 디스크가 있는 Render에
> 올립니다. CI의 배포 스텝은 **시크릿이 없으면 스킵**되도록 설계되어 있어, 포크나
> 권한 없는 기여자에게도 파이프라인이 초록색으로 유지됩니다. 실제 배포를
> 활성화하려면 아래 시크릿/대시보드 작업을 직접 수행해야 합니다.

## 현재 운영 메모 (2026-06-08 기준)

현재 실제 운영은 아래 상태로 확인되었습니다. 이 절은 현재 배포 상태를 기록한 메모이며, 아래의 Render/Vercel 표준 가이드와 다를 수 있습니다.

- GitHub Actions의 **Deploy web to Vercel**은 `VERCEL_TOKEN`이 GitHub Actions secret으로 등록되어 있지만, Vercel free-plan API deployment quota 소모를 피하기 위해 직접 `vercel deploy`를 실행하지 않습니다. 웹 production 배포는 Vercel Git integration이 main push를 감지해 처리합니다.
- GitHub Actions의 **Deploy API to Render**는 `RENDER_DEPLOY_HOOK_URL`이 비어 있어서 workflow 자체 배포가 스킵됩니다. 현재 운영 API는 Render가 아니라 EC2를 사용합니다.
- 2026-06-08 운영 웹 복구/배포는 Vercel Git integration으로 처리되며, main push 후 `https://rotifolk.vercel.app` production alias가 최신 production deployment에 연결됩니다. 필요할 때만 `vercel promote`를 수동으로 사용합니다.
- 2026-06-08 운영 API 배포는 **Deploy API to EC2** workflow로 자동화했습니다. GitHub runner가 `apps/api/Dockerfile`로 Docker 이미지를 빌드하고, 배포 중 GitHub Actions runner IP만 EC2 보안그룹에 `/32`로 임시 허용한 뒤, 이미지를 EC2에 스트리밍 로드하고 `rotifolk-api` 컨테이너를 교체합니다. cleanup에서 임시 SSH 허용 규칙을 회수합니다.
- 현재 Vercel rewrite는 `vercel.json` 기준 `https://rotifolk.3.107.235.143.nip.io/api/:path*`로 API 요청을 전달합니다. 이 호스트는 EC2의 Caddy가 `rotifolk-api:3000` 컨테이너로 reverse proxy합니다. `/sitemap.xml`·`/robots.txt`도 같은 오리진의 `/api/seo/*` 엔드포인트로 rewrite되어 SPA catch-all보다 먼저 매칭됩니다.
- EC2 API 컨테이너는 `/opt/rotifolk-runtime.env`와 `rotifolk-data:/app/data` Docker volume을 사용합니다. 컨테이너 교체 시 이 env 파일과 volume은 유지해야 합니다.
- EC2 디스크는 2026-06-08 Docker builder cache 정리 후 `/` 기준 약 `4.5GB` 여유로 회복되었습니다. 반복 배포 전에는 dangling image/layer 정리 또는 디스크 증설을 계속 고려해야 합니다.

---

## 1. 아키텍처 개요

```
                ┌─────────────────────┐         ┌──────────────────────────────┐
   브라우저  →  │  Vercel (apps/web)  │  HTTPS  │  Render (apps/api, Docker)   │
                │  정적 SPA + SW      │ ───────▶│  NestJS REST + Socket.IO     │
                │  VITE_API_URL       │  WS     │  /api/*  ·  /socket.io       │
                └─────────────────────┘         │  Prisma 7 + better-sqlite3   │
                                                │  영구 디스크의 SQLite 파일    │
                                                └──────────────────────────────┘
```

- 프론트는 `VITE_API_URL`(기본 `/api`)과 `VITE_SOCKET_URL`로 백엔드를 가리킵니다.
  로컬 dev에서는 Vite 프록시가 `/api`·`/socket.io`를 `localhost:3000`으로 보냅니다
  (`apps/web/vite.config.ts`). 프로덕션(Vercel)에서는 이 두 값을 **배포된 Render
  도메인**으로 설정해야 합니다.
- 백엔드는 `0.0.0.0:$PORT`에 바인딩하고 전역 prefix `/api`, CORS는 `CORS_ORIGIN`
  허용목록으로 제어합니다(`apps/api/src/main.ts`). 헬스 엔드포인트는 `/api/health`.

### 데이터베이스 주의 (이 저장소의 실제 동작에 정확히 맞춤)

`apps/api/src/prisma/prisma.service.ts`는 **Prisma 7 + better-sqlite3 드라이버
어댑터**를 사용합니다. 즉 런타임은 **SQLite 전용**이고 DB는 파일 하나입니다.
스키마(`apps/api/prisma/schema.prisma`) 주석에 “운영은 Postgres” 라고 적혀 있지만,
**실제 어댑터는 better-sqlite3로 고정**되어 있으므로 Postgres로 가려면 먼저 어댑터를
교체해야 합니다. 따라서 운영에서는 이 SQLite 파일이 **영구 디스크/볼륨** 위에
있어야 하며, 그렇지 않으면 매 배포·재시작마다 데이터가 사라집니다.

또한 이 저장소에는 **마이그레이션 히스토리가 없습니다**(`apps/api/prisma/migrations`
없음). 스키마 동기화는 `prisma migrate deploy`가 아니라 **`prisma db push`**(스키마
선언 → DB 반영)로 수행합니다.

---

## 2. 프론트엔드 — Vercel (`apps/web`)

### 빌드/배포 명령

- 빌드: `pnpm --filter @rotifolk/web build` (→ `tsc -b && vite build`, 산출물 `apps/web/dist`)
- 배포(워크플로 내부): `apps/web`에서 `vercel deploy --prod --confirm --token $VERCEL_TOKEN`

### 워크플로

`.github/workflows/deploy-vercel-web.yml`

- `main` 푸시 시(웹/공통/잠금파일 경로 변경) 또는 수동 실행으로 트리거.
- **`VERCEL_TOKEN`이 설정되지 않으면 전체 스텝을 스킵**합니다.

### 필요한 GitHub 시크릿

| 시크릿         | 용도                                             |
| -------------- | ------------------------------------------------ |
| `VERCEL_TOKEN` | Vercel CLI 인증. 없으면 워크플로가 배포를 건너뜀 |

### Vercel 대시보드에서 직접 해야 하는 일 (CI가 대신 못 함)

1. Vercel 프로젝트를 이 저장소에 연결하고 **Root Directory = `apps/web`** 지정.
   (모노레포이므로 루트가 아니라 `apps/web`을 빌드 루트로.)
2. 빌드 설정: Framework = Vite, Build Command = `pnpm build`(앱 기준),
   Output Directory = `dist`. pnpm 버전은 루트 `package.json`의
   `packageManager`(pnpm 11) 사용.
3. 프로젝트 환경 변수 설정:
   - `VITE_API_URL` = `https://<render-api-도메인>/api`
   - `VITE_SOCKET_URL` = `https://<render-api-도메인>`
   - (필요 시) `VITE_USE_MSW`는 **설정하지 않음**(목 모드 비활성).
4. `VERCEL_TOKEN`을 GitHub 저장소 시크릿에 추가하면 위 워크플로가 활성화됩니다.

### 프리뷰 vs 프로덕션

- 워크플로는 `--prod`로 **프로덕션 배포**만 수행합니다.
- 프리뷰는 Vercel의 Git 연동(PR마다 Preview URL)으로 자동 제공됩니다. CI
  워크플로와는 별개입니다.

---

## 3. 백엔드 — Render (Docker, `apps/api`)

백엔드는 멀티스테이지 프로덕션 Dockerfile로 패키징하며, Render 블루프린트로
영구 디스크 + 헬스체크와 함께 올립니다.

### 산출물

- `apps/api/Dockerfile` — `node:22-alpine` 멀티스테이지
  (deps → build → runtime), 프로덕션 의존성만(`pnpm deploy --prod --legacy`),
  네이티브 모듈(better-sqlite3·argon2)과 생성된 Prisma 클라이언트 포함.
- `apps/api/docker-entrypoint.sh` — 부팅 시 `prisma db push`(스키마 동기화) 후
  `node`로 직접 기동. (`pnpm run`을 쓰지 않음 — 가지치기된 번들에 남는
  `workspace:*` 의존성 때문에 `pnpm`이 워크스페이스 검사로 실패하기 때문.)
- `apps/api/tsconfig.runtime.json` — 컴파일된 `dist/` 기준으로 `@/*`·
  `@rotifolk/shared` 경로 별칭을 매핑(런타임 `tsconfig-paths/register`용).
- `render.yaml` — Render 블루프린트(서비스 + 1GB 영구 디스크 + `/api/health`).
- `.dockerignore`(루트) — 빌드 컨텍스트 최소화.

### 로컬에서 이미지 빌드/실행 (검증 방법)

빌드 컨텍스트는 **반드시 저장소 루트**여야 합니다(워크스페이스 + `packages/shared`
접근).

```bash
# 빌드
docker build -f apps/api/Dockerfile -t rotifolk-api .

# 실행 (영구 데이터는 /app/data 볼륨에)
docker run -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e CONTACT_PEPPER="$(openssl rand -hex 16)" \
  -e CORS_ORIGIN="https://rotifolk.vercel.app" \
  -v rotifolk-data:/app/data \
  rotifolk-api

# 헬스 체크
curl http://localhost:3000/api/health   # → {"ok":true,"app":"rotifolk-api",...}
```

엔트리포인트가 `DATABASE_URL`(기본 `file:/app/data/prod.db`)에 스키마를
push한 뒤 NestJS를 기동합니다.

### Render 블루프린트 (`render.yaml`)

Render 블루프린트는 **CI가 자동 적용하지 않습니다**. 한 번은 수동으로:

1. Render 대시보드 → **New > Blueprint** → 이 저장소 선택.
2. Render가 `render.yaml`을 읽어 `rotifolk-api` 웹 서비스 + `/app/data`에 마운트되는
   1GB 영구 디스크를 프로비저닝합니다.
3. `sync: false`로 표시된 시크릿을 대시보드에서 채웁니다(아래 표).
4. 매 배포 직전 `preDeployCommand`가 `prisma db push`로 스키마를 영구 디스크의
   SQLite 파일에 동기화합니다(멱등). 이미지 엔트리포인트도 같은 push를 수행하므로
   이중 안전장치입니다.

블루프린트 주요 설정:

- `runtime: docker`, `dockerfilePath: ./apps/api/Dockerfile`, `dockerContext: .`
- `healthCheckPath: /api/health`
- `disk`: `rotifolk-sqlite`, `mountPath: /app/data`, `sizeGB: 1`
  (무료 플랜은 영구 디스크가 없으므로 **`plan: starter` 이상** 필요)
- `PORT: 10000`(Render는 외부 트래픽을 이 포트로 라우팅), `DATABASE_URL:
file:/app/data/prod.db`

### 워크플로 (`.github/workflows/deploy-render-api.yml`)

프론트의 Vercel 워크플로와 동일한 **토큰 게이트** 패턴입니다.

- `main` 푸시 시(api/공통/잠금/`render.yaml` 경로 변경) 또는 수동 실행으로 트리거.
- **`RENDER_DEPLOY_HOOK_URL`이 없으면 스킵**.
- 있으면 Render Deploy Hook URL로 `POST`를 보내 배포를 트리거합니다.
- (참고) `render.yaml`의 `autoDeploy: true`로 Render 자체도 푸시 시 자동 배포할 수
  있습니다. 이 워크플로는 명시적·관찰 가능한 CI 트리거를 추가로 제공합니다.

### 필요한 환경 변수 / 시크릿 (백엔드)

| 키                         | 위치                         | 필수 | 설명                                                                                   |
| -------------------------- | ---------------------------- | :--: | -------------------------------------------------------------------------------------- |
| `JWT_SECRET`               | Render env (`sync:false`)    |  ✅  | JWT 서명 시크릿. 코드의 dev 기본값 `dev-secret-change-me`를 **절대** 운영에 쓰지 말 것 |
| `CONTACT_PEPPER`           | Render env (`sync:false`)    |  ✅  | 연락처(전화번호) 해싱 pepper. 고정·비밀 유지(dev 기본값 `rotifolk-pepper`)             |
| `CORS_ORIGIN`              | Render env (`sync:false`)    |  ✅  | 콤마 구분 허용 오리진. 예: `https://rotifolk.vercel.app`                               |
| `DATABASE_URL`             | Render env (블루프린트 고정) |  ✅  | `file:/app/data/prod.db` (영구 디스크)                                                 |
| `PORT`                     | Render env (블루프린트 고정) |  ✅  | `10000`                                                                                |
| `NODE_ENV`                 | Render env (블루프린트 고정) |  —   | `production`                                                                           |
| `PLATFORM_FEE_PERCENT`     | Render env (선택)            |  —   | 주문당 플랫폼 수수료 %, 기본 8                                                         |
| `REFUND_RETENTION_PERCENT` | Render env (선택)            |  —   | 환불 보유 %, 기본 0                                                                    |
| `MIN_HOST_PAYOUT_PERCENT`  | Render env (선택)            |  —   | 호스트 정산 하한 %, 기본 85                                                            |

전체 목록과 dev 기본값은 `apps/api/.env.example` 참고.

| GitHub 시크릿            | 용도                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `RENDER_DEPLOY_HOOK_URL` | Render Deploy Hook 호출용. 없으면 워크플로가 배포를 건너뜀 |

### Render 대시보드에서 직접 해야 하는 일

1. Blueprint로 서비스를 생성(위 절차).
2. `JWT_SECRET`, `CONTACT_PEPPER`, `CORS_ORIGIN`을 대시보드에 입력.
3. (선택) **Settings → Deploy Hook**에서 Hook URL을 복사해 GitHub 시크릿
   `RENDER_DEPLOY_HOOK_URL`에 등록하면 CI 트리거가 활성화됩니다.
4. 배포 후 Render가 부여한 도메인을 **Vercel의 `VITE_API_URL`/`VITE_SOCKET_URL`**과
   백엔드 `CORS_ORIGIN`에 양방향으로 반영.

### WebSocket(Socket.IO) 주의

라이브 파티는 Socket.IO를 사용합니다. Render 웹 서비스는 WebSocket을 기본
지원하므로 위 단일 웹 서비스 외 추가 설정이 필요 없습니다. 프론트는
`VITE_SOCKET_URL`(목 모드가 아닐 때)로 접속합니다(`apps/web/src/features/live/socket.ts`).

---

## 4. 대안: Fly.io 등 다른 컨테이너 호스트

`apps/api/Dockerfile`은 호스트 비종속입니다. Fly.io를 쓴다면:

- `fly launch --no-deploy`로 `fly.toml` 생성, `[build] dockerfile =
"apps/api/Dockerfile"`, `internal_port`를 컨테이너 `PORT`에 맞춤.
- SQLite 영속을 위해 **볼륨**을 `/app/data`에 마운트(`fly volumes create`).
- `[[http_service.checks]]`로 `/api/health` 헬스체크.
- `fly secrets set JWT_SECRET=… CONTACT_PEPPER=… CORS_ORIGIN=…`.

현재 저장소는 Render를 기본 백엔드 호스트로 둡니다(`render.yaml` 제공). Fly용
`fly.toml`은 의도적으로 포함하지 않았습니다 — 필요 시 위 가이드로 추가하세요.

---

## 5. 배포 전 검증 게이트

배포 파이프라인과 별개로, 코드 게이트는 다음으로 검증합니다.

```bash
pnpm verify   # validate:architecture + ci(typecheck·test·audit·build) — 머지/배포 전 필수
```

CI(`.github/workflows/ci.yml`)는 `pnpm install --frozen-lockfile` 후 `pnpm verify`와
시드 스모크를 실행합니다. (`--frozen-lockfile` + pnpm 11에서 네이티브 빌드가
승인되도록 `pnpm-workspace.yaml`의 `allowBuilds`에 better-sqlite3·argon2·esbuild
등을 등록해 두었습니다.)

---

## 6. 배포 체크리스트 (요약)

- [ ] Vercel 프로젝트: Root = `apps/web`, `VITE_API_URL`/`VITE_SOCKET_URL` 설정
- [ ] GitHub 시크릿 `VERCEL_TOKEN` 등록
- [ ] Render Blueprint 적용 → `JWT_SECRET`·`CONTACT_PEPPER`·`CORS_ORIGIN` 입력
- [ ] (선택) GitHub 시크릿 `RENDER_DEPLOY_HOOK_URL` 등록
- [ ] Render 도메인을 Vercel 환경변수 + 백엔드 `CORS_ORIGIN`에 반영
- [ ] 영구 디스크(`/app/data`) 마운트 확인 — 미설정 시 데이터 유실
- [ ] `curl https://<api>/api/health`로 라이브니스 확인

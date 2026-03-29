# WebSpice

브라우저에서 동작하는 전문급 SPICE 회로 시뮬레이터

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38b2ac.svg)
![Headless UI](https://img.shields.io/badge/Headless_UI-2.x-4f46e5.svg)

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x 이상
- npm 또는 yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/DrCloy/web-spice.git
cd web-spice

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Scripts

```bash
npm run dev          # 개발 서버 실행
npm run build        # 프로덕션 빌드
npm run test         # 테스트 실행
npm run test:watch   # TDD 모드 (실시간 테스트)
npm run lint         # 코드 품질 검사
npm run format       # 코드 포매팅
npm run ci           # 전체 CI 파이프라인 실행
```

## 📋 Documentation

- **[PRD (Product Requirements Document)](docs/PRD.md)** - 프로젝트 요구사항 및 로드맵
- **[Development Guide](docs/DEVELOPMENT.md)** - 개발 환경 설정 및 가이드라인
- **[Contributing](docs/CONTRIBUTING.md)** - 기여 방법 및 PR 가이드라인

## 🎯 Features

### Phase 1: MVP Engine (진행중)

- ✅ 기본 회로 소자 (저항, 전압원, 전류원)
- ✅ DC 분석 엔진
- ✅ DC Sweep 분석
- ✅ JSON 기반 회로 입력
- ⏳ 콘솔 기반 결과 출력

### Phase 2: Basic UI (계획됨)

- 📋 Canvas 기반 회로 에디터
- 📋 AC 분석 엔진
- 📋 실시간 그래프 표시
- 📋 컴포넌트 팔레트

### Phase 3: Advanced UX (계획됨)

- 📋 드래그앤드롭 인터페이스
- 📋 반도체 소자 지원
- 📋 GPU 가속 최적화
- 📋 고급 측정 도구

## 🛠 Tech Stack

### Frontend

- **React 19** - 컴포넌트 기반 UI 프레임워크
- **TypeScript** - 타입 안전성 및 개발 생산성
- **TailwindCSS** - 유틸리티 우선 CSS 프레임워크
- **Headless UI** - 접근성 높은 UI 컴포넌트
- **Redux Toolkit** - 상태 관리
- **React Compiler** - 자동 성능 최적화

### Development

- **Vite** - 빠른 개발 서버 및 빌드 도구
- **Vitest** - 단위 테스트 및 TDD 지원
- **ESLint + Prettier** - 코드 품질 및 일관성
- **Husky** - Git 훅을 통한 자동 검증
- **GitHub Actions** - CI/CD 파이프라인

### Simulation Engine

- **Phase 1**: JavaScript/TypeScript (CPU 기반)
- **Phase 2**: WebGL (GPU 가속 시작)
- **Phase 3**: WebGPU (고성능 컴퓨트 셰이더)

## 🏗 Project Structure

```
web-spice/
├── public/                 # 정적 파일
├── src/
│   ├── components/         # 재사용 컴포넌트
│   │   ├── ui/            # 기본 UI 컴포넌트
│   │   ├── circuit/       # 회로 관련 컴포넌트
│   │   └── charts/        # 그래프 컴포넌트
│   ├── engine/            # SPICE 시뮬레이션 엔진
│   │   ├── analysis/      # DC 분석기 (Phase 1), AC/Transient (Phase 2+)
│   │   ├── circuit/       # CircuitImpl
│   │   ├── components/    # 컴포넌트 모델 (R, VoltageSource, CurrentSource)
│   │   ├── formatter/     # 시뮬레이션 결과 포매터
│   │   ├── parser/        # 회로 파서 (JSON, SI prefix)
│   │   └── solver/        # MNA, LU 분해, Newton-Raphson
│   ├── store/             # Redux 상태 관리
│   ├── utils/             # 유틸리티 함수
│   ├── types/             # TypeScript 타입 정의
│   └── hooks/             # 커스텀 훅
├── docs/                  # 프로젝트 문서
├── .github/               # GitHub 템플릿 및 워크플로
└── tests/                 # 테스트 파일
```

## 💻 Development Guidelines

### Code Style

- **함수형 컴포넌트** + React Hooks 사용
- **TypeScript strict mode** 준수
- **TailwindCSS 유틸리티** 우선 사용
- **TDD (Test-Driven Development)** 방식 권장

### Naming Conventions

```typescript
// 파일명
ComponentName.tsx; // 컴포넌트
useCustomHook.ts; // 훅
utilityFunction.ts; // 유틸리티

// 변수명
const nodeVoltages = []; // camelCase
const MAX_ITERATIONS = 100; // UPPER_SNAKE_CASE (상수)
interface ComponentModel {} // PascalCase (타입)
```

### Git Workflow

```bash
# 브랜치 생성
git checkout -b feature/1-resistor-model

# 커밋 메시지
feat: add resistor component model
fix: resolve matrix solver convergence issue
docs: update installation guide

# PR 제목
[FEAT] 저항 컴포넌트 모델 구현 (closes #1)
```

### Testing Strategy

```bash
# TDD 개발 사이클
npm run test:watch      # 실시간 테스트 감시
# Red → Green → Refactor 반복
```

## 🔧 Configuration

### Environment Setup

```bash
# 개발 환경 확인
node --version          # v20.x 이상 필요
npm --version          # v9.x 이상 권장

# 에디터 설정 (VS Code 권장)
# - ESLint 확장
# - Prettier 확장
# - TypeScript 지원
```

### Browser Support

- **Chrome 90+** (WebGL/WebGPU 지원)
- **Firefox 88+** (WebGL 지원)
- **Safari 14+** (WebGL 지원)
- **Edge 90+** (WebGL/WebGPU 지원)

## 🚦 CI/CD

### GitHub Actions

- **자동 빌드 검증** (TypeScript, ESLint, Prettier)
- **테스트 실행** (모든 PR에 대해)
- **성능 체크** (번들 크기 모니터링)

### Quality Gates

```bash
# PR 머지 전 필수 체크
✅ 모든 테스트 통과
✅ ESLint 규칙 준수
✅ TypeScript 타입 체크
✅ Prettier 포매팅
✅ 빌드 성공
```

## 📊 Performance Goals

### Target Metrics

- **시뮬레이션 속도**: 100 노드 회로 < 1초
- **정확도**: 기존 SPICE 도구와 ±0.1% 오차
- **메모리 사용**: < 512MB (1000 노드 회로)
- **초기 로딩**: < 3초 (첫 방문)

### Optimization Strategy

- **React Compiler**: 자동 컴포넌트 최적화
- **Code Splitting**: 라우트별 청크 분할
- **WebGL/WebGPU**: GPU 가속 행렬 연산
- **Service Worker**: 오프라인 캐싱 (Phase 4)

## 🤝 Contributing

### Getting Started

1. **이슈 확인**: [GitHub Issues](https://github.com/DrCloy/web-spice/issues)
2. **브랜치 생성**: `feature/issue-번호-설명`
3. **TDD 개발**: 테스트 → 구현 → 리팩토링
4. **PR 생성**: 템플릿에 따라 작성
5. **코드 리뷰**: CI 통과 후 리뷰

### Issue Labels

- `phase-1-mvp`, `phase-2-ui`, `phase-3-ux` - 개발 단계
- `priority-high`, `priority-medium`, `priority-low` - 우선순위
- `feature`, `bug`, `enhancement`, `docs` - 작업 타입

## 📜 License

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

## 🔗 Links

- **Live Demo**: [Coming Soon]
- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/DrCloy/web-spice/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DrCloy/web-spice/discussions)

---

<div align="center">

**WebSpice**는 웹 기술의 가능성을 탐구하며 전문급 회로 시뮬레이션을 브라우저에서 실현하는 프로젝트입니다.

⭐ **이 프로젝트가 유용하다면 Star를 눌러주세요!** ⭐

</div>

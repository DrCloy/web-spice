# Contributing to WebSpice

WebSpice 프로젝트에 기여해주셔서 감사합니다! 이 문서는 효과적인 협업을 위한 가이드라인을 제공합니다.

## 🚀 빠른 시작

### 개발 환경 설정

1. **Repository 포크 및 클론**

```bash
# 1. GitHub에서 DrCloy/web-spice를 포크
# 2. 로컬에 클론
git clone https://github.com/YOUR_USERNAME/web-spice.git
cd web-spice

# 3. Upstream 리모트 추가
git remote add upstream https://github.com/DrCloy/web-spice.git
```

2. **Dev Container 사용 (권장)**

```bash
# VS Code에서 열기
code .

# Command Palette (Cmd/Ctrl + Shift + P)
# "Dev Containers: Reopen in Container" 선택
```

3. **의존성 설치 및 확인**

```bash
npm install
npm run ci:quick  # 환경 검증
```

## 📋 기여 프로세스

### 1. 이슈 확인 및 할당

- **새 기능**: [Feature Request 이슈](https://github.com/DrCloy/web-spice/issues/new?template=feature_request.md) 생성
- **버그 수정**: [Bug Report 이슈](https://github.com/DrCloy/web-spice/issues/new?template=bug_report.md) 생성
- **기존 이슈**: [Issues 목록](https://github.com/DrCloy/web-spice/issues)에서 선택

```bash
# 이슈에 댓글로 참여 의사 표현
"I'd like to work on this issue. Could you assign it to me?"
```

### 2. 브랜치 생성 및 개발

```bash
# 최신 main 브랜치 동기화
git fetch upstream
git checkout main
git merge upstream/main

# 새 브랜치 생성 (이슈 기반 네이밍)
git checkout -b feature/123-resistor-component

# 브랜치 네이밍 규칙:
# feature/이슈번호-간단설명    # 새 기능
# bugfix/이슈번호-간단설명     # 버그 수정
# docs/간단설명              # 문서 업데이트
# refactor/간단설명          # 리팩토링
```

### 3. TDD 개발 사이클

```bash
# 테스트 감시 모드 시작
npm run test:watch

# Red → Green → Refactor 반복
# 1. 실패하는 테스트 작성
# 2. 테스트 통과하는 최소 코드 작성
# 3. 코드 개선 (성능, 가독성)
```

### 4. 코드 품질 검증

```bash
# 커밋 전 필수 검사
npm run ci:quick         # 빠른 검증
npm run test:coverage    # 커버리지 확인
npm run lint:fix         # 자동 린트 수정
npm run format          # 코드 포매팅
```

### 5. 커밋 및 푸시

```bash
# 의미있는 단위로 커밋
git add .
git commit -m "feat: add resistor component model

- Implement Ohm's law calculation
- Add input validation for resistance values
- Include comprehensive unit tests
- Update component type definitions

Closes #123"

# 브랜치 푸시
git push origin feature/123-resistor-component
```

### 6. Pull Request 생성

GitHub에서 PR 생성 시 **자동으로 PR 템플릿**이 적용됩니다.

#### PR 제목 형식

```
[타입] 간단한 설명 (closes #이슈번호)

예시:
[FEAT] 저항 컴포넌트 모델 구현 (closes #123)
[FIX] 행렬 해법 수렴 문제 해결 (closes #456)
[DOCS] API 문서 업데이트 (closes #789)
```

## 🔍 코딩 가이드라인

### 커밋 메시지 규약

```bash
# 형식: type: subject (최대 50자)
#
# 상세 설명 (72자로 줄바꿈)
#
# Closes #이슈번호

feat: add DC analysis engine
fix: resolve matrix singularity handling
docs: update installation guide
test: add integration tests for simulation
refactor: extract matrix utilities
style: format code with prettier
chore: update dependencies
perf: optimize matrix multiplication
```

### 코드 스타일

#### TypeScript

```typescript
// ✅ 좋은 예시
interface ComponentModel {
  readonly id: string;
  readonly type: ComponentType;
  readonly nodes: readonly number[];

  /**
   * 주어진 주파수에서의 임피던스 계산
   * @param frequency 주파수 (Hz)
   * @returns 복소수 임피던스
   */
  getImpedance(frequency: number): Complex;
}

class Resistor implements ComponentModel {
  constructor(
    public readonly id: string,
    public readonly nodes: readonly number[],
    private readonly resistance: number
  ) {
    if (resistance <= 0) {
      throw new Error('Resistance must be positive');
    }
  }

  getImpedance(_frequency: number): Complex {
    return new Complex(this.resistance, 0);
  }
}

// ❌ 피해야 할 예시
class BadResistor {
  public id: any; // any 사용 금지
  public nodes: number[]; // mutable 배열
  public r: number; // 불명확한 변수명

  getZ(f) {
    // 타입 명시 누락
    return this.r; // 잘못된 반환 타입
  }
}
```

#### React 컴포넌트 (Headless UI)

```tsx
// ✅ 좋은 예시 - Headless UI + TailwindCSS
import { Button } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface CircuitCanvasProps {
  readonly width: number;
  readonly height: number;
  readonly onComponentAdd?: (component: ComponentModel) => void;
}

export default function CircuitCanvas({
  width,
  height,
  onComponentAdd,
}: CircuitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('select');

  const handleCanvasClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !onComponentAdd) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const component = createComponent(selectedTool, { x, y });
      onComponentAdd(component);
    },
    [selectedTool, onComponentAdd]
  );

  return (
    <div className='flex flex-col'>
      <div className='flex gap-2 border-b border-gray-200 bg-white p-4'>
        <Button
          onClick={() => setSelectedTool('resistor')}
          className='bg-resistor hover:bg-resistor/90 focus:ring-resistor/50 inline-flex items-center gap-2 rounded-md px-3 py-2 text-white transition-colors focus:ring-2'
        >
          <PlusIcon className='h-4 w-4' />
          Resistor
        </Button>

        <Button
          onClick={() => setSelectedTool('capacitor')}
          className='bg-capacitor hover:bg-capacitor/90 focus:ring-capacitor/50 inline-flex items-center gap-2 rounded-md px-3 py-2 text-white transition-colors focus:ring-2'
        >
          <PlusIcon className='h-4 w-4' />
          Capacitor
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className='circuit-canvas flex-1 cursor-crosshair'
        data-testid='circuit-canvas'
      />
    </div>
  );
}

CircuitCanvas.displayName = 'CircuitCanvas';

// ❌ 피해야 할 예시 - 직접 DOM 조작
function BadComponent() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // DOM 직접 조작 금지 - Headless UI 사용할 것
    if (buttonRef.current) {
      buttonRef.current.addEventListener('click', () => {});
    }
  }, []);

  return (
    <button ref={buttonRef} className='btn btn-primary'>
      Bad Button
    </button>
  );
}
```

### 테스트 작성 가이드

#### 단위 테스트 (GWT 패턴)

```typescript
describe('Resistor Component Model', () => {
  describe('Ohms Law Calculation', () => {
    it('should calculate voltage correctly for given current', () => {
      // Given: 1kΩ 저항이 있고
      const resistor = new Resistor('R1', [1, 2], 1000);

      // When: 1mA 전류가 흐를 때
      const voltage = resistor.getVoltage(0.001);

      // Then: 1V 전압이 발생한다 (V = IR)
      expect(voltage).toBeCloseTo(1, 10);
    });

    it('should throw error for invalid resistance values', () => {
      // Given & When & Then: 음수 저항값은 에러 발생
      expect(() => new Resistor('R1', [1, 2], -100)).toThrow(
        'Resistance must be positive'
      );
      expect(() => new Resistor('R1', [1, 2], 0)).toThrow(
        'Resistance must be positive'
      );
    });
  });
});
```

#### UI 테스트 (Headless UI)

```typescript
describe('Circuit Canvas User Interactions', () => {
  it('should place resistor on canvas click', async () => {
    // Given: Headless UI 버튼이 렌더링된 상태
    const onComponentAdd = vi.fn();
    render(<CircuitCanvas onComponentAdd={onComponentAdd} />);

    // When: 저항 버튼을 클릭하고
    const resistorButton = screen.getByRole('button', { name: /resistor/i });
    await userEvent.click(resistorButton);

    // Then: 캔버스 클릭 시 저항이 추가된다
    const canvas = screen.getByTestId('circuit-canvas');
    await userEvent.click(canvas);

    expect(onComponentAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'resistor',
        position: expect.any(Object)
      })
    );
  });

  it('should apply correct Headless UI focus styles', async () => {
    render(<CircuitToolbar />);

    const button = screen.getByRole('button', { name: /add resistor/i });
    await userEvent.tab(); // 키보드 네비게이션

    expect(button).toHaveClass('focus:ring-2', 'focus:ring-resistor/50');
  });
});
```

## 🏷 Issue 및 PR 라벨

### Issue 라벨

- **Phase 라벨**: `phase-1-mvp`, `phase-2-ui`, `phase-3-ux`
- **우선순위**: `priority-high`, `priority-medium`, `priority-low`
- **타입**: `feature`, `bug`, `enhancement`, `docs`, `refactor`
- **영역**: `algorithm`, `ui`, `performance`
- **상태**: `good-first-issue`, `help-wanted`

### 라벨 사용 예시

```
이슈: "저항 컴포넌트 모델 구현"
라벨: phase-1-mvp, feature, algorithm, priority-high

이슈: "캔버스 렌더링 성능 개선"
라벨: phase-2-ui, enhancement, performance, priority-medium
```

## 🎯 기여 유형별 가이드

### 새 기능 개발

1. **PRD 확인**: [docs/PRD.md](docs/PRD.md)에서 기능 명세 확인
2. **API 설계**: 인터페이스부터 설계 (TypeScript)
3. **TDD 개발**: 테스트 → 구현 → 리팩토링
4. **문서 업데이트**: JSDoc, README 업데이트

### 버그 수정

1. **재현 테스트**: 버그를 재현하는 테스트 작성
2. **원인 분석**: 로깅, 디버거 활용
3. **최소 수정**: 사이드 이펙트 최소화
4. **회귀 테스트**: 다른 기능 영향 확인

### 성능 개선

1. **벤치마크**: 개선 전후 성능 측정
2. **프로파일링**: 병목 지점 정확히 파악
3. **점진적 개선**: 한 번에 하나씩 최적화
4. **검증**: 정확성 손실 없는지 확인

### 문서 개선

1. **사용자 관점**: 실제 사용 시나리오 고려
2. **예시 코드**: 동작하는 코드 예시 포함
3. **최신성**: 코드 변경과 문서 동기화
4. **접근성**: 초보자도 이해할 수 있도록

## 🔒 보안 이슈

보안 관련 문제를 발견하시면:

1. **GitHub Security Advisories 사용** (비공개 보고)
   - Repository → Security → Report a vulnerability
   - 또는 [직접 링크](https://github.com/DrCloy/web-spice/security/advisories/new)

2. **상세한 정보 제공**:
   - 재현 방법 및 단계
   - 예상 영향 범위
   - 환경 정보 (브라우저, OS 등)

3. **협조적 대응**:
   - 패치 개발까지 비공개 유지
   - 수정 후 공개적 크레딧 제공

## 🎉 기여자 인정

모든 기여자는 다음과 같이 인정받습니다:

- **README.md Contributors** 섹션에 이름 추가
- **Release Notes**에 기여 내용 명시
- **GitHub Discussions**에서 감사 인사
- **특별한 기여**: 별도 인정 (예: Phase 완성)

## 💬 커뮤니케이션

### GitHub Discussions

- **일반 질문**: Q&A 카테고리
- **기능 제안**: Ideas 카테고리
- **개발 논의**: General 카테고리
- **발표/공유**: Show and Tell 카테고리

### 이슈 댓글 에티켓

- **건설적 피드백**: 문제점과 함께 개선 방안 제시
- **명확한 의사소통**: 기술적 세부사항 명시
- **존중하는 태도**: 다양한 의견 존중
- **신속한 응답**: 멘션 받으면 3일 내 응답

## 📚 추가 자료

### 개발 관련

- **[Development Guide](docs/DEVELOPMENT.md)** - 상세 개발 가이드
- **[Architecture Overview](docs/ARCHITECTURE.md)** - 시스템 아키텍처 (추후 작성)
- **[API Documentation](docs/API.md)** - API 레퍼런스 (추후 작성)

### SPICE 도메인

- [SPICE User's Guide](http://bwrcs.eecs.berkeley.edu/Classes/IcBook/SPICE/) - 원조 SPICE 문서
- [Modified Nodal Analysis](https://en.wikipedia.org/wiki/Modified_nodal_analysis) - MNA 알고리즘
- [Circuit Simulation](https://www.springer.com/gp/book/9781461368786) - 회로 시뮬레이션 이론

### 웹 기술

- [React 19 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WebGL Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial)
- [WebGPU Specification](https://gpuweb.github.io/gpuweb/)

---

**질문이나 도움이 필요하시면 언제든 [Discussion](https://github.com/DrCloy/web-spice/discussions)에서 문의해주세요!**

**함께 멋진 웹 기반 SPICE 시뮬레이터를 만들어봅시다! 🚀⚡**

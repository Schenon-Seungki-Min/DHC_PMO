# DHC PMO — Thread-centric Project Management Tool

## 한 줄 설명
다수의 업무 흐름(Thread)을 타임라인 기반으로 시각화하고, 담당자 배정·마감일·진행 상태를 실시간 추적하는 경량 PMO 도구

## 기간
2026.02 (약 3주, MVP 개발 및 배포)

## 기술 스택
| 영역 | 기술 |
|------|------|
| **Frontend** | Vanilla JavaScript (SPA), Tailwind CSS, HTML5 Drag & Drop API, SheetJS (Excel 생성) |
| **Backend** | Node.js, Express.js, JWT 인증 |
| **Database** | Supabase (PostgreSQL), Row Level Security |
| **Deployment** | Vercel (Serverless Functions + Static Hosting) |
| **AI 활용** | Claude Code를 활용한 AI-assisted 개발 (전체 커밋의 약 83% AI 협업) |

## 현재 상태
MVP 운영 중 — 실제 팀 업무 관리에 활용 중이며, 지속적으로 기능 개선 진행

## 주요 기능
- **타임라인 뷰**: 주 단위 가로 타임라인에서 전체 Thread를 한눈에 조망, 담당자별 색상 구분
- **3계층 업무 구조**: Project → Thread → Task 계층으로 전략 방향부터 세부 업무까지 체계적 관리
- **Grab/Release 배정 시스템**: 담당자가 Thread를 "잡고(Grab)/놓는(Release)" 방식으로 배정 이력을 자동 추적
- **D-Day 긴급도 시각화**: 마감일 기준 4단계 색상 코딩 (여유 → 주의 → 긴급 → 초과) 으로 우선순위 즉시 판별
- **다중 담당자 시각화**: Lead/Support 역할 구분, 수평 밴드 레이아웃으로 동시 배정 현황 표시
- **Thread 템플릿**: 반복 업무를 템플릿화하여 Thread + Task를 일괄 생성, 상대적 마감일 자동 설정
- **팀원 워크로드 대시보드**: 팀원별 담당 Thread 수, 이번 주 마감 건수, 긴급 건수 통계
- **Excel 리포트 내보내기**: SheetJS 기반 클라이언트 사이드 다중 시트 엑셀 생성 (Thread/Task/People/Stakeholder)
- **드래그 앤 드롭 정렬**: 프로젝트·Thread 순서를 드래그로 변경, DB에 sort_order 즉시 반영

## 본인(민승기) 역할
- **기획 및 설계**: PRD 작성, 3계층 데이터 모델 설계, Grab/Release 배정 패턴 고안
- **풀스택 개발**: 프론트엔드(SPA 라우팅, 타임라인 렌더링)부터 백엔드(REST API, JWT 인증), DB 스키마 설계까지 전 영역 담당
- **AI-assisted 개발 프로세스 설계**: Claude Code를 활용한 페어 프로그래밍 워크플로우 구축, 프롬프트 엔지니어링을 통한 개발 생산성 극대화
- **배포 및 운영**: Vercel 서버리스 배포 구성, Supabase 데이터베이스 운영

## 성과 / 임팩트
- **3주 만에 MVP 완성 및 실서비스 투입**: 기획부터 배포까지 단독으로 수행
- **총 50회 커밋, 이 중 83%를 AI 협업으로 수행**: AI-assisted 개발 방법론 실증
- **빌드 도구 없는 경량 아키텍처**: 번들러/프레임워크 없이 Vanilla JS로 SPA 구현, 배포 파이프라인 단순화
- **실무 즉시 적용**: 팀 내 다수 업무 흐름의 마감일·담당자 추적에 실제 활용

## 특이사항
- **No-Framework SPA**: React/Vue 없이 Hash 기반 라우팅과 컴포넌트 패턴으로 SPA를 구현하여 프레임워크 의존성 제거
- **AI 페어 프로그래밍**: Claude Code를 적극 활용한 개발 방식으로, 1인 개발자가 풀스택 프로덕트를 단기간에 완성한 사례
- **Thread-centric 설계 철학**: 기존 Task-centric PMO 도구(Jira, Asana 등)와 차별화하여, 업무 "흐름" 단위로 관리하는 독자적 모델 적용
- **XSS 방어**: `escapeHtml()` 유틸리티 및 `textContent` 우선 사용으로 사용자 입력 보안 처리
- **클라이언트 사이드 Excel 생성**: 서버 부하 없이 브라우저에서 다중 시트 엑셀 파일 직접 생성

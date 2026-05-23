# 한라대학교 AC 기초 트랙

비전공자를 위한 **AI 기초 실습 (15H) + 바이브 코딩 1주차 (25H) = 총 40시간** 부트캠프 강의 사이트입니다.

🌐 **배포 주소**: 비공개

## 강의 개요

- **기간**: 2026년 6월 29일(월) ~ 7월 3일(금)
- **대상**: 한라대학교 비전공자 전체 40명
- **운영 방향**: 개념 이해 → 도구 체험 → 직접 구현 → 프로젝트 발표
- **필수 도구**: Claude (3개월 구독 필수), Cursor, Gamma, Canva AI

## 사이트 구조

```
halla/
├── index.html                # 메인 페이지 (강의 소개 + 전체 일정)
├── syllabus.html             # 강의 계획서
├── resources.html            # 참고 자료 모음
├── ai-basic/                 # AI 기초 실습 (오전, 1~3교시, 3H/일)
│   ├── index.html            # 트랙 개요
│   ├── day1.html             # AI란 무엇인가
│   ├── day2.html             # 프롬프트 기초
│   ├── day3.html             # 생성형 AI 도구 활용
│   ├── day4.html             # AI 콘텐츠 제작
│   └── day5.html             # 미니 프로젝트 ① 발표
├── vibe-coding/              # 바이브 코딩 (오후, 5~9교시, 5H/일)
│   ├── index.html            # 트랙 개요
│   ├── day1.html             # 개념 + 환경 세팅
│   ├── day2.html             # 자연어로 코드 읽기
│   ├── day3.html             # 웹페이지 만들기 ①
│   ├── day4.html             # 웹페이지 만들기 ②
│   └── day5.html             # 미니 프로젝트 ② 발표
├── assets/
│   ├── css/style.css         # 공통 디자인 시스템
│   ├── js/main.js            # 모바일 네비, 스크롤 애니메이션
│   └── img/                  # 이미지 자산
├── examples/                 # 학생 예제 코드
└── README.md
```

## 일별 커리큘럼

### 오전 - AI 기초 실습 (15H)

| 일차 | 날짜 | 주제 | 시간 |
|---|---|---|---|
| 1 | 6/29(월) | [AI란 무엇인가](ai-basic/day1.html) | 3H |
| 2 | 6/30(화) | [프롬프트 기초](ai-basic/day2.html) | 3H |
| 3 | 7/1(수) | [생성형 AI 도구 활용](ai-basic/day3.html) | 3H |
| 4 | 7/2(목) | [AI 콘텐츠 제작](ai-basic/day4.html) | 3H |
| 5 | 7/3(금) | [미니 프로젝트 ① 발표](ai-basic/day5.html) | 3H |

### 오후 - 바이브 코딩 1주차 (25H)

| 일차 | 날짜 | 주제 | 시간 |
|---|---|---|---|
| 1 | 6/29(월) | [개념 + 환경 세팅](vibe-coding/day1.html) | 5H |
| 2 | 6/30(화) | [자연어로 코드 읽기](vibe-coding/day2.html) | 5H |
| 3 | 7/1(수) | [웹페이지 만들기 ①](vibe-coding/day3.html) | 5H |
| 4 | 7/2(목) | [웹페이지 만들기 ②](vibe-coding/day4.html) | 5H |
| 5 | 7/3(금) | [미니 프로젝트 ② 발표](vibe-coding/day5.html) | 5H |

## 로컬에서 실행하기

별도 빌드 도구 없이 정적 HTML/CSS/JS로 동작합니다.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000` 접속.

## 배포

정적 호스팅 환경에서 자동 배포됩니다. `main` 브랜치에 푸시하면 약 1-2분 내에 사이트에 반영됩니다.

## 운영

- **운영사**: DreamIT Biz
- **강사**: 이애본
- **이메일**: [aebon@kyonggi.ac.kr](mailto:aebon@kyonggi.ac.kr)

## 라이선스

강의 자료는 한라대학교 학생 및 교육 목적으로 자유롭게 활용 가능합니다.

---

© 2026 한라대학교 · DreamIT Biz

# CI/CD 설정 가이드 (GitHub Actions)

GitHub Actions를 사용하여 자동 배포를 설정하는 방법입니다.

## 📋 목차
1. [CI/CD 개요](#cicd-개요)
2. [GitHub Secrets 설정](#github-secrets-설정)
3. [워크플로우 이해](#워크플로우-이해)
4. [수동 배포](#수동-배포)
5. [문제 해결](#문제-해결)

---

## 🔄 CI/CD 개요

### 자동 배포 흐름

```
Git Push (main 브랜치)
    ↓
GitHub Actions 트리거
    ↓
1. 코드 체크아웃
2. Node.js 설정
3. 의존성 설치
4. TypeScript 빌드
5. 테스트 실행 (있는 경우)
    ↓
6. EC2 서버 접속 (SSH)
7. Git Pull
8. 빌드 & 마이그레이션
9. PM2 재시작
    ↓
배포 완료 ✅
```

### 장점

- ✅ 자동 배포로 수동 작업 제거
- ✅ 일관된 배포 프로세스
- ✅ 배포 기록 추적
- ✅ 롤백 가능
- ✅ 팀 협업 용이

### 단점

- ❌ 초기 설정 필요
- ❌ GitHub Actions 사용 시간 제한 (무료: 2000분/월)
- ❌ 배포 실패 시 디버깅 필요

---

## 🔐 GitHub Secrets 설정

GitHub Actions에서 EC2에 안전하게 접근하기 위해 Secrets를 설정합니다.

### 1. GitHub Repository Settings

1. GitHub 저장소 → **Settings**
2. 왼쪽 메뉴 → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭

### 2. 필요한 Secrets

#### `EC2_HOST`
- **설명**: EC2 인스턴스의 공개 IP 또는 도메인
- **값**: `13.124.xxx.xxx` 또는 `api.your-domain.com`

#### `EC2_USERNAME`
- **설명**: EC2 사용자 이름
- **값**: `ubuntu` (Ubuntu AMI 사용 시)

#### `EC2_SSH_KEY`
- **설명**: EC2 접속용 Private Key (.pem 파일 내용)
- **값**:
  ```bash
  # .pem 파일 내용 복사
  cat your-key.pem

  # 출력 예시:
  -----BEGIN RSA PRIVATE KEY-----
  MIIEpAIBAAKCAQEA...
  ...
  -----END RSA PRIVATE KEY-----
  ```
- **주의**: 전체 내용을 복사 (BEGIN ~ END 포함)

### 3. Secrets 추가 방법

1. **Name**: `EC2_HOST`
2. **Secret**: EC2 IP 주소 입력
3. **Add secret** 클릭

동일하게 `EC2_USERNAME`, `EC2_SSH_KEY` 추가

### 4. Secrets 확인

Secrets는 한 번 추가하면 값을 볼 수 없습니다. 이름만 표시됩니다:
- ✅ `EC2_HOST`
- ✅ `EC2_USERNAME`
- ✅ `EC2_SSH_KEY`

---

## 📝 워크플로우 이해

### 워크플로우 파일 위치

```
.github/
  └── workflows/
      └── deploy.yml
```

### 트리거 조건

```yaml
on:
  push:
    branches:
      - main  # main 브랜치에 push될 때 자동 실행
  workflow_dispatch:  # GitHub UI에서 수동 실행 가능
```

### 주요 단계 설명

#### 1. Checkout code
```yaml
- name: Checkout code
  uses: actions/checkout@v3
  with:
    submodules: recursive  # 서브모듈 포함
```
GitHub 저장소 코드를 체크아웃합니다.

#### 2. Setup Node.js
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v3
  with:
    node-version: '18'
    cache: 'npm'
```
Node.js 18을 설치하고 npm 캐시를 활성화합니다.

#### 3. Build
```yaml
- name: Build TypeScript
  working-directory: ./backend
  run: npm run build
```
TypeScript를 JavaScript로 컴파일합니다.

#### 4. Deploy to EC2
```yaml
- name: Deploy to EC2
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.EC2_HOST }}
    username: ${{ secrets.EC2_USERNAME }}
    key: ${{ secrets.EC2_SSH_KEY }}
    script: |
      cd ~/itemlink
      git pull origin main
      cd backend
      npm install --production
      npm run build
      npx prisma migrate deploy
      pm2 restart itemlink-backend
```
SSH로 EC2에 접속하여 배포 스크립트를 실행합니다.

---

## 🚀 배포 실행

### 자동 배포

main 브랜치에 코드를 push하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin main
```

### 배포 확인

1. GitHub 저장소 → **Actions** 탭
2. 최신 워크플로우 실행 확인
3. 각 단계 로그 확인
4. 성공 시 ✅ 표시, 실패 시 ❌ 표시

---

## 🎯 수동 배포

GitHub UI에서 수동으로 배포할 수 있습니다.

### 1. GitHub Actions 탭 이동

Repository → **Actions**

### 2. 워크플로우 선택

왼쪽 메뉴에서 **Deploy to AWS EC2** 선택

### 3. 수동 실행

1. 오른쪽 상단 **Run workflow** 클릭
2. 브랜치 선택 (main)
3. **Run workflow** 버튼 클릭

### 4. 진행 상황 확인

워크플로우 실행 목록에서 진행 중인 배포 클릭 → 로그 확인

---

## 🔧 고급 설정

### 환경별 배포

개발/스테이징/프로덕션 환경을 분리:

```yaml
on:
  push:
    branches:
      - main        # 프로덕션
      - staging     # 스테이징
      - develop     # 개발

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Set environment
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "ENV=production" >> $GITHUB_ENV
            echo "EC2_HOST=${{ secrets.PROD_EC2_HOST }}" >> $GITHUB_ENV
          elif [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
            echo "ENV=staging" >> $GITHUB_ENV
            echo "EC2_HOST=${{ secrets.STAGING_EC2_HOST }}" >> $GITHUB_ENV
          fi
```

### Slack 알림

배포 성공/실패 시 Slack 알림:

```yaml
- name: Slack Notification
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment to EC2'
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 테스트 자동화

배포 전 테스트 실행:

```yaml
- name: Run tests
  working-directory: ./backend
  run: npm test

- name: Run linting
  working-directory: ./backend
  run: npm run lint
```

### 롤백 기능

배포 실패 시 이전 버전으로 자동 롤백:

```yaml
- name: Rollback on failure
  if: failure()
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.EC2_HOST }}
    username: ${{ secrets.EC2_USERNAME }}
    key: ${{ secrets.EC2_SSH_KEY }}
    script: |
      cd ~/itemlink
      git reset --hard HEAD~1
      cd backend
      npm install --production
      npm run build
      pm2 restart itemlink-backend
```

---

## 🐛 문제 해결

### SSH 연결 실패

**에러**: `Permission denied (publickey)`

**해결**:
1. `EC2_SSH_KEY` Secret 확인
2. .pem 파일 전체 내용이 복사되었는지 확인
3. EC2 보안 그룹에서 GitHub Actions IP 허용:
   ```bash
   # EC2 보안 그룹 → 인바운드 규칙
   # SSH (22) → 소스: 0.0.0.0/0 (또는 GitHub Actions IP 범위)
   ```

### 빌드 실패

**에러**: `npm ERR! code ELIFECYCLE`

**해결**:
1. 로컬에서 `npm run build` 테스트
2. TypeScript 에러 수정
3. package.json의 build 스크립트 확인

### PM2 재시작 실패

**에러**: `[PM2] Process itemlink-backend not found`

**해결**:
1. EC2에서 PM2 프로세스 확인:
   ```bash
   pm2 list
   ```
2. 프로세스 이름 확인 (대소문자 구분)
3. 첫 배포 시 `pm2 start` 대신 `pm2 restart` 사용

### Git Pull 실패

**에러**: `error: Your local changes would be overwritten`

**해결**:
EC2 서버에서 로컬 변경사항 제거:
```bash
cd ~/itemlink
git reset --hard HEAD
git clean -fd
git pull origin main
```

---

## 💰 비용

### GitHub Actions 무료 티어

- Public Repository: 무제한
- Private Repository: 2000분/월

### 배포 시간 예상

- 평균 배포 시간: 2-3분
- 월 100회 배포: 약 300분
- **비용: 무료** (무료 한도 내)

---

## 📊 모니터링

### 배포 기록 확인

GitHub Repository → Actions → 워크플로우 실행 목록

### 배포 성공률 확인

- 성공: ✅ 녹색 체크
- 실패: ❌ 빨간 X
- 진행 중: 🟡 노란 점

### 로그 분석

각 단계의 로그를 확인하여 문제 진단

---

## 🎓 추가 학습 자료

- [GitHub Actions 공식 문서](https://docs.github.com/en/actions)
- [SSH Action 문서](https://github.com/appleboy/ssh-action)
- [PM2 Ecosystem 파일](https://pm2.keymetrics.io/docs/usage/application-declaration/)

---

## ✅ 체크리스트

배포 전:
- [ ] GitHub Secrets 설정 완료
- [ ] `.github/workflows/deploy.yml` 파일 생성
- [ ] EC2에서 초기 배포 완료 (PM2 실행 중)
- [ ] 로컬에서 빌드 테스트 성공

첫 배포:
- [ ] main 브랜치에 push
- [ ] GitHub Actions 워크플로우 실행 확인
- [ ] 배포 성공 확인
- [ ] 웹사이트 접속 테스트

---

**이전 단계**:
- [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)
- [ENV_SETUP_GUIDE.md](./backend/ENV_SETUP_GUIDE.md)

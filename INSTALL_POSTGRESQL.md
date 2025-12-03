# Windows에서 PostgreSQL 설치하기

## 방법 1: 공식 설치 프로그램 사용 (권장)

### 1. PostgreSQL 다운로드
1. 브라우저에서 https://www.postgresql.org/download/windows/ 접속
2. "Download the installer" 클릭
3. 최신 버전 (PostgreSQL 16 권장) 다운로드
4. Windows x86-64 선택

### 2. 설치 실행
1. 다운로드한 `.exe` 파일 실행
2. 설치 과정:
   - **Installation Directory**: 기본값 유지 (예: `C:\Program Files\PostgreSQL\16`)
   - **Select Components**: 모두 체크 (PostgreSQL Server, pgAdmin 4, Command Line Tools)
   - **Data Directory**: 기본값 유지
   - **Password**: postgres 사용자의 비밀번호 설정 (이 비밀번호를 기억하세요!)
     - 예시: `postgres` (간단하게 하려면)
   - **Port**: 기본값 5432 유지
   - **Locale**: 기본값 유지

3. "Next" → "Next" → "Finish"

### 3. 환경 변수 설정 (자동으로 안된 경우)
1. Windows 검색에서 "환경 변수" 입력
2. "시스템 환경 변수 편집" 클릭
3. "환경 변수" 버튼 클릭
4. "시스템 변수"의 Path 선택 후 "편집"
5. "새로 만들기" 클릭 후 추가:
   ```
   C:\Program Files\PostgreSQL\16\bin
   ```
6. 확인 → 확인

7. **새 터미널을 열어서** 확인:
   ```bash
   psql --version
   ```

---

## 방법 2: Chocolatey로 설치 (개발자용)

관리자 권한으로 PowerShell 실행 후:

```powershell
choco install postgresql
```

---

## 데이터베이스 설정

PostgreSQL 설치 후 ItemLink 데이터베이스를 생성합니다.

### Option A: pgAdmin 4 사용 (GUI - 초보자 권장)

1. **pgAdmin 4 실행**
   - 시작 메뉴에서 "pgAdmin 4" 검색 후 실행
   - 마스터 비밀번호 설정 (처음 실행시)

2. **서버 연결**
   - 왼쪽 "Servers" → "PostgreSQL 16" 클릭
   - 설치시 설정한 비밀번호 입력

3. **데이터베이스 생성**
   - "Databases" 우클릭 → "Create" → "Database..."
   - Database name: `itemlink`
   - Owner: `postgres`
   - Save 클릭

4. **스키마 실행**
   - `itemlink` 데이터베이스 클릭
   - 상단 메뉴: Tools → Query Tool
   - 파일 열기 버튼 클릭
   - `backend/src/config/schema.sql` 선택
   - 실행 버튼 (▶ 또는 F5) 클릭

### Option B: 명령줄 사용 (CMD)

새 명령 프롬프트(CMD)를 열고:

```bash
# PostgreSQL 접속 (비밀번호 입력 필요)
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE itemlink;

# 종료
\q
```

그 다음 스키마 실행:

```bash
# itemlink 폴더로 이동
cd c:\OZcodingschool\itemlink

# 스키마 파일 실행
psql -U postgres -d itemlink -f backend\src\config\schema.sql
```

비밀번호를 물으면 설치시 설정한 비밀번호를 입력하세요.

---

## 연결 테스트

데이터베이스가 제대로 생성되었는지 확인:

```bash
# PostgreSQL 접속
psql -U postgres -d itemlink

# 테이블 목록 확인
\dt

# 게임 데이터 확인
SELECT * FROM games;

# 종료
\q
```

성공적으로 5개의 게임이 조회되면 완료입니다!

---

## 백엔드 환경 변수 설정

`backend/.env` 파일을 열어서 PostgreSQL 비밀번호를 수정:

```env
DB_PASSWORD=your_password_here
```

위에서 `your_password_here`를 설치시 설정한 비밀번호로 변경하세요.

---

## 문제 해결

### "psql: command not found" 오류
- PostgreSQL 설치 확인
- 환경 변수에 PostgreSQL bin 폴더 추가
- 터미널을 재시작

### "connection refused" 오류
- PostgreSQL 서비스가 실행 중인지 확인
- Windows 서비스에서 "postgresql-x64-16" 확인
- 시작 메뉴 → "서비스" → "postgresql-x64-16" → 시작

### 비밀번호를 잊어버린 경우
- PostgreSQL을 재설치하거나
- pg_hba.conf 파일 수정 (고급 사용자)

---

## 다음 단계

데이터베이스 설정이 완료되면:

1. 백엔드 실행:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. 브라우저에서 테스트:
   - http://localhost:5000/health
   - http://localhost:5000/api/test-db
   - http://localhost:5000/api/games

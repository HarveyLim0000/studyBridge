# StudyBridge 앱 (React Native + Expo)

책의 개념을 촬영하면 학술 자료(논문 등)와 연결해 주는 StudyBridge 클라이언트입니다.

## 실행 방법

```bash
cd frontend
npm install   # 최초 1회
npm start     # Expo 개발 서버 실행
```

- **iOS 시뮬레이터**: 터미널에서 `i` 입력 또는 `npm run ios`
- **Android 에뮬레이터**: 터미널에서 `a` 입력 또는 `npm run android`
- **실기기**: Expo Go 앱 설치 후 QR 코드로 연결

## 백엔드 연동

- **실기기(Expo Go)**에서 테스트할 때는 `App.js` 상단 `API_BASE_URL`을 **Mac IP**로 맞추세요.  
  Expo 터미널에 나오는 주소(예: `exp://192.168.35.90:8081`)의 IP와 동일하게 사용하면 됩니다.
- 백엔드 서버는 **0.0.0.0**으로 실행해야 휴대폰에서 접속 가능합니다.  
  예: `uvicorn main:app --host 0.0.0.0 --port 8000`

## "Too many open files" (EMFILE) 오류 시

Mac에서 `ulimit -n 10240`만으로 해결되지 않을 때는 아래를 **순서대로** 시도하세요.

### 1) Watchman 설치 (가장 효과적)

Metro가 파일 감시에 사용하는 Watchman을 설치하면 EMFILE이 크게 줄어듭니다.

```bash
brew install watchman
```

설치 후 한 번 감시를 비우고 실행:

```bash
watchman watch-del-all
cd /Users/dhno/STUDYBRIDGE/frontend
npm start
```

### 2) Watchman이 이미 있을 때

Watchman이 꼬였을 수 있으니 감시를 비운 뒤 다시 시도하세요.

```bash
watchman watch-del-all
# 또는 Watchman 데몬만 재시작
watchman shutdown-server
npm start
```

### 3) 시스템 한도 올리기 (고급)

위 방법으로도 안 되면 Mac 전체 파일 디스크립터 한도를 올립니다. **재부팅 전까지**만 유효합니다.

```bash
sudo sysctl -w kern.maxfiles=10485760
sudo sysctl -w kern.maxfilesperproc=1048576
```

재부팅 후에도 유지하려면 `/etc/sysctl.conf`에 다음 두 줄을 추가한 뒤 재부팅합니다.

```
kern.maxfiles=10485760
kern.maxfilesperproc=1048576
```

### 4) node_modules 재설치

캐시/깨진 설치 영향일 수 있으니 한 번 시도해 보세요.

```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

## 기능

1. **카메라**: 중앙 카메라 뷰, 하단 동그란 촬영 버튼
2. **미리보기**: 촬영 후 미리보기 + "이 사진으로 검색하기" / "다시 찍기"
3. **검색**: 이미지를 `POST /api/v1/analyze-image`로 전송
4. **로딩**: "검증된 지식을 찾는 중입니다..." 오버레이 + 스피너
5. **결과**: 개념명 + 논문 카드 리스트 또는 빈 결과/에러 시 Alert

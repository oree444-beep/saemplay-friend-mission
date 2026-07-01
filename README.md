# 쌤플레이 친구찾기 챌린지 V3

쌤플레이 정식 고객용에 바로 반영하지 않고 `고객용 쌤플레이 테스트버전 > 쌤플레이 게임실험실 > 친구찾기 챌린지`에서 검증하는 독립 테스트판입니다.

## V3 핵심 수정

- Vercel 실행 주소에서는 V2가 보이지만 `/version.json`이 404로 뜨던 문제 수정
- `version.json`을 프로젝트 루트와 `public/version.json`에 함께 포함
- Vercel/Vite 배포 후 `https://saemplay-friend-mission.vercel.app/version.json`으로 직접 열리도록 정적 배포 구조 보강
- TeamHR의 `version.json` 자동 확인이 V3 값을 읽을 수 있도록 구성
- V2에서 추가한 효과음 중심 카운트다운/종료, 리모컨 새창 열기, QR 연결, 미션 대형 표시, 움직이는 이모지 캐릭터 유지

## 안전 방향

아이들이 뛰지 않고 걸어서 조건에 맞는 친구를 찾는 게임입니다.
시작 전 약속 화면은 자동으로 넘어가지 않고 선생님이 `다음 진행`을 눌러야 합니다.

## 실행

```bash
npm install
npm run dev
```

## 배포 후 확인 순서

1. Vercel 실행 주소 확인
   - `https://saemplay-friend-mission.vercel.app`
2. version.json 직접 확인
   - `https://saemplay-friend-mission.vercel.app/version.json`
3. version.json에서 `친구찾기 챌린지 V3` 또는 `3.0.0` 표시 확인
4. TeamHR에서 `버전 자동 확인` 클릭
5. TeamHR 현재 운영/테스트 버전이 V3로 읽히는지 확인

## 운영 메모

- 정식 고객용 쌤플레이에는 반영하지 않습니다.
- 게임실험실 독립 테스트판에서 충분히 검증한 뒤 안정화 시 정식판 반영을 검토합니다.

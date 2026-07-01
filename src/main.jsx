import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Handshake, Star, Settings, Trophy, RotateCcw, Plus, QrCode, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import './style.css';

const VERSION = '친구찾기 챌린지 V7';
const STORAGE_KEY = 'saemplay_friend_mission_v7_state';

const defaultMissions = [
  '같은 색 옷 친구와 하이파이브', '오늘 웃은 친구와 인사하기', '키가 비슷한 친구끼리 짝 만들기', '3명 모여 삼각형 만들기', '친구에게 엄지척 해주기',
  '같은 팀 친구와 파이팅 외치기', '이름에 같은 글자가 있는 친구 찾기', '양말 색이 비슷한 친구 찾기', '머리 길이가 비슷한 친구와 인사하기', '오늘 기분 좋은 친구에게 박수 보내기',
  '2명씩 손하트 만들기', '3명 모여 별 모양 만들기', '친구와 서로 칭찬 한마디 하기', '생일 달이 같은 친구 찾기', '좋아하는 음식이 같은 친구 찾기',
  '좋아하는 색이 같은 친구 찾기', '같은 학년 친구와 하이파이브', '다른 팀 친구와 부드럽게 인사하기', '오늘 처음 말해보는 친구와 인사하기', '친구와 가위바위보 한 번 하기',
  '키 순서대로 3명 줄서기', '이름 첫 글자가 다른 친구 2명 찾기', '웃는 얼굴로 친구와 눈인사하기', '친구에게 최고라고 말해주기', '가까운 친구와 조용히 손뼉 맞추기',
  '친구와 함께 파이팅 포즈 만들기', '3명 모여 동그라미 만들기', '친구와 같은 방향 바라보기', '친구와 서로 손 흔들기', '오늘 운동 열심히 한 친구 찾기',
  '친구와 어깨동무 대신 손하트 만들기', '서로 다른 색 옷 친구 3명 모이기', '머리 모양이 비슷한 친구 찾기', '좋아하는 동물이 같은 친구 찾기', '친구에게 고마워 한마디 하기',
  '2명 모여 숫자 1 만들기', '3명 모여 큰 하트 만들기', '같은 줄에 있던 친구와 인사하기', '옆 반 친구와 손 흔들기', '친구에게 멋져요 말하기',
  '선생님과 눈 마주치고 손 흔들기', '친구와 조용히 주먹 인사하기', '3명 모여 기차 줄 만들기', '친구와 같은 포즈 따라하기', '오늘 신발 색이 비슷한 친구 찾기',
  '친구와 서로 이름 불러주기', '가장 가까운 친구와 하이파이브', '다른 키 친구와 짝 만들기', '친구와 함께 만세 포즈', '친구와 서로 박수 3번',
  '친구에게 배려왕이라고 말하기', '웃고 있는 친구와 엄지척', '친구와 안전하게 한 바퀴 돌기', '친구와 작은 하트 만들기', '3명 모여 번개 포즈',
  '친구와 서로 응원 한마디', '친구와 손 안 잡고 같은 포즈', '친구와 천천히 인사하고 제자리', '친구 2명에게 파이팅 말하기', '친구와 미소 짓고 제자리로'
].map((text, i) => ({ id: `base-${i+1}`, text, favorite: i < 12, excluded: false, deleted: false, base: true }));

function makeBeep(ctx, freq=880, duration=0.13, type='sine', gain=0.07, volume=1){
  if(!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(gain * volume, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration + 0.02);
}
function makeBoom(ctx, volume=1){
  if(!ctx) return;
  const osc = ctx.createOscillator(); const g = ctx.createGain();
  osc.type='triangle'; osc.frequency.setValueAtTime(180, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(52, ctx.currentTime + 0.45);
  g.gain.setValueAtTime(0.001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.25 * volume, ctx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.55);
  osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+0.6);
}
function speakUnlock(ctx){ if(ctx?.state === 'suspended') ctx.resume(); }

const loadState = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } };
const saveState = (s) => localStorage.setItem(STORAGE_KEY, JSON.stringify(s));

const HISTORY_HOURS = 4;
const HISTORY_MS = HISTORY_HOURS * 60 * 60 * 1000;
const soundOptions = [
  ['off','끄기'], ['normal','보통'], ['loud','크게'], ['max','매우 크게']
];
const soundGain = { off:0, normal:1.05, loud:1.75, max:2.45 };

function normalizeNameList(input){
  return [...new Set(String(input || '')
    .split(/[,,，、]/)
    .map(v => v.trim())
    .filter(Boolean))];
}
function pruneHistory(history){
  const now = Date.now();
  return (history || []).filter(h => h && h.id && now - Number(h.at || 0) < HISTORY_MS);
}
function shuffle(arr){
  return [...arr].sort(() => Math.random() - 0.5);
}
function buildMissionDeck(eligible, count, history){
  const need = Math.max(1, Number(count) || 1);
  const pool = [...eligible];
  if(!pool.length) return [];
  const recentIds = new Set(pruneHistory(history).map(h => h.id));
  const fresh = shuffle(pool.filter(m => !recentIds.has(m.id)));
  const old = shuffle(pool.filter(m => recentIds.has(m.id)));
  const deck = [];
  const pushNoImmediateRepeat = (source) => {
    while(source.length && deck.length < need){
      let idx = source.findIndex(m => deck.length === 0 || m.id !== deck[deck.length - 1].id);
      if(idx < 0) idx = 0;
      deck.push(source.splice(idx, 1)[0]);
    }
  };
  pushNoImmediateRepeat(fresh);
  pushNoImmediateRepeat(old);
  while(deck.length < need){
    const refill = shuffle(pool);
    if(deck.length && refill.length > 1 && refill[0].id === deck[deck.length - 1].id){
      const first = refill.shift(); refill.push(first);
    }
    deck.push(refill[0]);
  }
  return deck;
}

function displayLength(words){
  return words.join('').length;
}
function splitMissionText(text){
  const raw = String(text || '').trim();
  const words = raw.split(/\s+/).filter(Boolean);
  if(words.length <= 1) return [raw];
  const compactLen = displayLength(words);
  // TV 미션 문구는 절대 잘리면 안 된다. 짧은 문장만 1줄, 나머지는 의미 단위로 2~3줄 처리.
  if(compactLen <= 9 && raw.length <= 12) return [raw];
  const targetLines = compactLen > 18 || words.length >= 7 ? 3 : 2;
  if(targetLines === 2){
    let best = 1, bestScore = Infinity;
    for(let i=1; i<words.length; i++){
      const left = displayLength(words.slice(0,i));
      const right = compactLen - left;
      const edgePenalty = (i===1 || i===words.length-1) ? 5 : 0;
      const longPenalty = Math.max(left, right) > 11 ? 8 : 0;
      const score = Math.abs(left-right) + edgePenalty + longPenalty;
      if(score < bestScore){ bestScore = score; best = i; }
    }
    return [words.slice(0,best).join(' '), words.slice(best).join(' ')];
  }
  // 3줄이 필요한 긴 문장은 각 줄 길이 균형을 맞춰 공백 기준으로만 자른다.
  let bestA = 1, bestB = 2, bestScore = Infinity;
  for(let a=1; a<words.length-1; a++){
    for(let b=a+1; b<words.length; b++){
      const l1 = displayLength(words.slice(0,a));
      const l2 = displayLength(words.slice(a,b));
      const l3 = displayLength(words.slice(b));
      const max = Math.max(l1,l2,l3), min = Math.min(l1,l2,l3);
      const edgePenalty = (a===1 ? 2 : 0) + (b===words.length-1 ? 2 : 0);
      const score = (max-min) + edgePenalty + (max > 10 ? 5 : 0);
      if(score < bestScore){ bestScore = score; bestA = a; bestB = b; }
    }
  }
  return [words.slice(0,bestA).join(' '), words.slice(bestA,bestB).join(' '), words.slice(bestB).join(' ')];
}
function visualForMission(text){
  const t = String(text || '');
  // 구체 명사를 먼저 본다. '색'보다 '양말/신발/옷/모자/안경'이 우선이다.
  if(t.includes('양말')) return {icon:'🧦', label:'양말 색'};
  if(t.includes('신발')) return {icon:'👟', label:'신발 색'};
  if(t.includes('옷')) return {icon:'👕', label:'옷 색'};
  if(t.includes('모자')) return {icon:'🧢', label:'모자'};
  if(t.includes('안경')) return {icon:'👓', label:'안경'};
  if(t.includes('별')) return {icon:'⭐', label:'별 모양'};
  if(t.includes('삼각형')) return {icon:'🔺', label:'삼각형'};
  if(t.includes('동그라미') || t.includes('원')) return {icon:'⭕', label:'동그라미'};
  if(t.includes('하트')) return {icon:'💚', label:'하트'};
  if(t.includes('짝') || t.includes('2명')) return {icon:'👥', label:'짝 만들기'};
  if(t.includes('3명')) return {icon:'👨‍👩‍👧', label:'3명 모이기'};
  if(t.includes('하이파이브') || t.includes('손뼉') || t.includes('박수')) return {icon:'🙌', label:'박수/하이파이브'};
  if(t.includes('인사') || t.includes('손 흔들')) return {icon:'👋', label:'인사하기'};
  if(t.includes('엄지척') || t.includes('최고')) return {icon:'👍', label:'엄지척'};
  if(t.includes('파이팅') || t.includes('응원')) return {icon:'💪', label:'응원'};
  if(t.includes('웃') || t.includes('미소')) return {icon:'😊', label:'웃는 얼굴'};
  if(t.includes('키')) return {icon:'📏', label:'키 비교'};
  if(t.includes('색')) return {icon:'🎨', label:'비슷한 색'};
  return {icon:'🤝', label:'친구찾기'};
}

function App(){
  const query = new URLSearchParams(location.search);
  const initialView = query.get('view') === 'remote' ? 'remote' : 'tv';
  const [view, setView] = useState(initialView);
  const saved = useMemo(loadState, []);
  const [phase, setPhase] = useState(saved.phase || 'setup');
  const [missionCount, setMissionCount] = useState(saved.missionCount || 5);
  const [timeOption, setTimeOption] = useState(saved.timeOption || 10);
  const [customTime, setCustomTime] = useState(saved.customTime || 10);
  const [missionScope, setMissionScope] = useState(saved.missionScope || 'favorite');
  const [missions, setMissions] = useState(saved.missions || defaultMissions);
  const [rounds, setRounds] = useState(saved.rounds || []);
  const [roundIndex, setRoundIndex] = useState(saved.roundIndex || 0);
  const [remaining, setRemaining] = useState(saved.remaining || 0);
  const [scores, setScores] = useState(saved.scores || []);
  const [soundLevel, setSoundLevel] = useState(saved.soundLevel || (saved.soundOn === false ? 'off' : 'loud'));
  const soundOn = soundLevel !== 'off';
  const [audioReady, setAudioReady] = useState(false);
  const [newName, setNewName] = useState('');
  const [managerOpen, setManagerOpen] = useState(false);
  const [missionHistory, setMissionHistory] = useState(pruneHistory(saved.missionHistory || []));
  const audioRef = useRef(null); const timerRef = useRef(null);

  const state = { phase, missionCount, timeOption, customTime, missionScope, missions, rounds, roundIndex, remaining, scores, soundLevel, missionHistory };
  useEffect(()=>saveState(state), [phase, missionCount, timeOption, customTime, missionScope, missions, rounds, roundIndex, remaining, scores, soundLevel, missionHistory]);

  const ensureAudio = () => {
    if(!audioRef.current) audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    speakUnlock(audioRef.current); setAudioReady(true); return audioRef.current;
  };
  const beep = (kind='tick') => { if(!soundOn) return; const ctx = ensureAudio(); const vol = soundGain[soundLevel] || 1;
    if(kind==='count') makeBeep(ctx, 740, .14, 'sine', .09, vol);
    if(kind==='start') { makeBeep(ctx, 660, .12, 'sine', .07, vol); setTimeout(()=>makeBeep(ctx, 920, .14, 'sine', .08, vol), 130); }
    if(kind==='tick') makeBeep(ctx, 520, .06, 'square', .035, vol);
    if(kind==='fast') makeBeep(ctx, 980, .07, 'square', .055, vol);
    if(kind==='end') makeBoom(ctx, Math.max(vol, 1.8));
  };

  useEffect(()=>{
    if(phase !== 'mission') return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(()=>{
      setRemaining(prev=>{
        if(prev <= 1){ clearInterval(timerRef.current); beep('end'); setPhase('stop'); return 0; }
        if(prev <= 4) beep('fast'); else beep('tick');
        return prev - 1;
      });
    }, 1000);
    return ()=>clearInterval(timerRef.current);
  }, [phase, soundLevel]);

  const pickTime = () => timeOption === 'random' ? [5,7,10,15][Math.floor(Math.random()*4)] : Number(timeOption === 'custom' ? customTime : timeOption);
  const eligibleMissions = () => {
    const visible = missions.filter(m=>!m.deleted);
    if(missionScope === 'favorite'){
      const fav = visible.filter(m=>m.favorite && !m.excluded);
      return fav.length ? fav : visible.filter(m=>!m.excluded);
    }
    if(missionScope === 'all') return visible;
    return visible.filter(m=>!m.excluded);
  };
  const startGame = () => {
    try {
      const candidates = eligibleMissions();
      if(!candidates.length){
        alert('실행 가능한 미션이 없습니다. 미션 관리자에서 숨김/X 제외 상태를 확인해주세요.');
        return;
      }
      ensureAudio();
      beep('start');
      setRoundIndex(0);
      setScores([]);
      const history = pruneHistory(missionHistory);
      const deck = buildMissionDeck(candidates, Number(missionCount), history);
      if(!deck.length){
        alert('선택 가능한 미션을 만들지 못했습니다. 미션 설정을 확인해주세요.');
        return;
      }
      setRounds(deck);
      setMissionHistory([...history, ...deck.map(m => ({id:m.id, at:Date.now()}))]);
      setPhase('promise');
    } catch (err) {
      console.error('친구찾기 시작 오류', err);
      alert('친구찾기 시작 중 오류가 발생했습니다. 미션 설정을 확인해주세요.');
    }
  };
  const countdownStart = () => { ensureAudio(); setPhase('count3'); beep('count'); setTimeout(()=>{setPhase('count2'); beep('count')}, 900); setTimeout(()=>{setPhase('count1'); beep('count')}, 1800); setTimeout(()=>{setRemaining(pickTime()); setPhase('mission'); beep('start')}, 2700); };
  const nextMission = () => { if(roundIndex + 1 >= rounds.length){ setPhase('finish'); return; } setRoundIndex(i=>i+1); countdownStart(); };
  const resetGame = () => { clearInterval(timerRef.current); setPhase('setup'); setRoundIndex(0); setRemaining(0); setRounds([]); };
  const currentMission = rounds[roundIndex] || null;
  const addScore = () => {
    const names = normalizeNameList(newName);
    if(!names.length) return;
    setScores(prev=>{
      const map = new Map(prev.map(s => [s.name, Number(s.score)||0]));
      names.forEach(name => map.set(name, (map.get(name)||0) + 1));
      return Array.from(map, ([name, score]) => ({name, score}));
    });
    setNewName('');
  };
  const resetMissionHistory = () => { if(confirm('최근 출현 미션 기록을 초기화할까요?')) setMissionHistory([]); };
  const openRemote = () => window.open(`${location.origin}${location.pathname}?view=remote`, '_blank', 'width=420,height=820');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(location.origin + location.pathname + '?view=remote')}`;

  if(view === 'remote') return <Remote {...{phase, missionCount, setMissionCount, timeOption, setTimeOption, customTime, setCustomTime, missionScope, setMissionScope, missions, setMissions, startGame, countdownStart, nextMission, addScore, newName, setNewName, scores, resetGame, currentMission, roundIndex, rounds, remaining, soundLevel, setSoundLevel, ensureAudio, qrUrl, openRemote}} />;
  return <TV {...{phase, missionCount, setMissionCount, timeOption, setTimeOption, customTime, setCustomTime, missionScope, setMissionScope, missions, setMissions, startGame, countdownStart, nextMission, addScore, newName, setNewName, scores, resetGame, currentMission, roundIndex, rounds, remaining, soundLevel, setSoundLevel, ensureAudio, qrUrl, openRemote, audioReady, managerOpen, setManagerOpen, resetMissionHistory}} />;
}

function Header({openRemote}){return <header className="top"><div className="brand"><div className="logo"><Handshake size={30}/></div><div><h1>친구찾기 챌린지 V7</h1><p>쌤플레이 게임실험실 안에서 테스트하는 친구찾기 챌린지 독립 테스트판</p></div></div><div className="topBtns"><button onClick={()=>location.reload()}>처음으로</button><button onClick={openRemote} className="primary"><ExternalLink size={16}/> 리모컨 새창</button><button className="test">테스트 전용</button></div></header>}
function TV(props){
  const {phase, openRemote, qrUrl, soundLevel, setSoundLevel, ensureAudio} = props;
  const soundOn = soundLevel !== 'off';
  return <div className="app"><Header openRemote={openRemote}/><main className="screen">{phase==='setup'&&<Setup {...props}/>} {phase==='promise'&&<Promise {...props}/>} {phase?.startsWith('count')&&<Count {...props}/>} {phase==='mission'&&<Mission {...props}/>} {phase==='stop'&&<Stop {...props}/>} {phase==='finish'&&<Finish {...props}/>}</main><div className="floating"><button onClick={()=>{ensureAudio();setSoundLevel(soundOn?'off':'loud')}}>{soundOn?<Volume2 size={16}/>:<VolumeX size={16}/>} 효과음</button><button onClick={openRemote}><ExternalLink size={16}/> 리모컨</button><button className="dark"><QrCode size={16}/> QR</button></div><div className="qrBox"><img src={qrUrl}/><span>QR로 리모컨 연결</span></div></div>
}
function Setup({missionCount,setMissionCount,timeOption,setTimeOption,customTime,setCustomTime,missionScope,setMissionScope,missions,setMissions,startGame,openRemote,soundLevel,setSoundLevel,ensureAudio,managerOpen,setManagerOpen,resetMissionHistory}){return <section className="panel setup compactSetup"><h2>친구찾기 챌린지 설정</h2><p className="desc">아이들이 뛰지 않고 걸어서 조건에 맞는 친구를 찾는 안전한 레크리에이션 게임입니다.</p><div className="setupGridV6"><div className="setupGroup"><h3>게임 설정</h3><Control label="미션 횟수"><Select value={missionCount} onChange={setMissionCount} options={[3,5,7,10,'custom'].map(v=>[v,v==='custom'?'직접입력':`${v}회`])}/>{missionCount==='custom'&&<input type="number" min="1" max="30" onChange={e=>setMissionCount(e.target.value)} placeholder="횟수"/>}</Control><Control label="제한시간"><Select value={timeOption} onChange={setTimeOption} options={[[5,'5초'],[7,'7초'],[10,'10초'],[15,'15초'],['random','랜덤'],['custom','직접입력']]}/>{timeOption==='custom'&&<input type="number" min="3" max="60" value={customTime} onChange={e=>setCustomTime(e.target.value)}/>}</Control><Control label="미션 범위"><Select value={missionScope} onChange={setMissionScope} options={[[ 'favorite','즐겨찾기만'],['active','X 제외 전체'],['all','전체']]}/></Control></div><div className="setupGroup actionGroup"><h3>테스트 조작</h3><button onClick={openRemote} className="wide noWrap"><ExternalLink size={18}/> 리모컨 열기</button><Control label="효과음 크기"><Select value={soundLevel} onChange={(v)=>{ensureAudio(); setSoundLevel(v)}} options={soundOptions}/><p className="hint">기본값은 학원 환경 기준 ‘크게’입니다.</p></Control><button onClick={()=>setManagerOpen(true)} className="wide noWrap"><Settings size={18}/> 미션 관리자</button><button onClick={resetMissionHistory} className="wide noWrap"><RotateCcw size={18}/> 출현기록 초기화</button></div></div><button className="bigStart" onClick={startGame}>친구찾기 시작</button>{managerOpen&&<MissionManagerModal missions={missions} setMissions={setMissions} onClose={()=>setManagerOpen(false)}/>}</section>}
function Promise({countdownStart}){return <section className="panel promise"><h2>친구찾기 약속!</h2><ol><li>뛰지 않기</li><li>밀지 않기</li><li>친구가 싫어하면 억지로 잡지 않기</li><li>선생님 신호에 멈추기</li></ol><button className="bigStart" onClick={countdownStart}>다음 진행</button><p className="desc">자동으로 넘어가지 않습니다. 선생님이 읽어준 뒤 눌러주세요.</p></section>}
function Count({phase, roundIndex, rounds}){ const n = phase==='count3'?3:phase==='count2'?2:1; return <section className="count"><div className="smallTitle">친구찾기 미션 {roundIndex+1} / {rounds.length}</div><div className="countNum">{n}</div></section>}
function Mission({currentMission, roundIndex, rounds, remaining}){
  const text = currentMission?.text || '';
  const lines = splitMissionText(text);
  const visual = visualForMission(text);
  const compactLen = text.replace(/\s/g,'').length;
  const cls = lines.length >= 3 || compactLen > 18 ? 'veryLongMission' : lines.length === 2 || compactLen > 9 ? 'longMission' : 'shortMission';
  return <section className="mission fullMission"><div className="missionTop"><span>친구찾기 미션 {roundIndex+1} / {rounds.length}</span><b>걸어서 찾아요!</b></div><div className={`missionText ${cls}`}>{lines.map((line,i)=><div className="missionLine" key={i}>{line}</div>)}</div><div className="missionBottom"><div className="sideVisual left" aria-label={visual.label}><span>{visual.icon}</span><em>{visual.label}</em></div><div className="timerBlock"><div className="bar"><i style={{width:`${Math.max(0, Math.min(100, remaining/15*100))}%`}}/></div><div className="timeBig">{remaining}초</div><p className="safeText">선생님 신호에 멈춰요.</p></div><div className="sideVisual right" aria-hidden="true"><span>{visual.icon}</span><em>{visual.label}</em></div></div></section>
}
function Stop({nextMission, roundIndex, rounds, newName, setNewName, addScore}){return <section className="panel stop"><h2>멈춰!</h2><h3>다음 미션 준비</h3><div className="scoreInput"><input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addScore()} placeholder="성공자 이름 예) 순신, 임당"/><button onClick={addScore}>성공자 기록</button></div><p className="inputHint">여러 명은 쉼표(,)로 구분해 입력하세요. 예: 순신, 임당</p><button className="bigStart" onClick={nextMission}>{roundIndex+1>=rounds.length?'결과 보기':'다음 미션'}</button></section>}
function Finish({scores, resetGame}){
  const sorted=[...scores].sort((a,b)=>b.score-a.score || a.name.localeCompare(b.name, 'ko'));
  const topScore = sorted[0]?.score || 0;
  return <section className="panel finish"><h2>미션이 끝났습니다!</h2><h3>친구찾기 챌린지 결과</h3><div className="scoreList rankList">{sorted.length?sorted.map((s)=>{ const isTop = s.score === topScore; return <div key={s.name} className={isTop?'topRank':''}><span className="rankBadge">{isTop?'🏆 1등':'성공자'}</span><strong className="scoreName">{s.name}</strong><b>{s.score}점</b></div>}):<p>기록된 성공자가 없습니다.</p>}</div><button className="bigStart" onClick={resetGame}>설정으로</button></section>}
function Remote(props){ const {phase,startGame,countdownStart,nextMission,resetGame,currentMission,roundIndex,rounds,remaining,newName,setNewName,addScore,scores,soundLevel,setSoundLevel,ensureAudio,openRemote}=props; return <div className="remote"><h1>친구찾기 리모컨 V7</h1><p className="badge">현재: {phase}</p>{currentMission&&<div className="remoteMission">{roundIndex+1}/{rounds.length}<br/>{currentMission.text}<br/><b>{remaining}초</b></div>}<button onClick={startGame} className="primary wide">시작</button><button onClick={countdownStart} className="wide">다음 진행</button><button onClick={nextMission} className="wide">다음 미션</button><div className="scoreInput remoteScore"><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="성공자 예) 순신, 임당"/><button onClick={addScore}>+1 기록</button></div><p className="inputHint">여러 명은 쉼표(,)로 구분해 입력하세요.</p><div className="remoteSound"><label>효과음 크기</label><Select value={soundLevel} onChange={(v)=>{ensureAudio(); setSoundLevel(v)}} options={soundOptions}/></div><button onClick={openRemote} className="wide">리모컨 새창</button><button onClick={resetGame} className="wide danger">설정으로</button><h2>점수표</h2>{[...scores].sort((a,b)=>b.score-a.score).map(s=><div className="rScore" key={s.name}>{s.name}<b>{s.score}</b></div>)}</div>}
function MissionManagerModal({missions,setMissions,onClose}){ const [text,setText]=useState(''); const add=()=>{if(!text.trim())return; setMissions([...missions,{id:Date.now()+'' ,text:text.trim(),favorite:true,excluded:false,deleted:false,base:false}]);setText('')}; const update=(id,patch)=>setMissions(missions.map(m=>m.id===id?{...m,...patch}:m)); const hide=(m)=>update(m.id,{deleted:true}); const removeCustom=(m)=>{ if(confirm('추가한 미션을 삭제할까요?')) setMissions(missions.filter(x=>x.id!==m.id)); }; const restore=()=>setMissions(missions.map(m=>m.base?{...m,deleted:false,excluded:false}:m)); const hidden=missions.filter(m=>m.deleted); return <div className="modalOverlay"><div className="managerModal"><div className="managerHead"><div><h3>미션 관리자</h3><p>수업 시작 화면과 분리된 PC 전용 관리 화면입니다. 기본 미션은 삭제되지 않고 숨김 처리됩니다.</p></div><button onClick={onClose}>닫기</button></div><div className="add"><input value={text} onChange={e=>setText(e.target.value)} placeholder="새 미션 추가"/><button onClick={add}><Plus size={16}/>추가</button><button onClick={restore}><RotateCcw size={16}/>기본 미션 복구</button></div><div className="missionList adminList">{missions.filter(m=>!m.deleted).slice(0,120).map(m=><div className="mItem" key={m.id}><button onClick={()=>update(m.id,{favorite:!m.favorite})} className={m.favorite?'star on':'star'}><Star size={16}/></button><input value={m.text} onChange={e=>update(m.id,{text:e.target.value})}/><button onClick={()=>update(m.id,{excluded:!m.excluded})} className={m.excluded?'x on':'x'}>X</button><button onClick={()=>m.base?hide(m):removeCustom(m)}>{m.base?'숨김':'삭제'}</button></div>)}</div>{hidden.length>0&&<details className="hiddenBox"><summary>숨긴 미션 보기/복구 ({hidden.length})</summary>{hidden.map(m=><div className="mItem" key={m.id}><input value={m.text} onChange={e=>update(m.id,{text:e.target.value})}/><button onClick={()=>update(m.id,{deleted:false})}>복구</button></div>)}</details>}</div></div>}
function Control({label,children}){return <div className="control"><label>{label}</label>{children}</div>}
function Select({value,onChange,options}){return <select value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select>}

createRoot(document.getElementById('root')).render(<App/>);

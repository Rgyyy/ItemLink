// 게임 목록 상수 - 모든 페이지에서 공통으로 사용
// /games 페이지 순서와 동일하게 유지
export const GAME_CATEGORIES = [
  '아이온2',
  '메이플스토리',
  '메이플스토리월드',
  '로스트아크',
  '던전앤파이터',
  '오딘: 발할라 라이징',
  '리니지M',
  '패스오브엑자일2',
  '서든어택',
  '거상',
  '리니지',
  '디아블로4',
  '바람의나라클래식',
  '디아블로2: 레저렉션',
  '마비노기',
  '테일즈위버',
  '뱀피르',
  'RF온라인넥스트',
  '삼국지전략판',
  '마비노기 모바일',
] as const;

export type GameCategory = typeof GAME_CATEGORIES[number];

// 게임 상세 정보 (games 페이지용)
export const GAMES = [
  {
    id: '1',
    name: '아이온2',
    description: 'MMORPG',
    imageUrl: '/games/aion2.png',
  },
  {
    id: '2',
    name: '메이플스토리',
    description: '2D 횡스크롤 MMORPG',
    imageUrl: '/games/maple.png',
  },
  {
    id: '3',
    name: '메이플스토리월드',
    description: '샌드박스 게임',
    imageUrl: '/games/mapleworld.png',
  },
  {
    id: '4',
    name: '로스트아크',
    description: 'MMORPG',
    imageUrl: '/games/lostark.png',
  },
  {
    id: '5',
    name: '던전앤파이터',
    description: '액션 RPG',
    imageUrl: '/Dnf_logo.png',
  },
  {
    id: '6',
    name: '오딘: 발할라 라이징',
    description: 'MMORPG',
    imageUrl: '/games/odin.png',
  },
  {
    id: '7',
    name: '리니지M',
    description: '모바일 MMORPG',
    imageUrl: '/games/lineagem.png',
  },
  {
    id: '8',
    name: '패스오브엑자일2',
    description: '핵앤슬래시 액션 RPG',
    imageUrl: '/games/poe2.png',
  },
  {
    id: '9',
    name: '서든어택',
    description: 'FPS',
    imageUrl: '/games/suddenattack.png',
  },
  {
    id: '10',
    name: '거상',
    description: 'MMORPG',
    imageUrl: '/games/geosang.png',
  },
  {
    id: '11',
    name: '리니지',
    description: 'MMORPG',
    imageUrl: '/games/lineage.png',
  },
  {
    id: '12',
    name: '디아블로4',
    description: '핵앤슬래시 액션 RPG',
    imageUrl: '/games/diablo4.png',
  },
  {
    id: '13',
    name: '바람의나라클래식',
    description: 'MMORPG',
    imageUrl: '/games/baram.png',
  },
  {
    id: '14',
    name: '디아블로2: 레저렉션',
    description: '핵앤슬래시 액션 RPG',
    imageUrl: '/games/diablo2.png',
  },
  {
    id: '15',
    name: '마비노기',
    description: 'MMORPG',
    imageUrl: '/games/mabinogi.png',
  },
  {
    id: '16',
    name: '테일즈위버',
    description: 'MMORPG',
    imageUrl: '/games/talesweaver.png',
  },
  {
    id: '17',
    name: '뱀피르',
    description: 'MMORPG',
    imageUrl: '/games/vampir.png',
  },
  {
    id: '18',
    name: 'RF온라인넥스트',
    description: 'MMORPG',
    imageUrl: '/games/rf.png',
  },
  {
    id: '19',
    name: '삼국지전략판',
    description: '전략 시뮬레이션',
    imageUrl: '/games/samgukji.png',
  },
  {
    id: '20',
    name: '마비노기 모바일',
    description: '모바일 MMORPG',
    imageUrl: '/games/mabinogi-mobile.png',
  },
] as const;

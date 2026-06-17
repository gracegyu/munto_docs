// Sample data for Munto Admin Backoffice (체험단)
const KOREAN_NICKS = [
  '민지', '서현', '지윤', '수민', '예린', '하늘', '도현', '지후', '은지', '혜원',
  '수빈', '지민', '유진', '채원', '다은', '소율', '현우', '태민', '서준', '윤아',
  '나연', '세라', '지안', '주현', '가은', '시은', '예나', '연우', '선우', '규민',
  '동훈', '재혁', '진호', '태희', '지선', '유나', '민재', '소연', '보민', '건호'
];

const SOCIALING_NAMES = [
  '강동 유스드림 새벽 러닝 클럽',
  '성수동 책 읽는 수요일',
  '한남동 와인 테이스팅 모임',
  '연남동 브런치 투어',
  '홍대 보드게임 카페 정복',
  '판교 개발자 스터디',
  '역삼 영어회화 프리토킹',
  '을지로 필름카메라 산책',
  '잠실 야구 직관 모임',
  '이태원 재즈바 탐방',
  '성북동 사찰 요가',
  '강남 헬스 메이트 구함',
  '신촌 라멘 원정대',
  '망원동 자전거 라이딩',
  '합정 베이킹 클래스',
  '종로 한강 러닝 크루',
  '여의도 직장인 배드민턴',
  '삼청동 골목 사진 동호회',
  '반포 한강 피크닉',
  '광화문 국립미술관 투어',
  '압구정 테니스 레슨 모임',
  '상수 클라이밍 입문반',
  '성수 도자기 원데이',
  '용산 프랑스어 스터디',
  '건대 보컬 트레이닝'
];

const CATEGORIES = [
  ['운동/액티비티', '러닝'],
  ['문화/예술', '독서'],
  ['푸드/드링크', '와인'],
  ['푸드/드링크', '브런치'],
  ['문화/예술', '보드게임'],
  ['자기계발', '스터디'],
  ['외국어', '영어'],
  ['문화/예술', '사진'],
  ['운동/액티비티', '직관'],
  ['문화/예술', '음악'],
  ['운동/액티비티', '요가'],
  ['운동/액티비티', '헬스'],
  ['푸드/드링크', '맛집'],
  ['운동/액티비티', '라이딩'],
  ['푸드/드링크', '베이킹']
];

const STATUSES = [
  { key: '결제 완료', variant: 'success' },
  { key: '부분 환불', variant: 'warn' },
  { key: '전체 환불', variant: 'danger' },
  { key: '결제 실패', variant: 'neutral' },
  { key: '결제 취소', variant: 'neutral' }
];

function pad(n, w = 2) { return String(n).padStart(w, '0'); }
function fmtDate(d) { return `${String(d.getFullYear()).slice(2)}.${pad(d.getMonth()+1)}.${pad(d.getDate())}`; }
function fmtDateTime(d) {
  const days = ['일','월','화','수','목','금','토'];
  return `${String(d.getFullYear()).slice(2)}.${pad(d.getMonth()+1)}.${pad(d.getDate())} (${days[d.getDay()]}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtMoney(n) { return n.toLocaleString('ko-KR'); }

function seedRand(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Generate payment rows
function generatePayments(count = 24) {
  const rand = seedRand(42);
  const rows = [];
  const today = new Date(2026, 3, 20);
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(rand() * 45);
    const paidAt = new Date(today.getTime() - daysAgo * 86400000 - Math.floor(rand()*86400000));
    const qty = [10, 20, 50, 100, 30, 40, 15, 25][Math.floor(rand()*8)];
    const unitPrice = 10000;
    const amount = qty * unitPrice;
    const stat = STATUSES[Math.floor(rand() * 4.5)];
    const channel = ['카드', '동시 결제', '간편결제', '계좌결제'][Math.floor(rand()*4)];
    const method = ['PG', '앱스토어', '플레이스토어'][Math.floor(rand()*3)];
    const nick = KOREAN_NICKS[i % KOREAN_NICKS.length];
    const used = daysAgo > 5 && rand() > 0.6; // 사용 시작 여부
    const within5 = daysAgo <= 5;
    const refundable = !used && stat.key !== '결제 실패' && stat.key !== '결제 취소';
    const refundRequestAt = stat.key.includes('환불') ? new Date(paidAt.getTime() + Math.floor(rand()*5)*86400000) : null;
    const refundAvailAt = new Date(paidAt.getTime() + 5*86400000);
    rows.push({
      id: 1232130 + i,
      paidAt,
      status: stat,
      qty,
      amount,
      channel,
      method,
      nickname: nick,
      memberId: `munto${pad(1000+i, 4)}`,
      phone: `010-${pad(Math.floor(rand()*10000),4)}-${pad(Math.floor(rand()*10000),4)}`,
      refundRequestAt,
      refundAvailAt,
      tid: `T${20250808000000 + i * 311}`,
      used,
      within5,
      refundable,
      socialing: SOCIALING_NAMES[i % SOCIALING_NAMES.length],
    });
  }
  return rows;
}

// Recruitment (모집) rows
function generateRecruitments(count = 20) {
  const rand = seedRand(88);
  const rows = [];
  const today = new Date(2026, 3, 20);
  const recruitStatuses = [
    { key: '모집 중', variant: 'success' },
    { key: '모집 완료', variant: 'info' },
    { key: '모집 취소', variant: 'danger' },
    { key: '진행 완료', variant: 'neutral' },
  ];
  for (let i = 0; i < count; i++) {
    const meetDate = new Date(today.getTime() + (Math.floor(rand()*40)-15)*86400000);
    const createdAt = new Date(meetDate.getTime() - Math.floor(rand()*30+5)*86400000);
    const cap = [8, 10, 12, 15, 20, 25][Math.floor(rand()*6)];
    const applied = Math.min(cap + Math.floor(rand()*5), Math.floor(rand()*(cap+5)));
    const confirmed = Math.min(applied, Math.floor(applied * (0.6 + rand()*0.35)));
    const cat = CATEGORIES[i % CATEGORIES.length];
    const stat = recruitStatuses[Math.floor(rand()*4)];
    rows.push({
      id: 30210 + i,
      status: stat,
      fee: [0, 10000, 15000, 20000, 25000, 30000][Math.floor(rand()*6)],
      kind: ['정기 모임', '단기 모임', '원데이'][Math.floor(rand()*3)],
      category: cat[0],
      subCategory: cat[1],
      name: SOCIALING_NAMES[i % SOCIALING_NAMES.length],
      meetDate,
      place: ['강동 유스드림', '성수동', '한남동', '판교', '역삼', '을지로', '잠실', '이태원', '홍대', '합정', '망원', '여의도'][Math.floor(rand()*12)] + ' 일대',
      memberId: `munto${pad(2000+i, 4)}`,
      nickname: KOREAN_NICKS[(i+5) % KOREAN_NICKS.length],
      phone: `010-${pad(Math.floor(rand()*10000),4)}-${pad(Math.floor(rand()*10000),4)}`,
      capacity: cap,
      applied,
      confirmed,
      male: Math.floor(confirmed/2),
      female: confirmed - Math.floor(confirmed/2),
      createdAt,
    });
  }
  return rows;
}

// Members (체험단 멤버 목록)
function generateMembers(count = 12) {
  const rand = seedRand(17);
  const rows = [];
  const applyStatuses = [
    { key: '승인 완료', variant: 'success' },
    { key: '대기중', variant: 'neutral' },
    { key: '신청 취소', variant: 'danger' },
    { key: '환불 완료', variant: 'warn' },
  ];
  const memberStates = [
    { key: '정상', variant: 'success' },
    { key: '탈퇴', variant: 'neutral' },
    { key: '정지', variant: 'danger' }
  ];
  const base = new Date(2026, 3, 15, 9, 0);
  for (let i = 0; i < count; i++) {
    const appliedAt = new Date(base.getTime() + i * 3600000 + Math.floor(rand()*3600000));
    const approvedAt = new Date(appliedAt.getTime() + Math.floor(rand()*48+2)*3600000);
    const stat = applyStatuses[Math.floor(rand()*4)];
    const attended = stat.key === '승인 완료' && rand() > 0.2;
    rows.push({
      idx: i + 1,
      orderId: `O${20250808 + i * 7}`,
      status: stat,
      memberState: memberStates[Math.floor(rand()*2.4)],
      appliedAt,
      approvedAt: stat.key === '대기중' ? null : approvedAt,
      memberId: `munto${pad(3000 + i, 4)}`,
      nickname: KOREAN_NICKS[(i+12) % KOREAN_NICKS.length],
      phone: `010-${pad(Math.floor(rand()*10000),4)}-${pad(Math.floor(rand()*10000),4)}`,
      tid: `T${20250809000000 + i * 421}`,
      paid: 20000,
      discount: rand() > 0.6 ? 5000 : 0,
      refund: stat.key === '환불 완료' ? 20000 : 0,
      refunded: stat.key === '환불 완료',
      reviewed: attended && rand() > 0.5,
      attended,
    });
  }
  return rows;
}

// Refund history for detail page
function generateRefundHistory() {
  return [
    {
      processedAt: new Date(2026, 3, 18, 14, 32),
      qty: 10,
      amount: 100000,
      result: { key: '환불 완료', variant: 'success' },
      type: '주문자 요청',
      operator: '홍길동',
      note: '결제일 5일 이내 환불 요청으로 전액 환불 처리했습니다. 원활한 환불 처리를 위해 고객님께 재화 사용 여부를 재확인했으며, 미사용 상태임을 확인했습니다.'
    },
    {
      processedAt: new Date(2026, 3, 15, 11, 12),
      qty: 10,
      amount: 90000,
      result: { key: '환불 완료', variant: 'success' },
      type: '주문자 요청',
      operator: '김현수',
      note: '결제일로부터 5일 경과한 시점에 환불 요청이 접수되어 환불 정책에 따라 90% 환불 처리했습니다. 환불 금액 산정 기준은 채널별 환불 안내에 근거했습니다.'
    }
  ];
}

// 7일 이내 재화 획득 내역 for refund modal
function generateRecentAcquisition() {
  return [
    { date: '25.08.11', payId: '1235233', type: '유료', status: { key: '결제 완료', variant: 'success' }, channel: '앱스토어', method: '카드', qty: 10, amount: 1000000, refundDate: '-', refundQty: '-', tid: 'T20250811001', refundAmount: '-' },
    { date: '25.08.10', payId: null, type: '무료', status: null, channel: '-', method: '-', qty: 3, amount: null, refundDate: '-', refundQty: '-', tid: null, refundAmount: '-' },
    { date: '25.08.06', payId: null, type: '무료', status: null, channel: '-', method: '-', qty: 5, amount: null, refundDate: '-', refundQty: '-', tid: null, refundAmount: '-' },
    { date: '25.08.05', payId: '1234891', type: '유료', status: { key: '결제 완료', variant: 'success' }, channel: 'PG', method: '카드', qty: 20, amount: 200000, refundDate: '-', refundQty: '-', tid: 'T20250805001', refundAmount: '-' }
  ];
}

window.MuntoData = {
  generatePayments, generateRecruitments, generateMembers, generateRefundHistory, generateRecentAcquisition,
  fmtDate, fmtDateTime, fmtMoney, pad, KOREAN_NICKS, SOCIALING_NAMES
};

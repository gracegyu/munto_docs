// Common UI components

const Icon = {
  Menu: () => (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  Chev: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9.3 9.3L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5v8M3.5 6L7 9.5 10.5 6M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Check: () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5.2L4.3 7.5 8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Cal: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4 1v2M10 1v2M1.5 5.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 6v3.5M7 4.2v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

function Badge({ variant = 'neutral', children, dot = true }) {
  return (
    <span className={`badge badge-${variant}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

function Sidebar({ active }) {
  const [open, setOpen] = React.useState({ experience: true });
  const sections = [
    {
      key: 'munto', label: '문토 어드민', groups: [
        { key: 'apply', label: '모임 신청 관리', items: [] },
        { key: 'meeting', label: '모임 관리', items: [] },
        { key: 'vod', label: 'VOD 관리', items: [] },
        { key: 'member', label: '멤버 관리', items: [] },
        { key: 'experience', label: '체험단 관리', items: [
          { key: 'payment-list', label: '초대권 결제 관리' },
          { key: 'recruit-list', label: '체험단 모집 관리', dim: true },
        ]},
        { key: 'cs', label: 'CS 관리', items: [] },
        { key: 'settle', label: '정산 관리', items: [] },
        { key: 'ops', label: '운영 관리', items: [] },
        { key: 'mkt', label: '마케팅 관리', items: [] },
        { key: 'feed', label: '피드 댓글 관리', items: [] },
      ]
    },
    {
      key: 'dating', label: '데이팅 어드민', groups: []
    },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="logo">MUNTO</span>
        <span className="burger"><Icon.Menu /></span>
      </div>
      <nav className="sidebar-nav">
        {sections.map((s, si) => (
          <div key={s.key} className="nav-section">
            <div className="nav-section-header">
              <span className="ic"><Icon.Menu /></span>
              <span>{s.label}</span>
              <span className="chev expand"><Icon.Chev /></span>
            </div>
            {s.groups.map(g => {
              const hasItems = g.items.length > 0;
              const isActive = hasItems && g.items.some(i => i.key === active);
              const isOpen = !!open[g.key] || isActive;
              return (
                <div key={g.key} className={`nav-group ${isOpen ? 'open' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="nav-group-header" onClick={() => hasItems && setOpen(o => ({ ...o, [g.key]: !isOpen }))}>
                    <span className="label">{g.label}</span>
                    <span className="chev"><Icon.Chev /></span>
                  </div>
                  {hasItems && (
                    <div className="nav-sub">
                      {g.items.map(it => (
                        <a key={it.key}
                           className={`nav-item ${active === it.key ? 'active' : ''} ${it.dim && active !== it.key ? 'nav-item-dim' : ''}`}
                           href={`#${it.key}`}>{it.label}</a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <span className="admin-user">admin@munto.kr</span>
      <button className="btn-logout">로그아웃</button>
    </header>
  );
}

function Breadcrumb({ items }) {
  return (
    <div className="breadcrumb">
      {items.map((t, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">›</span>}
          <span className={i === items.length - 1 ? 'cur' : ''}>{t}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function Toast({ message, onDone }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="toast">
      <span className="check"><Icon.Check /></span>
      <span>{message}</span>
    </div>
  );
}

Object.assign(window, { Icon, Badge, Sidebar, TopBar, Breadcrumb, Toast });

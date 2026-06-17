// Screen 2: 체험단 모집 관리 (리스트)
function RecruitListScreen({ onOpenDetail }) {
  const [rows] = React.useState(() => window.MuntoData.generateRecruitments(20));
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const { fmtDate, fmtMoney } = window.MuntoData;
  const totalPages = Math.ceil(rows.length / pageSize);
  const pageRows = rows.slice((page-1) * pageSize, page * pageSize);

  return (
    <>
      <Breadcrumb items={['체험단 모집 관리']} />
      <h1 className="page-title">체험단 모집 관리</h1>

      {/* 검색 */}
      <div className="card">
        <div className="card-body">
          <div className="form-row">
            <div className="field" style={{ minWidth: 140 }}>
              <label>검색어</label>
              <select className="select">
                <option>멤버ID</option>
                <option>닉네임</option>
                <option>연락처</option>
                <option>모집명</option>
                <option>모집ID</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 280 }}>
              <label>&nbsp;</label>
              <input className="input" placeholder="검색어를 입력하세요" />
            </div>
            <div className="field">
              <label>시작일</label>
              <input className="input" defaultValue="26.03.01" style={{ width: 130 }} />
            </div>
            <div className="field">
              <label>종료일</label>
              <input className="input" defaultValue="26.04.20" style={{ width: 130 }} />
            </div>
            <button className="btn btn-primary">검색</button>
          </div>
        </div>
      </div>

      {/* 체험단 모집 관리 테이블 */}
      <div className="section-label" style={{ marginTop: 24 }}>체험단 모집 관리</div>
      <div className="card">
        <div className="table-toolbar">
          <div className="left">
            <span className="text-muted" style={{ fontSize: 12 }}>전체 <b className="text-strong">{rows.length}</b>건</span>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>상태</th>
                <th className="num">참가비</th>
                <th>모집 구분</th>
                <th>카테고리</th>
                <th>모집명</th>
                <th>모집ID</th>
                <th>모임일</th>
                <th>장소</th>
                <th>멤버ID</th>
                <th>연락처</th>
                <th className="num">정원</th>
                <th className="num">참여 인원</th>
                <th>생성일</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={i}>
                  <td><Badge variant={r.status.variant}>{r.status.key}</Badge></td>
                  <td className="num mono">{r.fee === 0 ? <span className="text-muted">무료</span> : <span className="text-strong">₩{fmtMoney(r.fee)}</span>}</td>
                  <td><span className="pill">{r.kind}</span></td>
                  <td>
                    <div style={{ fontSize: 12 }}>
                      <div className="text-strong">{r.category}</div>
                      <div className="text-muted">{r.subCategory}</div>
                    </div>
                  </td>
                  <td style={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.name}>{r.name}</td>
                  <td><a className="link" onClick={() => onOpenDetail(r)}>{r.id}</a></td>
                  <td className="mono">{fmtDate(r.meetDate)}</td>
                  <td className="muted">{r.place}</td>
                  <td className="muted">{r.memberId}</td>
                  <td className="muted mono">{r.phone}</td>
                  <td className="num mono">{r.capacity}</td>
                  <td className="num">
                    <span className={r.confirmed >= r.capacity ? 'text-strong' : ''}>{r.confirmed}</span>
                    <span className="text-muted"> / {r.capacity}</span>
                  </td>
                  <td className="muted mono">{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-toolbar" style={{ borderBottom: 'none', borderTop: '1px solid var(--admin-card-border)' }}>
          <div className="left"><span className="text-muted" style={{ fontSize: 12 }}>{(page-1)*pageSize + 1} – {Math.min(page*pageSize, rows.length)} of {rows.length}</span></div>
          <div className="right">
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))}>‹</button>
              {Array.from({length: totalPages}).map((_, i) => (
                <button key={i} className={page === i+1 ? 'active' : ''} onClick={() => setPage(i+1)}>{i+1}</button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>›</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

window.RecruitListScreen = RecruitListScreen;

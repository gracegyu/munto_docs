// Screen 1: 체험단 결제 관리 (리스트)
function PaymentListScreen({ onOpenDetail, onOpenRefund, onDownload }) {
  const [rows] = React.useState(() => window.MuntoData.generatePayments(24));
  const [searchField, setSearchField] = React.useState('memberId');
  const [searchVal, setSearchVal] = React.useState('');
  const [startDate, setStartDate] = React.useState('26.03.01');
  const [endDate, setEndDate] = React.useState('26.04.20');
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const { fmtDate, fmtMoney } = window.MuntoData;

  const totalPays = 2847;
  const totalAmount = 428930000;
  const fullRefunds = 24;
  const partialRefunds = 11;
  const totalRefundAmount = 8420000;
  const avgTicket = 150680;
  const avgQty = 15;

  const totalPages = Math.ceil(rows.length / pageSize);
  const pageRows = rows.slice((page-1) * pageSize, page * pageSize);

  return (
    <>
      <Breadcrumb items={['체험단 결제 관리']} />
      <h1 className="page-title">체험단 결제 관리</h1>

      {/* 검색 */}
      <div className="card">
        <div className="card-body">
          <div className="form-row">
            <div className="field" style={{ minWidth: 140 }}>
              <label>검색어</label>
              <select className="select" value={searchField} onChange={e => setSearchField(e.target.value)}>
                <option value="memberId">멤버ID</option>
                <option value="nickname">닉네임</option>
                <option value="phone">연락처</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1, minWidth: 300 }}>
              <label>&nbsp;</label>
              <input className="input" value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="검색어를 입력하세요" />
            </div>
            <div className="field">
              <label>시작일</label>
              <input className="input" value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="YY.MM.DD" style={{ width: 130 }} />
            </div>
            <div className="field">
              <label>종료일</label>
              <input className="input" value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="YY.MM.DD" style={{ width: 130 }} />
            </div>
            <button className="btn btn-primary">검색</button>
          </div>
        </div>
      </div>

      {/* 현황 */}
      <div className="section-label" style={{ marginTop: 24 }}>현황</div>
      <div className="kpi-grid">
        <div className="kpi-cell">
          <div className="kpi-label">총 결제 수</div>
          <div className="kpi-value">{totalPays.toLocaleString()}<span className="unit"> 건</span></div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">총 결제액</div>
          <div className="kpi-value">₩{fmtMoney(totalAmount)}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">전체 환불 수</div>
          <div className="kpi-value">{fullRefunds}<span className="unit"> 건</span></div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">부분 환불 수</div>
          <div className="kpi-value">{partialRefunds}<span className="unit"> 건</span></div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">총 환불액</div>
          <div className="kpi-value">₩{fmtMoney(totalRefundAmount)}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">평균 객단가</div>
          <div className="kpi-value">₩{fmtMoney(avgTicket)}</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">평균 구매 초대권 수</div>
          <div className="kpi-value">{avgQty}<span className="unit"> 매</span></div>
        </div>
      </div>

      {/* 호스트별 구매 이력 */}
      <div className="section-label" style={{ marginTop: 24 }}>호스트별 구매 이력</div>
      <div className="card">
        <div className="table-toolbar">
          <div className="left">
            <span className="text-muted" style={{ fontSize: 12 }}>전체 <b className="text-strong">{rows.length}</b>건</span>
          </div>
          <div className="right">
            <button className="btn btn-success btn-sm" onClick={onDownload}>
              <Icon.Download /> 엑셀 다운로드
            </button>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>결제일</th>
                <th>결제상태</th>
                <th>결제ID</th>
                <th className="num">결제 초대권 수</th>
                <th className="num">결제액</th>
                <th>결제 수단</th>
                <th>멤버ID</th>
                <th>연락처</th>
                <th>환불요청일</th>
                <th>환불 가능일</th>
                <th>TID</th>
                <th>환불 처리</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={i}>
                  <td>{fmtDate(r.paidAt)}</td>
                  <td><Badge variant={r.status.variant}>{r.status.key}</Badge></td>
                  <td><a className="link" onClick={() => onOpenDetail(r)}>{r.id}</a></td>
                  <td className="num mono">{r.qty}</td>
                  <td className="num mono text-strong">₩{fmtMoney(r.amount)}</td>
                  <td>{r.channel}</td>
                  <td className="muted">{r.memberId}</td>
                  <td className="muted mono">{r.phone}</td>
                  <td className={r.refundRequestAt ? 'mono' : 'dim'}>{r.refundRequestAt ? fmtDate(r.refundRequestAt) : '-'}</td>
                  <td className="mono">{fmtDate(r.refundAvailAt)}</td>
                  <td><a className="link">{r.tid.slice(0, 8)}…</a></td>
                  <td>
                    {r.refundable ? (
                      <button className="btn btn-xs btn-outline" onClick={() => onOpenRefund(r)}>환불 처리</button>
                    ) : (
                      <button className="btn btn-xs disabled" disabled>환불 불가</button>
                    )}
                  </td>
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

window.PaymentListScreen = PaymentListScreen;

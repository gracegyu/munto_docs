// Screen 1-1: 결제 상세
function PaymentDetailScreen({ payment, onBack, onOpenRefund }) {
  const { fmtDate, fmtDateTime, fmtMoney, generateRefundHistory } = window.MuntoData;
  const history = generateRefundHistory();
  const p = payment || {
    id: 1232130, paidAt: new Date(2026, 3, 8, 24, 11), qty: 100, amount: 1000000,
    channel: '카드', tid: 'T20260408001',
    nickname: '이슬', memberId: 'munto0001', phone: '010-0000-0000',
    joinedAt: '25.08.27', lastLogin: '26.04.19', lastActive: '26.04.20'
  };

  return (
    <>
      <Breadcrumb items={['체험단 결제 관리', '결제 상세']} />
      <div className="flex between items-center" style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>결제 상세</h1>
        <button className="btn btn-outline btn-sm" onClick={onBack}>← 목록으로</button>
      </div>

      <div className="section-label">결제자 정보</div>
      <div className="card">
        <dl className="dl">
          <div><dt>닉네임</dt><dd className="link">{p.nickname}</dd></div>
          <div><dt>멤버ID</dt><dd>{p.memberId}</dd></div>
          <div><dt>연락처</dt><dd className="mono">{p.phone}</dd></div>
          <div><dt>가입 일자</dt><dd>{p.joinedAt || '25.08.27'}</dd></div>
          <div><dt>최종 로그인</dt><dd>{p.lastLogin || '26.04.19'}</dd></div>
          <div><dt>최종 활동일</dt><dd>{p.lastActive || '26.04.20'}</dd></div>
        </dl>
      </div>

      <div className="section-label">상세 결제 정보</div>
      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>결제일시</th>
                <th>결제ID</th>
                <th className="num">결제 재화 수</th>
                <th className="num">결제액</th>
                <th className="num">환불 재화 수</th>
                <th className="num">환불 금액</th>
                <th>결제 수단</th>
                <th>TID</th>
                <th style={{ width: 120 }}>환불 처리</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono">{fmtDateTime(p.paidAt)}</td>
                <td><a className="link">{p.id}</a></td>
                <td className="num mono">{p.qty}</td>
                <td className="num mono text-strong">₩{fmtMoney(p.amount)}</td>
                <td className="num mono">10</td>
                <td className="num mono text-danger">₩{fmtMoney(100000)}</td>
                <td>{p.channel}</td>
                <td><a className="link">{p.tid}</a></td>
                <td>
                  {p.refundable === false ? (
                    <button className="btn btn-xs disabled" disabled>환불 불가</button>
                  ) : (
                    <button className="btn btn-xs btn-outline" onClick={() => onOpenRefund(p)}>환불 처리</button>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-label">환불 처리 내역</div>
      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 150 }}>환불 처리일</th>
                <th className="num" style={{ width: 110 }}>환불 초대권 수</th>
                <th className="num" style={{ width: 130 }}>환불 금액</th>
                <th style={{ width: 110 }}>처리 결과</th>
                <th style={{ width: 130 }}>유형</th>
                <th style={{ width: 100 }}>처리자</th>
                <th>메모</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td className="mono">{fmtDateTime(h.processedAt)}</td>
                  <td className="num mono">{h.qty}</td>
                  <td className="num mono text-strong">₩{fmtMoney(h.amount)}</td>
                  <td><Badge variant={h.result.variant}>{h.result.key}</Badge></td>
                  <td>{h.type}</td>
                  <td>{h.operator}</td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 520, lineHeight: 1.6, fontSize: 12.5, color: 'var(--fg-muted)' }}>
                    {h.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

window.PaymentDetailScreen = PaymentDetailScreen;

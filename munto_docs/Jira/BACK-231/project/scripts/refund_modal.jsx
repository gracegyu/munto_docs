// Refund processing modal — 환불 처리
// 관리자는 정책 내용을 보고 확인 버튼만 누름. 환불 비율은 자동 적용.
function RefundModal({ payment, onClose, onConfirm }) {
  const { fmtMoney } = window.MuntoData;
  const p = payment || { qty: 100, amount: 1000000, id: 1232130, within5: true, used: false };

  // 환불 정책 판단
  const policy = p.used ? 'used' : (p.within5 ? 'within5' : 'after5');
  const ratio = policy === 'within5' ? 1.0 : policy === 'after5' ? 0.9 : 0;
  const finalAmount = Math.floor((p.amount || 0) * ratio);

  const policyLabel = {
    within5: '사용 시작 전 + 결제 5일 이내',
    after5:  '사용 시작 전 + 결제 5일 이후',
    used:    '사용 시작 후',
  }[policy];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-head">
          <div className="title">환불 처리</div>
          <button className="close" onClick={onClose}><Icon.Close /></button>
        </div>
        <div className="modal-body">
          <div className="section-label" style={{ margin: '0 0 10px', fontSize: 14 }}>환불 정책</div>
          <div style={{ border: '1px solid var(--admin-card-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
            <table className="tbl" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>조건</th>
                  <th className="num" style={{ width: 130 }}>환불 비율</th>
                </tr>
              </thead>
              <tbody>
                <tr style={policy==='within5' ? { background: '#FAFAFA' } : {}}>
                  <td>사용 시작 전 + 결제 5일 이내 {policy==='within5' && <span style={{marginLeft:8, fontSize: 11, color: 'var(--fg-muted)'}}>(적용)</span>}</td>
                  <td className="num">100%</td>
                </tr>
                <tr style={policy==='after5' ? { background: '#FAFAFA' } : {}}>
                  <td>사용 시작 전 + 결제 5일 이후 {policy==='after5' && <span style={{marginLeft:8, fontSize: 11, color: 'var(--fg-muted)'}}>(적용)</span>}</td>
                  <td className="num">90%</td>
                </tr>
                <tr style={policy==='used' ? { background: '#FAFAFA' } : {}}>
                  <td>사용 시작 후 {policy==='used' && <span style={{marginLeft:8, fontSize: 11, color: 'var(--fg-muted)'}}>(적용)</span>}</td>
                  <td className="num text-muted">환불 불가</td>
                </tr>
                <tr>
                  <td>1년 경과 (만료)</td>
                  <td className="num text-muted">환불 불가</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="section-label" style={{ margin: '0 0 10px', fontSize: 14 }}>환불 정보</div>
          <div className="kpi-grid cols-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 8 }}>
            <div className="kpi-cell">
              <div className="kpi-label">결제 초대권 수</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>{p.qty}<span className="unit"> 매</span></div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-label">결제액</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>₩{fmtMoney(p.amount)}</div>
            </div>
            <div className="kpi-cell">
              <div className="kpi-label">자동 산정 환불액</div>
              <div className="kpi-value" style={{ fontSize: 18 }}>
                {policy === 'used' ? '환불 불가' : `₩${fmtMoney(finalAmount)}`}
              </div>
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
            적용 정책: <span className="text-strong">{policyLabel}</span> · 비율 <span className="text-strong">{Math.round(ratio*100)}%</span>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary btn-full" onClick={() => onConfirm(p.qty, finalAmount)}
                  disabled={policy === 'used'}>
            {policy === 'used' ? '환불 불가' : '환불 처리 확인'}
          </button>
        </div>
      </div>
    </div>
  );
}

window.RefundModal = RefundModal;

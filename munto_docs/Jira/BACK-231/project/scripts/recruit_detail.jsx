// Screen 2-1: 모집 상세 관리
function RecruitDetailScreen({ recruitment, onBack }) {
  const { fmtDate, fmtDateTime, fmtMoney, generateMembers } = window.MuntoData;
  const r = recruitment || {
    id: 30210, status: { key: '모집 중', variant: 'success' }, fee: 20000,
    category: '운동/액티비티', subCategory: '러닝', name: '강동 유스드림 새벽 러닝 클럽',
    meetDate: new Date(2026, 4, 5, 6, 0), place: '강동 유스드림 일대',
    memberId: 'munto2001', nickname: '민지', phone: '010-1234-5678',
    capacity: 15, applied: 18, confirmed: 12, male: 6, female: 6,
    chatLink: 'https://open.kakao.com/o/muntorun'
  };
  const members = React.useMemo(() => generateMembers(12), []);
  const [toggledAttend, setToggledAttend] = React.useState({});

  const toggleAttend = (idx, currentlyAttended) => {
    if (currentlyAttended) return; // 참가를 미참가로 변경 불가
    setToggledAttend(s => ({ ...s, [idx]: !s[idx] }));
  };

  return (
    <>
      <Breadcrumb items={['체험단 모집 관리', '모집 목록', '모집 상세']} />
      <div className="flex between items-center" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>{r.name}</h1>
          <div className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>모집ID · <span className="mono">{r.id}</span></div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={onBack}>← 목록으로</button>
      </div>

      <div className="section-label">모임 상세 정보</div>
      <div className="card">
        <dl className="dl">
          <div><dt>상태</dt><dd><Badge variant={r.status.variant}>{r.status.key}</Badge></dd></div>
          <div><dt>참가비</dt><dd>{r.fee === 0 ? '무료' : `₩${fmtMoney(r.fee)}`}</dd></div>
          <div><dt>카테고리</dt><dd>{r.category}</dd></div>
          <div><dt>세부 카테고리</dt><dd>{r.subCategory}</dd></div>
          <div><dt>모임일</dt><dd className="mono">{fmtDateTime(r.meetDate)}</dd></div>
          <div><dt>장소</dt><dd>{r.place}</dd></div>
        </dl>
        <div style={{ borderTop: '1px solid var(--admin-card-border)' }}>
          <dl className="dl">
            <div><dt>멤버ID</dt><dd>{r.memberId}</dd></div>
            <div><dt>닉네임</dt><dd className="link">{r.nickname}</dd></div>
            <div><dt>전화번호</dt><dd className="mono">{r.phone}</dd></div>
            <div style={{ gridColumn: 'span 3' }}>
              <dt>채팅방 링크</dt>
              <dd className="link" style={{ fontSize: 13, fontWeight: 500 }}>
                {r.chatLink || 'https://open.kakao.com/o/muntorun'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="section-label">참여 정보</div>
      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table className="tbl tbl-participation">
            <thead>
              <tr>
                <th>포함인원(호스트포함)</th>
                <th>스태프 인원 수</th>
                <th>현재 신청</th>
                <th>모집인 취소</th>
                <th>확정 인원</th>
                <th>남성</th>
                <th>여성</th>
                <th>모임 참석률</th>
                <th>응답률</th>
                <th>좋아요</th>
                <th>댓글</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>최소 {Math.max(1, r.capacity-8)}명 · 최대 {r.capacity}명</td>
                <td>0명</td>
                <td>{r.applied}명</td>
                <td>{Math.max(0, r.applied - r.confirmed)}명</td>
                <td>{r.confirmed}명</td>
                <td>{r.male}명</td>
                <td>{r.female}명</td>
                <td><span className="dim">-</span></td>
                <td>0%</td>
                <td>14</td>
                <td><span className="dim">-</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-label">체험단 멤버 목록</div>
      <div className="card">
        <div className="table-toolbar">
          <div className="left">
            <span className="text-muted" style={{ fontSize: 12 }}>전체 <b className="text-strong">{members.length}</b>명</span>
            <span className="pill" style={{ marginLeft: 8 }}>신청 순</span>
          </div>
          <div className="right">
            <button className="btn btn-outline btn-sm"><Icon.Download /> 엑셀 다운로드</button>
          </div>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>번호</th>
                <th>주문ID</th>
                <th>상태</th>
                <th>멤버 상태</th>
                <th>신청 일시</th>
                <th>승인 일시</th>
                <th>멤버ID</th>
                <th>닉네임</th>
                <th>연락처</th>
                <th>TID</th>
                <th className="num">결제 금액</th>
                <th className="num">할인 금액</th>
                <th className="num">환불 금액</th>
                <th>환급 여부</th>
                <th>후기 작성</th>
                <th>모임 참가 여부</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const attended = m.attended || toggledAttend[i];
                return (
                  <tr key={i}>
                    <td className="mono">{m.idx}</td>
                    <td><a className="link">{m.orderId}</a></td>
                    <td><Badge variant={m.status.variant}>{m.status.key}</Badge></td>
                    <td><Badge variant={m.memberState.variant} dot={false}>{m.memberState.key}</Badge></td>
                    <td className="mono" style={{ fontSize: 12 }}>{fmtDateTime(m.appliedAt)}</td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {m.approvedAt ? fmtDateTime(m.approvedAt) : <span className="dim">-</span>}
                    </td>
                    <td className="muted">{m.memberId}</td>
                    <td className="link">{m.nickname}</td>
                    <td className="muted mono">{m.phone}</td>
                    <td><a className="link">{m.tid.slice(0,8)}…</a></td>
                    <td className="num mono">₩{fmtMoney(m.paid)}</td>
                    <td className="num mono">{m.discount > 0 ? `-₩${fmtMoney(m.discount)}` : <span className="dim">-</span>}</td>
                    <td className="num mono text-danger">{m.refund > 0 ? `₩${fmtMoney(m.refund)}` : <span className="dim">-</span>}</td>
                    <td>
                      <Badge variant={m.refunded ? 'warn' : 'neutral'} dot={false}>{m.refunded ? 'Y' : 'N'}</Badge>
                    </td>
                    <td>
                      <Badge variant={m.reviewed ? 'success' : 'neutral'} dot={false}>{m.reviewed ? 'Y' : 'N'}</Badge>
                    </td>
                    <td>
                      <label className="checkbox" style={{ cursor: m.attended ? 'not-allowed' : 'pointer' }}
                             title={m.attended ? '참가를 미참가로 변경할 수 없습니다' : '클릭하여 참가로 변경'}>
                        <input type="checkbox" checked={attended}
                               disabled={m.attended}
                               onChange={() => toggleAttend(i, m.attended)} />
                        <span>{attended ? 'Y' : 'N'}</span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

window.RecruitDetailScreen = RecruitDetailScreen;

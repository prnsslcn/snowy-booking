/**
 * 관리자 화면 불러오는 동안 — 메뉴를 누르는 즉시 본문 자리에 제목·패널 모양을 보여 준다(서버 응답 기다리는 동안 멈춰 보이지 않게).
 * BlockIn 대신 짧게 옅어지며 나타남(0.12초 뒤 — 빨리 오면 거의 안 보이게). 실제 화면이 도착하면 그때 BlockIn 으로 나타난다.
 */
export default function AdminLoading() {
  return (
    <div style={{ animation: 'admin-skel-in 0.2s ease-out 0.12s backwards' }} aria-busy="true" aria-label="불러오는 중">
      <div className="mb-6 md:mb-8">
        <div className="skel h-[14px] w-20 rounded-md" />
        <div className="skel mt-2.5 h-[28px] w-40 rounded-lg md:h-[34px]" />
      </div>
      <div className="flex flex-col gap-5">
        <div className="panel">
          <div className="skel h-[15px] w-32 rounded-md" />
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="skel h-[12px] w-16 rounded-md" />
                <div className="skel mt-3 h-[30px] w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="skel h-[15px] w-28 rounded-md" />
          <div className="mt-5 flex flex-col gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skel h-[18px] rounded-md" style={{ width: `${92 - i * 9}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

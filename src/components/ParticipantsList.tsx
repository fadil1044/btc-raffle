import type { Participant } from '../hooks/useRaffle';

interface ParticipantsListProps {
  participants: Participant[];
  totalTickets: bigint;
  currentAddress?: string | null;
}

export function ParticipantsList({ participants, totalTickets, currentAddress }: ParticipantsListProps) {
  if (participants.length === 0) {
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '32px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: 12,
        letterSpacing: 1,
      }}>
        NO PARTICIPANTS YET — BE THE FIRST!
      </div>
    );
  }

  const sorted = [...participants].sort((a, b) => Number(b.tickets - a.tickets));

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2, color: 'var(--orange)' }}>
          PARTICIPANTS
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {participants.length} ADDRESSES
        </span>
      </div>

      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {sorted.map((p, i) => {
          const pct = totalTickets > 0n
            ? Number((p.tickets * 10000n) / totalTickets) / 100
            : 0;
          const isMe = currentAddress && p.address.toLowerCase() === currentAddress.toLowerCase();

          return (
            <div
              key={p.address}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                borderBottom: '1px solid var(--border)',
                gap: '12px',
                background: isMe ? 'rgba(247,147,26,0.05)' : 'transparent',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: 11, width: 20, textAlign: 'right' }}>
                {i + 1}
              </span>
              <span style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: isMe ? 'var(--orange)' : 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {isMe ? '★ ' : ''}{p.address}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: 60,
                  height: 3,
                  background: 'var(--surface2)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: isMe ? 'var(--orange)' : '#555',
                    borderRadius: 2,
                  }} />
                </div>
                <span style={{ fontSize: 11, color: isMe ? 'var(--orange)' : 'var(--text-muted)', minWidth: 50, textAlign: 'right' }}>
                  {p.tickets.toString()}t ({pct.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

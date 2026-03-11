import { useState } from 'react';
import type { RaffleInfo } from '../hooks/useRaffle';

interface RaffleCardProps {
  raffleInfo: RaffleInfo | null;
  myTickets: bigint[];
  walletAddress?: string | null;
  isConnected: boolean;
  loading: boolean;
  txLoading: boolean;
  lastTxHash: string | null;
  onBuyTickets: (n: number) => void;
  onDrawWinner: () => void;
  onClaimPrize: () => void;
  onConnectWallet: () => void;
}

const SATOSHIS = 1e8;

function formatBTC(sats: bigint): string {
  return (Number(sats) / SATOSHIS).toFixed(8);
}

function formatSats(sats: bigint): string {
  return Number(sats).toLocaleString();
}

export function RaffleCard({
  raffleInfo,
  myTickets,
  walletAddress,
  isConnected,
  loading,
  txLoading,
  lastTxHash,
  onBuyTickets,
  onDrawWinner,
  onClaimPrize,
  onConnectWallet,
}: RaffleCardProps) {
  const [ticketCount, setTicketCount] = useState(1);

  const isWinner = raffleInfo?.winner &&
    walletAddress &&
    raffleInfo.winner.toLowerCase() === walletAddress.toLowerCase() &&
    !raffleInfo.isActive;

  const progressPct = raffleInfo && raffleInfo.maxTickets > 0n
    ? Number((raffleInfo.totalTickets * 100n) / raffleInfo.maxTickets)
    : 0;

  const totalCost = raffleInfo
    ? raffleInfo.ticketPrice * BigInt(ticketCount)
    : 0n;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      maxWidth: 520,
      width: '100%',
    }}>
      {/* Top banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0f00, #2a1500)',
        borderBottom: '1px solid var(--border)',
        padding: '28px 32px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 52,
          letterSpacing: 4,
          color: 'var(--orange)',
          lineHeight: 1,
          textShadow: '0 0 40px rgba(247,147,26,0.4)',
        }}>
          {loading ? '...' : raffleInfo ? `${formatBTC(raffleInfo.totalPot)} BTC` : '0.00000000 BTC'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 2, marginTop: 6 }}>
          TOTAL PRIZE POT
        </div>
        <div style={{
          position: 'absolute', top: 12, right: 16,
          fontSize: 10, letterSpacing: 1,
          padding: '3px 8px', borderRadius: 4,
          background: raffleInfo?.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          color: raffleInfo?.isActive ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${raffleInfo?.isActive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        }}>
          {raffleInfo?.isActive ? '● LIVE' : raffleInfo?.winner ? '● ENDED' : '● LOADING'}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        borderBottom: '1px solid var(--border)',
      }}>
        {[
          { label: 'TICKET PRICE', value: raffleInfo ? `${formatSats(raffleInfo.ticketPrice)} sats` : '—' },
          { label: 'SOLD', value: raffleInfo ? `${raffleInfo.totalTickets.toString()} / ${raffleInfo.maxTickets.toString()}` : '—' },
          { label: 'MY TICKETS', value: myTickets.length.toString() },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '16px',
            textAlign: 'center',
            borderRight: i < 2 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
              {loading ? '...' : stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {raffleInfo && (
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>TICKET SALES</span>
            <span>{progressPct.toFixed(1)}%</span>
          </div>
          <div style={{
            height: 4,
            background: 'var(--surface2)',
            borderRadius: 2,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'var(--orange)',
              borderRadius: 2,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Winner banner */}
      {raffleInfo && !raffleInfo.isActive && raffleInfo.winner && raffleInfo.winner !== '0x0000000000000000000000000000000000000000' && (
        <div style={{
          padding: '14px 24px',
          background: 'rgba(247,147,26,0.08)',
          borderBottom: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 4 }}>🏆 WINNER</div>
          <div style={{ fontSize: 12, color: 'var(--orange)', wordBreak: 'break-all' }}>
            {raffleInfo.winner}
          </div>
          {isWinner && (
            <div style={{
              marginTop: 10,
              fontSize: 11,
              color: 'var(--green)',
              letterSpacing: 1,
            }}>
              🎉 YOU WON! CLAIM YOUR PRIZE BELOW
            </div>
          )}
        </div>
      )}

      {/* Action area */}
      <div style={{ padding: '24px' }}>
        {!isConnected ? (
          <button
            onClick={onConnectWallet}
            style={btnStyle('var(--orange)', '#000')}
          >
            CONNECT OP_WALLET TO ENTER
          </button>
        ) : isWinner ? (
          <button
            onClick={onClaimPrize}
            disabled={txLoading}
            style={btnStyle('var(--green)', '#000')}
          >
            {txLoading ? 'CLAIMING...' : '🏆 CLAIM PRIZE'}
          </button>
        ) : raffleInfo?.isActive ? (
          <div>
            {/* Ticket count selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>TICKETS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[1, 5, 10, 25].map(n => (
                  <button
                    key={n}
                    onClick={() => setTicketCount(n)}
                    style={{
                      padding: '5px 10px',
                      background: ticketCount === n ? 'var(--orange)' : 'var(--surface2)',
                      border: `1px solid ${ticketCount === n ? 'var(--orange)' : 'var(--border)'}`,
                      borderRadius: 4,
                      color: ticketCount === n ? '#000' : 'var(--text-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {n}x
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={ticketCount}
                  onChange={e => setTicketCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  style={{
                    width: 56,
                    padding: '5px 8px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>

            {/* Cost display */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--surface2)',
              borderRadius: 6,
              marginBottom: '14px',
              fontSize: 12,
            }}>
              <span style={{ color: 'var(--text-muted)' }}>TOTAL COST</span>
              <span style={{ color: 'var(--orange)' }}>
                {raffleInfo ? `${formatSats(totalCost)} sats (${formatBTC(totalCost)} BTC)` : '—'}
              </span>
            </div>

            <button
              onClick={() => onBuyTickets(ticketCount)}
              disabled={txLoading || loading}
              style={btnStyle(
                txLoading || loading ? 'var(--border)' : 'var(--orange)',
                txLoading || loading ? 'var(--text-muted)' : '#000'
              )}
            >
              {txLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  BROADCASTING TX...
                </span>
              ) : `BUY ${ticketCount} TICKET${ticketCount > 1 ? 'S' : ''}`}
            </button>
          </div>
        ) : (
          // Ended — show draw winner if no winner yet
          !raffleInfo?.winner || raffleInfo.winner === '0x0000000000000000000000000000000000000000' ? (
            <button
              onClick={onDrawWinner}
              disabled={txLoading}
              style={btnStyle('var(--orange)', '#000')}
            >
              {txLoading ? 'DRAWING...' : 'DRAW WINNER'}
            </button>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              This raffle has ended.
            </div>
          )
        )}

        {/* TX hash */}
        {lastTxHash && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 6,
            fontSize: 11,
          }} className="fade-in">
            <div style={{ color: 'var(--green)', marginBottom: 2 }}>✓ TRANSACTION BROADCAST</div>
            <a
              href={`https://opscan.org/tx/${lastTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}
            >
              {lastTxHash}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    width: '100%',
    padding: '14px',
    background: bg,
    border: 'none',
    borderRadius: 8,
    color,
    fontFamily: 'var(--font-display)',
    fontSize: 18,
    letterSpacing: 2,
    cursor: bg === 'var(--border)' ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
  };
}

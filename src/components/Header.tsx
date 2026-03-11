import { useWalletConnect } from '@btc-vision/walletconnect';

interface HeaderProps {
  walletAddress?: string | null;
  walletBalance?: { total: number } | null;
  isConnected: boolean;
}

export function Header({ walletAddress, walletBalance, isConnected }: HeaderProps) {
  const { connectToWallet, disconnect } = useWalletConnect();

  const shortAddr = walletAddress
    ? walletAddress.slice(0, 6) + '...' + walletAddress.slice(-4)
    : '';

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 32px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--orange)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 'bold', color: '#000'
        }}>₿</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 2, color: 'var(--orange)' }}>
            BTC RAFFLE
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>
            POWERED BY OP_NET · BITCOIN L1
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isConnected && walletBalance && (
          <div style={{
            padding: '6px 12px',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}>
            <span style={{ color: 'var(--orange)' }}>
              {(walletBalance.total / 1e8).toFixed(8)}
            </span>
            {' BTC'}
          </div>
        )}

        {isConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              padding: '6px 14px',
              background: 'var(--surface2)',
              border: '1px solid var(--green)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--green)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--green)',
                display: 'inline-block',
                animation: 'pulse-orange 2s infinite',
              }} />
              {shortAddr}
            </div>
            <button
              onClick={() => disconnect()}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-muted)',
                fontSize: 11,
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                (e.target as HTMLButtonElement).style.borderColor = 'var(--red)';
                (e.target as HTMLButtonElement).style.color = 'var(--red)';
              }}
              onMouseOut={e => {
                (e.target as HTMLButtonElement).style.borderColor = 'var(--border)';
                (e.target as HTMLButtonElement).style.color = 'var(--text-muted)';
              }}
            >
              DISCONNECT
            </button>
          </div>
        ) : (
          <button
            onClick={() => connectToWallet('OP_WALLET')}
            style={{
              padding: '10px 24px',
              background: 'var(--orange)',
              border: 'none',
              borderRadius: 6,
              color: '#000',
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              letterSpacing: 2,
              transition: 'all 0.2s',
            }}
            onMouseOver={e => (e.target as HTMLButtonElement).style.background = '#e8851a'}
            onMouseOut={e => (e.target as HTMLButtonElement).style.background = 'var(--orange)'}
          >
            CONNECT OP_WALLET
          </button>
        )}
      </div>
    </header>
  );
}

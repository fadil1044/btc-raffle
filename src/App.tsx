import { useWalletConnect } from '@btc-vision/walletconnect';
import { Header } from './components/Header';
import { RaffleCard } from './components/RaffleCard';
import { ParticipantsList } from './components/ParticipantsList';
import { ContractSetup } from './components/ContractSetup';
import { useRaffle } from './hooks/useRaffle';

export default function App() {
  const { connectToWallet } = useWalletConnect();

  const {
    raffleInfo,
    participants,
    myTickets,
    loading,
    txLoading,
    error,
    lastTxHash,
    isConnected,
    walletAddress,
    walletBalance,
    contractAddress,
    setContractAddress,
    buyTickets,
    drawWinner,
    claimPrize,
    refresh,
  } = useRaffle();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        walletAddress={walletAddress}
        walletBalance={walletBalance}
        isConnected={isConnected}
      />

      <div style={{
        overflow: 'hidden',
        background: 'rgba(247,147,26,0.06)',
        borderBottom: '1px solid var(--border)',
        padding: '6px 0',
        fontSize: 10,
        color: 'var(--orange)',
        letterSpacing: 2,
        whiteSpace: 'nowrap',
      }}>
        <div style={{ display: 'inline-block', animation: 'ticker 30s linear infinite' }}>
          {'  \u29c6 BTC RAFFLE ON BITCOIN L1  \xb7  POWERED BY OP_NET  \xb7  REAL BTC PRIZES  \xb7  DECENTRALIZED  \xb7  TRUSTLESS  \xb7  '}
          {'  \u29c6 BTC RAFFLE ON BITCOIN L1  \xb7  POWERED BY OP_NET  \xb7  REAL BTC PRIZES  \xb7  DECENTRALIZED  \xb7  TRUSTLESS  \xb7  '}
        </div>
      </div>

      <main style={{ flex: 1, padding: '40px 24px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {error && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 6,
            color: 'var(--red)',
            fontSize: 12,
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }} className="fade-in">
            <span>&#9888; {error}</span>
            <button onClick={refresh} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 11 }}>
              RETRY
            </button>
          </div>
        )}

        {!contractAddress && (
          <div style={{ marginBottom: 32 }}>
            <ContractSetup contractAddress={contractAddress} onSetAddress={setContractAddress} />
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 520px) 1fr',
          gap: '24px',
          alignItems: 'start',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RaffleCard
              raffleInfo={raffleInfo}
              myTickets={myTickets}
              walletAddress={walletAddress}
              isConnected={isConnected}
              loading={loading}
              txLoading={txLoading}
              lastTxHash={lastTxHash}
              onBuyTickets={buyTickets}
              onDrawWinner={drawWinner}
              onClaimPrize={claimPrize}
              onConnectWallet={() => connectToWallet('OP_WALLET')}
            />
            {contractAddress && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 11,
              }}>
                <span style={{ color: 'var(--text-muted)' }}>CONTRACT:</span>
                <span style={{ flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contractAddress}
                </span>
                <button onClick={() => setContractAddress('')} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>
                  CHANGE
                </button>
                <button onClick={refresh} disabled={loading} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>
                  {loading ? 'LOADING...' : 'REFRESH'}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ParticipantsList
              participants={participants}
              totalTickets={raffleInfo?.totalTickets ?? 0n}
              currentAddress={walletAddress}
            />

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: 2, color: 'var(--orange)', marginBottom: 12 }}>
                HOW IT WORKS
              </div>
              {[
                ['01', 'Connect your OP_WALLET Chrome extension'],
                ['02', 'Buy tickets with real BTC on Bitcoin L1'],
                ['03', 'Each ticket = one entry into the raffle'],
                ['04', 'Winner drawn on-chain when raffle ends'],
                ['05', 'Winner claims the full BTC prize pot'],
              ].map(([n, text]) => (
                <div key={n} style={{ display: 'flex', gap: '12px', marginBottom: '10px', fontSize: 12 }}>
                  <span style={{ color: 'var(--orange)', fontFamily: 'var(--font-display)', fontSize: 14 }}>{n}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{text}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 1 }}>ECOSYSTEM LINKS</div>
              {[
                ['OP_NET Docs', 'https://docs.opnet.org'],
                ['OPScan Explorer', 'https://opscan.org'],
                ['OP_WALLET Extension', 'https://chromewebstore.google.com/detail/opwallet/pmbjpcmaaladnfpacpmhmnfmpklgbdjb'],
              ].map(([label, href]) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', color: 'var(--text-muted)', padding: '3px 0', transition: 'color 0.15s' }}
                  onMouseOver={e => (e.currentTarget.style.color = 'var(--orange)')}
                  onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  &rarr; {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer style={{ padding: '16px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>
        <span>BTC RAFFLE &middot; VIBECODE CHALLENGE WEEK 3</span>
        <span>BUILT ON BITCOIN L1 VIA OP_NET</span>
      </footer>
    </div>
  );
}

import { useState } from 'react';

interface ContractSetupProps {
  contractAddress: string;
  onSetAddress: (addr: string) => void;
}

export function ContractSetup({ contractAddress, onSetAddress }: ContractSetupProps) {
  const [input, setInput] = useState(contractAddress);

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--orange)',
      borderRadius: 12,
      padding: '24px',
      maxWidth: 560,
      margin: '0 auto',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 20,
        letterSpacing: 2,
        color: 'var(--orange)',
        marginBottom: 8,
      }}>
        SET CONTRACT ADDRESS
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.8 }}>
        Enter the deployed BTC Raffle contract address on OP_NET.
        Deploy the contract from the <code style={{ color: 'var(--orange)' }}>/contract</code> folder
        first, then paste the P2OP address here.
      </p>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="bcrt1p... or 0x..."
          style={{
            flex: 1,
            padding: '10px 14px',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <button
          onClick={() => onSetAddress(input.trim())}
          disabled={!input.trim()}
          style={{
            padding: '10px 20px',
            background: 'var(--orange)',
            border: 'none',
            borderRadius: 6,
            color: '#000',
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            letterSpacing: 1,
            cursor: 'pointer',
          }}
        >
          LOAD
        </button>
      </div>

      <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text)' }}>Quick Start:</strong>
        {' '}To deploy your own raffle, run{' '}
        <code style={{ color: 'var(--orange)' }}>cd contract && npm install && npm run deploy</code>
        {' '}from the project root.
      </div>
    </div>
  );
}

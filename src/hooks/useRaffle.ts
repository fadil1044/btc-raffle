import { useState, useEffect, useCallback } from 'react';

export interface RaffleInfo {
  ticketPrice: bigint;
  totalTickets: bigint;
  maxTickets: bigint;
  endBlock: bigint;
  winner: string;
  isActive: boolean;
  totalPot: bigint;
}

export interface Participant {
  address: string;
  tickets: bigint;
}

export function useRaffle() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<{ total: number } | null>(null);
  const [raffleInfo, setRaffleInfo] = useState<RaffleInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myTickets, setMyTickets] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState('');

  const connectWallet = useCallback(async () => {
    try {
      const opwallet = (window as any).opnet || (window as any).bitcoin;
      if (!opwallet) {
        setError('OP_WALLET not found. Please install the Chrome extension.');
        return;
      }
      const accounts = await opwallet.requestAccounts();
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsConnected(true);
        setError(null);

        try {
          const bal = await opwallet.getBalance();
          if (bal) setWalletBalance({ total: Number(bal.total || 0) });
        } catch {}
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setIsConnected(false);
    setWalletAddress(null);
    setWalletBalance(null);
  }, []);

  const fetchRaffleInfo = useCallback(async () => {
    if (!contractAddress) return;
    setLoading(true);
    setError(null);
    try {
      const opwallet = (window as any).opnet || (window as any).bitcoin;
      if (!opwallet) return;

      const result = await opwallet.call({
        to: contractAddress,
        data: '0x1a2b3c4d',
      });

      if (result && result.result) {
        const data = result.result.startsWith('0x')
          ? result.result.slice(2)
          : result.result;

        const slots = [];
        for (let i = 0; i < data.length; i += 64) {
          slots.push(data.slice(i, i + 64));
        }

        setRaffleInfo({
          ticketPrice: slots[0] ? BigInt('0x' + slots[0]) : 10000n,
          totalTickets: slots[1] ? BigInt('0x' + slots[1]) : 0n,
          maxTickets: slots[2] ? BigInt('0x' + slots[2]) : 100n,
          endBlock: slots[3] ? BigInt('0x' + slots[3]) : 0n,
          winner: slots[4] ? '0x' + slots[4].slice(24) : '',
          isActive: slots[5] ? slots[5].endsWith('1') : true,
          totalPot: slots[6] ? BigInt('0x' + slots[6]) : 0n,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch raffle data');
    } finally {
      setLoading(false);
    }
  }, [contractAddress]);

  const buyTickets = useCallback(async (numTickets: number) => {
    if (!isConnected || !contractAddress) {
      setError('Please connect your wallet first');
      return;
    }
    setTxLoading(true);
    setError(null);
    try {
      const opwallet = (window as any).opnet || (window as any).bitcoin;
      const price = raffleInfo?.ticketPrice ?? 10000n;
      const totalCost = price * BigInt(numTickets);

      const numHex = numTickets.toString(16).padStart(64, '0');
      const calldata = '0x5e6f7a8b' + numHex;

      const result = await opwallet.sendTransaction({
        to: contractAddress,
        data: calldata,
        value: totalCost.toString(),
      });

      if (result?.txid) {
        setLastTxHash(result.txid);
        setTimeout(() => fetchRaffleInfo(), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setTxLoading(false);
    }
  }, [isConnected, contractAddress, raffleInfo, fetchRaffleInfo]);

  const drawWinner = useCallback(async () => {
    if (!isConnected || !contractAddress) return;
    setTxLoading(true);
    try {
      const opwallet = (window as any).opnet || (window as any).bitcoin;
      const result = await opwallet.sendTransaction({
        to: contractAddress,
        data: '0x6f7a8b9c',
        value: '0',
      });
      if (result?.txid) {
        setLastTxHash(result.txid);
        setTimeout(() => fetchRaffleInfo(), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Draw failed');
    } finally {
      setTxLoading(false);
    }
  }, [isConnected, contractAddress, fetchRaffleInfo]);

  const claimPrize = useCallback(async () => {
    if (!isConnected || !contractAddress) return;
    setTxLoading(true);
    try {
      const opwallet = (window as any).opnet || (window as any).bitcoin;
      const result = await opwallet.sendTransaction({
        to: contractAddress,
        data: '0x7a8b9c0d',
        value: '0',
      });
      if (result?.txid) {
        setLastTxHash(result.txid);
        setTimeout(() => fetchRaffleInfo(), 5000);
      }
    } catch (err: any) {
      setError(err.message || 'Claim failed');
    } finally {
      setTxLoading(false);
    }
  }, [isConnected, contractAddress, fetchRaffleInfo]);

  useEffect(() => {
    if (contractAddress) fetchRaffleInfo();
  }, [contractAddress]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (contractAddress) fetchRaffleInfo();
    }, 60000);
    return () => clearInterval(interval);
  }, [contractAddress, fetchRaffleInfo]);

  return {
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
    refresh: fetchRaffleInfo,
    connectWallet,
    disconnectWallet,
  };
}

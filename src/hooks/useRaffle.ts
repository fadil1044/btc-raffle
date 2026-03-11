import { useState, useEffect, useCallback } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { JSONRpcProvider, IContract, Contract } from '@btc-vision/opnet';
import { RAFFLE_CONTRACT_ADDRESS, OPNET_RPC_URL, OPNET_TESTNET_RPC_URL } from '../abi/raffle';

export interface RaffleInfo {
  ticketPrice: bigint;       // in satoshis
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
  const {
    walletInstance,
    walletAddress,
    walletBalance,
    isConnected,
    provider,
  } = useWalletConnect();

  const [raffleInfo, setRaffleInfo] = useState<RaffleInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myTickets, setMyTickets] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState(RAFFLE_CONTRACT_ADDRESS);

  // Build a JSON-RPC provider (read-only)
  const getRpcProvider = useCallback(() => {
    const url = import.meta.env.VITE_NETWORK === 'testnet'
      ? OPNET_TESTNET_RPC_URL
      : OPNET_RPC_URL;
    return new JSONRpcProvider(url);
  }, []);

  // Fetch raffle info from contract
  const fetchRaffleInfo = useCallback(async () => {
    if (!contractAddress) return;

    setLoading(true);
    setError(null);

    try {
      const rpc = getRpcProvider();

      // Call getRaffleInfo() on the contract
      const result = await rpc.call({
        to: contractAddress,
        data: encodeCall(0x1a2b3c4d, []),
      });

      if (result && result.result) {
        const decoded = decodeRaffleInfo(result.result);
        setRaffleInfo(decoded);
      }

      // Fetch total pot
      const potResult = await rpc.call({
        to: contractAddress,
        data: encodeCall(0x4d5e6f7a, []),
      });
      if (potResult && potResult.result && raffleInfo) {
        const pot = BigInt('0x' + potResult.result.slice(2));
        setRaffleInfo(prev => prev ? { ...prev, totalPot: pot } : prev);
      }

      // Fetch participants
      const participantsResult = await rpc.call({
        to: contractAddress,
        data: encodeCall(0x3c4d5e6f, []),
      });
      if (participantsResult && participantsResult.result) {
        const parts = decodeParticipants(participantsResult.result);
        setParticipants(parts);
      }

      // Fetch my tickets if connected
      if (walletAddress) {
        const myTicketsResult = await rpc.call({
          to: contractAddress,
          data: encodeCall(0x2b3c4d5e, [walletAddress]),
        });
        if (myTicketsResult && myTicketsResult.result) {
          const tickets = decodeTicketList(myTicketsResult.result);
          setMyTickets(tickets);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch raffle data';
      setError(message);
      console.error('fetchRaffleInfo error:', err);
    } finally {
      setLoading(false);
    }
  }, [contractAddress, walletAddress, getRpcProvider]);

  // Buy tickets
  const buyTickets = useCallback(async (numTickets: number) => {
    if (!walletInstance || !walletAddress || !contractAddress) {
      setError('Please connect your wallet first');
      return;
    }
    if (!raffleInfo) {
      setError('Raffle info not loaded');
      return;
    }

    setTxLoading(true);
    setError(null);
    setLastTxHash(null);

    try {
      const calldata = encodeCall(0x5e6f7a8b, [numTickets]);
      const value = raffleInfo.ticketPrice * BigInt(numTickets); // satoshis to send

      const txResult = await walletInstance.sendTransaction({
        to: contractAddress,
        data: calldata,
        value: value.toString(),
      });

      if (txResult && txResult.txid) {
        setLastTxHash(txResult.txid);
        // Refresh data after tx
        setTimeout(() => fetchRaffleInfo(), 5000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setError(message);
      console.error('buyTickets error:', err);
    } finally {
      setTxLoading(false);
    }
  }, [walletInstance, walletAddress, contractAddress, raffleInfo, fetchRaffleInfo]);

  // Draw winner (only callable by owner after end block)
  const drawWinner = useCallback(async () => {
    if (!walletInstance || !walletAddress || !contractAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setTxLoading(true);
    setError(null);

    try {
      const calldata = encodeCall(0x6f7a8b9c, []);

      const txResult = await walletInstance.sendTransaction({
        to: contractAddress,
        data: calldata,
        value: '0',
      });

      if (txResult && txResult.txid) {
        setLastTxHash(txResult.txid);
        setTimeout(() => fetchRaffleInfo(), 5000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Draw failed';
      setError(message);
    } finally {
      setTxLoading(false);
    }
  }, [walletInstance, walletAddress, contractAddress, fetchRaffleInfo]);

  // Claim prize
  const claimPrize = useCallback(async () => {
    if (!walletInstance || !walletAddress || !contractAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setTxLoading(true);
    setError(null);

    try {
      const calldata = encodeCall(0x7a8b9c0d, []);

      const txResult = await walletInstance.sendTransaction({
        to: contractAddress,
        data: calldata,
        value: '0',
      });

      if (txResult && txResult.txid) {
        setLastTxHash(txResult.txid);
        setTimeout(() => fetchRaffleInfo(), 5000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Claim failed';
      setError(message);
    } finally {
      setTxLoading(false);
    }
  }, [walletInstance, walletAddress, contractAddress, fetchRaffleInfo]);

  // Auto-fetch on connect
  useEffect(() => {
    if (contractAddress) {
      fetchRaffleInfo();
    }
  }, [contractAddress, isConnected]);

  // Periodic refresh every 60 seconds
  useEffect(() => {
    if (!contractAddress) return;
    const interval = setInterval(fetchRaffleInfo, 60_000);
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
  };
}

// ─── Encoding helpers ───────────────────────────────────────────────────────

function encodeCall(selector: number, args: (number | string | bigint)[]): string {
  // Encode selector as 4-byte hex
  const selectorHex = selector.toString(16).padStart(8, '0');
  // Encode each arg as 32-byte slot
  const encodedArgs = args.map(arg => {
    if (typeof arg === 'string' && arg.startsWith('0x')) {
      return arg.slice(2).padStart(64, '0');
    }
    const n = BigInt(arg);
    return n.toString(16).padStart(64, '0');
  }).join('');
  return '0x' + selectorHex + encodedArgs;
}

// ─── Decoding helpers ────────────────────────────────────────────────────────

function decodeRaffleInfo(hex: string): RaffleInfo {
  const data = hex.startsWith('0x') ? hex.slice(2) : hex;
  const slots = [];
  for (let i = 0; i < data.length; i += 64) {
    slots.push(data.slice(i, i + 64));
  }
  return {
    ticketPrice: slots[0] ? BigInt('0x' + slots[0]) : 0n,
    totalTickets: slots[1] ? BigInt('0x' + slots[1]) : 0n,
    maxTickets: slots[2] ? BigInt('0x' + slots[2]) : 0n,
    endBlock: slots[3] ? BigInt('0x' + slots[3]) : 0n,
    winner: slots[4] ? '0x' + slots[4].slice(24) : '',
    isActive: slots[5] ? slots[5].endsWith('1') : false,
    totalPot: 0n,
  };
}

function decodeParticipants(hex: string): Participant[] {
  // Simplified: parse returned packed address+count data
  const data = hex.startsWith('0x') ? hex.slice(2) : hex;
  const participants: Participant[] = [];
  // Each entry = 32 bytes address padded + 32 bytes count
  for (let i = 0; i + 128 <= data.length; i += 128) {
    const addrSlot = data.slice(i, i + 64);
    const countSlot = data.slice(i + 64, i + 128);
    const addr = '0x' + addrSlot.slice(24);
    const count = BigInt('0x' + countSlot);
    if (addr !== '0x0000000000000000000000000000000000000000') {
      participants.push({ address: addr, tickets: count });
    }
  }
  return participants;
}

function decodeTicketList(hex: string): bigint[] {
  const data = hex.startsWith('0x') ? hex.slice(2) : hex;
  const tickets: bigint[] = [];
  for (let i = 0; i < data.length; i += 64) {
    const slot = data.slice(i, i + 64);
    if (slot) tickets.push(BigInt('0x' + slot));
  }
  return tickets;
}

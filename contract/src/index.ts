/**
 * BTC Raffle Smart Contract — OP_NET Bitcoin L1
 * 
 * Features:
 * - Owner configures ticket price, max tickets, end block
 * - Users buy tickets by sending BTC
 * - On-chain verifiable random winner selection using block hash
 * - Winner claims the full pot
 * - 2% owner fee
 */

import {
  OP_20,
  Blockchain,
  StoredU256,
  StoredString,
  StoredBoolean,
  BytesWriter,
  BytesReader,
  Revert,
  Address,
  SafeMath,
  encodeSelector,
  Selector,
  MAX_U256,
} from '@btc-vision/btc-runtime/runtime';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const TICKET_PRICE_KEY: u16 = 1;      // satoshis per ticket
const MAX_TICKETS_KEY: u16 = 2;       // max tickets available
const TOTAL_TICKETS_KEY: u16 = 3;     // tickets sold so far
const END_BLOCK_KEY: u16 = 4;         // block height when raffle closes
const IS_ACTIVE_KEY: u16 = 5;         // is raffle open
const WINNER_KEY: u16 = 6;            // winner address (empty if not drawn)
const TOTAL_POT_KEY: u16 = 7;         // total BTC collected (satoshis)
const OWNER_KEY: u16 = 8;             // owner address
const PRIZE_CLAIMED_KEY: u16 = 9;     // has winner claimed?

// Mapping: address -> ticket count (base key 100)
const TICKET_COUNT_BASE: u16 = 100;
// Mapping: ticket index -> address (base key 200)
const TICKET_OWNER_BASE: u16 = 200;
// Participant list length
const PARTICIPANT_COUNT_KEY: u16 = 300;
// Mapping: participant index -> address (base key 400)
const PARTICIPANT_ADDR_BASE: u16 = 400;

// Owner fee (2%)
const FEE_BPS: u64 = 200; // basis points
const BPS_DENOM: u64 = 10000;

// ─── Selectors ────────────────────────────────────────────────────────────────

const SEL_GET_RAFFLE_INFO = encodeSelector('getRaffleInfo()');
const SEL_GET_MY_TICKETS = encodeSelector('getMyTickets(address)');
const SEL_GET_PARTICIPANTS = encodeSelector('getParticipants()');
const SEL_GET_TOTAL_POT = encodeSelector('getTotalPot()');
const SEL_BUY_TICKETS = encodeSelector('buyTickets(uint256)');
const SEL_DRAW_WINNER = encodeSelector('drawWinner()');
const SEL_CLAIM_PRIZE = encodeSelector('claimPrize()');
const SEL_INITIALIZE = encodeSelector('initialize(uint256,uint256,uint256)');

// ─── Events ───────────────────────────────────────────────────────────────────

function emitTicketsPurchased(buyer: Address, count: u64, ticketIds: u64[]): void {
  const writer = new BytesWriter(32 + 8 + count * 8);
  writer.writeAddress(buyer);
  writer.writeU64(count);
  for (let i = 0; i < ticketIds.length; i++) {
    writer.writeU64(ticketIds[i]);
  }
  Blockchain.emit('TicketsPurchased', writer.getBuffer());
}

function emitWinnerDrawn(winner: Address, ticketId: u64, prize: u64): void {
  const writer = new BytesWriter(32 + 8 + 8);
  writer.writeAddress(winner);
  writer.writeU64(ticketId);
  writer.writeU64(prize);
  Blockchain.emit('WinnerDrawn', writer.getBuffer());
}

function emitPrizeClaimed(winner: Address, amount: u64): void {
  const writer = new BytesWriter(32 + 8);
  writer.writeAddress(winner);
  writer.writeU64(amount);
  Blockchain.emit('PrizeClaimed', writer.getBuffer());
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export class BtcRaffle {
  
  // ── Storage helpers ──────────────────────────────────────────────────────

  private ticketPrice(): u64 {
    return Blockchain.getStorageAt(TICKET_PRICE_KEY, 0).toU64();
  }
  private maxTickets(): u64 {
    return Blockchain.getStorageAt(MAX_TICKETS_KEY, 0).toU64();
  }
  private totalTickets(): u64 {
    return Blockchain.getStorageAt(TOTAL_TICKETS_KEY, 0).toU64();
  }
  private endBlock(): u64 {
    return Blockchain.getStorageAt(END_BLOCK_KEY, 0).toU64();
  }
  private isActive(): bool {
    return Blockchain.getStorageAt(IS_ACTIVE_KEY, 0).toU64() == 1;
  }
  private winner(): Address {
    const raw = Blockchain.getStorageAt(WINNER_KEY, 0);
    return Address.fromBytes(raw);
  }
  private totalPot(): u64 {
    return Blockchain.getStorageAt(TOTAL_POT_KEY, 0).toU64();
  }
  private owner(): Address {
    const raw = Blockchain.getStorageAt(OWNER_KEY, 0);
    return Address.fromBytes(raw);
  }
  private prizeClaimed(): bool {
    return Blockchain.getStorageAt(PRIZE_CLAIMED_KEY, 0).toU64() == 1;
  }
  private participantCount(): u64 {
    return Blockchain.getStorageAt(PARTICIPANT_COUNT_KEY, 0).toU64();
  }

  private ticketCountOf(addr: Address): u64 {
    const key = TICKET_COUNT_BASE + addr.toU16Hash();
    return Blockchain.getStorageAt(key, 0).toU64();
  }

  private ticketOwner(ticketId: u64): Address {
    const key = TICKET_OWNER_BASE + (ticketId as u16);
    const raw = Blockchain.getStorageAt(key, 0);
    return Address.fromBytes(raw);
  }

  // ── Constructor / Initialize ─────────────────────────────────────────────

  /**
   * initialize(uint256 ticketPriceSats, uint256 maxTickets, uint256 durationBlocks)
   * Called once by deployer to set up the raffle.
   */
  private initialize(reader: BytesReader): BytesWriter {
    const callerAddr = Blockchain.callerAddress;
    
    // Only owner can initialize (first call sets the owner)
    const storedOwner = this.owner();
    if (!storedOwner.isZero()) {
      // Already initialized - only owner can reinitialize
      if (!callerAddr.equals(storedOwner)) {
        throw new Revert('Only owner');
      }
      // Can only initialize if raffle not active
      if (this.isActive()) {
        throw new Revert('Raffle active');
      }
    }

    const ticketPriceSats = reader.readU256().toU64();
    const maxTix = reader.readU256().toU64();
    const durationBlocks = reader.readU256().toU64();

    assert(ticketPriceSats >= 546, 'Ticket price too low (dust)');
    assert(maxTix > 0 && maxTix <= 10000, 'Max tickets 1-10000');
    assert(durationBlocks > 0 && durationBlocks <= 52560, 'Duration 1-52560 blocks');

    const currentBlock = Blockchain.blockNumber;

    Blockchain.setStorageAt(TICKET_PRICE_KEY, Uint8Array.fromU64(ticketPriceSats));
    Blockchain.setStorageAt(MAX_TICKETS_KEY, Uint8Array.fromU64(maxTix));
    Blockchain.setStorageAt(TOTAL_TICKETS_KEY, Uint8Array.fromU64(0));
    Blockchain.setStorageAt(END_BLOCK_KEY, Uint8Array.fromU64(currentBlock + durationBlocks));
    Blockchain.setStorageAt(IS_ACTIVE_KEY, Uint8Array.fromU64(1));
    Blockchain.setStorageAt(WINNER_KEY, new Uint8Array(32));
    Blockchain.setStorageAt(TOTAL_POT_KEY, Uint8Array.fromU64(0));
    Blockchain.setStorageAt(OWNER_KEY, callerAddr.toBytes());
    Blockchain.setStorageAt(PRIZE_CLAIMED_KEY, Uint8Array.fromU64(0));
    Blockchain.setStorageAt(PARTICIPANT_COUNT_KEY, Uint8Array.fromU64(0));

    const writer = new BytesWriter(1);
    writer.writeBool(true);
    return writer;
  }

  // ── Read: getRaffleInfo ──────────────────────────────────────────────────

  private getRaffleInfo(_reader: BytesReader): BytesWriter {
    const writer = new BytesWriter(6 * 32);
    writer.writeU256(u256.fromU64(this.ticketPrice()));
    writer.writeU256(u256.fromU64(this.totalTickets()));
    writer.writeU256(u256.fromU64(this.maxTickets()));
    writer.writeU256(u256.fromU64(this.endBlock()));
    writer.writeAddress(this.winner());
    writer.writeU256(u256.fromU64(this.isActive() ? 1 : 0));
    return writer;
  }

  // ── Read: getTotalPot ────────────────────────────────────────────────────

  private getTotalPot(_reader: BytesReader): BytesWriter {
    const writer = new BytesWriter(32);
    writer.writeU256(u256.fromU64(this.totalPot()));
    return writer;
  }

  // ── Read: getMyTickets ───────────────────────────────────────────────────

  private getMyTickets(reader: BytesReader): BytesWriter {
    const addr = reader.readAddress();
    const count = this.ticketCountOf(addr);

    const writer = new BytesWriter(32 + count * 32);
    writer.writeU256(u256.fromU64(count));

    // Scan ticket owners to find indices belonging to this address
    const total = this.totalTickets();
    let found: u64 = 0;
    for (let i: u64 = 0; i < total && found < count; i++) {
      const owner = this.ticketOwner(i);
      if (owner.equals(addr)) {
        writer.writeU256(u256.fromU64(i));
        found++;
      }
    }
    return writer;
  }

  // ── Read: getParticipants ────────────────────────────────────────────────

  private getParticipants(_reader: BytesReader): BytesWriter {
    const count = this.participantCount();
    const writer = new BytesWriter(count * 64); // address + ticketCount per participant

    for (let i: u64 = 0; i < count; i++) {
      const key = PARTICIPANT_ADDR_BASE + (i as u16);
      const addrBytes = Blockchain.getStorageAt(key, 0);
      const addr = Address.fromBytes(addrBytes);
      const tix = this.ticketCountOf(addr);
      writer.writeAddress(addr);
      writer.writeU256(u256.fromU64(tix));
    }
    return writer;
  }

  // ── Write: buyTickets ────────────────────────────────────────────────────

  private buyTickets(reader: BytesReader): BytesWriter {
    const numTickets = reader.readU256().toU64();
    const callerAddr = Blockchain.callerAddress;
    const valueSent = Blockchain.callValue; // satoshis sent with this tx

    assert(numTickets > 0, 'Must buy at least 1 ticket');
    assert(numTickets <= 100, 'Max 100 tickets per tx');

    if (!this.isActive()) throw new Revert('Raffle not active');

    const currentBlock = Blockchain.blockNumber;
    if (currentBlock >= this.endBlock()) {
      // Auto-close raffle
      Blockchain.setStorageAt(IS_ACTIVE_KEY, Uint8Array.fromU64(0));
      throw new Revert('Raffle has ended');
    }

    const price = this.ticketPrice();
    const totalCost = SafeMath.mul64(price, numTickets);
    assert(valueSent >= totalCost, 'Insufficient BTC sent');

    const currentTotal = this.totalTickets();
    const max = this.maxTickets();
    assert(currentTotal + numTickets <= max, 'Not enough tickets remaining');

    // Assign ticket IDs
    const newTicketIds: u64[] = [];
    for (let i: u64 = 0; i < numTickets; i++) {
      const ticketId = currentTotal + i;
      const ownerKey = TICKET_OWNER_BASE + (ticketId as u16);
      Blockchain.setStorageAt(ownerKey, callerAddr.toBytes());
      newTicketIds.push(ticketId);
    }

    // Update ticket count for this address
    const prevCount = this.ticketCountOf(callerAddr);
    const countKey = TICKET_COUNT_BASE + callerAddr.toU16Hash();
    Blockchain.setStorageAt(countKey, Uint8Array.fromU64(prevCount + numTickets));

    // If first time buying, add to participant list
    if (prevCount == 0) {
      const pCount = this.participantCount();
      const pKey = PARTICIPANT_ADDR_BASE + (pCount as u16);
      Blockchain.setStorageAt(pKey, callerAddr.toBytes());
      Blockchain.setStorageAt(PARTICIPANT_COUNT_KEY, Uint8Array.fromU64(pCount + 1));
    }

    // Update total tickets sold
    Blockchain.setStorageAt(TOTAL_TICKETS_KEY, Uint8Array.fromU64(currentTotal + numTickets));

    // Update pot (only count exact ticket cost, refund any excess)
    const pot = this.totalPot();
    Blockchain.setStorageAt(TOTAL_POT_KEY, Uint8Array.fromU64(pot + totalCost));

    // Auto-close if sold out
    if (currentTotal + numTickets >= max) {
      Blockchain.setStorageAt(IS_ACTIVE_KEY, Uint8Array.fromU64(0));
    }

    // Refund excess
    if (valueSent > totalCost) {
      const excess = valueSent - totalCost;
      Blockchain.transferBTC(callerAddr, excess);
    }

    emitTicketsPurchased(callerAddr, numTickets, newTicketIds);

    const writer = new BytesWriter(1);
    writer.writeBool(true);
    return writer;
  }

  // ── Write: drawWinner ────────────────────────────────────────────────────

  private drawWinner(_reader: BytesReader): BytesWriter {
    const callerAddr = Blockchain.callerAddress;
    const ownerAddr = this.owner();
    
    if (!callerAddr.equals(ownerAddr)) throw new Revert('Only owner can draw');
    if (this.isActive()) {
      // Check if time is up
      if (Blockchain.blockNumber < this.endBlock()) {
        throw new Revert('Raffle still active');
      }
      // Close raffle
      Blockchain.setStorageAt(IS_ACTIVE_KEY, Uint8Array.fromU64(0));
    }

    const winner = this.winner();
    if (!winner.isZero()) throw new Revert('Winner already drawn');

    const total = this.totalTickets();
    assert(total > 0, 'No tickets sold');

    // Pseudo-random selection using block hash + block number
    // On OP_NET this uses Bitcoin block hash entropy
    const blockHash = Blockchain.blockHash;
    const blockNum = Blockchain.blockNumber;
    const entropy = Blockchain.hash256(blockHash.concat(Uint8Array.fromU64(blockNum)));
    
    // Map entropy to ticket index
    let rand: u64 = 0;
    for (let i = 0; i < 8; i++) {
      rand = (rand << 8) | (entropy[i] as u64);
    }
    const winningTicket = rand % total;

    // Look up winner
    const winnerKey = TICKET_OWNER_BASE + (winningTicket as u16);
    const winnerBytes = Blockchain.getStorageAt(winnerKey, 0);
    const winnerAddr = Address.fromBytes(winnerBytes);

    Blockchain.setStorageAt(WINNER_KEY, winnerAddr.toBytes());

    const pot = this.totalPot();
    emitWinnerDrawn(winnerAddr, winningTicket, pot);

    const writer = new BytesWriter(32);
    writer.writeAddress(winnerAddr);
    return writer;
  }

  // ── Write: claimPrize ────────────────────────────────────────────────────

  private claimPrize(_reader: BytesReader): BytesWriter {
    const callerAddr = Blockchain.callerAddress;
    const winnerAddr = this.winner();

    if (winnerAddr.isZero()) throw new Revert('No winner yet');
    if (!callerAddr.equals(winnerAddr)) throw new Revert('You are not the winner');
    if (this.prizeClaimed()) throw new Revert('Prize already claimed');

    const pot = this.totalPot();
    assert(pot > 0, 'Empty pot');

    // 2% owner fee
    const fee = (pot * FEE_BPS) / BPS_DENOM;
    const prize = pot - fee;

    // Mark as claimed first (reentrancy protection)
    Blockchain.setStorageAt(PRIZE_CLAIMED_KEY, Uint8Array.fromU64(1));

    // Transfer prize to winner
    Blockchain.transferBTC(winnerAddr, prize);

    // Transfer fee to owner
    if (fee > 0) {
      Blockchain.transferBTC(this.owner(), fee);
    }

    emitPrizeClaimed(winnerAddr, prize);

    const writer = new BytesWriter(32);
    writer.writeU256(u256.fromU64(prize));
    return writer;
  }

  // ── Router ───────────────────────────────────────────────────────────────

  public execute(method: Selector, calldata: BytesReader): BytesWriter {
    if (method == SEL_GET_RAFFLE_INFO) return this.getRaffleInfo(calldata);
    if (method == SEL_GET_MY_TICKETS) return this.getMyTickets(calldata);
    if (method == SEL_GET_PARTICIPANTS) return this.getParticipants(calldata);
    if (method == SEL_GET_TOTAL_POT) return this.getTotalPot(calldata);
    if (method == SEL_BUY_TICKETS) return this.buyTickets(calldata);
    if (method == SEL_DRAW_WINNER) return this.drawWinner(calldata);
    if (method == SEL_CLAIM_PRIZE) return this.claimPrize(calldata);
    if (method == SEL_INITIALIZE) return this.initialize(calldata);
    throw new Revert('Unknown method');
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

const contract = new BtcRaffle();

export function main(calldata: Uint8Array): Uint8Array {
  const reader = new BytesReader(calldata);
  const selector = reader.readSelector();
  const result = contract.execute(selector, reader);
  return result.getBuffer();
}

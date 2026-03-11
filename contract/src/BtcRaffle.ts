import {
  OP20,
  Address,
  Blockchain,
  BytesWriter,
  BytesReader,
  SafeMath,
  StoredU256,
  StoredString,
  StoredBoolean,
  Map,
  encodeSelector,
  Revert,
} from '@btc-vision/btc-runtime/runtime';

// ─────────────────────────────────────────────────────────────────────────────
//  BTC Raffle Smart Contract
//  Deployed on OP_NET Bitcoin Layer 1
//
//  Flow:
//    1. Owner deploys with ticketPrice (sats) and maxTickets
//    2. Users call buyTicket(quantity) — each ticket is sequential ID
//    3. Owner calls drawWinner() after raffle closes
//    4. Winner is selected via on-chain pseudo-randomness (block hash + entropy)
// ─────────────────────────────────────────────────────────────────────────────

const SELECTOR_GET_RAFFLE_INFO = encodeSelector('getRaffleInfo()');
const SELECTOR_GET_WINNER      = encodeSelector('getWinner()');
const SELECTOR_GET_MY_TICKETS  = encodeSelector('getMyTickets(address)');
const SELECTOR_BUY_TICKET      = encodeSelector('buyTicket(uint256)');
const SELECTOR_DRAW_WINNER     = encodeSelector('drawWinner()');

@contract
export class BtcRaffle {
  // ── Storage slots ─────────────────────────────────────────────────────
  private ticketPrice:  StoredU256  = new StoredU256(Uint8Array.wrap(String.UTF8.encode('ticketPrice')), u256.Zero);
  private maxTickets:   StoredU256  = new StoredU256(Uint8Array.wrap(String.UTF8.encode('maxTickets')),  u256.Zero);
  private ticketsSold:  StoredU256  = new StoredU256(Uint8Array.wrap(String.UTF8.encode('ticketsSold')), u256.Zero);
  private prizePool:    StoredU256  = new StoredU256(Uint8Array.wrap(String.UTF8.encode('prizePool')),   u256.Zero);
  private isActive:     StoredBoolean = new StoredBoolean(Uint8Array.wrap(String.UTF8.encode('isActive')), false);
  private drawTime:     StoredU256  = new StoredU256(Uint8Array.wrap(String.UTF8.encode('drawTime')),    u256.Zero);
  private winner:       StoredString = new StoredString(Uint8Array.wrap(String.UTF8.encode('winner')),   '');
  private owner:        StoredString = new StoredString(Uint8Array.wrap(String.UTF8.encode('owner')),    '');

  // ticketId → holder address
  private ticketHolders: Map<u256, string> = new Map<u256, string>(
    Uint8Array.wrap(String.UTF8.encode('ticketHolders'))
  );

  // holder address → comma-separated ticket ids
  private holderTickets: Map<string, string> = new Map<string, string>(
    Uint8Array.wrap(String.UTF8.encode('holderTickets'))
  );

  // ── Constructor ────────────────────────────────────────────────────────
  constructor() {}

  // Called once on deploy
  public onDeploy(calldata: BytesReader): void {
    const price = calldata.readU256();   // satoshis per ticket
    const max   = calldata.readU256();   // max tickets

    assert(price > u256.Zero, 'ticketPrice must be > 0');
    assert(max   > u256.Zero, 'maxTickets must be > 0');

    this.ticketPrice.value  = price;
    this.maxTickets.value   = max;
    this.ticketsSold.value  = u256.Zero;
    this.prizePool.value    = u256.Zero;
    this.isActive.value     = true;
    this.drawTime.value     = u256.Zero;
    this.winner.value       = '';
    this.owner.value        = Blockchain.sender;
  }

  // ── Entry point (dispatcher) ───────────────────────────────────────────
  public execute(calldata: BytesReader): BytesWriter {
    const selector = calldata.readSelector();

    if (selector === SELECTOR_GET_RAFFLE_INFO) return this._getRaffleInfo();
    if (selector === SELECTOR_GET_WINNER)      return this._getWinner();
    if (selector === SELECTOR_GET_MY_TICKETS)  return this._getMyTickets(calldata);
    if (selector === SELECTOR_BUY_TICKET)      return this._buyTicket(calldata);
    if (selector === SELECTOR_DRAW_WINNER)     return this._drawWinner();

    throw new Revert('Unknown selector');
  }

  // ── View: getRaffleInfo ────────────────────────────────────────────────
  private _getRaffleInfo(): BytesWriter {
    const w = new BytesWriter();
    w.writeU256(this.ticketPrice.value);
    w.writeU256(this.maxTickets.value);
    w.writeU256(this.ticketsSold.value);
    w.writeU256(this.prizePool.value);
    w.writeBoolean(this.isActive.value);
    w.writeU256(this.drawTime.value);
    return w;
  }

  // ── View: getWinner ────────────────────────────────────────────────────
  private _getWinner(): BytesWriter {
    const w = new BytesWriter();
    w.writeString(this.winner.value);
    return w;
  }

  // ── View: getMyTickets ─────────────────────────────────────────────────
  private _getMyTickets(calldata: BytesReader): BytesWriter {
    const participant = calldata.readAddress();
    const stored = this.holderTickets.get(participant) ?? '';
    const w = new BytesWriter();
    w.writeString(stored);
    return w;
  }

  // ── Write: buyTicket ───────────────────────────────────────────────────
  private _buyTicket(calldata: BytesReader): BytesWriter {
    const quantity = calldata.readU256();
    const sender   = Blockchain.sender;

    assert(this.isActive.value, 'Raffle is not active');
    assert(quantity > u256.Zero, 'Quantity must be > 0');

    const currentSold = this.ticketsSold.value;
    const max         = this.maxTickets.value;
    const remaining   = SafeMath.sub(max, currentSold);
    assert(quantity <= remaining, 'Not enough tickets remaining');

    // Verify attached BTC payment
    const required = SafeMath.mul(this.ticketPrice.value, quantity);
    const attached = Blockchain.value; // satoshis sent with tx
    assert(attached >= required, 'Insufficient BTC sent');

    // Assign ticket IDs
    const existingIds = this.holderTickets.get(sender) ?? '';
    let updatedIds = existingIds;

    for (let i = u256.Zero; i < quantity; i = SafeMath.add(i, u256.One)) {
      const ticketId = SafeMath.add(currentSold, i);
      this.ticketHolders.set(ticketId, sender);
      if (updatedIds.length > 0) {
        updatedIds = updatedIds + ',' + ticketId.toString();
      } else {
        updatedIds = ticketId.toString();
      }
    }

    this.holderTickets.set(sender, updatedIds);
    this.ticketsSold.value = SafeMath.add(currentSold, quantity);
    this.prizePool.value   = SafeMath.add(this.prizePool.value, attached);

    // Auto-close if all tickets sold
    if (this.ticketsSold.value >= max) {
      this.isActive.value = false;
    }

    const w = new BytesWriter();
    w.writeBoolean(true);
    return w;
  }

  // ── Write: drawWinner (owner only) ────────────────────────────────────
  private _drawWinner(): BytesWriter {
    assert(Blockchain.sender === this.owner.value, 'Only owner can draw');
    assert(!this.isActive.value || this.ticketsSold.value > u256.Zero, 'No tickets sold');
    assert(this.winner.value === '', 'Winner already drawn');

    const sold = this.ticketsSold.value;
    assert(sold > u256.Zero, 'No participants');

    // On-chain pseudo-randomness: combine block hash + sold count + sender
    // NOTE: For production use a VRF or commit-reveal scheme
    const blockHash  = Blockchain.blockHash;
    const entropy    = SafeMath.add(blockHash, sold);
    const winnerIdx  = SafeMath.mod(entropy, sold);

    const winnerAddr = this.ticketHolders.get(winnerIdx) ?? '';
    assert(winnerAddr !== '', 'Could not determine winner');

    this.winner.value   = winnerAddr;
    this.isActive.value = false;
    this.drawTime.value = Blockchain.blockNumber;

    // Emit a log event
    Blockchain.log('WinnerDrawn:' + winnerAddr);

    const w = new BytesWriter();
    w.writeString(winnerAddr);
    return w;
  }
}

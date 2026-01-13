import { v4 as uuidv4 } from 'uuid';
import type { GameState, CardInstance, PlayerState, LeaderCard, BoardCard } from './types';
import { logger } from '../utils/logger';

export const createInitialGameState = (p1Deck: any, p2Deck: any, roomName: string): GameState => {
  const setupPlayer = (deck: any, playerId: string, name: string): PlayerState => {
    const leaderRaw = (deck?.leader && Array.isArray(deck.leader) ? deck.leader[0] : deck?.leader) || 
                      (deck?.cards && deck.cards.find((c: any) => (c.type || '').toUpperCase() === 'LEADER'));
    
    const leader: LeaderCard = {
      name: "Unknown Leader",
      power: 5000,
      ...leaderRaw,
      card_id: leaderRaw?.card_id || leaderRaw?.number || leaderRaw?.id || "LEADER",
      uuid: uuidv4(),
      owner_id: playerId,
      is_rest: false,
      attached_don: 0,
      type: "LEADER"
    };

    const mainCards = (deck?.cards || [])
      .filter((c: any) => (c.type || '').toUpperCase() !== 'LEADER')
      .map((c: any) => ({
        ...c,
        card_id: c.card_id || c.number || c.id,
        uuid: uuidv4(),
        owner_id: playerId,
        is_rest: false,
        attached_don: 0,
        is_face_up: true
      }));

    const shuffled = [...mainCards].sort(() => Math.random() - 0.5);

    return {
      player_id: playerId,
      name: name,
      leader: leader,
      stage: null,
      zones: {
        field: [],
        hand: shuffled.slice(0, 5),
        life: shuffled.slice(5, 10),
        trash: [],
        deck: shuffled.slice(10),
        don_deck: Array.from({ length: 10 }, () => ({
          uuid: uuidv4(), card_id: "DON", owner_id: playerId, name: "DON!!", type: "DON", is_rest: false, is_face_up: true
        }))
      },
      don_count: 0,
      active_don: 0,
      don_active: [],
      don_rested: [],
      don_attached: [],
      don_deck_count: 10
    };
  };

  const state: GameState = {
    game_id: `local-${uuidv4()}`,
    room_name: roomName,
    status: 'PLAYING',
    players: {
      p1: setupPlayer(p1Deck, 'p1', 'Player 1'),
      p2: setupPlayer(p2Deck, 'p2', 'Player 2')
    },
    turn_info: { turn_count: 1, active_player_id: 'p1', current_phase: 'MAIN', winner: null }
  };

  logger.log({
    level: 'info',
    action: 'local.init_game',
    msg: 'Local game state initialized',
    payload: { gameId: state.game_id }
  });

  return state;
};

export const moveCardLocal = (state: GameState, cardUuid: string, destPid: 'p1' | 'p2', destZone: string, index: number = -1): GameState => {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  let targetCard: CardInstance | null = null;

  for (const pid of ['p1', 'p2'] as const) {
    const p = newState.players[pid];
    if (p.leader?.uuid === cardUuid) { targetCard = p.leader; p.leader = null; break; }
    if (p.stage?.uuid === cardUuid) { targetCard = p.stage; p.stage = null; break; }
    
    for (const [_, zoneArray] of Object.entries(p.zones)) {
      if (!Array.isArray(zoneArray)) continue;
      const idx = zoneArray.findIndex((c: CardInstance) => c.uuid === cardUuid);
      if (idx !== -1) { targetCard = zoneArray.splice(idx, 1)[0]; break; }
    }

    const donKeys = ['don_active', 'don_rested', 'don_attached'] as const;
    for (const key of donKeys) {
      const idx = p[key].findIndex(c => c.uuid === cardUuid);
      if (idx !== -1) { targetCard = p[key].splice(idx, 1)[0]; break; }
    }
    if (targetCard) break;
  }

  if (!targetCard) return state;

  const destPlayer = newState.players[destPid];
  if (destZone === 'leader') { destPlayer.leader = targetCard as LeaderCard; }
  else if (destZone === 'stage') { destPlayer.stage = targetCard as BoardCard; }
  else if (['don_active', 'don_rested'].includes(destZone)) { (destPlayer as any)[destZone].push(targetCard); }
  else {
    const zone = (destPlayer.zones as any)[destZone];
    if (Array.isArray(zone)) {
      if (index === -1) zone.push(targetCard);
      else zone.splice(index, 0, targetCard);
    }
  }

  logger.log({ 
    level: 'info', 
    action: 'local.move_card', 
    msg: `Moved ${targetCard.name} to ${destPid}.${destZone}`,
    payload: { cardUuid, destPid, destZone }
  });

  return newState;
};

export const toggleRestLocal = (state: GameState, cardUuid: string): GameState => {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  
  for (const pid of ['p1', 'p2'] as const) {
    const p = newState.players[pid];
    if (p.leader?.uuid === cardUuid) { p.leader.is_rest = !p.leader.is_rest; break; }
    if (p.stage?.uuid === cardUuid) { p.stage.is_rest = !p.stage.is_rest; break; }
    const fieldIdx = p.zones.field.findIndex(c => c.uuid === cardUuid);
    if (fieldIdx !== -1) { p.zones.field[fieldIdx].is_rest = !p.zones.field[fieldIdx].is_rest; break; }
    const activeDonIdx = p.don_active.findIndex(c => c.uuid === cardUuid);
    if (activeDonIdx !== -1) { const card = p.don_active.splice(activeDonIdx, 1)[0]; card.is_rest = true; p.don_rested.push(card); break; }
    const restedDonIdx = p.don_rested.findIndex(c => c.uuid === cardUuid);
    if (restedDonIdx !== -1) { const card = p.don_rested.splice(restedDonIdx, 1)[0]; card.is_rest = false; p.don_active.push(card); break; }
  }

  return newState;
};

export const resolveTurnEndLocal = (state: GameState): GameState => {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const nextPid = newState.turn_info.active_player_id === 'p1' ? 'p2' : 'p1';
  const nextPlayer = newState.players[nextPid];

  if (nextPlayer.leader) { nextPlayer.leader.is_rest = false; nextPlayer.leader.attached_don = 0; }
  if (nextPlayer.stage) { nextPlayer.stage.is_rest = false; }
  nextPlayer.zones.field.forEach(c => { c.is_rest = false; c.attached_don = 0; });

  nextPlayer.don_active.push(...nextPlayer.don_rested);
  nextPlayer.don_rested = [];
  nextPlayer.don_active.push(...nextPlayer.don_attached);
  nextPlayer.don_attached = [];
  nextPlayer.don_active.forEach(d => d.is_rest = false);

  if (nextPlayer.zones.deck.length > 0) {
    const card = nextPlayer.zones.deck.shift();
    if (card) nextPlayer.zones.hand.push(card);
  }

  const currentDonCount = nextPlayer.don_active.length;
  const donToAdd = Math.min(2, 10 - currentDonCount);
  if (donToAdd > 0 && nextPlayer.zones.don_deck) {
    for (let i = 0; i < donToAdd; i++) {
      if (nextPlayer.zones.don_deck.length > 0) {
        const don = nextPlayer.zones.don_deck.shift();
        if (don) { don.is_rest = false; nextPlayer.don_active.push(don); }
      }
    }
  }

  newState.turn_info.active_player_id = nextPid;
  newState.turn_info.turn_count += 1;
  newState.turn_info.current_phase = 'MAIN';

  logger.log({
    level: 'info',
    action: 'local.turn_end',
    msg: `Turn passed to ${nextPid}`,
    payload: { turn: newState.turn_info.turn_count }
  });

  return newState;
};

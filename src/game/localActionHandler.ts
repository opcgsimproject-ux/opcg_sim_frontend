import type { GameState } from './types';
import { moveCardLocal, toggleRestLocal, createInitialGameState } from './localLogic';
import { logger } from '../utils/logger';

export const handleLocalAction = (state: GameState, actionType: string, params: any): GameState => {
  logger.log({
    level: 'info',
    action: `local_action.${actionType}`,
    msg: `Processing local action: ${actionType}`,
    payload: params
  });

  const newState = JSON.parse(JSON.stringify(state)) as GameState;

  switch (actionType) {
    case 'SET_DECK':
      newState.players[params.player_id as 'p1' | 'p2'].name = params.deck_id;
      return newState;

    case 'READY':
      if (!newState.ready_states) newState.ready_states = { p1: false, p2: false };
      const pid = params.player_id as 'p1' | 'p2';
      newState.ready_states[pid] = !newState.ready_states[pid];
      return newState;

    case 'START':
      return createInitialGameState({ leader: [], cards: [] }, { leader: [], cards: [] }, state.room_name || 'local');

    case 'MOVE_CARD':
      return moveCardLocal(
        state,
        params.card_uuid,
        params.dest_player_id as 'p1' | 'p2',
        params.dest_zone,
        params.index
      );

    case 'TOGGLE_REST':
      return toggleRestLocal(state, params.card_uuid);

    case 'RESET':
      return createInitialGameState({ leader: [], cards: [] }, { leader: [], cards: [] }, state.room_name || 'local-room');

    default:
      logger.warn('local_action.unknown', `Action ${actionType} is not implemented locally.`);
      return state;
  }
};

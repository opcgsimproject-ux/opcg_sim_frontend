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

  switch (actionType) {
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
      return createInitialGameState(null, null, state.room_name || 'local-room');
    default:
      logger.warn('local_action.unknown', `Action ${actionType} is not implemented locally.`);
      return state;
  }
};

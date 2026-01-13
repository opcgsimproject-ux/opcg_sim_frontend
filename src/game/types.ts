export interface BaseCard {
  uuid: string;
  card_id: string;
  owner_id: string;
  name: string;
  type: string;
  is_rest: boolean;
  power?: number;
  counter?: number;
  cost?: number;
  attribute?: string;
  attached_don?: number;
  // ▼ 追加 ▼
  is_face_up?: boolean;
}

export interface LeaderCard extends BaseCard {
  type: 'LEADER' | 'リーダー';
  life?: number; // ← 追加
}

export interface CharacterCard extends BaseCard {
  type: 'CHARACTER' | 'キャラクター';
}

export interface EventCard extends BaseCard {
  type: 'EVENT' | 'イベント';
}

export interface StageCard extends BaseCard {
  type: 'STAGE' | 'ステージ';
}

export interface DonCard extends BaseCard {
  type: 'DON' | 'ドン!!';
}

export type CardInstance = LeaderCard | CharacterCard | EventCard | StageCard | DonCard;
// または単純に:
// export type CardInstance = BaseCard & { life?: number }; 
// とすることで汎用的に扱うことも可能です

export type BoardCard = CharacterCard | StageCard; // フィールドに出せるカード

export interface ZoneState {
  field: CardInstance[];
  hand: CardInstance[];
  life: CardInstance[];
  trash: CardInstance[];
  deck: CardInstance[];
  don_deck: CardInstance[];
}

export interface PlayerState {
  player_id: string;
  name: string;
  leader: LeaderCard | null;
  stage: BoardCard | null; // StageCard | null から変更または統合
  zones: ZoneState;
  don_count: number;
  active_don: number;
  don_active: CardInstance[];
  don_rested: CardInstance[];
  don_attached: CardInstance[];
  don_deck_count: number;
}

export interface GameState {
  game_id: string;
  room_name: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  players: {
    p1: PlayerState;
    p2: PlayerState;
  };
  turn_info: {
    turn_count: number;
    active_player_id: 'p1' | 'p2';
    current_phase: 'MAIN' | 'REFRESH' | 'DRAW' | 'DON' | 'END' | 'SETUP';
    winner: string | null;
  };
  ready_states?: { p1: boolean; p2: boolean };
}

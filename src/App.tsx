import { Component, useState, useEffect, useCallback } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RealGame } from './screens/RealGame';
import { SandboxGame } from './screens/SandboxGame';
import GameStart from './ui/GameStart';
import { DeckBuilder } from './screens/DeckBuilder';
import { RoomLobby } from './screens/RoomLobby';
import { DeckSelectModal, DeckOption } from './ui/DeckSelectModal';
import { API_CONFIG } from './api/api.config';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#330000', color: '#ffaaaa', height: '100vh', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h2 style={{ color: '#ff5555' }}>⚠️ RENDER ERROR</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// ローカルデッキ取得関数
const getLocalDecks = (): any[] => {
  try {
    const ids = JSON.parse(localStorage.getItem('opcg_local_deck_ids') || '[]');
    return ids.map((id: string) => {
      const data = localStorage.getItem(`opcg_deck_${id}`);
      return data ? JSON.parse(data) : null;
    }).filter((d: any) => d !== null);
  } catch (e) { return []; }
};

export default function App() {
  const [mode, setMode] = useState<'start' | 'game' | 'deck' | 'sandbox' | 'cardList' | 'lobby'>('start');
  const [selectedDecks, setSelectedDecks] = useState<{ p1: string; p2: string }>({ p1: 'imu.json', p2: 'nami.json' });
  const [sandboxOptions, setSandboxOptions] = useState<{ role: 'both' | 'p1' | 'p2', gameId?: string, room_name?: string }>({ role: 'both' });

  // デッキ選択用State
  const [availableDecks, setAvailableDecks] = useState<any[]>([]);
  const [showDeckSelect, setShowDeckSelect] = useState<'p1' | 'p2' | null>(null);
  const [pendingGameStart, setPendingGameStart] = useState<{ mode: 'normal' | 'sandbox', options?: any } | null>(null);

  // デッキ読み込みとマージ処理（重複排除のキモ）
  const loadDecks = useCallback(async () => {
    let serverDecks: any[] = [];
    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/deck/list`);
      const data = await res.json();
      if (data.success && Array.isArray(data.decks)) {
        serverDecks = data.decks;
      }
    } catch (e) {
      console.error("Failed to load server decks", e);
    }

    const localDecks = getLocalDecks();

    // ★重要: IDによる重複排除ロジック
    // サーバーのデッキをベースにする
    const merged = [...serverDecks];
    const serverIds = new Set(serverDecks.map(d => d.id));

    localDecks.forEach(ld => {
      // サーバーに存在しないID（local-XXX など）のみ追加する
      // これにより「サーバーにあるのにローカルキャッシュも表示される」を防ぐ
      if (!ld.id || !serverIds.has(ld.id)) {
        merged.push(ld);
      }
    });

    // 日付順などでソートしたい場合はここで行う
    // merged.sort(...)

    setAvailableDecks(merged);
  }, []);

  // アプリ起動時にデッキ一覧を裏で読み込んでおく
  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const handleStart = (p1: string, p2: string, gameMode: 'normal' | 'sandbox' = 'normal', sbOptions?: any) => {
    // デッキが指定されていない場合、デッキ選択フローを開始する
    if (!p1 || !p2) {
      // 再度最新リストを取得
      loadDecks(); 
      setPendingGameStart({ mode: gameMode, options: sbOptions });
      setShowDeckSelect('p1'); // まずP1から選択
      return;
    }

    setSelectedDecks({ p1, p2 });
    if (gameMode === 'sandbox') {
        setSandboxOptions(sbOptions || { role: 'both' });
        setMode('sandbox');
    } else {
        setMode('game');
    }
  };

  const handleDeckSelect = (deckId: string) => {
    if (showDeckSelect === 'p1') {
      setSelectedDecks(prev => ({ ...prev, p1: deckId }));
      // P1を選んだら次はP2選択へ（CPU戦や1人回しの場合はここで分岐も可能）
      // 今回はシンプルにP2選択へ進む
      setShowDeckSelect('p2');
    } else if (showDeckSelect === 'p2') {
      const p1Deck = selectedDecks.p1;
      const p2Deck = deckId;
      setShowDeckSelect(null);
      
      // 選択完了、ゲーム開始
      if (pendingGameStart) {
        handleStart(p1Deck, p2Deck, pendingGameStart.mode, pendingGameStart.options);
        setPendingGameStart(null);
      }
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#1a1a1a', overflow: 'hidden', position: 'fixed', top: 0, left: 0, touchAction: 'none' }}>
      <ErrorBoundary>
        {mode === 'start' && (
          <GameStart onStart={handleStart} onDeckBuilder={() => setMode('deck')} onCardList={() => setMode('cardList')} onLobby={() => setMode('lobby')} />
        )}
        {mode === 'game' && (
          <RealGame p1Deck={selectedDecks.p1} p2Deck={selectedDecks.p2} onBack={() => { if (confirm("終了しますか？")) setMode('start'); }} />
        )}
        {mode === 'sandbox' && (
          <SandboxGame 
            myPlayerId={sandboxOptions.role === 'both' ? 'both' : sandboxOptions.role} 
            gameId={sandboxOptions.gameId} 
            roomName={sandboxOptions.room_name} 
            onBack={() => { if (confirm("終了しますか？")) setMode('start'); }} 
          />
        )}
        {(mode === 'deck' || mode === 'cardList') && (
          <DeckBuilder onBack={() => setMode('start')} viewOnly={mode === 'cardList'} />
        )}
        {mode === 'lobby' && (
          <RoomLobby onBack={() => setMode('start')} onJoin={(gameId) => handleStart(selectedDecks.p1, selectedDecks.p2, 'sandbox', { role: 'p2', gameId })} />
        )}

        {/* デッキ選択モーダルの表示 */}
        {showDeckSelect && (
          <DeckSelectModal
            title={showDeckSelect === 'p1' ? "Player 1 Deck Select" : "Player 2 Deck Select"}
            options={availableDecks.map(d => ({
              id: d.id,
              name: d.name,
              leaderId: d.leader_id
            }))}
            onSelect={handleDeckSelect}
            onClose={() => setShowDeckSelect(null)}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}

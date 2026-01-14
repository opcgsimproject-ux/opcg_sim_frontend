import React, { useState, useEffect, useMemo } from 'react';
import { API_CONFIG } from '../api/api.config';
import './GameUI.css'; 
import { prefetchAllCardImages } from '../utils/imageAssets';

interface DeckOption {
  id: string;
  name: string;
}

interface GameStartProps {
  onStart: (
    p1: string, 
    p2: string, 
    mode?: 'normal' | 'sandbox', 
    sandboxOptions?: { role: 'both' | 'p1' | 'p2', room_name?: string, gameId?: string }
  ) => void;
  onDeckBuilder: () => void;
  onCardList: () => void;
  onLobby: () => void;
}

const GameStart: React.FC<GameStartProps> = ({ onStart, onDeckBuilder, onCardList, onLobby }) => {
  const [deckOptions, setDeckOptions] = useState<DeckOption[]>([]);
  const [p1Deck, setP1Deck] = useState('imu.json');
  const [p2Deck, setP2Deck] = useState('nami.json');
  const [roomName, setRoomName] = useState('');
  const [showRoomCreateModal, setShowRoomCreateModal] = useState(false);
  // ▼ 追加: CPU設定画面の表示フラグ
  const [showCpuSetup, setShowCpuSetup] = useState(false);
  
  const [downloadProgress, setDownloadProgress] = useState<{current: number, total: number} | null>(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/api/deck/list`);
        const data = await res.json();
        
        const defaults = [
          { id: 'imu.json', name: 'Imu (Default)' },
          { id: 'nami.json', name: 'Nami (Default)' }
        ];

        let loadedDecks: DeckOption[] = [];
        if (data.success && Array.isArray(data.decks)) {
          loadedDecks = data.decks.map((d: any) => ({
            id: `db:${d.id}`,
            name: d.name
          }));
        }
        
        setDeckOptions([...defaults, ...loadedDecks]);
      } catch (e) {
        console.error("Failed to load decks", e);
        setDeckOptions([
          { id: 'imu.json', name: 'Imu (Default)' },
          { id: 'nami.json', name: 'Nami (Default)' }
        ]);
      }
    };
    fetchDecks();
  }, []);

  const handleCacheImages = async () => {
    if (!confirm("全てのカード画像をダウンロードしますか？\n(初回のみ通信量が発生します。Wi-Fi推奨)")) return;
    
    try {
      setDownloadProgress({ current: 0, total: 0 });
      
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/cards`);
      const data = await res.json();
      
      if (data.success && Array.isArray(data.cards)) {
        setDownloadProgress({ current: 0, total: data.cards.length });
        
        await prefetchAllCardImages(data.cards, (current, total) => {
          setDownloadProgress({ current, total });
        });
        
        alert("画像のダウンロードが完了しました。\nオフラインでも快適に動作します。");
      }
    } catch (e) {
      console.error(e);
      alert("カードリストの取得に失敗しました");
    } finally {
      setDownloadProgress(null);
    }
  };

  const styles = useMemo(() => ({
    container: {
      minHeight: '100vh', width: '100%', background: 'radial-gradient(circle at center, #3e2723 0%, #1a0b0b 100%)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', color: '#f0e6d2', fontFamily: '"Times New Roman", "YuMincho", "Hiragino Mincho ProN", serif', position: 'relative' as const, overflowX: 'hidden' as const, padding: '20px', boxSizing: 'border-box' as const
    },
    bgOverlay: {
      position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 20px)', pointerEvents: 'none' as const, zIndex: 0
    },
    title: {
      fontSize: isMobile ? '40px' : '60px', 
      fontWeight: '900', 
      marginBottom: '30px', 
      marginTop: '80px',
      background: 'linear-gradient(to bottom, #ffd700, #b8860b, #8b4513)', 
      WebkitBackgroundClip: 'text', 
      WebkitTextFillColor: 'transparent', 
      filter: 'drop-shadow(0 4px 0px rgba(0,0,0,0.8))', 
      letterSpacing: '4px', 
      zIndex: 1, 
      textTransform: 'uppercase' as const, 
      textAlign: 'center' as const
    },
    mainGrid: {
      display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', width: '100%', maxWidth: '800px', zIndex: 1, marginBottom: '40px'
    },
    primaryCard: {
      background: 'linear-gradient(135deg, #f4e4bc 0%, #e1cf9e 100%)', border: '4px solid #5d4037', borderRadius: '12px', padding: '30px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', boxShadow: '0 8px 25px rgba(0,0,0,0.5)'
    },
    cardTitle: { fontSize: '24px', fontWeight: 'bold', color: '#3e2723', textAlign: 'center' as const },
    cardDesc: { fontSize: '14px', color: '#5d4037', textAlign: 'center' as const, opacity: 0.8 },
    secondaryActions: {
      display: 'flex', flexWrap: 'wrap' as const, gap: '10px', justifyContent: 'center', width: '100%', maxWidth: '800px', zIndex: 1, 
      marginBottom: '15px'
    },
    subBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid #d4af37', color: '#d4af37', padding: '10px 20px', fontSize: '14px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', fontFamily: 'inherit' },
    
    testSection: {
      width: '100%', maxWidth: '500px', background: 'rgba(0,0,0,0.4)', border: '1px dashed #5d4037', borderRadius: '8px', padding: '20px', zIndex: 1, marginTop: '20px', display: 'flex', flexDirection: 'column' as const, gap: '15px'
    },
    testLabel: { fontSize: '12px', fontWeight: 'bold', color: '#8b4513', textTransform: 'uppercase' as const, textAlign: 'center' as const, marginBottom: '5px' },
    // deckRow は不要になったため削除
    smallSelect: { flex: 1, padding: '12px', background: '#2a1a1a', color: '#f0e6d2', border: '1px solid #5d4037', borderRadius: '4px', fontSize: '14px' },
    testBtn: { width: '100%', background: '#5d4037', color: '#f0e6d2', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },

    topRightArea: {
      position: 'absolute' as const, top: '15px', right: '15px', zIndex: 10,
      display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end'
    },
    dlBtn: {
      background: 'rgba(0, 0, 0, 0.4)', border: '1px solid #555', color: '#888',
      fontSize: '11px', padding: '6px 12px', borderRadius: '20px',
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '5px'
    },
    // ▼ 追加: CPU設定画面用のスタイル
    cpuOverlay: {
      position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(5px)'
    },
    cpuPanel: {
      background: '#2c3e50', padding: '30px', borderRadius: '12px',
      border: '2px solid #7f8c8d', width: '90%', maxWidth: '500px',
      display: 'flex', flexDirection: 'column' as const, gap: '20px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    },
    cpuTitle: {
      color: '#f1c40f', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' as const,
      borderBottom: '1px solid #7f8c8d', paddingBottom: '10px', marginBottom: '10px'
    }
  }), [isMobile]);

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay}></div>
      
      <div style={styles.topRightArea}>
        <button 
          onClick={handleCacheImages} 
          disabled={!!downloadProgress}
          style={styles.dlBtn}
          onMouseOver={(e) => e.currentTarget.style.color = '#ccc'}
          onMouseOut={(e) => e.currentTarget.style.color = '#888'}
          title="全てのカード画像をダウンロードしてキャッシュします"
        >
          {downloadProgress ? (
            <>
              <span style={{ width: '10px', height: '10px', border: '2px solid #888', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
              {`DL中: ${Math.floor((downloadProgress.current / downloadProgress.total) * 100)}%`}
            </>
          ) : (
            <>
              <span>📥</span> 画像一括DL
            </>
          )}
        </button>
      </div>

      <div style={styles.title}>OPCG SIM</div>

      <div style={styles.mainGrid}>
        <div style={styles.primaryCard} className="hover-scale" onClick={() => onStart(p1Deck, p2Deck, 'sandbox', { role: 'both' })}>
          <div style={styles.cardTitle}>1人回し</div>
          <div style={styles.cardDesc}>Sandbox Mode / Solo Play</div>
        </div>
        <div style={styles.primaryCard} className="hover-scale" onClick={onDeckBuilder}>
          <div style={styles.cardTitle}>デッキ作成</div>
          <div style={styles.cardDesc}>Deck Builder</div>
        </div>
      </div>

      <div style={styles.secondaryActions}>
        <button onClick={() => setShowRoomCreateModal(true)} style={{ ...styles.subBtn, borderColor: '#3498db', color: '#3498db' }} className="hover-scale">ルーム作成</button>
        <button onClick={onLobby} style={{ ...styles.subBtn, borderColor: '#3498db', color: '#3498db' }} className="hover-scale">部屋に参加</button>
        <button onClick={onCardList} style={{ ...styles.subBtn, borderColor: '#e67e22', color: '#e67e22' }} className="hover-scale">カードリスト</button>
      </div>

      <div style={styles.testSection}>
        <div style={styles.testLabel}>Experimental / Test Features</div>
        {/* ▼ 修正: デッキ選択を削除し、遷移ボタンのみにする */}
        <button onClick={() => setShowCpuSetup(true)} style={styles.testBtn} className="hover-scale">
          VS CPU Mode (Rule Enforced)
        </button>
      </div>

      {/* ▼ 追加: CPU対戦設定モーダル */}
      {showCpuSetup && (
        <div style={styles.cpuOverlay}>
          <div style={styles.cpuPanel}>
            <div style={styles.cpuTitle}>VS CPU SETUP</div>
            
            <div>
              <label style={{display:'block', color:'#bdc3c7', fontSize:'12px', marginBottom:'5px'}}>Player 1 (あなた)</label>
              <select value={p1Deck} onChange={(e) => setP1Deck(e.target.value)} style={styles.smallSelect}>
                {deckOptions.map(opt => <option key={`p1-${opt.id}`} value={opt.id}>{opt.name}</option>)}
              </select>
            </div>

            <div style={{textAlign:'center', color:'#95a5a6', fontStyle:'italic'}}>VS</div>

            <div>
              <label style={{display:'block', color:'#bdc3c7', fontSize:'12px', marginBottom:'5px'}}>Player 2 (CPU)</label>
              <select value={p2Deck} onChange={(e) => setP2Deck(e.target.value)} style={styles.smallSelect}>
                {deckOptions.map(opt => <option key={`p2-${opt.id}`} value={opt.id}>{opt.name}</option>)}
              </select>
            </div>

            <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
              <button onClick={() => setShowCpuSetup(false)} style={{...styles.subBtn, flex:1, borderColor:'#95a5a6', color:'#95a5a6'}}>キャンセル</button>
              <button onClick={() => onStart(p1Deck, p2Deck, 'normal')} style={{...styles.testBtn, flex:1, background:'#e67e22', border:'none'}}>GAME START</button>
            </div>
          </div>
        </div>
      )}

      {showRoomCreateModal && (
        <div className="ui-overlay" style={{ zIndex: 2000 }}>
          <div className="action-menu" style={{ maxWidth: '400px' }}>
            <h3 className="menu-title">新規ルーム作成</h3>
            <div style={{ padding: '10px 0' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', textAlign: 'left', marginBottom: '5px' }}>部屋名</label>
              <input 
                type="text" 
                value={roomName} 
                onChange={(e) => setRoomName(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', boxSizing: 'border-box' }}
                autoFocus
                placeholder="部屋名を入力"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && roomName.trim()) {
                        onStart(p1Deck, p2Deck, 'sandbox', { role: 'p1', room_name: roomName });
                    }
                }}
              />
            </div>
            <div className="menu-buttons" style={{ marginTop: '20px' }}>
              <button 
                className="menu-btn primary" 
                disabled={!roomName.trim()}
                onClick={() => onStart(p1Deck, p2Deck, 'sandbox', { role: 'p1', room_name: roomName })}
              >
                作成して開始
              </button>
              <button className="menu-btn cancel" onClick={() => setShowRoomCreateModal(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
};

export default GameStart;

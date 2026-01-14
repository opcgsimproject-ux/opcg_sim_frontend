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
  
  // モーダル制御用ステート
  const [activeModal, setActiveModal] = useState<'none' | 'solo' | 'cpu'>('none');
  const [downloadProgress, setDownloadProgress] = useState<{current: number, total: number} | null>(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // デッキ一覧取得
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

  // 画像DL機能
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
      minHeight: '100vh', width: '100%', 
      background: 'radial-gradient(circle at center, #2c3e50 0%, #000000 100%)', 
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', 
      color: '#f0e6d2', fontFamily: '"Times New Roman", serif', 
      position: 'relative' as const, overflowX: 'hidden' as const, padding: '20px', boxSizing: 'border-box' as const
    },
    bgOverlay: {
      position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, 
      backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 2px, transparent 2px, transparent 20px)', 
      pointerEvents: 'none' as const, zIndex: 0
    },
    contentWrapper: {
      zIndex: 1, width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column' as const, gap: '40px'
    },
    title: {
      fontSize: isMobile ? '40px' : '60px', fontWeight: '900', textAlign: 'center' as const, margin: '0 0 20px 0',
      background: 'linear-gradient(to bottom, #ffd700, #b8860b, #8b4513)', 
      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', 
      filter: 'drop-shadow(0 4px 0px rgba(0,0,0,0.8))', letterSpacing: '4px', textTransform: 'uppercase' as const
    },
    section: {
      display: 'flex', flexDirection: 'column' as const, gap: '15px'
    },
    sectionTitle: {
      fontSize: '18px', color: '#8b8b8b', borderBottom: '1px solid #444', paddingBottom: '5px', marginBottom: '10px',
      textTransform: 'uppercase' as const, letterSpacing: '2px'
    },
    grid: {
      display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'
    },
    menuCard: (color: string) => ({
      background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}`, borderRadius: '8px', padding: '20px',
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: '10px',
      cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', minHeight: '120px'
    }),
    cardLabel: { fontSize: '18px', fontWeight: 'bold', color: '#eee', textAlign: 'center' as const },
    cardDesc: { fontSize: '12px', color: '#aaa', textAlign: 'center' as const },
    
    // Top Right Area
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

    // Modal Styles
    modalOverlay: {
      position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(5px)'
    },
    modalPanel: {
      background: '#2c3e50', padding: '30px', borderRadius: '12px',
      border: '2px solid #7f8c8d', width: '90%', maxWidth: '500px',
      display: 'flex', flexDirection: 'column' as const, gap: '20px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
    },
    modalTitle: {
      color: '#f1c40f', fontSize: '24px', fontWeight: 'bold', textAlign: 'center' as const,
      borderBottom: '1px solid #7f8c8d', paddingBottom: '10px', marginBottom: '10px'
    },
    select: {
      width: '100%', padding: '12px', background: '#2a1a1a', color: '#f0e6d2',
      border: '1px solid #5d4037', borderRadius: '4px', fontSize: '16px', marginTop: '5px'
    },
    actionBtn: (primary: boolean) => ({
      flex: 1, padding: '12px', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
      border: primary ? 'none' : '1px solid #95a5a6',
      background: primary ? '#e67e22' : 'transparent',
      color: primary ? '#fff' : '#95a5a6'
    })
  }), [isMobile]);

  const MenuCard = ({ label, desc, onClick, color = '#7f8c8d' }: { label: string, desc: string, onClick: () => void, color?: string }) => (
    <div 
      style={styles.menuCard(color)}
      onClick={onClick}
      className="hover-scale"
      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
    >
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardDesc}>{desc}</div>
    </div>
  );

  const SetupModal = ({ title, onConfirm }: { title: string, onConfirm: () => void }) => (
    <div style={styles.modalOverlay}>
      <div style={styles.modalPanel}>
        <div style={styles.modalTitle}>{title}</div>
        
        <div>
          <label style={{display:'block', color:'#bdc3c7', fontSize:'12px'}}>Player 1 (あなた)</label>
          <select value={p1Deck} onChange={(e) => setP1Deck(e.target.value)} style={styles.select}>
            {deckOptions.map(opt => <option key={`p1-${opt.id}`} value={opt.id}>{opt.name}</option>)}
          </select>
        </div>

        <div style={{textAlign:'center', color:'#95a5a6', fontStyle:'italic'}}>VS</div>

        <div>
          <label style={{display:'block', color:'#bdc3c7', fontSize:'12px'}}>Player 2 (相手/CPU)</label>
          <select value={p2Deck} onChange={(e) => setP2Deck(e.target.value)} style={styles.select}>
            {deckOptions.map(opt => <option key={`p2-${opt.id}`} value={opt.id}>{opt.name}</option>)}
          </select>
        </div>

        <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
          <button onClick={() => setActiveModal('none')} style={styles.actionBtn(false)}>キャンセル</button>
          <button onClick={onConfirm} style={styles.actionBtn(true)}>開始</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.bgOverlay}></div>
      
      {/* 右上DLボタン */}
      <div style={styles.topRightArea}>
        <button 
          onClick={handleCacheImages} 
          disabled={!!downloadProgress}
          style={styles.dlBtn}
          title="全てのカード画像をダウンロードしてキャッシュします"
        >
          {downloadProgress ? (
            <>
              <span style={{ width: '10px', height: '10px', border: '2px solid #888', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
              {`DL中: ${Math.floor((downloadProgress.current / downloadProgress.total) * 100)}%`}
            </>
          ) : (
            <><span>📥</span> 画像一括DL</>
          )}
        </button>
      </div>

      <div style={styles.contentWrapper}>
        <div style={styles.title}>OPCG SIM</div>

        {/* Section 1: デッキ管理 */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Deck & Cards</div>
          <div style={styles.grid}>
            <MenuCard 
              label="デッキ作成 / 一覧" 
              desc="Deck Builder" 
              onClick={onDeckBuilder} 
              color="#3498db" 
            />
            <MenuCard 
              label="カードリスト" 
              desc="Card Catalog" 
              onClick={onCardList} 
              color="#e67e22" 
            />
          </div>
        </div>

        {/* Section 2: シミュレーション */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Simulation</div>
          <div style={styles.grid}>
            <MenuCard 
              label="1人回しモード" 
              desc="Solo Sandbox Mode" 
              onClick={() => setActiveModal('solo')} 
              color="#2ecc71" 
            />
            <MenuCard 
              label="対戦モード" 
              desc="Online Multiplayer" 
              onClick={onLobby} 
              color="#9b59b6" 
            />
            <MenuCard 
              label="自動モード" 
              desc="VS CPU (Rule Enforced)" 
              onClick={() => setActiveModal('cpu')} 
              color="#e74c3c" 
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'solo' && (
        <SetupModal 
          title="Solo Sandbox Setup" 
          onConfirm={() => onStart(p1Deck, p2Deck, 'sandbox', { role: 'both' })} 
        />
      )}
      
      {activeModal === 'cpu' && (
        <SetupModal 
          title="VS CPU Setup" 
          onConfirm={() => onStart(p1Deck, p2Deck, 'normal')} 
        />
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

import React from 'react';
import { getCardImageUrl } from '../utils/imageAssets';
import { logger } from '../utils/logger'; // 追加

export interface DeckOption {
  id: string;
  name: string;
  leaderId?: string;
  // デッキ枚数などが渡ってくる可能性がある場合はここに追加定義しますが、
  // 現状の呼び出し元に依存するため、最低限のフィールドでログを出力します。
}

interface DeckSelectModalProps {
  title: string;
  options: DeckOption[];
  onSelect: (deckId: string) => void;
  onClose: () => void;
}

export const DeckSelectModal: React.FC<DeckSelectModalProps> = ({ title, options, onSelect, onClose }) => {
  
  // 追加: デッキ選択時のログ処理ラッパー
  const handleDeckClick = (deck: DeckOption) => {
    logger.log({
      level: 'info',
      action: 'deck_select.tap',
      msg: `Deck tapped: ${deck.name}`,
      payload: {
        deck_id: deck.id,
        is_local_id: deck.id.startsWith('local-'),
        has_leader: !!deck.leaderId
      }
    });
    onSelect(deck.id);
  };

  return (
    <div style={{ 
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 3000,
      display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '800px', maxHeight: '80vh', background: '#222', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#f0e6d2' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {options.map(opt => (
            <div 
              key={opt.id} 
              onClick={() => handleDeckClick(opt)} // 変更: ログ出力関数経由にする
              role="button"        // 追加: Android/アクセシビリティ対策
              tabIndex={0}         // 追加: フォーカス可能にする
              style={{ 
                display: 'flex', alignItems: 'center',
                background: '#333', borderRadius: '8px', cursor: 'pointer', border: '1px solid #555',
                padding: '10px', minHeight: '80px', transition: 'background 0.2s',
                touchAction: 'manipulation' // 追加: ダブルタップ拡大などの遅延防止
              }}
              className="hover-scale"
              onMouseOver={(e) => e.currentTarget.style.background = '#444'}
              onMouseOut={(e) => e.currentTarget.style.background = '#333'}
              // 追加: Enterキーでも選択可能にする（キーボード操作対応）
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDeckClick(opt);
                }
              }}
            >
              {/* 左側: リーダー画像 */}
              <div style={{ width: '50px', height: '70px', flexShrink: 0, marginRight: '15px', background: '#000', borderRadius: '4px', overflow: 'hidden', border: '1px solid #666' }}>
                {opt.leaderId ? (
                  <img src={getCardImageUrl(opt.leaderId)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="leader" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '10px' }}>No Img</div>
                )}
              </div>
              {/* 右側: デッキ名 */}
              <div style={{ flex: 1, color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>
                {opt.name}
              </div>
              {/* 矢印アイコン */}
              <div style={{ color: '#666', fontSize: '20px', marginLeft: '10px' }}>›</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

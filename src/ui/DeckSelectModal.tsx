import React from 'react';
import { getCardImageUrl } from '../utils/imageAssets';

export interface DeckOption {
  id: string;
  name: string;
  leaderId?: string;
}

interface DeckSelectModalProps {
  title: string;
  options: DeckOption[];
  onSelect: (deckId: string) => void;
  onClose: () => void;
}

export const DeckSelectModal: React.FC<DeckSelectModalProps> = ({ title, options, onSelect, onClose }) => {
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
          {options.map(opt => (
            <div 
              key={opt.id} 
              onClick={() => onSelect(opt.id)}
              style={{ 
                background: '#333', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden', border: '1px solid #555',
                display: 'flex', flexDirection: 'column', aspectRatio: '0.7', transition: 'background 0.2s'
              }}
              className="hover-scale"
              onMouseOver={(e) => e.currentTarget.style.background = '#444'}
              onMouseOut={(e) => e.currentTarget.style.background = '#333'}
            >
              <div style={{ flex: 1, background: '#000', position: 'relative' }}>
                {opt.leaderId ? (
                  <img src={getCardImageUrl(opt.leaderId)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="leader" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '10px' }}>No Img</div>
                )}
              </div>
              <div style={{ padding: '8px', fontSize: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.5)', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {opt.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '../utils/logger';
import { API_CONFIG } from '../api/api.config';

// --- 型定義 ---
interface CardData {
  uuid: string;
  name: string;
  type: string;
  color: string[];
  cost?: number;
  power?: number;
  counter?: number;
  attributes?: string[];
  text?: string;
  traits?: string[];
  trigger_text?: string;
  // 高速化用プリセット
  _normColors?: string[];
  _normCost?: number;
  _normPower?: number;
}

interface DeckData {
  id?: string;
  name: string;
  leader_id: string | null;
  card_uuids: string[];
  don_uuids: string[];
}

interface FilterState {
  color: string[];
  type: string[];
  attribute: string[];
  traits: string[];
  counter: string[];
  cost: string[];
  power: string[];
  trigger: string[];
  sets: string[];
  sort: string;
}

// --- ヘルパー関数 ---
const normalizeColor = (c: string) => {
  if (!c) return '';
  const s = c.trim().toLowerCase(); 
  const map: Record<string, string> = { '赤': 'red', 'red': 'red', '緑': 'green', 'green': 'green', '青': 'blue', 'blue': 'blue', '紫': 'purple', 'purple': 'purple', '黒': 'black', 'black': 'black', '黄': 'yellow', 'yellow': 'yellow' };
  return map[s] || s;
};

const getLocalDecks = (): DeckData[] => {
  try {
    const ids = JSON.parse(localStorage.getItem('opcg_local_deck_ids') || '[]');
    return ids.map((id: string) => {
      const data = localStorage.getItem(`opcg_deck_${id}`);
      return data ? JSON.parse(data) : null;
    }).filter((d: any) => d !== null);
  } catch (e) { return []; }
};

// --- UIコンポーネント (外出ししてメモ化) ---

const CardImageStub = React.memo(({ card, count, onClick }: { card: CardData | { name: string, uuid?: string }, count?: number, onClick?: () => void }) => {
  const [imgError, setImgError] = useState(false);
  const imageUrl = card.uuid ? `${API_CONFIG.IMAGE_BASE_URL}/${card.uuid}.png` : null;

  return (
    <div 
      onClick={onClick}
      style={{
        width: '80px', height: '112px', background: '#444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: '10px', textAlign: 'center', position: 'relative',
        borderRadius: '4px', border: '1px solid #666', cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)', overflow: 'hidden'
      }}
    >
      {imageUrl && !imgError ? (
        <img 
          src={imageUrl} alt={card.name} loading="lazy"
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ padding: '5px' }}>{card.name || "No DATA"}</span>
      )}
      {count !== undefined && (
        <div style={{
          position: 'absolute', top: '2px', right: '2px', background: '#e74c3c', color: 'white',
          borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', border: '1px solid white',
          zIndex: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.5)'
        }}>
          {count}
        </div>
      )}
    </div>
  );
});

const FilterBtn = React.memo(({ label, active, onClick, color }: { label: string, active: boolean, onClick: () => void, color?: string }) => (
  <button 
    onClick={onClick}
    style={{
      padding: '8px 12px', borderRadius: '20px',
      border: active ? `2px solid ${color || '#3498db'}` : '1px solid #555',
      background: active ? (color || '#3498db') : '#333',
      color: 'white', fontSize: '12px', fontWeight: active ? 'bold' : 'normal',
      cursor: 'pointer', minWidth: '40px'
    }}
  >
    {label}
  </button>
));

const ColorBtn = React.memo(({ label, colorCode, active, onClick }: { label: string, colorCode: string, active: boolean, onClick: () => void }) => {
  return (
    <div 
      title={label}
      onClick={onClick}
      style={{
        width: '40px', height: '40px', borderRadius: '50%',
        background: colorCode,
        border: active ? '3px solid white' : '2px solid transparent',
        boxShadow: active ? '0 0 10px white' : 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'black', fontWeight: 'bold', fontSize: '10px',
        opacity: active ? 1 : 0.4
      }}
    >
      {active && "✓"}
    </div>
  );
});

const SectionTitle = React.memo(({ children, onSelectAll }: { children: string, onSelectAll?: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', marginBottom: '8px' }}>
    <div style={{ color: '#aaa', fontSize: '12px', fontWeight: 'bold' }}>{children}</div>
    {onSelectAll && (
      <button 
        onClick={onSelectAll}
        style={{ background: '#444', border: 'none', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
      >
        全て選択
      </button>
    )}
  </div>
));

// --- メイン画面コンポーネント ---

const CardDetailScreen = ({ card, currentCount, onCountChange, onClose, onNavigate, viewOnly }: any) => {
  const imageUrl = `${API_CONFIG.IMAGE_BASE_URL}/${card.uuid}.png`;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}><img src={imageUrl} alt={card.name} style={{ height: '55vh', maxHeight: '600px', objectFit: 'contain', borderRadius: '12px', border: '2px solid #fff' }} onError={(e:any) => { e.target.style.display='none'; }} /></div>
      {!viewOnly && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '40px' }}>
          <button onClick={() => onCountChange(-1)} disabled={currentCount <= 0} style={{ width: '70px', height: '70px', borderRadius: '50%', border: 'none', background: currentCount > 0 ? '#e74c3c' : '#444', color: 'white', fontSize: '28px' }}>－</button>
          <div style={{ fontSize: '64px', fontWeight: 'bold', color: 'white', width: '80px', textAlign: 'center' }}>{currentCount}</div>
          <button onClick={() => onCountChange(1)} disabled={currentCount >= 4} style={{ width: '70px', height: '70px', borderRadius: '50%', border: 'none', background: currentCount < 4 ? '#3498db' : '#444', color: 'white', fontSize: '28px' }}>＋</button>
        </div>
      )}
      <button onClick={onClose} style={{ padding: '12px 50px', fontSize: '16px', background: 'rgba(255,255,255,0.1)', border: '1px solid #888', color: '#ddd', borderRadius: '30px' }}>閉じる</button>
      {onNavigate && (
        <div style={{ position: 'absolute', bottom: '20px', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box' }}>
          <button onClick={() => onNavigate(-1)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '30px' }}>◀</button>
          <button onClick={() => onNavigate(1)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '30px' }}>▶</button>
        </div>
      )}
    </div>
  );
};

const FilterModal = ({ filters, onApply, traitList, setList, onClose, onReset }: { filters: FilterState, onApply: (f: FilterState) => void, traitList: string[], setList: string[], onClose: () => void, onReset: () => void }) => {
  const [localFilters, setLocalFilters] = useState<FilterState>({ ...filters });
  const [traitSearch, setTraitSearch] = useState('');

  const toggle = useCallback((key: keyof FilterState, value: string) => {
    setLocalFilters(prev => {
      const current = prev[key];
      if (Array.isArray(current)) {
        const newArray = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
        return { ...prev, [key]: newArray };
      }
      return prev;
    });
  }, []);

  const filteredTraits = useMemo(() => {
    if (!traitSearch) return traitList;
    const lower = traitSearch.toLowerCase();
    return traitList.filter(t => t.toLowerCase().includes(lower));
  }, [traitList, traitSearch]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 60, display: 'flex' }}>
      <div style={{ width: '100%', background: '#222', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333' }}>
          <h3 style={{ margin: 0 }}>フィルタ設定</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
          <SectionTitle>色 (COLOR)</SectionTitle>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
            <ColorBtn label="赤" colorCode="#e74c3c" active={localFilters.color.includes('Red')} onClick={() => toggle('color', 'Red')} />
            <ColorBtn label="緑" colorCode="#27ae60" active={localFilters.color.includes('Green')} onClick={() => toggle('color', 'Green')} />
            <ColorBtn label="青" colorCode="#3498db" active={localFilters.color.includes('Blue')} onClick={() => toggle('color', 'Blue')} />
            <ColorBtn label="紫" colorCode="#9b59b6" active={localFilters.color.includes('Purple')} onClick={() => toggle('color', 'Purple')} />
            <ColorBtn label="黒" colorCode="#34495e" active={localFilters.color.includes('Black')} onClick={() => toggle('color', 'Black')} />
            <ColorBtn label="黄" colorCode="#f1c40f" active={localFilters.color.includes('Yellow')} onClick={() => toggle('color', 'Yellow')} />
          </div>

          <SectionTitle>コスト (COST)</SectionTitle>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
            {[...Array(10)].map((_, i) => (
              <FilterBtn key={i} label={`${i+1}`} active={localFilters.cost.includes(`${i+1}`)} onClick={() => toggle('cost', `${i+1}`)} />
            ))}
            <FilterBtn label="10+" active={localFilters.cost.includes('10')} onClick={() => toggle('cost', '10')} />
          </div>

          <SectionTitle>特徴 (TRAITS)</SectionTitle>
          <input 
            placeholder="特徴を検索..." value={traitSearch} onChange={e => setTraitSearch(e.target.value)}
            style={{ width: '100%', padding: '10px', background: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '150px', overflowY: 'auto' }}>
            {filteredTraits.slice(0, 100).map(t => (
              <FilterBtn key={t} label={t} active={localFilters.traits.includes(t)} onClick={() => toggle('traits', t)} />
            ))}
            {filteredTraits.length > 100 && <div style={{color:'#666', fontSize:'12px'}}>他 {filteredTraits.length - 100} 件...</div>}
          </div>

          <SectionTitle>種類 (TYPE)</SectionTitle>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
            {['LEADER', 'CHARACTER', 'EVENT', 'STAGE'].map(t => (
              <FilterBtn key={t} label={t} active={localFilters.type.includes(t)} onClick={() => toggle('type', t)} />
            ))}
          </div>

          <SectionTitle>カウンター (COUNTER)</SectionTitle>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
            {['NONE', '1000', '2000'].map(c => (
              <FilterBtn key={c} label={c==='NONE'?'なし':`+${c}`} active={localFilters.counter.includes(c)} onClick={() => toggle('counter', c)} />
            ))}
          </div>

          <SectionTitle>収録セット (SET)</SectionTitle>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
            {setList.map(s => (
              <FilterBtn key={s} label={s} active={localFilters.sets.includes(s)} onClick={() => toggle('sets', s)} />
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 15px 45px 15px', borderTop: '1px solid #444', display: 'flex', gap: '10px', background: '#2a2a2a' }}>
          <button onClick={onReset} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#333', color: 'white' }}>リセット</button>
          <button onClick={() => { onApply(localFilters); onClose(); }} style={{ flex: 2, padding: '12px', borderRadius: '8px', background: '#e74c3c', color: 'white', fontWeight: 'bold' }}>決定</button>
        </div>
      </div>
    </div>
  );
};

// --- メインロジック ---

const CardCatalogScreen = ({ allCards, mode, currentDeck, onUpdateDeck, onClose, viewOnly }: any) => {
  const [filters, setFilters] = useState<FilterState>({ color: [], type: [], attribute: [], traits: [], counter: [], cost: [], power: [], trigger: [], sets: [], sort: 'COST' });
  const [searchText, setSearchText] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [viewingCard, setViewingCard] = useState<CardData | null>(null);

  const traitList = useMemo(() => {
    const traits = new Set<string>();
    allCards.forEach((c: any) => c.traits?.forEach((t: string) => traits.add(t)));
    return Array.from(traits).sort();
  }, [allCards]);

  const setList = useMemo(() => {
    const sets = new Set<string>();
    allCards.forEach((c: any) => { if (c.uuid) { const parts = c.uuid.split('-'); if (parts.length > 1) sets.add(parts[0]); } });
    return Array.from(sets).sort();
  }, [allCards]);

  const filtered = useMemo(() => {
    let res = allCards;
    const leaderCard = allCards.find((c: any) => c.uuid === currentDeck.leader_id);
    const leaderColors = leaderCard?._normColors || [];

    if (mode === 'main') {
      if (!viewOnly) {
          res = res.filter((c: any) => c.type !== 'LEADER');
          if (leaderColors.length > 0) {
            res = res.filter((c: any) => c._normColors && c._normColors.every((cc: string) => leaderColors.includes(cc)));
          }
      }
    } else { res = res.filter((c: any) => c.type === 'LEADER'); }

    if (filters.color.length > 0) {
      const selected = filters.color.map(c => normalizeColor(c));
      res = res.filter((c: any) => c._normColors?.some((cc: string) => selected.includes(cc)));
    }
    if (filters.cost.length > 0) {
      res = res.filter((c: any) => {
        const costVal = c._normCost || 0;
        return filters.cost.includes(costVal >= 10 ? '10' : costVal.toString());
      });
    }
    if (filters.type.length > 0) res = res.filter((c: any) => filters.type.includes(c.type));
    if (filters.traits.length > 0) res = res.filter((c: any) => c.traits?.some((t: string) => filters.traits.includes(t)));
    if (filters.counter.length > 0) {
      res = res.filter((c: any) => {
        if (filters.counter.includes('NONE') && !c.counter) return true;
        return c.counter && filters.counter.includes(c.counter.toString());
      });
    }
    if (filters.sets.length > 0) {
      res = res.filter((c: any) => filters.sets.some((s: string) => c.uuid.startsWith(s)));
    }
    
    if (searchText) {
      const lower = searchText.toLowerCase();
      res = res.filter((c: any) => c.name.toLowerCase().includes(lower) || (c.text && c.text.toLowerCase().includes(lower)));
    }

    return [...res].sort((a: any, b: any) => (a._normCost || 0) - (b._normCost || 0));
  }, [allCards, filters, mode, searchText, currentDeck.leader_id, viewOnly]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#222', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }} onScroll={e => {
        if (e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 100) setDisplayLimit(p => p + 50);
      }}>
        {filtered.slice(0, displayLimit).map((c: any) => (
          <CardImageStub key={c.uuid} card={c} count={currentDeck.card_uuids.filter((u: string) => u === c.uuid).length || undefined} onClick={() => {
            if(mode === 'leader') { onUpdateDeck({...currentDeck, leader_id: c.uuid}); onClose(); } else setViewingCard(c);
          }} />
        ))}
      </div>
      <div style={{ padding: '15px 15px 45px 15px', background: '#333', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={onClose} style={{ padding: '10px', background: '#555', color: 'white', border: 'none', borderRadius: '8px' }}>完了</button>
        <input placeholder="検索" value={searchText} onChange={e => setSearchText(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', background: '#222', color: 'white' }} />
        <button onClick={() => setShowFilterModal(true)} style={{ padding: '10px', borderRadius: '50%', background: '#444', color: 'white', border: 'none' }}>⚙️</button>
      </div>
      {viewingCard && <CardDetailScreen card={viewingCard} currentCount={currentDeck.card_uuids.filter((u: string) => u === viewingCard.uuid).length} onCountChange={(diff: number) => {
        const newUuids = [...currentDeck.card_uuids];
        if (diff > 0) { if (newUuids.length < 50) newUuids.push(viewingCard.uuid); }
        else { const idx = newUuids.indexOf(viewingCard.uuid); if (idx !== -1) newUuids.splice(idx, 1); }
        onUpdateDeck({ ...currentDeck, card_uuids: newUuids });
      }} onClose={() => setViewingCard(null)} viewOnly={viewOnly} />}
      {showFilterModal && <FilterModal filters={filters} onApply={setFilters} traitList={traitList} setList={setList} onClose={() => setShowFilterModal(false)} onReset={() => setFilters({ color: [], type: [], attribute: [], traits: [], counter: [], cost: [], power: [], trigger: [], sets: [], sort: 'COST' })} />}
    </div>
  );
};

const DeckEditorView = ({ deck, allCards, onUpdateDeck, onSave, onBack, onOpenCatalog }: any) => {
  const [showStats, setShowStats] = useState(false);
  const groupedCards = useMemo(() => {
    const map = new Map<string, number>();
    deck.card_uuids.forEach((uuid: string) => map.set(uuid, (map.get(uuid) || 0) + 1));
    const leaderCard = allCards.find((c: any) => c.uuid === deck.leader_id);
    const list: { card: CardData, count: number }[] = [];
    map.forEach((count, uuid) => { const card = allCards.find((c: any) => c.uuid === uuid); if (card) list.push({ card, count }); });
    list.sort((a, b) => (a.card.cost || 0) - (b.card.cost || 0));
    return { leaderCard, list };
  }, [deck.card_uuids, deck.leader_id, allCards]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#222', color: '#eee' }}>
      <div style={{ padding: '10px', background: '#333', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={onBack}>←</button>
        <input value={deck.name} onChange={e => onUpdateDeck({...deck, name: e.target.value})} style={{ flex: 1, background: '#222', color: 'white' }} />
        <div style={{fontSize:'12px'}}>{deck.card_uuids.length}/50</div>
        <button onClick={onSave} style={{ background: '#e74c3c', color: 'white', padding: '5px 15px' }}>保存</button>
      </div>
      <div style={{ padding: '10px', textAlign: 'center' }}><CardImageStub card={groupedCards.leaderCard || { name: "Leader" }} onClick={() => onOpenCatalog('leader')} /></div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px' }}>
        <div onClick={() => onOpenCatalog('main')} style={{ width: '80px', height: '112px', border: '2px dashed #666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>＋</div>
        {groupedCards.list.map((item) => ( <CardImageStub key={item.card.uuid} card={item.card} count={item.count} /> ))}
      </div>
      {showStats && <DeckDistributionModal deck={deck} allCards={allCards} onClose={() => setShowStats(false)} />}
    </div>
  );
};

const DeckListView = ({ decks, onSelectDeck, onCreateNew, onBack }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#222', color: '#eee' }}>
    <div style={{ padding: '15px', background: '#333', display: 'flex', justifyContent: 'space-between' }}>
      <button onClick={onBack}>TOP</button>
      <button onClick={onCreateNew}>＋新規</button>
    </div>
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
      {decks.map((deck: any, idx: number) => (
        <div key={deck.id || idx} onClick={() => onSelectDeck(deck)} style={{ padding: '10px', borderBottom: '1px solid #444', display: 'flex' }}>
          <div style={{ fontWeight: 'bold' }}>{deck.name}</div>
        </div>
      ))}
    </div>
  </div>
);

export const DeckBuilder = ({ onBack, viewOnly = false }: { onBack: () => void, viewOnly?: boolean }) => {
  const [mode, setMode] = useState<'list' | 'edit' | 'catalog'>(viewOnly ? 'catalog' : 'list');
  const [catalogMode, setCatalogMode] = useState<'leader' | 'main'>('main');
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [decks, setDecks] = useState<DeckData[]>([]);
  const [currentDeck, setCurrentDeck] = useState<DeckData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      let loadedFromCache = false;
      try {
        const cached = localStorage.getItem('opcg_card_db');
        if (cached) {
           const parsed = JSON.parse(cached);
           setAllCards(parsed);
           loadedFromCache = true;
           logger.log({ level: 'info', action: 'deck_builder.cache_hit', msg: 'Loaded cards from local storage' });
        }
      } catch(e) {}

      try {
        const cRes = await fetch(`${API_CONFIG.BASE_URL}/api/cards`);
        const cData = await cRes.json();
        if (cData.success) {
           const normalized = cData.cards.map((c: any) => ({
             ...c,
             _normColors: c.color?.flatMap((col: string) => col.split(/[\/／]/)).map((col: string) => normalizeColor(col)) || [],
             _normCost: c.cost || 0
           }));
           setAllCards(normalized);
           localStorage.setItem('opcg_card_db', JSON.stringify(normalized));
        }
      } catch (e) { if (!loadedFromCache) logger.error('deck_builder.init', 'Failed to load cards'); }

      if (!viewOnly) {
        const localDecks = getLocalDecks();
        let serverDecks: DeckData[] = [];
        try {
          const dRes = await fetch(`${API_CONFIG.BASE_URL}/api/deck/list`);
          const dData = await dRes.json();
          if (dData.success) serverDecks = dData.decks;
        } catch(e) { console.log('Offline'); }

        const merged = [...serverDecks];
        localDecks.forEach(ld => {
          if (!merged.find(md => md.id === ld.id)) {
            merged.push(ld);
          }
        });
        setDecks(merged);
      }
    };
    fetchData();
  }, [mode, viewOnly]);

  const handleSaveDeck = async () => {
    if (!currentDeck) return;
    const tempId = currentDeck.id || `local-${Date.now()}`;
    const deckToSave = { ...currentDeck, id: tempId };
    const leaderCard = allCards.find(c => c.uuid === deckToSave.leader_id);
    const cardObjects = deckToSave.card_uuids.map(uuid => allCards.find(c => c.uuid === uuid)).filter(Boolean);
    const sandboxFormat = { deck: { leader: leaderCard ? [leaderCard] : [], cards: cardObjects }, ...deckToSave };

    try {
      localStorage.setItem(`opcg_deck_${tempId}`, JSON.stringify(sandboxFormat));
      const ids = JSON.parse(localStorage.getItem('opcg_local_deck_ids') || '[]');
      if (!ids.includes(tempId)) localStorage.setItem('opcg_local_deck_ids', JSON.stringify([...ids, tempId]));
      setDecks(prev => {
        const exists = prev.find(d => d.id === tempId);
        return exists ? prev.map(d => d.id === tempId ? deckToSave : d) : [...prev, deckToSave];
      });
    } catch (e) { alert('容量不足'); return; }

    try {
      const res = await fetch(`${API_CONFIG.BASE_URL}/api/deck`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(deckToSave) });
      const data = await res.json();
      if (data.success) {
         const serverId = data.deck_id;
         const serverDeck = { ...deckToSave, id: serverId };
         localStorage.setItem(`opcg_deck_${serverId}`, JSON.stringify({ ...sandboxFormat, ...serverDeck }));
         if (tempId !== serverId) {
           localStorage.removeItem(`opcg_deck_${tempId}`);
           const ids = JSON.parse(localStorage.getItem('opcg_local_deck_ids') || '[]');
           localStorage.setItem('opcg_local_deck_ids', JSON.stringify(ids.filter((id: string) => id !== tempId)));
         }
         setCurrentDeck(serverDeck);
         alert('保存しました (同期完了)');
         return;
      }
    } catch (e) { console.warn('Offline save'); }
    setCurrentDeck(deckToSave);
    alert('保存しました (オフライン)');
  };

  if (mode === 'list') return <DeckListView decks={decks} onSelectDeck={(d: any) => { setCurrentDeck(d); setMode('edit'); }} onCreateNew={() => { setCurrentDeck({ name: 'New Deck', leader_id: null, card_uuids: [], don_uuids: [] }); setMode('edit'); }} onBack={onBack} />;
  if (mode === 'edit' && currentDeck) return <DeckEditorView deck={currentDeck} allCards={allCards} onUpdateDeck={setCurrentDeck} onSave={handleSaveDeck} onBack={() => setMode('list')} onOpenCatalog={(m: any) => { setCatalogMode(m); setMode('catalog'); }} />;
  if (mode === 'catalog' && currentDeck) return <CardCatalogScreen allCards={allCards} mode={catalogMode} currentDeck={currentDeck} onUpdateDeck={setCurrentDeck} onClose={() => viewOnly ? onBack() : setMode('edit')} viewOnly={viewOnly} />;
  return <div>Loading...</div>;
};


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash2,
  RotateCcw,
  Dices,
  RefreshCw,
  LayoutGrid,
  Menu,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  History,
  Clock,
  Eraser,
  PackageOpen,
  Minus,
  Settings2,
  X,
  Layers,
  Dice5,
  Save,
  Zap
} from 'lucide-react';
import { DiceType, ThresholdType, PoolMode, DicePool, RollResult, RollEvent, CustomDieDefinition, CustomDieSide, DiceEntry } from './types';
import DiceIcon from './components/DiceIcon';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) { }
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const PRESET_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
  '#f97316', '#06b6d4', '#ec4899', '#f1f5f9', '#475569'
];

const STANDARD_DICE_TYPES = ['2', '4', '6', '8', '10', '12', '20'];
const DEFAULT_POOL_NAME = "Combat Pool";
const MIN_SIDEBAR_WIDTH = 250;
const MAX_SIDEBAR_WIDTH = 650;

const App: React.FC = () => {
  const [pools, setPools] = useState<DicePool[]>([]);
  const [customDice, setCustomDice] = useState<CustomDieDefinition[]>([]);
  const [editingCustomDieId, setEditingCustomDieId] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [showGlobalLog, setShowGlobalLog] = useState(false);
  const [isLogMinimized, setIsLogMinimized] = useState(false);
  const [collapsedPoolHistories, setCollapsedPoolHistories] = useState<Record<string, boolean>>({});

  const editingCustomDie = useMemo(() => customDice.find(d => d.id === editingCustomDieId) || null, [customDice, editingCustomDieId]);

  // Initialize from LocalStorage with Migration
  useEffect(() => {
    const savedPools = localStorage.getItem('tactician_pools');
    const savedCustom = localStorage.getItem('tactician_custom_dice');
    const savedWidth = localStorage.getItem('tactician_sidebar_width');

    if (savedCustom) setCustomDice(JSON.parse(savedCustom));
    if (savedWidth) setSidebarWidth(parseInt(savedWidth));

    if (savedPools) {
      try {
        const rawPools = JSON.parse(savedPools);
        // Migration logic: Move top-level threshold props to individual entries
        const migratedPools = rawPools.map((p: any): DicePool => {
          if ((p.threshold !== undefined || p.thresholdType !== undefined) && p.entries) {
            const updatedEntries = p.entries.map((e: any): DiceEntry => ({
              ...e,
              thresholdType: e.thresholdType || p.thresholdType || ThresholdType.AT_LEAST,
              threshold: e.threshold !== undefined ? e.threshold : (p.threshold || 4),
              targetValues: e.targetValues || p.targetValues || []
            }));
            // Clean up old root properties
            const { threshold, thresholdType, targetValues, ...rest } = p;
            console.log("Migrating legacy pool structure for:", p.name);
            return { ...rest, entries: updatedEntries } as DicePool;
          }
          return p as DicePool;
        });
        setPools(migratedPools);
      } catch (e) {
        console.error("Failed to parse or migrate pools", e);
      }
    }
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    if (pools.length > 0 || customDice.length > 0) {
      localStorage.setItem('tactician_pools', JSON.stringify(pools));
      localStorage.setItem('tactician_custom_dice', JSON.stringify(customDice));
    }
    localStorage.setItem('tactician_sidebar_width', sidebarWidth.toString());
  }, [pools, customDice, sidebarWidth]);

  // Resizing Logic
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const refillBag = (pool: DicePool): DicePool => {
    const newBag: string[] = [];
    Object.entries(pool.bagDefinition).forEach(([color, qty]) => {
      for (let i = 0; i < qty; i++) newBag.push(color);
    });
    return { ...pool, currentBag: newBag };
  };

  const createDefaultEntry = (diceType: DiceType = 6): DiceEntry => ({
    id: generateId(),
    diceType,
    count: 1,
    thresholdType: ThresholdType.AT_LEAST,
    threshold: 4,
    targetValues: []
  });

  const addPool = (mode: PoolMode = PoolMode.STANDARD) => {
    const newPool: DicePool = {
      id: generateId(),
      name: mode === PoolMode.BLIND_BAG ? "Logistics Bag" : DEFAULT_POOL_NAME,
      mode,
      entries: [createDefaultEntry(6)],
      results: [],
      lastRolledAt: null,
      history: [],
      availableColors: [...PRESET_COLORS],
      bagDefinition: PRESET_COLORS.reduce((acc, color) => ({ ...acc, [color]: 5 }), {}),
      currentBag: []
    };
    if (mode === PoolMode.BLIND_BAG) {
      newPool.entries[0].thresholdType = ThresholdType.NONE;
    }
    setPools(prev => [...prev, mode === PoolMode.BLIND_BAG ? refillBag(newPool) : newPool]);
  };

  const deletePool = (id: string) => {
    setPools(prev => prev.filter(p => p.id !== id));
  };

  const updatePool = (id: string, updates: Partial<DicePool>) => {
    setPools(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const resetBag = (poolId: string) => {
    setPools(prev => prev.map(p => p.id === poolId ? refillBag(p) : p));
  };

  const togglePoolHistory = (poolId: string) => {
    setCollapsedPoolHistories(prev => ({ ...prev, [poolId]: !prev[poolId] }));
  };

  const addDiceEntry = (poolId: string) => {
    setPools(prev => prev.map(p => {
      if (p.id !== poolId) return p;
      return { ...p, entries: [...p.entries, createDefaultEntry(6)] };
    }));
  };

  const removeDiceEntry = (poolId: string, entryId: string) => {
    setPools(prev => prev.map(p => {
      if (p.id !== poolId || p.entries.length <= 1) return p;
      return { ...p, entries: p.entries.filter(e => e.id !== entryId) };
    }));
  };

  const updateDiceEntry = (poolId: string, entryId: string, updates: Partial<DiceEntry>) => {
    setPools(prev => prev.map(p => {
      if (p.id !== poolId) return p;
      const updatedEntries = p.entries.map(e => {
        if (e.id !== entryId) return e;
        let updated = { ...e, ...updates };
        const isCustom = typeof updated.diceType === 'string' && !STANDARD_DICE_TYPES.includes(updated.diceType);
        if (isCustom && updated.thresholdType !== ThresholdType.MATCH_ANY && updated.thresholdType !== ThresholdType.NONE) {
          updated.thresholdType = ThresholdType.MATCH_ANY;
        }
        return updated;
      });
      return { ...p, entries: updatedEntries };
    }));
  };

  const toggleEntryTargetValue = (poolId: string, entryId: string, value: string | number) => {
    setPools(prev => prev.map(p => {
      if (p.id !== poolId) return p;
      const updatedEntries = p.entries.map(e => {
        if (e.id !== entryId) return e;
        const valStr = value.toString().trim().toUpperCase();
        const exists = e.targetValues.some(v => v.toString().trim().toUpperCase() === valStr);
        const newTargets = exists
          ? e.targetValues.filter(v => v.toString().trim().toUpperCase() !== valStr)
          : [...e.targetValues, value];
        return { ...e, targetValues: newTargets };
      });
      return { ...p, entries: updatedEntries };
    }));
  };
  const updateBagDefinition = (poolId: string, color: string, qty: number) => {
    setPools(prev => prev.map(p => {
      if (p.id !== poolId) return p;
      const newDef = { ...p.bagDefinition, [color]: Math.max(0, qty) };
      return { ...p, bagDefinition: newDef };
    }));
  };

  const addCustomDie = () => {
    const newDie: CustomDieDefinition = {
      id: generateId(),
      name: "Asset " + (customDice.length + 1),
      color: PRESET_COLORS[customDice.length % PRESET_COLORS.length],
      sides: Array.from({ length: 6 }, (_, i) => ({ id: generateId(), content: (i + 1).toString() }))
    };
    setCustomDice(prev => [...prev, newDie]);
    setEditingCustomDieId(newDie.id);
  };

  const deleteCustomDie = (id: string) => {
    setCustomDice(prev => prev.filter(d => d.id !== id));
    if (editingCustomDieId === id) setEditingCustomDieId(null);
    setPools(prev => prev.map(p => ({
      ...p,
      entries: p.entries.map(e => e.diceType === id ? { ...e, diceType: 6 } : e)
    })));
  };

  const updateCustomDie = (id: string, updates: Partial<CustomDieDefinition>) => {
    setCustomDice(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const updateSideContent = (dieId: string, sideId: string, content: string) => {
    setCustomDice(prev => prev.map(d => d.id === dieId ? {
      ...d, sides: d.sides.map(s => s.id === sideId ? { ...s, content } : s)
    } : d));
  };

  const addSideToDie = (dieId: string) => {
    setCustomDice(prev => prev.map(d => d.id === dieId ? {
      ...d, sides: [...d.sides, { id: generateId(), content: (d.sides.length + 1).toString() }]
    } : d));
  };

  const removeSideFromDie = (dieId: string, sideId: string) => {
    setCustomDice(prev => prev.map(d => (d.id === dieId && d.sides.length > 1) ? {
      ...d, sides: d.sides.filter(s => s.id !== sideId)
    } : d));
  };

  const applyTemplate = (dieId: string, type: 'numbers' | 'binary' | 'critical') => {
    setCustomDice(prev => prev.map(d => {
      if (d.id !== dieId) return d;
      let newSides: CustomDieSide[] = [];
      if (type === 'numbers') {
        newSides = Array.from({ length: 6 }, (_, i) => ({ id: generateId(), content: (i + 1).toString() }));
      } else if (type === 'binary') {
        newSides = [{ id: generateId(), content: "HIT" }, { id: generateId(), content: "MISS" }];
      } else if (type === 'critical') {
        newSides = [
          { id: generateId(), content: "CRIT" }, { id: generateId(), content: "HIT" },
          { id: generateId(), content: "HIT" }, { id: generateId(), content: "MISS" },
          { id: generateId(), content: "MISS" }, { id: generateId(), content: "FUMBLE" }
        ];
      }
      return { ...d, sides: newSides };
    }));
  };

  const calculateIsSuccess = (value: string | number, entry: DiceEntry) => {
    if (entry.thresholdType === ThresholdType.NONE) return undefined;
    const valStr = value.toString().trim().toUpperCase();

    if (entry.thresholdType === ThresholdType.MATCH_ANY) {
      return entry.targetValues.some(v => v.toString().trim().toUpperCase() === valStr);
    } else {
      const numericValue = typeof value === 'number' ? value : parseFloat(value);
      if (!isNaN(numericValue)) {
        const thresholdNum = typeof entry.threshold === 'number' ? entry.threshold : parseFloat(entry.threshold.toString());
        if (entry.thresholdType === ThresholdType.AT_LEAST) return numericValue >= thresholdNum;
        else if (entry.thresholdType === ThresholdType.AT_MOST) return numericValue <= thresholdNum;
        else if (entry.thresholdType === ThresholdType.EXACTLY) return numericValue === thresholdNum;
      } else {
        const normThresh = entry.threshold.toString().trim().toUpperCase();
        if (entry.thresholdType === ThresholdType.EXACTLY) return valStr === normThresh;
      }
    }
    return false;
  };

  const rollPool = (id: string) => {
    setPools(prev => prev.map(pool => {
      if (pool.id !== id) return pool;
      let workingBag = [...pool.currentBag];
      const newResults: RollResult[] = [];

      if (pool.mode === PoolMode.STANDARD) {
        pool.entries.forEach(entry => {
          const customDie = customDice.find(d => d.id === entry.diceType);
          for (let i = 0; i < entry.count; i++) {
            let value: number | string;
            if (customDie) {
              const sideIdx = Math.floor(Math.random() * customDie.sides.length);
              value = customDie.sides[sideIdx].content;
            } else {
              const diceSides = typeof entry.diceType === 'number' ? entry.diceType : parseInt(entry.diceType as string);
              value = Math.floor(Math.random() * (isNaN(diceSides) ? 6 : diceSides)) + 1;
            }
            const isSuccess = calculateIsSuccess(value, entry);
            newResults.push({ value, isSuccess, color: entry.color ?? customDie?.color, isCustom: !!customDie, diceType: entry.diceType });
          }
        });
      } else {
        const totalToPull = pool.entries.reduce((acc, e) => acc + e.count, 0);
        const pullCount = Math.min(totalToPull, workingBag.length);
        const entryTemplate = pool.entries[0];
        const customDie = customDice.find(d => d.id === entryTemplate.diceType);

        for (let i = 0; i < pullCount; i++) {
          const colorIdx = Math.floor(Math.random() * workingBag.length);
          const color = workingBag[colorIdx];
          workingBag.splice(colorIdx, 1);

          let value: number | string;
          if (customDie) {
            value = customDie.sides[Math.floor(Math.random() * customDie.sides.length)].content;
          } else {
            const diceSides = typeof entryTemplate.diceType === 'number' ? entryTemplate.diceType : parseInt(entryTemplate.diceType as string);
            value = Math.floor(Math.random() * (isNaN(diceSides) ? 6 : diceSides)) + 1;
          }
          const isSuccess = calculateIsSuccess(value, entryTemplate);
          newResults.push({ value, isSuccess, color, isCustom: !!customDie, diceType: entryTemplate.diceType });
        }
      }

      const sum = newResults.reduce((acc, r) => acc + (typeof r.value === 'number' ? r.value : (parseFloat(r.value as string) || 0)), 0);
      const successes = newResults.filter(r => r.isSuccess).length;
      const newEvent: RollEvent = {
        id: generateId(),
        poolName: pool.name,
        timestamp: Date.now(),
        results: newResults,
        sum,
        successes,
        thresholdInfo: "Per-entry rules",
        mode: pool.mode
      };
      return { ...pool, results: newResults, lastRolledAt: newEvent.timestamp, currentBag: workingBag, history: [newEvent, ...pool.history].slice(0, 30) };
    }));
  };

  const clearGlobalHistory = () => setPools(prev => prev.map(p => ({ ...p, history: [] })));
  const clearResults = () => setPools(prev => prev.map(p => ({ ...p, results: [], lastRolledAt: null })));
  const rollAllPools = () => pools.forEach(p => rollPool(p.id));
  const globalHistory = useMemo(() => pools.flatMap(p => p.history).sort((a, b) => b.timestamp - a.timestamp).slice(0, 30), [pools]);

  const getEntryUniqueFaces = (entry: DiceEntry): (string | number)[] => {
    const faces = new Set<string | number>();
    const customDie = customDice.find(d => d.id === entry.diceType);
    if (customDie) customDie.sides.forEach(s => faces.add(s.content));
    else {
      const sides = parseInt(entry.diceType.toString());
      if (!isNaN(sides)) { for (let i = 1; i <= sides; i++) faces.add(i); }
    }
    return Array.from(faces).sort((a, b) => {
      const aNum = parseFloat(a.toString()); const bNum = parseFloat(b.toString());
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      return a.toString().localeCompare(b.toString());
    });
  };

  return (
    <div className={`flex h-screen overflow-hidden bg-[#0a0f1d] text-slate-200 ${isResizing ? 'resizing' : ''}`}>
      {/* Sidebar - Control Tower */}
      <aside
        style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
        className={`relative transition-[width] duration-300 border-r border-slate-800 bg-slate-900/40 flex flex-col overflow-visible ${!isSidebarOpen && 'opacity-0'}`}
      >
        <div className="p-3 border-b border-slate-800 flex items-center justify-between min-w-full shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <Zap className="text-amber-500 w-4 h-4 fill-amber-500 shrink-0" />
            <h1 className="text-[11px] font-black tracking-tighter uppercase truncate">Dice Command</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-800 rounded-md text-slate-500 hover:text-white shrink-0"><ChevronLeft className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-6 min-w-full custom-scrollbar">
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assets</h2>
              <button onClick={addCustomDie} className="p-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-md"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="space-y-1.5">
              {customDice.map(die => (
                <div key={die.id} onClick={() => setEditingCustomDieId(die.id)} className={`p-2 bg-slate-900/60 border rounded-md flex items-center justify-between cursor-pointer group transition-all ${editingCustomDieId === die.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 hover:border-slate-700'}`}>
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-3 h-3 rounded shrink-0 border border-white/10" style={{ backgroundColor: die.color }} />
                    <span className="text-[11px] font-bold text-slate-300 truncate">{die.name}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteCustomDie(die.id); }} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-rose-500 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deployments</h2>
              <div className="flex gap-1.5">
                <button onClick={() => addPool(PoolMode.STANDARD)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md" title="Standard Pool"><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => addPool(PoolMode.BLIND_BAG)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md" title="Blind Bag Pool"><PackageOpen className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="space-y-4">
              {pools.map(pool => (
                <div key={pool.id} className={`p-3 bg-slate-800/40 border rounded-xl group transition-all ${pool.mode === PoolMode.BLIND_BAG ? 'border-purple-900/40' : 'border-slate-800 hover:border-slate-700 shadow-lg'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <input type="text" value={pool.name} onChange={(e) => updatePool(pool.id, { name: e.target.value })} className="bg-transparent text-[11px] font-black text-slate-100 outline-none w-full focus:text-blue-400 uppercase tracking-tight" />
                    <button onClick={() => deletePool(pool.id)} className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 ml-1 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  </div>

                  {pool.mode === PoolMode.BLIND_BAG && (
                    <div className="mb-3 p-2.5 bg-slate-950/50 rounded-lg border border-purple-900/30">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[9px] font-black uppercase text-purple-400 tracking-widest">Logistic Bag Contents</label>
                        <span className="text-[9px] font-mono text-slate-500">{Object.values(pool.bagDefinition).reduce((a, b) => a + b, 0)} Dice Total</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pool.availableColors.map(color => (
                          <div key={color} className="flex items-center bg-slate-900 rounded border border-slate-800 overflow-hidden">
                            <div className="w-3 h-full" style={{ backgroundColor: color }} />
                            <input
                              type="number"
                              min="0"
                              value={pool.bagDefinition[color] || 0}
                              onChange={(e) => updateBagDefinition(pool.id, color, parseInt(e.target.value) || 0)}
                              className="w-8 bg-transparent text-[10px] font-bold text-center text-slate-300 outline-none p-1"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-[9px] text-slate-600 uppercase font-bold">Current Status: <span className="text-slate-300">{pool.currentBag.length} left</span></span>
                        <button onClick={() => resetBag(pool.id)} className="text-[9px] bg-purple-900/40 hover:bg-purple-800/40 text-purple-300 border border-purple-800/50 px-2 py-1 rounded uppercase font-black transition-colors">Resupply Bag</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {pool.entries.map((entry) => {
                      const isCustom = typeof entry.diceType === 'string' && !STANDARD_DICE_TYPES.includes(entry.diceType);
                      return (
                        <div key={entry.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-700/50 flex flex-col gap-2.5 shadow-inner transition-colors hover:border-slate-600">
                          <div className="flex items-center gap-2">
                            <input type="number" min="1" value={entry.count} onChange={(e) => updateDiceEntry(pool.id, entry.id, { count: parseInt(e.target.value) || 1 })} className="w-10 bg-slate-900 border border-slate-800 rounded p-1 text-[11px] text-slate-300 outline-none font-bold text-center" />
                            <select
                              value={entry.diceType}
                              onChange={(e) => {
                                const val = e.target.value;
                                const standard = STANDARD_DICE_TYPES.includes(val);
                                updateDiceEntry(pool.id, entry.id, { diceType: (standard ? parseInt(val) : val) as DiceType });
                              }}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded p-1 text-[11px] text-slate-300 outline-none font-bold appearance-none px-2"
                            >
                              <optgroup label="Standard" className="bg-[#0a0f1d]">{STANDARD_DICE_TYPES.map(d => <option key={d} value={d}>D{d}</option>)}</optgroup>
                              {customDice.length > 0 && <optgroup label="Assets" className="bg-[#0a0f1d]">{customDice.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</optgroup>}
                            </select>
                            <button onClick={() => removeDiceEntry(pool.id, entry.id)} className="text-slate-700 hover:text-rose-500 transition-colors shrink-0"><Minus className="w-4 h-4" /></button>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-slate-800/40">
                            <div className="flex items-center justify-between"><label className="text-[8px] text-slate-600 uppercase font-black tracking-widest">Threshold</label></div>
                            <div className="flex items-center gap-2">
                              <select
                                value={entry.thresholdType}
                                onChange={(e) => updateDiceEntry(pool.id, entry.id, { thresholdType: e.target.value as ThresholdType })}
                                className="flex-1 bg-slate-900 border border-slate-800 rounded p-1 text-[10px] text-slate-400 outline-none font-bold"
                              >
                                <option value={ThresholdType.NONE}>None</option>
                                {!isCustom && (
                                  <>
                                    <option value={ThresholdType.AT_LEAST}>&ge;</option>
                                    <option value={ThresholdType.AT_MOST}>&le;</option>
                                    <option value={ThresholdType.EXACTLY}>=</option>
                                  </>
                                )}
                                <option value={ThresholdType.MATCH_ANY}>Filter</option>
                              </select>
                              {!isCustom && entry.thresholdType !== ThresholdType.NONE && entry.thresholdType !== ThresholdType.MATCH_ANY && (
                                <input
                                  type="text"
                                  value={entry.threshold}
                                  onChange={(e) => updateDiceEntry(pool.id, entry.id, { threshold: e.target.value })}
                                  className="w-10 bg-slate-900 border border-slate-800 rounded p-1 text-[10px] text-slate-300 outline-none font-bold text-center"
                                />
                              )}
                            </div>
                            {(entry.thresholdType === ThresholdType.MATCH_ANY || (isCustom && entry.thresholdType !== ThresholdType.NONE)) && (
                              <div className="p-1.5 bg-slate-900/50 rounded flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                                {getEntryUniqueFaces(entry).map(val => {
                                  const isSel = entry.targetValues.some(v => v.toString().trim().toUpperCase() === val.toString().trim().toUpperCase());
                                  return (
                                    <button
                                      key={val}
                                      onClick={() => toggleEntryTargetValue(pool.id, entry.id, val)}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${isSel ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-glow-blue' : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-600'}`}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-1.5 flex-wrap items-center pt-1">
                            <button onClick={() => updateDiceEntry(pool.id, entry.id, { color: undefined })} className={`w-3.5 h-3.5 rounded-full border border-slate-600 relative overflow-hidden transition-all ${!entry.color ? 'ring-2 ring-blue-500' : 'opacity-40 hover:opacity-100'}`}><div className="absolute inset-0 bg-slate-500/20 rotate-45 border-t border-slate-400" /></button>
                            {PRESET_COLORS.slice(0, 6).map(c => <button key={c} onClick={() => updateDiceEntry(pool.id, entry.id, { color: c })} className={`w-3.5 h-3.5 rounded-full border border-white/10 transition-all ${entry.color === c ? 'ring-2 ring-blue-500 scale-110' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: c }} />)}
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => addDiceEntry(pool.id)} className="w-full py-2 bg-slate-900/60 hover:bg-slate-900 border border-dashed border-slate-700 rounded-lg text-[9px] font-black uppercase text-slate-500 hover:text-blue-400 transition-all">+ Add Dice Group</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Resize Handle */}
        {isSidebarOpen && (
          <div
            onMouseDown={startResizing}
            className="resize-handle absolute top-0 -right-1 w-2.5 h-full cursor-col-resize z-50 flex items-center justify-center transition-colors hover:bg-blue-600/50"
          >
            <div className="w-0.5 h-12 bg-slate-700 rounded-full" />
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0a0f1d_100%)]">
        {editingCustomDie && (
          <div className="absolute top-0 right-0 w-[400px] h-full bg-[#0f172a] shadow-2xl z-50 border-l border-slate-800 p-8 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-3 text-blue-500"><Settings2 className="w-6 h-6" /><h3 className="text-[12px] font-black uppercase tracking-widest text-slate-100">Asset Forge</h3></div><button onClick={() => setEditingCustomDieId(null)} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X className="w-6 h-6" /></button></div>
            <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="space-y-2"><label className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Name</label><input value={editingCustomDie.name} onChange={(e) => updateCustomDie(editingCustomDie.id, { name: e.target.value })} className="w-full bg-[#0a0f1d] border border-slate-800 rounded-lg p-3 text-[13px] text-slate-100 outline-none font-bold focus:border-blue-500 transition-colors" /></div>
              <div className="space-y-3"><label className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Die Color</label><div className="flex flex-wrap gap-2">{PRESET_COLORS.map(color => (<button key={color} onClick={() => updateCustomDie(editingCustomDie.id, { color })} className={`w-8 h-8 rounded-full border-2 transition-all ${editingCustomDie.color === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-80'}`} style={{ backgroundColor: color }} />))}</div></div>
              <div className="space-y-5">
                <div className="flex items-center justify-between mb-1"><label className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Face Values</label><div className="flex gap-1.5"><button onClick={() => applyTemplate(editingCustomDie.id, 'numbers')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[9px] font-black uppercase text-slate-400 rounded-full transition-colors">D6 Std</button><button onClick={() => applyTemplate(editingCustomDie.id, 'binary')} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[9px] font-black uppercase text-slate-400 rounded-full transition-colors">Binary</button></div></div>
                <div className="space-y-2">{editingCustomDie.sides.map((side, idx) => (
                  <div key={side.id} className="flex items-center gap-3 group/side"><div className="w-8 h-8 bg-slate-900 border border-slate-800 rounded flex items-center justify-center font-mono text-[10px] text-slate-600 font-black shrink-0">{idx + 1}</div><input value={side.content} onChange={(e) => updateSideContent(editingCustomDie.id, side.id, e.target.value)} className="flex-1 bg-[#0a0f1d] border border-slate-800 rounded-md p-2 text-[13px] text-slate-300 outline-none font-bold focus:border-blue-500" /><button onClick={() => removeSideFromDie(editingCustomDie.id, side.id)} className="opacity-0 group-hover/side:opacity-100 p-1.5 text-slate-700 hover:text-rose-500 transition-all"><Trash2 className="w-5 h-5" /></button></div>
                ))}<button onClick={() => addSideToDie(editingCustomDie.id)} className="w-full py-3.5 border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center gap-2 text-slate-600 hover:text-blue-500 hover:border-blue-500 uppercase font-black text-[10px] transition-all">+ Add Face</button></div>
              </div>
            </div>
            <button onClick={() => setEditingCustomDieId(null)} className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-[12px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"><Save className="w-5 h-5" /> Finalize Asset</button>
          </div>
        )}

        <header className="p-4 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between backdrop-blur-xl shrink-0 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"><Menu className="w-6 h-6" /></button>}
            <h2 className="text-base font-black text-slate-100 uppercase tracking-tighter hidden sm:block">Tactical Overview</h2>
            <div className="flex gap-2"><button onClick={rollAllPools} disabled={pools.length === 0} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800/50 px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"><RefreshCw className="w-5 h-5" /> Deploy All</button><button onClick={clearResults} className="p-2 text-slate-500 hover:text-slate-300 transition-colors" title="Clear Results"><RotateCcw className="w-6 h-6" /></button></div>
          </div>
          <button onClick={() => setShowGlobalLog(!showGlobalLog)} className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full transition-all border shadow-md ${showGlobalLog ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800/40 border-slate-800 text-slate-600 hover:border-slate-500'}`}><History className="w-5 h-5" /> {showGlobalLog ? 'Hide Intel' : 'Tactical Logs'}</button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {showGlobalLog && globalHistory.length > 0 && (
            <div className="mb-8 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="px-5 py-3.5 bg-slate-800/60 border-b border-slate-700 flex items-center justify-between transition-colors hover:bg-slate-800" onClick={() => setIsLogMinimized(!isLogMinimized)}>
                <div className="flex items-center gap-3 cursor-pointer select-none"><Clock className="w-5 h-5 text-blue-400" /><span className="text-[11px] uppercase font-black text-slate-400 tracking-widest">Deployment History</span>{isLogMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</div>
                <button onClick={clearGlobalHistory} className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors"><Eraser className="w-5 h-5" /></button>
              </div>
              {!isLogMinimized && <div className="max-h-72 overflow-y-auto custom-scrollbar p-4"><div className="grid gap-2">{globalHistory.map((entry) => (<div key={entry.id} className="flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg text-[11px] hover:bg-slate-900 group transition-all"><span className="text-slate-700 font-mono w-24 shrink-0">{new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span><div className="flex-1 flex items-center gap-3 overflow-hidden"><Layers className="w-4 h-4 text-blue-400 shrink-0" /><span className="font-black text-slate-300 uppercase truncate max-w-[200px]">{entry.poolName}</span></div><div className="flex gap-6 items-center shrink-0"><span className="text-emerald-500 font-black tracking-widest">{entry.successes} HITS</span><span className="text-blue-500 font-black tracking-widest">&Sigma; {entry.sum}</span></div></div>))}</div></div>}
            </div>
          )}

          {pools.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20"><Dice5 className="w-40 h-40 stroke-[0.3]" /><h3 className="text-[14px] font-black uppercase tracking-[0.4em] mt-8 text-slate-500">Fleet At Standby</h3></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 pb-20">
              {pools.map(pool => {
                const poolSum = pool.results.reduce((acc, r) => acc + (typeof r.value === 'number' ? r.value : (parseFloat(r.value as string) || 0)), 0);
                const successCount = pool.results.filter(r => r.isSuccess).length;
                const isHistCollapsed = collapsedPoolHistories[pool.id] ?? true;

                return (
                  <div key={pool.id} className={`flex flex-col bg-slate-900/40 border-2 border-slate-800 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${pool.mode === PoolMode.BLIND_BAG ? 'border-purple-900/40 shadow-purple-950/20' : 'shadow-slate-950/40'}`}>
                    <div className="p-5 border-b-2 border-slate-800/50 bg-slate-950/20 flex items-center justify-between gap-5">
                      <div className="flex-1 min-w-0">
                        <input value={pool.name} onChange={(e) => updatePool(pool.id, { name: e.target.value })} className="bg-transparent font-black text-xl text-slate-100 outline-none w-full uppercase truncate focus:text-blue-400 transition-colors" />
                        <div className="mt-2.5 flex gap-2.5">
                          {pool.mode === PoolMode.BLIND_BAG ? (
                            <span className="bg-purple-600/10 text-purple-400 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-purple-600/20 shadow-sm flex items-center gap-2">
                              <PackageOpen className="w-3 h-3" />
                              Bag: {pool.currentBag.length} / {Object.values(pool.bagDefinition).reduce((a, b) => a + b, 0)}
                            </span>
                          ) : (
                            <span className="bg-blue-600/10 text-blue-400 px-3 py-1 rounded-full text-[9px] font-black uppercase border border-blue-600/20 shadow-sm">CMP: {pool.entries.length}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-5 shrink-0">
                        <div className="text-right">
                          <span className={`block text-4xl font-black leading-none tracking-tighter ${successCount > 0 ? 'text-emerald-500' : 'text-blue-500'}`}>{successCount > 0 || pool.results.some(r => r.isSuccess === false) ? successCount : pool.results.length}</span>
                          <span className="block text-[10px] text-slate-600 uppercase font-black mt-2 tracking-widest">Confirms</span>
                        </div>
                        <button onClick={() => rollPool(pool.id)} className={`w-16 h-16 rounded-2xl flex items-center justify-center active:scale-90 group/roll shadow-2xl transition-all ${pool.mode === PoolMode.BLIND_BAG ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500'} text-white`}><RefreshCw className="w-8 h-8 group-active/roll:rotate-180 transition-transform duration-500" /></button>
                      </div>
                    </div>

                    <div className="p-6 flex-1 bg-slate-950/30 min-h-[160px] flex items-center justify-center">
                      <div className="flex flex-wrap gap-3.5 justify-center max-w-full">
                        {pool.results.length > 0 ? pool.results.map((res, idx) => (
                          <div key={`${pool.id}-res-${idx}`} className="animate-in zoom-in-75 fade-in duration-300" style={{ animationDelay: `${idx * 20}ms` }}>
                            <DiceIcon type={res.diceType} value={res.value} isSuccess={res.isSuccess} size="md" color={res.color} />
                          </div>
                        )) : (
                          <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/40 rounded-3xl w-64 opacity-30 shadow-inner">
                            <Dices className="w-8 h-8 mb-2.5 text-slate-700" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Deployment Standby</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border-t-2 border-slate-800/40 p-5 flex flex-col gap-4">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600 tracking-widest">
                        <div className="flex gap-6">
                          {pool.lastRolledAt && <span className="flex items-center gap-2.5"><span className="text-slate-700 font-mono text-xs">&Sigma;</span> <span className="text-blue-500 font-mono text-sm">{poolSum}</span></span>}
                        </div>
                        <div className="flex gap-4 items-center">
                          {pool.mode === PoolMode.BLIND_BAG && <button onClick={() => resetBag(pool.id)} className="text-purple-400 hover:text-purple-300 uppercase flex items-center gap-2 transition-colors"><RotateCcw className="w-3.5 h-3.5" /> Refill</button>}
                          {pool.mode === PoolMode.BLIND_BAG && (
                            <div className="flex items-center gap-1 text-purple-500/50">
                              <span className="h-4 w-px bg-purple-800/50 block"></span>
                            </div>
                          )}
                          <button onClick={() => togglePoolHistory(pool.id)} className="hover:text-white flex items-center gap-2.5 transition-colors">Logs ({pool.history.length}) {isHistCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</button>
                        </div>
                      </div>
                      {!isHistCollapsed && pool.history.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 animate-in slide-in-from-top-2 duration-300">
                          {pool.history.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-mono hover:bg-slate-900 transition-all">
                              <span className="text-slate-700">{new Date(item.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit' })}</span>
                              <div className="flex gap-5 items-center">
                                <span className={`${item.successes > 0 ? 'text-emerald-500' : 'text-slate-600'} font-black tracking-widest`}>{item.successes} H</span>
                                <span className="text-blue-600">&Sigma; {item.sum}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="p-4 bg-slate-950 border-t border-slate-800 text-[10px] font-black uppercase tracking-[0.4em] text-slate-700 flex justify-between items-center shrink-0">
          <div className="flex gap-12"><span>FLEET_BRIDGE_ACTIVE</span><span>CHROMA_SYNC_ESTABLISHED</span></div>
          <div className="flex items-center gap-5"><span className="opacity-20 font-mono">STB_V5.1_DEPLOY</span><span className="font-mono text-slate-800 tracking-normal">TACTICIAN_IO</span></div>
        </footer>
      </main>
    </div>
  );
};

export default App;

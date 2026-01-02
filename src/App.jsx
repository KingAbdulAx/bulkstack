import React, { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw, ShoppingCart, CheckCircle, Edit3, X, Plus, Trash2, Settings, Sparkles, Loader, Flame, Trophy } from 'lucide-react';
import { generateModuleWithAI } from './ai';

// --- DEFAULT DATA (Fallback if storage is empty) ---

const DEFAULT_MODULES = {
  breakfast: [
    { id: 'B1', name: 'Eggs & Carbs', desc: '3-6 Eggs + Bread/Yam', ingredients: ['Eggs', 'Bread', 'Butter'] },
    { id: 'B2', name: 'Oats Power Bowl', desc: 'Oats + Milk + PB + Banana', ingredients: ['Oats', 'Milk', 'Peanut Butter', 'Banana'] },
    { id: 'B3', name: 'Beans Combo', desc: 'Beans + Bread/Garri + Protein', ingredients: ['Beans', 'Bread', 'Fish'] },
  ],
  lunch: [
    { id: 'L1', name: 'Rice Combo', desc: 'Rice + Meat/Fish + Stew', ingredients: ['Rice', 'Chicken', 'Tomatoes', 'Veg Oil'] },
    { id: 'L2', name: 'Yam Combo', desc: 'Boiled Yam + Egg/Fish Sauce', ingredients: ['Yam', 'Eggs', 'Tomatoes', 'Veg Oil'] },
    { id: 'L3', name: 'Swallow Combo', desc: 'Eba/Semo + Soup + Protein', ingredients: ['Garri', 'Egusi', 'Beef', 'Palm Oil', 'Ugu'] },
  ],
  dinner: [
    { id: 'D1', name: 'Protein Plate', desc: 'Meat/Fish + Small Carb + Veg', ingredients: ['Fish', 'Potatoes', 'Cabbage'] },
    { id: 'D2', name: 'Beans & Protein', desc: 'Beans + Fish/Egg + Veg', ingredients: ['Beans', 'Fish', 'Plantain'] },
    { id: 'D3', name: 'Oats Reload', desc: 'Oats + Milk + PB', ingredients: ['Oats', 'Milk', 'Peanut Butter'] },
  ],
  snack: [
    { id: 'S1', name: 'Nuts & Fruit', desc: 'Groundnuts + Banana', ingredients: ['Groundnuts', 'Banana'] },
    { id: 'S2', name: 'Dairy Load', desc: 'Milk + Bread', ingredients: ['Milk', 'Bread'] },
    { id: 'S3', name: 'Yogurt Bowl', desc: 'Yogurt + Granola', ingredients: ['Yogurt', 'Granola'] },
  ]
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function BulkStack() {
  // --- STATE ---

  // 1. The Custom Modules (The Menu)
  const [modules, setModules] = useState(() => {
    const saved = localStorage.getItem('bulkstack-modules');
    return saved ? JSON.parse(saved) : DEFAULT_MODULES;
  });

  // 2. The Weekly Plan (The Schedule)
  const [plan, setPlan] = useState({});

  // 3. UI State
  const [view, setView] = useState('planner');
  const [selectedSlot, setSelectedSlot] = useState(null); // { day, type }
  const [editingModule, setEditingModule] = useState(null); // { type, data } for the form modal

  // 4. AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiModal, setShowAiModal] = useState(null); // 'breakfast', 'lunch', etc.

  // 5. Planner Logic
  const plannerScrollRef = useRef(null);

  // Determine current day index (0=Monday, 6=Sunday)
  const getCurrentDayIndex = () => {
    const day = new Date().getDay(); // 0=Sun, 1=Mon...
    // Convert to 0=Mon, ..., 6=Sun
    return day === 0 ? 6 : day - 1;
  };

  const handleAIGeneration = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const result = await generateModuleWithAI(aiPrompt, showAiModal);

      // Add ID and save to modules
      const newModule = {
        ...result,
        id: `${showAiModal.charAt(0).toUpperCase()}AI-${Date.now().toString().slice(-3)}`
      };

      setModules(prev => ({
        ...prev,
        [showAiModal]: [...prev[showAiModal], newModule]
      }));

      // Reset and close
      setAiPrompt("");
      setShowAiModal(null);
    } catch (err) {
      alert("AI Failed to generate. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- STORAGE EFFECTS ---

  useEffect(() => {
    localStorage.setItem('bulkstack-modules', JSON.stringify(modules));
  }, [modules]);

  useEffect(() => {
    const savedPlan = localStorage.getItem('bulkstack-plan');
    if (savedPlan) {
      setPlan(JSON.parse(savedPlan));
    } else {
      initializeDefaultPlan();
    }
  }, []); // Only runs on mount

  useEffect(() => {
    if (Object.keys(plan).length > 0) {
      localStorage.setItem('bulkstack-plan', JSON.stringify(plan));
    }
  }, [plan]);

  // Auto-scroll to today when planner view is active
  useEffect(() => {
    if (view === 'planner' && plannerScrollRef.current) {
      const todayIndex = getCurrentDayIndex();
      // Simple logic: scroll width * index. Better to use scrollIntoView if we had refs for each card, 
      // but simple math works for full-width cards or snapping.
      // Let's rely on native scrollIntoView behavior if we can, but simpler:
      // Just wait a tick for render
      setTimeout(() => {
        const card = plannerScrollRef.current?.children[todayIndex];
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
    }
  }, [view]);

  // --- ACTIONS ---

  const initializeDefaultPlan = () => {
    // If modules changed, we want the plan to use the current available modules
    const defaultPlan = {};
    DAYS.forEach(day => {
      defaultPlan[day] = {
        breakfast: modules.breakfast[0],
        lunch: modules.lunch[0],
        dinner: modules.dinner[0],
        snack: modules.snack[0],
        completed: { breakfast: false, lunch: false, dinner: false, snack: false }
      };
    });
    setPlan(defaultPlan);
  };

  const handleModuleSelect = (module) => {
    if (!selectedSlot) return;
    const { day, type } = selectedSlot;

    setPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: module
      }
    }));
    setSelectedSlot(null);
  };

  const toggleComplete = (day, type) => {
    setPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        completed: {
          ...prev[day].completed,
          [type]: !prev[day].completed[type]
        }
      }
    }));
  };

  // --- MODULE MANAGEMENT ACTIONS ---

  const saveModule = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const category = editingModule.type; // breakfast, lunch, etc.

    // Parse ingredients from string to array
    const ingString = formData.get('ingredients');
    const ingArray = ingString.split(',').map(i => i.trim()).filter(i => i);

    const newModuleData = {
      id: formData.get('id') || `${category.charAt(0).toUpperCase()}${Date.now().toString().slice(-3)}`, // Generate ID if new
      name: formData.get('name'),
      desc: formData.get('desc'),
      ingredients: ingArray
    };

    setModules(prev => {
      const catList = prev[category];
      // Check if updating existing or adding new
      const exists = catList.find(m => m.id === newModuleData.id);

      let newList;
      if (exists) {
        newList = catList.map(m => m.id === newModuleData.id ? newModuleData : m);
      } else {
        newList = [...catList, newModuleData];
      }

      return { ...prev, [category]: newList };
    });

    setEditingModule(null);
  };

  const deleteModule = (category, moduleId) => {
    if (!window.confirm("Delete this meal? This won't remove it from days already planned.")) return;
    setModules(prev => ({
      ...prev,
      [category]: prev[category].filter(m => m.id !== moduleId)
    }));
  };

  // --- SHOPPING LOGIC ---

  const generateShoppingList = () => {
    const list = {};
    Object.values(plan).forEach(dayPlan => {
      ['breakfast', 'lunch', 'dinner', 'snack'].forEach(type => {
        const ingredients = dayPlan[type]?.ingredients || [];
        ingredients.forEach(item => {
          // Normalize string (lowercase) to avoid duplicate "Eggs" and "eggs"
          const key = item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
          list[key] = (list[key] || 0) + 1;
        });
      });
    });
    return Object.entries(list).sort();
  };

  // --- GAMIFICATION LOGIC ---
  const calculateDailyProgress = (day) => {
    const dayPlan = plan[day];
    if (!dayPlan) return 0;
    const total = 4; // B, L, D, S
    let completed = 0;
    if (dayPlan.completed.breakfast) completed++;
    if (dayPlan.completed.lunch) completed++;
    if (dayPlan.completed.dinner) completed++;
    if (dayPlan.completed.snack) completed++;
    return Math.round((completed / total) * 100);
  };

  const calculateStreak = () => {
    // Determine streak based on fully completed days up to today
    // Simple logic: consecutive days with >0% progress? or 100%? Let's say > 50% for "consistency"
    // Or just count total Fully Completed days in the week.
    let streak = 0;
    // We'll just count total 100% days for now as "Trophies"
    Object.values(plan).forEach(p => {
      const completedCount = Object.values(p.completed).filter(Boolean).length;
      if (completedCount === 4) streak++;
    });
    return streak;
  };

  // --- RENDER HELPERS ---

  const renderModuleSelector = () => {
    if (!selectedSlot) return null;
    const { type } = selectedSlot;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-xl p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white capitalize">Swap {type}</h3>
            <button onClick={() => setSelectedSlot(null)}><X className="text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            {modules[type].map(mod => (
              <button
                key={mod.id}
                onClick={() => handleModuleSelect(mod)}
                className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-green-500 transition-all group"
              >
                <div className="flex justify-between">
                  <span className="font-bold text-green-400 group-hover:text-green-300">{mod.id}</span>
                  <span className="text-white font-semibold">{mod.name}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">{mod.desc}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setSelectedSlot(null);
              setView('manager');
            }}
            className="w-full mt-4 py-3 border border-dashed border-gray-600 text-gray-400 rounded-lg text-sm hover:text-white hover:border-white transition-colors"
          >
            + Create New {type} Option
          </button>
        </div>
      </div>
    );
  };

  const renderEditorModal = () => {
    if (!editingModule) return null;
    const { type, data } = editingModule;
    const isNew = !data.id;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <form onSubmit={saveModule} className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white capitalize">{isNew ? 'Create' : 'Edit'} {type}</h3>
            <button type="button" onClick={() => setEditingModule(null)}><X className="text-gray-400" /></button>
          </div>

          <input type="hidden" name="id" value={data.id || ''} />

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Meal Name</label>
              <input name="name" defaultValue={data.name} required className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-green-500 outline-none" placeholder="e.g. Super Bulking Pasta" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Short Description</label>
              <input name="desc" defaultValue={data.desc} required className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-green-500 outline-none" placeholder="e.g. Pasta + Turkey + Cheese" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Ingredients (for Shopping List)</label>
              <textarea
                name="ingredients"
                defaultValue={data.ingredients?.join(', ')}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white focus:border-green-500 outline-none h-24"
                placeholder="Separate with commas: Pasta, Turkey, Vegetable Oil, Pepper"
              />
              <p className="text-[10px] text-gray-500 mt-1">Separate items with commas so the shopping list can count them.</p>
            </div>
          </div>

          <button type="submit" className="w-full mt-6 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-colors">
            Save Module
          </button>
        </form>
      </div>
    );
  }

  const renderAIModal = () => {
    if (!showAiModal) return null;
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <div className="bg-gray-900 border border-purple-500/50 w-full max-w-md rounded-xl p-6 shadow-2xl shadow-purple-900/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-purple-500" /> AI Chef
            </h3>
            <button onClick={() => setShowAiModal(null)}><X className="text-gray-400" /></button>
          </div>

          <p className="text-sm text-gray-400 mb-4">
            Describe what you have or want. <br />
            <span className="italic opacity-70">Ex: "Cheap high protein with eggs" or "Leftover rice and plantain"</span>
          </p>

          <form onSubmit={handleAIGeneration}>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none h-24 mb-4"
              placeholder="Tell the AI what to cook..."
              autoFocus
            />

            <button
              type="submit"
              disabled={isGenerating || !aiPrompt.trim()}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2"
            >
              {isGenerating ? <Loader className="animate-spin" /> : "Generate Module"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN VIEWS ---

  const PlannerView = () => {
    const todayIndex = getCurrentDayIndex();
    const streak = calculateStreak();

    return (
      <div className="space-y-4">
        {/* Gamification Header */}
        <div className="flex gap-4 overflow-x-auto pb-2">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 flex-1 flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-full">
              <Flame className="text-orange-500" size={20} fill="currentColor" />
            </div>
            <div>
              <div className="text-xl font-black text-white leading-none">{streak}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Perfect Days</div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 flex-1 flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <Trophy className="text-yellow-500" size={20} />
            </div>
            <div>
              <div className="text-xl font-black text-white leading-none">Rank</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Iron Lifter</div>
            </div>
          </div>
        </div>

        {/* Horizontal Scroll Days */}
        <div
          ref={plannerScrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-4 px-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }} // Firefox hide scrollbar
        >
          {DAYS.map((day, index) => {
            const isToday = index === todayIndex;
            const progress = calculateDailyProgress(day);

            return (
              <div
                key={day}
                className={`snap-center shrink-0 w-[90vw] md:w-[350px] bg-gray-900/80 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all duration-300 relative ${isToday ? 'border-green-500 shadow-lg shadow-green-900/20' : 'border-white/5'}`}
              >
                {/* Day Header */}
                <div className={`p-4 flex justify-between items-center ${isToday ? 'bg-green-500/10' : 'bg-black/20'}`}>
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      {day}
                      {isToday && <span className="text-[10px] bg-green-500 text-black px-2 py-0.5 rounded-full font-bold">TODAY</span>}
                    </h2>
                    <div className="text-xs text-gray-400 font-mono flex items-center gap-1">
                      {progress}% COMPLETED
                    </div>
                  </div>
                  {/* Progress Ring Mini */}
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-800" />
                      <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-green-500" strokeDasharray={100} strokeDashoffset={100 - progress} />
                    </svg>
                  </div>
                </div>

                {/* Meals */}
                <div className="p-4 space-y-3">
                  {['breakfast', 'lunch', 'dinner', 'snack'].map(type => {
                    const meal = plan[day]?.[type];
                    const isDone = plan[day]?.completed?.[type];

                    return (
                      <div
                        key={type}
                        className={`relative group rounded-xl p-3 border transition-all duration-200 ${isDone ? 'bg-green-950/30 border-green-500/30' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider bg-black/40 px-1.5 rounded">{type}</span>
                            </div>
                            <div className={`font-bold text-sm ${isDone ? 'text-green-400/70 line-through' : 'text-white'}`}>
                              {meal?.name}
                            </div>
                            {!isDone && <div className="text-xs text-gray-400 truncate max-w-[200px]">{meal?.desc}</div>}
                          </div>

                          <button
                            onClick={() => toggleComplete(day, type)}
                            className={`ml-3 p-2 rounded-full transition-all ${isDone ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                          >
                            <CheckCircle size={18} />
                          </button>
                        </div>

                        {/* Swap Button only visible on specific conditions or usually hidden to clean UI? Let's add it discreetly */}
                        <button
                          onClick={() => setSelectedSlot({ day, type })}
                          className="absolute bottom-2 right-12 p-2 text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-600 italic">Swipe to see other days →</p>
      </div>
    );
  };

  const ShoppingView = () => {
    const items = generateShoppingList();
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <ShoppingCart className="text-green-500" /> Shopping List
        </h2>
        {items.length === 0 ? (
          <p className="text-gray-500 italic">Plan your week first to see items here.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(([item, count]) => (
              <div key={item} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                <span className="text-white font-medium capitalize">{item}</span>
                <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded-full font-mono">
                  {count > 1 ? `${count}x` : '1x'}
                </span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => setView('planner')} className="mt-8 w-full py-3 bg-gray-700 text-white rounded-lg font-bold">
          Back to Planner
        </button>
      </div>
    );
  };

  const ManagerView = () => (
    <div className="space-y-8 pb-20">
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-2">Module Manager</h2>
        <p className="text-sm text-gray-400">Create or edit your meal templates here. Any changes will appear in the swap menu.</p>
      </div>

      {['breakfast', 'lunch', 'dinner', 'snack'].map(category => (
        <div key={category}>
          <div className="flex justify-between items-end mb-4 px-1">
            <h3 className="text-green-400 font-bold uppercase tracking-wider text-sm">{category} Modules</h3>
            {/* AI BUTTON */}
            <button
              onClick={() => setShowAiModal(category)}
              className="text-xs bg-purple-600 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-purple-500 border border-purple-400"
            >
              <Sparkles size={12} /> AI Gen
            </button>
            <button
              onClick={() => setEditingModule({ type: category, data: {} })}
              className="text-xs bg-white text-black px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-gray-200"
            >
              <Plus size={12} /> Add Manual
            </button>
          </div>

          <div className="grid gap-3">
            {modules[category].map(mod => (
              <div key={mod.id} className="bg-gray-900 border border-gray-800 p-4 rounded-lg flex justify-between items-center">
                <div>
                  <div className="font-bold text-white flex gap-2 items-center">
                    <span className="text-gray-500 text-xs bg-gray-800 px-1 rounded border border-gray-700">{mod.id}</span>
                    {mod.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 max-w-[200px] truncate">{mod.ingredients.join(', ')}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingModule({ type: category, data: mod })}
                    className="p-2 bg-gray-800 text-gray-300 rounded hover:text-white border border-gray-700"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => deleteModule(category, mod.id)}
                    className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 border border-transparent hover:border-red-900"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-gray-200 p-4 font-sans selection:bg-green-500 selection:text-black">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">BULK<span className="text-green-500">STACK</span></h1>
            <p className="text-xs text-gray-500 font-mono">v2.1 // GAMIFIED</p>
          </div>
          <button onClick={() => {
            if (window.confirm("Reset entire plan?")) initializeDefaultPlan();
          }} className="text-xs text-red-500 underline">Reset Week</button>
        </div>

        {view === 'planner' && <PlannerView />}
        {view === 'shopping' && <ShoppingView />}
        {view === 'manager' && <ManagerView />}

        {/* Floating Nav */}
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 px-4 pointer-events-none">
          <div className="pointer-events-auto bg-gray-900/90 border border-gray-700 rounded-2xl px-6 py-4 shadow-2xl flex gap-8 items-center backdrop-blur-xl">
            <button onClick={() => setView('planner')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'planner' ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}>
              <Edit3 size={20} />
              <span className="text-[10px] font-bold">PLAN</span>
            </button>
            <button onClick={() => setView('shopping')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'shopping' ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}>
              <ShoppingCart size={20} />
              <span className="text-[10px] font-bold">SHOP</span>
            </button>
            <button onClick={() => setView('manager')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'manager' ? 'text-green-500' : 'text-gray-500 hover:text-white'}`}>
              <Settings size={20} />
              <span className="text-[10px] font-bold">MANAGE</span>
            </button>
          </div>
        </div>

        {renderModuleSelector()}
        {renderEditorModal()}
        {renderAIModal()}
      </div>
    </div>
  );
}
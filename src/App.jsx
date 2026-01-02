import React, { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw, ShoppingCart, CheckCircle, Edit3, X, Plus, Trash2, Settings, Sparkles, Loader, Flame, Trophy, MessageSquare, ArrowRight, Send } from 'lucide-react';
import { chatWithAgent, generateWeeklyPlan } from './ai';

// --- DEFAULT DATA (Fallback if storage is empty) ---

const DEFAULT_MODULES = [
  { id: 'B1', name: 'Eggs & Carbs', desc: '3-6 Eggs + Bread/Yam', ingredients: ['Eggs', 'Bread', 'Butter'] },
  { id: 'B2', name: 'Oats Power Bowl', desc: 'Oats + Milk + PB + Banana', ingredients: ['Oats', 'Milk', 'Peanut Butter', 'Banana'] },
  { id: 'B3', name: 'Beans Combo', desc: 'Beans + Bread/Garri + Protein', ingredients: ['Beans', 'Bread', 'Fish'] },
  { id: 'L1', name: 'Rice Combo', desc: 'Rice + Meat/Fish + Stew', ingredients: ['Rice', 'Chicken', 'Tomatoes', 'Veg Oil'] },
  { id: 'L2', name: 'Yam Combo', desc: 'Boiled Yam + Egg/Fish Sauce', ingredients: ['Yam', 'Eggs', 'Tomatoes', 'Veg Oil'] },
  { id: 'L3', name: 'Swallow Combo', desc: 'Eba/Semo + Soup + Protein', ingredients: ['Garri', 'Egusi', 'Beef', 'Palm Oil', 'Ugu'] },
  { id: 'D1', name: 'Protein Plate', desc: 'Meat/Fish + Small Carb + Veg', ingredients: ['Fish', 'Potatoes', 'Cabbage'] },
  { id: 'D2', name: 'Beans & Protein', desc: 'Beans + Fish/Egg + Veg', ingredients: ['Beans', 'Fish', 'Plantain'] },
  { id: 'D3', name: 'Oats Reload', desc: 'Oats + Milk + PB', ingredients: ['Oats', 'Milk', 'Peanut Butter'] },
  { id: 'S1', name: 'Nuts & Fruit', desc: 'Groundnuts + Banana', ingredients: ['Groundnuts', 'Banana'] },
  { id: 'S2', name: 'Dairy Load', desc: 'Milk + Bread', ingredients: ['Milk', 'Bread'] },
  { id: 'S3', name: 'Yogurt Bowl', desc: 'Yogurt + Granola', ingredients: ['Yogurt', 'Granola'] },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function BulkStack() {
  // --- STATE ---

  // 1. Universal Modules (Array) - MIGRATION LOGIC
  const [modules, setModules] = useState(() => {
    const saved = localStorage.getItem('bulkstack-modules-v2');
    if (saved) return JSON.parse(saved);

    // Migration: Check old V1 key
    const old = localStorage.getItem('bulkstack-modules');
    if (old) {
      const parsed = JSON.parse(old);
      // Flatten
      const flat = [];
      if (!Array.isArray(parsed)) {
        Object.values(parsed).forEach(list => flat.push(...list));
        return flat;
      }
      return parsed;
    }
    return DEFAULT_MODULES;
  });

  // 2. The Weekly Plan
  const [plan, setPlan] = useState({});

  // 3. Pantry & Context
  const [pantry, setPantry] = useState(() => {
    const saved = localStorage.getItem('bulkstack-pantry');
    return saved ? JSON.parse(saved) : [];
  });

  const [aiContext, setAiContext] = useState(() => {
    const saved = localStorage.getItem('bulkstack-context');
    return saved ? JSON.parse(saved) : { missedMeals: [], preferences: "" };
  });

  // 4. UI State
  const [view, setView] = useState('planner');
  const [selectedSlot, setSelectedSlot] = useState(null); // { day, type }
  const [editingModule, setEditingModule] = useState(null); // { type, data } for the form modal

  // 5. Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([{ role: 'model', text: 'Hi! I am your BulkStack Agent. Tell me what you ate or what you need.' }]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingProposal, setPendingProposal] = useState(null);

  const messagesEndRef = useRef(null);
  const plannerScrollRef = useRef(null);

  // --- CHAT LOGIC ---

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    const appState = { pantry, modules, plan, context: aiContext };
    const result = await chatWithAgent(userMsg, chatHistory, appState);

    setIsTyping(false);
    setChatHistory(prev => [...prev, { role: 'model', text: result.reply }]);

    if (result.proposal) {
      setPendingProposal(result.proposal);
    }
  };

  const handleConfirmProposal = () => {
    const { type, data } = pendingProposal;

    if (type === 'LOG_MEAL') {
      const { day, mealType } = data;
      setPlan(prev => ({
        ...prev,
        [day]: { ...prev[day], completed: { ...prev[day].completed, [mealType]: true } }
      }));
    } else if (type === 'CREATE_MODULE') {
      const newMod = { ...data, id: `AI-${Date.now().toString().slice(-3)}` };
      setModules(prev => [...prev, newMod]);
    } else if (type === 'UPDATE_PANTRY') {
      setPantry(prev => [...prev, ...data.items]);
    } else if (type === 'PLAN_WEEK') {
      handleAutoPlan();
    }
    setPendingProposal(null);
    setChatHistory(prev => [...prev, { role: 'model', text: "Done! ✅" }]);
  };

  const handleAutoPlan = async () => {
    if (!window.confirm("Auto-plan week?")) return;
    try {
      const newPlan = await generateWeeklyPlan(pantry, modules, aiContext);
      const sanitized = {};
      DAYS.forEach(d => {
        sanitized[d] = {
          ...newPlan[d],
          completed: { breakfast: false, lunch: false, dinner: false, snack: false }
        };
      });
      setPlan(sanitized);
    } catch (e) {
      alert("Planning failed");
    }
  };

  // Determine current day index (0=Monday, 6=Sunday)
  const getCurrentDayIndex = () => {
    const day = new Date().getDay(); // 0=Sun, 1=Mon...
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
    localStorage.setItem('bulkstack-modules-v2', JSON.stringify(modules));
  }, [modules]);

  useEffect(() => {
    localStorage.setItem('bulkstack-pantry', JSON.stringify(pantry));
  }, [pantry]);

  useEffect(() => {
    localStorage.setItem('bulkstack-context', JSON.stringify(aiContext));
  }, [aiContext]);

  useEffect(() => {
    const savedPlan = localStorage.getItem('bulkstack-plan');
    if (savedPlan) {
      setPlan(JSON.parse(savedPlan));
    } else {
      initializeDefaultPlan();
    }
  }, []);

  useEffect(() => {
    if (Object.keys(plan).length > 0) {
      localStorage.setItem('bulkstack-plan', JSON.stringify(plan));
    }
  }, [plan]);

  // Scroll Chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, pendingProposal]);

  // Auto-scroll to today
  useEffect(() => {
    if (view === 'planner' && plannerScrollRef.current) {
      const todayIndex = getCurrentDayIndex();
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
    const defaultPlan = {};
    // Use random or fixed indices from the flat list
    DAYS.forEach(day => {
      defaultPlan[day] = {
        breakfast: modules[0] || {},
        lunch: modules[3] || {},
        dinner: modules[6] || {},
        snack: modules[9] || {},
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
    const category = editingModule.type || 'custom'; // fallback

    // Parse ingredients from string to array
    const ingString = formData.get('ingredients');
    const ingArray = ingString.split(',').map(i => i.trim()).filter(i => i);

    const newModuleData = {
      id: formData.get('id') || `M-${Date.now().toString().slice(-3)}`,
      name: formData.get('name'),
      desc: formData.get('desc'),
      ingredients: ingArray
    };

    setModules(prev => {
      const exists = prev.find(m => m.id === newModuleData.id);
      if (exists) {
        return prev.map(m => m.id === newModuleData.id ? newModuleData : m);
      }
      return [...prev, newModuleData];
    });

    setEditingModule(null);
  };

  const deleteModule = (moduleId) => {
    if (!window.confirm("Delete this meal? This won't remove it from days already planned.")) return;
    setModules(prev => prev.filter(m => m.id !== moduleId));
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
            {modules.map(mod => (
              <button
                key={mod.id}
                onClick={() => handleModuleSelect(mod)}
                className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-green-500 transition-all group"
              >
                <div className="flex justify-between">
                  {/* ... same ... */}
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
    // Convert list to array of objects {name, count}
    const rawList = generateShoppingList();
    const items = rawList.map(([name, count]) => ({ name, count }));

    // Simple pantry matching (case-insensitive check)
    // Assuming pantry is array of strings or objects. We'll handle both.
    const normalizedPantry = pantry.map(p => (typeof p === 'string' ? p : p.name).toLowerCase());

    const neededItems = items.filter(i => !normalizedPantry.includes(i.name.toLowerCase()));
    const haveItems = items.filter(i => normalizedPantry.includes(i.name.toLowerCase()));

    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-20">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <ShoppingCart className="text-green-500" /> Smart Shop
        </h2>

        {items.length === 0 ? (
          <p className="text-gray-500 italic">Plan your week first to see items here.</p>
        ) : (
          <div className="space-y-6">

            {/* NEEDED SECTION */}
            <div>
              <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3">To Buy ({neededItems.length})</h3>
              {neededItems.length === 0 ? (
                <div className="text-gray-500 text-sm">Nothing to buy! You have everything.</div>
              ) : (
                <div className="grid gap-2">
                  {neededItems.map((item) => (
                    <div key={item.name} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-white font-medium">
                        {item.count} {item.name}{item.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* IN PANTRY SECTION */}
            {haveItems.length > 0 && (
              <div className="opacity-60">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle size={14} /> Already in Pantry
                </h3>
                <div className="grid gap-2">
                  {haveItems.map((item) => (
                    <div key={item.name} className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-gray-800/50">
                      <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                      <span className="text-gray-400 font-medium decoration-gray-600">
                        {item.count} {item.name}{item.count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={() => setView('planner')} className="mt-8 w-full py-3 bg-gray-700 text-white rounded-lg font-bold">
          Back to Planner
        </button>
      </div>
    );
  };

  const ManagerView = () => (
    <div className="space-y-4 pb-20">
      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-2">Module Manager</h2>
        <p className="text-sm text-gray-400">Manage your universal meal templates. Use Chat to create new ones easily.</p>
        <button
          onClick={() => setEditingModule({ type: 'new', data: {} })}
          className="mt-3 text-xs bg-white text-black px-3 py-2 rounded-full font-bold flex items-center gap-1 hover:bg-gray-200"
        >
          <Plus size={12} /> Add Manual
        </button>
      </div>

      <div className="grid gap-3">
        {modules.map(mod => (
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
                onClick={() => setEditingModule({ type: 'edit', data: mod })}
                className="p-2 bg-gray-800 text-gray-300 rounded hover:text-white border border-gray-700"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => deleteModule(mod.id)}
                className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 border border-transparent hover:border-red-900"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-gray-200 p-4 font-sans selection:bg-green-500 selection:text-black">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">BULK<span className="text-green-500">STACK</span></h1>
            <p className="text-xs text-gray-500 font-mono">v3.0 // UNIVERSAL AI</p>
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


        {/* CHAT FAB & OVERLAY */}
        {/* Floating Action Button */}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-24 right-6 bg-purple-600 p-4 rounded-full text-white shadow-2xl shadow-purple-600/50 hover:scale-110 transition-transform z-50"
          >
            <MessageSquare size={28} />
          </button>
        )}

        {/* Chat Sheet */}
        <div className={`fixed inset-x-0 bottom-0 bg-gray-900 border-t border-gray-800 transition-all duration-500 ease-spring z-50 flex flex-col ${isChatOpen ? 'h-[85vh] rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]' : 'h-0 pointer-events-none'}`}>
          {isChatOpen && (
            <>
              {/* Handle Bar */}
              <div className="w-full flex justify-center pt-3 pb-1 cursor-pointer hover:bg-gray-800 rounded-t-3xl" onClick={() => setIsChatOpen(false)}>
                <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {pendingProposal && (
                  <div className="bg-gray-800 border border-purple-500/50 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="text-purple-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                      <Sparkles size={12} /> Proposed Action
                    </div>
                    <div className="text-white font-bold mb-1">{pendingProposal.type.replace('_', ' ')}</div>
                    <div className="text-xs text-gray-400 mb-4 break-words font-mono bg-black/30 p-2 rounded">
                      {JSON.stringify(pendingProposal.data).slice(0, 50) + "..."}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleConfirmProposal} className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-purple-500">Confirm</button>
                      <button onClick={() => setPendingProposal(null)} className="flex-1 bg-gray-700 text-gray-300 py-3 rounded-lg font-bold text-sm hover:bg-gray-600">Reject</button>
                    </div>
                  </div>
                )}
                {isTyping && <div className="text-gray-500 text-xs pl-2">AI is thinking...</div>}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-gray-900 border-t border-gray-800 pb-8">
                <form onSubmit={handleSendMessage} className="relative">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Type 'I had eggs' or 'Plan my week'..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-4 pr-12 text-white focus:border-purple-500 outline-none placeholder:text-gray-600"
                    autoFocus
                  />
                  <button type="submit" disabled={!chatInput.trim() || isTyping} className="absolute right-2 top-2 p-1.5 bg-purple-600 rounded-lg text-white disabled:opacity-50 hover:bg-purple-500">
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, ShoppingCart, CheckCircle, Edit3, X, Plus, Trash2, Settings } from 'lucide-react';

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

  // --- MAIN VIEWS ---

  const PlannerView = () => (
    <div className="space-y-6">
      {DAYS.map(day => (
        <div key={day} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="bg-gray-800 p-3 px-5 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">{day}</h2>
            <div className="text-xs text-gray-400 font-mono">BULKING PHASE</div>
          </div>
          <div className="p-4 grid gap-4">
            {['breakfast', 'lunch', 'dinner', 'snack'].map(type => {
              const meal = plan[day]?.[type];
              const isDone = plan[day]?.completed?.[type];
              
              return (
                <div key={type} className={`relative p-3 rounded-lg border ${isDone ? 'bg-green-900/20 border-green-800' : 'bg-gray-800/50 border-gray-700'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{type}</span>
                    <button onClick={() => toggleComplete(day, type)}>
                      <CheckCircle size={20} className={isDone ? "text-green-500 fill-current" : "text-gray-600"} />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-green-400 font-bold text-sm mb-1">{meal?.id}</div>
                      <div className={`font-medium ${isDone ? 'text-gray-400 line-through' : 'text-white'}`}>
                        {meal?.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{meal?.desc}</div>
                    </div>
                    <button 
                      onClick={() => setSelectedSlot({ day, type })}
                      className="p-2 bg-gray-700 rounded-full hover:bg-gray-600"
                    >
                      <RefreshCw size={14} className="text-white" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

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
              <button 
                onClick={() => setEditingModule({ type: category, data: {} })}
                className="text-xs bg-white text-black px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-gray-200"
              >
                <Plus size={12} /> Add New
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
    <div className="min-h-screen bg-black text-gray-200 p-4 font-sans">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">BULK<span className="text-green-500">STACK</span></h1>
            <p className="text-xs text-gray-500 font-mono">v2.0 // PROGRAMMABLE DIET</p>
          </div>
          <button onClick={() => {
            if(window.confirm("Reset entire plan?")) initializeDefaultPlan();
          }} className="text-xs text-red-500 underline">Reset Week</button>
        </div>

        {view === 'planner' && <PlannerView />}
        {view === 'shopping' && <ShoppingView />}
        {view === 'manager' && <ManagerView />}

        {/* Floating Nav */}
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40">
          <div className="bg-gray-800 border border-gray-700 rounded-full px-6 py-3 shadow-2xl flex gap-8 items-center backdrop-blur-md bg-opacity-90">
            <button onClick={() => setView('planner')} className={`flex flex-col items-center gap-1 ${view === 'planner' ? 'text-green-500' : 'text-gray-400'}`}>
              <Edit3 size={20} />
              <span className="text-[10px] font-bold">PLAN</span>
            </button>
            <button onClick={() => setView('shopping')} className={`flex flex-col items-center gap-1 ${view === 'shopping' ? 'text-green-500' : 'text-gray-400'}`}>
              <ShoppingCart size={20} />
              <span className="text-[10px] font-bold">SHOP</span>
            </button>
            <button onClick={() => setView('manager')} className={`flex flex-col items-center gap-1 ${view === 'manager' ? 'text-green-500' : 'text-gray-400'}`}>
              <Settings size={20} />
              <span className="text-[10px] font-bold">MANAGE</span>
            </button>
          </div>
        </div>

        {renderModuleSelector()}
        {renderEditorModal()}
      </div>
    </div>
  );
}
import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  ShoppingBasket, 
  Search, 
  Filter, 
  Sparkles,
  ChevronRight,
  X,
  Loader2,
  MapPin,
  AlertCircle,
  ChefHat,
  ArrowUpCircle,
  ArrowDownCircle,
  MinusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GroceryItem, Category, CATEGORIES, Priority, PRIORITIES } from './types';
import { groceryService } from './services/groceryService';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<Category>('Other');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<Priority>('Medium');
  const [newItemLocation, setNewItemLocation] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [isAiCategorizing, setIsAiCategorizing] = useState(false);
  const [isAiGeneratingRecipe, setIsAiGeneratingRecipe] = useState(false);
  const [recipeInput, setRecipeInput] = useState('');
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  
  const [userLocation, setUserLocation] = useState<string>('');
  const [isNearMarket, setIsNearMarket] = useState(false);

  useEffect(() => {
    loadItems();
    // Simple "location" simulation - in a real app we'd use coordinates
    // For this demo, we'll just let the user toggle a "Market Mode"
  }, []);

  const loadItems = async () => {
    try {
      const data = await groceryService.getItems();
      setItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleAddItem = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      const newItem = await groceryService.addItem({
        name: newItemName.trim(),
        category: newItemCategory,
        quantity: newItemQuantity.trim(),
        priority: newItemPriority,
        location: newItemLocation.trim(),
      });
      setItems([newItem, ...items]);
      resetForm();
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const resetForm = () => {
    setNewItemName('');
    setNewItemQuantity('');
    setNewItemCategory('Other');
    setNewItemPriority('Medium');
    setNewItemLocation('');
  };

  const toggleItem = async (id: number, currentCompleted: number) => {
    try {
      const updated = await groceryService.updateItem(id, { completed: currentCompleted === 1 ? 0 : 1 });
      setItems(items.map(item => item.id === id ? updated : item));
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const deleteItem = async (id: number) => {
    try {
      await groceryService.deleteItem(id);
      setItems(items.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const clearCompleted = async () => {
    try {
      await groceryService.clearCompleted();
      setItems(items.filter(item => item.completed === 0));
    } catch (error) {
      console.error('Error clearing completed items:', error);
    }
  };

  const smartCategorize = async () => {
    if (!newItemName.trim()) return;
    setIsAiCategorizing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this grocery item: "${newItemName}". 
        1. Categorize it into one of: ${CATEGORIES.join(', ')}.
        2. Suggest a priority (High, Medium, Low) based on whether it's a staple or urgent.
        Return as JSON: { "category": "...", "priority": "..." }`,
        config: { responseMimeType: "application/json" }
      });
      
      const result = JSON.parse(response.text || '{}');
      if (CATEGORIES.includes(result.category)) setNewItemCategory(result.category);
      if (PRIORITIES.includes(result.priority)) setNewItemPriority(result.priority);
    } catch (error) {
      console.error('AI Categorization failed:', error);
    } finally {
      setIsAiCategorizing(false);
    }
  };

  const generateFromRecipe = async () => {
    if (!recipeInput.trim()) return;
    setIsAiGeneratingRecipe(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a grocery list for this recipe/meal: "${recipeInput}". 
        For each item, provide: name, category (from ${CATEGORIES.join(', ')}), quantity, and priority (High/Medium/Low).
        Return as a JSON array of objects: [{ "name": "...", "category": "...", "quantity": "...", "priority": "..." }]`,
        config: { responseMimeType: "application/json" }
      });
      
      const newItemsData = JSON.parse(response.text || '[]');
      for (const itemData of newItemsData) {
        const newItem = await groceryService.addItem(itemData);
        setItems(prev => [newItem, ...prev]);
      }
      setShowRecipeModal(false);
      setRecipeInput('');
    } catch (error) {
      console.error('AI Recipe generation failed:', error);
    } finally {
      setIsAiGeneratingRecipe(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesLocation = !isNearMarket || !item.location || item.location.toLowerCase().includes(userLocation.toLowerCase());
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [items, searchQuery, selectedCategory, isNearMarket, userLocation]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, GroceryItem[]> = {};
    // Sort items by priority within groups
    const priorityMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
    const sorted = [...filteredItems].sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
    
    sorted.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 'High': return <ArrowUpCircle className="text-red-500" size={16} />;
      case 'Medium': return <MinusCircle className="text-amber-500" size={16} />;
      case 'Low': return <ArrowDownCircle className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#F5F5F0]/80 backdrop-blur-md border-b border-[#141414]/5 px-6 py-8">
        <div className="max-w-3xl mx-auto flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-serif italic tracking-tight leading-none mb-2">FreshCart</h1>
            <p className="text-sm uppercase tracking-widest opacity-50 font-medium">Grocery Monitor</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowRecipeModal(true)}
              className="w-14 h-14 rounded-full bg-white border border-[#141414]/10 text-[#141414] flex items-center justify-center hover:scale-105 transition-transform shadow-sm"
              title="AI Recipe Import"
            >
              <ChefHat size={24} />
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="w-14 h-14 rounded-full bg-[#141414] text-white flex items-center justify-center hover:scale-105 transition-transform shadow-xl"
              title="Add Item"
            >
              <Plus size={28} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Location Simulation Bar */}
        <div className="mb-8 p-4 bg-white rounded-3xl border border-[#141414]/5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isNearMarket ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider opacity-40">Location Mode</p>
              <p className="text-sm font-medium">
                {isNearMarket ? `Filtering for "${userLocation || 'Market'}"` : 'Showing all locations'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isNearMarket && (
              <input 
                type="text"
                placeholder="Store name..."
                value={userLocation}
                onChange={(e) => setUserLocation(e.target.value)}
                className="bg-[#F5F5F0] border-none rounded-xl px-3 py-1 text-sm focus:ring-1 focus:ring-[#5A5A40]"
              />
            )}
            <button 
              onClick={() => setIsNearMarket(!isNearMarket)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                isNearMarket ? 'bg-green-600 text-white' : 'bg-[#141414]/5 text-[#141414]/40'
              }`}
            >
              {isNearMarket ? 'At Market' : 'Normal'}
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
            <input 
              type="text"
              placeholder="Search your list..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#141414]/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button 
              onClick={() => setSelectedCategory('All')}
              className={`px-6 py-4 rounded-2xl border transition-all whitespace-nowrap ${
                selectedCategory === 'All' 
                ? 'bg-[#5A5A40] text-white border-[#5A5A40]' 
                : 'bg-white border-[#141414]/10 hover:border-[#141414]/30'
              }`}
            >
              All
            </button>
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-4 rounded-2xl border transition-all whitespace-nowrap ${
                  selectedCategory === cat 
                  ? 'bg-[#5A5A40] text-white border-[#5A5A40]' 
                  : 'bg-white border-[#141414]/10 hover:border-[#141414]/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List Content */}
        {items.length === 0 ? (
          <div className="text-center py-24 opacity-30">
            <ShoppingBasket size={64} className="mx-auto mb-4" />
            <p className="text-xl font-serif italic">Your list is empty</p>
          </div>
        ) : (
          <div className="space-y-12">
            {(Object.entries(groupedItems) as [string, GroceryItem[]][]).map(([category, categoryItems]) => (
              <section key={category}>
                <h2 className="text-xs uppercase tracking-[0.2em] font-bold opacity-40 mb-6 flex items-center gap-3">
                  {category}
                  <div className="h-px flex-1 bg-[#141414]/10" />
                </h2>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {categoryItems.map(item => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={item.id}
                        className={`group flex items-center gap-4 p-5 bg-white rounded-3xl border border-[#141414]/5 hover:border-[#141414]/10 transition-all shadow-sm ${item.completed ? 'opacity-50' : ''}`}
                      >
                        <button 
                          onClick={() => toggleItem(item.id, item.completed)}
                          className="text-[#5A5A40] hover:scale-110 transition-transform"
                        >
                          {item.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-lg font-medium ${item.completed ? 'line-through' : ''}`}>
                              {item.name}
                            </p>
                            {!item.completed && getPriorityIcon(item.priority)}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {item.quantity && (
                              <p className="text-xs opacity-50 font-medium">{item.quantity}</p>
                            )}
                            {item.location && (
                              <div className="flex items-center gap-1 text-xs text-[#5A5A40] font-bold uppercase tracking-tighter">
                                <MapPin size={10} />
                                {item.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Actions */}
        {items.some(i => i.completed === 1) && (
          <button 
            onClick={clearCompleted}
            className="mt-12 w-full py-4 rounded-2xl border border-dashed border-[#141414]/20 text-[#141414]/50 hover:border-[#141414]/40 hover:text-[#141414]/80 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Clear Completed Items
          </button>
        )}
      </main>

      {/* Add Item Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-[#141414]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#F5F5F0] rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-serif italic">New Item</h3>
                  <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-[#141414]/5 rounded-full">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleAddItem} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Item Name</label>
                    <div className="relative">
                      <input 
                        autoFocus
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="e.g. Sourdough Bread"
                        className="w-full bg-white border border-[#141414]/10 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all text-lg"
                      />
                      <button 
                        type="button"
                        onClick={smartCategorize}
                        disabled={isAiCategorizing || !newItemName}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-xl transition-all disabled:opacity-30"
                        title="Smart Categorize & Priority"
                      >
                        {isAiCategorizing ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Quantity</label>
                      <input 
                        type="text"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                        placeholder="e.g. 2 loaves"
                        className="w-full bg-white border border-[#141414]/10 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Category</label>
                      <select 
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as Category)}
                        className="w-full bg-white border border-[#141414]/10 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all appearance-none"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Priority</label>
                      <div className="flex gap-2">
                        {PRIORITIES.map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewItemPriority(p)}
                            className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all ${
                              newItemPriority === p 
                              ? 'bg-[#141414] text-white border-[#141414]' 
                              : 'bg-white border-[#141414]/10 opacity-50'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Store/Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={14} />
                        <input 
                          type="text"
                          value={newItemLocation}
                          onChange={(e) => setNewItemLocation(e.target.value)}
                          placeholder="e.g. Whole Foods"
                          className="w-full bg-white border border-[#141414]/10 rounded-2xl py-4 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#141414] text-white py-5 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    Add to List
                    <ChevronRight size={20} />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recipe Import Modal */}
      <AnimatePresence>
        {showRecipeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRecipeModal(false)}
              className="absolute inset-0 bg-[#141414]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#F5F5F0] rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <ChefHat className="text-[#5A5A40]" size={32} />
                    <h3 className="text-2xl font-serif italic">AI Recipe Import</h3>
                  </div>
                  <button onClick={() => setShowRecipeModal(false)} className="p-2 hover:bg-[#141414]/5 rounded-full">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <p className="text-sm opacity-60">
                    Tell AI what you want to cook, and it will generate a full grocery list with quantities and categories.
                  </p>
                  <textarea 
                    autoFocus
                    value={recipeInput}
                    onChange={(e) => setRecipeInput(e.target.value)}
                    placeholder="e.g. Classic Italian Lasagna for 4 people"
                    className="w-full h-32 bg-white border border-[#141414]/10 rounded-2xl py-4 px-5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all resize-none"
                  />

                  <button 
                    onClick={generateFromRecipe}
                    disabled={isAiGeneratingRecipe || !recipeInput.trim()}
                    className="w-full bg-[#5A5A40] text-white py-5 rounded-2xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAiGeneratingRecipe ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Generating List...
                      </>
                    ) : (
                      <>
                        Generate Grocery List
                        <Sparkles size={20} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Styles */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

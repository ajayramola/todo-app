import React, { useState, useRef, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './trpc';

// --- 1. Type Definitions ---

type Todo = {
  id: string;
  text: string;
  done: boolean;
};

// --- 2. Components ---

// TodoItem now handles "Editing Mode" internally
function TodoItem({ todo, onToggle, onDelete, onUpdate }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when you click to edit
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(todo.id, editText);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false); // Cancel edit
    }
  };

  return (
    <div className={`group flex items-center justify-between p-4 mb-3 rounded-xl border transition-all duration-300 ${
      todo.done 
        ? 'bg-slate-900/40 border-slate-800 opacity-50' 
        : 'bg-slate-900 border-slate-700 shadow-lg hover:border-indigo-500/50'
    }`}>
      <div className="flex items-center gap-4 flex-1">
        {/* Checkbox */}
        <div 
          onClick={() => onToggle(todo.id, !todo.done)}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${
            todo.done ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 hover:border-indigo-400'
          }`}
        >
          {todo.done && <span className="text-white text-sm font-bold">✓</span>}
        </div>

        {/* Text Area: Swaps between Text and Input */}
        {isEditing ? (
          <input 
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="bg-slate-800 text-white px-2 py-1 rounded w-full outline-none border border-indigo-500"
          />
        ) : (
          <span 
            onClick={() => setIsEditing(true)}
            className={`text-lg flex-1 cursor-text select-none transition-all ${
              todo.done ? 'line-through text-slate-500' : 'text-slate-100 hover:text-indigo-200'
            }`}
            title="Click to edit"
          >
            {todo.text}
          </span>
        )}
      </div>

      {/* Delete Button (Visible on Hover) */}
      <button 
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-all"
      >
        ✕
      </button>
    </div>
  );
}

function TodoApp() {
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // --- Connect to API ---
  const utils = trpc.useContext();
  const todosQuery = trpc.getTodos.useQuery();
  
  const refresh = () => utils.getTodos.invalidate();

  const addTodo = trpc.addTodo.useMutation({ 
    onSuccess: () => { refresh(); setText(''); } 
  });
  const toggleTodo = trpc.toggleTodo.useMutation({ onSuccess: refresh });
  const deleteTodo = trpc.deleteTodo.useMutation({ onSuccess: refresh });
  const updateTodo = trpc.updateTodo.useMutation({ onSuccess: refresh });
  const clearCompleted = trpc.clearCompleted.useMutation({ onSuccess: refresh });

  // Update Page Title
  const activeCount = todosQuery.data?.filter(t => !t.done).length || 0;
  useEffect(() => {
    document.title = `Todo App (${activeCount})`;
  }, [activeCount]);

  // Focus Input on Load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text) return;
    addTodo.mutate({ text });
  };

  // --- Filtering Logic ---
  const filteredTodos = todosQuery.data?.filter((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'completed') return t.done;
    return true;
  });

  const errorMessage = (addTodo.error?.data as any)?.zodError?.fieldErrors?.text?.[0];

  return (
    <div className="min-h-screen flex flex-col items-center pt-20 px-4 font-sans bg-slate-950 text-slate-200">
      <div className="w-full max-w-lg">
        {/* Header */}
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 text-center">
          Tasks
        </h1>
        <p className="text-center text-slate-500 mb-8">
          You have <strong className="text-indigo-400">{activeCount}</strong> tasks remaining
        </p>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative mb-8">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What needs to be done?"
            className={`w-full bg-slate-900 border-2 rounded-2xl p-5 text-xl shadow-xl focus:outline-none transition-all ${
              errorMessage 
                ? 'border-red-500/50 focus:border-red-500 placeholder-red-300' 
                : 'border-slate-800 focus:border-indigo-500 focus:shadow-indigo-500/20'
            }`}
          />
          <button 
            disabled={addTodo.isLoading || !text}
            className="absolute right-3 top-3 bottom-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold px-6 rounded-xl transition-all"
          >
            {addTodo.isLoading ? '...' : 'Add'}
          </button>
          
          {errorMessage && (
            <div className="absolute -bottom-8 left-2 text-red-400 text-sm font-medium animate-bounce">
              ⚠️ {errorMessage}
            </div>
          )}
        </form>

        {/* Filter Tabs */}
        <div className="flex justify-between items-center mb-6 bg-slate-900/50 p-1 rounded-xl">
          {['all', 'active', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                filter === f 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-1">
          {todosQuery.isLoading && (
            <div className="text-center py-10 animate-pulse text-slate-600">Loading your tasks...</div>
          )}

          {filteredTodos?.length === 0 && !todosQuery.isLoading && (
             <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl text-slate-600">
               {filter === 'completed' ? "No completed tasks yet." : "No tasks found. Add one!"}
             </div>
          )}

          {filteredTodos?.map((t) => (
            <TodoItem 
              key={t.id} 
              todo={t} 
              onToggle={(id: string, done: boolean) => toggleTodo.mutate({ id, done })}
              onDelete={(id: string) => deleteTodo.mutate({ id })}
              onUpdate={(id: string, text: string) => updateTodo.mutate({ id, text })}
            />
          ))}
        </div>

        {/* Footer Actions */}
        {todosQuery.data && todosQuery.data.some(t => t.done) && (
          <button 
            onClick={() => clearCompleted.mutate()}
            className="w-full mt-6 text-slate-500 hover:text-red-400 text-sm hover:underline transition-colors"
          >
            Clear Completed Tasks
          </button>
        )}
      </div>
    </div>
  );
}

// --- 3. App Wrapper ---

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: 'http://localhost:4000/trpc',
        }) as any, // Kept 'as any' since you used it in your version
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TodoApp />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
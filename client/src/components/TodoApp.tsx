import React, { useState } from 'react';
import { trpc } from '../trpc';
import { ChatRoom } from './ChatRoom'; // <--- Import Chat

export function TodoApp({ onLogout }: { onLogout: () => void }) {
  const [text, setText] = useState('');
  const utils = trpc.useContext();
  const todos = trpc.getTodos.useQuery();
  
  const addTodo = trpc.addTodo.useMutation({ onSuccess: () => { utils.getTodos.invalidate(); setText(''); } });
  const toggleTodo = trpc.toggleTodo.useMutation({ onSuccess: () => utils.getTodos.invalidate() });
  const deleteTodo = trpc.deleteTodo.useMutation({ onSuccess: () => utils.getTodos.invalidate() });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Dev Dashboard
        </h1>
        <button onClick={onLogout} className="bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 px-4 py-2 rounded-lg transition-all text-sm font-bold border border-slate-700">
          Logout
        </button>
      </div>

      {/* --- GRID LAYOUT (Split Screen) --- */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: TODOS (Takes up 2 parts) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Add Todo Form */}
          <form onSubmit={(e) => { e.preventDefault(); if(text) addTodo.mutate({ text }); }} className="flex gap-3">
            <input 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="What needs to be done?" 
              className="flex-1 bg-slate-900 border-2 border-slate-800 rounded-xl p-4 focus:border-indigo-500 outline-none transition-colors text-lg" 
            />
            <button className="bg-indigo-600 px-8 rounded-xl font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
              Add
            </button>
          </form>

          {/* Todo List */}
          <div className="space-y-3">
            {todos.isLoading && <p className="text-center text-slate-600">Loading tasks...</p>}
            {todos.data?.length === 0 && <p className="text-center text-slate-600 py-10">No tasks yet. Enjoy your day!</p>}
            
            {todos.data?.map((t) => (
              <div key={t.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${t.done ? 'bg-slate-900/40 border-slate-800 opacity-50' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}>
                <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleTodo.mutate({ id: t.id, done: !t.done })}>
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${t.done ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 group-hover:border-indigo-400'}`}>
                    {t.done && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className={`text-lg ${t.done ? 'line-through text-slate-500' : 'text-slate-100'}`}>{t.text}</span>
                </div>
                <button onClick={() => deleteTodo.mutate({ id: t.id })} className="text-slate-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT (Takes up 1 part) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
             {/* This inserts the ChatRoom component we just made */}
             <ChatRoom />
          </div>
        </div>

      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { trpc } from '../trpc';

export function TodoApp({ onLogout }: { onLogout: () => void }) {
  const [text, setText] = useState('');
  const utils = trpc.useContext();
  const todos = trpc.getTodos.useQuery();
  
  const addTodo = trpc.addTodo.useMutation({ onSuccess: () => { utils.getTodos.invalidate(); setText(''); } });
  const toggleTodo = trpc.toggleTodo.useMutation({ onSuccess: () => utils.getTodos.invalidate() });
  const deleteTodo = trpc.deleteTodo.useMutation({ onSuccess: () => utils.getTodos.invalidate() });

  return (
    <div className="min-h-screen flex flex-col items-center pt-20 px-4 font-sans bg-slate-950 text-slate-200">
      <div className="w-full max-w-lg relative">
        <button onClick={onLogout} className="absolute -top-12 right-0 text-sm text-slate-500 hover:text-white transition-colors">Logout</button>
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-8 text-center">My Tasks</h1>

        <form onSubmit={(e) => { e.preventDefault(); if(text) addTodo.mutate({ text }); }} className="flex gap-2 mb-8">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a new task..." className="flex-1 bg-slate-900 border-2 border-slate-800 rounded-xl p-4 focus:border-indigo-500 outline-none transition-colors" />
          <button className="bg-indigo-600 px-6 rounded-xl font-bold hover:bg-indigo-500 transition-colors">Add</button>
        </form>

        <div className="space-y-3">
          {todos.isLoading && <p className="text-center text-slate-600">Loading...</p>}
          {todos.data?.map((t) => (
            <div key={t.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${t.done ? 'bg-slate-900/40 border-slate-800 opacity-50' : 'bg-slate-900 border-slate-700'}`}>
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleTodo.mutate({ id: t.id, done: !t.done })}>
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${t.done ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>{t.done && <span className="text-white text-xs">✓</span>}</div>
                <span className={t.done ? 'line-through text-slate-500' : 'text-slate-100'}>{t.text}</span>
              </div>
              <button onClick={() => deleteTodo.mutate({ id: t.id })} className="text-slate-600 hover:text-red-400 px-2">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
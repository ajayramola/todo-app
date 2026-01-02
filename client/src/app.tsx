import React, { useState } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, splitLink } from '@trpc/client';
import { trpc } from './trpc';

import { TodoApp } from './components/TodoApp';
import { AuthScreen } from './AuthScreen';

import { createWSClient, wsLink } from '@trpc/client/links/wsLink'; // <--- Import this



export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
// --- UPDATED QUERY CLIENT ---
  const [queryClient] = useState(() => new QueryClient({
    // Global Error Handler
    queryCache: new QueryCache({
      onError: (error: any) => {
        // If the server says "UNAUTHORIZED" (User deleted or Token invalid)
        if (error?.data?.code === 'UNAUTHORIZED' || error?.message?.includes('User account no longer exists')) {
          console.log("Session invalid, logging out...");
          localStorage.removeItem('token');
          setToken(null);
          // Optional: Force reload to clear all states
          // window.location.reload(); 
        }
      }
    })
  }));


  const wsClient = createWSClient({
  url: 'ws://localhost:4000',
});


  const [trpcClient] = useState(() =>
  trpc.createClient({
    links: [
      // Split Link: Sends subscriptions to WS, everything else to HTTP
      splitLink({
        condition(op: { type: string; }) {
          return op.type === 'subscription';
        },
        true: wsLink({
          client: wsClient,
        }) as any,
        false: httpBatchLink({
          url: 'http://localhost:4000/trpc',
          headers() {
            const token = localStorage.getItem('token');
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      }) as any,
    ],
  })
);

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken); // 1. Save to Storage
    setToken(newToken); // 2. Update State (Triggers Re-render)
    
    // 3. Force the app to retry fetching data immediately
    queryClient.invalidateQueries(); 
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    queryClient.clear();
  };

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {token ? <TodoApp onLogout={handleLogout} /> : <AuthScreen onLogin={handleLogin} />}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
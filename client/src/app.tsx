import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './trpc';

import { TodoApp } from './components/TodoApp';
import { AuthScreen } from './AuthScreen';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [queryClient] = useState(() => new QueryClient());
  
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: 'http://localhost:4000/trpc',
          headers() {
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }) as any,
      ],
    })
  );

  const handleLogin = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
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
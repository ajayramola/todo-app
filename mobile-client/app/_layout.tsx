// mobile-client/app/_layout.tsx
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, splitLink, createWSClient, wsLink } from '@trpc/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc, API_URL, WS_URL } from '../src/utils/trpc';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => {
    const wsClient = createWSClient({ url: WS_URL });
    return trpc.createClient({
      links: [
        splitLink({
          condition: (op) => op.type === 'subscription',
          true: wsLink({ client: wsClient }),
          false: httpBatchLink({
            url: `${API_URL}/trpc`,
            async headers() {
              const token = await AsyncStorage.getItem('token');
              return token ? { Authorization: `Bearer ${token}` } : {};
            },
          }),
        }),
      ],
    });
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, splitLink } from '@trpc/client';
import { createWSClient, wsLink } from '@trpc/client/links/wsLink';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatListScreen } from './src/screens/ChatListScreen'; // <--- Import this
import { trpc, API_URL, WS_URL } from './src/utils/trpc';
import { AuthScreen } from './src/screens/AuthScreen';
import { ChatListScreen } from './src/screens/ChatListScreen';
import { ChatScreen } from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function App() {
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
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f172a' } }}>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="ChatList" component={ChatListScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
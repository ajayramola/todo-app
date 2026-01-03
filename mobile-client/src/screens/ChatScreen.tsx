import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { trpc } from '../utils/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function ChatScreen({ navigation }: any) {
  const [msg, setMsg] = useState('');
  const flatListRef = useRef<FlatList>(null);
  
  // 1. Get My ID
  const me = trpc.me.useQuery();
  
  // 2. Get Messages (Assuming global chat or hardcoded ID for demo)
  // In real app, pass conversationId via route.params
  const conversationId = "some-conversation-id"; 
  const [messages, setMessages] = useState<any[]>([]);

  // Initial Load
  const history = trpc.getHistory.useQuery({ conversationId });
  
  // Live Updates
  trpc.onMessage.useSubscription({ conversationId }, {
    onData(newMessage) {
      setMessages((prev) => [...prev, newMessage]);
      // Scroll to bottom on new message
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    },
  });

  useEffect(() => {
    if (history.data) setMessages(history.data);
  }, [history.data]);

  const sendMutation = trpc.sendMessage.useMutation();

  const handleSend = () => {
    if (!msg.trim()) return;
    sendMutation.mutate({ conversationId, content: msg, isCode: false });
    setMsg('');
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    navigation.replace('Auth');
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.userId === me.data?.id;
    return (
      <View className={`my-1 mx-4 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
        {!isMe && <Text className="text-slate-400 text-xs mb-1">{item.user?.username}</Text>}
        <View className={`p-3 rounded-2xl ${isMe ? 'bg-indigo-600 rounded-tr-none' : 'bg-slate-800 rounded-tl-none'}`}>
          <Text className={`${item.isCode ? 'font-mono text-indigo-200' : 'text-white'}`}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-950 pt-10">
      {/* Header */}
      <View className="flex-row justify-between items-center p-4 border-b border-slate-800">
        <Text className="text-white font-bold text-xl">💬 Dev Chat</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text className="text-red-400 font-bold">Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Input Area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-row p-4 bg-slate-900 border-t border-slate-800 items-center">
          <TextInput
            value={msg}
            onChangeText={setMsg}
            placeholder="Type a message..."
            placeholderTextColor="#64748b"
            className="flex-1 bg-slate-800 text-white p-3 rounded-full mr-3"
          />
          <TouchableOpacity 
            onPress={handleSend}
            className="bg-indigo-600 w-12 h-12 rounded-full items-center justify-center"
          >
            <Text className="text-white font-bold">➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
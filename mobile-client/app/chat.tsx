import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, 
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
  Keyboard 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '@/src/utils/trpc';
import * as ImagePicker from 'expo-image-picker';
import { useHeaderHeight } from '@react-navigation/elements';

export default function ChatScreen() {
  const router = useRouter();
  const { conversationId, name } = useLocalSearchParams<{ conversationId: string, name?: string }>();
  
  const headerHeight = useHeaderHeight(); 

  const [msg, setMsg] = useState('');
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  
  const me = trpc.me.useQuery();
  const history = trpc.getHistory.useQuery({ conversationId });
  const sendMutation = trpc.sendMessage.useMutation();

  const [chatTitle, setChatTitle] = useState(name || 'Chat');

  useEffect(() => {
    if (name) {
      setChatTitle(name);
    } else if (history.data && me.data) {
      const otherMessage = history.data.find((m: any) => m.userId !== me.data.id);
      if (otherMessage?.user?.username) {
        setChatTitle(otherMessage.user.username);
      }
    }
  }, [history.data, me.data, name]);

  trpc.onMessage.useSubscription({ conversationId }, {
    onData(data: any) { setMessages(prev => [...prev, data]); }
  });

  useEffect(() => { 
    if (history.data) setMessages(history.data); 
  }, [history.data]);

  // --- FIX START: AUTO SCROLL TO BOTTOM ---
  // When 'messages' change (new msg sent or received), scroll to offset 0 (Bottom)
  useEffect(() => {
    if (messages.length > 0) {
      // Small timeout ensures the layout is ready before scrolling
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [messages]);
  // --- FIX END ---

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      sendMutation.mutate({
        conversationId,
        type: 'image',
        attachment: `data:image/jpeg;base64,${result.assets[0].base64}`,
        content: 'Sent a photo',
        isCode: false
      });
    }
  };

  const handleSend = () => {
    if(!msg.trim()) return;
    
    // Optimistic Update: Scroll immediately when button clicked
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    sendMutation.mutate({ 
      conversationId, 
      content: msg, 
      isCode: isCodeMode,
      type: 'text' 
    });
    setMsg('');
    setIsCodeMode(false);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (history.isLoading || me.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const invertedMessages = [...messages].reverse();

  return (
    // Edges prop helps avoid double padding on bottom
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: "",
          headerLeft: () => (
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 10 }}>
                 <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerProfile}>
                <View style={styles.headerAvatar}>
                  <Text style={styles.headerAvatarText}>{chatTitle[0]?.toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.headerName}>{chatTitle}</Text>
                  <Text style={styles.headerStatus}>Online</Text>
                </View>
              </View>
            </View>
          ),
          headerStyle: { backgroundColor: '#1e293b' }, 
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }} 
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <FlatList
          ref={flatListRef}
          inverted={true} 
          data={invertedMessages} 
          // 'maintainVisibleContentPosition' helps keep position when keyboard opens/closes
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 15 }} 
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => {
            const isMe = item.userId === me.data?.id;
            return (
              <View style={[styles.row, isMe ? styles.rowMe : styles.rowThem]}>
                {!isMe && (
                   <View style={styles.msgAvatar}>
                     <Text style={styles.msgAvatarText}>{item.user?.username?.[0].toUpperCase()}</Text>
                   </View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, item.isCode && styles.bubbleCode]}>
                  {!isMe && (
                     <Text style={styles.senderName}>{item.user?.username}</Text>
                  )}
                  {item.type === 'image' && item.attachment ? (
                    <Image source={{ uri: item.attachment }} style={styles.msgImage} resizeMode="cover" />
                  ) : item.isCode ? (
                    <View style={styles.codeBlock}>
                      <View style={styles.codeHeader}>
                        <Text style={styles.codeLabel}>CODE</Text>
                        <View style={styles.codeDots}>
                           <View style={[styles.dot, {backgroundColor:'#ef4444'}]} />
                           <View style={[styles.dot, {backgroundColor:'#eab308'}]} />
                           <View style={[styles.dot, {backgroundColor:'#22c55e'}]} />
                        </View>
                      </View>
                      <Text style={styles.codeText}>{item.content}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.msgText, isMe ? styles.textMe : styles.textThem]}>
                      {item.content}
                    </Text>
                  )}
                  <View style={styles.timeContainer}>
                    <Text style={[styles.timeText, isMe ? styles.timeMe : styles.timeThem]}>
                      {formatTime(item.createdAt || new Date().toISOString())}
                    </Text>
                    {isMe && (
                      <Ionicons name="checkmark-done" size={14} color="#a5b4fc" style={{ marginLeft: 4 }} />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              onPress={() => setIsCodeMode(!isCodeMode)} 
              style={[styles.iconBtn, isCodeMode && styles.activeCodeBtn]}
            >
              <Ionicons name="code-slash" size={20} color={isCodeMode ? "#6366f1" : "#94a3b8"} />
            </TouchableOpacity>

            <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
              <Ionicons name="image-outline" size={24} color="#94a3b8" />
            </TouchableOpacity>

            <TextInput 
              style={[styles.input, isCodeMode && styles.inputCode]} 
              placeholder={isCodeMode ? "Paste code here..." : "Message"} 
              placeholderTextColor="#64748b" 
              value={msg} 
              onChangeText={setMsg} 
              multiline
              textAlignVertical="center"
            />
            
            <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.8}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {isCodeMode && <Text style={styles.codeModeText}>Code Mode Active</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b101a' }, 
  loadingContainer: { flex: 1, backgroundColor: '#0b101a', justifyContent: 'center', alignItems: 'center' },

  headerContainer: { flexDirection: 'row', alignItems: 'center' },
  headerProfile: { flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerStatus: { color: '#10b981', fontSize: 12 }, 
  
  row: { flexDirection: 'row', marginBottom: 15, width: '100%' },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },

  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center', marginRight: 8, alignSelf: 'flex-end', marginBottom: 5 },
  msgAvatarText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  bubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, minWidth: 80 },
  bubbleMe: { backgroundColor: '#6366f1', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
  bubbleCode: { width: '85%', padding: 0, overflow: 'hidden', backgroundColor: 'transparent' },

  codeBlock: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', minWidth: 200 },
  codeHeader: { backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#334155' },
  codeLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold' },
  codeDots: { flexDirection: 'row', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  codeText: { color: '#a5b4fc', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, padding: 10 },

  msgImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 5 },

  senderName: { color: '#fbbf24', fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  msgText: { fontSize: 16, lineHeight: 22 },
  textMe: { color: '#ffffff' },
  textThem: { color: '#e2e8f0' },

  timeContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  timeText: { fontSize: 10 },
  timeMe: { color: '#c7d2fe' },
  timeThem: { color: '#94a3b8' },

  inputWrapper: { backgroundColor: '#1e293b', paddingVertical: 10, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  inputContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 25, alignItems: 'center', paddingHorizontal: 5, paddingVertical: Platform.OS === 'ios' ? 8 : 4, borderWidth: 1, borderColor: '#334155' },
  input: { flex: 1, color: '#fff', fontSize: 16, maxHeight: 100, paddingHorizontal: 10, paddingTop: Platform.OS === 'android' ? 8 : 0 },
  inputCode: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#a5b4fc' },
  iconBtn: { padding: 8 },
  activeCodeBtn: { backgroundColor: '#334155', borderRadius: 8 },
  sendBtn: { backgroundColor: '#6366f1', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 5, marginRight: 5 },
  codeModeText: { color: '#6366f1', fontSize: 10, marginLeft: 10, marginTop: 4, fontWeight:'bold' }
});
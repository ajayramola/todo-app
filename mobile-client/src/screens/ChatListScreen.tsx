import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { trpc } from '../utils/trpc';

export function ChatListScreen({ navigation }: any) {
  const myChats = trpc.getMyChats.useQuery();
  const allUsers = trpc.getAllUsers.useQuery();
  const me = trpc.me.useQuery();
  const createPrivate = trpc.createPrivateChat.useMutation();

  const startChat = async (userId: string) => {
    try {
      const chat = await createPrivate.mutateAsync({ otherUserId: userId });
      navigation.navigate('Chat', { conversationId: chat.id });
    } catch (e) {
      Alert.alert("Error", "Could not start chat");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Start New Chat</Text>
      
      {/* Horizontal List of Users */}
      <View style={{ height: 60, marginBottom: 20 }}>
        <FlatList 
          horizontal
          data={allUsers.data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => startChat(item.id)} style={styles.userChip}>
              <Text style={styles.userChipText}>{item.username}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <Text style={styles.heading}>My Conversations</Text>
      
      {/* Vertical List of Chats */}
      <FlatList
        data={myChats.data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          // Find the other person's name
          const otherUser = item.participants.find(p => p.user.username !== me.data?.username)?.user.username;
          return (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
              style={styles.chatRow}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{otherUser?.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.chatTitle}>{item.isGroup ? item.name : otherUser}</Text>
                <Text style={styles.chatPreview}>{item.messages[0]?.content || "No messages yet"}</Text>
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  heading: { color: '#94a3b8', marginBottom: 10, fontWeight: 'bold' },
  userChip: { backgroundColor: '#1e293b', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginRight: 10, justifyContent: 'center' },
  userChipText: { color: '#818cf8', fontWeight: 'bold' },
  chatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontWeight: 'bold' },
  chatTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  chatPreview: { color: '#94a3b8', fontSize: 12, marginTop: 2 }
});
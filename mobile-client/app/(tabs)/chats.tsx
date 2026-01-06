import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, 
  Modal, TextInput, Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { trpc } from '@/src/utils/trpc';
import { Ionicons } from '@expo/vector-icons';

export default function ChatListScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  
  // Group Creation State
  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const myChats = trpc.getMyChats.useQuery();
  const allUsers = trpc.getAllUsers.useQuery();
  const me = trpc.me.useQuery();
  const createPrivate = trpc.createPrivateChat.useMutation();
  const createGroup = trpc.createGroup.useMutation();

  useFocusEffect(
    useCallback(() => {
      myChats.refetch();
      allUsers.refetch();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([myChats.refetch(), allUsers.refetch()]);
    setRefreshing(false);
  };

  // 🟢 Sort Users: Online First
  const sortedUsers = useMemo(() => {
    if (!allUsers.data) return [];
    return [...allUsers.data].sort((a, b) => {
      // If A is online and B is not, A comes first (-1)
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return 0;
    });
  }, [allUsers.data]);

  // --- Handlers ---
  const startChat = async (userId: string, username: string) => {
    try {
      const chat = await createPrivate.mutateAsync({ otherUserId: userId });
      router.push({ pathname: '/chat', params: { conversationId: chat.id, name: username } });
    } catch (e) { console.log(e); }
  };

  const openChat = (chatId: string, chatName: string) => {
    router.push({ pathname: '/chat', params: { conversationId: chatId, name: chatName } });
  };

  const handleCreateGroup = async () => {
    if (!groupName || selectedUsers.length === 0) {
      Alert.alert("Error", "Enter a group name and select at least one friend.");
      return;
    }
    try {
      await createGroup.mutateAsync({ name: groupName, participantIds: selectedUsers });
      setModalVisible(false);
      setGroupName('');
      setSelectedUsers([]);
      onRefresh(); 
    } catch (e) { Alert.alert("Error", "Failed to create group"); }
  };

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* Header with Group Button */}
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Chats</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.createGroupBtn}>
          <Ionicons name="people-circle-outline" size={26} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* 🟢 Active & All Users List (Sorted) */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Active Now</Text>
        <FlatList
          horizontal
          data={sortedUsers} // Uses the sorted list
          style={{ paddingLeft: 15 }}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.userChip} onPress={() => startChat(item.id, item.username)}>
              <View style={[styles.avatar, item.isOnline && styles.onlineBorder]}>
                <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
                {/* 🟢 Green Dot for Online Users */}
                {item.isOnline && <View style={styles.onlineDot} />}
              </View>
              <Text style={[styles.username, item.isOnline && styles.boldUsername]} numberOfLines={1}>
                {item.username}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Recent Chats List */}
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>Recent</Text>
        <FlatList
          data={myChats.data}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const otherUser = item.participants.find((p: any) => p.user.username !== me.data?.username)?.user.username || 'Chat';
            const displayName = item.isGroup ? item.name : otherUser;
            
            return (
              <TouchableOpacity style={styles.chatRow} onPress={() => openChat(item.id, displayName)}>
                <View style={[styles.chatAvatar, { backgroundColor: item.isGroup ? '#8b5cf6' : '#6366f1' }]}>
                  {item.isGroup ? (
                    <Ionicons name="people" size={24} color="#fff" />
                  ) : (
                    <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.chatName}>{displayName}</Text>
                    <Text style={styles.dateText}>
                      {item.messages[0]?.createdAt ? new Date(item.messages[0].createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </Text>
                  </View>
                  <Text style={styles.lastMsg} numberOfLines={1}>
                    {item.messages[0]?.type === 'image' ? '📷 Photo' : (item.messages[0]?.content || 'Tap to start chatting...')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Group Creation Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Group</Text>
            
            <TextInput 
              style={styles.input} 
              placeholder="Group Name" 
              placeholderTextColor="#94a3b8"
              value={groupName} 
              onChangeText={setGroupName}
            />
            
            <Text style={styles.subTitle}>Select Members:</Text>
            <FlatList 
              data={allUsers.data}
              keyExtractor={u => u.id}
              style={{ maxHeight: 200, marginBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => toggleUserSelection(item.id)} style={styles.selectRow}>
                  <View style={{flexDirection:'row', alignItems:'center'}}>
                     <View style={[styles.miniAvatar, item.isOnline && {borderColor: '#10b981', borderWidth: 1}]}>
                        <Text style={{color:'#fff', fontSize:10}}>{item.username[0]}</Text>
                     </View>
                     <Text style={styles.selectText}>{item.username}</Text>
                  </View>
                  {selectedUsers.includes(item.id) ? (
                    <Ionicons name="checkmark-circle" size={24} color="#6366f1" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color="#64748b" />
                  )}
                </TouchableOpacity>
              )}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateGroup} style={styles.createBtn}>
                <Text style={styles.createText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 10 },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  screenTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  createGroupBtn: { padding: 5 },

  sectionContainer: { marginBottom: 20, height: 110 }, 
  sectionTitle: { color: '#94a3b8', marginLeft: 20, marginBottom: 10, fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  
  // Users
  userChip: { alignItems: 'center', marginRight: 15, width: 68 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  onlineBorder: { borderWidth: 2, borderColor: '#10b981' }, 
  onlineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#10b981', position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#0f172a' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  username: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  boldUsername: { color: '#fff', fontWeight: 'bold' },

  // Chats
  chatRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  chatAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  chatInfo: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dateText: { color: '#64748b', fontSize: 11 },
  lastMsg: { color: '#94a3b8', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 20, padding: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  subTitle: { color: '#94a3b8', marginBottom: 10, marginTop: 10 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  selectRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155' },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  selectText: { color: '#fff', fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  cancelBtn: { padding: 12 },
  cancelText: { color: '#94a3b8', fontSize: 16 },
  createBtn: { backgroundColor: '#6366f1', padding: 12, borderRadius: 8, width: 100, alignItems: 'center' },
  createText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
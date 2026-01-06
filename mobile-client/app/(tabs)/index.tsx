// mobile-client/app/(tabs)/index.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '../../src/utils/trpc';

export default function TodoScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  
  // Use 'useUtils' for tRPC v11 OR 'useContext' for tRPC v10
  // Since we are fixing for your setup, we assume standard context:
  const utils = trpc.useContext(); 
  
  const todos = trpc.getTodos.useQuery();
  const addTodo = trpc.addTodo.useMutation({ 
    onSuccess: () => { 
      utils.getTodos.invalidate(); 
      setText(''); 
    } 
  });
  const toggleTodo = trpc.toggleTodo.useMutation({ onSuccess: () => utils.getTodos.invalidate() });
  const deleteTodo = trpc.deleteTodo.useMutation({ onSuccess: () => utils.getTodos.invalidate() });

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput 
          style={styles.input} 
          placeholder="Add Task..." 
          placeholderTextColor="#94a3b8" 
          value={text} 
          onChangeText={setText} 
        />
        <TouchableOpacity 
          onPress={() => { if(text) addTodo.mutate({ text }); }} 
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={todos.data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.todoItem}>
            <TouchableOpacity 
              onPress={() => toggleTodo.mutate({ id: item.id, done: !item.done })} 
              style={{flex:1}}
            >
              <Text style={[styles.todoText, item.done && styles.doneText]}>{item.text}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteTodo.mutate({ id: item.id })}>
              <Text style={styles.delText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0f172a' },
  inputRow: { flexDirection: 'row', marginBottom: 20 },
  input: { flex: 1, backgroundColor: '#1e293b', color: '#fff', padding: 12, borderRadius: 8, marginRight: 10 },
  addBtn: { backgroundColor: '#6366f1', width: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 24 },
  todoItem: { flexDirection: 'row', backgroundColor: '#1e293b', padding: 15, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  todoText: { color: '#fff', fontSize: 16 },
  doneText: { textDecorationLine: 'line-through', color: '#64748b' },
  delText: { color: '#ef4444', fontSize: 18, marginLeft: 10 },
  logoutBtn: { marginTop: 20, alignSelf: 'center', marginBottom: 20 },
  logoutText: { color: '#ef4444' }
});
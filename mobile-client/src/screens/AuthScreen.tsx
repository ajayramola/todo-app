import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '../utils/trpc';

export function AuthScreen({ navigation }: any) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  
  const loginMutation = trpc.login.useMutation();
  const registerMutation = trpc.register.useMutation();

  const handleAuth = async () => {
    try {
      if (isRegister) {
        const res = await registerMutation.mutateAsync({ username, password, email });
        await AsyncStorage.setItem('token', res.token);
        navigation.replace('Chat');
      } else {
        // Step 1: Login (Request OTP)
        const res = await loginMutation.mutateAsync({ username, password });
        Alert.alert('OTP Sent', res.message);
        // For simplicity, in this mobile demo, I am skipping the UI for OTP input 
        // You would navigate to an OTP Screen here normally.
        // Let's assume you add an OTP input field below password if step === 'otp'
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 justify-center p-6">
      <Text className="text-white text-3xl font-bold mb-8 text-center">
        {isRegister ? 'Create Account' : 'Welcome Back'}
      </Text>

      <View className="space-y-4">
        <TextInput
          placeholder="Username"
          placeholderTextColor="#64748b"
          value={username}
          onChangeText={setUsername}
          className="bg-slate-800 text-white p-4 rounded-xl"
        />
        
        {isRegister && (
          <TextInput
            placeholder="Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            className="bg-slate-800 text-white p-4 rounded-xl mt-4"
          />
        )}

        <TextInput
          placeholder="Password"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="bg-slate-800 text-white p-4 rounded-xl mt-4"
        />

        <TouchableOpacity 
          onPress={handleAuth}
          className="bg-indigo-600 p-4 rounded-xl mt-6"
        >
          <Text className="text-white text-center font-bold text-lg">
            {isRegister ? 'Sign Up' : 'Log In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
          <Text className="text-indigo-400 text-center mt-6">
            {isRegister ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
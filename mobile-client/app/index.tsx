import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Easing 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { trpc } from '../src/utils/trpc';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  const router = useRouter();
  
  // --- UI State ---
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [timeLeft, setTimeLeft] = useState(600);

  // --- Toast State ---
  const [toastMsg, setToastMsg] = useState('');
  const toastAnim = useRef(new Animated.Value(-100)).current; // Start hidden above screen

  // --- Form Data ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  // --- API Mutations ---
  const loginMutation = trpc.login.useMutation();
  const registerMutation = trpc.register.useMutation();
  const verifyOtpMutation = trpc.verifyOtp.useMutation(); 

  // --- Timer Logic ---
  useEffect(() => {
    let interval: any;
    if (step === 'otp' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- CUSTOM TOASTER FUNCTION ---
  const showToast = (message: string) => {
    setToastMsg(message);
    
    // Slide Down
    Animated.timing(toastAnim, {
      toValue: 50, // Position from top
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease)
    }).start();

    // Hide after 3 seconds
    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -100, // Slide back up
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 3000);
  };

  // --- Handle Submit ---
  const handleAuth = async () => {
    try {
      if (isRegister) {
        // === REGISTER ===
        const res = await registerMutation.mutateAsync({ username, password, email });
        await finishLogin(res.token);
      } else {
        // === LOGIN ===
        if (step === 'credentials') {
          // Step 1: Check Password
          await loginMutation.mutateAsync({ username, password });
          
          setTimeLeft(600);
          setStep('otp');
          
          // ✅ USE TOAST HERE
          showToast('✅ OTP Sent! Check your email.');
          
        } else {
          // Step 2: Verify OTP
          const res = await verifyOtpMutation.mutateAsync({ username, otp });
          await finishLogin(res.token);
        }
      }
    } catch (err: any) {
      // ❌ USE TOAST FOR ERRORS TOO
      showToast(`❌ ${err.message || 'Something went wrong'}`);
      
      if (err.message?.includes("Expired")) setStep('credentials');
    }
  };

  const finishLogin = async (token: string) => {
    if (token) {
      await AsyncStorage.setItem('token', token);
      router.replace('/(tabs)');
    }
  };

  const isLoading = loginMutation.isLoading || registerMutation.isLoading || verifyOtpMutation.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
      
      {/* --- TOAST NOTIFICATION COMPONENT --- */}
      <Animated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <View style={styles.card}>
          
          {/* Back Button */}
          {!isRegister && step === 'otp' && (
            <TouchableOpacity onPress={() => setStep('credentials')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#94a3b8" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.title}>
            {isRegister ? 'Create Account' : (step === 'otp' ? 'Security Check' : 'Welcome Back')}
          </Text>

          {/* Form Fields */}
          <View style={step === 'otp' ? styles.hidden : styles.visible}>
            <Text style={styles.label}>Username</Text>
            <TextInput 
              style={styles.input} placeholder="Enter username" placeholderTextColor="#64748b"
              value={username} onChangeText={setUsername} autoCapitalize="none"
            />
          </View>

          {isRegister && (
            <View>
              <Text style={styles.label}>Email Address</Text>
              <TextInput 
                style={styles.input} placeholder="name@example.com" placeholderTextColor="#64748b"
                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
              />
            </View>
          )}

          {(isRegister || step === 'credentials') && (
            <View>
              <Text style={styles.label}>Password</Text>
              <TextInput 
                style={styles.input} placeholder="Enter password" placeholderTextColor="#64748b"
                secureTextEntry value={password} onChangeText={setPassword} 
              />
            </View>
          )}

          {!isRegister && step === 'otp' && (
            <View style={styles.otpContainer}>
              <Text style={[styles.timer, timeLeft < 60 ? styles.timerRed : styles.timerBlue]}>
                 ⏱ {formatTime(timeLeft)}
              </Text>
              <TextInput 
                style={styles.otpInput} placeholder="000000" placeholderTextColor="#475569"
                value={otp} onChangeText={setOtp} keyboardType="numeric" maxLength={6} autoFocus
              />
            </View>
          )}

          <TouchableOpacity onPress={handleAuth} style={styles.btn} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{isRegister ? 'Sign Up' : (step === 'otp' ? 'Verify Code' : 'Next')}</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isRegister ? "Already have an account?" : (step === 'credentials' ? "Don't have an account?" : "")}
            </Text>
            {(isRegister || step === 'credentials') && (
              <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
                <Text style={styles.link}>{isRegister ? 'Log In' : 'Sign Up'}</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#1e293b', padding: 25, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.3, elevation: 10 },
  
  // --- TOAST STYLES ---
  toast: {
    position: 'absolute', top: 0, left: 20, right: 20, zIndex: 100,
    backgroundColor: '#334155', padding: 15, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: "#000", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 }, elevation: 5,
    borderLeftWidth: 5, borderLeftColor: '#6366f1'
  },
  toastText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  title: { fontSize: 28, color: '#fff', fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  label: { color: '#94a3b8', fontSize: 12, marginLeft: 4, marginBottom: 4 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#334155' },
  
  otpContainer: { alignItems: 'center', marginBottom: 20 },
  otpInput: { backgroundColor: '#0f172a', color: '#fff', fontSize: 32, letterSpacing: 8, textAlign: 'center', padding: 15, borderRadius: 12, width: '100%', borderWidth: 2, borderColor: '#6366f1' },
  
  timer: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  timerBlue: { color: '#818cf8' },
  timerRed: { color: '#ef4444' },

  btn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: '#64748b' },
  link: { color: '#818cf8', fontWeight: 'bold', marginLeft: 5 },

  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backText: { color: '#94a3b8', marginLeft: 5 },

  hidden: { display: 'none' },
  visible: { display: 'flex' }
});
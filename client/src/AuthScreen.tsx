import React, { useState, useEffect } from 'react';
import { trpc } from './trpc';


export function AuthScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  
  // --- Form State ---
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // Stores email for registration
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  
  // --- Timer State (600 seconds = 10 minutes) ---
  const [timeLeft, setTimeLeft] = useState(600);

  // --- API Mutations ---
  const loginMutation = trpc.login.useMutation();
  const verifyOtpMutation = trpc.verifyOtp.useMutation();
  const registerMutation = trpc.register.useMutation();

  // --- Timer Logic ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Helper to show time as 09:59
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        // --- REGISTER FLOW ---
        // Sends Username, Password, AND Email
        const result = await registerMutation.mutateAsync({ username, password, email });
        onLogin(result.token);
      } else {
        // --- LOGIN FLOW ---
        if (step === 'credentials') {
          // Step 1: Check Password -> Server sends Email OTP
          await loginMutation.mutateAsync({ username, password });
          setTimeLeft(600); // Reset timer
          setStep('otp');   // Switch UI
        } else {
          // Step 2: Verify OTP
          const result = await verifyOtpMutation.mutateAsync({ username, otp });
          onLogin(result.token);
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      // If server says "Expired", go back to start
      if (err.message?.includes("Expired")) setStep('credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl relative">
        
        {/* Back Button (Only visible during OTP step) */}
        {!isRegister && step === 'otp' && (
          <button 
            type="button" 
            onClick={() => { setStep('credentials'); setError(''); }} 
            className="absolute top-4 left-4 text-slate-500 hover:text-white text-sm"
          >
            ← Back
          </button>
        )}

        <h2 className="text-3xl font-bold text-white mb-6 text-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          {isRegister ? 'Create Account' : (step === 'otp' ? 'Security Check' : 'Welcome Back')}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* USERNAME INPUT (Always visible unless OTP step) */}
          <div className={step === 'otp' ? 'hidden' : 'block'}>
            <label className="text-slate-400 text-sm ml-1">Username</label>
            <input 
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 mt-1 focus:border-indigo-500 outline-none transition-all"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Enter username" 
            />
          </div>

          {/* EMAIL INPUT (Visible ONLY when Registering) */}
          {isRegister && (
             <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-slate-400 text-sm ml-1">Email Address</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 mt-1 focus:border-indigo-500 outline-none transition-all"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="name@example.com" 
                />
             </div>
          )}

          {/* PASSWORD INPUT (Visible ONLY during Step 1) */}
          {step === 'credentials' && (
            <div>
              <label className="text-slate-400 text-sm ml-1">Password</label>
              <input 
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 mt-1 focus:border-indigo-500 outline-none transition-all"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password" 
              />
            </div>
          )}

          {/* OTP INPUT (Visible ONLY during Step 2) */}
          {!isRegister && step === 'otp' && (
            <div className="text-center animate-in fade-in slide-in-from-right-4 duration-300">
              <p className={`text-xl font-mono font-bold mt-1 ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`}>
                ⏱ {formatTime(timeLeft)}
              </p>
              <input 
                className="w-full bg-slate-950 border-2 border-indigo-500/50 text-white text-center text-3xl tracking-[0.5em] rounded-lg p-3 mt-2 focus:border-indigo-500 outline-none font-mono"
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                maxLength={6} 
                placeholder="000000" 
                autoFocus 
              />
            </div>
          )}

          {/* Error Message Display */}
          {error && (
            <p className="text-red-400 text-sm text-center bg-red-400/10 p-2 rounded animate-pulse">
              {error}
            </p>
          )}

          {/* Main Action Button */}
          <button 
            disabled={loginMutation.isLoading || registerMutation.isLoading || verifyOtpMutation.isLoading} 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(loginMutation.isLoading || verifyOtpMutation.isLoading) ? 'Processing...' : (
              isRegister ? 'Sign Up' : (step === 'otp' ? 'Verify Code' : 'Next')
            )}
          </button>
        </form>

        {/* Toggle Login/Signup Mode */}
        <p className="text-center mt-6 text-slate-500 text-sm">
          {isRegister ? "Already have an account?" : (step === 'credentials' ? "Don't have an account?" : "")}
          
          {(isRegister || step === 'credentials') && (
            <button 
              onClick={() => { setIsRegister(!isRegister); setError(''); }} 
              className="text-indigo-400 font-bold ml-2 hover:underline"
            >
              {isRegister ? 'Log In' : 'Sign Up'}
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
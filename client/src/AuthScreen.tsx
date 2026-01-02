import React, { useState, useEffect } from 'react';
import { trpc } from './trpc';

export function AuthScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  
  // Timer State (600 seconds = 10 minutes)
  const [timeLeft, setTimeLeft] = useState(600);

  const loginMutation = trpc.login.useMutation();
  const verifyOtpMutation = trpc.verifyOtp.useMutation();
  const registerMutation = trpc.register.useMutation();

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegister) {
        const result = await registerMutation.mutateAsync({ username, password });
        onLogin(result.token);
      } else {
        if (step === 'credentials') {
          await loginMutation.mutateAsync({ username, password });
          setTimeLeft(600);
          setStep('otp');
        } else {
          const result = await verifyOtpMutation.mutateAsync({ username, otp });
          onLogin(result.token);
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      if (err.message?.includes("Expired")) setStep('credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl relative">
        {!isRegister && step === 'otp' && (
          <button type="button" onClick={() => { setStep('credentials'); setError(''); }} className="absolute top-4 left-4 text-slate-500 hover:text-white text-sm">← Back</button>
        )}

        <h2 className="text-3xl font-bold text-white mb-6 text-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          {isRegister ? 'Create Account' : (step === 'otp' ? 'Security Check' : 'Welcome Back')}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={step === 'otp' ? 'hidden' : 'block'}>
            <label className="text-slate-400 text-sm ml-1">Username</label>
            <input className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 mt-1 focus:border-indigo-500 outline-none" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" />
          </div>

          {step === 'credentials' && (
            <div>
              <label className="text-slate-400 text-sm ml-1">Password</label>
              <input className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-3 mt-1 focus:border-indigo-500 outline-none" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
            </div>
          )}

          {!isRegister && step === 'otp' && (
            <div className="text-center animate-in fade-in slide-in-from-right-4 duration-300">
              <p className={`text-xl font-mono font-bold mt-1 ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`}>⏱ {formatTime(timeLeft)}</p>
              <input className="w-full bg-slate-950 border-2 border-indigo-500/50 text-white text-center text-3xl tracking-[0.5em] rounded-lg p-3 mt-2 focus:border-indigo-500 outline-none font-mono" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} placeholder="000000" autoFocus />
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center bg-red-400/10 p-2 rounded">{error}</p>}

          <button disabled={loginMutation.isLoading || registerMutation.isLoading || verifyOtpMutation.isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all mt-2 disabled:opacity-50">
            {(loginMutation.isLoading || verifyOtpMutation.isLoading) ? 'Processing...' : (isRegister ? 'Sign Up' : (step === 'otp' ? 'Verify Code' : 'Next'))}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-500 text-sm">
          {isRegister ? "Already have an account?" : (step === 'credentials' ? "Don't have an account?" : "")}
          {(isRegister || step === 'credentials') && (
     <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-indigo-400 font-bold ml-2 hover:underline">
              {isRegister ? 'Log In' : 'Sign Up'}
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
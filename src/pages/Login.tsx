import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, collection, query, limit } from 'firebase/firestore';
import { motion } from 'motion/react';
import { LogIn, Hospital } from 'lucide-react';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      setLoading(true);
      const user = result.user;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Auto-create profile for first user or whitelisted admins
        const { setDoc, serverTimestamp } = await import('firebase/firestore');
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
        const isFirstUser = usersSnap.empty;
        const isWhitelistedAdmin = ['aaronwisdom43@gmail.com', 'aaronwisdom77@gmail.com'].includes(user.email || '');

        await setDoc(docRef, {
          uid: user.uid,
          name: user.displayName || 'New Staff',
          email: user.email,
          role: (isFirstUser || isWhitelistedAdmin) ? 'admin' : 'staff',
          status: (isFirstUser || isWhitelistedAdmin) ? 'active' : 'inactive',
          createdAt: serverTimestamp()
        });
        navigate('/');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked! Please allow popups for this site.');
      } else {
        setError('Login failed. Please verify your workspace credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (isRegistering && name.trim().length < 2) {
      setError('Please enter your full name.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        const { createUserWithEmailAndPassword } = await import('firebase/auth');
        const { setDoc, serverTimestamp } = await import('firebase/firestore');
        
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Check if first user or whitelisted admin
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
        const isFirstUser = usersSnap.empty;
        const isWhitelistedAdmin = ['aaronwisdom43@gmail.com', 'aaronwisdom77@gmail.com'].includes(user.email || '');
        const shouldBeActiveAdmin = isFirstUser || isWhitelistedAdmin;

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: name || 'New Staff',
          email: user.email,
          role: shouldBeActiveAdmin ? 'admin' : 'staff',
          status: shouldBeActiveAdmin ? 'active' : 'inactive',
          createdAt: serverTimestamp()
        });

        if (!shouldBeActiveAdmin) {
          setError('Account created! Please wait for an administrator to activate your profile.');
          await auth.signOut();
        } else {
          navigate('/');
        }
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;

        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError('Profile not found. Please contact an administrator.');
          await auth.signOut();
        } else if (docSnap.data().status === 'inactive') {
          setError('Account inactive. Please contact an administrator.');
          await auth.signOut();
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase. Please enable it in the Firebase Console under Authentication > Sign-in method.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. Please verify your email and password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else {
        setError(err.message || 'Authentication error.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600 rounded-full blur-3xl"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md z-10 p-4"
      >
        <div className="bg-white p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200/50 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="text-white font-black text-3xl font-sans">D</span>
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-sans">Divine Love</h2>
              <p className="text-blue-600 text-[10px] font-bold tracking-[0.2em] uppercase">Medical System Portal</p>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`mb-6 p-4 text-[11px] font-bold rounded-xl border flex items-center gap-3 ${
                error.includes('created') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                error.includes('created') ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              {error}
            </motion.div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {isRegistering && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                  placeholder="Dr. John Doe"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Email Access</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                placeholder="staff.id@divinelove.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Secure Pin</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div className="pt-2">
              <button
                disabled={loading}
                type="submit"
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center text-[11px] uppercase tracking-widest"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    {isRegistering ? 'Register Profile' : 'Authorize Access'}
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="text-center mt-6">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
            >
              {isRegistering ? 'Back to Login' : 'Request Registry Access'}
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest text-[9px] uppercase">Identity Verification</span></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-[11px] font-black uppercase tracking-widest shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
            Workspace SSO
          </button>

          <footer className="mt-10 text-center">
             <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[280px] mx-auto">
               Secure enterprise environment. All connections are encrypted and logged for regulatory compliance.
             </p>
          </footer>
        </div>
      </motion.div>
    </div>
  );
}

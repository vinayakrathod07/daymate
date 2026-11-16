import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, UserPlus, LogIn, BookOpen, KeyRound } from 'lucide-react';
import { StudentProfile } from '../types/daymate';
import { simpleHash, uid } from '../utils/storage';
import {
  registerWithEmail,
  resetUserPassword,
  signInWithEmail,
  signInWithGmail,
} from '../services/firebase';
import type { User } from 'firebase/auth';

interface AuthScreenProps {
  accounts: StudentProfile[];
  onLocalLogin: (profile: StudentProfile) => void;
  onLocalRegister: (profile: StudentProfile) => void;
  onFirebaseAuthSuccess: (user: User, extraProfile?: Partial<StudentProfile>) => Promise<void>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  accounts,
  onLocalLogin,
  onLocalRegister,
  onFirebaseAuthSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [authError, setAuthError] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState(accounts[0]?.email || '');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [semester, setSemester] = useState('Semester V');
  const [college, setCollege] = useState('Presidency University, Bengaluru');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});

  // Reset password
  const [resetEmail, setResetEmail] = useState('');

  const passwordStrength =
    password.length === 0
      ? 0
      : password.length < 6
        ? 1
        : /[A-Z]/.test(password) && /[0-9]/.test(password) && password.length >= 8
          ? 3
          : 2;

  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthNotice('');
    setBusy(true);
    try {
      const user = await signInWithGmail();
      await onFirebaseAuthSuccess(user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In was cancelled or blocked.';
      setAuthError(
        msg.includes('popup-closed-by-user')
          ? 'Google sign-in popup was closed before completing.'
          : `Google sign-in failed: ${msg}`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail || !loginPassword) {
      setAuthError('Enter both your email address and password.');
      return;
    }

    setBusy(true);
    try {
      const fbUser = await signInWithEmail(trimmedEmail, loginPassword);
      await onFirebaseAuthSuccess(fbUser);
      return;
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      // Fallback to local registered account check if Firebase Email/Password is not enabled or user is local
      const foundLocal = accounts.find((a) => a.email.toLowerCase() === trimmedEmail);
      if (foundLocal && (!foundLocal.passwordHash || foundLocal.passwordHash === simpleHash(loginPassword))) {
        onLocalLogin(foundLocal);
        setBusy(false);
        return;
      }

      if (code === 'auth/operation-not-allowed') {
        setAuthError(
          'Firebase Email/Password sign-in is not enabled yet in Firebase Console (Authentication -> Sign-in method -> Email/Password). Use "Continue with Google (Gmail)" or "Demo Student Login" below.',
        );
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setAuthError('Invalid email or password. For the demo account, use "daymate123" or click Demo Student Login.');
      } else {
        setAuthError(err instanceof Error ? err.message : 'Unable to sign in.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = 'Enter your full name (at least 2 characters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (!rollNumber.trim()) errors.rollNumber = 'Enter your Roll Number or USN.';
    if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';

    setRegisterErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const profileDraft: StudentProfile = {
      id: uid('usr'),
      name: name.trim(),
      email: email.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      course: 'BCA — Bachelor of Computer Applications',
      semester: semester.trim() || 'Semester V',
      section: 'Section A',
      college: college.trim() || 'Presidency University, Bengaluru',
      facultyMentor: 'Ms. Rajitha Reddy',
      academicYear: '2026–2027',
      monthlyBudget: 4500,
      previousCredits: 0,
      previousCgpa: 0,
      passwordHash: simpleHash(password),
      authProvider: 'password',
    };

    setBusy(true);
    try {
      const fbUser = await registerWithEmail(name.trim(), email.trim(), password);
      await onFirebaseAuthSuccess(fbUser, profileDraft);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        // Gracefully register locally and inform about Firebase Email/Password toggle
        onLocalRegister(profileDraft);
      } else if (code === 'auth/email-already-in-use') {
        setAuthError('This email is already registered. Switch to Sign In or use Google Sign-In.');
      } else {
        setAuthError(err instanceof Error ? err.message : 'Registration failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthNotice('');
    if (!resetEmail.trim()) {
      setAuthError('Enter your registered email address.');
      return;
    }
    setBusy(true);
    try {
      await resetUserPassword(resetEmail.trim());
      setAuthNotice('Password reset email sent. Check your inbox.');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  const handleDemoLogin = () => {
    const demo = accounts[0];
    if (demo) onLocalLogin(demo);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
        {/* Left Academic Editorial Panel */}
        <div className="lg:col-span-5 p-8 bg-zinc-900 dark:bg-zinc-950 text-zinc-100 flex flex-col justify-between gap-8">
          <div>
            <div className="flex items-center gap-2.5 text-sm font-medium text-zinc-300">
              <BookOpen className="w-4 h-4" />
              <span>Student DayMate</span>
            </div>
            <h1 className="mt-6 text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
              A Simple Student Planner for a Smarter, Less Stressful College Life
            </h1>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              Sign in with your Gmail / Google account to sync assignments, timetables, 75% attendance
              margins, study notes, flashcards, viva prep, and GPA across devices.
            </p>
          </div>

          <div className="space-y-3 pt-6 border-t border-zinc-800 text-xs text-zinc-400">
            <div className="flex justify-between gap-4">
              <span>Subject</span>
              <span className="text-zinc-200 font-medium text-right">CSA3426 – Frontend Using JS</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>College</span>
              <span className="text-zinc-200 font-medium text-right">Presidency University, Bengaluru</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Auth &amp; Storage</span>
              <span className="text-zinc-200 font-medium text-right">Google Auth + Cloud Firestore</span>
            </div>
          </div>
        </div>

        {/* Right Auth Form Panel */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {mode === 'login'
                  ? 'Student Sign In'
                  : mode === 'register'
                    ? 'Create Student Account'
                    : 'Reset Password'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Sign in with Gmail, email &amp; password, or explore the demo workspace.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setAuthError('');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setAuthError('');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Primary Google / Gmail Sign-In Button */}
          <div className="mt-5 space-y-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleLogin}
              className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>{busy ? 'Connecting...' : 'Continue with Google (Gmail)'}</span>
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
              <span className="shrink-0 mx-3 text-[11px] text-zinc-400">or with email &amp; password</span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
            </div>
          </div>

          {authError && (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
              {authError}
            </p>
          )}
          {authNotice && (
            <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400" role="status">
              {authNotice}
            </p>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-3.5" noValidate>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setResetEmail(loginEmail);
                      setAuthError('');
                    }}
                    className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password (demo: daymate123)"
                    className="w-full px-3.5 py-2 pr-10 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <span>Demo Student</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-3" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vinayak Rathod"
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                  {registerErrors.name && <p className="text-[11px] text-red-600 mt-0.5">{registerErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Roll Number / USN</label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="20241BCA0148"
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                  {registerErrors.rollNumber && (
                    <p className="text-[11px] text-red-600 mt-0.5">{registerErrors.rollNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                  {registerErrors.email && <p className="text-[11px] text-red-600 mt-0.5">{registerErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Semester</label>
                  <input
                    type="text"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">College / University</label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                  {password.length > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <span>Strength:</span>
                      <span
                        className={
                          passwordStrength === 3
                            ? 'text-emerald-600 font-medium'
                            : passwordStrength === 2
                              ? 'text-amber-600 font-medium'
                              : 'text-red-600 font-medium'
                        }
                      >
                        {passwordStrength === 3 ? 'Strong' : passwordStrength === 2 ? 'Moderate' : 'Weak'}
                      </span>
                    </div>
                  )}
                  {registerErrors.password && (
                    <p className="text-[11px] text-red-600 mt-0.5">{registerErrors.password}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                  />
                  {registerErrors.confirmPassword && (
                    <p className="text-[11px] text-red-600 mt-0.5">{registerErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account &amp; Enter Planner</span>
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="mt-4 space-y-3.5" noValidate>
              <div>
                <label className="block text-xs font-medium mb-1">Registered Email Address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                />
              </div>
              <div className="flex gap-2.5">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Send Reset Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="px-4 py-2.5 text-sm font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

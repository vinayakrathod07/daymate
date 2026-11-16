import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, UserPlus, LogIn, BookOpen } from 'lucide-react';
import { StudentProfile } from '../types/daymate';
import { simpleHash, uid } from '../utils/storage';

interface AuthScreenProps {
  accounts: StudentProfile[];
  onLogin: (profile: StudentProfile) => void;
  onRegister: (profile: StudentProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ accounts, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState(accounts[0]?.email || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [semester, setSemester] = useState('Semester V');
  const [college, setCollege] = useState('Presidency University, Bengaluru');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>({});

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setLoginError('Please enter your university email address.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }
    const found = accounts.find((a) => a.email.toLowerCase() === trimmedEmail);
    if (!found) {
      setLoginError('No local account matches that email. Try the Demo Student login or register below.');
      return;
    }
    if (found.passwordHash && found.passwordHash !== simpleHash(loginPassword)) {
      setLoginError('Incorrect password. For the demo account, use "daymate123" or click Demo Login.');
      return;
    }
    onLogin(found);
  };

  const handleDemoLogin = () => {
    const demo = accounts[0];
    if (demo) {
      onLogin(demo);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = 'Enter your full name (at least 2 characters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) {
      errors.email = 'An account with this email already exists locally.';
    }
    if (!rollNumber.trim()) errors.rollNumber = 'Enter your Roll Number or USN.';
    if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';

    setRegisterErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const newProfile: StudentProfile = {
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
    };
    onRegister(newProfile);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden">
        {/* Left editorial academic panel */}
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
              Organise assignments, class timetables, 75% attendance margins, study notes, flashcards,
              exam readiness, and GPA calculations in one browser-stored workspace.
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
              <span>Storage Model</span>
              <span className="text-zinc-200 font-medium text-right">Client-side localStorage</span>
            </div>
          </div>
        </div>

        {/* Right authentication form */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {mode === 'login' ? 'Student Sign In' : 'Create Local Profile'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {mode === 'login'
                  ? 'Access your saved academic workspace on this browser.'
                  : 'Register a new student profile stored in localStorage.'}
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'login'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'register'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  University Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="student@presidencyuniversity.in"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password (demo: daymate123)"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                  {loginError}
                </p>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
                >
                  <span>Demo Student Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-3.5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vinayak Rathod"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                  />
                  {registerErrors.name && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{registerErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Roll Number / USN
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="20241BCA0148"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                  />
                  {registerErrors.rollNumber && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{registerErrors.rollNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@presidencyuniversity.in"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                  />
                  {registerErrors.email && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{registerErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="Semester V"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  College / University
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                  />
                  {registerErrors.password && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{registerErrors.password}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-200"
                  />
                  {registerErrors.confirmPassword && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{registerErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account & Enter Planner</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

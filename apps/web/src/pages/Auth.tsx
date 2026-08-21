import React, { useState } from 'react';
import { useMutation } from 'urql';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        role
      }
    }
  }
`;

const REGISTER_MUTATION = `
  mutation Register($name: String!, $email: String!, $password: String!, $role: UserRole!) {
    register(name: $name, email: $email, password: $password, role: $role) {
      token
      user {
        id
        name
        role
      }
    }
  }
`;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('REPORTER');
  const navigate = useNavigate();

  const [, login] = useMutation(LOGIN_MUTATION);
  const [, register] = useMutation(REGISTER_MUTATION);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Authenticating...');

    try {
      const result = isLogin 
        ? await login({ email, password })
        : await register({ name, email, password, role });

      if (result.error) {
        toast.error(result.error.message, { id: loadingToast });
        return;
      }

      const payload = isLogin ? result.data.login : result.data.register;
      localStorage.setItem('token', payload.token);
      localStorage.setItem('user', JSON.stringify(payload.user));
      
      toast.success('Successfully authenticated!', { id: loadingToast });
      // Force a reload to ensure URQL client picks up the new token immediately
      window.location.href = '/tickets';
    } catch (err) {
      toast.error('An unexpected error occurred', { id: loadingToast });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-background to-background">
      <div className="w-full max-w-md p-8 bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">SLA Tracker</h1>
          <p className="text-zinc-400 mt-2 text-sm">{isLogin ? 'Sign in to your account' : 'Create a new account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
              <input 
                required 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" 
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
            <input 
              required 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" 
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
            <input 
              required 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" 
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Role</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="REPORTER">Reporter (Can create tickets)</option>
                <option value="AGENT">Agent (Can resolve & assign tickets)</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-white text-black font-medium py-2 rounded-md hover:bg-zinc-200 transition-colors mt-2"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

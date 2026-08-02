import React, { useState } from 'react';
import { useSprintStore } from '../store/useSprintStore';
import { Shield, Users, Lock, ArrowRight, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
    const { loginTeam, createTeam, isLoading } = useSprintStore();
    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name || !password) {
            setError('Please fill in all fields');
            return;
        }

        const result = isCreating
            ? await createTeam(name, password)
            : await loginTeam(name, password);

        if (!result.success) {
            setError(result.error || 'Authentication failed');
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-2xl mb-4">
                        <Shield className="w-10 h-10 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Team Assemble</h1>
                    <p className="text-slate-400">Team-based Sprint Role Management</p>
                </div>

                <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
                    <div className="flex gap-4 mb-8 p-1 bg-slate-900/50 rounded-xl">
                        <button
                            onClick={() => { setIsCreating(false); setError(null); }}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${!isCreating ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => { setIsCreating(true); setError(null); }}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${isCreating ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Create Team
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Team Name</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="Enter team name..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="Enter team password..."
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isCreating ? 'Create Team' : 'Login to Team'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-slate-500 text-sm">
                    Crisologo . Team Assemble . 2026
                </p>
            </div>
        </div>
    );
};

export default Login;

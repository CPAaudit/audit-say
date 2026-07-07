'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCombinedProfile, createPublicProfile, checkUsernameExists, UserProfile } from '../lib/db';

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
    signUp: (email: string, pass: string, username: string) => Promise<{ success: boolean; msg?: string; error?: string }>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    loginAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (authUserId: string, email?: string) => {
        const profile = await getCombinedProfile(authUserId, email);
        setUser(profile);
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email);
            } else {
                const isGuest = typeof window !== 'undefined' ? sessionStorage.getItem('is_guest') : null;
                if (isGuest === 'true') {
                    setUser({
                        id: 'guest_user',
                        username: '비회원',
                        role: 'GUEST',
                        level: 1,
                        exp: 0,
                    });
                } else {
                    setUser(null);
                }
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                fetchProfile(session.user.id, session.user.email);
            } else {
                const isGuest = typeof window !== 'undefined' ? sessionStorage.getItem('is_guest') : null;
                if (isGuest === 'true') {
                    setUser({
                        id: 'guest_user',
                        username: '비회원',
                        role: 'GUEST',
                        level: 1,
                        exp: 0,
                    });
                } else {
                    setUser(null);
                }
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, pass: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: pass,
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (data.user) {
                await fetchProfile(data.user.id, data.user.email);
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message || '로그인 중 오류가 발생했습니다.' };
        }
    };

    const signUp = async (email: string, pass: string, username: string) => {
        try {
            // 1. Check Username
            const exists = await checkUsernameExists(username);
            if (exists) {
                return { success: false, error: '이미 사용 중인 닉네임입니다.' };
            }

            // 2. Auth Sign Up
            const { data, error } = await supabase.auth.signUp({
                email,
                password: pass,
                options: {
                    data: { username },
                },
            });

            if (error) {
                return { success: false, error: error.message };
            }

            if (data.user) {
                // Create public profile
                const profileCreated = await createPublicProfile(data.user.id, username);
                if (profileCreated) {
                    // If session is already active (auto-login enabled in Supabase)
                    if (data.session) {
                        await fetchProfile(data.user.id, data.user.email);
                    }
                    return { success: true, msg: 'SUCCESS' };
                } else {
                    return { success: true, msg: 'CHECK_EMAIL' };
                }
            }
            return { success: false, error: '가입을 처리하는 도중 사용자 정보가 반환되지 않았습니다.' };
        } catch (err: any) {
            return { success: false, error: err.message || '회원가입 중 오류가 발생했습니다.' };
        }
    };

    const logout = async () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('is_guest');
        }
        await supabase.auth.signOut();
        setUser(null);
    };

    const refreshProfile = async () => {
        if (user?.id && user.id !== 'guest_user') {
            await fetchProfile(user.id, user.email);
        }
    };

    const loginAsGuest = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('is_guest', 'true');
        }
        setUser({
            id: 'guest_user',
            username: '비회원',
            role: 'GUEST',
            level: 1,
            exp: 0,
        });
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signUp, logout, refreshProfile, loginAsGuest }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

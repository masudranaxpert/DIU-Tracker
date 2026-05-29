import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '@/shared/services/authService';
import { UserProfile } from '@/shared/types/types';

interface AuthContextType {
    user: { id: string; email: string } | null;
    profile: UserProfile | null;
    isLoading: boolean;
    refreshProfile: (forceRefresh?: boolean) => Promise<void>;
    mergeProfile: (updates: Partial<UserProfile>) => void;
    logout: () => void;
}

const PROFILE_CACHE_KEY = 'user_profile';

function readCachedProfile(): UserProfile | null {
    try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY);
        return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
        return null;
    }
}

function writeCachedProfile(profile: UserProfile | null) {
    try {
        if (profile) {
            localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
        } else {
            localStorage.removeItem(PROFILE_CACHE_KEY);
        }
    } catch { /* ignore */ }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<{ id: string; email: string } | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(() => {
        if (!localStorage.getItem('auth_token')) return null;
        return readCachedProfile();
    });
    const [isLoading, setIsLoading] = useState(() => {
        const hasAuthToken = !!localStorage.getItem('auth_token');
        return hasAuthToken && readCachedProfile() === null;
    });

    const loadProfile = async (forceRefresh = false) => {
        const authToken = localStorage.getItem('auth_token');
        if (!authToken) {
            setUser(null);
            setProfile(null);
            writeCachedProfile(null);
            localStorage.removeItem('user_profile');
            return;
        }

        try {
            const result = await authService.getProfile(forceRefresh);
            if (result) {
                setUser({ id: result.id, email: result.email });

                const profileData: UserProfile = {
                    id: String(result.id),
                    email: result.email,
                    full_name: result.full_name || '',
                    is_cr: result.is_cr ?? false,
                    is_active: result.is_active ?? true,
                    is_verified: result.is_verified ?? false,
                    batch_id: result.batch_id || '',
                    section: (result.section || 'A') as UserProfile['section'],
                    sub_section: result.sub_section,
                    avatar_url: result.avatar_url,
                    facebook_url: result.facebook_url,
                    whatsapp_number: result.whatsapp_number,
                    telegram_username: result.telegram_username,
                    telegram_chat_id: result.telegram_chat_id,
                };
                setProfile(profileData);
                writeCachedProfile(profileData);
            } else {
                setUser(null);
                setProfile(null);
                writeCachedProfile(null);
            }
        } catch (error) {
            console.error('[AuthProvider] Failed to load profile:', error);
            setUser(null);
            setProfile(null);
            writeCachedProfile(null);
        } finally {
            setIsLoading(false);
        }
    };

    const mergeProfile = (updates: Partial<UserProfile>) => {
        setProfile((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ...updates };
            writeCachedProfile(next);
            return next;
        });
    };

    const logout = async () => {
        await authService.signOut();
        setUser(null);
        setProfile(null);
        writeCachedProfile(null);
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 5000);

        loadProfile(true).finally(() => {
            clearTimeout(timeout);
            setIsLoading(false);
        });

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'auth_token' && !e.newValue) {
                setUser(null);
                setProfile(null);
                writeCachedProfile(null);
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                isLoading,
                refreshProfile: (force) => loadProfile(force ?? true),
                mergeProfile,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

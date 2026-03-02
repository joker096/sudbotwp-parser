import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from 'react';
import { auth, profile } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profileData: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<any>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Предотвращаем повторную инициализацию в React Strict Mode
    if (isInitialized.current) {
      setIsLoading(false);
      return;
    }
    isInitialized.current = true;

    const initAuth = async () => {
      try {
        // Используем getSession вместо getUser для избежания lock конфликтов
        const { data: { session }, error } = await auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);

          const { data: userProfile, error: profileError } = await profile.getProfile(session.user.id);
          
          if (profileError && profileError.code === 'PGRST116') {
            const { data: newProfile } = await profile.createProfile(
              session.user.id,
              session.user.email!,
              session.user.user_metadata?.full_name || session.user.email!.split('@')[0]
            );
            setProfileData(newProfile);
          } else if (userProfile) {
            setProfileData(userProfile);
          }
        }
      } catch (err: any) {
        // Игнорируем ошибки аутентификации для неавторизованных
        if (!err?.message?.includes('session') && !err?.name?.includes('Timeout')) {
          console.error('Auth error:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setIsAuthenticated(true);
        
        profile.getProfile(session.user.id).then(({ data, error }) => {
          if (error && error.code === 'PGRST116') {
            return profile.createProfile(
              session.user.id,
              session.user.email!,
              session.user.user_metadata?.full_name || session.user.email!.split('@')[0]
            );
          }
          return { data };
        }).then(({ data }) => {
          if (data) setProfileData(data);
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setProfileData(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await auth.signInWithGoogle();
      
      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error logging in with Google:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { error } = await auth.signOut();
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) {
      const error = new Error("Пользователь не аутентифицирован");
      console.error(error.message);
      return { error };
    }

    try {
      const { data, error } = await profile.updateProfile(user.id, updates);

      if (error) {
        throw error;
      }

      setProfileData((prevProfile) => prevProfile ? { ...prevProfile, ...data } : data);
      return { error: null };
    } catch (error: any) {
      console.error('Ошибка при обновлении профиля:', error);
      return { error };
    }
  }, [user]);

  const value = {
    user,
    profileData,
    isLoading,
    isAuthenticated,
    loginWithGoogle,
    logout,
    updateProfile,
  };

  return React.createElement(AuthContext.Provider, { value: value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React from 'react';
import { User, Profile } from '../types';

interface ProfileHeaderProps {
  user: User | null;
  profileData: Profile | null;
}

/**
 * ProfileHeader - компонент для отображения информации о пользователе в профиле
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, profileData }) => {
  if (!user) return null;

  const displayName = profileData?.full_name || user.email?.split('@')[0] || 'Пользователь';

  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-semibold">
        {displayName.charAt(0).toUpperCase()}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
        <p className="text-gray-500 text-sm">{user.email}</p>
        {profileData?.phone && (
          <p className="text-gray-400 text-sm">{profileData.phone}</p>
        )}
      </div>
    </div>
  );
};
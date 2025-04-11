import React from 'react';
import { User, Settings } from 'lucide-react';
import '../styles/UserProfile.css';

const UserProfile = ({ username = 'CPLABS', onSettingsClick }) => {
  return (
    <div className="user-profile">
      <div className="user-info">
        <div className="user-avatar">
          <User size={20} />
        </div>
        <div className="user-name">
          {username}
        </div>
      </div>
      <button
        className="profile-settings-button"
        onClick={onSettingsClick}
        title="앱 설정"
      >
        <Settings size={18} />
      </button>
    </div>
  );
};

export default UserProfile;
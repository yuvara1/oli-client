import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IoChevronDown, IoPersonOutline, IoSettingsOutline, IoLogOutOutline, IoCloudUploadOutline, IoShieldOutline } from 'react-icons/io5';
import './Login.css';

const UserProfile = ({ user, onLogout, showUpload = false }) => {
     const [isDropdownOpen, setIsDropdownOpen] = useState(false);
     const dropdownRef = useRef(null);

     if (!user) {
          return null;
     }

     useEffect(() => {
          const handleClickOutside = (event) => {
               if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                    setIsDropdownOpen(false);
               }
          };

          document.addEventListener('mousedown', handleClickOutside);
          return () => document.removeEventListener('mousedown', handleClickOutside);
     }, []);

     useEffect(() => {
          const handleEscape = (event) => {
               if (event.key === 'Escape') {
                    setIsDropdownOpen(false);
               }
          };

          document.addEventListener('keydown', handleEscape);
          return () => document.removeEventListener('keydown', handleEscape);
     }, []);

     const toggleDropdown = () => {
          setIsDropdownOpen(!isDropdownOpen);
     };

     const handleLogout = () => {
          // Clear user cookie
          document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          // Clear user state
          if (typeof window !== 'undefined') {
               localStorage.clear();
          }

          setIsDropdownOpen(false);
          if (onLogout) {
               onLogout();
          }
     };

     // Safe fallbacks for user properties
     const userName = user.name || user.username || 'User';
     const userEmail = user.email || 'No email';

     // Check if user has admin access
     const isAdmin = user && (user.access === 1 || user.access === 2);

     // Get user display name
     const getDisplayName = () => {
          if (user.firstName && user.lastName) {
               return `${user.firstName} ${user.lastName}`;
          }
          return user.username || user.email?.split('@')[0] || 'User';
     };

     // Get user avatar/photo
     const getUserAvatar = () => {
          if (user.photo) {
               return (
                    <img
                         src={user.photo}
                         alt={getDisplayName()}
                         className="user-avatar"
                         onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                         }}
                    />
               );
          }
          return null;
     };

     // Fallback avatar with initials
     const getFallbackAvatar = () => {
          const name = getDisplayName();
          const initials = name.split(' ')
               .map(word => word.charAt(0))
               .join('')
               .toUpperCase()
               .slice(0, 2);

          return (
               <div className="user-avatar-fallback" style={{ display: user.photo ? 'none' : 'flex' }}>
                    {initials}
               </div>
          );
     };

     // Get access level display
     const getAccessLevelDisplay = () => {
          if (user.access === 1) return 'Admin';
          if (user.access === 2) return 'Moderator';
          return 'User';
     };

     // Get access level color
     const getAccessLevelColor = () => {
          if (user.access === 1) return 'admin';
          if (user.access === 2) return 'moderator';
          return 'user';
     };

     return (
          <div className="user-profile" ref={dropdownRef}>
               <button className="user-profile-btn" onClick={toggleDropdown}>
                    <div className="user-avatar-container">
                         {getUserAvatar()}
                         {getFallbackAvatar()}
                    </div>
                    <span className="user-name">{getDisplayName()}</span>
                    {user.premium && <span className="premium-badge">👑</span>}
                    {/* {isAdmin && <span className="admin-badge">🛡️</span>} */}
                    <IoChevronDown className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
               </button>

               <div className={`user-dropdown ${isDropdownOpen ? 'open' : ''}`}>
                    <div className="dropdown-header">
                         <div className="user-avatar-large">
                              {user.photo ? (
                                   <img
                                        src={user.photo}
                                        alt={getDisplayName()}
                                        onError={(e) => {
                                             e.target.style.display = 'none';
                                             e.target.nextSibling.style.display = 'flex';
                                        }}
                                   />
                              ) : null}
                              <div className="user-avatar-fallback-large" style={{ display: user.photo ? 'none' : 'flex' }}>
                                   <IoPersonOutline size={48} />
                              </div>
                         </div>
                         <div className="dropdown-user-info">
                              <div className="dropdown-user-name">{getDisplayName()}</div>
                              <div className="dropdown-user-email">{userEmail}</div>

                              {/* Premium Badge */}
                              {user.premium && (
                                   <div className="dropdown-user-badge premium">Premium</div>
                              )}
                              {!user.premium && (
                                   <div className="dropdown-user-badge free">Free</div>
                              )}

                              {/* Access Level Badge */}
                              {user.access && (
                                   <div className={`dropdown-user-badge access-level ${getAccessLevelColor()}`}>
                                        {getAccessLevelDisplay()}
                                   </div>
                              )}
                         </div>
                    </div>

                    <div className="dropdown-menu">
                         {/* Profile Settings */}
                         {/* <button className="dropdown-item profile" onClick={() => setIsDropdownOpen(false)}>
                              <IoPersonOutline />
                              Profile Settings
                         </button> */}

                         {/* Admin Panel Access */}
                         {isAdmin && (
                              <Link
                                   className="dropdown-item admin"
                                   to='/admin'
                                   onClick={() => setIsDropdownOpen(false)}
                              >
                                   <IoShieldOutline />
                                   Admin Panel
                              </Link>
                         )}

                         {/* Upload Option for Admins */}
                         {/* {(showUpload || isAdmin) && (
                              <Link
                                   className="dropdown-item upload"
                                   to='/upload'
                                   onClick={() => setIsDropdownOpen(false)}
                              >
                                   <IoCloudUploadOutline />
                                   Upload Content
                              </Link>
                         )} */}

                         {/* Settings */}
                         {/* <button className="dropdown-item settings" onClick={() => setIsDropdownOpen(false)}>
                              <IoSettingsOutline />
                              Settings
                         </button> */}

                         {/* Logout */}
                         <button className="dropdown-item logout" onClick={handleLogout}>
                              <IoLogOutOutline />
                              Logout
                         </button>
                    </div>
               </div>
          </div>
     );
};

export default UserProfile;
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';

const getCookie = (name) => {
     const value = `; ${document.cookie}`;
     const parts = value.split(`; ${name}=`);
     if (parts.length === 2) {
          try {
               const cookieValue = parts.pop().split(';').shift();
               return JSON.parse(decodeURIComponent(cookieValue));
          } catch (error) {
               console.error('Error parsing cookie:', error);
               return null;
          }
     }
     return null;
};

function ProtectedRoute({ children, requiredAccess }) {
     const [user, setUser] = useState(null);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
          const checkUser = () => {
               const cookieUser = getCookie('user');
               setUser(cookieUser);
               setLoading(false);
          };

          checkUser();
     }, []);

     if (loading) {
          return (
               <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: '#000',
                    color: '#fff',
                    flexDirection: 'column'
               }}>
                    <div style={{
                         width: '40px',
                         height: '40px',
                         border: '4px solid #333',
                         borderTop: '4px solid #e50914',
                         borderRadius: '50%',
                         animation: 'spin 1s linear infinite',
                         marginBottom: '1rem'
                    }}>
                    </div>
                    <h3>Checking permissions...</h3>
                    <style>
                         {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}
                    </style>
               </div>
          );
     }

     // Check if user exists and has required access
     if (!user || !user.id) {
          console.log('No user found, redirecting to home');
          return <Navigate to="/" replace />;
     }

     // Check if user has required access level
     // Support both single access level and array of access levels
     const hasAccess = Array.isArray(requiredAccess)
          ? requiredAccess.includes(user.access)
          : user.access === requiredAccess;

     if (requiredAccess && !hasAccess) {
          console.log(`User access level: ${user.access}, required: ${requiredAccess}`);

          // Show access denied message
          return (
               <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: '#000',
                    color: '#fff',
                    textAlign: 'center',
                    padding: '2rem'
               }}>
                    <div style={{
                         maxWidth: '500px',
                         padding: '2rem',
                         background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                         borderRadius: '12px',
                         border: '1px solid #444'
                    }}>
                         <h2 style={{ color: '#e50914', marginBottom: '1rem' }}>Access Denied</h2>
                         <p style={{ color: '#ccc', marginBottom: '2rem' }}>
                              You do not have permission to access this page. Admin privileges are required.
                         </p>
                         <button
                              onClick={() => window.history.back()}
                              style={{
                                   padding: '0.75rem 1.5rem',
                                   background: 'linear-gradient(135deg, #e50914 0%, #ff6b35 100%)',
                                   color: 'white',
                                   border: 'none',
                                   borderRadius: '8px',
                                   cursor: 'pointer',
                                   fontSize: '1rem',
                                   fontWeight: '600',
                                   transition: 'all 0.3s ease'
                              }}
                         >
                              Go Back
                         </button>
                    </div>
               </div>
          );
     }

     return children;
}

export default ProtectedRoute;
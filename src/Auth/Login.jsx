import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import './Login.css';

const DOMAIN = import.meta.env.VITE_DOMAIN || 'http://localhost:3000';

function Login({ onLogin, onSwitchToRegister, onClose }) {
     const [form, setForm] = useState({ username: '', password: '' });
     const [error, setError] = useState(null);
     const [loading, setLoading] = useState(false);

     const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

     const handleSubmit = async e => {
          e.preventDefault();
          if (loading) return;

          setLoading(true);
          setError(null);

          if (!form.username || !form.password) {
               setError('Both username and password are required');
               setLoading(false);
               return;
          }

          try {
               const res = await axios.post(`${DOMAIN}/login`, {
                    username: form.username,
                    password: form.password
               });

               if (res.data && res.data.id) {
                    console.log('Manual login successful:', res.data);
                    // ✅ Make sure access is passed correctly
                    onLogin({
                         id: res.data.id,
                         username: res.data.username,
                         email: res.data.email,
                         name: res.data.name,
                         premium: res.data.premium,
                         access: res.data.access || 0  // ✅ Include access level
                    });
               } else {
                    setError('Invalid response from server');
               }
          } catch (err) {
               console.error('Login error:', err);
               if (err.response?.status === 401) {
                    setError('Invalid username or password');
               } else if (err.response?.data?.error) {
                    setError(err.response.data.error);
               } else {
                    setError('Login failed. Please try again.');
               }
          } finally {
               setLoading(false);
          }
     };

     const handleGoogleSuccess = async (credentialResponse) => {
          setLoading(true);
          setError(null);

          try {
               const decoded = jwtDecode(credentialResponse.credential);
               console.log('Google login decoded:', decoded);

               const googleUserData = {
                    email: decoded.email,
                    username: decoded.name,
                    name: decoded.name,
                    picture: decoded.picture
               };

               const response = await axios.post(`${DOMAIN}/google-login`, googleUserData);

               if (response.data && response.data.id) {
                    console.log('Google login successful:', response.data);
                    // ✅ Make sure access is passed correctly
                    onLogin({
                         id: response.data.id,
                         username: response.data.username,
                         email: response.data.email,
                         name: response.data.name || response.data.username,
                         picture: googleUserData.picture,
                         premium: response.data.premium || false,
                         access: response.data.access  // ✅ Include access level
                    });
               } else {
                    setError('Invalid response from server');
               }
          } catch (error) {
               console.error('Google login error:', error);
               if (error.response?.data?.error) {
                    setError(error.response.data.error);
               } else {
                    setError('Google login failed. Please try again.');
               }
          } finally {
               setLoading(false);
          }
     };

     const handleGoogleError = () => {
          console.error('Google login failed');
          setError('Google login failed. Please try again.');
     };

     return (
          <div className="auth-container">
               {/* {onClose && (
                    <button className="modal-close-btn" onClick={onClose}>
                         <IoClose size={24} />
                    </button>
               )} */}
               <div className="auth-card">
                    <h2 className="auth-title">Welcome Back</h2>

                    <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
                         <div className="input-group">
                              <label htmlFor="login-username">Username or Email</label>
                              <input
                                   type="text"
                                   id="login-username"
                                   name="username"
                                   placeholder="Enter your username or email"
                                   value={form.username}
                                   onChange={handleChange}
                                   disabled={loading}
                              />
                         </div>
                         <div className="input-group">
                              <label htmlFor="login-password">Password</label>
                              <input
                                   type="password"
                                   id="login-password"
                                   name="password"
                                   placeholder="Enter your password"
                                   value={form.password}
                                   onChange={handleChange}
                                   disabled={loading}
                              />
                         </div>
                         {error && <div className="error">{error}</div>}
                         <button type="submit" className="auth-btn" disabled={loading}>
                              {loading ? 'Signing in...' : 'Sign In'}
                         </button>
                    </form>

                    <div className="auth-divider">
                         <span>or</span>
                    </div>

                    <div className="google-login-wrapper">
                         <GoogleLogin
                              onSuccess={handleGoogleSuccess}
                              onError={handleGoogleError}
                              disabled={loading}
                              useOneTap={false}
                              auto_select={false}
                              theme="outline"
                              text="signin_with"
                              width="100%"
                         />
                    </div>

                    <div className="auth-footer">
                         <span>Don't have an account?</span>
                         <button
                              className="link-btn"
                              type="button"
                              onClick={onSwitchToRegister}
                              disabled={loading}
                         >
                              Sign up
                         </button>
                    </div>
               </div>
          </div>
     );
}

export default Login;
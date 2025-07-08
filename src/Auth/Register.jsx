import React, { useState } from 'react';
import axios from 'axios';
import './Register.css';

const DOMAIN = import.meta.env.VITE_DOMAIN || 'http://localhost:3000';

function Register({ onSwitchToLogin }) {
     const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
     const [error, setError] = useState(null);
     const [loading, setLoading] = useState(false);
     const [success, setSuccess] = useState(false);

     const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

     const handleSubmit = async e => {
          e.preventDefault();
          if (loading) return;

          setLoading(true);
          setError(null);

          if (!form.username || !form.email || !form.password || !form.confirm) {
               setError('All fields are required');
               setLoading(false);
               return;
          }

          if (form.password !== form.confirm) {
               setError('Passwords do not match');
               setLoading(false);
               return;
          }

          if (form.password.length < 6) {
               setError('Password must be at least 6 characters long');
               setLoading(false);
               return;
          }

          try {
               const res = await axios.post(`${DOMAIN}/register`, {
                    username: form.username,
                    email: form.email,
                    password: form.password
               });

               if (res.data.success) {
                    setSuccess(true);
                    setTimeout(() => {
                         onSwitchToLogin();
                    }, 2000);
               } else {
                    setError('Registration failed');
               }
          } catch (err) {
               console.error('Registration error:', err);
               if (err.response?.data?.error) {
                    setError(err.response.data.error);
               } else {
                    setError('Registration failed. Please try again.');
               }
          } finally {
               setLoading(false);
          }
     };

     if (success) {
          return (
               <div className="auth-container">
                    <div className="auth-card">
                         <div className="success-message">
                              <h2>✅ Registration Successful!</h2>
                              <p>Your account has been created. Redirecting to login...</p>
                         </div>
                    </div>
               </div>
          );
     }

     return (
          <div className="auth-container">
               <div className="auth-card">
                    <h2 className="auth-title">Create Account</h2>
                    

                    <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
                         <div className="input-group">
                              <label htmlFor="reg-username">Username</label>
                              <input
                                   type="text"
                                   id="reg-username"
                                   name="username"
                                   placeholder="Choose a username"
                                   value={form.username}
                                   onChange={handleChange}
                                   disabled={loading}
                              />
                         </div>
                         <div className="input-group">
                              <label htmlFor="reg-email">Email</label>
                              <input
                                   type="email"
                                   id="reg-email"
                                   name="email"
                                   placeholder="Enter your email"
                                   value={form.email}
                                   onChange={handleChange}
                                   disabled={loading}
                              />
                         </div>
                         <div className="input-group">
                              <label htmlFor="reg-password">Password</label>
                              <input
                                   type="password"
                                   id="reg-password"
                                   name="password"
                                   placeholder="Create a password (min 6 characters)"
                                   value={form.password}
                                   onChange={handleChange}
                                   disabled={loading}
                              />
                         </div>
                         <div className="input-group">
                              <label htmlFor="reg-confirm">Confirm Password</label>
                              <input
                                   type="password"
                                   id="reg-confirm"
                                   name="confirm"
                                   placeholder="Confirm your password"
                                   value={form.confirm}
                                   onChange={handleChange}
                                   disabled={loading}
                              />
                         </div>
                         {error && <div className="error">{error}</div>}
                         <button type="submit" className="auth-btn" disabled={loading}>
                              {loading ? 'Creating Account...' : 'Create Account'}
                         </button>
                    </form>

                    <div className="auth-footer">
                         <span>Already have an account?</span>
                         <button
                              className="link-btn"
                              type="button"
                              onClick={onSwitchToLogin}
                              disabled={loading}
                         >
                              Sign in
                         </button>
                    </div>
               </div>
          </div>
     );
}

export default Register;
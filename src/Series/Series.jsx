import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { IoClose, IoMenu } from 'react-icons/io5';
import { GiFilmSpool } from "react-icons/gi";
import UserProfile from '../Auth/UserProfile';
import Sample from '../assets/sample.png';
import './Series.css';

const DOMAIN = import.meta.env.VITE_DOMAIN || 'http://localhost:3000';

// Cookie helpers
const getCookie = (name) => {
     return document.cookie.split('; ').reduce((r, v) => {
          const parts = v.split('=');
          return parts[0] === name ? decodeURIComponent(parts[1]) : r
     }, null);
};

function Series() {
     const navigate = useNavigate();
     const [series, setSeries] = useState([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);
     const [googleUser, setGoogleUser] = useState(null);
     const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

     // Check if user is logged in
     useEffect(() => {
          const cookieUser = getCookie('user');
          if (cookieUser) {
               try {
                    const user = JSON.parse(cookieUser);
                    setGoogleUser(user);
                    console.log('Google User:', user);
               } catch {
                    setGoogleUser(null);
               }
          }
     }, []);

     // Handle logout function
     const handleLogout = () => {
          // Clear user cookie
          document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

          // Clear user state
          setGoogleUser(null);

          // Navigate to home page
          navigate('/');

          console.log('User logged out');
     };

     // Fetch series
     useEffect(() => {
          const fetchSeries = async () => {
               try {
                    setLoading(true);
                    const response = await axios.get(`${DOMAIN}/series`);
                    setSeries(response.data);
               } catch (error) {
                    console.error('Error fetching series:', error);
                    setError('Failed to load series');
               } finally {
                    setLoading(false);
               }
          };

          fetchSeries();
     }, []);

     return (
          <div className="series-container">
               <nav className="series-navbar">
                    <div className="nav-left">
                         <Link to="/" className="logo">
                              <GiFilmSpool size={32} />
                              <span>Oli</span>
                         </Link>

                         <ul className="nav-links desktop-menu">
                              <li><Link to="/">Home</Link></li>
                              <li><Link to="/movies">Movies</Link></li>
                              <li><Link to="/series" className="active">Series</Link></li>
                         </ul>
                    </div>

                    {mobileMenuOpen && (
                         <div className="mobile-menu">
                              <Link to="/" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                              <Link to="/movies" onClick={() => setMobileMenuOpen(false)}>Movies</Link>
                              <Link to="/series" onClick={() => setMobileMenuOpen(false)}>Series</Link>
                         </div>
                    )}

                    <div className="nav-right">
                         {/* User Profile - Only render if googleUser exists */}
                         {googleUser && (
                              <UserProfile user={googleUser} onLogout={handleLogout} />
                         )}

                         <button
                              className="mobile-menu-toggle mobile-only"
                              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                         >
                              {mobileMenuOpen ? <IoClose /> : <IoMenu />}
                         </button>
                    </div>
               </nav>

               {/* Series Content */}
               <div className="series-content">
                    {error ? (
                         <div className="error-message">
                              <h2>Oops! Something went wrong</h2>
                              <p>{error}</p>
                              <button onClick={() => window.location.reload()} className="retry-btn">
                                   Try Again
                              </button>
                         </div>
                    ) : (
                         <SkeletonTheme baseColor="#222" highlightColor="#444">
                              <div className="series-section">
                                   <h2 className="section-title">All Series</h2>
                                   <div className="series-grid">
                                        {loading
                                             ? Array.from({ length: 12 }).map((_, idx) => (
                                                  <div className="series-item" key={idx}>
                                                       <Skeleton width="100%" height={320} />
                                                       <div className="series-info">
                                                            <Skeleton width="80%" height={20} />
                                                       </div>
                                                  </div>
                                             ))
                                             : series.map((show, index) => (
                                                  <div className="series-item" key={show.id || index}>
                                                       <div className="series-poster">
                                                            <img
                                                                 src={show.poster || Sample}
                                                                 alt={show.title}
                                                                 onError={(e) => {
                                                                      e.target.onerror = null;
                                                                      e.target.src = Sample;
                                                                 }}
                                                            />
                                                            <div className="series-overlay">
                                                                 <div className="overlay-content">
                                                                      <h3>{show.title}</h3>
                                                                      <Link
                                                                           to={`/watch/series/${show.id}`}
                                                                           className="watch-series-btn"
                                                                           onClick={() => {
                                                                                // Store only essential data in sessionStorage
                                                                                sessionStorage.setItem('watch_content', JSON.stringify({
                                                                                     type: 'series',
                                                                                     id: show.id,
                                                                                     title: show.title,
                                                                                     playbackId: show.video,
                                                                                     poster: show.poster || Sample,
                                                                                     description: show.description || ''
                                                                                }));
                                                                           }}
                                                                      >
                                                                           Watch Now
                                                                      </Link>
                                                                 </div>
                                                            </div>
                                                       </div>
                                                  </div>
                                             ))
                                        }
                                   </div>
                              </div>
                         </SkeletonTheme>
                    )}
               </div>
          </div>
     );
}

export default Series;
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { IoClose, IoMenu } from 'react-icons/io5';
import { GiFilmSpool } from "react-icons/gi";
import UserProfile from '../Auth/UserProfile';
import Sample from '../assets/sample.png';
import './Movie.css';

const DOMAIN = import.meta.env.VITE_DOMAIN || 'http://localhost:3000';

// Cookie helpers
const getCookie = (name) => {
     return document.cookie.split('; ').reduce((r, v) => {
          const parts = v.split('=');
          return parts[0] === name ? decodeURIComponent(parts[1]) : r
     }, null);
};

function Movies() {
     const navigate = useNavigate();
     const [movies, setMovies] = useState([]);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);
     const [googleUser, setGoogleUser] = useState(null);
     const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

     // Check if user is logged in - Fixed to match Series.jsx logic
     useEffect(() => {
          const cookieUser = getCookie('user');
          if (cookieUser) {
               try {
                    const user = JSON.parse(cookieUser);
                    setGoogleUser(user);
                    console.log('Google User:', user);
               } catch (error) {
                    console.error('Error parsing user cookie:', error);
                    setGoogleUser(null);
               }
          }
     }, []);

     // Handle logout function - Fixed to match Series.jsx logic
     const handleLogout = () => {
          // Clear user cookie
          document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

          // Clear user state
          setGoogleUser(null);

          // Navigate to home page
          navigate('/');

          console.log('User logged out');
     };

     // Fetch movies
     useEffect(() => {
          const fetchMovies = async () => {
               try {
                    setLoading(true);

                    // Get all movie IDs first
                    const response = await axios.get(`${DOMAIN}/movie-ids`);
                    const movieIds = response.data;

                    // Fetch all movies
                    const moviesPromises = movieIds.map(async (item) => {
                         try {
                              const movieResponse = await axios.get(`${DOMAIN}/movie/${item.id}`);
                              return movieResponse.data;
                         } catch (error) {
                              console.error(`Error fetching movie ${item.id}:`, error);
                              return {
                                   id: item.id,
                                   movie_title: item.movie_title || `Movie ${item.id}`,
                                   description: 'No description available',
                                   poster: null,
                                   mux_playback_id: null
                              };
                         }
                    });

                    const moviesData = await Promise.all(moviesPromises);
                    setMovies(moviesData);

               } catch (error) {
                    console.error('Error fetching movies:', error);
                    setError('Failed to load movies');
               } finally {
                    setLoading(false);
               }
          };

          fetchMovies();
     }, []);

     return (
          <div className="movies-container">
               {/* Header */}
               <nav className="movies-navbar">
                    <div className="nav-left">
                         <Link to="/" className="logo">
                              <GiFilmSpool size={32} />
                              <span>Oli</span>
                         </Link>

                         <ul className="nav-links desktop-menu">
                              <li>
                                   <Link to="/">Home</Link>
                              </li>
                              <li>
                                   <Link to="/movies" className="active">Movies</Link>
                              </li>
                              <li>
                                   <Link to="/series">Series</Link>
                              </li>
                         </ul>
                    </div>

                    {/* Mobile Menu */}
                    {mobileMenuOpen && (
                         <div className="mobile-menu">
                              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                                   Home
                              </Link>
                              <Link to="/movies" onClick={() => setMobileMenuOpen(false)}>
                                   Movies
                              </Link>
                              <Link to="/series" onClick={() => setMobileMenuOpen(false)}>
                                   Series
                              </Link>
                         </div>
                    )}

                    <div className="nav-right">
                         {/* User Profile - Only render if googleUser exists */}
                         {googleUser && (
                              <UserProfile user={googleUser} onLogout={handleLogout} />
                         )}

                         {/* Mobile Menu Toggle */}
                         <button
                              className="mobile-menu-toggle mobile-only"
                              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                         >
                              {mobileMenuOpen ? <IoClose /> : <IoMenu />}
                         </button>
                    </div>
               </nav>

               {/* Movies Content */}
               <div className="movies-content">
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
                              <div className="movies-section">
                                   <h2 className="section-title">All Movies</h2>
                                   <div className="movies-grid">
                                        {loading
                                             ? Array.from({ length: 12 }).map((_, idx) => (
                                                  <div className="movie-item" key={idx}>
                                                       <Skeleton width="100%" height={320} />
                                                       <div className="movie-info">
                                                            <Skeleton width="80%" height={20} />
                                                       </div>
                                                  </div>
                                             ))
                                             : movies.map((movie, index) => (
                                                  <div className="movie-item" key={movie.id || index}>
                                                       <div className="movie-poster">
                                                            <img
                                                                 src={movie.poster || Sample}
                                                                 alt={movie.movie_title}
                                                                 onError={(e) => {
                                                                      e.target.onerror = null;
                                                                      e.target.src = Sample;
                                                                 }}
                                                            />
                                                            <div className="movie-overlay">
                                                                 <div className="overlay-content">
                                                                      <h3>{movie.movie_title}</h3>
                                                                      <p>{movie.description}</p>
                                                                      <div className="genres">
                                                                           {movie.genres ? (
                                                                                movie.genres.split(',').slice(0, 3).map((genre, index) => (
                                                                                     <p key={index} className='genre'>
                                                                                          {genre.trim()}
                                                                                     </p>
                                                                                ))
                                                                           ) : (
                                                                                <p className='genre'>No genres available</p>
                                                                           )}
                                                                      </div>
                                                                      <Link
                                                                           to={`/watch/movie/${movie.id}`}
                                                                           className="watch-movie-btn"
                                                                           onClick={() => {
                                                                                // Store only essential data in sessionStorage
                                                                                sessionStorage.setItem('watch_content', JSON.stringify({
                                                                                     type: 'movie',
                                                                                     id: movie.id,
                                                                                     title: movie.movie_title,
                                                                                     playbackId: movie.mux_playback_id,
                                                                                     poster: movie.poster || Sample,
                                                                                     description: movie.description || ''
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

export default Movies;
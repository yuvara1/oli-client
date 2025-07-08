import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import './Home.css'
import { RiAdminFill } from "react-icons/ri";
import { IoIosArrowForward, IoIosArrowBack, IoMdCloudUpload } from "react-icons/io";
import { HiMenu, HiX } from "react-icons/hi";
import axios from 'axios';
import Sample from '../assets/sample.png';
import { useMovieContext } from '../MovieContext';
import Login from '../Auth/Login';
import Register from '../Auth/Register';
import { GiFilmSpool } from "react-icons/gi";
import User from '../Auth/UserProfile';

const DOMAIN = import.meta.env.VITE_DOMAIN || 'http://localhost:3000';

// Minimal cookie helpers - only store essential data
const setCookie = (name, value, days = 7) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    // Include access level in essential data
    const essentialData = {
        id: value.id,
        username: value.username,
        email: value.email,
        photo: value.picture || value.photo,
        premium: value.premium,
        access: value.access || 0  // Include access level
    };
    document.cookie = name + '=' + encodeURIComponent(JSON.stringify(essentialData)) + '; expires=' + expires + '; path=/';
};

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

const deleteCookie = (name) => {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

function Home() {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [showArrows, setShowArrows] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const arrowTimeout = useRef(null);
    const { trailers, setTrailers, loading, setLoading } = useMovieContext();
    const [allMovies, setAllMovies] = useState([]);
    const [showLogin, setShowLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [user, setUser] = useState(null);
    const [userLoading, setUserLoading] = useState(true);

    // Enhanced user session check with minimal storage
    const checkUserSession = useCallback(async () => {
        setUserLoading(true);

        try {
            // Check cookie first (minimal data only)
            const cookieUser = getCookie('user');

            if (cookieUser && cookieUser.id) {
                // Verify with server for latest data
                try {
                    const response = await axios.get(`${DOMAIN}/check-premium/${cookieUser.id}`);
                    if (response.data.success) {
                        const updatedUser = {
                            ...cookieUser,
                            premium: response.data.isPremium
                        };
                        setCookie('user', updatedUser);
                        setUser(updatedUser);
                        console.log('User verified and updated:', updatedUser);
                    } else {
                        throw new Error('User not found on server');
                    }
                } catch (error) {
                    console.error('Error verifying user with server:', error);
                    setUser(cookieUser);
                }
            } else {
                setUser(null);
                console.log('No valid user session found');
            }
        } catch (error) {
            console.error('Error checking user session:', error);
            setUser(null);
        } finally {
            setUserLoading(false);
        }
    }, []);

    // Check user session on mount
    useEffect(() => {
        checkUserSession();
    }, [checkUserSession]);

    // Show login after 3 seconds if not logged in
    useEffect(() => {
        if (!userLoading && !user) {
            const timer = setTimeout(() => setShowLogin(true), 3000);
            return () => clearTimeout(timer);
        } else if (user) {
            setShowLogin(false);
            setShowRegister(false);
        }
    }, [user, userLoading]);

    // Enhanced login handler - preserve access level from login response
    const handleLogin = useCallback(async (userData) => {
        console.log('Login handler called with:', userData);

        try {
            // Ensure user has an ID
            if (!userData.id && userData.username) {
                try {
                    const response = await axios.get(`${DOMAIN}/get-user-id/${userData.username}`);
                    console.log('response', response);
                    userData.id = response.data.id;
                    userData.access = response.data.access || 0; // Include access level
                } catch (error) {
                    console.error('Error fetching user ID:', error);
                }
            }

            // Get premium status from server but preserve access level from login
            const preservedAccess = userData.access; // ✅ Store original access level
            if (userData.id) {
                try {
                    const response = await axios.get(`${DOMAIN}/check-premium/${userData.id}`);
                    if (response.data.success) {
                        userData.premium = response.data.isPremium;
                        // ✅ Only update access if it wasn't already set from login
                        if (preservedAccess === undefined || preservedAccess === null) {
                            userData.access = response.data.access || 0;
                        } else {
                            userData.access = preservedAccess; // ✅ Preserve original access
                        }
                    }
                } catch (error) {
                    console.error('Error checking premium status:', error);
                    userData.premium = false;
                    // ✅ Only set access to 0 if it wasn't already set
                    if (preservedAccess === undefined || preservedAccess === null) {
                        userData.access = 0;
                    } else {
                        userData.access = preservedAccess;
                    }
                }
            }

            // Store only essential data in cookie (including access level)
            setCookie('user', userData);
            setUser(userData);

            setShowLogin(false);
            setShowRegister(false);

            console.log('User login successful:', userData);
        } catch (error) {
            console.error('Error in login handler:', error);
        }
    }, []);

    // Handle switching to register
    const handleSwitchToRegister = useCallback(() => {
        setShowLogin(false);
        setShowRegister(true);
    }, []);

    // Handle switching to login
    const handleSwitchToLogin = useCallback(() => {
        setShowRegister(false);
        setShowLogin(true);
    }, []);

    // Enhanced logout handler - minimal cleanup
    const handleLogout = useCallback(() => {
        setUser(null);
        deleteCookie('user');
        // Clear only session storage, not all localStorage
        sessionStorage.clear();
        console.log('User logged out successfully');

        // Show login modal after logout
        setTimeout(() => setShowLogin(true), 1000);
    }, []);

    // Fetch movies with caching strategy
    useEffect(() => {
        if (allMovies.length > 0) return;
        setLoading(true);

        const fetchMovies = async () => {
            try {
                // Check session storage first for quick access
                const cachedMovies = sessionStorage.getItem('movies_cache');
                const cacheTime = sessionStorage.getItem('movies_cache_time');
                const now = Date.now();

                // Use cache if less than 5 minutes old
                if (cachedMovies && cacheTime && (now - parseInt(cacheTime)) < 300000) {
                    const movies = JSON.parse(cachedMovies);
                    setAllMovies(movies);
                    setTrailers(movies.slice(0, 2));
                    setLoading(false);
                    return;
                }

                const response = await axios.get(`${DOMAIN}/movie-ids`);
                const ids = response.data.map(movie => movie.id);
                const movies = [];

                // Fetch first movie
                if (ids.length > 0) {
                    try {
                        const res = await axios.get(`${DOMAIN}/movie/${ids[0]}`);
                        movies.push(res.data);
                        setAllMovies([res.data]);
                        setTrailers([res.data]);
                    } catch (error) {
                        console.error(`Error fetching movie ${ids[0]}:`, error);
                        const fallback = { id: ids[0], movie_title: `Movie ${ids[0]}`, description: 'No description available' };
                        movies.push(fallback);
                        setAllMovies([fallback]);
                        setTrailers([fallback]);
                    }
                }

                // Fetch second movie
                if (ids.length > 1) {
                    try {
                        const res = await axios.get(`${DOMAIN}/movie/${ids[1]}`);
                        movies.push(res.data);
                        setAllMovies([...movies]);
                        setTrailers([...movies]);
                    } catch (error) {
                        console.error(`Error fetching movie ${ids[1]}:`, error);
                        const fallback = { id: ids[1], movie_title: `Movie ${ids[1]}`, description: 'No description available' };
                        movies.push(fallback);
                        setAllMovies([...movies]);
                        setTrailers([...movies]);
                    }
                }

                // Fetch remaining movies for trends only
                const trendsMovies = [...movies];
                for (let i = 2; i < Math.min(ids.length, 20); i++) { // Limit to 20 movies
                    try {
                        const res = await axios.get(`${DOMAIN}/movie/${ids[i]}`);
                        trendsMovies.push(res.data);
                    } catch (error) {
                        console.error(`Error fetching movie ${ids[i]}:`, error);
                        trendsMovies.push({
                            id: ids[i],
                            movie_title: `Movie ${ids[i]}`,
                            description: 'No description available',
                            poster: null,
                            mux_playback_id: null
                        });
                    }
                }

                setAllMovies(trendsMovies);

                // Cache in session storage with timestamp
                sessionStorage.setItem('movies_cache', JSON.stringify(trendsMovies));
                sessionStorage.setItem('movies_cache_time', now.toString());

            } catch (error) {
                console.error('Error fetching movie IDs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMovies();
    }, [setTrailers, setLoading, allMovies.length]);

    // Navigation handlers for trailers
    const handlePrev = useCallback(() => {
        setCurrentIdx(idx => (idx > 0 ? idx - 1 : idx));
    }, []);

    const handleNext = useCallback(() => {
        setCurrentIdx(idx => (trailers.length > 0 && idx < trailers.length - 1 ? idx + 1 : 0));
    }, [trailers.length]);

    // Arrow show/hide logic
    useEffect(() => {
        const handleMouseMove = () => {
            setShowArrows(true);
            if (arrowTimeout.current) clearTimeout(arrowTimeout.current);
            arrowTimeout.current = setTimeout(() => setShowArrows(false), 1000);
        };
        window.addEventListener('mousemove', handleMouseMove);
        arrowTimeout.current = setTimeout(() => setShowArrows(false), 1000);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (arrowTimeout.current) clearTimeout(arrowTimeout.current);
        };
    }, []);

    // Memoize trailer data
    const trailer = useMemo(() => trailers[currentIdx] || {}, [trailers, currentIdx]);

    // Automatically switch to next trailer when current finishes
    useEffect(() => {
        const video = document.querySelector('.background-video');
        if (!video) return;

        const handleEnded = () => {
            setCurrentIdx(idx => (trailers.length > 0 && idx < trailers.length - 1 ? idx + 1 : 0));
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [trailers.length]);

    // Play video on load
    useEffect(() => {
        const video = document.querySelector('.background-video');
        if (video) {
            const playVideo = async () => {
                try {
                    await video.play();
                } catch (error) {
                    console.error('Autoplay failed:', error);
                }
            };
            playVideo();
        }
    }, [currentIdx]);

    // Show loading while checking user session
    if (userLoading) {
        return (
            <div className="main">
                <div className="loading-user-session">
                    <div className="spinner"></div>
                    <h3>Loading...</h3>
                    <p>Checking your session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="main">
            {/* Login Modal - Fixed */}
            {showLogin && !user && (
                <div className="modal-overlay" onClick={() => setShowLogin(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <Login
                            onLogin={handleLogin}
                            onSwitchToRegister={handleSwitchToRegister}
                            onClose={() => setShowLogin(false)}
                        />
                    </div>
                </div>
            )}

            {/* Register Modal - Fixed */}
            {showRegister && !user && (
                <div className="modal-overlay" onClick={() => setShowRegister(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <Register
                            onSwitchToLogin={handleSwitchToLogin}
                            onClose={() => setShowRegister(false)}
                        />
                    </div>
                </div>
            )}

            <nav className="navbar">
                <div className="nav-left">
                    <div className="logo">
                        <GiFilmSpool size={32} />
                        <span>Oli</span>
                    </div>
                    <ul className="nav-links desktop-menu">
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/movies">Movies</Link></li>
                        <li><Link to="/series">Series</Link></li>
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
                    {/* User Profile - Only render if user exists */}
                    {user && <User user={user} onLogout={handleLogout} />}

                    {/* Admin Upload Link - Only show if user exists and has access === 1 */}
                    {/* {user && (() => {
                        console.log('User data for admin check:', user);
                        console.log('User access level:', user.access);
                        console.log('Access comparison:', user.access === 1);
                        console.log('User access type:', typeof user.access);
                        return user.access === 1 ||user.access===2;
                    })() && (
                            <Link to="/admin" title="Admin Panel" className="upload-link">
                                <RiAdminFill size={28} />
                            </Link>
                        )} */}

                    {/* Mobile Menu Toggle */}
                    <button
                        className="mobile-menu-toggle mobile-only"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
                    </button>
                </div>
            </nav >

            {loading && trailers.length === 0 ? (
                <SkeletonTheme baseColor="#222" highlightColor="#444">
                    <div style={{ padding: 40 }}>
                        <Skeleton height={400} width="100%" style={{ marginBottom: 24 }} />
                        <Skeleton width={200} height={32} style={{ marginBottom: 12 }} />
                        <Skeleton count={2} width={300} style={{ marginBottom: 12 }} />
                        <Skeleton width={120} height={40} />
                    </div>
                </SkeletonTheme>
            ) : (
                <SkeletonTheme baseColor="#222" highlightColor="#444">
                    <div className="trailer">
                        {trailers.length > 0 && (
                            <>
                                {currentIdx > 0 && (
                                    <IoIosArrowBack className={`previous-trailer${showArrows ? '' : ' hide-arrow'}`} onClick={handlePrev} />
                                )}
                                {currentIdx < trailers.length - 1 && (
                                    <IoIosArrowForward className={`next-trailer${showArrows ? '' : ' hide-arrow'}`} onClick={handleNext} />
                                )}
                                <video
                                    src={trailer.trailer || 'https://ik.imagekit.io/f2t48dhjl/coolie-trailer.mp4?tr=orig'}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="background-video"
                                    onError={(e) => {
                                        console.error('Video failed to load:', e);
                                        if (e.target.src !== 'https://ik.imagekit.io/f2t48dhjl/coolie-trailer.mp4?tr=orig') {
                                            e.target.src = 'https://ik.imagekit.io/f2t48dhjl/coolie-trailer.mp4?tr=orig';
                                        }
                                    }}
                                />
                                <div className="movie-details">
                                    <h5 className='movie-title'>
                                        {loading ? <Skeleton width={200} height={32} /> : trailer.movie_title}
                                    </h5>
                                    <p className='movie-description'>
                                        {loading ? <Skeleton count={2} width={300} /> : trailer.description}
                                    </p>
                                    <div className="movie-genre">
                                        {loading ? (
                                            <Skeleton count={2} width={100} />
                                        ) : (
                                            trailer.genres && trailer.genres.split(',').map((genre, index) => (
                                                <span key={index} className="genre-tag">
                                                    {genre.trim()}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                    <div className="grade_year">
                                        {loading ? (
                                            <Skeleton width={80} />
                                        ) : (
                                            <>

                                                <span className="movie-year">{trailer.year || '2023'}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="movie-actions">
                                        {loading ? (
                                            <Skeleton width={120} height={40} />
                                        ) : (
                                            <>
                                                <Link
                                                    to={`/watch/movie/${trailer.id}`}
                                                    className='watch-link'
                                                    onClick={() => {
                                                        // Store only essential data in sessionStorage
                                                        sessionStorage.setItem('watch_content', JSON.stringify({
                                                            type: 'movie',
                                                            id: trailer.id,
                                                            title: trailer.movie_title,
                                                            playbackId: trailer.mux_playback_id
                                                        }));
                                                    }}
                                                >
                                                    <button className='watch-now'>Watch Now</button>
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="top-trends">
                        <h2 className='trends-title'>Top Trends</h2>
                        <div className="trends-list">
                            {loading && allMovies.length === 0
                                ? Array.from({ length: 6 }).map((_, idx) => (
                                    <div className="trend-item" key={idx}>
                                        <Skeleton width={100} height={120} />
                                        <Skeleton width={80} />
                                    </div>
                                ))
                                : allMovies.map((movie, index) => (
                                    <div className="trend-item" key={movie.id || index}>
                                        <img src={movie.poster || Sample} alt={movie.movie_title} className="trend-poster" />

                                        {/* Fixed hover content structure */}
                                        <div className="hover-content">
                                            <div className="hover-content-details">
                                                <h5 className="trend-title">{movie.movie_title || 'Untitled Movie'}</h5>
                                                <p className="trend-description">
                                                    {movie.description || 'No description available'}
                                                </p>
                                                <div className="movie-genre">
                                                    {movie.genres ? movie.genres.split(',').slice(0,2).map((genre, index) => (
                                                        <span key={index} className="genre-tag">
                                                            {genre.trim()}
                                                        </span>
                                                    )) : <span className="genre-tag">Unknown Genre</span>}
                                                </div>
                                                <div className="trend-year_grade">
                                                    <span className="movie-year">{movie.year || '2023'}</span>
                                                    <span className="movie-grade">{movie.grade || 'NR'}</span>
                                                </div>

                                                {/* Fixed watch button */}
                                                <div className="hover-actions">
                                                    <Link
                                                        to={`/watch/movie/${movie.id}`}
                                                        className="hover-watch-btn"
                                                        onClick={() => {
                                                            sessionStorage.setItem('watch_content', JSON.stringify({
                                                                type: 'movie',
                                                                id: movie.id,
                                                                title: movie.movie_title,
                                                                playbackId: movie.mux_playback_id
                                                            }));
                                                        }}
                                                    >
                                                        ▶ Watch Now
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
            )
            }
            <div className="footer">
                <p>&copy; {new Date().getFullYear()} OTT Platform. All rights reserved.</p>
                <p>Developed by <a href="https://yuvaraj-in.web.app"></a> </p>

            </div>
        </div >
    )
}

export default Home
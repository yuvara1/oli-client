import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MuxPlayer from '@mux/mux-player-react';
import {
    IoArrowBack,
    IoPlay,
    IoPause,
    IoVolumeHigh,
    IoVolumeMute,
    IoExpand,
    IoContract,
    IoStar,
    IoCalendar,
    IoTime,
    IoSettings
} from 'react-icons/io5';
import { MdReplay10, MdForward10 } from 'react-icons/md';
import './Watch.css';
import axios from 'axios';

// Helper function to handle URL-encoded cookies
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

function Watch() {
    const DOMAIN = import.meta.env.VITE_DOMAIN || 'http://localhost:3000';
    const { type, id } = useParams();
    const contentId = id || type;
    const navigate = useNavigate();

    // ALL REFS FIRST
    const playerRef = useRef(null);
    const playerSectionRef = useRef(null);
    const settingsMenuRef = useRef(null);
    const controlsTimerRef = useRef(null);

    // ALL STATE HOOKS NEXT
    const [contentData, setContentData] = useState(null);
    const [contentType, setContentType] = useState('movie');
    const [playbackId, setPlaybackId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(50);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [quality, setQuality] = useState('auto');
    const [showControls, setShowControls] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [isPremiumUser, setIsPremiumUser] = useState(false);
    const [premiumCheckLoading, setPremiumCheckLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [userLoggedIn, setUserLoggedIn] = useState(false);

    // Check user login with minimal data
    const checkUserLogin = useCallback(() => {
        const userCookie = getCookie('user');
        if (userCookie && userCookie.id) {
            setUserId(userCookie.id);
            setUserLoggedIn(true);
            return userCookie;
        }
        setUserLoggedIn(false);
        return null;
    }, []);

    // Check subscription from server
    const checkSubscription = useCallback(async () => {
        const user = checkUserLogin();
        if (!user || !user.id) {
            return false;
        }

        try {
            // Check premium status from server
            const response = await axios.get(`${DOMAIN}/check-premium/${user.id}`);
            if (response.data.success && response.data.isPremium) {
                return true;
            }

            // Check subscription table
            const subResponse = await axios.get(`${DOMAIN}/check-subscription/${user.id}`);
            return subResponse.data.hasSubscription;
        } catch (error) {
            console.error('Error checking server subscription:', error);
            return false;
        }
    }, [DOMAIN, checkUserLogin]);

    // Fetch content data from server instead of localStorage
    useEffect(() => {
        const fetchContentData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // First check sessionStorage for quick access
                const cachedContent = sessionStorage.getItem('watch_content');
                let contentInfo = null;
                let determinedContentType = 'movie'; // Default

                if (cachedContent) {
                    try {
                        contentInfo = JSON.parse(cachedContent);
                        determinedContentType = contentInfo.type || 'movie';
                    } catch (parseError) {
                        console.error('Error parsing cached content:', parseError);
                        sessionStorage.removeItem('watch_content');
                    }
                }

                // If no cached content, determine from URL
                if (!contentInfo) {
                    // Check URL pattern: /watch/movie/123 or /watch/series/123
                    const urlParts = window.location.pathname.split('/');
                    if (urlParts.length >= 3) {
                        determinedContentType = urlParts[2] === 'series' ? 'series' : 'movie';
                    }
                }

                setContentType(determinedContentType);

                // Always fetch fresh data from server
                const endpoint = determinedContentType === 'series'
                    ? `${DOMAIN}/series/${contentId}`
                    : `${DOMAIN}/movie/${contentId}`;

                console.log('Fetching content from:', endpoint);
                const response = await axios.get(endpoint);

                if (response.data) {
                    setContentData(response.data);

                    // Set playback ID based on content type
                    let playbackIdValue = null;
                    if (determinedContentType === 'series') {
                        playbackIdValue = response.data.video || response.data.playback_id || response.data.mux_playback_id;
                    } else {
                        playbackIdValue = response.data.mux_playback_id || response.data.playback_id || response.data.video;
                    }

                    if (!playbackIdValue) {
                        throw new Error('No playback ID found for this content');
                    }

                    setPlaybackId(playbackIdValue);
                    console.log('Content loaded successfully:', {
                        title: response.data.movie_title || response.data.title,
                        type: determinedContentType,
                        playbackId: playbackIdValue
                    });

                    // Clear sessionStorage after successful use
                    if (cachedContent) {
                        sessionStorage.removeItem('watch_content');
                    }
                } else {
                    throw new Error('Content not found');
                }
            } catch (err) {
                console.error('Error fetching content:', err);
                if (err.response?.status === 404) {
                    setError('Content not found. It may have been removed or the link is invalid.');
                } else if (err.response?.status === 403) {
                    setError('Access denied. You may not have permission to view this content.');
                } else {
                    setError(err.message || 'Failed to load content');
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (contentId) {
            fetchContentData();
        } else {
            setError('No content ID provided');
            setIsLoading(false);
        }
    }, [contentId, DOMAIN]); // Removed contentType from dependencies

    // Check premium access
    useEffect(() => {
        const checkPremiumAccess = async () => {
            setPremiumCheckLoading(true);
            const user = checkUserLogin();
            if (!user) {
                setIsPremiumUser(false);
                setPremiumCheckLoading(false);
                return;
            }

            try {
                const hasSubscription = await checkSubscription();
                setIsPremiumUser(hasSubscription);
            } catch (error) {
                console.error('Error checking premium access:', error);
                setIsPremiumUser(false);
            } finally {
                setPremiumCheckLoading(false);
            }
        };

        checkPremiumAccess();
    }, [checkSubscription, checkUserLogin]);

    // ALL CALLBACKS NEXT
    const resetControlsTimer = useCallback(() => {
        if (controlsTimerRef.current) {
            clearTimeout(controlsTimerRef.current);
        }
        setShowControls(true);

        controlsTimerRef.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 2000);
    }, [isPlaying]);

    const handleMouseMove = useCallback(() => {
        resetControlsTimer();
    }, [resetControlsTimer]);

    const handleMouseLeave = useCallback(() => {
        if (isPlaying) {
            setShowControls(false);
        }
    }, [isPlaying]);

    const togglePlayPause = useCallback(() => {
        if (playerRef.current) {
            if (isPlaying) {
                playerRef.current.pause().then(() => {
                    setIsPlaying(false);
                }).catch(err => {
                    console.error('Pause failed:', err);
                });
            } else {
                playerRef.current.play().then(() => {
                    setIsPlaying(true);
                }).catch(err => {
                    console.error('Play failed:', err);
                });
            }
        }
    }, [isPlaying]);

    const toggleMute = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
            if (isMuted && volume === 0) {
                setVolume(50);
                playerRef.current.volume = 0.5;
            }
        }
    }, [isMuted, volume]);

    const handleVolumeChange = useCallback((e) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (playerRef.current) {
            playerRef.current.volume = newVolume / 100;
            setIsMuted(newVolume === 0);
        }
    }, []);

    const handleSeek = useCallback((e) => {
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;

        if (playerRef.current) {
            playerRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
        resetControlsTimer();
    }, [duration, resetControlsTimer]);

    const skipBackward = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.currentTime = Math.max(0, currentTime - 10);
        }
        resetControlsTimer();
    }, [currentTime, resetControlsTimer]);

    const skipForward = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.currentTime = Math.min(duration, currentTime + 10);
        }
        resetControlsTimer();
    }, [currentTime, duration, resetControlsTimer]);

    const changePlaybackSpeed = useCallback((speed) => {
        if (playerRef.current) {
            playerRef.current.playbackRate = speed;
            setPlaybackSpeed(speed);
        }
        setShowSettings(false);
        resetControlsTimer();
    }, [resetControlsTimer]);

    const toggleFullscreen = useCallback(() => {
        try {
            if (!document.fullscreenElement) {
                if (playerSectionRef.current?.requestFullscreen) {
                    playerSectionRef.current.requestFullscreen();
                }
                setIsFullscreen(true);
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
                setIsFullscreen(false);
            }
            resetControlsTimer();
        } catch (err) {
            console.error('Fullscreen toggle failed:', err);
        }
    }, [resetControlsTimer]);

    const handleGoBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    const formatTime = useCallback((time) => {
        if (isNaN(time) || time < 0) return '00:00';
        const totalSeconds = Math.round(time);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const paddedMinutes = minutes.toString().padStart(2, '0');
        const paddedSeconds = seconds.toString().padStart(2, '0');

        if (hours > 0) {
            return `${hours}:${paddedMinutes}:${paddedSeconds}`;
        }
        return `${paddedMinutes}:${paddedSeconds}`;
    }, []);

    const handlePlayerClick = useCallback(() => {
        if (isPlaying) {
            playerRef.current.pause();
            setIsPlaying(false);
        } else {
            playerRef.current.play().then(() => {
                setIsPlaying(true);
                resetControlsTimer();
            }).catch(err => {
                console.error('Play failed:', err);
            });
        }
    }, [isPlaying, resetControlsTimer]);

    const progressPercent = useMemo(() => {
        return duration > 0 ? (currentTime / duration) * 100 : 0;
    }, [currentTime, duration]);

    // Cleanup effects
    useEffect(() => {
        return () => {
            if (controlsTimerRef.current) {
                clearTimeout(controlsTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
                setShowSettings(false);
            }
        };

        if (showSettings) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSettings]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // CONDITIONAL RENDERING
    if (premiumCheckLoading) {
        return (
            <div className="watch-page-container">
                <div className="player-placeholder">
                    <div className="spinner"></div>
                    <h3>Checking Access...</h3>
                    <p>Verifying your premium subscription.</p>
                </div>
            </div>
        );
    }

    if (!userLoggedIn) {
        return (
            <div className="watch-page-container">
                <div className="subscription-required">
                    <h2>Login Required</h2>
                    <p>Please login to access our content library.</p>
                    <button
                        className="subscribe-btn"
                        onClick={() => navigate('/')}
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (!isPremiumUser) {
        return (
            <div className="watch-page-container">
                <div className="subscription-required">
                    <div className="premium-notice">
                        <div className="premium-icon">👑</div>
                        <h2>Premium Content</h2>
                        <p>This content requires a premium subscription to watch.</p>
                        <div className="premium-benefits">
                            <h3>Premium Benefits:</h3>
                            <ul>
                                <li>✨ Access to all movies and series</li>
                                <li>🎬 4K Ultra HD quality streaming</li>
                                <li>📱 Watch on all devices</li>
                                <li>🚫 No advertisements</li>
                                <li>🆕 Early access to new releases</li>
                            </ul>
                        </div>
                        <div className="subscription-actions">
                            <button
                                className="subscribe-btn"
                                onClick={() => navigate('/payment')}
                            >
                                🚀 Get Premium Access
                            </button>
                            <button
                                className="back-btn-alt"
                                onClick={() => navigate(-1)}
                            >
                                ← Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="watch-page-container">
                <div className="player-placeholder">
                    <div className="spinner"></div>
                    <h3>Loading Content...</h3>
                    <p>Preparing your viewing experience.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="watch-page-container">
                <div className="player-placeholder error">
                    <h3>Content Unavailable</h3>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button className="back-btn" onClick={handleGoBack}>
                            <IoArrowBack /> Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="watch-page-container">
            {/* Video Player Section */}
            <div
                className={`player-section ${isFullscreen ? 'fullscreen' : ''} ${isPlaying ? 'playing' : ''}`}
                ref={playerSectionRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Header */}
                <div className={`player-header ${showControls ? 'visible' : 'hidden'}`}>
                    <button className="back-btn" onClick={handleGoBack} title="Back to Movies">
                        <IoArrowBack />
                    </button>
                    <h1 className="header-movie-title">
                        {contentData?.movie_title || contentData?.title || 'Unknown Title'}
                    </h1>
                </div>

                {/* MuxPlayer */}
                <MuxPlayer
                    ref={playerRef}
                    streamType="on-demand"
                    playbackId={playbackId}
                    metadata={{
                        video_id: contentId,
                        video_title: contentData?.title || contentData?.movie_title,
                        viewer_user_id: userId || "anonymous"
                    }}
                    poster={contentData?.poster}
                    controls={false}
                    autoPlay={false}
                    muted={isMuted}
                    quality={quality}
                    playsInline
                    onCanPlay={() => {
                        setIsLoading(false);
                        if (playerRef.current) {
                            playerRef.current.play()
                                .then(() => setIsPlaying(true))
                                .catch(err => console.error('Autoplay failed:', err));
                        }
                    }}
                    onPlay={() => {
                        setIsPlaying(true);
                        resetControlsTimer();
                    }}
                    onPause={() => {
                        setIsPlaying(false);
                        setShowControls(true);
                    }}
                    onError={(e) => {
                        console.error('MuxPlayer error:', e);
                        setError('Video playback error');
                        setIsLoading(false);
                    }}
                    onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.target.duration)}
                />

                {/* Center Play/Pause Button */}
                <button
                    className={`center-play-button ${showControls ? 'visible' : 'hidden'}`}
                    onClick={handlePlayerClick}
                    title={isPlaying ? 'Pause' : 'Play'}
                >
                    {isPlaying ? <IoPause /> : <IoPlay />}
                </button>

                {/* Bottom Controls */}
                <div className={`bottom-controls-bar ${showControls ? 'visible' : 'hidden'}`}>
                    {/* Progress Bar */}
                    <div className="progress-section">
                        <div className="time-controls">
                            <span className="current-time">{formatTime(currentTime)}</span>
                            <div className="progress-bar" onClick={handleSeek} onMouseDown={resetControlsTimer}>
                                <div
                                    className="progress-filled"
                                    style={{ width: `${progressPercent}%` }}
                                >
                                    <div className="progress-thumb"></div>
                                </div>
                            </div>
                            <span className="total-time">{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Control Row */}
                    <div className="control-row">
                        <div className="left-controls">
                            <button className="control-btn" onClick={togglePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
                                {isPlaying ? <IoPause /> : <IoPlay />}
                            </button>
                            <button className="control-btn" onClick={skipBackward} title="Skip Backward 10s">
                                <MdReplay10 />
                            </button>
                            <button className="control-btn" onClick={skipForward} title="Skip Forward 10s">
                                <MdForward10 />
                            </button>

                            <div className="volume-control">
                                <button className="control-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                                    {isMuted || volume === 0 ? <IoVolumeMute /> : <IoVolumeHigh />}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={volume}
                                    onChange={handleVolumeChange}
                                    className="volume-slider"
                                    title="Volume"
                                />
                            </div>
                        </div>

                        <div className="right-controls">
                            <div className="settings-dropdown" ref={settingsMenuRef}>
                                <button
                                    className="control-btn"
                                    onClick={() => setShowSettings(prev => !prev)}
                                    title="Settings"
                                >
                                    <IoSettings />
                                </button>
                                {showSettings && (
                                    <div className="settings-menu">
                                        <div className="settings-section">
                                            <h5>Playback Speed</h5>
                                            <div className="speed-options">
                                                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                                                    <button
                                                        key={speed}
                                                        className={`speed-option ${playbackSpeed === speed ? 'active' : ''}`}
                                                        onClick={() => changePlaybackSpeed(speed)}
                                                    >
                                                        {speed}x
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="settings-section">
                                            <h5>Quality</h5>
                                            <div className="quality-options">
                                                {['auto', '1080p', '720p', '480p'].map(qual => (
                                                    <button
                                                        key={qual}
                                                        className={`quality-option ${quality === qual ? 'active' : ''}`}
                                                        onClick={() => setQuality(qual)}
                                                    >
                                                        {qual}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button className="control-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                                {isFullscreen ? <IoContract /> : <IoExpand />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Movie Information Section */}
            <div className="movie-details-section">
                <div className="details-content-wrapper">
                    <div className="movie-hero">
                        <div className="movie-poster">
                            <img
                                src={contentData?.poster || `https://placehold.co/250x375/333/fff?text=${encodeURIComponent(contentData?.movie_title || contentData?.title || 'No Poster')}`}
                                alt={contentData?.movie_title || contentData?.title || 'Content poster'}
                                onError={(e) => { e.target.src = 'https://placehold.co/250x375/333/fff?text=No+Poster'; }}
                            />
                        </div>
                        <div className="hero-info">
                            <h1 className="movie-details-title">
                                {contentData?.movie_title || contentData?.title || 'Unknown Content'}
                            </h1>

                            <div className="movie-stats">
                                <div className="stat-item">
                                    <IoStar className="stat-icon" />
                                    <span>{contentData?.rating?.toFixed(1) || 'N/A'}</span>
                                </div>
                                <div className="stat-item">
                                    <IoCalendar className="stat-icon" />
                                    <span>{contentData?.release_year || contentData?.year || 'N/A'}</span>
                                </div>
                                <div className="stat-item">
                                    <IoTime className="stat-icon" />
                                    <span>{contentData?.duration || parseInt(duration) || 'N/A'}</span>
                                </div>
                            </div>

                            <p className="movie-description-full">
                                {contentData?.description || 'No detailed description available for this content.'}
                            </p>

                            <div className="movie-genres-full">
                                {contentData?.genres && contentData.genres.length > 0 ? (
                                    contentData.genres.split(',').map((genre, index) => (
                                        <span key={index} className="genre-tag-full">
                                            {genre.trim()}
                                        </span>
                                    ))
                                ) : (
                                    <span className="genre-tag-full">General</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="movie-cast-crew">
                        <h2 className="section-title">Cast & Crew</h2>
                        <div className="cast-grid">
                            {contentData?.casts && contentData.casts.length > 0 ? (
                                contentData.casts.split(',').map((actor, index) => (
                                    <div key={index} className="cast-member-card">
                                        <div className="actor-initials-avatar">
                                            {actor.trim().charAt(0)}
                                        </div>
                                        <span className="actor-name-card">{actor.trim()}</span>
                                        <span className="actor-role-card">Actor</span>
                                    </div>
                                ))
                            ) : (
                                <div className="cast-member-card">
                                    <div className="actor-initials-avatar">?</div>
                                    <span className="actor-name-card">No Cast Info</span>
                                    <span className="actor-role-card"></span>
                                </div>
                            )}
                        </div>

                        <div className="crew-details">
                            <div className="crew-item">
                                <span className="crew-label">Director:</span>
                                <span className="crew-value">{contentData?.director || 'N/A'}</span>
                            </div>
                            <div className="crew-item">
                                <span className="crew-label">Studio:</span>
                                <span className="crew-value">{contentData?.production_company || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Watch;
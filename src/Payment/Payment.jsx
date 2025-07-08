import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { IoArrowBack, IoCheckmarkCircle } from 'react-icons/io5';
import { GiFilmSpool } from 'react-icons/gi';
import './Payment.css';

const DOMAIN = import.meta.env.VITE_DOMAIN || 'http://localhost:3000';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

if (!RAZORPAY_KEY_ID) {
     console.error('Razorpay Key ID not found in environment variables');
}

// Enhanced helper function to get cookies with proper JSON parsing
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

function Payment() {
     const navigate = useNavigate();
     const [selectedPlan, setSelectedPlan] = useState(null);
     const [isProcessing, setIsProcessing] = useState(false);
     const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);
     const [error, setError] = useState(null);
     const [userSession, setUserSession] = useState(null);
     const [sessionLoading, setSessionLoading] = useState(true);
     const [showPromoInput, setShowPromoInput] = useState(false);
     const [promoCode, setPromoCode] = useState('');
     const [promoError, setPromoError] = useState('');
     const [promoSuccess, setPromoSuccess] = useState('');

     // Check if Razorpay is loaded
     useEffect(() => {
          const checkRazorpay = () => {
               if (window.Razorpay) {
                    setIsRazorpayLoaded(true);
               } else {
                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.onload = () => setIsRazorpayLoaded(true);
                    script.onerror = () => {
                         console.error('Failed to load Razorpay script');
                         setError('Payment service unavailable. Please refresh the page and try again.');
                    };
                    document.body.appendChild(script);
               }
          };

          checkRazorpay();
     }, []);

     // Enhanced user session check
     useEffect(() => {
          const checkUserSession = () => {
               console.log('=== CHECKING USER SESSION ===');

               try {
                    const cookieUser = getCookie('user');
                    console.log('Cookie user:', cookieUser);

                    const localUser = localStorage.getItem('user');
                    console.log('Raw localStorage user:', localUser);

                    let user = null;

                    if (cookieUser && typeof cookieUser === 'object' && cookieUser.id) {
                         user = cookieUser;
                         console.log('✅ Using cookie user data:', user);
                    }
                    else if (localUser && localUser !== 'null' && localUser !== 'undefined') {
                         try {
                              const parsedUser = JSON.parse(localUser);
                              if (parsedUser && parsedUser.id) {
                                   user = parsedUser;
                                   console.log('✅ Using localStorage user data:', user);
                              }
                         } catch (parseError) {
                              console.error('Error parsing localStorage user:', parseError);
                              localStorage.removeItem('user');
                         }
                    }

                    if (user && user.id) {
                         console.log('✅ User session found:', user);
                         setUserSession(user);
                    } else {
                         console.log('❌ No valid user session found');
                         setUserSession(null);
                    }
               } catch (error) {
                    console.error('Error in checkUserSession:', error);
                    setUserSession(null);
               }

               setSessionLoading(false);
               console.log('=== SESSION CHECK COMPLETE ===');
          };

          checkUserSession();
     }, []);

     const plans = [
          {
               id: 'basic',
               name: 'Basic',
               price: 1,
               duration: '1 Month',
               features: [
                    'Access to all movies',
                    'HD quality streaming',
                    'Watch on mobile & tablet',
                    'Cancel anytime'
               ]
          },
          {
               id: 'premium',
               name: 'Premium',
               price: 1,
               duration: '3 Months',
               features: [
                    'Access to all movies & series',
                    '4K Ultra HD quality',
                    'Watch on all devices',
                    
                    'No ads',
                    'Cancel anytime'
               ],
               recommended: true
          },
          {
               id: 'ultimate',
               name: 'Ultimate',
               price: 1,
               duration: '1 Year',
               features: [
                    'All Premium features',
                    'Early access to new releases',
                    'Exclusive behind-the-scenes',
                    'Priority support',
                   
                    'Cancel anytime'
               ]
          }
     ];

     // Handle promo code application
     const handlePromoCode = async () => {
          if (!promoCode.trim()) {
               setPromoError('Please enter a promo code');
               return;
          }

          if (!userSession || !userSession.id) {
               setPromoError('Please login to apply promo code');
               return;
          }

          setIsProcessing(true);
          setPromoError('');
          setPromoSuccess('');

          try {
               const response = await axios.post(`${DOMAIN}/apply-promo`, {
                    promoCode: promoCode.trim().toUpperCase(),
                    userId: userSession.id
               }, {
                    timeout: 10000,
                    headers: {
                         'Content-Type': 'application/json'
                    }
               });

               if (response.data.success) {
                    setPromoSuccess('🎉 Promo code applied successfully! You now have premium access.');

                    // Update user session to reflect premium status
                    const updatedUser = { ...userSession, premium: true };
                    setUserSession(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));

                    // Store promo subscription info
                    const promoSubscription = {
                         plan: 'promo',
                         planName: 'Promo Access',
                         validUntil: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days
                         promoCode: promoCode.trim().toUpperCase(),
                         userId: userSession.id,
                         createdAt: new Date().toISOString()
                    };
                    localStorage.setItem('subscription', JSON.stringify(promoSubscription));

                    // Redirect back after 2 seconds
                    setTimeout(() => {
                         const returnPath = localStorage.getItem('return-path');
                         localStorage.removeItem('return-path');
                         if (returnPath) {
                              navigate(returnPath);
                         } else {
                              navigate(-1);
                         }
                    }, 2000);

               } else {
                    setPromoError(response.data.error || 'Invalid promo code');
               }
          } catch (err) {
               console.error('Promo code error:', err);

               if (err.response?.data?.error) {
                    setPromoError(err.response.data.error);
               } else if (err.code === 'ECONNABORTED') {
                    setPromoError('Request timeout. Please try again.');
               } else {
                    setPromoError('Failed to apply promo code. Please try again.');
               }
          } finally {
               setIsProcessing(false);
          }
     };

     const handlePayment = async (plan) => {
          setError(null);

          if (!isRazorpayLoaded || !window.Razorpay) {
               setError('Payment service is still loading. Please wait and try again.');
               return;
          }

          if (!userSession || !userSession.id) {
               console.error('No user session available for payment');
               setError('Please login to proceed with payment.');
               setTimeout(() => navigate('/'), 2000);
               return;
          }

          console.log('Starting payment for user:', userSession);
          setIsProcessing(true);

          try {
               console.log('Creating order for plan:', plan);

               const orderResponse = await axios.post(`${DOMAIN}/create-order`, {
                    amount: plan.price * 100,
                    currency: 'INR',
                    receipt: `rcpt_${Date.now()}_${userSession.id}`,
                    userId: userSession.id
               }, {
                    timeout: 10000,
                    headers: {
                         'Content-Type': 'application/json'
                    }
               });

               console.log('Order created:', orderResponse.data);

               if (!orderResponse.data.success || !orderResponse.data.id) {
                    throw new Error('Failed to create payment order. Please try again.');
               }

               const options = {
                    key: RAZORPAY_KEY_ID,
                    amount: plan.price * 100,
                    currency: "INR",
                    name: "Oli Streaming",
                    description: `${plan.name} Plan - ${plan.duration}`,
                    order_id: orderResponse.data.id,
                    handler: async (response) => {
                         console.log('Payment response:', response);
                         setIsProcessing(true);

                         try {
                              const verifyResponse = await axios.post(`${DOMAIN}/verify-payment`, {
                                   razorpay_order_id: response.razorpay_order_id,
                                   razorpay_payment_id: response.razorpay_payment_id,
                                   razorpay_signature: response.razorpay_signature,
                                   user_id: userSession.id,
                                   plan_id: plan.id
                              }, {
                                   timeout: 15000,
                                   headers: {
                                        'Content-Type': 'application/json'
                                   }
                              });

                              console.log('Payment verification response:', verifyResponse.data);

                              if (verifyResponse.data.success) {
                                   const subscriptionData = {
                                        plan: plan.id,
                                        planName: plan.name,
                                        validUntil: new Date(Date.now() + getDurationInMs(plan.duration)),
                                        paymentId: response.razorpay_payment_id,
                                        userId: userSession.id,
                                        createdAt: new Date().toISOString()
                                   };

                                   localStorage.setItem('subscription', JSON.stringify(subscriptionData));

                                   const updatedUser = { ...userSession, premium: true };
                                   setUserSession(updatedUser);
                                   localStorage.setItem('user', JSON.stringify(updatedUser));

                                   alert('🎉 Payment successful! Your premium subscription is now active.');

                                   const returnPath = localStorage.getItem('return-path');
                                   localStorage.removeItem('return-path');

                                   if (returnPath) {
                                        navigate(returnPath);
                                   } else {
                                        navigate(-1);
                                   }
                              } else {
                                   throw new Error('Payment verification failed. Please contact support.');
                              }
                         } catch (verifyError) {
                              console.error('Payment verification failed:', verifyError);

                              let errorMessage = 'Payment verification failed. ';
                              if (verifyError.code === 'ECONNABORTED') {
                                   errorMessage += 'Request timeout. ';
                              } else if (verifyError.response?.status >= 500) {
                                   errorMessage += 'Server error. ';
                              }
                              errorMessage += `Please contact support with payment ID: ${response.razorpay_payment_id}`;

                              alert(errorMessage);
                              setIsProcessing(false);
                         }
                    },
                    prefill: {
                         email: userSession.email || '',
                         contact: userSession.phone || '9999999999',
                         name: userSession.name || userSession.username || ''
                    },
                    theme: {
                         color: "#e50914"
                    },
                    modal: {
                         ondismiss: () => {
                              console.log('Payment modal closed by user');
                              setIsProcessing(false);
                         },
                         confirm_close: true,
                         escape: true,
                         backdropclose: false
                    },
                    readonly: {
                         email: true,
                         name: true,
                         contact: false
                    },
                    remember_customer: false,
                    send_sms_hash: false,
                    allow_rotation: true,
                    retry: {
                         enabled: false
                    },
                    timeout: 300,
                    config: {
                         display: {
                              hide: [
                                   {
                                        method: "wallet"
                                   }
                              ],
                              preferences: {
                                   show_default_blocks: true
                              }
                         }
                    },
                    method: {
                         card: true,
                         netbanking: true,
                         wallet: false,
                         upi: true,
                         paylater: false
                    }
               };

               console.log('Opening Razorpay with options:', options);

               const razorpay = new window.Razorpay(options);

               razorpay.on('payment.failed', function (response) {
                    console.error('Payment failed:', response.error);
                    setError(`Payment failed: ${response.error.description || 'Unknown error'}`);
                    setIsProcessing(false);
               });

               razorpay.open();

          } catch (error) {
               console.error('Payment initiation failed:', error);
               setIsProcessing(false);

               let errorMessage = 'Failed to initiate payment. ';

               if (error.code === 'ECONNABORTED') {
                    errorMessage += 'Request timeout. Please check your internet connection.';
               } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    errorMessage += 'Cannot connect to payment server. Please try again later.';
               } else if (error.response?.status === 400) {
                    errorMessage += 'Invalid payment details. Please try again.';
               } else if (error.response?.status >= 500) {
                    errorMessage += 'Server error. Please try again later.';
               } else if (error.message) {
                    errorMessage += error.message;
               } else {
                    errorMessage += 'Please try again.';
               }

               setError(errorMessage);
          }
     };

     const getDurationInMs = (duration) => {
          const [amount, unit] = duration.split(' ');
          const monthInMs = 30 * 24 * 60 * 60 * 1000;
          switch (unit.toLowerCase()) {
               case 'month': return monthInMs;
               case 'months': return monthInMs * parseInt(amount);
               case 'year': return monthInMs * 12;
               default: return monthInMs;
          }
     };

     const handleGoBack = () => {
          const returnPath = localStorage.getItem('return-path');
          localStorage.removeItem('return-path');

          if (returnPath) {
               navigate(returnPath);
          } else {
               navigate(-1);
          }
     };

     const clearError = () => {
          setError(null);
     };

     const refreshSession = () => {
          setSessionLoading(true);
          window.location.reload();
     };

     // Show loading while checking session
     if (sessionLoading) {
          return (
               <div className="payment-container">
                    <div className="loading-session">
                         <div className="spinner"></div>
                         <h3>Checking user session...</h3>
                         <p>Please wait while we verify your login status.</p>
                    </div>
               </div>
          );
     }

     // Show login required if no user session
     if (!userSession || !userSession.id) {
          return (
               <div className="payment-container">
                    <nav className="payment-navbar">
                         <div className="nav-left">
                              <button className="back-btn" onClick={handleGoBack}>
                                   <IoArrowBack />
                              </button>
                              <div className="logo">
                                   <GiFilmSpool size={32} />
                                   <span>Oli Premium</span>
                              </div>
                         </div>
                    </nav>

                    <div className="payment-content">
                         <div className="login-required">
                              <div className="login-notice">
                                   <div className="login-icon">🔐</div>
                                   <h2>Session Issue Detected</h2>
                                   <p>We couldn't find your login session. This might be due to:</p>
                                   <ul>
                                        <li>Session expired</li>
                                        <li>Browser cleared cookies</li>
                                        <li>You need to log in again</li>
                                   </ul>

                                   <div className="login-actions">
                                        <button
                                             className="login-btn"
                                             onClick={() => navigate('/')}
                                        >
                                             Go to Login
                                        </button>
                                        <button
                                             className="refresh-btn"
                                             onClick={refreshSession}
                                        >
                                             Refresh Page
                                        </button>
                                   </div>
                              </div>
                         </div>
                    </div>
               </div>
          );
     }

     return (
          <div className="payment-container">
               <nav className="payment-navbar">
                    <div className="nav-left">
                         <button className="back-btn" onClick={handleGoBack}>
                              <IoArrowBack />
                         </button>
                         <div className="logo">
                              <GiFilmSpool size={32} />
                              <span>Oli Premium</span>
                         </div>
                    </div>
                    <div className="nav-right">
                         <div className="user-info-nav">
                              <img
                                   src={userSession.picture || '/default-avatar.png'}
                                   alt="User"
                                   className="nav-user-avatar"
                                   onError={(e) => { e.target.src = '/default-avatar.png'; }}
                              />
                              <span className="nav-user-name">
                                   {userSession.name || userSession.username}
                              </span>
                         </div>
                    </div>
               </nav>

               <div className="payment-content">
                    <div className="payment-header">
                         <h1>Choose Your Premium Plan</h1>
                         <p>Unlock unlimited access to our entire content library</p>

                         <div className="user-welcome">
                              <p>Welcome, <strong>{userSession.name || userSession.username}</strong>!</p>
                         </div>

                         {/* Promo Code Section */}
                         <div className="promo-section">
                              <div className="promo-header">
                                   <h3>🎁 Have a Promo Code?</h3>
                                   <p>Get instant premium access with your promo code</p>
                                   <button
                                        className="toggle-promo-btn"
                                        onClick={() => setShowPromoInput(!showPromoInput)}
                                   >
                                        {showPromoInput ? 'Hide Promo Code' : 'Enter Promo Code'}
                                   </button>
                              </div>

                              {showPromoInput && (
                                   <div className="promo-input-section">
                                        <div className="promo-input-group">
                                             <input
                                                  type="text"
                                                  placeholder="Enter promo code (e.g., USEOLI)"
                                                  value={promoCode}
                                                  onChange={(e) => setPromoCode(e.target.value)}
                                                  disabled={isProcessing}
                                                  className="promo-input"
                                                  maxLength={20}
                                             />
                                             <button
                                                  className="apply-promo-btn"
                                                  onClick={handlePromoCode}
                                                  disabled={isProcessing || !promoCode.trim()}
                                             >
                                                  {isProcessing ? 'Applying...' : 'Apply'}
                                             </button>
                                        </div>

                                        {promoError && (
                                             <div className="promo-error">
                                                  ❌ {promoError}
                                             </div>
                                        )}

                                        {promoSuccess && (
                                             <div className="promo-success">
                                                  ✅ {promoSuccess}
                                             </div>
                                        )}

                                        <div className="promo-hint">
                                             <p>💡 Try the promo code <strong>"USEOLI"</strong> for free access!</p>
                                        </div>
                                   </div>
                              )}
                         </div>

                         {/* OR Divider */}
                         <div className="payment-divider">
                              <span>or choose a plan below</span>
                         </div>

                         {!isRazorpayLoaded && !error && (
                              <div className="loading-payment">
                                   <div className="spinner"></div>
                                   <p>Loading payment service...</p>
                              </div>
                         )}

                         {error && (
                              <div className="error-message">
                                   <p>⚠️ {error}</p>
                                   <button className="retry-btn" onClick={clearError}>
                                        Try Again
                                   </button>
                              </div>
                         )}
                    </div>

                    <div className="plans-grid">
                         {plans.map((plan) => (
                              <div
                                   key={plan.id}
                                   className={`plan-card ${plan.recommended ? 'recommended' : ''} ${selectedPlan === plan.id ? 'selected' : ''}`}
                                   onClick={() => setSelectedPlan(plan.id)}
                              >
                                   {plan.recommended && (
                                        <div className="recommended-badge">RECOMMENDED</div>
                                   )}
                                   <h2 className="plan-name">{plan.name}</h2>
                                   <div className="plan-price">
                                        <span className="currency">₹</span>
                                        <span className="amount">{plan.price}</span>
                                        <span className="duration">/{plan.duration}</span>
                                   </div>
                                   <ul className="plan-features">
                                        {plan.features.map((feature, index) => (
                                             <li key={index}>
                                                  <IoCheckmarkCircle className="feature-icon" />
                                                  {feature}
                                             </li>
                                        ))}
                                   </ul>
                                   <button
                                        className="select-plan-btn"
                                        onClick={(e) => {
                                             e.stopPropagation();
                                             handlePayment(plan);
                                        }}
                                        disabled={isProcessing || !isRazorpayLoaded || error}
                                   >
                                        {isProcessing ? (
                                             <>
                                                  <div className="btn-spinner"></div>
                                                  Processing...
                                             </>
                                        ) : !isRazorpayLoaded ? (
                                             'Loading...'
                                        ) : error ? (
                                             'Service Unavailable'
                                        ) : (
                                             'Select Plan'
                                        )}
                                   </button>
                              </div>
                         ))}
                    </div>
               </div>
          </div>
     );
}

export default Payment;
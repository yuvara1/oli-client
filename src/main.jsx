import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Add this if you have global styles

import { GoogleOAuthProvider } from '@react-oauth/google'

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '422702041209-2dmcltdmsj9vaoga8vq52naprgl6b0a5.apps.googleusercontent.com';

// Suppress Mux Player warnings
if (typeof window !== 'undefined') {
     window.addEventListener('error', (e) => {
          if (e.message && e.message.includes('Media Chrome')) {
               e.preventDefault();
               return false;
          }
     });

     // Suppress console warnings for Media Chrome
     const originalWarn = console.warn;
     console.warn = (...args) => {
          if (args[0] && typeof args[0] === 'string' && args[0].includes('Media Chrome')) {
               return;
          }
          originalWarn.apply(console, args);
     };
}

ReactDOM.createRoot(document.getElementById('root')).render(
     <GoogleOAuthProvider clientId={clientId}>
          <App />
     </GoogleOAuthProvider>
)
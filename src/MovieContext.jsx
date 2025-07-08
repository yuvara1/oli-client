import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const MovieContext = createContext();

export const useMovieContext = () => {
     const context = useContext(MovieContext);
     if (!context) {
          throw new Error('useMovieContext must be used within a MovieProvider');
     }
     return context;
};

export const MovieProvider = ({ children }) => {
     const [trailers, setTrailers] = useState([]);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState(null);

     // Optimized trailer management
     const updateTrailers = useCallback((newTrailers) => {
          setTrailers(prev => {
               // Only update if different to prevent unnecessary re-renders
               if (JSON.stringify(prev) !== JSON.stringify(newTrailers)) {
                    return newTrailers;
               }
               return prev;
          });
     }, []);

     // Clear trailers to free memory
     const clearTrailers = useCallback(() => {
          setTrailers([]);
     }, []);

     // Memoize context value to prevent unnecessary re-renders
     const contextValue = useMemo(() => ({
          trailers,
          setTrailers: updateTrailers,
          loading,
          setLoading,
          error,
          setError,
          clearTrailers
     }), [trailers, updateTrailers, loading, error, clearTrailers]);

     return (
          <MovieContext.Provider value={contextValue}>
               {children}
          </MovieContext.Provider>
     );
};
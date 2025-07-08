import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MovieProvider } from './MovieContext';
import Home from './Home/Home';
import Movies from './Movies/Movie';
import Series from './Series/Series';
import Watch from './Watch/Watch';
import Payment from './Payment/Payment.jsx';
import Admin from './Admin/Admin.jsx';
import ProtectedRoute from './components/ProtectedRoute'; // Create this component

function App() {
  return (
    <MovieProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/series" element={<Series />} />
          <Route path="/watch/:type/:id" element={<Watch />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/payment" element={<Payment />} />

          {/* Protected Admin Route - Allow access level 1 OR 2 */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredAccess={[1, 2]}>
                <Admin />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Home />} />
        </Routes>
      </Router>
    </MovieProvider>
  );
}

export default App;
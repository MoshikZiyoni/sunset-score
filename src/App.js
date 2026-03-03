import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SunsetPredictor from './components/SunsetPredictor';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SunsetPredictor />} />
      </Routes>
    </Router>
  );
}

export default App;

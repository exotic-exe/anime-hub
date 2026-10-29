import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Details from './pages/Details';
import Watch from './pages/Watch';
import Search from './pages/Search';

export default function App() {
  return (
    <Router>
      <div className="bg-[#0b0d13] text-[#e4e6ed] min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/details/:id" element={<Details />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/search" element={<Search />} />
          <Route path="/most-popular" element={<Home />} />
          <Route path="/az-list" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

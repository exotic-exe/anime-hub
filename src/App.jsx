import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Details from './pages/Details';
import Watch from './pages/Watch';
import Search from './pages/Search';
import History from './pages/History';
import Catalog from './pages/Catalog';

export default function App() {
  return (
    <Router>
      <div className="bg-[#0b0d13] text-[#e4e6ed] min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/details/:id" element={<Details />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/search" element={<Search />} />
          <Route path="/history" element={<History />} />
          <Route path="/trending" element={<Catalog />} />
          <Route path="/most-popular" element={<Catalog />} />
          <Route path="/top-rated" element={<Catalog />} />
          <Route path="/airing" element={<Catalog />} />
          <Route path="/upcoming" element={<Catalog />} />
          <Route path="/movies" element={<Catalog />} />
          <Route path="/az-list" element={<Catalog />} />
          <Route path="/genre/:genre" element={<Catalog />} />
          <Route path="/catalog" element={<Catalog />} />
        </Routes>
      </div>
    </Router>
  );
}

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

// Lazy-load other routes so the initial homepage bundle is tiny and instant
const Details = lazy(() => import('./pages/Details'));
const Watch = lazy(() => import('./pages/Watch'));
const Search = lazy(() => import('./pages/Search'));
const History = lazy(() => import('./pages/History'));
const Catalog = lazy(() => import('./pages/Catalog'));

const RouteLoader = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full"></div>
  </div>
);

export default function App() {
  return (
    <Router>
      <div className="bg-[#0b0d13] text-[#e4e6ed] min-h-screen">
        <Suspense fallback={<RouteLoader />}>
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
        </Suspense>
      </div>
    </Router>
  );
}


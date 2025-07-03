import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/Dashboard.jsx";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage.jsx";
import InventoryPage from "./pages/InventoryPage.jsx";
import TransportPage from "./pages/TransportPage.jsx";
import { NotFound, Footer, Navbar } from "./components";

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    let user = null;
    try {
      user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      user = null;
    }
    // Only rehydrate if user is a valid object with at least an email or id
    if (token && user && (user.email || user.id)) {
      dispatch({
        type: "auth/rehydrate",
        payload: { token, user }
      });
    }
  }, [dispatch]);

  return (
    <Router>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={isAuthenticated ? <HomePage /> : <LandingPage />} />
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
            />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/products"
              element={isAuthenticated ? <ProductsPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/inventory"
              element={isAuthenticated ? <InventoryPage /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/transport"
              element={isAuthenticated ? <TransportPage /> : <Navigate to="/login" replace />}
            />
            {/* Add more routes here as needed */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
};

export default App;

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FlashSale from './pages/FlashSale';
import './App.css';

function App() {
    const { isAuthenticated } = useAuthStore();

    return (
        <div className="App">
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/flash-sale" /> : <Login />}
                />
                <Route
                    path="/register"
                    element={isAuthenticated ? <Navigate to="/flash-sale" /> : <Register />}
                />
                <Route
                    path="/flash-sale"
                    element={isAuthenticated ? <FlashSale /> : <Navigate to="/login" />}
                />
            </Routes>
        </div>
    );
}

export default App;

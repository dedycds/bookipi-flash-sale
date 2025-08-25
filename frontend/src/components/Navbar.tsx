import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const Navbar = () => {
    const { isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <Link to="/" className="navbar-brand">
                    Bookipi Flash Sale
                </Link>
                <ul className="navbar-nav">
                    {isAuthenticated ? (
                        <>
                            <li>
                                <Link to="/flash-sale" className="nav-link">
                                    Flash Sale
                                </Link>
                            </li>
                            <li>
                                <span className="nav-link">Welcome</span>
                            </li>
                            <li>
                                <button onClick={handleLogout} className="nav-button">
                                    Logout
                                </button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li>
                                <Link to="/login" className="nav-link">
                                    Login
                                </Link>
                            </li>
                            <li>
                                <Link to="/register" className="nav-link">
                                    Register
                                </Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;

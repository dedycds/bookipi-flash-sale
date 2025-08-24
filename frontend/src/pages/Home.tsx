import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const Home = () => {
    const { isAuthenticated } = useAuthStore();

    return (
        <div className="flash-sale-container">
            <div className="product-card">
                <h1>Welcome to Bookipi Flash Sale!</h1>
                <p>
                    Get ready for an exciting flash sale experience. Limited time offers on amazing
                    products with guaranteed stock availability.
                </p>

                {isAuthenticated ? (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <Link to="/flash-sale">
                            <button className="buy-button">Go to Flash Sale</button>
                        </Link>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <p>Please login or register to participate in the flash sale.</p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <Link to="/login">
                                <button className="buy-button">Login</button>
                            </Link>
                            <Link to="/register">
                                <button className="buy-button">Register</button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;

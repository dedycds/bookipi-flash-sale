import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from 'react-query';
import { toast } from 'react-hot-toast';
import { authAPI, LoginRequest } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const Login = () => {
    const [formData, setFormData] = useState<LoginRequest>({
        email: '',
        password: '',
    });
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const loginMutation = useMutation((data: LoginRequest) => authAPI.login(data), {
        onSuccess: response => {
            const { user, token } = response.data;
            login(user, token);
            toast.success('Login successful!');
            navigate('/flash-sale');
        },
        onError: (error: unknown) => {
            type AxiosErrorLike = { response?: { data?: { message?: string } } };
            const err = error as AxiosErrorLike;
            toast.error(err.response?.data?.message || 'Login failed');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loginMutation.mutate(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="flash-sale-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Login</h2>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="buy-button"
                    disabled={loginMutation.isLoading}
                    style={{ width: '100%' }}
                >
                    {loginMutation.isLoading ? 'Logging in...' : 'Login'}
                </button>
                <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                    Do not have an account?{' '}
                    <Link to="/register" style={{ color: '#667eea' }}>
                        Register here
                    </Link>
                </p>
            </form>
        </div>
    );
};

export default Login;

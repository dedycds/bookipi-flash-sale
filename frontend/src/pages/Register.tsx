import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from 'react-query';
import { toast } from 'react-hot-toast';
import { authAPI, RegisterRequest } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const Register = () => {
    const [formData, setFormData] = useState<RegisterRequest>({
        email: '',
        password: '',
    });
    const navigate = useNavigate();
    const { login } = useAuthStore();

    const registerMutation = useMutation((data: RegisterRequest) => authAPI.register(data), {
        onSuccess: response => {
            const { user, token } = response.data;
            login(user, token);
            toast.success('Registration successful!');
            navigate('/flash-sale');
        },
        onError: (error: unknown) => {
            type AxiosErrorLike = { response?: { data?: { message?: string } } };
            const err = error as AxiosErrorLike;
            toast.error(err.response?.data?.message || 'Registration failed');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        registerMutation.mutate(formData);
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
                <h2>Register</h2>
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
                        minLength={6}
                    />
                </div>
                <button
                    type="submit"
                    className="buy-button"
                    disabled={registerMutation.isLoading}
                    style={{ width: '100%' }}
                >
                    {registerMutation.isLoading ? 'Registering...' : 'Register'}
                </button>
                <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: '#667eea' }}>
                        Login here
                    </Link>
                </p>
            </form>
        </div>
    );
};

export default Register;

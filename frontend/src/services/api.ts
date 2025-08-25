import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

interface ImportMetaEnv {
    VITE_API_BASE_URL?: string;
}

const meta = import.meta as unknown as { env?: ImportMetaEnv };
const API_BASE_URL = meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(config => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    user: {
        id: string;
        email: string;
    };
    token: string;
}

export interface FlashSale {
    product_id: string;
    status: 'upcoming' | 'active' | 'ended';
    remaining_stock: number;
    start_date: string;
    end_date: string;
    price_in_cent: number;
    name: string;
}

export interface OrderRequest {
    productId: string;
}

export interface OrderResponse {
    status: 'completed' | 'pending';
    order_id: string;
    product_id: string;
}

export const authAPI = {
    login: (data: LoginRequest) => api.post<LoginResponse>('/users/authenticate', data),
    register: (data: RegisterRequest) => api.post<LoginResponse>('/users', data),
};

export const flashSaleAPI = {
    get: () => api.get<FlashSale>('/sales'),
};

export const orderAPI = {
    create: (data: OrderRequest) => api.post<OrderResponse>('/orders', data),
    get: () => api.get<OrderResponse>('/orders'),
};

export default api;

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

export interface SaleStatus {
    status: 'upcoming' | 'active' | 'ended';
    remainingStock: number;
    startDate: string;
    endDate: string;
}

export interface Product {
    product_id: string;
    name: string;
    price_in_cent: number;
    quantity: number;
}

export interface PurchaseRequest {
    productId: string;
}

export interface PurchaseResponse {
    orderId: string;
    userId: string;
    productId: string;
}

export interface PurchaseResult {
    message: string;
    orderId?: string;
}

export const authAPI = {
    login: (data: LoginRequest) => api.post<LoginResponse>('/users/authenticate', data),
    register: (data: RegisterRequest) => api.post<LoginResponse>('/users/signup', data),
};

export const saleAPI = {
    getStatus: () => api.get<SaleStatus>('/sale/status'),
    getProduct: () => api.get<Product>('/sale/product'),
    attemptPurchase: (data: PurchaseRequest) => api.post<PurchaseResponse>('/sale/attempt', data),
    checkPurchase: (orderId: string) => api.post<PurchaseResult>('/sale/check', { orderId }),
};

export default api;

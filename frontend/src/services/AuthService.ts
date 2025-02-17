import axios from 'axios';
import { API__BASE_URL, LoginBody, RegisterAccountBody } from '../constants';
import { Cookies } from 'react-cookie';

class AuthService {
    private static instance: AuthService | null = null;
    private readonly AUTH_API: string = `${API__BASE_URL}/auth`;
    private cookies = new Cookies();

    constructor() {
        if (AuthService.instance) {
            return AuthService.instance;
        }

        const constructorCookies = new Cookies();
        axios.interceptors.request.use(function (config) {
            const token = constructorCookies.get('authToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        AuthService.instance = this;
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }

        return AuthService.instance;
    }

    public async login(data: LoginBody): Promise<{ error: boolean }> {
        try {
            const response = await axios.post(`${this.AUTH_API}/login`, data);

            const authToken = response.data;
            const prodMode = import.meta.env.PROD;

            this.cookies.set('authToken', authToken, {
                path: '/',
                secure: prodMode,
                sameSite: 'lax',
            });

            return {
                error: false,
            };
        } catch (error: any) {
            return {
                error: true,
            };
        }
    }

    public async createAccount(data: RegisterAccountBody): Promise<{ error: boolean }> {
        try {
            await axios.post(`${this.AUTH_API}/register`, data);

            return {
                error: false,
            };
        } catch (error: any) {
            return {
                error: true,
            };
        }
    }

    public logout(): void {
        this.cookies.remove('authToken', { path: '/' });
    }
}

const authService = AuthService.getInstance;

export default authService();

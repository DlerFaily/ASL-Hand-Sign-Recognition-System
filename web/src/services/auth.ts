import apiClient from "../cfg/api";

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface SignupCredentials {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    password2?: string;
}

export interface AuthTokens {
    access: string;
    refresh: string;
}

export interface User {
    id?: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
}

export interface LoginResponse {
    access: string;
    refresh: string;
}

/**
 * Login user and obtain JWT tokens
 */
export const login = async (
    credentials: LoginCredentials
): Promise<AuthTokens> => {
    const response = await apiClient.post<LoginResponse>(
        "/api/token/",
        credentials
    );
    return {
        access: response.data.access,
        refresh: response.data.refresh,
    };
};

/**
 * Register a new user
 */
export const signup = async (
    credentials: SignupCredentials
): Promise<AuthTokens> => {
    const response = await apiClient.post<LoginResponse>(
        "/api/signup/",
        credentials
    );
    return {
        access: response.data.access,
        refresh: response.data.refresh,
    };
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (refreshToken: string): Promise<string> => {
    const response = await apiClient.post<{ access: string }>(
        "/api/token/refresh/",
        {
            refresh: refreshToken,
        }
    );
    return response.data.access;
};

/**
 * Verify if token is valid
 */
export const verifyToken = async (token: string): Promise<boolean> => {
    try {
        await apiClient.post("/api/token/verify/", { token });
        return true;
    } catch {
        return false;
    }
};

/**
 * Get current user profile (requires authentication)
 */
export const getUserProfile = async (): Promise<User> => {
    const response = await apiClient.get<User>("/api/test/");
    return response.data;
};

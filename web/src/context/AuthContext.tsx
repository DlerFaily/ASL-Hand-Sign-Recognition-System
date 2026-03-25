import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import {
    login as apiLogin,
    signup as apiSignup,
    refreshToken as apiRefreshToken,
    getUserProfile,
} from "../services/auth";
import type {
    LoginCredentials,
    SignupCredentials,
    User,
    AuthTokens,
} from "../services/auth";
import apiClient from "../cfg/api";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    signup: (credentials: SignupCredentials) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "auth_tokens";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load tokens from localStorage and verify on mount
    useEffect(() => {
        const initAuth = async () => {
            const storedTokens = localStorage.getItem(TOKEN_KEY);
            if (storedTokens) {
                try {
                    const tokens: AuthTokens = JSON.parse(storedTokens);
                    // Set the token in axios headers
                    apiClient.defaults.headers.common[
                        "Authorization"
                    ] = `Bearer ${tokens.access}`;
                    // Fetch user profile to verify token is still valid
                    const userProfile = await getUserProfile();
                    setUser(userProfile);
                } catch (error) {
                    // Token invalid or expired, clear it
                    localStorage.removeItem(TOKEN_KEY);
                    delete apiClient.defaults.headers.common["Authorization"];
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, []);

    // Setup axios interceptors for token refresh
    useEffect(() => {
        const responseInterceptor = apiClient.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;

                // If 401 and we haven't retried yet, try to refresh token
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;

                    const storedTokens = localStorage.getItem(TOKEN_KEY);
                    if (storedTokens) {
                        try {
                            const tokens: AuthTokens = JSON.parse(storedTokens);
                            const newAccessToken = await apiRefreshToken(
                                tokens.refresh
                            );

                            // Update stored tokens
                            const newTokens = {
                                ...tokens,
                                access: newAccessToken,
                            };
                            localStorage.setItem(
                                TOKEN_KEY,
                                JSON.stringify(newTokens)
                            );

                            // Update axios header
                            apiClient.defaults.headers.common[
                                "Authorization"
                            ] = `Bearer ${newAccessToken}`;
                            originalRequest.headers[
                                "Authorization"
                            ] = `Bearer ${newAccessToken}`;

                            // Retry original request
                            return apiClient(originalRequest);
                        } catch (refreshError) {
                            // Refresh failed, logout user
                            localStorage.removeItem(TOKEN_KEY);
                            delete apiClient.defaults.headers.common[
                                "Authorization"
                            ];
                            setUser(null);
                        }
                    }
                }

                return Promise.reject(error);
            }
        );

        return () => {
            apiClient.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    const login = async (credentials: LoginCredentials) => {
        const tokens = await apiLogin(credentials);

        // Store tokens
        localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));

        // Set authorization header
        apiClient.defaults.headers.common[
            "Authorization"
        ] = `Bearer ${tokens.access}`;

        // Fetch user profile
        const userProfile = await getUserProfile();
        setUser(userProfile);
    };

    const signup = async (credentials: SignupCredentials) => {
        const tokens = await apiSignup(credentials);

        // Store tokens
        localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));

        // Set authorization header
        apiClient.defaults.headers.common[
            "Authorization"
        ] = `Bearer ${tokens.access}`;

        // Try to fetch user profile, but don't fail if it errors
        try {
            const userProfile = await getUserProfile();
            setUser(userProfile);
        } catch (error) {
            // If profile fetch fails, set a minimal user object
            // The user is still authenticated with valid tokens
            console.warn("Failed to fetch user profile after signup:", error);
            setUser({
                username: credentials.username,
                email: credentials.email,
                first_name: credentials.first_name,
                last_name: credentials.last_name,
            });
        }
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        delete apiClient.defaults.headers.common["Authorization"];
        setUser(null);
    };

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

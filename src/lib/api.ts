import { AuthResponse, Message, User, Conversation } from '../types';

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const BASE_URL = getBaseUrl();

// Version: 1.0.2 - Using absolute URL and fixed double slashes
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const getAccessToken = () => {
    if (typeof window === 'undefined') return null;
    const t = sessionStorage.getItem('access_token');
    return (t === 'null' || t === 'undefined') ? null : t;
  };

  const getRefreshToken = () => {
    if (typeof window === 'undefined') return null;
    const t = sessionStorage.getItem('refresh_token');
    return (t === 'null' || t === 'undefined') ? null : t;
  };

  const token = getAccessToken();
  const isAuthRequest = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && !isAuthRequest ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/register')) {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
      throw new Error('Unauthorized');
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!refreshResponse.ok) {
          throw new Error('Failed to refresh token');
        }

        const data: AuthResponse = await refreshResponse.json();
        sessionStorage.setItem('access_token', data.access_token);
        sessionStorage.setItem('refresh_token', data.refresh_token);
        
        isRefreshing = false;
        onRefreshed(data.access_token);
      } catch (err) {
        isRefreshing = false;
        console.error('Token refresh failed:', err);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
          if (window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        }
        throw new Error('Unauthorized');
      }
    }

    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => {
        resolve(
          apiFetch<T>(endpoint, {
            ...options,
            headers: {
              ...(options.headers as Record<string, string> || {}),
              Authorization: `Bearer ${newToken}`,
            },
          })
        );
      });
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    let errorMessage = 'API request failed';
    
    if (typeof errorData.detail === 'string') {
      errorMessage = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      errorMessage = errorData.detail.map((err: { msg: string }) => err.msg).join(', ');
    } else if (errorData.message) {
      errorMessage = errorData.message;
    }
    
    if (response.status === 401 && typeof window !== 'undefined' && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

export const registerUser = async (data: unknown): Promise<AuthResponse> => {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const loginUser = async (data: unknown): Promise<AuthResponse> => {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const fetchPublicKey = async (userId: string): Promise<{ public_key: string }> => {
  return apiFetch<{ public_key: string }>(`/users/${userId}/public-key`);
};

export const sendEncryptedMessage = async (
  to: string,
  payload: unknown
): Promise<Message> => {
  return apiFetch<Message>('/messages', {
    method: 'POST',
    body: JSON.stringify({ to, payload }),
  });
};

export const fetchMessages = async (
  userId: string,
  params: { limit?: number; before?: string } = {}
): Promise<Message[]> => {
  const query = new URLSearchParams();
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.before) query.append('before', params.before);
  
  const queryString = query.toString();
  return apiFetch<Message[]>(`/conversations/${userId}/messages${queryString ? `?${queryString}` : ''}`);
};

export const fetchUsers = async (query: string): Promise<User[]> => {
  return apiFetch<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
};

export const fetchConversations = async (): Promise<Conversation[]> => {
  return apiFetch<Conversation[]>('/conversations');
};

export const fetchMe = async (): Promise<User> => {
  return apiFetch<User>('/auth/me');
};

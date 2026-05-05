import { AuthResponse, Message, User, Conversation } from '../types';

const BASE_URL = '/api/v1';

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('access_token') : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    let errorMessage = 'API request failed';
    
    if (typeof errorData.detail === 'string') {
      errorMessage = errorData.detail;
    } else if (Array.isArray(errorData.detail)) {
      // Handle Pydantic validation errors
      errorMessage = errorData.detail.map((err: any) => err.msg).join(', ');
    } else if (errorData.message) {
      errorMessage = errorData.message;
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

export const registerUser = async (data: any): Promise<AuthResponse> => {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const loginUser = async (data: any): Promise<AuthResponse> => {
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
  payload: any
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

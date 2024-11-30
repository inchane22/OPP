import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, InsertUser } from "@db/schema";

type ApiResponse<T = undefined> = {
  ok: boolean;
  message?: string;
  user?: User;
} & (T extends undefined ? {} : { data: T });

async function apiRequest<T = undefined>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers: {
      ...options?.headers,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: () => apiRequest<User>('/api/user').then(res => res.user),
    retry: false,
    staleTime: Infinity,
  });

  const login = async (credentials: InsertUser) => {
    return apiRequest('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  };

  const register = async (userData: InsertUser) => {
    return apiRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  };

  const logout = async () => {
    await apiRequest('/api/logout', { method: 'POST' });
    queryClient.clear();
    window.location.href = '/login';
  };

  return {
    user,
    isLoading,
    login,
    logout,
    register,
  };
}
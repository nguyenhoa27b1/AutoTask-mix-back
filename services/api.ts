import { User, Task, Role, AppFile, Priority, GoogleProfile } from '../types';

// Backend API base URL
// In production (same domain), use relative path '/api'
// In development (localhost), use localhost:4000
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 
    (import.meta.env.MODE === 'production' 
        ? '/api'  // Production: same domain
        : `http://${window.location.hostname}:4000/api`); // Dev: localhost:4000

// Helper to make HTTP requests
async function fetchFromBackend<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Mask sensitive fields for logging (e.g., password)
    const maskSensitive = (body: any) => {
        try {
            if (!body) return body;
            if (typeof body === 'string') {
                const parsed = JSON.parse(body);
                if (parsed && typeof parsed === 'object' && 'password' in parsed) {
                    return { ...parsed, password: '***' };
                }
                return parsed;
            }
            if (body instanceof FormData) return '[FormData]';
            if (typeof body === 'object') {
                if ('password' in body) return { ...body, password: '***' };
                return body;
            }
            return body;
        } catch (e) {
            return '[unserializable]';
        }
    };

    // Log outgoing request in dev only
    try {
        const safeBody = maskSensitive(options?.body as any);
        // eslint-disable-next-line no-console
        console.debug('[API] ->', options?.method || 'GET', url, safeBody);
    } catch (e) {
        // ignore logging errors
    }

    let response: Response;
    try {
        response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                ...options?.headers,
            },
            ...options,
        });
    } catch (networkErr: any) {
        // eslint-disable-next-line no-console
        console.error('[API] network error when fetching', url, networkErr?.message || networkErr);
        throw new Error(`Network error: ${networkErr?.message || 'Failed to fetch'}`);
    }

    // Log response body (clone so we can still consume it later)
    try {
        const text = await response.clone().text().catch(() => null);
        // eslint-disable-next-line no-console
        console.debug('[API] <-', response.status, url, text ? text.slice(0, 2000) : text);
    } catch (e) {
        // ignore logging errors
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `API error: ${response.status}`);
    }

    return response.json();
}

// This will store the logged in user in memory for the frontend
let loggedInUser: User | null = null;
let authToken: string | null = null;

// --- API IMPLEMENTATION (calls real backend) ---

export const api = {
    // AUTH
    async login(email: string, password: string): Promise<User | null> {
        try {
            // login returns { user, token }
            const resp = await fetchFromBackend<{ user: User; token: string }>('/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            loggedInUser = resp.user;
            authToken = resp.token || null;
            return resp.user;
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Login failed');
        }
    },
    
    async loginWithGoogle(profile: GoogleProfile): Promise<User | null> {
        try {
            console.log('🔵 [API] loginWithGoogle - Sending profile to backend:', profile.email);
            
            // Backend returns { user, token }
            const resp = await fetchFromBackend<{ user: User; token: string }>('/login/google', {
                method: 'POST',
                body: JSON.stringify(profile),
            });
            
            console.log('🔵 [API] loginWithGoogle - Backend response:', resp);
            console.log('🔵 [API] loginWithGoogle - User:', resp.user);
            console.log('🔵 [API] loginWithGoogle - Token:', resp.token ? 'present' : 'MISSING');
            
            if (!resp.user) {
                console.error('❌ [API] loginWithGoogle - No user in response!');
                throw new Error('No user data received from backend');
            }
            
            if (!resp.token) {
                console.warn('⚠️ [API] loginWithGoogle - No token in response! This will cause authentication issues.');
            }
            
            loggedInUser = resp.user;
            authToken = resp.token || null;
            
            console.log('✅ [API] loginWithGoogle - Success! User:', resp.user.email, 'Token stored:', !!authToken);
            
            return resp.user;
        } catch (error) {
            console.error('❌ [API] loginWithGoogle - Error:', error);
            console.error('Error details:', error instanceof Error ? error.message : error);
            throw new Error(error instanceof Error ? error.message : 'Google login failed');
        }
    },

    async register(email: string, name: string, password: string): Promise<User | null> {
        try {
            const user = await fetchFromBackend<User>('/register', {
                method: 'POST',
                body: JSON.stringify({ email, name, password }),
            });
            loggedInUser = user;
            return user;
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Registration failed');
        }
    },

    async logout(): Promise<void> {
        try {
            await fetchFromBackend<{ ok: boolean }>('/logout', {
                method: 'POST',
            });
            loggedInUser = null;
        } catch (error) {
            loggedInUser = null;
            throw new Error(error instanceof Error ? error.message : 'Logout failed');
        }
    },
    
    // DATA FETCHING
    async getUsers(): Promise<User[]> {
        try {
            return await fetchFromBackend<User[]>('/users', {
                method: 'GET',
            });
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to fetch users');
        }
    },

    async getTasks(): Promise<Task[]> {
        try {
            return await fetchFromBackend<Task[]>('/tasks', {
                method: 'GET',
            });
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to fetch tasks');
        }
    },
    
    async getFiles(): Promise<AppFile[]> {
        try {
            return await fetchFromBackend<AppFile[]>('/files', {
                method: 'GET',
            });
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to fetch files');
        }
    },

    // Helper to get file by ID (synchronous, for use in components)
    getFileById(fileId: number): AppFile | undefined {
        // This is a placeholder - in a real scenario, files would be fetched asynchronously
        // For now, we return undefined and rely on the full getFiles() call
        return undefined;
    },
    
    // TASK MANAGEMENT
    async saveTask(
        taskData: Omit<Task, 'id_task' | 'date_created'> & { id_task?: number },
        descriptionFile: File | null,
        currentUser: User,
    ): Promise<Task> {
        try {
            // If there's a description file, send as FormData (multipart)
            if (descriptionFile) {
                const formData = new FormData();
                // Add task data as individual form fields
                formData.append('title', taskData.title || '');
                formData.append('description', taskData.description || '');
                formData.append('deadline', taskData.deadline || new Date().toISOString());
                formData.append('priority', String(taskData.priority || 2));
                formData.append('assignee_id', String(taskData.assignee_id || currentUser.user_id));
                formData.append('assigner_id', String(taskData.assigner_id || currentUser.user_id));
                formData.append('status', taskData.status || 'Pending');
                if (taskData.id_task) formData.append('id_task', String(taskData.id_task));
                // Add the file
                formData.append('file', descriptionFile);

                const headers: HeadersInit = {};
                if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

                const response = await fetch(`${API_BASE_URL}/tasks`, {
                    method: 'POST',
                    body: formData,
                    headers,
                });

                if (!response.ok) {
                    const error = await response.json().catch(() => ({ error: response.statusText }));
                    throw new Error(error.error || `API error: ${response.status}`);
                }

                return await response.json();
            }

            // No file: send as JSON
            const payload = {
                ...taskData,
                id_task: taskData.id_task || undefined,
            };

            return await fetchFromBackend<Task>('/tasks', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to save task');
        }
    },

    async deleteTask(taskId: number): Promise<boolean> {
        try {
            await fetchFromBackend<{ ok: boolean }>(`/tasks/${taskId}`, {
                method: 'DELETE',
            });
            return true;
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to delete task');
        }
    },
    
    async submitTask(taskId: number, file: File, currentUser: User): Promise<Task> {
        try {
            const formData = new FormData();
            formData.append('file', file);

            // include Authorization header so server can attribute upload to authenticated user
            const headers: HeadersInit = {};
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

            const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/submit`, {
                method: 'POST',
                body: formData,
                headers,
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(error.error || `API error: ${response.status}`);
            }

            const result = await response.json();
            return result.task;
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to submit task');
        }
    },
    
    // USER MANAGEMENT
    async addUser(email: string, role: Role): Promise<User> {
        try {
            return await fetchFromBackend<User>('/users', {
                method: 'POST',
                body: JSON.stringify({ email, role }),
            });
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to add user');
        }
    },

    async updateUserRole(userId: number, role: Role): Promise<User> {
        try {
            return await fetchFromBackend<User>(`/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role }),
            });
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to update user role');
        }
    },

    async deleteUser(userId: number): Promise<boolean> {
        try {
            await fetchFromBackend<{ ok: boolean }>(`/users/${userId}`, {
                method: 'DELETE',
            });
            return true;
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to delete user');
        }
    },

    // FILE DOWNLOAD (fetch with Authorization and trigger browser download)
    async downloadFile(fileId: number, suggestedName?: string): Promise<void> {
        const host = API_BASE_URL.replace(/\/api\/?$/, '');
        const url = `${host}/files/${fileId}/download`;
        const headers: HeadersInit = {};
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const resp = await fetch(url, { method: 'GET', headers });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: resp.statusText }));
            throw new Error(err.error || `Download failed: ${resp.status}`);
        }
        const blob = await resp.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = suggestedName || `file-${fileId}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
    }
};
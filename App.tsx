import React, { useState, useEffect, useCallback } from 'react';
import { User, Task, Role, Priority, AppFile, GoogleProfile } from './types';
import { api } from './services/api';
import Login from './components/Login';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TaskModal from './components/TaskModal';
import UserTasksModal from './components/UserTasksModal';

const LoadingScreen: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center">
            <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading Application Data...</p>
        </div>
    </div>
);

// Helper to decode JWT tokens from Google Sign-In
function decodeJwt(token: string): GoogleProfile | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Failed to decode JWT", e);
        return null;
    }
}

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [files, setFiles] = useState<AppFile[]>([]);
    const [isAppLoading, setIsAppLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isUserTasksModalOpen, setIsUserTasksModalOpen] = useState(false);
    const [viewingUser, setViewingUser] = useState<User | null>(null);

    const fetchAppData = useCallback(async () => {
        setIsAppLoading(true);
        try {
            const [usersData, tasksData, filesData] = await Promise.all([
                api.getUsers(),
                api.getTasks(),
                api.getFiles()
            ]);
            setUsers(usersData);
            setTasks(tasksData);
            setFiles(filesData);
        } catch (error) {
            console.error("Failed to fetch app data", error);
            alert("Could not load application data. Please try again later.");
        } finally {
            setIsAppLoading(false);
        }
    }, []);

    const attemptLogin = useCallback(async (userPromise: Promise<User | null>) => {
        console.log('🚀 [APP] attemptLogin - waiting for user promise...');
        try {
            const user = await userPromise;
            console.log('👤 [APP] User received from api.login:', user);
            
            if (user) {
                console.log('✓ [APP] User is valid, setting current user...');
                setCurrentUser(user);
                console.log('📊 [APP] Fetching app data...');
                await fetchAppData();
                console.log('✅ [APP] Login complete - returning true');
                return true;
            }
            console.warn('⚠️ [APP] User is null/undefined - returning false');
            return false;
        } catch (error) {
            console.error("💥 [APP] Login failed with error:", error);
            console.error("Error type:", typeof error);
            console.error("Error stringified:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
            throw error; // Re-throw to be caught in the UI component
        }
    }, [fetchAppData]);

    const handleLogin = (email: string, password: string): Promise<boolean> => {
        console.log('🔑 [APP] handleLogin called with email:', email);
        console.log('📍 [APP] About to call api.login...');
        return attemptLogin(api.login(email, password));
    };

    const handleGoogleLogin = (credentialResponse: any): Promise<boolean> => {
        console.log('═══════════════════════════════════════════');
        console.log('🟢 [APP] handleGoogleLogin called');
        console.log('🟢 Credential response:', credentialResponse);
        console.log('═══════════════════════════════════════════');
        
        try {
            const profile = decodeJwt(credentialResponse.credential);
            console.log('🟢 [APP] Decoded JWT profile:', profile);
            
            if (profile) {
                console.log('🟢 [APP] Profile valid, calling attemptLogin...');
                return attemptLogin(api.loginWithGoogle(profile));
            }
            
            console.error('❌ [APP] Could not decode Google credential');
            console.error('Credential string:', credentialResponse.credential?.substring(0, 50) + '...');
            return Promise.resolve(false);
        } catch (err) {
            console.error('💥 [APP] Error in handleGoogleLogin:', err);
            console.error('Error stack:', (err as Error).stack);
            return Promise.resolve(false);
        }
    };

    const handleLogout = () => {
        api.logout();
        setCurrentUser(null);
        setUsers([]);
        setTasks([]);
        setFiles([]);
    };
    
    const handleSelectTask = (task: Task) => {
        if (isUserTasksModalOpen) {
            handleCloseUserTasksModal();
        }
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    const handleCreateTask = () => {
        setSelectedTask(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTask(null);
    };

    const handleViewUserTasks = (userId: number) => {
        const user = users.find(u => u.user_id === userId);
        if (user) {
            setViewingUser(user);
            setIsUserTasksModalOpen(true);
        }
    };

    const handleCloseUserTasksModal = () => {
        setIsUserTasksModalOpen(false);
        setViewingUser(null);
    };

    const handleSaveTask = async (
        taskData: Omit<Task, 'id_task' | 'date_created'> & { id_task?: number },
        descriptionFile?: File | null
    ) => {
        if (!currentUser) return;
        try {
            const savedTask = await api.saveTask(taskData, descriptionFile || null, currentUser);
            if (taskData.id_task) {
                setTasks(tasks.map(t => t.id_task === savedTask.id_task ? savedTask : t));
            } else {
                setTasks(prevTasks => [...prevTasks, savedTask]);
            }
            // If a file was involved, refetch files list
            if (descriptionFile) {
                const updatedFiles = await api.getFiles();
                setFiles(updatedFiles);
            }
        } catch (error) {
            console.error("Failed to save task", error);
            alert(`Error saving task: ${(error as Error).message}`);
        } finally {
            handleCloseModal();
        }
    };
    
    const handleDeleteTask = async (taskId: number) => {
        try {
            await api.deleteTask(taskId);
            setTasks(tasks.filter(t => t.id_task !== taskId));
        } catch (error) {
            console.error("Failed to delete task", error);
            alert("Error deleting task.");
        } finally {
            handleCloseModal();
        }
    };

    const handleSubmitTask = async (taskId: number, file: File) => {
        if (!currentUser) return;
        try {
            const updatedTask = await api.submitTask(taskId, file, currentUser);
            setTasks(tasks.map(t => t.id_task === taskId ? updatedTask : t));
            // Refetch files to include the new submission
            const updatedFiles = await api.getFiles();
            setFiles(updatedFiles);
        } catch (error) {
             console.error("Failed to submit task", error);
             alert("Error submitting task.");
        } finally {
            handleCloseModal();
        }
    };

    const handleOpenFile = (fileId: number) => {
        const file = files.find(f => f.id_file === fileId);
        if (file && file.url) {
            const newWindow = window.open(file.url, '_blank', 'noopener,noreferrer');
            if (newWindow) newWindow.opener = null;
        } else {
            alert("File URL not found.");
        }
    };

    const handleAddUser = async (email: string, role: Role) => {
        try {
            await api.addUser(email, role);
            // After adding, we should refetch users to get the correct filtered list
            const usersData = await api.getUsers();
            setUsers(usersData);
        } catch (error) {
             console.error("Failed to add user", error);
             alert(`Error adding user: ${(error as Error).message}`);
        }
    };
    
    const handleUpdateUserRole = async (userId: number, role: Role) => {
        try {
            const updatedUser = await api.updateUserRole(userId, role);
            setUsers(users.map(u => u.user_id === userId ? updatedUser : u));
        } catch (error) {
             console.error("Failed to update user role", error);
             alert(`Error updating user role: ${(error as Error).message}`);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        try {
            await api.deleteUser(userId);
            setUsers(users.filter(u => u.user_id !== userId));
        } catch (error) {
             console.error("Failed to delete user", error);
             alert(`Error deleting user: ${(error as Error).message}`);
        }
    };

    if (!currentUser) {
        return <Login onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} />;
    }

    if (isAppLoading) {
        return <LoadingScreen />;
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <Header currentUser={currentUser} onLogout={handleLogout} />
            <main>
                <Dashboard
                    currentUser={currentUser}
                    tasks={tasks}
                    users={users}
                    onSelectTask={handleSelectTask}
                    onCreateTask={handleCreateTask}
                    onAddUser={handleAddUser}
                    onUpdateUserRole={handleUpdateUserRole}
                    onDeleteUser={handleDeleteUser}
                    onViewUserTasks={handleViewUserTasks}
                />
            </main>
            <TaskModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                task={selectedTask}
                currentUser={currentUser}
                users={users}
                files={files}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
                onSubmitTask={handleSubmitTask}
                onOpenFile={handleOpenFile}
            />
            <UserTasksModal
                isOpen={isUserTasksModalOpen}
                onClose={handleCloseUserTasksModal}
                user={viewingUser}
                tasks={tasks}
                users={users}
                onSelectTask={handleSelectTask}
            />
        </div>
    );
};

export default App;
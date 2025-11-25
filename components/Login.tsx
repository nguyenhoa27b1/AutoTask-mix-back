import React, { useState, useEffect } from 'react';

// This tells TypeScript that the 'google' object will be available globally.
declare var google: any;

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onGoogleLogin: (credentialResponse: any) => Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ onLogin, onGoogleLogin }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Safely access the environment variable
  const VITE_GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = async (response: any) => {
    console.log('═══════════════════════════════════════════');
    console.log('🔵 [GOOGLE LOGIN] Credential response received');
    console.log('🔵 Response object keys:', Object.keys(response));
    console.log('🔵 Has credential:', !!response.credential);
    console.log('═══════════════════════════════════════════');
    
    setError('');
    setLoading(true);
    
    try {
        console.log('⏳ [GOOGLE LOGIN] Calling onGoogleLogin...');
        const success = await onGoogleLogin(response);
        console.log('✅ [GOOGLE LOGIN] onGoogleLogin returned:', success);
        
        if (!success) {
            console.error('❌ [GOOGLE LOGIN] Login failed - success is false');
            setError("Access denied. Your email is not authorized to use this system.");
        } else {
            console.log('🎉 [GOOGLE LOGIN] Login successful!');
        }
    } catch (err) {
        console.error('💥 [GOOGLE LOGIN] Exception caught:', err);
        console.error('Error details:', {
            message: (err as Error).message,
            name: (err as Error).name,
            stack: (err as Error).stack
        });
        setError((err as Error).message || "An unexpected error occurred during Google Sign-In.");
    } finally {
        setLoading(false);
        console.log('🏁 [GOOGLE LOGIN] Process completed');
        console.log('═══════════════════════════════════════════\n');
    }
  };

  useEffect(() => {
    if (!VITE_GOOGLE_CLIENT_ID) {
      console.warn("VITE_GOOGLE_CLIENT_ID environment variable not set. Google Sign-In is disabled.");
      return;
    }

    if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
      console.error("Google Identity Services script not loaded yet.");
      // You might want to add a retry mechanism here
      return;
    }

    google.accounts.id.initialize({
      client_id: VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    const googleSignInButton = document.getElementById('googleSignInButton');
    if (googleSignInButton) {
        google.accounts.id.renderButton(
          googleSignInButton,
          { theme: 'outline', size: 'large', width: '100%' } // configuration options
        );
    }
    
    // google.accounts.id.prompt(); // Optional: display the One Tap prompt
  }, [VITE_GOOGLE_CLIENT_ID]);

  const commonInputClasses = "appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 space-y-8">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">TaskFlow</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Sign in with your Google account</p>
        </div>
        
        <div className="w-full">
            {VITE_GOOGLE_CLIENT_ID ? (
                <div id="googleSignInButton" className="flex justify-center"></div>
            ) : (
                <div className="text-center text-xs text-gray-500 p-2 border rounded-md dark:border-gray-600">
                    Google Sign-In is not configured.
                </div>
            )}
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">Authorized Access Only</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Only authorized email addresses can access this system. If you don't have access, please contact your administrator.
                </p>
              </div>
            </div>
        </div>

        {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
        )}

        <div className="text-sm text-center pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              Need access? Contact your system administrator to add your email to the whitelist.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
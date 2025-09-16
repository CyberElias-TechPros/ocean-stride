import * as React from "react";
import { createRoot } from "react-dom/client";
import { StrictMode, Suspense } from "react";
import { db } from "./lib/database2";
import { runMigrationIfNeeded } from "./lib/migrate";
import App from "./App.tsx";
import "./index.css";
import { LoadingSpinner } from "./components/ui/loading-spinner";

// Track initialization state to prevent multiple initializations
let isInitializing = false;
let initializationPromise: Promise<boolean> | null = null;

/**
 * Initialize the application with proper error handling and race condition prevention
 */
async function initializeApp(): Promise<boolean> {
  // Return existing initialization promise if already initializing
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  isInitializing = true;
  console.log('[App] Starting application initialization...');

  initializationPromise = new Promise<boolean>(async (resolve) => {
    try {
      // Step 1: Initialize the database
      console.log('[App] Initializing database...');
      await db.init();
      
      if (!db.isInitialized()) {
        throw new Error('Database failed to initialize');
      }
      console.log('[App] Database initialized successfully');

      // Step 2: Run migrations if needed
      console.log('[App] Checking for database migrations...');
      try {
        const migrationResult = await runMigrationIfNeeded();
        console.log('[App] Migration completed:', migrationResult);
      } catch (migrationError) {
        console.error('[App] Migration error:', migrationError);
        // Don't fail the app for migration errors, but log them
      }

      // Step 3: Additional initialization can go here
      console.log('[App] Application initialization complete');
      resolve(true);
    } catch (error) {
      console.error('[App] Initialization failed:', error);
      resolve(false);
    } finally {
      isInitializing = false;
    }
  });

  return initializationPromise;
}

/**
 * Root component that handles application initialization state
 */
function Root() {
  const [isReady, setIsReady] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [initializationStatus, setInitializationStatus] = React.useState<string>('Initializing application...');

  React.useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      try {
        setInitializationStatus('Connecting to database...');
        const success = await initializeApp();
        
        if (!isMounted) return;
        
        if (!success) {
          throw new Error('Failed to initialize application components');
        }
        
        setInitializationStatus('Loading application...');
        // Small delay to show the loading state for a better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (isMounted) {
          setIsReady(true);
        }
      } catch (err) {
        console.error('Initialization error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('An unknown error occurred during initialization'));
        }
      }
    };

    init();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Loading state
  if (!isReady && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <div className="flex justify-center">
              <LoadingSpinner className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Ocean Stride</h1>
            <p className="text-muted-foreground">{initializationStatus}</p>
          </div>
          
          <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-500 ease-in-out"
              style={{
                width: initializationStatus.includes('database') ? '30%' : 
                       initializationStatus.includes('Loading') ? '70%' : '90%'
              }}
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            This may take a few moments...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background">
        <div className="w-full max-w-md space-y-6 p-6 rounded-lg border border-destructive/20 bg-destructive/5">
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-destructive"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-destructive">Initialization Failed</h2>
            <p className="text-destructive">{error.message}</p>
          </div>
          
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              The application failed to start. This might be a temporary issue. Please try refreshing the page.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 16h5v5" />
                </svg>
                Refresh Page
              </button>
              
              <a
                href="mailto:support@oceanstride.com"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Contact Support
              </a>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border/40 mt-4">
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">Technical Details</summary>
              <pre className="mt-2 p-2 bg-muted/50 rounded-md overflow-auto text-left">
                {error.stack || 'No stack trace available'}
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Main application
  return (
    <StrictMode>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center space-y-4">
              <LoadingSpinner className="h-12 w-12 text-primary" />
              <p className="text-muted-foreground">Loading application...</p>
            </div>
          </div>
        }
      >
        <App />
      </Suspense>
    </StrictMode>
  );
}

// Create root and render the app
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

const root = createRoot(rootElement);
root.render(<Root />);

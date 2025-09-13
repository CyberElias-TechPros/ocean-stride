import { v4 as uuidv4 } from 'uuid';
import { ApiError } from './api';
import { toast } from '@/components/notifications';

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Log entry interface
interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error | ApiError;
  stack?: string;
  sessionId?: string;
  userId?: string | null;
  pathname?: string;
}

// Logger configuration
interface LoggerConfig {
  environment: 'development' | 'production' | 'test';
  appName: string;
  appVersion: string;
  enableConsoleLogs: boolean;
  enablePersistentLogs: boolean;
  maxLogs: number;
  logToServer: boolean;
  serverEndpoint?: string;
}

// Default configuration
const defaultConfig: LoggerConfig = {
  environment: process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development',
  appName: 'OceanStride',
  appVersion: process.env.REACT_APP_VERSION || '1.0.0',
  enableConsoleLogs: true,
  enablePersistentLogs: true,
  maxLogs: 1000,
  logToServer: process.env.NODE_ENV === 'production',
  serverEndpoint: '/api/logs',
};

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private sessionId: string;
  private userId: string | null = null;
  private isInitialized = false;
  private queue: (() => Promise<void>)[] = [];
  private isProcessingQueue = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  // Initialize the logger
  private initialize() {
    if (this.isInitialized) return;

    // Load logs from localStorage if persistent logging is enabled
    if (this.config.enablePersistentLogs) {
      this.loadLogs();
    }

    // Set up global error handlers
    if (typeof window !== 'undefined') {
      // Window error handler
      window.onerror = (message, source, lineno, colno, error) => {
        this.captureException(
          error || new Error(message as string),
          {
            source,
            lineno,
            colno,
          },
          LogLevel.ERROR
        );
        return false; // Let the default handler run as well
      };

      // Unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason || new Error('Unhandled promise rejection');
        this.captureException(error, {}, LogLevel.ERROR);
      });
    }

    this.isInitialized = true;
    this.info('Logger initialized', { environment: this.config.environment });
  }

  // Generate a unique session ID
  private generateSessionId(): string {
    return `sess_${uuidv4()}`;
  }

  // Set the current user ID for logging
  public setUserId(userId: string | null) {
    this.userId = userId;
  }

  // Create a log entry
  private createLogEntry(
    level: LogLevel,
    message: string,
    context: Record<string, any> = {},
    error?: Error | ApiError
  ): LogEntry {
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      stack: this.getStack(),
      sessionId: this.sessionId,
      userId: this.userId,
      pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
    };

    return entry;
  }

  // Get the current call stack
  private getStack(): string | undefined {
    try {
      const error = new Error();
      return error.stack;
    } catch (e) {
      return undefined;
    }
  }

  // Add a log entry to the queue
  private addToQueue(entry: LogEntry) {
    this.logs.unshift(entry);

    // Trim logs if we've exceeded the maximum
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(0, this.config.maxLogs);
    }

    // Process the queue
    this.processQueue();
  }

  // Process the log queue
  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Error processing log queue:', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  // Save logs to localStorage
  private saveLogs() {
    if (!this.config.enablePersistentLogs) return;

    try {
      const logsToSave = this.logs.slice(0, this.config.maxLogs);
      localStorage.setItem(`${this.config.appName}_logs`, JSON.stringify(logsToSave));
      localStorage.setItem(`${this.config.appName}_lastSaved`, Date.now().toString());
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error);
    }
  }

  // Load logs from localStorage
  private loadLogs() {
    try {
      const savedLogs = localStorage.getItem(`${this.config.appName}_logs`);
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (error) {
      console.error('Failed to load logs from localStorage:', error);
    }
  }

  // Send logs to the server
  private async sendToServer(entry: LogEntry) {
    if (!this.config.logToServer || !this.config.serverEndpoint) return;

    try {
      const response = await fetch(this.config.serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error(`Failed to send logs to server: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send logs to server:', error);
    }
  }

  // Log a message
  private log(level: LogLevel, message: string, context: Record<string, any> = {}) {
    const entry = this.createLogEntry(level, message, context);

    // Add to console if enabled
    if (this.config.enableConsoleLogs) {
      const logMethod = console[level] || console.log;
      const logMessage = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}`;
      
      if (Object.keys(context).length > 0) {
        logMethod(logMessage, context);
      } else {
        logMethod(logMessage);
      }
    }

    // Add to logs
    this.addToQueue(entry);

    // Save logs
    if (this.config.enablePersistentLogs) {
      this.saveLogs();
    }

    // Send to server if configured
    if (this.config.logToServer) {
      this.queue.push(() => this.sendToServer(entry));
    }
  }

  // Log a debug message
  public debug(message: string, context: Record<string, any> = {}) {
    if (this.config.environment === 'production') return;
    this.log(LogLevel.DEBUG, message, context);
  }

  // Log an info message
  public info(message: string, context: Record<string, any> = {}) {
    this.log(LogLevel.INFO, message, context);
  }

  // Log a warning
  public warn(message: string, context: Record<string, any> = {}) {
    this.log(LogLevel.WARN, message, context);
  }

  // Log an error
  public error(message: string, context: Record<string, any> = {}, error?: Error | ApiError) {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    
    // Show error toast in development
    if (this.config.environment === 'development') {
      const errorMessage = error?.message || message;
      toast.error({
        title: 'Error',
        description: errorMessage,
      });
    }

    // Log to console
    if (this.config.enableConsoleLogs) {
      console.error(`[${entry.timestamp}] [ERROR] ${message}`, { context, error });
    }

    // Add to logs
    this.addToQueue(entry);

    // Save logs
    if (this.config.enablePersistentLogs) {
      this.saveLogs();
    }

    // Send to server if configured
    if (this.config.logToServer) {
      this.queue.push(() => this.sendToServer(entry));
    }
  }

  // Log a critical error
  public critical(message: string, context: Record<string, any> = {}, error?: Error | ApiError) {
    const entry = this.createLogEntry(LogLevel.CRITICAL, message, context, error);
    
    // Show error toast
    const errorMessage = error?.message || message;
    toast.error({
      title: 'Critical Error',
      description: errorMessage,
      duration: 10000, // 10 seconds
    });

    // Log to console
    if (this.config.enableConsoleLogs) {
      console.error(`[${entry.timestamp}] [CRITICAL] ${message}`, { context, error });
    }

    // Add to logs
    this.addToQueue(entry);

    // Save logs
    if (this.config.enablePersistentLogs) {
      this.saveLogs();
    }

    // Send to server if configured
    if (this.config.logToServer) {
      this.queue.push(() => this.sendToServer(entry));
    }
  }

  // Capture an exception
  public captureException(
    error: Error | ApiError | unknown,
    context: Record<string, any> = {},
    level: LogLevel = LogLevel.ERROR
  ) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const message = errorObj.message || 'Unknown error occurred';
    
    if (level === LogLevel.ERROR) {
      this.error(message, context, errorObj);
    } else if (level === LogLevel.CRITICAL) {
      this.critical(message, context, errorObj);
    } else {
      this.log(level, message, { ...context, error: errorObj });
    }
  }

  // Get all logs
  public getLogs(limit?: number): LogEntry[] {
    return limit ? this.logs.slice(0, limit) : [...this.logs];
  }

  // Clear all logs
  public clearLogs() {
    this.logs = [];
    
    if (this.config.enablePersistentLogs) {
      try {
        localStorage.removeItem(`${this.config.appName}_logs`);
        localStorage.removeItem(`${this.config.appName}_lastSaved`);
      } catch (error) {
        console.error('Failed to clear logs from localStorage:', error);
      }
    }
  }
}

// Create a singleton instance
export const logger = new Logger();

// Export a hook for React components
export const useLogger = () => {
  return logger;
};

// Export a higher-order component for class components
export const withLogger = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string = Component.displayName || Component.name
) => {
  return (props: P) => {
    const logger = useLogger();
    
    // Log component mount/unmount
    React.useEffect(() => {
      logger.debug(`Component mounted: ${componentName}`);
      return () => {
        logger.debug(`Component unmounted: ${componentName}`);
      };
    }, [logger]);
    
    return <Component {...props} logger={logger} />;
  };
};

export default logger;

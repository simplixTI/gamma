// Retry utility for critical operations

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts, delayMs, backoffMultiplier } = { ...DEFAULT_OPTIONS, ...options };
  const { onRetry } = options;

  let lastError: Error | null = null;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxAttempts) {
        onRetry?.(attempt, lastError);
        await sleep(currentDelay);
        currentDelay *= backoffMultiplier;
      }
    }
  }

  throw lastError;
}

// Friendly error messages for common errors
export const getFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      return 'Erro de conexão. Verifique sua internet e tente novamente.';
    }

    // Supabase specific errors
    if (message.includes('jwt') || message.includes('token')) {
      return 'Sua sessão expirou. Por favor, faça login novamente.';
    }

    if (message.includes('duplicate') || message.includes('unique')) {
      return 'Este registro já existe.';
    }

    if (message.includes('permission') || message.includes('policy')) {
      return 'Você não tem permissão para realizar esta ação.';
    }

    if (message.includes('not found') || message.includes('404')) {
      return 'O recurso solicitado não foi encontrado.';
    }

    if (message.includes('timeout')) {
      return 'A operação demorou muito. Tente novamente.';
    }
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
};

// Wrapper for database operations with retry and friendly errors
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await retryOperation(operation, {
      ...options,
      onRetry: (attempt, error) => {
        console.log(`[RetryOperation] Attempt ${attempt} failed:`, error.message);
        options.onRetry?.(attempt, error);
      },
    });
    return { data, error: null };
  } catch (error) {
    console.error('[SafeDbOperation] All attempts failed:', error);
    return { data: null, error: getFriendlyErrorMessage(error) };
  }
}

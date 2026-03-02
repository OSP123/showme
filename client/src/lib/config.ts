// Helper to access environment variables, making them easier to mock in tests
export function getEnv(key: string): string | undefined {
    return import.meta.env[key];
}

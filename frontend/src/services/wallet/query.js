import { withRetry } from '../supabaseHelpers';

export const runWalletRead = async (buildQuery) => withRetry(async () => {
    const result = await buildQuery();
    if (result?.error) throw result.error;
    return result;
});

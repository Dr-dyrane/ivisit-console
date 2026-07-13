import { getVerificationStats } from '../../../services/verificationService';

export const loadVerificationPageData = async () => getVerificationStats();

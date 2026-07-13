import { getWalletContextData } from '../../../services/walletService';

export const loadWalletPageData = async ({ profile, isAdmin }) => getWalletContextData({
  profile,
  isAdmin,
  ledgerLimit: 10,
});

export const createWalletFailureData = () => ({ wallet: null, ledger: [], projection: 0 });

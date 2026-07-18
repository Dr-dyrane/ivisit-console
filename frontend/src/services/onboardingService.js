import { supabase } from '../lib/supabase';

const DOCUMENT_BUCKET = 'documents';
const MAX_DOCUMENTS = 3;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
]);

const ERROR_COPY = {
  ACCOUNT_ALREADY_SCOPED: 'This account already belongs to an organization.',
  CONTACT_EMAIL_INVALID: 'Enter a valid organization email.',
  DOCUMENT_FILE_INVALID: 'Use PDF, JPG, or PNG files up to 10 MB each.',
  DOCUMENT_CLEANUP_FAILED: 'Registration did not finish, and uploaded documents could not be removed. Contact support before trying again.',
  DOCUMENT_METADATA_INVALID: 'One of the selected documents could not be prepared.',
  DOCUMENT_NOT_FOUND: 'One of the selected documents did not finish uploading.',
  DOCUMENTS_INVALID: `Choose no more than ${MAX_DOCUMENTS} documents.`,
  FACILITY_ALREADY_EXISTS: 'This facility is already listed. Ask its administrator or contact support.',
  FACILITY_ALREADY_OWNED: 'This facility already belongs to an organization. Ask its administrator to invite you.',
  FACILITY_CLAIM_ALREADY_ACTIVE: 'This facility already has an ownership review in progress.',
  FACILITY_SELECTION_CONFLICT: 'The selected facility changed. Search and select it again.',
  FACILITY_SELECTION_INVALID: 'Select a valid facility from the search results.',
  FACILITY_SELECTION_NOT_FOUND: 'That facility is no longer available to claim.',
  LOCATION_INCOMPLETE: 'Choose a complete location or remove it.',
  ORGANIZATION_ADDRESS_INVALID: 'Enter the organization address, city, and state.',
  ORGANIZATION_NAME_INVALID: 'Enter the organization name.',
  ORGANIZATION_TYPE_INVALID: 'Choose an organization type.',
  PROFILE_NOT_READY: 'Your account is still being prepared. Try again in a moment.',
  REGISTRATION_NOT_ELIGIBLE: 'This account cannot start a new organization registration.',
  REGISTRATION_NUMBER_EXISTS: 'That registration number is already in use.',
  TERMS_REQUIRED: 'Accept the terms before submitting.',
  WALLET_NOT_INITIALIZED: 'The organization was not fully prepared. Try again.',
};

const createOnboardingError = (code, fallback) => {
  const error = new Error(ERROR_COPY[code] || fallback || 'We could not complete registration. Try again.');
  error.code = code;
  return error;
};

const getErrorCode = (error) => {
  const message = String(error?.message || '');
  return Object.keys(ERROR_COPY).find((code) => message.includes(code)) || error?.code || 'ONBOARDING_FAILED';
};

const safeFileName = (file, userId) => {
  const extension = ALLOWED_DOCUMENT_TYPES.get(file.type);
  const randomId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `onboarding/${userId}/${randomId}.${extension}`;
};

const validateDocuments = (documents = []) => {
  if (!Array.isArray(documents) || documents.length > MAX_DOCUMENTS) {
    throw createOnboardingError('DOCUMENTS_INVALID');
  }

  documents.forEach(({ file }) => {
    if (!file || !ALLOWED_DOCUMENT_TYPES.has(file.type) || file.size < 1 || file.size > MAX_DOCUMENT_SIZE) {
      throw createOnboardingError('DOCUMENT_FILE_INVALID');
    }
  });
};

const removeUploadedDocuments = async (paths) => {
  if (!paths?.length) return;

  try {
    const { error } = await supabase.storage.from(DOCUMENT_BUCKET).remove(paths);
    if (error) throw error;
  } catch (cause) {
    const cleanupError = createOnboardingError('DOCUMENT_CLEANUP_FAILED');
    cleanupError.cause = cause;
    throw cleanupError;
  }
};

const uploadDocuments = async (documents, userId) => {
  validateDocuments(documents);
  const uploaded = [];

  try {
    for (const item of documents) {
      const storagePath = safeFileName(item.file, userId);
      const { error } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(storagePath, item.file, { cacheControl: '3600', upsert: false });

      if (error) throw error;
      uploaded.push({
        storagePath,
        documentType: item.documentType || 'other',
        originalName: item.file.name,
        mimeType: item.file.type,
        sizeBytes: item.file.size,
      });
    }

    return uploaded;
  } catch {
    await removeUploadedDocuments(uploaded.map((item) => item.storagePath));
    throw createOnboardingError('DOCUMENT_UPLOAD_FAILED', 'A document could not be uploaded. Check your connection and try again.');
  }
};

export const onboardingService = {
  async createAdminAccount(formData) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      return { success: true, accountReady: true, user: sessionData.session.user };
    }

    const email = String(formData.adminEmail || '').trim().toLowerCase();
    const fullName = String(formData.adminFullName || '').trim();
    const password = String(formData.adminPassword || '');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { full_name: fullName },
      },
    });

    if (error) {
      throw createOnboardingError(
        error.status === 429 ? 'ACCOUNT_RATE_LIMITED' : 'ACCOUNT_CREATE_FAILED',
        error.status === 429
          ? 'Please wait a moment before trying again.'
          : 'We could not create that account. Sign in if the email is already registered.'
      );
    }

    return {
      success: true,
      accountReady: Boolean(data?.session?.user),
      confirmationRequired: Boolean(data?.user && !data?.session),
      user: data?.user || null,
    };
  },

  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });

    if (error) {
      throw createOnboardingError('OAUTH_FAILED', 'Google sign-in is unavailable right now.');
    }
  },

  async searchFacilities(query) {
    const normalized = String(query || '').trim();
    if (normalized.length < 3) return [];

    const { data, error } = await supabase.functions.invoke('search-onboarding-facilities', {
      body: { query: normalized.slice(0, 80) },
    });

    if (error) {
      throw createOnboardingError('FACILITY_SEARCH_FAILED', 'We could not search facilities. Try again.');
    }

    return Array.isArray(data?.data) ? data.data : [];
  },

  async getIdentityProjection() {
    const { data, error } = await supabase.rpc('get_console_identity_projection');
    if (error) throw createOnboardingError('IDENTITY_REFRESH_FAILED', 'We could not refresh your access yet.');
    return data;
  },

  async submitOnboarding(formData) {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData?.session;
    if (sessionError || !session?.user) {
      throw createOnboardingError('AUTH_REQUIRED', 'Sign in again to finish registration.');
    }

    const uploadedDocuments = await uploadDocuments(formData.documents || [], session.user.id);

    const payload = {
      organizationType: formData.organizationType,
      organizationName: String(formData.organizationName || '').trim(),
      registrationNumber: String(formData.registrationNumber || '').trim() || null,
      contactEmail: String(formData.contactEmail || session.user.email || '').trim(),
      phone: String(formData.phone || '').trim() || null,
      address: String(formData.address || '').trim(),
      city: String(formData.city || '').trim(),
      state: String(formData.state || '').trim(),
      latitude: formData.location?.lat ?? null,
      longitude: formData.location?.lng ?? null,
      existingFacilityId: formData.organizationMode === 'existing'
        ? formData.existingFacilityId
        : null,
      claimNote: formData.organizationMode === 'existing'
        ? String(formData.claimNote || '').trim() || null
        : null,
      termsAccepted: formData.termsAccepted === true,
      documents: uploadedDocuments,
    };

    const { data, error } = await supabase.rpc('provision_console_organization', {
      p_payload: payload,
    });

    if (error) {
      await removeUploadedDocuments(uploadedDocuments.map((item) => item.storagePath));
      const code = getErrorCode(error);
      throw createOnboardingError(code);
    }

    if (!data?.success || data?.provisioningVerified !== true || !data?.organization?.id) {
      await removeUploadedDocuments(uploadedDocuments.map((item) => item.storagePath));
      throw createOnboardingError('PROVISIONING_UNVERIFIED', 'Registration finished without a complete access record. Contact support.');
    }

    return data;
  },
};

export const ONBOARDING_DOCUMENT_RULES = {
  maxDocuments: MAX_DOCUMENTS,
  maxDocumentSize: MAX_DOCUMENT_SIZE,
  acceptedTypes: [...ALLOWED_DOCUMENT_TYPES.keys()],
};

export default onboardingService;

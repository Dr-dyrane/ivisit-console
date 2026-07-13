import {
  discardUnpersistedProfileAvatar,
  uploadProfileAvatar,
} from './profilesService';

const mockFrom = jest.fn();
const mockStorageFrom = jest.fn();
const mockWithRetry = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    storage: {
      from: (...args) => mockStorageFrom(...args),
    },
  },
}));

jest.mock('./authService', () => ({
  getCurrentUser: jest.fn(),
  applyAuthFilter: jest.fn((query) => query),
}));

jest.mock('../lib/utils', () => ({
  isValidUUID: jest.fn(() => true),
}));

jest.mock('./supabaseHelpers', () => ({
  withRetry: (...args) => mockWithRetry(...args),
  withAudit: jest.fn((_action, _entity, operation) => operation()),
}));

const makeProfileQuery = (result) => {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
};

describe('profilesService avatar upload ownership', () => {
  let bucket;

  beforeEach(() => {
    jest.resetAllMocks();
    mockWithRetry.mockImplementation((operation) => operation());
    bucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn((path) => ({
        data: { publicUrl: `https://cdn.test/${path}` },
      })),
      remove: jest.fn().mockResolvedValue({ error: null }),
    };
    mockStorageFrom.mockReturnValue(bucket);
  });

  it('returns the exact owned object descriptor needed for guarded cleanup', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(12345);
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await expect(uploadProfileAvatar('user-1', file)).resolves.toEqual({
      bucket: 'images',
      path: 'user-1/12345.png',
      publicUrl: 'https://cdn.test/user-1/12345.png',
    });
    expect(bucket.upload).toHaveBeenCalledWith('user-1/12345.png', file);
    now.mockRestore();
  });

  it('never removes an upload that reflected profile truth already references', async () => {
    const upload = {
      bucket: 'images',
      path: 'user-1/12345.png',
      publicUrl: 'https://cdn.test/user-1/12345.png',
    };
    mockFrom.mockReturnValue(makeProfileQuery({
      data: { image_uri: upload.publicUrl, avatar_url: null },
      error: null,
    }));

    await expect(discardUnpersistedProfileAvatar('user-1', upload)).resolves.toEqual({
      removed: false,
      reason: 'persisted',
    });
    expect(bucket.remove).not.toHaveBeenCalled();
  });

  it('removes only the newly uploaded object when the profile still references its prior avatar', async () => {
    const upload = {
      bucket: 'images',
      path: 'user-1/12345.png',
      publicUrl: 'https://cdn.test/user-1/12345.png',
    };
    mockFrom.mockReturnValue(makeProfileQuery({
      data: { image_uri: 'https://cdn.test/user-1/persisted.png', avatar_url: null },
      error: null,
    }));

    await expect(discardUnpersistedProfileAvatar('user-1', upload)).resolves.toEqual({
      removed: true,
      reason: 'unpersisted',
    });
    expect(bucket.remove).toHaveBeenCalledWith([upload.path]);
  });

  it('fails closed before Storage access when an upload is outside the active user folder', async () => {
    await expect(discardUnpersistedProfileAvatar('user-1', {
      bucket: 'images',
      path: 'user-2/12345.png',
      publicUrl: 'https://cdn.test/user-2/12345.png',
    })).rejects.toThrow('Avatar cleanup scope is invalid');

    expect(mockFrom).not.toHaveBeenCalled();
    expect(bucket.remove).not.toHaveBeenCalled();
  });
});

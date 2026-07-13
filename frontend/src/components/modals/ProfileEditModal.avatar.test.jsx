import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ProfileEditModal } from './ProfileEditModal';

const mockUseAuth = jest.fn();
const mockHandleApiError = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../utils/errorHandler', () => ({
  handleApiError: (...args) => mockHandleApiError(...args),
}));

jest.mock('../../lib/avatarUtils', () => ({
  getAvatarUrl: (profile) => profile?.image_uri || profile?.avatar_url || '',
}));

jest.mock('../ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

jest.mock('../ui/input', () => ({
  Input: (props) => <input {...props} />,
}));

jest.mock('../ui/label', () => ({
  Label: ({ children, ...props }) => <label {...props}>{children}</label>,
}));

jest.mock('sonner', () => ({
  toast: {
    success: (...args) => mockToastSuccess(...args),
    error: (...args) => mockToastError(...args),
  },
}));

jest.mock('framer-motion', () => {
  const ActualReact = require('react');
  const MotionDiv = ActualReact.forwardRef(({
    animate: _animate,
    exit: _exit,
    initial: _initial,
    transition: _transition,
    ...props
  }, ref) => ActualReact.createElement('div', { ...props, ref }));

  return {
    AnimatePresence: ({ children }) => children,
    motion: { div: MotionDiv },
  };
});

const profile = {
  id: 'user-1',
  username: 'operator',
  phone: '+15550000000',
  image_uri: 'https://cdn.test/persisted-avatar.jpg',
};

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};

const selectFile = async (input, file) => {
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [file],
  });

  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

describe('ProfileEditModal avatar persistence', () => {
  let container;
  let root;
  let updateProfile;
  let uploadAvatar;
  let discardAvatarUpload;
  let onClose;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;

  beforeEach(async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    jest.resetAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    updateProfile = jest.fn().mockResolvedValue(profile);
    uploadAvatar = jest.fn();
    discardAvatarUpload = jest.fn().mockResolvedValue({ removed: true });
    onClose = jest.fn();
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:local-avatar-preview');
    URL.revokeObjectURL = jest.fn();

    mockUseAuth.mockReturnValue({
      user: { id: profile.id },
      profile,
      updateProfile,
      uploadAvatar,
      discardAvatarUpload,
    });

    await act(async () => {
      root.render(<ProfileEditModal isOpen onClose={onClose} />);
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('keeps selection local and revokes the preview when cancelled', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    await selectFile(container.querySelector('#avatar-upload'), file);

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(container.querySelector('img[alt="Profile"]').getAttribute('src'))
      .toBe('blob:local-avatar-preview');
    expect(uploadAvatar).not.toHaveBeenCalled();

    const cancelButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Cancel');
    await click(cancelButton);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-avatar-preview');
    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uploads only during Save and writes the returned durable URL', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const upload = {
      bucket: 'images',
      path: `${profile.id}/new-avatar.png`,
      publicUrl: 'https://cdn.test/new-avatar.png',
    };
    uploadAvatar.mockResolvedValue(upload);
    await selectFile(container.querySelector('#avatar-upload'), file);

    await act(async () => {
      container.querySelector('#profile-edit-form').dispatchEvent(new Event('submit', {
        bubbles: true,
        cancelable: true,
      }));
    });
    await flush();

    expect(uploadAvatar).toHaveBeenCalledWith(file);
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({
      image_uri: upload.publicUrl,
    }));
    expect(discardAvatarUpload).not.toHaveBeenCalled();
    expect(mockToastSuccess).toHaveBeenCalledWith('Profile updated successfully');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cleans a new upload and restores the persisted avatar when Save fails', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const upload = {
      bucket: 'images',
      path: `${profile.id}/failed-avatar.png`,
      publicUrl: 'https://cdn.test/failed-avatar.png',
    };
    const saveError = new Error('profile update failed');
    uploadAvatar.mockResolvedValue(upload);
    updateProfile.mockRejectedValue(saveError);
    await selectFile(container.querySelector('#avatar-upload'), file);

    await act(async () => {
      container.querySelector('#profile-edit-form').dispatchEvent(new Event('submit', {
        bubbles: true,
        cancelable: true,
      }));
    });
    await flush();

    expect(discardAvatarUpload).toHaveBeenCalledWith(upload);
    expect(mockHandleApiError).toHaveBeenCalledWith(saveError, 'update');
    expect(container.querySelector('img[alt="Profile"]').getAttribute('src'))
      .toBe(profile.image_uri);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-avatar-preview');
    expect(onClose).not.toHaveBeenCalled();
  });
});

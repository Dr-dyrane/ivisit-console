import { runVerificationAction } from './VerificationModal';

jest.mock('@/lib/utils', () => ({
  cn: (...classes) => classes.filter(Boolean).join(' '),
}), { virtual: true });

describe('VerificationModal approval result handling', () => {
  it('runs success effects only after a successful approval result', async () => {
    const onVerify = jest.fn().mockResolvedValue(true);
    const onSuccess = jest.fn();

    await expect(runVerificationAction({
      onVerify,
      providerId: 'provider-1',
      value: true,
      onSuccess,
    })).resolves.toBe(true);

    expect(onVerify).toHaveBeenCalledWith('provider-1', true);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not run success effects when approval returns false', async () => {
    const onVerify = jest.fn().mockResolvedValue(false);
    const onSuccess = jest.fn();

    await expect(runVerificationAction({
      onVerify,
      providerId: 'provider-2',
      value: true,
      onSuccess,
    })).resolves.toBe(false);

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not run success effects when approval rejects', async () => {
    const failure = new Error('approval failed');
    const onVerify = jest.fn().mockRejectedValue(failure);
    const onSuccess = jest.fn();

    await expect(runVerificationAction({
      onVerify,
      providerId: 'provider-3',
      value: true,
      onSuccess,
    })).rejects.toBe(failure);

    expect(onSuccess).not.toHaveBeenCalled();
  });
});

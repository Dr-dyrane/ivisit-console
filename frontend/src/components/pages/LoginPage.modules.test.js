import fs from 'fs';
import path from 'path';

const read = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Login page module ownership', () => {
  const facade = read('src/components/pages/LoginPage.jsx');
  const controller = read('src/components/pages/login/useLoginController.js');
  const steps = read('src/components/pages/login/LoginSteps.jsx');
  const primitives = read('src/components/pages/login/LoginPrimitives.jsx');

  it('keeps each production owner below the modularization threshold', () => {
    expect(facade.split(/\r?\n/).length).toBeLessThan(200);
    expect(controller.split(/\r?\n/).length).toBeLessThan(400);
    expect(steps.split(/\r?\n/).length).toBeLessThan(400);
    expect(primitives.split(/\r?\n/).length).toBeLessThan(100);
  });

  it('keeps auth sequencing in the controller and visual steps receiver-free', () => {
    expect(facade).toContain('useLoginController()');
    expect(facade).toContain('<EmailLoginStep');
    expect(facade).toContain('<PasswordLoginStep');
    expect(facade).toContain('<SecurityLoginStep');
    expect(controller).toContain('const submitLockRef = useRef(false);');
    expect(controller).toContain('const redirectLockRef = useRef(false);');
    expect(controller).toContain('supabase.auth.signInWithOAuth({');
    expect(controller.match(/resetPasswordForEmail/g)).toHaveLength(2);
    expect(controller).toContain('const result = await verifyMfa(code);');
    expect(steps).not.toContain('supabase');
    expect(steps).not.toContain('useAuth(');
  });

  it('preserves the route export contract', () => {
    expect(facade).toContain('export const LoginPage');
    expect(facade).toContain('export default LoginPage;');
  });
});

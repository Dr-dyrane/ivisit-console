import fs from 'fs';

describe('NotificationCenter quiet startup contract', () => {
  it('keeps shell notification fetches quiet and stale-safe', () => {
    const centerSource = fs.readFileSync('src/components/common/NotificationCenter.jsx', 'utf8');
    const serviceSource = fs.readFileSync('src/services/notificationService.js', 'utf8');

    expect(centerSource).toContain('const fetchSeqRef = useRef(0)');
    expect(centerSource).toContain('const NOTIFICATION_CACHE_MS = 60000');
    expect(centerSource).toContain('const notificationCacheByUserId = new Map()');
    expect(centerSource).toContain('async function readNotificationsForUser(userId, options = {})');
    expect(centerSource).toContain('const inFlightUserIdRef = useRef(null)');
    expect(centerSource).toContain('const lastFetchedUserIdRef = useRef(null)');
    expect(centerSource).toContain('inFlightUserIdRef.current === user.id || lastFetchedUserIdRef.current === user.id');
    expect(centerSource).toContain("getNotifications(userId, 30, null, { quiet: true })");
    expect(centerSource).toContain('readNotificationsForUser(user.id, options)');
    expect(centerSource).toContain('if (fetchSeq !== fetchSeqRef.current) return;');
    expect(centerSource).toContain('fetchNotifications({ force: true })');
    expect(centerSource).toContain('notification refresh should not break the shell');
    expect(serviceSource).toContain('export const getNotifications = async (userId, limit = 50, read = null, options = {})');
    expect(serviceSource).toContain('if (!options?.quiet) {');
  });

  it('keeps notifications as shared shell chrome with immediate feedback', () => {
    const centerSource = fs.readFileSync('src/components/common/NotificationCenter.jsx', 'utf8');
    const cardSource = fs.readFileSync('src/components/common/NotificationCard.jsx', 'utf8');
    const hardgateSource = fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

    expect(centerSource).toContain('<Sheet open={isOpen} onOpenChange={setIsOpen}>');
    expect(centerSource).toContain('<AnimatePresence>');
    expect(centerSource).toContain('className="absolute top-full right-0 mt-2 w-96 max-h-[600px] z-50 backdrop-blur-sm"');
    expect(centerSource).toContain("subscribeToNotifications(user.id, (newNotification) =>");
    expect(centerSource).toContain("window.addEventListener('notifications:changed', handleNotificationsChanged)");
    expect(centerSource).toContain("aria-label={isOpen ? 'Close notifications' : 'Open notifications'}");
    expect(centerSource).toContain('aria-expanded={isOpen}');
    expect(centerSource).toContain("aria-haspopup={isMobile ? 'dialog' : 'menu'}");
    expect(centerSource).toContain('const markNotificationsReadOptimistically = useCallback(async (notificationIds) =>');
    expect(centerSource).toContain('? { ...notification, read: true }');
    expect(centerSource).toContain('const results = await Promise.all(');
    expect(centerSource).toContain('const failedIds = results.filter(result => !result.ok).map(result => result.id);');
    expect(centerSource).toContain('? { ...notification, read: false }');
    expect(centerSource).toContain('const handleMarkAllRead = useCallback(() =>');
    expect(centerSource).toContain('onClick={handleMarkAllRead}');
    expect(centerSource).not.toContain("import { Card } from '../ui/card';");
    expect(centerSource).not.toContain('border-b');
    expect(centerSource).not.toContain('border-t');
    expect(centerSource).not.toContain('border-0');

    expect(cardSource).not.toContain("import { Card } from '../ui/card';");
    expect(cardSource).toContain('const signalConfig = {');
    expect(cardSource).toContain('shadow-[inset_4px_0_0_hsl(var(--success)/0.72)]');
    expect(cardSource).toContain('aria-label="Mark notification as read"');
    expect(cardSource).toContain('aria-label="Dismiss notification"');
    expect(cardSource).not.toContain('border-');
    expect(cardSource).not.toContain('variant="outline"');

    expect(hardgateSource).toContain('src/components/common/NotificationCenter.jsx');
    expect(hardgateSource).toContain('src/components/common/NotificationCard.jsx');
  });
});

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
    expect(centerSource).toContain("setLoadError('Notifications could not be refreshed. Try again.')");
    expect(centerSource).toContain('<NotificationLoadError onRetry={handleRetryNotifications} />');
    expect(centerSource).toContain('role="alert"');
    expect(centerSource).toContain('Notifications unavailable');
    expect(serviceSource).toContain('export const getNotifications = async (userId, limit = 50, read = null, options = {})');
    expect(serviceSource).toContain('if (!options?.quiet) {');
    expect(serviceSource).toMatch(/if \(!options\?\.quiet\) \{[\s\S]*?throw error;\s*\}\s*\};/);
  });

  it('keeps notifications as shared shell chrome with immediate feedback', () => {
    const centerSource = fs.readFileSync('src/components/common/NotificationCenter.jsx', 'utf8');
    const cardSource = fs.readFileSync('src/components/common/NotificationCard.jsx', 'utf8');
    const routeSource = fs.readFileSync('src/components/common/notificationRoutes.js', 'utf8');
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
    expect(centerSource).toContain('previousReadById.get(notification.id)');
    expect(centerSource).toContain('const handleMarkAllRead = useCallback(async () =>');
    expect(centerSource).toContain('setMarkingAll(true)');
    expect(centerSource).toContain('setMarkingAll(false)');
    expect(centerSource).toContain("setMutationError('Some notifications could not be marked as read. Try again.')");
    expect(centerSource).toContain("data-state={markingAll ? 'pending' : 'ready'}");
    expect(centerSource).toContain("markingAll ? 'Marking as read...' : unreadCount === 0 ? 'All caught up' : 'Mark all as read'");
    expect(centerSource).toContain('onClick={handleMarkAllRead}');
    expect(centerSource).not.toContain("import { Card } from '../ui/card';");
    expect(centerSource).not.toContain('border-b');
    expect(centerSource).not.toContain('border-t');
    expect(centerSource).not.toContain('border-0');

    expect(cardSource).not.toContain("import { Card } from '../ui/card';");
    expect(cardSource).toContain('const signalConfig = {');
    // Tone comes from the literal palette (emerald/sky/amber) + --destructive,
    // never the red-resolving semantic tokens, and never a drawn left accent bar.
    expect(cardSource).toContain('bg-emerald-500/15');
    expect(cardSource).not.toContain('inset_4px_0_0');
    expect(cardSource).toContain("destination ? `Open ${notification.title || 'notification'}`");
    expect(cardSource).toContain('aria-label="Dismiss notification"');
    expect(cardSource).toContain('resolveNotificationDestination(notification)');
    expect(centerSource).toContain('const navigate = useNavigate()');
    expect(centerSource).toContain('setIsOpen(false);');
    expect(centerSource).toContain('navigate(destination);');
    expect(routeSource).toContain("notification.action_type === 'deleted'");
    expect(routeSource).toContain("emergency_request: '/emergencies'");
    expect(routeSource).not.toContain("news: '/health-news'");
    expect(cardSource).not.toContain('border-');
    expect(cardSource).not.toContain('variant="outline"');

    expect(hardgateSource).toContain('src/components/common/NotificationCenter.jsx');
    expect(hardgateSource).toContain('src/components/common/NotificationCard.jsx');
  });
});

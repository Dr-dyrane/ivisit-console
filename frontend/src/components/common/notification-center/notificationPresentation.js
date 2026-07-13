const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dayLabel = (date, now) => {
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }
  return date.toLocaleDateString();
};

export function groupNotificationsByDay(notifications, now = new Date()) {
  const list = Array.isArray(notifications) ? notifications : [];
  const buckets = new Map();

  list.forEach((notification) => {
    const raw = notification.timestamp || notification.created_at;
    const date = raw ? new Date(raw) : null;
    const valid = date && !Number.isNaN(date.getTime());
    const key = valid ? startOfDay(date).getTime() : 0;

    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: valid ? dayLabel(date, now) : 'Earlier',
        ts: key,
        items: [],
      });
    }
    buckets.get(key).items.push({ notification, ts: valid ? date.getTime() : 0 });
  });

  return [...buckets.values()]
    .sort((a, b) => b.ts - a.ts)
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      items: bucket.items.sort((a, b) => b.ts - a.ts).map((entry) => entry.notification),
    }));
}

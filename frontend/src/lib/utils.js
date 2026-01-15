import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function getStatusColor(status) {
  const colors = {
    pending: 'bg-warning text-warning-foreground',
    accepted: 'bg-info text-info-foreground',
    arrived: 'bg-secondary text-secondary-foreground',
    in_progress: 'bg-primary text-primary-foreground',
    completed: 'bg-success text-success-foreground',
    cancelled: 'bg-muted text-muted-foreground',
  };
  return colors[status] || colors.pending;
}

// Timeout utility to prevent hanging operations
export function withTimeout(promise, timeoutMs = 5000, errorMessage = 'Operation timed out') {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

export function scrollbarHide() {
  return 'scrollbar-hide';
}

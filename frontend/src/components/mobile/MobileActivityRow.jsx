import React from 'react';

/**
 * MobileActivityRow
 * Compressed feed item for mobile activity
 */
export const MobileActivityRow = ({ icon: Icon, msg, time, color = 'hsl(var(--primary))' }) => (
    <div className="flex items-center gap-4 p-4 apple-glass border-0 transition-all duration-300 relative overflow-hidden mb-[1px] last:mb-0">
        <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
                background: `radial-gradient(circle at 30% 30%, ${color}15, ${color}05)`,
            }}
        >
            {Icon && <Icon size={14} className="opacity-70" style={{ color }} />}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium tracking-tight text-foreground/80 line-clamp-1 leading-tight mb-1">
                {msg}
            </p>
            <p className="text-[9px] text-muted-foreground font-semibold tracking-widest uppercase opacity-30">
                {time}
            </p>
        </div>
    </div>
);

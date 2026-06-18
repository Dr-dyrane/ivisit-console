import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';

export const NotificationCenter = () => {
    const notifications = [
        { id: 1, type: 'critical', title: 'New Emergency', message: 'Cardiac Arrest in Sector 4', times: '2m ago' },
        { id: 2, type: 'success', title: 'Verification Complete', message: 'User John Doe verified', times: '15m ago' },
        { id: 3, type: 'info', title: 'System Update', message: 'Maintenance scheduled for 2AM', times: '1h ago' },
        { id: 4, type: 'info', title: 'Shift Change', message: 'Night shift started', times: '4h ago' },
    ];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors group">
                    <Bell className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] p-0 border-0 bg-transparent shadow-none">
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="bg-background/80 backdrop-blur-xl  rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between p-4 border-b border-white/5">
                        <h3 className="font-semibold">Notifications</h3>
                        <span className="text-xs font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded-full">{notifications.length} New</span>
                    </div>
                    <ScrollArea className="h-[400px]">
                        <div className="p-2 space-y-1">
                            {notifications.map(n => (
                                <div key={n.id} className="relative group p-3 rounded-xl hover:bg-white/5 transition-colors flex gap-3">
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'critical' ? 'bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]' :
                                        n.type === 'success' ? 'bg-success' : 'bg-blue-500'
                                        }`} />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-sm font-medium">{n.title}</h4>
                                            <span className="text-[10px] text-muted-foreground">{n.times}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <div className="p-2 border-t border-white/5">
                        <button className="w-full py-2 text-xs font-normal text-muted-foreground hover:text-foreground transition-colors">
                            Mark all as read
                        </button>
                    </div>
                </motion.div>
            </PopoverContent>
        </Popover>
    );
};

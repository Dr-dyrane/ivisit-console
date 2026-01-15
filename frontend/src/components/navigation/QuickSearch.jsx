import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, Map, Users, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '../ui/dialog';

export const QuickSearch = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    // Mock Data
    const data = [
        { type: 'Page', title: 'Dashboard', path: '/', icon: Map },
        { type: 'Page', title: 'Analytics', path: '/analytics', icon: FileText },
        { type: 'Page', title: 'Map View', path: '/map', icon: Map },
        { type: 'Emergency', title: 'Critical - John Doe', path: '/emergencies/123', icon: AlertTriangle },
        { type: 'Emergency', title: 'High - Traffic Accident', path: '/emergencies/124', icon: AlertTriangle },
        { type: 'User', title: 'Dr. Smith', path: '/doctors/smith', icon: Users },
    ];

    const filtered = data.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (path) => {
        navigate(path);
        onClose();
        setQuery('');
    };

    useEffect(() => {
        const down = (e) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (isOpen) onClose();
                else {
                    // Parent handles opening usually, but this component is controlled.
                    // We assume parent toggles isOpen.
                }
            }
        }
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [isOpen, onClose]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="p-0 overflow-hidden bg-transparent border-0 shadow-2xl max-w-2xl">
                <div className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col">
                    <div className="flex items-center px-4 border-b border-white/5">
                        <Search className="w-5 h-5 text-muted-foreground mr-3" />
                        <input
                            className="flex-1 h-14 bg-transparent border-0 outline-none text-lg placeholder:text-muted-foreground/50"
                            placeholder="Search anything..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                <span className="text-xs">ESC</span>
                            </kbd>
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto p-2">
                        {filtered.length === 0 && (
                            <div className="py-12 text-center text-muted-foreground">
                                No results found.
                            </div>
                        )}
                        {filtered.map((item, i) => (
                            <button
                                key={i}
                                onClick={() => handleSelect(item.path)}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
                            >
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-foreground">{item.title}</h4>
                                    <span className="text-xs text-muted-foreground">{item.type}</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                            </button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

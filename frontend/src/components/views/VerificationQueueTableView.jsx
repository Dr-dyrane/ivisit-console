import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import {
    Eye,
    Trash2,
    CheckCircle,
    Clock,
    UserCheck,
    Mail,
    Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const VerificationQueueTableView = ({
    providers,
    onView,
    onDelete,
    getStatusBadge
}) => {
    if (!providers || providers.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-b border-white/10 hover:bg-transparent">
                            <TableHead className="w-[300px] text-[10px] font-black uppercase tracking-widest text-muted-foreground py-4 pl-6">Applicant</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Role</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Joined</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AnimatePresence mode="popLayout">
                            {providers.map((provider, index) => (
                                <motion.tr
                                    layout
                                    key={provider.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="group border-b border-white/5 transition-colors hover:bg-white/5"
                                >
                                    <TableCell className="py-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 squircle border-2 border-white/5 shadow-inner shrink-0">
                                                <AvatarImage src={getAvatarUrl(provider)} />
                                                <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">
                                                    {getAvatarFallback(provider)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-sm tracking-tight text-foreground">{provider.username || provider.full_name || 'Unknown'}</span>
                                                    {provider.bvn_verified && (
                                                        <CheckCircle className="h-3.5 w-3.5 text-primary fill-primary/10" />
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground line-clamp-1">{provider.email || 'No email provided'}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-white/10 text-foreground/70 bg-white/5">
                                            {provider.role || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span className="text-xs font-medium">
                                                {new Date(provider.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`geo-sharp border-0 px-2.5 py-1 ${getStatusBadge ? getStatusBadge(provider.verification_status) : 'bg-muted text-muted-foreground'}`}>
                                            {provider.verification_status || 'pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onView(provider)}
                                                className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => onDelete(provider)}
                                                    className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </Card>
        </motion.div>
    );
};

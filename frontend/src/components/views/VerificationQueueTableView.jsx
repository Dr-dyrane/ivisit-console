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
import { Checkbox } from '../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import {
    Eye,
    Trash2,
    CheckCircle,
    Clock,
    UserCheck,
    Mail,
    Calendar,
    X,
    MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const VerificationQueueTableView = ({
    providers,
    onView,
    onVerify,
    onDelete,
    getStatusBadge,
    selectedIds = [],
    onSelect,
    onSelectAll
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
                            <TableHead className="w-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-4">
                                <Checkbox
                                    checked={selectedIds.length === providers.length && providers.length > 0}
                                    onCheckedChange={(checked) => onSelectAll(checked)}
                                    aria-label="Select all"
                                />
                            </TableHead>
                            <TableHead className="w-[100px] text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-4">ID</TableHead>
                            <TableHead className="w-[300px] text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-4 pl-6">Applicant</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Joined</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-6">Actions</TableHead>
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
                                    <TableCell className="py-4">
                                        <Checkbox
                                            checked={selectedIds.includes(provider.id)}
                                            onCheckedChange={(checked) => onSelect(provider.id, checked)}
                                            aria-label={`Select ${provider.full_name || provider.name}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-mono text-[10px] font-bold text-primary/80">
                                        {provider.display_id || 'PRV-PENDING'}
                                    </TableCell>
                                    <TableCell className="py-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 squircle border-2 border-white/5 shadow-inner shrink-0">
                                                <AvatarImage src={getAvatarUrl(provider)} />
                                                <AvatarFallback className="font-bold bg-primary/10 text-primary text-xs">
                                                    {getAvatarFallback(provider)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-sm tracking-tight text-foreground">{provider.username || provider.full_name || 'Unknown'}</span>
                                                    {provider.bvn_verified && (
                                                        <CheckCircle className="h-3.5 w-3.5 text-primary fill-primary/10" />
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground line-clamp-1">{provider.email || 'No email provided'}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-white/10 text-foreground/70 bg-white/5">
                                            {provider.role || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span className="text-xs font-normal">
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
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Approve/Reject Buttons - Keep inline for verification workflow */}
                                            {onVerify && !provider.bvn_verified && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onVerify(provider.id, true)}
                                                        className="squircle h-8 w-8 p-0 hover:bg-success/20 text-success hover:text-success transition-colors"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onVerify(provider.id, false)}
                                                        className="squircle h-8 w-8 p-0 hover:bg-destructive/20 text-destructive hover:text-destructive transition-colors"
                                                        title="Reject"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}

                                            {/* More Options Dropdown */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 dark:hover:bg-white/10">
                                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                        <span className="sr-only">Open menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[160px] rounded-xl bg-background/70 backdrop-blur-xl border-white/10 shadow-premium">
                                                    <DropdownMenuItem onClick={() => onView(provider)} className="cursor-pointer font-medium text-xs py-2">
                                                        <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                                        View Details
                                                    </DropdownMenuItem>
                                                    {onDelete && (
                                                        <>
                                                            <DropdownMenuSeparator className="bg-white/5" />
                                                            <DropdownMenuItem onClick={() => onDelete(provider)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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

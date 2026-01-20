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
import {
    Eye,
    Trash2,
    CheckCircle,
    MoreVertical,
    Shield
} from 'lucide-react';
import { motion } from 'framer-motion';

export const InsuranceTableView = ({
    policies,
    onView,
    onDelete,
    onVerify,
    getStatusBadge
}) => {
    if (!policies || policies.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-b border-white/10 hover:bg-transparent">
                            <TableHead className="w-[300px] text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-4 pl-6">Policy Details</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Provider</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Coverage</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</TableHead>
                            <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {policies.map((policy, index) => (
                            <motion.tr
                                key={policy.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="group border-b border-white/5 transition-colors hover:bg-white/5"
                            >
                                <TableCell className="py-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 squircle bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm tracking-tight text-foreground">{policy.policy_holder_name}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{policy.policy_number}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-normal">{policy.provider_name}</span>
                                        <Badge variant="outline" className="w-fit mt-1 text-[10px] border-white/10 text-muted-foreground">
                                            {policy.policy_type}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="font-mono text-sm font-semibold text-foreground">
                                        ${policy.coverage_amount?.toLocaleString() || '0'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Badge className={`geo-sharp border-0 px-2.5 py-1 ${getStatusBadge(policy.status)}`}>
                                            {policy.status}
                                        </Badge>
                                        {policy.verified && (
                                            <div className="text-primary" title="Verified">
                                                <CheckCircle className="h-4 w-4 fill-primary/10" />
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        {onVerify && !policy.verified && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onVerify(policy)}
                                                className="squircle h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-success hover:text-success hover:bg-success/10"
                                            >
                                                Verify
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onView(policy)}
                                            className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {onDelete && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDelete(policy)}
                                                className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </motion.tr>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </motion.div>
    );
};

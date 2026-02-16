import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Building2, Plus, BarChart3, Shield, CheckCircle2, Activity, TrendingUp, Globe, Briefcase } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrganizations } from '../../services/organizationsService';

export const OrganizationsPanel = () => {
    const { isAdmin } = useAuth();
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        pending: 0,
        verified: 0
    });
    const [recentOrgs, setRecentOrgs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrgData = async () => {
            try {
                setLoading(true);
                const orgs = await getOrganizations();

                setStats({
                    total: orgs.length,
                    active: orgs.filter(o => o.status === 'active').length,
                    pending: orgs.filter(o => o.status === 'pending').length,
                    verified: orgs.filter(o => o.verified).length
                });

                setRecentOrgs(orgs.slice(0, 5));
            } catch (error) {
                console.error("Failed to fetch organization panel stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrgData();
    }, []);

    const onAddOrg = () => {
        window.dispatchEvent(new CustomEvent('openOrganizationModal'));
    };

    const onViewReports = () => {
        window.dispatchEvent(new CustomEvent('openReportsModal'));
    };

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Network Health
                </h3>

                <div className="grid grid-cols-2 gap-3">
                    <Card className="p-4 bg-background/50 backdrop-blur-sm border-0">
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-sm font-normal text-muted-foreground">Total</span>
                        </div>
                        <div className="text-2xl font-semibold">{stats.total}</div>
                    </Card>

                    <Card className="p-4 bg-background/50 backdrop-blur-sm border-0">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span className="text-sm font-normal text-muted-foreground">Verified</span>
                        </div>
                        <div className="text-2xl font-semibold text-success">{stats.verified}</div>
                    </Card>
                </div>
            </div>

            {/* System Status */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Operational Status
                </h3>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-success" />
                            <span className="text-sm font-normal">Active Partners</span>
                        </div>
                        <Badge className="bg-success/20 text-success border-0 text-sm font-semibold">
                            {stats.active}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                        <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-warning" />
                            <span className="text-sm font-normal">Pending Review</span>
                        </div>
                        <Badge className="bg-warning/20 text-warning border-0 text-sm font-semibold">
                            {stats.pending}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Management
                </h3>

                <div className="space-y-2">
                    {isAdmin() && (
                        <Button
                            onClick={onAddOrg}
                            className="w-full justify-start h-10 bg-muted/20 hover:bg-muted/30 border border-border/20 text-[10px] font-bold tracking-widest uppercase text-foreground"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            ADD ORGANIZATION
                        </Button>
                    )}

                    <Button
                        onClick={onViewReports}
                        className="w-full justify-start h-10 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-[10px] font-bold tracking-widest uppercase text-primary"
                    >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        REVENUE REPORTS
                    </Button>
                </div>
            </div>

            {/* Recent Partners */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-info" />
                    Recent Partners
                </h3>

                <div className="space-y-3">
                    {loading ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
                    ) : recentOrgs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No organizations found</p>
                    ) : (
                        recentOrgs.map((org) => (
                            <div
                                key={org.id}
                                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer"
                            >
                                <div className="w-8 h-8 rounded-full bg-primary/10 border border-border/20 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-semibold text-primary">
                                        {org.name?.[0]?.toUpperCase()}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-normal truncate">{org.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{org.type || 'Standard partner'}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

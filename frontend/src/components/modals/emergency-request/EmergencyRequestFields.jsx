import React from 'react';
import { Activity, MapPin, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import {
  normalizeServiceType,
  requestFieldClassName,
  requestSelectContentClassName,
} from './requestModel';

const GlassCard = ({ children, title, icon, className }) => (
  <div className={`rounded-card bg-foreground/[0.05] p-4 dark:bg-white/[0.07] ${className}`}>
    <div className="flex items-center gap-3 mb-4">
      <div className="rounded-icon bg-foreground/[0.06] p-1.5 dark:bg-white/[0.08]">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="text-[13px] font-semibold text-muted-foreground">{title}</h3>
    </div>
    {children}
  </div>
);

export const EmergencyRequestFields = ({ controller }) => {
  const {
    facilities,
    facilitiesError,
    facilitiesLoading,
    facilitiesPartial,
    facilityRequired,
    formData,
    handleChange,
    isView,
    selectedUser,
    setFormData,
    showFacilityControl,
    users,
    usersError,
    usersLoading,
    usersPartial,
  } = controller;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-6">
        <GlassCard icon={<User className="text-primary" />} title="Requester">
          <div className="space-y-4">
            {!isView ? (
              <>
                <Select
                  value={formData.user_id}
                  onValueChange={(value) => setFormData((previous) => ({ ...previous, user_id: value }))}
                  disabled={usersLoading || Boolean(usersError)}
                >
                  <SelectTrigger className={requestFieldClassName}>
                    <SelectValue placeholder={usersLoading ? 'Loading patients...' : 'Select patient'} />
                  </SelectTrigger>
                  <SelectContent className={requestSelectContentClassName}>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{user.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <span>{user.username}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {usersError && (
                  <p className="text-xs font-medium text-destructive">{usersError}</p>
                )}
                {!usersLoading && !usersError && users.length === 0 && (
                  <p className="text-xs text-muted-foreground">No patients are available in your current scope.</p>
                )}
                {usersPartial && (
                  <p className="text-xs text-muted-foreground">Showing the first 100 patients in your current scope.</p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-4 p-2">
                <Avatar className="h-12 w-12 rounded-icon">
                  <AvatarImage src={selectedUser?.avatar_url} />
                  <AvatarFallback>{selectedUser?.username?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUser?.username || 'Unknown User'}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser?.phone || 'No phone'}</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard icon={<MapPin className="text-green-500" />} title="Location">
          <div className="space-y-4">
            <Input
              value={formData.location || ''}
              onChange={handleChange}
              name="location"
              disabled={isView}
              placeholder="Location address..."
              className={requestFieldClassName}
            />
            {showFacilityControl && (
              <div className="space-y-1.5">
                <Label className="ml-1 text-[10px] uppercase tracking-widest opacity-50">
                  Facility{facilityRequired ? ' (required)' : ''}
                </Label>
                <Select
                  value={formData.hospital_id || ''}
                  onValueChange={(value) => {
                    const facility = facilities.find((item) => item.id === value);
                    setFormData((previous) => ({
                      ...previous,
                      hospital_id: value,
                      hospital_name: facility?.name || '',
                    }));
                  }}
                  disabled={facilitiesLoading || Boolean(facilitiesError)}
                >
                  <SelectTrigger className={requestFieldClassName}>
                    <SelectValue placeholder={facilitiesLoading ? 'Loading facilities...' : 'Select facility'} />
                  </SelectTrigger>
                  <SelectContent className={requestSelectContentClassName}>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {facilitiesError && (
                  <p className="text-xs font-medium text-destructive">{facilitiesError}</p>
                )}
                {!facilitiesLoading && !facilitiesError && facilities.length === 0 && (
                  <p className="text-xs text-muted-foreground">No facilities are available in your current scope.</p>
                )}
                {facilitiesPartial && (
                  <p className="text-xs text-muted-foreground">Showing the first 100 facilities in your current scope.</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                name="latitude"
                value={formData.latitude ?? ''}
                onChange={handleChange}
                disabled={isView}
                min="-90"
                max="90"
                step="any"
                placeholder="Lat"
                className={`${requestFieldClassName} font-mono text-xs`}
              />
              <Input
                type="number"
                name="longitude"
                value={formData.longitude ?? ''}
                onChange={handleChange}
                disabled={isView}
                min="-180"
                max="180"
                step="any"
                placeholder="Lng"
                className={`${requestFieldClassName} font-mono text-xs`}
              />
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="space-y-6">
        <GlassCard icon={<Activity className="text-orange-500" />} title="Incident Details">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Service</Label>
                <Select
                  value={normalizeServiceType(formData.service_type)}
                  onValueChange={(value) => setFormData((previous) => ({ ...previous, service_type: value }))}
                  disabled={isView}
                >
                  <SelectTrigger className={requestFieldClassName}>
                    <SelectValue placeholder="Service" />
                  </SelectTrigger>
                  <SelectContent className={requestSelectContentClassName}>
                    <SelectItem value="ambulance">Ambulance</SelectItem>
                    <SelectItem value="bed">Bed</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData((previous) => ({ ...previous, priority: value }))}
                  disabled={isView}
                >
                  <SelectTrigger className={requestFieldClassName}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className={requestSelectContentClassName}>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Incident</Label>
              <Select
                value={formData.emergency_type}
                onValueChange={(value) => setFormData((previous) => ({ ...previous, emergency_type: value }))}
                disabled={isView}
              >
                <SelectTrigger className={requestFieldClassName}>
                  <SelectValue placeholder="Select incident" />
                </SelectTrigger>
                <SelectContent className={requestSelectContentClassName}>
                  <SelectItem value="cardiac">Cardiac</SelectItem>
                  <SelectItem value="accident">Accident</SelectItem>
                  <SelectItem value="respiratory">Respiratory</SelectItem>
                  <SelectItem value="stroke">Stroke</SelectItem>
                  <SelectItem value="pregnancy">Pregnancy</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Description</Label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isView}
                placeholder="Detailed situation report..."
                className={`${requestFieldClassName} min-h-[100px] resize-none`}
              />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

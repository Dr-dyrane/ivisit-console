import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Hospital, MapPin, Phone } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import {
  HOSPITAL_FIELD_CLASS,
  HOSPITAL_SELECT_CONTENT_CLASS,
} from './hospitalModalModel';
import { HospitalSection, ReadOnlyChips, ReadOnlyField } from './HospitalModalPrimitives';

export const HospitalFacilityDetailsSection = ({
  formData,
  handleChange,
  isView,
  setFormData,
}) => (
  <HospitalSection icon={<Activity />} title="Facility Details">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="col-span-1 space-y-2 md:col-span-2">
        <Label htmlFor="name" className="px-1 text-xs font-semibold uppercase text-muted-foreground">Hospital Name</Label>
        {isView ? (
          <ReadOnlyField value={formData.name} icon={<Hospital className="h-4 w-4" />} />
        ) : (
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`${HOSPITAL_FIELD_CLASS} h-11 text-base font-semibold md:h-12 md:text-lg`}
            placeholder="General Hospital..."
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="type" className="px-1 text-xs font-semibold uppercase text-muted-foreground">Tier</Label>
        {isView ? (
          <ReadOnlyField value={formData.type} />
        ) : (
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData((current) => ({ ...current, type: value }))}
          >
            <SelectTrigger id="type" className={`${HOSPITAL_FIELD_CLASS} h-12 font-normal`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={HOSPITAL_SELECT_CONTENT_CLASS}>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergency_level" className="px-1 text-xs font-semibold uppercase text-muted-foreground">Trauma Level</Label>
        {isView ? (
          <ReadOnlyField value={formData.emergency_level} />
        ) : (
          <Input
            id="emergency_level"
            name="emergency_level"
            value={formData.emergency_level}
            onChange={handleChange}
            className={`${HOSPITAL_FIELD_CLASS} h-12 font-normal`}
            placeholder="Level 1 Trauma..."
          />
        )}
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="price_range" className="px-1 text-xs font-semibold uppercase text-muted-foreground">Price Range</Label>
      {isView ? (
        <ReadOnlyField value={formData.price_range} />
      ) : (
        <Input
          id="price_range"
          name="price_range"
          value={formData.price_range}
          onChange={handleChange}
          className={`${HOSPITAL_FIELD_CLASS} font-normal`}
          placeholder="e.g. $150"
        />
      )}
    </div>

    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="specialties" className="px-1 text-xs font-semibold uppercase text-muted-foreground">
          {isView ? 'Specialties' : 'Specialties (comma separated)'}
        </Label>
        {isView ? (
          <ReadOnlyField value={formData.specialties} multiline />
        ) : (
          <Input
            id="specialties"
            name="specialties"
            value={Array.isArray(formData.specialties) ? formData.specialties.join(', ') : formData.specialties || ''}
            onChange={(event) => setFormData((current) => ({
              ...current,
              specialties: event.target.value.split(',').map((value) => value.trim()),
            }))}
            className={`${HOSPITAL_FIELD_CLASS} font-normal`}
            placeholder="General Care, Surgery..."
          />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="features" className="px-1 text-xs font-semibold uppercase text-muted-foreground">
          {isView ? 'Features' : 'Features (comma separated)'}
        </Label>
        {isView ? (
          <ReadOnlyField value={formData.features} multiline />
        ) : (
          <Input
            id="features"
            name="features"
            value={Array.isArray(formData.features) ? formData.features.join(', ') : formData.features || ''}
            onChange={(event) => setFormData((current) => ({
              ...current,
              features: event.target.value.split(',').map((value) => value.trim()),
            }))}
            className={`${HOSPITAL_FIELD_CLASS} font-normal`}
            placeholder="Lab, Helipad..."
          />
        )}
      </div>
    </div>

    {/* ADOPT-37: service_types is fetched (select *) but was never rendered.
        Read-only chips in view mode; no edit surface, the write is untouched. */}
    {isView && (
      <div className="mt-4 space-y-2">
        <Label className="px-1 text-xs font-semibold uppercase text-muted-foreground">Service Types</Label>
        <ReadOnlyChips values={formData.service_types} />
      </div>
    )}
  </HospitalSection>
);

export const HospitalLocationSection = ({ formData, handleChange, isView, setFormData }) => (
  <HospitalSection icon={<MapPin />} title="Location & Contact">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="col-span-1 space-y-2 md:col-span-2">
        <Label htmlFor="address" className="px-1 text-xs font-semibold uppercase text-muted-foreground">Address</Label>
        {isView ? (
          <ReadOnlyField value={formData.address} icon={<MapPin className="h-4 w-4" />} multiline />
        ) : (
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={`${HOSPITAL_FIELD_CLASS} min-h-[80px] resize-none pl-10 pt-3 font-normal`}
            />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone" className="px-1 text-xs font-semibold uppercase text-muted-foreground">Phone</Label>
        {isView ? (
          <ReadOnlyField value={formData.phone} icon={<Phone className="h-4 w-4" />} />
        ) : (
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`${HOSPITAL_FIELD_CLASS} h-12 pl-10 font-mono`}
            />
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="status" className="px-1 text-xs font-semibold uppercase text-muted-foreground">Operational Status</Label>
        {isView ? (
          <ReadOnlyField value={formData.status} />
        ) : (
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData((current) => ({ ...current, status: value }))}
          >
            <SelectTrigger id="status" className={`${HOSPITAL_FIELD_CLASS} h-12 font-normal`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={HOSPITAL_SELECT_CONTENT_CLASS}>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  </HospitalSection>
);

export const HospitalSystemSection = ({
  canManageVerification,
  formData,
  handleChange,
  hospital,
  isView,
  setShowImage,
  showImage,
}) => (
  <HospitalSection icon={<Activity />} title="System & Verification">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {isView || !canManageVerification ? (
        <ReadOnlyField
          value={formData.verified ? 'Verified partner' : 'Not verified'}
          subtext={canManageVerification
            ? 'Trusted medical facility flag'
            : 'Verification is managed by platform administrators'}
        />
      ) : (
        <div className="flex items-center gap-3 rounded-inner bg-white/5 p-4 shadow-[0_12px_28px_rgb(0_0_0/0.05)]">
          <input
            type="checkbox"
            id="verified"
            name="verified"
            checked={formData.verified}
            onChange={handleChange}
            className="h-5 w-5 rounded-icon accent-primary"
          />
          <Label htmlFor="verified" className="cursor-pointer text-sm font-medium">
            Verified Partner
            <p className="text-[10px] font-normal text-muted-foreground">Mark as a trusted medical facility</p>
          </Label>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="image" className="px-1 text-xs font-semibold uppercase text-muted-foreground">Hospital Image</Label>
          {formData.image && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowImage(!showImage)}
              className="h-5 px-2 text-[10px] text-primary hover:bg-primary/10 hover:text-primary/90"
            >
              {showImage ? 'Hide Preview' : 'View Image'}
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showImage && formData.image && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="relative overflow-hidden rounded-icon bg-black/20"
            >
              <img
                src={formData.image}
                alt="Hospital Preview"
                className="h-48 w-full object-cover"
                onError={(event) => { event.target.style.display = 'none'; }}
              />
              {hospital?.image_attribution_text && (
                <p className="absolute bottom-0 left-0 right-0 bg-black/55 px-2 py-1 text-[10px] leading-4 text-white/90">
                  Photo: {String(hospital.image_attribution_text).replace(/<[^>]*>/g, '')}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isView ? (
          <div className="flex gap-2">
            <Input
              id="image"
              name="image"
              value={formData.image || ''}
              onChange={handleChange}
              className={`${HOSPITAL_FIELD_CLASS} flex-1 font-normal`}
              placeholder="https://..."
            />
          </div>
        ) : (
          !formData.image && <p className="px-1 text-sm italic text-muted-foreground">No image available</p>
        )}
      </div>
    </div>
  </HospitalSection>
);

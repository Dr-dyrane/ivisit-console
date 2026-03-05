"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { X, Hospital, MapPin, Phone, Bed, Ambulance, Star, Clock, Activity, User, UserCheck, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';

import { uploadImage } from '../../services/storageService';
import { Loader2, Upload } from 'lucide-react';
import hospitalImportService from '../../services/hospitalImportService';
import { useEffect, useRef } from 'react';
import { bedManagementService } from '../../services/bedManagementService';

const DEFAULT_HOSPITAL_FORM = {
  name: '',
  address: '',
  phone: '',
  rating: 4.5,
  type: 'premium',
  image: '',
  specialties: [],
  service_types: [],
  features: [],
  emergency_level: 'Level 1',
  available_beds: 0,
  total_beds: 0,
  ambulances_count: 0,
  wait_time: '',
  price_range: '',
  latitude: null,
  longitude: null,
  place_id: null,
  verified: false,
  verification_status: 'pending',
  status: 'available'
};

const toTextArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toIntOrZero = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

const buildInitialFormData = (hospital) => {
  if (!hospital) return { ...DEFAULT_HOSPITAL_FORM };
  return {
    ...DEFAULT_HOSPITAL_FORM,
    ...hospital,
    specialties: toTextArray(hospital.specialties),
    service_types: toTextArray(hospital.service_types),
    features: toTextArray(hospital.features),
    rating: Number.isFinite(Number(hospital.rating)) ? Number(hospital.rating) : DEFAULT_HOSPITAL_FORM.rating,
    available_beds: toIntOrZero(hospital.available_beds),
    total_beds: toIntOrZero(hospital.total_beds),
    ambulances_count: toIntOrZero(hospital.ambulances_count),
    latitude: toNumberOrNull(hospital.latitude),
    longitude: toNumberOrNull(hospital.longitude),
    place_id: hospital.place_id || null,
  };
};

export const HospitalModal = ({ isOpen, onClose, hospital, mode, onSave }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState(() => buildInitialFormData(hospital));

  const [activeReservations, setActiveReservations] = useState([]);
  const [bedUtilization, setBedUtilization] = useState(null);
  const [loadingReservations, setLoadingReservations] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    setFormData(buildInitialFormData(hospital));
  }, [hospital, mode, isOpen]);

  const totalBeds = toIntOrZero(formData.total_beds);
  const availableBeds = toIntOrZero(formData.available_beds);
  const reservedBedsDisplay = isView && bedUtilization
    ? toIntOrZero(bedUtilization.reserved_beds)
    : Math.max(0, totalBeds - availableBeds);
  const bedUtilizationPercent = totalBeds > 0
    ? Math.min(Math.round(((totalBeds - availableBeds) / totalBeds) * 100), 100)
    : 0;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const publicUrl = await uploadImage(file, 'hospitals');
      setFormData(prev => ({
        ...prev,
        image: publicUrl
      }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      handleApiError(error, 'create');
    } finally {
      setUploading(false);
    }
  };

  const handleGoogleSearch = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setSearchLoading(true);
      // Call the real edge function for Google Places search
      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/discover-hospitals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          query: query,
          mode: 'text_search',
          limit: 5
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.hospitals || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Google search error:', error);
      handleApiError(error, 'fetch');
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search handler
  const handleSearchChange = (e) => {
    const query = e.target.value;
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      handleGoogleSearch(query);
    }, 300);
  };

  // Click outside handler for search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [showSearchResults]);

  // Keep mobile bottom bar from overlapping the modal layer.
  useEffect(() => {
    const bottomBar = document.getElementById('dynamic-bottom-bar');
    if (!bottomBar) return undefined;

    const previousDisplay = bottomBar.style.display;
    if (isOpen) {
      bottomBar.style.display = 'none';
    }

    return () => {
      bottomBar.style.display = previousDisplay;
    };
  }, [isOpen]);

  // Load bed reservations and utilization when modal opens
  useEffect(() => {
    if (isOpen && hospital && isView) {
      loadBedData();
      
      // Set up real-time subscription
      const unsubscribe = bedManagementService.subscribeToReservations(
        hospital.id,
        () => loadBedData() // Refresh data when changes occur
      );
      
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [isOpen, hospital, isView]);

  const loadBedData = async () => {
    if (!hospital?.id) return;
    
    try {
      setLoadingReservations(true);
      
      // Load active reservations
      const reservations = await bedManagementService.getActiveReservations(hospital.id);
      setActiveReservations(reservations);
      
      // Load bed utilization stats
      const utilization = await bedManagementService.getBedUtilization(hospital.id);
      setBedUtilization(utilization);
      
    } catch (error) {
      console.error('Error loading bed data:', error);
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleSelectHospital = (hospital) => {
    setFormData(prev => ({
      ...prev,
      name: hospital.name,
      address: hospital.address,
      phone: hospital.phone,
      rating: hospital.rating || 4.0,
      type: hospital.types?.includes('hospital') ? 'premium' : 'standard',
      latitude: hospital.geometry?.location?.lat || 0,
      longitude: hospital.geometry?.location?.lng || 0,
      place_id: hospital.place_id,
      verification_status: 'pending'
    }));
    setShowSearchResults(false);
    setSearchResults([]);
    toast.success(`Selected ${hospital.name}`);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const numericFields = new Set([
      'rating',
      'available_beds',
      'total_beds',
      'ambulances_count',
      'latitude',
      'longitude'
    ]);
    setFormData(prev => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : numericFields.has(name)
            ? (value === '' ? 0 : Number(value))
            : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (onSave) {
        await onSave(formData);
      }
      toast.success(isCreate ? 'Hospital created successfully' : 'Hospital updated successfully');
      onClose(true);
    } catch (error) {
      console.error('Error saving hospital:', error);
      handleApiError(error, isCreate ? 'create' : 'update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4"
          style={{
            paddingTop: 'max(12px, var(--safe-top, 0px))',
            paddingBottom: 'max(12px, calc(var(--safe-bottom, 0px) + 12px))'
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => onClose(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-2xl max-h-[92dvh] overflow-hidden rounded-[32px] shadow-2xl"
            style={{
              maxHeight: 'calc(100dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 24px)'
            }}
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-2 md:p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2 md:p-2.5 bg-blue-500/20 rounded-2xl">
                  <Hospital className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold tracking-tight text-foreground/90">
                    {formData.name || 'New Facility'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`rounded-full border-0 font-semibold px-3 py-0.5 text-xs uppercase tracking-wider ${formData.status === 'available' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                      {formData.status || 'AVAILABLE'}
                    </Badge>
                    <Badge className="rounded-full bg-white/10 border-0 font-semibold px-3 py-0.5 text-xs uppercase tracking-wider text-blue-400">
                      {formData.type}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => onClose(false)}
                className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div
              className="p-2 md:p-8 pt-2 overflow-y-auto space-y-6 no-scrollbar"
              style={{
                maxHeight: 'calc(100dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 170px)'
              }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* --- GOOGLE AUTOFILL SECTION --- */}
                {isCreate && (
                  <GlassCard icon={<MapPin />} title="Auto-fill from Google">
                    <div className="relative" ref={searchContainerRef}>
                      <div className="space-y-2">
                        <Label htmlFor="googleSearch" className="text-xs font-semibold text-muted-foreground uppercase px-1">Search Google Places</Label>
                        <div className="relative">
                          <Input
                            id="googleSearch"
                            placeholder="Search for a hospital (e.g. Mayo Clinic)..."
                            className="rounded-2xl bg-white/5 border-white/10 h-12 pl-10"
                            onChange={handleSearchChange}
                          />
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {searchLoading ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            ) : (
                              <MapPin className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Search Results Dropdown */}
                      {showSearchResults && (
                        <div className="absolute z-50 w-full bg-background/95 backdrop-blur-xl  rounded-2xl shadow-xl max-h-64 overflow-y-auto mt-2">
                          {searchResults.length > 0 ? (
                            searchResults.map((hospital, index) => (
                              <div
                                key={hospital.place_id || index}
                                className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-b-0 transition-colors"
                                onClick={() => handleSelectHospital(hospital)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <Hospital className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate">{hospital.name}</h4>
                                    <p className="text-xs text-muted-foreground truncate">{hospital.address}</p>
                                    {hospital.rating && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        <span className="text-xs text-muted-foreground">{hospital.rating}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No hospitals found. Try a different search term.
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground mt-2 px-1">
                        Search results from Google Places. Select a hospital to auto-fill details.
                      </p>
                    </div>
                  </GlassCard>
                )}

                {/* General Information */}
                <GlassCard icon={<Activity />} title="Facility Details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase px-1">Hospital Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-11 md:h-12 font-semibold text-base md:text-lg"
                        placeholder="General Hospital..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-xs font-semibold text-muted-foreground uppercase px-1">Tier</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12 font-normal">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-white/10 shadow-xl bg-background/95 backdrop-blur-xl">
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergency_level" className="text-xs font-semibold text-muted-foreground uppercase px-1">Trauma Level</Label>
                      <Input
                        id="emergency_level"
                        name="emergency_level"
                        value={formData.emergency_level}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-normal"
                        placeholder="Level 1 Trauma..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_range" className="text-xs font-semibold text-muted-foreground uppercase px-1">Price Range</Label>
                    <Input
                      id="price_range"
                      name="price_range"
                      value={formData.price_range}
                      onChange={handleChange}
                      disabled={isView}
                      className="rounded-2xl bg-white/5 border-white/10 font-normal"
                      placeholder="e.g. $150"
                    />
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="specialties" className="text-xs font-semibold text-muted-foreground uppercase px-1">Specialties (comma separated)</Label>
                      <Input
                        id="specialties"
                        name="specialties"
                        value={Array.isArray(formData.specialties) ? formData.specialties.join(', ') : formData.specialties || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, specialties: e.target.value.split(',').map(s => s.trim()) }))}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 font-normal"
                        placeholder="General Care, Surgery..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="features" className="text-xs font-semibold text-muted-foreground uppercase px-1">Features (comma separated)</Label>
                      <Input
                        id="features"
                        name="features"
                        value={Array.isArray(formData.features) ? formData.features.join(', ') : formData.features || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value.split(',').map(s => s.trim()) }))}
                        disabled={isView}
                        className="rounded-2xl bg-white/5 border-white/10 font-normal"
                        placeholder="Lab, Helipad..."
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Capacity & Stats */}
                <GlassCard icon={<Activity />} title="Live Capacity">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Total Beds</Label>
                      <div className="relative">
                        <Bed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                        <Input
                          type="number"
                          name="total_beds"
                          value={formData.total_beds || 0}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-semibold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Available</Label>
                      <div className="relative">
                        <Bed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                        <Input
                          type="number"
                          name="available_beds"
                          value={formData.available_beds}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-semibold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Reserved</Label>
                      <div className="relative">
                        <Bed className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                        <Input
                          type="number"
                          value={reservedBedsDisplay}
                          disabled
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-semibold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-muted-foreground uppercase px-1">Ambulances</Label>
                      <div className="relative">
                        <Ambulance className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          name="ambulances_count"
                          value={formData.ambulances_count}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 h-10 pl-9 font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Bed Utilization Indicator */}
                  {(formData.total_beds || 0) > 0 && (
                    <div className="mt-4 p-3 bg-white/5 rounded-xl ">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">Bed Utilization</span>
                        <span className="text-xs font-bold">
                          {bedUtilizationPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-gradient-to-r from-green-500 via-orange-500 to-red-500"
                          style={{ width: `${bedUtilizationPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                        <span>{reservedBedsDisplay} occupied</span>
                        <span>{availableBeds} available</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Active Bed Reservations - Only show in view mode */}
                  {isView && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Bed className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase">Active Reservations</span>
                        </div>
                        <Badge className="bg-primary/20 text-primary border-0 text-xs">
                          {activeReservations.length} active
                        </Badge>
                      </div>
                      
                      {loadingReservations ? (
                        <div className="space-y-2">
                          {[1, 2].map((i) => (
                            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                          ))}
                        </div>
                      ) : activeReservations.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          No active bed reservations
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {activeReservations.map((reservation) => (
                            <div key={reservation.id} className="p-3 bg-white/5 rounded-xl ">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm font-medium truncate">
                                      {reservation.patient_name || 'Patient'}
                                    </span>
                                    <Badge className={`text-xs ${
                                      reservation.status === 'in_progress' ? 'bg-orange-500/20 text-orange-500' :
                                      reservation.status === 'accepted' ? 'bg-blue-500/20 text-blue-500' :
                                      'bg-green-500/20 text-green-500'
                                    } border-0`}>
                                      {reservation.status_display}
                                    </Badge>
                                  </div>
                                  
                                  <div className="text-xs text-muted-foreground space-y-1">
                                    {(reservation.bed_category || reservation.bed_type) && (
                                      <div>Bed: {reservation.bed_category || reservation.bed_type}</div>
                                    )}
                                    {reservation.bed_number && (
                                      <div>Room: {reservation.bed_number}</div>
                                    )}
                                    <div>Reserved: {new Date(reservation.reserved_at).toLocaleString()}</div>
                                  </div>
                                </div>
                                
                                <div className="flex gap-1 ml-2">
                                  {reservation.status === 'in_progress' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => bedManagementService.cancelReservation(reservation.id)}
                                      className="h-7 px-2 text-xs text-red-500 border-red-500/30 hover:bg-red-500/10"
                                    >
                                      Cancel
                                    </Button>
                                  )}
                                  {reservation.status === 'accepted' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => bedManagementService.updateReservationStatus(reservation.id, 'arrived')}
                                      className="h-7 px-2 text-xs"
                                    >
                                      Arrived
                                    </Button>
                                  )}
                                  {reservation.status === 'arrived' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => bedManagementService.dischargePatient(reservation.id)}
                                      className="h-7 px-2 text-xs text-green-600 border-green-500/30 hover:bg-green-500/10"
                                    >
                                      Discharge
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </GlassCard>

                {/* Location & Contact */}
                <GlassCard icon={<MapPin />} title="Location & Contact">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="address" className="text-xs font-semibold text-muted-foreground uppercase px-1">Address</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Textarea
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[80px] pl-10 pt-3 font-normal resize-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase px-1">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          disabled={isView}
                          className="rounded-2xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-xs font-semibold text-muted-foreground uppercase px-1">Operational Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12 font-normal">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-white/10 shadow-xl bg-background/95 backdrop-blur-xl">
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="busy">Busy</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </GlassCard>

                {/* Additional Settings */}
                <GlassCard icon={<Activity />} title="System & Verification">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <input
                        type="checkbox"
                        id="verified"
                        name="verified"
                        checked={formData.verified}
                        onChange={handleChange}
                        disabled={isView}
                        className="w-5 h-5 rounded-md accent-primary"
                      />
                      <Label htmlFor="verified" className="text-sm font-medium cursor-pointer">
                        Verified Partner
                        <p className="text-[10px] text-muted-foreground font-normal">Mark as a trusted medical facility</p>
                      </Label>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="image" className="text-xs font-semibold text-muted-foreground uppercase px-1">Hospital Image</Label>
                        {formData.image && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowImage(!showImage)}
                            className="h-5 text-[10px] text-primary hover:text-primary/90 hover:bg-primary/10 px-2"
                          >
                            {showImage ? 'Hide Preview' : 'View Image'}
                          </Button>
                        )}
                      </div>

                      {/* Image Preview */}
                      <AnimatePresence>
                        {showImage && formData.image && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="rounded-xl overflow-hidden  relative bg-black/20"
                          >
                            <img
                              src={formData.image}
                              alt="Hospital Preview"
                              className="w-full h-48 object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Inputs - Hidden in View Mode unless explicit */}
                      {!isView ? (
                        <div className="flex gap-2">
                          <Input
                            id="image"
                            name="image"
                            value={formData.image || ''}
                            onChange={handleChange}
                            disabled={uploading}
                            className="rounded-2xl bg-white/5 border-white/10 font-normal flex-1"
                            placeholder="https://..."
                          />
                          <div className="relative">
                            <input
                              type="file"
                              id="image-upload"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploading}
                            />
                            <Label
                              htmlFor="image-upload"
                              className={`h-10 px-4 flex items-center justify-center rounded-xl  bg-white/5 hover:bg-white/10 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            </Label>
                          </div>
                        </div>
                      ) : (
                        // View Mode Fallback if image is missing or just to show url text optionally? 
                        // User said "in read form we only display image".
                        // If showImage is false, and we are in View mode, we show nothing? Or a placeholder?
                        // Let's show the input ONLY if showImage is false, so they can at least see the URL if they want? 
                        // Or stricly follow "only display image".
                        // I will hide the input in View mode completely as requested
                        !formData.image && <p className="text-sm text-muted-foreground italic px-1">No image available</p>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Footer Actions */}
                <div className="p-3 md:p-4 rounded-[24px] bg-white/5  flex gap-3 justify-end">
                  {!isView ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onClose(false)}
                        className="rounded-2xl h-11 md:h-12 font-semibold text-muted-foreground hover:bg-white/10"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-2xl h-11 md:h-12 bg-primary hover:bg-primary/90 font-semibold px-6 md:px-8 shadow-lg shadow-primary/20"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : (isCreate ? 'Add Facility' : 'Save Changes')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => onClose(false)}
                      className="rounded-2xl h-11 md:h-12 bg-white/10 text-foreground hover:bg-white/20 font-semibold px-6 md:px-8"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div >
      )}
    </AnimatePresence >
  );
};

/* Sub-components */
const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-[28px] bg-white/5  ">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5 text-primary' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);

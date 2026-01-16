import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, Save, Upload, Shield, Calendar, Building, CreditCard, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const InsuranceModal = ({ 
  policy, 
  mode, 
  onClose, 
  onSave, 
  coverageTypes, 
  providers, 
  statuses 
}) => {
  const [formData, setFormData] = useState({
    user_id: '',
    provider_name: '',
    policy_number: '',
    group_number: '',
    policy_holder_name: '',
    coverage_type: 'health_maintenance',
    start_date: '',
    end_date: '',
    front_image_url: '',
    back_image_url: '',
    status: 'active',
    verified: false
  });
  const [loading, setLoading] = useState(false);
  const [frontImageFile, setFrontImageFile] = useState(null);
  const [backImageFile, setBackImageFile] = useState(null);

  useEffect(() => {
    if (policy && mode === 'edit') {
      setFormData({
        user_id: policy.user_id || '',
        provider_name: policy.provider_name || '',
        policy_number: policy.policy_number || '',
        group_number: policy.group_number || '',
        policy_holder_name: policy.policy_holder_name || '',
        coverage_type: policy.coverage_type || 'health_maintenance',
        start_date: policy.start_date || '',
        end_date: policy.end_date || '',
        front_image_url: policy.front_image_url || '',
        back_image_url: policy.back_image_url || '',
        status: policy.status || 'active',
        verified: policy.verified || false
      });
    } else {
      setFormData({
        user_id: '',
        provider_name: '',
        policy_number: '',
        group_number: '',
        policy_holder_name: '',
        coverage_type: 'health_maintenance',
        start_date: '',
        end_date: '',
        front_image_url: '',
        back_image_url: '',
        status: 'active',
        verified: false
      });
    }
  }, [policy, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Handle image uploads if needed
      let finalFormData = { ...formData };
      
      if (frontImageFile) {
        // In a real app, you'd upload to a storage service
        // For now, we'll simulate with a placeholder URL
        finalFormData.front_image_url = `https://example.com/front-${Date.now()}.jpg`;
      }
      
      if (backImageFile) {
        finalFormData.back_image_url = `https://example.com/back-${Date.now()}.jpg`;
      }

      if (mode === 'create') {
        await onSave(finalFormData);
        toast.success('Insurance policy created successfully');
      } else {
        await onSave(policy.id, finalFormData);
        toast.success('Insurance policy updated successfully');
      }
      onClose();
    } catch (error) {
      toast.error(`Failed to ${mode} insurance policy`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (type, file) => {
    if (type === 'front') {
      setFrontImageFile(file);
      handleChange('front_image_url', file ? URL.createObjectURL(file) : '');
    } else {
      setBackImageFile(file);
      handleChange('back_image_url', file ? URL.createObjectURL(file) : '');
    }
  };

  const getStatusColor = (status) => {
    const statusConfig = statuses.find(s => s.value === status);
    return statusConfig?.color || 'gray';
  };

  return (
    <AnimatePresence>
      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <Card className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-500" />
                  <h2 className="text-xl font-semibold">
                    {mode === 'create' ? 'Add Insurance Policy' : 'Edit Insurance Policy'}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Policy Holder and Provider */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Policy Holder Name *
                    </label>
                    <input
                      type="text"
                      value={formData.policy_holder_name}
                      onChange={(e) => handleChange('policy_holder_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="inline h-4 w-4 mr-1" />
                      Insurance Provider *
                    </label>
                    <select
                      value={formData.provider_name}
                      onChange={(e) => handleChange('provider_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select provider...</option>
                      {providers.map(provider => (
                        <option key={provider} value={provider}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Policy Number and Group Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CreditCard className="inline h-4 w-4 mr-1" />
                      Policy Number *
                    </label>
                    <input
                      type="text"
                      value={formData.policy_number}
                      onChange={(e) => handleChange('policy_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="POL123456789"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Group Number
                    </label>
                    <input
                      type="text"
                      value={formData.group_number}
                      onChange={(e) => handleChange('group_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="GRP123456"
                    />
                  </div>
                </div>

                {/* Coverage Type and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coverage Type
                    </label>
                    <select
                      value={formData.coverage_type}
                      onChange={(e) => handleChange('coverage_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {coverageTypes.map(type => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {statuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2">
                      <Badge variant={getStatusColor(formData.status)}>
                        {formData.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleChange('start_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleChange('end_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Image Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Front of Card
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {formData.front_image_url ? (
                        <div className="space-y-2">
                          <img 
                            src={formData.front_image_url} 
                            alt="Front of insurance card"
                            className="mx-auto h-32 object-contain"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleImageUpload('front', null)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                          <p className="text-sm text-gray-600">Upload front of card</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files[0] && handleImageUpload('front', e.target.files[0])}
                            className="hidden"
                            id="front-image-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('front-image-upload').click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Back of Card
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {formData.back_image_url ? (
                        <div className="space-y-2">
                          <img 
                            src={formData.back_image_url} 
                            alt="Back of insurance card"
                            className="mx-auto h-32 object-contain"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleImageUpload('back', null)}
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                          <p className="text-sm text-gray-600">Upload back of card</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files[0] && handleImageUpload('back', e.target.files[0])}
                            className="hidden"
                            id="back-image-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('back-image-upload').click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin-only fields */}
                {mode === 'edit' && (
                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.verified}
                        onChange={(e) => handleChange('verified', e.target.checked)}
                        className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verified
                      </span>
                    </label>
                  </div>
                )}

                {/* Help Text */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <FileText className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-2">Insurance Information:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Ensure all information matches your physical insurance card</li>
                        <li>Upload clear images of both front and back of the card</li>
                        <li>Policy number should be entered exactly as shown on the card</li>
                        <li>Group number is optional but helps with verification</li>
                        <li>Keep your insurance information up to date</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !formData.policy_holder_name || !formData.provider_name || !formData.policy_number}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : (mode === 'create' ? 'Add Policy' : 'Update Policy')}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

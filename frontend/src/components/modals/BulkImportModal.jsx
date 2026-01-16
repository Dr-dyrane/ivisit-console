import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const BulkImportModal = ({ open, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.type === 'application/json')) {
      setFile(selectedFile);
      parseFile(selectedFile);
    } else {
      toast.error('Please select a CSV or JSON file');
    }
  };

  const parseFile = (file) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let data;
        if (file.type === 'application/json') {
          data = JSON.parse(e.target.result);
        } else {
          // Parse CSV
          const lines = e.target.result.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim());
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = values[index] || '';
              });
              return obj;
            });
        }
        
        setPreview(data.slice(0, 5)); // Show first 5 items as preview
      } catch (error) {
        toast.error('Failed to parse file');
      }
    };
    
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        let data;
        if (file.type === 'application/json') {
          data = JSON.parse(e.target.result);
        } else {
          // Parse CSV
          const lines = e.target.result.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          data = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim());
              const obj = {};
              headers.forEach((header, index) => {
                obj[header] = values[index] || '';
              });
              return obj;
            });
        }
        
        await onImport(data);
        setFile(null);
        setPreview([]);
      };
      
      reader.readAsText(file);
    } catch (error) {
      toast.error('Failed to import file');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['title', 'source', 'category', 'url', 'icon', 'published'],
      ['Sample Health News Title', 'Hospital Update', 'general', 'https://example.com', 'medical-outline', 'true'],
      ['Another News Item', 'Medical Journal', 'medical', 'https://example.com/2', 'research-outline', 'false']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'health-news-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {open && (
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
                  <Upload className="h-6 w-6 text-blue-500" />
                  <h2 className="text-xl font-semibold">Bulk Import Health News</h2>
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

              {/* File Upload Area */}
              <div className="mb-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDrop={handleDrop}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Drop your file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Supports CSV and JSON files
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="mb-4"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadTemplate}
                    className="text-sm"
                  >
                    Download Template
                  </Button>
                </div>

                {file && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-green-700">
                        {file.name} selected
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Preview (First 5 items)</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Title
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Source
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Category
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Published
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {preview.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm truncate max-w-xs">
                              {item.title || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {item.source || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <Badge variant="outline">
                                {item.category || 'general'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <Badge variant={item.published === 'true' ? 'success' : 'secondary'}>
                                {item.published === 'true' ? 'Yes' : 'No'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.length >= 5 && (
                    <p className="text-sm text-gray-500 mt-2">
                      And {preview.length - 5} more items...
                    </p>
                  )}
                </div>
              )}

              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-2">File Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>CSV file with headers: title, source, category, url, icon, published</li>
                      <li>JSON array of objects with the same fields</li>
                      <li>Required fields: title, source</li>
                      <li>Optional fields: category (defaults to 'general'), url, icon, published</li>
                      <li>Published field should be 'true' or 'false'</li>
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
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {loading ? 'Importing...' : `Import ${preview.length} Items`}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

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
        setPreview(data.slice(0, 5));
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/20 rounded-2xl">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="hidden sm:block">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">Bulk Import</h2>
                  <p className="text-sm text-muted-foreground">Upload CSV or JSON files for batch processing</p>
                </div>
                <div className="sm:hidden">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground/90">Import</h2>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={onClose}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6 no-scrollbar">
              {/* Upload Zone */}
              <div
                className={`relative group rounded-[28px] border-2 border-dashed transition-all p-12 text-center ${dragActive ? 'border-primary bg-primary/5' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                onDrop={handleDrop}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-4">
                  <div className={`p-4 rounded-2xl ${dragActive ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted-foreground'} transition-colors`}>
                    <Upload className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {file ? file.name : 'Drop your file here'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports CSV and JSON files (max 10MB)
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="rounded-full px-6"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Select File
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={downloadTemplate}
                      className="text-sm rounded-full"
                    >
                      Download Template
                    </Button>
                  </div>
                </div>

                {file && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-4 right-4"
                  >
                    <Badge className="bg-green-500/20 text-green-500 border-0 flex items-center gap-1.5 py-1 px-3">
                      <CheckCircle className="h-3 w-3" />
                      Ready
                    </Badge>
                  </motion.div>
                )}
              </div>

              {/* Preview Area */}
              {preview.length > 0 && (
                <GlassCard icon={<FileText className="text-primary" />} title={`Preview (${preview.length} items)`}>
                  <div className="rounded-2xl overflow-hidden border border-white/5 bg-white/5">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/10">
                            <th className="px-4 py-3 font-medium opacity-60">Title</th>
                            <th className="px-4 py-3 font-medium opacity-60">Source</th>
                            <th className="px-4 py-3 font-medium opacity-60">Category</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {preview.map((item, index) => (
                            <tr key={index} className="hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 truncate max-w-[200px]">{item.title || '-'}</td>
                              <td className="px-4 py-3">{item.source || '-'}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className="border-white/10 bg-white/5">
                                  {item.category || 'general'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Instructions */}
              <div className="p-6 rounded-[24px] bg-blue-500/5 border border-blue-500/10 flex gap-4 items-start">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-sm">
                  <p className="font-semibold text-blue-400 mb-1">File Requirements</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 opacity-70">
                    <li>• Headers: title, source, category, url</li>
                    <li>• JSON array of objects format</li>
                    <li>• Required: title and source</li>
                    <li>• Optional: category (default: general)</li>
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-full px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                >
                  {loading ? 'Processing...' : 'Start Import'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* Sub-components */

const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-[28px] bg-white/5 border-white/10">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);

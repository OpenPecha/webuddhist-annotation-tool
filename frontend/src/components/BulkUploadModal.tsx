import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  IoCloudUpload,
  IoClose,
  IoCheckmarkCircle,
  IoCloseCircle,
  IoDocumentText,
  IoEye,
  IoInformationCircle,
} from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { toast } from "sonner";
import { useValidateBulkUpload, useUploadBulk } from "@/hooks";
import { useAuth0 } from "@auth0/auth0-react";

interface FileValidationResult {
  filename: string;
  valid: boolean;
  errors: string[];
  text_title?: string;
  annotations_count: number;
}

interface UploadResult {
  filename: string;
  success: boolean;
  text_id?: number;
  created_annotations: number;
  error?: string;
  validation_errors?: string[];
}

interface BulkUploadResponse {
  success: boolean;
  total_files: number;
  successful_files: number;
  failed_files: number;
  results: UploadResult[];
  summary: {
    total_texts_created: number;
    total_annotations_created: number;
    success_rate: number;
    processing_details: {
      files_processed: number;
      successful: number;
      failed: number;
    };
  };
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (result: BulkUploadResponse) => void;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [validationResults, setValidationResults] = useState<
    FileValidationResult[] | null
  >(null);
  const [uploadResults, setUploadResults] = useState<BulkUploadResponse | null>(
    null
  );
  const [currentStep, setCurrentStep] = useState<
    "select" | "validate" | "upload" | "results"
  >("select");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation mutation
  const validateMutation = useValidateBulkUpload();

  // Upload mutation
  const uploadMutation = useUploadBulk();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const jsonFiles = files.filter((file) => file.name.endsWith(".json"));

    if (jsonFiles.length === 0) {
      toast.error("No JSON files found", {
        description: "Please select JSON files for upload",
      });
      return;
    }

    if (jsonFiles.length !== files.length) {
      toast.warning("Some files skipped", {
        description: "Only JSON files are supported",
      });
    }

    setSelectedFiles(jsonFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const jsonFiles = files.filter((file) => file.name.endsWith(".json"));

    if (jsonFiles.length === 0) {
      toast.error("No JSON files found", {
        description: "Please select JSON files for upload",
      });
      return;
    }

    setSelectedFiles(jsonFiles);
  };

  const handleValidate = () => {
    if (selectedFiles.length === 0) return;
    setCurrentStep("upload");
    validateMutation.mutate(selectedFiles, {
      onSuccess: (data) => {
        setValidationResults(data.results);
        setCurrentStep("validate");
      },
      onError: (error) => {
        toast.error("Validation failed", {
          description: error.message || "Failed to validate files",
        });
        setCurrentStep("select");
      },
    });
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;

    setCurrentStep("upload");
    uploadMutation.mutate(selectedFiles, {
      onSuccess: (data) => {
        setUploadResults(data);
        setCurrentStep("results");
        onUploadComplete?.(data);

        if (data.success) {
          toast.success("Bulk upload completed!", {
            description: `Successfully uploaded ${data.successful_files} out of ${data.total_files} files`,
          });
        } else {
          toast.warning("Upload completed with errors", {
            description: `${data.successful_files} successful, ${data.failed_files} failed`,
          });
        }
      },
      onError: (error) => {
        toast.error("Upload failed", {
          description: error.message || "Failed to upload files",
        });
        setCurrentStep("select");
      },
    });
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setValidationResults(null);
    setUploadResults(null);
    setCurrentStep("select");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const getStatusIcon = (result: UploadResult | FileValidationResult) => {
    if ("success" in result) {
      // Upload result
      return result.success ? (
        <IoCheckmarkCircle className="w-5 h-5 text-green-600" />
      ) : (
        <IoCloseCircle className="w-5 h-5 text-red-600" />
      );
    } else {
      // Validation result
      return result.valid ? (
        <IoCheckmarkCircle className="w-5 h-5 text-green-600" />
      ) : (
        <IoCloseCircle className="w-5 h-5 text-red-600" />
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Bulk Upload JSON Files</h2>
            <p className="text-gray-600 text-sm mt-1">
              Upload multiple JSON files containing texts and annotations
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <IoClose className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: File Selection */}
          {currentStep === "select" && (
            <div className="space-y-6">
              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <IoCloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop JSON files here or click to browse
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  Support for multiple .json files
                </p>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left">
                  <div className="flex items-start gap-2">
                    <IoInformationCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="text-blue-700">
                        <a
                          href="../../docs/BULK_UPLOAD_FORMAT.md"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-medium hover:text-blue-900"
                        >
                          documentation
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">
                    Selected Files ({selectedFiles.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <IoDocumentText className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium">
                            {file.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFiles((files) =>
                              files.filter((_, i) => i !== index)
                            );
                          }}
                        >
                          <IoClose className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={handleValidate}
                      disabled={selectedFiles.length === 0}
                    >
                      <IoEye className="w-4 h-4 mr-2" />
                      Validate Files
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={selectedFiles.length === 0}
                    >
                      <IoCloudUpload className="w-4 h-4 mr-2" />
                      Upload Files
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Validation Results */}
          {currentStep === "validate" && validationResults && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  Validation Results
                </h3>
                <Button variant="ghost" onClick={handleReset}>
                  <IoClose className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>

              {/* Validation Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {validationResults.filter((r) => r.valid).length}
                    </div>
                    <div className="text-sm text-gray-600">Valid Files</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {validationResults.filter((r) => !r.valid).length}
                    </div>
                    <div className="text-sm text-gray-600">Invalid Files</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-gray-600">
                      {validationResults.reduce(
                        (sum, r) => sum + r.annotations_count,
                        0
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Total Annotations
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* File Details */}
              <div className="space-y-2">
                {validationResults.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result)}
                        <div>
                          <p className="font-medium">{result.filename}</p>
                          {result.valid && result.text_title && (
                            <p className="text-sm text-gray-600">
                              "{result.text_title}" - {result.annotations_count}{" "}
                              annotations
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {result.errors.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 rounded">
                        <p className="text-sm font-medium text-red-800 mb-1">
                          Errors:
                        </p>
                        <ul className="text-sm text-red-700 space-y-1">
                          {result.errors.map((error, errorIndex) => (
                            <li key={errorIndex}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleUpload}
                  disabled={
                    validationResults.filter((r) => r.valid).length === 0
                  }
                >
                  <IoCloudUpload className="w-4 h-4 mr-2" />
                  Upload Valid Files
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Select Different Files
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Upload Progress */}
          {currentStep === "upload" && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <AiOutlineLoading3Quarters className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700">
                  {validateMutation.isPending
                    ? "Validating files..."
                    : "Uploading files..."}
                </p>
                <p className="text-gray-500 text-sm">
                  Please wait while we process your files
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Upload Results */}
          {currentStep === "results" && uploadResults && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Upload Results</h3>
                <Button variant="ghost" onClick={handleReset}>
                  Upload More Files
                </Button>
              </div>

              {/* Upload Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResults.successful_files}
                    </div>
                    <div className="text-sm text-gray-600">Successful</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {uploadResults.failed_files}
                    </div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {uploadResults.summary.total_texts_created}
                    </div>
                    <div className="text-sm text-gray-600">Texts Created</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {uploadResults.summary.total_annotations_created}
                    </div>
                    <div className="text-sm text-gray-600">
                      Annotations Created
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Results */}
              <div className="space-y-2">
                {uploadResults.results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result)}
                        <div>
                          <p className="font-medium">{result.filename}</p>
                          {result.success && (
                            <p className="text-sm text-gray-600">
                              Text ID: {result.text_id} -{" "}
                              {result.created_annotations} annotations created
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {result.error && (
                      <div className="mt-3 p-3 bg-red-50 rounded">
                        <p className="text-sm font-medium text-red-800 mb-1">
                          Error:
                        </p>
                        <p className="text-sm text-red-700">{result.error}</p>
                      </div>
                    )}

                    {result.validation_errors &&
                      result.validation_errors.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded">
                          <p className="text-sm font-medium text-red-800 mb-1">
                            Validation Errors:
                          </p>
                          <ul className="text-sm text-red-700 space-y-1">
                            {result.validation_errors.map(
                              (error, errorIndex) => (
                                <li key={errorIndex}>• {error}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;

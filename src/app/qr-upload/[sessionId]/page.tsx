"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Camera, Upload, CheckCircle, X } from "lucide-react";
import { getApiUrl } from "@/lib/api";

interface FileUpload {
  file: File;
  fieldType: string;
  preview?: string;
}

export default function QRUploadPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File uploads organized by field type
  const [fileUploads, setFileUploads] = useState<{
    [key: string]: FileUpload[];
  }>({
    "Customer ID": [],
    "Payment Slip": [],
    "Inventory Image": [],
    "Google Review": [],
  });

  const handleFileUpload = async (files: FileList | null, fieldType?: string) => {
    if (!files || files.length === 0) return;

    // If no field type specified, use "Inventory Image" as default
    const targetField = fieldType || "Inventory Image";

    // Add files to state with previews
    const newFiles: FileUpload[] = Array.from(files).map((file) => ({
      file,
      fieldType: targetField,
      preview: URL.createObjectURL(file),
    }));

    setFileUploads((prev) => ({
      ...prev,
      [targetField]: [...(prev[targetField] || []), ...newFiles],
    }));
  };

  const handleSubmitUploads = async () => {
    // Collect all files as (file, fieldType) pairs
    const allFiles: { file: File; fieldType: string }[] = [];
    Object.entries(fileUploads).forEach(([fieldType, uploads]) => {
      uploads.forEach((upload) => {
        allFiles.push({ file: upload.file, fieldType });
      });
    });

    if (allFiles.length === 0) {
      alert("Please select at least one file to upload");
      return;
    }

    setUploading(true);
    try {
 
      const results = await Promise.all(
        allFiles.map(async ({ file, fieldType }) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("fieldType", fieldType);

          const res = await fetch(`${getApiUrl()}/api/uploads/qr/${sessionId}`, {
            method: "POST",
            body: fd,
            credentials: "include",
          });

          if (!res.ok) {
            // Return a marker object so we can filter failures
            return { success: false, message: `HTTP ${res.status}` };
          }
          return res.json();
        })
      );

      const succeeded = results.filter((r: any) => r && r.success && r.upload);
      const failed = results.filter((r: any) => !r || !r.success);

      if (succeeded.length > 0) {
        setUploadedFiles((prev) => [
          ...prev,
          ...succeeded.map((r: any) => r.upload),
        ]);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);

        // Clear local selections after success
        setFileUploads({
          "Customer ID": [],
          "Payment Slip": [],
          "Inventory Image": [],
          "Google Review": [],
        });
      }

      if (failed.length > 0) {
        console.warn(`Some files failed to upload (${failed.length}).`);
        // Optional: alert a concise message
        // alert(`Some files failed to upload (${failed.length}). Check console for details.`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (fieldType: string, index: number) => {
    setFileUploads((prev) => {
      const fieldFiles = [...(prev[fieldType] || [])];
      // Revoke object URL to free memory
      if (fieldFiles[index]?.preview) {
        URL.revokeObjectURL(fieldFiles[index].preview as string);
      }
      fieldFiles.splice(index, 1);
      return {
        ...prev,
        [fieldType]: fieldFiles,
      };
    });
  };

  const handleCameraCapture = (fieldType?: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // Use back camera on mobile
    input.multiple = true;
    input.onchange = (e) =>
      handleFileUpload((e.target as HTMLInputElement).files, fieldType);
    input.click();
  };

  const handleFileSelect = (fieldType?: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = (e) =>
      handleFileUpload((e.target as HTMLInputElement).files, fieldType);
    input.click();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, fieldType?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files, fieldType);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Upload Images</h1>
          <p className="text-gray-600 text-sm">
            Take photos or select images to attach to the invoice
          </p>
          <div className="mt-2 text-xs text-gray-500">
            Session: <span className="font-mono">{sessionId}</span>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-white shadow-lg -mt-2 rounded-b-2xl p-6">
          <div className="space-y-6">
            {/* Field-based Upload Sections */}
            {["Customer ID", "Payment Slip", "Inventory Image", "Google Review"].map(
              (fieldType) => {
                const fieldFiles = fileUploads[fieldType] || [];
                return (
                  <div key={fieldType} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">{fieldType}</h3>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => handleCameraCapture(fieldType)}
                        disabled={uploading}
                        className="flex-1 bg-purple-500 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Camera className="w-4 h-4" />
                        Camera
                      </button>
                      <button
                        onClick={() => handleFileSelect(fieldType)}
                        disabled={uploading}
                        className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-4 h-4" />
                        Select
                      </button>
                    </div>

                    {/* Drag and Drop Area */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${
                        dragActive
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-300 hover:border-purple-400"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={(e) => handleDrop(e, fieldType)}
                    >
                      <Upload
                        className={`w-6 h-6 mx-auto mb-2 transition-colors ${
                          dragActive ? "text-purple-500" : "text-gray-400"
                        }`}
                      />
                      <p className="text-gray-600 text-xs">
                        {dragActive ? "Drop images here" : "Drag and drop images here"}
                      </p>
                    </div>

                    {/* File Previews */}
                    {fieldFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {fieldFiles.map((upload, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                          >
                            {upload.preview && (
                              <img
                                src={upload.preview}
                                alt={`Preview ${index + 1}`}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <span className="flex-1 text-sm text-gray-700 truncate">
                              {upload.file.name}
                            </span>
                            <button
                              onClick={() => removeFile(fieldType, index)}
                              className="text-red-500 hover:text-red-700 p-1"
                              disabled={uploading}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmitUploads}
              disabled={uploading || Object.values(fileUploads).flat().length === 0}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-3 hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Upload All Files</span>
                </>
              )}
            </button>
          </div>

          {/* Upload Status */}
          {uploading && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                <span className="text-blue-700 font-medium">Uploading images...</span>
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">Images uploaded successfully!</span>
              </div>
            </div>
          )}

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                Uploaded Images ({uploadedFiles.length})
              </h3>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">
                      {file.filename}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Instructions:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Use your camera to take new photos</li>
              <li>• Select existing images from gallery</li>
              <li>• All images are automatically attached to the invoice</li>
              <li>• You can upload multiple images at once</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

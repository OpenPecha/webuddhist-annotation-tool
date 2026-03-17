import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { IoClose } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IoAlertCircle } from "react-icons/io5";
import type { OpenPechaText } from "@/api/openpecha";
import {
  useOpenPechaTexts,
  useOpenPechaInstances,
  useOpenPechaContent,
  useCreateText,
  useUploadTextFile,
  useAnnotationTypes,
} from "@/hooks";
import { LANGUAGE_OPTIONS } from "@/constants/languages";

interface LoadTextModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoadTextModal: React.FC<LoadTextModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"file" | "openpecha">("file");
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Language and annotation type selections (shared across tabs)
  const [selectedAnnotationType, setSelectedAnnotationType] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // OpenPecha state
  const [selectedText, setSelectedText] = useState<OpenPechaText | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");

  // File upload mutation
  const uploadTextFileMutation = useUploadTextFile({
    onSuccess: (uploadedText, variables: { file: File; language: string; annotation_type_id?: string | null }) => {
      const isXml =
        variables.file.type === "text/xml" ||
        variables.file.type === "application/xml" ||
        variables.file.name.toLowerCase().endsWith(".xml");
      const typesToSelect = isXml
        ? (uploadedText.annotation_types_created?.length
            ? uploadedText.annotation_types_created
            : ["pos"])
        : undefined;
      navigate(`/task/${uploadedText.id}`, {
        state: typesToSelect ? { annotationTypesToSelect: typesToSelect } : undefined,
      });
      setIsUploadingFile(false);
      onClose();
    },
    onError: () => {
      setIsUploadingFile(false);
    },
  });

  // Annotation Types query
  const {
    data: annotationTypes = [],
    isLoading: isLoadingAnnotationTypes,
    error: annotationTypesError,
  } = useAnnotationTypes();

  // OpenPecha queries
  // const {
  //   data: texts = [],
  //   isLoading: isLoadingTexts,
  //   error: textsError,
  // } = useOpenPechaTexts();

  // const {
  //   data: instances = [],
  //   isLoading: isLoadingInstances,
  //   error: instancesError,
  // } = useOpenPechaInstances(selectedText?.id || "", !!selectedText?.id);

  const {
    data: textContent,
    isLoading: isLoadingContent,
    error: contentError,
  } = useOpenPechaContent(selectedInstanceId, !!selectedInstanceId);

  // Auto-select first instance when instances are loaded
  // React.useEffect(() => {
  //   if (instances.length > 0 && !selectedInstanceId) {
  //     setSelectedInstanceId(instances[0].id);
  //   }
  // }, [instances, selectedInstanceId]);

  // OpenPecha load mutation
  const loadTextMutation = useCreateText();

  // File selection handler (doesn't upload immediately)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is a text file or TEI XML
    const isText = file.type.startsWith("text/");
    const isXml = file.type === "text/xml" || file.type === "application/xml";
    const isXmlByExt = file.name.toLowerCase().endsWith(".xml");
    if (!isText && !isXml && !isXmlByExt) {
      toast.error("Invalid file type", {
        description: "Please select a text file (.txt, .md) or TEI XML (.xml)",
      });
      event.target.value = "";
      return;
    }

    setUploadedFile(file);
    // Reset file input
    event.target.value = "";
  };

  const isXmlFile = Boolean(
    uploadedFile &&
      (uploadedFile.type === "text/xml" ||
        uploadedFile.type === "application/xml" ||
        uploadedFile.name.toLowerCase().endsWith(".xml"))
  );

  // Actual file upload handler. For XML, annotation type is optional (derived from file).
  const handleFileUploadSubmit = () => {
    if (!uploadedFile ) {
      toast.error("Missing information", {
        description: "Please select file and language",
      });
      return;
    }
    if (!isXmlFile && !selectedAnnotationType) {
      toast.error("Missing information", {
        description: "Please select annotation type for non-XML uploads",
      });
      return;
    }

    setIsUploadingFile(true);
    uploadTextFileMutation.mutate(
      {
        file: uploadedFile,
        language: 'bo',
        annotation_type_id: isXmlFile ? undefined : selectedAnnotationType || undefined,
      },
      {
        onSettled: () => {
          // Reset states
          setUploadedFile(null);
          setSelectedAnnotationType("");
        },
      }
    );
  };

  const resetOpenPechaSelections = () => {
    setSelectedText(null);
    setSelectedInstanceId("");
    setSelectedAnnotationType("");
  };

  const resetFileUploadSelections = () => {
    setUploadedFile(null);
    setSelectedAnnotationType("");
  };



  const handleClose = () => {
    if (!loadTextMutation.isPending && !isUploadingFile) {
      resetFileUploadSelections();
      resetOpenPechaSelections();
      onClose();
    }
  };

  React.useEffect(() => {
    if (contentError && isOpen) {
      toast.error("Failed to load text content", {
        description:
          contentError instanceof Error
            ? contentError.message
            : "Please try again",
      });
    }
  }, [contentError, isOpen]);

  React.useEffect(() => {
    if (annotationTypesError && isOpen) {
      toast.error("Failed to load annotation types", {
        description:
          annotationTypesError instanceof Error
            ? annotationTypesError.message
            : "Please try again",
      });
    }
  }, [annotationTypesError, isOpen]);

  if (!isOpen) return null;

  const isLoading = loadTextMutation.isPending || isUploadingFile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl m-4">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Load Text</h2>
              <p className="text-sm text-gray-600">
                Upload a file or import from OpenPecha
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs Content */}
        <div className="p-6">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "file" | "openpecha")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="file">File Upload (TEI XML)</TabsTrigger>
              <TabsTrigger value="openpecha" disabled>OpenPecha</TabsTrigger>
            </TabsList>

            {/* File Upload Tab */}
            <TabsContent value="file" className="space-y-6">
              <div className="space-y-4">
                {/* File Selection */}
                <div className="text-center py-8">
                  <svg
                    className="w-16 h-16 text-orange-500 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {uploadedFile ? `Selected: ${uploadedFile.name}` : "Upload Your Text File"}
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    {uploadedFile 
                      ? "Configure language and annotation type below" 
                      : "Select a text file (.txt, .md) or TEI XML (.xml) to start annotating"}
                  </p>
                  {!uploadedFile && (
                    <div className="relative inline-block">
                      <input
                        type="file"
                        accept=".txt,.md,.text,.xml"
                        onChange={handleFileSelect}
                        disabled={isUploadingFile}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        id="file-upload-modal"
                      />
                      <Button
                        size="lg"
                        className="bg-orange-500 hover:bg-orange-600"
                        disabled={isUploadingFile}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}
                  {uploadedFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFileUploadSelections}
                      disabled={isUploadingFile}
                    >
                      Change File
                    </Button>
                  )}
                </div>

                {/* Language Selection - Show after file is selected */}
                {uploadedFile && (
                  <>
                  

                    {/* Annotation Type Selection - optional for XML (type derived from file) */}
                    {/* <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        Select Annotation Type
                        {!isXmlFile && <span className="text-red-500">*</span>}
                        {isXmlFile && (
                          <span className="text-gray-500 font-normal">(optional for XML)</span>
                        )}
                      </label>
                      <Select
                        value={selectedAnnotationType}
                        onValueChange={setSelectedAnnotationType}
                        disabled={isUploadingFile || isLoadingAnnotationTypes}
                      >
                        <SelectTrigger className="focus:ring-0 ring-0 focus:outline-none focus:ring-offset-0">
                          <SelectValue
                            placeholder={
                              isLoadingAnnotationTypes
                                ? "Loading annotation types..."
                                : "Choose annotation type..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingAnnotationTypes ? (
                            <div className="p-4 text-center">
                              <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                              <p className="text-sm text-gray-500">
                                Loading types...
                              </p>
                            </div>
                          ) : annotationTypes.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                              No annotation types available
                            </div>
                          ) : (
                            annotationTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div> */}
                  </>
                )}
              </div>
            </TabsContent>

            {/* OpenPecha Tab */}
            <TabsContent value="openpecha" className="space-y-6">
              <></>
              {/* Text Selection Dropdown */}
              {/* <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  Select Text
                </label>
                <Select
                  value={selectedText?.id}
                  onValueChange={handleTextChange}
                  disabled={loadTextMutation.isPending}
                >
                  <SelectTrigger
                    disabled={isLoadingTexts}
                    className="focus:ring-0 ring-0 focus:outline-none focus:ring-offset-0"
                  >
                    <SelectValue
                      placeholder={`${
                        isLoadingTexts ? "Loading texts..." : "Choose a Pecha..."
                      }`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTexts ? (
                      <div className="p-4 text-center">
                        <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        <p className="text-sm text-gray-500">Loading texts...</p>
                      </div>
                    ) : textsError ? (
                      <div className="p-4 text-center">
                        <IoAlertCircle className="w-5 h-5 mx-auto mb-2 text-red-500" />
                        <p className="text-sm text-red-600">Failed to load texts</p>
                      </div>
                    ) : texts.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No texts available
                      </div>
                    ) : (
                      texts.map((text) => (
                        <SelectItem key={text.id} value={text.id}>
                          {formatTitle(text.title)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Instance/Version Selection Dropdown */}
              {/* <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  Select Version
                </label>
                <Select
                  value={selectedInstanceId}
                  onValueChange={handleInstanceChange}
                  disabled={
                    !selectedText?.id ||
                    isLoadingInstances ||
                    loadTextMutation.isPending
                  }
                >
                  <SelectTrigger
                    disabled={isLoadingInstances}
                    className="focus:ring-0 ring-0 focus:outline-none focus:ring-offset-0"
                  >
                    <SelectValue
                      placeholder={`${
                        isLoadingInstances
                          ? "Loading versions..."
                          : "Choose a version..."
                      }`}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingInstances ? (
                      <div className="p-4 text-center">
                        <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        <p className="text-sm text-gray-500">Loading versions...</p>
                      </div>
                    ) : instancesError ? (
                      <div className="p-4 text-center">
                        <IoAlertCircle className="w-5 h-5 mx-auto mb-2 text-red-500" />
                        <p className="text-sm text-red-600">
                          Failed to load versions
                        </p>
                      </div>
                    ) : instances.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No versions available
                      </div>
                    ) : (
                      instances.map((instance) => (
                        <SelectItem key={instance.id} value={instance.id}>
                          {instance.type} ({instance.id.slice(0, 8)}...)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Annotation Type Selection */}
              {/* <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  Select Annotation Type
                  <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedAnnotationType}
                  onValueChange={setSelectedAnnotationType}
                  disabled={isLoadingAnnotationTypes || loadTextMutation.isPending}
                >
                  <SelectTrigger className="focus:ring-0 ring-0 focus:outline-none focus:ring-offset-0">
                    <SelectValue
                      placeholder={
                        isLoadingAnnotationTypes
                          ? "Loading annotation types..."
                          : "Choose annotation type..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingAnnotationTypes ? (
                      <div className="p-4 text-center">
                        <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        <p className="text-sm text-gray-500">
                          Loading types...
                        </p>
                      </div>
                    ) : annotationTypes.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No annotation types available
                      </div>
                    ) : (
                      annotationTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div> */}

              {/* Text Preview */}
              {/* {selectedText && selectedInstanceId && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Preview
                  </label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    <pre
                      className={`text-sm text-gray-700 whitespace-pre-wrap font-sans ${
                        selectedText?.language == "bo"
                          ? "font-monlam"
                          : "font-google-sans"
                      }`}
                    >
                      {isLoadingContent
                        ? "Loading content..."
                        : getSegmentedText()}
                    </pre>
                  </div>
                </div>
              )} */}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          
          {/* File Upload Action Button */}
          {activeTab === "file" && uploadedFile && (
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              size="lg"
              onClick={handleFileUploadSubmit}
              disabled={
                !uploadedFile ||
                !isXmlFile ||
                isUploadingFile
              }
            >
              {isUploadingFile ? (
                <>
                  <AiOutlineLoading3Quarters className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload & Start Annotating"
              )}
            </Button>
          )}
          
          {/* OpenPecha Action Button */}
          {/* {activeTab === "openpecha" && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              size="lg"
              onClick={handleLoadText}
              disabled={
                !selectedText?.id ||
                !selectedInstanceId ||
                !selectedAnnotationType ||
                loadTextMutation.isPending ||
                isLoadingTexts ||
                isLoadingInstances ||
                isLoadingContent
              }
            >
              {loadTextMutation.isPending ? (
                <>
                  <AiOutlineLoading3Quarters className="w-4 h-4 mr-2 animate-spin" />
                  Loading Text...
                </>
              ) : (
                "Load & Start Annotating"
              )}
            </Button>
          )} */}
        </div>
      </div>
    </div>
  );
};


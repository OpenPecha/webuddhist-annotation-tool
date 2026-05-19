import React, { useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { IoCloudUpload } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useAnnotationTypes, useUploadTextFile } from "@/hooks";
import { LANGUAGE_OPTIONS } from "@/constants/languages";

interface AdminDocumentUploadProps {
  onUploaded?: () => void;
}

export const AdminDocumentUpload: React.FC<AdminDocumentUploadProps> = ({
  onUploaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("bo");
  const [annotationTypeId, setAnnotationTypeId] = useState("");

  const { data: annotationTypes = [], isLoading: isLoadingTypes } =
    useAnnotationTypes();

  const uploadMutation = useUploadTextFile({
    showToast: true,
    onSuccess: () => {
      setSelectedFile(null);
      setAnnotationTypeId("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onUploaded?.();
    },
  });

  const isXml = Boolean(
    selectedFile &&
      (selectedFile.type === "text/xml" ||
        selectedFile.type === "application/xml" ||
        selectedFile.name.toLowerCase().endsWith(".xml"))
  );

  const handleSubmit = () => {
    if (!selectedFile) {
      toast.error("Select a file", {
        description: "Choose a .txt, .md, or TEI .xml file to upload.",
      });
      return;
    }
    if (!isXml && !annotationTypeId) {
      toast.error("Annotation type required", {
        description: "Select an annotation type for non-XML uploads.",
      });
      return;
    }

    uploadMutation.mutate({
      file: selectedFile,
      language,
      annotation_type_id: isXml ? undefined : annotationTypeId,
    });
  };

  return (
    <Card className="border-border/80 bg-card/90 shadow-sm">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="font-display text-lg font-semibold">
          Upload document
        </CardTitle>
        <CardDescription>
          Add a text or TEI XML file to the corpus. Documents stay unassigned
          until an annotator clicks Assign me.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.xml,text/plain,text/xml,application/xml"
          className="hidden"
          id="admin-document-upload"
          onChange={(e) => {
            setSelectedFile(e.target.files?.[0] ?? null);
          }}
        />
        <label
          htmlFor="admin-document-upload"
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors hover:bg-muted/50"
        >
          <IoCloudUpload className="mb-2 h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {selectedFile ? selectedFile.name : "Choose file"}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            .txt, .md, or TEI .xml
          </span>
        </label>


        <Button
          className="w-full sm:w-auto"
          disabled={uploadMutation.isPending || !selectedFile}
          onClick={handleSubmit}
        >
          {uploadMutation.isPending ? (
            <AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <IoCloudUpload className="mr-2 h-4 w-4" />
          )}
          Upload document
        </Button>
      </CardContent>
    </Card>
  );
};


"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Download,
  Edit,
  Loader2,
  Monitor,
  Save,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  Wand2,
  Upload,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { saveResume, generateResumeTemplate, deleteResume } from "@/actions/resume";
import { EntryForm } from "./entry-form";
import useFetch from "@/hooks/use-fetch";
import { useUser } from "@clerk/nextjs";
import { entriesToMarkdown } from "@/app/lib/helper";
import { resumeSchema } from "@/app/lib/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const templates = [
  { id: "modern", name: "Modern" },
  { id: "professional", name: "Professional" },
  { id: "minimal", name: "Minimal" },
  { id: "creative", name: "Creative" },
];

export default function ResumeBuilder({ initialContent }) {
  const [activeTab, setActiveTab] = useState("edit");
  const [previewContent, setPreviewContent] = useState(initialContent);
  const { user } = useUser();
  const [resumeMode, setResumeMode] = useState("preview");
  const [atsScore, setAtsScore] = useState(null);
  const [atsFeedback, setAtsFeedback] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [isImprovingSummary, setIsImprovingSummary] = useState(false);
  const [isImprovingSkills, setIsImprovingSkills] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const fileInputRef = useRef(null);
  const [lastEnhancementTime, setLastEnhancementTime] = useState(0);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      contactInfo: {},
      summary: "",
      skills: "",
      experience: [],
      education: [],
      projects: [],
    },
  });

  const {
    loading: isSaving,
    fn: saveResumeFn,
    data: saveResult,
    error: saveError,
  } = useFetch(saveResume);

  const {
    loading: isGeneratingTemplate,
    fn: generateTemplateFn,
    data: templateResult,
    error: templateError,
  } = useFetch(generateResumeTemplate);

  const {
    loading: isDeleting,
    fn: deleteResumeFn,
    error: deleteError,
  } = useFetch(deleteResume);

  // Watch form fields for preview updates
  const formValues = watch();

  useEffect(() => {
    if (initialContent) setActiveTab("preview");
  }, [initialContent]);

  // Update preview content when form values change
  useEffect(() => {
    if (activeTab === "edit") {
      const newContent = getCombinedContent();
      setPreviewContent(newContent ? newContent : initialContent);
    }
  }, [formValues, activeTab]);

  // Handle save result
  useEffect(() => {
    if (saveResult && !isSaving) {
      toast.success("Resume saved successfully!");
      if (saveResult.atsScore) {
        setAtsScore(saveResult.atsScore);
        setAtsFeedback(JSON.parse(saveResult.feedback));
      }
    }
    if (saveError) {
      toast.error(saveError.message || "Failed to save resume");
    }
  }, [saveResult, saveError, isSaving]);

  // Handle template generation
  useEffect(() => {
    if (templateResult && !isGeneratingTemplate) {
      setPreviewContent(templateResult);
      toast.success("Template generated successfully!");
      setShowTemplateDialog(false);
    }
    if (templateError) {
      toast.error(templateError.message || "Failed to generate template");
    }
  }, [templateResult, templateError, isGeneratingTemplate]);

  // Handle delete result
  useEffect(() => {
    if (deleteError) {
      toast.error(deleteError.message || "Failed to delete resume");
    }
  }, [deleteError]);

  const getContactMarkdown = () => {
    const { contactInfo } = formValues;
    const parts = [];
    if (contactInfo.name) parts.push(`**${contactInfo.name}**`);
    if (contactInfo.email) parts.push(`📧 ${contactInfo.email}`);
    if (contactInfo.mobile) parts.push(`📱 ${contactInfo.mobile}`);
    if (contactInfo.linkedin) parts.push(`💼 [LinkedIn](${contactInfo.linkedin})`);
    if (contactInfo.twitter) parts.push(`🐦 [Twitter](${contactInfo.twitter})`);

    return parts.length > 0
      ? `## Contact Information\n\n${parts.join(" | ")}`
      : "";
  };

  const getCombinedContent = () => {
    const { summary, skills, experience, education, projects } = formValues;
    return [
      getContactMarkdown(),
      summary && `## Professional Summary\n\n${summary}`,
      skills && `## Skills\n\n${skills}`,
      entriesToMarkdown(experience, "Work Experience"),
      entriesToMarkdown(education, "Education"),
      entriesToMarkdown(projects, "Projects"),
    ]
      .filter(Boolean)
      .join("\n\n");
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      // Create a clean version of the resume content for PDF
      const cleanContent = previewContent.replace(/<[^>]*>/g, '');
      
      // Use the browser's print functionality
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Pop-up blocked. Please allow pop-ups for this site to generate PDF.");
        return;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Resume</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                margin: 20px;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
              }
              h1, h2, h3 {
                color: #333;
              }
              h1 {
                text-align: center;
                margin-bottom: 20px;
              }
              h2 {
                border-bottom: 1px solid #ccc;
                padding-bottom: 5px;
                margin-top: 20px;
              }
              .contact-info {
                text-align: center;
                margin-bottom: 20px;
              }
              .section {
                margin-bottom: 15px;
              }
              .entry {
                margin-bottom: 10px;
              }
              .entry-title {
                font-weight: bold;
              }
              .entry-subtitle {
                font-style: italic;
              }
              .entry-date {
                color: #666;
                font-size: 0.9em;
              }
              .entry-description {
                margin-top: 5px;
              }
              @media print {
                body {
                  font-size: 12pt;
                }
                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="no-print" style="text-align: center; margin-bottom: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Print / Save as PDF
              </button>
            </div>
            <div id="resume-content">
              ${previewContent}
            </div>
            <script>
              // Auto-print after a short delay
              setTimeout(() => {
                window.print();
              }, 1000);
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Close the window after printing (or if user cancels)
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.close();
        }
      }, 5000);
      
      toast.success("PDF generation started. Use your browser's print dialog to save as PDF.");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const formattedContent = previewContent
        .replace(/\n/g, "\n")
        .replace(/\n\s*\n/g, "\n\n")
        .trim();

      await saveResumeFn(formattedContent);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleTemplateSelect = async (template) => {
    await generateTemplateFn(template);
  };

  const improveWithAI = async ({ current, type }) => {
    try {
      // Check if we've enhanced recently (within the last minute)
      const now = Date.now();
      if (now - lastEnhancementTime < 60000) {
        const waitTime = Math.ceil((60000 - (now - lastEnhancementTime)) / 1000);
        toast.error(`Please wait ${waitTime} seconds before trying again.`);
        return null;
      }
      
      // Add a small delay to prevent rapid consecutive requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await fetch("/api/resume/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: current,
          type: type,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please wait a minute before trying again.");
          throw new Error("Rate limit exceeded. Please wait a minute before trying again.");
        }
        
        throw new Error(errorText || "Failed to improve content");
      }

      const data = await response.json();
      
      // Update the last enhancement time
      setLastEnhancementTime(Date.now());
      
      return data.content;
    } catch (error) {
      console.error("AI improvement error:", error);
      throw error;
    }
  };

  const handleImproveSummary = async () => {
    if (!formValues.summary) {
      toast.error("Please enter a summary first");
      return;
    }

    setIsImprovingSummary(true);
    try {
      toast.info("Improving your summary... This may take a moment.");
      
      const improvedContent = await improveWithAI({
        current: formValues.summary,
        type: "summary"
      });

      if (improvedContent) {
        setValue("summary", improvedContent);
        toast.success("Summary improved successfully!");
      }
    } catch (error) {
      console.error("Error improving summary:", error);
      toast.error(error.message || "Failed to improve summary. Please try again.");
    } finally {
      setIsImprovingSummary(false);
    }
  };

  const handleImproveSkills = async () => {
    if (!formValues.skills) {
      toast.error("Please enter skills first");
      return;
    }

    setIsImprovingSkills(true);
    try {
      toast.info("Improving your skills section... This may take a moment.");
      
      const improvedContent = await improveWithAI({
        current: formValues.skills,
        type: "skills"
      });

      if (improvedContent) {
        setValue("skills", improvedContent);
        toast.success("Skills improved successfully!");
      }
    } catch (error) {
      console.error("Error improving skills:", error);
      toast.error(error.message || "Failed to improve skills. Please try again.");
    } finally {
      setIsImprovingSkills(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to upload resume");
      }

      const data = await response.json();
      
      // Update form values with extracted content
      if (data.content) {
        const { summary, skills, experience, education, projects } = data.content;
        
        // Use the form's setValue method to update values
        if (summary) setValue("summary", summary);
        if (skills) setValue("skills", skills);
        if (experience && experience.length > 0) setValue("experience", experience);
        if (education && education.length > 0) setValue("education", education);
        if (projects && projects.length > 0) setValue("projects", projects);
        
        // Update preview content
        setPreviewContent(getCombinedContent());
      }

      toast.success("Resume uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload resume");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleEnhanceResume = async () => {
    if (!formValues.summary && !formValues.skills && !formValues.experience?.length) {
      toast.error("Please add some content to your resume first");
      return;
    }

    setIsEnhancing(true);
    try {
      // Show a toast to inform the user that enhancement might take a while
      toast.info("Enhancing your resume... This may take a minute or two due to rate limits.");
      
      const response = await fetch("/api/resume/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formValues),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to enhance resume");
      }

      const data = await response.json();
      
      // Update form values with enhanced content
      if (data.content) {
        const { summary, skills, experience, education, projects } = data.content;
        
        // Use the form's setValue method to update values
        if (summary) setValue("summary", summary);
        if (skills) setValue("skills", skills);
        if (experience && experience.length > 0) setValue("experience", experience);
        if (education && education.length > 0) setValue("education", education);
        if (projects && projects.length > 0) setValue("projects", projects);
        
        // Update preview content
        setPreviewContent(getCombinedContent());
      }

      toast.success("Resume enhanced successfully!");
    } catch (error) {
      console.error("Enhancement error:", error);
      
      // Provide more specific error messages
      if (error.message.includes("429") || error.message.includes("Too Many Requests")) {
        toast.error("Rate limit exceeded. Please try again in a minute.");
      } else {
        toast.error(error.message || "Failed to enhance resume. Please try again later.");
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteResumeFn();
      toast.success("Resume deleted successfully!");
      // Reset form to default values
      setValue("contactInfo", {});
      setValue("summary", "");
      setValue("skills", "");
      setValue("experience", []);
      setValue("education", []);
      setValue("projects", []);
      setPreviewContent("");
      setAtsScore(null);
      setAtsFeedback(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete resume");
    }
  };

  return (
    <div data-color-mode="light" className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-2">
        <h1 className="font-bold gradient-title text-5xl md:text-6xl">
          Resume Builder
        </h1>
        <div className="space-x-2">
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose a Template</DialogTitle>
                <DialogDescription>
                  Select a template to start with a professional layout
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-24"
                    onClick={() => handleTemplateSelect(template.id)}
                    disabled={isGeneratingTemplate}
                  >
                    {isGeneratingTemplate ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      template.name
                    )}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="destructive"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Print / Save as PDF
              </>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Resume
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your resume.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {atsScore !== null && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ATS Score: {atsScore}
              {atsScore >= 80 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-yellow-500" />
              )}
            </CardTitle>
            <CardDescription>
              Your resume's compatibility with Applicant Tracking Systems
            </CardDescription>
          </CardHeader>
          {atsFeedback && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Strengths</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {atsFeedback.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-green-600">
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Areas for Improvement</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {atsFeedback.improvements.map((improvement, index) => (
                      <li key={index} className="text-sm text-yellow-600">
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Existing Resume
              </>
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleEnhanceResume}
          disabled={isEnhancing}
          className="w-full"
        >
          {isEnhancing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enhancing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Enhance Entire Resume
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit">Form</TabsTrigger>
          <TabsTrigger value="preview">Markdown</TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    {...register("contactInfo.name")}
                    type="text"
                    placeholder="John Doe"
                    error={errors.contactInfo?.name}
                  />
                  {errors.contactInfo?.name && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    {...register("contactInfo.email")}
                    type="email"
                    placeholder="your@email.com"
                    error={errors.contactInfo?.email}
                  />
                  {errors.contactInfo?.email && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mobile Number</label>
                  <Input
                    {...register("contactInfo.mobile")}
                    type="tel"
                    placeholder="+1 234 567 8900"
                  />
                  {errors.contactInfo?.mobile && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.mobile.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">LinkedIn URL</label>
                  <Input
                    {...register("contactInfo.linkedin")}
                    type="url"
                    placeholder="https://linkedin.com/in/your-profile"
                  />
                  {errors.contactInfo?.linkedin && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.linkedin.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Twitter/X Profile
                  </label>
                  <Input
                    {...register("contactInfo.twitter")}
                    type="url"
                    placeholder="https://twitter.com/your-handle"
                  />
                  {errors.contactInfo?.twitter && (
                    <p className="text-sm text-red-500">
                      {errors.contactInfo.twitter.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Summary Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Professional Summary</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImproveSummary}
                  disabled={!formValues.summary || isImprovingSummary}
                  className="flex items-center gap-2"
                  title="Use AI to enhance your professional summary with industry-specific keywords and better phrasing"
                >
                  {isImprovingSummary ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Improving...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Improve with AI
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                placeholder="Write a compelling professional summary..."
                value={formValues.summary}
                onChange={(e) => setValue("summary", e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Skills Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Skills</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImproveSkills}
                  disabled={!formValues.skills || isImprovingSkills}
                  className="flex items-center gap-2"
                  title="Use AI to enhance your skills list with industry-specific keywords and better organization"
                >
                  {isImprovingSkills ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Improving...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Improve with AI
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                placeholder="List your key skills..."
                value={formValues.skills}
                onChange={(e) => setValue("skills", e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* Experience */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Work Experience</h3>
              <Controller
                name="experience"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Experience"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.experience && (
                <p className="text-sm text-red-500">
                  {errors.experience.message}
                </p>
              )}
            </div>

            {/* Education */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Education</h3>
              <Controller
                name="education"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Education"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.education && (
                <p className="text-sm text-red-500">
                  {errors.education.message}
                </p>
              )}
            </div>

            {/* Projects */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Projects</h3>
              <Controller
                name="projects"
                control={control}
                render={({ field }) => (
                  <EntryForm
                    type="Project"
                    entries={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.projects && (
                <p className="text-sm text-red-500">
                  {errors.projects.message}
                </p>
              )}
            </div>
          </form>
        </TabsContent>

        <TabsContent value="preview">
          {activeTab === "preview" && (
            <Button
              variant="link"
              type="button"
              className="mb-2"
              onClick={() =>
                setResumeMode(resumeMode === "preview" ? "edit" : "preview")
              }
            >
              {resumeMode === "preview" ? (
                <>
                  <Edit className="h-4 w-4" />
                  Edit Resume
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4" />
                  Show Preview
                </>
              )}
            </Button>
          )}

          {activeTab === "preview" && resumeMode !== "preview" && (
            <div className="flex p-3 gap-2 items-center border-2 border-yellow-600 text-yellow-600 rounded mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">
                You will lose edited markdown if you update the form data.
              </span>
            </div>
          )}
          <div className="border rounded-lg">
            <MDEditor
              value={previewContent}
              onChange={setPreviewContent}
              height={800}
              preview={resumeMode}
            />
          </div>
          <div className="hidden">
            <div id="resume-pdf">
              <MDEditor.Markdown
                source={previewContent}
                style={{
                  background: "white",
                  color: "black",
                }}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

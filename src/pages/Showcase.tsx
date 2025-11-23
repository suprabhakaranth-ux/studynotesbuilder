import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  FolderTree,
  FileText,
  Brain,
  CheckCircle2,
  Download,
  Trash2,
  Move,
  Type,
  Bold,
  Italic,
  Underline,
  List,
  AlignLeft,
  Palette,
  Undo2,
  MessageSquare,
  ChevronRight,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

const Showcase = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: FolderTree,
      title: "Hierarchical Organization",
      description: "Organize your study material in a 3-level hierarchy",
      details: [
        "Create subjects for different courses or topics",
        "Break subjects into chapters for structured learning",
        "Add topics within chapters for granular content",
        "Topics can exist directly under subjects without chapters",
      ],
      color: "text-blue-500",
    },
    {
      icon: Type,
      title: "Rich Text Editor",
      description: "Full-featured formatting for comprehensive notes",
      details: [
        "Text formatting: Bold, Italic, Underline, Strikethrough",
        "Font customization: Family, Size, Color",
        "Text highlighting with custom colors",
        "Alignment options: Left, Center, Right",
        "Lists: Bullet points and numbered lists",
        "Indentation control for nested content",
        "Custom undo/redo system that tracks all changes including paste",
      ],
      color: "text-purple-500",
    },
    {
      icon: FileText,
      title: "Content Blocks",
      description: "Modular content creation with specialized block types",
      details: [
        "Text blocks for main content",
        "Image blocks for visual learning",
        "Summary sections for quick review",
        "Mnemonic blocks for memory aids",
        "Heading extraction for structured navigation",
      ],
      color: "text-green-500",
    },
    {
      icon: CheckCircle2,
      title: "Study Progress Tracking",
      description: "Mark topics as studied and track your progress",
      details: [
        "One-click toggle to mark topics as studied",
        "Visual feedback with green highlighting",
        "Persistent tracking across sessions",
        "Easy filtering for studied/unstudied content",
      ],
      color: "text-emerald-500",
    },
    {
      icon: Brain,
      title: "AI Study Assistant",
      description: "Intelligent AI-powered study helper",
      details: [
        "Context-aware chat based on your study materials",
        "Filter by specific subjects, chapters, or topics",
        "Get explanations and clarifications",
        "Multiple conversation threads",
        "Conversation history management",
      ],
      color: "text-pink-500",
    },
    {
      icon: Download,
      title: "Export to PDF",
      description: "Generate professional PDFs of your study materials",
      details: [
        "Export individual topics with all content",
        "Includes text blocks, summaries, and mnemonics",
        "Preserves formatting and structure",
        "Heading tree for easy navigation",
      ],
      color: "text-orange-500",
    },
    {
      icon: Move,
      title: "Flexible Organization",
      description: "Reorganize your content effortlessly",
      details: [
        "Move topics between chapters",
        "Move chapters between subjects",
        "Drag and drop heading nodes",
        "Reorder content blocks",
      ],
      color: "text-cyan-500",
    },
    {
      icon: Trash2,
      title: "Recycle Bin",
      description: "Safe deletion with recovery options",
      details: [
        "Deleted items stored temporarily",
        "One-click restoration",
        "Permanent deletion when ready",
        "Preserves all related data (blocks, headings, etc.)",
      ],
      color: "text-red-500",
    },
  ];

  const walkthrough = [
    {
      step: 1,
      title: "Create Your First Subject",
      description: "Start by creating a subject (e.g., 'Biology', 'Mathematics')",
      action: "Click 'Add Subject' in the sidebar",
      tip: "Choose a descriptive name and color for easy identification",
    },
    {
      step: 2,
      title: "Add Chapters",
      description: "Break your subject into manageable chapters",
      action: "Click 'Add Chapter' under your subject",
      tip: "Use chapters to organize content by units or themes",
    },
    {
      step: 3,
      title: "Create Topics",
      description: "Add specific topics you want to study",
      action: "Click the '+' button next to a chapter or subject",
      tip: "Topics can be added directly to subjects or within chapters",
    },
    {
      step: 4,
      title: "Build Your Content",
      description: "Use the rich text editor to create comprehensive notes",
      action: "Click on a topic to open the editor",
      tip: "Add multiple content blocks, use formatting, and create summaries",
    },
    {
      step: 5,
      title: "Mark Progress",
      description: "Track what you've studied",
      action: "Click the circle icon on any topic card",
      tip: "Green highlighting shows completed topics at a glance",
    },
    {
      step: 6,
      title: "Use AI Assistant",
      description: "Get help with your study materials",
      action: "Click 'AI Study Assistant' in the sidebar footer",
      tip: "Filter by subject/chapter/topic for focused assistance",
    },
    {
      step: 7,
      title: "Export & Share",
      description: "Generate PDFs of your notes",
      action: "Click 'Export to PDF' in the topic editor",
      tip: "Perfect for printing or sharing with study groups",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">StudyBuilder Showcase</h1>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            AI-Powered
          </Badge>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Transform Your Study Experience
          </h2>
          <p className="text-xl text-muted-foreground">
            A comprehensive study management tool with AI-powered assistance,
            rich text editing, and intelligent organization
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Badge variant="outline" className="text-base py-2 px-4">
              <FolderTree className="h-4 w-4 mr-2" />
              Hierarchical Organization
            </Badge>
            <Badge variant="outline" className="text-base py-2 px-4">
              <Brain className="h-4 w-4 mr-2" />
              AI Assistant
            </Badge>
            <Badge variant="outline" className="text-base py-2 px-4">
              <Type className="h-4 w-4 mr-2" />
              Rich Text Editor
            </Badge>
            <Badge variant="outline" className="text-base py-2 px-4">
              <Download className="h-4 w-4 mr-2" />
              PDF Export
            </Badge>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">
          Complete Feature Set
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50"
              onClick={() => setActiveFeature(index)}
            >
              <CardHeader>
                <feature.icon className={`h-8 w-8 ${feature.color} mb-2`} />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Feature Details */}
        <Card className="mt-8 border-2 border-primary/30">
          <CardHeader>
            <div className="flex items-start gap-4">
              {(() => {
                const Feature = features[activeFeature];
                return (
                  <>
                    <Feature.icon className={`h-10 w-10 ${Feature.color}`} />
                    <div className="flex-1">
                      <CardTitle className="text-2xl">
                        {Feature.title}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {Feature.description}
                      </CardDescription>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features[activeFeature].details.map((detail, i) => (
                <li key={i} className="flex items-start gap-3">
                  <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{detail}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Interactive Walkthrough */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <h3 className="text-3xl font-bold text-center mb-12">
          Complete Walkthrough
        </h3>
        <Tabs defaultValue="0" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-7">
            {walkthrough.map((item, index) => (
              <TabsTrigger key={index} value={index.toString()}>
                Step {item.step}
              </TabsTrigger>
            ))}
          </TabsList>
          {walkthrough.map((item, index) => (
            <TabsContent key={index} value={index.toString()}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="default" className="text-lg px-3 py-1">
                      Step {item.step}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{item.title}</CardTitle>
                  <CardDescription className="text-base">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
                    <p className="font-semibold text-primary mb-1">Action:</p>
                    <p className="text-foreground">{item.action}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="font-semibold mb-1 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      Pro Tip:
                    </p>
                    <p className="text-muted-foreground">{item.tip}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {/* Example Use Case */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">
          Example Use Case: Biology Exam Preparation
        </h3>
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scenario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Sarah is preparing for her Biology final exam covering Cell
                Biology, Genetics, and Evolution. Here's how she uses
                StudyBuilder:
              </p>
              <ol className="space-y-4 list-decimal list-inside">
                <li className="text-muted-foreground">
                  <strong className="text-foreground">Setup:</strong> Creates a
                  "Biology 101" subject with three chapters: Cell Biology,
                  Genetics, and Evolution
                </li>
                <li className="text-muted-foreground">
                  <strong className="text-foreground">Content Creation:</strong>{" "}
                  Adds topics like "Mitochondria", "DNA Replication", "Natural
                  Selection" with detailed notes using the rich text editor
                </li>
                <li className="text-muted-foreground">
                  <strong className="text-foreground">Summaries:</strong>{" "}
                  Creates concise summaries for each topic and adds mnemonics
                  for complex processes
                </li>
                <li className="text-muted-foreground">
                  <strong className="text-foreground">AI Assistance:</strong>{" "}
                  Uses the AI Study Assistant to clarify confusing concepts and
                  get practice questions
                </li>
                <li className="text-muted-foreground">
                  <strong className="text-foreground">Progress Tracking:</strong>{" "}
                  Marks topics as "studied" after reviewing them, keeping track
                  of her preparation
                </li>
                <li className="text-muted-foreground">
                  <strong className="text-foreground">Export:</strong> Exports
                  each chapter to PDF for offline review and printing
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Technical Features */}
      <section className="container mx-auto px-4 py-16 bg-muted/30">
        <h3 className="text-3xl font-bold text-center mb-12">
          Technical Highlights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                AI Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Powered by Lovable AI with context-aware responses based on
                your actual study materials. Supports conversation threads and
                contextual filtering.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Real-time Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Auto-save functionality with debounced updates. All changes are
                persisted to the database in real-time for seamless experience.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5 text-purple-500" />
                Custom Editor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Built-in rich text editor with custom undo/redo system,
                intelligent list nesting, and comprehensive formatting options.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Card className="max-w-2xl mx-auto border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardHeader>
            <CardTitle className="text-3xl">Ready to Start?</CardTitle>
            <CardDescription className="text-base">
              Begin your organized study journey with all these powerful
              features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              onClick={() => navigate("/")}
              className="gap-2 text-lg px-8"
            >
              <BookOpen className="h-5 w-5" />
              Go to App
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>
          Built with React, TypeScript, Tailwind CSS, and Lovable Cloud (Supabase)
        </p>
      </footer>
    </div>
  );
};

export default Showcase;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  FolderTree,
  Type,
  Sparkles,
  CheckCircle,
  FileText,
  LayoutGrid,
  Trash2,
  Download,
  ChevronRight,
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: <FolderTree className="w-6 h-6" />,
      title: "Hierarchical Organization",
      description: "Structure your knowledge in Subjects → Chapters → Topics",
      details: [
        "Create subjects with custom colors for easy identification",
        "Organize chapters within subjects",
        "Break down chapters into individual topics",
        "Flexible navigation between all levels",
      ],
    },
    {
      icon: <Type className="w-6 h-6" />,
      title: "Rich Text Editor",
      description: "Powerful editor with advanced formatting capabilities",
      details: [
        "Bold, italic, underline, and strikethrough text",
        "Multiple heading levels (H1-H6)",
        "Bullet and numbered lists",
        "Block quotes and code blocks",
        "Text alignment options",
      ],
    },
    {
      icon: <LayoutGrid className="w-6 h-6" />,
      title: "Content Blocks",
      description: "Organize notes with flexible content blocks",
      details: [
        "Multiple content blocks per topic",
        "Hierarchical heading structure within blocks",
        "Expandable/collapsible sections",
        "Add notes to individual headings",
      ],
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Study Progress",
      description: "Track your learning progress effectively",
      details: [
        "Mark topics as 'studied'",
        "Visual progress indicators",
        "Quick overview of completion status",
        "Focus on what needs review",
      ],
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "AI Study Assistant",
      description: "Get help from AI when you need it",
      details: [
        "Context-aware chat interface",
        "Ask questions about your topics",
        "Get explanations and clarifications",
        "Generate summaries and memory aids",
      ],
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: "PDF Export",
      description: "Export your notes for offline study",
      details: [
        "Generate formatted PDFs",
        "Include all content and formatting",
        "Perfect for printing or sharing",
        "Maintain hierarchy and structure",
      ],
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Flexible Organization",
      description: "Move and reorganize with ease",
      details: [
        "Move topics between chapters",
        "Move chapters between subjects",
        "Drag-and-drop reordering",
        "Maintain data integrity",
      ],
    },
    {
      icon: <Trash2 className="w-6 h-6" />,
      title: "Recycle Bin",
      description: "Never lose important data",
      details: [
        "Soft delete for subjects, chapters, and topics",
        "Restore deleted items when needed",
        "View all deleted items in one place",
        "Permanently delete when ready",
      ],
    },
  ];

  const walkthrough = [
    {
      step: "1",
      title: "Create a Subject",
      content: "Start by creating a subject like 'Biology' or 'Mathematics'. Choose a color to make it easily recognizable.",
    },
    {
      step: "2",
      title: "Add Chapters",
      content: "Within each subject, create chapters to organize major topics. For example, 'Cell Biology' or 'Algebra'.",
    },
    {
      step: "3",
      title: "Create Topics",
      content: "Break down chapters into specific topics. Each topic can have multiple content blocks with rich text formatting.",
    },
    {
      step: "4",
      title: "Add Content",
      content: "Use the rich text editor to add notes, create hierarchical headings, and organize your study material.",
    },
    {
      step: "5",
      title: "Track Progress",
      content: "Mark topics as studied to track your progress. Use the AI assistant for help with difficult concepts.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">StudyBuilder</h1>
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-6 py-12">
          <h2 className="text-5xl font-bold tracking-tight">
            Your Smart Study Companion
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Organize your study materials with hierarchical structure, rich text editing, 
            and AI-powered assistance. Master any subject with intelligent note-taking.
          </p>
          <div className="flex gap-4 justify-center pt-4 flex-wrap">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Start Learning
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/library")}>
              <BookOpen className="w-4 h-4 mr-2" />
              Browse Notes Library
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate("/showcase")}>
              View Full Demo
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold">Powerful Features</h3>
            <p className="text-muted-foreground">
              Everything you need to organize and master your studies
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary"
                onClick={() => setActiveFeature(index)}
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {feature.icon}
                  </div>
                  <h4 className="font-semibold">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {/* Feature Details */}
          <Card className="p-8">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                {features[activeFeature].icon}
              </div>
              <div className="space-y-4 flex-1">
                <h4 className="text-2xl font-bold">{features[activeFeature].title}</h4>
                <p className="text-muted-foreground">{features[activeFeature].description}</p>
                <ul className="space-y-2">
                  {features[activeFeature].details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* Interactive Walkthrough */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold">How It Works</h3>
            <p className="text-muted-foreground">
              Get started in 5 simple steps
            </p>
          </div>

          <Tabs defaultValue="0" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {walkthrough.map((item, index) => (
                <TabsTrigger key={index} value={index.toString()}>
                  Step {item.step}
                </TabsTrigger>
              ))}
            </TabsList>
            {walkthrough.map((item, index) => (
              <TabsContent key={index} value={index.toString()}>
                <Card className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                        {item.step}
                      </div>
                      <h4 className="text-2xl font-bold">{item.title}</h4>
                    </div>
                    <p className="text-lg text-muted-foreground">{item.content}</p>
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* Example Use Case */}
        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold">Example Use Case</h3>
            <p className="text-muted-foreground">
              See how StudyBuilder helps organize complex subjects
            </p>
          </div>
          <Card className="p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-xl font-bold">Biology Subject</h4>
                  <p className="text-muted-foreground">Study advanced biological concepts</p>
                </div>
              </div>
              
              <div className="pl-8 space-y-4">
                <div className="flex items-start gap-4">
                  <FolderTree className="w-6 h-6 text-primary mt-1" />
                  <div className="space-y-2 flex-1">
                    <h5 className="font-semibold">Chapter: Cell Biology</h5>
                    <div className="pl-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Topic: Cell Membrane Structure</span>
                        <Badge variant="secondary" className="ml-2">Studied</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Topic: Organelles and Functions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Topic: Cellular Transport</span>
                        <Badge variant="secondary" className="ml-2">Studied</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-6 py-12">
          <h3 className="text-4xl font-bold">Ready to Transform Your Study Habits?</h3>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join students who are already using StudyBuilder to organize their learning and achieve better results.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started Free
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>Built with React, TypeScript, and Lovable Cloud</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

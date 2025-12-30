import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  ExternalLink,
  Brain,
  GraduationCap,
  BookMarked,
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const subjects = [
    {
      code: "MPC 001",
      title: "Cognitive Psychology, Learning and Memory",
      description: "Explore cognitive processes, memory systems, attention, perception, and problem-solving from an AI-enhanced perspective.",
      color: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    },
    {
      code: "MPC 002",
      title: "Life Span Development",
      description: "Study human development from conception to old age, covering physical, cognitive, and psychosocial aspects.",
      color: "bg-green-500/20 text-green-600 dark:text-green-400",
    },
    {
      code: "MPC 004",
      title: "Advanced Social Psychology",
      description: "Understand social cognition, attitudes, group dynamics, and applied social psychology concepts.",
      color: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
    },
  ];

  const features = [
    {
      icon: <FolderTree className="w-5 h-5" />,
      title: "Hierarchical Organization",
      description: "Subjects → Chapters → Topics structure",
    },
    {
      icon: <Type className="w-5 h-5" />,
      title: "Rich Text Editor",
      description: "Format notes with headings, lists, and more",
    },
    {
      icon: <LayoutGrid className="w-5 h-5" />,
      title: "Content Blocks",
      description: "Organize with collapsible heading trees",
    },
    {
      icon: <CheckCircle className="w-5 h-5" />,
      title: "Study Progress",
      description: "Track what you've studied",
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "AI Assistant",
      description: "Get help understanding concepts",
    },
    {
      icon: <Download className="w-5 h-5" />,
      title: "Export to Word",
      description: "Download notes for offline study",
    },
    {
      icon: <Trash2 className="w-5 h-5" />,
      title: "Recycle Bin",
      description: "Restore accidentally deleted content",
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Summaries & Mnemonics",
      description: "Quick revision aids for each topic",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">IGNOU Study Notes</h1>
          </div>
          <Button onClick={() => navigate("/library")}>
            <BookOpen className="w-4 h-4 mr-2" />
            Browse Notes
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 space-y-20">
        {/* Hero Section */}
        <section className="text-center space-y-6 py-8">
          <Badge variant="secondary" className="mb-4">
            <Brain className="w-3 h-3 mr-1" />
            AI-Enhanced Study Material
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            IGNOU MA Psychology Notes
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            First year notes for <span className="font-semibold text-foreground">MPC 001</span>, <span className="font-semibold text-foreground">MPC 002</span>, and <span className="font-semibold text-foreground">MPC 004</span> — 
            rewritten using AI for easy understanding and enhanced with insights from standard textbooks.
          </p>
          <div className="flex gap-4 justify-center pt-4 flex-wrap">
            <Button size="lg" onClick={() => navigate("/library")}>
              Start Reading
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </section>

        {/* Available Subjects */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold">Available Subjects</h3>
            <p className="text-muted-foreground">
              MA Psychology 1st Year study materials
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <Card
                key={subject.code}
                className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary group"
                onClick={() => navigate("/library")}
              >
                <div className="space-y-4">
                  <div className={`w-14 h-14 rounded-lg ${subject.color} flex items-center justify-center`}>
                    <BookMarked className="w-7 h-7" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">{subject.code}</Badge>
                    <h4 className="font-semibold text-lg">{subject.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {subject.description}
                  </p>
                  <div className="flex items-center text-primary text-sm font-medium group-hover:underline">
                    Browse notes <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* About the Notes */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold">About These Notes</h3>
            <p className="text-muted-foreground">
              How these study materials were created
            </p>
          </div>

          <Card className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold">IGNOU Foundation</h4>
                      <p className="text-sm text-muted-foreground">
                        Built on official IGNOU study material as the primary source
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold">AI-Rewritten for Clarity</h4>
                      <p className="text-sm text-muted-foreground">
                        Complex concepts simplified using AI for better understanding
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      <BookMarked className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Textbook Enhanced</h4>
                      <p className="text-sm text-muted-foreground">
                        Key concepts enriched with insights from standard psychology textbooks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Exam Ready</h4>
                      <p className="text-sm text-muted-foreground">
                        Structured to help with IGNOU term-end examination preparation
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold text-lg">Perfect for:</h4>
                <ul className="space-y-2">
                  {[
                    "IGNOU MA Psychology students",
                    "Quick revision before exams",
                    "Understanding difficult concepts",
                    "Self-paced learning",
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* Remix Section */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold">Create Your Own Notes</h3>
            <p className="text-muted-foreground">
              Like this app? Build your own version using Lovable AI
            </p>
          </div>

          <Card className="p-8 md:p-12 bg-primary/5 border-primary/20">
            <div className="space-y-8">
              <div className="text-center space-y-4 max-w-2xl mx-auto">
                <Badge variant="outline" className="mb-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Powered by Lovable AI
                </Badge>
                <p className="text-muted-foreground">
                  This notes app was built entirely using Lovable AI. You can remix it to create 
                  your own study notes for any subject — no coding required!
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="text-center space-y-2 p-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto font-bold">
                    1
                  </div>
                  <p className="text-sm font-medium">Visit lovable.dev</p>
                </div>
                <div className="text-center space-y-2 p-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto font-bold">
                    2
                  </div>
                  <p className="text-sm font-medium">Remix this project</p>
                </div>
                <div className="text-center space-y-2 p-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto font-bold">
                    3
                  </div>
                  <p className="text-sm font-medium">Customize for your subjects</p>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" asChild>
                  <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer">
                    Learn More About Lovable
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>

              {/* App Features */}
              <div className="pt-8 border-t border-primary/10">
                <h4 className="font-semibold text-center mb-6">App Features You'll Get</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-background/50">
                      <div className="text-primary flex-shrink-0 mt-0.5">
                        {feature.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{feature.title}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-6 py-12">
          <h3 className="text-3xl md:text-4xl font-bold">Start Studying Now</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Access all notes for free. No signup required.
          </p>
          <Button size="lg" onClick={() => navigate("/library")}>
            Browse Notes Library
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>Built with Lovable AI</p>
          <button 
            onClick={() => navigate("/auth")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Admin Login
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

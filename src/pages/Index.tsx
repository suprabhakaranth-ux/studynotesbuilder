import { useState } from "react";
import { Plus } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { TopicCard } from "@/components/TopicCard";
import { TopicEditor } from "@/components/TopicEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Topic {
  id: string;
  subjectId: string;
  title: string;
  summary?: string;
}

const Index = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  const handleNewSubject = () => {
    if (!newSubjectName.trim()) return;

    const newSubject: Subject = {
      id: Date.now().toString(),
      name: newSubjectName,
      color: colors[Math.floor(Math.random() * colors.length)],
    };

    setSubjects([...subjects, newSubject]);
    setNewSubjectName("");
    setDialogOpen(false);
    setActiveSubject(newSubject.id);

    toast({
      title: "Subject created",
      description: `${newSubject.name} has been added to your notes.`,
    });
  };

  const handleNewTopic = () => {
    if (!newTopicTitle.trim() || !activeSubject) return;

    const newTopic: Topic = {
      id: Date.now().toString(),
      subjectId: activeSubject,
      title: newTopicTitle,
    };

    setTopics([...topics, newTopic]);
    setNewTopicTitle("");
    setTopicDialogOpen(false);

    toast({
      title: "Topic created",
      description: `${newTopic.title} has been added.`,
    });
  };

  const activeTopics = topics.filter((t) => t.subjectId === activeSubject);
  const activeSubjectData = subjects.find((s) => s.id === activeSubject);
  const editingTopicData = topics.find((t) => t.id === editingTopic);

  if (editingTopic && editingTopicData) {
    return (
      <TopicEditor
        topicId={editingTopic}
        topicTitle={editingTopicData.title}
        onBack={() => setEditingTopic(null)}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar
        subjects={subjects}
        activeSubject={activeSubject}
        onSubjectSelect={setActiveSubject}
        onNewSubject={() => setDialogOpen(true)}
      />

      <div className="flex-1 overflow-auto">
        {activeSubject ? (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-foreground">
                  {activeSubjectData?.name}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {activeTopics.length} {activeTopics.length === 1 ? "topic" : "topics"}
                </p>
              </div>
              <Button onClick={() => setTopicDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Topic
              </Button>
            </div>

            {activeTopics.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">No topics yet</p>
                <Button variant="outline" onClick={() => setTopicDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first topic
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTopics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    onClick={() => setEditingTopic(topic.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Welcome to Psychology Notes
              </h2>
              <p className="text-muted-foreground mb-6">
                Select a subject from the sidebar or create a new one to get started
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Subject
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject-name">Subject Name</Label>
              <Input
                id="subject-name"
                placeholder="e.g., Cognitive Psychology"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNewSubject()}
              />
            </div>
            <Button onClick={handleNewSubject} className="w-full">
              Create Subject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic-title">Topic Title</Label>
              <Input
                id="topic-title"
                placeholder="e.g., Memory and Learning"
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNewTopic()}
              />
            </div>
            <Button onClick={handleNewTopic} className="w-full">
              Create Topic
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

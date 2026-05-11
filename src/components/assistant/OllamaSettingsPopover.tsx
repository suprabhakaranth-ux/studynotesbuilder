import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { getOllamaConfig, setOllamaConfig } from "@/lib/ai/ollamaService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onChange?: () => void;
}

export const OllamaSettingsPopover = ({ onChange }: Props) => {
  const initial = getOllamaConfig();
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [model, setModel] = useState(initial.model);
  const { toast } = useToast();

  const save = () => {
    setOllamaConfig({ baseUrl: baseUrl.trim(), model: model.trim() });
    toast({ title: "Ollama settings saved" });
    onChange?.();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Ollama
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Base URL</Label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="http://localhost:11434" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Model</Label>
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="llama3.1:8b" />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Ollama must be running locally. Start it with{" "}
          <code className="bg-muted px-1 rounded">OLLAMA_ORIGINS="*" ollama serve</code> so the browser can reach it.
        </p>
        <Button size="sm" className="w-full" onClick={save}>
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
};

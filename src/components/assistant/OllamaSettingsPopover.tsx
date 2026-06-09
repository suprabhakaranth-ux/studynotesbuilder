import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { getOllamaConfig, setOllamaConfig, ollamaService } from "@/lib/ai/ollamaService";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onChange?: () => void;
}

export const OllamaSettingsPopover = ({ onChange }: Props) => {
  const initial = getOllamaConfig();
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [model, setModel] = useState(initial.model);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const save = () => {
    setOllamaConfig({ baseUrl: baseUrl.trim(), model: model.trim() });
    toast({ title: "Ollama settings saved" });
    onChange?.();
  };

  const testNow = async () => {
    // Persist first so pingDetailed reads the new values.
    setOllamaConfig({ baseUrl: baseUrl.trim(), model: model.trim() });
    setTesting(true);
    const res = await ollamaService.pingDetailed();
    setTesting(false);
    if (res.ok) {
      toast({ title: "Ollama reachable", description: `Connected at ${res.baseUrl}` });
      onChange?.();
    } else {
      toast({ title: "Ollama unreachable", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Ollama
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Base URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://localhost:11435"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Model</Label>
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="llama3.1:8b" />
        </div>
        <div className="text-[11px] text-muted-foreground leading-relaxed space-y-1">
          <p>
            Because this app is served over HTTPS, the browser won't reach{" "}
            <code className="bg-muted px-1 rounded">http://localhost:11434</code> directly. Run a
            local HTTPS proxy in front of Ollama and point Base URL at it.
          </p>
          <p>
            Minimal Caddy setup:{" "}
            <code className="bg-muted px-1 rounded">localhost:11435 → 127.0.0.1:11434</code> with{" "}
            <code className="bg-muted px-1 rounded">local_certs</code>. Then visit{" "}
            <a
              href="https://localhost:11435/api/tags"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              https://localhost:11435/api/tags
            </a>{" "}
            once to trust the cert.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={testNow} disabled={testing}>
            {testing ? "Testing…" : "Test now"}
          </Button>
          <Button size="sm" className="flex-1" onClick={save}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

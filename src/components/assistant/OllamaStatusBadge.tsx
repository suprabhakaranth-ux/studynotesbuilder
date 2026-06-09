import { useEffect, useState } from "react";
import { ollamaService } from "@/lib/ai/ollamaService";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  refreshKey?: number;
}

export const OllamaStatusBadge = ({ refreshKey = 0 }: Props) => {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");
  const [lastError, setLastError] = useState<string | null>(null);
  const { toast } = useToast();

  const check = async () => {
    setStatus("checking");
    const res = await ollamaService.pingDetailed();
    if (res.ok) {
      setStatus("ok");
      setLastError(null);
    } else {
      setStatus("down");
      setLastError(res.error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const res = await ollamaService.pingDetailed();
      if (cancelled) return;
      if (res.ok) {
        setStatus("ok");
        setLastError(null);
      } else {
        setStatus("down");
        setLastError(res.error);
      }
    };
    run();
    const id = setInterval(run, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshKey]);

  const color =
    status === "ok" ? "bg-green-500" : status === "down" ? "bg-red-500" : "bg-amber-500";
  const label =
    status === "ok" ? "Ollama connected" : status === "down" ? "Ollama unreachable" : "Checking…";

  const runTest = async () => {
    const res = await ollamaService.pingDetailed();
    if (res.ok) {
      setStatus("ok");
      setLastError(null);
      toast({ title: "Ollama reachable", description: `Connected at ${res.baseUrl}` });
    } else {
      setStatus("down");
      setLastError(res.error);
      toast({ title: "Ollama unreachable", description: res.error, variant: "destructive" });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <span className={`w-2 h-2 rounded-full ${color}`} />
          <span>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">Ollama connection</span>
          <Button size="sm" variant="outline" onClick={runTest} className="h-7">
            Test connection
          </Button>
        </div>
        {status === "ok" ? (
          <p className="text-muted-foreground">
            Talking directly to your local Ollama via the HTTPS proxy.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-muted-foreground leading-relaxed">
              Browsers block HTTPS → HTTP requests, so the app talks to Ollama through a local HTTPS
              proxy at <code className="bg-muted px-1 rounded">https://localhost:11435</code>.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              One-time setup (Caddy):
            </p>
            <pre className="bg-muted p-2 rounded text-[10px] overflow-x-auto whitespace-pre">{`brew install caddy   # or choco/apt

# Caddyfile:
{ local_certs }
localhost:11435 {
  reverse_proxy 127.0.0.1:11434
  header Access-Control-Allow-Origin "*"
}

sudo caddy run --config ./Caddyfile`}</pre>
            <p className="text-muted-foreground leading-relaxed">
              Then open{" "}
              <a
                href="https://localhost:11435/api/tags"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                https://localhost:11435/api/tags
              </a>{" "}
              once to trust Caddy's local cert.
            </p>
            {lastError && (
              <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive">
                <div className="font-medium mb-1">Last error</div>
                <div className="break-words">{lastError}</div>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

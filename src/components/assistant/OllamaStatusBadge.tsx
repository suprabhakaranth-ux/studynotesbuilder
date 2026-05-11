import { useEffect, useState } from "react";
import { ollamaService } from "@/lib/ai/ollamaService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  refreshKey?: number;
}

export const OllamaStatusBadge = ({ refreshKey = 0 }: Props) => {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");

  useEffect(() => {
    let cancelled = false;
    setStatus("checking");
    ollamaService.ping().then((ok) => {
      if (!cancelled) setStatus(ok ? "ok" : "down");
    });
    const id = setInterval(() => {
      ollamaService.ping().then((ok) => {
        if (!cancelled) setStatus(ok ? "ok" : "down");
      });
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [refreshKey]);

  const color =
    status === "ok" ? "bg-green-500" : status === "down" ? "bg-red-500" : "bg-amber-500";
  const label =
    status === "ok" ? "Ollama connected" : status === "down" ? "Ollama unreachable" : "Checking…";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            <span>{label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {status === "down"
            ? "Start Ollama locally with OLLAMA_ORIGINS=\"*\" ollama serve and pull a model (e.g. llama3.1:8b)."
            : "Talking directly to your local Ollama instance."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

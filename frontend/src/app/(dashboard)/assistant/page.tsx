"use client";

import { AIAssistant } from "@/components/ai/AIAssistant";

export default function AssistantPage() {
  return (
    <div className="h-full p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground mt-1">
          Ask questions about your spatial data and get AI-powered insights
        </p>
      </div>

      <div className="h-[calc(100vh-12rem)]">
        <AIAssistant className="h-full" />
      </div>
    </div>
  );
}

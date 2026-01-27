"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  MapPin,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Copy,
  Check,
  MessageSquare,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteAnalysis } from '@/lib/api/qld-identify';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  siteContext?: SiteAnalysis | null;
  onClose: () => void;
  className?: string;
}

const SUGGESTED_QUESTIONS = [
  "What are the main constraints for this site?",
  "Is this site suitable for residential development?",
  "What approvals might I need?",
  "Explain the flood overlay impact",
  "What environmental assessments are required?",
];

export function AIAssistant({
  siteContext,
  onClose,
  className,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send message to AI
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          siteContext: siteContext ? {
            property: siteContext.property,
            coordinates: siteContext.coordinates,
            constraints: siteContext.constraints.map(c => ({
              layerName: c.layerName,
              category: c.category,
              severity: c.severity,
            })),
          } : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  }, [messages, siteContext, isLoading]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Copy message
  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "absolute top-20 right-4 bottom-20 w-[400px] z-10 pointer-events-auto",
        "bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500/30 rounded-lg blur-md animate-pulse" />
              <div className="relative p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                <Sparkles className="h-4 w-4 text-violet-500" />
              </div>
            </div>
            <div>
              <h2 className="font-semibold">Siteora AI</h2>
              <p className="text-[10px] text-muted-foreground">Powered by Claude</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <AnimatePresence>
              {messages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-violet-500/10 hover:text-violet-600"
                    onClick={clearConversation}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Site Context Badge */}
        <AnimatePresence>
          {siteContext?.property && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 flex items-center gap-2"
            >
              <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 border-violet-500/20">
                <MapPin className="h-3 w-3 mr-1" />
                {siteContext.property.lotPlan}
              </Badge>
              {siteContext.constraints.length > 0 && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {siteContext.constraints.length} constraints
                </Badge>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Welcome Message */}
            <div className="text-center py-6">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 bg-violet-500/20 rounded-full animate-ping opacity-30" />
                <div className="relative bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-full p-4">
                  <Bot className="h-8 w-8 text-violet-600" />
                </div>
              </div>
              <h3 className="mt-4 font-semibold">How can I help?</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-[280px] mx-auto">
                Ask me about planning constraints, development potential, or site suitability.
              </p>
            </div>

            {/* Suggested Questions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Suggested questions
              </div>
              {SUGGESTED_QUESTIONS.map((question, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => sendMessage(question)}
                  className="w-full text-left text-sm p-3 rounded-lg border border-border/50 hover:bg-violet-500/5 hover:border-violet-500/30 transition-all group"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {question}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            <AnimatePresence>
              {messages.map((message, idx) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
                      : 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-600'
                  )}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  <div className={cn(
                    "flex-1 max-w-[85%]",
                    message.role === 'user' ? 'text-right' : ''
                  )}>
                    <div className={cn(
                      "inline-block rounded-xl p-3 text-sm",
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm'
                        : 'bg-muted/50 border border-border/50 rounded-tl-sm'
                    )}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>

                    <div className={cn(
                      "flex items-center gap-2 mt-1.5",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}>
                      <span className="text-[10px] text-muted-foreground">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => copyMessage(message.id, message.content)}
                          className="text-muted-foreground hover:text-violet-600 transition-colors p-1 hover:bg-violet-500/10 rounded"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center shadow-sm">
                  <Bot className="h-4 w-4 text-violet-600" />
                </div>
                <div className="bg-muted/50 border border-border/50 rounded-xl rounded-tl-sm p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive flex items-center gap-2"
            >
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about this site..."
            disabled={isLoading}
            className="flex-1 h-10 bg-background/50 border-border/50 focus:border-violet-500/50 focus:ring-violet-500/20 transition-all"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="h-10 px-4 bg-violet-600 hover:bg-violet-700 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI responses are for guidance only. Consult professionals for decisions.
        </p>
      </div>
    </motion.div>
  );
}

export default AIAssistant;

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout, { type SidebarItem } from '../../layouts/DashboardLayout';
import { FiSend, FiTrash2 } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

const API_CONFIG = {
    BASE_URL: 'https://ace-crane-central.ngrok-free.app/api/generate',
    MODEL: 'mixtral-8x7b-32768'
};

const MarkdownComponents: any = {
    h1: ({ children }: { children: React.ReactNode }) => (
        <h1 className="text-xl font-bold text-primary mb-2">{children}</h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
        <h2 className="text-lg font-bold text-primary mb-2">{children}</h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-base font-bold text-primary mb-1">{children}</h3>
    ),
    p: ({ children }: { children: React.ReactNode }) => (
        <p className="mb-3 leading-relaxed">{children}</p>
    ),
    blockquote: ({ children }: { children: React.ReactNode }) => (
        <blockquote className="border-l-4 border-accent pl-4 italic text-text-muted my-3">
            {children}
        </blockquote>
    ),
    ul: ({ children }: { children: React.ReactNode }) => (
        <ul className="list-disc pl-6 mb-3">{children}</ul>
    ),
    ol: ({ children }: { children: React.ReactNode }) => (
        <ol className="list-decimal pl-6 mb-3">{children}</ol>
    ),
    li: ({ children }: { children: React.ReactNode }) => (
        <li className="mb-1">{children}</li>
    ),
    code: ({ children }: { children: React.ReactNode }) => (
        <code className="bg-surface-2 px-2 py-1 rounded text-sm font-mono">
            {children}
        </code>
    ),
    pre: ({ children }: { children: React.ReactNode }) => (
        <pre className="bg-surface-2 p-4 rounded overflow-x-auto my-3">
            {children}
        </pre>
    )
};

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Welcome to Tadabbur AI Chat! You can ask me questions about the Quran, Islamic teachings, or request spiritual guidance. How can I help you today?',
            isUser: false,
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sidebarItems: SidebarItem[] = [
        { label: "Home", path: "/home" },
        { label: "Read Quran", path: "/surahs" },
        { label: "Notes", path: "/notes" }
    ];

    const welcomeMessage = useMemo(() => ({
        id: '1',
        text: 'Welcome to Tadabbur AI Chat! You can ask me questions about the Quran, Islamic teachings, or request spiritual guidance. How can I help you today?',
        isUser: false,
        timestamp: new Date()
    }), []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const sendMessage = useCallback(async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputMessage,
            isUser: true,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();

            const response = await fetch(API_CONFIG.BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: API_CONFIG.MODEL,
                    prompt: `You are an Islamic AI assistant helping with understanding the Quran and Islamic teachings. Please provide thoughtful, accurate, and respectful responses based on Islamic knowledge. User question: "${inputMessage}"`
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;
            let aiResponse = '';

            const aiMessageId = (Date.now() + 1).toString();
            const aiMessage: Message = {
                id: aiMessageId,
                text: '',
                isUser: false,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    
                    try {
                        const jsonResponse = JSON.parse(chunk);
                        if (jsonResponse.response) {
                            aiResponse += jsonResponse.response;
                        }
                    } catch {
                        aiResponse += chunk;
                    }

                    setMessages(prev => {
                        const updatedMessages = [...prev];
                        const lastMessage = updatedMessages[updatedMessages.length - 1];

                        if (lastMessage && !lastMessage.isUser && lastMessage.id === aiMessageId) {
                            lastMessage.text = aiResponse;
                        }

                        return updatedMessages;
                    });
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Request was aborted');
                return;
            }

            console.error('Error sending message:', error);
            const errorMessage: Message = {
                id: (Date.now() + 2).toString(),
                text: 'Sorry, I encountered an error while processing your message. Please try again.',
                isUser: false,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    }, [inputMessage, isLoading]);

    const clearChat = useCallback(() => {
        if (confirm('Are you sure you want to clear the chat history?')) {
            setMessages([welcomeMessage]);
        }
    }, [welcomeMessage]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    const memoizedMessages = useMemo(() => messages, [messages]);

    return (
        <DashboardLayout
            sidebarItems={sidebarItems}
            screenTitle="Chat with Quran"
            userProfile={
                <button
                    onClick={clearChat}
                    className="flex items-center gap-2 text-sm px-3 py-1 rounded hover:bg-surface-2 transition-colors text-text"
                    aria-label="Clear chat history"
                >
                    <FiTrash2 /> Clear Chat
                </button>
            }
        >
            <div className="h-full flex flex-col">
                <div 
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                    role="log"
                    aria-live="polite"
                    aria-label="Chat messages"
                >
                    {memoizedMessages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                                    message.isUser
                                        ? 'bg-primary text-on-primary rounded-br-none'
                                        : 'bg-surface-2 text-text rounded-bl-none'
                                }`}
                            >
                                <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={MarkdownComponents}
                                    >
                                        {message.text}
                                    </ReactMarkdown>
                                </div>
                                <p className={`text-xs mt-2 ${
                                    message.isUser ? 'text-on-primary/70' : 'text-text-muted'
                                }`}>
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-surface-2 text-text max-w-xs lg:max-w-md px-4 py-3 rounded-lg rounded-bl-none shadow-sm">
                                <div className="flex items-center space-x-2">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-border p-4">
                    <div className="flex space-x-2">
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Ask about Quranic verses, Islamic teachings, or seek spiritual guidance..."
                            className="flex-1 border border-border rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-surface text-text"
                            rows={2}
                            disabled={isLoading}
                            aria-label="Type your message"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !inputMessage.trim()}
                            className="px-5 py-3 bg-primary text-on-primary rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            aria-label="Send message"
                        >
                            <FiSend />
                            <span className="sr-only">Send</span>
                        </button>
                    </div>
                    <p className="text-xs text-text-muted mt-2 text-center">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}

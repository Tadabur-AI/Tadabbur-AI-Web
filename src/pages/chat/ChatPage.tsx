import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout, { type sidebarItems } from '../../layouts/DashboardLayout';
import { FiSend, FiTrash2 } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

// Constants for API configuration
const API_CONFIG = {
    BASE_URL: 'https://ace-crane-central.ngrok-free.app/api/generate',
    MODEL: 'mixtral-8x7b-32768'
};

// Custom components for markdown rendering
const MarkdownComponents: any = {
    h1: ({ children }: { children: React.ReactNode }) => (
        <h1 className="text-xl font-bold text-primary mb-2">{children}</h1>
    ),
    h2: ({ children }: { children: React.ReactNode }) => (
        <h2 className="text-lg font-bold text-secondary mb-2">{children}</h2>
    ),
    h3: ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-base font-bold text-secondary mb-1">{children}</h3>
    ),
    p: ({ children }: { children: React.ReactNode }) => (
        <p className="mb-3 leading-relaxed">{children}</p>
    ),
    blockquote: ({ children }: { children: React.ReactNode }) => (
        <blockquote className="border-l-4 border-accent pl-4 italic text-muted my-3">
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
        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
            {children}
        </code>
    ),
    pre: ({ children }: { children: React.ReactNode }) => (
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto my-3">
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

    const sidebarItems: sidebarItems[] = [
        { label: "Home", path: "/home" },
        { label: "Read Quran", path: "/surahs" },
        { label: "Notes", path: "/notes" }
    ];

    // Memoize the welcome message to prevent unnecessary re-renders
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

    // Cleanup function to abort ongoing requests
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const sendMessage = useCallback(async () => {
        if (!inputMessage.trim() || isLoading) return;

        // Create user message
        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputMessage,
            isUser: true,
            timestamp: new Date()
        };

        // Update UI immediately
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            // Abort any ongoing requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Create new abort controller for this request
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

            // Create initial AI message
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
                        // Try to parse as JSON first
                        const jsonResponse = JSON.parse(chunk);
                        if (jsonResponse.response) {
                            aiResponse += jsonResponse.response;
                        }
                    } catch {
                        // If not JSON, treat as plain text
                        aiResponse += chunk;
                    }

                    // Update the AI message with the new content
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

    // Memoize the messages list for performance
    const memoizedMessages = useMemo(() => messages, [messages]);

    return (
        <DashboardLayout
            sidebarItems={sidebarItems}
            screenTitle="Chat with Quran"
            userProfile={
                <button
                    onClick={clearChat}
                    className="flex items-center gap-2 text-sm px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                    aria-label="Clear chat history"
                >
                    <FiTrash2 /> Clear Chat
                </button>
            }
        >
            <div className="h-full flex flex-col">
                {/* Messages Area */}
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
                                        ? 'bg-primary text-white rounded-br-none'
                                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
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
                                    message.isUser ? 'text-gray-200' : 'text-gray-500'
                                }`}>
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 text-gray-800 max-w-xs lg:max-w-md px-4 py-3 rounded-lg rounded-bl-none shadow-sm">
                                <div className="flex items-center space-x-2">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-200 p-4">
                    <div className="flex space-x-2">
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Ask about Quranic verses, Islamic teachings, or seek spiritual guidance..."
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            rows={2}
                            disabled={isLoading}
                            aria-label="Type your message"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !inputMessage.trim()}
                            className="px-5 py-3 bg-primary text-white rounded-lg hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            aria-label="Send message"
                        >
                            <FiSend />
                            <span className="sr-only">Send</span>
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Press Enter to send, Shift+Enter for new line
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}

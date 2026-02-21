import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DashboardLayout from '../../layouts/DashboardLayout';
import { FiPlus, FiTrash2, FiEdit3, FiSave, FiX } from 'react-icons/fi';

interface Note {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export default function NotesPage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingContent, setEditingContent] = useState('');
    const [editingTitle, setEditingTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);



    useEffect(() => {
        const savedNotes = localStorage.getItem('tadabbur-notes');
        if (savedNotes) {
            const parsedNotes = JSON.parse(savedNotes).map((note: any) => ({
                ...note,
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt)
            }));
            setNotes(parsedNotes);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('tadabbur-notes', JSON.stringify(notes));
    }, [notes]);

    const createNewNote = () => {
        setIsCreating(true);
        setEditingTitle('New Note');
        setEditingContent('# New Note\n\nWrite your reflection here...');
        setSelectedNote(null);
        setIsEditing(true);
    };

    const saveNote = () => {
        if (isCreating) {
            const newNote: Note = {
                id: Date.now().toString(),
                title: editingTitle || 'Untitled',
                content: editingContent,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            setNotes(prev => [newNote, ...prev]);
            setSelectedNote(newNote);
            setIsCreating(false);
        } else if (selectedNote) {
            const updatedNote = {
                ...selectedNote,
                title: editingTitle,
                content: editingContent,
                updatedAt: new Date()
            };
            setNotes(prev => prev.map(note => 
                note.id === selectedNote.id ? updatedNote : note
            ));
            setSelectedNote(updatedNote);
        }
        setIsEditing(false);
    };

    const deleteNote = (noteId: string) => {
        if (confirm('Are you sure you want to delete this note?')) {
            setNotes(prev => prev.filter(note => note.id !== noteId));
            if (selectedNote?.id === noteId) {
                setSelectedNote(null);
            }
        }
    };

    const startEditing = () => {
        if (selectedNote) {
            setEditingTitle(selectedNote.title);
            setEditingContent(selectedNote.content);
            setIsEditing(true);
        }
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setIsCreating(false);
        setEditingTitle('');
        setEditingContent('');
    };

    return (
        <DashboardLayout
            sidebarItems={notes.map((note) => ({
                label: note.title,
                path: `/notes`,
                onClick: () => setSelectedNote(note)
            }))}
            screenTitle="My Notes"
            userProfile={
                <button
                    onClick={createNewNote}
                    className="flex items-center gap-2 text-sm px-3 py-1 rounded hover:bg-surface-2 text-text"
                >
                    <FiPlus /> New Note
                </button>
            }
        >
            <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    {selectedNote && !isEditing && (
                        <>
                            <h1 className="text-xl font-bold text-text">{selectedNote.title}</h1>
                            <div className="flex gap-2">
                                <button
                                    onClick={startEditing}
                                    className="flex items-center gap-2 text-sm px-3 py-1 rounded hover:bg-surface-2 text-text"
                                >
                                    <FiEdit3 /> Edit
                                </button>
                                <button
                                    onClick={() => deleteNote(selectedNote.id)}
                                    className="flex items-center gap-2 text-sm px-3 py-1 rounded text-danger hover:bg-danger/10"
                                >
                                    <FiTrash2 /> Delete
                                </button>
                            </div>
                        </>
                    )}
                    
                    {isEditing && (
                        <>
                            <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="text-xl font-bold border-none outline-none bg-transparent flex-1 text-text"
                                placeholder="Note title..."
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={saveNote}
                                    className="flex items-center gap-2 text-sm px-3 py-1 rounded bg-primary text-on-primary hover:bg-primary-hover"
                                >
                                    <FiSave /> Save
                                </button>
                                <button
                                    onClick={cancelEditing}
                                    className="flex items-center gap-2 text-sm px-3 py-1 rounded hover:bg-surface-2 text-text"
                                >
                                    <FiX /> Cancel
                                </button>
                            </div>
                        </>
                    )}
                    
                    {!selectedNote && !isEditing && (
                        <div className="text-center w-full">
                            <p className="text-text-muted">Select a note or create a new one</p>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden">
                    {isEditing ? (
                        <div className="h-full flex">
                            <div className="w-1/2 border-r border-border">
                                <textarea
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    className="w-full h-full p-4 border-none outline-none resize-none font-mono text-sm bg-surface text-text"
                                    placeholder="Write your note in Markdown..."
                                />
                            </div>
                            
                            <div className="w-1/2 p-4 overflow-y-auto bg-surface">
                                <div className="prose prose-lg max-w-none">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({children}) => <h1 className="text-2xl font-bold text-primary mb-4">{children}</h1>,
                                            h2: ({children}) => <h2 className="text-xl font-bold text-primary mb-3">{children}</h2>,
                                            h3: ({children}) => <h3 className="text-lg font-bold text-primary mb-2">{children}</h3>,
                                            p: ({children}) => <p className="mb-3 leading-relaxed text-text">{children}</p>,
                                            blockquote: ({children}) => <blockquote className="border-l-4 border-accent pl-4 italic text-text-muted">{children}</blockquote>,
                                            ul: ({children}) => <ul className="list-disc pl-6 mb-3">{children}</ul>,
                                            ol: ({children}) => <ol className="list-decimal pl-6 mb-3">{children}</ol>,
                                            li: ({children}) => <li className="mb-1">{children}</li>,
                                            code: ({children}) => <code className="bg-surface-2 px-2 py-1 rounded text-sm font-mono">{children}</code>,
                                            pre: ({children}) => <pre className="bg-surface-2 p-4 rounded overflow-x-auto">{children}</pre>
                                        }}
                                    >
                                        {editingContent}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ) : selectedNote ? (
                        <div className="p-6 overflow-y-auto h-full bg-surface">
                            <div className="prose prose-lg max-w-none">
                                <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({children}) => <h1 className="text-2xl font-bold text-primary mb-4">{children}</h1>,
                                        h2: ({children}) => <h2 className="text-xl font-bold text-primary mb-3">{children}</h2>,
                                        h3: ({children}) => <h3 className="text-lg font-bold text-primary mb-2">{children}</h3>,
                                        p: ({children}) => <p className="mb-3 leading-relaxed text-text">{children}</p>,
                                        blockquote: ({children}) => <blockquote className="border-l-4 border-accent pl-4 italic text-text-muted">{children}</blockquote>,
                                        ul: ({children}) => <ul className="list-disc pl-6 mb-3">{children}</ul>,
                                        ol: ({children}) => <ol className="list-decimal pl-6 mb-3">{children}</ol>,
                                        li: ({children}) => <li className="mb-1">{children}</li>,
                                        code: ({children}) => <code className="bg-surface-2 px-2 py-1 rounded text-sm font-mono">{children}</code>,
                                        pre: ({children}) => <pre className="bg-surface-2 p-4 rounded overflow-x-auto">{children}</pre>
                                    }}
                                >
                                    {selectedNote.content}
                                </ReactMarkdown>
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-border text-sm text-text-muted">
                                <p>Created: {selectedNote.createdAt.toLocaleDateString()}</p>
                                <p>Last updated: {selectedNote.updatedAt.toLocaleDateString()}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full bg-surface">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-text-muted mb-4">No note selected</h2>
                                <p className="text-text-muted mb-6">Create your first note to get started</p>
                                <button
                                    onClick={createNewNote}
                                    className="flex items-center gap-2 mx-auto px-4 py-2 rounded hover:bg-surface-2 text-text"
                                >
                                    <FiPlus /> Create New Note
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

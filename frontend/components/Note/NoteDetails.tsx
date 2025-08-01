import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    PencilSquareIcon,
    TrashIcon,
    TagIcon,
    DocumentTextIcon,
    FolderIcon,
} from '@heroicons/react/24/solid';
import ConfirmDialog from '../Shared/ConfirmDialog';
import NoteModal from './NoteModal';
import MarkdownRenderer from '../Shared/MarkdownRenderer';
import { Note } from '../../entities/Note';
import {
    fetchNotes,
    deleteNote as apiDeleteNote,
    updateNote as apiUpdateNote,
} from '../../utils/notesService';
import { createProject, fetchProjects } from '../../utils/projectsService';
import { Project } from '../../entities/Project';

const NoteDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [note, setNote] = useState<Note | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] =
        useState<boolean>(false);
    const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [projects, setProjects] = useState<Project[]>([]);
    const navigate = useNavigate();

    // Dispatch global modal events

    useEffect(() => {
        const fetchNote = async () => {
            try {
                setIsLoading(true);
                const notes = await fetchNotes();
                const foundNote = notes.find((n: Note) => n.id === Number(id));
                setNote(foundNote || null);
                if (!foundNote) {
                    setIsError(true);
                }
            } catch (err) {
                setIsError(true);
                console.error('Error fetching note:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNote();
    }, [id]);

    // Load projects for the modal
    useEffect(() => {
        const loadProjects = async () => {
            try {
                const fetchedProjects = await fetchProjects('all', '');
                setProjects(fetchedProjects);
            } catch (error) {
                console.error('Error loading projects:', error);
            }
        };
        loadProjects();
    }, []);

    const handleDeleteNote = async () => {
        if (!noteToDelete) return;
        try {
            await apiDeleteNote(noteToDelete.id!);
            navigate('/notes');
        } catch (err) {
            console.error('Error deleting note:', err);
        }
    };

    const handleSaveNote = async (updatedNote: Note) => {
        try {
            if (updatedNote.id !== undefined) {
                const savedNote = await apiUpdateNote(
                    updatedNote.id,
                    updatedNote
                );
                setNote(savedNote);
            } else {
                console.error('Error: Note ID is undefined.');
            }
        } catch (err) {
            console.error('Error saving note:', err);
        }
        setIsNoteModalOpen(false);
    };

    const handleEditNote = () => {
        setIsNoteModalOpen(true);
    };

    const handleCreateProject = async (name: string) => {
        try {
            const newProject = await createProject({
                name,
                priority: 'medium',
            });
            setProjects((prev) => [...prev, newProject]);
            return newProject;
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    };

    const handleOpenConfirmDialog = (note: Note) => {
        setNoteToDelete(note);
        setIsConfirmDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                    Loading note details...
                </div>
            </div>
        );
    }

    if (isError || !note) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-red-500 text-lg">
                    {isError
                        ? 'Error loading note details.'
                        : 'Note not found.'}
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-center px-4 lg:px-2">
            <div className="w-full max-w-5xl">
                {/* Header Section with Title and Action Buttons */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <DocumentTextIcon className="h-6 w-6 text-xl mr-2" />
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-light text-gray-900 dark:text-gray-100">
                                {note.title}
                            </h2>
                            {/* Project and Tags under title */}
                            {(note.project ||
                                note.Project ||
                                (note.tags && note.tags.length > 0) ||
                                (note.Tags && note.Tags.length > 0)) && (
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {(note.project || note.Project) && (
                                        <div className="flex items-center">
                                            <FolderIcon className="h-3 w-3 mr-1" />
                                            <Link
                                                to={`/project/${(note.project || note.Project)?.id}`}
                                                className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                                            >
                                                {
                                                    (
                                                        note.project ||
                                                        note.Project
                                                    )?.name
                                                }
                                            </Link>
                                        </div>
                                    )}
                                    {(note.project || note.Project) &&
                                        ((note.tags && note.tags.length > 0) ||
                                            (note.Tags &&
                                                note.Tags.length > 0)) && (
                                            <span className="mx-2">•</span>
                                        )}
                                    {((note.tags && note.tags.length > 0) ||
                                        (note.Tags &&
                                            note.Tags.length > 0)) && (
                                        <div className="flex items-center">
                                            <TagIcon className="h-3 w-3 mr-1" />
                                            <span>
                                                {(note.tags || note.Tags || [])
                                                    .map((tag) => tag.name)
                                                    .join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                        <button
                            onClick={handleEditNote}
                            className="text-gray-500 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none"
                            aria-label={`Edit ${note.title}`}
                            title={`Edit ${note.title}`}
                        >
                            <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => handleOpenConfirmDialog(note)}
                            className="text-gray-500 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                            aria-label={`Delete ${note.title}`}
                            title={`Delete ${note.title}`}
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                {/* Note Content */}
                <div className="mb-6 bg-white dark:bg-gray-900 shadow-md rounded-lg p-6">
                    <MarkdownRenderer content={note.content} />
                </div>
                {/* NoteModal for editing */}
                {isNoteModalOpen && (
                    <NoteModal
                        isOpen={isNoteModalOpen}
                        onClose={() => setIsNoteModalOpen(false)}
                        onSave={handleSaveNote}
                        onDelete={async (noteId) => {
                            try {
                                await apiDeleteNote(noteId);
                                navigate('/notes');
                            } catch (err) {
                                console.error('Error deleting note:', err);
                            }
                        }}
                        note={note}
                        projects={projects}
                        onCreateProject={handleCreateProject}
                    />
                )}
                {/* ConfirmDialog */}
                {isConfirmDialogOpen && noteToDelete && (
                    <ConfirmDialog
                        title="Delete Note"
                        message={`Are you sure you want to delete the note "${noteToDelete.title}"?`}
                        onConfirm={handleDeleteNote}
                        onCancel={() => {
                            setIsConfirmDialogOpen(false);
                            setNoteToDelete(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default NoteDetails;

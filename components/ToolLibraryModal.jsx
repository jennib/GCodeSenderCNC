
import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, Pencil } from './Icons';

const h = React.createElement;

const ToolLibraryModal = ({ isOpen, onCancel, onSave, library }) => {
    const [localLibrary, setLocalLibrary] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTool, setCurrentTool] = useState({ id: null, name: '', diameter: '' });

    useEffect(() => {
        if (isOpen) {
            // Ensure every tool has a unique ID, even if not saved before.
            setLocalLibrary(library.map((tool, index) => ({ ...tool, id: tool.id || Date.now() + index })));
        }
    }, [isOpen, library]);

    if (!isOpen) return null;

    const handleEdit = (tool) => {
        setCurrentTool(tool);
        setIsEditing(true);
    };

    const handleAddNew = () => {
        setCurrentTool({ id: null, name: '', diameter: '' });
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setCurrentTool({ id: null, name: '', diameter: '' });
    };

    const handleSaveTool = () => {
        if (currentTool.name.trim() === '' || currentTool.diameter === '' || isNaN(parseFloat(currentTool.diameter))) return;

        const toolToSave = { ...currentTool, diameter: parseFloat(currentTool.diameter) };

        if (currentTool.id) { // Editing existing
            setLocalLibrary(lib => lib.map(t => t.id === toolToSave.id ? toolToSave : t));
        } else { // Adding new
            setLocalLibrary(lib => [...lib, { ...toolToSave, id: Date.now() }]);
        }
        handleCancelEdit();
    };

    const handleDelete = (toolId) => {
        if (window.confirm('Are you sure you want to delete this tool?')) {
            setLocalLibrary(lib => lib.filter(t => t.id !== toolId));
        }
    };

    const handleSaveAndClose = () => {
        onSave(localLibrary);
        onCancel();
    };

    return h('div', {
        className: 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center',
        onClick: onCancel, 'aria-modal': true, role: 'dialog'
    },
        h('div', {
            className: 'bg-surface rounded-lg shadow-2xl w-full max-w-md border border-secondary transform transition-all max-h-[80vh] flex flex-col',
            onClick: e => e.stopPropagation()
        },
            h('div', { className: 'p-6 border-b border-secondary flex justify-between items-center flex-shrink-0' },
                h('h2', { className: 'text-2xl font-bold text-text-primary' }, 'Tool Library'),
                h('button', { onClick: onCancel, className: "p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-secondary" }, h(X, { className: 'w-6 h-6' }))
            ),
            h('div', { className: 'p-6 space-y-4 overflow-y-auto' },
                !isEditing ?
                    h('button', {
                        onClick: handleAddNew,
                        className: 'w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-white font-semibold rounded-md hover:bg-secondary-focus focus:outline-none focus:ring-2 focus:ring-primary'
                    }, h(Plus, { className: 'w-5 h-5' }), 'Add New Tool')
                :
                    h('div', { className: 'bg-background p-4 rounded-md border border-primary' },
                        h('h3', { className: 'font-bold mb-2' }, currentTool.id ? 'Edit Tool' : 'Add Tool'),
                         h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                            h('div', null,
                                h('label', { className: 'block text-sm font-medium text-text-secondary mb-1' }, 'Tool Name'),
                                h('input', {
                                    type: 'text',
                                    placeholder: 'e.g., 1/4" 2-Flute Endmill',
                                    value: currentTool.name,
                                    onChange: e => setCurrentTool(prev => ({ ...prev, name: e.target.value })),
                                    className: 'w-full bg-secondary border border-secondary rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary'
                                })
                            ),
                            h('div', null,
                                h('label', { className: 'block text-sm font-medium text-text-secondary mb-1' }, 'Diameter (mm)'),
                                h('input', {
                                    type: 'number',
                                    placeholder: 'e.g., 6.35',
                                    value: currentTool.diameter,
                                    onChange: e => setCurrentTool(prev => ({ ...prev, diameter: e.target.value })),
                                    className: 'w-full bg-secondary border border-secondary rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary'
                                })
                            )
                        ),
                        h('div', { className: 'flex gap-2 mt-4 justify-end' },
                            h('button', { onClick: handleCancelEdit, className: 'px-3 py-1 bg-secondary text-white rounded-md hover:bg-secondary-focus' }, 'Cancel'),
                            h('button', { onClick: handleSaveTool, className: 'px-3 py-1 bg-primary text-white rounded-md hover:bg-primary-focus' }, 'Save')
                        )
                    ),
                
                h('div', { className: 'space-y-2' },
                    localLibrary.length > 0 ?
                        localLibrary.map(tool => h('div', {
                            key: tool.id,
                            className: 'flex items-center justify-between bg-background p-3 rounded-md'
                        },
                            h('div', { className: 'flex flex-col' },
                                h('span', { className: 'font-semibold' }, tool.name),
                                h('span', { className: 'text-xs text-text-secondary' }, `Ø ${tool.diameter} mm`)
                            ),
                            h('div', { className: 'flex gap-2' },
                                h('button', { onClick: () => handleEdit(tool), className: 'p-1 text-text-secondary hover:text-primary' }, h(Pencil, { className: 'w-4 h-4' })),
                                h('button', { onClick: () => handleDelete(tool.id), className: 'p-1 text-text-secondary hover:text-accent-red' }, h(Trash2, { className: 'w-4 h-4' }))
                            )
                        ))
                        : h('p', { className: 'text-center text-text-secondary py-4' }, 'Your tool library is empty.')
                )
            ),
            h('div', { className: 'bg-background px-6 py-4 flex justify-end items-center rounded-b-lg flex-shrink-0' },
                 h('button', {
                    onClick: handleSaveAndClose,
                    className: 'px-6 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-focus flex items-center gap-2'
                }, h(Save, { className: 'w-5 h-5' }), 'Save & Close')
            )
        )
    );
};

export default ToolLibraryModal;

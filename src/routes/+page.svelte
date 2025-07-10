<script lang="ts">
    import { db } from '$lib/database';
    import { liveQuery } from 'dexie';
    import { type Task } from '$lib/database';
    import { fade, fly } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';

    // Добавляем состояние для сортировки
    let sortBy: 'created' | 'updated' | 'title' = $state('created');
    let sortDirection: 'asc' | 'desc' = $state('desc');

    let tasks = liveQuery(() => db.tasks.toArray());
    let searchTerm = $state("");
    let editingTask: Task | null = $state(null);

    const filteredTasks = $derived.by(() => {
        if (!$tasks) return [];

        let result = [...$tasks];

        // Применяем поиск
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(task =>
                task.title.toLowerCase().includes(term) ||
                task.description.toLowerCase().includes(term)
            );
        }

        // Применяем сортировку
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'created':
                    comparison = a.createdAt.getTime() - b.createdAt.getTime();
                    break;
                case 'updated':
                    comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
                    break;
                case 'title':
                    comparison = -a.title.localeCompare(b.title);
                    break;
            }

            return sortDirection === 'desc' ? -comparison : comparison;
        });

        return result;
    });

    // Функция для переключения сортировки
    function toggleSort(by: typeof sortBy) {
        if (sortBy === by) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortBy = by;
            sortDirection = 'desc';
        }
    }

    async function addTask(title: string, description: string) {
        const now = new Date();
        await db.tasks.add({
            title,
            description,
            status: 'active',
            createdAt: now,
            updatedAt: now
        });
        editingTask = null;
    }

    async function updateTask(task: Task) {
        await db.tasks.update(task.id!, {
            ...task,
            updatedAt: new Date()
        });
        editingTask = null;
    }

    async function deleteTask(id: number) {
        await db.tasks.delete(id);
    }

    function toggleStatus(task: Task) {
        db.tasks.update(task.id!, {
            status: task.status === 'active' ? 'completed' : 'active',
            updatedAt: new Date()
        });
    }
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
    <h1 class="text-3xl font-bold mb-8 text-center">Task Manager</h1>

    <!-- Search and Add Task -->
    <div class="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label for="search" class="block text-sm font-medium mb-1">Search Tasks</label>
            <input
                id="search"
                type="text"
                bind:value={searchTerm}
                placeholder="Search by title or description..."
                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                transition:fade={{ duration: 200 }}
            />
        </div>

        <div class="flex items-end">
            <button
                on:click={() => editingTask = { id: undefined, title: '', description: '', status: 'active', createdAt: new Date(), updatedAt: new Date() }}
                class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition"
                transition:fade={{ duration: 200 }}
            >
                Add New Task
            </button>
        </div>
    </div>

    <!-- Sorting -->
    <div class="mb-4 flex space-x-2 overflow-x-auto pb-2">
        <button
            on:click={() => toggleSort('created')}
            class:bg-blue-100={sortBy === 'created'}
            class="px-3 py-1 rounded-full text-sm whitespace-nowrap transition"
            transition:fade
        >
            {sortBy === 'created' && sortDirection === 'asc' ? '↑' : '↓'} Created
        </button>
        <button
            on:click={() => toggleSort('updated')}
            class:bg-blue-100={sortBy === 'updated'}
            class="px-3 py-1 rounded-full text-sm whitespace-nowrap transition"
            transition:fade
        >
            {sortBy === 'updated' && sortDirection === 'asc' ? '↑' : '↓'} Updated
        </button>
        <button
            on:click={() => toggleSort('title')}
            class:bg-blue-100={sortBy === 'title'}
            class="px-3 py-1 rounded-full text-sm whitespace-nowrap transition"
            transition:fade
        >
            {sortBy === 'title' && sortDirection === 'asc' ? '↑' : '↓'} Title
        </button>
    </div>

    <!-- Task Form Modal -->
    {#if editingTask}
        <div transition:fade={{ duration: 150 }} class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div
                transition:fly={{ y: -20, duration: 200, easing: quintOut }}
                class="bg-white rounded-lg p-6 w-full max-w-md"
            >
                <h2 class="text-xl font-bold mb-4">
                    {editingTask.id ? 'Edit Task' : 'Add New Task'}
                </h2>

                <form
                    class="space-y-4"
                >
                    <div>
                        <label for="title" class="block text-sm font-medium mb-1">Title</label>
                        <input
                            id="title"
                            type="text"
                            bind:value={editingTask.title}
                            required
                            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label for="description" class="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            id="description"
                            bind:value={editingTask.description}
                            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        ></textarea>
                    </div>

                    {#if editingTask.id}
                        <div>
                            <label class="block text-sm font-medium mb-1">Status</label>
                            <div class="flex items-center space-x-4">
                                <label class="inline-flex items-center">
                                    <input
                                        type="radio"
                                        bind:group={editingTask.status}
                                        value="active"
                                        class="form-radio h-4 w-4 text-blue-600"
                                    />
                                    <span class="ml-2">Active</span>
                                </label>
                                <label class="inline-flex items-center">
                                    <input
                                        type="radio"
                                        bind:group={editingTask.status}
                                        value="completed"
                                        class="form-radio h-4 w-4 text-blue-600"
                                    />
                                    <span class="ml-2">Completed</span>
                                </label>
                            </div>
                        </div>
                    {/if}

                    <div class="flex justify-end space-x-2 pt-4">
                        <button
                            type="button"
                            on:click={() => editingTask = null}
                            class="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
                        >
                            Cancel
                        </button>
                        <button
                            on:click|preventDefault={() => editingTask?.id ? updateTask(editingTask) : addTask(String(editingTask?.title), String(editingTask?.description))}
                            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                        >
                            {editingTask.id ? 'Update' : 'Add'} Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

    <!-- Tasks List -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
        {#if $tasks && $tasks.length === 0}
            <div class="p-8 text-center text-gray-500" transition:fade>
                No tasks found. Add your first task!
            </div>
        {:else if !$tasks}
            <div class="p-8 text-center text-gray-500" transition:fade>Loading tasks...</div>
        {:else if filteredTasks.length === 0 && searchTerm}
            <div class="p-8 text-center text-gray-500" transition:fade>No tasks found for "{searchTerm}"</div>
        {:else}
            <ul class="divide-y divide-gray-200">
                {#each filteredTasks as task (task.id)}
                    <li
                        transition:fly={{ y: 20, duration: 300, easing: quintOut }}
                        class="p-4 hover:bg-gray-50 transition"
                    >
                        <div class="flex items-start justify-between">
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={task.status === 'completed'}
                                        on:change={() => toggleStatus(task)}
                                        class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <h3 class:line-through={task.status === 'completed'} class:text-gray-400={task.status === 'completed'} class="text-lg font-medium truncate">
                                        {task.title}
                                    </h3>
                                </div>
                                {#if task.description}
                                    <p class:line-through={task.status === 'completed'} class:text-gray-400={task.status === 'completed'} class="mt-1 text-gray-600 whitespace-pre-wrap">
                                        {task.description}
                                    </p>
                                {/if}
                                <div class="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                    <span>Created: {new Date(task.createdAt).toLocaleString()}</span>
                                    <span>Updated: {new Date(task.updatedAt).toLocaleString()}</span>
                                </div>
                            </div>

                            <div class="ml-4 flex items-center space-x-2">
                                <button
                                    on:click={() => editingTask = task}
                                    class="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition"
                                    title="Edit"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                </button>
                                <button
                                    on:click={() => deleteTask(task.id!)}
                                    class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition"
                                    title="Delete"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>
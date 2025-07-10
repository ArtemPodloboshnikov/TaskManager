import Dexie from 'dexie';

export interface Task {
    id?: number;
    title: string;
    description: string;
    status: 'active' | 'completed';
    createdAt: Date;
    updatedAt: Date;
}

export class TaskDatabase extends Dexie {
    tasks: Dexie.Table<Task, number>;

    constructor() {
        super('TaskDatabase');

        this.version(1).stores({
            tasks: '++id, title, status, createdAt'
        });

        this.tasks = this.table('tasks');
    }
}

export const db = new TaskDatabase();
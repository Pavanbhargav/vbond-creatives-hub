import { create } from "zustand";
import { getTasks } from "../api/tasksapi";

export interface Task {
  id: number;
  workspace: number;
  title: string;
  description: string;
  task_type: string;
  platform: string;
  priority: string;
  status: string;
  reworks:number;
  estimated_hours:number;
  actual_hours:number;
  deadline: string;
  assignee: number | null;
  created_by: number | null;
  created_at: string;

}

interface TaskState {
  tasks: Task[];
  loading: boolean;
  fetchTasks: (workspaceId: string | number) => Promise<void>;
  setTasks: (tasks: Task[]) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,
  fetchTasks: async (workspaceId) => {
    set({ loading: true });
    try {
      const data = await getTasks(workspaceId);
      set({ tasks: data || [], loading: false });
    } catch (error) {
      console.error("Failed to fetch tasks in store", error);
      set({ tasks: [], loading: false });
    }
  },
  setTasks: (tasks) => set({ tasks }),
}));

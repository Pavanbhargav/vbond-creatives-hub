import { create } from "zustand";
import { getWorkspaces } from "../api/workspaceapi";

export interface WorkspaceMember {
  id: number;
  username: string;
  role: "admin" | "member";
}

export interface Workspace {
  id: string | number;
  name: string;
  workspace_type?: "personal" | "organizational";
  members?: WorkspaceMember[];
  created_at?: string;
}

interface WorkspaceState {
  workspaces: Workspace[];

  selectedWorkspace: Workspace | null;

  loading: boolean;

  isAdmin: boolean;

  currentRole: "admin" | "member" | null;

  workspaceType:
    | "personal"
    | "organizational"
    | null;

  fetchWorkspaces: () => Promise<void>;

  setSelectedWorkspace: (
    workspace: Workspace | null,
    username?: string
  ) => void;
}

export const useWorkspaceStore =
  create<WorkspaceState>((set) => ({
    workspaces: [],

    selectedWorkspace: null,

    loading: false,

    isAdmin: false,

    currentRole: null,

    workspaceType: null,

    fetchWorkspaces: async () => {
      set({ loading: true });

      try {
        const response = await getWorkspaces();

        const data = response || [];

        set({
          workspaces: data,
          loading: false,
        });
      } catch (error) {
        console.error(
          "Failed to fetch workspaces",
          error
        );

        set({
          workspaces: [],
          loading: false,
        });
      }
    },

    setSelectedWorkspace: (
      workspace,
      username
    ) => {
      if (!workspace || !username) {
        set({
          selectedWorkspace: workspace,

          isAdmin: false,

          currentRole: null,

          workspaceType: null,
        });

        return;
      }

      // FIND CURRENT USER ROLE
      const currentMember =
        workspace.members?.find(
          (member) =>
            member.username === username
        );

      const role =
        currentMember?.role || "member";

      set({
        selectedWorkspace: workspace,

        currentRole: role,

        isAdmin: role === "admin",

        workspaceType:
          workspace.workspace_type || null,
      });
    },
  }));
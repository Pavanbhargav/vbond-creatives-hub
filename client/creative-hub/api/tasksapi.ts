import api from "./axios";

export interface TaskPayload {
  title: string;
  description?: string;
  task_type: string;
  platform: string;
  priority?: string;
  status?: string;
  deadline: string;
  estimated_hours?: number;
  assignee?: number;
  concept_by?: string | number;
  design_by?: string | number;
  content_by?: string | number;
}

export const getTasks = async (workspaceId: string | number) => {
  try {
    const response = await api.get(`/tasks/workspace/${workspaceId}/`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch tasks", error);
    throw error;
  }
};

export const createTask = async (workspaceId: string | number, payload: TaskPayload) => {
  try {
    const response = await api.post(`/tasks/workspace/${workspaceId}/`, payload);
    return response.data;
  } catch (error) {
    console.error("Failed to create task", error);
    throw error;
  }
};

export const uploadTaskFile = async(taskId:number, file:File)=> {
  try{
    const formData = new FormData();
    formData.append("file",file);

    const response = await api.post(`/tasks/${taskId}/upload/`,formData);
    return response.data
  }
  catch(error){
    console.error("Failed to upload file",error);
    throw error;
  }
}

export const showTaskFile = async (taskId: number) => {
  try {
    const response = await api.get(`/tasks/${taskId}/files/`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch files', error);
    throw error;
  }
};

export const getTaskFileById = async (fileId: number) => {
  try {
    const response = await api.get(`/tasks/files/${fileId}/`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch file by ID', error);
    throw error;
  }
};

export const approvalList = async (taskId: number) => {
  try {
    const response = await api.get(`/tasks/${taskId}/approvals/`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch approval list", error);
    throw error;
  }
};

export const getTaskHistory = async (taskId: number) => {
  try {
    const response = await api.get(`/tasks/${taskId}/history/`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch task history", error);
    throw error;
  }
};

export const approveTask = async (taskId: number, payload: { status: string; comment?: string }) => {
  try {
    const response = await api.patch(`/tasks/${taskId}/approve/`, payload);
    return response.data;
  } catch (error) {
    console.error("Failed to approve task", error);
    throw error;
  }
};

export const getPendingApprovals = async (workspaceId: string | number) => {
  try {
    const response = await api.get(`/tasks/workspace/${workspaceId}/pending-approvals/`);
    return response.data;
  } catch (error) {
    console.error("Failed to fetch pending approvals", error);
    throw error;
  }
};
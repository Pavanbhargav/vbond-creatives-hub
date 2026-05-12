import api from "./axios";

export const getWorkspaces = async () => {
  try {
    const response = await api.get("/workspaces/");
    console.log(response)
    return response.data;
  } catch (error) {
    console.error("Failed to fetch workspaces", error);
  }
};

export const createWorkspace = async (name: string,) => {
  try {
    const response = await api.post("/workspaces/create-org/", { name });
    return response.data;
  } catch (error) {
    console.error("Failed to create workspace", error);
  }
};

export const getTeams = async (workspaceId: string | number) => {
  try {
    const response = await api.get(`/workspaces/${workspaceId}/teams/`);
    console.log(response.data)
    return response.data;
  } catch (error) {
    console.error("Failed to fetch teams", error);
    throw error;
  }
};

export const createTeam = async (workspaceId: string | number, name: string, members: number[] = []) => {
  try {
    const payload: any = { name };
    if (members.length > 0) {
      payload.members = members;
    }
    const response = await api.post(`/workspaces/${workspaceId}/teams/`, payload);
    return response.data;
  } catch (error) {
    console.error("Failed to create team", error);
    throw error;
  }
};

export const UpdateRole = async (workspaceId:string|number, memberId:number, newRole: "admin" | "member") => {
    try{
        const response = await api.patch(`/workspaces/${workspaceId}/members/${memberId}/role/`, { role: newRole });
        return response.data;
    }
    catch(error){
        console.error("Failed to update role",error);
        throw error;
    }
}

export const getTeamById = async (
  teamId: number
) => {
  try {
    const response = await api.get(
      `/workspaces/teams/${teamId}/`
    );

    return response.data;
  } catch (error) {
    console.error(
      "Failed to fetch team",
      error
    );

    throw error;
  }
};

export const addTeamMembers = async (teamId:string|number, workspaceId:string|number, userId:number) => {
    try {
        const response = await api.post(`/workspaces/${workspaceId}/teams/${teamId}/members/`, { user_id: userId });
        return response.data;
    } catch (error) {
        console.error("Failed to add team member", error);
        throw error;
    }
};

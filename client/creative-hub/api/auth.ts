import api from "./axios";

export const login = async (username: string, password: string) => {
  try {
    const response = await api.post("/accounts/login/", {
      username,
      password,
    });
    return response.data;
  } catch (error: any) {
    // throw instead of just logging
    throw error.response?.data || { error: "Login failed" };
  }
};

export const logout = async () => {
    try{
        await api.post("/accounts/logout/");
    }
    catch(error){
        console.error("Logout failed", error);
    }
}

export const signup = async (username:string,email:string,password:string) => {
  try{
    const response = await api.post("/accounts/signup/",{
      username,
      email,
      password
    })
    return response.data;
  }
  catch(error:any){
    console.error("Signup failed",error);
  }
}

export const getCurrentUser = async () => {
  return await api.get("/accounts/me/")
}

export const getusers = async () => {
  return await api.get("/accounts/users/")
}
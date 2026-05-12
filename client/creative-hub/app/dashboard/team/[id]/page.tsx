"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { ArrowLeft, Users, ShieldCheck, Plus } from "lucide-react";
import { toast } from "sonner";

import { getTeams, UpdateRole, addTeamMembers } from "@/api/workspaceapi";
import { getusers } from "@/api/auth";
import { useWorkspaceStore } from "@/store/workspaceStore";

interface Team {
  id: number;
  name: string;
  members: number[];
}

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params.id;

  const { selectedWorkspace, isAdmin } = useWorkspaceStore();

  const [team, setTeam] = useState<Team | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchTeam();
      fetchUsers();
    }
  }, [selectedWorkspace, teamId]);

  const fetchUsers = async () => {
    try {
      const response = await getusers();
      setUsers(response.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTeam = async () => {
    if (!selectedWorkspace) return;
    try {
      const response = await getTeams(selectedWorkspace.id);
      const foundTeam = response.find((t: Team) => t.id === Number(teamId));
      setTeam(foundTeam || null);
    } catch (error) {
      toast.error("Failed to fetch team");
    } finally {
      setLoading(false);
    }
  };

  const getUserDetails = (userId: number) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return null;

    const wsMember = selectedWorkspace?.members?.find(
      (m) => m.username === user.username
    );

    return {
      username: user.username,
      email: user.email,
      // If they were just added and the workspace hasn't fully re-fetched yet, 
      // they default to "member", which is correct!
      role: wsMember?.role || "member", 
      wsMemberId: wsMember?.id,
    };
  };

  const handleRoleChange = async (
    wsMemberId: number | undefined,
    currentRole: string
  ) => {
    if (!selectedWorkspace || !wsMemberId) return;

    const newRole = currentRole === "admin" ? "member" : "admin";

    try {
      await UpdateRole(selectedWorkspace.id, wsMemberId, newRole);
      toast.success(`Changed to ${newRole}`);
      
      // Update global store so the role reflects in the UI
      useWorkspaceStore.getState().fetchWorkspaces();
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  // 🔥 UPDATED: Because the backend now handles workspace linking automatically,
  // we can show ALL users in the database, hiding only the ones already in the team.
  const getAvailableUsers = () => {
    if (!team || !users.length) return [];
    
    return users.filter((u) => !team.members.includes(u.id));
  };

  const handleAddMember = async (userId: number) => {
    if (!selectedWorkspace || !team) return;
    setIsAddingMember(true);
    
    try {
      // 1. Fire the API call
      await addTeamMembers(team.id, selectedWorkspace.id, userId);
      toast.success("Member added to team");
      
      // 2. Refresh local team data
      await fetchTeam();

      // 3. 🔥 CRITICAL: Since this user might have just been added to the workspace 
      // behind the scenes, we MUST refresh the global workspace store so the role updates!
      useWorkspaceStore.getState().fetchWorkspaces();

    } catch (error) {
      toast.error("Failed to add member");
    } finally {
      setIsAddingMember(false);
      setIsAddMemberOpen(false); // Close the modal
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/team">
            <Button variant="ghost" size="sm" className="mb-3">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{team?.name}</h1>
          <p className="text-muted-foreground">Team details and members</p>
        </div>

        <div className="flex gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="font-bold">{team?.members?.length || 0}</p>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger asChild>
                <Button className="h-[72px]">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member to {team?.name}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
                  {getAvailableUsers().length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      All available users are already in this team!
                    </p>
                  ) : (
                    getAvailableUsers().map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 border rounded-md"
                      >
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddMember(user.id)}
                          disabled={isAddingMember}
                        >
                          Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {team?.members?.map((userId) => {
                  const details = getUserDetails(userId);

                  if (!details) return null;

                  return (
                    <tr key={userId} className="border-t">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {details.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {details.username}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {details.email}
                      </td>
                      <td className="px-4 py-4">
                        {details.role === "admin" ? (
                          <Badge className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Member</Badge>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleRoleChange(details.wsMemberId, details.role)
                            }
                            disabled={!details.wsMemberId}
                          >
                            {details.role === "admin"
                              ? "Change to Member"
                              : "Change to Admin"}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
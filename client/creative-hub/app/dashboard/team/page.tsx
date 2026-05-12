"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuthStore } from "@/store/authStore"; // 🔥 Imported AuthStore

import { getTeams, createTeam } from "@/api/workspaceapi";
import { getusers } from "@/api/auth";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { Users, Plus, ChevronDown } from "lucide-react";

interface Team {
  id: number;
  name: string;
  workspace: number;
  members: number[];
}

export default function TeamPage() {
  const router = useRouter();

  // 🔥 1. Grab the current logged-in user
  const currentUser = useAuthStore((state) => state.user);

  const { selectedWorkspace, workspaceType, isAdmin } = useWorkspaceStore();

  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  useEffect(() => {
    if (selectedWorkspace && workspaceType === "organizational") {
      fetchTeams();

      if (isAdmin) {
        fetchUsers();
      }
    } else {
      setTeams([]);
      setAllUsers([]);
    }
  }, [selectedWorkspace, workspaceType, isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await getusers();
      setAllUsers(response.data || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const fetchTeams = async () => {
    if (!selectedWorkspace) return;

    setIsLoading(true);
    try {
      const data = await getTeams(selectedWorkspace.id);
      setTeams(data || []);
    } catch (error) {
      toast.error("Failed to fetch teams");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWorkspace || !newTeamName.trim()) return;

    setIsCreating(true);

    try {
      // You only send the selectedMembers. 
      // Django automatically adds currentUser to this team behind the scenes!
      await createTeam(selectedWorkspace.id, newTeamName.trim(), selectedMembers);

      toast.success("Team created successfully");
      setIsDialogOpen(false);
      setNewTeamName("");
      setSelectedMembers([]);
      fetchTeams();
    } catch (error) {
      toast.error("Failed to create team");
    } finally {
      setIsCreating(false);
    }
  };

  // 🔥 2. Filter the admin OUT of the dropdown list
  const usersAvailableToAdd = allUsers.filter(
    (user) => user.id !== currentUser?.id
  );

  if (!selectedWorkspace) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">
          Please select a workspace to view teams.
        </p>
      </div>
    );
  }

  if (workspaceType !== "organizational") {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4 p-8">
        <Users className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-2xl font-semibold tracking-tight">
          Teams not available
        </h2>
        <p className="text-muted-foreground text-center max-w-md">
          Teams are only available in organizational workspaces.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-2">
            Manage teams for {selectedWorkspace.name}
          </p>
        </div>

        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateTeam} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Team Name</Label>
                  <Input
                    placeholder="Design Team"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>

                {/* 🔥 3. Visual confirmation that the admin is already in the team */}
                <div className="space-y-2">
                  <Label>Team Creator (Admin)</Label>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md border">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {currentUser?.username?.[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium">{currentUser?.username} (You)</span>
                      <span className="text-xs text-muted-foreground">Added automatically</span>
                    </div>
                  </div>
                </div>

                {/* USERS DROPDOWN */}
                {usersAvailableToAdd.length > 0 && (
                  <div className="space-y-2">
                    <Label>Add Other Members</Label>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between font-normal"
                        >
                          {selectedMembers.length === 0
                            ? "Select members"
                            : `${selectedMembers.length} selected`}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="w-[400px]">
                        <DropdownMenuLabel>Available Users</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <div className="max-h-60 overflow-y-auto">
                          {/* 🔥 4. Map over the FILTERED list */}
                          {usersAvailableToAdd.map((user) => (
                            <DropdownMenuCheckboxItem
                              key={user.id}
                              checked={selectedMembers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMembers([...selectedMembers, user.id]);
                                } else {
                                  setSelectedMembers(
                                    selectedMembers.filter((id) => id !== user.id)
                                  );
                                }
                              }}
                            >
                              {user.username}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>

                  <Button type="submit" disabled={isCreating || !newTeamName.trim()}>
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* CONTENT */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border border-dashed rounded-lg">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium">No teams found</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-6">
            Create your first team
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => router.push(`/dashboard/team/${team.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <div className="rounded-full bg-primary/10 text-primary px-2 py-1 text-xs">
                    {team.members?.length || 0} Members
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {team.members?.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        className="h-8 w-8 rounded-full bg-muted border flex items-center justify-center text-xs"
                      >
                        U
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {team.members?.length || 0} total members
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
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

import {
  ArrowLeft,
  Users,
  ShieldCheck,
  Plus,
  Activity,
  List,
} from "lucide-react";

import { toast } from "sonner";

import {
  getTeams,
  UpdateRole,
  addTeamMembers,
  getTeamPerformance,
} from "@/api/workspaceapi";

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

  const [activeTab, setActiveTab] = useState<
    "members" | "performance"
  >("members");

  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loadingPerformance, setLoadingPerformance] =
    useState(false);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchTeam();
      fetchUsers();
    }
  }, [selectedWorkspace, teamId]);

  useEffect(() => {
    if (
      activeTab === "performance" &&
      selectedWorkspace &&
      teamId
    ) {
      fetchPerformance();
    }
  }, [activeTab, selectedWorkspace, teamId]);

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

      const foundTeam = response.find(
        (t: Team) => t.id === Number(teamId)
      );

      setTeam(foundTeam || null);
    } catch (error) {
      toast.error("Failed to fetch team");
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    if (!selectedWorkspace || !teamId) return;

    setLoadingPerformance(true);

    try {
      const data = await getTeamPerformance(
        selectedWorkspace.id,
        Number(teamId)
      );

      setPerformanceData(data || []);
    } catch (error) {
      toast.error("Failed to fetch performance data");
    } finally {
      setLoadingPerformance(false);
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
      role: wsMember?.role || "member",
      wsMemberId: wsMember?.id,
    };
  };

  const handleRoleChange = async (
    wsMemberId: number | undefined,
    currentRole: string
  ) => {
    if (!selectedWorkspace || !wsMemberId) return;

    const newRole =
      currentRole === "admin" ? "member" : "admin";

    try {
      await UpdateRole(
        selectedWorkspace.id,
        wsMemberId,
        newRole
      );

      toast.success(`Changed to ${newRole}`);

      useWorkspaceStore.getState().fetchWorkspaces();
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const getAvailableUsers = () => {
    if (!team || !users.length) return [];

    return users.filter(
      (u) => !team.members.includes(u.id)
    );
  };

  const handleAddMember = async (userId: number) => {
    if (!selectedWorkspace || !team) return;

    setIsAddingMember(true);

    try {
      await addTeamMembers(
        team.id,
        selectedWorkspace.id,
        userId
      );

      toast.success("Member added to team");

      await fetchTeam();

      useWorkspaceStore.getState().fetchWorkspaces();
    } catch (error) {
      toast.error("Failed to add member");
    } finally {
      setIsAddingMember(false);
      setIsAddMemberOpen(false);
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
    <main className="flex-1 min-w-0 overflow-auto">
      <div className="w-full min-w-0 space-y-6 p-4 md:p-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

          <div className="min-w-0">
            <Link href="/dashboard/team">
              <Button
                variant="ghost"
                size="sm"
                className="mb-3"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>

            <h1 className="text-2xl md:text-3xl font-bold truncate">
              {team?.name}
            </h1>

            <p className="text-muted-foreground">
              Team details and performance
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <Card className="min-w-[140px]">
              <CardContent className="flex items-center gap-3 p-4">
                <Users className="h-5 w-5 text-primary" />

                <div>
                  <p className="text-xs text-muted-foreground">
                    Members
                  </p>

                  <p className="font-bold">
                    {team?.members?.length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <Dialog
                open={isAddMemberOpen}
                onOpenChange={setIsAddMemberOpen}
              >
                <DialogTrigger asChild>
                  <Button className="h-[72px] whitespace-nowrap">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Member
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      Add Member to {team?.name}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
                    {getAvailableUsers().length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        All available users are already in this
                        team!
                      </p>
                    ) : (
                      getAvailableUsers().map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between gap-3 p-3 border rounded-md"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {user.username}
                            </p>

                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            onClick={() =>
                              handleAddMember(user.id)
                            }
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

        {/* VIEW TOGGLE */}
        <div className="flex flex-wrap gap-3 border-b pb-3">
          <Button
            variant={
              activeTab === "members"
                ? "default"
                : "ghost"
            }
            onClick={() => setActiveTab("members")}
          >
            <List className="mr-2 h-4 w-4" />
            Members List
          </Button>

          <Button
            variant={
              activeTab === "performance"
                ? "default"
                : "ghost"
            }
            onClick={() =>
              setActiveTab("performance")
            }
          >
            <Activity className="mr-2 h-4 w-4" />
            Performance
          </Button>
        </div>

        {/* MEMBERS */}
        {activeTab === "members" && (
          <Card className="w-full min-w-0">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border overflow-x-auto w-full">

                <table className="w-full min-w-[700px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        User
                      </th>

                      <th className="px-4 py-3 text-left">
                        Email
                      </th>

                      <th className="px-4 py-3 text-left">
                        Role
                      </th>

                      {isAdmin && (
                        <th className="px-4 py-3 text-right">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {team?.members?.map((userId) => {
                      const details =
                        getUserDetails(userId);

                      if (!details) return null;

                      return (
                        <tr
                          key={userId}
                          className="border-t"
                        >
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
                            {details.role ===
                            "admin" ? (
                              <Badge className="gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Member
                              </Badge>
                            )}
                          </td>

                          {isAdmin && (
                            <td className="px-4 py-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleRoleChange(
                                    details.wsMemberId,
                                    details.role
                                  )
                                }
                                disabled={
                                  !details.wsMemberId
                                }
                              >
                                {details.role ===
                                "admin"
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
        )}

        {/* PERFORMANCE */}
        {activeTab === "performance" && (
          <div className="py-2">

            {loadingPerformance ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : performanceData.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                No performance data available.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 w-full">

                {performanceData.map((perf, index) => (
                  <Card
                    key={index}
                    className="overflow-hidden bg-card text-card-foreground shadow-lg border-muted min-w-0 w-full"
                  >
                    <CardContent className="p-5">

                      {/* HEADER */}
                      <div className="flex items-start gap-4 mb-6">

                        <Avatar className="h-14 w-14 border-2 border-primary/20 shrink-0">
                          <AvatarFallback className="bg-orange-500 text-white text-xl">
                            {perf.user.first_name?.[0]}
                            {perf.user.last_name?.[0] ||
                              perf.user.username
                                ?.substring(0, 2)
                                .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">

                          <div className="flex justify-between gap-3">

                            <div className="min-w-0">
                              <h3 className="font-bold text-lg truncate">
                                {perf.user.first_name}{" "}
                                {perf.user.last_name ||
                                  perf.user.username}
                              </h3>

                              <p className="text-sm text-muted-foreground">
                                {perf.user.role}
                              </p>
                            </div>

                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-500 border-green-500/20 shrink-0"
                            >
                              Available
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-3">
                            {perf.user.skills?.map(
                              (
                                skill: string,
                                i: number
                              ) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {skill}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* STATS */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">

                        <div className="bg-muted/50 p-3 rounded-lg text-center border">
                          <div className="text-xl font-black">
                            {perf.total}
                          </div>

                          <div className="text-[10px] text-muted-foreground uppercase mt-1">
                            Total
                          </div>
                        </div>

                        <div className="bg-muted/50 p-3 rounded-lg text-center border">
                          <div className="text-xl font-black text-orange-500">
                            {perf.active}
                          </div>

                          <div className="text-[10px] text-muted-foreground uppercase mt-1">
                            Active
                          </div>
                        </div>

                        <div className="bg-muted/50 p-3 rounded-lg text-center border">
                          <div className="text-xl font-black text-green-500">
                            {perf.done}
                          </div>

                          <div className="text-[10px] text-muted-foreground uppercase mt-1">
                            Done
                          </div>
                        </div>

                        <div className="bg-muted/50 p-3 rounded-lg text-center border">
                          <div className="text-xl font-black text-yellow-500">
                            {perf.reworks}
                          </div>

                          <div className="text-[10px] text-muted-foreground uppercase mt-1">
                            Reworks
                          </div>
                        </div>
                      </div>

                      {/* BARS */}
                      <div className="space-y-5">

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">
                              Productivity
                            </span>

                            <span className="font-bold text-green-500">
                              {perf.productivity}/100
                            </span>
                          </div>

                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{
                                width: `${perf.productivity}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">
                              Workload ({perf.workload}%)
                            </span>

                            <span className="text-muted-foreground">
                              {perf.active_count}/8
                            </span>
                          </div>

                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{
                                width: `${perf.workload}%`,
                              }}
                            />
                          </div>
                        </div>

                      </div>

                      {/* TASKS */}
                      <div className="mt-8">

                        <h4 className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase mb-3">
                          Current Tasks
                        </h4>

                        <div className="space-y-2.5 min-w-0">

                          {perf.current_tasks.map(
                            (task: any) => (
                              <div
                                key={task.id}
                                className="bg-muted/30 p-3.5 rounded-lg border flex flex-col gap-2"
                              >
                                <span className="font-semibold text-sm break-words">
                                  {task.title}
                                </span>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <Badge variant="secondary">
                                    {task.status}
                                  </Badge>

                                  <span className="text-muted-foreground">
                                    Due{" "}
                                    {task.deadline ||
                                      "No Date"}
                                  </span>
                                </div>
                              </div>
                            )
                          )}

                          {perf.current_tasks.length ===
                            0 && (
                            <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-lg border border-dashed">
                              No active tasks
                            </p>
                          )}

                        </div>
                      </div>

                    </CardContent>
                  </Card>
                ))}

              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
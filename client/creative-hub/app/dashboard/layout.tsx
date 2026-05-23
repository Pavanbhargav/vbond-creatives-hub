"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import Link from "next/link";

import { useAuthStore } from "@/store/authStore";

import {
  useWorkspaceStore,
  Workspace,
} from "@/store/workspaceStore";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  LogOut,
  LayoutDashboard,
  ClipboardList,
  Bot,
  Kanban,
  CheckCircle,
  Calendar,
  Users,
  BarChart,
  FileText,
  PlusSquare,
  ChevronDown,
  Briefcase,
  ShieldCheck,
  User,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Separator } from "@/components/ui/separator";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";

import { createWorkspace } from "@/api/workspaceapi";

import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, fetchUser, logout: logoutAction } =
    useAuthStore();

  const {
    workspaces,
    selectedWorkspace,
    fetchWorkspaces,
    setSelectedWorkspace,
    isAdmin,
    currentRole,
    workspaceType,
  } = useWorkspaceStore();

  const router = useRouter();

  const [workspaceName, setWorkspaceName] =
    useState("");

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      fetchUser();
    }

    if (workspaces.length === 0) {
      fetchWorkspaces();
    }

    const savedWorkspaceId =
      localStorage.getItem("workspaceId");

    if (
      savedWorkspaceId &&
      workspaces.length > 0 &&
      user
    ) {
      const savedWorkspace = workspaces.find(
        (ws) =>
          ws.id.toString() === savedWorkspaceId
      );

      if (savedWorkspace) {
        setSelectedWorkspace(
          savedWorkspace,
          user.username
        );
      }
    }
  }, [
    user,
    fetchUser,
    workspaces,
    fetchWorkspaces,
    setSelectedWorkspace,
  ]);

  const handleLogout = async () => {
    try {
      await logoutAction();

      toast.success(
        "Logged out successfully"
      );

      router.replace("/login");
    } catch (err) {
      console.error("Logout failed", err);

      toast.error("Logout failed");
    }
  };

  const handleCreateWorkspace =
    async () => {
      if (!workspaceName.trim()) {
        toast.error(
          "Workspace name is required"
        );

        return;
      }

      try {
        const newWorkspace =
          await createWorkspace(
            workspaceName
          );

        await fetchWorkspaces();

        if (newWorkspace) {
          setSelectedWorkspace(
            newWorkspace,
            user?.username
          );

          localStorage.setItem(
            "workspaceId",
            newWorkspace.id.toString()
          );

          toast.success(
            "Workspace created successfully"
          );
        }

        setWorkspaceName("");

        setOpen(false);
      } catch (error) {
        console.error(
          "Workspace creation failed",
          error
        );

        toast.error(
          "Failed to create workspace"
        );
      }
    };

  const handleWorkspaceSelect = (
    ws: Workspace
  ) => {
    setSelectedWorkspace(
      ws,
      user?.username
    );

    localStorage.setItem(
      "workspaceId",
      ws.id.toString()
    );

    toast.success(`${ws.name} selected`);
  };

  // COMMON FOR ALL
  const commonMenuItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },

    {
      name: "Task Board",
      href: "/dashboard/tasks",
      icon: Kanban,
    },

    // {
    //   name: "Calendar",
    //   href: "/dashboard/calendar",
    //   icon: Calendar,
    // },

    // {
    //   name: "Report",
    //   href: "/dashboard/report",
    //   icon: FileText,
    // },
  ];

  // ONLY ORGANIZATIONAL
  const organizationMenuItems = [
    {
      name: "Team",
      href: "/dashboard/team",
      icon: Users,
    },
  ];

  // ONLY ADMIN
  const adminMenuItems = [
    // {
    //   name: "Allocate Task",
    //   href: "/dashboard/allocate-task",
    //   icon: ClipboardList,
    // },

    // {
    //   name: "Auto Allocation",
    //   href: "/dashboard/auto-allocation",
    //   icon: Bot,
    // },

    {
      name: "Approvals",
      href: "/dashboard/approvals",
      icon: CheckCircle,
    },

    // {
    //   name: "Analytics",
    //   href: "/dashboard/analytics",
    //   icon: BarChart,
    // },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* SIDEBAR */}
        <Sidebar
          collapsible="icon"
          className="flex flex-col"
        >
          {/* HEADER */}
          <SidebarHeader className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full focus-visible:outline-none">
                  <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-2 hover:bg-accent transition-all group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:justify-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                        <Briefcase className="h-4 w-4" />
                      </div>

                      <div className="flex flex-col items-start min-w-0 group-data-[collapsible=icon]:hidden">
                        <span className="text-xs text-muted-foreground">
                          Workspace
                        </span>

                        <span className="text-sm font-medium truncate max-w-[140px]">
                          {selectedWorkspace?.name}
                        </span>
                      </div>
                    </div>

                    <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-72">
                {workspaces.map((ws) => {
                  const member =
                    ws.members?.find(
                      (m) =>
                        m.username ===
                        user?.username
                    );

                  const role =
                    member?.role;

                  return (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() =>
                        handleWorkspaceSelect(
                          ws
                        )
                      }
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                            <Briefcase className="h-4 w-4" />
                          </div>

                          <div className="flex flex-col">
                            <span className="font-medium">
                              {ws.name}
                            </span>

                            <span className="text-xs text-muted-foreground capitalize">
                              {
                                ws.workspace_type
                              }
                            </span>
                          </div>
                        </div>

                        {role === "admin" ? (
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}

                <Separator className="my-1" />

                {/* ADMIN ONLY */}
                
                  <Dialog
                    open={open}
                    onOpenChange={setOpen}
                  >
                    <DialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) =>
                          e.preventDefault()
                        }
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                            <PlusSquare className="h-4 w-4" />
                          </div>

                          <span>
                            Create Workspace
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </DialogTrigger>

                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Create Workspace
                        </DialogTitle>

                        <DialogDescription>
                          Create an organizational
                          workspace
                        </DialogDescription>
                      </DialogHeader>

                      <Input
                        placeholder="Workspace Name"
                        value={workspaceName}
                        onChange={(e) =>
                          setWorkspaceName(
                            e.target.value
                          )
                        }
                      />

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() =>
                            setOpen(false)
                          }
                        >
                          Cancel
                        </Button>

                        <Button
                          onClick={
                            handleCreateWorkspace
                          }
                          disabled={
                            !workspaceName.trim()
                          }
                        >
                          Create
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
       
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarHeader>

          {/* SIDEBAR CONTENT */}
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* COMMON */}
                  {commonMenuItems.map(
                    (item) => {
                      const Icon = item.icon;

                      return (
                        <SidebarMenuItem
                          key={item.href}
                        >
                          <SidebarMenuButton
                            asChild
                            tooltip={
                              item.name
                            }
                          >
                            <Link
                              href={item.href}
                            >
                              <Icon />

                              <span>
                                {item.name}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }
                  )}

                  {/* ORGANIZATION ONLY */}
                  {workspaceType ===
                    "organizational" &&
                    organizationMenuItems.map(
                      (item) => {
                        const Icon =
                          item.icon;

                        return (
                          <SidebarMenuItem
                            key={
                              item.href
                            }
                          >
                            <SidebarMenuButton
                              asChild
                              tooltip={
                                item.name
                              }
                            >
                              <Link
                                href={
                                  item.href
                                }
                              >
                                <Icon />

                                <span>
                                  {
                                    item.name
                                  }
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      }
                    )}

                  {/* ADMIN ONLY */}
                  {isAdmin &&
                    adminMenuItems.map(
                      (item) => {
                        const Icon =
                          item.icon;

                        return (
                          <SidebarMenuItem
                            key={
                              item.href
                            }
                          >
                            <SidebarMenuButton
                              asChild
                              tooltip={
                                item.name
                              }
                            >
                              <Link
                                href={
                                  item.href
                                }
                              >
                                <Icon />

                                <span>
                                  {
                                    item.name
                                  }
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      }
                    )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* FOOTER */}
          <SidebarFooter className="mt-auto border-t p-4 group-data-[collapsible=icon]:p-2">
            {user && (
              <div className="flex items-center justify-between gap-3 min-w-0 group-data-[collapsible=icon]:justify-center">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      alt="@user"
                    />

                    <AvatarFallback>
                      {
                        user.username?.[0]
                      }
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate">
                      {user.username}
                    </p>

                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>

                    <span className="text-[10px] text-muted-foreground capitalize">
                      {currentRole}
                    </span>
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={
                        handleLogout
                      }
                      className="p-2 rounded-md hover:bg-red-100 hover:text-red-500 transition shrink-0 group-data-[collapsible=icon]:hidden"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>

                  <TooltipContent side="right">
                    Logout
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        {/* MAIN */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* HEADER */}
          <header className="flex items-center h-12 px-4 border-b">
            <SidebarTrigger />

            <h1 className="ml-4 font-semibold">
              Dashboard
            </h1>
          </header>

          {/* CONTENT */}
          <main className="flex-1 overflow-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
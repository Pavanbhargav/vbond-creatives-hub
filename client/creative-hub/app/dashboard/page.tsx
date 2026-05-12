"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore"; // 🔥 Import your Zustand store

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
// import { SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardPage() {
  const router = useRouter();
  
  // 1. Grab the user and logout action directly from your global state!
  // No useState or useEffect required.
  const user = useAuthStore((state) => state.user);
  const logoutAction = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      // 2. Call the Zustand logout action (which clears cookies and state)
      await logoutAction();
      
      // 3. Use REPLACE so they can't click the "Back" button to return to the dashboard
      router.replace("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <>
      {/* <SidebarTrigger /> */}
      <Card>
        <CardHeader className="text-primary font-heading text-3xl font-bold">
          Dashboard Page
        </CardHeader>
        
        {/* I added some padding and flex layout here so the button isn't crammed into the text */}
        <CardDescription className="flex flex-col gap-4 items-start px-6 pb-6">
          <p>
            Welcome back, <strong className="text-foreground">{user?.username || 'User'}</strong>! This is the dashboard page.
          </p>
          
          <Button variant="destructive" onClick={handleLogout}>
            Logout
          </Button>
        </CardDescription>
      </Card>
    </>
  );
}
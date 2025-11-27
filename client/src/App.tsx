import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Home from "@/pages/home";
import Pricing from "@/pages/pricing";
import BTTester from "@/pages/bt-tester";
import OnnxTester from "@/pages/onnx-tester";
import NarrativeLab from "@/pages/narrative-lab";
import WorldState from "@/pages/world-state";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/bt-tester" component={BTTester} />
      <Route path="/onnx-tester" component={OnnxTester} />
      <Route path="/narrative-lab" component={NarrativeLab} />
      <Route path="/world-state" component={WorldState} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex flex-col h-screen w-full">
            <div className="flex flex-1">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between p-4 border-b">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                </header>
                <main className="flex-1 overflow-hidden">
                  <Router />
                </main>
              </div>
            </div>
            <footer className="text-center py-4 text-xs opacity-70 border-t">
              Made with love by Wolf Team Studios •{" "}
              <a href="https://discord.gg/TtfHgfCQMY" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Discord
              </a>{" "}
              •{" "}
              <a href="mailto:wolfteamstudios21@gmail.com" className="text-blue-500 hover:underline">
                wolfteamstudios21@gmail.com
              </a>
            </footer>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HelpDesk — Patrimônio & Refrigeração" },
      { name: "description", content: "Sistema de chamados para os setores de Patrimônio e Refrigeração." },
      { property: "og:title", content: "HelpDesk — Patrimônio & Refrigeração" },
      { name: "twitter:title", content: "HelpDesk — Patrimônio & Refrigeração" },
      { property: "og:description", content: "Sistema de chamados para os setores de Patrimônio e Refrigeração." },
      { name: "twitter:description", content: "Sistema de chamados para os setores de Patrimônio e Refrigeração." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a47d22b8-a886-4ee6-ae63-5da93979f4b1/id-preview-e6b667a5--52b0e554-5d21-4377-ad60-4f71d9d1fd66.lovable.app-1779369658666.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a47d22b8-a886-4ee6-ae63-5da93979f4b1/id-preview-e6b667a5--52b0e554-5d21-4377-ad60-4f71d9d1fd66.lovable.app-1779369658666.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

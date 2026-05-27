import { Outlet, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 font-display text-xl text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Maison Barbier — Coiffure Homme & Soins" },
      { name: "description", content: "Salon de coiffure homme : coupes, barbes, brushing, soins kératine et soins visage. Réservation en ligne." },
      { name: "author", content: "Maison Barbier" },
      { property: "og:title", content: "Maison Barbier — Coiffure Homme & Soins" },
      { property: "og:description", content: "Salon de coiffure homme : coupes, barbes, brushing, soins kératine et soins visage. Réservation en ligne." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Maison Barbier — Coiffure Homme & Soins" },
      { name: "twitter:description", content: "Salon de coiffure homme : coupes, barbes, brushing, soins kératine et soins visage. Réservation en ligne." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e823f573-5437-48d7-b0b3-f4b3657a29c2/id-preview-73639e63--7e95de9f-1176-4469-b56c-f5bfeaa8d2e6.lovable.app-1777697740365.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e823f573-5437-48d7-b0b3-f4b3657a29c2/id-preview-73639e63--7e95de9f-1176-4469-b56c-f5bfeaa8d2e6.lovable.app-1777697740365.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isAdminArea = path.startsWith("/admin");

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background">
        {!isAdminArea && <Header />}
        <main className="flex-1">
          <Outlet />
        </main>
        {!isAdminArea && <Footer />}
      </div>
      <Toaster richColors theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}

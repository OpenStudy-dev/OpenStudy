import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              // don't retry on 401 — router will redirect to /login
              if (error && typeof error === "object" && "status" in error && (error as { status: number }).status === 401) {
                return false;
              }
              return failureCount < 2;
            },
            staleTime: 30_000,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

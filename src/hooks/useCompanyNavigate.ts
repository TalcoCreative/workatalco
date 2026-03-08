import { useNavigate } from "react-router-dom";
import { useCompanySlug } from "./useCompanySlug";
import { useCallback } from "react";

/**
 * A navigate wrapper that automatically prefixes paths with the company slug.
 * Usage: const nav = useCompanyNavigate(); nav("/clients");
 */
export function useCompanyNavigate() {
  const navigate = useNavigate();
  const slug = useCompanySlug();

  return useCallback(
    (path: string, options?: { replace?: boolean }) => {
      // Don't prefix absolute external paths or auth/landing paths
      if (path.startsWith("/auth") || path.startsWith("/landing") || path.startsWith("/pricing") || path.startsWith("/signup")) {
        navigate(path, options);
      } else if (path === "/") {
        navigate(`/${slug}`, options);
      } else {
        navigate(`/${slug}${path}`, options);
      }
    },
    [navigate, slug]
  );
}

import { useParams } from "react-router-dom";

export function useCompanySlug(): string {
  const { companySlug } = useParams<{ companySlug: string }>();
  return companySlug || "";
}

export function useCompanyPath() {
  const slug = useCompanySlug();
  return (path: string) => `/${slug}${path}`;
}

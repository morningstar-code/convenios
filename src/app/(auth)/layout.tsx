import { redirect } from "next/navigation";
import { shouldBypassAuth } from "@/lib/auth";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (shouldBypassAuth()) {
    redirect("/convenios");
  }
  return <>{children}</>;
}

import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#111111] text-white">{children}</div>;
}

"use client";

import { useParams } from "next/navigation";
import SalespersonProfile from "@/components/admin/salesperson-profile/SalespersonProfile";

export default function SalespersonProfilePage() {
  const params = useParams();
  const id = params.id as string;
  return <SalespersonProfile userId={id} />;
}

import type { Metadata } from "next";
import { BadStatus } from "@/components/fit/admin/BadStatus";

export const metadata: Metadata = {
  title: "통신상태 불량",
};

export default function Page() {
  return <BadStatus />;
}

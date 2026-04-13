import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/** Sends signed-in users to the dashboard; everyone else to login. */
export default async function Home() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token && (await verifySessionToken(token))) {
    redirect("/dashboard");
  }
  redirect("/login");
}

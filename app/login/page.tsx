import { LoginPage } from "@/components/login/login-page";
import { redirectAuthenticatedUser } from "@/lib/server-auth";

export default async function Login() {
  await redirectAuthenticatedUser();
  return <LoginPage />;
}

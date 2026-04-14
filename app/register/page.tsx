import { RegisterPage } from "@/components/login/register-page";
import { redirectAuthenticatedUser } from "@/lib/server-auth";

export default async function Register() {
  await redirectAuthenticatedUser();
  return <RegisterPage />;
}

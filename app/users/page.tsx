import { PageHeader } from "@/components/ui/page-header";
import { UsersPage } from "@/components/users/users-page";
import { prisma } from "@/lib/prisma";
import { serializeUser } from "@/lib/utils";
export const dynamic = 'force-dynamic';

export default async function Users() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }]
  });

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Create user accounts, assign roles, and manage who can access room booking operations."
      />
      <UsersPage users={users.map((user) => serializeUser(user))} />
    </>
  );
}

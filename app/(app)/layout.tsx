import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { prisma } from "@/lib/prisma";
import { ThemePreferenceSync } from "@/components/app/theme-preference-sync";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      themePreference: true
    }
  });

  const preference = dbUser?.themePreference.toLowerCase() as "system" | "light" | "dark" | undefined;

  return (
    <>
      {preference ? <ThemePreferenceSync preference={preference} /> : null}
      <AppShell user={session.user}>{children}</AppShell>
    </>
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import CompleteProfileForm from "./CompleteProfileForm";

export default async function CompleteProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth");
  if (session.user.profileComplete) redirect("/");

  return (
    <CompleteProfileForm
      user={{
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
    />
  );
}

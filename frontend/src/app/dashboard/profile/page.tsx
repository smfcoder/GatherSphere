import { auth } from "@/auth"
import { redirect } from "next/navigation"
import UserRegistrationForm from "@/components/user-registration-form"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return <UserRegistrationForm />
}

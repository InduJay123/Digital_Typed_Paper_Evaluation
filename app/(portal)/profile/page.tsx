import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage(){
  const supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:profile}=user?await supabase.from("profiles").select("display_name").eq("id",user.id).maybeSingle():{data:null};
  return <main className="content"><div className="page-heading"><div><div className="eyebrow">Profile</div><h1>Your account</h1></div></div><ProfileForm email={user?.email??""} initialName={profile?.display_name??user?.user_metadata?.full_name??""}/></main>
}

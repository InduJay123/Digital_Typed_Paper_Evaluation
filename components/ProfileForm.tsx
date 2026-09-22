"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({email,initialName}:{email:string;initialName:string}){
 const [name,setName]=useState(initialName); const [message,setMessage]=useState(""); const [error,setError]=useState("");
 async function save(e:FormEvent){e.preventDefault();setError("");setMessage("");const {data:{user}}=await createClient().auth.getUser();if(!user){setError("Session expired.");return;}const {error}=await createClient().from("profiles").update({display_name:name}).eq("id",user.id);if(error)setError(error.message);else setMessage("Profile updated.");}
 return <form className="card form-stack" style={{maxWidth:560}} onSubmit={save}><div className="field"><label>Email</label><input value={email} disabled/></div><div className="field"><label>Display name</label><input value={name} onChange={e=>setName(e.target.value)} required/></div>{error?<div className="error-box">{error}</div>:null}{message?<div className="success-box">{message}</div>:null}<div><button className="button">Save profile</button></div></form>
}

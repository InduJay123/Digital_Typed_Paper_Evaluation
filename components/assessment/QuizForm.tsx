"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SafeQuestion, QuestionOption } from "@/lib/types";

export default function QuizForm({ assessmentId, attemptId, questions }: { assessmentId: string; attemptId: string; questions: SafeQuestion[] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const answered = Object.keys(answers).length;
  const complete = answered === questions.length;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!complete) { setError(`Answer all ${questions.length} questions before submitting.`); return; }
    setSubmitting(true); setError("");
    const payload = questions.map(q => ({ question_id: q.id, selected_option: answers[q.id] }));
    const { error } = await createClient().rpc("rpc_student_submit_mcq", { p_attempt_id: attemptId, p_answers: payload });
    if (error) { setError(error.message); setSubmitting(false); return; }
    router.push(`/assessments/${assessmentId}/quiz/result`);
    router.refresh();
  }

  return <form onSubmit={submit}>
    <div className="card" style={{marginBottom:18,display:"flex",justifyContent:"space-between",gap:16,alignItems:"center"}}><div><strong>{answered}/{questions.length} answered</strong><div className="helper-text">Your answers are marked securely after submission.</div></div><span className={`badge ${complete?"good":""}`}>{complete?"Ready to submit":"In progress"}</span></div>
    {questions.map(q => <div className="quiz-question" key={q.id}><div className="eyebrow">Question {q.question_number} · {q.marks} mark{Number(q.marks)===1?"":"s"}</div><h3 style={{fontSize:19,lineHeight:1.5}}>{q.question_text}</h3><div className="option-list">{normalizeOptions(q.options).map(o => <label key={o.label} className={`option ${answers[q.id]===o.label?"selected":""}`}><input type="radio" name={q.id} value={o.label} checked={answers[q.id]===o.label} onChange={()=>setAnswers(a=>({...a,[q.id]:o.label}))}/><div><strong>{o.label}.</strong> {o.text}</div></label>)}</div></div>)}
    {error ? <div className="error-box">{error}</div> : null}
    <div style={{display:"flex",justifyContent:"flex-end",marginTop:18}}><button className="button" type="submit" disabled={submitting}>{submitting?"Submitting…":"Submit Section A"}</button></div>
  </form>;
}

function normalizeOptions(options: SafeQuestion["options"]): QuestionOption[] {
  if (!Array.isArray(options)) return [];
  return options.map((o:any,i) => typeof o === "string" ? {label:String.fromCharCode(65+i),text:o} : {label:String(o?.label ?? String.fromCharCode(65+i)).toUpperCase(),text:String(o?.text ?? o?.value ?? "")});
}

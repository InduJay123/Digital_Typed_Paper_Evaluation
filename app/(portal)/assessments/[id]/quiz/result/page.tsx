import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function McqResultPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data, error } = await createClient().rpc("rpc_student_get_mcq_result", { p_assessment_id: id });
  if (error) return <main className="content"><div className="error-box">{error.message}</div></main>;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.ok) return <main className="content"><div className="empty-state">Section A has not been submitted yet.<div style={{ marginTop: 16 }}><Link className="button" href={`/assessments/${id}/quiz`}>Go to quiz</Link></div></div></main>;

  const overallDone = result.overall_status === "completed";

  return (
    <main className="content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Section A complete</div>
          <h1>MCQ result</h1>
          <p>Your Section A score is available immediately. Your full paper result is calculated after the written section is marked.</p>
        </div>
       </div>

      <section className="result-hero">
        <div><div className="eyebrow">Section A score</div><div className="result-score">{result.score}/{result.max_score}</div></div>
        <div className="result-meta"><strong style={{ fontSize: 30, color: "white" }}>{Math.round(Number(result.percentage || 0))}%</strong><div style={{ marginTop: 7 }}>{result.correct_count} correct · {result.incorrect_count} incorrect</div></div>
      </section>

      <div className="result-grid">
        <Box label="Correct" value={String(result.correct_count)} tone="good" />
        <Box label="Incorrect" value={String(result.incorrect_count)} tone="bad" />
        <Box label="Answered" value={`${result.answered_count}/${result.total_questions}`} />
      </div>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="page-heading" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">Overall assessment</div>
            {overallDone ? <><h2>{result.total_score}/{result.total_max_marks} · {result.total_percentage}%</h2><p>Your written section is also complete, so the full result is available.</p></> : <><h2>Written section still pending</h2><p>Your MCQ score is saved. Continue to Sections B & C and upload one answer PDF.</p></>}
          </div>
          {overallDone ? <Link className="button" href={`/assessments/${id}/results`}>Full result <ArrowRight size={16}/></Link> : <Link className="button" href={`/assessments/${id}#written`}>Continue to written <ArrowRight size={16}/></Link>}
        </div>
      </section>

      <section style={{ marginTop: 36 }}>
        <div className="page-heading">
          <div>
            <div className="eyebrow">Question review</div>
            <h2>Your Section A breakdown</h2>
            <p>For fixed assessment security, the stored answer key is not displayed.</p>
          </div>
        </div>

        <div className="question-list">
          {(result.questions ?? []).map((q: any) => (
            <article key={q.question_id} className={`question-card ${q.is_correct ? "feedback-good" : "feedback-bad"}`}>
              <div className="question-head">
                <div style={{ flex: 1 }}>
                  <div className="helper-text">Question {q.question_number}</div>
                  <p style={{ margin: "7px 0 10px" }}>{q.question_text}</p>
                  <div className="helper-text">Your answer: <strong>{q.selected_option}</strong></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={`badge ${q.is_correct ? "good" : "bad"}`}>{q.is_correct ? <CheckCircle2 size={13}/> : <CircleX size={13}/>} {q.is_correct ? "Correct" : "Incorrect"}</span>
                  <div style={{ marginTop: 9, fontWeight: 850, color: "var(--navy)" }}>{q.awarded_marks}/{q.max_marks}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Box({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return <div className={`result-box ${tone === "good" ? "emphasis" : ""}`}><div className="label">{label}</div><div className="value">{value}</div></div>;
}

import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ResultsIndexPage() {
  const { data, error } = await createClient().rpc("rpc_student_list_assessments");
  const assessments = (Array.isArray(data) ? data : []) as any[];
  const completed = assessments.filter((a) => a.overall_status === "completed");
  const pending = assessments.filter((a) => a.overall_status !== "completed");
  const average = completed.length
    ? Math.round(completed.reduce((sum, a) => sum + Number(a.percentage || 0), 0) / completed.length)
    : 0;
  const best = completed.length ? Math.max(...completed.map((a) => Number(a.percentage || 0))) : 0;

  return (
    <main className="content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">Results centre</div>
          <h1>All results</h1>
          <p>Your completed assessment history in one place. Open any paper for detailed written feedback and section scores.</p>
        </div>
        <BarChart3 size={34} color="var(--sage)" strokeWidth={1.6}/>
      </div>

      {error ? <div className="error-box">{error.message}</div> : null}

      <div className="grid grid-3">
        <div className="card stat-card good"><div className="label">Completed papers</div><div className="value">{completed.length}</div></div>
        <div className="card stat-card sand"><div className="label">Average score</div><div className="value">{average}%</div></div>
        <div className="card stat-card clay"><div className="label">Best score</div><div className="value">{best}%</div></div>
      </div>

      <section style={{ marginTop: 34 }}>
        <div className="page-heading">
          <div>
            <div className="eyebrow">Completed</div>
            <h2>Assessment history</h2>
          </div>
        </div>

        {!completed.length ? (
          <div className="empty-state">No completed assessment results yet.</div>
        ) : (
          <div className="results-list">
            {completed.map((a) => (
              <article className="result-row" key={a.id}>
                <div className="result-row-main">
                  <div className="eyebrow">{a.subject_name}</div>
                  <h3>{a.title}</h3>
                  <span className="badge good">Completed</span>
                </div>
                <ResultCell label="MCQ" value={`${a.mcq_score}/${a.mcq_max_marks}`} />
                <ResultCell label="Written" value={`${a.written_score}/${a.written_max_marks}`} />
                <div className="overall-col"><ResultCell label="Overall" value={`${a.total_score}/${a.total_max_marks} · ${Math.round(Number(a.percentage || 0))}%`} /></div>
                <div className="result-row-actions"><Link className="button secondary" href={`/assessments/${a.id}/results`}>Details <ArrowRight size={15}/></Link></div>
              </article>
            ))}
          </div>
        )}
      </section>

      {pending.length ? (
        <section style={{ marginTop: 38 }}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">Still in progress</div>
              <h2>Pending results</h2>
              <p>These papers do not have a complete overall result yet.</p>
            </div>
          </div>
          <div className="grid grid-2">
            {pending.map((a) => (
              <article className="assessment-card" key={a.id}>
                <div className="assessment-card-head">
                  <div><div className="eyebrow">{a.subject_name}</div><h3>{a.title}</h3></div>
                  <span className={`badge ${a.overall_status === "in_progress" ? "warning" : ""}`}>{pretty(a.overall_status)}</span>
                </div>
                <div className="helper-text">MCQ: {a.mcq_status === "completed" ? `${a.mcq_score}/${a.mcq_max_marks}` : "pending"} · Written: {pretty(a.written_status)}</div>
                <Link className="button secondary" href={`/assessments/${a.id}`}>Continue assessment</Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ResultCell({ label, value }: { label: string; value: string }) {
  return <div><div className="result-row-label">{label}</div><div className="result-row-score">{value}</div></div>;
}
function pretty(v: string) { return String(v || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()); }

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers3,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

// ============================================================
// TYPES
// ============================================================

type Assessment = {
  id: string;

  title: string;

  subject_code?: string | null;
  subject_name?: string | null;

  total_questions?: number;
  total_marks?: number;

  overall_status?: string;

  mcq_status?: string;
  written_status?: string;

  mcq_score?: number;
  mcq_max_marks?: number;

  written_score?: number;
  written_max_marks?: number;

  total_score?: number;
  total_max_marks?: number;

  percentage?: number;
};

type SubjectGroup = {
  code: string;
  name: string;

  assessments: Assessment[];

  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;

  average: number;
};

// ============================================================
// DASHBOARD
// ============================================================

export default async function DashboardPage() {
  const supabase = createClient();

  // ==========================================================
  // USER
  // ==========================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  // ==========================================================
  // ASSESSMENTS
  // ==========================================================

  const {
    data,
    error,
  } = await supabase.rpc(
    "rpc_student_list_assessments"
  );

  const assessments = (
    Array.isArray(data)
      ? data
      : []
  ) as Assessment[];

  // ==========================================================
  // GLOBAL STATS
  // ==========================================================

  const completedAssessments =
    assessments.filter(
      (assessment) =>
        assessment.overall_status ===
        "completed"
    );

  const inProgressAssessments =
    assessments.filter(
      (assessment) =>
        assessment.overall_status ===
        "in_progress"
    );

  const overallAverage =
    completedAssessments.length > 0
      ? Math.round(
          completedAssessments.reduce(
            (sum, assessment) =>
              sum +
              Number(
                assessment.percentage ??
                  0
              ),
            0
          ) /
            completedAssessments.length
        )
      : 0;

  // ==========================================================
  // GROUP PAPERS BY SUBJECT / MODULE
  // ==========================================================

  const subjectMap =
    new Map<string, Assessment[]>();

  for (const assessment of assessments) {
    const code =
      assessment.subject_code ||
      assessment.subject_name ||
      "OTHER";

    const existing =
      subjectMap.get(code) || [];

    existing.push(assessment);

    subjectMap.set(
      code,
      existing
    );
  }

  const subjects: SubjectGroup[] =
    Array.from(
      subjectMap.entries()
    )
      .map(
        ([code, items]) => {
          const completed =
            items.filter(
              (item) =>
                item.overall_status ===
                "completed"
            );

          const inProgress =
            items.filter(
              (item) =>
                item.overall_status ===
                "in_progress"
            );

          const notStarted =
            items.filter(
              (item) =>
                item.overall_status ===
                  "not_started" ||
                !item.overall_status
            );

          const average =
            completed.length > 0
              ? Math.round(
                  completed.reduce(
                    (
                      total,
                      assessment
                    ) =>
                      total +
                      Number(
                        assessment.percentage ??
                          0
                      ),
                    0
                  ) /
                    completed.length
                )
              : 0;

          return {
            code,

            name:
              items[0]
                ?.subject_name ||
              code,

            assessments:
              items,

            total:
              items.length,

            completed:
              completed.length,

            inProgress:
              inProgress.length,

            notStarted:
              notStarted.length,

            average,
          };
        }
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

  const name =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    "Student";

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main className="content">

      {/* ====================================================
          HERO
      ==================================================== */}

      <section className="hero-panel">
        <div>
          <div className="eyebrow">
            Student dashboard
          </div>

          <h1>
            Welcome back, {name}
          </h1>

          <p>
            Choose a module to view its
            assessment papers, continue
            unfinished work and review
            your results.
          </p>
        </div>

        <div className="hero-score">
          <strong>
            {overallAverage}%
          </strong>

          <span>
            completed-paper average
          </span>
        </div>
      </section>

      {/* ====================================================
          TOP STATS
      ==================================================== */}

      <div className="grid grid-4">
        <Stat
          label="Modules"
          value={String(
            subjects.length
          )}
        />

        <Stat
          label="Available papers"
          value={String(
            assessments.length
          )}
        />

        <Stat
          label="Completed"
          value={String(
            completedAssessments.length
          )}
          tone="good"
        />

        <Stat
          label="In progress"
          value={String(
            inProgressAssessments.length
          )}
          tone="sand"
        />
      </div>

      {/* ====================================================
          MODULES
      ==================================================== */}

      <section
        style={{
          marginTop: 38,
        }}
      >
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              Your modules
            </div>
          </div>
        </div>

        {error ? (
          <div className="error-box">
            {error.message}
          </div>
        ) : null}

        {!subjects.length ? (
          <div className="empty-state">
            No modules are currently
            available.
          </div>
        ) : (
          <div className="module-grid">

            {subjects.map(
              (subject) => (
                <article
                  className="module-card"
                  key={
                    subject.code
                  }
                > 

                  {/* TITLE */}

                  <div className="module-card-content">

                    <h2>
                      {subject.name}
                    </h2>

                    

                  </div>

                  {/* PROGRESS */}

                  <div className="module-stats">

                    <div className="module-stat">
                      <div className="module-stat-icon">
                        <Layers3
                          size={15}
                        />
                      </div>

                      <div>
                        <span>
                          Papers
                        </span>

                        <strong>
                          {
                            subject.total
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="module-stat">
                      <div className="module-stat-icon">
                        <CheckCircle2
                          size={15}
                        />
                      </div>

                      <div>
                        <span>
                          Completed
                        </span>

                        <strong>
                          {
                            subject.completed
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="module-stat">
                      <div className="module-stat-icon">
                        <Clock3
                          size={15}
                        />
                      </div>

                      <div>
                        <span>
                          In progress
                        </span>

                        <strong>
                          {
                            subject.inProgress
                          }
                        </strong>
                      </div>
                    </div>

                  </div>

                  {/* PROGRESS BAR */}

                  <div className="module-progress">

                    <div className="module-progress-head">
                      <span>
                        Module progress
                      </span>

                      <strong>
                        {subject.total >
                        0
                          ? Math.round(
                              (subject.completed /
                                subject.total) *
                                100
                            )
                          : 0}
                        %
                      </strong>
                    </div>

                    <div className="module-progress-bar">
                      <span
                        style={{
                          width: `${
                            subject.total >
                            0
                              ? Math.round(
                                  (subject.completed /
                                    subject.total) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>

                  </div>

                  {/* ACTION */}

                  <Link
                    className="module-open-button"
                    href={`/assessments?subject=${encodeURIComponent(
                      subject.code
                    )}`}
                  >
                    Open {subject.name}

                    <ArrowRight
                      size={17}
                    />
                  </Link>

                </article>
              )
            )}

          </div>
        )}
      </section>

    </main>
  );
}

// ============================================================
// STAT
// ============================================================

function Stat({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div
      className={`card stat-card ${tone}`}
    >
      <div className="label">
        {label}
      </div>

      <div className="value">
        {value}
      </div>
    </div>
  );
}
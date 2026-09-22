import {
  ArrowLeft,
} from "lucide-react";

import Link from "next/link";

import TypedResultView from "@/components/assessment/TypedResultView";

export default function AssessmentResultsPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const assessmentId =
    String(
      params.id || ""
    ).trim();

  return (
    <main className="content">

      <Link
        href={`/assessments/${assessmentId}`}
        className="back-link"
      >
        <ArrowLeft
          size={16}
        />

        Back to assessment
      </Link>

      <div
        style={{
          marginTop: 24,
        }}
      >
        <TypedResultView
          assessmentId={
            assessmentId
          }
        />
      </div>

    </main>
  );
}
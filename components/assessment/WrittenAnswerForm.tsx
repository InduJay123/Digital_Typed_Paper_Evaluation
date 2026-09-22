"use client";

import {
  AlertCircle,
  Loader2,
  Send,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type WrittenQuestion = {
  id: string;

  question_number:
    | string
    | number;

  section:
    | string
    | null;

  question_type:
    | string
    | null;

  question_text: string;

  marks: number;
};

export default function WrittenAnswerForm({
  attemptId,
  assessmentId,
  questions,
}: {
  attemptId: string;
  assessmentId: string;
  questions: WrittenQuestion[];
}) {
  const router =
    useRouter();

  const [answers, setAnswers] =
    useState<
      Record<string, string>
    >({});

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const answeredCount =
    useMemo(
      () =>
        questions.filter(
          (question) =>
            Boolean(
              (
                answers[
                  question.id
                ] || ""
              ).trim()
            )
        ).length,
      [
        questions,
        answers,
      ]
    );

  const blankCount =
    questions.length -
    answeredCount;

  function changeAnswer(
    questionId: string,
    value: string
  ) {
    if (submitting) {
      return;
    }

    setAnswers(
      (previous) => ({
        ...previous,
        [questionId]:
          value,
      })
    );
  }

  async function submit() {
    if (submitting) {
      return;
    }

    if (blankCount > 0) {
      const confirmed =
        window.confirm(
          `${blankCount} question${
            blankCount === 1
              ? " is"
              : "s are"
          } blank. Submit anyway?`
        );

      if (!confirmed) {
        return;
      }
    }

    setSubmitting(true);
    setError("");

    const payload =
      questions.map(
        (question) => ({
          question_id:
            question.id,

          question_number:
            question.question_number,

          answer_text:
            answers[
              question.id
            ] || "",
        })
      );

    try {
      const response =
        await fetch(
          "/api/mark-written-text",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                attempt_id:
                  attemptId,

                assessment_id:
                  assessmentId,

                answers:
                  payload,
              }),
          }
        );

      const text =
        await response.text();

      let result:
        any = null;

      try {
        result =
          text
            ? JSON.parse(
                text
              )
            : null;
      } catch {
        result = null;
      }

      console.log(
        "Marking API:",
        result
      );

      if (!response.ok) {
        setError(
          result?.error ||
            `AI marking failed. HTTP ${response.status}`
        );

        setSubmitting(false);

        return;
      }

      if (
        result?.ok === false
      ) {
        setError(
          result?.error ||
            "AI marking failed."
        );

        setSubmitting(false);

        return;
      }

      router.push(
        `/assessments/${assessmentId}/results`
      );

      router.refresh();
    } catch (err) {
      console.error(
        err
      );

      setError(
        "Could not connect to the AI marking service."
      );

      setSubmitting(false);
    }
  }

  return (
    <div className="written-entry">

      <section className="written-entry-heading">

        <div>

          <div className="eyebrow">
            Sections B & C
          </div>

          <h2>
            Written answers
          </h2>

          <p>
            Type your answers
            below. They will be
            sent directly for AI
            marking when you
            submit.
          </p>

        </div>

        <div className="written-answer-progress">

          <strong>
            {answeredCount}
            {" / "}
            {questions.length}
          </strong>

          <span>
            answered
          </span>

        </div>

      </section>

      {error ? (
        <div className="error-box">

          <AlertCircle
            size={16}
          />

          {error}

        </div>
      ) : null}

      <div className="written-question-list">

        {questions.map(
          (question) => {
            const value =
              answers[
                question.id
              ] || "";

            const words =
              value
                .trim()
                .split(/\s+/)
                .filter(
                  Boolean
                ).length;

            const isEssay =
              String(
                question.section
              ).toUpperCase() ===
                "C" ||
              Number(
                question.marks
              ) > 5;

            return (
              <article
                key={
                  question.id
                }
                className="written-question-card"
              >

                <div className="written-question-meta">

                  <span>
                    Section{" "}
                    {
                      question.section
                    }
                  </span>

                  <span>
                    Question{" "}
                    {
                      question.question_number
                    }
                  </span>

                  <strong>
                    {
                      question.marks
                    }{" "}
                    marks
                  </strong>

                </div>

                <h3>
                  {
                    question.question_text
                  }
                </h3>

                <label className="written-answer-label">
                  Your answer
                </label>

                <textarea
                  value={
                    value
                  }
                  disabled={
                    submitting
                  }
                  rows={
                    isEssay
                      ? 10
                      : 5
                  }
                  className="written-answer-textarea"
                  placeholder={
                    isEssay
                      ? "Write your complete answer here..."
                      : "Type your answer here..."
                  }
                  onChange={(
                    event
                  ) =>
                    changeAnswer(
                      question.id,
                      event
                        .target
                        .value
                    )
                  }
                />

                <div className="written-answer-footer">

                  <span>
                    {words}{" "}
                    word
                    {words === 1
                      ? ""
                      : "s"}
                  </span>

                  <span>
                    Not submitted
                  </span>

                </div>

              </article>
            );
          }
        )}

      </div>

      <section className="written-submit-card">

        <div>

          <h3>
            Ready to submit?
          </h3>

          <p>
            {blankCount === 0
              ? "All written questions have an answer."
              : `${blankCount} questions are currently blank.`}
          </p>

        </div>

        <button
          type="button"
          className="button"
          disabled={
            submitting
          }
          onClick={
            submit
          }
        >
          {submitting ? (
            <>
              <Loader2
                size={17}
                className="written-spin"
              />

              AI marking…
            </>
          ) : (
            <>
              <Send
                size={16}
              />

              Submit & mark
            </>
          )}
        </button>

      </section>

    </div>
  );
}
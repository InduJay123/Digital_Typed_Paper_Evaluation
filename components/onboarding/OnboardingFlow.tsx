"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { useState } from "react";

// ============================================================
// QUESTIONS
// ============================================================

const questions = [
  {
    id: "goal",
    title:
      "What is your main goal right now?",
    subtitle:
      "Choose the option that best matches what you want to achieve.",
    options: [
      "Improve my overall grades",
      "Prepare for upcoming exams",
      "Strengthen weak subjects",
      "Practice more past-paper questions",
    ],
  },

  {
    id: "confidence",
    title:
      "How confident do you currently feel about your Commerce subjects?",
    subtitle:
      "Choose the answer that feels closest to you.",
    options: [
      "Very confident",
      "Fairly confident",
      "I need more practice",
      "I'm just getting started",
    ],
  },

  {
    id: "learning_style",
    title:
      "What type of learning helps you most?",
    subtitle:
      "Pick the learning style you usually prefer.",
    options: [
      "Practice questions",
      "Short explanations",
      "Full exam papers",
      "Learning from my mistakes",
    ],
  },

  {
    id: "frequency",
    title:
      "How often would you like to practice?",
    subtitle:
      "Choose your ideal study routine.",
    options: [
      "Every day",
      "A few times a week",
      "Once a week",
      "Whenever I have an exam coming up",
    ],
  },

  {
    id: "first_goal",
    title:
      "What would you like to achieve first?",
    subtitle:
      "One final question before entering your workspace.",
    options: [
      "Complete my first assessment",
      "Improve my MCQ score",
      "Practice written answers",
      "See how well I currently perform",
    ],
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function OnboardingFlow() {
  const router = useRouter();

  const [currentStep, setCurrentStep] =
    useState(0);

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [completed, setCompleted] =
    useState(false);

  const [transitioning, setTransitioning] =
    useState(false);

  const question =
    questions[currentStep];

  const selectedAnswer =
    answers[question.id];

  const progress =
    Math.round(
      ((currentStep + 1) /
        questions.length) *
        100
    );

  // ==========================================================
  // SELECT ANSWER
  // ==========================================================

  function selectOption(
    option: string
  ) {
    if (transitioning) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [question.id]: option,
    }));

    setTransitioning(true);

    setTimeout(() => {
      if (
        currentStep ===
        questions.length - 1
      ) {
        setCompleted(true);
        setTransitioning(false);

        return;
      }

      setCurrentStep(
        (previous) =>
          previous + 1
      );

      setTransitioning(false);
    }, 350);
  }

  // ==========================================================
  // BACK
  // ==========================================================

  function goBack() {
    if (
      transitioning ||
      currentStep === 0
    ) {
      return;
    }

    setCurrentStep(
      (previous) =>
        previous - 1
    );
  }

  // ==========================================================
  // FINISH
  // ==========================================================

  function finishOnboarding() {
    // Answers are intentionally
    // not stored anywhere.

    router.replace(
      "/dashboard"
    );
  }

  // ==========================================================
  // COMPLETE SCREEN
  // ==========================================================

  if (completed) {
    return (
      <main className="simple-onboarding">

        <section className="simple-onboarding-card simple-complete">

          <div className="simple-complete-icon">
            <Check size={24} />
          </div>

          <div className="simple-brand">
            Commerce College Online
          </div>

          <h1>
            You're all set.
          </h1>

          <p>
            Your learning workspace is
            ready. Start exploring your
            modules and assessment
            papers.
          </p>

          <button
            type="button"
            className="simple-finish-button"
            onClick={
              finishOnboarding
            }
          >
            Go to dashboard

            <ArrowRight
              size={17}
            />
          </button>

        </section>

      </main>
    );
  }

  // ==========================================================
  // QUESTION SCREEN
  // ==========================================================

  return (
    <main className="simple-onboarding">

      <section className="simple-onboarding-card">

        {/* ==================================================
            BRAND
        ================================================== */}

        <div className="simple-brand-row">

          <div className="simple-logo">
            CC
          </div>

          <div>
            <strong>
              Commerce College
            </strong>

          </div>

        </div>

        {/* ==================================================
            PROGRESS
        ================================================== */}

        <div className="simple-progress-top">

          <span>
            Question{" "}
            {currentStep + 1}{" "}
            of{" "}
            {questions.length}
          </span>

          <strong>
            {progress}%
          </strong>

        </div>

        <div className="simple-progress">

          {questions.map(
            (item, index) => (
              <span
                key={item.id}
                className={
                  index <=
                  currentStep
                    ? "active"
                    : ""
                }
              />
            )
          )}

        </div>

        {/* ==================================================
            QUESTION
        ================================================== */}

        <div className="simple-question">

          <h1>
            {question.title}
          </h1>

          <p>
            {question.subtitle}
          </p>

        </div>

        {/* ==================================================
            OPTIONS
        ================================================== */}

        <div className="simple-options">

          {question.options.map(
            (option) => {
              const selected =
                selectedAnswer ===
                option;

              return (
                <button
                  key={option}
                  type="button"
                  disabled={
                    transitioning
                  }
                  className={`simple-option ${
                    selected
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    selectOption(
                      option
                    )
                  }
                >

                  <span>
                    {option}
                  </span>

                  <span className="simple-option-icon">
                    {selected ? (
                      <Check
                        size={16}
                      />
                    ) : (
                      <ArrowRight
                        size={16}
                      />
                    )}
                  </span>

                </button>
              );
            }
          )}

        </div>

        {/* ==================================================
            BOTTOM
        ================================================== */}

        <div className="simple-onboarding-footer">

          {currentStep > 0 ? (
            <button
              type="button"
              className="simple-back-button"
              disabled={
                transitioning
              }
              onClick={goBack}
            >
              <ArrowLeft
                size={15}
              />

              Back
            </button>
          ) : (
            <span />
          )}

          <span>
            Select an option to
            continue
          </span>

        </div>

      </section>

    </main>
  );
}
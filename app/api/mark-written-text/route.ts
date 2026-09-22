import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractAttemptId(
  raw: any
): string | null {
  if (
    typeof raw ===
    "string"
  ) {
    return raw;
  }

  const first =
    Array.isArray(raw)
      ? raw[0]
      : raw;

  return (
    first?.attempt_id ??
    first?.id ??
    first?.data
      ?.attempt_id ??
    first?.data?.id ??
    null
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const attemptId =
      String(
        body?.attempt_id ||
          ""
      ).trim();

    const assessmentId =
      String(
        body?.assessment_id ||
          ""
      ).trim();

    const answers =
      Array.isArray(
        body?.answers
      )
        ? body.answers
        : [];

    // ========================================================
    // VALIDATE
    // ========================================================

    if (
      !UUID_RE.test(
        attemptId
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid attempt_id.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !UUID_RE.test(
        assessmentId
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid assessment_id.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      answers.length !==
      15
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            `Expected 15 written answers, received ${answers.length}.`,
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // AUTH
    // ========================================================

    const supabase =
      createClient();

    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    // ========================================================
    // VERIFY ATTEMPT BELONGS TO USER
    //
    // This RPC returns the attempt belonging to the
    // authenticated student.
    // ========================================================

    const {
      data:
        attemptData,
      error:
        attemptError,
    } =
      await supabase.rpc(
        "rpc_student_get_or_create_attempt",
        {
          p_assessment_id:
            assessmentId,
        }
      );

    if (attemptError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            attemptError.message,
        },
        {
          status: 403,
        }
      );
    }

    const ownedAttemptId =
      extractAttemptId(
        attemptData
      );

    if (
      !ownedAttemptId ||
      ownedAttemptId !==
        attemptId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Attempt does not belong to the authenticated student.",
        },
        {
          status: 403,
        }
      );
    }

    // ========================================================
    // N8N
    // ========================================================

    const webhookUrl =
      process.env
        .N8N_MARK_WRITTEN_TEXT_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "N8N_MARK_WRITTEN_TEXT_WEBHOOK_URL is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "[AI MARKING] Calling:",
      webhookUrl
    );

    console.log(
      "[AI MARKING] Attempt:",
      attemptId
    );

    console.log(
      "[AI MARKING] Answers:",
      answers.length
    );

    // ========================================================
    // IMPORTANT:
    // WAIT FOR N8N TO FINISH.
    // ========================================================

    const n8nResponse =
      await fetch(
        webhookUrl,
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

              answers,
            }),

          cache:
            "no-store",
        }
      );

    const text =
      await n8nResponse.text();

    console.log(
      "[AI MARKING] n8n status:",
      n8nResponse.status
    );

    console.log(
      "[AI MARKING] n8n response:",
      text
    );

    let result:
      any = null;

    try {
      result =
        text
          ? JSON.parse(text)
          : null;
    } catch {
      result = null;
    }

    if (
      !n8nResponse.ok
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            result?.error ||
            result?.message ||
            `n8n returned HTTP ${n8nResponse.status}`,
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json(
      result ?? {
        ok: true,
        attempt_id:
          attemptId,
      }
    );
  } catch (error: any) {
    console.error(
      "[AI MARKING ERROR]",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error?.message ||
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}
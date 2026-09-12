import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FoundingMemberFormConfig, FormQuestion } from '@/types/foundingMember';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === SECURE_TOKEN) {
    return true;
  }
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader.includes(`admin_token=${SECURE_TOKEN}`)) {
    return true;
  }
  return false;
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const config = await db.foundingMemberFormConfig.getConfig();
    return NextResponse.json({ config }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error fetching founding member form config:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch form configuration.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const { action, config, question, questionId, status } = body;

    const currentConfig: FoundingMemberFormConfig = await db.foundingMemberFormConfig.getConfig();

    // 1. Full Config Save / Update
    if (action === 'save_config' || action === 'update_all') {
      if (!config || !Array.isArray(config.questions)) {
        return NextResponse.json(
          { error: 'Valid configuration object with questions array is required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const updatedConfig: FoundingMemberFormConfig = {
        ...currentConfig,
        ...config,
        version: (currentConfig.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };

      await db.foundingMemberFormConfig.saveConfig(updatedConfig);

      return NextResponse.json(
        {
          success: true,
          message: 'Form configuration saved successfully.',
          config: updatedConfig
        },
        { headers: noStoreHeaders }
      );
    }

    // 2. Publish / Unpublish Status Change
    if (action === 'set_status') {
      const newStatus = status === 'Published' ? 'Published' : 'Draft';
      const updatedConfig: FoundingMemberFormConfig = {
        ...currentConfig,
        status: newStatus,
        version: (currentConfig.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };

      await db.foundingMemberFormConfig.saveConfig(updatedConfig);

      return NextResponse.json(
        {
          success: true,
          message: `Form status updated to ${newStatus}.`,
          status: newStatus,
          config: updatedConfig
        },
        { headers: noStoreHeaders }
      );
    }

    // 3. Add a new Question
    if (action === 'add_question') {
      if (!question || !question.label || !question.type) {
        return NextResponse.json(
          { error: 'Question label and field type are required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const qId =
        question.id?.trim() ||
        `q_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

      const newQuestion: FormQuestion = {
        id: qId,
        type: question.type,
        label: question.label.trim(),
        placeholder: question.placeholder?.trim() || '',
        helpText: question.helpText?.trim() || '',
        required: Boolean(question.required),
        enabled: question.enabled !== false,
        options: Array.isArray(question.options)
          ? question.options.filter(Boolean).map((o: string) => o.trim())
          : [],
        step: question.step || 4,
        order: (currentConfig.questions?.length || 0) + 1
      };

      const updatedQuestions = [...(currentConfig.questions || []), newQuestion];
      const updatedConfig: FoundingMemberFormConfig = {
        ...currentConfig,
        questions: updatedQuestions,
        version: (currentConfig.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };

      await db.foundingMemberFormConfig.saveConfig(updatedConfig);

      return NextResponse.json(
        {
          success: true,
          message: `Question "${newQuestion.label}" added successfully.`,
          config: updatedConfig,
          question: newQuestion
        },
        { headers: noStoreHeaders }
      );
    }

    // 4. Update an existing Question
    if (action === 'edit_question') {
      const targetQId = questionId || question?.id;
      if (!targetQId) {
        return NextResponse.json(
          { error: 'Question ID is required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const questions = [...(currentConfig.questions || [])];
      const idx = questions.findIndex((q) => q.id === targetQId);
      if (idx === -1) {
        return NextResponse.json(
          { error: 'Question not found in form configuration.' },
          { status: 404, headers: noStoreHeaders }
        );
      }

      questions[idx] = {
        ...questions[idx],
        ...question,
        id: targetQId // preserve ID
      };

      const updatedConfig: FoundingMemberFormConfig = {
        ...currentConfig,
        questions,
        version: (currentConfig.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };

      await db.foundingMemberFormConfig.saveConfig(updatedConfig);

      return NextResponse.json(
        {
          success: true,
          message: 'Question updated successfully.',
          config: updatedConfig
        },
        { headers: noStoreHeaders }
      );
    }

    // 5. Delete a Question
    if (action === 'delete_question') {
      const targetQId = questionId || question?.id;
      if (!targetQId) {
        return NextResponse.json(
          { error: 'Question ID is required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      let questions = (currentConfig.questions || []).filter((q) => q.id !== targetQId);
      // Re-index order
      questions = questions.map((q, idx) => ({ ...q, order: idx + 1 }));

      const updatedConfig: FoundingMemberFormConfig = {
        ...currentConfig,
        questions,
        version: (currentConfig.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };

      await db.foundingMemberFormConfig.saveConfig(updatedConfig);

      return NextResponse.json(
        {
          success: true,
          message: 'Question removed from form configuration.',
          config: updatedConfig
        },
        { headers: noStoreHeaders }
      );
    }

    // 6. Reorder Questions
    if (action === 'reorder') {
      const { questionIds } = body;
      if (!Array.isArray(questionIds)) {
        return NextResponse.json(
          { error: 'Array of questionIds in new order is required.' },
          { status: 400, headers: noStoreHeaders }
        );
      }

      const questionsMap = new Map((currentConfig.questions || []).map((q) => [q.id, q]));
      const newQuestions: FormQuestion[] = [];

      questionIds.forEach((id: string, idx: number) => {
        const q = questionsMap.get(id);
        if (q) {
          newQuestions.push({ ...q, order: idx + 1 });
          questionsMap.delete(id);
        }
      });

      // Append any missing questions
      questionsMap.forEach((q) => {
        newQuestions.push({ ...q, order: newQuestions.length + 1 });
      });

      const updatedConfig: FoundingMemberFormConfig = {
        ...currentConfig,
        questions: newQuestions,
        version: (currentConfig.version || 1) + 1,
        updatedAt: new Date().toISOString()
      };

      await db.foundingMemberFormConfig.saveConfig(updatedConfig);

      return NextResponse.json(
        {
          success: true,
          message: 'Questions reordered successfully.',
          config: updatedConfig
        },
        { headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400, headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error saving form config:', err);
    return NextResponse.json(
      { error: err.message || 'Server error occurred while saving form config.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

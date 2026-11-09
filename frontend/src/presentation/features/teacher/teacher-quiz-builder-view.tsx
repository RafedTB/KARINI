"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { coursesService } from "@/application/services/courses-service";
import { quizzesService } from "@/application/services/quizzes-service";
import type { Course } from "@/domain/entities/course";
import type { Quiz, QuizStudentResults } from "@/domain/entities/quiz";
import { useAuth } from "@/presentation/providers/auth-provider";
import { PageLoader } from "@/presentation/components/ui/page-loader";

type DraftQuestion = { prompt: string; options: string[]; correctOption: number; points: number };
const emptyQuestion = (): DraftQuestion => ({ prompt: "", options: ["", "", "", ""], correctOption: 0, points: 1 });

export function TeacherQuizBuilderView() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const requestedCourseId = Number(searchParams.get("courseId") || 0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState(requestedCourseId);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<Record<number, QuizStudentResults[]>>({});
  const [resultsQuiz, setResultsQuiz] = useState<Quiz | null>(null);
  const [resultsLoading, setResultsLoading] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedCourse = useMemo(() => courses.find((course) => course.id === courseId), [courses, courseId]);

  useEffect(() => {
    if (!token) return;
    coursesService.list(token).then((result) => {
      setCourses(result);
      if (!courseId && result[0]) setCourseId(result[0].id);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Impossible de charger les cours."))
      .finally(() => setLoading(false));
  }, [token, courseId]);

  useEffect(() => {
    if (!token || !courseId) return;
    quizzesService.listManaged(token, courseId).then(setQuizzes)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Impossible de charger les quiz."));
  }, [token, courseId]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDurationMinutes(30);
    setMaxAttempts(1);
    setQuestions([emptyQuestion()]);
  };

  const updateQuestion = (index: number, patch: Partial<DraftQuestion>) => {
    setQuestions((current) => current.map((question, itemIndex) => itemIndex === index ? { ...question, ...patch } : question));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !courseId || !title.trim() || saving) return;
    if (questions.some((question) => !question.prompt.trim() || question.options.some((option) => !option.trim()))) {
      setError("Complétez toutes les questions et les options.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      let quiz: Quiz;
      if (editingId) {
        quiz = await quizzesService.update(token, editingId, { title: title.trim(), durationMinutes, maxAttempts });
        const existingQuiz = quizzes.find((item) => item.id === editingId);
        for (const [index, question] of questions.entries()) {
          const existingQuestion = existingQuiz?.questions?.[index];
          const data = {
            prompt: question.prompt.trim(),
            options: question.options.map((option) => option.trim()),
            correctOption: question.correctOption,
            points: question.points,
          };
          if (existingQuestion) await quizzesService.updateQuestion(token, existingQuestion.id, data);
          else await quizzesService.addQuestion(token, quiz.id, data);
        }
        for (const question of (existingQuiz?.questions ?? []).slice(questions.length)) {
          await quizzesService.removeQuestion(token, question.id);
        }
      } else {
        quiz = await quizzesService.create(token, { title: title.trim(), courseId, durationMinutes, maxAttempts });
      }
      if (!editingId) {
        await quizzesService.addQuestions(token, quiz.id, questions.map((question) => ({
          ...question,
          prompt: question.prompt.trim(),
          options: question.options.map((option) => option.trim()),
        })));
      }
      setQuizzes(await quizzesService.listManaged(token, courseId));
      resetForm();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible d’enregistrer le quiz.");
    } finally {
      setSaving(false);
    }
  };

  const edit = (quiz: Quiz) => {
    setEditingId(quiz.id);
    setTitle(quiz.title);
    setDurationMinutes(quiz.durationMinutes ?? 30);
    setMaxAttempts(quiz.maxAttempts ?? 1);
    setQuestions((quiz.questions ?? []).map((question) => ({
      prompt: question.prompt,
      options: question.options,
      correctOption: question.correctOption,
      points: question.points,
    })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (quiz: Quiz) => {
    if (!token || !window.confirm(`Supprimer le quiz « ${quiz.title} » ?`)) return;
    try {
      await quizzesService.remove(token, quiz.id);
      setQuizzes((current) => current.filter((item) => item.id !== quiz.id));
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de supprimer le quiz.");
    }
  };

  const loadResults = async (quizId: number) => {
    if (!token || resultsLoading === quizId) return;
    try {
      setResultsLoading(quizId);
      setError("");
      const quizResults = await quizzesService.listResults(token, quizId);
      setResults((current) => ({ ...current, [quizId]: quizResults }));
      setResultsQuiz(quizzes.find((quiz) => quiz.id === quizId) ?? null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger les résultats.");
    } finally {
      setResultsLoading(null);
    }
  };

  if (loading) return <PageLoader label="Chargement du gestionnaire de quiz…" />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="badge badge-accent text-xs font-bold uppercase tracking-wider">Teacher Studio</span>
          <h1 className="mt-3 font-serif text-3xl font-bold" style={{ color: "var(--ink)" }}>Gestionnaire de quiz</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Créez des évaluations chronométrées et gérez vos quiz.</p>
        </div>
        <Link href="/teacher" className="text-sm font-semibold text-indigo-600">← Retour au studio</Link>
      </header>

      {error && <div className="alert-error" role="alert">{error}</div>}

      <section className="glass-card rounded-3xl p-5 sm:p-7">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end" style={{ borderColor: "var(--line)" }}>
          <label className="flex-1 text-xs font-bold">Cours
            <select value={courseId || ""} onChange={(event) => { setCourseId(Number(event.target.value)); resetForm(); }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal">
              <option value="">Sélectionner un cours</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
          <div className="rounded-xl bg-indigo-50 px-4 py-3 text-xs text-indigo-700">{selectedCourse?.lessons?.length ?? 0} leçon(s)</div>
        </div>

        <form onSubmit={save} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-[1fr_180px_180px]">
            <label className="text-xs font-bold">Titre du quiz
              <input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={150} placeholder="Ex. Évaluation du chapitre 1" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-bold">Durée (minutes)
              <input type="number" min={1} max={180} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal" />
            </label>
            <label className="text-xs font-bold">Nombre de tentatives
              <input type="number" min={1} max={20} value={maxAttempts} onChange={(event) => setMaxAttempts(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal" />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-indigo-700">Questions ({questions.length})</h2>
              <button type="button" onClick={() => setQuestions((current) => [...current, emptyQuestion()])} className="rounded-xl bg-indigo-100 px-3 py-2 text-xs font-bold text-indigo-700">+ Ajouter</button>
            </div>
            {questions.map((question, index) => (
              <div key={index} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between"><span className="text-xs font-bold">Question {index + 1}</span>{questions.length > 1 && <button type="button" onClick={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs text-rose-600">Supprimer</button>}</div>
                <input value={question.prompt} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} required placeholder="Énoncé de la question" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />
                <div className="grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <input key={optionIndex} value={option} onChange={(event) => { const options = [...question.options]; options[optionIndex] = event.target.value; updateQuestion(index, { options }); }} required placeholder={`Option ${optionIndex + 1}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" />)}</div>
                <div className="flex gap-3"><label className="text-xs font-bold">Bonne réponse<select value={question.correctOption} onChange={(event) => updateQuestion(index, { correctOption: Number(event.target.value) })} className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal">{question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Option {optionIndex + 1}</option>)}</select></label><label className="text-xs font-bold">Points<input type="number" min={1} value={question.points} onChange={(event) => updateQuestion(index, { points: Number(event.target.value) })} className="mt-1 block w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal" /></label></div>
              </div>
            ))}
          </div>
          <div className="flex gap-3"><button type="submit" disabled={saving || !courseId} className="btn-primary rounded-xl px-5 py-3 text-sm font-bold">{saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Créer le quiz"}</button>{editingId && <button type="button" onClick={resetForm} className="btn-secondary rounded-xl px-5 py-3 text-sm">Annuler</button>}</div>
        </form>
      </section>

      <section className="glass-card rounded-3xl p-5 sm:p-7">
        <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>Quiz existants</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{quizzes.map((quiz) => <div key={quiz.id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{quiz.title}</h3><p className="mt-1 text-xs text-slate-500">⏱ {quiz.durationMinutes ?? 30} minutes · 🔁 {quiz.maxAttempts ?? 1} tentative(s)</p></div><div className="flex gap-2"><button type="button" onClick={() => edit(quiz)} className="text-xs font-semibold text-indigo-600">Modifier</button><button type="button" onClick={() => void remove(quiz)} className="text-xs font-semibold text-rose-600">Supprimer</button></div></div><button type="button" onClick={() => void loadResults(quiz.id)} className="mt-4 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">{resultsLoading === quiz.id ? "Chargement…" : "Voir les résultats"}</button></div>)}</div>
        {quizzes.length === 0 && <p className="mt-4 text-sm text-slate-500">Aucun quiz pour ce cours.</p>}
      </section>
      {resultsQuiz && results[resultsQuiz.id] && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Résultats du quiz">
        <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold text-slate-900">Résultats — {resultsQuiz.title}</h2><p className="mt-1 text-sm text-slate-500">Résultats regroupés par élève</p></div><button type="button" onClick={() => setResultsQuiz(null)} className="rounded-xl px-3 py-2 text-xl text-slate-500 hover:bg-slate-100" aria-label="Fermer">×</button></div>
          <div className="mt-6 space-y-3">{results[resultsQuiz.id].map((student) => <div key={student.studentId} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-slate-900">{student.studentName}</p><p className="text-xs text-slate-500">{student.attemptCount} tentative(s) · meilleure note: {student.bestPercentage}%</p></div><span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">{student.attemptCount} / {resultsQuiz.maxAttempts ?? 1}</span></div><div className="mt-3 space-y-1 text-sm">{student.attempts.map((attempt, index) => <div key={attempt.id} className="flex justify-between border-t border-slate-100 pt-2"><span>Tentative {student.attempts.length - index} · {new Date(attempt.takenAt).toLocaleDateString("fr-FR")}</span><strong>{attempt.score}/{attempt.maxScore} ({attempt.percentage}%)</strong></div>)}</div></div>)}{results[resultsQuiz.id].length === 0 && <p className="py-8 text-center text-sm text-slate-500">Aucun élève n’a encore passé ce quiz.</p>}</div>
        </div>
      </div>}
    </div>
  );
}

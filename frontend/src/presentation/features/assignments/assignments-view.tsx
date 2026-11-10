"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/presentation/providers/auth-provider";
import { RequireRole } from "@/presentation/components/auth/require-role";
import { Button } from "@/presentation/components/ui/button";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { UserType } from "@/domain/enums";
import type { Assignment, AssignmentSubmission } from "@/domain/entities/assignment";
import { assignmentsRepository } from "@/infrastructure/repositories/assignments-repository";
import { coursesRepository } from "@/infrastructure/repositories/courses-repository";
import { EyeIcon, FileTextIcon, PaperclipIcon } from "@/presentation/components/ui/icons";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function isLate(assignment: Assignment) {
  return new Date(assignment.dueDate).getTime() < Date.now();
}

function studentName(student?: AssignmentSubmission["student"]) {
  return [student?.firstname, student?.lastname].filter(Boolean).join(" ") || student?.username || "Élève";
}

function teacherName(teacher?: Assignment["teacher"]) {
  return [teacher?.firstname, teacher?.lastname].filter(Boolean).join(" ") || teacher?.username || "Enseignant";
}

export function AssignmentsView() {
  const { token, user } = useAuth();
  const isTeacher = user?.userType === UserType.INSTRUCTOR || user?.userType === UserType.SUPERADMIN;

  if (!user || !token) return <PageLoader label="Chargement des devoirs…" />;
  if (isTeacher) return <TeacherAssignments token={token} teacherClasses={user.teachingClasses ?? []} />;
  if (String(user.membership).toLowerCase() !== "platinum") {
    return (
      <div className="animate-fade-in-up mx-auto max-w-4xl py-8">
        <div
          className="glass-card-strong relative overflow-hidden rounded-3xl p-8 text-center sm:p-12"
          style={{
            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(99, 102, 241, 0.12), rgba(217, 119, 6, 0.05))",
            border: "1.5px solid rgba(37, 99, 235, 0.3)",
            boxShadow: "0 20px 40px -15px rgba(37, 99, 235, 0.25)",
          }}
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-4xl text-white shadow-lg shadow-blue-500/30">
            💎
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/80 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-700">
            ★ Fonctionnalité VIP Karini
          </div>
          <h1 className="mt-4 font-serif text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
            Devoirs &amp; travaux <br />
            <span className="gradient-text">Réservés aux Membres Platinum</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Recevez les devoirs de votre classe, envoyez vos travaux et obtenez les retours de vos enseignants.
            Cette fonctionnalité est une exclusivité de la formule <strong>Platinum</strong>.
          </p>
          <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-5 py-2.5 text-xs shadow-xs">
            <span className="text-slate-500">Votre formule actuelle :</span>
            <span className="font-bold uppercase tracking-wide text-slate-800">{user.membership || "Standard"}</span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-indigo-600">{user.credits} crédits disponibles</span>
          </div>
          <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
            {[
              ["📚", "Devoirs de votre classe", "Ne voyez que les travaux déposés pour votre classe."],
              ["📤", "Rendu en ligne", "Envoyez votre réponse et votre PDF directement."],
              ["💬", "Retour personnalisé", "Consultez vos notes et les commentaires du professeur."],
            ].map(([icon, title, description]) => (
              <div key={title} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-xs">
                <span className="text-2xl">{icon}</span>
                <h3 className="mt-2 text-sm font-bold text-slate-800">{title}</h3>
                <p className="mt-1 text-xs text-slate-500">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/membership" className="btn-primary w-full rounded-2xl px-8 py-3.5 text-sm font-bold shadow-lg shadow-indigo-500/25 transition-transform hover:scale-105 sm:w-auto">
              Passer à la formule Platinum 💎
            </Link>
            <Link href="/courses" className="btn-secondary w-full rounded-2xl px-6 py-3.5 text-sm font-semibold sm:w-auto">
              Retourner aux cours
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <RequireRole role={UserType.STUDENT}>
      <StudentAssignments token={token} />
    </RequireRole>
  );
}

function AssignmentHeader({ teacher }: { teacher: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border p-6 shadow-sm sm:p-8" style={{
      background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.06)), var(--paper-card)",
      borderColor: "rgba(99, 102, 241, 0.18)",
    }}>
      <div className="relative z-10 max-w-2xl">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}>
            <FileTextIcon size={18} />
          </span>
          <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}>
          {teacher ? "Espace enseignant" : "Espace élève"}
          </span>
        </div>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--ink)" }}>
          Devoirs &amp; travaux
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          {teacher ? "Créez des devoirs, suivez les rendus et donnez un retour personnalisé." : "Consultez vos échéances et envoyez vos réponses directement à vos enseignants."}
        </p>
      </div>
    </div>
  );
}

function TeacherAssignments({ token, teacherClasses }: { token: string; teacherClasses: string[] }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<Record<number, AssignmentSubmission[]>>({});
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", maxScore: "20", subject: "", targetClass: "" });
  const [classes, setClasses] = useState<string[]>([]);
  const [instructionsFile, setInstructionsFile] = useState<File>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [nextAssignments, nextCourses] = await Promise.all([
      assignmentsRepository.list(token),
      coursesRepository.list(token),
    ]);
    setAssignments(nextAssignments);
    setSubjects(Array.from(new Set(nextCourses
      .map((course) => course.subject)
      .filter((subject): subject is string => Boolean(subject)))).sort());
    setClasses(Array.from(new Set([
      ...teacherClasses,
      ...nextCourses
        .map((course) => course.filiere?.trim())
        .filter((studentClass): studentClass is string => Boolean(studentClass))
        .filter((studentClass) => studentClass.toLowerCase() !== "all"),
    ])).sort());
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les devoirs")).finally(() => setLoading(false));
  }, [token]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await assignmentsRepository.create(token, {
        ...form,
        dueDate: new Date(form.dueDate).toISOString(),
        maxScore: Number(form.maxScore),
        subject: form.subject,
        targetClass: form.targetClass,
      }, instructionsFile);
      setForm({ title: "", description: "", dueDate: "", maxScore: "20", subject: "", targetClass: "" });
      setInstructionsFile(undefined);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le devoir");
    } finally {
      setSaving(false);
    }
  };

  const toggleSubmissions = async (assignmentId: number) => {
    if (submissions[assignmentId]) {
      setSubmissions((current) => ({ ...current, [assignmentId]: [] }));
      return;
    }
    try {
      const result = await assignmentsRepository.listSubmissions(token, assignmentId);
      setSubmissions((current) => ({ ...current, [assignmentId]: result }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les rendus");
    }
  };

  return (
    <div className="animate-fade-in-up space-y-8">
      <AssignmentHeader teacher />
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="rounded-2xl border p-5 shadow-sm" style={{ background: "var(--paper-card)", borderColor: "var(--line)" }}>
        <h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>Créer un devoir</h2>
        <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-2">
          <input required placeholder="Titre du devoir" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" />
          <select required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field">
            <option value="">Choisir une matière</option>
            {subjects.map((subject) => <option key={subject} value={subject}>{formatSubject(subject)}</option>)}
          </select>
          <select required value={form.targetClass} onChange={(e) => setForm({ ...form, targetClass: e.target.value })} className="input-field">
            <option value="">Choisir une classe</option>
            {classes.map((studentClass) => <option key={studentClass} value={studentClass}>{studentClass}</option>)}
          </select>
          <textarea placeholder="Consignes (facultatif)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field min-h-24 md:col-span-2" />
          <label className="text-sm" style={{ color: "var(--muted)" }}>Date limite<input required type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field mt-1 w-full" /></label>
          <label className="text-sm" style={{ color: "var(--muted)" }}>Note maximale<input required type="number" min="1" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} className="input-field mt-1 w-full" /></label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 text-sm md:col-span-2" style={{ borderColor: "var(--accent)", color: "var(--muted)" }}>
            <FileTextIcon size={20} color="var(--accent)" />
            <span className="flex-1">{instructionsFile?.name || "Ajouter le PDF des consignes (obligatoire)"}</span>
            <input required type="file" accept="application/pdf,.pdf" onChange={(e) => setInstructionsFile(e.target.files?.[0])} className="sr-only" />
          </label>
          <Button disabled={saving} className="md:col-span-2">{saving ? "Création…" : "Créer le devoir"}</Button>
        </form>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>Mes devoirs ({assignments.length})</h2>
        {loading ? <PageLoader label="Chargement…" /> : assignments.length === 0 ? <EmptyState text="Aucun devoir créé pour le moment." /> : assignments.map((assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment}>
            <div className="flex flex-wrap gap-2">
              {assignment.instructionsFileName && <PdfButton token={token} path={`/api/assignments/${assignment.id}/instructions-file`} label="Voir les consignes" />}
              <Button variant="secondary" onClick={() => void toggleSubmissions(assignment.id)}>
                {submissions[assignment.id] ? "Masquer les rendus" : "Voir les rendus"}
              </Button>
            </div>
            {submissions[assignment.id] && <SubmissionList token={token} assignment={assignment} submissions={submissions[assignment.id]} onUpdated={(updated) => setSubmissions((current) => ({ ...current, [assignment.id]: current[assignment.id].map((item) => item.id === updated.id ? updated : item) }))} />}
          </AssignmentCard>
        ))}
      </section>
    </div>
  );
}

function SubmissionList({ token, assignment, submissions, onUpdated }: { token: string; assignment: Assignment; submissions: AssignmentSubmission[]; onUpdated: (submission: AssignmentSubmission) => void }) {
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");

  const grade = async (submissionId: number) => {
    const result = await assignmentsRepository.grade(token, submissionId, Number(score), feedback);
    onUpdated(result);
    setGradingId(null);
    setFeedback("");
    setScore("");
  };

  if (submissions.length === 0) return <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>Aucun rendu pour le moment.</p>;
  return <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
    {submissions.map((submission) => (
      <div key={submission.id} className="rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="font-semibold" style={{ color: "var(--ink)" }}>{studentName(submission.student)}</p><p className="text-xs" style={{ color: "var(--muted)" }}>Envoyé le {dateFormatter.format(new Date(submission.submittedAt))}</p></div>
          <span className="text-sm font-bold" style={{ color: submission.score === null || submission.score === undefined ? "var(--muted)" : "var(--accent)" }}>{submission.score === null || submission.score === undefined ? "À corriger" : `${submission.score}/${assignment.maxScore}`}</span>
        </div>
        {submission.answerText && <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: "var(--muted)" }}>{submission.answerText}</p>}
        {submission.originalFileName && <PdfButton token={token} path={`/api/assignments/submissions/${submission.id}/file`} label={submission.originalFileName} />}
        {submission.feedback && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm">Feedback : {submission.feedback}</p>}
        {gradingId === submission.id ? <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr_auto]"><input type="number" min="0" max={assignment.maxScore} placeholder={`/ ${assignment.maxScore}`} value={score} onChange={(e) => setScore(e.target.value)} className="input-field" /><input placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} className="input-field" /><Button disabled={!score} onClick={() => void grade(submission.id)}>Enregistrer</Button></div> : <Button variant="ghost" className="mt-3" onClick={() => { setGradingId(submission.id); setScore(submission.score?.toString() || ""); setFeedback(submission.feedback || ""); }}>Noter</Button>}
      </div>
    ))}
  </div>;
}

function StudentAssignments({ token }: { token: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [answer, setAnswer] = useState("");
  const [file, setFile] = useState<File>();
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");

  useEffect(() => {
    Promise.all([assignmentsRepository.list(token), assignmentsRepository.listMySubmissions(token)])
      .then(([nextAssignments, nextSubmissions]) => { setAssignments(nextAssignments); setSubmissions(nextSubmissions); })
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les devoirs"));
  }, [token]);

  const submissionsByAssignment = useMemo(() => new Map(submissions.map((submission) => [submission.assignmentId, submission])), [submissions]);
  const subjects = useMemo(() => Array.from(new Set(
    assignments
      .map((assignment) => assignment.subject)
      .filter((subject): subject is string => Boolean(subject)),
  )).sort(), [assignments]);
  const teachers = useMemo(() => {
    const values = assignments.map((assignment) => ({
      id: assignment.teacher?.id,
      name: teacherName(assignment.teacher),
    }));
    return Array.from(new Map(values.filter((teacher) => teacher.id).map((teacher) => [teacher.id, teacher])).values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assignments]);
  const filteredAssignments = useMemo(() => assignments.filter((assignment) => (
    (subjectFilter === "all" || assignment.subject === subjectFilter)
    && (teacherFilter === "all" || String(assignment.teacher?.id) === teacherFilter)
  )), [assignments, subjectFilter, teacherFilter]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSending(true);
    setError("");
    try {
      const result = await assignmentsRepository.submit(token, selected.id, answer, file);
      setSubmissions((current) => [result, ...current.filter((item) => item.assignmentId !== result.assignmentId)]);
      setSelected(null); setAnswer(""); setFile(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer le rendu");
    } finally { setSending(false); }
  };

  return <div className="animate-fade-in-up space-y-8">
    <AssignmentHeader teacher={false} />
    {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="space-y-4">
      {assignments.length > 0 && <div className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-2" style={{ background: "var(--paper-card)", borderColor: "var(--line)" }}>
        <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="input-field">
          <option value="all">Toutes les matières</option>
          {subjects.map((subject) => <option key={subject} value={subject}>{formatSubject(subject)}</option>)}
        </select>
        <select value={teacherFilter} onChange={(event) => setTeacherFilter(event.target.value)} className="input-field">
          <option value="all">Tous les enseignants</option>
          {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
        </select>
      </div>}
      {assignments.length === 0 ? <EmptyState text="Aucun devoir disponible." /> : filteredAssignments.length === 0 ? <EmptyState text="Aucun devoir ne correspond à ces filtres." /> : filteredAssignments.map((assignment) => {
        const submission = submissionsByAssignment.get(assignment.id);
        return <AssignmentCard key={assignment.id} assignment={assignment}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${submission ? "bg-emerald-100 text-emerald-700" : isLate(assignment) ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{submission ? (submission.score === null || submission.score === undefined ? "Rendu envoyé" : `Noté : ${submission.score}/${assignment.maxScore}`) : isLate(assignment) ? "En retard" : "À faire"}</span>
            <Button onClick={() => setSelected(assignment)}>{submission ? "Modifier mon rendu" : "Envoyer mon rendu"}</Button>
          </div>
          {assignment.instructionsFileName && <PdfButton token={token} path={`/api/assignments/${assignment.id}/instructions-file`} label="Voir le PDF des consignes" />}
          {submission?.originalFileName && <PdfButton token={token} path={`/api/assignments/submissions/${submission.id}/file`} label="Voir mon PDF" />}
          {submission?.feedback && <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>Feedback : {submission.feedback}</p>}
        </AssignmentCard>;
      })}
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setSelected(null)}><form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-2xl border p-6 shadow-xl" style={{ background: "var(--paper-card)", borderColor: "var(--line)" }}><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ color: "var(--accent)", background: "var(--accent-glow)" }}><FileTextIcon /></span><div><h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>{selected.title}</h2><p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Envoyez une réponse écrite ou un PDF.</p></div></div><textarea required={!file} value={answer} onChange={(e) => setAnswer(e.target.value)} className="input-field mt-5 min-h-32 w-full" placeholder="Écrivez votre réponse…" /><label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 text-sm" style={{ borderColor: "var(--line)", color: "var(--muted)" }}><PaperclipIcon size={18} color="var(--accent)" /><span className="flex-1">{file?.name || "Joindre un PDF"}</span><input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0])} className="sr-only" /></label><div className="mt-5 flex justify-end gap-3"><Button type="button" variant="ghost" onClick={() => setSelected(null)}>Annuler</Button><Button disabled={sending}>{sending ? "Envoi…" : "Envoyer"}</Button></div></form></div>}
  </div>;
}

function AssignmentCard({ assignment, children }: { assignment: Assignment; children: ReactNode }) {
  return <article className="rounded-2xl border p-5 shadow-sm" style={{ background: "var(--paper-card)", borderColor: "var(--line)" }}>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h3 className="text-lg font-bold" style={{ color: "var(--ink)" }}>{assignment.title}</h3><p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{formatSubject(assignment.subject || "Matière non définie")} · Échéance : {dateFormatter.format(new Date(assignment.dueDate))} · {assignment.maxScore} points</p>{assignment.description && <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: "var(--muted)" }}>{assignment.description}</p>}</div>
      <div className="shrink-0">{children}</div>
    </div>
  </article>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border p-8 text-center text-sm" style={{ background: "var(--paper-card)", borderColor: "var(--line)", color: "var(--muted)" }}>{text}</div>;
}

function formatSubject(subject: string) {
  return subject
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function PdfButton({ token, path, label }: { token: string; path: string; label: string }) {
  const [opening, setOpening] = useState(false);
  return <button type="button" disabled={opening} onClick={async () => {
    setOpening(true);
    try { await assignmentsRepository.openPdf(token, path); } finally { setOpening(false); }
  }} className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-indigo-50" style={{ color: "var(--accent)" }}>
    <EyeIcon size={16} />
    {opening ? "Ouverture…" : label}
  </button>;
}

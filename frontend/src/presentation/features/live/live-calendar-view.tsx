"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/presentation/providers/auth-provider";
import { MembershipType, UserType } from "@/domain/enums";
import type { CreateLiveSessionInput, LiveSession, LiveTeacher } from "@/domain/entities/live-session";
import type { Subject } from "@/domain/entities/subject";
import { liveSessionsService } from "@/application/services/live-sessions-service";
import { subjectsService } from "@/application/services/subjects-service";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { Button } from "@/presentation/components/ui/button";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function LiveCalendarView() {
  const { user, token } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [teachers, setTeachers] = useState<LiveTeacher[]>([]);
  const [dbClasses, setDbClasses] = useState<string[]>([]);
  const [dbSubjects, setDbSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [filterSubject, setFilterSubject] = useState<string>("all");

  // Modal state for adding/editing a live session
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formClass, setFormClass] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formTeacherId, setFormTeacherId] = useState<number | "">("");
  const [formTargetGroup, setFormTargetGroup] = useState<string>("All");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formMeetingUrl, setFormMeetingUrl] = useState("https://meet.google.com/");

  const isStudent = user?.userType === UserType.STUDENT;
  const isPlatinum = user?.membership === MembershipType.PLATINUM;
  const canManageLive = user?.userType === UserType.SUPERADMIN || user?.userType === UserType.MODERATOR;

  // 1. Load Live Sessions from Database
  const fetchSessions = async () => {
    if (!token) return;
    try {
      setError(null);
      const data = await liveSessionsService.list(token);
      const rawList = Array.isArray(data) ? data : [];
      // Filter out any mock/dummy sessions that were previously seeded
      const cleanList = rawList.filter(
        (s) =>
          !s.meetingUrl?.includes("karini-live-") &&
          !s.title?.includes("Nombres Complexes & Probabilités") &&
          !s.title?.includes("Résolution Épreuves Algorithmique") &&
          !s.title?.includes("Bases de Données Avancées")
      );
      setSessions(cleanList);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Impossible de charger les sessions Live depuis la base de données.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Load Classes (Filières) from Database
  useEffect(() => {
    if (!token) return;
    subjectsService
      .getFilieres(token)
      .then((data) => {
        const list = Array.isArray(data) ? data.filter(Boolean) : [];
        setDbClasses(list);
        if (list.length > 0 && !formClass) {
          setFormClass(list[0]);
        }
      })
      .catch((err) => {
        console.warn("Could not load filieres from database:", err);
      });
  }, [token]);

  // 3. Load Teachers from Database (for Superadmin and Moderator)
  useEffect(() => {
    if (!token || !canManageLive) return;
    liveSessionsService
      .getTeachers(token)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setTeachers(list);
        if (list.length > 0 && !formTeacherId) {
          setFormTeacherId(list[0].id);
        }
      })
      .catch((err) => {
        console.warn("Could not load teachers from database:", err);
      });
  }, [token, canManageLive]);

  // 4. Load Subjects from Database dynamically when class changes
  useEffect(() => {
    if (!token || !formClass) return;
    setLoadingSubjects(true);
    subjectsService
      .list(token, formClass)
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setDbSubjects(list);
        if (list.length > 0) {
          // If the currently selected subject doesn't exist in the new class, pick the first one
          if (!list.some((s) => s.name === formSubject)) {
            setFormSubject(list[0].name);
          }
        } else {
          setFormSubject("");
        }
      })
      .catch((err) => {
        console.warn("Could not load subjects for class from database:", err);
        setDbSubjects([]);
      })
      .finally(() => {
        setLoadingSubjects(false);
      });
  }, [token, formClass]);

  useEffect(() => {
    fetchSessions();
  }, [token]);

  // Open creation modal with database values
  const openCreateModal = () => {
    setEditingSession(null);
    setFormTitle("");
    setFormDescription("");

    const initialClass = user?.studentClass || (dbClasses.length > 0 ? dbClasses[0] : "");
    setFormClass(initialClass);

    if (teachers.length > 0) {
      setFormTeacherId(teachers[0].id);
    } else {
      setFormTeacherId("");
    }

    // Default dates: tomorrow at 18:00 to 19:30
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const endTomorrow = new Date(tomorrow);
    endTomorrow.setHours(19, 30, 0, 0);

    setFormTargetGroup("All");
    setFormStartTime(formatDateForInput(tomorrow));
    setFormEndTime(formatDateForInput(endTomorrow));
    setFormMeetingUrl("https://meet.google.com/");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (session: LiveSession) => {
    setEditingSession(session);
    setFormTitle(session.title);
    setFormDescription(session.description || "");
    setFormClass(session.classFiliere);
    setFormSubject(session.subjectName);
    setFormTeacherId(session.teacherId);
    setFormTargetGroup(session.targetGroup || "All");
    setFormStartTime(formatDateForInput(new Date(session.startTime)));
    setFormEndTime(formatDateForInput(new Date(session.endTime)));
    setFormMeetingUrl(session.meetingUrl);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!formTitle.trim()) {
      setFormError("Veuillez saisir un titre pour la session.");
      return;
    }
    if (!formClass.trim()) {
      setFormError("Veuillez sélectionner une classe depuis la base de données.");
      return;
    }
    if (!formSubject.trim()) {
      setFormError("Veuillez sélectionner une matière depuis la base de données.");
      return;
    }
    if (!formTeacherId) {
      setFormError("Veuillez sélectionner un enseignant.");
      return;
    }
    if (!formStartTime || !formEndTime) {
      setFormError("Veuillez définir les horaires de début et de fin.");
      return;
    }

    const start = new Date(formStartTime);
    const end = new Date(formEndTime);
    if (end <= start) {
      setFormError("L'heure de fin doit être postérieure à l'heure de début.");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const payload: CreateLiveSessionInput = {
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      classFiliere: formClass.trim(),
      subjectName: formSubject.trim(),
      teacherId: Number(formTeacherId),
      targetGroup: formTargetGroup,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      meetingUrl: formMeetingUrl.trim(),
    };

    try {
      if (editingSession) {
        await liveSessionsService.update(token, editingSession.id, payload);
        setNotice("Session Live mise à jour avec succès dans la base de données ! 🎉");
      } else {
        await liveSessionsService.create(token, payload);
        setNotice("Nouvelle session Live enregistrée dans la base de données ! 🎉");
      }
      setIsModalOpen(false);
      await fetchSessions();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSession = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Êtes-vous certain de vouloir supprimer cette session Live de la base de données ?")) return;
    try {
      await liveSessionsService.delete(token, id);
      setNotice("Session Live supprimée de la base de données.");
      await fetchSessions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  };

  function formatDateForInput(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${y}-${m}-${day}T${hours}:${minutes}`;
  }

  // 1. VIP PLATINUM ACCESS GATE FOR STUDENTS
  if (isStudent && !isPlatinum) {
    return (
      <div className="animate-fade-in-up max-w-4xl mx-auto py-8">
        <div
          className="glass-card-strong relative overflow-hidden rounded-3xl p-8 sm:p-12 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(99, 102, 241, 0.12), rgba(217, 119, 6, 0.05))",
            border: "1.5px solid rgba(37, 99, 235, 0.3)",
            boxShadow: "0 20px 40px -15px rgba(37, 99, 235, 0.25)",
          }}
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-4xl shadow-lg shadow-blue-500/30 text-white animate-bounce-soft">
            💎
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-100/80 border border-blue-200">
            ★ Fonctionnalité VIP Karini
          </div>

          <h1 className="mt-4 font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900">
            Sessions Live & Masterclasses <br />
            <span className="gradient-text">Réservées aux Membres Platinum</span>
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            Les sessions de cours en direct, révisions intensives d&apos;examen et masterclasses interactives avec micro ouvert auprès de nos meilleurs professeurs sont une exclusivité de la formule <strong>Platinum</strong>.
          </p>

          <div className="mt-6 inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/80 border border-slate-200 shadow-xs text-xs">
            <span className="text-slate-500">Votre formule actuelle :</span>
            <span className="font-bold text-slate-800 uppercase tracking-wide">
              {user.membership || "Standard"}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-indigo-600 font-semibold">{user.credits} crédits disponibles</span>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 text-left">
            <div className="rounded-2xl p-4 bg-white/70 border border-slate-200/70 shadow-xs">
              <span className="text-2xl">🎙️</span>
              <h3 className="mt-2 text-sm font-bold text-slate-800">Micro Ouvert & Chat</h3>
              <p className="mt-1 text-xs text-slate-500">Posez vos questions directement aux enseignants en direct.</p>
            </div>

            <div className="rounded-2xl p-4 bg-white/70 border border-slate-200/70 shadow-xs">
              <span className="text-2xl">📑</span>
              <h3 className="mt-2 text-sm font-bold text-slate-800">Résolution de Sujets Bac</h3>
              <p className="mt-1 text-xs text-slate-500">Corrigés détaillés pas à pas des épreuves et cas complexes.</p>
            </div>

            <div className="rounded-2xl p-4 bg-white/70 border border-slate-200/70 shadow-xs">
              <span className="text-2xl">📼</span>
              <h3 className="mt-2 text-sm font-bold text-slate-800">Replay Illimité</h3>
              <p className="mt-1 text-xs text-slate-500">Revoyez l&apos;intégralité des enregistrements dans votre espace.</p>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/membership"
              className="btn-primary w-full sm:w-auto px-8 py-3.5 text-sm font-bold rounded-2xl shadow-lg shadow-indigo-500/25 transition-transform hover:scale-105"
            >
              Passer à la formule Platinum 💎
            </Link>
            <Link
              href="/courses"
              className="btn-secondary w-full sm:w-auto px-6 py-3.5 text-sm font-semibold rounded-2xl"
            >
              Retourner aux cours
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. CALENDAR COMPUTATION LOGIC
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  // Filtered sessions by subject (only real subjects present in database)
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterSubject === "all") return true;
      return s.subjectName.toLowerCase() === filterSubject.toLowerCase();
    });
  }, [sessions, filterSubject]);

  // Distinct subjects taken directly from the database sessions
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.subjectName) set.add(s.subjectName);
    });
    return Array.from(set);
  }, [sessions]);

  // Sessions map by date string YYYY-MM-DD
  const sessionsByDate = useMemo(() => {
    const map: Record<string, LiveSession[]> = {};
    filteredSessions.forEach((s) => {
      const d = new Date(s.startTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [filteredSessions]);

  // Sessions on the currently selected day
  const selectedDayKey = selectedDay
    ? `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
    : null;

  const sessionsOnSelectedDay = selectedDayKey ? sessionsByDate[selectedDayKey] || [] : [];

  const upcomingSessions = useMemo(() => {
    return [...filteredSessions].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [filteredSessions]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now);
  };

  const isSessionLiveNow = (session: LiveSession) => {
    const now = new Date().getTime();
    const start = new Date(session.startTime).getTime();
    const end = new Date(session.endTime).getTime();
    return now >= start && now <= end;
  };

  if (loading) return <PageLoader label="Chargement du calendrier Live depuis la base de données…" />;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200">
              <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
              Directs & Masterclasses
            </span>
            {isPlatinum && (
              <span className="badge badge-platinum text-[10px] font-bold">
                💎 Accès Platinum Actif • Groupe : {user?.studentGroup || "Standard"}
              </span>
            )}
          </div>
          <h1 className="mt-3 font-serif text-3xl md:text-4xl font-bold text-slate-900">
            Planning des <span className="gradient-text">Sessions Live</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl leading-relaxed">
            {isStudent
              ? `Consultez les prochaines séances de cours en direct prévues pour votre classe (${user?.studentClass || "Non assignée"}). Rejoignez vos professeurs en un clic.`
              : canManageLive
              ? "Planifiez et animez des cours en direct en sélectionnant les classes et matières réelles de la base de données."
              : "Consultez le calendrier de vos interventions et sessions pédagogiques en direct."}
          </p>
        </div>

        {/* Action button for Superadmin & Moderator */}
        {canManageLive && (
          <div className="shrink-0 flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              + Programmer une Session Live
            </Button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {notice && (
        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm flex items-center justify-between gap-3 animate-fade-in" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="font-bold text-emerald-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-center justify-between gap-3 animate-fade-in" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold text-rose-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Filters & View Toggles Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-slate-500">Matière :</span>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-xs font-medium border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Toutes les matières ({sessions.length})</option>
            {availableSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "calendar"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              📅 Vue Calendrier
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              📋 Vue Planning ({filteredSessions.length})
            </button>
          </div>
        </div>
      </div>

      {/* 3. CALENDAR VIEW MODE */}
      {viewMode === "calendar" ? (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Calendar Grid Left/Main */}
          <div className="lg:col-span-8 glass-card p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                  {MONTH_NAMES[month]} <span className="text-indigo-600">{year}</span>
                </h2>
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-xl px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  Aujourd&apos;hui
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600"
                  aria-label="Mois précédent"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600"
                  aria-label="Mois suivant"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Weekdays row */}
            <div className="mt-4 grid grid-cols-7 text-center">
              {WEEK_DAYS.map((w) => (
                <div key={w} className="py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {w}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
              {/* Empty leading cells */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[85px] sm:min-h-[105px] rounded-2xl bg-slate-50/40 border border-transparent opacity-40" />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const cellDate = new Date(year, month, dayNum);
                const isToday =
                  cellDate.getDate() === new Date().getDate() &&
                  cellDate.getMonth() === new Date().getMonth() &&
                  cellDate.getFullYear() === new Date().getFullYear();

                const isSelected =
                  selectedDay &&
                  cellDate.getDate() === selectedDay.getDate() &&
                  cellDate.getMonth() === selectedDay.getMonth() &&
                  cellDate.getFullYear() === selectedDay.getFullYear();

                const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const daySessions = sessionsByDate[dateKey] || [];
                const hasLiveNow = daySessions.some(isSessionLiveNow);

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedDay(cellDate)}
                    className={`min-h-[85px] sm:min-h-[105px] p-2 flex flex-col justify-between text-left rounded-2xl transition-all ${
                      isSelected
                        ? "ring-2 ring-indigo-600 bg-indigo-50/70 border border-indigo-200 shadow-sm"
                        : isToday
                        ? "bg-amber-50/60 border border-amber-200"
                        : "bg-white/60 hover:bg-white border border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isToday
                            ? "bg-indigo-600 text-white shadow-xs"
                            : isSelected
                            ? "bg-indigo-100 text-indigo-700"
                            : "text-slate-700"
                        }`}
                      >
                        {dayNum}
                      </span>

                      {hasLiveNow && (
                        <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping" title="Direct en cours" />
                      )}
                    </div>

                    {/* Sessions indicators */}
                    <div className="space-y-1 mt-1 w-full overflow-hidden">
                      {daySessions.slice(0, 2).map((s) => (
                        <div
                          key={s.id}
                          className="truncate rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold flex items-center gap-1 text-indigo-700 bg-indigo-100/80 border border-indigo-200/50"
                        >
                          <span className="h-1 w-1 rounded-full bg-indigo-600 shrink-0" />
                          <span className="truncate">{s.subjectName || s.title}</span>
                        </div>
                      ))}
                      {daySessions.length > 2 && (
                        <div className="text-[9px] text-slate-400 font-bold px-1">
                          +{daySessions.length - 2} autre{daySessions.length - 2 > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details Panel Right */}
          <div className="lg:col-span-4 space-y-4">
            <div className="glass-card p-6 rounded-3xl border border-slate-200/80 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-900">
                    {selectedDay
                      ? selectedDay.toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })
                      : "Sélectionnez un jour"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {sessionsOnSelectedDay.length} session{sessionsOnSelectedDay.length > 1 ? "s" : ""} programmée{sessionsOnSelectedDay.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Sessions list for this day */}
              <div className="mt-4 flex-1 space-y-4 overflow-y-auto max-h-[500px] pr-1">
                {sessionsOnSelectedDay.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <span className="text-3xl block mb-2">☕</span>
                    <p className="text-xs font-medium">Aucun cours en direct ce jour-là.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Consultez les autres jours ou le planning global.</p>
                  </div>
                ) : (
                  sessionsOnSelectedDay.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      token={token}
                      isStudent={user?.userType === UserType.STUDENT}
                      canManage={canManageLive}
                      onEdit={() => openEditModal(session)}
                      onDelete={() => handleDeleteSession(session.id)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 4. LIST / SCHEDULE VIEW MODE */
        <div className="space-y-4">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {upcomingSessions.length === 0 ? (
              <div className="col-span-full glass-card p-12 text-center rounded-3xl text-slate-400">
                <span className="text-4xl block mb-3">📅</span>
                <h3 className="font-serif text-lg font-bold text-slate-800">Aucune session Live dans la base de données</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Aucun cours en direct n&apos;est programmé pour le moment.
                  {canManageLive ? " Utilisez le bouton ci-dessus pour planifier une nouvelle séance." : ""}
                </p>
              </div>
            ) : (
              upcomingSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  token={token}
                  isStudent={user?.userType === UserType.STUDENT}
                  canManage={canManageLive}
                  onEdit={() => openEditModal(session)}
                  onDelete={() => handleDeleteSession(session.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL CREATE / EDIT LIVE SESSION (SUPERADMIN & MODERATOR) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card-strong relative w-full max-w-xl rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white text-lg">
                  🎥
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-slate-900">
                    {editingSession ? "Modifier la session Live" : "Programmer une session Live"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Données réelles des classes, matières et enseignants issues de la base.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-6 space-y-4">
              {/* Titre */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Titre de la session *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Révision Épreuve d'Algorithmique"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Classe (Filière) issue de la base de données */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Classe / Filière (depuis la base) *
                  </label>
                  {dbClasses.length > 0 ? (
                    <select
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {dbClasses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Ex: Bac Informatique"
                      value={formClass}
                      onChange={(e) => setFormClass(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                {/* Matière issue de la base de données */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Matière (depuis la base) *
                  </label>
                  {loadingSubjects ? (
                    <div className="text-xs text-slate-400 py-2.5">Chargement des matières…</div>
                  ) : dbSubjects.length > 0 ? (
                    <select
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {dbSubjects.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Ex: Algorithmique"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </div>

              {/* Groupe Cible Live (4 Groupes de niveau : DabaDaba, Standard, Excellent, Top) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Groupe Cible Live (4 Niveaux) *
                </label>
                <select
                  value={formTargetGroup}
                  onChange={(e) => setFormTargetGroup(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="All">🎯 Tous les groupes (Ouvert à tous les élèves Platinum de la classe)</option>
                  <option value="DabaDaba">🟢 Groupe DabaDaba</option>
                  <option value="Standard">🔵 Groupe Standard</option>
                  <option value="Excellent">🟣 Groupe Excellent</option>
                  <option value="Top">🟡 Groupe Top</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Seuls les élèves Platinum assignés à ce groupe par un modérateur verront ce Live.
                </p>
              </div>

              {/* Enseignant (issu de la base de données) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Enseignant animateur (comptes réels en base) *
                </label>
                {teachers.length > 0 ? (
                  <select
                    value={formTeacherId}
                    onChange={(e) => setFormTeacherId(Number(e.target.value))}
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {[t.firstname, t.lastname].filter(Boolean).join(" ") || t.username} ({t.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-rose-500 py-1">
                    Aucun enseignant trouvé dans la base de données. Veuillez créer un compte instructeur dans le panneau Admin.
                  </p>
                )}
              </div>

              {/* Start and End Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date & Heure de début *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date & Heure de fin *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Meeting URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lien de la visioconférence (Google Meet / Zoom) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://meet.google.com/abc-defg-hij"
                  value={formMeetingUrl}
                  onChange={(e) => setFormMeetingUrl(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Objectifs de la séance (optionnel)
                </label>
                <textarea
                  rows={3}
                  placeholder="Points clés abordés, chapitres à préparer, épreuves traitées..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-xs border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={formSubmitting || teachers.length === 0}
                  className="text-xs px-6 font-bold"
                >
                  {formSubmitting
                    ? "Enregistrement…"
                    : editingSession
                    ? "Mettre à jour"
                    : "Créer la session"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Session Card Component
function SessionCard({
  session,
  token,
  isStudent,
  canManage,
  onEdit,
  onDelete,
}: {
  session: LiveSession;
  token: string | null;
  isStudent: boolean;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);
  const now = new Date().getTime();
  const isLiveNow = now >= startDate.getTime() && now <= endDate.getTime();
  const isPast = now > endDate.getTime();

  const formattedDate = startDate.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const formattedTime = `${String(startDate.getHours()).padStart(2, "0")}:${String(
    startDate.getMinutes()
  ).padStart(2, "0")} - ${String(endDate.getHours()).padStart(2, "0")}:${String(
    endDate.getMinutes()
  ).padStart(2, "0")}`;

  return (
    <article
      className={`glass-card p-5 rounded-2xl flex flex-col justify-between transition-all duration-200 border ${
        isLiveNow
          ? "border-rose-400 bg-gradient-to-br from-rose-50/80 via-white to-pink-50/30 shadow-md ring-2 ring-rose-300"
          : isPast
          ? "border-slate-200/70 bg-slate-50/50 opacity-80"
          : "border-slate-200/80 hover:border-indigo-300 hover:shadow-sm"
      }`}
    >
      <div>
        {/* Badges row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60">
              {session.subjectName}
            </span>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200">
              🎓 {session.classFiliere}
            </span>
            {session.targetGroup && session.targetGroup !== "All" && (
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                session.targetGroup.toLowerCase() === "dabadaba"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : session.targetGroup.toLowerCase() === "excellent"
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : session.targetGroup.toLowerCase() === "top"
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-blue-100 text-blue-800 border border-blue-300"
              }`}>
                🎯 {session.targetGroup}
              </span>
            )}
          </div>

          {/* Status badge */}
          {isLiveNow ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white bg-rose-600 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              EN DIRECT
            </span>
          ) : isPast ? (
            <span className="text-[10px] font-semibold text-slate-400">Terminé</span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              À venir
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="mt-3 font-serif text-base font-bold text-slate-900 leading-snug">
          {session.title}
        </h4>

        {/* Description */}
        {session.description && (
          <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {session.description}
          </p>
        )}

        {/* Teacher & Schedule info */}
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
              👨‍🏫
            </div>
            <span className="font-medium">{session.teacherName}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>📅 {formattedDate}</span>
            <span>•</span>
            <span className="font-semibold text-slate-800">⏰ {formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <a
          href={session.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (token && isStudent) {
              void liveSessionsService.recordAttendance(token, session.id).catch(() => undefined);
            }
          }}
          className={`flex-1 rounded-xl py-2 px-3 text-center text-xs font-bold transition-all ${
            isLiveNow
              ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              : isPast
              ? "bg-slate-100 text-slate-500 hover:bg-slate-200"
              : "btn-primary"
          }`}
        >
          {isLiveNow ? "🔴 Rejoindre le direct" : isPast ? "Lien du Replay / Salle" : "Rejoindre le Live →"}
        </a>

        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs"
                title="Modifier"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs"
                title="Supprimer"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

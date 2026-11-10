"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@/presentation/providers/auth-provider";
import { Button } from "@/presentation/components/ui/button";
import { PageLoader } from "@/presentation/components/ui/page-loader";
import { authRepository } from "@/infrastructure/repositories/auth-repository";

type ProfileForm = {
  username: string; firstname: string; lastname: string; phoneNumber: string; gender: string; age: string;
};

const emptyPassword = { currentPassword: "", password: "", confirmation: "" };
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;

export function ProfileView() {
  const { user, token, setUser } = useAuth();
  const initial = useMemo<ProfileForm>(() => ({
    username: user?.username ?? "", firstname: user?.firstname ?? "", lastname: user?.lastname ?? "",
    phoneNumber: user?.phoneNumber ?? "", gender: user?.gender ?? "", age: user?.age?.toString() ?? "",
  }), [user]);
  const [form, setForm] = useState(initial);
  const [passwords, setPasswords] = useState(emptyPassword);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState({ currentPassword: false, password: false, confirmation: false });
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const profileChanged = JSON.stringify(form) !== JSON.stringify(initial);
  const passwordChanged = Object.values(passwords).some(Boolean);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (profileChanged || passwordChanged) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [profileChanged, passwordChanged]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    if (!user?.profileImage || !token) {
      return () => undefined;
    }

    authRepository.getProfileImage(token, user.profileImage)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setProfileImageUrl(objectUrl);
      })
      .catch(() => {
        if (active) setProfileImageUrl(null);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, user?.profileImage]);

  if (!user || !token) return <PageLoader label="Chargement du profil…" />;

  const update = (key: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const initials = [user.firstname, user.lastname].filter(Boolean).map((value) => value![0]).join("").toUpperCase() || user.username?.[0]?.toUpperCase() || "K";

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError("");
    if (!file.type.startsWith("image/")) {
      setPhotoError("Veuillez sélectionner une image.");
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setPhotoError("La photo ne doit pas dépasser 5 Mo.");
      return;
    }

    setUploadingPhoto(true);
    setNotice("");
    setError("");
    try {
      const updated = await authRepository.uploadProfileImage(token, file);
      setUser(updated);
      setNotice("Photo de profil mise à jour");
      setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Impossible de mettre à jour la photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validate = () => {
    const next: Partial<Record<keyof ProfileForm, string>> = {};
    if (!form.username.trim()) next.username = "Le nom d'utilisateur est obligatoire.";
    if (!form.firstname.trim()) next.firstname = "Le prénom est obligatoire.";
    if (!form.lastname.trim()) next.lastname = "Le nom est obligatoire.";
    if (!/^\+216\d{8}$/.test(form.phoneNumber.replace(/\s/g, ""))) next.phoneNumber = "Entrez un numéro tunisien au format +216XXXXXXXX.";
    if (!form.gender) next.gender = "Sélectionnez un genre.";
    const age = Number(form.age);
    if (!form.age || !Number.isInteger(age) || age < 13 || age > 120) next.age = "L'âge doit être compris entre 13 et 120 ans.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate() || !profileChanged) return;
    setSaving(true); setNotice(""); setError("");
    try {
      const updated = await authRepository.updateCurrentUser(token, { ...form, age: Number(form.age) });
      setUser(updated); setNotice("Profil mis à jour"); setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour le profil.");
    } finally { setSaving(false); }
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(""); setError("");
    if (passwords.password.length < 8) return setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
    if (passwords.password !== passwords.confirmation) return setError("Les mots de passe ne correspondent pas.");
    setSavingPassword(true);
    try {
      const updated = await authRepository.changePassword(token, passwords.currentPassword, passwords.password);
      setUser(updated); setPasswords(emptyPassword); setNotice("Mot de passe mis à jour"); setTimeout(() => setNotice(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier le mot de passe.");
    } finally { setSavingPassword(false); }
  };

  return <div className="mx-auto max-w-3xl animate-fade-in-up">
    <div className="flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0">
        {profileImageUrl ? <img src={profileImageUrl} alt="Photo de profil" className="h-16 w-16 rounded-full object-cover shadow-lg" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-xl font-bold text-white shadow-lg">{initials}</div>}
        <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} aria-label="Modifier la photo de profil" className="absolute -bottom-1 -right-1 rounded-full bg-indigo-600 p-1.5 text-white shadow transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60">
          <CameraIcon />
        </button>
        <input ref={photoInputRef} type="file" accept="image/*" onChange={uploadPhoto} className="sr-only" />
      </div>
      <div><h1 className="font-serif text-3xl font-bold" style={{ color: "var(--ink)" }}>Mon profil</h1><p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{user.email}</p></div>
    </div>
    <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Photo JPG, PNG ou autre image — 5 Mo maximum.</p>
    {photoError && <p role="alert" className="mt-1 text-sm text-red-600">{photoError}</p>}
    {(notice || error) && <div role="status" className={`mt-5 rounded-xl border p-3 text-sm ${notice ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{notice || error}</div>}

    <form onSubmit={submitProfile} className="mt-6 rounded-2xl border p-5 shadow-sm" style={{ background: "var(--paper-card)", borderColor: "var(--line)" }}>
      <h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>Informations personnelles</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Nom d'utilisateur" required value={form.username} error={errors.username} onChange={(v) => update("username", v)} />
        <Field label="Prénom" required value={form.firstname} error={errors.firstname} onChange={(v) => update("firstname", v)} />
        <Field label="Nom" required value={form.lastname} error={errors.lastname} onChange={(v) => update("lastname", v)} />
        <Field label="Téléphone" required type="tel" value={form.phoneNumber} error={errors.phoneNumber} onChange={(v) => update("phoneNumber", v)} />
        <Field label="Genre" required select value={form.gender} error={errors.gender} onChange={(v) => update("gender", v)} options={["Masculin", "Féminin", "Préférer ne pas dire"]} />
        <Field label="Âge" required type="number" min={13} max={120} value={form.age} error={errors.age} onChange={(v) => update("age", v)} />
      </div>
      <div className="mt-8 flex justify-end gap-3">
        <Button type="button" variant="secondary" disabled={!profileChanged || saving} onClick={() => { setForm(initial); setErrors({}); }}>Annuler</Button>
        <Button type="submit" disabled={!profileChanged || saving}>{saving ? "Enregistrement…" : "Enregistrer les modifications"}</Button>
      </div>
    </form>

    <form onSubmit={submitPassword} className="mt-6 rounded-2xl border p-5 shadow-sm" style={{ background: "var(--paper-card)", borderColor: "var(--line)" }}>
      <h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>Sécurité</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <PasswordField label="Mot de passe actuel" value={passwords.currentPassword} autoComplete="current-password" visible={visible.currentPassword} onToggle={() => setVisible((v) => ({ ...v, currentPassword: !v.currentPassword }))} onChange={(v) => setPasswords((p) => ({ ...p, currentPassword: v }))} />
        <div />
        <PasswordField label="Nouveau mot de passe" value={passwords.password} autoComplete="new-password" visible={visible.password} onToggle={() => setVisible((v) => ({ ...v, password: !v.password }))} onChange={(v) => setPasswords((p) => ({ ...p, password: v }))} />
        <PasswordField label="Confirmer le mot de passe" value={passwords.confirmation} autoComplete="new-password" visible={visible.confirmation} onToggle={() => setVisible((v) => ({ ...v, confirmation: !v.confirmation }))} onChange={(v) => setPasswords((p) => ({ ...p, confirmation: v }))} />
      </div>
      <div className="mt-3"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full transition-all ${passwords.password.length >= 8 ? "w-full bg-emerald-500" : `w-${Math.min(3, Math.ceil(passwords.password.length / 3))}/4 bg-amber-400`}`} /></div><p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{passwords.password.length >= 8 ? "Mot de passe suffisamment robuste." : "Minimum 8 caractères."}</p></div>
      <div className="mt-6 flex justify-end"><Button type="submit" disabled={!passwordChanged || savingPassword}>{savingPassword ? "Modification…" : "Modifier le mot de passe"}</Button></div>
    </form>
  </div>;
}

function Field({ label, value, onChange, error, required, type = "text", min, max, select, options }: { label: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean; type?: string; min?: number; max?: number; select?: boolean; options?: string[] }) {
  const id = `profile-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500"> *</span>}{select ? <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} className="input-field mt-1 w-full focus:ring-2 focus:ring-indigo-400"><option value="">Sélectionner</option>{options?.map((option) => <option key={option}>{option}</option>)}</select> : <input id={id} required={required} min={min} max={max} type={type} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} className="input-field mt-1 w-full focus:ring-2 focus:ring-indigo-400" />}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}

function PasswordField({ label, value, onChange, visible, onToggle, autoComplete }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void; autoComplete: "current-password" | "new-password" }) {
  return <label className="text-sm font-medium text-slate-700">{label}<div className="relative mt-1"><input type={visible ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="input-field w-full pr-11 focus:ring-2 focus:ring-indigo-400" /><button type="button" onClick={onToggle} aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 transition-colors hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400">{visible ? <EyeOffIcon /> : <EyeIcon />}</button></div></label>;
}

function EyeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
}

function EyeOffIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.5 17.5 0 0 1-3.1 3.8M6.2 6.8C3.9 8.3 2.5 12 2.5 12s3.5 6 9.5 6c1 0 1.9-.2 2.7-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
}

function CameraIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5h3l1.5-2h7L17 7.5h3A1.5 1.5 0 0 1 21.5 9v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z" /><circle cx="12" cy="13.5" r="3.5" /></svg>;
}

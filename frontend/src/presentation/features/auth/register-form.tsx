"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import { useAuth } from "@/presentation/providers/auth-provider";
import { TUNISIAN_CLASS_GROUPS } from "@/shared/constants/filiere-options";

export function RegisterForm() {
  const { register } = useAuth();

  // Basic Account
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Student Profile
  const [studentClass, setStudentClass] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("Masculin");
  const [age, setAge] = useState("");

  // Conditional Fields (+18 vs -18)
  const [cin, setCin] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  // UI state
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);

  const parsedAge = age.trim() !== "" ? parseInt(age, 10) : null;
  const isAdult = parsedAge !== null && !isNaN(parsedAge) && parsedAge >= 18;
  const isMinor = parsedAge !== null && !isNaN(parsedAge) && parsedAge > 0 && parsedAge < 18;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    // Validation
    if (!studentClass) {
      setError("Veuillez sélectionner votre classe dans la liste.");
      setBusy(false);
      return;
    }

    if (!phoneNumber.trim()) {
      setError("Veuillez renseigner votre numéro de téléphone.");
      setBusy(false);
      return;
    }

    if (parsedAge === null || isNaN(parsedAge) || parsedAge < 6 || parsedAge > 100) {
      setError("Veuillez indiquer un âge valide (entre 6 et 100 ans).");
      setBusy(false);
      return;
    }

    if (isAdult && !cin.trim()) {
      setError("Le numéro de CIN (Carte d'Identité) est obligatoire pour les étudiants de 18 ans et plus.");
      setBusy(false);
      return;
    }

    if (isMinor) {
      if (!parentEmail.trim()) {
        setError("L'email du parent ou tuteur est requis pour les élèves mineurs (-18 ans).");
        setBusy(false);
        return;
      }
      if (parentEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
        setError("L'email du parent ne peut pas être identique à l'email de l'élève.");
        setBusy(false);
        return;
      }
      if (!parentPhone.trim()) {
        setError("Le numéro de téléphone du parent est requis.");
        setBusy(false);
        return;
      }
    }

    try {
      const message = await register({
        email: email.trim(),
        password,
        username: username.trim(),
        studentClass,
        phoneNumber: phoneNumber.trim(),
        gender,
        age: parsedAge,
        cin: isAdult ? cin.trim() : undefined,
        parentEmail: isMinor ? parentEmail.trim() : undefined,
        parentPhone: isMinor ? parentPhone.trim() : undefined,
      });

      setNotice(message);
      setRegisteredSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le compte. Veuillez réessayer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl animate-fade-in-up">
      <div className="glass-card p-6 sm:p-8">
        {/* Header Icon */}
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(236,72,153,0.12), rgba(99,102,241,0.12))",
            border: "1px solid rgba(236,72,153,0.2)",
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        </div>

        <h1 className="mt-5 text-center font-serif text-3xl" style={{ color: "var(--ink)" }}>
          Créer un compte élève
        </h1>
        <p className="mt-2 text-center text-sm" style={{ color: "var(--muted)" }}>
          Rejoignez la plateforme Karini selon le système éducatif tunisien.
        </p>

        {registeredSuccess ? (
          <div className="mt-8 space-y-6 text-center animate-fade-in">
            <div className="alert-success text-left leading-relaxed">
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: "var(--success)" }}
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-semibold">Compte créé avec succès !</p>
                  <p className="mt-1 text-xs opacity-95">{notice}</p>
                </div>
              </div>
            </div>

            {isMinor && parentEmail && (
              <div
                className="rounded-2xl p-4 text-left text-xs leading-relaxed"
                style={{
                  background: "rgba(99, 102, 241, 0.06)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  color: "var(--ink-soft)",
                }}
              >
                <div className="flex items-center gap-2 font-medium text-indigo-600 mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Compte Parent généré
                </div>
                Un compte parent lié a été créé pour <strong>{parentEmail}</strong>. Les identifiants de connexion et
                instructions lui seront transmis par email.
              </div>
            )}

            <Link href="/login" className="btn-primary w-full text-center">
              Accéder à la connexion
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={onSubmit}>
            {/* Identity & Login Credentials */}
            <div className="space-y-4">
              <label className="block text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                Nom d&apos;utilisateur ou Nom complet
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field mt-1.5"
                  placeholder="Ex: Mohamed Ben Salah"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                  Email de l&apos;élève
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field mt-1.5"
                    placeholder="eleve@example.com"
                  />
                </label>

                <label className="block text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                  Mot de passe
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field mt-1.5"
                    placeholder="Au moins 6 caractères"
                  />
                </label>
              </div>
            </div>

            {/* Class & Academic Level (Tunisian System: 7ème Collège to Bac) */}
            <div>
              <label className="block text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                Classe / Niveau scolaire (Système Tunisien)
                <select
                  required
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="input-field mt-1.5 cursor-pointer bg-white"
                >
                  <option value="" disabled>
                    -- Choisissez votre classe (7ème de Base au Bac) --
                  </option>
                  {TUNISIAN_CLASS_GROUPS.map((group) => (
                    <optgroup key={group.group} label={`📚 ${group.group}`}>
                      {group.classes.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                De la 7ème année de base (collège) jusqu&apos;au Baccalauréat avec toutes les sections.
              </p>
            </div>

            {/* Phone, Gender & Age */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                Téléphone
                <input
                  required
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="input-field mt-1.5"
                  placeholder="+216 -- --- ---"
                />
              </label>

              <label className="block text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                Genre
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="input-field mt-1.5 cursor-pointer bg-white"
                >
                  <option value="Masculin">Masculin (Garçon)</option>
                  <option value="Féminin">Féminin (Fille)</option>
                </select>
              </label>

              <label className="block text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                Âge
                <input
                  required
                  type="number"
                  min={6}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="input-field mt-1.5"
                  placeholder="Ex: 16"
                />
              </label>
            </div>

            {/* Dynamic Conditional Section based on Age */}
            <div className="pt-2">
              {isAdult && (
                <div
                  className="rounded-2xl p-4 transition-all duration-300 animate-fade-in"
                  style={{
                    background: "rgba(99, 102, 241, 0.05)",
                    border: "1px solid rgba(99, 102, 241, 0.25)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--accent)" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Étudiant majeur (+18 ans)
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      Identification requise
                    </span>
                  </div>

                  <label className="block text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                    Numéro de CIN (Carte d&apos;Identité Nationale)
                    <input
                      required
                      type="text"
                      maxLength={20}
                      value={cin}
                      onChange={(e) => setCin(e.target.value)}
                      className="input-field mt-1.5"
                      placeholder="Ex: 09123456 (8 chiffres)"
                    />
                  </label>
                  <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>
                    Requis pour l&apos;enregistrement officiel des étudiants de plus de 18 ans.
                  </p>
                </div>
              )}

              {isMinor && (
                <div
                  className="rounded-2xl p-4 transition-all duration-300 animate-fade-in space-y-4"
                  style={{
                    background: "rgba(245, 158, 11, 0.05)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: "rgba(245, 158, 11, 0.15)", color: "#b45309" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Élève mineur (-18 ans)
                    </span>
                    <span className="text-xs font-medium" style={{ color: "#b45309" }}>
                      Compte parent requis
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
                    Pour les élèves de moins de 18 ans, les coordonnées d&apos;un parent ou tuteur sont requises.
                    <strong> Un compte parent sera automatiquement généré</strong> et ses identifiants lui seront
                    envoyés par email.
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                      Email du parent / tuteur
                      <input
                        required
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        className="input-field mt-1.5"
                        placeholder="parent@example.com"
                      />
                    </label>

                    <label className="block text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                      Téléphone du parent
                      <input
                        required
                        type="tel"
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        className="input-field mt-1.5"
                        placeholder="+216 -- --- ---"
                      />
                    </label>
                  </div>
                </div>
              )}

              {parsedAge === null && (
                <div
                  className="rounded-xl p-3 text-center text-xs"
                  style={{
                    background: "rgba(15, 23, 42, 0.03)",
                    border: "1px dashed var(--line)",
                    color: "var(--muted)",
                  }}
                >
                  💡 Saisissez votre <strong>Âge</strong> ci-dessus pour afficher les informations requises (CIN pour +18
                  ans, compte parent pour -18 ans).
                </div>
              )}
            </div>

            {error ? (
              <p className="alert-error" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Création du compte en cours…" : "Créer mon compte élève"}
            </Button>
          </form>
        )}

        <div className="section-divider my-6" />

        <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
          Vous avez déjà un compte ?{" "}
          <Link href="/login" className="gradient-text font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

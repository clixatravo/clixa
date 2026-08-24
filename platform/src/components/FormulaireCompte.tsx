import type { ReactNode } from "react";

/**
 * Le cadre commun aux deux formulaires de compte.
 *
 * Connexion et création partagent la même route, le même leurre à robots et la
 * même mise en page : les séparer en deux copies aurait garanti qu'un jour
 * l'une reçoive une correction et pas l'autre.
 */
export function FormulaireCompte({
  action,
  erreur,
  libelleBouton,
  children,
}: {
  action: "connexion" | "creation";
  erreur?: string;
  libelleBouton: string;
  children: ReactNode;
}) {
  return (
    <>
      {erreur && (
        <p
          role="alert"
          className="border-gold bg-panel text-ivory mb-6 border-l-2 p-4 text-[0.9rem]"
        >
          {erreur}
        </p>
      )}

      <form
        action="/api/compte"
        method="POST"
        className="border-line bg-panel flex flex-col gap-5 border p-6"
      >
        {/* Leurre : invisible pour un humain, rempli par la plupart des robots. */}
        <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
          <label htmlFor="site_web">Ne pas remplir</label>
          <input id="site_web" name="site_web" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <input type="hidden" name="action" value={action} />
        {children}

        <button
          type="submit"
          className="bg-gold text-ink rounded-clixa hover:bg-gold-bright mt-1 min-h-11 px-6 text-[0.9rem] font-semibold transition-colors"
        >
          {libelleBouton}
        </button>
      </form>
    </>
  );
}

export function ChampCompte({
  label,
  name,
  type = "text",
  autoComplete,
  aide,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  aide?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className="mono-label text-ivory-dim text-[0.7rem]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="border-line bg-ink rounded-clixa text-ivory focus:border-gold min-h-11 border px-3.5 text-[0.95rem]"
      />
      {aide && <span className="text-ivory-dim text-[0.74rem]">{aide}</span>}
    </div>
  );
}

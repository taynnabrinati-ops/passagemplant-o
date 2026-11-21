import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Archive, ClipboardList, ShieldCheck, Stethoscope, User, Wifi } from "lucide-react";
import { HospitalBed } from "@/components/icons/HospitalBed";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useUnits } from "@/data/queries";
import { useUnitSlug } from "@/data/useUnit";
import { ORG_NAME } from "@/data/provider";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Leitos", icon: HospitalBed },
  { to: "/round", label: "Round", icon: Stethoscope },
  { to: "/passagem", label: "Passagem de plantão", icon: ClipboardList },
  { to: "/arquivo", label: "Arquivo", icon: Archive },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
];

function UnitTabs() {
  const units = useUnits();
  const { slug, setSlug } = useUnitSlug();
  const active = slug ?? units.data?.[0]?.slug;

  const icuUnits = (units.data ?? []).filter((unit) => unit.kind === "icu");
  const wardUnits = (units.data ?? []).filter((unit) => unit.kind === "ward");

  if (!units.data) return null;

  return (
    <div className="border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-1 px-4 py-2 sm:px-6 lg:px-8">
        {icuUnits.map((unit) => (
          <button
            key={unit.id}
            type="button"
            onClick={() => setSlug(unit.slug)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active === unit.slug
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {unit.name}
          </button>
        ))}
        {wardUnits.length > 0 && (
          <>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            {wardUnits.map((unit) => (
              <button
                key={unit.id}
                type="button"
                onClick={() => setSlug(unit.slug)}
                title={`Postos: ${wardUnits.map((entry) => entry.name).join(", ")}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active === unit.slug
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {unit.name.replace(/^posto\s*/i, "Posto ")}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function AppShell() {
  const location = useLocation();
  const showUnitTabs = location.pathname.startsWith("/dashboard");

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <header className="sticky top-0 z-30 print:hidden border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-primary">
            <HospitalBed className="h-8 w-8 rounded-md p-1" />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight text-foreground">
                DoctorWorks
              </span>
              <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
                {ORG_NAME}
              </span>
            </span>
          </div>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span
              className="flex items-center gap-1 text-xs font-medium text-emerald-600"
              title="Conexão em tempo real"
            >
              <Wifi className="h-4 w-4" />
              <span className="hidden sm:inline">ao vivo</span>
            </span>
            <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
              <User className="h-4 w-4" />
              plantonista@doctorworks.app
            </span>
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-2 py-1.5 sm:hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      {showUnitTabs && <UnitTabs />}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">
        <Outlet />
      </main>
    </div>
  );
}

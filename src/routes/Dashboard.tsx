import { Link } from "react-router-dom";
import {
  Bug,
  Check,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Plus,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HospitalBed } from "@/components/icons/HospitalBed";
import { ageFromBirthDate, daysSince } from "@/lib/days";
import { cfmPriority } from "@/lib/clinical";
import {
  useBedsWithPatients,
  useOpenConducts,
  usePendingConsults,
  usePendingCultures,
  usePositiveCultures,
  useWardVisitsToday,
} from "@/data/queries";
import { useActiveUnit } from "@/data/useUnit";
import type { Bed, UnitGroup } from "@/data/types";

/** Wards show only occupied beds; the ICU shows the whole row, vacancies included. */
function visibleBeds(group: UnitGroup): Bed[] {
  if (group.kind !== "ward") return group.beds;
  return group.beds.filter((bed) => bed.patients?.some((patient) => patient.is_active));
}

function occupiedCount(beds: Bed[]): number {
  return beds.filter((bed) => bed.patients?.some((patient) => patient.is_active)).length;
}

export function Dashboard() {
  const unit = useActiveUnit();
  const isWard = unit?.kind === "ward";

  const beds = useBedsWithPatients(unit);
  const openConducts = useOpenConducts();
  const positiveCultures = usePositiveCultures();
  const pendingCultures = usePendingCultures();
  const wardVisits = useWardVisitsToday(unit);
  const pendingConsults = usePendingConsults(unit);

  const groups = new Map<string, UnitGroup>();
  for (const bed of beds.data ?? []) {
    const group = groups.get(bed.unit_id) ?? {
      unitId: bed.unit_id,
      unitName: bed.units?.name ?? "Sem unidade",
      sort: bed.units?.sort_order ?? 999,
      kind: bed.units?.kind ?? "icu",
      beds: [],
    };
    group.beds.push(bed);
    groups.set(bed.unit_id, group);
  }
  const unitGroups = Array.from(groups.values()).sort((a, b) => a.sort - b.sort);

  const heading = isWard ? "Leitos da Enfermaria" : "Leitos do CTI";
  const stayLabel = isWard ? "internação" : "CTI";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{heading}</h1>
          <p className="text-sm text-muted-foreground">
            Clique em um leito para ver a ficha completa.
          </p>
        </div>
      </div>

      {beds.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : (
        unitGroups.map((group) => {
          const shown = visibleBeds(group);

          return (
            <section key={group.unitId} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.kind === "ward"
                    ? group.unitName.replace(/^posto\s*/i, "Posto ")
                    : group.unitName}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {occupiedCount(group.beds)}/{group.beds.length} ocupados
                </span>
              </div>

              {group.kind === "ward" && shown.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhum paciente internado neste posto.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {shown.map((bed) => {
                    const patient = bed.patients?.find((entry) => entry.is_active) ?? null;
                    const conducts = patient ? openConducts.data?.[patient.id] : undefined;
                    const positive = patient ? positiveCultures.data?.[patient.id] : undefined;
                    const pending = patient ? pendingCultures.data?.[patient.id] : undefined;
                    const ward = group.kind === "ward";
                    const visitedToday =
                      patient && ward ? (wardVisits.data?.has(patient.id) ?? false) : false;
                    const consults =
                      patient && ward ? (pendingConsults.data?.[patient.id] ?? 0) : 0;
                    const priority = patient ? cfmPriority(patient.cfm_priority) : null;
                    const age = patient
                      ? (patient.age_years ?? ageFromBirthDate(patient.birth_date))
                      : null;

                    return (
                      <Link
                        key={bed.id}
                        to={`/leito/${bed.bed_number}?unit=${bed.units?.slug ?? ""}`}
                        className="group"
                      >
                        <Card className="h-full border-border/70 transition-all group-hover:border-primary/50 group-hover:shadow-md">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <HospitalBed className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">
                                  Leito
                                </span>
                              </div>
                              <span className="font-mono text-2xl font-semibold text-primary">
                                {String(bed.bed_number).padStart(2, "0")}
                              </span>
                            </div>

                            {bed.label && (
                              <p className="mt-1 text-right text-xs font-medium text-muted-foreground">
                                {bed.label}
                              </p>
                            )}

                            {patient ? (
                              <div className="mt-3 space-y-2">
                                <div>
                                  <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                    {patient.name}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {age === null ? "" : `${age} anos · `}
                                    D{daysSince(patient.admission_date)} de {stayLabel}
                                    {patient.insurance ? (
                                      <>
                                        {" · "}
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="cursor-default">
                                                {patient.insurance}
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent>{patient.insurance}</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </>
                                    ) : null}
                                  </p>
                                </div>

                                {patient.syndromic_dx || patient.specific_dx ? (
                                  <div className="space-y-0.5">
                                    {patient.syndromic_dx && (
                                      <p className="line-clamp-2 text-xs font-bold text-foreground">
                                        {patient.syndromic_dx}
                                      </p>
                                    )}
                                    {patient.specific_dx && (
                                      <p className="line-clamp-2 text-xs text-foreground">
                                        {patient.specific_dx}
                                      </p>
                                    )}
                                  </div>
                                ) : null}

                                <div className="flex flex-wrap gap-1.5">
                                  {patient.terminality && (
                                    <Badge variant="destructive" className="gap-1">
                                      <TriangleAlert className="h-3 w-3" />
                                      Terminalidade
                                    </Badge>
                                  )}

                                  {patient.palliative_care && !patient.terminality && (
                                    <Badge className="gap-1 border-amber-500/60 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-100">
                                      <HeartPulse className="h-3 w-3" />
                                      Paliativos
                                    </Badge>
                                  )}

                                  {!ward && priority && (
                                    <Badge variant="outline" title={priority.description}>
                                      CFM {priority.short}
                                    </Badge>
                                  )}

                                  {patient.has_allergy && (
                                    <Badge variant="destructive" className="gap-1">
                                      <TriangleAlert className="h-3 w-3" />
                                      Alergia
                                    </Badge>
                                  )}

                                  {ward &&
                                    (visitedToday ? (
                                      <Badge className="gap-1 border-emerald-500/60 bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-100">
                                        <Check className="h-3 w-3" />
                                        Visitado hoje
                                      </Badge>
                                    ) : (
                                      <Badge className="gap-1 border-amber-500/60 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-100">
                                        Sem visita hoje
                                      </Badge>
                                    ))}

                                  {ward && consults > 0 && (
                                    <Badge className="gap-1 border-amber-500/60 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-100">
                                      <ClipboardList className="h-3 w-3" />
                                      {consults} parecer{consults > 1 ? "es" : ""} pendente
                                      {consults > 1 ? "s" : ""}
                                    </Badge>
                                  )}

                                  {conducts && conducts.count > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="gap-1"
                                      title={conducts.items.join(" · ")}
                                    >
                                      <Stethoscope className="h-3 w-3" />
                                      {conducts.count} conduta{conducts.count > 1 ? "s" : ""} pendente
                                      {conducts.count > 1 ? "s" : ""}
                                    </Badge>
                                  )}

                                  {pending && pending.count > 0 && (
                                    <Badge
                                      className="gap-1 border-amber-500/60 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-100"
                                      title={pending.items
                                        .map(
                                          (item) =>
                                            `${item.material}${item.site ? ` (${item.site})` : ""}`,
                                        )
                                        .join(" · ")}
                                    >
                                      <FlaskConical className="h-3 w-3" />
                                      {pending.count} cultura{pending.count > 1 ? "s" : ""} em
                                      andamento
                                    </Badge>
                                  )}

                                  {positive && positive.count > 0 && (
                                    <Badge
                                      variant="destructive"
                                      className="gap-1"
                                      title={
                                        positive.organisms.length > 0
                                          ? positive.organisms.join(" · ")
                                          : "Cultura(s) positiva(s) em tratamento"
                                      }
                                    >
                                      <Bug className="h-3 w-3" />
                                      {positive.count} cultura{positive.count > 1 ? "s" : ""} +
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3 flex h-16 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Leito vago — admitir paciente
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
